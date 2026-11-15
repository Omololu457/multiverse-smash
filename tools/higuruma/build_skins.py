#!/usr/bin/env python3
"""Hiromi Higuruma — precompute the TEN appearance skins (cosmetic only).

Input: the extracted default art (assets/higuruma/*.png strips, portrait.png, portrait_full.png from extract.py) and the
palette spec tools/higuruma/skins.json. Output: assets/higuruma/skins/<tag>/ (same file names, byte-identical alpha and
dimensions → identical geometry, pivots, hitboxes and timing), material overlays assets/higuruma/skins/<tag>/mat/p<k>/,
higurumaSkinTable.js, docs/skins/higuruma/region_mapping.json, docs/skins/higuruma/regions.png, docs/higuruma/skins_contact.png.

REGIONS (strip cells, per 167×104 cell):
  hair   (40,45,72) (23,26,43) (7,6,19)                       — the navy hair ramp
  suit   (38,39,38) (36,37,37) | (28,28,28) | (10,10,10) (11,12,12)   — 3-tone suit (jacket + trousers)
  shirt  (227,227,227) + pure white touching it               — collar / cuffs
  tie    (141,121,168)                                        — the lilac tie
  shoes  (22,25,34)                                           — shoe highlight (the dark sole shade is outline-like and kept)
  wood   (173,85,41) (115,38,23) + the light oranges (255,191,127) (216,152,88) (203,132,62) within 2 px of them
  metal  yellow-family pixels within D px of the gavel wood (D = 3 small gavel, 7 giant gavel) — caps, bands, the cross
  sword  every yellow / white pixel of the Executioner's Sword cells (ultSword strip) except eye whites (white touching skin)
  fx     every other yellow / orange pixel: swing arcs, impact dust, gavel sparkles, the evidence glow
  NEVER recoloured: the black outline family, natural skin (incl. lips / blush shades) and eye whites.
LIMITATION: the source swing arcs merge into the giant gavel caps without an outline, so the first few arc pixels next
to a cap take the metal colour (distance rule). At game scale this reads as part of the cap.

PORTRAIT (anti-aliased illustration): per-region LUMINANCE-RAMP remap (hair band / tie / shirt / suit / shoes); skin,
the lapel pin, outlines (very dark) and the background alpha are untouched.

MATERIALS (Cosmic Court stars, Digital Justice circuit lines, Gilded glitter): 4 precomputed overlay phases per strip,
written only on SUIT pixels (deterministic hash placement, no RNG). Usage: python3 tools/higuruma/build_skins.py
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/higuruma'
OUT = A / 'skins'
DOC = ROOT / 'docs/skins/higuruma'
SPEC = json.loads((ROOT / 'tools/higuruma/skins.json').read_text())['skins']
CELL = json.loads((ROOT / 'docs/higuruma/source_rects.json').read_text())['cell']
FW, FH = CELL['w'], CELL['h']
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
EIGHT = np.ones((3, 3), bool)

HAIR = [(40, 45, 72), (23, 26, 43), (7, 6, 19)]
SUIT = [[(38, 39, 38), (36, 37, 37)], [(28, 28, 28)], [(10, 10, 10), (11, 12, 12)]]
SHIRT = (227, 227, 227); WHITE = (255, 255, 255)
TIE = (141, 121, 168)
SHOE = (22, 25, 34)
WOOD_D = [(173, 85, 41), (115, 38, 23)]
WOOD_L = [(255, 191, 127), (216, 152, 88), (203, 132, 62)]
YEL = [(255, 255, 127), (255, 243, 154), (255, 235, 84), (254, 235, 84)]
SKIN = [(255, 232, 216), (255, 211, 212), (255, 144, 128), (214, 152, 131), (187, 72, 69), (113, 40, 39)]
# per-source-colour ramp index for each warm region
WOOD_IDX = {(255, 191, 127): 0, (216, 152, 88): 1, (203, 132, 62): 2, (173, 85, 41): 3, (115, 38, 23): 4}
METAL_IDX = {(255, 255, 127): 0, (255, 243, 154): 0, (255, 235, 84): 1, (254, 235, 84): 1, WHITE: 0}
FX_IDX = {WHITE: 0, (255, 255, 127): 0, (255, 243, 154): 0, (255, 235, 84): 1, (254, 235, 84): 1, (255, 191, 127): 1, (216, 152, 88): 2, (203, 132, 62): 2}
SWORD_IDX = {WHITE: 0, (255, 243, 154): 1, (255, 255, 127): 1, (255, 235, 84): 2, (254, 235, 84): 2, (255, 191, 127): 3, (216, 152, 88): 3, (203, 132, 62): 3}
SWORD_STRIPS = {'ultSword'}


def eq(a, c): return (a[..., 0] == c[0]) & (a[..., 1] == c[1]) & (a[..., 2] == c[2])


def anyof(a, cs):
    m = np.zeros(a.shape[:2], bool)
    for c in cs: m |= eq(a, c)
    return m


def near(mask, d): return ndimage.binary_dilation(mask, structure=EIGHT, iterations=d) if d > 0 else mask


def classify(cell, strip):
    a = cell[..., :3]; op = cell[..., 3] > 0
    Z = lambda: np.zeros(a.shape[:2], bool)
    R = {k: Z() for k in ('hair', 'suit0', 'suit1', 'suit2', 'shirt', 'tie', 'shoes', 'wood', 'metal', 'sword', 'fx')}
    R['hair'] = anyof(a, HAIR) & op
    for i, cs in enumerate(SUIT): R[f'suit{i}'] = anyof(a, cs) & op
    shirt = eq(a, SHIRT) & op
    R['shirt'] = shirt | (eq(a, WHITE) & op & near(shirt, 1))
    R['tie'] = eq(a, TIE) & op
    R['shoes'] = eq(a, SHOE) & op
    skin = anyof(a, SKIN) & op
    wood_d = anyof(a, WOOD_D) & op
    wood = wood_d | (anyof(a, WOOD_L) & op & near(wood_d, 2))
    R['wood'] = wood
    warm = (anyof(a, YEL + WOOD_L) | eq(a, WHITE)) & op & ~wood & ~R['shirt']
    eyes = eq(a, WHITE) & op & near(skin, 1)
    warm &= ~eyes
    if strip in SWORD_STRIPS:
        R['sword'] = warm & ~near(wood, 3); warm &= ~R['sword']
    D = 7 if wood.sum() > 300 else 3
    metal = warm & anyof(a, YEL) & near(wood, D)
    R['metal'] = metal
    R['fx'] = warm & ~metal & ~eq(a, WHITE) | (warm & eq(a, WHITE) & ~near(skin, 2) & ~metal)
    return R


def recolor_cell(cell, R, sk):
    out = cell.copy(); a = cell[..., :3]
    def put(mask, rgb): out[mask, :3] = rgb
    if sk['hair']:
        for i, c in enumerate(HAIR): put(R['hair'] & eq(a, c), H(sk['hair'][i]))
    for i, cs in enumerate(SUIT): put(R[f'suit{i}'], H(sk['suit'][i]))
    put(R['shirt'] & eq(a, SHIRT), H(sk['shirt'][1])); put(R['shirt'] & eq(a, WHITE), H(sk['shirt'][0]))
    put(R['tie'], H(sk['tie'][0])); put(R['shoes'], H(sk['shoes'][0]))
    for reg, table, ramp in (('wood', WOOD_IDX, 'wood'), ('metal', METAL_IDX, 'metal'), ('fx', FX_IDX, 'fx'), ('sword', SWORD_IDX, 'sword')):
        for c, i in table.items():
            put(R[reg] & eq(a, c), H(sk[ramp][min(i, len(sk[ramp]) - 1)]))
    return out


def h32(*v):
    x = 2166136261
    for t in v:
        x = ((x ^ (int(t) & 0xffffffff)) * 16777619) & 0xffffffff
        x ^= x >> 13; x = (x * 0x5bd1e995) & 0xffffffff; x ^= x >> 15
    return x / 4294967296


def material_cell(R, mat, phase, salt):
    """→ RGBA overlay (only on suit pixels) for one cell and one phase."""
    suit = R['suit0'] | R['suit1'] | R['suit2']
    ov = np.zeros(suit.shape + (4,), np.uint8)
    ys, xs = np.nonzero(suit)
    cols = [H(c) for c in mat['colors']]; dens = mat['density']
    for y, x in zip(ys, xs):
        if mat['kind'] == 'circuit':
            line = (x % 9 == 0 and h32(salt, x // 9, y // 6) < 0.35) or (y % 11 == 0 and h32(salt + 7, y // 11, x // 6) < 0.35)
            if not line: continue
            node = h32(salt + 3, x // 3, y // 3) < 0.08
            pulse = 0.45 + 0.35 * (((x + y) // 6 + phase) % 4 == 0)
            ov[y, x] = (*cols[1 if node else 0], int(255 * (0.9 if node else pulse)))
        else:
            r = h32(salt, x, y)
            if r >= dens: continue
            tw = h32(salt + 11, x, y, phase)
            if mat['kind'] == 'stars': al = 0.35 + 0.65 * tw
            else: al = 1.0 if tw > 0.55 else 0.15
            ov[y, x] = (*cols[0 if h32(salt + 5, x, y) < 0.7 else 1], int(255 * al))
    return ov


def lum(rgb): return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def portrait_regions(p):
    a = p[..., :3].astype(float); op = p[..., 3] > 0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = lum(a); mx = a.max(-1); mn = a.min(-1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    h, w = op.shape; yy = np.mgrid[0:h, 0:w][0]
    skin = op & (r > 120) & (r > g + 8) & (g > b) & (r - b > 25)
    sky, _ = np.nonzero(skin)
    face_top = int(np.percentile(sky[sky < h * 0.25], 2)) if (sky < h * 0.25).any() else int(h * 0.08)
    face_bot = int(h * 0.20)
    hair = op & ~skin & (yy < face_bot) & (L < 110) & ((yy < face_top + 12) | (sat > 0.18))
    tie = op & ~skin & (g > r + 5) & (g >= b) & (L < 140) & (yy > face_bot * 0.8)
    shirt = op & ~skin & (sat < 0.14) & (L > 150) & (yy > face_bot * 0.8)
    shoes = op & ~skin & (yy > h * 0.90) & (L < 120)
    pin = op & (r > 120) & (g > 90) & (b < 80) & (yy > h * 0.2) & (yy < h * 0.3)
    suit = op & ~skin & ~hair & ~tie & ~shirt & ~shoes & ~pin & (L < 140) & (yy > face_bot * 0.85)
    return dict(hair=hair, tie=tie, shirt=shirt, shoes=shoes, suit=suit), L


def ramp_remap(p, mask, L, ramp_light_to_dark, keep_dark=14):
    if not mask.any(): return
    m = mask & (L >= keep_dark)
    lo, hi = np.percentile(L[m], 3), np.percentile(L[m], 97)
    T = np.array([H(c) for c in ramp_light_to_dark[::-1]], float)    # dark → light
    u = np.clip((L[m] - lo) / max(1e-6, hi - lo), 0, 1) * (len(T) - 1)
    k = np.minimum(len(T) - 2, np.floor(u).astype(int)) if len(T) > 1 else np.zeros_like(u, int)
    if len(T) == 1: p[m, :3] = T[0] * (0.6 + 0.4 * u[:, None] / max(1, 1)); return
    w = (u - k)[:, None]
    p[m, :3] = np.clip(T[k] * (1 - w) + T[k + 1] * w, 0, 255).astype(np.uint8)


def recolor_portrait(src, sk):
    p = np.array(Image.open(src).convert('RGBA')); R, L = portrait_regions(p)
    if sk['hair']: ramp_remap(p, R['hair'], L, sk['hair'])
    ramp_remap(p, R['suit'], L, sk['suit'])
    ramp_remap(p, R['shirt'], L, sk['shirt'], keep_dark=0)
    tie = sk['tie'][0]; ramp_remap(p, R['tie'], L, [tie, tie], keep_dark=0)
    ramp_remap(p, R['shoes'], L, [sk['shoes'][0], sk['suit'][2]])
    return p, R


def main():
    strips = sorted(p.stem for p in A.glob('*.png') if not p.stem.startswith('portrait'))
    OUT.mkdir(exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    region_report = {}
    audit_cells = []
    for sk in SPEC:
        d = OUT / sk['tag']; d.mkdir(exist_ok=True)
        counts = {}
        for s in strips:
            img = np.array(Image.open(A / f'{s}.png').convert('RGBA'))
            n = img.shape[1] // FW; outs = []; mats = [[] for _ in range(4)]
            for i in range(n):
                cell = img[:, i * FW:(i + 1) * FW]
                R = classify(cell, s)
                for k, v in R.items(): counts[k] = counts.get(k, 0) + int(v.sum())
                outs.append(recolor_cell(cell, R, sk))
                if sk['material']:
                    for ph in range(4): mats[ph].append(material_cell(R, sk['material'], ph, h32(len(s), i) * 1e6))
                if sk is SPEC[0] and s in ('idle', 'heavy', 'hExt', 'ultSword', 'hurt', 'ultCase') and i in (0, 2): audit_cells.append((s, i, cell, R))
            res = np.concatenate(outs, 1)
            assert (res[..., 3] == img[..., 3]).all(), s
            Image.fromarray(res, 'RGBA').save(d / f'{s}.png')
            if sk['material']:
                for ph in range(4):
                    md = d / 'mat' / f'p{ph}'; md.mkdir(parents=True, exist_ok=True)
                    Image.fromarray(np.concatenate(mats[ph], 1), 'RGBA').save(md / f'{s}.png')
        for pn in ('portrait.png', 'portrait_full.png'):
            p, PR = recolor_portrait(A / pn, sk)
            Image.fromarray(p, 'RGBA').save(d / pn)
        region_report[sk['id']] = {'tag': sk['tag'], 'pixels': counts}
        print(sk['id'], {k: v for k, v in counts.items() if k in ('hair', 'shirt', 'tie', 'wood', 'metal', 'sword', 'fx')})
    (DOC / 'region_mapping.json').write_text(json.dumps({'cell': CELL, 'regions': {
        'hair': HAIR, 'suit': SUIT, 'shirt': [SHIRT, WHITE], 'tie': [TIE], 'shoes': [SHOE], 'wood': WOOD_D + WOOD_L, 'metal/fx/sword': YEL + [WHITE],
        'never': {'skin': SKIN, 'outline': 'black family', 'eyes': 'white touching skin'}}, 'skins': region_report}, indent=1, default=list))
    # region audit image (false colours)
    PAL = {'hair': (60, 90, 255), 'suit0': (90, 90, 90), 'suit1': (60, 60, 60), 'suit2': (35, 35, 35), 'shirt': (255, 255, 255), 'tie': (200, 120, 255),
           'shoes': (0, 200, 200), 'wood': (150, 80, 30), 'metal': (255, 210, 0), 'sword': (255, 60, 60), 'fx': (0, 255, 120)}
    au = Image.new('RGBA', (FW * len(audit_cells), FH * 2), (20, 20, 24, 255))
    for j, (s, i, cell, R) in enumerate(audit_cells):
        au.alpha_composite(Image.fromarray(cell, 'RGBA'), (j * FW, 0))
        fc = np.zeros_like(cell); fc[..., 3] = (cell[..., 3] > 0) * 255; fc[..., :3] = 160
        for k, c in PAL.items(): fc[R[k], :3] = c
        au.alpha_composite(Image.fromarray(fc, 'RGBA'), (j * FW, FH))
    au.resize((au.width * 2, au.height * 2), Image.NEAREST).save(DOC / 'regions.png')
    # skin table module
    table = [{k: sk[k] for k in ('id', 'tag', 'name', 'classification', 'crossover', 'inspiration', 'hud', 'material')} | {'fx': sk['fx'], 'sword': sk['sword']} for sk in SPEC]
    (ROOT / 'higurumaSkinTable.js').write_text('// Generated by tools/higuruma/build_skins.py from tools/higuruma/skins.json — do not hand-edit.\n'
                                              f'export const HIGURUMA_SKIN_TABLE = {json.dumps(table, indent=1)}\n')
    # contact sheet: default + 10 skins × (idle, small chop, extension, giant, sword, hurt, defeat) + portrait
    show = [('idle', 0), ('light', 1), ('hExt', 2), ('heavy', 2), ('hOrder', 2), ('ultSword', 2), ('hurt', 1), ('lose', 6), ('ultCase', 6)]
    rows = [('default', A)] + [(sk['name'], OUT / sk['tag']) for sk in SPEC]
    PW = 70; sheet = Image.new('RGBA', (FW * len(show) + PW + 10, len(rows) * (FH + 14)), (48, 52, 60, 255)); dr = ImageDraw.Draw(sheet)
    for r, (name, base) in enumerate(rows):
        y = r * (FH + 14); dr.text((4, y + 1), name.replace('\u2014', '-'), fill=(255, 255, 255, 255))
        for c, (s, i) in enumerate(show):
            im = Image.open(base / f'{s}.png'); sheet.alpha_composite(im.crop((i * FW, 0, (i + 1) * FW, FH)), (c * FW, y + 14))
        por = Image.open(base / 'portrait.png'); por = por.resize((PW, int(por.height * PW / por.width)), Image.NEAREST).crop((0, 0, PW, FH))
        sheet.alpha_composite(por, (FW * len(show) + 6, y + 14))
    sheet.save(ROOT / 'docs/higuruma/skins_contact.png')


if __name__ == '__main__':
    main()
