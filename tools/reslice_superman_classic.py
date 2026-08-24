#!/usr/bin/env python3
# Re-slice SUPERMAN 4 (SNES Justice League Task Force) into CLEAN, feet-aligned
# uniform cells (one superman_classic_*_uniform.png per action).
#
# Sheet: "SNES - Justice League Task Force - Fighters - Superman.png"
#   RGBA with a FULLY TRANSPARENT background → box = alpha-mask connected
#   component (NO chroma-key). Classic 16-bit costume (blue suit + red trunks/
#   boots/cape). Global frame index == top->bottom / left->right ordering from
#   tools/superman_classic_stage0_boxes.py (picks line up with the ASSET_MAP).
#
# Facing RIGHT (cape trails left) → FLIP_H = False.
#
# STAGE 1 = movement / state + portrait. Later stages append picks below.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "SNES - Justice League Task Force - Fighters - Superman.png"
IM = Image.open(SRC).convert("RGBA")
RGBA = np.asarray(IM)
H, W, _ = RGBA.shape

def detect_boxes():
    content = RGBA[:, :, 3] > 128
    lbl, n = ndimage.label(content)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    boxes = []
    for i in range(1, n + 1):
        if sizes[i - 1] < 200:
            continue
        ys, xs = np.where(lbl == i)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1 - x0) < 12 or (y1 - y0) < 14:
            continue
        boxes.append((y0, x0, y1, x1))
    boxes.sort(key=lambda b: (b[0] // 40, b[1]))
    return boxes

def tight(cell):
    arr = np.asarray(cell); m = arr[:, :, 3] > 16
    ys, xs = np.where(m)
    return cell.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

FLIP_H = False
def reslice(boxes, out, picks):
    cells = []
    for p in picks:
        y0, x0, y1, x1 = boxes[p]
        cells.append(tight(IM.crop((x0, y0, x1 + 1, y1 + 1))))
    uW = max(c.width for c in cells) + 2
    uH = max(c.height for c in cells) + 2
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        if FLIP_H:
            c = c.transpose(Image.FLIP_LEFT_RIGHT)
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - 1), c)
    strip.save(out)
    print(f"OK {out}: {len(cells)}f cell {uW}x{uH}  "
          f"-> {{ frames: {len(cells)}, width: {uW}, height: {uH}, anchorY: 0 }}")

def make_portrait(boxes, out, box_idx=1, target_h=288):
    cell = tight(IM.crop((boxes[box_idx][1], boxes[box_idx][0], boxes[box_idx][3] + 1, boxes[box_idx][2] + 1)))
    bust = tight(cell.crop((0, 0, cell.width, int(cell.height * 0.60))))
    scale = target_h / bust.height
    bust.resize((max(1, round(bust.width * scale)), target_h), Image.NEAREST).save(out)
    print(f"OK {out}: bust portrait (box {box_idx})")

if __name__ == "__main__":
    boxes = detect_boxes()
    print(f"detected {len(boxes)} frames\n")

    # ── STAGE 1 — MOVEMENT / STATE (feet-aligned; anchorY 0 plants feet). ──
    reslice(boxes, "superman_classic_idle_uniform.png", [0, 1, 2])                 # REAL 3f breathing/ready idle loop (feet planted)
    # ★RE-AUDIT ROUND 3 FIX (2026-08-23): the 7-14 "row" is a run-up→takeoff→flight SEQUENCE — there is NO
    #   clean grounded alternating-leg walk cycle on this sheet. The prior [7,8,10,14] pick was STILL flight-
    #   contaminated (#10 is a horizontal flying pose, #8 is airborne). Justice League Task Force (SNES) treats
    #   Superman's ground movement as a hover/float, so WALK now REUSES the idle stance [0,1,2] as an intentional
    #   hover-glide (documented, not a shrug). Prior-round fixes retained: knockdown [93,94] (knocked→lying prone),
    #   getup real [95] (was idle-reuse).
    reslice(boxes, "superman_classic_walk_uniform.png", [0, 1, 2])                 # ★REUSE idle = intentional hover-glide (no clean grounded walk exists; JLTF Superman floats)
    reslice(boxes, "superman_classic_jump_uniform.png", [9])                       # leap / rise (FLAG reuse for fall)
    reslice(boxes, "superman_classic_crouch_uniform.png", [6])                     # duck
    reslice(boxes, "superman_classic_hurt_uniform.png", [50])                      # doubled-over recoil (real hunch)
    reslice(boxes, "superman_classic_knockdown_uniform.png", [93, 94])             # ★REAL KO: knocked to ground → lying PRONE (was standing/crouch)
    reslice(boxes, "superman_classic_getup_uniform.png", [95])                     # ★REAL getup: rising from the ground (was idle-reuse)
    # ★RE-AUDIT ROUND 3 FIX (2026-08-23): fly [56,57,58] were UPRIGHT STANDING power-poses (feet planted, shadow
    #   under — flex / fist-raised heroic stances), NOT horizontal flight — they read as "standing in mid-air" when
    #   the canFly state renders. Re-wired to the REAL horizontal forward-flight frames [10,11,18] (body parallel to
    #   ground, cape trailing, flying right). fly/flyMove/forcedDescent all share this sheet.
    reslice(boxes, "superman_classic_fly_uniform.png", [10, 11, 18])               # ★REAL horizontal flight (was standing power-poses 56-58)
    make_portrait(boxes, "superman_classic_portrait.png")

    # ── STAGE 2 — NORMALS (from the rich attack rows; ×0.60 GLOBAL_DAMAGE_SCALE). down_air REUSES air. ──
    reslice(boxes, "superman_classic_light_uniform.png",  [15, 16])   # jab → cross
    reslice(boxes, "superman_classic_heavy_uniform.png",  [25, 26])   # punch → big lunge — heavy
    reslice(boxes, "superman_classic_up_uniform.png",     [40, 19])   # coil → rising UPPERCUT w/ energy flare (REAL) — LAUNCHER
    reslice(boxes, "superman_classic_air_uniform.png",    [18, 41])   # flying kick (down_air reuses)
    reslice(boxes, "superman_classic_crouchlight_uniform.png", [45, 47])  # crouch punch → low kick (auto-swap _setCrouchVariant)

    # ── STAGE 3 — command chain (Fwd+Heavy 3-stage rekka: jab→lunge → flare-punch flurry → flying flare-kick launcher). ──
    reslice(boxes, "superman_classic_rush1_uniform.png", [23, 17])   # jab → big lunge — opener
    reslice(boxes, "superman_classic_rush2_uniform.png", [75, 76])   # flare-punch flurry — mid
    reslice(boxes, "superman_classic_rush3_uniform.png", [77, 78])   # huge flare punch → flying flare-kick LAUNCHER — finisher

    # ── STAGE 4 — SPECIALS (fixed-slot all-rounder kit). ★REAL FX ART (no procedural): Heat Vision (baked
    #    red eye-beam) is a long-reach DISJOINT melee; Ice Breath is a real frost-cloud PROJECTILE. ──
    reslice(boxes, "superman_classic_heatvision_uniform.png", [79, 80])   # Heat Vision — leaning fire + baked red eye-beam (long disjoint)
    reslice(boxes, "superman_classic_icebreath_uniform.png",  [70, 71, 72])  # Ice Breath — frost cloud (projectile sprite, freeze/slow)
    reslice(boxes, "superman_classic_flycharge_uniform.png",  [20, 22])   # Flying Charge — flight dash tackle (i-frame gap-closer)
    reslice(boxes, "superman_classic_dive_uniform.png",       [29, 44])   # Flying Dive Kick — diagonal air dive (i-frame approach)

    # ── STAGE 5 — ULTIMATE "Heat Vision Barrage": sustained screen-raking eye-beam sweep (promotes the beam art). ──
    reslice(boxes, "superman_classic_ult_uniform.png", [66, 79, 80])   # wind → sustained beam sweep (baked red beam)

    # ── STAGE 6 — win pose (iconic heroic stance). lose = REUSE knockdown (REAL prone). ──
    reslice(boxes, "superman_classic_win_uniform.png", [105])   # victory — iconic hands-on-hips / chest-out heroic stance
