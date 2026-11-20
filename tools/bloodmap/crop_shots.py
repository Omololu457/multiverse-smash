#!/usr/bin/env python3
"""tools/bloodmap/crop_shots.py — crop the raw in-game shots (harness/blood_shots.mjs) around the fighter and compose
docs/msv1/blood/screenshots/{tiers,slash_vs_blunt,floor_pool,oil_robot,edo_crack,ranger_suit}.png (nearest-neighbour ×2)."""
import json, os
from PIL import Image, ImageDraw
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = f'{R}/docs/msv1/blood/screenshots'; RAW = f'{D}/raw'
meta = json.load(open(f'{RAW}/meta.json'))
def crop(name, pad=(70, 70, 70, 30), z=2):
    m = meta[name]; im = Image.open(f'{RAW}/{name}.png').convert('RGB'); sx = im.width / m['cw']; sy = im.height / m['ch']; r = m['rect']
    box = (int((r['x'] - pad[0]) * sx), int((r['y'] - pad[1]) * sy), int((r['x'] + r['w'] + pad[2]) * sx), int((r['y'] + r['h'] + pad[3]) * sy))
    c = im.crop(box); return c.resize((c.width * z, c.height * z), Image.NEAREST)
def strip(names, labels, out):
    cs = [crop(n) for n in names]; W = sum(c.width for c in cs) + 8 * (len(cs) + 1); H = max(c.height for c in cs) + 30
    o = Image.new('RGB', (W, H), (16, 17, 20)); d = ImageDraw.Draw(o); x = 8
    for c, l in zip(cs, labels): o.paste(c, (x, 26)); d.text((x + 4, 8), l, fill=(230, 230, 230)); x += c.width + 8
    o.save(f'{D}/{out}'); print(out, o.size)
strip([f'tier{t}' for t in range(5)], ['T0 (<15% lost) · blue box = training hurtbox overlay', 'T1 (15-35%)', 'T2 (35-60%)', 'T3 (60-85%)', 'T4 (85%+)'], 'tiers.png')
strip(['slash', 'blunt'], ['SLASH: line cuts + streaks', 'BLUNT: nose/mouth/brow + bruising'], 'slash_vs_blunt.png')
strip(['pool'], ['T4 standing still: pool + drips'], 'floor_pool.png')
strip(['oil_genos'], ['OIL: Genos (machine)'], 'oil_robot.png')
strip(['edo_madara'], ['EDO TENSEI: Madara cracks + flakes'], 'edo_crack.png')
strip(['ranger_spd_red'], ['RANGER: suit tears / stains, helmet clean'], 'ranger_suit.png')
