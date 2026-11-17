"""Slice the Ben 10: Battle Ready Ghostfreak sheet into uniform game strips (Phase 1 of the Ghostfreak alien).

  python3 -I tools/ben10/slice_ghostfreak.py   # writes ben10_ghostfreak_*.png, ghostfreakAssets.js, docs/ben10/aliens/ghostfreak/*

Source: assets/sprites/ben10/aliens/ghostfreak.png (736x802, "Ripped by subvercetti", The Spriters Resource).
Rules (see docs/ben10/aliens/ghostfreak/SPRITE_LEDGER.md):
  * background = EXACT magenta (255,0,255), zero tolerance (corners asserted); only exact-key pixels are removed.
    Near-magenta pixels that survive inside kept art are COUNTED and reported, never eroded / blurred / recoloured.
  * 8-connected components. Text labels (anti-aliased black on magenta -> purple, G≈0, R≈B), the "Ripped by
    subvercetti" credit and the "Only for The Spriters Resource" logo are EXCLUDED (not art).
  * the white wind FX near "Attack" are free-floating: pieces within 4 px merge (dilate 2 + 2); each swirl is a ring
    of arcs drawn further apart than 4 px, so an FX FRAME = one column cluster of the sheet (gap >= 10 px), cut as
    the union of its pieces at their ORIGINAL relative positions (nothing moved, nothing drawn).
  * body anchor = head-and-torso centre (centroid of the UPPER 55 % of the silhouette); the tapering tail never
    drives the anchor. Every frame puts that centre at the same cell point, so the hover height is consistent.
  * the sheet holds TWO sets. The bottom (left-facing) set is verified frame by frame: Fly x5, both green silhouettes
    and all 6 wind FX are EXACT pixel mirrors of the top set; the grey Transform, Idle x5, grey Lose and Attack are
    HAND-REDRAWN mirrors (same pose, 89-95 % silhouette overlap, red mark present in both). The engine draws one set and
    flips it by facing, so the TOP set is canonical and the bottom set is an intentional, unused duplicate.
  * nearest-neighbour only; frames copied 1:1, never cropped (asserted).
  * on-screen size = native x2 (Ben spriteScale 2 x actionScale 1.0).
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/ghostfreak.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/ghostfreak')
KEY = (255, 0, 255)
ACTION_SCALE = 1.0

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
bg = np.all(im == KEY, axis=2)
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == KEY, 'corner is not the magenta key'

lab, n = ndimage.label(~bg, structure=np.ones((3, 3)))
OBJ = ndimage.find_objects(lab)
def comp(i):
    s = OBJ[i - 1]; m = lab[s] == i; px = im[s][m]
    return dict(id=i, x0=s[1].start, y0=s[0].start, x1=s[1].stop, y1=s[0].stop, n=int(m.sum()), mean=px.mean(0))
C = {i: comp(i) for i in range(1, n + 1)}

# ── named body components (verified on the overlay; x-order on the sheet) ───────────────────────────────────────
TOP = dict(transform=[4, 6], idle=[2, 7, 5, 3, 1], lose=[22, 21], fly=[16, 19, 17, 20, 18], attack=[38])
BOT = dict(transform=[108, 107], idle=[106, 109, 105, 104, 103], lose=[124, 123], fly=[122, 121, 120, 119, 118], attack=[149])
BADGES = dict(tangible=219, intangible=220, lockout=221)            # green / grey / red round badges = HUD icons
FX_ROWS = dict(top=(225, 330, 100, 632), bot=(565, 675, 140, 632))

def is_white(c): return c['mean'][0] > 200 and c['mean'][1] > 200 and c['mean'][2] > 200
def in_box(c, b): y0, y1, x0, x1 = b; return c['y0'] >= y0 and c['y1'] <= y1 and c['x0'] >= x0 and c['x1'] <= x1
FX_PIECES = {k: [i for i, c in C.items() if is_white(c) and in_box(c, b)] for k, b in FX_ROWS.items()}
body_ids = {i for g in (TOP, BOT) for v in g.values() for i in v}
badge_ids = set(BADGES.values())
fx_ids = set(FX_PIECES['top']) | set(FX_PIECES['bot'])
LOGO = (680, 802, 515, 736)                                        # "Ripped by subvercetti" + Spriters Resource logo
def is_text(c):
    m = c['mean']
    return (m[1] < 70 and abs(m[0] - m[2]) < 40) or in_box(c, LOGO) or c['n'] < 40 and not is_white(c)
TEXT = [i for i, c in C.items() if i not in body_ids | badge_ids | fx_ids and is_text(c)]
assigned = body_ids | badge_ids | fx_ids | set(TEXT)
assert assigned == set(C), ('unassigned components', sorted(set(C) - assigned)[:20])
assert not (body_ids & set(TEXT)) and not (fx_ids & set(TEXT))

# ── palette / fringe report (kept art only) ─────────────────────────────────────────────────────────────────
kept = np.isin(lab, list(body_ids | badge_ids | fx_ids))
dist = np.abs(im - np.array(KEY)).sum(axis=2)
NEAR_MAGENTA = int(((dist < 120) & kept).sum())                   # pink fringe that survived inside kept art
HUE_MAGENTA = int(((im[..., 0] > 170) & (im[..., 2] > 170) & (im[..., 1] < 110) & kept).sum())
MIN_DIST = int(dist[kept].min())

def crop(i, flip=False):
    c = C[i]
    m = lab[c['y0']:c['y1'], c['x0']:c['x1']] == i
    a = np.dstack([im[c['y0']:c['y1'], c['x0']:c['x1']], np.where(m, 255, 0)]).astype(np.uint8)
    return a[:, ::-1].copy() if flip else a

def anchor(a):
    """head-and-torso centre: centroid of the upper 55 % of the silhouette (the tail never drags it)"""
    al = a[..., 3] > 0
    ys, xs = np.where(al)
    top, bot = ys.min(), ys.max()
    sel = ys <= top + 0.55 * (bot - top)
    return float(xs[sel].mean()), float(ys[sel].mean())

# mirror study: bottom set vs the top set flipped
MIRROR = {}
for g in TOP:
    for k, (a, b) in enumerate(zip(TOP[g], BOT[g])):
        A, B = crop(a), crop(b, flip=True)
        same = A.shape == B.shape and np.array_equal(A, B)
        MIRROR[f'{g}{k + 1}'] = dict(top=a, bottom=b, exact_mirror=bool(same), top_size=list(A.shape[:2][::-1]), bottom_size=list(B.shape[:2][::-1]))

# ── cell geometry from every frame used ─────────────────────────────────────────────────────────────────────
def frames_for(spec):
    out = []
    for setname, grp, idx, *opt in spec:
        g = TOP if setname == 'T' else BOT
        out.append((g[grp][idx - 1], setname == 'B', opt[0] if opt else 0))
    return out

def T(grp, *idx, dy=0): return [('T', grp, i, dy) for i in idx]
def B(grp, *idx, dy=0): return [('B', grp, i, dy) for i in idx]

A = {
  'idle':      (T('idle', 1, 2, 3, 4, 5), 8, True,  'idle loop (top set)'),
  'walk':      (T('fly', 1, 2, 3, 4, 5), 7, True,  'walk - REUSED Fly (hover; no walk pose)'),
  'run':       (T('fly', 1, 2, 3, 4, 5), 4, True,  'run - REUSED Fly (hover)'),
  'dash':      (T('fly', 2, 3), 2, True,  'dash - REUSED Fly f2-3'),
  'jump':      (T('fly', 1), 6, False, 'jump_rise - Fly f1'),
  'fall':      (T('fly', 4), 6, True,  'jump_fall - Fly f4'),
  'crouch':    (T('idle', 1), 6, False, 'crouch - REUSED Idle f1 (no crouch pose)'),
  'guard':     (T('idle', 1), 6, False, 'block - Idle f1 (no block pose; block-hit reuses it)'),
  'light':     (T('attack', 1), 2, False, 'JAB - Attack pose (the only attack body) + procedural short wind swipe'),
  'heavy':     (T('attack', 1), 4, False, 'HEAVY - Attack pose + extended wind swipe (procedural + extracted arrow FX)'),
  'down':      (T('attack', 1, dy=12), 3, False, 'LOW - Attack pose with a 12 px render-only low offset (hits low)'),
  'up':        (T('fly', 1, dy=-10), 3, False, 'LAUNCHER - Fly f1 raised 10 px (render-only "tilt up" offset) + upward gale'),
  'air':       (T('fly', 2), 3, False, 'AIR - Fly f2 + forward wind'),
  'hurt':      (T('lose', 1), 6, False, 'hit_react - REUSED grey Lose pose (hit_react_heavy fallback; no light-hit pose)'),
  'knockdown': (T('lose', 1), 6, False, 'knockdown - grey Lose pose (no knockdown pose)'),
  'getup':     (T('lose', 1) + T('idle', 1), 5, False, 'get-up - REUSED grey Lose -> Idle f1 (no get-up pose)'),
  'dizzy':     (T('idle', 1, 2), 10, True, 'dizzy - REUSED Idle f1-2 (no dizzy pose)'),
  'roll':      (T('fly', 1, 2, 3, 4, 5), 2, True, 'roll - REUSED Fly'),
  'transform': (T('transform', 1, 2), 5, False, 'Omnitrix transform-in: green silhouette -> grey body'),
  'intro':     (T('idle', 1, 2, 3, 4, 5), 8, True, 'intro - REUSED Idle (no intro pose)'),
  'win':       (T('idle', 1, 2, 3, 4, 5), 8, True, 'win - REUSED Idle (no win pose)'),
  'lose':      (T('lose', 1), 6, False, 'lose_pose - grey curled pose'),
  'timeout':   (T('lose', 2), 6, False, 'Omnitrix TIMEOUT revert - green curled silhouette'),
  'taunt':     (T('attack', 1), 6, False, 'taunt - REUSED Attack pose (no taunt pose)'),
  'grab':      (T('attack', 1), 4, False, 'grab - Attack pose (POSSESS reach)'),
  'gfPhase':   (T('transform', 1), 4, False, 'PHASE toggle flash - green Transform silhouette (8f transition)'),
  'gfFly':     (T('fly', 1, 2, 3, 4, 5), 4, True, 'flight - Fly loop'),
  'gfGale':    (T('attack', 1), 3, False, 'SPECTRAL GALE - Attack pose (extracted swirl FX is the projectile)'),
  'gfWail':    (T('attack', 1), 3, False, 'WAIL - Attack pose + procedural pixel rings'),
  'gfPossess': (T('attack', 1) + T('transform', 1), 4, False, 'POSSESS - Attack reach -> green silhouette (dissolve in)'),
  'gfBurst':   (T('fly', 1), 4, False, 'POSSESS burst-out - Fly f1 + procedural pixel burst'),
  'gfRise':    (T('fly', 1, 2, 3, 4, 5), 2, True, 'PHANTOM RISE - Fly loop + spiralling gale'),
  'gfCold':    (T('attack', 1), 3, False, 'COLD TOUCH (air) - Attack pose + downward gale'),
  'gfUltDissolve': (T('transform', 2, 1), 4, False, 'FEAR FEAST dissolve - grey body -> green silhouette'),
  'gfUltStorm':    (T('fly', 1, 2, 3, 4, 5), 2, True, 'FEAR FEAST spectral storm - Fly loop'),
  'gfUltScream':   (T('attack', 1), 4, False, 'FEAR FEAST final scream - Attack pose + enlarged procedural Wail rings'),
}

def placed(cid, flip, dy):
    a = crop(cid, flip)
    ax, ay = anchor(a)
    return a, ax, ay - dy        # dy > 0 = draw lower (the anchor sits higher in the crop frame)

used = [(cid, flip, dy) for spec, *_ in A.values() for (cid, flip, dy) in frames_for(spec)]
L = max(ax for a, ax, ay in (placed(*u) for u in used)); R = max(a.shape[1] - ax for a, ax, ay in (placed(*u) for u in used))
U = max(ay for a, ax, ay in (placed(*u) for u in used)); D = max(a.shape[0] - ay for a, ax, ay in (placed(*u) for u in used))
CX, TY = int(np.ceil(L)) + 2, int(np.ceil(U)) + 2
CELL_W = CX + int(np.ceil(R)) + 2
CELL_H = TY + int(np.ceil(D)) + 2
# hover: the floor line sits where the idle tail tips reach (median idle tail below the torso centre)
idle_tail = [crop(c).shape[0] - anchor(crop(c))[1] for c in TOP['idle']]
FLOOR = TY + int(round(float(np.median(idle_tail))))
HOVER = FLOOR - TY

def place(cid, flip, dy):
    a, ax, ay = placed(cid, flip, dy)
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox, oy = int(round(CX - ax)), int(round(TY - ay))
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy and oy + a.shape[0] <= CELL_H, ('cropped', cid, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    assert (cell[..., 3] > 0).sum() == (a[..., 3] > 0).sum(), 'pixels lost'
    return cell, (ox, oy)

def build(prefix):
    anim, ledger = {}, []
    for key, (spec, speed, loop, role) in A.items():
        cells = []
        for k, (cid, flip, dy) in enumerate(frames_for(spec)):
            cell, off = place(cid, flip, dy); cells.append(cell)
            c = C[cid]
            setname, grp, idx, _ = spec[k]
            ledger.append(dict(anim=key, set='top' if setname == 'T' else 'bottom(mirrored)', group=grp, frame=idx, component=cid,
                               src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']], offset=off, render_dy=dy, role=role))
        path = f'{prefix}{key}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FLOOR, actionScale=ACTION_SCALE)
    return anim, ledger

# ── FX: free-floating wind pieces → frames (column clusters) ───────────────────────────────────────────────────
def fx_frames(row):
    ids = FX_PIECES[row]
    m = np.isin(lab, ids)
    grp, ng = ndimage.label(ndimage.binary_dilation(m, iterations=2, structure=np.ones((3, 3))))   # within 4 px → one piece
    pieces = []
    for g in range(1, ng + 1):
        gm = (grp == g) & m
        if not gm.any(): continue
        ys, xs = np.where(gm)
        pieces.append(dict(x0=int(xs.min()), x1=int(xs.max()) + 1, y0=int(ys.min()), y1=int(ys.max()) + 1, comps=sorted({int(v) for v in lab[gm]})))
    pieces.sort(key=lambda p: p['x0'])
    cols = []
    for p in pieces:                                                     # column clusters: gap >= 10 px starts a new frame
        if cols and p['x0'] - cols[-1]['x1'] < 10:
            c = cols[-1]; c['x1'] = max(c['x1'], p['x1']); c['y0'] = min(c['y0'], p['y0']); c['y1'] = max(c['y1'], p['y1']); c['pieces'].append(p)
        else: cols.append(dict(x0=p['x0'], x1=p['x1'], y0=p['y0'], y1=p['y1'], pieces=[p]))
    out = []
    for c in cols:
        ids_c = sorted({i for p in c['pieces'] for i in p['comps']})
        mm = np.isin(lab[c['y0']:c['y1'], c['x0']:c['x1']], ids_c)
        a = np.dstack([im[c['y0']:c['y1'], c['x0']:c['x1']], np.where(mm, 255, 0)]).astype(np.uint8)
        out.append(dict(img=a, bbox=[c['x0'], c['y0'], c['x1'], c['y1']], pieces=len(c['pieces']), comps=ids_c))
    return out

def uniform_strip(frames):
    w = max(f['img'].shape[1] for f in frames); h = max(f['img'].shape[0] for f in frames)
    cells = []
    for f in frames:
        a = f['img']; cell = np.zeros((h, w, 4), np.uint8)
        ox, oy = (w - a.shape[1]) // 2, (h - a.shape[0]) // 2
        cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a; cells.append(cell)
    return np.concatenate(cells, axis=1), w, h

if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    P = 'ben10_ghostfreak_'
    anim, led = build(P)
    top_fx, bot_fx = fx_frames('top'), fx_frames('bot')
    assert len(top_fx) == 6 and len(bot_fx) == 6, (len(top_fx), len(bot_fx))
    # FX mirror study: bottom FX row reversed + flipped vs the top row
    fx_mirror = []
    for k, (t, b) in enumerate(zip(top_fx, bot_fx[::-1])):
        bf = b['img'][:, ::-1]
        fx_mirror.append(dict(frame=k + 1, exact_mirror=bool(t['img'].shape == bf.shape and np.array_equal(t['img'], bf))))
    FXN = {'windArrowS': [0], 'windArrowL': [1], 'gale': [2, 3, 4, 5]}   # top set (wind trails to the RIGHT)
    fx = {}
    for name, idx in FXN.items():
        strip, w, h = uniform_strip([top_fx[i] for i in idx])
        path = f'{P}fx_{name}.png'
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, path))
        fx[name] = dict(sheet='./' + path, frames=len(idx), w=w, h=h, speed=3)
    icons = {}
    for name, cid in BADGES.items():
        a = crop(cid); path = f'{P}icon_{name}.png'
        Image.fromarray(a, 'RGBA').save(os.path.join(ROOT, path))
        icons[name] = dict(sheet='./' + path, w=int(a.shape[1]), h=int(a.shape[0]))
    with open(os.path.join(ROOT, 'ghostfreakAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_ghostfreak.py from the subvercetti rip (The Spriters Resource).\n')
        fh.write('// See docs/ben10/aliens/ghostfreak/SPRITE_LEDGER.md. 1:1 frames, anchor = head-and-torso centre, on-screen x2.\n')
        fh.write('export const GHOSTFREAK_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const GHOSTFREAK_FX = ' + json.dumps(fx, indent=2) + '\n')
        fh.write('export const GHOSTFREAK_ICONS = ' + json.dumps(icons, indent=2) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/ghostfreak.png', key=list(KEY), cell=[CELL_W, CELL_H], torsoCentre=[CX, TY],
                floorY=FLOOR, hover=HOVER, actionScale=ACTION_SCALE, top=TOP, bottom=BOT, badges=BADGES,
                text_components_removed=len(TEXT), near_magenta_kept_px=NEAR_MAGENTA, magenta_hue_kept_px=HUE_MAGENTA,
                min_kept_distance_to_key=MIN_DIST, body_mirror=MIRROR, fx_mirror=fx_mirror,
                fx_frames={'top': [dict(bbox=f['bbox'], pieces=f['pieces'], comps=f['comps']) for f in top_fx],
                           'bottom': [dict(bbox=f['bbox'], pieces=f['pieces'], comps=f['comps']) for f in bot_fx]},
                ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    rows = [(k, P + k + '_uniform.png') for k in A] + [('fx ' + n, P + 'fx_' + n + '.png') for n in FXN] + \
           [('icon ' + n, P + 'icon_' + n + '.png') for n in BADGES]
    S = 2; LW = 120
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
        if not (nm.startswith('fx') or nm.startswith('icon')):
            for f in range(i.width // CELL_W):
                cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
                cd.line([((f * CELL_W + CX) * S, 0), ((f * CELL_W + CX) * S, bh)], fill=(200, 80, 80, 255))
            cd.line([(0, TY * S), (bw, TY * S)], fill=(230, 180, 60, 255))
            cd.line([(0, FLOOR * S), (bw, FLOOR * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    print('cell', CELL_W, CELL_H, 'torso', CX, TY, 'floor', FLOOR, 'hover', HOVER)
    print('anims', len(anim), 'fx', {k: v['frames'] for k, v in fx.items()}, 'icons', len(icons), 'text removed', len(TEXT))
    print('near-magenta kept px', NEAR_MAGENTA, 'magenta-hue kept px', HUE_MAGENTA, 'min kept dist to key', MIN_DIST)
    print('body mirrors', {k: v['exact_mirror'] for k, v in MIRROR.items()})
    print('fx mirrors', [m['exact_mirror'] for m in fx_mirror])
