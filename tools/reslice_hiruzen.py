#!/usr/bin/env python3
# Re-slice Hiruzen Sarutobi source strips into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_jason.py / reslice_isshiki.py (alpha-gutter frame detect ->
# per-frame content bbox -> repack into one uniform cell: centered-X, BOTTOM-aligned).
# ADDS `band=(y0,y1)` (row crop, for the 2-ROW intro sheet) + `xrects=[(x0,x1),...]`
# (hand-authored x-ranges) for the merged/rope-crossing frames the audit flagged:
#   dash  frame 2 = shunshin-ghost: staff crosses a gutter -> 2 auto-runs = ONE frame.
#   jump  4 figures are clean but rope tails scatter into 1-2px runs -> xrects fold them in.
#   back_jump frames 2&3 are MERGED (rope crosses the gutter, valley at x113) -> hand split.
# SOURCES are the WATERMARK-CLEANED per-action PNGs (dash/jump/back_jump were cleaned;
# originals preserved in _hiruzen_raw_backup/). Writes hiruzen_<name>_uniform.png.
from PIL import Image

ALPHA = 16

def runs_of(px, W, H, y0, y1):
    col = [sum(1 for y in range(y0, y1 + 1) if px[x, y][3] > ALPHA) for x in range(W)]
    out = []; s = -1
    for x in range(W):
        if col[x] > 0:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, W - 1])
    return out

def reslice(src, out, band=None, xrects=None, minw=3):
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    y0, y1 = (0, H - 1) if band is None else band
    if xrects is not None:
        runs = [list(r) for r in xrects]
    else:
        runs = [r for r in runs_of(px, W, H, y0, y1) if (r[1] - r[0] + 1) >= minw]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = y1 + 1, y0 - 1
        for y in range(y0, y1 + 1):
            for x in range(rx0, rx1 + 1):
                if px[x, y][3] > ALPHA:
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    break
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        dx = i * uW + (uW - sw) // 2
        dy = uH - sh - 1
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

if __name__ == "__main__":
    P = "hiruzen_sarutobi_"
    # ── movement / state (clean alpha gutters) ──
    reslice(P + "idle.png",  "hiruzen_idle_uniform.png")    # 4 frames — breathing loop
    reslice(P + "run.png",   "hiruzen_run_uniform.png")     # 6 frames — run cycle
    reslice(P + "block.png", "hiruzen_block_uniform.png")   # 1 frame  — low crouch-guard (static held)
    reslice(P + "hit.png",   "hiruzen_hit_uniform.png")     # 2 frames — hit-recoil
    # ── dash (watermark-cleaned) — frame 2 = shunshin ghost (staff crosses gutter -> merged xrect). ──
    reslice(P + "dash.png", "hiruzen_dash_uniform.png", band=(0, 56),
            xrects=[(3, 64), (79, 136), (156, 207)])        # 3 frames; drops the 2px right-edge debris
    # ── jump (watermark-cleaned) — 4 figures clean; rope-tail 1-2px runs folded into frame 4. ──
    reslice(P + "jump.png", "hiruzen_jump_uniform.png",
            xrects=[(2, 47), (53, 104), (108, 164), (170, 221)])   # 4 frames
    # ── back_jump (watermark-cleaned) — frames 2&3 merged by rope crossing (valley x113) -> hand split;
    #    dedupe: sourced from THIS file only (the jump/back_jump master-overlap columns are not reused). ──
    reslice(P + "back_jump.png", "hiruzen_back_jump_uniform.png",
            xrects=[(1, 60), (78, 113), (114, 178)])        # 3 frames
    # ── two-part intro (2-row sheet): row1 = character (Hokage robe -> combat stance, 5f);
    #    row2 = the discarded hat/robe tumbling to the ground (4f, composited FX prop). ──
    reslice(P + "intro.png", "hiruzen_intro_uniform.png",      band=(8, 61))    # ROW1: 5 char frames
    reslice(P + "intro.png", "hiruzen_introrobe_uniform.png",  band=(90, 124))  # ROW2: 4 falling-robe frames
    # ── STAGE 2 — NORMALS + SPIN (clean alpha gutters). ──
    # punches = ONE 7-frame punch COMBO string. light = the full flurry (frames 0-6); heavy = the wide
    # power finisher (frames 5-6) read off the SAME uniform sheet via sourceX. up/air/down_air are ART
    # GAPS -> they reuse punch frames as a generic attacking pose (flagged; no dedicated art invented).
    reslice(P + "punches.png", "hiruzen_punches_uniform.png")   # 7 frames — punch combo string
    # roll = the SPIN (master label; NEVER "roll" in code) -> evasive spinning dodge special. 4 frames.
    reslice(P + "roll.png", "hiruzen_spin_uniform.png")         # 4 frames — evasive SPIN
