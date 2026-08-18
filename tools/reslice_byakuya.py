#!/usr/bin/env python3
# Re-slice BYAKUYA KUCHIKI (Bleach, Squad-6 captain / precise Shunpo swordsman) source ROW strips into
# CLEAN uniform, feet-aligned cells. Mirrors tools/reslice_onoki.py + reslice_mayuri.py (alpha-gutter
# frame detect -> per-frame content bbox -> repack into one uniform cell: centered-X, BOTTOM-aligned) so a
# single anchorY: 0 plants feet across every standing action. Same band/keep/pick/xrects/keyblack knobs.
#
# SOURCE FORMAT: art arrives as 56 numbered ROW strips (Byakuya_Kuchiki_row_NN.png, NN=02..57), each strip
# = one animation (or, for the flagged MEGA-ROWS 08/09, MULTIPLE states) laid out horizontally. Each job
# maps a row -> a semantic action per the STAGE-0-CONFIRMED design (see memory byakuya-build). Filenames
# preserved EXACTLY as delivered (Byakuya_Kuchiki_row_NN).
#
# STAGE-0 notes honored here:
#  - row_08 has a 5px FX sliver between walk (f0-4) and crouch (f6): minw=10 drops it (indices then shift).
#  - row_09 hit/knockdown sub-clip boundaries are a best-guess (FLAGGED for user confirm) — see keep= below.
#  - rows 52-57 (Bankai) are NOT floor-anchored; those get sliced in a later stage with special handling.
import sys
from PIL import Image

ALPHA = 16
SRC = "Byakuya_Kuchiki_row_%02d.png"   # source-strip name template

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

def reslice(src, out, band=None, keep=None, pick=None, xrects=None, keyblack=None,
            minw=3, pad_to=None):
    im = Image.open(src).convert("RGBA"); W, H = im.size
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
    if pad_to is not None:                 # force a COMMON cell size across a set of sheets
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

def crop_frame(src, out, box, pad=2):
    """Crop an explicit (x0,y0,x1,y1) region and repack as a single feet-aligned uniform cell.
    Used to lift ONE sub-sprite out of a mixed row (e.g. a petal cluster for a projectile)."""
    im = Image.open(src).convert("RGBA")
    x0, y0, x1, y1 = box
    cell = im.crop((x0, y0, x1 + 1, y1 + 1))
    uW, uH = cell.width + pad, cell.height + pad
    strip = Image.new("RGBA", (uW, uH), (0, 0, 0, 0))
    strip.paste(cell, ((uW - cell.width) // 2, uH - cell.height - 1), cell)
    strip.save(out)
    print(f"OK {out}: 1 frame, cell {uW}x{uH}  (cropped {box})")

def make_portrait(src, out, target_h=288, keep_frac=0.62):
    """Bust portrait from a strip's frame 0 (head + upper torso), upscaled nearest-neighbor."""
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > ALPHA) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0)
    x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    bust_h = int((y1 - y0 + 1) * keep_frac)
    crop = im.crop((x0, y0, x1 + 1, y0 + bust_h))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (bust from {src} frame 0)")

def R(n): return SRC % n

if __name__ == "__main__":
    # ── STAGE 2 — registration + movement / state ──────────────────────────────
    # idle = row_11 breathe loop (frames 0-4; drop the frame-5 raise-blade transition for a clean loop).
    reslice(R(11), "byakuya_idle_uniform.png", keep=(0, 4))          # standing breathe idle (5f)

    # MEGA-ROW 08 (walk / walk-back / crouch / draw-sword / stance-idle). minw=10 drops the 5px FX sliver;
    # indices then map: 0-4 walk, 5 crouch, 6-11 draw-sword, 12-16 stance-idle.
    reslice(R(8), "byakuya_walk_uniform.png",      minw=10, keep=(0, 4))    # walk cycle — stride + haori flare (5f)
    reslice(R(8), "byakuya_crouch_uniform.png",    minw=10, keep=(5, 5))    # crouch (1f hold)
    reslice(R(8), "byakuya_drawsword_uniform.png", minw=10, keep=(6, 11))   # draw-sword (6f) [reserve/intro use]
    reslice(R(8), "byakuya_stance_uniform.png",    minw=10, keep=(12, 16))  # post-draw stance-idle variant (5f) [reserve]

    # dash / airborne — row_02 (4-frame air/dash loop, haori trailing). No dedicated jump/fall art in the
    # audit → jump & fall REUSE this airborne pose (honest fallback; flagged).
    reslice(R(2), "byakuya_dash_uniform.png")                        # dash / air glide (4f)

    # MEGA-ROW 09 (low-sweep / hit-react / backflip / prone knockdown / recovery). Sub-clip boundaries are a
    # STAGE-0 best-guess — FLAGGED for user confirm. hit-recoil f4-6, prone-knockdown f12-13.
    reslice(R(9), "byakuya_hurt_uniform.png",      keep=(4, 6))      # hit-reaction recoil (3f) [BOUNDARY UNCONFIRMED]
    reslice(R(9), "byakuya_knockdown_uniform.png", keep=(12, 13))    # prone knockdown + crumpled (2f) [BOUNDARY UNCONFIRMED]
    reslice(R(9), "byakuya_lowsweep_uniform.png",  keep=(0, 3))      # low blade-sweep stance (4f) [reserve — Stage 3 down-normal candidate]
    reslice(R(9), "byakuya_backflip_uniform.png",  keep=(7, 11))     # evasive backflip (5f) [reserve — Stage 4 dodge candidate]

    reslice(R(10), "byakuya_getup_uniform.png")                     # wake-up -> rise -> settle (9f)
    reslice(R(25), "byakuya_guard_uniform.png")                    # guard/block — scarf-flare crouch guard (4f)
    reslice(R(32), "byakuya_taunt_uniform.png")                    # taunt — haori flourish (4f, cosmetic)
    reslice(R(33), "byakuya_intro_uniform.png")                    # intro — cloak billow -> dash-in -> settle (14f)

    # PORTRAIT — placeholder bust from idle frame 0 (final portrait row chosen at Stage 6).
    make_portrait(R(11), "byakuya_portrait.png")

    # ── STAGE 3 — 5 normals + crouch-swipe variant (FX-LESS content only, per the confirmed normal/special
    # split). light = iai draw-cut (mega-row 08 draw-sword f7-12), heavy = committed low blade sweep (mega-
    # row 09 f0-3). up/air/down_air = the single-frame poses (row_50 raised slash / row_48 forward thrust /
    # row_45 diagonal slash) — these slot assignments are the STAGE-0 [NEEDS CONFIRMATION] items, flagged.
    # crouchLight = the row_20 crouching teal swipe (generic crouch-variant hook; minw=20 drops the 4px
    # detached teal blade-tip slivers → 4 clean frames).
    reslice(R(8),  "byakuya_light_uniform.png", minw=10, keep=(6, 11))   # light — iai draw-cut (6f)
    reslice(R(9),  "byakuya_heavy_uniform.png", keep=(0, 3))             # heavy — low blade sweep (4f)
    reslice(R(50), "byakuya_up_uniform.png")                            # up launcher — raised/overhead slash (1f)
    reslice(R(48), "byakuya_air_uniform.png")                           # air — forward thrust (1f)
    reslice(R(45), "byakuya_downair_uniform.png")                       # down_air — diagonal downward slash (1f)
    reslice(R(20), "byakuya_crouchlight_uniform.png", minw=20)          # crouchLight — crouching teal swipe (4f)

    # ── STAGE 4 — specials (schema-exception kit). CHAR rows drive the cast pose; FX rows overlay frame-locked
    # (drawByakuyaSpecialFx) or become projectile sprites. Ground dir map: N=Petal Cast / F=Straight Thrust /
    # U=Rising Slash launcher / B=Shunpo blink / D=Utsusemi re-form BRANCH (U-hold=overhead cut, else=thrust).
    # Air: N=Jump Slash / F=Airborne Vault. Guard(row_25) already wired (Stage 2). Overhead(16)/Spin(21)/
    # HighThrust(23) reserved (near-duplicate slash rows, no free inputs).
    #  -- char cast poses --
    reslice(R(4),  "byakuya_shunpo_out_uniform.png")                   # Shunpo dissolve-OUT (2f)
    reslice(R(6),  "byakuya_shunpo_in_uniform.png")                    # Shunpo dissolve-IN (2f)
    reslice(R(49), "byakuya_petalcast_a_uniform.png")                  # Petal Cast — arm-raise windup (4f)
    reslice(R(51), "byakuya_petalcast_b_uniform.png")                  # Petal Cast — cape flourish -> point (5f)
    reslice(R(14), "byakuya_thrust_uniform.png")                       # Straight Thrust — forward lunge stab (8f)
    reslice(R(18), "byakuya_rising_uniform.png")                       # Rising Slash — launcher (9f)
    reslice(R(37), "byakuya_reform_vanish_uniform.png", minw=20)       # Utsusemi vanish — stand -> dissolve (6 char frames; petals dropped)
    reslice(R(39), "byakuya_reform_overhead_uniform.png")             # re-form OVERHEAD cut strike (7f)
    reslice(R(46), "byakuya_reform_thrust_uniform.png")               # re-form HORIZONTAL thrust strike (7f)
    reslice(R(29), "byakuya_jumpslash_uniform.png")                   # air — Jump Slash (7f)
    reslice(R(27), "byakuya_airvault_uniform.png")                    # air — Airborne Vault (7f)
    #  -- FX overlays (frame-locked energy streaks / petal rings) --
    reslice(R(15), "byakuya_thrust_fx_uniform.png",  minw=20)         # Straight Thrust peak streak FX
    reslice(R(19), "byakuya_rising_fx_uniform.png",  minw=15)         # Rising Slash energy FX
    reslice(R(5),  "byakuya_petal_fx_uniform.png",   minw=15)         # Senbonzakura petal ring (Shunpo + Petal Cast overlay)
    reslice(R(41), "byakuya_reform_petal_fx_uniform.png", minw=15)    # re-form petal burst FX
    reslice(R(30), "byakuya_jumpslash_fx_uniform.png", minw=15)       # Jump Slash energy FX
    #  -- petal projectile sprite (compact cluster cropped from the petal ring) --
    crop_frame(R(5), "byakuya_petal_proj_uniform.png", (151, 37, 236, 90))   # petal cluster (Petal Cast projectile — row_05 first ring frame)

    # ── STAGE 5 — BANKAI: "Senbonzakura Kageyoshi" (2-phase inline freeze cinematic). Rows 52-57 are the tall
    # 184px Bankai block. The CHARACTER poses (52/56/57 char frames) have inkY≈82-180 → bbox-crop bottom-aligns
    # them to feet like any sprite (NO special anchor needed). The blue reiatsu WINGS (54/55) + BLAST (57 f2-3)
    # are drawn as cinematic OVERLAYS (drawByakuyaBankaiCinematic) positioned relative to the body, so the
    # "not-floor-anchored" FX space is handled in the draw call, not the sprite handler. row_56/57 are NOT
    # per-frame precomposited (Stage-0 finding) → char & FX are SEPARATE frames, split here by `pick`.
    reslice(R(52), "byakuya_bankai_charge_uniform.png")                       # Phase 1 — charge stance (5 char frames)
    reslice(R(56), "byakuya_bankai_transform_uniform.png", pick=[0, 1])       # Phase 2 — Bankai transform pose (char, 2f)
    reslice(R(57), "byakuya_bankai_thrust_uniform.png",   pick=[0, 1, 4, 5])  # Phase 2 — release thrust (char, 4f)
    #  -- cinematic FX overlays (blue reiatsu wings + Senbonzakura blast) --
    reslice(R(54), "byakuya_bankai_wings_grow_uniform.png", minw=8)           # wings growing (5f, FX)
    reslice(R(55), "byakuya_bankai_wings_full_uniform.png")                   # wings full-size loop (3f, FX)
    reslice(R(57), "byakuya_bankai_blast_uniform.png", pick=[2, 3])           # blue Senbonzakura blast (2f, FX)
