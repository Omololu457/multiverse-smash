#!/usr/bin/env python3
"""Slice the Dragonrod XLR8 sheet into uniform game strips (Phase 1 of the XLR8 alien).

  python3 -I tools/ben10/slice_xlr8.py      # writes ben10_xlr8_*.png, xlr8Assets.js, docs/ben10/aliens/xlr8/*

Source: assets/sprites/ben10/aliens/xlr8.png (367x469, "XLR8 sprite sheet made by Dragonrod").
Rules (see docs/ben10/aliens/xlr8/SPRITE_LEDGER.md):
  * background = EXACT beige (215,208,187), zero tolerance; asserted: no art pixel within 40 of it
  * 8-connected components; text labels (pure-black glyphs < 60 px) and the white credit box are removed
  * the blue/black striped speed bars are FX frames (diagonal bar of "attack ^", wide bar of "attack ->"); the
    second "attack ->" bar has XLR8 INSIDE it, so it is a BLUR body frame, not FX; the second diagonal of
    "attack ^" is not a bar at all but a diagonal DIVE pose (body frame)
  * anchor = feet baseline (bottom of the silhouette) + body mid-point horizontally (centroid of the frame's
    LOWER HALF silhouette: legs + torso, so neither the long tail nor the head crest drags it)
  * "attack ^" is a crouched CHARGE-UP (x4) that fires him off as a diagonal streak into a RISING diagonal pose;
    there is no downward dive pose, so Sonic Dive reuses the diagonal pose (documented, never invented)
  * nearest-neighbour only: frames are copied 1:1, never cropped (tails / claws asserted inside the cell);
    on-screen size = native x3 (Ben spriteScale 2 x actionScale 1.5, same as Heatblast)
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/xlr8.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/xlr8')
BG = (215, 208, 187)
CELL_W, CELL_H = 112, 56
FEET_Y = 52                         # ground line = originY
CX = 56
ACTION_SCALE = 1.5                  # x Ben's spriteScale 2.0 = integer x3 -> ~123 px tall incl. crest, ~150 px long

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
bg = np.all(im == BG, axis=2)
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not the beige key'
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

# ---- groups (component ids, left -> right, in sheet order) ----------------------------------------------------
GROUPS = {
    'stand':  [13, 12, 14, 15],
    'crouch': [16],
    'run':    [31, 32, 33, 34],
    'jump':   [30],
    'fall':   [29],
    'up':     [44, 45, 46, 47],          # "attack ^": crouched charge-up x4 (visor darkens to purple)
    'dive':   [43],                      # "attack ^" 6th: RISING diagonal launch pose (NOT a bar)
    'fwd':    [55, 56, 57],              # "attack ->": crouch-lunge, stretch, full dash slash
    'blur':   [59],                      # "attack ->" last: XLR8 INSIDE the striped bar = blur frame
    'down':   [67, 68, 70, 71, 69],      # "attack v": tail sweep
    'attack': [78, 79, 80, 81, 82, 83],  # "attack": claws (sheet has 6, not 7)
}
FXG = {
    'streakDiag': [42],                  # "attack ^" 5th: diagonal blue/black speed bar (no body inside)
    'streakBar':  [58],                  # "attack ->" 4th: wide speed bar (no body inside)
}
used = set(TEXT) | set(BOX)
for ids in list(GROUPS.values()) + list(FXG.values()): used |= set(ids)
assert used == set(C), ('unassigned components', sorted(set(C) - used))

def crop(cid):
    c = C[cid]
    m = lab[c['y0']:c['y1'], c['x0']:c['x1']] == cid
    rgb = im[c['y0']:c['y1'], c['x0']:c['x1']]
    return np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8)

def body_mid_x(a):
    al = a[..., 3] > 0
    lower = al[al.shape[0] // 2:]                 # legs + torso: the long tail / head crest do not drag the anchor
    ys, xs = np.where(lower if lower.sum() >= 10 else al)
    return float(xs.mean())

def place(a):
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - body_mid_x(a))); oy = FEET_Y - a.shape[0]
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)

# anim -> ([(group, 1-based frame)], speed, loop, role)
def g(name, *nums): return [(name, i) for i in nums]
A = {
  'idle':      (g('stand', 1, 2, 3, 4), 8, True,  'idle (stand loop)'),
  'walk':      (g('run', 1, 2, 3, 4), 7, True,  'walk (run cycle, slowed)'),
  'run':       (g('run', 1, 2, 3, 4), 3, True,  'run'),
  'dash':      (g('run', 2, 3), 2, True,  'dash (run)'),
  'jump':      (g('jump', 1), 6, False, 'jump rise'),
  'fall':      (g('fall', 1), 6, True,  'jump fall'),
  'crouch':    (g('crouch', 1), 6, False, 'crouch'),
  'guard':     (g('crouch', 1), 6, False, 'block - crouch frame'),
  'light':     (g('attack', 1, 2, 3), 2, False, 'JAB (attack f1-3)'),
  'heavy':     (g('attack', 4, 5, 6), 4, False, 'HEAVY claw slash (attack f4-6, 150 px)'),
  'down':      (g('crouch', 1) + g('down', 3), 3, False, 'LOW (crouch -> attack v f3 tail sweep, hits low)'),
  'up':        (g('up', 3, 4) + g('dive', 1), 3, False, 'LAUNCHER (attack ^ charge f3-4 -> rising diagonal slash)'),
  'air':       (g('fall', 1) + g('attack', 2), 3, False, 'AIR (fall frame + claw)'),
  'hurt':      (g('fall', 1), 6, False, 'hit stun - REUSED fall (no hurt pose)'),
  'knockdown': (g('fall', 1), 6, False, 'knockdown - REUSED fall (no knockdown pose)'),
  'getup':     (g('crouch', 1) + g('stand', 1), 5, False, 'get-up - REUSED crouch -> stand (no get-up pose)'),
  'dizzy':     (g('stand', 1, 2), 10, True, 'dizzy - REUSED stand (no dizzy pose)'),
  'roll':      (g('run', 1, 2, 3, 4), 2, True, 'roll - REUSED run cycle'),
  'transform': (g('stand', 1, 2, 3, 4), 5, False, 'transform-in - REUSED stand'),
  'intro':     (g('stand', 1, 2, 3, 4), 8, True, 'intro - REUSED stand'),
  'win':       (g('stand', 1, 2, 3, 4), 8, True, 'win - REUSED stand (no win pose)'),
  'lose':      (g('crouch', 1), 6, False, 'lose - REUSED crouch (no lose pose)'),
  'taunt':     (g('up', 1, 2), 6, False, 'taunt - REUSED attack ^ f1-2'),
  'grab':      (g('attack', 1, 2), 4, False, 'grab - REUSED jab'),
  'xlSonicSlash': (g('fwd', 1, 2, 3) + g('blur', 1), 3, False, 'SONIC SLASH dash slash (attack ->) + blur frame'),
  'xlBlurOut':    (g('fwd', 3) + g('blur', 1), 3, False, 'BLUR STEP vanish (attack -> f3 + blur)'),
  'xlBlurIn':     (g('blur', 1) + g('fwd', 1), 3, False, 'BLUR STEP reappear (blur + attack -> f1)'),
  'xlTailWhip':   (g('down', 1, 2, 3, 4, 5), 3, False, 'TAIL WHIP spinning low tail sweep (attack v)'),
  'xlCyclone':    (g('up', 1, 2) + g('run', 1, 2, 3, 4), 2, True, 'MACH CYCLONE tight circle (attack ^ charge + run; afterimages render-only)'),
  'xlDive':       (g('dive', 1), 4, False, 'SONIC DIVE - REUSED attack ^ diagonal pose (sheet has no downward dive)'),
  'xlUltCircle':  (g('run', 1, 2, 3, 4), 2, True, 'TIME SPRINT circling slashes (run)'),
  'xlUltLaunch':  (g('up', 1, 2, 3, 4) + g('dive', 1), 3, False, 'TIME SPRINT launch (attack ^ charge -> rising diagonal)'),
  'xlUltDrop':    (g('down', 1, 2, 3, 4, 5), 3, False, 'TIME SPRINT sonic-boom drop (attack v)'),
}

def build(prefix):
    anim, ledger = {}, []
    for key, (frames, speed, loop, role) in A.items():
        cells = []
        for grp, i in frames:
            cid = GROUPS[grp][i - 1]
            cell, off = place(crop(cid)); cells.append(cell)
            c = C[cid]
            ledger.append(dict(anim=key, group=grp, frame=i, component=cid, src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']],
                               offset=off, role=role))
        path = f'{prefix}{key}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger

def build_fx(name, prefix):
    a = crop(FXG[name][0])
    path = f'{prefix}fx_{name}.png'
    Image.fromarray(a, 'RGBA').save(os.path.join(ROOT, path))
    return dict(sheet='./' + path, frames=1, w=int(a.shape[1]), h=int(a.shape[0]), speed=3)

if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build('ben10_xlr8_')
    fx = {n: build_fx(n, 'ben10_xlr8_') for n in FXG}
    with open(os.path.join(ROOT, 'xlr8Assets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_xlr8.py from the Dragonrod sheet. See docs/ben10/aliens/xlr8/SPRITE_LEDGER.md.\n')
        fh.write('// 1:1 frames, on-screen size from actionScale (x Ben spriteScale = integer x3). FX = the two striped speed bars.\n')
        fh.write('export const XLR8_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const XLR8_FX = ' + json.dumps(fx, indent=2) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/xlr8.png', key=list(BG), cell=[CELL_W, CELL_H], feetY=FEET_Y,
                centreX=CX, actionScale=ACTION_SCALE, groups=GROUPS, fx=FXG,
                removed_text_components=len(TEXT), removed_box_components=len(BOX), ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    rows = [(k, 'ben10_xlr8_' + k + '_uniform.png') for k in A] + [('fx ' + n, 'ben10_xlr8_fx_' + n + '.png') for n in FXG]
    S = 3; LW = 120
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
            for f in range(i.width // CELL_W):
                cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
                cd.line([((f * CELL_W + CX) * S, 0), ((f * CELL_W + CX) * S, bh)], fill=(200, 80, 80, 255))
            cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    print('anims', len(anim), 'fx', len(fx), 'text removed', len(TEXT), 'box removed', len(BOX))
