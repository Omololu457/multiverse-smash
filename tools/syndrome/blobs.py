#!/usr/bin/env python3
"""List connected sprite blobs per supplied sheet (8-connected non-background, small gap merge) -> JSON.
Background: Syndrome sheet = (173,82,173); machine sheets = (255,0,255). Run: python3 -I tools/syndrome/blobs.py"""
import json, os, sys
from PIL import Image
import numpy as np
from scipy import ndimage
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'syndrome')
SHEETS = {'syndrome': ('Game Boy Advance - The Incredibles - Non-Playable Characters - Syndrome.png', (173, 82, 173)),
  'drone': ('Game Boy Advance - The Incredibles - Enemies & Bosses - Drone.png', (255, 0, 255)),
  'spinner': ('Game Boy Advance - The Incredibles - Enemies & Bosses - Spinner.png', (255, 0, 255)),
  'turrets': ('Game Boy Advance - The Incredibles - Enemies & Bosses - Turrets.png', (255, 0, 255)),
  'velocipod': ('Game Boy Advance - The Incredibles - Enemies & Bosses - Velocipod.png', (255, 0, 255)),
  'omnidroid': ('Game Boy Advance - The Incredibles - Enemies & Bosses - Omnidroid 10.png', (255, 0, 255))}
def load(k):
  fn, bg = SHEETS[k]; im = np.array(Image.open(os.path.join(SRC, fn)).convert('RGBA'))
  mask = ~((im[..., 0] == bg[0]) & (im[..., 1] == bg[1]) & (im[..., 2] == bg[2])) & (im[..., 3] > 0)
  if bg == (255, 0, 255):   # rip artefact: 4 darker-magenta (155,12,155) pixels touching the key (Turrets x3, Velocipod x1) = background
    mask &= ~((im[..., 0] == 155) & (im[..., 1] == 12) & (im[..., 2] == 155))
  return im, mask
def blobs(k, gap=1):
  im, mask = load(k)
  m = ndimage.binary_dilation(mask, iterations=gap) if gap else mask
  lab, n = ndimage.label(m, structure=np.ones((3, 3)))
  out = []
  for i, sl in enumerate(ndimage.find_objects(lab)):
    ys, xs = sl; sub = (lab[sl] == i + 1) & mask[sl]
    if sub.sum() == 0: continue
    yy, xx = np.nonzero(sub)
    out.append([int(xs.start + xx.min()), int(ys.start + yy.min()), int(xx.max() - xx.min() + 1), int(yy.max() - yy.min() + 1), int(sub.sum())])
  out.sort(key=lambda b: (b[1] // 8, b[0]))
  return out
if __name__ == '__main__':
  g = int(sys.argv[2]) if len(sys.argv) > 2 else 1
  for k in ([sys.argv[1]] if len(sys.argv) > 1 else SHEETS):
    b = blobs(k, g); print(k, len(b))
    for r in b: print('  ', r)
