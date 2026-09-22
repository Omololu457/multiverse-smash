#!/usr/bin/env python3
# gen_omololu_suit_recolor.py — SECOND omololu skin: a sleek WHITE/BLACK unified bodysuit with black
# seam linework (spider-web-style seams), FACE VISIBLE (no mask), NO emblem. Reads omololu's already-
# recolored BASE sheets and writes `__webweave` variants (recolorSkinAnim naming). The base + Obito are
# never touched.
#
# Region split (sampled from omololu_idle/portrait — the base recolor left SKIN warm+SATURATED and the
# hair/outfit/greys NEUTRAL):
#   KEEP  (untouched): S >= 0.35  → dark-brown face/hands + the red eye stay visible (face open, no mask).
#   SUIT  (remap):     S <  0.35  → the whole neutral hair+outfit+metal region becomes the bodysuit:
#                      a luminance curve pushes it to bright WHITE, with the darkest folds/outline
#                      crushed to crisp BLACK seams — the "unified suit + seam linework" read.
# Alpha is preserved byte-for-byte (no keying artifacts — the Miles/Kurapika bug class).
#
# Usage: python3 tools/gen_omololu_suit_recolor.py [preview]

import os, sys, colorsys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = "webweave"

SHEETS = [
    "idle_uniform", "run_uniform", "dash_uniform", "jump_uniform", "block_uniform",
    "light_uniform", "heavy_uniform", "up_uniform", "air_uniform", "downair_uniform",
    "hit1_uniform", "hit2_uniform", "hit3_uniform", "hit4_uniform",
    "crouch_uniform", "back_dash_uniform", "block_air_uniform",
    "shurcast_uniform", "shurcast_air_uniform", "rodcast_uniform", "teleport_uniform", "kamui_activate_uniform",
    "portrait",
]

# --- suit tuning -------------------------------------------------------------
SUIT_SAT_MAX  = 0.35    # below this saturation = suit (neutral); above = keep (brown skin / red eye)
SEAM_V        = 0.14    # source value below this = crisp BLACK seam / outline (bolder web-lines)
SEAM_OUT_V    = 0.03    # black seam output value
WHITE_LO      = 0.14    # lift band start
WHITE_HI      = 0.26    # source value at/above this = full WHITE
WHITE_FLOOR   = 0.68    # brightness at WHITE_LO (keeps the body cleanly WHITE, sharp vs the black seams)
WHITE_TOP     = 0.99    # brightness at WHITE_HI+
GAMMA         = 0.55
SUIT_SAT      = 0.02    # near-neutral (a whisper of cool so it's not flat)
SUIT_HUE      = 210.0 / 360.0   # faint cool-white


def recolor_sheet(path):
    img = Image.open(path).convert("RGBA")
    px = img.load(); W, H = img.size
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if ss >= SUIT_SAT_MAX:
                continue                                   # KEEP — brown skin / red eye (face visible)
            # SUIT: white body + crisp black seams
            if vv < SEAM_V:
                nv = SEAM_OUT_V
                ns = 0.0
            else:
                v01 = max(0.0, min(1.0, (vv - WHITE_LO) / (WHITE_HI - WHITE_LO)))
                nv = WHITE_FLOOR + (v01 ** GAMMA) * (WHITE_TOP - WHITE_FLOOR)
                ns = SUIT_SAT * (1.0 - v01)                # faint tint fades out toward pure white
            nr, ng, nb = colorsys.hsv_to_rgb(SUIT_HUE, ns, nv)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)   # ALPHA PRESERVED
            n += 1
    img.save(path)
    return n


def build(preview=False):
    tiles = []
    total = 0
    for s in SHEETS:
        src = os.path.join(ROOT, "omololu_%s.png" % s)
        dst = os.path.join(ROOT, "omololu_%s__%s.png" % (s, TAG))
        if not os.path.exists(src):
            print("  MISSING", src); continue
        Image.open(src).convert("RGBA").save(dst)   # copy base → variant, then recolor the variant in place
        n = recolor_sheet(dst)
        total += n
        print("  %-22s suit_px=%d" % (s, n))
        if preview:
            tiles.append(Image.open(dst).convert("RGBA"))
    print("TOTAL suit px=%d  → omololu_*__%s.png" % (total, TAG))
    if preview and tiles:
        pad, cols = 6, 6
        tw = max(t.width for t in tiles); th = max(t.height for t in tiles)
        rows = (len(tiles) + cols - 1) // cols
        mont = Image.new("RGBA", (cols * (tw + pad) + pad, rows * (th + pad) + pad), (70, 70, 78, 255))
        for i, t in enumerate(tiles):
            mont.alpha_composite(t, (pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + pad)))
        out = os.path.join(ROOT, "omololu_webweave_preview.png")
        mont.save(out); print("wrote", out)


if __name__ == "__main__":
    build(preview=("preview" in sys.argv))
