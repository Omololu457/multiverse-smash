#!/usr/bin/env python3
"""Megumi: conservative background removal for the supplied JPG (analysis + extraction core; the source is never written).
1. KEY distance: the measured key colour RGB(0,128,1) (q100 JPEG, per-channel std ≈ 2.5) — pixels within KEY_T are
   background candidates. Border-connected candidates = background; enclosed pockets are accepted as background only when
   they are pure key colour (d < POCKET_T) — enclosed areas are masked locally, never by a global green threshold.
2. SHEET ANNOTATION LINES (pale green-grey box / bracket strokes, 1–2 px) = straight runs of the annotation colour; they
   and their green-tinted anti-alias neighbours are removed. They never pass through sprite interiors.
3. EDGE DECONTAMINATION (only pixels within EDGE px of background): the JPG was downscaled onto the green key, so edge
   pixels are mixes P = a·C + (1−a)·K. With the sprite colour assumed to carry no green excess, the key share is
   s = (G − max(R,B)) / 127. s ≥ DROP → transparent; otherwise C = (P − s·K) / (1 − s). Interior pixels (including real
   green-tinted details away from the edge) are never touched. No blur, no smoothing, no palette reduction."""
import numpy as np
from scipy import ndimage as ndi
KEY = np.array([0, 128, 1], dtype=np.float32)
KEY_T, POCKET_T, EDGE, DROP = 34.0, 34.0, 2, 0.62

def annotation_lines(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    ex = g - np.maximum(r, b)
    col = (ex >= 12) & (ex <= 95) & (r >= 70)
    def runs(m, axis, L=12):
        # pixels belonging to a straight run of length >= L along axis
        k = np.ones(L, dtype=np.int32)
        out = np.zeros_like(m)
        mm = m.astype(np.int32)
        if axis == 1:
            c = ndi.convolve1d(mm, k, axis=1, mode='constant')
        else:
            c = ndi.convolve1d(mm, k, axis=0, mode='constant')
        full = c >= L
        # expand the centre detection back over the run
        return ndi.maximum_filter1d(full.astype(np.uint8), L, axis=axis).astype(bool) & m
    line = runs(col, 1) | runs(col, 0)
    near = ndi.binary_dilation(line, structure=np.ones((3, 3)), iterations=1)
    tinted = ex >= 25
    return line | (near & tinted)

def clean(a_u8):
    a = a_u8.astype(np.float32)
    d = np.sqrt(((a - KEY) ** 2).sum(2))
    cand = d < KEY_T
    lab, n = ndi.label(cand)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    outer = np.isin(lab, border[border > 0])
    pocket = cand & ~outer & (d < POCKET_T)
    lines = annotation_lines(a)
    bg = outer | pocket | lines
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    out = a.copy()
    edge = ndi.binary_dilation(bg, structure=np.ones((3, 3)), iterations=EDGE) & ~bg
    ex = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    s = np.clip(ex / 127.0, 0, 1)
    drop = edge & (s >= DROP)
    alpha[drop] = 0
    cand = edge & (s > 0) & ~drop
    sf = s[cand][:, None]
    un = (a[cand] - sf * KEY) / (1 - sf)
    # GAMUT PROTECTION: a real key mix un-mixes to an in-gamut colour. A pixel that would leave the gamut (e.g. the
    # lime Toad, yellow-green grass under Mahoraga) is genuine green-tinted art, not a blend -> left untouched.
    ok = (un.max(1) <= 255 * 1.08) & (un.min(1) >= -12)
    fix = np.zeros_like(cand); fix[cand] = ok
    out[fix] = np.clip(un[ok], 0, 255)
    protected = int((~ok).sum())
    out = np.round(out).astype(np.uint8)
    # ENCLOSED BLACK-KEY BLENDS: 1-2 px background holes inside black silhouettes / shadow mounds were averaged with the
    # black outline by the downscale -> (0, 40..140, 0). A pixel ON the black-key line whose whole 3x3 neighbourhood is
    # also dark-and-unsaturated (R, B < 30) is an enclosed hole of the black shape: resolved to the outline black.
    # Anything with red / blue content nearby (the lime Toad, grass, eyes) fails the neighbourhood test and is kept.
    o = out.astype(int)
    line = (o[..., 0] <= 12) & (o[..., 2] <= 12) & (o[..., 1] >= 20) & (o[..., 1] <= 140) & (alpha > 0)
    darkrb = (o[..., 0] < 30) & (o[..., 2] < 30) & (o[..., 1] <= 140)
    nb = ndi.minimum_filter(darkrb.astype(np.uint8), size=3, mode='constant', cval=1).astype(bool)
    holes = line & nb
    out[holes] = 0
    # BRACKET TICKS: short pale vertical / horizontal remnants of the sheet's annotation brackets (<= 3 px thick,
    # <= 14 px long, every pixel pale grey-white) that are not touching any sprite pixel.
    lab, n = ndi.label(alpha > 0, structure=np.ones((3, 3)))
    ticks = 0
    if n:
        objs = ndi.find_objects(lab)
        mx, mn = out.max(2).astype(int), out.min(2).astype(int)
        pale = (mn >= 120) & (mx - mn <= 90)
        for i, sl in enumerate(objs):
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if min(h, w) > 3 or max(h, w) > 14: continue
            m = lab[sl] == i + 1
            if m.sum() > 30 or not pale[sl][m].all(): continue
            alpha[sl][m] = 0; ticks += 1
    rgba = np.dstack([out, alpha])
    rgba[alpha == 0] = 0
    stats = {'outer': int(outer.sum()), 'pocket': int(pocket.sum()), 'lines': int(lines.sum()),
             'edgeDropped': int(drop.sum()), 'edgeDecontaminated': int(fix.sum()), 'gamutProtected': protected, 'bracketTicks': ticks, 'blackKeyHoles': int(holes.sum())}
    return rgba, stats
