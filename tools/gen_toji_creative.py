#!/usr/bin/env python3
# gen_toji_creative.py — Toji Fushiguro creative recolor skins (cosmetic only).
# ---------------------------------------------------------------------------
# Per-region targeted recolor with the project's established technique:
#   • HAIR (head zone) + TANK TOP (torso) are BOTH near-black → SPATIAL split
#     (interior-black above hair_cut = hair, below = tank); boundary-black =
#     OUTLINE and is NEVER recoloured (the line-art coloring-book rule).
#   • PANTS (Toji's white/gray leg ramp + its dark shadows in the leg zone).
#   • SKIN (warm hues) + everything else is PROTECTED.
#   • paint() keeps each region's multi-tone shading (per-pixel value variation
#     around the target), so no flat blobs.
# Verified across every body sheet (18) + portrait. Outputs `<sheet>__<tag>.png`.
# USAGE: gen_toji_creative.py [tag|all|group1|group2|group3]
# ---------------------------------------------------------------------------
import os, re, sys, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HAIR_FRAC = 0.27   # content-height fraction: above = hair/head zone (hair frames the face; the tank starts at the shoulders ~28%)
TANK_FRAC = 0.58   # hair_cut..tank_cut = tank zone; below = pants/legs zone

def hsv(r, g, b): h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); return h*360, s, v
def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

# Each region: (target_hex, target_saturation, value_floor, value_spread)
SKINS = {
  # ── GROUP 1 ──
  "prime":        dict(hair=("#B9C6DC",0.18,0.55,1.16), tank=("#111524",0.42,0.05,1.05), pants=("#3B3F46",0.06,0.16,1.12)),  # Rick-Prime homage: pale silver-blue hair / deep navy-black tank / dark gray pants
  "royalvalkyrie":dict(hair=("#1E45C8",0.74,0.26,1.15), tank=("#141418",0.10,0.05,1.06), pants=("#E4C63A",0.82,0.36,1.16)),  # Beyblade blue/gold — palette matched to Pain/Tobi royalvalkyrie: royal-blue hair / black tank / gold pants
  "miragewyrm":   dict(hair=("#2A1E5A",0.62,0.18,1.13), tank=("#141418",0.10,0.05,1.06), pants=("#2ED0C8",0.72,0.40,1.16)),  # Beyblade navy/teal — palette matched to Pain/Tobi miragewyrm: navy-purple hair / black tank / teal-cyan trim
  "crimsonfang":  dict(hair=("#B01E1E",0.74,0.22,1.14), tank=("#141414",0.09,0.05,1.08), pants=("#5A1616",0.60,0.14,1.10)),  # deep red hair / black tank / dark red pants
  # ── GROUP 2 ──
  "cobaltkiller": dict(hair=("#1E3AA0",0.74,0.20,1.14), tank=("#141414",0.09,0.05,1.08), pants=("#B8BEC8",0.07,0.55,1.12)),  # deep blue hair / black tank / silver pants
  "emeraldronin": dict(hair=("#1E7A3C",0.72,0.22,1.14), tank=("#141414",0.09,0.05,1.08), pants=("#163C22",0.58,0.14,1.10)),  # deep green hair / black tank / dark green pants
  "amethystblade":dict(hair=("#6A2EB0",0.64,0.28,1.16), tank=("#141414",0.09,0.05,1.08), pants=("#7A4AC8",0.52,0.34,1.14)),  # deep purple hair / black tank / violet pants trim
  "ashenveteran": dict(hair=("#8A8A8A",0.04,0.40,1.14), tank=("#2A2A2E",0.06,0.10,1.06), pants=("#6E6E72",0.05,0.30,1.12)),  # muted gray hair / charcoal tank / gray pants (battle-worn)
  # ── GROUP 3 ──
  "ivoryreaper":  dict(hair=("#E9E9ED",0.03,0.72,1.16), tank=("#E4E4E8",0.03,0.68,1.12), pants=("#151515",0.09,0.05,1.08)),  # white/pale hair / white tank / black pants
  "goldenmerc":   dict(hair=("#E0A81E",0.80,0.40,1.18), tank=("#141414",0.09,0.05,1.08), pants=("#E8D8A8",0.28,0.60,1.14)),  # rich gold hair / black tank / cream pants trim
  "tealphantom":  dict(hair=("#0E8E8E",0.78,0.34,1.15), tank=("#141414",0.09,0.05,1.08), pants=("#0E3232",0.52,0.13,1.08)),  # deep teal hair / black tank / dark teal pants
  "voidkiller":   dict(hair=("#0F0F13",0.12,0.04,1.05), tank=("#0F0F13",0.12,0.04,1.05), pants=("#0F0F13",0.12,0.04,1.05)),  # full near-black (hair+tank+pants) — + procedural red-particle overlay (game.js)
}
GROUPS = {
  "group1": ["prime","royalvalkyrie","miragewyrm","crimsonfang"],
  "group2": ["cobaltkiller","emeraldronin","amethystblade","ashenveteran"],
  "group3": ["ivoryreaper","goldenmerc","tealphantom","voidkiller"],
}

def classify(px, W, H):
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] >= 128]
    if not ys: return set(), set(), set(), set()
    ymin, ymax = min(ys), max(ys)
    hair_cut = ymin + HAIR_FRAC * (ymax - ymin)
    tank_cut = ymin + TANK_FRAC * (ymax - ymin)
    DARK, PANTS = set(), set()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            # SKIN (protect, global): warm face/arm tones
            if (h <= 45 or h >= 345) and 0.22 <= s <= 0.78 and v >= 0.50: continue
            # DARK region (hair/tank): near-black OR the plum shadow that shades Toji's hair+tank
            if v <= 0.18 or (v <= 0.42 and s >= 0.18 and 262 <= h <= 340):
                DARK.add((x, y)); continue
            # PANTS: the neutral white/gray leg ramp (below the head; skin is warm, tank is dark)
            if s <= 0.16 and v >= 0.28 and y > hair_cut:
                PANTS.add((x, y)); continue
            # else → protected
    # SPATIAL black split: interior → hair(head) / tank(torso) / pants-shadow(legs); boundary → OUTLINE (protected)
    hair, tank, outline = set(), set(), set()
    for (x, y) in DARK:
        # "interior fill" = ≥3 of 4 orthogonal neighbours also dark → recolourable. A true 1px line-art
        # stroke (dark fill on one side, non-dark background on the other) keeps ≤2 dark neighbours → OUTLINE.
        ndark = ((x+1, y) in DARK) + ((x-1, y) in DARK) + ((x, y+1) in DARK) + ((x, y-1) in DARK)
        if ndark < 3:
            outline.add((x, y))            # line-art boundary — NEVER recoloured
        elif y <= hair_cut:
            hair.add((x, y))
        elif y <= tank_cut:
            tank.add((x, y))
        else:
            PANTS.add((x, y))              # dark shading inside the leg zone recolours with the pants
    return outline, hair, tank, PANTS

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
    OUTLINE, HAIR, TANK, PANTS = classify(px, W, H)
    n = 0
    n += paint(px, PANTS, cfg["pants"])
    n += paint(px, TANK,  cfg["tank"])
    n += paint(px, HAIR,  cfg["hair"])
    return img, n, dict(hair=len(HAIR), tank=len(TANK), pants=len(PANTS), outline=len(OUTLINE))

def targets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const toji = {"); j = src.index("// KASUMI MIWA", i)
    sheets = set(re.findall(r'sheet:\s*"\./(toji_[\w]+_uniform\.png)"', src[i:j]))
    return sorted(sheets | {"toji_portrait.png"})

def build(tag):
    cfg = SKINS[tag]; total = 0; last = {}
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n, counts = recolor(p, cfg)
        img.save(p[:-4] + f"__{tag}.png"); total += n
        if name == "toji_idle_uniform.png": last = counts
    print(f"  {tag:14} total={total}px  (idle: {last})")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    tags = SKINS.keys() if arg == "all" else GROUPS.get(arg, [arg])
    for t in tags:
        if t not in SKINS: print(f"unknown: {t}"); continue
        build(t)

if __name__ == "__main__":
    main()
