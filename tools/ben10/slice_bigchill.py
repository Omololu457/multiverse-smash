#!/usr/bin/env python3
"""Slice the BIG CHILL (Necrofriggian) sheet into uniform game strips (Phase 1 of the Big Chill alien).

  python3 -I tools/ben10/slice_bigchill.py   # writes ben10_bigchill_ready_*.png, bigchillAssets.js, docs/ben10/aliens/bigchill/*

Source: assets/sprites/ben10/aliens/bigchill.png (2376x5660) = a byte copy of the tracked root file
"DS _ DSi - Ben 10 Alien Force_ Vilgax Attacks - Playable Characters - Big Chill.png" (owner choice 2026-11-18: the
Fun-tech.tk sheet named in the brief is not on this machine; this DS rip is used instead). Layout: a teal (0,128,128) page,
white row LABELS (text, not art), and one rectangular canvas per frame whose background is ALREADY TRANSPARENT.
Rules (see docs/ben10/aliens/bigchill/SPRITE_LEDGER.md):
  * Alpha is strictly 0 / 255 (asserted): the key is alpha == 0 (the rip's own transparency), zero tolerance, no colour key
    at all, so the dark-blue / cyan palette can never collide with a key and no fringe or halo can exist (asserted: no
    teal / label pixel is ever copied: only pixels INSIDE a frame canvas are read).
  * Canvases = the non-teal rectangles; grouped into rows by y, rows mapped to their printed labels (ROWS, read from the
    sheet, asserted by count). Labels / the "Big Chill Sheet" title / the tiny legend at the top are teal-page text: never read.
  * Each frame canvas is copied WHOLE (1:1, nearest-neighbour, never cropped, never filtered): wings, claws, antennae, mouth
    sparks and in-frame icicle trails stay with their frame. The one exception is atk_AS (ICE SPIRE): its free-standing ice
    spires (components not touching the body, right of it) are cut out to an FX strip so the game can place them at the
    spire hitboxes (asserted: they never touch the body).
  * Anchor per ROW (keeps the authored motion inside a row): x = the body centre (densest 16 px column window of the
    largest component) of the row's FIRST frame, y = that frame's lowest body pixel (feet baseline; for wings-spread air rows
    the dangling feet = a consistent hover offset under the torso).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/bigchill.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/bigchill')
TEAL = (0, 128, 128)
MAGENTA = (248, 0, 248)   # opaque fill behind atk_JS2 / atk_JS3 only: exact colour, zero tolerance, edge-connected
TORSO_W = 16
ACTION_SCALE = 1.0    # native stand ~55 px -> x2 on screen (Ben spriteScale 2.0 x 1.0): an exact integer pixel scale, ~110 px
PREFIX = 'ben10_bigchill_ready_'
FXPREFIX = 'ben10_bigchill_fx_'
ROWS = ['atk_A', 'hit_knock_back', 'hit_knock_back_idle', 'hit_knock_back_recover', 'hit_L', 'idle', 'idle2block', 'idle2duck',
        'idle2run', 'jump_double', 'jump_double_land', 'jump_down', 'jump_land', 'jump_peak', 'jump_start', 'jump_up', 'run',
        'run2idle', 'teeter', 'timeout', 'transform', 'atk_AA', 'atk_AAA', 'atk_AAS', 'atk_AS', 'atk_cS', 'atk_jump_A',
        'atk_jump_A2', 'atk_jump_cS', 'atk_jump_S', 'atk_S', 'block_hit', 'block_idle', 'block2idle', 'duck_idle', 'duck2idle',
        'glide', 'hit_H']
FX_ROWS = ['ChrgParticle2', 'atk_JS', 'atk_JS2', 'atk_JS3', 'atk_JS4', 'atk_S_proj', 'ChrgParticle1']

im = np.array(Image.open(SRC).convert('RGBA')).astype(np.int32)
H, W, _ = im.shape
assert set(np.unique(im[..., 3]).tolist()) <= {0, 255}, 'expected binary alpha'
rgb = im[..., :3]
teal = (rgb == np.array(TEAL)).all(2) & (im[..., 3] == 255)
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert teal[y, x], 'corner is not the teal page'
lab, n = ndimage.label(~teal)
canv = []
for i, s in enumerate(ndimage.find_objects(lab)):
    h, w = s[0].stop - s[0].start, s[1].stop - s[1].start
    m = lab[s] == i + 1
    if h < 8 or w < 8 or not m.all(): continue                 # canvases are solid rectangles; label glyphs are not
    if not (im[s][..., 3] == 0).any(): continue                 # a canvas always has transparent background
    canv.append((s[0].start, s[1].start, h, w))
canv.sort()
rows = []
for c in canv:
    if rows and abs(rows[-1][0][0] - c[0]) < 5: rows[-1].append(c)
    else: rows.append([c])
for r in rows: r.sort(key=lambda c: c[1])
assert len(rows) == len(ROWS) + len(FX_ROWS), ('row count', len(rows))
GROUP = {name: rows[i] for i, name in enumerate(ROWS + FX_ROWS)}
KEYREPORT = dict(key='alpha==0 (source transparency)', partial_alpha_px=0, teal_px_copied=0, opaque_black_px=int(((rgb == 0).all(2) & (im[..., 3] == 255)).sum()))


def canvas(c):
    y, x, h, w = c
    a = im[y:y + h, x:x + w].astype(np.uint8).copy()
    a[a[..., 3] == 0] = 0                                        # transparent pixels carry no colour
    h_, w_ = a.shape[:2]                                             # the ripper's origin MARKER: 2 opaque black px at the
    mk = a[h_ - 1, w_ - 2:w_]                                        # canvas's bottom-right corner, isolated (asserted)
    if (mk[:, 3] == 255).all() and (mk[:, :3] == 0).all():
        win = a[h_ - 2:h_, w_ - 3:w_, 3] == 255
        if win.sum() == 2: a[h_ - 1, w_ - 2:w_] = 0; KEYREPORT['marker_px_removed'] = KEYREPORT.get('marker_px_removed', 0) + 2
        else: KEYREPORT['marker_kept_touching_art'] = KEYREPORT.get('marker_kept_touching_art', 0) + 1
    mg = (a[..., :3] == np.array(MAGENTA)).all(2) & (a[..., 3] == 255)   # the two diagonal shard tiles' opaque magenta fill
    if mg.any():
        ml, _ = ndimage.label(mg); edge = set(np.unique(np.concatenate([ml[0], ml[-1], ml[:, 0], ml[:, -1]])).tolist()) - {0}
        kill = np.isin(ml, list(edge)); assert kill.sum() == mg.sum(), 'enclosed magenta'
        a[kill] = 0; KEYREPORT['magenta_keyed_px'] = KEYREPORT.get('magenta_keyed_px', 0) + int(kill.sum())
    assert not ((a[..., :3] == np.array(TEAL)).all(2) & (a[..., 3] == 255)).any()
    return a


def body_anchor(a):
    op = a[..., 3] == 255
    l, k = ndimage.label(op, structure=np.ones((3, 3)))
    if k == 0: return a.shape[1] / 2, a.shape[0] - 1, op
    sizes = ndimage.sum(op, l, range(1, k + 1)); b = l == (int(np.argmax(sizes)) + 1)
    col = b.sum(0); best, bx = -1, 0
    for x0 in range(0, max(1, b.shape[1] - TORSO_W + 1)):
        v = col[x0:x0 + TORSO_W].sum()
        if v > best: best, bx = v, x0
    ys = np.where(b.any(1))[0]
    return bx + TORSO_W / 2, int(ys[-1]), b


SPIRES = []                                                       # atk_AS: cut the free ice spires to an FX strip


def split_spires(a):
    # a spire = a component that is ICE (>= 70 % light-cyan pixels: G >= 150) and >= 40 px; the body is dark blue
    op = a[..., 3] == 255
    l, k = ndimage.label(op, structure=np.ones((3, 3)))
    free = np.zeros_like(op)
    for j in range(1, k + 1):
        cm = l == j
        if cm.sum() >= 40 and (a[cm][:, 1] >= 150).mean() >= 0.7: free |= cm
    if not free.any(): return a, None
    rest = op & ~free
    assert not (ndimage.binary_dilation(free, structure=np.ones((3, 3))) & rest & (ndimage.binary_dilation(rest) & ~free)).sum() > 40, 'spire fused to the body'
    sp = np.zeros_like(a); sp[free] = a[free]
    body = a.copy(); body[free] = 0
    ys, xs2 = np.where(free)
    return body, sp[ys.min():ys.max() + 1, xs2.min():xs2.max() + 1]


# ── animation table: key → ([(row, frame#1-based), ...], speed, loop, role) ──────────────────────────────────────────
def fr(row, *idx): return [(row, i) for i in idx] if idx else [(row, i + 1) for i in range(len(GROUP[row]))]
A = {
  'idle':        (fr('idle'), 8, True, 'idle, wings CLOSED (hooded cloak)'),
  'walk':        (fr('run'), 9, True, 'walk = the run row cycled SLOWLY (no separate walk on the sheet)'),
  'walk_back':   (fr('run'), 10, True, 'walk back = the run row cycled slowly (mirrored by the engine facing)'),
  'run':         (fr('run'), 4, True, 'run, wings closed (cycled fast)'),
  'dash':        (fr('run'), 3, True, 'dash = the run row cycled fastest'),
  'crouch':      (fr('duck_idle'), 8, True, 'crouch (duck_idle)'),
  'jump':        (fr('jump_start') + fr('jump_up'), 5, False, 'jump rise (jump_start + jump_up)'),
  'doubleJump':  (fr('jump_double'), 4, False, 'double jump: the wing-opening spin'),
  'fall':        (fr('jump_peak') + fr('jump_down'), 6, False, 'fall (jump_peak + jump_down)'),
  'guard':       (fr('block_idle'), 6, True, 'guard = wings wrapped (block_idle); also the COCOON hold'),
  'crouchGuard': (fr('block_idle'), 6, True, 'crouch guard = block_idle (no crouch block on the sheet)'),
  'blockHit':    (fr('block_hit'), 3, False, 'block hit (wings wrapped, jolt)'),
  'hurt':        (fr('hit_L'), 3, False, 'light hurt (hit_L)'),
  'hurt_air':    (fr('hit_H'), 3, False, 'air / heavy hurt (hit_H)'),
  'knockdown':   (fr('hit_knock_back') + fr('hit_knock_back_idle'), 5, False, 'knockdown (hit_knock_back + lying idle)'),
  'getup':       (fr('hit_knock_back_recover'), 2, False, 'get-up (hit_knock_back_recover, 25 frames played fast)'),
  'dizzy':       (fr('teeter'), 6, True, 'dizzy = REUSED teeter row (no dizzy on the sheet)'),
  'transform':   (fr('transform'), 8, False, 'transform (1 frame)'),
  'taunt':       (fr('idle2block') + fr('block2idle'), 8, False, 'taunt = wing flare (idle2block + block2idle)'),
  'win':         (fr('jump_double', 7), 8, False, 'win = REUSED jump_double f7 (upright, wings open)'),
  'lose':        (fr('timeout'), 6, False, 'lose / timeout revert (timeout row)'),
  'idleAlt':     (fr('glide'), 6, True, 'wings-OPEN hover idle = glide row (the flight frames)'),
  'light':       (fr('atk_A'), 2, False, 'JAB: claw + frost streak (atk_A)'),
  'heavy':       (fr('atk_AAS'), 2, False, 'HEAVY: wing strike with the ice edge skimming the ground (atk_AAS)'),
  'down':        (fr('atk_S'), 2, False, 'LOW: the low crouching claw (atk_S)'),
  'up':          (fr('atk_jump_S'), 2, False, 'LAUNCHER: rising wing sweep with the crescent (atk_jump_S, ground-anchored)'),
  'air':         (fr('atk_jump_A'), 3, False, 'AIR: wing flip slash (atk_jump_A)'),
  'grab':        (fr('atk_AA'), 3, False, 'grab = REUSED atk_AA reach'),
  'bcBreath':    (fr('atk_AAA'), 2, False, 'FREEZE BREATH (atk_AAA: the ice blast at the mouth / claws)'),
  'bcBreathHold':(fr('atk_AAA', 6, 7, 8, 9), 3, True, 'FREEZE BREATH hold (atk_AAA f6-9 loop)'),
  'bcWingCut':   (fr('atk_jump_S'), 2, False, 'FROST WING CUT (atk_jump_S: wing slash + crescent)'),
  'bcSpire':     (fr('atk_AS'), 2, False, 'ICE SPIRE (atk_AS body; the spires are cut to fx:spire)'),
  'bcCocoon':    (fr('idle2block') + fr('block_idle'), 3, False, 'COCOON (closing the wings → the wrapped hold)'),
  'bcBurst':     (fr('block_hit', 5) + fr('jump_double', 2, 3), 4, False, 'COCOON burst: wings flung open'),
  'bcDrift':     (fr('atk_cS'), 2, False, 'PHASE DRIFT (atk_cS: wings spread, gliding lunge)'),
  'bcSlash':     (fr('atk_AA'), 2, False, 'PHASE DRIFT wing slash (atk_AA)'),
  'bcDive':      (fr('atk_jump_A2'), 3, False, 'DIVING CHILL (atk_jump_A2: dive with the icicle trail)'),
  'bcStorm':     (fr('atk_jump_cS'), 3, True, 'FROZEN SKY Winter Storm (atk_jump_cS: air wing beats)'),
  'bcOpen':      (fr('jump_double', 1, 2, 3), 2, False, 'wings-OPENING transition (render-only, 6f)'),
  'bcFly':       (fr('glide'), 5, True, 'flight (glide, wings open)'),
}

frames_all = {}
ref = {}
for k, (frs, *_) in A.items():
    for row, i in frs:
        a = canvas(GROUP[row][i - 1])
        if row == 'atk_AS':
            a, sp = split_spires(a)
            if sp is not None and (row, i) not in [s[0] for s in SPIRES]: SPIRES.append(((row, i), sp))
        frames_all[(row, i)] = a
        if row not in ref:
            mid, feet, _ = body_anchor(canvas(GROUP[row][0]) if row != 'atk_AS' else a)
            ref[row] = (mid, feet)
ext = top = bot = 0
for (row, i), a in frames_all.items():
    mid, feet = ref[row]
    ext = max(ext, mid, a.shape[1] - mid); top = max(top, feet); bot = max(bot, a.shape[0] - 1 - feet)
CX = int(np.ceil(ext)) + 2
CELL_W = CX * 2
FEET_Y = top + 2
CELL_H = FEET_Y + bot + 3


def place(a, row):
    mid, feet = ref[row]
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - mid)); oy = FEET_Y - feet
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy and oy + a.shape[0] <= CELL_H, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)


def fxstrip(crops):
    fw = max(c.shape[1] for c in crops); fh = max(c.shape[0] for c in crops); cells = []
    for c in crops:
        cell = np.zeros((fh, fw, 4), np.uint8); ox = (fw - c.shape[1]) // 2; oy = fh - c.shape[0]   # bottom-aligned
        cell[oy:oy + c.shape[0], ox:ox + c.shape[1]] = c; cells.append(cell)
    return np.concatenate(cells, axis=1), fw, fh


def trim(a):
    op = a[..., 3] == 255; ys, xs = np.where(op)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def build():
    anim, ledger = {}, []
    for key_, (frs, speed, loop, role) in A.items():
        cells = []
        for row, i in frs:
            cell, off = place(frames_all[(row, i)], row); cells.append(cell)
            ledger.append(dict(anim=key_, row=row, frame=i, canvas=list(map(int, GROUP[row][i - 1])), offset=off, role=role))
        path = f'{PREFIX}{key_}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key_] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    fx = {}
    FXG = {'shard': ['atk_JS', 'atk_JS2', 'atk_JS3', 'atk_JS4'], 'proj': ['atk_S_proj'], 'particle': ['ChrgParticle1', 'ChrgParticle2']}
    for name, rws in FXG.items():
        crops = [trim(canvas(GROUP[r][0])) for r in rws]
        strip, fw, fh = fxstrip(crops)
        path = f'{FXPREFIX}{name}.png'; Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, path))
        fx[name] = dict(sheet='./' + path, frames=len(crops), w=fw, h=fh); ledger.append(dict(fx=name, rows=rws))
    sp = sorted(SPIRES, key=lambda s: s[0][1]); crops = [c for _, c in sp]
    strip, fw, fh = fxstrip(crops)
    path = f'{FXPREFIX}spire.png'; Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, path))
    fx['spire'] = dict(sheet='./' + path, frames=len(crops), w=fw, h=fh); ledger.append(dict(fx='spire', rows=['atk_AS'], frames=[s[0][1] for s in sp]))
    return anim, fx, ledger


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, fx, led = build()
    icefx = {n: './assets/sprites/ben10/aliens/arcticguana_fx/' + n + '.png' for n in ('arc', 'burst', 'burst2', 'splash', 'spray')}
    with open(os.path.join(ROOT, 'bigchillAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_bigchill.py from the Big Chill sheet (DS rip, transparent canvases; source: see ledger).\n')
        fh.write('// See docs/ben10/aliens/bigchill/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen x2 (actionScale 1.0).\n')
        fh.write('export const BIGCHILL_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const BIGCHILL_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
        fh.write('// FX strips cut from the sheet (render-only)\nexport const BIGCHILL_FX = ' + json.dumps(fx, indent=2) + '\n')
        fh.write('// SHARED ice-effect sprites: Arcticguana\'s copies, REUSED (never duplicated; render-only)\n')
        fh.write('export const BIGCHILL_ICE_FX = ' + json.dumps(icefx, indent=2) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/bigchill.png', key_report=KEYREPORT, rows={k: [list(map(int, c)) for c in v] for k, v in GROUP.items()},
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, torso_window=TORSO_W,
                row_anchor={k: [float(v[0]), int(v[1])] for k, v in ref.items()}, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    S = 2; LW = 120
    imgs = [(nm, Image.open(os.path.join(ROOT, PREFIX + nm + '_uniform.png'))) for nm in A]
    fximgs = [('fx:' + nm, Image.open(os.path.join(ROOT, FXPREFIX + nm + '.png'))) for nm in fx]
    maxw = 1800
    cw = LW + min(maxw, max(i.width for _, i in imgs + fximgs) * S) + 10
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
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk.crop((0, 0, min(bw, maxw), bh)), (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    for row in ('idle', 'run', 'bcFly', 'bcBreath', 'bcWingCut', 'bcSpire', 'bcDrift', 'bcDive', 'bcCocoon', 'bcStorm', 'heavy', 'knockdown'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; frs = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, (28, 30, 36, 255)); b.alpha_composite(a)
            frs.append(b.convert('RGB').resize((CELL_W * 2, CELL_H * 2), Image.NEAREST))
        frs[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=frs[1:], duration=110, loop=0)
    print('anims', len(anim), 'fx', {k: v['frames'] for k, v in fx.items()}, 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'key', KEYREPORT)
