#!/usr/bin/env python3
# Count blood-red particle pixels in the PLAY AREA of each capture, so we can (a) pick the
# frames that actually show blood spray and (b) prove ON vs OFF differ. Blood debris is ~#b01818
# (strong R, low G/B). HUD health bars are also red, so we crop them out by band.
import sys, os, glob
from PIL import Image

def blood_count(path):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    px = im.load()
    # Exclude HUD: top ~9% (health bars) and bottom ~14% (controls / spectator strip / energy bars).
    y0, y1 = int(H * 0.10), int(H * 0.84)
    n = 0
    step = 2  # subsample for speed
    for y in range(y0, y1, step):
        for x in range(0, W, step):
            r, g, b = px[x, y]
            if r > 130 and g < 70 and b < 70 and (r - g) > 80 and (r - b) > 80:
                n += 1
    return n

def main():
    d = sys.argv[1] if len(sys.argv) > 1 else "electron/shots/fx"
    groups = {}
    for f in sorted(glob.glob(os.path.join(d, "blood_*.png"))):
        base = os.path.basename(f)
        key = base.rsplit("_", 1)[0]  # strip frame index
        groups.setdefault(key, []).append((base, blood_count(f)))
    for key in sorted(groups):
        rows = groups[key]
        tot = sum(c for _, c in rows)
        best = max(rows, key=lambda r: r[1])
        print(f"{key:38s}  total={tot:7d}  peak={best[1]:6d} @ {best[0]}")

if __name__ == "__main__":
    main()
