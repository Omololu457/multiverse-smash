#!/usr/bin/env python3
# Build Spider-Man (SSF2 style) — rosterKey "spiderman_ssf2" — from the single fan-art sheet
# spiderman/spider_man_ssf2_spritesheet_unfinished_cancelled__by_alejomilich_dfak1g5-fullview.jpg
# (art by "alejomilich"; UNFINISHED/CANCELLED sheet, solid blue bg 103,116,255, saved as a lossy JPG).
# Pipeline: (1) EDGE FLOOD-FILL key the connected blue background to alpha — flood (not global) so the
# costume's DARK-NAVY blue (~31,63,141, enclosed by red/black outline) survives; + a 1px halo-erode to
# kill JPG edge fringe. (2) per-band alpha-gutter reslice → feet-aligned uniform cells (ssf2_*_uniform.png).
# SOURCE stays UNTOUCHED. Frame map VERIFIED by a visual-QA pass (see updates / conversation): only the
# clean single-row bands (y>=888) are used. The TOP grid (y<866) is a collapsed 2-D block; band y1426+ is a
# DIFFERENT photoreal art rip with un-keyed backgrounds; band y1521+ is a title banner — ALL avoided.
# MINIMAL-but-real, HEAVILY gap-flagged (the sheet is cancelled). NO specials / ultimate.
import sys
from collections import deque
from PIL import Image

SRC = "spiderman/spider_man_ssf2_spritesheet_unfinished_cancelled__by_alejomilich_dfak1g5-fullview.jpg"
BG = (103, 116, 255); TOL = 72
ALPHA = 16

def _close(p, tol):
    return (p[0]-BG[0])**2 + (p[1]-BG[1])**2 + (p[2]-BG[2])**2 <= tol*tol

def keyed_master():
    im = Image.open(SRC).convert("RGBA"); W, H = im.size; px = im.load()
    seen = bytearray(W * H); dq = deque()
    for x in range(W):
        for y in (0, H - 1):
            if _close(px[x, y], TOL) and not seen[y*W+x]: seen[y*W+x] = 1; dq.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if _close(px[x, y], TOL) and not seen[y*W+x]: seen[y*W+x] = 1; dq.append((x, y))
    while dq:
        x, y = dq.popleft(); px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < W and 0 <= ny < H and not seen[ny*W+nx] and _close(px[nx, ny], TOL):
                seen[ny*W+nx] = 1; dq.append((nx, ny))
    # 1px halo erode: opaque bg-ish pixel touching transparent → clear
    kill = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and _close(px[x, y], TOL+34) and any(
                0 <= x+dx < W and 0 <= y+dy < H and px[x+dx, y+dy][3] == 0 for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
                kill.append((x, y))
    for x, y in kill: px[x, y] = (0, 0, 0, 0)
    return im

def runs_of(px, x0, x1, y0, y1):
    col = [any(px[x, y][3] > ALPHA for y in range(y0, y1 + 1)) for x in range(x0, x1 + 1)]
    out = []; s = -1
    for i, x in enumerate(range(x0, x1 + 1)):
        if col[i]:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, x1])
    return out

def reslice(im, out, band, pick=None, minw=10):
    W, H = im.size; px = im.load(); y0, y1 = band
    runs = [r for r in runs_of(px, 0, W - 1, y0, y1) if (r[1]-r[0]+1) >= minw]
    if pick is not None: runs = [runs[i] for i in pick]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = y1 + 1, y0 - 1
        for y in range(y0, y1 + 1):
            if any(px[x, y][3] > ALPHA for x in range(rx0, rx1 + 1)):
                if y < miny: miny = y
                if y > maxy: maxy = y
        if maxy >= miny: frames.append((rx0, miny, rx1-rx0+1, maxy-miny+1))
    if not frames:
        print(f"!! {out}: NO frames band {band} pick {pick}"); return 0, 0, 0
    uW = max(f[2] for f in frames) + 2; uH = max(f[3] for f in frames) + 2
    strip = Image.new("RGBA", (uW*len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        strip.paste(im.crop((sx, sy, sx+sw, sy+sh)), (i*uW + (uW-sw)//2, uH-sh-1), im.crop((sx, sy, sx+sw, sy+sh)))
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH} widths={[f[2] for f in frames]}")
    return len(frames), uW, uH

# clean single-row bands (VERIFIED). idx→y: b2=(888,944) b3=(965,1021) b5=(1130,1190) b6=(1208,1261) b8=(1370,1418)
FINAL_JOBS = [
    dict(out="ssf2_idle_uniform.png",      band=(1208, 1261), pick=[0]),          # b6 f0 fighting stance (single — no breathing loop on sheet → GAP)
    dict(out="ssf2_walk_uniform.png",      band=(965, 1021),  pick=[0, 1, 2]),    # b3 stride
    dict(out="ssf2_run_uniform.png",       band=(965, 1021),  pick=[2, 3, 4]),    # b3 lean/run
    dict(out="ssf2_jump_uniform.png",      band=(888, 944),   pick=[1, 2, 3]),    # b2 tuck→rise (f0 is a merged artifact → skipped)
    dict(out="ssf2_fall_uniform.png",      band=(888, 944),   pick=[8, 9]),       # b2 dive/descend
    dict(out="ssf2_air_uniform.png",       band=(888, 944),   pick=[5, 6]),       # b2 air-kick
    dict(out="ssf2_downair_uniform.png",   band=(888, 944),   pick=[9]),          # b2 dive
    dict(out="ssf2_light_uniform.png",     band=(1208, 1261), pick=[0, 1]),       # b6 stance strike
    dict(out="ssf2_heavy_uniform.png",     band=(1130, 1190), pick=[0, 1]),       # b5 lunge-kick
    dict(out="ssf2_up_uniform.png",        band=(965, 1021),  pick=[7]),          # b3 up-reach launcher
    dict(out="ssf2_crouch_uniform.png",    band=(1370, 1418), pick=[1]),          # b8 duck
    dict(out="ssf2_knockdown_uniform.png", band=(1208, 1261), pick=[4, 5, 6, 7]), # b6 tumble→ground
]

if __name__ == "__main__":
    im = keyed_master(); im.save("/tmp/ssf2_master.png")
    for j in FINAL_JOBS:
        reslice(im, **j)
