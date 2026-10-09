#!/usr/bin/env python3
"""Border flood-fill keyer for the aryasyddanwahab "Hinata (The Last)" sheet.
Background is opaque navy (0,64,128) + noise. Only navy components TOUCHING the sheet edge
go transparent, so any navy-ish pixels INSIDE the body (shadow, eye) survive with no holes.
Mirrors tools/sasuke_sensei/key.py (same sheet family / same keying discipline)."""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "hinata_naruto_the_last__by_aryasyddanwahab_deapca3.png"
OUT = "tools/hinata/S_keyed.png"
BG = np.array([0, 64, 128]); TOL = 40

def key():
    rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    navy = np.sqrt(((rgb - BG) ** 2).sum(2)) <= TOL
    lbl, _ = ndimage.label(navy)
    border = set(np.unique(np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])))
    border.discard(0)
    alpha = np.where(np.isin(lbl, list(border)), 0, 255).astype(np.uint8)
    # Hinata has NO navy-colored body part (darkest outfit is ~(31,32,58), distance 83 from navy ≫
    # tolerance), so any remaining navy-CLOSE pixel is an enclosed background pocket (bracket loops,
    # gaps between limbs) that the border flood-fill couldn't reach. Erase it too — removes the navy
    # bracket-tick specks without holing the figure.
    inner = np.sqrt(((rgb - BG) ** 2).sum(2)) <= 10
    alpha[inner] = 0
    return np.dstack([rgb.astype(np.uint8), alpha])

if __name__ == "__main__":
    rgba = key()
    Image.fromarray(rgba, "RGBA").save(OUT)
    a = rgba[:, :, 3]
    print(f"keyed {rgba.shape[1]}x{rgba.shape[0]}  opaque {(a>0).mean()*100:.1f}%")
    rgb = rgba[:, :, :3].astype(int)
    near = (np.sqrt(((rgb - BG) ** 2).sum(2)) <= 25) & (a > 0)
    print(f"residual near-navy kept inside bodies: {int(near.sum())}")
