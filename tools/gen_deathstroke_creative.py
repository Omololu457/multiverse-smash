#!/usr/bin/env python3
"""Deathstroke (Slade Wilson, DC) — 9 creative alt-skins + 1 Alien-X-style Void skin (= 10, + Default = 11).

HEALTH-CHECK CORRECTIONS to the skins prompt (confirmed by pixel-sampling deathstroke_idle_uniform.png,
NOT the comic costume): (1) the SUIT is a MUTED SLATE BLUE-GREY (RGB ~(24,24,48)→(96,96,144); hue ~240,
low-mid saturation) — hue-correct vs the prompt's "navy" but far LESS saturated, and it separates from the
black OUTLINE by SATURATION (Onoki-navy trick). (2) The MASK is NOT a color-separable region: its ORANGE
half is the IDENTICAL orange to the body ACCENT (gloves/boots/belt) and its BLACK half is the OUTLINE black.
Per the OWNER DECISION (2026-08-17), the mask FOLLOWS THE BODY ACCENT — a pure color remap, no spatial work:
the mask's orange half recolors with the accent, the black half stays (protected outline). CONSEQUENCE
(accepted): the 4 black-accent skins (Crimson/Verdant/Violet/Ashfall) get an ALL-BLACK mask (no split);
the color-accent skins get an accent/black mask split.

THREE recolour regions, classified ONCE from ORIGINAL pixels (contamination-proof), priority order:
  * OUTLINE — near-black line-art + the mask's black half (v<0.12 & s<0.42). PROTECTED (never recoloured).
  * LIGHT   — the white eye-slit highlight (v>=0.85 & s<0.18). PROTECTED.
  * TRIM    — small gold/yellow armour-edge accents (40<=h<=64 & s>=0.42 & v>=0.34).
  * ACCENT  — the vivid orange (gloves/boots/pants/belt + the MASK's orange half) (h<=42 & s>=0.42 & v>=0.16).
  * SUIT    — the muted slate blue-grey body: bluish (150<=h<=280 & v<0.74) OR neutral-dark cloth
              (s<0.30 & 0.12<=v<0.74). The PRIMARY per-skin colour.
  * OTHER   — anything else (rare AA) — left untouched.

paint(): to-tone re-centre on the target hue at the target value, preserving each region's own light/dark
SPREAD (floor keeps a near-black target above outline-black; to_sat sets output saturation). Cosmetic only.

USAGE: gen_deathstroke_creative.py [probe|preview|all|<tag>]   # default: all
  probe   -> deathstroke_skin_mask_debug.png (regions tinted) + region counts, to verify classification
  preview -> recolor idle per skin + deathstroke_skins_preview.png montage (no full batch)
  all     -> recolor EVERY animationData sheet + portrait for all 10 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE uniform sheet in Deathstroke's animationData (dash=run/fall=jump/guard=idle/down_air=air are
# reuses → NOT separate files; recolouring run/jump/idle/air covers them). Recoloured per skin as sheet__<tag>.png.
SHEETS = [
    "deathstroke_idle_uniform.png", "deathstroke_walk_uniform.png", "deathstroke_run_uniform.png",
    "deathstroke_crouch_uniform.png", "deathstroke_jump_uniform.png", "deathstroke_hurt_uniform.png",
    "deathstroke_knockdown_uniform.png", "deathstroke_getup_uniform.png",
    "deathstroke_light_uniform.png", "deathstroke_heavy_uniform.png", "deathstroke_up_uniform.png",
    "deathstroke_air_uniform.png", "deathstroke_crouchstab_uniform.png",
    "deathstroke_swordslash_uniform.png", "deathstroke_drawcut_uniform.png", "deathstroke_runslash_uniform.png",
    "deathstroke_aerialspin_uniform.png", "deathstroke_gun_uniform.png", "deathstroke_ult_uniform.png",
    "deathstroke_win_uniform.png",
]

def classify(h, s, v):
    if v < 0.12 and s < 0.42:                              return "OUTLINE"   # line-art + mask black half
    if v >= 0.85 and s < 0.18:                             return "LIGHT"     # white eye-slit
    if 40 <= h <= 64 and s >= 0.42 and v >= 0.34:          return "TRIM"      # gold armour edges
    if h <= 42 and s >= 0.42 and v >= 0.16:                return "ACCENT"    # orange (+ mask orange half)
    if 150 <= h <= 280 and v < 0.74:                       return "SUIT"      # slate blue-grey body
    if s < 0.30 and 0.12 <= v < 0.74:                      return "SUIT"      # neutral-dark cloth
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, spec):
    """spec = (hex, to_sat, floor, spread) or None (keep). to-tone re-centre preserving spread."""
    if not spec or not pts: return 0
    hexcol, to_sat, floor, spread = spec
    tr, tg, tb = hex2rgb(hexcol)
    th, _ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, to_sat, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

def void_paint(px, pts):
    """Alien-X void: crush a region to near-black, keeping only a whisper of its own shading spread."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, max(g, round(g * 1.12)), px[x, y][3])   # faint cool tint

# each region tuple = (hex, to_sat, floor, spread);  None = keep original. suit = primary body colour.
SKINS = {
    # ── GROUP 1 ──
    "crimsoncontract":   dict(suit=("#7B2429", 0.62, 0.14, 1.15), accent=("#0A0A0A", 0.05, 0.03, 1.05), trim=("#6B6B70", 0.05, 0.26, 1.10), note="deep-red suit / black accent (all-black mask) / gunmetal trim"),
    "verdantmercenary":  dict(suit=("#2E6B4A", 0.58, 0.16, 1.15), accent=("#0A0A0A", 0.05, 0.03, 1.05), trim=("#8F8F8F", 0.03, 0.30, 1.10), note="deep-green suit / black accent (all-black mask) / silver trim"),
    "goldenreaper":      dict(suit=("#1F1F1F", 0.05, 0.06, 1.10), accent=("#C9862E", 0.74, 0.22, 1.15), trim=("#FFD670", 0.55, 0.40, 1.15), note="black suit / heavy-gold accent (gold/black mask) / bright-gold trim"),
    "obsidianwraith":    dict(suit=("#242424", 0.04, 0.06, 1.10), accent=("#4A4A4A", 0.04, 0.14, 1.10), trim=("#9C9C9C", 0.03, 0.32, 1.10), note="monochrome black suit / grey accent (grey/black mask) / silver trim"),
    # ── GROUP 2 ──
    "iceboundterminator":dict(suit=("#C9E4F5", 0.16, 0.42, 1.18), accent=("#EDF3FA", 0.05, 0.55, 1.14), trim=("#B0C4D6", 0.16, 0.36, 1.12), note="pale ice-blue suit / white accent (white/black mask) / silver trim"),
    "embercontract":     dict(suit=("#8C3D1A", 0.74, 0.16, 1.16), accent=("#291A14", 0.46, 0.06, 1.10), trim=("#8C5C2E", 0.62, 0.22, 1.14), note="burnt orange-red suit / dark-brown accent (deepened orange/black mask) / bronze trim"),
    "violetnth":         dict(suit=("#5C2E7B", 0.60, 0.16, 1.15), accent=("#0A0A0A", 0.05, 0.03, 1.05), trim=("#8F8F9C", 0.10, 0.30, 1.10), note="deep-violet suit / black accent (all-black mask) / silver trim"),
    "ashfallmercenary":  dict(suit=("#5C5248", 0.20, 0.16, 1.14), accent=("#0A0A0A", 0.05, 0.03, 1.05), trim=("#6B5A3D", 0.44, 0.24, 1.12), note="grey-brown suit / black accent (all-black mask) / dull-bronze trim"),
    # ── SPECIALTY ──
    "blueperiod":        dict(suit=("#3A5A82", 0.56, 0.16, 1.16), accent=("#7E9AB4", 0.34, 0.30, 1.14), trim=("#B0B8C0", 0.10, 0.34, 1.12), note="AUTHENTIC alt: deep-blue suit / steel-blue accent (orange DROPPED → steel-blue/black mask) / silver trim"),
    "voidsovereign":     dict(void=True, note="full-black silhouette + game.js drawDeathstrokeVoidAuraOverlay (drifting ash/ember particles)"),
}

DISPLAY = {
    "crimsoncontract": "Crimson Contract", "verdantmercenary": "Verdant Mercenary", "goldenreaper": "Golden Reaper",
    "obsidianwraith": "Obsidian Wraith", "iceboundterminator": "Icebound Terminator", "embercontract": "Ember Contract",
    "violetnth": "Violet Nth", "ashfallmercenary": "Ashfall Mercenary", "blueperiod": "Blue Period",
    "voidsovereign": "Void Sovereign",
}
ORDER = ["crimsoncontract", "verdantmercenary", "goldenreaper", "obsidianwraith", "iceboundterminator",
         "embercontract", "violetnth", "ashfallmercenary", "blueperiod", "voidsovereign"]

def _regions(im):
    px = im.load(); W, H = im.size
    reg = {k: [] for k in ("OUTLINE", "LIGHT", "TRIM", "ACCENT", "SUIT", "OTHER")}
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
        for k in ("TRIM", "ACCENT", "SUIT", "LIGHT", "OTHER"):
            void_paint(px, reg[k])
    else:
        paint(px, reg["SUIT"],   spec.get("suit"))
        paint(px, reg["ACCENT"], spec.get("accent"))
        paint(px, reg["TRIM"],   spec.get("trim"))
    im.save(os.path.join(ROOT, out))

def _bust(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def make_portrait(tag):
    """Per-skin portrait: recolour the ORIGINAL mask-icon portrait (deathstroke_portrait.png) directly, so the
    mask's orange follows the accent (identity handling matches the sprite). Void → crushed near-black."""
    im = Image.open(os.path.join(ROOT, "deathstroke_portrait.png")).convert("RGBA")
    px, reg = _regions(im)
    spec = SKINS[tag]
    if spec.get("void"):
        for k in ("TRIM", "ACCENT", "SUIT", "LIGHT", "OTHER"): void_paint(px, reg[k])
    else:
        paint(px, reg["SUIT"], spec.get("suit")); paint(px, reg["ACCENT"], spec.get("accent")); paint(px, reg["TRIM"], spec.get("trim"))
    im.save(os.path.join(ROOT, f"deathstroke_portrait__{tag}.png"))

def probe():
    im = Image.open(os.path.join(ROOT, "deathstroke_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"OUTLINE": (0, 0, 0), "LIGHT": (255, 255, 255), "TRIM": (255, 220, 0),
            "ACCENT": (255, 90, 0), "SUIT": (60, 90, 255), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, "deathstroke_skin_mask_debug.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("→ deathstroke_skin_mask_debug.png  (blue=SUIT orange=ACCENT gold=TRIM white=LIGHT black=OUTLINE magenta=OTHER)")

def preview():
    tiles = [("Default", _bust("deathstroke_idle_uniform.png"))]
    for tag in ORDER:
        recolor("deathstroke_idle_uniform.png", f"deathstroke_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _bust(f"deathstroke_idle_uniform__{tag}.png")))
    cols = 6; cw, ch = 120, 150; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min(cw / cell.width, ch / cell.height)
        rs = cell.resize((max(1, int(cell.width * sc)), max(1, int(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "deathstroke_skins_preview.png"))
    print(f"→ deathstroke_skins_preview.png  ({len(tiles)} tiles)")

def batch_all():
    for tag in ORDER:
        for s in SHEETS:
            recolor(s, s.replace(".png", f"__{tag}.png"), tag)
        make_portrait(tag)
        print(f"OK {tag}: {len(SHEETS)} sheets + portrait")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "probe":     probe()
    elif mode == "preview": preview()
    elif mode == "all":     batch_all()
    elif mode in SKINS:
        for s in SHEETS: recolor(s, s.replace(".png", f"__{mode}.png"), mode)
        make_portrait(mode); print(f"OK {mode}")
    else: print(f"unknown mode: {mode}")
