#!/usr/bin/env python3
# Re-slice Onoki (Naruto, Third Tsuchikage) source ROW strips into CLEAN uniform, feet-aligned
# cells. Mirrors tools/reslice_saitama.py (alpha-gutter frame detect -> per-frame content bbox ->
# repack into one uniform cell: centered-X, BOTTOM-aligned) so a single anchorY: 0 plants feet
# across every standing action. Same band/keep/pick/xrects/keyblack/scrub knobs.
#
# NOTE ON SOURCE FORMAT: unlike Saitama's per-action files, Onoki's art arrives as 62 numbered
# ROW strips (onoki_row_NN.png), each strip = one animation laid out horizontally. So each job
# maps a row number -> a semantic action name per the CONFIRMED ONOKI DESIGN.
#
# DESIGN structural note: Onoki has GROUND-mode and FLIGHT-mode movement art (canon Dust Release
# levitation) — these are DISTINCT sheets, verified pixel-for-pixel (row_02 feet-planted idle vs
# row_03 airborne hover idle). Wired into the engine's existing canFly flight-toggle system.
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

def reslice(src, out, band=None, keep=None, pick=None, xrects=None, keyblack=None, scrub=None,
            minw=3, pad_to=None):
    im = Image.open(src).convert("RGBA"); W, H = im.size
    if scrub is not None:            # clear baked-in label/annotation rects
        sp = im.load()
        for (x0, y0, x1, y1) in scrub:
            for y in range(max(0, y0), min(H, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)):
                    sp[x, y] = (0, 0, 0, 0)
    if keyblack is not None:
        px = im.load()
        for y in range(H):
            for x in range(W):
                r, g, b, a = px[x, y]
                if a > 0 and max(r, g, b) < keyblack: px[x, y] = (0, 0, 0, 0)
    px = im.load()
    y0, y1 = (0, H - 1) if band is None else band
    if xrects is not None:
        runs = [list(r) for r in xrects]
    else:
        runs = runs_of(px, 0, W - 1, y0, y1)
        runs = [r for r in runs if (r[1] - r[0] + 1) >= minw]   # drop sub-minw debris slivers
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
    if pad_to is not None:                 # force a COMMON cell height (feet-aligned) across a set of sheets
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

def stitch(parts, out):
    """Concatenate several already-resliced uniform strips into ONE feet-aligned strip."""
    cells = []
    for src, n in parts:
        im = Image.open(src).convert("RGBA"); W, H = im.size; cw = W // n; px = im.load()
        for i in range(n):
            x0, y0, x1, y1 = (i + 1) * cw, H, -1, -1
            for y in range(H):
                for x in range(i * cw, (i + 1) * cw):
                    if px[x, y][3] > ALPHA:
                        if x < x0: x0 = x
                        if x > x1: x1 = x
                        if y < y0: y0 = y
                        if y > y1: y1 = y
            if x1 < 0: continue
            cells.append(im.crop((x0, y0, x1 + 1, y1 + 1)))
    uW = max(c.width for c in cells) + 2
    uH = max(c.height for c in cells) + 2
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - 1), c)
    strip.save(out)
    print(f"OK {out}: {len(cells)} frames, cell {uW}x{uH}  (stitched)")
    print(f"   animationData -> {{ frames: {len(cells)}, width: {uW}, height: {uH}, anchorY: 0 }}")

def crop_frame(src, out, box, pad=2):
    """Crop an explicit (x0,y0,x1,y1) region and repack as a single feet-aligned uniform cell.
    Used to lift ONE sub-sprite out of a mixed row (e.g. a single rock-chunk projectile)."""
    im = Image.open(src).convert("RGBA")
    x0, y0, x1, y1 = box
    cell = im.crop((x0, y0, x1 + 1, y1 + 1))
    uW, uH = cell.width + pad, cell.height + pad
    strip = Image.new("RGBA", (uW, uH), (0, 0, 0, 0))
    strip.paste(cell, ((uW - cell.width) // 2, uH - cell.height - 1), cell)
    strip.save(out)
    print(f"OK {out}: 1 frame, cell {uW}x{uH}  (cropped {box})")

def make_portrait(src, out, target_h=288):
    """Bust portrait from a strip's frame 0 (head + upper torso), upscaled nearest-neighbor."""
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > ALPHA) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0)
    x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    bust_h = int((y1 - y0 + 1) * 0.62)
    crop = im.crop((x0, y0, x1 + 1, y0 + bust_h))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (bust from {src} frame 0)")

if __name__ == "__main__":
    # ── STAGE 1 — movement / state (GROUND + FLIGHT mode) ──
    # Each row is a clean single-animation strip; alpha-gutter auto-detect (minw drops debris).
    STAGE1 = [
        # GROUND MODE
        ("onoki_row_02.png", "onoki_idle_uniform.png"),          # ground idle (cape settling)
        ("onoki_row_04.png", "onoki_walk_uniform.png"),          # ground walk
        ("onoki_row_55.png", "onoki_dash_uniform.png"),          # ground dash
        ("onoki_row_42.png", "onoki_guard_uniform.png"),         # guard
        # FLIGHT MODE (canon Dust Release levitation)
        ("onoki_row_03.png", "onoki_hover_idle_uniform.png"),    # flight idle (feet off ground)
        ("onoki_row_05.png", "onoki_flight_dash_uniform.png"),   # flight dash (directional)
        ("onoki_row_06.png", "onoki_fast_dive_uniform.png"),     # flight fast dive
        ("onoki_row_20.png", "onoki_flight_glide_uniform.png"),  # flight "run" (multi-angle)
        ("onoki_row_29.png", "onoki_aerial_spin_uniform.png"),   # aerial spin/dive w/ cape trail
        # SHARED MOVEMENT / STATE
        ("onoki_row_08.png", "onoki_jump_uniform.png"),          # jump startup + rise
        ("onoki_row_09.png", "onoki_jump_flip_uniform.png"),     # jump flip (apex)
        ("onoki_row_10.png", "onoki_knockdown_uniform.png"),     # knockdown tumble
        ("onoki_row_11.png", "onoki_getup_uniform.png"),         # prone -> get-up
        ("onoki_row_17.png", "onoki_downed_slide_uniform.png"),  # downed slide
        ("onoki_row_13.png", "onoki_hit_uniform.png"),           # hit reaction
        ("onoki_row_32.png", "onoki_heavy_stun_uniform.png"),    # heavy stun reaction (KRAK! FX)
        ("onoki_row_14.png", "onoki_crouch_uniform.png"),        # crouch / dodge
        ("onoki_row_50.png", "onoki_dodge_roll_uniform.png"),    # dodge-roll
        ("onoki_row_44.png", "onoki_backflip_uniform.png"),      # backflip evade
        ("onoki_row_18.png", "onoki_taunt_uniform.png"),         # taunt / victory (arms raised)
    ]
    for src, out in STAGE1:
        reslice(src, out)

    # PORTRAIT — bust from ground idle frame 0 (no dedicated mugshot art).
    make_portrait("onoki_row_02.png", "onoki_portrait.png")

    # ── STAGE 2 — 5 normals + command-normal chain (all clean single-animation rows) ──
    STAGE2 = [
        ("onoki_row_56.png", "onoki_light_uniform.png"),      # light — quick jab (4f)
        ("onoki_row_24.png", "onoki_heavy_uniform.png"),      # heavy — extended ROCK-ARM straight punch (7f)
        ("onoki_row_25.png", "onoki_up_uniform.png"),         # up (launcher) — rock-fist uppercut (8f)
        ("onoki_row_21.png", "onoki_air_uniform.png"),        # air — aerial dive kick (8f)
        ("onoki_row_62.png", "onoki_downair_uniform.png"),    # down_air — inverted rock-leg spike (9f)
        ("onoki_row_31.png", "onoki_cmdchain_uniform.png"),   # command chain — 11f melee combo w/ slash FX
    ]
    for src, out in STAGE2:
        reslice(src, out)

    # ── STAGE 3 — 6 ground specials ──
    STAGE3 = [
        ("onoki_row_23.png", "onoki_rockfist_uniform.png"),      # neutral — Rock Fist Transform Strike (8f, fist enlarges)
        ("onoki_row_26.png", "onoki_lunge_uniform.png"),         # Fwd — Rock Fist Lunge (7f forward thrust)
        ("onoki_row_60.png", "onoki_armswing_uniform.png"),      # Back — Rock Arm Swing (8f heavy swing)
        ("onoki_row_48.png", "onoki_tauntfin_uniform.png"),      # Up — Taunting Combo Finisher (13f dense combo)
        ("onoki_row_16.png", "onoki_jutsu_launch_uniform.png"),  # Charge release — Jutsu Launch (8f windup→launch)
        ("onoki_row_45.png", "onoki_jutsu_charge_uniform.png"),  # Charge hold — power-up loop (10f)
    ]
    for src, out in STAGE3:
        reslice(src, out)
    # Down — Spinning Cape + Rock Projectiles (row_15, MIXED): 9 spin/pose runs (0-8) + 1 rock-chunk
    # projectile cluster (run 9, 19px). Split: poses → the cape-spin pose sheet; run 9 → the projectile sprite.
    reslice("onoki_row_15.png", "onoki_capespin_uniform.png", keep=(0, 8))       # 9 spin poses
    # run 9 (x 549-567) is a 3-chunk vertical rock cluster; lift the MIDDLE chunk as the single projectile sprite.
    crop_frame("onoki_row_15.png", "onoki_rock_proj_uniform.png", (549, 29, 567, 51))   # 1-frame rock-chunk projectile

    # ── STAGE 4 — Rock Platform Ride (fast_dive + aerial_spin already sliced in STAGE 1) ──
    reslice("onoki_row_52.png", "onoki_platform_ride_uniform.png")   # 9f — standing/riding a rock platform

    # ── STAGE 5 — GOLEM SUMMON ULT (Detachment of the Primitive World) ──
    # Onoki cast pose = row_46 runs 0-2 (the 3 hand-sign frames); runs 3-9 are dust-cloud/golem-forming FX
    # (left unsliced — the golem entity + its transition pose carry the forming beat).
    reslice("onoki_row_46.png", "onoki_ult_cast_uniform.png", keep=(0, 2))   # 3f Onoki Dust-Release cast
    # The summoned GOLEM's own moveset (distinct larger sub-character, 131-186px cells). The summon draw
    # centers each frame, so the rotating poses (idle/punch/swing) + the spawn transition are padded to a
    # COMMON cell size (178x151, feet bottom-aligned) → feet stay planted when the pose swaps. Leap (airborne
    # pose) is sliced natural + HELD IN RESERVE (its mid-air feet don't ground-align cleanly).
    GOLEM_CELL = (178, 151)
    reslice("onoki_row_34.png", "onoki_golem_idle_uniform.png",       pad_to=GOLEM_CELL)   # 5f idle (moving/between strikes)
    reslice("onoki_row_35.png", "onoki_golem_transition_uniform.png", pad_to=GOLEM_CELL)   # 4f transition (spawn/forming pose)
    reslice("onoki_row_36.png", "onoki_golem_swing_uniform.png",      pad_to=GOLEM_CELL)   # 4f overhead swing
    reslice("onoki_row_37.png", "onoki_golem_punch_uniform.png",      pad_to=GOLEM_CELL)   # 4f forward punch
    reslice("onoki_row_38.png", "onoki_golem_leap_uniform.png")                             # 5f leap (RESERVE)
