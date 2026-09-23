#!/usr/bin/env python3
# gen_omololu_underskin.py — THREE more omololu skins, built on the SAME region split proven by
# gen_omololu_suit_recolor.py (base recolor left brown SKIN + red EYE warm/SATURATED at S>=0.35, and the
# hair/outfit/metal NEUTRAL at S<0.35). Reuses the underskin pipeline's palette intent (tools/
# gen_underskin_recolor.py): a void-crush for Alien X + hue re-centre for the themed skins. Obito + the
# omololu base are NEVER touched (copy-from only). Alpha is preserved byte-for-byte → no keying artifacts
# (the Miles/Kurapika bug class).
#
#   alienx  — Alien X (Ben 10 Celestialsapien): EVERY opaque pixel void-crushed to matte near-black (skin
#             included). The colourful starfield is drawn at RUNTIME by game.js drawAlienXStarfield, gated
#             on skinId ending "AlienX" (id omololuAlienX) — same architecture as every other AlienX skin.
#   ben10   — classic Ben 10 green/black Omnitrix scheme: the neutral hair+outfit becomes Omnitrix GREEN
#             with the darkest folds/outline crushed to black; brown skin + red eye kept.
#   albedo  — Albedo's "Negative" treatment (Ben 10 red-toned inverse): same as ben10 but the body is RED.
#
# Usage: python3 tools/gen_omololu_underskin.py [alienx|ben10|albedo|all] [preview]

import os, sys, colorsys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SHEETS = [
    "idle_uniform", "run_uniform", "dash_uniform", "jump_uniform", "block_uniform",
    "light_uniform", "heavy_uniform", "up_uniform", "air_uniform", "downair_uniform",
    "hit1_uniform", "hit2_uniform", "hit3_uniform", "hit4_uniform",
    "crouch_uniform", "back_dash_uniform", "block_air_uniform",
    "shurcast_uniform", "shurcast_air_uniform", "rodcast_uniform", "teleport_uniform", "kamui_activate_uniform",
    "portrait",
]

KEEP_SAT_MAX = 0.35    # >= this saturation = KEEP (brown skin / red eye); below = neutral hair+outfit region
SEAM_V       = 0.14    # source value below this = crisp BLACK seam / outline
SEAM_OUT_V   = 0.03
BODY_LO      = 0.14    # source value band (the outfit's own narrow dark range) mapped onto the body band
BODY_HI      = 0.28

# themed body: (hue 0..1, sat, value floor, value top, gamma)
THEMES = {
    "ben10":  (100.0 / 360.0, 0.80, 0.34, 0.78, 0.60),   # Omnitrix green
    "albedo": (357.0 / 360.0, 0.84, 0.30, 0.72, 0.58),   # Negative red
}


def recolor_void(path):
    """Alien X — crush EVERY opaque pixel to matte near-black + a whisper of cool tint (verbatim intent of
    gen_underskin_recolor.void_paint). Skin included: Alien X is fully black."""
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[2]
            nv = max(0.02, min(0.14, 0.03 + v * 0.10))
            gg = round(nv * 255)
            px[x, y] = (gg, gg, max(gg, round(gg * 1.14)), a)   # ALPHA PRESERVED
            n += 1
    img.save(path); return n


def recolor_theme(path, theme):
    """ben10 / albedo — keep warm skin+eye (S>=KEEP_SAT_MAX); recolour the neutral hair+outfit region onto a
    themed hue with the darkest folds crushed to black seams (mirror of the webweave suit's value curve)."""
    hue, sat, floor, top, gamma = theme
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if ss >= KEEP_SAT_MAX:
                continue                                    # KEEP brown skin / red eye
            if vv < SEAM_V:
                nr, ng, nb = colorsys.hsv_to_rgb(hue, 0.0, SEAM_OUT_V)   # black seam / outline
            else:
                v01 = max(0.0, min(1.0, (vv - BODY_LO) / (BODY_HI - BODY_LO)))
                nv = floor + (v01 ** gamma) * (top - floor)
                nr, ng, nb = colorsys.hsv_to_rgb(hue, sat, nv)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)   # ALPHA PRESERVED
            n += 1
    img.save(path); return n


def build(tag, preview=False):
    tiles, total = [], 0
    for s in SHEETS:
        src = os.path.join(ROOT, "omololu_%s.png" % s)
        dst = os.path.join(ROOT, "omololu_%s__%s.png" % (s, tag))
        if not os.path.exists(src):
            print("  MISSING", src); continue
        Image.open(src).convert("RGBA").save(dst)   # copy base → variant, recolour the variant in place
        n = recolor_void(dst) if tag == "alienx" else recolor_theme(dst, THEMES[tag])
        total += n
        if preview:
            tiles.append(Image.open(dst).convert("RGBA"))
    print("  [%s] recoloured px=%d → omololu_*__%s.png" % (tag, total, tag))
    if preview and tiles:
        pad, cols = 6, 6
        tw = max(t.width for t in tiles); th = max(t.height for t in tiles)
        rows = (len(tiles) + cols - 1) // cols
        mont = Image.new("RGBA", (cols * (tw + pad) + pad, rows * (th + pad) + pad), (40, 40, 46, 255))
        for i, t in enumerate(tiles):
            mont.alpha_composite(t, (pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + pad)))
        out = os.path.join(ROOT, "omololu_%s_preview.png" % tag)
        mont.save(out); print("  wrote", out)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    preview = "preview" in sys.argv
    tags = ["alienx", "ben10", "albedo"] if which == "all" else [which]
    for t in tags:
        build(t, preview=preview)
