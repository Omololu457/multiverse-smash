#!/usr/bin/env python3
"""portrait.py — S.P.D. Rangers squad portraits: the six Rangers' idle frames (their own portraits carry posters / frames)
in a V — Red front and centre, Blue / Green flanking, Yellow / Pink behind, Omega at the back.
  python3 -I tools/spd_squad/portrait.py <repo root>            → assets/spd_rangers/portrait.png
  python3 -I tools/spd_squad/portrait.py <repo root> <theme>    → assets/spd_rangers/portrait__<theme>.png
With a theme, each Ranger's idle sheet is resolved like spdSquadSkins.js: generated gap sheet → own pack → __theme sheet."""
import os, sys
from PIL import Image
ROOT = sys.argv[1]; TAG = sys.argv[2] if len(sys.argv) > 2 else None
BASE = {'red': 'assets/spd_red/idle.png', 'blue': 'assets/spd_blue/idle.png', 'green': 'assets/spd_green/idle.png',
        'yellow': 'assets/spd_yellow/idle.png', 'pink': 'assets/spd_pink/idle.png', 'omega': 'omega_ranger_idle.png'}
FORM = {c: ('omega_ranger' if c == 'omega' else f'spd_{c}') for c in BASE}
FW = {'red': 160, 'blue': 144, 'green': 144, 'yellow': 160, 'pink': 144, 'omega': None}
def src(c):
    b = BASE[c]
    if not TAG: return b
    d, f = os.path.split(b); n, e = os.path.splitext(f)
    for p in [f'assets/spd_rangers/skins/{TAG}/{FORM[c]}/{f}', f'{d}/skins/{TAG}/{f}' if d else None, os.path.join(d, f'{n}__{TAG}{e}')]:
        if p and os.path.exists(os.path.join(ROOT, p)): return p
    raise SystemExit(f'no {TAG} idle for {c}')
def frame(c):
    im = Image.open(os.path.join(ROOT, src(c))).convert('RGBA'); w = FW[c] or im.size[1]
    im = im.crop((0, 0, min(w, im.size[0]), im.size[1])); return im.crop(im.getbbox())
W, H = 220, 150
out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for c, x, s in [('omega', 110, 0.62), ('yellow', 34, 0.80), ('pink', 186, 0.80), ('blue', 70, 0.90), ('green', 150, 0.90), ('red', 110, 1.0)]:
    im = frame(c); w, h = im.size; k = s * 128 / h
    im = im.resize((round(w * k), round(h * k)), Image.NEAREST)
    out.alpha_composite(im, (round(x - im.width / 2), 0 if c == 'omega' else H - im.height))
name = f'portrait__{TAG}.png' if TAG else 'portrait.png'
out.save(os.path.join(ROOT, 'assets', 'spd_rangers', name)); print('wrote', name)
