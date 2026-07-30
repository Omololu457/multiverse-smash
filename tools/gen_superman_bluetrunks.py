#!/usr/bin/env python3
"""Generate Superman's "Red Trunks -> Blue, Belt -> Solid Yellow" alt skin (__bluetrunks.png sheets).

WHY THIS ISN'T A recolor_palette.py ONE-LINER
---------------------------------------------
Superman's trunks are RED, but so are his cape and boots -- all ONE shared red palette (hue 0),
exactly as documented for the Violet skin. recolor_palette.py selects by COLOR (+ vertical band),
so any red selection also grabs the cape/boots; a vertical band bleeds a blue stripe across the
cape (the cape occupies the trunks' rows on both sides). There is NO hue / brightness / y-band that
isolates the trunks alone. So this skin needs a SPATIAL, per-frame mask instead.

THE MASK (per frame, belt-anchored):
  * The yellow BELT spans exactly the pelvis/trunk width and sits directly above the trunks.
  * Find the belt = the lowest WIDE-AND-FLAT yellow band (this rejects the compact chest "S"-shield
    diamond, which is also yellow). If no belt-like band is found (belt occluded / dissolve frames),
    the frame is left untouched -- a safe no-op, never a mis-recolor of the chest.
  * TRUNKS  = red pixels within the belt's x-span, from the belt's top row down ~12% of body height.
              The cape wings (outside the belt x-span) and the inter-leg cape (below the band) stay RED.
              Recolored to navy #2A4D8F -- deliberately DARKER than the royal suit/legs (#0062D6) so the
              briefs read as a distinct element and don't blend into the blue tights.
  * BELT    = that band's yellow flattened to solid #E8C93B (luminance-scaled; the chest shield's
              yellow, being a different band, is left untouched -> belt-only, as requested).

Cosmetic only. Multi-frame verified. See SUPERMAN_ASSET_MAP.md.
"""
import sys, os, re, colorsys
from PIL import Image

BLUE = "#2A4D8F"      # trunks: navy, distinct from royal suit-blue #0062D6
BELT = "#E8C93B"      # belt: solid flat yellow
TAG  = "bluetrunks"
DEPTH_FRAC = 0.12     # trunk band depth as a fraction of per-frame body height
ROOT = os.path.join(os.path.dirname(__file__), "..")


def hsv(r, g, b):
    return colorsys.rgb_to_hsv(r/255, g/255, b/255)


def is_yellow(p):
    r, g, b, a = p
    if a < 128:
        return False
    h, s, v = hsv(r, g, b); hd = h*360
    return s >= 0.35 and v >= 0.40 and 40 <= hd <= 70


def is_red(p):
    r, g, b, a = p
    if a < 128:
        return False
    h, s, v = hsv(r, g, b); hd = h*360
    if s < 0.50:
        return False
    if not (hd < 16 or hd >= 345):
        return False
    if g > 80:          # exclude warm skin (has appreciable green); pure red g~0-45
        return False
    return True


def _p(px, x, y, W):
    i = (y*W + x)*4
    return (px[i], px[i+1], px[i+2], px[i+3])


def recolor_frame(px, W, box, blue_hex, belt_hex, depth_frac):
    """Mutate px (bytearray, RGBA) for one frame. Returns (trunk_px, belt_px)."""
    fx0, fy0, fx1, fy1 = box
    minx = fx1; maxx = fx0; miny = fy1; maxy = fy0; found = False
    for y in range(fy0, fy1):
        for x in range(fx0, fx1):
            if _p(px, x, y, W)[3] >= 128:
                found = True
                minx = min(minx, x); maxx = max(maxx, x)
                miny = min(miny, y); maxy = max(maxy, y)
    if not found:
        return (0, 0)
    ch = maxy - miny + 1; cw = maxx - minx + 1

    # yellow rows within content, clustered into y-bands (gap > 2 splits)
    yrows = []
    for y in range(miny, maxy+1):
        xs = [x for x in range(minx, maxx+1) if is_yellow(_p(px, x, y, W))]
        if xs:
            yrows.append((y, min(xs), max(xs)))
    if not yrows:
        return (0, 0)
    bands = []; cur = [yrows[0]]
    for r in yrows[1:]:
        if r[0] - cur[-1][0] <= 2:
            cur.append(r)
        else:
            bands.append(cur); cur = [r]
    bands.append(cur)

    # belt = lowest WIDE-AND-FLAT band (rejects the compact S-shield); else skip frame
    def wh(bd):
        w = max(r[2] for r in bd) - min(r[1] for r in bd) + 1
        h = bd[-1][0] - bd[0][0] + 1
        return w, h
    cand = [bd for bd in bands if (lambda w, h: w >= 0.25*cw and w >= 1.8*h)(*wh(bd))]
    if not cand:
        return (0, 0)
    belt = max(cand, key=lambda bd: sum(r[0] for r in bd)/len(bd))
    by0 = belt[0][0]; by1 = belt[-1][0]
    bx0 = min(r[1] for r in belt); bx1 = max(r[2] for r in belt)

    # --- belt -> flat belt_hex (luminance-scaled, so outline/segment gaps keep depth) ---
    br, bg, bb = int(belt_hex[1:3], 16), int(belt_hex[3:5], 16), int(belt_hex[5:7], 16)
    belt_n = 0
    for y in range(by0, by1+1):
        for x in range(bx0, bx1+1):
            p = _p(px, x, y, W)
            if is_yellow(p):
                luma = (0.299*p[0] + 0.587*p[1] + 0.114*p[2]) / 255.0
                f = max(0.55, min(1.0, luma*1.15 + 0.12))
                i = (y*W + x)*4
                px[i] = min(255, round(br*f)); px[i+1] = min(255, round(bg*f)); px[i+2] = min(255, round(bb*f))
                belt_n += 1

    # --- trunks: red within belt x-span, belt-top down ~depth_frac of body height ---
    depth = max(4, round(depth_frac*ch))
    ty0 = by0; ty1 = min(maxy, by1 + depth)
    m = 1
    tx0 = max(minx, bx0 - m); tx1 = min(maxx, bx1 + m)
    th, ts, tv = hsv(int(blue_hex[1:3], 16), int(blue_hex[3:5], 16), int(blue_hex[5:7], 16))
    sel = []
    for y in range(ty0, ty1+1):
        for x in range(tx0, tx1+1):
            p = _p(px, x, y, W)
            if is_red(p):
                sel.append((x, y, hsv(p[0], p[1], p[2])[2]))
    if not sel:
        return (0, belt_n)
    pivot = sum(s[2] for s in sel)/len(sel)
    trunk_n = 0
    for x, y, v in sel:
        nv = max(0.0, min(1.0, tv + (v - pivot)*1.15))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        i = (y*W + x)*4
        px[i] = round(nr*255); px[i+1] = round(ng*255); px[i+2] = round(nb*255)
        trunk_n += 1
    return (trunk_n, belt_n)


def process_sheet(path, frames, out_path):
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    px = bytearray(img.tobytes())
    fw = W // frames
    tt = tb = 0
    for f in range(frames):
        x0 = f*fw; x1 = W if f == frames-1 else (f+1)*fw
        t, b = recolor_frame(px, W, (x0, 0, x1, H), BLUE, BELT, DEPTH_FRAC)
        tt += t; tb += b
    Image.frombytes("RGBA", (W, H), bytes(px)).save(out_path)
    return tt, tb


def wired_sheets_with_frames():
    """(sheet_filename, frames) for every wired Superman sheet, read from characters.js."""
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
    total_t = total_b = 0
    for name, frames in sorted(sheets.items()):
        if only and only not in name:
            continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            print(f"  SKIP (missing) {name}"); continue
        out = os.path.join(ROOT, name.replace(".png", f"__{TAG}.png"))
        t, b = process_sheet(p, frames, out)
        total_t += t; total_b += b
        print(f"  {name:34} frames={frames:2}  trunk={t:5}px belt={b:4}px")
    # portrait (single frame)
    port = os.path.join(ROOT, "superman_portrait.png")
    if os.path.exists(port) and (not only or "portrait" in only):
        t, b = process_sheet(port, 1, port.replace(".png", f"__{TAG}.png"))
        total_t += t; total_b += b
        print(f"  {'superman_portrait.png':34} frames= 1  trunk={t:5}px belt={b:4}px")
    print(f"DONE {TAG}: trunk {total_t}px, belt {total_b}px")


if __name__ == "__main__":
    main()
