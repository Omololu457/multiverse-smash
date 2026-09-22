#!/usr/bin/env python3
# gen_omololu_recolor.py — recolor the COPIED obito sheet set (omololu_*.png) toward the
# user's appearance: DARK BROWN skin + short natural near-black 4C hair, keeping Obito's
# outfit/silhouette as the base structure.
#
# Discipline (proven Rick-Prime / under-skin pipeline):
#   • Reads the omololu_*.png COPIES and overwrites them in place. obito_*.png is NEVER
#     read or written here (Stage 1 already made the copies) — omololu is a duplicate-and-
#     modify, not a shared reference.
#   • Per-pixel HSV re-centre that PRESERVES the source's light/dark spread (folds/shading
#     survive) and PRESERVES the alpha channel byte-for-byte (px[...][3] is never rewritten)
#     — this is what avoids the Miles/Kurapika transparency-box / keying-halo bug class.
#   • Pure outline (v<0.12), neutral greys/white (metal, headband), and the olive belt are
#     PROTECTED (classify → None) so edges stay crisp.
#
# Regions (sampled from obito_idle_uniform.png / obito_portrait.png):
#   SKIN   warm hue 7-42°, s>=0.14, v>=0.45   (peach face/hands)         -> dark brown
#   HAIR   purple/navy hue 200-300°, s>=0.20  (spiky hair + dark outfit) -> neutral near-black
#
# The hair and Obito's dark outfit share the same purple-navy tone, so the neutralise pass
# reads them together: hair lands as natural matte black, the outfit as dark charcoal. Only
# COLOUR changes — the recolor cannot reshape the hair silhouette into a 4C coil texture, so
# the close-cropped intent is carried by the near-black matte tone over Obito's base shape.
#
# Usage:
#   python3 tools/gen_omololu_recolor.py            # recolor all omololu_*.png in place
#   python3 tools/gen_omololu_recolor.py preview    # + write omololu_recolor_preview.png montage

import os, sys, colorsys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SHEETS = [
    "idle_uniform", "run_uniform", "dash_uniform", "jump_uniform", "block_uniform",
    "light_uniform", "heavy_uniform", "up_uniform", "air_uniform", "downair_uniform",
    "hit1_uniform", "hit2_uniform", "hit3_uniform", "hit4_uniform",
    "crouch_uniform", "back_dash_uniform", "block_air_uniform", "portrait",
    # Stage-2 kit port: Obito cast / teleport / Kamui-activate poses (recolored for visual consistency).
    "shurcast_uniform", "shurcast_air_uniform", "rodcast_uniform", "teleport_uniform", "kamui_activate_uniform",
]

# --- targets -----------------------------------------------------------------
SKIN_HEX   = "#6B4326"   # rich dark-brown skin midtone (H~26 S~0.65 V~0.42)
SKIN_SAT   = 0.60
SKIN_SPREAD = 0.95       # keep almost all of the skin's shading gradient
SKIN_FLOOR = 0.06

HAIR_VSHIFT = 0.88       # hair/outfit: keep brightness (silhouette) but nudge a touch darker
HAIR_SAT    = 0.07       # crush the purple to near-neutral
HAIR_HUE    = 25.0       # residual is a warm matte black, not cold blue-black


def _hex(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def classify(h, s, v):
    """h in degrees [0,360). Returns 'SKIN' | 'HAIR' | None (protected)."""
    if v < 0.12:              return None          # pure outline — protect (crisp edges)
    if s < 0.14:              return None          # neutral grey / white (metal, headband)
    if 7 <= h <= 42 and s >= 0.14 and v >= 0.45:
        return "SKIN"                              # warm peach face/hands
    if 200 <= h <= 300 and s >= 0.20:
        return "HAIR"                              # purple-navy spiky hair + dark outfit
    return None                                    # olive belt & everything else — protect


def recolor_sheet(path):
    img = Image.open(path).convert("RGBA")
    px = img.load()
    W, H = img.size
    skin_pts, hair_pts = [], []
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            cls = classify(hh * 360, ss, vv)
            if cls == "SKIN":  skin_pts.append((x, y, vv))
            elif cls == "HAIR": hair_pts.append((x, y, vv))

    # SKIN: pivot re-centre onto the brown target, preserving spread + alpha.
    tr, tg, tb = _hex(SKIN_HEX)
    th, _ts, tv = colorsys.rgb_to_hsv(tr / 255, tg / 255, tb / 255)
    if skin_pts:
        pivot = sum(v for (_x, _y, v) in skin_pts) / len(skin_pts)
        for (x, y, v) in skin_pts:
            nv = max(SKIN_FLOOR, min(1.0, tv + (v - pivot) * SKIN_SPREAD))
            nr, ng, nb = colorsys.hsv_to_rgb(th, SKIN_SAT, nv)
            a = px[x, y][3]
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)

    # HAIR/outfit: desaturate purple -> warm near-black, scale value per-pixel (keep shading).
    hhue = HAIR_HUE / 360.0
    for (x, y, v) in hair_pts:
        nv = max(0.03, min(1.0, v * HAIR_VSHIFT))
        nr, ng, nb = colorsys.hsv_to_rgb(hhue, HAIR_SAT, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)

    img.save(path)
    return len(skin_pts), len(hair_pts), W * H


def build(preview=False):
    tiles = []
    total_skin = total_hair = 0
    for s in SHEETS:
        p = os.path.join(ROOT, "omololu_%s.png" % s)
        if not os.path.exists(p):
            print("  MISSING", p); continue
        ns, nh, npx = recolor_sheet(p)
        total_skin += ns; total_hair += nh
        print("  %-20s skin=%-6d hair=%-6d" % (s, ns, nh))
        if preview:
            tiles.append(Image.open(p).convert("RGBA"))
    print("TOTAL skin px=%d  hair px=%d" % (total_skin, total_hair))
    if preview and tiles:
        pad, cols = 6, 6
        tw = max(t.width for t in tiles); tht = max(t.height for t in tiles)
        rows = (len(tiles) + cols - 1) // cols
        mont = Image.new("RGBA", (cols * (tw + pad) + pad, rows * (tht + pad) + pad), (40, 40, 48, 255))
        for i, t in enumerate(tiles):
            cx = pad + (i % cols) * (tw + pad)
            cy = pad + (i // cols) * (tht + pad)
            mont.alpha_composite(t, (cx, cy))
        out = os.path.join(ROOT, "omololu_recolor_preview.png")
        mont.save(out); print("wrote", out)


if __name__ == "__main__":
    build(preview=("preview" in sys.argv))
