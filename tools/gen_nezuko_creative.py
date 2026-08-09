#!/usr/bin/env python3
"""Nezuko Kamado — creative alt-skins: HAIR + OUTFIT_MAIN + OUTFIT_ACCENT recolor as ONE coordinated palette
identity per skin (targeted color-replacement, NO hue-rotation). Base health confirmed (only legitimate <1%
transparency gaps; no Gojo/Sukuna dark-key corruption in the recolorable body sheets).

Nezuko's hair AND dark garment are BOTH near-black (unlike Maki's green hair), so hair/accent can't be split
by hue. Instead the near-black DARK region is segmented SPATIALLY (contamination-proof, per-sheet):
  * OUTLINE — near-black pixels touching transparency (boundary strokes) → KEPT (line-art guard, §4).
  * FILL    — interior near-black → connected-components; big components = HAIR (hair + connected black haori),
              small components = OUTFIT_ACCENT (disconnected dark: leggings/tabi/trim).
Colour regions by HSV (classified ONCE from the ORIGINAL pixels, priority order, one class per pixel):
  * MUZZLE  — green bamboo gag → PROTECTED (untouched).
  * SKIN    — pale + warm skin → PROTECTED (untouched; §5, except Void Sovereign #9 which is a separate tool run).
  * MAIN    — pink/coral kimono (+ red accents) → recolour (outfit_main).
paint(): to-tone re-centre on the target hue/sat at the target value, preserving each region's own light/dark
SPREAD (multi-tone kept, §3). `floor` keeps a near-black target above outline-black so it never fuses in.
Cosmetic only — ZERO gameplay/stat changes (§12). Nezuko is NOT the Ghostface exception.

USAGE: gen_nezuko_creative.py [tag | group N | all]     # default: all
"""
import os, sys, re, colorsys
from collections import deque
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HAIR_MIN = 48   # fill connected-component >= this = HAIR (hair+haori); smaller = OUTFIT_ACCENT (leggings/trim)

def classify(h, s, v):
    if 70 <= h <= 175 and s >= 0.22 and v >= 0.18:                 return "MUZZLE"   # green bamboo gag
    if v >= 0.60 and (s < 0.18 or (12 <= h <= 48 and s < 0.55)):   return "SKIN"     # pale white + WARM skin only
    #  (light-pink kimono squares — h~330, s~0.29 — must NOT be grabbed as skin → they fall through to MAIN)
    if (h >= 298 or h <= 14) and s >= 0.28 and v >= 0.28:          return "MAIN"     # pink/coral kimono + red
    if v < 0.35 and s < 0.72:                                      return "DARK"     # hair + haori + leggings + outline
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, hexcol, to_sat, floor, spread):
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, _, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    ts = to_sat
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

def _grids(img):
    px = img.load(); W, H = img.size
    cls = [[None]*W for _ in range(H)]; op = [[False]*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            op[y][x] = True
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            cls[y][x] = classify(h, s, v)
    fill = [[False]*W for _ in range(H)]   # DARK interior (line-art guard: boundary dark = outline, kept)
    for y in range(1, H-1):
        for x in range(1, W-1):
            if cls[y][x] == "DARK" and op[y-1][x] and op[y+1][x] and op[y][x-1] and op[y][x+1]:
                fill[y][x] = True
    return px, W, H, cls, op, fill

def segment(img):
    """Return {MAIN, HAIR, ACCENT} pixel lists. SKIN/MUZZLE/OUTLINE/OTHER untouched."""
    px, W, H, cls, op, fill = _grids(img)
    seen = [[False]*W for _ in range(H)]; hair, accent = [], []
    for y in range(H):
        for x in range(W):
            if not fill[y][x] or seen[y][x]: continue
            comp = []; dq = deque([(y, x)]); seen[y][x] = True
            while dq:
                cy, cx = dq.popleft(); comp.append((cx, cy))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy+dy, cx+dx
                        if 0 <= ny < H and 0 <= nx < W and fill[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True; dq.append((ny, nx))
            (hair if len(comp) >= HAIR_MIN else accent).extend(comp)
    main = [(x, y) for y in range(H) for x in range(W) if cls[y][x] == "MAIN"]
    return {"MAIN": main, "HAIR": hair, "ACCENT": accent}

def segment_umbral(img):
    """Like segment() but split MAIN into EYES (pink/red pixels embedded in the face = mostly SKIN neighbours)
    vs the kimono. Eyes → glowing red; kimono → near-black; skin stays default."""
    seg = segment(img); px, W, H, cls, op, fill = _grids(img)
    eyes, kimono = [], []
    for (x, y) in seg["MAIN"]:
        skinn = sum(1 for dy in (-1,0,1) for dx in (-1,0,1)
                    if (dy or dx) and 0 <= y+dy < H and 0 <= x+dx < W and cls[y+dy][x+dx] == "SKIN")
        (eyes if skinn >= 4 else kimono).append((x, y))
    seg["MAIN"] = kimono; seg["EYES"] = eyes
    return seg

def full_form_pts(img):
    """ALL opaque pixels EXCEPT the near-black boundary outline (kept pure black) → for the full-form recolor."""
    px, W, H, cls, op, fill = _grids(img)
    pts = []
    for y in range(H):
        for x in range(W):
            if not op[y][x]: continue
            if cls[y][x] == "DARK" and not fill[y][x]: continue   # outline stroke → keep black
            pts.append((x, y))
    return pts

# region tuple = (hex, to_sat, floor, spread)
SKINS = {
    # ── GROUP 1 ──
    "emberbloom":  dict(hair=("#2A0E0E", 0.58, 0.09, 1.15), main=("#C4531B", 0.82, 0.30, 1.25), accent=("#2B2B2E", 0.08, 0.11, 1.05)),
    "moonlitvale": dict(hair=("#AEC2E0", 0.26, 0.42, 1.22), main=("#2E2E6B", 0.62, 0.16, 1.22), accent=("#C9CFD7", 0.10, 0.44, 1.05)),
    "wisteriadusk":dict(hair=("#3E2170", 0.64, 0.16, 1.15), main=("#9B6FC9", 0.52, 0.36, 1.22), accent=("#6E2A5A", 0.60, 0.22, 1.05)),
    "verdanthearth":dict(hair=("#1E4D2B", 0.64, 0.14, 1.15), main=("#8AA870", 0.42, 0.38, 1.22), accent=("#CCA33D", 0.72, 0.34, 1.05)),
    # ── GROUP 2 ──
    "frostbound":  dict(hair=("#BCD9F2", 0.30, 0.50, 1.22), main=("#E7EFF7", 0.09, 0.57, 1.25), accent=("#C4CBD4", 0.10, 0.44, 1.05)),
    "goldenember": dict(hair=("#C88A2C", 0.76, 0.33, 1.18), main=("#E8B84E", 0.76, 0.42, 1.22), accent=("#472B16", 0.64, 0.12, 1.05)),
    "nightshade":  dict(hair=("#14141A", 0.08, 0.05, 1.05), main=("#2B1030", 0.58, 0.09, 1.18), accent=("#7E3AD0", 0.64, 0.32, 1.05)),   # hair UNCHANGED black
    "coralreverie":dict(hair=("#D96A9A", 0.52, 0.42, 1.18), main=("#F0836A", 0.62, 0.44, 1.22), accent=("#EFE3C8", 0.16, 0.52, 1.05)),
    # ── GROUP 3 — specialty ──
    # Void Sovereign: FULL-FORM near-black (INCLUDING skin/face, §8) + a procedural ember overlay (game.js
    # drawNezukoVoidEmberOverlay, gated on skinId). Umbral Reflection: inverted doppelganger (skin excluded).
    "voidsovereign": dict(mode="fullform", full=("#0F0F12", 0.16, 0.045, 0.55)),
    "umbral":        dict(mode="umbral", hair=("#ECECEC", 0.04, 0.60, 1.20), main=("#161418", 0.14, 0.06, 1.12),
                          accent=("#E6531C", 0.82, 0.34, 1.08), eyes=("#F01818", 0.90, 0.55, 1.0)),
}
GROUPS = {1: ["emberbloom", "moonlitvale", "wisteriadusk", "verdanthearth"],
          2: ["frostbound", "goldenember", "nightshade", "coralreverie"],
          3: ["voidsovereign", "umbral"]}

def base_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const nezuko = {"); j = i + src[i:].index("export const characters")
    sheets = set(re.findall(r'sheet:\s*"\./(nezuko[a-z0-9_]+\.png)"', src[i:j]))
    return sheets

def targets():
    return sorted(base_sheets() | {"nezuko_portrait.png"})

def recolor(path, cfg):
    img = Image.open(path).convert("RGBA"); px = img.load(); n = 0
    mode = cfg.get("mode", "region")
    if mode == "fullform":                                  # Void Sovereign — whole silhouette near-black (incl. skin)
        hexc, ts, fl, sp = cfg["full"]; n += paint(px, full_form_pts(img), hexc, ts, fl, sp)
    elif mode == "umbral":                                  # inverted doppelganger + glowing red eyes; skin excluded
        seg = segment_umbral(img)
        for key, R in [("hair", "HAIR"), ("main", "MAIN"), ("accent", "ACCENT"), ("eyes", "EYES")]:
            hexc, ts, fl, sp = cfg[key]; n += paint(px, seg[R], hexc, ts, fl, sp)
    else:                                                   # Groups 1-2 — coordinated hair/main/accent
        seg = segment(img)
        for key, R in [("hair", "HAIR"), ("main", "MAIN"), ("accent", "ACCENT")]:
            hexc, ts, fl, sp = cfg[key]; n += paint(px, seg[R], hexc, ts, fl, sp)
    return img, n, {}

def build(tag):
    cfg = SKINS[tag]; total = 0; miss = 0
    for name in targets():
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): miss += 1; continue
        img, n, _ = recolor(p, cfg); img.save(p[:-4] + f"__{tag}.png"); total += n
    print(f"  {tag:14} recolored {total}px across {len(targets())-miss} sheets")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    tags = GROUPS[int(sys.argv[2])] if arg == "group" else (list(SKINS) if arg == "all" else [arg])
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
