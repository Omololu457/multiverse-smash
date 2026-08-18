#!/usr/bin/env python3
"""Generate Isshiki Otsutsuki's 13-skin batch as __<tag>.png sheets (his FIRST skin batch).

Targeted per-region palette replacement via tools/recolor_palette.py (mirrors gen_jason_creative.py).
Cosmetic sheets only — ZERO gameplay. FX sheets (rings/rods/cubes/fire) stay CANONICAL (only the
CHARACTER body sheets wired in characters.js + the portrait are recolored).

THREE regions, from the confirmed pixel sample of the source art (verified vs isshiki_idle_uniform.png):
  * ROBE  — the near-black COOL robe mass RGB~(16,16,32). Selected by val 0.04-0.42 + cool/neutral
            (r-b <= 10) → excludes the warm crimson trim and the bright pale hair/skin. The dominant
            silhouette; recolored with --to-tone (re-centers the MID tone, preserves the shading spread).
  * TRIM  — the crimson trim RGB~(96,0,0)/(128,0,16). Selected by red hue 340-20 (wraps) + sat>=0.45 +
            val 0.12-0.65 → the saturated red accents only.
  * PALE  — the pale white hair/skin RGB~(224,224,240)/(208,208,192). Selected by val>=0.70 + sat<=0.25.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

ROOT = os.path.join(os.path.dirname(__file__), "..")

def ROBE(hex_, spread=1.0, sat=None):
    d = dict(mode="region", min_sat=0.0, max_sat=1.0, min_val=0.04, max_val=0.42, max_warm=10,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

def TRIM(hex_, spread=1.0, sat=None):
    d = dict(mode="region", from_hue="340-20", min_sat=0.45, max_sat=1.0, min_val=0.12, max_val=0.65,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

def PALE(hex_, spread=1.0, sat=None):
    d = dict(mode="region", min_sat=0.0, max_sat=0.25, min_val=0.70, max_val=1.0,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

# ── the 13 skins (PROPOSED — the prompt's spec table did not arrive; grounded in Isshiki lore + the
#    3-region palette + the project convention: lore-appropriate names, a homage, and the mandatory Void). ──
SKINS = {
    # 1. Karma Azure — Boruto's blue Kāma: dark navy inner, cyan-blue trim, pale-blue robe/hair.
    "azure":     [ROBE("#12203a", sat=0.5), TRIM("#2a72b8", sat=0.62), PALE("#cfe0ec", sat=0.14)],
    # 2. Golden Otsutsuki — chakra-fruit gold: deep-indigo inner, gold trim, warm cream robe/hair.
    "golden":    [ROBE("#181830", sat=0.5), TRIM("#c79a2a", sat=0.72), PALE("#e8dcae", sat=0.16)],
    # 3. Ten-Tails Violet — Juubi register: dark-purple inner, magenta trim, lavender robe/hair.
    "violet":    [ROBE("#241a34", sat=0.45), TRIM("#9c2a86", sat=0.6), PALE("#d8c8e4", sat=0.14)],
    # 4. Emerald Kama — green karma: dark-teal inner, emerald trim, pale-mint robe/hair.
    "emerald":   [ROBE("#0e2622", sat=0.45), TRIM("#1f9c66", sat=0.6), PALE("#cfe6da", sat=0.14)],
    # 5. Toxic Sage — sickly poison: dark green-grey inner, sickly-green trim, pale-green robe/hair.
    "toxic":     [ROBE("#182818", sat=0.4), TRIM("#5c8a3a", sat=0.6), PALE("#cdd8b4", sat=0.16)],
    # 6. Frost Otsutsuki — cold celestial: icy-slate inner, pale-blue trim, white-blue robe/hair.
    "frost":     [ROBE("#3a4652", sat=0.24), TRIM("#8ab6d2", sat=0.4), PALE("#e2ecf2", sat=0.08)],
    # 7. Celestial Ivory — Otsutsuki regal: bleached grey-white inner, gold trim, bright ivory robe/hair.
    "ivory":     [ROBE("#c8c6cc", sat=0.06), TRIM("#b8912e", sat=0.55), PALE("#f4f2ec")],
    # 8. Obsidian Gold — TRULY BLACK robe: the pale region (robe+hair) dyed near-black + black inner, gold
    #    trim. The warm yellow eyes (own region) stay glowing → a black-cloaked Otsutsuki with gold accents.
    "obsidian":  [PALE("#141418", sat=0.05, spread=1.2), ROBE("#0a0a0c"), TRIM("#c9a12c", sat=0.72)],
    # 9. Ashen Revenant — burnt: charcoal inner, ember orange-red trim, ash-grey robe/hair.
    "ashen":     [ROBE("#1c1a1a", sat=0.1), TRIM("#b4501c", sat=0.66), PALE("#c8c4bc", sat=0.06)],
    # 10. Steel Reaper — gunmetal desaturated: dark-steel inner, steel-blue trim, gunmetal-grey robe/hair.
    "steel":     [ROBE("#2c3238", sat=0.14), TRIM("#5c7488", sat=0.32), PALE("#b6bcc2", sat=0.06)],
    # 11. Sanguine Sovereign — BLOOD ROBE: the pale robe itself dyed deep blood-red, black inner, dark-red trim.
    "sanguine":  [PALE("#9c1820", sat=0.66), ROBE("#160a0c"), TRIM("#5a1014", sat=0.6)],
    # 12. Jigen Ash — HOMAGE to his human vessel (Kara's Jigen): muted monk-grey robe, dull grey-red trim, cream skin.
    "jigen":     [ROBE("#4a4a4e", sat=0.05), TRIM("#7a4a44", sat=0.3), PALE("#ded6c6", sat=0.1)],
    # 13. Void Sovereign — full black-on-black body base (crimson Karma aura/eyes drawn by a game.js overlay).
    "void":      [PALE("#3a3438", sat=0.05), ROBE("#0a0809"), TRIM("#2a0c10", sat=0.5)],
}

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const isshiki ="); rest = src[i+15:]
    j = i+15 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(isshiki_[^"]+)"', block)))

def build(tag, only_sheet=None):
    passes = SKINS[tag]
    targets = wired_sheets() + ["isshiki_portrait.png"]
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
