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

def sasuke_classify(h, s, v):
    # Sasuke: dark blue-grey outfit = GARMENT, purple rope belt = ACCENT, black hair + outline protected
    # (v<0.12 keeps his iconic dark hair), skin protected. Outfit's higher value separates it from the hair.
    if v < 0.12:                                    return "DARK"     # black hair + outline (protected)
    if 12 <= h <= 42 and s >= 0.25 and v >= 0.45:    return "SKIN"     # face (protected)
    if 255 <= h <= 315 and s >= 0.22:                return "ACCENT"   # purple rope belt
    if 170 <= h <= 262 and v < 0.55:                 return "GARMENT"  # dark blue-grey outfit
    return "OTHER"

def piccolo_classify(h, s, v):
    # Piccolo: purple gi = GARMENT; GREEN Namekian skin = protected (his body); orange/gold trim = ACCENT;
    # white cape/shoulders kept; dark outline protected.
    if v < 0.14:                                     return "DARK"
    if 90 <= h <= 165 and s >= 0.35:                  return "SKIN"     # green Namekian skin (protected)
    if 248 <= h <= 300 and s >= 0.30:                 return "GARMENT"  # purple gi
    if 12 <= h <= 46 and s >= 0.5:                    return "ACCENT"   # orange/gold trim
    return "OTHER"                                                     # white cape kept

def frieza_classify(h, s, v):
    # Frieza (final form): his WHITE/light-cyan bio-body is the recolour target (unified, like Baki — no
    # separate skin); purple bio-gems = ACCENT; dark outline protected.
    if v < 0.14:                                     return "DARK"
    if 255 <= h <= 305 and s >= 0.40:                 return "ACCENT"   # purple bio-gems
    if (150 <= h <= 210) or (s < 0.35 and v >= 0.35):  return "GARMENT" # white/cyan bio-body (unified)
    return "OTHER"

def beerus_classify(h, s, v):
    # Beerus: PURPLE skin = protected (his body, desaturated high-value purple); blue Egyptian outfit =
    # GARMENT; gold/cyan trim = ACCENT; dark outline protected.
    if v < 0.14:                                     return "DARK"
    if 248 <= h <= 305 and s < 0.5:                   return "SKIN"     # desaturated purple skin (protected)
    if 190 <= h <= 250 and s >= 0.28:                 return "GARMENT"  # blue outfit
    if (12 <= h <= 55 and s >= 0.5) or (150 <= h <= 190 and s >= 0.5):  return "ACCENT"  # gold / cyan trim
    return "OTHER"

def vegito_classify(h, s, v):
    # Vegito: blue gi/armour = GARMENT; skin (warm) protected; white gloves/boots kept; dark outline/hair protect.
    if v < 0.14:                                     return "DARK"
    if 12 <= h <= 45 and 0.25 <= s < 0.7 and v >= 0.45:  return "SKIN"
    if 190 <= h <= 258 and s >= 0.28:                 return "GARMENT"  # blue gi/armour
    return "OTHER"

def gotenks_classify(h, s, v):
    # Gotenks: Metamoru vest is multi-colour; recolour the BLUE undershirt/pants = GARMENT, red vest panels =
    # ACCENT; SSJ gold hair protected (warm high-val), skin protected, white vest kept, dark outline protect.
    if v < 0.14:                                     return "DARK"
    if 38 <= h <= 62 and s >= 0.45 and v >= 0.6:      return "OTHER"    # SSJ gold hair (kept)
    if 12 <= h <= 38 and 0.25 <= s < 0.7 and v >= 0.5:  return "SKIN"   # face
    if 205 <= h <= 258 and s >= 0.30:                 return "GARMENT"  # blue undershirt / pants
    if (h <= 12 or h >= 344) and s >= 0.55:           return "ACCENT"   # red vest panels
    return "OTHER"                                                     # white/green vest kept

def bardock_classify(h, s, v):
    # Bardock: navy under-suit = GARMENT (dark blue), red headband/wristbands = ACCENT, pale skin protected,
    # green/white Saiyan armour kept, dark outline/hair protect.
    if v < 0.14:                                     return "DARK"
    if 12 <= h <= 45 and 0.18 <= s < 0.6 and v >= 0.55:  return "SKIN"  # pale skin
    if 195 <= h <= 260 and s >= 0.22:                 return "GARMENT"  # navy under-suit
    if (h <= 12 or h >= 338) and s >= 0.55:           return "ACCENT"   # red headband / bands
    return "OTHER"                                                     # green+white armour kept

def gohan_classify(h, s, v):
    # Teen Gohan: PURPLE gi = GARMENT, teal sash/wristbands = ACCENT, skin + black hair protected.
    # SSJ2 form (via recolorTag) keeps gold hair (warm high-val → SKIN-range protect handled below).
    if v < 0.14:                                     return "DARK"
    if 248 <= h <= 298 and s >= 0.32:                 return "GARMENT"  # purple gi
    if 150 <= h <= 205 and s >= 0.30:                 return "ACCENT"   # teal sash / wristbands
    if (8 <= h <= 42 or h >= 350) and 0.20 <= s < 0.7 and v >= 0.5:  return "SKIN"  # face (+ SSJ2 gold hair kept via OTHER)
    if 40 <= h <= 62 and s >= 0.45 and v >= 0.6:      return "OTHER"    # SSJ2 gold hair (kept)
    return "OTHER"

def goku_black_classify(h, s, v):
    # Goku Black: dark grey-blue gi = GARMENT, red sash = ACCENT, black hair+outline (v<0.13) protected,
    # skin protected. Rose form (recolorTag) → pink hair; protected as OTHER (magenta, high-val).
    if v < 0.13:                                     return "DARK"
    if (h <= 12 or h >= 344) and s >= 0.5 and v >= 0.3:  return "ACCENT"  # red sash
    if 8 <= h <= 42 and 0.22 <= s < 0.7 and v >= 0.5:   return "SKIN"    # face
    if v < 0.5 and s < 0.5:                           return "GARMENT"  # dark grey-blue gi + pants
    return "OTHER"                                                     # pink Rose hair / lighter bits kept

def vegeta_dark_classify(h, s, v):
    # Dark Vegeta: near-all-black suit + hair (protected — can't separate). Recolour the SILVER ARMOUR as the
    # GARMENT (the one large non-black element) + red accents; black suit/hair kept. Albedo makes armour dark
    # (subtle → we DROP albedo for this char, like Boruto); Valkyrie makes armour light-blue (dramatic).
    if v < 0.14:                                     return "DARK"     # black suit + hair + outline (protected)
    if (h <= 12 or h >= 328) and s >= 0.5:            return "ACCENT"   # red accents
    if 8 <= h <= 42 and 0.20 <= s < 0.6 and v >= 0.55:  return "SKIN"   # face
    if s < 0.28 and v >= 0.4:                         return "GARMENT"  # silver/grey armour
    return "OTHER"

def zenitsu_classify(h, s, v):
    # Zenitsu: yellow/orange haori + yellow hair = one unified warm theme (GARMENT); pink triangle pattern =
    # ACCENT; skin protected; black Demon-Slayer uniform + outline protected; white kept.
    if v < 0.15:                                     return "DARK"
    if 312 <= h <= 348 and s >= 0.45:                 return "ACCENT"   # pink triangles
    if 8 <= h <= 30 and 0.25 <= s < 0.62 and v >= 0.5:  return "SKIN"   # face (mid-sat warm, below haori sat)
    if 20 <= h <= 58 and s >= 0.5:                    return "GARMENT"  # yellow/orange haori + hair
    return "OTHER"

def rengoku_classify(h, s, v):
    # Rengoku: white/cream flame haori = GARMENT; red-orange flame hem + flame hair = ACCENT; skin protected;
    # black uniform + outline protected.
    if v < 0.15:                                     return "DARK"
    if 8 <= h <= 32 and 0.25 <= s < 0.6 and v >= 0.5:   return "SKIN"   # face
    if (h >= 316 or h <= 20) and s >= 0.5:            return "ACCENT"   # red-orange flame + flame hair
    if s < 0.22 and v >= 0.5:                         return "GARMENT"  # white/cream haori
    return "OTHER"

def shinobu_classify(h, s, v):
    # Shinobu: purple butterfly haori = GARMENT; white haori base kept; black hair + uniform protected; skin protect.
    if v < 0.15:                                     return "DARK"
    if 8 <= h <= 40 and 0.18 <= s < 0.5 and v >= 0.55:  return "SKIN"   # pale face
    if 205 <= h <= 285 and s >= 0.30:                 return "GARMENT"  # purple/violet haori
    if 150 <= h <= 205 and s >= 0.35:                 return "ACCENT"   # teal butterfly gradient
    return "OTHER"                                                     # white kept

def inosuke_classify(h, s, v):
    # Inosuke: blue-grey hakama = GARMENT; bare-chest skin protected; boar mask (white) kept; dark fur pelt +
    # outline protected.
    if v < 0.15:                                     return "DARK"
    if (h <= 38 or h >= 344) and 0.2 <= s < 0.65 and v >= 0.45:  return "SKIN"  # bare chest / face
    if 190 <= h <= 235 and s >= 0.28:                 return "GARMENT"  # blue-grey hakama
    return "OTHER"                                                     # white boar mask kept

def nezuko_classify(h, s, v):
    # Nezuko: pink checkered kimono = GARMENT; black hair (orange tips) + outline protected; skin protected;
    # bamboo muzzle kept.
    if v < 0.15:                                     return "DARK"
    if 8 <= h <= 40 and 0.2 <= s < 0.55 and v >= 0.55:  return "SKIN"   # face
    if 300 <= h <= 350 and s >= 0.28:                 return "GARMENT"  # pink kimono
    return "OTHER"

def bleach_classify(h, s, v):
    # Soul Reaper: white captain haori + blue/teal accents + dark shihakushō folds = GARMENT; skin protected;
    # pure-black shihakushō/outline protected (v<0.12).
    if v < 0.12:                                     return "DARK"
    if 8 <= h <= 42 and 0.22 <= s < 0.65 and v >= 0.45:  return "SKIN"
    if (s < 0.2 and v >= 0.5) or (168 <= h <= 255 and s >= 0.25) or (0.12 <= v < 0.5 and s < 0.42):  return "GARMENT"
    return "OTHER"

def ichigo_classify(h, s, v):
    # Ichigo: ORANGE hair kept; black shihakushō + white wrap = GARMENT; red Zangetsu cloth = ACCENT; skin protected.
    if v < 0.12:                                     return "DARK"
    if 12 <= h <= 45 and s >= 0.5 and v >= 0.5:       return "OTHER"    # orange hair (kept)
    if 8 <= h <= 42 and 0.22 <= s < 0.5 and v >= 0.45:  return "SKIN"   # face (below hair sat)
    if (h <= 10 or h >= 348) and s >= 0.55:           return "ACCENT"   # red Zangetsu cloth
    if (s < 0.2 and v >= 0.5) or (0.12 <= v < 0.5 and s < 0.42):  return "GARMENT"  # shihakushō + white wrap
    return "OTHER"

def omega_ranger_classify(h, s, v):
    # SPD Omega Ranger: white suit = GARMENT; blue accents = ACCENT; gold trim = TRIM.
    if 20 <= h <= 55 and s >= 0.45 and v >= 0.45:     return "TRIM"     # gold
    if 195 <= h <= 250 and s >= 0.35:                 return "ACCENT"   # blue
    if s < 0.28 and v >= 0.35:                        return "GARMENT"  # white suit
    if v < 0.12:                                      return "DARK"
    return "OTHER"

def samurai_red_classify(h, s, v):
    # Samurai Red Ranger: red suit = GARMENT; blue/purple symbol accents = ACCENT.
    if v < 0.10:                                      return "DARK"
    if (h <= 15 or h >= 340) and s >= 0.4:            return "GARMENT"  # red suit
    if 215 <= h <= 320 and s >= 0.30:                 return "ACCENT"   # blue/purple symbols
    return "OTHER"

def samurai_gold_classify(h, s, v):
    # Samurai Gold Ranger: gold suit = GARMENT; blue underlayer/accents = ACCENT.
    if v < 0.10:                                      return "DARK"
    if 18 <= h <= 58 and s >= 0.4 and v >= 0.4:       return "GARMENT"  # gold suit
    if 195 <= h <= 260 and s >= 0.3:                  return "ACCENT"   # blue
    return "OTHER"

def samurai_green_classify(h, s, v):
    # Samurai Green Ranger: green suit = GARMENT; black protected.
    if v < 0.10:                                      return "DARK"
    if 95 <= h <= 175 and s >= 0.28:                  return "GARMENT"  # green suit
    return "OTHER"

def red_mmpr_classify(h, s, v):
    # MMPR Red Ranger: red suit = GARMENT; white gloves/boots = TRIM; gold shield/belt = ACCENT.
    if v < 0.10:                                      return "DARK"
    if 40 <= h <= 65 and s >= 0.4:                    return "ACCENT"   # gold shield/belt
    if (h <= 15 or h >= 340) and s >= 0.4:            return "GARMENT"  # red suit
    if s < 0.22 and v >= 0.6:                         return "TRIM"     # white gloves/boots
    return "OTHER"

def ghostface_classify(h, s, v):
    # Ghostface (+ .EXE + Billy variant): white ghost mask kept; the shroud/robe (any hue) = unified GARMENT.
    if s < 0.18 and v >= 0.6:                         return "OTHER"    # white mask (kept)
    if v < 0.10:                                      return "DARK"
    return "GARMENT"                                                    # shroud (recolors as one)

def jason_classify(h, s, v):
    # Jason: white/grey hockey mask kept; dark muted work-clothes = GARMENT; skin protected.
    if 6 <= h <= 42 and 0.28 <= s < 0.6 and v >= 0.45:  return "SKIN"
    if s < 0.22 and v >= 0.55:                        return "OTHER"    # hockey mask (white/grey)
    if v < 0.10:                                      return "DARK"
    return "GARMENT"                                                    # dark clothes

def netero_classify(h, s, v):
    # Isaac Netero: pale monk robe (near-greyscale, low-sat) = GARMENT; blue prayer-bead sash = ACCENT;
    # warm skin protected; dark outline kept.
    if v < 0.13:                                     return "DARK"
    if 6 <= h <= 42 and 0.28 <= s < 0.6 and v >= 0.5:  return "SKIN"
    if 195 <= h <= 250 and s >= 0.32:                 return "ACCENT"   # blue sash / beads
    if s < 0.25 and v >= 0.3:                         return "GARMENT"  # white/grey robe
    return "OTHER"

def killua_classify(h, s, v):
    # Killua: silver-white hair kept; pale skin protected; the rest (turquoise top + shorts) = unified GARMENT.
    if 6 <= h <= 42 and 0.22 <= s < 0.5 and v >= 0.58:  return "SKIN"   # pale skin
    if s < 0.16 and v >= 0.70:                        return "OTHER"    # silver-white hair (kept)
    if v < 0.12:                                      return "DARK"
    return "GARMENT"                                                    # top + shorts (unified)

def gon_classify(h, s, v):
    # Gon: green jacket + shorts = GARMENT; black hair/outline kept; tan skin protected; blue undershirt = ACCENT.
    if v < 0.12:                                      return "DARK"
    if 12 <= h <= 45 and s >= 0.42 and v >= 0.5:      return "SKIN"     # tan skin
    if 200 <= h <= 255 and s >= 0.35:                 return "ACCENT"   # blue undershirt
    if 60 <= h <= 165 and s >= 0.22:                  return "GARMENT"  # green hair + shorts
    if s < 0.28 and v >= 0.45:                        return "GARMENT"  # white tank (cohesive)
    return "OTHER"

def hisoka_classify(h, s, v):
    # Hisoka: teal/green performer tunic = GARMENT; red hair kept; warm skin protected; gold trim = ACCENT.
    if v < 0.12:                                      return "DARK"
    if (h <= 16 or h >= 340) and s >= 0.5 and v >= 0.4:  return "OTHER" # red/magenta hair (kept)
    if 6 <= h <= 44 and 0.22 <= s < 0.5 and v >= 0.52:  return "SKIN"
    if 20 <= h <= 60 and s >= 0.5 and v >= 0.5:       return "ACCENT"   # gold trim / symbols
    if 120 <= h <= 200 and s >= 0.18:                 return "GARMENT"  # teal/green tunic
    return "OTHER"

def chrollo_classify(h, s, v):
    # Chrollo: dark-blue trench coat = GARMENT; white fur collar = TRIM; cross/skin/hair protected.
    if v < 0.12:                                      return "DARK"
    if 6 <= h <= 42 and 0.28 <= s < 0.55 and v >= 0.5:  return "SKIN"
    if 205 <= h <= 285 and s >= 0.22:                 return "GARMENT"  # dark-blue coat
    if s < 0.2 and v >= 0.55:                         return "TRIM"     # white fur collar
    return "OTHER"

def spiderman_classify(h, s, v):
    # Spider-Man: red suit = GARMENT; blue panels/legs = ACCENT; skin protected (portrait face); dark outline kept.
    if v < 0.13:                                     return "DARK"
    if 6 <= h <= 40 and 0.25 <= s < 0.6 and v >= 0.5:  return "SKIN"     # unmasked face in portrait
    if (h <= 15 or h >= 340) and s >= 0.45:           return "GARMENT"   # red suit
    if 175 <= h <= 260 and s >= 0.32:                 return "ACCENT"    # blue panels / eyes-cyan
    return "OTHER"

def miles_classify(h, s, v):
    # Miles Morales: BLACK suit primary = GARMENT; red spider/webbing = ACCENT; skin protected.
    if 6 <= h <= 40 and 0.28 <= s < 0.6 and v >= 0.45:  return "SKIN"    # brown skin (portrait)
    if (h <= 15 or h >= 335) and s >= 0.42:           return "ACCENT"    # red spider / web lines
    if v < 0.34:                                      return "GARMENT"   # black suit
    if 175 <= h <= 250 and s >= 0.32:                 return "TRIM"      # blue highlights
    return "OTHER"

def ironman_classify(h, s, v):
    # Iron Man (all Mark variants): red armour = GARMENT; gold plating = ACCENT; silver/grey metal = TRIM;
    # skin protected (helmet-off portrait); dark joints kept.
    if v < 0.14:                                     return "DARK"
    if 6 <= h <= 38 and 0.22 <= s < 0.5 and v >= 0.5:  return "SKIN"     # face
    if 20 <= h <= 55 and s >= 0.42 and v >= 0.4:      return "ACCENT"    # gold plating
    if (h <= 18 or h >= 335) and s >= 0.35:           return "GARMENT"   # red armour
    if s < 0.2 and v >= 0.38:                         return "TRIM"      # silver/grey metal
    return "OTHER"

def superman_classify(h, s, v):
    # Superman (all variants): blue suit = GARMENT; red cape/boots/S = ACCENT; skin + dark hair protected.
    if v < 0.13:                                     return "DARK"
    if 6 <= h <= 40 and 0.25 <= s < 0.72 and v >= 0.45:  return "SKIN"
    if (h <= 12 or h >= 344) and s >= 0.55:           return "ACCENT"   # red cape / boots / S
    if 195 <= h <= 245 and s >= 0.38:                 return "GARMENT"  # blue suit
    return "OTHER"

def flash_classify(h, s, v):
    # Flash: red bodysuit = GARMENT; yellow lightning = ACCENT; skin protected.
    if v < 0.13:                                     return "DARK"
    if 6 <= h <= 40 and 0.25 <= s < 0.72 and v >= 0.5 and s < 0.85:  return "SKIN"
    if 40 <= h <= 62 and s >= 0.6:                    return "ACCENT"   # yellow lightning
    if (h <= 14 or h >= 344) and s >= 0.55:           return "GARMENT"  # red suit
    return "OTHER"

def deathstroke_classify(h, s, v):
    # Deathstroke: dark blue-grey armour = GARMENT; orange accents = ACCENT; masked (no skin).
    if v < 0.14:                                     return "DARK"
    if 12 <= h <= 45 and s >= 0.6:                    return "ACCENT"   # orange
    if (195 <= h <= 258 or s < 0.32) and 0.14 <= v < 0.62:  return "GARMENT"  # blue-grey armour
    return "OTHER"

def brainiac_classify(h, s, v):
    # Brainiac: blue tech-suit = GARMENT; GREEN skin protected; dark outline protect.
    if v < 0.13:                                     return "DARK"
    if 80 <= h <= 165 and s >= 0.28:                  return "SKIN"     # green Coluan skin (protected)
    if 200 <= h <= 292 and s >= 0.30:                 return "GARMENT"  # blue/purple tech-suit
    return "OTHER"

def green_lantern_classify(h, s, v):
    # Green Lantern: green suit = GARMENT; skin protected; white logo + dark protected.
    if v < 0.15:                                     return "DARK"
    if 6 <= h <= 42 and 0.25 <= s < 0.7 and v >= 0.45:  return "SKIN"
    if 78 <= h <= 155 and s >= 0.4:                   return "GARMENT"  # green suit
    return "OTHER"

def batman_classify(h, s, v):
    # Batman: near-all-black suit/cape/cowl = one unified GARMENT (recolour toward the theme); yellow bat
    # symbol/belt = ACCENT; exposed chin skin protected; pure outline protected.
    if v < 0.06:                                     return "DARK"
    if 6 <= h <= 40 and 0.28 <= s < 0.7 and v >= 0.45:  return "SKIN"   # exposed chin/jaw
    if 38 <= h <= 62 and s >= 0.5:                    return "ACCENT"   # yellow bat symbol / belt
    if v < 0.6 and s < 0.5:                           return "GARMENT"  # black suit (unified)
    return "OTHER"

def dark_knight_classify(h, s, v):
    # Dark Knight (Batman variant): same as batman — unified dark suit recolour + yellow accent.
    if v < 0.06:                                     return "DARK"
    if 6 <= h <= 40 and 0.28 <= s < 0.7 and v >= 0.45:  return "SKIN"
    if 38 <= h <= 62 and s >= 0.5:                    return "ACCENT"
    if v < 0.6 and s < 0.5:                           return "GARMENT"
    return "OTHER"

def itachi_classify(h, s, v):
    # Itachi: black Akatsuki cloak = GARMENT; red clouds = ACCENT; black hair + skin protected.
    if v < 0.13:                                     return "DARK"
    if (h <= 12 or h >= 345) and s >= 0.5:            return "ACCENT"   # red clouds
    if 8 <= h <= 40 and 0.25 <= s < 0.65 and v >= 0.45:  return "SKIN"
    if 0.13 <= v < 0.5 and s < 0.5:                  return "GARMENT"  # dark cloak
    return "OTHER"

def obito_classify(h, s, v):
    # Obito: dark cloak/outfit = GARMENT; red clouds = ACCENT; black hair + skin protected.
    if v < 0.13:                                     return "DARK"
    if (h <= 12 or h >= 345) and s >= 0.5:            return "ACCENT"
    if 8 <= h <= 40 and 0.25 <= s < 0.65 and v >= 0.45:  return "SKIN"
    if 0.13 <= v < 0.5 and s < 0.5:                  return "GARMENT"
    return "OTHER"

def tobi_classify(h, s, v):
    # Tobi (masked): black Akatsuki cloak = GARMENT; orange spiral mask kept; red clouds = ACCENT.
    if v < 0.13:                                     return "DARK"
    if 12 <= h <= 44 and s >= 0.5 and v >= 0.4:       return "OTHER"    # orange mask (kept)
    if (h <= 10 or h >= 346) and s >= 0.55:           return "ACCENT"   # red clouds
    if 0.13 <= v < 0.5 and s < 0.5:                  return "GARMENT"
    return "OTHER"

def six_paths_pain_classify(h, s, v):
    # Six Paths Pain: black Akatsuki cloak = GARMENT; ORANGE hair kept; red clouds = ACCENT; skin protected.
    if v < 0.13:                                     return "DARK"
    if 12 <= h <= 44 and s >= 0.4 and v >= 0.45:      return "OTHER"    # orange hair (kept)
    if (h <= 10 or h >= 346) and s >= 0.55:           return "ACCENT"
    if 0.13 <= v < 0.5 and s < 0.5:                  return "GARMENT"
    return "OTHER"

def madara_classify(h, s, v):
    # Madara: dark-red battle armour = GARMENT; black hair + skin protected.
    if v < 0.13:                                     return "DARK"
    if 8 <= h <= 40 and 0.25 <= s < 0.6 and v >= 0.5:  return "SKIN"
    if (h <= 20 or h >= 330) and s >= 0.4:            return "GARMENT"  # red armour
    return "OTHER"

def hashirama_classify(h, s, v):
    # Hashirama: red First-Hokage armour = GARMENT; skin + dark hair protected.
    if v < 0.13:                                     return "DARK"
    if 8 <= h <= 40 and 0.25 <= s < 0.6 and v >= 0.5:  return "SKIN"
    if (h <= 20 or h >= 328) and s >= 0.4:            return "GARMENT"  # red armour
    return "OTHER"

def tobirama_classify(h, s, v):
    # Tobirama: blue-grey Second-Hokage armour = GARMENT; white hair + skin protected.
    if v < 0.13:                                     return "DARK"
    if 8 <= h <= 40 and 0.25 <= s < 0.6 and v >= 0.5:  return "SKIN"
    if 185 <= h <= 250 and s >= 0.3:                  return "GARMENT"  # blue armour
    return "OTHER"                                                     # white hair kept

def hiruzen_classify(h, s, v):
    # Hiruzen: dark battle-armour/robe = GARMENT; skin + dark hair protected.
    if v < 0.13:                                     return "DARK"
    if 8 <= h <= 40 and 0.25 <= s < 0.6 and v >= 0.5:  return "SKIN"
    if 0.13 <= v < 0.52 and s < 0.5:                 return "GARMENT"
    return "OTHER"

def boruto_classify(h, s, v):
    # Boruto: black tracksuit jacket + pants = GARMENT; red collar = ACCENT; blond hair + skin protected.
    if v < 0.12:                                     return "DARK"
    if 12 <= h <= 52 and s >= 0.28 and v >= 0.45:     return "SKIN"     # blond hair + face
    if (h <= 12 or h >= 328) and s >= 0.5 and v >= 0.38:  return "ACCENT"  # red collar
    if 0.12 <= v < 0.55 and s < 0.55:                return "GARMENT"  # black tracksuit
    return "OTHER"

def minato_classify(h, s, v):
    # Minato: dark under-uniform + white/cream Hokage haori = GARMENT; red flame hem = ACCENT; blond hair +
    # skin protected.
    if v < 0.15:                                     return "DARK"
    if 40 <= h <= 58 and s >= 0.45 and v >= 0.6:      return "OTHER"    # blond hair (kept)
    if 10 <= h <= 40 and 0.25 <= s < 0.7 and v >= 0.5:  return "SKIN"   # face
    if (h <= 12 or h >= 344) and s >= 0.5:            return "ACCENT"   # red flame hem
    if (s < 0.18 and v >= 0.55) or (0.15 <= v < 0.5 and s < 0.5):  return "GARMENT"  # white haori + dark uniform
    return "OTHER"

def isshiki_classify(h, s, v):
    # Isshiki: white/grey Otsutsuki coat = GARMENT; red lining = ACCENT; grey skin + dark horns/hair protected.
    if v < 0.15:                                     return "DARK"
    if (h <= 12 or h >= 344) and s >= 0.55:           return "ACCENT"   # red lining
    if s < 0.22 and v >= 0.45:                        return "GARMENT"  # white/grey coat
    return "OTHER"                                                     # brown pants + grey skin kept

def orochimaru_classify(h, s, v):
    # Orochimaru: grey/purple robe = GARMENT; pale skin protected; long black hair protected; purple rope = accent.
    if v < 0.15:                                     return "DARK"
    if 10 <= h <= 45 and 0.12 <= s < 0.4 and v >= 0.6:  return "SKIN"   # pale skin (slight warm tint)
    if 250 <= h <= 300 and s >= 0.35:                 return "ACCENT"   # purple rope
    if (200 <= h <= 300 or s < 0.22) and 0.2 <= v < 0.72:  return "GARMENT"  # grey/purple robe
    return "OTHER"

def onoki_classify(h, s, v):
    # Onoki: green Tsuchikage haori = GARMENT; red inner = ACCENT; skin + tan/gold kept; dark outline protect.
    if v < 0.15:                                     return "DARK"
    if 85 <= h <= 155 and s >= 0.35:                  return "GARMENT"  # green haori
    if (h <= 12 or h >= 344) and s >= 0.5:            return "ACCENT"   # red inner
    return "OTHER"

def kiba_classify(h, s, v):
    # Kiba: dark grey/blue hoodie + pants = GARMENT; skin + brown hair protected.
    if v < 0.15:                                     return "DARK"
    if 8 <= h <= 42 and 0.22 <= s < 0.62 and v >= 0.45:  return "SKIN"  # face + brown hair
    if (185 <= h <= 260 or s < 0.32) and 0.15 <= v < 0.55:  return "GARMENT"  # dark hoodie/pants
    return "OTHER"

def gojo_classify(h, s, v):
    # Gojo: dark JJK uniform = GARMENT; white blindfold + white hair kept; skin protected.
    if v < 0.15:                                     return "DARK"
    if 8 <= h <= 40 and 0.2 <= s < 0.62 and v >= 0.5:  return "SKIN"
    if 0.15 <= v < 0.52 and s < 0.55:                return "GARMENT"  # dark uniform
    return "OTHER"                                                     # white blindfold + hair kept

def toji_classify(h, s, v):
    # Toji: black tank + pants = GARMENT; pale skin protected; purple sash = ACCENT; dark hair protected.
    if v < 0.15:                                     return "DARK"
    if 260 <= h <= 320 and s >= 0.30:                 return "ACCENT"   # purple sash
    if 6 <= h <= 44 and 0.12 <= s < 0.55 and v >= 0.5:  return "SKIN"   # pale skin
    if 0.15 <= v < 0.5 and s < 0.5:                  return "GARMENT"  # black tank + pants
    return "OTHER"

def naoya_classify(h, s, v):
    # Naoya: white haori + dark-blue hakama = GARMENT; gold trim = ACCENT; skin + dark hair protected.
    if v < 0.15:                                     return "DARK"
    if 8 <= h <= 40 and 0.2 <= s < 0.6 and v >= 0.55 and s >= 0.28:  return "SKIN"  # face (min sat to exclude white)
    if 38 <= h <= 62 and s >= 0.4:                    return "ACCENT"   # gold trim
    if (s < 0.2 and v >= 0.5) or (195 <= h <= 260 and v < 0.55):  return "GARMENT"  # white haori + dark hakama
    return "OTHER"

def maki_classify(h, s, v):
    # Maki: dark blue-teal JJK uniform = GARMENT; skin protected; dark hair/outline protected.
    if v < 0.13:                                     return "DARK"
    if 8 <= h <= 40 and 0.22 <= s < 0.62 and v >= 0.5:  return "SKIN"
    if (168 <= h <= 265 or s < 0.28) and v < 0.55:    return "GARMENT"  # dark blue-teal uniform
    return "OTHER"

def _trivial_classify(h, s, v):
    # For Alien-X-only chars (yuta) — void_paint crushes every region regardless, so classification is moot.
    return "OTHER"

def sukuna_classify(h, s, v):
    # Sukuna: dark blue-black kimono = GARMENT; PINK hair + tan curse-markings + skin protected.
    if v < 0.13:                                     return "DARK"
    if 305 <= h <= 348 and s >= 0.35:                 return "OTHER"    # pink hair (kept)
    if 6 <= h <= 44 and 0.18 <= s < 0.62 and v >= 0.45:  return "SKIN"  # skin + markings
    if (195 <= h <= 265 or s < 0.28) and v < 0.5:     return "GARMENT"  # dark kimono
    return "OTHER"

def alt_sukuna_classify(h, s, v):
    # Alternate (4-armed) Sukuna: mostly-black kimono = GARMENT; pink hair + skin/markings protected.
    if v < 0.12:                                     return "DARK"
    if 305 <= h <= 348 and s >= 0.35:                 return "OTHER"    # pink hair
    if 6 <= h <= 44 and 0.2 <= s < 0.62 and v >= 0.5:  return "SKIN"    # skin + markings
    if v < 0.5 and s < 0.55 and not (h < 40 or h > 300):  return "GARMENT"  # dark kimono (exclude warm/pink)
    return "OTHER"

def aoi_todo_classify(h, s, v):
    # Aoi Todo: dark-blue JJK uniform = GARMENT; large skin region + dark hair protected.
    if v < 0.15:                                     return "DARK"
    if 4 <= h <= 42 and 0.22 <= s < 0.75 and v >= 0.42:  return "SKIN"  # face + big build skin
    if 188 <= h <= 262 and s >= 0.22:                 return "GARMENT"  # blue uniform
    return "OTHER"

def yuji_classify(h, s, v):
    # Yuji: dark JJK uniform = GARMENT; PINK/salmon hair + skin protected; red trim = ACCENT.
    if v < 0.13:                                     return "DARK"
    if 300 <= h <= 345 and s >= 0.30:                 return "OTHER"    # pink/salmon hair (kept)
    if 6 <= h <= 42 and 0.2 <= s < 0.6 and v >= 0.45:  return "SKIN"    # face
    if (h <= 8 or h >= 350) and s >= 0.6:             return "ACCENT"   # red trim
    if (185 <= h <= 262 or s < 0.3) and v < 0.55:     return "GARMENT"  # dark uniform
    return "OTHER"

def handler_classify(h, s, v):
    # Handler (Megumi): blue JJK uniform = GARMENT; black hair + skin protected.
    if v < 0.14:                                     return "DARK"
    if 6 <= h <= 42 and 0.2 <= s < 0.62 and v >= 0.5:  return "SKIN"    # face
    if 200 <= h <= 265 and s >= 0.28:                 return "GARMENT"  # blue uniform
    return "OTHER"

CHARS = {
    "baki":      dict(classify=baki_classify),
    "ichigo":        dict(classify=ichigo_classify),
    "zaraki":        dict(classify=bleach_classify),
    "zaraki_shikai": dict(classify=bleach_classify),
    "mayuri":        dict(classify=bleach_classify),
    "byakuya":       dict(classify=bleach_classify),
    "yamamoto":      dict(classify=bleach_classify),
    "omega_ranger":        dict(classify=omega_ranger_classify, probe_src="omega_ranger_idle.png"),
    "samurai_red_ranger":  dict(classify=samurai_red_classify),
    "gold_samurai_ranger": dict(classify=samurai_gold_classify),
    "green_samurai_ranger":dict(classify=samurai_green_classify),
    "red_ranger_mmpr":     dict(classify=red_mmpr_classify),
    "ghostface":     dict(classify=ghostface_classify),
    "ghostface_exe": dict(classify=ghostface_classify),
    "jason":         dict(classify=jason_classify),
    "netero":     dict(classify=netero_classify),
    "killua":     dict(classify=killua_classify),
    "gon":        dict(classify=gon_classify),
    "hisoka":     dict(classify=hisoka_classify),
    "chrollo":    dict(classify=chrollo_classify),
    "spiderman":  dict(classify=spiderman_classify),
    "miles":      dict(classify=miles_classify),
    "iron_man":   dict(classify=ironman_classify),
    "iron_man_2": dict(classify=ironman_classify),
    "iron_man_3": dict(classify=ironman_classify),
    "superman":         dict(classify=superman_classify),
    "superman_dcuc":    dict(classify=superman_classify),
    "superman_new52":   dict(classify=superman_classify),
    "superman_classic": dict(classify=superman_classify),
    "superman_fighter": dict(classify=superman_classify),
    "flash":            dict(classify=flash_classify),
    "deathstroke":      dict(classify=deathstroke_classify),
    "brainiac":         dict(classify=brainiac_classify),
    "green_lantern":    dict(classify=green_lantern_classify),
    "batman":           dict(classify=batman_classify),
    "dark_knight":      dict(classify=dark_knight_classify),
    "itachi":     dict(classify=itachi_classify),
    "obito":      dict(classify=obito_classify),
    "tobi":       dict(classify=tobi_classify),
    "six_paths_pain": dict(classify=six_paths_pain_classify),
    "madara":     dict(classify=madara_classify),
    "hashirama":  dict(classify=hashirama_classify),
    "tobirama":   dict(classify=tobirama_classify),
    "hiruzen":    dict(classify=hiruzen_classify),
    "boruto":     dict(classify=boruto_classify),
    "pain":       dict(classify=_trivial_classify),
    "minato":     dict(classify=minato_classify),
    "isshiki":    dict(classify=isshiki_classify),
    "orochimaru": dict(classify=orochimaru_classify),
    "onoki":      dict(classify=onoki_classify),
    "kiba":       dict(classify=kiba_classify),
    "gojo":       dict(classify=gojo_classify),
    "toji":       dict(classify=toji_classify),
    "naoya":      dict(classify=naoya_classify),
    "maki":       dict(classify=maki_classify),
    "yuta":       dict(classify=_trivial_classify),
    "sukuna":     dict(classify=sukuna_classify),
    "alt_sukuna": dict(classify=alt_sukuna_classify),
    "aoi_todo":   dict(classify=aoi_todo_classify),
    "yuji":       dict(classify=yuji_classify),
    "handler":    dict(classify=handler_classify),
    "zenitsu":   dict(classify=zenitsu_classify),
    "rengoku":   dict(classify=rengoku_classify),
    "shinobu":   dict(classify=shinobu_classify),
    "inosuke":   dict(classify=inosuke_classify),
    "nezuko":    dict(classify=nezuko_classify),
    "gohan":     dict(classify=gohan_classify),
    "goku_black": dict(classify=goku_black_classify),
    "vegeta_dark": dict(classify=vegeta_dark_classify),
    "piccolo":   dict(classify=piccolo_classify),
    "frieza":    dict(classify=frieza_classify),
    "beerus":    dict(classify=beerus_classify, probe_src="beerus_idle_u.png"),
    "vegito":    dict(classify=vegito_classify),
    "gotenks":   dict(classify=gotenks_classify),
    "bardock":   dict(classify=bardock_classify),
    "vegeta":    dict(classify=vegeta_classify),
    "goku":      dict(classify=goku_classify),
    "naruto":    dict(classify=naruto_classify),
    "sasuke":    dict(classify=sasuke_classify),
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
