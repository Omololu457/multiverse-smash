"""Enoch's select / HUD portrait = Frozone's portrait bust (the supplied sheet's R1 icon, read-only) recoloured BY
REGION with the brief's palettes, nearest-neighbour only: hood → close-cropped hair (top two hood rows trimmed, counted in the
ledger), goggles → the amber lens ramp, skin → Enoch's skin ramp, facial shading → the darkest hair step, oval → teal.
Returns (rgba numpy array, ledger dict)."""
import numpy as np
from PIL import Image
HEX = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
HAIR = [HEX('#2e2826'), HEX('#1a1616'), HEX('#0d0b0b')]
SKIN = [HEX('#8a5c48'), HEX('#6a4232'), HEX('#492a1e'), HEX('#2d1710')]
LENS = [HEX('#ffd27a'), HEX('#ff9a3c'), HEX('#c4561a')]
OVAL, OVAL_SH = (42, 138, 143), (29, 95, 102)
C = {'oval': (16, 144, 216), 'd': (104, 64, 72), 'out': (0, 0, 0), 'n': (72, 104, 152), 'w': (208, 232, 240), 's': (200, 104, 40), 'W': (248, 248, 248),
     'g': (144, 144, 216), 'S': (224, 136, 56), 'm': (160, 200, 216), 'k': (184, 64, 16), 'G': (224, 184, 248), 'L': (248, 168, 72), 'p': (152, 112, 176), 'Y': (248, 216, 120)}
TRIM_ROWS = 2          # hood rows removed above the hair line (close crop)
BAND = (6, 10)         # goggle band rows (inclusive)
def build(src):
  im = src if isinstance(src, np.ndarray) else np.array(Image.open(src).convert('RGBA')); H, W = im.shape[:2]; out = im.copy(); led = {'recoloured': 0, 'erased': 0, 'regions': {}}
  key = {v: k for k, v in C.items()}
  def put(y, x, col, reg): out[y, x, :3] = col; led['recoloured'] += 1; led['regions'][reg] = led['regions'].get(reg, 0) + 1
  for y in range(H):
    row = [key.get(tuple(im[y, x, :3])) if im[y, x, 3] else None for x in range(W)]
    face = [x for x in range(W) if row[x] in ('s', 'S', 'L', 'Y', 'k')]
    f0 = min(face) if face else 99
    for x in range(W):
      c = row[x]
      if c is None or c == 'out': continue
      if c == 'oval': put(y, x, OVAL, 'oval'); continue
      if c == 'n' and (x < 7 or x > 25): put(y, x, OVAL_SH, 'oval'); continue
      if y < BAND[0] and c in ('W', 'w', 'm', 'g', 'n', 'p'):            # the hood dome → close-cropped hair (top rows trimmed)
        if y < TRIM_ROWS: out[y, x, 3] = 0; led['erased'] += 1; continue
        put(y, x, HAIR[2] if y == TRIM_ROWS or c in ('g', 'n') else HAIR[0] if c == 'W' else HAIR[1], 'hair'); continue
      if BAND[0] <= y <= BAND[1] and x >= 11 and c in ('G', 'g', 'p', 'W'):   # goggles → the amber lens
        put(y, x, LENS[0] if c in ('G', 'W') else LENS[1] if c == 'g' else LENS[2], 'lens'); continue
      if c in ('Y', 'L'): put(y, x, SKIN[0], 'skin'); continue
      if c == 'S': put(y, x, SKIN[1], 'skin'); continue
      if c == 's': put(y, x, SKIN[2], 'skin'); continue
      if c == 'k': put(y, x, SKIN[3], 'skin'); continue
      if c == 'd': put(y, x, HAIR[1], 'beard/shade'); continue
      if c in ('W', 'w', 'm', 'g', 'n', 'p', 'G'):
        if x < f0 and y < 13: put(y, x, HAIR[1 if c in ('W', 'w') else 2], 'hair (temple)')        # hood flap beside the upper face → hair at the temple
        elif x < f0: put(y, x, SKIN[2] if c in ('W', 'w', 'm') else SKIN[3], 'skin (jaw)')         # lower flap → jaw
        elif c in ('W',): put(y, x, (236, 230, 220), 'teeth')
        else: put(y, x, SKIN[3], 'lips')
  # outline the new hair line (the row under the trimmed rows gets the outline wherever it is the top edge)
  return out, led
if __name__ == '__main__':
  import sys; a, l = build(sys.argv[1]); Image.fromarray(a, 'RGBA').save(sys.argv[2]); print(l)
