#!/usr/bin/env python3
"""Yuta Okkotsu (Jujutsu Kaisen) — 6 themed alt-skins + 1 Alien-X-style Void skin (= 7, + Default = 8).

OWNER DECISIONS (2026-08-18, confirmed after a pixel health-check of yuta_idle_uniform.png):
  (1) DROP all decals/emblems/wrist-icons — pure colour remap only (Ben's green stripe + "10", Valkyrie's
      gold "V", Kukulkan serpent lines, Omnitrix wrist icons are DRAWN marks the recolor pipeline can't add).
  (2) UNIFORM-PRIMARY + ACCENT region plan — the white uniform is the sole primary colour (sneakers fold in,
      they share the same white → can't separate); the katana red handle-wrap + gold tsuba are the accent/trim.
  (3) KEEP Spriggan + Zeus as substitutes for the unidentified "Ark Balkesh".

HEALTH-CHECK FINDINGS (histogram of real opaque pixels — the prompt's Section 0 was broadly CORRECT this time):
  * WHITE UNIFORM  = a large neutral mass (s<~0.18, v 0.36–1.0). THE PRIMARY recolour region. White SNEAKERS
    share this white → they follow the uniform colour (two white regions are not colour-separable). FLAGGED.
  * BLACK          = hair + slender pants + line-art OUTLINE are ONE inseparable near-black (v<0.36 neutral).
    PROTECTED → pants & hair STAY DARK on every skin (can't isolate pants from the outline). FLAGGED.
  * SKIN           = warm face/hands (h 6–45, s>=0.20, v>=0.45). PROTECTED (never recoloured), per methodology.
  * RED  (accent)  = the katana handle-wrap (h<=14 | h>=344, s>=0.45) — a real ~285px region. Recolourable.
  * GOLD (trim)    = the katana tsuba (40<=h<=66, s>=0.45, v>=0.45) — small. Recolourable.
  * OTHER          = cursed-energy FX (cyan/green glows on cem/kick4/speech sheets) → LEFT UNTOUCHED (effect
    colours, not costume). Falls through to OTHER on purpose.

paint(): re-centre a region on the target hue/value while preserving its own light/dark SPREAD (folds survive).
Cosmetic only. Hair tints requested by the prompt (e.g. Valkyrie purple streak) are NOT possible (hair = the
protected black region) → dropped; each skin = uniform colour + katana accent/trim.

USAGE: gen_yuta_creative.py [probe|preview|all|<tag>]   # default: all
  probe   -> yuta_skin_mask_debug.png (regions tinted) + region counts, to verify classification
  preview -> recolor idle per skin + yuta_skins_preview.png montage (no full batch)
  all     -> recolor EVERY animationData sheet + portrait for all 7 skins
"""
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Every UNIQUE uniform sheet in Yuta's animationData (run/dash=walk, jump/fall=idle are reuses → not separate
# files; recolouring walk/idle covers them). Recoloured per skin as sheet__<tag>.png.
SHEETS = [
    "yuta_idle_uniform.png", "yuta_walk_uniform.png", "yuta_crouch_uniform.png", "yuta_guard_uniform.png",
    "yuta_hurt_uniform.png", "yuta_knockdown_uniform.png", "yuta_getup_uniform.png",
    "yuta_light_uniform.png", "yuta_heavy_uniform.png", "yuta_up_uniform.png", "yuta_air_uniform.png",
    "yuta_combo2_uniform.png", "yuta_combo3_uniform.png",
    "yuta_cem_uniform.png", "yuta_strong_uniform.png", "yuta_kick4_uniform.png", "yuta_speech_uniform.png",
    "yuta_rct_uniform.png", "yuta_ultcast_uniform.png", "yuta_win_uniform.png",
]

def classify(h, s, v):
    if v < 0.12:                                    return "DARK"    # deep black (outline/hair/pants core)
    if s < 0.22 and v < 0.36:                       return "DARK"    # dark neutral cloth (pants/hair mid-tone)
    if (h <= 14 or h >= 344) and s >= 0.45 and v >= 0.16: return "REDACC"  # katana handle-wrap
    if 40 <= h <= 66 and s >= 0.45 and v >= 0.45:   return "GOLD"    # katana tsuba
    if 6 <= h <= 45 and s >= 0.20 and v >= 0.45:    return "SKIN"    # warm face/hands  (PROTECTED)
    if s < 0.30 and v >= 0.36:                      return "JACKET"  # white uniform + sneakers (PRIMARY)
    return "OTHER"                                                   # cursed-energy FX etc. (untouched)

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, spec):
    """spec = (hex, to_sat, floor, spread) or None (keep). to-tone re-centre preserving spread."""
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
    """Alien-X void: crush a region to near-black, keeping only a whisper of its own shading spread."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, max(g, round(g * 1.14)), px[x, y][3])   # faint cool tint

# each region tuple = (hex, to_sat, floor, spread);  None = keep original. jacket = primary uniform colour.
SKINS = {
    "ben10":     dict(jacket=("#3FA82E", 0.66, 0.16, 1.12), redacc=("#3FA82E", 0.62, 0.18, 1.05), gold=("#F0F0F0", 0.03, 0.55, 1.05),
                      note="Omnitrix-green uniform / green katana accent / white trim — green promoted to whole uniform (stripe+'10' decal dropped)"),
    "albedo":    dict(jacket=("#141414", 0.05, 0.05, 1.10), redacc=("#B8242E", 0.72, 0.20, 1.08), gold=("#5C5C5C", 0.04, 0.30, 1.08),
                      note="black uniform / red katana accent / grey trim — Ben's palette inverted (negative counterpart; jacket panels decal dropped)"),
    "valkyrie":  dict(jacket=("#8FC9E0", 0.30, 0.42, 1.16), redacc=("#D6A82E", 0.70, 0.26, 1.10), gold=("#D6A82E", 0.66, 0.40, 1.10),
                      note="light-blue armour uniform / gold katana accent+trim (V-emblem nod) — purple hair-streak dropped (hair = protected black)"),
    "kukulkan":  dict(jacket=("#3A2A52", 0.52, 0.12, 1.14), redacc=("#2E8C6B", 0.60, 0.20, 1.08), gold=("#2E8C6B", 0.58, 0.36, 1.10),
                      note="deep purple-black uniform / jade feathered-serpent accent+trim (Mesoamerican deity theme; serpent-line decal dropped)"),
    "spriggan":  dict(jacket=("#9E2028", 0.66, 0.14, 1.15), redacc=("#141414", 0.05, 0.05, 1.05), gold=("#C98A3D", 0.58, 0.32, 1.10),
                      note="deep-red dragon uniform / black katana accent / bronze trim — Beyblade substitute for 'Ark Balkesh'"),
    "zeus":      dict(jacket=("#F2E6C0", 0.18, 0.50, 1.14), redacc=("#D6A82E", 0.72, 0.28, 1.10), gold=("#D6A82E", 0.70, 0.42, 1.10),
                      note="regal ivory-gold god-king uniform / gold katana accent+trim — Beyblade substitute for 'Ark Balkesh'"),
    "voidsovereign": dict(void=True,
                      note="full-black cursed silhouette + game.js drawYutaVoidAuraOverlay (slow cursed-energy wisps + Rika shadow-tendril motif + glowing eyes)"),
}

DISPLAY = {
    "ben10": "Ben 10", "albedo": "Albedo", "valkyrie": "Valkyrie", "kukulkan": "Kukulkan",
    "spriggan": "Spriggan", "zeus": "Zeus", "voidsovereign": "Void Sovereign",
}
ORDER = ["ben10", "albedo", "valkyrie", "kukulkan", "spriggan", "zeus", "voidsovereign"]

def _regions(im):
    px = im.load(); W, H = im.size
    reg = {k: [] for k in ("DARK", "SKIN", "REDACC", "GOLD", "JACKET", "OTHER")}
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
        for k in ("SKIN", "REDACC", "GOLD", "JACKET", "OTHER"):
            void_paint(px, reg[k])
        void_paint(px, reg["DARK"])
    else:
        paint(px, reg["JACKET"], spec.get("jacket"))
        paint(px, reg["REDACC"], spec.get("redacc"))
        paint(px, reg["GOLD"],   spec.get("gold"))
    im.save(os.path.join(ROOT, out))

def make_portrait(tag):
    im = Image.open(os.path.join(ROOT, "yuta_portrait.png")).convert("RGBA")
    px, reg = _regions(im)
    spec = SKINS[tag]
    if spec.get("void"):
        for k in ("SKIN", "REDACC", "GOLD", "JACKET", "OTHER", "DARK"): void_paint(px, reg[k])
    else:
        paint(px, reg["JACKET"], spec.get("jacket")); paint(px, reg["REDACC"], spec.get("redacc")); paint(px, reg["GOLD"], spec.get("gold"))
    im.save(os.path.join(ROOT, f"yuta_portrait__{tag}.png"))

def _bust(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0); x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1))

def probe():
    im = Image.open(os.path.join(ROOT, "yuta_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"DARK": (0, 0, 0), "SKIN": (255, 190, 130), "REDACC": (255, 30, 30),
            "GOLD": (255, 220, 0), "JACKET": (60, 90, 255), "OTHER": (255, 0, 255)}
    dbg = Image.new("RGBA", im.size, (40, 40, 40, 255)); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    dbg.save(os.path.join(ROOT, "yuta_skin_mask_debug.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("→ yuta_skin_mask_debug.png  (blue=JACKET red=REDACC gold=GOLD skin=SKIN black=DARK magenta=OTHER)")

def preview():
    tiles = [("Default", _bust("yuta_idle_uniform.png"))]
    for tag in ORDER:
        recolor("yuta_idle_uniform.png", f"yuta_idle_uniform__{tag}.png", tag)
        tiles.append((DISPLAY[tag], _bust(f"yuta_idle_uniform__{tag}.png")))
    cols = 4; cw, ch = 130, 160; lblh = 16
    rows = (len(tiles) + cols - 1) // cols
    mont = Image.new("RGBA", (cols * cw, rows * (ch + lblh)), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, cell) in enumerate(tiles):
        cx, cy = (i % cols) * cw, (i // cols) * (ch + lblh)
        sc = min(cw / cell.width, ch / cell.height)
        rs = cell.resize((max(1, int(cell.width * sc)), max(1, int(cell.height * sc))), Image.NEAREST)
        mont.alpha_composite(rs, (cx + (cw - rs.width) // 2, cy + (ch - rs.height)))
        d.text((cx + 4, cy + ch + 2), name, fill=(230, 230, 235, 255), font=font)
    mont.save(os.path.join(ROOT, "yuta_skins_preview.png"))
    print(f"→ yuta_skins_preview.png  ({len(tiles)} tiles)")

def batch_all():
    for tag in ORDER:
        for s in SHEETS:
            recolor(s, s.replace(".png", f"__{tag}.png"), tag)
        make_portrait(tag)
        print(f"OK {tag}: {len(SHEETS)} sheets + portrait")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "probe":     probe()
    elif mode == "preview": preview()
    elif mode == "all":     batch_all()
    elif mode in SKINS:
        for s in SHEETS: recolor(s, s.replace(".png", f"__{mode}.png"), mode)
        make_portrait(mode); print(f"OK {mode}")
    else: print(f"unknown mode: {mode}")
