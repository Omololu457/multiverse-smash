#!/usr/bin/env python3
"""Slice the Dragonrod WILDVINE (Florauna) sheet into uniform game strips (Phase 1 of the Wildvine alien).

  python3 -I tools/ben10/slice_wildvine.py   # writes ben10_wildvine_*.png, wildvineAssets.js, docs/ben10/aliens/wildvine/*

Source: assets/sprites/ben10/aliens/wildvine.png (629x539, "Wildvine sprite sheet made by Dragonrod / Please, give credits
if used!"), copied byte-identical from the owner's download wildvine_sprite_sheet_by_dragonrod342_d829hfh.png (found by
contact sheet: dark-green plant alien, tentacle legs, grey background, the labels stand / walk / jump/fall/crouch /
attack / attack -> / attack v / attack ^, the LOOP bracket and the white credit box; NOT swampfire.png).
Rules (see docs/ben10/aliens/wildvine/SPRITE_LEDGER.md):
  * background = EXACT grey (195,195,195) (#C3C3C3), zero tolerance; all four corners asserted. Palette collision check:
    no art pixel within 40 (sum of |dRGB|) of the key -- his nearest colours are the thorn-base greys (127,127,127) and
    (89,89,89), 204+ away. Dark green (15,74,33) / mid green (22,114,50) / light green (34,177,76) / lime (181,230,29) /
    blue (0,162,232) / light blue (153,217,234) / yellow (255,201,14) / black (0,0,0) / seed grey (40,40,40): no collision.
  * 8-connected components. EXCLUDED (not art): every label glyph (pure-black components < 60 px, incl. the arrows), the
    white credit box (with its lettering inside it), the "LOOP" glyphs and the LOOP bracket line (one pure-black
    component, 130 x 6 px). Every component is assigned explicitly (asserted: nothing unassigned).
  * Free-floating pieces are FX frames: the 4 black seed dots (attack row), the 6 thorns (attack v row) and the blue
    spark over attack ^ f3. Pieces touching a body (the yellow sparkle on attack ^ f2, the planting dust in the LOOP
    frames, the vine arms of attack ->) stay in that body frame.
  * anchor = feet baseline (bottom row of the body) + body centre horizontally = the centroid of the frame's BOTTOM 40 %
    (his stance: the tentacle-leg base), so neither a stretched vine arm, a raised arm nor a tentacle tip drags it.
  * nearest-neighbour only: frames are copied 1:1, never cropped (vine tips / spikes / limbs asserted inside the cell);
    on-screen size = Ben spriteScale 2.0 x actionScale 1.5 (native x3, the same as the Dragonrod Heatblast / XLR8 sheets).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/wildvine.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/wildvine')
BG = (195, 195, 195)
CELL_W, CELL_H = 184, 80
CX = 92                             # body centre = cell centre (the engine centres the cell on the fighter); +-92 holds the 91 px vine reach
FEET_Y = 76                         # ground line = originY
ACTION_SCALE = 1.5
PREFIX = 'ben10_wildvine_'

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
bg = np.all(im == BG, axis=2)
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not the grey key'
NEAREST = int((np.abs(im - BG).sum(axis=2)[~bg]).min())
assert NEAREST >= 40, ('palette collision with the key', NEAREST)

lab, n = ndimage.label(~bg, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    m = lab[s] == k + 1
    px = im[s][m]
    C[k + 1] = dict(id=k + 1, y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, n=int(m.sum()),
                    black=bool(np.all(px == 0)))
TEXT = sorted(c['id'] for c in C.values() if c['black'] and c['n'] < 60)
BOX = [c['id'] for c in C.values() if c['n'] > 10000]                     # the white credit box (lettering inside it)
BRACKET = [c['id'] for c in C.values() if c['black'] and c['n'] >= 60 and (c['x1'] - c['x0']) > 100 and (c['y1'] - c['y0']) < 10]
assert len(BOX) == 1 and len(BRACKET) == 1, (BOX, BRACKET)


def comps_in_row(y0, y1, pred=lambda c: True):
    """non-excluded components whose vertical span starts in [y0, y1), left -> right"""
    ex = set(TEXT) | set(BOX) | set(BRACKET)
    return [c['id'] for c in sorted(C.values(), key=lambda c: c['x0']) if y0 <= c['y0'] < y1 and c['id'] not in ex and pred(c)]


big = lambda c: c['n'] >= 600
seed = lambda c: c['n'] < 80 and (c['y1'] - c['y0']) <= 10 and (c['x1'] - c['x0']) <= 10
GROUPS = {
    'stand':  comps_in_row(0, 60, big),
    'walk':   comps_in_row(60, 130, big),
    'jfc':    comps_in_row(130, 220, big),           # jump / fall / crouch
    'attack': comps_in_row(220, 300, big),
    'fwd':    comps_in_row(300, 380, big),           # attack ->
    'down':   comps_in_row(395, 450, big),           # attack v: 2 cast poses, crouch, 4-frame LOOP
    'up':     comps_in_row(450, 539, big),           # attack ^
}
FXG = {
    'seed':  comps_in_row(220, 300, seed),           # the 4 black seed dots
    'thorn': comps_in_row(390, 450, lambda c: not big(c)),
    'spark': comps_in_row(450, 539, lambda c: not big(c)),
}
# thorn growth stages = the 6 thorns sorted small -> tall (the sheet shows the 49 px thorn FIRST, then the 5 growing ones)
THORN_SHEET_ORDER = list(FXG['thorn'])
FXG['thorn'] = sorted(FXG['thorn'], key=lambda i: (C[i]['y1'] - C[i]['y0'], C[i]['x0']))
EXPECT = dict(stand=4, walk=4, jfc=3, attack=5, fwd=5, down=7, up=4)
for g, k in EXPECT.items(): assert len(GROUPS[g]) == k, (g, GROUPS[g])
assert len(FXG['seed']) == 4 and len(FXG['thorn']) == 6 and len(FXG['spark']) == 1, FXG
used = set(TEXT) | set(BOX) | set(BRACKET)
for ids in list(GROUPS.values()) + list(FXG.values()): used |= set(ids)
assert used == set(C), ('unassigned components', sorted(set(C) - used))


def crop(cid):
    c = C[cid]
    m = lab[c['y0']:c['y1'], c['x0']:c['x1']] == cid
    rgb = im[c['y0']:c['y1'], c['x0']:c['x1']]
    return np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8)


def body_mid_x(a):
    al = a[..., 3] > 0
    lower = al[int(al.shape[0] * 0.6):]               # bottom 40 %: the tentacle-leg base (no vine arm / raised arm)
    ys, xs = np.where(lower if lower.sum() >= 10 else al)
    return float(xs.mean())


def place(a):
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - body_mid_x(a))); oy = FEET_Y - a.shape[0]
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)


def g(name, *nums): return [(name, i) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':       (g('stand', 1, 2, 3, 4), 9, True,  'idle (stand loop)'),
  'walk':       (g('walk', 1, 2, 3, 4), 8, True,  'walk'),
  'walk_back':  (g('walk', 4, 3, 2, 1), 8, True,  'walk back (walk REVERSED)'),
  'run':        (g('walk', 1, 2, 3, 4), 4, True,  'run (walk cycle played 2x faster - no run art)'),
  'dash':       (g('walk', 2, 3), 3, True,  'dash (walk f2-3, fast)'),
  'jump':       (g('jfc', 1), 6, False, 'jump rise (jump/fall/crouch f1)'),
  'doubleJump': (g('jfc', 1), 6, False, 'double jump - REUSED jump rise'),
  'fall':       (g('jfc', 2), 6, True,  'jump fall (jump/fall/crouch f2)'),
  'crouch':     (g('jfc', 3), 6, False, 'crouch (jump/fall/crouch f3)'),
  'guard':      (g('jfc', 3), 6, False, 'block - REUSED crouch'),
  'blockHit':   (g('jfc', 3), 6, False, 'block hit - REUSED crouch'),
  'light':      (g('attack', 1, 2), 3, False, 'JAB (attack f1-2)'),
  'heavy':      (g('attack', 3, 4, 5), 4, False, 'HEAVY (attack f3-5, right-reaching arm 170 px)'),
  'down':       (g('jfc', 3) + g('down', 2), 3, False, 'LOW (crouch -> attack v f2 low vine arms, hits low)'),
  'up':         (g('up', 1, 2, 3), 3, False, 'LAUNCHER (attack ^ f1-3, rising growth)'),
  'air':        (g('jfc', 2), 6, False, 'AIR (fall frame - the sheet has no air attack pose)'),
  'hurt':       (g('jfc', 2), 6, False, 'hit light/heavy - REUSED fall (no hurt pose)'),
  'hurt_air':   (g('jfc', 2), 6, False, 'hit in the air - REUSED fall'),
  'knockdown':  (g('jfc', 2), 6, False, 'knockdown - REUSED fall (no knockdown pose)'),
  'getup':      (g('jfc', 3) + g('stand', 1), 6, False, 'get-up - REUSED crouch -> stand'),
  'dizzy':      (g('stand', 1, 2), 12, True, 'dizzy - REUSED stand f1-2 (no dizzy pose)'),
  'transform':  (g('stand', 1, 2, 3, 4), 5, False, 'transform-in - REUSED stand'),
  'taunt':      (g('down', 1), 8, False, 'taunt - REUSED attack v f1 (arms spread)'),
  'win':        (g('stand', 1, 2, 3, 4), 9, True,  'win - REUSED stand (no win pose)'),
  'lose':       (g('jfc', 3), 6, False, 'lose - REUSED crouch (no lose pose)'),
  'grab':       (g('attack', 1, 2), 4, False, 'grab - REUSED jab'),
  'wvPlant':    (g('down', 1, 2, 3), 4, False, 'PLANT cast (attack v f1-2 + f3 crouch): Thornspike / Snare Vine / Bloom Pod'),
  'wvGrow':     (g('down', 4, 5, 6, 7), 4, True, 'planting / growth hold (attack v LOOP f4-7)'),
  'wvWhip':     (g('fwd', 1, 2, 3, 4, 5), 4, False, 'VINE WHIP / STRETCH POKE (attack -> f1 wind-up, f2-4 extend, f5 retract)'),
  'wvRise':     (g('up', 2, 3, 4), 4, False, 'VERDANT RISE (attack ^ f2-4, the tall green growth)'),
  'wvSeed':     (g('attack', 5), 6, False, 'SEED SHOT (attack f5 reaching arm)'),
}


def build():
    anim, ledger = {}, []
    for key, (frames, speed, loop, role) in A.items():
        cells = []
        for grp, i in frames:
            cid = GROUPS[grp][i - 1]
            cell, off = place(crop(cid)); cells.append(cell)
            c = C[cid]
            ledger.append(dict(anim=key, group=grp, frame=i, component=cid, src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']],
                               offset=off, role=role))
        path = f'{PREFIX}{key}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger


def build_fx():
    """FX strips: frames bottom-centre anchored in a uniform cell (thorns grow from the ground; seeds / spark centred)."""
    fx = {}
    for name, ids in FXG.items():
        crops = [crop(i) for i in ids]
        cw = max(a.shape[1] for a in crops); ch = max(a.shape[0] for a in crops)
        cells = []
        for a in crops:
            cell = np.zeros((ch, cw, 4), np.uint8)
            ox = (cw - a.shape[1]) // 2; oy = ch - a.shape[0]
            cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a; cells.append(cell)
        path = f'{PREFIX}fx_{name}.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        fx[name] = dict(sheet='./' + path, frames=len(cells), w=int(cw), h=int(ch), speed=4,
                        src=[[C[i]['x0'], C[i]['y0'], C[i]['x1'], C[i]['y1']] for i in ids])
    # the spark floats over attack ^ f3: keep its offset from that frame's anchor (feet / body centre), native px
    up3 = C[GROUPS['up'][2]]; sp = C[FXG['spark'][0]]
    a = crop(GROUPS['up'][2]); mid = up3['x0'] + body_mid_x(a)
    fx['spark']['anchor'] = dict(dx=round((sp['x0'] + sp['x1']) / 2 - mid, 1), dyFromFeet=int(sp['y1'] - up3['y1']))
    return fx


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build()
    fx = build_fx()
    with open(os.path.join(ROOT, 'wildvineAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_wildvine.py from the Dragonrod Wildvine sheet ("Sheet by Dragonrod").\n')
        fh.write('// See docs/ben10/aliens/wildvine/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen size from actionScale.\n')
        fh.write('// WILDVINE_FX: extracted sheet effects - seed (4 dots), thorn (6 growth stages small -> tall), spark (attack ^ f3).\n')
        fh.write('export const WILDVINE_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const WILDVINE_FX = ' + json.dumps(fx, indent=2) + '\n')
        fh.write('export const WILDVINE_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y,
                                                                    actionScale=ACTION_SCALE)) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/wildvine.png', key=list(BG), nearest_art_distance=NEAREST,
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, groups=GROUPS, fx=FXG,
                thorn_sheet_order=THORN_SHEET_ORDER, removed_text_components=TEXT, removed_box_component=BOX,
                removed_loop_bracket=BRACKET, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every strip at x3 on a checkerboard, cell borders, body-centre (red) and feet (green) guides
    rows = [(k, PREFIX + k + '_uniform.png') for k in A] + [('fx ' + n, PREFIX + 'fx_' + n + '.png') for n in FXG]
    S = 3; LW = 110
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
    # LOOP preview (attack v bracket played as an animation, x4): docs/ben10/aliens/wildvine/loop_preview.gif
    lp = [Image.open(os.path.join(ROOT, PREFIX + 'wvGrow_uniform.png')).crop((k * CELL_W, 0, (k + 1) * CELL_W, CELL_H)) for k in range(4)]
    fr = []
    for a in lp:
        b = Image.new('RGBA', a.size, (195, 195, 195, 255)); b.alpha_composite(a); fr.append(b.convert('RGB').resize((CELL_W * 4, CELL_H * 4), Image.NEAREST))
    fr[0].save(os.path.join(DOC, 'loop_preview.gif'), save_all=True, append_images=fr[1:], duration=120, loop=0)
    print('anims', len(anim), 'fx', {k: v['frames'] for k, v in fx.items()}, 'text removed', len(TEXT), 'box', BOX, 'bracket', BRACKET,
          'nearest', NEAREST)
