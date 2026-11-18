#!/usr/bin/env python3
"""Slice the BENWOLF (Loboan) sheet into uniform game strips (Phase 1 of the BenWolf alien).

  python3 -I tools/ben10/slice_benwolf.py   # writes ben10_benwolf_ready_*.png, ben10_benwolf_fx_*.png, benwolfAssets.js, docs/ben10/aliens/benwolf/*

Source: assets/sprites/ben10/aliens/benwolf.png (377x701) = a byte copy of the tracked root file
benwolf_sprite_sheet_by_dragonrod342_d84osmt.png, found by contact sheet (grey wolf-like alien, bushy tail, green Omnitrix mark,
khaki background, labels "Stand / walk/run / jump / fall / crouch / Attack / Attack -> / ^ / v", blue ring FX, credit box).
Sheet by Dragonrod (the author asks for credit).
Rules (see docs/ben10/aliens/benwolf/SPRITE_LEDGER.md):
  * Clean pixel art: 18 exact colours, opaque, no anti-aliasing (no de-fringe pass needed).
  * Background = (196,197,167) khaki at every corner. Key = that EXACT colour, zero tolerance. No other pixel has it.
  * Palette collisions: the khaki is unique. Black (0,0,0) is both the sprite outline and the label text; the ring blue
    (63,72,204) is also the colour of the small diagram's arrow / dashed ring; pure white (255,255,255) exists ONLY in the
    credit box (the body whites are (224,224,224)). So annotation is removed BY COMPONENT (asserted list), never by colour.
  * NOT ART (excluded, every one assigned explicitly): the row labels (black text), the three "loop" labels + their bracket
    lines, the three arrow glyphs in "Attack -> / ^ / v", the small move diagram under Attack v (a 15x20 mini BenWolf + a grey
    <- arrow + a dashed blue ring with a -> arrow), and the white credit box with its text.
  * 8-connected components on the keyed mask. The free-floating blue rings (1 px outlines) are FX frames, ONE component
    each (asserted). The claw swooshes of Attack -> touch the bodies, so they stay in those frames.
  * anchor = FEET baseline (one row under the lowest light-grey claw pixel: the tail that hangs below the feet in Attack ^
    never drags it) + BODY CENTRE = the centre of the densest 20 px column window of the light (white / grey fur) pixels of
    the body component (the dark tail and the dark swooshes never drag it).
  * nearest-neighbour only: frames are copied 1:1, never cropped (asserted inside the cell).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/benwolf.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/benwolf')
KHAKI = (196, 197, 167)
LIGHT = [(167, 167, 167), (195, 195, 195), (224, 224, 224)]
RINGS = [(63, 72, 204), (112, 146, 190), (0, 162, 232), (153, 217, 234)]
TORSO_W = 20
ACTION_SCALE = 1.5    # native stand ~47 px -> x3 on screen (Ben spriteScale 2.0 x 1.5): an exact integer pixel scale
PREFIX = 'ben10_benwolf_ready_'
FXPREFIX = 'ben10_benwolf_fx_'

im = np.array(Image.open(SRC).convert('RGBA')).astype(np.int32)
H, W, _ = im.shape
assert (im[..., 3] == 255).all(), 'expected an opaque sheet'
rgb = im[..., :3]
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(rgb[y, x]) == KHAKI, 'corner is not the khaki key'
cols = {tuple(c) for c in rgb.reshape(-1, 3)}
bg = (rgb == np.array(KHAKI)).all(2)
alpha = ~bg
isLight = np.zeros((H, W), bool)
for c in LIGHT: isLight |= (rgb == np.array(c)).all(2)
isRing = np.zeros((H, W), bool)
for c in RINGS: isRing |= (rgb == np.array(c)).all(2)
isPureWhite = (rgb == 255).all(2)
KEYREPORT = dict(colours=len(cols), keyed_px=int(bg.sum()), key=KHAKI, tolerance=0,
                 pure_white_only_in_credit_box=True, ring_blue_shared_with_diagram_arrow=True, black_shared_by_outline_and_text=True)

# ── components (8-connected) keyed by their top-left (x0, y0) ──
lab, n = ndimage.label(alpha, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    c = dict(id=k + 1, x0=s[1].start, y0=s[0].start, x1=s[1].stop, y1=s[0].stop, n=int((lab[s] == k + 1).sum()))
    C[(c['x0'], c['y0'])] = c
P = lambda *xy: [C[t]['id'] for t in xy]
BYID = {c['id']: c for c in C.values()}
GROUPS = {
  'stand': [P(t) for t in [(7, 31), (68, 31), (132, 30), (204, 30)]],
  'run':   [P(t) for t in [(7, 107), (94, 100), (189, 100), (269, 110)]],
  'air':   [P(t) for t in [(9, 178), (78, 182), (125, 208)]],              # jump, fall, crouch
  'atk':   [P(t) for t in [(6, 287), (71, 287), (143, 287), (218, 287)]],  # Attack
  'fwd':   [P(t) for t in [(15, 362), (84, 365), (173, 373), (258, 383)]], # Attack -> (claw swooshes attached)
  'up':    [P(t) for t in [(20, 449), (73, 449), (135, 449), (189, 449)]], # Attack ^
  'low':   [P(t) for t in [(16, 553), (80, 552), (142, 552), (203, 552)]], # Attack v
}
FXG = {   # free-floating ring outlines, small -> large; the last two of each row sit under its "loop" bracket
  'howlRing': [P(t) for t in [(283, 295), (289, 292), (299, 285), (312, 279), (324, 280)]],
  'upRing':   [P(t) for t in [(250, 463), (246, 468), (239, 477), (231, 487), (232, 497)]],
  'lowRing':  [P(t) for t in [(260, 562), (266, 559), (276, 552), (289, 548), (307, 549)]],
}
FX_LOOP = {'howlRing': [3, 4], 'upRing': [3, 4], 'lowRing': [3, 4]}       # 0-based frame indices under the "loop" bracket
LABEL_XY = [(13, 14), (21, 14), (45, 14), (29, 16), (37, 16),                                   # Stand
            (27, 90), (35, 90), (43, 90), (11, 92), (19, 92), (51, 92), (59, 92), (67, 92),     # walk/run
            (15, 157), (76, 158), (92, 158), (100, 158), (188, 158), (12, 160), (20, 160), (28, 160), (36, 160), (84, 160),
            (148, 160), (156, 160), (164, 160), (172, 160), (180, 160),                         # jump fall crouch
            (14, 256), (22, 256), (30, 256), (54, 256), (38, 258), (46, 258),                   # Attack
            (15, 345), (23, 345), (31, 345), (55, 345), (39, 347), (47, 347),                   # Attack ->
            (21, 435), (29, 435), (37, 435), (61, 435), (45, 437), (53, 437),                   # Attack ^
            (18, 533), (26, 533), (34, 533), (58, 533), (42, 535), (50, 535)]                   # Attack v
EXCLUDED = {
  'labels': (P(*LABEL_XY), 'row label text ("Stand", "walk/run", "jump", "fall", "crouch", "Attack" x4): annotation, not art'),
  'arrow_glyphs': (P((69, 347), (78, 435), (75, 533)), 'the ->, ^, v glyphs after "Attack": annotation, not art'),
  'loop_labels': (P((317, 264), (320, 265), (324, 265), (328, 265), (316, 270),
                    (280, 490), (288, 491), (288, 494), (288, 498), (287, 502),
                    (301, 532), (304, 533), (308, 533), (312, 533), (300, 538)),
      'the three "loop" words + their bracket lines (Attack / Attack ^ / Attack v rings): annotation; recorded as FX_LOOP'),
  'move_diagram': (P((234, 604), (232, 611), (260, 609), (261, 612), (264, 612), (259, 615), (263, 617), (260, 619), (259, 625)),
      'the small figure under Attack v: a 15x20 mini BenWolf (a shrunk Attack v pose) with a grey <- arrow and a dashed blue ring '
      'with a -> arrow = a MOVE DIAGRAM (the howl goes out ahead while he leans back), not an animation frame. Excluded: at x3 a '
      '15x20 icon of a pose already on the sheet adds nothing to the HUD, and its arrows are annotation'),
  'credit_box': (P((29, 648)), 'the white credit box and its text ("BenWolf sprite sheet made by Dragonrod / please, give credits '
      'if used!"): kept as the ledger credit line, not art'),
}
used = set()
for fr in list(GROUPS.values()) + list(FXG.values()):
    for ids in fr: used |= set(ids)
for ids, _ in EXCLUDED.values(): used |= set(ids)
assert used == {c['id'] for c in C.values()}, ('unassigned components', sorted({c['id'] for c in C.values()} - used))
for ids, _ in EXCLUDED.values():
    assert len(ids) == len(set(ids))
for name, frs in FXG.items():                                             # each ring = ONE component of ring colours only
    for ids in frs:
        assert len(ids) == 1
        b = BYID[ids[0]]; m = lab[b['y0']:b['y1'], b['x0']:b['x1']] == b['id']
        assert isRing[b['y0']:b['y1'], b['x0']:b['x1']][m].all(), name
assert not isPureWhite[~np.isin(lab, EXCLUDED['credit_box'][0]) & alpha].any(), 'pure white outside the credit box'


def crop(ids):
    """the union box of the components (the first is the body), only their own pixels, 1:1"""
    cs = [BYID[i] for i in ids]
    x0, y0 = min(c['x0'] for c in cs), min(c['y0'] for c in cs); x1, y1 = max(c['x1'] for c in cs), max(c['y1'] for c in cs)
    m = np.isin(lab[y0:y1, x0:x1], ids)
    a = np.dstack([rgb[y0:y1, x0:x1], np.where(m, 255, 0)]).astype(np.uint8)
    b = BYID[ids[0]]
    bm = lab[b['y0']:b['y1'], b['x0']:b['x1']] == b['id']
    lm = bm & isLight[b['y0']:b['y1'], b['x0']:b['x1']]
    if not lm.any(): lm = bm                                              # an FX ring (no fur): its own box
    col = lm.sum(0).astype(np.int64)
    mid = int(np.argmax(np.convolve(col, np.ones(TORSO_W, np.int64), 'valid'))) + TORSO_W / 2 if len(col) > TORSO_W else len(col) / 2
    feet = int(np.where(lm.any(1))[0].max()) + 1                          # one row under the lowest claw pixel (the outline row)
    return a, (b['x0'] - x0) + mid, (b['y0'] - y0) + feet + 1, (b['y1'] - y0)


def fr(group, *nums): return [(group, i) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':        (fr('stand', 1, 2, 3, 4), 9, True, 'idle (Stand f1-4 loop)'),
  'walk':        (fr('run', 1, 2, 3, 4), 9, True, 'walk - the walk/run row SLOWED (speed 9; the row is one 4-frame cycle)'),
  'walk_back':   (fr('run', 4, 3, 2, 1), 9, True, 'walk back - walk/run REVERSED and slowed'),
  'run':         (fr('run', 3, 4), 4, True, 'run - walk/run f3-4 low gallop cycled FASTER (speed 4, 2-frame loop)'),
  'dash':        (fr('run', 1, 2), 3, True, 'dash - walk/run f1-2 (crouched push + full-stretch leap), fast'),
  'crouch':      (fr('air', 3), 6, False, 'crouch (the crouch frame)'),
  'jump':        (fr('air', 1), 6, False, 'jump rise (the jump frame)'),
  'doubleJump':  (fr('air', 1), 6, False, 'double jump - REUSED jump frame'),
  'fall':        (fr('air', 2), 6, True, 'jump fall (the fall frame) = the AIR body'),
  'guard':       (fr('air', 3), 6, False, 'guard / block - REUSED crouch (no block art)'),
  'crouchGuard': (fr('air', 3), 6, False, 'crouch block - REUSED crouch'),
  'blockHit':    (fr('air', 3), 6, False, 'block hit - REUSED crouch (the engine block flash shows the hit)'),
  'hurt':        (fr('air', 2), 6, False, 'hit light / heavy - REUSED fall frame (no hurt art)'),
  'hurt_air':    (fr('air', 2), 6, False, 'hit in the air - REUSED fall frame'),
  'knockdown':   (fr('air', 2, 3), 8, False, 'knockdown - REUSED fall -> crouch (no knockdown / lying art)'),
  'getup':       ([('air', 3), ('stand', 1)], 7, False, 'get-up - REUSED crouch -> Stand f1 (no get-up art)'),
  'dizzy':       (fr('stand', 1), 12, True, 'dizzy - REUSED Stand f1 (no dizzy art)'),
  'transform':   (fr('stand', 1), 6, False, 'transform-in - REUSED Stand f1 (no transform art; the engine Omnitrix flash plays over it)'),
  'taunt':       (fr('stand', 1, 2, 3, 4), 6, False, 'taunt - REUSED Stand f1-4'),
  'win':         (fr('up', 4), 9, True, 'win - REUSED Attack ^ f4 (howling up)'),
  'lose':        (fr('air', 3), 6, False, 'lose - REUSED crouch (no lose art)'),
  'idleAlt':     (fr('stand', 1), 9, True, 'idle alt - REUSED Stand f1'),
  'light':       (fr('atk', 1, 2), 3, False, 'JAB - Attack f1-2'),
  'heavy':       (fr('fwd', 2, 4), 6, False, 'HEAVY - Attack -> f2 (big claw swoosh, the hit frame) -> f4 low follow-through'),
  'down':        (fr('air', 3), 5, False, 'LOW - the crouch frame + a procedural claw spark (render)'),
  'up':          (fr('up', 1, 2), 5, False, 'LAUNCHER - Attack ^ f1-2'),
  'air':         (fr('air', 2), 6, False, 'AIR - the fall frame (the AIR body) + a procedural claw spark (render)'),
  'grab':        (fr('fwd', 4), 4, False, 'grab - REUSED Attack -> f4'),
  'bwHowl':      (fr('atk', 3, 4), 5, False, 'SONIC HOWL cast (Attack f3-4; the ring loop is the FX strip howlRing)'),
  'bwHowlHold':  (fr('atk', 4), 6, True, 'SONIC HOWL hold (Attack f4, mouth open, while the rings keep spawning)'),
  'bwRake':      (fr('fwd', 2, 3, 4), 4, False, 'CLAW RAKE (Attack -> f2-4: the two big swooshes, then the follow-through)'),
  'bwPounce':    (fr('fwd', 1), 6, False, 'POUNCE leap (Attack -> f1)'),
  'bwRise':      (fr('up', 3, 4), 5, False, 'RISING HOWL cast (Attack ^ f3-4; the stacked rings are the FX strip upRing)'),
  'bwLow':       (fr('low', 1, 2, 3, 4), 4, False, 'LOW HOWL cast (Attack v f1-4; the horizontal rings are the FX strip lowRing)'),
  'bwDive':      (fr('fwd', 2), 6, False, 'DIVE CLAW (Attack -> f2 swoosh frame)'),
  'bwDodge':     (fr('run', 2), 4, False, 'LUPINE DODGE (walk/run f2, the full-stretch leap frame)'),
  'bwClaw':      (fr('fwd', 2, 3), 3, False, 'HOWLING MOON capture claws (Attack -> f2-3 swoosh frames)'),
}

frames_all = {}
ext, top, bot = 0, 0, 0
for k, (frs, *_) in A.items():
    for grp, i in frs:
        ids = GROUPS[grp][i - 1]
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
        fx[name] = dict(sheet='./' + path, frames=len(cells), w=fw, h=fh, loop=FX_LOOP[name])
        ledger.append(dict(fx=name, components=frs, loop=FX_LOOP[name]))
    return anim, fx, ledger


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, fx, led = build()
    with open(os.path.join(ROOT, 'benwolfAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_benwolf.py from the BenWolf sheet (khaki-background pixel sheet by Dragonrod; see ledger).\n')
        fh.write('// See docs/ben10/aliens/benwolf/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen x3 (actionScale 1.5).\n')
        fh.write('export const BENWOLF_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const BENWOLF_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
        fh.write('// ring FX strips cut from the sheet (render-only); `loop` = the frames under the sheet\'s "loop" bracket (the sustain)\n')
        fh.write('export const BENWOLF_FX = ' + json.dumps(fx, indent=2) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/benwolf.png', credit='Sheet by Dragonrod', key_report=KEYREPORT, zero_tolerance_key=True,
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, torso_window=TORSO_W,
                groups=GROUPS, fx_groups=FXG, fx_loop=FX_LOOP,
                excluded={k: dict(components=v[0], reason=v[1]) for k, v in EXCLUDED.items()}, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every animation strip (x2, nearest) on a checker, cell lines, body-centre (red) + feet baseline (green); then FX
    S = 2; LW = 110
    imgs = [(nm, Image.open(os.path.join(ROOT, PREFIX + nm + '_uniform.png'))) for nm in A]
    fximgs = [('fx:' + nm, Image.open(os.path.join(ROOT, FXPREFIX + nm + '.png'))) for nm in FXG]
    cw = LW + max(i.width for _, i in imgs + fximgs) * S + 10
    ch = sum(i.height * S + 6 for _, i in imgs + fximgs) + 10
    sheet = Image.new('RGBA', (cw, ch), (40, 44, 52, 255)); d = ImageDraw.Draw(sheet); y = 5
    for nm, i in imgs + fximgs:
        bw, bh = i.width * S, i.height * S
        chk = Image.new('RGBA', (bw, bh), (70, 74, 82, 255)); cd = ImageDraw.Draw(chk)
        for yy in range(0, bh, 8):
            for xx in range(0, bw, 8):
                if (xx // 8 + yy // 8) % 2: cd.rectangle([xx, yy, xx + 7, yy + 7], fill=(58, 62, 70, 255))
        if not nm.startswith('fx:'):
            for f in range(i.width // CELL_W):
                cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
                cd.line([((f * CELL_W + CX) * S, 0), ((f * CELL_W + CX) * S, bh)], fill=(200, 80, 80, 255))
            cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        else:
            fw = fx[nm[3:]]['w']
            for f in range(i.width // fw): cd.line([(f * fw * S, 0), (f * fw * S, bh)], fill=(120, 120, 140, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    # each labeled source row previewed as an animation (x3, nearest, dark ground)
    for row in ('idle', 'walk', 'run', 'light', 'heavy', 'up', 'bwHowl', 'bwRake', 'bwRise', 'bwLow', 'knockdown'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; frs = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, (28, 30, 36, 255)); b.alpha_composite(a)
            frs.append(b.convert('RGB').resize((CELL_W * 3, CELL_H * 3), Image.NEAREST))
        frs[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=frs[1:], duration=130, loop=0)
    for name in FXG:                                                     # the ring loops: grow frames once, then the loop pair
        st = Image.open(os.path.join(ROOT, FXPREFIX + name + '.png')); fw = fx[name]['w']; seq = list(range(fx[name]['frames'])) + FX_LOOP[name] * 3
        frs = []
        for j in seq:
            a = st.crop((j * fw, 0, (j + 1) * fw, st.height)); b = Image.new('RGBA', a.size, (28, 30, 36, 255)); b.alpha_composite(a)
            frs.append(b.convert('RGB').resize((fw * 3, st.height * 3), Image.NEAREST))
        frs[0].save(os.path.join(DOC, f'preview_fx_{name}.gif'), save_all=True, append_images=frs[1:], duration=100, loop=0)
    print('anims', len(anim), 'fx', len(fx), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'key', KEYREPORT)
