#!/usr/bin/env python3
"""tools/ns_trio/build_skins.py — the Ninja Storm Trio (ns_trio) skins.  COSMETIC ONLY.

Each skin in tools/ns_trio/skins.json recolours ALL THREE forms (ns_blue Tori, ns_navy Blake, ns_green Cam) from the
MS_V1 Shane sheets (assets/ns_red) — the very sheets the forms themselves are built from (build_forms.py) — with the
ChatGPT-version recipe (tools/ns_cgpt/build_skins.py: palette map + material) and the form's OWN chest emblem template
(build_forms.py), redrawn inside the same pixels in the skin's glyph colour. Geometry / alpha unchanged.
Output: assets/ns_trio/skins/<tag>/<form>/*.png + portrait_{large,small}.png (Tori | Blake | Cam split) + nsTrioSkinRows.js.
    python3 tools/ns_trio/build_skins.py [tag ...]        --check: verify only
"""
import importlib.util, json, os, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
bs = _load('cgpt_bs', os.path.join(ROOT, 'tools/ns_cgpt/build_skins.py'))
bf = _load('trio_bf', os.path.join(HERE, 'build_forms.py'))
RED = os.path.join(ROOT, 'assets/ns_red'); OUT = os.path.join(ROOT, 'assets/ns_trio/skins')
SPEC = json.load(open(os.path.join(HERE, 'skins.json')))['skins']
FORMS = ['ns_blue', 'ns_navy', 'ns_green']
CELL = 260
JS = os.path.join(ROOT, 'nsTrioSkinRows.js')


def files():
    return sorted(f for f in os.listdir(RED) if f.endswith('.png') and '__edo' not in f)


def build_one(args):
    tag, form = args
    sk = next(s for s in SPEC if s['tag'] == tag); F = dict(sk[form]); F.setdefault('material', None)
    F['emblem'] = bf.FORMS[form]['emblem']
    d = os.path.join(OUT, tag, form); os.makedirs(d, exist_ok=True)
    m, suit, fx = bs.build_map(F); n = 0
    for f in files():
        im = Image.open(os.path.join(RED, f)).convert('RGBA'); src = np.array(im); px = im.load(); w, h = im.size
        strip = not (f.startswith('proj_') or f.startswith('fx_') or f.startswith('portrait'))
        cw = CELL if strip and w % CELL == 0 else None
        for y in range(h):
            for x in range(w):
                p = px[x, y]
                if not p[3]: continue
                c = bs.recolor_px(p[:3], m, suit, fx, F)
                if cw: c = bs.material(c, x % cw, y, x // cw, F, p[:3], suit)
                px[x, y] = (*c, p[3])
        o = np.array(im)
        if cw:
            for fi, box in bf.emblem_boxes(src, CELL).items(): bf.draw_emblem(o, src, box, F, m)
        Image.fromarray(o).save(os.path.join(d, f), optimize=True); n += 1
    return tag, form, n


def portraits(tag):
    for name in ('portrait_large.png', 'portrait_small.png'):
        ims = [Image.open(os.path.join(OUT, tag, k, name)).convert('RGBA') for k in FORMS]
        w, h = ims[0].size; c = ims[0].copy(); pc = c.load(); p1, p2 = ims[1].load(), ims[2].load()
        cut = lambda y, k: w * (k - 0.16 * y / h)
        for y in range(h):
            for x in range(w):
                if x > cut(y, 0.80): pc[x, y] = p2[x, y]
                elif x > cut(y, 0.47): pc[x, y] = p1[x, y]
        for y in range(h):
            for k in (0.47, 0.80):
                x = int(cut(y, k))
                if 0 <= x < w and pc[x, y][3] > 0: pc[x, y] = (255, 255, 255, 255)
        c.save(os.path.join(OUT, tag, name), optimize=True)


def lab(c):
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    r, g, b = [((v / 255 + 0.055) / 1.055) ** 2.4 if v / 255 > 0.04045 else v / 255 / 12.92 for v in c]
    X, Y, Z = (r * .4124 + g * .3576 + b * .1805) / .9505, r * .2126 + g * .7152 + b * .0722, (r * .0193 + g * .1192 + b * .9505) / 1.089
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))
def dE(a, b): return sum((p - q) ** 2 for p, q in zip(lab(a), lab(b))) ** 0.5


def check():
    probs, pairs = [], {}
    for sk in SPEC:
        t = sk['tag']
        mids = [bs.ramp(bs.hx(sk[k]['suit']))[1] for k in FORMS]; trims = [bs.hx(sk[k]['metal']) for k in FORMS]   # suit OR trim must differ
        de = [round(max(dE(mids[i], mids[j]), dE(trims[i], trims[j])), 1) for i, j in ((0, 1), (0, 2), (1, 2))]; pairs[t] = de
        if min(de) < 25: probs.append(f'{t}: two forms too close (ΔE {de})')
        for k in FORMS:
            for f in files():
                p = os.path.join(OUT, t, k, f)
                if not os.path.exists(p): probs.append(f'{t}/{k}/{f} missing'); continue
                a = np.array(Image.open(os.path.join(RED, f)).convert('RGBA'))[..., 3]; b = np.array(Image.open(p).convert('RGBA'))[..., 3]
                if a.shape != b.shape or (a != b).any(): probs.append(f'{t}/{k}/{f} alpha changed')
        for n in ('portrait_large.png', 'portrait_small.png'):
            if not os.path.exists(os.path.join(OUT, t, n)): probs.append(f'{t}: {n} missing')
    return probs, pairs


def write_js():
    rows = [{'tag': s['tag'], 'name': s['name'], 'look': s['look'], 'formFx': {k: s[k]['fx'] for k in FORMS}, 'smoke': {k: s[k]['suit'] for k in FORMS}} for s in SPEC]
    open(JS, 'w').write('// GENERATED by tools/ns_trio/build_skins.py from tools/ns_trio/skins.json — do not hand-edit.\n'
                        '// The Ninja Storm Trio (ns_trio) skins: one row per skin, each recolours Tori / Blake / Cam. COSMETIC ONLY.\n'
                        'export const TRIO_SKIN_ROWS = [\n' + ',\n'.join('  ' + json.dumps(r, ensure_ascii=False) for r in rows) + '\n]\n')


if __name__ == '__main__':
    if '--check' in sys.argv:
        p, pairs = check(); print('suit ΔE (Tori-Blake, Tori-Cam, Blake-Cam):', pairs); print('problems:', len(p)); [print(' ', x) for x in p[:20]]; sys.exit(1 if p else 0)
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    tags = [s['tag'] for s in SPEC if not only or s['tag'] in only]
    with ProcessPoolExecutor(max_workers=6) as ex:
        for r in ex.map(build_one, [(t, k) for t in tags for k in FORMS]): print('built', *r)
    for t in tags: portraits(t)
    write_js()
    p, pairs = check(); print('ΔE:', pairs); print('check problems:', len(p))
