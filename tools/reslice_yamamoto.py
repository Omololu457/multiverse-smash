#!/usr/bin/env python3
# Re-slice YAMAMOTO GENRYUSAI (Bleach, Captain-Commander) CLEANED row strips (yamamoto_clean/, produced
# by tools/prep_yamamoto.py Stage 0) into clean uniform, feet-aligned cells. Mirrors reslice_onoki.py
# (alpha-gutter frame detect -> per-frame content bbox -> repack into one uniform cell: centered-X,
# BOTTOM-aligned) so a single anchorY:0 plants feet across every standing action.
#
# ★ LAYER COMPOSITING: this character is drawn as BODY + PROP(cane) + FIRE on SEPARATE rows with NO
# stored X/Y offsets. Confirmed (Stage 1 proof) that the paired rows SHARE the original coordinate grid
# -> compositing them at NATIVE coords (alpha_composite at 0,0) lands the cane in the hand / the fire on
# the blade automatically. So `composite_reslice([body,prop,fire], out)` flattens the layers FIRST, then
# reslices the flattened strip into uniform cells. This is the "hand-align via blade-vector anchor"
# result the design asks for, achieved because the source preserved the shared grid.
import sys
from PIL import Image

ALPHA = 16
SRC = "yamamoto_clean/row_%02d.png"


def runs_of(px, W, y0, y1):
    col = [any(px[x, y][3] > ALPHA for y in range(y0, y1 + 1)) for x in range(W)]
    out = []; s = -1
    for x in range(W):
        if col[x]:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, W - 1])
    return out


def _reslice_im(im, out, keep=None, pick=None, minw=6, pad_to=None, gap=1):
    """Core: frame-detect (alpha column runs) an already-flattened RGBA image, repack uniform+feet-aligned."""
    W, H = im.size; px = im.load()
    runs = runs_of(px, W, 0, H - 1)
    runs = [r for r in runs if (r[1] - r[0] + 1) >= minw]     # drop sub-minw debris slivers
    if keep is not None: runs = runs[keep[0]:keep[1] + 1]
    if pick is not None: runs = [runs[i] for i in pick]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = H, -1
        for y in range(H):
            if any(px[x, y][3] > ALPHA for x in range(rx0, rx1 + 1)):
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
        strip.paste(cell, (i * uW + (uW - sw) // 2, uH - sh - gap), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH


def flatten(rows):
    """Alpha-composite several cleaned rows at NATIVE coords into one RGBA canvas (shared grid)."""
    ims = [Image.open(SRC % r).convert("RGBA") for r in rows]
    W = max(i.width for i in ims); H = max(i.height for i in ims)
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for im in ims:
        base.alpha_composite(im, (0, 0))
    return base


def reslice(row, out, **kw):
    return _reslice_im(Image.open(SRC % row).convert("RGBA"), out, **kw)


def composite_reslice(rows, out, **kw):
    return _reslice_im(flatten(rows), out, **kw)


def make_portrait(src_strip, out, target_h=288, bust=0.62):
    """Bust portrait from a resliced strip's frame 0 (head + upper torso), upscaled nearest-neighbor."""
    im = Image.open(src_strip).convert("RGBA"); W, H = im.size; px = im.load()
    col = [any(px[x, y][3] > ALPHA for y in range(H)) for x in range(W)]
    x0 = next(x for x in range(W) if col[x])
    x1 = next((x for x in range(x0, W) if not col[x]), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    crop = im.crop((x0, y0, x1 + 1, y0 + int((y1 - y0 + 1) * bust)))
    scale = target_h / crop.height
    crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST).save(out)
    print(f"OK {out}: bust from {src_strip} frame 0")


if __name__ == "__main__":
    # ── STAGE 1 — registration + movement / state (BODY+PROP composites) ──
    composite_reslice([5, 6],      "yamamoto_idle_uniform.png")    # idle  = body 05 + cane 06 (6f)
    composite_reslice([8, 9],      "yamamoto_walk_uniform.png")    # walk  = body 08 + cane 09 (8f)
    composite_reslice([10, 11, 12],"yamamoto_dash_uniform.png")    # dash  = body 10 + cane 11 (+12 terminal)
    # turnaround (row 07): back-facing body frames INTERLEAVED with standalone cane slivers at other X.
    # The wide body runs already hold the cane in-hand; keep only body frames (minw drops the slivers).
    reslice(7, "yamamoto_turn_uniform.png", minw=30)               # back-facing turnaround (body frames)

    make_portrait("yamamoto_idle_uniform.png", "yamamoto_portrait.png")

    # ── STAGE 2 — guard / hit reactions / knockdown / intro ──
    # ★ PARTITION CORRECTION (rows 19-24 were the audit's LOWEST-confidence read): the audit tagged row 19
    # as block/recoil, but visual inspection shows row 19 is a DYNAMIC hit-recoil ARC (stand→torso-back→
    # arms-wide→hunch→recover), NOT a static block. Rows 33+34 are the true GUARD — a clean BODY+CANE pair
    # (braced defensive stance, sword held forward). So guard = composite(33,34); row 19 is left banked.
    composite_reslice([33, 34], "yamamoto_guard_uniform.png")      # guard/block = braced stance (6f)
    # hurt (grounded flinch) = row 22 (LIGHT hit — quick forward hunch; lower opaque-coverage than row 21's
    # deeper backward recoil, matching the audit's "shallower" read). Row 21 (heavy recoil) is banked: the
    # engine drives ONE grounded hurt, and heavy/combo-finisher hits already route to the knockdown pose.
    reslice(22, "yamamoto_hurt_uniform.png", minw=30)             # light hit flinch (body frames)
    # hurt_air = row 23 airborne tumble (body rotates through the air; engine picks this when airborne+hitstun)
    reslice(23, "yamamoto_hurt_air_uniform.png", minw=30)         # airborne tumble (6 rotating body frames)
    # knockdown/getup = row 24, a complete face-down → prone → push-up → kneel → rise sequence. Split so the
    # engine's get-up CHAIN plays the DOWN pose while sprawled, then the RISE pose while recovering, then idle.
    reslice(24, "yamamoto_knockdown_uniform.png", minw=28, pick=[0, 1])   # DOWN: face-down + prone
    reslice(24, "yamamoto_getup_uniform.png",     minw=28, pick=[2, 3, 4]) # RISE: push-up → kneel → rise
    # intro (13-frame): back-to-camera → arms spread into haori-wing flare → turn → blade drawn → settle.
    # BODY(25) + CANE(26) composite at native coords; hands off cleanly to idle (game.js introPool: ["intro"]).
    composite_reslice([25, 26], "yamamoto_intro_uniform.png")

    # ── STAGE 3 — 5 normals + command-normal chain ──
    # POKE normals (rows 71/72/77): full-height body runs = the attack frames (weapon in-hand); the tiny
    # floating cane/debris bits (w<=18) are dropped by minw. FIRE normals (up/air/chain): the body rows are
    # clean, so composite the FIRE-crescent partner at native coords — the flame shares the body's grid and
    # merges into each active frame (the fire IS the extended hit visual).
    reslice(71, "yamamoto_light_uniform.png",  minw=30)            # light  — short poke (row 71)
    reslice(72, "yamamoto_heavy_uniform.png",  minw=30)            # heavy  — committed low crouch attack (row 72)
    reslice(77, "yamamoto_downair_uniform.png",minw=30)            # down_air — crouching sweep / low spike (row 77)
    composite_reslice([59, 61], "yamamoto_up_uniform.png",   minw=16)   # up (launcher) — rising anti-air slash + fire (59+61)
    composite_reslice([45, 47], "yamamoto_air_uniform.png",  minw=16)   # air — diagonal overhead slash + fire crescent (45+47)
    composite_reslice([36, 38], "yamamoto_chain_uniform.png",minw=16)   # command chain — 11f multi-slash + fire (36+38)

    # ── STAGE 4 — 5 specials (Body + Prop + Fire composites; beam = a REAL projectile) ──
    # Ground-Sweep Beam: cast pose (row 39 body) + a travelling BEAM projectile sprite (row 43 fire crescent).
    reslice(39, "yamamoto_beam_cast_uniform.png", minw=30)         # beam cast pose (10f body)
    reslice(43, "yamamoto_beam_proj_uniform.png", minw=20)         # beam projectile (6f fire) — travels w/ real range
    # Ground Eruption Stab: blade into ground + UPWARD flame fan (row 57 is empty → 56+58 body+fire AOE).
    composite_reslice([56, 58], "yamamoto_eruption_uniform.png", minw=16)
    # Horizontal Thrust: long-active double-wing pose + fire (62+64); frames 2-9 near-static = long active window.
    composite_reslice([62, 64], "yamamoto_thrust_uniform.png",   minw=16)
    # Large Ground-Stab (FLAGSHIP): biggest fire — the 90px flame crescent (65 body + 69 big fire).
    composite_reslice([65, 69], "yamamoto_stab_uniform.png",     minw=16)
    # Overhead Slam: heavy vertical + symmetric double-wing haori flare on impact (29/30 empty → 27+31).
    composite_reslice([27, 31], "yamamoto_overhead_uniform.png", minw=12)

    # ── STAGE 5 — Shunpo (Flash Step) — vanish / reappear FX (shared teleport-behind architecture) ──
    # Vanish  = body dissolves into cyan scanlines (row 13) + contracting air-pressure ring (row 14).
    # Reappear = scattered→SOLID arrival (row 16; confirmed left-to-right = arrival, do NOT play reversed)
    #            + expanding ring (row 17). Cane rows 15/18 are "mostly empty by design" → omitted.
    composite_reslice([13, 14], "yamamoto_shunpo_out_uniform.png", minw=10)   # vanish (dissolve + ring)
    composite_reslice([16, 17], "yamamoto_shunpo_in_uniform.png",  minw=10)   # reappear (arrival + ring)

    # ── STAGE 6 — ULTIMATE: Overhead Slam (heavy variant) — the denser/more-flared duplicate of the
    # Stage-4 Overhead Slam special (row 27), escalated: row 87 (dense body) + row 89 (bigger fire flare).
    # Played on the LIVE fighter through a freeze/camera cinematic (no dup instance).
    composite_reslice([87, 89], "yamamoto_ult_uniform.png", minw=10)
