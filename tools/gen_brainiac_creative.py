#!/usr/bin/env python3
"""Brainiac (DC) — 8 coordinated palette recolors + Void Sovereign + Animated Protocol (10 alt-skins).
Grounded in the real sprite (health-checked, NOT guessed): the base is the MODERN look — GREEN skin
(face/hands), a PURPLE bodysuit (torso+legs), a DOMINANT GREY METAL casing (shoulder pauldrons / chest
plate / gauntlets / boots / belt), and TINY RED diodes (the eyes + 2 chest-plate dots). FX colours
(beam/pillar/shield/electric) are NOT touched — those sheets are not in animationData, so this recolours
BODY regions only. Cosmetic — ZERO gameplay/stat changes.

FIVE regions, classified ONCE from the ORIGINAL pixels (capture-masks-first = contamination-proof), each
pixel assigned to at most one class in priority order (palette confirmed by sampling brainiac_idle_uniform.png:
purple armour RGB(16,0,48)-(80,0,240) / green skin RGB(16,48,0)-(96,176,16) / grey metal RGB(48,48,48)-
(144,144,144) / red diode RGB(115,16,16)-(255,0,0) / near-black outline RGB(0,0,0)-(32,32,32)):
  * DIODE   — the tiny red eyes + chest diodes ((h>=344 or h<=15) & s>=0.45 & v>=0.22). Checked FIRST (few px).
  * OUTLINE — near-pure-black line-art (v<0.13 & s<0.55). Protected. (Dark saturated purple/green fall through.)
  * LIGHT   — white highlights (v>=0.86 & s<0.14). Protected.
  * SKIN    — the green face/hands + shading (70<=h<=165 & s>=0.28). PRIMARY classic identity.
  * ARMOR   — the purple bodysuit + shading (225<=h<=290 & s>=0.28), incl. its dark saturated shadows.
  * METAL   — the grey casing/tubing: desaturated mid-to-light grey (s<0.22 & v>=0.13).
  * OTHER   — anything else — left untouched.

paint(): to-tone re-centre on the target hue at the target value, preserving each region's own light/dark
SPREAD (floor keeps a near-black target above outline-black; to_sat sets output saturation).

USAGE: gen_brainiac_creative.py [probe|preview|all|<tag>]     # default: all
  probe   -> brainiac_skin_mask_debug.png (regions tinted) to verify classification
  preview -> recolor idle per skin + brainiac_skins_preview.png montage (no full batch)
  all     -> recolor EVERY animationData sheet + portrait for all 10 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE uniform sheet in Brainiac's animationData (16). The beam-projectile + pillar-ULT VFX sheets
# are NOT in animationData → they correctly stay uncoloured (FX = load-bearing gameplay colour).
SHEETS = [
    "brainiac_idle_uniform.png", "brainiac_walk_uniform.png", "brainiac_crouch_uniform.png",
    "brainiac_hurt_uniform.png", "brainiac_knockdown_uniform.png", "brainiac_getup_uniform.png",
    "brainiac_light_uniform.png", "brainiac_heavy_uniform.png", "brainiac_up_uniform.png",
    "brainiac_air_uniform.png", "brainiac_crouchtentacle_uniform.png", "brainiac_beam_uniform.png",
    "brainiac_blade_uniform.png", "brainiac_sweep_uniform.png", "brainiac_shield_uniform.png",
    "brainiac_levitate_uniform.png",
]

def classify(h, s, v):
    if (h >= 344 or h <= 15) and s >= 0.45 and v >= 0.22:  return "DIODE"    # red eyes + chest diodes (tiny, first)
    if v < 0.13 and s < 0.55:                              return "OUTLINE"  # near-black line-art
    if v >= 0.86 and s < 0.14:                             return "LIGHT"    # white highlights
    if 70 <= h <= 165 and s >= 0.28:                       return "SKIN"     # green face/hands
    if 225 <= h <= 290 and s >= 0.28:                      return "ARMOR"    # purple bodysuit
    if s < 0.22 and v >= 0.13:                             return "METAL"    # grey casing/tubing
    return "OTHER"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def S(hexcol, floor=None, spread=1.14):
    """Build a paint spec (hex, to_sat, floor, spread). to_sat = the target's own saturation; floor auto =
    ~0.30·target_value (keeps a dark target clear of the protected outline-black)."""
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
    """Alien-X void: crush a region to near-black, keeping a whisper of its own shading + a cool tint."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, max(g, round(g * 1.18)), px[x, y][3])

# each region = a paint spec via S(hex[, floor]);  None = keep original.  Regions: skin / armor / diode / metal.
SKINS = {
    # ── Group 1 — 4 coordinated recolors ──
    "crimsoncircuit":   dict(skin=S("#8C3D3D"), armor=S("#290F0F", 0.06), diode=S("#C9862E", 0.30), metal=S("#161616", 0.05), note="deep red-tinted skin / black-red armour / gold diodes / black casing"),
    "azureintelligence":dict(skin=S("#3D8C8C"), armor=S("#12213F", 0.08), diode=S("#EAF0F5", 0.55), metal=S("#4A5560", 0.18), note="teal skin / navy armour / white diodes / cool-grey casing"),
    "goldenarchive":    dict(skin=S("#C99C3D"), armor=S("#121212", 0.05), diode=S("#FFD670", 0.42), metal=S("#4A3410", 0.10), note="amber-gold skin / black armour / bright-gold diodes / bronze casing"),
    "obsidianprocessor":dict(skin=S("#8C8C8C"), armor=S("#121212", 0.05), diode=S("#EAEAEA", 0.55), metal=S("#3D3D3D", 0.15), note="monochrome grey skin / black armour / white diodes / grey casing"),
    # ── Group 2 — 4 coordinated recolors ──
    "verdantovermind":  dict(skin=S("#2E8C4A"), armor=S("#4A1F7B", 0.12), diode=S("#E82438", 0.30), metal=S("#161616", 0.05), note="deep-emerald skin / rich-violet armour / bright-red diodes / black casing (richer classic)"),
    "violetnexus":      dict(skin=S("#C9BDE0"), armor=S("#2E0F4A", 0.09), diode=S("#C0C4CC", 0.50), metal=S("#4A4A52", 0.18), note="lavender skin / deep-violet armour / silver diodes / grey casing"),
    "embercore":        dict(skin=S("#C97B3D"), armor=S("#3D1A14", 0.09), diode=S("#FFC94A", 0.42), metal=S("#161616", 0.05), note="orange skin / red-brown armour / yellow diodes / black casing"),
    "frostboundarray":  dict(skin=S("#DCF0F7", 0.60), armor=S("#D6DCE0", 0.58), diode=S("#4AC9E0", 0.36), metal=S("#B0B8C0", 0.42), note="icy-blue skin / white-grey armour / cyan diodes / silver casing"),
    # ── Specialty (2) ──
    # Animated Protocol — a DIFFERENT design lineage (documented animated/modern take): grey chest plate over
    # deep dark purple bodysuit, TEAL face (not classic green), silver gauntlets w/ YELLOW diodes.
    "animatedprotocol": dict(skin=S("#2E8C8C"), armor=S("#1A1030", 0.06), diode=S("#FFD24A", 0.42), metal=S("#B8C0C8", 0.44), note="ANIMATED homage — teal face / deep-dark-purple suit / silver casing / yellow diodes"),
    # Alien-X-style Void (special: full-near-black incl. skin + game.js drawBrainiacVoidAuraOverlay data-glyph aura).
    "voidsovereign":    dict(void=True, note="full-black data-void silhouette + drifting binary/data-glyph overlay (game.js)"),
}

DISPLAY = {
    "crimsoncircuit": "Crimson Circuit", "azureintelligence": "Azure Intelligence",
    "goldenarchive": "Golden Archive", "obsidianprocessor": "Obsidian Processor",
    "verdantovermind": "Verdant Overmind", "violetnexus": "Violet Nexus",
    "embercore": "Ember Core", "frostboundarray": "Frostbound Array",
    "animatedprotocol": "Animated Protocol", "voidsovereign": "Void Sovereign",
}
ORDER = ["crimsoncircuit", "azureintelligence", "goldenarchive", "obsidianprocessor",
         "verdantovermind", "violetnexus", "embercore", "frostboundarray",
         "animatedprotocol", "voidsovereign"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("DIODE", "OUTLINE", "LIGHT", "SKIN", "ARMOR", "METAL", "OTHER")}
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
        for k in ("SKIN", "ARMOR", "DIODE", "METAL", "LIGHT", "OTHER"):
            void_paint(px, reg[k])
    else:
        paint(px, reg["SKIN"],  spec.get("skin"))
        paint(px, reg["ARMOR"], spec.get("armor"))
        paint(px, reg["DIODE"], spec.get("diode"))
        paint(px, reg["METAL"], spec.get("metal"))
    im.save(os.path.join(ROOT, out))

def make_portrait(tag):
    """Bust portrait per skin from the recolored idle frame 0 (mirrors reslice_brainiac.make_portrait, 0.60)."""
    src = os.path.join(ROOT, f"brainiac_idle_uniform__{tag}.png")
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0)
    x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    y0, y1 = min(ys), max(ys)
    bust = im.crop((x0, y0, x1 + 1, y0 + int((y1 - y0 + 1) * 0.60)))
    scale = 288 / bust.height
    bust.resize((max(1, round(bust.width * scale)), 288), Image.NEAREST).save(os.path.join(ROOT, f"brainiac_portrait__{tag}.png"))

def probe():
    im = Image.open(os.path.join(ROOT, "brainiac_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"DIODE": (255, 0, 0), "OUTLINE": (0, 0, 0), "LIGHT": (255, 255, 255),
            "SKIN": (0, 220, 0), "ARMOR": (150, 0, 255), "METAL": (140, 140, 150), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, "brainiac_skin_mask_debug.png"))
    # upscale for eyeballing
    dbg.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(ROOT, "brainiac_skin_mask_debug_4x.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("→ brainiac_skin_mask_debug(_4x).png  (green=SKIN purple=ARMOR red=DIODE grey=METAL black=OUTLINE white=LIGHT magenta=OTHER)")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("brainiac_idle_uniform.png"))]
    for tag in ORDER:
        recolor("brainiac_idle_uniform.png", f"brainiac_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"brainiac_idle_uniform__{tag}.png")))
    cols = 6; cw, ch = 120, 156; lblh = 16
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
    mont.save(os.path.join(ROOT, "brainiac_skins_preview.png"))
    print(f"→ brainiac_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

def build_all():
    for tag in ORDER:
        for sh in SHEETS:
            recolor(sh, sh.replace(".png", f"__{tag}.png"), tag)
        make_portrait(tag)
        print(f"  built {tag}: {len(SHEETS)} sheets + portrait")
    print(f"OK — {len(ORDER)} skins × ({len(SHEETS)} sheets + portrait)")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "probe": probe()
    elif mode == "preview": preview()
    elif mode in SKINS:
        for sh in SHEETS: recolor(sh, sh.replace(".png", f"__{mode}.png"), mode)
        make_portrait(mode); print(f"built {mode}")
    else: build_all()
