#!/usr/bin/env python3
"""Slice the FEEDBACK (Conductoid) sheet into uniform game strips (Phase 1 of the Feedback alien).

  python3 -I tools/ben10/slice_feedback.py   # writes ben10_feedback_ready_*.png, feedbackAssets.js, docs/ben10/aliens/feedback/*

Source: assets/sprites/ben10/aliens/feedback.png (900x742) = a byte copy of the tracked root file
feedback_by_dragonrod342_db1hz1k.png (md5 384af8e20377abdf24fc556afbfcebae), found by contact sheet: black humanoid with a
yellow visor, antennae / plugs and a tail, blue plasma orbs, white background, red ground lines, a loose parts bin on the right.
Rules (see docs/ben10/aliens/feedback/SPRITE_LEDGER.md):
  * Background = (255,255,255) at every corner. Key = EXACT white, zero tolerance, and ONLY the white CONNECTED TO THE SHEET
    EDGE (flood fill). Enclosed whites are kept: they are his white body panels (back hump, chest), visor glints and the white
    cores of the electric bursts / streak.
  * EXCLUDED (not art): red ground / guide lines (237,28,36), the grey "x 5" text (195,195,195), and the magenta (255,0,255)
    marks around the orb frames — verified on a zoom: they are REGISTRATION CROSSHAIRS (a tick above, below, left and right
    of every orb), not sparks. They are used to centre each orb frame, then dropped. The guides are passable for the flood fill
    (so background behind / between them is keyed too).
  * 8-connected components, every one assigned explicitly (asserted). Electricity touching a body is part of that body frame.
    Row 5's spiky burst and the long streak OVERLAP (the burst's right spikes run into the streak's tail over x 195-203, no
    empty column), so they are NOT cut: they stay one CONDUIT DASH FX frame (burst trailing into the streak).
  * anchor = feet baseline (bottom row) + body centre = the centroid of the frame's BOTTOM 40 % (legs), so antennae, tail,
    plug arms or spark spikes never drag it.
  * nearest-neighbour only: frames are copied 1:1, never cropped (asserted inside the cell).
  * PARTS BIN (right side) -> only reachable roles: the two 6-strip bend rows (same shapes, two shades) = SIPHON CABLE extend / retract, the three wavy
    plug-tipped cables = the tether loop, two plug-arm pieces = plug tip; every other part (legs, hands, fists, plugs, torso, tail curls, antennae, a spare head) is excluded (no new body poses).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/feedback.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/feedback')
BG = (255, 255, 255)
RED, PINK, GREY = (237, 28, 36), (255, 0, 255), (195, 195, 195)
ACTION_SCALE = 1.25   # native stand ~49 px -> about Upgrade's on-screen height
PREFIX = 'ben10_feedback_ready_'   # _ready_: keeps clear of the experimental `feedback` table's names

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not white'
isc = lambda c: (im == np.array(c)).all(axis=2)
white, red, pink, grey = isc(BG), isc(RED), isc(PINK), isc(GREY)
guide = red | pink | grey
passable = white | guide
plab, _ = ndimage.label(passable)
edge_ids = np.setdiff1d(np.unique(np.concatenate([plab[0], plab[-1], plab[:, 0], plab[:, -1]])), [0])
outside = np.isin(plab, edge_ids)                       # flood fill from the edges through white + guides
art = ~outside & ~guide                                 # enclosed whites stay art
ENCLOSED_WHITE = int((art & white).sum())
GUIDE_INSIDE = int((guide & ~outside).sum())            # a guide pixel enclosed by art would be suspicious
assert GUIDE_INSIDE == 0, ('guide pixels enclosed by art', GUIDE_INSIDE)

lab, n = ndimage.label(art, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    C[k + 1] = dict(id=k + 1, y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, n=int((lab[s] == k + 1).sum()))


def find(x0, y0):
    hits = [c['id'] for c in C.values() if c['x0'] == x0 and c['y0'] == y0]
    assert len(hits) == 1, ('component', x0, y0, hits)
    return hits[0]


def row(y0, y1, x1=480, pred=lambda c: True):
    return [c['id'] for c in sorted(C.values(), key=lambda c: c['x0']) if y0 <= c['y0'] < y1 and c['x0'] < x1 and pred(c)]


big = lambda c: c['n'] >= 800
orbish = lambda c: 300 <= c['n'] < 600
GROUPS = {
    'idle':   row(140, 210),
    'run':    row(225, 290),
    'r3':     row(295, 380, 200),                    # narrow stand, jump with tail, crouch (by x)
    'aim':    row(385, 450, 150, big),
    'orb':    row(385, 450, 350, orbish),            # Row 4 orb spin
    'r5':     row(470, 540),                         # run, electrified, [burst+streak], burst figure
    'r6':     row(545, 650),
    'fire':   row(660, 720, 320, big),
    'stored': row(660, 720, 500, orbish),            # Row 7 orb ("x5") = the stored-projectile loop
}
EXPECT = dict(idle=4, run=6, r3=3, aim=2, orb=4, r5=4, r6=2, fire=5, stored=4)
for g, k in EXPECT.items(): assert len(GROUPS[g]) == k, (g, GROUPS[g], [(C[i]['x0'], C[i]['y0'], C[i]['n']) for i in GROUPS[g]])
R3 = dict(zip(('stand', 'jump', 'crouch'), GROUPS['r3']))
R5_RUN, R5_ELEC, R5_MERGED, R5_FIG = GROUPS['r5']

# Row 5 burst + streak: one component, kept whole (no clean column between them; never cut art)
_m = lab[C[R5_MERGED]['y0']:C[R5_MERGED]['y1'], C[R5_MERGED]['x0']:C[R5_MERGED]['x1']] == R5_MERGED
assert _m.sum(axis=0).min() > 0, 'burst + streak have an empty column - split them instead'


def crop_mask(cid, xa=None, xb=None):
    c = C[cid]
    x0 = c['x0'] if xa is None else xa; x1 = c['x1'] if xb is None else xb
    m = lab[c['y0']:c['y1'], x0:x1] == cid
    ys, xs = np.where(m)
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rgb = im[c['y0'] + ys.min():c['y0'] + ys.max() + 1, x0 + xs.min():x0 + xs.max() + 1]
    return np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8), (x0 + xs.min(), c['y0'] + ys.min())


def crop(cid): return crop_mask(cid)[0]


DASHFX = crop(R5_MERGED)

# ── PARTS BIN: reachable roles only ──
BEND = row(115, 139, 670, lambda c: c['x0'] >= 540)                 # 6-strip bend row A (between the red guides)
BEND_B = row(139, 162, 670, lambda c: c['x0'] >= 540)               # row B: the SAME shapes in the darker (23,23,23) shade
assert len(BEND) == 6 and len(BEND_B) == 6
for a_, b_ in zip(BEND, BEND_B): assert np.array_equal(crop(a_)[..., 3], crop(b_)[..., 3]), 'bend rows are not the same shapes'
CABLE = [find(741, 194), find(787, 195), find(837, 195)]            # the three wavy plug-tipped cables
PLUG = [find(608, 191), find(646, 190)]                             # plug-arm pieces -> plug tip
LOOSE_HEAD = [find(385, 381)]                                       # spare head + antennae beside Row 4 (excluded)
used = set()
for ids in GROUPS.values(): used |= set(ids)
PARTS_ROLE = set(BEND) | set(BEND_B) | set(CABLE) | set(PLUG)
PARTS_EXCLUDED = sorted(set(C) - used - PARTS_ROLE)
for i in PARTS_EXCLUDED: assert C[i]['x0'] >= 480 or i in LOOSE_HEAD, ('unassigned non-parts component', C[i])


def body_mid_x(a):
    al = a[..., 3] > 0
    lower = al[int(al.shape[0] * 0.6):]
    ys, xs = np.where(lower if lower.sum() >= 10 else al)
    return float(xs.mean())


def g(name, *nums): return [(name, i) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':       (g('idle', 1, 2, 3, 4), 9, True,  'idle (Row 1 loop)'),
  'walk':       (g('run', 1, 2, 3, 4, 5, 6), 8, True,  'walk - the Row 2 RUN cycle SLOWED (no walk art)'),
  'walk_back':  (g('run', 6, 5, 4, 3, 2, 1), 8, True,  'walk back - Row 2 REVERSED + slowed'),
  'run':        (g('run', 1, 2, 3, 4, 5, 6), 4, True,  'run (Row 2)'),
  'dash':       (g('run', 2, 3), 3, True,  'dash - Row 2 f2-3, fast'),
  'jump':       (g('r3', 2), 6, False, 'jump rise (Row 3 f2, jump with tail)'),
  'doubleJump': (g('r3', 2), 6, False, 'double jump - REUSED Row 3 f2'),
  'fall':       (g('r3', 2), 6, True,  'jump fall - REUSED Row 3 f2 (no fall art)'),
  'crouch':     (g('r3', 3), 6, False, 'crouch (Row 3 f3)'),
  'guard':      (g('r3', 1), 6, False, 'block (Row 3 f1 narrow stand)'),
  'blockHit':   (g('r3', 1), 6, False, 'block hit - REUSED Row 3 f1'),
  'light':      (g('aim', 1), 4, False, 'JAB - Row 4 aim f1 body + render-only lunge + procedural pixel plug spark'),
  'heavy':      (g('aim', 1, 2), 5, False, 'HEAVY - Row 4 aim f1-2 body + lunge + procedural plug strike (150 px)'),
  'down':       (g('r3', 3), 6, False, 'LOW - Row 3 crouch + procedural low plug spark (hits low)'),
  'up':         (g('run', 3), 6, False, 'LAUNCHER - Row 2 run f3 body + procedural rising spark arc'),
  'air':        (g('r3', 2), 6, False, 'AIR - Row 3 jump frame + procedural spark'),
  'hurt':       (g('r3', 3), 6, False, 'hit - REUSED Row 3 crouch (no hurt pose)'),
  'hurt_air':   (g('r3', 2), 6, False, 'hit in the air - REUSED Row 3 jump'),
  'knockdown':  (g('r3', 3), 6, False, 'knockdown - REUSED Row 3 crouch (no knockdown pose)'),
  'getup':      (g('r3', 3, 1), 6, False, 'get-up - REUSED crouch -> narrow stand'),
  'dizzy':      (g('idle', 1, 2), 12, True, 'dizzy - REUSED idle f1-2 (no dizzy pose)'),
  'transform':  (g('r6', 1), 6, False, 'transform-in - REUSED Row 6 f1 (spike burst over the hands)'),
  'taunt':      (g('r6', 1), 8, False, 'taunt - REUSED Row 6 f1'),
  'win':        (g('r6', 2), 9, False, 'win - REUSED Row 6 f2 (no win pose)'),
  'lose':       (g('r3', 3), 6, False, 'lose - REUSED Row 3 crouch (no lose pose)'),
  'grab':       (g('aim', 1), 4, False, 'grab - REUSED Row 4 aim f1'),
  'fbOrb':      (g('aim', 1, 2), 5, False, 'PLASMA ORB cast (Row 4 plug-arm aim f1-2)'),
  'fbGuard':    (g('r6', 1), 6, False, 'PLUG GUARD catch flash (Row 6 f1)'),
  'fbBurst':    (g('r6', 1, 2), 5, False, 'OVERLOAD BURST (Row 6 f1 -> f2 burst) + ult Overload pulses'),
  'fbDash':     (g('r5', 1, 2, 4), 4, False, 'CONDUIT DASH body (Row 5 f1 run, f2 electrified, f5 burst figure; f3 / f4 = FX)'),
  'fbFire':     (g('fire', 1, 2, 3, 4, 5), 4, False, 'RETURN FIRE (Row 7 plug-forward firing f1-5) + ult Discharge'),
  'fbSiphon':   (g('fire', 1), 6, False, 'SIPHON CABLE cast (Row 7 f1 plug forward; the cable is FX)'),
  'fbVolt':     (g('r3', 2), 6, False, 'VOLT SHOT (air: Row 3 jump frame; the orb is FX)'),
}
SRCMAP = dict(idle=GROUPS['idle'], run=GROUPS['run'], r3=[R3['stand'], R3['jump'], R3['crouch']], aim=GROUPS['aim'],
              r5=[R5_RUN, R5_ELEC, None, R5_FIG], r6=GROUPS['r6'], fire=GROUPS['fire'])

ext, tall = 0, 0
for frames, *_ in A.values():
    for grp, i in frames:
        a = crop(SRCMAP[grp][i - 1]); mid = body_mid_x(a); ext = max(ext, mid, a.shape[1] - mid); tall = max(tall, a.shape[0])
CX = int(np.ceil(ext)) + 2
CELL_W = CX * 2
FEET_Y = tall + 2
CELL_H = FEET_Y + 2


def place(a):
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - body_mid_x(a))); oy = FEET_Y - a.shape[0]
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)


def build():
    anim, ledger = {}, []
    for key, (frames, speed, loop, role) in A.items():
        cells = []
        for grp, i in frames:
            cid = SRCMAP[grp][i - 1]
            cell, off = place(crop(cid)); cells.append(cell)
            c = C[cid]
            ledger.append(dict(anim=key, group=grp, frame=i, component=cid, src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']], offset=off, role=role))
        path = f'{PREFIX}{key}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger


def orb_centre(cid):
    """The registration crosshair around an orb: the vertical ticks give the centre x, the horizontal ticks the centre y."""
    c = C[cid]; pad = 8
    ys, xs = np.where(pink[c['y0'] - pad:c['y1'] + pad, c['x0'] - pad:c['x1'] + pad])
    ys = ys + c['y0'] - pad; xs = xs + c['x0'] - pad
    vert = (ys < c['y0'] + 2) | (ys >= c['y1'] - 2)                      # ticks above / below
    horz = ~vert & ((xs < c['x0'] + 3) | (xs >= c['x1'] - 3))            # ticks left / right
    cxv = float(np.median(xs[vert])) if vert.any() else (c['x0'] + c['x1']) / 2
    cyv = float(np.median(ys[horz])) if horz.any() else (c['y0'] + c['y1']) / 2
    return cxv, cyv


def strip(name, crops, centred=None):
    """FX strip; `centred` = per-frame (cx, cy) inside each crop (orbs: crosshair centre), else bottom-centre."""
    cw = max(a.shape[1] for a in crops); ch = max(a.shape[0] for a in crops)
    if centred:
        half_w = max(max(cx_, a.shape[1] - cx_) for a, (cx_, _) in zip(crops, centred))
        half_h = max(max(cy_, a.shape[0] - cy_) for a, (_, cy_) in zip(crops, centred))
        cw, ch = int(np.ceil(half_w)) * 2 + 2, int(np.ceil(half_h)) * 2 + 2
    cells = []
    for j, a in enumerate(crops):
        cell = np.zeros((ch, cw, 4), np.uint8)
        if centred: ox = int(round(cw / 2 - centred[j][0])); oy = int(round(ch / 2 - centred[j][1]))
        else: ox = (cw - a.shape[1]) // 2; oy = ch - a.shape[0]
        assert 0 <= ox and ox + a.shape[1] <= cw and 0 <= oy and oy + a.shape[0] <= ch, ('fx cropped', name)
        cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a; cells.append(cell)
    path = f'{PREFIX}fx_{name}.png'
    Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
    return dict(sheet='./' + path, frames=len(cells), w=int(cw), h=int(ch), speed=4)


def build_fx():
    fx = {}
    for name, ids in (('orb', GROUPS['orb']), ('stored', GROUPS['stored'])):
        crops, cen = [], []
        for i in ids:
            a, (ax, ay) = crop_mask(i); ox_, oy_ = orb_centre(i); crops.append(a); cen.append((ox_ - ax, oy_ - ay))
        fx[name] = strip(name, crops, cen)
    fx['dash'] = strip('dash', [DASHFX], [(DASHFX.shape[1] / 2, DASHFX.shape[0] / 2)])
    fx['bend'] = strip('bend', [crop(i) for i in BEND])                  # SIPHON CABLE extend (row A, 40-grey)
    fx['bendDark'] = strip('bendDark', [crop(i) for i in BEND_B])        # SIPHON CABLE retract (row B, darker 23-grey), played reversed
    fx['cable'] = strip('cable', [crop(i) for i in CABLE], [(crop(i).shape[1] / 2, crop(i).shape[0] / 2) for i in CABLE])
    fx['plug'] = strip('plug', [crop(i) for i in PLUG], [(crop(i).shape[1] / 2, crop(i).shape[0] / 2) for i in PLUG])
    return fx


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build()
    fx = build_fx()
    with open(os.path.join(ROOT, 'feedbackAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_feedback.py from the Feedback sheet (feedback_by_dragonrod342_db1hz1k.png).\n')
        fh.write('// See docs/ben10/aliens/feedback/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen size from actionScale.\n')
        fh.write('// FEEDBACK_FX: extracted sheet effects - orb (Row 4 spin, crosshair-centred), stored (Row 7 orb loop), dash (Row 5 burst + streak, one frame),\n')
        fh.write('// bend / bendDark (parts-bin 6-strip rows: SIPHON CABLE extend / retract, same shapes in two shades), cable (3 wavy plug-tipped cables = tether loop), plug (plug tip).\n')
        fh.write('export const FEEDBACK_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const FEEDBACK_FX = ' + json.dumps(fx, indent=2) + '\n')
        fh.write('export const FEEDBACK_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
    box = lambda i: [C[i]['x0'], C[i]['y0'], C[i]['x1'], C[i]['y1']]
    grid = dict(source='assets/sprites/ben10/aliens/feedback.png', key=list(BG), zero_tolerance=True, flood_fill_from_edges=True,
                enclosed_white_kept=ENCLOSED_WHITE, guides_removed=dict(red=int(red.sum()), magenta_crosshairs=int(pink.sum()), grey_x5_text=int(grey.sum())),
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE,
                groups={k: v for k, v in GROUPS.items()}, row3=R3, row5=dict(run=R5_RUN, electrified=R5_ELEC, burst_streak_fx=R5_MERGED, figure=R5_FIG),
                parts=dict(bend_extend=BEND, bend_retract_dark=BEND_B, cable=CABLE, plug=PLUG,
                           excluded={str(i): box(i) for i in PARTS_EXCLUDED}),
                ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    rows = [(k, PREFIX + k + '_uniform.png') for k in A] + [('fx ' + k, PREFIX + 'fx_' + k + '.png') for k in fx]
    S = 2; LW = 110
    imgs = [(nm, Image.open(os.path.join(ROOT, p))) for nm, p in rows]
    cw = LW + max(i.width for _, i in imgs) * S + 10
    ch = sum(i.height * S + 6 for _, i in imgs) + 10
    sheet = Image.new('RGBA', (cw, ch), (40, 44, 52, 255)); d = ImageDraw.Draw(sheet); y = 5
    for nm, i in imgs:
        bw, bh = i.width * S, i.height * S
        chk = Image.new('RGBA', (bw, bh), (70, 74, 82, 255)); cd = ImageDraw.Draw(chk)
        for yy in range(0, bh, 8):
            for xx in range(0, bw, 8):
                if (xx // 8 + yy // 8) % 2: cd.rectangle([xx, yy, xx + 7, yy + 7], fill=(58, 62, 70, 255))
        if not nm.startswith('fx'):
            for f in range(i.width // CELL_W):
                cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
                cd.line([((f * CELL_W + CX) * S, 0), ((f * CELL_W + CX) * S, bh)], fill=(200, 80, 80, 255))
            cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    DARK = (52, 56, 66)
    for row in ('idle', 'run', 'fbDash', 'fbFire', 'fbBurst'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; fr = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, DARK + (255,)); b.alpha_composite(a)
            fr.append(b.convert('RGB').resize((CELL_W * 2, CELL_H * 2), Image.NEAREST))
        fr[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=fr[1:], duration=150, loop=0)
    for name in ('orb', 'stored', 'bend', 'cable'):
        f_ = fx[name]; st = Image.open(os.path.join(ROOT, PREFIX + 'fx_' + name + '.png')); fr = []
        for j in range(f_['frames']):
            a = st.crop((j * f_['w'], 0, (j + 1) * f_['w'], f_['h'])); b = Image.new('RGBA', a.size, DARK + (255,)); b.alpha_composite(a)
            fr.append(b.convert('RGB').resize((f_['w'] * 4, f_['h'] * 4), Image.NEAREST))
        fr[0].save(os.path.join(DOC, f'preview_fx_{name}.gif'), save_all=True, append_images=fr[1:], duration=120, loop=0)
    print('anims', len(anim), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'fx', {k: v['frames'] for k, v in fx.items()},
          'enclosed white kept', ENCLOSED_WHITE, 'parts excluded', len(PARTS_EXCLUDED),
          'guides', dict(red=int(red.sum()), pink=int(pink.sum()), grey=int(grey.sum())))
