#!/usr/bin/env python3
"""Slice the WILDMUTT (Vulpimancer) sheet into uniform game strips (Phase 1 of the READY Wildmutt alien, key wildmutt_ov).

  python3 -I tools/ben10/slice_wildmutt.py   # writes ben10_wildmutt_ready_*.png, wildmuttAssets.js, docs/ben10/aliens/wildmutt/*

Source: assets/sprites/ben10/aliens/wildmutt.png (608x720) = a byte copy of the tracked root file
wildmutt_by_dragonrod342_davs1vq.png, found by contact sheet (orange furred quadruped, no eyes / ears, white background, rows of
detached limbs, a curled worm-like torso, orange spiral frames, two black arrows near the bottom).
Sheet source: unknown, add credit if known (the file name suggests "dragonrod342").
Rules (see docs/ben10/aliens/wildmutt/SPRITE_LEDGER.md):
  * Clean pixel art: 15 exact colours, opaque, no anti-aliasing.
  * Background = (255,255,255) at every corner. Key = that EXACT colour, zero tolerance, FLOOD-FILLED from the sheet edges
    (only connected background). The enclosed white pockets were then inspected one by one: all 103 (568 px) are background
    seen through gaps (between legs, between spiral strands) - his palette has NO white (claw tips are grey 102,102,102) - so they
    are keyed too (reported in the ledger; ENCLOSED_KEYED below). No palette colour is within reach of the key.
  * EXCLUDED: the two black arrows (pure black, 120x29, between the 2nd spiral row and the last row) = an annotation; the 12 limb
    pieces, 7 claw / finger pieces, the open-jaw head piece, 4 limbless torsos and 2 loose 4x4 Omnitrix badges = RIG PARTS.
  * The curled limbless torso (C) reads on its own as a tucked huddle: used for Feral Curl, knockdown, lose (and transform-in).
  * Spiral frames: each spiral is ONE component; the 1-px fur flecks flung off the spin are attached to the nearest spiral of the
    same row (never cropped). The blue puff beside the sniff frame is attached to it (a cosmetic sniff idle).
  * anchor: body centre = the x-centroid of the frame's body pixels (the torso, never one paw); ground = one row under the lowest
    pixel. Spirals: centroid + their bottom on the same ground line. Nearest-neighbour, frames copied 1:1, never cropped.
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/wildmutt.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/wildmutt')
WHITE = (255, 255, 255)
ACTION_SCALE = 1.5    # Ben spriteScale 2.0 x 1.5 = x3 on screen (stance 31 px -> 93 px, low and wide)
PREFIX = 'ben10_wildmutt_ready_'

im = np.array(Image.open(SRC).convert('RGBA')).astype(np.int32)
H, W, _ = im.shape
assert (im[..., 3] == 255).all(), 'expected an opaque sheet'
rgb = im[..., :3]
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(rgb[y, x]) == WHITE, 'corner is not the white key'
cols = sorted({tuple(int(v) for v in c) for c in rgb.reshape(-1, 3)})
assert len(cols) == 15, len(cols)
white = (rgb == np.array(WHITE)).all(2)
wl, wn = ndimage.label(white)                                             # 4-connected white regions
edge = set(np.unique(np.concatenate([wl[0], wl[-1], wl[:, 0], wl[:, -1]]))) - {0}
bg_conn = np.isin(wl, sorted(edge))
enclosed = white & ~bg_conn
ENCLOSED_KEYED = dict(regions=int(len(set(np.unique(wl[enclosed])) - {0})), pixels=int(enclosed.sum()))
bg = white                                                                # connected + every enclosed pocket (see docstring)
alpha = ~bg

# ── components (8-connected) keyed by (y0, x0) ──
lab, n = ndimage.label(alpha, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    C[(s[0].start, s[1].start)] = dict(id=k + 1, y0=s[0].start, x0=s[1].start, y1=s[0].stop, x1=s[1].stop, n=int((lab[s] == k + 1).sum()))
BYID = {c['id']: c for c in C.values()}
I = lambda yx: C[yx]['id']

BODY = {   # every frame = one body component (+ attachments); numbering = left to right on the sheet
  'arch':  [(16, 45), (16, 121)],                                                      # A1 A2 top row: arched standing stance
  'curl':  [(203, 47)],                                                                # the curled limbless torso = huddle
  'gait':  [(308, 18), (308, 86), (308, 154), (307, 229), (307, 304), (304, 371), (312, 424)],   # G1-G7 bounding gait
  'leap':  [(367, 23), (368, 132)],                                                    # L1 airborne pounce, L2 claws-down landing
  'stance': [(383, 228)],                                                              # C the crouched stance (6 copies on the sheet)
  'lunge': [(433, 70), (431, 135), (430, 206), (431, 283), (429, 367)],                # B2-B6 jaws open lunge / stretch / rise
  'voice': [(553, 82), (558, 160), (558, 239)],                                        # V1 rearing roar, V2 bark, V3 sniff (+ puff)
  'spinA': [(491, 147), (487, 202), (488, 252), (493, 308), (491, 362), (487, 420), (486, 469), (493, 525)],   # S1-S8
  'spinB': [(651, 79), (647, 134), (648, 184), (646, 244), (650, 297), (652, 350)],   # R1-R6 (second spiral row)
}
DUP_STANCE = [(434, 16), (437, 437), (510, 6), (559, 9), (656, 15)]                  # byte-identical copies of C
DUP_LEAP = [(489, 72)]                                                                # byte-identical copy of L1
ARROWS = [(609, 252), (611, 84)]
RIG = [(95, 217), (99, 30), (99, 94), (104, 65), (104, 129), (113, 173), (146, 44), (146, 79), (148, 170), (154, 105), (154, 136),
       (157, 216),                                                                    # 12 limbs
       (208, 173), (209, 198), (209, 222), (209, 251), (211, 159), (211, 267), (211, 289),   # 7 claw / finger pieces
       (204, 13),                                                                     # the open-jaw head piece
       (180, 94), (209, 94), (232, 94), (261, 99),                                    # 4 limbless torsos (head + body)
       (408, 337), (421, 77)]                                                         # 2 loose 4x4 Omnitrix badges
PUFF = (563, 287)
for a in ARROWS:
    c = BYID[I(a)]; px = rgb[c['y0']:c['y1'], c['x0']:c['x1']][lab[c['y0']:c['y1'], c['x0']:c['x1']] == c['id']]
    assert (px == 0).all() and c['x1'] - c['x0'] == 120, 'arrow = pure black annotation'
# fur flecks: the remaining tiny components, each attached to the nearest spiral / body frame of its row
named = {I(t) for g in BODY.values() for t in g} | {I(t) for t in DUP_STANCE + DUP_LEAP + ARROWS + RIG + [PUFF]}
ATTACH = {}
specks = [c for c in C.values() if c['id'] not in named]
assert all(c['n'] <= 2 for c in specks), [c for c in specks if c['n'] > 2]
frames_ids = [(g, i, I(t)) for g, ts in BODY.items() for i, t in enumerate(ts)] + [('dup', 0, I(t)) for t in DUP_STANCE + DUP_LEAP]
def bdist(a, b):
    dx = max(0, b['x0'] - a['x1'] + 1, a['x0'] - b['x1'] + 1); dy = max(0, b['y0'] - a['y1'] + 1, a['y0'] - b['y1'] + 1)
    return max(dx, dy)
for sp in specks:
    best = min(frames_ids, key=lambda f: (bdist(sp, BYID[f[2]]), f[2]))
    assert bdist(sp, BYID[best[2]]) <= 14, sp
    ATTACH.setdefault(best[2], []).append(sp['id'])
ATTACH.setdefault(I((558, 239)), []).append(I(PUFF))
used = named | {s['id'] for s in specks}
assert used == set(BYID), sorted(set(BYID) - used)
assert len(C) == 98

# duplicates asserted (the sheet's own reuse)
def fbytes(i):
    b = BYID[i]; m = lab[b['y0']:b['y1'], b['x0']:b['x1']] == i
    return (m.shape, m.tobytes(), rgb[b['y0']:b['y1'], b['x0']:b['x1']][m].tobytes())
for d in DUP_STANCE: assert fbytes(I(d)) == fbytes(I(BODY['stance'][0])), d
for d in DUP_LEAP: assert fbytes(I(d)) == fbytes(I(BODY['leap'][0])), d
# the spiral cycle: two drawings, each rotated a quarter turn per step (asserted - the spin rotates in place)
def spin_arr(t):
    b = BYID[I(t)]; a = rgb[b['y0']:b['y1'], b['x0']:b['x1']].copy(); a[lab[b['y0']:b['y1'], b['x0']:b['x1']] != b['id']] = 255; return a
A0, B0 = spin_arr(BODY['spinA'][0]), spin_arr(BODY['spinA'][1])
SPIN_REL = []
for g in ('spinA', 'spinB'):
    for t in BODY[g]:
        a = spin_arr(t); hit = None
        for nm, b in (('A', A0), ('B', B0)):
            for r in range(4):
                for fl in (0, 1):
                    c = np.rot90(b, r); c = c[:, ::-1] if fl else c
                    if hit is None and c.shape == a.shape and (c == a).all(): hit = f'{nm} rot{r * 90}{" mirrored" if fl else ""}'
        assert hit, t; SPIN_REL.append([g, list(t), hit])

# palette report
names = {(252, 146, 37): 'fur', (194, 115, 48): 'fur shade', (74, 37, 0): 'outline', (0, 0, 0): 'black (eye band, arrows)',
         (102, 102, 102): 'claw grey', (208, 223, 80): 'Omnitrix dot', (192, 0, 0): 'mouth interior red', (253, 255, 192): 'pale highlight',
         (90, 99, 111): 'Omnitrix ring', (153, 217, 234): 'sniff puff blue', (41, 41, 41): 'Omnitrix dark', (181, 230, 29): 'Omnitrix green',
         (126, 136, 150): 'Omnitrix ring light', (64, 128, 0): 'Omnitrix shade', WHITE: 'background (key)'}
nearKey = [c for c in cols if c != WHITE and sum(abs(a - b) for a, b in zip(c, WHITE)) < 120]
KEYREPORT = dict(colours=len(cols), key=WHITE, tolerance=0, flood_from_edges=True, keyed_connected_px=int(bg_conn.sum()),
                 enclosed_pockets_keyed=ENCLOSED_KEYED, near_key_colours=nearKey, palette={str(c): names[c] for c in cols})

isBody = alpha.copy()
def crop(ids, centroid_ids=None):
    """the frame's own pixels (+ attached flecks / puff), 1:1, with its body centre x and ground row"""
    allids = list(ids) + [a for i in ids for a in ATTACH.get(i, [])]
    y0 = min(BYID[i]['y0'] for i in allids); y1 = max(BYID[i]['y1'] for i in allids)
    x0 = min(BYID[i]['x0'] for i in allids); x1 = max(BYID[i]['x1'] for i in allids)
    m = np.isin(lab[y0:y1, x0:x1], allids)
    a = np.dstack([rgb[y0:y1, x0:x1], np.where(m, 255, 0)]).astype(np.uint8)
    bm = np.isin(lab[y0:y1, x0:x1], list(ids))                      # the body (never the flecks / puff) sets the anchor
    xs = np.where(bm)[1]; mid = float(xs.mean()) + 0.5
    feet = int(np.where(bm.any(1))[0].max()) + 1
    return a, mid, feet


def fr(group, *nums): return [(group, i) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':        (fr('stance', 1), 10, True, 'idle - C the crouched stance (the sheet\'s neutral pose: every row starts on it)'),
  'idleAlt':     ([('stance', 1), ('voice', 3), ('voice', 3), ('stance', 1)], 10, False, 'sniff idle variation - C -> V3 sniff + the blue puff (cosmetic) -> C'),
  'walk':        (fr('gait', 1, 2, 3, 4, 5, 6, 7), 8, True, 'walk - the bounding gait G1-G7 SLOWED (speed 8; no separate walk art)'),
  'walk_back':   (fr('gait', 7, 6, 5, 4, 3, 2, 1), 8, True, 'walk back - the gait REVERSED and slowed (no opposite-facing row)'),
  'run':         (fr('gait', 1, 2, 3, 4, 5, 6, 7), 4, True, 'run - the bounding gait G1-G7 cycled FAST (speed 4)'),
  'dash':        (fr('leap', 1), 4, False, 'dash - L1 the airborne pounce'),
  'crouch':      (fr('stance', 1), 6, False, 'crouch - REUSED C (already his lowest stance)'),
  'jump':        (fr('gait', 1), 6, False, 'jump rise - REUSED G1 (legs flung back; no jump art)'),
  'doubleJump':  (fr('gait', 2, 3, 4, 5), 4, False, 'double jump - REUSED G2-G5 (the tuck of the gait reads as a mid-air roll)'),
  'fall':        (fr('gait', 7), 6, True, 'fall - REUSED G7 (limbs reaching for the ground; no fall art)'),
  'guard':       (fr('arch', 1), 6, False, 'block - REUSED A1 the arched braced stance (no block art)'),
  'crouchGuard': (fr('stance', 1), 6, False, 'crouch block - REUSED C'),
  'blockHit':    (fr('arch', 2), 6, False, 'block hit - REUSED A2'),
  'hurt':        (fr('voice', 1), 6, False, 'hit light / heavy - REUSED V1 rearing back, jaws open (no hurt art)'),
  'hurt_air':    (fr('gait', 4), 6, False, 'hit in the air - REUSED G4 (tumbling)'),
  'knockdown':   ([('voice', 1), ('curl', 1)], 8, False, 'knockdown - V1 -> the curled huddle (limbless rig torso, reads as tucked)'),
  'getup':       ([('curl', 1), ('stance', 1)], 7, False, 'get-up - curl -> C'),
  'dizzy':       (fr('arch', 1, 2), 12, True, 'dizzy - REUSED A1/A2 swaying'),
  'transform':   ([('curl', 1), ('lunge', 5), ('stance', 1)], 6, False, 'transform-in - curl -> B6 rising -> C (no human frames on this sheet)'),
  'taunt':       (fr('voice', 2), 6, False, 'taunt - V2 bark'),
  'win':         (fr('voice', 1, 2), 12, True, 'win - V1 rearing roar <-> V2 bark'),
  'lose':        (fr('curl', 1), 6, False, 'lose - the curled huddle'),
  'light':       ([('stance', 1), ('lunge', 1)], 3, False, 'JAB - C -> B2 jaws-open claw reach (+ render lunge, procedural claw slash)'),
  'heavy':       ([('arch', 1), ('lunge', 2)], 7, False, 'HEAVY - A1 wind-up -> B3 the extended claw stretch (160 px)'),
  'down':        (fr('lunge', 4), 5, False, 'LOW - B5 the flat low claw stretch (hits low)'),
  'up':          ([('stance', 1), ('lunge', 5)], 5, False, 'LAUNCHER - C -> B6 rearing up (the Pounce launch rise)'),
  'air':         (fr('gait', 7), 4, False, 'AIR - REUSED G7 limbs forward (+ render-only airborne offset / claw slash)'),
  'grab':        (fr('lunge', 2), 4, False, 'grab - REUSED B3'),
  'wmSpinIn':    ([('stance', 1), ('leap', 1)], 3, False, 'SPIN SLASH entry - C -> L1 (spin row 1 opens exactly so)'),
  'wmSpin':      (fr('spinA', 1, 2, 3, 4, 5, 6, 7, 8), 2, True, 'SPIN SLASH active - the 8-step spiral cycle S1-S8 (each a quarter turn)'),
  'wmSpinB':     (fr('spinB', 1, 2, 3, 4, 5, 6), 2, True, 'GROUND SHRED / ult passes - the 2nd spiral row R1-R6 (half mirrored = the reverse spin)'),
  'wmPounce':    ([('stance', 1), ('leap', 1), ('leap', 2)], 5, False, 'POUNCE - C -> L1 airborne -> L2 claws-down landing'),
  'wmRush':      (fr('lunge', 2, 3, 4), 3, True, 'CLAW RUSH - B3 -> B4 (fur speed blur) -> B5 running slashes'),
  'wmLeap':      ([('leap', 1), ('gait', 7)], 4, False, 'SCENT LEAP - L1 -> G7 diving claws-first'),
  'wmCurl':      (fr('curl', 1), 6, False, 'FERAL CURL - the curled huddle'),
  'wmPin':       (fr('leap', 2), 6, True, 'PRIMAL TAKEDOWN pin - L2 claws pinning down'),
  'wmUltFinal':  ([('arch', 1), ('lunge', 2)], 6, False, 'PRIMAL TAKEDOWN finisher - the Heavy frames (drawn scaled up, render-only)'),
}

frames_all = {}
ext, top, bot = 0, 0, 0
for k, (frs, *_) in A.items():
    for grp, i in frs:
        ids = [I(BODY[grp][i - 1])]
        a, mid, feet = crop(ids)
        frames_all[(k, grp, i)] = (a, mid, feet, ids)
        ext = max(ext, mid, a.shape[1] - mid); top = max(top, feet); bot = max(bot, a.shape[0] - feet)
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
            ledger.append(dict(anim=key_, group=grp, frame=i, components=ids, attached=ATTACH.get(ids[0], []), offset=off, role=role))
        path = f'{PREFIX}{key_}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key_] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    excluded = {I(t) for t in RIG + ARROWS}
    for e in ledger:
        assert not set(e['components']) & excluded, e
    return anim, ledger


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build()
    with open(os.path.join(ROOT, 'wildmuttAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_wildmutt.py from the Wildmutt sheet (white-background pixel sheet; source unknown, see ledger).\n')
        fh.write('// See docs/ben10/aliens/wildmutt/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen x3 (actionScale 1.5).\n')
        fh.write('export const WILDMUTT_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const WILDMUTT_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/wildmutt.png', credit='Sheet source: unknown, add credit if known', key_report=KEYREPORT,
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE,
                body={g: [list(t) for t in ts] for g, ts in BODY.items()}, duplicates=dict(stance=[list(t) for t in DUP_STANCE], leap=[list(t) for t in DUP_LEAP]),
                excluded=dict(arrows=[list(t) for t in ARROWS], rig_parts=[list(t) for t in RIG]), attached=ATTACH, spin_relations=SPIN_REL, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every animation strip (x2, nearest) on a checker, cell lines, body-centre (red) + ground line (green)
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
    for row in ('idle', 'idleAlt', 'walk', 'run', 'wmSpin', 'wmSpinB', 'wmPounce', 'wmRush', 'light', 'heavy', 'up', 'knockdown'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; frs = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, (28, 30, 36, 255)); b.alpha_composite(a)
            frs.append(b.convert('RGB').resize((CELL_W * 3, CELL_H * 3), Image.NEAREST))
        dur = 60 if row in ('run', 'wmSpin', 'wmSpinB') else 130
        frs[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=frs[1:], duration=dur, loop=0)
    print('anims', len(anim), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y)
    print('key', json.dumps({k: v for k, v in KEYREPORT.items() if k != 'palette'}))
    print('attached', {k: len(v) for k, v in ATTACH.items()})
