#!/usr/bin/env python3
"""cells.py SHEET y0 y1 [x0 x1 gap] — cluster sprite pixels inside a band into cells (x-interval merge with `gap`).
Prints exact tight rects [x,y,w,h,px]. Used to author tools/syndrome/manifest.py (no guessed grids)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobs import load
import numpy as np
def cells(k, y0, y1, x0=0, x1=None, gap=2, mask=None):
  m = load(k)[1] if mask is None else mask
  x1 = x1 or m.shape[1]
  band = m[y0:y1, x0:x1]
  cols = band.any(axis=0)
  out, i, W = [], 0, len(cols)
  while i < W:
    if not cols[i]: i += 1; continue
    j = i
    while True:
      k2 = j + 1
      while k2 < W and not cols[k2] and k2 - j <= gap: k2 += 1
      if k2 < W and cols[k2] and k2 - j <= gap + 1: j = k2; continue
      break
    sub = band[:, i:j + 1]; rows = np.nonzero(sub.any(axis=1))[0]
    out.append([x0 + i, y0 + int(rows[0]), j - i + 1, int(rows[-1] - rows[0] + 1), int(sub.sum())])
    i = j + 1
  return out
if __name__ == '__main__':
  a = sys.argv; k, y0, y1 = a[1], int(a[2]), int(a[3])
  x0 = int(a[4]) if len(a) > 4 else 0; x1 = int(a[5]) if len(a) > 5 else None; g = int(a[6]) if len(a) > 6 else 2
  for c in cells(k, y0, y1, x0, x1, g): print(c)
