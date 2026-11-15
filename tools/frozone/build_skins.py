#!/usr/bin/env python3
"""FROZONE skins — precomputed exact-palette ROLE recolours (cosmetic only: identical geometry, anchors, frame data).

Method: every pixel of the supplied sheet gets a role (tools/frozone/skins.json "_doc"); a skin maps each role to its
colour (luminance order inside a role is preserved), the recoloured sheet is cut into the SAME strips / cells / anchors
as tools/frozone/extract.py, plus the portrait and the supplied white ice pieces (fx/*.png → the skin's ice-light).
White pixels are split into COSTUME panels (a white component 4-adjacent to suit / panel-shade / skin colours) and ICE
(detached sparks, bursts and arcs, plus every white pixel inside the sweep-burst rectangles). Whole-white hit-flash
silhouettes stay white. Black (visor / outline), skin tones and the ground shadow are never recoloured.
Patterns are static deterministic hashes of the SOURCE coordinate (no RNG), baked once.
Outputs: assets/frozone/skins/<tag>/{<strip>.png, portrait.png, fx/<part>.png}; frozoneSkinTable.js;
docs/frozone/region_mapping.json; docs/frozone/skins_contact.png.     Usage: python3 -I tools/frozone/build_skins.py
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract as X

ROOT = X.ROOT; OUT = X.OUT / 'skins'; DOC = X.DOC
SPEC = json.loads((Path(__file__).resolve().parent / 'skins.json').read_text())
C = lambda *v: tuple(v)
ROLE_COLS = {
  'main': [C(48, 176, 208)], 'shade': [C(48, 120, 160)], 'outline': [C(32, 80, 104)],
  'pshade': [C(208, 208, 216)], 'pshade2': [C(136, 152, 184), C(136, 136, 152), C(144, 152, 168), C(160, 160, 168)],
  'disc': [C(104, 96, 104), C(88, 96, 104), C(72, 72, 72), C(40, 40, 48)],
  # portrait (own palette): oval = main/shade, hat = panel/pshade
  'p_main': [C(16, 144, 216)], 'p_shade': [C(72, 104, 152)], 'p_panel': [C(208, 232, 240)], 'p_pshade': [C(160, 200, 216)],
}
KEEP = [C(0, 0, 0), C(64, 56, 40), C(128, 104, 80), C(96, 80, 56), C(64, 64, 64), C(128, 128, 128)]
WHITE = C(248, 248, 248)
BODYADJ = ['main', 'shade', 'pshade', 'pshade2']
FLASH_FRAMES = [('react', 0), ('down', 0)]
ICE_RECTS = [v[2] for v in X.EFFECTS.values() if v[2]]   # the supplied sweep bursts / splash / spray (white pixels inside = ice)

def hx(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

def roles(im, lab, G):
  H, W, _ = im.shape
  role = np.full((H, W), '', dtype=object)
  eq = lambda c: np.all(im == c, axis=2)
  for r, cols in ROLE_COLS.items():
    for c in cols: role[eq(c)] = r
  for c in KEEP: role[eq(c)] = 'keep'
  white = eq(WHITE)
  body = np.zeros((H, W), bool)
  for r in BODYADJ: body |= (role == r)
  for c in KEEP[1:4]: body |= eq(c)
  lab2, n = ndimage.label(white, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
  near = ndimage.binary_dilation(body, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
  touched = np.unique(lab2[near & white])
  panel = np.isin(lab2, touched[touched > 0])
  role[white & panel] = 'panel'; role[white & ~panel] = 'ice'
  for (x0, y0, x1, y1) in ICE_RECTS:
    sub = role[y0:y1, x0:x1]; w = white[y0:y1, x0:x1]; sub[w] = 'ice'
  for b, i in FLASH_FRAMES:
    f = G[b][i]; m = np.isin(lab[f['y0']:f['y1'], f['x0']:f['x1']], f['ids']) & white[f['y0']:f['y1'], f['x0']:f['x1']]
    role[f['y0']:f['y1'], f['x0']:f['x1']][m] = 'flash'
  # portrait band: its own palette
  py1 = X.BANDS['portrait'][1]
  pr = role[:py1]; pw = white[:py1]; pr[pw] = 'p_panel'
  return role

def hsh(x, y, k=0):
  v = (x * 73856093) ^ (y * 19349663) ^ (k * 83492791)
  v = (v ^ (v >> 13)) * 1274126177 & 0xffffffff
  return (v ^ (v >> 16)) & 0xffff

def recolor(im, role, sk):
  out = im.copy()
  main, shade, outline = hx(sk['main']), hx(sk['shade']), hx(sk['outline'])
  panel, pshade, pshade2 = hx(sk['panel']), hx(sk['pshade']), hx(sk['pshade2'])
  ice = [hx(c) for c in sk['ice']]
  disc = [hx(c) for c in sk['disc']] if sk.get('disc') else None
  M = {'main': main, 'shade': shade, 'outline': outline, 'panel': panel, 'pshade': pshade, 'p_main': main, 'p_shade': shade, 'p_panel': panel, 'p_pshade': pshade, 'ice': ice[2]}
  for r, c in M.items(): out[role == r] = c
  # pshade2: the deep panel shade / trim tone (several near-greys → one trim colour)
  out[role == 'pshade2'] = pshade2
  # disc: 4 greys → explicit board colours, or the greys tinted toward the suit shade (luminance order preserved)
  src = ROLE_COLS['disc']
  for k, c in enumerate(src):
    m = np.all(im == c, axis=2) & (role == 'disc')
    if disc: out[m] = disc[k]
    else:
      t = tuple(int(round(c[j] * 0.55 + shade[j] * 0.45 * (lum(c) / 104))) for j in range(3)); out[m] = t
  pat = sk.get('pattern')
  if pat:
    ys, xs = np.nonzero((role == 'main') | (role == 'shade'))
    for y, x in zip(ys, xs):
      h = hsh(int(x), int(y), 7)
      if pat == 'stars' and h % 37 == 0: out[y, x] = (255, 255, 255) if h % 2 else (200, 196, 255)
      elif pat == 'circuit' and role[y, x] == 'main' and ((y % 7 == 0 and x % 6 != 0) or (x % 11 == 0 and y % 7 < 3)): out[y, x] = (60, 200, 120)
      elif pat == 'facets' and role[y, x] == 'main' and (x + y) % 9 == 0: out[y, x] = tuple(min(255, v + 34) for v in main)
      elif pat == 'opal' and role[y, x] == 'main':
        band = ((x + 2 * y) // 5) % 3
        out[y, x] = [main, (214, 232, 236), (238, 220, 240)][band]
  return out

def build_strips(im, im2, lab, G, outdir):
  cells = {}
  for band, frames in G.items():
    for i, f in enumerate(frames):
      _, ax, ay = X.cut(im, lab, f)            # anchors from the ORIGINAL pixels (identical geometry for every skin)
      rgba, _, _ = X.cut(im2, lab, f); cells[(band, i)] = (rgba, ax, ay)
  src = json.loads((DOC / 'source_rects.json').read_text()); CW, CH, OX, OY = src['cell']
  def place(k):
    rgba, ax, ay = cells[k]; c = np.zeros((CH, CW, 4), np.uint8); c[OY - ay:OY - ay + rgba.shape[0], OX - ax:OX - ax + rgba.shape[1]] = rgba; return c
  outdir.mkdir(parents=True, exist_ok=True)
  for name, refs in X.STRIPS.items():
    Image.fromarray(np.concatenate([place(k) for k in refs], axis=1), 'RGBA').save(outdir / f'{name}.png')
  Image.fromarray(cells[('portrait', 0)][0], 'RGBA').save(outdir / 'portrait.png')

def build_fx(sk, outdir):
  (outdir / 'fx').mkdir(parents=True, exist_ok=True)
  light = hx(sk['ice'][2])
  for p in (X.FX).glob('*.png'):
    a = np.array(Image.open(p).convert('RGBA'))
    m = a[..., 3] > 0; a[m, 0], a[m, 1], a[m, 2] = light
    Image.fromarray(a, 'RGBA').save(outdir / 'fx' / p.name)

def main():
  im = X.load(); lab, G = X.groups(im)
  role = roles(im, lab, G)
  counts = {r: int((role == r).sum()) for r in sorted(set(role.flatten())) if r}
  (DOC / 'region_mapping.json').write_text(json.dumps({'roles': {k: [list(c) for c in v] for k, v in ROLE_COLS.items()}, 'keep': [list(c) for c in KEEP],
    'white_split': 'panel = white component 4-adjacent to ' + '/'.join(BODYADJ) + ' or skin; ice = otherwise + sweep-burst rects; flash = whole-white hit-flash frames ' + str(FLASH_FRAMES),
    'ice_rects': [list(r) for r in ICE_RECTS], 'pixel_counts': counts}, indent=1))
  table = []
  for sk in SPEC['skins']:
    im2 = recolor(im, role, sk)
    build_strips(im, im2, lab, G, OUT / sk['tag']); build_fx(sk, OUT / sk['tag'])
    table.append({k: sk.get(k) for k in ('id', 'tag', 'name', 'classification', 'crossover', 'inspiration', 'hud', 'ice', 'pattern', 'effects', 'accent')})
    print('built', sk['tag'])
  (ROOT / 'frozoneSkinTable.js').write_text('// Generated by tools/frozone/build_skins.py from tools/frozone/skins.json — do not hand-edit.\nexport const FROZONE_SKIN_TABLE = ' + json.dumps(table, indent=1) + '\n')
  contact(SPEC['skins'])
  print('roles', counts)

def contact(skins):
  src = json.loads((DOC / 'source_rects.json').read_text()); CW, CH = src['cell'][:2]
  show = [('idle', 0), ('dash', 1), ('atkLance', 1), ('atkLow', 1), ('atkRush', 2), ('guard', 0)]
  rows = [('default', X.OUT)] + [(s['tag'], OUT / s['tag']) for s in skins]
  S = 2; head = 22; pw = 34 * S
  sheet = Image.new('RGBA', (pw + 8 + len(show) * CW * S + 160, len(rows) * (CH * S + 6) + head), (24, 28, 36, 255)); d = ImageDraw.Draw(sheet)
  d.text((6, 6), 'Frozone skins — default + 10 (portrait, idle, skate, lance, low burst, disc, guard) — tools/frozone/build_skins.py', fill=(255, 255, 255, 255))
  for r, (tag, base) in enumerate(rows):
    y = head + r * (CH * S + 6)
    por = Image.open(base / 'portrait.png'); sheet.alpha_composite(por.resize((por.width * S, por.height * S), Image.NEAREST), (4, y + 10))
    for j, (name, i) in enumerate(show):
      im = Image.open(base / f'{name}.png').crop((i * CW, 0, (i + 1) * CW, CH)).resize((CW * S, CH * S), Image.NEAREST)
      sheet.alpha_composite(im, (pw + 8 + j * CW * S, y))
    sk = next((s for s in skins if s['tag'] == tag), None)
    x = pw + 8 + len(show) * CW * S + 4
    d.text((x, y + 20), tag, fill=(255, 255, 255, 255))
    if sk:
      for k, c in enumerate(sk['ice']): d.rectangle([x + k * 18, y + 40, x + k * 18 + 14, y + 54], fill=hx(c) + (255,), outline=(0, 0, 0, 255))
  sheet.save(DOC / 'skins_contact.png'); print('contact', sheet.size)

if __name__ == '__main__':
  main()
