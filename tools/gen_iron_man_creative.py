#!/usr/bin/env python3
"""Iron Man (1) — Marvel danorenovado JUS chibi sheet — 8 coordinated palette recolors + Void Sovereign
   + Stealth "Prodigal Son" homage (real documented stealth armor).

★ HEALTH-CHECKED against the REAL sprite (histogram/mask scan, NOT just the prompt's region note):
  * RED   = the main armor plating (~49% of opaque px): h>=320 or h<=18, s>=0.45. Two-tone (bright + maroon
            shadow) folded into one class; paint() preserves the fold spread. PAINTABLE (primary).
  * GOLD  = faceplate + chest arc-reactor rim + gloves + boots + thigh plates. The bulk renders as
            AMBER (h ~20-45, s>=0.5) with only a thin pure-yellow highlight (h45-60). Both folded into
            GOLD so a "gold" recolor moves the whole accent coherently. PAINTABLE (accent).
  * DARK  = black line-art / joint shadow (v<0.20). PROTECTED (keeps silhouette) — Void crushes all.
  * NOISE = the lavender/magenta source speckle the JUS rip left (~25% of opaque px, mostly low-alpha
            halo): pale-purple (h 180-320, low s) + magenta glints. Classified OTHER and NEVER painted —
            this is the "lavender speckle = ignore" rule enforced in code. No skin touches it.
  There is NO exposed skin (fully armored) and NO baked energy-FX on the body sheets (repulsor bolts are
  separate procedural projectiles in game.js, never skin-swapped) → nothing else to protect.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  RED · GOLD   (paintable)     |     DARK · OTHER/NOISE   (protected)

USAGE: gen_iron_man_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "iron_man_idle_uniform.png", "iron_man_walk_uniform.png", "iron_man_dash_uniform.png",
    "iron_man_jump_uniform.png", "iron_man_air_uniform.png", "iron_man_crouch_uniform.png",
    "iron_man_guard_uniform.png", "iron_man_hurt_uniform.png", "iron_man_knockdown_uniform.png",
    "iron_man_getup_uniform.png", "iron_man_light_uniform.png", "iron_man_heavy_uniform.png",
    "iron_man_up_uniform.png", "iron_man_crouchthrust_uniform.png", "iron_man_rush1_uniform.png",
    "iron_man_rush2_uniform.png", "iron_man_rush3_uniform.png", "iron_man_blast_uniform.png",
    "iron_man_spiderlegs_uniform.png", "iron_man_super_uniform.png", "iron_man_intro_uniform.png",
]
PORTRAIT = "iron_man_portrait.png"

def classify(h, s, v):
    if v < 0.20 and s < 0.60:                          return "DARK"   # black line-art (protected)
    if 40 <= h <= 62 and s >= 0.30 and v >= 0.45:      return "GOLD"   # pure-yellow faceplate highlight
    if 18 <= h < 40  and s >= 0.45 and v >= 0.35:      return "GOLD"   # amber gold body (faceplate/gloves/boots/thighs)
    if (h >= 320 or h < 18) and s >= 0.45 and v >= 0.20: return "RED"  # red plating (bright + maroon shadow)
    return "OTHER"                                                     # lavender/magenta source noise → NEVER painted

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

def paint_split(px, pts, dark_spec, bright_spec, cut=0.72):
    """Value-split a region: dim pixels -> dark_spec, brightest -> bright_spec. Used for the Stealth homage
    (matte-black plate + cold blue-white faceplate glints)."""
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

# ── skin table — red (primary) + gold (accent). dark/noise PROTECTED. void + stealth special. ──
SKINS = {
    # ── Group 1 ──
    "crimsonoverdrive": dict(red=S("#7A1418"), gold=S("#141414"), note="deeper crimson plate / black accent"),
    "verdantcircuit":   dict(red=S("#1E7A3C"), gold=S("#0F3D22"), note="green plate / dark-green accent"),
    "obsidianmark":     dict(red=S("#2A2A2A"), gold=S("#8A8A8A"), note="black plate / grey accent (monochrome)"),
    "goldencore":       dict(red=S("#B8860B"), gold=S("#7A4A16"), note="amber plate / bronze accent"),
    # ── Group 2 ──
    "azurerepulsor":    dict(red=S("#1C4FA6"), gold=S("#14264F"), note="blue plate / navy accent"),
    "violetextremis":   dict(red=S("#6A2AA6"), gold=S("#141414"), note="violet plate / black accent"),
    "frostboundmark":   dict(red=S("#BFE2F5"), gold=S("#F2F6FA"), note="pale ice-blue plate / white accent"),
    "embercore":        dict(red=S("#C24A12"), gold=S("#5E3212"), note="burnt-orange plate / brown accent"),
    # ── Specialty ──
    "voidsovereign":    dict(void=True, note="full near-black incl. faceplate + drifting circuit/data-line overlay (game.js drawIronManVoidAuraOverlay)"),
    # ── Homage: Stealth "Prodigal Son" (real documented stealth armor) ──
    # matte-black plating (red->near-black), gold reduced to a thin dark accent, faceplate EYE glints -> cold
    # blue-white. Achievable palette approximation of a genuine silhouette-read change; eye isolation done via
    # value-split within GOLD (brightest gold px = eyes/faceplate rim -> blue-white).
    "stealth":          dict(stealth=True,
                             red=S("#181A1E"),           # matte black plate
                             gold_dark=S("#2A2E34"),     # gold -> thin dark charcoal accent
                             gold_glow=S("#CFE8FF", floor=0.55, spread=1.0),  # eye/faceplate glints -> cold blue-white
                             note="HOMAGE Stealth 'Prodigal Son': matte-black plate, thin dark accent, cold blue-white faceplate eyes"),
}
DISPLAY = {
    "crimsonoverdrive": "Crimson Overdrive", "verdantcircuit": "Verdant Circuit",
    "obsidianmark": "Obsidian Mark", "goldencore": "Golden Core",
    "azurerepulsor": "Azure Repulsor", "violetextremis": "Violet Extremis",
    "frostboundmark": "Frostbound Mark", "embercore": "Ember Core",
    "voidsovereign": "Void Sovereign", "stealth": "Stealth (Prodigal Son)",
}
ORDER = ["crimsonoverdrive", "verdantcircuit", "obsidianmark", "goldencore",
         "azurerepulsor", "violetextremis", "frostboundmark", "embercore", "voidsovereign", "stealth"]

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
    elif spec.get("stealth"):
        paint(px, reg["RED"], spec.get("red"))
        paint_split(px, reg["GOLD"], spec.get("gold_dark"), spec.get("gold_glow"), cut=0.80)
    else:
        paint(px, reg["RED"],  spec.get("red"))
        paint(px, reg["GOLD"], spec.get("gold"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "iron_man_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"RED": (220, 40, 40), "GOLD": (240, 200, 30), "DARK": (20, 20, 20), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "iron_man_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ iron_man_skin_mask_debug_8x.png  (RED=red GOLD=yellow DARK=black MAGENTA=OTHER/noise[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("iron_man_idle_uniform.png"))]
    for tag in ORDER:
        recolor("iron_man_idle_uniform.png", f"iron_man_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"iron_man_idle_uniform__{tag}.png")))
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
    mont.save(os.path.join(ROOT, "iron_man_skins_preview.png"))
    print(f"→ iron_man_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
