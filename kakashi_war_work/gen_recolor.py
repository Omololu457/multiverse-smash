#!/usr/bin/env python3
# Recolor the kakashi_war sprite set into the 3 alternate palettes (Red / Blue / Dark) that the source sheet
# ships as PIXEL-ALIGNED swatches (default=Green is the base, no recolor). The sheet draws the SAME idle pose
# in 4 palettes (Kakashi x4 @ y732-794; Frog x4 @ y750-795), IoU=1.000 aligned, so an EXACT per-pixel colour
# LUT (default_rgb → target_rgb) transfers the palette perfectly. Body strips use the KAKASHI LUT; the two frog
# strips use the FROG LUT. Output: kakashi_war_<action>_uniform__<tag>.png (+ portrait). FX sheets are NOT
# recoloured (not in animationData / palette-neutral).
import numpy as np
from PIL import Image
from scipy import ndimage
from collections import Counter

SRC = "kakashi_nzc_sprites_original_colors__by_felipedanielskibr_d837fqp.png"
BG = np.array([0, 64, 128]); TOL = 40; ALPHA = 16

def keyed():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)
    dist = np.abs(a - BG).sum(2); bgish = dist <= TOL
    lbl, n = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1]); border.discard(0)
    remove = np.isin(lbl, list(border))
    alpha = np.where(remove, 0, 255).astype("uint8")
    return np.dstack([a.astype("uint8"), alpha])

IM = keyed()

def build_lut(base_box, tgt_box):
    """base_box, tgt_box = (x0,y0,x1,y1), PIXEL-ALIGNED same pose. Returns {(r,g,b): (r,g,b)} default→target."""
    bx0, by0, bx1, by1 = base_box; tx0, ty0, tx1, ty1 = tgt_box
    base = IM[by0:by1 + 1, bx0:bx1 + 1]; tgt = IM[ty0:ty1 + 1, tx0:tx1 + 1]
    h = min(base.shape[0], tgt.shape[0]); w = min(base.shape[1], tgt.shape[1])
    votes = {}
    for yy in range(h):
        for xx in range(w):
            if base[yy, xx, 3] <= ALPHA or tgt[yy, xx, 3] <= ALPHA:
                continue
            bk = tuple(int(v) for v in base[yy, xx, :3]); tv = tuple(int(v) for v in tgt[yy, xx, :3])
            votes.setdefault(bk, Counter())[tv] += 1
    return {k: c.most_common(1)[0][0] for k, c in votes.items()}

def apply_lut(src_png, lut, out_png):
    im = np.asarray(Image.open(src_png).convert("RGBA")).copy()
    rgb = im[..., :3]; a = im[..., 3]
    out = im.copy()
    # exact-match remap on all opaque pixels
    changed = 0
    flat = rgb.reshape(-1, 3); af = a.reshape(-1); of = out[..., :3].reshape(-1, 3)
    for i in range(flat.shape[0]):
        if af[i] <= ALPHA:
            continue
        k = (int(flat[i, 0]), int(flat[i, 1]), int(flat[i, 2]))
        t = lut.get(k)
        if t is not None and t != k:
            of[i] = t; changed += 1
    Image.fromarray(out).save(out_png)
    return changed

# ── swatch boxes ──
KAK = [(31, 732, 89, 794), (104, 732, 162, 794), (176, 732, 234, 794), (249, 732, 307, 794)]   # green,red,blue,dark
FRG = [(394, 750, 426, 795), (433, 750, 465, 795), (472, 750, 504, 795), (511, 750, 543, 795)]  # green,red,blue,dark
TAGS = ["red", "blue", "dark"]   # index 1,2,3 of the swatch rows (0 = default/green = no recolor)

KAK_SHEETS = [
    "idle", "run", "dash", "jump", "guard", "hurt", "knockdown", "getup", "light", "heavy", "heavyair",
    "heavyfwd", "heavydown", "intro", "win", "taunt", "raikiri_charge", "raikiri_strike",
    "raikiri_air_charge", "raikiri_air_strike", "mangekyou_cast", "tsuiga_cast", "sennen",
]
FRG_SHEETS = ["frog", "frog_damage"]

def main():
    for ti, tag in enumerate(TAGS):
        kl = build_lut(KAK[0], KAK[ti + 1]); fl = build_lut(FRG[0], FRG[ti + 1])
        print(f"[{tag}] kakashi LUT {len(kl)} colours / frog LUT {len(fl)} colours")
        for s in KAK_SHEETS:
            n = apply_lut(f"kakashi_war_{s}_uniform.png", kl, f"kakashi_war_{s}_uniform__{tag}.png")
        apply_lut("kakashi_war_portrait.png", kl, f"kakashi_war_portrait__{tag}.png")
        for s in FRG_SHEETS:
            apply_lut(f"kakashi_war_{s}_uniform.png", fl, f"kakashi_war_{s}_uniform__{tag}.png")
        print(f"[{tag}] wrote {len(KAK_SHEETS)+1} kakashi + {len(FRG_SHEETS)} frog recolors")

if __name__ == "__main__":
    main()
