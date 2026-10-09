#!/usr/bin/env python3
# gen_susano_tier1.py — key + slice the TIER 1 pieces from the War-Susano sheet.
#
# SOURCE: sasuke_war_susano_by_nes_by_xxjohnnyxxx_d8sb2nk.png (1286x3905, RGBA fully-opaque, PURE-BLACK bg).
# KEYING: border flood-fill + soft luminance alpha. A GLOBAL black key is forbidden — it would delete the
#   ~264k near-black-but-nonzero pixels (smoke, eye-sockets, bow lines). Border flood-fill only removes the
#   background REACHABLE from the image border, preserving interior dark detail (47k+ px verified).
# OUTPUT: repo-root sasuke_susano_*.png (single-o "susano" namespace — distinct from teen's "susanoo").
#
# Deterministic: fixed source bboxes (no component-index reliance). Re-run to regenerate identically.
import os
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "sasuke_war_susano_by_nes_by_xxjohnnyxxx_d8sb2nk.png")
THR = 24          # background candidate = luminance below this
RAMP_LO, RAMP_K = 10, 5   # soft luminance alpha: alpha = clip((lum-LO)*K, 0, 255) for non-bg

def key_sheet(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.int32)
    rgb = a[:, :, :3]
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    cand = lum < THR
    lbl, _ = ndimage.label(cand)
    border = set(np.unique(np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])))
    border.discard(0)
    bg = np.isin(lbl, list(border))                      # ONLY border-reachable dark = true background
    alpha = np.where(bg, 0, np.clip((lum - RAMP_LO) * RAMP_K, 0, 255)).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), "RGBA")

# fixed source bboxes (x0,y0,x1,y1 inclusive) -> output name. From the arm/rib kit (y84-485).
PIECES = {
    "sasuke_susano_arm_upper": (173, 92, 225, 169),    # upper-arm segment + shoulder ball joint
    "sasuke_susano_arm_fore":  (447, 82, 511, 182),    # forearm segment (lattice) + ball end
    "sasuke_susano_claw":      (258, 405, 375, 478),   # forearm + open CLAW hand (reaching terminal)
    "sasuke_susano_fist":      (392, 407, 453, 487),   # closed fist / claw hand (alt terminal)
    "sasuke_susano_ribcage":   (69, 247, 139, 326),    # rib-ring band cluster (partial ribcage / guard)
    "sasuke_susano_rib_band":  (38, 115, 72, 170),     # small 3-rib band
}

def main():
    assert os.path.exists(SRC), f"source missing: {SRC}"
    keyed = key_sheet(SRC)
    W, H = keyed.size
    pad = 2
    for name, (x0, y0, x1, y1) in PIECES.items():
        crop = keyed.crop((max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + 1 + pad), min(H, y1 + 1 + pad)))
        out = os.path.join(ROOT, name + ".png")
        crop.save(out)
        print(f"wrote {name}.png  {crop.size}")

if __name__ == "__main__":
    main()
