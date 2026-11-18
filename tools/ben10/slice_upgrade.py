#!/usr/bin/env python3
"""Slice the UPGRADE (Galvanic Mechamorph) sheet into uniform game strips (Phase 1 of the Upgrade alien).

  python3 -I tools/ben10/slice_upgrade.py   # writes ben10_upgrade_ready_*.png, upgradeAssets.js, docs/ben10/aliens/upgrade/*

Source: assets/sprites/ben10/aliens/upgrade.png (682x795) = a byte copy of the tracked root file
upgrade_sprite_sheet_by_dragonrod342_d7z5d59.png ("Ben 10 Upgrade sprite sheet made by Dragonrod"), found by contact sheet
(green-and-black goo humanoid, one eye, bright blue background, labels stand / walk / crouch / jump / fall / attack arrows /
Alt Pal, a row of computer frames, credit box). The root upgrade.png is a RE-SAVED copy (background (0,163,232), not the
exact key) and is NOT used.
Rules (see docs/ben10/aliens/upgrade/SPRITE_LEDGER.md):
  * Background = (0,162,232) (#00A2E8) at every corner. Key = EXACT colour, zero tolerance: only pixels equal to it are removed,
    nothing is eroded. Near-key check: no kept pixel is within RGB distance 80 of the key (the terminals' blue screens are far
    from it: nearest reported), so no leftovers.
  * 8-connected components, every one assigned explicitly (asserted). EXCLUDED (not art): every label glyph, the white
    "(computer from GBA metroid game)" caption box, the white credit box, and BOTH Alt Pal figures (the green reference
    and the white ALT PAL) — the pair is SAMPLED first: they are the same pose pixel-for-pixel, so pixel correspondence gives
    an exact normal -> alt colour map, used for the render-only OVERCLOCK frame set (Phase 4).
  * The small green dash after attack f3 is a separate FX frame (the ZAP BOLT). Whip arcs / tendrils touching a body are
    part of that body frame (connected components never split them). The attack-down row ends in the figure fused with a
    terminal: the MERGE frame. The computer row = the TERMINAL boot sequence (10 FX frames, base anchored).
  * anchor = feet baseline (bottom row) + body centre = the centroid of the frame's BOTTOM 40 % (feet / legs), so a whip,
    tendril or raised arm never drags it; for melt frames that is the puddle's centre on the floor line.
  * nearest-neighbour only: frames are copied 1:1, never cropped (asserted inside the cell).
Deterministic: re-running is byte-identical.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/upgrade.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/upgrade')
BG = (0, 162, 232)
NEAR = 80
ACTION_SCALE = 1.1    # native stand 58 px -> x2.2 on screen (Ben spriteScale 2.0 x 1.1), about Goku's height
PREFIX = 'ben10_upgrade_ready_'   # _ready_: the experimental `upgrade` (fighters.js) still names ben10_upgrade_*_uniform.png

im = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    assert tuple(im[y, x]) == BG, 'corner is not the blue key'
art = ~(im == np.array(BG)).all(axis=2)                                  # zero tolerance: exact key only
dist = np.sqrt(((im - np.array(BG)) ** 2).sum(axis=2))
NEAR_LEFT = int((art & (dist < NEAR)).sum())
NEAREST = float(dist[art].min())

lab, n = ndimage.label(art, structure=np.ones((3, 3)))
C = {}
for k, s in enumerate(ndimage.find_objects(lab)):
    m = lab[s] == k + 1
    px = im[s][m]
    C[k + 1] = dict(id=k + 1, y0=s[0].start, y1=s[0].stop, x0=s[1].start, x1=s[1].stop, n=int(m.sum()),
                    white=float((px.min(1) > 200).mean()), green=float(((px[:, 1] > px[:, 0] + 40) & (px[:, 1] > px[:, 2])).mean()))
hh = lambda c: c['y1'] - c['y0']
ww = lambda c: c['x1'] - c['x0']
BOLT = [c['id'] for c in C.values() if hh(c) <= 5 and ww(c) >= 12 and c['green'] > 0.5]          # the green dash after attack f3
CAPTION = [c['id'] for c in C.values() if c['n'] > 4000 and c['white'] > 0.5 and c['y0'] < 500]   # "(computer from GBA metroid game)"
CREDIT = [c['id'] for c in C.values() if c['n'] > 4000 and c['white'] > 0.5 and c['y0'] > 700]   # "Ben 10 Upgrade sprite sheet made by Dragonrod"
TEXT = sorted(c['id'] for c in C.values() if hh(c) <= 10 and c['n'] <= 40 and c['id'] not in BOLT)   # every label glyph
BODY = lambda c: c['n'] >= 150 and c['id'] not in CAPTION + CREDIT
ALT = sorted((c['id'] for c in C.values() if BODY(c) and c['x0'] > 540 and c['y0'] < 160), key=lambda i: C[i]['x0'])   # [green ref, WHITE alt pal]
assert len(BOLT) == 1 and len(CAPTION) == 1 and len(CREDIT) == 1 and len(ALT) == 2, (BOLT, CAPTION, CREDIT, ALT)
assert C[ALT[1]]['white'] > 0.3 and C[ALT[0]]['white'] < 0.1, 'alt pal order'
EXCLUDED = set(TEXT) | set(CAPTION) | set(CREDIT) | set(ALT)


def comps(y0, y1, pred=BODY):
    return [c['id'] for c in sorted(C.values(), key=lambda c: c['x0']) if y0 <= c['y0'] < y1 and c['id'] not in EXCLUDED and c['id'] not in BOLT and pred(c)]


GROUPS = {
    'stand':  comps(0, 40),
    'walk':   comps(85, 120),
    'jfc':    comps(170, 260),            # fall / jump / crouch sorted by x: crouch (x25), jump (x127), fall (x284)
    'melt':   comps(280, 350),            # attack-down: 6 melt frames + the MERGE frame (figure fused with a terminal)
    'term':   comps(370, 430, lambda c: BODY(c) and c['n'] < 3000),
    'atk':    comps(430, 490),
    'fwd':    comps(510, 600),
    'up':     comps(595, 730),
}
EXPECT = dict(stand=4, walk=6, jfc=3, melt=7, term=10, atk=3, fwd=6, up=6)
for g, k in EXPECT.items(): assert len(GROUPS[g]) == k, (g, GROUPS[g])
# melt row: the MERGE frame is the widest-bodied one with terminal pixels; it sits between f5 and f6 on the sheet? -> by x it is LAST.
MELT = GROUPS['melt']
MERGE = max(MELT, key=lambda i: C[i]['x0'])                              # rightmost = the fused figure (sheet order)
MELT6 = [i for i in MELT if i != MERGE]
assert C[MERGE]['n'] > 1400 and len(MELT6) == 6, (MERGE, MELT6)
used = set(EXCLUDED) | set(BOLT)
for ids in GROUPS.values(): used |= set(ids)
assert used == set(C), ('unassigned components', sorted(set(C) - used))
JFC = dict(zip(('crouch', 'jump', 'fall'), GROUPS['jfc']))


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


# ── OVERCLOCK palette (sampled from the Alt Pal pair BEFORE it is excluded): pixel correspondence -> exact colour map ──
ga, wa = crop(ALT[0]), crop(ALT[1])
assert ga.shape == wa.shape and ((ga[..., 3] > 0) == (wa[..., 3] > 0)).all(), 'the Alt Pal pair is not pixel-aligned'
PAL = {}
for gpx, wpx in zip(ga[..., :3][ga[..., 3] > 0].tolist(), wa[..., :3][wa[..., 3] > 0].tolist()):
    PAL.setdefault(tuple(gpx), {}).setdefault(tuple(wpx), 0)
    PAL[tuple(gpx)][tuple(wpx)] += 1
ALT_MAP = {g: max(v.items(), key=lambda kv: (kv[1], kv[0]))[0] for g, v in sorted(PAL.items())}   # majority (ties by colour: deterministic)
ALT_CONFLICTS = {str(g): len(v) for g, v in PAL.items() if len(v) > 1}


def overclock(a):
    """Alt-pal recolour of one frame (render-only OVERCLOCK frame set): every colour the Alt Pal pair maps is swapped to its
    alt colour; colours the pair never shows (terminal pixels in the MERGE frame) are kept."""
    b = a.copy(); al = b[..., 3] > 0; rgb = b[..., :3]
    out = rgb.copy()
    for g, w in ALT_MAP.items():
        out[al & (rgb == np.array(g, np.uint8)).all(-1)] = w
    b[..., :3] = out
    return b


def g(name, *nums): return [(name, i) for i in nums]
# anim -> (frames, speed, loop, role)
A = {
  'idle':       (g('stand', 1, 2, 3, 4), 9, True,  'idle (stand loop)'),
  'walk':       (g('walk', 1, 2, 3, 4, 5, 6), 7, True,  'walk (walk; the figure is hunched and leaning)'),
  'walk_back':  (g('walk', 6, 5, 4, 3, 2, 1), 7, True,  'walk back - WALK REVERSED'),
  'run':        (g('walk', 1, 2, 3, 4, 5, 6), 4, True,  'run - the WALK cycle played FASTER (no run art)'),
  'dash':       (g('walk', 2, 3), 3, True,  'dash - WALK f2-3, fast'),
  'jump':       (g('jump', 1), 6, False, 'jump rise (jump)'),
  'doubleJump': (g('jump', 1), 6, False, 'double jump - REUSED jump'),
  'fall':       (g('fall', 1), 6, True,  'jump fall (fall, limbs up)'),
  'crouch':     (g('crouch', 1), 6, False, 'crouch'),
  'guard':      (g('crouch', 1), 6, False, 'block - REUSED crouch'),
  'blockHit':   (g('crouch', 1), 6, False, 'block hit - REUSED crouch'),
  'light':      (g('atk', 1, 2), 3, False, 'JAB (attack f1-2)'),
  'heavy':      (g('fwd', 1, 2, 3, 4, 5), 4, False, 'HEAVY (attack-fwd f1-5: wind-up, long stretched arm, 180 px)'),
  'down':       (g('crouch', 1), 6, False, 'LOW - crouch frame + procedural low whip (hits low)'),
  'up':         (g('up', 1, 2, 3, 4), 4, False, 'LAUNCHER (attack-up f1-4 rising tendril arc)'),
  'air':        (g('fall', 1), 6, False, 'AIR - fall frame + procedural whip'),
  'hurt':       (g('fall', 1), 6, False, 'hit light / heavy - REUSED fall (no hurt pose)'),
  'hurt_air':   (g('fall', 1), 6, False, 'hit in the air - REUSED fall'),
  'knockdown':  (g('melt', 6), 6, False, 'knockdown - REUSED melt f6 (the puddle; no knockdown pose)'),
  'getup':      (g('melt', 6, 5, 4, 3, 2, 1), 3, False, 'get-up - REUSED melt f6 -> f1 (reform)'),
  'dizzy':      (g('stand', 1, 2), 12, True, 'dizzy - REUSED stand f1-2 (no dizzy pose)'),
  'transform':  (g('melt', 6, 5, 4, 3, 2, 1), 3, False, 'transform-in - REUSED reform (melt reversed)'),
  'taunt':      (g('stand', 1, 2, 3, 4), 6, False, 'taunt - REUSED stand'),
  'win':        (g('stand', 1, 2, 3, 4), 9, True,  'win - REUSED stand (no win pose)'),
  'lose':       (g('crouch', 1), 6, False, 'lose - REUSED crouch (no lose pose)'),
  'grab':       (g('atk', 1, 2), 4, False, 'grab - REUSED jab'),
  'upZap':      (g('atk', 1, 3), 4, False, 'ZAP BOLT cast (attack f1 -> f3; the bolt is the extracted green dash FX)'),
  'upLash':     (g('fwd', 1, 2, 3, 4, 5, 6), 4, False, 'TENDRIL LASH (attack-fwd full: f1-3 wind-up, f4-5 stretched arm, f6 retract) + ult opener'),
  'upMelt':     (g('melt', 1, 2, 3, 4, 5, 6), 2, False, 'GOO DIVE enter (attack-down f1-6 melting into a puddle)'),
  'upPuddle':   (g('melt', 6), 6, True,  'GOO DIVE puddle slide (attack-down f6 held)'),
  'upReform':   (g('melt', 6, 5, 4, 3, 2, 1), 2, False, 'GOO DIVE reform (attack-down f6 -> f1, reverse melt)'),
  'upMerge':    (g('merge', 1), 6, False, 'MERGE (attack-down f7: the figure fused with a terminal) + ult Hard Reset'),
  'upRise':     (g('up', 4, 5, 6), 4, False, 'TENDRIL RISE anti-air (attack-up f4-6)'),
  'upSpear':    (g('fall', 1), 6, False, 'SPEAR DIVE (fall frame + procedural diagonal tendril)'),
  'upDeploy':   (g('crouch', 1), 6, False, 'DEPLOY TERMINAL cast - REUSED crouch (hand to the floor; the terminal FX boots ahead)'),
}
SRCMAP = dict(stand=GROUPS['stand'], walk=GROUPS['walk'], atk=GROUPS['atk'], fwd=GROUPS['fwd'], up=GROUPS['up'],
              melt=MELT6, merge=[MERGE], crouch=[JFC['crouch']], jump=[JFC['jump']], fall=[JFC['fall']])

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


def build(alt=False):
    anim, ledger = {}, []
    tag = 'oc_' if alt else ''
    for key, (frames, speed, loop, role) in A.items():
        cells = []
        for grp, i in frames:
            cid = SRCMAP[grp][i - 1]
            a = crop(cid)
            if alt: a = overclock(a)
            cell, off = place(a); cells.append(cell)
            c = C[cid]
            ledger.append(dict(anim=key, group=grp, frame=i, component=cid, src_bbox=[c['x0'], c['y0'], c['x1'], c['y1']], offset=off, role=role))
        path = f'{PREFIX}{tag}{key}_uniform.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        anim[key] = dict(sheet='./' + path, frames=len(cells), width=CELL_W, height=CELL_H, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
    return anim, ledger


def build_fx():
    """FX strips: TERMINAL boot (10 frames, base anchored: bottom-centre of a uniform cell) and the ZAP BOLT dash."""
    fx = {}
    for name, ids in (('terminal', GROUPS['term']), ('bolt', BOLT)):
        crops = [crop(i) for i in ids]
        cw = max(a.shape[1] for a in crops); ch = max(a.shape[0] for a in crops)
        cells = []
        for a in crops:
            cell = np.zeros((ch, cw, 4), np.uint8)
            ox = (cw - a.shape[1]) // 2; oy = ch - a.shape[0]
            cell[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a; cells.append(cell)
        path = f'{PREFIX}fx_{name}.png'
        Image.fromarray(np.concatenate(cells, axis=1), 'RGBA').save(os.path.join(ROOT, path))
        fx[name] = dict(sheet='./' + path, frames=len(cells), w=int(cw), h=int(ch), speed=6,
                        src=[[C[i]['x0'], C[i]['y0'], C[i]['x1'], C[i]['y1']] for i in ids])
    return fx


if __name__ == '__main__':
    os.makedirs(DOC, exist_ok=True)
    anim, led = build()
    oc, _ = build(alt=True)
    fx = build_fx()
    with open(os.path.join(ROOT, 'upgradeAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_upgrade.py from the Upgrade sheet ("Ben 10 Upgrade sprite sheet made by Dragonrod").\n')
        fh.write('// See docs/ben10/aliens/upgrade/SPRITE_LEDGER.md. 1:1 frames, nearest-neighbour; on-screen size from actionScale.\n')
        fh.write('// UPGRADE_OC_ANIM = the same frames recoloured with the sampled ALT PAL colour map - the render-only OVERCLOCK frame set.\n')
        fh.write('// UPGRADE_FX: extracted sheet effects - terminal (10-frame boot, f10 = ONLINE), bolt (the ZAP BOLT dash).\n')
        fh.write('export const UPGRADE_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const UPGRADE_OC_ANIM = ' + json.dumps(oc, indent=2) + '\n')
        fh.write('export const UPGRADE_FX = ' + json.dumps(fx, indent=2) + '\n')
        fh.write('export const UPGRADE_GEOM = ' + json.dumps(dict(cellW=CELL_W, cellH=CELL_H, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)) + '\n')
        fh.write('export const UPGRADE_ALT_PAL = ' + json.dumps({'%d,%d,%d' % g: list(w) for g, w in ALT_MAP.items()}) + '\n')
    grid = dict(source='assets/sprites/ben10/aliens/upgrade.png', key=list(BG), zero_tolerance=True,
                near_key_leftovers=NEAR_LEFT, nearest_kept_pixel_distance=round(NEAREST, 1),
                cell=[CELL_W, CELL_H], feetY=FEET_Y, centreX=CX, actionScale=ACTION_SCALE,
                groups={k: v for k, v in GROUPS.items()}, melt=MELT6, merge=MERGE, jfc=JFC, bolt=BOLT,
                alt_pal=dict(green_reference=ALT[0], white_alt=ALT[1], colour_map={'%d,%d,%d' % g: list(w) for g, w in ALT_MAP.items()},
                             conflicts=ALT_CONFLICTS),
                removed_text_components=TEXT, removed_caption=CAPTION, removed_credit=CREDIT, removed_alt_figures=ALT, ledger=led)
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)

    rows = [(k, PREFIX + k + '_uniform.png') for k in A] + [('OC ' + k, PREFIX + 'oc_' + k + '_uniform.png') for k in ('idle', 'upLash', 'upMerge')] \
        + [('fx terminal', PREFIX + 'fx_terminal.png'), ('fx bolt', PREFIX + 'fx_bolt.png')]
    S = 2; LW = 110
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
        if not nm.startswith('fx'):
            for f in range(i.width // CELL_W):
                cd.line([(f * CELL_W * S, 0), (f * CELL_W * S, bh)], fill=(120, 120, 140, 255))
                cd.line([((f * CELL_W + CX) * S, 0), ((f * CELL_W + CX) * S, bh)], fill=(200, 80, 80, 255))
            cd.line([(0, FEET_Y * S), (bw, FEET_Y * S)], fill=(0, 200, 120, 255))
        chk.alpha_composite(i.resize((bw, bh), Image.NEAREST))
        sheet.alpha_composite(chk, (LW, y)); d.text((6, y + 4), nm, fill=(230, 230, 230, 255)); y += bh + 6
    sheet.save(os.path.join(DOC, 'contact_sheet.png'))
    # the TERMINAL row played as an animation (x4, on the source blue) + a few body rows
    st = Image.open(os.path.join(ROOT, PREFIX + 'fx_terminal.png')); tw = fx['terminal']['w']; th = fx['terminal']['h']; fr = []
    for j in range(fx['terminal']['frames']):
        a = st.crop((j * tw, 0, (j + 1) * tw, th)); b = Image.new('RGBA', a.size, BG + (255,)); b.alpha_composite(a)
        fr.append(b.convert('RGB').resize((tw * 4, th * 4), Image.NEAREST))
    fr[0].save(os.path.join(DOC, 'preview_terminal.gif'), save_all=True, append_images=fr[1:], duration=120, loop=0)
    for row in ('idle', 'walk', 'upLash', 'upMelt', 'up'):
        st = Image.open(os.path.join(ROOT, PREFIX + row + '_uniform.png')); k = st.width // CELL_W; fr = []
        for j in range(k):
            a = st.crop((j * CELL_W, 0, (j + 1) * CELL_W, CELL_H)); b = Image.new('RGBA', a.size, BG + (255,)); b.alpha_composite(a)
            fr.append(b.convert('RGB').resize((CELL_W * 2, CELL_H * 2), Image.NEAREST))
        fr[0].save(os.path.join(DOC, f'preview_{row}.gif'), save_all=True, append_images=fr[1:], duration=150, loop=0)
    print('anims', len(anim), 'cell', CELL_W, CELL_H, 'CX', CX, 'feet', FEET_Y, 'fx', {k: v['frames'] for k, v in fx.items()},
          'text', len(TEXT), 'caption', CAPTION, 'credit', CREDIT, 'alt', ALT, 'merge', MERGE, 'melt', MELT6,
          'near-key leftovers', NEAR_LEFT, 'nearest kept', round(NEAREST, 1), 'alt map', len(ALT_MAP), 'conflicts', ALT_CONFLICTS)
