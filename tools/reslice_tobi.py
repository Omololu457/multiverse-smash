#!/usr/bin/env python3
"""Reslice raw Tobi (masked_man_*) sprite strips into uniform equal-cell sheets.

Modeled on reslice_obito.py. The raw uploads (masked_man_*.png) are single-row
horizontal strips with variable frame widths / irregular gaps; the engine slices
every action strip into N equal cells of a fixed width. Detect content islands
per column, then repack into a uniform grid: centered-X, sharing one vertical
extent across the whole strip (single baseline) so feet stay planted under
anchorY:0 while jump-rise / crouch-dip motion inside a strip is preserved.

Derived sheets are named WITHOUT the colons some raw uploads carry
(masked_man_hit:get_up.png, masked_man_chain_grab:attack_1.png) so the JS
`sheet:` paths never hit the URL scheme-separator problem. Raw uploads are
never renamed.

USAGE:  python3 tools/reslice_tobi.py [stage1|stage2|...]
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


def reslice(path, out, expect=None, min_w=1, force_even=0, island_slice=None, band=None):
    """island_slice=(a,b) keeps only detected islands [a:b] (for splitting a
    combined chain sheet like hit:get_up into hurt/knockdown/getup).
    band=(y0,y1) first crops to that ROW range — for a multi-ROW grid sheet
    (the Fire Phoenix giant projectile: grow-band / split-band / disperse-band)."""
    im = Image.open(path).convert("RGBA")
    if band:
        im = im.crop((0, band[0], im.width, band[1] + 1))
    arr = np.array(im)
    alpha = arr[:, :, 3]
    if force_even:
        step = im.width / force_even
        islands = [[round(i * step), round((i + 1) * step) - 1] for i in range(force_even)]
    else:
        islands = detect_islands(alpha, min_w)
    if island_slice:
        islands = islands[island_slice[0]:island_slice[1]]
    if expect and len(islands) != expect:
        print(f"  !! {path}: detected {len(islands)} islands, expected {expect}")

    # Baseline from the SELECTED islands only (so a split keeps its own extent).
    xs0 = min(i[0] for i in islands); xs1 = max(i[1] for i in islands)
    sub = alpha[:, xs0:xs1 + 1]
    rows = (sub > ALPHA).sum(axis=1)
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


# Stage 1 — movement / state / intro.  (src, dst, expect, min_w, force_even, island_slice)
JOBS1 = [
    ("masked_man_idle.png",       "masked_man_idle_uniform.png",       None, 1, 0, None),
    ("masked_man_run.png",        "masked_man_run_uniform.png",        None, 1, 0, None),
    ("masked_man_dash.png",       "masked_man_dash_uniform.png",       None, 1, 0, None),
    ("masked_man_dash_combo.png", "masked_man_dash_combo_uniform.png", None, 8, 0, None),
    ("masked_man_jump.png",       "masked_man_jump_uniform.png",       None, 1, 0, None),
    ("masked_man_block.png",      "masked_man_block_uniform.png",      None, 1, 0, None),
    ("masked_man_intro.png",      "masked_man_intro_uniform.png",      None, 8, 0, None),
    # Combined hit/knockdown/getup chain (7 detected islands) split into the engine's
    # separate hurt-state sheets. Colon dropped from the derived names.
    #   0-1 standing flinch · 2-3 airborne tumble · 2-4 knocked-back→floored · 5-6 rising
    ("masked_man_hit:get_up.png", "masked_man_hurt_uniform.png",       2, 1, 0, (0, 2)),
    ("masked_man_hit:get_up.png", "masked_man_hurt_air_uniform.png",   2, 1, 0, (2, 4)),
    ("masked_man_hit:get_up.png", "masked_man_knockdown_uniform.png",  3, 1, 0, (2, 5)),
    ("masked_man_hit:get_up.png", "masked_man_getup_uniform.png",      2, 1, 0, (5, 7)),
]

# Stage 2 — basic normals + air kunai throw projectile.  (src, dst, expect, min_w, force_even, island_slice)
JOBS2 = [
    ("masked_man_up_attack.png",                 "masked_man_up_attack_uniform.png",       None, 8, 0, None),
    ("masked_man_down_air_attack.png",           "masked_man_down_air_uniform.png",        None, 8, 0, None),
    ("masked_man_air_kunia_throw.png",           "masked_man_air_kunia_uniform.png",       None, 8, 0, None),
    ("masked_man_air_kunia_throw_projectile.png","masked_man_kunia_proj_uniform.png",      None, 1, 0, None),
]

# Stage 3 — Chain Grab multi-stage route (+ finisher impact effects). Colons dropped from names.
JOBS3 = [
    # chain_grab: 6 islands, LAST is an "ENEMY" annotation marker (not a pose) → keep 0-4.
    ("masked_man_chain_grab.png",                  "masked_man_chain_grab_uniform.png",        5, 8, 0, (0, 5)),
    ("masked_man_chain_grab:attack_1.png",         "masked_man_chain_attack1_uniform.png",     None, 8, 0, None),
    # chain_snatched: 11 islands = pull(0-5) + ENEMY marker(6) + dash-in(7-10). Use the pull frames.
    ("masked_man_chain_snatched_combo.png",        "masked_man_chain_snatched_uniform.png",    6, 8, 0, (0, 6)),
    ("masked_man_hard_chain_smash_down.png",       "masked_man_chain_smash_uniform.png",       None, 8, 0, None),
    ("masked_man_hard_chain_smash_down_effects.png","masked_man_chain_smash_fx_uniform.png",   None, 6, 0, None),
]

# Stage 4 — Kamui intangibility activation pose + self-portal FX (raw ".pgn" typo preserved).
JOBS4 = [
    ("masked_man_Kamui_activation.png",           "masked_man_kamui_activation_uniform.png", None, 4, 0, None),
    ("masked_man_Kamui_portal_effect.pgn.png",    "masked_man_kamui_portalfx_uniform.png",   None, 4, 0, None),
]

# Stage 5 — Fire Phoenix Jutsu. Cast pose + explosion FX (single-row), and the multi-ROW giant
# projectile sheet split into its GROW band (big single fireball) + DISPERSE band (small sub-fireballs).
# (src, dst, expect, min_w, force_even, island_slice, band)
JOBS5 = [
    ("masked_man_fire_ball_jutsu.png",                              "masked_man_fire_cast_uniform.png",      6, 8, 0, None, None),
    ("masked_man_explosion_effects.png",                            "masked_man_fire_explosion_uniform.png", 5, 8, 0, None, None),
    ("masked_man_fire_ball_jutsu_projectilez_meant_to_be_giant.png","masked_man_fire_giant_uniform.png",     5, 8, 0, None, (6, 129)),    # GROW band → main giant fireball
    ("masked_man_fire_ball_jutsu_projectilez_meant_to_be_giant.png","masked_man_fire_sub_uniform.png",       5, 8, 0, None, (272, 339)),  # DISPERSE band → small sub-fireballs
]

# Stage 6 — Nine-Tails Ultimate cinematic. Giant fox poses + Tailed Beast Bomb + ground FX.
# (src, dst, expect, min_w, force_even, island_slice, band)
JOBS6 = [
    ("masked_man_9_tails_summon_effects_part_2.png", "masked_man_fox_rise_uniform.png",      2, 60, 2, None, None),  # fox on all fours (RISE)
    ("masked_man_9_tails_summon_effects_part_3.png", "masked_man_fox_roar_uniform.png",      2, 60, 2, None, None),  # fox rearing / roaring (CHARGE/FIRE)
    ("masked_man_tailed_beastBomb_projectile.png",   "masked_man_bijuu_uniform.png",         9, 40, 9, None, None),  # Tailed Beast Bomb (even-split; big-sphere frames used)
    ("masked_man_9_tails_summon_ground_effects.png", "masked_man_summon_ground_uniform.png", 2, 30, 0, None, None),  # ground eruption FX
]

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "stage1"
    jobs = {"stage1": JOBS1, "stage2": JOBS2, "stage3": JOBS3, "stage4": JOBS4, "stage5": JOBS5, "stage6": JOBS6}.get(arg, JOBS1)
    meta = {}
    for job in jobs:
        src, dst, n, mw, fe, isl = job[0], job[1], job[2], job[3], job[4], job[5]
        band = job[6] if len(job) > 6 else None
        key = dst.replace("masked_man_", "").replace("_uniform.png", "")
        meta[key] = reslice(src, dst, n, mw, fe, isl, band)
    print(json.dumps(meta, indent=2))
