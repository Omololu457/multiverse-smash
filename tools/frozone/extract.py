#!/usr/bin/env python3
"""FROZONE (The Incredibles, GBA) — supplied-sheet extraction.

SOURCE IS READ-ONLY: "Game Boy Advance - The Incredibles - Playable Characters - Frozone.png" (repo root) is hash-checked,
copied byte-identical to assets/frozone/source/ and never written. Every output pixel is an original source pixel; only
the exact sheet background (0,128,128) becomes transparent — the blue costume (48,176,208 / 48,120,160 / 32,80,104) and
the white ice / costume pixels (248,248,248) are different exact colours, so nothing of the character is keyed out.
No resampling, smoothing, palette reduction, redrawing, mirroring or generated poses. The ripper caption
("Ripped by redblueyellow. No credit needed.") is excluded by rectangle.

FRAMES: 8-connected components of non-background pixels, grouped per sheet band; speck components (< 100 px: ice spray,
arc fragments) join the frame whose rectangle (±12 px) contains them. Every group keeps its complete limbs, disc,
streaks and baked sparks (whole component bounding boxes, never cropped).
ANCHOR: x = centroid of the suit pixels (cyan 48,176,208 + blue 48,120,160) — stable across leaning poses; y = lowest
opaque row of the frame (feet / skate streak / disc / spray at ground level). Every body strip shares ONE cell
(CELL_W × CELL_H) with the anchor at (OX, OY), so swapping strips never shifts the root.
OUTPUT (1x original pixels, drawn at integer scale ×2, nearest-neighbour):
  assets/frozone/<action>.png        body strips (engine animationData format)
  assets/frozone/fx/<part>.png       supplied effect pieces cut from the sheet (ice burst, spray, arc, streak)
  assets/frozone/portrait.png        the sheet's portrait (exact rect)
  assets/frozone/fx/blank.png        1×1 transparent (engine projectile sheet; the art is drawn by frozoneFx)
  frozoneSprites.js                  generated FROZONE_ANIM + FROZONE_PARTS + FROZONE_SOURCE
  docs/frozone/source_rects.json     every frame: band, index, source rect, anchor
  docs/frozone/contact_sheet.png     review sheet (2x; red = anchor)
Usage: python3 -I tools/frozone/extract.py
"""
import hashlib, json, os, shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Game Boy Advance - The Incredibles - Playable Characters - Frozone.png'
SHA256 = 'see docs/frozone/SPRITE_MAP.md'
OUT = ROOT / 'assets/frozone'; FX = OUT / 'fx'; DOC = ROOT / 'docs/frozone'
BG = (0, 128, 128)
SUIT = [(48, 176, 208), (48, 120, 160)]
CAPTION = (322, 436, 704, 471)   # "Ripped by redblueyellow. No credit needed." — excluded

# Sheet bands (y0, y1) in source px, inspected at 3x — docs/frozone/SPRITE_MAP.md
BANDS = {
  'portrait': (0, 31), 'idle': (31, 96), 'skate': (96, 149), 'cast': (149, 198), 'ice': (198, 276),
  'react': (276, 316), 'down': (316, 351), 'sweep': (351, 405), 'gesture': (405, 471),
}

def load():
  im = np.array(Image.open(SRC).convert('RGB'))
  return im

def groups(im):
  H, W, _ = im.shape
  fg = ~np.all(im == BG, axis=2)
  x0, y0, x1, y1 = CAPTION; fg[y0:y1, x0:x1] = False
  lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
  objs = ndimage.find_objects(lab)
  comps = []
  for i, s in enumerate(objs):
    area = int((lab[s] == i + 1).sum())
    comps.append({'id': i + 1, 'y0': s[0].start, 'y1': s[0].stop, 'x0': s[1].start, 'x1': s[1].stop, 'area': area})
  out = {}
  for band, (b0, b1) in BANDS.items():
    inb = [c for c in comps if c['y0'] >= b0 and c['y1'] <= b1]
    big = sorted([c for c in inb if c['area'] >= 100], key=lambda c: c['x0'])
    frames = [{'ids': [c['id']], 'x0': c['x0'], 'y0': c['y0'], 'x1': c['x1'], 'y1': c['y1']} for c in big]
    for c in inb:
      if c['area'] >= 100: continue
      cx = (c['x0'] + c['x1']) / 2
      cand = [f for f in frames if f['x0'] - 12 <= cx <= f['x1'] + 12]
      if not cand: cand = frames
      f = min(cand, key=lambda f: abs((f['x0'] + f['x1']) / 2 - cx))
      f['ids'].append(c['id']); f['x0'] = min(f['x0'], c['x0']); f['x1'] = max(f['x1'], c['x1']); f['y0'] = min(f['y0'], c['y0']); f['y1'] = max(f['y1'], c['y1'])
    out[band] = frames
  return lab, out

def cut(im, lab, f):
  y0, y1, x0, x1 = f['y0'], f['y1'], f['x0'], f['x1']
  rgb = im[y0:y1, x0:x1]
  m = np.isin(lab[y0:y1, x0:x1], f['ids'])
  rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); rgba[..., :3] = rgb; rgba[..., 3] = np.where(m, 255, 0)
  suit = m & (np.all(rgb == SUIT[0], axis=2) | np.all(rgb == SUIT[1], axis=2))
  ys, xs = np.nonzero(suit if suit.any() else m)
  ax = int(round(xs.mean()))
  ay = int(np.nonzero(m.any(axis=1))[0].max())
  return rgba, ax, ay

# ── STRIPS: action → list of (band, index). Several actions reuse one supplied pose (documented in SPRITE_MAP.md).
STRIPS = {
  'idle': [('idle', i) for i in range(8)],
  'walk': [('skate', i) for i in range(8)],
  'walk_back': [('skate', i) for i in (7, 6, 5, 4, 3, 2, 1, 0)],
  'run': [('skate', i) for i in range(8)],
  'dash': [('ice', 0), ('ice', 1), ('ice', 2)],                 # ICE SKATE: crouched glide on the supplied ice streak
  'jump': [('ice', 3)],                                          # rising lean on the supplied ramp streak
  'doubleJump': [('ice', 3), ('ice', 4)],
  'fall': [('ice', 5)],
  'land': [('ice', 2)],
  'crouch': [('cast', 0)],
  'guard': [('cast', 1)],
  'hurt': [('react', 0), ('react', 3)],                          # white flash silhouette → doubled-over tumble
  'hurt_air': [('react', 3)],
  'knockdown': [('react', 1), ('down', 1)],
  'getup': [('react', 2), ('gesture', 0)],
  'lose': [('down', 0), ('down', 1), ('down', 2)],
  'win': [('gesture', 4), ('gesture', 4), ('ice', 12)],
  'taunt': [('gesture', i) for i in (1, 2, 3, 4)],
  'intro': [('ice', 0), ('ice', 1), ('ice', 2), ('ice', 0), ('ice', 1), ('ice', 2), ('ice', 11)],
  'introSettle': [('ice', 12), ('idle', 0)],
  # attack strips (timelines in frozoneData.js)
  'atkLight': [('gesture', 1), ('gesture', 2)],
  'atkLight2': [('gesture', 3), ('gesture', 4)],
  'atkFinish': [('gesture', 4), ('gesture', 5)],
  'atkHeavy': [('cast', 0), ('cast', 1), ('cast', 2)],
  'atkLow': [('sweep', i) for i in range(6)],
  'atkLaunch': [('gesture', 6), ('gesture', 5)],
  'atkAir': [('gesture', 5)],
  'atkDownAir': [('ice', 5), ('ice', 2)],
  'atkLance': [('gesture', 4), ('gesture', 5)],
  'atkRush': [('ice', 6), ('ice', 7), ('ice', 8), ('ice', 9), ('ice', 10), ('ice', 11)],
  'atkRise': [('ice', 3), ('ice', 4)],
  'atkBlackIce': [('gesture', 6)],
  'atkBreaker': [('gesture', 4), ('cast', 0), ('cast', 1), ('cast', 2)],
  'atkGrab': [('gesture', 5)],
  'atkUlt': [('gesture', 4), ('gesture', 5), ('gesture', 7)],
  'ultSkate': [('ice', 6), ('ice', 7), ('ice', 8), ('ice', 9), ('ice', 10)],
  'ultBrake': [('ice', 11)],
}
SPEED = {'idle': 9, 'walk': 6, 'walk_back': 6, 'run': 4, 'dash': 4, 'intro': 7, 'introSettle': 10, 'win': 14, 'taunt': 8,
  'hurt': 6, 'knockdown': 10, 'getup': 10, 'lose': 12, 'ultSkate': 4}
LOOP = {'idle', 'walk', 'walk_back', 'run', 'dash', 'fall', 'taunt', 'ultSkate'}

# Supplied effect pieces (exact sub-rects of one frame, specks included): name → (band, index, rect relative to frame
# top-left (x0, y0, x1, y1) or None for the whole frame's non-suit pixels, keep-colours)
EFFECTS = {   # absolute source rects (x0, y0, x1, y1); only the white (248) ice pixels inside are kept
  'burst': ('sweep', 1, (128, 366, 155, 401)),    # the big upward ice burst of sweep frame 1
  'burst2': ('sweep', 3, (283, 364, 307, 404)),   # the second burst (sweep frame 3)
  'splash': ('sweep', 2, (218, 388, 237, 403)),   # the small ground splash (sweep frame 2)
  'spray': ('sweep', 4, (344, 378, 377, 404)),    # the low scattered spray (sweep frame 4)
  'arc': ('ice', 11, None),                       # the turn's white spray arc + fragments (detached white components)
}
WHITE = (248, 248, 248)

def effect(im, lab, f, ax, rect=None):
  if rect is not None:
    x0, y0, x1, y1 = rect; sub = im[y0:y1, x0:x1]
    keep = np.all(sub == WHITE, axis=2) & np.isin(lab[y0:y1, x0:x1], f['ids'])
    out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); out[..., :3] = 248; out[..., 3] = np.where(keep, 255, 0)
    return out, rect
  rgba, fax, fay = cut(im, lab, f)
  white = np.all(rgba[..., :3] == WHITE, axis=2) & (rgba[..., 3] > 0)
  # keep white components that do not touch suit pixels (the ice, not the costume's white panels)
  suit = np.zeros(white.shape, bool)
  for c in SUIT + [(32, 80, 104), (208, 208, 216), (0, 0, 0)]: suit |= np.all(rgba[..., :3] == c, axis=2)
  lab2, n = ndimage.label(white, structure=np.ones((3, 3)))
  near = ndimage.binary_dilation(suit, iterations=1)
  keep = np.zeros(white.shape, bool)
  for i in range(1, n + 1):
    m = lab2 == i
    if not (m & near).any(): keep |= m
  ys, xs = np.nonzero(keep)
  if not len(xs): return None
  y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
  out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); out[..., :3] = 248; out[..., 3] = np.where(keep[y0:y1, x0:x1], 255, 0)
  return out, (int(f['x0'] + x0), int(f['y0'] + y0), int(f['x0'] + x1), int(f['y0'] + y1))

def main():
  raw = SRC.read_bytes(); sha = hashlib.sha256(raw).hexdigest()
  (OUT / 'source').mkdir(parents=True, exist_ok=True); FX.mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
  dst = OUT / 'source' / SRC.name
  if not dst.exists() or dst.read_bytes() != raw: shutil.copyfile(SRC, dst)
  im = load(); lab, G = groups(im)
  cells = {}
  for band, frames in G.items():
    for i, f in enumerate(frames):
      rgba, ax, ay = cut(im, lab, f); cells[(band, i)] = (rgba, ax, ay, f)
  counts = {b: len(v) for b, v in G.items()}
  assert counts == {'portrait': 1, 'idle': 8, 'skate': 8, 'cast': 3, 'ice': 13, 'react': 4, 'down': 3, 'sweep': 6, 'gesture': 8}, counts
  body = [k for k in cells if k[0] != 'portrait']
  L = max(cells[k][1] for k in body); R = max(cells[k][0].shape[1] - cells[k][1] for k in body); U = max(cells[k][2] + 1 for k in body)
  CW, CH, OX, OY = L + R + 2, U + 1, L + 1, U - 1 + 1
  def place(k):
    rgba, ax, ay, f = cells[k]; c = np.zeros((CH, CW, 4), np.uint8)
    ox, oy = OX - ax, OY - ay
    c[oy:oy + rgba.shape[0], ox:ox + rgba.shape[1]] = rgba
    return c
  anim, rects = {}, []
  for band, frames in G.items():
    for i, f in enumerate(frames):
      rgba, ax, ay, _ = cells[(band, i)]
      rects.append({'band': band, 'index': i, 'rect': [int(f['x0']), int(f['y0']), int(f['x1'] - f['x0']), int(f['y1'] - f['y0'])],
        'anchor': [int(f['x0'] + ax), int(f['y0'] + ay)], 'components': len(f['ids'])})
  used = {}
  for name, refs in STRIPS.items():
    strip = np.concatenate([place(k) for k in refs], axis=1)
    Image.fromarray(strip, 'RGBA').save(OUT / f'{name}.png')
    for k in refs: used.setdefault(f'{k[0]}:{k[1]}', []).append(name)
    loop = name in LOOP
    anim[name] = {'sheet': f'./assets/frozone/{name}.png', 'frames': len(refs), 'width': CW, 'height': CH, 'originX': OX, 'originY': OY,
      'anchorY': 0, 'loop': loop, 'lockLastFrame': not loop, 'speed': SPEED.get(name, 5), 'frameWidth': CW, 'frameHeight': CH}
  # portrait (exact rect, transparent key)
  pr, _, _, pf = cells[('portrait', 0)]
  Image.fromarray(pr, 'RGBA').save(OUT / 'portrait.png')
  # effects
  parts = {}
  for name, (band, i, rect) in EFFECTS.items():
    rgba, ax, ay, f = cells[(band, i)]
    e = effect(im, lab, f, ax, rect)
    if e is None: continue
    arr, rect = e
    Image.fromarray(arr, 'RGBA').save(FX / f'{name}.png')
    parts[name] = {'sheet': f'./assets/frozone/fx/{name}.png', 'frames': 1, 'width': arr.shape[1], 'height': arr.shape[0],
      'originX': arr.shape[1] // 2, 'originY': arr.shape[0] - 1, 'source': rect}
    rects.append({'band': 'fx:' + name, 'index': 0, 'rect': [rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]], 'from': f'{band}:{i}'})
  Image.fromarray(np.zeros((1, 1, 4), np.uint8), 'RGBA').save(FX / 'blank.png')
  unused = [f'{b}:{i}' for (b, i) in sorted(cells) if b != 'portrait' and f'{b}:{i}' not in used]
  src = {'file': SRC.name, 'sha256': sha, 'size': [int(im.shape[1]), int(im.shape[0])], 'background': list(BG), 'cell': [CW, CH, OX, OY],
    'caption_excluded': list(CAPTION), 'portrait_rect': [int(pf['x0']), int(pf['y0']), int(pf['x1'] - pf['x0']), int(pf['y1'] - pf['y0'])],
    'frames': rects, 'strips': {k: [f'{b}:{i}' for b, i in v] for k, v in STRIPS.items()}, 'usage': used, 'unused': unused}
  (DOC / 'source_rects.json').write_text(json.dumps(src, indent=1))
  js = ['// Generated by tools/frozone/extract.py — do not hand-edit. 1x original pixels; drawn at integer scale (nearest).',
    'export const FROZONE_ANIM = ' + json.dumps(anim, indent=1),
    'export const FROZONE_PARTS = ' + json.dumps(parts, indent=1),
    'export const FROZONE_SOURCE = ' + json.dumps({'file': SRC.name, 'sha256': sha, 'cell': [CW, CH, OX, OY]}), '']
  (ROOT / 'frozoneSprites.js').write_text('\n'.join(js))
  # contact sheet: every frame on its cell at 2x with the anchor in red, labelled band:index
  keys = sorted(body, key=lambda k: (list(BANDS).index(k[0]), k[1]))
  per = 10; rows = (len(keys) + per - 1) // per; S = 2
  sheet = Image.new('RGBA', (per * CW * S, rows * (CH + 10) * S), (28, 32, 40, 255)); d = ImageDraw.Draw(sheet)
  for n, k in enumerate(keys):
    c = Image.fromarray(place(k), 'RGBA').resize((CW * S, CH * S), Image.NEAREST)
    x, y = (n % per) * CW * S, (n // per) * (CH + 10) * S
    sheet.alpha_composite(c, (x, y + 10 * S))
    d.rectangle([x + OX * S - 2, y + 10 * S + OY * S - 2, x + OX * S + 2, y + 10 * S + OY * S + 2], outline=(255, 40, 40, 255))
    d.text((x + 3, y + 3), f'{k[0]}:{k[1]}', fill=(255, 255, 255, 255))
  sheet.save(DOC / 'contact_sheet.png')
  print('sha256', sha); print('cell', CW, CH, OX, OY); print('counts', counts); print('unused', unused); print('parts', list(parts))

if __name__ == '__main__':
  main()
