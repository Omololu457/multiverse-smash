#!/usr/bin/env python3
"""Dash Parr palette-swap skins (precomputed; no runtime recolouring).

The GBA art is indexed: every role is an exact colour. Suit = 3-step red ramp. Black (0,0,0) is used for the
mask, the emblem's "i" logo AND the gloves / boots / trunks band (the "trim"), so black pixels are classified by
4-connected black component inside each strip:
  * touches a skin pixel                          → MASK  (stays black in every skin)
  * every non-black neighbour is emblem/hair gold/white → LOGO (stays black)
  * otherwise                                     → TRIM  (recoloured)
White (248,248,248) — speed streaks, dust, eye whites, the hit-flash silhouette — is never touched.
Shadow grey, skin, hair and emblem gold are never touched. The portrait (a separate painted head icon) is unchanged.

Usage: python3 tools/dash_parr/build_skins.py   (run after extract.py)
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets/dash_parr'
DOC = ROOT / 'docs/dash'
K = (0, 0, 0)
SUIT = [(216, 16, 56), (176, 16, 48), (144, 16, 40)]
GLOVE_HI = (0, 56, 120)
SKIN = {(216, 176, 160), (248, 200, 192), (184, 144, 136), (144, 120, 112), (248, 168, 144), (248, 200, 168)}
EMBLEM = {(216, 224, 24), (216, 160, 32), (248, 248, 248)}
SKINS = {
    'incredibles2': {'name': 'Incredibles 2', 'suit': [(72, 68, 80), (50, 47, 57), (32, 30, 37)], 'trim': (200, 22, 46), 'gloveHi': (238, 74, 92)},
    'trackstar': {'name': 'Track Star', 'suit': [(44, 104, 224), (30, 76, 176), (20, 52, 126)], 'trim': (236, 186, 42), 'gloveHi': (255, 226, 120)},
}


def classify(im):
    w, h = im.size; p = im.load(); seen = set(); trim = []; counts = {'mask': 0, 'logo': 0, 'trim': 0}
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or p[x, y][3] == 0 or p[x, y][:3] != K:
                continue
            comp = []; st = [(x, y)]; seen.add((x, y)); nb = set()
            while st:
                a, b = st.pop(); comp.append((a, b))
                for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if not (0 <= c < w and 0 <= d < h) or p[c, d][3] == 0:
                        continue
                    if p[c, d][:3] == K:
                        if (c, d) not in seen:
                            seen.add((c, d)); st.append((c, d))
                    else:
                        nb.add(p[c, d][:3])
            if nb & SKIN:
                counts['mask'] += len(comp)
            elif nb and nb <= EMBLEM:
                counts['logo'] += len(comp)
            else:
                counts['trim'] += len(comp); trim.extend(comp)
    return trim, counts


def recolor(im, spec):
    out = im.copy(); p = out.load(); trim, counts = classify(im)
    suit = dict(zip(SUIT, spec['suit']))
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if a and (r, g, b) in suit:
                p[x, y] = suit[(r, g, b)] + (a,)
            elif a and (r, g, b) == GLOVE_HI:
                p[x, y] = spec['gloveHi'] + (a,)
    for x, y in trim:
        p[x, y] = spec['trim'] + (p[x, y][3],)
    return out, counts


def main():
    strips = sorted(q for q in ASSETS.glob('*.png') if q.name != 'portrait.png')
    audit = {}
    for tag, spec in SKINS.items():
        d = ASSETS / 'skins' / tag; d.mkdir(parents=True, exist_ok=True)
        tot = {'mask': 0, 'logo': 0, 'trim': 0}
        for q in strips:
            im = Image.open(q).convert('RGBA'); out, c = recolor(im, spec)
            out.save(d / q.name)
            for k in tot: tot[k] += c[k]
        Image.open(ASSETS / 'portrait.png').save(d / 'portrait.png')
        audit[tag] = {'name': spec['name'], 'files': len(strips) + 1, 'blackPixels': tot,
                      'suitMap': {str(a): b for a, b in zip(SUIT, spec['suit'])}, 'trim': spec['trim'], 'gloveHighlight': spec['gloveHi']}
    rules = {'mask': 'black touching skin → stays black', 'logo': 'black enclosed by emblem gold/white → stays black',
             'trim': 'other black (gloves, boots, trunks band) → recoloured', 'untouched': 'white streaks/flash/dust, skin, hair, emblem gold, shadow grey, portrait'}
    (DOC / 'skin_regions.json').write_text(json.dumps({'rules': rules, 'skins': audit}, indent=2) + '\n')
    # Contact strip for the visual check: idle frame 0 + streak frame for each skin.
    tiles = [('supersuit', ASSETS)] + [(t, ASSETS / 'skins' / t) for t in SKINS]
    sheet = Image.new('RGBA', (len(tiles) * 2 * 112 * 3, 64 * 3), (38, 43, 54, 255))
    for i, (t, base) in enumerate(tiles):
        for j, (act, fr) in enumerate((('idle', 0), ('blurDash', 1))):
            im = Image.open(base / f'{act}.png').crop((fr * 112, 0, fr * 112 + 112, 64)).resize((336, 192), Image.Resampling.NEAREST)
            sheet.alpha_composite(im, ((i * 2 + j) * 336, 0))
    sheet.save(DOC / 'skins_contact.png')
    print(json.dumps(audit, indent=1))


if __name__ == '__main__':
    main()
