#!/usr/bin/env python3
# Re-slice SUPERMAN 2 (DC Universe Customs sheet) into CLEAN, feet-aligned
# uniform cells (one superman_dcuc_*_uniform.png per action).
#
# Sheet: "Custom _ Edited - DC Universe Customs - Superman - Superman.png"
#   Free-floating sprites on MS-Paint green #22B14C (34,177,76). NO moated
#   cells → each non-green connected component = one sprite. Global frame
#   index == the top->bottom / left->right ordering printed by
#   tools/superman_dcuc_stage0_boxes.py (picks line up with the ASSET_MAP).
#
# Facing: art already faces RIGHT (cape trails left) == engine's un-flipped
#   P1 orientation → FLIP_H = False.
#
# STAGE 1 = movement / state + portrait. Later stages append picks below.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "Custom _ Edited - DC Universe Customs - Superman - Superman.png"
KEY = np.array([34, 177, 76])
TOL = 60

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    green = (np.abs(a - KEY).sum(2) < TOL)
    alpha = np.where(green, 0, 255).astype("uint8")
    rgba = np.dstack([a.astype("uint8"), alpha])
    return Image.fromarray(rgba, "RGBA"), green

def detect_boxes(green):
    """SAME detection/order as superman_dcuc_stage0_boxes.py so picks match the map."""
    lbl, n = ndimage.label(~green)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    boxes = []
    for i in range(1, n + 1):
        if sizes[i - 1] < 250:
            continue
        ys, xs = np.where(lbl == i)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1 - x0) < 12 or (y1 - y0) < 12:
            continue
        boxes.append((y0, x0, y1, x1))
    boxes.sort(key=lambda b: (b[0] // 45, b[1]))
    return boxes

ALPHA = 16
def content_bbox(im, box):
    y0, x0, y1, x1 = box
    cell = im.crop((x0, y0, x1 + 1, y1 + 1))
    arr = np.asarray(cell)
    mask = arr[:, :, 3] > ALPHA
    ys, xs = np.where(mask)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())

FLIP_H = False
def reslice(im, boxes, out, picks):
    frames = [content_bbox(im, boxes[p]) for p in picks]
    uW = max(f[2] - f[0] + 1 for f in frames) + 2
    uH = max(f[3] - f[1] + 1 for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = im.crop((cx0, cy0, cx1 + 1, cy1 + 1))
        if FLIP_H:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        strip.paste(cell, (i * uW + (uW - w) // 2, uH - h - 1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)}f cell {uW}x{uH}  "
          f"-> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")

def make_portrait(out, target_h=288):
    """Superman bust painted on the right of the credit banner (box 0). It sits on
    the green field to its right; crop the painted bust region and scale up."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    reg = a[24:165, 398:528]           # right portion of the banner = the bust
    Image.open(SRC).convert("RGBA").crop((398, 24, 528, 165)).resize(
        (round(130 * target_h / 141), target_h), Image.NEAREST).save(out)
    print(f"OK {out}: bust portrait")

if __name__ == "__main__":
    im, green = load()
    boxes = detect_boxes(green)
    print(f"detected {len(boxes)} frames\n")

    # ── STAGE 1 — MOVEMENT / STATE (feet-aligned; anchorY 0 plants feet). ──
    # ★RE-AUDIT FIX (2026-08-22): idle/walk were SWAPPED, and hurt/knockdown pointed at STANDING poses from the
    #   mixed "Damage" band. Corrected below against the real motion:
    #   IDLE = the 7-frame CAPE-SWAY loop [1-7] (feet STATIC, only cape sways — a genuine neutral idle; was
    #          mis-wired to walk, and the old idle #114 was a low forward-lunge — WRONG, removed).
    #   WALK = the forward-lean SPRINT [11-18] (alternating legs, jabbing fist — the only real locomotion; run/
    #          dash REUSE it, so the redundant separate run sheet is pruned).
    reslice(im, boxes, "superman_dcuc_idle_uniform.png", [1, 2, 3, 4, 5, 6, 7])       # ★7f cape-sway neutral idle (feet static)
    reslice(im, boxes, "superman_dcuc_walk_uniform.png", [11, 12, 13, 14, 15, 16, 17, 18])  # ★8f forward-lean sprint (run/dash reuse)
    reslice(im, boxes, "superman_dcuc_jump_uniform.png", [38, 39])                    # rising
    reslice(im, boxes, "superman_dcuc_fall_uniform.png", [40])                        # descent
    reslice(im, boxes, "superman_dcuc_crouch_uniform.png", [45])                      # low duck (cape wrap)
    reslice(im, boxes, "superman_dcuc_hurt_uniform.png", [88, 90])                    # ★REAL hit-react: recoil → doubled-over (was standing poses 87/89)
    reslice(im, boxes, "superman_dcuc_knockdown_uniform.png", [91, 97])               # ★REAL KO: blown-back airborne → lying PRONE (was standing poses 94/96)
    reslice(im, boxes, "superman_dcuc_getup_uniform.png", [92, 93])                   # ★REAL getup: rising → recover (was idle-reuse)
    reslice(im, boxes, "superman_dcuc_fly_uniform.png", [54, 55, 56, 57])             # flight loop (canFly)
    make_portrait("superman_dcuc_portrait.png")

    # ── STAGE 2 — NORMALS (from the "Attack's" + "Crouch Attack's" rows; ×0.60 GLOBAL_DAMAGE_SCALE). ──
    # down_air REUSES air (project pattern). Cape-only flutter frames (107/113/140) excluded.
    reslice(im, boxes, "superman_dcuc_light_uniform.png",  [99, 100])    # jab — coil → straight punch
    reslice(im, boxes, "superman_dcuc_heavy_uniform.png",  [109, 110])   # big LUNGING straight (cape stream) — heavy
    reslice(im, boxes, "superman_dcuc_up_uniform.png",     [38, 39])     # rising flight fist-overhead — LAUNCHER (ascent pose; no clean uppercut on sheet — FLAG)
    reslice(im, boxes, "superman_dcuc_air_uniform.png",    [136, 137])   # horizontal FLYING punch (down_air reuses)
    reslice(im, boxes, "superman_dcuc_crouchlight_uniform.png", [169, 170])  # crouch low punch (auto-swap _setCrouchVariant)

    # ── STAGE 3 — command chain (Fwd+Heavy 3-stage rekka: dash-punch opener → cross-punch → crescent-kick launcher). ──
    reslice(im, boxes, "superman_dcuc_rush1_uniform.png", [127, 128])   # dashing forward punch (cape stream) — opener/gap-closer
    reslice(im, boxes, "superman_dcuc_rush2_uniform.png", [103, 104])   # rapid cross-punch string — mid
    reslice(im, boxes, "superman_dcuc_rush3_uniform.png", [165, 166])   # flying crescent-kick LAUNCHER (yellow swoosh FX) — finisher

    # ── STAGE 4 — SPECIALS (fixed-slot flying-brawler kit). Heat Vision + Super Breath are PROCEDURAL (no beam/breath
    #    art on sheet — cast poses REUSE heavy/idle, flagged). Flying Charge/Dive render their OWN dash/dive sprites;
    #    Soaring Uppercut reuses the up-launcher ascent sheet. See SUPERMAN2_DCUC_ASSET_MAP.md §Specials.
    reslice(im, boxes, "superman_dcuc_flycharge_uniform.png", [128, 129, 130])  # Flying Charge — cape-stream dash tackle (i-frame gap-closer)
    reslice(im, boxes, "superman_dcuc_dive_uniform.png",      [138, 139])       # Flying Dive Kick — diagonal air dive (i-frame approach)

    # ── STAGE 5 — ULTIMATE "Big Rock" (the sheet's own "Super 1 - Big Rock" set). REAL art: lift→throw cast +
    #    boulder projectile + rubble shatter. Guaranteed direct-damage cinematic; boulder/debris = visual FX.
    reslice(im, boxes, "superman_dcuc_bigrock_uniform.png", [185, 187, 188, 190])  # lift ground → hoist overhead → hurl (swoosh)
    reslice(im, boxes, "superman_dcuc_boulder_uniform.png", [196])                 # intact giant boulder (thrown projectile art)
    reslice(im, boxes, "superman_dcuc_debris_uniform.png",  [200])                 # shattered rubble pile (impact burst art)

    # ── STAGE 6 — win pose (arms-raised celebration). lose = REUSE knockdown (no dedicated lose art). ──
    reslice(im, boxes, "superman_dcuc_win_uniform.png", [79, 80, 81])   # victory — both arms raised, cape spread
