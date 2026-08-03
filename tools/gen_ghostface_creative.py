#!/usr/bin/env python3
"""Generate Ghostface's 5 KILLER-IDENTITY skins as __<tag>.png sheets.

Targeted per-region palette replacement via tools/recolor_palette.py (NOT hue-rotate).
STAGE 2 = pure VISUAL work (cosmetic sheets only). The per-skin GAMEPLAY modifiers land in
Stages 3-4 (separate infra) — this file does NOT touch gameplay.

GHOSTFACE ZONE REALITY (measured from ghostface_idle_uniform.png):
  * ROBE  — the dark cloak mass. Cool-SATURATED blue-teal (hue ~180-210, sat .40-1.0,
            val .06-.31). ~85% of the silhouette → the dominant identity marker. Recoloured
            per identity to a themed dark tone (value/shading preserved via to_tone).
  * MASK / BLADE — the white ghost face + steel knife. NEUTRAL grayscale (sat < .18,
            val .5-.94). LEFT WHITE for every identity (all Scream killers wear the same
            mask) — excluded by the saturation gate, so the robe pass never touches it.
  * OUTLINE / deep shadow — pure black (val < .05). LEFT #000 (crisp linework) — excluded
            by the value gate (line-art guard).

  The robe is recoloured by SATURATION+VALUE gate (not hue), which cleanly captures the
  cool-saturated cloak and leaves the neutral mask/blade and black outline untouched.

The 5 identities (Scream killers who wore the costume), each a distinct dark robe hue,
well-separated from the default teal and from each other:
  billy  — Billy Loomis (1996, the original) ...... crimson / blood red
  debbie — Debbie Salt / Mrs. Loomis (Scream 2) ... indigo-violet (vengeful)
  roman  — Roman Bridger (Scream 3, the director) . bronze / sepia (film-noir, warm)
  jill   — Jill Roberts (Scream 4) ................ magenta (attention-seeker)
  amber  — Amber Freeman (2022) ................... toxic green (gamer)
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

ROOT = os.path.join(os.path.dirname(__file__), "..")

def ROBE(hex_, spread=1.0):
    # cool-saturated cloak mass -> themed dark tone (multi-tone; shading preserved).
    # sat >= .22 excludes the neutral mask/blade; val .05-.45 excludes black outline + bright mask.
    return dict(mode="region", min_sat=0.22, max_sat=1.0, min_val=0.05, max_val=0.45,
                to_tone=hex_, tone_spread=spread)

# tag -> robe tone. (Single pass — mask/blade/outline preserved by the gates above.)
SKINS = {
    "billy":  [ROBE("#6E1520")],   # crimson / blood red   (H354)
    "debbie": [ROBE("#3E2A66")],   # indigo-violet         (H255)
    "roman":  [ROBE("#5A4622")],   # bronze / sepia (warm) (H43)
    "jill":   [ROBE("#701E50")],   # magenta               (H322)
    "amber":  [ROBE("#1C5A30")],   # toxic green           (H138)
}

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const ghostface"); rest = src[i+15:]
    j = i+15 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(ghostface_[^"]+)"', block)))

def build(tag, only_sheet=None):
    passes = SKINS[tag]
    targets = wired_sheets() + ["ghostface_portrait.png"]
    total = 0
    for name in targets:
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        c = recolor_multi(path, tag, passes)
        total += c
        print(f"  {c:6d}px  {name} -> {name.replace('.png','__'+tag+'.png')}")
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only_sheet = sys.argv[2] if len(sys.argv) > 2 else None
    if tag == "ALL":
        for t in SKINS:
            print(f"=== {t} ===")
            build(t)
        return
    if tag not in SKINS:
        print("skins:", ", ".join(SKINS)); sys.exit(1)
    build(tag, only_sheet)

if __name__ == "__main__":
    main()
