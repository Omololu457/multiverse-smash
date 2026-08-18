#!/usr/bin/env python3
# Kurapika (HxH, JUS-style sheet by ultimos60) — BUILD pass: cut the already-sliced
# kurapika_row_NN.png strips into CLEAN uniform, feet-aligned, DESPECKLED per-action
# cells (mirrors tools/reslice_light.py reslice()). The row strips come from the
# slice-only tools/reslice_kurapika.py; THIS tool turns a chosen row (or frame range)
# into one kurapika_<action>_uniform.png ready to wire into characters.js animationData.
#
# WHY despeckle: the source JPEG leaves stray 1-3px dark specks around every sprite that
# survive the bg key (slightly-coloured, not pure black). Left in, the fighter renders
# with a halo of noise. We drop connected components below MINAREA per frame (real body +
# attached FX slashes/dust are large components and survive; isolated specks die).
#
# USAGE (import + call reslice_row from __main__, same knobs as reslice_light):
#   reslice_row(1, "kurapika_idle_uniform.png", keep=(0,3), pingpong=True)
import os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import label

ALPHA = 16
MINAREA = 10   # connected-component area (px) below which a blob is treated as JPEG speck and dropped

def _despeckle(rgba_np):
    """Zero-alpha any connected alpha-component smaller than MINAREA (8-connectivity)."""
    a = rgba_np[:, :, 3] > ALPHA
    lab, n = label(a, structure=np.ones((3, 3), int))
    if n == 0:
        return rgba_np
    counts = np.bincount(lab.ravel())
    small = np.isin(lab, np.where(counts < MINAREA)[0]) & a
    rgba_np[small, 3] = 0
    return rgba_np

def _runs(alpha_bool):
    occ = alpha_bool.any(axis=0)
    out, s = [], -1
    for x, v in enumerate(occ):
        if v and s < 0:
            s = x
        elif not v and s >= 0:
            out.append([s, x - 1]); s = -1
    if s >= 0:
        out.append([s, len(occ) - 1])
    return out

def reslice_row(row, out, keep=None, pick=None, xrects=None, minw=8, pingpong=False,
                pad_to=None, despeckle=True, src=None):
    src = src or f"kurapika_row_{row:02d}.png"
    im = Image.open(src).convert("RGBA")
    arr = np.array(im)
    if despeckle:
        arr = _despeckle(arr)
    a = arr[:, :, 3] > ALPHA
    H, W = a.shape
    if xrects is not None:
        runs = [list(r) for r in xrects]
    else:
        runs = [r for r in _runs(a) if (r[1] - r[0] + 1) >= minw]
        if keep is not None:
            runs = runs[keep[0]:keep[1] + 1]
        if pick is not None:
            runs = [runs[i] for i in pick]
    frames = []
    for rx0, rx1 in runs:
        sub = a[:, rx0:rx1 + 1]
        ys = np.where(sub.any(axis=1))[0]
        if len(ys) == 0:
            continue
        miny, maxy = ys[0], ys[-1]
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    if not frames:
        print(f"!! {out}: no frames from {src}"); return 0, 0, 0
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    if pad_to:
        uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    order = list(range(len(frames)))
    if pingpong and len(frames) > 2:
        order = order + list(range(len(frames) - 2, 0, -1))
    despeckled_im = Image.fromarray(arr, "RGBA")
    strip = Image.new("RGBA", (uW * len(order), uH), (0, 0, 0, 0))
    for i, fi in enumerate(order):
        sx, sy, sw, sh = frames[fi]
        cell = despeckled_im.crop((sx, sy, sx + sw, sy + sh))
        dx = i * uW + (uW - sw) // 2
        dy = uH - sh - 1
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"OK {out}: {len(order)}f cell {uW}x{uH} widths={[frames[i][2] for i in order]}")
    print(f"   animationData -> {{ frames: {len(order)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(order), uW, uH

if __name__ == "__main__":
    # ── STAGE 1 — movement / state ──
    # row_01: frames 0-3 upright standing bob (idle), 4-7 running lean, 8-9 dust FX (drop).
    reslice_row(1, "kurapika_idle_uniform.png", keep=(0, 3), pingpong=True)   # idle 4f -> 1->4->1 bob
    reslice_row(1, "kurapika_walk_uniform.png", keep=(0, 7))                  # full walk/run cycle (no dust)
    reslice_row(1, "kurapika_run_uniform.png",  keep=(4, 7))                  # running-lean subset (faster)
    reslice_row(15, "kurapika_dash_uniform.png")                             # low lunge + streaks (minw drops 5px stray)
    # row_04 = clean recoil -> fall -> prone -> getup. hurt = first 3 recoil frames; knockdown = full arc.
    # (row_05 is NOT a hurt anim — it carries a yellow-X attack flash; reserved for a Stage-2 normal.)
    reslice_row(4, "kurapika_hurt_uniform.png", keep=(0, 2))                 # light recoil / stagger
    reslice_row(4, "kurapika_knockdown_uniform.png")                         # recoil -> fall -> prone -> getup (folded)
    reslice_row(8, "kurapika_guard_uniform.png", keep=(0, 0))                # standing guard hold (windmill frame 0)
    reslice_row(23, "kurapika_leap_uniform.png")                             # leap (jump/fall reuse; up/air source in S2)

    # ── STAGE 2 — normals + windmill command-normal (candidate cuts; frame ranges picked from the montage) ──
    reslice_row(2, "kurapika_light_uniform.png", keep=(0, 7))     # strike→overhead-slash auto-combo (drop body-less flame f8-9)
    reslice_row(3, "kurapika_heavy_uniform.png", keep=(1, 7))     # windup→overhead→downslash→extended chain-thrust (reach)
    reslice_row(5, "kurapika_up_uniform.png", keep=(2, 6))        # white aura + rising yellow-X cross-slash → up launcher
    reslice_row(8, "kurapika_windmill_uniform.png", keep=(1, 8))  # windmill spin→strike → Fwd+Heavy command-normal
    reslice_row(23, "kurapika_air_uniform.png", keep=(1, 2))      # leap-slash + descend → air normal (down_air reuses this)

    # ── STAGE 3 — 3 Nen specials (cast poses + Chain Jail bind FX; frame ranges picked from the montage) ──
    reslice_row(20, "kurapika_judgment_uniform.png")   # Judgment Chain: windup→throw→extended chain forward (Neutral special)
    reslice_row(17, "kurapika_chainjail_uniform.png")  # Chain Jail cast: spin→summon (Down special)
    reslice_row(19, "kurapika_jailfx_uniform.png")     # Chain Jail bind FX: vertical chain columns (placed on TARGET, visual-only)
    reslice_row(6, "kurapika_steal_uniform.png")       # Steal Chain: counter stance→catch-orb→counter-slash (Back special)

    # ── STAGE 4 — status-effect special (shock/paralyze) + Nen charge pose (feeds Emperor Time) ──
    reslice_row(7, "kurapika_shock_uniform.png", keep=(0, 7))    # red-spark paralyze gesture (Fwd special; drop trailing UI status-cards)
    reslice_row(12, "kurapika_charge_uniform.png", keep=(2, 4))  # white-aura Nen-gather charge LOOP (feeds Emperor Time; reused as ET trigger in S5)

    # ── STAGE 5 — EMPEROR TIME: Set B (scarlet-eyed recolor, rows 26-49 = Set A rows 01-24 + 25) cut with the
    # SAME keep ranges into __emperor-suffixed sheets → retagFormAnim("emperor") swaps the WHOLE moveset on
    # transform. Row mapping = Set A row + 25. Frame counts printed below MUST match the Set A cuts above.
    reslice_row(26, "kurapika_idle_uniform__emperor.png",  keep=(0, 3), pingpong=True)
    reslice_row(26, "kurapika_walk_uniform__emperor.png",  keep=(0, 7))
    reslice_row(26, "kurapika_run_uniform__emperor.png",   keep=(4, 7))
    reslice_row(40, "kurapika_dash_uniform__emperor.png")
    reslice_row(29, "kurapika_hurt_uniform__emperor.png",  keep=(0, 2))
    reslice_row(29, "kurapika_knockdown_uniform__emperor.png", minw=12)   # minw drops an 8px Set-B stray (Set A had none)
    reslice_row(33, "kurapika_guard_uniform__emperor.png", keep=(0, 0))
    reslice_row(48, "kurapika_leap_uniform__emperor.png")
    reslice_row(48, "kurapika_air_uniform__emperor.png",   keep=(1, 2))
    reslice_row(27, "kurapika_light_uniform__emperor.png", keep=(0, 7))
    reslice_row(28, "kurapika_heavy_uniform__emperor.png", keep=(1, 7))
    reslice_row(30, "kurapika_up_uniform__emperor.png",    keep=(2, 6))
    reslice_row(33, "kurapika_windmill_uniform__emperor.png", keep=(1, 8))
    reslice_row(45, "kurapika_judgment_uniform__emperor.png")
    reslice_row(42, "kurapika_chainjail_uniform__emperor.png")
    reslice_row(31, "kurapika_steal_uniform__emperor.png")
    reslice_row(32, "kurapika_shock_uniform__emperor.png", keep=(0, 7))
    reslice_row(37, "kurapika_charge_uniform__emperor.png", keep=(2, 4))
