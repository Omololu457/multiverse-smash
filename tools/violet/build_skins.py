#!/usr/bin/env python3
"""Violet Parr: PRECOMPUTED palette-swap skins -> assets/violet/skins/<tag>/{<strip>.png, fx/*.png, portrait.png}.

Cosmetic only. Geometry, pivots and frame counts are identical; every output pixel comes from the same source pixel
through a per-unique-colour lookup. One region rule decides which black pixels are SUIT TRIM (gloves, leggings, boots):
  * inside the figure (no transparent 4-neighbour, so it is not the outline), and
  * below the HEAD BAND (the top 30 % of the frame's bounding box, which holds the mask and hair)
  * on upright frames only (bbox height > 1.15 × width). Curled / lying frames keep their blacks.
The rule is applied the same way to the dark-blue rim highlight (0,56,120) that sits on black regions.
Never recoloured: skin tones, eye white, the "i" logo / belt gold and white, the outline, the mask and the hair.
Invisible strips (R7 / R9 / R11 palette, which never appears on visible frames) are tinted toward the skin's key colour
with their luminance kept, so a vanished Violet matches her suit. The FX strips (rings, dome, shell, trap, hit) follow
the skin's ring colours.
Usage: build_skins.py [--root DIR]   (writes docs/violet/skins_contact.png for review)"""
import os, sys, json, colorsys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from incredibles_skin_sets import SETS, bake_stars, hexc, lerp

ROOT = sys.argv[sys.argv.index('--root') + 1] if '--root' in sys.argv else os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = os.path.join(ROOT, 'assets', 'violet')
SPR = json.load(open(os.path.join(ROOT, 'docs', 'violet', 'source_rects.json'))) if os.path.exists(os.path.join(ROOT, 'docs', 'violet', 'source_rects.json')) else None

RED = [(216, 16, 56), (176, 16, 48), (144, 16, 40)]          # suit ramp: highlight, mid, shadow
BLACK, RIM = (0, 0, 0), (0, 56, 120)
INV = [(64, 0, 96), (80, 0, 160), (80, 56, 208), (104, 56, 136), (128, 0, 168), (184, 0, 168), (184, 96, 144),
       (184, 120, 232), (192, 184, 240), (208, 208, 248), (248, 128, 248)]                # invisible-only palette
FX_COLS = [(248, 248, 248), (184, 208, 248), (120, 160, 248), (200, 80, 200), (144, 144, 168), (136, 136, 144)]
INV_STRIPS = {'vanish', 'inv_idle', 'inv_walk', 'inv_crouch', 'vPhase'}

SKINS = {
  # Incredibles 2: suit red -> near-black, black trim -> red, mask stays black, "i" logo stays orange / white.
  'inc2': {'suit': [(70, 62, 78), (46, 40, 54), (26, 22, 32)], 'trim': (200, 24, 48), 'rim': (240, 80, 96),
           'inv_key': (190, 30, 70), 'fx': {(248, 248, 248): (255, 236, 236), (184, 208, 248): (248, 168, 176), (120, 160, 248): (224, 64, 80),
           (200, 80, 200): (150, 20, 44), (144, 144, 168): (120, 90, 96), (136, 136, 144): (110, 84, 90)},
           'ring': '#f04060', 'flash': '#ffd8de'},
  # Midnight: suit -> navy, trim -> deep violet, rings -> violet.
  'midnight': {'suit': [(64, 96, 176), (38, 62, 136), (22, 38, 92)], 'trim': (78, 28, 128), 'rim': (132, 80, 200),
               'inv_key': (70, 60, 190), 'fx': {(248, 248, 248): (240, 228, 255), (184, 208, 248): (204, 168, 248), (120, 160, 248): (150, 96, 232),
               (200, 80, 200): (96, 40, 168), (144, 144, 168): (110, 96, 140), (136, 136, 144): (100, 88, 130)},
               'ring': '#9a5cff', 'flash': '#e6d8ff'},
}

# Ranger-style crossover palettes (shared with Dash / Elastigirl): tools/incredibles_skin_sets.py.
# FX strips follow the skin's ring colour (light → white-ish, dark → deep); invisible frames tint toward the suit.
def _fx_map(ring):
    r = tuple(int(ring[i:i + 2], 16) for i in (1, 3, 5))
    return {(248, 248, 248): lerp(r, (255, 255, 255), 0.88), (184, 208, 248): lerp(r, (255, 255, 255), 0.5), (120, 160, 248): r,
            (200, 80, 200): lerp(r, (0, 0, 0), 0.4), (144, 144, 168): lerp(r, (128, 128, 128), 0.6), (136, 136, 144): lerp(r, (120, 120, 120), 0.65)}
for _s in SETS:
    SKINS[_s['tag']] = {'suit': _s['suit'], 'trim': _s['trim'], 'rim': _s['trimHi'], 'inv_key': _s['suit'][1] if sum(_s['suit'][1]) > 120 else tuple(int(_s['ring'][i:i + 2], 16) for i in (1, 3, 5)),
                        'fx': _fx_map(_s['ring']), 'ring': _s['ring'], 'flash': hexc(lerp(tuple(int(_s['ring'][i:i + 2], 16) for i in (1, 3, 5)), (255, 255, 255), 0.82)),
                        'stars': _s.get('stars'), 'density': _s.get('density', 0.06) * 1.6}

def tint_inv(c, key):
    """Keep the source luminance, take the hue / saturation of the skin's key colour (invisible frames)."""
    l = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255
    h, _, s = colorsys.rgb_to_hls(*[v / 255 for v in key])
    r, g, b = colorsys.hls_to_rgb(h, max(0.04, min(0.92, l * 1.05)), min(1, s * 0.85))
    return (round(r * 255), round(g * 255), round(b * 255))

def frames_of(name, im):
    n = None
    if SPR and name in SPR.get('anims', {}): n = len(SPR['anims'][name])
    if not n:
        js = open(os.path.join(ROOT, 'violetSprites.js')).read()
        i = js.find('"%s": {' % name); j = js.find('"frames":', i); n = int(js[j + 9:js.find(',', j)])
    return n

def recolor_body(name, im, sk, audit):
    im = im.convert('RGBA'); W, H = im.size; px = im.load(); out = im.copy(); po = out.load()
    n = frames_of(name, im); fw = W // n
    suit = dict(zip(RED, sk['suit']))
    inv = {c: tint_inv(c, sk['inv_key']) for c in INV}
    for f in range(n):
        x0 = f * fw
        xs = [x for x in range(x0, x0 + fw) for y in range(H) if px[x, y][3]]
        ys = [y for x in range(x0, x0 + fw) for y in range(H) if px[x, y][3]]
        if not xs: continue
        bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
        upright = (by1 - by0 + 1) > 1.15 * (bx1 - bx0 + 1)
        head = by0 + 0.30 * (by1 - by0 + 1)
        for x in range(x0, x0 + fw):
            for y in range(H):
                p = px[x, y]
                if not p[3]: continue
                c = p[:3]
                if c in suit: po[x, y] = suit[c] + (p[3],); audit['suit'] += 1; continue
                if c in inv: po[x, y] = inv[c] + (p[3],); audit['inv'] += 1; continue
                if c in (BLACK, RIM) and upright and y > head:
                    interior = all(0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3] and x0 <= x + dx < x0 + fw
                                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    if interior:
                        po[x, y] = (sk['trim'] if c == BLACK else sk['rim']) + (p[3],); audit['trim'] += 1
    audit['stars'] = audit.get('stars', 0) + bake_stars(out, sk, fw)
    return out

def recolor_map(im, m):
    im = im.convert('RGBA'); out = im.copy(); px, po = im.load(), out.load()
    for x in range(im.size[0]):
        for y in range(im.size[1]):
            p = px[x, y]
            if p[3] and p[:3] in m: po[x, y] = m[p[:3]] + (p[3],)
    return out

def main():
    strips = sorted(f[:-4] for f in os.listdir(A) if f.endswith('.png') and f != 'portrait.png')
    report = {}
    for tag, sk in SKINS.items():
        d = os.path.join(A, 'skins', tag); os.makedirs(os.path.join(d, 'fx'), exist_ok=True)
        audit = {'suit': 0, 'trim': 0, 'inv': 0}
        for s in strips:
            recolor_body(s, Image.open(os.path.join(A, s + '.png')), sk, audit).save(os.path.join(d, s + '.png'), optimize=True)
        for fxn in sorted(os.listdir(os.path.join(A, 'fx'))):
            recolor_map(Image.open(os.path.join(A, 'fx', fxn)), sk['fx']).save(os.path.join(d, 'fx', fxn), optimize=True)
        recolor_map(Image.open(os.path.join(A, 'portrait.png')), dict(zip(RED, sk['suit']))).save(os.path.join(d, 'portrait.png'), optimize=True)
        report[tag] = audit
    # contact sheet: idle / heavy / inv_idle / vBall + dome per skin (rows: default, inc2, midnight)
    cols = ['idle', 'heavy', 'up', 'inv_idle', 'vBall']
    rows = [('default', A)] + [(t, os.path.join(A, 'skins', t)) for t in SKINS]
    cells = []
    for _, base in rows:
        r = []
        for c in cols:
            im = Image.open(os.path.join(base, c + '.png')).convert('RGBA'); n = frames_of(c, im); fw = im.size[0] // n
            r.append(im.crop((0, 0, fw, im.size[1])))
        dm = Image.open(os.path.join(base, 'fx', 'dome.png')).convert('RGBA'); r.append(dm.crop((dm.size[0] * 5 // 6, 0, dm.size[0], dm.size[1])))
        cells.append(r)
    cw = max(im.size[0] for r in cells for im in r) * 3; ch = max(im.size[1] for r in cells for im in r) * 3
    sheet = Image.new('RGBA', (cw * len(cells[0]), ch * len(cells)), (0, 128, 128, 255))
    for i, r in enumerate(cells):
        for j, im in enumerate(r):
            big = im.resize((im.size[0] * 3, im.size[1] * 3), Image.NEAREST); sheet.alpha_composite(big, (j * cw, i * ch + ch - big.size[1]))
    sheet.save(os.path.join(ROOT, 'docs', 'violet', 'skins_contact.png'))
    json.dump({t: {'ring': SKINS[t]['ring'], 'flash': SKINS[t]['flash'], 'pixels': report[t]} for t in SKINS},
              open(os.path.join(ROOT, 'docs', 'violet', 'skin_regions.json'), 'w'), indent=1)
    print(json.dumps(report))

main()
