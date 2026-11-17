#!/usr/bin/env python3
"""Slice the Dragonrod Heatblast sheet into uniform game strips (Phase 1 of the Heatblast alien).

  python3 -I tools/ben10/slice_heatblast.py            # writes ben10_heatblast_*.png + docs/ben10/aliens/heatblast/*

Source: assets/sprites/ben10/aliens/heatblast.png  (825x740, "Heatblast sprite sheet made by Dragonrod").
Rules (see docs/ben10/aliens/heatblast/SPRITE_LEDGER.md):
  * background = EXACT sage (154,184,126), zero tolerance (no other pixel within 40 of it -> no palette collision)
  * 8-connected components; text labels (pure-black glyph components) and the white credit box are removed;
    the small blue "alt pal" figure is SAMPLED for the Blue Flame palette, never used as a frame
  * flames / trails touching the body stay in that component; attack-2's detached trail specks are attached to
    the frame they sit next to; the 4 loose fireballs next to "attack 1" are exported as FX frames
  * anchors: feet baseline (ground poses) / body-centre (flight poses), horizontal = body centre (body colours only,
    not flames). Nearest-neighbour only: frames are copied 1:1, never resampled (on-screen size comes from actionScale)
  * every label has 2 rows; row 2 = row 1 minus the chest Omnitrix badge (5-12 px differ) -> near-duplicate ->
    row 2 is the BLUE FLAME base (palette-swapped with the sampled alt-pal colours)
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/heatblast.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/heatblast')
BG = (154, 184, 126)
CELL_W, CELL_H = 112, 80          # native cell; every strip uses it (18 px under the feet for flight flames)
FEET_Y = 62                        # baseline row = originY (the engine plants this row on the floor)
CX = 56                            # body-centre column

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
bg = np.all(im == BG, axis=2)
near = (np.abs(im - BG).sum(axis=2) < 40) & ~bg
assert near.sum() == 0, 'palette collision with the sage key'
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not the sage key'

lab, n = ndimage.label(~bg, structure=np.ones((3, 3)))
objs = ndimage.find_objects(lab)
comps = []
for k, s in enumerate(objs):
    m = lab[s] == k + 1
    comps.append(dict(id=k + 1, y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, n=int(m.sum()),
                      black=bool(np.all(im[s][m] == 0))))

BOX = (260, 486, 365, 820)         # white credit box (y0,x0,y1,x1) incl. the alt-pal figure
def in_box(c): return c['y0'] >= BOX[0] and c['y1'] <= BOX[2] and c['x0'] >= BOX[1] and c['x1'] <= BOX[3]
text = [c for c in comps if c['black'] and c['n'] < 60]
box = [c for c in comps if in_box(c)]
art = [c for c in comps if c not in text and c not in box]
big = [c for c in art if c['n'] >= 300]
small = [c for c in art if c['n'] < 300]

# ---- grid: label -> (row1 y band, row2 y band, x band) ------------------------------------------------
GRID = [('stand', (38, 45), (91, 95), (0, 200)), ('jump', (42, 52), (91, 99), (200, 420)),
        ('fall', (42, 52), (91, 99), (420, 600)), ('crouch', (42, 52), (91, 99), (600, 800)),
        ('walkrun', (147, 152), (199, 204), (0, 300)), ('attack1', (273, 278), (330, 335), (0, 240)),
        ('attack2', (414, 421), (450, 457), (0, 270)), ('attack3', (501, 511), (560, 570), (0, 310)),
        ('attack4', (629, 636), (682, 689), (0, 240))]
frames = {}   # (label,row) -> list of comps (sorted by x)
for name, r1, r2, xr in GRID:
    for row, band in ((1, r1), (2, r2)):
        frames[(name, row)] = sorted([c for c in big if band[0] <= c['y0'] <= band[1] and xr[0] <= c['x0'] < xr[1]],
                                     key=lambda c: c['x0'])
FX = sorted([c for c in small if 315 <= c['y0'] <= 320 and 250 <= c['x0'] <= 310], key=lambda c: c['x0'])
assert len(FX) == 4, FX
# attach every other small art speck (attack-2 trail lines) to the nearest frame on its right in the same row
attached = {}
for c in small:
    if c in FX: continue
    # gap to a frame that starts at/after the speck (trails sit BEHIND a right-facing body), 0 if they overlap
    cands = [(max(0, f['x0'] - c['x1']), f['id']) for rows in frames.values() for f in rows
             if f['y0'] - 8 <= c['y0'] <= f['y1'] and c['x0'] < f['x1'] and f['x1'] > c['x1']]
    assert cands, ('orphan art speck', c)
    attached.setdefault(min(cands)[1], []).append(c['id'])
assert sum(len(v) for v in attached.values()) == len(small) - 4

used = set()
for rows in frames.values():
    for f in rows: used.add(f['id'])
assert len(used) == len(big), (len(used), len(big))

BODY = {(26, 26, 26), (17, 18, 20), (136, 0, 21), (237, 28, 36), (41, 41, 41)}
def frame_rgba(c):
    ids = [c['id']] + attached.get(c['id'], [])
    ys, xs = np.where(np.isin(lab, ids))
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    m = np.isin(lab[y0:y1, x0:x1], ids)
    rgb = im[y0:y1, x0:x1]
    a = np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8)
    body = m & np.array([[tuple(p) in BODY for p in row] for row in rgb])
    by, bx = np.where(body)
    return a, (float(bx.mean()), float(by.mean())), (x0, y0, x1, y1)

# ---- Blue Flame palette: alt-pal figure == stand row-2 f1 mirrored (IoU 0.996) -> 1:1 colour map -------------
BLUE = {(255, 233, 67): (0, 162, 232), (255, 201, 14): (63, 72, 204), (255, 255, 243): (153, 217, 234),
        (26, 26, 26): (97, 97, 97), (136, 0, 21): (77, 0, 204), (237, 28, 36): (5, 113, 231),
        (190, 190, 180): (153, 217, 234), (17, 18, 20): (97, 97, 97)}
def verify_blue():
    alt = im[311:353, 766:818]; am = ~np.all(alt == 255, axis=2)
    ref = [c for c in frames[('stand', 2)]][0]
    a, _, _ = frame_rgba(ref); a = a[:, ::-1]
    hits = tot = 0
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x, 3] and y < alt.shape[0] and x < alt.shape[1] and am[y, x]:
                tot += 1; hits += BLUE.get(tuple(int(v) for v in a[y, x, :3])) == tuple(int(v) for v in alt[y, x])
    return hits, tot
SOURCE_COLOURS = sorted({tuple(int(v) for v in p) for c in big + small for p in im[lab == c['id']]})
def blue_of(rgb):
    if rgb in BLUE: return BLUE[rgb]
    if rgb == (0, 0, 0): return rgb
    # FX oranges / reds not on the alt figure -> the mapped source colour nearest in RGB
    k = min(BLUE, key=lambda s: sum((a - b) ** 2 for a, b in zip(s, rgb)))
    return BLUE[k]
BLUE_FULL = {c: blue_of(c) for c in SOURCE_COLOURS}
def to_blue(a):
    b = a.copy()
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x, 3]: b[y, x, :3] = BLUE_FULL[tuple(int(v) for v in a[y, x, :3])]
    return b

# stand body-centre height above the feet (used to place flight poses so idle->flight never jumps vertically)
_s, _c, _bb = frame_rgba(frames[('stand', 1)][0])
STAND_BODY_ABOVE_FEET = (_bb[3] - _bb[1]) - _c[1]

def place(a, centre, mode):
    """Paste frame `a` into a CELL: horizontal body centre -> CX; feet -> FEET_Y (ground) or body centre at
    the stand's body height (flight). Returns the cell + the paste offset; asserts nothing is cropped."""
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - centre[0]))
    oy = FEET_Y - a.shape[0] if mode == 'feet' else int(round(FEET_Y - STAND_BODY_ABOVE_FEET - centre[1]))
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy and oy + a.shape[0] <= CELL_H, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)

# ---- animation table: anim -> (label, [frame numbers 1-based], anchor mode, speed, loop, role note) --------------
A = {
  'idle':      ('stand',   [1, 2, 3, 4], 'feet', 8, True,  'idle'),
  'walk':      ('walkrun', [1, 2, 3, 4, 5, 6], 'feet', 7, True,  'walk'),
  'run':       ('walkrun', [1, 2, 3, 4, 5, 6], 'feet', 4, True,  'run (same 6-frame cycle, faster; row 2 is a duplicate)'),
  'dash':      ('walkrun', [2, 5], 'feet', 3, True,  'dash'),
  'jump':      ('jump',    [1, 2, 3, 4], 'feet', 4, False, 'jump_rise'),
  'fall':      ('fall',    [1, 2, 3, 4], 'feet', 5, True,  'jump_fall'),
  'crouch':    ('crouch',  [1, 2, 3, 4], 'feet', 6, False, 'crouch'),
  'light':     ('attack1', [1, 2], 'feet', 3, False, 'JAB (flame palm)'),
  'heavy':     ('attack1', [1, 2, 3, 4], 'feet', 4, False, 'HEAVY (full flame throw)'),
  'down':      ('crouch',  [3, 4], 'feet', 4, False, 'LOW (crouch flame lick)'),
  'up':        ('attack3', [1, 2, 3], 'feet', 4, False, 'LAUNCHER (upward flare)'),
  'air':       ('fall',    [2, 3], 'feet', 4, False, 'AIR (fall frames + forward burst FX)'),
  'down_air':  ('attack4', [1, 2, 3, 4], 'centre', 3, True, 'DOWN-AIR dive'),
  'guard':     ('crouch',  [1, 2], 'feet', 6, False, 'block (crouch f1-2)'),
  'hurt':      ('fall',    [1], 'feet', 6, False, 'hit stun - REUSED fall f1 (no hurt pose on sheet)'),
  'knockdown': ('crouch',  [4], 'feet', 6, False, 'knockdown - REUSED crouch f4 (no knockdown pose on sheet)'),
  'getup':     ('crouch',  [4, 3, 2, 1], 'feet', 5, False, 'get-up - REUSED crouch f4->f1 (no get-up pose on sheet)'),
  'roll':      ('crouch',  [1, 2, 3, 4], 'feet', 3, True, 'roll - REUSED crouch cycle'),
  'transform': ('stand',   [1, 2, 3, 4], 'feet', 5, False, 'transform-in - REUSED stand'),
  'intro':     ('stand',   [1, 2, 3, 4], 'feet', 8, True,  'intro - REUSED stand'),
  'win':       ('attack3', [4, 5, 6], 'feet', 6, False, 'win - REUSED star burst'),
  'lose':      ('crouch',  [4], 'feet', 6, False, 'lose - REUSED crouch f4'),
  'taunt':     ('attack1', [1], 'feet', 8, False, 'taunt - REUSED attack1 f1 (fireball in palm)'),
  'grab':      ('attack1', [1, 2], 'feet', 4, False, 'grab - REUSED jab'),
  'hbFireball':('attack1', [1, 2, 3, 4], 'feet', 3, False, 'FIREBALL cast body'),
  'hbRocket':  ('attack2', [1, 2, 3, 4], 'centre', 3, True, 'FIRE ROCKET flame-propelled tackle'),
  'hbSupernova':('attack3', [1, 2, 3, 4, 5, 6], 'feet', 4, False, 'SUPERNOVA flare-up to star burst'),
  'hbFlight':  ('attack4', [1, 2, 3, 4], 'centre', 3, True, 'BLAZE FLIGHT diagonal flame jet'),
  'hbAbsorb':  ('crouch',  [1, 2], 'feet', 4, False, 'HEAT ABSORB stance - REUSED guard'),
  'hbUltRise': ('attack4', [1, 2, 3, 4], 'centre', 3, True, 'ULT rocket up'),
  'hbUltSun':  ('attack3', [4, 5, 6], 'feet', 4, True, 'ULT mini-sun at the apex'),
  'hbUltDive': ('attack4', [1, 2, 3, 4], 'centre', 2, True, 'ULT meteor dive'),
}
ACTION_SCALE = 1.5   # 44 px native body -> ~132 px on screen with Ben's spriteScale 2.0 (Swampfire ~124)

def build(row, outdir, prefix, palette=None):
    anim, ledger = {}, []
    for key, (label, nums, mode, speed, loop, role) in A.items():
        cells = []
        for i in nums:
            c = frames[(label, row)][i - 1]
            a, centre, bb = frame_rgba(c)
            if palette: a = palette(a)
            cell, off = place(a, centre, mode)
            cells.append(cell)
            ledger.append(dict(anim=key, label=label, row=row, frame=i, src_bbox=list(map(int, bb)), anchor=mode, offset=off))
        strip = np.concatenate(cells, axis=1)
        path = f'{prefix}{key}_uniform.png'
        Image.fromarray(strip, 'RGBA').save(os.path.join(outdir, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed,
                         anchorY=0, loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger

def build_fx(prefix, palette=None):
    cells = []
    fw = max(c['x1'] - c['x0'] for c in FX); fh = max(c['y1'] - c['y0'] for c in FX)
    for c in FX:
        m = lab[c['y0']:c['y1'], c['x0']:c['x1']] == c['id']
        rgb = im[c['y0']:c['y1'], c['x0']:c['x1']]
        a = np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8)
        if palette: a = palette(a)
        cell = np.zeros((fh, fw, 4), np.uint8)
        oy, ox = (fh - a.shape[0]) // 2, (fw - a.shape[1]) // 2
        cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
        cells.append(cell)
    path = f'{prefix}fx_fireball.png'
    Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
    return dict(sheet='./' + path, frames=4, w=fw, h=fh, speed=3)

if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    hits, tot = verify_blue()
    print(f'alt-pal check: {hits}/{tot} overlapping pixels match the BLUE map')
    assert tot > 400 and hits / tot > 0.97
    anim, led = build(1, ROOT, 'ben10_heatblast_')
    blue, led2 = build(2, ROOT, 'ben10_heatblast_blue_', to_blue)
    fx = build_fx('ben10_heatblast_'); fxb = build_fx('ben10_heatblast_blue_', to_blue)
    with open(os.path.join(ROOT, 'heatblastAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_heatblast.py from the Dragonrod sheet. See docs/ben10/aliens/heatblast/SPRITE_LEDGER.md.\n')
        fh.write('// HEATBLAST_ANIM = row-1 frames; HEATBLAST_BLUE_ANIM = row-2 (badge-less) frames palette-swapped to the sheet\'s\n')
        fh.write('// alt-pal colours (render-only Blue Flame look). Frames are 1:1 copies; on-screen size comes from actionScale.\n')
        fh.write('export const HEATBLAST_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const HEATBLAST_BLUE_ANIM = ' + json.dumps(blue, indent=2) + '\n')
        fh.write('export const HEATBLAST_FX = ' + json.dumps({'fireball': fx, 'fireballBlue': fxb}, indent=2) + '\n')
        fh.write('export const HEATBLAST_BLUE_PALETTE = ' + json.dumps({'%d,%d,%d' % k: list(v) for k, v in BLUE.items()}) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/heatblast.png', key=list(BG), cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX,
                actionScale=ACTION_SCALE, frames={f'{k[0]}_r{k[1]}': [[c['x0'], c['y0'], c['x1'], c['y1']] for c in v] for k, v in frames.items()},
                fx=[[c['x0'], c['y0'], c['x1'], c['y1']] for c in FX], attached_specks={str(k): v for k, v in attached.items()},
                removed_text_components=len(text), removed_box_components=len(box), ledger=led, ledger_blue=led2,
                blue_map={'%d,%d,%d' % k: list(v) for k, v in BLUE_FULL.items()})
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every exported strip, labelled (labels are documentation, not art), on a checker
    rows = [(k, os.path.join(ROOT, 'ben10_heatblast_' + k + '_uniform.png')) for k in A] + \
           [('blue:' + k, os.path.join(ROOT, 'ben10_heatblast_blue_' + k + '_uniform.png')) for k in ('idle', 'hbFireball', 'hbRocket', 'hbSupernova', 'hbFlight')] + \
           [('fx fireball', os.path.join(ROOT, 'ben10_heatblast_fx_fireball.png')), ('fx fireball blue', os.path.join(ROOT, 'ben10_heatblast_blue_fx_fireball.png'))]
    S = 2; LW = 120
    imgs = [(n, Image.open(p)) for n, p in rows]
    cw = LW + max(i.width for _, i in imgs) * S + 10
    ch = sum(i.height * S + 6 for _, i in imgs) + 10
    sheet = Image.new('RGBA', (cw, ch), (40, 44, 52, 255))
    d = ImageDraw.Draw(sheet); y = 5
    for n, i in imgs:
        bw, bh = i.width * S, i.height * S
        chk = Image.new('RGBA', (bw, bh), (70, 74, 82, 255)); cd = ImageDraw.Draw(chk)
        for yy in range(0, bh, 8):
            for xx in range(0, bw, 8):
                if (xx // 8 + yy // 8) % 2: cd.rectangle([xx, yy, xx + 7, yy + 7], fill=(58, 62, 70, 255))
        if not n.startswith('fx'):
            for f in range(i.width // CELL_W):
                cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
            cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), n, fill=(230, 230, 230, 255))
        y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    print('anims', len(anim), 'blue', len(blue), 'text comps removed', len(text), 'box comps removed', len(box),
          'specks attached', sum(len(v) for v in attached.values()), 'frames', len(big))
