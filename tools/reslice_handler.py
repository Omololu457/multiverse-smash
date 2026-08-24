#!/usr/bin/env python3
# Re-slice "THE HANDLER" (rosterKey `handler`, Jujutsu Kaisen) — a NEW standalone character
# built from the REMOVED Megumi Fushiguro's Ten-Shadows shikigami art + Mahoraga (see
# HANDLER_ASSET_MAP.md for the full Stage-0 pixel audit). This file = STAGE 1 (movement/state
# only): idle, walk, crouch, jump, hurt/knockdown. Base-char art = the fushiguro fullview sheet,
# already split into per-action megumi_*.png files.
#
# LABEL GEOMETRY (differs from yuta): each megumi_*.png carries an INLINE top-left label band
# (e.g. "STANCE"/"WALK" white text at rows ~3-16) with a small empty gap (rows ~17-21) before
# the sprite band. Unlike yuta the label is NOT full-width, so auto-gap detection is unreliable;
# bands are measured (rowcount projection) and pinned per-file below. Frames are then repacked
# into uniform cells (centered-X, BOTTOM-aligned → anchorY:0 feet-plant across all actions).
import sys, os
from PIL import Image

ALPHA = 16

def load(src):
    return Image.open(src).convert("RGBA")

def frame_bbox(px, x0, x1, y0, y1):
    """Tight content bbox of one frame within column span [x0,x1) and band [y0,y1)."""
    miny, maxy = y1, y0 - 1
    minx, maxx = x1, x0 - 1
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > ALPHA:
                if y < miny: miny = y
                if y > maxy: maxy = y
                if x < minx: minx = x
                if x > maxx: maxx = x
    if maxy < miny:
        return None
    return (minx, miny, maxx + 1, maxy + 1)

def build(src, spans, out, band, pad_to=None, scale=1.0):
    """spans = list of (x0,x1) column spans (one per frame). band = (y0,y1) sprite band (label
    EXCLUDED). Repack each frame's content bbox → uniform strip, centered-X + bottom-aligned.
    `scale` (<1) shrinks each frame — used to reconcile a source size mismatch vs idle (the walk
    art is drawn ~19% taller than the stance art → scale it down so the body doesn't 'grow' when
    walking; same fix as reslice_yuta's walk-scale)."""
    im = load(src); px = im.load()
    y0, y1 = band
    boxes = []
    for (x0, x1) in spans:
        bb = frame_bbox(px, x0, x1, y0, y1)
        if bb is None:
            print(f"  !! empty frame span {x0}-{x1} in {src}", file=sys.stderr); continue
        boxes.append(bb)
    cells = []
    for (bx0, by0, bx1, by1) in boxes:
        cell = im.crop((bx0, by0, bx1, by1))
        if scale != 1.0:
            cell = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))), Image.NEAREST)   # NEAREST = crisp pixel-art scaling (LANCZOS blurred the sprite)
        cells.append(cell)
    uW = max(c.width for c in cells) + 2
    uH = max(c.height for c in cells) + 2
    if pad_to:
        uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        cw, ch = cell.size
        dx = i * uW + (uW - cw) // 2
        dy = uH - ch - 1                       # BOTTOM-align → feet plant (anchorY:0)
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"{out}: {len(cells)} frames, cell {uW}x{uH}")
    return uW, uH

def _sq(cell, out, size=128):
    bb = cell.getbbox()
    if bb: cell = cell.crop(bb)
    s = max(cell.size) + 6
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(cell, ((s - cell.width) // 2, (s - cell.height) // 2), cell)
    sq.resize((size, size), Image.NEAREST).save(out)

# ── STAGE 6 — WIN pose + PORTRAIT from the sword-draw INSET pair in the combo string
# (megumi_attack_punches_kicks.png, x~490-670: two confident reference stances on a brown bg — sword
# planted → sword drawn). No bespoke win/portrait art exists anywhere (flagged gap); these repurpose the
# genuine inset art. We chroma-key the solid brown field + residual foot-shadow, then slice the two figures.
def make_win_and_portrait():
    im = load("megumi_attack_punches_kicks.png"); px = im.load(); W, H = im.size
    BR = (96, 80, 80)
    for y in range(H):
        for x in range(488, min(W, 672)):
            r, g, b, a = px[x, y]
            if a == 0: continue
            if r >= 70 and ((r-BR[0])**2 + (g-BR[1])**2 + (b-BR[2])**2) ** 0.5 < 48: px[x, y] = (0, 0, 0, 0)
            elif abs(r-112) < 20 and abs(g-96) < 20 and abs(b-80) < 24: px[x, y] = (0, 0, 0, 0)
    for y in range(78, H):                                  # kill the residual foot-shadow band
        for x in range(488, min(W, 672)):
            r, g, b, a = px[x, y]
            if a and r < 60 and g < 60 and b < 60: px[x, y] = (0, 0, 0, 0)
    # WIN: the two stances (sword-planted → sword-drawn), bottom-aligned; band = figure content y30-79
    # (the inset's border lines sit at y23-24 and y87 — excluded by this band).
    band = (30, 80)
    cells = []
    for (x0, x1) in [(500, 570), (598, 668)]:
        bb = frame_bbox(px, x0, x1, band[0], band[1])
        if bb: cells.append(im.crop(bb))
    uW = max(c.width for c in cells) + 2; uH = max(c.height for c in cells) + 2
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - 1), c)
    strip.save("handler_win_uniform.png"); print(f"handler_win_uniform.png: {len(cells)} frames, cell {uW}x{uH}")
    # PORTRAIT: the sword-drawn (right) figure's head+torso bust — a real, characterful select asset
    # (replaces the Stage-1 idle placeholder).
    _sq(im.crop((599, 29, 668, 62)), "handler_portrait.png")
    print("handler_portrait.png: 128x128 bust (sword-drawn win stance — replaces the idle placeholder)")

# ── STAGE 1 action → (source file, band, [frame column spans]) ────────────────────
# Bands/spans measured via rowcount+colspan projection (tools/probe) then pinned here.
IDLE_BAND, IDLE   = (17, 80), [(4,27),(31,55),(58,82),(85,109)]                     # megumi_stance.png LEFT cluster: 4 calm standing frames (breathing loop). Right cluster + ruler dropped.
WALK_BAND, WALK   = (17, 86), [(0,27),(32,61),(65,94),(101,127),(135,157),
                               (166,190),(197,225),(233,260),(267,291),(299,322)]  # megumi_walk.png: 10-frame side-profile cycle (label rows 3-16 excluded)
CROUCH_BAND, CROUCH = (22, 78), [(0,33)]                                           # megumi_crouch.png: moderate standing-crouch (frame 1). Deep kneel (frame 2) dropped.
JUMP_BAND, JUMP   = (20, 80), [(0,39),(47,82)]                                      # megumi_jump.png: rise-tuck → arms-up apex (2 real air poses)
HIT_BAND          = (16, 76)
HURT              = [(0,42),(50,89)]                                                # megumi_hit.png: recoil → stagger
KNOCKDOWN         = [(95,151)]                                                      # megumi_hit.png: falling-on-back (ends the hit in a fall, per prompt)

# ── STAGE 2 NORMALS — carved from the ONE ground combo string megumi_attack_punches_kicks.png
# ("ATTACK: PUNCHES/KICKS"): label rows 3-17, gap 18-21, sprites rows 22+. The string is
# jab→punch→punch → draw-katana → crouch-windup → thrust A → thrust B(big) → settle, then 2 inset
# reference poses on a brown bg (x492-670, sword sheathed→drawn — Stage-6 win/portrait candidate,
# EXCLUDED from normals). Mapping (the source has NO aerial/upward art — a single ground string):
#   light = the 3 punches (fast poke)
#   up    = the rising sword-DRAW motion (repurposed as an anti-air launcher — blade unsheathes upward)
#   heavy = the forward sword THRUST (the "blade-drawn strike", long reach)
#   air/down_air REUSE the light punch sheet (no aerial art) — declared as reuses in characters.js.
ATK_BAND          = (22, 93)
N_LIGHT           = [(8,44),(47,87),(89,130)]                                       # jab → punch → punch
N_UP              = [(135,192),(193,249)]                                           # draw katana → crouch-windup (rising launcher)
N_HEAVY           = [(256,328),(334,413),(419,480)]                                 # thrust A → thrust B (big) → settle (long-reach forward sword)

def main():
    build("megumi_stance.png", IDLE,   "handler_idle_uniform.png",   IDLE_BAND)
    # walk art is drawn taller than stance (content 69 vs idle 58) → scale to idle height so the
    # body doesn't visibly grow when walking.
    build("megumi_walk.png",   WALK,   "handler_walk_uniform.png",   WALK_BAND, scale=58/69)
    build("megumi_crouch.png", CROUCH, "handler_crouch_uniform.png", CROUCH_BAND)
    build("megumi_jump.png",   JUMP,   "handler_jump_uniform.png",   JUMP_BAND)
    build("megumi_hit.png",    HURT,      "handler_hurt_uniform.png",      HIT_BAND)
    build("megumi_hit.png",    KNOCKDOWN, "handler_knockdown_uniform.png", HIT_BAND)
    # Stage 2 normals (carved from the single ground combo string)
    build("megumi_attack_punches_kicks.png", N_LIGHT, "handler_light_uniform.png", ATK_BAND)
    build("megumi_attack_punches_kicks.png", N_UP,    "handler_up_uniform.png",    ATK_BAND)
    build("megumi_attack_punches_kicks.png", N_HEAVY, "handler_heavy_uniform.png", ATK_BAND)
    # getup: NO dedicated art (hit sheet is only recoil→stagger→fall). Reuses the hurt sheet
    # (rising ≈ recoil pose) — declared as a reuse in characters.js, flagged in the asset map.
    # Stage 6 — win pose + portrait from the sword-draw inset pair.
    make_win_and_portrait()

if __name__ == "__main__":
    main()
