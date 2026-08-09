#!/usr/bin/env python3
"""Reslice raw Obito sprite strips into uniform equal-cell "_uniform" sheets.

Modeled on reslice_inosuke.py. The raw uploads (obito_melee_*.png) have variable
frame widths and irregular horizontal gaps; the engine slices every action strip
into N equal cells of a fixed width. So we detect content islands per column,
then repack each island into a uniform grid: centered-X, sharing one vertical
extent across the whole strip (single baseline) so feet stay planted under
anchorY:0 while jump-rise / crouch-dip motion inside a strip is preserved.

Adds a per-job min-width filter (kills stray debris islands like the 3px speck
in fall_to_jump_up).

USAGE:  python3 tools/reslice_obito.py [stage1]
"""
import sys, json
from PIL import Image
import numpy as np

ALPHA = 16          # alpha threshold for "content"
GAP = 4             # columns of empty space that separate frames
XPAD = 3            # horizontal padding inside each cell
YPAD_TOP = 2        # padding above tallest content
YPAD_BOT = 1        # padding below baseline


def detect_islands(alpha, min_w=1):
    cols = (alpha > ALPHA).sum(axis=0)
    occ = cols > 0
    runs, s = [], None
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
    return [r for r in merged if (r[1] - r[0] + 1) >= min_w]


def reslice(path, out, expect=None, min_w=1, force_even=0):
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    alpha = arr[:, :, 3]
    if force_even:
        # Gutter detection FAILS when a pose extends a long horizontal element (Obito's
        # rod thrust) that bridges the inter-frame gap → two poses merge into one wide
        # island. For those strips, split into N equal-width columns instead.
        step = im.width / force_even
        islands = [[round(i * step), round((i + 1) * step) - 1] for i in range(force_even)]
    else:
        islands = detect_islands(alpha, min_w)
    if expect and len(islands) != expect:
        print(f"  !! {path}: detected {len(islands)} islands, expected {expect}")

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


# Stage 1 — movement / state.  (src, dst, expected_frames, min_w)
JOBS1 = [
    ("obito_melee_idle.png",             "obito_idle_uniform.png",          5, 1),
    ("obito_melee_run.png",              "obito_run_uniform.png",           6, 1),
    ("obito_melee_jump.png",             "obito_jump_uniform.png",          3, 1),
    ("obito_melee_fall_to_jump_up.png",  "obito_fall_uniform.png",          8, 8),  # drop the 3px speck
    ("obito_melee_dash.png",             "obito_dash_uniform.png",          3, 1),
    ("obito_melee_back_dash.png",        "obito_back_dash_uniform.png",     1, 1),
    ("obito_melee_crouch.png",           "obito_crouch_uniform.png",        3, 1),
    ("obito_melee_block.png",            "obito_block_uniform.png",         1, 1),
    ("obito_melee_block_air.png",        "obito_block_air_uniform.png",     1, 1),
    ("obito_melee_taking_damage_1.png",  "obito_hit1_uniform.png",          2, 1),
    ("obito_melee_taking_damage_2.png",  "obito_hit2_uniform.png",          3, 1),
    ("obito_melee_taking_damage_3.png",  "obito_hit3_uniform.png",          2, 1),
    ("obito_melee_taking_damage_4.png",  "obito_hit4_uniform.png",          2, 1),
]

# Stage 2 — basic normals + the hit_1/2/3 command-chain.  (src, dst, expected_frames, min_w, force_even)
# Role-named (NOT hitN — those are the Stage-1 taking_damage sheets). The hit_1/2/3
# ground-combo files double as the 3-hit command-normal rekka (light/heavy/air poses).
# heavy (hit_2) needs force_even=5: its rod-thrust pose bridges a gutter and fools
# island detection into merging two frames.
JOBS2 = [
    ("obito_melee_hit_1.png",             "obito_light_uniform.png",    6, 8, 0),   # light + chain step 1
    ("obito_melee_hit_2.png",             "obito_heavy_uniform.png",    5, 8, 5),   # heavy + chain step 2 (rod thrust → even split)
    ("obito_melee_hit_3:up_attack.png",   "obito_air_uniform.png",      5, 8, 0),   # airAttack + chain step 3 (finisher)
    ("obito_melee_up_attack.png",         "obito_up_uniform.png",       6, 8, 0),   # up launcher
    ("obito_melee_down_air_attack.png",   "obito_downair_uniform.png",  4, 8, 0),   # down-air
]

# Stage 3 — ranged specials: cast poses + projectile spin sheets.  (src, dst, expect, min_w, force_even)
# The shuriken/giant-shuriken projectiles are 4-frame SPIN animations (the "4 projectile variants").
# shuriken ground cast (hit_2-style) needs force_even=3: the throw pose's extended arm bridges a gutter.
JOBS3 = [
    ("obito_rod_throw.png",                       "obito_rodcast_uniform.png",        4, 8, 0),   # rod-throw cast (4f)
    ("obito_rod_throwprojectile.png.png",         "obito_rod_proj_uniform.png",       1, 1, 0),   # rod projectile (1f)
    ("obito_melee_shuriken_throw.png",            "obito_shurcast_uniform.png",       3, 8, 3),   # shuriken GROUND cast (3f, even split)
    ("obito_melee_shuriken_throw_air.png",        "obito_shurcast_air_uniform.png",   4, 8, 0),   # shuriken AIR cast (4f)
    ("obito_melee_shuriken_projectile.png.png",   "obito_shur_proj_uniform.png",      4, 4, 0),   # shuriken projectile — 4 spin frames
    ("obito_melee_giant_shurikan.png",            "obito_giantshur_proj_uniform.png", 4, 4, 0),   # giant shuriken — 4 spin frames
]

# Stage 5 — Kamui blink pose (speed-tier teleport + self-portal).  (src, dst, expect, min_w, force_even)
JOBS5 = [
    ("obito_melee_teleport_transparent.png", "obito_teleport_uniform.png", 6, 8, 0),   # 6-frame Kamui blink pose
]

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "stage1"
    jobs = {"stage1": JOBS1, "stage2": JOBS2, "stage3": JOBS3, "stage5": JOBS5}.get(arg, JOBS1)
    meta = {}
    for job in jobs:
        src, dst, n, mw = job[0], job[1], job[2], job[3]
        fe = job[4] if len(job) > 4 else 0
        key = dst.replace("obito_", "").replace("_uniform.png", "")
        meta[key] = reslice(src, dst, n, mw, fe)
    print(json.dumps(meta, indent=2))
