# tools/arlong_build/segment.py — Arlong sheet segmentation (Phase 1).
# Chroma key = the sheet's own alpha (background is already alpha-0). 8-connected components are labelled, each
# component goes to the sheet ROW whose y-band holds its centroid, then:
#   * body / blade / jet rows: components >= SEED px are frames; smaller ones (blade sparkles, loose pixels) join
#     the nearest frame in the same row (bbox distance)
#   * burst rows (R6, R20 — the white star-bursts are many small pieces): components cluster on x-gaps >= 8 px
# Returns {fid: (x0, y0, x1, y1, [component labels])} — inclusive rects in sheet pixels.
from PIL import Image
import numpy as np
from scipy import ndimage

# centroid-y bands of the 21 sheet rows (user's numbering R1..R21; verified by eye on the contact sheet)
ROW_Y = [0, 100, 172, 222, 320, 398, 477, 565, 644, 756, 890, 1012, 1110, 1200, 1286, 1388, 1440, 1535, 1618, 1694, 1755, 1872]
BURST_ROWS = {6, 20}
SEED = 100

def segment(path):
    a = np.array(Image.open(path).convert('RGBA'))[:, :, 3] > 0
    lab, n = ndimage.label(a, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    comps = []
    for k, o in enumerate(objs):
        ys, xs = np.where(lab[o] == k + 1)
        comps.append({'id': k + 1, 'x0': o[1].start, 'y0': o[0].start, 'x1': o[1].stop - 1, 'y1': o[0].stop - 1,
                      'n': len(xs), 'cy': o[0].start + ys.mean(), 'cx': o[1].start + xs.mean()})
    rows = {r: [] for r in range(1, 22)}
    for c in comps:
        r = next(i for i in range(1, 22) if ROW_Y[i - 1] <= c['cy'] < ROW_Y[i])
        rows[r].append(c)
    out = {}
    for r, cs in rows.items():
        groups = []
        if r in BURST_ROWS:
            for c in sorted(cs, key=lambda c: c['x0']):
                if groups and c['x0'] - max(g['x1'] for g in groups[-1:]) < 8:
                    g = groups[-1]; g['x1'] = max(g['x1'], c['x1']); g['m'].append(c)
                else: groups.append({'x1': c['x1'], 'm': [c]})
            groups = [g['m'] for g in groups]
        else:
            seeds = sorted([c for c in cs if c['n'] >= SEED], key=lambda c: c['x0'])
            groups = [[s] for s in seeds]
            for c in cs:
                if c['n'] >= SEED: continue
                def dist(s):
                    dx = max(0, s['x0'] - c['x1'], c['x0'] - s['x1']); dy = max(0, s['y0'] - c['y1'], c['y0'] - s['y1'])
                    return dx * dx + dy * dy
                best = min(range(len(seeds)), key=lambda i: dist(seeds[i]))
                groups[best].append(c)
        for j, g in enumerate(groups):
            out[f'R{r}F{j + 1}'] = (min(c['x0'] for c in g), min(c['y0'] for c in g), max(c['x1'] for c in g),
                                    max(c['y1'] for c in g), [c['id'] for c in g])
    return out, lab
