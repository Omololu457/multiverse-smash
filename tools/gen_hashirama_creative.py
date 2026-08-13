#!/usr/bin/env python3
"""Hashirama Senju — 12 creative alt-skins + 1 Alien-X-style Void skin (personality/lore callbacks):
Wood Release/forest, First Hokage robe, Senju clan, sage/young-prime, Madara-homage accent, Edo Tensei
undead, Sage-Mode amber. HAIR + ARMOR(crimson Senju plates) + SUIT(dark undersuit) recolored as a
coordinated palette identity (same bar as Madara/Minato/Pain creative batches). Cosmetic only — ZERO
gameplay/stat changes.

THREE independently-targeted regions, classified ONCE from the ORIGINAL pixels (capture-masks-first =
contamination-proof), each pixel assigned to at most one class in priority order:
  * HAIR  — his long dark-brown mane: hue 15-75, sat>=0.18, val 0.13-0.46 (warm brown, separated from
            bright skin by VALUE and from the red armor by HUE).
  * ARMOR — the vivid CRIMSON Senju chest/shoulder plates: (hue>=328 or hue<=14) & sat>=0.42. The most
            saturated region; carries the per-skin "armor" colour.
  * SUIT  — the dark blue-gray undersuit/hakama beneath the plates: (150<=hue<=265 & sat>=0.10 & val<0.60)
            OR the neutral dark cloth (sat<0.32 & 0.13<=val<0.50). BIMODAL value → to-tone preserves shading.
PROTECTED (never selected → untouched): near-black OUTLINE (sat<0.25 & val<0.13 = line-art guard); FACE/
SKIN (hue 10-45 & sat>=0.33 & val>=0.50 — matched BEFORE hair so the bright face is never recoloured);
LIGHT collar/white highlights (val>=0.78 & sat<0.16).

paint(): to-tone re-centre on the target hue at the target value, preserving each region's own light/dark
SPREAD. `floor` keeps a near-black target above outline-black so it never fuses into the outline; `to_sat`
sets output saturation; `spread` widens/narrows shading contrast.

USAGE: gen_hashirama_creative.py [tag|all|probe]     # default: all 13
"""
import os, sys, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def classify(h, s, v):
    if s < 0.25 and v < 0.13:                        return "OUTLINE"  # line-art guard
    if 10 <= h <= 45 and s >= 0.33 and v >= 0.50:    return "SKIN"     # bright face/hands — protect
    if v >= 0.78 and s < 0.16:                       return "LIGHT"    # white collar / highlights — protect
    if (h >= 328 or h <= 14) and s >= 0.42:          return "ARMOR"    # crimson Senju plates
    if 15 <= h <= 75 and s >= 0.18 and 0.13 <= v <= 0.46:  return "HAIR"  # dark-brown mane
    if 150 <= h <= 265 and s >= 0.10 and v < 0.60:   return "SUIT"     # blue-gray undersuit
    if s < 0.32 and 0.13 <= v < 0.50:                return "SUIT"     # neutral dark cloth
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
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

# each region tuple = (hex, to_sat, floor, spread)
SKINS = {
    # ── Wood Release / forest & nature (his signature) ──
    "forestsovereign": dict(hair=("#1E4126", 0.58, 0.13, 1.18), suit=("#243B22", 0.50, 0.11, 1.15), armor=("#2E7D32", 0.72, 0.20, 1.18)),  # deep forest green — living Mokuton
    "autumncanopy":    dict(hair=("#5A2C12", 0.62, 0.13, 1.18), suit=("#3A2414", 0.55, 0.11, 1.15), armor=("#C8551D", 0.82, 0.30, 1.18)),  # autumn-leaf burnt orange over bark-brown
    "mossbark":        dict(hair=("#3B3A1C", 0.50, 0.14, 1.15), suit=("#2C3320", 0.42, 0.12, 1.15), armor=("#6E7A2E", 0.62, 0.24, 1.15)),  # muted moss/olive — overgrown forest god
    # ── First Hokage — formal red/white Hokage-robe variant ──
    "firsthokage":     dict(hair=("#141210", 0.30, 0.10, 1.15), suit=("#E4E0D6", 0.06, 0.55, 1.22), armor=("#C21F26", 0.82, 0.26, 1.18)),  # white robe + crimson — the Shodai's mantle
    # ── Senju clan spiral motif — clean clan-forward look ──
    "senjustandard":   dict(hair=("#17130F", 0.32, 0.10, 1.15), suit=("#20304F", 0.46, 0.12, 1.15), armor=("#B71C22", 0.80, 0.24, 1.18)),  # classic clan crimson + navy — banner colours
    # ── grandfatherly sage vs young-prime ──
    "elderSage":       dict(hair=("#D7D2C6", 0.06, 0.55, 1.22), suit=("#6B5E4B", 0.30, 0.30, 1.18), armor=("#8C6A3A", 0.55, 0.30, 1.15)),  # silver-haired laid-back sage, warm muted earth
    "youngprime":      dict(hair=("#241A12", 0.55, 0.11, 1.18), suit=("#1B2E52", 0.55, 0.13, 1.15), armor=("#E12530", 0.88, 0.30, 1.20)),  # vivid, saturated — Hashirama in his prime
    # ── bond with Madara — subtle homage using Madara's blue-black hair / red family ──
    "rivalsbond":      dict(hair=("#2A2E63", 0.50, 0.13, 1.16), suit=("#15141B", 0.20, 0.09, 1.12), armor=("#9C1D24", 0.78, 0.22, 1.18)),  # Madara-blue mane nod + darkened plates
    # ── Sage-Mode-adjacent — amber/orange accents ──
    "sagemarked":      dict(hair=("#3A2A16", 0.55, 0.12, 1.18), suit=("#3E2C10", 0.50, 0.12, 1.15), armor=("#E8912A", 0.86, 0.32, 1.18)),  # amber Sage-Mode glow on the plates
    # ── extra distinct lore/personality palettes ──
    "willoffire":      dict(hair=("#1A1310", 0.34, 0.10, 1.15), suit=("#4A1410", 0.55, 0.11, 1.15), armor=("#F04A1E", 0.88, 0.30, 1.20)),  # blazing ember red — the Will of Fire
    "valleyofthEend":  dict(hair=("#20242C", 0.34, 0.12, 1.14), suit=("#2A2E36", 0.24, 0.13, 1.14), armor=("#5566A0", 0.55, 0.26, 1.16)),  # stone-gray & river-blue — the final battlefield
    "deepforestjade":  dict(hair=("#123028", 0.55, 0.13, 1.18), suit=("#153A2E", 0.50, 0.12, 1.15), armor=("#1FA37A", 0.72, 0.26, 1.18)),  # jade/teal Mokuton — rarer forest hue
    # ── Alien-X-style Void skin (Edo Tensei undead crossover: pale, desaturated, faint glow) ──
    "voidhokage":      dict(hair=("#2C2A3A", 0.30, 0.12, 1.14), suit=("#20202A", 0.20, 0.10, 1.12), armor=("#6E4FA6", 0.60, 0.22, 1.16)),  # cracked-pale undead + violet void glow (Edo Tensei)
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
    regions = {"HAIR": [], "SUIT": [], "ARMOR": []}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v)
            if c in regions: regions[c].append((x, y))
    n = 0
    for key, region in [("hair", "HAIR"), ("suit", "SUIT"), ("armor", "ARMOR")]:
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
    print(f"  {tag:16} total={total}px")

def probe():
    """Print region pixel counts on a few representative sheets — validate masks before generating."""
    for name in ["hashirama_portrait.png", "hashirama_idle_uniform.png", "hashirama_foward_punch_uniform.png"]:
        p = os.path.join(ROOT, name)
        img = Image.open(p).convert("RGBA"); px = img.load(); W, H = img.size
        cnt = {"OUTLINE":0,"SKIN":0,"LIGHT":0,"ARMOR":0,"HAIR":0,"SUIT":0,"OTHER":0}
        for y in range(H):
            for x in range(W):
                r,g,b,a = px[x,y]
                if a < 128: continue
                h,s,v = colorsys.rgb_to_hsv(r/255,g/255,b/255); h *= 360
                cnt[classify(h,s,v)] += 1
        tot = sum(cnt.values()) or 1
        print(f"=== {name} ({W}x{H}) opaque={tot} ===")
        for k in ["HAIR","ARMOR","SUIT","SKIN","LIGHT","OUTLINE","OTHER"]:
            print(f"  {k:8} {cnt[k]:6d}  {100*cnt[k]/tot:4.1f}%")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "probe": probe(); return
    tags = list(SKINS) if arg == "all" else [arg]
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
