#!/usr/bin/env python3
"""Tobi (masked Obito alias) — 12 creative alt-skins + 1 cosmic "Celestial Veil", FOUR coordinated
recolor regions: MASK + HAIR + CLOTH(cloak/hood) + ACCENT(collar/trim). Cosmetic only — ZERO gameplay.

Adapted from gen_obito_creative.py. KEY DIFFERENCES from Obito (who is UNMASKED):
  * Tobi IS masked → the saturated-orange spiral is the MASK region and IS recoloured (Obito protects
    his exposed face skin and never paints it; here the "head warm" pixels are the mask, not skin).
  * Tobi's HAIR and CLOAK are BOTH near-black, so they can't be split by hue — split by POSITION:
    head-zone interior-black = HAIR, body-zone interior-black = CLOTH (cloak). Boundary near-black is
    OUTLINE (line-art guard, kept) via 4-neighbour erosion.
  * The purple collar trim = ACCENT (Tobi's only saturated non-mask detail).

REGIONS (classified ONCE from ORIGINAL pixels; bottom-aligned sheets → head at TOP):
  * OUTLINE — near-black on a boundary (adjacent to a different region / transparent) → kept near-black.
  * HAIR    — interior near-black in the HEAD zone (spiky mane).            [recoloured]
  * MASK    — saturated warm (orange spiral) in the HEAD zone, s>=0.44.     [recoloured]
  * CLOTH   — interior near-black in the BODY zone (the cloak/hood) + warm-desaturated robe pixels.
  * ACCENT  — the purple collar (saturated purple) + light warm/neutral trim (sandal edging).

paint(): tone-preserve — re-centre a region on the target hue/value keeping its own light/dark SPREAD
(multi-tone shading kept). A per-region floor keeps dark targets above the near-black outline.

USAGE: gen_tobi_creative.py [tag|all|group1|group2|group3|celestial]
"""
import os, sys, colorsys, re
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HEAD_FRAC = 0.40   # top fraction of content rows = head zone (mask + hair live here)
HAIR_FRAC = 0.30   # interior-black above this = HAIR; below = CLOAK

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); return h*360, s, v
def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

# region tuple = (hex, to_sat, floor, spread)  ·  None = keep natural
SKINS = {
 # ---- GROUP 1 (Beyblade-inspired) ----
 "miragedragon": dict(mask=("#6A2EB0",0.60,0.32,1.14), hair=("#141414",0.10,0.05,1.10), cloth=("#1E1030",0.55,0.09,1.06), accent=("#2ED0C8",0.72,0.56,1.18)),  # deep purple-black cloak / black hair / teal-cyan accent / violet mask
 "winningvalor": dict(mask=("#CDE6F2",0.14,0.80,1.20), hair=("#DCE6EE",0.05,0.76,1.20), cloth=("#AAC8E8",0.32,0.64,1.15), accent=("#22C8E8",0.78,0.62,1.18)),  # BRIGHT cool blue-white cloak / silver-white hair / bright cyan accent (angelic contrast)
 "sovereignwyrm":dict(mask=("#B01E1E",0.80,0.40,1.14), hair=("#141414",0.10,0.05,1.10), cloth=("#161014",0.30,0.06,1.05), accent=("#C0302E",0.74,0.42,1.16)),  # near-black cloak / black hair / deep crimson accent + mask (dragon-king)
 "omnitrix":     dict(mask=("#3FA83B",0.68,0.34,1.15), hair=("#141414",0.10,0.05,1.10), cloth=("#17171E",0.14,0.09,1.05), accent=("#ECECEC",0.03,0.72,1.20)),  # Ben10 homage — green mask / black hair / black cloak / white accent (matches Obito treatment)
 # ---- GROUP 2 ----
 "albedo":       dict(mask=("#EDEDED",0.04,0.74,1.20), hair=("#E8E8E8",0.04,0.70,1.20), cloth=("#8E1B22",0.62,0.16,1.12), accent=("#D9A93A",0.70,0.42,1.18)),  # Albedo inverted homage — white mask+hair / deep-red cloak / gold accent (matches Obito treatment)
 "crimsoneye":   dict(mask=("#D01E1E",0.84,0.46,1.15), hair=("#141414",0.10,0.05,1.10), cloth=("#4A1016",0.60,0.11,1.08), accent=("#C0302E",0.70,0.40,1.16)),  # deep-red cloak / black hair / vivid red mask (eye-glow focal)
 "cobalt":       dict(mask=("#1E3A8E",0.74,0.34,1.14), hair=("#141414",0.10,0.05,1.10), cloth=("#161B30",0.50,0.10,1.06), accent=("#B8BEC8",0.08,0.60,1.18)),  # deep-blue cloak / black hair / silver accent / blue mask
 "ashenwraith":  dict(mask=("#8A8A8A",0.05,0.44,1.16), hair=("#7C7C7C",0.04,0.34,1.14), cloth=("#2E2E33",0.10,0.12,1.06), accent=("#7A2222",0.66,0.30,1.14)),  # muted gray cloak+hair / dark-red accent (desaturated, battle-worn)
 # ---- GROUP 3 ----
 "golden":       dict(mask=("#E0A81E",0.82,0.46,1.18), hair=("#141414",0.10,0.05,1.10), cloth=("#18181E",0.14,0.09,1.05), accent=("#E4C63A",0.80,0.48,1.18)),  # rich gold accent+mask / black hair / black cloak
 "teal":         dict(mask=("#0E8E8E",0.78,0.36,1.15), hair=("#141414",0.10,0.05,1.10), cloth=("#0E3232",0.52,0.09,1.07), accent=("#B8BEC8",0.08,0.60,1.18)),  # deep-teal cloak / black hair / silver accent / teal mask
 "amethyst":     dict(mask=("#8A3ED0",0.62,0.40,1.16), hair=("#141414",0.10,0.05,1.10), cloth=("#3A1E66",0.58,0.15,1.14), accent=("#B06CE0",0.56,0.50,1.18)),  # BRIGHT violet cloak (distinct from miragedragon) / black hair / violet accent+mask
 "sunfire":      dict(mask=("#C24A0E",0.86,0.44,1.16), hair=("#141414",0.10,0.05,1.10), cloth=("#18181E",0.14,0.09,1.05), accent=("#E0781C",0.86,0.48,1.18)),  # burnt-orange accent+mask (natural eye-glow tie) / black hair / black cloak
 # ---- FINAL — Celestial Veil (LIGHT pastel cosmic; procedural overlay in game.js) ----
 "celestial":    dict(mask=("#E6DEF2",0.12,0.82,1.20), hair=("#E4DCEE",0.06,0.76,1.20), cloth=("#E2D6F0",0.16,0.70,1.18), accent=("#F2D8E4",0.16,0.80,1.18)),  # soft pale lavender-white base / pale-pink accent (+ pastel-star overlay)
}
GROUPS = { "group1": ["miragedragon","winningvalor","sovereignwyrm","omnitrix"],
           "group2": ["albedo","crimsoneye","cobalt","ashenwraith"],
           "group3": ["golden","teal","amethyst","sunfire"],
           "celestial": ["celestial"] }

def classify(px, W, H):
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] >= 128]
    if not ys: return set(), set(), set(), set(), set()
    ymin, ymax = min(ys), max(ys)
    head_cut = ymin + HEAD_FRAC * (ymax - ymin)
    hair_cut = ymin + HAIR_FRAC * (ymax - ymin)
    BLACK, HAIRZ, MASK, CLOTH, ACCENT = set(), set(), set(), set(), set()
    for y in range(H):
        head = y <= head_cut
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            if v <= 0.14:
                BLACK.add((x, y))                                             # split later: hair (head) / cloak (body) / outline
            elif 200 <= h <= 300 and s >= 0.18:
                ACCENT.add((x, y))                                            # purple collar trim
            elif (h <= 45 or h >= 345):
                if head and s >= 0.44 and v >= 0.45 and 8 <= h <= 45:
                    MASK.add((x, y))                                          # orange spiral mask
                elif s < 0.18 and v >= 0.45:
                    ACCENT.add((x, y))                                        # light warm trim (sandal edge)
                else:
                    CLOTH.add((x, y))                                         # warm-desaturated robe
            elif s < 0.18 and 0.42 <= v <= 0.92:
                ACCENT.add((x, y))                                            # neutral light trim
            elif s < 0.20 and 0.14 < v <= 0.42:
                CLOTH.add((x, y))                                             # neutral mid shading
            # else → protected
    # SPATIAL black split: interior near-black → HAIR (head zone) or CLOTH (cloak); boundary → OUTLINE
    hair, cloak, outline = set(), set(), set()
    for (x, y) in BLACK:
        interior = ((x+1, y) in BLACK and (x-1, y) in BLACK and (x, y+1) in BLACK and (x, y-1) in BLACK)
        if not interior:
            outline.add((x, y))
        elif y <= hair_cut:
            hair.add((x, y))
        else:
            cloak.add((x, y))
    HAIR = HAIRZ | hair
    CLOTH = CLOTH | cloak
    return outline, HAIR, MASK, CLOTH, ACCENT

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
    OUTLINE, HAIR, MASK, CLOTH, ACCENT = classify(px, W, H)
    n = 0
    n += paint(px, CLOTH,  cfg["cloth"])
    n += paint(px, HAIR,   cfg["hair"])
    n += paint(px, MASK,   cfg["mask"])
    n += paint(px, ACCENT, cfg["accent"])
    return img, n, dict(mask=len(MASK), hair=len(HAIR), cloth=len(CLOTH), accent=len(ACCENT), outline=len(OUTLINE))

def targets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    sheets = set(re.findall(r'sheet:\s*"\./(masked_man[\w:.+-]+_uniform\.png)"', src))
    body = {s for s in sheets if "__" not in s}                              # animationData body sheets only (FX/projectiles aren't here)
    return sorted(body | {"tobi_portrait.png"})

def build(tag):
    cfg = SKINS[tag]; total = 0; last = {}
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n, counts = recolor(p, cfg)
        img.save(p[:-4] + f"__{tag}.png"); total += n
        if name == "masked_man_idle_uniform.png": last = counts
    print(f"  {tag:14} total={total}px  (idle: {last})")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "all": tags = list(SKINS)
    elif arg in GROUPS: tags = GROUPS[arg]
    else: tags = arg.split(",")
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
