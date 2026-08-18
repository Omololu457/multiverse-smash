#!/usr/bin/env python3
"""Kiba Inuzuka (+ Akamaru) — 12 creative alt-skins + 1 Alien-X-style Void skin. Inuzuka-clan / beast /
fang / tracker lore. OUTFIT-PRIMARY: Kiba's art has NO separate confirmed accent — the "fang-mark" reds
are a low-saturation warm red-brown that blends with skin shadow (resampled kiba_portrait/stance/air:
outfit neutral-grey RGB(16,16,16)-(80,80,80) + navy darks RGB(0,16,32)-(32,32,48) / skin pale-tan
RGB(240,176,144) + warm fang shadows). So we recolor ONLY the OUTFIT region; SKIN (warm tan + fang
browns), OUTLINE (near-pure black), and LIGHT (white highlights AND the summoned white wolves) are
protected. Cosmetic only — ZERO gameplay/stat changes.

FIVE classes, from the ORIGINAL pixels (capture-masks-first = contamination-proof):
  * OUTLINE — the truest black line-art (v<0.07). Protected.
  * SKIN    — warm tan face/hands + fang-mark browns + brown beast-drill FX (5<=h<=52 & s>=0.16 & v>=0.32).
              Protected (this is also why the brown twin-drill FX stays canonical).
  * LIGHT   — white highlights + the summoned WHITE WOLVES (v>=0.78 & s<0.22). Protected.
  * OUTFIT  — the dark neutral-grey + navy cloth (the ONLY recolor region): bluish-dark
              (172<=h<=268 & v<0.55) OR neutral dark cloth (s<0.38 & 0.07<=v<0.50).
  * OTHER   — anything else — left untouched.

USAGE: gen_kiba_creative.py [probe|preview|all|<tag>]     # default: all
  probe   -> kiba_skin_mask_debug.png (regions tinted) to verify classification
  preview -> recolor idle per skin + kiba_skins_preview.png montage (no full batch)
  all     -> recolor EVERY animationData sheet + portrait for all 13 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE sheet in Kiba's animationData. The FX/beast sheets (gatsuga_strong drill, twoheaded drill)
# are recolored too so a __tag.png exists for every slot (no missing-file boxes), but their brown-drill /
# white-wolf pixels fall in the PROTECTED SKIN/LIGHT classes → they pass through ~unchanged (canonical).
SHEETS = [
    "kiba_idle_uniform.png", "kiba_run_uniform.png", "kiba_dash_uniform.png", "kiba_jump_uniform.png",
    "kiba_guard_uniform.png", "kiba_guard_air_uniform.png", "kiba_charge_uniform.png", "kiba_hurt_uniform.png",
    "kiba_knockdown_uniform.png", "kiba_win_uniform.png", "kiba_light_uniform.png", "kiba_heavy_uniform.png",
    "kiba_upstrong_uniform.png", "kiba_air_uniform.png", "kiba_downair_uniform.png", "kiba_fwdstrong_uniform.png",
    "kiba_aerialstrong_uniform.png", "kiba_gatsuga_weak_uniform.png", "kiba_gatsuga_strong_uniform.png",
    "kiba_fourlegs_uniform.png", "kiba_twoheaded_uniform.png",
]

def classify(h, s, v):
    if v < 0.07:                                           return "OUTLINE"
    if 5 <= h <= 52 and s >= 0.16 and v >= 0.32:           return "SKIN"
    if v >= 0.78 and s < 0.22:                             return "LIGHT"
    if 172 <= h <= 268 and v < 0.55:                       return "OUTFIT"
    if s < 0.38 and 0.07 <= v < 0.50:                      return "OUTFIT"
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, spec):
    """spec = (hex, to_sat, floor, spread) or None (keep). to-tone re-centre preserving each pixel's spread."""
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
    """Alien-X void: crush a region to near-black, keeping a whisper of its own shading spread."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, max(g, round(g * 1.12)), px[x, y][3])   # faint cool tint

# region tuple = (hex, to_sat, floor, spread); OUTFIT-only (Kiba has no cape/accent).
SKINS = {
    "ashenwolf":     dict(outfit=("#8C9098", 0.08, 0.30, 1.14), note="silver-grey — Akamaru's coat"),
    "inuzukacrimson":dict(outfit=("#8A2226", 0.66, 0.10, 1.14), note="clan crimson — fang & blood"),
    "wildfang":      dict(outfit=("#6E4A2C", 0.52, 0.10, 1.14), note="earthy brown — feral tracker"),
    "foresttracker": dict(outfit=("#3F5A30", 0.55, 0.10, 1.14), note="hunter green — forest hunt"),
    "midnighthound": dict(outfit=("#232E6A", 0.62, 0.09, 1.12), note="deep indigo — midnight hound"),
    "tsumesblood":   dict(outfit=("#5A1F30", 0.60, 0.10, 1.14), note="burgundy — Tsume's heir"),
    "leafchunin":    dict(outfit=("#1F5A58", 0.62, 0.10, 1.14), note="teal — Leaf chunin"),
    "beastsovereign":dict(outfit=("#4A2A6E", 0.60, 0.09, 1.13), note="royal purple — beast sovereign"),
    "frosthunter":   dict(outfit=("#6F98C0", 0.42, 0.24, 1.16), note="icy pale blue — snowfield hunt"),
    "embermaw":      dict(outfit=("#A8541F", 0.74, 0.14, 1.16), note="burnt orange — ember maw"),
    "venomhound":    dict(outfit=("#6A7820", 0.66, 0.14, 1.15), note="toxic yellow-green — venom hound"),
    "stormgrey":     dict(outfit=("#45566E", 0.40, 0.14, 1.14), note="steel blue-grey — storm tracker"),
    "eternalvoid":   dict(void=True, note="full-black beast-void silhouette + crimson fang aura (game.js overlay)"),
}
DISPLAY = {
    "ashenwolf": "Ashen Wolf", "inuzukacrimson": "Inuzuka Crimson", "wildfang": "Wild Fang",
    "foresttracker": "Forest Tracker", "midnighthound": "Midnight Hound", "tsumesblood": "Tsume's Blood",
    "leafchunin": "Leaf Chunin", "beastsovereign": "Beast Sovereign", "frosthunter": "Frost Hunter",
    "embermaw": "Ember Maw", "venomhound": "Venom Hound", "stormgrey": "Storm Grey", "eternalvoid": "Eternal Void",
}
ORDER = ["ashenwolf", "inuzukacrimson", "wildfang", "foresttracker", "midnighthound", "tsumesblood",
         "leafchunin", "beastsovereign", "frosthunter", "embermaw", "venomhound", "stormgrey", "eternalvoid"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("OUTLINE", "SKIN", "LIGHT", "OUTFIT", "OTHER")}
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
        for k in ("OUTFIT", "SKIN", "LIGHT", "OTHER"): void_paint(px, reg[k])
    else:
        paint(px, reg["OUTFIT"], spec.get("outfit"))
    im.save(os.path.join(ROOT, out))

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def make_portrait(tag):
    """Bust portrait per skin from the recolored idle frame 0."""
    bust = _frame0(f"kiba_idle_uniform__{tag}.png")
    bh = int(bust.height * 0.62); bust = bust.crop((0, 0, bust.width, bh))
    scale = 288 / bust.height
    bust.resize((max(1, round(bust.width * scale)), 288), Image.NEAREST).save(os.path.join(ROOT, f"kiba_portrait__{tag}.png"))

def probe():
    im = Image.open(os.path.join(ROOT, "kiba_air_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"OUTLINE": (0, 0, 0), "SKIN": (255, 210, 160), "LIGHT": (255, 255, 255),
            "OUTFIT": (0, 120, 255), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width*3, im.height*3), Image.NEAREST).save(os.path.join(ROOT, "kiba_skin_mask_debug.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("→ kiba_skin_mask_debug.png  (blue=OUTFIT tan=SKIN white=LIGHT black=OUTLINE magenta=OTHER)")

def preview():
    tiles = [("Default", _frame0("kiba_idle_uniform.png"))]
    for tag in ORDER:
        recolor("kiba_idle_uniform.png", f"kiba_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"kiba_idle_uniform__{tag}.png")))
    cols = 7; cw, ch = 120, 150; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min((cw - 12) / cell.width, (ch - 12) / cell.height, 2.4)
        rs = cell.resize((max(1, round(cell.width * sc)), max(1, round(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "kiba_skins_preview.png"))
    print(f"→ kiba_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

def build_all():
    for tag in ORDER:
        for sh in SHEETS:
            recolor(sh, sh.replace(".png", f"__{tag}.png"), tag)
        make_portrait(tag)
        print(f"  ✓ {tag}: {len(SHEETS)} sheets + portrait")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "probe": probe()
    elif mode == "preview": preview()
    elif mode == "all": build_all()
    elif mode in SKINS:
        for sh in SHEETS: recolor(sh, sh.replace(".png", f"__{mode}.png"), mode)
        make_portrait(mode); print(f"✓ {mode}")
    else: print(f"unknown mode {mode}")
