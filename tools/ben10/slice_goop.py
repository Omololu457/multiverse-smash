#!/usr/bin/env python3
"""Slice the Goop (Polymorph, Alien Force) cell-grid sheet into uniform game strips (Phase 1 of the Goop alien).

  python3 -I tools/ben10/slice_goop.py        # writes ben10_goop_*.png, goopAssets.js, docs/ben10/aliens/goop/*

Source: assets/sprites/ben10/aliens/goop.png  (4739x4903, "DS/DSi - Ben 10: Alien Force - Playable Characters - Goop").
Rules (see docs/ben10/aliens/goop/SPRITE_LEDGER.md):
  * CELL GRID: cyan (0,248,248) cells separated by 1 px teal (0,128,128) lines on a teal outer field. Cells are
    the 4-connected non-teal components (every one is a perfect rectangle; asserted). Cell width varies per row.
  * Each cell is keyed on ITS OWN corner colour, zero tolerance (asserted: all four corners are that colour); the
    teal separators / field never enter a cell. Palette check: no sprite colour is within 128 (L1) of either key.
  * Rows = cells sharing a top edge. "Wrapped" strips on the sheet are SHORTER cells that share the row's top
    edge (rows 19, 23, 24): they continue the same left-to-right sequence (asserted: no cell starts mid-row).
  * Nothing is cropped: the whole keyed cell (goo arcs, drips, spikes, detached specks) is pasted 1:1
    (nearest-neighbour only, never resampled; on-screen size comes from actionScale).
  * Anchor (source px inside the cell): 'cell'   = x 125 from the cell's left edge (the stand pose's body centre in
    every row) and the floor at y = min(183, cell height) — the artist's cell origin, feet on the cell floor;
    'puddle' = the puddle's own bbox centre on its bottom row (pure puddle frames: R16, R17 f1);
    'air'    = x 125, floor at the row's lowest body pixel (R10 / R11 are drawn high in their cells);
    'body'   = feet baseline + the row's mean upper-torso column (idle / walk / walk_back / run / dash): the cell
               origin made idle->walk jump ~10 source px, so locomotion rows are centred on the body instead.
  * The grey 11x8 disc above the head MOVES with Goop (follows the head, floats over every puddle frame, swings out
    on the lasso, rises with the rocket): it is his ANTI-GRAVITY PROJECTOR, kept in the art; its per-frame centre
    is recorded (GOOP_PROJECTOR) for the Phase 3 weak-point hurtbox. Spike Splash (R6) has no projector drawn.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/goop.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/goop')
TEAL, CYAN = (0, 128, 128), (0, 248, 248)
GREY = [(96, 96, 96), (112, 112, 112), (128, 128, 128)]
AX, FLOOR = 125, 183
ACTION_SCALE = 1.1   # 61 px native standing body -> ~158 px on screen (Ben's spriteScale 2.0 x global 1.18), Heatblast ~156

im = np.array(Image.open(SRC).convert('RGBA'))
rgb = im[:, :, :3].astype(np.int32)
H, W, _ = im.shape
teal = np.all(rgb == TEAL, axis=2)
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]: assert tuple(rgb[y, x]) == TEAL, 'outer field is not teal'

# palette collision check (zero-tolerance keys need clear separation from every sprite colour)
fgmask = ~teal & ~np.all(rgb == CYAN, axis=2)
PALETTE = sorted({tuple(int(v) for v in p) for p in rgb[fgmask]})
for c in PALETTE:
    for k in (TEAL, CYAN): assert sum(abs(a - b) for a, b in zip(c, k)) >= 128, ('palette collision', c, k)

lab, n = ndimage.label(~teal)   # 4-connected: 1 px teal separators split the cells
cells = []
for i, s in enumerate(ndimage.find_objects(lab)):
    assert (lab[s] == i + 1).all(), 'cell is not a rectangle'
    cells.append((s[0].start, s[1].start, s[0].stop, s[1].stop))
rowsy = sorted({c[0] for c in cells})
ROWS = [sorted([c for c in cells if c[0] == y], key=lambda c: c[1]) for y in rowsy]
assert len(ROWS) == 27 and sum(len(r) for r in ROWS) == 296, (len(ROWS), sum(len(r) for r in ROWS))
for r in ROWS:   # contiguous left-to-right, no gaps: a wrapped strip is the same sequence
    for a, b in zip(r, r[1:]): assert b[1] == a[3] + 1, ('row gap', a, b)

def cell(r, f):
    y0, x0, y1, x1 = ROWS[r - 1][f - 1]
    sub = im[y0:y1, x0:x1].copy()
    corners = [tuple(int(v) for v in sub[yy, xx, :3]) for (yy, xx) in [(0, 0), (0, -1), (-1, 0), (-1, -1)]]
    key = max(set(corners), key=corners.count)   # the cell's own corner colour (a sprite may touch one corner)
    assert corners.count(key) >= 3 and all(c == key or c in PALETTE for c in corners), ('cell corners', r, f, corners)
    bgm = np.all(sub[:, :, :3] == key, axis=2)
    sub[bgm] = 0
    return sub, ~bgm, (x0, y0, x1, y1)

def projector(sub, m):
    """Centre of the largest 8-connected grey cluster (the disc; the body has only a few stray grey pixels)."""
    g = np.zeros(m.shape, bool)
    for c in GREY: g |= np.all(sub[:, :, :3] == c, axis=2)
    l2, k = ndimage.label(g, structure=np.ones((3, 3)))
    if k == 0: return None
    sizes = ndimage.sum(g, l2, range(1, k + 1)); best = int(np.argmax(sizes)) + 1
    if sizes[best - 1] < 20: return None
    ys, xs = np.where(l2 == best)
    return (float(xs.mean()), float(ys.mean()), int(sizes[best - 1]))

def body_bbox(m):
    l2, k = ndimage.label(m, structure=np.ones((3, 3)))
    sizes = ndimage.sum(m, l2, range(1, k + 1)); best = int(np.argmax(sizes)) + 1
    ys, xs = np.where(l2 == best)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

_torso = {}
def row_torso_x(r):
    if r not in _torso:
        xs = []
        for k in range(1, len(ROWS[r - 1]) + 1):
            _s, m, bb = cell(r, k); fy = min(FLOOR, bb[3] - bb[1])
            yy, xx = np.where(m[int(fy) - 55:int(fy) - 30]); xs.extend(xx.tolist())
        _torso[r] = float(np.mean(xs))
    return _torso[r]

def anchor(r, f, mode):
    sub, m, bb = cell(r, f)
    ch = bb[3] - bb[1]
    if mode == 'puddle':
        x0, y0, x1, y1 = body_bbox(m); return (x0 + x1) / 2.0, float(y1)
    if mode == 'body':   # feet baseline + body centre: the ROW's mean upper-torso column (locomotion rows, no idle->walk jitter)
        return row_torso_x(r), float(min(FLOOR, ch))
    if mode == 'air':
        return float(AX), float(max(body_bbox(cell(r, k)[1])[3] for k in range(1, len(ROWS[r - 1]) + 1)))
    return float(AX), float(min(FLOOR, ch))

# ── animation table: anim -> ([(row, [frames], anchor mode)], speed (game frames per sheet frame), loop, role) ──
def rng(a, b): return list(range(a, b + 1))
A = {
  'idle':        ([(21, rng(1, 13), 'body')], 6, True,  'idle (R21 standing)'),
  'walk':        ([(25, rng(1, 12), 'body')], 4, True,  'walk (R25 strides)'),
  'walk_back':   ([(15, rng(1, 10), 'body')], 5, True,  'walk_back (R15 standing/stepping)'),
  'run':         ([(26, rng(1, 12), 'body')], 3, True,  'run (R26 strides)'),
  'dash':        ([(26, rng(1, 12), 'body')], 2, True,  'dash - REUSED run strides (no dash row)'),
  'jump':        ([(23, rng(1, 3), 'cell'), (24, rng(1, 9), 'cell')], 3, False, 'jump_start (R23 f1-3 crouch) -> jump_rise (R24)'),
  'doubleJump':  ([(23, rng(4, 8), 'cell')], 3, False, 'shared double jump: R23 f4-8 rise / land poses'),
  'fall':        ([(11, rng(1, 9), 'air')], 4, False, 'jump_fall (R11 airborne falling poses)'),
  'crouch':      ([(22, rng(1, 2), 'cell')], 5, False, 'crouch (R22 melting down)'),
  'transform':   ([(14, rng(1, 6), 'cell')], 5, False, 'transform-in / intro (R14 small standing, idle alt)'),
  'taunt':       ([(8, rng(8, 12), 'cell')], 6, False, 'taunt (R8 f8-12 arm-point hold)'),
  'guard':       ([(27, rng(5, 9), 'cell')], 6, False, 'block (R27 straight standing)'),
  'win':         ([(27, rng(1, 22), 'cell')], 5, False, 'win_pose (R27 straight standing, full row)'),
  'hurt':        ([(20, rng(1, 6), 'cell')], 3, False, 'hit_react light/heavy (R20 splashed standing)'),
  'hurt_air':    ([(10, rng(1, 14), 'air')], 3, False, 'launched / hit_heavy airborne (R10 tumble + diagonal fall with drips)'),
  'knockdown':   ([(19, rng(1, 13), 'cell')], 3, False, 'knockdown (R19 f1-13 hit -> splat -> puddle)'),
  'getup':       ([(19, rng(14, 31), 'cell')], 2, False, 'get_up = REFORM (R19 f14-31 long rise)'),
  'lose':        ([(19, rng(1, 13), 'cell')], 4, False, 'lose_pose - REUSED R19 f1-13 splat'),
  'light':       ([(18, rng(1, 8), 'cell')], 2, False, 'JAB chain (R18 arm fling with splash)'),
  'heavy':       ([(1, rng(1, 7), 'cell')], 3, False, 'HEAVY stretch kick (R1)'),
  'down':        ([(22, rng(1, 2), 'cell'), (16, rng(1, 3), 'puddle'), (17, rng(2, 3), 'cell')], 2, False, 'LOW melt-sweep (R22 melt -> R16 slide -> R17 reform)'),
  'up':          ([(5, rng(1, 5), 'cell')], 3, False, 'LAUNCHER (R5 f1-5)'),
  'air':         ([(11, rng(4, 7), 'air')], 2, False, 'AIR attack - REUSED R11 f4-7 (airborne falling poses)'),
  'gpPoke':      ([(12, rng(1, 9), 'cell')], 3, False, 'STRETCH POKE fwd+Heavy (R12 arm -> long goo strand)'),
  'gpSpit':      ([(8, rng(1, 7), 'cell'), (9, rng(1, 10), 'cell'), (8, rng(13, 14), 'cell')], 2, False, 'ACID SPIT: R8 arm-point aim -> R9 horizontal goo spray -> R8 f13-14 settle'),
  'gpLob':       ([(2, rng(1, 7), 'cell')], 3, False, 'ACID LOB (R2 crouch, goo arc lobbed overhead)'),
  'gpLasso':     ([(7, rng(1, 10), 'cell')], 3, False, 'GOO LASSO (R7 overhead whip loop, splash)'),
  'gpSpike':     ([(6, rng(1, 12), 'cell')], 3, False, 'SPIKE SPLASH (R6 melt, goo spikes star from floor)'),
  'gpRocket':    ([(5, rng(1, 16), 'cell')], 2, False, 'GOO ROCKET air (R5 rising twisting column, splits, reform)'),
  'gpMelt':      ([(22, rng(1, 2), 'cell')], 3, False, 'PUDDLE enter (R22 melting down)'),
  'gpPuddle':    ([(16, rng(1, 10), 'puddle')], 4, True, 'PUDDLE travel loop (R16 flat puddle sliding)'),
  'gpReform':    ([(17, [1], 'puddle'), (17, rng(2, 3), 'cell')], 4, False, 'PUDDLE reform (R17 puddle rising)'),
  'gpGeyser':    ([(3, rng(1, 11), 'cell')], 2, False, 'GEYSER puddle exit (R3 puddle -> diagonal stream -> reform)'),
  'gpSplat':     ([(19, rng(4, 13), 'cell')], 4, True, 'SPLAT (R19 f4-13 puddle, reused from knockdown)'),
  'gpSplatRise': ([(19, rng(22, 31), 'cell')], 2, False, 'SPLAT reform (R19 f22-31 rise, reused from get_up)'),
  'gpUltOpen':   ([(7, rng(1, 10), 'cell')], 2, False, 'ULT opener - REUSED Goo Lasso (R7)'),
  'gpUltMelt':   ([(13, rng(1, 3), 'cell')], 3, False, 'ULT 1: melt (R13 f1-3)'),
  'gpUltFlood':  ([(16, rng(1, 10), 'puddle')], 3, True, 'ULT 1: floor flood (R16 puddle; widened by render-only tiling)'),
  'gpUltSpikes': ([(13, rng(4, 11), 'cell'), (6, rng(4, 8), 'cell')], 3, False, 'ULT 2: spike star juggle (R13 f4-11 second spike star + R6 f4-8)'),
  'gpUltColumn': ([(5, rng(4, 16), 'cell')], 2, False, 'ULT 3: rising column swallows them (R5 f4-16)'),
  'gpUltWave':   ([(4, rng(1, 14), 'cell')], 2, False, 'ULT 4: puddle arcs over in a wave, splash (R4) then reform (gpReform)'),
}

def build():
    # pass 1: every placed frame's extent relative to its anchor -> one uniform cell for every strip
    placed = {}
    lo_x = lo_y = 0; hi_x = hi_y = 0
    for key, (segs, *_r) in A.items():
        for (r, frames, mode) in segs:
            for f in frames:
                sub, m, bb = cell(r, f)
                ax, fy = anchor(r, f, mode)
                ys, xs = np.where(m)
                lo_x = min(lo_x, xs.min() - ax); hi_x = max(hi_x, xs.max() + 1 - ax)
                lo_y = min(lo_y, ys.min() - fy); hi_y = max(hi_y, ys.max() + 1 - fy)
                placed[(r, f, mode)] = (sub, m, bb, ax, fy)
    half = int(np.ceil(max(-lo_x, hi_x))) + 2
    CW = 2 * half; CX = half
    FEET_Y = int(np.ceil(-lo_y)) + 2; CH = FEET_Y + int(np.ceil(hi_y)) + 2
    anim, proj, ledger, used = {}, {}, [], set()
    for key, (segs, speed, loop, role) in A.items():
        strip, pp = [], []
        for (r, frames, mode) in segs:
            for f in frames:
                sub, m, bb, ax, fy = placed[(r, f, mode)]
                ys, xs = np.where(m); by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
                ox, oy = int(round(CX - ax)) + bx0, int(round(FEET_Y - fy)) + by0
                c = np.zeros((CH, CW, 4), np.uint8)
                assert ox >= 0 and oy >= 0 and ox + (bx1 - bx0) <= CW and oy + (by1 - by0) <= CH, ('cropped', key, r, f)
                region = c[oy:oy + by1 - by0, ox:ox + bx1 - bx0]
                mm = m[by0:by1, bx0:bx1]
                region[mm] = sub[by0:by1, bx0:bx1][mm]
                assert int(mm.sum()) == int(m.sum()), 'pixels lost'
                strip.append(c)
                p = projector(sub, m)
                pp.append(None if p is None else [round(p[0] - ax, 1), round(p[1] - fy, 1)])
                ledger.append(dict(anim=key, row=r, frame=f, anchor=mode, src_cell=list(map(int, bb)),
                                   projector=None if p is None else [round(p[0], 1), round(p[1], 1), p[2]]))
                used.add((r, f))
        path = f'ben10_goop_{key}_uniform.png'
        Image.fromarray(np.concatenate(strip, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(strip), width=CW, height=CH, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
        proj[key] = pp
    allf = {(r, f) for r in range(1, 28) for f in range(1, len(ROWS[r - 1]) + 1)}
    assert used == allf, ('unused frames', sorted(allf - used))
    return anim, proj, ledger, (CW, CH, CX, FEET_Y)

# FX: real sheet pixels only. glob = 4 detached goo drips (lob in flight); splash = R16 f1 puddle minus its projector.
FX_GLOBS = [(13, 5, (112, 128, 118, 143)), (11, 7, (134, 133, 141, 150)), (12, 6, (221, 120, 238, 125)), (10, 6, (157, 149, 166, 158))]
def build_fx():
    out = {}
    cellsg = []
    for (r, f, (x0, y0, x1, y1)) in FX_GLOBS:
        sub, m, _ = cell(r, f)
        a = sub[y0:y1, x0:x1].copy(); a[~m[y0:y1, x0:x1]] = 0; cellsg.append(a)
    gw = max(a.shape[1] for a in cellsg); gh = max(a.shape[0] for a in cellsg)
    row = []
    for a in cellsg:
        c = np.zeros((gh, gw, 4), np.uint8); oy, ox = (gh - a.shape[0]) // 2, (gw - a.shape[1]) // 2
        c[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a; row.append(c)
    Image.fromarray(np.concatenate(row, axis=1), 'RGBA').save(os.path.join(ROOT, 'ben10_goop_fx_glob.png'))
    out['glob'] = dict(sheet='./ben10_goop_fx_glob.png', frames=len(row), w=gw, h=gh, speed=3)
    sub, m, _ = cell(16, 1)
    x0, y0, x1, y1 = body_bbox(m)
    l2, k = ndimage.label(m, structure=np.ones((3, 3)))
    keep = l2 == l2[y1 - 1, (x0 + x1) // 2] if l2[y1 - 1, (x0 + x1) // 2] else None
    if keep is None:
        sizes = ndimage.sum(m, l2, range(1, k + 1)); keep = l2 == int(np.argmax(sizes)) + 1
    a = sub[y0:y1, x0:x1].copy(); a[~keep[y0:y1, x0:x1]] = 0
    Image.fromarray(a, 'RGBA').save(os.path.join(ROOT, 'ben10_goop_fx_splash.png'))
    out['splash'] = dict(sheet='./ben10_goop_fx_splash.png', frames=1, w=int(x1 - x0), h=int(y1 - y0), speed=8)
    return out

def contact_sheet(anim, proj, geom):
    CW, CH, CX, FEET_Y = geom
    S = 1; LW = 150
    names = list(anim)
    imgs = [(k, Image.open(os.path.join(ROOT, anim[k]['sheet'][2:]))) for k in names]
    maxw = 2400; perrow = max(1, (maxw - LW) // CW)
    blocks = []
    for k, img in imgs:
        nf = anim[k]['frames']
        lines = (nf + perrow - 1) // perrow
        blocks.append((k, img, nf, lines))
    total_h = sum(lines * (CH + 4) + 6 for _, _, _, lines in blocks) + 10
    sheet = Image.new('RGBA', (LW + perrow * CW + 10, total_h), (34, 38, 46, 255))
    d = ImageDraw.Draw(sheet); y = 5
    for k, img, nf, lines in blocks:
        d.text((6, y + 4), k, fill=(240, 240, 240, 255))
        d.text((6, y + 18), f'{nf} fr', fill=(150, 160, 170, 255))
        for i in range(nf):
            col, ln = i % perrow, i // perrow
            x0 = LW + col * CW; y0 = y + ln * (CH + 4)
            bg = Image.new('RGBA', (CW, CH), (52, 56, 66, 255) if (i % 2) else (60, 64, 74, 255))
            fr = img.crop((i * CW, 0, (i + 1) * CW, CH)); bg.alpha_composite(fr)
            bd = ImageDraw.Draw(bg)
            bd.line([(0, FEET_Y), (CW, FEET_Y)], fill=(0, 200, 120, 255)); bd.line([(CX, 0), (CX, CH)], fill=(90, 90, 160, 255))
            p = proj[k][i]
            if p: px, py = CX + p[0], FEET_Y + p[1]; bd.rectangle([px - 6, py - 4, px + 6, py + 4], outline=(255, 60, 60, 255))
            else: bd.text((4, 4), 'no proj', fill=(255, 200, 0, 255))
            sheet.alpha_composite(bg, (x0, y0))
        y += lines * (CH + 4) + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))

READS = {1: 'horizontal leg stretch, goo drips', 2: 'crouch, goo arc lobbed overhead', 3: 'puddle -> diagonal stream rises -> reform',
  4: 'puddle arcs over in a wave, splash', 5: 'rising twisting column, splits, reform', 6: 'melt, goo spikes star from floor',
  7: 'overhead goo whip loop, splash', 8: 'standing arm-point', 9: 'horizontal goo spray (his body)', 10: 'tumbles, diagonal falls with drips',
  11: 'airborne falling poses', 12: 'arm stretches into a long goo strand', 13: 'second melt + spike star', 14: 'small standing',
  15: 'standing / stepping', 16: 'flat puddle sliding', 17: 'puddle rising', 18: 'arm fling with splash',
  19: 'hit, splat, puddle, long rise', 20: 'splashed standing', 21: 'standing', 22: 'melting down', 23: 'standing -> crouch -> rise',
  24: 'airborne poses', 25: 'strides', 26: 'strides', 27: 'straight standing'}
INV = {1: 7, 2: 7, 3: 11, 4: 13, 5: 16, 6: 11, 7: 10, 8: 14, 9: 10, 10: 14, 11: 9, 12: 9, 13: 11, 14: 6, 15: 10, 16: 10, 17: 3, 18: 8,
  19: '~31', 20: 6, 21: 13, 22: 2, 23: '~8', 24: '~9', 25: 12, 26: 12, 27: '~22'}
MOVE = {'idle': 'idle', 'walk': 'walk', 'walk_back': 'walk back', 'run': 'run', 'dash': 'dash', 'jump': 'jump', 'doubleJump': 'shared double jump',
  'fall': 'jump_fall', 'crouch': 'crouch', 'transform': 'transform-in', 'taunt': 'taunt', 'guard': 'block', 'win': 'win pose',
  'hurt': 'hit react', 'hurt_air': 'launched / hit heavy', 'knockdown': 'knockdown', 'getup': 'get up (reform)', 'lose': 'lose pose',
  'light': 'Jab', 'heavy': 'Heavy (stretch kick)', 'down': 'Low (melt-sweep)', 'up': 'Launcher', 'air': 'Air', 'gpPoke': 'Stretch Poke (fwd+Heavy)',
  'gpSpit': 'Acid Spit', 'gpLob': 'Acid Lob', 'gpLasso': 'Goo Lasso', 'gpSpike': 'Spike Splash', 'gpRocket': 'Goo Rocket (air)',
  'gpMelt': 'Puddle Form enter', 'gpPuddle': 'Puddle Form slide', 'gpReform': 'Puddle Form release / ult reform', 'gpGeyser': 'Geyser (puddle exit)',
  'gpSplat': 'Splat (projector broken)', 'gpSplatRise': 'Splat reform', 'gpUltOpen': 'Meltdown Flood opener', 'gpUltMelt': 'Meltdown Flood 1 (melt)',
  'gpUltFlood': 'Meltdown Flood 1 (flood)', 'gpUltSpikes': 'Meltdown Flood 2 (spike star)', 'gpUltColumn': 'Meltdown Flood 3 (column)',
  'gpUltWave': 'Meltdown Flood 4 (wave crash)'}

def write_ledger(anim, ledger, missing, geom):
    by = {}
    for e in ledger: by.setdefault((e['row'], e['frame']), []).append(e['anim'])
    L = []
    L.append('# Goop (Polymorph) — sprite ledger\n')
    L.append('Generated by `python3 -I tools/ben10/slice_goop.py` from `assets/sprites/ben10/aliens/goop.png` (4739×4903, the sheet the brief\n'
             'names; the identical file sits at the repo root as `DS _ DSi - Ben 10_ Alien Force - Playable Characters - Goop.png`).\n'
             'Olive/yellow-green goo humanoid; NOT Swampfire (same layout, but no flame head and no orange/magenta rows).\n')
    L.append('## Grid, keys, wraps\n')
    L.append('- **Cells**: 296 cyan `(0,248,248)` rectangles split by 1 px teal `(0,128,128)` lines on a teal field (4-connected non-teal\n'
             '  components; every one asserted to be a perfect rectangle). 27 rows; cell width varies per row (142–254 px), height 132–191.\n'
             '- **Keying**: each cell keyed on its OWN corner colour, zero tolerance (≥3 corners equal; the 4th may be a sprite pixel —\n'
             '  R6 spikes touch the cell floor). Separators/field never enter a cell. Pixels are pasted 1:1 (nearest-neighbour, no resample).\n'
             '- **Palette collision check**: 15 sprite colours (10 olive/yellow-greens, 1 dark olive, 1 deep green, 3 greys). The closest to a\n'
             '  key is grey `(128,128,128)` at L1 128 from teal; nothing is within 128 of cyan → zero-tolerance keying is safe.\n'
             '- **Wrapped rows**: rows 19, 23 and 24 look wrapped on the sheet. They are SHORTER cells sharing the row\'s top edge\n'
             '  (R19 f5–13 h153; R23 f4–5 h132 / f6–8 h138; R24 f6–9 h137) — every row is one contiguous left-to-right run (asserted:\n'
             '  each cell starts 1 px after the previous one). Treated as the same sequence; confirmed on the contact sheet.\n'
             '- Real counts vs the brief\'s inventory: R4 has **14** (brief 13), R6 has **12** (brief 11); R19 31, R23 8, R24 9, R27 22.\n')
    L.append('## The grey speck = ANTI-GRAVITY PROJECTOR (kept)\n')
    L.append('The brief describes a small red speck; on this sheet it is an 11×8 **grey** disc (greys 96/112/128 — there is no red anywhere).\n'
             'It MOVES with him, so it is the projector, not a sheet marker: it follows the head through idle/walk/run, floats ~70 source px\n'
             'over every puddle frame (R16, R3 f1–2, R19 f5–13), swings out to x+102 on the Lasso (R7 f3), climbs with the Rocket (R5 f5–7),\n'
             'and drifts during attacks. Its centre is recorded for every exported frame (`GOOP_PROJECTOR`, source px relative to the\n'
             'anchor) and feeds the Phase 3 weak-point hurtbox. It touches the body in R21 f8/f10 and R24 f5 (found as the largest grey\n'
             f'cluster). **Not drawn in Spike Splash (R6, all 12 cells)**: those frames reuse the melted pose\'s position (R22 f2) — listed\n'
             f'in `GOOP_PROJECTOR_FALLBACK` = `{json.dumps(missing)}` (frame indices per anim).\n')
    L.append('## Anchors\n')
    L.append(f'Uniform strip cell **{geom[0]}×{geom[1]}**, body anchor column x={geom[2]}, floor row originY={geom[3]}; actionScale {ACTION_SCALE}.\n'
             '- `cell`: the artist\'s cell origin — x 125 from the cell\'s left edge (the stand pose\'s body centre in every row) and the\n'
             '  floor at y = min(183, cell height) (feet on the cell floor; taller cells keep extra room below for spikes/splash).\n'
             '- `body`: idle / walk / walk_back / run / dash. With the cell origin, idle→walk jumped ~10 source px (≈26 on screen), so these\n'
             '  rows use feet baseline + the row\'s mean upper-torso column: row means now agree within 0.5 px.\n'
             '- `puddle`: pure puddle frames (R16, R17 f1) anchor at the puddle\'s own centre on its bottom row.\n'
             '- `air`: R10 / R11 are drawn high in their cells → x 125, floor at the row\'s lowest body pixel.\n')
    L.append('## Every sheet frame → animation → move\n')
    L.append('| Row | n (brief) | cell | reads as | frame → animation |\n|---|---|---|---|---|')
    for r in range(1, 28):
        n = len(ROWS[r - 1]); c0 = ROWS[r - 1][0]
        hs = sorted({c[2] - c[0] for c in ROWS[r - 1]}); ws = sorted({c[3] - c[1] for c in ROWS[r - 1]})
        groups = []
        for f in range(1, n + 1):
            groups.append(f'f{f}: ' + ', '.join(sorted(set(by[(r, f)]))))
        # compress consecutive identical lists
        comp, prev, start = [], None, 1
        for f in range(1, n + 2):
            cur = ', '.join(sorted(set(by[(r, f)]))) if f <= n else None
            if cur != prev:
                if prev is not None: comp.append((f'f{start}' if start == f - 1 else f'f{start}–{f - 1}') + ' → ' + prev)
                prev, start = cur, f
        L.append(f"| R{r} | {n} ({INV[r]}) | {'/'.join(map(str, ws))}×{'/'.join(map(str, hs))} | {READS[r]} | {'; '.join(comp)} |")
    L.append('\n## Animation → move (exported strips `ben10_goop_<anim>_uniform.png`)\n')
    L.append('| animation | frames | source | used for | notes |\n|---|---|---|---|---|')
    for k, (segs, speed, loop, role) in A.items():
        src = ' + '.join(f"R{r} f{fr[0]}" + (f"–{fr[-1]}" if len(fr) > 1 else '') + (f' ({m})' if m != 'cell' else '') for r, fr, m in segs)
        L.append(f"| `{k}` | {anim[k]['frames']} | {src} | {MOVE[k]} | {role}{' · speed ' + str(speed) + (' loop' if loop else '')} |")
    L.append('\n## Reuse (no art invented)\n')
    L.append('- `dash` reuses the run strides (no dash row). `air` reuses R11 f4–7 (the sheet has no separate air attack). `lose` reuses\n'
             '  the R19 splat. `guard` reuses R27 f5–9 (straight standing). `taunt` = the R8 f8–12 arm-point hold.\n'
             '- `doubleJump` uses R23 f4–8 (rise / land poses; the engine has no generic land pose).\n'
             '- Ultimate: opener = Goo Lasso (R7); melt R13 f1–3; flood = R16 puddle (widened on screen by render-only tiling of the same\n'
             '  pixels); spike star R13 f4–11 + R6 f4–8; column R5 f4–16; wave R4 then `gpReform` (R17). Splat = R19 f4–13 + rise f22–31.\n'
             '- No pose missing for the brief\'s moves; nothing is drawn procedurally except the render-only overlays (Corrode drip tint,\n'
             '  flood tiling, goo overlay on the swallowed opponent), which reuse sheet pixels or flat tints.\n')
    L.append('## FX (real sheet pixels)\n')
    L.append('- `ben10_goop_fx_glob.png` (4 frames): detached goo drips cut from R13 f5, R11 f7, R12 f6, R10 f6 — the Acid Lob glob in flight.\n'
             '- `ben10_goop_fx_splash.png`: R16 f1 puddle without its projector — the Acid Lob floor splash.\n')
    L.append('\nContact sheet: `docs/ben10/aliens/goop/contact_sheet.png` (every exported frame; green = floor row, blue = body anchor,\n'
             'red box = recorded projector, "no proj" = fallback frame). Full geometry: `source_grid.json`.\n')
    open(os.path.join(DOC, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')

if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, proj, ledger, geom = build()
    fx = build_fx()
    # projector fallback for frames that draw none (R6 Spike Splash): the melted pose's projector (R22 f2), the
    # nearest equivalent frame — recorded explicitly so the sim never invents a position.
    melt = proj['crouch'][-1]
    fallback = {k: [p if p is not None else melt for p in v] for k, v in proj.items()}
    missing = {k: [i for i, p in enumerate(v) if p is None] for k, v in proj.items() if any(p is None for p in v)}
    with open(os.path.join(ROOT, 'goopAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_goop.py from the Goop cell-grid sheet. See docs/ben10/aliens/goop/SPRITE_LEDGER.md.\n')
        fh.write('// GOOP_ANIM: uniform strips (cell %dx%d, body anchor x=%d, floor row originY=%d). Frames are 1:1 copies of the\n' % geom)
        fh.write('// keyed sheet cells; on-screen size comes from actionScale.\n')
        fh.write('// GOOP_PROJECTOR[anim][frame] = the anti-gravity projector disc centre in SOURCE px relative to the anchor\n')
        fh.write('// (x right of body centre when facing right, y up is negative from the floor). Frames that draw no projector\n')
        fh.write('// (Spike Splash R6) carry the melted pose\'s position (R22 f2) — listed in GOOP_PROJECTOR_FALLBACK.\n')
        fh.write('export const GOOP_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const GOOP_PROJECTOR = ' + json.dumps(fallback) + '\n')
        fh.write('export const GOOP_PROJECTOR_FALLBACK = ' + json.dumps(missing) + '\n')
        fh.write('export const GOOP_FX = ' + json.dumps(fx, indent=2) + '\n')
        fh.write('export const GOOP_GEOM = ' + json.dumps(dict(cellW=geom[0], cellH=geom[1], centreX=geom[2], feetY=geom[3], actionScale=ACTION_SCALE)) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/goop.png', keys=dict(field=list(TEAL), cell=list(CYAN)),
                palette=[list(c) for c in PALETTE], rows=[[list(map(int, (c[1], c[0], c[3], c[2]))) for c in r] for r in ROWS],
                geom=dict(cellW=geom[0], cellH=geom[1], centreX=geom[2], feetY=geom[3], actionScale=ACTION_SCALE),
                ledger=ledger, projector_missing=missing, fx_globs=[[r, f, list(b)] for r, f, b in FX_GLOBS])
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)
    contact_sheet(anim, proj, geom)
    write_ledger(anim, ledger, missing, geom)
    print('anims', len(anim), 'cell', geom, 'frames placed', len(ledger), 'unique sheet frames 296', 'fx', list(fx))
    print('projector missing:', missing)
