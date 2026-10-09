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


def build(keyed, y0, y1, boxes, name, feet_align=True):
    """boxes = list of (x0,x1). Returns (strip Image, frames, cw, ch)."""
    frames = []
    for (x0, x1) in boxes:
        sub = keyed[y0:y1, x0:x1]
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

    print("\nDONE — uniform strips written to project root.")


if __name__ == "__main__":
    main()
