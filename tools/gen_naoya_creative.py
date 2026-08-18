#!/usr/bin/env python3
"""Generate Naoya Zenin's FIRST skin batch as __<tag>.png sheets (Default + 8 creative + Void + Narcissus = 11).

Targeted per-region palette replacement via tools/recolor_palette.py (NOT hue-rotate). Cosmetic sheets only —
ZERO gameplay. Naoya's identity is the arrogant kendo/hakama duelist. Palette CONFIRMED against the real sprite
(naoya_idle_uniform.png region histogram + naoya_reference_figure.png) — the build prompt's "assumed" region set
was WRONG in two ways, corrected here:
  * GI (top/haori)  — the DARK NAVY jacket RGB(32,32,48). DARK + COOL. Gate: val 0.06-0.46, max_warm 24
                      (min_val keeps the pure-black OUTLINE untouched = crisp line; max_warm excludes the warm
                      olive hair-shadow + warm skin so only the cool navy is caught). The PRIMARY region.
  * HAKAMA (pants)  — the WHITE/cream wide-leg pants RGB(240,224,224)+grey-teal pleats RGB(128,144,144). BRIGHT
                      + LOW-SAT (NOT black — the prompt assumed black; it is his signature light silhouette).
                      Gate: val>=0.50, sat<=0.42, max_warm 48 (keeps warm SKIN out). Owner decision: PRESERVE the
                      white identity — most "black hakama" table entries become a tinted-WHITE with coloured
                      shadows; only Obsidian / Void / (themed) Narcissus go dark.
  * HAIR            — the OLIVE / yellow-green mop RGB(176,160,80)+shadow RGB(112,112,48) (NOT pure green). Gate:
                      from_hue 42-74, min_sat 0.28 (isolates the yellow-green hue from the orange SKIN hue ~24
                      and the blue GI hue ~240).
  * SKIN            — warm face/hands RGB(240,168,120). Protected by default (sat/hue keep it out of every
                      region); only Void adds an explicit SKIN pass (full-black Alien-X silhouette).
All recolors use to_tone (re-centres the region MID tone, PRESERVES the light/dark shading spread). Passes run in
order GI -> HAKAMA -> HAIR (independent gates; later passes see earlier output).
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

ROOT = os.path.join(os.path.dirname(__file__), "..")

def GI(hex_, spread=1.0, sat=None):        # dark navy haori top (PRIMARY) — cool + dark
    d = dict(mode="region", min_sat=0.0, max_sat=1.0, min_val=0.06, max_val=0.46, max_warm=24,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

def HAKAMA(hex_, spread=1.0, sat=None):     # white/cream wide-leg pants — bright + low-sat
    d = dict(mode="region", min_sat=0.0, max_sat=0.42, min_val=0.50, max_val=1.0, max_warm=48,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

def HAIR(hex_, spread=1.0, sat=None):        # olive / yellow-green hair — hue-gated
    d = dict(mode="region", from_hue="42-74", min_sat=0.28, max_sat=1.0, min_val=0.25, max_val=0.90,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

def SKIN(hex_, spread=1.0, sat=None):        # warm skin (Void only)
    d = dict(mode="region", from_hue="6-40", min_sat=0.28, max_sat=0.80, min_val=0.50, max_val=1.0,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

# ── the 11 skins (Default is the untouched base; these are the recolours). Owner-confirmed: PRESERVE the
#    white hakama for the "black-hakama" table entries (tinted-white shadows); map hair onto the real olive base. ──
SKINS = {
    # ── Group 1 ──
    # 1. Crimson Dojo — deep-red jacket, warm-white hakama, dark red-brown hair.
    "crimsondojo":     [GI("#8c2a2e", sat=0.55), HAKAMA("#f0e2e0", sat=0.05), HAIR("#5c2e1a", sat=0.45)],
    # 2. Azure Sensei — deep-blue jacket, cool-white hakama, icy blue-grey hair.
    "azuresensei":     [GI("#2e5c8c", sat=0.45), HAKAMA("#e6ecf2", sat=0.06), HAIR("#5c7b8c", sat=0.22)],
    # 3. Golden Ronin — gold-black jacket, pale antique-gold hakama, amber hair (themed warm — not pure white).
    "goldenronin":     [GI("#2a2214", sat=0.45), HAKAMA("#cdb87e", sat=0.30), HAIR("#c9862e", sat=0.55)],
    # 4. Obsidian Blade — monochrome: near-black jacket, DARK-grey hakama (deliberate dark exception), silver hair.
    "obsidianblade":   [GI("#1a1a1a", sat=0.02), HAKAMA("#2a2a2a", sat=0.03), HAIR("#8f8f8f", sat=0.02)],
    # ── Group 2 ──
    # 5. Verdant Elder — deep-jade jacket, mint-white hakama, rich emerald hair (richer take on the original).
    "verdantelder":    [GI("#2e7b5c", sat=0.45), HAKAMA("#e4efe8", sat=0.06), HAIR("#1a7b4a", sat=0.55)],
    # 6. Wisteria Duelist — violet jacket, violet-white hakama, cool violet-grey hair.
    "wisteriaduelist": [GI("#6b3d8c", sat=0.45), HAKAMA("#ece6f2", sat=0.06), HAIR("#7b6b8c", sat=0.24)],
    # 7. Ember Ronin — burnt-orange jacket, warm-cream hakama, deep-auburn hair.
    "emberronin":      [GI("#8c4a1a", sat=0.55), HAKAMA("#f0e6dc", sat=0.06), HAIR("#8c3d14", sat=0.55)],
    # 8. Frostbound Kendo — pale ice jacket (navy LIFTS to white), light-grey hakama, silvery-white hair.
    "frostboundkendo": [GI("#e8f0f6", sat=0.08, spread=1.15), HAKAMA("#c4cdd6", sat=0.08), HAIR("#d6dce0", sat=0.05)],
    # ── Specialty ──
    # 9. Void Sovereign (Alien-X) — full near-black body incl. skin/face; ink-brush + cursed-glow aura drawn by
    #    game.js drawNaoyaVoidAuraOverlay. All regions crushed to near-black.
    "void":            [GI("#0f0f12"), HAKAMA("#0a0a10"), HAIR("#0c0c10"), SKIN("#101014")],
    # 10. Narcissus (vanity) — pale reflective white-gold jacket, deep still-water blue-black hakama (themed dark
    #     reflecting-pool), glossy over-bright green hair (higher spread = vain gloss). Mirror-shimmer overlay on
    #     idle via game.js drawNaoyaNarcissusOverlay.
    "narcissus":       [GI("#f4e6c8", sat=0.26, spread=1.10), HAKAMA("#1a2c3e", sat=0.45), HAIR("#3a9a5a", sat=0.62, spread=1.25)],
}

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const naoya ="); rest = src[i + 13:]
    j = i + 13 + (rest.index("\nconst ") if "\nconst " in rest else rest.index("\n// ────"))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(naoya_[^"]+)"', block)))

def build(tag, only_sheet=None):
    passes = SKINS[tag]
    targets = wired_sheets() + ["naoya_portrait.png"]
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
