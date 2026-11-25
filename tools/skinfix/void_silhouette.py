#!/usr/bin/env python3
"""tools/skinfix/void_silhouette.py KEY TAG — a "Void Sovereign" skin's sheets: every default body sheet → a near-black
silhouette that keeps the sprite's own shading as a faint blue-black ramp (the procedural overlay in game.js adds the glow).
Missing `<sheet>__<tag>.png` files only; same size / alpha / grid as the default sheet. Portrait from idle frame 0."""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
key, tag = sys.argv[1], sys.argv[2]
info = json.loads(subprocess.run(['node', '--input-type=module', '-e', f"const {{characters}}=await import('{ROOT}/characters.js');const c=characters['{key}'];console.log(JSON.stringify({{p:c.portrait||null,a:Object.fromEntries(Object.entries(c.animationData).filter(([k,d])=>d&&d.sheet).map(([k,d])=>[k,[d.sheet,d.width||0,d.height||0]]))}}))"], capture_output=True, text=True, cwd=ROOT).stdout.strip().splitlines()[-1])
STOPS = np.array([[6, 6, 9], [14, 14, 20], [26, 26, 36], [44, 44, 60]], np.float32)
def ramp(t):
    t = np.clip(t, 0, 1) * 3; i = np.minimum(t.astype(int), 2); f = (t - i)[:, None]; return STOPS[i] * (1 - f) + STOPS[i + 1] * f
def void(a):
    o = a.copy(); on = a[..., 3] > 0
    L = (a[..., :3] @ np.array([0.299, 0.587, 0.114]))[on] / 255.0
    o[on, :3] = np.round(ramp(L ** 0.9)).astype(np.uint8); return o
done = set()
for act, (sheet, w, h) in info['a'].items():
    src = os.path.join(ROOT, sheet.lstrip('./')); dst = src[:-4] + f'__{tag}.png'
    if src in done or not os.path.exists(src) or os.path.exists(dst): continue
    done.add(src); Image.fromarray(void(np.array(Image.open(src).convert('RGBA')))).save(dst, optimize=True)
print(key, tag, len(done), 'sheets')
if info['p']:
    pp = os.path.join(ROOT, re.sub(r'\.(png|jpe?g)$', '', info['p'].lstrip('./'), flags=re.I) + f'__{tag}.png')
    if not os.path.exists(pp):
        s, w, h = info['a']['idle']; im = np.array(Image.open(os.path.join(ROOT, s.lstrip('./'))[:-4] + f'__{tag}.png').convert('RGBA'))
        f0 = Image.fromarray(im[:h or im.shape[0], :w or im.shape[1]]); bb = f0.getbbox(); hh = max(8, int((bb[3] - bb[1]) * 0.5))
        f0 = f0.crop((max(0, bb[0] - 1), max(0, bb[1] - 1), min(f0.width, bb[2] + 1), min(f0.height, bb[1] + hh)))
        k = max(1, min(128 // f0.width, 120 // f0.height)); big = f0.resize((f0.width * k, f0.height * k), Image.NEAREST)
        plate = Image.new('RGBA', (128, 128), (34, 40, 66, 255)); plate.alpha_composite(big, ((128 - big.width) // 2, max(0, 128 - big.height))); plate.save(pp)
        print('portrait', pp)
