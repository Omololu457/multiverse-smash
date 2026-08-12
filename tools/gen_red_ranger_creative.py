#!/usr/bin/env python3
"""Red Ranger (MMPR) — PILOT batch of 4 PROCEDURAL-PATTERN skins (__<tag>.png sheets).

PROOF that the recolor pipeline can do MULTI-COLOR PATTERNS within a region (not just flat fills):
the target colour is a FUNCTION of the pixel's position instead of a constant. Same line-art guard
(masks never select outlines / near-black), same luminance-preserved shading (tone remap around the
region pivot) — so patterns respect the sprite's outline structure and lighting; NO new geometry.

FRAME-STABILITY: patterns are anchored to CELL-LOCAL x (x % frame_width) so the texture reads the same
on every frame instead of drifting with the sheet (the vertical gradient uses y, already body-stable
because frames are bottom-aligned). Coarse feature sizes keep it readable at ~40px sprite scale.

Two Red-Ranger regions (captured from the ORIGINAL pixel):
  * SUIT  — the red suit + helmet: hue<=25 or >=345, sat>=0.25, val>=0.18 (the big pattern canvas).
  * ACCENT— the white belt/gloves/diamonds/mouthplate: sat<0.20, val>=0.42 (coordinated flat colour).
Black outlines + the dark visor (val<0.18) are never touched → readability preserved.

The 4 patterns (deliberately DIVERSE, NOT literal camo): a smooth 2-colour GRADIENT suit, a bold
diagonal STRIPE suit, a mottled/marbled 2-tone suit, and a harlequin DIAMOND suit. Cosmetic only.
"""
import sys, os, re, colorsys, math
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import rgb_hsv, hex2rgb
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def is_suit(h, s, v):   return (h*360 <= 25 or h*360 >= 345) and s >= 0.25 and v >= 0.18
def is_accent(h, s, v): return s < 0.20 and v >= 0.42

def hex2hsv(hx): return rgb_hsv(*hex2rgb(hx))
def lerp_hex(a, b, t):
    ar,ag,ab = hex2rgb(a); br,bg,bb = hex2rgb(b)
    return "#%02x%02x%02x" % (round(ar+(br-ar)*t), round(ag+(bg-ag)*t), round(ab+(bb-ab)*t))
def hash01(a, b):
    n = ((a*73856093) ^ (b*19349663)) & 0xffffffff
    return n / 0xffffffff

# ── pattern pickers: pick(cx, y, fw, H) -> target hex (cx = cell-local x for frame-stability) ──
def p_gradient(A, B):
    return lambda cx, y, fw, H: lerp_hex(A, B, min(1.0, y / max(1, H-1)))
def p_stripes(A, B, w=6):
    return lambda cx, y, fw, H: A if ((cx + y)//w) % 2 == 0 else B
def p_marble(A, B, scale=4):
    return lambda cx, y, fw, H: A if hash01(cx//scale, y//scale) < 0.5 else B
def p_diamond(A, B, d=7):
    return lambda cx, y, fw, H: A if (((cx+y)//d) + ((cx-y)//d)) % 2 == 0 else B

def p_flat(hexc):
    return lambda cx, y, fw, H: hexc   # constant target → flat fill through the pattern pipeline (Void base)

# ── ROUND-2 pattern pickers ──
def _vnoise(x, y, scale, seed):
    # smooth value noise: bilinear-interp a hashed lattice with smoothstep → organic blobs
    gx, gy = x/scale, y/scale
    x0, y0 = math.floor(gx), math.floor(gy); fx, fy = gx-x0, gy-y0
    def h(a, b):
        n = ((int(a)*73856093) ^ (int(b)*19349663) ^ (seed*83492791)) & 0xffffffff
        return n / 0xffffffff
    sm = lambda t: t*t*(3-2*t)
    tx, ty = sm(fx), sm(fy)
    a = h(x0, y0)   + (h(x0+1, y0)   - h(x0, y0))   * tx
    b = h(x0, y0+1) + (h(x0+1, y0+1) - h(x0, y0+1)) * tx
    return a + (b-a) * ty

def p_marbled_steel(colors):
    # 2-octave value noise + a marbled swirl → organic irregular metal patches (weathered steel)
    def pick(cx, y, fw, H):
        n = _vnoise(cx, y, 7, 1)*0.62 + _vnoise(cx, y, 3, 5)*0.38
        n = (n + 0.14*math.sin(n*12.566)) % 1.0
        return colors[min(len(colors)-1, int(n*len(colors)))]
    return pick

def p_circuit(base, trace, node, sp=7, dens=0.42):
    # SPARSE traces on a grid, gated by a hash so most segments are ABSENT and the rest turn/dead-end
    # (reads as circuit traces embedded in the suit, not a full mesh cage); bright nodes only where a live
    # vertical AND horizontal trace meet → sci-fi "morpher tech" texture. dens = fraction of live segments.
    def pick(cx, y, fw, H):
        on_v = (cx % sp == 0); on_h = (y % sp == 0)
        gx, gy = cx//sp, y//sp
        live_v = on_v and hash01(gx, gy*7+3) < dens
        live_h = on_h and hash01(gx*7+3, gy) < dens
        if live_v and live_h: return node
        if live_v or live_h:  return trace
        return base
    return pick

def p_chevron(A, B, w=6):
    # V-shaped chevrons: the stripe boundary bends at the cell centre (|cx - centre|) → nested Vs
    def pick(cx, y, fw, H):
        return A if ((y + abs(cx - fw//2)) // w) % 2 == 0 else B
    return pick

def p_eclipse(deep, bright, band=5.0, dd=3):
    # HARD diagonal split (deep half / bright half) with a HALFTONE-DOT blend ONLY at the seam: across a
    # narrow band the bright-dot fill fraction ramps 0→1 (dots grow), so the two halves interlace like a
    # halftone screen — distinct from a smooth full-body gradient (which lerps everywhere).
    def pick(cx, y, fw, H):
        s = (cx - fw*0.5)*1.5 - (y - H*0.5)          # signed pixel distance to the ~45° diagonal seam
        if s < -band: return deep
        if s >  band: return bright
        frac = (s + band) / (2.0*band)               # 0 (deep side) .. 1 (bright side)
        lx = (cx % dd) - dd/2.0; ly = (y % dd) - dd/2.0
        return bright if (lx*lx + ly*ly) <= frac * (dd*dd*0.5) else deep
    return pick

def p_scales(base, light, dark, sw=5, sh=4):
    # overlapping fish-scale / plate mail: scale centres on a brick-offset grid; each pixel takes the tone
    # of its NEAREST scale centre (Voronoi-ish), with a dark RIM near the scale edge + a light top-cap —
    # a DENSE uniform micro-pattern (the "does fine detail survive at gameplay scale" stress test).
    R = sw * 0.62
    yk = sw / float(sh)     # normalise the y metric so scales read as rounded, not tall ovals
    def pick(cx, y, fw, H):
        row = int(round(y / float(sh)))
        best_d = 1e9; best_cy = 0.0
        for rr in (row-1, row, row+1):
            off = (rr % 2) * (sw/2.0)
            col = round((cx - off) / float(sw))
            ccx = col*sw + off; ccy = rr*sh
            d = math.hypot(cx-ccx, (y-ccy)*yk)
            if d < best_d: best_d, best_cy = d, ccy
        if best_d > R - 0.8: return dark              # dark rim between scales (overlap shadow)
        return light if (y - best_cy) < -R*0.15 else base   # top-cap highlight, then scale body
    return pick

def p_shatter(faceA, faceB, crack, S=11, cw=1.5):
    # Voronoi fracture: nearest jittered seed picks a FACET tone; pixels near a cell boundary (small gap
    # between the two nearest seed distances) become CRACK lines in the accent colour → shattered glass
    def seed(gx, gy):
        return (gx*S + hash01(gx, gy)*S, gy*S + hash01(gy*3+1, gx*3+1)*S)
    def pick(cx, y, fw, H):
        gx0, gy0 = cx//S, y//S
        d1 = d2 = 1e9; nearest = (gx0, gy0)
        for gx in range(gx0-1, gx0+2):
            for gy in range(gy0-1, gy0+2):
                sxp, syp = seed(gx, gy)
                d = math.hypot(cx-sxp, y-syp)
                if d < d1: d2, d1, nearest = d1, d, (gx, gy)
                elif d < d2: d2 = d
        if (d2 - d1) < cw: return crack
        return faceA if hash01(nearest[0]*5+7, nearest[1]*5+7) < 0.5 else faceB
    return pick

def paint_flat(px, idxs, target_hex, to_sat=None, spread=1.0, floor=0.0):
    if not idxs: return 0
    th, ts, tv = hex2hsv(target_hex)
    if to_sat is not None: ts = to_sat
    pivot = sum(rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])[2] for i in idxs) / len(idxs)
    for i in idxs:
        _, _, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[i*4], px[i*4+1], px[i*4+2] = round(nr*255), round(ng*255), round(nb*255)
    return len(idxs)

def paint_pattern(px, idxs, W, H, fw, pick, spread=1.0):
    # spread<1 keeps each pattern tone closer to its own target value (so a bright tone doesn't get
    # crushed to mud in shadowed pixels) — trades some shading depth for pattern legibility.
    if not idxs: return 0
    pivot = sum(rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])[2] for i in idxs) / len(idxs)
    for i in idxs:
        x, y = i % W, i // W
        cx = x % fw
        th, ts, tv = hex2hsv(pick(cx, y, fw, H))
        _, _, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        nv = max(0.0, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[i*4], px[i*4+1], px[i*4+2] = round(nr*255), round(ng*255), round(nb*255)
    return len(idxs)

def recolor(path, tag, fw, spec):
    img = Image.open(path).convert("RGBA"); W, H = img.size
    px = bytearray(img.tobytes())
    suit, accent = [], []
    for i in range(W*H):
        if px[i*4+3] == 0: continue
        h, s, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        if   is_suit(h, s, v):   suit.append(i)
        elif is_accent(h, s, v): accent.append(i)
    n  = paint_pattern(px, suit, W, H, fw, spec["suit"], spread=spec.get("spread", 1.0))
    n += paint_flat(px, accent, spec["accent"][0], to_sat=spec["accent"][1],
                    spread=spec["accent"][2] if len(spec["accent"]) > 2 else 1.0,
                    floor=spec["accent"][3] if len(spec["accent"]) > 3 else 0.0)
    Image.frombytes("RGBA", (W, H), bytes(px)).save(path[:-4] + f"__{tag}.png")
    return n

# ── the 4 PILOT skins ──  suit = pattern picker · accent = (hex, to_sat|None, [spread], [floor])
SKINS = {
    # 1 TWILIGHT FADE — smooth crimson→indigo vertical gradient suit; pale-lilac accent
    "rr_twilight": dict(suit=p_gradient("#d81f2a", "#33267f"), accent=("#cfc7e8", 0.10)),
    # 2 CIRCUIT RACER — bold red/near-black diagonal racing stripes; clean white accent (contrast)
    "rr_racer":    dict(suit=p_stripes("#d81f2a", "#161119", 6), accent=("#eef0f2", 0.03)),
    # 3 MAGMA MARBLE — mottled crimson / molten-orange marble; reduced shading spread keeps BOTH tones
    #   vivid (the orange stays orange in shadow) so it reads as a true two-tone marble; gold accent
    "rr_magma":    dict(suit=p_marble("#b81f28", "#ef7a1c", 5), spread=0.5, accent=("#e8b23a", None)),
    # 4 HARLEQUIN — crimson / royal-violet diamond checker; gold accent
    "rr_harlequin":dict(suit=p_diamond("#c81f3a", "#5f2ea0", 7), accent=("#e8c24a", None)),

    # ── ROUND 2 ──
    # 5 MARBLED STEEL — organic weathered-metal patches (value-noise marble); silver accent
    "rr_steel":    dict(suit=p_marbled_steel(["#33383f", "#5c646e", "#8b95a0", "#aeb7c0"]), spread=0.7, accent=("#d2d7dc", 0.05)),
    # 6 CIRCUIT PULSE — deep tech-red base with SPARSE, muted-teal circuit traces + brighter junction nodes;
    #   wider spacing + lower density + dimmer trace = less noise at true gameplay scale; steel accent
    "rr_circuit":  dict(suit=p_circuit("#2a0f16", "#2f8f9e", "#9fe6ee", 8, 0.34), spread=0.6, accent=("#b8c2cc", 0.06)),
    # 7 CHEVRON STRIKE — bold red / gold V-chevrons (distinct shape from straight stripes); white accent
    "rr_chevron":  dict(suit=p_chevron("#d81f2a", "#f0b429", 6), accent=("#eef0f2", 0.03)),
    # 8 SHATTERED CORE — LARGE fractured crimson facets with glowing-cyan crack lines (battle-damaged); silver accent
    "rr_shatter":  dict(suit=p_shatter("#7a1420", "#b02636", "#69cfe0", 15, 1.5), spread=0.72, accent=("#cdd3da", 0.05)),

    # ── ROUND 3 (closeout) ──
    # 9 ECLIPSE HALF-TONE — hard diagonal split: deep indigo half / solar-gold half, halftone-dot seam blend; silver accent
    "rr_eclipse":  dict(suit=p_eclipse("#161636", "#f2b21e", 5.0, 3), spread=0.6, accent=("#cdd3da", 0.05)),
    # 10 SCALE MAIL — dense overlapping crimson dragon-scale micro-pattern (fine-detail scale test); gold accent
    "rr_scale":    dict(suit=p_scales("#a8202c", "#dc5a4c", "#570d14", 5, 4), spread=0.7, accent=("#e8b23a", None)),

    # ── VOID (Alien-X style; Part A of the two-part technique) ──
    # 11 MORPHER VOID — full-form near-black recolor (suit + accent), keeping only subtle shading + the
    #   outline silhouette; the drifting morpher-red particles + morph-flash pulse-rings are the game.js
    #   procedural overlay drawMorpherVoidOverlay (Part B), gated on skinId "rr_void".
    "rr_void":     dict(suit=p_flat("#0f0f14"), spread=0.55, accent=("#17171e", 0.06, 0.55, 0.06)),
}

def sheet_widths():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const redRangerMmpr")
    j = src.index("\n}\n", src.index("animationData:", i))
    block = src[i:j]
    out = {}
    for m in re.finditer(r'width:\s*(\d+),.*?sheet:\s*"\./([a-z0-9_]+\.png)"', block):
        out[m.group(2)] = int(m.group(1))
    out["red_ranger_mmpr_portrait.png"] = 0   # portrait: cell-local == absolute (single image)
    return out

def build(tag, only=None):
    widths = sheet_widths(); spec = SKINS[tag]; total = 0
    for sheet, fw in sorted(widths.items()):
        if only and only not in sheet: continue
        path = os.path.join(ROOT, sheet)
        if not os.path.exists(path): print(f"  SKIP(missing) {sheet}"); continue
        w = Image.open(path).width if fw == 0 else fw   # portrait: use full width
        c = recolor(path, tag, w, spec); total += c
        print(f"  {c:7d}px  {sheet}")
    print(f"DONE {tag}: {total}px suit+accent")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if tag in (None, "all"):
        for t in SKINS: print(f"\n=== {t} ==="); build(t, only)
    else:
        build(tag, only)

if __name__ == "__main__":
    main()
