#!/usr/bin/env python3
"""VIOLET PARR — export engine strips from the frame registry (tools/violet/frames.py).
Every output pixel is an original source pixel (no resampling / redraw / mirroring). Each animation strip shares one
cell per strip with the anchor at (originX, originY), so swapping frames never shifts the root.
  assets/violet/<anim>.png      body strips (ANIMS below = the sprite ledger, docs/violet/SPRITE_LEDGER.md)
  assets/violet/fx/<name>.png   effect strips (FX below), anchored at the cell centre
  assets/violet/portrait.png    R1 portrait (exact rect)
  violetSprites.js              generated VIOLET_ANIM / VIOLET_FX / VIOLET_LEDGER
  docs/violet/source_rects.json every frame: id, band, source rect, anchor
Usage: python3 -I tools/violet/extract.py [--out-root DIR] [--recolor tag]   (skins: build_skins.py)"""
import json, sys; from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import numpy as np
from PIL import Image
import frames as F

# anim key → (frame ids, speed (ticks / frame), loop)
ANIMS = {
  'idle': (['R2f1', 'R2f2', 'R2f3', 'R2f4', 'R2f5', 'R2f6'], 9, True),
  'walk': (['R5f1', 'R5f2', 'R5f3', 'R5f4', 'R5f5', 'R5f6', 'R5f7', 'R5f8'], 6, True),
  'walk_back': (['R5f8', 'R5f7', 'R5f6', 'R5f5', 'R5f4', 'R5f3', 'R5f2', 'R5f1'], 7, True),
  'run': (['R3f1', 'R3f2', 'R3f3', 'R3f4', 'R3f5', 'R3f6'], 4, True),
  'dash': (['R3f1', 'R3f4'], 5, False),
  'jump': (['R4f1', 'R4f2'], 6, False),
  'doubleJump': (['R4f3', 'R4f4', 'R4f5'], 5, False),
  'fall': (['R4f6'], 8, False),
  'land': (['R4f7', 'R4f8'], 5, False),
  'crouch': (['R17f5', 'R17f6'], 12, True),
  'guard': (['R6f1'], 8, False),
  'hurt': (['R17f1', 'R17f2', 'R17f3', 'R17f4'], 5, False),
  'hurt_air': (['R16f1', 'R16f2', 'R16f3'], 6, False),
  'knockdown': (['R16f1', 'R16f2', 'R16f3', 'R16f4', 'R16f5', 'R16f6'], 6, False),
  'getup': (['R16f7', 'R16f8', 'R16f9', 'R16f10'], 6, False),
  'lose': (['R16f4', 'R16f5', 'R16f6'], 10, False),
  'win': (['R19f1', 'R19f2', 'R19f3', 'R19f4'], 10, False),
  'taunt': (['R18f1'], 30, False),
  'dizzy': (['R18f1'], 30, True),
  'intro': (['R12f1', 'R12f2', 'R12f3', 'R12f4', 'R12f5', 'R12f6'], 7, False),
  # normals
  'light': (['R6f1', 'R6f2', 'R6f3'], 4, False),
  'heavy': (['R6f4', 'R6f5', 'R6f6', 'R6f7', 'R6f8'], 5, False),
  'vLow': (['R17f5', 'R17f7'], 5, False),
  'up': (['R4f1', 'R4f2'], 6, False),
  'air': (['R4f3', 'R4f4', 'R4f5'], 4, False),
  # specials / defense / ultimate
  'vPush': (['R6f4', 'R6f5', 'R6f6', 'R6f7', 'R6f8'], 5, False),
  'vShield': (['R6f6', 'R6f7', 'R6f8'], 6, False),
  'vBall': (['R17f8', 'R17f9', 'R17f10', 'R17f11'], 3, True),
  'vTrap': (['R19f1'], 8, False),
  'vUlt': (['R19f1', 'R6f4', 'R6f5', 'R6f6', 'R6f7', 'R6f8'], 8, False),
  'vPhase': (['R7f1', 'R7f2', 'R7f3', 'R7f4', 'R7f5', 'R7f6'], 3, False),
  # Vanish
  'vanish': (['R7f1', 'R7f2', 'R7f3', 'R7f4', 'R7f5', 'R7f6'], 4, False),
  'inv_idle': (['R11f1', 'R11f2', 'R11f3', 'R11f4', 'R11f5', 'R11f6'], 9, True),
  'inv_walk': (['R11f1', 'R11f2', 'R11f3', 'R11f4', 'R11f5', 'R11f6'], 6, True),
  'inv_crouch': (['R9f1', 'R9f2'], 12, True),
  'reappear': (['R12f1', 'R12f2', 'R12f3', 'R12f4', 'R12f5', 'R12f6'], 4, False),
}
FX = {
  'trap': ['R8f1', 'R8f2', 'R8f3', 'R8f4', 'R8f5', 'R8f6'],
  'shell': ['R10f1', 'R10f2'],
  'hit': ['R13f1', 'R13f2', 'R13f3'],
  'push': ['R14f1', 'R14f2', 'R14f3', 'R14f4', 'R14f5', 'R14f6'],
  'dome': ['R15f1', 'R15f2', 'R15f3', 'R15f4', 'R15f5', 'R15f6'],
}
SUIT = {(144, 16, 40), (216, 16, 56), (176, 16, 48), (80, 0, 160), (184, 0, 168), (128, 0, 168)}

def body_anchor(a, f):
  rgb, al = a[..., :3], a[..., 3] > 0
  m = np.zeros(al.shape, bool)
  for c in SUIT: m |= np.all(rgb == c, axis=2)
  m &= al
  ys, xs = np.nonzero(m if m.sum() >= 20 else al)
  return float(xs.mean()), float(np.nonzero(al)[0].max() + 1)

def strip(cells, anchors):
  L = max(ax for ax, _ in anchors); R = max(c.shape[1] - ax for c, (ax, _) in zip(cells, anchors))
  T = max(ay for _, ay in anchors); B = max(c.shape[0] - ay for c, (_, ay) in zip(cells, anchors))
  ox, oy = int(np.ceil(L)), int(np.ceil(T)); cw, ch = ox + int(np.ceil(R)) + 1, oy + int(np.ceil(B))
  out = np.zeros((ch, cw * len(cells), 4), np.uint8)
  for i, (c, (ax, ay)) in enumerate(zip(cells, anchors)):
    x = i * cw + ox - int(round(ax)); y = oy - int(round(ay))
    h, w = c.shape[:2]; reg = out[y:y + h, x:x + w]
    np.copyto(reg, c, where=c[..., 3:4] > 0)
  return out, cw, ch, ox, oy

def build(out_root=None, recolor=None):
  im, bg, lab, fr = F.registry()
  root = Path(out_root) if out_root else F.ROOT / 'assets/violet'
  byid = {f['id']: f for f in fr}
  cell = lambda fid: recolor(F.rgba(im, lab, byid[fid]), byid[fid]) if recolor else F.rgba(im, lab, byid[fid])
  (root / 'fx').mkdir(parents=True, exist_ok=True)
  anim, fxd = {}, {}
  for k, (ids, speed, loop) in ANIMS.items():
    cells = [cell(i) for i in ids]; anchors = [body_anchor(F.rgba(im, lab, byid[i]), byid[i]) for i in ids]
    s, cw, ch, ox, oy = strip(cells, anchors)
    Image.fromarray(s).save(root / f'{k}.png')
    anim[k] = {'sheet': f'./assets/violet/{k}.png', 'frames': len(ids), 'width': cw, 'height': ch, 'originX': ox, 'originY': oy,
      'anchorY': 0, 'loop': loop, 'lockLastFrame': not loop, 'speed': speed, 'frameWidth': cw, 'frameHeight': ch, 'ledger': ids}
  for k, ids in FX.items():
    cells = [cell(i) for i in ids]; anchors = [(byid[i]['ax'], byid[i]['ay']) for i in ids]
    s, cw, ch, ox, oy = strip(cells, anchors)
    Image.fromarray(s).save(root / 'fx' / f'{k}.png')
    fxd[k] = {'sheet': f'./assets/violet/fx/{k}.png', 'frames': len(ids), 'width': cw, 'height': ch, 'originX': ox, 'originY': oy, 'ledger': ids}
  Image.fromarray(cell('R1f1')).save(root / 'portrait.png')
  return fr, anim, fxd

def main():
  fr, anim, fxd = build()
  used = {i for a in ANIMS.values() for i in a[0]} | {i for v in FX.values() for i in v} | {'R1f1'}
  unused = [f['id'] for f in fr if f['id'] not in used]
  assert not unused, f'unused frames: {unused}'
  js = ('// Generated by tools/violet/extract.py — do not hand-edit. 1x original pixels (drawn at integer scale, nearest).\n'
    f'export const VIOLET_ANIM = {json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "ledger"} for k, v in anim.items()}, indent=1)}\n'
    f'export const VIOLET_FX = {json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "ledger"} for k, v in fxd.items()})}\n'
    f'export const VIOLET_LEDGER = {json.dumps({**{k: v["ledger"] for k, v in anim.items()}, **{"fx_" + k: v["ledger"] for k, v in fxd.items()}, "portrait": ["R1f1"]})}\n'
    "export const VIOLET_PORTRAIT = './assets/violet/portrait.png'\n")
  (F.ROOT / 'violetSprites.js').write_text(js)
  (F.ROOT / 'docs/violet').mkdir(parents=True, exist_ok=True)
  (F.ROOT / 'docs/violet/source_rects.json').write_text(json.dumps({'source': 'assets/sprites/violet.png', 'sha256': F.SHA256,
    'frames': [{k: f[k] for k in ('id', 'band', 'idx', 'x0', 'y0', 'x1', 'y1', 'area', 'ax', 'ay', 'fx')} for f in fr]}, indent=1))
  print(f'{len(fr)} frames, {len(anim)} anims, {len(fxd)} fx strips, all frames used')

if __name__ == '__main__': main()
