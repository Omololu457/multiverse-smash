#!/usr/bin/env python3
"""Generate Zenitsu's "Lavender" alt-color skin (__lavender.png sheets).

Remaps Zenitsu's signature FIERY hair + haori (an orange→yellow→red gradient garment) to a muted
cool lavender-pink #C9A0D4, preserving the light/dark shading gradient. All other colours — skin,
black kimono base/trim, whites/greys — untouched. Cosmetic; via tools/recolor_palette.py (targeted
per-region, NOT hue-rotate).

THE SEPARATION: the fiery region overlaps SKIN in hue (both warm) and its deep end overlaps the
near-black KIMONO in hue (both red-tinted). Split by hue+saturation+value in THREE bands, all mapped
with ONE SHARED tone-pivot so the orange→red gradient becomes a single continuous light→dark lavender
(bright orange → light lavender, deep-red scale-tips → mid/dark lavender), not three disjoint recolors:
  * ORANGE  hue 12-44, sat>=.68            → vivid orange + dark hair shadows; EXCLUDES skin
            (#F0B080 .47 / #F0E0C0 .20 / #B06040 .64, all < .68).
  * YELLOW  hue 44-64, sat>=.42            → yellow + pale highlights (#F0F080) at hue 60 (no skin there);
            greys (#808070 sat .12) excluded by the sat gate.
  * RED     hue 344-6 (wrap), sat>=.60, val>=.26 → the deep-red haori scale-tips (#B01020 .69 / #700010
            .44) + the dark-maroon HAIR outline (#500000 .31, hair-only y-band). val>=.26 KEEPS the
            near-black kimono (#100000 .06 / #300000 .19) BLACK and the brown hakama (#403010 sat .65,
            below the orange gate) untouched.
Untouched: skin, black kimono, whites/greys.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import apply_recolor, build_selection_mask, _NS
from PIL import Image

TAG = "lavender"
TARGET = "#C9A0D4"
ROOT = os.path.join(os.path.dirname(__file__), "..")

BANDS = [
    dict(from_hue="12-44", min_sat=0.68),
    dict(from_hue="44-64", min_sat=0.42),
    dict(from_hue="344-6", min_sat=0.60, min_val=0.26),
]

def shared_pivot(img):
    """Mean value over the union of all three band selections → one pivot for a continuous gradient."""
    px = img.tobytes(); W, H = img.size
    sv = 0.0; sn = 0
    seen = bytearray(W*H)
    for b in BANDS:
        mask = build_selection_mask(px, W, H, _NS(mode="region", to_tone=TARGET, **b))
        for i in range(W*H):
            if mask[i] and not seen[i]:
                seen[i] = 1
                _, _, v = colorsys.rgb_to_hsv(px[i*4]/255, px[i*4+1]/255, px[i*4+2]/255)
                sv += v; sn += 1
    return (sv/sn) if sn else 0.5

def process(name):
    img = Image.open(os.path.join(ROOT, name)).convert("RGBA")
    pivot = shared_pivot(img)
    total = 0
    for b in BANDS:
        img, c = apply_recolor(img, _NS(mode="region", to_tone=TARGET, tone_pivot=pivot, **b))
        total += c
    img.save(os.path.join(ROOT, f"{name[:-4]}__{TAG}.png"))
    return total, pivot

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const zenitsu"); rest = src[i+13:]
    j = i+13 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(zenitsu_[^"]+)"', block)))

def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    targets = wired_sheets() + ["zenitsu_portrait.png"]
    tot = 0
    for name in targets:
        if only and only not in name: continue
        if not os.path.exists(os.path.join(ROOT, name)):
            print(f"  SKIP (missing) {name}"); continue
        c, pv = process(name); tot += c
        print(f"  {c:6d}px  pivot={pv:.2f}  {name}")
    print(f"DONE {tot}px")

if __name__ == "__main__":
    main()
