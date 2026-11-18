#!/usr/bin/env python3
"""Slice the ARCTICGUANA (Cryoreptile) sheet into uniform game strips (Phase 1 of the Arcticguana alien).

  python3 -I tools/ben10/slice_arcticguana.py   # writes ben10_arcticguana_ready_*.png, arcticguanaAssets.js, docs/ben10/aliens/arcticguana/*

Source: assets/sprites/ben10/aliens/arcticguana.png (751x559) = a byte copy of the tracked root file
articguana_sprite_sheet_by_dragonrod342_db3ji8s.png, found by contact sheet (black iguana-like alien, blue head, blue back
spikes, grey belly; white background, red ground lines, a parts bin top right, icy breath / shard / cloud / beam FX).
Rules (see docs/ben10/aliens/arcticguana/SPRITE_LEDGER.md):
  * Clean pixel art: 19 exact colours, alpha 255 everywhere, no anti-aliasing (so no de-fringe pass is needed).
  * Background = (255,255,255) at every corner. Key = EXACT white, zero tolerance, and ONLY white CONNECTED TO THE IMAGE EDGE
    (4-connected flood fill). Enclosed whites are kept as art.
  * ANNOTATION (not art), removed before the flood fill so boxed FX open up to the background:
      - every red (237,28,36) straight run >= 20 px: the ground lines, the guide lines around the two 6-strip bend rows,
        the box around the shard pair and the box around the long beam;
      - the red asterisks: red components left after that which touch the background (4 of them). Red pieces enclosed by
        art are mouths and are kept;
      - the word "Loop" and its bracket (black components in the label band above Row 7, y <= 444).
  * 8-connected components on the keyed mask, every one assigned explicitly (asserted). Free-floating ice streaks / puffs /
    shards / cloud / beam pieces are FX frames (own strips). The idle puffs belong to the frame they sit beside (copied with
    it, relative position kept).
  * anchor = feet baseline (the frame's bottom row) + BODY CENTRE = the centre of the densest 20 px column window of the BODY
    component only (spikes, tail, a beam or a puff never drag it).
  * nearest-neighbour only: frames are copied 1:1, never cropped (asserted inside the cell).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/arcticguana.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/arcticguana')
WHITE, RED = (255, 255, 255), (237, 28, 36)
TORSO_W = 20          # body-centre window (native px)
ACTION_SCALE = 1.5    # native stand ~42 px -> x3 on screen (Ben spriteScale 2.0 x 1.5): an exact integer pixel scale, ~126 px
PREFIX = 'ben10_arcticguana_ready_'
FXPREFIX = 'ben10_arcticguana_fx_'

im = np.array(Image.open(SRC).convert('RGBA')).astype(np.int32)
H, W, _ = im.shape
assert (im[..., 3] == 255).all(), 'expected an opaque sheet'
rgb = im[..., :3]
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(rgb[y, x]) == WHITE, 'corner is not the white key'
isW = (rgb == np.array(WHITE)).all(2)
isR = (rgb == np.array(RED)).all(2)
ncol = len({tuple(c) for c in rgb.reshape(-1, 3)})

# ── 1. annotation: red straight runs >= 20 px (lines + box outlines) ──
kill = np.zeros((H, W), bool)
def runs(mask, axis):
    m = mask if axis == 1 else mask.T
    out = np.zeros_like(m)
    for r in range(m.shape[0]):
        row = m[r]; x = 0
        while x < len(row):
            if row[x]:
                s = x
                while x < len(row) and row[x]: x += 1
                if x - s >= 20: out[r, s:x] = True
            else: x += 1
    return out if axis == 1 else out.T
kill |= runs(isR, 1) | runs(isR, 0)
LINE_PX = int(kill.sum())
# asterisks: red components (after the lines) that touch background white; enclosed red = mouths (kept)
rl, rn = ndimage.label(isR & ~kill, structure=np.ones((3, 3)))
wnb = ndimage.binary_dilation(isW, structure=ndimage.generate_binary_structure(2, 1))
ASTERISKS, MOUTHS = [], []
for k, s in enumerate(ndimage.find_objects(rl)):
    m = rl == k + 1
    box = [int(s[1].start), int(s[0].start), int(s[1].stop - 1), int(s[0].stop - 1)]
    if (m & wnb).any(): kill |= m; ASTERISKS.append(box)
    else: MOUTHS.append(box)
# "Loop" + bracket: dark components entirely inside the label band (x 215..295, y 420..444)
band = np.zeros((H, W), bool); band[420:452, 215:296] = True
dl, dn = ndimage.label(~isW & ~kill & band, structure=np.ones((3, 3)))
LABEL = []
for k, s in enumerate(ndimage.find_objects(dl)):
    if s[0].stop - 1 <= 444: kill |= dl == k + 1; LABEL.append([int(s[1].start), int(s[0].start), int(s[1].stop - 1), int(s[0].stop - 1)])
assert len(ASTERISKS) == 4 and len(LABEL) == 5, (ASTERISKS, LABEL)

# ── 2. background = white (or removed annotation) connected to the edge, 4-connected ──
passable = isW | kill
pl, pn = ndimage.label(passable, structure=ndimage.generate_binary_structure(2, 1))
edge = set(np.unique(np.concatenate([pl[0], pl[-1], pl[:, 0], pl[:, -1]]))) - {0}
bg = np.isin(pl, list(edge))
assert not (kill & ~bg).any(), 'an annotation pixel ended up enclosed'
alpha = ~bg
encl = isW & alpha
el, en = ndimage.label(encl, structure=np.ones((3, 3)))
KEYREPORT = dict(colours=ncol, keyed_px=int(bg.sum()), red_line_px=LINE_PX, asterisks=ASTERISKS, mouths_kept=len(MOUTHS),
                 loop_label_components=len(LABEL), enclosed_white_kept_px=int(encl.sum()), enclosed_white_regions=int(en))

# ── 3. components (8-connected) keyed by their top-left (x0, y0) ──
lab, n = ndimage.label(alpha, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    c = dict(id=k + 1, x0=s[1].start, y0=s[0].start, x1=s[1].stop, y1=s[0].stop, n=int((lab[s] == k + 1).sum()))
    C[(c['x0'], c['y0'])] = c
P = lambda *xy: [C[t]['id'] for t in xy]
GROUPS = {
  # bodies (first id = the body; extra ids = FX copied with that frame, positions kept)
  'idle':   [P((26, 44)), P((90, 45), (128, 64)), P((151, 44), (191, 62)), P((206, 43), (246, 62), (247, 64), (248, 61), (249, 63))],
  'run':    [P(t) for t in [(14, 119), (65, 119), (120, 119), (174, 119), (224, 119), (281, 119)]],
  'air':    [P(t) for t in [(15, 175), (71, 180), (145, 186)]],
  'breath': [P(t) for t in [(8, 257), (66, 257), (127, 257), (185, 257)]],
  'spit':   [P(t) for t in [(8, 314), (66, 314), (122, 314), (172, 314), (228, 314), (277, 314), (333, 314)]],
  'cloud':  [P(t) for t in [(11, 382), (63, 382), (119, 382), (173, 382)]],
  'beam':   [P(t) for t in [(29, 451), (83, 451), (137, 451), (199, 451), (258, 451), (345, 451)]],
  'stand':  [P((198, 498))],
  'pbody':  [P((493, 178)), P((543, 178))],
}
FXG = {
  'stream': [P((235, 271)), P((264, 272)), P((293, 275), (299, 273), (299, 279), (302, 272)), P((324, 275), (328, 273), (328, 279), (331, 272))],
  'shard':  [P((388, 329)), P((411, 329))],
  'puff':   [P((232, 401)), P((254, 394)), P((285, 390)), P((321, 400), (326, 391), (333, 404), (335, 396), (342, 388), (344, 399)),
             P((364, 390), (366, 402), (373, 406), (376, 398), (385, 390), (386, 401))],
  'beamTile': [P((305, 463))],
  'tailA':  [P(t) for t in [(604, 77), (623, 77), (634, 77), (649, 77), (666, 77), (678, 77)]],
  'tailB':  [P(t) for t in [(604, 91), (623, 91), (634, 91), (649, 91), (666, 91), (678, 91)]],
}
HEADS_SWAP = {'glowA': (P((251, 505))[0], 'beam', 4, (222, 458)), 'glowB': (P((272, 505))[0], 'beam', 5, (281, 458))}
EXCLUDED = {
  'heads_identical_to_body_frames': (P((511, 4), (532, 3), (562, 4), (590, 3), (639, 4)) + P((460, 82), (489, 82), (512, 83), (533, 83), (558, 84)),
      'pixel-identical to the heads already drawn on Row 1 f1, Row 4 f2-4, Row 3 f1, Row 2 f1-3, Row 6 f4 (template match 100%): the breath casts already show them through those body frames, a swap adds nothing'),
  'heads_blink_row3': (P((664, 5), (687, 4), (715, 4)),
      'eye / blink variants that align only with the Row 3 f1 jump-rise head (82-91% match); no breath cast uses that body and a blink inside a 6-frame jump rise is never seen'),
  'torso_shells': (P((530, 29), (581, 26), (439, 33), (480, 32)), 'belly shells without head / limbs: only usable by assembling new body poses (forbidden)'),
  'loose_spikes': (P((410, 21), (396, 30), (396, 43), (399, 50)), 'single loose back spikes: no pose uses them on their own'),
  'loose_limbs': (P((346, 30), (367, 30), (668, 37), (694, 37), (716, 37), (347, 66), (374, 67), (449, 114), (476, 115), (496, 113), (523, 114),
                    (543, 112), (570, 113), (610, 125), (631, 126), (660, 120), (693, 122), (453, 136), (474, 136), (500, 135), (521, 135),
                    (545, 133), (566, 133), (618, 145), (643, 144)),
      'detached arms / legs / feet: only usable by assembling new body poses (forbidden)'),
}
used = set()
for fr in list(GROUPS.values()) + list(FXG.values()):
    for ids in fr: used |= set(ids)
for hid, *_ in HEADS_SWAP.values(): used.add(hid)
for ids, _ in EXCLUDED.values(): used |= set(ids)
assert used == {c['id'] for c in C.values()}, ('unassigned components', sorted({c['id'] for c in C.values()} - used))
BYID = {c['id']: c for c in C.values()}


def crop(ids, swap=None):
    """the union box of the components (the first is the body), only their own pixels, 1:1"""
    cs = [BYID[i] for i in ids]
    x0, y0 = min(c['x0'] for c in cs), min(c['y0'] for c in cs); x1, y1 = max(c['x1'] for c in cs), max(c['y1'] for c in cs)
    m = np.isin(lab[y0:y1, x0:x1], ids)
    a = np.dstack([rgb[y0:y1, x0:x1], np.where(m, 255, 0)]).astype(np.uint8)
    if swap:                                                             # aligned head swap (template-matched position)
        hid, at = swap; h = BYID[hid]; hx, hy = at
        hm = lab[h['y0']:h['y1'], h['x0']:h['x1']] == hid
        hrgb = rgb[h['y0']:h['y1'], h['x0']:h['x1']]
        oy, ox = hy - y0, hx - x0
        assert 0 <= ox and 0 <= oy and ox + hm.shape[1] <= a.shape[1] and oy + hm.shape[0] <= a.shape[0], 'head swap out of the body box'
        sub = a[oy:oy + hm.shape[0], ox:ox + hm.shape[1]]
        sub[hm, :3] = hrgb[hm]; sub[hm, 3] = 255
    b = BYID[ids[0]]
    bm = lab[b['y0']:b['y1'], b['x0']:b['x1']] == b['id']
    col = bm.sum(0).astype(np.int64)
    if len(col) <= TORSO_W: mid = len(col) / 2
    else: mid = int(np.argmax(np.convolve(col, np.ones(TORSO_W, np.int64), 'valid'))) + TORSO_W / 2
    return a, (b['x0'] - x0) + mid, (b['y1'] - y0)                       # image, body centre x, feet row (body bottom)


def fr(group, *nums): return [(group, i, None) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':        (fr('idle', 1, 2, 3, 4), 9, True, 'idle (Row 1 f1-4 loop; f2/f3/f4 carry their small ice puff / breath dots)'),
  'walk':        (fr('run', 1, 2, 3, 4, 5, 6), 9, True, 'walk - the Row 2 RUN cycle SLOWED (speed 9 vs run 5; no walk art)'),
  'walk_back':   (fr('run', 6, 5, 4, 3, 2, 1), 9, True, 'walk back - Row 2 REVERSED and slowed'),
  'run':         (fr('run', 1, 2, 3, 4, 5, 6), 5, True, 'run (Row 2 f1-6)'),
  'dash':        (fr('run', 2, 3, 4), 3, True, 'dash - Row 2 f2-4, fast'),
  'crouch':      (fr('air', 3), 6, False, 'crouch (Row 3 f3 crouched)'),
  'jump':        (fr('air', 1), 6, False, 'jump rise (Row 3 f1 lean)'),
  'doubleJump':  (fr('air', 1), 6, False, 'double jump - REUSED Row 3 f1'),
  'fall':        (fr('air', 2), 6, True, 'jump fall (Row 3 f2 flip)'),
  'guard':       (fr('air', 3), 6, False, 'guard / block - REUSED Row 3 f3 crouched (no guard art)'),
  'crouchGuard': (fr('air', 3), 6, False, 'block while crouching - REUSED Row 3 f3'),
  'blockHit':    (fr('air', 3), 6, False, 'block hit - REUSED Row 3 f3 (the engine block flash shows the hit)'),
  'hurt':        (fr('air', 3), 6, False, 'hit react - REUSED Row 3 f3 crouched recoil (no hurt art)'),
  'hurt_air':    (fr('air', 2), 6, False, 'hit in the air - REUSED Row 3 f2 flip'),
  'knockdown':   (fr('air', 2, 3), 8, False, 'knockdown - REUSED Row 3 f2 flip -> f3 crouched (no knockdown / lying art)'),
  'getup':       (fr('air', 3, 1), 7, False, 'get-up - REUSED Row 3 f3 -> f1 (no get-up art)'),
  'dizzy':       (fr('idle', 1), 12, True, 'dizzy - REUSED Row 1 f1 (no dizzy art)'),
  'transform':   (fr('pbody', 2, 1), 6, False, 'transform-in - PARTS-BIN body 2 (blue-lit belly: the Omnitrix flash) -> parts-bin body 1'),
  'taunt':       (fr('cloud', 1, 2, 3, 4), 6, False, 'taunt - REUSED Row 6 f1-4 (mouth opening to a red-open hiss)'),
  'win':         (fr('stand', 1), 9, True, 'win pose (Row 8 stand)'),
  'lose':        (fr('air', 3), 6, False, 'lose - REUSED Row 3 f3 crouched (no lose art)'),
  'idleAlt':     (fr('pbody', 1), 9, True, 'idle alt (PARTS-BIN body 1, the plain standing body)'),
  'light':       (fr('run', 3, 4), 3, False, 'JAB - Row 2 f3-4 run frames + render-only lunge + procedural frost claw'),
  'heavy':       (fr('run', 5, 6), 6, False, 'HEAVY - Row 2 f5-6 + the parts-bin BEND STRIP A drawn at the tail as the 180 px tail sweep (render)'),
  'down':        (fr('air', 3), 5, False, 'LOW - Row 3 f3 crouched (LOW start) + parts-bin BEND STRIP B low tail sweep (render)'),
  'up':          (fr('air', 1), 5, False, 'LAUNCHER - Row 3 f1 head-up lean + procedural ice uppercut frost (render)'),
  'air':         (fr('air', 2), 6, False, 'AIR - Row 3 f2 flip frame'),
  'grab':        (fr('spit', 1, 2), 4, False, 'grab - REUSED Row 5 f1-2 lean forward'),
  'agBreath':    (fr('breath', 1, 2, 3, 4), 4, False, 'ICE BREATH cast (Row 4 f1-4, the mouth opening; the stream is the FX strip)'),
  'agBreathHold':(fr('breath', 3, 4), 5, True, 'ICE BREATH hold (Row 4 f3-4 loop)'),
  'agShard':     (fr('spit', 1, 2, 3, 4, 5, 6, 7), 3, False, 'ICE SHARD cast (Row 5 f1-7; asterisk frames f3 / f5 / f7 = release frames)'),
  'agCloud':     (fr('cloud', 1, 2, 3, 4), 4, False, 'FROST CLOUD cast (Row 6 f1-4)'),
  'agCoat':      (fr('pbody', 1, 2), 7, False, 'FROST COAT forming - REUSED parts-bin body 1 -> body 2 (blue-lit belly = the coat taking)'),
  'agSlide':     (fr('run', 1, 2, 3, 4, 5, 6), 2, True, 'ICE SLIDE - Row 2 run frames played fast (the low profile is the hurtbox, the art is the run)'),
  'agCharge':    (fr('beam', 1, 2, 3), 7, False, 'FREEZE BEAM charge (Row 7 f1-3)'),
  'agBeamLoop':  ([('beam', 4, None), ('beam', 5, None), ('beam', 4, 'glowA'), ('beam', 5, 'glowB')], 4, True,
                  'FREEZE BEAM hold = the LOOP f4-5, alternating with the Row 8 glow heads swapped on at their template-matched position'),
  'agBeamFire':  (fr('beam', 6), 6, False, 'FREEZE BEAM fire (Row 7 f6 WITH its boxed long beam: one component, never cut)'),
  'agIcicle':    (fr('air', 2), 6, False, 'ICICLE DROP dive (Row 3 f2 flip frame)'),
  'agCarve':     (fr('run', 4, 5, 6), 4, False, 'ABSOLUTE POPSICLE carving slashes (Row 2 f4-6 + bend-strip tail FX)'),
}

frames_all = {}
ext, top = 0, 0
for k, (frs, *_) in A.items():
    for grp, i, sw in frs:
        ids = GROUPS[grp][i - 1]
        a, mid, feet = crop(ids, (HEADS_SWAP[sw][0], HEADS_SWAP[sw][3]) if sw else None)
        frames_all[(k, grp, i, sw)] = (a, mid, feet, ids)
        ext = max(ext, mid, a.shape[1] - mid); top = max(top, feet)
CX = int(np.ceil(ext)) + 2
CELL_W = CX * 2
FEET_Y = top + 2
CELL_H = FEET_Y + 2


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
        for grp, i, sw in frs:
            a, mid, feet, ids = frames_all[(key_, grp, i, sw)]
            cell, off = place(a, mid, feet); cells.append(cell)
            ledger.append(dict(anim=key_, group=grp, frame=i, components=ids, head_swap=sw, offset=off, role=role))
        path = f'{PREFIX}{key_}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key_] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    fx = {}
    for name, frs in FXG.items():                                        # FX strips: frames centred in a shared cell
        crops = [crop(ids)[0] for ids in frs]
        fw = max(c.shape[1] for c in crops); fh = max(c.shape[0] for c in crops)
        cells = []
        for c in crops:
            cell = np.zeros((fh, fw, 4), np.uint8); ox = (fw - c.shape[1]) // 2; oy = (fh - c.shape[0]) // 2
            cell[oy:oy + c.shape[0], ox:ox + c.shape[1]] = c; cells.append(cell)
        path = f'{FXPREFIX}{name}.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        fx[name] = dict(sheet='./' + path, frames=len(cells), w=fw, h=fh)
        ledger.append(dict(fx=name, components=frs))
    return anim, fx, ledger


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, fx, led = build()
    icefx = {n: './assets/sprites/ben10/aliens/arcticguana_fx/' + n + '.png' for n in ('arc', 'burst', 'burst2', 'splash', 'spray')}
    with open(os.path.join(ROOT, 'arcticguanaAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_arcticguana.py from the Arcticguana sheet (white-background pixel sheet; source: see ledger).\n')
        fh.write('// See docs/ben10/aliens/arcticguana/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen x3 (actionScale 1.5).\n')
        fh.write('export const ARCTICGUANA_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const ARCTICGUANA_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
        fh.write('// FX strips cut from the sheet (render-only)\nexport const ARCTICGUANA_FX = ' + json.dumps(fx, indent=2) + '\n')
        fh.write('// ice-effect sprites copied from assets/frozone/skins/infinity_ice/fx/ (effect art only; render-only)\n')
        fh.write('export const ARCTICGUANA_ICE_FX = ' + json.dumps(icefx, indent=2) + '\n')
        fh.write('// Row 5 red asterisks (annotation, removed) sit over these frames = the hit-active / release frames of that row\n')
        fh.write('export const ARCTICGUANA_ACTIVE_FRAMES = { agShard: [3, 5, 7] }\n')
    grid = dict(source='assets/sprites/ben10/aliens/arcticguana.png', key_report=KEYREPORT, zero_tolerance_key=True, flood_fill_from_edges=True,
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, torso_window=TORSO_W,
                groups={k: v for k, v in GROUPS.items()}, fx_groups=FXG, head_swaps={k: dict(head=v[0], body=f'{v[1]} f{v[2]}', at=v[3]) for k, v in HEADS_SWAP.items()},
                excluded={k: dict(components=v[0], reason=v[1]) for k, v in EXCLUDED.items()}, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every animation strip (x2, nearest) on a checker, cell lines, body-centre (red) + feet baseline (green); then FX
    S = 2; LW = 120
    imgs = [(nm, Image.open(os.path.join(ROOT, PREFIX + nm + '_uniform.png'))) for nm in A]
    fximgs = [('fx:' + nm, Image.open(os.path.join(ROOT, FXPREFIX + nm + '.png'))) for nm in FXG]
    fximgs += [('ice:' + nm, Image.open(os.path.join(ROOT, p[2:]))) for nm, p in icefx.items()]
    cw = LW + max(i.width for _, i in imgs + fximgs) * S + 10
    ch = sum(i.height * S + 6 for _, i in imgs + fximgs) + 10
    sheet = Image.new('RGBA', (cw, ch), (40, 44, 52, 255)); d = ImageDraw.Draw(sheet); y = 5
    for nm, i in imgs + fximgs:
        bw, bh = i.width * S, i.height * S
        chk = Image.new('RGBA', (bw, bh), (70, 74, 82, 255)); cd = ImageDraw.Draw(chk)
        for yy in range(0, bh, 8):
            for xx in range(0, bw, 8):
                if (xx // 8 + yy // 8) % 2: cd.rectangle([xx, yy, xx + 7, yy + 7], fill=(58, 62, 70, 255))
        if not nm.startswith(('fx:', 'ice:')):
            for f in range(i.width // CELL_W):
                cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
                cd.line([((f * CELL_W + CX) * S, 0), ((f * CELL_W + CX) * S, bh)], fill=(200, 80, 80, 255))
            cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    # each source row previewed as an animation (x3, nearest, dark ground)
    for row in ('idle', 'run', 'agBreath', 'agShard', 'agCloud', 'agCharge', 'agBeamLoop', 'agBeamFire', 'transform', 'knockdown'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; frs = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, (28, 30, 36, 255)); b.alpha_composite(a)
            frs.append(b.convert('RGB').resize((CELL_W * 3, CELL_H * 3), Image.NEAREST))
        frs[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=frs[1:], duration=130, loop=0)
    print('anims', len(anim), 'fx', len(fx), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'key', KEYREPORT)
