#!/usr/bin/env python3
"""Hiromi Higuruma (Jujutsu Kaisen) — supplied sheet extraction.

SOURCE IS READ-ONLY: higuruma_hiromi_sprites_sheet_manga__by_mugengojoplayer_dm448a4.png (1720x1212, sha256 below) is
hash-checked and never written. "Sprite Sheet By Mugen Matias" (printed on the sheet) is the credited creator.

BACKGROUND POLICY: only the exact key colour RGB(34,177,76) is removed (no tolerance) in the sprite area — the sprite
area contains no other green pixel at all (audited: 0 pixels within distance 60 of the key), so outlines, the lilac tie,
gold gavel trims and every swing arc are untouched. The large portrait has anti-aliased edges against the key; there
the key plus edge pixels that are a BLEND toward the key (connected to the background) are made transparent / partially
transparent; its dark-green tie is far from the key and kept. Nearest-neighbour only; no pixel is redrawn.

FRAMES are 8-connected component unions assigned by explicit per-band x cuts (a component goes by its x centre). Tiny
detached sparkles / dust belong to the frame whose cut contains them. Every art component is assigned exactly once.

ANCHORS: x = centre of the hair's top rows (navy hair ramp only), so a long gavel never drags the body sideways; y = the
lowest BODY pixel (gavel / sword / FX colours excluded) for grounded poses, the band's ground line for the authored
airborne poses (AIR set) so they keep their lift.

CELL: one SYMMETRIC strip cell (anchor at the horizontal centre — the engine mirrors frames in place) for every action, sized from the widest reach (the extended-handle frame) and the tallest giant
gavel (asserted per frame; nothing is cropped or squeezed). Usage: python3 tools/higuruma/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'higuruma_hiromi_sprites_sheet_manga__by_mugengojoplayer_dm448a4.png'

SOURCE_SHA = 'de7978f4e77c326b14571c4f9d8860de24e08121b3327602c5a3dc25255ecb4b'
OUT = ROOT / 'assets/higuruma'
DOC = ROOT / 'docs/higuruma'
KEY = (34, 177, 76)
TEXT = (500, 0, 1345, 115)          # "Sprite Sheet By Mugen Matias" — attribution text, never animated
PORTRAIT = (1255, 60, 1650, 1140)   # the large standing portrait

# (band id, y0, y1, x cuts (frame starts), end)
BANDS = [
    ('b00', 4, 76, [0, 60, 115], 170),
    ('b01', 78, 150, [0, 50, 115, 175, 220, 275, 333, 390, 438], 490),
    ('b02', 158, 228, [0, 70, 125, 170, 208, 275], 340),
    ('b03', 228, 292, [0, 64, 102], 145),
    ('b04', 296, 351, [0, 70], 110),
    ('b05', 351, 428, [0, 65, 108], 150),
    ('b06', 430, 494, [0], 70),
    ('b07', 496, 560, [0, 57, 95, 145, 208, 266, 328], 390),
    ('b08', 572, 650, [0, 60, 99, 140, 180, 216, 256, 285, 322, 362, 398, 438], 480),
    ('b09', 656, 730, [0, 58, 118, 170, 220, 259, 298, 349, 408, 462, 504, 545, 585], 632),
    ('b10', 730, 800, [0, 62, 108, 148, 190, 234, 286, 338, 386, 424, 462, 504, 542, 575], 610),
    ('b11', 803, 862, [0, 66, 127, 190, 252, 309, 360, 408, 478, 550, 625, 690], 730),
    ('b12', 878, 952, [0, 52, 90, 120, 162, 212, 267, 318, 368, 418, 467, 508], 540),
    ('b13', 960, 1070, [0, 85, 152, 235, 328, 395, 465, 540, 605, 675], 750),
    ('b14', 1070, 1170, [0, 65, 128, 270, 381, 428, 472, 523, 585, 658], 725),
]
# Authored airborne cells: anchor y = band ground (keeps the drawn lift) instead of their own lowest pixel.
AIR = {'b02_3', 'b02_4', 'b02_5', 'b05_0', 'b05_1', 'b05_2', 'b10_4', 'b10_5', 'b10_6', 'b13_5', 'b14_9', 'b07_3'}
HAIR = {(23, 26, 43), (40, 45, 72)}
WEAPON = {(255, 255, 127), (255, 235, 84), (255, 243, 154), (173, 85, 41), (115, 38, 23), (216, 152, 88), (203, 132, 62),
          (255, 191, 127), (255, 255, 255)}
ANCHOR_DX = {}   # per-cell corrections (+ = toward facing), authored on docs/higuruma/transitions.png

# ── ACTIONS: strip name → list of cells, the engine speed (ticks per frame) and loop flag. Every useful cell has a
# reachable purpose; see docs/higuruma/SPRITE_MAP.md for the purpose of each and the honest uncertainty notes.
C = lambda b, *ix: [f'b{b:02d}_{i}' for i in ix]
ACTIONS = {
    # locomotion / states
    'idle': (C(0, 0, 1, 2, 1), 9, True),
    'walk': (C(1, 1, 2, 3, 4, 5, 6, 7, 8), 6, True),         # the run cycle played at walk cadence (no walk cycle drawn)
    'walk_back': (C(2, 0, 1, 0, 1), 9, True),                 # crouched guard-step (uncertain purpose; documented)
    'run': (C(1, 0, 1, 2, 3, 4, 5, 6, 7, 8), 3, True),
    'dash': (C(1, 0) + C(2, 4, 5), 4, False),
    'turn': (C(2, 2), 6, False),                              # the front-facing upright cell = facing transition
    'jump': (C(5, 0, 1, 2), 5, False),
    'doubleJump': (C(2, 3) + C(5, 1, 2), 4, False),           # tucked turn cell = second-jump flourish
    'fall': (C(5, 2), 6, False),
    'land': (C(3, 2, 1, 0), 3, False),
    'crouch': (C(3, 2), 8, True),
    'guard': (C(6, 0), 8, True),
    'hurt': (C(4, 0, 1), 5, False),
    'knockdown': (C(7, 0, 1, 2, 3, 4, 5, 6), 5, False),
    'lose': (C(7, 0, 1, 2, 3, 4, 5, 6), 6, False),
    'win': (C(8, 0, 1, 2, 3, 4, 5), 8, False),                # back turned, the gavel dissolves — dignified exit
    'intro': (C(8, 6, 7, 8, 9), 9, False),                    # turns to face, the gavel manifests in hand
    'introSettle': (C(8, 10, 11) + C(0, 0), 10, False),       # gavel-ready lean → idle
    # SMALL GAVEL
    'light': (C(9, 5, 6, 6, 9), 4, False),
    'hJ2': (C(9, 7, 8, 9), 4, False),
    'hJ3': (C(11, 6, 7, 8, 9, 10, 11), 4, False),
    'hLow': (C(9, 0, 1, 2, 3, 4), 4, False),
    # EXTENDED GAVEL
    'hPoke': (C(14, 0, 1, 3, 3, 4), 4, False),
    'up': (C(10, 8, 9, 10, 11, 12, 13), 4, False),
    'air': (C(10, 5, 6), 4, False),
    # GIANT GAVEL
    'heavy': (C(13, 0, 1, 2, 3), 4, False),
    'hSweep': (C(13, 4, 8, 9), 4, False),
    # SPECIALS
    'hExt': (C(14, 0, 1, 2, 4), 4, False),                     # Extension of the Court — the long-handle extension
    'hCross': (C(11, 0, 1, 2, 3, 4, 5) + C(9, 6, 7, 8, 9), 4, False),   # Cross-Examination — advance then 3 small strikes
    'hRise': (C(10, 0, 1, 2, 3, 4, 5, 6, 7), 4, False),         # Rising Objection — scoop, spin, leaping uppercut, land
    'hOrder': (C(13, 4, 5, 6, 7), 4, False),                   # Order in the Court — raise, leap, slam, hold
    'hObj': (C(6, 0), 8, False),                               # Objection — the guard-bracing pose (counter window)
    'hObjHit': (C(9, 7, 8, 9), 4, False),                      # Objection follow-up strike (straight gavel jab)
    # ULTIMATE (Deadly Sentencing)
    'ultOpen': (C(14, 0, 1, 2, 1, 0), 4, False),               # the extension opener (capture)
    'ultCase': (C(12, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9), 4, False),   # CASE REVIEW — presenting the glowing evidence
    'ultConfiscate': (C(9, 9, 10, 11, 12), 4, False),          # CONFISCATION — the gavel flash / vanish
    'ultVerdict': (C(14, 7) + C(13, 6), 4, False),             # VERDICT — giant gavel raised, brought down
    'ultSword': (C(14, 5, 6, 8, 9), 4, False),                 # EXECUTIONER'S SWORD — manifest, raise, thrust, lunge
    'ultSettle': (C(12, 10, 11) + C(0, 0), 4, False),
}
# Cells deliberately left without an action (with reason) — see the coverage ledger.
UNUSED = {}


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def load():
    im = Image.open(SRC)
    assert im.size == (1720, 1212), im.size
    return np.array(im.convert('RGB'))


def cells(a):
    fg = ~(a == KEY).all(-1)
    fg[TEXT[1]:TEXT[3], TEXT[0]:TEXT[2]] = False
    fg[:, 1200:] = False
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    owner = {}
    for i, (ys, xs) in enumerate(objs):
        cy, cx = (ys.start + ys.stop) / 2, (xs.start + xs.stop) / 2
        hit = None
        for bid, y0, y1, cuts, end in BANDS:
            if y0 <= cy < y1 and cx < end:
                k = max(j for j, c in enumerate(cuts) if c <= cx)
                hit = f'{bid}_{k}'
        assert hit, f'unassigned component {i + 1} at x{xs.start}-{xs.stop} y{ys.start}-{ys.stop}'
        owner.setdefault(hit, []).append(i + 1)
    out = {}
    for name, ids in owner.items():
        m = np.isin(lab, ids)
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        out[name] = dict(rect=[int(x0), int(y0), int(x1 - x0), int(y1 - y0)], mask=m[y0:y1, x0:x1], comps=len(ids))
    return out


def anchors(a, cs):
    ground = {}
    for name, c in cs.items():
        x, y, w, h = c['rect']; px = a[y:y + h, x:x + w]; m = c['mask']
        body = m & ~np.isin(px.reshape(-1, 3).view([('', px.dtype)] * 3).ravel(),
                            np.array(list(WEAPON), dtype=px.dtype).view([('', px.dtype)] * 3).ravel()).reshape(m.shape)
        rows = np.nonzero(body.any(1))[0]
        c['bodyBottom'] = int(y + rows.max() + 1)
        hair = np.zeros_like(m)
        for col in HAIR: hair |= (px == col).all(-1)
        hy, hx = np.nonzero(hair & m)
        if len(hy):
            top = hy.min(); sel = hy <= top + 6
            c['ax'] = float(x + hx[sel].mean())
        else:
            c['ax'] = float(x + w / 2)
        b = name.split('_')[0]
        if name not in AIR: ground[b] = max(ground.get(b, 0), c['bodyBottom'])
    for name, c in cs.items():
        b = name.split('_')[0]
        c['ay'] = ground.get(b, c['bodyBottom']) if name in AIR else c['bodyBottom']
        c['ax'] += ANCHOR_DX.get(name, 0)


def main():
    a = load()
    digest = sha(SRC)
    if SOURCE_SHA != '__PIN__': assert digest == SOURCE_SHA, 'source sheet changed'
    cs = cells(a)
    anchors(a, cs)
    # extents relative to the anchor
    L = max(c['ax'] - c['rect'][0] for c in cs.values()); R = max(c['rect'][0] + c['rect'][2] - c['ax'] for c in cs.values())
    U = max(c['ay'] - c['rect'][1] for c in cs.values()); D = max(c['rect'][1] + c['rect'][3] - c['ay'] for c in cs.values())
    # the engine mirrors a flipped frame inside its cell (sprite.js: left edge = x − originX·scale for both facings), so the
    # anchor must sit at the cell's horizontal centre: a symmetric cell sized by the larger of the two reaches
    OX = int(np.ceil(max(L, R))) + 2; FW = 2 * OX; OY = int(np.ceil(U)) + 1; FH = OY + int(np.ceil(D)) + 1
    print(f'cells={len(cs)} extents L{L:.0f} R{R:.0f} U{U:.0f} D{D:.0f} -> cell {FW}x{FH} origin ({OX},{OY})')
    OUT.mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    rgba = np.dstack([a, np.full(a.shape[:2], 255, np.uint8)])

    def cell_img(name):
        c = cs[name]; x, y, w, h = c['rect']
        tile = rgba[y:y + h, x:x + w].copy(); tile[~c['mask']] = 0
        im = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        dx = int(round(OX - (c['ax'] - x))); dy = int(round(OY - (c['ay'] - y)))
        assert dx >= 0 and dy >= 0 and dx + w <= FW and dy + h <= FH, (name, dx, dy, w, h)
        im.paste(Image.fromarray(tile, 'RGBA'), (dx, dy))
        return im

    used = set()
    anim = {}
    for act, (lst, speed, loop) in ACTIONS.items():
        strip = Image.new('RGBA', (FW * len(lst), FH), (0, 0, 0, 0))
        for i, n in enumerate(lst):
            assert n in cs, (act, n)
            strip.paste(cell_img(n), (i * FW, 0)); used.add(n)
        strip.save(OUT / f'{act}.png')
        anim[act] = {'sheet': f'./assets/higuruma/{act}.png', 'frames': len(lst), 'width': FW, 'height': FH, 'anchorY': 0,
                     'loop': loop, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': speed,
                     'frameWidth': FW, 'frameHeight': FH}
    missing = sorted(set(cs) - used - set(UNUSED))
    assert not missing, f'cells without a purpose: {missing}'
    # ── portrait (character select / cinematic only; never a combat frame) ──
    px0, py0, px1, py1 = PORTRAIT
    P = a[py0:py1, px0:px1].astype(int).copy()
    tx = TEXT[2] - px0; ty = TEXT[3] - py0            # the credit text's tail overlaps the portrait box: key it out
    P[:max(0, ty), :max(0, tx)] = KEY
    d = np.abs(P - np.array(KEY)).sum(-1)
    bg = (d == 0)
    lab, _ = ndimage.label(bg | (d < 120), structure=np.ones((3, 3)))
    edge = np.isin(lab, np.unique(lab[bg])) & ~bg & (d < 120)   # blend pixels touching the key region
    alpha = np.full(d.shape, 255, np.uint8); alpha[bg] = 0
    alpha[edge] = np.clip(d[edge] * 255 // 120, 0, 255).astype(np.uint8)
    pim = Image.fromarray(np.dstack([P.astype(np.uint8), alpha]), 'RGBA')
    bb = pim.getbbox(); pim = pim.crop(bb)
    pim.save(OUT / 'portrait_full.png')
    head = pim.crop((0, 0, pim.width, int(pim.width * 1.0)))     # head + shoulders square for select tiles / cards
    head.save(OUT / 'portrait.png')
    # ── data module ──
    src_rects = {n: {'rect': c['rect'], 'anchor': [round(c['ax'], 1), c['ay']], 'components': c['comps'], 'air': n in AIR} for n, c in sorted(cs.items())}
    (DOC / 'source_rects.json').write_text(json.dumps({'source': SRC.name, 'sha256': digest, 'key': KEY,
        'cell': {'w': FW, 'h': FH, 'ox': OX, 'oy': OY}, 'portrait': {'rect': list(PORTRAIT), 'crop': list(bb)},
        'cells': src_rects, 'actions': {k: v[0] for k, v in ACTIONS.items()}}, indent=1))
    js = ['// Generated by tools/higuruma/extract.py — do not hand-edit.',
          f'export const HIGURUMA_ANIM = {json.dumps(anim, indent=1)}',
          f"export const HIGURUMA_CELL = {json.dumps({'w': FW, 'h': FH, 'ox': OX, 'oy': OY})}",
          f"export const HIGURUMA_PORTRAIT = {json.dumps({'w': pim.width, 'h': pim.height})}", '']
    (ROOT / 'higurumaSprites.js').write_text('\n'.join(js))
    # ── contact sheet: every cell, labelled, with anchor cross ──
    names = sorted(cs, key=lambda n: (n.split('_')[0], int(n.split('_')[1])))
    cols = 12; Z = 1; rows = (len(names) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * FW, rows * (FH + 12)), (40, 44, 52, 255)); dr = ImageDraw.Draw(sheet)
    for i, n in enumerate(names):
        cx, cy = (i % cols) * FW, (i // cols) * (FH + 12)
        sheet.alpha_composite(cell_img(n), (cx, cy + 12))
        dr.text((cx + 2, cy), n + ('' if n in used else ' (unused)'), fill=(255, 255, 255, 255))
        dr.line([(cx + OX - 4, cy + 12 + OY), (cx + OX + 4, cy + 12 + OY)], fill=(255, 0, 0, 255))
        dr.line([(cx + OX, cy + 12 + OY - 4), (cx + OX, cy + 12 + OY + 4)], fill=(255, 0, 0, 255))
    sheet.save(DOC / 'contact_sheet.png')
    print('actions', len(ACTIONS), 'cells used', len(used), 'of', len(cs), 'sha', digest)


if __name__ == '__main__':
    main()
