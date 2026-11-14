#!/usr/bin/env python3
"""Deterministic, cell/region-aware extraction. Requires Pillow; source is read-only.

Run from any directory. No resampling of the playable pixels. The contact sheet
alone is enlarged with nearest neighbour. Each disconnected background region is
recorded with its own seed; a cell always remains ONE frame.
"""
from pathlib import Path
from collections import deque
import hashlib
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Enemies and Bosses - Krybot.png'
SHA = 'f6f58db89dd5c19f62839ab89038c8ec1e8c21052c0468309c576cb609c78c14'
BG = (148, 192, 204)
OUT = ROOT / 'assets/krybot'
DOC = ROOT / 'docs/krybot'

def main():
    assert hashlib.sha256(SRC.read_bytes()).hexdigest() == SHA, 'Source changed; inspect before extracting'
    source = Image.open(SRC)
    assert source.size == (655, 680) and source.mode == 'RGB'
    assert source.getpixel((0, 0)) == (89, 115, 123)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'cells').mkdir(exist_ok=True)
    # Anchors are authored body/foot locations in SOURCE coordinates relative to
    # each cell, NOT independent bbox centres. Idle was extended FOUR rows: feet
    # and black contact pixels continue through y63 (the suggested h52 clips).
    cells = []
    def add(name, rect, anchor, kind='body'):
        cells.append(dict(name=name, rect=list(rect), anchor=list(anchor), kind=kind))
    for i, x in enumerate([8, 48]): add(f'idle{i}', (x, 8, 32, 56), (16, 56))
    for i, x in enumerate(range(8, 401, 56)): add(f'run{i}', (x, 72, 48, 56), (24, 56))
    for i, x in enumerate([8, 52, 92, 140]): add(f'tumble{i}', (x, 136, 32, 32), (16, 32))
    add('jump', (8, 176, 40, 64), (16, 64))
    add('punchWind', (8, 248, 56, 57), (22, 57))
    add('punch', (72, 248, 56, 57), (22, 57))
    add('kickWind', (8, 312, 49, 56), (22, 56))
    add('kick', (64, 312, 49, 56), (22, 56))
    for name, x in [('ready', 8), ('aim', 64), ('lowerArm', 120)]: add(name, (x, 376, 48, 57), (22, 57))
    add('guard', (8, 440, 40, 48), (20, 48))
    add('recoil', (8, 496, 32, 48), (16, 48))
    for i, x in enumerate([8, 72, 136, 200]): add(f'fall{i}', (x, 552, 56, 48), (28, 48))
    for i, x in enumerate([8, 80, 152, 224, 296]): add(f'fx{i}', (x, 608, 64, 64), (32, 32), 'effect')
    frames = {}
    for c in cells:
        x, y, w, h = c['rect']
        im = source.crop((x, y, x+w, y+h)).convert('RGBA')
        # Enumerate EXACT light-cell color regions inside this verified cell.
        # Includes enclosed negative space between limbs (visually reviewed in
        # contact_sheet.png). No grey robot palette color is keyed globally.
        seen = set(); regions = []
        for py in range(h):
            for px in range(w):
                if (px, py) in seen or im.getpixel((px, py))[:3] not in [BG, (89,115,123)]: continue
                region_color = im.getpixel((px, py))[:3]
                seed = (px, py); q = deque([seed]); seen.add(seed); count = 0
                while q:
                    a, b = q.popleft(); count += 1; im.putpixel((a,b), (0,0,0,0))
                    for n in [(a-1,b),(a+1,b),(a,b-1),(a,b+1)]:
                        if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen and im.getpixel(n)[:3] == region_color:
                            seen.add(n); q.append(n)
                regions.append(dict(seed=list(seed), color=list(region_color), pixels=count))
        c['background_regions'] = regions
        c['alpha_bbox'] = list(im.getbbox())
        c['opaque_pixels'] = sum(1 for p in im.getdata() if p[3])
        im.save(OUT / 'cells' / (c['name'] + '.png'))
        frames[c['name']] = im
    meta = dict(source=SRC.name, sha256=SHA, size=[655,680], mode='RGB', outer_background=[89,115,123], cell_background=list(BG),
                credit_panel=[540,15,102,119], excluded='WANTED panel, ripper credit, outer separators; no labels used as animation', frames=cells)
    (DOC/'source_rects.json').write_text(json.dumps(meta,indent=2)+'\n')
    # A common 112x88 canvas, body pivot (56,80); no runtime recentering.
    sequences = {
        'idle':['idle0','idle1'], 'walk':[f'run{i}' for i in range(8)], 'walk_back':[f'run{i}' for i in range(7,-1,-1)],
        'run':[f'run{i}' for i in range(8)], 'jump':['jump'], 'fall':['tumble0'], 'hurt':['recoil'],
        'guard':['guard'], 'crouch':['guard'], 'dash':[f'run{i}' for i in range(8)], 'light':['punchWind','punch'], 'kJ2':['punchWind','punch'],
        'kJ3':['kickWind','kick'], 'heavy':['kickWind','kick'], 'kLow':['kickWind','kick'],
        'up':['ready','jump'], 'air':['kickWind','kick'], 'down_air':['kick'],
        'kAdvance':['punchWind','punch'], 'kChainKick':['kickWind','kick'], 'kAway':['kickWind','kick'],
        'kBlaster':['ready','aim','lowerArm'], 'kBreach':['punchWind','punch'],
        'kLeap':['jump','tumble0','tumble1','tumble2','tumble3','kick'],
        'kCover':['ready','aim'], 'ultimate':['ready','aim'], 'grab':['punchWind','punch'],
        'knockdown':[f'fall{i}' for i in range(4)], 'getup':['fall2','guard','idle0'], 'win':['idle0','idle1']}
    anim = {}
    # Remove only obsolete raw-cell outputs from this tool's earlier layout;
    # action strips remain at the root, raw cells are now separate from strips.
    for c in cells:
        old=OUT/(c['name']+'.png')
        if c['name'] not in sequences and old.exists(): old.unlink()
    anchors = {c['name']:c['anchor'] for c in cells}
    for action, names in sequences.items():
        strip=Image.new('RGBA',(112*len(names),88))
        for i, name in enumerate(names):
            ax,ay=anchors[name]; strip.paste(frames[name],(112*i+56-ax,80-ay))
        strip.save(OUT/(action+'.png'))
        anim[action]=dict(sheet=f'./assets/krybot/{action}.png',frames=len(names),width=112,height=88,speed=8,
                          originX=56,originY=80,anchorY=0,loop=action in ['idle','walk','walk_back','run','win'],lockLastFrame=True)
    # Small supplied energy art, tight bbox, no invisible explosion radius.
    im=frames['fx0']; im.crop(im.getbbox()).save(OUT/'shot.png')
    fx=Image.new('RGBA',(64*5,64))
    for i in range(5): fx.paste(frames[f'fx{i}'],(64*i,0))
    fx.save(OUT/'explosion.png')
    frames['idle0'].crop((8,0,29,24)).resize((84,96),Image.Resampling.NEAREST).save(OUT/'portrait.png')
    (ROOT/'krybotSprites.js').write_text('// Generated by tools/krybot/extract.py; source pixels unchanged.\nexport const KRYBOT_ANIM = '+json.dumps(anim,indent=2)+'\n')
    contact=Image.new('RGB',(6*224,6*216),(35,42,52)); d=ImageDraw.Draw(contact)
    for i,c in enumerate(cells):
        x=(i%6)*224; y=(i//6)*216
        d.text((x+6,y+4),c['name']+' '+str(c['rect']),fill='white')
        im=frames[c['name']].resize((frames[c['name']].width*3,frames[c['name']].height*3),Image.Resampling.NEAREST)
        contact.paste(im,(x+8,y+24),im)
    contact.save(DOC/'contact_sheet.png')
    assert hashlib.sha256(SRC.read_bytes()).hexdigest()==SHA
    print(f'{len(cells)} verified cells, {len(sequences)} strips; source SHA-256 preserved')

if __name__=='__main__': main()
