#!/usr/bin/env python3
"""Dark Vegeta (rosterKey vegeta_dark, DBZ akuma-animation sheet) — 8 coordinated palette recolors
   + Void Sovereign + Classic Saiyan Armor homage.

★ HEALTH-CHECKED against the REAL sprite (tool pixel scan across idle/win/intro/heavy/light, NOT just
  the build-prompt's region table). Findings:
  * HAIR   = dark-red/maroon, SATURATED reds (h>=335 or h<=18, s>=0.45): #a80000/#600000/#300000. The
             BOOT-TOE red is the SAME red region → grouped with hair (coherent: one accent colour).
  * ARMOR  = grey/silver shoulder guards, NEUTRAL mids (s<0.22, 0.30<=v<0.86): #787878/#a8a8a8/#c0c0c0.
  * GLOVES = white (s<0.18, v>=0.86): #f0f0f0.  SKIN = tan (h 8-42): #d8a890 (PROTECTED except Void).
  * BODYSUIT = essentially PURE BLACK (#000000, ~56%) and INDISTINGUISHABLE from the line-art outline.
             Pure black (V=0) carries no chroma to hue-shift, and a GREEN key-fringe halo (#001800/#183018,
             the un-keyed anti-alias remnant) hugs the silhouette — so outline-vs-fill separation is
             unreliable. Per this project's black-costume convention (Sukuna / alt_sukuna: "outfit stays
             BLACK, theme via HAIR + ACCENT"), the bodysuit is PROTECTED (stays black) and each theme is
             carried by HAIR + ARMOR + boot-toe red (+ GLOVES on the light skins). The prompt's own names
             ("deeper red/BLACK", "green/BLACK") endorse a black suit.  The green fringe folds into OTHER
             (untouched — pre-existing in the default sprite too).
  ★ RESERVED PALETTE: Dark Vegeta already has a real Dark-Aura / "Villainous Mode" transform whose
     signature colour is PURPLE (#9b30c9 aura + amplified purple ki). So Violet Reign leans a COOLER,
     more-saturated blue-violet (h~250) to stay clearly distinct from the mechanic's magenta-purple.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  HAIR · ARMOR · GLOVES        (paintable)
  SKIN · DARK(bodysuit+outline) (protected)  — DARK keeps silhouette; Void crushes all.

USAGE: gen_vegeta_dark_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every sheet referenced by vegeta_dark.animationData (recolorSkinAnim retags each one).
SHEETS = [
    "vegeta_dark_idle_uniform.png", "vegeta_dark_idlecross_uniform.png", "vegeta_dark_dive_uniform.png",
    "vegeta_dark_hurt_uniform.png", "vegeta_dark_crouchlight_uniform.png", "vegeta_dark_knockdown_uniform.png",
    "vegeta_dark_getup_uniform.png", "vegeta_dark_light_uniform.png", "vegeta_dark_heavy_uniform.png",
    "vegeta_dark_up_uniform.png", "vegeta_dark_air_uniform.png", "vegeta_dark_rush1_uniform.png",
    "vegeta_dark_rush2_uniform.png", "vegeta_dark_kicast_uniform.png", "vegeta_dark_knife_uniform.png",
    "vegeta_dark_sickle_uniform.png", "vegeta_dark_aura_uniform.png", "vegeta_dark_win_uniform.png",
    "vegeta_dark_intro_uniform.png",
]
PORTRAIT = "vegeta_dark_portrait.png"

def classify(h, s, v):
    if (h >= 335 or h <= 18) and s >= 0.45 and v >= 0.12:  return "HAIR"    # red/maroon hair + boot-toe red
    if 8 <= h <= 42 and s >= 0.22 and v >= 0.40:           return "SKIN"    # tan face/skin (protected)
    if s < 0.18 and v >= 0.86:                             return "GLOVES"  # white gloves
    if s < 0.22 and 0.30 <= v < 0.86:                      return "ARMOR"   # grey/silver shoulder armor
    if s < 0.35 and v < 0.30:                              return "DARK"    # black bodysuit + outline (protected)
    return "OTHER"                                                          # green key-fringe + misc (untouched)

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

def void_paint(px, pts):
    """Void Part A: crush a region to near-black keeping a whisper of shading + a faint cool tint."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])   # a touch cool/silver

# ── skin table — hair/armor/gloves (skin/dark PROTECTED). void special. ──
# "unchanged" regions are simply omitted (not painted). Prompt Groups 1 & 2 + Void + homage.
SKINS = {
    # ── Group 1 ──
    "crimsonprince": dict(hair=S("#C41E1E"), armor=S("#7A2A2A"), note="deeper crimson hair / dark-red steel armor / black suit / white gloves"),
    "verdantsaiyan": dict(hair=S("#1FA047"), armor=S("#2E7B4E"), note="green hair / green-steel armor / black suit / white gloves"),
    "obsidianprince":dict(hair=S("#3A3A3A"), armor=S("#B4B4B4"), gloves=S("#D8D8D8"), note="MONOCHROME: charcoal hair / silver armor / black suit / grey gloves"),
    "goldensaiyan":  dict(hair=S("#E8B923"), armor=S("#FFD670"), gloves=S("#F0E8D6"), note="gold hair / bright-gold armor / black suit / cream gloves"),
    # ── Group 2 ──
    "azureprince":   dict(hair=S("#1E6FC4"), armor=S("#2E5C9C"), note="blue hair / navy-steel armor / black suit / white gloves"),
    "violetreign":   dict(hair=S("#4B2ED9"), armor=S("#3E2E8C"), note="COOLER blue-violet hair+armor (kept distinct from the reserved Villainous-Mode purple) / black suit / white gloves"),
    "frostboundsaiyan": dict(hair=S("#CFEAF7"), armor=S("#EAF3FA"), gloves=S("#FFFFFF"), note="ice-blue/white: pale-ice hair / white-ice armor / black suit / white gloves (the light outlier)"),
    "emberprince":   dict(hair=S("#E87A1A"), armor=S("#C4681A"), note="orange hair / ember-orange armor / black suit / white gloves"),
    # ── Specialty ──
    "voidsovereign": dict(void=True, note="full near-black incl. face + drifting ki-energy wisp overlay (game.js drawVegetaDarkVoidAuraOverlay)"),
    # ── Homage — Classic Saiyan Armor (real documented design: white/gold armor over a blue bodysuit,
    #    black hair). Since the black BODYSUIT can't be recoloured cleanly (see header), the classic look is
    #    carried by the recolourable regions: hair -> black-blue, ARMOR -> white, GLOVES -> white. Reads as
    #    "white shoulder plate + black hair" (the classic-Vegeta silhouette) on the signature dark suit. The
    #    blue undersuit is APPROXIMATED via the armor/hair read since the pure-black suit is protected. ──
    "classicarmor":  dict(hair=S("#1C1C34"), armor=S("#EDEDED"), gloves=S("#FFFFFF"), note="HOMAGE Classic Saiyan Armor: near-black hair / white shoulder armor / white gloves (blue undersuit approximated — pure-black suit protected)"),
}
DISPLAY = {
    "crimsonprince": "Crimson Prince", "verdantsaiyan": "Verdant Saiyan", "obsidianprince": "Obsidian Prince",
    "goldensaiyan": "Golden Saiyan", "azureprince": "Azure Prince", "violetreign": "Violet Reign",
    "frostboundsaiyan": "Frostbound Saiyan", "emberprince": "Ember Prince", "voidsovereign": "Void Sovereign",
    "classicarmor": "Classic Saiyan Armor",
}
ORDER = ["crimsonprince", "verdantsaiyan", "obsidianprince", "goldensaiyan",
         "azureprince", "violetreign", "frostboundsaiyan", "emberprince", "voidsovereign", "classicarmor"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("HAIR", "ARMOR", "GLOVES", "SKIN", "DARK", "OTHER")}
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
        paint(px, reg["HAIR"],   spec.get("hair"))
        paint(px, reg["ARMOR"],  spec.get("armor"))
        paint(px, reg["GLOVES"], spec.get("gloves"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "vegeta_dark_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"HAIR": (220, 30, 30), "ARMOR": (170, 170, 170), "GLOVES": (255, 255, 255),
            "SKIN": (255, 60, 200), "DARK": (20, 20, 20), "OTHER": (0, 210, 90)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "vegeta_dark_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ vegeta_dark_skin_mask_debug_8x.png  (RED=HAIR grey=ARMOR white=GLOVES magenta=SKIN black=DARK GREEN=OTHER[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("vegeta_dark_idle_uniform.png"))]
    for tag in ORDER:
        recolor("vegeta_dark_idle_uniform.png", f"vegeta_dark_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"vegeta_dark_idle_uniform__{tag}.png")))
    cols = 6; cw, ch = 120, 170; lblh = 16
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
    mont.save(os.path.join(ROOT, "vegeta_dark_skins_preview.png"))
    print(f"→ vegeta_dark_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
