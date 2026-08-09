#!/usr/bin/env python3
"""Yuji Itadori — 12 GENUINELY creative alt-skins: HAIR + OUTFIT + ACCENT recolor as a coordinated palette
identity (same bar as the Hisoka/Maki/Sukuna/Miwa redos), NOT flat single-region recolors. (The 13th "Void"
skin is a separate full-form tool.)

THREE independently-targeted regions, classified ONCE from the ORIGINAL pixels (capture-masks-first =
contamination-proof; recoloring hair never shifts the outfit/accent masks). Each pixel is assigned to at most
ONE class in priority order so regions never overlap:
  * SKIN    — warm face/hands: hue 14-42, val>=0.35  (matched BEFORE accent so tan-red skin isn't grabbed) → PROTECTED.
  * HAIR    — Yuji's pink/salmon hair: hue 342-358, sat 0.20-0.62 (moderate sat; the analysed h~350 cluster).
  * ACCENT  — the RED uniform trim/piping: (hue<=12 or hue>=349) & sat>=0.62 (the analysed h~005 saturated-red cluster).
  * OUTFIT  — the navy jacket + pants: hue 216-272, sat>=0.16. BIMODAL value (mid jacket + dark trim) → to-tone keeps the shading.
PROTECTED (never selected → untouched): SKIN, the near-black OUTLINE (sat<0.16 & val<0.30), neutral white/gray
(sat<0.16), and — CRITICALLY — the CYAN cursed-energy FX (hue 150-213) which falls into NO region, so the blue
crescent slash + in-hand energy glints are preserved on every sheet. Line-art guard: masks only ever touch the
three garment/hair regions, so no outline bleed / blobby merge.

FX PRESERVATION:
  * Pure-FX sheets (ball/beam projectiles, ball impact, pillar column, ground burst) are EXCLUDED entirely.
  * The RED cursed-energy flame-trail FX on koma1 / koma2 / aircombo shares the accent's red hue and CANNOT be
    hue-separated from the costume trim — so those three sheets get HAIR+OUTFIT only (accent-SKIP). The red trails
    stay untouched; the (thin) costume trim staying red on those frames is invisible amid the fast motion.
  * The CYAN blue-crescent FX is safe on every sheet (outside all bands).

paint(): to-tone re-centre onto the target hue/sat at the target value, preserving each region's own light/dark
SPREAD (multi-tone shading kept). `floor` keeps a near-black target a margin above outline-black so it never
fuses into the outline. Cosmetic only — ZERO gameplay/stat changes.

USAGE: gen_yuji_creative.py [tag | group N | all]     # default: all 12
"""
import os, sys, colorsys
from PIL import Image
from gen_rick_creative import void_flatten   # shared full-form void flattener (Rick/Rengoku/Shinobu/Maki)

ROOT = os.path.join(os.path.dirname(__file__), "..")
VOID_HEX = "#0F0F14"   # near-black; a hair of violet in the hue so the overlay reads as one theme

def classify(h, s, v):
    if s < 0.16 and v < 0.30:            return "OUTLINE"    # protect
    if s < 0.16:                          return "NEUTRAL"    # white/gray/eye protect
    if 14 <= h <= 42 and v >= 0.35:       return "SKIN"       # face/hands protect (BEFORE accent)
    if 342 <= h <= 358 and s < 0.62:      return "HAIR"       # pink/salmon, moderate sat
    if (h <= 12 or h >= 349) and s >= 0.62: return "ACCENT"   # red uniform trim
    if 216 <= h <= 272 and s >= 0.16:     return "OUTFIT"     # navy jacket + pants
    return "OTHER"                                            # cyan FX (h150-213) + misc → untouched

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, hexcol, to_sat, floor, spread):
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    ts = to_sat
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

# each region tuple = (hex, to_sat, floor, spread)
SKINS = {
    # ── GROUP 1 — COLORFUL / VIBRANT ──
    "sunburst": dict(hair=("#F5A623", 0.82, 0.34, 1.18), outfit=("#141416", 0.10, 0.10, 1.15), accent=("#E8641A", 0.86, 0.30, 1.05)),
    "cobalt":   dict(hair=("#2E6BE6", 0.80, 0.24, 1.18), outfit=("#131417", 0.12, 0.10, 1.15), accent=("#7FD4F5", 0.48, 0.44, 1.05)),
    "emerald":  dict(hair=("#1FB24A", 0.82, 0.24, 1.18), outfit=("#141414", 0.06, 0.10, 1.15), accent=("#E8B93C", 0.76, 0.36, 1.05)),
    "magenta":  dict(hair=("#E0219B", 0.84, 0.30, 1.18), outfit=("#151417", 0.10, 0.10, 1.15), accent=("#F2F2F2", 0.04, 0.60, 1.15)),
    # ── GROUP 2 — DELIBERATELY DULL / MUTED ──
    "ashen":    dict(hair=("#9A9CA0", 0.04, 0.42, 1.12), outfit=("#2B2D31", 0.10, 0.14, 1.12), accent=("#6E7175", 0.05, 0.36, 1.05)),
    "khaki":    dict(hair=("#B7A97F", 0.30, 0.44, 1.12), outfit=("#5E5F45", 0.26, 0.24, 1.12), accent=("#8A8560", 0.28, 0.36, 1.05)),
    "dustyrose":dict(hair=("#C98F9E", 0.28, 0.46, 1.12), outfit=("#3A3438", 0.14, 0.14, 1.12), accent=("#A88A93", 0.18, 0.42, 1.05)),
    "slate":    dict(hair=("#7E8A9A", 0.18, 0.42, 1.12), outfit=("#2E343C", 0.18, 0.14, 1.12), accent=("#5C6672", 0.18, 0.34, 1.05)),
    # ── GROUP 3 — SUPER COOL / STANDOUT ──
    "crimson":  dict(hair=("#9E1122", 0.86, 0.18, 1.15), outfit=("#131314", 0.06, 0.09, 1.15), accent=("#F2F2F2", 0.04, 0.60, 1.15)),
    "golden":   dict(hair=("#E0A81E", 0.86, 0.36, 1.18), outfit=("#141317", 0.10, 0.10, 1.15), accent=("#4B2A7A", 0.64, 0.20, 1.05)),
    "storm":    dict(hair=("#17181C", 0.20, 0.09, 1.05), outfit=("#33363C", 0.12, 0.16, 1.12), accent=("#29D6EA", 0.82, 0.44, 1.05)),
    "obsidian": dict(hair=("#141416", 0.14, 0.09, 1.05), outfit=("#141416", 0.14, 0.09, 1.05), accent=("#E8709E", 0.52, 0.44, 1.05)),
}
GROUPS = {1: ["sunburst", "cobalt", "emerald", "magenta"],
          2: ["ashen", "khaki", "dustyrose", "slate"],
          3: ["crimson", "golden", "storm", "obsidian"]}

# Character sheets that get the FULL 3-region recolor.
FULL_SHEETS = [
    "yuji_idle_uniform.png", "yuji_run_uniform.png", "yuji_dash_uniform.png", "yuji_jump_uniform.png",
    "yuji_block_uniform.png", "yuji_hit_uniform.png", "yuji_hurt_uniform.png",
    "yuji_intro_1_uniform.png", "yuji_intro_2_uniform.png",
    "yuji_foward_attack_uniform.png", "yuji_super_foward_attack_uniform.png", "yuji_up_kick_uniform.png",
    "yuji_air_attack_uniform.png", "yuji_down_attack_uniform.png",
    "yuji_ball_cast_uniform.png", "yuji_beam_cast_uniform.png", "yuji_pillar_cast_uniform.png",
    "yuji_crescent_uniform.png", "yuji_ultimate_action_uniform.png", "yuji_sukuna_slash.png",
    "yuji_portrait.png",
]
# Sheets with prominent RED cursed-energy FX trails → HAIR+OUTFIT only (accent-SKIP) to preserve the FX.
HAIROUTFIT_ONLY = ["yuji_koma1_uniform.png", "yuji_koma2_uniform.png", "yuji_aircombo_uniform.png"]
# (Excluded entirely: yuji_ball_proj / yuji_beam_proj / yuji_ball_impact / yuji_pillar_fx / yuji_ground_fx — pure cyan FX.)
# SKIN-AGNOSTIC: the CHARGE pose is a cyan cursed-energy AURA (recolored from the monochrome yuji_charge.png
# by tools/recolor_yuji_charge.py), NOT a costume — every skin shares one cyan aura. So its per-skin sheets
# are plain COPIES of the base, not recolors (recolorSkinAnim still suffixes it, so the files must exist).
COPY_AS_IS = ["yuji_charge_uniform.png"]

def recolor(path, cfg, do_accent):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    regions = {"HAIR": [], "OUTFIT": [], "ACCENT": []}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v)
            if c in regions: regions[c].append((x, y))
    n = 0
    passes = [("hair", "HAIR"), ("outfit", "OUTFIT")]
    if do_accent: passes.append(("accent", "ACCENT"))
    for key, region in passes:
        hexcol, to_sat, floor, spread = cfg[key]
        n += paint(px, regions[region], hexcol, to_sat, floor, spread)
    return img, n, {k: len(v) for k, v in regions.items()}

def build(tag):
    cfg = SKINS[tag]; total = 0
    for name, do_accent in [(s, True) for s in FULL_SHEETS] + [(s, False) for s in HAIROUTFIT_ONLY]:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img, n, counts = recolor(p, cfg, do_accent)
        img.save(p[:-4] + f"__{tag}.png"); total += n
    for name in COPY_AS_IS:                             # skin-agnostic cyan aura → plain copy per tag
        p = os.path.join(ROOT, name)
        if os.path.exists(p): Image.open(p).convert("RGBA").save(p[:-4] + f"__{tag}.png")
    print(f"  {tag:10} total={total}px")

# VOID (Part A) — full-form near-black flatten of EVERY character sheet (hair/outfit/skin/face all void), so
# the procedural game.js overlay (drawYujiVoidOverlay, Part B) supplies the only visual interest. Tag "void".
def build_void():
    total = 0
    for name in FULL_SHEETS + HAIROUTFIT_ONLY:   # portrait is inside FULL_SHEETS
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print(f"  SKIP(missing) {name}"); continue
        img = Image.open(p).convert("RGBA")
        n = void_flatten(img, VOID_HEX)
        img.save(p[:-4] + "__void.png"); total += n
    for name in COPY_AS_IS:                             # charge aura is already void-neutral cyan → copy as-is
        p = os.path.join(ROOT, name)
        if os.path.exists(p): Image.open(p).convert("RGBA").save(p[:-4] + "__void.png")
    print(f"  void       total={total}px (full-form flatten)")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "void": print("=== void (Part A: full-form flatten) ==="); build_void(); return
    if arg == "group": tags = GROUPS[int(sys.argv[2])]
    elif arg == "all": tags = list(SKINS)
    else: tags = [arg]
    for t in tags:
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
