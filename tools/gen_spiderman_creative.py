#!/usr/bin/env python3
# Spider-Man CREATIVE SKIN generator — the full palette batch.
#
# MEASURED (not eyeballed) source palette — Spider-Man is a clean 18-colour CPS2 index:
#   RED zone  (6 shades, dark→light): (128,0,0)(176,0,0)(208,0,0)(240,48,0)(240,96,0)(240,128,0)
#   BLUE zone (5 shades, dark→light): (0,0,160)(0,48,224)(0,96,240)(0,128,240)(0,160,240)
#   BLACK (0,0,0) = OUTLINE **and** WEB-LINES (identical colour — NOT separable by palette) · WHITE
#   (240,240,240) = eye-lenses · (240,240,0) = win-pose head-glow FX. Black/white/yellow are LEFT ALONE.
#
# WEB-LINE CAVEAT: because the web pattern shares black with the outline, skins that asked for a *grey*
# web-line (Frost Line / Obsidian Web / White Reflective) KEEP it black — it still contrasts against their
# fills; a true grey web-line would need new masks (flagged, not silently mis-delivered).
#
# Each skin = a RED ramp (3 stops shadow→mid→high) + a BLUE ramp (2 stops shadow→high). The 6 red / 5 blue
# source shades are remapped by luminance position across the target ramp — an EXACT per-colour lookup on
# the clean palette, plus a luminance-nearest fallback for stray AA. Output: spiderman_<sheet>__<tag>.png.
# (The prior "Negative Zone" white/blue __whiteblue set was a separate bespoke pass — left untouched.)
import glob, os
from PIL import Image

def hx(h):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def sample(stops, t):
    s = [hx(x) for x in stops]
    if len(s) == 1: return s[0]
    seg = t * (len(s) - 1); i = min(len(s) - 2, int(seg)); f = seg - i
    return lerp(s[i], s[i + 1], f)

RED_SRC  = [(128,0,0),(176,0,0),(208,0,0),(240,48,0),(240,96,0),(240,128,0)]   # dark→light
BLUE_SRC = [(0,0,160),(0,48,224),(0,96,240),(0,128,240),(0,160,240)]           # dark→light
def lum(c): return 0.3*c[0] + 0.59*c[1] + 0.11*c[2]
RED_LMIN, RED_LMAX   = lum(RED_SRC[0]),  lum(RED_SRC[-1])
BLUE_LMIN, BLUE_LMAX = lum(BLUE_SRC[0]), lum(BLUE_SRC[-1])

# tag: (red 3-stop shadow→mid→high, blue 2-stop shadow→high)
SPECS = {
    # ── Group 1 ──
    "crimsonweave":       (["#B8001A","#E82438","#FF6B4A"], ["#0A1A3D","#1A3D70"]),
    "verdantwidow":       (["#0F4A1A","#2E7B33","#6BB84A"], ["#0A0A0A","#1F1F1F"]),
    "violetnightcrawler": (["#3D0F5C","#6B2E8C","#A55CC9"], ["#0A0510","#1F1029"]),
    "goldenguardian":     (["#8C5C0F","#C98A2E","#FFCE6B"], ["#291A0A","#4A331A"]),
    # ── Group 2 ──
    "frostline":          (["#295C8C","#5C94C9","#A0D6FF"], ["#D6DCE4","#F0F3F7"]),   # web stays black (flagged)
    "emberstrike":        (["#B82E0A","#E86020","#FF9C4A"], ["#161616","#2E2E2E"]),
    "jadeweb":            (["#0F5C52","#2E8C7B","#6BC9B0"], ["#0A1A29","#1A3D4A"]),
    "obsidianweb":        (["#0A0A0A","#242424","#474747"], ["#1A1A1A","#333333"]),   # web stays black (flagged)
    # ── Specialty ──
    "whitereflective":    (["#B0B8BF","#E8ECEF","#F7F9FA"], ["#0A0A0D","#1F1F24"]),   # web stays black; angular panels deferred (need new masks)
    "voidsovereign":      (["#0F0F12","#0F0F12","#0F0F12"], ["#0F0F12","#0F0F12"]),   # Part A: near-black; Part B = code overlay (game.js)
}

def build_map(red, blue):
    m = {}
    for i, s in enumerate(RED_SRC):  m[s] = sample(red,  i / (len(RED_SRC) - 1))
    for i, s in enumerate(BLUE_SRC): m[s] = sample(blue, i / (len(BLUE_SRC) - 1))
    return m

def is_red(r, g, b):  return r > 100 and r > b + 40 and r > g + 30           # excludes yellow (g high) + blues + greys
def is_blue(r, g, b): return b > r + 40 and b > g

def recolor(src, dst, cmap, red, blue):
    im = Image.open(src).convert("RGBA"); px = im.load(); W, H = im.size; n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0: continue
            key = (r, g, b)
            if key in cmap:
                nr, ng, nb = cmap[key]; px[x, y] = (nr, ng, nb, a); n += 1
            elif is_red(r, g, b):                                            # stray AA red → nearest on red ramp
                t = max(0, min(1, (lum(key) - RED_LMIN) / (RED_LMAX - RED_LMIN)))
                nr, ng, nb = sample(red, t); px[x, y] = (nr, ng, nb, a); n += 1
            elif is_blue(r, g, b):                                           # stray AA blue → nearest on blue ramp
                t = max(0, min(1, (lum(key) - BLUE_LMIN) / (BLUE_LMAX - BLUE_LMIN)))
                nr, ng, nb = sample(blue, t); px[x, y] = (nr, ng, nb, a); n += 1
    im.save(dst); return n

def main():
    srcs = sorted(glob.glob("spiderman_*_uniform.png")) + ["spiderman_portrait.png"]
    srcs = [s for s in srcs if "__" not in s and os.path.exists(s)]
    for tag, (red, blue) in SPECS.items():
        cmap = build_map(red, blue); total = 0
        for s in srcs:
            dst = s.replace(".png", f"__{tag}.png")
            total += recolor(s, dst, cmap, red, blue)
        print(f"OK __{tag}: {len(srcs)} sheets, {total} px remapped")
    print(f"\n{len(SPECS)} skins × {len(srcs)} sheets written")

if __name__ == "__main__":
    main()
