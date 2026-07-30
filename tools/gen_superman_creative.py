#!/usr/bin/env python3
"""Generate Superman's creative alt-color skins (parameterized per-region recolor).

REGIONS (each its own targetable zone; face/skin excluded by hue+green guards):
  suit   = blue bodysuit                              -> SUIT color
  cape   = the big red masses (cape wings + boots)    -> CAPE color   (boots follow the cape; the source
                                                                       shares one red palette, unspecified
                                                                       boots default to cape — flagged)
  trunks = red band below the belt (belt-anchored     -> SUIT color   (spec: "match main suit")
           spatial mask, as in the Blue Trunks skin)
  belt   = lowest WIDE-AND-FLAT yellow band           -> BELT color
  emblem = chest "S"-shield (upper yellow band) + the -> EMBLEM color (shield + S recolored together with a
           red "S" inside it (emblem bbox)                            SHARED pivot so the S stays a darker
                                                                       shade and the emblem still reads)

Every region uses a to-tone remap (keep target hue+sat, re-center brightness on the target value while
PRESERVING each pixel's highlight/shadow offset) so shading/form is retained, not flattened.

USAGE:  python3 tools/gen_superman_creative.py <tag>        (tag from PALETTES below; omit = all)
See SUPERMAN_ASSET_MAP.md.
"""
import sys, os, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SPREAD = 1.0

# tag -> (SUIT, CAPE, EMBLEM, BELT).  Trunks = SUIT.
PALETTES = {
    "rosesteel":   ("#B84F6E", "#7A2F42", "#D9B54A", "#D9B54A"),
    "deepcurrent": ("#1E3A6B", "#3A5A8F", "#DCE3E8", "#DCE3E8"),
    "solarflare":  ("#C46A2E", "#8F3A1E", "#F0C93B", "#F0C93B"),
    "verdant":     ("#2E5E3A", "#1A3A24", "#B8E0A8", "#B8E0A8"),
    "goldenage":   ("#A8792E", "#6B4A1A", "#3A2A14", "#3A2A14"),
    "prism":       ("#1E6B6B", "#5A2E8F", "#E0703B", "#E8C93B"),
}


def hsv(r, g, b): return colorsys.rgb_to_hsv(r/255, g/255, b/255)
def hx(h): return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


def is_blue(p):
    r, g, b, a = p
    if a < 128: return False
    h, s, v = hsv(r, g, b); hd = h*360
    return s >= 0.30 and 195 <= hd <= 245
def is_red(p):
    r, g, b, a = p
    if a < 128: return False
    h, s, v = hsv(r, g, b); hd = h*360
    if s < 0.45: return False
    if not (hd < 18 or hd >= 343): return False
    if g > 90: return False          # exclude warm skin (has appreciable green)
    return True
def is_yellow(p):
    r, g, b, a = p
    if a < 128: return False
    h, s, v = hsv(r, g, b); hd = h*360
    return s >= 0.35 and v >= 0.40 and 40 <= hd <= 70


def _p(px, x, y, W):
    i = (y*W + x)*4; return (px[i], px[i+1], px[i+2], px[i+3])
def _set(px, x, y, W, c):
    i = (y*W + x)*4; px[i], px[i+1], px[i+2], px[i+3] = c


def tone(p, target_hex, pivot, spread=SPREAD, vmax=1.0):
    r, g, b, a = p
    th, ts, tv = hsv(*hx(target_hex))
    _, _, v = hsv(r, g, b)
    nv = max(0.0, min(vmax, tv + (v - pivot)*spread))
    nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
    return (round(nr*255), round(ng*255), round(nb*255), a)


def content_bbox(px, W, box):
    fx0, fy0, fx1, fy1 = box
    minx = fx1; maxx = fx0; miny = fy1; maxy = fy0; f = False
    for y in range(fy0, fy1):
        for x in range(fx0, fx1):
            if _p(px, x, y, W)[3] >= 128:
                f = True; minx = min(minx, x); maxx = max(maxx, x); miny = min(miny, y); maxy = max(maxy, y)
    return (minx, miny, maxx, maxy) if f else None


def yellow_bands(px, W, cb):
    minx, miny, maxx, maxy = cb
    yrows = []
    for y in range(miny, maxy+1):
        xs = [x for x in range(minx, maxx+1) if is_yellow(_p(px, x, y, W))]
        if xs: yrows.append((y, min(xs), max(xs)))
    if not yrows: return []
    bands = []; cur = [yrows[0]]
    for r in yrows[1:]:
        if r[0] - cur[-1][0] <= 2: cur.append(r)
        else: bands.append(cur); cur = [r]
    bands.append(cur)
    return bands


def classify_belt(bands, cw):
    if not bands: return None, []
    def wh(bd):
        w = max(r[2] for r in bd) - min(r[1] for r in bd) + 1
        h = bd[-1][0] - bd[0][0] + 1
        return w, h
    flat = [bd for bd in bands if (lambda w, h: w >= 0.25*cw and w >= 1.8*h)(*wh(bd))]
    belt = max(flat, key=lambda bd: sum(r[0] for r in bd)/len(bd)) if flat \
        else max(bands, key=lambda bd: sum(r[0] for r in bd)/len(bd))
    shields = [bd for bd in bands if bd is not belt]
    return belt, shields


def band_pixels(bands):
    s = set()
    for bd in bands:
        for (y, xa, xb) in bd:
            for x in range(xa, xb+1): s.add((x, y))
    return s


def process_sheet(path, frames, suit, cape, emblem, belt_c, out_path):
    img = Image.open(path).convert("RGBA"); W, H = img.size
    px = bytearray(img.tobytes()); fw = W // frames
    changed = 0
    for fi in range(frames):
        x0 = fi*fw; x1 = W if fi == frames-1 else (fi+1)*fw
        box = (x0, 0, x1, H)
        cb = content_bbox(px, W, box)
        if cb is None: continue
        minx, miny, maxx, maxy = cb
        cw = maxx - minx + 1; ch = maxy - miny + 1
        bands = yellow_bands(px, W, cb)
        belt, shields = classify_belt(bands, cw) if bands else (None, [])
        belt_px = band_pixels([belt]) if belt else set()
        # EMBLEM = the shield-yellow pixels themselves, PLUS red pixels touching them (the "S" ring).
        # NOT a padded bbox — a rectangle swept in cape-red on the shoulder in side poses (over-grab bug).
        shield_px = band_pixels(shields) if shields else set()
        emblem_px = set(shield_px)
        for (sx, sy) in shield_px:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = sx+dx, sy+dy
                    if (nx, ny) not in emblem_px and is_red(_p(px, nx, ny, W)):
                        emblem_px.add((nx, ny))
        # trunk mask: red within belt x-span, belt-top down ~12% body height
        trunk_px = set()
        if belt:
            by0 = belt[0][0]; by1 = belt[-1][0]
            bx0 = min(r[1] for r in belt); bx1 = max(r[2] for r in belt)
            depth = max(4, round(0.12*ch))
            for y in range(by0, min(maxy, by1+depth)+1):
                for x in range(max(minx, bx0-1), min(maxx, bx1+1)+1):
                    if is_red(_p(px, x, y, W)) and (x, y) not in emblem_px:
                        trunk_px.add((x, y))
        # per-region pivots (means measured on the ORIGINAL frame)
        bp = _mean(px, W, box, is_blue)
        rp = _mean(px, W, box, is_red)
        yp = _mean(px, W, box, is_yellow)
        tp = _mean_set(px, W, trunk_px) if trunk_px else rp
        ep = _mean_set(px, W, emblem_px) if emblem_px else 0.5
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                p = _p(px, x, y, W)
                if p[3] < 128: continue
                inem = (x, y) in emblem_px
                if is_blue(p):
                    _set(px, x, y, W, tone(p, suit, bp)); changed += 1
                elif is_red(p):
                    if inem:                 _set(px, x, y, W, tone(p, emblem, ep))
                    elif (x, y) in trunk_px: _set(px, x, y, W, tone(p, suit, tp))
                    else:                    _set(px, x, y, W, tone(p, cape, rp))
                    changed += 1
                elif is_yellow(p):
                    if inem:                 _set(px, x, y, W, tone(p, emblem, ep))
                    else:                    _set(px, x, y, W, tone(p, belt_c, yp))
                    changed += 1
    Image.frombytes("RGBA", (W, H), bytes(px)).save(out_path)
    return changed


def _in(box, x, y): return box[0] <= x <= box[2] and box[1] <= y <= box[3]
def _mean(px, W, box, pred):
    s = 0; n = 0
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            p = _p(px, x, y, W)
            if pred(p): s += hsv(p[0], p[1], p[2])[2]; n += 1
    return s/n if n else 0.5
def _mean_set(px, W, pts):
    s = 0; n = 0
    for (x, y) in pts:
        p = _p(px, x, y, W); s += hsv(p[0], p[1], p[2])[2]; n += 1
    return s/n if n else 0.5
def _mean_emblem(px, W, box):
    s = 0; n = 0
    for y in range(box[1], box[3]+1):
        for x in range(box[0], box[2]+1):
            p = _p(px, x, y, W)
            if is_red(p) or is_yellow(p): s += hsv(p[0], p[1], p[2])[2]; n += 1
    return s/n if n else 0.5


def wired_sheets_with_frames():
    src = open(os.path.join(ROOT, "characters.js")).read()
    k = src.find("const superman")
    rest = src[k+14:]
    j = k+14 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[k:j]
    out = {}
    for m in re.finditer(r'\{[^{}]*?sheet:\s*"\./(superman_[^"]+)"[^{}]*?\}', block):
        seg = m.group(0)
        fr = re.search(r'frames:\s*(\d+)', seg)
        out[m.group(1)] = int(fr.group(1)) if fr else 1
    return out


def gen_tag(tag):
    suit, cape, emblem, belt_c = PALETTES[tag]
    sheets = wired_sheets_with_frames()
    total = 0
    for name, frames in sorted(sheets.items()):
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            print(f"  SKIP (missing) {name}"); continue
        c = process_sheet(p, frames, suit, cape, emblem, belt_c, os.path.join(ROOT, name.replace(".png", f"__{tag}.png")))
        total += c
    port = os.path.join(ROOT, "superman_portrait.png")
    if os.path.exists(port):
        total += process_sheet(port, 1, suit, cape, emblem, belt_c, port.replace(".png", f"__{tag}.png"))
    print(f"DONE {tag}: {total}px  (suit {suit} cape {cape} emblem {emblem} belt {belt_c})")


# ── PHANTOM ZONE — whole-form VOID base (all pixels incl. face → deep cool-charcoal) ──────────────
# Not a per-region recolor: the concept is Superman phased partway into an extradimensional void, so the
# ENTIRE form flattens to near-black with a faint cool (blue) undertone. A luma→tiny-value map keeps a
# faint internal gradient so the silhouette form stays readable (not a flat blob). The spectral energy is
# a separate canvas overlay (game.js drawPhantomZoneOverlay), NOT baked here.
VOID_HEX = "#0F1014"

def void_flatten_sheet(path, hexcol, out_path):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    tr, tg, tb = hx(hexcol); th, ts, tv = hsv(tr, tg, tb)
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            luma = (0.299*r + 0.587*g + 0.114*b) / 255.0
            nv = 0.035 + 0.075 * luma                       # val 0.035-0.11: near-black, faint gradient
            rr, gg, bb = colorsys.hsv_to_rgb(th, max(ts, 0.22), nv)   # keep the faint cool undertone
            px[x, y] = (int(rr*255), int(gg*255), int(bb*255), a); n += 1
    img.save(out_path); return n

def gen_phantomzone():
    sheets = wired_sheets_with_frames()
    total = 0
    for name in sorted(sheets):
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP (missing) {name}"); continue
        total += void_flatten_sheet(p, VOID_HEX, os.path.join(ROOT, name.replace(".png", "__phantomzone.png")))
    port = os.path.join(ROOT, "superman_portrait.png")
    if os.path.exists(port):
        void_flatten_sheet(port, VOID_HEX, port.replace(".png", "__phantomzone.png"))
    print(f"DONE phantomzone: {total}px void-flattened over {len(sheets)} sheets + portrait")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only == "phantomzone":
        gen_phantomzone(); return
    tags = [only] if only else list(PALETTES)
    for t in tags:
        if t not in PALETTES:
            print(f"unknown tag {t}; choices: {', '.join(PALETTES)}, phantomzone"); sys.exit(1)
        gen_tag(t)


if __name__ == "__main__":
    main()
