# Ninja Storm sheet segmentation (both sheets share one layout). Row bands = horizontal background gaps; the
# lightning-cloud band (sheet y 1384-1616) is split into its 3 real sub-rows (sword+cloud / gun-aim / beam FX).
# Frame id = R<row>F<index> (row = band order top→bottom, index = left→right column run).
import sys, json
from PIL import Image
import numpy as np
BG = (82, 144, 118)
def mask(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    m = (np.abs(a - np.array(BG)).sum(2) > 24)
    m[:125, 780:] = False   # credit block (mugshots + text, top-right) — excluded from the game
    return m
def runs(v, mingap):
    out, s, gap, e = [], None, 0, 0
    for i, x in enumerate(v):
        if x:
            if s is None: s = i
            gap = 0; e = i
        elif s is not None:
            gap += 1
            if gap > mingap: out.append((s, e)); s = None
    if s is not None: out.append((s, e))
    return out
def bands(m):
    out = []
    for (y0, y1) in runs(m.any(1), 3):
        if y0 <= 1384 <= y1 and y1 >= 1610:
            out += [(1384, 1489), (1493, 1567), (1569, 1616)]
        else: out.append((y0, y1))
    return out
def frames(path):
    m = mask(path); res = []
    for r, (y0, y1) in enumerate(bands(m)):
        for i, (x0, x1) in enumerate(runs(m[y0:y1+1].any(0), 2)):
            ys = np.where(m[y0:y1+1, x0:x1+1].any(1))[0]
            res.append({'id': f'R{r}F{i}', 'row': r, 'i': i, 'x': int(x0), 'y': int(y0 + ys[0]), 'w': int(x1 - x0 + 1), 'h': int(ys[-1] - ys[0] + 1),
                        'px': int(m[y0:y1+1, x0:x1+1].sum())})
    return res
if __name__ == '__main__':
    json.dump(frames(sys.argv[1]), sys.stdout)
