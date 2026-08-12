#!/usr/bin/env python3
"""Tobi (masked Obito) — 4 PROCEDURAL-PATTERN skins + 1 Alien-X "KAMUI VOID" skin. ADDITIVE (does not
replace his existing 13 creative skins). Reuses the SAME pattern technique proven on Red Ranger's pilot:
the CLOAK (CLOTH region) gets a multi-colour PATTERN (target colour = f(pixel position)), while MASK / HAIR
/ ACCENT get coordinated flat colours. Same line-art guard (OUTLINE kept near-black) + tone-preserve
shading. Cell-local x-anchoring (x % frame_width) keeps patterns frame-stable; NO new geometry.

Region classification is Tobi's OWN (mask=orange spiral · hair+cloak=near-black split by position · accent=
purple collar) — copied verbatim from gen_tobi_creative.py so the masks are identical.

Patterns: GRADIENT SHADE (smooth) · CHEVRON STRIKE (V-stripes) · SHATTERED VEIL (Voronoi fracture, ties to
Kamui) · SCALE MAIL (fine scale micro-texture). KAMUI VOID = full-form near-black + game.js
drawKamuiVoidOverlay (violet/red particles + Kamui portal swirl-pulses).
"""
import os, sys, colorsys, re, math
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HEAD_FRAC = 0.40; HAIR_FRAC = 0.30

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); return h*360, s, v
def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

# ── region classification (verbatim from gen_tobi_creative.py) ──
def classify(px, W, H):
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] >= 128]
    if not ys: return set(), set(), set(), set(), set()
    ymin, ymax = min(ys), max(ys)
    head_cut = ymin + HEAD_FRAC * (ymax - ymin); hair_cut = ymin + HAIR_FRAC * (ymax - ymin)
    BLACK, HAIRZ, MASK, CLOTH, ACCENT = set(), set(), set(), set(), set()
    for y in range(H):
        head = y <= head_cut
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            if v <= 0.14: BLACK.add((x, y))
            elif 200 <= h <= 300 and s >= 0.18: ACCENT.add((x, y))
            elif (h <= 45 or h >= 345):
                if head and s >= 0.44 and v >= 0.45 and 8 <= h <= 45: MASK.add((x, y))
                elif s < 0.18 and v >= 0.45: ACCENT.add((x, y))
                else: CLOTH.add((x, y))
            elif s < 0.18 and 0.42 <= v <= 0.92: ACCENT.add((x, y))
            elif s < 0.20 and 0.14 < v <= 0.42: CLOTH.add((x, y))
    hair, cloak, outline = set(), set(), set()
    for (x, y) in BLACK:
        interior = ((x+1, y) in BLACK and (x-1, y) in BLACK and (x, y+1) in BLACK and (x, y-1) in BLACK)
        if not interior: outline.add((x, y))
        elif y <= hair_cut: hair.add((x, y))
        else: cloak.add((x, y))
    return outline, (HAIRZ | hair), MASK, (CLOTH | cloak), ACCENT

# ── flat tone-preserve paint (verbatim) ──
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

# ── PATTERN paint (target colour = f(cell-local x, y)); tone-preserve, floor guard ──
def paint_pattern(px, pts, W, H, fw, pick, spread=0.9, floor=0.1):
    if not pts: return 0
    vals = {(x, y): hsv(px[x, y][0], px[x, y][1], px[x, y][2])[2] for (x, y) in pts}
    pivot = sum(vals.values()) / len(vals)
    for (x, y) in pts:
        th, ts, tv = hsv(*hex2rgb(pick(x % fw, y, fw, H))); th /= 360
        nv = max(floor, min(1.0, tv + (vals[(x, y)] - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

# ── pattern pickers (from the Red Ranger pilot) ──
def lerp_hex(a, b, t):
    ar, ag, ab = hex2rgb(a); br, bg, bb = hex2rgb(b)
    return "#%02x%02x%02x" % (round(ar+(br-ar)*t), round(ag+(bg-ag)*t), round(ab+(bb-ab)*t))
def hash01(a, b):
    n = ((int(a)*73856093) ^ (int(b)*19349663)) & 0xffffffff; return n / 0xffffffff
def p_gradient(A, B):
    return lambda cx, y, fw, H: lerp_hex(A, B, min(1.0, y / max(1, H-1)))
def p_chevron(A, B, w=6):
    return lambda cx, y, fw, H: A if ((y + abs(cx - fw//2)) // w) % 2 == 0 else B
def p_scales(base, light, dark, sw=5, sh=4):
    R = sw*0.62; yk = sw/float(sh)
    def pick(cx, y, fw, H):
        row = int(round(y/float(sh))); bd = 1e9; bcy = 0.0
        for rr in (row-1, row, row+1):
            off = (rr % 2)*(sw/2.0); col = round((cx-off)/float(sw)); ccx = col*sw+off; ccy = rr*sh
            d = math.hypot(cx-ccx, (y-ccy)*yk)
            if d < bd: bd, bcy = d, ccy
        if bd > R-0.8: return dark
        return light if (y-bcy) < -R*0.15 else base
    return pick
def p_shatter(faceA, faceB, crack, S=13, cw=1.5):
    def seed(gx, gy): return (gx*S + hash01(gx, gy)*S, gy*S + hash01(gy*3+1, gx*3+1)*S)
    def pick(cx, y, fw, H):
        gx0, gy0 = cx//S, y//S; d1 = d2 = 1e9; near = (gx0, gy0)
        for gx in range(gx0-1, gx0+2):
            for gy in range(gy0-1, gy0+2):
                sx, sy = seed(gx, gy); d = math.hypot(cx-sx, y-sy)
                if d < d1: d2, d1, near = d1, d, (gx, gy)
                elif d < d2: d2 = d
        if (d2-d1) < cw: return crack
        return faceA if hash01(near[0]*5+7, near[1]*5+7) < 0.5 else faceB
    return pick

# ── skins: cloth = (picker, spread, floor); mask/hair/accent = (hex, to_sat, floor, spread) ──
PAT = {
 # 1 GRADIENT SHADE — royal-violet → deep-indigo cloak gradient; violet mask, cyan accent
 "tobiGradientShade": dict(cloth=(p_gradient("#6a2ea0", "#1e2160"), 0.85, 0.10),
     mask=("#7a3ac0",0.60,0.34,1.14), hair=("#141414",0.10,0.05,1.10), accent=("#35d0e0",0.70,0.58,1.18)),
 # 2 CHEVRON STRIKE — burnt-orange / dark-plum V-chevrons; orange mask, gold accent
 "tobiChevronStrike": dict(cloth=(p_chevron("#d0641a", "#2a1830", 6), 0.85, 0.09),
     mask=("#e0781c",0.82,0.44,1.16), hair=("#141414",0.10,0.05,1.10), accent=("#e8b23a",0.80,0.48,1.18)),
 # 3 SHATTERED VEIL — deep-purple facets + glowing Kamui-violet crack lines (reality-warp); magenta accent
 "tobiShatteredVeil": dict(cloth=(p_shatter("#2e1a52", "#40275e", "#c04ce8", 13, 1.5), 0.75, 0.10),
     mask=("#a03ce0",0.62,0.40,1.16), hair=("#141414",0.10,0.05,1.10), accent=("#d060e0",0.58,0.52,1.18)),
 # 4 SCALE MAIL — dense indigo-purple dragon-scale micro-texture; silver accent
 "tobiScaleMail": dict(cloth=(p_scales("#3a2a5e", "#6a5a92", "#180f30", 5, 4), 0.8, 0.09),
     mask=("#5a2e9a",0.66,0.40,1.16), hair=("#141414",0.10,0.05,1.10), accent=("#c0c4cc",0.08,0.60,1.18)),
}
# KAMUI VOID — full-form near-black (Part A); the violet/red particles + Kamui swirl are game.js Part B
VOID = dict(cloth=("#0f0f16",0.06,0.06,0.55), mask=("#141018",0.08,0.06,0.55),
            hair=("#0d0d12",0.06,0.05,0.55), accent=("#181020",0.10,0.07,0.55))

def targets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    body = {s for s in re.findall(r'sheet:\s*"\./(masked_man[\w:.+-]+_uniform\.png)"', src) if "__" not in s}
    widths = {}
    i = src.index("animationData:", src.index("tobi"))
    for m in re.finditer(r'width:\s*(\d+),.*?sheet:\s*"\./(masked_man[a-z0-9_]+\.png)"', src[i:i+8000]):
        widths[m.group(2)] = int(m.group(1))
    return sorted(body | {"tobi_portrait.png"}), widths

def recolor(path, tag, cfg, fw):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    OUTLINE, HAIR, MASK, CLOTH, ACCENT = classify(px, W, H)
    n = 0
    if "cloth" in cfg and callable(cfg["cloth"][0]):
        pick, sp, fl = cfg["cloth"]; n += paint_pattern(px, CLOTH, W, H, fw if fw else W, pick, sp, fl)
    else:
        n += paint(px, CLOTH, cfg["cloth"])
    n += paint(px, HAIR, cfg["hair"]); n += paint(px, MASK, cfg["mask"]); n += paint(px, ACCENT, cfg["accent"])
    img.save(path[:-4] + f"__{tag}.png")
    return n

def build(tag, only=None):
    cfg = PAT[tag] if tag in PAT else VOID
    sheets, widths = targets(); total = 0
    for name in sheets:
        if only and only not in name: continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP {name}"); continue
        total += recolor(p, tag, cfg, widths.get(name, 0))
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = sys.argv[2] if len(sys.argv) > 2 else None
    tags = (list(PAT) + ["tobiKamuiVoid"]) if tag == "all" else [tag]
    for t in tags:
        print(f"=== {t} ==="); build(t, only)

if __name__ == "__main__":
    main()
