#!/usr/bin/env python3
"""Iron Man 2 (Data East 1991 arcade, bulky proportions) — 8 coordinated palette recolors + Void Sovereign
   + War Machine homage. Independent hex from Iron Man (1)/(3) (same skin NAMES, distinct values — this trio
   is the roster's highest duplicate-risk pairing).

★ HEALTH-CHECKED against the REAL sprite (histogram/mask scan):
  * RED   = main armour plating (~32%): shoulders, upper arms, chest sides, lower legs/boots. h>=328 or
            h<=18, s>=0.45. Bright/saturated (Data East palette) — PAINTABLE (primary).
  * GOLD  = faceplate + chest core + forearms/gloves + abdomen + thigh plates (~18%, MORE prominent than
            IM1). Strong amber h ~24-58, s>=0.35. PAINTABLE (accent).
  * DARK  = thick black plate linework + the ground contact-shadow (~49%): v<0.18. PROTECTED (keeps the
            bulky silhouette + shadow). Void crushes all. This sprite is clean — NO lavender noise.
  No exposed skin, no baked energy-FX on the body (repulsor bolts are procedural in game.js).

PAINTABLE: RED · GOLD    |    PROTECTED: DARK · OTHER
USAGE: gen_iron_man_2_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "iron_man_2_idle_uniform.png", "iron_man_2_walk_uniform.png", "iron_man_2_run_uniform.png",
    "iron_man_2_runcrouch_uniform.png", "iron_man_2_jump_uniform.png", "iron_man_2_air_uniform.png",
    "iron_man_2_crouch_uniform.png", "iron_man_2_crouchthrust_uniform.png", "iron_man_2_hurt_uniform.png",
    "iron_man_2_knockdown_uniform.png", "iron_man_2_getup_uniform.png", "iron_man_2_light_uniform.png",
    "iron_man_2_heavy_uniform.png", "iron_man_2_up_uniform.png", "iron_man_2_rush1_uniform.png",
    "iron_man_2_rush2_uniform.png", "iron_man_2_rush3_uniform.png", "iron_man_2_repulsor_uniform.png",
    "iron_man_2_whht_uniform.png", "iron_man_2_groundslam_uniform.png", "iron_man_2_win_uniform.png",
]
PORTRAIT = "iron_man_2_portrait.png"

def classify(h, s, v):
    if v < 0.18 and s < 0.62:                          return "DARK"   # black linework + ground shadow (protected)
    if 20 <= h <= 60 and s >= 0.35 and v >= 0.30:      return "GOLD"   # amber/gold accent
    if (h >= 328 or h < 20) and s >= 0.45 and v >= 0.18: return "RED"  # red plating
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.12):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.04, round(tv * 0.28, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
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
    if not pts: return
    vals = [(xy, colorsys.rgb_to_hsv(px[xy[0], xy[1]][0]/255, px[xy[0], xy[1]][1]/255, px[xy[0], xy[1]][2]/255)[2]) for xy in pts]
    vv = sorted(v for _, v in vals); thr = vv[int(len(vv) * cut)]
    paint(px, [xy for xy, v in vals if v < thr], dark_spec)
    paint(px, [xy for xy, v in vals if v >= thr], bright_spec)

def void_paint(px, pts):
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])

# ── skin table — INDEPENDENT hex from IM1 (distinct values, same family names). ──
SKINS = {
    # ── Group 1 ── (IM2 = the BRIGHTER/WARMER tone profile of the trio — distinct from IM1 baseline & IM3 deep)
    "crimsonoverdrive": dict(red=S("#B01822"), gold=S("#1C1C1C"), note="bright crimson plate / near-black accent"),
    "verdantcircuit":   dict(red=S("#33A64F"), gold=S("#0C4A28"), note="bright green plate / dark-green accent"),
    "obsidianmark":     dict(red=S("#3A3A3A"), gold=S("#B4B4B4"), note="mid-charcoal plate / light-grey accent (monochrome)"),
    "goldencore":       dict(red=S("#E0A82A"), gold=S("#7A4A16"), note="bright amber plate / bronze accent"),
    # ── Group 2 ──
    "azurerepulsor":    dict(red=S("#2E6FE0"), gold=S("#12244F"), note="bright blue plate / navy accent"),
    "violetextremis":   dict(red=S("#8A3AD8"), gold=S("#1A1A1A"), note="bright violet plate / black accent"),
    "frostboundmark":   dict(red=S("#DDF0FF"), gold=S("#FFFFFF"), note="near-white ice plate / white accent"),
    "embercore":        dict(red=S("#E8631A"), gold=S("#52260C"), note="hot burnt-orange plate / dark-brown accent"),
    # ── Specialty ──
    "voidsovereign":    dict(void=True, note="full near-black + drifting circuit/data-line overlay (game.js drawIronMan2VoidAuraOverlay)"),
    # ── Homage: War Machine (real documented armour, repurposed for James Rhodes) ──
    # gunmetal-grey plating (red -> gunmetal) + red/white accent stripes replacing the gold (value-split:
    # dark gold -> crimson accent, bright gold -> white stripe). The strongest, most distinct alternate in
    # the trio — clear silhouette-read change from red/gold.
    "warmachine":       dict(warmachine=True,
                             red=S("#41464D"),                   # gunmetal-grey plate
                             gold_dark=S("#8A1418"),             # accent -> crimson red
                             gold_bright=S("#E8ECEF", floor=0.55, spread=1.0),  # accent highlight -> white stripe
                             note="HOMAGE War Machine: gunmetal-grey plate, red/white accent stripes"),
}
DISPLAY = {
    "crimsonoverdrive": "Crimson Overdrive", "verdantcircuit": "Verdant Circuit",
    "obsidianmark": "Obsidian Mark", "goldencore": "Golden Core",
    "azurerepulsor": "Azure Repulsor", "violetextremis": "Violet Extremis",
    "frostboundmark": "Frostbound Mark", "embercore": "Ember Core",
    "voidsovereign": "Void Sovereign", "warmachine": "War Machine",
}
ORDER = ["crimsonoverdrive", "verdantcircuit", "obsidianmark", "goldencore",
         "azurerepulsor", "violetextremis", "frostboundmark", "embercore", "voidsovereign", "warmachine"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("RED", "GOLD", "DARK", "OTHER")}
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
    elif spec.get("warmachine"):
        paint(px, reg["RED"], spec.get("red"))
        paint_split(px, reg["GOLD"], spec.get("gold_dark"), spec.get("gold_bright"), cut=0.74)
    else:
        paint(px, reg["RED"],  spec.get("red"))
        paint(px, reg["GOLD"], spec.get("gold"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "iron_man_2_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"RED": (220, 40, 40), "GOLD": (240, 200, 30), "DARK": (20, 20, 20), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "iron_man_2_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ iron_man_2_skin_mask_debug_8x.png")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("iron_man_2_idle_uniform.png"))]
    for tag in ORDER:
        recolor("iron_man_2_idle_uniform.png", f"iron_man_2_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"iron_man_2_idle_uniform__{tag}.png")))
    cols = 5; cw, ch = 120, 150; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min((cw - 12) / cell.width, (ch - 12) / cell.height, 2.6)
        rs = cell.resize((max(1, round(cell.width * sc)), max(1, round(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "iron_man_2_skins_preview.png"))
    print(f"→ iron_man_2_skins_preview.png  ({len(tiles)} tiles)")

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
