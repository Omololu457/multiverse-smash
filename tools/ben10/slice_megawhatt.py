#!/usr/bin/env python3
"""Slice the Dragondor Megawhatt sheet into uniform game strips (Phase 1 of the Megawhatt alien).

  python3 -I tools/ben10/slice_megawhatt.py      # writes ben10_megawhatt_*.png, megawhattAssets.js, docs/ben10/aliens/megawhatt/*

Source: assets/sprites/ben10/aliens/megawhatt.png (555x382, "Megawhatt sprite sheet made by Dragondor").
Rules (see docs/ben10/aliens/megawhatt/SPRITE_LEDGER.md):
  * background = EXACT light blue (188,231,241), zero tolerance; asserted: no art pixel within 40 of it
  * 8-connected components; text labels (pure-black glyphs < 60 px) and the white credit box are removed
  * electricity touching him stays in his component (Attack -> streaks, Attack v starbursts); FREE-FLOATING bolts,
    spark balls and starbursts are exported as FX frames, never cropped
  * every label has TWO groups: CHARGED (yellow body, red eyes) and DRAINED (grey/white body, green eyes);
    each pair is verified by silhouette IoU and becomes the Voltage frame sets (CHARGED / DRAINED)
  * anchor = body centre (centroid of the dark outline pixels; he floats) placed at ONE consistent height above
    the feet line (the stand frames' own body-centre height), horizontal = body centre
  * nearest-neighbour only: frames are copied 1:1; on-screen size = native x4 (Ben spriteScale 2 x actionScale 2)
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/megawhatt.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/megawhatt')
BG = (188, 231, 241)
CELL_W, CELL_H = 128, 56
FEET_Y = 44                         # ground line = originY
CX = 64
ACTION_SCALE = 2.0                  # x Ben's spriteScale 2.0 = integer x4 -> ~72 px tall (human Ben ~108)

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
bg = np.all(im == BG, axis=2)
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not the light-blue key'
assert ((np.abs(im - BG).sum(axis=2) < 40) & ~bg).sum() == 0, 'palette collision with the key'

lab, n = ndimage.label(~bg, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    m = lab[s] == k + 1
    C[k + 1] = dict(id=k + 1, y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, n=int(m.sum()),
                    black=bool(np.all(im[s][m] == 0)))
TEXT = [c['id'] for c in C.values() if c['black'] and c['n'] < 60]
BOX = [c['id'] for c in C.values() if c['n'] > 10000]          # the white credit box (its lettering is inside it)
assert len(BOX) == 1

# ---- groups (component ids, left -> right, in sheet order). CHARGED = yellow body / red eyes; DRAINED = grey / green eyes
GROUPS = {
    'stand':  ([8, 12, 9, 6],            [10, 13, 11, 7]),
    'fly':    ([19, 23, 20, 17],         [21, 24, 22, 18]),
    'down':   ([36, 38, 34, 32, 40, 41], [37, 39, 35, 33, 42, 43]),   # "Attack v": figure, crouch, 2 starbursts, re-form
    'fwd':    ([51, 52],                 [53, 54]),                    # "Attack ->": figure + ground lightning streak
    'up':     ([70, 71, 72, 57, 58],     [73, 74, 75, 59, 60]),        # "Attack ^": charge-up x3, re-formed at the top x2
    'attack': ([83, 85, 86],             [84, 87, 88]),                # "Attack": wind-up, throw x2
}
FXG = {
    'spark':  ([89, 90], [91, 92]),      # free spark balls next to "Attack"
    'bolt':   ([61], [62]),              # free bolt column (+ ground impact) of "Attack ^"
    'star':   ([55], [56]),              # free starburst at the top of "Attack ^"
}
used = set(TEXT) | set(BOX)
for g in list(GROUPS.values()) + list(FXG.values()):
    for ids in g: used |= set(ids)
assert used == set(C), ('unassigned components', sorted(set(C) - used))

def crop(cid):
    c = C[cid]
    m = lab[c['y0']:c['y1'], c['x0']:c['x1']] == cid
    rgb = im[c['y0']:c['y1'], c['x0']:c['x1']]
    return np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8)

def iou(a, b):
    h, w = max(a.shape[0], b.shape[0]), max(a.shape[1], b.shape[1])
    pa = np.zeros((h, w), bool); pb = np.zeros((h, w), bool)
    pa[:a.shape[0], :a.shape[1]] = a[..., 3] > 0; pb[:b.shape[0], :b.shape[1]] = b[..., 3] > 0
    return (pa & pb).sum() / max(1, (pa | pb).sum())

PAIR_IOU = {}
for name, (ys, gs) in list(GROUPS.items()) + list(FXG.items()):
    assert len(ys) == len(gs), name
    PAIR_IOU[name] = [round(float(iou(crop(a), crop(b))), 3) for a, b in zip(ys, gs)]
    assert min(PAIR_IOU[name]) > 0.80, (name, PAIR_IOU[name])

DARK = {(0, 0, 0), (40, 40, 40)}
def body_centre(a):
    rgb, al = a[..., :3], a[..., 3] > 0
    dark = al & np.array([[tuple(int(v) for v in p) in DARK for p in row] for row in rgb])
    if dark.sum() < 10: dark = al                 # fully-glowing frames (no dark outline): silhouette centroid
    ys, xs = np.where(dark)
    return float(xs.mean()), float(ys.mean())

_s = crop(GROUPS['stand'][0][0]); _cx, _cy = body_centre(_s)
CENTRE_ABOVE_FEET = _s.shape[0] - _cy          # stand: body centre this many px above the feet

def place(a):
    cx, cy = body_centre(a)
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - cx)); oy = int(round(FEET_Y - CENTRE_ABOVE_FEET - cy))
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy and oy + a.shape[0] <= CELL_H, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)

# anim -> (group, [1-based frames], speed, loop, role)
A = {
  'idle':      ('stand',  [1, 2, 3, 4], 8, True,  'idle'),
  'walk':      ('fly',    [1, 2, 3, 4], 6, True,  'walk (he hovers: fly cycle)'),
  'run':       ('fly',    [1, 2, 3, 4], 4, True,  'run (fly cycle, faster)'),
  'dash':      ('fly',    [2, 3], 3, True,  'dash (fly)'),
  'jump':      ('fly',    [1, 2], 5, False, 'jump rise (fly)'),
  'fall':      ('fly',    [3, 4], 5, True,  'fall (fly)'),
  'crouch':    ('down',   [2], 6, False, 'crouch - REUSED Attack v f2 (small hunched figure; no crouch pose)'),
  'light':     ('attack', [1, 2], 2, False, 'JAB (Attack f1-2 + spark FX)'),
  'heavy':     ('attack', [1, 2, 3], 4, False, 'HEAVY (Attack + spark burst FX, 140 px)'),
  'down':      ('fwd',    [1], 4, False, 'LOW (Attack -> streak start, hits low)'),
  'up':        ('up',     [1, 2, 3], 3, False, 'LAUNCHER (Attack ^ charge-up + bolt FX)'),
  'air':       ('fly',    [1, 2], 3, False, 'AIR (fly + spark FX)'),
  'guard':     ('down',   [1], 6, False, 'block (Attack v f1 + small spark)'),
  'hurt':      ('stand',  [1], 6, False, 'hit - REUSED stand f1 (drained set in both tiers: no hurt pose)'),
  'knockdown': ('fly',    [4], 6, False, 'knockdown - REUSED fly f4 (drained set in both tiers: no knockdown pose)'),
  'getup':     ('stand',  [1, 2], 5, False, 'get-up - REUSED stand f1-2 (no get-up pose)'),
  'roll':      ('fly',    [1, 2, 3, 4], 3, True, 'roll - REUSED fly cycle'),
  'transform': ('stand',  [1, 2, 3, 4], 5, False, 'transform-in - REUSED stand'),
  'intro':     ('stand',  [1, 2, 3, 4], 8, True,  'intro - REUSED stand'),
  'win':       ('down',   [3, 4], 6, True, 'win - REUSED Attack v starburst (charged set in both tiers)'),
  'lose':      ('stand',  [1], 6, False, 'lose - REUSED stand f1 (drained set in both tiers)'),
  'taunt':     ('up',     [1, 2, 3], 6, False, 'taunt - REUSED Attack ^ charge-up'),
  'grab':      ('attack', [1, 2], 4, False, 'grab - REUSED jab'),
  'mwSparkBall': ('attack', [1, 2, 3], 3, False, 'SPARK BALL cast (Attack) + spark-ball FX projectile'),
  'mwLiveWire':  ('fwd',    [1, 2], 3, True, 'LIVE WIRE ground lightning streak (Attack ->)'),
  'mwThunder':   ('up',     [1, 2, 3, 4, 5], 4, False, 'THUNDER STRIKE call (Attack ^) + bolt / starburst FX at the marker'),
  'mwDischarge': ('down',   [1, 2, 3, 4, 5, 6], 3, False, 'DISCHARGE radial burst (Attack v)'),
  'mwDraw':      ('up',     [1, 2, 3], 4, True, 'GROUND DRAW (Attack ^ charge-up loop)'),
  'mwFly':       ('fly',    [1, 2, 3, 4], 3, True, 'FLIGHT hover-fly'),
  'mwUlt':       ('down',   [3, 4], 3, True, 'BLACKOUT final starburst (Attack v)'),
}
FORCE = {'hurt': 1, 'knockdown': 1, 'lose': 1, 'win': 0}   # tier-independent reuse: 0 = charged art, 1 = drained art

def build(tier, prefix):
    anim, ledger = {}, []
    for key, (g, nums, speed, loop, role) in A.items():
        t = FORCE.get(key, tier)
        cells = []
        for i in nums:
            cid = GROUPS[g][t][i - 1]
            cell, off = place(crop(cid))
            cells.append(cell)
            c = C[cid]
            ledger.append(dict(anim=key, group=g, set='charged' if t == 0 else 'drained', frame=i, component=cid,
                               src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']], offset=off, role=role))
        path = f'{prefix}{key}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger

def build_fx(name, tier, prefix):
    ids = FXG[name][tier]
    crops = [crop(i) for i in ids]
    fw = max(a.shape[1] for a in crops); fh = max(a.shape[0] for a in crops)
    cells = []
    for a in crops:
        cell = np.zeros((fh, fw, 4), np.uint8)
        oy, ox = (fh - a.shape[0]) // 2, (fw - a.shape[1]) // 2
        cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
        cells.append(cell)
    path = f'{prefix}fx_{name}.png'
    Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
    return dict(sheet='./' + path, frames=len(cells), w=fw, h=fh, speed=3)

if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    charged, led = build(0, 'ben10_megawhatt_')
    drained, led2 = build(1, 'ben10_megawhatt_drained_')
    fx = {n: build_fx(n, 0, 'ben10_megawhatt_') for n in FXG}
    fx.update({n + 'Drained': build_fx(n, 1, 'ben10_megawhatt_drained_') for n in FXG})
    with open(os.path.join(ROOT, 'megawhattAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_megawhatt.py from the Dragondor sheet. See docs/ben10/aliens/megawhatt/SPRITE_LEDGER.md.\n')
        fh.write('// MEGAWHATT_ANIM = CHARGED frame set (yellow); MEGAWHATT_DRAINED_ANIM = DRAINED frame set (grey). 1:1 frames,\n')
        fh.write('// on-screen size from actionScale (x Ben spriteScale = integer x4). FX = free-floating spark balls / bolt / starburst.\n')
        fh.write('export const MEGAWHATT_ANIM = ' + json.dumps(charged, indent=2) + '\n')
        fh.write('export const MEGAWHATT_DRAINED_ANIM = ' + json.dumps(drained, indent=2) + '\n')
        fh.write('export const MEGAWHATT_FX = ' + json.dumps(fx, indent=2) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/megawhatt.png', key=list(BG), cell=[CELL_W, CELL_H], feetY=FEET_Y,
                centreX=CX, centreAboveFeet=CENTRE_ABOVE_FEET, actionScale=ACTION_SCALE, groups=GROUPS, fx=FXG,
                pair_iou=PAIR_IOU, removed_text_components=len(TEXT), removed_box_components=len(BOX),
                ledger_charged=led, ledger_drained=led2)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    rows = [(k, 'ben10_megawhatt_' + k + '_uniform.png') for k in A] + \
           [('drained:' + k, 'ben10_megawhatt_drained_' + k + '_uniform.png') for k in A] + \
           [('fx ' + n, 'ben10_megawhatt_fx_' + n + '.png') for n in FXG] + \
           [('fx drained ' + n, 'ben10_megawhatt_drained_fx_' + n + '.png') for n in FXG]
    S = 3; LW = 130
    imgs = [(nm, Image.open(os.path.join(ROOT, p))) for nm, p in rows]
    cw = LW + max(i.width for _, i in imgs) * S + 10
    ch = sum(i.height * S + 6 for _, i in imgs) + 10
    sheet = Image.new('RGBA', (cw, ch), (40, 44, 52, 255)); d = ImageDraw.Draw(sheet); y = 5
    for nm, i in imgs:
        bw, bh = i.width * S, i.height * S
        chk = Image.new('RGBA', (bw, bh), (70, 74, 82, 255)); cd = ImageDraw.Draw(chk)
        for yy in range(0, bh, 9):
            for xx in range(0, bw, 9):
                if (xx // 9 + yy // 9) % 2: cd.rectangle([xx, yy, xx + 8, yy + 8], fill=(58, 62, 70, 255))
        if not nm.startswith('fx'):
            for f in range(i.width // CELL_W): cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
            cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    print('pairs IoU', PAIR_IOU)
    print('anims', len(charged), 'drained', len(drained), 'fx', len(fx), 'text removed', len(TEXT), 'box removed', len(BOX),
          'centreAboveFeet', round(CENTRE_ABOVE_FEET, 2))
