"""Keying + slicing helpers for the naruto_hokage build.

Backgrounds are solid + slight noise and FULLY OPAQUE:
  H (hokage JUS sheet)      navy  (0,64,128)
  V (adult KCM / vahidras)  green (35,118,34)

Strategy: remove ONLY background that is colour-connected to the sheet
border (flood fill inward with tolerance). Interior regions that happen
to share the background hue -- e.g. the dark-navy Bijuudama sphere on H --
are preserved because they are not reachable from the border without
crossing sprite pixels. This is the edge-flood-fill the brief asks for.
"""
import numpy as np
from PIL import Image
from scipy import ndimage


def load(path):
    return np.asarray(Image.open(path).convert('RGBA')).copy()


def border_floodfill_alpha(im, bg, tol=40):
    """Return RGBA with bg (border-connected, within tol) made transparent."""
    h, w = im.shape[:2]
    rgb = im[..., :3].astype(np.int32)
    dist = np.abs(rgb - np.array(bg)).sum(2)
    bgish = dist <= tol                      # candidate background pixels
    lbl, n = ndimage.label(bgish)            # 4-connectivity by default
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))      # bg components touching any edge
    out = im.copy()
    out[remove, 3] = 0
    return out, remove


def content_mask(im):
    return im[..., 3] > 8


def composite(im, color):
    """Composite RGBA over a solid color -> RGB array (for fringe QA)."""
    a = im[..., 3:4].astype(float)/255.0
    bg = np.ones_like(im[..., :3], float)*np.array(color, float)
    return (im[..., :3].astype(float)*a + bg*(1-a)).astype(np.uint8)


if __name__ == '__main__':
    import sys
    path, bg = sys.argv[1], tuple(int(v) for v in sys.argv[2].split(','))
    tol = int(sys.argv[3]) if len(sys.argv) > 3 else 40
    out, _ = border_floodfill_alpha(load(path), bg, tol)
    Image.fromarray(out).save(sys.argv[4])
    print('saved', sys.argv[4])
