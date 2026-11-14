#!/usr/bin/env python3
"""Roronoa Zoro sprite extraction (feat/zoro, Phase 1).

Source: assets/incoming/zoro/zoro_sheet.png  (GBA One Piece rip by Paddy, 286x549 RGBA, alpha-keyed).

Rules honoured here (see docs/zoro/SPRITE_LEDGER.md):
  * The sheet already has a binary alpha key (0/255) - that IS the chroma key; no colour keying needed.
  * Connected-component survey -> explicit per-frame source rectangles (listed in FRAMES below).
  * NEAREST-NEIGHBOUR ONLY. The only geometric ops are: crop, integer translate, horizontal MIRROR
    (a lossless pixel permutation) and integer NN upscale for the portrait. No interpolation, ever.
  * NO invented art. Yellow slash arcs are SEPARATED from the body by a spatial rule (arc-coloured
    regions that contain yellow and are not black-outlined); both layers keep their original pixels.
  * Exactly one exclusion: the ripper credit text ("Ripped by Paddy / No credit needed").

Run:  python3 tools/zoro/extract.py
"""
import json, hashlib, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/incoming/zoro/zoro_sheet.png')
OUT_SPR = os.path.join(ROOT, 'assets/sprites/zoro')
OUT_FX = os.path.join(ROOT, 'assets/fx/zoro')
OUT_DOC = os.path.join(ROOT, 'docs/zoro')
CELL_W, CELL_H, ORIGIN_X, ORIGIN_Y = 320, 256, 160, 150   # same cell/pivot contract as Luffy (same game, same ripper)

# ---------------------------------------------------------------------------------------------
# Every frame on the sheet: id -> (row, frame#, x0, y0, x1, y1, mirror, interpretation)
# Rectangles come from the connected-component survey (stray 1-4 px sparkles inside a rectangle
# stay attached to that frame).  Row numbers are the sheet's 9 visual rows.
# ---------------------------------------------------------------------------------------------
FRAMES = {
  # R1 - 6 frames, walk cycle. Source faces LEFT (overworld NPC sprite, no bandana).
  **{f'w{i}': ('R1', i + 1, x0, 0, x1, 56, True, 'walk cycle (mirrored to face right)')
     for i, (x0, x1) in enumerate([(15, 47), (49, 78), (84, 113), (120, 152), (159, 191), (197, 229)])},
  # R2 - 2 frames, idle stance (faces LEFT, hand on hilts).
  'i0': ('R2', 1, 19, 62, 51, 119, True, 'idle stance A (mirrored)'),
  'i1': ('R2', 2, 59, 62, 91, 119, True, 'idle stance B (mirrored)'),
  # R3 - 5 frames: a drawn-sword stance, then a 4-frame HIT REACTION (not a spin/roll - see ledger).
  'd0': ('R3', 1, 0, 123, 51, 178, False, 'swords drawn wide - the draw/ready pose'),
  'h0': ('R3', 2, 58, 123, 94, 178, False, 'reels back from a hit (head snapped up)'),
  'h1': ('R3', 3, 99, 123, 146, 178, False, 'knocked back, impact stars'),
  'h2': ('R3', 4, 146, 123, 201, 178, False, 'crumpling forward, impact stars'),
  'k0': ('R3', 5, 205, 123, 277, 178, False, 'lying prone (knocked down)'),
  # R4 - 5 frames, multi-sword slashes; fr5 carries the big X of yellow arcs (fr4 has none).
  'n0': ('R4', 1, 2, 187, 64, 239, False, 'one-arm extended slash, second blade cocked'),
  'n1': ('R4', 2, 71, 187, 109, 239, False, 'two blades raised and crossed'),
  'n2': ('R4', 3, 115, 187, 153, 239, False, 'low crouch, blades up - lunge set'),
  'n3': ('R4', 4, 162, 187, 209, 239, False, 'lunging, three blades crossed'),
  'n4': ('R4', 5, 217, 187, 287, 239, False, 'crouched follow-through under an X of yellow arcs'),
  # R5 - 3 frames (not 4), wide horizontal slashes.
  's0': ('R5', 1, 0, 247, 101, 290, False, 'Santoryu wide slash, yellow arcs both sides'),
  's1': ('R5', 2, 109, 247, 171, 290, False, 'wide stance, blades swept out'),
  's2': ('R5', 3, 181, 247, 230, 290, False, 'deep crouch, blades low'),
  # R6 - 4 frames (not 5).
  'l0': ('R6', 1, 3, 293, 65, 347, False, 'knee-up rising slash'),
  'l1': ('R6', 2, 75, 293, 123, 347, False, 'bent forward, blade swung overhead'),
  'l2': ('R6', 3, 128, 293, 178, 347, False, 'tucked low crouch, head down'),
  'l3': ('R6', 4, 184, 293, 251, 347, False, 'standing double thrust, both arms out'),
  # R7 - 4 frames (not 5).
  't0': ('R7', 1, 11, 359, 64, 412, False, 'mouth-sword stance with yellow draw burst'),
  't1': ('R7', 2, 66, 359, 134, 412, False, 'long forward thrust'),
  't2': ('R7', 3, 143, 359, 193, 412, False, 'crouched spin-cut, yellow arc'),
  't3': ('R7', 4, 207, 359, 256, 412, False, 'blade raised overhead, yellow arc above'),
  # R9 - 2 Zoro frames with the vertical object (a wooden execution stake).
  'p0': ('R9', 1, 12, 489, 48, 549, False, 'tied to the wooden execution stake (Shells Town)'),
  'p1': ('R9', 2, 60, 489, 96, 549, False, 'free of the stake - rope coil slipping off, cut ends falling'),
}
TORNADO = [('R8', i + 1, x0, 426, x1, 482) for i, (x0, x1) in enumerate([(13, 55), (62, 104), (114, 156), (163, 204)])]
MERRY_BOX = (110, 489, 276, 550)        # Going Merry ram figurehead + bow (R9)
CREDIT_BOX = (167, 515, 276, 550)       # the credit text plate printed over the hull - the ONE exclusion
FX_SOURCE_FRAMES = ['n4', 's0', 't0', 't2', 't3']

YELLOW, GOLD, WHITE, WHITE2, BLACK = (216, 224, 64), (168, 136, 0), (248, 248, 248), (255, 255, 255), (0, 0, 0)
HARAMAKI = [(112, 200, 80), (32, 112, 16)]

# ---------------------------------------------------------------------------------------------
# Animations: name -> (frame ids, ticks per frame, loop).  Attack timing is driven by the sim's
# frameTimeline (zoroData.js), not by these speeds.
# ---------------------------------------------------------------------------------------------
W = [f'w{i}' for i in range(6)]
ANIMS = {
  'idle': (['i0', 'i1'], 22, True),
  'idle_post': (['p0', 'p1'], 40, False),      # 6s-inactivity endurance idle (tied to the stake -> shrugs free)
  'walk': (W, 6, True), 'walk_back': (W[::-1], 6, True), 'run': (W, 4, True),
  'walk_away': ([f'wa{i}' for i in range(6)], 6, True),   # ORIGINAL left-facing R1 frames (I'm Not Lost)
  'dash': (['n2'], 4, True), 'crouch': (['s2'], 4, False),
  'jump': (['l0'], 4, False), 'fall': (['l0'], 4, False),
  'guard': (['n1'], 4, False), 'guard_hit': (['n1'], 4, False),
  'hurt': (['h0', 'h1'], 6, False), 'hurt_heavy': (['h1', 'h2'], 8, False), 'hurt_air': (['h1'], 4, False),
  'knockdown': (['h2', 'k0'], 10, False), 'getup': (['k0', 'h2', 'i0'], 8, False),
  'lose': (['k0'], 8, False), 'win': (['t3'], 8, False), 'win2': (['p0', 'p1'], 40, False),
  'transform': (W + ['d0', 'i0'], 6, False),   # intro: walk in -> draw -> stance
  'taunt': (['i0', 'i1', 'i0', 'i1', 'wa0', 'wa1', 'i0'], 12, False),
  'roll': (['l2', 's2'], 6, False),
  # Ittoryu
  'zI_jab': (['d0'], 4, False), 'zI_thrust': (['t0', 't1'], 4, False), 'zI_low': (['l2'], 4, False),
  'zI_aa': (['t3'], 4, False), 'zI_air': (['t1'], 4, False),
  # Nitoryu
  'zN_double': (['n0', 'n1'], 4, False), 'zN_cross': (['n2', 'n3'], 4, False), 'zN_low': (['l1', 'l2'], 4, False),
  'zN_air': (['n3', 'n4'], 4, False),
  # Santoryu
  'zS_wide': (['s1', 's0'], 4, False), 'zS_kneel': (['t2', 's2'], 4, False), 'zS_over': (['l1', 't3'], 4, False),
  'zS_launch': (['l3', 'l0'], 4, False), 'zS_air': (['s0'], 4, False),
  # Specials / ultimate
  'zOni': (['n2', 'n3', 'n4'], 4, False), 'zRengoku': (['n2', 'n3', 'n4', 'n3', 'n4', 'n3', 'n4'], 4, False),
  'zTatsu': (['s2', 't2', 't3'], 4, False), 'zPound': (['s1', 's0', 's2'], 4, False),
  'zShishi': (['t0', 't1', 'i0'], 4, False), 'zLost': ([f'wa{i}' for i in range(6)], 5, True),
  'zLostArrive': (['n2', 'i0'], 4, False), 'zStance': (['n1', 'i0'], 4, False),
  'zAshura': (['s1', 't0', 's0'], 6, False), 'zIchidai': (['t2', 't3', 's0', 't2', 't3', 's0', 's2'], 6, False),
  'grab': (['n0'], 4, False), 'throw': (['n2', 'n3'], 4, False),
}


def load():
    im = np.array(Image.open(SRC).convert('RGBA'))
    assert set(np.unique(im[:, :, 3])) <= {0, 255}, 'expected a binary alpha key'
    return im


def colour_mask(im, c):
    return (im[:, :, 3] > 0) & (im[:, :, 0] == c[0]) & (im[:, :, 1] == c[1]) & (im[:, :, 2] == c[2])


def split_fx(crop):
    """Return (body, fx) layers. FX = arc-coloured regions holding >=2 yellow px, <50% black-adjacent."""
    Y, G = colour_mask(crop, YELLOW), colour_mask(crop, GOLD)
    Wt = colour_mask(crop, WHITE) | colour_mask(crop, WHITE2)
    B = colour_mask(crop, BLACK)
    arc = Y | G | Wt
    near_black = ndimage.binary_dilation(B, structure=np.ones((3, 3)))
    lab, n = ndimage.label(arc, structure=np.ones((3, 3)))
    keep = np.zeros(arc.shape, bool)
    for i in range(1, n + 1):
        m = lab == i
        if (Y & m).sum() >= 2 and (near_black & m).sum() / m.sum() < 0.5:
            keep |= m
    fx = crop.copy(); fx[~keep] = 0
    body = crop.copy(); body[keep] = 0
    return body, fx


def pivot(layer):
    a = layer[:, :, 3] > 0
    ys, xs = np.where(a)
    top, bot = ys.min(), ys.max()
    h = bot - top + 1
    band = np.zeros_like(a); band[top + int(h * 0.35): bot - int(h * 0.12) + 1] = True
    g = np.zeros_like(a)
    for c in HARAMAKI: g |= colour_mask(layer, c)
    g &= band
    px = int(round(np.where(g)[1].mean())) if g.sum() >= 6 else int(round((xs.min() + xs.max()) / 2))
    return px, int(bot)


def place(layer, px, py):
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8)
    dx, dy = ORIGIN_X - px, (ORIGIN_Y - 1) - py
    h, w = layer.shape[:2]
    cell[dy:dy + h, dx:dx + w] = layer   # integer translate only
    return cell


def main():
    im = load()
    sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()
    os.makedirs(OUT_SPR, exist_ok=True); os.makedirs(OUT_FX, exist_ok=True); os.makedirs(OUT_DOC, exist_ok=True)
    cells, rects, fx_manifest, ledger_rows = {}, {}, {}, []

    for fid, (row, fn, x0, y0, x1, y1, mirror, desc) in FRAMES.items():
        crop = im[y0:y1, x0:x1].copy()
        fxl = None
        if fid in FX_SOURCE_FRAMES:
            crop, fxl = split_fx(crop)
        if mirror:
            crop = crop[:, ::-1].copy()
        px, py = pivot(crop)
        cells[fid] = place(crop, px, py)
        rects[fid] = dict(row=row, frame=fn, x=x0, y=y0, w=x1 - x0, h=y1 - y0, mirrored=mirror, pivot=[px, py], desc=desc)
        if mirror and fid.startswith('w'):   # the ORIGINAL left-facing walk frame, used by walk_away
            orig = crop[:, ::-1].copy(); opx, opy = pivot(orig)
            cells['wa' + fid[1:]] = place(orig, opx, opy)
        if fxl is not None:
            # In-place FX layer: same cell + pivot as the body, so it overlays exactly where the artist drew it.
            name = f'fx_{fid}'
            Image.fromarray(place(fxl, px, py)).save(os.path.join(OUT_FX, name + '.png'))
            fx_manifest[name] = dict(file=f'./assets/fx/zoro/{name}.png', w=CELL_W, h=CELL_H, originX=ORIGIN_X, originY=ORIGIN_Y,
                                     inPlace=True, source=f'{row} fr{fn}', px=int((fxl[:, :, 3] > 0).sum()))
            # Standalone components, tight-cropped, for scaling/mirroring/layering on any move.
            lab, n = ndimage.label(fxl[:, :, 3] > 0, structure=np.ones((3, 3)))
            comps = sorted(enumerate(ndimage.find_objects(lab), start=1), key=lambda t: t[1][1].start)
            k = 0
            for label_id, s in comps:
                piece = fxl[s].copy(); piece[lab[s] != label_id] = 0
                if (piece[:, :, 3] > 0).sum() < 6: continue
                cname = f'arc_{fid}_{k}'; k += 1
                Image.fromarray(piece).save(os.path.join(OUT_FX, cname + '.png'))
                fx_manifest[cname] = dict(file=f'./assets/fx/zoro/{cname}.png', w=piece.shape[1], h=piece.shape[0],
                                          originX=piece.shape[1] // 2, originY=piece.shape[0] // 2, inPlace=False,
                                          source=f'{row} fr{fn} component {k}', px=int((piece[:, :, 3] > 0).sum()))

    # Tornado - 4 standalone effect frames (no Zoro in frame). Bottom-centre origin.
    tw = max(x1 - x0 for _, _, x0, _, x1, _ in TORNADO); th = max(y1 - y0 for *_, y0, _, y1 in [(0, 0, t[2], t[3], t[4], t[5]) for t in TORNADO])
    strip = np.zeros((th, tw * 4, 4), np.uint8)
    for i, (row, fn, x0, y0, x1, y1) in enumerate(TORNADO):
        crop = im[y0:y1, x0:x1]; ys, xs = np.where(crop[:, :, 3] > 0)
        crop = crop[:ys.max() + 1]
        ox = i * tw + (tw - crop.shape[1]) // 2
        strip[th - crop.shape[0]:th, ox:ox + crop.shape[1]] = crop
        rects[f'tornado{i}'] = dict(row=row, frame=fn, x=x0, y=y0, w=x1 - x0, h=y1 - y0, mirrored=False, desc='tornado / whirlwind effect')
    Image.fromarray(strip).save(os.path.join(OUT_FX, 'tornado.png'))
    fx_manifest['tornado'] = dict(file='./assets/fx/zoro/tornado.png', w=tw, h=th, frames=4, originX=tw // 2, originY=th, inPlace=False, source='R8 fr1-4')

    # Going Merry figurehead + bow, with the credit-text plate removed (the single exclusion).
    mx0, my0, mx1, my1 = MERRY_BOX; cx0, cy0, cx1, cy1 = CREDIT_BOX
    merry = im[my0:my1, mx0:mx1].copy()
    merry[cy0 - my0:cy1 - my0, cx0 - mx0:cx1 - mx0] = 0
    ys, xs = np.where(merry[:, :, 3] > 0)
    merry = merry[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(merry).save(os.path.join(OUT_FX, 'merry.png'))
    fx_manifest['merry'] = dict(file='./assets/fx/zoro/merry.png', w=merry.shape[1], h=merry.shape[0], originX=merry.shape[1] // 2,
                                originY=merry.shape[0], inPlace=False, source='R9 ram/ship sprite minus credit plate')
    rects['merry'] = dict(row='R9', frame=3, x=mx0, y=my0, w=mx1 - mx0, h=my1 - my0, mirrored=False, desc='Going Merry ram figurehead + bow')
    rects['credit'] = dict(row='R9', frame=None, x=cx0, y=cy0, w=cx1 - cx0, h=cy1 - cy0, mirrored=False, desc='EXCLUDED - ripper credit text')

    # Animation strips.
    anim_js = {}
    for name, (ids, speed, loop) in ANIMS.items():
        strip = np.concatenate([cells[i] for i in ids], axis=1)
        Image.fromarray(strip).save(os.path.join(OUT_SPR, name + '.png'))
        anim_js[name] = dict(sheet=f'./assets/sprites/zoro/{name}.png', frames=len(ids), width=CELL_W, height=CELL_H, speed=speed,
                             anchorY=0, originX=ORIGIN_X, originY=ORIGIN_Y, loop=loop, lockLastFrame=True, src=ids)

    # Portrait: real idle frame, cropped to head+torso, integer NN upscale x4.
    i0 = cells['i0']; ys, xs = np.where(i0[:, :, 3] > 0)
    head = i0[ys.min():ys.min() + 43, ORIGIN_X - 17:ORIGIN_X + 16]
    Image.fromarray(head).resize((head.shape[1] * 4, head.shape[0] * 4), Image.NEAREST).save(os.path.join(OUT_SPR, 'portrait.png'))

    # Generated JS asset table.
    js = ['// GENERATED by tools/zoro/extract.py - do not hand-edit. Source rects + ledger: docs/zoro/.',
          f'// Source SHA-256 {sha}', '',
          'export const ZORO_ANIM = ' + json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'src'} for k, v in anim_js.items()}, indent=1) + '', '',
          'export const ZORO_ANIM_SRC = ' + json.dumps({k: v['src'] for k, v in anim_js.items()}) + '', '',
          'export const ZORO_FX = ' + json.dumps(fx_manifest, indent=1) + '']
    open(os.path.join(ROOT, 'zoroAssets.js'), 'w').write('\n'.join(js) + '\n')
    json.dump(dict(source=os.path.relpath(SRC, ROOT), sha256=sha, cell=[CELL_W, CELL_H], origin=[ORIGIN_X, ORIGIN_Y], frames=rects),
              open(os.path.join(OUT_DOC, 'source_rects.json'), 'w'), indent=1)

    # Contact sheet: every cleaned frame + every FX sprite, x2 nearest, labelled.
    from PIL import ImageDraw
    tiles = [(k, Image.fromarray(cells[k])) for k in list(FRAMES) + [f'wa{i}' for i in range(6)]]
    for k, v in fx_manifest.items():
        tiles.append((k, Image.open(os.path.join(ROOT, v['file'][2:]))))
    TW, TH, COLS = 140, 150, 8
    sheet = Image.new('RGBA', (TW * COLS, TH * ((len(tiles) + COLS - 1) // COLS)), (40, 44, 58, 255))
    dr = ImageDraw.Draw(sheet)
    for n, (k, t) in enumerate(tiles):
        a = np.array(t); ys, xs = np.where(a[:, :, 3] > 0)
        t = t.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        s = max(1, min(2, (TW - 8) // t.width, (TH - 22) // t.height))
        t = t.resize((t.width * s, t.height * s), Image.NEAREST)
        x, y = (n % COLS) * TW, (n // COLS) * TH
        sheet.alpha_composite(t, (x + (TW - t.width) // 2, y + 4 + (TH - 22 - t.height)))
        dr.text((x + 4, y + TH - 14), k, fill=(240, 240, 240, 255))
    sheet.save(os.path.join(OUT_DOC, 'contact_zoro.png'))
    print('frames', len(FRAMES), 'fx', len(fx_manifest), 'anims', len(ANIMS), 'sha', sha[:16])
    unused = set(FRAMES) - {i for ids, _, _ in ANIMS.values() for i in ids}
    print('UNUSED body frames:', sorted(unused) or 'none')


if __name__ == '__main__':
    main()
