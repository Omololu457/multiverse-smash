#!/usr/bin/env python3
"""Slice the A Susano'o AVATAR (boss mode) from keyed A into uniform sheets. Large overlapping frames →
even-divide rows by known frame counts, then tight-crop+recenter each into a max-bbox cell."""
import numpy as np
from PIL import Image

A = np.asarray(Image.open("madara_war_work/A_keyed.png").convert("RGBA"))

def even_cells(y0, y1, x0, x1, n):
    w = (x1 - x0) // n
    return [(x0 + i*w, x0 + (i+1)*w) for i in range(n)]

def crop(y0, y1, cx0, cx1, pad=2):
    sub = A[y0:y1, cx0:cx1]
    m = sub[...,3] > 8
    if not m.any(): return None
    ys = np.where(m.any(axis=1))[0]; xs = np.where(m.any(axis=0))[0]
    c = sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    out = np.zeros((c.shape[0]+2*pad, c.shape[1]+2*pad, 4), np.uint8); out[pad:pad+c.shape[0], pad:pad+c.shape[1]] = c
    return Image.fromarray(out, "RGBA")

def build(name, cells, anchor="bottom"):
    cells = [c for c in cells if c is not None]
    mw = max(c.width for c in cells); mh = max(c.height for c in cells)
    sh = Image.new("RGBA", (mw*len(cells), mh), (0,0,0,0))
    for i,c in enumerate(cells):
        oy = mh-c.height if anchor=="bottom" else (mh-c.height)//2
        sh.alpha_composite(c, (i*mw+(mw-c.width)//2, oy))
    sh.save(name)
    mag = Image.new("RGBA", sh.size, (255,0,255,255)); mag.alpha_composite(sh)
    sc = max(1, 1500//sh.width); mag.resize((sh.width*sc, mh*sc), Image.NEAREST).save("madara_war_work/_proof_"+name.replace(".png","")+".png")
    print(f"{name}: {len(cells)}f cell {mw}x{mh}")

# IDLE — the stance bust (1 frame)
build("madara_avatar_idle_uniform.png", [crop(75, 519, 10, 460)])

# LIGHT — 2-hit sword: attack row0 (raise→slash→follow), even 3 frames
build("madara_avatar_attack_uniform.png", [crop(1849, 2520, s, e) for s,e in even_cells(1849,2520, 78, 1742, 3)])

# LOSE dissolve — full-body, 4 (top) + 4 (bottom) even frames
lose = [crop(6341, 6780, s, e) for s,e in even_cells(6341,6780, 50, 1747, 4)] + \
       [crop(6800, 7206, s, e) for s,e in even_cells(6800,7206, 20, 1500, 4)]
build("madara_avatar_lose_uniform.png", lose, anchor="bottom")

# GROUND FLAMES — 4 even frames (x19-819 y619-663)
build("madara_avatar_flames_uniform.png", [crop(615, 668, s, e) for s,e in even_cells(615,668, 19, 819, 4)], anchor="bottom")
