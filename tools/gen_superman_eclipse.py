#!/usr/bin/env python3
"""Generate Superman's "Eclipse" alt-color skin (__eclipse.png sheets).

A full near-black recolor: the blue bodysuit, the red cape/boots/trunks, AND the yellow belt are all
UNIFIED to one muted charcoal/near-black tone (#1C1C22). The chest EMBLEM (the "S"-shield) is kept as a
small muted dark-red ACCENT (#5A2A2A) so it still reads as visible detail instead of vanishing into the
suit. Color-only, cosmetic; no new geometry/texture (out of scope for a recolor).

MULTI-TONE PRESERVATION (critical for a suit this dark):
  Each region is remapped with a to-tone transform -- keep the target's hue+sat, but RE-CENTER the
  region's brightness on the target's value while PRESERVING each pixel's highlight/shadow offset
  (nv = target_v + (v - region_mean)*spread). Without this a near-black suit collapses to a flat
  silhouette. `spread` 0.9 keeps form readable; a `VMAX` clamp stops bright originals (the royal-blue
  suit) from blowing out to light gray -- that clamp is what makes suit + cape read as ONE dark tone
  rather than a light-gray suit over a black cape.

WHY IT'S PER-FRAME (the belt/emblem split):
  Belt and chest-shield are BOTH yellow. To darken the belt but ACCENT the shield, they must be told
  apart spatially. Per frame we cluster yellow into y-bands: the lowest WIDE-AND-FLAT band = belt (-> dark);
  every other (upper) yellow band = shield/emblem (-> accent). Reuses the belt-anchor idea from the
  Blue Trunks skin. Frames with no yellow are just blue+red darkened.

See SUPERMAN_ASSET_MAP.md. Palette-collision checked vs Batman "Nightwatch" + Edo Tensei reanim palettes.
"""
import sys, os, re, colorsys
from PIL import Image

DARK   = "#1C1C22"   # unified near-black charcoal (slightly cool)
ACCENT = "#5A2A2A"   # muted dark red for the chest emblem
TAG    = "eclipse"
SPREAD = 0.9         # highlight/shadow spread for the dark regions (form vs flatness)
VMAX_DARK   = 0.42   # clamp charcoal highlights -> unified near-black (no light-gray blowout)
VMAX_ACCENT = 0.50   # let the emblem read a touch brighter so it stays visible
ROOT = os.path.join(os.path.dirname(__file__), "..")


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
    if g > 90: return False          # exclude warm skin
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


def tone(p, target_hex, spread, pivot, vmax):
    r, g, b, a = p
    th, ts, tv = hsv(*hx(target_hex))
    _, _, v = hsv(r, g, b)
    nv = max(0.0, min(vmax, tv + (v - pivot)*spread))
    nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
    return (round(nr*255), round(ng*255), round(nb*255), a)


def mean_val(px, W, box, pred):
    fx0, fy0, fx1, fy1 = box; s = 0; n = 0
    for y in range(fy0, fy1):
        for x in range(fx0, fx1):
            p = _p(px, x, y, W)
            if pred(p): s += hsv(p[0], p[1], p[2])[2]; n += 1
    return (s/n if n else 0.5)


def yellow_bands(px, W, box):
    fx0, fy0, fx1, fy1 = box
    minx = fx1; maxx = fx0; miny = fy1; maxy = fy0; f = False
    for y in range(fy0, fy1):
        for x in range(fx0, fx1):
            if _p(px, x, y, W)[3] >= 128:
                f = True; minx = min(minx, x); maxx = max(maxx, x); miny = min(miny, y); maxy = max(maxy, y)
    if not f: return None, None
    yrows = []
    for y in range(miny, maxy+1):
        xs = [x for x in range(minx, maxx+1) if is_yellow(_p(px, x, y, W))]
        if xs: yrows.append((y, min(xs), max(xs)))
    if not yrows: return (minx, miny, maxx, maxy), []
    bands = []; cur = [yrows[0]]
    for r in yrows[1:]:
        if r[0] - cur[-1][0] <= 2: cur.append(r)
        else: bands.append(cur); cur = [r]
    bands.append(cur)
    return (minx, miny, maxx, maxy), bands


def classify_belt(bands, cw):
    """Return (belt_band, [shield_bands]). belt = lowest wide-and-flat yellow band."""
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


def process_sheet(path, frames, out_path):
    img = Image.open(path).convert("RGBA"); W, H = img.size
    px = bytearray(img.tobytes()); fw = W // frames
    changed = 0
    for fi in range(frames):
        x0 = fi*fw; x1 = W if fi == frames-1 else (fi+1)*fw
        box = (x0, 0, x1, H)
        content, bands = yellow_bands(px, W, box)
        if content is None:
            continue
        cw = content[2] - content[0] + 1
        belt, shields = classify_belt(bands, cw) if bands else (None, [])
        shield_px = set()
        for sb in shields:
            for (yy, xa, xb) in sb:
                for xx in range(xa, xb+1): shield_px.add((xx, yy))
        bp = mean_val(px, W, box, is_blue)
        rp = mean_val(px, W, box, is_red)
        yp = mean_val(px, W, box, is_yellow)
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                p = _p(px, x, y, W)
                if p[3] < 128: continue
                if is_blue(p):
                    _set(px, x, y, W, tone(p, DARK, SPREAD, bp, VMAX_DARK)); changed += 1
                elif is_red(p):
                    _set(px, x, y, W, tone(p, DARK, SPREAD, rp, VMAX_DARK)); changed += 1
                elif is_yellow(p):
                    if (x, y) in shield_px:
                        _set(px, x, y, W, tone(p, ACCENT, 1.15, yp, VMAX_ACCENT))
                    else:
                        _set(px, x, y, W, tone(p, DARK, SPREAD, yp, VMAX_DARK))
                    changed += 1
    Image.frombytes("RGBA", (W, H), bytes(px)).save(out_path)
    return changed


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


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    sheets = wired_sheets_with_frames()
    total = 0
    for name, frames in sorted(sheets.items()):
        if only and only not in name: continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            print(f"  SKIP (missing) {name}"); continue
        c = process_sheet(p, frames, os.path.join(ROOT, name.replace(".png", f"__{TAG}.png")))
        total += c
        print(f"  {name:34} frames={frames:2}  {c:6}px")
    port = os.path.join(ROOT, "superman_portrait.png")
    if os.path.exists(port) and (not only or "portrait" in only):
        c = process_sheet(port, 1, port.replace(".png", f"__{TAG}.png"))
        total += c
        print(f"  {'superman_portrait.png':34} frames= 1  {c:6}px")
    print(f"DONE {TAG}: {total}px")


if __name__ == "__main__":
    main()
