#!/usr/bin/env python3
"""Labeled contact sheet of every cut frame → docs/violet/contact_sheet.png (3x, checkerboard = transparency,
red cross = anchor, label = ledger id). Usage: python3 -I tools/violet/contact.py"""
import sys; from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import numpy as np
from PIL import Image, ImageDraw
import frames as F
S = 3
def main():
  im, bg, lab, fr = F.registry()
  rows = {}
  for f in fr: rows.setdefault(f['band'], []).append(f)
  W = 1500; pad = 8; lab_h = 14; y = 6; tiles = []
  for b in sorted(rows):
    x = 120; rh = 0
    for f in rows[b]:
      w, h = (f['x1'] - f['x0']) * S, (f['y1'] - f['y0']) * S
      if x + w > W - pad: x = 120; y += rh + lab_h + pad; rh = 0
      tiles.append((f, x, y)); x += w + pad; rh = max(rh, h)
    tiles.append(({'band_label': b}, 6, y))
    y += rh + lab_h + 2 * pad
  sheet = Image.new('RGBA', (W, y + 6), (40, 40, 48, 255)); d = ImageDraw.Draw(sheet)
  for f, x, ty in tiles:
    if 'band_label' in f:
      d.text((x, ty + 4), f"R{f['band_label']}\n{F.BAND_NAMES[f['band_label']]}", fill=(255, 230, 120, 255)); continue
    a = F.rgba(im, lab, f); h, w = a.shape[:2]
    chk = np.zeros((h * S, w * S, 4), np.uint8); yy, xx = np.mgrid[0:h * S, 0:w * S]
    c = ((yy // 6 + xx // 6) % 2).astype(np.uint8); chk[..., 0] = chk[..., 1] = chk[..., 2] = 150 + 40 * c; chk[..., 3] = 255
    big = np.kron(a, np.ones((S, S, 1), np.uint8))
    al = big[..., 3:4] / 255.0; chk[..., :3] = (big[..., :3] * al + chk[..., :3] * (1 - al)).astype(np.uint8)
    sheet.paste(Image.fromarray(chk), (x, ty))
    ax, ay = int(f['ax'] * S + x), int(f['ay'] * S + ty)
    d.line([(ax - 5, ay), (ax + 5, ay)], fill=(255, 0, 0, 255)); d.line([(ax, ay - 5), (ax, ay + 5)], fill=(255, 0, 0, 255))
    d.text((x, ty + h * S + 1), f['id'], fill=(255, 255, 255, 255))
  out = F.ROOT / 'docs/violet/contact_sheet.png'; out.parent.mkdir(parents=True, exist_ok=True); sheet.save(out)
  print(out, sheet.size)
main()
