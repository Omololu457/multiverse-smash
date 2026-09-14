#!/usr/bin/env python3
"""Add-only skins for under-skinned characters, reusing the PROVEN Yuta/Rick-Prime recolor pipeline.

Three shared palettes (identical target values across every character):
  albedo   — black garment / red accent / grey trim   (Yuta's EXACT albedo palette)
  valkyrie — light-blue garment / gold accent+trim     (Yuta's EXACT valkyrie palette)
  alienx   — Alien X (Ben 10 Celestialsapien): matte near-black body (dark base, shading spread
             preserved — NOT a flat wash); the bright colourful "star" dots are drawn procedurally
             at runtime by game.js drawAlienXStarfield (skinId-gated), same architecture as the
             existing Void-Form starfields. Here we only produce the dark base sheets.

paint()/void_paint() are copied verbatim from tools/gen_yuta_creative.py (same HSV re-centre-preserving-
spread method) so the recolour behaviour is byte-for-byte the proven one. Alpha is ALWAYS preserved
(we only ever touch opaque pixels and never rewrite the alpha channel) → no keying/transparency holes.

USAGE: gen_underskin_recolor.py <char> [probe|<tag>|all]
  probe -> <char>_skin_mask_debug.png (regions tinted) + counts, to verify classification first.
  <tag> -> recolour every sheet + portrait for that one palette.
  all   -> every palette configured for that char.
"""
import os, sys, colorsys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, spec):
    """spec = (hex, to_sat, floor, spread) or None. Re-centre a region on the target hue/value,
    preserving its own light/dark SPREAD so folds/shading survive. (verbatim from gen_yuta_creative.py)"""
    if not spec or not pts: return 0
    hexcol, to_sat, floor, spread = spec
    tr, tg, tb = hex2rgb(hexcol)
    th, _ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, to_sat, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

def void_paint(px, pts):
    """Alien-X void: crush a region to near-black, keeping only a whisper of its own shading spread
    + a faint cool tint (verbatim from gen_yuta_creative.py)."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, max(g, round(g * 1.14)), px[x, y][3])

# ── shared palette targets (region tuple = hex, to_sat, floor, spread) ─────────────────────────
# EXACT values lifted from tools/gen_yuta_creative.py (Yuta's albedo & valkyrie).
ALBEDO   = dict(garment=("#141414", 0.05, 0.05, 1.10), accent=("#B8242E", 0.72, 0.20, 1.08), trim=("#5C5C5C", 0.04, 0.30, 1.08))
VALKYRIE = dict(garment=("#8FC9E0", 0.30, 0.42, 1.16), accent=("#D6A82E", 0.70, 0.26, 1.10), trim=("#D6A82E", 0.66, 0.40, 1.10))
PALETTES = {"albedo": ALBEDO, "valkyrie": VALKYRIE, "alienx": {"void": True}}

# ── per-character region classifier + sheet list ───────────────────────────────────────────────
# classify(h_deg, s, v) -> one of: SKIN | GARMENT | ACCENT | TRIM | DARK | OTHER
#   SKIN  = protected (never recoloured on albedo/valkyrie)
#   DARK  = protected structural black (outline / very-dark) on albedo/valkyrie
#   GARMENT/ACCENT/TRIM map to the palette's garment/accent/trim targets
# alienx ignores classify() and void-crushes EVERY opaque pixel (Alien X is fully black).

def baki_classify(h, s, v):
    # Baki: bare-chested; hair AND shorts share ONE pure-red palette that CANNOT be split from each
    # other by colour (verified) — so treat them as a single unified THEME region (user-approved
    # "unified theme recolor"). Warm skin (incl. shadows: warmer hue / lower sat) is protected.
    if (h <= 10 or h >= 343) and s >= 0.48:  return "GARMENT"   # pure-red HAIR + SHORTS (unified theme)
    if v < 0.16:                              return "DARK"      # outline / deep shadow (protected)
    return "OTHER"                                               # skin (bright + shadow) + neutrals — kept

def boruto_classify(h, s, v):
    # Boruto: blond hair + skin (warm, protect). Black tracksuit jacket+pants = GARMENT (dark, low-sat).
    # Red collar/scarf = ACCENT. White undershirt/trim kept. Pure outline protected.
    if 12 <= h <= 52 and s >= 0.28 and v >= 0.45:  return "SKIN"     # blond hair + face/hands
    if (h <= 12 or h >= 328) and s >= 0.50 and v >= 0.38:  return "ACCENT"   # red collar / scarf
    if s < 0.18 and v >= 0.62:                      return "OTHER"    # white undershirt/trim (kept)
    if v < 0.12:                                    return "DARK"     # pure outline (protected)
    if v < 0.55 and s < 0.55:                       return "GARMENT"  # black jacket + pants
    return "OTHER"

def kakashi_classify(h, s, v):
    # Kakashi: silver hair (neutral high-v, keep) + skin (warm, protect). Navy/black jonin outfit = GARMENT.
    # Red shoulder spiral = ACCENT. Pure outline protected.
    if 12 <= h <= 50 and s >= 0.28 and v >= 0.5:   return "SKIN"     # face
    if s < 0.16 and v >= 0.55:                      return "OTHER"    # silver hair (kept)
    if (h <= 12 or h >= 340) and s >= 0.55 and v >= 0.3:  return "ACCENT"  # red spiral
    if v < 0.13:                                    return "DARK"     # pure outline (protected)
    if v < 0.55:                                    return "GARMENT"  # navy/black uniform
    return "OTHER"

def kurapika_classify(h, s, v):
    # Kurapika: blond hair + skin (warm, protect). BLUE tabard/tunic = GARMENT (hue-separable → cleanest).
    # Red accents = ACCENT. White + outline kept.
    if 12 <= h <= 55 and s >= 0.25 and v >= 0.5:   return "SKIN"     # blond hair + face
    if 175 <= h <= 265 and s >= 0.30:               return "GARMENT"  # blue tabard (any value)
    if (h <= 12 or h >= 340) and s >= 0.45:         return "ACCENT"   # red accents
    if v < 0.12:                                    return "DARK"
    return "OTHER"                                                    # white + neutrals kept

def rickprime_classify(h, s, v):
    # Rick Prime: PALE-CYAN hair (protect!) + skin (warm, protect). Dark burgundy jacket + dark blue-grey
    # pants = GARMENT. Pure outline protected. Cyan hair is high-value cyan; garment is low-value → separable.
    if 150 <= h <= 205 and s >= 0.14 and v >= 0.5:  return "OTHER"    # pale-cyan HAIR (kept — critical)
    if 12 <= h <= 50 and s >= 0.22 and v >= 0.45:   return "SKIN"     # face/hands
    if v < 0.12:                                    return "DARK"     # pure outline (protected)
    if v < 0.52 and s < 0.62:                       return "GARMENT"  # dark burgundy jacket + blue-grey pants
    return "OTHER"

def vegeta_classify(h, s, v):
    # Vegeta: BLUE jumpsuit = GARMENT, WHITE armour/gloves/boots = TRIM, black hair+outline protected,
    # skin protected. Regions are cleanly hue/sat-separable.
    if v < 0.16:                                   return "DARK"     # black hair + outline (protected)
    if 15 <= h <= 45 and s >= 0.25 and v >= 0.45:  return "SKIN"     # face
    if 185 <= h <= 280 and s >= 0.26:               return "GARMENT"  # blue jumpsuit (+violet shadow)
    if s < 0.20 and v >= 0.55:                      return "TRIM"     # white Saiyan armour / gloves / boots
    return "OTHER"

def goku_classify(h, s, v):
    # Goku: ORANGE gi = GARMENT (high-sat warm; the dark-orange shadow wraps to h~330), BLUE undershirt/
    # belt/wristbands/boots = ACCENT, skin = mid-sat warm (protect), black hair+outline protect.
    if v < 0.16:                                    return "DARK"     # hair + outline (protected)
    if 185 <= h <= 245 and s >= 0.28:                return "ACCENT"   # blue gi accents
    if (14 <= h <= 48 and s >= 0.66) or (h >= 318 and s >= 0.55):  return "GARMENT"  # orange gi (+ its magenta-ish shadow)
    if 14 <= h <= 46 and 0.28 <= s < 0.66 and v >= 0.45:  return "SKIN"  # face / hands (mid-sat warm) — protected
    return "OTHER"

def naruto_classify(h, s, v):
    # Naruto (Kurama Chakra Mode): a full-body warm chakra CLOAK (red→orange→yellow gradient) with no
    # colour-separable skin/garment — so recolour the whole warm cloak as one unified theme (like Baki),
    # matching how his existing alt-skins recolour hue 5-66. Only true-dark outline is protected.
    if v < 0.14:                                    return "DARK"     # outline / deep seal shadow (protected)
    if (h <= 62 or h >= 338) and s >= 0.30:          return "GARMENT"  # whole warm chakra cloak (unified theme)
    return "OTHER"                                                    # white highlights / eyes kept

CHARS = {
    "baki":      dict(classify=baki_classify),
    "vegeta":    dict(classify=vegeta_classify),
    "goku":      dict(classify=goku_classify),
    "naruto":    dict(classify=naruto_classify),
    "boruto":    dict(classify=boruto_classify),
    "kakashi":   dict(classify=kakashi_classify),
    "kurapika":  dict(classify=kurapika_classify),
    # rickPrime's base sheets are the Rick recolour `rick_*__rickprime.png` (not `rickPrime_*.png`);
    # recolorSkinAnim("rickPrime", tag) retags those to `rick_*__rickprime__<tag>.png`.
    "rickPrime": dict(classify=rickprime_classify, base_glob="rick_*__rickprime.png", probe_src="rick_stand__rickprime.png"),
}

def _regions(im, classify):
    px = im.load(); W, H = im.size
    reg = {k: [] for k in ("SKIN", "GARMENT", "ACCENT", "TRIM", "DARK", "OTHER")}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            reg[classify(h*360, s, v)].append((x, y))
    return px, reg

def recolor(char, src, out, tag):
    cfg = CHARS[char]; pal = PALETTES[tag]
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA")
    px, reg = _regions(im, cfg["classify"])
    if pal.get("void"):
        for k in ("SKIN", "GARMENT", "ACCENT", "TRIM", "DARK", "OTHER"):
            void_paint(px, reg[k])
    else:
        paint(px, reg["GARMENT"], pal["garment"])
        paint(px, reg["ACCENT"],  pal["accent"])
        paint(px, reg["TRIM"],    pal["trim"])
        # SKIN, DARK, OTHER kept
    im.save(os.path.join(ROOT, out))
    return {k: len(v) for k, v in reg.items()}

def probe(char):
    cfg = CHARS[char]
    src = cfg.get("probe_src", f"{char}_idle_uniform.png")
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA")
    px, reg = _regions(im, cfg["classify"])
    tint = {"SKIN": (255, 190, 130), "GARMENT": (60, 120, 255), "ACCENT": (255, 40, 40),
            "TRIM": (255, 215, 0), "DARK": (0, 0, 0), "OTHER": (255, 0, 255)}
    dbg = im.copy(); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, f"{char}_skin_mask_debug.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print(f"-> {char}_skin_mask_debug.png (skin=peach GARMENT=blue accent=red trim=gold DARK=black OTHER=magenta)")

import glob
def gen(char, tags):
    """Recolour EVERY base sheet + portrait for `char` for each tag. Base sheets = <char>_*.png that
    do NOT already carry a `__tag` suffix (so we never recolour a recolour). Portrait included."""
    cfg = CHARS[char]
    if cfg.get("base_glob"):   # explicit base set (e.g. rickPrime = rick_*__rickprime.png)
        bases = [os.path.basename(p) for p in glob.glob(os.path.join(ROOT, cfg["base_glob"]))
                 if not any(f"__{t}.png" in os.path.basename(p) for t in PALETTES)]
    else:
        bases = [os.path.basename(p) for p in glob.glob(os.path.join(ROOT, f"{char}_*.png")) if "__" not in os.path.basename(p)]
    bases = sorted(bases)
    print(f"{char}: {len(bases)} base sheets")
    for tag in tags:
        n = 0
        for b in bases:
            out = b.replace(".png", f"__{tag}.png")
            recolor(char, b, out, tag)
            n += 1
        print(f"  {tag}: wrote {n} sheets")

if __name__ == "__main__":
    char = sys.argv[1] if len(sys.argv) > 1 else "baki"
    mode = sys.argv[2] if len(sys.argv) > 2 else "probe"
    if mode == "probe":
        probe(char)
    elif mode == "all":
        gen(char, [t for t in ("albedo", "valkyrie", "alienx") if char in CHARS])
    elif mode in PALETTES:
        gen(char, [mode])
    else:
        print("modes: probe | all | albedo | valkyrie | alienx")
