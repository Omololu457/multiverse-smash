#!/usr/bin/env python3
# VEGITO face/hair INTEGRITY CHECK + regression TRIPWIRE.
#
# The Vegito rebuild's whole failure mode was TRANSPARENT HOLES punched into the face/hair (a dark
# subject on a dark-navy bg, keyed by a color rule that couldn't tell hair from background). This tool
# does NOT eyeball — it measures, per frame, whether any transparent pixel is ENCLOSED by the character
# silhouette (an "interior hole"), which is exactly what a hole-in-the-face looks like. It weights the
# HEAD REGION (top 45% of each frame's content) because that's where the damage always landed.
#
# Method (color-independent): for each frame cell, foreground = alpha>THRESH; fill the silhouette's
# enclosed holes (scipy.binary_fill_holes); interior holes = filled AND NOT foreground. Count them,
# and count the subset inside the head band. A correct cutout has ZERO interior holes.
#
# Exit non-zero if any frame has interior head-region holes over TOL — so a bad regeneration can NEVER
# silently ship. Run standalone (`python3 tools/vegito_face_check.py`) or import check_strip().
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage

THRESH = 16          # alpha above this = opaque
HEAD_FRAC = 0.45     # top 45% of a frame's content height = head/hair band
HOLE_TOL = 0         # allowed interior head-holes per frame (0 = none)

def frame_cells(im):
    """Split a uniform strip into equal frame cells by the widest gap-free layout: cells are equal
    width = W / nframes. We infer nframes from transparent column gutters between frames."""
    a = np.asarray(im.convert("RGBA"))
    alpha = a[:, :, 3] > THRESH
    W = alpha.shape[1]
    colon = alpha.any(0)
    # frame boundaries = runs of 'on' columns separated by fully-empty gutters
    runs, x = [], 0
    while x < W:
        if colon[x]:
            s = x
            while x < W and colon[x]: x += 1
            runs.append((s, x - 1))
        else:
            x += 1
    return alpha, runs

def interior_holes(fg):
    """Return (total_interior_holes, head_region_holes) for one frame's foreground mask."""
    if not fg.any():
        return 0, 0
    filled = ndimage.binary_fill_holes(fg)
    holes = filled & ~fg
    ys = np.where(fg.any(1))[0]
    y0, y1 = ys[0], ys[-1]
    head_cut = y0 + int((y1 - y0 + 1) * HEAD_FRAC)
    head_holes = int(holes[y0:head_cut + 1, :].sum())
    return int(holes.sum()), head_holes

def check_strip(path):
    im = Image.open(path)
    alpha, runs = frame_cells(im)
    results = []
    for i, (fx0, fx1) in enumerate(runs):
        fg = alpha[:, fx0:fx1 + 1]
        total, head = interior_holes(fg)
        results.append({"frame": i, "interior_holes": total, "head_holes": head})
    return results

def main():
    files = sorted(glob.glob("vegito_*_uniform.png"))
    if not files:
        print("no vegito_*_uniform.png found"); return 2
    bad = 0
    print(f"{'file':40s} frames  worst_head_holes  total_interior")
    for f in files:
        res = check_strip(f)
        worst_head = max((r["head_holes"] for r in res), default=0)
        total = sum(r["interior_holes"] for r in res)
        flag = "  <-- FAIL" if worst_head > HOLE_TOL else ""
        if worst_head > HOLE_TOL: bad += 1
        print(f"{os.path.basename(f):40s} {len(res):5d}  {worst_head:15d}  {total:12d}{flag}")
    print()
    if bad:
        print(f"FAIL: {bad} strip(s) have interior HEAD-region holes (face/hair damage). Regeneration is BROKEN.")
        return 1
    print(f"PASS: all {len(files)} strips have ZERO interior head-region holes — faces/hair intact.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
