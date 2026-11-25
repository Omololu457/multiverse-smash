#!/usr/bin/env python3
"""tools/skinfix/portrait_from_idle.py KEY [OUT] — rebuild a fighter's missing select-screen portrait from idle frame 0
(head-and-shoulders crop on the same 128×128 plate tools/creativeskins uses for its skin portraits)."""
import json, os, subprocess, sys
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
key = sys.argv[1]
i = json.loads(subprocess.run(['node', '--input-type=module', '-e', f"const {{characters}}=await import('{ROOT}/characters.js');const c=characters['{key}'];console.log(JSON.stringify({{p:c.portrait,s:c.animationData.idle.sheet,w:c.animationData.idle.width,h:c.animationData.idle.height}}))"], capture_output=True, text=True, cwd=ROOT).stdout.strip().splitlines()[-1])
out = os.path.join(ROOT, (sys.argv[2] if len(sys.argv) > 2 else i['p']).lstrip('./'))
im = Image.open(os.path.join(ROOT, i['s'].lstrip('./'))).convert('RGBA')
f0 = im.crop((0, 0, i['w'] or im.width, min(im.height, i['h'] or im.height))); bb = f0.getbbox(); hh = max(8, int((bb[3] - bb[1]) * 0.5))
f0 = f0.crop((max(0, bb[0] - 1), max(0, bb[1] - 1), min(f0.width, bb[2] + 1), min(f0.height, bb[1] + hh)))
k = max(1, min(128 // f0.width, 120 // f0.height)); big = f0.resize((f0.width * k, f0.height * k), Image.NEAREST)
plate = Image.new('RGBA', (128, 128), (14, 18, 32, 255)); plate.alpha_composite(big, ((128 - big.width) // 2, max(0, 128 - big.height))); plate.save(out)
print('wrote', out)
