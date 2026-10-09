"""Gaara (rosterKey `gaara`) — keying + per-action uniform-strip slicer.

Source G = "DS _ DSi ... Playable Characters - Gaara.png" (1325x2218, RGBA),
bright-green background (0,204,0) + noise. Strategy mirrors the project's
established DS/DSi pipeline (naruto_seventh_work/key_tool.py):

  1. border-flood-fill key the green (tol=45) so interior beige sand FX and
     the dark gourd survive (they are not border-connected).
  2. per ACTION, crop the listed native frame boxes, trim each to its own
     content bbox, then re-pack bottom-aligned (feet) + horizontally centred
     into a fixed-cell uniform strip -> gaara_<action>_uniform.png.

Emits the (frames,width,height) per action to paste into characters.js
animationData. Pure art tooling; no engine files touched.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "DS _ DSi - Naruto Shippuden_ Ninja Council 4 - Playable Characters - Gaara.png"
PAD = 2  # transparent margin around the packed cell


def border_floodfill_alpha(im, bg=(0, 204, 0), tol=45):
    rgb = im[..., :3].astype(np.int32)
    dist = np.abs(rgb - np.array(bg)).sum(2)
    bgish = dist <= tol
    lbl, _ = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))
    out = im.copy()
    out[remove, 3] = 0
    return out


def trim(cell):
    """Trim an RGBA np array to its non-transparent bbox; None if empty."""
    a = cell[..., 3] > 16
    if not a.any():
        return None
    ys, xs = np.where(a)
    return cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def strip_green(cell):
    """Zero the alpha of any greenish pixel. Safe ONLY for the sand FX rows (sand is beige/brown, never
    green) — kills the enclosed green-background pockets the border flood-fill can't reach + the sheet's
    green spawn-point marker dots. Not used on the body sprites (which could legitimately hold other hues)."""
    out = cell.copy()
    rgb = out[..., :3].astype(int)
    greenish = (rgb[..., 1] > 110) & (rgb[..., 1] - rgb[..., 0] > 35) & (rgb[..., 1] - rgb[..., 2] > 35)
    out[greenish, 3] = 0
    return out


def build(keyed, y0, y1, boxes, name, feet_align=True, degreen=False):
    """boxes = list of (x0,x1). Returns (strip Image, frames, cw, ch). degreen=True strips residual
    green-bg pockets (sand FX only)."""
    frames = []
    for (x0, x1) in boxes:
        sub = keyed[y0:y1, x0:x1]
        if degreen:
            sub = strip_green(sub)
        t = trim(sub)
        if t is not None:
            frames.append(t)
    if not frames:
        print(f"  !! {name}: NO content")
        return None
    cw = max(f.shape[1] for f in frames) + PAD * 2
    ch = max(f.shape[0] for f in frames) + PAD * 2
    strip = np.zeros((ch, cw * len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        fh, fw = f.shape[:2]
        ox = i * cw + (cw - fw) // 2
        oy = (ch - fh - PAD) if feet_align else (ch - fh) // 2
        strip[oy:oy + fh, ox:ox + fw] = f
    img = Image.fromarray(strip)
    img.save(f"gaara_{name}_uniform.png")
    print(f"  gaara_{name}_uniform.png  frames={len(frames)} w={cw} h={ch}")
    return img, len(frames), cw, ch


def even(x0, x1, n):
    """Split [x0,x1] into n equal columns -> list of (a,b)."""
    step = (x1 - x0) / n
    return [(int(round(x0 + i * step)), int(round(x0 + (i + 1) * step))) for i in range(n)]


def main():
    im = np.asarray(Image.open(SRC).convert("RGBA")).copy()
    keyed = border_floodfill_alpha(im)
    Image.fromarray(keyed).save("tools/gaara/G_keyed.png")

    # Precise frame boxes — label-free Y bands + X-runs detected from the keyed sheet.
    # ── MOVEMENT / STATE ──
    build(keyed, 75, 136, [(19, 54), (73, 106), (125, 157), (174, 206), (224, 256), (274, 307)], "idle")
    build(keyed, 174, 235, [(24, 63), (80, 116), (132, 165), (180, 216), (234, 271), (284, 317)], "walk")
    build(keyed, 174, 235, [(380, 424), (448, 488), (510, 553), (583, 624), (648, 689), (716, 762)], "run")
    build(keyed, 174, 235, [(809, 841), (861, 893)], "teleport")   # sand-flicker (Phase 2 Shunshin)
    build(keyed, 270, 345, [(25, 74), (81, 117), (132, 179), (192, 235)], "jump")
    build(keyed, 174, 235, [(953, 999), (1008, 1054)], "hurt")
    build(keyed, 174, 235, [(1066, 1120), (1135, 1188), (1198, 1260), (1272, 1307)], "knockdown")
    build(keyed, 270, 345, even(1140, 1251, 2), "getup")
    build(keyed, 373, 455, [(24, 68), (69, 113), (133, 166)], "crouch")
    build(keyed, 2098, 2182, [(50, 93), (112, 148), (166, 208), (234, 267)], "win")

    # ── NORMALS ──
    # light = Y Combo jab string (first 6 clean frames)
    build(keyed, 491, 566, [(26, 53), (75, 125), (139, 190), (205, 243), (260, 295), (312, 360)], "light")
    # heavy = Run Attack (ground sand wave) — 8 full-pose frames (drop tiny settle tail)
    build(keyed, 725, 786, [(32, 73), (91, 145), (157, 260), (280, 379), (395, 496), (512, 619), (638, 750), (763, 866)], "heavy")
    # up (launcher) = Up Y Attack (rising sand spikes) — 7 full-pose frames
    build(keyed, 614, 684, [(24, 61), (84, 133), (143, 268), (277, 374), (393, 490), (512, 610), (623, 717)], "up")
    # air = Jump Attack (sand whip arcs) — 7 frames (split the merged whip box)
    AIR = [(288, 337)] + even(345, 474, 2) + [(486, 550), (566, 625), (639, 696), (712, 770)]
    build(keyed, 270, 345, AIR, "air")
    build(keyed, 270, 345, AIR, "down_air")   # reuse Jump Attack (no dedicated down-air on sheet)
    # low / crouch attack = Crouch Attack (engine _crouchAttackVariant)
    build(keyed, 373, 455, even(575, 739, 3) + [(755, 801)], "crouchLight")

    # ── PROJECTILE (Sand Throw) cast poses ──
    build(keyed, 824, 884, [(37, 72), (85, 140)], "throw")                       # ground
    build(keyed, 824, 884, [(162, 197)] + even(203, 303, 2), "throwAir")         # jump throw
    build(keyed, 824, 884, [(337, 371), (386, 423), (438, 498), (505, 562), (573, 609)], "throwCrouch")  # crouch throw

    # ── GUARD (Sand Shield): stance pose; sand-wall FX drawn separately ──
    build(keyed, 75, 136, [(19, 54), (73, 106)], "guard")

    # ── PHASE 2 — SAND JUTSU CAST POSE + FX ROWS (Sabaku Taisou Part-1 art, reused at special scale) ──
    # Gaara's sand-jutsu cast pose (arm raised) — first 5 of the 11 Part-1 cast frames.
    build(keyed, 990, 1055, [(47, 84), (99, 128), (141, 170), (183, 214), (226, 260)], "sandcast")
    # Giant sand HANDS rising (Sand Coffin bind) — 5f (split the merged 4th box). degreen: drop enclosed bg pockets.
    build(keyed, 1128, 1295, [(43, 249), (271, 481), (492, 704), (719, 964), (964, 1210)], "fx_hands", feet_align=True, degreen=True)
    # Engulf-to-DOME (Sand Dome guard + Sand Burial close) — 4f.
    build(keyed, 1305, 1495, [(24, 280), (314, 570), (602, 858), (890, 1146)], "fx_dome", feet_align=True, degreen=True)
    # COLLAPSE (Sand Burial damage) — 4f.
    build(keyed, 1500, 1690, [(32, 288), (317, 573), (591, 847), (870, 1126)], "fx_collapse", feet_align=True, degreen=True)

    # ── PHASE 3 — SABAKU TAISOU ULTIMATE (full cast loop + ripples + Part-2 kneel/burst/mounds + kanji cut-in) ──
    # Full Part-1 cast sequence (11f; the cinematic loops the last 3).
    build(keyed, 990, 1055, [(47, 84), (99, 128), (141, 170), (183, 214), (226, 260), (273, 310), (326, 367), (381, 424), (440, 489), (501, 546), (557, 607)], "ult_cast")
    # Sand RIPPLES spreading along the ground (8f).
    build(keyed, 1062, 1116, [(33, 125), (171, 265), (282, 374), (396, 490), (504, 592), (600, 690), (704, 904), (909, 1107)], "fx_ripples", feet_align=True, degreen=True)
    # Part-2 KNEEL (palms to the ground, 7f).
    build(keyed, 1905, 1976, [(49, 134), (146, 184), (202, 243), (263, 305), (326, 369), (390, 430), (454, 494)], "ult_kneel")
    # Part-2 ground BURST / settling (3f — split the wide 2nd box).
    build(keyed, 1980, 2063, [(40, 292), (304, 561), (561, 819)], "fx_burst", feet_align=True, degreen=True)
    # Settling MOUNDS (3f).
    build(keyed, 1720, 1762, [(49, 94), (188, 237), (258, 305)], "fx_mounds", feet_align=True, degreen=True)
    # KANJI CUT-IN (砂瀑大葬 "Sabaku Taisou" — Gaara bust + kanji label, 1 composite frame). NOT feet-aligned.
    build(keyed, 1810, 1975, [(918, 1152)], "cutin", feet_align=False)

    print("\nDONE — uniform strips written to project root.")


if __name__ == "__main__":
    main()
