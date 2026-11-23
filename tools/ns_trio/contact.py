#!/usr/bin/env python3
"""tools/ns_trio/contact.py — contact sheet: every ns_trio skin × the three forms (idle + sword frames) → docs/ns_trio/skins_contact.png"""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = json.load(open(os.path.join(ROOT, 'tools/ns_trio/skins.json')))['skins']
FORMS = ['ns_blue', 'ns_navy', 'ns_green']
def cell(p, fi=0):
    im = Image.open(p).convert('RGBA'); c = im.crop((fi * 260, 0, fi * 260 + 260, im.size[1])); bb = c.getbbox(); return c.crop(bb) if bb else c
rows = [('base', {k: f'assets/{k}' for k in FORMS})] + [(s['name'], {k: f'assets/ns_trio/skins/{s["tag"]}/{k}' for k in FORMS}) for s in SPEC if os.path.isdir(f'{ROOT}/assets/ns_trio/skins/{s["tag"]}')]
W = Image.new('RGB', (6 * 120 + 10, len(rows) * 150), (70, 74, 84)); d = ImageDraw.Draw(W)
for r, (name, dirs) in enumerate(rows):
    for k, form in enumerate(FORMS):
        for j, strip in enumerate(['idle', 'sword']):
            c = cell(os.path.join(ROOT, dirs[form], strip + '.png'), 0 if strip == 'idle' else 6); c = c.resize((c.width * 2, c.height * 2), Image.NEAREST)
            W.paste(c, ((k * 2 + j) * 120 + 10, r * 150 + 148 - c.height), c)
    d.text((4, r * 150 + 2), name.replace('—', '-'), fill=(255, 255, 255))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/ns_trio/skins_contact.png'); W.save(out); print(out)
