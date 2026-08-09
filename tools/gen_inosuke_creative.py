#!/usr/bin/env python3
"""Generate Inosuke Hashibira's 12 FULL-FORM creative skins + 1 Void skin (__<tag>.png sheets).

REBUILD (supersedes the old HAIR+ACCENT-only 4-skin set): every skin here is a FULL-FORM recolor that
deliberately varies SKIN TONE alongside hair (boar mask/mane), wrap (hakama/bindings) AND the blue slash-FX
crescents — a coordinated "change almost everything" pass, not the usual hair+outfit-only treatment.

Cosmetic only, zero gameplay. Contamination-proof: like gen_omega_creative, this CAPTURES EVERY REGION
MASK FROM THE ORIGINAL frame FIRST (disjoint by first-match), then paints each region — so a full-form
skin→blue recolor can never be re-grabbed by the wrap/FX pass (the sequential recolor path could not do
this safely). Per-FRAME bbox handling (yband is bbox-relative) is kept because Inosuke's sword-swing FX
changes each frame's canvas size a LOT (asset-map frame-variance note) — the mask must be found in the
top of each silhouette, not a fixed sheet band.

INOSUKE REGIONS (measured — palette histogram across idle + FX-heavy attack frames):
  * SKIN  — bare chest/arms/legs/face: WARM (hue 0-44, sat>=0.24, val>=0.12).
  * SNOUT — the boar-mask pink snout (hue 315-358, sat>=0.28): its own accent; recoloured WITH the skin
            tone by default so it stays coordinated (no stray bright-pink spot on a full-form recolor).
  * WRAP  — the dark-blue hakama/bindings: hue 196-244, sat>=0.30, val<=0.60 (the DARK blue).
  * FX    — the bright blue/cyan slash crescents: hue 163-222, sat>=0.22, val>=0.56 (the BRIGHT blue).
            Cleanly split from WRAP by VALUE (wrap val≈0.2-0.3, FX val≈0.8-1.0).
  * HAIR  — the boar-mask fur/mane: NEUTRAL grey (sat<=0.20, val>=0.12, not-warm), TOP 0-46% of the
            frame's own bbox (keeps it off lower-body neutral highlights).
  * Black outlines (val<0.10) match NO region → stay byte-identical (line-art coloring-book boundary).
Multi-tone shading preserved everywhere via a tone remap (target hue+sat, region mid-tone recentred on the
target value, original highlight/shadow spread kept). `floor` clamps near-black fills a margin above the
outline black so plates/fur never fuse into a blob (line-art guard).
Void skin (13) = full-form near-black flatten (incl. face) + a procedural game.js "tusk-shard" overlay.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import rgb_hsv, hex2rgb
from gen_rick_creative import void_flatten
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── region selectors (evaluated against the ORIGINAL pixel; yf = bbox-relative y fraction) ──
def _skin(h, s, v, warm, yf):  return (h*360) <= 44 and s >= 0.24 and v >= 0.12 and warm > 8
def _snout(h, s, v, warm, yf): return 315 <= (h*360) <= 358 and s >= 0.28 and v >= 0.16
def _wrap(h, s, v, warm, yf):  return 196 <= (h*360) <= 244 and s >= 0.30 and 0.10 <= v <= 0.60
def _fx(h, s, v, warm, yf):    return 163 <= (h*360) <= 222 and s >= 0.22 and v >= 0.56
def _hair(h, s, v, warm, yf):  return s <= 0.20 and v >= 0.12 and warm <= 14 and yf <= 0.46

# first-match ORDER: snout/skin/wrap/fx claimed before hair (hair is the neutral catch-all in the top band)
REGIONS = [("snout", _snout), ("skin", _skin), ("wrap", _wrap), ("fx", _fx), ("hair", _hair)]

def paint(px, idxs, target_hex, to_sat=None, spread=1.0, floor=0.0):
    """Paint captured mask onto target hex, preserving each pixel's shading offset (tone remap)."""
    if not idxs:
        return 0
    th, ts, tv = rgb_hsv(*hex2rgb(target_hex))
    if to_sat is not None:
        ts = to_sat
    pivot = sum(rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])[2] for i in idxs) / len(idxs)
    for i in idxs:
        _, _, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[i*4]   = max(0, min(255, round(nr*255)))
        px[i*4+1] = max(0, min(255, round(ng*255)))
        px[i*4+2] = max(0, min(255, round(nb*255)))
    return len(idxs)

def _spec(v):
    """Normalize a region spec: '#hex' or (hex, to_sat) or (hex, to_sat, spread) or (hex, to_sat, spread, floor)."""
    if isinstance(v, str):
        return (v, None, 1.0, 0.0)
    hexv = v[0]
    to_sat = v[1] if len(v) > 1 else None
    spread = v[2] if len(v) > 2 else 1.0
    floor  = v[3] if len(v) > 3 else 0.0
    return (hexv, to_sat, spread, floor)

def recolor_frame_content(content, cfg):
    """content = a single frame cropped to its opaque bbox. Recolor in place, return px count."""
    W, H = content.size
    px = bytearray(content.tobytes())
    masks = {name: [] for name, _ in REGIONS}
    for y in range(H):
        yf = y / max(1, H - 1)
        for x in range(W):
            i = y*W + x
            if px[i*4+3] == 0:
                continue
            r, g, b = px[i*4], px[i*4+1], px[i*4+2]
            h, s, v = rgb_hsv(r, g, b)
            warm = r - b
            for name, sel in REGIONS:
                if sel(h, s, v, warm, yf):
                    masks[name].append(i)
                    break
    # SNOUT defaults to the SKIN tone (coordinated) so a full-form recolor leaves no stray bright-pink spot
    paint_cfg = dict(cfg)
    if "snout" not in paint_cfg and "skin" in paint_cfg:
        paint_cfg["snout"] = paint_cfg["skin"]
    total = 0
    for name, _ in REGIONS:
        if name not in paint_cfg:
            continue
        hexv, to_sat, spread, floor = _spec(paint_cfg[name])
        total += paint(px, masks[name], hexv, to_sat=to_sat, spread=spread, floor=floor)
    return Image.frombytes("RGBA", (W, H), bytes(px)), total

def recolor(path, tag, cfg, cell_w):
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    cw = cell_w or W
    n = max(1, W // cw)
    total = 0
    for i in range(n):
        box = (i*cw, 0, (i+1)*cw, H)
        frame = img.crop(box)
        bb = frame.getbbox()
        if bb is None:
            continue
        content = frame.crop(bb)
        if cfg.get("void"):
            void_flatten(content, cfg["void"])
            c = 1
        else:
            content, c = recolor_frame_content(content, cfg)
        frame.paste(content, (bb[0], bb[1]))
        img.paste(frame, box)
        total += c
    img.save(path[:-4] + f"__{tag}.png")
    return total

# ── the 13 skins: region -> spec. snout defaults to the skin tone (coordinated) unless given. ──
SKINS = {
    # ── GROUP 1 ──
    "ironboar":     dict(skin=("#8A9099", 0.09), hair=("#191A1E", 0.06, 1.25, 0.10), wrap=("#3A3E45", 0.10), fx=("#C9D2DC", 0.08)),   # living-statue: cool-gray skin, near-black mane, steel wrap, silver FX
    "crimsonferal": dict(skin="#8E3A2E",         hair=("#141315", 0.05, 1.25, 0.10), wrap="#4A1518",        fx="#E23A2A"),             # russet-red skin, black mane, maroon wrap, red FX
    "verdanttusk":  dict(skin="#5F7A38",         hair="#3A2A1A",                      wrap="#1E3E20",        fx="#8FD44A"),             # mossy-green skin, brown mane, forest wrap, sickly-green FX
    "goldenrampage":dict(skin="#B27A2C",         hair=("#141210", 0.05, 1.25, 0.10), wrap="#6E4A15",        fx="#F2C63A"),             # bronze-gold skin, black mane, amber wrap, golden FX
    # ── GROUP 2 ──
    "frostbitetusk":dict(skin=("#B8D2E2", 0.24), hair=("#ECEFF3", 0.03),             wrap=("#9AA6B2", 0.14), fx=("#E8F6FF", 0.06)),   # pale ice-blue skin, white mane, pale-gray wrap, icy-white FX
    "amethystbeast":dict(skin="#6E3A8E",         hair=("#141216", 0.06, 1.25, 0.10), wrap="#3A1A57",        fx="#B060E0"),             # deep-purple skin, black mane, violet wrap, purple FX
    "ashenronin":   dict(skin=("#8A8A8E", 0.05), hair=("#6A6A6E", 0.04),             wrap=("#2E2E33", 0.06), fx=("#A2A2A8", 0.05)),   # desaturated: muted-gray skin, gray mane, charcoal wrap, dull-gray FX
    "sunfiretusk":  dict(skin="#C86A2A",         hair=("#141210", 0.05, 1.25, 0.10), wrap="#7A3A12",        fx="#F26A22"),             # warm-orange skin, black mane, burnt-orange wrap, orange-red FX
    # ── GROUP 3 ──
    "obsidianfang": dict(skin=("#1B1B21", 0.12, 1.35, 0.13), hair=("#141419", 0.10, 1.30, 0.11),
                         wrap=("#151519", 0.12, 1.30, 0.11), snout=("#1B1B21", 0.12, 1.2, 0.12), fx=("#22E0E0", None)),               # minimalist: near-black everything, single vivid-cyan FX accent
    "rosethornbeast":dict(skin=("#E0A0B8", 0.30), hair=("#141214", 0.05, 1.25, 0.10), wrap="#7A1E48",        fx="#F25AA0"),             # soft-pink skin, black mane, deep-rose wrap, pink FX
    "tealrampart":  dict(skin="#2E8A8A",         hair=("#141416", 0.05, 1.25, 0.10), wrap="#124A4A",        fx="#22D0D0"),             # teal skin, black mane, dark-teal wrap, bright-teal FX
    "stormtusk":    dict(skin=("#5A6E8A", 0.30), hair=("#2E2E34", 0.08),             wrap=("#3A424E", 0.14), fx=("#40E0F2", 0.60)),   # slate-blue skin, dark-gray mane, storm-gray wrap, electric-cyan FX
    # ── VOID (13) — full-form near-black flatten + procedural game.js "tusk-shard" overlay ──
    "voidboar":     dict(void="#0E0E13"),
}

def wired_sheets():
    """[(sheet_name, cell_w)] scraped from characters.js — cell width paired with each inosuke_* sheet."""
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const inosuke")
    rest = src[i+13:]
    j = i+13 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    w = {}
    for m in re.finditer(r'width:\s*(\d+)[^}]*?sheet:\s*"\./(inosuke_[^"]+)"', block):
        w.setdefault(m.group(2), int(m.group(1)))
    return sorted(w.items())

def build(tag, only_sheet=None):
    cfg = SKINS[tag]
    targets = wired_sheets() + [("inosuke_portrait.png", None)]
    total = 0
    for name, cell_w in targets:
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        c = recolor(path, tag, cfg, cell_w)
        total += c
        print(f"  {c:7d}px  {name}")
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only_sheet = sys.argv[2] if len(sys.argv) > 2 else None
    if tag in ("ALL", "all"):
        for t in SKINS:
            print(f"=== {t} ==="); build(t, only_sheet)
        return
    if tag not in SKINS:
        print("skins:", ", ".join(SKINS)); sys.exit(1)
    build(tag, only_sheet)

if __name__ == "__main__":
    main()
