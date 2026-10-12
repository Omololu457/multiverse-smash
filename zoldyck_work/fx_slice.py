#!/usr/bin/env python3
# Phase-2 FX extractor: the lightning FX live in WHITE-BORDERED boxes whose interiors keep the olive bg
# (border-flood-fill in analyze.py can't reach inside). Here we DIRECT-COLOR key the olive (cyan/white
# FX is far from olive) per box, detect frame islands, and repack to uniform bottom-aligned strips.
# → zoldyck_boltfx_uniform.png (3), zoldyck_pillarfx_uniform.png (4), zoldyck_barragefx_uniform.png (3).
from PIL import Image
import numpy as np
SRC = "killua_zoldyck_sprites_jus_new_outfit__by_amandiohype_dduudqn.png"
A = np.array(Image.open(SRC).convert("RGBA"))
BG = np.array([55, 86, 40])

def key_box(x0, y0, x1, y1, name, gap=6, minw=4):
    sub = A[y0:y1 + 1, x0:x1 + 1].copy()
    d = np.abs(sub[:, :, :3].astype(np.int16) - BG).sum(axis=2)
    sub[:, :, 3] = np.where(d <= 55, 0, 255).astype(np.uint8)
    keyed = Image.fromarray(sub, "RGBA"); al = np.array(keyed)[:, :, 3]
    cols = (al > 16).sum(axis=0); islands = []; c = 0; n = len(cols)
    while c < n:
        if cols[c] >= 1:
            s = c; rg = 0
            while c < n and (cols[c] >= 1 or rg < gap):
                rg = 0 if cols[c] >= 1 else rg + 1; c += 1
            e = c - rg
            while e > s and cols[e - 1] < 1: e -= 1
            if e - s >= minw: islands.append((s, e - 1))
        else: c += 1
    frames = []
    for (a, b) in islands:
        ys = np.where((al[:, a:b + 1] > 16).any(axis=1))[0]
        if len(ys): frames.append((a, ys[0], b, ys[-1]))
    if not frames: print(f"  {name}: none"); return
    uW = max(bx1 - bx0 + 1 for bx0, by0, bx1, by1 in frames) + 2
    uH = max(by1 - by0 + 1 for bx0, by0, bx1, by1 in frames)
    out = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (bx0, by0, bx1, by1) in enumerate(frames):
        out.alpha_composite(keyed.crop((bx0, by0, bx1 + 1, by1 + 1)), (i * uW + (uW - (bx1 - bx0 + 1)) // 2, uH - (by1 - by0 + 1)))
    out.save(f"./zoldyck_{name}_uniform.png")
    print(f"  {name}: {len(frames)}f cell {uW}x{uH}")

key_box(391, 2309, 622, 2411, "boltfx")      # 4-Koma A Thunderbolt blast FX (3)
key_box(270, 2942, 548, 3031, "pillarfx")    # 6-Koma A FX2 lightning pillars (4)
key_box(655, 2719, 886, 2821, "barragefx")   # 5-Koma B Thunderbolt Barrage blast FX (3)
