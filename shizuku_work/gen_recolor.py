#!/usr/bin/env python3
# Generate Shizuku ANIME-OLD + MANGA recolor skins from the sheet's PALETTE BOX.
# The palette box has the SAME pose in 3 anime palettes (Anime Old / Anime[default] / Manga) + a pink BASE
# (skipped). We extract a representative colour set from each (frequency-ranked, luminance-sorted), match
# them by role (luminance rank), and build a nearest-colour LUT ANIME->{animeold,manga}. The LUT is applied
# to every shizuku_*_uniform.png (+ portrait), writing shizuku_*__<tag>.png with IDENTICAL dimensions.
import numpy as np
from PIL import Image
import glob, os

SRC = "../shizuku_murasaki_jus_sprites_by_amandiohype_ddz62rv.png"
BG = np.array([0, 128, 0]); TOL = 40
_rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)

# Palette reference sprites (clean boxes, above the text labels). x-runs detected; y 449-498 excludes labels.
PAL_BOXES = {"animeold": (800, 840), "anime": (849, 888), "manga": (901, 945)}
PAL_Y = (449, 499)

def pal_colors(x0, x1, k=7):
    a = _rgb[PAL_Y[0]:PAL_Y[1], x0:x1]
    dist = np.abs(a - BG).sum(2)
    px = a[dist > TOL]                       # opaque (non-green) pixels
    if len(px) == 0: return np.zeros((0, 3))
    # light quantisation (step 12) then frequency rank → representative colours
    q = (px // 12) * 12 + 6
    uniq, cnt = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    order = np.argsort(-cnt)
    reps = uniq[order][:k].astype(np.int32)
    return reps

def lum(c): return 0.299 * c[:, 0] + 0.587 * c[:, 1] + 0.114 * c[:, 2]

anime = pal_colors(*PAL_BOXES["anime"])
anime = anime[np.argsort(lum(anime))]        # sort source by luminance (role order)
LUTS = {}
for tag in ("animeold", "manga"):
    tgt = pal_colors(*PAL_BOXES[tag])
    tgt = tgt[np.argsort(lum(tgt))]
    # match by rank; pad the shorter set by repeating its extremes
    n = len(anime)
    if len(tgt) < n:
        pad = np.vstack([tgt] + [tgt[-1:]] * (n - len(tgt)))
        tgt = pad[:n]
    else:
        # bin target into n luminance groups, take the median of each
        idx = np.linspace(0, len(tgt), n + 1).astype(int)
        tgt = np.array([tgt[idx[i]:max(idx[i] + 1, idx[i + 1])].mean(0) for i in range(n)]).astype(np.int32)
    LUTS[tag] = tgt
    print(f"LUT {tag}: " + " ".join(f"{tuple(a)}->{tuple(t)}" for a, t in zip(anime, tgt)))

def recolor(img, src_pal, tgt_pal):
    A = np.asarray(img).copy()
    opq = A[:, :, 3] > 16
    px = A[:, :, :3].astype(np.int32)[opq]
    # nearest source-palette index per pixel, remap to target
    d = ((px[:, None, :] - src_pal[None, :, :]) ** 2).sum(2)
    nn = d.argmin(1)
    px2 = tgt_pal[nn]
    out = A[:, :, :3].copy(); out[opq] = px2.astype(np.uint8)
    A[:, :, :3] = out
    return Image.fromarray(A, "RGBA")

sheets = sorted(glob.glob("../shizuku_*_uniform.png")) + ["../shizuku_portrait.png"]
# skip already-recolored (__tag) files
sheets = [s for s in sheets if "__" not in os.path.basename(s)]
for s in sheets:
    img = Image.open(s).convert("RGBA")
    base = os.path.basename(s)[:-4]   # strip .png
    for tag in ("animeold", "manga"):
        recolor(img, anime, LUTS[tag]).save(f"../{base}__{tag}.png")
print(f"OK recolored {len(sheets)} sheets x2 tags")
