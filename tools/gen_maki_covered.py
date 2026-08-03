#!/usr/bin/env python3
# Maki "Covered" Ultimate-form variant — covers the Shibuya-Arc form's arm blood/gore with a dark
# long-sleeve, as a MASKED FILL over existing pixels (the arm silhouette already exists → NO new geometry;
# this is the Superman-trunks / Hisoka-emblem class, not the "needs-geometry" limitation).
#
# WHY masking-only works cleanly here:
#   • MASK = ratio-based warm detector (red clearly dominates G & B). Catches the bright orange core AND
#     the anti-aliased dark-maroon EDGE pixels that a brightness threshold misses (→ no red-fringe seam).
#     The costume/hair/sword are neutral (R≈G≈B) and the effect arcs are purple (high B) / white (neutral),
#     so they are all excluded automatically — verified: 0 overlap with the purple up-launcher arc.
#   • FILL = luma-preserving. Each covered pixel keeps its original brightness → the arm keeps its light/dark
#     shading and reads as a real sleeve, not a flat dead patch.
# Processes every _skinAnim sheet in MAKI_SHIBUYA_ANIM → *_covered.png (byte-for-byte outside the mask).
import numpy as np
from PIL import Image

SHEETS = [
    "maki_shibuya_idle_uniform", "maki_shibuya_run_uniform", "maki_shibuya_jump_uniform",
    "maki_shibuya_intro_uniform", "maki_shibuya_light_uniform", "maki_shibuya_heavy_uniform",
    "maki_shibuya_up_uniform", "maki_shibuya_air_uniform", "maki_shibuya_downair_uniform",
    "maki_shibuya_g1_uniform", "maki_shibuya_g2_uniform", "maki_shibuya_g3_uniform",
]
# dark-navy long-sleeve, shaded dark→light by the original pixel's luma
SLEEVE_DARK  = np.array((14, 15, 22))
SLEEVE_LIGHT = np.array((48, 50, 70))
LUMA_LO, LUMA_HI = 40, 150

def cover(path_in, path_out):
    im = Image.open(path_in).convert("RGBA")
    a = np.array(im).astype(int)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    op = al > 16
    warm = op & (r - g >= 16) & (r - b >= 16) & (r >= 42)   # the gore (arm + minor face/hand blood)
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    t = np.clip((lum - LUMA_LO) / (LUMA_HI - LUMA_LO), 0, 1)
    out = a.copy()
    for c in range(3):
        out[:, :, c][warm] = (SLEEVE_DARK[c] + (SLEEVE_LIGHT[c] - SLEEVE_DARK[c]) * t)[warm].astype(int)
    Image.fromarray(out.astype("uint8"), "RGBA").save(path_out)
    return int(warm.sum())

if __name__ == "__main__":
    total = 0
    for s in SHEETS:
        n = cover(f"{s}.png", f"{s.replace('_uniform', '_covered')}.png")
        total += n
        print(f"  {s} → {s.replace('_uniform','_covered')}.png  ({n} gore px covered)")
    print(f"DONE — {len(SHEETS)} sheets, {total} gore px covered total")
