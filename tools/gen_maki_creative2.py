#!/usr/bin/env python3
"""Maki Zenin — 12 GENUINELY creative alt-skins: HAIR + UNIFORM + ACCENT all recolor as a coordinated
palette identity (the Hisoka Bloodhound/Venom/Gilded + Gojo/Sukuna-redo bar), NOT flat single-region
recolors. Supersedes the deleted uniform-only batch (which left the green hair untouched).

THREE independently-targeted regions, classified ONCE from the ORIGINAL pixels (capture-masks-first =
contamination-proof; recoloring hair never shifts the uniform/accent masks), each pixel assigned to at
most one class in priority order so regions never overlap:
  * HAIR    — green/teal hair: hue 120-200, sat>=0.20.
  * UNIFORM — navy garment (+ its desaturated purple-shadow tone): hue 200-305, sat>=0.14. BIMODAL in
              value (light body + dark trim) → the to-tone remap preserves the two-band shading.
  * ACCENT  — the red naginata cord/tassel + weapon-trail rope: (hue>=334 or hue<=16) & sat>=0.34.
PROTECTED (never selected → untouched): SKIN (warm hue 8-42, sat>=0.22, val>=0.40 — matched BEFORE accent
so red-ish skin isn't grabbed), the white/gray BLADE (sat<0.20 bright), and the near-black OUTLINE
(sat<0.20 & val<0.28). Every outline stroke stays a fixed coloring-book boundary (line-art guard) — masks
only ever touch the three garment/hair regions, so no bleed / blobby merge.

paint(): to-tone re-centre on the target hue/sat at the target value, preserving each region's own
light/dark SPREAD (multi-tone shading kept). `floor` keeps a near-black target a margin above outline-black
so it never fuses into the outline; `to_sat` sets the output saturation (low for silver/white/cream);
`spread` widens/narrows the shading contrast. Cosmetic only — ZERO gameplay/stat changes.

USAGE: gen_maki_creative2.py [tag|group N|all]     # default: all 12
"""
import os, sys, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def classify(h, s, v):
    if s < 0.20 and v < 0.28:                       return "OUTLINE"
    if 8 <= h <= 42 and s >= 0.22 and v >= 0.40:    return "SKIN"
    if s < 0.20:                                    return "BLADE"
    if 120 <= h <= 200 and s >= 0.20:               return "HAIR"
    if (h >= 334 or h <= 16) and s >= 0.34:         return "ACCENT"
    if 200 <= h <= 305 and s >= 0.14:               return "UNIFORM"
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, hexcol, to_sat, floor, spread):
    """Re-tone the classified region pixels onto the target, preserving per-region value spread."""
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    ts = to_sat
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

# each region tuple = (hex, to_sat, floor, spread)
SKINS = {
    # ── GROUP 1 ──
    "ironwolf":   dict(hair=("#DBDFE6", 0.05, 0.34, 1.20), uniform=("#2B2E35", 0.12, 0.13, 1.15), accent=("#5C84AC", 0.46, 0.30, 1.05)),
    "bloodmoon":  dict(hair=("#8F1C26", 0.74, 0.14, 1.15), uniform=("#141414", 0.05, 0.10, 1.15), accent=("#701616", 0.70, 0.15, 1.05)),
    "jade":       dict(hair=("#1E5C35", 0.72, 0.12, 1.15), uniform=("#141416", 0.05, 0.10, 1.15), accent=("#CCA33D", 0.70, 0.32, 1.05)),
    "porcelain":  dict(hair=("#F1ECE1", 0.06, 0.55, 1.25), uniform=("#ECEAE2", 0.05, 0.56, 1.30), accent=("#191920", 0.10, 0.05, 1.05)),
    # ── GROUP 2 ──
    "viper":      dict(hair=("#5D2E93", 0.66, 0.16, 1.15), uniform=("#141216", 0.08, 0.10, 1.15), accent=("#9F54E4", 0.62, 0.34, 1.05)),
    "sunblade":   dict(hair=("#E4AC3E", 0.72, 0.40, 1.15), uniform=("#ECE3CC", 0.15, 0.52, 1.25), accent=("#C85A1E", 0.80, 0.30, 1.05)),
    "frostbite":  dict(hair=("#C3E3F3", 0.30, 0.55, 1.20), uniform=("#EDF2F6", 0.06, 0.56, 1.25), accent=("#C9CFD7", 0.13, 0.44, 1.05)),
    "rosethorn2": dict(hair=("#E98DB4", 0.42, 0.46, 1.15), uniform=("#4B2029", 0.56, 0.13, 1.15), accent=("#E96CA3", 0.58, 0.40, 1.05)),
    # ── GROUP 3 ──
    "obsidian":   dict(hair=("#111116", 0.28, 0.09, 1.05), uniform=("#18181D", 0.18, 0.11, 1.05), accent=("#DB212D", 0.84, 0.34, 1.05)),
    "empress":    dict(hair=("#DBA931", 0.80, 0.42, 1.15), uniform=("#3B2061", 0.60, 0.16, 1.15), accent=("#E3BB43", 0.76, 0.42, 1.05)),
    "ashen":      dict(hair=("#9C9C9C", 0.04, 0.42, 1.15), uniform=("#C6AA72", 0.44, 0.44, 1.20), accent=("#7D2222", 0.70, 0.17, 1.05)),
    "stormcaller":dict(hair=("#3C5D92", 0.56, 0.27, 1.15), uniform=("#34373D", 0.11, 0.15, 1.15), accent=("#31D3EB", 0.82, 0.42, 1.05)),
}
GROUPS = {1: ["ironwolf", "bloodmoon", "jade", "porcelain"],
          2: ["viper", "sunblade", "frostbite", "rosethorn2"],
          3: ["obsidian", "empress", "ashen", "stormcaller"]}

def base_sheets():
    import re
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const maki = {"); j = i + src[i:].index("export const characters")
    sheets = set(re.findall(r'sheet:\s*"\./(maki[a-z0-9_]+\.png)"', src[i:j]))
    return {s for s in sheets if "shibuya" not in s}

def targets():
    return sorted(base_sheets() | {"maki_portrait.png"})

def recolor(path, cfg):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    regions = {"HAIR": [], "UNIFORM": [], "ACCENT": []}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v)
            if c in regions: regions[c].append((x, y))
    n = 0
    for key, region in [("hair", "HAIR"), ("uniform", "UNIFORM"), ("accent", "ACCENT")]:
        hexcol, to_sat, floor, spread = cfg[key]
        n += paint(px, regions[region], hexcol, to_sat, floor, spread)
    return img, n, {k: len(v) for k, v in regions.items()}

def build(tag):
    cfg = SKINS[tag]; total = 0
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n, counts = recolor(p, cfg)
        img.save(p[:-4] + f"__{tag}.png"); total += n
    print(f"  {tag:12} total={total}px")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "group": tags = GROUPS[int(sys.argv[2])]
    elif arg == "all": tags = list(SKINS)
    else: tags = [arg]
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
