#!/usr/bin/env python3
"""Iron Man 3 (GBA "Invincible Iron Man", chunky proportions) — 8 coordinated palette recolors + Void
   Sovereign + Mark 42 (Extremis) homage. Independent hex from IM1/IM2 (same NAMES, distinct values).

★ HEALTH-CHECKED against the REAL sprite (histogram/mask scan):
  * RED   = the armour plating (~76%). NOTE: this GBA sprite has NO pure-black outline — the linework is a
            dark MAROON self-shadow (h ~350-10, low v) folded into RED, so a red recolor repaints the edges
            coherently (dark edges become the dark shade of the new colour). h>=326 or h<20, s>=0.42. PAINTABLE.
  * GOLD  = faceplate + chest + forearms + abdomen + thigh plates (~23%). Amber/yellow h ~22-60, s>=0.30.
            PAINTABLE (accent).
  * PALE/OTHER = tiny pink/pale glints (<1%). Left untouched.
  The 3-tier charge FX + Super Laser/Nova are procedural draws in game.js (never skin-swapped).

PAINTABLE: RED · GOLD    |    PROTECTED: DARK(~0) · OTHER
USAGE: gen_iron_man_3_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "iron_man_3_idle_uniform.png", "iron_man_3_run_uniform.png", "iron_man_3_jump_uniform.png",
    "iron_man_3_air_uniform.png", "iron_man_3_down_air_uniform.png", "iron_man_3_crouch_uniform.png",
    "iron_man_3_crouchlight_uniform.png", "iron_man_3_hurt_uniform.png", "iron_man_3_knockdown_uniform.png",
    "iron_man_3_getup_uniform.png", "iron_man_3_light_uniform.png", "iron_man_3_heavy_uniform.png",
    "iron_man_3_up_uniform.png", "iron_man_3_super_move_uniform.png", "iron_man_3_super_move_air_uniform.png",
    "iron_man_3_intro_uniform.png", "iron_man_3_win_uniform.png",
]
PORTRAIT = "iron_man_3_portrait.png"

def classify(h, s, v):
    if v < 0.14 and s < 0.5:                           return "DARK"   # (~none on this sheet)
    if 22 <= h <= 62 and s >= 0.30 and v >= 0.30:      return "GOLD"   # amber/gold accent
    if (h >= 326 or h < 22) and s >= 0.40 and v >= 0.14: return "RED"  # red plating incl. maroon linework
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

def void_paint(px, pts):
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])

# ── skin table — INDEPENDENT hex from IM1/IM2 (distinct values, same family names). ──
SKINS = {
    # ── Group 1 ── (IM3 = the DEEPEST/COOLEST tone profile of the trio — distinct from IM1 baseline & IM2 bright)
    "crimsonoverdrive": dict(red=S("#560810"), gold=S("#242424"), note="very-dark crimson plate / near-black accent"),
    "verdantcircuit":   dict(red=S("#0E5A28"), gold=S("#0A3A20"), note="deep forest-green plate / dark-green accent"),
    "obsidianmark":     dict(red=S("#1E1E1E"), gold=S("#5E5E5E"), note="near-black plate / dim-grey accent (monochrome)"),
    "goldencore":       dict(red=S("#8A6408"), gold=S("#4A2A0C"), note="dark bronze-gold plate / dark-brown accent"),
    # ── Group 2 ──
    "azurerepulsor":    dict(red=S("#12306E"), gold=S("#0A1730"), note="deep navy-blue plate / dark-navy accent"),
    "violetextremis":   dict(red=S("#45186E"), gold=S("#111111"), note="deep-purple plate / black accent"),
    "frostboundmark":   dict(red=S("#9FC8E0"), gold=S("#CFE0EC"), note="cyan-grey ice plate / cool-white accent"),
    "embercore":        dict(red=S("#93340A"), gold=S("#3A1C08"), note="deep rust-orange plate / dark-brown accent"),
    # ── Specialty ──
    "voidsovereign":    dict(void=True, note="full near-black + drifting circuit/data-line overlay (game.js drawIronMan3VoidAuraOverlay)"),
    # ── Homage: Mark 42 (Extremis) — real documented design. Darker red plate + lighter champagne-gold; the
    #   value contrast reads as the reversed placement of the standard suit. Subtle but genuine canon alt. ──
    "markfortytwo":     dict(red=S("#7A0E12"), gold=S("#EBDCA6", floor=0.34, spread=1.06), note="HOMAGE Mark 42 (Extremis): darker red plate + lighter champagne-gold"),
}
DISPLAY = {
    "crimsonoverdrive": "Crimson Overdrive", "verdantcircuit": "Verdant Circuit",
    "obsidianmark": "Obsidian Mark", "goldencore": "Golden Core",
    "azurerepulsor": "Azure Repulsor", "violetextremis": "Violet Extremis",
    "frostboundmark": "Frostbound Mark", "embercore": "Ember Core",
    "voidsovereign": "Void Sovereign", "markfortytwo": "Mark 42 (Extremis)",
}
ORDER = ["crimsonoverdrive", "verdantcircuit", "obsidianmark", "goldencore",
         "azurerepulsor", "violetextremis", "frostboundmark", "embercore", "voidsovereign", "markfortytwo"]

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
    else:
        paint(px, reg["RED"],  spec.get("red"))
        paint(px, reg["GOLD"], spec.get("gold"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "iron_man_3_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"RED": (220, 40, 40), "GOLD": (240, 200, 30), "DARK": (20, 20, 20), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "iron_man_3_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ iron_man_3_skin_mask_debug_8x.png")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("iron_man_3_idle_uniform.png"))]
    for tag in ORDER:
        recolor("iron_man_3_idle_uniform.png", f"iron_man_3_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"iron_man_3_idle_uniform__{tag}.png")))
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
    mont.save(os.path.join(ROOT, "iron_man_3_skins_preview.png"))
    print(f"→ iron_man_3_skins_preview.png  ({len(tiles)} tiles)")

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
