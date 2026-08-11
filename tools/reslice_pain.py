#!/usr/bin/env python3
"""Reslice raw Pain (Nagato's Deva Path) sprite strips into uniform equal-cell
"_uniform" sheets. Modeled on reslice_obito.py.

The raw uploads (pain_*.png) have variable frame widths and irregular horizontal
gaps; the engine slices every action strip into N equal cells of a fixed width.
So we detect content islands per column, then repack each island into a uniform
grid: centered-X, sharing one vertical extent across the whole strip (single
baseline) so feet stay planted under anchorY:0 while jump-rise / knockdown-dip
motion inside a strip is preserved.

USAGE:  python3 tools/reslice_pain.py [stage1|stage2|...]
"""
import sys, json
from PIL import Image
import numpy as np

ALPHA = 16          # alpha threshold for "content"
GAP = 4             # columns of empty space that separate frames
XPAD = 3            # horizontal padding inside each cell
YPAD_TOP = 2        # padding above tallest content
YPAD_BOT = 1        # padding below baseline


def detect_islands(alpha, min_w=1, gap=GAP):
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
        if merged and r[0] - merged[-1][1] <= gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [r for r in merged if (r[1] - r[0] + 1) >= min_w]


def split_wide_islands(islands):
    """Some poses touch (no transparent gutter) so detect_islands returns one
    wide island covering 2+ frames. Split any island wider than ~1.6× the median
    single-pose width into equal sub-cells, so the run cycle slices cleanly
    instead of cutting through the middle of poses (the force_even failure)."""
    widths = sorted(x1 - x0 + 1 for x0, x1 in islands)
    single = widths[len(widths) // 2]          # median = a representative single pose
    out = []
    for x0, x1 in islands:
        w = x1 - x0 + 1
        n = max(1, round(w / single))
        if n == 1:
            out.append([x0, x1]); continue
        step = w / n
        for i in range(n):
            out.append([x0 + round(i * step), x0 + round((i + 1) * step) - 1])
    return out


def reslice(path, out, expect=None, min_w=1, force_even=0, gap=GAP, band=None):
    im = Image.open(path).convert("RGBA")
    if band is not None:
        # Crop a horizontal ROW-band out of a multi-row grid sheet (e.g. the
        # ground_combo compilation) before slicing that row into frames.
        im = im.crop((0, band[0], im.width, band[1] + 1))
    arr = np.array(im)
    alpha = arr[:, :, 3]
    if force_even == "split":
        # gap=1: poses in the run cycle sit <4px apart, so the default GAP=4
        # merge collapses them. Detect at 1px, THEN split the double-wide islands.
        islands = split_wide_islands(detect_islands(alpha, min_w, gap=1))
    elif force_even:
        step = im.width / force_even
        islands = [[round(i * step), round((i + 1) * step) - 1] for i in range(force_even)]
    else:
        islands = detect_islands(alpha, min_w, gap=gap)
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


# Stage 1 — movement / state.  (src, dst, expected_frames, min_w, force_even)
JOBS1 = [
    ("pain_idle.png",      "pain_idle_uniform.png",      4, 1, 0),
    ("pain_run.png",       "pain_run_uniform.png",       8, 1, "split"),  # 6 islands (2 double-wide, touching poses) → split-wide → 8
    ("pain_dash.png",      "pain_dash_uniform.png",      2, 1, 0),
    ("pain_jump.png",      "pain_jump_uniform.png",      4, 1, 0),
    ("pain_block.png",     "pain_block_uniform.png",     1, 1, 0),
    ("pain_hit.png",       "pain_hit_uniform.png",       2, 1, 0),
    ("pain_stand_up.png",  "pain_stand_up_uniform.png",  4, 1, 0),
]

# Stage 2 — basic normals + the Fwd+Heavy command-normal chain.  dict jobs: src/dst/expect + optional gap/min_w/force_even/band.
# Native normals use the INDIVIDUAL sheets; the Fwd+Heavy 3-stage rekka slices the ground_combo
# COMPILATION grid by row (row1=light-spin, row2=up-launcher, row3=unique finisher). light_attack_2 is
# a standalone Fwd+Light command normal. air_combo is an all-duplicate montage (= air_light+air_hard+
# down_air) → NOT resliced here, held as reference (see PAIN_ASSET_MAP notes).
JOBS2 = [
    dict(src="pain_light_attack.png",       dst="pain_light_uniform.png",    expect=5, gap=1, min_w=8),   # spinning kick (drop 1px speck)
    dict(src="pain_black_neddle_attack.png",dst="pain_heavy_uniform.png",    expect=9, gap=1, min_w=6),   # black-rod thrust string (long reach)
    dict(src="pain_up_attack.png",          dst="pain_up_uniform.png",       expect=4, force_even="split"),  # rising launcher
    dict(src="pain_air_light.png",          dst="pain_air_uniform.png",      expect=4, gap=1, min_w=6),   # aerial kick
    dict(src="pain_air_hard_attack.png",    dst="pain_airheavy_uniform.png", expect=5, gap=1, min_w=6),   # aerial rod-sword thrust
    dict(src="pain_down_air_attack.png",    dst="pain_downair_uniform.png",  expect=4, gap=1, min_w=6),   # downward dive kick
    dict(src="pain_light_attack_2.png",     dst="pain_jab_uniform.png",      expect=5, gap=1, min_w=6),   # Fwd+Light command normal (punch-jab + slash FX)
    # Fwd+Heavy command chain — ground_combo grid rows (y-bands from grid analysis).
    dict(src="pain_ground_combo.png",       dst="pain_combo1_uniform.png",   expect=5, gap=1, min_w=8, band=(5, 62)),    # stage 1 (spin opener)
    dict(src="pain_ground_combo.png",       dst="pain_combo2_uniform.png",   expect=4, force_even="split", band=(72, 128)),  # stage 2 (launcher)
    dict(src="pain_ground_combo.png",       dst="pain_combo3_uniform.png",   expect=5, gap=1, min_w=8, band=(134, 195)),  # stage 3 (finisher)
]

# Stage 3 — the 3 gravity specials (cast poses) + Super Push ground-effect shockwave overlay.
JOBS3 = [
    dict(src="pain_almighty_push.png",         dst="pain_almighty_push_uniform.png",  expect=8, gap=1, min_w=6),   # Shinra Tensei cast (palm thrust)
    dict(src="pain_almighty_pull.pngpng.png",  dst="pain_almighty_pull_uniform.png",  expect=7, gap=1, min_w=6),   # Bansho Ten'in cast (reeling gesture)
    dict(src="pain_super_almighty_push.png",   dst="pain_super_push_uniform.png",     expect=6, gap=1, min_w=6),   # Hard Shinra Tensei cast (both arms)
    # Super Push GROUND EFFECT — expanding debris shockwave (3 frames; drop the 1px seam specks with min_w).
    dict(src="pain_super_almighty_push_ground_effect_under_pain.png", dst="pain_super_push_ground_uniform.png", expect=3, gap=1, min_w=20),
]

# Stage 4 — Dedera Double Attack: cast (Deidara cameo homage) → rising follow-up → clay-bird projectile → explosion effect.
JOBS4 = [
    dict(src="pain_dedera_double_attack.png",              dst="pain_dedera_cast_uniform.png", expect=3, force_even=3),   # Deidara-cameo cast (motion streaks bridge gutters → even split)
    dict(src="pain_dedera_double_attack_upper_attack.png", dst="pain_dedera_rise_uniform.png", expect=5, gap=1, min_w=6),  # Pain's rising follow-up (same pose family as air_hard)
    dict(src="pain_dedera_double_attack_projectile.png",   dst="pain_dedera_bird_uniform.png", expect=2, gap=1, min_w=6),  # clay-bird projectile (2f flap)
    dict(src="pain_dedera_double_attack_effect.png",       dst="pain_dedera_explosion_uniform.png", expect=5, gap=1, min_w=15),  # star-flash → fireball explosion (drop 1px seams)
]

# Stage 6 — the 5 Six-Paths assist calls (Itachi/Konan/Sasori/Sasuke/Tobi). Each PRIMARY sheet is the
# rush-in companion sprite; the secondary sheets (Konan rod/trap, Sasuke rod, Tobi eye/vortex) are impact
# VFX. A leading ~20px "summoning streak" prefixes several sheets → kept as frame 0 (min_w drops 2px seams).
JOBS6 = [
    dict(src="pain_itatchi_support.png",                    dst="pain_assist_itachi_uniform.png",     gap=1, min_w=14),
    dict(src="pain_konan_support.png",                      dst="pain_assist_konan_uniform.png",      gap=1, min_w=14),
    dict(src="pain_konan_support_rod_attack.png",           dst="pain_assist_konan_rod_uniform.png",  expect=5, gap=1, min_w=8),
    dict(src="pain_konan_support_paper_trap_efffect.png",   dst="pain_assist_konan_trap_uniform.png", expect=3, gap=1, min_w=10),
    dict(src="pain_sasori_support.png",                     dst="pain_assist_sasori_uniform.png",     gap=1, min_w=14),
    dict(src="pain_saske_assist.png",                       dst="pain_assist_sasuke_uniform.png",     gap=1, min_w=14),
    dict(src="pain_saske_lighnig_rod.png",                  dst="pain_assist_sasuke_rod_uniform.png", expect=6, gap=1, min_w=8),
    dict(src="pain_tobi_assist_effect.png",                 dst="pain_assist_tobi_uniform.png",       expect=5, gap=1, min_w=10),
    dict(src="pain_tobi_assist_effect_sharingan.png",       dst="pain_assist_tobi_eye_uniform.png",   expect=1, gap=1, min_w=8),
    dict(src="pain_tobi_effects.png",                       dst="pain_assist_tobi_vortex_uniform.png",expect=4, gap=1, min_w=40),
]

# Stage 7 — Chibaku Tensei ultimate: cast (arms raised) → sphere growth (+debris) → SLAM + impact flash.
# NOTE: the ground "explosion" strip (chibaku_tensei_grouf_effects.png → pain_chibaku_ground_uniform.png,
# flat→dome→flame-pillar) was DROPPED — its source art had baked-in green separator lines through the
# frames and never aligned to the opponent; the cinematic keeps only the sphere slam + flash. Source +
# resliced sheet were deleted; do NOT re-add this job. See painChibakuTenseiCinematic.js / PAIN_ASSET_MAP.md.
JOBS7 = [
    dict(src="pain_chibaku_tensei.png",            dst="pain_chibaku_cast_uniform.png",   gap=1, min_w=15),   # cast — Pain raises arms, forms the sphere
    dict(src="chibaku_tensei_projectile.png",      dst="pain_chibaku_sphere_uniform.png", expect=5, gap=1, min_w=3),   # black-sphere growth + debris (source lacks the pain_ prefix — preserved)
]

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "stage1"
    if arg == "stage1":
        meta = {}
        for job in JOBS1:
            src, dst, n, mw = job[0], job[1], job[2], job[3]
            fe = job[4] if len(job) > 4 else 0
            key = dst.replace("pain_", "").replace("_uniform.png", "")
            meta[key] = reslice(src, dst, n, mw, fe)
        print(json.dumps(meta, indent=2))
    elif arg in ("stage2", "stage3", "stage4", "stage6", "stage7"):
        jobs = {"stage2": JOBS2, "stage3": JOBS3, "stage4": JOBS4, "stage6": JOBS6, "stage7": JOBS7}[arg]
        meta = {}
        for j in jobs:
            key = j["dst"].replace("pain_", "").replace("_uniform.png", "")
            meta[key] = reslice(j["src"], j["dst"], j.get("expect"), j.get("min_w", 1),
                                j.get("force_even", 0), j.get("gap", GAP), j.get("band"))
        print(json.dumps(meta, indent=2))
