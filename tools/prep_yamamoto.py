#!/usr/bin/env python3
# STAGE 0 pre-processing for YAMAMOTO GENRYUSAI (Bleach) source rows.
#
# The source sheet is CONFIRMED JPEG-DAMAGED: ~7000 unique RGB values in a 7700-opaque-pixel
# row where a legitimate DS paletted rip would hold a few dozen. Building sprites directly from
# these files ships visible compression artifacts (near-black outline noise, cyan/magenta
# fringing, 8x8 macroblock ghosting). This tool performs the mandatory cleanup:
#
#   1. Alpha OPENING (1px erode -> 1px dilate) to remove isolated noise pixels (scattered
#      fringe specks, stray single pixels) WITHOUT eating real thin features like the cane.
#   2. Two-population RE-QUANTIZATION per row, processed by TYPE separately so the flame ramp
#      cannot contaminate the character ramp: BODY pixels -> 24 colors, FIRE/effect pixels
#      -> 10 colors (median cut). Rows that are body-only are quantized as a single body pop.
#   3. RGB DILATION under the alpha edge (color bled 2px into the transparent margin, alpha
#      kept 0) so runtime bilinear scaling never samples transparent-black.
#
# Confirmed-empty rows (32,42,44,52,70,85) and negligible-noise rows (29,30,55,82,83) are
# DISCARDED (no output produced) per the confirmed design.
#
# Output: yamamoto_clean/row_NN.png  (same dimensions as source, cleaned).
import os, sys
import numpy as np
from PIL import Image

SRC = "Bleach_Dark_Souls_Genryusai_Shigekuni_Yamamoto_row_%02d.png"
OUT = "yamamoto_clean"
ALPHA = 16

DISCARD_EMPTY = {32, 42, 44, 52, 70, 85}
DISCARD_NOISE = {29, 30, 55, 82, 83}
DISCARD = DISCARD_EMPTY | DISCARD_NOISE

# Rows dominated by the Ryujin Jakka flame / beam effect (fire-population split forced on).
# Everything else is auto-classified by fire fraction, but these are always treated as effect-bearing.
FIRE_ROWS = {39, 40, 41, 43, 56, 57, 58, 65, 66, 67, 68, 69, 87, 88, 89, 95, 96, 97}


def alpha_mask(a):
    return a[:, :, 3] > ALPHA


def _neigh_stack(m):
    # 3x3 shifted stack of a boolean mask (edges padded False)
    p = np.pad(m, 1, mode="constant", constant_values=False)
    return [p[dy:dy + m.shape[0], dx:dx + m.shape[1]]
            for dy in range(3) for dx in range(3)]


def dilate(m):
    return np.any(np.stack(_neigh_stack(m)), axis=0)


def despeckle(m):
    """Remove isolated noise pixels (0 or 1 opaque neighbor) while PRESERVING connected thin
    features -- the shunpo scanlines/rings (rows 13-18) and the cane are 1px-wide by design, so a
    full 3x3 erode-then-dilate opening would destroy them. Neighbor-count thresholding removes the
    scattered fringe specks the design calls out (row 55's stray pixel, row 46's 52 scattered px)
    without eating those intentional lines."""
    ncount = np.sum(np.stack(_neigh_stack(m)), axis=0) - m.astype(int)  # 8-neighbor opaque count
    return m & (ncount >= 2)


def fire_pixels(a, mask):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0.0)
    warm = (r >= g) & (g >= b) & (sat > 0.40) & (mx > 120)          # red/orange/yellow flame
    cyan = (b >= 120) & (g >= 120) & (r < g) & ((g + b - 2 * r) > 70)  # pale-cyan beam
    return mask & (warm | cyan)


def quantize_pop(a, popmask, ncolors):
    """Median-cut quantize just the pixels in popmask to <=ncolors; return remapped RGB."""
    ys, xs = np.where(popmask)
    if len(xs) == 0:
        return a[:, :, :3].copy()
    px = a[ys, xs, :3].astype(np.uint8)
    strip = Image.fromarray(px.reshape(-1, 1, 3), "RGB")
    q = strip.quantize(colors=min(ncolors, max(1, len(np.unique(px.reshape(-1, 3), axis=0)))),
                       method=Image.MEDIANCUT, dither=Image.NONE)
    pal = np.array(q.getpalette()[:q.colors * 3] if hasattr(q, "colors") else q.getpalette()[:ncolors * 3])
    pal = np.array(q.getpalette()).reshape(-1, 3)
    idx = np.array(q).reshape(-1)
    mapped = pal[idx].astype(np.uint8)
    out = a[:, :, :3].copy()
    out[ys, xs] = mapped
    return out


def rgb_bleed(rgb, mask, iters=2):
    """Bleed opaque RGB into the transparent margin (alpha stays 0 elsewhere)."""
    rgb = rgb.astype(np.float32).copy()
    filled = mask.copy()
    for _ in range(iters):
        neigh = filled
        # accumulate neighbor color sums for currently-empty pixels adjacent to filled ones
        acc = np.zeros_like(rgb)
        cnt = np.zeros(mask.shape, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                sr = np.roll(np.roll(rgb, dy, 0), dx, 1)
                sm = np.roll(np.roll(filled, dy, 0), dx, 1).astype(np.float32)
                acc += sr * sm[..., None]
                cnt += sm
        target = (~filled) & (cnt > 0)
        rgb[target] = (acc[target] / cnt[target, None])
        filled = filled | target
    return rgb.astype(np.uint8)


def process(n):
    fn = SRC % n
    a = np.array(Image.open(fn).convert("RGBA")).astype(np.int32)
    m0 = alpha_mask(a)
    before_uniq = len(np.unique(a[:, :, :3][m0].reshape(-1, 3), axis=0))
    before_op = int(m0.sum())

    # 1) despeckle -> kill scattered fringe specks, keep connected thin features
    m1 = despeckle(m0)
    removed = int(m0.sum() - m1.sum())

    # 2) two-population quantize
    fmask = fire_pixels(a, m1)
    fire_frac = fmask.sum() / max(m1.sum(), 1)
    split = (n in FIRE_ROWS) or (fire_frac > 0.20)
    if split and fmask.sum() > 0 and (m1 & ~fmask).sum() > 0:
        rgb = quantize_pop(a, m1 & ~fmask, 24)
        rgb_f = quantize_pop(a, fmask, 10)
        ys, xs = np.where(fmask)
        rgb[ys, xs] = rgb_f[ys, xs]
        mode = f"split(fire={fire_frac*100:.0f}%)"
    else:
        rgb = quantize_pop(a, m1, 24)
        mode = "body24"

    # 3) rgb bleed under alpha edge
    rgb = rgb_bleed(rgb, m1, iters=2)

    out = np.zeros_like(a, np.uint8)
    out[:, :, :3] = rgb
    out[:, :, 3] = np.where(m1, a[:, :, 3], 0).astype(np.uint8)  # keep source alpha where opaque, else 0
    after_uniq = len(np.unique(out[:, :, :3][m1].reshape(-1, 3), axis=0))

    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(out, "RGBA").save(os.path.join(OUT, f"row_{n:02d}.png"))
    print(f"row {n:02d}: {mode:16s} opaque {before_op:6d}->{int(m1.sum()):6d} (specks -{removed:4d})"
          f"  uniqRGB {before_uniq:6d}->{after_uniq:4d}")


def main():
    only = [int(x) for x in sys.argv[1:]] if len(sys.argv) > 1 else list(range(1, 98))
    kept, skipped = 0, 0
    for n in only:
        if n in DISCARD:
            skipped += 1
            continue
        if not os.path.exists(SRC % n):
            continue
        process(n)
        kept += 1
    print(f"\nDONE. kept={kept} discarded={skipped} (empty {sorted(DISCARD_EMPTY)} + noise {sorted(DISCARD_NOISE)})")


if __name__ == "__main__":
    main()
