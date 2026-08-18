#!/usr/bin/env python3
"""Light Yagami (Death Note, "Kira") — 8 creative alt-skins (2 groups of 4) + Void Sovereign + Umbral
Reflection = 10. Death-Note / detective / Kira / Shinigami lore. The BLACK SUIT is the primary identity
region; HAIR is the secondary region; the NOTEBOOK/TIE violet is a small accent. FACE/SKIN (hands too) is
PROTECTED. Cosmetic — ZERO gameplay.

STAGE-0 RESOLVED (pixel-analysed, user-confirmed 2026-08-16 — see memory light-yagami-build / light-skins):
  * Q1 SHIRT/RIM-LIGHT: the light ramp (#7B7B7B..#FFFFFF) is suit RIM-LIGHT + a 2-3px collar, NOT a separable
    white shirt. FOLDED INTO THE SUIT — the whole neutral black→white ramp is ONE region, recoloured with its
    VALUE-SPREAD preserved so the #050505-outline-vs-#080808-fill separation survives automatically (the audit's
    "single most important pixel decision"). The table's suit + shirt/highlight columns = the two ends of one ramp.
  * Q2 HAIR/SKIN SHARED PALETTE: skin (face+hands) reuses hair's warm tones. Exact/HSV mask PROTECTS the pale
    skin tones (warm, low-sat, high-value) and recolours the saturated warm HAIR mass. Skin's few lightest
    shared highlight pixels on the hair stay tan (minor, accepted). Face fidelity prioritised.
  * FX NEVER TOUCHED — the gold/blue/violet/red attack-class FX sheets (light_*fx / ryuk / vortex / gunman /
    etc.) are NOT in this SHEETS list (they ride spawnProjectile, not animationData) → auto-excluded. The
    "read the attack by colour" mechanic is preserved.

Region classify (HSV, PRIORITY ORDER):
  * VIOLET  — notebook / tie / Shinigami-scythe: 245<=h<=275 & s>=0.25.            (recolour per-skin, or KEEP)
  * SKIN    — pale warm face/hands: 15<=h<=52 & s<=0.52 & v>=0.82.                 PROTECTED (never recoloured)
  * HAIR    — saturated warm hair mass: 12<=h<=58 & s>=0.30.                        (recolour — secondary region)
  * SUIT    — neutral black→white ramp (outline+fill+rim+collar): s<0.15.           (recolour — PRIMARY, spread-kept)
  * OTHER   — anything else → PROTECTED (safety).
Void Sovereign = full-form near-black incl. skin (the one skin-exclusion exception) + a game.js procedural
violet page-glyph overlay. Umbral Reflection = inverted palette (suit→cream, highlight→black, hair→violet-grey),
skin left alone.

USAGE: gen_light_creative.py [probe|preview|all|<tag>]     # default: all
  probe   -> light_skin_mask_debug.png (regions tinted) + region counts
  preview -> recolour idle per skin + light_skins_preview.png montage (no full batch)
  all     -> recolour EVERY body animationData sheet + portrait for all 10 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE main-body uniform sheet in Light's animationData. walk/run share run; jump/fall share jump;
# guard/hurt/knockdown/light/heavy/win reuse their base sheets → retag points at these same files. The 7 summon
# sheets + the 2 normal-FX sheets + the 2 ult cut-in panels are NOT here → correctly stay uncoloured (FX read).
SHEETS = [
    "light_idle_uniform.png", "light_run_uniform.png", "light_dash_uniform.png", "light_jump_uniform.png",
    "light_guard_uniform.png", "light_hurt_uniform.png", "light_b_body_uniform.png", "light_bdown_uniform.png",
    "light_cast_uniform.png", "light_aircast_uniform.png", "light_ultwrite_uniform.png",
    "light_scythe_uniform.png", "light_lose_uniform.png",
]
PORTRAIT = "light_portrait.png"

def classify(h, s, v, yfrac=0.0):
    # yfrac = pixel's vertical position within the figure (0 = head-top, 1 = feet). REQUIRED because hair and
    # SKIN (face + HANDS) share the exact warm palette (Stage-0 Q2) → colour alone cannot separate them. The
    # split is POSITIONAL: warm pixels in the top ~42% of the figure = HAIR (the head mass); warm pixels below
    # = SKIN (the hands sit at hip height) → PROTECTED. Face highlights are protected by colour anyway.
    h *= 360
    if 245 <= h <= 275 and s >= 0.25:            return "VIOLET"   # notebook / tie / scythe accent
    if 15 <= h <= 52 and s <= 0.52 and v >= 0.82: return "SKIN"     # pale warm face highlights — PROTECTED
    if 12 <= h <= 58 and s >= 0.30:                                 # saturated warm → hair OR hands
        return "HAIR" if yfrac <= 0.42 else "SKIN"                  #   top = hair (recolour) / lower = hands (protect)
    if s < 0.15:                                 return "SUIT"     # neutral black→white ramp (primary)
    return "OTHER"                                                  # protected

def hx(s): s = s.lstrip("#"); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))

# ── SKIN DEFINITIONS ─────────────────────────────────────────────────────────────────────────────
# Per region a RAMP (dark→light hex list). paint() maps each source pixel to the ramp at its value-percentile
# WITHIN the region (global vmin..vmax) → the region's own light/dark spread is preserved. notebook None = KEEP.
SKINS = {
  # ── GROUP 1 ──
  "midnightverdict": { "name": "Midnight Verdict",
    "SUIT": ["#050609", "#0A0A10", "#151520", "#2A2A38", "#8794B8", "#DCE4F7", "#F7FAFF"],
    "HAIR": ["#1A0F04", "#2A1808", "#3D2410", "#5C3818"], "VIOLET": None },
  "crimsonjudgment": { "name": "Crimson Judgment",
    "SUIT": ["#0A0303", "#100505", "#291010", "#4A1A1A", "#B87A6E", "#F7EAE0", "#FFF7F0"],
    "HAIR": ["#2E0800", "#4A1000", "#7B2400", "#B84A18"], "VIOLET": "#5C2E70" },
  "glacialgenius": { "name": "Glacial Genius",
    "SUIT": ["#060A0E", "#0A1015", "#1F2E38", "#3B4F5C", "#9FC4DC", "#DCF0FF", "#F0FAFF"],
    "HAIR": ["#4A3818", "#7B5C29", "#C9A05C", "#F7E0A0"], "VIOLET": "#7FA5C9" },
  "ashboundscholar": { "name": "Ashbound Scholar",
    "SUIT": ["#080808", "#0F0F0F", "#242424", "#3D3D3D", "#9E9A92", "#E8E4DC", "#F7F3EA"],
    "HAIR": ["#241A0F", "#382818", "#5C4629", "#8F6B3D"], "VIOLET": "#6B5C70" },
  # ── GROUP 2 ──
  "goldenapple": { "name": "Golden Apple",
    "SUIT": ["#080603", "#100C05", "#291F10", "#473318", "#B49874", "#F7EEDC", "#FFFAF0"],
    "HAIR": ["#4A3008", "#7B5210", "#C98A18", "#FFD670"], "VIOLET": None },
  "wisteriascholar": { "name": "Wisteria Scholar",
    "SUIT": ["#0A0518", "#100829", "#231A4A", "#3B2E70", "#8A7BB8", "#EAE0F7", "#F7F0FF"],
    "HAIR": ["#281A24", "#3D2938", "#5C3D52", "#8F5C7B"], "VIOLET": "#5C2E70" },
  "emberdetective": { "name": "Ember Detective",
    "SUIT": ["#0F0403", "#1A0805", "#3B1710", "#5C2818", "#B4826E", "#F7E7D6", "#FFF3E7"],
    "HAIR": ["#2E1000", "#4A2000", "#8F3D00", "#DE7018"], "VIOLET": "#8F5A70" },
  "obsidianheir": { "name": "Obsidian Heir",
    "SUIT": ["#030303", "#050505", "#1A1A1A", "#333333", "#9A9A9A", "#F0F0F0", "#FFFFFF"],
    "HAIR": ["#0A0703", "#0F0A05", "#241A10", "#3D2E1A"], "VIOLET": "#5C5C63" },
  # ── SPECIALTY ──
  # Umbral Reflection — INVERTED double: suit dark→pale cream (so the dark steps become light, light steps dark),
  # hair→cool violet-grey (Ryuk-evoking). Skin PROTECTED. The SUIT ramp is written dark-source→light-target so
  # the outline (darkest source) lands the palest cream and the collar/highlight (lightest source) lands black.
  "umbralreflection": { "name": "Umbral Reflection",
    "SUIT": ["#F4F1EA", "#E4DED0", "#C2BBA8", "#8F887C", "#4A4A4A", "#1A1A1A", "#0A0A0A"],
    "HAIR": ["#2E2A38", "#4A4558", "#6E6880", "#A8A2B8"], "VIOLET": "#C9C0E0" },
  # Void Sovereign — Part A only here (full-form near-black incl. skin). Part B = game.drawLightVoidAuraOverlay.
  "lightvoidsovereign": { "name": "Void Sovereign", "VOID": "#0F0F12" },
}

def content_ybounds(px, W, H):
    miny, maxy = H, -1
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > 16:
                if y < miny: miny = y
                if y > maxy: maxy = y
                break
    return (miny, max(maxy, miny + 1))

# global per-region value range (computed from the base palette once) → normalises the spread mapping.
def region_ranges():
    lo, hi = {}, {}
    for sh in SHEETS:
        im = Image.open(os.path.join(ROOT, sh)).convert("RGBA"); px = im.load(); W, H = im.size
        miny, maxy = content_ybounds(px, W, H)
        for y in range(H):
            yf = (y - miny) / (maxy - miny)
            for x in range(W):
                r, g, b, a = px[x, y]
                if a <= 16: continue
                hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                reg = classify(hh, ss, vv, yf)
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
def paint_pixel(r, g, b, skin, yf):
    global _LO, _HI
    hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    reg = classify(hh, ss, vv, yf)
    if "VOID" in skin:                         # full-form near-black (Part A) — everything incl. skin
        vr, vg, vb = hx(skin["VOID"]); f = 0.55 + 0.45 * vv   # keep a faint value-spread so it isn't a flat blob
        return (round(vr*f), round(vg*f), round(vb*f))
    if reg in ("SKIN", "OTHER"):               # protected (pale face + the positionally-masked hands)
        return (r, g, b)
    spec = skin.get(reg)
    if spec is None:                           # region kept as-is (e.g. notebook on some skins)
        return (r, g, b)
    if isinstance(spec, str):                  # single accent colour (notebook) → shaded 3-stop mini-ramp
        c = hx(spec); spec = [tuple(round(ch*0.55) for ch in c), c, tuple(min(255, round(ch*1.35)) for ch in c)]
        ramp = spec
    else:
        ramp = [hx(c) for c in spec]
    lo, hi = _LO.get(reg, 0.0), _HI.get(reg, 1.0)
    t = (vv - lo) / (hi - lo) if hi > lo else 0.5
    return ramp_at(ramp, t)

def recolor(src, dst, skin):
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA"); px = im.load(); W, H = im.size
    miny, maxy = content_ybounds(px, W, H)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); op = out.load()
    for y in range(H):
        yf = (y - miny) / (maxy - miny)
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 16: continue
            nr, ng, nb = paint_pixel(r, g, b, skin, yf)
            op[x, y] = (nr, ng, nb, a)
    out.save(os.path.join(ROOT, dst))

def out_name(sheet, tag): return sheet.replace(".png", f"__{tag}.png")

def do_probe():
    tint = {"VIOLET": (150, 60, 220), "SKIN": (255, 210, 120), "HAIR": (220, 120, 0), "SUIT": (60, 120, 255), "OTHER": (255, 0, 255)}
    im = Image.open(os.path.join(ROOT, "light_b_body_uniform.png")).convert("RGBA"); px = im.load(); W, H = im.size
    miny, maxy = content_ybounds(px, W, H)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); op = out.load(); cnt = {}
    for y in range(H):
        yf = (y - miny) / (maxy - miny)
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 16: continue
            hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            reg = classify(hh, ss, vv, yf); cnt[reg] = cnt.get(reg, 0) + 1
            op[x, y] = (*tint[reg], 255)
    out.resize((W*6, H*6), Image.NEAREST).save(os.path.join(ROOT, "light_skin_mask_debug.png"))
    print("region px counts:", cnt); print("wrote light_skin_mask_debug.png")

def do_preview():
    global _LO, _HI; _LO, _HI = region_ranges()
    tags = list(SKINS.keys()); tiles = []
    for tag in tags:
        recolor("light_idle_uniform.png", "_tmp_prev.png", SKINS[tag])
        tiles.append((tag, Image.open(os.path.join(ROOT, "_tmp_prev.png")).convert("RGBA")))
    cell_w = max(t[1].width for t in tiles) + 8; cell_h = max(t[1].height for t in tiles) + 20
    cols = 5; rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cell_w*cols*4, cell_h*rows*4), (30, 30, 36, 255))
    for i, (tag, img) in enumerate(tiles):
        big = img.resize((img.width*4, img.height*4), Image.NEAREST)
        cx = (i % cols) * cell_w*4 + 4; cy = (i // cols) * cell_h*4 + 4
        mont.alpha_composite(big, (cx, cy))
        ImageDraw.Draw(mont).text((cx, cy + big.height + 2), SKINS[tag]["name"], fill=(230, 230, 230, 255))
    mont.save(os.path.join(ROOT, "light_skins_preview.png"))
    if os.path.exists(os.path.join(ROOT, "_tmp_prev.png")): os.remove(os.path.join(ROOT, "_tmp_prev.png"))
    print(f"wrote light_skins_preview.png ({len(tiles)} skins)")

def do_all(only=None):
    global _LO, _HI; _LO, _HI = region_ranges()
    tags = [only] if only else list(SKINS.keys())
    for tag in tags:
        skin = SKINS[tag]
        for sh in SHEETS: recolor(sh, out_name(sh, tag), skin)
        recolor(PORTRAIT, out_name(PORTRAIT, tag), skin)
        print(f"OK {tag} ({skin['name']}): {len(SHEETS)} sheets + portrait")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "probe": do_probe()
    elif mode == "preview": do_preview()
    elif mode in SKINS: do_all(mode)
    else: do_all()
