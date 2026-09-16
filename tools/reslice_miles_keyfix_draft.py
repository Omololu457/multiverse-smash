#!/usr/bin/env python3
# ============================================================================
# DRAFT — UNVERIFIED (not visually confirmed; authored without image-viewing).
# Corrected blue key for Miles, to replace load_keyed() in tools/reslice_miles.py.
# Root cause being fixed: the old key had
#     KEY_TOL = 70                                   # loose blue key reached into suit tones
#     fringe  = (b>r+25)&(b>g+25)&(b>100)            # GLOBAL blue-dominant → ate blue-tinted
#                                                    #   suit-edge/shadow pixels anywhere
# — carving mild edge-connected transparency into his suit (~9% of body, all states).
#
# Corrected: tighter blue tolerance, and the AA fringe is restricted to a 1-px RING
# around the CONFIRMED background (not a global test) so it can't touch interior suit.
#
# PREVIEW ONLY — does not touch the game sprites. Run it, OPEN miles_keyfix_preview.png,
# and tune the 2 marked thresholds until: no blue bg/halo residue AND the black+red suit
# (incl. its edges) and white eyes are fully intact. Then port into reslice_miles.py.
# ============================================================================
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

SRC  = "miles_morales___jus_sprite_sheet___credits_desc_by_xxalexsmashxx_dfsvf9b-fullview.jpg"
BLUE = np.array([66, 94, 255])

a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

blue  = np.abs(a - BLUE).sum(2) <= 48        # ← TUNE #1: was 70; lower reaches less into suit tones
white = (r > 232) & (g > 232) & (b > 232)
mauve = (r > 100) & (r < 170) & (g > 25) & (g < 100) & (b > 90) & (b < 155) & (b > g + 20)
bg    = blue | white | mauve

# AA halo restricted to a 1-px ring around confirmed bg (NOT global blue-dominant). ── TUNE #2
ring   = binary_dilation(bg, iterations=1) & ~bg
fringe = ring & (b > r + 20) & (b > g + 20) & (b > 90)
bgmask = bg | fringe
alpha  = np.where(bgmask, 0, 255).astype("uint8")

old_fringe = (b > r + 25) & (b > g + 25) & (b > 100)
old = (np.abs(a - BLUE).sum(2) <= 70) | (r>228)&(g>228)&(b>228) | mauve | old_fringe
print(f"kept(new key)={(alpha==255).sum():>8}  kept(old key)={(~old).sum():>8}  "
      f"→ new key preserves {(alpha==255).sum()-(~old).sum():+} more pixels (mostly suit edges)")

prev = Image.new("RGBA", (a.shape[1], a.shape[0]), (0, 255, 0, 255))
prev.alpha_composite(Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA"))
prev.convert("RGB").save("miles_keyfix_preview.png")
print("wrote miles_keyfix_preview.png  (green = transparent; suit should be fully solid)")
