#!/usr/bin/env python3
"""Piccolo (rosterKey piccolo, DBZ Extreme Butoden) — 8 coordinated palette recolors + Void Sovereign
   + Kami homage.

★ HEALTH-CHECKED against the REAL sprite (tool pixel scan across idle/win/intro/heavy/light). Findings vs
  the build-prompt's region table ("green skin / purple-magenta gi / dark-indigo pants / orange-brown boots"):
  * GI     = purple/magenta gi — the DOMINANT garment, ~50% (h 262-312, s>=0.42): #9018a8/#781890/#480048/
             #180030 (shadow). PRIMARY theme carrier.
  * SKIN   = GREEN Namekian skin (h 95-145, s>=0.45): #00d800/#00a800/#007800/#003000. PROTECTED except the
             monochrome / frost / Void / Kami skins (which deliberately shift it).
  * CAPE   = the prompt OMITTED it: a large light blue-grey CAPE + TURBAN region (~18%, h 195-258, s<0.42,
             v>=0.5): #9090c0/#c0c0d8. Piccolo's iconic WHITE weighted cape/turban, rendered blue-shaded.
             KEPT light/near-white on the colour skins (iconic); only mono/frost/gold/Void/Kami retint it.
  * BOOTS  = brown/orange-brown boots (h 8-48, s>=0.5, v<0.78): #783000/#a84818/#483000. Accent.
  * WHITE  = small bright highlights (s<0.15, v>=0.88).  DARK = outline/near-black (v<0.16, protected).
  ★ RESERVED: Piccolo already has a real ORANGE PICCOLO transform (palette-tint prototype). So Ember Namekian
     leans a WARM-RED gi (not true orange) to stay clearly distinct, and no orange skin is offered.
  ★ The base→Potential-Unleashed→Orange-Piccolo transform is a runtime CANVAS WASH (sprite.js), applied ON
     TOP of whatever sheet renders — so it stacks over a skin cosmetically and needs no per-form recolor here.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  GI · CAPE · BOOTS · SKIN     (paintable; SKIN only on mono/frost/Void/Kami)
  WHITE · DARK(outline)        (protected)  — Void crushes all.

USAGE: gen_piccolo_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every sheet referenced by piccolo.animationData (recolorSkinAnim retags each one).
SHEETS = [
    "piccolo_idle_uniform.png", "piccolo_dash_uniform.png", "piccolo_jump_uniform.png",
    "piccolo_air_uniform.png", "piccolo_crouch_uniform.png", "piccolo_guard_uniform.png",
    "piccolo_hurt_uniform.png", "piccolo_knockdown_uniform.png", "piccolo_getup_uniform.png",
    "piccolo_taunt_uniform.png", "piccolo_light_uniform.png", "piccolo_heavy_uniform.png",
    "piccolo_up_uniform.png", "piccolo_rush1_uniform.png", "piccolo_rush2_uniform.png",
    "piccolo_rush3_uniform.png", "piccolo_stretch_uniform.png", "piccolo_flykick_uniform.png",
    "piccolo_beam_uniform.png", "piccolo_masenko_uniform.png", "piccolo_demonwave_uniform.png",
    "piccolo_win_uniform.png", "piccolo_intro_uniform.png",
]
PORTRAIT = "piccolo_portrait.png"

def classify(h, s, v):
    if 95 <= h <= 145 and s >= 0.45 and v >= 0.15:    return "SKIN"    # green Namekian skin
    if 262 <= h <= 312 and s >= 0.42 and v >= 0.12:   return "GI"      # purple/magenta gi (primary)
    if 8 <= h <= 48 and s >= 0.50 and v < 0.78:       return "BOOTS"   # brown/orange-brown boots
    if s < 0.15 and v >= 0.88:                        return "WHITE"   # white highlights (protected)
    if 195 <= h <= 258 and s < 0.42 and v >= 0.50:    return "CAPE"    # light blue-grey cape/turban
    if v < 0.16:                                      return "DARK"    # outline/near-black (protected)
    return "OTHER"                                                     # misc small accents (untouched)

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.12):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.04, round(tv * 0.28, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
    """Re-centre a region on the target hue+value, preserving its own light/dark SPREAD (keeps fold shading)."""
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
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])   # a touch cool/silver

# ── skin table — gi/cape/boots/skin (white/dark PROTECTED). void special. ──
SKINS = {
    # ── Group 1 ──
    "crimsonnamekian": dict(gi=S("#B31E1E"), boots=S("#5A1A1A"), note="red gi / white cape / green skin / dark-red boots"),
    "verdantelder":    dict(gi=S("#1B5E2A"), boots=S("#123D1A"), note="deep forest-green gi (distinct from brighter green skin) / white cape / dark-green boots"),
    "obsidiannamekian":dict(gi=S("#262626"), cape=S("#B4B4B4"), boots=S("#3A3A3A"), skin=S("#6E6E6E"), note="MONOCHROME: charcoal gi / silver cape / grey skin / dark-grey boots"),
    "goldennamekian":  dict(gi=S("#C8961E"), cape=S("#F0E8D0"), boots=S("#6E4A14"), note="gold gi / cream cape / green skin / dark-gold boots"),
    # ── Group 2 ──
    "azurenamekian":   dict(gi=S("#1E5AC4"), boots=S("#182A5A"), note="blue gi / white cape / green skin / navy boots"),
    "violetreborn":    dict(gi=S("#7A28C4"), boots=S("#3D1A5A"), note="richer bluer-violet gi (distinct from default magenta AND the reserved Orange Piccolo) / white cape / green skin"),
    "frostboundnamekian": dict(gi=S("#BFE0F0"), cape=S("#FFFFFF"), boots=S("#8AA6BE"), skin=S("#CFE8DC"), note="ice-white/blue: pale-ice gi / white cape / frost-tinted pale skin / pale-blue boots (light outlier)"),
    "embernamekian":   dict(gi=S("#C4381A"), boots=S("#7A2410"), note="WARM-RED gi (leaned red, NOT true orange, to stay distinct from the reserved Orange Piccolo transform) / white cape / green skin"),
    # ── Specialty ──
    "voidsovereign":   dict(void=True, note="full near-black incl. green skin + drifting pale spore/cherry-blossom overlay (game.js drawPiccoloVoidAuraOverlay)"),
    # ── Homage — Kami (Piccolo's own former good half; real documented alternate identity: paler green-white
    #    skin + white/gold robes rather than the purple gi). ──
    "kami":            dict(gi=S("#EDEAD8"), cape=S("#FFFFFF"), boots=S("#B08A2E"), skin=S("#BFDCB0"), note="HOMAGE Kami: white/cream robe (gi) / white cape / pale green-white skin / gold boots"),
}
DISPLAY = {
    "crimsonnamekian": "Crimson Namekian", "verdantelder": "Verdant Elder", "obsidiannamekian": "Obsidian Namekian",
    "goldennamekian": "Golden Namekian", "azurenamekian": "Azure Namekian", "violetreborn": "Violet Reborn",
    "frostboundnamekian": "Frostbound Namekian", "embernamekian": "Ember Namekian", "voidsovereign": "Void Sovereign",
    "kami": "Kami",
}
ORDER = ["crimsonnamekian", "verdantelder", "obsidiannamekian", "goldennamekian",
         "azurenamekian", "violetreborn", "frostboundnamekian", "embernamekian", "voidsovereign", "kami"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("GI", "CAPE", "BOOTS", "SKIN", "WHITE", "DARK", "OTHER")}
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
        paint(px, reg["GI"],    spec.get("gi"))
        paint(px, reg["CAPE"],  spec.get("cape"))
        paint(px, reg["BOOTS"], spec.get("boots"))
        paint(px, reg["SKIN"],  spec.get("skin"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "piccolo_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"GI": (180, 30, 200), "CAPE": (150, 170, 220), "BOOTS": (170, 90, 30),
            "SKIN": (0, 210, 0), "WHITE": (255, 255, 255), "DARK": (20, 20, 20), "OTHER": (255, 40, 40)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "piccolo_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ piccolo_skin_mask_debug_8x.png  (MAGENTA=GI blue=CAPE brown=BOOTS GREEN=SKIN white=WHITE black=DARK RED=OTHER[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("piccolo_idle_uniform.png"))]
    for tag in ORDER:
        recolor("piccolo_idle_uniform.png", f"piccolo_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"piccolo_idle_uniform__{tag}.png")))
    cols = 6; cw, ch = 120, 180; lblh = 16
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
    mont.save(os.path.join(ROOT, "piccolo_skins_preview.png"))
    print(f"→ piccolo_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
