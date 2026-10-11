#!/usr/bin/env python3
# SHISUI (FALLEN) — Phase 5c: TIER-2 EMERALD SUSANOO AVATAR from the Altair "Susano'o Storm 2" boss sheet
# (navy-keyed 0,64,128). Same emerald ramp as tier 1; a bigger, armored avatar. Band 7 = 4 clean full figures
# (stance → strike → magatama spin). Output distinct shisui_fallen_susano2_* sheets (feet/bottom-anchored).
import numpy as np
from PIL import Image
A = np.asarray(Image.open("susanoo_boss_sprite_sheet_by_altair_by_altairframemaker_de2755a.png").convert("RGB")).astype(np.float32)
navy = (np.abs(A[...,0]-0)<40) & (np.abs(A[...,1]-64)<40) & (np.abs(A[...,2]-128)<44)
lum = (0.299*A[...,0] + 0.587*A[...,1] + 0.114*A[...,2]) / 255.0
DARK = np.array([16,104,58], float); LITE = np.array([176,255,206], float)
t = np.clip((lum-0.18)/0.72, 0, 1)[...,None]
rgb = DARK*(1-t) + LITE*t
al = np.where(navy, 0, 235).astype(np.uint8)
FULL = np.dstack([rgb.astype('uint8'), al])

def tight(c):
    m = c[...,3] > 24
    if not m.any(): return c
    ys, xs = np.where(m); return c[ys.min():ys.max()+1, xs.min():xs.max()+1]

def pack(spans, name, y0=4131, y1=4637, pad=3):
    cells = [tight(FULL[y0:y1, s:e]) for s,e in spans]
    uW = max(c.shape[1] for c in cells)+2*pad; uH = max(c.shape[0] for c in cells)+2*pad
    strip = Image.new("RGBA", (uW*len(cells), uH), (0,0,0,0))
    for i,c in enumerate(cells):
        im = Image.fromarray(c, "RGBA")
        strip.alpha_composite(im, (i*uW+(uW-c.shape[1])//2, uH-c.shape[0]-pad))
    strip.save(name); print(f"OK {name}: {{ frames:{len(cells)}, width:{uW}, height:{uH} }}")

S = [(21,397),(416,815),(833,1256),(1272,1727)]   # band 7 — 4 clean figures
pack([S[0]],                 "shisui_fallen_susano2_stance.png")
pack([S[0], S[1]],           "shisui_fallen_susano2_walk.png")
pack([S[1], S[2], S[3]],     "shisui_fallen_susano2_sword.png")
