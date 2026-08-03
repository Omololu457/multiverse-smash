#!/usr/bin/env python3
"""Dump the dominant colours of a sprite (optionally within a spatial box) so an accent's
hue/sat/val gate can be chosen for gen_companion_crew.py.

Usage:
  python3 tools/inspect_accent.py <sheet.png> [xlo-xhi] [ylo-yhi] [topN]
    xlo-xhi / ylo-yhi are FRACTIONS of width/height (e.g. 0.4-0.6). Omit or '-' for full.
"""
import sys, os, colorsys
from collections import Counter
from PIL import Image

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return round(h*360), round(s, 2), round(v, 2)

def main():
    path = sys.argv[1]
    if not os.path.isabs(path):
        path = os.path.join(os.path.dirname(__file__), "..", path)
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    px = img.load()
    def band(arg, N):
        if not arg or arg == "-": return (0, N)
        lo, hi = arg.split("-"); return (int(float(lo)*N), int(float(hi)*N))
    xb = band(sys.argv[2] if len(sys.argv) > 2 else None, W)
    yb = band(sys.argv[3] if len(sys.argv) > 3 else None, H)
    topN = int(sys.argv[4]) if len(sys.argv) > 4 else 18
    cnt = Counter()
    for y in range(yb[0], yb[1]):
        for x in range(xb[0], xb[1]):
            r, g, b, a = px[x, y]
            if a == 0: continue
            # coarse-quantize so shading tones of one region group together
            cnt[(r//16*16, g//16*16, b//16*16)] += 1
    print(f"{os.path.basename(path)}  {W}x{H}  box x[{xb[0]},{xb[1]}) y[{yb[0]},{yb[1]})")
    for (r, g, b), n in cnt.most_common(topN):
        h, s, v = hsv(r, g, b)
        print(f"  #{r:02x}{g:02x}{b:02x}  H{h:>3} S{s:<4} V{v:<4}  x{n}")

if __name__ == "__main__":
    main()
