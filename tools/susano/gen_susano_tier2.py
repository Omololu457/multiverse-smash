#!/usr/bin/env python3
# gen_susano_tier2.py — key + slice the TIER 2 (torso bust) pieces from the War-Susano sheet.
# Same border-flood-fill + soft-luminance-alpha keyer as gen_susano_tier1.py (NO global black key — preserves
# the interior near-black detail). Packs each bust action row into a uniform horizontal frame-strip.
# OUTPUT (repo root): sasuke_susano_bust_idle/claw/blade/bow.png  +  sasuke_susano_arrow.png
import os
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "sasuke_war_susano_by_nes_by_xxjohnnyxxx_d8sb2nk.png")
THR, RAMP_LO, RAMP_K = 24, 10, 5

def key_sheet(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.int32); rgb = a[:, :, :3]
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    lbl, _ = ndimage.label(lum < THR)
    border = set(np.unique(np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]]))); border.discard(0)
    bg = np.isin(lbl, list(border))
    alpha = np.where(bg, 0, np.clip((lum - RAMP_LO) * RAMP_K, 0, 255)).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), "RGBA")

def frames_in_band(al, W, y0, y1, minw=20):
    band = al[y0:y1]; on = (band > 40).sum(axis=0) > 2
    runs, s = [], None
    for x in range(W):
        if on[x] and s is None: s = x
        elif not on[x] and s is not None:
            if x - s >= minw: runs.append((s, x - 1))
            s = None
    if s is not None and W - s >= minw: runs.append((s, W - 1))
    boxes = []
    for (x0, x1) in runs:
        ys = np.where((al[y0:y1, x0:x1 + 1] > 40).any(axis=1))[0]
        if len(ys): boxes.append((x0, y0 + ys.min(), x1, y0 + ys.max()))
    return boxes

def pack_strip(keyed, boxes, out, pad=3):
    crops = [keyed.crop((bx0 - pad, by0 - pad, bx1 + 1 + pad, by1 + 1 + pad)) for (bx0, by0, bx1, by1) in boxes]
    cw = max(c.width for c in crops); ch = max(c.height for c in crops)
    strip = Image.new("RGBA", (cw * len(crops), ch), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        strip.alpha_composite(c, (i * cw + (cw - c.width) // 2, (ch - c.height) // 2))
    strip.save(out); print(f"wrote {os.path.basename(out)}: {len(crops)}f cell {cw}x{ch}")

def main():
    assert os.path.exists(SRC), f"source missing: {SRC}"
    keyed = key_sheet(SRC); W, H = keyed.size; al = np.asarray(keyed)[:, :, 3]
    idle  = frames_in_band(al, W, 1035, 1245)   # bust idle (row 1)
    blade = frames_in_band(al, W, 1525, 1735)   # bow/blade swing
    claw  = frames_in_band(al, W, 1825, 2035)   # claw strikes
    bow   = frames_in_band(al, W, 2130, 2345)   # bow draw + arrow shot
    pack_strip(keyed, idle[:1], os.path.join(ROOT, "sasuke_susano_bust_idle.png"))   # calm single idle frame
    pack_strip(keyed, blade,    os.path.join(ROOT, "sasuke_susano_bust_blade.png"))
    pack_strip(keyed, claw,     os.path.join(ROOT, "sasuke_susano_bust_claw.png"))
    pack_strip(keyed, bow,      os.path.join(ROOT, "sasuke_susano_bust_bow.png"))
    # cyan arrow projectile (soldier section)
    arrow = keyed.crop((1050, 2890, 1220, 3015)); ab = np.asarray(arrow)[:, :, 3]
    ys, xs = np.where(ab > 40)
    arrow.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).save(os.path.join(ROOT, "sasuke_susano_arrow.png"))
    print("wrote sasuke_susano_arrow.png")

if __name__ == "__main__":
    main()
