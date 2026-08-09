#!/usr/bin/env python3
"""Reslice raw Inosuke sprite strips into uniform equal-cell "_uniform" sheets.

The raw uploads have variable frame widths and irregular horizontal gaps. The
engine (sprite.js) slices every action strip into N equal cells of a fixed
width. So we detect content islands per column, then repack each island into a
uniform grid.

KEY: horizontal position is normalized (each frame centered in its cell) but the
VERTICAL position of each frame is preserved relative to a single shared
baseline computed across the whole strip. That keeps feet planted for grounded
poses and preserves the jump rise / crouch dip that lives in the source art.
Feet-anchoring in the engine (anchorY:0) plants the bottom of the cell, so a
consistent baseline across frames is what we want.
"""
import sys, json
from PIL import Image
import numpy as np

ALPHA = 16          # alpha threshold for "content"
GAP = 4             # columns of empty space that separate frames
XPAD = 3            # horizontal padding inside each cell
YPAD_TOP = 2        # padding above tallest content
YPAD_BOT = 1        # padding below baseline


def detect_islands(alpha):
    cols = (alpha > ALPHA).sum(axis=0)
    occ = cols > 0
    runs = []
    s = None
    for x, v in enumerate(occ):
        if v and s is None:
            s = x
        if not v and s is not None:
            runs.append([s, x - 1]); s = None
    if s is not None:
        runs.append([s, len(occ) - 1])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] <= GAP:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return merged


def reslice(path, out, expect=None):
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    alpha = arr[:, :, 3]
    islands = detect_islands(alpha)
    if expect and len(islands) != expect:
        print(f"  !! {path}: detected {len(islands)} islands, expected {expect}")

    # Shared vertical extent across the whole strip (single baseline).
    rows = (alpha > ALPHA).sum(axis=1)
    ys = np.where(rows > 0)[0]
    top, bot = int(ys.min()), int(ys.max())
    top = max(0, top - YPAD_TOP)
    bot = min(im.height - 1, bot + YPAD_BOT)
    cell_h = bot - top + 1

    widths = [x1 - x0 + 1 for x0, x1 in islands]
    cell_w = max(widths) + XPAD * 2

    n = len(islands)
    sheet = Image.new("RGBA", (cell_w * n, cell_h), (0, 0, 0, 0))
    for i, (x0, x1) in enumerate(islands):
        frame = im.crop((x0, top, x1 + 1, bot + 1))
        fw = x1 - x0 + 1
        dx = i * cell_w + (cell_w - fw) // 2
        sheet.paste(frame, (dx, 0), frame)

    sheet.save(out)
    print(f"  {out}: {n} frames  cell {cell_w}x{cell_h}  (from {im.size})")
    return {"frames": n, "width": cell_w, "height": cell_h}


JOBS = [
    ("inosuke_idle.png",  "inosuke_idle_uniform.png",  5),
    ("inosuke_dash.png",  "inosuke_dash_uniform.png",  5),
    ("inosuke_dodge.png", "inosuke_dodge_uniform.png", 3),
    ("inosuke_jump.png",  "inosuke_jump_uniform.png",  4),
    ("inosuke_hit.png",   "inosuke_hit_uniform.png",   6),
    ("inosuke_taunt.png", "inosuke_taunt_uniform.png", 3),
]

# Stage 2 — normals + command-chain flurry.
JOBS2 = [
    ("inosuke_foward_double_slash.png",   "inosuke_light_uniform.png",   3),  # light
    ("inosuke_right_foward_slash.png",    "inosuke_heavy_uniform.png",   4),  # heavy
    ("inosuke_up_attack.png",             "inosuke_up_uniform.png",      3),  # up launcher
    ("inosuke_air_down_attack.png",       "inosuke_airdown_uniform.png", 5),  # air (subset) + down_air (full)
    ("inosuke_down_punch.png",            "inosuke_downheavy_uniform.png", 4),# Down+Heavy cmd normal
    ("inosuke_lundge.png",                "inosuke_b1_uniform.png",      4),  # flurry B1
    ("inosuke_stabbing_foward_slash.png", "inosuke_b2_uniform.png",      3),  # flurry B2
    ("inosuke_upclose_slashes.png",       "inosuke_b3_uniform.png",      3),  # flurry B3
    ("inosuke_dash_double_slash.png",     "inosuke_b4_uniform.png",      4),  # flurry B4
    ("inosuke_running_slashes.png",       "inosuke_b5_uniform.png",      4),  # flurry B5
]

# Stage 5 — cinematic specials.
JOBS5 = [
    ("inosuke_cenematic_specail_1.png",                    "inosuke_cine1_uniform.png",     6),  # spin slash
    ("inosuke_cenematic_specail_2_dash_thrust.png",        "inosuke_cine2_uniform.png",     5),  # dash thrust
    ("inosuke_cenematic_specail_4_slashing_lunge_fan.png", "inosuke_cine4_uniform.png",     4),  # slashing lunge fan
]

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    jobs = {"stage2": JOBS2, "stage5": JOBS5}.get(arg, JOBS)
    meta = {}
    for src, dst, n in jobs:
        key = dst.replace("inosuke_", "").replace("_uniform.png", "")
        meta[key] = reslice(src, dst, n)
    print(json.dumps(meta, indent=2))
