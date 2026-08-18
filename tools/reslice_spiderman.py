#!/usr/bin/env python3
# Re-slice Spider-Man (Marvel Super Heroes, CPS2 arcade rip by Alvin-Earthworm) source ROW strips
# into CLEAN uniform, feet-aligned cells. Mirrors tools/reslice_onoki.py (alpha-gutter frame detect
# -> per-frame content bbox -> repack into one uniform cell: centered-X, BOTTOM-aligned) so a single
# anchorY: 0 plants feet across every standing action. Same band/keep/pick/xrects/scrub knobs, plus
# an `even` helper for touching-frame strips (crouch-to-stand intro, motion-blur dash, tumble rolls).
#
# SOURCE FORMAT: art arrives as 27 numbered ROW strips (spiderman_row_NN.png), each strip = one (or
# several) animations laid out horizontally. The confirmed SPIDER-MAN DESIGN maps rows -> actions.
# Row 03 (jump) is a SERPENTINE multi-band sheet (Start box -> up the left, across the top band, down
# the bottom band, into a Land box) — so jump = the clean TOP band (airborne rise), fall = the clean
# BOTTOM band (air-tumble -> dive). The Start/Land text boxes are avoided by explicit xrects.
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
        if maxy < miny:      # empty slice (shouldn't happen) — skip
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
    # idle — row 01, 10-frame crouched-stance breathing loop (clean gutters).
    dict(src="spiderman_row_01.png", out="spiderman_idle_uniform.png"),
    # intro — row 02, crouch-to-stand transition. Frames TOUCH (no gutter) -> even 12-split.
    dict(src="spiderman_row_02.png", out="spiderman_intro_uniform.png", xrects=even(0, 888, 12)),
    # walk — row 07, bracketed loop segment. Take the 8 clean 100px loop frames (skip wide lead-in/out).
    dict(src="spiderman_row_07.png", out="spiderman_walk_uniform.png", pick=[2, 3, 4, 5, 6, 7, 8, 9]),
    # jump — row 03 TOP band (airborne rise). Split the merged mid triple; avoid Start-box sliver.
    dict(src="spiderman_row_03.png", out="spiderman_jump_uniform.png", band=(0, 128),
         xrects=[(116,179),(194,276),(288,386),(396,497),(498,599),(600,700),
                 (706,804),(812,919),(926,1027),(1035,1134)]),
    # fall — row 03 BOTTOM band (air-tumble -> righting dive). Avoid Land-box outline runs.
    dict(src="spiderman_row_03.png", out="spiderman_fall_uniform.png", band=(259, 388),
         xrects=[(115,194),(206,291),(305,390),(403,460),(486,538),(578,623),
                 (638,699),(723,774),(784,921),(922,1059),(1064,1148)]),
    # dash — row 20 leftmost motion-blur lean pose (character-only; the spin-punch content is a Stage-3 special).
    dict(src="spiderman_row_20.png", out="spiderman_dash_uniform.png", xrects=[(0, 158)]),
    # ground roll FORWARD — row 08 roll region (right half; frames touch) -> even 7-split.
    dict(src="spiderman_row_08.png", out="spiderman_rollf_uniform.png", xrects=even(647, 1628, 7)),
    # ground roll BACKWARD — row 22, 6 clean mid roll frames.
    dict(src="spiderman_row_22.png", out="spiderman_rollb_uniform.png", pick=[2, 3, 4, 5, 6, 7]),
    # win / taunt — row 24 glow-FX victory pose (11 clean frames; drop leading crouch + trailing merged).
    dict(src="spiderman_row_24.png", out="spiderman_win_uniform.png", pick=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),

    # ── STAGE 2 JOBS: normals / command chain / Ground Crawl ─────────────────────
    # LIGHT — row 04 punch-combo string (jab → cross → lunge), 5 frames, touch → even-split.
    dict(src="spiderman_row_04.png", out="spiderman_light_uniform.png", xrects=even(0, 628, 5)),
    # HEAVY — row 04's RISING SPIN-KICK launcher (windup → spinning leg-sweep → apex). Grounded launcher.
    dict(src="spiderman_row_04.png", out="spiderman_heavy_uniform.png",
         xrects=[(760,899),(917,1012),(1025,1098),(1116,1189),(1196,1272),(1290,1450)]),
    # UP — row 05 frames 1-4: rising reach → spin (a VERTICAL launcher, distinct from the grounded heavy).
    dict(src="spiderman_row_05.png", out="spiderman_up_uniform.png",
         xrects=[(0,99),(108,201),(211,320),(321,436),(445,567)]),
    # AIR — row 05 frames 4-8: the curled AERIAL SPIN-KICK combo.
    dict(src="spiderman_row_05.png", out="spiderman_air_uniform.png",
         xrects=[(445,567),(573,647),(659,734),(739,814),(822,930)]),
    # DOWN-AIR — row 12 diving spin: leap → head-down curl → curled spin-dive (spike-shaped, downward).
    dict(src="spiderman_row_12.png", out="spiderman_downair_uniform.png",
         xrects=[(300,407),(408,540),(546,635),(636,723),(729,803)]),
    # COMMAND NORMAL (Fwd+Heavy) — row 11 "Jump Attack Combo": running-leap → spinning punch/kick w/ arc trail.
    # A continuous cancelable string (single committed command normal). Frames flow → even 9-split.
    dict(src="spiderman_row_11.png", out="spiderman_cmdchain_uniform.png", xrects=even(0, 1047, 9)),
    # GROUND CRAWL (evasive) — row 09 low all-fours crawl loop (sustained low-profile reposition state).
    dict(src="spiderman_row_09.png", out="spiderman_crawl_uniform.png", xrects=even(0, 890, 7)),
    # KICK-UP (crawl exit payoff) — row 10 frames 1-5: low crouch → legs-up handstand kick.
    dict(src="spiderman_row_10.png", out="spiderman_kickup_uniform.png",
         xrects=[(0,81),(88,175),(200,340),(341,426),(430,511)]),

    # ── STAGE 3 JOBS: 5 specials (web + mobility) ────────────────────────────────
    # WEB IMPACT cast — row 16 char windup→throw (short-range quick web), 6 clean frames.
    dict(src="spiderman_row_16.png", out="spiderman_webimpact_uniform.png", pick=[0, 1, 2, 3, 4, 5]),
    # WEB IMPACT projectile FX — row 16 small web-puff frames (the impact puff), even 4-split of the FX region.
    dict(src="spiderman_row_16.png", out="spiderman_webpuff_uniform.png", band=(0, 74), xrects=even(880, 1005, 4)),
    # WEB THROW cast — row 18 the big committed crouched THROW pose (signature; the web line trails from his hand).
    dict(src="spiderman_row_18.png", out="spiderman_webthrow_uniform.png", band=(0, 137), xrects=[(0, 205)]),
    # WEB THROW projectile FX — row 18 the spiky spinning WEB-BALL at the line's tip.
    dict(src="spiderman_row_18.png", out="spiderman_webball_uniform.png", band=(0, 50), xrects=[(1316, 1388)]),
    # WEB-THROW COMBO-CANCEL BRIDGE — row 15 bottom-band fanning WEB-NET windup (5 frames): the cancel pose FROM
    # the spiderCombo chain INTO Web Throw.
    dict(src="spiderman_row_15.png", out="spiderman_webbridge_uniform.png", band=(227, 343),
         xrects=[(2,100),(111,210),(222,323),(333,434),(440,541)]),
    # DASH ATTACK — row 20's spin-punch content (distinct from the dash-movement frame): windup→spinning strike→
    # recovery. Rushdown gap-closer. Even 6-split of the post-dash region.
    dict(src="spiderman_row_20.png", out="spiderman_dashatk_uniform.png", xrects=even(756, 1469, 6)),
    # HANDSTAND FLIP KICK — row 23: dash → handstand → flip kick → land crouch (10 frames).
    dict(src="spiderman_row_23.png", out="spiderman_handstand_uniform.png", pick=[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),

    # ── STAGE 4 JOB: ULTIMATE FX ────────────────────────────────────────────────
    # "MAXIMUM WEB" cinematic FX — row 17 TOP band: the big EXPANDING WEB-NET/COCOON (8 growing frames). The
    # Stage-0 escalation reservoir — cycled + grown over the opponent by drawSpidermanMaxWebCinematic (game.js).
    dict(src="spiderman_row_17.png", out="spiderman_maxweb_uniform.png", band=(0, 140),
         xrects=[(2,88),(107,197),(209,305),(320,411),(433,545),(567,679),(705,849),(871,1037)]),
]

if __name__ == "__main__":
    only = set(sys.argv[1:])
    for j in JOBS:
        if only and j["out"].replace("spiderman_", "").replace("_uniform.png", "") not in only and j["out"] not in only:
            continue
        reslice(**j)
