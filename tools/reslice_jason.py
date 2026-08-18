#!/usr/bin/env python3
# Re-slice Jason Voorhees source strips into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_strip.mjs (alpha-gutter frame detect → per-frame content
# bbox → repack into one uniform cell: centered-X, BOTTOM-aligned). ADDS support
# for FORCED splits of touching/merged runs (walk/slash_1/slash_2/slash_1_crouch)
# — the audit measured these; a pure alpha-gutter scan merges them. Split point =
# the minimum-content column inside the middle band of the merged run.
# Writes jason_<name>_uniform.png. Prints the animationData frames/width/height.
import sys
from PIL import Image

ALPHA = 16

def runs_of(px, W, H):
    col = [sum(1 for y in range(H) if px[x, y][3] > ALPHA) for x in range(W)]
    out = []; s = -1
    for x in range(W):
        if col[x] > 0:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, W - 1])
    return out, col

def split_run(run, col, parts):
    # split [a,b] into `parts` sub-runs at the lowest-content interior columns
    a, b = run
    if parts <= 1: return [run]
    width = b - a + 1
    seg = width / parts
    cuts = []
    for k in range(1, parts):
        center = a + int(seg * k)
        band = max(4, int(seg * 0.30))
        lo, hi = max(a + 1, center - band), min(b - 1, center + band)
        cut = min(range(lo, hi + 1), key=lambda x: col[x])
        cuts.append(cut)
    bounds = [a] + cuts + [b]
    res = []
    for i in range(len(bounds) - 1):
        lft = bounds[i] if i == 0 else bounds[i] + 1
        res.append([lft, bounds[i + 1]])
    return res

def reslice(src, out, split_map=None, keep=None):
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    runs, col = runs_of(px, W, H)
    if split_map:
        expanded = []
        for i, r in enumerate(runs):
            expanded += split_run(r, col, split_map.get(i, 1))
        runs = expanded
    if keep is not None:
        runs = runs[keep[0]:keep[1] + 1]
    # per-frame content bbox (y scanned within the run's x-range)
    frames = []
    for x0, x1 in runs:
        miny, maxy = H, -1
        for y in range(H):
            for x in range(x0, x1 + 1):
                if px[x, y][3] > ALPHA:
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    break
        frames.append((x0, miny, x1 - x0 + 1, maxy - miny + 1))
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        dx = i * uW + (uW - sw) // 2
        dy = uH - sh - 1
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"✔ {out}: {len(frames)} frames · cell {uW}x{uH}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

if __name__ == "__main__":
    # (src, out, split_map, keep)
    JOBS = [
        ("jason_idl.png",                          "jason_idle_uniform.png",        None, None),
        ("jason_voorhees_walk.png",                "jason_walk_uniform.png",        {7: 2}, None),
        ("jason_voorhees_jump.png",                "jason_jump_uniform.png",        None, None),
        ("jason_voorhees_hit.png",                 "jason_hit_uniform.png",         None, None),  # all 6: 0-3 hit, 4-5 knockdown via sourceX
        ("jason_voorhees_foward_punch.png",        "jason_light_uniform.png",       None, None),
        ("jason_voorhees_slash_1.png",             "jason_heavy_uniform.png",       {2: 2}, None),
        ("jason_voorhees_slash_2.png",             "jason_up_uniform.png",          {1: 2}, None),
        ("jason_voorhees_foward_punch_air.png",    "jason_air_uniform.png",         None, None),
        ("jason_voorhees_down_air_attack.png",     "jason_down_air_uniform.png",    None, None),
        ("jason_voorhees_foward_punch_crouch.png", "jason_crouch_light_uniform.png",None, None),
        ("jason_voorhees_slash_1_crouch.png",      "jason_crouch_heavy_uniform.png",{2: 2}, None),
    ]
    for src, out, sm, keep in JOBS:
        reslice(src, out, sm, keep)
