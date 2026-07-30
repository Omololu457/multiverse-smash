#!/usr/bin/env python3
"""Generate Batman's "Nightwatch" alt-color skin (__nightwatch.png sheets).

Dark tactical recolor with cyan glow accents, via tools/recolor_palette.py (targeted per-region
replacement — NOT hue-rotate). All THREE regions are colour-separable, so this is pure palette work
(no per-frame spatial edits). Cosmetic; zero gameplay change.

REGIONS (reported vs the brief's accent list):
  * SUIT  — near-neutral dark (sat<.18, val .03-.40): Batman's base suit is ALREADY near-black
            (#101010/#000/#202020). Given a faint COOL charcoal tint (to-hue 220, to-sat .13,
            value preserved) landing in the brief's #0D0E10–#1A1B1F range so it reads "tactical"
            not neutral-grey. Pure-black (#000) outlines/cape stay black (val<.03 excluded).
  * ACCENTS: EMBLEM + BELT  — the yellow bat-symbol (chest, y~33-40) and utility belt (y~51-57)
            share one hue family (40-56, sat>.55) → both recolour to bright cyan #3DDBEE (to-tone,
            shading preserved → reads as accent-glow). ACHIEVED.
  * ACCENTS: EYES  — a small white cowl eye-slit (~3px/frame, sat<.12 val>.85) → bright cyan glow.
            ACHIEVED but TINY (only a few pixels; barely reads at sprite scale — reported honestly).
  SKIN (exposed chin/jaw, hue 20-30 sat .46-.55) is untouched by every pass (sat/val gates exclude it).
  No belt-BUCKLE highlight exists as a pixel region distinct from the belt itself → nothing extra to do.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

TAG = "nightwatch"
ROOT = os.path.join(os.path.dirname(__file__), "..")

PASSES = [
    # EMBLEM + BELT (yellow) -> cyan glow
    dict(mode="region", from_hue="35-60", min_sat=0.55, to_tone="#3DDBEE"),
    # EYES (white slit) -> bright cyan glow (min_sat 0 so the neutral white is selected)
    dict(mode="region", min_sat=0.0, max_sat=0.12, min_val=0.85, to_hue="187", to_sat="0.50"),
    # SUIT (near-neutral dark) -> faint cool charcoal; value preserved so #000 stays black
    dict(mode="region", min_sat=0.0, max_sat=0.18, min_val=0.03, max_val=0.40, to_hue="220", to_sat="0.13"),
]

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const batman"); rest = src[i+12:]
    j = i+12 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(batman_[^"]+)"', block)))

def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    targets = wired_sheets() + ["batman_portrait.png"]
    total = 0
    for name in targets:
        if only and only not in name: continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        c = recolor_multi(path, TAG, PASSES)
        total += c
        print(f"  {c:6d}px  {name}")
    print(f"DONE {total}px")

if __name__ == "__main__":
    main()
