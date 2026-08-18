#!/usr/bin/env python3
# BAKI HANMA — Step 1 (bg removal) + Step 2 (row-only slice) processing pass.
# Source: baki/baki_hanma_jus_sheet_by_srchimuelo_dfelcrv.png  (1204x2184, flat JUS-green RGB, NO alpha)
#
# This is a PROCESSING/AUDIT pass only — no kit design, no repack into uniform cells.
#   STEP 1  key out the sheet's own background color (sampled from corner = [0,128,0]) -> RGBA + de-spill.
#   STEP 2  detect horizontal row bands via green gaps (left sprite column) and crop each band to its own
#           file, trimmed on the right to the leftmost contiguous sprite-frame cluster so far-right photo /
#           FX islands are dropped (and flagged). Header art (portrait/photos/credits), the big splash
#           illustration, and the top-right "PALETTE UNUSED+BONUS" box are carved out separately.
# Row bands were measured (tools scan), not assumed even-spaced. Label text bands (h<=14) are skipped.
import numpy as np
from PIL import Image

SRC = "baki/baki_hanma_jus_sheet_by_srchimuelo_dfelcrv.png"
OUT = "baki_sliced"
BG = np.array([0, 128, 0])          # sampled from all four corners
TOL = 60                            # green-key distance tolerance


def load_keyed():
    """STEP 1 — key the sampled green bg to transparent, with green-spill suppression on soft edges."""
    im = Image.open(SRC).convert("RGB")
    a = np.array(im).astype(np.int16)
    # distance-to-green classification
    dist = np.sqrt(((a - BG) ** 2).sum(axis=2))
    bg = dist < TOL
    rgba = np.dstack([a.astype(np.uint8), np.where(bg, 0, 255).astype(np.uint8)])
    # de-spill: on kept pixels where green >> red&blue (halo fringe), clamp green toward max(r,b)
    r, g, b = rgba[:, :, 0].astype(int), rgba[:, :, 1].astype(int), rgba[:, :, 2].astype(int)
    keep = rgba[:, :, 3] > 0
    fringe = keep & (g > r + 40) & (g > b + 40)
    cap = np.maximum(r, b) + 20
    newg = np.where(fringe, np.minimum(g, cap), g)
    rgba[:, :, 1] = newg.astype(np.uint8)
    return rgba


def alpha_mask(rgba):
    return rgba[:, :, 3] > 16


# embedded JPEG/manga REFERENCE photos (measured via unique-color block density) that sit INSIDE sprite-row
# bands and are bridged to the frames by red FX-dots -> excluded from row slicing, exported flagged.
PHOTO_RECTS = [
    (450, 1510, 672, 1666, "baki_ref_photo_01_color.png"),   # muscular Baki screenshot (in row_15 band)
    (595, 1655, 705, 1862, "baki_ref_photo_02_manga.png"),   # grayscale manga panel (in row_16 band)
    (378, 1876, 585, 1982, "baki_ref_photo_03_color.png"),   # red-eyes Baki screenshot (in row_17 band)
]


def col_runs(mask, y0, y1, x0, x1, minrun=2):
    """content column runs within a band -> [(cx0,cx1),...] (frame-column clusters)."""
    sub = mask[y0:y1 + 1, x0:x1 + 1]
    col = sub.any(axis=0)
    runs = []; s = -1
    for i, v in enumerate(col):
        if v:
            if s < 0: s = i
        else:
            if s >= 0: runs.append([s + x0, i - 1 + x0]); s = -1
    if s >= 0: runs.append([s + x0, x1])
    return [r for r in runs if r[1] - r[0] + 1 >= minrun]


def left_cluster_cut(mask, y0, y1, x_from=16, x_to=1180, gap=55):  # x>=16 skips the full-height yellow border stripe (x6-14)
    """right x-cut = end of the leftmost contiguous frame cluster (stop at first green gap >= `gap`)."""
    runs = col_runs(mask, y0, y1, x_from, x_to, minrun=2)
    if not runs:
        return None, [], []
    x0 = runs[0][0]
    xr = runs[0][1]
    kept = [runs[0]]
    for r in runs[1:]:
        if r[0] - xr - 1 >= gap:
            break
        xr = r[1]; kept.append(r)
    islands = [r for r in runs if r[0] > xr]        # far-right photo/FX islands dropped from this crop
    return (x0, xr), kept, islands


def frame_count(rgba_crop):
    """alpha-gutter column scan -> measured frame count + per-frame widths (debris islands < 4px noted)."""
    m = rgba_crop[:, :, 3] > 16
    col = m.any(axis=0)
    runs = []; s = -1
    for i, v in enumerate(col):
        if v:
            if s < 0: s = i
        else:
            if s >= 0: runs.append(i - s); s = -1
    if s >= 0: runs.append(len(col) - s)
    real = [w for w in runs if w >= 4]
    debris = [w for w in runs if w < 4]
    return real, debris


def compression_sig(rgba_crop):
    """unique-color : opaque-pixel ratio — near 1:1 flags JPEG-damage on a source that should be flat-color."""
    m = rgba_crop[:, :, 3] > 16
    op = int(m.sum())
    if op == 0:
        return 0, 0, 0.0
    px = rgba_crop[:, :, :3][m]
    uniq = len(np.unique(px.reshape(-1, 3), axis=0))
    return uniq, op, uniq / op


def save_crop(rgba, x0, y0, x1, y1, name):
    crop = rgba[y0:y1 + 1, x0:x1 + 1]
    Image.fromarray(crop, "RGBA").save(f"{OUT}/{name}")
    return crop


# ── measured row bands (left sprite column x10-655, green-gap detect T=8). Label bands (h<=14) dropped. ──
# (y0, y1, note).  The 4 tall bands hold >1 sub-row bridged by REPEAT-bracket lines / FX / white box-borders.
ROW_BANDS = [
    # (row_num, y0, y1) — the cleanly gap-separable rows. KOMA rows 15/16/18 are TALL multi-sub-row
    # bands (REPEAT-bracket lines / white box-borders / merged FX+run bridge the gaps) and are split by
    # hand below in KOMA_SPLITS instead. row_17 IS a single clean action, kept here.
    (1, 252, 281),  (2, 314, 367),  (3, 388, 448),  (4, 484, 529),  (5, 576, 635),
    (6, 674, 730),  (7, 773, 827),  (8, 859, 906),  (9, 953, 997),  (10, 1039, 1092),
    (11, 1125, 1177),(12, 1218, 1270),(13, 1301, 1353),(14, 1379, 1436),
    (17, 1876, 1967),  # single clean KOMA rapid-punch flurry (REPEAT loop)
    (19, 2119, 2181),  # WIN + LOSE poses
]

# ── MANUAL splits of the KOMA rows 15/16/18 (measured cut lines; see BAKI_ASSET_MAP.md) ──
# (x0, y0, x1, y1, name).  Cuts land in real green gaps between sub-rows / between FX-block and run-block.
KOMA_SPLITS = [
    (19, 1500, 293, 1548, "baki_row_15a_koma_combo.png"),    # top: KOMA lunge-kick combo (6f)
    (17, 1594, 449, 1665, "baki_row_15b_koma_barrage.png"),  # bottom: KOMA rapid-punch BARRAGE (red-fist FX)
    (16, 1672, 547, 1749, "baki_row_16a_koma_rush.png"),     # top: KOMA approach-walk → spin-kick (red arc)
    (17, 1753, 432, 1861, "baki_row_16b_demo_opponent.png"), # bottom: 4-cell BOXED demo — ⚠ contains OPPONENT
    (19, 1979, 617, 2060, "baki_row_18a_shockwave.png"),     # left: shockwave-streak punch (4f, stylized FX)
    (627, 1979, 1016, 2060, "baki_row_18b_run.png"),         # right: RUN / dash cycle (7f)
]

# SECONDARY labeled actions that share a row-LINE with the main action to their left (the sheet packs two
# actions per band). left_cluster_cut keeps the leftmost cluster; these carve the right-hand action out.
SECONDARY = [
    (435, 388, 551, 448, "baki_row_03b_dash.png"),       # DASH (shares WALK line)
    (378, 576, 497, 635, "baki_row_05b_guard.png"),       # GUARD (shares JUMP line)
    (274, 674, 611, 730, "baki_row_06b_knockdown.png"),   # knockdown/getup tumble (shares TAKING-DAMAGE line)
    (297, 2119, 382, 2181, "baki_row_19b_lose.png"),      # LOSE pose (shares WIN line)
]

SPLASH_X = 680  # right-side islands beginning past this x are big-splash-illustration bleed (ignored)

AUDIT = []


def main():
    rgba = load_keyed()
    mask = alpha_mask(rgba)
    H, W = mask.shape

    # export + blank embedded reference photos so they don't pollute the sprite rows they sit inside
    for (px0, py0, px1, py1, pname) in PHOTO_RECTS:
        save_crop(rgba, px0, py0, px1, py1, pname)
        mask[py0:py1 + 1, px0:px1 + 1] = False

    # ── STEP 2a — cleanly-separable sprite rows ──
    for (i, y0, y1) in ROW_BANDS:
        cut, kept, islands = left_cluster_cut(mask, y0, y1)
        if cut is None:
            AUDIT.append((f"row_{i:02d}", y0, y1, None, None, [], [], None, [], []))
            continue
        x0, x1 = cut
        name = f"baki_row_{i:02d}.png"
        crop = save_crop(rgba, x0, y0, x1, y1, name)
        real, debris = frame_count(crop)
        uniq, op, ratio = compression_sig(crop)
        # split flagged right islands: in-grid secondary actions vs far-right splash bleed
        ingrid = [r for r in islands if r[1] < SPLASH_X]
        splash = [r for r in islands if r[0] >= SPLASH_X]
        AUDIT.append((name, y0, y1, x0, x1, real, debris, (uniq, op, round(ratio, 3)), ingrid, splash))

    # ── STEP 2a′ — manual KOMA sub-row splits (rows 15/16/18) ──
    for (sx0, sy0, sx1, sy1, sname) in KOMA_SPLITS:
        crop = save_crop(rgba, sx0, sy0, sx1, sy1, sname)
        real, debris = frame_count(crop)
        uniq, op, ratio = compression_sig(crop)
        AUDIT.append((sname, sy0, sy1, sx0, sx1, real, debris, (uniq, op, round(ratio, 3)), [], []))

    # ── secondary actions sharing a row-line (exported as their own files) ──
    for (sx0, sy0, sx1, sy1, sname) in SECONDARY:
        crop = save_crop(rgba, sx0, sy0, sx1, sy1, sname)
        real, debris = frame_count(crop)
        AUDIT.append((sname, sy0, sy1, sx0, sx1, real, debris, None, [], []))

    # ── STEP 2b — non-row art carved out separately (flagged non-animation in audit) ──
    save_crop(rgba, 9, 12, 168, 205, "baki_portrait_headshot.png")          # header face portrait (left)
    save_crop(rgba, 690, 40, 1060, 1060, "baki_splash_illustration.png")    # big standing splash art (right)
    save_crop(rgba, 700, 14, 1180, 300, "baki_bonus_palette_box.png")       # top-right PALETTE UNUSED+BONUS
    # header reference photos + credits strip (kept for provenance, NOT sprite content)
    save_crop(rgba, 175, 12, 700, 130, "baki_header_photos_credits.png")

    # write measurements sidecar for the audit doc
    with open(f"{OUT}/_measure.txt", "w") as f:
        for name, y0, y1, x0, x1, real, debris, sig, ingrid, splash in AUDIT:
            f.write(f"{name} y{y0}-{y1} x{x0}-{x1} h={y1-y0+1} w={(x1-x0+1) if x1 else 0} "
                    f"frames={len(real) if real else 0} widths={real} debris={debris} "
                    f"sig(uniq/op/ratio)={sig} secondary_islands={ingrid} splash_bleed={splash}\n")
    print("=== BAKI slice measurements ===")
    for line in open(f"{OUT}/_measure.txt"):
        print(line.rstrip())


if __name__ == "__main__":
    main()
