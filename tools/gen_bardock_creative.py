#!/usr/bin/env python3
"""Bardock (rosterKey bardock, DBZ Extreme Butoden) — 8 coordinated palette recolors + Void Sovereign
   + Elite Guard (2nd specialty, ORIGINAL design — no canon alt-costume exists for Bardock).

★ HEALTH-CHECKED against the REAL sprite (tool pixel scan across idle/win/intro/heavy/light). Findings vs
  the prompt's region table ("tan skin / black hair / green vest-armor / navy bodysuit / red wristbands /
  green boots"):
  * SUIT   = navy-blue undersuit — the DOMINANT garment (~27%, h 198-250, s>=0.22): #000018/#003060/#001848/
             #606090 (mid). PRIMARY theme carrier.
  * ARMOR  = the Saiyan battle armor is OLIVE / YELLOW-GREEN (not pure green), + green boots (h 56-140,
             s>=0.45): #487800/#789018/#a8c030/#003000. SECONDARY theme.
  * RED    = the iconic blood headband + wristbands + waist (h>=325|<=8, s>=0.55, ~18%): #480018/#780030/
             #901848/#300000. ACCENT (themed per skin, so Azure gets a blue band etc).
  * SKIN   = tan skin + brown armor straps (h 12-44): #f0c0a8/#d8a878/#a86030/#603018 (PROTECTED except
             mono/frost/Void — straps read as leather, fine to keep tan on colour skins).
  * HAIR/DARK = black hair + line-art (s<0.30, v<0.16): #000000/#181818 (PROTECTED; black Saiyan hair kept —
             these are ARMOUR skins, not SSJ). WHITE = bluish highlights (s<0.16, v>=0.86, protected).
  ★ NO RESERVED PALETTE (unlike Dark Vegeta/Piccolo). The SSJ gold flash is a cosmetic taunt (bardock_ssjflash),
     NOT a playable form — its sheet recolors with the skin like any body pose.

PAINTABLE classes (classified ONCE from ORIGINAL pixels; priority; each pixel <= one class):
  RED · ARMOR · SUIT · SKIN     (paintable; SKIN only on mono/frost/Void)
  WHITE · DARK(hair+outline)    (protected)  — Void crushes all.

USAGE: gen_bardock_creative.py [probe|preview|all|<tag>]   # default: all
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every sheet referenced by bardock.animationData (recolorSkinAnim retags each one).
SHEETS = [
    "bardock_idle_uniform.png", "bardock_dash_uniform.png", "bardock_jump_uniform.png",
    "bardock_fall_uniform.png", "bardock_air_uniform.png", "bardock_downair_uniform.png",
    "bardock_crouch_uniform.png", "bardock_crouchlight_uniform.png", "bardock_guard_uniform.png",
    "bardock_guardhit_uniform.png", "bardock_hurt_uniform.png", "bardock_knockdown_uniform.png",
    "bardock_getup_uniform.png", "bardock_light_uniform.png", "bardock_heavy_uniform.png",
    "bardock_up_uniform.png", "bardock_rush1_uniform.png", "bardock_rush2_uniform.png",
    "bardock_rush3_uniform.png", "bardock_rebellion_uniform.png", "bardock_kicharge_uniform.png",
    "bardock_ssjflash_uniform.png", "bardock_win_uniform.png", "bardock_intro_uniform.png",
]
PORTRAIT = "bardock_portrait.png"

def classify(h, s, v):
    if (h >= 325 or h <= 8) and s >= 0.55 and v >= 0.12:   return "RED"     # red headband/wristbands/waist
    if 56 <= h <= 198 and s >= 0.35 and v >= 0.13:         return "ARMOR"   # olive-green armor + teal chest plate + boots
    if 12 <= h <= 44 and s >= 0.20 and v >= 0.15:          return "SKIN"    # tan skin + brown straps (protected)
    if 195 <= h <= 278 and s >= 0.14 and v >= 0.06:        return "SUIT"    # navy bodysuit (+ purple-creep low-val shadow + hi-lite)
    if s < 0.16 and v >= 0.86:                             return "WHITE"   # bluish highlights (protected)
    if s < 0.22 and v < 0.20:                              return "DARK"    # black hair + outline (protected)
    return "OTHER"                                                          # misc neutral greys (untouched)

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
    """Void Part A: crush a region to near-black keeping a whisper of shading + a faint cool tint."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, min(255, round(g * 1.30)), px[x, y][3])   # a touch cool/silver

# ── skin table — red/armor/suit/skin (white/dark PROTECTED). void special. ──
SKINS = {
    # ── Group 1 ──
    "crimsonsaiyan": dict(armor=S("#C42A2A"), suit=S("#3A0E0E"), red=S("#D83A3A"), note="red armor / dark-red suit / red band"),
    "verdantwarrior":dict(armor=S("#2E7B1E"), suit=S("#123D18"), red=S("#4A8A2E"), note="deep forest-green armor / dark-green suit / green band"),
    "obsidiansaiyan":dict(armor=S("#B0B0B0"), suit=S("#1A1A1A"), red=S("#6E6E6E"), skin=S("#6E6E6E"), note="MONOCHROME: silver armor / black suit / grey band + grey skin"),
    "goldenwarrior": dict(armor=S("#E0B028"), suit=S("#2E2409"), red=S("#C89020"), note="gold armor / dark-gold suit / gold band"),
    # ── Group 2 ──
    "azuresaiyan":   dict(armor=S("#2E6ED0"), suit=S("#0E1A44"), red=S("#3A7AE0"), note="blue armor / navy suit / blue band"),
    "violetwarrior": dict(armor=S("#7A34C4"), suit=S("#1E0E3A"), red=S("#9040D8"), note="violet armor / dark-violet suit / violet band"),
    "frostboundsaiyan": dict(armor=S("#CFE8F5"), suit=S("#7EA8C8"), red=S("#A8C8E0"), skin=S("#E4DCCC"), note="ice-white/blue: pale-ice armor / light-blue suit / pale band + pale skin (light outlier)"),
    "embersaiyan":   dict(armor=S("#E07818"), suit=S("#3A1C08"), red=S("#E89030"), note="orange armor / dark-brown suit / orange band"),
    # ── Specialty ──
    "voidsovereign": dict(void=True, note="full near-black incl. skin + drifting ki-energy wisp overlay (game.js drawBardockVoidAuraOverlay)"),
    # ── 2nd specialty — Elite Guard: ORIGINAL design (flagged, NOT canon — no documented Bardock alt-costume
    #    exists). Deep militaristic crimson/black armour variant, nodding to Saiyan military ranking. Distinct
    #    from Crimson Saiyan (bright red) by leaning a DARK blood-crimson on near-black. ──
    "eliteguard":    dict(armor=S("#7A1420"), suit=S("#120608"), red=S("#4A0E14"), note="ORIGINAL Elite Guard: deep blood-crimson armor / near-black suit / dark-crimson band (Saiyan military rank nod)"),
}
DISPLAY = {
    "crimsonsaiyan": "Crimson Saiyan", "verdantwarrior": "Verdant Warrior", "obsidiansaiyan": "Obsidian Saiyan",
    "goldenwarrior": "Golden Warrior", "azuresaiyan": "Azure Saiyan", "violetwarrior": "Violet Warrior",
    "frostboundsaiyan": "Frostbound Saiyan", "embersaiyan": "Ember Saiyan", "voidsovereign": "Void Sovereign",
    "eliteguard": "Elite Guard",
}
ORDER = ["crimsonsaiyan", "verdantwarrior", "obsidiansaiyan", "goldenwarrior",
         "azuresaiyan", "violetwarrior", "frostboundsaiyan", "embersaiyan", "voidsovereign", "eliteguard"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("RED", "ARMOR", "SKIN", "SUIT", "WHITE", "DARK", "OTHER")}
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
        for k in reg: void_paint(px, reg[k])
    else:
        paint(px, reg["ARMOR"], spec.get("armor"))
        paint(px, reg["SUIT"],  spec.get("suit"))
        paint(px, reg["RED"],   spec.get("red"))
        paint(px, reg["SKIN"],  spec.get("skin"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "bardock_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"RED": (220, 30, 40), "ARMOR": (120, 190, 30), "SKIN": (240, 190, 150), "SUIT": (40, 70, 210),
            "WHITE": (255, 255, 255), "DARK": (20, 20, 20), "OTHER": (255, 0, 200)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(ROOT, "bardock_skin_mask_debug_8x.png"))
    tot = sum(len(v) for v in reg.values())
    print("region %:", {k: round(100*len(v)/tot, 1) for k, v in reg.items() if v})
    print("→ bardock_skin_mask_debug_8x.png  (RED=RED lime=ARMOR tan=SKIN blue=SUIT white=WHITE black=DARK MAGENTA=OTHER[untouched])")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("bardock_idle_uniform.png"))]
    for tag in ORDER:
        recolor("bardock_idle_uniform.png", f"bardock_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"bardock_idle_uniform__{tag}.png")))
    cols = 6; cw, ch = 120, 170; lblh = 16
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
    mont.save(os.path.join(ROOT, "bardock_skins_preview.png"))
    print(f"→ bardock_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
