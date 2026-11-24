#!/usr/bin/env python3
"""extract.py — MSV1-MEGAZORD: the Thunder Megazord sheet (MMPR: The Fighting Edition, SNES; ripped by Grim) →
the add-on strips of the Mighty Morphin Rangers' Thunder Megazord ultimate.
  python3 -I tools/megazord/extract.py <repo root>
Key: the ONE exact background colour (41,81,66), tolerance 0 (the sheet has no near-shades; the green chest orb
(0,81|89|97|186|211,0) survives — counted). Frames = 8-connected components grouped by the row / x ranges below
(hand-verified against the sheet); detached flame sparks join their frame; only specks outside every frame are dropped. Nearest-neighbour only, no scaling here (the game draws at
spriteScale). Each frame is anchored on the chest orb's x (feet centre when the orb is hidden) and its lowest body pixel.
Writes assets/mmpr_rangers/megazord/{<anim>.png strips, cells/<row>_<i>.png, fireball.png, portrait.png},
megazordSprites.js (strip metadata), docs/msv1/megazord/{SPRITE_LEDGER.md, compare.png}."""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets/incoming/megazord/thunder_megazord.png')
OUT = os.path.join(ROOT, 'assets/mmpr_rangers/megazord'); os.makedirs(os.path.join(OUT, 'cells'), exist_ok=True)
DOCS = os.path.join(ROOT, 'docs/msv1/megazord'); os.makedirs(DOCS, exist_ok=True)
BG = (41, 81, 66)
ROWS = {   # row: (y0, y1, [x ranges in sheet order])
 1: (13, 109, [(13, 81), (98, 167), (181, 251), (271, 334), (426, 487), (506, 566), (594, 657)]),
 2: (126, 240, [(8, 73), (95, 158), (178, 241), (306, 381), (385, 460), (526, 615), (631, 706)]),
 3: (256, 351, [(13, 79), (98, 180), (225, 299), (310, 376), (394, 490), (499, 592), (603, 686)]),
 4: (362, 480, [(15, 78), (100, 180), (207, 266), (282, 367), (379, 462), (484, 563)]),
 5: (480, 600, [(12, 82), (92, 228), (276, 359), (368, 456), (464, 541), (556, 652), (655, 783), (793, 913)]),
 6: (613, 708, [(12, 94), (105, 220), (300, 380), (390, 475), (485, 561), (579, 725), (740, 887)]),
 7: (727, 828, [(17, 77), (93, 186), (225, 288), (299, 415)]),
 8: (838, 981, [(9, 92), (102, 190), (199, 268), (282, 362), (368, 479), (489, 593)]),
 9: (1007, 1122, [(16, 92), (102, 198), (208, 282), (291, 365), (374, 448), (464, 539), (558, 641), (711, 773)]),
 10: (1131, 1249, [(15, 76), (94, 168), (193, 321), (343, 464)]),
 11: (1263, 1367, [(16, 82), (93, 179), (190, 265), (278, 353), (366, 441), (487, 519), (531, 562), (576, 605), (618, 634)]),
 12: (1379, 1516, [(15, 79), (88, 156), (167, 234), (244, 307), (365, 432), (448, 513), (529, 592), (608, 687)]),
 13: (1535, 1642, [(10, 84), (98, 157), (173, 246), (258, 338), (343, 413), (428, 518), (534, 626), (656, 729)]),
 14: (1663, 1766, [(8, 85), (99, 195), (212, 276), (285, 411), (449, 569), (572, 703)]),
}
EXCLUDE = {(14, 5): 'credit box ("Thunder Megazord from MMPR: The Fighting Edition (SNES), ripped by Grim, spritedatabase.net")'}
PORTRAIT = (14, 4); FIREBALL = [(11, 5), (11, 6), (11, 7), (11, 8)]
# animation → [(row, index)] — EVERY frame (except the credit box) is used at least once
ANIMS = {
 'idle': [(1, i) for i in range(4)], 'kneel': [(1, 4), (1, 5), (1, 6)],
 'walk': [(2, 0), (2, 1), (2, 2)], 'jump': [(2, 3), (2, 4)], 'fall': [(2, 5), (2, 6)],
 'mzLight': [(3, 0), (3, 1)], 'mzHeavy': [(3, i) for i in range(2, 7)],
 'crouch': [(4, 0)], 'mzCLight': [(4, 0), (4, 1)], 'mzCHeavy': [(4, 2), (10, 0), (10, 1)],
 'raise': [(4, 3), (4, 4), (4, 5)],
 'mzLunge': [(5, 0), (5, 1), (14, 2), (14, 3), (6, 4), (6, 5), (6, 6)],
 'mzSlash': [(5, i) for i in range(2, 8)], 'mzCSlash': [(6, 0), (6, 1), (14, 2), (14, 3)],
 'blue': [(6, 2), (6, 3)],
 'mzAirLight': [(7, 0), (7, 1)], 'mzAirHeavy': [(7, 2), (7, 3)],
 'mzAirSaber': [(8, i) for i in range(6)],
 'guard': [(9, 0)], 'pose': [(9, i) for i in range(1, 8)],
 'mzRising': [(10, 1), (10, 2), (10, 3)],
 'mzFire': [(11, i) for i in range(5)],
 'mzCharge': [(12, i) for i in range(4)], 'mzChargeAir': [(12, 4), (12, 5), (12, 6)], 'launched': [(12, 7)],
 'hurt': [(13, 0), (13, 1)], 'knockdown': [(13, i) for i in range(2, 7)], 'getup': [(13, 7)], 'collapse': [(13, i) for i in range(7)],
 'crouchHurt': [(14, 0), (14, 1)],
}
im = np.array(Image.open(SRC).convert('RGBA')).astype(int)
rgb = im[:, :, :3]
bg = (rgb[:, :, 0] == BG[0]) & (rgb[:, :, 1] == BG[1]) & (rgb[:, :, 2] == BG[2])
orb_all = (rgb[:, :, 0] == 0) & (rgb[:, :, 2] == 0) & (rgb[:, :, 1] >= 80)
out = im.copy(); out[bg, 3] = 0
lab, n = ndimage.label(~bg, structure=np.ones((3, 3)))
objs = ndimage.find_objects(lab)
specks, frames = [], {}
assign = {}
for i, s in enumerate(objs):
    m = lab[s] == i + 1; cnt = int(m.sum())
    ys, xs = np.where(m); cy, cx = ys.mean() + s[0].start, xs.mean() + s[1].start
    hit = None
    for r, (y0, y1, xr) in ROWS.items():
        if y0 - 2 <= cy <= y1 + 2:
            for j, (x0, x1) in enumerate(xr):
                if x0 - 2 <= cx <= x1 + 2: hit = (r, j)
    if hit is None:
        if cnt < 4: specks.append((int(cy), int(cx), cnt)); continue   # a stray speck outside every frame
        raise SystemExit(f'unassigned component at {int(cx)},{int(cy)} ({cnt} px)')
    assign.setdefault(hit, []).append(i + 1)
FLAME = lambda p: (p[0] > 180 and p[1] > 90 and p[2] < 140) or (p[2] > 190 and p[0] < 170)   # orange / yellow flame or blue flame
ledger = []
for (r, j), ids in sorted(assign.items()):
    m = np.isin(lab, ids); ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    cell = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8); mm = m[y0:y1, x0:x1]
    cell[mm] = out[y0:y1, x0:x1][mm]
    orb = orb_all[y0:y1, x0:x1] & mm
    body = mm.copy()
    for (yy, xx) in zip(*np.where(mm)):
        if FLAME(cell[yy, xx]): body[yy, xx] = False
    by = np.where(body.any(1))[0]; bottom = int(by.max()) if len(by) else cell.shape[0] - 1
    if orb.sum() >= 12: ax = float(np.where(orb)[1].mean())
    else:
        fy, fx = np.where(body[max(0, bottom - 8):bottom + 1]); ax = float(fx.mean()) if len(fx) else cell.shape[1] / 2
    frames[(r, j)] = {'img': cell, 'ax': ax, 'ay': bottom + 1, 'orb': int(orb.sum()), 'px': int(mm.sum())}
    Image.fromarray(cell).save(os.path.join(OUT, 'cells', f'r{r:02d}_{j}.png'))
    ledger.append((r, j, x0, y0, x1 - x0, y1 - y0, int(mm.sum()), int(orb.sum())))
# sanity: every listed frame found
for r, (_, _, xr) in ROWS.items():
    for j in range(len(xr)):
        if (r, j) not in frames: raise SystemExit(f'frame r{r}_{j} missing')
used = set()
meta = {}
def strip(name, keys, pad=4):
    fs = [frames[k] for k in keys]; used.update(keys)
    L = max(int(np.ceil(f['ax'])) for f in fs); R = max(int(np.ceil(f['img'].shape[1] - f['ax'])) for f in fs)
    half = max(L, R) + pad; W = half * 2
    up = max(f['ay'] for f in fs); down = max(f['img'].shape[0] - f['ay'] for f in fs)
    H = up + down + pad * 2; oy = pad + up
    sheet = Image.new('RGBA', (W * len(fs), H), (0, 0, 0, 0))
    for i, f in enumerate(fs):
        sheet.alpha_composite(Image.fromarray(f['img']), (i * W + half - int(round(f['ax'])), oy - f['ay']))
    sheet.save(os.path.join(OUT, f'{name}.png'))
    meta[name] = {'sheet': f'./assets/mmpr_rangers/megazord/{name}.png', 'frames': len(fs), 'width': W, 'height': H, 'originX': half, 'originY': oy, 'anchorY': 0}
for name, keys in ANIMS.items(): strip(name, keys)
# fireball strip (4 frames, big → small, centred) + portrait
fb = [frames[k] for k in FIREBALL]; used.update(FIREBALL)
fw = max(f['img'].shape[1] for f in fb); fh = max(f['img'].shape[0] for f in fb)
sheet = Image.new('RGBA', (fw * 4, fh), (0, 0, 0, 0))
for i, f in enumerate(fb): sheet.alpha_composite(Image.fromarray(f['img']), (i * fw + (fw - f['img'].shape[1]) // 2, (fh - f['img'].shape[0]) // 2))
sheet.save(os.path.join(OUT, 'fireball.png'))
meta['fireball'] = {'sheet': './assets/mmpr_rangers/megazord/fireball.png', 'frames': 4, 'width': fw, 'height': fh}
Image.fromarray(frames[PORTRAIT]['img']).save(os.path.join(OUT, 'portrait.png')); used.add(PORTRAIT)
meta['portrait'] = {'src': './assets/mmpr_rangers/megazord/portrait.png', 'w': int(frames[PORTRAIT]['img'].shape[1]), 'h': int(frames[PORTRAIT]['img'].shape[0])}
unused = [k for k in frames if k not in used and k not in EXCLUDE]
if unused: raise SystemExit(f'unused frames: {unused}')
orb_sheet = int((orb_all & ~bg).sum()); orb_kept = sum(f['orb'] for k, f in frames.items() if k not in EXCLUDE)
with open(os.path.join(ROOT, 'megazordSprites.js'), 'w') as fh_:
    fh_.write('// GENERATED by tools/megazord/extract.py — do not hand-edit. MSV1-MEGAZORD: Thunder Megazord strips (add-on art of the\n// Mighty Morphin Rangers, mmpr_rangers). Source: MMPR: The Fighting Edition (SNES), ripped by Grim (spritedatabase.net).\n')
    fh_.write('export const MZ_SHEETS = ' + json.dumps(meta, indent=1) + '\n')
counts = {r: len(xr) for r, (_, _, xr) in ROWS.items()}
with open(os.path.join(DOCS, 'SPRITE_LEDGER.md'), 'w') as L:
    L.write('# Thunder Megazord — sprite ledger (generated by tools/megazord/extract.py)\n\n')
    L.write(f'Key: exact (41,81,66), tolerance 0. Chest-orb pixels: {orb_sheet} on the sheet, {orb_kept} kept in frames '
            f'({orb_sheet - orb_kept} are in the excluded credit box / portrait-only).\n')
    L.write(f'1-px specks dropped (not frames): {specks}\n\nReal frame counts per row: ' + ', '.join(f'R{r} {c}' for r, c in counts.items()) + '\n\n')
    L.write('| row | # | x | y | w | h | px | orb px | used in |\n|---|---|---|---|---|---|---|---|---|\n')
    for (r, j, x, y, w, h, px, ob) in ledger:
        where = [a for a, ks in ANIMS.items() if (r, j) in ks] + (['fireball'] if (r, j) in FIREBALL else []) + (['portrait'] if (r, j) == PORTRAIT else [])
        L.write(f'| R{r} | {j} | {x} | {y} | {w} | {h} | {px} | {ob} | {", ".join(where) or "EXCLUDED: " + EXCLUDE.get((r, j), "?")} |\n')
# compare.png: the source (left) beside every extracted cell re-laid on a checker at its sheet position (right)
src = Image.open(SRC).convert('RGBA'); W_, H_ = src.size
cmp = Image.new('RGBA', (W_ * 2 + 10, H_), (20, 20, 28, 255)); cmp.alpha_composite(src, (0, 0))
chk = Image.new('RGBA', (W_, H_), (60, 60, 70, 255)); d = ImageDraw.Draw(chk)
for y in range(0, H_, 16):
    for x in range(0, W_, 16):
        if (x // 16 + y // 16) % 2: d.rectangle([x, y, x + 15, y + 15], fill=(90, 90, 100, 255))
cmp.alpha_composite(chk, (W_ + 10, 0))
for (r, j, x, y, w, h, px, ob) in ledger:
    if (r, j) in EXCLUDE: continue
    cmp.alpha_composite(Image.fromarray(frames[(r, j)]['img']), (W_ + 10 + x, y))
cmp.save(os.path.join(DOCS, 'compare.png'))
print('frames', len(frames), 'counts', counts, 'orb', orb_sheet, orb_kept, 'specks', specks)
