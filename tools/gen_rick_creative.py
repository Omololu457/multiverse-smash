#!/usr/bin/env python3
"""Generate Rick's 8 creative colour skins (per-region: HAIR / COAT / SHIRT / PANTS).

Rick's regions and how each is isolated (measured from rick_stand.png; face/skin EXCLUDED everywhere):
  HAIR  iconic light-blue  → hue 188-218, sat>=0.30 (distinct from the teal shirt's hue<=186; a warm
        skin/beige has hue 20-70 so never matches). No spatial band needed — the hue is unique.
  SHIRT teal collar/chest  → hue 150-186, sat>=0.28 (below hair's hue, above neutral coat's sat).
  COAT  white/gray lab coat→ NEUTRAL (sat<0.12, val>0.45) within a TORSO band, so it excludes the warm
        beige face/hands (sat>=0.12, warm hue) AND the white eye-sclera/teeth (above the band). Rick's
        coat and skin share a near-neutral profile, so the band is what separates them.
  PANTS brown              → hue 26-54, sat>=0.45 (sat-separated from the warm-but-desaturated skin),
        lower band.
All four masks are CAPTURED FIRST (from the original), THEN recoloured — so a neutral/white target for
one region can't be re-grabbed by another region's pass (cross-region-regrab guard). Multi-tone (to-tone)
recolour preserves each region's own light/dark shading. Cosmetic only.
"""
import sys, os, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── per-skin configs (hair / coat / shirt spec'd by the user; pants COORDINATED to the theme) ──
SKINS = {
    "mortynightmare": dict(hair="#5A2E8F", coat="#6A3A9F", shirt="#C9A0D4", pants="#3A2060"),  # purple
    "portalfluid":    dict(hair="#5FA83B", coat="#A8C98A", shirt="#3A6B2E", pants="#2E4A22"),  # green
    "redalert":       dict(hair="#8F2A2A", coat="#A83A3A", shirt="#F0EEE8", pants="#5A1A1A"),  # red
    "cosmicblue":     dict(hair="#2A4D8F", coat="#3A5DA0", shirt="#C0D8F0", pants="#1E3560"),  # blue
    "lavendermatter": dict(hair="#B8A0D4", coat="#D4C4E8", shirt="#F0F0F0", pants="#8870A8"),  # lavender
    "goldenrick":     dict(hair="#C9922E", coat="#EDE0C0", shirt="#3B2A14", pants="#7A5A2A"),  # gold
    "voidwalker":     dict(hair="#2A2A2A", coat="#3A3A3A", shirt="#F0EEE8", pants="#1A1A1A"),  # black
    "pinkmatter":     dict(hair="#D45A8C", coat="#E8B8CC", shirt="#F0EEE8", pants="#8F3A5F"),  # pink
    # VOID FORM — the ONE skin that recolours EVERYTHING incl. face/skin (concept: his whole form is a
    # void). Not per-region: every opaque pixel → deep near-black, with a faint luma gradient kept so the
    # silhouette's internal form stays barely readable. The starfield is a separate canvas overlay (Part 2).
    "voidform":       dict(void="#0A0A0F"),
    # PORTAL VOID — same full-form near-black treatment as Void Form (a hair below it in tone), but a
    # DIFFERENT Part-2 overlay: vivid portal-green swirling spiral wisps (game.js drawPortalVoidOverlay)
    # rather than the cool starfield. Base kept a touch lighter (#0F0F12) so the green reads as a portal
    # glowing THROUGH the silhouette rather than off a pure-black Void Form.
    "portalvoid":     dict(void="#0F0F12"),
}

def hsv(p):
    r, g, b, _ = p
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return h*360, s, v

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# ── region predicates ─────────────────────────────────────────────────────────
def is_hair(p):
    if p[3] < 128: return False
    H, s, v = hsv(p); return 188 <= H <= 218 and s >= 0.30 and v > 0.22
def is_shirt(p):
    if p[3] < 128: return False
    H, s, v = hsv(p); return 150 <= H <= 186 and s >= 0.28 and v > 0.22
def is_coat(p):
    if p[3] < 128: return False
    H, s, v = hsv(p); return s < 0.12 and v > 0.45          # neutral white/gray (band-scoped)
def is_pants(p):
    if p[3] < 128: return False
    H, s, v = hsv(p); return 26 <= H <= 54 and s >= 0.45 and v > 0.15

def frame_bbox(px, x0, x1, W, H):
    ys = [y for y in range(H) for x in range(x0, x1) if px[x, y][3] >= 128]
    return (min(ys), max(ys)) if ys else None

def mask_of(img, fw, pred, band):
    """Per-frame coord set where pred holds, optionally within silhouette y-frac band (lo,hi)."""
    px = img.load(); W, H = img.size
    out = set()
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        bb = frame_bbox(px, x0, x1, W, H)
        if not bb: continue
        yt, yb = bb; sh = yb - yt + 1
        for y in range(H):
            if band and not (band[0] <= (y - yt)/sh < band[1]): continue
            for x in range(x0, x1):
                if pred(px[x, y]): out.add((x, y))
    return out

def paint(img, fw, mask, hexcol):
    """Multi-tone recolour of a coord mask, per-frame pivot (preserves local shading spread)."""
    if not mask: return 0
    px = img.load(); W, H = img.size
    tr, tg, tb = hex2rgb(hexcol); th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
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
            px[x, y] = (int(r*255), int(g*255), int(b*255), px[x, y][3]); n += 1
    return n

# torso/pants bands differ between the sprite (full body) and the pfp (headshot: coat/collar only at
# the very bottom, no legs).
BANDS_SPRITE = dict(coat=(0.36, 0.82), shirt=(0.33, 0.64), pants=(0.55, 1.0))
BANDS_PFP    = dict(coat=(0.80, 1.0),  shirt=(0.70, 1.0),  pants=None)

def void_flatten(img, hexcol):
    """Recolour EVERY opaque pixel to `hexcol`, luma-scaled into a very dark range so the silhouette's
    internal form stays faintly readable (not a flat blob). Includes face/skin — void-form only."""
    px = img.load(); W, H = img.size
    tr, tg, tb = hex2rgb(hexcol); th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            luma = (0.299*r + 0.587*g + 0.114*b) / 255.0
            nv = 0.03 + 0.07 * luma                       # val 0.03-0.10: near-black, faint gradient
            rr, gg, bb = colorsys.hsv_to_rgb(th, ts, nv)
            px[x, y] = (int(rr*255), int(gg*255), int(bb*255), a); n += 1
    return n

def process(name, fw, cfg, tag, pfp=False):
    img = Image.open(os.path.join(ROOT, name)).convert("RGBA")
    if cfg.get("void"):
        v = void_flatten(img, cfg["void"])
        img.save(os.path.join(ROOT, f"{name[:-4]}__{tag}.png"))
        return v, 0, 0, 0
    B = BANDS_PFP if pfp else BANDS_SPRITE
    # capture masks FIRST (from original), then paint — cross-region-regrab guard
    mh = mask_of(img, fw, is_hair, None)
    ms = mask_of(img, fw, is_shirt, B["shirt"])
    mc = mask_of(img, fw, is_coat, B["coat"])
    mp = mask_of(img, fw, is_pants, B["pants"]) if B["pants"] else set()
    h = paint(img, fw, mh, cfg["hair"])
    s = paint(img, fw, ms, cfg["shirt"])
    c = paint(img, fw, mc, cfg["coat"])
    p = paint(img, fw, mp, cfg["pants"])
    stem = name[:-4]
    img.save(os.path.join(ROOT, f"{stem}__{tag}.png"))
    return h, c, s, p

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const rick"); rest = src[i+10:]
    j = i+10 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    out = {}
    for m in re.finditer(r'frames:\s*(\d+)[^}]*?width:\s*(\d+)[^}]*?sheet:\s*"\./(rick_[^"]+)"', block):
        fr, wd, sh = m.groups(); out[sh] = int(wd)
    return out

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in SKINS:
        print(f"usage: {sys.argv[0]} <{'|'.join(SKINS)}> [sheet-substr]"); sys.exit(1)
    tag = sys.argv[1]; cfg = SKINS[tag]
    only = sys.argv[2] if len(sys.argv) > 2 else None
    for name, fw in sorted(wired_sheets().items()):
        if only and only not in name: continue
        h, c, s, p = process(name, fw, cfg, tag)
        print(f"  hair={h:4d} coat={c:4d} shirt={s:4d} pants={p:4d}  {name}")
    # PORTRAIT thumbnail: crop a clean standing frame from the recolored stand sheet (the pfp headshot
    # has a light background inseparable from the white coat, so a full-body sprite crop is used instead —
    # it also shows every recoloured region: hair/coat/shirt/pants).
    if not only or "portrait" in only:
        stand = Image.open(os.path.join(ROOT, f"rick_stand__{tag}.png")).convert("RGBA")
        f0 = stand.crop((0, 0, 30, stand.height))
        bb = f0.getbbox()
        if bb: f0 = f0.crop((max(0, bb[0]-2), max(0, bb[1]-2), min(f0.width, bb[2]+2), min(f0.height, bb[3]+2)))
        f0 = f0.resize((f0.width*3, f0.height*3), Image.NEAREST)
        f0.save(os.path.join(ROOT, f"rick_portrait__{tag}.png"))
        print(f"  portrait -> rick_portrait__{tag}.png {f0.size}")
    print(f"DONE ({tag})")

if __name__ == "__main__":
    main()
