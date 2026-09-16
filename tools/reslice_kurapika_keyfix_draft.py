#!/usr/bin/env python3
# ============================================================================
# DRAFT — UNVERIFIED (not visually confirmed; authored without image-viewing).
# Corrected STEP-1 chroma key for Kurapika, to replace lines ~35-50 of
# tools/reslice_kurapika.py. Root cause being fixed: the old key used GLOBAL
# per-pixel colour masks —
#     green_halo  = (G>45)&(G-R>22)&(G-B>22)              # ate greenish char AA
#     yellow_grid/yellow_halo (dilated 2px)               # ate blonde hair + gold trim
#     dark_bg     = (maxc<40)&(maxc-minc<16)              # ate the near-black OUTLINE
# — which matched the character's OWN colours and carved transparent notches along
# the silhouette edge (edge-connected transparency, all animation states).
#
# The corrected key removes only pixels that are structurally BACKGROUND or GRID:
#   • grid  = TIGHT saturated green/yellow grid colour, dilated 2px for its own AA
#             (NOT a loose global green/yellow test).
#   • bg_black = near-black that is NOT hugging a coloured character pixel
#             (cell background is black far from any colour; the OUTLINE is black
#             within ~a few px of the character's colours → kept).
#
# THIS SCRIPT ONLY WRITES A PREVIEW — it does NOT touch the game sprites. Run it,
# OPEN kurapika_keyfix_preview.png, and tune the 3 marked thresholds until: no grid
# residue remains AND blonde hair / gold trim / dark outline are fully intact. THEN
# port the mask block into reslice_kurapika.py and re-run reslice + build.
# ============================================================================
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, label

SRC = "kurapika /kurapika_kurta_jus_style_spritesheet_by_ultimos60_d863gca.jpg"
a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
maxc, minc = a.max(2), a.min(2)

# (1) TIGHT grid colours (the actual JUS cell borders — very saturated). ── TUNE #1/#2
grid_green  = (G > 90) & (G - R > 45) & (G - B > 45)
grid_yellow = (R > 210) & (G > 200) & (B < 35) & (R - B > 185) & (G - B > 175)  # raised gates so
#   Kurapika's LESS-saturated gold trim survives (old thresholds ate it). Lower if grid yellow leaks.
grid = binary_dilation(grid_green | grid_yellow, iterations=2)   # dilate ONLY the tight grid for its AA

# (2) BACKGROUND black = near-black NOT adjacent to the character's coloured pixels. ── TUNE #3
near_black = (maxc < 40) & (maxc - minc < 16)
colored    = (~near_black) & (~grid) & (maxc >= 45)             # the character's real coloured pixels
near_char  = binary_dilation(colored, iterations=3)            # ← TUNE #3: outline-thickness guard (px)
bg_black   = near_black & ~near_char                           # cell background; keeps the outline

transparent = grid | bg_black
alpha = np.where(transparent, 0, 255).astype("uint8")

# proxy stats (NOT a substitute for viewing): how much survives vs the old key
old = ( ((G>90)&(G-R>45)&(G-B>45)) | ((G>45)&(G-R>22)&(G-B>22)) |
        ((R>205)&(G>195)&(B<40)&(R-B>175)&(G-B>165)) |
        binary_dilation((R>205)&(G>195)&(B<40)&(R-B>175)&(G-B>165), iterations=2) |
        ((maxc<40)&(maxc-minc<16)) )
print(f"kept(new key)={(alpha==255).sum():>8}  kept(old key)={(~old).sum():>8}  "
      f"→ new key preserves {(alpha==255).sum()-(~old).sum():+} more pixels (mostly outline/hair/trim)")

# preview on magenta so any remaining hole/eaten-edge screams magenta
prev = Image.new("RGBA", (a.shape[1], a.shape[0]), (255, 0, 255, 255))
prev.alpha_composite(Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA"))
prev.convert("RGB").save("kurapika_keyfix_preview.png")
print("wrote kurapika_keyfix_preview.png  (magenta = transparent; character should be fully solid)")
