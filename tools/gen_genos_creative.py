#!/usr/bin/env python3
"""Generate Genos's 10-skin batch as __<tag>.png sheets (One Punch Man, 2nd OPM char).

Per-region palette replacement via recolor_palette (mask-from-ORIGINAL multi-pass, mirrors
gen_saitama_creative.py). Regions measured from the WIRED genos_*_uniform.png HSV histogram
(see GENOS_ASSET_MAP.md skins section):

  * SHIRT (black tank)  — the bulk sits at pure black V≈0, the SAME value as the character
                          OUTLINE + the black eye-sclera. OWNER DECISION (flagged tradeoff):
                          "aggressively recolor the whole black shirt" → this pass targets ALL
                          dark neutral (max_sat 0.22, max_val 0.42), so the OUTLINE + eyes take
                          the shirt colour too (accepted). Skipped on skins whose shirt = black.
  * ARMS (silver-grey)  — bright neutral (min_val 0.42, max_sat 0.20). ★max_val 0.92 so the
                          pure-white BEAM-FX cores (val>0.92) are LEFT UNTOUCHED (load-bearing FX).
  * PANTS (dark navy)   — blue hue 200-245, min_sat 0.28, dark (val 0.16-0.65). Cleanly separable.
  * HAIR (blond)        — warm hue 35-62, min_sat 0.25. ★max_sat 0.60 so the high-sat YELLOW
                          blast-FX (sat>0.6) is LEFT UNTOUCHED (load-bearing FX).

All recolors use to_tone (re-centre the region MID on the target, PRESERVE the light/dark spread).
The yellow/white charged-blast + beam FX are gameplay-load-bearing and are NOT recoloured (protected
by the arm val-cap + hair sat-cap above) — same standing rule as every FX-coded character.

Void Sovereign = whole-form near-black (incl. SKIN, the one skin-recolor exception) + a code overlay
(game.js drawGenosVoidAuraOverlay — drifting circuit/data lines, cybernetic-themed). Exposed Core =
near-default sheets (copied) + a procedural chest-core glow overlay (game.js drawGenosExposedCoreOverlay).
"""
import sys, os, shutil
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from recolor_palette import _NS, build_selection_mask, apply_recolor

ROOT = os.path.join(os.path.dirname(__file__), "..")

def recolor_multi_original(path, out_tag, passes):
    """Every pass's SELECTION MASK is computed from the ORIGINAL sheet (not the running output),
    so disjoint regions never cross-catch and pass order is irrelevant (mirrors gen_saitama)."""
    img0 = Image.open(path).convert("RGBA"); W, H = img0.size
    base = bytearray(img0.tobytes()); out = bytearray(base); total = 0
    for opts in passes:
        args = _NS(**opts)
        mask = build_selection_mask(base, W, H, args)
        passimg, changed = apply_recolor(Image.frombytes("RGBA", (W, H), bytes(base)), args)
        pb = passimg.tobytes()
        for i in range(W * H):
            if mask[i]: out[i*4:i*4+4] = pb[i*4:i*4+4]
        total += changed
    stem, _ = os.path.splitext(path)
    Image.frombytes("RGBA", (W, H), bytes(out)).save(f"{stem}__{out_tag}.png")
    return total

# ── the WIRED body sheets (from characters.genos.animationData) + portrait ──
SHEETS = [
    "genos_idle_uniform.png", "genos_walk_uniform.png", "genos_run_uniform.png",
    "genos_dash_uniform.png", "genos_jump_uniform.png", "genos_hurt_uniform.png",
    "genos_knockdown_uniform.png", "genos_getup_uniform.png", "genos_taunt_uniform.png",
    "genos_light_uniform.png", "genos_heavy_uniform.png", "genos_air_uniform.png",
    "genos_guard_uniform.png", "genos_rush1_uniform.png", "genos_rush2_uniform.png",
    "genos_rush3_uniform.png", "genos_incinerate1_uniform.png", "genos_incinerate2_uniform.png",
    "genos_incinerate3_uniform.png", "genos_machinegun_uniform.png", "genos_jetdash_uniform.png",
    "genos_afterimage_uniform.png", "genos_overdrive_uniform.png", "genos_win_uniform.png",
    "genos_portrait.png",
]

# ── region pass builders (gates from the measured histogram; FX-protective caps noted above) ──
def SHIRT(hex_, spread=1.0, sat=None):
    d = dict(min_sat=0.0, max_sat=0.22, min_val=0.0, max_val=0.42, max_warm=14, to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d
def ARMS(hex_, spread=1.0, sat=None):
    d = dict(min_sat=0.0, max_sat=0.20, min_val=0.42, max_val=0.92, max_warm=20, to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d
def PANTS(hex_, spread=1.0, sat=None):
    d = dict(from_hue="200-245", min_sat=0.28, max_sat=1.0, min_val=0.16, max_val=0.65, to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d
def HAIR(hex_, spread=1.0, sat=None):
    d = dict(from_hue="35-62", min_sat=0.25, max_sat=0.60, min_val=0.45, max_val=1.0, to_tone=hex_, tone_spread=spread)
    if sat is not None: d["to_sat"] = sat
    return d
def SKIN(hex_, spread=0.5):   # Void only — the deliberate skin-recolor exception
    return dict(from_hue="8-45", min_sat=0.10, max_sat=0.55, min_val=0.50, max_val=1.0, to_tone=hex_, tone_spread=spread)

# ── the 8 group skins (order matches skins.js) — shirt / arms / pants / hair (omit = keep default) ──
SKINS = {
    # Group 1
    "crimsonchassis": [SHIRT("#8C2A2E", sat=0.70), ARMS("#5C3D3D"), PANTS("#0A0A0A", spread=0.5)],                       # deep-red top, dark red-grey arms, black pants, keep blond
    "verdantcircuit": [SHIRT("#2E7B5C", sat=0.60), ARMS("#4A5C52"), PANTS("#0A0A0A", spread=0.5)],                       # deep-green top, green-grey arms, black pants, keep blond
    "goldenalloy":    [ARMS("#8C7B5C"), PANTS("#3D2E14"), HAIR("#D6A82E")],                                              # keep black top, warm gold-grey arms, dark-bronze pants, golden-blonde hair
    "obsidianframe":  [ARMS("#3D3D3D"), PANTS("#0A0A0A", spread=0.5), HAIR("#8F8F8F")],                                  # keep true-black top, dark-grey arms, black pants, silver hair
    # Group 2
    "azurecybernetic":[SHIRT("#2E5C8C", sat=0.65), ARMS("#5C6B7B"), PANTS("#0A0A0A", spread=0.5)],                       # deep-blue top, blue-grey arms, black pants, keep blond
    "violetprototype":[SHIRT("#5C2E7B", sat=0.65), ARMS("#6B5C7B"), PANTS("#0A0A0A", spread=0.5)],                       # deep-violet top, violet-grey arms, black pants, keep blond
    "emberunit":      [SHIRT("#8C4A1A", sat=0.75), ARMS("#7B5C4A"), PANTS("#291F14"), HAIR("#8C3D14")],                  # burnt-orange top, rust-grey arms, dark-brown pants, auburn hair
    "frostboundchassis":[SHIRT("#D6D6D6", sat=0.06), ARMS("#B0C0C9"), PANTS("#4A5560"), HAIR("#D6DCE0")],                # white-grey top, icy-grey arms, grey pants, silvery-white hair
}
# Void Sovereign — whole-form near-black (all 4 regions + skin); FX protected by the region caps.
VOID = [SHIRT("#0F0F12", spread=0.40), ARMS("#0F0F12", spread=0.40), PANTS("#0F0F12", spread=0.40),
        HAIR("#0F0F12", spread=0.40), SKIN("#0F0F12", spread=0.40)]

def main():
    only = set(sys.argv[1:])
    jobs = dict(SKINS); jobs["void"] = VOID
    tags = [t for t in jobs if not only or t in only]
    grand = 0
    for tag in tags:
        tot = 0
        for sheet in SHEETS:
            path = os.path.join(ROOT, sheet)
            if not os.path.exists(path): print(f"  !! missing {sheet}"); continue
            tot += recolor_multi_original(path, tag, jobs[tag])
        print(f"[{tag:16s}] {len(SHEETS)} sheets, {tot:>7d} px changed"); grand += tot
    # Exposed Core — near-default: copy the base sheets to __exposedcore.png (the glowing chest
    # core is a procedural overlay, game.js drawGenosExposedCoreOverlay — not a baked recolour).
    if not only or "exposedcore" in only:
        for sheet in SHEETS:
            src = os.path.join(ROOT, sheet)
            if not os.path.exists(src): continue
            stem, _ = os.path.splitext(src); shutil.copyfile(src, f"{stem}__exposedcore.png")
        print(f"[exposedcore     ] {len(SHEETS)} sheets copied (near-default; core = procedural overlay)")
    print(f"── {len(tags)} recolor skins × {len(SHEETS)} sheets → {grand} px changed (+ exposedcore copies) ──")

if __name__ == "__main__":
    main()
