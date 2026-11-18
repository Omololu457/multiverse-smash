#!/usr/bin/env python3
"""Slice the RATH (Appoplexian) sheet into uniform game strips (Phase 1 of the Rath alien).

  python3 -I tools/ben10/slice_rath.py   # writes ben10_rath_ready_*.png, rathAssets.js, docs/ben10/aliens/rath/*

Source: assets/sprites/ben10/aliens/rath.png (1330x661) = a byte copy of the tracked root file
ben_10_rath_sprites_sheet_by_mhcd12_dmav8zd.png, found by contact sheet (orange-and-white tiger-striped muscular alien with
claws, two small figures on the far left, solid blue background). Sheet source: unknown, add credit if known (the file name
suggests "mhcd12").
Rules (see docs/ben10/aliens/rath/SPRITE_LEDGER.md):
  * Clean pixel art: 30 exact colours, opaque, no anti-aliasing (no de-fringe pass needed).
  * Background = (0,91,163) blue at every corner. Key = that EXACT colour, zero tolerance.
  * No annotation on the sheet: 35 components, every one a whole frame (asserted, every one assigned by its top-left).
  * THE TWO SMALL FIGURES on the far left (a full-colour human Ben 10, a solid green Ben silhouette) are NOT Rath frames:
    used ONLY as the transform-in sequence (human Ben -> green flash -> Rath idle), never as a combat pose.
  * The orange streak in the claw-slash frame (B11) is the swipe TRAIL of his claws (Rath has no weapons in canon): it touches
    the arm, so it stays in the frame, used as the claw-swipe pose.
  * anchor = FEET baseline (one row under the lowest pixel of the frame = the shoes) + BODY CENTRE = the centre of the densest
    TORSO_W column window of the body's orange / white pixels (an extended punching arm never drags it).
  * nearest-neighbour only: frames are copied 1:1, never cropped (asserted inside the cell).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/rath.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/rath')
BLUE = (0, 91, 163)
BODY = [(255, 85, 0), (189, 66, 4), (241, 241, 240)]      # Rath's orange, dark orange, chest white
TORSO_W = 16
ACTION_SCALE = 1.5    # native stand ~61 px -> x3 on screen (Ben spriteScale 2.0 x 1.5): an exact integer pixel scale
PREFIX = 'ben10_rath_ready_'

im = np.array(Image.open(SRC).convert('RGBA')).astype(np.int32)
H, W, _ = im.shape
assert (im[..., 3] == 255).all(), 'expected an opaque sheet'
rgb = im[..., :3]
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(rgb[y, x]) == BLUE, 'corner is not the blue key'
cols = {tuple(int(v) for v in c) for c in rgb.reshape(-1, 3)}
bg = (rgb == np.array(BLUE)).all(2)
alpha = ~bg
isBody = np.zeros((H, W), bool)
for c in BODY: isBody |= (rgb == np.array(c)).all(2)

# ── components (8-connected) keyed by their top-left (x0, y0) ──
lab, n = ndimage.label(alpha, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    c = dict(id=k + 1, x0=s[1].start, y0=s[0].start, x1=s[1].stop, y1=s[0].stop, n=int((lab[s] == k + 1).sum()))
    C[(c['x0'], c['y0'])] = c
P = lambda *xy: [C[t]['id'] for t in xy]
BYID = {c['id']: c for c in C.values()}
GROUPS = {   # each frame = ONE component; numbering = left to right on the sheet
  'stand': [P(t) for t in [(154, 273), (197, 272), (239, 274), (282, 273)]],                          # top row T2-T5
  'run':   [P(t) for t in [(321, 279), (377, 275), (411, 276), (468, 279), (524, 275), (558, 276)]],  # T6-T11 upright run cycle
  'roar':  [P(t) for t in [(617, 263)]],                                                              # T12 pointing / roaring
  'crouch': [P(t) for t in [(684, 297)]],                                                             # T13 on all fours
  'punch': [P(t) for t in [(738, 281), (788, 280), (851, 278), (922, 278), (987, 280), (1046, 282), (1103, 276), (1161, 277)]],
            # T14 guard/wind-up, T15 straight, T16 long straight, T17 low swipe, T18 / T19 wind-ups, T20 / T21 uppercut
  'leap':  [P(t) for t in [(60, 335)]],                                                               # B1 airborne leap
  'charge': [P(t) for t in [(13, 335), (215, 335), (267, 334), (304, 334), (349, 334), (400, 334), (437, 334)]],
            # B0, B4-B9 hunched charging run (fists forward)
  'guard': [P(t) for t in [(118, 334)]],                                                              # B2 side-on, fists up
  'rant':  [P(t) for t in [(150, 333)]],                                                              # B3 arms up, shouting
  'claw':  [P(t) for t in [(483, 334), (542, 342)]],                                                  # B10 overhead wind-up, B11 claw slash + trail
  'flex':  [P(t) for t in [(599, 337)]],                                                              # B12 double-arm flex
}
SILHOUETTES = P((94, 284), (121, 283))   # T0 human Ben (full colour), T1 green Ben silhouette: the TRANSFORM-IN only
used = set(SILHOUETTES)
for frs in GROUPS.values():
    for ids in frs: used |= set(ids)
assert used == {c['id'] for c in C.values()}, ('unassigned components', sorted({c['id'] for c in C.values()} - used))
assert len(C) == 35

# palette report: which colours are shared between the transform figures and Rath's frames, and anything near the key
silMask = np.isin(lab, SILHOUETTES); rathMask = alpha & ~silMask
silCols = {tuple(int(v) for v in c) for c in rgb[silMask]}; rathCols = {tuple(int(v) for v in c) for c in rgb[rathMask]}
nearKey = sorted(c for c in cols if c != BLUE and sum(abs(a - b) for a, b in zip(c, BLUE)) < 120)
KEYREPORT = dict(colours=len(cols), keyed_px=int(bg.sum()), key=BLUE, tolerance=0,
                 shared_silhouette_and_rath=sorted(silCols & rathCols), near_key_colours=nearKey,
                 near_key_in_rath=sorted(set(nearKey) & rathCols))

# exact duplicate frames on the sheet (reported, they are the sheet's own reuse)
def frame_bytes(i):
    b = BYID[i]; m = lab[b['y0']:b['y1'], b['x0']:b['x1']] == i
    return (m.shape, m.tobytes(), rgb[b['y0']:b['y1'], b['x0']:b['x1']][m].tobytes())
DUPES = []
allf = [(g, k + 1, ids[0]) for g, frs in GROUPS.items() for k, ids in enumerate(frs)]
for a in range(len(allf)):
    for b in range(a + 1, len(allf)):
        if frame_bytes(allf[a][2]) == frame_bytes(allf[b][2]): DUPES.append([f'{allf[a][0]} f{allf[a][1]}', f'{allf[b][0]} f{allf[b][1]}'])


def crop(ids):
    """the frame's own pixels, 1:1, with its body centre and feet baseline"""
    b = BYID[ids[0]]
    m = lab[b['y0']:b['y1'], b['x0']:b['x1']] == b['id']
    a = np.dstack([rgb[b['y0']:b['y1'], b['x0']:b['x1']], np.where(m, 255, 0)]).astype(np.uint8)
    lm = m & isBody[b['y0']:b['y1'], b['x0']:b['x1']]
    if not lm.any(): lm = m                                               # the green silhouette / human Ben: their own box
    col = lm.sum(0).astype(np.int64)
    mid = int(np.argmax(np.convolve(col, np.ones(TORSO_W, np.int64), 'valid'))) + TORSO_W / 2 if len(col) > TORSO_W else len(col) / 2
    feet = int(np.where(m.any(1))[0].max()) + 1                          # one row under the lowest pixel (the shoes)
    return a, mid, feet, m.shape[0]


def fr(group, *nums): return [(group, i) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':        (fr('stand', 1, 2, 3, 4), 9, True, 'idle (Stand T2-T5 loop)'),
  'walk':        (fr('run', 1, 2, 3, 4, 5, 6), 8, True, 'walk - the upright run cycle T6-T11 SLOWED (speed 8)'),
  'walk_back':   (fr('run', 6, 5, 4, 3, 2, 1), 8, True, 'walk back - the run cycle REVERSED and slowed'),
  'run':         (fr('run', 1, 2, 3, 4, 5, 6), 4, True, 'run - the upright run cycle T6-T11, fast'),
  'dash':        (fr('leap', 1), 4, False, 'dash - the airborne leap B1'),
  'crouch':      (fr('crouch', 1), 6, False, 'crouch - T13, on all fours (the only quadruped frame)'),
  'jump':        (fr('leap', 1), 6, False, 'jump rise - REUSED leap B1 (no jump art)'),
  'doubleJump':  (fr('leap', 1), 6, False, 'double jump - REUSED leap B1'),
  'fall':        (fr('leap', 1), 6, True, 'jump fall - REUSED leap B1 (no fall art)'),
  'guard':       (fr('guard', 1), 6, False, 'guard / block - B2 side-on fists up (no block art; the closest defensive frame)'),
  'crouchGuard': (fr('crouch', 1), 6, False, 'crouch block - REUSED crouch T13'),
  'blockHit':    (fr('guard', 1), 6, False, 'block hit - REUSED guard B2 (the engine block flash shows the hit)'),
  'hurt':        (fr('punch', 5), 6, False, 'hit light / heavy - REUSED wind-up T18 (fists drawn in; no hurt art)'),
  'hurt_air':    (fr('leap', 1), 6, False, 'hit in the air - REUSED leap B1'),
  'knockdown':   ([('leap', 1), ('crouch', 1)], 8, False, 'knockdown - REUSED leap B1 -> crouch T13 (no knockdown / lying art)'),
  'getup':       ([('crouch', 1), ('stand', 1)], 7, False, 'get-up - REUSED crouch T13 -> Stand T2 (no get-up art)'),
  'dizzy':       (fr('stand', 1), 12, True, 'dizzy - REUSED Stand T2 (no dizzy art)'),
  'transform':   ([('_human', 1), ('_green', 1), ('stand', 1)], 6, False,
                  'TRANSFORM-IN - the sheet\'s two small figures: human Ben (T0) -> green silhouette (T1) -> Rath Stand T2'),
  'taunt':       (fr('roar', 1), 6, False, 'taunt - T12 pointing / roaring'),
  'win':         (fr('flex', 1), 9, True, 'win - B12 double-arm flex'),
  'lose':        (fr('crouch', 1), 6, False, 'lose - REUSED crouch T13 (no lose art)'),
  'idleAlt':     (fr('stand', 1), 9, True, 'idle alt - REUSED Stand T2'),
  'light':       (fr('punch', 1, 2), 3, False, 'JAB - T14 wind-up -> T15 straight'),
  'heavy':       (fr('punch', 6, 3), 7, False, 'HEAVY - T19 wind-up -> T16 long straight (the hit frame)'),
  'down':        (fr('punch', 4), 5, False, 'LOW - T17 the low claw swipe'),
  'up':          (fr('punch', 7, 8), 5, False, 'LAUNCHER - T20 -> T21 the uppercut (real upward punch)'),
  'air':         ([('leap', 1), ('punch', 2)], 4, False, 'AIR - leap B1 -> straight T15 (REUSED in the air)'),
  'grab':        (fr('punch', 2), 4, False, 'grab - REUSED straight T15 (the reach)'),
  'rtRake':      (fr('claw', 1, 2), 5, False, 'CLAW RAKE - B10 wind-up -> B11 claw slash (its orange trail = the claw swipe)'),
  'rtRush':      ([('leap', 1)] + fr('charge', 2, 3, 4, 5, 6, 7, 1), 3, True, 'RATH RUSH - leap B1 -> hunched charge B4-B9, B0'),
  'rtRushHit':   (fr('punch', 3), 4, False, 'RATH RUSH hits - REUSED long straight T16'),
  'rtGrab':      (fr('punch', 2), 4, False, 'LET ME TELL YOU SOMETHING reach - REUSED straight T15'),
  'rtRant':      (fr('rant', 1), 6, True, 'LET ME TELL YOU SOMETHING rant - B3 arms up, shouting'),
  'rtRantHit':   (fr('punch', 1, 2, 5, 3), 3, False, 'the rant punches - T14, T15, T18, T16 (REUSED punch frames)'),
  'rtSlam':      ([('claw', 1), ('punch', 4)], 7, False, 'OVERHEAD SLAM - B10 overhead wind-up -> T17 swung down (render-only arc)'),
  'rtLunge':     ([('leap', 1), ('punch', 3)], 4, False, 'PRIMAL LUNGE - leap B1 -> long straight T16'),
  'rtRoar':      (fr('flex', 1), 6, False, 'RATH\'S FURY trigger roar - B12 flex (cosmetic, never a lock)'),
  'rtUltGrab':   (fr('rant', 1), 6, True, 'RATH\'S FURY collar grab + shouting - B3'),
  'rtUltPunch':  (fr('punch', 2, 3, 6, 5), 3, False, 'RATH\'S FURY rant punches - T15, T16, T19, T18'),
  'rtUltFinal':  ([('flex', 1), ('punch', 3)], 8, False, 'RATH\'S FURY finisher - B12 flex wind -> T16 haymaker'),
}

FIG = {('_human', 1): SILHOUETTES[0], ('_green', 1): SILHOUETTES[1]}
frames_all = {}
ext, top, bot = 0, 0, 0
for k, (frs, *_) in A.items():
    for grp, i in frs:
        ids = [FIG[(grp, i)]] if grp.startswith('_') else GROUPS[grp][i - 1]
        a, mid, feet, h = crop(ids)
        frames_all[(k, grp, i)] = (a, mid, feet, ids)
        ext = max(ext, mid, a.shape[1] - mid); top = max(top, feet); bot = max(bot, h - feet)
CX = int(np.ceil(ext)) + 2
CELL_W = CX * 2
FEET_Y = top + 2
CELL_H = FEET_Y + bot + 2


def place(a, mid, feet):
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - mid)); oy = FEET_Y - feet
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy and oy + a.shape[0] <= CELL_H, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)


def build():
    anim, ledger = {}, []
    for key_, (frs, speed, loop, role) in A.items():
        cells = []
        for grp, i in frs:
            a, mid, feet, ids = frames_all[(key_, grp, i)]
            cell, off = place(a, mid, feet); cells.append(cell)
            assert int(cell[..., 3].astype(bool).sum()) == int(a[..., 3].astype(bool).sum()), 'pixels lost'
            ledger.append(dict(anim=key_, group=grp, frame=i, components=ids, offset=off, role=role))
        path = f'{PREFIX}{key_}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key_] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    for g, frs in GROUPS.items():                                            # silhouettes never in a combat anim (asserted)
        pass
    for e in ledger:
        if e['anim'] != 'transform': assert not set(e['components']) & set(SILHOUETTES), e
    return anim, ledger


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build()
    with open(os.path.join(ROOT, 'rathAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_rath.py from the Rath sheet (blue-background pixel sheet; source unknown, see ledger).\n')
        fh.write('// See docs/ben10/aliens/rath/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen x3 (actionScale 1.5).\n')
        fh.write('export const RATH_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const RATH_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/rath.png', credit='Sheet source: unknown, add credit if known', key_report=KEYREPORT,
                zero_tolerance_key=True, cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, torso_window=TORSO_W,
                groups=GROUPS, transform_figures=dict(human=SILHOUETTES[0], green=SILHOUETTES[1]), sheet_duplicates=DUPES, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every animation strip (x2, nearest) on a checker, cell lines, body-centre (red) + feet baseline (green)
    S = 2; LW = 110
    imgs = [(nm, Image.open(os.path.join(ROOT, PREFIX + nm + '_uniform.png'))) for nm in A]
    cw = LW + max(i.width for _, i in imgs) * S + 10
    ch = sum(i.height * S + 6 for _, i in imgs) + 10
    sheet = Image.new('RGBA', (cw, ch), (40, 44, 52, 255)); d = ImageDraw.Draw(sheet); y = 5
    for nm, i in imgs:
        bw, bh = i.width * S, i.height * S
        chk = Image.new('RGBA', (bw, bh), (70, 74, 82, 255)); cd = ImageDraw.Draw(chk)
        for yy in range(0, bh, 8):
            for xx in range(0, bw, 8):
                if (xx // 8 + yy // 8) % 2: cd.rectangle([xx, yy, xx + 7, yy + 7], fill=(58, 62, 70, 255))
        for f in range(i.width // CELL_W):
            cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
            cd.line([((f * CELL_W + CX) * S, 0), ((f * CELL_W + CX) * S, bh)], fill=(200, 80, 80, 255))
        cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    for row in ('idle', 'walk', 'run', 'transform', 'light', 'heavy', 'up', 'rtRake', 'rtRush', 'rtSlam', 'rtRantHit', 'rtUltFinal', 'knockdown'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; frs = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, (28, 30, 36, 255)); b.alpha_composite(a)
            frs.append(b.convert('RGB').resize((CELL_W * 3, CELL_H * 3), Image.NEAREST))
        frs[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=frs[1:], duration=130, loop=0)
    print('anims', len(anim), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'dupes', DUPES)
    print('key', KEYREPORT)
