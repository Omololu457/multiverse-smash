#!/usr/bin/env python3
"""Onoki (Third Tsuchikage) — 12 creative alt-skins + 1 Alien-X-style Void skin. Iwagakure / Tsuchikage /
Dust-Release (Particle Style) / elder / clan lore callbacks. CAPE is the primary identity colour (the
vivid green mantle); OUTFIT (dark navy undersuit) + ACCENT (deep-red headwrap) shift only where a skin
specifies. FACE/SKIN (pale tan) + line-art OUTLINE are protected (never recoloured). Cosmetic only —
ZERO gameplay/stat changes.

FOUR regions, classified ONCE from the ORIGINAL pixels (capture-masks-first = contamination-proof),
each pixel assigned to at most one class in priority order (palette confirmed by pixel-sampling
onoki_row_02.png: outfit navy-black RGB(0,0,16)-(32,32,48) / cape green RGB(80,176,80) / accent red
RGB(160,32,48) / skin tan RGB(240,208,160)):
  * OUTLINE — near-pure-black line-art (v<0.10 & s<0.35). Protected. (The dark NAVY outfit is separated
              from this by SATURATION: RGB(0,0,16) reads as a fully-saturated dark blue, not neutral black.)
  * SKIN    — pale tan face/hands + its shading (14<=h<=52 & s>=0.18 & v>=0.50). Protected.
  * LIGHT   — white highlights (v>=0.82 & s<0.16). Protected.
  * CAPE    — the vivid green mantle (88<=h<=165 & s>=0.28). PRIMARY per-skin colour.
  * ACCENT  — the deep-red headwrap + shading ((h>=322 or h<=14) & s>=0.34 & v>=0.16).
  * OUTFIT  — the dark navy undersuit: bluish-dark (150<=h<=275 & v<0.62) OR neutral dark cloth
              (s<0.30 & 0.10<=v<0.48).
  * OTHER   — anything else (skin shadows etc.) — left untouched.

paint(): to-tone re-centre on the target hue at the target value, preserving each region's own light/dark
SPREAD (floor keeps a near-black target above outline-black; to_sat sets output saturation).

USAGE: gen_onoki_creative.py [probe|preview|all|<tag>]     # default: all
  probe   -> onoki_skin_mask_debug.png (regions tinted) to verify classification
  preview -> recolor idle per skin + onoki_skins_preview.png montage (no full batch)
  all     -> recolor EVERY animationData sheet + portrait for all 13 skins
"""
import os, sys, re, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE uniform sheet in Onoki's animationData (golem sheets are NOT in animationData → the summoned
# stone golem correctly stays uncoloured across all skins). Recolored per skin as sheet__<tag>.png.
SHEETS = [
    "onoki_idle_uniform.png", "onoki_walk_uniform.png", "onoki_dash_uniform.png", "onoki_guard_uniform.png",
    "onoki_jump_uniform.png", "onoki_jump_flip_uniform.png", "onoki_hover_idle_uniform.png",
    "onoki_flight_glide_uniform.png", "onoki_hit_uniform.png", "onoki_knockdown_uniform.png",
    "onoki_getup_uniform.png", "onoki_taunt_uniform.png", "onoki_light_uniform.png", "onoki_heavy_uniform.png",
    "onoki_up_uniform.png", "onoki_air_uniform.png", "onoki_downair_uniform.png", "onoki_cmdchain_uniform.png",
    "onoki_rockfist_uniform.png", "onoki_lunge_uniform.png", "onoki_armswing_uniform.png",
    "onoki_tauntfin_uniform.png", "onoki_capespin_uniform.png", "onoki_jutsu_launch_uniform.png",
    "onoki_jutsu_charge_uniform.png", "onoki_fast_dive_uniform.png", "onoki_aerial_spin_uniform.png",
    "onoki_platform_ride_uniform.png", "onoki_ult_cast_uniform.png",
]

def classify(h, s, v):
    if v < 0.10 and s < 0.35:                              return "OUTLINE"
    if 14 <= h <= 52 and s >= 0.18 and v >= 0.50:          return "SKIN"
    if v >= 0.82 and s < 0.16:                             return "LIGHT"
    if 88 <= h <= 165 and s >= 0.28:                       return "CAPE"
    if (h >= 322 or h <= 14) and s >= 0.34 and v >= 0.16:  return "ACCENT"
    if 150 <= h <= 275 and v < 0.62:                       return "OUTFIT"
    if s < 0.30 and 0.10 <= v < 0.48:                      return "OUTFIT"
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
        px[x, y] = (g, g, max(g, round(g * 1.15)), px[x, y][3])   # faint cool tint

# each region tuple = (hex, to_sat, floor, spread);  None = keep original
SKINS = {
    # ── Iwagakure stone / earth (his village + Earth-nature affinity) ──
    "stonesovereign": dict(cape=("#8A9080", 0.16, 0.20, 1.15), outfit=("#2C2E36", 0.20, 0.10, 1.12), accent=("#6B4A2A", 0.55, 0.18, 1.15), note="Iwagakure stone-grey mantle over slate"),
    "ironfortress":   dict(cape=("#5A6B78", 0.28, 0.18, 1.15), outfit=("#1A1C22", 0.22, 0.09, 1.10), accent=("#7A3A28", 0.62, 0.18, 1.15), note="the immovable iron wall"),
    "jademountain":   dict(cape=("#1E7A5A", 0.72, 0.18, 1.18), outfit=("#17282C", 0.40, 0.10, 1.12), accent=("#B0782A", 0.72, 0.24, 1.15), note="deep jade — mountain forest"),
    # ── Dust Release / Particle Style (his Kekkei Tota — atomic, prismatic) ──
    "dustrelease":    dict(cape=("#BCCAD0", 0.10, 0.40, 1.20), outfit=("#24262E", 0.24, 0.10, 1.12), accent=("#7A3A9A", 0.66, 0.22, 1.16), note="pale prismatic — atomic Particle Style"),
    # ── Tsuchikage office — formal Kage regalia ──
    "tsuchikage":     dict(cape=("#B0242C", 0.80, 0.24, 1.18), outfit=("#E2DCCE", 0.07, 0.55, 1.22), accent=("#C89A3A", 0.74, 0.30, 1.16), note="crimson Kage robe + cream + gold"),
    "goldenkage":     dict(cape=("#C89A2E", 0.82, 0.30, 1.18), outfit=("#2E2418", 0.45, 0.10, 1.14), accent=("#8A2028", 0.80, 0.20, 1.16), note="regal ceremonial gold"),
    "thirdsregalia":  dict(cape=("#5A2E8A", 0.66, 0.18, 1.16), outfit=("#1A1620", 0.28, 0.09, 1.10), accent=("#C8A83A", 0.76, 0.30, 1.16), note="dignified royal purple + gold"),
    # ── earth's molten heart / aggression ──
    "moltencore":     dict(cape=("#D2591C", 0.86, 0.28, 1.20), outfit=("#16161C", 0.20, 0.08, 1.10), accent=("#A82818", 0.84, 0.20, 1.16), note="lava orange — earth's molten core"),
    "crimsonrock":    dict(cape=("#A82430", 0.82, 0.22, 1.18), outfit=("#16161C", 0.20, 0.08, 1.10), accent=("#8A8A82", 0.12, 0.24, 1.15), note="red-primary rock over grey"),
    # ── age / veteran ──
    "ashelder":       dict(cape=("#808A76", 0.20, 0.22, 1.15), outfit=("#24281E", 0.30, 0.10, 1.12), accent=("#7A3838", 0.55, 0.18, 1.15), note="ashen grey-green — aged veteran"),
    "youngprime":     dict(cape=("#2EA84E", 0.82, 0.20, 1.20), outfit=("#12142A", 0.55, 0.09, 1.12), accent=("#C82030", 0.84, 0.22, 1.16), note="vivid — Onoki in his prime"),
    # ── Iwa–Suna desert accord ──
    "sandaccord":     dict(cape=("#C2A868", 0.55, 0.34, 1.18), outfit=("#2A2018", 0.42, 0.10, 1.14), accent=("#2A8A9A", 0.70, 0.24, 1.16), note="desert tan + turquoise (Suna accord)"),
    # ── Alien-X-style Void (special: full-black + game.js amber-stone aura overlay) ──
    "eternalvoid":    dict(void=True, note="full-black Dust-void silhouette + amber-stone aura (game.js overlay)"),
}

DISPLAY = {
    "stonesovereign": "Stone Sovereign", "ironfortress": "Iron Fortress", "jademountain": "Jade Mountain",
    "dustrelease": "Dust Release", "tsuchikage": "Tsuchikage", "goldenkage": "Golden Kage",
    "thirdsregalia": "Third's Regalia", "moltencore": "Molten Core", "crimsonrock": "Crimson Rock",
    "ashelder": "Ash Elder", "youngprime": "Young Prime", "sandaccord": "Sand Accord",
    "eternalvoid": "Eternal Void",
}
ORDER = ["stonesovereign", "ironfortress", "jademountain", "dustrelease", "tsuchikage", "goldenkage",
         "thirdsregalia", "moltencore", "crimsonrock", "ashelder", "youngprime", "sandaccord", "eternalvoid"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("OUTLINE", "SKIN", "LIGHT", "CAPE", "ACCENT", "OUTFIT", "OTHER")}
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
        for k in ("CAPE", "ACCENT", "OUTFIT", "SKIN", "LIGHT", "OTHER"):
            void_paint(px, reg[k])
    else:
        paint(px, reg["CAPE"],   spec.get("cape"))
        paint(px, reg["OUTFIT"], spec.get("outfit"))
        paint(px, reg["ACCENT"], spec.get("accent"))
    im.save(os.path.join(ROOT, out))

def make_portrait(tag):
    """Bust portrait per skin from the recolored idle frame 0 (mirrors reslice_onoki.make_portrait)."""
    src = os.path.join(ROOT, f"onoki_idle_uniform__{tag}.png")
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0)
    x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    y0, y1 = min(ys), max(ys)
    bust = im.crop((x0, y0, x1 + 1, y0 + int((y1 - y0 + 1) * 0.62)))
    scale = 288 / bust.height
    bust.resize((max(1, round(bust.width * scale)), 288), Image.NEAREST).save(os.path.join(ROOT, f"onoki_portrait__{tag}.png"))

def probe():
    """Dump a region-mask debug image (each region tinted) to verify classification."""
    im = Image.open(os.path.join(ROOT, "onoki_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"OUTLINE": (0, 0, 0), "SKIN": (255, 220, 170), "LIGHT": (255, 255, 255),
            "CAPE": (0, 220, 0), "ACCENT": (255, 0, 0), "OUTFIT": (0, 90, 255), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, "onoki_skin_mask_debug.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("→ onoki_skin_mask_debug.png  (green=CAPE red=ACCENT blue=OUTFIT tan=SKIN black=OUTLINE magenta=OTHER)")

def preview():
    """Recolor idle per skin + build a labelled montage of all 13 (+default) — no full batch."""
    recolor("onoki_idle_uniform.png", "onoki_idle_uniform__default.png", "stonesovereign")  # placeholder overwrite below
    tiles = []
    # default first (original idle frame 0)
    def frame0(path):
        im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
        col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
        x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
        ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
        return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))
    tiles.append(("Default", frame0("onoki_idle_uniform.png")))
    for tag in ORDER:
        recolor("onoki_idle_uniform.png", f"onoki_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], frame0(f"onoki_idle_uniform__{tag}.png")))
    cols = 7; cw, ch = 120, 150; pad = 6; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min((cw - 2 * pad) / cell.width, (ch - 2 * pad) / cell.height, 2.2)
        rs = cell.resize((max(1, round(cell.width * sc)), max(1, round(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "onoki_skins_preview.png"))
    print(f"→ onoki_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

def build_all():
    for tag in ORDER:
        for sh in SHEETS:
            recolor(sh, sh.replace(".png", f"__{tag}.png"), tag)
        make_portrait(tag)
        print(f"OK {tag}: {len(SHEETS)} sheets + portrait")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "probe":     probe()
    elif mode == "preview": preview()
    elif mode == "all":     build_all()
    elif mode in SKINS:
        for sh in SHEETS: recolor(sh, sh.replace(".png", f"__{mode}.png"), mode)
        make_portrait(mode); print(f"OK {mode}")
    else: print("usage: gen_onoki_creative.py [probe|preview|all|<tag>]")
