#!/usr/bin/env python3
"""Generate Batman's alt-color skin batch (10 skins) as __<tag>.png sheets.

Targeted per-region palette replacement via tools/recolor_palette.py (NOT hue-rotate).
Cosmetic only; zero gameplay change.

BATMAN ZONE REALITY (measured — see /tmp/batman_zonemap.png):
  Batman's sprite is monochrome-dark. The ONLY colour-separable regions are:
    * MAIN  — every LIT suit surface (charcoal ~#181818, low-sat, val .045-.45). This is
              body + cowl + boots AND the lit drape of the cape — they are ONE material tone,
              NOT separable from each other by colour or by tone.
    * CAPE/SHADOW — pure-black (val < .045): outlines + all shadows + the cape's shadowed
              interior/scallops. Recolouring THIS to a darker family tone makes the cape (which
              is mostly shadow) read darker than the body — the best available "two-tone" lever.
              Leaving it #000 keeps crisp black linework and a genuinely near-black cape.
    * ACCENT — emblem + belt (gold, hue 33-60 sat>.50). One family; recolours together.
    * SKIN (exposed chin/jaw) + white eye-slit are EXCLUDED from every pass (sat/val gates).

  => A cape coloured *contrastingly differently* from the suit is NOT achievable on this sprite
     (they share one lit tone). "cape = darker shade of same family" IS approximable via the
     MAIN/CAPE split above. Each skin below records honestly what it can and cannot deliver.

PASS ORDER (per sheet): accent (hue-gated) -> main (low-sat mid-val) -> cape (pure-black).
Non-overlapping value/sat gates so passes don't clobber each other.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Reusable pass builders ----------------------------------------------------
def MAIN(hex_, spread=1.0):
    # lit suit charcoal -> main colour (multi-tone; shading preserved)
    return dict(mode="region", min_sat=0.0, max_sat=0.22, min_val=0.045, max_val=0.45,
                max_warm=20, to_tone=hex_, tone_spread=spread)

def CAPE(hex_, spread=1.0):
    # pure-black shadow/outline/cape-interior -> darker cape tone
    return dict(mode="region", min_sat=0.0, max_sat=1.0, min_val=0.0, max_val=0.045,
                to_tone=hex_, tone_spread=spread)

def ACCENT(hex_, spread=1.0):
    # emblem + belt gold -> accent colour (gold retint, or -> silver/black via low-sat hex)
    return dict(mode="region", from_hue="33-60", min_sat=0.50, to_tone=hex_, tone_spread=spread)

GOLD_STD  = "#D4A537"
GOLD_BRT  = "#E0B93B"
SILVER    = "#B8B8BC"
BLACKACC  = "#15151A"

# Skin table: tag -> list of passes (applied in order). Cape pass omitted => black stays #000.
SKINS = {
    # ---- PART 1: alternate-suit themes ----
    "steelblue":   [ACCENT(GOLD_STD), MAIN("#2A3A52")],                       # slate-blue suit, near-black cape, gold
    "crimsonwatch":[ACCENT(SILVER),   MAIN("#15151A"), CAPE("#7A1F1F")],      # black suit, red cape (in shadow mass), silver
    "silverage":   [ACCENT(GOLD_STD), MAIN("#7A8CA0"), CAPE("#2A3550")],      # pale gray-blue suit, navy cape, gold
    "stealthwhite":[ACCENT(BLACKACC), MAIN("#D8D8D4")],                       # off-white suit, black cape/accents
    "goldenknight":[ACCENT(GOLD_BRT)],                                        # black suit+cape, bright-gold accents
    # ---- PART 2: vivid colour families ----
    "lavender":    [ACCENT(SILVER),   MAIN("#B8A0D4"), CAPE("#5A2E8F")],      # lavender suit, violet cape, silver
    "rose":        [ACCENT(SILVER),   MAIN("#D45A8C"), CAPE("#8F2A5A")],      # pink suit, magenta cape, silver
    "amethyst":    [ACCENT(SILVER),   MAIN("#6B3FA0")],                       # purple suit, near-black cape, silver
    "cobalt":      [ACCENT(SILVER),   MAIN("#2A5DB8")],                       # vivid-blue suit, near-black cape, silver
    "emerald":     [ACCENT(GOLD_STD), MAIN("#2E6B4A")],                       # deep-green suit, near-black cape, gold
}

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const batman"); rest = src[i+12:]
    j = i+12 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(batman_[^"]+)"', block)))

def build(tag, only_sheet=None):
    passes = SKINS[tag]
    targets = wired_sheets() + ["batman_portrait.png"]
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
