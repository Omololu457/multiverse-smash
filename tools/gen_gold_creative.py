#!/usr/bin/env python3
"""Generate the Gold Samurai Ranger's (Light) 12 THEMED alt-color skins (__<tag>.png sheets).

Recolors BOTH tiers so a skin stays consistent through a Mega Mode transform:
  * BASE tier — the sheets in characters.gold_samurai_ranger.animationData (retagged by skins.js
                recolorSkinAnim).
  * MEGA tier — the sheets in abilities.js GOLD_MEGA_ANIM (retagged at transform time by
                abilities.js applySamuraiMegaStats → retagFormAnim(anim, fighter._recolorTag);
                the skins.js entries carry recolorTag so applySkin stamps it). Without this the
                Mega form would snap back to the canonical GOLD sheets mid-skin.

Capture-masks-from-original (contamination-proof, same as gen_omega_creative / gen_samurai_creative).
The Gold Ranger sprite is FULLY HELMETED (gold helmet, dark face slit) — NO exposed skin, so the
skin-bleed guard is unnecessary. Two cleanly-separable themed regions (verified across idle/attack/
mega sheets):
  * PLATE — the GOLD armor plates + helmet (the iconic "armor"): hue 18-52, sat>=0.30, val>=0.20.
            Dominant in the Mega tier (~57%), so it carries the skin's primary identity colour.
  * SUIT  — the deep-BLUE bodysuit (arms/legs/torso undersuit): hue 200-265, sat>=0.55, val<=0.80.
            Base tier only — the Mega bodysuit is near-black (val<0.20, reads as outline) and is
            intentionally left black (documented tier limitation; the Mega form still reads as its
            PLATE colour, which is the identity colour).

LIGHT-WAVE FX GUARD (mirror of Red's fire-guard, but STRUCTURAL not sheet-listed): Gold's signature
Barracuda-Blade light slash-wave is a BRIGHT blue-white FX (val>0.80 core + low-sat whitish spread).
The SUIT gate's val<=0.80 ceiling + sat>=0.55 floor structurally excludes it, and white/neutral
(sat<0.18) is never touched — so the light-wave stays its signature blue-white on EVERY skin, and the
white belt/gloves + FX core stay clean. No separate flame-sheet list needed.

LINE-ART GUARD: masks never select outline/near-black pixels; `floor` keeps a dark PLATE/SUIT target
a clear margin above outline-black so plates never fuse into a blob (see Stormbringer / Voidwalker /
Obsidian Edge). Multi-tone shading preserved via tone-remap. Cosmetic only; zero gameplay.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import rgb_hsv, hex2rgb
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# region selectors (evaluated against the ORIGINAL pixel)
def plate(h, s, v): return 18 <= h*360 <= 52 and s >= 0.30 and v >= 0.20
def suit(h, s, v):  return 200 <= h*360 <= 265 and s >= 0.55 and v <= 0.80

REGIONS = [("plate", plate), ("suit", suit)]

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
    img = Image.open(path).convert("RGBA"); W, H = img.size
    px = bytearray(img.tobytes())
    masks = {name: [] for name, _ in REGIONS}
    for i in range(W*H):
        if px[i*4+3] == 0: continue
        h, s, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        for name, sel in REGIONS:
            if sel(h, s, v):
                masks[name].append(i); break
    total = 0
    for name, _ in REGIONS:
        spec = cfg[name]
        hexv, to_sat = spec[0], spec[1]
        spread = spec[2] if len(spec) > 2 else 1.0
        floor  = spec[3] if len(spec) > 3 else 0.0
        total += paint(px, masks[name], hexv, spread=spread, to_sat=to_sat, floor=floor)
    Image.frombytes("RGBA", (W, H), bytes(px)).save(path[:-4] + f"__{tag}.png")
    return total

# ── the 12 THEMED skins: PLATE (primary armor, named first) + SUIT (secondary/accent) ──
# spec = (hex, to_sat|None, [spread], [floor]). to_sat forces sat for grayscale/near-black targets.
SKINS = {
    # 1 STORMBRINGER — charcoal-black plates, electric-blue-white suit accent (thunder variant)
    "stormbringer": dict(plate=("#1E1E24", 0.12, 1.4, 0.15), suit=("#7EE8F5", 0.55)),
    # 2 OMNITRIX PROTOCOL — Ben-10 homage: green armor, black suit (white belt/gloves stay = emblem)
    "omnitrix":     dict(plate=("#3FA83B", None),            suit=("#17171C", 0.12, 1.4, 0.14)),
    # 3 ALBEDO PROTOCOL — inverted homage: pale/white armor, deep-red suit
    "albedo":       dict(plate=("#DCDCD6", 0.04),            suit=("#8F1F1F", None)),
    # 4 SOLAR EMPEROR — molten/richer gold armor, black suit (leans INTO the gold identity)
    "solar":        dict(plate=("#B8860B", None, 1.1),       suit=("#17171C", 0.12, 1.4, 0.14)),
    # 5 DEEP CURRENT — deep ocean-blue armor, seafoam-teal suit accent
    "deepcurrent":  dict(plate=("#1E5A8F", None),            suit=("#5FC9B0", 0.50)),
    # 6 ASHEN VOW — muted charcoal-gray armor, dried-blood dark-red suit accent
    "ashenvow":     dict(plate=("#4A4A52", 0.10, 1.15, 0.12), suit=("#6E1F26", None)),
    # 7 BLOSSOM STRIKE — soft pink armor, deeper-rose suit accent (white belt/gloves stay = trim)
    "blossom":      dict(plate=("#E89ABF", None),            suit=("#C74E86", None)),
    # 8 VOIDWALKER — near-black armor + suit; procedural drifting gold sparks (game.js overlay)
    "voidwalker":   dict(plate=("#141419", 0.12, 1.45, 0.14), suit=("#101015", 0.12, 1.45, 0.13)),
    # 9 CRIMSON VANGUARD — deep-red armor, gold suit accent (distinct from Samurai Red's default)
    "crimson":      dict(plate=("#9E2222", None),            suit=("#C9922E", None)),
    # 10 IVORY SENTINEL — clean white/pale-gray armor, black suit trim
    "ivory":        dict(plate=("#DAD9D3", 0.03),            suit=("#1A1A1E", 0.10, 1.35, 0.13)),
    # 11 OBSIDIAN EDGE — near-black armor, single vivid-gold suit accent line (flat, no overlay)
    "obsidian":     dict(plate=("#1A1A20", 0.12, 1.45, 0.15), suit=("#D4A02E", None)),
    # 12 TWILIGHT SAMURAI — deep indigo-purple armor, silver suit accent
    "twilight":     dict(plate=("#4B3A8F", None),            suit=("#C6C6CC", 0.05)),
}

def base_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const goldSamuraiRanger"); rest = src[i:]
    j = i + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    return set(re.findall(r'sheet:\s*"\./(samurai[a-z0-9_]+\.png)"', src[i:j]))

def mega_sheets():
    src = open(os.path.join(ROOT, "abilities.js")).read()
    i = src.index("const GOLD_MEGA_ANIM"); rest = src[i:]
    j = i + rest.index("\n}\n")
    return set(re.findall(r'sheet:\s*"\./(samurai[a-z0-9_]+\.png)"', src[i:j]))

def all_targets():
    return sorted(base_sheets() | mega_sheets() | {"samurai_ranger_gold_portrait.png"})

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
