#!/usr/bin/env python3
"""Repack a uniform sprite strip to DROP blank/speck cells, keeping real poses only.

Companion to tools/reslice_audit.mjs. The audit flags EMPTY cells — a wired frame
with no pixels (a 1px stray speck from the raw art that the original reslice turned
into a phantom cell). Rendering steps onto that cell → the character flickers
invisible for that frame. This tool removes the phantom cell(s).

METHOD (same alpha-gutter scan as reslice_obito.py's detect_islands):
  • detect content islands on the BASE sheet (GAP-merge small internal gaps,
    DROP islands narrower than --min-w = the specks),
  • repack the surviving real poses into contiguous cells of a FIXED width
    (the sheet's existing wired cell width — every real pose already fits it),
  • keep the FULL original height, each pose at its original Y → anchorY/height
    in characters.js stay valid; only the frame COUNT changes.

Skins: the engine uses ONE {frames,width} for a sheet and all its recolors, so the
SAME island x-ranges detected on the base are applied to every `<stem>__*.png`
variant in lockstep — they stay pixel-aligned.

USAGE:  python3 tools/reslice_repack.py <base.png> <cell_width> [--min-w N] [--gap N] [--dry]
Prints the new {frames,width,height} to wire into characters.js.
"""
import sys, glob, os
from PIL import Image
import numpy as np

ALPHA = 16   # alpha <= this = transparent (project standard: slice_probe / every reslice_*.py)


def detect_islands(alpha, gap, min_w):
    occ = (alpha > ALPHA).sum(axis=0) > 0
    runs, s = [], None
    for x, v in enumerate(occ):
        if v and s is None:
            s = x
        if not v and s is not None:
            runs.append([s, x - 1]); s = None
    if s is not None:
        runs.append([s, len(occ) - 1])
    # merge runs separated by <= gap transparent cols (bridge small INTERNAL pose gaps)
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] - 1 <= gap:
            merged[-1][1] = r[1]
        else:
            merged.append(list(r))
    # drop specks (islands narrower than min_w) — these are the phantom blank cells
    real = [r for r in merged if (r[1] - r[0] + 1) >= min_w]
    dropped = [r for r in merged if (r[1] - r[0] + 1) < min_w]
    return real, dropped


def repack(path, islands, cell_w, out=None):
    im = Image.open(path).convert("RGBA")
    h = im.height
    n = len(islands)
    sheet = Image.new("RGBA", (cell_w * n, h), (0, 0, 0, 0))
    for i, (x0, x1) in enumerate(islands):
        fw = x1 - x0 + 1
        frame = im.crop((x0, 0, x1 + 1, h))              # full height → poses keep their Y
        dx = i * cell_w + (cell_w - fw) // 2             # center in the fixed-width cell
        sheet.paste(frame, (dx, 0), frame)
    (sheet if out is None else sheet).save(out or path)
    return n, cell_w, h


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    base = sys.argv[1]
    cell_w = int(sys.argv[2])
    min_w = 4; gap = 6; dry = False
    args = sys.argv[3:]
    i = 0
    while i < len(args):
        if args[i] == "--min-w": min_w = int(args[i + 1]); i += 2
        elif args[i] == "--gap": gap = int(args[i + 1]); i += 2
        elif args[i] == "--dry": dry = True; i += 1
        else: i += 1

    im = Image.open(base).convert("RGBA")
    alpha = np.array(im)[:, :, 3]
    islands, dropped = detect_islands(alpha, gap, min_w)
    widths = [x1 - x0 + 1 for x0, x1 in islands]
    max_w = max(widths) if widths else 0
    print(f"base {base}: {im.width}x{im.height}")
    print(f"  detected {len(islands)} real island(s) (dropped {len(dropped)} speck(s) < {min_w}px: "
          f"{[f'{a}..{b}' for a, b in dropped]})")
    print(f"  real islands: {[f'{a}..{b}({b-a+1})' for a, b in islands]}")
    if max_w > cell_w:
        print(f"  !! widest real pose {max_w}px EXCEEDS target cell width {cell_w}px — pick a larger width")
        sys.exit(1)
    if dry:
        print(f"  DRY: would write {len(islands)} frames x {cell_w}px x {im.height}px")
        return

    stem = base[:-4] if base.endswith(".png") else base
    variants = [base] + sorted(f for f in glob.glob(f"{stem}__*.png"))
    for v in variants:
        n, w, h = repack(v, islands, cell_w)
        print(f"  repacked {os.path.basename(v)} -> {n}f x {w}px x {h}px")
    print(f"\nWIRE IN characters.js:  frames: {len(islands)}, width: {cell_w}, height: {im.height}")


if __name__ == "__main__":
    main()
