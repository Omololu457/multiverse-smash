#!/usr/bin/env python3
"""Add-only recolor SKINS for kakashi_anbu, reusing the PROVEN gen_underskin_recolor.py pipeline
(paint()/void_paint() copied verbatim — same HSV re-centre-preserving-spread). Alpha always preserved.

Regions (classify → SKIN|HAIR|GARMENT|TRIM|ACCENT|DARK|OTHER):
  SKIN    = warm face/hand (protected)
  HAIR    = silver/white spiky hair (low-sat HIGH-value) — kept by default; recolored ONLY if a palette
            defines a `hair` target (so the feminine skin can tint it, but Ben10/Albedo/AlienX keep it).
  GARMENT = dark navy/charcoal bodysuit + black pants (low value)
  TRIM    = grey metallic ANBU armour (chest plate / guards; low-sat MID value)
  ACCENT  = small red bits (eye/spiral)
  DARK    = pure outline (protected)
  OTHER   = everything else (kept)

PALETTES:
  ben10  — black suit / Omnitrix-green armour / white tee (Ben's colours)         [hair kept]
  albedo — black suit / red armour / grey trim (Negative-Ben red+black)           [hair kept = his white hair reads]
  alienx — Alien X void: near-black body; a RED SHARINGAN-TOMOE field is drawn at runtime by game.js
           drawKakashiAnbuTomoeField (skinId-gated) — here we only crush the base to black.
  bloom  — feminine multi-tone: pink hair / lavender suit / sky-blue armour / hot-pink accents (POP)
  hokage — cream-gold tribute: cream suit / gold armour (my creative pick)        [hair kept]

USAGE: gen_recolor.py [probe | <tag> | all]
"""
import os, sys, glob, colorsys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # project root (tools/kakashi_anbu → up 2)

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, spec):
    """Re-centre a region on the target hue/value, preserving its own light/dark SPREAD (verbatim)."""
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
    """Alien-X void: crush to near-black, keeping a whisper of shading + a faint cool tint (verbatim)."""
    for (x, y) in pts:
        v = colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2]
        nv = max(0.02, min(0.14, 0.03 + v * 0.10))
        g = round(nv * 255)
        px[x, y] = (g, g, max(g, round(g * 1.14)), px[x, y][3])

def classify(h, s, v):   # h in DEGREES
    if v < 0.09:                                       return "DARK"     # pure outline
    if s < 0.10 and v > 0.90:                           return "OTHER"   # near-pure white (portrait/illus bg + brightest hair highlights) — KEPT
    if 10 <= h <= 46 and 0.22 <= s < 0.62 and v >= 0.46:  return "SKIN"  # warm face / hand
    if (h <= 14 or h >= 344) and s >= 0.52 and v >= 0.30:  return "ACCENT"  # small red bits (eye/spiral)
    if s < 0.22 and v >= 0.66:                          return "HAIR"    # silver/white spiky hair
    if s < 0.28 and 0.30 <= v < 0.66:                   return "TRIM"    # grey metallic armour
    if v < 0.42:                                        return "GARMENT" # dark navy/charcoal suit + black pants
    return "OTHER"

# (hex, to_sat, floor, spread)
PALETTES = {
    "ben10":  dict(garment=("#121212", 0.05, 0.05, 1.10), trim=("#38B000", 0.82, 0.22, 1.12), accent=("#E8E8E8", 0.03, 0.55, 1.05)),
    "albedo": dict(garment=("#141414", 0.05, 0.05, 1.10), trim=("#B8242E", 0.74, 0.22, 1.10), accent=("#B8242E", 0.74, 0.28, 1.08)),
    "alienx": dict(void=True),
    "bloom":  dict(garment=("#B98FE0", 0.42, 0.40, 1.16), trim=("#8FD0FF", 0.44, 0.44, 1.14), accent=("#FF3FA0", 0.74, 0.40, 1.10), hair=("#FF9ED8", 0.40, 0.55, 1.10)),
    "hokage": dict(garment=("#EAE3CF", 0.14, 0.52, 1.14), trim=("#D6A82E", 0.72, 0.34, 1.12), accent=("#C23B2E", 0.68, 0.34, 1.08)),
}

def _regions(im):
    px = im.load(); W, H = im.size
    reg = {k: [] for k in ("SKIN", "HAIR", "GARMENT", "TRIM", "ACCENT", "DARK", "OTHER")}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            reg[classify(h*360, s, v)].append((x, y))
    return px, reg

def recolor(src, out, tag):
    pal = PALETTES[tag]
    im = Image.open(os.path.join(ROOT, src)).convert("RGBA")
    px, reg = _regions(im)
    if pal.get("void"):
        for k in reg:
            if k == "OTHER": continue   # keep near-pure-white (portrait/illus bg + a whisper of highlight for form)
            void_paint(px, reg[k])
    else:
        paint(px, reg["GARMENT"], pal.get("garment"))
        paint(px, reg["TRIM"],    pal.get("trim"))
        paint(px, reg["ACCENT"],  pal.get("accent"))
        if pal.get("hair"): paint(px, reg["HAIR"], pal["hair"])   # only the feminine skin tints the hair
        # SKIN, DARK, OTHER (and HAIR unless tinted) kept
    im.save(os.path.join(ROOT, out))

def probe():
    im = Image.open(os.path.join(ROOT, "kakashi_anbu_idle_uniform.png")).convert("RGBA")
    px, reg = _regions(im)
    tint = {"SKIN": (255, 190, 130), "HAIR": (120, 255, 120), "GARMENT": (60, 120, 255),
            "TRIM": (255, 215, 0), "ACCENT": (255, 40, 40), "DARK": (0, 0, 0), "OTHER": (255, 0, 255)}
    dbg = im.copy(); dp = dbg.load()
    for k, pts in reg.items():
        for (x, y) in pts: dp[x, y] = (*tint[k], 255)
    # upscale 5x for visibility
    dbg = dbg.resize((dbg.width*5, dbg.height*5), Image.NEAREST)
    dbg.save(os.path.join(ROOT, "tools/kakashi_anbu/_recolor_probe.png"))
    print("region counts:", {k: len(v) for k, v in reg.items()})
    print("-> tools/kakashi_anbu/_recolor_probe.png (skin=peach HAIR=green GARMENT=blue TRIM=gold ACCENT=red DARK=black OTHER=magenta)")

def gen(tags):
    bases = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "kakashi_anbu_*.png")) if "__" not in os.path.basename(p))
    print(f"kakashi_anbu: {len(bases)} base sheets")
    for tag in tags:
        for b in bases: recolor(b, b.replace(".png", f"__{tag}.png"), tag)
        print(f"  {tag}: wrote {len(bases)} sheets")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "probe"
    if mode == "probe": probe()
    elif mode == "all": gen(list(PALETTES.keys()))
    elif mode in PALETTES: gen([mode])
    else: print("modes: probe | all | " + " | ".join(PALETTES))
