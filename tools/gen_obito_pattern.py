#!/usr/bin/env python3
"""Obito Uchiha — 4 PROCEDURAL-PATTERN skins (ADDITIVE; his Void Mask already exists — NOT rebuilt here).
Same technique proven on the Red Ranger / Tobi pilots: the CLOTHING (robe) gets a multi-colour PATTERN
(target colour = f(pixel position)); HAIR + SWORD-ACCENT get coordinated flat colours. The FACE is
PROTECTED exactly like gen_obito_creative.py (this Obito is UNMASKED — the classified 'mask' pixels are
face skin and are never painted). Line-art guard (outline kept), tone-preserve shading, cell-local
x-anchoring for frame-stability. Cosmetic only.

Patterns: STRIPE PROTOCOL (bold straight stripes) · HARLEQUIN MASK (diamond checker) · CIRCUIT EYE (thin
line-work, space-time tech) · MARBLED PHANTOM (mottled marble, intangibility/blur).
"""
import os, sys, colorsys, re, math
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HEAD_FRAC = 0.36

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); return h*360, s, v
def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

# ── region classification + erosion (verbatim from gen_obito_creative.py) ──
def classify(px, W, H):
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] >= 128]
    if not ys: return set(), set(), set(), set(), set()
    ymin, ymax = min(ys), max(ys); head_cut = ymin + HEAD_FRAC * (ymax - ymin)
    BLACK, HAIR, MASK, CLOTH, ACCENT = set(), set(), set(), set(), set()
    for y in range(H):
        head = y <= head_cut
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            if v <= 0.14: BLACK.add((x, y))
            elif 200 <= h <= 300 and s >= 0.18: (HAIR if head else CLOTH).add((x, y))
            elif h <= 45 or h >= 345:
                if head:
                    if s >= 0.44 and v >= 0.45 and 12 <= h <= 45: MASK.add((x, y))   # face skin (protected)
                else:
                    if s < 0.18 and v >= 0.45: ACCENT.add((x, y))
                    else: CLOTH.add((x, y))
            elif s < 0.18 and 0.42 <= v <= 0.92: ACCENT.add((x, y))
            elif s < 0.20 and 0.14 < v <= 0.42: CLOTH.add((x, y))
    return BLACK, HAIR, MASK, CLOTH, ACCENT

def erode(black, extra_hair):
    hair = set(extra_hair)
    for (x, y) in black:
        if ((x+1, y) in black and (x-1, y) in black and (x, y+1) in black and (x, y-1) in black): hair.add((x, y))
    return hair, black - hair

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

# ── pattern pickers ──
def lerp_hex(a, b, t):
    ar, ag, ab = hex2rgb(a); br, bg, bb = hex2rgb(b)
    return "#%02x%02x%02x" % (round(ar+(br-ar)*t), round(ag+(bg-ag)*t), round(ab+(bb-ab)*t))
def hash01(a, b):
    n = ((int(a)*73856093) ^ (int(b)*19349663)) & 0xffffffff; return n / 0xffffffff
def _vnoise(x, y, scale, seed):
    gx, gy = x/scale, y/scale; x0, y0 = math.floor(gx), math.floor(gy); fx, fy = gx-x0, gy-y0
    def hh(a, b):
        n = ((int(a)*73856093) ^ (int(b)*19349663) ^ (seed*83492791)) & 0xffffffff; return n/0xffffffff
    sm = lambda t: t*t*(3-2*t); tx, ty = sm(fx), sm(fy)
    a = hh(x0, y0) + (hh(x0+1, y0)-hh(x0, y0))*tx
    b = hh(x0, y0+1) + (hh(x0+1, y0+1)-hh(x0, y0+1))*tx
    return a + (b-a)*ty
def p_stripes(A, B, w=6):
    return lambda cx, y, fw, H: A if ((cx + y)//w) % 2 == 0 else B
def p_diamond(A, B, d=7):
    return lambda cx, y, fw, H: A if (((cx+y)//d) + ((cx-y)//d)) % 2 == 0 else B
def p_circuit(base, trace, node, sp=7, dens=0.4):
    def pick(cx, y, fw, H):
        on_v = (cx % sp == 0); on_h = (y % sp == 0); gx, gy = cx//sp, y//sp
        lv = on_v and hash01(gx, gy*7+3) < dens; lh = on_h and hash01(gx*7+3, gy) < dens
        if lv and lh: return node
        if lv or lh: return trace
        return base
    return pick
def p_marble(colors):
    def pick(cx, y, fw, H):
        n = _vnoise(cx, y, 7, 1)*0.62 + _vnoise(cx, y, 3, 5)*0.38
        n = (n + 0.14*math.sin(n*12.566)) % 1.0
        return colors[min(len(colors)-1, int(n*len(colors)))]
    return pick

# ── skins: cloth = (picker, spread, floor); hair/sword = (hex, to_sat, floor, spread) ──
PAT = {
 # 1 STRIPE PROTOCOL — bold crimson / dark-slate diagonal stripes; gold accent
 "obitoStripeProtocol": dict(cloth=(p_stripes("#a81e2c", "#20222e", 6), 0.85, 0.09),
     hair=("#161616",0.10,0.06,1.10), sword=("#e8b23a",0.80,0.50,1.18)),
 # 2 HARLEQUIN MASK — crimson / royal-violet diamond checker (Sharingan-red + Kamui-purple); gold accent
 "obitoHarlequinMask": dict(cloth=(p_diamond("#b02038", "#5a2e9a", 7), 0.8, 0.10),
     hair=("#161616",0.10,0.06,1.10), sword=("#e8c24a",0.80,0.50,1.18)),
 # 3 CIRCUIT EYE — deep tech-purple base + sparse Sharingan-red traces + bright nodes; silver accent
 "obitoCircuitEye": dict(cloth=(p_circuit("#201830", "#d83048", "#ff9aa8", 7, 0.4), 0.6, 0.09),
     hair=("#161616",0.10,0.06,1.10), sword=("#b8c2cc",0.08,0.58,1.18)),
 # 4 MARBLED PHANTOM — ghostly desaturated lavender/blue marble (intangibility blur); pale-cyan accent
 "obitoMarbledPhantom": dict(cloth=(p_marble(["#3a4462", "#5a6486", "#8890ac", "#a6acc2"]), 0.7, 0.12),
     hair=("#2a2e3e",0.12,0.10,1.08), sword=("#9fe0e8",0.42,0.60,1.18)),
}

def targets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    body = {s for s in re.findall(r'sheet:\s*"\./(obito[\w:.+-]+_uniform\.png)"', src)
            if "__" not in s and not any(k in s for k in ("juubi", "mokuton", "shur_proj", "giantshur", "portalfx"))}
    widths = {}
    i = src.index("animationData:", src.index("obito ="))
    for m in re.finditer(r'width:\s*(\d+),.*?sheet:\s*"\./(obito[a-z0-9_]+\.png)"', src[i:i+9000]):
        widths[m.group(2)] = int(m.group(1))
    return sorted(body | {"obito_portrait.png"}), widths

def recolor(path, tag, cfg, fw):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    BLACK, HAIR0, MASK, CLOTH, ACCENT = classify(px, W, H)
    HAIR, OUTLINE = erode(BLACK, HAIR0)   # MASK (face) is deliberately NOT painted → face protected
    pick, sp, fl = cfg["cloth"]
    n = paint_pattern(px, CLOTH, W, H, fw if fw else W, pick, sp, fl)
    n += paint(px, HAIR, cfg["hair"]); n += paint(px, ACCENT, cfg["sword"])
    img.save(path[:-4] + f"__{tag}.png")
    return n

def build(tag, only=None):
    cfg = PAT[tag]; sheets, widths = targets(); total = 0
    for name in sheets:
        if only and only not in name: continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP {name}"); continue
        total += recolor(p, tag, cfg, widths.get(name, 0))
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = sys.argv[2] if len(sys.argv) > 2 else None
    for t in (list(PAT) if tag == "all" else [tag]):
        print(f"=== {t} ==="); build(t, only)

if __name__ == "__main__":
    main()
