#!/usr/bin/env python3
"""portrait.py — S.P.D. Rangers squad portraits: the six Rangers' idle frames (their own portraits carry posters / frames)
in a V — Red front and centre, Blue / Green flanking, Yellow / Pink behind, Omega at the back.
  python3 -I tools/spd_squad/portrait.py <repo root>            → assets/spd_rangers/portrait.png
  python3 -I tools/spd_squad/portrait.py <repo root> <theme>    → assets/spd_rangers/portrait__<theme>.png
With a theme, each Ranger's idle sheet is resolved like spdSquadSkins.js: generated gap sheet → own pack → __theme sheet."""
import os, sys
from PIL import Image
ARGS = [a for a in sys.argv[1:] if a != '--mmpr']; MMPR = '--mmpr' in sys.argv
ROOT = ARGS[0]; TAG = ARGS[1] if len(ARGS) > 1 else None
BASE = {'red': 'assets/spd_red/idle.png', 'blue': 'assets/spd_blue/idle.png', 'green': 'assets/spd_green/idle.png',
        'yellow': 'assets/spd_yellow/idle.png', 'pink': 'assets/spd_pink/idle.png', 'omega': 'omega_ranger_idle.png'}
FORM = {c: ('omega_ranger' if c == 'omega' else f'spd_{c}') for c in BASE}
FW = {'red': 160, 'blue': 144, 'green': 144, 'yellow': 160, 'pink': 144, 'omega': None}
SQ = 'spd_rangers'
LAYOUT = [('omega', 110, 0.62), ('yellow', 34, 0.80), ('pink', 186, 0.80), ('blue', 70, 0.90), ('green', 150, 0.90), ('red', 110, 1.0)]
if MMPR:   # Mighty Morphin Rangers: Red front, Black / Pink flanking, Green / White behind   (--mmpr)
    SQ = 'mmpr_rangers'
    BASE = {'red': 'red_ranger_mmpr_idle_uniform.png', 'black': 'assets/mmpr_black/idle.png', 'pink': 'assets/mmpr_pink/idle.png',
            'green': 'assets/green_ranger/idle.png', 'white': 'assets/mmpr_white/idle.png'}
    FORM = {'red': 'red_ranger_mmpr', 'black': 'mmpr_black', 'pink': 'mmpr_pink', 'green': 'green_ranger', 'white': 'mmpr_white'}
    FW = {'red': 42, 'black': 176, 'pink': 176, 'green': 240, 'white': 208}
    LAYOUT = [('green', 36, 0.84), ('white', 184, 0.84), ('black', 72, 0.92), ('pink', 148, 0.92), ('red', 110, 1.0)]
def src(c):
    b = BASE[c]
    if not TAG: return b
    d, f = os.path.split(b); n, e = os.path.splitext(f)
    for p in [f'assets/{SQ}/skins/{TAG}/{FORM[c]}/{f}', f'{d}/skins/{TAG}/{f}' if d else None, os.path.join(d, f'{n}__{TAG}{e}')]:
        if p and os.path.exists(os.path.join(ROOT, p)): return p
    raise SystemExit(f'no {TAG} idle for {c}')
def frame(c):
    im = Image.open(os.path.join(ROOT, src(c))).convert('RGBA'); w = FW[c] or im.size[1]
    im = im.crop((0, 0, min(w, im.size[0]), im.size[1])); return im.crop(im.getbbox())
W, H = 220, 150
out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for c, x, s in LAYOUT:
    im = frame(c); w, h = im.size; k = s * 128 / h
    im = im.resize((round(w * k), round(h * k)), Image.NEAREST)
    out.alpha_composite(im, (round(x - im.width / 2), 0 if c == 'omega' else H - im.height))
name = f'portrait__{TAG}.png' if TAG else 'portrait.png'
out.save(os.path.join(ROOT, 'assets', SQ, name)); print('wrote', name)
