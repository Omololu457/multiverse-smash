#!/usr/bin/env python3
"""Generate Hisoka HAIR-COLOR variants for any outfit skin (7 colours × 11 outfits).

APPROACH — a HAIR-ONLY mask derived ONCE from the base sprite, applied to every outfit:
  The base sprite's hair is unambiguously orange (warm, high-sat) and colour-separable from the
  teal outfit + tan skin. Every outfit skin shares the SAME sprite geometry (only clothing colours
  differ), so the hair PIXELS sit at identical coordinates in all of them. We therefore compute the
  hair mask from the BASE sheet (color+spatial) and RECOLOUR THOSE COORDINATES in the chosen outfit
  sheet. Because we recolour a fixed pixel-mask (not a live colour selection on the outfit), a warm
  outfit (e.g. Gilded's gold vest, hue-adjacent to hair) is never touched.

MASK (per frame, on the base): silhouette y-frac [0, HAIR_MAX] (head only → excludes the chest
  emblem's gold accent below) AND is_hair = hue 8-52 & sat>=0.60 (excludes tan skin sat<=0.62 and
  the teal outfit). Face/skin is thus excluded both spatially (band) and by saturation.

RECOLOUR: multi-tone (--to-tone math) — the masked hair pixels of the OUTFIT sheet are re-centred on
  the target hair colour while PRESERVING their own light/dark spread (highlights stay lighter, roots
  darker). Works whether the source hair is orange (10 outfits) or red (Greed Island) — the pivot is
  the masked pixels' own mean value.

USAGE: gen_hisoka_hair.py <outfitTag|default> [hairTag]   (no hairTag = all 7)
  outfit 'default' → source = base hisoka_*_uniform.png ; else source = *__<outfitTag>.png
  output: hisoka_*_uniform__<outfitTag>_<hairTag>.png (+ portrait)
"""
import sys, os, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
HAIR_MAX = 0.28   # silhouette y-fraction: hair/head band (above the chest emblem)

# 7 genuinely-new hair colours (Red replaces Orange — Orange IS the base hair). Multi-tone targets.
HAIR_COLORS = {
    "red":    "#C62828",
    "yellow": "#E8C21A",
    "green":  "#3FA83B",
    "blue":   "#2E6FD6",
    "indigo": "#7B3FD6",
    "pink":   "#E85FA8",
    "white":  "#E6E6EA",
}

def hsv(p):
    r, g, b, _ = p
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return h*360, s, v

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def is_hair(p):
    """Base orange hair: warm hue + high saturation. sat>=0.60 excludes tan skin (sat<=0.62 but its
    mass sits well below 0.60); hue 8-52 excludes the teal outfit and the pink sash/emblem."""
    if p[3] < 128: return False
    H, s, v = hsv(p)
    return 8 <= H <= 52 and s >= 0.60 and v > 0.25

def frame_bbox(px, x0, x1, W, H):
    ys = [y for y in range(H) for x in range(x0, x1) if px[x, y][3] >= 128]
    return (min(ys), max(ys)) if ys else None

def hair_mask(base_img, fw):
    """Set of (x,y) hair coords, per frame: head band [0,HAIR_MAX] AND is_hair, on the BASE sheet."""
    px = base_img.load(); W, H = base_img.size
    mask = set()
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        bb = frame_bbox(px, x0, x1, W, H)
        if not bb: continue
        yt, yb = bb; sh = yb - yt + 1
        for y in range(H):
            if (y - yt)/sh > HAIR_MAX: continue
            for x in range(x0, x1):
                if is_hair(px[x, y]):
                    mask.add((x, y))
    return mask

def recolor_hair(img, mask, fw, hexcol):
    """Recolour the masked hair pixels of `img` to `hexcol` (to-tone; per-frame pivot preserves each
    frame's own light/dark spread). Works on orange OR red source hair."""
    px = img.load(); W, H = img.size
    tr, tg, tb = hex2rgb(hexcol)
    th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    n = 0
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        pts = [(x, y) for (x, y) in mask if x0 <= x < x1]
        if not pts: continue
        vals = [hsv(px[x, y])[2] for (x, y) in pts]
        pivot = sum(vals)/len(vals)
        for (x, y) in pts:
            _, _, v = hsv(px[x, y])
            nv = max(0.0, min(1.0, tv + (v - pivot)))
            r, g, b = colorsys.hsv_to_rgb(th, ts, nv)
            a = px[x, y][3]
            px[x, y] = (int(r*255), int(g*255), int(b*255), a)
            n += 1
    return n

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const hisoka"); rest = src[i+10:]
    j = i+10 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    out = {}
    for m in re.finditer(r'frames:\s*(\d+)[^}]*?width:\s*(\d+)[^}]*?sheet:\s*"\./(hisoka_[^"]+)"', block):
        fr, wd, sh = m.groups(); out[sh] = int(wd)
    return out

def src_name(base_name, outfit):
    """Source sheet for a given outfit: base for 'default', else the outfit's __tag sheet."""
    stem = base_name[:-4]
    return base_name if outfit == "default" else f"{stem}__{outfit}.png"

def process(base_name, fw, outfit, hairs):
    base = Image.open(os.path.join(ROOT, base_name)).convert("RGBA")
    mask = hair_mask(base, fw)
    sn = src_name(base_name, outfit)
    stem = base_name[:-4]
    counts = {}
    for hk in hairs:
        img = Image.open(os.path.join(ROOT, sn)).convert("RGBA")
        counts[hk] = recolor_hair(img, mask, fw, HAIR_COLORS[hk])
        img.save(os.path.join(ROOT, f"{stem}__{outfit}_{hk}.png"))
    return counts, len(mask)

def main():
    if len(sys.argv) < 2:
        print(f"usage: {sys.argv[0]} <outfitTag|default> [hairTag]"); sys.exit(1)
    outfit = sys.argv[1]
    hairs = [sys.argv[2]] if len(sys.argv) > 2 else list(HAIR_COLORS)
    sheets = dict(wired_sheets()); sheets["hisoka_portrait.png"] = 81
    idle_counts = None
    for name, fw in sorted(sheets.items()):
        counts, mlen = process(name, fw, outfit, hairs)
        if name == "hisoka_idle_uniform.png":
            idle_counts = (counts, mlen)
    print(f"  outfit={outfit}  hairs={','.join(hairs)}  idle_mask={idle_counts[1]}px:")
    for hk in hairs:
        print(f"    {hk:7} idle_hair_px={idle_counts[0][hk]}")
    print(f"DONE ({outfit}: {len(hairs)} hair colours × {len(sheets)} sheets)")

if __name__ == "__main__":
    main()
