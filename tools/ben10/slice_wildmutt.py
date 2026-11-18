#!/usr/bin/env python3
"""Slice the WILDMUTT (Vulpimancer) sheet into uniform game strips (Phase 1 of the READY Wildmutt alien, key `wildmutt_ov`).

  python3 -I tools/ben10/slice_wildmutt.py   # writes ben10_wildmutt_ov_*.png, wildmuttAssets.js, docs/ben10/aliens/wildmutt/*

Source: assets/sprites/ben10/aliens/wildmutt.png = a lossless PNG decode of the repo's
wildmutt___sprites_sheet_by_ipmugenofficial_djimf88-fullview.jpeg (md5 8141b2c94cb1322a4f5826cfda279f98, 1280x1018; the
owner chose this ORANGE sheet on 2026-11-17 - the tan/brown "Punch / Tackle / Crush / Push" sheet the brief describes is not in
the project). Labels: STAND / RUN / CROUCH/JUMP / ROAR/BITE / GROUND ATTACK / SENSITIVITY/ROLL / DIG THE GROUND / HIT/DEATH.
Rules (see docs/ben10/aliens/wildmutt/SPRITE_LEDGER.md):
  * Background = (0,181,246) at all four corners (asserted). The source is a JPEG (the only copy): 81 % of the background is
    the exact key but JPEG noise spreads it over ~70k colours, so a ZERO-tolerance key would leave a blue haze around every
    frame. Key = Euclidean RGB distance to the key < 80 (the histogram valley; art starts at 80+). Edge pixels kept as art but
    still bluer than red (B > R: the cyan / teal JPEG rim - every colour of his own, orange / brown / dark olive / the green
    Omnitrix dot, has R > B) are snapped to
    his sampled dark-brown OUTLINE colour - never eroded, never removed. Near-key leftovers are counted and reported.
  * 8-connected components, every one assigned explicitly (asserted): the 72 body frames (>= 200 px) and the label glyphs
    (all the rest - small, white, inside the label bands: EXCLUDED, asserted).
  * Frames are grouped by sheet row (y-centre clusters, asserted 9/12/8/7/5/10/8+8/5) and sorted left -> right.
  * anchor = feet baseline (the frame's bottom row) + body centre = the centroid of its BOTTOM 40 % (paws / legs), so a raised
    head, a kicked leg or the curled roll never drags it. Hunched / lying / rolled frames share the same feet baseline.
  * nearest-neighbour only: frames are copied 1:1, never cropped (asserted inside the cell); on-screen size = Ben spriteScale
    2.0 x actionScale 1.0 (stand = ~100 px, about the hurtbox).
  * FRENZY frame set: the same frames washed red (render-only `_skinAnim` swap, Diamondhead Prismatic precedent).
  * This sheet has NO separate effect art (no swipe arcs / dust pieces): every effect is procedural pixel art in wildmutt.js.
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JPG = os.path.join(ROOT, 'wildmutt___sprites_sheet_by_ipmugenofficial_djimf88-fullview.jpeg')
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/wildmutt.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/wildmutt')
BG = (0, 181, 246)
KEY_DIST = 80
ACTION_SCALE = 1.0
PREFIX = 'ben10_wildmutt_ov_'
FRENZY_RED = (232, 36, 24)
FRENZY_MIX = 0.42

if not os.path.exists(SRC):                                          # one-time lossless decode; the PNG is the source of truth after
    os.makedirs(os.path.dirname(SRC), exist_ok=True)
    Image.open(JPG).convert('RGB').save(SRC, optimize=False)
im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not the blue key'
dist = np.sqrt(((im - np.array(BG)) ** 2).sum(axis=2))
art = dist >= KEY_DIST
EXACT_KEY = int((dist == 0).sum())

lab, n = ndimage.label(art, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    m = lab[s] == k + 1
    px = im[s][m]
    C[k + 1] = dict(id=k + 1, y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, n=int(m.sum()),
                    light=float(px[:, 1].mean()), yc=(s[0].start + s[0].stop) / 2)
BODY = sorted((c for c in C.values() if c['n'] >= 200), key=lambda c: c['yc'])
TEXT = sorted(c['id'] for c in C.values() if c['n'] < 200)
for i in TEXT:                                                        # every non-body piece is a label glyph: short, light (white text
    c = C[i]                                                          # anti-aliased over the blue), in the left-hand label column
    assert c['y1'] - c['y0'] <= 16 and c['light'] > 200 and c['x0'] < 260, ('unexpected non-body component', c)

rows = []
for c in BODY:
    if rows and abs(c['yc'] - rows[-1][-1]['yc']) < 35: rows[-1].append(c)
    else: rows.append([c])
NAMES = ['stand', 'run', 'cj', 'roar', 'gatk', 'sens', 'dig1', 'dig2', 'hit']
EXPECT = [9, 12, 8, 7, 5, 10, 8, 8, 5]
assert [len(r) for r in rows] == EXPECT, [len(r) for r in rows]
GROUPS = {nm: [c['id'] for c in sorted(r, key=lambda c: c['x0'])] for nm, r in zip(NAMES, rows)}
assert set(TEXT) | {i for g in GROUPS.values() for i in g} == set(C)

# OUTLINE colour (sampled): the darkest 5 % of the body pixels that are not blue-dominant
body_mask = np.isin(lab, [c['id'] for c in BODY])
bp = im[body_mask & (im[..., 2] <= im[..., 0])]
lum = bp.sum(1); OUTLINE = tuple(int(v) for v in np.median(bp[lum <= np.percentile(lum, 5)], axis=0))
blue_dom = im[..., 2] > im[..., 0]
FRINGE_N = int((body_mask & blue_dom).sum())
im[body_mask & blue_dom] = OUTLINE
NEAR_KEY_LEFT = int((body_mask & ~blue_dom & (dist < 120)).sum())     # kept art pixels still close to the key (reported)


def crop(cid):
    c = C[cid]
    m = lab[c['y0']:c['y1'], c['x0']:c['x1']] == cid
    rgb = im[c['y0']:c['y1'], c['x0']:c['x1']]
    return np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8)


def body_mid_x(a):
    al = a[..., 3] > 0
    lower = al[int(al.shape[0] * 0.6):]
    ys, xs = np.where(lower if lower.sum() >= 10 else al)
    return float(xs.mean())


def frenzy(a):
    b = a.copy(); rgb = b[..., :3].astype(float)
    rgb = rgb * (1 - FRENZY_MIX) + np.array(FRENZY_RED) * FRENZY_MIX
    b[..., :3] = np.clip(rgb.round(), 0, 255).astype(np.uint8)
    return b


def g(name, *nums): return [(name, i) for i in nums]
# anim -> (frames, speed, loop, role). EVERY one of the 72 sheet frames appears at least once (asserted below).
A = {
  'idle':       (g('stand', 1, 2, 3, 4, 5, 6, 7, 8, 9), 7, True, 'idle (STAND f1-9 loop)'),
  'walk':       (g('run', 1, 2, 3, 9, 10, 11, 12), 7, True, 'walk - the RUN gallop frames (f1-3, f9-12), cycled SLOWER (no walk row)'),
  'walk_back':  (g('run', 12, 11, 10, 9, 3, 2, 1), 7, True, 'walk back - the same gallop frames REVERSED, slowed'),
  'run':        (g('run', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12), 3, True, 'run (RUN f1-12: gallop -> bound -> gallop)'),
  'dash':       (g('run', 4, 5, 6, 7), 3, True, 'dash (RUN f4-7, the stretched bound)'),
  'jump':       (g('cj', 3, 4), 5, False, 'jump rise (CROUCH/JUMP f3-4)'),
  'doubleJump': (g('cj', 4, 5), 5, False, 'double jump - REUSED jump f4 -> f5'),
  'fall':       (g('cj', 5), 6, True, 'jump fall (CROUCH/JUMP f5)'),
  'crouch':     (g('cj', 1, 2), 4, False, 'crouch (CROUCH/JUMP f1-2)'),
  'guard':      (g('dig1', 1), 6, False, 'block - DIG f1 (hunched, head tucked; no guard row)'),
  'blockHit':   (g('dig1', 2), 6, False, 'block hit - DIG f2 (curled tighter)'),
  'light':      (g('roar', 6, 7), 3, False, 'JAB - ROAR/BITE f6-7 (the bite lunge)'),
  'heavy':      (g('gatk', 1, 2, 4), 5, False, 'HEAVY - GROUND ATTACK f1 rear -> f2 lunge -> f4 full swipe (+ procedural claw arc, 170 px)'),
  'down':       (g('dig1', 3, 4), 4, False, 'LOW - DIG f3-4 (the low forward leg rake)'),
  'up':         (g('gatk', 1, 3), 5, False, 'LAUNCHER - GROUND ATTACK f1 -> f3 (the handstand kick up)'),
  'air':        (g('run', 5), 6, False, 'AIR - RUN f5 (stretched, claws forward) + procedural claw swipe'),
  'hurt':       (g('hit', 1), 6, False, 'hit (HIT/DEATH f1)'),
  'hurt_air':   (g('hit', 2), 6, False, 'hit in the air / launched (HIT/DEATH f2)'),
  'knockdown':  (g('hit', 3, 4), 6, False, 'knockdown (HIT/DEATH f3 tumble -> f4 lying)'),
  'getup':      (g('hit', 4) + g('dig2', 1) + g('stand', 1), 6, False, 'get-up - REUSED HIT f4 -> DIG row 2 f1 (pushing up) -> STAND'),
  'dizzy':      (g('dig2', 6, 7, 8), 10, True, 'dizzy - DIG row 2 f6-8 (head down, pawing; no dizzy row)'),
  'transform':  (g('sens', 1, 2, 3, 4, 5), 5, False, 'transform-in - SENSITIVITY f1-5 (rising, sniffing)'),
  'taunt':      (g('sens', 1, 2, 3, 4, 5, 4, 3), 6, False, 'taunt - SENSITIVITY f1-5 (the scent sniff)'),
  'win':        (g('roar', 1, 2, 3, 4, 5), 6, False, 'win - REUSED ROAR f1-5'),
  'lose':       (g('hit', 5), 6, False, 'lose - HIT/DEATH f5 (lying flat)'),
  'grab':       (g('roar', 6, 7), 4, False, 'grab - REUSED the bite (ROAR/BITE f6-7)'),
  'wmPounce':   (g('run', 3, 4, 5, 6, 7, 8), 3, False, 'POUNCE / ult lunges - RUN f3-8 (crouch -> stretched leap -> land)'),
  'wmGround':   (g('dig1', 5, 6, 7, 8) + g('gatk', 5), 5, False, 'GROUND POUND - DIG f5-8 (rears up, arches over) -> GROUND ATTACK f5 (the slam)'),
  'wmMaul':     (g('roar', 6, 7) + g('dig2', 2, 3, 4, 5) + g('gatk', 4), 4, False, 'MAUL - bite (ROAR/BITE f6-7) -> pin and maul (DIG row 2 f2-5) -> toss (GROUND ATTACK f4)'),
  'wmRoar':     (g('roar', 1, 2, 3, 4, 5), 4, False, 'ROAR - ROAR/BITE f1 inhale, f2-5 roar (+ procedural rings); ult Final Roar'),
  'wmRush':     (g('sens', 6, 7, 8, 9, 10), 3, True, 'BULL RUSH - SENSITIVITY/ROLL f6 curl -> f7-10 roll loop'),
  'wmDive':     (g('cj', 6, 7, 8), 4, False, 'CLAW DIVE - CROUCH/JUMP f6-8 (spread, claws down-forward)'),
}
used = {(gname, i) for frames, *_ in A.values() for gname, i in frames}
allf = {(nm, i + 1) for nm in NAMES for i in range(len(GROUPS[nm]))}
assert used == allf, ('unused frames', sorted(allf - used))

ext = 0; top = 0
for frames, *_ in A.values():
    for grp, i in frames:
        a = crop(GROUPS[grp][i - 1]); mid = body_mid_x(a); ext = max(ext, mid, a.shape[1] - mid); top = max(top, a.shape[0])
CX = int(np.ceil(ext)) + 2
CELL_W = CX * 2
FEET_Y = top + 2
CELL_H = FEET_Y + 2


def place(a):
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    ox = int(round(CX - body_mid_x(a))); oy = FEET_Y - a.shape[0]
    assert 0 <= ox and ox + a.shape[1] <= CELL_W and 0 <= oy, ('cropped', a.shape, ox, oy)
    cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return cell, (ox, oy)


def build(red=False):
    anim, ledger = {}, []
    tag = 'frenzy_' if red else ''
    for key, (frames, speed, loop, role) in A.items():
        cells = []
        for grp, i in frames:
            cid = GROUPS[grp][i - 1]
            a = crop(cid)
            if red: a = frenzy(a)
            cell, off = place(a); cells.append(cell)
            c = C[cid]
            ledger.append(dict(anim=key, group=grp, frame=i, component=cid, src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']], offset=off, role=role))
        path = f'{PREFIX}{tag}{key}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build()
    red, _ = build(red=True)
    with open(os.path.join(ROOT, 'wildmuttAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_wildmutt.py from the orange Wildmutt sheet (ipmugenofficial, "STAND / RUN / CROUCH/JUMP /\n')
        fh.write('// ROAR/BITE / GROUND ATTACK / SENSITIVITY/ROLL / DIG THE GROUND / HIT/DEATH"). See docs/ben10/aliens/wildmutt/SPRITE_LEDGER.md.\n')
        fh.write('// 1:1 frames, nearest-neighbour; on-screen size from actionScale. WILDMUTT_FRENZY_ANIM = the same frames washed red - the\n')
        fh.write('// render-only FRENZY frame set. No extracted FX: the sheet has no separate effect art.\n')
        fh.write('export const WILDMUTT_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const WILDMUTT_FRENZY_ANIM = ' + json.dumps(red, indent=2) + '\n')
        fh.write('export const WILDMUTT_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
        fh.write('export const WILDMUTT_PAL = ' + json.dumps(dict(outline=OUTLINE, frenzy=FRENZY_RED)) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/wildmutt.png', key=list(BG), key_distance=KEY_DIST, exact_key_pixels=EXACT_KEY,
                fringe_pixels_snapped=FRINGE_N, near_key_leftovers=NEAR_KEY_LEFT, outline=OUTLINE,
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE, groups=GROUPS,
                removed_label_components=TEXT, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    # contact sheet: every strip (+ the frenzy idle / rush) at x2 on a checkerboard, cell borders, body-centre (red) / feet (green)
    rows_ = [(k, PREFIX + k + '_uniform.png') for k in A] + [('FRENZY ' + k, PREFIX + 'frenzy_' + k + '_uniform.png') for k in ('idle', 'heavy', 'wmRush')]
    S = 2; LW = 110
    imgs = [(nm, Image.open(os.path.join(ROOT, p))) for nm, p in rows_]
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
    # each labeled sheet row played as an animation (x3): docs/ben10/aliens/wildmutt/preview_<row>.gif
    for nm in NAMES:
        fr = []
        for cid in GROUPS[nm]:
            cell, _ = place(crop(cid)); b = Image.new('RGBA', (CELL_W, CELL_H), BG + (255,)); b.alpha_composite(Image.fromarray(cell, 'RGBA'))
            fr.append(b.convert('RGB').resize((CELL_W * 3, CELL_H * 3), Image.NEAREST))
        fr[0].save(os.path.join(DOC, f'preview_{nm}.gif'), save_all=True, append_images=fr[1:], duration=140, loop=0)
    print('anims', len(anim), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'labels', len(TEXT), 'exact key', EXACT_KEY,
          'fringe snapped', FRINGE_N, 'near-key left', NEAR_KEY_LEFT, 'outline', OUTLINE)
