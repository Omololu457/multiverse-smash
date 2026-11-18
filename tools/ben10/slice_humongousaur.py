#!/usr/bin/env python3
"""Slice the HUMONGOUSAUR (Vaxasaurian) sheet into uniform game strips (Phase 1 of the Humongousaur alien).

  python3 -I tools/ben10/slice_humongousaur.py   # writes ben10_humongousaur_ready_*.png, humongousaurAssets.js, docs/ben10/aliens/humongousaur/*

Source: assets/sprites/ben10/aliens/humongousaur.png (1299x2187) = a byte copy of the tracked root file
humungousaur_ben_10_sprites_sheet_by_ipmugenofficial_djlwsq9.png, found by contact sheet (brown / tan dinosaur-like muscular
alien with a tail and a green Omnitrix chest dot, solid light-blue background, labels STAND / WALK / CROUCH/JUMP / GUARD / FALL /
PUNCH / PUNCH UP / PUNCH BACK / TACKLE / GROUND ATTACK / GROUND STRIKE / CRUSH / PUSH / ROAR). The two other root Humongousaur
images (humungasuar.png, humungousaur_by_dragonrod342_db34ddm.png) are a different, white-background sheet and are NOT used.
Rules (see docs/ben10/aliens/humongousaur/SPRITE_LEDGER.md):
  * Background = (0,180,243) (#00B4F3) at every corner. Key = EXACT colour, zero tolerance: only pixels equal to it are keyed.
  * The sheet is soft (cartoon shading, anti-aliased edges): every outline pixel is a BLEND of the art and the key blue, a ~2 px
    blue ring. Keying the exact colour alone would leave a blue fringe, so a DE-FRINGE pass (no filter, no resample, no colour
    change — kept pixels are copied 1:1) then removes, by connectivity from the keyed background, the edge pixels that are
    blue-dominant (b - r > 20 and b >= g: the blend is more key than art; his palette is brown / tan / orange / dark green,
    whose b - r is negative) or a TEAL tan+key blend (b - r > 40: tan dust over the blue comes out teal, g >= b), plus enclosed blue pockets (background seen through dust strands / between limbs) that hold a
    clearly key-blue pixel (b - r > 60), plus TEAL blends anywhere (g > r + 10, b > r, |g - b| <= 25: brown dust over blue;
    his palette has none; the Omnitrix dot is g >> b and is kept whole). Specks of <= 3 px orphaned by that pass are dropped. Reported in source_grid.json.
  * 8-connected components on the ORIGINAL art mask, every one assigned explicitly (asserted). EXCLUDED (not art): every row
    label (white text with a blue outline; 18 components). The brown swoosh / dust FX that touch a body (Punch f3, Punch Up f5,
    Punch Back f5, Ground Attack f3, Ground Strike f3) are part of that body's component, so they stay in that frame.
  * anchor = feet baseline (the frame's bottom row) + BODY CENTRE = the centre of the densest 34 px-wide column window (the
    torso), so the tail, an outstretched arm or a dust swoosh never drags it.
  * nearest-neighbour only: frames are copied 1:1, never cropped (asserted inside the cell).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/humongousaur.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/humongousaur')
BG = (0, 180, 243)
FRINGE_BR = 20        # edge pixel removed when b - r > this (and b >= g) and it connects to the keyed background
POCKET_BR = 60        # an enclosed blue region is background when it holds a pixel with b - r > this
TEAL_GB = 25          # teal blend: |g - b| <= this (with g > r + 10 and b > r)
TEAL_BR = 40          # tan dust + key blends come out TEAL (g >= b): also a candidate when b - r > this (palette b - r < 0)
TORSO_W = 34          # body-centre window (native px)
ACTION_SCALE = 0.75   # native stand ~96 px -> x1.5 on screen (Ben spriteScale 2.0 x 0.75) = ~144 px, the tallest READY alien
PREFIX = 'ben10_humongousaur_ready_'

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not the blue key'
key = (im == np.array(BG)).all(axis=2)                                   # zero tolerance: exact key only
art = ~key
R, G, B = im[..., 0], im[..., 1], im[..., 2]

# ── components on the ORIGINAL art mask (FX touching a body stay with it) ──
lab, n = ndimage.label(art, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    m = lab[s] == k + 1
    C[k + 1] = dict(id=k + 1, y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, n=int(m.sum()))
hh = lambda c: c['y1'] - c['y0']
TEXT = sorted(c['id'] for c in C.values() if hh(c) <= 20)                # row labels (16 px tall white text)
BODY = lambda c: c['id'] not in TEXT

# ── DE-FRINGE (alpha only; colours are never changed) ──
cand = (((B - R > FRINGE_BR) & (B >= G)) | (B - R > TEAL_BR)) & art   # blue-dominant, or a teal tan+key blend
cl, _ = ndimage.label(cand | key, structure=np.ones((3, 3)))
fringe = np.isin(cl, np.unique(cl[key])) & cand                          # blue-dominant pixels connected to the background
pl, pn = ndimage.label(cand & ~fringe, structure=np.ones((3, 3)))
strong = np.unique(pl[(cand & ~fringe) & (B - R > POCKET_BR)])
pocket = np.isin(pl, strong[strong > 0])                                  # enclosed background pockets
# TEAL blends anywhere (brown dust strands over the blue: g and b both above r, g ~ b). His palette never has them (brown /
# tan / orange: r > g > b; the Omnitrix dot: g >> b, kept 100 %: `omnitrix_dot_core_kept`), so they are removed wherever they
# are; `teal_inside_art` counts those >= 3 px inside the art mask (the semi-transparent dust strands of the FX frames).
DOT = (G > R + 20) & (G > B + 30) & art                                  # the green Omnitrix dot core (g >> b: never teal)
teal = (G > R + 10) & (B > R) & (np.abs(G - B) <= TEAL_GB) & art
depth = ndimage.distance_transform_cdt(art, metric='chessboard')
alpha = art & ~fringe & ~pocket & ~teal
sl, sn = ndimage.label(alpha, structure=np.ones((3, 3)))
ssz = ndimage.sum(alpha, sl, range(1, sn + 1))
specks = np.isin(sl, np.where(ssz <= 3)[0] + 1)
alpha &= ~specks
alpha &= ~np.isin(lab, TEXT)
edge = alpha & ndimage.binary_dilation(~alpha, np.ones((3, 3)))
KEYREPORT = dict(key=list(BG), keyed_exact=int(key.sum()), fringe_removed=int(fringe.sum()), pockets_removed=int(pocket.sum()),
                 teal_removed=int((teal & ~fringe & ~pocket).sum()), teal_inside_art=int((teal & ~fringe & ~pocket & (depth >= 3)).sum()),
                 specks_removed=int(specks.sum()), edge_pixels=int(edge.sum()),
                 edge_blue_dominant_left=int((edge & (((B - R > FRINGE_BR) & (B >= G)) | (B - R > TEAL_BR))).sum()),
                 kept_blue_dominant_anywhere=int((alpha & (((B - R > FRINGE_BR) & (B >= G)) | (B - R > TEAL_BR))).sum()),
                 palette_collision_interior=int((alpha & ~edge & (((B - R > FRINGE_BR) & (B >= G)) | (B - R > TEAL_BR))).sum()),
                 omnitrix_dot_core_kept=int((alpha & DOT).sum()), omnitrix_dot_core_source=int((DOT & ~np.isin(lab, TEXT)).sum()))

# ── rows (sheet order); each = (name, y-range of the figures, expected frame count) ──
ROWS = [('stand', 50, 160, 6), ('walk', 205, 310, 8), ('cj', 355, 470, 8), ('guard', 500, 605, 4), ('fall', 640, 760, 4),
        ('punch', 805, 905, 4), ('pup', 905, 1045, 6), ('pback', 1090, 1205, 6), ('tackle', 1255, 1360, 4),
        ('gatk', 1385, 1515, 5), ('gstrike', 1538, 1680, 6), ('crush', 1730, 1840, 6), ('push', 1895, 1995, 8), ('roar', 2025, 2130, 5)]
GROUPS = {}
for name, y0, y1, k in ROWS:
    ids = [c['id'] for c in sorted(C.values(), key=lambda c: c['x0']) if BODY(c) and y0 <= c['y0'] and c['y1'] <= y1]
    assert len(ids) == k, (name, ids)
    GROUPS[name] = ids
used = set(TEXT)
for ids in GROUPS.values(): used |= set(ids)
assert used == set(C), ('unassigned components', sorted(set(C) - used))


def crop(cid):
    c = C[cid]
    m = (lab[c['y0']:c['y1'], c['x0']:c['x1']] == cid) & alpha[c['y0']:c['y1'], c['x0']:c['x1']]
    rgb = im[c['y0']:c['y1'], c['x0']:c['x1']]
    a = np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8)
    ys = np.where(m.any(1))[0]; xs = np.where(m.any(0))[0]                # trim rows / cols the de-fringe emptied (never art)
    return a[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]


def body_mid_x(a):
    col = (a[..., 3] > 0).sum(0).astype(np.int64)
    if len(col) <= TORSO_W: return len(col) / 2
    win = np.convolve(col, np.ones(TORSO_W, np.int64), 'valid')
    i = int(np.argmax(win))                                              # first max: deterministic
    return i + TORSO_W / 2


def g(name, *nums): return [(name, i) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':        (g('stand', 1, 2, 3, 4, 5, 6), 8, True,  'idle (STAND f1-6 loop)'),
  'walk':        (g('walk', 1, 2, 3, 4, 5, 6, 7, 8), 7, True,  'walk (WALK f1-8)'),
  'walk_back':   (g('walk', 8, 7, 6, 5, 4, 3, 2, 1), 7, True,  'walk back - WALK REVERSED'),
  'run':         (g('walk', 1, 2, 3, 4, 5, 6, 7, 8), 4, True,  'run - the WALK cycle played FASTER (speed 4 vs 7; no run art)'),
  'dash':        (g('walk', 3, 4, 5), 3, True,  'dash - WALK f3-5, fast'),
  'crouch':      (g('cj', 1, 2, 3), 4, False, 'crouch (CROUCH/JUMP f1-3: crouch down, crouch idle held on f3)'),
  'jump':        (g('cj', 4, 5, 6), 5, False, 'jump rise (CROUCH/JUMP f4-5) to apex (f6)'),
  'doubleJump':  (g('cj', 4, 5, 6), 4, False, 'double jump - REUSED jump rise f4-6'),
  'fall':        (g('cj', 7, 8), 7, True,  'jump fall (CROUCH/JUMP f7-8)'),
  'guard':       (g('guard', 1, 2), 6, False, 'guard idle / block (GUARD f1-2)'),
  'crouchGuard': (g('guard', 2), 6, False, 'block while crouching - REUSED GUARD f2 (no crouch-guard art)'),
  'blockHit':    (g('guard', 3), 6, False, 'block hit (GUARD f3)'),
  'hurt':        (g('fall', 1, 2), 5, False, 'hit react (FALL f1-2)'),
  'hurt_air':    (g('fall', 2), 6, False, 'hit in the air - REUSED FALL f2'),
  'knockdown':   (g('fall', 3, 4), 6, False, 'knockdown (FALL f3) -> lying (f4)'),
  'getup':       (g('fall', 4, 3), 6, False, 'get-up - FALL f4 -> f3 REVERSED (no get-up art; the crouch follows)'),
  'dizzy':       (g('guard', 4), 12, True, 'dizzy - REUSED GUARD f4 curled guard (no dizzy pose)'),
  'transform':   (g('roar', 1, 2, 3, 4, 5), 4, False, 'transform-in - REUSED ROAR f1-5'),
  'taunt':       (g('roar', 1, 2, 3, 4, 5), 6, False, 'taunt (ROAR f1-5)'),
  'win':         (g('roar', 5), 9, True,  'win pose (ROAR f5)'),
  'lose':        (g('fall', 4), 6, False, 'lose pose (FALL f4 lying)'),
  'light':       (g('punch', 1, 2), 3, False, 'JAB (PUNCH f1-2)'),
  'heavy':       (g('punch', 3, 4), 6, False, 'HEAVY (PUNCH f3-4: swing with the extracted swoosh, 190 px)'),
  'down':        (g('gatk', 2, 3), 4, False, 'LOW (GROUND ATTACK f2-3: low swipe with dust, hits low)'),
  'up':          (g('pup', 1, 2, 3, 4, 5, 6), 4, False, 'LAUNCHER (PUNCH UP f1-6 wind-up crouch to rising fist; f5-6 uppercut)'),
  'air':         (g('fall', 1), 6, False, 'AIR - FALL f1 + a procedural render-only fist streak'),
  'grab':        (g('crush', 1, 2), 4, False, 'grab - REUSED CRUSH f1-2 reach'),
  'hmTackle':    (g('tackle', 1, 2, 3, 4), 4, True,  'CHARGING TACKLE (TACKLE f1-4 shoulder-first lunge)'),
  'hmQuake':     (g('gstrike', 1, 2, 3, 4, 5, 6), 4, False, 'QUAKE SLAM (GROUND STRIKE f1 tall, f2 lean, f3 slam + dust, f4-6 aftermath)'),
  'hmRoar':      (g('roar', 1, 2, 3, 4, 5), 4, False, 'ROAR / GROWTH cast (ROAR f1 wind-up, f2-5 roar)'),
  'hmCrush':     (g('crush', 1, 2, 3, 4, 5, 6), 3, False, 'CRUSH GRAB (CRUSH f1-2 reach, f3-5 hunching grab, f6 release)'),
  'hmCrushHold': (g('crush', 3, 4, 5), 5, True,  'CRUSH GRAB hold ticks (CRUSH f3-5 loop)'),
  'hmPush':      (g('push', 1, 2, 3, 4, 5, 6, 7, 8), 4, True,  'PUSH THROUGH (PUSH f1-8 loop, both arms forward)'),
  'hmStomp':     (g('gatk', 1), 6, False, 'METEOR STOMP dive body (GROUND ATTACK f1 arms-up)'),
  'hmStompLand': (g('gatk', 4, 5), 5, False, 'METEOR STOMP landing (GROUND ATTACK f4-5 crouched aftermath)'),
  'hmBackhand':  (g('pback', 1, 2, 3, 4, 5, 6), 4, False, 'TAIL SLAM / BACKHAND (PUNCH BACK f1-5 wind-up + spin with swoosh, f6 finisher arm)'),
  'hmUltStomp':  (g('gatk', 1, 2, 3, 4) + g('gstrike', 3), 4, False, 'EXTINCTION EVENT stomps (GROUND ATTACK f1-4 + GROUND STRIKE f3 slam)'),
}
SRCMAP = GROUPS

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
    for key_, (frames, speed, loop, role) in A.items():
        cells = []
        for grp, i in frames:
            cid = SRCMAP[grp][i - 1]
            a = crop(cid)
            cell, off = place(a); cells.append(cell)
            c = C[cid]
            ledger.append(dict(anim=key_, group=grp, frame=i, component=cid, src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']], offset=off, role=role))
        path = f'{PREFIX}{key_}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key_] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build()
    with open(os.path.join(ROOT, 'humongousaurAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_humongousaur.py from the Humongousaur sheet (light-blue labeled sheet; source: see ledger).\n')
        fh.write('// See docs/ben10/aliens/humongousaur/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen size from actionScale\n')
        fh.write('// (the Size tiers and the ult swap in copies of this table with a fixed, stepped actionScale: never smooth-scaled).\n')
        fh.write('export const HUMONGOUSAUR_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const HUMONGOUSAUR_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/humongousaur.png', key_report=KEYREPORT, zero_tolerance_key=True,
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, torso_window=TORSO_W,
                groups=GROUPS, removed_text_components=TEXT, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every animation strip (x2, nearest) on a checker, cell lines, body-centre (red) + feet baseline (green)
    rows = [(k, PREFIX + k + '_uniform.png') for k in A]
    S = 2; LW = 120
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
        for f in range(i.width // CELL_W):
            cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
            cd.line([((f * CELL_W + CX) * S, 0), ((f * CELL_W + CX) * S, bh)], fill=(200, 80, 80, 255))
        cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    # each labeled row previewed as an animation (x2, nearest, on a dark ground so any blue fringe would show)
    for row in ('idle', 'walk', 'crouch', 'jump', 'fall', 'guard', 'hurt', 'knockdown', 'light', 'heavy', 'up', 'hmBackhand', 'hmTackle',
                'down', 'hmQuake', 'hmCrush', 'hmPush', 'hmRoar'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; fr = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, (28, 30, 36, 255)); b.alpha_composite(a)
            fr.append(b.convert('RGB').resize((CELL_W * 2, CELL_H * 2), Image.NEAREST))
        fr[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=fr[1:], duration=130, loop=0)
    print('anims', len(anim), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'text', len(TEXT), 'key', KEYREPORT)
