#!/usr/bin/env python3
"""portrait.py — Ninja Storm Squad portraits: the five ninjas' first idle frames in a V — Shane front and centre, Dustin / Tori
flanking, Blake / Cam behind.
  python3 -I tools/ns_squad/portrait.py <repo root>          → assets/ns_squad/portrait.png + every theme's portrait__<theme>.png
Themes = nsSquadSkins.js NS_SQUAD_THEMES: Shane / Dustin from assets/windrangers/skins/<wr>/, the Trio from assets/ns_trio/skins/<tr>/."""
import os, sys
from PIL import Image
ROOT = sys.argv[1]
THEMES = {'alienx': ('alienx', 'alienx'), 'gold': ('kintsugi', 'amulet'), 'shadow': ('ghostfreak', 'abyss'), 'neon': ('feedback', 'cyber'), 'glitter': ('disco', 'crystal')}
DUO = {'ns_red', 'ns_yellow'}
LAYOUT = [('ns_navy', 40, 0.84), ('ns_green', 180, 0.84), ('ns_yellow', 72, 0.92), ('ns_blue', 148, 0.92), ('ns_red', 110, 1.0)]
def src(form, theme):
    if not theme: return f'assets/{form}/idle.png'
    wr, tr = THEMES[theme]
    return f'assets/windrangers/skins/{wr}/{form}/idle.png' if form in DUO else f'assets/ns_trio/skins/{tr}/{form}/idle.png'
def frame(form, theme):
    im = Image.open(os.path.join(ROOT, src(form, theme))).convert('RGBA')
    im = im.crop((0, 0, min(260, im.size[0]), im.size[1])); return im.crop(im.getbbox())
W, H = 220, 150
for theme in [None, *THEMES]:
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for form, x, s in LAYOUT:
        im = frame(form, theme); w, h = im.size; k = s * 128 / h
        im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.NEAREST)
        out.alpha_composite(im, (round(x - im.width / 2), H - im.height))
    name = f'portrait__{theme}.png' if theme else 'portrait.png'
    out.save(os.path.join(ROOT, 'assets', 'ns_squad', name)); print('wrote', name)
