#!/usr/bin/env python3
"""Megumi: segment the supplied sheet into connected components (analysis only; never edits the source).
Background = border-connected pixels within BG_T of the measured key colour; enclosed background pockets = pixels within
BG_T that are NOT border-connected (reported separately so they can be masked locally)."""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'assets/megumi_fushiguro/source/megumi_fushiguro_jus_by_xxniiroxx_dehd6g3-fullview.jpg')
KEY = np.array([0, 128, 1])
def load():
    return np.asarray(Image.open(SRC).convert('RGB'), dtype=np.int16)
def bg_masks(a, t=34):
    d = np.sqrt(((a - KEY) ** 2).sum(2))
    near = d < t
    lab, n = ndi.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outer = np.isin(lab, list(border))
    return d, outer, near & ~outer
if __name__ == '__main__':
    a = load(); d, outer, pocket = bg_masks(a)
    fg = ~outer
    lab, n = ndi.label(fg, structure=np.ones((3, 3)))
    objs = ndi.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        area = int((lab[sl] == i + 1).sum())
        comps.append({'id': i + 1, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'area': area})
    json.dump({'n': n, 'pocketPx': int(pocket.sum()), 'comps': comps}, open(sys.argv[1], 'w'))
    np.save(sys.argv[1].replace('.json', '_lab.npy'), lab)
    print(n, 'components; pocket px', int(pocket.sum()))
