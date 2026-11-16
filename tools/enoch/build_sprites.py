#!/usr/bin/env python3
"""ENOCH — sprite build: a region recolour of Frozone's supplied GBA sheet (Frozone → Enoch).

SOURCE IS READ-ONLY: "Game Boy Advance - The Incredibles - Playable Characters - Frozone.png" (repo root, SHA-256
34aeab73…) is only read; Frozone's own assets/frozone/** files are never opened for writing. Every output pixel is either
the original source pixel or that pixel's region colour from the palettes below — no resampling, smoothing, blur,
anti-aliasing, redrawing or generated poses. Geometry, outline colour and animation are Frozone's, exactly.
Regions: tools/enoch/regions.py (per-frame masks). Strips share Frozone's cell / anchor rules (tools/frozone/extract.py).

Outputs
  assets/enoch/<strip>.png            body strips (ice-coloured trails / discs / bursts)
  assets/enoch/<strip>_fire.png       … the disc / ramp / burst pixels of trail strips recoloured FIRE
  assets/enoch/<strip>_water.png      … recoloured WATER
  assets/enoch/fx/<piece>[_fire|_water].png   ramp / disc / burst / splash / spray / arc pieces (separate files)
  assets/enoch/portrait.png           select / HUD icon: the sheet's portrait bust recoloured by region (tools/enoch/portrait.py)
  enochSprites.js                     generated ENOCH_ANIM / ENOCH_FX
  docs/enoch/EDIT_LEDGER.md + edit_ledger.json   per frame: recoloured / erased / filled / unchanged pixel counts
  docs/enoch/compare.png              Frozone vs Enoch: idle, run, attack, slide, ramp, disc, hurt, KO (×3)
Usage: python3 -I tools/enoch/build_sprites.py
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
sys.path.insert(0, str(Path(__file__).resolve().parent))
import regions as R
X, BS = R.X, R.BS

ROOT = R.ROOT; OUT = ROOT / 'assets/enoch'; FXD = OUT / 'fx'; DOC = ROOT / 'docs/enoch'
hx = lambda h: tuple(int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
W_, P1, Q = (248, 248, 248), (208, 208, 216), 'pshade2'      # white panel, panel shade, deep panel shades (role)
MAIN, SHADE = (48, 176, 208), (48, 120, 160)
SK_HI, SK_MID, SK_LO = (128, 104, 80), (96, 80, 56), (64, 56, 40)

PAL = {   # the brief's palettes (hex)
  'lens': ['#ffd27a', '#ff9a3c', '#c4561a'], 'lensHot': '#fff1c0',
  'hair': ['#2e2826', '#1a1616', '#0d0b0b'],
  'skin': ['#8a5c48', '#6a4232', '#492a1e', '#2d1710'],
  'shirt': ['#3a4268', '#252c4e', '#161a33', '#0c0f20'],
  'jeans': ['#b9c6d4', '#8f9fb0', '#67768a', '#45505f'],
  'sneaker': ['#f2f2ee', '#d8d8d2', '#a9a9a4', '#8c8c86'],
}
P = {k: ([hx(c) for c in v] if isinstance(v, list) else hx(v)) for k, v in PAL.items()}

def white_ramp(rgb, role, ramp3):
  """white panel (248) → ramp[0], panel shade (208,208,216) → ramp[1], deep panel shades → ramp[2]"""
  if tuple(rgb) == W_: return ramp3[0]
  if tuple(rgb) == P1: return ramp3[1]
  return ramp3[2]

# ── FIRE / WATER variants of the ice pieces (disc greys by luminance, ice white) ──
DISC_SRC = [(104, 96, 104), (88, 96, 104), (72, 72, 72), (40, 40, 48)]
VARIANT = {
  'fire':  {'disc': [(255, 186, 84), (240, 124, 40), (196, 70, 24), (110, 30, 14)], 'ice': (255, 228, 160)},
  'water': {'disc': [(150, 212, 240), (90, 170, 222), (40, 118, 190), (20, 58, 120)], 'ice': (208, 240, 255)},
}

def lumv(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
def variant_px(c, var):
  if c == W_: return VARIANT[var]['ice']
  if c in DISC_SRC: return VARIANT[var]['disc'][DISC_SRC.index(c)]
  l = lumv(c); ramp = VARIANT[var]['disc']
  return ramp[0] if l > 140 else ramp[1] if l > 85 else ramp[2] if l > 55 else ramp[3]

def recolor_frame(rgb, reg, role, m, variant=None, detached=None):
  """returns (new_rgb, per-category pixel counts). Only pixels of this frame (mask m) are touched.
  `detached` = frame pixels not connected to the body (ramp streaks, sparks, bursts): ice-coloured unless a variant."""
  out = rgb.copy(); n = {'recoloured': 0, 'unchanged': 0, 'erased': 0, 'filled': 0}
  H, Wd = reg.shape
  lens_px = [(y, x) for y in range(H) for x in range(Wd) if reg[y, x] == 'lens']
  lens_px.sort(key=lambda p: p[1])
  for y in range(H):
    for x in range(Wd):
      if not m[y, x]: continue
      g, c, ro = reg[y, x], tuple(int(v) for v in rgb[y, x]), role[y, x]
      new = None
      if g == 'hair': new = white_ramp(c, ro, P['hair'])
      elif g == 'strap': new = white_ramp(c, ro, P['shirt'])
      elif g == 'lens':
        k = lens_px.index((y, x)); L = len(lens_px)
        new = P['lens'][0] if (k == L - 1 and L > 1) else P['lens'][2] if (k == 0 and L > 2) else P['lens'][1]
      elif g == 'beard': new = P['hair'][2]
      elif g == 'skin': new = {SK_HI: P['skin'][0], SK_MID: P['skin'][1], SK_LO: P['skin'][2]}[c]
      elif g == 'hand': new = white_ramp(c, ro, P['skin'][:3])
      elif g == 'shirt': new = P['shirt'][0] if c == MAIN else P['shirt'][1]
      elif g == 'cuff': new = white_ramp(c, ro, P['shirt'][:3])
      elif g in ('yoke', 'trimShirt'): new = white_ramp(c, ro, [P['shirt'][0], P['shirt'][0], P['shirt'][1]])   # emblem / yoke folded into plain shirt
      elif g == 'jeans': new = P['jeans'][1] if c == MAIN else P['jeans'][2]
      elif g in ('bootTop', 'trimJeans'): new = white_ramp(c, ro, [P['jeans'][1], P['jeans'][1], P['jeans'][2]])
      elif g == 'sneaker': new = white_ramp(c, ro, P['sneaker'][:3])
      elif variant and detached is not None and detached[y, x]: new = variant_px(c, variant)
      elif variant and ro == 'disc' and c in DISC_SRC: new = VARIANT[variant]['disc'][DISC_SRC.index(c)]
      elif variant and ro == 'ice': new = VARIANT[variant]['ice']
      if new is not None and tuple(new) != c: out[y, x] = new; n['recoloured'] += 1
      else: n['unchanged'] += 1
  # sneaker SOLE line: the sneaker pixel with no sneaker pixel one step further toward the feet (per frame axis)
  return out, n

def sole_pass(out, reg, axis):
  if axis is None: return 0
  H, F = axis; v = F - H; v = v / (np.hypot(*v) or 1)
  dy, dx = int(round(v[0])), int(round(v[1])); k = 0
  for y, x in zip(*np.nonzero(reg == 'sneaker')):
    yy, xx = y + dy, x + dx
    if not (0 <= yy < reg.shape[0] and 0 <= xx < reg.shape[1]) or reg[yy, xx] != 'sneaker':
      out[y, x] = P['sneaker'][3]; k += 1
  return k

OUTLINE = (32, 80, 104)
HAIR_TRIM = 2
def trim_hair(rgba_list, reg, axis):
  """Step-2 geometry change (close crop): HAIR_TRIM passes along the frame's face→feet axis. Each pass ERASES the
  outline pixel directly above a hair pixel (one step against the axis) and turns that top hair pixel into the outline
  (FILLED with Frozone's outline colour) — the crown drops one pixel per pass with the same outline. Applied identically
  to every variant of the frame. Returns (erased, filled)."""
  if axis is None: return 0, 0
  H, F = axis; v = F - H; v = v / (np.hypot(*v) or 1)
  dy, dx = int(round(v[0])), int(round(v[1]))
  if dy == 0 and dx == 0: return 0, 0
  hair = reg == 'hair'; h, w = hair.shape; E = Fi = 0
  base = rgba_list[0]
  for _ in range(HAIR_TRIM):
    era, fil = [], []
    for y, x in zip(*np.nonzero(hair)):
      py, px = y - dy, x - dx                     # the pixel one step toward the crown
      qy, qx = py - dy, px - dx                   # …and the one beyond it must be OUTSIDE the sprite (exterior outline only)
      ext = not (0 <= qy < h and 0 <= qx < w) or base[qy, qx, 3] == 0
      if ext and 0 <= py < h and 0 <= px < w and base[py, px, 3] and tuple(base[py, px, :3]) == OUTLINE and not hair[py, px]:
        era.append((py, px)); fil.append((y, x))
    for a in rgba_list:
      for (py, px) in era: a[py, px] = 0
      for (y, x) in fil: a[y, x, :3] = OUTLINE; a[y, x, 3] = 255
    for (y, x) in fil: hair[y, x] = False; reg[y, x] = 'hairTrim'
    E += len(set(era)); Fi += len(set(fil))
  # orphaned crown outline (the side walls left standing above the new crown): head-zone outline pixels that no longer
  # touch any non-outline opaque pixel are ERASED, repeated until stable
  YY, XX = np.mgrid[0:h, 0:w]
  T = ((YY - H[0]) * (F - H)[0] + (XX - H[1]) * (F - H)[1]) / (float((F - H) @ (F - H)) or 1)
  zone = (T < 0) & (((YY - H[0]) ** 2 + (XX - H[1]) ** 2) <= (R.HEAD_R + 3) ** 2)
  while True:
    op = base[..., 3] > 0; ol = op & np.all(base[..., :3] == OUTLINE, axis=2)
    fill = op & ~ol
    touch = ndimage.binary_dilation(fill, structure=np.ones((3, 3), bool))
    orphan = ol & zone & ~touch
    if not orphan.any(): break
    for a in rgba_list: a[orphan] = 0
    E += int(orphan.sum())
  return E, Fi

# ── STRIPS: every frame of the sheet is used (asserted). (band, index) per strip; R1..R8 = the brief's rows. ──
STRIPS = {
  'idle': [('idle', i) for i in range(8)],                                  # R1
  'walk': [('skate', i) for i in range(8)], 'walk_back': [('skate', i) for i in (7, 6, 5, 4, 3, 2, 1, 0)],
  'run': [('skate', i) for i in range(8)],                                  # R2
  'crouch': [('cast', 0)], 'guard': [('cast', 1)],
  'atkLow': [('cast', 0), ('cast', 1), ('cast', 2)],                        # R3 low sweep
  'dash': [('ice', 0), ('ice', 1), ('ice', 2)],                             # R4 slide over the ramp streaks
  'atkSlide': [('ice', 0), ('ice', 1), ('ice', 2)],
  'ramp': [('ice', 3), ('ice', 4), ('ice', 5)],                             # R4 standing on the ramp → launch
  'jump': [('ice', 3)], 'doubleJump': [('ice', 3), ('ice', 4)], 'fall': [('ice', 5)], 'land': [('ice', 2)],
  'discPlant': [('ice', 6)],                                                # R4 white circular burst
  'glide': [('ice', 7), ('ice', 8), ('ice', 9), ('ice', 10)],               # R4 riding the discs
  'glideTurn': [('ice', 11)], 'standDisc': [('ice', 10)],
  'hurt': [('react', 0), ('react', 3)], 'hurt_air': [('react', 3)],          # R5
  'atkAir': [('react', 2), ('react', 3)],                                   # R5 jump / tumble frames → air strike
  'knockdown': [('react', 1), ('down', 1)], 'getup': [('react', 2), ('gesture', 0)],
  'lose': [('down', 0), ('down', 1), ('down', 2)],                          # R6
  'atkJab': [('sweep', 0)], 'atkStraight': [('sweep', 1), ('sweep', 2)],    # R7 fr1 / fr2-3
  'atkFloor': [('sweep', 3), ('sweep', 4)], 'atkCone': [('sweep', 5)], 'atkWake': [('sweep', 1)],
  'atkHeavy': [('gesture', 0), ('gesture', 1)], 'atkRise': [('gesture', 2)],  # R8 fr1-2 / fr3
  'atkCondense': [('gesture', 3), ('gesture', 4)], 'atkLens': [('gesture', 4), ('gesture', 5)],
  'atkScorch': [('gesture', 6)], 'atkTide': [('gesture', 7)], 'taunt': [('gesture', 3), ('gesture', 4)],
  'atkSteam': [('sweep', 5)], 'atkSuper': [('gesture', 7), ('gesture', 5)],
  'win': [('idle', 0), ('idle', 1), ('idle', 2), ('idle', 3)], 'winDisc': [('ice', 10)],
  'intro': [('ice', 7), ('ice', 8), ('ice', 9), ('ice', 10), ('ice', 11)], 'introSettle': [('ice', 12), ('idle', 0)],
}
VARIANT_STRIPS = ['dash', 'atkSlide', 'ramp', 'discPlant', 'glide', 'glideTurn', 'standDisc', 'winDisc', 'intro', 'atkFloor', 'atkCone', 'atkSteam', 'atkStraight', 'atkWake']
SPEED = {'idle': 9, 'walk': 6, 'walk_back': 6, 'run': 4, 'dash': 4, 'glide': 4, 'intro': 6, 'introSettle': 10, 'win': 14, 'taunt': 8,
  'hurt': 6, 'knockdown': 10, 'getup': 10, 'lose': 12, 'ramp': 5}
LOOP = {'idle', 'walk', 'walk_back', 'run', 'dash', 'fall', 'taunt', 'glide', 'win'}

def main():
  im = X.load(); lab, G = X.groups(im); role = BS.roles(im, lab, G)
  src = json.loads((ROOT / 'docs/frozone/source_rects.json').read_text()); CW, CH, OX, OY = src['cell']
  OUT.mkdir(parents=True, exist_ok=True); FXD.mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
  cells, ledger, lensAt = {}, [], {}
  for band, frames in G.items():
    if band == 'portrait': continue
    for i, f in enumerate(frames):
      y0, y1, x0, x1 = f['y0'], f['y1'], f['x0'], f['x1']
      rgb = im[y0:y1, x0:x1]; m = np.isin(lab[y0:y1, x0:x1], f['ids']); ro = role[y0:y1, x0:x1]
      reg, axis = R.frame_regions(im, role, lab, f)
      _, ax, ay = X.cut(im, lab, f)                       # anchors from the ORIGINAL pixels (Frozone's geometry)
      outs = {}
      ids = lab[y0:y1, x0:x1]; big = max(f['ids'], key=lambda i: int((ids == i).sum()))
      detached = m & (ids != big)
      for var in (None, 'fire', 'water'):
        o, n = recolor_frame(rgb, reg, ro, m, var, detached)
        soles = sole_pass(o, reg, axis)
        rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); rgba[..., :3] = o; rgba[..., 3] = np.where(m, 255, 0)
        outs[var] = rgba
        if var is None:
          counts = {g: int((reg == g).sum()) for g in R.REGIONS}
          ledger.append({'band': band, 'index': i, 'rect': [int(x0), int(y0), int(x1 - x0), int(y1 - y0)], 'opaque': int(m.sum()),
            'recoloured': n['recoloured'], 'unchanged': n['unchanged'], 'erased': 0, 'filled': 0, 'soles': soles,
            'regions': counts, 'flash': axis is None, 'lens': counts['lens']})
      ly, lx = np.nonzero(reg == 'lens')
      lens = [round(float(lx.mean()) - ax, 1), round(float(ly.mean()) - ay, 1)] if len(lx) else None   # lens centre vs the feet anchor (1x px)
      er, fi = trim_hair([outs[None], outs['fire'], outs['water']], reg, axis)
      ledger[-1]['erased'] = er; ledger[-1]['filled'] = fi
      cells[(band, i)] = (outs, ax, ay); lensAt[(band, i)] = lens
  used = {}
  def place(k, var):
    outs, ax, ay = cells[k]; rgba = outs[var]; c = np.zeros((CH, CW, 4), np.uint8)
    c[OY - ay:OY - ay + rgba.shape[0], OX - ax:OX - ax + rgba.shape[1]] = rgba; return c
  anim, lensTab = {}, {}
  for name, refs in STRIPS.items():
    for var in ([None] + (['fire', 'water'] if name in VARIANT_STRIPS else [])):
      fn = name + ('' if var is None else '_' + var)
      Image.fromarray(np.concatenate([place(k, var) for k in refs], axis=1), 'RGBA').save(OUT / f'{fn}.png')
      loop = name in LOOP
      anim[fn] = {'sheet': f'./assets/enoch/{fn}.png', 'frames': len(refs), 'width': CW, 'height': CH, 'originX': OX, 'originY': OY,
        'anchorY': 0, 'loop': loop, 'lockLastFrame': not loop, 'speed': SPEED.get(name, 5), 'frameWidth': CW, 'frameHeight': CH}
    for k in refs: used.setdefault(f'{k[0]}:{k[1]}', []).append(name)
    lensTab[name] = [lensAt.get(k) for k in refs]
  # ── FX pieces: the ramp streaks / discs (disc-role greys) and the white bursts, each a separate file per variant
  fxmeta = {}
  def save_piece(name, rgba):
    for var in (None, 'fire', 'water'):
      a = rgba.copy()
      if var:
        for yy, xx in zip(*np.nonzero(a[..., 3] > 0)): a[yy, xx, :3] = variant_px(tuple(int(v) for v in a[yy, xx, :3]), var)
      Image.fromarray(a, 'RGBA').save(FXD / f"{name}{'' if var is None else '_' + var}.png")
    fxmeta[name] = {'w': int(rgba.shape[1]), 'h': int(rgba.shape[0])}
  for i in range(13):
    f = G['ice'][i]; y0, y1, x0, x1 = f['y0'], f['y1'], f['x0'], f['x1']
    m = np.isin(lab[y0:y1, x0:x1], f['ids']); ro = role[y0:y1, x0:x1]
    ids = lab[y0:y1, x0:x1]; big = max(f['ids'], key=lambda i: int((ids == i).sum()))
    keep = m & ((ro == 'disc') | (ro == 'ice') | (ids != big))
    if not keep.any(): continue
    ys, xs = np.nonzero(keep); a = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); a[..., :3] = im[y0:y1, x0:x1]; a[..., 3] = np.where(keep, 255, 0)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    save_piece(('ramp' if i <= 5 else 'disc') + f'_{i}', a)
  for p in sorted((ROOT / 'assets/frozone/fx').glob('*.png')):
    if p.stem == 'blank': continue
    save_piece(p.stem, np.array(Image.open(p).convert('RGBA')))   # Frozone's supplied ice pieces, READ only
  # ── portrait: the sheet's R1 portrait bust recoloured BY REGION (tools/enoch/portrait.py): hood → close-cropped hair
  #    (top 2 hood rows trimmed), goggles → amber lens, skin → Enoch's ramp, shading → darkest hair step, oval → teal
  import portrait as PT
  pf = G['portrait'][0]; py0, py1, px0, px1 = pf['y0'], pf['y1'], pf['x0'], pf['x1']
  pm = np.isin(lab[py0:py1, px0:px1], pf['ids']); bust = np.zeros((py1 - py0, px1 - px0, 4), np.uint8)
  bust[..., :3] = im[py0:py1, px0:px1]; bust[..., 3] = np.where(pm, 255, 0)
  port, port_led = PT.build(bust)
  Image.fromarray(port, 'RGBA').save(OUT / 'portrait.png')
  used['portrait:0'] = ['portrait (recoloured bust)']
  # ── coverage: EVERY frame used (the ripper caption is excluded by rectangle in extract.py)
  allk = [f'{b}:{i}' for b, fr in G.items() for i in range(len(fr))]
  missing = [k for k in allk if k not in used]
  assert not missing, f'unused frames: {missing}'
  counts = {b: len(v) for b, v in G.items()}
  # ── generated module
  js = ['// Generated by tools/enoch/build_sprites.py — do not hand-edit. Enoch body strips (Frozone sheet, region recolour).',
        'export const ENOCH_ANIM = ' + json.dumps(anim, indent=1) + '',
        'export const ENOCH_FX = ' + json.dumps(fxmeta) + '',
        '// visor-lens centre per strip frame: [dx, dy] in 1x source px from the feet anchor (dx along the sheet\'s facing = +x, dy up < 0); null = no lens (hit flash)',
        'export const ENOCH_LENS = ' + json.dumps(lensTab) + '',
        "export const ENOCH_FX_PATH = (name, variant = null) => `./assets/enoch/fx/${name}${variant ? '_' + variant : ''}.png`", '']
  (ROOT / 'enochSprites.js').write_text('\n'.join(js))
  (DOC / 'edit_ledger.json').write_text(json.dumps({'source': src['file'], 'sha256': src['sha256'], 'band_counts': counts,
    'frames': ledger, 'portrait': port_led, 'used': used, 'excluded': [{'what': 'ripper caption "Ripped by redblueyellow. No credit needed."', 'rect': [322, 436, 382, 35], 'why': 'excluded, credit'}]}, indent=1))
  write_ledger_md(ledger, counts, used, port_led)
  compare(im, lab, G, cells, CW, CH, OX, OY)
  Image.new('RGBA', (1, 1), (0, 0, 0, 0)).save(FXD / 'blank.png')   # invisible carrier for hit volumes / the disc platform (drawn by enochFx)
  print('frames', counts, 'strips', len(anim), 'fx', len(fxmeta))

def write_ledger_md(ledger, counts, used, port_led=None):
  L = ['# Enoch — sprite EDIT LEDGER', '',
       'Generated by `tools/enoch/build_sprites.py` (regions: `tools/enoch/regions.py`). Source: Frozone\'s supplied sheet',
       '"Game Boy Advance - The Incredibles - Playable Characters - Frozone.png" — READ ONLY; Frozone\'s files are untouched.',
       'Method: per-frame region masks over the exact-colour roles, recoloured to the brief\'s palettes. Nearest-neighbour only;',
       'no blur, no anti-aliasing, no redraw. The ONLY geometry change is the brief\'s step 2 hair trim: Frozone\'s white cap',
       f'recoloured black read as a tall hat, so the crown is cropped {HAIR_TRIM} px along each frame\'s face→feet axis — per pass the',
       'outline pixel above the crown is ERASED and the top hair pixel is FILLED with Frozone\'s own outline colour. Counts per frame below.', '',
       '## Sheet rows (real counts)', '',
       '| brief row | band | frames |', '|---|---|---|']
  rows = [('R1', 'portrait + idle', counts['portrait'] + counts['idle']), ('R2', 'skate (run)', counts['skate']), ('R3', 'cast (crouch / attack)', counts['cast']),
          ('R4', 'ice (slide / ramp / burst / disc / ride / turn)', counts['ice']), ('R5', 'react (white burst + jump / tumble)', counts['react']),
          ('R6', 'down (knockdown)', counts['down']), ('R7', 'sweep (attacks + ice bursts)', counts['sweep']), ('R8', 'gesture (attacks)', counts['gesture'])]
  for r, b, n in rows: L.append(f'| {r} | {b} | {n} |')
  L += ['', f'Total **{sum(counts.values())}** frames + the ripper caption (excluded, credit — see CREDITS.md).', '',
        '## Region → palette', '',
        '| region | source | Enoch |', '|---|---|---|',
        '| hair (cap crown) | white cap 248 / 208 / deep shades | #2e2826 / #1a1616 / #0d0b0b |',
        '| visor lens | black lens (2–5 px) | back→front #c4561a / #ff9a3c / #ffd27a (render tint → #fff1c0 while the laser charges / fires) |',
        '| visor frame / strap | white strap rows | shirt #3a4268 / #252c4e / #161a33 |',
        '| skin (face, jaw, neck) | 128,104,80 / 96,80,56 / 64,56,40 | #8a5c48 / #6a4232 / #492a1e |',
        '| facial hair | black | #0d0b0b (kept from Frozone — no reference photo was available to check) |',
        '| hands (glove tips, far 4 px) | glove white / shades | #8a5c48 / #6a4232 / #492a1e |',
        '| shirt (torso + sleeves) | suit main / shade | #3a4268 / #252c4e |',
        '| cuff (rest of the elbow glove → sleeve to the wrist) | white / shades | #3a4268 / #252c4e / #161a33 |',
        '| chest yoke / emblem / trim | white panel | folded into plain shirt #3a4268 / #3a4268 / #252c4e (no logo, no text) |',
        '| jeans | suit main / shade (below the waist plane) | #8f9fb0 / #67768a |',
        '| boot tops (jeans over them) | white / shades | #8f9fb0 / #8f9fb0 / #67768a |',
        '| sneakers (far 4 px of the boot) | white / shades | #f2f2ee / #d8d8d2 / #a9a9a4, sole line #8c8c86 |',
        '| outline, ice, disc / ramp greys, ground shadow | — | unchanged (ice pieces get separate _fire / _water copies) |', '',
        'Unused palette steps: shirt deep #0c0f20, jeans highlight #b9c6d4 / deep #45505f, skin deepest #2d1710 — Frozone\'s',
        'suit has two tones, so a two-step mapping keeps every shading step without inventing new ones.', '',
        '## Per frame', '', '| frame | rect (x,y,w,h) | opaque | recoloured | unchanged | erased | filled | lens px | notes |', '|---|---|---|---|---|---|---|---|---|']
  for e in ledger:
    note = 'hit-flash silhouette (all white): kept as the flash' if e['flash'] else ''
    L.append(f"| {e['band']} {e['index']} | {','.join(map(str, e['rect']))} | {e['opaque']} | {e['recoloured']} | {e['unchanged']} | {e['erased']} | {e['filled']} | {e['lens']} | {note} |")
  L += ['', '## Frame use (every frame is used)', '']
  for k, v in used.items(): L.append(f'- `{k}` → {", ".join(sorted(set(v)))}')
  L += ['', '- ripper caption → **excluded, credit** (docs/enoch/CREDITS.md)', '']
  if port_led:
    L += ['', '## Portrait (select / HUD icon)', '', 'The sheet\'s R1 portrait bust, recoloured by region (tools/enoch/portrait.py): '
          f"{port_led['recoloured']} px recoloured, {port_led['erased']} px erased (hair trim: the top two hood rows above the hair line).", '',
          '| region | px |', '|---|---|'] + [f'| {k} | {v} |' for k, v in port_led['regions'].items()]
  (DOC / 'EDIT_LEDGER.md').write_text('\n'.join(L))

def compare(im, lab, G, cells, CW, CH, OX, OY):
  picks = [('idle', ('idle', 0)), ('run', ('skate', 1)), ('attack', ('gesture', 5)), ('slide', ('ice', 1)), ('ramp', ('ice', 4)),
           ('disc', ('ice', 8)), ('hurt', ('react', 3)), ('KO', ('down', 2))]
  S = 3; tile = (CW * S, CH * S); pad = 6
  img = Image.new('RGBA', (len(picks) * (tile[0] + pad) + pad, 2 * (tile[1] + pad) + 40), (24, 28, 36, 255))
  d = ImageDraw.Draw(img)
  for j, (lbl, k) in enumerate(picks):
    f = G[k[0]][k[1]]; y0, y1, x0, x1 = f['y0'], f['y1'], f['x0'], f['x1']
    m = np.isin(lab[y0:y1, x0:x1], f['ids'])
    a = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); a[..., :3] = im[y0:y1, x0:x1]; a[..., 3] = np.where(m, 255, 0)
    outs, ax, ay = cells[k]
    for row, rgba in enumerate([a, outs[None]]):
      c = np.zeros((CH, CW, 4), np.uint8); c[OY - ay:OY - ay + rgba.shape[0], OX - ax:OX - ax + rgba.shape[1]] = rgba
      t = Image.fromarray(c, 'RGBA').resize(tile, Image.NEAREST)
      img.alpha_composite(t, (pad + j * (tile[0] + pad), 20 + row * (tile[1] + pad)))
    d.text((pad + j * (tile[0] + pad) + 4, 4), lbl, fill=(230, 230, 230, 255))
  d.text((pad, img.size[1] - 16), 'top: Frozone (source)   bottom: Enoch (region recolour)', fill=(200, 200, 200, 255))
  img.save(DOC / 'compare.png')

if __name__ == '__main__':
  main()
