#!/usr/bin/env python3
"""Vegito Ultra Instinct -Sign- (DBZ) — 8 coordinated palette recolors + Void Sovereign + Super Saiyan Blue
   (10 alt-skins on top of Default).

★ HEALTH-CHECKED against the REAL sprite/portrait (tools scan, NOT just the prompt's Section 0). Findings:
  * Gi jacket + trousers = dark NAVY BLUE (h 200-262, s>=0.2) — the dominant garment (~47% portrait / ~65% idle).
    Treated as ONE "GI" region (the prompt lists only "gi jacket"; trousers share the navy, recolored together).
  * Hair BASE = the black line-art mass (v<0.16) — same pixels as the body OUTLINE, so it is NOT cleanly
    recolorable by value alone (aoi_todo/alt_sukuna constraint). The 8 recolors KEEP it black (as the prompt
    specifies "hair base black — unchanged"), which sidesteps the problem. SSB needs blue hair → handled by a
    per-frame TOP-REGION black detection (hair sits at the top of each figure) so the body outline is spared.
  * UI STREAKS = silver-grey hair highlights (s<0.20, 0.28<=v<0.86), ~7-10%. OWNER-LOCKED (AskUserQuestion
    2026-08-23): KEEP FIXED across all 8 recolors — the transformation's signature (Zaraki-feature rule). So
    they are a PROTECTED region, never painted by the 8 (only recolored for SSB, where they blend into blue).
  * Undershirt/sash = orange/rust (h 8-45, s>=0.42), small collar+waist accent.
  * Earring = tiny green/white Potara accent (h 70-165, s>=0.22), ~1%.
  * The 7 named specials' FX are PROCEDURAL code-drawn projectiles (abilities.js), NOT baked into sprites — so
    recoloring body regions physically cannot disturb any FX colour (the standing FX-protection rule is free here).
    The only baked energy in sprites are white/gold slash trails (rush/up frames) → protected via WHITE + the
    streak/outline protection (not one of the seven colour-coded special FX).

OWNER DECISIONS LOCKED (AskUserQuestion 2026-08-23):
  * UI streaks -> KEEP FIXED (protected silver-grey) on all 8 recolors.
  * Super Saiyan Blue -> ship as a plain skin (no distinct-state in-game flag). On SSB the streaks BLEND into
    the blue (it is a different canonical form; a silver-streak + blue-hair hybrid would read muddy).

FIVE paintable classes + protected, classified ONCE from ORIGINAL pixels (priority; each pixel <= one class):
  * GI        — navy jacket+trousers: 200<=h<=262 & s>=0.20.
  * UNDER     — orange/rust undershirt/sash: 8<=h<=45 & s>=0.42.
  * EARRING   — green Potara: 70<=h<=165 & s>=0.22.
  * WHITE     — highlights / slash-trail glints: s<0.12 & v>=0.86.  PROTECTED.
  * STREAK    — silver-grey UI hair highlight: s<0.20 & 0.28<=v<0.86.  PROTECTED (fixed) — SSB only.
  * OUTLINE   — black line-art + hair base: v<0.16.  PROTECTED (SSB recolors only the top-region hair subset).
  * SKIN/OTHER— tan skin + misc mids: untouched (except Void crushes everything).

USAGE: gen_vegito_creative.py [probe|preview|all|<tag>]      # default: all
  probe   -> vegito_skin_mask_debug(_6x).png (regions tinted) to verify classification
  preview -> recolor idle per skin + vegito_skins_preview.png montage (no full batch)
  all     -> recolor EVERY animationData sheet + portrait for all 10 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "vegito_idle_uniform.png", "vegito_idle_mid_uniform.png", "vegito_idle_low_uniform.png",
    "vegito_walk_uniform.png", "vegito_dash_uniform.png", "vegito_jump_uniform.png",
    "vegito_guard_uniform.png", "vegito_hurt_uniform.png", "vegito_knockdown_uniform.png",
    "vegito_getup_uniform.png", "vegito_light_uniform.png", "vegito_heavy_uniform.png",
    "vegito_up_uniform.png", "vegito_air_uniform.png", "vegito_downair_uniform.png",
    "vegito_clight_uniform.png", "vegito_rush1_uniform.png", "vegito_rush2_uniform.png",
    "vegito_rush3_uniform.png", "vegito_bigbang_uniform.png", "vegito_galick_uniform.png",
    "vegito_banshee_uniform.png", "vegito_spread_uniform.png", "vegito_airki_uniform.png",
    "vegito_perfect_uniform.png", "vegito_ultaction_uniform.png", "vegito_kame_uniform.png",
    "vegito_win_uniform.png",
]
PORTRAIT = "vegito_portrait.png"

# ★ HEALTH-CHECK REVISION (subagent visual, 2026-08-23): the -Sign- HAIR is NAVY-BLUE (same hue as the gi),
# NOT black as the prompt's Section 0 claimed. So a colour rule can't tell hair from gi — they're separated
# SPATIALLY in _regions(): navy/silver/black pixels ABOVE each frame's forehead (topmost SKIN row) = HAIR
# (protected/fixed), the rest of the navy = the recolorable GI. This is why classify() also tags SKIN (the
# forehead landmark) and why the 8 recolors keep the hair+streaks fixed for real.
def classify(h, s, v):
    if 200 <= h <= 262 and s >= 0.20:                  return "GI"       # navy jacket + trousers (+ navy hair, split out spatially)
    if 8 <= h <= 45 and s >= 0.45:                     return "UNDER"    # orange/rust undershirt/sash
    if 70 <= h <= 165 and s >= 0.22:                   return "EARRING"  # green Potara accent
    if s < 0.12 and v >= 0.86:                         return "WHITE"    # highlights / slash glints (protected)
    if s < 0.20 and 0.28 <= v < 0.86:                  return "STREAK"   # silver-grey UI streak (protected/fixed)
    if v < 0.16:                                       return "OUTLINE"  # black line-art (protected)
    if 5 <= h <= 42 and 0.12 <= s < 0.45 and v >= 0.45: return "SKIN"    # tan face/arms (forehead landmark)
    return "OTHER"                                                       # misc mids (untouched)

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.12):
    r, g, b = hex2rgb(hexcol)
    _h, ts, tv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    if floor is None: floor = max(0.04, round(tv * 0.28, 3))
    return (hexcol, round(ts, 3), floor, spread)

def paint(px, pts, spec):
    """Re-centre a region on the target hue+value, preserving its own light/dark SPREAD (keeps fold shading)."""
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
    """Void Part A: crush a region to near-black keeping a whisper of its shading + a faint cool tint."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.28)), px[x, y][3])   # a touch cool/silver

# ── skin table ────────────────────────────────────────────────────────────────────────────────────
# 8 recolors = GI + UNDER + EARRING (streaks/hair/skin/white/outline PROTECTED). void/ssb special.
SKINS = {
    # ── Group 1 ──
    "crimsonfusion": dict(gi=S("#8C2A2E"), under=S("#0A0A0A"), earring=S("#E82438"), note="deep-red gi / black undershirt / red earring"),
    "verdantinstinct": dict(gi=S("#2E7B5C"), under=S("#3D2818"), earring=S("#4ABD7B"), note="green gi / dark-brown undershirt / green earring"),
    "goldenfusion": dict(gi=S("#0A0A0A"), under=S("#8C6B1F"), earring=S("#FFD670"), note="black gi / gold undershirt / gold earring"),
    "obsidiansign": dict(gi=S("#242424"), under=S("#3D3D3D"), earring=S("#B0B0B0"), note="monochrome black gi / grey undershirt / grey earring"),
    # ── Group 2 ──
    "azurepotara": dict(gi=S("#2E5C8C"), under=S("#152C4A"), earring=S("#4A8CC9"), note="azure gi / dark-navy undershirt / blue earring"),
    "violetfusion": dict(gi=S("#5C2E7B"), under=S("#0A0A0A"), earring=S("#A55CC9"), note="violet gi / black undershirt / violet earring"),
    "emberinstinct": dict(gi=S("#8C4A1A"), under=S("#3D1A14"), earring=S("#E8621A"), note="ember-orange gi / dark red-brown undershirt / orange earring"),
    "frostboundsign": dict(gi=S("#C9E4F5"), under=S("#D6D6D6"), earring=S("#8FC9E0"), note="pale ice-blue gi / white-grey undershirt / ice earring"),
    # ── Specialty ──
    "voidsovereign": dict(void=True, note="full near-black incl. skin + silver-wisp overlay (game.js drawVegitoVoidAuraOverlay)"),
    "supersaiyanblue": dict(ssb=True, hair=S("#2E6BC9", floor=0.10, spread=1.05), note="HOMAGE: black hair + silver streaks -> vivid SSB blue (gi navy / undershirt orange kept)"),
}
DISPLAY = {
    "crimsonfusion": "Crimson Fusion", "verdantinstinct": "Verdant Instinct", "goldenfusion": "Golden Fusion",
    "obsidiansign": "Obsidian Sign", "azurepotara": "Azure Potara", "violetfusion": "Violet Fusion",
    "emberinstinct": "Ember Instinct", "frostboundsign": "Frostbound Sign", "voidsovereign": "Void Sovereign",
    "supersaiyanblue": "Super Saiyan Blue",
}
ORDER = ["crimsonfusion", "verdantinstinct", "goldenfusion", "obsidiansign",
         "azurepotara", "violetfusion", "emberinstinct", "frostboundsign",
         "voidsovereign", "supersaiyanblue"]

def _regions(im):
    """Classify by colour, THEN spatially split the navy HAIR (above each frame's forehead) out of GI so the
    gi can recolor without bleeding into the hair. HAIR = navy/silver/black pixels above the topmost SKIN row
    (the forehead), capped to the top 42% of the figure (guards against a raised hand's skin fooling it)."""
    W, H = im.size; px = im.load()
    clsmap = {}
    for y in range(H):
        for x in range(W):
            if px[x, y][3] < 16: continue
            r, g, b, _ = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            clsmap[(x, y)] = classify(h, s, v)
    colon = [False] * W
    for x in range(W):
        for y in range(H):
            if px[x, y][3] > 16: colon[x] = True; break
    hair = set()
    x = 0
    while x < W:                                       # per FRAME (split by transparent gutters)
        if not colon[x]: x += 1; continue
        s0 = x
        while x < W and colon[x]: x += 1
        e0 = x - 1
        pts = [(xx, yy) for (xx, yy) in clsmap if s0 <= xx <= e0]
        if not pts: continue
        ys = [yy for (_, yy) in pts]; y0, y1 = min(ys), max(ys)
        skin_ys = [yy for (xx, yy) in pts if clsmap[(xx, yy)] == "SKIN"]
        cut = (min(skin_ys) + 2) if skin_ys else (y0 + int((y1 - y0 + 1) * 0.26))
        cut = min(cut, y0 + int((y1 - y0 + 1) * 0.42))  # cap: hair never below top 42%
        for (xx, yy) in pts:
            if yy <= cut and clsmap[(xx, yy)] in ("GI", "STREAK", "OUTLINE"): hair.add((xx, yy))
    reg = {k: [] for k in ("GI", "UNDER", "EARRING", "WHITE", "STREAK", "OUTLINE", "SKIN", "OTHER", "HAIR")}
    for (xy, c) in clsmap.items():
        reg["HAIR" if xy in hair else c].append(xy)
    return px, reg

def recolor(src, out, tag):
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA")
    px, reg = _regions(im)
    spec = SKINS[tag]
    if spec.get("void"):
        for k in ("GI", "UNDER", "EARRING", "WHITE", "STREAK", "OUTLINE", "SKIN", "OTHER", "HAIR"):
            void_paint(px, reg[k])
    elif spec.get("ssb"):
        # SSB: HAIR (navy) + any body silver streaks -> vivid SSB blue; gi navy + undershirt orange KEPT.
        paint(px, reg["HAIR"],   spec.get("hair"))
        paint(px, reg["STREAK"], spec.get("hair"))
    else:
        paint(px, reg["GI"],      spec.get("gi"))       # gi ONLY (hair split out → stays fixed)
        paint(px, reg["UNDER"],   spec.get("under"))
        paint(px, reg["EARRING"], spec.get("earring"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "vegito_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"GI": (60, 90, 255), "UNDER": (255, 140, 40), "EARRING": (0, 230, 90),
            "WHITE": (255, 255, 255), "STREAK": (200, 200, 210), "OUTLINE": (0, 0, 0),
            "SKIN": (255, 60, 200), "OTHER": (255, 0, 0), "HAIR": (255, 235, 0)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, "vegito_skin_mask_debug.png"))
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "vegito_skin_mask_debug_8x.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("→ vegito_skin_mask_debug(_8x).png  (blue=GI[recolored] YELLOW=HAIR[protected] orange=UNDER green=EARRING white=WHITE grey=STREAK black=OUTLINE magenta=SKIN red=OTHER)")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("vegito_idle_uniform.png"))]
    for tag in ORDER:
        recolor("vegito_idle_uniform.png", f"vegito_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"vegito_idle_uniform__{tag}.png")))
    cols = 6; cw, ch = 110, 150; lblh = 16
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
    mont.save(os.path.join(ROOT, "vegito_skins_preview.png"))
    print(f"→ vegito_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
