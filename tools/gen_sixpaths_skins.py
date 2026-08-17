#!/usr/bin/env python3
"""Emit the recolor_batch job list for the Six Paths of Pain shared 13-skin set.

ONE hue-rotate recolor set, applied UNIFORMLY to EVERY confirmed Path's BODY art — canonically correct
because all six Paths share the same base design (near-black Akatsuki cloak + red trim + vivid orange-red
hair + tan skin; palette pixel-sampled from p1_pain_chikushodo_combo). recolor_hue leaves the near-black
outfit dark (low saturation → hue-invariant) while shifting the saturated hair/trim/skin — so each tag is
a distinct, coherent repaint across the whole character.

ONLY body sheets are recolored (movement/state/normals/cast poses — the ones in animationData, which the
per-Path swap retags via retagFormAnim). The FX/creature/summon/King-of-Hell/missile/barrier/soul sheets
are spawned with hardcoded base paths and are DELIBERATELY excluded (energy/creatures shouldn't take the
outfit hue). See skins.js SKINS.six_paths_pain + abilities.js applySixPathsSwap(retagFormAnim).

USAGE:  node harness/recolor_batch.mjs "$(python3 tools/gen_sixpaths_skins.py)"
"""
import json

# Path → BODY action sheets (the animationData sheets; FX/creature sheets excluded).
PATHS = {
    "deva":   ["stance", "run", "jfct", "hurt", "combo", "runatk", "downatk", "push", "pull", "intro"],
    "chiku":  ["stance", "run", "jfct", "hurt", "combo", "runatk", "downatk", "summon"],
    "gakido": ["stance", "run", "jfct", "hurt", "combo", "runatk", "downatk", "shield"],
    "ningen": ["stance", "run", "jfct", "hurt", "combo", "runatk", "downatk", "soulcast"],
    "asura":  ["stance", "run", "jfct", "hurt", "combo", "runatk", "downatk", "air", "missilecast", "rocketcast"],
    "naraka": ["stance", "run", "jfct", "hurt", "combo", "runatk", "downatk", "summoncast"],
}

# 12 recolor tags spanning the wheel (Default is the un-recolored base = skin #1, not generated here).
# (tag, hue_deg, saturate). Void = desaturated cold near-black. Names chosen to fit Pain/Rinnegan lore.
TAGS = [
    ("amberpath",       25, 1.20),   # warm amber/gold
    ("goldenrikudou",   50, 1.35),   # yellow-gold
    ("verdantsage",    100, 1.20),   # yellow-green
    ("emeralddeva",    140, 1.25),   # green
    ("tealrebirth",    175, 1.20),   # teal / cyan
    ("cobaltpath",     210, 1.25),   # blue
    ("azuretendo",     235, 1.20),   # deep blue
    ("violetrinnegan", 270, 1.35),   # purple — the canonical Rinnegan hue
    ("amethystshurado",295, 1.25),   # magenta-purple
    ("magentagakido",  325, 1.30),   # pink-magenta
    ("crimsonnagato",  350, 1.60),   # deep saturated crimson
    ("ashenvoid",      260, 0.12),   # desaturated cold void
]

jobs = []
for path, actions in PATHS.items():
    for act in actions:
        src = f"sixpaths_{path}_{act}_uniform.png"
        for tag, deg, sat in TAGS:
            jobs.append({"src": src, "out": src.replace(".png", f"__{tag}.png"), "deg": deg, "sat": sat})

# select-screen portrait (the char portrait = the Deva bust) recolored per tag.
for tag, deg, sat in TAGS:
    jobs.append({"src": "sixpaths_deva_portrait.png", "out": f"sixpaths_deva_portrait__{tag}.png", "deg": deg, "sat": sat})

print(json.dumps(jobs))
