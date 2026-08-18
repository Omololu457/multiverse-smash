#!/usr/bin/env python3
# Earth Release: Wall FX — RE-THEME of the (Madara) Mokuton wood-spike shape into an EARTH/STONE wall.
# Per the Hiruzen design: reuse the stationary-hazard SHAPE but give it a genuinely different, ground-tile
# (stone-grey) visual rather than wood-brown. We map each opaque pixel's luminance onto a warm-grey stone
# ramp (preserves the sprite's shading/silhouette; only the palette changes). Same dimensions/frames as the
# source so the projectile spriteW/spriteH/frames are unchanged.
from PIL import Image
import numpy as np

SRC = "madara2_wood_spike_proj_uniform.png"
OUT = "hiruzen_earth_wall_uniform.png"

# stone ramp: dark crevice -> mid stone -> light highlight (warm grey / tan, NOT wood-brown)
DARK  = np.array([54, 51, 46])
MID   = np.array([132, 126, 114])
LIGHT = np.array([206, 200, 186])

im = Image.open(SRC).convert("RGBA")
a = np.array(im).astype(float)
rgb, alpha = a[:, :, :3], a[:, :, 3:4]
lum = (0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]) / 255.0
# two-segment ramp for richer contrast (dark->mid over [0,.5], mid->light over [.5,1])
t = lum[..., None]
lo = DARK + (MID - DARK) * (np.clip(t, 0, 0.5) / 0.5)
hi = MID + (LIGHT - MID) * (np.clip(t - 0.5, 0, 0.5) / 0.5)
out_rgb = np.where(t < 0.5, lo, hi)
out = np.concatenate([out_rgb, alpha], axis=2).astype(np.uint8)
Image.fromarray(out, "RGBA").save(OUT)
print(f"OK {OUT} <- {SRC}  {im.size} (stone-recolored)")
