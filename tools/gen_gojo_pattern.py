#!/usr/bin/env python3
"""Gojo Satoru — 4 PROCEDURAL-PATTERN skins (ADDITIVE; his Infinity Void already exists — NOT rebuilt).
Same technique proven on the Red Ranger / Tobi / Obito pilots: the OUTFIT (black top) gets a multi-colour
PATTERN (target colour = f(pixel position)); HAIR + EYES get coordinated flat colours (all three regions
vary per skin — the head-to-toe coordination standard of his 20+ skin batch). Face/skin never touched.

Region selection replicates gen_gojo_creative.py's PER-FRAME hue-band / yband selectors EXACTLY
(EYES cyan head-band · HAIR near-gray top-band · SHIRT dark torso-band), so masks match his existing skins.
Patterns anchored to each frame's silhouette bbox → frame-stable. Line-art guard (outline stays dark).

Patterns: GRADIENT LIMITLESS · HARLEQUIN SORCERER · CIRCUIT BARRIER · CHEVRON STRIKE.
"""
import os, sys, colorsys, re, math
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); return h*360, s, v
def hex2rgb(x):
    x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const gojo = {"); rest = src[i+13:]
    j = i+13 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]; w = {}
    for m in re.finditer(r'width:\s*(\d+)[^}]*?sheet:\s*"\./(gojo_[^"]+)"', block):
        w.setdefault(m.group(2), int(m.group(1)))
    return sorted(w.items())

# ── flat tone-preserve paint (hair/eyes) — cfg = (hex, to_sat, floor, spread) ──
def paint(cpx, pts, cfg):
    if not pts: return 0
    hexc, to_sat, floor, spread = cfg
    tr, tg, tb = hex2rgb(hexc); th, _s, tv = hsv(tr, tg, tb); th /= 360
    vals = [hsv(*cpx[x, y][:3])[2] for (x, y) in pts]; pivot = sum(vals)/len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, to_sat, nv)
        cpx[x, y] = (round(nr*255), round(ng*255), round(nb*255), cpx[x, y][3])
    return len(pts)

# ── pattern paint (outfit) — target colour = f(REGION-local x, y) so the pattern spans + tracks the
#    shirt itself (a gradient covers the full top; periodic patterns anchor to the garment, frame-stable) ──
def paint_pattern(cpx, pts, cw, chh, pick, spread=1.25, floor=0.12):
    if not pts: return 0
    xs = [x for x, y in pts]; ys = [y for x, y in pts]
    xmin, ymin = min(xs), min(ys); rw = max(1, max(xs)-xmin+1); rh = max(1, max(ys)-ymin+1)
    vals = {(x, y): hsv(*cpx[x, y][:3])[2] for (x, y) in pts}; pivot = sum(vals.values())/len(vals)
    for (x, y) in pts:
        th, ts, tv = hsv(*hex2rgb(pick(x-xmin, y-ymin, rw, rh))); th /= 360
        nv = max(floor, min(1.0, tv + (vals[(x, y)] - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        cpx[x, y] = (round(nr*255), round(ng*255), round(nb*255), cpx[x, y][3])
    return len(pts)

# ── pattern pickers ──
def lerp_hex(a, b, t):
    ar, ag, ab = hex2rgb(a); br, bg, bb = hex2rgb(b)
    return "#%02x%02x%02x" % (round(ar+(br-ar)*t), round(ag+(bg-ag)*t), round(ab+(bb-ab)*t))
def hash01(a, b):
    n = ((int(a)*73856093) ^ (int(b)*19349663)) & 0xffffffff; return n/0xffffffff
def p_gradient(A, B):
    return lambda cx, y, fw, H: lerp_hex(A, B, min(1.0, y/max(1, H-1)))
def p_diamond(A, B, d=6):
    return lambda cx, y, fw, H: A if (((cx+y)//d) + ((cx-y)//d)) % 2 == 0 else B
def p_chevron(A, B, w=5):
    return lambda cx, y, fw, H: A if ((y + abs(cx - fw//2)) // w) % 2 == 0 else B
def p_circuit(base, trace, node, sp=6, dens=0.42):
    def pick(cx, y, fw, H):
        on_v = (cx % sp == 0); on_h = (y % sp == 0); gx, gy = cx//sp, y//sp
        lv = on_v and hash01(gx, gy*7+3) < dens; lh = on_h and hash01(gx*7+3, gy) < dens
        if lv and lh: return node
        if lv or lh: return trace
        return base
    return pick

# EYES/HAIR = flat (hex, to_sat, floor, spread); OUTFIT = (picker, spread, floor)
SKINS = {
 # 1 GRADIENT LIMITLESS — smooth cyan→violet outfit; pale-cyan hair, cyan eyes
 "gojoGradientLimitless": dict(outfit=(p_gradient("#3fd0ec", "#5a2ea0"), 1.35, 0.14),
     hair=("#bfe8f4",0.16,0.62,1.18), eyes=("#3fd0ec",0.72,0.60,1.0)),
 # 2 HARLEQUIN SORCERER — cyan / magenta diamond checker (playful trickster); white hair, gold eyes
 "gojoHarlequinSorcerer": dict(outfit=(p_diamond("#2ec8e0", "#e0489a", 6), 1.3, 0.14),
     hair=("#e6e6ee",0.05,0.66,1.18), eyes=("#f0c040",0.80,0.60,1.0)),
 # 3 CIRCUIT BARRIER — deep-navy base + sparse cyan traces + bright nodes (Infinity/barrier tech); silver hair, cyan eyes
 "gojoCircuitBarrier": dict(outfit=(p_circuit("#14203a", "#3fe0ea", "#cffcff", 6, 0.42), 1.15, 0.12),
     hair=("#c6d0dc",0.10,0.60,1.18), eyes=("#3fe0ea",0.74,0.60,1.0)),
 # 4 CHEVRON STRIKE — bold cyan / charcoal V-chevrons; cyan-white hair, cyan eyes
 "gojoChevronStrike": dict(outfit=(p_chevron("#2ec8e0", "#1a1a26", 5), 1.3, 0.10),
     hair=("#d4eef6",0.14,0.62,1.18), eyes=("#2ec8e0",0.72,0.60,1.0)),
}

def recolor(path, tag, cfg, cell_w):
    img = Image.open(path).convert("RGBA"); W, H = img.size
    n = max(1, W // cell_w); total = 0
    pick, osp, ofl = cfg["outfit"]
    for i in range(n):
        box = (i*cell_w, 0, (i+1)*cell_w, H)
        frame = img.crop(box); bb = frame.getbbox()
        if bb is None: continue
        content = frame.crop(bb); cpx = content.load(); cw, chh = content.size
        eyes, hair, shirt = set(), set(), set()
        for y in range(chh):
            ny = y / max(1, chh-1)
            for x in range(cw):
                r, g, b, a = cpx[x, y]
                if a < 128: continue
                h, s, v = hsv(r, g, b); warm = r - b
                if 150 <= h <= 205 and s >= 0.40 and v >= 0.55 and ny <= 0.42: eyes.add((x, y))
                elif s <= 0.24 and v >= 0.30 and warm <= 16 and ny <= 0.34: hair.add((x, y))
                elif v <= 0.30 and warm <= 40 and 0.30 <= ny <= 0.60: shirt.add((x, y))
        total += paint_pattern(cpx, shirt, cw, chh, pick, osp, ofl)
        total += paint(cpx, hair, cfg["hair"])
        total += paint(cpx, eyes, cfg["eyes"])
        frame.paste(content, (bb[0], bb[1])); img.paste(frame, box)
    img.save(path[:-4] + f"__{tag}.png")
    return total

def build(tag, only=None):
    cfg = SKINS[tag]; total = 0
    sheets = wired_sheets()
    for name, cw in sheets:
        if only and only not in name: continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP {name}"); continue
        total += recolor(p, tag, cfg, cw)
    # portrait (single frame — treat whole image as one cell)
    if not only:
        pp = os.path.join(ROOT, "gojo_portrait.png")
        if os.path.exists(pp):
            total += recolor(pp, tag, cfg, Image.open(pp).width)
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = sys.argv[2] if len(sys.argv) > 2 else None
    for t in (list(SKINS) if tag == "all" else [tag]):
        print(f"=== {t} ==="); build(t, only)

if __name__ == "__main__":
    main()
