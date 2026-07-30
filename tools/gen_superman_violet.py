#!/usr/bin/env python3
"""Generate Superman's "Violet" alt-color skin (__violet.png sheets).

Single-colour swap: every RED region (cape, boots, chest-emblem accent lines — all one shared red
palette #600000/#A00000/#F00000, hue 0) → deep violet #6B3FA0, preserving the red's light/dark
shading (to-tone). The blue bodysuit (hue ~215) and the gold "S"/belt (hue ~50) are left untouched.
Cosmetic; via tools/recolor_palette.py (targeted per-region, NOT hue-rotate).

SELECTION: from-hue 345-12 (wrap), min_sat 0.70 → catches the pure reds (sat ~1.0) while EXCLUDING
the warm SKIN (hue 15-17: #F0A080 sat .47, #C06040 sat .67 — both below .70 and mostly outside the
hue band). Gold (hue 30-60) and blue (hue 210-220) are outside the hue band entirely.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_file
from PIL import Image

TAG = "violet"
ROOT = os.path.join(os.path.dirname(__file__), "..")
OPTS = dict(mode="region", from_hue="345-12", min_sat=0.70, to_tone="#6B3FA0")

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    k = src.find("const superman")
    if k >= 0:
        rest = src[k+14:]; j = k+14 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
        block = src[k:j]
    else:
        block = src
    return sorted(set(re.findall(r'sheet:\s*"\./(superman_[^"]+)"', block)))

def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    targets = wired_sheets() + ["superman_portrait.png"]
    tot = 0
    for name in targets:
        if only and only not in name: continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            print(f"  SKIP {name}"); continue
        c = recolor_file(p, TAG, **OPTS); tot += c
        print(f"  {c:6d}px  {name}")
    print(f"DONE violet {tot}px")

if __name__ == "__main__":
    main()
