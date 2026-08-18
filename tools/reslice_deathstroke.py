#!/usr/bin/env python3
# Re-slice Deathstroke (Slade Wilson, DC) source ROW strips into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_onoki.py (alpha-gutter frame detect -> per-frame content bbox -> repack into
# one uniform cell: centered-X, BOTTOM-aligned) so a single anchorY: 0 plants feet across every
# standing action. Same band/keep/pick/xrects knobs.
#
# SOURCE FORMAT: 11 numbered ROW strips (deathstroke_row_NN.png), all 1028px wide. Several rows are
# MIXED (multiple sub-animations laid out horizontally) -> those jobs use explicit xrects/keep to carve
# exactly the frames wanted and drop reference/title/portrait clutter. Full pixel audit: DEATHSTROKE_ASSET_MAP.md.
#
# DESIGN (owner-locked 2026-08-17): SINGLE self-contained moveset (no stance toggle). Stage 1 = movement/state.
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

def portrait_box(src, out, box, target_h=288):
    """Upscale an explicit (x0,y0,x1,y1) region to a portrait (nearest-neighbor). Used for the
    dedicated Deathstroke MASK ICON baked into row_01 (a real select-screen portrait, not a body bust)."""
    im = Image.open(src).convert("RGBA")
    crop = im.crop(box)
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size}  (portrait from {src} box {box})")

if __name__ == "__main__":
    # ── STAGE 1 — movement / state ──
    # row_01 is MIXED: 3 idle + 6 walk + 2 crouch character frames (x5..649), then a gun-aim
    # reference pose + the DEATHSTROKE mask-portrait icon + title text (x728..1010) — all excluded
    # except the portrait, which is carved out separately. Explicit xrects carve idle/walk/crouch.
    IDLE   = [(5, 62), (67, 124), (128, 185)]
    WALK   = [(196, 245), (253, 302), (308, 357), (362, 411), (415, 465), (466, 516)]
    CROUCH = [(540, 593), (603, 649)]
    reslice("deathstroke_row_01.png", "deathstroke_idle_uniform.png",   xrects=IDLE)
    reslice("deathstroke_row_01.png", "deathstroke_walk_uniform.png",   xrects=WALK)
    reslice("deathstroke_row_01.png", "deathstroke_crouch_uniform.png", xrects=CROUCH)

    # run — dedicated sprint cycle (row_10 first 6 runs). Excludes the running-slash (runs 6-7, a
    # Stage-4 special) and the turnaround reference (runs 8-11).
    reslice("deathstroke_row_10.png", "deathstroke_run_uniform.png", keep=(0, 5))

    # jump — rising launch (row_03 first 4 runs). fall reuses this sheet (held last frame).
    reslice("deathstroke_row_03.png", "deathstroke_jump_uniform.png", keep=(0, 3))

    # hurt — standing stagger/recoil (row_05 first 3 runs). The prone-fall tail (run 3+) and the gun
    # attack (runs 4-8) are held for later stages; floor recovery is covered by knockdown/getup below.
    reslice("deathstroke_row_05.png", "deathstroke_hurt_uniform.png", keep=(0, 2))

    # knockdown + getup — REAL death/KO art (row_06). runs 0-3 = the forward jump-alt (held in reserve);
    # runs 4-6 = tumble->lie on the ground (knockdown); runs 7-10 = seated->kneel->rise (getup).
    reslice("deathstroke_row_06.png", "deathstroke_knockdown_uniform.png", keep=(4, 6))
    reslice("deathstroke_row_06.png", "deathstroke_getup_uniform.png",     keep=(7, 10))

    # PORTRAIT — the iconic two-tone Deathstroke MASK icon baked into row_01 (x922..963, y40..73),
    # carved above the yellow "DEATHSTROKE" title text. A real portrait asset, not a body bust.
    portrait_box("deathstroke_row_01.png", "deathstroke_portrait.png", (922, 40, 964, 73))

    # ── STAGE 2 — 5 normals + crouch-attack variant (all from the 3 melee art pieces the audit named:
    # row_02 punch combo / row_03 crouch-stab & jump-slash / row_04-bottom roundhouse). ──
    # light  = quick jab (row_02 front half: stance -> straight punch -> recover)
    reslice("deathstroke_row_02.png", "deathstroke_light_uniform.png", keep=(0, 3))
    # heavy  = committed lunge-punch (row_02 back half: windup -> forward thrust -> reset)
    reslice("deathstroke_row_02.png", "deathstroke_heavy_uniform.png", keep=(5, 7))
    # up (LAUNCHER) = roundhouse high-kick (row_04 BOTTOM band, y104..205; the leg swings up). Band-split
    # at y103 (min-fill gutter between the two sub-rows). keep(1,5) = windup -> KICK (wide run 3) -> recover.
    reslice("deathstroke_row_04.png", "deathstroke_up_uniform.png", band=(104, 205), keep=(1, 5))
    # air = overhead jump-slash sword strike (row_03 runs 4-5, sword raised & swung)
    reslice("deathstroke_row_03.png", "deathstroke_air_uniform.png", keep=(4, 5))
    # crouchLight = low forward sword STAB when crouching (row_03 runs 6-10). Auto-swapped by combat.js
    # _setCrouchVariant when holding Down+light (opt-in via the animationData.crouchLight key).
    reslice("deathstroke_row_03.png", "deathstroke_crouchstab_uniform.png", keep=(6, 10))
    # NOTE: down_air REUSES the air sheet (no dedicated downward-aerial art) — HONEST REUSE, flagged in
    # characters.js.

    # ── STAGE 4 — specials (self-contained moveset, owner-locked). row_09 spin-finish is RESERVED for the
    # Stage-5 ULT; row_03 jump-slash is already the Stage-2 air normal — so neither is a special here. ──
    # neutral = Sword Slash (row_07, upward->horizontal arc w/ baked motion-trail)
    reslice("deathstroke_row_07.png", "deathstroke_swordslash_uniform.png")
    # forward = Draw & Cut lunge (row_08, includes the draw as part of the cut)
    reslice("deathstroke_row_08.png", "deathstroke_drawcut_uniform.png")
    # down = Running Slash (row_10 runs 6-7, the diving forward slash out of the run — a dash-in commit)
    reslice("deathstroke_row_10.png", "deathstroke_runslash_uniform.png", keep=(6, 7))
    # air = Aerial Spin (row_04 TOP band, y0..102 — the flip w/ sword drawn; owner-locked = a hitbox attack).
    # keep(0,6) drops a 3px debris sliver at the right edge (bottom-band sword tip poking above the y103 split).
    reslice("deathstroke_row_04.png", "deathstroke_aerialspin_uniform.png", band=(0, 102), keep=(0, 6))
    # back = Gun Shot cast pose (row_05 runs 4-8, the standing pistol aim & fire). Projectile is procedural.
    reslice("deathstroke_row_05.png", "deathstroke_gun_uniform.png", keep=(4, 8))

    # ── STAGE 5 — promoted ULTIMATE "Killing Stroke" (owner decision #2: NO unique ult art exists → promote
    # the row_09 overhead SPIN-FINISH, which already reads as an ender + re-sheathes). Full 6-frame sequence. ──
    reslice("deathstroke_row_09.png", "deathstroke_ult_uniform.png")

    # ── STAGE 6 — WIN pose. No bespoke victory art exists (flagged); repurpose the row_11 sword-DRAW-to-
    # READY stance (runs 0-4: reach→raise→settle into a held guard) — reads as a confident post-fight pose.
    # (row_11 runs 5-9 = unarmed idle-rotation reference, excluded.)
    reslice("deathstroke_row_11.png", "deathstroke_win_uniform.png", keep=(0, 4))
