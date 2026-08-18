#!/usr/bin/env python3
# Kurapika (JUS-style spritesheet by ultimos60) — SLICE ONLY pass.
# Source: kurapika/kurapika_kurta_jus_style_..._d863gca.jpg
#   - Flat pure-black background (JPEG noise up to ~20).
#   - Bright-green (~[7,253,6]) cell-grid borders (JUS convention).
#   - Two dense grid regions of 80px animation-frame rows (region1 lines
#     79..1195, region2 lines 2307..3424) PLUS irregular chain/beam/label
#     bands in between and after (no full-width grid lines there).
#
# STEP 1 background removal: alpha=0 where (a) near-black neutral (bg + dark
#   JPEG halo) OR (b) grid green (incl. anti-aliased green fringe). Colored dark
#   sprite pixels (navy tabard, etc.) are preserved (kept if saturated enough).
# STEP 2 row-only slice (HYBRID): hard-cut at the detected full-width green grid
#   lines for the two dense regions; content-gap detect the irregular regions.
#   Each emitted row is tightened to its own content bbox (crop only, no pixel
#   edits) and written as kurapika_row_NN.png.
# NO content audit / move IDs — that is done later from the sliced files.

import os
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

SRC = "kurapika /kurapika_kurta_jus_style_spritesheet_by_ultimos60_d863gca.jpg"
OUT = "kurapika_sliced"

# ---- load ----
im = Image.open(SRC).convert("RGB")
a = np.array(im).astype(int)
H, W, _ = a.shape
R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
maxc = a.max(axis=2)
minc = a.min(axis=2)

# ---- STEP 1: alpha mask ----
# JUS cell grid is drawn in two colours: bright green (dense regions) and
# saturated yellow (special/beam regions). Both must go; blonde hair (orange,
# lower G, non-trivial B) must stay -> key only the tightly-saturated grid
# colours, then dilate 2px to swallow each line's own AA halo (isolated hair
# highlights are never adjacent to a grid line so they survive).
green       = (G > 90) & (G - R > 45) & (G - B > 45)
green_halo  = (G > 45) & (G - R > 22) & (G - B > 22)
yellow_grid = (R > 205) & (G > 195) & (B < 40) & (R - B > 175) & (G - B > 165)
yellow_halo = binary_dilation(yellow_grid, iterations=2)
dark_bg     = (maxc < 40) & (maxc - minc < 16)                   # black + neutral JPEG halo
transparent = green | green_halo | yellow_grid | yellow_halo | dark_bg
alpha = np.where(transparent, 0, 255).astype(np.uint8)

rgba = np.dstack([a.astype(np.uint8), alpha])
content = ~transparent                                            # bool per-pixel

# ---- STEP 2: row boundaries ----
# full-width green grid lines
rg = green.sum(axis=1)
grid_lines = [y for y in range(H) if rg[y] > W * 0.4]

# dense-grid row cuts (hard): region1 top=0 lines<=1195 ; region2 top=2227 lines>=2307
region1 = [ln for ln in grid_lines if ln <= 1200]
region2 = [ln for ln in grid_lines if ln >= 2300]
hard_cuts = set()
hard_cuts.update([0] + region1)                    # region1 cell edges
hard_cuts.update([2307 - 80] + region2)            # region2 cell edges (first cell top)

# irregular regions: everything not spanned by a dense grid -> content-gap cuts.
# Build a per-row content profile and add gap-midpoint cuts ONLY outside grid spans.
rowc = content.sum(axis=1)
in_grid = np.zeros(H, dtype=bool)
in_grid[0:1195 + 1] = True
in_grid[2227:3424 + 1] = True

active = rowc > 6
# transparent gaps (runs of inactive rows); a cut goes at each gap that borders
# content, but suppress gaps inside dense-grid spans (handled by hard_cuts).
soft_cuts = set()
y = 0
while y < H:
    if not active[y]:
        s = y
        while y < H and not active[y]:
            y += 1
        e = y - 1  # gap [s,e]
        mid = (s + e) // 2
        if not in_grid[mid] and (e - s + 1) >= 3:
            soft_cuts.add(mid)
    else:
        y += 1

# collapse near-duplicate cuts (a hard grid cut + a nearby soft cut make slivers)
allcuts = sorted(hard_cuts | soft_cuts | {0, H})
hard_set = set(hard_cuts) | {0, H}
cuts = []
for c in allcuts:
    if cuts and c - cuts[-1] < 20:
        # keep the hard (grid) position when one of the pair is a grid cut
        if c in hard_set and cuts[-1] not in hard_set:
            cuts[-1] = c
        continue
    cuts.append(c)

# ---- build content bands, drop blanks ----
bands = []
for i in range(len(cuts) - 1):
    top, bot = cuts[i], cuts[i + 1]
    if content[top:bot].sum() >= 20:      # skip blank gaps between animations
        bands.append([top, bot])

# fold any too-thin band (sliver / stray caption line) into its nearest
# neighbour. Thinness is judged on the band's *content* span, not the raw
# cut-to-cut height, so text-legend lines collapse into one block.
def content_h(t, b):
    ys = np.where(content[t:b].any(axis=1))[0]
    return (ys[-1] - ys[0] + 1) if len(ys) else 0

MIN_H = 20
changed = True
while changed and len(bands) > 1:
    changed = False
    for i, (t, b) in enumerate(bands):
        if content_h(t, b) >= MIN_H:
            continue
        prevgap = t - bands[i - 1][1] if i > 0 else 10 ** 9
        nextgap = bands[i + 1][0] - b if i < len(bands) - 1 else 10 ** 9
        j = i - 1 if prevgap <= nextgap else i + 1
        bands[j][0] = min(bands[j][0], t)
        bands[j][1] = max(bands[j][1], b)
        del bands[i]
        changed = True
        break

# ---- emit rows (tighten each band to its content bbox; crop only) ----
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith(".png"):
        os.remove(os.path.join(OUT, f))

PAD = 2
rows = []
for top, bot in bands:
    band = content[top:bot]
    ys = np.where(band.any(axis=1))[0]
    xs = np.where(band.any(axis=0))[0]
    y0 = max(0, top + ys[0] - PAD)
    y1 = min(H, top + ys[-1] + 1 + PAD)
    x0 = max(0, xs[0] - PAD)
    x1 = min(W, xs[-1] + 1 + PAD)
    if (y1 - y0) < 8 or (x1 - x0) < 8:
        continue
    rows.append((y0, y1, x0, x1))

manifest = []
for idx, (y0, y1, x0, x1) in enumerate(rows, 1):
    crop = rgba[y0:y1, x0:x1]
    name = f"kurapika_row_{idx:02d}.png"
    Image.fromarray(crop, "RGBA").save(os.path.join(OUT, name))
    manifest.append((name, y0, y1, x0, x1, (y1 - y0), (x1 - x0)))

print(f"source {W}x{H}  full-width green lines: {len(grid_lines)}")
print(f"rows emitted: {len(rows)}")
for m in manifest:
    print(f"  {m[0]}  y[{m[1]}:{m[2]}] x[{m[3]}:{m[4]}]  {m[6]}x{m[5]}")
