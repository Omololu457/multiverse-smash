#!/usr/bin/env python3
"""Batman / Dark Knight (rosterKey dark_knight) — 8 coordinated palette recolors + Void Sovereign
   + Batman Beyond homage (PALETTE-ONLY approximation of the black+red alternate design).

★ HEALTH-CHECKED against the REAL sprite (histogram/mask scan, NOT just the prompt's region note):
  * SUIT  = the grey body-suit (chest/arms/legs). Renders as a mid GREY plus a blue-tinted mid-shadow
            (avg neutral ~104,104,104; blue-grey shadow ~34,34,48). Both folded into SUIT so a recolor
            moves the whole body coherently. This is the MAIN recolor surface. PAINTABLE (primary).
            Class: low-saturation OR blue-tinted, value in a MID band (v>=0.16). paint() preserves the
            light/dark spread so cloth shading survives.
  * BLACK = cape/cowl/gloves/boots — the darkest pixels (v<0.16). PROTECTED silhouette (keeps the
            Batman read) for every skin EXCEPT Void (which crushes everything) and Batman Beyond
            (where BLACK stays black — that homage IS a black suit — and the accent turns red).
  * BELT  = the yellow utility-belt accent (avg ~206,156,58; h~40-60 s>=0.5). PAINTABLE (accent) — each
            skin coordinates it to the suit theme.
  * SKIN  = exposed jaw/chin/mouth (avg ~201,148,111; h 10-30, s>=0.32, v>=0.45). PROTECTED (never
            painted) so the face stays human under every recolor.
  * OTHER = residual anti-alias / halo speckle. Classified OTHER and NEVER painted.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  SUIT · BELT   (paintable)     |     BLACK · SKIN · OTHER   (protected)

USAGE: gen_dark_knight_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "dark_knight_air_uniform.png", "dark_knight_crescent_uniform.png", "dark_knight_crouch_uniform.png",
    "dark_knight_crouchlight_uniform.png", "dark_knight_dive_uniform.png", "dark_knight_dodge_uniform.png",
    "dark_knight_flail_uniform.png", "dark_knight_glide_uniform.png", "dark_knight_grapple_uniform.png",
    "dark_knight_heavy_uniform.png", "dark_knight_hurt_uniform.png", "dark_knight_idle_uniform.png",
    "dark_knight_knockdown_uniform.png", "dark_knight_light_uniform.png", "dark_knight_mechattack_uniform.png",
    "dark_knight_mechidle_uniform.png", "dark_knight_mechwire_uniform.png", "dark_knight_pistol_uniform.png",
    "dark_knight_rageidle_uniform.png", "dark_knight_ragetransform_uniform.png", "dark_knight_walk_uniform.png",
    "dark_knight_win_uniform.png",
]
PORTRAIT = "dark_knight_portrait.png"

def classify(h, s, v):
    # SKIN first (protect exposed jaw/chin) — warm tan, mid-value
    if 8 <= h <= 34 and s >= 0.32 and v >= 0.45:       return "SKIN"
    # BELT — yellow/amber utility belt accent
    if 35 <= h <= 65 and s >= 0.45 and v >= 0.35:      return "BELT"
    # BLACK — cape/cowl/gloves/boots: the darkest pixels (protected silhouette)
    if v < 0.16:                                        return "BLACK"
    # SUIT — the grey body-suit + its blue-tinted mid-shadow (low sat OR bluish), mid value
    if v >= 0.16 and (s < 0.35 or 200 <= h <= 280):     return "SUIT"
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.12):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.04, round(tv * 0.28, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
    """Re-centre a region on the target hue+value, preserving its own light/dark SPREAD (keeps cloth shading)."""
    if not spec or not pts: return 0
    hexcol, to_sat, floor, spread = spec
    tr, tg, tb = hex2rgb(hexcol)
    th, _ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, to_sat, nv)
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

def void_paint(px, pts):
    """Void Part A: crush a region to near-black keeping a whisper of shading + a faint cool tint."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])

# ── skin table — suit (primary grey) + belt (yellow accent). black/skin PROTECTED. void + beyond special. ──
SKINS = {
    # ── Group 1 ──
    "crimsonknight":       dict(suit=S("#8A1418"), belt=S("#1A1A1A"), note="crimson suit / black accent"),
    "verdantguardian":     dict(suit=S("#1E7A3C"), belt=S("#0F3D22"), note="green suit / dark-green accent"),
    "obsidianknight":      dict(suit=S("#3A3A3A"), belt=S("#8A8A8A"), note="charcoal suit / grey accent (monochrome)"),
    "goldensentinel":      dict(suit=S("#B8860B"), belt=S("#1A1A1A"), note="gold suit / black accent"),
    # ── Group 2 ──
    "azurevigilante":      dict(suit=S("#1C4FA6"), belt=S("#14264F"), note="blue suit / navy accent"),
    "violetnightfall":     dict(suit=S("#6A2AA6"), belt=S("#1A1A1A"), note="violet suit / black accent"),
    "emberknight":         dict(suit=S("#C24A12"), belt=S("#5E3212"), note="burnt-orange suit / brown accent"),
    "frostboundsentinel":  dict(suit=S("#BFE2F5"), belt=S("#F2F6FA"), note="pale ice-grey suit / white accent"),
    # ── Specialty ──
    "voidsovereign":       dict(void=True, note="full near-black incl. cape + drifting shadow/smoke tendril overlay (game.js)"),
    # ── Homage: Batman Beyond (PALETTE-ONLY approximation of the black+red alternate design) ──
    # Real Batman Beyond = black suit with a red bat-emblem. We have NO emblem geometry on this grey/cowl
    # sheet, so this is a palette approximation only: SUIT (grey body) -> near-black to read as the black
    # suit, BLACK cape/cowl KEPT black, BELT/accent -> bright red to stand in for the red emblem/trim.
    "batmanbeyond":        dict(suit=S("#141416"), belt=S("#C41220"),
                                note="HOMAGE Batman Beyond (palette approx, NOT silhouette): grey suit->black, accent->red"),
}
DISPLAY = {
    "crimsonknight": "Crimson Knight", "verdantguardian": "Verdant Guardian",
    "obsidianknight": "Obsidian Knight", "goldensentinel": "Golden Sentinel",
    "azurevigilante": "Azure Vigilante", "violetnightfall": "Violet Nightfall",
    "emberknight": "Ember Knight", "frostboundsentinel": "Frostbound Sentinel",
    "voidsovereign": "Void Sovereign", "batmanbeyond": "Batman Beyond",
}
ORDER = ["crimsonknight", "verdantguardian", "obsidianknight", "goldensentinel",
         "azurevigilante", "violetnightfall", "emberknight", "frostboundsentinel",
         "voidsovereign", "batmanbeyond"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("SUIT", "BELT", "BLACK", "SKIN", "OTHER")}
    for y in range(H):
        for x in range(W):
            if px[x, y][3] < 16: continue
            r, g, b, _ = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            reg[classify(h, s, v)].append((x, y))
    return px, reg

def recolor(src, out, tag):
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA")
    px, reg = _regions(im)
    spec = SKINS[tag]
    if spec.get("void"):
        for k in reg: void_paint(px, reg[k])
    else:
        paint(px, reg["SUIT"], spec.get("suit"))
        paint(px, reg["BELT"], spec.get("belt"))
        # BLACK / SKIN / OTHER protected (untouched)
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "dark_knight_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"SUIT": (150, 150, 150), "BELT": (240, 200, 30), "BLACK": (20, 20, 20),
            "SKIN": (250, 170, 120), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "dark_knight_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ dark_knight_skin_mask_debug_8x.png  (SUIT=grey BELT=yellow BLACK=black SKIN=peach MAGENTA=OTHER[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("dark_knight_idle_uniform.png"))]
    for tag in ORDER:
        recolor("dark_knight_idle_uniform.png", f"dark_knight_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"dark_knight_idle_uniform__{tag}.png")))
    cols = 5; cw, ch = 120, 150; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min((cw - 12) / cell.width, (ch - 12) / cell.height, 3.0)
        rs = cell.resize((max(1, round(cell.width * sc)), max(1, round(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "dark_knight_skins_preview.png"))
    print(f"→ dark_knight_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

def build_all():
    for tag in ORDER:
        for sh in SHEETS:
            recolor(sh, sh.replace(".png", f"__{tag}.png"), tag)
        recolor(PORTRAIT, PORTRAIT.replace(".png", f"__{tag}.png"), tag)
        print(f"  built {tag}: {len(SHEETS)} sheets + portrait")
    print(f"OK — {len(ORDER)} skins × ({len(SHEETS)} sheets + portrait)")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "probe": probe()
    elif mode == "preview": preview()
    elif mode in SKINS:
        for sh in SHEETS: recolor(sh, sh.replace(".png", f"__{mode}.png"), mode)
        recolor(PORTRAIT, PORTRAIT.replace(".png", f"__{mode}.png"), mode); print(f"built {mode}")
    else: build_all()
