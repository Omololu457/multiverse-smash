#!/usr/bin/env python3
"""Recolor the monochrome yuji_charge.png into the kit's cyan cursed-energy
palette via a luminance→cyan colormap. Preserves alpha (line-art boundaries)
and the tiny red eye accents. Writes yuji_charge_uniform.png (pre-reslice)."""
import numpy as np
from PIL import Image

SRC = "yuji_charge.png"
OUT = "yuji_charge_uniform.png"   # reslice_strip.mjs will repack this in place after

# Luminance ramp → cyan. Darks stay near-black (line art), body cools to teal,
# bright aura becomes bright cyan matching the kit (#67e8f9 / sampled #00f0f0).
STOPS = [
    (0,   (6, 10, 14)),      # line art / deepest shadow
    (55,  (16, 48, 60)),     # body shadow → dark teal
    (105, (34, 116, 146)),   # body mid → teal
    (150, (72, 190, 224)),   # aura inner → cyan
    (200, (150, 236, 250)),  # aura → bright cyan
    (255, (222, 255, 255)),  # aura hot core → white-cyan
]

def ramp_lut():
    xs = [s[0] for s in STOPS]
    lut = np.zeros((256, 3), np.float32)
    for c in range(3):
        ys = [s[1][c] for s in STOPS]
        lut[:, c] = np.interp(np.arange(256), xs, ys)
    return lut.astype(np.uint8)

def main():
    im = Image.open(SRC).convert("RGBA")
    a = np.array(im).astype(np.int32)
    r, g, b, alpha = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    lum = (0.299 * r + 0.587 * g + 0.114 * b).clip(0, 255).astype(np.uint8)
    lut = ramp_lut()
    out = a.copy().astype(np.uint8)
    mapped = lut[lum]                                   # (H,W,3)
    op = alpha > 0
    for c in range(3):
        out[..., c] = np.where(op, mapped[..., c], out[..., c])
    # Preserve the red eye accents: pixels that were strongly red-dominant & not grey
    is_red = (r > g + 26) & (r > b + 26) & (alpha > 60)
    out[is_red, 0] = 226; out[is_red, 1] = 46; out[is_red, 2] = 46
    out[..., 3] = alpha.astype(np.uint8)
    Image.fromarray(out, "RGBA").save(OUT)
    print(f"wrote {OUT}  dims={im.size}  opaque={int(op.sum())}  red_accents={int(is_red.sum())}")

if __name__ == "__main__":
    main()
