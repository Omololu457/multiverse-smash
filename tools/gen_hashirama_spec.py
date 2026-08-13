#!/usr/bin/env python3
"""Hashirama Senju — 13-skin EXACT-SPEC batch (user-specified colors, implemented verbatim to the extent
the posterized _uniform sheets allow). SAME region model as gen_hashirama_creative.py:
  ARMOR = crimson Senju plates · SUIT = dark undersuit/outline mass · SKIN = face/hands · HAIR = mane
  (portrait only — on the body hair merges into SUIT) · LIGHT = white highlights.
Eyes / trim-only / spiral / flame-pattern / hair-streaks are NOT isolable regions on these sprites and
GLOW needs a draw-overlay — those spec details are FLAGGED to the user, not silently faked here.

cfg maps region->(hex,to_sat,floor,spread); only the regions present are painted (so a skin can recolor
just the armor, or everything). USAGE: gen_hashirama_spec.py [tag|all|probe]
"""
import os, sys, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def classify(h, s, v):
    if s < 0.25 and v < 0.13:                        return "OUTLINE"
    if 10 <= h <= 45 and s >= 0.33 and v >= 0.50:    return "SKIN"
    if v >= 0.78 and s < 0.16:                       return "LIGHT"
    if (h >= 328 or h <= 14) and s >= 0.42:          return "ARMOR"
    if 15 <= h <= 75 and s >= 0.18 and 0.13 <= v <= 0.46:  return "HAIR"
    if 150 <= h <= 265 and s >= 0.10 and v < 0.60:   return "SUIT"
    if s < 0.32 and 0.13 <= v < 0.50:                return "SUIT"
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, hexcol, to_sat, floor, spread):
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, _ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    ts = to_sat
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

# region key -> classify() class it paints
KEY2CLASS = {"armor": "ARMOR", "suit": "SUIT", "hair": "HAIR", "skin": "SKIN", "light": "LIGHT"}

# Exact-spec palettes. Hexes chosen to MATCH the user's named colours (listed in the report for verify).
# Eyes / streaks / spiral / flame-trim / glow are FLAGGED separately — not encoded here.
SKINS = {
    # 1 Cherry Blossom Sage — pale blossom-pink armor (replaces red), white trim kept, black hair
    "cherryblossom":  dict(armor=("#F2C4D0", 0.30, 0.55, 1.15)),
    # 2 Deep Forest Canopy — forest-green armor, bark-brown trim (the dark suit mass), black hair
    "forestcanopy":   dict(armor=("#2E5A2A", 0.58, 0.16, 1.15), suit=("#3A2614", 0.55, 0.12, 1.15)),
    # 3 First Hokage's Mantle — white ceremonial robe base (suit), red flame-trim kept (armor), black hair
    "hokagemantle":   dict(suit=("#EAE3D6", 0.06, 0.52, 1.22), armor=("#C21F26", 0.82, 0.26, 1.18)),
    # 4 Senju Spiral — deep crimson base kept, gold on the white-highlight accents (spiral NOT isolable — FLAG)
    "senjuspiral":    dict(armor=("#B01B22", 0.80, 0.24, 1.18), light=("#D4A02A", 0.75, 0.55, 1.15)),
    # 5 Autumn Canopy — burnt-orange armor, deep umber-brown trim, black hair
    "autumnarmor":    dict(armor=("#C25A1E", 0.82, 0.30, 1.18), suit=("#3A2414", 0.55, 0.11, 1.15)),
    # 6 Golden Sage Eyes — KEEP red/black; gold on highlight accents only (eyes/gold-trim NOT isolable — FLAG)
    "goldensage":     dict(light=("#D4A02A", 0.78, 0.55, 1.15)),
    # 7 Moss-Bound Elder — muted sage-green armor, weathered-grey trim, charcoal/grey hair
    "mossbound":      dict(armor=("#6E7A50", 0.45, 0.24, 1.15), suit=("#5A5A54", 0.10, 0.22, 1.18), hair=("#3A3A3A", 0.05, 0.18, 1.20)),
    # 8 Prime of the Senju — vivid saturated scarlet armor (more than default), high-contrast black trim
    "primesenju":     dict(armor=("#E01414", 0.90, 0.28, 1.20), suit=("#141018", 0.20, 0.09, 1.10)),
    # 9 Bound Rivals — indigo-violet-black base (suit), red fan-crest-trim kept (armor), black hair
    "boundrivals":    dict(suit=("#241A3A", 0.55, 0.12, 1.14), armor=("#B01C22", 0.80, 0.24, 1.18)),
    # 10 Ashen Reanimation — grey-white hair, pale grey-white skin, desaturated black armor
    "ashenreanim":    dict(skin=("#CBC6C2", 0.06, 0.62, 1.15), armor=("#2A2A2E", 0.10, 0.12, 1.12), suit=("#6A6A70", 0.06, 0.30, 1.18), hair=("#D2CEC8", 0.04, 0.60, 1.20)),
    # 11 White Binding — pale green-white hair, sickly pale-green skin, desaturated greenish armor
    "whitebinding":   dict(skin=("#CBD6C4", 0.12, 0.62, 1.15), armor=("#8A968A", 0.12, 0.30, 1.15), suit=("#7C887A", 0.10, 0.30, 1.18), hair=("#D2DAC8", 0.08, 0.62, 1.20)),
    # 12 Monument Bronze — ONE flat bronze-grey across EVERYTHING (statue, no colour variation)
    "monumentbronze": dict(armor=("#7A6E52", 0.18, 0.34, 0.90), suit=("#7A6E52", 0.18, 0.34, 0.90), skin=("#7A6E52", 0.18, 0.40, 0.90), hair=("#6E6248", 0.18, 0.30, 0.90), light=("#8A7E60", 0.16, 0.55, 0.90)),
    # 13 Void — green swirling aura: base blackened; the GREEN GLOW is a draw-overlay (FLAG — needs game.js), gated on existing-Void check
    "voidgreen":      dict(armor=("#0E1410", 0.30, 0.08, 1.10), suit=("#0C110E", 0.25, 0.07, 1.10), hair=("#101810", 0.30, 0.09, 1.10)),
}

def base_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const hashirama = {")
    j = i + src[i:].index("\nconst ", 1)
    sheets = set(re.findall(r'sheet:\s*"\./(hashirama[A-Za-z0-9_]+\.png)"', src[i:j]))
    return {s for s in sheets if "__" not in s}

def targets():
    return sorted(base_sheets() | {"hashirama_portrait.png"})

def recolor(path, cfg):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    want = {KEY2CLASS[k] for k in cfg}
    regions = {c: [] for c in want}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v)
            if c in regions: regions[c].append((x, y))
    n = 0
    for key, (hexcol, to_sat, floor, spread) in cfg.items():
        n += paint(px, regions[KEY2CLASS[key]], hexcol, to_sat, floor, spread)
    return img, n

def build(tag):
    cfg = SKINS[tag]; total = 0
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n = recolor(p, cfg); img.save(p[:-4] + f"__{tag}.png"); total += n
    print(f"  {tag:16} total={total}px")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    tags = list(SKINS) if arg == "all" else [arg]
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
