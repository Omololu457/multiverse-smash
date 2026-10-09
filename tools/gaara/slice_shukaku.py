"""Shukaku (Gaara's One-Tail ally summon) — keying + per-action uniform-strip slicer.

Source S = shukaku_boss_sprite_sheet_altair_by_altairframemaker_de211mq.png (1720x5776, RGBA),
opaque NAVY background (0,64,128) + noise. Strategy mirrors the project's border-flood-fill pipeline
(Phase 1-3): border-flood-fill the navy (interior pockets that share the hue are preserved), THEN a
per-slice NAVY-STRIP (exact-navy, tol 50) kills the enclosed navy pockets (armpit triangles, example-box
fills) WITHOUT touching Shukaku's blue markings (84,85,139 — dist 116 from navy) or the dark Bijuudama
sphere (dist 185+). Credited to Altair (credits.js).

Emits (frames,width,height) per action for the game-side Shukaku renderer. Pure art tooling.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "shukaku_boss_sprite_sheet_altair_by_altairframemaker_de211mq.png"
NAVY = (0, 64, 128)
PAD = 3


def border_floodfill_alpha(im, bg=NAVY, tol=40):
    rgb = im[..., :3].astype(np.int32)
    dist = np.abs(rgb - np.array(bg)).sum(2)
    lbl, _ = ndimage.label(dist <= tol)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1]); border.discard(0)
    out = im.copy(); out[np.isin(lbl, list(border)), 3] = 0
    return out


def strip_navy(cell, tol=50):
    """Zero the alpha of any near-navy pixel (kills enclosed bg pockets). Blue markings + dark sphere
    are far enough from navy (dist 116 / 185+) to survive at tol 50."""
    out = cell.copy()
    rgb = out[..., :3].astype(np.int32)
    navyish = np.abs(rgb - np.array(NAVY)).sum(2) <= tol
    out[navyish, 3] = 0
    return out


def trim(cell):
    a = cell[..., 3] > 16
    if not a.any():
        return None
    ys, xs = np.where(a)
    return cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def build(keyed, y0, y1, boxes, name, feet=True, denavy=True):
    frames = []
    for (x0, x1) in boxes:
        sub = keyed[y0:y1, x0:x1]
        if denavy:
            sub = strip_navy(sub)
        t = trim(sub)
        if t is not None:
            frames.append(t)
    if not frames:
        print(f"  !! {name}: empty"); return
    cw = max(f.shape[1] for f in frames) + PAD * 2
    ch = max(f.shape[0] for f in frames) + PAD * 2
    strip = np.zeros((ch, cw * len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        fh, fw = f.shape[:2]
        ox = i * cw + (cw - fw) // 2
        oy = (ch - fh - PAD) if feet else (ch - fh) // 2
        strip[oy:oy + fh, ox:ox + fw] = f
    Image.fromarray(strip).save(f"gaara_{name}_uniform.png")
    print(f"  gaara_{name}_uniform.png  frames={len(frames)} w={cw} h={ch}")


def even(x0, x1, n):
    s = (x1 - x0) / n
    return [(int(round(x0 + i * s)), int(round(x0 + (i + 1) * s))) for i in range(n)]


def main():
    im = np.asarray(Image.open(SRC).convert("RGBA")).copy()
    keyed = border_floodfill_alpha(im)
    Image.fromarray(keyed).save("tools/gaara/S_keyed.png")

    # ── BODY / STATE ──
    build(keyed, 50, 560, [(0, 518)], "shukaku_idle")                              # standing body (channel pose)
    build(keyed, 780, 1185, [(28, 492), (506, 970)], "shukaku_walk")               # 2f slow follow
    build(keyed, 60, 555, [(1128, 1705)], "shukaku_tail", feet=False)              # tail layer (always behind)
    build(keyed, 780, 1185, [(1090, 1386)], "shukaku_emerge")                      # jutsu-activation seal (summon rise)

    # ── ATTACKS / FX ──
    # Giant arm swipe (F+L) — top-row 3-frame motion (arms-crossed → wind → extend). The source is a 2-row
    # grid; the top row carries the readable swing. (Sand shuriken + sand-volley balls + bijuudama particles
    # are code-drawn procedurally — their sheet frames are tiny + boxed with "x4"/"example" instruction art.)
    build(keyed, 1270, 1715, [(30, 430), (470, 800), (830, 1240)], "shukaku_swipe")
    build(keyed, 2928, 3345, even(13, 1716, 4), "shukaku_mouthcast")               # mouth opening cast (ranged-attack pose)
    build(keyed, 3880, 4075, [(240, 467), (491, 746), (763, 1018)], "shukaku_pyramid")  # pyramid erupt (D+L), 3f
    build(keyed, 4290, 4475, [(441, 594)], "shukaku_sphere", feet=False, denavy=False)  # the dark Bijuudama sphere (keep its darks)

    # ── LOSE sequence (summon end) ──
    build(keyed, 4660, 5140, even(18, 1125, 3), "shukaku_lose")                     # 3f (normal / seal-glow / darkened)
    build(keyed, 5220, 5645, even(22, 1720, 5), "shukaku_burst", feet=False)        # white burst shrinking, 5f

    print("\nDONE — Shukaku strips written to project root.")


if __name__ == "__main__":
    main()
