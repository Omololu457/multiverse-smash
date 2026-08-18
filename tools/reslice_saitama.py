#!/usr/bin/env python3
# Re-slice Saitama (One-Punch Man) source strips into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_isshiki.py (alpha-gutter frame detect -> per-frame content bbox ->
# repack into one uniform cell: centered-X, BOTTOM-aligned) so a single anchorY: 0 plants
# feet across every standing action. Adds the same band/keep/pick/xrects/keyblack knobs.
#
# Per the SAITAMA design doc file-handling notes:
#  - walk.png: its 4th run (142-260, 119px) is 3 FUSED walk-cycle frames with NO internal
#    alpha seam -> hand-authored xrects split it into 3, yielding the master sheet's 6 frames.
#  - intro_3.png: run 0 is a 1px debris frame -> keep=(1,10) drops it (10 real frames).
# Writes saitama_<name>_uniform.png. Prints the animationData frames/width/height.
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

def reslice(src, out, band=None, keep=None, pick=None, xrects=None, keyblack=None, scrub=None):
    im = Image.open(src).convert("RGBA"); W, H = im.size
    if scrub is not None:            # clear baked-in label/annotation rects (e.g. super_punches' "BD" text)
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
    """Concatenate several already-resliced uniform strips into ONE feet-aligned strip.
    Each part is (src, nframes). Every frame is re-bottom-aligned into a common (maxW x maxH)
    cell so a single anchorY: 0 plants feet across the whole stitched sequence."""
    cells = []
    for src, n in parts:
        im = Image.open(src).convert("RGBA"); W, H = im.size; cw = W // n; px = im.load()
        for i in range(n):
            # content bbox within this cell (trim the uniform padding back to real pixels)
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

if __name__ == "__main__":
    # ── STAGE 1 — movement / state + 3-part intro ──
    JOBS = [
        ("saitama_idle.png",  "saitama_idle_uniform.png",  None, None, None),   # 5 cells
        ("saitama_dash.png",  "saitama_dash_uniform.png",  None, None, None),   # 2 cells
        ("saitama_jump.png",  "saitama_jump_uniform.png",  None, None, None),   # 8 cells
        ("saitama_block.png", "saitama_block_uniform.png", None, None, None),   # 3 cells
        ("saitama_hit.png",   "saitama_hit_uniform.png",   None, None, None),   # 5 cells
        # 3-part intro (play in order): getup -> run-backwards -> settle-to-idle
        ("saitama_intro.png",                 "saitama_intro_uniform.png",  None, None, None),   # 4 cells (getup-from-lying)
        ("saitama_intro_2_run_back_wards.png","saitama_intro2_uniform.png", None, None, None),   # 5 cells (run backwards)
        # intro_3: 11 runs = [1px debris, 14px streak, 15px streak, then 8 real character poses].
        # Drop the debris AND the 2 tall vertical FX streaks (14/15px wide) that are NOT poses -> 8 char cells.
        ("saitama_intro_3.png","saitama_intro3_uniform.png", None, None, [3, 4, 5, 6, 7, 8, 9, 10]),
    ]
    for src, out, band, keep, pick in JOBS:
        reslice(src, out, band, keep, pick)
    # walk.png: runs [(4,47),(53,91),(95,128),(142,260)]; the 119px 4th run is 3 fused walk frames
    # with NO internal alpha seam -> split evenly into 3 -> master sheet's confirmed 6 frames.
    reslice("saitama_walk.png", "saitama_walk_uniform.png",
            xrects=[[4, 47], [53, 91], [95, 128], [142, 181], [182, 221], [222, 260]])
    # ── 3-part intro stitched into ONE ordered strip: getup(4) -> run-backwards(5) -> settle(8) = 17f ──
    stitch([("saitama_intro_uniform.png", 4), ("saitama_intro2_uniform.png", 5),
            ("saitama_intro3_uniform.png", 8)], "saitama_intro_full_uniform.png")

    # ── STAGE 2 — 5 normals + grab (single-row, clean gutters) ──
    STAGE2 = [
        ("saitama_basic_kick.png",       "saitama_light_uniform.png",   None, None, None),  # 7f  -> light
        ("saitama_punches.png",          "saitama_heavy_uniform.png",   None, None, None),  # 8f  -> heavy (canonical over punch_1 subset)
        ("saitama_up_attack.png",        "saitama_up_uniform.png",      None, None, None),  # 6f  -> up (launcher)
        ("saitama_air_punch_part_1.png", "saitama_air_uniform.png",     None, None, None),  # 6f  -> air
        ("saitama_air_punch_part_2.png", "saitama_downair_uniform.png", None, None, None),  # 3f  -> down_air (spike)
        ("saitama_grab.png",             "saitama_grab_uniform.png",    None, None, None),  # 7f  -> grab (separate throw input)
    ]
    for src, out, band, keep, pick in STAGE2:
        reslice(src, out, band, keep, pick)
    # ── STAGE 2 command-normal chain — turn_puch.png "Spin-Punch" cancelable 3-stage rekka. The RAW first
    # run (x3-103, 101px) is 3 FUSED poses (stand -> turn -> cape) with thin 1px seams at x~24-34 / ~56-68
    # -> hand-authored xrects re-split it. Full 14 poses split into opener(5) / mid(5) / finisher(4).
    TURN = [[3, 23], [34, 55], [68, 103],                                             # fused first run -> 3
            [117, 156], [164, 201], [212, 242], [262, 297], [305, 345],               # runs 1-5
            [360, 411], [419, 469], [472, 521], [527, 569], [576, 612], [623, 644]]   # runs 6-11
    reslice("saitama_turn_puch.png", "saitama_turn1_uniform.png", xrects=TURN[0:5])   # opener  (5f)
    reslice("saitama_turn_puch.png", "saitama_turn2_uniform.png", xrects=TURN[5:10])  # mid     (5f)
    reslice("saitama_turn_puch.png", "saitama_turn3_uniform.png", xrects=TURN[10:14]) # finisher(4f)

    # ── STAGE 3 — tiered tap/hold punch-combo special. normal_punches = "Consecutive Normal Punches 10x"
    # (tap tier); super_punches = "20x" (hold tier). consecutive_pucnhes / super_pucnh are redundant
    # subsets (design doc) → NOT imported. super_punches' 11th run is an 11px end-fragment → drop (keep 12).
    reslice("saitama_normal_punches.png", "saitama_combo10_uniform.png", None, None, None)          # 11f -> tap tier (10x)
    # 13 runs; drop 11px tail -> 12f. scrub the baked-in "BD" label (y7-16 top-left of frame 0; char starts y41).
    reslice("saitama_super_punches.png",  "saitama_combo20_uniform.png", band=None, keep=(0, 11), scrub=[(0, 0, 30, 38)])

    # ── STAGE 4 — 6 specials (+ Side Hop). Per design file-handling notes. ──
    # 1) HEADBUTT: head_butt.png = 13 runs; runs 0-5 are the CHARACTER poses, runs 6-12 (7-23px) are the
    #    detached FX layer (NOT poses) -> keep only the 6 char poses.
    reslice("saitama_head_butt.png", "saitama_headbutt_uniform.png", keep=(0, 5))                        # 6f char
    # 2) TWO-HANDED PUNCHES: two_haded_punches.png (11 wide FX-complete frames) is the full swing; its
    #    part2 (489px fused FX burst) is a decorative impact tail (deferred, held-in-reserve).
    reslice("saitama_two_haded_punches.png", "saitama_twohand_uniform.png", None, None, None)            # 11f
    # 3) SERIOUS PUNCH (melee) = meateor_punch.png (25 runs; run 1 = 8px debris -> drop = 24f full windup->impact).
    reslice("saitama_meateor_punch.png", "saitama_serious_uniform.png", pick=[0] + list(range(2, 25)))   # 24f melee
    #    SERIOUS PUNCH (projectile) = the traveling shockwave (separate ranged hitbox).
    reslice("saitama_serious_punch_projectile.png", "saitama_serious_proj_uniform.png", None, None, None) # 4f shockwave
    # 4) UP->DOWN COMBO: super_up_attack_to_down_attack_combo.png (11 runs; four 1px debris runs at 1,2,3,8) -> 7 real.
    reslice("saitama_super_up_attack_to_down_attack_combo.png", "saitama_updown_uniform.png", pick=[0, 4, 5, 6, 7, 9, 10])  # 7f
    # 5) TODAY IS BARGAIN SALE.
    reslice("saitama_the_bargin_specail_up_attack.png", "saitama_bargain_uniform.png", None, None, None) # 12f
    # 6) SERIOUS TABLE FLIP.
    reslice("saitama_table_flip.png", "saitama_tableflip_uniform.png", None, None, None)                 # 10f
    # 7) SIDE HOP (evasive).
    reslice("saitama_side_hops.png", "saitama_sidehop_uniform.png", None, None, None)                    # 7f

    # ── STAGE 5 — DEATH PUNCH ultimate poses (charge -> impact). The hi-res backdrop
    # (death_punch_backround_effect.png, 663x196) is a DIFFERENT art pipeline = a FULLSCREEN screen-space
    # overlay, NOT sprite-sliced (design file-handling note) -> used raw by drawSaitamaDeathPunchCinematic.
    reslice("saitama_death_punch_ultimate_part_1.png", "saitama_death1_uniform.png", None, None, None)   # 7f charge windup
    reslice("saitama_death_punch_ultimate_part_2.png", "saitama_death2_uniform.png", None, None, None)   # 8f impact/recovery

    # ── STAGE 6 — PORTRAIT (no dedicated mugshot art) → bust cropped from idle frame 0, upscaled
    # nearest-neighbor (jason/isshiki/zenitsu precedent). Head + upper torso (top ~62% of the body).
    def make_portrait(src, out, target_h=288):
        im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
        col = [sum(1 for y in range(H) if px[x, y][3] > ALPHA) for x in range(W)]
        x0 = next(x for x in range(W) if col[x] > 0)
        x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
        ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
        y0, y1 = min(ys), max(ys)
        bust_h = int((y1 - y0 + 1) * 0.62)                       # head + upper torso
        crop = im.crop((x0, y0, x1 + 1, y0 + bust_h))
        scale = target_h / crop.height
        big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
        big.save(out)
        print(f"OK {out}: {big.size} (bust from {src} frame 0)")
    make_portrait("saitama_idle.png", "saitama_portrait.png")
