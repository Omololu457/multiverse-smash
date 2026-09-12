#!/usr/bin/env python3
# fix_kurapika_miles_overkey.py
# ---------------------------------------------------------------------------
# Repairs the OVER-AGGRESSIVE chroma-key damage baked into Kurapika's and Miles'
# sprite sheets. The reslice keys (reslice_kurapika.py yellow/green/dark_bg masks;
# reslice_miles.py blue/white/mauve key) ate the characters' OWN colours (Kurapika's
# blonde hair / gold trim / dark outline; Miles' red+white accents), punching
# fully-transparent ENCLOSED holes into the character body.
#
# This is a SURGICAL correction of the key ONLY — it does NOT re-slice, re-pack,
# re-crop, or otherwise change frame layout/anchors (the reslice build content-bboxes
# + despeckles, so a full re-slice could shift frames — avoided on purpose). It flips
# each wrongly-transparent ENCLOSED pixel back to opaque and fills its colour from the
# surrounding body pixels. Legit EXTERIOR transparency (the silhouette / negative space
# reachable from the frame border) is never touched.
#
# FX sheets (chain-cage / beam / venom-ring) legitimately enclose background inside a
# loop, so on those we only fill SMALL enclosed specks (<= FX_MAX px) and spare the
# large legit hollows. Body/attack sheets have no legit interior hollow → fill all.
#
# Only kurapika_*_uniform*.png and miles_*_uniform*.png are touched.
# ---------------------------------------------------------------------------
import glob, os, sys
import numpy as np
from PIL import Image
from collections import deque

FX_KEYWORDS = ("chainjail", "jailfx", "judgment", "shock", "steal", "windmill",
               "venomring", "venombeam", "venomstrike")
FX_MAX = 28   # enclosed holes larger than this on an FX sheet are treated as legit hollows (spared)

def enclosed_mask(alpha):
    h, w = alpha.shape
    transp = alpha == 0
    outside = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if transp[y, x] and not outside[y, x]:
                outside[y, x] = True; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if transp[y, x] and not outside[y, x]:
                outside[y, x] = True; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and transp[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True; q.append((nx, ny))
    return transp & ~outside   # enclosed transparent = interior holes

def components(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), int); cid = 0; comps = []
    for sy in range(h):
        for sx in range(w):
            if mask[sy, sx] and lab[sy, sx] == 0:
                cid += 1; pix = []; q = deque([(sx, sy)]); lab[sy, sx] = cid
                while q:
                    x, y = q.popleft(); pix.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and lab[ny, nx] == 0:
                            lab[ny, nx] = cid; q.append((nx, ny))
                comps.append(pix)
    return comps

def fix_sheet(path, is_fx):
    im = Image.open(path).convert("RGBA")
    arr = np.array(im); alpha = arr[:, :, 3]
    holes = enclosed_mask(alpha)
    if not holes.any():
        return 0, 0
    target = np.zeros_like(holes)
    spared = 0
    for pix in components(holes):
        if is_fx and len(pix) > FX_MAX:
            spared += len(pix); continue     # legit large FX hollow
        for x, y in pix:
            target[y, x] = True
    filled = int(target.sum())
    if filled == 0:
        return 0, spared
    # iterative colour dilation: each target pixel takes the mean RGB of its opaque neighbours
    h, w = alpha.shape
    rgb = arr[:, :, :3].astype(np.int32)
    a = alpha.copy()
    remaining = target.copy()
    for _ in range(50):
        if not remaining.any():
            break
        ys, xs = np.where(remaining)
        progressed = False
        for y, x in zip(ys, xs):
            acc = [];
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                nx, ny = x+dx, y+dy
                if 0 <= nx < w and 0 <= ny < h and a[ny, nx] == 255 and not (remaining[ny, nx]):
                    acc.append(rgb[ny, nx])
            if acc:
                rgb[y, x] = np.mean(acc, axis=0).astype(np.int32)
                a[y, x] = 255; remaining[y, x] = False; progressed = True
        if not progressed:  # isolated core — flip alpha, keep colour of any opaque neighbour next round
            ys, xs = np.where(remaining)
            for y, x in zip(ys, xs):
                a[y, x] = 255
            break
    out = np.dstack([rgb.astype(np.uint8), a.astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(path)
    return filled, spared

def main():
    targets = sorted(glob.glob("kurapika_*_uniform*.png") + glob.glob("miles_*_uniform*.png"))
    dry = "--apply" not in sys.argv
    tot_files = tot_filled = tot_spared = 0
    for f in targets:
        is_fx = any(k in f for k in FX_KEYWORDS)
        im = Image.open(f).convert("RGBA")
        holes = enclosed_mask(np.array(im)[:, :, 3])
        nholes = int(holes.sum())
        if nholes == 0:
            continue
        if dry:
            print(f"[DRY] {os.path.basename(f):48} {'FX ' if is_fx else 'BODY'} enclosed_holes={nholes}")
            tot_files += 1; tot_filled += nholes
        else:
            filled, spared = fix_sheet(f, is_fx)
            if filled:
                tot_files += 1; tot_filled += filled; tot_spared += spared
                print(f"[FIX] {os.path.basename(f):48} {'FX ' if is_fx else 'BODY'} filled={filled} spared={spared}")
    print(f"\n{'DRY-RUN' if dry else 'APPLIED'}: {tot_files} sheets, {tot_filled} px filled, {tot_spared} px spared (legit FX hollows)")

if __name__ == "__main__":
    main()
