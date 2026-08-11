#!/usr/bin/env python3
"""Pain / Nagato's Deva Path — 12 creative alt-skins (incl. Ben 10 "Omnitrix" + "Albedo" homages and
2 Beyblade-color skins), FOUR coordinated recolor regions: HAIR + CLOAK(base) + CLOUDS(the Akatsuki
red-cloud pattern, a genuinely separable accent) + ACCENT(dark metal piercings/rods). Cosmetic only —
ZERO gameplay. Adapted from gen_tobi_creative.py (same Akatsuki cloak, same universe).

KEY DIFFERENCES from Tobi:
  * Pain's HAIR is a saturated RED-ORANGE (not near-black) → it shares Pain's RED hue family with the
    cloud pattern, so HAIR vs CLOUDS split by POSITION: warm-saturated in the TOP head zone = HAIR,
    warm-saturated in the BODY zone = CLOUDS.
  * CLOAK base = near-black interior (boundary near-black = OUTLINE, kept via 4-neighbour erosion).
  * ACCENT = the DARK metal (piercings / chakra rods): low-sat, MID-LOW value. The PALE face (Rinnegan)
    is high-value gray and is PROTECTED (never painted) so the character's identity face stays intact.

paint(): tone-preserve — re-centre a region on the target hue/value keeping its own light/dark SPREAD
(multi-tone shading kept). A per-region floor keeps dark targets above the near-black outline.

USAGE: gen_pain_creative.py [tag|all|group1|group2|group3|mask <tag>]
"""
import os, sys, colorsys, re
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HAIR_FRAC = 0.28   # top fraction of content rows = head zone (warm-sat above = HAIR; below = CLOUDS)

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); return h*360, s, v
def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def warm_sat(h, s, v):
    return (h >= 335 or h <= 45) and s >= 0.50 and v >= 0.22

# region tuple = (hex, to_sat, floor, spread)  ·  None = keep natural
SKINS = {
 # ---- GROUP 1 — Ben10 homages + 2 Beyblade-color skins ----
 "omnitrix":      dict(hair=("#3FA83B",0.66,0.34,1.12), cloak=("#141418",0.12,0.05,1.06), clouds=("#3FA83B",0.70,0.40,1.14), accent=("#ECECEC",0.04,0.66,1.18)),  # Ben10 — green hair+clouds / black cloak / white accent
 "albedo":        dict(hair=("#EDEDED",0.04,0.72,1.20), cloak=("#8E1B22",0.60,0.15,1.10), clouds=("#EDEDED",0.05,0.74,1.18), accent=("#D9A93A",0.70,0.44,1.16)),  # Albedo inverted — white hair+clouds / deep-red cloak / gold accent
 "royalvalkyrie": dict(hair=("#1E45C8",0.74,0.40,1.14), cloak=("#141418",0.12,0.05,1.06), clouds=("#E4C63A",0.82,0.52,1.16), accent=("#D8DEE8",0.06,0.64,1.18)),  # Beyblade blue/gold — royal-blue hair / black cloak / gold-yellow clouds / silver trim
 "miragewyrm":    dict(hair=("#2A1E5A",0.62,0.22,1.12), cloak=("#141418",0.12,0.05,1.06), clouds=("#2ED0C8",0.72,0.56,1.16), accent=("#B01E1E",0.80,0.40,1.14)),  # Beyblade navy/teal — navy-purple hair / black cloak / teal-cyan clouds / deep-red gem accent
 # ---- GROUP 2 ----
 "crimsonrinnegan":dict(hair=("#B0181C",0.82,0.42,1.14), cloak=("#141418",0.12,0.05,1.06), clouds=("#171418",0.20,0.06,1.05), accent=("#D01E1E",0.84,0.46,1.15)),  # crimson hair / black cloak / BLACK clouds (inverted) / vivid red piercings
 "cobaltpath":    dict(hair=("#1E3A8E",0.74,0.36,1.14), cloak=("#141418",0.12,0.05,1.06), clouds=("#C0C6D0",0.08,0.62,1.18), accent=("#B8BEC8",0.08,0.58,1.16)),  # deep-blue hair / black cloak / silver clouds
 "emeralddeva":   dict(hair=("#177A3A",0.72,0.34,1.14), cloak=("#141418",0.12,0.05,1.06), clouds=("#E4C63A",0.82,0.50,1.16), accent=("#E0C84A",0.60,0.50,1.14)),  # deep-green hair / black cloak / gold clouds
 "amethystpath":  dict(hair=("#5A2A9E",0.66,0.34,1.14), cloak=("#141418",0.12,0.05,1.06), clouds=("#B06CE0",0.58,0.54,1.16), accent=("#B06CE0",0.50,0.50,1.14)),  # deep-purple hair / black cloak / violet clouds
 # ---- GROUP 3 ----
 "ashendeva":     dict(hair=("#8A8A8A",0.05,0.44,1.14), cloak=("#26262A",0.10,0.11,1.05), clouds=("#7A2A22",0.55,0.28,1.12), accent=("#6A2A22",0.50,0.28,1.12)),  # muted-gray hair / charcoal cloak / dried-blood-red clouds (desaturated)
 "goldenrikudou": dict(hair=("#E0A81E",0.82,0.46,1.16), cloak=("#141418",0.12,0.05,1.06), clouds=("#E4C63A",0.82,0.52,1.16), accent=("#ECECEC",0.04,0.68,1.18)),  # rich gold hair+clouds / black cloak / white accent (regal)
 "ivorypath":     dict(hair=("#ECECEC",0.04,0.74,1.20), cloak=("#DADCE0",0.05,0.66,1.16), clouds=("#171418",0.20,0.06,1.05), accent=("#C8CAD0",0.05,0.58,1.14)),  # pale hair / white cloak / BLACK clouds (clean inversion)
 # ---- FINAL — Void Path (near-black base; procedural red-particle overlay in game.js) ----
 "voidpath":      dict(hair=("#141216",0.12,0.05,1.06), cloak=("#111014",0.10,0.04,1.05), clouds=("#181016",0.18,0.05,1.05), accent=("#3A0E12",0.55,0.11,1.08)),  # unified near-black hair+cloak+clouds / faint red accent (+ drifting red particles overlay)
}
GROUPS = { "group1": ["omnitrix","albedo","royalvalkyrie","miragewyrm"],
           "group2": ["crimsonrinnegan","cobaltpath","emeralddeva","amethystpath"],
           "group3": ["ashendeva","goldenrikudou","ivorypath","voidpath"] }

def classify(px, W, H):
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] >= 128]
    if not ys: return set(), set(), set(), set(), set()
    ymin, ymax = min(ys), max(ys)
    hair_cut = ymin + HAIR_FRAC * (ymax - ymin)
    BLACK, HAIR, CLOUDS, ACCENT = set(), set(), set(), set()
    for y in range(H):
        top = y <= hair_cut
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            if warm_sat(h, s, v):
                (HAIR if top else CLOUDS).add((x, y))   # red-orange: hair (top) vs cloud pattern (body)
            elif v <= 0.15 or (s < 0.34 and v <= 0.48):
                BLACK.add((x, y))                       # cloak base — near-black + its bluish-gray MID-TONE shading (one coordinated region)
            # else → protected (pale face / Rinnegan / warm skin / neutral highlights, v > 0.48)
    # near-black split: interior → CLOAK ; hard boundary near-black → OUTLINE (line-art guard).
    # only the DARKEST edge pixels are kept as outline; the mid-tone cloak greys recolor with the base.
    cloak, outline = set(), set()
    for (x, y) in BLACK:
        r, g, b, a = px[x, y]; _h, _s, vv = hsv(r, g, b)
        interior = ((x+1, y) in BLACK and (x-1, y) in BLACK and (x, y+1) in BLACK and (x, y-1) in BLACK)
        if (not interior) and vv <= 0.15:
            outline.add((x, y))
        else:
            cloak.add((x, y))
    return outline, HAIR, cloak, CLOUDS, ACCENT

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
    OUTLINE, HAIR, CLOAK, CLOUDS, ACCENT = classify(px, W, H)
    n = 0
    n += paint(px, CLOAK,  cfg["cloak"])
    n += paint(px, CLOUDS, cfg["clouds"])
    n += paint(px, HAIR,   cfg["hair"])
    n += paint(px, ACCENT, cfg["accent"])
    return img, n, dict(hair=len(HAIR), cloak=len(CLOAK), clouds=len(CLOUDS), accent=len(ACCENT), outline=len(OUTLINE))

# ── MASK DEBUG — color-code every region so classification can be eyeballed before generating skins ──
MASK_COLORS = {"HAIR":(255,80,80), "CLOAK":(60,60,70), "CLOUDS":(80,160,255), "ACCENT":(255,220,60), "OUTLINE":(0,0,0)}
def mask_image(path):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    OUTLINE, HAIR, CLOAK, CLOUDS, ACCENT = classify(px, W, H)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); op = out.load()
    for name, pts in [("OUTLINE",OUTLINE),("CLOAK",CLOAK),("CLOUDS",CLOUDS),("HAIR",HAIR),("ACCENT",ACCENT)]:
        c = MASK_COLORS[name]
        for (x, y) in pts: op[x, y] = (c[0], c[1], c[2], 255)
    # protected pixels → faint magenta so we can see what's left untouched (face/neutrals)
    classified = OUTLINE|HAIR|CLOAK|CLOUDS|ACCENT
    for y in range(H):
        for x in range(W):
            if px[x, y][3] >= 128 and (x, y) not in classified:
                op[x, y] = (255, 0, 255, 120)
    return out

def targets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    # Pain's animationData body sheets (block sheets that start with pain_ and end _uniform.png, no __tag)
    sheets = set(re.findall(r'sheet:\s*"\./(pain_[\w:.+-]*_uniform\.png)"', src))
    body = {s for s in sheets if "__" not in s}
    return sorted(body | {"pain_portrait.png"})

def build(tag):
    cfg = SKINS[tag]; total = 0; last = {}
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n, counts = recolor(p, cfg)
        img.save(p[:-4] + f"__{tag}.png"); total += n
        if name == "pain_idle_uniform.png": last = counts
    print(f"  {tag:16} total={total}px  (idle: {last})")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "mask":
        tag = sys.argv[2] if len(sys.argv) > 2 else "omnitrix"
        for name in ["pain_idle_uniform.png", "pain_chibaku_cast_uniform.png"]:
            m = mask_image(os.path.join(ROOT, name))
            outp = os.path.join(ROOT, "harness", "shots", "mask_" + name)
            m.save(outp); print("mask →", outp)
        return
    if arg == "all": tags = list(SKINS)
    elif arg in GROUPS: tags = GROUPS[arg]
    else: tags = arg.split(",")
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
