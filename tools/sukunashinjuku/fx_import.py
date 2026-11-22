#!/usr/bin/env python3
"""MSV1-SUKUNA — technique effect strips for Ryomen Sukuna (Shinjuku) from the effect sheets the user supplied.

Sources (copied unchanged into assets/incoming/sukuna_shinjuku/fx/):
  attack_effects_pack_gds.png   "Attack Effects Pack" (Game Developer Studio) — cyan slashes on a patterned navy board
  fire_eruption_boltanim.png    fire eruption (boltanim, MUGEN effect sheet)
  fire_explosion_boltanim.png   fire explosion (boltanim)
  fire_charge_boltanim.png      fire charge (boltanim)

Output: assets/sukuna_shinjuku/fx/<key>.png — one horizontal strip per effect, uniform cells, plus sukunaShinjukuFxSheets.js
(the manifest the renderer reads). The slashes are keyed off their board and painted in his default cut colours (deep
crimson → rose → white); fire keeps the sheet's own colours. tools/sukunaskins/build.py recolours every strip per skin.
Re-runnable; deterministic (no randomness).
  python3 tools/sukunashinjuku/fx_import.py
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/incoming/sukuna_shinjuku/fx')
OUT = os.path.join(ROOT, 'assets/sukuna_shinjuku/fx')
JS = os.path.join(ROOT, 'sukunaShinjukuFxSheets.js')

CUT_STOPS = ['#5a0710', '#b3243a', '#f2c9bd', '#ffffff']   # default cut colours, dark → light (his crimson-and-white)


def hx(s): return np.array([int(s[i:i + 2], 16) for i in (1, 3, 5)], np.float32)


def ramp(stops, t):
    S = np.stack([hx(s) for s in stops]); t = np.clip(t, 0, 1) * (len(S) - 1)
    i = np.minimum(t.astype(int), len(S) - 2); f = (t - i)[..., None]
    return S[i] * (1 - f) + S[i + 1] * f


def slash_frames():
    """cyan board → RGBA; frames = connected blobs (dilated so a frame's droplets stay with it), pixels kept per blob"""
    im = np.array(Image.open(os.path.join(SRC, 'attack_effects_pack_gds.png')).convert('RGB')).astype(np.float32)
    I = np.clip((np.maximum(im[..., 1], im[..., 2]) - 78) / 150, 0, 1)   # board pattern tops out ≈ 73
    rgba = np.zeros(im.shape[:2] + (4,), np.uint8)
    # tone: the pack's cyan edges (low red) → crimson / rose, its white cores (high red) → white
    T = np.clip(0.3 * I + 0.7 * (im[..., 0] / 255.0), 0, 1)
    rgba[..., :3] = np.clip(np.round(ramp(CUT_STOPS, T)), 0, 255).astype(np.uint8)
    rgba[..., 3] = np.round(np.clip(I * 1.6, 0, 1) * 255).astype(np.uint8)
    mask = I > 0.08

    def band(y0, y1, merge=()):
        m = mask.copy(); m[:y0] = False; m[y1:] = False
        lab, _ = nd.label(nd.binary_dilation(m, iterations=10))
        objs = nd.find_objects(lab)
        ids = [i + 1 for i, sl in enumerate(objs) if sl is not None and (m[sl] & (lab[sl] == i + 1)).sum() >= 60]
        boxes = {i: objs[i - 1] for i in ids}
        order = sorted(ids, key=lambda i: (boxes[i][0].start // 80, boxes[i][1].start))
        groups = [[i] for i in order]
        for a, b in merge:   # merge group b into a (indices in reading order)
            groups[a] += groups[b]
        groups = [g for k, g in enumerate(groups) if k not in {b for _, b in merge}]
        frames = []
        for g in groups:
            sel = np.isin(lab, g) & m
            ys, xs = np.nonzero(sel)
            y0_, y1_, x0_, x1_ = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            fr = rgba[y0_:y1_, x0_:x1_].copy(); fr[~sel[y0_:y1_, x0_:x1_]] = 0
            frames.append(Image.fromarray(fr))
        return frames
    return {
        'slashArc': (band(515, 790), 0.5, 'center'),              # 7: rising arc → spray (Cleave contact)
        'slashCres': (band(1750, 2045, merge=[(5, 6)]), 0.5, 'center'),   # 6: the big crescent (World-Cutting Slash)
        'slashH': (band(2455, 2650), 0.35, 'center'),             # 4: horizontal sweep (Dismantle in flight)
    }


def grid(path, xs, ys, cells, scale, anchor, rot=0):
    """frames overlap their neighbours' cells on these sheets, so each opaque blob goes to the cell its centre falls in
    (whole blob kept — nothing clipped at a grid line)"""
    a = np.array(Image.open(os.path.join(SRC, path)).convert('RGBA'))
    lab, n = nd.label(a[..., 3] > 8)
    cen = nd.center_of_mass(np.ones(lab.shape), lab, range(1, n + 1))
    cell_of = {i + 1: (int(np.searchsorted(ys, cy, 'right') - 1), int(np.searchsorted(xs, cx, 'right') - 1)) for i, (cy, cx) in enumerate(cen)}
    out = []
    for (r, c) in cells:
        sel = np.isin(lab, [i for i, rc in cell_of.items() if rc == (r, c)])
        fr = a.copy(); fr[~sel] = 0
        yy, xx = np.nonzero(fr[..., 3] > 8)
        im = Image.fromarray(fr[yy.min():yy.max() + 1, xx.min():xx.max() + 1])
        out.append(im.rotate(rot, expand=True) if rot else im)
    return out, scale, anchor


def boxes(path, bxs, scale, anchor, rot=0):
    a = np.array(Image.open(os.path.join(SRC, path)).convert('RGBA'))
    out = []
    for (y0, x0, y1, x1) in bxs:
        fr = a[y0:y1, x0:x1]; yy, xx = np.nonzero(fr[..., 3] > 8)
        im = Image.fromarray(fr[yy.min():yy.max() + 1, xx.min():xx.max() + 1])
        out.append(im.rotate(rot, expand=True) if rot else im)
    return out, scale, anchor


def fire_frames():
    return {
        # Fuga explosion: the eruption pillar (rows 1-2), burning out last
        'fugaPillar': grid('fire_eruption_boltanim.png', [0, 314, 621, 915], [0, 385, 770],
                           [(0, 0), (0, 1), (0, 2), (1, 0), (1, 2), (1, 1)], 0.45, 'bottom'),
        # Fuga arrow in flight: the four flame jets turned on their side (wide head forward)
        'fugaFlame': boxes('fire_explosion_boltanim.png', [(157, 6, 451, 152), (153, 162, 451, 304), (161, 312, 451, 459), (163, 469, 450, 597)],
                           0.4, 'center', rot=-90),
        # Fuga gather: embers between his hands
        'fugaEmbers': boxes('fire_explosion_boltanim.png', [(13, 30, 143, 161), (8, 184, 140, 324), (13, 356, 145, 501)], 0.4, 'center'),
        # fire patch: the ground blaze (charge sheet, 3 × 3)
        'fireBlaze': grid('fire_charge_boltanim.png', [0, 177, 369, 559], [0, 179, 397, 600],
                          [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1), (2, 2)], 0.4, 'bottom'),
    }


def strip(frames, scale, anchor):
    fr = [f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS) for f in frames]
    W, H = max(f.width for f in fr), max(f.height for f in fr)
    sheet = Image.new('RGBA', (W * len(fr), H), (0, 0, 0, 0))
    for i, f in enumerate(fr):
        x = i * W + (W - f.width) // 2
        y = (H - f.height) // 2 if anchor == 'center' else H - f.height
        sheet.alpha_composite(f, (x, y))
    return sheet, W, H


def main():
    os.makedirs(OUT, exist_ok=True)
    man = {}
    for key, (frames, scale, anchor) in {**slash_frames(), **fire_frames()}.items():
        sh, W, H = strip(frames, scale, anchor)
        sh.save(os.path.join(OUT, key + '.png'), optimize=True)
        man[key] = {'sheet': f'./assets/sukuna_shinjuku/fx/{key}.png', 'w': W, 'h': H, 'n': len(frames), 'anchor': anchor}
        print(f'  {key:11s} {len(frames)} frames  cell {W}x{H}  ({anchor})')
    with open(JS, 'w') as f:
        f.write('// sukunaShinjukuFxSheets.js — GENERATED by tools/sukunashinjuku/fx_import.py (do not hand-edit).\n'
                '// MSV1-SUKUNA animated technique effects: horizontal strips of n cells (w × h), anchor centre / bottom.\n'
                '// Sources + credits: docs/msv1/sukuna/CREDITS.md. Skins ship premade recolours (tools/sukunaskins/build.py).\n'
                f'export const SKS_FX_ANIM = {json.dumps(man)}\n')


if __name__ == '__main__':
    main()
