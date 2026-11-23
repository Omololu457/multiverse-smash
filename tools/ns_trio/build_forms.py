#!/usr/bin/env python3
"""tools/ns_trio/build_forms.py — the three Ninja Storm trio forms' art, built from the MS_V1 Shane sheets (assets/ns_red).

The owner: "literally copy and paste [the MS_V1 Rangers], change the colour to match them, change the symbol to match them".
  ns_blue  = TORI HANSON  — Blue Wind Ranger (water)        : blue suit,  water-drop chest emblem,  water-cyan effects
  ns_navy  = BLAKE BRADLEY — Navy Thunder Ranger (thunder)  : navy suit,  lightning-bolt emblem,    violet lightning effects
  ns_green = CAM WATANABE — Green Samurai Ranger (samurai)  : green suit, samurai-crest emblem,      green effects
Every file of assets/ns_red (strips, projectiles, FX, portraits, Edo variants) is recoloured with the ChatGPT-version recipe
(tools/ns_cgpt/build_skins.py functions, imported unchanged): the 5-tone suit ramp, silver, gold trim and effect hues are
remapped; geometry and alpha are untouched. The chest emblem (a ~5×5 white patch with the Wind glyph, found per frame as
small silver islands enclosed by suit colour) is redrawn from the form's 5×5 template, inside the same pixels.
Output: assets/<form>/*.png + assets/ns_trio/portrait_{large,small}.png (3-way split).   python3 tools/ns_trio/build_forms.py [--check]
"""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
spec = importlib.util.spec_from_file_location('cgpt_bs', os.path.join(ROOT, 'tools/ns_cgpt/build_skins.py'))
bs = importlib.util.module_from_spec(spec); spec.loader.exec_module(bs)
RED = os.path.join(ROOT, 'assets/ns_red')
CELL = 260
METAL_C = [(255, 255, 255), (198, 198, 198), (140, 140, 140)]
T = lambda *rows: [[1 if ch == '1' else 0 for ch in r] for r in rows]
FORMS = {
  'ns_blue':  {'name': 'Tori', 'suit': '#2a78f0', 'dark': '#000000', 'metal': '#ffffff', 'accent': '#de9c21', 'fx': '#3cd2ff', 'material': None,
               'emblem': T('..1..', '..1..', '.111.', '.111.', '..1..'), 'glyph': '#1450c8'},
  'ns_navy':  {'name': 'Blake', 'suit': '#26347a', 'dark': '#000000', 'metal': '#ffffff', 'accent': '#c8ccd8', 'fx': '#b98cff', 'material': None,
               'emblem': T('...11', '..11.', '.1111', '.11..', '11...'), 'glyph': '#e8a010'},
  'ns_green': {'name': 'Cam', 'suit': '#22a84a', 'dark': '#000000', 'metal': '#ffffff', 'accent': '#e0b030', 'fx': '#7dff8c', 'material': None,
               'emblem': T('.111.', '1...1', '1.1.1', '1...1', '.111.'), 'glyph': '#0c6a2a'},
}
SUITSET = set(bs.SUIT)


def emblem_boxes(a, cw):
    """per frame: the bbox of the chest emblem (silver islands enclosed by suit colour), or None"""
    rgb, al = a[..., :3], a[..., 3] > 0
    metal = np.zeros(al.shape, bool)
    for c in METAL_C: metal |= (rgb == c).all(-1) & al
    suit = np.zeros(al.shape, bool)
    for c in bs.SUIT: suit |= (rgb == c).all(-1) & al
    lab, n = ndimage.label(metal, structure=np.ones((3, 3)))
    out = {}
    for i in range(1, n + 1):
        m = lab == i; k = int(m.sum())
        if k > 24: continue
        ring = ndimage.binary_dilation(m, structure=np.ones((3, 3))) & ~m
        rs = ring.sum()
        if not rs or (ring & ~al).any(): continue
        if (ring & suit).sum() / rs < 0.6: continue
        if (ring & ~(suit | metal)).sum() > 1: continue
        ys, xs = np.nonzero(m); fi = int(xs.mean()) // cw
        b = out.get(fi)
        box = [ys.min(), xs.min(), ys.max() + 1, xs.max() + 1]
        if b and (box[1] - b[3] > 2 or b[1] - box[3] > 2 or box[0] - b[2] > 2 or b[0] - box[2] > 2): continue
        out[fi] = box if not b else [min(b[0], box[0]), min(b[1], box[1]), max(b[2], box[2]), max(b[3], box[3])]
    # an emblem is 3..7 px each way
    return {fi: b for fi, b in out.items() if 3 <= b[2] - b[0] <= 7 and 3 <= b[3] - b[1] <= 7}


def draw_emblem(o, src, box, F, m):
    y0, x0, y1, x1 = box; h, w = y1 - y0, x1 - x0; tpl = F['emblem']; glyph = bs.hx(F['glyph'])
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = tuple(src[y, x, :3])
            if src[y, x, 3] == 0 or not (c in METAL_C or c in SUITSET): continue
            ty, tx = min(4, (y - y0) * 5 // h), min(4, (x - x0) * 5 // w)
            o[y, x, :3] = glyph if tpl[ty][tx] else (255, 255, 255)


def build(form):
    F = FORMS[form]; d = os.path.join(ROOT, 'assets', form); os.makedirs(d, exist_ok=True)
    m, suit, fx = bs.build_map(F)
    stats = {'files': 0, 'emblems': 0}
    for f in sorted(os.listdir(RED)):
        if not f.endswith('.png'): continue
        im = Image.open(os.path.join(RED, f)).convert('RGBA'); src = np.array(im)
        strip = not (f.startswith('proj_') or f.startswith('fx_') or f.startswith('portrait'))
        px = im.load(); w, h = im.size
        for y in range(h):
            for x in range(w):
                p = px[x, y]
                if p[3]: px[x, y] = (*bs.recolor_px(p[:3], m, suit, fx, F), p[3])
        o = np.array(im)
        if strip and src.shape[1] % CELL == 0:
            for fi, box in emblem_boxes(src, CELL).items(): draw_emblem(o, src, box, F, m); stats['emblems'] += 1
        Image.fromarray(o).save(os.path.join(d, f), optimize=True); stats['files'] += 1
    return stats


def trio_portrait(name):
    ims = [Image.open(os.path.join(ROOT, 'assets', k, name)).convert('RGBA') for k in FORMS]
    w, h = ims[0].size; c = ims[0].copy(); pc = c.load(); p1, p2 = ims[1].load(), ims[2].load()
    cut = lambda y, k: w * (k - 0.16 * y / h)     # two diagonal seams: Tori | Blake | Cam
    for y in range(h):
        for x in range(w):
            if x > cut(y, 0.80): pc[x, y] = p2[x, y]
            elif x > cut(y, 0.47): pc[x, y] = p1[x, y]
    for y in range(h):
        for k in (0.47, 0.80):
            x = int(cut(y, k))
            if 0 <= x < w and pc[x, y][3] > 0: pc[x, y] = (255, 255, 255, 255)
    os.makedirs(os.path.join(ROOT, 'assets/ns_trio'), exist_ok=True)
    c.save(os.path.join(ROOT, 'assets/ns_trio', name), optimize=True)


def check():
    probs = []
    for form in FORMS:
        for f in sorted(os.listdir(RED)):
            if not f.endswith('.png'): continue
            a = np.array(Image.open(os.path.join(RED, f)).convert('RGBA'))[..., 3]
            p = os.path.join(ROOT, 'assets', form, f)
            if not os.path.exists(p): probs.append(f'{form}/{f} missing'); continue
            b = np.array(Image.open(p).convert('RGBA'))[..., 3]
            if a.shape != b.shape or (a != b).any(): probs.append(f'{form}/{f} alpha changed')
    return probs


if __name__ == '__main__':
    if '--check' in sys.argv:
        p = check(); print('problems:', len(p)); [print(' ', x) for x in p[:20]]; sys.exit(1 if p else 0)
    only = [a for a in sys.argv[1:] if a in FORMS]
    for form in (only or FORMS): print(form, build(form))
    for n in ('portrait_large.png', 'portrait_small.png'): trio_portrait(n)
    print('check problems:', len(check()))
