#!/usr/bin/env python3
# Re-slice PICCOLO (DBZ Extreme Butoden) from the master sheet
#   "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Piccolo.png"  (1938x9231 RGBA)
# into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#
# ★ SAME green-FILLED-cell structure as Frieza: each frame sits on a solid GREEN cell
#   (#00FF50 = 0,255,80) with teal #008080 only in the outer gutter. Segment = NON-green
#   connected components; global frame index = the top->bottom / left->right ordering
#   printed by tools/piccolo_stage0_boxes.py (so picks line up with PICCOLO_ASSET_MAP.md).
#
# ★ PICCOLO-SPECIFIC HAZARD (fixed): Piccolo has GREEN SKIN. Frieza's loose green key
#   (g>200 & r<90 & b<130) also grabs Piccolo's bright skin-highlight (0,224,8) => holes.
#   So the key here is TIGHT cell-fill green |rgb-(0,255,80)|<40 (grabs the 4.9M cell px,
#   0 skin). Mid skin (0,128,0) is already safe. Keys BOTH tight-green + teal transparent.
#
# ★ Do NOT dilate to reconnect (adjacent frames <6px apart merge). Raw labelling only.
#
# STAGE 1 = movement / state + anime-face portrait. Later stages append picks below.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Piccolo.png"

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    green = (np.abs(a - np.array([0,255,80])).sum(2) < 40)   # TIGHT cell-fill key (protects green skin)
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
    y0, x0, y1, x1 = box
    cell = im.crop((x0, y0, x1+1, y1+1))
    arr = np.asarray(cell)
    mask = arr[:,:,3] > ALPHA
    ys, xs = np.where(mask)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())

# ★ GLOBAL FACING FIX (same as Frieza): this DBZ Extreme Butoden rip is drawn facing LEFT,
#   but the engine draws P1 sprites UN-FLIPPED expecting them to face RIGHT. Mirror every
#   cell so the baked art faces right (engine then flips normally for facing == -1).
FLIP_H = True
def reslice(im, boxes, out, picks):
    frames = [content_bbox(im, boxes[p]) for p in picks]
    uW = max(f[2]-f[0]+1 for f in frames) + 2
    uH = max(f[3]-f[1]+1 for f in frames) + 2
    strip = Image.new("RGBA", (uW*len(frames), uH), (0,0,0,0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = im.crop((cx0, cy0, cx1+1, cy1+1))
        if FLIP_H: cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        strip.paste(cell, (i*uW + (uW-w)//2, uH-h-1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)}f cell {uW}x{uH}  "
          f"-> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_face_portrait(out, target_h=288):
    """First anime facial close-up from the top portrait band (HUD material). Band =
    1 caped full-body ref (leftmost, on teal) + 5 face close-ups on BLACK. Take the 2nd
    content cluster (index 1) = the first, calm face. Uses the TIGHT green key so Piccolo's
    green face isn't fragmented when finding the bbox."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    top = a[:520]
    green = (np.abs(top - np.array([0,255,80])).sum(2) < 40)
    teal  = (np.abs(top - np.array([0,128,128])).sum(2) < 40)
    black = top.sum(2) < 60
    content = ~(green | teal | black)
    lbl, n = ndimage.label(content)
    comps = []
    for i in range(1, n+1):
        ys, xs = np.where(lbl == i)
        if len(xs) < 4000:
            continue
        comps.append((int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max()), len(xs)))
    comps.sort(key=lambda c: c[0])   # left -> right
    x0, x1, y0, y1, _ = comps[1] if len(comps) > 1 else comps[0]
    crop = Image.open(SRC).convert("RGBA").crop((x0, y0, x1+1, y1+1))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width*scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (anime face #1 from portrait band)")

if __name__ == "__main__":
    im, green = load()
    boxes = detect_boxes(green)
    print(f"detected {len(boxes)} frames\n")

    # ── STAGE 1 — MOVEMENT / STATE (reslice'd feet-aligned *_uniform.png; anchorY 0 plants feet). ──
    # IDLE = the arms-crossed neutral loop (Stage-0 CONFIRMED by direct render; Piccolo's canonical stance).
    reslice(im, boxes, "piccolo_idle_uniform.png", [19,20,21,22])
    # WALK/RUN = GENUINE GAP (no locomotion cycle on this Extreme Butoden sheet, like Frieza) → BORROW idle
    #   in characters.js (owner-approved). No walk strip emitted; no fabricated locomotion.
    reslice(im, boxes, "piccolo_dash_uniform.png",   [17])        # forward lean-lunge (glide dash)
    reslice(im, boxes, "piccolo_jump_uniform.png",   [4,5])       # arms-overhead ascent -> fall holds last cell
    reslice(im, boxes, "piccolo_crouch_uniform.png", [143])       # low ducking crouch (best low pose; flagged)
    reslice(im, boxes, "piccolo_guard_uniform.png",  [119,120])   # arms-crossed braced block
    reslice(im, boxes, "piccolo_hurt_uniform.png",   [125,126])   # gut-hit stagger flinch
    reslice(im, boxes, "piccolo_knockdown_uniform.png", [133,144])# flat/prone lying (short-wide)
    reslice(im, boxes, "piccolo_getup_uniform.png",  [134,140])   # low -> rise
    reslice(im, boxes, "piccolo_taunt_uniform.png",  [114])       # chest-out flex/roar
    make_face_portrait("piccolo_portrait.png")
