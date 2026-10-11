#!/usr/bin/env python3
"""Slice Shisui (Fallen) body + normals from the Fallen-recoloured H into feet-aligned *_uniform.png sheets.

Rewritten to AUTO-DETECT the real frame grid (row-bands via per-row alpha runs, frame columns via per-column
alpha gaps) instead of hand-guessed windows. This eliminates two defects in the first cut:
  • RUN used an even() equal-split that crossed frame boundaries AND a too-tall y-band that bled the idle feet
    (above) + jump tops (below) into each cell → stray "second figure" fragments.
  • AIR used y1055-1140, which lands in the GAP between band 8 (kunai) and band 9 (FX) → it grabbed only the
    lower third of the kunai frames → "half body" (legs only).
Each cell is now cropped from the EXACT band y-range and a gap-detected x-span, then trimmed to its own content
bbox, so one cell == exactly one clean figure.
"""
import numpy as np
from PIL import Image

F = np.asarray(Image.open("shisui_fallen_work/H_fallen.png").convert("RGBA"))
A = F[..., 3] > 16

def _runs(mask, gap):
    segs = []; s = None
    for i, v in enumerate(mask):
        if v and s is None: s = i
        elif not v and s is not None: segs.append([s, i]); s = None
    if s is not None: segs.append([s, len(mask)])
    m = []
    for seg in segs:
        if m and seg[0] - m[-1][1] < gap: m[-1][1] = seg[1]
        else: m.append(seg)
    return [tuple(x) for x in m]

# Row-bands: content rows grouped, merging gaps <=3px.
BANDS = _runs(A.any(axis=1), gap=4)

def cols(band_i):
    y0, y1 = BANDS[band_i]
    return y0, y1, _runs(A[y0:y1].any(axis=0), gap=3)

def crop_abs(y0, y1, x0, x1, pad=2):
    sub = F[y0:y1, x0:x1]; m = sub[..., 3] > 16
    if not m.any(): return None
    ys = np.where(m.any(axis=1))[0]; xs = np.where(m.any(axis=0))[0]
    c = sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    o = np.zeros((c.shape[0]+2*pad, c.shape[1]+2*pad, 4), np.uint8)
    o[pad:pad+c.shape[0], pad:pad+c.shape[1]] = c
    return Image.fromarray(o, "RGBA")

def build(name, band_i, frames, anchor="bottom"):
    y0, y1, spans = cols(band_i)
    sel = [spans[i] for i in frames]
    cells = [crop_abs(y0, y1, s, e) for s, e in sel]; cells = [c for c in cells if c]
    mw = max(c.width for c in cells); mh = max(c.height for c in cells)
    sh = Image.new("RGBA", (mw*len(cells), mh), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        oy = mh - c.height if anchor == "bottom" else (mh - c.height)//2
        sh.alpha_composite(c, (i*mw + (mw - c.width)//2, oy))
    sh.save(name); print(f"{name}: band{band_i} {len(cells)}f cell {mw}x{mh}")

# band index → (animation, frame indices). Indices are into the auto-detected spans of that band.
build("shisui_fallen_idle_uniform.png",      2,  [0, 1])
build("shisui_fallen_run_uniform.png",       3,  [0, 1, 2, 3, 4, 5])           # FIX: real 6 run frames (was even-split)
build("shisui_fallen_jump_uniform.png",      4,  [0, 1, 2, 3])
build("shisui_fallen_guard_uniform.png",     5,  [0, 1])                        # stance + block (band also holds unrelated poses)
build("shisui_fallen_hurt_uniform.png",      6,  [0, 1, 2, 3, 4, 5])
build("shisui_fallen_knockdown_uniform.png", 7,  [0, 1, 2, 3, 4])
build("shisui_fallen_kunai_uniform.png",     8,  [0, 1, 2])                     # 3 kunai-throw frames
build("shisui_fallen_light_uniform.png",     10, [0, 1, 4, 5, 6, 7, 8, 9, 10]) # punch/kick/sword string (skip ambiguous 2,3)
build("shisui_fallen_air_uniform.png",       12, [2, 3])                        # FIX: airborne flying-kick (was legs-only); band11's aerial slash bbox is 1.8x too tall
build("shisui_fallen_heavy_uniform.png",     19, [0, 1, 2, 3, 4, 5, 6])         # iaido sword combo
build("shisui_fallen_up_uniform.png",        22, [0, 1, 2, 3])                  # rising sword slash (launcher)
build("shisui_fallen_finisher_uniform.png",  25, [0, 1, 2, 3, 4, 5, 6])
build("shisui_fallen_intro_uniform.png",     1,  [0, 1, 2, 3, 4])
build("shisui_fallen_mangekyou_uniform.png", 23, [1])                           # Mangekyō eye icon (Sharingan glare / Kotoamatsukami)

# portrait / cut-in illustration (top-left block, exclude the credit box at x>=466)
port = crop_abs(0, 362, 0, 466, pad=0)
port.save("shisui_fallen_portrait.png"); print("portrait", port.size)
