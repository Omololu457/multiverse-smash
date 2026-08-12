#!/usr/bin/env python3
"""Toji Fushiguro — 4 PROCEDURAL-PATTERN skins (ADDITIVE; his Void Killer already exists — NOT rebuilt).
Same technique proven on the Red Ranger / Tobi / Obito / Gojo pilots: the OUTFIT (tank top + pants, painted
as ONE region so the pattern runs continuously head-to-toe) gets a multi-colour PATTERN (target colour =
f(pixel position)); HAIR gets a coordinated flat colour. Skin is PROTECTED. Line-art guard (outline kept),
tone-preserve shading, cell-local x-anchoring (x % frame_width) for frame-stability. Cosmetic only.

Region classification is Toji's OWN (HAIR/TANK/PANTS spatial split) — copied verbatim from
gen_toji_creative.py so the masks match his existing skins.

Patterns: STRIPE MERCENARY (bold straight stripes) · SHATTERED BLADE (Voronoi fracture, battle-worn) ·
SCALE MAIL (fine scale micro-texture) · MARBLED VETERAN (mottled marble, weathered).
"""
import os, sys, colorsys, re, math
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HAIR_FRAC = 0.27; TANK_FRAC = 0.58

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); return h*360, s, v
def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

# ── region classification (verbatim from gen_toji_creative.py) ──
def classify(px, W, H):
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] >= 128]
    if not ys: return set(), set(), set(), set()
    ymin, ymax = min(ys), max(ys)
    hair_cut = ymin + HAIR_FRAC * (ymax - ymin); tank_cut = ymin + TANK_FRAC * (ymax - ymin)
    DARK, PANTS = set(), set()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = hsv(r, g, b)
            if (h <= 45 or h >= 345) and 0.22 <= s <= 0.78 and v >= 0.50: continue   # skin (protected)
            if v <= 0.18 or (v <= 0.42 and s >= 0.18 and 262 <= h <= 340): DARK.add((x, y)); continue
            if s <= 0.16 and v >= 0.28 and y > hair_cut: PANTS.add((x, y)); continue
    hair, tank, outline = set(), set(), set()
    for (x, y) in DARK:
        ndark = ((x+1, y) in DARK) + ((x-1, y) in DARK) + ((x, y+1) in DARK) + ((x, y-1) in DARK)
        if ndark < 3: outline.add((x, y))
        elif y <= hair_cut: hair.add((x, y))
        elif y <= tank_cut: tank.add((x, y))
        else: PANTS.add((x, y))
    return outline, hair, tank, PANTS

def paint(px, pts, cfg):
    if not pts or cfg is None: return 0
    hexcol, to_sat, floor, spread = cfg
    tr, tg, tb = hex2rgb(hexcol); th, _s, tv = hsv(tr, tg, tb); th /= 360
    vals = [hsv(px[x, y][0], px[x, y][1], px[x, y][2])[2] for (x, y) in pts]; pivot = sum(vals)/len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, to_sat, nv)
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

# ── pattern paint (outfit) — cell-local x (x % fw) for frame-stability; LOW spread so the pattern reads
#    uniformly across the black-tank + white-pants (not a dark-top/bright-bottom value ramp) ──
def paint_pattern(px, pts, fw, H, pick, spread=0.5, floor=0.12):
    if not pts: return 0
    vals = {(x, y): hsv(px[x, y][0], px[x, y][1], px[x, y][2])[2] for (x, y) in pts}
    pivot = sum(vals.values())/len(vals)
    for (x, y) in pts:
        th, ts, tv = hsv(*hex2rgb(pick(x % fw, y, fw, H))); th /= 360
        nv = max(floor, min(1.0, tv + (vals[(x, y)] - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

# ── pattern pickers ──
def hash01(a, b):
    n = ((int(a)*73856093) ^ (int(b)*19349663)) & 0xffffffff; return n/0xffffffff
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
def p_marble(colors):
    def pick(cx, y, fw, H):
        n = _vnoise(cx, y, 7, 1)*0.62 + _vnoise(cx, y, 3, 5)*0.38
        n = (n + 0.14*math.sin(n*12.566)) % 1.0
        return colors[min(len(colors)-1, int(n*len(colors)))]
    return pick

# outfit = (picker, spread, floor); hair = (hex, to_sat, floor, spread)
SKINS = {
 # 1 STRIPE MERCENARY — bold crimson / charcoal straight stripes; black hair
 "tojiStripeMercenary": dict(outfit=(p_stripes("#9e2028", "#20222c", 6), 0.55, 0.10),
     hair=("#161616",0.10,0.05,1.08)),
 # 2 SHATTERED BLADE — gunmetal facets + bright steel-blue crack lines (battle-worn blade); dark-steel hair
 "tojiShatteredBlade": dict(outfit=(p_shatter("#2e323c", "#41454f", "#8fbcd6", 13, 1.5), 0.6, 0.11),
     hair=("#20242c",0.14,0.10,1.08)),
 # 3 SCALE MAIL — dense gunmetal dragon-scale micro-texture (armored); dark hair
 "tojiScaleMail": dict(outfit=(p_scales("#3a3e48", "#6a7080", "#181a20", 5, 4), 0.62, 0.10),
     hair=("#1a1a20",0.10,0.07,1.08)),
 # 4 MARBLED VETERAN — mottled weathered olive-drab marble; dark-olive hair
 "tojiMarbledVeteran": dict(outfit=(p_marble(["#33361f", "#4c5030", "#6c7048", "#8a8e62"]), 0.6, 0.12),
     hair=("#1e1e16",0.14,0.08,1.08)),
}

def targets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const toji = {"); j = src.index("// KASUMI MIWA", i)
    sheets = set(re.findall(r'sheet:\s*"\./(toji_[\w]+_uniform\.png)"', src[i:j]))
    widths = {}
    for m in re.finditer(r'width:\s*(\d+)[^}]*?sheet:\s*"\./(toji_[a-z0-9_]+\.png)"', src[i:j]):
        widths.setdefault(m.group(2), int(m.group(1)))
    return sorted(sheets | {"toji_portrait.png"}), widths

def recolor(path, tag, cfg, fw):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    OUTLINE, HAIR, TANK, PANTS = classify(px, W, H)
    pick, sp, fl = cfg["outfit"]
    n = paint_pattern(px, TANK | PANTS, fw if fw else W, H, pick, sp, fl)   # tank+pants = one continuous outfit
    n += paint(px, HAIR, cfg["hair"])
    img.save(path[:-4] + f"__{tag}.png")
    return n

def build(tag, only=None):
    cfg = SKINS[tag]; sheets, widths = targets(); total = 0
    for name in sheets:
        if only and only not in name: continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP {name}"); continue
        total += recolor(p, tag, cfg, widths.get(name, 0))
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = sys.argv[2] if len(sys.argv) > 2 else None
    for t in (list(SKINS) if tag == "all" else [tag]):
        print(f"=== {t} ==="); build(t, only)

if __name__ == "__main__":
    main()
