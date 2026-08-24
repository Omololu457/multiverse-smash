#!/usr/bin/env python3
"""Teen Gohan (DBZ Extreme Butoden, Base + SSJ2 forms) — 8 coordinated palette recolors + Void Sovereign
   (9 alt-skins on top of Default). ★Applies across BOTH forms: the recolor is keyed by HUE, and every
   base sheet AND every SSJ2 sheet (+ the black→gold morph + portrait) is recolored to `<sheet>__<tag>.png`.
   skins.js sets `recolorTag: <tag>` → applySkin stamps fighter._recolorTag → abilities.js `retagFormAnim`
   swaps the SSJ2 form art to the __tag sheets too (the Goku-Black/Vegeta form-recolor pattern).

★ HEALTH-CHECKED against the REAL sprites (tools scan, NOT just the prompt's Section 0). Findings:
  * GI = purple jumpsuit, h≈275-305 & s>=0.35 — the SAME purple in BOTH forms (base + SSJ2) → one GI region,
    recolored uniformly across forms.
  * SASH/ARMBANDS = BLUE (h≈200-235 & s>=0.40) — CONFIRMED blue (16,47,92 / 16,86,184), NOT the orange the
    prompt flagged as an alternative. Waist sash + wrist armbands.
  * FOOTWEAR = medium BROWN-TAN (h≈17-30, s>=0.72) — NOT the "pale tan/white" the prompt guessed. ★It shares
    the orange-gold HUE of the SSJ2 GOLD HAIR, so footwear is carved SPATIALLY (bottom 20% of each frame) to
    avoid recoloring the hair. Only recolored where a skin asks (Obsidian); else left as base brown.
  * HAIR is per-form and PROTECTED BY HUE (no spatial split needed, unlike Vegito): base BLACK/grey → OUTLINE
    (v<0.14) or OTHER; SSJ2 GOLD (h 33-60, s>0.72 or h>45) → OTHER (untouched). Neither is purple/blue.
  * SKIN = tan (h 8-45, 0.20<=s<0.72) — PROTECTED (except Void). WHITE highlights (s<0.14 & v>=0.85) PROTECTED.

REGION CLASSES (classified ONCE from ORIGINAL pixels; each pixel <= one class):
  * GI       — purple jumpsuit: 275<=h<=305 & s>=0.35.                         RECOLORED.
  * SASH     — blue sash/armbands: 200<=h<=235 & s>=0.40.                      RECOLORED.
  * FOOTWEAR — brown-tan boots: 5<=h<=45 & s>=0.72 & v<0.85, BOTTOM 20% only.  RECOLORED (opt).
  * SKIN     — tan skin: 8<=h<=45 & 0.20<=s<0.72 & v>=0.40.                    PROTECTED (Void only).
  * WHITE    — highlights: s<0.14 & v>=0.85.                                   PROTECTED.
  * OUTLINE  — black line-art / base hair: v<0.14.                             PROTECTED.
  * OTHER    — base hair greys + SSJ2 gold hair + misc mids.                   UNTOUCHED (Void only).

USAGE: gen_gohan_creative.py [probe|preview|all|<tag>]      # default: all
  probe   -> gohan_skin_mask_debug(_8x).png (regions tinted) to verify classification on BOTH forms
  preview -> recolor idle (both forms) per skin + gohan_skins_preview.png montage (no full batch)
  all     -> recolor EVERY base + SSJ2 sheet + morph + portrait for all 9 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

BASE_SHEETS = [
    "gohan_idle_uniform.png", "gohan_walk_uniform.png", "gohan_run_uniform.png", "gohan_dash_uniform.png",
    "gohan_jump_uniform.png", "gohan_fall_uniform.png", "gohan_crouch_uniform.png", "gohan_guard_uniform.png",
    "gohan_hurt_uniform.png", "gohan_knockdown_uniform.png", "gohan_getup_uniform.png", "gohan_taunt_uniform.png",
    "gohan_light_uniform.png", "gohan_heavy_uniform.png", "gohan_up_uniform.png", "gohan_air_uniform.png",
    "gohan_rush1_uniform.png", "gohan_rush2_uniform.png", "gohan_rush3_uniform.png",
    "gohan_win_uniform.png", "gohan_intro_uniform.png", "gohan_transform_uniform.png",
]
SSJ2_SHEETS = [
    "gohan_ssj2_idle_uniform.png", "gohan_ssj2_walk_uniform.png", "gohan_ssj2_run_uniform.png",
    "gohan_ssj2_dash_uniform.png", "gohan_ssj2_jump_uniform.png", "gohan_ssj2_fall_uniform.png",
    "gohan_ssj2_crouch_uniform.png", "gohan_ssj2_guard_uniform.png", "gohan_ssj2_hurt_uniform.png",
    "gohan_ssj2_knockdown_uniform.png", "gohan_ssj2_getup_uniform.png", "gohan_ssj2_light_uniform.png",
    "gohan_ssj2_heavy_uniform.png", "gohan_ssj2_up_uniform.png", "gohan_ssj2_air_uniform.png",
    "gohan_ssj2_rush1_uniform.png", "gohan_ssj2_rush2_uniform.png", "gohan_ssj2_rush3_uniform.png",
]
SHEETS = BASE_SHEETS + SSJ2_SHEETS
PORTRAIT = "gohan_portrait.png"

def classify(h, s, v):
    if 275 <= h <= 305 and s >= 0.35:                  return "GI"       # purple jumpsuit (both forms)
    if 200 <= h <= 235 and s >= 0.40:                  return "SASH"     # blue sash/armbands
    if s < 0.14 and v >= 0.85:                         return "WHITE"    # highlights (protected)
    if v < 0.14:                                       return "OUTLINE"  # black line-art / base hair (protected)
    if 8 <= h <= 45 and 0.20 <= s < 0.72 and v >= 0.40: return "SKIN"    # tan skin (protected)
    return "OTHER"                                                       # base-hair greys + SSJ2 gold hair + misc

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

def void_paint(px, pts, lo=0.02, hi=0.14, base=0.03, cool=1.28):
    """Void Part A: crush a region to near-black keeping a whisper of its shading + a faint cool tint.
    HAIR (OTHER) uses a slightly LIGHTER cool charcoal (lo/hi raised) so the spike silhouette stays readable
    against the near-black body — the prompt's explicit Void hair-readability concern."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(lo, min(hi, base + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * cool)), px[x, y][3])   # a touch cool/silver

# ── skin table (target = the LIGHT end of the prompt's gradient; paint() preserves each region's own spread) ──
SKINS = {
    # ── Group 1 ──
    "crimsonsuccessor": dict(gi=S("#8C2A2E"), sash=S("#0A0A0A"), note="deep-red gi / black sash"),
    "verdantscholar":   dict(gi=S("#2E7B5C"), sash=S("#1A4A33"), note="deep-green gi / dark-green sash"),
    "goldenheir":       dict(gi=S("#C99C3D"), sash=S("#3D2818"), note="deep-gold gi / dark-brown sash"),
    "obsidiandisciple": dict(gi=S("#242424"), sash=S("#3D3D3D"), foot=S("#8F8F8F"), note="black gi / dark-grey sash / grey boots"),
    # ── Group 2 ──
    "azurenamekian":    dict(gi=S("#2E5C8C"), sash=S("#0A0A0A"), note="azure gi / black sash (Piccolo-lineage nod)"),
    "violetreborn":     dict(gi=S("#8C5CC9"), sash=S("#152C4A"), note="richer violet gi / deep-blue sash"),
    "embersuccessor":   dict(gi=S("#8C4A1A"), sash=S("#3D1A14"), note="burnt-orange gi / dark red-brown sash"),
    "frostboundscholar":dict(gi=S("#E8E8F5"), sash=S("#D6D6D6"), note="pale ice-lavender gi / white-grey sash"),
    # ── Specialty ──
    "voidsovereign":    dict(void=True, note="full near-black incl. skin + drifting ki-wisp overlay (game.js drawGohanVoidAuraOverlay)"),
}
DISPLAY = {
    "crimsonsuccessor": "Crimson Successor", "verdantscholar": "Verdant Scholar", "goldenheir": "Golden Heir",
    "obsidiandisciple": "Obsidian Disciple", "azurenamekian": "Azure Namekian", "violetreborn": "Violet Reborn",
    "embersuccessor": "Ember Successor", "frostboundscholar": "Frostbound Scholar", "voidsovereign": "Void Sovereign",
}
ORDER = ["crimsonsuccessor", "verdantscholar", "goldenheir", "obsidiandisciple",
         "azurenamekian", "violetreborn", "embersuccessor", "frostboundscholar", "voidsovereign"]

def _regions(im):
    """Classify by colour; then carve FOOTWEAR = brown-tan pixels in the BOTTOM 20% of each frame (spatially
    isolating the boots from the SSJ2 gold hair, which shares their orange hue but sits at the TOP)."""
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("GI", "SASH", "FOOTWEAR", "SKIN", "WHITE", "OUTLINE", "OTHER")}
    # per-frame vertical extent (frames split by transparent gutters) → for the bottom-20% footwear band
    colon = [any(px[x, y][3] > 16 for y in range(H)) for x in range(W)]
    foot_band = {}   # x -> y-threshold (below = footwear-eligible)
    x = 0
    while x < W:
        if not colon[x]: x += 1; continue
        s0 = x
        while x < W and colon[x]: x += 1
        e0 = x - 1
        ys = [y for xx in range(s0, e0 + 1) for y in range(H) if px[xx, y][3] > 16]
        if not ys: continue
        y0, y1 = min(ys), max(ys)
        thr = y1 - int((y1 - y0 + 1) * 0.20)
        for xx in range(s0, e0 + 1): foot_band[xx] = thr
    for y in range(H):
        for x in range(W):
            if px[x, y][3] < 16: continue
            r, g, b, _ = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v)
            if c == "OTHER" and 5 <= h <= 45 and s >= 0.72 and v < 0.85 and y >= foot_band.get(x, H):
                c = "FOOTWEAR"     # brown-tan boot pixel in the bottom band
            reg[c].append((x, y))
    return px, reg

def recolor(src, out, tag):
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA")
    px, reg = _regions(im)
    spec = SKINS[tag]
    if spec.get("void"):
        for k in reg:
            if k == "OTHER":   # hair (base greys + SSJ2 gold) → lighter cool charcoal so the spike shape reads
                void_paint(px, reg[k], lo=0.14, hi=0.30, base=0.12, cool=1.35)
            else:
                void_paint(px, reg[k])
    else:
        paint(px, reg["GI"],       spec.get("gi"))
        paint(px, reg["SASH"],     spec.get("sash"))
        paint(px, reg["FOOTWEAR"], spec.get("foot"))    # None for most skins → boots stay base brown
    im.save(os.path.join(ROOT, out))

def probe():
    tint = {"GI": (170, 60, 255), "SASH": (60, 120, 255), "FOOTWEAR": (255, 140, 40),
            "SKIN": (255, 60, 200), "WHITE": (255, 255, 255), "OUTLINE": (0, 0, 0), "OTHER": (255, 235, 0)}
    for src, name in [("gohan_idle_uniform.png", "base"), ("gohan_ssj2_idle_uniform.png", "ssj2")]:
        im = Image.open(os.path.join(ROOT, src)).convert("RGBA")
        px, reg = _regions(im)
        dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
        for k, pts in reg.items():
            for (x, y) in pts: dp[x, y] = (*tint[k], 255)
        dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, f"gohan_skin_mask_debug_{name}_8x.png"))
        print(f"{name}: region counts:", {k: len(v) for k, v in reg.items()})
    print("→ gohan_skin_mask_debug_{base,ssj2}_8x.png  (PURPLE=GI[recolor] BLUE=SASH[recolor] orange=FOOTWEAR[opt] magenta=SKIN[prot] white=WHITE black=OUTLINE YELLOW=OTHER[hair,prot])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default B", _frame0("gohan_idle_uniform.png")), ("Default S", _frame0("gohan_ssj2_idle_uniform.png"))]
    for tag in ORDER:
        recolor("gohan_idle_uniform.png", f"gohan_idle_uniform__{tag}.png", tag)
        recolor("gohan_ssj2_idle_uniform.png", f"gohan_ssj2_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag] + " B", _frame0(f"gohan_idle_uniform__{tag}.png")))
        tiles.append((DISPLAY[tag] + " S", _frame0(f"gohan_ssj2_idle_uniform__{tag}.png")))
    cols = 4; cw, ch = 130, 180; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min((cw - 12) / cell.width, (ch - 12) / cell.height, 2.2)
        rs = cell.resize((max(1, round(cell.width * sc)), max(1, round(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "gohan_skins_preview.png"))
    print(f"→ gohan_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins × both forms)")

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
