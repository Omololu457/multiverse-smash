#!/usr/bin/env python3
"""Miles Morales — Marvel xxalexsmashxx JUS sheet — 8 coordinated web recolors + Void Sovereign
   + Upgraded-Suit homage. Miles is a BLACK-SUIT character: black base + RED web/lens/sole accent,
   the "black/red convention" (like Spider-Man black-suit). A recolor moves the RED accent to the
   theme color; the BLACK suit base stays black (except Void, which crushes all).

★ HEALTH-CHECKED against the REAL sprite (histogram/mask scan, NOT just the prompt's region note):
  * RED   = mask / eye-lens rims / web-pattern lines / boot soles (~18% of opaque px on idle):
            h>=328 or h<22, s>=0.40, v>=0.22. Bright red + maroon shadow folded into one class;
            paint() preserves the fold spread. PAINTABLE (the ONLY primary accent).
  * BLACK  = suit base — includes the NAVY-DARK shading (h~240, low v) the JUS art uses for the
            shadowed black cloth (v<0.22, s<0.70). PROTECTED (keeps the black silhouette). Void crushes.
  * WHITE  = eye-lens glints (v>0.82, s<0.18, ~0.3%). PROTECTED — never repainted (keeps the eyes read).
  * VENOM  = ★baked electric-yellow venom-blast FX present on venomstrike/venombeam/venomarc/ult
            sheets (~5-7% there): h 42-70, s>=0.50, v>=0.60. This is Miles' SIGNATURE FX color and is
            PROTECTED on every skin (never painted) — the procedural FX in game.js is separate and not
            our concern, but these BAKED pixels must survive the recolor. Classified before RED so it
            can never be mistaken for an accent.
  * OTHER = the navy mid-shadow (h~240) + low-alpha source speckle the JUS rip left. Classified OTHER
            and NEVER painted — "noise = ignore" rule. No skin touches it. There is no exposed skin on
            the masked body, so nothing else to protect.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  RED   (paintable)     |     BLACK · WHITE · VENOM · OTHER   (protected)

USAGE: gen_miles_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "miles_idle_uniform.png", "miles_run_uniform.png", "miles_jump_uniform.png",
    "miles_fall_uniform.png", "miles_air_uniform.png", "miles_guard_uniform.png",
    "miles_hurt_uniform.png", "miles_knockdown_uniform.png", "miles_getup_uniform.png",
    "miles_light_uniform.png", "miles_heavy_uniform.png", "miles_up_uniform.png",
    "miles_dashkick_uniform.png", "miles_web_uniform.png", "miles_venomstrike_uniform.png",
    "miles_venombeam_uniform.png", "miles_venomarc_uniform.png", "miles_dive_uniform.png",
    "miles_stealth_uniform.png", "miles_ult_uniform.png", "miles_intro_uniform.png",
    "miles_win_uniform.png", "miles_lose_uniform.png",
]
PORTRAIT = "miles_portrait.png"

def classify(h, s, v):
    if 42 <= h <= 70 and s >= 0.50 and v >= 0.60:      return "VENOM"  # baked electric-yellow venom FX (protected)
    if v < 0.22 and s < 0.70:                          return "BLACK"  # suit base incl navy-dark shading (protected)
    if v > 0.82 and s < 0.18:                          return "WHITE"  # eye-lens glint (protected)
    if (h >= 328 or h < 22) and s >= 0.40 and v >= 0.22: return "RED"  # red accent — webs/lenses/soles (PAINTABLE)
    return "OTHER"                                                     # navy mid-shadow + source noise → NEVER painted

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.12):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.04, round(tv * 0.28, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
    """Re-centre a region on the target hue+value, preserving its own light/dark SPREAD (keeps web shading)."""
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
    """Value-split a region: dim pixels -> dark_spec, brightest -> bright_spec. Used for the Upgraded homage
    (blue legs vs white spider-logo/stripe glints inside the same RED accent class)."""
    if not pts: return
    vals = [(xy, colorsys.rgb_to_hsv(px[xy[0], xy[1]][0]/255, px[xy[0], xy[1]][1]/255, px[xy[0], xy[1]][2]/255)[2]) for xy in pts]
    vv = sorted(v for _, v in vals); thr = vv[int(len(vv) * cut)]
    paint(px, [xy for xy, v in vals if v < thr], dark_spec)
    paint(px, [xy for xy, v in vals if v >= thr], bright_spec)

def void_paint(px, pts):
    """Void Part A: crush a region to near-black keeping a whisper of shading + a faint cool tint.
    (Part B — the drifting white web-strand motes — is a procedural overlay in game.js, not baked here.)"""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])

# ── skin table — red accent (primary) is the ONLY paintable class. black/white/venom/noise PROTECTED. ──
SKINS = {
    # ── Group 1 ──
    "verdantweb":    dict(red=S("#1E9A3C"), note="green web/lens on black suit"),
    "obsidianweb":   dict(red=S("#4A4A4A"), note="dark charcoal web on black suit (monochrome/stealthy)"),
    "goldenweb":     dict(red=S("#D4A017"), note="gold web/lens on black suit"),
    "frostboundweb": dict(red=S("#BFE2F5", floor=0.30), note="ice-blue web / white glints on black suit"),
    # ── Group 2 ──
    "violetweb":     dict(red=S("#7A2AC0"), note="violet web/lens on black suit"),
    "emberweb":      dict(red=S("#E2620F"), note="orange web/lens on black suit"),
    "azureweb":      dict(red=S("#1C5FD6"), note="blue web/lens on black suit"),
    "ashenweb":      dict(red=S("#9AA0A6"), note="grey web on black suit"),
    # ── Specialty ──
    "voidsovereign": dict(void=True, note="full near-black incl. suit + drifting white web-strand motes overlay (game.js)"),
    # ── Homage: Upgraded Suit ──
    # The BASE sprite already reads as the CLASSIC suit (predominantly black w/ red spider insignia), so the
    # more DISTINCT homage is the UPGRADED suit: red mask/chest kept red, spider-logo/arm-stripe glints -> WHITE,
    # legs/lower-suit -> BLUE. Palette approximation: the black legs stay black (base), and the RED accent is
    # value-split so the brightest red px (logo/lens rims) -> white while the body of the accent -> blue.
    "classicsuit":   dict(upgraded=True,
                          red_body=S("#1C5FD6"),                  # accent body -> blue (upgraded legs/torso trim)
                          red_glow=S("#F2F4F8", floor=0.55, spread=1.0),  # logo/stripe glints -> white
                          note="HOMAGE Upgraded Suit: red accent -> blue with white spider-logo/stripe glints; black suit base kept"),
}
DISPLAY = {
    "verdantweb": "Verdant Web", "obsidianweb": "Obsidian Web",
    "goldenweb": "Golden Web", "frostboundweb": "Frostbound Web",
    "violetweb": "Violet Web", "emberweb": "Ember Web",
    "azureweb": "Azure Web", "ashenweb": "Ashen Web",
    "voidsovereign": "Void Sovereign", "classicsuit": "Upgraded Suit",
}
ORDER = ["verdantweb", "obsidianweb", "goldenweb", "frostboundweb",
         "violetweb", "emberweb", "azureweb", "ashenweb", "voidsovereign", "classicsuit"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("RED", "BLACK", "WHITE", "VENOM", "OTHER")}
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
        # Void crushes suit + accent; VENOM baked-FX still protected (signature FX survives).
        for k in ("RED", "BLACK", "WHITE", "OTHER"): void_paint(px, reg[k])
    elif spec.get("upgraded"):
        paint_split(px, reg["RED"], spec.get("red_body"), spec.get("red_glow"), cut=0.82)
    else:
        paint(px, reg["RED"], spec.get("red"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "miles_venomstrike_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"RED": (220, 40, 40), "BLACK": (20, 20, 20), "WHITE": (240, 240, 255),
            "VENOM": (240, 220, 30), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "miles_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ miles_skin_mask_debug_8x.png  (RED=red BLACK=black WHITE=white VENOM=yellow MAGENTA=OTHER/noise[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("miles_idle_uniform.png"))]
    for tag in ORDER:
        recolor("miles_idle_uniform.png", f"miles_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"miles_idle_uniform__{tag}.png")))
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
    mont.save(os.path.join(ROOT, "miles_skins_preview.png"))
    print(f"→ miles_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
