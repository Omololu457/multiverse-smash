#!/usr/bin/env python3
"""Reslice the Six Paths of Pain source strips (six_paths_of_pain_sliced/) into
uniform equal-cell "sixpaths_<path>_<action>_uniform.png" sheets.

This is a SEPARATE character from the solo `pain` build — it reads ONLY from the
six_paths_of_pain_sliced/ folder and never touches the pain_*_uniform.png sheets.

Core machinery is lifted from tools/reslice_pain.py (alpha-gutter island detect →
uniform feet-aligned repack). Two Six-Paths-specific gates are added:

  • LABEL-CROP GATE — several source sheets have baked-in ENGLISH TEXT (a DeviantArt
    rip habit): the Pull sheet reads "Pull enemy in any direction", the master rows
    carry "Walk / Chackra Charge" / "Special Attack: Shinra Tensei" / "Use doton
    effects here" headers. `label_band` crops a horizontal top-band of text off the
    top before slicing; `xcrop` takes only a horizontal sub-range (used to grab the
    clean cast poses that FLANK a centered text block).

USAGE:  python3 tools/reslice_six_paths_pain.py [deva|chikushodo|gakido|ningendo|asura|jigokudo]
"""
import sys, json, os
from PIL import Image
import numpy as np

SRC = os.path.join(os.path.dirname(__file__), "..", "six_paths_of_pain_sliced")

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
    """Some poses touch (no transparent gutter) → one wide island covering 2+
    frames. Split any island wider than ~1.6× the median single-pose width into
    equal sub-cells so the run cycle slices cleanly instead of mid-pose."""
    widths = sorted(x1 - x0 + 1 for x0, x1 in islands)
    single = widths[len(widths) // 2]
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


def reslice(src, dst, expect=None, min_w=1, force_even=0, gap=GAP,
            band=None, label_band=0, xcrop=None, keep=None):
    path = os.path.join(SRC, src)
    im = Image.open(path).convert("RGBA")
    if xcrop is not None:            # take only a horizontal sub-range (drop flanking text)
        im = im.crop((xcrop[0], 0, xcrop[1], im.height))
    if label_band:                   # LABEL-CROP GATE: drop a top text band before slicing
        im = im.crop((0, label_band, im.width, im.height))
    if band is not None:             # crop a horizontal ROW-band out of a multi-row grid
        im = im.crop((0, band[0], im.width, band[1] + 1))
    arr = np.array(im)
    alpha = arr[:, :, 3]
    if force_even == "split":
        islands = split_wide_islands(detect_islands(alpha, min_w, gap=1))
    elif force_even:
        step = im.width / force_even
        islands = [[round(i * step), round((i + 1) * step) - 1] for i in range(force_even)]
    else:
        islands = detect_islands(alpha, min_w, gap=gap)
    if keep is not None:             # keep only these island indices (drop text islands)
        islands = [islands[i] for i in keep if 0 <= i < len(islands)]
    if expect and len(islands) != expect:
        print(f"  !! {src}: detected {len(islands)} islands, expected {expect}")

    rows = (alpha > ALPHA).sum(axis=1)
    ys = np.where(rows > 0)[0]
    if len(ys) == 0:
        print(f"  !! {src}: NO content"); return None
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

    outpath = os.path.join(os.path.dirname(__file__), "..", dst)
    sheet.save(outpath)
    print(f"  {dst}: {n} frames  cell {cell_w}x{cell_h}  (from {im.size})")
    return {"frames": n, "width": cell_w, "height": cell_h}


# ── DEVA / TENDO PATH (Stage 1) — orange-haired Yahiko-Pain. Movement/state + 5 normals + the
# three gravity/defense specials + the Six-Paths Ultimate. Sources are the p1_pain_tendo_* strips.
# The master p1_pain_tendo_row.png (credits/portraits) and row_2/row_5 (text labels) are NOT sliced.
DEVA = [
    # movement / state
    dict(src="p1_pain_tendo_stance_teleport_block.png", dst="sixpaths_deva_stance_uniform.png", gap=1, min_w=6),
    dict(src="p1_pain_tendo_run.png",                   dst="sixpaths_deva_run_uniform.png",    gap=1, min_w=6),
    dict(src="p1_pain_tendo_jump_fall_crouch_throw.png",dst="sixpaths_deva_jfct_uniform.png",   gap=1, min_w=6),
    dict(src="p1_pain_tendo_damage.png",                dst="sixpaths_deva_hurt_uniform.png",   gap=1, min_w=6),
    dict(src="p1_pain_tendo_intro_7.png",               dst="sixpaths_deva_intro_uniform.png",  gap=1, min_w=6),
    # normals
    dict(src="p1_pain_tendo_combo.png",       dst="sixpaths_deva_combo_uniform.png",   gap=1, min_w=6),
    dict(src="p1_pain_tendo_down_attack.png", dst="sixpaths_deva_downatk_uniform.png", gap=1, min_w=6),
    dict(src="p1_pain_tendo_run_attack.png",  dst="sixpaths_deva_runatk_uniform.png",  gap=1, min_w=6),
    # specials
    dict(src="p1_pain_tendo_row_4.png",       dst="sixpaths_deva_push_uniform.png",    gap=1, min_w=6),   # Shinra Tensei arms-spread repulsion (row_5 label confirms)
    # Pull sheet: 2 clean cast poses at LEFT, then centered "Pull enemy in any direction" text → xcrop the left poses.
    dict(src="p1_pain_tendo_special_attack_bansho_ten_in_example.png", dst="sixpaths_deva_pull_uniform.png", gap=1, min_w=6, xcrop=(0, 150)),
    dict(src="p1_pain_tendo_special_attack_rinnegan_defense_destroy_ninjutsu.png", dst="sixpaths_deva_rinnegan_uniform.png", gap=1, min_w=10),  # expanding barrier rings (pure FX)
    dict(src="p1_pain_tendo_special_attack_six_paths_of_pain.png",     dst="sixpaths_deva_sixpaths_uniform.png", gap=1, min_w=6),  # bodies-rush (Ultimate)
]

# ── ANIMAL / CHIKUSHODO PATH (Stage 2) — long red-ponytail body. Same move STRUCTURE as Deva but its
# own art; the signature is SUMMONING (Kuchiyose no Jutsu). The fighter-body strips mirror Deva's layout;
# the summon menagerie (p2_animal_*) are the creatures the summon specials call. The tiny summon-cast
# sheet is a single hand-sign pose. Sources: p1_pain_chikushodo_* + p2_animal_*.
CHIKUSHODO = [
    # fighter body — movement / state
    dict(src="p1_pain_chikushodo_stance_teleport_block.png", dst="sixpaths_chiku_stance_uniform.png", gap=1, min_w=6),
    dict(src="p1_pain_chikushodo_run.png",                   dst="sixpaths_chiku_run_uniform.png",    gap=1, min_w=6),
    dict(src="p1_pain_chikushodo_jump_fall_crouch_throw.png",dst="sixpaths_chiku_jfct_uniform.png",   gap=1, min_w=6),
    dict(src="p1_pain_chikushodo_damage.png",               dst="sixpaths_chiku_hurt_uniform.png",   gap=1, min_w=6),
    # normals
    dict(src="p1_pain_chikushodo_combo.png",       dst="sixpaths_chiku_combo_uniform.png",   gap=1, min_w=6),
    dict(src="p1_pain_chikushodo_down_attack.png", dst="sixpaths_chiku_downatk_uniform.png", gap=1, min_w=6),
    dict(src="p1_pain_chikushodo_run_attack.png",  dst="sixpaths_chiku_runatk_uniform.png",  gap=1, min_w=6),
    # summon cast (single hand-sign pose)
    dict(src="p1_pain_chikushodo_special_attack_kuchiyose_no_jutsu_summoning.png", dst="sixpaths_chiku_summon_uniform.png", gap=1, min_w=6),
    # summon menagerie — the creatures the summon specials call
    dict(src="p2_animal_4.png",        dst="sixpaths_chiku_dog_uniform.png",   gap=2, min_w=30),   # three-headed dog (Cerberus)
    dict(src="p2_animal_2.png",        dst="sixpaths_chiku_bird_uniform.png",  gap=2, min_w=30),   # giant hawk (+ chameleon)
    dict(src="p2_animal_6.png",        dst="sixpaths_chiku_rhino_uniform.png", gap=2, min_w=30),   # armored rhino
    dict(src="p2_animal_3_cloack.png", dst="sixpaths_chiku_toad_uniform.png",  gap=2, min_w=40, keep=[0]),   # giant toad (sheet has faint ghost dupes → keep only the solid frame)
    # portrait (Stage 6 uses it; slice now)
    dict(src="p1_pain_chikushodo_pain_chikushodo_portrait.png", dst="sixpaths_chiku_portrait_uniform.png", gap=2, min_w=20),
]

# ── PRETA / GAKIDO PATH (Stage 3) — distinct bald Preta body. LEAN kit (11 source files, 1 special):
# 5 normals + movement/state + the ONE signature CHAKRA-ABSORPTION SHIELD. Ships lean, NOT padded.
# The shield sheet = [4 fighter cast frames][3 cyan barrier FX frames] → split by keep. p2_pain_gakido_*.
GAKIDO = [
    dict(src="p2_pain_gakido_stance_teleport_block.png", dst="sixpaths_gakido_stance_uniform.png", gap=1, min_w=6),
    dict(src="p2_pain_gakido_run.png",                   dst="sixpaths_gakido_run_uniform.png",    gap=1, min_w=6),
    dict(src="p2_pain_gakido_jump_fall_crouch_throw.png",dst="sixpaths_gakido_jfct_uniform.png",   gap=1, min_w=6),
    dict(src="p2_pain_gakido_damage.png",                dst="sixpaths_gakido_hurt_uniform.png",   gap=1, min_w=6),
    dict(src="p2_pain_gakido_combo.png",       dst="sixpaths_gakido_combo_uniform.png",   gap=1, min_w=6),
    dict(src="p2_pain_gakido_down_attack.png", dst="sixpaths_gakido_downatk_uniform.png", gap=1, min_w=6),
    dict(src="p2_pain_gakido_run_attack.png",  dst="sixpaths_gakido_runatk_uniform.png",  gap=1, min_w=6),
    # shield special — split the one sheet into fighter cast poses + the cyan barrier FX.
    dict(src="p2_pain_gakido_special_attack_cnrackra_shield_crackra_absorption.png", dst="sixpaths_gakido_shield_uniform.png",  gap=1, min_w=6, keep=[0, 1, 2, 3]),
    dict(src="p2_pain_gakido_special_attack_cnrackra_shield_crackra_absorption.png", dst="sixpaths_gakido_barrier_uniform.png", gap=1, min_w=6, keep=[4, 5, 6]),
    dict(src="p2_pain_gakido_pain_gakiao_portrait.png", dst="sixpaths_gakido_portrait_uniform.png", gap=2, min_w=20),
]

# ── HUMAN / NINGENDO PATH (Stage 4) — long orange-hair Human body. LEAN kit (11 files, 1 special):
# 5 normals + movement/state + the ONE signature SOUL-RIP command grab. Ships lean. The soul sheet =
# [5 fighter grab/reach frames][3 blue-soul FX frames] → split by keep. p2_pain_ningendo_*.
NINGENDO = [
    dict(src="p2_pain_ningendo_stance_teleport_block.png", dst="sixpaths_ningen_stance_uniform.png", gap=1, min_w=6),
    dict(src="p2_pain_ningendo_run.png",                   dst="sixpaths_ningen_run_uniform.png",    gap=1, min_w=6),
    dict(src="p2_pain_ningendo_jump_fall_crouch_throw.png",dst="sixpaths_ningen_jfct_uniform.png",   gap=1, min_w=6),
    dict(src="p2_pain_ningendo_damage.png",                dst="sixpaths_ningen_hurt_uniform.png",   gap=1, min_w=6),
    dict(src="p2_pain_ningendo_combo.png",       dst="sixpaths_ningen_combo_uniform.png",   gap=1, min_w=6),
    dict(src="p2_pain_ningendo_down_attack.png", dst="sixpaths_ningen_downatk_uniform.png", gap=1, min_w=6),
    dict(src="p2_pain_ningendo_run_attack.png",  dst="sixpaths_ningen_runatk_uniform.png",  gap=1, min_w=6),
    # soul-rip special — split the one sheet into fighter grab/reach poses + the blue-soul FX.
    dict(src="p2_pain_ningendo_special_attack_soul_absorption.png", dst="sixpaths_ningen_soulcast_uniform.png", gap=1, min_w=6, keep=[0, 1, 2, 3, 4]),
    dict(src="p2_pain_ningendo_special_attack_soul_absorption.png", dst="sixpaths_ningen_soul_uniform.png",     gap=1, min_w=6, keep=[5, 6, 7]),
    dict(src="p2_pain_ningendo_pain_ningendao_portrait.png", dst="sixpaths_ningen_portrait_uniform.png", gap=2, min_w=20),
]

# ── ASURA / SHURADO PATH (Stage 5) — mechanized body (MISLABELED "tendo" in the source filenames; the
# rockets/missiles/blade-transform are unmistakably Asura). RICH kit: 5 blade/mech normals + THREE
# projectile artillery specials (Missile Punch / Rocket Launcher barrage / Super Missile). FX sheets =
# [fighter cast frame(s)][projectile frames]; the super-missile sheet also has a baked "Missile (Make a
# Huge Explosion)" text label → dropped via keep. p3_pain_tendo_* sources.
ASURA = [
    dict(src="p3_pain_tendo_stance_teleport_block.png", dst="sixpaths_asura_stance_uniform.png", gap=1, min_w=6),
    dict(src="p3_pain_tendo_run.png",                   dst="sixpaths_asura_run_uniform.png",    gap=1, min_w=6),
    dict(src="p3_pain_tendo_jump_fall_crouch.png",      dst="sixpaths_asura_jfct_uniform.png",   gap=1, min_w=6),
    dict(src="p3_pain_tendo_damage.png",                dst="sixpaths_asura_hurt_uniform.png",   gap=1, min_w=6),
    dict(src="p3_pain_tendo_combo.png",       dst="sixpaths_asura_combo_uniform.png",   gap=1, min_w=6),
    dict(src="p3_pain_tendo_down_attack.png", dst="sixpaths_asura_downatk_uniform.png", gap=1, min_w=6),
    dict(src="p3_pain_tendo_air_attack.png",  dst="sixpaths_asura_air_uniform.png",     gap=1, min_w=6),
    dict(src="p3_pain_tendo_run_attack.png",  dst="sixpaths_asura_runatk_uniform.png",  gap=1, min_w=6),
    # projectile specials — split fighter cast pose(s) from the projectile frames.
    dict(src="p3_pain_tendo_special_attack_missile_punch_cttects.png", dst="sixpaths_asura_missilecast_uniform.png", gap=1, min_w=6, keep=[0]),
    dict(src="p3_pain_tendo_special_attack_missile_punch_cttects.png", dst="sixpaths_asura_missile_uniform.png",     gap=1, min_w=6, keep=[2, 3, 4]),
    dict(src="p3_pain_tendo_special_attack_rocket_launcher.png",       dst="sixpaths_asura_rocketcast_uniform.png",  gap=1, min_w=6, keep=[0, 1]),
    dict(src="p3_pain_tendo_special_attack_rocket_launcher.png",       dst="sixpaths_asura_rocket_uniform.png",      gap=1, min_w=6, keep=[2, 3, 4]),
    dict(src="p3_pain_tendo_defeated_special_attack_super_missile.png",dst="sixpaths_asura_supermissile_uniform.png",gap=1, min_w=6, keep=[0, 1, 2]),
    dict(src="p3_pain_tendo_portrait.png", dst="sixpaths_asura_portrait_uniform.png", gap=2, min_w=20),
]

# ── NARAKA / JIGOKUDO PATH (Stage 5) — spiky-orange Naraka body. RICH kit: 5 normals + the KING OF HELL
# (giant demon head): Judgment (the head + lashing tongue devours) and Restoration (the emerging head +
# magenta doton flames HEAL Pain — the Naraka Path's canon restore; the Human Path deliberately has no
# heal so this is its unique home). p3_pain_jigokudo_* sources.
NARAKA = [
    dict(src="p3_pain_jigokudo_stance_teleport_block.png", dst="sixpaths_naraka_stance_uniform.png", gap=1, min_w=6),
    dict(src="p3_pain_jigokudo_run.png",                   dst="sixpaths_naraka_run_uniform.png",    gap=1, min_w=6),
    dict(src="p3_pain_jigokudo_jump_fall_crouch_throw.png",dst="sixpaths_naraka_jfct_uniform.png",   gap=1, min_w=6),
    dict(src="p3_pain_jigokudo_damage.png",                dst="sixpaths_naraka_hurt_uniform.png",   gap=1, min_w=6),
    dict(src="p3_pain_jigokudo_combo.png",       dst="sixpaths_naraka_combo_uniform.png",   gap=1, min_w=6),
    dict(src="p3_pain_jigokudo_down_attack.png", dst="sixpaths_naraka_downatk_uniform.png", gap=1, min_w=6),
    dict(src="p3_pain_jigokudo_run_attack.png",  dst="sixpaths_naraka_runatk_uniform.png",  gap=1, min_w=6),
    # King of Hell — summon cast pose + the judgment head + the restoration (emerging head + flames).
    dict(src="p3_pain_jigokudo_special_attack_kuchiyose_no_jutsu_king_of_hell_activating_jutsu.png", dst="sixpaths_naraka_summoncast_uniform.png", gap=1, min_w=6, keep=[0, 1, 2]),
    dict(src="p3_pain_jigokudo_special_attack_king_of_hell_judgment.png", dst="sixpaths_naraka_kingofhell_uniform.png", gap=2, min_w=30),
    dict(src="p3_pain_jigokudo_emerging_stance_use_doton_effects.png",    dst="sixpaths_naraka_restore_uniform.png",    gap=2, min_w=20),
    dict(src="p3_pain_jigokudo_pain_jigokudo_portrait.png", dst="sixpaths_naraka_portrait_uniform.png", gap=2, min_w=20),
]

JOBS = {"deva": DEVA, "chikushodo": CHIKUSHODO, "gakido": GAKIDO, "ningendo": NINGENDO, "asura": ASURA, "naraka": NARAKA}

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "deva"
    jobs = JOBS.get(arg)
    if not jobs:
        print(f"unknown path '{arg}' — choose from {list(JOBS)}"); sys.exit(1)
    meta = {}
    for j in jobs:
        key = j["dst"].replace("sixpaths_", "").replace("_uniform.png", "")
        meta[key] = reslice(**j)
    print(json.dumps(meta, indent=2))
