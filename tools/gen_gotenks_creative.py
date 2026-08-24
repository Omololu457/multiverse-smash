#!/usr/bin/env python3
"""Gotenks (Super Saiyan, DBZ Extreme Butoden) — 8 coordinated palette recolors + Void Sovereign
   (+ Super Saiyan 3 homage handled separately — silhouette lift, see build order step 6).

★ HEALTH-CHECKED against the REAL sprite (tool scan, NOT just the prompt's Section 0). The prompt's
  region table was written WITHOUT inspecting the sheet; the real EB SS-Gotenks pixels differ:
  * VEST   = dark INDIGO/navy garment (h 235-290, s>=0.34, v<0.52) — small open Metamoran vest on the
             torso. The prompt's "dark blue vest" holds (it's a dark blue-violet), reads near-black.
  * SASH   = GREEN, not "teal/blue-green" (h 120-190, s>=0.28): #0b3e32/#176438/#051f18. ★And the
             WRISTBANDS are the SAME green (the prompt's "wristbands = black" is WRONG) — they are
             grouped with the sash, so a "sash" recolor recolors both (coherent: one accent colour).
  * PANTS  = white silk, rendered LAVENDER-shaded (h 200-270, s<0.40, v>=0.45): #7670a3/#c5c3d8/#f3f8ff.
  * PADDING= yellow/olive vest trim (h 40-66, s>=0.35, v<0.60) — small; shares hue with the GOLD hair,
             split by VALUE (hair is brighter, v>=0.60). Most skins keep it gold → low risk.
  * HAIR   = GOLD (h 38-60, s>=0.45, v>=0.60) — colour-distinguishable (no spatial split needed, unlike
             Vegito's navy hair). PROTECTED (stays gold; SS state only — no base-form black/lavender split).
  * SKIN   = tan (h 6-40) — PROTECTED except Void.
  * SHOES + OUTLINE = near-neutral dark (v<0.22, s<0.35) — PROTECTED (no skin recolors shoes; the
             prompt's "shoes black" is a region-ID note, and they're already black-grey).
  The Super Ghost Kamikaze GHOST projectile (gotenks_ghost_uniform) is NOT in animationData (spawned via
  abilities.js spawnProjectile sheet) → never skin-swapped → stays blue on every skin (correct: it's the
  technique, not clothing). The ghost CAST poses (ghostwind/ghostthrow) ARE body poses → recolored normally.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  VEST · PADDING · SASH · PANTS   (paintable)
  HAIR · SKIN · DARK(shoes+outline) · WHITE   (protected)  — DARK/WHITE keep silhouette; Void crushes all.

USAGE: gen_gotenks_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

SHEETS = [
    "gotenks_idle_uniform.png", "gotenks_dash_uniform.png", "gotenks_jump_uniform.png",
    "gotenks_fall_uniform.png", "gotenks_crouch_uniform.png", "gotenks_guard_uniform.png",
    "gotenks_guardhit_uniform.png", "gotenks_hurt_uniform.png", "gotenks_knockdown_uniform.png",
    "gotenks_getup_uniform.png", "gotenks_taunt_uniform.png", "gotenks_dazed_uniform.png",
    "gotenks_light_uniform.png", "gotenks_heavy_uniform.png", "gotenks_up_uniform.png",
    "gotenks_air_uniform.png", "gotenks_crouchlight_uniform.png", "gotenks_rush1_uniform.png",
    "gotenks_rush2_uniform.png", "gotenks_rush3_uniform.png", "gotenks_kiblast_uniform.png",
    "gotenks_kicharge_uniform.png", "gotenks_ghostwind_uniform.png", "gotenks_ghostthrow_uniform.png",
]
PORTRAIT = "gotenks_portrait.png"

def classify(h, s, v):
    if 38 <= h <= 60 and s >= 0.45 and v >= 0.60:      return "HAIR"     # gold SS hair (protected)
    if 40 <= h <= 66 and s >= 0.35 and v < 0.60:       return "PADDING"  # yellow/olive vest trim
    if 6  <= h <= 40 and s >= 0.20 and v >= 0.35:      return "SKIN"     # tan skin (protected)
    if 120 <= h <= 190 and s >= 0.28:                  return "SASH"     # green sash + wristbands
    if 235 <= h <= 292 and s >= 0.34 and v < 0.52:     return "VEST"     # dark indigo Metamoran vest
    # ★No WHITE-glint protection: the "white" pixels ARE the silk pants (the garment), not FX glints — Gotenks
    #   body sprites carry no baked energy FX (the ghost is a separate, non-skin-swapped projectile sheet). So
    #   near-white folds into PANTS and recolors fully (Obsidian grey / Golden cream / Frostbound register).
    if (195 <= h <= 275 or s < 0.18) and v >= 0.45 and s < 0.42:  return "PANTS"  # lavender-white silk pants (incl. highlights)
    if v < 0.22 and s < 0.40:                          return "DARK"     # shoes + black line-art (protected)
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
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])   # a touch cool/silver

# ── skin table — vest/padding/sash/pants (hair/skin/dark/white PROTECTED). void special. ──
# "unchanged" regions are simply omitted (not painted). Prompt Groups 1 & 2 + Void Sovereign.
SKINS = {
    # ── Group 1 ──
    "crimsonfusion": dict(vest=S("#8C2A2E"), sash=S("#0A0A0A"), note="deep-red vest / gold padding / black sash / white pants"),
    "verdantduo":    dict(vest=S("#2E7B5C"), sash=S("#1A4A33"), note="deep-green vest / gold padding / dark-green sash / white pants"),
    "obsidianpair":  dict(vest=S("#242424"), padding=S("#B0B0B0"), sash=S("#3D3D3D"), pants=S("#D6D6D6"), note="monochrome: black vest / silver padding / grey sash / grey pants"),
    "goldenduo":     dict(vest=S("#8C6B1F"), padding=S("#FFD670"), sash=S("#3D2818"), pants=S("#F0E8D6"), note="deep-gold vest / bright-gold padding / dark-brown sash / cream pants"),
    # ── Group 2 ──
    "violetfusion":  dict(vest=S("#5C2E7B"), sash=S("#0A0A0A"), note="deep-violet vest / gold padding / black sash / white pants"),
    "emberduo":      dict(vest=S("#8C4A1A"), sash=S("#3D1A14"), note="burnt-orange vest / gold padding / dark red-brown sash / white pants"),
    "frostboundpair":dict(vest=S("#C9E4F5"), padding=S("#F0F0F0"), sash=S("#4AB5B0"), note="pale ice-blue vest / white padding / icy-teal sash / white pants"),
    "azureduo":      dict(vest=S("#1F3357"), sash=S("#2E9C94"), note="richer navy vest / yellow padding / brighter-teal sash / white pants"),
    # ── Specialty ──
    "voidsovereign": dict(void=True, note="full near-black incl. skin + drifting ghost-wisp overlay (game.js drawGotenksVoidAuraOverlay)"),
    # ★ SSJ3 = a PALETTE-ONLY homage (owner decision 2026-08-23): brighter/richer electric-gold hair; vest/sash/
    #   pants stay default. Real SSJ3 = dramatically LONGER hair + NO eyebrows (a silhouette change) — that
    #   bespoke art lift is DEFERRED and flagged (same caution as Aoi Todo Kyoto / Gohan Great Saiyaman). This
    #   is NOT equivalent to true SSJ3 art; it reads as an "ascended glow" recolor.
    "supersaiyan3": dict(ssj3=True, hair=S("#FFDE21", floor=0.30, spread=1.06), note="HOMAGE (palette-only): brighter electric-gold hair — real SSJ3 long-hair silhouette + no-eyebrows DEFERRED (bespoke art)"),
}
DISPLAY = {
    "crimsonfusion": "Crimson Fusion", "verdantduo": "Verdant Duo", "obsidianpair": "Obsidian Pair",
    "goldenduo": "Golden Duo", "violetfusion": "Violet Fusion", "emberduo": "Ember Duo",
    "frostboundpair": "Frostbound Pair", "azureduo": "Azure Duo", "voidsovereign": "Void Sovereign",
    "supersaiyan3": "Super Saiyan 3",
}
ORDER = ["crimsonfusion", "verdantduo", "obsidianpair", "goldenduo",
         "violetfusion", "emberduo", "frostboundpair", "azureduo", "voidsovereign", "supersaiyan3"]

def _regions(im):
    """Classify by colour, THEN spatially protect the BOOTS: the dark-indigo boots share VEST's hue/value,
    so any VEST pixel in the bottom ~18% of a figure is re-tagged DARK (boots stay dark on vest recolors)."""
    W, H = im.size; px = im.load()
    clsmap = {}
    for y in range(H):
        for x in range(W):
            if px[x, y][3] < 16: continue
            r, g, b, _ = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            clsmap[(x, y)] = classify(h, s, v)
    # per-FRAME (split by transparent column gutters): move low VEST pixels → DARK (boots)
    colon = [any(px[x, y][3] > 16 for y in range(H)) for x in range(W)]
    x = 0
    while x < W:
        if not colon[x]: x += 1; continue
        s0 = x
        while x < W and colon[x]: x += 1
        e0 = x - 1
        pts = [(xx, yy) for (xx, yy) in clsmap if s0 <= xx <= e0]
        if not pts: continue
        ys = [yy for (_, yy) in pts]; y0, y1 = min(ys), max(ys)
        bootcut = y0 + (y1 - y0 + 1) * 0.82   # bottom 18% = boots/ankles
        for (xx, yy) in pts:
            if yy >= bootcut and clsmap[(xx, yy)] == "VEST": clsmap[(xx, yy)] = "DARK"
    reg = {k: [] for k in ("VEST", "PADDING", "SASH", "PANTS", "HAIR", "SKIN", "DARK", "WHITE", "OTHER")}
    for (xy, c) in clsmap.items(): reg[c].append(xy)
    return px, reg

def recolor(src, out, tag):
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA")
    px, reg = _regions(im)
    spec = SKINS[tag]
    if spec.get("void"):
        for k in reg: void_paint(px, reg[k])
    elif spec.get("ssj3"):
        paint(px, reg["HAIR"], spec.get("hair"))         # SSJ3 homage: brighter gold hair only (silhouette deferred)
    else:
        paint(px, reg["VEST"],    spec.get("vest"))
        paint(px, reg["PADDING"], spec.get("padding"))
        paint(px, reg["SASH"],    spec.get("sash"))
        paint(px, reg["PANTS"],   spec.get("pants"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "gotenks_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"VEST": (60, 60, 220), "PADDING": (230, 200, 40), "SASH": (0, 210, 90),
            "PANTS": (230, 230, 245), "HAIR": (255, 235, 0), "SKIN": (255, 60, 200),
            "DARK": (20, 20, 20), "WHITE": (255, 255, 255), "OTHER": (255, 0, 0)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "gotenks_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ gotenks_skin_mask_debug_8x.png  (blue=VEST yellow=PADDING green=SASH lavender=PANTS GOLD=HAIR magenta=SKIN black=DARK white=WHITE RED=OTHER[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("gotenks_idle_uniform.png"))]
    for tag in ORDER:
        recolor("gotenks_idle_uniform.png", f"gotenks_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"gotenks_idle_uniform__{tag}.png")))
    cols = 5; cw, ch = 120, 160; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min((cw - 12) / cell.width, (ch - 12) / cell.height, 2.6)
        rs = cell.resize((max(1, round(cell.width * sc)), max(1, round(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "gotenks_skins_preview.png"))
    print(f"→ gotenks_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
