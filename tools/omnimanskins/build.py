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

# ── SHADING ENGINE (v2): one base colour per region; every pixel keeps the ORIGINAL sprite's light and shadow ───────────
# The source sheet's shade of a pixel, measured in OKLab lightness against the brightest member of its colour family
# (red / white / dark / skin / eye), is re-applied to the region's base colour: folds, rim shadows and the deep shadow
# land exactly where the artist drew them. A dark base has less room before the black outline, so its shading is
# compressed (never flattened). Shadows lose a little chroma and drift slightly cool. No per-pixel noise anywhere.
def _lin(c): c = c / 255.0; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def _srgb(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255.0
def oklab(rgb):
    r, g, b = _lin(np.asarray(rgb, np.float64))
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b); m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return np.array([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s])
def from_oklab(L, a, b):
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3; m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3; s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return _srgb(np.array([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]))
FAMS = [M.REDS, M.WHITES, M.DARKS, M.SKINS_, M.EYES]
_FAM_L = []
for fam in FAMS:
    Ls = [oklab(np.array(c, np.float64))[0] for c in fam]; _FAM_L.append((max(Ls), max(Ls) - min(Ls)))
_SH = {}
def shade(base, src):
    """the region's base colour, shaded like the source pixel was"""
    key = (base, tuple(int(v) for v in src))
    if key in _SH: return _SH[key]
    s = key[1]; fi = next((i for i, f in enumerate(FAMS) if s in f), 1)
    Lref, span = _FAM_L[fi]; Ls = oklab(np.array(s, np.float64))[0]
    B = oklab(hx(base)); d = max(0.0, Lref - Ls)                                                  # how far into shadow the artist went
    k = min(1.0, max(0.0, (B[0] - 0.10) / max(span, 1e-6)))                                       # room above the outline black
    L = B[0] - d * max(k, 0.35 if B[0] > 0.2 else k)
    q = (L / max(B[0], 1e-6)) ** 0.5 if B[0] > 0 else 1                                           # shadows: a little less chroma …
    out = from_oklab(max(0.03, L), B[1] * q, B[2] * q - 0.012 * min(1, d / max(span, 1e-6)))     # … and slightly cool
    _SH[key] = np.clip(out, 0, 255); return _SH[key]


SKIN = '#f2b48c'   # bare hands (Overtime, Sunday): his own skin colour as the base
SKINS = [
  dict(tag='imperial', name='Viltrumite Imperial Uniform', classification='Viltrum Collection',
       # the Viltrumite uniform: a white bodysuit, black collar / shoulder panels / gloves / belt / boots, black cape
       torso='#f4f2ee', arms='#f4f2ee', legs='#f4f2ee', collar='#1e1f24', gloves='#1e1f24', waist='#1e1f24', boots='#1e1f24',
       insignia='#1e1f24', cape='#24252b', lining='#3a3c44', streaks='#dfe8f6', pat=['shoulders'],
       pal=pal('rgba(226,234,246,0.9)', '#ffffff', '#ffb070', '#24252b')),
  dict(tag='veteran', name='Viltrumite Field Veteran', classification='Viltrum Collection',
       torso='#d9cfb6', arms='#d9cfb6', collar='#d9cfb6', gloves='#5a4330', waist='#3e3830', legs='#555c66', boots='#6a4a30',
       insignia='#6a5c48', cape='#a8997c', lining='#7a2424', temples='#c8c8c8', pat=['seam', 'temples_grey'],
       pal=pal('rgba(220,206,180,0.85)', '#efe4cc', '#ff9a50', '#a8997c', dust='rgba(170,150,120,0.6)')),
  dict(tag='mourning', name='Imperial Mourning Dress', classification='Viltrum Collection',
       torso='#2e2e35', arms='#2e2e35', collar='#26262c', legs='#2e2e35', waist='#222228', boots='#222228', gloves='#f0e9da',
       insignia='#4a4a54', cape='#26262c', lining='#6e1a34', pat=['sash'],
       pal=pal('rgba(230,226,220,0.8)', '#f2eee6', '#ff7a5a', '#26262c')),
  dict(tag='alienx_half', name='Alien X — The Other Half of Nolan', classification='Alien X Collection', crossover='Ben 10', half=True,
       pal=pal('rgba(190,200,255,0.85)', '#ffffff', '#b28cff', '#1a1450', planet='#3a2a8a', planetEdge='#1a1450')),
  dict(tag='alienx_redshift', name='Alien X — Redshift', classification='Alien X Collection', crossover='Ben 10',
       torso='#3c3f47', arms='#3c3f47', collar='#33363d', legs='#3c3f47', waist='#2c2e35', gloves='#2c2e35', boots='#2c2e35',
       insignia='#ff8a64', cape='#1a1840', lining='#1a1840', streaks='#ff9a7a', pat=['nebula'],
       pal=pal('rgba(255,160,130,0.85)', '#ffd8c8', '#ff7a5a', '#2a1848', planet='#ff7a5a', planetEdge='#3a2a8a')),
  dict(tag='blacktie', name='Black-Tie Meteor', classification='Glitter Collection', glitter=True,
       torso='#2c2c33', arms='#2c2c33', legs='#2c2c33', waist='#232329', collar='#f6f6f6', gloves='#2c2c33', boots='#1e1e24',
       insignia='#f6f6f6', cape='#1e2546', lining='#bcc2ce', pat=['inset', 'sparkle_lining', 'brake_sweep', 'cuff_glint'],
       pal=pal('rgba(220,226,240,0.9)', '#ffffff', '#c8d0ff', '#1e2546')),
  dict(tag='champagne', name='Pink Champagne Heavyweight', classification='Glitter Collection', glitter=True,
       torso='#e0a2ae', arms='#e0a2ae', collar='#e0a2ae', gloves='#d0909c', waist='#8a3c50', legs='#dc9ca8', boots='#f4ead8',
       insignia='#8a2c44', moustache='#5a1628', cape='#c88090', lining='#7a3450', pat=['facets', 'sparkle_shoulders'],
       pal=pal('rgba(255,214,222,0.9)', '#fff0f4', '#ff9ab0', '#c88090')),
  dict(tag='valkyrie', name='Winning Valkyrie — Victory Lap', classification='Champion Collection',
       torso='#2c5ad0', arms='#2c5ad0', collar='#2c5ad0', gloves='#f4f6fa', waist='#e8b432', legs='#2854c4', boots='#1c3a8c',
       insignia='#f2c444', cape='#1c3a8c', lining='#1c3a8c', pat=['red_panels', 'gold_toe'],
       pal=pal('rgba(210,226,255,0.9)', '#ffffff', '#ffd46a', '#1c3a8c')),
  dict(tag='diamondhead', name='Ben 10 — Diamondhead Mantle', classification='Ben 10 Collection', crossover='Ben 10',
       torso='#5cd6a6', arms='#5cd6a6', collar='#5cd6a6', gloves='#4cc496', waist='#1c4a34', legs='#1f5a40', boots='#163e2c',
       insignia='#e6fff4', hair='#141414', cape='#174a34', lining='#3aa87a', pat=['crystal'],
       pal=pal('rgba(170,250,210,0.9)', '#e6fff2', '#7ee0b0', '#174a34')),
  dict(tag='heatblast', name='Ben 10 — Heatblast Re-entry', classification='Ben 10 Collection', crossover='Ben 10',
       torso='#6a2a1c', arms='#6a2a1c', collar='#5a2216', legs='#5e2418', waist='#3e1a12', gloves='#4a1e14', boots='#4a1e14',
       insignia='#ffb02a', cape='#ff5a14', lining='#c8280a', streaks='#ffa040', pat=['flame_cape', 'ember_seams', 'reentry_fist'],
       pal=pal('rgba(255,150,60,0.9)', '#ffe08a', '#ff6a1a', '#ff5a14', dust='rgba(120,90,70,0.6)')),
  dict(tag='overtime', name='JJK — Overtime', classification='JJK Collection', crossover='Jujutsu Kaisen',
       # Nanami: a tan suit over a light-blue shirt, a leopard-print tie
       torso='#a9c8e8', collar='#a9c8e8', arms='#c9a978', legs='#c9a978', waist='#6a5038', gloves=SKIN, boots='#5a3a24',
       insignia='#a9c8e8', cape='#bc9a6a', lining='#22345a', pat=['tie'],
       pal=pal('rgba(230,240,250,0.85)', '#ffffff', '#ffc070', '#bc9a6a')),
  dict(tag='patriarch', name='JJK — Cursed Patriarch', classification='JJK Collection', crossover='Jujutsu Kaisen',
       # Sukuna: pink hair, black markings, a white kimono over black
       hair='#e48aa4', moustache='#141414', torso='#f2efea', arms='#f2efea', collar='#f2efea', gloves='#1e1e24', waist='#1e1e24',
       legs='#26262c', boots='#1a1a20', insignia='#26262c', cape='#1e1e24', lining='#1e1e24', pat=['cheek_marks', 'pink_edge', 'wrist_band'],
       pal=pal('rgba(230,200,214,0.85)', '#f4e6ec', '#ff8ab0', '#1e1e24')),
  dict(tag='sunday', name="Sunday at the Graysons'", classification='Civilian Collection',
       torso='#dccaa6', arms='#dccaa6', collar='#dccaa6', gloves=SKIN, waist='#7a5638', legs='#4a6c9e', boots='#f2f0ea',
       insignia='#dccaa6', cape='#b04e26', lining='#8a3a1a', temples='#d0d0d0', pat=['blanket_stripe', 'temples_grey'],
       pal=pal('rgba(240,230,210,0.85)', '#fff6e6', '#ff9a50', '#b04e26')),
  dict(tag='firstissue', name='The First Issue', classification='Comic Collection',
       # the first printing: newsprint white + faded tomato red, flat colour with navy ink for every shadow (cel shading)
       torso='#f2e6cc', arms='#f2e6cc', collar='#f2e6cc', boots='#f2e6cc', gloves='#d65040', waist='#c44434', legs='#d65040',
       insignia='#d65040', cape='#d65040', lining='#b03c30', hair='#1c2a4a', moustache='#1c2a4a', pat=['ink', 'misprint'],
       pal=pal('rgba(0,170,220,0.8)', '#f2e8d2', '#d86a56', '#d65040')),
  dict(tag='artdeco', name='Art Deco Express', classification='Champion Collection',
       torso='#127a80', arms='#127a80', collar='#127a80', gloves='#d0a844', waist='#d0a844', legs='#106e74', boots='#f0e6cc',
       insignia='#d0a844', cape='#0c4e56', lining='#0c4e56', pat=['brass_lines', 'cream_arm'],
       pal=pal('rgba(226,194,106,0.85)', '#f8f2e2', '#e2c26a', '#0c4e56')),
  dict(tag='rescue', name='Rescue Service Orange', classification='Civilian Collection',
       torso='#ff6a14', collar='#ff6a14', arms='#f6f6f6', gloves='#ff6a14', waist='#1e2e5a', legs='#f6640f', boots='#1e2e5a',
       insignia='#f6f6f6', cape='#f05a0c', lining='#b8400a', pat=['reflective'],
       pal=pal('rgba(255,236,220,0.9)', '#ffffff', '#ff8a3a', '#f05a0c')),
  dict(tag='cornerman', name='Heavyweight Cornerman', classification='Champion Collection',
       torso='#1f7a48', arms='#1f7a48', collar='#efe4c4', gloves='#f6f4f0', waist='#7e2430', legs='#2a2a30', boots='#1e1e24',
       insignia='#efe4c4', cape='#1c7044', lining='#14503a', pat=['piping', 'trunks', 'gold_n'],
       pal=pal('rgba(240,232,200,0.85)', '#f8f0d8', '#ffd060', '#1c7044')),
  dict(tag='western', name='Midnight Western', classification='Civilian Collection',
       torso='#8a5c36', arms='#8a5c36', collar='#8a5c36', gloves='#5e4026', waist='#2e241c', legs='#2e2e34', boots='#4e3622',
       insignia='#8a5c36', moustache='#1c1612', cape='#a83a28', lining='#7a2a1e', temples='#d6dae2', pat=['buckle', 'saddle', 'temples_grey'],
       pal=pal('rgba(230,214,190,0.85)', '#f6eee0', '#ffa050', '#a83a28', dust='rgba(170,130,90,0.6)')),
  dict(tag='porcelain', name='Porcelain Strongman', classification='Champion Collection',
       torso='#f4efe6', arms='#f4efe6', collar='#f4efe6', gloves='#2350c0', waist='#2350c0', legs='#f2ede4', boots='#2350c0',
       insignia='#2350c0', cape='#1e46ae', lining='#16388e', pat=['wave', 'chest_band'],
       pal=pal('rgba(220,230,255,0.9)', '#fbf8f2', '#6a8aff', '#1e46ae')),
  dict(tag='earthrise', name='Earthrise', classification='Viltrum Collection',
       torso='#b4b6ba', arms='#b4b6ba', collar='#b4b6ba', gloves='#f6f6f8', waist='#5a5c62', legs='#acaeb2', boots='#222228',
       insignia='#3a7ac4', cape='#18284e', lining='#18284e', pat=['planet_hem'],
       pal=pal('rgba(220,232,250,0.9)', '#ffffff', '#ffb070', '#18284e', planet='#2f6fb8', planetEdge='#1b4a86')),
]
BY_TAG = {s['tag']: s for s in SKINS}
PLANET = ['#0e2a5a', '#1b4a86', '#2f6fb8', '#6aa8e6', '#e8f2fc']   # = the Escape Velocity orbit planet (omnimanViltrumSkins OMV_DEFAULT_PAL)


# ── patterns (body-local, clean solid shapes only; every colour goes through shade() so it keeps the sprite's shading) ─
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
    rn, x, y, g, src = ctx.rn, ctx.x, ctx.y, ctx.g, ctx.src
    P = lambda base: shade(base, src)
    tb = g.get('torso') or (0, 0, 1, 1)
    lit = ctx.t >= 0.95                                                                       # a pixel in the source's full light
    if name == 'shoulders' and rn == 'torso' and y <= tb[1] + 3:
        return P('#1e1f24')                                                                   # black shoulder panels
    if name == 'temples_grey' and rn == 'temples':
        return P(sk['temples'])
    if name == 'seam' and rn in ('torso', 'arms') and y == tb[1] + 3 and tb[0] + 2 <= x <= tb[0] + 7:
        return P('#6a5a44')                                                                   # one repaired shoulder seam
    if name == 'sash' and rn in ('torso', 'arms', 'waist', 'legs', 'collar'):
        w = max(1, tb[2] - tb[0]); h = max(1, (g['hip'][1] if g.get('hip') else tb[3]) - tb[1])
        u, v = (x - tb[0]) / w, (y - tb[1]) / h
        if abs(u - v * 0.95) < 0.11 and 0 <= v <= 1.15: return P('#f6f4f0')                   # shoulder → opposite hip
    if name == 'nebula' and rn in ('cape', 'lining'):
        d = ctx.dn                                                                            # coral at the collar → violet → deep-space blue at the hem
        base = '#ff7a5a' if d < 0.3 else '#b0407a' if d < 0.55 else '#4a2a8a' if d < 0.78 else '#1a2a6a'
        if d > 0.6 and (x * 7 + y * 13) % 97 == 0 and ctx.ed >= 2: return hx('#d8e6ff')          # three-ish cold stars near the hem
        return P(base)
    if name == 'inset' and rn == 'torso':
        cx = (g['neck'][0] if g.get('neck') else (tb[0] + tb[2]) / 2)
        if abs(x - cx) <= 2 and y >= tb[1] + 2: return P('#f6f6f6')                            # the white shirt front
    if name == 'sparkle_lining' and rn == 'lining' and lit and ctx.ed >= 1:
        if (x * 3 + y * 5 + ctx.phase * 7) % 23 == 0: return hx('#ffffff')                   # sparse sequin glints (3 phases)
    if name == 'brake_sweep' and rn == 'lining' and ctx.strip == 'brake':
        if abs((x - ctx.fw * 0.2) - (y * 0.9 - 6)) < 2: return hx('#f4f6fa')                 # one sweep of silver crosses the lining
    if name == 'cuff_glint' and rn == 'gloves' and ctx.near_arm and ctx.strip in ('idle', 'win', 'unimpressed', 'glint', 'intro'):
        if ctx.phase == (ctx.fi % 3) and (x + y) % 5 == 0: return hx('#ffffff')                 # one sharp cuff glint
    if name == 'facets' and rn in ('torso', 'collar', 'arms') and y <= tb[1] + 8:
        k = int((x - tb[0]) // max(1, (tb[2] - tb[0]) / 3))                                  # three broad facets across the shoulders
        lead = ctx.strip in ('straight', 'jab', 'stepPunch', 'flightPunch', 'returnPunch') and ctx.fi >= 1
        if lead and k >= 2: return P('#fff2f4')                                               # the leading shoulder flashes white
        if lead and k == 0: return P('#8a3c62')                                               # the rear settles into plum
        return P(['#f0bcc6', '#e6a6b4', '#f8d0d8'][k % 3])
    if name == 'sparkle_shoulders' and rn in ('torso', 'collar') and y <= tb[1] + 8 and lit:
        if (x * 5 + y * 3 + ctx.phase * 11) % 19 == 0: return hx('#ffffff')
    if name == 'red_panels' and rn in ('cape', 'lining'):
        for c0 in (0.18, 0.5, 0.8):                                                           # three swept red panels: one shows at idle
            if c0 - 0.08 <= ctx.dn <= c0 + 0.08 and ctx.ed >= 1.5: return P('#e0262e')
    if name == 'gold_toe' and rn == 'boots' and x >= ctx.bootx - 2:
        return P('#e8b432')
    if name == 'crystal' and rn in ('torso', 'arms', 'collar', 'gloves'):
        band = int((x + y) // 6) % 3                                                          # big diagonal crystal planes
        return P(['#5cd6a6', '#8ef0c8', '#3cb488'][band])
    if name == 'flame_cape' and rn in ('cape', 'lining'):
        d = ctx.dn                                                                            # fire: deep red at the collar → orange → yellow at the tips
        return P('#c8280a' if d < 0.35 else '#ff6a14' if d < 0.7 else '#ffb42a')
    if name == 'ember_seams' and rn in ('gloves', 'boots') and ctx.ed_body <= 1:
        return P('#ff8a1a')                                                                   # orange seams on gloves + boots only
    if name == 'reentry_fist' and ctx.strip in ('fly', 'flightPunch', 'meteor', 'grabRush') and ctx.fi == ctx.n - 1:
        if rn == 'gloves': return P('#fff07a')                                                # fastest frame: leading fist pale yellow
        if rn == 'boots': return P('#ff5a1a')                                                 # trailing boots ember-red
    if name == 'tie' and rn in ('torso', 'collar'):
        cx = g['neck'][0] if g.get('neck') else (tb[0] + tb[2]) / 2
        if abs(x - cx) <= 1 and y >= (g['neck'][1] if g.get('neck') else tb[1]) - 1:
            return P('#3a2a0c') if (x + 2 * y) % 4 == 0 else P('#e0b030')                     # leopard-print tie
    if name == 'cheek_marks' and rn == 'face' and g.get('face'):
        f = g['face']; ey = f[1] + (f[3] - f[1]) * 0.55
        if abs(y - ey) < 0.6 and (abs(x - (f[0] + 2)) < 1.5 or abs(x - (f[2] - 2)) < 1.5): return hx('#1a0a12')
    if name == 'pink_edge' and rn in ('cape', 'lining') and ctx.ed <= 1.2:
        return P('#e48aa4')
    if name == 'wrist_band' and rn == 'gloves' and ctx.near_arm:
        return P('#e48aa4')
    if name == 'blanket_stripe' and rn in ('cape', 'lining') and 1.5 <= ctx.ed <= 3:
        return P('#f2e2bc')
    if name == 'ink' and rn not in ('face', 'eyes', 'hair', 'moustache', 'temples') and ctx.t < 0.6:
        return hx('#1c2a4a')                                                                  # every shadow = flat navy ink (cel)
    if name == 'ink' and rn not in ('face', 'eyes', 'hair', 'moustache', 'temples'):
        return hx(sk[rn]) if isinstance(sk.get(rn), str) else col                             # … and flat print colour in the light
    if name == 'misprint' and rn == 'streaks':
        return hx('#00aadc') if y % 2 == 0 else hx('#e0402a')                                  # misaligned cyan + red
    if name == 'brass_lines' and rn in ('cape', 'lining') and ctx.ed >= 1.5:
        for c0 in (0.42, 0.55, 0.68):
            if abs(ctx.dn - c0) < 0.03: return P('#e0b84c')
    if name == 'cream_arm' and rn == 'arms' and ctx.ed_body <= 1:
        return P('#f2e8cc')
    if name == 'reflective' and rn in ('cape', 'lining'):
        for c0 in (0.45, 0.72):
            if abs(ctx.dn - c0) < 0.055: return P('#eef2f6')
    if name == 'piping' and rn in ('torso', 'arms', 'collar') and ctx.ed_body <= 1:
        return P('#efe4c2')
    if name == 'trunks' and rn == 'legs' and g.get('hip') and np.hypot(x - g['hip'][0], y - g['hip'][1]) < 7:
        return P('#7e2430')
    if name == 'gold_n' and rn in ('cape', 'lining') and ctx.strip in ('fly', 'meteor', 'grabRush', 'orbitHold', 'flightPunch') and ctx.n_box:
        bx0, by0, bw, bh = ctx.n_box
        u, v = (x - bx0) / bw, (y - by0) / bh
        if 0 <= u <= 1 and 0 <= v <= 1 and (u < 0.25 or u > 0.75 or abs(u - v) < 0.22): return hx('#f0c040')
    if name == 'buckle' and rn == 'waist' and g.get('neck') and abs(x - g['neck'][0]) <= 1:
        return hx('#2ab8b0')
    if name == 'saddle' and rn in ('cape', 'lining'):
        if 1 <= ctx.ed <= 2.5: return P('#f0e4c4')                                            # one ivory border
        if 0.45 <= ctx.dn <= 0.55: return P('#2a6a7a')                                        # one teal band across the blanket
    if name == 'wave' and rn == 'arms':
        if (x + int(2 * np.sin(y * 0.9))) % 5 == 0: return P('#2350c0')                       # the blue wave on the forearms
    if name == 'chest_band' and rn == 'torso' and tb[1] + 6 <= y <= tb[1] + 7:
        return P('#2350c0')
    if name == 'planet_hem' and rn in ('cape', 'lining') and ctx.dn > 0.8:
        k = (ctx.dn - 0.8) / 0.2
        if k < 0.12: return hx('#bfe0ff')                                                     # the bright limb (a sliver at idle)
        return P(PLANET[min(4, 1 + int(k * 3))])                                              # Earth from orbit: bands of ocean blue
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
        t = float(tone[y, x]); src = a[y, x, :3]
        col = shade(stops, src) if isinstance(stops, str) else (ramp(stops, t) if stops else src.astype(np.float32))
        if pats:
            ctx = Ctx(); ctx.rn = rn; ctx.t = t; ctx.src = src; ctx.x = lx; ctx.y = y; ctx.g = geos[fi]; ctx.fi = fi; ctx.n = n; ctx.fw = fw
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
