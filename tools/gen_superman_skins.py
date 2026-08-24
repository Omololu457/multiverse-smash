#!/usr/bin/env python3
"""Generate the ROSTER-WIDE Superman 10-skin TEMPLATE, applied INDEPENDENTLY per character.

ONE template (the palette-skins prompt) → the 4 SEPARATE Superman roster entries
(superman / superman_dcuc / superman_new52 / superman_classic). Each is recolored
ONLY from its own sheets — no cross-character asset sharing.

REGIONS (confirmed present on all 4 via HSV guards; blue-suit + red-cape are the
dominant, always-strong regions; belt/emblem yellow is a weak accent on dcuc/new52):
  suit   = blue bodysuit                       -> SUIT
  cape   = ALL red (cape + trunks + boots)      -> CAPE   (★TEMPLATE: trunks FOLLOW the cape/boots,
                                                           unlike the old per-char gen where trunks=suit.
                                                           New 52 has NO trunks — all red = cape/boots.)
  belt   = lowest wide-flat yellow band         -> BELT
  emblem = "S"-shield: yellow shield background  -> EMBLEM_BG  + the red "S" inside -> EMBLEM_S
           (a 2-colour shield so "blue-on-white" etc. read correctly)

to-tone remap keeps each pixel's highlight/shadow offset (shading preserved, not flattened).
Void Sovereign = whole-form near-black flatten (+ a procedural star-field overlay drawn in game.js).

USAGE:  python3 tools/gen_superman_skins.py <charKey> [<tag>]
        charKey in {superman, superman_dcuc, superman_new52, superman_classic}
        tag omitted = all template tags for that char.
"""
import sys, os, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SPREAD = 1.0
VOID_HEX = "#0F0F12"

# charKey -> (characters.js const name, portrait filename)
CHARS = {
    "superman":         ("superman",        "superman_portrait.png"),
    "superman_dcuc":    ("supermanDcuc",    "superman_dcuc_portrait.png"),
    "superman_new52":   ("supermanNew52",   "superman_new52_portrait.png"),
    "superman_classic": ("supermanClassic", "superman_classic_portrait.png"),
    "superman_fighter": ("supermanFighter", "superman_fighter_portrait.png"),
}

# tag -> dict(SUIT, CAPE, BELT, EMBLEM_BG, EMBLEM_S). Trunks = CAPE. (Void/KingdomCome handled specially.)
GOLD = "#E0B23A"; SILVER = "#C8CCD2"; WHITE = "#ECECEC"; BLACK = "#17171A"
TEMPLATE = {
    # ── Group 1 ──
    "crimsonreversal":  dict(SUIT="#C21E1E", CAPE="#1E2E5A", BELT=GOLD,     EMBLEM_BG=WHITE, EMBLEM_S="#2A4DA8"),  # suit red / cape+trunks+boots dark blue / S blue-on-white
    "verdantguardian":  dict(SUIT="#1F6B2E", CAPE="#141414", BELT=GOLD,     EMBLEM_BG=WHITE, EMBLEM_S="#1F6B2E"),  # suit deep green / cape black / S green-on-white
    "obsidiansteel":    dict(SUIT=BLACK,     CAPE="#3A3A40", BELT=SILVER,   EMBLEM_BG=BLACK, EMBLEM_S=WHITE),      # suit black / cape dark grey / S white-on-black
    "goldensentinel":   dict(SUIT="#B8862A", CAPE="#4A3418", BELT=GOLD,     EMBLEM_BG=WHITE, EMBLEM_S="#C21E1E"),  # suit deep gold / cape dark brown / S red-on-white
    # ── Group 2 ──
    "azuredepths":      dict(SUIT="#163A8C", CAPE="#B01818", BELT=GOLD,     EMBLEM_BG="#E6B93A", EMBLEM_S="#B01818"),  # richer original: deeper blue / richer red / S red-on-yellow
    "violeteclipse":    dict(SUIT="#5A2E8F", CAPE="#141414", BELT=SILVER,   EMBLEM_BG=WHITE, EMBLEM_S="#5A2E8F"),  # suit deep violet / cape black / S violet-on-white
    "frostbound":       dict(SUIT="#A8D4E8", CAPE="#EDF3F7", BELT=SILVER,   EMBLEM_BG="#EDF3F7", EMBLEM_S="#7FB8D8"),  # pale ice-blue / cape white / S ice-blue-on-white
    "ashfall":          dict(SUIT="#7A7E85", CAPE="#45474D", BELT="#8A7A50", EMBLEM_BG="#2A2A2E", EMBLEM_S="#9A9EA5"),  # grey / dark grey / dull bronze belt / S grey-on-black
    # ── Specialty ──
    "kingdomcome":      dict(SUIT="#22345E", CAPE="#16181E", BELT="#C89A34", EMBLEM_BG="#16181E", EMBLEM_S="#7A2E2E"),  # Kingdom Come homage: darker muted blue / black accent cape+trunks / simplified dark shield
}
GROUPS = {
    "group1": ["crimsonreversal", "verdantguardian", "obsidiansteel", "goldensentinel"],
    "group2": ["azuredepths", "violeteclipse", "frostbound", "ashfall"],
    "specialty": ["voidsovereign", "kingdomcome"],
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

def process_sheet(path, frames, cols, out_path):
    """cols = dict(SUIT, CAPE, BELT, EMBLEM_BG, EMBLEM_S). Trunks follow CAPE (all red→CAPE except emblem-S)."""
    img = Image.open(path).convert("RGBA"); W, H = img.size
    px = bytearray(img.tobytes()); fw = W // frames
    changed = 0
    for fi in range(frames):
        x0 = fi*fw; x1 = W if fi == frames-1 else (fi+1)*fw
        box = (x0, 0, x1, H)
        cb = content_bbox(px, W, box)
        if cb is None: continue
        minx, miny, maxx, maxy = cb
        cw = maxx - minx + 1
        bands = yellow_bands(px, W, cb)
        belt, shields = classify_belt(bands, cw) if bands else (None, [])
        belt_px = band_pixels([belt]) if belt else set()
        shield_px = band_pixels(shields) if shields else set()
        # emblem = shield-yellow (EMBLEM_BG) + red "S" ring touching it (EMBLEM_S)
        emblem_bg_px = set(shield_px)
        emblem_s_px = set()
        for (sx, sy) in shield_px:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = sx+dx, sy+dy
                    if (nx, ny) not in emblem_bg_px and is_red(_p(px, nx, ny, W)):
                        emblem_s_px.add((nx, ny))
        bp = _mean(px, W, box, is_blue)
        rp = _mean(px, W, box, is_red)
        yp = _mean(px, W, box, is_yellow)
        sp = _mean_set(px, W, emblem_s_px) if emblem_s_px else rp
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                p = _p(px, x, y, W)
                if p[3] < 128: continue
                if is_blue(p):
                    _set(px, x, y, W, tone(p, cols["SUIT"], bp)); changed += 1
                elif is_red(p):
                    if (x, y) in emblem_s_px: _set(px, x, y, W, tone(p, cols["EMBLEM_S"], sp))
                    else:                     _set(px, x, y, W, tone(p, cols["CAPE"], rp))   # cape/trunks/boots together
                    changed += 1
                elif is_yellow(p):
                    if (x, y) in emblem_bg_px: _set(px, x, y, W, tone(p, cols["EMBLEM_BG"], yp))
                    else:                      _set(px, x, y, W, tone(p, cols["BELT"], yp))
                    changed += 1
    Image.frombytes("RGBA", (W, H), bytes(px)).save(out_path)
    return changed

def void_flatten_sheet(path, out_path):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    tr, tg, tb = hx(VOID_HEX); th, ts, tv = hsv(tr, tg, tb)
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            luma = (0.299*r + 0.587*g + 0.114*b) / 255.0
            nv = 0.035 + 0.075 * luma
            rr, gg, bb = colorsys.hsv_to_rgb(th, max(ts, 0.22), nv)
            px[x, y] = (int(rr*255), int(gg*255), int(bb*255), a); n += 1
    img.save(out_path); return n

def wired_sheets_with_frames(const_name, prefix):
    src = open(os.path.join(ROOT, "characters.js")).read()
    k = src.find(f"const {const_name} = {{")
    rest = src[k+len(const_name)+8:]
    j = k+len(const_name)+8 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[k:j]
    out = {}
    for m in re.finditer(r'\{[^{}]*?sheet:\s*"\./(' + re.escape(prefix) + r'[^"]+?)"[^{}]*?\}', block):
        # only base (non-__tag) sheets
        name = m.group(1)
        if "__" in name: continue
        fr = re.search(r'frames:\s*(\d+)', m.group(0))
        out[name] = int(fr.group(1)) if fr else 1
    return out

def gen(char_key, tag):
    const_name, portrait = CHARS[char_key]
    prefix = char_key + "_"
    sheets = wired_sheets_with_frames(const_name, prefix)
    # portrait sheets aren't in animationData → add explicitly
    targets = dict(sheets)
    if os.path.exists(os.path.join(ROOT, portrait)): targets[portrait] = 1
    total = 0; missing = []
    for name, frames in sorted(targets.items()):
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): missing.append(name); continue
        out = os.path.join(ROOT, name.replace(".png", f"__{tag}.png"))
        if tag == "voidsovereign":
            total += void_flatten_sheet(p, out)
        else:
            total += process_sheet(p, frames, TEMPLATE[tag], out)
    tag_desc = "VOID" if tag == "voidsovereign" else str(TEMPLATE[tag])
    print(f"DONE {char_key} {tag}: {total}px over {len(targets)} sheets" + (f"  MISSING {missing}" if missing else ""))

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in CHARS:
        print("usage: gen_superman_skins.py <charKey> [tag|group1|group2|specialty]"); sys.exit(1)
    char_key = sys.argv[1]
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if only in GROUPS: tags = GROUPS[only]
    elif only: tags = [only]
    else: tags = list(TEMPLATE) + ["voidsovereign"]
    for t in tags:
        if t != "voidsovereign" and t not in TEMPLATE:
            print(f"unknown tag {t}"); sys.exit(1)
        gen(char_key, t)

if __name__ == "__main__":
    main()
