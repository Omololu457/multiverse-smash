#!/usr/bin/env python3
# Slice SHISUI & ITACHI (KIDS) — rosterKey `shisui_itachi_kids` — from the source sheet
#   K = "kid_shisui_and_kid_itachi_nzc_by_altair_by_altairframemaker_defojue.png" (734x2303 RGBA)
#   bg = opaque navy (0,64,128)+noise. BORDER-FLOODFILL key (protects any interior navy pixels).
# Kid Shisui is the PLAYABLE body; Kid Itachi appears only as an assist (Phase 2+).
# FACING: sheet draws the boys FACING RIGHT. Engine draws P1 un-flipped expecting RIGHT-facing art -> FLIP_H=False.
# Labels sit ABOVE each row and are excluded by windowing the band y-range tightly below the label.
# TRAPS handled: the grey-haired PLACEHOLDER VICTIM inside Special-1 circles is NOT sliced (flash is code-drawn);
# the black-square spinning Mangekyou icon is NOT navy (own black box) -> not sliced here; red "blood" marks in the
# Special-2 box are removed by a red-key in phase2; the white scribble doodle is excluded by windowing.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "../kid_shisui_and_kid_itachi_nzc_by_altair_by_altairframemaker_defojue.png"
BG = np.array([0, 64, 128])
TOL = 40
ALPHA = 16
FLIP_H = False
OUT = ".."   # emit *_uniform.png into repo root (where the engine loads them)
W = 734

_rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)


def keyed():
    a = _rgb
    dist = np.abs(a - BG).sum(2)
    bgish = dist <= TOL
    lbl, n = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))
    alpha = np.where(remove, 0, 255).astype("uint8")
    return np.dstack([a.astype("uint8"), alpha])


IM = keyed()


def detect(y0, y1, x0=0, x1=W, min_sz=70, min_w=6, min_h=8, merge=True):
    """Connected components in the band. When merge=True, MERGE boxes whose x-ranges overlap — so a
    single frame's vertically-separated islands (body + a detached motion streak in the same x-run)
    become ONE box. Set merge=False for attack rows whose wide black-crescent FX would otherwise
    bridge two distinct frames; there the crescent is a separate component that can be idx-dropped."""
    sub = IM[y0:y1, x0:x1]
    mask = sub[..., 3] > ALPHA
    lbl, n = ndimage.label(mask)
    raw = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < min_sz:
            continue
        bx0, bx1, by0, by1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        if (bx1 - bx0 + 1) < min_w or (by1 - by0 + 1) < min_h:
            continue
        raw.append([bx0 + x0, by0 + y0, bx1 + x0, by1 + y0])
    raw.sort(key=lambda b: b[0])
    if not merge:
        return [tuple(b) for b in raw]
    merged = []
    for b in raw:
        if merged and b[0] <= merged[-1][2]:   # x-overlap with previous -> same frame
            p = merged[-1]
            p[1] = min(p[1], b[1]); p[2] = max(p[2], b[2]); p[3] = max(p[3], b[3])
        else:
            merged.append(b)
    return [tuple(b) for b in merged]


def tight(rect):
    x0, y0, x1, y1 = rect
    arr = IM[y0:y1 + 1, x0:x1 + 1]
    ys, xs = np.where(arr[:, :, 3] > ALPHA)
    if len(xs) == 0:
        return None
    return (x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()), y0 + int(ys.max()))


def pack(frames, out, feet=True, pad=1, src=None):
    frames = [f for f in frames if f is not None]
    uW = max(f[2] - f[0] + 1 for f in frames) + 2 * pad
    uH = max(f[3] - f[1] + 1 for f in frames) + 2 * pad
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    full = Image.fromarray(src if src is not None else IM)
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = full.crop((cx0, cy0, cx1 + 1, cy1 + 1))
        if FLIP_H:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        px = i * uW + (uW - w) // 2
        py = (uH - h - pad) if feet else (uH - h) // 2
        strip.paste(cell, (px, py), cell)
    strip.save(f"{OUT}/{out}")
    print(f"OK {out}: {len(frames)}f  {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH


def by_band(out, y0, y1, idx=None, x0=0, x1=W, feet=True, merge=True, **kw):
    boxes = detect(y0, y1, x0, x1, merge=merge, **kw)
    print(f"   {out}: detected {len(boxes)} boxes -> " + ", ".join(f"[{b[0]}-{b[2]}]" for b in boxes))
    if idx is not None:
        boxes = [boxes[i] for i in idx]
    return pack([tight(b) for b in boxes], out, feet=feet)


def by_rects(out, rects, feet=True):
    return pack([tight(r) for r in rects], out, feet=feet)


def portrait(out, rect, target_h=288, key_navy=True):
    x0, y0, x1, y1 = rect
    crop = _rgb[y0:y1, x0:x1].astype(np.int32)
    if key_navy:
        navy = np.abs(crop - BG).sum(2) <= 55
        alpha = np.where(navy, 0, 255).astype("uint8")
        im = Image.fromarray(np.dstack([crop.astype("uint8"), alpha]))
    else:
        im = Image.fromarray(crop.astype("uint8"))
    # tighten to content
    a = np.asarray(im)
    ys, xs = np.where(a[..., 3] > ALPHA)
    im = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    scale = target_h / im.height
    big = im.resize((max(1, round(im.width * scale)), target_h), Image.NEAREST)
    big.save(f"{OUT}/{out}")
    print(f"OK {out}: {big.size} portrait")


def raw(out, rect, key_navy=True):
    x0, y0, x1, y1 = rect
    crop = _rgb[y0:y1, x0:x1].astype(np.int32)
    if key_navy:
        navy = np.abs(crop - BG).sum(2) <= 55
        alpha = np.where(navy, 0, 255).astype("uint8")
        im = Image.fromarray(np.dstack([crop.astype("uint8"), alpha]))
    else:
        im = Image.fromarray(crop.astype("uint8"))
    im.save(f"{OUT}/{out}")
    print(f"OK {out}: raw {x1-x0}x{y1-y0}{' (navy-keyed)' if key_navy else ''}")


P = "shisui_itachi_kids"


def main():
    # ══ PHASE 1 — BODY / MOVEMENT / NORMALS / DMG / INTRO / WIN / PORTRAIT / SELECT ART ══
    # BODY / MOVEMENT (Shisui is the playable body)
    by_rects(f"{P}_idle_uniform.png", [(12, 230, 70, 308)])                 # Stance 1f (label 214-222 excluded)
    by_band(f"{P}_walk_uniform.png", 343, 392, x1=410)                      # Run row 6f (used for walk + run)
    by_band(f"{P}_jump_uniform.png", 426, 492, x1=190)                      # Jump 3f
    by_band(f"{P}_dash_uniform.png", 612, 688, x1=165)                      # Dash 3f (flicker streak incl.)
    by_rects(f"{P}_guard_uniform.png", [(112, 236, 170, 300)])             # Guard 1f (label 223-231 excluded)
    by_rects(f"{P}_charge_uniform.png", [(216, 236, 274, 310)])            # Chakra 1f (label 223-231 excluded)
    # DAMAGE (first two segs = taking-damage; windowed x<132 drops Heavy1 at x146+)
    by_band(f"{P}_hurt_uniform.png", 518, 585, x1=132)                      # Taking Damage 2f
    # KNOCKED DOWN band: tumble + lying (streak FX at x357 and get-up split out below)
    by_band(f"{P}_knockdown_uniform.png", 713, 777, x0=180, x1=335)         # 2f (tumble -> lying)
    by_rects(f"{P}_getup_uniform.png", [(398, 712, 448, 778)])            # 1f rising/ready
    by_rects(f"{P}_lose_uniform.png", [(259, 712, 327, 778)])             # 1f lying (no dedicated lose art -> last knockdown frame)
    # NORMALS — Attack Combo rows (crescents baked into swing frames)
    by_band(f"{P}_light_uniform.png", 813, 876, x1=460, merge=False)        # combo row1 5f
    by_band(f"{P}_up_uniform.png", 882, 946, x1=480)                        # combo row2 8f (used for Up-attack flurry)
    by_band(f"{P}_heavy_uniform.png", 961, 1030, x1=480, merge=False)       # combo row3 5f
    by_band(f"{P}_air_uniform.png", 1078, 1152, x1=460, merge=False)        # Air Combo row1 5f
    by_rects(f"{P}_downair_uniform.png", [(55, 712, 108, 778)])           # 1f head-down dive (Heavy3)
    # INTRO — BOTH boys (Itachi left + Shisui right) as one wide frame
    by_rects(f"{P}_intro_uniform.png", [(14, 118, 98, 206)])              # both boys
    # WIN — Shisui standing (flicker streak excluded by x>=162)
    by_rects(f"{P}_win_uniform.png", [(162, 118, 208, 206)])              # Shisui win 1f
    # PORTRAIT — Shisui face from the illustration bust
    portrait(f"{P}_portrait.png", (566, 58, 728, 205))
    # SELECT ART / CUT-IN — full illustration (both boys), navy-keyed
    raw(f"{P}_select.png", (415, 4, 734, 432), key_navy=True)


if __name__ == "__main__":
    main()
