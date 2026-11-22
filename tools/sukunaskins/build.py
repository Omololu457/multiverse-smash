#!/usr/bin/env python3
"""tools/sukunaskins/build.py — Ryomen Sukuna (Shinjuku Arc) (sukuna_shinjuku): 20 premade cosmetic skins.

Every body strip the fighter draws (sukunaShinjukuSprites.js SUKUNA_SHINJUKU_ANIM) is recoloured into
assets/sukuna_shinjuku/skins/<tag>/<strip>.png — same size, same alpha, same frame map → identical timing, hitboxes,
anchors. NOTHING is recoloured at runtime. Deterministic: patterns come from an integer hash of (frame, x, y, salt).

PER-FRAME BODY-PART MASKS (from the sheet's own palette + position inside each frame's BODY BOX):
    body box  bbox of the frame's skin pixels, widened 6 px, from 12 px above it to the feet row. Every pixel outside
              it is PROTECTED (slash streaks, flame, blades that leave the body keep the sheet's colours).
    hair      near-black, non-outline pixels in the head zone (top 26 % of the body box)
    sash      near-black pixels in the torso zone (the collar scarf + the obi)
    shoes     near-black pixels in the feet zone (bottom 9 %)
    robe      neutral greys / whites (L ≥ 100) above the obi line (top 56 %)
    trousers  neutral greys / whites below it
    skin      the sheet's skin ramp (kept for most skins; tinted by a few)
PROTECTED (byte-identical, verified for every pixel): pure outline black, the red / orange / yellow flame and blood
pixels, the blue-grey slash greys, anything outside the body box.

TECHNIQUE FX: each skin also ships fx/{dismantleCut,fugaArrow,cleaveStreak,worldBlades}.png recoloured to its
technique palette (`pal` in the table → also used by sukunaShinjukuFx.js for the procedural strokes).
GLITTER skins get 3 pre-baked glint phases: <tag>/, <tag>/p1/, <tag>/p2/ (the phase is picked from the SIM clock).

    python3 tools/sukunaskins/build.py                    all skins in the table
    python3 tools/sukunaskins/build.py tag1 tag2 ...      just those
    python3 tools/sukunaskins/build.py --batch N          skins 5N-4 … 5N (1-based batches of 5)
    python3 tools/sukunaskins/build.py --verify           re-check dims / alpha / protected pixels of what is on disk
    python3 tools/sukunaskins/build.py --sheets           contact sheets → docs/msv1/sukuna/skins/
"""
import json, os, re, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sukuna_shinjuku')
OUT = os.path.join(SRC, 'skins')
DOCS = os.path.join(ROOT, 'docs/msv1/sukuna/skins')
TABLE_JS = os.path.join(ROOT, 'sukunaShinjukuSkinTable.js')
SCALE = 2
FX_KEYS = ['dismantleCut', 'fugaArrow', 'cleaveStreak', 'worldBlades']


def load_anim():
    js = open(os.path.join(ROOT, 'sukunaShinjukuSprites.js'), encoding='utf-8').read()
    m = re.search(r'export const SUKUNA_SHINJUKU_ANIM = (\{.*?\n\})', js, re.S)
    A = json.loads(m.group(1))
    out = {}
    for k, d in A.items():
        name = os.path.basename(d['sheet'])[:-4]
        out[name] = d['frameWidth']
    return out


def hx(c):
    c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def h3(x, y, z, salt=0):
    v = (int(x) * 374761393 + int(y) * 668265263 + int(z) * 2147483647 + salt * 1274126177) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def ramp(stops, t):
    """stops: list of hex colours dark → light; t in [0,1]"""
    S = [hx(s) for s in stops]
    t = min(1.0, max(0.0, t)) * (len(S) - 1)
    i = min(int(t), len(S) - 2); f = t - i
    return S[i] * (1 - f) + S[i + 1] * f


# ── classification ───────────────────────────────────────────────────────────────────────────────────────────────────
def classify(rgb, alpha, fw, head_only=False):
    """returns an int8 region map: 0 protected, 1 hair, 2 sash, 3 shoes, 4 robe, 5 trousers, 6 skin"""
    H, W = alpha.shape
    r, g, b = [rgb[..., i].astype(np.int32) for i in range(3)]
    L = (r * 299 + g * 587 + b * 114) // 1000
    on = alpha > 0
    neutral = (np.abs(r - g) <= 6) & (np.abs(g - b) <= 6) & (np.abs(r - b) <= 6)
    outline = (r <= 2) & (g <= 2) & (b <= 3)
    dark = on & ~outline & (L < 72) & (np.abs(r - b) <= 14) & (np.abs(r - g) <= 8)
    cloth = on & neutral & (L >= 100)
    skin = on & (r >= 150) & (r - b >= 30) & (r - b <= 150) & (g >= 90) & (r > g) & (g > b - 10) & ~((g < 60))
    reg = np.zeros((H, W), np.int8)
    for x0 in range(0, W, fw):
        sl = slice(x0, x0 + fw)
        sk = skin[:, sl]
        ys, xs = np.nonzero(sk)
        if head_only:
            top, bot, lx, rx = 0, H - 1, 0, fw - 1
        else:
            if len(ys) == 0: continue
            top = max(0, ys.min() - 12); bot = H - 1
            lx = max(0, xs.min() - 6); rx = min(fw - 1, xs.max() + 6)
        h = max(1, bot - top)
        yy = np.arange(H)[:, None] * np.ones((1, fw), int)
        xx = np.ones((H, 1), int) * np.arange(fw)[None, :]
        box = (yy >= top) & (yy <= bot) & (xx >= lx) & (xx <= rx)
        rel = (yy - top) / h
        d, c = dark[:, sl] & box, cloth[:, sl] & box
        sub = np.zeros((H, fw), np.int8)
        if head_only:   # portrait = head + collar crop: hair above, the collar scarf below
            sub[d & (rel < 0.62)] = 1
            sub[d & (rel >= 0.62)] = 2
            sub[c] = 4
        else:
            sub[d & (rel < 0.26)] = 1
            sub[d & (rel >= 0.26) & (rel < 0.91)] = 2
            sub[d & (rel >= 0.91)] = 3
            sub[c & (rel < 0.56)] = 4
            sub[c & (rel >= 0.56)] = 5
        sub[sk & box] = 6
        reg[:, sl] = sub
    return reg, L


# ── the 20 skins ─────────────────────────────────────────────────────────────────────────────────────────────────────
# region keys: hair / sash / shoes / robe / trousers / skin → ramp stops (dark → light), or None = keep.
# pattern(name) adds a deterministic texture inside the cloth regions. pal = technique colours.
SKINS = [
  dict(tag='alienx_half', name='Alien X — Half a Heaven', classification='Alien X Collection', crossover='Ben 10',
       robe=['#000000', '#05060c', '#0b0d1a'], trousers=['#7d7f86', '#d9dbe0', '#ffffff'], sash=['#0b0d1a', '#1d2140'], hair=['#e9ecf2', '#ffffff'],
       shoes=['#0b0d1a', '#1d2140'], pattern='stars',
       pal=dict(cutTrail='#ffffff', cleaveEdge='#ffffff', cleaveAccent='#6ee7ff', fugaCore='#ffffff', fugaRim='#3fd0ff', web='#0b0d1a', amp='#ffffff')),
  dict(tag='alienx_deadsun', name='Alien X — The Dead Sun', classification='Alien X Collection', crossover='Ben 10',
       robe=['#000000', '#07040a', '#140812'], trousers=['#000000', '#07040a', '#140812'], sash=['#2a0b06', '#5a1a0c'], hair=['#1a0a08', '#3a1008'],
       shoes=['#2a0b06', '#5a1a0c'], pattern='deadstars',
       pal=dict(cutTrail='#ff8a3a', cleaveEdge='#ffd2a0', cleaveAccent='#7a1a0a', fugaCore='#ffcf6a', fugaRim='#b3260a', web='#2a0b06', amp='#ff9a5a')),
  dict(tag='blackdiamond', name='Black Diamond Wake', classification='Glitter Collection', glitter=True,
       robe=['#050507', '#15161c', '#2c2e38'], trousers=['#0a0a0d', '#1c1d24', '#3a3c48'], sash=['#2a2d36', '#5a6070'], hair=['#08080a', '#1a1b22'],
       shoes=['#5a6070', '#9aa2b4'], pattern='glints', glint='#ffffff',
       pal=dict(cutTrail='#e8f0ff', cleaveEdge='#ffffff', cleaveAccent='#9aa8c8', fugaCore='#ffffff', fugaRim='#8fb0ff', web='#15161c', amp='#e8f0ff')),
  dict(tag='champagne', name='Champagne Menace', classification='Glitter Collection', glitter=True,
       robe=['#6e5420', '#c9a75a', '#f6e3ad'], trousers=['#5a4418', '#b8944a', '#ead39a'], sash=['#2a1a08', '#4a3010'], hair=['#1a1208', '#3a2810'],
       shoes=['#2a1a08', '#4a3010'], pattern='glints', glint='#fff8dc',
       pal=dict(cutTrail='#f6e3ad', cleaveEdge='#fff8dc', cleaveAccent='#b8944a', fugaCore='#fff3b0', fugaRim='#e0a030', web='#4a3010', amp='#f6e3ad')),
  dict(tag='sugarglass', name='Sugar Glass', classification='Glitter Collection', glitter=True,
       robe=['#9fd8e0', '#d6f2f2', '#ffffff'], trousers=['#f0a8c8', '#fad4e4', '#fff4fa'], sash=['#5a8a9a', '#8ab8c4'], hair=['#3a4a5c', '#6a7c90'],
       shoes=['#5a8a9a', '#8ab8c4'], pattern='glints', glint='#ffffff',
       pal=dict(cutTrail='#d6f2f2', cleaveEdge='#ffffff', cleaveAccent='#f0a8c8', fugaCore='#ffffff', fugaRim='#f0a8c8', web='#5a8a9a', amp='#d6f2f2')),
  dict(tag='valkyrie', name='Winning Valkyrie — Right Spin', classification='Crossover', crossover='Winning Valkyrie',
       robe=['#8a0a14', '#d81e2c', '#ff6a6a'], trousers=['#a8a8b4', '#e8e8f0', '#ffffff'], sash=['#b8860b', '#ffd34a'], hair=['#141418', '#2a2a32'],
       shoes=['#b8860b', '#ffd34a'], pattern='spin',
       pal=dict(cutTrail='#ffd34a', cleaveEdge='#ffffff', cleaveAccent='#d81e2c', fugaCore='#fff0a0', fugaRim='#d81e2c', web='#3a0a10', amp='#ffd34a')),
  dict(tag='heatblast', name='Ben 10 — Heatblast Kiln', classification='Crossover', crossover='Ben 10',
       robe=['#1e0c06', '#4a1e0e', '#7a3418'], trousers=['#1e0c06', '#4a1e0e', '#7a3418'], sash=['#ff7a10', '#ffd040'], hair=['#ff5a00', '#ffd040'],
       shoes=['#ff7a10', '#ffd040'], pattern='magma',
       pal=dict(cutTrail='#ffb040', cleaveEdge='#fff0a0', cleaveAccent='#ff5a00', fugaCore='#fff6a0', fugaRim='#ff5a00', web='#4a1e0e', amp='#ffb040')),
  dict(tag='bigchill', name='Ben 10 — Big Chill After Dark', classification='Crossover', crossover='Ben 10',
       robe=['#061028', '#0e2a5a', '#2a5aa0'], trousers=['#061028', '#0e2a5a', '#2a5aa0'], sash=['#7ef0ff', '#e0ffff'], hair=['#0a1838', '#1c3a70'],
       shoes=['#7ef0ff', '#e0ffff'], pattern='frost', skin=['#3a5a9a', '#7aa0d8', '#c4dcff'],
       pal=dict(cutTrail='#a8f4ff', cleaveEdge='#e0ffff', cleaveAccent='#2a5aa0', fugaCore='#e0ffff', fugaRim='#3ab8ff', web='#0e2a5a', amp='#a8f4ff')),
  dict(tag='misprint', name='Four-Colour Misprint', classification='Original',
       robe=['#d0c8b0', '#f4ecd4', '#fffaf0'], trousers=['#d0c8b0', '#f4ecd4', '#fffaf0'], sash=['#1a1a1a', '#303030'], hair=['#10102a', '#24244a'],
       shoes=['#1a1a1a', '#303030'], pattern='halftone',
       pal=dict(cutTrail='#00a0e0', cleaveEdge='#ffffff', cleaveAccent='#e0007a', fugaCore='#ffe600', fugaRim='#e0007a', web='#1a1a1a', amp='#00a0e0')),
  dict(tag='cinnabar', name='Cinnabar Seal', classification='Original',
       robe=['#6a0e06', '#c2280e', '#f0583a'], trousers=['#0e0a0a', '#221a1a', '#3a2c2c'], sash=['#b8860b', '#ffd34a'], hair=['#0e0a0a', '#221a1a'],
       shoes=['#0e0a0a', '#221a1a'], pattern='seal',
       pal=dict(cutTrail='#f0583a', cleaveEdge='#ffe0c0', cleaveAccent='#c2280e', fugaCore='#ffd34a', fugaRim='#c2280e', web='#221a1a', amp='#f0583a')),
  dict(tag='pearl', name='Mother-of-Pearl Butcher', classification='Glitter Collection', glitter=True,
       robe=['#b8b0c8', '#e8e2f0', '#ffffff'], trousers=['#a8b8c0', '#dce8ec', '#ffffff'], sash=['#5a2a3a', '#8a4058'], hair=['#2a2430', '#4a4058'],
       shoes=['#5a2a3a', '#8a4058'], pattern='nacre', glint='#ffffff',
       pal=dict(cutTrail='#e8d0ff', cleaveEdge='#ffffff', cleaveAccent='#8a4058', fugaCore='#ffffff', fugaRim='#d0a0ff', web='#5a2a3a', amp='#e8e2f0')),
  dict(tag='templebell', name='Temple Bell', classification='Original',
       robe=['#4a3010', '#8a5e24', '#c89a50'], trousers=['#2e5a4a', '#4a8a72', '#7ec0a4'], sash=['#2a1a08', '#4a3010'], hair=['#1a1208', '#2e2010'],
       shoes=['#2a1a08', '#4a3010'], pattern='patina',
       pal=dict(cutTrail='#c89a50', cleaveEdge='#fff0c8', cleaveAccent='#4a8a72', fugaCore='#ffe8a0', fugaRim='#c87a20', web='#2a1a08', amp='#c89a50')),
  dict(tag='pomegranate', name='Velvet Pomegranate', classification='Original',
       robe=['#2a0414', '#5e0a2a', '#9a1a48'], trousers=['#1a0210', '#3e0620', '#6a1036'], sash=['#d8a0b0', '#ffe0ea'], hair=['#14020a', '#2e0616'],
       shoes=['#d8a0b0', '#ffe0ea'], pattern='velvet',
       pal=dict(cutTrail='#ff6a9a', cleaveEdge='#ffe0ea', cleaveAccent='#9a1a48', fugaCore='#ffd0e0', fugaRim='#c8104a', web='#3e0620', amp='#ff9ab8')),
  dict(tag='bamboo', name='Moon Through Bamboo', classification='Original',
       robe=['#0a1230', '#1a2a5a', '#34508a'], trousers=['#0a1a14', '#1a3a2a', '#2e5e44'], sash=['#e8e4c8', '#fffbe8'], hair=['#060a18', '#101a34'],
       shoes=['#e8e4c8', '#fffbe8'], pattern='bamboo',
       pal=dict(cutTrail='#fffbe8', cleaveEdge='#ffffff', cleaveAccent='#5ea878', fugaCore='#fffbe8', fugaRim='#d8c870', web='#1a3a2a', amp='#fffbe8')),
  dict(tag='hanafuda', name='Hanafuda, Last Hand', classification='Original',
       robe=['#8a0a0a', '#d01818', '#ff4a3a'], trousers=['#0a0a0a', '#1e1e1e', '#3a3a3a'], sash=['#c8a030', '#ffe070'], hair=['#0a0a0a', '#1e1e1e'],
       shoes=['#c8a030', '#ffe070'], pattern='clouds',
       pal=dict(cutTrail='#ffe070', cleaveEdge='#ffffff', cleaveAccent='#d01818', fugaCore='#ffe070', fugaRim='#d01818', web='#1e1e1e', amp='#ffe070')),
  dict(tag='furnace', name='Furnace Window', classification='Original',
       robe=['#141416', '#2a2a30', '#46464e'], trousers=['#141416', '#2a2a30', '#46464e'], sash=['#ff8a1a', '#ffd060'], hair=['#0e0e10', '#202024'],
       shoes=['#3a2a20', '#5a4030'], pattern='grate',
       pal=dict(cutTrail='#ffb040', cleaveEdge='#fff0c0', cleaveAccent='#ff6a00', fugaCore='#fff0a0', fugaRim='#ff6a00', web='#2a2a30', amp='#ffb040')),
  dict(tag='pinknoise', name='Pink Noise', classification='Original',
       robe=['#8a2a5a', '#e060a0', '#ffb8dc'], trousers=['#6a2048', '#c04a88', '#f09cc8'], sash=['#2a0a1a', '#4a1430'], hair=['#ff8ac4', '#ffd0ea'],
       shoes=['#2a0a1a', '#4a1430'], pattern='noise',
       pal=dict(cutTrail='#ffb8dc', cleaveEdge='#ffffff', cleaveAccent='#e060a0', fugaCore='#ffffff', fugaRim='#ff40a0', web='#4a1430', amp='#ffb8dc')),
  dict(tag='blueprint', name='Blueprint for a Shrine', classification='Original',
       robe=['#0a2a6a', '#1446a0', '#2a64c8'], trousers=['#0a2a6a', '#1446a0', '#2a64c8'], sash=['#c8dcff', '#ffffff'], hair=['#c8dcff', '#ffffff'],
       shoes=['#c8dcff', '#ffffff'], pattern='grid',
       pal=dict(cutTrail='#ffffff', cleaveEdge='#ffffff', cleaveAccent='#8ab4ff', fugaCore='#ffffff', fugaRim='#8ab4ff', web='#c8dcff', amp='#ffffff')),
  dict(tag='lasttrain', name='Last Train at Midnight', classification='Original',
       robe=['#060a1a', '#101a34', '#1e2c52'], trousers=['#2a2e3a', '#4a5060', '#6e7486'], sash=['#ffd04a', '#fff0a0'], hair=['#04060e', '#0c1020'],
       shoes=['#2a2e3a', '#4a5060'], pattern='windows',
       pal=dict(cutTrail='#fff0a0', cleaveEdge='#ffffff', cleaveAccent='#ffd04a', fugaCore='#fff0a0', fugaRim='#ff9a1a', web='#101a34', amp='#fff0a0')),
  dict(tag='mourning', name='The King in Mourning', classification='Original',
       robe=['#020203', '#0c0c0e', '#1c1c20'], trousers=['#020203', '#0c0c0e', '#1c1c20'], sash=['#c8c8cc', '#f4f4f6'], hair=['#020203', '#0e0e10'],
       shoes=['#020203', '#0c0c0e'], pattern=None,
       pal=dict(cutTrail='#d8d8dc', cleaveEdge='#ffffff', cleaveAccent='#5a5a60', fugaCore='#f4f4f6', fugaRim='#8a8a90', web='#0c0c0e', amp='#d8d8dc')),
]
BY_TAG = {s['tag']: s for s in SKINS}
REG_KEYS = {1: 'hair', 2: 'sash', 3: 'shoes', 4: 'robe', 5: 'trousers', 6: 'skin'}
REG_LUM = {1: (5, 72), 2: (5, 72), 3: (5, 72), 4: (100, 255), 5: (100, 255), 6: (90, 235)}


def pattern(sk, name, base, reg_id, x, y, fi, phase, t):
    """deterministic texture on cloth (robe/trousers, sometimes sash). base: float rgb. returns rgb"""
    if name is None or reg_id not in (4, 5): return base
    if name in ('stars', 'deadstars'):
        if sk.get('split') and reg_id == 5: return base        # Half a Heaven: the void is the robe; the trousers stay white
        v = h3(x, y, fi // 4, 11)
        if v > 0.965: return hx('#ffffff') if name == 'stars' else hx('#ff7a2a') * (0.6 + 0.4 * h3(x, y, 3, 5))
        if v > 0.94 and name == 'stars': return hx('#6ee7ff') * 0.7
        return base
    if name == 'glints':
        v = h3(x, y, phase, 21)
        if v > 0.955: return hx(sk['glint'])
        if v > 0.93: return base * 0.5 + hx(sk['glint']) * 0.5
        return base
    if name == 'nacre':
        k = (x * 0.35 + y * 0.22) % 6.0 / 6.0
        tint = ramp(['#ffd8e8', '#d8f0ff', '#e8ffd8', '#f0d8ff', '#ffd8e8'], k)
        out = base * 0.72 + tint * 0.28 * (0.5 + t)
        v = h3(x, y, phase, 31)
        return hx(sk['glint']) if v > 0.96 else out
    if name == 'spin':
        return base * 0.55 + hx('#ffd34a') * 0.45 if ((x + y) % 9) < 2 else base
    if name == 'magma':
        v = h3(x // 2, y // 2, 1, 41)
        return ramp(['#ff5a00', '#ffd040'], h3(x, y, 2, 4)) if v > 0.86 else base
    if name == 'frost':
        return hx('#a8f4ff') if h3(x, y, 0, 51) > 0.95 else base
    if name == 'halftone':
        cyan = ((x // 2 + y // 2) % 2 == 0) and ((x * 3 + y) % 7 == 0)
        mag = ((x + 1) % 4 == 0) and ((y + 2) % 4 == 0)
        yel = ((x + 2) % 5 == 0) and ((y + 1) % 3 == 0) and t < 0.7
        if mag: return hx('#e0007a')
        if cyan: return hx('#00a0e0')
        if yel: return hx('#ffe600')
        return base
    if name == 'seal':
        return hx('#ffd34a') if (reg_id == 4 and (x % 11 == 3) and (y % 13 in (4, 5))) else base
    if name == 'patina':
        v = h3(x // 2, y // 2, 0, 61)
        return base * 0.5 + hx('#4a8a72') * 0.5 if (reg_id == 4 and v > 0.8) else base
    if name == 'velvet':
        return base * (0.85 + 0.3 * h3(x, y, 0, 71))
    if name == 'bamboo':
        if reg_id == 5 and x % 7 == 0: return hx('#5ea878')
        if reg_id == 5 and y % 9 == 0: return hx('#0a1a14')
        if reg_id == 4 and h3(x // 3, y // 3, 0, 81) > 0.93: return hx('#fffbe8')
        return base
    if name == 'clouds':
        return hx('#ffe070') if (reg_id == 4 and ((x // 3 + y // 2) % 6 == 0) and (y % 4 == 1)) else base
    if name == 'grate':
        if reg_id == 4 and (x % 6 in (2, 3)) and (y % 8 in (2, 3, 4)):
            return ramp(['#ff6a00', '#ffd060'], h3(x, y, 0, 91))
        return base
    if name == 'noise':
        return base * (0.7 + 0.6 * h3(x, y, fi, 101))
    if name == 'grid':
        return hx('#c8dcff') if (x % 6 == 0 or y % 6 == 0) else base
    if name == 'windows':
        if reg_id == 4 and (y % 10 in (4, 5)) and (x % 5 != 0): return ramp(['#ffd04a', '#fff0a0'], h3(x, y, 0, 111)) if h3(x // 5, y // 10, 0, 7) > 0.35 else base
        return base
    return base


def recolor(arr, fw, sk, phase=0, head_only=False):
    rgb, alpha = arr[..., :3], arr[..., 3]
    reg, L = classify(rgb, alpha, fw, head_only)
    out = arr.copy()
    ys, xs = np.nonzero(reg)
    for y, x in zip(ys, xs):
        rid = int(reg[y, x]); key = REG_KEYS[rid]
        stops = sk.get(key)
        if stops is None: continue
        lo, hi = REG_LUM[rid]
        t = (int(L[y, x]) - lo) / (hi - lo)
        if sk.get('split') and rid == 4 and (x % fw) >= fw // 2: c = ramp(['#8a8c94', '#e4e6ea', '#ffffff'], t)   # Half a Heaven: the other half of the robe is heaven-white
        else: c = ramp(stops, t)
        c = pattern(sk, sk.get('pattern'), c, rid, x % fw, y, x // fw, phase, t)
        out[y, x, :3] = np.clip(np.round(c), 0, 255).astype(np.uint8)
    return out, reg


def recolor_fx(arr, pal, key):
    """technique FX: map the sprite's luminance onto the skin's technique colours (alpha untouched)"""
    rgb, a = arr[..., :3].astype(np.float32), arr[..., 3]
    L = (rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114) / 255.0
    if key == 'fugaArrow': stops = [pal['fugaRim'], pal['fugaCore']]
    elif key == 'cleaveStreak': stops = [pal['cleaveAccent'], pal['cleaveEdge']]
    else: stops = [pal['cleaveAccent'], pal['cutTrail']]
    out = arr.copy()
    ys, xs = np.nonzero(a > 0)
    for y, x in zip(ys, xs):
        out[y, x, :3] = np.clip(np.round(ramp(stops, L[y, x])), 0, 255).astype(np.uint8)
    return out


def build(sk, strips):
    tag = sk['tag']
    phases = 3 if sk.get('glitter') else 1
    for ph in range(phases):
        d = os.path.join(OUT, tag, f'p{ph}' if ph else '')
        os.makedirs(d, exist_ok=True)
        for name, fw in strips.items():
            src = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
            out, _ = recolor(src, fw, sk, ph)
            Image.fromarray(out).save(os.path.join(d, name + '.png'), optimize=True)
    # portrait (head crop of idle ×4 — head-only masks)
    por = np.array(Image.open(os.path.join(SRC, 'portrait.png')).convert('RGBA'))
    out, _ = recolor(por, por.shape[1], sk, 0, head_only=True)
    Image.fromarray(out).save(os.path.join(OUT, tag, 'portrait.png'), optimize=True)
    os.makedirs(os.path.join(OUT, tag, 'fx'), exist_ok=True)
    for k in FX_KEYS:
        src = np.array(Image.open(os.path.join(SRC, 'fx', k + '.png')).convert('RGBA'))
        Image.fromarray(recolor_fx(src, sk['pal'], k)).save(os.path.join(OUT, tag, 'fx', k + '.png'), optimize=True)
    print(f'  built {tag:14s} {sk["name"]}  ({phases} phase{"s" if phases > 1 else ""})')


def verify(sk, strips):
    """dims + alpha identical; every PROTECTED pixel byte-identical; frame count / anchors follow (same size)"""
    tag, bad = sk['tag'], []
    phases = 3 if sk.get('glitter') else 1
    for ph in range(phases):
        for name, fw in strips.items():
            a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
            p = os.path.join(OUT, tag, f'p{ph}' if ph else '', name + '.png')
            if not os.path.exists(p): bad.append(f'{name} p{ph}: missing'); continue
            b = np.array(Image.open(p).convert('RGBA'))
            if a.shape != b.shape: bad.append(f'{name} p{ph}: size {b.shape} != {a.shape}'); continue
            if not np.array_equal(a[..., 3], b[..., 3]): bad.append(f'{name} p{ph}: alpha differs')
            reg, _ = classify(a[..., :3], a[..., 3], fw)
            prot = (reg == 0)
            if sk.get('skin') is None: prot |= (reg == 6)
            if not np.array_equal(a[prot], b[prot]): bad.append(f'{name} p{ph}: protected pixels changed ({int((a[prot] != b[prot]).any(-1).sum())})')
    for k in FX_KEYS:
        a = np.array(Image.open(os.path.join(SRC, 'fx', k + '.png')).convert('RGBA')); p = os.path.join(OUT, tag, 'fx', k + '.png')
        if not os.path.exists(p): bad.append(f'fx/{k}: missing'); continue
        b = np.array(Image.open(p).convert('RGBA'))
        if a.shape != b.shape or not np.array_equal(a[..., 3], b[..., 3]): bad.append(f'fx/{k}: size / alpha differs')
    por = os.path.join(OUT, tag, 'portrait.png')
    if not os.path.exists(por): bad.append('portrait missing')
    else:
        a = np.array(Image.open(os.path.join(SRC, 'portrait.png')).convert('RGBA')); b = np.array(Image.open(por).convert('RGBA'))
        if a.shape != b.shape or not np.array_equal(a[..., 3], b[..., 3]): bad.append('portrait size / alpha differs')
    return bad


def coverage(strips):
    """how much of each strip the masks recolour (sanity: hair / cloth found in every frame)"""
    out = {}
    for name, fw in strips.items():
        a = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
        reg, _ = classify(a[..., :3], a[..., 3], fw)
        on = (a[..., 3] > 0).sum()
        out[name] = {REG_KEYS[k]: round(float((reg == k).sum()) / max(1, on), 3) for k in REG_KEYS}
    return out


def sheets(tags, strips):
    os.makedirs(DOCS, exist_ok=True)
    show = ['idle', 'walk', 'dismantle', 'cleave', 'fuga', 'heavy', 'win']
    show = [s for s in show if s in strips]
    rows = []
    for tag in ['default'] + tags:
        row = []
        for name in show:
            p = os.path.join(SRC, name + '.png') if tag == 'default' else os.path.join(OUT, tag, name + '.png')
            im = Image.open(p).convert('RGBA'); fw = strips[name]
            fr = im.crop((0, 0, fw, im.height))
            row.append(fr.resize((fw * SCALE, im.height * SCALE), Image.NEAREST))
        rows.append((tag, row))
    W = max(sum(f.width + 6 for f in r) for _, r in rows) + 150
    Hh = sum(max(f.height for f in r) + 8 for _, r in rows)
    sheet = Image.new('RGBA', (W, Hh), (40, 40, 48, 255))
    from PIL import ImageDraw
    dr = ImageDraw.Draw(sheet); y = 0
    for tag, r in rows:
        dr.text((6, y + 10), tag, fill=(240, 240, 240, 255)); x = 150
        for f in r: sheet.alpha_composite(f, (x, y)); x += f.width + 6
        y += max(f.height for f in r) + 8
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
        '// Generated by tools/sukunaskins/build.py — do not hand-edit. The premade Ryomen Sukuna (Shinjuku Arc) skins that are built.\n'
        f'export const SKS_SKIN_TABLE = [\n{body}{"," if rows else ""}\n]\n')


def built_tags():
    return [s['tag'] for s in SKINS if os.path.exists(os.path.join(OUT, s['tag'], 'portrait.png'))]


def main():
    a = sys.argv[1:]
    strips = load_anim()
    if '--coverage' in a:
        print(json.dumps(coverage(strips), indent=1)); return
    if '--verify' in a:
        bad = 0
        for t in built_tags():
            b = verify(BY_TAG[t], strips); bad += len(b)
            print(f'  {"OK " if not b else "BAD"} {t}' + ('' if not b else ': ' + '; '.join(b[:4])))
        print(f'VERIFY: {len(built_tags())} skins, {bad} problems'); sys.exit(1 if bad else 0)
    if '--sheets' in a:
        tags = [x for x in a if x in BY_TAG] or built_tags()
        sheets(tags, strips); return
    if '--batch' in a:
        n = int(a[a.index('--batch') + 1]); tags = [s['tag'] for s in SKINS[(n - 1) * 5: n * 5]]
    else:
        tags = [x for x in a if x in BY_TAG] or [s['tag'] for s in SKINS]
    for t in tags: build(BY_TAG[t], strips)
    write_table(built_tags())
    bad = 0
    for t in tags:
        b = verify(BY_TAG[t], strips); bad += len(b)
        print(f'  verify {t}: {"OK" if not b else "; ".join(b[:4])}')
    sheets(tags, strips)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
