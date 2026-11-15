#!/usr/bin/env python3
"""Syndrome arsenal — band segmentation (no guessed grids).

segment(sheet, band, big, near, cut) → frames. Inside `band` = (x0, y0, x1, y1) of a supplied sheet:
  1. sprite pixels = everything that is not that sheet's exact background colour (Syndrome #AD52AD, machines #FF00FF);
  2. 8-connected components (1 px dilation so anti-aliased sparkle pixels stay with their parent);
  3. components with >= `big` pixels are BODIES (one frame each, ordered left → right);
  4. every smaller component (sparks, muzzle flash, dust, debris) is attached to the nearest body whose bbox is within
     `near` px; farther ones are dropped from that band (they are listed separately as standalone effect cells);
  5. each frame = ONLY its own components' pixels (a neighbour's dust ring is never copied into it).
`cut` = optional y limit inside the band (rows outside are ignored) for bands where two sequences overlap vertically.
fixed(sheet, x0, y0, w, h, pitch, n) = explicit equal-pitch cells for EFFECT-ONLY rows whose dots touch (smoke rings);
the pitch is measured from the sheet (docs/syndrome/SPRITE_MAP.md lists every rect).
Run `python3 -I tools/syndrome/segment.py SHEET x0 y0 x1 y1 [big near]` to print a band's frames.
"""
import os, sys
import numpy as np
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobs import load

_CACHE = {}
def sheet(k):
  if k not in _CACHE: _CACHE[k] = load(k)
  return _CACHE[k]

def segment(k, band, big=300, near=14, dil=1):
  im, mask = sheet(k)
  x0, y0, x1, y1 = band
  m = mask[y0:y1, x0:x1]
  d = ndimage.binary_dilation(m, iterations=dil) if dil else m
  lab, n = ndimage.label(d, structure=np.ones((3, 3)))
  lab = np.where(m, lab, 0)
  comps = []
  for i, sl in enumerate(ndimage.find_objects(lab)):
    if sl is None: continue
    sub = lab[sl] == i + 1; c = int(sub.sum())
    if not c: continue
    ys, xs = np.nonzero(sub)
    comps.append(dict(id=i + 1, px=c, bx=(sl[1].start + xs.min(), sl[0].start + ys.min(), sl[1].start + xs.max() + 1, sl[0].start + ys.max() + 1)))
  bodies = sorted([c for c in comps if c['px'] >= big], key=lambda c: c['bx'][0])
  for b in bodies: b['members'] = [b['id']]
  def gapd(a, b):
    dx = max(0, a[0] - b[2], b[0] - a[2]); dy = max(0, a[1] - b[3], b[1] - a[3]); return max(dx, dy)
  for c in comps:
    if c['px'] >= big or not bodies: continue
    best = min(bodies, key=lambda b: (gapd(c['bx'], b['bx']), abs((c['bx'][0] + c['bx'][2]) / 2 - (b['bx'][0] + b['bx'][2]) / 2)))
    if gapd(c['bx'], best['bx']) <= near: best['members'].append(c['id'])
  frames = []
  for b in bodies:
    sel = np.isin(lab, b['members'])
    ys, xs = np.nonzero(sel)
    fx0, fy0, fx1, fy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rgba = im[y0 + fy0:y0 + fy1, x0 + fx0:x0 + fx1].copy()
    rgba[..., 3] = np.where(sel[fy0:fy1, fx0:fx1], 255, 0)
    frames.append(dict(rect=[int(x0 + fx0), int(y0 + fy0), int(fx1 - fx0), int(fy1 - fy0)], body=[int(v) + (x0 if j % 2 == 0 else y0) for j, v in enumerate(b['bx'])],
      rgba=rgba, parts=len(b['members'])))
  return frames

def fixed(k, x0, y0, w, h, pitch, n):
  im, mask = sheet(k); out = []
  for i in range(n):
    x = x0 + i * pitch
    sub = mask[y0:y0 + h, x:x + w]
    ys, xs = np.nonzero(sub)
    if not len(xs): continue
    fx0, fy0, fx1, fy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rgba = im[y0 + fy0:y0 + fy1, x + fx0:x + fx1].copy(); rgba[..., 3] = np.where(sub[fy0:fy1, fx0:fx1], 255, 0)
    out.append(dict(rect=[int(x + fx0), int(y0 + fy0), int(fx1 - fx0), int(fy1 - fy0)], rgba=rgba, parts=1, body=None))
  return out

if __name__ == '__main__':
  a = sys.argv; k = a[1]; band = tuple(map(int, a[2:6]))
  big = int(a[6]) if len(a) > 6 else 300; near = int(a[7]) if len(a) > 7 else 14
  for i, f in enumerate(segment(k, band, big, near)): print(i, f['rect'], 'parts', f['parts'])

def cols(k, band, gap=2):
  """Column-clustered cells inside band (for effect rows whose dots are many tiny components); mask-cropped."""
  from cells import cells
  im, mask = sheet(k); x0, y0, x1, y1 = band; out = []
  for (x, y, w, h, _) in cells(k, y0, y1, x0, x1, gap, mask=mask):
    sub = mask[y:y + h, x:x + w]; rgba = im[y:y + h, x:x + w].copy(); rgba[..., 3] = np.where(sub, 255, 0)
    out.append(dict(rect=[x, y, w, h], rgba=rgba, parts=1, body=None))
  return out

def fixedx(k, xs, y0, w, h):
  """Explicit measured x positions (effect rows with uneven pitch)."""
  out = []
  for x in xs: out += fixed(k, x, y0, w, h, 0, 1)
  return out
