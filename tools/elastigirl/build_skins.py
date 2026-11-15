#!/usr/bin/env python3
"""Elastigirl palette skins — PRECOMPUTED sheets (no runtime recolouring).

    python3 tools/elastigirl/build_skins.py

Reads the extracted default strips assets/elastigirl/<anim>.png and writes assets/elastigirl/skins/<tag>/<anim>.png,
plus docs/elastigirl/skin_regions.json (families, per-skin pixel counts) and docs/elastigirl/skins_contact.png.

Region families (exact sheet colours; every pixel is classified, nothing is guessed by hue):
  SUIT_RED    #d81038 light · #b01030 mid · #901028 shade · #a06878 (raft tube highlight)
  BLACK_FILL  interior black of gloves / boots / briefs / trim: #000000 pixels that are NOT outline (no transparent
              4-neighbour) and NOT in the head zone (within 2 px of skin / hair), plus #000008 off the head
  BLACK_SHEEN #003878 — the blue sheen line on the black gloves / boots
  GOLD        #a07818 · #d8a020 · #d8e018 — belt and emblem accent lines
  never       outlines, the black MASK (head zone), skin, hair, eye whites, white slash FX, hit-flash silhouettes, grey
              shadows, the portrait
RAFT frames (eRaft, R21–24) carry Dash and Violet: only HELEN recolours there — her tube = the red components of
≥ 100 px in that frame (the kids' suits are small separate red blobs), plus the gold belt patches touching it. The
raft's dark hull, the kids and Helen's head are left as supplied.
"""
import json, os, re, sys
from collections import Counter
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'elastigirl')
DOCS = os.path.join(ROOT, 'docs', 'elastigirl')

def hx(s): return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
RED = {hx('#d81038'): 'light', hx('#b01030'): 'mid', hx('#901028'): 'shade', hx('#a06878'): 'light'}
GOLD = {hx('#a07818'): 'shade', hx('#d8a020'): 'mid', hx('#d8e018'): 'light'}
SHEEN = {hx('#003878')}
BLACKS = {hx('#000000'), hx('#000008')}
HEAD = {hx(c) for c in ['#d8b0a0', '#f8c8c0', '#f8a898', '#f8c8a8', '#907870', '#804838', '#583828']}

SKINS = [
    {'tag': 'incredibles2', 'id': 'eg_incredibles2', 'name': 'Elastigirl 2',
     'desc': 'Red suit → charcoal black, trim (gloves / boots / briefs) → silver, accent lines (belt / emblem) → blue; mask stays black.',
     'red': {'light': '#4a4a52', 'mid': '#383840', 'shade': '#26262c'},
     'fill': '#aeb4be', 'sheen': '#e4e8ee',
     'gold': {'light': '#7cc4ff', 'mid': '#2f86e8', 'shade': '#1d5cb4'},
     'arm': ['#383840', '#aeb4be']},
    {'tag': 'retro', 'id': 'eg_retro', 'name': 'Retro',
     'desc': 'Red stays; black gloves / boots / trim → royal blue (the blue sheen brightens); mask stays black.',
     'red': None, 'fill': '#2848c8', 'sheen': '#7898ff', 'gold': None,
     'arm': ['#d81038', '#2848c8']},
]

def frames_of(name):
    js = open(os.path.join(ROOT, 'elastigirlSprites.js')).read()
    m = re.search(r'"%s": \{[^}]*?"frames": (\d+),[^}]*?"frameWidth": (\d+)' % re.escape(name), js, re.S)
    return (int(m.group(1)), int(m.group(2))) if m else (1, None)

def classify(im, raft=False, fw=None):
    """→ dict (x, y) → family key for every recolourable pixel."""
    W, H = im.size; px = im.load()
    rgb = lambda x, y: px[x, y][:3] if 0 <= x < W and 0 <= y < H and px[x, y][3] else None
    out = {}
    head = set()
    for y in range(H):
        for x in range(W):
            if rgb(x, y) in HEAD: head.add((x, y))
    def near_head(x, y):
        return any((x + dx, y + dy) in head for dx in range(-2, 3) for dy in range(-2, 3))
    helen = None
    if raft:   # per-frame tube mask: red components ≥ 100 px (4-connected), + gold touching them
        helen = set(); seen = set()
        for y in range(H):
            for x in range(W):
                if (x, y) in seen or rgb(x, y) not in RED: continue
                comp, stack = [], [(x, y)]; seen.add((x, y))
                while stack:
                    cx, cy = stack.pop(); comp.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if (nx, ny) not in seen and rgb(nx, ny) in RED and (fw is None or nx // fw == cx // fw):
                            seen.add((nx, ny)); stack.append((nx, ny))
                if len(comp) >= 100: helen.update(comp)
        gold = [(x, y) for y in range(H) for x in range(W) if rgb(x, y) in GOLD]
        for (x, y) in gold:
            if any((x + dx, y + dy) in helen for dx in (-1, 0, 1) for dy in (-1, 0, 1)): helen.add((x, y))
    for y in range(H):
        for x in range(W):
            c = rgb(x, y)
            if c is None: continue
            if raft and (x, y) not in helen: continue
            if c in RED: out[(x, y)] = ('red', RED[c])
            elif c in GOLD: out[(x, y)] = ('gold', GOLD[c])
            elif raft: continue                                   # raft: only the tube's red + gold
            elif c in SHEEN and not near_head(x, y): out[(x, y)] = ('sheen', None)
            elif c in BLACKS:
                outline = any(rgb(nx, ny) is None for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
                if not outline and not near_head(x, y): out[(x, y)] = ('fill', None)
    return out

def apply(im, cls, sk):
    im = im.copy(); px = im.load(); n = Counter()
    for (x, y), (fam, tone) in cls.items():
        a = px[x, y][3]
        if fam == 'red' and sk['red']: px[x, y] = hx(sk['red'][tone]) + (a,); n['red'] += 1
        elif fam == 'gold' and sk['gold']: px[x, y] = hx(sk['gold'][tone]) + (a,); n['gold'] += 1
        elif fam == 'fill': px[x, y] = hx(sk['fill']) + (a,); n['fill'] += 1
        elif fam == 'sheen': px[x, y] = hx(sk['sheen']) + (a,); n['sheen'] += 1
    return im, n

def main():
    names = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png') and f != 'portrait.png')
    report = {'families': {'SUIT_RED': ['#d81038', '#b01030', '#901028', '#a06878'], 'GOLD': ['#a07818', '#d8a020', '#d8e018'],
                           'BLACK_SHEEN': ['#003878'], 'BLACK_FILL': '#000000 / #000008 interior, not outline, not within 2 px of skin/hair',
                           'never': 'outlines, mask (head zone), skin, hair, eye whites, white FX, hit-flash, grey shadows, portrait'},
              'raft': 'eRaft: only red components >= 100 px (Helen\'s tube) + touching gold recolour; Dash, Violet, hull and heads untouched',
              'skins': {}}
    masks = {}
    for sk in SKINS:
        d = os.path.join(SRC, 'skins', sk['tag']); os.makedirs(d, exist_ok=True)
        tot = Counter()
        for nm in names:
            im = Image.open(os.path.join(SRC, nm + '.png')).convert('RGBA')
            n, fw = frames_of(nm)
            cls = classify(im, raft=(nm == 'eRaft'), fw=fw)
            if nm == 'eRaft': masks[nm] = (im, cls, fw)
            out, cnt = apply(im, cls, sk)
            out.save(os.path.join(d, nm + '.png'))
            tot.update(cnt)
        report['skins'][sk['id']] = {'tag': sk['tag'], 'name': sk['name'], 'desc': sk['desc'], 'pixels': dict(tot)}
    os.makedirs(DOCS, exist_ok=True)
    json.dump(report, open(os.path.join(DOCS, 'skin_regions.json'), 'w'), indent=1)
    # contact sheet: idle / eWhip / run frame + 3 raft frames per skin, and the raft Helen-mask overlay row
    pick = [('idle', 0), ('heavy', 2), ('eWhirl', 1), ('eRaft', 0), ('eRaft', 9), ('eRaft', 13)]
    rows = [('Supersuit', None)] + [(s['name'], s['tag']) for s in SKINS] + [('raft mask (Helen = magenta)', 'MASK')]
    sc, pad = 3, 8
    cellw = max(frames_of(n)[1] for n, _ in pick) * sc + pad
    cellh = 64 * sc + pad
    sheet = Image.new('RGBA', (160 + cellw * len(pick), cellh * len(rows)), (0, 128, 128, 255)); dr = ImageDraw.Draw(sheet)
    for r, (label, tag) in enumerate(rows):
        dr.text((6, r * cellh + 10), label, fill=(255, 255, 255, 255))
        for c, (nm, fi) in enumerate(pick):
            n, fw = frames_of(nm)
            if tag == 'MASK':
                if nm != 'eRaft': continue
                im, cls, _ = masks['eRaft']; im = im.copy(); p = im.load()
                for (x, y) in cls: p[x, y] = (255, 0, 255, 255)
            else:
                im = Image.open(os.path.join(SRC, (f'skins/{tag}/' if tag else '') + nm + '.png')).convert('RGBA')
            cell = im.crop((fi * fw, 0, fi * fw + fw, im.height)).resize((fw * sc, im.height * sc), Image.NEAREST)
            sheet.paste(cell, (160 + c * cellw, r * cellh + 4), cell)
    sheet.save(os.path.join(DOCS, 'skins_contact.png'))
    print(json.dumps(report['skins'], indent=1))

if __name__ == '__main__':
    main()
