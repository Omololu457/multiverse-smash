#!/usr/bin/env python3
# Re-slice Brainiac (DC) source ROW strips into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_deathstroke.py / reslice_onoki.py (alpha-gutter frame detect -> per-frame
# content bbox -> repack into one uniform cell: centered-X, BOTTOM-aligned) so a single anchorY:0
# plants feet across every standing action. Same band/keep/pick/xrects knobs.
#
# SOURCE: 13 numbered ROW strips (brainiac_row_NN.png), all 661px wide, H 82-160. Green-skinned
# Brainiac, purple/grey armor, metallic shoulder tentacles, cyan beams. Several rows are MIXED
# (idle+icon+walk+turn, beam+crouch+tentacle-crouch, etc.) -> those jobs use xrects/keep/pick to
# carve exactly the wanted frames and drop reference/icon/FX-strip clutter. Full pixel audit +
# Stage-0 reconciliation: BRAINIAC_ASSET_MAP.md.
#
# DESIGN (owner-locked 2026-08-17): large all-special ZONER. (1) normals repurpose tentacle strikes
# (row_09/10), (2) ULT = Energy Pillar barrage (row_13), (3) build both candidate specials distinct
# (Energy Blade row_03 + Tentacle Sweep row_04). Stage 1 = movement / state only.
import sys
from PIL import Image

ALPHA = 16

def runs_of(px, x0, x1, y0, y1):
    col = [sum(1 for y in range(y0, y1 + 1) if px[x, y][3] > ALPHA) for x in range(x0, x1 + 1)]
    out = []; s = -1
    for i, x in enumerate(range(x0, x1 + 1)):
        if col[i] > 0:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, x1])
    return out

def reslice(src, out, band=None, keep=None, pick=None, xrects=None, minw=3, pad_to=None):
    im = Image.open(src).convert("RGBA"); W, H = im.size
    px = im.load()
    y0, y1 = (0, H - 1) if band is None else band
    if xrects is not None:
        runs = [list(r) for r in xrects]
    else:
        runs = runs_of(px, 0, W - 1, y0, y1)
        runs = [r for r in runs if (r[1] - r[0] + 1) >= minw]
        if keep is not None:
            runs = runs[keep[0]:keep[1] + 1]
        if pick is not None:
            runs = [runs[i] for i in pick]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = y1 + 1, y0 - 1
        for y in range(y0, y1 + 1):
            hit = False
            for x in range(rx0, rx1 + 1):
                if px[x, y][3] > ALPHA:
                    hit = True; break
            if hit:
                if y < miny: miny = y
                if y > maxy: maxy = y
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    if pad_to is not None:
        uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        dx = i * uW + (uW - sw) // 2
        dy = uH - sh - 1
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_portrait(src, out, target_h=288):
    """Bust portrait from a strip's frame 0 (head + upper torso), upscaled nearest-neighbor.
    No dedicated portrait/icon art exists for Brainiac (row_01 skull icon is a tiny HUD glyph) -> use
    the idle bust per project standard."""
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > ALPHA) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0)
    x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    bust_h = int((y1 - y0 + 1) * 0.60)
    crop = im.crop((x0, y0, x1 + 1, y0 + bust_h))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (bust from {src} frame 0)")

if __name__ == "__main__":
    # ── STAGE 1 — movement / state ──
    # row_01 is MIXED: 3 idle + [skull HUD icon] + 6 walk + 3 turnaround-reference. xrects carve idle
    # (skip the icon at run[3]); keep(4,9) selects the 6 walk frames; the turnaround tail is dropped.
    IDLE = [(25, 63), (75, 114), (121, 160)]
    reslice("brainiac_row_01.png", "brainiac_idle_uniform.png", xrects=IDLE)
    reslice("brainiac_row_01.png", "brainiac_walk_uniform.png", keep=(4, 9))

    # crouch idle — row_12 plain-crouch pair (runs 3-4). The firing pose (run 0) + beam VFX strips
    # (runs 1-2) + tentacle-crouch pair (runs 5-6) are carved separately / held for later stages.
    reslice("brainiac_row_12.png", "brainiac_crouch_uniform.png", pick=[3, 4])
    # crouch tentacle-context variant (runs 5-6) — auto-swapped later via combat.js _setCrouchVariant.
    reslice("brainiac_row_12.png", "brainiac_crouchtentacle_uniform.png", pick=[5, 6])

    # hurt + KNOCKDOWN chain — row_08 is the full KO sequence (stagger->bend->fall->lie->kneel->rise
    # w/ tentacles). Split: hurt=stagger (0-1), knockdown=fall+lie (2-3), getup=kneel->rise (4-6).
    reslice("brainiac_row_08.png", "brainiac_hurt_uniform.png",      keep=(0, 1))
    reslice("brainiac_row_08.png", "brainiac_knockdown_uniform.png", keep=(2, 3))
    reslice("brainiac_row_08.png", "brainiac_getup_uniform.png",     keep=(4, 6))

    # PORTRAIT — idle-frame-0 bust (no dedicated portrait art; row_01 skull icon is HUD-only).
    make_portrait("brainiac_idle_uniform.png", "brainiac_portrait.png")

    # ── STAGE 2 — normals (owner-locked: repurpose the tentacle strike art as basic attacks). The
    # basic_attacks hit/frame data lives in characters.js; these sheets drive the SPRITE. row_09 =
    # forward tentacle THRUST progression (coil→extend→spear→spread); row_10 = multi-directional FAN.
    # light = quick tentacle jab (row_09 coil→extend→forward spear, 3f)
    reslice("brainiac_row_09.png", "brainiac_light_uniform.png", keep=(0, 2))
    # heavy = wide tentacle fan swipe (row_10 first two fan poses, 2f)
    reslice("brainiac_row_10.png", "brainiac_heavy_uniform.png", keep=(0, 1))
    # up (LAUNCHER) = upper tentacle spread swat (row_10 widest up-fan pair, 2f) — tentacles point up
    reslice("brainiac_row_10.png", "brainiac_up_uniform.png", keep=(2, 3))
    # air = aerial tentacle lash (row_09 forward spear + spread, 2f). down_air REUSES this sheet — FLAG.
    reslice("brainiac_row_09.png", "brainiac_air_uniform.png", keep=(2, 3))
    # crouchLight = the crouching tentacle strike (already sliced above as brainiac_crouchtentacle_uniform.png,
    # row_12 runs 5-6). Auto-swapped by combat.js _setCrouchVariant when a light is thrown while crouching
    # (opt-in via animationData.crouchLight; movement.crouchIdle set). No new slice needed here.

    # ── STAGE 4 — specials (5 directional; owner-locked kit). Cast/strike POSE sheets (the projectile
    # visuals + FX spawn separately). N=Beam / F=Energy Blade / D=Tentacle Sweep / B=Electric Shield / U=Levitation.
    # Neutral BEAM — cast pose (row_02 stance->charge->fire, 3f). The detached beam bar (runs 3/6) is the projectile.
    reslice("brainiac_row_02.png", "brainiac_beam_uniform.png", keep=(0, 2))
    reslice("brainiac_row_02.png", "brainiac_beam_proj_uniform.png", pick=[3, 6])   # horizontal cyan beam segment (projectile)
    # Forward ENERGY BLADE — charge -> release an angled energy blade (row_03 runs 0-3; run 3 = the wide blade).
    # Built as an advancing disjoint melee-slash (the blade IS the hitbox), distinct from the straight Beam.
    reslice("brainiac_row_03.png", "brainiac_blade_uniform.png", keep=(0, 3))
    # Down TENTACLE SWEEP — long low whip (row_04 coil->extend->splay). Disjoint melee, wide horizontal reach.
    reslice("brainiac_row_04.png", "brainiac_sweep_uniform.png", pick=[0, 1, 3])
    # Back ELECTRIC SHIELD — defensive/buff crackle (row_07 first 3 electric-arc frames).
    reslice("brainiac_row_07.png", "brainiac_shield_uniform.png", keep=(0, 2))
    # Up LEVITATION — rise onto the energy disc + aerial reposition (row_05 disc frames 2-4; last fires a beam).
    reslice("brainiac_row_05.png", "brainiac_levitate_uniform.png", keep=(2, 4))

    # ── STAGE 5 — ULTIMATE "Sphere of Annihilation" (Energy Pillar barrage). Promotes the row_13 pillar VFX
    # (owner decision #2). The 5 clean uniform cyan columns (runs 3-7) are drawn erupting across the arena in
    # drawBrainiacPillarCinematic (game.js). No unique ult BODY art → the caster holds the beam-fire pose (flagged).
    reslice("brainiac_row_13.png", "brainiac_pillar_uniform.png", keep=(3, 7))
