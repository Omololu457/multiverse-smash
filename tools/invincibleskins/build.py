#!/usr/bin/env python3
"""tools/invincibleskins/build.py — Invincible (Mark Grayson) (invincible): 20 premade cosmetic skins.

Every strip the fighter draws (invincibleSprites.js INVINCIBLE_ANIM) is recoloured into
assets/invincible/skins/<tag>/<strip>.png: same size, same frame map → identical timing, hitboxes and anchors. The
select / HUD portrait is recoloured with its own face-close-up masks, and every effect sheet (assets/invincible/fx/) gets
a premade variant in skins/<tag>/fx/. NOTHING is recoloured at runtime. Deterministic: textures come from an integer hash
of (x, y, salt), never RNG.

MASKS: tools/invincibleskins/masks.py (hair, temples, mask, goggles, eyes, face, collar, shoulders, chest, torso, arms,
gloves, waist, legs, boots, streaks, cloth, per frame). Patterns are placed in BODY-LOCAL coordinates (along the
head → chest axis and across it, per frame), so a sash, a stripe or a cape follows him through flight, kicks, knockdowns
and the win / lose frames. PROTECTED (verified byte-identical): the outline black and every colour the masks leave at 0.
ALPHA is identical to the default except the logged hair removals of the shaved skins (Prison, Mohawk), which only REMOVE
pixels; nothing is ever added outside the silhouette.

GLITTER skins get 3 pre-baked glint phases (<tag>/, <tag>/p1/, <tag>/p2/); invincibleSkins.js picks the phase from the
SIMULATION clock.

    python3 tools/invincibleskins/build.py --batch N       skins 5N-4 … 5N
    python3 tools/invincibleskins/build.py tag ...         just those
    python3 tools/invincibleskins/build.py --verify        dims / alpha / protected pixels of every built skin
    python3 tools/invincibleskins/build.py --sheets [tags] contact sheets → docs/msv1/invincible/skins/
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
import masks as M

ROOT, SRC, R = M.ROOT, M.SRC, M.R
OUT = os.path.join(SRC, 'skins')
DOCS = os.path.join(ROOT, 'docs/msv1/invincible/skins')
TABLE_JS = os.path.join(ROOT, 'invincibleSkinTable.js')
FX_KEYS = ['takeoffRing', 'vStreak', 'hStreak', 'sonicRing', 'impact', 'zipStreak', 'zipRing', 'ghost', 'bigBurst']
UNMASKED = ('win', 'lose')          # strips where he is already bare-faced (the cowl is in his hand)


def hx(c):
    c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def h3(x, y, z=0, salt=0):
    x = np.asarray(x, np.int64); y = np.asarray(y, np.int64)
    v = (x * 374761393 + y * 668265263 + int(z) * 2147483647 + salt * 1274126177) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def ramp(stops, t):
    """vectorised: t (N,) in 0..1 → (N, 3)"""
    S = np.array([hx(s) for s in stops], np.float32)
    t = np.clip(np.asarray(t, np.float32), 0, 1) * (len(S) - 1)
    i = np.minimum(t.astype(int), len(S) - 2); f = (t - i)[..., None]
    return S[i] * (1 - f) + S[i + 1] * f


SKIN = ['#7a3a2c', '#a4503f', '#d3825f', '#fcd4a6', '#fde4c8']      # Mark's own skin ramp (sheet colours)
SCALP = ['#8a5e4c', '#b88a72', '#d8aa8e', '#ecc4a6']                # a freshly shaved scalp
BROW = '#141016'


# ── per-strip analysis (shared by every skin) ────────────────────────────────────────────────────────────────────────
class An: pass


_AN = {}
def analysis(name, fw, n, head_only=False):
    k = (name, head_only)
    if k in _AN: return _AN[k]
    a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
    H, W = a.shape[:2]
    A = An(); A.a = a; A.fw = fw; A.n = n; A.name = name; A.H = H; A.W = W
    A.reg = np.zeros((H, W), np.int8); A.tone = np.zeros((H, W), np.float32)
    A.proj = np.zeros((H, W), np.float32); A.perp = np.zeros((H, W), np.float32)
    A.U = np.zeros((H, W), np.float32); A.V = np.zeros((H, W), np.float32)
    A.hor = np.zeros((H, W), bool); A.front = np.zeros((H, W), bool); A.geos = []
    A.lx = np.tile(np.arange(fw), n)[None, :].repeat(H, 0); A.fi = np.repeat(np.arange(n), fw)[None, :].repeat(H, 0)
    yy, xx = np.mgrid[0:H, 0:fw]
    if head_only:
        A.reg = M.portrait_regions(a); A.geos = [None]
    else:
        for fi in range(n):
            sl = slice(fi * fw, (fi + 1) * fw); fr = a[:, sl]
            r = M.frame_regions(fr[..., :3], fr[..., 3], name, fi); A.reg[:, sl] = r
            g = M._LAST.get('geo'); A.geos.append(g)
            if not g: continue
            (hxx, hy), (ux, uy) = g['head'], g['axis']
            pr = (xx - hxx) * ux + (yy - hy) * uy; pp = (xx - hxx) * -uy + (yy - hy) * ux   # pp > 0 = his BACK side
            A.proj[:, sl] = pr; A.perp[:, sl] = pp
            ch = r == R['chest']
            wc = max(3.0, float(np.abs(pp[ch]).max())) if ch.any() else 4.0
            c0 = float(np.median(pp[ch])) if ch.any() else 0.0
            A.U[:, sl] = (pp - c0) / wc
            A.V[:, sl] = (pr - g['chestTop']) / max(3.0, g['chestBot'] - g['chestTop'])
            A.hor[:, sl] = abs(uy) < 0.55
            # limbs: each piece goes whole to the side its centre is on (front = toward his facing / belly)
            fr_m = np.zeros((H, fw), bool)
            for limb in ('gloves', 'arms', 'boots', 'legs'):
                lab, k2 = ndimage.label(r == R[limb], structure=np.ones((3, 3)))
                for i in range(1, k2 + 1):
                    m = lab == i
                    if pp[m].mean() < 0: fr_m |= m
            A.front[:, sl] = fr_m
    rgb = a[..., :3]
    for c, t in M.TONE.items():
        A.tone[(rgb == c).all(-1)] = t
    _AN[k] = A
    return A


# ── the 20 skins (brief order) ───────────────────────────────────────────────────────────────────────────────────────
# region → ramp (dark → light, indexed by the source pixel's tone in its colour family); missing = keep the sheet's
# colours. face: 'mask' (keep the cowl) | 'bare' (cowl → skin, lenses → eyes + brows) | 'cover' (near-black fabric).
# fx: effect-sheet recolours; pal: the procedural strokes (invincibleFx: suit, trail, marker, resolve).
def pal(suit, trail, marker, resolve): return dict(suit=suit, trail=trail, marker=marker, resolve=resolve)


# shared palettes reused from Omni-Man (tools/omnimanskins/build.py) so father and son match
OMV_IMPERIAL = dict(collar=['#a8a49c', '#e6e2da', '#ffffff'], insignia=['#121316', '#1e1f23', '#2c2e33'],
                    streaks=['#9fb6d6', '#c6d6ec', '#e8f0fb'])
OMV_ALIENX = dict(indigo=['#04041a', '#0c0c34', '#1a1a5a', '#2c2c80'], jade=['#0a6a4a', '#2ad8a0', '#a8ffe0'], star='#fff6e0',
                  violet='#9a6aff')
OMV_VALKYRIE = dict(cobalt=['#0e2a7a', '#1e48b8', '#3c6ae0'], gold=['#8a6a14', '#d0a42a', '#f6d46a'], white=['#b8bcc8', '#e6e8f0', '#ffffff'],
                    red=['#8a0c12', '#c81a22', '#f0343c'], legs=['#0c2470', '#1a40a8', '#3460d4'], boots=['#0a1a50', '#142c7a', '#2240a0'])

PEARL = ['#a8a49c', '#e2ded6', '#faf8f2']
ASH = ['#7e8084', '#aeb0b4', '#cfd1d4']
CHAR = ['#16171a', '#2a2c31', '#3e4047']
HAIR = ['#07070c', '#141420', '#262838']
IMPERIAL = dict(face='bare', hair=HAIR, collar=OMV_IMPERIAL['collar'], shoulders=ASH, chest=PEARL, torso=PEARL, arms=CHAR,
                gloves=['#121316', '#24262b', '#383a40'], waist=['#121316', '#202226', '#30323a'], legs=['#8e8a82', '#cfcbc3', '#eeebe4'],
                boots=['#0c0d10', '#1a1b1f', '#2c2e33'], cloth=PEARL, insignia=OMV_IMPERIAL['insignia'], streaks=OMV_IMPERIAL['streaks'])

SKINS = [
  dict(tag='viltrumite', name='Viltrumite Mark', classification='Viltrum Collection', **IMPERIAL,
       pat=['insignia', 'arm_line', 'jaw'], line=['#d8dade', '#f4f5f7', '#ffffff'],
       fx=dict(ring=['#9fb6d6', '#d4e0f0', '#ffffff'], streak=[['#6a7078', '#a8aeb6', '#e8ecf2'], ['#2a2c31', '#4a4e56', '#6e737c']]),
       pal=pal('#eeebe4', '#c6d6ec', '#e8f0fb', '#e8f0fb')),
  dict(tag='mustache', name='Mustache Mark', classification='Viltrum Collection', **IMPERIAL,
       pat=['insignia', 'arm_line', 'jaw', 'moustache'], line=['#d8dade', '#f4f5f7', '#ffffff'],
       fx=dict(ring=['#9fb6d6', '#d4e0f0', '#ffffff'], streak=[['#6a7078', '#a8aeb6', '#e8ecf2'], ['#2a2c31', '#4a4e56', '#6e737c']]),
       pal=pal('#eeebe4', '#c6d6ec', '#e8f0fb', '#e8f0fb')),
  dict(tag='mohawk', name='Mohawk Mark', classification='Mark Collection', face='mask', shave='mohawk',
       hair=['#05050a', '#10101c', '#1c1e30'], ridge=['#1a2a6a', '#2a3e9a', '#4a62c8'], temples=SCALP,
       mask=['#0a2e66', '#1452a8', '#2e7ad8'], chest=['#06060a', '#101018', '#1c1c28'], collar=['#0a2e66', '#1452a8', '#2e7ad8'],
       shoulders=['#0a2e66', '#1452a8', '#2e7ad8'], torso=['#0a2e66', '#1452a8', '#2e7ad8'], arms=['#06060a', '#101018', '#1c1c28'],
       gloves=['#0a2e66', '#1452a8', '#2e7ad8'], waist=['#0a2e66', '#1452a8', '#2e7ad8'], legs=['#06060a', '#101018', '#1c1c28'],
       boots=['#0a2e66', '#1452a8', '#2e7ad8'], cloth=['#06060c', '#11121c', '#1e2030'], pat=[],
       fx=dict(ring=['#2e5aa8', '#7aa4e8', '#e4eeff'], streak=[['#0a2e66', '#2e7ad8', '#8ab8ff'], ['#06060a', '#1c1c28', '#3a3a52']]),
       pal=pal('#1452a8', '#7aa4e8', '#4a8af0', '#7aa4e8')),
  dict(tag='prison', name='Prison Mark', classification='Mark Collection', face='bare', shave='all', hair=SCALP, temples=SCALP,
       collar=['#8c877c', '#c6c0b2', '#e2ddd0'], shoulders=['#8c877c', '#c6c0b2', '#e2ddd0'], chest=['#8c877c', '#c6c0b2', '#e2ddd0'],
       torso=['#8c877c', '#c6c0b2', '#e2ddd0'], arms=['#8c877c', '#c6c0b2', '#e2ddd0'], gloves=SKIN[1:], waist=['#6e6a62', '#8e8a80', '#a8a498'],
       legs=['#8c877c', '#c6c0b2', '#e2ddd0'], boots=['#262420', '#3a3732', '#504c45'], cloth=['#8c877c', '#c6c0b2', '#e2ddd0'],
       pat=['flat', 'seams', 'hems', 'scar'],
       fx=dict(ring=['#8a867c', '#c4c0b4', '#ecE8dc'], streak=[['#6e6a62', '#a8a498', '#d8d4c8'], ['#3a3732', '#5a5650', '#7a766e']]),
       pal=pal('#c6c0b2', '#c4c0b4', '#e2ddd0', '#ffcf8a')),
  dict(tag='sinister', name='Sinister Mark', classification='Mark Collection', face='mask',
       hair=HAIR, mask=['#050508', '#0e0e14', '#1a1a24'], goggles=['#a8801c', '#f2d060', '#fff4c0'],
       collar=['#8a6a14', '#d0a42a', '#f6d46a'], shoulders=['#050508', '#101016', '#1e1e28'], chest=['#050508', '#101016', '#1e1e28'],
       torso=['#050508', '#101016', '#1e1e28'], arms=['#050508', '#101016', '#1e1e28'], gloves=['#8a6a14', '#d0a42a', '#f6d46a'],
       waist=['#8a6a14', '#d0a42a', '#f6d46a'], legs=['#050508', '#101016', '#1e1e28'], boots=['#050508', '#101016', '#1e1e28'],
       cloth=['#050508', '#0e0e14', '#1a1a24'], pat=['cape'], cape=['#050508', '#0e0e14', '#1a1a24'], capeGold=['#8a6a14', '#d8ac30', '#ffe07a'],
       fx=dict(ring=['#c8c8cc', '#ececf0', '#ffffff'], streak=[['#8a6a14', '#d8ac30', '#ffe07a'], ['#050508', '#1e1e28', '#3a3a48']]),
       pal=pal('#d0a42a', '#d8ac30', '#ffe07a', '#ffe07a')),
  dict(tag='maskless', name='Maskless Mark', classification='Mark Collection', face='bare', hair=HAIR, pat=['jaw'],
       pal=pal('#f4c430', '#7fb6ff', '#ffd84a', '#ffd84a')),
  dict(tag='fullmask', name='Full-Mask Mark', classification='Mark Collection', face='cover',
       hair=['#07080c', '#12141c', '#1e2230'], mask=['#07080c', '#12141c', '#1e2230'], face_c=['#07080c', '#12141c', '#1e2230'],
       pat=['cover'], pal=pal('#f4c430', '#7fb6ff', '#ffd84a', '#ffd84a')),
  dict(tag='rose', name='Pink Viltrumite — Rose Standard', classification='Viltrum Collection', face='bare', hair=HAIR,
       collar=['#d0a0ae', '#f9cdd8', '#fff0f4'], shoulders=['#6e1838', '#b83368', '#e0588c'], chest=['#d0a0ae', '#f9cdd8', '#fff0f4'],
       torso=['#c4949f', '#ecc0cb', '#fbdde4'], arms=['#c4949f', '#ecc0cb', '#fbdde4'], gloves=['#2a0c1a', '#531d37', '#7a3050'],
       waist=['#3a1022', '#531d37', '#6e2a48'], legs=['#b8899a', '#e2b2c0', '#f6cdd8'], boots=['#2a0c1a', '#531d37', '#7a3050'],
       cloth=['#d0a0ae', '#f9cdd8', '#fff0f4'], insignia=['#8a5a4a', '#d09a80', '#f4c8b0'], line=['#6e1838', '#b83368', '#e0588c'],
       pat=['insignia', 'arm_line', 'jaw'],
       fx=dict(ring=['#d0a0ae', '#f9cdd8', '#ffffff'], streak=[['#6e1838', '#b83368', '#e0588c'], ['#d0a0ae', '#f9cdd8', '#fff0f4']]),
       pal=pal('#f9cdd8', '#e0588c', '#f9cdd8', '#f9cdd8')),
  dict(tag='coronation', name='Coronation', classification='Viltrum Collection', face='bare', hair=HAIR, glitter=True,
       collar=['#b8ae98', '#ece4d0', '#fffaee'], shoulders=['#b8ae98', '#ece4d0', '#fffaee'], chest=['#b8ae98', '#ece4d0', '#fffaee'],
       torso=['#b8ae98', '#ece4d0', '#fffaee'], arms=['#b0a690', '#e2dac6', '#f8f2e4'], gloves=['#b8ae98', '#ece4d0', '#fffaee'],
       waist=['#c898a4', '#ecc4cc', '#fde4ea'], legs=['#a89e88', '#d8d0bc', '#f2ecdc'], boots=['#2a1a14', '#40281e', '#5a3a2c'],
       cloth=['#6a0e30', '#b0205a', '#e04a80'], sash=['#6a0e30', '#b0205a', '#e04a80'], pat=['moustache', 'jaw', 'sash', 'clasp'],
       fx=dict(ring=['#e0a0b8', '#fbe0ea', '#ffffff'], streak=[['#6a0e30', '#b0205a', '#e04a80'], ['#b8ae98', '#ece4d0', '#fffaee']]),
       pal=pal('#ece4d0', '#e04a80', '#fbe0ea', '#ffd0e0')),
  dict(tag='defector', name="Defector — Debbie's Repair", classification='Viltrum Collection', **{**IMPERIAL, 'insignia': ['#b4b0a8', '#cfcbc3', '#dcd8d0']},
       pat=['insignia', 'jaw', 'repair'],
       fx=dict(ring=['#9fb6d6', '#d4e0f0', '#ffffff'], streak=[['#7e5613', '#f4d857', '#faec84'], ['#094464', '#0f77af', '#1bb2e1']]),
       pal=pal('#eeebe4', '#7fb6ff', '#ffd84a', '#ffd84a')),
  dict(tag='alienx_twoearths', name='Alien X — Two Earths', classification='Alien X Collection', crossover='Ben 10', half=True,
       fx=dict(ring=['#4a3ab0', '#b28cff', '#ffffff'], streak=[['#f4d857', '#faec84', '#fffbe0'], ['#0c0c34', '#2c2c80', '#6a6ad0']]),
       pal=pal('#f4c430', '#b28cff', '#b28cff', '#fff6e0')),
  dict(tag='observatory', name='Alien X — Observatory Glass', classification='Alien X Collection', crossover='Ben 10', face='bare', hair=HAIR,
       goggles=['#060a16', '#14203c', '#3a5a8a'], chest=['#081230', '#10204a', '#1a3068'], torso=['#081230', '#10204a', '#1a3068'],
       arms=['#081230', '#10204a', '#1a3068'], legs=['#081230', '#10204a', '#1a3068'], collar=['#b8ac90', '#e2d8c0', '#f8f2e2'],
       shoulders=['#b8ac90', '#e2d8c0', '#f8f2e2'], gloves=['#b8ac90', '#e2d8c0', '#f8f2e2'], waist=['#b8ac90', '#e2d8c0', '#f8f2e2'],
       boots=['#b8ac90', '#e2d8c0', '#f8f2e2'], cloth=['#081230', '#10204a', '#1a3068'], pat=['jaw', 'planet', 'glass'],
       fx=dict(ring=['#5ab8b0', '#a8ece4', '#ffffff'], streak=[['#c87a5a', '#f4b08a', '#ffd8bc'], ['#5ab8b0', '#a8ece4', '#e0fffa']]),
       pal=pal('#10204a', '#a8ece4', '#f4b08a', '#a8ece4')),
  dict(tag='blackice', name='Glitter — Black Ice', classification='Glitter Collection', glitter=True, face='mask', hair=HAIR,
       mask=['#101114', '#1e2026', '#30333a'], goggles=['#4a5058', '#8e96a0', '#d0d6de'], collar=['#0a2a3a', '#14485e', '#246a86'],
       shoulders=['#0a2a3a', '#14485e', '#246a86'], chest=['#14161a', '#24272d', '#383c44'], torso=['#101114', '#1e2026', '#30333a'],
       arms=['#101114', '#1e2026', '#30333a'], gloves=['#0c0d10', '#1a1c20', '#2a2c32'], waist=['#0c0d10', '#1a1c20', '#2a2c32'],
       legs=['#101114', '#1e2026', '#30333a'], boots=['#0c0d10', '#1a1c20', '#2a2c32'], cloth=['#101114', '#1e2026', '#30333a'],
       pat=['facets'],
       fx=dict(ring=['#5a6a7a', '#b8c8d8', '#ffffff'], streak=[['#14485e', '#3a8ab0', '#a8dcf0'], ['#1e2026', '#4a5058', '#8e96a0']]),
       pal=pal('#24272d', '#8ec8e0', '#d0d6de', '#a8dcf0')),
  dict(tag='rollerrink', name='Glitter — Roller Rink 1999', classification='Glitter Collection', glitter=True, face='mask', hair=HAIR,
       mask=['#063a3e', '#0e5e62', '#1a8682'], goggles=['#4a1a6a', '#8a4ab8', '#c89aea'], collar=['#3a2050', '#56347a', '#6e4a94'],
       shoulders=['#3a2050', '#56347a', '#6e4a94'], chest=['#b84a0a', '#f07a1a', '#ffb060'], torso=['#04363a', '#0a5a5e', '#14807e'],
       arms=['#04363a', '#0a5a5e', '#14807e'], gloves=['#b84a0a', '#f07a1a', '#ffb060'], waist=['#3a2050', '#56347a', '#6e4a94'],
       legs=['#04363a', '#0a5a5e', '#14807e'], boots=['#a8306a', '#ec5aa0', '#ffa8d0'], cloth=['#063a3e', '#0e5e62', '#1a8682'],
       pat=['skate'],
       fx=dict(ring=['#ec5aa0', '#ffc8e4', '#ffffff'], streak=[['#b84a0a', '#f07a1a', '#ffb060'], ['#04363a', '#14807e', '#5ad0c8']]),
       pal=pal('#f07a1a', '#ec5aa0', '#c89aea', '#ffa8d0')),
  dict(tag='valkyrie', name='Winning Valkyrie — Launch Angle', classification='Champion Collection', face='mask', hair=HAIR,
       mask=OMV_VALKYRIE['cobalt'], collar=OMV_VALKYRIE['cobalt'], shoulders=OMV_VALKYRIE['cobalt'], chest=OMV_VALKYRIE['gold'],
       torso=OMV_VALKYRIE['cobalt'], arms=OMV_VALKYRIE['cobalt'], gloves=OMV_VALKYRIE['white'], waist=OMV_VALKYRIE['gold'],
       legs=OMV_VALKYRIE['legs'], boots=OMV_VALKYRIE['boots'], cloth=OMV_VALKYRIE['cobalt'], wing=OMV_VALKYRIE['red'], pat=['wings'],
       fx=dict(ring=['#d0a42a', '#f6d46a', '#fff0b0'], streak=[['#8a0c12', '#c81a22', '#f0343c'], ['#0e2a7a', '#1e48b8', '#3c6ae0']], streak3=True),
       pal=pal('#1e48b8', '#3c6ae0', '#f6d46a', '#f6d46a')),
  dict(tag='divergent', name='JJK — Divergent Flight', classification='JJK Collection', crossover='Jujutsu Kaisen', face='bare',
       hair=['#7a4a52', '#b8848a', '#e0b0b2'], collar=['#8a1a0a', '#d8401a', '#ff6a3a'], shoulders=['#0a1024', '#16203e', '#24305a'],
       chest=['#0a1024', '#16203e', '#24305a'], torso=['#0a1024', '#16203e', '#24305a'], arms=['#0a1024', '#16203e', '#24305a'],
       gloves=SKIN[1:], waist=['#06080e', '#10141e', '#1a2030'], legs=['#0a1024', '#16203e', '#24305a'], boots=['#06080e', '#10141e', '#1a2030'],
       cloth=['#8a1a0a', '#d8401a', '#ff6a3a'], pat=['jaw', 'knuckles'],
       fx=dict(ring=['#5ab8f0', '#bfe8ff', '#ffffff'], streak=[['#8a1a0a', '#d8401a', '#ff6a3a'], ['#0a1024', '#24305a', '#4a5a8a']], divergent=True),
       pal=pal('#16203e', '#bfe8ff', '#d8401a', '#bfe8ff')),
  dict(tag='delivery', name='Grayson Delivery Service', classification='Civilian Collection', face='mask', hair=HAIR,
       mask=['#2a0c28', '#4a1846', '#6a2a66'], goggles=['#a84a0a', '#f08020', '#ffb060'], collar=['#3a1236', '#5e1e58', '#843080'],
       shoulders=['#3a1236', '#5e1e58', '#843080'], chest=['#3a1236', '#5e1e58', '#843080'], torso=['#3a1236', '#5e1e58', '#843080'],
       arms=['#b8ac90', '#e8dcc0', '#fff6e0'], gloves=['#2a1a10', '#40281a', '#5a3a26'], waist=['#1a1a20', '#2a2a32', '#3c3c46'],
       legs=['#1a1a20', '#2a2a32', '#3c3c46'], boots=['#120c08', '#22180e', '#36261a'], cloth=['#2a0c28', '#4a1846', '#6a2a66'],
       pat=['bands', 'patch', 'jacket_stripe'], band=['#9aa0a8', '#dfe4ea', '#ffffff'],
       fx=dict(ring=['#f08020', '#ffc890', '#ffffff'], streak=[['#a84a0a', '#f08020', '#ffb060'], ['#3a1236', '#843080', '#c070c0']]),
       pal=pal('#5e1e58', '#f08020', '#f08020', '#ffb060')),
  dict(tag='registration', name='Art School — Registration Error', classification='Comic Collection', face='bare', hair=['#141c34', '#1c2a4a', '#2a3a5e'],
       paper=['#e8dcc4', '#f4ecd8'], ink='#1c2a4a', pat=['print', 'offsets', 'inked'],
       fx=dict(ring=['#1c2a4a', '#f4ecd8', '#f4ecd8'], cmy=True),
       pal=pal('#f4ecd8', '#00a8d8', '#e8308a', '#f0d020')),
  dict(tag='bathysphere', name='Deep-Sea — Bathysphere', classification='Deep Sea Collection', face='mask', hair=HAIR,
       mask=['#031418', '#082a30', '#103e46'], goggles=['#8a4a04', '#e08a10', '#ffd060'], collar=['#6a4a14', '#b8862a', '#f0c060'],
       shoulders=['#041a1e', '#0a3036', '#14484e'], chest=['#041a1e', '#0a3036', '#14484e'], torso=['#041a1e', '#0a3036', '#14484e'],
       arms=['#041a1e', '#0a3036', '#14484e'], gloves=['#031418', '#082a30', '#103e46'], waist=['#6a4a14', '#b8862a', '#f0c060'],
       legs=['#041a1e', '#0a3036', '#14484e'], boots=['#031418', '#082a30', '#103e46'], cloth=['#031418', '#082a30', '#103e46'],
       pat=['lenses', 'light_band', 'copper_toes'],
       fx=dict(ring=['#0a3a40', '#2a8a86', '#a8ffe8'], streak=[['#0a3a40', '#2a8a86', '#a8ffe8'], ['#041a1e', '#14484e', '#2a6a70']], radial=True),
       pal=pal('#0a3036', '#7ae8d0', '#e08a10', '#a8ffe8')),
  dict(tag='lighton', name='Earth Kept the Light On', classification='Civilian Collection', face='mask', hair=HAIR,
       mask=['#060a1e', '#0e1636', '#18224e'], goggles=['#8a96b8', '#c8d0e8', '#f0f4ff'], collar=['#060a1e', '#0e1636', '#18224e'],
       shoulders=['#0a1026', '#141e40', '#1e2a58'], chest=['#c8b48a', '#ece0c0', '#fff6e0'], torso=['#060a1e', '#0e1636', '#18224e'],
       arms=['#060a1e', '#0e1636', '#18224e'], gloves=['#0a1026', '#141e40', '#1e2a58'], waist=['#060a1e', '#0e1636', '#18224e'],
       legs=['#060a1e', '#0e1636', '#18224e'], boots=['#04060e', '#0a0e1e', '#121a30'], cloth=['#060a1e', '#0e1636', '#18224e'],
       pat=['house'],
       fx=dict(ring=['#3a4a7a', '#6a7aaa', '#c8d0ec'], streak=[['#3a4a7a', '#6a7aaa', '#a8b4d8'], ['#141e40', '#2a3a6a', '#4a5a8a']]),
       pal=pal('#0e1636', '#6a7aaa', '#ffb84a', '#ffb84a')),
]
BY_TAG = {s['tag']: s for s in SKINS}
assert len(SKINS) == 20 and len(BY_TAG) == 20 and not any(t.endswith('AlienX') or 'cyborg' in t for t in BY_TAG)


# ── geometry helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
def edge_in(m):
    """pixels of m with a 4-neighbour outside m"""
    p = np.pad(m, 1)
    return m & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])


def frames(A):
    for fi in range(A.n):
        yield fi, slice(fi * A.fw, (fi + 1) * A.fw)


def shave_mask(A, mode):
    """pixels REMOVED for a shaved head (alpha → 0): hair spikes outside the skull + the outline that only bordered them.
    'all' = the whole crown down to the skull; 'mohawk' = keep a narrow crest through the middle of the hair."""
    rm = np.zeros((A.H, A.W), bool); scalp = np.zeros((A.H, A.W), bool)
    yy, xx = np.mgrid[0:A.H, 0:A.fw]
    for fi, sl in frames(A):
        g = A.geos[fi]; r = A.reg[:, sl]; al = A.a[:, sl, 3] > 0
        if not g: continue
        hair = (r == R['hair']) | (r == R['temples'])
        if not hair.any(): continue
        head = (r == R['mask']) | (r == R['goggles']) | (r == R['eyes']) | (r == R['face'])
        hc = g['head']
        if A.name in UNMASKED and (r == R['face']).any():
            # bare-faced frames: the skull reaches the hairline (the topmost forehead skin), not the chin
            fy, fx_ = np.nonzero(r == R['face'])
            k = np.argmin(fy); rs = float(np.hypot(fx_[k] - hc[0], fy[k] - hc[1])) + 1.5
        elif ((r == R['mask']) | (r == R['goggles'])).any():
            hy, hxs = np.nonzero((r == R['mask']) | (r == R['goggles']))
            dd = np.hypot(hxs - hc[0], hy - hc[1]); dd = dd[dd <= 12]          # the cowl around the lenses (never a stray fist)
            rs = (float(np.percentile(dd, 95)) if len(dd) else 6.0) + 0.5   # the skull: as far out as the cowl reaches
        else:
            rs = 7.0
        d = np.hypot(xx - hc[0], yy - hc[1])
        out = hair & (d > rs)
        if mode == 'mohawk':
            hp = A.perp[:, sl]; c = float(np.median(hp[hair]))
            crest = np.abs(hp - c) <= 1.6
            out &= ~crest
        if not out.any(): continue
        outline = al & (r == 0) & (A.a[:, sl, :3] == 0).all(-1)
        above = A.proj[:, sl] < g['chestTop']
        cand = out | (outline & (d > rs - 0.5) & above)
        # an outline pixel survives if it still borders a kept non-outline body pixel
        keep_body = al & ~cand & ~outline
        ob = outline & cand & ndimage.binary_dilation(keep_body, structure=np.ones((3, 3)))
        cand &= ~ob
        # then any kept outline fragment left floating (no kept body pixel next to it) goes too
        kept_ol = outline & ~cand
        lab, k = ndimage.label(kept_ol, structure=np.ones((3, 3)))
        nb = ndimage.binary_dilation(keep_body, structure=np.ones((3, 3)))
        for i in range(1, k + 1):
            m = lab == i
            if not (m & nb).any() and (m & ndimage.binary_dilation(cand, structure=np.ones((3, 3)))).any(): cand |= m
        rm[:, sl] = cand
        scalp[:, sl] = hair & ~cand
    return rm, scalp


def reoutline(out, alpha_after, region_mask):
    """kept hair pixels that now face empty space become the outline black (colour only, inside the silhouette)"""
    al = alpha_after > 0
    p = np.pad(al, 1)
    open4 = ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    m = region_mask & al & open4
    out[m, :3] = 0
    return m


# ── the recolour ─────────────────────────────────────────────────────────────────────────────────────────────────────
def paint(out, m, stops, tone):
    if m.any() and stops is not None: out[m, :3] = ramp(stops, tone[m])


def recolor_strip(name, fw, n, sk, phase=0, head_only=False):
    A = analysis(name, fw, n, head_only)
    a, reg, tone = A.a, A.reg, A.tone
    if head_only: return portrait(A, sk), np.zeros_like(reg, bool)
    out = a.astype(np.float32).copy()
    if sk.get('half'): return alien_half(A, sk), np.zeros_like(reg, bool)
    unmasked = name in UNMASKED
    for rn in M.REGIONS[1:]:
        m = reg == R[rn]
        if rn in ('mask', 'goggles', 'face', 'eyes'): continue
        if rn == 'streaks':
            if name not in UNMASKED: paint(out, m, sk.get('streaks'), tone)
            continue
        paint(out, m, sk.get(rn), tone)
    face = sk.get('face', 'mask')
    # head
    if unmasked:   # the cowl is in his hand: it takes the costume's cloth colour
        paint(out, reg == R['mask'], sk.get('cloth') or sk.get('mask'), tone)
    elif face == 'mask':
        paint(out, reg == R['mask'], sk.get('mask'), tone); paint(out, reg == R['goggles'], sk.get('goggles'), tone)
    elif face == 'bare': bare_face(A, out, sk)
    elif face == 'cover': cover_face(A, out, sk)
    rm = np.zeros(reg.shape, bool)
    if sk.get('shave'):
        rm, scalp = shave_mask(A, sk['shave'])
        if sk['shave'] == 'mohawk':
            crestm = scalp & (reg == R['hair']) & ~(reg == R['temples'])
            hp = A.perp
            side = scalp & ~crestm
            paint(out, side | (reg == R['temples']), sk['temples'], np.full(reg.shape, 0.55, np.float32))
            for fi, sl in frames(A):   # the crest: dark, a navy ridge highlight along its top edge (visible on dark stages)
                c = crestm[:, sl]
                if not c.any(): continue
                ys, xs = np.nonzero(c)
                top = np.zeros_like(c)
                for x in np.unique(xs): top[ys[xs == x].min(), x] = True
                o = out[:, sl]; o[top, :3] = ramp(sk['ridge'], tone[:, sl][top] * 0.5 + 0.5)
        else:
            paint(out, scalp, sk['hair'], tone * 0.5 + 0.45)
        out[rm, 3] = 0; out[rm, :3] = 0
        reoutline(out, out[..., 3], scalp & ~rm)
    for p in sk.get('pat', []): PATTERNS[p](A, out, sk, phase)
    out = np.clip(np.round(out), 0, 255).astype(np.uint8)
    out[reg == R['protected']] = np.where(rm[reg == R['protected']][:, None], out[reg == R['protected']], a[reg == R['protected']])
    return out, rm


def bare_face(A, out, sk):
    """cowl → his skin (shaded by the cowl's own tones), lenses → skin with a dark eye and a brow above it"""
    reg, tone = A.reg, A.tone
    paint(out, reg == R['mask'], SKIN, tone * 0.75 + 0.2)
    g = reg == R['goggles']
    paint(out, g, SKIN, np.full(reg.shape, 0.78, np.float32))
    for fi, sl in frames(A):
        gm = g[:, sl]
        if not gm.any(): continue
        lab, k = ndimage.label(gm, structure=np.ones((3, 3)))
        o = out[:, sl]; r = reg[:, sl]
        for i in range(1, k + 1):
            ys, xs = np.nonzero(lab == i)
            ey, ex = int(round(ys.mean())), int(round(xs.max() if len(xs) > 1 else xs[0]))   # the eye sits toward his front
            ex = int(round(xs.mean() + 0.5 * (xs.max() - xs.mean())))
            if r[ey, ex] in (R['goggles'], R['mask']): o[ey, ex, :3] = hx('#2a1a18')
            for x in np.unique(xs):                      # brow: the cowl / skin pixel right above the lens
                y = ys[xs == x].min() - 1
                if y >= 0 and r[y, x] in (R['mask'], R['goggles']): o[y, x, :3] = hx(BROW)


def cover_face(A, out, sk):
    reg, tone = A.reg, A.tone
    fab = sk['mask']
    m = (reg == R['mask']) | (reg == R['face'])
    paint(out, m, fab, tone * 0.8)
    # slate highlight on the nose bridge = the brightest cowl tones; a quiet rim on the jaw
    hi = (reg == R['mask']) & (tone >= 0.85)
    out[hi, :3] = hx('#4e586c')
    jaw = (reg == R['face']) & edge_in(reg == R['face']) & (A.proj > 0)
    out[jaw, :3] = hx('#262c3a')
    paint(out, reg == R['goggles'], ['#9aa4b8', '#d8deea', '#f4f6fa'], tone)


# ── patterns (body-local) ────────────────────────────────────────────────────────────────────────────────────────────
def p_insignia(A, out, sk, phase):
    """the small Viltrumite insignia (Omni-Man's emblem colours) high on the chest: a 3×3 mark, body-local"""
    reg = A.reg
    shape = {(0, -1), (0, 1), (1, -1), (1, 0), (1, 1), (2, 0)}
    for fi, sl in frames(A):
        g = A.geos[fi]
        if not g or A.name in UNMASKED and False: continue
        ch = reg[:, sl] == R['chest']
        if ch.sum() < 10: continue
        pr = A.proj[:, sl]; pp = A.perp[:, sl]
        p0 = float(np.percentile(pr[ch], 15)) + 0.5; q0 = float(np.median(pp[ch]))
        a_ = np.round(pr - p0).astype(int); b_ = np.round(pp - q0).astype(int)
        hit = np.zeros_like(ch)
        for (da, db) in shape: hit |= (a_ == da) & (b_ == db)
        hit &= ch
        if hit.sum() < 4: continue
        o = out[:, sl]; o[hit, :3] = ramp(sk['insignia'], A.tone[:, sl][hit])


def p_arm_line(A, out, sk, phase):
    """one long line along the OUTSIDE of each sleeve: the top edge when the arm runs flat (shoulder → wrist in the
    flying punch), the outer edge when it hangs"""
    reg = A.reg
    for fi, sl in frames(A):
        r = reg[:, sl]; arm = r == R['arms']
        if not arm.any(): continue
        lab, k = ndimage.label(arm, structure=np.ones((3, 3)))
        o = out[:, sl]; pp = A.perp[:, sl]
        for i in range(1, k + 1):
            m = lab == i; ys, xs = np.nonzero(m)
            if len(ys) < 3: continue
            line = np.zeros_like(m)
            if xs.max() - xs.min() >= ys.max() - ys.min():          # flat: the top edge, column by column
                for x in np.unique(xs): line[ys[xs == x].min(), x] = True
            else:                                                    # hanging: the edge away from his body
                out_side = 1 if pp[m].mean() >= 0 else -1
                for y in np.unique(ys):
                    row = xs[ys == y]
                    vals = pp[y, row] * out_side
                    line[y, row[int(np.argmax(vals))]] = True
            o[line, :3] = ramp(sk['line'], A.tone[:, sl][line] * 0.4 + 0.6)


def p_jaw(A, out, sk, phase):
    """throat and jaw read apart: the lowest skin pixel of each face column is shaded (bare faces)"""
    if A.name in UNMASKED: return
    reg = A.reg
    for fi, sl in frames(A):
        r = reg[:, sl]; f = r == R['face']
        if not f.any(): continue
        g = A.geos[fi]
        if not g or A.hor[0, fi * A.fw]: continue
        ys, xs = np.nonzero(f); o = out[:, sl]
        for x in np.unique(xs):
            y = ys[xs == x].max()
            if y + 1 < r.shape[0] and r[y + 1, x] != R['face']: o[y, x, :3] = hx(SKIN[1])


def mouth_row(A, fi, sl):
    """the upper lip: the first row of the sheet's own face skin below the cowl (the cowl stops at the upper lip)"""
    r = A.reg[:, sl]; f = r == R['face']
    if not f.any(): return None
    g = A.geos[fi]; lab, k = ndimage.label(f, structure=np.ones((3, 3)))
    best, bd = 0, 1e9
    for i in range(1, k + 1):                     # the jaw patch right under the cowl, never a bare fist
        yy_, xx_ = np.nonzero(lab == i)
        dd = float(np.hypot(xx_.mean() - g['head'][0], yy_.mean() - g['head'][1])) - 0.2 * len(yy_)
        if len(yy_) >= 3 and dd < bd: best, bd = i, dd
    if not best: return None
    f = lab == best
    ys, xs = np.nonzero(f)
    y0 = ys.min()
    return y0, xs[ys == y0], xs[ys == min(y0 + 1, ys.max())]


def p_moustache(A, out, sk, phase):
    """a short dark stroke under the nose with a warm skin pixel below it so the mouth reads; shorter in profile"""
    reg = A.reg
    for fi, sl in frames(A):
        g = A.geos[fi]
        if not g: continue
        r = reg[:, sl]; o = out[:, sl]
        if A.name in UNMASKED:   # bare-faced frames: right under the nose = 2 rows below the eyes
            e = r == R['eyes']
            if not e.any(): continue
            ys, xs = np.nonzero(e); y = int(ys.max()) + 3; x0, x1 = int(xs.min()), int(xs.max()) + 1
            for x in range(x0, x1 + 1):
                if 0 <= y < r.shape[0] and r[y, x] == R['face']: o[y, x, :3] = hx('#1a1214')
            continue
        mr = mouth_row(A, fi, sl)
        if mr is None: continue
        y0, row0, row1 = mr
        prof = A.hor[0, fi * A.fw] or len(row1) <= 3
        xs = sorted(row1)
        w = 2 if prof else 3
        front = xs[-w - 1:-1] if len(xs) > w + 1 else xs[:w]
        y = min(y0 + 1, r.shape[0] - 1)
        for x in front:
            if r[y, x] == R['face']: o[y, x, :3] = hx('#1a1214')
            if y + 1 < r.shape[0] and r[y + 1, x] == R['face']: o[y + 1, x, :3] = hx(SKIN[3])


def p_flat(A, out, sk, phase):
    """worn prison cloth: broad flat shadows (two tones per region, no ramp), chalky"""
    reg, tone = A.reg, A.tone
    for rn in ('collar', 'shoulders', 'chest', 'torso', 'arms', 'legs', 'cloth'):
        m = reg == R[rn]
        if m.any(): out[m, :3] = np.where((tone[m] < 0.45)[:, None], hx('#a29d90'), hx('#d6d1c4'))


def p_seams(A, out, sk, phase):
    """grey seams where cloth pieces meet (shoulder / torso / sleeve / waist)"""
    reg = A.reg
    cloth = np.isin(reg, [R['collar'], R['shoulders'], R['chest'], R['torso'], R['arms'], R['legs']])
    seam = np.zeros_like(cloth)
    for a_, b_ in (('torso', 'arms'), ('chest', 'torso'), ('shoulders', 'arms'), ('torso', 'waist'), ('chest', 'shoulders')):
        seam |= (reg == R[a_]) & ndimage.binary_dilation(reg == R[b_])
    out[seam & cloth, :3] = hx('#7e7a72')


def p_hems(A, out, sk, phase):
    """dirty hems: the trouser cuffs above the boots and the sleeve cuffs above the hands"""
    reg = A.reg
    near_boot = ndimage.binary_dilation(reg == R['boots'], iterations=1) & (reg == R['legs'])
    near_hand = ndimage.binary_dilation(reg == R['gloves'], iterations=1) & (reg == R['arms'])
    out[near_boot | near_hand, :3] = ramp(['#7a705e', '#9a8f7a', '#b4aa94'], A.tone[near_boot | near_hand])


def p_scar(A, out, sk, phase):
    """a scar across the cheek: two darker-red skin pixels slanting from under the eye toward the jaw"""
    reg = A.reg
    for fi, sl in frames(A):
        r = reg[:, sl]; o = out[:, sl]
        eye = (r == R['goggles']) | (r == R['eyes'])
        if not eye.any(): continue
        ys, xs = np.nonzero(eye); y = int(ys.max()) + 1; x = int(xs.min())
        for k in range(3):
            yy, xx = y + k, x - 1 + k
            if 0 <= yy < r.shape[0] and 0 <= xx < r.shape[1] and r[yy, xx] in (R['mask'], R['face']): o[yy, xx, :3] = hx('#8a3a30')


def p_cape(A, out, sk, phase):
    """Sinister Mark's cape, painted INSIDE his silhouette (the sheet has none). Upright: a folded black wedge with a gold
    lining edge over the BACK arm / back of the torso, shoulder → hip. Flat (flight): a long gold band with a black
    upper edge along his back and back arm, shoulder → wrist; it stops short of the glove so the fist stays clear."""
    reg = A.reg
    for fi, sl in frames(A):
        g = A.geos[fi]
        if not g: continue
        r = reg[:, sl]; o = out[:, sl]; pr = A.proj[:, sl]; pp = A.perp[:, sl]
        body = np.isin(r, [R['torso'], R['arms'], R['shoulders'], R['waist'], R['legs'], R['chest']])
        glove_near = ndimage.binary_dilation(r == R['gloves'], iterations=2)
        if A.hor[0, fi * A.fw]:
            # flat: column by column along his back (the top edge of the body), shoulder back to the knees
            ys, xs = np.nonzero(body & ~glove_near & (pr >= g['chestTop'] - 1))
            for x in np.unique(xs):
                col = np.sort(ys[xs == x])
                y0 = col[0]
                o[y0, x, :3] = hx('#050508')                                   # the black upper edge
                for y in col[1:3]: o[y, x, :3] = ramp(sk['capeGold'], np.array([0.75]))[0]
        else:
            # upright: the wedge = back-side pixels, widening from the shoulder down to the hip
            v = (pr - g['chestTop']) / max(3.0, g['hip'] - g['chestTop'])
            back = pp - float(np.median(pp[r == R['chest']])) if (r == R['chest']).any() else pp
            wedge = body & ~glove_near & (v >= -0.1) & (v <= 1.15) & (back >= 3.0 - 2.2 * np.clip(v, 0, 1))
            if wedge.sum() < 4: continue
            # the folded cape: deep gold cloth, a bright gold lining along its inner fold, a black edge along the top
            o[wedge, :3] = ramp(['#3a2a06', '#7a5a10', '#a8801c'], A.tone[:, sl][wedge])
            lining = wedge & ndimage.binary_dilation(body & ~wedge, structure=np.ones((3, 3)))
            o[lining, :3] = ramp(sk['capeGold'], A.tone[:, sl][lining] * 0.4 + 0.6)
            top = wedge & (v < 0.12)
            o[top, :3] = hx('#050508')


def p_cover(A, out, sk, phase): pass


def p_sash(A, out, sk, phase):
    """one wide raspberry sash from the shoulder to the opposite hip (body-local diagonal across chest + torso)"""
    reg = A.reg
    m = np.isin(reg, [R['chest'], R['torso'], R['collar'], R['shoulders']])
    d = (A.U * 0.5 + 0.5) - np.clip(A.V, -0.3, 1.4) * 0.75 - 0.05
    s = m & (np.abs(d) < 0.16) & (A.V > -0.4) & (A.V < 1.3)
    out[s, :3] = ramp(sk['sash'], A.tone[s])
    A._sash = s


def p_clasp(A, out, sk, phase):
    """pink-diamond glitter ONLY on the sash clasp (where the sash crosses the shoulder) and one cuff (the front glove's
    wrist); the glint moves with the sim-clock phase"""
    reg = A.reg
    s = getattr(A, '_sash', np.zeros(reg.shape, bool))
    for fi, sl in frames(A):
        ss = s[:, sl]; o = out[:, sl]
        if ss.any():
            ys, xs = np.nonzero(ss); k = int(np.argmin(A.V[:, sl][ss]))
            cy, cx = ys[k], xs[k]
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    y, x = cy + dy, cx + dx
                    if 0 <= y < ss.shape[0] and 0 <= x < ss.shape[1] and ss[y, x]:
                        o[y, x, :3] = hx('#ffd6e6') if (abs(dy) + abs(dx) + phase) % 3 == 0 else hx('#ff8ab8')
        gl = (reg[:, sl] == R['gloves']) & A.front[:, sl]
        cuff = gl & ndimage.binary_dilation(reg[:, sl] == R['arms'], structure=np.ones((3, 3)))
        if cuff.any():
            ys, xs = np.nonzero(cuff)
            for j, (y, x) in enumerate(zip(ys, xs)):
                o[y, x, :3] = hx('#ffffff') if (j + phase) % 3 == 0 else (hx('#ff9ac4') if (j + phase) % 3 == 1 else hx('#ffd6e6'))


def p_repair(A, out, sk, phase):
    """one torn sleeve repaired with his old suit from the elbow down: the FRONT arm's forearm in the old blue with a
    yellow stitch line at the elbow, and its fist in the old yellow (the leading fist shows Earth's colours first)"""
    reg, a = A.reg, A.a
    fg = (reg == R['gloves']) & A.front
    out[fg, :3] = a[fg, :3]
    for fi, sl in frames(A):
        r = reg[:, sl]; arm = (r == R['arms']) & A.front[:, sl]; glove = (r == R['gloves']) & A.front[:, sl]
        if not arm.any() or not glove.any(): continue
        dg = ndimage.distance_transform_edt(~glove)
        lab, k = ndimage.label(arm, structure=np.ones((3, 3))); o = out[:, sl]
        for i in range(1, k + 1):
            m = lab == i; d = dg[m]
            if d.min() > 2: continue
            cut = max(2.0, 0.5 * float(d.max()))
            fore = m & (dg <= cut); seam = m & (np.abs(dg - cut - 0.5) <= 0.6)
            o[fore, :3] = ramp(['#094464', '#0f77af', '#1bb2e1'], A.tone[:, sl][fore])
            o[seam, :3] = hx('#f4d857')


def p_planet(A, out, sk, phase):
    """one large ringed planet on the navy torso: a peach disk on the BACK side of the ribs, a pale turquoise ring tilted
    across the sternum. Body-local, so the guarding forearm (drawn over the chest) eclipses it and the punch reveals it"""
    reg = A.reg
    m = np.isin(reg, [R['chest'], R['torso']])
    u, v = A.U, A.V
    disk = m & ((u - 0.4) ** 2 + ((v - 0.5) * 0.9) ** 2 < 0.5 ** 2)
    t = np.clip(0.3 + (0.4 - u[disk]) * 0.5 + A.tone[disk] * 0.35, 0, 1)
    band = (np.floor((v[disk] - 0.5) * 9).astype(int) % 2 == 0)           # gas-giant bands so it never reads as skin
    out[disk, :3] = np.where(band[:, None], ramp(['#a8482a', '#e47a4a', '#ffb07a'], t), ramp(['#c86a40', '#f4a070', '#ffd0a8'], t))
    term = disk & (u > 0.7)                                                  # the night side
    out[term, :3] = hx('#5a2a24')
    ringd = np.abs((v - 0.5) - (u - 0.4) * -0.45)
    ring = m & (ringd < 0.1) & (np.abs(u - 0.4) < 1.1) & ~(disk & ((v - 0.5) < (u - 0.4) * -0.45))
    out[ring, :3] = ramp(['#4aa8a0', '#a8ece4', '#e0fffa'], A.tone[ring] * 0.5 + 0.5)


def p_glass(A, out, sk, phase):
    """telescope-glass lenses: dark, with one cold glint pixel"""
    reg = A.reg
    for fi, sl in frames(A):
        g = reg[:, sl] == R['goggles']
        if not g.any(): continue
        ys, xs = np.nonzero(g); k = int(np.argmin(ys * 100 - xs))
        out[:, sl][ys[k], xs[k], :3] = hx('#bfe0ff')


def p_facets(A, out, sk, phase):
    """three large sequin facets across the upper chest (body-local, so they follow the torso twist). Each phase a
    different facet catches silver; in the punching frames the FRONT facet catches it while the next falls dark."""
    reg = A.reg
    m = np.isin(reg, [R['chest'], R['torso'], R['collar']]) & (A.V > -0.3) & (A.V < 0.6)
    w = -np.clip(A.U, -1.4, 1.4) + 0.9 * np.clip(A.V, -0.3, 0.6)          # slanted planes, like cut stone
    k = np.clip(((w + 1.1) / 2.9 * 3).astype(int), 0, 2)      # 0 = back facet … 2 = front facet
    k = 2 - k
    punch = A.name in ('straight', 'jab', 'barrage', 'fpunch', 'ipunch')
    base = [['#2e3440', '#475060', '#66707f'], ['#121418', '#1e2227', '#2c3038'], ['#20262e', '#353d49', '#4e5866']]
    for j in range(3):
        mm = m & (k == j)
        if not mm.any(): continue
        lit = (j == phase) if not punch else None
        cols = ramp(base[j], A.tone[mm] * 0.6 + (A.V[mm] < 0.15) * 0.4)
        if punch:
            per = A.fi[mm] % 2 == 0
            lit_m = per if j == 0 else (~per if j == 1 else np.zeros_like(per))
            cols[lit_m] = ramp(['#7a828e', '#b8c0ca', '#eef2f6'], A.tone[mm][lit_m] * 0.5 + 0.5)
            dark_m = (~per if j == 0 else per) if j < 2 else np.zeros_like(per)
            cols[dark_m] = hx('#0a0b0e')
        elif lit:
            cols = ramp(['#6a727e', '#a8b0ba', '#dde3ea'], A.tone[mm] * 0.5 + 0.4)
        out[mm, :3] = cols
    # facet edges: a thin graphite line between facets keeps the "cut crystal" read with the glints paused
    kk = np.where(m, k, -1)
    edge = m & ((np.roll(kk, 1, 1) != kk) | (np.roll(kk, 1, 0) != kk)) & (np.roll(m, 1, 1) & np.roll(m, 1, 0))
    out[edge, :3] = hx('#5a626e')


def p_skate(A, out, sk, phase):
    """boots wrapped in chunky pink-and-silver glitter (2×2 sequins, phase-shifted) — the whole rising-kick arc"""
    reg = A.reg
    b = reg == R['boots']
    ys, xs = np.nonzero(b)
    v = h3(A.lx[ys, xs] // 2, ys // 2, phase, 91)
    cols = ramp(sk['boots'], A.tone[ys, xs])
    cols[v > 0.62] = hx('#d8dce4'); cols[v > 0.86] = hx('#ffffff')
    out[ys, xs, :3] = cols


def p_wings(A, out, sk, phase):
    """three swept red wing markings around the FORWARD gauntlet: stripes on the front forearm at 1, 3 and 5 px from the
    glove (only the nearest shows when the arm folds into guard; all three when it is straight out)"""
    reg = A.reg
    for fi, sl in frames(A):
        r = reg[:, sl]; arm = (r == R['arms']) & A.front[:, sl]; glove = (r == R['gloves']) & A.front[:, sl]
        if not arm.any() or not glove.any(): continue
        dg = ndimage.distance_transform_edt(~glove); o = out[:, sl]
        for c0 in (1.0, 3.2, 5.4):
            s = arm & (np.abs(dg - c0) <= 0.7) & ((A.lx[:, sl] + np.arange(r.shape[0])[:, None]) % 3 != 0)
            o[s, :3] = ramp(sk['wing'], A.tone[:, sl][s] * 0.5 + 0.5)


def p_knuckles(A, out, sk, phase):
    """bare-looking knuckles: the glove's leading edge one shade darker (the knuckle ridge)"""
    reg = A.reg
    gl = reg == R['gloves']; ridge = edge_in(gl) & (A.perp < 0)
    out[ridge, :3] = hx(SKIN[2])


def p_bands(A, out, sk, phase):
    """two broad reflective bands on the FRONT forearm"""
    reg = A.reg
    for fi, sl in frames(A):
        r = reg[:, sl]; arm = (r == R['arms']) & A.front[:, sl]; glove = r == R['gloves']
        if not arm.any(): continue
        dg = ndimage.distance_transform_edt(~glove); o = out[:, sl]
        for c0 in (1.5, 4.0):
            s = arm & (np.abs(dg - c0) <= 0.8)
            o[s, :3] = ramp(sk['band'], A.tone[:, sl][s] * 0.4 + 0.6)


def p_patch(A, out, sk, phase):
    """a rectangular dispatch patch on the chest: cream with an orange top line (body-local)"""
    reg = A.reg
    m = reg == R['chest']
    box = m & (A.U > -0.9) & (A.U < -0.05) & (A.V > 0.1) & (A.V < 0.5)
    out[box, :3] = hx('#efe2c2')
    top = box & (A.V < 0.2)
    out[top, :3] = hx('#f08020')


def p_jacket_stripe(A, out, sk, phase):
    """the jacket's reflective stripe along his side: in flight it lines up with the forearm bands like an arrow"""
    reg = A.reg
    m = np.isin(reg, [R['torso'], R['chest']]) & (np.abs(A.U - 0.55) < 0.14) & (A.V > 0.2) & (A.V < 1.2)
    out[m, :3] = ramp(sk['band'], A.tone[m] * 0.4 + 0.6)


def p_print(A, out, sk, phase):
    """warm paper-white suit with ONE flat navy shadow tone (a two-colour print)"""
    reg, tone = A.reg, A.tone
    rs = [R[k] for k in ('collar', 'shoulders', 'chest', 'torso', 'arms', 'gloves', 'waist', 'legs', 'boots', 'mask', 'cloth')]
    m = np.isin(reg, rs)
    if A.name not in UNMASKED and sk.get('face') == 'bare': m &= reg != R['mask']
    shadow = tone < 0.42
    out[m & shadow, :3] = hx(sk['ink']); out[m & ~shadow, :3] = hx(sk['paper'][1])
    out[m & ~shadow & (tone < 0.7), :3] = hx(sk['paper'][0])


def p_offsets(A, out, sk, phase):
    """registration error: a cyan pass offset INSIDE the back shoulder, a magenta pass inside the opposite (front) glove"""
    reg = A.reg
    sh = (reg == R['shoulders']) | (reg == R['collar'])
    sh_back = sh & (A.perp > 0)
    cyan = sh_back & ~np.roll(sh_back, -1, 1)          # its right-hand edge, one pixel in
    cyan |= sh_back & ~np.roll(sh_back, 1, 0)
    out[cyan, :3] = hx('#00a8d8')
    gl = (reg == R['gloves']) & A.front
    mag = gl & ~np.roll(gl, 1, 1)
    mag |= gl & ~np.roll(gl, -1, 0)
    out[mag, :3] = hx('#e8308a')


def p_inked(A, out, sk, phase):
    """a sharply inked face: the face / cowl's darkest tone becomes the print navy"""
    reg = A.reg
    f = np.isin(reg, [R['face'], R['mask']]) & (A.tone < 0.4)
    out[f, :3] = hx(sk['ink'])


def p_lenses(A, out, sk, phase):
    """two oversized amber lenses: the lens grows one pixel into the cowl around it"""
    reg = A.reg
    g = reg == R['goggles']
    grow = ndimage.binary_dilation(g, structure=np.ones((3, 3))) & (reg == R['mask'])
    out[grow, :3] = ramp(['#6a3404', '#b86a0a', '#e08a10'], A.tone[grow] * 0.5 + 0.3)
    rim = ndimage.binary_dilation(g | grow, structure=np.ones((3, 3))) & (reg == R['mask']) & ~grow
    out[rim, :3] = hx('#b8862a')


def p_light_band(A, out, sk, phase):
    """a band of pale underwater light across the ribs (body-local), rippled"""
    reg = A.reg
    m = np.isin(reg, [R['chest'], R['torso'], R['arms']])
    w = 0.12 + 0.05 * np.sin(A.U * 6.0)
    s = m & (np.abs(A.V - 0.55) < w)
    out[s, :3] = ramp(['#3a7a78', '#8ad0c4', '#d0fff0'], A.tone[s] * 0.5 + 0.4)


def p_copper_toes(A, out, sk, phase):
    """heavy copper toes: the boot pixels furthest from his hips"""
    reg = A.reg
    for fi, sl in frames(A):
        g = A.geos[fi]
        b = reg[:, sl] == R['boots']
        if not g or not b.any(): continue
        lab, k = ndimage.label(b, structure=np.ones((3, 3))); o = out[:, sl]; pr = A.proj[:, sl]
        for i in range(1, k + 1):
            m = lab == i
            toe = m & (pr >= np.percentile(pr[m], 65))
            o[toe, :3] = ramp(['#6a2a0a', '#b8602a', '#f0a060'], A.tone[:, sl][toe])


def p_house(A, out, sk, phase):
    """on the warm cream chest panel: a dark house roofline and ONE amber upstairs window (body-local). The guard's
    forearm covers it; the win pose shows it."""
    reg = A.reg
    m = reg == R['chest']
    u, v = A.U, A.V
    roof = m & (np.abs(v - (0.22 + np.abs(u + 0.1) * 0.55)) < 0.07) & (np.abs(u + 0.1) < 0.75)
    out[roof, :3] = hx('#0e1636')
    house = m & (v > 0.22 + np.abs(u + 0.1) * 0.55 + 0.07) & (np.abs(u + 0.1) < 0.55) & (v < 1.0)
    out[house, :3] = ramp(['#a8946a', '#d2bc8e', '#e6d2a6'], A.tone[house])     # the house wall: a shade under the cream sky
    for fi, sl in frames(A):
        hm = house[:, sl]
        if hm.sum() < 3: continue
        ys, xs = np.nonzero(hm); k = int(np.argmin(np.abs(v[:, sl][hm] - 0.5) + np.abs(u[:, sl][hm] + 0.1) * 0.6))
        o = out[:, sl]; wy, wx = ys[k], xs[k]
        for dx in (-1, 1):                                                      # a dark window frame either side
            if 0 <= wx + dx < hm.shape[1] and hm[wy, wx + dx]: o[wy, wx + dx, :3] = hx('#1a2240')
        o[wy, wx, :3] = hx('#ffa21a')


PATTERNS = dict(insignia=p_insignia, arm_line=p_arm_line, jaw=p_jaw, moustache=p_moustache, flat=p_flat, seams=p_seams,
                hems=p_hems, scar=p_scar, cape=p_cape, cover=p_cover, sash=p_sash, clasp=p_clasp, repair=p_repair,
                planet=p_planet, glass=p_glass, facets=p_facets, skate=p_skate, wings=p_wings, knuckles=p_knuckles,
                bands=p_bands, patch=p_patch, jacket_stripe=p_jacket_stripe, print=p_print, offsets=p_offsets,
                inked=p_inked, lenses=p_lenses, light_band=p_light_band, copper_toes=p_copper_toes, house=p_house)


# ── ALIEN X — TWO EARTHS: anatomical RIGHT half = the original suit (byte-identical); LEFT half = deep indigo space,
# one jade lens, a small ivory constellation cheek → collarbone. Split along each frame's BODY AXIS (never a straight
# screen cut); every limb piece goes whole to the side its centre is on, so the ordinary fist stays ordinary.
def alien_side(A):
    """True = the alien (anatomical LEFT) side. Mark is drawn facing screen-right, so his left side is the FRONT side
    (perp < 0) — mirrored with the sprite."""
    side = (A.perp < 0) & (A.reg > 0)
    limb = np.isin(A.reg, [R['gloves'], R['arms'], R['boots'], R['legs']])
    side[limb] = A.front[limb]
    return side


def alien_half(A, sk):
    a, reg, tone = A.a, A.reg, A.tone
    out = a.copy()
    side = alien_side(A) & (reg != R['streaks'])
    m = side & ~np.isin(reg, [R['goggles'], R['eyes'], R['hair']])
    out[m, :3] = np.round(ramp(OMV_ALIENX['indigo'], tone[m])).astype(np.uint8)
    hm = side & (reg == R['hair'])
    out[hm, :3] = np.round(ramp(['#02020a', '#080a1e', '#121638'], tone[hm])).astype(np.uint8)
    lm = side & np.isin(reg, [R['goggles'], R['eyes']])
    out[lm, :3] = np.round(ramp(OMV_ALIENX['jade'], tone[lm])).astype(np.uint8)
    # the constellation: 3 ivory stars from the cheek down to the collarbone, joined by nothing (stars only)
    for fi, sl in frames(A):
        g = A.geos[fi]
        if not g: continue
        s = side[:, sl]; r = reg[:, sl]; o = out[:, sl]; pr = A.proj[:, sl]; pp = A.perp[:, sl]
        targets = [((r == R['mask']) | (r == R['face'])) & s, (r == R['face']) & s | ((r == R['mask']) & s & (pr > 1)),
                   ((r == R['collar']) | (r == R['shoulders']) | (r == R['chest'])) & s]
        for j, t in enumerate(targets):
            if not t.any(): continue
            ys, xs = np.nonzero(t)
            k = int(np.argmin(np.abs(pr[t] - (1 + j * 3.5)) + 0.3 * np.abs(pp[t] + 2)))
            o[ys[k], xs[k], :3] = hx(OMV_ALIENX['star']).astype(np.uint8)
    return out


# ── the portrait (128 × 112 face close-up, 2× pixel-doubled) ────────────────────────────────────────────────────────
def lens_boxes(reg):
    lab, k = ndimage.label(reg == R['goggles'])
    out = []
    for i in range(1, k + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) > 40: out.append((xs.min(), ys.min(), xs.max(), ys.max(), lab == i))
    return sorted(out, key=lambda b: b[0])


def portrait(A, sk):
    a, reg, tone = A.a, A.reg, A.tone
    out = a.astype(np.float32).copy()
    H, W = reg.shape
    yy, xx = np.mgrid[0:H, 0:W]
    face = sk.get('face', 'mask')
    lenses = lens_boxes(reg)
    if sk.get('half'):
        cx = (lenses[0][2] + lenses[1][0]) / 2 if len(lenses) == 2 else W / 2
        # the bridge of the nose, slanting with his 3/4 turn: the split follows the face's centre line, not a screen column
        line = cx + (yy - 46) * 0.12
        side = (xx > line) & (reg > 0)            # the face's left = screen-right (he faces right)
        m = side & ~np.isin(reg, [R['goggles']])
        out[m, :3] = ramp(OMV_ALIENX['indigo'], tone[m])
        hm = side & (reg == R['hair']); out[hm, :3] = ramp(['#02020a', '#080a1e', '#121638'], tone[hm])
        lm = side & (reg == R['goggles']); out[lm, :3] = ramp(OMV_ALIENX['jade'], tone[lm])
        for (sx, sy) in ((96, 66), (90, 84), (98, 104)):    # constellation cheek → jaw → collarbone
            out[sy:sy + 2, sx:sx + 2, :3] = hx(OMV_ALIENX['star'])
            out[sy - 2:sy, sx:sx + 2, :3] = np.where(side[sy - 2:sy, sx:sx + 2, None], hx('#b8b0a0') * 0.6, out[sy - 2:sy, sx:sx + 2, :3])
        return np.clip(np.round(out), 0, 255).astype(np.uint8)
    hair = reg == R['hair']
    if sk.get('shave') == 'all':
        out[hair, :3] = ramp(SCALP, tone[hair] * 0.6 + 0.3)
    elif sk.get('shave') == 'mohawk':
        crest = hair & (np.abs(xx - 70) <= 12)
        out[hair & ~crest, :3] = ramp(SCALP, np.full((hair & ~crest).sum(), 0.55))
        out[crest, :3] = ramp(sk['hair'], tone[crest])
        top = crest & (yy <= 4); out[top, :3] = ramp(sk['ridge'], np.full(top.sum(), 0.7))
    elif sk.get('hair'):
        out[hair, :3] = ramp(sk['hair'], tone[hair])
    msk = reg == R['mask']; gg = reg == R['goggles']; fc = reg == R['face']
    if face == 'mask':
        if sk.get('mask'): out[msk, :3] = ramp(sk['mask'], tone[msk])
        if sk.get('goggles'): out[gg, :3] = ramp(sk['goggles'], tone[gg])
    elif face == 'cover':
        out[msk | fc, :3] = ramp(sk['mask'], tone[msk | fc] * 0.8)
        bridge = (msk | fc) & (np.abs(xx - 68) <= 2) & (yy >= 40) & (yy <= 70)
        out[bridge, :3] = hx('#4e586c')
        jaw = (msk | fc) & (yy >= 96) & (yy <= 99)
        out[jaw, :3] = hx('#262c3a')
        out[gg, :3] = ramp(['#9aa4b8', '#d8deea', '#f4f6fa'], tone[gg])
    else:
        out[msk, :3] = ramp(SKIN, tone[msk] * 0.75 + 0.2)
        for (x0, y0, x1, y1, lm) in lenses:
            out[lm, :3] = hx(SKIN[3])
            cxl, cyl = (x0 + x1) / 2, (y0 + y1) / 2 + 2
            ew, eh = (x1 - x0) * 0.36, (y1 - y0) * 0.24
            eye = lm & (((xx - cxl) / ew) ** 2 + ((yy - cyl) / eh) ** 2 <= 1)
            out[eye, :3] = hx('#f4efe6')
            iris = eye & (np.hypot(xx - (cxl + ew * 0.25), yy - cyl) <= eh * 0.95)
            out[iris, :3] = hx(sk.get('iris', '#4a3020'))
            pupil = iris & (np.hypot(xx - (cxl + ew * 0.25), yy - cyl) <= eh * 0.45)
            out[pupil, :3] = hx('#0e0a0a')
            lid = lm & (np.abs(((xx - cxl) / ew) ** 2 + ((yy - cyl) / eh) ** 2 - 1) < 0.35) & (yy < cyl)
            out[lid, :3] = hx('#3a1e1a')
            # the eyebrow: a dark tapered band just above the lens
            t = (xx - x0) / max(1, x1 - x0)
            thick = 3 + 3 * np.sin(np.clip(t, 0, 1) * np.pi)
            brow = (xx >= x0 + 2) & (xx <= x1 - 1) & (yy >= y0 - 2 - thick) & (yy <= y0 - 1) & (reg > 0) & ~hair
            out[brow, :3] = hx(BROW) if not sk.get('hair') else ramp(sk['hair'], np.full(brow.sum(), 0.2))
    if 'moustache' in sk.get('pat', []):
        # tapered ends, black, between the nose and the upper lip
        for y in range(72, 80):
            half = 13 - abs(y - 76.5) * 2.4
            if half <= 0: continue
            for x in range(int(66 - half * 1.5), int(66 + half * 1.5) + 1):
                if reg[y, x] in (R['face'], R['mask']): out[y, x, :3] = hx('#120c0e')
    if 'scar' in sk.get('pat', []):
        for k in range(16):
            x, y = 44 + k, 58 + int(k * 1.3)
            out[y:y + 2, x:x + 2, :3] = hx('#8a3a30')
    if 'inked' in sk.get('pat', []):
        dk = (msk | fc) & (tone < 0.35); out[dk, :3] = hx(sk['ink'])
    if sk.get('goggles') and face == 'bare' and 'glass' in sk.get('pat', []):
        for (x0, y0, x1, y1, lm) in lenses:
            out[lm, :3] = ramp(sk['goggles'], tone[lm] * 0.5)
            out[y0 + 3:y0 + 7, x0 + 6:x0 + 12, :3] = np.where(lm[y0 + 3:y0 + 7, x0 + 6:x0 + 12, None], hx('#bfe0ff'), out[y0 + 3:y0 + 7, x0 + 6:x0 + 12, :3])
    if 'lenses' in sk.get('pat', []):
        for (x0, y0, x1, y1, lm) in lenses:
            grow = ndimage.binary_dilation(lm, iterations=4) & msk
            out[grow, :3] = ramp(['#6a3404', '#b86a0a', '#e08a10'], tone[grow] * 0.5 + 0.3)
    if sk.get('collar') and face == 'bare':
        # the high collar under the jaw (bottom rows inside the portrait's alpha)
        col = (yy >= 98) & (reg > 0) & ~hair
        out[col, :3] = ramp(sk['collar'], np.full(col.sum(), 0.7))
        sh = col & ((xx < 26) | (xx > 100))                                # the shoulder panels either side of the collar
        if sk.get('shoulders'): out[sh, :3] = ramp(sk['shoulders'], np.full(sh.sum(), 0.6))
        if 'sash' in sk.get('pat', []):
            ss = col & (np.abs((xx - 70) - (yy - 98) * 2.5) < 7)
            out[ss, :3] = ramp(sk['sash'], np.full(ss.sum(), 0.6))
        if sk.get('insignia') and 'insignia' in sk.get('pat', []):
            ins = (yy >= 104) & (np.abs(xx - 64) <= 3) & (reg > 0)
            out[ins, :3] = ramp(sk['insignia'], np.full(ins.sum(), 0.5))
        out[(yy >= 98) & (yy <= 99) & (reg > 0), :3] = hx('#3a3c42')
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


# ── effect sheets ────────────────────────────────────────────────────────────────────────────────────────────────────
def build_fx(sk, d):
    spec = sk.get('fx') or {}          # no spec: the effect colours stay, but the takeoff ring's body copy still wears the skin
    os.makedirs(d, exist_ok=True)
    for key in FX_KEYS:
        a = np.array(Image.open(os.path.join(SRC, 'fx', key + '.png')).convert('RGBA'))
        out = a.astype(np.float32).copy(); rgb = a[..., :3]; on = a[..., 3] > 0
        fam = {f: np.zeros(on.shape, bool) for f in M.FAM}
        for f, cs in M.FAM.items():
            for c in cs: fam[f] |= (rgb == c).all(-1)
        tone = np.zeros(on.shape, np.float32)
        for c, t in M.TONE.items(): tone[(rgb == c).all(-1)] = t
        H, W = on.shape
        n = {'takeoffRing': 1, 'vStreak': 2, 'hStreak': 2, 'sonicRing': 3, 'impact': 3, 'zipStreak': 2, 'zipRing': 3, 'ghost': 1, 'bigBurst': 4}[key]
        fw = W // n
        yy, xx = np.mgrid[0:H, 0:W]; lx = xx % fw
        wh = fam['white'] & on
        if key in ('hStreak', 'zipStreak'):
            ye, bl = fam['yel'] & on, fam['blue'] & on
            if spec.get('cmy'):
                for j, c in enumerate(['#00a8d8', '#f0d020', '#e8308a']):
                    m = (ye | bl) & ((yy + (lx // 6)) % 3 == j); out[m, :3] = hx(c)
            elif spec.get('streak3'):
                k = (yy // 2) % 3
                out[(ye | bl) & (k == 0), :3] = ramp(OMV_VALKYRIE['cobalt'], tone[(ye | bl) & (k == 0)])
                out[(ye | bl) & (k == 1), :3] = ramp(OMV_VALKYRIE['red'], tone[(ye | bl) & (k == 1)])
                out[(ye | bl) & (k == 2), :3] = ramp(OMV_VALKYRIE['gold'], tone[(ye | bl) & (k == 2)])
            elif spec.get('streak'):
                out[ye, :3] = ramp(spec['streak'][0], tone[ye]); out[bl, :3] = ramp(spec['streak'][1], tone[bl])
        elif key == 'vStreak':
            if spec.get('cmy'):
                for j, c in enumerate(['#00a8d8', '#f0d020', '#e8308a']):
                    m = wh & (((lx + yy // 8) // 2) % 3 == j); out[m, :3] = hx(c)
            elif spec.get('streak'): out[wh, :3] = ramp(spec['streak'][0], tone[wh])
        else:
            cx, cy = fw / 2, H / 2
            if key == 'takeoffRing': cy = H - 6
            dd = np.hypot((lx - cx) / (fw / 2), (yy - cy) / (H / 2))
            if spec.get('radial') and key in ('takeoffRing', 'sonicRing', 'zipRing', 'impact', 'bigBurst'):
                out[wh, :3] = ramp(['#a8ffe8', '#5ad0b8', '#1a6a6a', '#0a3a40'], np.clip(dd[wh] * 1.1, 0, 1))   # seafoam centre → dark teal edge
            elif spec.get('divergent') and key in ('impact', 'bigBurst'):
                c = ramp(['#ffffff', '#bfe8ff', '#5ab8f0'], np.clip(dd[wh] * 1.4, 0, 1))
                trail = wh & (lx < cx - fw * 0.12)                 # drawn facing right: the trailing edge is the left side
                c2 = np.where(((lx[wh] + yy[wh]) % 3 == 0)[:, None], hx('#0a0608'), hx('#b8102a'))
                c = np.where(trail[wh][:, None] & (dd[wh] > 0.35)[:, None], c2, c)
                out[wh, :3] = c
            elif spec.get('cmy') and key in ('impact', 'bigBurst', 'sonicRing', 'zipRing'):
                out[wh, :3] = hx('#f4ecd8'); edge = wh & ~np.roll(wh, 1, 1); out[edge, :3] = hx('#00a8d8')
                edge2 = wh & ~np.roll(wh, -1, 0); out[edge2, :3] = hx('#e8308a')
            elif spec.get('ring'):
                out[wh, :3] = ramp(spec['ring'], tone[wh])
        if key == 'takeoffRing':
            # this sheet carries a copy of his take-off body (pixel-identical to takeoff.png): it wears the skin's take-off frame
            src_t = np.array(Image.open(os.path.join(SRC, 'takeoff.png')).convert('RGBA'))
            sk_t = np.array(Image.open(os.path.join(OUT, sk['tag'], 'takeoff.png')).convert('RGBA'))
            same = (a == src_t).all(-1) & (src_t[..., 3] > 0)
            out[same] = sk_t[same]
        Image.fromarray(np.clip(np.round(out), 0, 255).astype(np.uint8)).save(os.path.join(d, key + '.png'), optimize=True)
    return True


# ── build / verify ───────────────────────────────────────────────────────────────────────────────────────────────────
REMOVALS = {}


def build(sk):
    tag = sk['tag']; strips = M.load_anim()
    phases = 3 if sk.get('glitter') else 1
    removed = {}
    for ph in range(phases):
        d = os.path.join(OUT, tag, f'p{ph}' if ph else '')
        os.makedirs(d, exist_ok=True)
        for name, (fw, n) in strips.items():
            out, rm = recolor_strip(name, fw, n, sk, ph)
            if ph == 0 and rm.any(): removed[name] = int(rm.sum())
            Image.fromarray(out).save(os.path.join(d, name + '.png'), optimize=True)
    im = Image.open(os.path.join(SRC, 'portrait.png')).convert('RGBA')
    out, _ = recolor_strip('portrait', im.width, 1, sk, 0, head_only=True)
    Image.fromarray(out).save(os.path.join(OUT, tag, 'portrait.png'), optimize=True)
    fxd = build_fx(sk, os.path.join(OUT, tag, 'fx'))
    sk['_fx'] = True
    REMOVALS[tag] = removed
    print(f'  built {tag:18s} {sk["name"]}  ({phases} phase{"s" if phases > 1 else ""}{", fx" if fxd else ""}'
          + (f', hair removed {sum(removed.values())} px' if removed else '') + ')')


def verify(sk):
    tag, bad = sk['tag'], []
    strips = M.load_anim(); phases = 3 if sk.get('glitter') else 1
    for ph in range(phases):
        for name, (fw, n) in strips.items():
            A = analysis(name, fw, n); a = A.a
            p = os.path.join(OUT, tag, f'p{ph}' if ph else '', name + '.png')
            if not os.path.exists(p): bad.append(f'{name} p{ph}: missing'); continue
            b = np.array(Image.open(p).convert('RGBA'))
            if a.shape != b.shape: bad.append(f'{name} p{ph}: size {b.shape} != {a.shape}'); continue
            rm = shave_mask(A, sk['shave'])[0] if sk.get('shave') else np.zeros(a.shape[:2], bool)
            da = a[..., 3] != b[..., 3]
            if (da & ~rm).any(): bad.append(f'{name} p{ph}: alpha differs outside the logged hair removal ({int((da & ~rm).sum())})')
            if (b[..., 3][rm] != 0).any(): bad.append(f'{name} p{ph}: a removal is not transparent')
            prot = (A.reg == 0) & ~rm & (a[..., 3] > 0)
            if sk.get('shave'):   # the re-outlined crown may turn kept HAIR black, never a protected pixel
                pass
            if sk.get('half'): prot = prot | ~(alien_side(A) & (A.reg != R['streaks']))
            if not np.array_equal(a[prot], b[prot]): bad.append(f'{name} p{ph}: protected pixels changed ({int((a[prot] != b[prot]).any(-1).sum())})')
    a = np.array(Image.open(os.path.join(SRC, 'portrait.png')).convert('RGBA')); p = os.path.join(OUT, tag, 'portrait.png')
    if not os.path.exists(p): bad.append('portrait missing')
    else:
        b = np.array(Image.open(p).convert('RGBA'))
        if a.shape != b.shape or not np.array_equal(a[..., 3], b[..., 3]): bad.append('portrait: size / alpha differs')
    for key in FX_KEYS:
        a = np.array(Image.open(os.path.join(SRC, 'fx', key + '.png')).convert('RGBA')); p = os.path.join(OUT, tag, 'fx', key + '.png')
        if not os.path.exists(p): bad.append(f'fx/{key} missing'); continue
        b = np.array(Image.open(p).convert('RGBA'))
        ok_a = a[..., 3] == b[..., 3]
        if key == 'takeoffRing':   # only the body copy may lose alpha, exactly where the skin's take-off frame logged a hair removal
            src_t = np.array(Image.open(os.path.join(SRC, 'takeoff.png')).convert('RGBA'))
            sk_t = np.array(Image.open(os.path.join(OUT, tag, 'takeoff.png')).convert('RGBA'))
            ok_a |= (a == src_t).all(-1) & (src_t[..., 3] > 0) & (sk_t[..., 3] == b[..., 3])
        if a.shape != b.shape or not ok_a.all(): bad.append(f'fx/{key}: size / alpha differs')
    return bad


SHOW = [('idle', 0), ('fpunch', 1), ('fpunch', 2), ('win', 0), ('win', 3), ('guard', 0), ('straight', 1)]


def frame_of(tag, name, fi, phase=0):
    fw, n = M.load_anim()[name]
    p = os.path.join(SRC, name + '.png') if tag == 'default' else os.path.join(OUT, tag, f'p{phase}' if phase else '', name + '.png')
    im = Image.open(p).convert('RGBA')
    return im.crop((fi * fw, 0, (fi + 1) * fw, im.height))


def sheets(tags, out_name=None, show=SHOW, S=3):
    """contact sheet at ACTUAL MATCH SIZE (×3 = INV_SCALE) on a BRIGHT and a DARK stage colour: idle, flying punch (both
    horizontal frames), both win poses, guard, straight (+ the portrait); Alien X also mirrored"""
    os.makedirs(DOCS, exist_ok=True)
    rows = []
    for tag in ['default'] + tags:
        cells = []
        for name, fi in show:
            fr = frame_of(tag, name, fi)
            cells.append(fr.resize((fr.width * S, fr.height * S), Image.NEAREST))
            if tag.startswith('alienx_two') and name in ('idle', 'fpunch') and fi in (0, 1):
                cells.append(fr.transpose(Image.FLIP_LEFT_RIGHT).resize((fr.width * S, fr.height * S), Image.NEAREST))
        pt = Image.open(os.path.join(SRC if tag == 'default' else os.path.join(OUT, tag), 'portrait.png')).convert('RGBA')
        cells.append(pt)
        rows.append((tag, cells))
    cw = max(sum(c.width + 6 for c in r) for _, r in rows) + 190
    rh = max(max(c.height for c in r) for _, r in rows) + 10
    sheet = Image.new('RGBA', (cw, rh * len(rows) * 2 + 20), (0, 0, 0, 255))
    dr = ImageDraw.Draw(sheet)
    for half, bg in enumerate([(226, 222, 206, 255), (34, 38, 52, 255)]):        # bright stage | dark stage
        y0 = half * (rh * len(rows) + 20)
        dr.rectangle([0, y0, cw, y0 + rh * len(rows)], fill=bg)
        for k, (tag, cells) in enumerate(rows):
            y = y0 + k * rh
            nm = BY_TAG[tag]['name'] if tag in BY_TAG else 'Default (original suit)'
            dr.text((6, y + 12), nm.replace('—', '-').replace('’', "'")[:30], fill=(0, 0, 0, 255) if half == 0 else (240, 240, 240, 255))
            x = 190
            for c in cells: sheet.alpha_composite(c, (x, y + rh - 10 - c.height)); x += c.width + 6
    p = os.path.join(DOCS, out_name or ('contact_' + ('_'.join(tags) if len(tags) <= 5 else 'all') + '.png'))
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
        '// Generated by tools/invincibleskins/build.py — do not hand-edit. The premade Invincible (Mark Grayson) skins that are built,\n'
        '// in selector order (Viltrumite Mark first after the default; Full-Mask Mark next to Maskless Mark).\n'
        f'export const INV_SKIN_TABLE = [\n{body}{"," if rows else ""}\n]\n')


def built_tags():
    return [s['tag'] for s in SKINS if os.path.exists(os.path.join(OUT, s['tag'], 'portrait.png'))]


def removal_log():
    """hair removals (px per strip) of every built shaved skin → docs/msv1/invincible/skins/hair_removals.json"""
    log = {}
    strips = M.load_anim()
    for t in built_tags():
        sk = BY_TAG[t]
        if not sk.get('shave'): continue
        log[t] = {}
        for name, (fw, n) in strips.items():
            rm = shave_mask(analysis(name, fw, n), sk['shave'])[0]
            if rm.any(): log[t][name] = int(rm.sum())
        log[t]['total'] = sum(log[t].values())
    os.makedirs(DOCS, exist_ok=True)
    json.dump(log, open(os.path.join(DOCS, 'hair_removals.json'), 'w'), indent=1)
    return log


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
    log = removal_log()
    if log: print('  hair removals:', {k: v['total'] for k, v in log.items()})
    bad = 0
    for t in tags:
        b = verify(BY_TAG[t]); bad += len(b)
        print(f'  verify {t}: {"OK" if not b else "; ".join(b[:4])}')
    sheets(tags)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
