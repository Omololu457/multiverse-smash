#!/usr/bin/env python3
# Diagnose the Sukuna transparency bug (same CLASS as Gojo): interior alpha=0 HOLES where opaque character
# art should be. Detection = flood-fill the transparent region inward from the sheet border; any transparent
# pixel NOT reachable from the border is ENCLOSED by opaque art → a genuine hole (missing pixel data), NOT
# legitimate background. Reports per-sheet and per-frame (frame width taken from characters.js animationData).
# READ-ONLY: prints stats, writes nothing.
import sys
from collections import deque
from PIL import Image

ALPHA_T = 16   # <= this = "transparent"

# wired base sheets → (frames, frame_width) from characters.js animationData
SHEETS = [
    ("sukuna_idle_sheet.png", 4, 27),
    ("sukuna_walk_sheet.png", 10, 31),
    ("sukuna_jump_sheet.png", 2, 28),
    ("sukuna_dash_sheet.png", 3, 52),
    ("sukuna_attack_sheet.png", 3, 51),
    ("sukuna_ultimate_sheet.png", 4, 37),
    ("sukuna_domain_sheet.png", 7, 36),
    ("sukuna_firearrow_charge_sheet.png", 7, 36),
    ("sukuna_firearrow_fire_sheet.png", 4, 59),
]

def enclosed_holes(im):
    """Return (mask of enclosed-transparent pixels, count)."""
    w, h = im.size
    px = im.load()
    transparent = [[px[x, y][3] <= ALPHA_T for x in range(w)] for y in range(h)]
    outside = [[False] * w for _ in range(h)]
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if transparent[y][x] and not outside[y][x]:
                outside[y][x] = True; dq.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if transparent[y][x] and not outside[y][x]:
                outside[y][x] = True; dq.append((x, y))
    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and transparent[ny][nx] and not outside[ny][nx]:
                outside[ny][nx] = True; dq.append((nx, ny))
    holes = [[transparent[y][x] and not outside[y][x] for x in range(w)] for y in range(h)]
    return holes, sum(sum(r) for r in holes)

def main():
    total_holes = 0
    for name, frames, fw in SHEETS:
        try:
            im = Image.open(name).convert("RGBA")
        except FileNotFoundError:
            print(f"  {name}: MISSING ON DISK"); continue
        w, h = im.size
        holes, n = enclosed_holes(im)
        opaque = sum(1 for y in range(h) for x in range(w) if im.load()[x, y][3] > ALPHA_T)
        pct = 100.0 * n / max(1, opaque + n)
        flag = "  <-- HOLES" if n else ""
        print(f"  {name:40s} {w}x{h}  {frames}f  enclosed-transparent px = {n:5d} ({pct:.1f}% of body){flag}")
        total_holes += n
        if n:
            # per-frame breakdown
            for fi in range(frames):
                x0 = fi * fw
                fn = sum(1 for y in range(h) for x in range(x0, min(x0 + fw, w)) if holes[y][x])
                if fn:
                    print(f"      frame {fi}: {fn} hole px")
    print(f"\n  TOTAL enclosed-transparent (hole) px across wired base sheets: {total_holes}")

if __name__ == "__main__":
    main()
