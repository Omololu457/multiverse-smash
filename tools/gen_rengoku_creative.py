#!/usr/bin/env python3
"""Generate Kyojuro Rengoku's 8 creative alt-color skins (__<tag>.png sheets).

Targeted per-region palette replacement via recolor_palette (NOT hue-rotate). Cosmetic; zero gameplay.

RENGOKU REGIONS (measured — /tmp/reng_zonemap.png). His sprite is small & warm-hue-dense, so regions
are separated by a mix of hue/sat/val gates + a top-yband for hair (all frames are one horizontal strip
=> the head band is the top of the whole sheet). The distinctive HAORI INNER LINING = the flared red
flame-hem; the EXTERIOR = the neutral white/gray shoulders & sleeves.
  * EXT   — haori exterior: neutral gray/white (sat<0.14, val .28-.97). Also catches the katana blade
            (also neutral, not separable — reads fine; noted).
  * PANTS — dark warm uniform (torso+legs): hue ~0 (350-24 wrap), sat .22-.72, val .10-.40.
  * HAIR  — blond crown (hue 30-64) + red streaks (hue 320-360), restricted to the top yband 0-0.42 so
            the (hue 8-30) face SKIN is never touched. Runs BEFORE the lining pass so red streaks
            convert to the hair colour first (not re-grabbed as lining).
  * LIN   — haori inner lining / flame-hem BASE red (hue 326-8, sat>=.55, val>=.26).
  * FLM   — the orange flame TIPS on the hem (hue 8-34, sat>=.70, val>=.55). Own target so a skin can
            either fold them into the lining (cool skins) or keep them glowing (Sun Breathing/Verdant).
  * SKIN (face/hands, hue 8-30 sat .22-.56) excluded by every pass' gates. VOID EMBER is the exception
    (full-form near-black incl. face) + a procedural rising-ember overlay drawn in game.js.
Multi-tone preserved everywhere via --to-tone (keeps each region's highlight/shadow spread; no flatten).
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi
from gen_rick_creative import void_flatten, hex2rgb  # reuse the proven full-form void flattener

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── pass builders ──────────────────────────────────────────────────────────
def EXT(h, sp=1.0):   return dict(min_sat=0.0, max_sat=0.14, min_val=0.28, max_val=0.97, to_tone=h, tone_spread=sp)
def PANTS(h, sp=1.0): return dict(from_hue="350-24", min_sat=0.22, max_sat=0.75, min_val=0.10, max_val=0.40, yband="0.34-1.0", to_tone=h, tone_spread=sp)
# hair spans auburn(hue 8-30)+blond(30-66); it overlaps the face-SKIN hue band, so it's separated from
# skin by SATURATION (hair sat>=.58, face skin sat<=.57) inside the top yband. Red streaks: hue 316-360.
def HAIRg(h, sp=1.0): return dict(from_hue="8-66", min_sat=0.58, min_val=0.20, max_val=0.96, yband="0-0.44", to_tone=h, tone_spread=sp)
def HAIRr(h, sp=1.0): return dict(from_hue="316-360", min_sat=0.55, min_val=0.15, yband="0-0.44", to_tone=h, tone_spread=sp)
def LIN(h, sp=1.0):   return dict(from_hue="326-8", min_sat=0.55, min_val=0.26, yband="0.28-1.0", to_tone=h, tone_spread=sp)
def FLM(h, sp=1.0):   return dict(from_hue="8-54", min_sat=0.60, min_val=0.55, yband="0.33-1.0", to_tone=h, tone_spread=sp)

# ── skin table: tag -> (hair, ext, lin, pants, flm)  [flm defaults to lin if None] ──
SKINS = {
    "omnitrix":     dict(hair="#1A1A1A", ext="#E8E8E8", lin="#3FA83B", pants="#1A1A1A", flm="#5FC24B"),
    "albedo":       dict(hair="#E8E4DC", ext="#E8E4DC", lin="#8F1F1F", pants="#1A1A1A", flm="#C24B4B"),
    "sunbreathing": dict(hair="#E8B23B", ext="#F0EEE8", lin="#8F1F2A", pants="#E8E4DC", flm="#F5C24B", hairsp=1.15),
    "watersealed":  dict(hair="#2A4D8F", ext="#C9E3E8", lin="#1E6B6B", pants="#1E2A45", flm="#2E9A9A"),
    "ashen":        dict(hair="#4A4A4A", ext="#3A3A3E", lin="#5A1F1F", pants="#1A1A1A", flm="#6A2A2A"),
    "imperial":     dict(hair="#5A2E7A", ext="#15151A", lin="#6B3FA0", pants="#15151A", flm="#8B5FC0"),
    "verdant":      dict(hair="#2E5E3A", ext="#1A3A24", lin="#D4A537", pants="#3B2A1F", flm="#E8C24B"),
    # void handled specially (full-form near-black + procedural ember overlay in game.js)
    "voidember":    dict(void="#0F0F12"),
}

def passes_for(cfg):
    sp = cfg.get("hairsp", 1.0)
    flm = cfg.get("flm") or cfg["lin"]
    return [EXT(cfg["ext"]), PANTS(cfg["pants"]),
            HAIRg(cfg["hair"], sp), HAIRr(cfg["hair"], sp),
            LIN(cfg["lin"]), FLM(flm)]

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const rengoku"); rest = src[i+13:]
    j = i+13 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(rengoku_[^"]+)"', block)))

def build(tag, only_sheet=None):
    cfg = SKINS[tag]
    targets = wired_sheets() + ["rengoku_portrait.png"]
    total = 0
    for name in targets:
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        if cfg.get("void"):
            from PIL import Image
            img = Image.open(path).convert("RGBA")
            c = void_flatten(img, cfg["void"])
            img.save(path[:-4] + f"__{tag}.png")
        else:
            c = recolor_multi(path, tag, passes_for(cfg))
        total += c
        print(f"  {c:6d}px  {name}")
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only_sheet = sys.argv[2] if len(sys.argv) > 2 else None
    if tag == "ALL":
        for t in SKINS:
            print(f"=== {t} ==="); build(t)
        return
    if tag not in SKINS:
        print("skins:", ", ".join(SKINS)); sys.exit(1)
    build(tag, only_sheet)

if __name__ == "__main__":
    main()
