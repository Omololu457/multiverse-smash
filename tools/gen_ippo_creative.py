#!/usr/bin/env python3
"""Ippo Makunouchi — Hajime no Ippo, srchimuelo JUS fan sheet — 8 coordinated palette recolors
   + Void Sovereign + Championship Gold (ORIGINAL title-belt design, NOT a canon costume).

★ HEALTH-CHECKED against the REAL sprite (histogram/mask scan, NOT just the prompt's region note):
  * RED   = the boxing-gi TOP + gloves + red short-trim (~30% of opaque px). Two-tone (bright h~350/10
            s0.4-1.0 v0.5-0.9 + darker maroon shadow). Folded into one class; paint() preserves the
            light/dark SPREAD so gi shading survives. PAINTABLE (primary recolor surface).
  * WHITE = the boxing shorts (~12%): s<0.22, v>0.72. KEPT WHITE for every non-mono theme; only recolored
            when a theme demands it (Obsidian mono / Void). PAINTABLE-optional (shorts).
  * TAN   = exposed skin/face (~6%): h 18-40, s 0.20-0.45, v>=0.55. PROTECTED (Void crushes it).
  * DARK  = black hair + line-art / joint shadow (~48%): v<0.20, s<0.60. PROTECTED (Void crushes it).
  * OTHER = neutral mid-grey anti-alias / outline (~4%, h~60 s0.1 v0.5). NEVER painted.
  No baked energy-FX on the body sheets (Ippo is melee-only, no projectiles) → nothing else to protect.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority order; each pixel <= one class):
  RED · WHITE   (paintable)     |     TAN · DARK · OTHER   (protected)

USAGE: gen_ippo_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "ippo_air_uniform.png", "ippo_airhook_uniform.png", "ippo_body_uniform.png",
    "ippo_crouchlight_uniform.png", "ippo_dempsey_flurry_uniform.png", "ippo_dempsey_weave_uniform.png",
    "ippo_dodge_uniform.png", "ippo_failed_uniform.png", "ippo_fall_uniform.png",
    "ippo_gazelle_uniform.png", "ippo_getup_uniform.png", "ippo_guard_uniform.png",
    "ippo_heavy_uniform.png", "ippo_hook_uniform.png", "ippo_hurt_uniform.png",
    "ippo_idle_uniform.png", "ippo_idlelow_uniform.png", "ippo_jab1_uniform.png",
    "ippo_jab2_uniform.png", "ippo_jump_uniform.png", "ippo_knockdown_uniform.png",
    "ippo_light_uniform.png", "ippo_lose_uniform.png", "ippo_up_uniform.png",
    "ippo_upper_uniform.png", "ippo_walk_uniform.png", "ippo_win_uniform.png",
]
PORTRAIT = "ippo_portrait.png"

def classify(h, s, v):
    if v < 0.20 and s < 0.60:                              return "DARK"   # black hair + line-art (protected)
    if s < 0.22 and v >= 0.72:                             return "WHITE"  # boxing shorts (paintable-optional)
    if 18 <= h <= 40 and 0.20 <= s < 0.46 and v >= 0.55:  return "TAN"    # skin/face (protected)
    if (h >= 340 or h < 18) and s >= 0.35 and v >= 0.25:  return "RED"    # gi top + gloves + trim (bright + maroon)
    return "OTHER"                                                        # neutral grey anti-alias → NEVER painted

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.12):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.04, round(tv * 0.28, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
    """Re-centre a region on the target hue+value, preserving its own light/dark SPREAD (keeps gi shading)."""
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

# ── skin table — red (gi/gloves primary) + white (shorts). tan/dark/other PROTECTED. void special. ──
SKINS = {
    # ── Group 1 ──  (shorts kept white unless mono)
    "crimsonchallenger": dict(red=S("#8A0F14"), white=None, note="deeper crimson gi/gloves, white shorts kept"),
    "verdantcontender":  dict(red=S("#1E7A3C"), white=None, note="green gi/gloves, white shorts kept"),
    "obsidianfighter":   dict(red=S("#2A2A2A"), white=S("#9A9A9A"), note="black/grey monochrome gi + grey shorts"),
    "goldenchampion":    dict(red=S("#C9A227"), white=None, note="gold gi/gloves, white shorts kept"),
    # ── Group 2 ──
    "azureboxer":        dict(red=S("#1C4FA6"), white=None, note="blue gi/gloves, white shorts kept"),
    "violetcontender":   dict(red=S("#6A2AA6"), white=None, note="violet gi/gloves, white shorts kept"),
    "frostboundfighter": dict(red=S("#BFE2F5"), white=S("#EAF4FB"), note="ice-blue gi/gloves, frosted white shorts"),
    "emberchallenger":   dict(red=S("#C24A12"), white=None, note="burnt-orange gi/gloves, white shorts kept"),
    # ── Specialty ──
    "voidsovereign":     dict(void=True, note="full near-black incl. face + drifting sweat/impact-spark motes overlay (game.js)"),
    # ── Second specialty: ORIGINAL 'title belt' design — NOT a canon Ippo costume alternate ──
    "championshipgold":  dict(red=S("#D4AF37"), white=None, gloves_ok=True,
                             note="ORIGINAL all-gold title-belt theme: GOLD gi + GOLD gloves, WHITE shorts kept (NOT canon)"),
}
DISPLAY = {
    "crimsonchallenger": "Crimson Challenger", "verdantcontender": "Verdant Contender",
    "obsidianfighter": "Obsidian Fighter", "goldenchampion": "Golden Champion",
    "azureboxer": "Azure Boxer", "violetcontender": "Violet Contender",
    "frostboundfighter": "Frostbound Fighter", "emberchallenger": "Ember Challenger",
    "voidsovereign": "Void Sovereign", "championshipgold": "Championship Gold",
}
ORDER = ["crimsonchallenger", "verdantcontender", "obsidianfighter", "goldenchampion",
         "azureboxer", "violetcontender", "frostboundfighter", "emberchallenger",
         "voidsovereign", "championshipgold"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("RED", "WHITE", "TAN", "DARK", "OTHER")}
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
        paint(px, reg["RED"],   spec.get("red"))
        paint(px, reg["WHITE"], spec.get("white"))   # None → shorts kept white
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "ippo_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"RED": (220, 40, 40), "WHITE": (245, 245, 245), "TAN": (230, 190, 140),
            "DARK": (20, 20, 20), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "ippo_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ ippo_skin_mask_debug_8x.png  (RED=red WHITE=white TAN=tan DARK=black MAGENTA=OTHER[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("ippo_idle_uniform.png"))]
    for tag in ORDER:
        recolor("ippo_idle_uniform.png", f"ippo_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"ippo_idle_uniform__{tag}.png")))
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
    mont.save(os.path.join(ROOT, "ippo_skins_preview.png"))
    print(f"→ ippo_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
