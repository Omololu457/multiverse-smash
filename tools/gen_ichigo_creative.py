#!/usr/bin/env python3
"""Ichigo Kurosaki — 12 reference-inspired creative alt-skins: HAIR + ROBE + TRIM recolored as a
coordinated palette identity (same bar as the Maki/Madara/Sukuna creative batches), NOT flat one-region
recolors. Cosmetic only — ZERO gameplay/stat changes.

Ichigo's TYBW sprite is special: the outer shihakushō ROBE is rendered as flat PURE BLACK (#000000),
the SAME colour as every line-art outline stroke (verified: 100% of dark pixels are v=0.00). Colour
alone cannot separate robe-fill from outline, so the ROBE region is found SPATIALLY:

  * ROBE  — pure-black pixels in the INTERIOR of a black mass (4-neighbour erosion: a black pixel whose
            N/S/E/W neighbours are ALL black). These fill flat with the skin's robe colour.
  * OUTLINE (line-art guard) — every black pixel on a boundary (adjacent to skin/hair/white/blade/
            transparent) is KEPT pure black, so each outline stroke stays a fixed coloring-book boundary
            and is NEVER bled across. This is what preserves the line art on a pure-black-robe sprite.

The two colour regions are classified ONCE from the ORIGINAL pixels (capture-masks-first =
contamination-proof; recoloring one region never shifts another's mask):

  * HAIR  — the orange spiky mane: hue 12-48, sat>=0.30, val>=0.45 (cleanly separable — the face SKIN is
            desaturated sat<0.30, so it is never caught by the hair mask).
  * TRIM  — the bright white sash / inner garment: val>=0.78, sat<0.22. Carries the per-skin "trim" colour.

PROTECTED (never selected → untouched): FACE/SKIN (desaturated warm, s<0.30 — falls through to OTHER),
the gray Zangetsu BLADES + mid shading (desaturated mid-value → OTHER), and the tiny red hilt/eye specks.

paint(): to-tone re-centre HAIR/TRIM on the target hue at target value, preserving each region's own
light/dark SPREAD (multi-tone shading kept). fill_robe(): flat fill (the source robe is flat) at a value
FLOORED a margin above outline-black so a dark robe target never fuses into the outline.

USAGE: gen_ichigo_creative.py [tag|all]     # default: all 12
"""
import os, sys, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return h*360, s, v

def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

# ── each skin: hair/trim = (hex, to_sat, floor, spread) tone-preserve | hair None = keep natural orange
#              robe = (hex, floor) flat fill (source robe is flat pure-black)
SKINS = {
    # ---- GROUP 1 ----
    "crimsonreaper":   dict(hair=None,                        robe=("#8E1B22", 0.16), trim=("#161616", 0.20, 0.05, 1.10)),  # orange hair / deep crimson robe / black trim
    "verdantblade":    dict(hair=("#1A1A1E", 0.14, 0.05, 1.10), robe=("#3D4A1E", 0.17), trim=("#161616", 0.20, 0.05, 1.10)),  # black hair / deep olive robe / black trim
    "frostshinigami":  dict(hair=("#AED8EA", 0.34, 0.62, 1.20), robe=("#2E3138", 0.19), trim=("#161616", 0.20, 0.05, 1.10)),  # ice-blue hair / dark charcoal robe / black trim
    "twilightcontrast":dict(hair=("#5A2E86", 0.60, 0.24, 1.18), robe=("#B85A1E", 0.42), trim=("#161616", 0.20, 0.05, 1.10)),  # deep purple hair / burnt-orange robe / black trim (striking)

    # ---- GROUP 2 ----
    "roserequiem":     dict(hair=("#14161F", 0.24, 0.05, 1.10), robe=("#E39BB4", 0.62), trim=("#F2F2F2", 0.03, 0.72, 1.20)),  # blue-black hair / soft rose robe / white trim
    "amberronin":      dict(hair=("#6B4223", 0.55, 0.22, 1.15), robe=("#B87E2A", 0.44), trim=("#EAD9B0", 0.28, 0.60, 1.18)),  # warm brown hair / amber robe / cream trim
    "silverfrost":     dict(hair=("#E6EAF0", 0.05, 0.66, 1.22), robe=("#B9CEDD", 0.62), trim=("#161616", 0.20, 0.05, 1.10)),  # pale-silver hair / pale ice-blue robe / black trim
    "emberguard":      dict(hair=("#17171B", 0.18, 0.05, 1.10), robe=("#BD5A1C", 0.44), trim=("#161616", 0.20, 0.05, 1.10)),  # black hair / burnt-orange robe / black trim (≠ Twilight: black hair)

    # ---- GROUP 3 ----
    "royalzangetsu":   dict(hair=("#E0A81E", 0.80, 0.42, 1.20), robe=("#4B2A86", 0.28), trim=("#D9A93A", 0.72, 0.42, 1.18)),  # rich gold hair / royal purple robe / gold trim
    "voidwalker":      dict(hair=("#E8ECF2", 0.05, 0.68, 1.22), robe=("#191E33", 0.20), trim=("#AEB4C0", 0.10, 0.52, 1.18)),  # pale hair / navy-black robe / silver trim (flat-recolor, not overlay)
    "autumntide":      dict(hair=("#1E6E6E", 0.62, 0.34, 1.18), robe=("#6E1F28", 0.24), trim=("#C99A34", 0.70, 0.42, 1.18)),  # deep teal hair / deep maroon robe / gold trim
    "emeraldghost":    dict(hair=("#E8ECF2", 0.05, 0.68, 1.22), robe=("#23232A", 0.16), trim=("#2FBD46", 0.78, 0.42, 1.18)),  # pale hair / near-black robe / vivid green trim (standout)
}

def classify_sets(px, W, H):
    """One pass over the ORIGINAL pixels → BLACK mask, HAIR set, TRIM set. Robe is derived from BLACK."""
    BLACK, HAIR, TRIM = set(), set(), set()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            if s < 0.35 and v < 0.12:                    BLACK.add((x, y))   # robe-fill OR outline (split by erosion)
            elif 12 <= h <= 48 and s >= 0.30 and v >= 0.45: HAIR.add((x, y))  # orange mane (face is s<0.30)
            elif v >= 0.78 and s < 0.22:                 TRIM.add((x, y))    # white sash / inner garment
            # everything else (face skin, gray blades, red specks) → untouched
    return BLACK, HAIR, TRIM

def erode_robe(BLACK):
    """4-neighbour erosion: a black pixel whose N/S/E/W are ALL black is interior ROBE; the rest stays
    black as OUTLINE. This preserves every line-art stroke on the pure-black-robe sprite."""
    robe = set()
    for (x, y) in BLACK:
        if ((x+1, y) in BLACK and (x-1, y) in BLACK and (x, y+1) in BLACK and (x, y-1) in BLACK):
            robe.add((x, y))
    return robe

def paint(px, pts, hexcol, to_sat, floor, spread):
    """Re-tone HAIR/TRIM onto the target hue, preserving the region's own value spread (shading kept)."""
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, _ts, tv = hsv(tr, tg, tb); th /= 360
    vals = [hsv(px[x, y][0], px[x, y][1], px[x, y][2])[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, to_sat, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

def fill_robe(px, pts, hexcol, floor):
    """Flat fill (source robe is flat pure-black). Value floored a margin above outline-black."""
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, ts, tv = hsv(tr, tg, tb); th /= 360
    tv = max(floor, tv)
    nr, ng, nb = colorsys.hsv_to_rgb(th, ts, tv)
    R, G, B = round(nr*255), round(ng*255), round(nb*255)
    for (x, y) in pts:
        px[x, y] = (R, G, B, px[x, y][3])
    return len(pts)

def base_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    # ichigo sheets are uniquely prefixed → scan whole file; only _uniform strips are the base art.
    sheets = set(re.findall(r'sheet:\s*"\./(ichigo[\w.-]+_uniform\.png)"', src))
    return {s for s in sheets if "__" not in s}   # exclude any already-tagged sheets

def targets():
    return sorted(base_sheets() | {"ichigo_portrait.png"})

def recolor(path, cfg):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    BLACK, HAIR, TRIM = classify_sets(px, W, H)
    ROBE = erode_robe(BLACK)
    n = 0
    n += fill_robe(px, ROBE, *cfg["robe"])
    if cfg["hair"] is not None:
        n += paint(px, HAIR, *cfg["hair"])
    n += paint(px, TRIM, *cfg["trim"])
    return img, n, dict(robe=len(ROBE), outline=len(BLACK)-len(ROBE), hair=len(HAIR), trim=len(TRIM))

def build(tag):
    cfg = SKINS[tag]; total = 0; last = {}
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            print(f"  SKIP(missing) {name}"); continue
        img, n, counts = recolor(p, cfg)
        img.save(p[:-4] + f"__{tag}.png"); total += n; last = counts
    print(f"  {tag:16} total={total}px  (idle-ish counts: {last})")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    tags = list(SKINS) if arg == "all" else [arg]
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
