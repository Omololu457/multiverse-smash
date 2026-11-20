#!/usr/bin/env python3
"""tools/ns_cgpt/build_skins.py — Ninja Storm CGPT (ninja_storm_cgpt): builds all 22 appearances.

  red / yellow  = the two supplied base appearances, copied pixel-for-pixel from the MSV1-sliced strips
                  (assets/ns_red, assets/ns_yellow — one shared frame map, docs/msv1/SPRITE_MAP.md).
  20 skins      = exact PALETTE SWAPS of the Red strips: the 5-tone suit ramp, black, the silver ramp, the gold trim
                  ramp and the effect hues (wind / beam / spark) are remapped; geometry, anchors and alpha are untouched.
                  Materials (stars / glitter / opal / crystal / circuit / shine) are a few deterministic pixels baked into
                  suit pixels (hash of x, y, frame) — no new shapes, no runtime recolouring.

Every strip, projectile and FX sheet is processed, so the Ranger, the clone (drawn from the same strips), projectiles,
weapon effects and the ultimate all follow the skin.  Output: assets/ninja_storm_cgpt/skins/<tag>/*.png + portraits,
assets/ninja_storm_cgpt/portrait_{large,small}.png (Red | Yellow split composite = the roster portrait).

    python3 tools/ns_cgpt/build_skins.py
"""
import colorsys, json, os, shutil, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RED, YEL = os.path.join(ROOT, 'assets/ns_red'), os.path.join(ROOT, 'assets/ns_yellow')
OUT = os.path.join(ROOT, 'assets/ninja_storm_cgpt')
SPEC = os.path.join(os.path.dirname(__file__), 'skins.json')

SUIT = [(231, 41, 41), (198, 24, 24), (181, 0, 8), (148, 0, 8), (90, 0, 0)]          # light → dark (Red sheet)
SUIT_L = [0.92, 0.80, 0.70, 0.56, 0.34]                                               # target lightness factors for the ramp
METAL = {(255, 255, 255): 1.0, (198, 198, 198): 0.78, (140, 140, 140): 0.55, (107, 107, 107): 0.42, (74, 74, 74): 0.29, (66, 66, 66): 0.26}
GOLD = {(231, 189, 41), (222, 156, 33), (173, 99, 24), (239, 148, 0), (255, 214, 90), (247, 247, 115), (222, 189, 90), (181, 148, 49), (189, 156, 66), (181, 148, 57), (181, 140, 49)}
DARK = {(0, 0, 0): 0.0, (8, 0, 0): 0.03, (16, 16, 16): 0.06}


def hx(c):
    c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def hls(c): return colorsys.rgb_to_hls(*(v / 255 for v in c))


def rgb(h, l, s): return tuple(max(0, min(255, round(v * 255))) for v in colorsys.hls_to_rgb(h % 1, max(0, min(1, l)), max(0, min(1, s))))


def ramp(hi, n=5, facs=SUIT_L):
    h, l, s = hls(hi)
    top = facs[0]
    return [rgb(h, l * f / top, min(1, s * (1.0 if f > 0.5 else 1.08))) for f in facs[:n]]


def hash3(x, y, z, salt=0):
    v = (x * 374761393 + y * 668265263 + z * 2147483647 + salt * 1274126177) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65536.0


def build_map(sk):
    suit = [hx(c) for c in sk['ramp']] if 'ramp' in sk else ramp(hx(sk['suit']))
    dark, metal, acc, fx = hx(sk['dark']), hx(sk['metal']), hx(sk['accent']), hx(sk['fx'])
    m = {}
    for i, c in enumerate(SUIT): m[c] = suit[i]
    for c, k in METAL.items(): m[c] = tuple(round(v * k) for v in metal)
    for c, k in DARK.items(): m[c] = tuple(round(dark[i] + (metal[i] - dark[i]) * k) for i in range(3))
    ah, al, as_ = hls(acc)
    for c in GOLD:
        h, l, s = hls(c); m[c] = rgb(ah, l * (al / 0.55 if al < 0.55 else 1) if sk.get('accentKeepL', True) else al, max(as_, s * 0.9) if as_ > 0.15 else as_)
    return m, suit, fx


def recolor_px(c, m, suit, fx, sk):
    if c in m: return m[c]
    h, l, s = hls(c)
    if s < 0.3: return c
    sh, sl, ss = hls(suit[1])
    fh, fl, fs = hls(fx)
    if h < 0.04 or h > 0.93:                       # red effect pixels (suit-coloured sparks / slashes)
        return rgb(sh, l * (0.6 + 0.4 * sl / 0.5) if sl < 0.5 else l, ss * 0.95)
    if 0.48 < h < 0.72:                            # blue wind / beam pixels → the skin's effect hue
        return rgb(fh, l if fs > 0.12 else l * 0.95 + 0.04, fs if fs > 0.12 else s * 0.15)
    if 0.07 < h < 0.18 and sk.get('fxGold', True):  # orange / gold effect pixels → accent hue
        ah, al, as_ = hls(hx(sk['accent'])); return rgb(ah, l, max(as_, 0.2) if as_ > 0.12 else as_)
    return c


def material(px, x, y, fi, sk, c0, suit):
    mat = sk.get('material')
    if not mat or c0 not in SUIT: return px
    tone = SUIT.index(c0)
    r = hash3(x, y, fi, 7)
    if mat == 'stars':
        if r < 0.035: return (255, 255, 255) if r < 0.02 else (190, 255, 210)
    elif mat == 'glitter':
        if r < 0.05: return (255, 255, 255) if r < 0.025 else hx(sk['metal'])
    elif mat == 'opal':
        band = ((x + y * 2) // 6) % 4
        tints = [(255, 230, 240), (220, 255, 240), (230, 230, 255), (255, 245, 210)]
        t = tints[band]; k = 0.30 if tone <= 1 else 0.18
        return tuple(round(px[i] * (1 - k) + t[i] * k) for i in range(3))
    elif mat == 'crystal':
        if tone <= 1 and r < 0.07: return (255, 255, 255)
        if tone >= 3 and (x + y) % 5 == 0: return suit[1]
    elif mat == 'circuit':
        if tone >= 2 and (x % 7 == 0 or y % 9 == 0) and r < 0.75: return hx(sk['accent'])
    elif mat == 'shine':
        if tone == 0 and r < 0.12: return (255, 255, 255)
    elif mat == 'embers':
        if r < 0.04: return (255, 230, 120)
    return px


def recolor_image(src, dst, sk, cell_w=None):
    im = Image.open(src).convert('RGBA'); w, h = im.size
    m, suit, fx = build_map(sk)
    px = im.load()
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] == 0: continue
            c0 = p[:3]
            c = recolor_px(c0, m, suit, fx, sk)
            fi, lx = (x // cell_w, x % cell_w) if cell_w else (0, x)
            c = material(c, lx, y, fi, sk, c0, suit)
            px[x, y] = (*c, p[3])
    im.save(dst, optimize=True)


def composite_portrait(name, out):
    a = Image.open(os.path.join(RED, name)).convert('RGBA'); b = Image.open(os.path.join(YEL, name)).convert('RGBA')
    w, h = a.size; c = a.copy(); pb = b.load(); pc = c.load()
    for y in range(h):
        for x in range(w):
            if x > w * (0.62 - 0.24 * y / h): pc[x, y] = pb[x, y]   # a diagonal split: Red left, Yellow right
    for y in range(h):                                                # a 1-px white seam on the split
        x = int(w * (0.62 - 0.24 * y / h))
        if 0 <= x < w and pc[x, y][3] > 0: pc[x, y] = (255, 255, 255, 255)
    c.save(out, optimize=True)


def main():
    spec = json.load(open(SPEC))
    cell = 260
    files = sorted(f for f in os.listdir(RED) if f.endswith('.png'))
    os.makedirs(OUT, exist_ok=True)
    composite_portrait('portrait_large.png', os.path.join(OUT, 'portrait_large.png'))
    composite_portrait('portrait_small.png', os.path.join(OUT, 'portrait_small.png'))
    only = set(sys.argv[1:])
    for base, srcdir in (('red', RED), ('yellow', YEL)):
        if only and base not in only: continue
        d = os.path.join(OUT, 'skins', base); os.makedirs(d, exist_ok=True)
        for f in files: shutil.copyfile(os.path.join(srcdir, f), os.path.join(d, f))
        print('copied', base, len(files))
    for sk in spec['skins']:
        if only and sk['tag'] not in only: continue
        d = os.path.join(OUT, 'skins', sk['tag']); os.makedirs(d, exist_ok=True)
        for f in files:
            strip = not (f.startswith('proj_') or f.startswith('fx_') or f.startswith('portrait'))
            recolor_image(os.path.join(RED, f), os.path.join(d, f), sk, cell if strip else None)
        print('skin', sk['tag'], len(files))
    write_table(spec)


def write_table(spec):
    # the JS side reads the SAME table (names, classification, FX colours, materials): nsCgptSkinTable.js is generated
    rows = [{k: sk[k] for k in ('tag', 'name', 'classification', 'inspiration', 'notes', 'material', 'suit', 'dark', 'metal', 'accent', 'fx', 'earth') if k in sk} for sk in spec['skins']]
    js = ('// GENERATED by tools/ns_cgpt/build_skins.py from tools/ns_cgpt/skins.json — do not hand-edit.\n'
          '// Ninja Storm CGPT: the 2 supplied base appearances + 20 palette-swap skins (cosmetic only).\n'
          'export const NS_CGPT_BASES = ' + json.dumps(spec['bases']) + '\n'
          'export const NS_CGPT_SKIN_TABLE = ' + json.dumps(rows, indent=1) + '\n')
    open(os.path.join(ROOT, 'nsCgptSkinTable.js'), 'w').write(js)


if __name__ == '__main__':
    main()
