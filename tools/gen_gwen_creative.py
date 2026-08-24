#!/usr/bin/env python3
"""Gwen (Ben 10 / Gwen Tennyson) — 8 coordinated palette recolors + Void Sovereign
   + Anodite "Lucky Girl" homage (real canon transformed mana state: purple skin, pink hair).

★ HEALTH-CHECKED against the REAL sprite (histogram/mask scan, NOT just the prompt's region note):
  * HAIR  = orange/ginger (h ~15-45, s>=0.45, v>=0.45). PAINTABLE (primary accent).
  * TOP    = blue jacket/shirt (h ~185-260, s>=0.30). PAINTABLE (primary).
  * PANTS  = dark purple/maroon lower body (h 260-350 OR low-v reddish, s>=0.25, v mid-low).
             PAINTABLE (coordinated darker accent).
  * WHITE  = collar / undershirt highlight (v>=0.80, s<=0.15). Protected by default (recolored only
             minimally via the pants/accent when a theme calls for it — kept natural here).
  * SKIN   = pale flesh (h ~15-40, s 0.15-0.45, v>=0.55). PROTECTED except Void + Anodite.
  * DARK   = black line-art / outline (v<0.22). PROTECTED (keeps silhouette) — Void crushes all.
  * OTHER  = anything else incl. any procedural mana-FX speckle → NEVER painted.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  HAIR · TOP · PANTS   (paintable)   |   SKIN · WHITE · DARK · OTHER   (protected)

USAGE: gen_gwen_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "gwen_blade_uniform.png", "gwen_cast_uniform.png", "gwen_crescent_uniform.png",
    "gwen_crouch_uniform.png", "gwen_crouchlight_uniform.png", "gwen_dash_uniform.png",
    "gwen_guard_uniform.png", "gwen_heavy_uniform.png", "gwen_hurt_uniform.png",
    "gwen_idle_uniform.png", "gwen_jump_uniform.png", "gwen_knockdown_uniform.png",
    "gwen_light_uniform.png", "gwen_run_uniform.png", "gwen_up_uniform.png",
    "gwen_walk_uniform.png", "gwen_win_uniform.png",
]
PORTRAIT = "gwen_portrait.png"

def classify(h, s, v):
    if v < 0.22 and s < 0.70:                            return "DARK"   # black line-art (protected)
    if v >= 0.80 and s <= 0.16:                          return "WHITE"  # collar / undershirt highlight
    # SKIN: pale peach flesh — low-mid sat warm hue, bright. Check BEFORE hair (hair is more saturated).
    if (0 <= h <= 45) and 0.12 <= s < 0.46 and v >= 0.55: return "SKIN"  # pale flesh (protected)
    # HAIR: saturated orange / ginger.
    if (8 <= h <= 46) and s >= 0.46 and v >= 0.30:        return "HAIR"  # orange/ginger hair (incl. dark shadow)
    # TOP: blue jacket / shirt.
    if (185 <= h <= 260) and s >= 0.28 and v >= 0.22:     return "TOP"   # blue top
    # PANTS: dark purple/maroon lower body.
    if ((260 <= h <= 360) or (0 <= h <= 8)) and s >= 0.22 and 0.16 <= v <= 0.70: return "PANTS"
    return "OTHER"                                                       # everything else → NEVER painted

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.12):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.04, round(tv * 0.28, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
    """Re-centre a region on the target hue+value, preserving its own light/dark SPREAD (keeps shading)."""
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

def paint_split(px, pts, dark_spec, bright_spec, cut=0.72):
    """Value-split a region: dim pixels -> dark_spec, brightest -> bright_spec."""
    if not pts: return
    vals = [(xy, colorsys.rgb_to_hsv(px[xy[0], xy[1]][0]/255, px[xy[0], xy[1]][1]/255, px[xy[0], xy[1]][2]/255)[2]) for xy in pts]
    vv = sorted(v for _, v in vals); thr = vv[int(len(vv) * cut)]
    paint(px, [xy for xy, v in vals if v < thr], dark_spec)
    paint(px, [xy for xy, v in vals if v >= thr], bright_spec)

def void_paint(px, pts):
    """Void Part A: crush a region to near-black keeping a whisper of shading + a faint cool tint."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])

# ── skin table — hair (accent) + top (primary) + pants (coordinated accent). skin/white/dark PROTECTED. ──
SKINS = {
    # ── Group 1 ──
    "crimsonmana":      dict(hair=S("#8A1418"), top=S("#5A0E10"), pants=S("#1A0808"), note="crimson hair / deep-red top / near-black pants (red+black)"),
    "verdantspark":     dict(hair=S("#2E9A44"), top=S("#124A22"), pants=S("#0B2A14"), note="green hair / dark-green top / darker green pants"),
    "obsidiananodite":  dict(hair=S("#9A9A9A"), top=S("#3A3A3A"), pants=S("#1E1E1E"), note="grey hair / dark-grey top / near-black pants (monochrome)"),
    "goldenaura":       dict(hair=S("#F0B92E"), top=S("#B8860B"), pants=S("#5E4410"), note="amber hair / gold top / bronze pants"),
    # ── Group 2 ──
    "azureclassic":     dict(hair=S("#E88A2A"), top=S("#1C4FA6"), pants=S("#14264F"), note="ginger hair kept / classic blue top / navy pants"),
    "violetreign":      dict(hair=S("#7A2AB0"), top=S("#3A1256"), pants=S("#150822"), note="violet hair / deep-violet top / near-black pants (violet+black)"),
    "frostboundspark":  dict(hair=S("#BFE2F5"), top=S("#7FB8E8"), pants=S("#4A78A8"), note="ice-blue hair / pale-blue top / steel-blue pants (ice/white)"),
    "embermana":        dict(hair=S("#E86A18"), top=S("#8A3A10"), pants=S("#3E1E0A"), note="bright-orange hair / burnt-orange top / brown pants"),
    # ── Specialty ──
    "voidsovereign":    dict(void=True, note="full near-black incl. skin + drifting pink/violet mana-mote overlay (game.js drawGwenVoidAuraOverlay)"),
    # ── Homage: Anodite / Lucky Girl (real canon mana form: purple skin, pink hair, pink eyes) ──
    "anodite":          dict(anodite=True,
                             skin=S("#7A3FA0"),          # skin -> Anodite purple
                             hair=S("#FF6FC0"),          # hair -> pink mana
                             top=S("#9A3FB0"),           # top folds into the purple/magenta mana body
                             pants=S("#4A1E66"),         # pants -> deep violet
                             note="HOMAGE Anodite 'Lucky Girl': purple skin, pink mana hair, magenta mana body"),
}
DISPLAY = {
    "crimsonmana": "Crimson Mana", "verdantspark": "Verdant Spark",
    "obsidiananodite": "Obsidian Anodite", "goldenaura": "Golden Aura",
    "azureclassic": "Azure Classic", "violetreign": "Violet Reign",
    "frostboundspark": "Frostbound Spark", "embermana": "Ember Mana",
    "voidsovereign": "Void Sovereign", "anodite": "Anodite / Lucky Girl",
}
ORDER = ["crimsonmana", "verdantspark", "obsidiananodite", "goldenaura",
         "azureclassic", "violetreign", "frostboundspark", "embermana", "voidsovereign", "anodite"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("HAIR", "TOP", "PANTS", "SKIN", "WHITE", "DARK", "OTHER")}
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
    elif spec.get("anodite"):
        paint(px, reg["SKIN"],  spec.get("skin"))   # skin -> purple (canon)
        paint(px, reg["HAIR"],  spec.get("hair"))   # hair -> pink mana
        paint(px, reg["TOP"],   spec.get("top"))
        paint(px, reg["PANTS"], spec.get("pants"))
    else:
        paint(px, reg["HAIR"],  spec.get("hair"))
        paint(px, reg["TOP"],   spec.get("top"))
        paint(px, reg["PANTS"], spec.get("pants"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "gwen_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"HAIR": (240, 140, 30), "TOP": (40, 90, 230), "PANTS": (150, 40, 160),
            "SKIN": (250, 210, 180), "WHITE": (245, 245, 245), "DARK": (20, 20, 20), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "gwen_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ gwen_skin_mask_debug_8x.png  (HAIR=orange TOP=blue PANTS=purple SKIN=peach WHITE=white DARK=black MAGENTA=OTHER[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("gwen_idle_uniform.png"))]
    for tag in ORDER:
        recolor("gwen_idle_uniform.png", f"gwen_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"gwen_idle_uniform__{tag}.png")))
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
    mont.save(os.path.join(ROOT, "gwen_skins_preview.png"))
    print(f"→ gwen_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
