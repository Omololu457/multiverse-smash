#!/usr/bin/env python3
"""Aoi Todo (JJK) — 8 coordinated palette recolors + Void Sovereign (9 recolor alt-skins).
   (Kyoto Uniform homage is NOT a recolor — it needs new jacket/shirt silhouette art and is
    handled separately / flagged; it is intentionally absent from this tool.)

★ HEALTH-CHECKED against the REAL sprite (NOT the build-prompt's Section 0 assumptions). The prompt
described 4 regions: Skin / Hair / Pants / a "vivid blue SASH" called the character's one accent color.
The actual rip shows:
  * NO blue sash exists — a full opaque-pixel scan found ZERO saturated-blue pixels. The only waist
    accent is a small GREY belt/waistband (#606060..#9C9C9C).
  * Pants are dark NAVY-BLUE (#0C0C18..#242448), not black.
  * Hair fill is pure #000000 == the OUTLINE → hair is NOT cleanly recolorable by value (would bleed
    into the line-art). Left black (same constraint alt_sukuna hit → strategy A).
  * The facial scar is 1-2 dark pixels baked into face shading — not a separable region; it shifts with
    skin tone (cannot be individually "kept fixed"). Flagged, not recolored specially.

OWNER-LOCKED plan (AskUserQuestion 2026-08-18):
  * Q1 "Accent region" -> PANTS-as-accent: recolor the navy PANTS to each skin's vivid accent hue; the
    grey belt stays grey (untouched).
  * Q2 "Skin recolor"  -> YES recolor SKIN per skin (deliberate, flagged departure from the standard
    skin-exclusion default — justified because Todo fights shirtless, so skin is the dominant region and
    is what actually distinguishes one skin from another).
So each skin = SKIN tone (varies) + PANTS color (varies, = the accent). Belt/hair/outline/shoes protected.

FIVE paintable classes, classified ONCE from ORIGINAL pixels (priority order; each pixel <= one class):
  * PANTS   — navy trousers: blue hue (200<=h<=265) & s>=0.22. FIRST, so DARK navy is caught before OUTLINE.
  * OUTLINE — black line-art + hair mass + shoes (v<0.15). PROTECTED (why hair stays black).
  * LIGHT   — white highlights / teeth / eye glints (v>=0.90 & s<0.12). PROTECTED.
  * SKIN    — tan face/torso/arms (5<=h<=45 & 0.15<=s<0.66 & v>=0.42).
  * OTHER   — grey belt + grey hair-highlights + misc (low-sat mids). Untouched.

paint(): re-centre a region on the target hue at the target value, preserving its own light/dark SPREAD
(keeps muscle/ab shading + pant folds intact).

USAGE: gen_aoi_todo_creative.py [probe|preview|all|<tag>]      # default: all
  probe   -> aoi_todo_skin_mask_debug(_6x).png (regions tinted) to verify classification
  preview -> recolor idle per skin + aoi_todo_skins_preview.png montage (no full batch)
  all     -> recolor EVERY animationData sheet + portrait for all 9 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE uniform sheet in aoi_todo's animationData (25). run/dash reuse walk-ish, down_air reuses
# air, todoClap reuses guard — but each distinct FILE below is recolored so every reference resolves.
SHEETS = [
    "aoi_todo_idle_uniform.png", "aoi_todo_walk_uniform.png", "aoi_todo_run_uniform.png",
    "aoi_todo_crouch_uniform.png", "aoi_todo_jump_uniform.png", "aoi_todo_fall_uniform.png",
    "aoi_todo_guard_uniform.png", "aoi_todo_hurt_uniform.png", "aoi_todo_knockdown_uniform.png",
    "aoi_todo_getup_uniform.png", "aoi_todo_light_uniform.png", "aoi_todo_heavy_uniform.png",
    "aoi_todo_up_uniform.png", "aoi_todo_air_uniform.png", "aoi_todo_crouchlight_uniform.png",
    "aoi_todo_combo1_uniform.png", "aoi_todo_combo2_uniform.png", "aoi_todo_combo3_uniform.png",
    "aoi_todo_gun_uniform.png", "aoi_todo_firekick_uniform.png", "aoi_todo_whip_uniform.png",
    "aoi_todo_spin_uniform.png", "aoi_todo_armor_uniform.png", "aoi_todo_dive_uniform.png",
    "aoi_todo_win_uniform.png", "aoi_todo_lose_uniform.png",
]
PORTRAIT = "aoi_todo_portrait.png"

def classify(h, s, v):
    if 200 <= h <= 265 and s >= 0.22:                   return "PANTS"    # navy trousers (BEFORE outline)
    if v < 0.15:                                        return "OUTLINE"  # black line-art/hair/shoes
    if v >= 0.90 and s < 0.12:                          return "LIGHT"    # teeth/eye glints
    if 5 <= h <= 45 and 0.15 <= s < 0.66 and v >= 0.42: return "SKIN"     # tan face/torso/arms
    return "OTHER"                                                        # grey belt + hair-highlights

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.14):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.05, round(tv * 0.30, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
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
    """Void: crush a region to near-black, keeping a whisper of its own shading + a faint blue-white
    cursed tint (Boogie Woogie / cursed-energy void)."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.25)), px[x, y][3])   # a touch cool/blue

# each skin = SKIN tone + PANTS colour (= the accent). belt/hair/outline protected. None on void.
SKINS = {
    # ── Group 1 — 4 coordinated recolors (prompt Skin col -> SKIN, Sash/accent col -> PANTS) ──
    "crimsonbrawler":   dict(skin=S("#B8836B"), pants=S("#B8242E"), note="bronze-red skin / red pants"),
    "verdantstorm":     dict(skin=S("#A5B87B"), pants=S("#2E8C4A"), note="olive-tan skin / green pants"),
    "goldentitan":      dict(skin=S("#E0B570"), pants=S("#C9862E"), note="gold-tan skin / gold pants"),
    "obsidianfighter":  dict(skin=S("#9C9C9C"), pants=S("#242424"), note="grey skin / near-black pants (monochrome)"),
    # ── Group 2 — 4 coordinated recolors ──
    "frostboundbrawler":dict(skin=S("#D6CDC4"), pants=S("#4AC9E0"), note="pale cool skin / ice-blue pants"),
    "emberfighter":     dict(skin=S("#A5714A"), pants=S("#E8621A"), note="deep bronze skin / ember-orange pants"),
    "violetreign":      dict(skin=S("#B5A5B5"), pants=S("#8C4AC9"), note="cool violet-tan skin / violet pants"),
    "ashfallchampion":  dict(skin=S("#B0A899"), pants=S("#8C6B3D"), note="ash-grey skin / dull-bronze pants"),
    # ── Specialty (1 here) — Void Sovereign: full near-black incl. skin + game.js clap-shockwave overlay ──
    "voidsovereign":    dict(void=True, note="full-black cursed silhouette + drifting clap-shockwave/afterimage overlay (game.js)"),
}

DISPLAY = {
    "crimsonbrawler": "Crimson Brawler", "verdantstorm": "Verdant Storm",
    "goldentitan": "Golden Titan", "obsidianfighter": "Obsidian Fighter",
    "frostboundbrawler": "Frostbound Brawler", "emberfighter": "Ember Fighter",
    "violetreign": "Violet Reign", "ashfallchampion": "Ashfall Champion",
    "voidsovereign": "Void Sovereign",
}
ORDER = ["crimsonbrawler", "verdantstorm", "goldentitan", "obsidianfighter",
         "frostboundbrawler", "emberfighter", "violetreign", "ashfallchampion",
         "voidsovereign"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("PANTS", "OUTLINE", "LIGHT", "SKIN", "OTHER")}
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
        for k in ("PANTS", "SKIN", "OUTLINE", "LIGHT", "OTHER"):
            void_paint(px, reg[k])
    else:
        paint(px, reg["SKIN"],  spec.get("skin"))
        paint(px, reg["PANTS"], spec.get("pants"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "aoi_todo_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"PANTS": (60, 60, 255), "OUTLINE": (0, 0, 0), "LIGHT": (255, 255, 255),
            "SKIN": (255, 190, 130), "OTHER": (0, 220, 0)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, "aoi_todo_skin_mask_debug.png"))
    dbg.resize((im.width * 6, im.height * 6), Image.NEAREST).save(os.path.join(ROOT, "aoi_todo_skin_mask_debug_6x.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("→ aoi_todo_skin_mask_debug(_6x).png  (blue=PANTS black=OUTLINE white=LIGHT tan=SKIN green=OTHER[belt/hair-hi])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("aoi_todo_idle_uniform.png"))]
    for tag in ORDER:
        recolor("aoi_todo_idle_uniform.png", f"aoi_todo_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"aoi_todo_idle_uniform__{tag}.png")))
    cols = 5; cw, ch = 120, 160; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min((cw - 12) / cell.width, (ch - 12) / cell.height, 2.2)
        rs = cell.resize((max(1, round(cell.width * sc)), max(1, round(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "aoi_todo_skins_preview.png"))
    print(f"→ aoi_todo_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
