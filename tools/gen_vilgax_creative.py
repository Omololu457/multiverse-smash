#!/usr/bin/env python3
"""Vilgax (Ben 10, regulardor8go JUS sheet) — 8 coordinated armor recolors + Void Sovereign
   + Original-Series homage (real documented black/red-brown alt-era armor).

★ HEALTH-CHECKED against the REAL sprite (histogram/mask scan, NOT just the prompt's region note):
  Alien-Force / Ultimate-Alien era = red-and-blue armored conqueror. Opaque-pixel census (4 sheets):
  * RED    = red armor plating (~27%): h>=300 or h<25, s>=0.40, v>=0.20. Bright+maroon fold in one class.
             PAINTABLE — primary armor A.
  * ARMORB = blue/purple armor plating (~18%): 170<h<=260, s>=0.30. PAINTABLE — armor B, painted to the
             SAME theme colour as RED so a themed suit reads as one coherent armor (with the natural
             red/blue value spread preserved as light/shadow).
  * GLOVES = orange/rust gauntlets (~16%): 18<=h<50, s>=0.40. PAINTABLE — coordinated accent.
  * SKIN   = dark green / olive alien skin + tentacle-beard (~10%): 50<=h<=170, s>=0.20, v>=0.15.
             PROTECTED (keeps him green) — crushed only by Void; kept green by Original-Series homage.
  * DARK   = black line-art / joint shadow (~9%): v<0.20, s<0.60. PROTECTED silhouette — Void crushes all.
  * GREY   = grey shoulder pauldron + desaturated plate (~8%): s<0.25. Neutral metal — kept as-is on the
             standard skins (structural), crushed by Void.
  There is NO baked energy-FX on ANY body sheet (verified 0 bright cyan/green plasma px across slash /
  blastcast / blastxcast / throw / ultaction). Plasma & energy-sword FX are separate procedural draws in
  game.js — never touched here. Nothing extra to protect.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  RED · ARMORB · GLOVES   (paintable)   |   SKIN · DARK · GREY   (protected on standard skins)

USAGE: gen_vilgax_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "vilgax_air_uniform.png", "vilgax_blastcast_uniform.png", "vilgax_blastxcast_uniform.png",
    "vilgax_crouch_uniform.png", "vilgax_guard_uniform.png", "vilgax_heavy_uniform.png",
    "vilgax_hurt_uniform.png", "vilgax_idle_uniform.png", "vilgax_intro_uniform.png",
    "vilgax_jump_uniform.png", "vilgax_knockdown_uniform.png", "vilgax_light_uniform.png",
    "vilgax_run_uniform.png", "vilgax_slash_uniform.png", "vilgax_throw_uniform.png",
    "vilgax_tumble_uniform.png", "vilgax_ultaction_uniform.png", "vilgax_vanish_uniform.png",
    "vilgax_walk_uniform.png", "vilgax_win_uniform.png",
]
PORTRAIT = "vilgax_portrait.png"

def classify(h, s, v):
    if v < 0.20 and s < 0.60:                             return "DARK"    # black line-art (protected)
    if 50 <= h <= 170 and s >= 0.20 and v >= 0.15:        return "SKIN"    # olive/green alien skin (protected)
    if (h >= 300 or h < 25) and s >= 0.40 and v >= 0.20:  return "RED"     # red armor plating (paintable A)
    if 170 < h <= 260 and s >= 0.30:                      return "ARMORB"  # blue/purple armor (paintable B)
    if 18 <= h < 50 and s >= 0.40:                        return "GLOVES"  # orange/rust gauntlets (paintable accent)
    if s < 0.25:                                          return "GREY"    # grey pauldron / desat metal (neutral)
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.12):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.04, round(tv * 0.28, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
    """Re-centre a region on the target hue+value, preserving its own light/dark SPREAD (keeps plate shading)."""
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

# ── skin table — armor = RED+ARMORB painted together to theme; gloves = accent. skin/dark/grey protected. ──
SKINS = {
    # ── Group 1 ──
    "crimsonconqueror": dict(armor=S("#8A1416"), gloves=S("#1A1A1A"), note="deep-red plate / black gloves"),
    "verdantwarlord":   dict(armor=S("#1E6E36"), gloves=S("#123E20"), note="deep-green plate / dark-green gloves (monochrome-ish)"),
    "obsidiantyrant":   dict(armor=S("#242424"), gloves=S("#8A8A8A"), note="black plate / grey gloves"),
    "goldenconqueror":  dict(armor=S("#C79612"), gloves=S("#1A1A1A"), note="gold plate / black gloves"),
    # ── Group 2 ──
    "violetwarlord":    dict(armor=S("#5E2496"), gloves=S("#1A1A1A"), note="violet plate / black gloves"),
    "emberconqueror":   dict(armor=S("#C24A12"), gloves=S("#1A1A1A"), note="burnt-orange plate / black gloves"),
    "frostboundtyrant": dict(armor=S("#BFE2F5"), gloves=S("#F2F6FA"), note="ice-blue plate / white gloves"),
    "ashenwarlord":     dict(armor=S("#6A6A6E"), gloves=S("#1E1E1E"), note="grey plate / black gloves"),
    # ── Specialty ──
    "voidsovereign":    dict(void=True, note="full near-black incl. skin + drifting dark tentacle-like tendril motes (game.js overlay)"),
    # ── Homage: Original Series (real documented alt-era armor) ──
    # OS Vilgax = BLACK + RED-BROWN armored suit & gloves, with GREEN cheek sacs / face detail kept. Reads as a
    # genuinely different era from the Alien-Force blue/red look: armor -> black, gloves -> red-brown, skin GREEN.
    "originalseries":   dict(armor=S("#161616"), gloves=S("#7A2E1A"),
                             note="HOMAGE Original Series: black armor + red-brown gloves, green skin/cheek-sacs kept"),
}
DISPLAY = {
    "crimsonconqueror": "Crimson Conqueror", "verdantwarlord": "Verdant Warlord",
    "obsidiantyrant": "Obsidian Tyrant", "goldenconqueror": "Golden Conqueror",
    "violetwarlord": "Violet Warlord", "emberconqueror": "Ember Conqueror",
    "frostboundtyrant": "Frostbound Tyrant", "ashenwarlord": "Ashen Warlord",
    "voidsovereign": "Void Sovereign", "originalseries": "Original Series",
}
ORDER = ["crimsonconqueror", "verdantwarlord", "obsidiantyrant", "goldenconqueror",
         "violetwarlord", "emberconqueror", "frostboundtyrant", "ashenwarlord",
         "voidsovereign", "originalseries"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("RED", "ARMORB", "GLOVES", "SKIN", "DARK", "GREY", "OTHER")}
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
        # armor A (red) + armor B (blue/purple) share the theme armor colour
        paint(px, reg["RED"],    spec.get("armor"))
        paint(px, reg["ARMORB"], spec.get("armor"))
        paint(px, reg["GLOVES"], spec.get("gloves"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "vilgax_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"RED": (220, 40, 40), "ARMORB": (40, 90, 220), "GLOVES": (240, 150, 30),
            "SKIN": (60, 160, 60), "DARK": (20, 20, 20), "GREY": (150, 150, 150), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "vilgax_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ vilgax_skin_mask_debug_8x.png  (RED=red ARMORB=blue GLOVES=orange SKIN=green DARK=black GREY=grey MAGENTA=OTHER)")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("vilgax_idle_uniform.png"))]
    for tag in ORDER:
        recolor("vilgax_idle_uniform.png", f"vilgax_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"vilgax_idle_uniform__{tag}.png")))
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
    mont.save(os.path.join(ROOT, "vilgax_skins_preview.png"))
    print(f"→ vilgax_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
