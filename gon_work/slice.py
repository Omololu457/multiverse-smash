#!/usr/bin/env python3
# Slice the keyed Gon sheet into uniform, feet-aligned per-action PNGs.
# For each action: take region (x0,y0,x1,y1) of gon_work/keyed_full.png, detect
# frame islands by empty-column gaps, take each frame's tight content bbox, then
# repack every frame into one uniform cell (uW x uH): centered-X, BOTTOM-aligned
# so feet line up (mirrors tools/reslice_strip.mjs). Writes ./gon_<name>_uniform.png.
# Driven by gon_work/actions.json. Emits gon_work/dims.json + magenta contact sheets.
import numpy as np
from PIL import Image
import json, sys, os

KEYED = Image.open("gon_work/keyed_full.png").convert("RGBA")
A = np.array(KEYED)
ALPHA = A[:, :, 3]
Hh, Ww = ALPHA.shape

GAP = 4          # >=GAP empty columns separate frames
MINW = 3         # drop islands narrower than this (debris)
PAD = 2          # horizontal breathing room in uniform cell

def detect_islands(x0, x1, y0, y1, colmin=1, gap=GAP):
    sub = ALPHA[y0:y1+1, x0:x1+1] > 16
    cols = sub.sum(axis=0)
    islands = []
    c = 0; n = cols.shape[0]
    while c < n:
        if cols[c] >= colmin:
            s = c
            run_gap = 0
            while c < n and (cols[c] >= colmin or run_gap < gap):
                if cols[c] >= colmin:
                    run_gap = 0
                else:
                    run_gap += 1
                c += 1
            e = c - run_gap
            # trim trailing gap
            while e > s and cols[e-1] < colmin:
                e -= 1
            if e - s >= MINW:
                islands.append((x0 + s, x0 + e - 1))
        else:
            c += 1
    return islands

def content_bbox(gx0, gx1, y0, y1):
    sub = ALPHA[y0:y1+1, gx0:gx1+1] > 16
    ys = np.where(sub.any(axis=1))[0]
    xs = np.where(sub.any(axis=0))[0]
    if len(ys) == 0 or len(xs) == 0:
        return None
    return (gx0 + xs[0], y0 + ys[0], gx0 + xs[-1], y0 + ys[-1])

def slice_action(name, region, select=None, exclude_x=None, force_frames=None, colmin=1, gap=GAP):
    x0, y0, x1, y1 = region
    islands = detect_islands(x0, x1, y0, y1, colmin=colmin, gap=gap)
    if exclude_x:
        ex0, ex1 = exclude_x
        islands = [(a, b) for (a, b) in islands if not (a >= ex0 - 2 and b <= ex1 + 2) and not (a < ex1 and b > ex0 and (min(b,ex1)-max(a,ex0)) > 0.5*(b-a))]
    if select is not None:
        islands = [islands[i] for i in select if i < len(islands)]
    frames = []
    for (a, b) in islands:
        bb = content_bbox(a, b, y0, y1)
        if bb:
            frames.append(bb)
    if not frames:
        print(f"  !! {name}: NO frames in {region}")
        return None
    uW = max(bx1 - bx0 + 1 for (bx0, by0, bx1, by1) in frames) + 2 * PAD
    uH = max(by1 - by0 + 1 for (bx0, by0, bx1, by1) in frames)
    nf = len(frames)
    out = Image.new("RGBA", (uW * nf, uH), (0, 0, 0, 0))
    for i, (bx0, by0, bx1, by1) in enumerate(frames):
        fw, fh = bx1 - bx0 + 1, by1 - by0 + 1
        cell = KEYED.crop((bx0, by0, bx1 + 1, by1 + 1))
        dx = i * uW + (uW - fw) // 2
        dy = uH - fh                      # bottom-align (feet)
        out.alpha_composite(cell, (dx, dy))
    out.save(f"./gon_{name}_uniform.png")
    # contact proof on magenta
    bg = Image.new("RGBA", out.size, (255, 0, 255, 255)); bg.alpha_composite(out)
    sc = 3 if uW < 120 else 2
    bg.convert("RGB").resize((out.width*sc, out.height*sc)).save(f"gon_work/contact_{name}.png")
    print(f"  {name:14s} {nf:2d}f  cell {uW}x{uH}  (src y{y0}-{y1})")
    return {"name": name, "frames": int(nf), "w": int(uW), "h": int(uH)}

cfg = json.load(open("gon_work/actions.json"))
dims = {}
print("Slicing:")
for a in cfg:
    r = slice_action(a["name"], a["region"], a.get("select"), a.get("exclude_x"),
                     a.get("force_frames"), a.get("colmin", 1), a.get("gap", GAP))
    if r:
        dims[a["name"]] = r
json.dump(dims, open("gon_work/dims.json", "w"), indent=1)
print("wrote gon_work/dims.json")
