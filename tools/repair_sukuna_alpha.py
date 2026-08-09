#!/usr/bin/env python3
# Repair the Sukuna transparency bug (same fix as Gojo): INPAINT enclosed alpha=0 holes — reconstruct the
# missing interior pixels from the real character art that surrounds them. Holes are found by flooding the
# transparent region inward from the border (so the OUTER background is never touched); each remaining
# enclosed transparent pixel is filled with the mean RGB of its opaque 8-neighbours, iterated until solid,
# then alpha=255. This synthesizes the "insides" from the immediately-surrounding real pixel data (there is
# no clean source to restore from: git HEAD is identically broken, the master art carries no alpha).
#
# Usage: python3 tools/repair_sukuna_alpha.py [--dry] file1.png file2.png ...
#   --dry : report only, write nothing.
import sys
from collections import deque
from PIL import Image

ALPHA_T = 16

def enclosed_holes(px, w, h):
    tr = [[px[x, y][3] <= ALPHA_T for x in range(w)] for y in range(h)]
    out = [[False] * w for _ in range(h)]
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if tr[y][x] and not out[y][x]: out[y][x] = True; dq.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if tr[y][x] and not out[y][x]: out[y][x] = True; dq.append((x, y))
    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and tr[ny][nx] and not out[ny][nx]:
                out[ny][nx] = True; dq.append((nx, ny))
    return {(x, y) for y in range(h) for x in range(w) if tr[y][x] and not out[y][x]}

def inpaint(im):
    w, h = im.size
    px = im.load()
    holes = enclosed_holes(px, w, h)
    n0 = len(holes)
    guard = 0
    while holes:
        guard += 1
        if guard > 200:
            raise RuntimeError("inpaint did not converge")
        filled_this_pass = []
        for (x, y) in holes:
            rs = gs = bs = c = 0
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if dx == 0 and dy == 0: continue
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        r, g, b, a = px[nx, ny]
                        if a > ALPHA_T:
                            rs += r; gs += g; bs += b; c += 1
            if c:
                filled_this_pass.append((x, y, (rs // c, gs // c, bs // c, 255)))
        if not filled_this_pass:
            break   # (shouldn't happen: every enclosed hole touches opaque art within a ring)
        for (x, y, col) in filled_this_pass:
            px[x, y] = col
        holes = {(x, y) for (x, y) in holes if (x, y) not in {(a, b) for (a, b, _) in filled_this_pass}}
    return n0

def main():
    args = sys.argv[1:]
    dry = "--dry" in args
    files = [a for a in args if not a.startswith("--")]
    total = 0
    for f in files:
        im = Image.open(f).convert("RGBA")
        n = inpaint(im)
        total += n
        # verify clean
        left = len(enclosed_holes(im.load(), *im.size))
        status = "DRY" if dry else "WROTE"
        if not dry and n:
            im.save(f)
        print(f"  {f:42s} holes filled={n:5d}  remaining={left}  [{status if n else 'clean-already'}]")
    print(f"\n  total holes inpainted: {total}")

if __name__ == "__main__":
    main()
