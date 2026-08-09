#!/usr/bin/env python3
"""Zaraki Kenpachi (Bleach, TYBW) — creative alt-skins: HAIR + HAORI + UNDER_ROBE recolored as ONE
coordinated palette identity per skin (same bar as the Ichigo/Maki/Goku-Black creative batches).
Cosmetic only — ZERO gameplay/stat changes.

REGION MODEL (confirmed against the TYBW sheet — see ZARAKI_SKIN_NOTES):
  * The sprite has NO eyepatch and NO separable obi/sash, and the visible eye is 1-2px. So the coordinated
    palette is exactly THREE regions: hair / haori / under_robe. Skin + eye are EXCLUDED by default.
  * HAORI (the open white jacket, incl. its gray fold-shading) is COLOUR-separable: light + low-sat.
  * HAIR and UNDER_ROBE are BOTH near-black, so they cannot be split by colour. They are split SPATIALLY:
    the dark mass is eroded (4-neighbour) into OUTLINE (boundary → kept black = line-art guard, §4) vs
    INTERIOR; interior dark ABOVE a head-anchored line is HAIR, below it is UNDER_ROBE.
  * PROTECTED (never selected → untouched): face SKIN (warm desaturated), the gray Zangetsu BLADE + the
    gold hilt speck + the tiny eye (mid-value / off-palette → fall through to OTHER).

TONE PRESERVATION (§3): paint() re-centres a region on its target hue+value while preserving that
region's own light/dark SPREAD, so fold/shading detail survives the recolor.

SPECIAL MODES:
  * voidsovereign (§8 Part A) — FULL-FORM near-black #0F0F12 (skin + eye INCLUDED this one time); the
    crackling-reiatsu overlay (Part B) is game.js drawZarakiVoidOverlay.
  * umbral — palette INVERSION (hair->white, haori->black, under_robe->white); skin/eye stay default.

USAGE: gen_zaraki_creative.py [tag|group1|group2|group3|all]   # default: all
"""
import os, sys, glob, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return h*360, s, v

def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

# ── each skin: hair / haori / under_robe target hex. mode: "region" (default 3-region) | "fullform".
SKINS = {
    # ---- GROUP 1 ----
    "crimsonreaper":    dict(hair="#151515", haori="#8E1B22", robe="#141414"),  # black hair / blood-red haori / black robe
    "frostbitten":      dict(hair="#C8E0EE", haori="#6FA8CC", robe="#1E2A46"),  # icy white-blue hair / frost-blue haori / navy robe
    "wildfirebells":    dict(hair="#C0472A", haori="#8C8C89", robe="#5A1E24"),  # burnt orange-red hair / ash-grey haori / maroon robe
    "verdantblade":     dict(hair="#2E5A32", haori="#6B7A3A", robe="#141414"),  # forest-green hair / moss-green haori / black robe
    # ---- GROUP 2 ----
    "goldenbutcher":    dict(hair="#E0A81E", haori="#E6D2A0", robe="#3A2416"),  # molten-gold hair / cream-gold haori / deep-brown robe
    "nightfallronin":   dict(hair="#15151A", haori="#20223C", robe="#14161E"),  # black hair / deep indigo-black haori / near-black navy robe
    "violetonslaught":  dict(hair="#5A2E86", haori="#B0A0C8", robe="#48233E"),  # deep-purple hair / lavender-grey haori / plum robe
    "ashenmarshal":     dict(hair="#8A9098", haori="#DBDEE1", robe="#2A2C30"),  # steel-grey hair / pale ash-white haori / charcoal robe
    # ---- GROUP 3 (specialty) ----
    "voidsovereign":    dict(mode="fullform", flat="#0F0F12"),                  # full-form near-black (+ game.js overlay)
    "umbral":           dict(hair="#ECECEC", haori="#0E0E10", robe="#EAEAEA"),  # inversion: white hair / black haori / white robe
}
GROUPS = {
    "group1": ["crimsonreaper", "frostbitten", "wildfirebells", "verdantblade"],
    "group2": ["goldenbutcher", "nightfallronin", "violetonslaught", "ashenmarshal"],
    "group3": ["voidsovereign", "umbral"],
}

# FX sheets that are spawned with hardcoded paths (never retagged) — do NOT recolor (they're not the body).
FX_SKIP = {
    "zaraki_special_effect_uniform.png",
    "zaraki_Yachiru_Kusajishi_dash_assist_uniform.png",
    "zaraki_Yachiru_Kusajishi_throw_projectile_uniform.png",
    "zaraki_specail_effect_assist_uniform.png",
}

def classify(px, W, H):
    """One pass over ORIGINAL pixels → DARK mask (hair/robe/outline) + HAORI set (white jacket)."""
    DARK, HAORI = set(), set()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            if v < 0.20:                       DARK.add((x, y))    # hair + under_robe + outline (spurious-hue near-blacks incl.)
            elif v >= 0.52 and s < 0.24:       HAORI.add((x, y))   # white jacket + its lighter fold-shading
            # else: face skin (warm), mid-gray blade, gold hilt, eye → untouched
    return DARK, HAORI

def erode(DARK):
    """4-neighbour erosion → interior dark (recolourable) vs boundary (OUTLINE, kept black = line-art guard)."""
    interior = set()
    for (x, y) in DARK:
        if (x+1, y) in DARK and (x-1, y) in DARK and (x, y+1) in DARK and (x, y-1) in DARK:
            interior.add((x, y))
    return interior

def split_hair_robe(interior, px, W, H):
    """Interior dark → HAIR (above a head-anchored line) vs UNDER_ROBE (below). The line anchors to the
    LOWEST face-skin pixel (pose-invariant) so hair = the mane framing the head; falls back to the top
    third of the content bbox when no skin is visible."""
    if not interior: return set(), set()
    # find face skin extent + content bbox across the whole sheet
    skin_ys, ys = [], []
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            ys.append(y)
            h, s, v = hsv(r, g, b)
            if s >= 0.20 and 18 <= h <= 55 and v >= 0.32: skin_ys.append(y)
    y0, y1 = min(ys), max(ys)
    if skin_ys:
        line = max(skin_ys) + int(0.10 * (y1 - y0))     # hair reaches a touch below the chin
    else:
        line = y0 + int(0.32 * (y1 - y0))
    HAIR  = {(x, y) for (x, y) in interior if y <  line}
    ROBE  = {(x, y) for (x, y) in interior if y >= line}
    return HAIR, ROBE

def paint(px, pts, hexcol, spread=1.12):
    """Re-tone a region onto target hue+value, preserving its own value spread (shading kept). floor/sat
    derived from the target hex so config stays a single colour per region."""
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, tsat, tv = hsv(tr, tg, tb); th /= 360
    floor = max(0.03, tv - 0.34)
    vals = [hsv(*px[x, y][:3])[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, tsat, nv)
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

def fill_flat(px, W, H, hexcol):
    """Full-form recolor: every opaque pixel → flat target (Void Sovereign; overlay does the rest)."""
    R, G, B = hex2rgb(hexcol); n = 0
    for y in range(H):
        for x in range(W):
            if px[x, y][3] >= 128:
                px[x, y] = (R, G, B, px[x, y][3]); n += 1
    return n

def recolor(path, cfg):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    if cfg.get("mode") == "fullform":
        return img, fill_flat(px, W, H, cfg["flat"])
    DARK, HAORI = classify(px, W, H)
    HAIR, ROBE = split_hair_robe(erode(DARK), px, W, H)
    n = 0
    n += paint(px, HAIR, cfg["hair"])
    n += paint(px, ROBE, cfg["robe"])
    n += paint(px, HAORI, cfg["haori"])
    return img, n

def targets():
    sheets = [os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "zaraki_*_uniform.png"))]
    sheets = [s for s in sheets if "__" not in s and s not in FX_SKIP]
    sheets.append("zaraki_transparent_copy.png")   # character-select portrait
    return sorted(set(sheets))

def build(tag):
    cfg = SKINS[tag]; total = 0; n_sheets = 0
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n = recolor(p, cfg)
        img.save(p[:-4] + f"__{tag}.png"); total += n; n_sheets += 1
    print(f"  {tag:16} {n_sheets} sheets · {total}px recolored")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg in GROUPS: tags = GROUPS[arg]
    elif arg == "all": tags = list(SKINS)
    else: tags = [arg]
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
