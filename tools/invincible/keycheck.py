#!/usr/bin/env python3
"""tools/invincible/keycheck.py — MSV1-INVINCIBLE phase 6: "all frames used, no dark pixels lost to keying".

For every cell the slicer placed (docs/msv1/invincible/slice_report.json: anims + fx, each cell = source box + offset),
every source pixel that is NOT the sheet background RGB(32,30,39) must be in the strip, opaque, with the same colour.
Dark suit pixels are counted separately (the suit navy (27,30,39) sits 5 levels from the background).
Also: every sheet frame (rows) lands somewhere (coverage) and every strip on disk = frames × cell with no empty frame.
Prints one JSON object (harness/invincible_final.test.mjs reads it)."""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SR = json.load(open(os.path.join(ROOT, 'docs/msv1/invincible/slice_report.json')))
src = np.array(Image.open(os.path.join(ROOT, SR['source'])).convert('RGBA'))
BG = tuple(SR['bg'])
out = {'cells': 0, 'srcPx': 0, 'kept': 0, 'lost': 0, 'changed': 0, 'darkSrc': 0, 'darkKept': 0, 'lostAt': [], 'strips': {}, 'emptyFrames': [],
       'uncovered': [], 'sheetFrames': 0}
for group, base in (('anims', 'assets/invincible'), ('fx', 'assets/invincible/fx')):
    for name, a in SR[group].items():
        p = os.path.join(ROOT, base, name + '.png')
        im = np.array(Image.open(p).convert('RGBA'))
        cw, ch = a['cell']; n = a['frames']
        out['strips'][name] = {'frames': n, 'ok': im.shape[1] == cw * n and im.shape[0] == ch}
        for i in range(n):
            if not (im[:, i * cw:(i + 1) * cw, 3] > 0).any(): out['emptyFrames'].append(f'{name}[{i}]')
        if 'cells' not in a: out.setdefault('derived', []).append(name); continue   # built from other frames' pixels (bigBurst)
        for i, c in enumerate(a['cells']):
            y0, x0, y1, x1 = c['src']; box = src[y0:y1, x0:x1]
            fg = (box[..., 3] > 0) & ~(box[..., :3] == BG).all(-1)
            # the slicer cut each frame as its own connected piece: pixels of a neighbouring piece inside the box are
            # not this frame's — only count pixels that the strip has at all OR that touch this frame's own pixels
            oy, ox = c['dy'], c['dx'] + i * cw
            dst = im[oy:oy + box.shape[0], ox:ox + box.shape[1]]
            if dst.shape[:2] != box.shape[:2]: out['lostAt'].append(f'{name}[{i}] clipped'); continue
            out['cells'] += 1
            ys, xs = np.nonzero(fg)
            dark = (box[..., :3].astype(int).sum(-1) < 150) & fg
            for y, x in zip(ys, xs):
                out['srcPx'] += 1
                if dst[y, x, 3] == 0: out['lost'] += 1; (len(out['lostAt']) < 12) and out['lostAt'].append(f'{name}[{i}] ({x},{y})'); continue
                if tuple(dst[y, x, :3]) != tuple(box[y, x, :3]): out['changed'] += 1; continue
                out['kept'] += 1
            out['darkSrc'] += int(dark.sum()); out['darkKept'] += int((dark & (dst[..., 3] > 0) & (dst[..., :3] == box[..., :3]).all(-1)).sum())
out['sheetFrames'] = sum(len(r['boxes']) for r in SR['rows'].values())
cov = SR['coverage']
for k, r in SR['rows'].items():
    for i in range(len(r['boxes'])):
        if not cov.get(f'{k}[{i}]'): out['uncovered'].append(f'{k}[{i}]')
print(json.dumps(out))
