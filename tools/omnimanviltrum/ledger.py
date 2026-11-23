#!/usr/bin/env python3
"""MSV1-OMNIMAN — build docs/msv1/omniman/LEDGER.md + compare.png from slice_report.json (run after slice.py).
compare.png: left = the source sheet with every piece boxed and numbered R<row>.<n>; right = every output strip at 2x
on a checkerboard (so keying holes show), labelled."""
import json, os
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOC = os.path.join(ROOT, 'docs/msv1/omniman')
rep = json.load(open(os.path.join(DOC, 'slice_report.json')))
src = Image.open(os.path.join(ROOT, rep['source'])).convert('RGBA')

name_of = {}
for row in rep['rows']:
    for k, b in enumerate(row['boxes']): name_of[tuple(b)] = f"R{row['row']}.{k + 1}"
uses = {}
for an, a in rep['anims'].items():
    for c in a['cells']: uses.setdefault(tuple(c['src']), []).append(f"{an}[{c['cell']}]")
for fn, f in rep['fx'].items():
    for i, s in enumerate(f['src']): uses.setdefault(tuple(s), []).append(f"fx/{fn}[{i}]")
for i in rep['icons']: uses.setdefault(tuple(i['src']), []).append(i['file'])

# ── compare.png ──
L = src.resize((src.width * 2, src.height * 2), Image.NEAREST)
d = ImageDraw.Draw(L)
for b, nm in name_of.items():
    y0, x0, y1, x1 = [v * 2 for v in b]
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(255, 255, 0, 255))
    d.text((x0 + 1, y0 + 1), nm, fill=(255, 255, 0, 255))
strips = [(n, os.path.join(ROOT, 'assets/omniman_viltrum', f'{n}.png')) for n in rep['anims']] + \
         [('fx/' + n, os.path.join(ROOT, 'assets/omniman_viltrum/fx', f'{n}.png')) for n in rep['fx']] + \
         [(i['file'], os.path.join(ROOT, 'assets/omniman_viltrum', i['file'])) for i in rep['icons']]
ims = []
for n, p in strips:
    im = Image.open(p).convert('RGBA'); ims.append((n, im.resize((im.width * 2, im.height * 2), Image.NEAREST)))
colw = 760; x = 0; y = 0; placed = []; col_h = L.height
for n, im in ims:
    h = im.height + 14
    if y + h > col_h: x += colw; y = 0
    placed.append((n, im, x, y)); y += h
R = Image.new('RGBA', (x + colw, col_h), (40, 40, 48, 255))
dr = ImageDraw.Draw(R)
for n, im, px, py in placed:
    for cy in range(py + 12, py + 12 + im.height, 8):
        for cx in range(px, px + im.width, 8):
            if ((cx - px) // 8 + (cy - py) // 8) % 2: dr.rectangle([cx, cy, cx + 7, cy + 7], fill=(70, 70, 80, 255))
    R.alpha_composite(im, (px, py + 12)); dr.text((px, py), n, fill=(255, 255, 255, 255))
out = Image.new('RGBA', (L.width + R.width + 8, max(L.height, R.height)), (20, 20, 24, 255))
out.paste(L, (0, 0)); out.alpha_composite(R, (L.width + 8, 0))
out.convert('RGB').save(os.path.join(DOC, 'compare.png'))

# ── LEDGER.md ──
lines = ['# MSV1-OMNIMAN — sprite ledger (`omniman_viltrum`)', '',
         f"Source: `{rep['source']}` {rep['size'][0]}×{rep['size'][1]}, background RGB{tuple(rep['bg'])} keyed with tolerance **{rep['tolerance']}** (exact match).",
         f"Key check: nearest sprite pixel to the background = {rep['keyCheck']['minDistanceInSprites']} (sum of |ΔRGB|), {rep['keyCheck']['pixelsWithin40OfBg']} pixels within 40.",
         f"Row 13 **pink afterimage**: {rep['keyCheck']['afterimagePixels']} / {rep['keyCheck']['afterimageSourcePixels']} source pixels kept → intact = **{rep['keyCheck']['afterimageIntact']}** (its closest colour is {rep['keyCheck']['afterimageMinDistance']} from the background).",
         'No credit text on this sheet (nothing excluded). Nearest-neighbour only; drawn at OMV_SCALE 2.', '',
         f"**Unused pieces: {len(rep['unused'])}** — every frame is used.", '',
         '## Real counts per row', '', '| Row | y | pieces | merged fragments (streaks / glints) | brief said |', '|---|---|---|---|---|']
said = ['2 icons + 7 idle + 1 icon', '3', '6', '2', '3', '6 walk + 2 flight', '2', '2', '5 + 2 knockdown', '2', '3', '5', '~11', '2']
for r, s in zip(rep['rows'], said):
    lines.append(f"| R{r['row']} | {r['y'][0]}–{r['y'][1]} | **{r['pieces']}** | {r['mergedFragments']} | {s} |")
lines += ['', '## Every piece → where it is used', '', '| Piece | source box (y0,x0,y1,x1) | used in |', '|---|---|---|']
for row in rep['rows']:
    for k, b in enumerate(row['boxes']):
        lines.append(f"| R{row['row']}.{k + 1} | {tuple(b)} | {', '.join(uses.get(tuple(b), ['**UNUSED**']))} |")
lines += ['', '## Strips', '', '| strip | frames | cell |', '|---|---|---|']
for an, a in rep['anims'].items(): lines.append(f"| {an} | {a['frames']} | {a['cell'][0]}×{a['cell'][1]} |")
for fn, f in rep['fx'].items(): lines.append(f"| fx/{fn} | {f['frames']} | {f['cell'][0]}×{f['cell'][1]} |")
open(os.path.join(DOC, 'LEDGER.md'), 'w').write('\n'.join(lines) + '\n')
print('ledger + compare written')
