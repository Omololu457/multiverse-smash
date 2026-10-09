"""Kakashi (ANBU) rosterKey `kakashi_anbu` — keying + per-action uniform-strip slicer.

Source K = anbu_kakashi_sprite_sheet_by_dantewreckmen_999_d93ce0i.png (1054x2460, opaque
green (0,128,0) + noise). Mirrors tools/gaara/slice.py:
  1. border-flood-fill key the green (tol=45) so interior art + the white illustration survive.
  2. per ACTION crop native frame boxes, trim to content bbox, FLIP_H (sheet faces LEFT → emit
     facing RIGHT = engine default), re-pack bottom-aligned (feet) + centred into a fixed cell.
  3. degreen=True strips enclosed green pockets the border fill can't reach (Raikiri/FX rows only;
     body sprites hold no green so they are left untouched).

The illustration panel (x649-1051 y58-504, on WHITE inside a 2px black border) is NEVER keyed green —
it is extracted separately as select art / cut-in + a face-bust portrait.

Emits (frames,width,height) per action to paste into characters.js animationData. Pure art tooling.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "anbu_kakashi_sprite_sheet_by_dantewreckmen_999_d93ce0i.png"
PAD = 2
FLIP_H = False   # sheet already faces RIGHT (engine default; verified via native idle) — do NOT mirror


def border_floodfill_alpha(im, bg=(0, 128, 0), tol=45):
    rgb = im[..., :3].astype(np.int32)
    dist = np.abs(rgb - np.array(bg)).sum(2)
    bgish = dist <= tol
    lbl, _ = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    out = im.copy()
    out[np.isin(lbl, list(border)), 3] = 0
    return out


def trim(cell):
    a = cell[..., 3] > 16
    if not a.any():
        return None
    ys, xs = np.where(a)
    return cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def strip_green(cell):
    """Zero alpha of enclosed greenish pixels. Safe for lightning/FX rows (blue/white, never green)."""
    out = cell.copy()
    rgb = out[..., :3].astype(int)
    greenish = (rgb[..., 1] > 100) & (rgb[..., 1] - rgb[..., 0] > 30) & (rgb[..., 1] - rgb[..., 2] > 30)
    out[greenish, 3] = 0
    return out


def build(keyed, y0, y1, boxes, name, feet_align=True, degreen=False):
    frames = []
    for (x0, x1) in boxes:
        sub = keyed[y0:y1, x0:x1]
        if degreen:
            sub = strip_green(sub)
        t = trim(sub)
        if t is not None:
            if FLIP_H:
                t = t[:, ::-1]
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
    Image.fromarray(strip).save(f"kakashi_anbu_{name}_uniform.png")
    print(f"  kakashi_anbu_{name}_uniform.png  frames={len(frames)} w={cw} h={ch}")
    return len(frames), cw, ch


def main():
    im = np.asarray(Image.open(SRC).convert("RGBA")).copy()
    keyed = border_floodfill_alpha(im)

    # ── MOVEMENT / STATE ──
    build(keyed, 70, 133, [(22, 63), (73, 113), (123, 161), (167, 206), (217, 255), (263, 303)], "idle")
    build(keyed, 193, 260, [(21, 53), (64, 88), (97, 124), (132, 163), (174, 196), (209, 233)], "walk")
    build(keyed, 322, 382, [(21, 77), (89, 131), (140, 190), (199, 254), (268, 315), (327, 378)], "run")
    build(keyed, 445, 502, [(20, 57), (70, 101)], "crouch")
    build(keyed, 562, 640, [(22, 56), (69, 114), (141, 172)], "jump")
    # Teleport dissolve (x375-485 y605-672) — Body Flicker FX. dark streak; degreen to drop bg pockets.
    build(keyed, 605, 672, [(375, 428), (432, 486)], "teleport", feet_align=False, degreen=True)
    build(keyed, 715, 765, [(20, 68), (78, 134)], "walljump")   # reserved (no render key; mechanic only)

    # ── DAMAGE row (y836-889): 2 hits | launched | 2 lying | get-up ──
    build(keyed, 836, 889, [(21, 68), (80, 131)], "hurt")                                  # 2 flinch hits
    build(keyed, 836, 889, [(170, 226), (239, 309), (319, 388)], "knockdown")              # launched + 2 lying
    build(keyed, 836, 889, [(398, 432)], "getup")                                          # rise

    # ── NORMALS (Y-combo string groups 4/5/4 + directional Y+ rows) ──
    # light = Y-combo group 1 (opening slashes, 4f)
    build(keyed, 962, 1025, [(21, 65), (74, 122), (133, 184), (193, 238)], "light")
    # heavy = Y-combo group 3 (tanto finisher w/ orange blade arc, 4f) — committed
    build(keyed, 962, 1025, [(639, 691), (701, 747), (758, 812), (821, 866)], "heavy")
    # launcher = Y+Up (5f)
    build(keyed, 1101, 1179, [(28, 65), (75, 111), (126, 174), (185, 233), (247, 286)], "up")
    # dash-attack frames = Y+Run (6f) — reserved for Sharingan Read slash (Phase 3)
    build(keyed, 1241, 1297, [(22, 74), (87, 141), (153, 224), (234, 291), (303, 350), (360, 412)], "dashatk")
    # air = Y+Jump (5f); down_air reuses air
    build(keyed, 1365, 1423, [(22, 57), (67, 100), (109, 146), (155, 206), (217, 266)], "air")
    # low / crouch attack = Y+Crouch (5f)
    build(keyed, 1484, 1530, [(21, 52), (62, 93), (102, 159), (169, 215), (223, 254)], "crouchlight")

    # ── INTRO = Raikiri teleport-in + arrival + stance (first 3 of the charge row; degreen FX) ──
    build(keyed, 2082, 2156, [(39, 85), (106, 152), (165, 202)], "intro", feet_align=True, degreen=True)

    # ── ILLUSTRATION (exclude 2px black border) → select art / cut-in + face-bust portrait ──
    illus = keyed[58:505, 649:1052]
    Image.fromarray(illus).convert("RGB").save("kakashi_anbu_illus.png")
    print(f"  kakashi_anbu_illus.png  {illus.shape[1]}x{illus.shape[0]} (select art / cut-in, white panel)")
    # Portrait: face/upper-torso bust from the illustration head (top-centre of the figure).
    head = illus[0:230, 95:330]
    Image.fromarray(head).convert("RGB").save("kakashi_anbu_portrait.png")
    print(f"  kakashi_anbu_portrait.png  {head.shape[1]}x{head.shape[0]} (face bust)")

    print("\nDONE — uniform strips + illus + portrait written to project root.")


if __name__ == "__main__":
    main()
