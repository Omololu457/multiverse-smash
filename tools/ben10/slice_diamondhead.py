#!/usr/bin/env python3
"""Slice the DIAMONDHEAD (Petrosapien, Omniverse style) sheet into uniform game strips (Phase 1 of the Diamondhead alien).

  python3 -I tools/ben10/slice_diamondhead.py   # writes ben10_diamondhead_*.png, diamondheadAssets.js, docs/ben10/aliens/diamondhead/*

Source: assets/sprites/ben10/aliens/diamondhead.png (583x773) = the owner's untracked
diamondhead_omniverse_style_sprite_sheet_by_arksalazarx31_da8cjah-375w-2x.jpg (md5 2bc454253afe7a379e96f53d9afe2da4), found by
contact sheet (mint crystal alien, black suit + green shirt, solid blue background, labels STAND / RUN / ATTACK 1-3 /
SHOOT DIAMOND PROYECTILES / CROUCH / JUMP / FALL / ALT PAL, credit "Sprites made by Dragonrod, recolor made by Arksalazar"),
decoded once and stored as a lossless PNG (the decode is the source of truth from then on).
Rules (see docs/ben10/aliens/diamondhead/SPRITE_LEDGER.md):
  * The source is a RESAMPLED JPEG (the only copy): the background is (0,80,255) at the corners but JPEG noise spreads it
    over ~66k colours, so an exact zero-tolerance key is impossible. Key = Euclidean RGB distance to (0,80,255) < 90 (the
    histogram valley: background 0-60, art 120+). Art pixels kept at the edge that are still blue-dominant
    (B - max(R,G) > 50 - nothing in his palette is) are JPEG fringe: they become his dark outline colour.
    Palette collision check: nearest dark-suit pixel 188 from the key, mint 200+, green / white far: no collision.
  * 8-connected components, every one assigned explicitly (asserted). EXCLUDED (not art): every label glyph + the title
    (short components, mostly non-mint), the credit text, the large promo illustration (bottom right, > 5000 px) and the
    ALT PAL figure (the body in the right-hand column) - its colours are SAMPLED first for PRISMATIC (Phase 3).
  * Free-floating pieces are FX frames: the 3 shard slivers by SHOOT, the 4 growing spikes of ATTACK 2, the 3 of ATTACK 3.
  * anchor = feet baseline (bottom row) + body centre = the centroid of the frame's BOTTOM 40 % (legs / boots), so a lance,
    blade or raised arm never drags it.
  * nearest-neighbour only: frames are copied 1:1, never cropped (asserted inside the cell); on-screen size = Ben
    spriteScale 2.0 x actionScale 1.5 (native x3, like the Dragonrod Heatblast / Wildvine sheets).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/diamondhead.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/diamondhead')
BG = (0, 80, 255)
KEY_DIST = 90
FRINGE = (17, 21, 21)               # his dark outline / suit colour (sampled) - JPEG blue fringe snaps to it
FEET_Y = 76
ACTION_SCALE = 1.5
PREFIX = 'ben10_diamondhead_'

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not the blue key'
dist = np.sqrt(((im - np.array(BG)) ** 2).sum(axis=2))
art = dist >= KEY_DIST
blue_dom = (im[..., 2] - np.maximum(im[..., 0], im[..., 1])) > 50
FRINGE_N = int((art & blue_dom).sum())
im[art & blue_dom] = FRINGE
dark = art & (im.max(axis=2) < 70)
NEAREST_DARK = float(np.sqrt(((np.array(Image.open(SRC).convert('RGB')).astype(int)[dark & ~blue_dom] - np.array(BG)) ** 2).sum(1)).min())
assert NEAREST_DARK >= 150, ('dark suit collides with the key', NEAREST_DARK)

lab, n = ndimage.label(art, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    m = lab[s] == k + 1
    px = im[s][m]
    mint = ((px[:, 1] > 170) & (px[:, 2] > 150) & (px[:, 0] > 110)).mean()
    C[k + 1] = dict(id=k + 1, y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, n=int(m.sum()),
                    mint=float(mint), dark=float((px.max(1) < 70).mean()))
hh = lambda c: c['y1'] - c['y0']
ww = lambda c: c['x1'] - c['x0']
NOISE = sorted(c['id'] for c in C.values() if c['n'] < 4)                     # isolated JPEG specks (none expected)
PROMO = [c['id'] for c in C.values() if c['n'] > 5000 and c['y0'] > 500]
SHARD = lambda c: c['n'] < 60 and hh(c) <= 6                                  # the 3 slivers by SHOOT
SPIKE = lambda c: c['mint'] > 0.6 and c['dark'] < 0.05 and not SHARD(c) and c['n'] >= 60
BODY = lambda c: c['n'] >= 800 and hh(c) >= 30 and c['dark'] > 0.15 and c['id'] not in PROMO
ALT = [c['id'] for c in C.values() if BODY(c) and c['x0'] > 480]               # the ALT PAL figure (right-hand column)
TEXT = sorted(c['id'] for c in C.values() if hh(c) <= 23 and not SHARD(c) and not SPIKE(c) and c['id'] not in NOISE)   # labels + title + credit
TITLE = sorted(i for i in TEXT if C[i]['x0'] > 300 and C[i]['y0'] < 100)                  # (reported separately)
CREDIT = sorted(i for i in TEXT if C[i]['y0'] > 660 and 270 < C[i]['x0'] < 420)
assert len(PROMO) == 1 and len(ALT) == 1 and len(TITLE) >= 3 and len(CREDIT) == 6, (PROMO, ALT, TITLE, CREDIT)
EXCLUDED = set(NOISE) | set(PROMO) | set(ALT) | set(TEXT)


def comps(y0, y1, pred):
    return [c['id'] for c in sorted(C.values(), key=lambda c: c['x0']) if y0 <= c['y0'] < y1 and c['id'] not in EXCLUDED and pred(c)]


body = lambda c: BODY(c) and c['id'] not in ALT
GROUPS = {
    'stand':  comps(25, 60, body),
    'run':    comps(125, 160, body),
    'atk1':   comps(220, 270, body),
    'shoot':  comps(330, 360, body),
    'atk2':   comps(430, 470, body),
    'atk3':   comps(540, 580, body),
    'jfc':    comps(625, 700, body),          # crouch / jump / fall (left -> right)
}
FXG = {
    'shard':   comps(345, 370, SHARD),
    'spike2':  sorted(comps(400, 520, SPIKE), key=lambda i: C[i]['n']),            # ATTACK 2 spikes, small -> tall
    'spike3':  sorted(comps(540, 620, SPIKE), key=lambda i: C[i]['n']),            # ATTACK 3 spikes, small -> tall (last = double)
}
EXPECT = dict(stand=4, run=6, atk1=5, shoot=3, atk2=4, atk3=3, jfc=3)
for g, k in EXPECT.items(): assert len(GROUPS[g]) == k, (g, GROUPS[g])
assert len(FXG['shard']) == 3 and len(FXG['spike2']) == 4 and len(FXG['spike3']) == 3, FXG
used = set(EXCLUDED)
for ids in list(GROUPS.values()) + list(FXG.values()): used |= set(ids)
assert used == set(C), ('unassigned components', sorted(set(C) - used))


def crop(cid, src=None):
    c = C[cid]
    m = lab[c['y0']:c['y1'], c['x0']:c['x1']] == cid
    rgb = (im if src is None else src)[c['y0']:c['y1'], c['x0']:c['x1']]
    return np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8)


def body_mid_x(a):
    al = a[..., 3] > 0
    lower = al[int(al.shape[0] * 0.6):]
    ys, xs = np.where(lower if lower.sum() >= 10 else al)
    return float(xs.mean())


# ── PRISMATIC palette (sampled from the ALT PAL figure BEFORE it is excluded) ──────────────────────────────────────
alt = crop(ALT[0]); ap = alt[..., :3][alt[..., 3] > 0].astype(int)
ALT_WHITE = tuple(int(v) for v in ap[ap.min(1) > 200].mean(0).round())       # Ben 10,000 suit: white pants
ALT_DARK = tuple(int(v) for v in ap[ap.max(1) < 70].mean(0).round())          # black shirt / boots
ALT_MINT = tuple(int(v) for v in ap[(ap[:, 1] > 180) & (ap[:, 0] > 120) & (ap[:, 0] < 215)].mean(0).round())


def prismatic(a):
    """Alt-pal recolour of one frame (render-only frame set): green shirt -> the alt black shirt; the dark trousers
    (dark interior pixels between the belt and the boots) -> the alt white, outline / edge pixels stay dark; skin keeps
    its mint (the alt figure's mint is the same crystal)."""
    b = a.copy(); rgb = b[..., :3].astype(int); al = b[..., 3] > 0
    green = al & (rgb[..., 0] < 130) & (rgb[..., 1] > rgb[..., 0] + 60) & (rgb[..., 1] > rgb[..., 2] + 40)   # shirt green (80,174,107); mint crystal (152,221,200) never
    bright = al & (rgb.min(-1) > 215)                                          # the belt + badge
    ys = np.where(bright.any(1))[0]
    belt = int(np.median(ys)) if len(ys) else int(a.shape[0] * 0.45)
    bx = np.where(bright[belt])[0]; mid = int(bx.mean()) if len(bx) else int(body_mid_x(a))
    torso = np.zeros_like(al); torso[:belt + 1, max(0, mid - 11):mid + 12] = True   # the shirt only (never the crystal arms)
    rgb[green & torso] = ALT_DARK
    h = a.shape[0]; boots = belt + int((h - belt) * 0.72)
    dk = al & (rgb.max(-1) < 70)
    inner = dk & np.roll(dk, 1, 0) & np.roll(dk, -1, 0) & np.roll(dk, 1, 1) & np.roll(dk, -1, 1)
    rows = np.zeros_like(dk); rows[belt + 2:boots] = True
    rgb[inner & rows] = ALT_WHITE
    b[..., :3] = rgb.astype(np.uint8)
    return b


def g(name, *nums): return [(name, i) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':       (g('stand', 1, 2, 3, 4), 9, True,  'idle (STAND loop)'),
  'walk':       (g('run', 1, 2, 3, 4, 5, 6), 8, True,  'walk - the RUN cycle SLOWED (no walk art)'),
  'walk_back':  (g('run', 6, 5, 4, 3, 2, 1), 8, True,  'walk back - RUN REVERSED, slowed'),
  'run':        (g('run', 1, 2, 3, 4, 5, 6), 4, True,  'run (RUN)'),
  'dash':       (g('run', 2, 3), 3, True,  'dash (RUN f2-3, fast)'),
  'jump':       (g('jfc', 2), 6, False, 'jump rise (JUMP)'),
  'doubleJump': (g('jfc', 2), 6, False, 'double jump - REUSED JUMP'),
  'fall':       (g('jfc', 3), 6, True,  'jump fall (FALL)'),
  'crouch':     (g('jfc', 1), 6, False, 'crouch (CROUCH)'),
  'guard':      (g('jfc', 1), 6, False, 'block - REUSED CROUCH'),
  'blockHit':   (g('jfc', 1), 6, False, 'block hit - REUSED CROUCH'),
  'light':      (g('atk1', 1, 2), 3, False, 'JAB (ATTACK 1 f1-2)'),
  'heavy':      (g('atk1', 3, 4, 5), 5, False, 'HEAVY (ATTACK 1 f3-5: the arm extends into a crystal lance, 190 px)'),
  'down':       (g('atk2', 1, 2), 4, False, 'LOW (ATTACK 2 f1-2 blade sweep, hits low)'),
  'up':         (g('atk2', 3, 4), 5, False, 'LAUNCHER (ATTACK 2 f3-4 rising blade swipe)'),
  'air':        (g('jfc', 3), 6, False, 'AIR (FALL frame + procedural blade)'),
  'hurt':       (g('jfc', 3), 6, False, 'hit light/heavy - REUSED FALL (no hurt pose)'),
  'hurt_air':   (g('jfc', 3), 6, False, 'hit in the air - REUSED FALL'),
  'knockdown':  (g('jfc', 3), 6, False, 'knockdown - REUSED FALL (no knockdown pose)'),
  'getup':      (g('jfc', 1) + g('stand', 1), 6, False, 'get-up - REUSED CROUCH -> STAND'),
  'dizzy':      (g('stand', 1, 2), 12, True, 'dizzy - REUSED STAND f1-2 (no dizzy pose)'),
  'transform':  (g('stand', 1, 2, 3, 4), 5, False, 'transform-in - REUSED STAND'),
  'taunt':      (g('atk3', 1), 8, False, 'taunt - REUSED ATTACK 3 f1 (arm raised)'),
  'win':        (g('stand', 1, 2, 3, 4), 9, True,  'win - REUSED STAND (no win pose)'),
  'lose':       (g('jfc', 1), 6, False, 'lose - REUSED CROUCH (no lose pose)'),
  'grab':       (g('atk1', 1, 2), 4, False, 'grab - REUSED JAB'),
  'dhShoot':    (g('shoot', 1, 2, 3), 4, False, 'SHARD SHOT cast (SHOOT f1-3)'),
  'dhLance':    (g('atk1', 3, 4, 4, 5), 5, False, 'CRYSTAL LANCE (ATTACK 1 f3 extend, f4 full lance held, f5 recover) + ult opener'),
  'dhGround':   (g('atk3', 1, 2, 3), 5, False, 'PRISM WALL / SPIKE ERUPTION cast (ATTACK 3 f1-3: arm raised -> hand to ground)'),
  'dhHarden':   (g('jfc', 1), 6, False, 'HARDEN - holds the CROUCH frame (+ procedural crystal sheen)'),
  'dhDive':     (g('jfc', 3), 6, False, 'DIAMOND DIVE - FALL frame (+ procedural blade)'),
  'dhBurst':    (g('atk2', 4), 6, False, 'SHATTER BURST - ATTACK 2 f4 (blade raised)'),
}


def place(a, CX, CW):
    cell = np.zeros((CELL_H, CW, 4), np.uint8)
    ox = int(round(CX - body_mid_x(a))); oy = FEET_Y - a.shape[0]
    assert 0 <= ox and ox + a.shape[1] <= CW and 0 <= oy, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)


# symmetric cell around the body centre (the engine centres the cell on the fighter): +-(widest extent)
ext = 0
for frames, *_ in A.values():
    for grp, i in frames:
        a = crop(GROUPS[grp][i - 1]); mid = body_mid_x(a); ext = max(ext, mid, a.shape[1] - mid)
CX = int(np.ceil(ext)) + 2
CELL_W = CX * 2
CELL_H = 80


def build(prism=False):
    anim, ledger = {}, []
    tag = 'prism_' if prism else ''
    for key, (frames, speed, loop, role) in A.items():
        cells = []
        for grp, i in frames:
            cid = GROUPS[grp][i - 1]
            a = crop(cid)
            if prism: a = prismatic(a)
            cell, off = place(a, CX, CELL_W); cells.append(cell)
            c = C[cid]
            ledger.append(dict(anim=key, group=grp, frame=i, component=cid, src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']],
                               offset=off, role=role))
        path = f'{PREFIX}{tag}{key}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger


def build_fx():
    """FX strips: frames bottom-centre anchored in a uniform cell (spikes grow from the ground; shards centred)."""
    fx = {}
    for name, ids in FXG.items():
        crops = [crop(i) for i in ids]
        cw = max(a.shape[1] for a in crops); ch = max(a.shape[0] for a in crops)
        cells = []
        for a in crops:
            cell = np.zeros((ch, cw, 4), np.uint8)
            ox = (cw - a.shape[1]) // 2; oy = ch - a.shape[0] if name != 'shard' else (ch - a.shape[0]) // 2
            cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a; cells.append(cell)
        path = f'{PREFIX}fx_{name}.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        fx[name] = dict(sheet='./' + path, frames=len(cells), w=int(cw), h=int(ch), speed=4,
                        src=[[C[i]['x0'], C[i]['y0'], C[i]['x1'], C[i]['y1']] for i in ids])
    return fx


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build()
    prism, _ = build(prism=True)
    fx = build_fx()
    with open(os.path.join(ROOT, 'diamondheadAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_diamondhead.py from the Diamondhead Omniverse-style sheet\n')
        fh.write('// ("Sprites by Dragonrod, recolor by Arksalazar"). See docs/ben10/aliens/diamondhead/SPRITE_LEDGER.md.\n')
        fh.write('// 1:1 frames, nearest-neighbour; on-screen size from actionScale. DIAMONDHEAD_PRISM_ANIM = the same frames recoloured\n')
        fh.write('// to the sampled ALT PAL (Ben 10,000) colours - the render-only PRISMATIC frame set.\n')
        fh.write('// DIAMONDHEAD_FX: extracted sheet effects - shard (3 slivers), spike2 (ATTACK 2, 4 stages), spike3 (ATTACK 3, 3 stages).\n')
        fh.write('export const DIAMONDHEAD_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const DIAMONDHEAD_PRISM_ANIM = ' + json.dumps(prism, indent=2) + '\n')
        fh.write('export const DIAMONDHEAD_FX = ' + json.dumps(fx, indent=2) + '\n')
        fh.write('export const DIAMONDHEAD_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y,
                                                                       actionScale=ACTION_SCALE)) + '\n')
        fh.write('export const DIAMONDHEAD_ALT_PAL = ' + json.dumps(dict(white=ALT_WHITE, dark=ALT_DARK, mint=ALT_MINT)) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/diamondhead.png', key=list(BG), key_distance=KEY_DIST,
                fringe_pixels_snapped=FRINGE_N, nearest_dark_suit_distance=round(NEAREST_DARK, 1),
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, groups=GROUPS, fx=FXG,
                alt_pal=dict(component=ALT[0], white=ALT_WHITE, dark=ALT_DARK, mint=ALT_MINT),
                removed_text_components=TEXT, of_which_title=TITLE, of_which_credit=CREDIT, removed_promo=PROMO, removed_alt_figure=ALT,
                removed_noise=NOISE, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every strip (+ the prismatic idle / lance) at x3 on a checkerboard, cell borders, body-centre (red) / feet (green)
    rows = [(k, PREFIX + k + '_uniform.png') for k in A] + [('PRISM ' + k, PREFIX + 'prism_' + k + '_uniform.png') for k in ('idle', 'dhLance', 'run')] \
        + [('fx ' + n, PREFIX + 'fx_' + n + '.png') for n in FXG]
    S = 3; LW = 120
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
    # row previews (each labeled sheet row played as an animation, x4): docs/ben10/aliens/diamondhead/preview_<row>.gif
    for row in ('idle', 'run', 'heavy', 'dhShoot', 'down', 'up', 'dhGround'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; fr = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, (0, 80, 255, 255)); b.alpha_composite(a)
            fr.append(b.convert('RGB').resize((CELL_W * 3, CELL_H * 3), Image.NEAREST))
        fr[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=fr[1:], duration=150, loop=0)
    print('anims', len(anim), 'cell', CELL_W, CELL_H, 'CX', CX, 'fx', {k: v['frames'] for k, v in fx.items()}, 'text', len(TEXT),
          'title', TITLE, 'promo', PROMO, 'alt', ALT, 'noise', NOISE, 'fringe', FRINGE_N, 'nearest dark', round(NEAREST_DARK, 1),
          'alt pal', ALT_WHITE, ALT_DARK, ALT_MINT)
