#!/usr/bin/env python3
"""tools/dinoskins/build.py — MSV1-DINO: the 16 Dino Thunder TEAM skins. COSMETIC ONLY, all PREMADE (nothing is recoloured at
runtime). Every skin recolours ALL FOUR forms' strips (dt_red / dt_blue / dt_yellow / dt_white) — same cells, anchors and
alpha, so timing, hitboxes and collision are identical.

  python3 tools/dinoskins/build.py [tag ...]      build (default: every theme) + masks + contact sheets + dinoSkinRows.js
  python3 tools/dinoskins/build.py --check        verify every skin strip against its base (size, alpha, frame count)

1. MASKS (per frame, exact): the sheets are palette art, so every source colour is assigned to ONE region by a table —
   suit (the Ranger's colour ramp) · light (white / silver) · gold (belt, morpher, emblem) · dark (Trent's black panels /
   Ethan's deep blues) · outline · accent (the Drago gem red) — plus its SHADE RANK inside that region (0 = darkest, 1 =
   lightest). The per-frame region maps are written to tools/dinoskins/masks/<form>/<strip>.png (value = region × 40) so a
   reviewer can see exactly what each theme touched.
2. RAMPS: a theme gives every Ranger a ramp per region (dark → light hex stops); a pixel takes the ramp colour at its rank.
3. BAKED MATERIAL (deterministic hash of cell-x, y and frame — no RNG): starfield, glitter, lead lines, scanlines, checker,
   rain streaks, pencil hatching, iridescent foil, curtain shade… written into the PNGs.
Output: assets/dinothunder/skins/<tag>/<form>/*.png, assets/dinothunder/skins/<tag>/portrait_{large,small}.png,
docs/msv1/dino/skins/<tag>.png (contact sheet), dinoSkinRows.js.
"""
import os, sys, json, glob, math
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FORMS = ['dt_red', 'dt_blue', 'dt_yellow', 'dt_white']
CELL = 260
OUT = os.path.join(ROOT, 'assets', 'dinothunder', 'skins')
MASKS = os.path.join(HERE, 'masks')
DOCS = os.path.join(ROOT, 'docs', 'msv1', 'dino', 'skins')
SKIP = {'smoke.png', 'smokeFade.png'}        # the DINO ZORD ring / sparkle FX strips stay the gem colours
REG = ['suit', 'light', 'gold', 'dark', 'outline', 'accent']

# ── 1. region table (exact source colours; anything else → nearest listed colour's region) ──
SHARED_LIGHT = [(248, 248, 248), (224, 208, 200), (184, 152, 136)]
SHARED_GOLD = [(224, 208, 16), (144, 120, 80), (104, 96, 40), (72, 48, 16)]
OUTLINE = [(8, 8, 8), (0, 0, 0)]
TABLE = {
  'dt_red': {'suit': [(248, 80, 64), (240, 32, 32), (248, 8, 8), (200, 8, 8), (168, 8, 8), (120, 0, 0), (80, 0, 0)],
             'light': SHARED_LIGHT, 'gold': SHARED_GOLD, 'outline': OUTLINE},
  'dt_blue': {'suit': [(104, 168, 248), (80, 80, 240), (16, 32, 216), (80, 8, 200), (40, 8, 152), (48, 8, 120)],
              'dark': [(56, 120, 184), (8, 88, 160), (8, 64, 112), (0, 0, 112), (0, 0, 40)],
              'light': SHARED_LIGHT + [(224, 248, 248), (216, 224, 208), (200, 208, 192), (184, 184, 160), (168, 192, 176)], 'gold': SHARED_GOLD, 'outline': OUTLINE},
  'dt_yellow': {'suit': [(248, 232, 96), (248, 216, 96), (248, 224, 0), (248, 200, 0), (240, 152, 0), (232, 136, 0), (240, 88, 0), (224, 80, 0), (208, 96, 0), (192, 72, 0), (176, 72, 0), (160, 72, 0), (80, 56, 0)],
                'dark': [(48, 8, 0)], 'light': SHARED_LIGHT + [(216, 224, 208)], 'gold': SHARED_GOLD, 'outline': OUTLINE},
  'dt_white': {'suit': [(248, 248, 248), (232, 232, 232), (216, 216, 216), (176, 176, 176)],
               'dark': [(120, 120, 120), (97, 97, 97), (80, 80, 80), (56, 56, 56), (40, 40, 32)],
               'gold': [(248, 240, 128), (248, 184, 96), (240, 168, 80), (200, 144, 64), (152, 112, 48)], 'accent': [(176, 0, 0)], 'outline': [(0, 0, 0)]},
}
lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
def lut_for(form):
    """colour → (region index, rank 0..1) for the listed colours"""
    out = {}
    for reg, cols in TABLE[form].items():
        ls = sorted(set(cols), key=lum); lo, hi = lum(ls[0]), lum(ls[-1])
        n = len(ls)   # rank = half shade ORDER, half brightness: a sheet whose ramp bunches at one end still spreads over the theme ramp
        for i, c in enumerate(ls): out[c] = (REG.index(reg), 0.5 if hi == lo else 0.5 * i / max(1, n - 1) + 0.5 * (lum(c) - lo) / (hi - lo))
    return out
LUTS = {f: lut_for(f) for f in FORMS}
def classify(form, c):
    L = LUTS[form]
    if c in L: return L[c]
    best = min(L, key=lambda k: sum((a - b) ** 2 for a, b in zip(k, c)))
    reg, _ = L[best]
    # a stray colour keeps its own brightness inside the region it is nearest to
    cols = [k for k, v in L.items() if v[0] == reg]; lo, hi = min(map(lum, cols)), max(map(lum, cols))
    return reg, 0.5 if hi == lo else min(1, max(0, (lum(c) - lo) / (hi - lo)))

# ── 2. themes: per-Ranger ramps (dark → light) per region + the baked material ──
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
def R(*stops): return [H(s) for s in stops]
def team(suit, light=None, gold=None, dark=None, outline=None, accent=None):
    return {'suit': suit, 'light': light, 'gold': gold, 'dark': dark, 'outline': outline, 'accent': accent}
VOID = R('#03040a', '#0b0e22', '#1a1f44')
THEMES = [
  dict(tag='axconst', name='Alien X — Missing Constellation', fx='stars', fxCol={'dt_red': '#ff6a5a', 'dt_blue': '#7ab0ff', 'dt_yellow': '#ffe066', 'dt_white': '#ffffff'},
       note='Void-black suits with a baked starfield; each Ranger keeps a constellation of stars in their gem colour; white panels stay Alien X white.',
       forms={'dt_red': team(VOID, R('#9aa0b8', '#f4f6ff'), R('#5a0e0e', '#ff5a4a')), 'dt_blue': team(VOID, R('#9aa0b8', '#f4f6ff'), R('#0e1e5a', '#5a8aff'), VOID),
              'dt_yellow': team(VOID, R('#9aa0b8', '#f4f6ff'), R('#5a4a0e', '#ffd84a'), VOID), 'dt_white': team(R('#0b0e22', '#3a4070', '#e8ecff'), None, R('#3a3f6a', '#c8d0ff'), VOID, None, R('#ff2a2a', '#ff8a8a'))}),
  dict(tag='spotlight', name='Glitter Set — Cut for the Spotlight', fx='glitter', fxCol={'dt_red': '#fff0f0', 'dt_blue': '#f0f6ff', 'dt_yellow': '#fffbe0', 'dt_white': '#ffffff'},
       note='Sequinned stage suits (ruby / sapphire / topaz / silver) with baked glitter and a top-down spotlight.',
       forms={'dt_red': team(R('#4a0010', '#c0102a', '#ff7a8a')), 'dt_blue': team(R('#06103a', '#1a48d8', '#8ab8ff'), dark=R('#030820', '#10307a')),
              'dt_yellow': team(R('#4a3000', '#e0a800', '#fff09a'), dark=R('#2a1800', '#6a4400')), 'dt_white': team(R('#7a7a8a', '#d8dae6', '#ffffff'), dark=R('#2a2a34', '#6a6a7a'), gold=R('#8a6a20', '#ffe68a'))}),
  dict(tag='valkyrie', name='Winning Valkyrie — Victory Formation', fx='spotlight', fxCol={},
       note='Winning Valkyrie colours (cobalt / red / white / gold): Conner red, Ethan cobalt, Kira gold, Trent white with cobalt panels.',
       forms={'dt_red': team(R('#5a0610', '#db1523', '#ff6a72'), R('#c8c8d0', '#f4f4f4'), R('#8a6000', '#ffc831')), 'dt_blue': team(R('#081a5a', '#1942ce', '#6a8aff'), R('#c8c8d0', '#f4f4f4'), R('#8a6000', '#ffc831'), R('#040c2a', '#0e2a8a')),
              'dt_yellow': team(R('#6a4a00', '#ffc831', '#fff0a0'), R('#c8c8d0', '#f4f4f4'), R('#0e2a8a', '#1942ce'), R('#3a2000', '#7a5000')), 'dt_white': team(R('#b8bcc8', '#e8e8ee', '#f4f4f4'), None, R('#8a6000', '#ffc831'), R('#081a5a', '#1942ce'), None, R('#db1523', '#ff6a72'))}),
  dict(tag='pinkvil', name='Pink Viltrumite — Rose Standard', fx=None, fxCol={},
       note='The Rose Standard: rose / orchid / peach / blush suits, white capes-of-colour panels, pale gold.',
       forms={'dt_red': team(R('#5a0a2a', '#e0457b', '#ffa0c0')), 'dt_blue': team(R('#3a0a4a', '#a0409a', '#e8a0e0'), dark=R('#1a0424', '#5a1a5a')),
              'dt_yellow': team(R('#5a2a1a', '#f08a7a', '#ffd0c0'), dark=R('#2a0a10', '#6a2a3a')), 'dt_white': team(R('#c8a0b0', '#f4dce6', '#fff4f8'), dark=R('#4a1030', '#8a3a5a'), gold=R('#a07a50', '#f0d0a0'), accent=R('#e0457b', '#ffa0c0'))}),
  dict(tag='fossil', name='Fossil Hall', fx='speckle', fxCol={},
       note='Museum fossils: terracotta, slate, amber resin and bleached bone over sandstone, brass display-plaque gold.',
       forms={'dt_red': team(R('#4a2014', '#b0583a', '#e8a07a'), R('#8a7a5a', '#e8dcc0'), R('#5a4020', '#c8a050')), 'dt_blue': team(R('#1e2a30', '#56707a', '#a8bcc0'), R('#8a7a5a', '#e8dcc0'), R('#5a4020', '#c8a050'), R('#0e1418', '#34444a')),
              'dt_yellow': team(R('#5a2a00', '#d08a10', '#ffd070'), R('#8a7a5a', '#e8dcc0'), R('#5a4020', '#c8a050'), R('#2a1000', '#5a3000')), 'dt_white': team(R('#a89a80', '#e0d6c0', '#f8f0e0'), None, R('#5a4020', '#c8a050'), R('#3a3024', '#6a5a44'), None, R('#d08a10', '#ffd070'))}),
  dict(tag='storm', name='Storm Broadcast', fx='scanlines', fxCol={},
       note='A TV weather map on a CRT: radar red, ocean blue, warning yellow, cloud grey; baked scanlines.',
       forms={'dt_red': team(R('#3a0010', '#e02040', '#ff8aa0'), R('#7a8aa0', '#e0f0ff')), 'dt_blue': team(R('#001a3a', '#1070d0', '#7ad0ff'), R('#7a8aa0', '#e0f0ff'), dark=R('#000a1a', '#0a3a6a')),
              'dt_yellow': team(R('#3a3000', '#f0d000', '#fff8a0'), R('#7a8aa0', '#e0f0ff'), dark=R('#1a1000', '#5a4a00')), 'dt_white': team(R('#7a8494', '#c8d0dc', '#f0f4fa'), None, R('#3a8a3a', '#9aff9a'), R('#1a2230', '#3a4a5a'))}),
  dict(tag='arcade', name='Arcade After Closing', fx='neon', fxCol={'dt_red': '#ff2a8a', 'dt_blue': '#2af0ff', 'dt_yellow': '#d8ff2a', 'dt_white': '#c08aff'},
       note='The lights are off: midnight-navy suits lit by neon edges (hot pink, cyan, lime, UV violet).',
       forms={'dt_red': team(R('#0a0418', '#2a0a3a', '#ff2a8a'), R('#3a2a5a', '#ff8ad0')), 'dt_blue': team(R('#020a18', '#0a2a3a', '#2af0ff'), R('#2a3a5a', '#a0f8ff'), dark=R('#010408', '#06182a')),
              'dt_yellow': team(R('#081004', '#1e2a0a', '#d8ff2a'), R('#3a4a2a', '#f0ffa0'), dark=R('#040802', '#101806')), 'dt_white': team(R('#140a24', '#3a2a5a', '#e0c8ff'), None, R('#3a0a5a', '#c08aff'), R('#06020c', '#1a0a2a'))}),
  dict(tag='axmoons', name='Alien X — Four Strange Moons', fx='moons', fxCol={'dt_red': '#ff9a6a', 'dt_blue': '#9ad8ff', 'dt_yellow': '#ffe08a', 'dt_white': '#e8e8f0'},
       note='Void suits under four strange moons: each Ranger\'s white panels glow in their own moon colour; big moon dots in the starfield.',
       forms={'dt_red': team(VOID, R('#5a2a1a', '#ff9a6a')), 'dt_blue': team(VOID, R('#1a3a5a', '#9ad8ff'), dark=VOID), 'dt_yellow': team(VOID, R('#5a4a1a', '#ffe08a'), dark=VOID),
              'dt_white': team(R('#0b0e22', '#3a4070', '#e8e8f0'), None, R('#5a5a6a', '#e8e8f0'), VOID, None, R('#ff2a2a', '#ff8a8a'))}),
  dict(tag='curtain', name='JJK — Curtain Falls', fx='curtain', fxCol={},
       note='A Curtain drops over the stage: ink-dark suits shading to black from the top, cursed-violet energy where the gold was.',
       forms={'dt_red': team(R('#120206', '#6a0a1a', '#c03a4a'), R('#5a5468', '#d8d4e0'), R('#2a0a4a', '#a05aff')), 'dt_blue': team(R('#02020e', '#141a5a', '#4a5ab0'), R('#5a5468', '#d8d4e0'), R('#2a0a4a', '#a05aff'), R('#010106', '#0a0a2a')),
              'dt_yellow': team(R('#100a00', '#6a4a10', '#c8a040'), R('#5a5468', '#d8d4e0'), R('#2a0a4a', '#a05aff'), R('#050200', '#201000')), 'dt_white': team(R('#3a3644', '#a8a4b4', '#e8e4f0'), None, R('#2a0a4a', '#a05aff'), R('#040208', '#141020'), None, R('#7a1aff', '#c08aff'))}),
  dict(tag='grandprix', name='Dino Grand Prix', fx='checker', fxCol={},
       note='Racing livery: gloss race red / blue / yellow and pearl white, chequered white panels, chrome trim.',
       forms={'dt_red': team(R('#4a0004', '#e00010', '#ff8a7a'), R('#202020', '#ffffff'), R('#6a6a72', '#f0f0f8')), 'dt_blue': team(R('#00103a', '#0050e0', '#80b0ff'), R('#202020', '#ffffff'), R('#6a6a72', '#f0f0f8'), R('#000818', '#00286a')),
              'dt_yellow': team(R('#4a3000', '#ffc800', '#fff4a0'), R('#202020', '#ffffff'), R('#6a6a72', '#f0f0f8'), R('#201000', '#5a3a00')), 'dt_white': team(R('#9aa0b0', '#eef0f6', '#ffffff'), None, R('#6a6a72', '#f0f0f8'), R('#101014', '#303038'), None, R('#e00010', '#ff8a7a'))}),
  dict(tag='glass', name='Stained Glass', fx='lead', fxCol={},
       note='Cathedral glass: ruby, cobalt, amber and opal panes with baked lead lines and a backlit glow.',
       forms={'dt_red': team(R('#4a0010', '#c8102a', '#ff8a7a'), R('#a0b0a0', '#f0f8e8'), R('#6a4a10', '#f0c040')), 'dt_blue': team(R('#00104a', '#1a40c8', '#7ab0ff'), R('#a0b0a0', '#f0f8e8'), R('#6a4a10', '#f0c040'), R('#00081e', '#0a2060')),
              'dt_yellow': team(R('#5a3000', '#e89a00', '#ffe07a'), R('#a0b0a0', '#f0f8e8'), R('#6a4a10', '#f0c040'), R('#2a1000', '#6a3a00')), 'dt_white': team(R('#9ab0c0', '#d8eaf0', '#f8fcff'), None, R('#6a4a10', '#f0c040'), R('#1a2a30', '#3a5060'), None, R('#c8102a', '#ff8a7a'))}),
  dict(tag='rain', name='Rainy-Day Tokusatsu', fx='rain', fxCol={},
       note='A location shoot in the rain: wet, desaturated suits with a blue-grey cast and baked rain streaks.',
       forms={'dt_red': team(R('#2a0a10', '#8a2a32', '#c87a80'), R('#5a646e', '#c0ccd6')), 'dt_blue': team(R('#0a1424', '#2a4a7a', '#7a9ac0'), R('#5a646e', '#c0ccd6'), dark=R('#04080e', '#14243a')),
              'dt_yellow': team(R('#2a2410', '#8a7a3a', '#d0c890'), R('#5a646e', '#c0ccd6'), dark=R('#100c04', '#2a2410')), 'dt_white': team(R('#6a747e', '#aab4be', '#dce4ea'), None, R('#5a5a4a', '#b0aa8a'), R('#14181e', '#343c46'))}),
  dict(tag='pearl', name='Pearl Divers', fx='pearl', fxCol={},
       note='Undersea: coral, deep teal, sand gold and mother-of-pearl; the white panels shimmer pink-to-cyan like nacre.',
       forms={'dt_red': team(R('#4a1410', '#e0604a', '#ffb0a0'), R('#c0b0c0', '#fff4fa'), R('#8a7a6a', '#f0e8e0')), 'dt_blue': team(R('#00222a', '#007a80', '#6ae0e0'), R('#c0b0c0', '#fff4fa'), R('#8a7a6a', '#f0e8e0'), R('#000e12', '#003a40')),
              'dt_yellow': team(R('#4a3a1a', '#d8b070', '#fff0c8'), R('#c0b0c0', '#fff4fa'), R('#8a7a6a', '#f0e8e0'), R('#201808', '#5a4a2a')), 'dt_white': team(R('#b0b8c8', '#ecf0f8', '#ffffff'), None, R('#8a7a6a', '#f0e8e0'), R('#1a2a34', '#3a5a6a'), None, R('#e0604a', '#ffb0a0'))}),
  dict(tag='dragonfly', name='Glitter — Dragonfly Foil', fx='foil', fxCol={'dt_red': '#ffffff', 'dt_blue': '#ffffff', 'dt_yellow': '#ffffff', 'dt_white': '#ffffff'},
       note='Iridescent dragonfly foil: every suit shifts hue across the body (red→violet, blue→green, gold→lime, silver→opal) with baked glitter.',
       forms={'dt_red': team(R('#3a0020', '#c0106a', '#ff7ad0')), 'dt_blue': team(R('#002a2a', '#00a080', '#7affd0'), dark=R('#001010', '#004a3a')),
              'dt_yellow': team(R('#2a3a00', '#a0d000', '#f0ff8a'), dark=R('#101800', '#3a5000')), 'dt_white': team(R('#8a9aa8', '#d8eaf0', '#ffffff'), dark=R('#1a2a3a', '#3a5a7a'), gold=R('#4a8a8a', '#c0fff0'))}),
  dict(tag='sushi', name='Midnight Sushi', fx=None, fxCol={},
       note='Late-night counter: salmon Conner, nori-and-rice Ethan, tamago Kira, rice-white Trent with nori panels; wasabi-green trim.',
       forms={'dt_red': team(R('#6a1a0a', '#f0703a', '#ffc0a0'), R('#a8a49a', '#f8f6f0'), R('#3a5a10', '#a0d84a')), 'dt_blue': team(R('#06140e', '#1a3a2a', '#4a6a5a'), R('#a8a49a', '#f8f6f0'), R('#3a5a10', '#a0d84a'), R('#020604', '#0a1810')),
              'dt_yellow': team(R('#6a4a00', '#f0c030', '#fff0a0'), R('#a8a49a', '#f8f6f0'), R('#3a5a10', '#a0d84a'), R('#2a1a00', '#5a3a10')), 'dt_white': team(R('#b4b0a6', '#ecead8', '#fcfbf6'), None, R('#3a5a10', '#a0d84a'), R('#06140e', '#1a3a2a'), None, R('#f0703a', '#ffc0a0'))}),
  dict(tag='sketch', name='Saturday Morning Sketchbook', fx='hatch', fxCol={},
       note='Cartoon pencils on cream paper: crayon fills, graphite outlines and baked cross-hatching in the shadows.',
       forms={'dt_red': team(R('#c04a3a', '#e8806a', '#f8c8b0'), R('#c8bca0', '#fbf5e6'), R('#a88a3a', '#f0d890'), outline=R('#2a2a30', '#4a4a50')),
              'dt_blue': team(R('#3a5aa8', '#6a90d8', '#b8d0f0'), R('#c8bca0', '#fbf5e6'), R('#a88a3a', '#f0d890'), R('#2a3a6a', '#5a6a9a'), R('#2a2a30', '#4a4a50')),
              'dt_yellow': team(R('#c89a2a', '#f0c860', '#fbe8b0'), R('#c8bca0', '#fbf5e6'), R('#a88a3a', '#f0d890'), R('#6a5a2a', '#9a8a5a'), R('#2a2a30', '#4a4a50')),
              'dt_white': team(R('#c8bca0', '#ebe2cc', '#fbf5e6'), None, R('#a88a3a', '#f0d890'), R('#4a4a50', '#7a7a80'), R('#2a2a30', '#4a4a50'), R('#c04a3a', '#e8806a'))}),
]
GROUPS = [THEMES[i:i + 4] for i in range(0, 16, 4)]   # one commit per 4 themes

def ramp(stops, t):
    if len(stops) == 1: return stops[0]
    x = t * (len(stops) - 1); i = min(len(stops) - 2, int(x)); k = x - i
    return tuple(round(stops[i][j] + (stops[i + 1][j] - stops[i][j]) * k) for j in range(3))
def hsh(x, y, f, s=0):
    v = (x * 374761393 + y * 668265263 + f * 2246822519 + s * 3266489917) & 0xffffffff
    v = ((v ^ (v >> 13)) * 1274126177) & 0xffffffff
    return (v ^ (v >> 16)) / 4294967296
mix = lambda a, b, k: tuple(round(a[i] + (b[i] - a[i]) * k) for i in range(3))

def material(fx, col, reg, t, x, y, fr, h, form, th):
    """the baked material: deterministic per (cell x, y, frame); returns the final colour"""
    if not fx: return col
    hi = H(th['fxCol'].get(form, '#ffffff')) if th['fxCol'] else (255, 255, 255)
    if fx in ('stars', 'moons') and reg in (0, 3):
        r = hsh(x // 2, y // 2, 0, 7)                            # the field is fixed to the body (does not twinkle per frame)
        if r < (0.035 if fx == 'stars' else 0.02): return mix(col, (255, 255, 255), 0.85)
        if fx == 'stars' and r < 0.047: return mix(col, hi, 0.9)   # the constellation in the gem colour
        if fx == 'moons' and 0.5 < r < 0.506: return hi
        return col
    if fx == 'glitter' and reg in (0, 2, 3):
        if hsh(x, y, fr, 3) < 0.03: return mix(col, hi, 0.9)
        return mix(col, (255, 255, 255), max(0, 0.18 - y / h * 0.3))   # the spotlight from above
    if fx == 'spotlight': return mix(col, (255, 255, 255), max(0, 0.12 - y / h * 0.2))
    if fx == 'speckle' and reg in (0, 1): return mix(col, (40, 30, 20), 0.25) if hsh(x, y, 0, 5) < 0.06 else col
    if fx == 'scanlines': return mix(col, (0, 0, 0), 0.22) if y % 2 else mix(col, (180, 240, 255), 0.05)
    if fx == 'neon' and reg in (0, 3) and t > 0.8: return hi
    if fx == 'curtain': return mix(col, (0, 0, 0), max(0, 0.45 - y / h * 0.6))
    if fx == 'checker' and reg == 1: return col if ((x // 3) + (y // 3)) % 2 else mix(col, (20, 20, 20), 0.85)
    if fx == 'lead' and reg == 0:
        if (x + y * 2) % 11 == 0 or (x * 2 - y) % 13 == 0: return (24, 20, 28)
        return mix(col, (255, 255, 230), 0.12)
    if fx == 'rain': return mix(col, (220, 235, 255), 0.45) if (x - y // 3) % 9 == 0 and hsh(x // 9, y // 6, 0, 2) < 0.5 else col
    if fx == 'pearl' and reg == 1: return mix(col, (255, 200, 230) if (x + y) % 14 < 7 else (200, 255, 250), 0.35)
    if fx == 'foil' and reg in (0, 3):
        k = (math.sin((x + y) / 7.0) + 1) / 2
        c2 = mix(col, (120, 80, 255) if form != 'dt_yellow' else (80, 255, 160), 0.35 * k)
        return mix(c2, hi, 0.85) if hsh(x, y, fr, 9) < 0.025 else c2
    if fx == 'hatch' and t < 0.45 and reg in (0, 1, 3): return mix(col, (60, 60, 70), 0.45) if (x + y) % 4 == 0 else col
    return col

def recolor(form, th, im, cell, mask_out=None):
    a = np.array(im.convert('RGBA')); h, w = a.shape[:2]
    cols = {}
    for y, x in zip(*np.nonzero(a[:, :, 3])):
        c = tuple(int(v) for v in a[y, x, :3])
        if c not in cols: cols[c] = classify(form, c)
    F = th['forms'][form]; base = THEMES_BASE[form]
    out = a.copy(); m = np.zeros((h, w), np.uint8) if mask_out else None
    for y, x in zip(*np.nonzero(a[:, :, 3])):
        c = tuple(int(v) for v in a[y, x, :3]); reg, t = cols[c]
        stops = F.get(REG[reg]) or base.get(REG[reg])
        col = ramp(stops, t) if stops else c
        cx = x % cell if cell else x; fr = x // cell if cell else 0
        out[y, x, :3] = material(th['fx'], col, reg, t, cx, y, fr, h, form, th)
        if m is not None: m[y, x] = 40 * (reg + 1)
    if mask_out: Image.fromarray(m, 'L').save(mask_out, optimize=True)
    return Image.fromarray(out, 'RGBA')
# regions a theme leaves unset keep the source colours
THEMES_BASE = {f: {} for f in FORMS}

def strips(form): return sorted(p for p in glob.glob(os.path.join(ROOT, 'assets', form, '*.png')))

def build(th):
    tag = th['tag']; n = 0
    for form in FORMS:
        d = os.path.join(OUT, tag, form); os.makedirs(d, exist_ok=True); os.makedirs(os.path.join(MASKS, form), exist_ok=True)
        for p in strips(form):
            name = os.path.basename(p); im = Image.open(p)
            if name in SKIP: im.save(os.path.join(d, name)); n += 1; continue
            cell = CELL if (not name.startswith('portrait') and im.width % CELL == 0) else 0
            mo = os.path.join(MASKS, form, name) if not os.path.exists(os.path.join(MASKS, form, name)) else None
            recolor(form, th, im, cell, mo).save(os.path.join(d, name), optimize=True); n += 1
    # team portraits (Red | Blue | Yellow | White, the same layout as assets/dinothunder/portrait_*)
    big = [Image.open(os.path.join(OUT, tag, f, 'portrait_large.png')).convert('RGBA') for f in FORMS]
    team_img = Image.new('RGBA', (4 * 88, 112), (0, 0, 0, 0))
    for i, im in enumerate(big):
        k = min(88 / im.width, 104 / im.height); s = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST)
        team_img.paste(s, (i * 88 + (88 - s.width) // 2, 112 - s.height))
    team_img.save(os.path.join(OUT, tag, 'portrait_large.png'))
    k = min(62 / team_img.width, 34 / team_img.height); team_img.resize((round(team_img.width * k), round(team_img.height * k)), Image.NEAREST).save(os.path.join(OUT, tag, 'portrait_small.png'))
    contact(th)
    return n

def contact(th):
    """docs/msv1/dino/skins/<tag>.png: base row vs skin row, four forms × idle / attack / run / special pose"""
    os.makedirs(DOCS, exist_ok=True)
    picks = {'dt_red': ['idle', 'staffArc', 'run', 'slam'], 'dt_blue': ['idle', 'crescent', 'run', 'ram'], 'dt_yellow': ['idle', 'crescent', 'run', 'dive'], 'dt_white': ['idle', 'sw4', 'dash', 'longSlash']}
    cw, ch = 520, 544   # half-cells of 130 × 136 at 2×
    sheet = Image.new('RGBA', (16 * cw // 2, 2 * ch + 40), (34, 36, 48, 255)); d = ImageDraw.Draw(sheet)
    d.text((8, 8), f"{th['name']}  ({th['tag']})  - top: base / bottom: skin".replace('—', '-'), fill=(255, 255, 255, 255))
    i = 0
    for form in FORMS:
        for anim in picks[form]:
            for row, src in enumerate([os.path.join(ROOT, 'assets', form, anim + '.png'), os.path.join(OUT, th['tag'], form, anim + '.png')]):
                im = Image.open(src).convert('RGBA'); fr = min(1, im.width // CELL - 1) if im.width >= CELL else 0
                c = im.crop((fr * CELL + 65, 0, fr * CELL + 195, 136)).resize((260, 272), Image.NEAREST)   # the body half of the cell, 2×
                sheet.alpha_composite(c, (i * cw // 2, 40 + row * ch // 2))
            i += 1
    sheet = sheet.crop((0, 0, i * cw // 2, 40 + ch))
    sheet.save(os.path.join(DOCS, th['tag'] + '.png'))

def lineup():
    """docs/msv1/dino/skins/LINEUP.png: base + all 16 skins, the four Rangers side by side (idle frame 0, 2×)"""
    rows = [('base', None)] + [(t['name'], t['tag']) for t in THEMES]
    W, Hh = 4 * 140 * 2 + 300, 150 * 2
    img = Image.new('RGBA', (W, Hh * len(rows)), (34, 36, 48, 255)); d = ImageDraw.Draw(img)
    for r, (name, tag) in enumerate(rows):
        d.text((8, r * Hh + Hh // 2), name.replace('\u2014', '-'), fill=(255, 255, 255, 255))
        for i, form in enumerate(FORMS):
            src = os.path.join(ROOT, 'assets', form, 'idle.png') if not tag else os.path.join(OUT, tag, form, 'idle.png')
            c = Image.open(src).convert('RGBA').crop((65, 0, 195, 136)).resize((260, 272), Image.NEAREST)
            img.alpha_composite(c, (300 + i * 280, r * Hh + 10))
    img.save(os.path.join(DOCS, 'LINEUP.png'))

def rows_js(n=16):
    rows = [{'tag': t['tag'], 'name': t['name'], 'note': t['note'], 'gem': {f: '#%02x%02x%02x' % ramp(t['forms'][f]['suit'], 0.6) for f in FORMS}} for t in THEMES[:n]]
    js = ('// dinoSkinRows.js — GENERATED by tools/dinoskins/build.py (do not edit): the 16 Dino Thunder team skins (cosmetic only).\n'
          'export const DINO_SKIN_ROWS = ' + json.dumps(rows, ensure_ascii=False, indent=1) + '\n')
    open(os.path.join(ROOT, 'dinoSkinRows.js'), 'w').write(js)

def check(tags=None):
    bad = 0
    for th in THEMES:
        if tags and th['tag'] not in tags: continue
        for form in FORMS:
            for p in strips(form):
                q = os.path.join(OUT, th['tag'], form, os.path.basename(p))
                if not os.path.exists(q): print('MISSING', q); bad += 1; continue
                a, b = np.array(Image.open(p).convert('RGBA')), np.array(Image.open(q).convert('RGBA'))
                if a.shape != b.shape or not np.array_equal(a[:, :, 3] > 0, b[:, :, 3] > 0): print('GEOMETRY', q); bad += 1
    print('check:', 'OK' if not bad else f'{bad} problems'); return bad

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--rows' in args: rows_js(int(args[args.index('--rows') + 1])); sys.exit(0)   # the rows file for the first N themes (one commit per 4)
    if '--check' in args: sys.exit(1 if check([a for a in args if a != '--check']) else 0)
    want = set(args)
    for th in THEMES:
        if want and th['tag'] not in want: continue
        print(th['tag'], build(th), 'images')
    rows_js(); lineup()
    sys.exit(1 if check(want or None) else 0)
