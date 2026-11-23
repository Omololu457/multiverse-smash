#!/usr/bin/env python3
"""tools/dino/pack.py — MSV1-DINO: keyed frames (tools/dino/out/frames, extract.py) → per-form animation strips.

  python3 tools/dino/pack.py     → assets/dt_red|dt_blue|dt_yellow|dt_white/<anim>.png, assets/dinothunder/<extra>.png,
                                   dinoSprites.js (generated), docs/msv1/dino/compare.png, docs/msv1/dino/FRAME_USE.json

Every anim strip = cells of DINO_CELL, frame feet on originY, the body's feet centre on originX (median x of the lowest
30 % of the frame's opaque pixels; FX-heavy frames take the anchor of the frame they grow out of — ANCHOR_FROM).
Nearest-neighbour, no scaling, no recolour (the forms' default look). Same input → same bytes.
"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
FR = os.path.join(HERE, 'out', 'frames')
CELL = {'width': 260, 'height': 136, 'originX': 130, 'originY': 132}   # = MSV1_CELL, so ninja.js / nsFx draw these strips unchanged
F = lambda sheet, sec, *idx: [(sheet, sec, i) for i in idx]

# ── per-form animation table: anim → frames (sheet, section, index). Missing animations use the form's OWN closest frames. ──
RED = {
  'idle': F('red', 'stand', 0, 1, 2, 1), 'run': F('red', 'run', 0, 1, 2, 3, 4), 'jump': F('red', 'jump', 0, 1, 2), 'fall': F('red', 'jump', 2),
  'land': F('red', 'jump', 3, 4), 'crouch': F('red', 'jump', 3), 'guard': F('red', 'punch', 0),
  'hurt': F('red', 'jump', 3), 'hurtAir': F('red', 'jump', 1), 'down': F('red', 'jump', 3), 'getup': F('red', 'jump', 3, 4),   # no hurt / lose rows: his own landing crouch
  'lose': F('red', 'jump', 3), 'win': F('red', 'staffB', 3), 'taunt': F('red', 'staffA', 0),
  'jab': F('red', 'punch', 0, 1), 'straight': F('red', 'run', 4) + F('red', 'punch', 1), 'bicycle': F('red', 'airKick', 0, 1, 2),
  'staffThrust': F('red', 'staffA', 0, 1), 'staffArc': F('red', 'staffA', 1, 2), 'slam': F('red', 'staffB', 0, 1, 2),
  'speedUp': F('red', 'staffB', 3), 'dash': F('red', 'run', 4), 'penalty': F('red', 'airKick', 1, 2),
}
BLUE = {
  'idle': F('blue', 'stand', 0, 1, 2, 1), 'run': F('blue', 'run', 0, 1, 2, 3, 4), 'jump': F('blue', 'jump', 0, 1), 'fall': F('blue', 'jump', 2),
  'land': F('blue', 'jump', 3), 'crouch': F('blue', 'jump', 3), 'guard': F('blue', 'zordPose', 0),
  'hurt': F('blue', 'damage', 0, 1), 'hurtAir': F('blue', 'damage', 2), 'down': F('blue', 'lose', 0, 1), 'getup': F('blue', 'lose', 1) + F('blue', 'jump', 3),
  'lose': F('blue', 'lose', 0, 1), 'win': F('blue', 'zordPose', 0, 1), 'taunt': F('blue', 'climb', 0, 1, 2, 3, 4, 5, 6),
  'jab': F('blue', 'combo', 0, 1), 'string2': F('blue', 'combo', 2, 3), 'string3': F('blue', 'combo', 4), 'crescent': F('blue', 'combo', 5, 6, 7),
  'airPunch': F('blue', 'airPunch', 0, 1, 2), 'ram': F('blue', 'weaponUp', 0, 1, 2), 'quake': F('blue', 'weaponDown', 0, 1, 2, 3),
  'zord': F('blue', 'zordPose', 0, 1), 'dash': F('blue', 'run', 4),
}
YELLOW = {
  'idle': F('yellow', 'stand', 0, 1, 2, 1), 'run': F('yellow', 'run', 0, 1, 2, 3, 4, 5, 6, 7), 'jump': F('yellow', 'jump', 0, 1), 'fall': F('yellow', 'jump', 2),
  'land': F('yellow', 'jump', 3), 'crouch': F('yellow', 'jump', 3), 'guard': F('yellow', 'zordPose', 0),
  'hurt': F('yellow', 'damage', 0, 1), 'hurtAir': F('yellow', 'damage', 2, 3), 'down': F('yellow', 'lose', 0, 1), 'getup': F('yellow', 'lose', 1) + F('yellow', 'jump', 3),
  'lose': F('yellow', 'lose', 0, 1), 'win': F('yellow', 'zordPose', 0, 1), 'taunt': F('yellow', 'climb', 0, 1, 2, 3, 4, 5, 6, 7),
  'jab': F('yellow', 'combo', 0, 1), 'string2': F('yellow', 'combo', 2, 3), 'string3': F('yellow', 'combo', 4, 5), 'crescent': F('yellow', 'combo', 6, 7, 8, 9),
  'airKick': F('yellow', 'airKick', 0, 1, 2), 'upCrescent': F('yellow', 'weaponUp', 0, 1, 2, 3), 'dive': F('yellow', 'weaponDown', 0, 1, 2, 3),
  'zord': F('yellow', 'zordPose', 0, 1), 'dash': F('yellow', 'run', 6),
}
WHITE = {
  'idle': F('white', 'stand', 0, 1, 2, 3, 4), 'walk': F('white', 'walk', 0, 1, 2, 3, 4, 5, 6), 'run': F('drago', 'run', 0, 1, 2, 3, 4, 5, 6, 7),
  'jump': F('drago', 'ready', 0, 1), 'fall': F('drago', 'ready', 1), 'land': F('drago', 'slash', 2), 'crouch': F('drago', 'slash', 2), 'guard': F('drago', 'end', 0),
  'hurt': F('drago', 'slash', 2, 3), 'hurtAir': F('drago', 'ready', 0), 'down': F('drago', 'slash', 2), 'getup': F('drago', 'slash', 3) + F('drago', 'stand', 0),   # no hurt / lose rows: his own crouch / recovery
  'lose': F('drago', 'slash', 2), 'win': F('drago', 'stand', 0, 1), 'taunt': F('drago', 'end', 0, 1), 'appear': F('white', 'appear', 0),
  'sw1': F('white', 'comboA', 0, 1), 'sw2': F('white', 'comboA', 2, 3), 'sw3': F('white', 'comboA', 4, 5), 'sw4': F('white', 'comboB', 3, 4, 5, 6),
  'kick': F('white', 'comboB', 0, 1, 2), 'dKick': F('drago', 'kick', 0, 1, 2, 3), 'longSlash': F('drago', 'thrust', 0, 1, 2, 3), 'dragoCut': F('drago', 'slash', 0, 1, 2, 3),
  'crescent': F('drago', 'crescent', 0, 1, 2, 3), 'dashPose': F('drago', 'dashA', 0, 1), 'dash': F('drago', 'dashA', 2, 3, 4, 5, 6, 7) + F('drago', 'dashB', 0, 1, 2, 3, 4, 5, 6) + F('drago', 'dashC', 0, 1, 2),
  'dashOne': F('drago', 'dashA', 2),
}
# swap / clone FX strips (the DINO ZORD sparkle + ring bursts — effect art, not a Ranger) and the dash smear per form
for T, fx in ((RED, 'yellow'), (BLUE, 'blue'), (YELLOW, 'yellow'), (WHITE, 'yellow')):
    T['smoke'] = F(fx, 'sparkle', 0) + F(fx, 'ring', 0, 1); T['smokeFade'] = F(fx, 'ring', 1, 0) + F(fx, 'sparkle', 0)
T = None
RED['streakTail'] = F('red', 'run', 4, 0); BLUE['streakTail'] = F('blue', 'run', 4, 0); YELLOW['streakTail'] = F('yellow', 'run', 6, 2); WHITE['streakTail'] = F('drago', 'dashB', 0, 3)
CENTRED = {'sparkle', 'ring'}   # FX frames: centred on the body's middle
FORMS = {'dt_red': RED, 'dt_blue': BLUE, 'dt_yellow': YELLOW, 'dt_white': WHITE}
# extras (single images; the HUD / select / cut-ins / supers / win screens draw them)
EXTRAS = {
  'red_portrait': ('red', 'portrait', 0), 'red_smallZord': ('red', 'smallZord', 0), 'red_rider': ('red', 'rider', 0), 'emblem': ('red', 'emblem', 0),
  'blue_portrait': ('blue', 'portrait', 0), 'blue_smallZord': ('blue', 'smallZord', 0), 'blue_smallRider': ('blue', 'smallRider', 0), 'blue_emblem': ('blue', 'emblem', 0), 'blue_rider': ('blue', 'rider', 0),
  'blue_mission': ('blue', 'mission', 0), 'bossKilled_blue': ('blue', 'bossKilled', 0), 'triceraHead': ('blue', 'triceraHead', 0),
  'sparkle_blue': ('blue', 'sparkle', 0), 'ring1_blue': ('blue', 'ring', 0), 'ring2_blue': ('blue', 'ring', 1),
  'yellow_portrait': ('yellow', 'portrait', 0), 'yellow_rider': ('yellow', 'rider', 0), 'yellow_smallZord': ('yellow', 'smallZord', 0), 'yellow_smallFlyer': ('yellow', 'smallFlyer', 0),
  'yellow_emblem': ('yellow', 'emblem', 0), 'yellow_emblemSmall': ('yellow', 'emblemSmall', 0), 'go1': ('yellow', 'go', 0), 'go2': ('yellow', 'go', 1),
  'gem0': ('yellow', 'gemDots', 0), 'gem1': ('yellow', 'gemDots', 1), 'gem2': ('yellow', 'gemDots', 2), 'gem3': ('yellow', 'gemDots', 3),
  'yellow_mission': ('yellow', 'mission', 0), 'bossKilled': ('yellow', 'bossKilled', 0), 'pteraHead': ('yellow', 'pteraHead', 0),
  'sparkle': ('yellow', 'sparkle', 0), 'ring1': ('yellow', 'ring', 0), 'ring2': ('yellow', 'ring', 1),
  'white_portrait': ('white', 'portrait', 0),
}
# an FX-heavy frame borrows the feet anchor of the frame it grows out of
ANCHOR_FROM = {('red', 'staffB', 2): ('red', 'staffB', 1), ('red', 'staffB', 3): ('red', 'staffB', 1), ('blue', 'weaponDown', 2): ('blue', 'weaponDown', 1),
  ('blue', 'weaponDown', 3): ('blue', 'weaponDown', 1), ('yellow', 'weaponDown', 2): ('yellow', 'weaponDown', 1), ('yellow', 'weaponDown', 3): ('yellow', 'weaponDown', 1),
  ('red', 'staffA', 2): ('red', 'staffA', 1), ('blue', 'weaponUp', 1): ('blue', 'weaponUp', 0), ('yellow', 'weaponUp', 2): ('yellow', 'weaponUp', 1),
  ('blue', 'combo', 5): ('blue', 'combo', 4), ('yellow', 'combo', 7): ('yellow', 'combo', 6), ('white', 'comboA', 2): ('white', 'comboA', 1),
  ('white', 'comboB', 4): ('white', 'comboB', 3), ('drago', 'thrust', 1): ('drago', 'thrust', 0), ('drago', 'slash', 1): ('drago', 'slash', 0),
  ('drago', 'kick', 1): ('drago', 'kick', 0), ('drago', 'crescent', 2): ('drago', 'crescent', 1), ('red', 'airKick', 1): ('red', 'airKick', 0), ('blue', 'airPunch', 1): ('blue', 'airPunch', 0)}

_cache = {}
def frame(key):
    if key not in _cache:
        sheet, sec, i = key; _cache[key] = np.array(Image.open(os.path.join(FR, sheet, f'{sec}_{i}.png')).convert('RGBA'))
    return _cache[key]
def anchor(key):
    src = ANCHOR_FROM.get(key)
    a = frame(key)
    if src:   # same row baseline as the source; x = median of the source's 3 main suit colours in the lower body (FX colours ignored)
        led = json.load(open(os.path.join(ROOT, 'docs', 'msv1', 'dino', 'ledgers', key[0] + '.json')))
        fa, fs = led['sections'][key[1]][key[2]], led['sections'][src[1]][src[2]]
        b = frame(src); bm = b[:, :, 3] > 0
        cols, cnt = np.unique(b[bm][:, :3], axis=0, return_counts=True)
        keep = [tuple(int(v) for v in c) for c in cols[np.argsort(-cnt)] if int(c.astype(int).sum()) > 60][:3]
        feet = (fs['y'] + fs['h'] - 1) - fa['y']
        m = (a[:, :, 3] > 0) & np.isin(a[:, :, 0].astype(int) * 65536 + a[:, :, 1].astype(int) * 256 + a[:, :, 2].astype(int), [c[0] * 65536 + c[1] * 256 + c[2] for c in keep])
        ys, xs = np.nonzero(m); low = ys >= feet - max(6, int(0.3 * fs['h']))
        return (int(np.median(xs[low])) if low.any() else int(np.median(xs))), int(feet)
    if key[1] in CENTRED: return a.shape[1] // 2, a.shape[0] // 2 + 34
    al = a[:, :, 3] > 0; ys, xs = np.nonzero(al)
    low = ys >= ys.max() - max(6, int(0.3 * a.shape[0]))
    return int(np.median(xs[low])), int(ys.max())

def place(cellimg, key):
    a = frame(key); ax, ay = anchor(key)
    ox, oy = CELL['originX'] - ax, CELL['originY'] - ay
    im = Image.fromarray(a); cellimg.alpha_composite(im, (0, 0)) if False else None
    # clip to the cell (report clipping)
    clip = ox < 0 or oy < 0 or ox + a.shape[1] > CELL['width'] or oy + a.shape[0] > CELL['height']
    tmp = Image.new('RGBA', (CELL['width'], CELL['height']), (0, 0, 0, 0)); tmp.paste(im, (ox, oy), im)
    cellimg.alpha_composite(tmp)
    return clip

def main():
    strips = {}; used = set(); clips = []
    for form, table in FORMS.items():
        d = os.path.join(ROOT, 'assets', form); os.makedirs(d, exist_ok=True)
        strips[form] = {}
        for anim, keys in table.items():
            out = Image.new('RGBA', (CELL['width'] * len(keys), CELL['height']), (0, 0, 0, 0))
            for i, k in enumerate(keys):
                cell = Image.new('RGBA', (CELL['width'], CELL['height']), (0, 0, 0, 0))
                if place(cell, k): clips.append((form, anim, k))
                out.alpha_composite(cell, (i * CELL['width'], 0)); used.add(k)
            out.save(os.path.join(d, anim + '.png'), optimize=True)
            strips[form][anim] = len(keys)
    xd = os.path.join(ROOT, 'assets', 'dinothunder'); os.makedirs(xd, exist_ok=True)
    extras = {}
    for name, k in EXTRAS.items():
        a = frame(k); Image.fromarray(a).save(os.path.join(xd, name + '.png'), optimize=True); used.add(k); extras[name] = [int(a.shape[1]), int(a.shape[0])]
    # ── coverage: every frame the extractor produced is used somewhere ──
    allf = json.load(open(os.path.join(HERE, 'out', 'frames.json')))
    unused = [(s, sec, i) for s, secs in allf.items() for sec, n in secs.items() for i in range(n) if (s, sec, i) not in used]
    json.dump({'strips': strips, 'extras': sorted(extras), 'unused': unused, 'clipped': [list(map(str, c)) for c in clips]},
              open(os.path.join(ROOT, 'docs', 'msv1', 'dino', 'FRAME_USE.json'), 'w'), indent=1)
    with open(os.path.join(ROOT, 'dinoSprites.js'), 'w') as fh:
        fh.write('// GENERATED by tools/dino/pack.py — do not hand-edit. MSV1-DINO: per-form strips (frames per anim) + extras sizes.\n')
        fh.write('export const DINO_CELL = ' + json.dumps(CELL) + '\n')
        fh.write('export const DINO_STRIPS = ' + json.dumps(strips) + '\n')
        fh.write('export const DINO_EXTRAS = ' + json.dumps(extras) + '\n')
    # ── compare.png: every form strip, the anchor line drawn ──
    rows = [(f, a) for f in FORMS for a in FORMS[f]]
    W = max(strips[f][a] for f, a in rows) * 112 + 120; H = len(rows) * 56
    sheet = Image.new('RGBA', (W, H), (52, 54, 62, 255)); dr = ImageDraw.Draw(sheet)
    for r, (f, a) in enumerate(rows):
        im = Image.open(os.path.join(ROOT, 'assets', f, a + '.png')).resize((strips[f][a] * 110, 52), Image.NEAREST)
        dr.text((2, r * 56 + 20), f'{f[3:]}:{a}', fill=(255, 230, 120))
        for i in range(strips[f][a]):
            x0 = 120 + i * 112; dr.line([(x0 + 55, r * 56), (x0 + 55, r * 56 + 52)], fill=(90, 90, 110)); dr.line([(x0, r * 56 + 50), (x0 + 110, r * 56 + 50)], fill=(90, 90, 110))
        sheet.alpha_composite(im.crop((0, 0, im.width, 52)), (120, r * 56)) if False else None
        for i in range(strips[f][a]):
            cell = im.crop((i * 110, 0, i * 110 + 110, 52)); sheet.alpha_composite(cell, (120 + i * 112, r * 56))
    sheet.save(os.path.join(ROOT, 'docs', 'msv1', 'dino', 'compare.png'))
    print('strips', sum(len(v) for v in strips.values()), 'unused', unused, 'clipped', clips)

if __name__ == '__main__':
    main()
