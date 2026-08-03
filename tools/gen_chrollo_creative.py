#!/usr/bin/env python3
"""Generate Chrollo Lucilfer's 12 creative alt-color skins (__<tag>.png sheets + portrait).

Builds on the proven tools/gen_chrollo_reference.py machinery (per-frame coat/trouser Y-band split +
tone-preserving remap), which established that at Chrollo's ~28px resolution:
  * COAT & TROUSERS share ONE dark-navy palette (hue 200-310) → separated only by per-frame Y-band.
  * FUR/SILVER = neutral-bright (sat<0.12, val>=0.35) — collar/cuff fur AND leg-wraps together (the
    leg-wraps are NOT separable from the fur; one neutral remap serves both — documented limitation).
  * BUTTONS = gold micro-region (hue 40-70, sat>=0.40) — kept gold on every skin (a consistent accent;
    the per-skin specs don't call out buttons).
  * SKIN (warm hue 5-45, sat>=0.25) — UNTOUCHED (face/hands excluded per spec).

LINING (this tool's addition): the reference tool flagged the inner lining as not hue/position-separable
(a 1-2px sliver sharing the coat's dark value). Since every skin here specifies the lining as a DARKER
COMPANION of the coat, we express it as a VALUE SUB-SPLIT of the coat's Y-band region: the darkest coat
pixels (val < LINING_SPLIT, i.e. the inner-edge/deep-fold shadows) take the LINING colour, the rest take
the COAT colour. This reads as a shaded inner lining without smearing across the flat coat body. Honest
scope: it colours the coat's darkest shadow band, which at 28px IS where the visible lining sits.

Boots / distinct leg-wrap gray / a hue-isolated lining remain non-separable at this resolution (flagged).
LINE-ART guard: outline/near-black-with-alpha pixels outside the blue/neutral/gold gates are never
selected; dark targets use a value floor so shadows never collapse onto the black outlines. Cosmetic only.
"""
import sys, os, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from gen_chrollo_reference import (FRAMES, hsv, _p, _hexrgb, is_blue, is_neutral_bright, is_gold,
                                   COAT_TROUSER_SPLIT, PORTRAIT_SPLIT)

ROOT = os.path.join(os.path.dirname(__file__), "..")
LINING_SPLIT = 0.17   # coat blue pixels with value < this = inner lining/deep shadow (measured: the
                      # darkest ~1/3 of the coat band); >= this = coat body.

def remap_tone(px, coords, target_hex, W, spread=1.0, floor=0.0):
    if not coords: return 0
    th, ts, tv = hsv(*_hexrgb(target_hex))
    vals = [hsv(*_p(px, x, y, W)[:3])[2] for (x, y) in coords]
    pivot = sum(vals) / len(vals)
    for (x, y) in coords:
        v = hsv(*_p(px, x, y, W)[:3])[2]
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        i = (y * W + x) * 4
        px[i] = round(nr*255); px[i+1] = round(ng*255); px[i+2] = round(nb*255)
    return len(coords)

def recolor_frame(px, W, box, cfg, split):
    fx0, fy0, fx1, fy1 = box
    minx, maxx, miny, maxy = fx1, fx0, fy1, fy0; found = False
    for y in range(fy0, fy1):
        for x in range(fx0, fx1):
            if _p(px, x, y, W)[3] >= 128:
                found = True
                minx=min(minx,x); maxx=max(maxx,x); miny=min(miny,y); maxy=max(maxy,y)
    if not found: return 0
    ch = max(1, maxy - miny)
    coat, lining, trouser, fur, gold = [], [], [], [], []
    for y in range(miny, maxy+1):
        frac = (y - miny) / ch
        for x in range(minx, maxx+1):
            p = _p(px, x, y, W)
            if p[3] < 128: continue
            if is_gold(p):
                gold.append((x, y))
            elif is_blue(p):
                if frac < split:
                    v = hsv(*p[:3])[2]
                    (lining if v < LINING_SPLIT else coat).append((x, y))
                else:
                    trouser.append((x, y))
            elif is_neutral_bright(p):
                fur.append((x, y))
            # skin / outline / everything else: untouched
    n = 0
    n += remap_tone(px, coat,    cfg["coat"],    W, spread=1.15, floor=cfg.get("coat_floor", 0.0))
    n += remap_tone(px, lining,  cfg["lining"],  W, spread=1.0, floor=cfg.get("lfloor", 0.0))
    n += remap_tone(px, trouser, cfg.get("trouser", "#1A1A1E"), W, spread=1.0, floor=0.08)
    n += remap_tone(px, fur,     cfg["fur"],     W, spread=1.0)
    if cfg.get("gold", True):
        n += remap_tone(px, gold, "#D4A537", W, spread=1.0)
    return n

def process_sheet(path, frames, out_path, cfg, split):
    img = Image.open(path).convert("RGBA"); W, H = img.size
    px = bytearray(img.tobytes()); fw = W // frames; tot = 0
    for f in range(frames):
        x0 = f*fw; x1 = W if f == frames-1 else (f+1)*fw
        tot += recolor_frame(px, W, (x0, 0, x1, H), cfg, split)
    Image.frombytes("RGBA", (W, H), bytes(px)).save(out_path)
    return tot

# ── 12 skins: coat / fur / lining (+ optional lfloor for near-black linings) ──
SKINS = {
    # group 1
    "cerulean": dict(coat="#274B8F", fur="#F0F0EC", lining="#182842"),          # Cerulean Collector
    "verdant":  dict(coat="#2E6B3A", fur="#F0F0EC", lining="#173322"),          # Verdant Spider
    "crimson":  dict(coat="#8F2222", fur="#F0F0EC", lining="#160E10", lfloor=0.10),  # Crimson Troupe
    "golden":   dict(coat="#C08A2E", fur="#EEE7CE", lining="#3A2412"),          # Golden Pages
    # group 2
    "rose":     dict(coat="#D45A8C", fur="#F2EEEE", lining="#4A1626"),          # Rose Nocturne
    "obsidian": dict(coat="#1B1B22", fur="#9A9AA0", lining="#4A1414", coat_floor=0.12, lfloor=0.10),  # Obsidian Leader
    "ivory":    dict(coat="#DCDCD8", fur="#161618", lining="#7A1620"),          # Ivory Archivist
    "tealc":    dict(coat="#1E6B6B", fur="#F0F0EC", lining="#132A3E"),          # Teal Collector
    # group 3
    "amethyst": dict(coat="#7A3FB0", fur="#F0EEF2", lining="#2E1640"),          # Amethyst Spider (richer purple)
    "sunset":   dict(coat="#C4642A", fur="#EEE7CE", lining="#361C10"),          # Sunset Troupe
    "slate":    dict(coat="#54545C", fur="#F0F0EC", lining="#131316", lfloor=0.09),  # Slate Collector
    "midnight": dict(coat="#17171E", fur="#B8B8BE", lining="#101016", coat_floor=0.12, lfloor=0.09),  # Midnight Archivist
}

def build(tag, only=None):
    cfg = SKINS[tag]; grand = 0
    for name, frames in sorted(FRAMES.items()):
        if only and only not in name: continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        out = os.path.join(ROOT, name.replace(".png", f"__{tag}.png"))
        c = process_sheet(p, frames, out, cfg, COAT_TROUSER_SPLIT); grand += c
        print(f"  {name:40} f={frames:2} px={c}")
    port = os.path.join(ROOT, "chrollo_portrait.png")
    if os.path.exists(port) and (not only or "portrait" in only):
        c = process_sheet(port, 1, port.replace(".png", f"__{tag}.png"), cfg, PORTRAIT_SPLIT); grand += c
        print(f"  {'chrollo_portrait.png':40} f= 1 px={c}")
    print(f"DONE {tag}: {grand}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if tag in (None, "all"):
        for t in SKINS: print(f"\n=== {t} ==="); build(t, only)
    else:
        build(tag, only)

if __name__ == "__main__":
    main()
