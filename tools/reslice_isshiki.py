#!/usr/bin/env python3
# Re-slice Isshiki Otsutsuki source strips into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_jason.py (alpha-gutter frame detect -> per-frame content
# bbox -> repack into one uniform cell: centered-X, BOTTOM-aligned), and ADDS a
# `band=(y0,y1)` crop so a single multi-ROW sheet (hit_sheet) can be split into its
# several distinct real actions before slicing (per the ISSHIKI design doc mixed-file
# warning). `keep=(i,j)` selects a contiguous cell sub-range within a band.
# Writes isshiki_<name>_uniform.png. Prints the animationData frames/width/height.
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

def reslice(src, out, band=None, keep=None, pick=None, xrects=None, keyblack=None):
    im = Image.open(src).convert("RGBA"); W, H = im.size
    if keyblack is not None:        # alpha-key the black-box background (fire FX): drop pixels whose
        px = im.load()              # brightest channel is below `keyblack` (dark bg → transparent).
        for y in range(H):
            for x in range(W):
                r, g, b, a = px[x, y]
                if a > 0 and max(r, g, b) < keyblack: px[x, y] = (0, 0, 0, 0)
    px = im.load()
    y0, y1 = (0, H - 1) if band is None else band
    if xrects is not None:          # hand-authored x-ranges (cubes/fire have NO clean alpha gutters)
        runs = [list(r) for r in xrects]
    else:
        runs = runs_of(px, 0, W - 1, y0, y1)
        if keep is not None:
            runs = runs[keep[0]:keep[1] + 1]
        if pick is not None:        # explicit cell indices (drop e.g. a detached-FX cell mid-row)
            runs = [runs[i] for i in pick]
    # per-frame content bbox (y scanned within the band + the run's x-range)
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

if __name__ == "__main__":
    # (src, out, band, keep, pick)
    JOBS = [
        # ── movement / state (single-row, clean gutters) ──
        ("isshiki_otsutsuki_idle.png",  "isshiki_idle_uniform.png",  None, None, None),   # 1 cell
        ("isshiki_otsutsuki_intro.png", "isshiki_intro_uniform.png", None, None, None),   # 4-cell grow 5->11->21->42
        ("isshiki_otsutsuki_dash.png",  "isshiki_dash_uniform.png",  None, None, None),   # 3 cells
        ("isshiki_otsutsuki_jump.png",  "isshiki_jump_uniform.png",  None, None, None),   # 3 cells
        ("isshiki_otsutsuki_block.png", "isshiki_block_uniform.png", None, None, None),   # 1 cell
        ("isshiki_otsutsuki_win.png",   "isshiki_win_uniform.png",   None, None, None),   # 1 cell
        # ── hit_sheet: ONE file baking 5 distinct real actions (design-doc mixed-file warning) ──
        # band y-ranges from tools grid-scan. Mapped to the engine's real hit-state slots
        # (hurt / hurt_air / knockdown / getup) plus the Sukunahikona evasive shrink sub-action.
        ("isshiki_otsutsuki_hit_sheet.png", "isshiki_hurt_uniform.png",         (22, 93),   None,   None),  # ROW1: standing hit-recoil (2f) -> hurt
        ("isshiki_otsutsuki_hit_sheet.png", "isshiki_hurt_air_uniform.png",     (125, 198), None,   None),  # ROW2: airborne tumble (5f, ONE escalating sequence) -> hurt_air
        ("isshiki_otsutsuki_hit_sheet.png", "isshiki_knockdown_uniform.png",    (214, 278), (0, 1), None),  # ROW3 cells 0-1: grounded lying knockdown (2f) -> knockdown
        ("isshiki_otsutsuki_hit_sheet.png", "isshiki_sukunahikona_uniform.png", (214, 278), (2, 5), None),  # ROW3 cells 2-5: Sukunahikona shrink-to-dot / vanish (4f)
        ("isshiki_otsutsuki_hit_sheet.png", "isshiki_getup_uniform.png",        (214, 278), (6, 9), None),  # ROW3 cells 6-9: regrow -> standing recovered (4f) -> getup
        # ── STAGE 2 GROUND COMBO CHAIN — attacks_base.png (3/2/5 rows). One continuous Light-button
        # rekka: ground1 punches (opener) -> ground2 kick (mid) -> ground3 low-string+slash (finisher).
        # Rows 2 & 3 have NO clean alpha gutter (kick leg overlaps) -> hand-picked y-split at 167.
        ("isshiki_otsutsuki_attacks_base.png", "isshiki_ground1_uniform.png", (12, 85),   None, None),  # ROW1: 3 punch frames (opener)
        ("isshiki_otsutsuki_attacks_base.png", "isshiki_ground2_uniform.png", (95, 166),  (0, 1), None),  # ROW2: 2 kick frames (mid); keep drops 2 stray sub-10px leg/FX fragments
        ("isshiki_otsutsuki_attacks_base.png", "isshiki_ground3_uniform.png", (167, 246), None, None),  # ROW3: 5 low-strike + slash-arc frames (finisher)
        # ── STAGE 2 AIR COMBO CHAIN — air_attacks.png (3/3/2 rows). 3-stage air rekka; the detached
        # slash-FX cell (row1 x152-171, ~20px) is EXCLUDED from the character loop via pick=[0,1,3].
        ("isshiki_otsutsuki_air_attacks.png", "isshiki_air1_uniform.png", (1, 77),    None, [0, 1, 3]),  # ROW1: 3 char frames (FX cell 2 dropped) — air opener
        ("isshiki_otsutsuki_air_attacks.png", "isshiki_air2_uniform.png", (88, 157),  None, None),        # ROW2: 3 aerial frames (mid)
        ("isshiki_otsutsuki_air_attacks.png", "isshiki_air3_uniform.png", (164, 231), None, None),        # ROW3: 2 dive-slash frames (finisher)
    ]
    for src, out, band, keep, pick in JOBS:
        reslice(src, out, band, keep, pick)

    # ── STAGE 3 — 4 CORE SPECIALS (char-layer + FX-layer split; hand-authored rects for cubes/fire). ──
    # NOTE: specail_1's row2 is a baked-in TEXT LABEL ("cancels any moves…"), NOT frames → excluded (band ends at 93).
    # 1) SUKUNAHIKONA (specail_1): 2 char cast poses + 4 collapsing-ring FX frames.
    reslice("isshiki_otsutsuki_specail_1.png", "isshiki_suku_cast_uniform.png",  band=(15, 93), pick=[0, 1])          # char cast (2f) — shared generic cast pose
    reslice("isshiki_otsutsuki_specail_1.png", "isshiki_suku_rings_uniform.png", band=(15, 93), pick=[2, 3, 4, 5])    # collapsing yellow rings (4f) FX
    # 2) DAIKOKUTEN RODS (specail_2): unique strike poses (cells 3-5) + rod-bar FX (cell 2). Cells 0,1 DUP specail_1 → not re-imported.
    reslice("isshiki_otsutsuki_specail_2.png", "isshiki_rod_cast_uniform.png", band=(9, 83), pick=[3, 4, 5])          # rod strike poses (3f)
    reslice("isshiki_otsutsuki_specail_2.png", "isshiki_rod_fx_uniform.png",   band=(9, 83), pick=[2])                # black-rod bars (1f) FX
    # 3) DAIKOKUTEN CUBES (specail_3): FX-only, red/black cubes — NO clean gutters → hand-authored x-rects.
    #    The 3 RIGHT cubes clear the 2 char figures (x<160) entirely → grow small→large. Char layer reuses suku_cast.
    reslice("isshiki_otsutsuki_specail_3.png", "isshiki_cube_fx_uniform.png", band=(25, 186), xrects=[(235, 294), (316, 426), (462, 581)])   # growing cubes (3f)
    # 4) SENPO GOKASHIN ENSEN FIRE (specail_4): 2 char cast poses + fire FX on a BLACK BOX → alpha-key + hand rects.
    reslice("isshiki_otsutsuki_specail_4.png", "isshiki_fire_cast_uniform.png", band=(5, 77), pick=[0, 1])            # fire cast poses (2f)
    reslice("isshiki_otsutsuki_specail_4.png", "isshiki_fire_fx_uniform.png",   band=(102, 186),
            xrects=[(28, 85), (96, 227), (239, 350)], keyblack=48)                                                     # growing fire wave (3f), black bg keyed out

    # ── STAGE 4 — 2 BONUS FINISHERS + ULTIMATE (specail_attacks.png 3 rows + effects.png rod payoff). ──
    # Row1 = Finisher 1 (rod-barrage cast, 2 char + rod-FX cell 2 DUP of specail_2 → FX reuses rod_fx).
    # Row2 = Finisher 2 (dash-slash: char pose + wide slash-lunge). Row3 = Finisher 3 windup = Ultimate cast (2 char).
    reslice("isshiki_otsutsuki_specail_attacks.png", "isshiki_fin1_cast_uniform.png", band=(16, 88),   pick=[0, 1])    # Finisher 1 cast (2f)
    reslice("isshiki_otsutsuki_specail_attacks.png", "isshiki_fin2_uniform.png",      band=(126, 190), pick=[0, 1])    # Finisher 2 dash-slash (2f)
    reslice("isshiki_otsutsuki_specail_attacks.png", "isshiki_ult_cast_uniform.png",  band=(235, 308), pick=[0, 1])    # Ultimate (Finisher 3) windup cast (2f)
    # Ultimate PAYOFF — effects.png = Finisher 3's own Daikokuten black-rod projectiles (rain down). Pick the 4 big rods.
    reslice("isshiki_otsutsuki_effects.png", "isshiki_ult_rods_uniform.png", band=(34, 214), pick=[5, 6, 7, 8])        # big rod frames (4f)
