#!/usr/bin/env python3
# Re-slice Frieza (base/final form; DBZ Extreme Butoden) from the master sheet
#   "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Frieza.png"  (2132x7556 RGBA)
# into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#
# ★ This sheet is NOT gridded by row-dividers (that's Genos). Each frame sits on its own
#   solid GREEN-FILLED cell (#00FF50), with teal #008080 only in the outer gutter. So the
#   segmenter keys BOTH green+teal transparent and takes each sprite as a NON-GREEN
#   connected component. Global frame index = the SAME top->bottom, left->right ordering
#   printed by tools/frieza_stage0_boxes.py, so pick indices line up with the Stage-0
#   contact sheets / FRIEZA_ASSET_MAP.md.
#
# ★ Do NOT dilate to reconnect tails: 3px dilation merges neighbouring frames
#   (159 comps -> 24) because adjacent frames are <6px apart. Raw labelling only.
#
# STAGE 1 = movement / state + anime-face portrait. Later stages append picks below.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Frieza.png"

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    green = (a[:,:,1] > 200) & (a[:,:,0] < 90) & (a[:,:,2] < 130)
    teal  = (np.abs(a - np.array([0,128,128])).sum(2) < 40)
    alpha = np.where(green | teal, 0, 255).astype('uint8')
    rgba = np.dstack([a.astype('uint8'), alpha])
    return Image.fromarray(rgba, "RGBA"), green

def detect_boxes(green):
    """Ordered list of (y0,x0,y1,x1) — one per gameplay frame, top->bottom / left->right."""
    lbl, n = ndimage.label(~green)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n+1))
    bg = int(np.argmax(sizes)) + 1
    boxes = []
    for i in range(1, n+1):
        if i == bg or sizes[i-1] < 800:
            continue
        ys, xs = np.where(lbl == i)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1-x0) < 20 or (y1-y0) < 20:
            continue
        boxes.append((y0, x0, y1, x1))
    boxes.sort(key=lambda b: (b[0]//40, b[1]))
    return boxes

ALPHA = 16
def content_bbox(im, box):
    """Tight content bbox of one green-cell frame (already keyed transparent)."""
    y0, x0, y1, x1 = box
    cell = im.crop((x0, y0, x1+1, y1+1))
    arr = np.asarray(cell)
    mask = arr[:,:,3] > ALPHA
    ys, xs = np.where(mask)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())

# ★ GLOBAL FACING FIX (2026-08-22, owner-confirmed visually): this DBZ Extreme Butoden rip is drawn facing
#   LEFT, but the engine (sprite.js) draws P1 sprites UN-FLIPPED expecting them to face RIGHT → Frieza faced
#   AWAY from the opponent in EVERY animation. Fix = horizontally MIRROR every cell so the baked art faces
#   right (matches the project convention; the engine then flips normally for facing == -1).
FLIP_H = True
def reslice(im, boxes, out, picks):
    frames = [content_bbox(im, boxes[p]) for p in picks]
    uW = max(f[2]-f[0]+1 for f in frames) + 2
    uH = max(f[3]-f[1]+1 for f in frames) + 2
    strip = Image.new("RGBA", (uW*len(frames), uH), (0,0,0,0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = im.crop((cx0, cy0, cx1+1, cy1+1))
        if FLIP_H: cell = cell.transpose(Image.FLIP_LEFT_RIGHT)   # mirror L→R so the art faces RIGHT
        w, h = cell.size
        strip.paste(cell, (i*uW + (uW-w)//2, uH-h-1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)}f cell {uW}x{uH}  "
          f"-> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_face_portrait(out, target_h=288):
    """Crop the FIRST anime facial close-up from the top portrait row (HUD material).
    Row = 1 full-body ref (on teal, leftmost) + 5 face close-ups on BLACK. We take the
    2nd content cluster (index 1) = the first, calm face."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    top = a[:480]
    green = (top[:,:,1] > 200) & (top[:,:,0] < 90) & (top[:,:,2] < 130)
    teal  = (np.abs(top - np.array([0,128,128])).sum(2) < 40)
    black = top.sum(2) < 60
    content = ~(green | teal | black)
    lbl, n = ndimage.label(content)
    comps = []
    for i in range(1, n+1):
        ys, xs = np.where(lbl == i)
        if len(xs) < 4000:
            continue
        comps.append((xs.min(), xs.max(), ys.min(), ys.max(), len(xs)))
    comps.sort(key=lambda c: c[0])   # left -> right
    # index 0 = full-body ref (on teal); index 1 = first face on black
    x0, x1, y0, y1, _ = comps[1] if len(comps) > 1 else comps[0]
    crop = Image.open(SRC).convert("RGBA").crop((int(x0), int(y0), int(x1)+1, int(y1)+1))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width*scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (anime face #1 from portrait row)")

if __name__ == "__main__":
    im, green = load()
    boxes = detect_boxes(green)
    print(f"detected {len(boxes)} frames\n")

    # ── STAGE 1 — MOVEMENT / STATE ─────────────────────────────────────────────
    # ★VISUAL AUDIT (2026-08-22, vision-subagent): the old idle [18..23] was CONTAMINATED — #18/19 are
    #   hand-to-face REACTION poses and #23 is an arms-crossed taunt; only #20/21/22 are the neutral
    #   tail-sway breathing loop. Corrected to the clean 3-frame neutral loop.
    reslice(im, boxes, "frieza_idle_uniform.png", [20,21,22])
    # CONFIRMED-by-height + audit: crouch/low frames.
    reslice(im, boxes, "frieza_crouch_uniform.png", [7,8,9])
    # ★AUDIT: the old walk [0,1,6] was WRONG (hunched anticipation poses, no locomotion). There is
    #   genuinely NO WALK CYCLE on this Extreme Butoden sheet (hover/dash fighter) → GAP. walk + run now
    #   BORROW the neutral idle in characters.js (honest; no fabricated locomotion). No walk strip emitted.
    reslice(im, boxes, "frieza_dash_uniform.png",  [5])           # forward lean-lunge (glide dash) — audit-confirmed
    reslice(im, boxes, "frieza_jump_uniform.png",  [3,4])         # tall vertical reach (ascent) -> fall holds last cell
    reslice(im, boxes, "frieza_taunt_uniform.png", [31,32,33,34]) # arms-crossed confident gesture
    reslice(im, boxes, "frieza_hurt_uniform.png",       [131,132])     # stagger flinch
    reslice(im, boxes, "frieza_knockdown_uniform.png",  [154,155])     # flat/prone (short-wide = lying)
    reslice(im, boxes, "frieza_getup_uniform.png",      [152,153])     # low -> rise
    make_face_portrait("frieza_portrait.png")

    # ── STAGE 2 — NORMALS + guard ──────────────────────────────────────────────
    # CONFIRMED (Stage-0 visual): box 29 = the motion-streak KICK (white trail) -> heavy.
    reslice(im, boxes, "frieza_heavy_uniform.png", [29])
    # FLAGGED best-effort (image-capped — pose IDs from the correct combat regions, pending sign-off):
    reslice(im, boxes, "frieza_light_uniform.png", [65,66])   # quick forward punch/jab (band-E strike row)
    reslice(im, boxes, "frieza_air_uniform.png",   [46])      # airborne attack (band-D dynamic aerial); down_air reuses this
    reslice(im, boxes, "frieza_guard_uniform.png", [24])      # arms-crossed brace (doubles as guard)
    # up = HONEST REUSE of heavy (launcher-typed, no distinct upward art); down_air = REUSE air (Genos pattern).

    # ── STAGE 3 — command chain (Fwd+Heavy 3-stage rekka: strike → strike → launcher) ──────────
    # FLAGGED best-effort (image-capped): distinct contiguous combat-region rows (bands E–G strike frames).
    reslice(im, boxes, "frieza_rush1_uniform.png", [70,71,72,73])  # opener — forward strike string
    reslice(im, boxes, "frieza_rush2_uniform.png", [87,88,89,90])  # mid — rapid follow strikes
    reslice(im, boxes, "frieza_rush3_uniform.png", [91,92,93])     # finisher — launcher

    # ── STAGE 4 — specials (cast poses + crystal projectile) ───────────────────
    # FLAGGED best-effort cast poses (image-capped): Death Beam point / Ki Blast firing / Death Ball charge.
    reslice(im, boxes, "frieza_deathbeam_uniform.png", [96,97])    # Death Beam — pointing finger cast
    reslice(im, boxes, "frieza_kiblast_uniform.png",   [108,109])  # Ki Blast — arms-forward firing (air reuses)
    reslice(im, boxes, "frieza_deathball_uniform.png", [110,111])  # Death Ball — charge/hurl cast
    # CONFIRMED crystal shard (box 30, 36×34) → the Ki Blast projectile sprite (owner: crystals = projectile FX).
    reslice(im, boxes, "frieza_crystal_uniform.png",   [30])

    # ── STAGE 5 — ULTIMATE: Emperor's Overload (the hunched POWER-UP stance, owner-locked ult) ──
    # CONFIRMED (Stage-0 visual): boxes 118–120 = the large menacing hunched power-up / ki-charge stance.
    reslice(im, boxes, "frieza_overload_uniform.png", [118,119,120])

    # ── STAGE 6 — win pose (band L standing victory stance). lose = REUSE knockdown (flagged). ──
    # FLAGGED best-effort (image-capped): band-L standing/arms-crossed confident victory frames.
    reslice(im, boxes, "frieza_win_uniform.png", [156,157,158])
