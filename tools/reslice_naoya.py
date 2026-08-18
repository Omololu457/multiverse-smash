#!/usr/bin/env python3
# Re-slice Naoya Zenin (Jujutsu Kaisen) source ROW strips into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_spiderman.py / reslice_onoki.py (alpha-gutter frame detect -> per-frame content
# bbox -> repack into one uniform cell: centered-X, BOTTOM-aligned) so a single anchorY: 0 plants feet
# across every standing action. Same band/keep/pick/xrects/scrub/even knobs.
#
# SOURCE FORMAT: art arrives as 13 numbered ROW strips (naoya_row_NN.png), each strip = one animation
# laid out horizontally. STAGE 0 pixel-audit + owner decisions (see memory naoya-build) map rows -> actions.
# STAGE 1 (movement / state):  idle=row_01, walk=row_04, dash/run=row_02, crouch-entry=row_03,
#                              hit/knockdown=row_13 (recoil->fall->landing->prone chain).
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

def even(x0, x1, n):
    """n equal-width xrects spanning [x0,x1] — for strips whose frames touch (no alpha gutter)."""
    w = (x1 - x0 + 1) / n
    return [(int(round(x0 + i * w)), int(round(x0 + (i + 1) * w)) - 1) for i in range(n)]

def reslice(src, out, band=None, keep=None, pick=None, xrects=None, minw=8, pad_to=None):
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
        if maxy < miny:
            continue
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

# ── STAGE 1 JOBS: movement / state ─────────────────────────────────────────────
JOBS = [
    # idle — row 01, 4-frame sway loop (clean gutters).
    dict(src="naoya_row_01.png", out="naoya_idle_uniform.png"),
    # walk — row 04, alternating-leg cycle. Auto gutter-detect yields 12 bands; the trailing 2 (69/79px
    # wide) are merged/anomalous lunge poses — keep the first 10 clean uniform stride frames for a tidy loop.
    dict(src="naoya_row_04.png", out="naoya_walk_uniform.png", pick=[0,1,2,3,4,5,6,7,8,9]),
    # dash / run — row 02, low sprint (5 frames). Shared by BOTH dash and run (single re-sliced sheet).
    dict(src="naoya_row_02.png", out="naoya_dash_uniform.png"),
    # crouch entry — row 03, 3-frame stand-to-crouch transition (lockLastFrame → holds crouched).
    dict(src="naoya_row_03.png", out="naoya_crouch_uniform.png"),
    # hurt — row 13 FIRST frame (the recoil/flinch), reused for hitstun.
    dict(src="naoya_row_13.png", out="naoya_hurt_uniform.png", pick=[0]),
    # knockdown — row 13 full chain: recoil → fall → landing → prone (lockLastFrame → holds prone).
    dict(src="naoya_row_13.png", out="naoya_knockdown_uniform.png"),

    # ── STAGE 2 JOBS: normals ──────────────────────────────────────────────────
    # LIGHT (jab) — row 06, 3-frame quick lunging straight-punch (orange motion trail). Fast close poke.
    dict(src="naoya_row_06.png", out="naoya_light_uniform.png"),
    # HEAVY (standing kick) — row 10, 3-frame stance → high kick. Committed high strike. ALSO reused as
    # the UP-attack launcher sheet (honest reuse — high kick reads as the anti-air) + as Frame-Trap step 2 (S4).
    dict(src="naoya_row_10.png", out="naoya_heavy_uniform.png"),
    # AIR (jump attack) — row 05 airborne portion (leap → airborne → spinning kick w/ white arc → descent).
    # Frames 2-5 of the 7-frame arc = the clean airborne strike. ALSO reused as the down_air spike sheet.
    dict(src="naoya_row_05.png", out="naoya_air_uniform.png", pick=[2, 3, 4, 5]),

    # ── STAGE 3 JOB: command chain ─────────────────────────────────────────────
    # COMMAND NORMAL (Fwd+Heavy) — row 08 "low combo string": 6-frame crouched jab series → sweeping spin
    # kick (frame ~5 carries an orange spin-kick FX). A single committed MULTI-HIT command normal. This same
    # art is ALSO the Frame-Trap step-1 pose in S4 (different, stricter frame-data per Stage-0 item 7).
    dict(src="naoya_row_08.png", out="naoya_combo_uniform.png"),

    # ── STAGE 4 JOBS: specials ──────────────────────────────────────────────────
    # ENERGY DART cast — row 11, the 2 crouched-launch poses (orange darts baked into the launch telegraph).
    # even 2-split (body + darts fuse in the alpha gutter → force two equal cells). The DART PROJECTILE itself
    # is a procedural orange energy shot (spawnProjectile color, no sheet).
    dict(src="naoya_row_11.png", out="naoya_energy_uniform.png", xrects=even(0, 275, 2)),
    # PITCH THROW cast — row 09, the 2-frame baseball-pitch windup. Reuses the orange dart payload (owner
    # decision), thrown as a single FAST straight shot vs the neutral spread.
    dict(src="naoya_row_09.png", out="naoya_pitch_uniform.png"),
    # FRAME-TRAP FINISH — row 07, the white wing/feather-burst STRIKE. pick=[0,1] ends (lockLastFrame) on the
    # wing frame (the money shot). Step 3 of the Frame-Trap sequence; carries the freeze payload.
    dict(src="naoya_row_07.png", out="naoya_ftfinish_uniform.png", pick=[0, 1]),

    # ── STAGE 6 JOB: lose pose ──────────────────────────────────────────────────
    # LOSE / defeat — row 12, the single seated-on-ground (propped-on-arm) downed pose (Stage-0 item 4:
    # NOT a kick). Fills the lose-pose gap; win + intro art remain genuinely absent.
    dict(src="naoya_row_12.png", out="naoya_lose_uniform.png"),
]

if __name__ == "__main__":
    only = set(sys.argv[1:])
    for j in JOBS:
        tag = j["out"].replace("naoya_", "").replace("_uniform.png", "")
        if only and tag not in only and j["out"] not in only:
            continue
        reslice(**j)
