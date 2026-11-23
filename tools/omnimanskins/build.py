#!/usr/bin/env python3
"""tools/omnimanskins/build.py — Omni-Man (Viltrumite) (omniman_viltrum): 20 premade cosmetic skins.

Every body strip the fighter draws (omnimanViltrumSprites.js OMNIMAN_VILTRUM_ANIM) is recoloured into
assets/omniman_viltrum/skins/<tag>/<strip>.png — same size, same alpha, same frame map → identical timing, hitboxes,
anchors. The select portrait and the three small head icons are recoloured with head-only masks. NOTHING is
recoloured at runtime. Deterministic: textures come from an integer hash of (x, y, salt), never RNG.

MASKS: tools/omnimanskins/masks.py — per-frame regions (hair, temples, face, moustache, eyes, collar, torso, arms,
insignia, gloves, waist, legs, boots, cape EXTERIOR / LINING per frame, streaks); leg / cape pieces labelled by eye for
all 100 frames (masks.LEGS). PROTECTED (byte-identical, verified): the outline black, the pink R13 afterimage, the
Unimpressed glint, everything the masks leave at 0.

Each skin = region → colour ramp (dark → light, indexed by the source pixel's tone in its family), plus optional
patterns placed in BODY-LOCAL coordinates (the frame's neck / torso box / cape distance from the neck), so a stripe
or a sash follows him through every pose. GLITTER skins get 3 pre-baked glint phases (<tag>/, <tag>/p1/, <tag>/p2/);
omnimanViltrumSkins.js picks the phase from the SIMULATION clock.

    python3 tools/omnimanskins/build.py --batch N     skins 5N-4 … 5N (1-based batches of 5)
    python3 tools/omnimanskins/build.py tag ...       just those
    python3 tools/omnimanskins/build.py --verify      re-check dims / alpha / protected pixels of every built skin
    python3 tools/omnimanskins/build.py --sheets [tags]   contact sheets → docs/msv1/omniman/skins/
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
import masks as M

ROOT = M.ROOT
SRC = M.SRC
OUT = os.path.join(SRC, 'skins')
DOCS = os.path.join(ROOT, 'docs/msv1/omniman/skins')
TABLE_JS = os.path.join(ROOT, 'omnimanViltrumSkinTable.js')
CACHE = os.path.join(os.path.dirname(__file__), '.regions_cache.npz')
R = M.R
RED_FAM = {'cape', 'lining', 'legs', 'gloves', 'waist', 'insignia'}


def hx(c):
    c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def h3(x, y, z=0, salt=0):
    v = (int(x) * 374761393 + int(y) * 668265263 + int(z) * 2147483647 + salt * 1274126177) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def ramp(stops, t):
    S = [hx(s) for s in stops]
    t = min(1.0, max(0.0, float(t))) * (len(S) - 1)
    i = min(int(t), len(S) - 2); f = t - i
    return S[i] * (1 - f) + S[i + 1] * f


def mix(a, b, k): return a * (1 - k) + b * k


# ── per-frame analysis (cached: every skin shares it) ────────────────────────────────────────────────────────────────
def analyse(name, fw, n, head_only=False):
    a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
    H, W = a.shape[:2]
    reg = np.zeros((H, W), np.int8); tone = np.zeros((H, W), np.float32)
    geos = []
    for fi in range(n):
        fr = a[:, fi * fw:(fi + 1) * fw]
        r = M.frame_regions(fr[..., :3], fr[..., 3], name, fi, head_only)
        reg[:, fi * fw:(fi + 1) * fw] = r
        geos.append(dict(M._LAST.get('geo') or {}))
    rgb = a[..., :3]
    for c, t in M.TONE.items():
        tone[(rgb == c).all(-1)] = t
    return a, reg, tone, geos


_AN = {}
def analysis(name, fw, n, head_only=False):
    k = (name, head_only)
    if k not in _AN: _AN[k] = analyse(name, fw, n, head_only)
    return _AN[k]


# ── the 20 skins (brief order; Imperial first after the default) ─────────────────────────────────────────────────────
# keys: region name → ramp stops (dark → light) or None (keep). `pat` = list of pattern names applied after the ramps.
# pal = the procedural effect colours (omnimanViltrumFx: streaks, boom ring, dust, re-entry glow, cape, planet).
SKIN_TONE = ['#7b4731', '#c87858', '#d0835e', '#e0a272', '#fbbc97', '#faddc5']   # his own skin ramp (kept)
def pal(streak, boom, glow, cape, planet='#2f6fb8', planetEdge='#1b4a86', dust='rgba(150,130,110,0.55)'):
    return dict(streak=streak, boom=boom, dust=dust, glow=glow, cape=cape, planet=planet, planetEdge=planetEdge)

SKINS = [
  dict(tag='imperial', name='Viltrumite Imperial Uniform', classification='Viltrum Collection',
       torso=['#9e9a92', '#dedad2', '#faf8f2'], collar=['#a8a49c', '#e6e2da', '#ffffff'], arms=['#1e1f23', '#34363c', '#4a4d55'],
       gloves=['#16171a', '#2a2b30', '#3c3e44'], waist=['#1c1d21', '#2f3036', '#45474f'], legs=['#8e8a82', '#d2cec6', '#f2efe8'],
       boots=['#121316', '#24262b', '#3a3c42'], insignia=['#121316', '#1e1f23', '#2c2e33'], cape=['#6e7075', '#9a9ca1', '#bdbfc3'],
       lining=['#3c3e43', '#55575c', '#6c6e73'], streaks=['#9fb6d6', '#c6d6ec', '#e8f0fb'], pat=['shoulders'],
       pal=pal('rgba(214,226,244,0.9)', '#e8f0fb', '#ffb070', '#9a9ca1')),
  dict(tag='veteran', name='Viltrumite Field Veteran', classification='Viltrum Collection',
       torso=['#8a8070', '#c9c0aa', '#e9e2cf'], collar=['#8a8070', '#c9c0aa', '#e9e2cf'], arms=['#8a8070', '#c9c0aa', '#e9e2cf'],
       gloves=['#3a2a1c', '#5a4430', '#76604a'], waist=['#2a241e', '#3e362e', '#544a40'], legs=['#262a30', '#454c55', '#69727d'],
       boots=['#3a2618', '#5e4028', '#7e5a3c'], insignia=['#3a3228', '#5a4e40', '#7a6c5a'], cape=['#6a5f50', '#998c75', '#bcad92'],
       lining=['#3a1414', '#5a2222', '#783232'], temples=['#8c8c8c', '#c4c4c4', '#e6e6e6'], pat=['seam', 'temples_grey'],
       pal=pal('rgba(220,206,180,0.85)', '#efe4cc', '#ff9a50', '#998c75', dust='rgba(170,150,120,0.6)')),
  dict(tag='mourning', name='Imperial Mourning Dress', classification='Viltrum Collection',
       torso=['#08080a', '#16161a', '#25252b'], collar=['#060608', '#131317', '#202026'], arms=['#08080a', '#16161a', '#25252b'],
       gloves=['#b8b0a0', '#e0d8c8', '#f6f0e2'], waist=['#060608', '#101014', '#1c1c22'], legs=['#08080a', '#141418', '#222228'],
       boots=['#050507', '#101014', '#1c1c22'], insignia=['#2a2a30', '#3a3a42', '#4a4a54'], cape=['#060608', '#111115', '#1d1d23'],
       lining=['#3a0c18', '#5a1426', '#741c34'], pat=['sash'],
       pal=pal('rgba(230,226,220,0.8)', '#f2eee6', '#ff7a5a', '#111115')),
  dict(tag='alienx_half', name='Alien X — The Other Half of Nolan', classification='Alien X Collection', crossover='Ben 10', half=True,
       pal=pal('rgba(190,200,255,0.85)', '#ffffff', '#b28cff', '#1a1450', planet='#3a2a8a', planetEdge='#1a1450')),
  dict(tag='alienx_redshift', name='Alien X — Redshift', classification='Alien X Collection', crossover='Ben 10',
       torso=['#1c1d21', '#2c2e33', '#3e4047'], collar=['#18191c', '#26282c', '#36383e'], arms=['#1c1d21', '#2c2e33', '#3e4047'],
       gloves=['#121316', '#1e1f23', '#2c2e33'], waist=['#101114', '#1a1b1f', '#26282c'], legs=['#1a1b1f', '#2a2c31', '#3c3e45'],
       boots=['#0e0f12', '#191a1e', '#26282d'], insignia=['#ff7a5a', '#ff9a78', '#ffc2a8'], pat=['nebula'],
       streaks=['#5a7aff', '#ff8a6a', '#ffd8c8'],
       pal=pal('rgba(255,160,130,0.85)', '#ffd8c8', '#ff7a5a', '#2a1848', planet='#ff7a5a', planetEdge='#3a2a8a')),
  dict(tag='blacktie', name='Black-Tie Meteor', classification='Glitter Collection', glitter=True,
       torso=['#060607', '#121214', '#1e1e22'], collar=['#d8d8d8', '#f0f0f0', '#ffffff'], arms=['#060607', '#121214', '#1e1e22'],
       gloves=['#0a0a0c', '#16161a', '#222228'], waist=['#050506', '#0e0e10', '#18181c'], legs=['#060607', '#111113', '#1c1c20'],
       boots=['#050506', '#0f0f12', '#1b1b20'], insignia=['#c8c8c8', '#e8e8e8', '#ffffff'], cape=['#06081a', '#0c1028', '#141a3a'],
       lining=['#6a6e78', '#a6abb6', '#d6dae2'], pat=['inset', 'sequins', 'brake_sweep', 'cuff_glint'],
       pal=pal('rgba(220,226,240,0.9)', '#ffffff', '#c8d0ff', '#0c1028')),
  dict(tag='champagne', name='Pink Champagne Heavyweight', classification='Glitter Collection', glitter=True,
       torso=['#8a5a62', '#c48c94', '#e6b8be'], collar=['#8a5a62', '#c48c94', '#e6b8be'], arms=['#8a5a62', '#c48c94', '#e6b8be'],
       gloves=['#7a4a54', '#b07a84', '#d8a4ac'], waist=['#5a2a36', '#7a3c4a', '#9a5262'], legs=['#844f58', '#bd848c', '#e0b0b6'],
       boots=['#b8a690', '#e2d4c0', '#f8f0e2'], insignia=['#5a1a2a', '#7a2a3c', '#9a3c50'], moustache=['#3a0a16', '#5a1424', '#7a2034'],
       cape=['#7a4650', '#b07c86', '#d8a8b0'], lining=['#4a1c2c', '#6a2c40', '#8a3e56'], pat=['facets'],
       pal=pal('rgba(255,214,222,0.9)', '#fff0f4', '#ff9ab0', '#b07c86')),
  dict(tag='valkyrie', name='Winning Valkyrie — Victory Lap', classification='Champion Collection',
       torso=['#0e2a7a', '#1e48b8', '#3c6ae0'], collar=['#0e2a7a', '#1e48b8', '#3c6ae0'], arms=['#0e2a7a', '#1e48b8', '#3c6ae0'],
       gloves=['#b8bcc8', '#e6e8f0', '#ffffff'], waist=['#8a6a14', '#d0a42a', '#f6d46a'], legs=['#0c2470', '#1a40a8', '#3460d4'],
       boots=['#0a1a50', '#142c7a', '#2240a0'], insignia=['#d0a42a', '#f6d46a', '#fff0b0'], cape=['#0a1a50', '#122a72', '#1c3a94'],
       lining=['#0a1a50', '#122a72', '#1c3a94'], pat=['red_panels', 'gold_toe'],
       pal=pal('rgba(210,226,255,0.9)', '#ffffff', '#ffd46a', '#122a72')),
  dict(tag='diamondhead', name='Ben 10 — Diamondhead Mantle', classification='Ben 10 Collection', crossover='Ben 10',
       torso=['#0e5a3a', '#2a9a6a', '#7ee0b0'], collar=['#0e5a3a', '#2a9a6a', '#7ee0b0'], arms=['#0e5a3a', '#2a9a6a', '#7ee0b0'],
       gloves=['#0c4a30', '#22845a', '#64cc98'], waist=['#08301e', '#0e4a30', '#186a46'], legs=['#0c4a30', '#1e7a52', '#4ab884'],
       boots=['#08301e', '#0e4a30', '#186a46'], insignia=['#bff8dc', '#e6fff2', '#ffffff'], cape=['#06261a', '#0c3a26', '#145034'],
       lining=['#0c3a26', '#2a8a62', '#8ef0c4'], hair=['#020202', '#0a0a0a', '#151515'], pat=['crystal'],
       pal=pal('rgba(170,250,210,0.9)', '#e6fff2', '#7ee0b0', '#0c3a26')),
  dict(tag='heatblast', name='Ben 10 — Heatblast Re-entry', classification='Ben 10 Collection', crossover='Ben 10',
       torso=['#26221e', '#3c3630', '#56504a'], collar=['#26221e', '#3c3630', '#56504a'], arms=['#26221e', '#3c3630', '#56504a'],
       gloves=['#1a1714', '#2a2622', '#3c3630'], waist=['#1a1714', '#2a2622', '#3c3630'], legs=['#24201c', '#38322c', '#504840'],
       boots=['#1a1714', '#2a2622', '#3c3630'], insignia=['#ff7a1a', '#ffa040', '#ffd070'], cape=['#6a1004', '#b82a08', '#ff5a14'],
       lining=['#3a0802', '#6a1404', '#9a2208'], streaks=['#ff5a14', '#ffa040', '#ffe08a'], pat=['ember_seams', 'reentry_fist'],
       pal=pal('rgba(255,150,60,0.9)', '#ffe08a', '#ff6a1a', '#b82a08', dust='rgba(120,90,70,0.6)')),
  dict(tag='overtime', name='JJK — Overtime', classification='JJK Collection', crossover='Jujutsu Kaisen',
       torso=['#7c98b4', '#a8c4de', '#d4e6f6'], collar=['#e6eef6', '#f4f8fc', '#ffffff'], arms=['#7c98b4', '#a8c4de', '#d4e6f6'],
       gloves=SKIN_TONE[1:4], waist=['#3a2a1c', '#52402e', '#6c5642'], legs=['#8a7456', '#b49c7a', '#d6c2a0'],
       boots=['#2e1e12', '#4a3020', '#64442e'], insignia=['#7c98b4', '#a8c4de', '#d4e6f6'], cape=['#8a6a44', '#b89466', '#d8b888'],
       lining=['#14203a', '#1e2e52', '#2a3e6a'], pat=['tie'],
       pal=pal('rgba(230,240,250,0.85)', '#ffffff', '#ffc070', '#b89466')),
  dict(tag='patriarch', name='JJK — Cursed Patriarch', classification='JJK Collection', crossover='Jujutsu Kaisen',
       hair=['#8a5a6a', '#b07a8a', '#d0a0ae'], moustache=['#050505', '#0c0c0c', '#161616'], torso=['#b8b4b0', '#e4e0dc', '#faf8f6'],
       collar=['#b8b4b0', '#e4e0dc', '#faf8f6'], arms=['#b8b4b0', '#e4e0dc', '#faf8f6'], gloves=['#0a0a0c', '#16161a', '#24242a'],
       waist=['#3a1a3a', '#56285a', '#723a76'], legs=['#0a0a0c', '#141418', '#222228'], boots=['#060608', '#101014', '#1c1c22'],
       insignia=['#56285a', '#723a76', '#9050a0'], cape=['#060608', '#101014', '#1a1a20'], lining=['#060608', '#101014', '#1a1a20'],
       pat=['cheek_marks', 'pink_edge', 'wrist_band'],
       pal=pal('rgba(230,200,214,0.85)', '#f4e6ec', '#ff8ab0', '#101014')),
  dict(tag='sunday', name="Sunday at the Graysons'", classification='Civilian Collection',
       torso=['#9a8c74', '#c8b898', '#e6d8bc'], collar=['#9a8c74', '#c8b898', '#e6d8bc'], arms=['#9a8c74', '#c8b898', '#e6d8bc'],
       gloves=SKIN_TONE[1:4], waist=['#4a3220', '#6a4a30', '#8a6444'], legs=['#1e3456', '#2e4c7a', '#4a6a9e'],
       boots=['#a8a6a0', '#d8d6d0', '#f6f4ee'], insignia=['#9a8c74', '#c8b898', '#e6d8bc'], cape=['#6a2c14', '#9a4220', '#bc5a30'],
       lining=['#4a1e0c', '#6a2c14', '#8a3c1e'], temples=['#9a9a9a', '#cfcfcf', '#f0f0f0'], pat=['knit', 'denim', 'blanket_stripe', 'temples_grey'],
       pal=pal('rgba(240,230,210,0.85)', '#fff6e6', '#ff9a50', '#9a4220')),
  dict(tag='firstissue', name='The First Issue', classification='Comic Collection',
       torso=['#1c2a4a', '#d8ccb0', '#f2e8d2'], collar=['#1c2a4a', '#d8ccb0', '#f2e8d2'], arms=['#1c2a4a', '#d8ccb0', '#f2e8d2'],
       gloves=['#1c2a4a', '#b8483a', '#d86a56'], waist=['#1c2a4a', '#a8402e', '#c85a46'], legs=['#1c2a4a', '#b8483a', '#d86a56'],
       boots=['#1c2a4a', '#d8ccb0', '#f2e8d2'], insignia=['#1c2a4a', '#b8483a', '#d86a56'], cape=['#1c2a4a', '#b8483a', '#d86a56'],
       lining=['#1c2a4a', '#8a3428', '#a84a3a'], hair=['#0e1830', '#16223e', '#1e2c4c'], moustache=['#0e1830', '#16223e', '#1e2c4c'],
       pat=['halftone', 'misprint'],
       pal=pal('rgba(0,170,220,0.8)', '#f2e8d2', '#d86a56', '#b8483a')),
  dict(tag='artdeco', name='Art Deco Express', classification='Champion Collection',
       torso=['#08343a', '#0e5a62', '#1a8088'], collar=['#08343a', '#0e5a62', '#1a8088'], arms=['#08343a', '#0e5a62', '#1a8088'],
       gloves=['#6a4c14', '#b08a34', '#e2c26a'], waist=['#6a4c14', '#b08a34', '#e2c26a'], legs=['#062c32', '#0c4e56', '#18747c'],
       boots=['#b8ac90', '#e2d8c0', '#f8f2e2'], insignia=['#6a4c14', '#b08a34', '#e2c26a'], cape=['#04242a', '#083a42', '#0e5058'],
       lining=['#04242a', '#083a42', '#0e5058'], pat=['brass_lines', 'cream_arm'],
       pal=pal('rgba(226,194,106,0.85)', '#f8f2e2', '#e2c26a', '#083a42')),
  dict(tag='rescue', name='Rescue Service Orange', classification='Civilian Collection',
       torso=['#a83a00', '#ff5a00', '#ff8a3a'], collar=['#a83a00', '#ff5a00', '#ff8a3a'], arms=['#c8c8c8', '#ececec', '#ffffff'],
       gloves=['#a83a00', '#ff5a00', '#ff8a3a'], waist=['#0e1a3a', '#182a56', '#243c72'], legs=['#a03800', '#f25400', '#ff8434'],
       boots=['#0c1630', '#16264e', '#22386a'], insignia=['#d8d8d8', '#f2f2f2', '#ffffff'], cape=['#962e00', '#e84c00', '#ff7a2a'],
       lining=['#6a2000', '#9a3200', '#c84400'], pat=['reflective'],
       pal=pal('rgba(255,236,220,0.9)', '#ffffff', '#ff8a3a', '#e84c00')),
  dict(tag='cornerman', name='Heavyweight Cornerman', classification='Champion Collection',
       torso=['#0c3a20', '#145a32', '#227a46'], collar=['#c8bc98', '#e6dcbc', '#f8f0d8'], arms=['#0c3a20', '#145a32', '#227a46'],
       gloves=['#c8c4bc', '#ebe8e2', '#ffffff'], waist=['#3a0c10', '#5a141a', '#7a2028'], legs=['#0e0e12', '#1a1a20', '#28282f'],
       boots=['#0a0a0d', '#16161b', '#222228'], insignia=['#c8bc98', '#e6dcbc', '#f8f0d8'], cape=['#0a3a1e', '#125630', '#1c7442'],
       lining=['#06261a', '#0a3a26', '#145034'], pat=['piping', 'trunks', 'gold_n'],
       pal=pal('rgba(240,232,200,0.85)', '#f8f0d8', '#ffd060', '#125630')),
  dict(tag='western', name='Midnight Western', classification='Civilian Collection',
       torso=['#3a2414', '#5c3a22', '#7e5434'], collar=['#3a2414', '#5c3a22', '#7e5434'], arms=['#3a2414', '#5c3a22', '#7e5434'],
       gloves=['#2a1a0e', '#422c18', '#5e4026'], waist=['#1a120c', '#2a1e14', '#3c2c1e'], legs=['#141416', '#222226', '#323238'],
       boots=['#1e140c', '#322216', '#4a3420'], insignia=['#3a2414', '#5c3a22', '#7e5434'], cape=['#5a1a14', '#8a2c20', '#b04030'],
       lining=['#3a1410', '#5a1e18', '#782a22'], moustache=['#0a0806', '#16120e', '#221c16'], temples=['#a8acb4', '#d2d6de', '#f2f4f8'],
       pat=['buckle', 'saddle', 'temples_grey'],
       pal=pal('rgba(230,214,190,0.85)', '#f6eee0', '#ffa050', '#8a2c20', dust='rgba(170,130,90,0.6)')),
  dict(tag='porcelain', name='Porcelain Strongman', classification='Champion Collection',
       torso=['#c8c0b4', '#ece6dc', '#fbf8f2'], collar=['#c8c0b4', '#ece6dc', '#fbf8f2'], arms=['#c8c0b4', '#ece6dc', '#fbf8f2'],
       gloves=['#0e2a7a', '#1a40a8', '#2a58c8'], waist=['#0e2a7a', '#1a40a8', '#2a58c8'], legs=['#c4bcb0', '#e8e2d8', '#f8f4ee'],
       boots=['#0e2a7a', '#1a40a8', '#2a58c8'], insignia=['#0e2a7a', '#1a40a8', '#2a58c8'], cape=['#0a2266', '#14369a', '#204cc0'],
       lining=['#081a50', '#102c7c', '#1a3ea0'], pat=['brush', 'wave'],
       pal=pal('rgba(220,230,255,0.9)', '#fbf8f2', '#6a8aff', '#14369a')),
  dict(tag='earthrise', name='Earthrise', classification='Viltrum Collection',
       torso=['#6c6e72', '#a2a4a8', '#cfd1d4'], collar=['#6c6e72', '#a2a4a8', '#cfd1d4'], arms=['#6c6e72', '#a2a4a8', '#cfd1d4'],
       gloves=['#c8cacc', '#ececee', '#ffffff'], waist=['#3c3e42', '#56585c', '#707276'], legs=['#646668', '#9a9c9e', '#c6c8ca'],
       boots=['#08080a', '#141418', '#202026'], insignia=['#2f6fb8', '#4a8ad0', '#8ab8ec'], cape=['#060c22', '#0c1838', '#14244e'],
       lining=['#060c22', '#0c1838', '#14244e'], pat=['planet_hem'],
       pal=pal('rgba(220,232,250,0.9)', '#ffffff', '#ffb070', '#0c1838', planet='#2f6fb8', planetEdge='#1b4a86')),
]
BY_TAG = {s['tag']: s for s in SKINS}
PLANET = ['#0e2a5a', '#1b4a86', '#2f6fb8', '#6aa8e6', '#e8f2fc']   # = the Escape Velocity orbit planet (omnimanViltrumSkins OMV_DEFAULT_PAL)


# ── patterns (body-local) ────────────────────────────────────────────────────────────────────────────────────────────
class Ctx: pass


def cape_fields(reg, fw, geos, n):
    """per pixel: dn = distance from the neck / that frame's max over the cape (0 collar → 1 hem); ed = px to the cape edge"""
    H, W = reg.shape
    cape = (reg == R['cape']) | (reg == R['lining'])
    dn = np.zeros((H, W), np.float32); ed = ndimage.distance_transform_edt(np.pad(cape, 1))[1:-1, 1:-1]
    yy, xx = np.mgrid[0:H, 0:fw]
    for fi in range(n):
        sl = slice(fi * fw, (fi + 1) * fw); g = geos[fi]; c = cape[:, sl]
        if not c.any() or not g.get('neck'): continue
        d = np.hypot(xx - g['neck'][0], yy - g['neck'][1])
        mx = d[c].max() or 1
        dn[:, sl] = np.where(c, d / mx, 0)
    return dn, ed


def apply_pattern(name, sk, ctx, col):
    rn, t, x, y, g = ctx.rn, ctx.t, ctx.x, ctx.y, ctx.g
    tb = g.get('torso') or (0, 0, 1, 1)
    if name == 'shoulders' and rn == 'torso' and y <= tb[1] + 4:
        return ramp(['#8a8c90', '#b8babe', '#d4d6da'], t)                                   # pale grey shoulder panels
    if name == 'temples_grey' and rn == 'temples':
        return ramp(sk['temples'], t)
    if name == 'seam' and rn in ('torso', 'arms') and y == tb[1] + 3 and tb[0] + 2 <= x <= tb[0] + 7 and x % 2 == 0:
        return hx('#4a3e30')                                                                  # one repaired shoulder seam
    if name == 'sash' and rn in ('torso', 'arms', 'waist', 'legs', 'collar'):
        w = max(1, tb[2] - tb[0]); h = max(1, (g['hip'][1] if g.get('hip') else tb[3]) - tb[1])
        u, v = (x - tb[0]) / w, (y - tb[1]) / h
        if abs(u - v * 0.95) < 0.09 and 0 <= v <= 1.15: return ramp(['#c8c4bc', '#ececea', '#ffffff'], t)   # shoulder → opposite hip
    if name == 'nebula' and rn in ('cape', 'lining'):
        d = ctx.dn
        base = mix(mix(hx('#ff7a5a'), hx('#7a2a6a'), min(1, d * 1.6)), hx('#0a1a4a'), max(0, d - 0.45) * 1.8)
        base = base * (0.55 + 0.45 * t) + mix(hx('#ffb090'), hx('#4a6aff'), d) * 0.25 * (h3(x // 3, y // 3, 0, 7) > 0.6)
        if d > 0.6 and h3(x, y, 0, 13) > 0.975: return hx('#cfe0ff')                        # cold blue stars near the hem
        return np.clip(base, 0, 255)
    if name == 'inset' and rn == 'torso':
        cx = (g['neck'][0] if g.get('neck') else (tb[0] + tb[2]) / 2)
        if abs(x - cx) <= 2 and y >= tb[1] + 2: return ramp(['#c8c8c8', '#ececec', '#ffffff'], t)   # white chest inset
    if name == 'sequins' and rn == 'lining':
        v = h3(x, y, ctx.phase, 21)
        if v > 0.82: return hx('#ffffff') if v > 0.94 else hx('#e4e8f0')
    if name == 'brake_sweep' and rn == 'lining' and ctx.strip == 'brake':
        if abs((x - ctx.fw * 0.2) - (y * 0.9 - 6)) < 2: return hx('#f4f6fa')                 # one sweep of silver crosses the lining
    if name == 'cuff_glint' and rn == 'gloves' and ctx.strip in ('idle', 'win', 'unimpressed', 'glint', 'intro'):
        if ctx.phase == (ctx.fi % 3) and h3(x, y, ctx.fi, 31) > 0.86: return hx('#ffffff')  # one sharp cuff glint
    if name == 'facets' and rn in ('torso', 'collar', 'arms') and y <= tb[1] + 8:
        k = int((x - tb[0]) // max(1, (tb[2] - tb[0]) / 3))                                  # three broad facets across the shoulders
        lead = ctx.strip in ('straight', 'jab', 'stepPunch', 'flightPunch', 'returnPunch') and ctx.fi >= 1
        if lead and k >= 2: return hx('#fff4f6')                                              # the leading shoulder flashes white
        if lead and k == 0: return ramp(['#4a1a34', '#6a2a4a', '#8a3c62'], t)                # the rear settles into plum
        sp = h3(x, y, ctx.phase, 41 + k)
        if sp > 0.9: return hx('#ffffff')
        return ramp([['#9a5a6a', '#d89aa8', '#f4c8d2'], ['#a8687a', '#e6aab8', '#ffd8e2'], ['#8a4a5a', '#c88a98', '#ecbcc6']][k % 3], t)
    if name == 'red_panels' and rn in ('cape', 'lining'):
        d = ctx.dn                                                                            # three swept red panels: one shows at idle
        for c0 in (0.18, 0.5, 0.8):
            if c0 - 0.07 <= d <= c0 + 0.07 and (ctx.ed >= 1.5): return ramp(['#8a0c12', '#c81a22', '#f0343c'], t)
    if name == 'gold_toe' and rn == 'boots' and x >= ctx.bootx - 2:
        return ramp(['#8a6a14', '#d0a42a', '#f6d46a'], t)
    if name == 'crystal' and rn in ('torso', 'arms', 'legs', 'collar', 'gloves', 'waist'):
        cell = h3((x + y) // 5, (x - y) // 5, 0, 51)                                           # angular planes
        k = 0.65 + 0.55 * cell
        base = ramp(sk[rn], t) * k
        if cell > 0.88: base = mix(base, hx('#d8fff0'), 0.5)
        return np.clip(base, 0, 255)
    if name == 'ember_seams' and rn in ('gloves', 'boots') and ctx.ed_body <= 1:
        return hx('#ff7a1a')                                                                  # orange seams on gloves + boots only
    if name == 'reentry_fist' and ctx.strip in ('fly', 'flightPunch', 'meteor', 'grabRush') and ctx.fi == ctx.n - 1:
        if rn == 'gloves': return ramp(['#d8b040', '#fff07a', '#ffffd0'], t)                  # fastest frame: leading fist pale yellow
        if rn == 'boots': return ramp(['#8a1404', '#e83a0a', '#ff7a2a'], t)                   # trailing boots ember-red
    if name == 'tie' and rn in ('torso', 'collar'):
        cx = g['neck'][0] if g.get('neck') else (tb[0] + tb[2]) / 2
        if abs(x - cx) <= 1 and y >= (g['neck'][1] if g.get('neck') else tb[1]) - 1:
            return hx('#4a3a0a') if (x + y) % 3 == 0 else ramp(['#a88014', '#d8aa2a', '#f2c84a'], t)   # mustard tie, dark spots
    if name == 'cheek_marks' and rn == 'face' and g.get('face'):
        f = g['face']; ey = f[1] + (f[3] - f[1]) * 0.55
        if abs(y - ey) < 0.6 and (abs(x - (f[0] + 2)) < 1.5 or abs(x - (f[2] - 2)) < 1.5): return hx('#1a0a12')
    if name == 'pink_edge' and rn in ('cape', 'lining') and ctx.ed <= 1.2:
        return ramp(['#9a6a7a', '#c890a0', '#e8b4c2'], t)
    if name == 'wrist_band' and rn == 'gloves' and ctx.near_arm:
        return hx('#3a1030')
    if name == 'knit' and rn in ('torso', 'arms', 'collar'):
        return ramp(sk[rn], t) * (0.9 + 0.14 * ((x + (y // 2)) % 2))
    if name == 'denim' and rn == 'legs':
        return ramp(sk['legs'], t) * (0.92 + 0.12 * h3(x, y // 2, 0, 61))
    if name == 'blanket_stripe' and rn in ('cape', 'lining') and 1.5 <= ctx.ed <= 3:
        return ramp(['#c8b48a', '#ecdcb6', '#fff6dc'], t)
    if name == 'halftone' and rn in ('cape', 'lining') and t < 0.75:
        if (x % 3 == 1 and y % 3 == 1) or (ctx.dn > 0.5 and (x + y) % 4 == 0): return hx('#1c2a4a')
    if name == 'misprint' and rn == 'streaks':
        return hx('#00aadc') if y % 2 == 0 else hx('#e0402a')                                  # misaligned cyan + red
    if name == 'brass_lines' and rn in ('cape', 'lining') and ctx.ed >= 1.5:
        for c0 in (0.42, 0.55, 0.68):
            if abs(ctx.dn - c0) < 0.028: return ramp(['#8a6a1c', '#d0a840', '#f4d47a'], t)
    if name == 'cream_arm' and rn == 'arms' and ctx.ed_body <= 1:
        return hx('#f2e8cc')
    if name == 'reflective' and rn in ('cape', 'lining'):
        for c0 in (0.45, 0.72):
            if abs(ctx.dn - c0) < 0.05: return ramp(['#b8bcc0', '#e8ecf0', '#ffffff'], t)
    if name == 'piping' and rn in ('torso', 'arms', 'collar') and ctx.ed_body <= 1:
        return hx('#efe4c2')
    if name == 'trunks' and rn == 'legs' and g.get('hip') and np.hypot(x - g['hip'][0], y - g['hip'][1]) < 7:
        return ramp(['#3a0c10', '#5a141a', '#7a2028'], t)
    if name == 'gold_n' and rn in ('cape', 'lining') and ctx.strip in ('fly', 'meteor', 'grabRush', 'orbitHold', 'flightPunch') and ctx.n_box:
        bx0, by0, bw, bh = ctx.n_box
        u, v = (x - bx0) / bw, (y - by0) / bh
        if 0 <= u <= 1 and 0 <= v <= 1 and (u < 0.25 or u > 0.75 or abs(u - v) < 0.22): return ramp(['#a8801c', '#e2b440', '#ffe08a'], 0.6)
    if name == 'buckle' and rn == 'waist' and g.get('neck') and abs(x - g['neck'][0]) <= 1:
        return hx('#2ab8b0')
    if name == 'saddle' and rn in ('cape', 'lining'):
        if 1 <= ctx.ed <= (2.5 if int(ctx.dn * 10) % 2 == 0 else 1.6): return ramp(['#b8a888', '#e2d4b2', '#f4ead0'], t)   # one stepped ivory border
        if int(ctx.dn * 12) % 3 == 1: return ramp(['#1a3a4a', '#2a5a6a', '#3a7a8a'], t)
    if name == 'brush' and rn in ('torso', 'legs', 'collar') and h3(x // 2 + y // 3, y // 2, 0, 71) > 0.84:
        return ramp(['#0e2a7a', '#1a40a8', '#2a58c8'], 0.5 + t * 0.5)
    if name == 'wave' and rn == 'arms':
        if (x + int(2 * np.sin(y * 0.9))) % 4 == 0: return hx('#1a40a8')
    if name == 'planet_hem' and rn in ('cape', 'lining') and ctx.dn > 0.8:
        k = (ctx.dn - 0.8) / 0.2
        c = ramp(PLANET, 0.15 + 0.85 * k)
        if h3(x // 2, y, 0, 81) > 0.8 and k > 0.3: c = mix(c, hx('#ffffff'), 0.6)              # clouds
        if k < 0.12: c = hx('#bfe0ff')                                                         # the bright limb (a sliver at idle)
        return c
    return col


def recolor_strip(name, fw, n, sk, phase=0, head_only=False):
    a, reg, tone, geos = analysis(name, fw, n, head_only)
    out = a.copy()
    if sk.get('half'):
        return alien_half(a, reg, tone, geos, fw, n, head_only), reg
    dn, ed = cape_fields(reg, fw, geos, n)
    body = a[..., 3] > 0
    ed_body = ndimage.distance_transform_edt(np.pad(body, 1))[1:-1, 1:-1]
    glove = reg == R['gloves']; armish = ndimage.binary_dilation((reg == R['arms']) | (reg == R['torso']), iterations=1)
    ys, xs = np.nonzero(reg)
    pats = sk.get('pat', [])
    bootx = {}
    if 'gold_toe' in pats:
        for fi in range(n):
            b = np.nonzero(reg[:, fi * fw:(fi + 1) * fw] == R['boots']); bootx[fi] = (b[1].max() if len(b[1]) else 999)
    nbox = {}
    if 'gold_n' in pats:
        for fi in range(n):
            c = np.nonzero(((reg == R['cape']) | (reg == R['lining']))[:, fi * fw:(fi + 1) * fw])
            g = geos[fi]
            if len(c[0]) > 60 and g.get('neck'):
                # high on the back of the cape = the cape pixels nearest the neck, a 7×7 box centred 6 px behind it
                cx = int(np.clip(g['neck'][0] - 12, 2, fw - 9)); cy = int(np.clip(np.median(c[0]) - 4, 1, a.shape[0] - 9))
                nbox[fi] = (cx, cy, 7, 7)
    for y, x in zip(ys, xs):
        rid = int(reg[y, x]); rn = M.REGIONS[rid]
        fi, lx = x // fw, x % fw
        stops = sk.get(rn)
        t = float(tone[y, x])
        col = ramp(stops, t) if stops else a[y, x, :3].astype(np.float32)
        if pats:
            ctx = Ctx(); ctx.rn = rn; ctx.t = t; ctx.x = lx; ctx.y = y; ctx.g = geos[fi]; ctx.fi = fi; ctx.n = n; ctx.fw = fw
            ctx.strip = name; ctx.phase = phase; ctx.dn = float(dn[y, x]); ctx.ed = float(ed[y, x]); ctx.ed_body = float(ed_body[y, x])
            ctx.near_arm = bool(glove[y, x] and armish[y, x]); ctx.bootx = bootx.get(fi, 999); ctx.n_box = nbox.get(fi)
            for p in pats: col = apply_pattern(p, sk, ctx, col)
        out[y, x, :3] = np.clip(np.round(col), 0, 255).astype(np.uint8)
    return out, reg


# ── ALIEN X — THE OTHER HALF OF NOLAN: anatomical right = the original suit (byte-identical); anatomical left (the side
# toward screen-right as drawn facing right, mirrored with the sprite) = midnight indigo, one jade eye, a violet cheek
# highlight, three ivory stars temple → collarbone, a cosmic cape panel. Split along each frame's BODY AXIS (head → hips),
# never a straight screen cut; limbs (gloves / arms / legs / boots pieces) go whole to the side their centre is on.
def alien_side_map(reg, geos, fw, n):
    """Alien X half: which pixels of each frame are the alien side, so that EVERY frame reads as half man, half alien:
    • direction: the body axis from the centre of his BODY to the centre of his HEAD (both measured from the pixels, so
      it is steady from frame to frame; continuous, no snapping); the cut runs along it, screen-right = alien when upright
    • his HEAD is cut through its own middle (the face is always half and half: one jade eye, one human eye)
    • his BODY (cape excluded from the count) is cut where the alien side is exactly 50 %, counted after gloves / arms /
      boots are assigned whole by their centre; the cape follows the body's cut
    Before: one line through the face → ~25 % alien on average, 7 % in one idle frame (it flickered in and out)."""
    H, W = reg.shape
    side = np.zeros((H, W), bool)
    yy, xx = np.mgrid[0:H, 0:fw]
    HEADR = [R[k] for k in ('hair', 'temples', 'face', 'moustache', 'eyes')]
    CAPE = [R['cape'], R['lining'], R['streaks']]
    for fi in range(n):
        sl = slice(fi * fw, (fi + 1) * fw); r = reg[:, sl]
        if not (r > 0).any(): continue
        head = np.isin(r, HEADR); body = (r > 0) & ~head & ~np.isin(r, CAPE)
        if not body.any(): body = (r > 0) & ~head
        cen = lambda m: (xx[m].mean(), yy[m].mean())
        bx, by = cen(body) if body.any() else (fw / 2, H / 2)
        hx_, hy = cen(head) if head.any() else (bx, by - 30)
        ux, uy = hx_ - bx, hy - by; L = np.hypot(ux, uy)
        ux, uy = (ux / L, uy / L) if L > 4 else (0.0, -1.0)
        rx, ry = -uy, ux                                                                         # perpendicular: screen-right when upright
        proj = (xx - bx) * rx + (yy - by) * ry
        limbs = []
        for limb in ('gloves', 'arms', 'boots'):   # legs split per pixel (both legs are often one piece): one red boot, one star-dark boot
            lab, k = ndimage.label(r == R[limb])
            for i in range(1, k + 1):
                m = lab == i; limbs.append((m, proj[m].mean()))
        def split(c):
            s = proj > c
            for m, cp in limbs: s[m] = cp > c
            return s
        tot = body.sum(); vals = np.sort(proj[body]); best = (0, 0.0)
        if tot: best = None
        for q in (np.linspace(0.15, 0.85, 71) if tot else []):                                                    # slide the cut: body share closest to 50 %
            c = vals[min(len(vals) - 1, int(q * len(vals)))]; sh = (split(c) & body).sum() / tot
            if best is None or abs(sh - 0.5) < best[0]: best = (abs(sh - 0.5), c)
        s = split(best[1])
        if head.any(): s[head] = proj[head] > np.median(proj[head])                              # the head: through its own middle
        side[:, sl] = s
    return side


def alien_half(a, reg, tone, geos, fw, n, head_only):
    out = a.copy()
    side = alien_side_map(reg, geos, fw, n) & (reg > 0)
    ys, xs = np.nonzero(side)
    for y, x in zip(ys, xs):
        rn = M.REGIONS[reg[y, x]]; t = float(tone[y, x]); fi, lx = x // fw, x % fw; g = geos[fi]
        if rn == 'eyes': c = ramp(['#0a6a4a', '#2ad8a0', '#a8ffe0'], t)                           # one jade eye
        elif rn in ('hair', 'moustache'): c = ramp(['#02020a', '#080a1e', '#121638'], t)
        else:
            c = ramp(['#04041a', '#0c0c34', '#1a1a5a', '#2c2c80'], t)                            # midnight indigo
            v = h3(lx, y, 0, 11)
            if rn in ('cape', 'lining', 'streaks'):
                if v > 0.94: c = hx('#ffffff')
                elif v > 0.9: c = hx('#8ad8ff') * 0.8
                elif v > 0.86: c = hx('#b28cff') * 0.6
        if rn == 'face' and g.get('face'):
            f = g['face']
            if abs(y - (f[1] + (f[3] - f[1]) * 0.6)) < 1.2 and lx >= (f[0] + f[2]) / 2 + 1: c = hx('#9a6aff')   # violet cheek highlight
            # three ivory stars, temple → jaw (head-only images get them too)
            for k in range(3):
                sx = f[2] - 1 - k * 0.5; sy = f[1] + 1 + k * (f[3] - f[1]) / 2.4
                if abs(lx - sx) < 0.8 and abs(y - sy) < 0.8: c = hx('#fff6e0')
        if rn in ('collar', 'torso') and g.get('face'):
            f = g['face']
            if abs(lx - (f[2] - 2)) < 0.8 and abs(y - (f[3] + 3)) < 0.8: c = hx('#fff6e0')          # the third star at the collarbone
        out[y, x, :3] = np.clip(np.round(c), 0, 255).astype(np.uint8)
    return out


# ── build / verify ───────────────────────────────────────────────────────────────────────────────────────────────────
HEADS = ['portrait', 'icon_0', 'icon_1', 'icon_2']

def build(sk):
    tag = sk['tag']; strips = M.load_anim()
    phases = 3 if sk.get('glitter') else 1
    for ph in range(phases):
        d = os.path.join(OUT, tag, f'p{ph}' if ph else '')
        os.makedirs(d, exist_ok=True)
        for name, (fw, n) in strips.items():
            out, _ = recolor_strip(name, fw, n, sk, ph)
            Image.fromarray(out).save(os.path.join(d, name + '.png'), optimize=True)
    for h in HEADS:
        im = Image.open(os.path.join(SRC, h + '.png')).convert('RGBA')
        out, _ = recolor_strip(h, im.width, 1, sk, 0, head_only=True)
        if sk['tag'] == 'imperial': out = imperial_collar(out, h)
        Image.fromarray(out).save(os.path.join(OUT, tag, h + '.png'), optimize=True)
    print(f'  built {tag:16s} {sk["name"]}  ({phases} phase{"s" if phases > 1 else ""})')


def imperial_collar(arr, h):
    """the Imperial head icon / portrait shows its high pearl collar: the bottom rows under the jaw (inside the icon's own
    alpha) become collar white with a dark seam — alpha untouched"""
    out = arr.copy(); a = out[..., 3] > 0
    rows = np.nonzero(a.any(1))[0]
    if not len(rows): return out
    k = max(1, (rows[-1] - rows[0]) // 8)
    for y in range(rows[-1] - k + 1, rows[-1] + 1):
        xs = np.nonzero(a[y])[0]
        for x in xs:
            if tuple(out[y, x, :3]) in M.SKINS_ or tuple(out[y, x, :3]) in M.DARKS:
                out[y, x, :3] = (90, 92, 98) if y == rows[-1] - k + 1 else (236, 232, 224)   # pearl collar, one dark seam on top
    return out


def verify(sk):
    tag, bad = sk['tag'], []
    strips = M.load_anim(); phases = 3 if sk.get('glitter') else 1
    for ph in range(phases):
        for name, (fw, n) in strips.items():
            a, reg, tone, geos = analysis(name, fw, n)
            p = os.path.join(OUT, tag, f'p{ph}' if ph else '', name + '.png')
            if not os.path.exists(p): bad.append(f'{name} p{ph}: missing'); continue
            b = np.array(Image.open(p).convert('RGBA'))
            if a.shape != b.shape: bad.append(f'{name} p{ph}: size {b.shape} != {a.shape}'); continue
            if not np.array_equal(a[..., 3], b[..., 3]): bad.append(f'{name} p{ph}: alpha differs')
            prot = reg == 0
            if sk.get('half'): prot = prot | ~alien_side_map(reg, geos, fw, n)
            if not np.array_equal(a[prot], b[prot]): bad.append(f'{name} p{ph}: protected pixels changed ({int((a[prot] != b[prot]).any(-1).sum())})')
    for h in HEADS:
        a = np.array(Image.open(os.path.join(SRC, h + '.png')).convert('RGBA')); p = os.path.join(OUT, tag, h + '.png')
        if not os.path.exists(p): bad.append(f'{h} missing'); continue
        b = np.array(Image.open(p).convert('RGBA'))
        if a.shape != b.shape or not np.array_equal(a[..., 3], b[..., 3]): bad.append(f'{h}: size / alpha differs')
    return bad


def sheets(tags):
    """contact sheet at ACTUAL MATCH SIZE (×2 = OMV_SCALE) on a BRIGHT and a DARK stage colour: folded-arm idle, pointing,
    horizontal flight, brake, crouched landing, knockdown (+ the head icon); Alien X half also mirrored"""
    os.makedirs(DOCS, exist_ok=True)
    strips = M.load_anim()
    show = [('idle', 0), ('point', 4), ('fly', 1), ('brake', 2), ('landHard', 1), ('knockdown', 1), ('straight', 2)]
    S = 2
    rows = []
    for tag in ['default'] + tags:
        cells = []
        for name, fi in show:
            fw, n = strips[name]
            p = os.path.join(SRC, name + '.png') if tag == 'default' else os.path.join(OUT, tag, name + '.png')
            im = Image.open(p).convert('RGBA'); fr = im.crop((fi * fw, 0, (fi + 1) * fw, im.height))
            cells.append(fr.resize((fw * S, im.height * S), Image.NEAREST))
            if tag == 'alienx_half' and name in ('idle', 'knockdown'):
                cells.append(fr.transpose(Image.FLIP_LEFT_RIGHT).resize((fw * S, im.height * S), Image.NEAREST))
        ic = Image.open(os.path.join(SRC if tag == 'default' else os.path.join(OUT, tag), 'icon_0.png')).convert('RGBA')
        cells.append(ic.resize((ic.width * 4, ic.height * 4), Image.NEAREST))
        rows.append((tag, cells))
    cw = max(sum(c.width + 6 for c in r) for _, r in rows) + 170
    rh = max(max(c.height for c in r) for _, r in rows) + 10
    sheet = Image.new('RGBA', (cw * 2 + 20, rh * len(rows)), (0, 0, 0, 255))
    dr = ImageDraw.Draw(sheet)
    for half, bg in enumerate([(226, 222, 206, 255), (34, 38, 52, 255)]):        # bright stage | dark stage
        x0 = half * (cw + 20)
        dr.rectangle([x0, 0, x0 + cw - 1, sheet.height], fill=bg)
        for k, (tag, cells) in enumerate(rows):
            y = k * rh
            dr.text((x0 + 6, y + 12), (BY_TAG[tag]['name'] if tag in BY_TAG else 'Default (original suit)').replace('—', '-')[:26], fill=(0, 0, 0, 255) if half == 0 else (240, 240, 240, 255))
            x = x0 + 170
            for c in cells: sheet.alpha_composite(c, (x, y + rh - 10 - c.height)); x += c.width + 6
    p = os.path.join(DOCS, 'contact_' + ('_'.join(tags) if len(tags) <= 5 else 'all') + '.png')
    sheet.save(p); print('  sheet', os.path.relpath(p, ROOT))
    return p


def write_table(tags):
    rows = []
    for s in SKINS:
        if s['tag'] not in tags: continue
        r = dict(tag=s['tag'], name=s['name'], classification=s['classification'])
        if s.get('glitter'): r['glitter'] = True
        if s.get('crossover'): r['crossover'] = s['crossover']
        r['pal'] = s['pal']
        rows.append(r)
    body = ',\n'.join('  ' + json.dumps(r, ensure_ascii=False) for r in rows)
    open(TABLE_JS, 'w', encoding='utf-8').write(
        '// Generated by tools/omnimanskins/build.py — do not hand-edit. The premade Omni-Man (Viltrumite) skins that are built,\n'
        '// in selector order (Viltrumite Imperial Uniform first after the default).\n'
        f'export const OMV_SKIN_TABLE = [\n{body}{"," if rows else ""}\n]\n')


def built_tags():
    return [s['tag'] for s in SKINS if os.path.exists(os.path.join(OUT, s['tag'], 'icon_2.png'))]


def main():
    a = sys.argv[1:]
    if '--verify' in a:
        bad = 0
        for t in built_tags():
            b = verify(BY_TAG[t]); bad += len(b)
            print(f'  {"OK " if not b else "BAD"} {t}' + ('' if not b else ': ' + '; '.join(b[:4])))
        print(f'VERIFY: {len(built_tags())} skins, {bad} problems'); sys.exit(1 if bad else 0)
    if '--sheets' in a:
        tags = [x for x in a if x in BY_TAG] or built_tags(); sheets(tags); return
    if '--batch' in a:
        n = int(a[a.index('--batch') + 1]); tags = [s['tag'] for s in SKINS[(n - 1) * 5: n * 5]]
    else:
        tags = [x for x in a if x in BY_TAG] or [s['tag'] for s in SKINS]
    for t in tags: build(BY_TAG[t])
    write_table(built_tags())
    bad = 0
    for t in tags:
        b = verify(BY_TAG[t]); bad += len(b)
        print(f'  verify {t}: {"OK" if not b else "; ".join(b[:4])}')
    sheets(tags)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
