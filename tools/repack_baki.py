#!/usr/bin/env python3
# BAKI HANMA — build-stage repack: take the audit's row crops in baki_sliced/ (already green-keyed RGBA)
# and repack each into a UNIFORM, feet-aligned cell strip `baki_*_uniform.png` at the project root
# (anchorY:0 convention). Mirrors tools/reslice_yamamoto.py `_reslice_im` (alpha-gutter frame detect →
# per-frame content bbox → centered-X, BOTTOM-aligned uniform cells). FX-heavy special rows (barrage/
# rush/shockwave) keep whatever gutter-separable frames exist; minw drops sub-6px FX debris slivers.
from PIL import Image

ALPHA = 16
SRC = "baki_sliced/%s.png"
OUT = "./%s.png"


def runs_of(px, W, y0, y1):
    col = [any(px[x, y][3] > ALPHA for y in range(y0, y1 + 1)) for x in range(W)]
    out = []; s = -1
    for x in range(W):
        if col[x]:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, W - 1])
    return out


def repack(src, out, minw=6, pick=None, keep=None, gap=1, pad_to=None, xframes=None, ytop=0, ybot=None):
    im = Image.open(SRC % src).convert("RGBA")
    W, H = im.size
    # ytop/ybot trim (drop a label/bracket band that has no alpha gutter from the figures below it)
    if ytop or ybot is not None:
        im = im.crop((0, ytop, W, ybot if ybot is not None else H)); W, H = im.size
    px = im.load()
    if xframes is not None:
        # EXPLICIT per-frame x-ranges — for rows where two poses TOUCH (no alpha gutter) so auto-detect
        # merges them into one wide "two-figures" cell (the barrage double-frame bug). Cuts are measured
        # at the column-fill valley between the touching figures.
        runs = list(xframes)
    else:
        runs = [r for r in runs_of(px, W, 0, H - 1) if (r[1] - r[0] + 1) >= minw]
    if keep is not None: runs = runs[keep[0]:keep[1] + 1]
    if pick is not None: runs = [runs[i] for i in pick]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = H, -1
        for y in range(H):
            if any(px[x, y][3] > ALPHA for x in range(rx0, rx1 + 1)):
                if y < miny: miny = y
                if y > maxy: maxy = y
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    if pad_to: uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        strip.paste(cell, (i * uW + (uW - sw) // 2, uH - sh - gap), cell)
    strip.save(OUT % out)
    print(f"OK {out:26s} {len(frames)}f  cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    return len(frames), uW, uH


if __name__ == "__main__":
    # (src_row_file, out_uniform_name, kwargs)
    jobs = [
        # ── movement / state ──
        ("baki_row_02",              "baki_idle_uniform",      {}),
        ("baki_row_03",              "baki_walk_uniform",      {}),
        ("baki_row_04",              "baki_run_uniform",       {}),
        ("baki_row_03b_dash",        "baki_dash_uniform",      {}),
        ("baki_row_05",              "baki_jump_uniform",      {}),
        ("baki_row_05b_guard",       "baki_guard_uniform",     {}),
        ("baki_row_06",              "baki_hit_uniform",       {}),
        ("baki_row_06b_knockdown",   "baki_knockdown_uniform", {}),
        ("baki_row_19",              "baki_win_uniform",       {}),
        ("baki_row_19b_lose",        "baki_lose_uniform",      {}),
        # ── normals ──
        ("baki_row_08",              "baki_light_uniform",     {}),
        ("baki_row_09",              "baki_heavy_uniform",     {}),
        ("baki_row_10",              "baki_up_uniform",        {}),
        ("baki_row_11",              "baki_air_uniform",       {}),
        ("baki_row_14",              "baki_downair_uniform",   {}),
        # ── command rekka (Fwd+Heavy) ──
        ("baki_row_12",              "baki_g1_uniform",        {}),
        ("baki_row_13",              "baki_g2_uniform",        {}),
        # ── specials ──
        # ★ barrage: row_17 is 7 real poses but 2 pairs TOUCH → auto-detect merged them into "two-Baki"
        #   double-cells (frames 1 & 5). Split at the measured column-fill valleys (x=33, x=299) and trim
        #   the top REPEAT-bracket band (y<18, no alpha gutter from the heads below). See BAKI_ASSET_MAP.
        ("baki_row_17",              "baki_barrage_uniform",   {"ytop": 18,
            "xframes": [(0, 32), (34, 67), (72, 114), (128, 170), (183, 233), (245, 298), (300, 360)]}),
        ("baki_row_16a_koma_rush",   "baki_rush_uniform",      {"minw": 12}),   # drop FX slivers
        ("baki_row_15a_koma_combo",  "baki_rising_uniform",    {}),
        ("baki_row_18a_shockwave",   "baki_shockwave_uniform", {}),
        # ── ultimate flex / intro (row_07 ULTIMATE ACTION) ──
        ("baki_row_07",              "baki_demonback_uniform", {}),
    ]
    for src, out, kw in jobs:
        repack(src, out, **kw)
