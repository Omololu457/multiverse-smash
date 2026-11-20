#!/usr/bin/env python3
"""tools/edoskin/sheets.py — MSV1-EDO contact sheets: docs/msv1/edo/sheets/<id>.png.
Matched ORIGINAL (top) and EDO (bottom) frames: idle ×3 consecutive, an attack frame showing the effect, hurt, and a
crouch / turn frame, same pose / facing / scale / background (nearest-neighbour ×4).
  python3 tools/edoskin/sheets.py [--only k1,k2] [--out DIR]
"""
import argparse, json, os, re
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
PICK = [('idle', 0), ('idle', 1), ('idle', 2), ('ATTACK', None), ('hurt', 0), ('crouch', 0), ('run', 2)]
ATTACK_PREF = ['special', 'ultimate', 'heavy', 'light', 'launcher', 'air']


def frame(sheet, d, i):
    im = Image.open(os.path.join(ROOT, sheet)).convert('RGBA')
    x = d['sx'] + i * d['w']
    return im.crop((x, d['sy'], x + d['w'], d['sy'] + d['h']))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only'); ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'msv1', 'edo', 'sheets'))
    A = ap.parse_args(); os.makedirs(A.out, exist_ok=True)
    elig = json.load(open(os.path.join(HERE, 'eligibility.json'))); defs = json.load(open(os.path.join(HERE, 'defs.json')))
    keys = [k for k, c in elig['classes'].items() if c in ('HUMAN', 'MASKED') and k not in elig.get('exclude', {})]
    if A.only: keys = [k for k in keys if k in A.only.split(',')]
    for key in sorted(keys):
        ds = [d for d in defs[key]['defs'] if d['src'] == 'characters.js' and not d['sheet'].endswith('__edo.png')]
        by = {}
        for d in ds: by.setdefault(d['act'], d)
        cells = []
        for act, i in PICK:
            if act == 'ATTACK':
                cand = [d for d in ds if any(p in (d['act'] or '').lower() for p in ATTACK_PREF) and d['n'] >= 3] or [d for d in ds if d['act'] not in ('idle', 'walk', 'run', 'hurt')]
                if not cand: continue
                d = max(cand[:6], key=lambda d: d['n']); i = d['n'] // 2
            else:
                d = by.get(act)
                if not d or i >= d['n']: continue
            e = re.sub(r'\.png$', '__edo.png', d['sheet'])
            if not os.path.exists(os.path.join(ROOT, e)): continue
            cells.append((f"{d['act']}#{i}", frame(d['sheet'], d, i), frame(e, d, i)))
        if not cells: print('no cells', key); continue
        Z = 4; pad = 8
        cw = max(c[1].width for c in cells) * Z + pad; ch = max(c[1].height for c in cells) * Z
        M = Image.new('RGBA', (cw * len(cells), ch * 2 + 40), (58, 62, 70, 255)); dr = ImageDraw.Draw(M)
        dr.text((4, 2), f'{key}  ({elig["classes"][key]})  top = original, bottom = Edo Tensei', fill=(240, 240, 240))
        for j, (lab, a, b) in enumerate(cells):
            x = j * cw
            dr.text((x + 4, 16), lab, fill=(200, 200, 200))
            M.alpha_composite(a.resize((a.width * Z, a.height * Z), Image.NEAREST), (x, 30))
            M.alpha_composite(b.resize((b.width * Z, b.height * Z), Image.NEAREST), (x, 34 + ch))
        M.convert('RGB').save(os.path.join(A.out, f'{key}.png'), optimize=True)
    print('sheets', len(keys))

if __name__ == '__main__':
    main()
