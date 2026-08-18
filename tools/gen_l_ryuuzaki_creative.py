#!/usr/bin/env python3
"""L "Ryuuzaki" (Death Note) — Default + 12 creative recolors = 13 (Alien-X Eternal Void is #13). Death-Note /
detective / insomniac / Kira / Shinigami lore. The WHITE/PALE SHIRT is the PRIMARY recolor region; the blue-grey /
lavender DENIM JEANS is the SECONDARY region. The near-black spiky HAIR (RGB≈32,16,32) is L's most iconic feature →
PROTECTED in every skin. FACE/SKIN (pale warm) + the orange-tan ACCENT (shoes/belt) are protected too (a theme may
push the accent, but by default it's kept). Cosmetic — ZERO gameplay.

STAGE-0 (pixel-sampled from l_ryuuzaki_idle_uniform.png; teal bg excluded):
  * HAIR   ≈ RGB(32,16,32)/(33,16,33) near-black, v≈0.13. VERY dark → separable from everything by LUMINANCE.
           PROTECTED (never recoloured). The pure-grey line-art tone RGB(57,57,57) is folded into OUTLINE (also protected)
           so the hair mass + linework stay dark in every skin.
  * SKIN   ≈ RGB(255,222,156)/(248,216,152) pale warm face/hands: 12<=h<=55 & s<=0.45 & v>=0.85. PROTECTED.
  * ACCENT ≈ RGB(198,132,8)/(148,57,0) saturated orange shoes/belt: 12<=h<=55 & s>=0.45. Default KEEP (theme may push).
  * SHIRT  — pale near-neutral top (RGB 181,181,198 .. 231,222,247, plus 148,156,173 torso-shadow): cool/neutral,
           high value, LOW saturation. PRIMARY recolor region.
  * JEANS  — blue-grey / lavender denim (RGB 132,123,181 / 90,66,107 / 115,123,132 / 74,99,115): MORE saturated
           blue/violet OR darker than the shirt. SECONDARY recolor region.
  Shirt vs jeans overlap in VALUE (lavender denim v≈0.71 ≈ shirt-shadow v≈0.66) but split cleanly by SATURATION:
  jeans are s>=0.22 (bluer/purpler) or dark (v<=0.55); the shirt is pale near-neutral. A few saturated shirt-fold
  shadow pixels fall to JEANS (minor, accepted — standard region-mask precedent, Light/Mayuri builds).

Each region gets a RAMP (dark->light hex list); paint() maps every source pixel to the ramp at its value-percentile
WITHIN the region (global vmin..vmax) so the region's own light/dark spread is preserved. ACCENT None = KEEP.
Eternal Void = full-body near-black (incl. shirt+jeans; hair already dark) + a game.js procedural indigo/white
deduction-glyph overlay (drawLRyuuzakiVoidAuraOverlay, gated on the skin id).

USAGE: gen_l_ryuuzaki_creative.py [probe|preview|all|<tag>]     # default: all
  probe   -> l_ryuuzaki_skin_mask_debug.png (regions tinted) + region counts
  preview -> recolour idle per skin + l_ryuuzaki_skins_preview_idle.png montage (no full batch)
  all     -> recolour EVERY body animationData sheet + portrait for all 12 recolor skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE main-body uniform sheet in L's animationData (characters.lRyuuzaki.animationData). The CAST poses
# (nova/bazooka/rising/analysis/kicktrail) SHOW L's body → recoloured. The FX/projectile sheets
# (bazooka_proj/rising_proj/nova-proj) + Ryuk sheets (ryuk_uniform/ryuk_walk/ryuk_monster) are NOT in animationData
# → correctly excluded (MAIN-FORM-ONLY, Mayuri precedent; keeps attack-FX read intact).
SHEETS = [
    "l_ryuuzaki_idle_uniform.png", "l_ryuuzaki_idle_seated_uniform.png", "l_ryuuzaki_walk_uniform.png",
    "l_ryuuzaki_run_uniform.png", "l_ryuuzaki_dash_uniform.png", "l_ryuuzaki_jump_uniform.png",
    "l_ryuuzaki_knockdown_uniform.png", "l_ryuuzaki_taunt_uniform.png",
    "l_ryuuzaki_light_uniform.png", "l_ryuuzaki_heavy_uniform.png", "l_ryuuzaki_up_uniform.png",
    "l_ryuuzaki_air_uniform.png", "l_ryuuzaki_downair_uniform.png",
    "l_ryuuzaki_cmd1_uniform.png", "l_ryuuzaki_cmd2_uniform.png", "l_ryuuzaki_cmd3_uniform.png",
    "l_ryuuzaki_nova_uniform.png", "l_ryuuzaki_bazooka_cast_uniform.png", "l_ryuuzaki_rising_cast_uniform.png",
    "l_ryuuzaki_analysis_uniform.png", "l_ryuuzaki_kicktrail_uniform.png",
]
PORTRAIT = "l_ryuuzaki_portrait.png"

def classify(h, s, v):
    hd = h * 360
    if v <= 0.18:                                     return "HAIR"    # near-black spiky hair — PROTECTED
    if 12 <= hd <= 55 and s >= 0.45 and v >= 0.45:    return "ACCENT"  # saturated orange shoes/belt (default KEEP)
    if 12 <= hd <= 55 and s <= 0.45 and v >= 0.85:    return "SKIN"    # pale warm face/hands — PROTECTED
    if s < 0.06 and v <= 0.35:                        return "OUTLINE" # pure-grey line-art (57,57,57) — PROTECTED
    if s >= 0.22 or v <= 0.55:                        return "JEANS"   # bluer/darker denim — SECONDARY
    return "SHIRT"                                                     # pale near-neutral top — PRIMARY

def hx(s): s = s.lstrip("#"); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))

# ── SKIN DEFINITIONS ──────────────────────────────────────────────────────────────────────────────
# Per region a RAMP (dark->light hex). ACCENT None = keep orange. Void handled separately (VOID key).
SKINS = {
  # 2. Midnight Detective — charcoal shirt over near-black jeans
  "midnight":   { "name": "Midnight Detective",
    "SHIRT": ["#141419", "#26262E", "#3C3C48", "#46464F", "#5A5A66"],
    "JEANS": ["#101014", "#181820", "#22222E", "#30303C"], "ACCENT": None },
  # 3. Wammy's Grey — slate shirt over steel jeans
  "wammys":     { "name": "Wammy's Grey",
    "SHIRT": ["#5E5E68", "#7C7C86", "#9696A2", "#AEAEBA", "#C6C6D2"],
    "JEANS": ["#42485A", "#565E70", "#6C7488", "#828CA0"], "ACCENT": None },
  # 4. Sugar Rush — candy-pink shirt over cream-pink jeans
  "sugar":      { "name": "Sugar Rush",
    "SHIRT": ["#B87A96", "#D89CB6", "#F0BED2", "#F8D2E0", "#FCE4EE"],
    "JEANS": ["#B48A9C", "#C79FB0", "#DAB4C2", "#EDCAD5"], "ACCENT": None },
  # 5. Strawberry Cake — pale strawberry shirt over cream jeans
  "strawberry": { "name": "Strawberry Cake",
    "SHIRT": ["#A85A5C", "#C67A7C", "#E39698", "#EFAAAC", "#F7C0C2"],
    "JEANS": ["#C9B49E", "#DAC6B0", "#E8D6C2", "#F2E4D2"], "ACCENT": None },
  # 6. Blue Insomnia — steel-blue shirt over deep indigo jeans
  "insomnia":   { "name": "Blue Insomnia",
    "SHIRT": ["#4C6684", "#6A88A6", "#88A6C0", "#9EBAD2", "#B6D0E6"],
    "JEANS": ["#242C50", "#343E6A", "#48547E", "#5C6A96"], "ACCENT": None },
  # 7. Shinigami Green — sickly pale-green shirt over dark moss jeans
  "shinigami":  { "name": "Shinigami Green",
    "SHIRT": ["#7C9068", "#9AAE82", "#B6CC9A", "#C6DAAA", "#D6E8BC"],
    "JEANS": ["#38442C", "#48563A", "#5A6A4A", "#6C7C5A"], "ACCENT": None },
  # 8. Kira Crimson — off-white shirt over deep crimson jeans (push accent redder)
  "kira":       { "name": "Kira Crimson",
    "SHIRT": ["#B4AEAE", "#CAC4C4", "#DCD6D6", "#E8E2E2", "#F4EEEE"],
    "JEANS": ["#4A0E14", "#6E1620", "#901E2A", "#B02838"],
    "ACCENT": ["#5E0A0A", "#8A1414", "#C02020", "#E84040"] },
  # 9. Amber Deduction — warm amber shirt over brown jeans
  "amber":      { "name": "Amber Deduction",
    "SHIRT": ["#A67C42", "#C29A5E", "#DCB47C", "#E8C48E", "#F2D4A2"],
    "JEANS": ["#5A3E22", "#6E4E2E", "#84603A", "#9A7448"], "ACCENT": None },
  # 10. Monochrome Genius — pure-white shirt over near-black jeans
  "mono":       { "name": "Monochrome Genius",
    "SHIRT": ["#B4B4B4", "#D0D0D0", "#E4E4E4", "#F0F0F0", "#FAFAFA"],
    "JEANS": ["#0E0E12", "#16161A", "#202024", "#2C2C30"], "ACCENT": None },
  # 11. Violet Cipher — pale lilac shirt over deep violet jeans
  "violet":     { "name": "Violet Cipher",
    "SHIRT": ["#8C7CA6", "#A896C2", "#C4B2DC", "#D2C2E6", "#E2D6F0"],
    "JEANS": ["#3A2A5A", "#4C3A72", "#60468E", "#7458A6"], "ACCENT": None },
  # 12. Panda Insomniac — INVERTED: near-black shirt over pale-grey jeans
  "panda":      { "name": "Panda Insomniac",
    "SHIRT": ["#1E1E24", "#28282F", "#34343C", "#3E3E48", "#4A4A54"],
    "JEANS": ["#9A9AA6", "#B0B0BC", "#C4C4D0", "#D6D6E2"], "ACCENT": None },
  # 13. Eternal Void — full-body near-black + game.js drawLRyuuzakiVoidAuraOverlay (indigo/white deduction glyphs)
  "lRyuuzakiEternalVoid": { "name": "Eternal Void", "VOID": "#0E0E16" },
}

def content_ybounds(px, W, H):
    miny, maxy = H, -1
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > 16:
                miny = min(miny, y); maxy = max(maxy, y); break
    return (miny, max(maxy, miny + 1))

# global per-region value range (from the base palette across all sheets) → normalises the spread mapping.
def region_ranges():
    lo, hi = {}, {}
    for sh in SHEETS:
        p = os.path.join(ROOT, sh)
        if not os.path.exists(p): continue
        im = Image.open(p).convert("RGBA"); px = im.load(); W, H = im.size
        for y in range(H):
            for x in range(W):
                r, g, b, a = px[x, y]
                if a <= 16: continue
                hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                reg = classify(hh, ss, vv)
                if vv < lo.get(reg, 1.1): lo[reg] = vv
                if vv > hi.get(reg, -0.1): hi[reg] = vv
    return lo, hi

def ramp_at(ramp, t):
    t = max(0.0, min(1.0, t)); n = len(ramp) - 1
    if n == 0: return ramp[0]
    f = t * n; i = int(f); frac = f - i
    if i >= n: return ramp[n]
    a, b = ramp[i], ramp[i+1]
    return tuple(round(a[k] + (b[k] - a[k]) * frac) for k in range(3))

_LO, _HI = None, None
def paint_pixel(r, g, b, skin):
    global _LO, _HI
    hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    reg = classify(hh, ss, vv)
    if "VOID" in skin:                          # full-body near-black — everything EXCEPT keep hair/outline dark anyway
        vr, vg, vb = hx(skin["VOID"]); f = 0.55 + 0.45 * vv   # faint value-spread so it isn't a flat blob
        return (round(vr*f), round(vg*f), round(vb*f))
    if reg in ("HAIR", "OUTLINE", "SKIN"):      # PROTECTED (iconic near-black hair + line-art + pale face/hands)
        return (r, g, b)
    spec = skin.get(reg)
    if spec is None:                            # region kept as-is (e.g. ACCENT on most skins)
        return (r, g, b)
    ramp = [hx(c) for c in spec]
    lo, hi = _LO.get(reg, 0.0), _HI.get(reg, 1.0)
    t = (vv - lo) / (hi - lo) if hi > lo else 0.5
    return ramp_at(ramp, t)

def recolor(src, dst, skin):
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA"); px = im.load(); W, H = im.size
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); op = out.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 16: continue
            nr, ng, nb = paint_pixel(r, g, b, skin)
            op[x, y] = (nr, ng, nb, a)
    out.save(os.path.join(ROOT, dst))

def out_name(sheet, tag): return sheet.replace(".png", f"__{tag}.png")

def do_probe():
    tint = {"HAIR": (20, 20, 20), "ACCENT": (255, 140, 0), "SKIN": (255, 220, 150),
            "OUTLINE": (255, 0, 255), "SHIRT": (255, 255, 255), "JEANS": (40, 80, 220)}
    im = Image.open(os.path.join(ROOT, "l_ryuuzaki_idle_uniform.png")).convert("RGBA"); px = im.load(); W, H = im.size
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); op = out.load(); cnt = {}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 16: continue
            hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            reg = classify(hh, ss, vv); cnt[reg] = cnt.get(reg, 0) + 1
            op[x, y] = (*tint[reg], 255)
    out.crop((0, 0, 26*4, H)).resize((26*4*6, H*6), Image.NEAREST).save(os.path.join(ROOT, "l_ryuuzaki_skin_mask_debug.png"))
    print("region px counts:", cnt); print("wrote l_ryuuzaki_skin_mask_debug.png")

def do_preview():
    global _LO, _HI; _LO, _HI = region_ranges()
    tags = list(SKINS.keys()); tiles = []
    for tag in tags:
        recolor("l_ryuuzaki_idle_uniform.png", "_tmp_prev.png", SKINS[tag])
        tiles.append((tag, Image.open(os.path.join(ROOT, "_tmp_prev.png")).convert("RGBA")))
    # single-frame crop (idle frame0 ≈ 26px)
    tiles = [(t, im.crop((0, 0, 26, im.height))) for t, im in tiles]
    cell_w = 26 + 8; cell_h = tiles[0][1].height + 20
    cols = 6; rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cell_w*cols*4, cell_h*rows*4), (24, 24, 30, 255))
    for i, (tag, img) in enumerate(tiles):
        big = img.resize((img.width*4, img.height*4), Image.NEAREST)
        cx = (i % cols) * cell_w*4 + 4; cy = (i // cols) * cell_h*4 + 4
        mont.alpha_composite(big, (cx, cy))
        ImageDraw.Draw(mont).text((cx, cy + big.height + 2), SKINS[tag]["name"], fill=(230, 230, 230, 255))
    mont.save(os.path.join(ROOT, "l_ryuuzaki_skins_preview_idle.png"))
    if os.path.exists(os.path.join(ROOT, "_tmp_prev.png")): os.remove(os.path.join(ROOT, "_tmp_prev.png"))
    print(f"wrote l_ryuuzaki_skins_preview_idle.png ({len(tiles)} skins)")

# FULL preview sheet (idle frame0 + recolored portrait, labeled) incl. the Default. Approval-gate montage →
# harness/shots/l_ryuuzaki_skins_preview.png. Assumes `all` already ran (recolored PNGs exist on disk).
def do_preview_sheet():
    order = [("", "Default")] + [(t, SKINS[t]["name"]) for t in SKINS]
    COLS, CW, CH, PAD, LBL = 4, 300, 200, 14, 24
    PORT_H = 168   # portrait target height (downscaled from 288px native so it fits the cell)
    rows = (len(order) + COLS - 1) // COLS
    W, H = COLS * CW, rows * (CH + LBL)
    mont = Image.new("RGBA", (W, H), (22, 22, 28, 255))
    dr = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)
    except Exception:
        try: font = ImageFont.truetype("DejaVuSans.ttf", 16)
        except Exception: font = ImageFont.load_default()
    def idle_p(tag): return os.path.join(ROOT, f"l_ryuuzaki_idle_uniform__{tag}.png" if tag else "l_ryuuzaki_idle_uniform.png")
    def port_p(tag): return os.path.join(ROOT, f"l_ryuuzaki_portrait__{tag}.png" if tag else "l_ryuuzaki_portrait.png")
    for i, (tag, name) in enumerate(order):
        cx, cy = (i % COLS) * CW, (i // COLS) * (CH + LBL)
        idle = Image.open(idle_p(tag)).convert("RGBA").crop((0, 0, 26, 52))
        idle = idle.resize((idle.width * 3, idle.height * 3), Image.NEAREST)   # 78x156
        mont.alpha_composite(idle, (cx + PAD, cy + PAD + (CH - idle.height)))
        port = Image.open(port_p(tag)).convert("RGBA")
        pw = round(port.width * PORT_H / port.height)
        port = port.resize((pw, PORT_H), Image.LANCZOS)                        # DOWNSCALE portrait to fit cell
        mont.alpha_composite(port, (cx + PAD + idle.width + 16, cy + PAD))
        dr.text((cx + PAD, cy + CH + 4), name, fill=(236, 236, 242, 255), font=font)
    outp = os.path.join(ROOT, "harness", "shots"); os.makedirs(outp, exist_ok=True)
    mont.save(os.path.join(outp, "l_ryuuzaki_skins_preview.png"))
    print(f"wrote harness/shots/l_ryuuzaki_skins_preview.png ({len(order)} skins incl. Default)")

# Assert the iconic near-black hair pixel RGB(33,16,33)/(32,16,32) survives UNCHANGED in every recolor idle sheet
# (Void excepted — full-black body). Exit 1 if any recolor altered the hair count. Called by the mjs harness.
def do_hair_check():
    def hair_count(p):
        im = Image.open(p).convert("RGBA"); px = im.load(); W, H = im.size; n = 0
        for y in range(min(14, H)):
            for x in range(min(26, W)):
                r, g, b, a = px[x, y]
                if a <= 16: continue
                if (r, g, b) in ((33, 16, 33), (32, 16, 32)): n += 1
        return n
    base = hair_count(os.path.join(ROOT, "l_ryuuzaki_idle_uniform.png"))
    bad = 0
    for tag in SKINS:
        if tag == "lRyuuzakiEternalVoid": continue
        c = hair_count(os.path.join(ROOT, f"l_ryuuzaki_idle_uniform__{tag}.png"))
        if c != base: bad += 1; print(f"HAIR CHANGED {tag}: {c} vs base {base}")
    print(f"hair check: base={base} bad={bad}")
    sys.exit(1 if (bad or base == 0) else 0)

def do_all(only=None):
    global _LO, _HI; _LO, _HI = region_ranges()
    tags = [only] if only else list(SKINS.keys())
    for tag in tags:
        skin = SKINS[tag]
        for sh in SHEETS:
            if os.path.exists(os.path.join(ROOT, sh)): recolor(sh, out_name(sh, tag), skin)
        recolor(PORTRAIT, out_name(PORTRAIT, tag), skin)
        print(f"OK {tag} ({skin['name']}): {len(SHEETS)} sheets + portrait")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "probe": do_probe()
    elif mode == "preview": do_preview()
    elif mode == "sheet": do_preview_sheet()
    elif mode == "hair": do_hair_check()
    elif mode in SKINS: do_all(mode)
    else: do_all()
