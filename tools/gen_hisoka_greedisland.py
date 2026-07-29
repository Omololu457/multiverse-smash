#!/usr/bin/env python3
"""Generate Hisoka's "Greed Island Outfit" alt-color skin (__greedisland.png sheets).

Reference-sampled, PALETTE-mostly recolor via tools/recolor_palette.py (targeted per-region
replacement — NOT hue-rotate) + two PER-FRAME spatial edits (emblem erase, shoe recolor). Cosmetic.

PIPELINE per sheet (order matters), all per-frame ops use each frame's own silhouette bbox:
  1. EMBLEM ERASE (per-frame inpaint): the base sprite inherits Hisoka's chest heart+diamond
     emblem, which the reference outfit does NOT have. Detect the embedded pink/red clusters in
     the chest band (silhouette y-frac [0.27,0.44)) and fill each pixel from its nearest teal/gray
     jumpsuit neighbour (local shading preserved) so it later recolors to lavender with the torso.
     KEPT: the waist sash (y-frac >= 0.44), a 1px neck stray (< 0.27), and any non-embedded /
     large edge pink (Bungee-Gum aura) — those are not the emblem.
  2. SASH + emblem-residue pink -> dusty rose #D98BA0 (hue 315-355 sat>=.40).
  3. HAIR orange -> red #C93B3B (hue 8-52 sat>=.60; min-sat .60 excludes sat-.50 skin -> 0 bleed).
  4. SHOE RECOLOR (per-frame): bottom band (y-frac >= .88) gray shoe pixels (sat<.08, val .22-.68)
     -> rose pink #E091A8. Runs BEFORE the jumpsuit pass so the still-TEAL pants (sat>=.09) don't
     collide with the shoe's near-gray selection; the recolored rose shoe (hue ~344) is then
     invisible to the teal jumpsuit pass.
  5. JUMPSUIT torso+legs teal -> pale lavender-white #E6E0F0 (hue 95-175 sat .09-.60; min-sat .09
     also catches the dark shaded torso tank so the whole one-piece reads uniform).

KNOWN CONTENT GAP (NOT attempted — reported to the user): the reference's pink undershirt/crop-top
peeking at the neckline is NEW art that exists nowhere in the base sprite; no image-gen in this
pipeline, so it is deferred rather than faked with a flat shape.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import apply_recolor, _NS
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
TAG = "greedisland"

# ── color predicates (on 0-255 RGBA tuples) ──────────────────────────────────
def hsv(p):
    r, g, b, _ = p
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return h*360, s, v

def is_pink(p):
    if p[3] < 128: return False
    H, s, v = hsv(p)
    return (H >= 300 or H <= 22) and s > 0.45 and v > 0.35

def is_gold(p):        # bright warm emblem gold — above skin's saturation so faces stay untouched
    if p[3] < 128: return False
    H, s, v = hsv(p)
    return 18 <= H <= 52 and s > 0.62 and v > 0.40

def is_emblem_color(p):
    return is_pink(p) or is_gold(p)

def is_jumpsuit(p):        # teal garment OR gray shading (fill source), never black/ skin / pink
    if p[3] < 128: return False
    H, s, v = hsv(p)
    if v < 0.15: return False                      # black outline
    return (100 <= H <= 175 and s >= 0.09) or (s < 0.12 and 0.20 <= v <= 0.70)

def is_skin(p):
    if p[3] < 128: return False
    H, s, v = hsv(p)
    return 18 <= H <= 52 and 0.20 <= s <= 0.62 and v > 0.55

def is_recolored_garment(p):
    """Post-recolor jumpsuit body: lavender (recolored teal) OR the gray shading that survives."""
    if p[3] < 128: return False
    H, s, v = hsv(p)
    if v < 0.15: return False
    return s < 0.20 and 0.22 <= v <= 0.98          # near-neutral lavender/gray torso

# ── per-frame helpers ────────────────────────────────────────────────────────
def frame_bbox(px, x0, x1, W, H):
    ys = [y for y in range(H) for x in range(x0, x1) if px[x, y][3] >= 128]
    return (min(ys), max(ys)) if ys else None

def components(px, x0, x1, W, H, pred):
    seen = set(); out = []
    for y in range(H):
        for x in range(x0, x1):
            if (x, y) in seen or not pred(px[x, y]): continue
            st = [(x, y)]; seen.add((x, y)); cc = []
            while st:
                cx, cy = st.pop(); cc.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx+dx, cy+dy
                        if x0 <= nx < x1 and 0 <= ny < H and (nx, ny) not in seen and pred(px[nx, ny]):
                            seen.add((nx, ny)); st.append((nx, ny))
            out.append(cc)
    return out

def nearest_jumpsuit(px, x, y, W, H):
    for rad in range(1, 8):
        best = None
        for dy in range(-rad, rad+1):
            for dx in range(-rad, rad+1):
                if max(abs(dx), abs(dy)) != rad: continue
                nx, ny = x+dx, y+dy
                if 0 <= nx < W and 0 <= ny < H and is_jumpsuit(px[nx, ny]):
                    d = dx*dx + dy*dy
                    if best is None or d < best[0]:
                        best = (d, px[nx, ny])
        if best: return best[1]
    return (115, 148, 140, 255)   # mid-teal fallback -> becomes lavender

def diffusion_inpaint(px, holes, W, H):
    """Fill `holes` by diffusing surrounding jumpsuit colour inward (boundary-average passes).
    Reproduces the torso's local shading gradient across the hole instead of a flat patch."""
    holes = set(holes); newcol = {}; pending = set(holes)
    dirs = [(-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)]
    for _ in range(400):
        if not pending: break
        progressed = False
        for (x, y) in list(pending):
            acc = []
            for dx, dy in dirs:
                nx, ny = x+dx, y+dy
                if not (0 <= nx < W and 0 <= ny < H): continue
                if (nx, ny) in pending: continue           # still-empty hole
                src = newcol.get((nx, ny))
                if src is None:
                    if (nx, ny) in holes: continue         # hole not yet filled
                    if is_jumpsuit(px[nx, ny]): src = px[nx, ny]
                if src is not None: acc.append(src)
            if acc:
                r = sum(c[0] for c in acc)//len(acc)
                g = sum(c[1] for c in acc)//len(acc)
                b = sum(c[2] for c in acc)//len(acc)
                newcol[(x, y)] = (r, g, b, 255); pending.discard((x, y)); progressed = True
        if not progressed: break
    for (x, y) in holes:
        px[x, y] = newcol.get((x, y), (115, 148, 140, 255))

def erase_emblem(img):
    """Per-frame: erase the chest heart+diamond (its pink AND gold parts) and diffusion-fill it
    with the local jumpsuit shading, so it later recolors to lavender with the torso.

    Robust region-detection: within the chest band (silhouette y-frac [0.26,0.46)) take the
    connected components of emblem-coloured pixels (pink/red OR bright gold), and erase a component
    only if it is SEEDED by an embedded pink pixel (>=2 jumpsuit neighbours) and its centroid sits
    at y-frac [0.27,0.45). Seeding from pink and growing through pink+gold captures the whole emblem
    (its gold accents are contiguous with its pink core) while EXCLUDING: the HAIR (gold, above the
    band, no embedded pink), the raised ARM (pure gold, separated from the emblem by teal/outline —
    a different component), the waist SASH (pink but centroid y-frac >= .45), and the neck stray
    (< .26)."""
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
        # flood connected components of emblem-colour within the band
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
                cx_frac = (sum(xs)/len(cc) - x0)/fw            # horizontal centroid within the frame
                # the emblem is small, compact and torso-CENTRED; thrown cards / aura / the intro
                # bloodlust-bloom are wide, large, or off to the side → rejected by these guards.
                compact = bw <= 0.45*fw and bh <= 0.26*sh and len(cc) <= 0.12*fw*sh
                centred = 0.28 <= cx_frac <= 0.72
                if has_pink_seed and 0.27 <= vc_c < 0.45 and compact and centred:
                    holes.update(cc)
    diffusion_inpaint(px, holes, W, H)
    return len(holes)

def add_undershirt(img):
    """STOPGAP geometric approximation (opt-in): the reference outfit has a pink turtleneck
    undershirt peeking at the collar — content that exists NOWHERE in the base sprite, so it is
    SYNTHESISED, not sampled. Per frame, paint a 2px pink collar along the TOP contour of the torso
    wherever neck-skin sits directly above (hugs the neckline, skips the shoulders). Runs last, on the
    already-recolored lavender torso. Two tones (#D8789C body / #B46084 shadow) for a little depth.
    Reads as a deliberate placeholder, not finished pixel art."""
    px = img.load(); W, H = img.size
    fw = getattr(img, "_fw", W)
    LIT = (0xD8, 0x78, 0x9C); SHA = (0xB4, 0x60, 0x84)
    painted = 0
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        bb = frame_bbox(px, x0, x1, W, H)
        if not bb: continue
        yt, yb = bb; sh = yb - yt + 1
        # horizontal centre of the silhouette in this frame's collar band → keep the collar central
        band = [(x, y) for y in range(H) if 0.18 <= (y-yt)/sh <= 0.40
                       for x in range(x0, x1) if px[x, y][3] >= 128]
        if not band: continue
        cxs = [x for (x, y) in band if is_skin(px[x, y])]
        if not cxs: continue
        cx = sum(cxs)/len(cxs)                       # neck centre-x (from neck-skin)
        for x in range(x0, x1):
            if abs(x - cx) > 0.20*fw: continue        # central columns only (under the neck)
            # topmost recoloured-garment pixel of this column in the collar band
            ytop = None
            for y in range(H):
                if not (0.20 <= (y-yt)/sh <= 0.40): continue
                if is_recolored_garment(px[x, y]): ytop = y; break
            if ytop is None: continue
            # require neck-skin directly above (within 6px) → this is the collar, not a shoulder
            if not any(is_skin(px[x, yy]) for yy in range(max(0, ytop-6), ytop)): continue
            for k, y in enumerate((ytop, ytop+1)):
                if 0 <= y < H and px[x, y][3] >= 128 and is_recolored_garment(px[x, y]):
                    col = LIT if k == 0 else SHA
                    px[x, y] = (col[0], col[1], col[2], px[x, y][3]); painted += 1
    return painted

def recolor_shoes(img):
    """Per-frame: bottom-band gray shoe pixels -> rose pink #E091A8 (to-tone, keeps shading)."""
    px = img.load(); W, H = img.size
    fw = getattr(img, "_fw", W)
    n = 0
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        bb = frame_bbox(px, x0, x1, W, H)
        if not bb: continue
        yt, yb = bb; sh = yb - yt + 1
        vals = []
        pts = []
        for y in range(H):
            if (y - yt)/sh < 0.88: continue
            for x in range(x0, x1):
                p = px[x, y]
                if p[3] < 128: continue
                H_, s, v = hsv(p)
                if s < 0.08 and 0.22 <= v <= 0.68:
                    pts.append((x, y)); vals.append(v)
        if not pts: continue
        pivot = sum(vals)/len(vals)
        tr, tg, tb = 0xE0, 0x91, 0xA8
        th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
        for (x, y) in pts:
            _, _, v = hsv(px[x, y])
            nv = max(0.0, min(1.0, tv + (v - pivot)))   # preserve local shading spread
            r, g, b = colorsys.hsv_to_rgb(th, ts, nv)
            px[x, y] = (int(r*255), int(g*255), int(b*255), px[x, y][3])
            n += 1
    return n

# ── global recolor passes (from the shared tool) ─────────────────────────────
PASSES = [
    dict(mode="region", from_hue="315-355", min_sat=0.40, to_tone="#D98BA0"),                 # sash -> dusty rose
    dict(mode="region", from_hue="8-52",   min_sat=0.60, to_tone="#C93B3B"),                  # hair -> red
]
JUMPSUIT = dict(mode="region", from_hue="95-175", min_sat=0.09, max_sat=0.60, to_tone="#E6E0F0")

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const hisoka"); rest = src[i+10:]
    j = i+10 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    out = {}
    for m in re.finditer(r'frames:\s*(\d+)[^}]*?width:\s*(\d+)[^}]*?sheet:\s*"\./(hisoka_[^"]+)"', block):
        fr, wd, sh = m.groups(); out[sh] = int(wd)
    return out

def process(name, fw):
    img = Image.open(os.path.join(ROOT, name)).convert("RGBA")
    img._fw = fw
    e = erase_emblem(img)
    for opts in PASSES:
        img, _ = apply_recolor(img, _NS(**opts)); img._fw = fw
    s = recolor_shoes(img)
    img, _ = apply_recolor(img, _NS(**JUMPSUIT)); img._fw = fw
    u = add_undershirt(img)
    stem = name[:-4]
    img.save(os.path.join(ROOT, f"{stem}__{TAG}.png"))
    return e, s, u

def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    sheets = wired_sheets()
    for name, fw in sorted(sheets.items()):
        if only and only not in name: continue
        e, s, u = process(name, fw)
        print(f"  emblem={e:3d}  shoe={s:3d}  collar={u:3d}  {name}")
    # portrait (single frame)
    if not only or "portrait" in only:
        e, s, u = process("hisoka_portrait.png", 81)
        print(f"  emblem={e:3d}  shoe={s:3d}  collar={u:3d}  hisoka_portrait.png")
    print("DONE")

if __name__ == "__main__":
    main()
