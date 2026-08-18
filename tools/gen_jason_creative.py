#!/usr/bin/env python3
"""Generate Jason Voorhees's 13-skin batch as __<tag>.png sheets (his FIRST skin batch).

Targeted per-region palette replacement via tools/recolor_palette.py (NOT hue-rotate). Cosmetic
sheets only — ZERO gameplay. Jason's identity is DESATURATED/GROUNDED, so skins stay in an
aged/weathered/bloodied/homage register (no saturated rainbows), per the design spec.

THREE regions, measured from jason_idl.png / jason_*_uniform.png (see the histogram in the build log):
  * JACKET/PANTS — the near-black navy mass RGB~(24,24,36). COOL + DARK: b>=r, val<~0.34 (~22.5k px,
                   the dominant silhouette). Selected by max_val 0.40 + max_warm (cool/neutral) +
                   min_val 0.06 (keeps the pure-black OUTLINE at val<.06 untouched = crisp linework).
  * MASK/GREY    — the hockey mask + steel, NEUTRAL grayscale RGB~(48..216) (~2.5k px). Selected by
                   sat<0.16 + val 0.40-0.98 (brighter than the jacket → clean split from it).
  * SKIN         — the small warm face/hand patches RGB(156,120,108)→(228,204,180) (~1k px). Selected
                   by warm hue 5-45 + sat>=0.12 + val>=0.40.
All recolors use --to-tone (re-centers the region's MID tone on the target, PRESERVES light/dark
shading spread) so weathered/aged shading survives. Later passes see earlier passes' output.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── region pass builders (gates from the measured histogram) ──
def JACKET(hex_, spread=1.0, sat=None, ymin=0.0, ymax=1.0):
    d = dict(mode="region", min_sat=0.0, max_sat=1.0, min_val=0.06, max_val=0.40, max_warm=8,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    if (ymin, ymax) != (0.0, 1.0): d["yband"] = f"{ymin}-{ymax}"
    return d

def MASK(hex_, spread=1.0, sat=None):
    d = dict(mode="region", min_sat=0.0, max_sat=0.16, min_val=0.40, max_val=0.98, max_warm=10,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

def SKIN(hex_, spread=1.0, sat=None):
    d = dict(mode="region", from_hue="5-45", min_sat=0.12, max_sat=0.7, min_val=0.40, max_val=1.0,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

# ── the 13 skins (order matches the spec) ──
SKINS = {
    # 1. Weathered Mask — aged yellow-grey dirty mask, faded (LIGHTER) charcoal jacket.
    "weathered": [MASK("#b3a882", sat=0.20), JACKET("#4c4c54")],
    # 2. Bloodbath — deep red-brown blood-splatter mask; jacket base + a blood-trail accent (lower body).
    "bloodbath": [MASK("#5c2622", sat=0.45), JACKET("#3a1210", ymin=0.45, ymax=1.0)],
    # 3. Burlap Sack — mask fully replaced with tan/burlap-brown; jacket UNCHANGED.
    "burlap":    [MASK("#8c6a3e", sat=0.5)],
    # 4. Midnight Stalker — pale-grey (legible) mask, near-total matte-black jacket/pants.
    "midnight":  [MASK("#8e8e92", sat=0.03), JACKET("#0b0b0d")],
    # 5. Toxic Revenant — cracked grey-green mask, sickly green-grey jacket, pale sickly-green skin.
    "toxic":     [MASK("#5c6a50", sat=0.22), JACKET("#3a463a"), SKIN("#8c9a76", sat=0.30)],
    # 6. Camp Counselor Red — mask unchanged; deep flannel-red jacket.
    "counselor": [JACKET("#6e2222", sat=0.6)],
    # 7. Ashen — charred grey-black mask; near-black jacket with a FAINT warm ember undertone (subtle, not
    #    brown/glowing): a low-sat warm-charcoal tone + a touch of extra spread so only the lit edges warm up.
    "ashen":     [MASK("#2e2e30", sat=0.04), JACKET("#1d1712", sat=0.16, spread=1.35)],
    # 8. Frozen Lake — cold blue-white mask, icy pale-blue jacket, pale/cold skin.
    "frozen":    [MASK("#c2d2de", sat=0.14), JACKET("#5a6a78", sat=0.28), SKIN("#b8c2c4", sat=0.10)],
    # 9. Steel Reaper — metallic silver-grey mask, gunmetal-grey jacket, faint-blue subtle accent.
    "steel":     [MASK("#aab0b6", sat=0.06), JACKET("#42474e", sat=0.16)],
    # 10. Crimson Harvest — mask AND jacket both deep SATURATED blood-red (the boldest skin, deliberately).
    "crimson":   [MASK("#921616", sat=0.80), JACKET("#7c1010", sat=0.82)],
    # 11. Shadow Puppet — mask unchanged pale white; full black-on-black jacket/pants (near-zero contrast).
    "shadow":    [JACKET("#080809")],
    # 12. Old Bone — BLEACHED bone/ivory mask (lighter/less saturated than #1's dirt), weathered-brown jacket.
    "bone":      [MASK("#dcd0a6", sat=0.22), JACKET("#4a3a2a", sat=0.34)],
    # 13. Nightmare Void — full black body base (crimson particle aura/eyes drawn by game.js overlay).
    "void":      [MASK("#1a1516"), JACKET("#0a0809")],
}

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const jason ="); rest = src[i+13:]
    j = i+13 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(jason_[^"]+)"', block)))

def build(tag, only_sheet=None):
    passes = SKINS[tag]
    targets = wired_sheets() + ["jason_portrait.png"]
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
            build(t, only_sheet)
        return
    if tag not in SKINS:
        print("skins:", ", ".join(SKINS)); sys.exit(1)
    build(tag, only_sheet)

if __name__ == "__main__":
    main()
