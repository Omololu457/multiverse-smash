#!/usr/bin/env python3
# Re-slice SUPERMAN 3 (New 52 sheet, immajadenyuki) into CLEAN, feet-aligned
# uniform cells (one superman_new52_*_uniform.png per action).
#
# Sheet: "new_52_superman_sprite_by_immajadenyuki_d6mzx0p-fullview.jpeg"
#   RGB JPEG (NO alpha) on a WHITE field. ★KEY = EDGE FLOOD-FILL: only white
#   CONNECTED TO THE CELL BORDER becomes transparent, so INTERIOR white (eyes,
#   the "S", highlights) is PRESERVED — a plain white key would punch holes.
#   The flood-fill uses a loose "whitish" threshold (min>210) so it also eats
#   the JPEG anti-alias fringe/halo (which is always exterior), while enclosed
#   interior pockets (unreached by the edge fill) stay opaque.
#
# Global frame index == the top->bottom / left->right ordering printed by
# tools/superman_new52_stage0_boxes.py (picks line up with the ASSET_MAP).
# Facing RIGHT (cape trails left) → FLIP_H = False.
#
# STAGE 1 = movement / state + portrait. Later stages append picks below.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "new_52_superman_sprite_by_immajadenyuki_d6mzx0p-fullview.jpeg"
RGB = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W, _ = RGB.shape

def detect_boxes():
    white = (RGB.min(2) > 232)
    lbl, n = ndimage.label(~white)
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

def keyed_cell(box):
    """RGBA crop of one box with EXTERIOR (border-connected) whitish → transparent."""
    y0, x0, y1, x1 = box
    sub = RGB[y0:y1 + 1, x0:x1 + 1]
    whitish = sub.min(2) > 210
    l2, _ = ndimage.label(whitish)
    border = set(l2[0, :]) | set(l2[-1, :]) | set(l2[:, 0]) | set(l2[:, -1])
    border.discard(0)
    ext = np.isin(l2, list(border)) if border else np.zeros_like(whitish)
    alpha = np.where(ext, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([sub.astype("uint8"), alpha]), "RGBA")

def tight(cell):
    arr = np.asarray(cell); m = arr[:, :, 3] > 16
    ys, xs = np.where(m)
    return cell.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

FLIP_H = False
def reslice(boxes, out, picks):
    cells = [tight(keyed_cell(boxes[p])) for p in picks]
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

def make_portrait(boxes, out, box_idx=16, target_h=288):
    """Bust = the head+torso of a clean standing frame (no portrait band on this sheet)."""
    cell = tight(keyed_cell(boxes[box_idx]))
    bust = cell.crop((0, 0, cell.width, int(cell.height * 0.58)))
    bust = tight(bust)
    scale = target_h / bust.height
    bust.resize((max(1, round(bust.width * scale)), target_h), Image.NEAREST).save(out)
    print(f"OK {out}: bust portrait (box {box_idx})")

if __name__ == "__main__":
    boxes = detect_boxes()
    print(f"detected {len(boxes)} frames\n")

    # ── STAGE 1 — MOVEMENT / STATE (feet-aligned; anchorY 0 plants feet). ──
    # ★RE-AUDIT FIX (2026-08-22): boxes 0-13 are a CAPE-SWAY IDLE (feet planted STATIC, only cape sways — verified
    #   at max zoom), NOT a walk — they were mis-wired to walk[0-6]/run[7-13], and a standalone pose #16 was
    #   mis-wired as idle. Corrected: idle = the cape-sway loop [0-6]; WALK = a GENUINE GAP (this flight-heavy
    #   sheet has NO alternating-leg locomotion) → walk/run/dash BORROW idle in characters.js (Frieza/Piccolo
    #   precedent). Old walk/run sheets pruned. Hurt #20 was too-upright (a stance) → real doubled-over #21.
    reslice(boxes, "superman_new52_idle_uniform.png", [0, 1, 2, 3, 4, 5, 6])  # ★7f cape-sway neutral idle (feet static)
    reslice(boxes, "superman_new52_jump_uniform.png", [34])                  # rising (flight ascent) — FLAG reuse for fall
    reslice(boxes, "superman_new52_crouch_uniform.png", [18])                # duck
    reslice(boxes, "superman_new52_hurt_uniform.png", [21])                  # ★REAL hit-react: doubled-over (was too-upright #20)
    reslice(boxes, "superman_new52_knockdown_uniform.png", [247, 248])       # REAL prone / lying KO
    reslice(boxes, "superman_new52_fly_uniform.png", [46, 47, 48, 49])       # flight loop (canFly)
    make_portrait(boxes, "superman_new52_portrait.png")

    # ── STAGE 2 — NORMALS (from the rich attack rows; ×0.60 GLOBAL_DAMAGE_SCALE). down_air REUSES air. ──
    reslice(boxes, "superman_new52_light_uniform.png",  [99, 100])   # jab — ready → straight punch
    reslice(boxes, "superman_new52_heavy_uniform.png",  [108, 109])  # big lunging straight punch — heavy
    reslice(boxes, "superman_new52_up_uniform.png",     [99, 118])   # rising uppercut (arm swing-up + arc) — LAUNCHER
    reslice(boxes, "superman_new52_air_uniform.png",    [25, 27])    # horizontal flying punch (down_air reuses)
    reslice(boxes, "superman_new52_crouchlight_uniform.png", [107, 114])  # crouch low punch (auto-swap _setCrouchVariant)

    # ── STAGE 3 — command chain (Fwd+Heavy 3-stage rekka: punch → cross → SPINNING TORNADO launcher). ──
    reslice(boxes, "superman_new52_rush1_uniform.png", [100, 101])   # jab → big straight punch — opener
    reslice(boxes, "superman_new52_rush2_uniform.png", [119, 109])   # punch → big lunge — mid
    reslice(boxes, "superman_new52_rush3_uniform.png", [171, 172])   # spinning tornado LAUNCHER (unique spin FX) — finisher

    # ── STAGE 4 — SPECIALS (fixed-slot flying-rushdown kit). Heat Vision + Super Breath PROCEDURAL (cast=idle,
    #    flagged). Flying Charge/Dive render OWN flight art; Soaring Uppercut reuses the up-launcher sheet. ──
    reslice(boxes, "superman_new52_flycharge_uniform.png", [146, 147, 148])  # Flying Charge — forward flight tackle (i-frame gap-closer)
    reslice(boxes, "superman_new52_dive_uniform.png",      [203, 204])       # Flying Dive Kick — diagonal down dive (i-frame approach)

    # ── STAGE 5 — ULTIMATE "Infinite Mass Punch": hover → rocket forward → flying haymaker IMPACT. ──
    reslice(boxes, "superman_new52_ult_uniform.png", [102, 146, 148, 101])   # hover → fly forward → fist-first → big impact punch

    # ── STAGE 6 — win pose (repurposed heroic stance — no dedicated win art). lose = REUSE knockdown (REAL prone). ──
    reslice(boxes, "superman_new52_win_uniform.png", [219])   # victory — planted heroic chest-out stance (FLAG: repurposed, no win art)
