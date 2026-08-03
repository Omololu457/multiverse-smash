#!/usr/bin/env python3
"""Generate the Samurai Red Ranger's (Fire) 12 creative alt-color skins (__<tag>.png sheets).

Recolors BOTH tiers so a skin is consistent through a Mega Mode transform:
  * BASE tier   — the 13 sheets in characters.samurai_red_ranger.animationData (retagged by
                  skins.js recolorSkinAnim).
  * MEGA tier   — the 12 sheets in abilities.js SAMURAI_MEGA_ANIM (retagged at transform time by
                  abilities.js retagFormAnim(SAMURAI_MEGA_ANIM, fighter._recolorTag); the skins.js
                  entries carry recolorTag so applySkin stamps it). Without this the Mega form would
                  snap back to the canonical RED sheets mid-skin.

Capture-masks-from-original (contamination-proof, same as tools/gen_omega_creative.py). Regions:
  * SUIT  — the red top/helmet/boots (helmet is the same red → NOT separable, recolors with the suit;
            same honest limitation as Omega's boots). Wide gate hue 342-22 on clean body sheets.
  * TRIM  — the gold/tan belt-sash + sword hilt (the "weapon-hilt/accent trim" region). hue 28-56.
  * The dark hakama pants + black visor (val<0.20) and the white sleeves/blade (sat<0.18) are left
    UNTOUCHED — face/visor excluded per spec; pants read as neutral black leggings across every skin.

FIRE-FX GUARD: the ultimate / mega_ultimate / flameslash sheets are dominated by ORANGE flame FX that
overlaps the warm TRIM hue. On those sheets we recolor SUIT ONLY, with a TIGHT red gate (hue 350-12,
sat>=0.50) that excludes the orange fire — so the Fire Ranger's signature flames stay fire, and the
TRIM pass (which would silver/blue the flames) is skipped. Flagged, not silently dropped.

LINE-ART guard: masks never select outline/near-black pixels; `floor` keeps a dark suit target a clear
margin above outline-black so plates never fuse into a blob (see Obsidian Ronin / Midnight Katana).
Multi-tone preserved via tone-remap. Cosmetic only; zero gameplay.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import rgb_hsv, hex2rgb
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def _hwrap(h, lo, hi):
    d = h*360
    return (d >= lo or d <= hi) if lo > hi else (lo <= d <= hi)

# region selectors (evaluated against the ORIGINAL pixel) — two suit gates: wide (clean sheets) / tight (flame)
def suit_wide(h, s, v):  return _hwrap(h, 342, 22) and s >= 0.42 and v >= 0.20
def suit_tight(h, s, v): return _hwrap(h, 350, 12) and s >= 0.50 and v >= 0.20
# trim sat floor 0.28 catches the gold sash/belt (measured at sat~0.30); the hue-20 helmet chin/face
# sits below hue 28 and is intentionally NOT caught (face/visor excluded per spec).
def trim(h, s, v):       return _hwrap(h, 28, 56) and s >= 0.28 and v >= 0.28

# flame-FX sheets: SUIT-ONLY + tight red gate (protect the orange fire)
FLAME = {"samurai_ranger_ultimate_uniform.png", "samurai_ranger_mega_ultimate_uniform.png",
         "samurai_ranger_flameslash_uniform.png"}

def paint(px, idxs, target_hex, spread=1.0, to_sat=None, floor=0.0):
    if not idxs: return 0
    th, ts, tv = rgb_hsv(*hex2rgb(target_hex))
    if to_sat is not None: ts = to_sat
    pivot = sum(rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])[2] for i in idxs) / len(idxs)
    for i in idxs:
        _, _, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[i*4]   = max(0, min(255, round(nr*255)))
        px[i*4+1] = max(0, min(255, round(ng*255)))
        px[i*4+2] = max(0, min(255, round(nb*255)))
    return len(idxs)

def recolor(path, tag, cfg):
    fname = os.path.basename(path)
    img = Image.open(path).convert("RGBA"); W, H = img.size
    px = bytearray(img.tobytes())
    flame = fname in FLAME
    sel_suit = suit_tight if flame else suit_wide
    regions = [("suit", sel_suit)] if flame else [("suit", sel_suit), ("trim", trim)]
    masks = {name: [] for name, _ in regions}
    for i in range(W*H):
        if px[i*4+3] == 0: continue
        h, s, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        for name, sel in regions:
            if sel(h, s, v):
                masks[name].append(i); break
    total = 0
    for name, _ in regions:
        spec = cfg[name]
        hexv, to_sat = spec[0], spec[1]
        spread = spec[2] if len(spec) > 2 else 1.0
        floor  = spec[3] if len(spec) > 3 else 0.0
        total += paint(px, masks[name], hexv, spread=spread, to_sat=to_sat, floor=floor)
    Image.frombytes("RGBA", (W, H), bytes(px)).save(path[:-4] + f"__{tag}.png")
    return total

# trim presets
T_SILVER = ("#C6C6CC", 0.04); T_GOLD = ("#C9922E", None); T_BLACK = ("#1A1A1E", 0.10)
T_WHITE  = ("#F0F0F0", 0.03); T_RED = ("#C0272B", None); T_DKRED = ("#6E1F26", None)

SKINS = {
    # tag             suit(hex, to_sat, [spread], [floor])         trim
    "azure":    dict(suit=("#274B8F", None),            trim=T_SILVER),  # 1 Azure Blade
    "emerald":  dict(suit=("#2E6B3A", None),            trim=T_GOLD),    # 2 Emerald Katana
    "violet":   dict(suit=("#6B3FA0", None),            trim=T_SILVER),  # 3 Violet Strike
    "silveredge": dict(suit=("#C8C8CC", 0.05),          trim=T_BLACK),   # 4 Silver Edge (pale gray suit)
    "rosepetal": dict(suit=("#E85AA0", None),           trim=T_WHITE),   # 5 Rose Petal (vivid pink)
    "obsidian": dict(suit=("#1E1E24", 0.12, 1.4, 0.15), trim=T_RED),     # 6 Obsidian Ronin (near-black)
    "amber":    dict(suit=("#E8823C", None),            trim=T_GOLD),    # 7 Amber Flame (warm orange)
    "frostbite": dict(suit=("#C8E0F0", 0.22),           trim=T_SILVER),  # 8 Frostbite (ice/pale blue)
    "crimsonecho": dict(suit=("#6E1420", None, 1.15),   trim=T_GOLD),    # 9 Crimson Echo (deeper/richer red)
    "tealronin": dict(suit=("#1E6B6B", None),           trim=T_GOLD),    # 10 Teal Ronin
    "ivory":    dict(suit=("#E8E8E4", 0.03),            trim=T_RED),     # 11 Ivory Blade (white)
    "midnight": dict(suit=("#17171C", 0.12, 1.4, 0.14), trim=T_DKRED),   # 12 Midnight Katana (near-black + dk-red)
}

def base_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const samuraiRedRanger"); rest = src[i:]
    j = i + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    return sorted(set(re.findall(r'sheet:\s*"\./(samurai[a-z0-9_]+\.png)"', src[i:j])))

def mega_sheets():
    src = open(os.path.join(ROOT, "abilities.js")).read()
    i = src.index("const SAMURAI_MEGA_ANIM"); rest = src[i:]
    j = i + rest.index("\n}\n")
    return sorted(set(re.findall(r'sheet:\s*"\./(samurai[a-z0-9_]+\.png)"', src[i:j])))

def all_targets():
    return sorted(set(base_sheets()) | set(mega_sheets()) | {"samurai_ranger_portrait.png"})

def build(tag, only=None):
    cfg = SKINS[tag]; total = 0
    for name in all_targets():
        if only and only not in name: continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path): print(f"  SKIP(missing) {name}"); continue
        c = recolor(path, tag, cfg); total += c
        print(f"  {c:7d}px  {name}")
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if tag in (None, "all"):
        for t in SKINS: print(f"\n=== {t} ==="); build(t, only)
    else:
        build(tag, only)

if __name__ == "__main__":
    main()
