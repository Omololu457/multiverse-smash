#!/usr/bin/env python3
# Generate Killua (Godspeed) `zoldyck` ANIME-OLD + MANGA recolor skins from the sheet's PALETTE BOX
# (x760-935 y335-385: Anime Old / Anime[default] / Manga / Base). Same Killua pose in 4 palettes; we extract
# a frequency-ranked, luminance-sorted colour set from each, match by luminance ROLE, and build a nearest-
# colour LUT ANIME->{animeold,manga}. Applied to every zoldyck_*_uniform.png + portrait with IDENTICAL dims.
# GODSPEED frames (gsrun/gscrouch) keep their OWN blue palette → EXCLUDED; FX sheets (bolt/pillar/barrage)
# are palette-independent lightning → EXCLUDED. Run from the repo root: python3 zoldyck_work/gen_recolor.py
import numpy as np
from PIL import Image
import glob, os

SRC = "killua_zoldyck_sprites_jus_new_outfit__by_amandiohype_dduudqn.png"
BG = np.array([55, 86, 40]); TOL = 45
_rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)
PAL_Y = (338, 386)

# Auto-detect the 4 palette columns (non-bg x-runs in the palette row).
def pal_columns():
    strip = _rgb[PAL_Y[0]:PAL_Y[1], 755:938]
    nonbg = (np.abs(strip - BG).sum(2) > TOL).sum(0)
    runs = []; x = 0; n = len(nonbg)
    while x < n:
        if nonbg[x] > 1:
            s = x
            while x < n and nonbg[x] > 1: x += 1
            if x - s >= 12: runs.append((755 + s, 755 + x - 1))
        else: x += 1
    return runs

cols = pal_columns()
print("palette columns:", cols)
assert len(cols) >= 3, f"expected >=3 palette columns, got {len(cols)}"
PAL_BOXES = {"animeold": cols[0], "anime": cols[1], "manga": cols[2]}

def pal_colors(x0, x1, k=8):
    a = _rgb[PAL_Y[0]:PAL_Y[1], x0:x1 + 1]
    px = a[np.abs(a - BG).sum(2) > TOL]
    if len(px) == 0: return np.zeros((0, 3), int)
    q = (px // 12) * 12 + 6
    uniq, cnt = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    return uniq[np.argsort(-cnt)][:k].astype(np.int32)

def lum(c): return 0.299 * c[:, 0] + 0.587 * c[:, 1] + 0.114 * c[:, 2]

anime = pal_colors(*PAL_BOXES["anime"]); anime = anime[np.argsort(lum(anime))]
LUTS = {}
for tag in ("animeold", "manga"):
    tgt = pal_colors(*PAL_BOXES[tag]); tgt = tgt[np.argsort(lum(tgt))]
    n = len(anime)
    if len(tgt) < n:
        tgt = np.vstack([tgt] + [tgt[-1:]] * (n - len(tgt)))[:n]
    else:
        idx = np.linspace(0, len(tgt), n + 1).astype(int)
        tgt = np.array([tgt[idx[i]:max(idx[i] + 1, idx[i + 1])].mean(0) for i in range(n)]).astype(np.int32)
    LUTS[tag] = tgt
    print(f"LUT {tag}: " + " ".join(f"{tuple(a)}->{tuple(t)}" for a, t in zip(anime, tgt)))

def recolor(img, src_pal, tgt_pal):
    A = np.asarray(img).copy()
    opq = A[:, :, 3] > 16
    px = A[:, :, :3].astype(np.int32)[opq]
    nn = ((px[:, None, :] - src_pal[None, :, :]) ** 2).sum(2).argmin(1)
    out = A[:, :, :3].copy(); out[opq] = tgt_pal[nn].astype(np.uint8)
    A[:, :, :3] = out
    return Image.fromarray(A, "RGBA")

EXCLUDE = ("gsrun", "gscrouch", "boltfx", "pillarfx", "barragefx")   # Godspeed blue + FX stay as-is
# BODY sheets only. The portrait is a high-detail illustration whose hair gradient corrupts under the
# 8-colour body LUT (hair → tank colour), so skins reuse the DEFAULT portrait (the in-match body recolors).
sheets = sorted(glob.glob("zoldyck_*_uniform.png"))
sheets = [s for s in sheets if "__" not in os.path.basename(s) and not any(e in s for e in EXCLUDE)]
for s in sheets:
    img = Image.open(s).convert("RGBA"); base = os.path.basename(s)[:-4]
    for tag in ("animeold", "manga"):
        recolor(img, anime, LUTS[tag]).save(f"./{base}__{tag}.png")
print(f"OK recolored {len(sheets)} sheets x2 tags (excluded Godspeed + FX)")
