#!/usr/bin/env python3
"""Generate Hisoka's four outfit-inspired alt skins (AZURE / IVORY / SEAFOAM / MIDNIGHT).

TARGETED per-region recolor (multi-tone shading PRESERVED via to-tone math) + per-frame
emblem/shoe spatial edits. The FACE/SKIN region is EXPLICITLY EXCLUDED from every pass
(hue 18-52 sat .20-.62 never overlaps the teal-garment / pink-sash / gray-shoe selections).
Cosmetic only — zero gameplay/stat change. Region predicates are the ones proven by
tools/gen_hisoka_greedisland.py (0 skin-bleed across all 19 wired sheets + portrait).

Base sprite regions:
  HAIR    orange (hue 8-52 sat>=.60)         — KEPT (no pass; these outfits don't restyle hair)
  SKIN    tan  (hue 18-52 sat .20-.62 v>.55) — EXCLUDED everywhere
  TOP+PANTS teal one-piece (hue 100-175 sat .09-.60) + gray shading (sat<.12 v .20-.70)
  SASH    pink waist band (hue 315-355 sat>=.40)
  EMBLEM  chest heart (embedded pink+gold cluster) — recolored (not erased) or kept
  SHOES   near-gray boots, bottom band (sat<.08 v .22-.68)

PIPELINE per sheet (order matters, same rationale as the Greed Island driver):
  1. EMBLEM recolor (per-frame): detect the embedded chest cluster and paint it to the skin's
     emblem colour (black) BEFORE the sash pass, so the (formerly pink) emblem is removed from the
     global pink selection. Skins that keep the emblem skip this.
  2. SASH pink -> target (global region pass, hue 315-355 sat>=.40).
  3. SHOE recolor (per-frame bottom band) -> target, BEFORE the jumpsuit pass so the still-gray
     boot doesn't collide with the jumpsuit gray-shading selection.
  4. JUMPSUIT teal(+gray shading) -> target(s) (per-frame; optionally split vest/pants at the waist
     y-fraction). Multi-tone: each frame/segment re-centres on the target value while preserving the
     existing light/dark spread (never flattens to one flat tone).

CONTENT GAPS (NOT faked — flagged, same policy as Greed Island's undershirt):
  - neck scarf/bow (Azure), separable collar (Ivory), striped socks (Ivory/Seafoam): no such region
    exists in the base art. Not synthesised.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import apply_recolor, _NS
from gen_hisoka_hair import hair_mask, recolor_hair   # base-derived hair mask (coordinate-based)
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
WAIST = 0.46   # silhouette y-fraction dividing vest (above) from pants (below)

# ── per-skin config ──────────────────────────────────────────────────────────
# jumpsuit: list of (ylo, yhi, "#hex") silhouette-fraction segments (multi-tone recolor).
# emblem/sash/shoes: "#hex" target or None to leave the base region untouched.
SKINS = {
    "azure": dict(
        emblem="#1A1A1A",                                             # chest emblem -> black
        sash="#D9A83B",                                               # sash -> mustard yellow
        shoes="#2B3A6B",                                              # shoes -> dark navy
        jumpsuit=[(0.0, WAIST, "#B8D9E0"), (WAIST, 1.0, "#C9E3E8")],  # vest / pants pale cyan-blue
    ),
    "ivory": dict(
        emblem="#1A1A1A",                                             # emblem(s) -> black
        sash="#1A1A1A",                                               # sash trim -> black
        shoes="#3B2A1F",                                              # shoes -> dark brown/black
        jumpsuit=[(0.0, 1.0, "#F0EEE8")],                             # whole outfit off-white
    ),
    "seafoam": dict(
        emblem=None,                                                  # keep base red heart
        sash=None,                                                    # keep base pink sash
        shoes="#8B5A3C",                                              # shoes -> brown
        jumpsuit=[(0.0, WAIST, "#4A9B8E"), (WAIST, 1.0, "#B8E0D2")],  # teal vest / mint pants
    ),
    "midnight": dict(
        emblem="#1A1A1A",                                             # spade emblem -> black
        sash="#2A3550",                                               # sash blends into the suit
        shoes="#1A1A1A",                                              # shoes -> black
        jumpsuit=[(0.0, 1.0, "#2A3550")],                             # deep-navy formal suit
    ),
    # ── second batch: 5 creative colour-only themes (shoes track the trim/accent). Each also gets ONE
    # COORDINATED hair colour (hair=), recoloured via the base-derived hair mask to tie the head into
    # the outfit's own palette. The 6 reference outfits (default/greedisland/azure/ivory/seafoam/
    # midnight) have NO hair key → their natural hair is untouched. ──
    "bloodhound": dict(
        emblem="#1A1A1A", sash="#1A1A1A", shoes="#1A1A1A", hair="#1A1A1A",   # black hair → dark-predator
        jumpsuit=[(0.0, 1.0, "#7A1220")],                             # deep blood-red vest+pants
    ),
    "venom": dict(
        emblem="#1A1A1A", sash="#1A1A1A", shoes="#1A1A1A", hair="#5FA83B",   # acid-green hair → toxic
        jumpsuit=[(0.0, WAIST, "#5FA83B"), (WAIST, 1.0, "#A8C98A")],  # acid-green vest / pale sickly pants
    ),
    "gilded": dict(
        emblem="#3B2A14", sash="#3B2A14", shoes="#3B2A14", hair="#D9B54A",   # golden-blonde hair
        jumpsuit=[(0.0, WAIST, "#C9922E"), (WAIST, 1.0, "#EDE0C0")],  # amber-gold vest / cream pants
    ),
    "joker": dict(
        emblem="#1A1A1A", sash="#1A1A1A", shoes="#1A1A1A", hair="#D4D4D4",   # light-gray hair → monochrome
        jumpsuit=[(0.0, WAIST, "#6B6B6B"), (WAIST, 1.0, "#C4C4C4")],  # mid-gray vest / light-gray pants
    ),
    "jester": dict(
        emblem="#1A1A1A", sash="#1A1A1A", shoes="#1A1A1A", hair="#C22D7A",   # magenta-pink hair
        jumpsuit=[(0.0, WAIST, "#C22D7A"), (WAIST, 1.0, "#EFC0D6")],  # vivid-magenta vest / pale-pink pants
    ),
}

# ── color predicates (on 0-255 RGBA tuples) — from the Greed Island driver ────
def hsv(p):
    r, g, b, _ = p
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return h*360, s, v

def is_pink(p):
    if p[3] < 128: return False
    H, s, v = hsv(p)
    return (H >= 300 or H <= 22) and s > 0.45 and v > 0.35

def is_gold(p):
    if p[3] < 128: return False
    H, s, v = hsv(p)
    return 18 <= H <= 52 and s > 0.62 and v > 0.40

def is_emblem_color(p):
    return is_pink(p) or is_gold(p)

def is_jumpsuit(p):
    if p[3] < 128: return False
    H, s, v = hsv(p)
    if v < 0.15: return False
    return (100 <= H <= 175 and s >= 0.09) or (s < 0.12 and 0.20 <= v <= 0.70)

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# ── per-frame helpers ────────────────────────────────────────────────────────
def frame_bbox(px, x0, x1, W, H):
    ys = [y for y in range(H) for x in range(x0, x1) if px[x, y][3] >= 128]
    return (min(ys), max(ys)) if ys else None

def detect_emblem_holes(img):
    """Return the set of chest-emblem pixel coords (VERBATIM the Greed Island detection:
    per-frame, banded, pink-seeded connected component, compact + torso-centred)."""
    px = img.load(); W, H = img.size
    fw = getattr(img, "_fw", W)
    holes = set()
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        bb = frame_bbox(px, x0, x1, W, H)
        if not bb: continue
        yt, yb = bb; sh = yb - yt + 1
        def in_band(_x, _y):
            return 0.26 <= (_y - yt)/sh < 0.46 and is_emblem_color(px[_x, _y])
        seen = set()
        for sy in range(H):
            if not (0.26 <= (sy - yt)/sh < 0.46): continue
            for sx in range(x0, x1):
                if (sx, sy) in seen or not in_band(sx, sy): continue
                st = [(sx, sy)]; seen.add((sx, sy)); cc = []
                while st:
                    cx, cy = st.pop(); cc.append((cx, cy))
                    for dx in (-1,0,1):
                        for dy in (-1,0,1):
                            nx, ny = cx+dx, cy+dy
                            if x0 <= nx < x1 and 0 <= ny < H and (nx, ny) not in seen and in_band(nx, ny):
                                seen.add((nx, ny)); st.append((nx, ny))
                has_pink_seed = any(is_pink(px[cx, cy]) and sum(
                    1 for dx in (-1,0,1) for dy in (-1,0,1)
                    if (dx or dy) and 0 <= cx+dx < W and 0 <= cy+dy < H and is_jumpsuit(px[cx+dx, cy+dy])
                ) >= 2 for (cx, cy) in cc)
                xs = [c[0] for c in cc]; ys_ = [c[1] for c in cc]
                bw = max(xs) - min(xs) + 1; bh = max(ys_) - min(ys_) + 1
                vc_c = (sum(ys_)/len(cc) - yt)/sh
                cx_frac = (sum(xs)/len(cc) - x0)/fw
                compact = bw <= 0.45*fw and bh <= 0.26*sh and len(cc) <= 0.12*fw*sh
                centred = 0.28 <= cx_frac <= 0.72
                if has_pink_seed and 0.27 <= vc_c < 0.45 and compact and centred:
                    holes.update(cc)
    return holes

def recolor_emblem(img, hexcol):
    """Paint the detected emblem cluster to `hexcol`, luminance-scaled so the emblem keeps a hint
    of its own shading (two-tone) rather than a dead flat block."""
    holes = detect_emblem_holes(img)
    px = img.load()
    tr, tg, tb = hex2rgb(hexcol)
    for (x, y) in holes:
        r, g, b, a = px[x, y]
        luma = (0.299*r + 0.587*g + 0.114*b) / 255.0
        f = 0.55 + 0.55*luma                       # keep target dark but not perfectly flat
        px[x, y] = (min(255, int(tr*f)), min(255, int(tg*f)), min(255, int(tb*f)), a)
    return len(holes)

def is_sash(p):
    """Sash pink OR pure red. Hue window 308-360 + 0-16 entirely excludes skin (hue 18-52), so the
    waist-band scan below is skin-safe even where a limb drifts into the band."""
    if p[3] < 128: return False
    H, s, v = hsv(p)
    return (H >= 308 or H <= 16) and s > 0.40 and v > 0.35

def detect_sash(img):
    """Capture the waist-sash pixel coords + each one's ORIGINAL value. Must be called BEFORE the
    jumpsuit recolor: once the jumpsuit becomes red/magenta (e.g. Bloodhound/Jester), those garment
    pixels fall inside is_sash's hue window and would be mis-grabbed. Banded to the silhouette waist
    [0.38,0.60] so the face/mouth pink up top is never included. (The jumpsuit pass only touches
    is_jumpsuit teal/gray pixels, so these pink sash pixels keep their values through it.)"""
    px = img.load(); W, H = img.size
    fw = getattr(img, "_fw", W)
    pts = []
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        bb = frame_bbox(px, x0, x1, W, H)
        if not bb: continue
        yt, yb = bb; sh = yb - yt + 1
        for y in range(H):
            if not (0.38 <= (y - yt)/sh <= 0.60): continue
            for x in range(x0, x1):
                if is_sash(px[x, y]):
                    pts.append((x, y, hsv(px[x, y])[2]))
    return pts

def apply_sash(img, pts, hexcol):
    """Recolour the pre-captured sash pixels to `hexcol` (to-tone, shading preserved). Runs LAST — a
    dark target (e.g. black) becomes near-gray, which an earlier pass would let the jumpsuit re-grab."""
    if not pts: return 0
    px = img.load()
    tr, tg, tb = hex2rgb(hexcol)
    th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    pivot = sum(v for _, _, v in pts)/len(pts)
    for (x, y, v) in pts:
        nv = max(0.0, min(1.0, tv + (v - pivot)))
        r, g, b = colorsys.hsv_to_rgb(th, ts, nv)
        a = px[x, y][3]
        px[x, y] = (int(r*255), int(g*255), int(b*255), a)
    return len(pts)

def recolor_shoes(img, hexcol):
    """Per-frame: bottom-band gray boot pixels -> `hexcol` (to-tone, keeps boot shading)."""
    px = img.load(); W, H = img.size
    fw = getattr(img, "_fw", W)
    tr, tg, tb = hex2rgb(hexcol)
    th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    n = 0
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        bb = frame_bbox(px, x0, x1, W, H)
        if not bb: continue
        yt, yb = bb; sh = yb - yt + 1
        pts, vals = [], []
        for y in range(H):
            if (y - yt)/sh < 0.88: continue
            for x in range(x0, x1):
                p = px[x, y]
                if p[3] < 128: continue
                _, s, v = hsv(p)
                if s < 0.08 and 0.22 <= v <= 0.68:
                    pts.append((x, y)); vals.append(v)
        if not pts: continue
        pivot = sum(vals)/len(vals)
        for (x, y) in pts:
            _, _, v = hsv(px[x, y])
            nv = max(0.0, min(1.0, tv + (v - pivot)))
            r, g, b = colorsys.hsv_to_rgb(th, ts, nv)
            px[x, y] = (int(r*255), int(g*255), int(b*255), px[x, y][3])
            n += 1
    return n

def recolor_jumpsuit(img, segments):
    """Per-frame multi-tone recolor of the teal one-piece, optionally split into vertical
    silhouette-fraction segments (vest vs pants). Each frame+segment re-centres its OWN mean value
    on the target and preserves the local light/dark spread — no flat-fill, no cross-frame drift."""
    px = img.load(); W, H = img.size
    fw = getattr(img, "_fw", W)
    n = 0
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        bb = frame_bbox(px, x0, x1, W, H)
        if not bb: continue
        yt, yb = bb; sh = yb - yt + 1
        for (ylo, yhi, hexcol) in segments:
            tr, tg, tb = hex2rgb(hexcol)
            th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
            pts, vals = [], []
            for y in range(H):
                yf = (y - yt)/sh
                if not (ylo <= yf < yhi): continue
                for x in range(x0, x1):
                    if is_jumpsuit(px[x, y]):
                        pts.append((x, y)); vals.append(hsv(px[x, y])[2])
            if not pts: continue
            pivot = sum(vals)/len(vals)
            for (x, y) in pts:
                _, _, v = hsv(px[x, y])
                nv = max(0.0, min(1.0, tv + (v - pivot)))
                r, g, b = colorsys.hsv_to_rgb(th, ts, nv)
                px[x, y] = (int(r*255), int(g*255), int(b*255), px[x, y][3])
                n += 1
    return n

# ── driver ───────────────────────────────────────────────────────────────────
def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const hisoka"); rest = src[i+10:]
    j = i+10 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    out = {}
    for m in re.finditer(r'frames:\s*(\d+)[^}]*?width:\s*(\d+)[^}]*?sheet:\s*"\./(hisoka_[^"]+)"', block):
        fr, wd, sh = m.groups(); out[sh] = int(wd)
    return out

def process(name, fw, cfg, tag):
    img = Image.open(os.path.join(ROOT, name)).convert("RGBA")
    img._fw = fw
    # Sash: capture coords AFTER the emblem recolor (so the black emblem's lower pixels, which overlap
    # the top of the waist band, aren't mistaken for sash) but BEFORE the jumpsuit recolor (so a
    # red/magenta recoloured jumpsuit isn't grabbed) — then apply LAST (so a dark→near-gray sash isn't
    # re-grabbed by the jumpsuit gray-shading branch). See detect_sash/apply_sash.
    e = recolor_emblem(img, cfg["emblem"]) if cfg["emblem"] else 0
    sash_pts = detect_sash(img) if cfg["sash"] else []
    s = recolor_shoes(img, cfg["shoes"]) if cfg["shoes"] else 0
    j = recolor_jumpsuit(img, cfg["jumpsuit"])
    a = apply_sash(img, sash_pts, cfg["sash"]) if cfg["sash"] else 0
    # COORDINATED hair (last): recolour the base-derived hair coords to the outfit-matched colour. The
    # mask comes from the untouched base sheet (identical geometry); the outfit passes above never touch
    # the hair region, so the mask still lands on the (still-orange) hair. Multi-tone shading preserved.
    h = 0
    if cfg.get("hair"):
        base = Image.open(os.path.join(ROOT, name)).convert("RGBA")
        h = recolor_hair(img, hair_mask(base, fw), fw, cfg["hair"])
    stem = name[:-4]
    img.save(os.path.join(ROOT, f"{stem}__{tag}.png"))
    return e, s, j, a, h

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in SKINS:
        print(f"usage: {sys.argv[0]} <{'|'.join(SKINS)}> [sheet-substr]"); sys.exit(1)
    tag = sys.argv[1]; cfg = SKINS[tag]
    only = sys.argv[2] if len(sys.argv) > 2 else None
    sheets = wired_sheets()
    for name, fw in sorted(sheets.items()):
        if only and only not in name: continue
        e, s, j, a, h = process(name, fw, cfg, tag)
        print(f"  emblem={e:3d}  shoe={s:3d}  sash={a:3d}  hair={h:3d}  jumpsuit={j:4d}  {name}")
    if not only or "portrait" in only:
        e, s, j, a, h = process("hisoka_portrait.png", 81, cfg, tag)
        print(f"  emblem={e:3d}  shoe={s:3d}  sash={a:3d}  hair={h:3d}  jumpsuit={j:4d}  hisoka_portrait.png")
    print(f"DONE ({tag})")

if __name__ == "__main__":
    main()
