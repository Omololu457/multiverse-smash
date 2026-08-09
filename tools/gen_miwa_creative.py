#!/usr/bin/env python3
"""Kasumi Miwa — 12 GENUINELY creative alt-skins: HAIR + JACKET + TRAIL-ACCENT all recolor as a coordinated
palette identity (the Maki-redo / Hisoka Bloodhound-Venom bar), NOT flat single-region recolors — hair AND
jacket BOTH vary together.

THREE independently-targeted regions, classified ONCE from the ORIGINAL pixels (capture-masks-first =
contamination-proof; recoloring hair never shifts the jacket/trail masks), each pixel assigned to at most one
class in priority order so regions never overlap:
  * HAIR    — blue hair (bright crown + darker draped strands): hue 168-222, sat>=0.28. (Miwa's long hair
              drapes over the body, so blue in the body region is hair, not jacket.)
  * UNIFORM — navy school blazer + its purple-black deep shadow: hue 200-320, sat>=0.13, checked AFTER hair
              so the hue 200-222 overlap goes to hair. BIMODAL in value → to-tone keeps the shading bands.
  * TRAIL   — the white slash-trail FX / blade glint / collar highlight (sat<0.18, bright): the "sword-trail
              accent". Recoloured to the theme's accent tone.
PROTECTED (never selected → untouched): SKIN (warm hue 8-45), the gray steel BLADE (sat<0.18, mid val), the
near-black OUTLINE (val<0.10 — every stroke stays a fixed coloring-book boundary, line-art guard), and the
portrait's saturated TEAL BACKGROUND (hue 170-188 sat>=0.80 — nothing on the sprites is that saturated there,
so this only guards the bust). No bleed / no blobby merged regions.

paint(): to-tone re-centre on the target hue/sat at the target value, preserving each region's own light/dark
SPREAD (multi-tone shading kept). `floor` keeps a near-black/target-dark a margin above outline-black so it
never fuses into the outline; `to_sat` sets output saturation (low for silver/white/cream). Cosmetic only —
ZERO gameplay/stat changes.

USAGE: gen_miwa_creative.py [tag | group N | all]     # default: all 12
"""
import os, re, sys, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def classify(h, s, v):
    if v < 0.10:                                    return "OUTLINE"   # near-black strokes → protect line-art
    if 170 <= h <= 188 and s >= 0.80:               return "BG"        # portrait teal background (very saturated) → protect
    if 8 <= h <= 45 and s >= 0.25 and v >= 0.45:    return "SKIN"      # warm face/hands → protect
    if s < 0.18 and v >= 0.72:                      return "TRAIL"     # white slash-trail / glint / collar = the accent
    if s < 0.18:                                    return "BLADE"     # gray steel blade → protect
    if 168 <= h <= 222 and s >= 0.28:               return "HAIR"      # blue hair (bright crown + draped strands)
    if 200 <= h <= 320 and s >= 0.13:               return "UNIFORM"   # navy blazer + purple-black shadow
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, hexcol, to_sat, floor, spread):
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    ts = to_sat
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), vv in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (vv - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

# each region tuple = (hex, to_sat, floor, spread)
SKINS = {
    # ── GROUP 1 ──
    "silverblade":   dict(hair=("#DBDFE6", 0.05, 0.34, 1.20), uniform=("#2B2E35", 0.12, 0.13, 1.15), trail=("#5C84AC", 0.46, 0.34, 1.05)),  # silver-white hair / charcoal jacket / steel-blue trail
    "crimsonedge":   dict(hair=("#8F1C26", 0.74, 0.16, 1.15), uniform=("#141414", 0.05, 0.10, 1.15), trail=("#7E1A1A", 0.74, 0.32, 1.05)),  # deep-red hair / black / dark-red trail
    "jadewhisper":   dict(hair=("#1E5C35", 0.72, 0.13, 1.15), uniform=("#141416", 0.05, 0.10, 1.15), trail=("#CCA33D", 0.70, 0.44, 1.05)),  # deep-green hair / black / gold trail
    "goldenvow":     dict(hair=("#E4AC3E", 0.72, 0.40, 1.15), uniform=("#ECE3CC", 0.15, 0.52, 1.25), trail=("#D98A2B", 0.76, 0.42, 1.05)),  # amber-gold hair / cream jacket / amber trail
    # ── GROUP 2 ──
    "violetnocturne":dict(hair=("#5D2E93", 0.66, 0.17, 1.15), uniform=("#141216", 0.08, 0.10, 1.15), trail=("#9F54E4", 0.62, 0.46, 1.05)),  # deep-purple hair / black / violet trail
    "rosethorn":     dict(hair=("#E98DB4", 0.42, 0.46, 1.15), uniform=("#4B2029", 0.56, 0.13, 1.15), trail=("#E96CA3", 0.58, 0.46, 1.05)),  # soft-pink hair / deep-maroon jacket / pink trail
    "frostbite":     dict(hair=("#C3E3F3", 0.30, 0.55, 1.20), uniform=("#EDF2F6", 0.06, 0.56, 1.25), trail=("#AEB9C6", 0.17, 0.50, 1.05)),  # pale ice-blue hair / white jacket / silver trail
    "obsidianveil":  dict(hair=("#111116", 0.26, 0.09, 1.05), uniform=("#18181D", 0.18, 0.11, 1.05), trail=("#DB212D", 0.86, 0.46, 1.05)),  # jet-black hair / near-black jacket / vivid-red trail (ONLY colour break)
    # ── GROUP 3 ──
    "sunfire":       dict(hair=("#D9611F", 0.82, 0.34, 1.15), uniform=("#141414", 0.05, 0.10, 1.15), trail=("#F07A1E", 0.84, 0.46, 1.05)),  # burnt-orange hair / black / orange trail
    "ivorydawn":     dict(hair=("#F1ECE1", 0.06, 0.55, 1.25), uniform=("#EDECE8", 0.05, 0.56, 1.25), trail=("#D8B24A", 0.72, 0.46, 1.05)),  # white/pale hair / white jacket / gold trail
    "tealcurrent":   dict(hair=("#0E8F72", 0.70, 0.22, 1.15), uniform=("#33383A", 0.08, 0.15, 1.15), trail=("#17D4A0", 0.76, 0.46, 1.05)),  # deep GREEN-teal hair / neutral dark-gray jacket / teal-green trail (pushed green to separate from Storm Veil)
    "stormveil":     dict(hair=("#4E6FB0", 0.58, 0.30, 1.15), uniform=("#2C3340", 0.15, 0.15, 1.15), trail=("#38C0FF", 0.80, 0.48, 1.05)),  # brighter slate-BLUE hair / dark slate-blue-gray jacket / electric sky-cyan trail (pushed blue)
}
GROUPS = {1: ["silverblade", "crimsonedge", "jadewhisper", "goldenvow"],
          2: ["violetnocturne", "rosethorn", "frostbite", "obsidianveil"],
          3: ["sunfire", "ivorydawn", "tealcurrent", "stormveil"]}

def targets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    sheets = set(re.findall(r'sheet:\s*"\./(kasumi[a-z0-9_]+\.png)"', src))  # only Miwa uses kasumi_* sheets
    return sorted(sheets | {"kasumi_portrait.png"})

def recolor(path, cfg):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    regions = {"HAIR": [], "UNIFORM": [], "TRAIL": []}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v)
            if c in regions: regions[c].append((x, y))
    n = 0
    for key, region in [("hair", "HAIR"), ("uniform", "UNIFORM"), ("trail", "TRAIL")]:
        hexcol, to_sat, floor, spread = cfg[key]
        n += paint(px, regions[region], hexcol, to_sat, floor, spread)
    return img, n, {k: len(v) for k, v in regions.items()}

def build(tag):
    cfg = SKINS[tag]; total = 0; counts = None
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n, c = recolor(p, cfg)
        if name.startswith("kasumi_idle"): counts = c
        img.save(p[:-4] + f"__{tag}.png"); total += n
    print(f"  {tag:14} total={total}px  idle-regions={counts}")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "group": tags = GROUPS[int(sys.argv[2])]
    elif arg == "all": tags = list(SKINS)
    else: tags = [arg]
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
