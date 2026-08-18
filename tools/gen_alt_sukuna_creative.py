#!/usr/bin/env python3
"""Alternate Sukuna (JJK) — 8 coordinated palette recolors + Void Sovereign + Ink Wash (10 alt-skins).

★ HEALTH-CHECKED against the REAL sprite (NOT the build-prompt's assumptions). The prompt described the
classic Heian kimono (cream outfit / black scarf / separable markings); the actual rip is Sukuna in his
MODERN look: pink spiked HAIR, a dominant BLACK outfit (fill AND outline are both pure #000000 → NOT
cleanly recolorable), a RED scarf/collar, RED shoe accents, and dusty-RED face markings (same red family
as the scarf → NOT color-separable from it). Owner-locked STRATEGY A: keep the outfit BLACK (its real
look) and theme each skin via the two cleanly-separable regions — HAIR (pink) + ACCENT (all the reds:
scarf + markings + shoe accents, which recolor together). Skin excluded except Void. Cosmetic only.

FOUR paintable classes, classified ONCE from ORIGINAL pixels (priority order; each pixel ≤ one class):
  * ACCENT  — the reds (scarf/collar/markings/shoes): high-sat red (s>=0.72 & (h<=14 or h>=344)). FIRST.
  * OUTLINE — the near-black outfit + line-art (v<0.16). PROTECTED (this is why the outfit stays black).
  * LIGHT   — white highlights / teeth / eye glints (v>=0.90 & s<0.12). PROTECTED.
  * SKIN    — peach face/hands (6<=h<=34 & 0.16<=s<0.62 & v>=0.55). PROTECTED (recoloured only for Void/Ink).
  * HAIR    — pink/magenta spikes + shading (312<=h<=360 & 0.15<=s<0.72 & v>=0.28).
  * OTHER   — anything else — left untouched.

paint(): re-centre a region on the target hue at the target value, preserving its own light/dark SPREAD.

USAGE: gen_alt_sukuna_creative.py [probe|preview|all|<tag>]      # default: all
  probe   -> alt_sukuna_skin_mask_debug(_4x).png (regions tinted) to verify classification
  preview -> recolor idle per skin + alt_sukuna_skins_preview.png montage (no full batch)
  all     -> recolor EVERY animationData sheet + portrait for all 10 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE uniform sheet in alt_sukuna's animationData (22). run=walk / down_air=air are reuses (not
# separate files). The Domain Expansion shrine backdrop (alt_sukuna_domain1/2/3.png) is a cinematic FX
# overlay NOT in animationData → correctly stays uncoloured (load-bearing cursed-technique art, mirrors
# Brainiac's beam/pillar FX exclusion).
SHEETS = [
    "alt_sukuna_idle_uniform.png", "alt_sukuna_walk_uniform.png", "alt_sukuna_dash_uniform.png",
    "alt_sukuna_jump_uniform.png", "alt_sukuna_fall_uniform.png", "alt_sukuna_crouch_uniform.png",
    "alt_sukuna_guard_uniform.png", "alt_sukuna_hurt_uniform.png", "alt_sukuna_knockdown_uniform.png",
    "alt_sukuna_getup_uniform.png", "alt_sukuna_light_uniform.png", "alt_sukuna_heavy_uniform.png",
    "alt_sukuna_up_uniform.png", "alt_sukuna_air_uniform.png", "alt_sukuna_cleave1_uniform.png",
    "alt_sukuna_cleave2_uniform.png", "alt_sukuna_beam_uniform.png", "alt_sukuna_spinkick_uniform.png",
    "alt_sukuna_grab_uniform.png", "alt_sukuna_ultcharge_uniform.png", "alt_sukuna_intro_uniform.png",
    "alt_sukuna_win_uniform.png",
]
PORTRAIT = "alt_sukuna_portrait.png"

def classify(h, s, v):
    if s >= 0.72 and (h <= 14 or h >= 344):  return "ACCENT"   # reds: scarf/markings/shoes (high-sat)
    if v < 0.16:                              return "OUTLINE"  # near-black outfit + line-art (protected)
    if v >= 0.90 and s < 0.12:                return "LIGHT"    # white highlights / teeth
    if 6 <= h <= 34 and 0.16 <= s < 0.62 and v >= 0.55: return "SKIN"   # peach face/hands
    if 312 <= h <= 360 and 0.15 <= s < 0.72 and v >= 0.28: return "HAIR"  # pink/magenta spikes
    return "OTHER"

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
    """Void: crush a region to near-black, keeping a whisper of its own shading + a faint crimson tint
    (cursed-energy void, vs Brainiac's cool-blue)."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (max(g, round(g * 1.20)), g, g, px[x, y][3])   # a touch warm/crimson

# each skin = HAIR + ACCENT paint specs (S(hex)); skin/ink/void handled specially. None = keep original.
SKINS = {
    # ── Group 1 — 4 coordinated recolors (prompt Hair→HAIR, Markings→ACCENT) ──
    "crimsonmalevolence": dict(hair=S("#8C2E38"), accent=S("#E82438"), note="red hair / intensified-red scarf+markings on black"),
    "azurecurse":         dict(hair=S("#3D5C8C"), accent=S("#4A8CC9"), note="blue hair / azure accent on black"),
    "goldensovereign":    dict(hair=S("#C9862E"), accent=S("#FFD670"), note="golden-blonde hair / gold accent on black"),
    "obsidianking":       dict(hair=S("#7B7B7B"), accent=S("#B0B0B0"), note="grey hair / grey accent on black (all-noir)"),
    # ── Group 2 — 4 coordinated recolors ──
    "verdantcurse":       dict(hair=S("#2E7B5C"), accent=S("#4ABD7B"), note="jade hair / green accent on black"),
    "wisteriareign":      dict(hair=S("#5C3D8C"), accent=S("#A55CC9"), note="violet hair / wisteria accent on black"),
    "emberfeast":         dict(hair=S("#8C3D14"), accent=S("#E8621A"), note="auburn hair / ember-orange accent on black"),
    "frostboundsovereign":dict(hair=S("#D6DCE0", 0.55), accent=S("#8FC9E0"), note="silver-white hair / icy-blue accent on black"),
    # ── Specialty (2) ──
    # Ink Wash — manga monochrome. NOTE: the prompt wanted a pale-grey KIMONO, but this sprite's outfit is
    # BLACK (fill==outline) so it can't be lightened cleanly → the outfit stays inked-black (flagged
    # deviation). Skin→flat pale grey, hair→near-black, accent/markings→stark black linework.
    "inkwash":            dict(skin=S("#B8B8B8"), hair=S("#1C1C1C", 0.06), accent=S("#0A0A0A", 0.03), note="manga monochrome — pale-grey skin / inked-black hair+markings (outfit stays black — flagged)"),
    # Void Sovereign — full-near-black incl. skin + game.js drawAltSukunaVoidAuraOverlay cherry-blossom petals.
    "voidsovereign":      dict(void=True, note="full-black cursed-void silhouette + drifting cherry-blossom petal overlay (game.js)"),
}

DISPLAY = {
    "crimsonmalevolence": "Crimson Malevolence", "azurecurse": "Azure Curse",
    "goldensovereign": "Golden Sovereign", "obsidianking": "Obsidian King",
    "verdantcurse": "Verdant Curse", "wisteriareign": "Wisteria Reign",
    "emberfeast": "Ember Feast", "frostboundsovereign": "Frostbound Sovereign",
    "inkwash": "Ink Wash", "voidsovereign": "Void Sovereign",
}
ORDER = ["crimsonmalevolence", "azurecurse", "goldensovereign", "obsidianking",
         "verdantcurse", "wisteriareign", "emberfeast", "frostboundsovereign",
         "inkwash", "voidsovereign"]

def _regions(im):
    W, H = im.size; px = im.load()
    reg = {k: [] for k in ("ACCENT", "OUTLINE", "LIGHT", "SKIN", "HAIR", "OTHER")}
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
        for k in ("SKIN", "HAIR", "ACCENT", "LIGHT", "OTHER"):
            void_paint(px, reg[k])
    else:
        paint(px, reg["SKIN"],   spec.get("skin"))    # None for normal skins → peach protected
        paint(px, reg["HAIR"],   spec.get("hair"))
        paint(px, reg["ACCENT"], spec.get("accent"))
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "alt_sukuna_win_uniform.png")).convert("RGBA")   # win = face markings + scarf + outfit visible
    px, reg = _regions(im)
    tint = {"ACCENT": (255, 0, 0), "OUTLINE": (0, 0, 0), "LIGHT": (255, 255, 255),
            "SKIN": (255, 200, 140), "HAIR": (255, 0, 255), "OTHER": (0, 220, 0)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, "alt_sukuna_skin_mask_debug.png"))
    dbg.resize((im.width * 6, im.height * 6), Image.NEAREST).save(os.path.join(ROOT, "alt_sukuna_skin_mask_debug_6x.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("→ alt_sukuna_skin_mask_debug(_6x).png  (red=ACCENT black=OUTLINE white=LIGHT peach=SKIN magenta=HAIR green=OTHER)")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def preview():
    tiles = [("Default", _frame0("alt_sukuna_win_uniform.png"))]
    for tag in ORDER:
        recolor("alt_sukuna_win_uniform.png", f"alt_sukuna_win_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _frame0(f"alt_sukuna_win_uniform__{tag}.png")))
    cols = 6; cw, ch = 130, 150; lblh = 16
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
    mont.save(os.path.join(ROOT, "alt_sukuna_skins_preview.png"))
    print(f"→ alt_sukuna_skins_preview.png  ({len(tiles)} tiles: Default + {len(ORDER)} skins)")

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
