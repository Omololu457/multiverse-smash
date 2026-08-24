#!/usr/bin/env python3
# Re-slice GOKU (DBZ Extreme Butoden, 3DS) — 4-form sprite build (Base/SSJ/SSG/SSB).
# ONE roster entry, four sheets sharing an animation skeleton. See GOKU_ASSET_MAP.md.
#
# ★ Same teal+green-cell structure as Piccolo/Frieza/Vegito: each frame sits on a solid
#   GREEN cell (#00FF50 = 0,255,80); teal #008080 only in the outer gutter. Segment =
#   NON-(green|teal) connected components; global frame index = top->bottom / left->right
#   ordering from detect_boxes(). Run `python3 tools/reslice_goku.py boxes <form>` to dump
#   the indexed list + an index-aligned montage (goku_<form>_boxes.png) so picks line up.
#
# ★ Goku is NOT green-skinned (unlike Piccolo) so a tight cell-key isn't strictly needed,
#   but we keep |rgb-(0,255,80)|<40 tight anyway (SSG/SSB have saturated hair we must keep).
#
# ★ GLOBAL FACING FIX: this EB rip is drawn facing LEFT; engine draws P1 un-flipped
#   expecting RIGHT. Mirror every cell (FLIP_H) so baked art faces right.
#
# STAGE 1 = movement / state skeleton (base sheet is the reference). Later stages + forms
#   append picks below.
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SHEETS = {
    "base": "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Goku.png",
    "ssj":  "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Goku (Super Saiyan).png",
    "ssg":  "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Goku (Super Saiyan God).png",
    "ssb":  "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Goku (Super Saiyan Blue).png",
}
FLIP_H = True
ALPHA = 16


def load(form):
    a = np.asarray(Image.open(SHEETS[form]).convert("RGB")).astype(int)
    green = (np.abs(a - np.array([0, 255, 80])).sum(2) < 40)
    teal  = (np.abs(a - np.array([0, 128, 128])).sum(2) < 40)
    bg = green | teal
    alpha = np.where(bg, 0, 255).astype("uint8")
    rgba = np.dstack([a.astype("uint8"), alpha])
    return Image.fromarray(rgba, "RGBA"), bg


def detect_boxes(bg):
    """Ordered (y0,x0,y1,x1) per gameplay frame, top->bottom / left->right."""
    lbl, n = ndimage.label(~bg)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    bglabel = int(np.argmax(sizes)) + 1
    boxes = []
    for i in range(1, n + 1):
        if i == bglabel or sizes[i - 1] < 800:
            continue
        ys, xs = np.where(lbl == i)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1 - x0) < 20 or (y1 - y0) < 20:
            continue
        boxes.append((y0, x0, y1, x1))
    boxes.sort(key=lambda b: (b[0] // 40, b[1]))
    return boxes


def content_bbox(im, box):
    y0, x0, y1, x1 = box
    arr = np.asarray(im.crop((x0, y0, x1 + 1, y1 + 1)))
    mask = arr[:, :, 3] > ALPHA
    ys, xs = np.where(mask)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())


def reslice(im, boxes, out, picks, anchor="feet"):
    frames = [content_bbox(im, boxes[p]) for p in picks]
    uW = max(f[2] - f[0] + 1 for f in frames) + 2
    uH = max(f[3] - f[1] + 1 for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = im.crop((cx0, cy0, cx1 + 1, cy1 + 1))
        if FLIP_H:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        y = uH - h - 1 if anchor == "feet" else (uH - h) // 2
        strip.paste(cell, (i * uW + (uW - w) // 2, y), cell)
    strip.save(out)
    print(f"OK {out}: {len(picks)}f cell {uW}x{uH}  picks={picks}")
    return len(frames), uW, uH


def dump_boxes(form):
    im, bg = load(form)
    boxes = detect_boxes(bg)
    print(f"# {form}: {len(boxes)} boxes")
    for i, (y0, x0, y1, x1) in enumerate(boxes):
        print(f"{i:3d}  x{x0:4d} y{y0:4d}  {x1-x0+1:3d}x{y1-y0+1:3d}")
    # index-aligned montage
    PER, CW, CH, LH, PAD = 12, 120, 150, 15, 6
    cw, ch = CW + PAD, CH + LH + PAD
    rows = (len(boxes) + PER - 1) // PER
    img = Image.new("RGB", (PAD + PER * cw, PAD + rows * ch), (70, 70, 70))
    d = ImageDraw.Draw(img)
    for k, (y0, x0, y1, x1) in enumerate(boxes):
        r, c = divmod(k, PER)
        cell = np.asarray(im.crop((x0, y0, x1 + 1, y1 + 1)).convert("RGB")).copy()
        a = np.asarray(im.crop((x0, y0, x1 + 1, y1 + 1)))[:, :, 3]
        cell[a <= ALPHA] = (70, 70, 70)
        ci = Image.fromarray(cell)
        w, h = ci.size
        sc = min(CW / w, CH / h)
        nw, nh = max(1, int(w * sc)), max(1, int(h * sc))
        ci = ci.resize((nw, nh), Image.NEAREST)
        cx, cy = PAD + c * cw, PAD + r * ch + LH
        img.paste(ci, (cx + (CW - nw) // 2, cy + (CH - nh)))
        d.text((cx, cy - LH + 2), f"#{k}", fill=(120, 255, 120))
    img.save(f"goku_{form}_boxes.png")
    print(f"saved goku_{form}_boxes.png {img.size}")


# ── STAGE 1 picks (BASE sheet = shared skeleton reference). Global indices from
#    detect_boxes() / `boxes base`. Verified against goku_base_boxes.png + zoom montages.
#    #0 chibi + #1-5 busts = portraits; #6-9 = palette-tier stances (normal/Kaioken/maroon/
#    #9 lavender flash); #10-24 = normal-palette idle stance loop; movement cluster 231-294.
STAGE1_BASE = {
    # action:  (picks, anchor)  — one uniform PNG per action
    "idle":      ([10, 11, 12, 13], "feet"),          # subtle breathing stance (normal palette)
    "dash":      ([288], "feet"),                      # forward lunge (single lean, Piccolo pattern)
    "jump":      ([227, 228, 229, 230], "feet"),       # airborne leap: rise → arms-spread apex → descend
    "crouch":    ([249, 250], "feet"),                 # low duck
    "guard":     ([245, 246], "feet"),                 # arms-up braced block
    "hurt":      ([236], "feet"),                       # stagger flinch (standing recoil)
    "knockdown": ([268, 269, 270, 271], "feet"),       # flat/prone lying
    "getup":     ([265, 266], "feet"),                 # low → rise
    "portrait":  ([1], "center"),                       # first serious bust (HUD nameplate)
}


# ── STAGE 2 picks (BASE sheet). 5 normals + crouchLight, all black-hair base-form (verified via
#    hair-color sampling + subagent pose review). basic_attacks damage lives on characters.js;
#    effective dmg = declared × GLOBAL_DAMAGE_SCALE (0.60). Shared across forms via recolor.
STAGE2_BASE = {
    "light":       ([66, 67], "feet"),       # quick straight jab
    "heavy":       ([107, 108], "feet"),     # committed lunging straight punch (long reach)
    "upAttack":    ([194, 195], "feet"),     # rising uppercut/kick LAUNCHER (arcs up)
    "airAttack":   ([157, 158], "feet"),     # airborne forward strike (feet off ground)
    "downAir":     ([161, 162], "feet"),     # diagonal-downward diving strike
    "crouchLight": ([80], "feet"),           # low leg SWEEP (trip along the ground)
}


# ── STAGE 3 picks (BASE sheet) — Fwd+Heavy 3-stage rush "Meteor Combination". All black-hair,
#    distinct from the Stage-2 normals. rush3 = roundhouse w/ white crescent-arc VFX (launcher).
STAGE3_BASE = {
    "rush1": ([97, 98], "feet"),      # lunging straight-punch opener (forward drive)
    "rush2": ([100, 101], "feet"),    # flurry hook / mid beat
    "rush3": ([109, 110], "feet"),    # roundhouse w/ crescent-VFX LAUNCHER finisher
}


# ── STAGE 4 picks (BASE sheet) — melee-only kit (Kamehameha CUT, no beam art). Dragon Fist = the
#    lone special (a big rocket straight-punch). The Kamehameha WINDUP is sliced but DORMANT (not wired) —
#    preserved per the cut decision for future use once real beam art exists.
STAGE4_BASE = {
    # dragonFist REUSES the heavy pose (goku_base_heavy_uniform, #107-108) — a full pixel survey found it's
    # the ONLY true grounded forward rocket-punch; candidate distinct frames (#83-84, #103-104) were aerial.
    # So no dedicated dragonFist slice is generated here.
    "kamehamehaWindup": ([170, 171, 172, 173, 174, 175, 176], "feet"),  # DORMANT — cupped-hands charge; NOT wired
}


def build_stage1():
    im, bg = load("base")
    boxes = detect_boxes(bg)
    for action, (picks, anchor) in STAGE1_BASE.items():
        out = f"goku_base_{action}_uniform.png"
        reslice(im, boxes, out, picks, anchor=anchor)


def build_stage2():
    im, bg = load("base")
    boxes = detect_boxes(bg)
    for action, (picks, anchor) in STAGE2_BASE.items():
        out = f"goku_base_{action}_uniform.png"
        reslice(im, boxes, out, picks, anchor=anchor)


# ── STAGE 5 per-form MOVEMENT slices (idle/jump/dash) for the transform sprite-swap (_skinAnim).
#    Each form's own indices (skeleton shared, layout shifted). walk/run reuse idle; fall reuses jump.
#    Attacks/states fall back to base art via the _skinAnim merge (accepted pattern, flagged).
STAGE5 = {
    "ssj": {"idle": [14, 15, 16, 17], "jump": [236, 237, 238, 239], "dash": [261]},   # gold
    "ssg": {"idle": [12, 13, 14, 16], "jump": [198, 199, 200],      "dash": [151]},   # red
    "ssb": {"idle": [8, 9, 10, 11],   "jump": [236, 237, 238, 239], "dash": [205]},   # blue
}


# ── STAGE 7 — win art + portrait bust. Win = cheer-jump + scratch-head-laugh (base #274-277 + #282-285).
STAGE7_BASE = {
    "win": ([274, 275, 276, 277, 282, 283, 284, 285], "feet"),
}


def build_stage7():
    im, bg = load("base")
    boxes = detect_boxes(bg)
    for action, (picks, anchor) in STAGE7_BASE.items():
        reslice(im, boxes, f"goku_base_{action}_uniform.png", picks, anchor=anchor)
    # PORTRAIT — the top-band face busts sit on BLACK (not the green cell). Key black+teal+green, tight-crop
    # bust index 1 (first serious face), scale to ~288px tall for the HUD nameplate.
    a = np.asarray(Image.open(SHEETS["base"]).convert("RGB")).astype(int)
    bust = boxes[1]
    y0, x0, y1, x1 = bust
    crop = a[y0:y1 + 1, x0:x1 + 1]
    black = crop.sum(2) < 60
    green = (np.abs(crop - np.array([0, 255, 80])).sum(2) < 60)
    teal = (np.abs(crop - np.array([0, 128, 128])).sum(2) < 40)
    keep = ~(black | green | teal)
    ys, xs = np.where(keep)
    cy0, cy1, cx0, cx1 = ys.min(), ys.max(), xs.min(), xs.max()
    alpha = np.where(keep, 255, 0).astype("uint8")
    rgba = np.dstack([crop.astype("uint8"), alpha])[cy0:cy1 + 1, cx0:cx1 + 1]
    pim = Image.fromarray(rgba, "RGBA")
    sc = 288 / pim.height
    pim = pim.resize((max(1, int(pim.width * sc)), 288), Image.NEAREST)
    pim.save("goku_portrait.png")
    print(f"OK goku_portrait.png {pim.size}  (base bust #1, black-keyed)")


def build_stage5():
    for form, acts in STAGE5.items():
        im, bg = load(form)
        boxes = detect_boxes(bg)
        for action, picks in acts.items():
            out = f"goku_{form}_{action}_uniform.png"
            reslice(im, boxes, out, picks, anchor="feet")


def build_stage3():
    im, bg = load("base")
    boxes = detect_boxes(bg)
    for action, (picks, anchor) in STAGE3_BASE.items():
        out = f"goku_base_{action}_uniform.png"
        reslice(im, boxes, out, picks, anchor=anchor)


def build_stage4():
    im, bg = load("base")
    boxes = detect_boxes(bg)
    for action, (picks, anchor) in STAGE4_BASE.items():
        out = f"goku_base_{action}_uniform.png"
        reslice(im, boxes, out, picks, anchor=anchor)


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "boxes":
        dump_boxes(sys.argv[2] if len(sys.argv) > 2 else "base")
    elif len(sys.argv) >= 2 and sys.argv[1] == "stage1":
        build_stage1()
    elif len(sys.argv) >= 2 and sys.argv[1] == "stage2":
        build_stage2()
    elif len(sys.argv) >= 2 and sys.argv[1] == "stage3":
        build_stage3()
    elif len(sys.argv) >= 2 and sys.argv[1] == "stage4":
        build_stage4()
    elif len(sys.argv) >= 2 and sys.argv[1] == "stage5":
        build_stage5()
    elif len(sys.argv) >= 2 and sys.argv[1] == "stage7":
        build_stage7()
    else:
        print("usage: reslice_goku.py boxes <base|ssj|ssg|ssb>  |  reslice_goku.py stage1|stage2|stage3|stage4")
