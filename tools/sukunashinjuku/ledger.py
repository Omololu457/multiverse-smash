#!/usr/bin/env python3
"""MSV1-SUKUNA — LEDGER.md + compare.png from docs/msv1/sukuna/slice_report.json (run after slice.py).
compare.png: left = the source sheet with every used box outlined (exclusion box in red); right = every output strip
at 2x on a mid-grey checker (so outlines and transparency are visible)."""
import json, os
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
rep = json.load(open(os.path.join(ROOT, 'docs/msv1/sukuna/slice_report.json')))
src = Image.open(os.path.join(ROOT, rep['source'])).convert('RGB')
dr = ImageDraw.Draw(src)
used = {}
for name, a in rep['anims'].items():
    for c in a['cells']: used.setdefault(tuple(c['src']), []).append(f"{name}[{c['cell']}]")
for (y0, x0, y1, x1) in used: dr.rectangle([x0 - 1, y0 - 1, x1, y1], outline=(255, 255, 0))
e = rep['excluded']['box']; dr.rectangle([e[1], e[0], e[3] - 1, e[2] - 1], outline=(255, 0, 0), width=2)
strips = [(n, Image.open(os.path.join(ROOT, 'assets/sukuna_shinjuku', n + '.png'))) for n in rep['anims']]
sw = max(s.width for _, s in strips) * 2 + 110; sh = sum(s.height * 2 + 6 for _, s in strips)
right = Image.new('RGB', (sw, sh), (128, 128, 128)); d2 = ImageDraw.Draw(right); y = 0
for n, s in strips:
    big = s.resize((s.width * 2, s.height * 2), Image.NEAREST)
    for cx in range(0, big.width, 16):
        for cy in range(0, big.height, 16):
            if (cx // 16 + cy // 16) % 2: d2.rectangle([110 + cx, y + cy, 110 + cx + 15, y + cy + 15], fill=(150, 150, 150))
    right.paste(big, (110, y), big); d2.text((4, y + 4), n, fill=(255, 255, 255)); y += big.height + 6
out = Image.new('RGB', (src.width + sw, max(src.height, sh)), (40, 40, 40)); out.paste(src, (0, 0)); out.paste(right, (src.width, 0))
out.save(os.path.join(ROOT, 'docs/msv1/sukuna/compare.png'))
L = ['# MSV1-SUKUNA — sprite ledger (Ryomen Sukuna, Shinjuku Arc)', '',
     f"Source `{rep['source']}` {rep['size'][0]}x{rep['size'][1]}, background RGB{tuple(rep['bg'])} chroma-keyed (exact match).",
     f"Key safety: nearest sprite pixel is {rep['keyCheck']['minDistanceInSprites']} (sum |ΔRGB|) from the key; green-dominant sprite pixels: {rep['keyCheck']['greenDominantSpritePixels']}.",
     f"Excluded (only): {rep['excluded']['what']} — box y{e[0]}-{e[2]} x{e[1]}-{e[3]}.", '',
     '## Real frame counts per row', '', '| row | y | frames | merged fragments | used as |', '|---|---|---|---|---|']
for r in rep['rows']:
    uses = sorted({u.split('[')[0] for b in r['boxes'] for u in used.get(tuple(b), [])})
    unused = [b for b in r['boxes'] if tuple(b) not in used]
    L.append(f"| R{r['row']} | {r['y'][0]}-{r['y'][1]} | {r['frames']} | {r['mergedFragments']} | {', '.join(uses)}{' — UNUSED ' + str(unused) if unused else ''} |")
tot = sum(r['frames'] for r in rep['rows']); nu = sum(1 for r in rep['rows'] for b in r['boxes'] if tuple(b) not in used)
L += ['', f'**{tot} frames on the sheet, {tot - nu} used, {nu} unused.**', '', '## Output strips', '', '| strip | frames | cell | source boxes (y0,x0,y1,x1) |', '|---|---|---|---|']
for n, a in rep['anims'].items(): L.append(f"| {n} | {a['frames']} | {a['cell'][0]}x{a['cell'][1]} | {' '.join(str(tuple(c['src'])) for c in a['cells'])} |")
L += ['', '## Effect sprites (cut from frames that are also used whole)', '']
for n, f in rep['fx'].items(): L.append(f"- `fx/{n}.png` {f['size'][0]}x{f['size'][1]}")
L += ['', 'Guard: R6 frames 6-7 (the crossed-arm frames). Crouch: R4 frame 3 (landing crouch) — the sheet has no crouch row.',
      'Jump attack: R4 frames 1-2 (tucked knee) — the sheet has no flip frame. Select portrait: idle frame 0, head + shoulders ×4.']
open(os.path.join(ROOT, 'docs/msv1/sukuna/LEDGER.md'), 'w').write('\n'.join(L) + '\n')
print(f'{tot} frames, {nu} unused')
