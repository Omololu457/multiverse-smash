#!/usr/bin/env python3
"""Obito Uchiha — 12 creative alt-skins with FOUR coordinated recolor regions: MASK + HAIR + CLOTHING +
SWORD-ACCENT. Cosmetic only — ZERO gameplay/stat changes. Every skin varies >=3 of the 4 regions.

Obito's sprite has genuinely more separable regions than most, but two pairs share a colour family and
must be split by POSITION, not hue (capture-masks-from-original = contamination-proof):

  REGIONS (classified ONCE from the ORIGINAL pixels):
   * OUTLINE (line-art guard) — every near-black pixel on a boundary (adjacent to a different region /
       transparent) is KEPT near-black, so each outline stroke stays a fixed coloring-book boundary and
       is NEVER bled across. Found by 4-neighbour erosion: only INTERIOR near-black is a fill region.
   * HAIR   — the black spiky mane (interior near-black in the HEAD ZONE) + its purple sheen highlights
       (purple pixels in the HEAD ZONE — same hue as the pants, so split by zone). Recoloured per skin.
   * MASK   — the saturated ORANGE spiral mask on the face: warm hue, s>=0.44, in the HEAD ZONE (the
       desaturated face SKIN, s<0.44, falls through to PROTECTED and is never touched).
   * CLOTHING — the main robe: the warm-DESATURATED body BELOW the head zone + the purple lower garment
       (pants). Recoloured to ONE hue preserving each sub-region's value spread → "distinct shades".
   * SWORD-ACCENT — the bright light trim (belt / sash / sandal edging): near-neutral, s<0.18, v mid-high.

  PROTECTED (never selected → untouched): FACE/SKIN (desaturated warm in the head zone), the tiny red
  Sharingan specks, and any mid-neutral shading that matches none of the above.

HEAD ZONE: the sheets are bottom-aligned, so the head sits at the TOP of every cell → head zone = the top
HEAD_FRAC of the sheet's content rows (one value works across all frames of a strip).

paint(): to-tone re-centre a region on the target hue at target value, preserving the region's own
light/dark SPREAD (multi-tone shading kept). A per-region floor keeps dark targets a margin above the
near-black outline so they never fuse into the line art.

USAGE: gen_obito_creative.py [tag|all]     # default: all 12
"""
import os, sys, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HEAD_FRAC = 0.36   # top fraction of content rows = the head zone

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return h*360, s, v
def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

# region tuple = (hex, to_sat, floor, spread) tone-preserve · None = keep the region's natural colour
SKINS = {
 # ---- GROUP 1 ----
 "omnitrix":   dict(mask=("#3FA83B",0.68,0.30,1.15), hair=("#141414",0.10,0.05,1.10), cloth=("#17171E",0.14,0.09,1.05), sword=("#ECECEC",0.03,0.72,1.20)),  # green mask/black hair/black robe/white accent
 "albedo":     dict(mask=("#EDEDED",0.04,0.74,1.20), hair=("#E8E8E8",0.04,0.70,1.20), cloth=("#8E1B22",0.62,0.16,1.12), sword=("#D9A93A",0.70,0.42,1.18)),  # pale mask+hair/deep-red robe/gold accent
 "crimsoneye": dict(mask=("#B01E1E",0.80,0.40,1.14), hair=("#141414",0.10,0.05,1.10), cloth=("#18181E",0.14,0.09,1.05), sword=("#C0302E",0.72,0.40,1.16)),  # black hair/red-black robe/red accent
 "cobalt":     dict(mask=("#1E3A8E",0.74,0.32,1.14), hair=("#141414",0.10,0.05,1.10), cloth=("#171B2E",0.44,0.11,1.06), sword=("#B8BEC8",0.08,0.60,1.18)),  # deep-blue mask/black hair/navy robe/silver accent
 # ---- GROUP 2 ----
 "goldeneye":  dict(mask=("#E0A81E",0.82,0.44,1.18), hair=("#141414",0.10,0.05,1.10), cloth=("#18181E",0.14,0.09,1.05), sword=("#E4C63A",0.80,0.46,1.18)),  # black hair/gold-black robe/yellow-gold accent
 "amethyst":   dict(mask=("#7A2EC0",0.66,0.34,1.16), hair=("#141414",0.10,0.05,1.10), cloth=("#3A1E66",0.60,0.16,1.16), sword=("#B06CE0",0.56,0.46,1.18)),  # purple mask/black hair/violet robe(distinct shades)/purple accent
 "ashen":      dict(mask=("#8A8A8A",0.05,0.42,1.16), hair=("#7C7C7C",0.04,0.34,1.14), cloth=("#2E2E33",0.10,0.12,1.06), sword=("#7A2222",0.66,0.30,1.14)),  # gray mask+hair/charcoal robe/dark-red accent (desaturated mood)
 "ivory":      dict(mask=("#F2F2F2",0.02,0.80,1.20), hair=("#EDEDED",0.03,0.74,1.20), cloth=("#E6E6E6",0.03,0.66,1.20), sword=("#161616",0.10,0.05,1.10)),  # white mask+hair+robe/black accent
 # ---- GROUP 3 ----
 "teal":       dict(mask=("#0E8E8E",0.78,0.34,1.15), hair=("#141414",0.10,0.05,1.10), cloth=("#123A3A",0.52,0.13,1.08), sword=("#B8BEC8",0.08,0.60,1.18)),  # teal mask/black hair/dark-teal robe/silver accent
 "sunfire":    dict(mask=("#C24A0E",0.86,0.42,1.16), hair=("#141414",0.10,0.05,1.10), cloth=("#18181E",0.14,0.09,1.05), sword=("#E0781C",0.86,0.46,1.18)),  # black hair/orange-black robe/burnt-orange accent
 "void":       dict(mask=("#101014",0.16,0.05,1.05), hair=("#0E0E12",0.14,0.04,1.05), cloth=("#0F0F15",0.16,0.05,1.05), sword=("#14141A",0.14,0.06,1.05)),  # full near-black (+ procedural overlay, game.js)
 "storm":      dict(mask=("#2E4A78",0.62,0.34,1.14), hair=("#2A2A2E",0.10,0.12,1.06), cloth=("#26262B",0.10,0.11,1.06), sword=("#2ED0E0",0.78,0.56,1.18)),  # slate-blue mask/dark-gray hair/dark-gray robe/electric-cyan accent
}

def classify(px, W, H):
    """One pass over ORIGINAL pixels → region sets. Head zone splits same-hue pairs by position."""
    # content bbox (rows) for the head zone
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] >= 128]
    if not ys: return set(), set(), set(), set(), set()
    ymin, ymax = min(ys), max(ys)
    head_cut = ymin + HEAD_FRAC * (ymax - ymin)

    BLACK, HAIR, MASK, CLOTH, ACCENT = set(), set(), set(), set(), set()
    for y in range(H):
        head = y <= head_cut
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            if v <= 0.14:                                   BLACK.add((x, y))            # outline OR hair (split by erosion+zone)
            elif 200 <= h <= 300 and s >= 0.18:
                (HAIR if head else CLOTH).add((x, y))                                    # head purple = hair sheen · body purple = pants
            elif h <= 45 or h >= 345:                                                    # warm family (red→orange, wrap)
                if head:
                    if s >= 0.44 and v >= 0.45 and 12 <= h <= 45:  MASK.add((x, y))      # orange mask (face skin is s<0.44)
                    # else FACE SKIN → protected
                else:
                    if s < 0.18 and v >= 0.45:  ACCENT.add((x, y))                       # light warm trim
                    else:                       CLOTH.add((x, y))                        # warm-desaturated robe body
            elif s < 0.18 and 0.42 <= v <= 0.92:            ACCENT.add((x, y))           # neutral/cool light trim (belt/sash/sandal)
            elif s < 0.20 and 0.14 < v <= 0.42:             CLOTH.add((x, y))            # neutral mid shading on the robe
            # everything else → protected
    return BLACK, HAIR, MASK, CLOTH, ACCENT

def erode(black, extra_hair):
    """4-neighbour erosion: interior near-black = HAIR fill; boundary near-black = OUTLINE (kept). Only
    hair-zone interior joins HAIR — body-outline interior black is rare and stays black (safe)."""
    hair = set(extra_hair)
    for (x, y) in black:
        if ((x+1, y) in black and (x-1, y) in black and (x, y+1) in black and (x, y-1) in black):
            hair.add((x, y))
    outline = black - hair
    return hair, outline

def paint(px, pts, cfg):
    if not pts or cfg is None: return 0
    hexcol, to_sat, floor, spread = cfg
    tr, tg, tb = hex2rgb(hexcol); th, _ts, tv = hsv(tr, tg, tb); th /= 360
    vals = [hsv(px[x, y][0], px[x, y][1], px[x, y][2])[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, to_sat, nv)
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

def recolor(path, cfg):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    BLACK, HAIR0, MASK, CLOTH, ACCENT = classify(px, W, H)
    # hair-zone black interior joins HAIR; the purple head-sheen (HAIR0) is already hair
    HAIR, OUTLINE = erode(BLACK, HAIR0)
    # 3 coordinated regions (this obito sprite is UNMASKED — the face is exposed skin, NOT an orange
    # mask; the masked "Tobi" is a separate character). MASK is deliberately NOT painted → the classified
    # saturated-warm head pixels are actually FACE SKIN, so leaving them protects the face. Per the
    # confirmed direction, skins vary HAIR + CLOTHING (purple robe) + SWORD-ACCENT (belt/sash) only.
    n = 0
    n += paint(px, CLOTH, cfg["cloth"])
    n += paint(px, HAIR, cfg["hair"])
    n += paint(px, ACCENT, cfg["sword"])
    return img, n, dict(hair=len(HAIR), cloth=len(CLOTH), accent=len(ACCENT), outline=len(OUTLINE), skin_protected=len(MASK))

def base_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    sheets = set(re.findall(r'sheet:\s*"\./(obito[\w:.+-]+_uniform\.png)"', src))
    # add the direct-use non-uniform art that also carries the character body (none here — projectiles are
    # generic). Portrait is added in targets().
    return {s for s in sheets if "__" not in s}

def targets():
    # every animationData _uniform strip + the portrait + the 3 Juubi/FX sheets are recolored too? NO —
    # the Juubi beast + projectiles are not the character body; skins recolor the BODY sheets only.
    body = {s for s in base_sheets() if not any(k in s for k in ("juubi", "mokuton", "shur_proj", "giantshur", "portalfx"))}
    return sorted(body | {"obito_portrait.png"})

def build(tag):
    cfg = SKINS[tag]; total = 0; last = {}
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n, counts = recolor(p, cfg)
        img.save(p[:-4] + f"__{tag}.png"); total += n
        if name == "obito_idle_uniform.png": last = counts
    print(f"  {tag:12} total={total}px  (idle counts: {last})")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    tags = list(SKINS) if arg == "all" else arg.split(",")
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
