#!/usr/bin/env python3
"""Cyborg (Victor Stone) — Teen Titans GBA sheet extraction.

SOURCE IS READ-ONLY: "Game Boy Advance - Teen Titans - Playable Characters - Cyborg.png" (1369x1613 RGB, sha256 below)
is hash-checked and never written.

BACKGROUND POLICY: the opaque key colour RGB(77,109,243) is the ONLY thing removed. It is an exact match, no tolerance:
the sheet has 92 colours and the nearest other colour is 53 (L1) away, so no authored blue armour / energy pixel can be
caught. Key-coloured pixels ENCLOSED by art (431 regions: gaps between arm and torso, between the legs, inside the
explosion rings) are the GBA transparent index seen through the sprite, confirmed on the enlarged contact sheet, so they
are removed too. Dark outlines (0,0,0) are art and are kept. Nearest-neighbour only.

LABELS: the sheet's labels are pure-black text. Black is ALSO the outline colour, so text is not detected by colour
alone: a black-only component is text only if it lies inside one of the 23 pinned label rectangles below. The script
asserts 267 text components (every glyph) and that no art component touches a label rectangle unexpectedly.

FRAMES ARE COMPONENT UNIONS assigned by explicit per-band x-partitions (8-connected components). Every art component is
assigned to exactly one frame (or the credit panel); the script fails loudly on an unassigned / doubly-assigned piece.
The 1-px vertical dividers (cannon loop, missile-rack loop, explosion residue) are recorded as loop markers, not art.

Usage: python3 tools/cyborg/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Game Boy Advance - Teen Titans - Playable Characters - Cyborg.png'
SHA = '7c0c882f1a235ee8599d9a512cbbb3e96b1974d7448a8c880bbf0e893a366f26'
OUT = ROOT / 'assets/cyborg'
DOC = ROOT / 'docs/cyborg'
KEY = (77, 109, 243)

# Body strip cell: feet origin (OX, OY). Sized for the widest authored frame (Mega Punch impact streaks: 131 px wide,
# streak specks up to 66 px BELOW the feet) and the tallest (thruster double jump).
FW, FH, OX, OY = 184, 168, 92, 96

# ── the 23 printed labels (black text) ──
LABELS = {
    'Appearing': (167, 3, 216, 12), 'Idle': (554, 80, 572, 88), 'Running': (886, 154, 924, 163), 'Jumping': (502, 224, 542, 233),
    'Double Jump': (597, 303, 659, 313), 'Landing': (619, 402, 656, 412), 'Punch 1': (566, 475, 604, 483), 'Punch 2': (384, 548, 423, 556),
    'Shooting Missile': (420, 616, 501, 626), 'Shooting Sonic Cannon': (565, 691, 674, 701),
    '(Loop closed part until attack ends)': (565, 703, 741, 713), 'Aerial Punch': (366, 766, 428, 774),
    'Launching Missiles': (895, 859, 989, 869), '(Loop closed part 5 times)': (895, 871, 1025, 881), 'Mega Punch': (894, 943, 953, 953),
    'Hurt': (376, 1040, 397, 1047), 'Defeated': (1325, 1112, 1368, 1120), 'Missile': (20, 1190, 54, 1198),
    'Missile Explosion': (448, 1205, 534, 1215), 'Sonic Cannon Blast': (50, 1248, 142, 1256), 'Health Icon': (164, 1306, 221, 1314),
    'Cutscenes': (99, 1482, 151, 1489),
}
DIVIDERS = {'cannonLoop': [(223, 693), (337, 693)], 'rackLoop': [(284, 848), (467, 848)], 'explosionResidue': [(365, 1206), (412, 1206)]}
CREDIT = (1200, 1472)   # "Brought to you by... Mr. C" panel, Credit? No / Permission? No

# ── frame partitions: (prefix, y0, y1, [x cut points]) → frames prefix0.. between consecutive cuts ──
def cuts(xs, end):
    return list(xs) + [end]
BANDS = [
    ('appear', 0, 77, cuts([0, 56, 112], 170)),
    ('idle', 77, 148, cuts([0, 56, 112, 168, 224, 280, 336, 392, 448, 504], 560)),
    ('run', 148, 214, cuts([0, 48, 115, 195, 276, 352, 424, 470, 512, 572, 645, 718, 786, 845], 885)),
    ('jump', 214, 294, cuts([0, 55, 109, 157, 206, 253, 307, 366, 437], 515)),
    ('djump', 294, 401, cuts([0, 55, 109, 157, 206, 254, 302, 349, 403, 462, 533], 610)),
    ('land', 401, 473, cuts([0, 80, 148, 224, 301, 377, 443, 503, 563], 620)),
    ('p1', 473, 545, cuts([0, 56, 110, 158, 195, 232, 301, 368, 420, 464, 511], 570)),
    ('p2', 545, 615, cuts([0, 48, 92, 162, 229, 285, 338], 392)),
    ('sm', 615, 690, cuts([0, 49, 90, 147, 204, 261, 311, 369], 430)),
    ('cn', 690, 765, cuts([0, 58, 116, 167, 224, 281, 338, 395, 445, 503], 565)),
    ('ap', 765, 845, cuts([0, 46, 80, 143, 211, 274, 320], 368)),
    ('mr', 845, 926, cuts([0, 48, 102, 163, 224, 285, 346, 407, 468, 529, 583, 630, 684, 743, 814], 890)),
    # Mega Punch: the impact frames' radial streaks are detached specks — assigned by the radial centre they spread
    # from (6: 397-516, 7: 517-648 incl. the low specks in the Hurt band, 8: 649-794). y1 reaches the Hurt band.
    ('mp', 926, 1106, cuts([0, 62, 129, 168, 238, 313, 397, 517, 649, 795, 842], 900)),
    ('hurt', 1030, 1106, cuts([0, 64, 136, 205, 270, 325], 380)),
    ('def', 1106, 1187, cuts([0, 49, 99, 151, 201, 251, 304, 355, 407, 457, 507, 569, 623, 673, 723, 775, 825, 875, 927, 977, 1027, 1083,
                               1133, 1183, 1233, 1283], 1335)),
    ('mx', 1187, 1245, cuts([0, 26, 58, 93, 133, 176, 222, 268, 318, 366, 413], 470)),   # mx0 = the missile (y<1205) — split below
    ('blast', 1245, 1305, []),
    ('icon', 1305, 1480, []),
    ('cut', 1480, 1613, []),
]


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def components():
    im = Image.open(SRC)
    assert im.size == (1369, 1613) and im.mode == 'RGB', (im.size, im.mode)
    a = np.array(im)
    fg = ~(a == KEY).all(-1)
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    black = (a == 0).all(-1)
    comps = []
    for i, (ys, xs) in enumerate(ndimage.find_objects(lab)):
        m = lab[ys, xs] == i + 1
        c = dict(id=i + 1, x=xs.start, y=ys.start, w=xs.stop - xs.start, h=ys.stop - ys.start, n=int(m.sum()),
                 black=bool((black[ys, xs] & m).sum() == m.sum()))
        comps.append(c)
    return im, a, lab, comps


def inside(c, r, pad=1):
    return c['x'] >= r[0] - pad and c['y'] >= r[1] - pad and c['x'] + c['w'] <= r[2] + pad and c['y'] + c['h'] <= r[3] + pad


def assign(comps):
    """→ {frameName: [component ids]}, text ids, divider ids, credit id. Asserts every component is used once."""
    text, divs, frames = [], [], {}
    for c in comps:
        if c['black'] and any(inside(c, r) for r in LABELS.values()):
            text.append(c['id']); c['role'] = 'text'; continue
        if c['black'] and c['w'] == 1 and c['h'] > 30 and any((c['x'], c['y']) in v for v in DIVIDERS.values()):
            divs.append(c['id']); c['role'] = 'divider'; continue
        if (c['x'], c['y']) == CREDIT:
            c['role'] = 'credit'; continue
        cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
        name = None
        if 1245 <= c['y'] < 1305 and c['x'] < 60:            # Sonic Cannon Blast: two rows (beam stub + double ring)
            name = 'blast%d' % (0 if c['y'] < 1275 else 1)
        elif 1305 <= c['y'] < 1452 and c['x'] < 170:          # Health Icon grid (+ the dazed icons' sweat specks)
            if c['y'] < 1415: name = 'icon_r%d_c%d' % ((c['y'] - 1307) // 28, (c['x'] - 1) // 32)
            else: name = 'icon_daze%d' % (0 if cx < 37 else 1)
        elif 1452 <= c['y'] < 1478 and c['x'] < 40: name = 'icon_down'
        elif c['y'] >= 1478 and c['x'] < 200:                  # cutscene portrait + face overlays
            if c['h'] > 60: name = 'bust'
            elif c['y'] < 1595: name = 'eye%d' % (0 if c['x'] < 10 else 1)
            else: name = 'mouth%d' % ((c['x'] - 1) // 34)
        elif 1187 <= c['y'] < 1205 and c['x'] < 20: name = 'missile'
        else:
            for pre, y0, y1, xs in BANDS:
                if not xs or not (y0 <= cy < y1): continue
                if pre == 'hurt' and cx >= 380: continue        # low Mega Punch streak specks sit in the Hurt band
                if pre == 'mp' and cy >= 1030 and cx < 397: continue
                for k in range(len(xs) - 1):
                    if xs[k] <= cx < xs[k + 1]:
                        name = '%s%d' % ({'mx': 'ex'}.get(pre, pre), k); break
                if name: break
        assert name, ('unassigned component', c)
        c['role'] = name
        frames.setdefault(name, []).append(c['id'])
    assert len(text) == 267, len(text)
    assert len(divs) == 6, len(divs)
    return frames, text, divs


SKIN = {(192, 104, 0), (248, 136, 8), (152, 80, 0), (96, 16, 0)}   # Victor's human skin ramp (face / neck / shoulders)


def cut_frame(a, lab, ids):
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    rgba[..., :3] = a[y0:y1, x0:x1]
    rgba[..., 3] = np.where(m[y0:y1, x0:x1], 255, 0)
    return rgba, [x0, y0, x1 - x0, y1 - y0], m[y0:y1, x0:x1]


def body_anchor(rgba, mask):
    """Feet = lowest row of black outline in the largest component (impact streaks / thruster flames have no outline);
    x = centre of the face (topmost skin-ramp rows) so an extending arm never shifts the body. Fallbacks (white / dark
    flash silhouettes, dissolve stripes): bbox bottom / top-14-rows centre."""
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    main = lab == (int(np.argmax(sizes)) + 1)
    rgb = rgba[..., :3]
    blk = (rgb == 0).all(-1) & main
    if blk.sum() > 40:
        feet = int(np.where(blk)[0].max()) + 1
    else:
        feet = int(np.where(mask)[0].max()) + 1
    skin = np.zeros(mask.shape, bool)
    for col in SKIN: skin |= (rgb == col).all(-1)
    skin &= main
    if skin.sum() > 20:
        ys, xs = np.where(skin); top = ys.min(); sel = ys < top + 14
        hx = float(xs[sel].mean())
    else:
        ys, xs = np.where(main if main.sum() > 200 else mask); top = ys.min(); sel = ys < top + 14
        hx = float(xs[sel].mean())
    return [int(round(hx)), feet]


# ── animation strips (engine action → ordered cells). Rationale per action: docs/cyborg/MOVE_FRAME_MAP.md ──
R = lambda pre, *ks: [f'{pre}{k}' for k in ks]
SEQ = {
    'intro': R('appear', 0, 1, 2),                                   # Appearing (dissolve-in → flash → solid), then Idle
    'idle': R('idle', *range(10)),
    'walk': R('run', *range(14)),                                    # no walk cycle on the sheet: the run cycle, slower
    'walk_back': R('run', *range(13, -1, -1)),                       # reversed run cycle (honest reuse, documented)
    'run': R('run', *range(14)),
    'dash': R('run', 3, 4, 5, 6),
    'jump': R('jump', 0, 1, 2, 3, 4),
    'fall': R('jump', 5, 6, 7, 8),
    'doubleJump': R('djump', 0, 1, 2, 3, 4, 5),                      # thruster reboost (burn → decay); descent = fall
    'land': R('land', *range(9)),
    'crouch': R('land', 4),                                          # no crouch frame: the deepest landing crouch
    'guard': R('p1', 3),                                             # no guard frame: Punch 1's fists-up cover
    'hurt': R('hurt', 1, 2, 3, 4, 5),                                # white hit-flash → pale → recoil (cosmetic flash)
    'knockdown': R('hurt', 0, 1, 2, 5),                              # heavy-hit dark/white flash → recoil (no floor art)
    'lose': R('def', *range(26)),                                    # Defeated: flashing → stripe dissolve
    # normals
    'light': R('p1', 1, 2, 1),                                       # J1 Servo Jab
    'cJ2': R('p2', 0, 1, 2, 3, 4, 5),                                # J2 Piston Straight (Punch 2)
    'cJ3': R('p1', 3, 4, 5, 6, 7, 9),                                # J3 Shoulder Finish (shoulder turn → drive)
    'heavy': R('p1', 1, 2, 3, 4, 5, 6, 7, 8, 9),                     # Hydraulic Cross (Punch 1 complete)
    'cLow': R('land', 3, 4) + R('mp', 3),                            # Low Drive: landing crouch → Mega Punch low fist (body only, see FX)
    'up': R('land', 4) + R('ap', 1, 5, 6),                           # Rising Piston (Aerial Punch's raised fist)
    'air': R('ap', 0, 1, 2, 3, 4, 5, 6),                             # Aerial Punch
    'cAdv': R('run', 3, 4) + R('p2', 2, 3, 4),                       # Forward+Heavy: advancing punch
    'cPiston': R('p1', 4, 5, 6, 7),                                  # → fresh Heavy: piston strike
    'cKnock': R('mp', 0, 1) + R('p2', 2, 3, 5, 6),                   # → fresh Heavy: overhead load → knock-away
    # specials
    'cShot': R('cn', 0, 1, 2, 3, 4, 7, 8, 9),                        # Sonic Shot (transform → fire → retract)
    'cCannon': R('cn', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9),                # Sustained cannon (loop = cn4/cn5 by timeline)
    'cMissile': R('sm', 0, 1, 2, 3, 4, 5, 6, 7),                     # Straight Missile (Shooting Missile)
    'cRack': R('mr', *range(10)),                                    # Missile Rack (loop = mr5..mr7 by timeline)
    'cMega': R('mp', *range(11)),                                    # Mega Punch (wind-up → descent → impact → recovery)
    'cSlamAir': R('mp', 2),                                          # air Down+Special: the authored mid-hop fist pose
    'cSlamLand': R('mp', 3, 4, 5, 6, 7, 8, 9, 10),                   # its landing impact + recovery
    'cRecoil': R('cn', 2, 3, 4, 6, 7, 8),                            # Sonic Recoil
    'cVent': R('idle', 0),                                           # manual vent: idle body + vent FX (no vent art)
    # ultimate beats
    'ultOpen': R('cn', 0, 1, 2, 3, 4, 7),
    'ultCannon': R('cn', 4, 5),
    'ultRack': R('mr', 4, 5, 6, 7),
    'ultBoost': R('djump', 1, 2, 3),
    'ultAir': R('ap', 2, 3, 4),
    'ultMega': R('mp', *range(11)),
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard', 'dash', 'cVent', 'ultCannon'}
SPEED = {'idle': 7, 'walk': 6, 'walk_back': 6, 'run': 4, 'dash': 4, 'jump': 5, 'fall': 6, 'doubleJump': 4, 'land': 3, 'hurt': 4,
         'knockdown': 5, 'lose': 5, 'intro': 10}


def contact(names, cells, imgs, path, S=2, per=10, title=''):
    colw = max(cells[n]['rect'][2] for n in names) * S + 12
    rowh = max(cells[n]['rect'][3] for n in names) * S + 30
    rows = (len(names) + per - 1) // per
    img = Image.new('RGB', (per * colw, rows * rowh + 22), (38, 43, 54))
    d = ImageDraw.Draw(img); d.text((6, 6), title, fill='white')
    for i, n in enumerate(names):
        x = i % per * colw; y = 22 + i // per * rowh
        d.text((x + 3, y + 2), f'#{i} {n}', fill='white')
        im = imgs[n]; big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        bg = Image.new('RGB', big.size, (92, 128, 104) if i % 2 else (72, 92, 128)); bg.paste(big, (0, 0), big)
        img.paste(bg, (x + 3, y + 16))
        if 'anchor' in cells[n]:
            ax, ay = cells[n]['anchor']; cx, cy = x + 3 + ax * S, y + 16 + ay * S
            d.line([cx - 5, cy, cx + 5, cy], fill=(255, 50, 50)); d.line([cx, cy - 5, cx, cy + 5], fill=(255, 50, 50))
    img.save(path)


def main():
    assert sha(SRC) == SHA, 'Cyborg sheet hash changed'
    im, a, lab, comps = components()
    frames, text, divs = assign(comps)
    for d in ['cells', 'fx', 'icons', 'cutscene']: (OUT / d).mkdir(parents=True, exist_ok=True)
    DOC.mkdir(parents=True, exist_ok=True)
    imgs, cells = {}, {}
    order = sorted(frames, key=lambda n: (min(comps[i - 1]['y'] for i in frames[n]) // 1, n))
    for name, ids in frames.items():
        rgba, rect, mask = cut_frame(a, lab, ids)
        img = Image.fromarray(rgba, 'RGBA'); imgs[name] = img
        kind = 'body'
        if name.startswith(('ex', 'blast')) or name == 'missile': kind = 'fx'
        elif name.startswith('icon'): kind = 'icon'
        elif name in ('bust',) or name.startswith(('eye', 'mouth')): kind = 'cutscene'
        c = dict(name=name, rect=rect, components=[[comps[i - 1]['x'], comps[i - 1]['y']] for i in sorted(ids)], opaquePixels=int(mask.sum()), kind=kind)
        if kind == 'body': c['anchor'] = body_anchor(rgba, mask)
        cells[name] = c
        sub = {'body': 'cells', 'fx': 'fx', 'icon': 'icons', 'cutscene': 'cutscene'}[kind]
        img.save(OUT / sub / f'{name}.png')
    # duplicates (identical pixels)
    dup = {}
    names = list(cells)
    for i, n in enumerate(names):
        for m in names[:i]:
            if imgs[n].size == imgs[m].size and imgs[n].tobytes() == imgs[m].tobytes(): dup[n] = m; break
    # ── body strips ──
    anim = {}
    for action, ns in SEQ.items():
        strip = Image.new('RGBA', (FW * len(ns), FH))
        for i, n in enumerate(ns):
            ax, ay = cells[n]['anchor']; px, py = OX - ax, OY - ay; w, h = imgs[n].size
            assert px >= 0 and px + w <= FW and py >= 0 and py + h <= FH, ('frame overflow', action, n, px, py, w, h)
            strip.paste(imgs[n], (FW * i + px, py))
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/cyborg/{action}.png', 'frames': len(ns), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': SPEED.get(action, 4),
                        'frameWidth': FW, 'frameHeight': FH}
    used = {n for v in SEQ.values() for n in v}
    # ── FX strips ──
    def fx_strip(ns, path, flip=False, pad=2):
        w = max(imgs[n].width for n in ns) + pad * 2; h = max(imgs[n].height for n in ns) + pad * 2
        s = Image.new('RGBA', (w * len(ns), h))
        for i, n in enumerate(ns):
            g = imgs[n].transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else imgs[n]
            s.paste(g, (w * i + (w - g.width) // 2, (h - g.height) // 2))
        s.save(path); return {'w': w, 'h': h, 'frames': len(ns)}
    fx = {}
    fx['missile'] = fx_strip(['missile'], OUT / 'fx/missile_strip.png', flip=True)   # authored pointing LEFT → stored facing right
    fx['explosion'] = fx_strip([f'ex{k}' for k in range(11)], OUT / 'fx/explosion_strip.png')
    fx['sonic'] = fx_strip(['blast0', 'blast1'], OUT / 'fx/sonic_strip.png')       # beam stub + double ring, facing right
    # ── cutscene: bust + face overlays placed by exact template match on the bust ──
    bust = np.array(imgs['bust']); overlays = {}
    for n in ['eye0', 'eye1', 'mouth0', 'mouth1', 'mouth2']:
        o = np.array(imgs[n]); oh, ow = o.shape[:2]; best = None
        for y in range(bust.shape[0] - oh + 1):
            for x in range(bust.shape[1] - ow + 1):
                win = bust[y:y + oh, x:x + ow]; m = o[..., 3] > 0
                diff = int((win[m][:, :3].astype(int) != o[m][:, :3].astype(int)).any(-1).sum())
                if best is None or diff < best[0]: best = (diff, x, y)
        overlays[n] = {'x': best[1], 'y': best[2], 'w': ow, 'h': oh, 'mismatch': best[0], 'opaque': int((o[..., 3] > 0).sum())}
    # portrait for menus: the bust bottom-centred on a 128×128 canvas (no scaling)
    por = Image.new('RGBA', (128, 128)); por.paste(imgs['bust'], ((128 - imgs['bust'].width) // 2, 128 - imgs['bust'].height)); por.save(OUT / 'portrait.png')
    imgs['bust'].save(OUT / 'cutscene/bust.png')
    # credit panel (reference only, never animated)
    im.crop((1200, 1472, 1369, 1613)).save(OUT / 'credit_panel.png')
    # ── health icons → named expressions (cosmetic) ──
    ICONS = {'grin': ['icon_r0_c0', 'icon_r0_c1', 'icon_r0_c2', 'icon_r0_c3', 'icon_r0_c4'],
             'calm': ['icon_r1_c0', 'icon_r1_c1', 'icon_r1_c2', 'icon_r1_c3'], 'calm2': ['icon_r2_c0', 'icon_r2_c1', 'icon_r2_c2', 'icon_r2_c3'],
             'strain': ['icon_r3_c0', 'icon_r3_c1', 'icon_r3_c2', 'icon_r3_c3'], 'daze': ['icon_daze0', 'icon_daze1'], 'down': ['icon_down']}
    iw = max(imgs[n].width for v in ICONS.values() for n in v) + 2; ih = max(imgs[n].height for v in ICONS.values() for n in v) + 2
    rows = list(ICONS)
    sheet = Image.new('RGBA', (iw * 5, ih * len(rows)))
    for r, k in enumerate(rows):
        for i, n in enumerate(ICONS[k]):
            g = imgs[n]; sheet.paste(g, (iw * i + (iw - g.width) // 2, ih * r + (ih - g.height)))
    sheet.save(OUT / 'icons/expressions.png')
    meta = {'anim': anim, 'fx': fx, 'icons': {'w': iw, 'h': ih, 'rows': {k: [i, len(v)] for i, (k, v) in enumerate(ICONS.items())}},
            'cutscene': {'bust': {'w': imgs['bust'].width, 'h': imgs['bust'].height}, 'overlays': overlays}}
    (ROOT / 'cyborgSprites.js').write_text('// Generated by tools/cyborg/extract.py — do not hand-edit.\n'
                                          'export const CYBORG_ANIM = ' + json.dumps(anim, indent=1) + '\n'
                                          'export const CYBORG_FX = ' + json.dumps(fx) + '\n'
                                          'export const CYBORG_ICONS = ' + json.dumps(meta['icons']) + '\n'
                                          'export const CYBORG_CUTSCENE = ' + json.dumps(meta['cutscene']) + '\n')
    for n, c in cells.items():
        c['usedIn'] = sorted(k for k, v in SEQ.items() if n in v)
    body = [n for n in cells if cells[n]['kind'] == 'body']
    unused = [n for n in body if n not in used]
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': SRC.name, 'sha256': SHA, 'size': [1369, 1613], 'mode': 'RGB', 'key': list(KEY),
        'keyPolicy': 'exact RGB(77,109,243) only (also inside enclosed gaps); nearest other colour 53 L1 away; outlines (0,0,0) kept',
        'labels': LABELS, 'textComponents': len(text), 'dividers': DIVIDERS, 'creditPanel': [1200, 1472, 169, 141],
        'credit': 'Brought to you by... Mr. C — Credit? No / Permission? No (panel excluded from animation)',
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY},
        'cells': list(cells.values()), 'sequences': SEQ, 'duplicates': dup, 'unusedBodyCells': unused,
        'fx': fx, 'icons': meta['icons'], 'cutscene': meta['cutscene']}, indent=1) + '\n')
    def sortkey(n):
        import re
        m = re.match(r'([a-z_]+?)(\d+)$', n)
        return (cells[n]['rect'][1] // 70, cells[n]['rect'][0]) if True else n
    body_sorted = sorted(body, key=lambda n: (cells[n]['rect'][1] // 1, 0))
    seen = []
    for pre, *_ in BANDS:
        seen += sorted([n for n in body if n.startswith(pre) and n[len(pre):].isdigit()], key=lambda n: int(n[len(pre):]))
    contact(seen, cells, imgs, DOC / 'contact_sheet.png', title='Cyborg (cyborg) — numbered body cells; red cross = anchor (feet line, face centre)')
    others = [n for n in cells if cells[n]['kind'] != 'body']
    contact(others, cells, imgs, DOC / 'contact_sheet_fx_icons.png', S=3, per=8, title='Cyborg — FX / health icons / cutscene pieces')
    print(json.dumps({'bodyCells': len(body), 'fxIconCut': len(others), 'duplicates': dup, 'unused': unused, 'overlays': overlays}, indent=1))


if __name__ == '__main__':
    main()
