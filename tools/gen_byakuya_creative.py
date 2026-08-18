#!/usr/bin/env python3
"""Generate Byakuya Kuchiki's FIRST skin batch as __<tag>.png sheets (Default + 12 creative + Void = 13).

Targeted per-region palette replacement via tools/recolor_palette.py (NOT hue-rotate). Cosmetic sheets
only — ZERO gameplay. Byakuya's identity is the NOBLE Squad-6 captain: an elegant register (Kuchiki house
colours, Senbonzakura petal tones, reiatsu blues) — no clownish rainbows.

TWO recolor regions + a protect, measured from byakuya_idle_uniform.png (15-colour idle histogram):
  * HAORI  — the white captain's coat + windflower scarf (the PRIMARY identity): the bright cream/mint mass
             RGB(255,247,231)/(198,231,222)/(206,189,156)/(115,165,156). NEUTRAL-COOL + HIGH VALUE. Gate:
             val>=0.58, sat<=0.40, max_warm 58 (keeps the warm SKIN highlight out).
  * ROBE   — the black shihakushō kimono, drawn with a dark-teal cast RGB(41,66,74)/(8,33,41)/(0,8,24).
             DARK. Gate: val 0.05-0.42 (min_val keeps the near-pure-black OUTLINE untouched = crisp line).
  * SKIN   — warm face/hand patches RGB(239,181,107)/(255,231,189). Protected by default (sat>0.40 keeps it
             out of HAORI); only the "undead/pale" skins add an explicit SKIN pass.
The brown sword-hilt/obi accents (val~0.48) sit between the two gates and stay canonical (like Jason's
unchanged mask on some skins). All recolors use to_tone (re-centres the region MID tone, PRESERVES the
light/dark shading spread). Later passes see earlier passes' output.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

ROOT = os.path.join(os.path.dirname(__file__), "..")

def HAORI(hex_, spread=1.0, sat=None, ymin=0.0, ymax=1.0):
    d = dict(mode="region", min_sat=0.0, max_sat=0.40, min_val=0.58, max_val=1.0, max_warm=58,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    if (ymin, ymax) != (0.0, 1.0): d["yband"] = f"{ymin}-{ymax}"
    return d

def ROBE(hex_, spread=1.0, sat=None):
    d = dict(mode="region", min_sat=0.0, max_sat=1.0, min_val=0.05, max_val=0.42, max_warm=40,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

def SKIN(hex_, spread=1.0, sat=None):
    d = dict(mode="region", from_hue="10-45", min_sat=0.30, max_sat=0.75, min_val=0.55, max_val=1.0,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

# ── the 13 skins (Default is the untouched base; these are the recolours) ──
SKINS = {
    # 1. Sakura Bloom — Senbonzakura's signature: soft petal-pink coat over a deep plum kimono.
    "sakura":   [HAORI("#f0c4d2", sat=0.24), ROBE("#3a1f33")],
    # 2. Kuchiki Crest — the noble house: deep royal-blue coat, black kimono (aristocratic).
    "kuchiki":  [HAORI("#2f4f8c", sat=0.42), ROBE("#0a0e1c")],
    # 3. Winter Frost — icy pale-blue-white coat over a cold slate kimono.
    "frost":    [HAORI("#d4e2ee", sat=0.16), ROBE("#28323e")],
    # 4. Bankai Reiatsu — the Senbonzakura Kageyoshi blue: pale ice-blue coat, deep midnight-blue kimono.
    "reiatsu":  [HAORI("#bcd6f0", sat=0.26), ROBE("#101c3a")],
    # 5. Crimson Captain — a bold deep-crimson captain's coat over black.
    "crimson":  [HAORI("#a83232", sat=0.55), ROBE("#0c0a0c")],
    # 6. Golden Noble — regal cream-gold coat over a dark umber kimono.
    "golden":   [HAORI("#e6cf8c", sat=0.40), ROBE("#241810")],
    # 7. Squad Six Slate — militant steel-grey coat over charcoal.
    "slate":    [HAORI("#b6bcc4", sat=0.08), ROBE("#22262c")],
    # 8. Midnight Kuchiki — a near-black noble coat over pure black (monochrome, low contrast).
    "midnight": [HAORI("#3a3c44", sat=0.10), ROBE("#0a0a0c")],
    # 9. Verdant Estate — sage/jade coat over a dark forest-green kimono (garden noble).
    "verdant":  [HAORI("#a9c4a0", sat=0.26), ROBE("#1c2e22")],
    # 10. Twilight Plum — dusty violet coat over deep purple.
    "plum":     [HAORI("#b6a2c8", sat=0.28), ROBE("#241a34")],
    # 11. Ashen Mourning — desaturated grey-white coat over charcoal (mourning noble).
    "ashen":    [HAORI("#c8c6c0", sat=0.05), ROBE("#1e1e20")],
    # 12. Ivory Sovereign — pristine bright ivory coat over near-black (high contrast).
    "ivory":    [HAORI("#fbf4e6", sat=0.06), ROBE("#080810")],
    # 13. Eternal Void (Alien-X) — full black body base; petal-pink + reiatsu-blue aura/eyes drawn by
    #     game.js drawByakuyaVoidAuraOverlay. Both regions crushed to near-black.
    "void":     [HAORI("#141218"), ROBE("#08080c")],
}

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const byakuya ="); rest = src[i + 15:]
    j = i + 15 + (rest.index("\nconst ") if "\nconst " in rest else rest.index("\n// ────"))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(byakuya_[^"]+)"', block)))

def build(tag, only_sheet=None):
    passes = SKINS[tag]
    targets = wired_sheets() + ["byakuya_portrait.png"]
    total = 0
    for name in targets:
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        c = recolor_multi(path, tag, passes)
        total += c
        print(f"  {c:6d}px  {name} -> {name.replace('.png', '__' + tag + '.png')}")
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
