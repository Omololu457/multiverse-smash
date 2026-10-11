#!/usr/bin/env python3
"""Key the "Sasuke War Susano by NES" sheet (xxjohnnyxxx) — opaque PURE-BLACK bg + ~150k near-black
CONTENT pixels (smoke trails, eye sockets, bow lines). A global black key would delete that content, so:
  1) BORDER FLOOD-FILL — only black components TOUCHING the sheet edge become transparent (the background).
     Interior near-black (smoke/eyes, surrounded by the glowing construct) is PRESERVED.
  2) SOFT LUMINANCE ALPHA on the kept pixels — alpha scales with brightness (floor ~60) so the Susanoo
     reads as a translucent glowing energy construct and the smoke trails stay faint but visible. Normal
     alpha compositing → works on light / dark / colourful stages (additive would vanish on bright ones)."""
import numpy as np
from PIL import Image
from scipy import ndimage
SRC = "sasuke_war_susano_by_nes_by_xxjohnnyxxx_d8sb2nk.png"
BG_LUM = 22          # luminance ≤ this = "black" candidate
FLOOR  = 60          # min alpha for kept (non-bg) content so faint smoke stays visible
def key():
    rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
    lum = 0.299*rgb[:,:,0] + 0.587*rgb[:,:,1] + 0.114*rgb[:,:,2]
    black = lum <= BG_LUM
    # border flood-fill: label black components, keep only those touching the edge → background
    lbl, n = ndimage.label(black)
    border = set(np.unique(np.concatenate([lbl[0,:], lbl[-1,:], lbl[:,0], lbl[:,-1]])))
    border.discard(0)
    bg = np.isin(lbl, list(border))
    # soft luminance alpha on the kept pixels
    a = np.clip(FLOOR + lum * (255.0 - FLOOR) / 160.0, FLOOR, 255.0)   # lum≈160 → full opacity
    alpha = np.where(bg, 0.0, a).astype(np.uint8)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    return out
if __name__ == "__main__":
    rgba = key()
    Image.fromarray(rgba, "RGBA").save("tools/sasuke_susanoo/S_keyed.png")
    a = rgba[:,:,3]
    print(f"keyed {rgba.shape[1]}x{rgba.shape[0]}  opaque(>0) {(a>0).mean()*100:.1f}%  full(255) {(a==255).mean()*100:.1f}%")
    # 3-STAGE BLEND PROOF: composite a content crop on light / dark / colourful backgrounds
    im = Image.fromarray(rgba, "RGBA")
    crop = im.crop((0, 1035, 643, 1480))   # bust-idle region
    for name, bgc in [("light", (235,235,240,255)), ("dark", (24,24,30,255)), ("colour", (40,150,90,255))]:
        b = Image.new("RGBA", crop.size, bgc); b.alpha_composite(crop)
        b.convert("RGB").save(f"tools/sasuke_susanoo/PROOF_{name}.png")
    print("wrote PROOF_light/dark/colour.png")
