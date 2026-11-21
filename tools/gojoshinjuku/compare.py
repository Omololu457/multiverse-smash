#!/usr/bin/env python3
"""MSV1-GOJO — docs/msv1/gojo/compare.png: every sliced strip (×2, cell grid + origin marks) beside the source sheet."""
import json, os
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
rep = json.load(open(os.path.join(ROOT, 'docs/msv1/gojo/slice_report.json')))
S = 2
items = [(k, os.path.join(ROOT, 'assets/gojo_shinjuku', k + '.png'), v['frames']) for k, v in rep['anims'].items()]
items += [('fx:' + k, os.path.join(ROOT, 'assets/gojo_shinjuku/fx', k + '.png'), 1) for k in rep['fx']]
items += [('chant' + str(i + 1), os.path.join(ROOT, 'assets/gojo_shinjuku', c['file']), 1) for i, c in enumerate(rep['chant'])]
imgs = [(n, Image.open(p), f) for n, p, f in items]
colw = 820
y = 6; rows = []
x = 0; rowh = 0; line = []
for n, im, f in imgs:
    w, h = im.width * S, im.height * S + 14
    if x + w > colw and line: rows.append((line, rowh)); line = []; x = 0; rowh = 0
    line.append((n, im, f, x)); x += w + 10; rowh = max(rowh, h)
rows.append((line, rowh))
total = sum(h + 8 for _, h in rows) + 10
sheet = Image.open(rep['source'] if os.path.isabs(rep['source']) else os.path.join(ROOT, rep['source'])).convert('RGBA')
out = Image.new('RGBA', (colw + sheet.width + 20, max(total, sheet.height)), (90, 96, 110, 255))
out.paste(sheet, (colw + 20, 0))
d = ImageDraw.Draw(out)
for line, rh in rows:
    for n, im, f, x in line:
        big = im.resize((im.width * S, im.height * S), Image.NEAREST)
        cw = im.width // f
        bgc = Image.new('RGBA', big.size, (150, 156, 170, 255)); bgc.alpha_composite(big)
        out.paste(bgc, (x + 4, y + 14))
        for i in range(f):
            d.rectangle([x + 4 + i * cw * S, y + 14, x + 4 + (i + 1) * cw * S - 1, y + 14 + big.height - 1], outline=(255, 255, 0, 255))
            if not n.startswith(('fx', 'chant')):
                ox = x + 4 + (i * cw + cw // 2) * S
                d.line([ox, y + 14 + big.height - 4, ox, y + 14 + big.height + 2], fill=(255, 0, 0, 255), width=2)
        d.text((x + 4, y + 1), f'{n} ({f})', fill=(255, 255, 255, 255))
    y += rh + 8
out.save(os.path.join(ROOT, 'docs/msv1/gojo/compare.png'))
print('compare.png', out.size)
