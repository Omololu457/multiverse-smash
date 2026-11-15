#!/usr/bin/env python3
"""VIOLET PARR (The Incredibles, GBA) — frame registry from the supplied sheet (shared by extract.py / build_skins.py).

SOURCE (read-only): assets/sprites/violet.png — byte-identical copy of the supplied
"Game Boy Advance - The Incredibles - Playable Characters - Violet.png" (SHA-256 4bf0ab80…6e20).
KEY: the four corners are sampled and must agree; that exact colour (0,128,128) is the background, zero tolerance.
Nothing else is keyed: the purple invisibility figures and the bubble/ring rims are kept; ring interiors are the
background colour, so they come out transparent.
CAPTION: "Ripped by redblueyellow. No credit needed." (row band 19, x >= 105) is excluded as non-art.
CUT: 8-connected components → row bands (fully empty source rows separate bands) → inside a band, components whose
x-intervals overlap are one frame (a ring's arcs / a figure's detached hair strands), then tiny groups (< 150 px)
join the nearest frame by x-edge distance (stray rim specks). Frames are sorted left → right. No resampling.
ANCHOR: bodies = (x centroid of opaque pixels, lowest opaque row + 1) — feet baseline + body centre;
FX = bounding-box centre.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sprites/violet.png'
SHA256 = '4bf0ab802aaf3514e69e0c4f2b46d5d57811a1c66e4691a9345fceff898e6f20'
CAPTION_BAND, CAPTION_X0 = 19, 105
FX_BANDS = {8, 10, 13, 14, 15}
BAND_NAMES = {1: 'portrait', 2: 'idle', 3: 'run', 4: 'jump/flip', 5: 'walk', 6: 'push', 7: 'vanish-out', 8: 'trap-fx',
  9: 'inv-crouch', 10: 'ball-shell', 11: 'inv-walk', 12: 'reappear', 13: 'hit-fx', 14: 'push-fx', 15: 'dome-fx',
  16: 'knockdown', 17: 'hurt/crouch/curl', 18: 'small-pose', 19: 'win'}

def load():
  im = np.array(Image.open(SRC).convert('RGB'))
  H, W, _ = im.shape
  corners = {tuple(int(v) for v in im[y, x]) for y, x in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]}
  assert len(corners) == 1, f'corners disagree: {corners}'
  return im, corners.pop()

def registry():
  im, bg = load()
  fg = ~np.all(im == bg, axis=2)
  rows = fg.any(1); bands = []; y = 0
  while y < len(rows):
    if rows[y]:
      s = y
      while y < len(rows) and rows[y]: y += 1
      bands.append((s, y))
    y += 1
  assert len(bands) == 19, len(bands)
  b19 = bands[CAPTION_BAND - 1]
  fg[b19[0]:b19[1], CAPTION_X0:] = False
  lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
  objs = ndimage.find_objects(lab)
  frames = []
  for bi, (b0, b1) in enumerate(bands, 1):
    comps = []
    for i, o in enumerate(objs):
      if o is None or o[0].start < b0 or o[0].stop > b1: continue
      comps.append({'ids': [i + 1], 'x0': o[1].start, 'x1': o[1].stop, 'y0': o[0].start, 'y1': o[0].stop, 'area': int((lab[o] == i + 1).sum())})
    comps.sort(key=lambda c: c['x0'])
    groups = []
    for c in comps:                                   # x-interval overlap union (sorted sweep)
      if groups and c['x0'] < groups[-1]['x1']:
        g = groups[-1]; g['ids'] += c['ids']; g['area'] += c['area']
        g['x0'] = min(g['x0'], c['x0']); g['x1'] = max(g['x1'], c['x1']); g['y0'] = min(g['y0'], c['y0']); g['y1'] = max(g['y1'], c['y1'])
      else: groups.append(dict(c, ids=list(c['ids'])))
    big = [g for g in groups if g['area'] >= 150]
    for g in groups:
      if g['area'] >= 150: continue
      t = min(big, key=lambda b: max(b['x0'] - g['x1'], g['x0'] - b['x1'], 0))
      t['ids'] += g['ids']; t['area'] += g['area']
      t['x0'] = min(t['x0'], g['x0']); t['x1'] = max(t['x1'], g['x1']); t['y0'] = min(t['y0'], g['y0']); t['y1'] = max(t['y1'], g['y1'])
    big.sort(key=lambda g: g['x0'])
    for fi, g in enumerate(big, 1):
      m = np.isin(lab[g['y0']:g['y1'], g['x0']:g['x1']], g['ids'])
      ys, xs = np.nonzero(m)
      if bi in FX_BANDS: ax, ay = (g['x1'] - g['x0']) / 2, (g['y1'] - g['y0']) / 2
      else: ax, ay = float(xs.mean()), float(ys.max() + 1)
      frames.append({'band': bi, 'idx': fi, 'id': f'R{bi}f{fi}', 'x0': g['x0'], 'y0': g['y0'], 'x1': g['x1'], 'y1': g['y1'],
        'ids': g['ids'], 'area': g['area'], 'ax': round(ax, 2), 'ay': round(ay, 2), 'fx': bi in FX_BANDS})
  return im, bg, lab, frames

def rgba(im, lab, f):
  y0, y1, x0, x1 = f['y0'], f['y1'], f['x0'], f['x1']
  out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); out[..., :3] = im[y0:y1, x0:x1]
  out[..., 3] = np.where(np.isin(lab[y0:y1, x0:x1], f['ids']), 255, 0)
  return out
