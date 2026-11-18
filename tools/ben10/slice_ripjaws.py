"""Slice the RIPJAWS (Piscciss Volann) sheet into uniform game strips (Phase 1 of the Ripjaws alien).

Source: assets/sprites/ben10/aliens/ripjaws.png (byte copy of the repo-root ripjaws_sprite_sheet_by_dragonrod342_d7yqxvd.png,
"Sheet by Dragonrod"). 835x869 RGB, solid mid-grey background #7F7F7F.

KEY: exact (127,127,127), zero tolerance. Background = the key region connected to the image edge (flood fill). Enclosed
key pockets (gaps between legs / arm and torso) are ALSO the background: the art palette's greys are exactly
0 / 8 / 23 / 41 / 195 / 249 / 255 — the key value 127 occurs NOWHERE in the art (measured, reported in source_grid.json),
so no art pixel can collide; leaving the pockets would paint grey patches. Near-key pixels (|c-127| <= 6): 0 -> no fringe.

EXCLUDED (not art): every text label (black glyph components far from any frame) and the white credit box.
KEPT as FX: the two blue sparks beside attack f3 (land + water) — water-spark effects, not annotation; they stay in their
frame AND are exported as fx:spark. The yellow-green crescents are fused to the Fin Blade frames (stay in frame).

TWO frame sets: LAND (legs) anchored feet baseline + torso centre; WATER / SWIM (fish tail) anchored at the TORSO centre with
the land rows' torso-to-feet offset, so the head/torso stays put when the set swaps (the tail hangs below the feet line).
1:1, nearest-neighbour, on-screen x2 (actionScale 1.0) like the other Dragonrod aliens.
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/ripjaws.png')
PREFIX = 'ben10_ripjaws_ready_'
FXPREFIX = 'ben10_ripjaws_fx_'
DOC = os.path.join(ROOT, 'docs/ben10/aliens/ripjaws')
KEY = (127, 127, 127)
ACTION_SCALE = 1.0
TORSO_W = 16

# ── rows: name → (y band, expected frame count, kind per frame) ──────────────────────────────────────────────────
ROWS = [
  ('stand_land',  (40, 140), 4, 'L'),   # also catches stand_water by x (split below)
  ('walk',        (155, 215), 6, 'L'),
  ('swim',        (225, 275), 4, 'S'),
  ('atk_land',    (278, 345), 4, 'L'),
  ('atk_water',   (350, 450), 4, 'W'),
  ('atk_fwd',     (455, 515), 5, 'LLLSS'),
  ('down_land',   (538, 605), 3, 'L'),
  ('down_water',  (615, 720), 3, 'W'),
  ('atk_up',      (745, 860), 8, 'LLLLWWWW'),
]
SINGLES = {'jump': (560, 193), 'fall': (666, 200), 'crouch': (747, 215)}   # (x0, y0) of the single frames


def load():
    im = np.array(Image.open(SRC).convert('RGB'))
    key = (im == KEY).all(2)
    near = (np.abs(im.astype(int) - 127).max(2) <= 6) & ~key
    lab, _ = ndimage.label(key)
    edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
    bg_edge = np.isin(lab, list(edge))
    fg = ~bg_edge
    art = fg & ~key
    greys = im[art]; gm = (np.ptp(greys, axis=1) < 4)
    levels = sorted(set(greys[gm][:, 0].tolist()))
    report = dict(key=list(KEY), edge_key_px=int(bg_edge.sum()), enclosed_key_px=int((key & fg).sum()), near_key_px=int(near.sum()),
                  art_grey_levels=levels, key_in_art=127 in levels, fringe='none (binary key, 0 near-key px)')
    rgba = np.dstack([im, np.where(key, 0, 255).astype(np.uint8)])   # every 127 px is background (see header)
    rgba[key] = 0
    cl, cn = ndimage.label(fg, structure=np.ones((3, 3)))
    comps = []
    for i, sl in enumerate(ndimage.find_objects(cl)):
        m = cl[sl] == i + 1; n = int(m.sum())
        comps.append(dict(id=i + 1, x0=sl[1].start, y0=sl[0].start, x1=sl[1].stop, y1=sl[0].stop, n=n,
                          sat=int(np.ptp(im[sl][m].astype(int), axis=1).max()),
                          white=float((im[sl][m].min(1) > 230).mean())))
    return im, rgba, cl, comps, report


def dist(a, b):
    return max(b['x0'] - a['x1'], a['x0'] - b['x1'], b['y0'] - a['y1'], a['y0'] - b['y1'], 0)


def group(comps):
    big = [c for c in comps if c['n'] >= 600]
    credit = [c for c in big if c['white'] > 0.5]; assert len(credit) == 1, credit
    frames = [c for c in big if c['white'] <= 0.5]; assert len(frames) == 48, len(frames)
    small = [c for c in comps if c['n'] < 600]
    fx, text = [], []
    for s in small:
        d = min(dist(s, f) for f in frames)
        (fx if (d <= 2 and s['sat'] > 40) else text).append(s)
    assert len(fx) == 2, fx                                    # the two blue sparks
    G = {}
    used = set()
    for name, (x0, y0) in SINGLES.items():
        f = [c for c in frames if c['x0'] == x0 and c['y0'] == y0]; assert len(f) == 1, name
        G[name] = f; used.add(f[0]['id'])
    for name, (ya, yb), n, kinds in ROWS:
        row = sorted([c for c in frames if ya <= c['y0'] < yb and c['id'] not in used], key=lambda c: c['x0'])
        if name == 'stand_land':
            G['stand_land'] = [c for c in row if c['x0'] < 270]; G['stand_water'] = [c for c in row if c['x0'] >= 270]
            assert len(G['stand_land']) == 4 and len(G['stand_water']) == 4
        else:
            assert len(row) == n, (name, len(row)); G[name] = row
        for c in row: used.add(c['id'])
    assert len(used) == 48
    for s in fx:                                               # attach each spark to the frame it sits beside
        f = min((f for r in G.values() for f in r), key=lambda f: dist(s, f)); f.setdefault('extra', []).append(s)
    return G, fx, text, credit[0]


KIND = {'stand_land': 'L', 'stand_water': 'W', 'walk': 'L', 'swim': 'S', 'atk_land': 'L', 'atk_water': 'W', 'down_land': 'L',
        'down_water': 'W', 'jump': 'L', 'fall': 'L', 'crouch': 'L', 'atk_fwd': 'LLLSS', 'atk_up': 'LLLLWWWW'}


def kind(row, i):
    k = KIND[row]; return k[i] if len(k) > 1 else k


def crop(rgba, cl, c):
    ids = [c['id']] + [e['id'] for e in c.get('extra', [])]
    x0 = min([c['x0']] + [e['x0'] for e in c.get('extra', [])]); y0 = min([c['y0']] + [e['y0'] for e in c.get('extra', [])])
    x1 = max([c['x1']] + [e['x1'] for e in c.get('extra', [])]); y1 = max([c['y1']] + [e['y1'] for e in c.get('extra', [])])
    a = rgba[y0:y1, x0:x1].copy(); m = np.isin(cl[y0:y1, x0:x1], ids); a[~m] = 0
    return a


def torso_x(a, frac=0.55):
    """densest TORSO_W-px column window over the upper part of the body (head + torso; never the tail fin / feet)"""
    op = a[..., 3] > 0; ys = np.where(op.any(1))[0]; top = ys.min(); h = ys.max() - top + 1
    cols = op[top:top + max(8, int(h * frac))].sum(0).astype(float)
    win = np.convolve(cols, np.ones(TORSO_W), 'valid'); j = int(np.argmax(win))
    return j + TORSO_W / 2


def anchors(G, rgba, cl):
    """per (row, kind) anchor from the first frame of that kind: (centre x, feet y) in the frame's own crop coordinates.
    LAND: torso x + lowest body pixel. WATER: torso x + (top of head + LAND_H). SWIM: horizontal body — centre of the
    head/torso third (the leading end) + (vertical centre + LAND torso offset)."""
    land = crop(rgba, cl, G['stand_land'][0]); op = land[..., 3] > 0; ys = np.where(op.any(1))[0]
    LAND_H = int(ys.max() - ys.min() + 1)
    torso_off = LAND_H * 0.55          # torso centre above the feet (land stand)
    ref = {}
    for row, fr in G.items():
        for i, c in enumerate(fr):
            k = kind(row, i)
            if (row, k) in ref: continue
            a = crop(rgba, cl, c); op = a[..., 3] > 0; ys = np.where(op.any(1))[0]; xs = np.where(op.any(0))[0]
            if k == 'L':
                ref[(row, k)] = (torso_x(a), int(ys.max()))
            elif k == 'W':
                ref[(row, k)] = (torso_x(a, 0.35), int(ys.min() + LAND_H - 1))
            else:   # S: facing right, the head/torso is the right third
                w = xs.max() - xs.min() + 1; x_t = xs.max() - w / 6
                body = op[:, int(xs.max() - w / 3):]; yb = np.where(body.any(1))[0]
                ref[(row, k)] = (float(x_t), int(round((yb.min() + yb.max()) / 2 + torso_off)))
    return ref, LAND_H


# ── animation table: key → ([(row, frame#1-based)], speed, loop, role) ─────────────────────────────────────────────
def fr(row, *idx): return [(row, i) for i in idx]
def rng(row, a, b): return [(row, i) for i in range(a, b + 1)]

A = {
  # LAND set (dry / wading)
  'idle':        (rng('stand_land', 1, 4), 8, True, 'idle (stand on land)'),
  'walk':        (rng('walk', 1, 6), 8, True, 'walk (walk/run row)'),
  'walk_back':   (rng('walk', 6, 1) if False else [('walk', i) for i in (6, 5, 4, 3, 2, 1)], 8, True, 'walk back = walk/run row REVERSED'),
  'run':         (rng('walk', 1, 6), 4, True, 'run = walk/run row cycled FASTER (no separate run on the sheet)'),
  'dash':        (rng('walk', 1, 6), 3, True, 'dash = walk/run row cycled fastest'),
  'crouch':      (fr('crouch', 1), 8, True, 'crouch'),
  'jump':        (fr('jump', 1), 6, False, 'jump rise (also the leap out of the water)'),
  'doubleJump':  (fr('jump', 1), 6, False, 'double jump = REUSED jump'),
  'fall':        (fr('fall', 1), 6, False, 'fall'),
  'guard':       (fr('crouch', 1), 8, True, 'guard = REUSED crouch (no block pose on the sheet)'),
  'crouchGuard': (fr('crouch', 1), 8, True, 'crouch guard = REUSED crouch'),
  'blockHit':    (fr('crouch', 1), 4, False, 'block hit = REUSED crouch'),
  'hurt':        (fr('fall', 1), 4, False, 'hurt = REUSED fall'),
  'hurt_air':    (fr('fall', 1), 4, False, 'air hurt = REUSED fall'),
  'knockdown':   (fr('fall', 1), 6, False, 'knockdown = REUSED fall'),
  'getup':       (fr('crouch', 1) + fr('stand_land', 1), 6, False, 'get-up = REUSED crouch -> stand'),
  'dizzy':       (rng('stand_land', 1, 4), 14, True, 'dizzy = REUSED stand (land) cycled slowly'),
  'transform':   (fr('atk_land', 1), 8, False, 'transform = REUSED attack (land) f1 (arms flexed)'),
  'taunt':       (fr('atk_land', 1, 2), 10, False, 'taunt = REUSED attack (land) f1-2 (flex + roar)'),
  'win':         (rng('stand_land', 1, 4), 8, True, 'win = REUSED stand (land)'),
  'lose':        (fr('crouch', 1), 8, False, 'lose = REUSED crouch'),
  'light':       (fr('atk_land', 1, 2), 3, False, 'JAB (attack on land f1-2)'),
  'heavy':       (fr('atk_fwd', 1, 2, 3), 3, False, 'HEAVY bite (attack -> f1-3 land lunge; f2-3 active)'),
  'down':        (fr('crouch', 1) + fr('atk_fwd', 2), 3, False, 'LOW bite = crouch + attack -> f2 (low bite)'),
  'up':          (rng('atk_up', 1, 4), 3, False, 'LAUNCHER (attack up f1-4, land)'),
  'air':         (fr('fall', 1) + fr('atk_fwd', 3), 3, False, 'AIR = fall frame + attack -> f3 (bite)'),
  'grab':        (fr('atk_fwd', 1, 2), 4, False, 'grab = REUSED attack -> f1-2'),
  'rjSummon':    (fr('atk_land', 1), 6, True, 'STORM TIDE summon pose (attack on land f1, arms flexed)'),
  'rjJet':       (fr('atk_land', 1, 2, 3, 4), 3, False, 'WATER JET (attack on land: f3 spark = release, f4 recovery)'),
  'rjRush':      (fr('atk_fwd', 1, 2, 3), 3, False, 'SHARK RUSH (attack -> f1-3 land lunge)'),
  'rjFin':       (rng('down_land', 1, 3), 3, False, 'FIN BLADE (attack down on land: crescent slash)'),
  'rjBreach':    (rng('atk_up', 1, 4), 3, False, 'BREACH (attack up f1-4, land anti-air chomp)'),
  'rjDive':      (fr('fall', 1), 4, True, 'DIVE BITE (fall frame, diagonal dive)'),
  # WATER set (submerged): the fish tail
  'idle_w':      (rng('stand_water', 1, 4), 8, True, 'submerged idle / treading water (stand on water)'),
  'swim_w':      (rng('swim', 1, 4), 6, True, 'SWIM loop (submerged move)'),
  'dash_w':      (rng('swim', 1, 4), 3, True, 'swim dash = swim row cycled fast'),
  'light_w':     (fr('atk_water', 1, 2), 3, False, 'JAB (attack on water f1-2)'),
  'heavy_w':     (fr('atk_fwd', 4, 5), 4, False, 'HEAVY bite submerged = attack -> f4-5 swim lunge'),
  'up_w':        (rng('atk_up', 5, 8), 3, False, 'LAUNCHER submerged (attack up f5-8, tail rising lunge)'),
  'hurt_w':      (fr('stand_water', 1), 4, False, 'hurt submerged = REUSED stand on water f1'),
  'rjSummon_w':  (fr('atk_water', 1), 6, True, 'STORM TIDE summon pose submerged (attack on water f1)'),
  'rjJet_w':     (fr('atk_water', 1, 2, 3, 4), 3, False, 'WATER JET submerged (attack on water: f3 spark = release)'),
  'rjRush_w':    (fr('atk_fwd', 4, 5), 3, True, 'SHARK RUSH submerged (attack -> f4-5 swim lunges)'),
  'rjFin_w':     (rng('down_water', 1, 3), 3, False, 'FIN BLADE submerged (attack down on water)'),
  'rjBreach_w':  (rng('atk_up', 5, 8), 3, False, 'BREACH submerged: the surface-launch body (attack up f5-8)'),
}


def place(a, ref, CELL_W, CELL_H, CX, FEET_Y):
    mid, feet = ref
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - mid)); oy = FEET_Y - feet
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy and oy + a.shape[0] <= CELL_H, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)


def trim(a):
    op = a[..., 3] > 0; ys, xs = np.where(op)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def main():
    os.makedirs(DOC, exist_ok=True)
    im, rgba, cl, comps, report = load()
    G, fx, text, credit = group(comps)
    ref, LAND_H = anchors(G, rgba, cl)
    crops = {(row, i + 1): crop(rgba, cl, c) for row, fr_ in G.items() for i, c in enumerate(fr_)}
    rk = {(row, i + 1): (row, kind(row, i)) for row, fr_ in G.items() for i in range(len(fr_))}
    used = {rc for frs, *_ in A.values() for rc in frs}
    ext = top = bot = 0
    for rc in used:
        a = crops[rc]; mid, feet = ref[rk[rc]]
        ext = max(ext, mid, a.shape[1] - mid); top = max(top, feet); bot = max(bot, a.shape[0] - 1 - feet)
    CX = int(np.ceil(ext)) + 2; CELL_W = CX * 2; FEET_Y = int(top) + 2; CELL_H = FEET_Y + int(bot) + 3
    anim, ledger = {}, []
    for k, (frs, speed, loop, role) in A.items():
        cells = []
        for rc in frs:
            cell, off = place(crops[rc], ref[rk[rc]], CELL_W, CELL_H, CX, FEET_Y); cells.append(cell)
            c = G[rc[0]][rc[1] - 1]
            ledger.append(dict(anim=k, row=rc[0], frame=rc[1], set=rk[rc][1], src=[c['x0'], c['y0'], c['x1'], c['y1']], offset=off, role=role))
        path = f'{PREFIX}{k}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[k] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                       loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    # FX: the two blue sparks (land f3, water f3)
    sp = [trim(np.where(np.isin(cl[s['y0']:s['y1'], s['x0']:s['x1']], [s['id']])[..., None], rgba[s['y0']:s['y1'], s['x0']:s['x1']], 0).astype(np.uint8)) for s in sorted(fx, key=lambda s: s['y0'])]
    fw = max(a.shape[1] for a in sp); fh = max(a.shape[0] for a in sp); cells = []
    for a in sp:
        cell = np.zeros((fh, fw, 4), np.uint8); cell[(fh - a.shape[0]) // 2:(fh - a.shape[0]) // 2 + a.shape[0], (fw - a.shape[1]) // 2:(fw - a.shape[1]) // 2 + a.shape[1]] = a; cells.append(cell)
    Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, FXPREFIX + 'spark.png'))
    fxd = {'spark': dict(sheet='./' + FXPREFIX + 'spark.png', frames=len(cells), w=fw, h=fh)}
    with open(os.path.join(ROOT, 'ripjawsAssets.js'), 'w') as fh_:
        fh_.write('// Generated by tools/ben10/slice_ripjaws.py from the Ripjaws sheet (Sheet by Dragonrod; see the ledger).\n')
        fh_.write('// docs/ben10/aliens/ripjaws/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen x2 (actionScale 1.0).\n')
        fh_.write('// LAND keys render dry / wading; the *_w keys (fish tail) render SUBMERGED.\n')
        fh_.write('export const RIPJAWS_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh_.write('export const RIPJAWS_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE, landH=LAND_H)) + '\n')
        fh_.write('// FX cut from the sheet (render-only): the blue water sparks beside attack f3\nexport const RIPJAWS_FX = ' + json.dumps(fxd, indent=2) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/ripjaws.png', key_report=report,
                excluded=dict(text_components=len(text), credit_box=[credit['x0'], credit['y0'], credit['x1'], credit['y1']]),
                fx_sparks=[[s['x0'], s['y0'], s['x1'], s['y1']] for s in fx],
                rows={k: [[c['x0'], c['y0'], c['x1'], c['y1']] for c in v] for k, v in G.items()},
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, landH=LAND_H,
                anchors={f'{r}:{k}': [float(v[0]), int(v[1])] for (r, k), v in ref.items()}, ledger=ledger)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as f: json.dump(grid, f, indent=1)
    # contact sheet (x2, checker, centre + feet guides)
    S = 2; LW = 110
    imgs = [(nm, Image.open(os.path.join(ROOT, PREFIX + nm + '_uniform.png'))) for nm in A] + [('fx:spark', Image.open(os.path.join(ROOT, FXPREFIX + 'spark.png')))]
    cw = LW + max(i.width for _, i in imgs) * S + 10; ch = sum(i.height * S + 6 for _, i in imgs) + 10
    sheet = Image.new('RGBA', (cw, ch), (40, 44, 52, 255)); d = ImageDraw.Draw(sheet); y = 5
    for nm, i in imgs:
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
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    for row in ('idle', 'walk', 'idle_w', 'swim_w', 'rjJet', 'rjJet_w', 'rjRush', 'rjRush_w', 'rjFin', 'rjFin_w', 'rjBreach', 'rjBreach_w', 'heavy'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; frs = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, (28, 30, 36, 255)); b.alpha_composite(a)
            frs.append(b.convert('RGB').resize((CELL_W * 2, CELL_H * 2), Image.NEAREST))
        frs[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=frs[1:], duration=120, loop=0)
    print('anims', len(anim), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'landH', LAND_H, 'key', report, 'text', len(text))


if __name__ == '__main__':
    main()
