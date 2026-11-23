#!/usr/bin/env python3
"""tools/dino/comps.py <sheet> [gap] — key the sheet's background exactly and list merged sprite components (debug / mapping aid).
Writes scratch annotated PNG to $DINO_SCRATCH/<sheet>_ann.png."""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'incoming', 'dinothunder')
BG = {'blue': (0, 128, 0), 'yellow': (0, 128, 0), 'white': (0, 128, 0), 'drago': (0, 255, 0)}
def load(name):
    if name == 'red':
        im = Image.open(os.path.join(SRC, 'red.gif'))
        idx = np.array(im)
        rgba = np.array(im.convert('RGBA'))
        rgba[idx == 30, 3] = 0          # palette index 30 = the blue background (the blue sparkle uses other indices)
        return rgba
    rgba = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
    bg = np.all(rgba[:, :, :3] == BG[name], axis=2)
    rgba[bg, 3] = 0
    return rgba
def comps(rgba, gap=2):
    m = rgba[:, :, 3] > 0
    md = ndimage.binary_dilation(m, iterations=gap) if gap else m
    lab, n = ndimage.label(md, structure=np.ones((3, 3)))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        sub = (lab[sl] == i + 1) & m[sl]
        ys, xs = np.nonzero(sub)
        if len(xs) == 0: continue
        x0, y0 = sl[1].start + xs.min(), sl[0].start + ys.min(); x1, y1 = sl[1].start + xs.max() + 1, sl[0].start + ys.max() + 1
        out.append((int(x0), int(y0), int(x1), int(y1), int(len(xs))))
    return sorted(out, key=lambda b: (b[1] // 40, b[0]))
if __name__ == '__main__':
    name = sys.argv[1]; gap = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    rgba = load(name); cs = comps(rgba, gap)
    im = Image.fromarray(rgba).convert('RGBA'); bgim = Image.new('RGBA', im.size, (40, 40, 40, 255)); bgim.alpha_composite(im)
    big = bgim.resize((im.width * 2, im.height * 2), Image.NEAREST); d = ImageDraw.Draw(big)
    for i, (x0, y0, x1, y1, n) in enumerate(cs):
        d.rectangle([x0 * 2, y0 * 2, x1 * 2, y1 * 2], outline=(255, 0, 255)); d.text((x0 * 2 + 1, y0 * 2 + 1), str(i), fill=(255, 255, 0))
    big.save(os.path.join(os.environ.get('DINO_SCRATCH', '/tmp'), name + '_ann.png'))
    print(json.dumps([list(c) for c in cs]))
