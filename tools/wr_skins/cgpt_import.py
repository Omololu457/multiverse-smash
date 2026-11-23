#!/usr/bin/env python3
"""tools/wr_skins/cgpt_import.py — puts the 20 ChatGPT-version Ninja Storm skins (ninja_storm_cgpt) on the
MS_V1 Ranger (windrangers).  COSMETIC ONLY.

  Shane  (ns_red)    = the ChatGPT skin, COPIED byte-for-byte from assets/ninja_storm_cgpt/skins/<tag>/ (those are
                       palette swaps of the very same ns_red strips — same files, sizes, alpha).
  Dustin (ns_yellow) = his OWN strips (assets/ns_yellow) recoloured with the ChatGPT recipe (tools/ns_cgpt/build_skins.py
                       functions, unchanged) in the OPPOSITE colourway from tools/wr_skins/cgpt_dustin.json.
                       ns_yellow is an exact 5-tone palette swap of ns_red (checked below), so his suit tones are mapped
                       onto the Red ramp first and the recipe sees exactly what it sees for Shane.
  portrait_{large,small}.png at the skin root = Shane | Dustin diagonal split (the select-screen preview).

Output: assets/windrangers/skins/cg_<tag>/{ns_red,ns_yellow}/*.png + portraits, windrangersCgptSkins.js (rows).
    python3 tools/wr_skins/cgpt_import.py [tag ...]      (--check: verify only)
"""
import importlib.util, json, os, shutil, sys, colorsys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
spec = importlib.util.spec_from_file_location('cgpt_bs', os.path.join(ROOT, 'tools/ns_cgpt/build_skins.py'))
bs = importlib.util.module_from_spec(spec); spec.loader.exec_module(bs)
CG = os.path.join(ROOT, 'assets/ninja_storm_cgpt/skins')
RED, YEL = os.path.join(ROOT, 'assets/ns_red'), os.path.join(ROOT, 'assets/ns_yellow')
OUT = os.path.join(ROOT, 'assets/windrangers/skins')
CG_SPEC = json.load(open(os.path.join(ROOT, 'tools/ns_cgpt/skins.json')))['skins']
DUSTIN = json.load(open(os.path.join(os.path.dirname(__file__), 'cgpt_dustin.json')))['dustin']
Y2R = {(231, 206, 41): (231, 41, 41), (198, 173, 24): (198, 24, 24), (156, 132, 16): (181, 0, 8), (123, 99, 8): (148, 0, 8), (90, 57, 0): (90, 0, 0)}
CELL = 260
JS = os.path.join(ROOT, 'windrangersCgptSkins.js')


def strip_files():
    return sorted(f for f in os.listdir(RED) if f.endswith('.png') and '__edo' not in f)


def dustin_spec(sk):
    d = dict(sk); d.update({k: v for k, v in DUSTIN[sk['tag']].items() if k != 'look'})
    if 'material' in DUSTIN[sk['tag']] and DUSTIN[sk['tag']]['material'] is None: d['material'] = None
    return d


def material(px, x, y, fi, sk, c0, suit):
    mat = sk.get('material')
    if mat == 'darkstars':
        if c0 not in bs.SUIT: return px
        r = bs.hash3(x, y, fi, 7)
        if r < 0.035: return (10, 12, 30) if r < 0.02 else (60, 70, 140)
        return px
    if mat == 'embers' and sk.get('embers'):
        if c0 in bs.SUIT and bs.hash3(x, y, fi, 7) < 0.04: return tuple(sk['embers'])
        return px
    return bs.material(px, x, y, fi, sk, c0, suit)


def recolor(src, dst, sk, cell_w, pre=None):
    im = Image.open(src).convert('RGBA'); w, h = im.size
    m, suit, fx = bs.build_map(sk); px = im.load()
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] == 0: continue
            c0 = p[:3]
            if pre: c0 = pre.get(c0, c0)
            c = bs.recolor_px(c0, m, suit, fx, sk)
            fi, lx = (x // cell_w, x % cell_w) if cell_w else (0, x)
            px[x, y] = (*material(c, lx, y, fi, sk, c0, suit), p[3])
    im.save(dst, optimize=True)


def split_portrait(a_path, b_path, out):
    a = Image.open(a_path).convert('RGBA'); b = Image.open(b_path).convert('RGBA')
    w, h = a.size; c = a.copy(); pb = b.load(); pc = c.load()
    for y in range(h):
        for x in range(w):
            if x > w * (0.62 - 0.24 * y / h): pc[x, y] = pb[x, y]
    for y in range(h):
        x = int(w * (0.62 - 0.24 * y / h))
        if 0 <= x < w and pc[x, y][3] > 0: pc[x, y] = (255, 255, 255, 255)
    c.save(out, optimize=True)


def lab(c):
    def f(t): return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    r, g, b = [((v / 255 + 0.055) / 1.055) ** 2.4 if v / 255 > 0.04045 else v / 255 / 12.92 for v in c]
    X, Y, Z = (r * .4124 + g * .3576 + b * .1805) / .9505, r * .2126 + g * .7152 + b * .0722, (r * .0193 + g * .1192 + b * .9505) / 1.089
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))


def delta_e(a, b): return sum((p - q) ** 2 for p, q in zip(lab(a), lab(b))) ** 0.5


def check():
    """yellow = red under the 5-tone map (strips), every Shane file byte-identical to the ChatGPT one, alpha identical,
    and Shane vs Dustin suits clearly different (ΔE of the mid suit tone ≥ 40)."""
    import numpy as np
    probs, files = [], strip_files()
    for f in files:
        if f.startswith('portrait'): continue
        a = np.array(Image.open(os.path.join(RED, f)).convert('RGBA')); b = np.array(Image.open(os.path.join(YEL, f)).convert('RGBA'))
        for yv, rv in Y2R.items(): b[(b[..., :3] == yv).all(-1) & (b[..., 3] > 0), :3] = rv
        if a.shape != b.shape or (a != b).any(): probs.append(f'ns_yellow != ns_red under the tone map: {f}')
    pairs = []
    for sk in CG_SPEC:
        t = sk['tag']; d = os.path.join(OUT, 'cg_' + t)
        for f in files:
            sa, da = os.path.join(CG, t, f), os.path.join(d, 'ns_red', f)
            if not os.path.exists(da) or open(sa, 'rb').read() != open(da, 'rb').read(): probs.append(f'{t}: Shane {f} not a byte copy')
            yd = os.path.join(d, 'ns_yellow', f)
            if not os.path.exists(yd): probs.append(f'{t}: Dustin {f} missing'); continue
            A = np.array(Image.open(os.path.join(YEL, f)).convert('RGBA'))[..., 3]; B = np.array(Image.open(yd).convert('RGBA'))[..., 3]
            if A.shape != B.shape or (A != B).any(): probs.append(f'{t}: Dustin {f} alpha changed')
        for p in ('portrait_large.png', 'portrait_small.png'):
            if not os.path.exists(os.path.join(d, p)): probs.append(f'{t}: {p} missing')
        s1 = bs.ramp(bs.hx(sk['suit']))[1]; s2 = bs.ramp(bs.hx(dustin_spec(sk)['suit']))[1]
        de = delta_e(s1, s2); pairs.append((t, round(de, 1)))
        if de < 40: probs.append(f'{t}: Shane / Dustin suits too close (ΔE {de:.1f})')
    return probs, pairs


def write_js():
    rows = []
    for sk in CG_SPEC:
        ds = dustin_spec(sk)
        rows.append({'tag': 'cg_' + sk['tag'], 'name': sk['name'], 'cgpt': sk['tag'], 'classification': 'ChatGPT-Version Skin',
                     'fx': sk['fx'], 'formFx': {'ns_red': sk['fx'], 'ns_yellow': ds['fx']},
                     'smoke': {'ns_red': sk['suit'], 'ns_yellow': ds['suit']}, 'dustin': DUSTIN[sk['tag']]['look']})
    body = ',\n'.join('  ' + json.dumps(r, ensure_ascii=False) for r in rows)
    open(JS, 'w').write('// GENERATED by tools/wr_skins/cgpt_import.py — do not hand-edit.\n'
                        '// The 20 ChatGPT-version (ninja_storm_cgpt) skins on the MS_V1 Ranger (windrangers). COSMETIC ONLY:\n'
                        '// Shane = the ChatGPT skin copied as-is, Dustin = the opposite colourway (tools/wr_skins/cgpt_dustin.json).\n'
                        'export const WR_CGPT_SKIN_ROWS = [\n' + body + '\n]\n')


def main():
    if '--check' in sys.argv:
        probs, pairs = check(); print('ΔE Shane/Dustin:', pairs); print('problems:', len(probs)); [print(' ', p) for p in probs[:30]]
        sys.exit(1 if probs else 0)
    only = set(a for a in sys.argv[1:] if not a.startswith('--'))
    files = strip_files()
    for sk in CG_SPEC:
        if only and sk['tag'] not in only: continue
        t = sk['tag']; d = os.path.join(OUT, 'cg_' + t)
        for form in ('ns_red', 'ns_yellow'): os.makedirs(os.path.join(d, form), exist_ok=True)
        ds = dustin_spec(sk)
        for f in files:
            shutil.copyfile(os.path.join(CG, t, f), os.path.join(d, 'ns_red', f))
            strip = not (f.startswith('proj_') or f.startswith('fx_') or f.startswith('portrait'))
            recolor(os.path.join(YEL, f), os.path.join(d, 'ns_yellow', f), ds, CELL if strip else None, pre=Y2R)
        for p in ('portrait_large.png', 'portrait_small.png'):
            split_portrait(os.path.join(d, 'ns_red', p), os.path.join(d, 'ns_yellow', p), os.path.join(d, p))
        print('skin', t, len(files), '×2')
    write_js()


if __name__ == '__main__':
    main()
