#!/usr/bin/env python3
"""Mayuri Kurotsuchi (Bleach, 12th-Division captain / mad scientist) — 12 creative alt-skins + 1 Alien-X
Void. Soul Society / Research-&-Development (SRDI) / poison / Bankai-Konjiki / experiment lore. ROBE is
the primary identity colour (the white-cream captain's haori); UNDER-LAYER (navy under-suit), OUTER-TRIM
(grey lining) + ACCENT (purple-magenta head-piece) shift ONLY where a skin specifies. FACE/SKIN + the
warm-gold obi cord + line-art OUTLINE are protected (never recoloured). MAIN FORM ONLY — Nemu's assist art
and the Bankai construct sheets are NOT in animationData, so they are never touched. Cosmetic — ZERO gameplay.

Palette confirmed by pixel-sampling (row_44 + idle):  robe white-cream RGB(240,240,240) / under-layer navy
RGB(0,0,16)-(48,48,64) (reads as SATURATED dark-blue h~200-220, separated from OUTLINE by hue) / outer-trim
grey RGB(96,96,96)-(160,160,160) / accent purple-magenta RGB(128,48,112)/RGB(96,0,80) / warm-gold obi h~40-60.
SIX regions classified ONCE from ORIGINAL pixels (priority order); robe vs trim split by VALUE (robe bright,
trim mid); navy outfit escapes OUTLINE by its blue HUE:
  * ACCENT  — purple-magenta head-piece (270<=h<=340 & s>=0.22 & v>=0.14). shift only where specified.
  * OBI     — warm-gold sash cord / any skin tone (18<=h<=66 & s>=0.24 & v>=0.35). PROTECTED.
  * OUTFIT  — navy under-suit: bluish (180<=h<=262 & v<0.58) OR neutral very-dark cloth (s<0.22 & v<0.30).
  * OUTLINE — near-pure-black neutral line-art (v<0.09 & NOT bluish). PROTECTED.
  * ROBE    — bright white-cream haori (s<0.16 & v>=0.62). PRIMARY per-skin colour.
  * TRIM    — mid grey lining (s<0.16 & 0.30<=v<0.62). shift only where specified.
  * OTHER   — anything else (skin shadows etc.). PROTECTED.
paint(): to-tone re-centre on the target hue/value preserving each region's own light/dark SPREAD.

USAGE: gen_mayuri_creative.py [probe|preview|all|<tag>]     # default: all
  probe   -> mayuri_skin_mask_debug.png (regions tinted) + region counts
  preview -> recolor idle per skin + mayuri_skins_preview.png montage (no full batch)
  all     -> recolor EVERY main-form animationData sheet + portrait for all 13 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE main-form uniform sheet in Mayuri's animationData. jump/fall reuse dash, guard reuses idle →
# their retag points at these same files. Nemu (mayuri_nemu_*), the Bankai CONSTRUCT (mayuri_bankai_construct),
# and every FX/projectile sheet are NOT in animationData → correctly stay uncoloured across all skins.
SHEETS = [
    "mayuri_idle_uniform.png", "mayuri_idle_seated_uniform.png", "mayuri_walk_uniform.png",
    "mayuri_run_uniform.png", "mayuri_dash_uniform.png", "mayuri_crouch_uniform.png",
    "mayuri_hurt_uniform.png", "mayuri_knockdown_uniform.png", "mayuri_getup_uniform.png",
    "mayuri_light_uniform.png", "mayuri_heavy_uniform.png", "mayuri_up_uniform.png",
    "mayuri_air_uniform.png", "mayuri_downair_uniform.png", "mayuri_cmd1_uniform.png",
    "mayuri_cmd2_uniform.png", "mayuri_blast_uniform.png", "mayuri_slash_uniform.png",
    "mayuri_rising_uniform.png", "mayuri_poison_uniform.png", "mayuri_coatopen_uniform.png",
    "mayuri_bankai_cast_uniform.png",
]

def classify(h, s, v):
    if 270 <= h <= 340 and s >= 0.22 and v >= 0.14:          return "ACCENT"
    if 18 <= h <= 66 and s >= 0.24 and v >= 0.35:            return "OBI"       # warm-gold sash / skin — protected
    if 180 <= h <= 262 and v < 0.58:                         return "OUTFIT"    # navy under-suit (bluish)
    if s < 0.22 and 0.09 <= v < 0.30:                        return "OUTFIT"    # neutral very-dark cloth
    if v < 0.09:                                             return "OUTLINE"   # near-black line-art (navy escaped above)
    if s < 0.16 and v >= 0.62:                               return "ROBE"      # bright white-cream — PRIMARY
    if s < 0.16 and 0.30 <= v < 0.62:                        return "TRIM"      # mid grey lining
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
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), px[x, y][3])
    return len(pts)

def void_paint(px, pts):
    """Alien-X void: crush a region to near-black, keeping a whisper of its own shading spread."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, max(g, round(g * 1.12)), px[x, y][3])   # faint cool tint

# each region tuple = (hex, to_sat, floor, spread); None/absent = keep original
SKINS = {
    # ── Research & Development / 12th Division (SRDI) ──
    "researchdivision": dict(robe=("#5FA6AC", 0.36, 0.48, 1.16), note="SRDI teal-cyan captain's haori"),
    "reigai":           dict(robe=("#8FC6B0", 0.34, 0.54, 1.16), note="artificial-soul pale mint (Reigai)"),
    "clinicalash":      dict(robe=("#9AA0A4", 0.06, 0.50, 1.15), outfit=("#2A2E34", 0.24, 0.10, 1.12), note="desaturated clinical grey lab coat"),
    # ── poison / experiment ──
    "toxic":            dict(robe=("#83A838", 0.60, 0.44, 1.16), outfit=("#242A18", 0.42, 0.10, 1.12), note="sickly poison-green — his signature toxin"),
    "biohazard":        dict(robe=("#B8C23A", 0.62, 0.48, 1.16), accent=("#C8A824", 0.78, 0.30, 1.16), note="hazard yellow-green + amber accent"),
    "bloodexperiment":  dict(robe=("#A82632", 0.80, 0.32, 1.18), outfit=("#16161C", 0.20, 0.08, 1.10), note="crimson — cruel blood experiments"),
    "hollowfied":       dict(robe=("#D6CDBE", 0.12, 0.56, 1.16), accent=("#B01828", 0.82, 0.22, 1.16), outfit=("#141419", 0.16, 0.08, 1.10), note="bone-white + Hollow-crimson accent"),
    # ── Bankai / regalia ──
    "konjiki":          dict(robe=("#C8A636", 0.74, 0.42, 1.18), accent=("#A87A22", 0.80, 0.28, 1.16), note="Konjiki gold — the golden Ashisogi Jizō"),
    "venomviolet":      dict(robe=("#6C3A9C", 0.62, 0.36, 1.16), accent=("#48105E", 0.80, 0.16, 1.14), note="deep venom violet — matches his magenta motif"),
    "sokyoku":          dict(robe=("#C85A26", 0.80, 0.38, 1.18), note="Sōkyoku burnt-vermilion (execution scaffold)"),
    # ── Soul Society formal / prison ──
    "seireitei":        dict(robe=("#C6D0DE", 0.14, 0.60, 1.18), outfit=("#14203C", 0.62, 0.10, 1.14), note="crisp cool-white haori + deep navy formal"),
    "muken":            dict(robe=("#3A3E58", 0.42, 0.24, 1.14), outfit=("#101018", 0.24, 0.07, 1.10), note="Muken indigo-black — the deepest prison"),
    # ── Alien-X-style Void (special: full-black + game.js poison-aura overlay) ──
    "eternalvoid":      dict(void=True, note="full-black void silhouette + poison-green aura (game.js overlay)"),
}

DISPLAY = {
    "researchdivision": "Research Division", "reigai": "Reigai", "clinicalash": "Clinical Ash",
    "toxic": "Toxic", "biohazard": "Bio-Hazard", "bloodexperiment": "Blood Experiment",
    "hollowfied": "Hollowfied", "konjiki": "Konjiki Gold", "venomviolet": "Venom Violet",
    "sokyoku": "Sokyoku Crimson", "seireitei": "Seireitei Formal", "muken": "Muken",
    "eternalvoid": "Eternal Void",
}
ORDER = ["researchdivision", "reigai", "clinicalash", "toxic", "biohazard", "bloodexperiment",
         "hollowfied", "konjiki", "venomviolet", "sokyoku", "seireitei", "muken", "eternalvoid"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("ACCENT", "OBI", "OUTFIT", "OUTLINE", "ROBE", "TRIM", "OTHER")}
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
        for k in ("ACCENT", "OBI", "OUTFIT", "ROBE", "TRIM", "OTHER"):
            void_paint(px, reg[k])
    else:
        paint(px, reg["ROBE"],   spec.get("robe"))
        paint(px, reg["TRIM"],   spec.get("trim"))
        paint(px, reg["OUTFIT"], spec.get("outfit"))
        paint(px, reg["ACCENT"], spec.get("accent"))
    im.save(os.path.join(ROOT, out))

def make_portrait(tag):
    src = os.path.join(ROOT, f"mayuri_idle_uniform__{tag}.png")
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0)
    x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    y0, y1 = min(ys), max(ys)
    bust = im.crop((x0, y0, x1 + 1, y0 + int((y1 - y0 + 1) * 0.62)))
    scale = 288 / bust.height
    bust.resize((max(1, round(bust.width * scale)), 288), Image.NEAREST).save(os.path.join(ROOT, f"mayuri_portrait__{tag}.png"))

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def probe():
    im = Image.open(os.path.join(ROOT, "mayuri_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"ACCENT": (230, 0, 200), "OBI": (240, 190, 40), "OUTFIT": (0, 80, 255), "OUTLINE": (0, 0, 0),
            "ROBE": (255, 255, 255), "TRIM": (150, 150, 150), "OTHER": (255, 90, 0)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, "mayuri_skin_mask_debug.png"))
    tot = sum(len(v) for v in reg.values()) or 1
    print("region %:", {k: round(100 * len(v) / tot) for k, v in reg.items()})
    print("→ mayuri_skin_mask_debug.png (white=ROBE grey=TRIM blue=OUTFIT magenta=ACCENT gold=OBI black=OUTLINE orange=OTHER)")

def preview():
    tiles = [("Default", _frame0("mayuri_idle_uniform.png"))]
    for tag in ORDER:
        recolor("mayuri_idle_uniform.png", f"mayuri_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"mayuri_idle_uniform__{tag}.png")))
    cols = 7; cw, ch = 120, 170; pad = 6; lblh = 16
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
    mont.convert("RGB").save(os.path.join(ROOT, "mayuri_skins_preview.png"))
    print(f"→ mayuri_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
    else: print("usage: gen_mayuri_creative.py [probe|preview|all|<tag>]")
