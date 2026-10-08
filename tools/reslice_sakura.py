#!/usr/bin/env python3
"""Slice the RBM-Kyuubi "Sakura Boruto NZC" JUS sheet into per-engine-action uniform strips.

Source: sakura_btng_nzc_by_rbm_kyuubi_dbxd9z4.png (901x3802, RGB, flat NAVY bg (0,64,128)).
  STEP1  navy-key -> binary alpha + navy de-spill (dark crescent FX sit at dist~115, safe at TOL=40).
  STEP2  per-engine-action SEGMENT list (y0,y1,xlo,xhi,N). Labels sit ABOVE rows (excluded by y);
         the one in-band label (Attack Combo (Air)) is erased. Multi-row actions (Attack Combo,
         Combo2) list several segments that CONCATENATE left->right into one strip.
  STEP3  per segment: island-detect (any-opaque col runs), then FORCE-TO-N by splitting the widest
         island at its deepest interior coverage valley / merging the closest pair (handles arcs that
         bridge poses AND specks that over-split). Repack into fixed-width cells (widest pose + pad),
         poses centered-x, FULL segment height preserved so anchorY=0 (feet) stays valid.
Mirrors tools/reslice_repack.py + reslice_byakuya.py. Emits sakura_<action>_uniform.png + portrait.
"""
import numpy as np, json
from PIL import Image

SRC = "sakura_btng_nzc_by_rbm_kyuubi_dbxd9z4.png"
BG = np.array([0, 64, 128]); TOL = 40; PAD = 3

def build_rgba():
    rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int16)
    keep = np.sqrt(((rgb - BG) ** 2).sum(2)) > TOL
    rgba = np.dstack([rgb.astype(np.uint8), (keep * 255).astype(np.uint8)])
    b_dom = (rgb[:, :, 2] > rgb[:, :, 0] + 50) & (rgb[:, :, 2] > rgb[:, :, 1] + 40) & keep
    rgba[:, :, 2][b_dom] = np.maximum(rgb[:, :, 0], rgb[:, :, 1])[b_dom].astype(np.uint8)
    rgba[1479:1495, 0:360, 3] = 0   # erase "Attack Combo (Air)" label text
    rgba[3200:3246, 288:346, 3] = 0  # erase Daichi "repeat" text + loop bracket mark
    return rgba

RGBA = build_rgba(); ALPHA = RGBA[:, :, 3]

def raw_islands(y0, y1, x0, x1, gap=4, min_w=6):
    occ = (ALPHA[y0:y1, x0:x1] > 0).any(0)
    runs, s = [], None
    for x, v in enumerate(occ):
        if v and s is None: s = x
        elif not v and s is not None: runs.append([s, x - 1]); s = None
    if s is not None: runs.append([s, len(occ) - 1])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] - 1 <= gap: merged[-1][1] = r[1]
        else: merged.append(list(r))
    return [[x0 + a, x0 + b] for a, b in merged if b - a + 1 >= min_w]

def force_to_n(y0, y1, x0, x1, n):
    isl = raw_islands(y0, y1, x0, x1)
    col_cov = (ALPHA[y0:y1, :] > 0).sum(0)
    # split widest until we have n
    while len(isl) < n:
        wi = max(range(len(isl)), key=lambda i: isl[i][1] - isl[i][0])
        a, b = isl[wi]; m = int((b - a) * 0.28)
        lo, hi = a + m, b - m
        if hi <= lo: break
        seam = lo + int(np.argmin(col_cov[lo:hi + 1]))
        isl[wi:wi + 1] = [[a, seam], [seam + 1, b]]
    # merge closest pair until we have n
    while len(isl) > n and len(isl) > 1:
        gi = min(range(len(isl) - 1), key=lambda i: isl[i + 1][0] - isl[i][1])
        isl[gi:gi + 2] = [[isl[gi][0], isl[gi + 1][1]]]
    return [(a, b + 1) for a, b in isl]   # half-open

def emit(name, segments):
    """segments: list of (y0,y1,x0,x1,n). Each segment is one physical row (own feet baseline =
    band bottom). Frames concatenate left->right; across rows they FEET-ALIGN (bottom) into a cell
    of height = tallest segment band. Within a row, full band height preserves relative pose Y."""
    frames = []   # (seg_y0, seg_y1, x0, x1)  — seg_y tightened to the row's true content (feet=y1)
    for (y0, y1, x0, x1, n) in segments:
        rows = np.where((ALPHA[y0:y1, x0:x1] > 0).any(1))[0]
        if len(rows) == 0: continue
        ty0, ty1 = y0 + rows[0], y0 + rows[-1] + 1   # ty1 = ground line for this row
        for (a, b) in force_to_n(y0, y1, x0, x1, n):
            if (ALPHA[ty0:ty1, a:b] > 0).any():
                frames.append((ty0, ty1, a, b))
    h = max(y1 - y0 for (y0, y1, _, _) in frames)
    cw = max(b - a for (_, _, a, b) in frames) + 2 * PAD
    sheet = Image.new("RGBA", (cw * len(frames), h), (0, 0, 0, 0))
    full = Image.fromarray(RGBA, "RGBA")
    for i, (y0, y1, a, b) in enumerate(frames):
        fw, fh = b - a, y1 - y0
        frame = full.crop((a, y0, b, y1))
        dx = i * cw + (cw - fw) // 2
        sheet.paste(frame, (dx, h - fh), frame)   # feet (band bottom) at cell bottom
    out = f"sakura_{name}_uniform.png"
    sheet.save(out)
    print(f"  {out:34s} frames:{len(frames):2d} width:{cw:3d} height:{h:3d}")
    return {"frames": len(frames), "width": int(cw), "height": int(h), "sheet": f"./{out}"}

CFG = {
 'idle':        [(517,588,0,300,4)],
 'run':         [(644,707,0,901,6)],
 'dash':        [(517,588,330,600,3)],
 'jump':        [(777,850,0,250,3)],
 'guard':       [(777,850,240,430,3)],
 'kawarimi':    [(777,850,500,660,1)],
 'hurt':        [(926,1005,0,355,3)],
 'knockdown':   [(926,1005,355,595,3)],
 'getup':       [(1045,1099,0,320,4)],
 'intro':       [(365,443,0,901,4)],
 'win':         [(3626,3760,0,540,4)],
 'light':       [(1173,1249,0,430,3),(1263,1346,0,430,3),(1354,1450,0,430,3)],
 'combo2':      [(1173,1249,430,800,3),(1263,1346,430,800,3),(1354,1450,430,800,4)],
 'air':         [(1495,1586,0,901,10)],
 'throw':       [(1657,1742,0,330,4)],
 'throw_air':   [(1657,1742,320,620,4)],
 'charge':      [(1802,1873,0,901,4)],
 'heavy':       [(1933,2012,0,901,4)],
 'heavy_fwd':   [(2087,2160,0,901,5)],
 'heavy_down':  [(2214,2293,0,360,4)],
 'heavy_down_fx':[(2250,2300,360,820,8)],
 'heavy_air':   [(2361,2440,0,901,6)],
 'byakugou':    [(2490,2563,0,901,9)],
 'special2':    [(2789,2885,0,901,6)],
 'special3':    [(2939,3030,0,901,4)],
 'special4':    [(3087,3155,0,901,3)],
 'daichi_cast': [(3221,3322,0,260,3)],
 'daichi_fx':   [(3221,3322,360,760,4)],
}

def main():
    meta = {}
    for name, segs in CFG.items():
        meta[name] = emit(name, segs)
    # Katsuyu slug: single clean sprite (tight alpha bbox of one slug)
    sub = ALPHA[2633:2742, 480:715] > 0
    ys = np.where(sub.any(1))[0]; xs = np.where(sub.any(0))[0]
    x0, y0, x1, y1 = 480 + xs[0], 2633 + ys[0], 480 + xs[-1] + 1, 2633 + ys[-1] + 1
    Image.fromarray(RGBA, "RGBA").crop((x0, y0, x1, y1)).save("sakura_katsuyu.png")
    print(f"  sakura_katsuyu.png                 {x1-x0}x{y1-y0}")
    # portrait: bust from idle frame 0
    sub = ALPHA[517:588, 20:85] > 0
    ys = np.where(sub.any(1))[0]; xs = np.where(sub.any(0))[0]
    x0, y0, x1, y1 = 20 + xs[0], 517 + ys[0], 20 + xs[-1] + 1, 517 + ys[-1] + 1
    Image.fromarray(RGBA, "RGBA").crop((x0, y0, x1, y1)).save("sakura_portrait.png")
    print(f"  sakura_portrait.png                {x1-x0}x{y1-y0}")
    json.dump(meta, open("tools/sakura/anim_meta.json", "w"), indent=1)
    print("\nwrote tools/sakura/anim_meta.json")

if __name__ == "__main__":
    main()
