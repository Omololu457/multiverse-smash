#!/usr/bin/env python3
"""Generate Saitama's 13-skin batch as __<tag>.png sheets (his FIRST skin batch).

Targeted per-region palette replacement via tools/recolor_palette.recolor_multi (NOT hue-rotate).
Cosmetic sheets only — ZERO gameplay. Saitama's One-Punch-Man hero suit has THREE clothing regions,
measured from the WIRED `saitama_idle_uniform.png` HSV histogram (see the build log):

  * SUIT (yellow)     RGB(240,192,16)→(192,144,0) — hue 20-58, sat 0.9-1.0, val 0.5-1.0. Gated
                      min_sat 0.70 so the warm BALD HEAD/face skin (hue ~30 but sat 0.2-0.6) is
                      NEVER touched (no skin recolor in this batch, per spec).
  * CAPE/TRIM (grey)  RGB(192,192,192)→(128,128,128) + white RGB(240,240,240) — NEUTRAL grey,
                      sat<=0.14, val 0.16-1.0. Gated min_val 0.16 to keep the pure-black OUTLINE
                      (val<.16) crisp, and max_warm 14 to reject the pale warm scalp highlight
                      (r>>b) that would otherwise read as "grey".
  * GLOVES/BOOTS (red)RGB(240,0,0)→(176,0,0) — hue 342-14 (wrap), sat>=0.55, val>=0.28.

All recolors use to_tone (re-centers the region's MID tone on the target, PRESERVES the
light/dark shading spread) so the suit's highlight/shadow modelling survives. Passes run in
sequence (later passes see earlier output); regions don't overlap so order is irrelevant here.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from recolor_palette import _NS, build_selection_mask, apply_recolor

ROOT = os.path.join(os.path.dirname(__file__), "..")


def recolor_multi_original(path, out_tag, passes):
    """Like recolor_palette.recolor_multi, but every pass's SELECTION MASK is computed from the
    ORIGINAL sheet — not the running output. Saitama's suit↔glove swaps (e.g. Crimson Fist maps the
    yellow suit to RED, which would fall inside the red-glove gate) and desaturating skins (Monochrome
    greys the suit into the grey-cape gate) otherwise let a LATER pass re-catch an EARLIER-recolored
    region. Because the three regions are disjoint in the original, masking-from-original makes pass
    order irrelevant and each source pixel is recolored at most once."""
    img0 = Image.open(path).convert("RGBA")
    W, H = img0.size
    base = bytearray(img0.tobytes())          # immutable reference (original)
    out = bytearray(base)                     # composited result, seeded from original
    total = 0
    for opts in passes:
        args = _NS(**opts)
        mask = build_selection_mask(base, W, H, args)                       # from ORIGINAL
        passimg, changed = apply_recolor(Image.frombytes("RGBA", (W, H), bytes(base)), args)
        pb = passimg.tobytes()
        for i in range(W * H):
            if mask[i]:
                out[i*4:i*4+4] = pb[i*4:i*4+4]
        total += changed
    stem, _ = os.path.splitext(path)
    Image.frombytes("RGBA", (W, H), bytes(out)).save(f"{stem}__{out_tag}.png")
    return total

# ── the 27 WIRED body sheets (from characters.saitama.animationData) + portrait ──
SHEETS = [
    "saitama_air_uniform.png", "saitama_bargain_uniform.png", "saitama_block_uniform.png",
    "saitama_combo10_uniform.png", "saitama_combo20_uniform.png", "saitama_dash_uniform.png",
    "saitama_death1_uniform.png", "saitama_death2_uniform.png", "saitama_downair_uniform.png",
    "saitama_grab_uniform.png", "saitama_headbutt_uniform.png", "saitama_heavy_uniform.png",
    "saitama_hit_uniform.png", "saitama_idle_uniform.png", "saitama_intro_full_uniform.png",
    "saitama_jump_uniform.png", "saitama_light_uniform.png", "saitama_serious_uniform.png",
    "saitama_sidehop_uniform.png", "saitama_tableflip_uniform.png", "saitama_turn1_uniform.png",
    "saitama_turn2_uniform.png", "saitama_turn3_uniform.png", "saitama_twohand_uniform.png",
    "saitama_up_uniform.png", "saitama_updown_uniform.png", "saitama_walk_uniform.png",
    "saitama_portrait.png",
]

# ── region pass builders (gates from the measured histogram) ──
def SUIT(hex_, spread=1.0, sat=None, ymin=0.0, ymax=1.0):
    d = dict(from_hue="20-58", min_sat=0.70, max_sat=1.0, min_val=0.30, max_val=1.0,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    if (ymin, ymax) != (0.0, 1.0): d["yband"] = f"{ymin}-{ymax}"
    return d

def CAPE(hex_, spread=1.0, sat=None):
    d = dict(min_sat=0.0, max_sat=0.14, min_val=0.16, max_val=1.0, max_warm=14,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

def GLOVE(hex_, spread=1.0, sat=None):
    d = dict(from_hue="342-14", min_sat=0.55, max_sat=1.0, min_val=0.28, max_val=1.0,
             to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d

# ── the 13 skins (order matches skins.js) ──
#   suit / cape+trim / gloves+boots
SKINS = {
    # 1. Sale Day — vivid hero yellow, pristine white cape, bright red gloves (the clean iconic pop).
    "saleday":       [SUIT("#f5c518", sat=0.92), CAPE("#f2f2f2"), GLOVE("#e60000", sat=1.0)],
    # 2. Blood-Soaked Victory — dirtied mustard suit, ash-grey cape, dark crimson gloves.
    "bloodsoaked":   [SUIT("#a8841e", sat=0.75), CAPE("#6e6e6e"), GLOVE("#7a0f0f", sat=0.85)],
    # 3. Crimson Fist — deep-red suit, charcoal cape, gold gloves (palette inversion).
    "crimsonfist":   [SUIT("#b01818", sat=0.85), CAPE("#3a3a3a"), GLOVE("#e0a81e", sat=0.85)],
    # 4. Steel Hero — steel-blue suit, gunmetal cape, silver gloves (metallic).
    "steelhero":     [SUIT("#4a6a9c", sat=0.55), CAPE("#55606e", sat=0.14), GLOVE("#c0c8d0", sat=0.10)],
    # 5. Class-B Tracksuit — green suit, olive cape, dark-green gloves.
    "classb":        [SUIT("#3e9e4a", sat=0.70), CAPE("#6b7a3e", sat=0.30), GLOVE("#1e5e28", sat=0.75)],
    # 6. Amethyst Punch — purple suit, violet-grey cape, magenta gloves.
    "amethyst":      [SUIT("#8a3fc0", sat=0.65), CAPE("#6e5a8a", sat=0.25), GLOVE("#c81e9e", sat=0.80)],
    # 7. Midnight Patrol — near-black navy suit, charcoal cape, deep-red gloves (stealth).
    "midnight":      [SUIT("#1c2438", sat=0.55, spread=0.7), CAPE("#2a2e36", sat=0.14), GLOVE("#8a1414", sat=0.85)],
    # 8. Golden Serious — rich gold suit, cream cape, amber gloves ("Serious-mode" warmth).
    "goldenserious": [SUIT("#e0a81e", sat=0.90), CAPE("#e8dfc0", sat=0.12), GLOVE("#c86414", sat=0.85)],
    # 9. Frost Cape — icy pale-blue suit, white cape, cyan gloves (winter).
    "frostcape":     [SUIT("#7fb6d6", sat=0.45), CAPE("#eaf2f5", sat=0.05), GLOVE("#22b6c8", sat=0.80)],
    # 10. Toxic Meteor — sickly yellow-green suit, grey-green cape, acid-green gloves (Boros meteor).
    "toxicmeteor":   [SUIT("#a6c21e", sat=0.80), CAPE("#5a6650", sat=0.18), GLOVE("#46b814", sat=0.85)],
    # 11. Rose Hero — pink suit, blush cape, magenta-rose gloves.
    "rosehero":      [SUIT("#e86aa6", sat=0.55), CAPE("#e8c4d2", sat=0.18), GLOVE("#c81e5e", sat=0.80)],
    # 12. Monochrome Manga — desaturated grey suit, white cape, near-black gloves (ink look).
    "monochrome":    [SUIT("#9a9a9a", sat=0.0), CAPE("#f0f0f0", sat=0.02), GLOVE("#202020", sat=0.0)],
    # 13. Void Caped Baldy (Void) — full-black suit+cape, glowing-red gloves; + game.js gold aura overlay.
    "void":          [SUIT("#0c0c10", sat=0.30, spread=0.40), CAPE("#101014", sat=0.10, spread=0.40),
                      GLOVE("#c81414", sat=0.95)],
}

def main():
    only = set(sys.argv[1:])  # optional: restrict to given tags
    tags = [t for t in SKINS if not only or t in only]
    grand = 0
    for tag in tags:
        passes = SKINS[tag]
        tot = 0
        for sheet in SHEETS:
            path = os.path.join(ROOT, sheet)
            if not os.path.exists(path):
                print(f"  !! missing {sheet}")
                continue
            tot += recolor_multi_original(path, tag, passes)
        print(f"[{tag:14s}] {len(SHEETS)} sheets, {tot:>7d} px changed")
        grand += tot
    print(f"── {len(tags)} skins × {len(SHEETS)} sheets → {grand} px changed ──")

if __name__ == "__main__":
    main()
