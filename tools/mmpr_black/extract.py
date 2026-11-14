#!/usr/bin/env python3
"""Black Ranger (Adam Park, MMPR movie Genesis sheet) + shared Falconzord extraction.

Sources are READ-ONLY. Both are hash-checked and never written.
Background policy: the GIF transparency index is the only thing removed. Opaque black suit pixels, outline
(32,32,0) and the visor (0,0,0) are kept. No tolerance, no colour keying, nearest-neighbour only.

FRAMES ARE COMPONENT UNIONS. Every 8-connected opaque component on each sheet is assigned to exactly one named
cell (or to the credit panel). Detached trail pieces and specks are listed explicitly with the pose they belong
to. The script asserts that no component is unassigned and none is assigned twice, so a changed source fails
loudly. Cell names describe the OBSERVED pose (enlarged inspection); the action mapping is in
docs/mmpr_black/MOVE_FRAME_MAP.md.

Usage: python3 tools/mmpr_black/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/mmpr_black'
ZDOC = ROOT / 'docs/power_rangers/falconzord'
OUT = ROOT / 'assets/mmpr_black'
ZOUT = ROOT / 'assets/power_rangers/falconzord'
BSRC = ROOT / 'Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Rangers - Black Ranger.gif'
ZSRC = ROOT / 'Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Zords - Falconzord.gif'
BSHA = '6ad5096e111c1997f694962353373b9d81bd2bfce376f5267ca9891282b4cbf5'
ZSHA = 'f7bf588277c2f4ddffaa483e127d2791b55e83d69e7c08abdb6b01b3d8d1d24b'
CREDIT_TEXT = 'Sprites ripped by Belial the Hedgehog.'

# Black strips: frame box + body origin (feet). Large enough for the widest trail frame (acro1, 83 px).
FW, FH, OX, OY = 176, 128, 88, 118

# name: list of component top-left corners (x, y) from the 8-connected labelling (see docs/mmpr_black/SPRITE_LEDGER.md).
BLACK = {
    # band 1: ready / guard-like stance (three subtle breathing poses)
    'ready0': [(3, 2)], 'ready1': [(46, 3)], 'ready2': [(90, 1)],
    # band 2: walk (six poses)
    'walk0': [(1, 79)], 'walk1': [(45, 78)], 'walk2': [(86, 78)], 'walk3': [(116, 80)], 'walk4': [(159, 80)], 'walk5': [(196, 80)],
    # band 3: compact crouch, rising raised-fist, airborne rise, airborne descend
    'crouch0': [(3, 176)], 'rise0': [(48, 155)], 'rise1': [(93, 167)], 'rise2': [(146, 162)],
    # band 4: run (six poses)
    'run0': [(5, 241)], 'run1': [(55, 241)], 'run2': [(114, 244)], 'run3': [(150, 242)], 'run4': [(205, 240)], 'run5': [(267, 243)],
    # band 5: vertical reach, tuck, two rolls (ball), flying side kick (extended leg)
    'reach0': [(2, 319)], 'tuck0': [(47, 327)], 'roll0': [(103, 332)], 'roll1': [(144, 329)], 'roll2': [(191, 330)], 'flyKick0': [(262, 326)],
    # band 6: grounded punch / extension sequence
    'punch0': [(0, 405)], 'punch1': [(49, 405)], 'punch2': [(114, 404)], 'punch3': [(172, 403)], 'punch4': [(227, 409)],
    # band 7: kick sequence with the supplied crescent trails (kick3 carries a detached 8x8 trail tip)
    'kick0': [(1, 484)], 'kick1': [(57, 483)], 'kick2': [(101, 480)], 'kick3': [(161, 480), (190, 498)], 'kick4': [(225, 481)], 'kick5': [(281, 484)],
    # band 8: Power Axe swing. The axe IS drawn in axe1 (raised) and axe3 (lowered); axe0/axe2 are swing trails.
    'axe0': [(2, 559)], 'axe1': [(53, 554)], 'axe2': [(106, 565)], 'axe3': [(209, 564)],
    # band 9: acrobatic low crouch, cartwheel with trail (detached trail piece), handstand kick with trail, low horizontal dive
    'acro0': [(4, 661)], 'acro1': [(57, 647), (106, 657)], 'acro2': [(147, 644)], 'acro3': [(216, 656)],
    # band 10: low set, rising strike (1-px speck belongs to its trail), jump kick, spin kick, high crescent kick, follow-through
    'set0': [(5, 739)], 'riseStrike0': [(64, 719), (100, 773)], 'jumpKick0': [(117, 725)], 'spinKick0': [(180, 726)], 'highKick0': [(247, 710)], 'follow0': [(312, 720)],
    # band 11: reaction candidates beside the credit panel
    'react0': [(1, 815)], 'react1': [(58, 816)], 'react2': [(121, 816)], 'react3': [(171, 832)],
    # band 12: stagger, fall, on-back, prone, legs-over roll, sit-up recovery
    'down0': [(4, 896)], 'down1': [(51, 901)], 'down2': [(107, 902)], 'down3': [(173, 915)], 'down4': [(250, 892)], 'down5': [(329, 901)],
}
BLACK_CREDIT = (266, 815)

FALCON = {
    # row 1: wing positions / banked flight (approach, turn, exit)
    'fly0': [(4, 3)], 'fly1': [(80, 6)], 'bank0': [(160, 4)], 'bank1': [(262, 7)],
    # row 2: front-facing compact pose; two beak-lightning (electrical) poses
    'front0': [(7, 88)], 'zap0': [(67, 83)], 'zap1': [(166, 81)],
    # row 3: talons-forward, bright golden dive/energy pose, three wing-forward thrust poses, two capsule shots
    'talon0': [(7, 158)], 'energy0': [(73, 156)], 'thrust0': [(144, 171)], 'thrust1': [(230, 168)], 'thrust2': [(312, 166)],
    'shot0': [(395, 198)], 'shot1': [(391, 202)],
    # row 4: rising on twin jet flames, committed dive, white/yellow impact burst
    'jet0': [(10, 242)], 'dive0': [(100, 254)], 'impact0': [(185, 276)],
    # row 5: horizontal flight strip (sweep traversal)
    'sweep0': [(9, 347)], 'sweep1': [(81, 341)], 'sweep2': [(156, 342)], 'sweep3': [(228, 346)], 'sweep4': [(312, 346)],
    # row 6: banked wing, golden horizontal energy streak, golden horizontal flight
    'glide0': [(5, 390)], 'streak0': [(81, 399)], 'goldFly0': [(215, 402)],
    # row 7: front-facing compact, three compact horizontal poses (inspected: flight / recovery tuck)
    'front1': [(9, 460)], 'tuck0': [(86, 482)], 'tuck1': [(157, 476)], 'tuck2': [(233, 469)],
}
FALCON_CREDIT = (305, 463)

# Body origin overrides (cell px). Default = centre of the darkest suit pixels in the lowest six rows (planted foot)
# for grounded poses; airborne/rotation poses use the bottom-centre of the dark-pixel box.
AIRBORNE = {'rise1', 'rise2', 'tuck0', 'roll0', 'roll1', 'roll2', 'flyKick0', 'acro1', 'acro2', 'jumpKick0', 'reach0', 'down4'}
# Trail-bearing frames whose trail reaches the floor: the anchor uses suit pixels only (outline/suit/visor), never FX.
SUIT = {0, 5, 6, 17, 19, 50}        # visor, outline, suit ramp (indices on the Black sheet palette)


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def label(path):
    im = Image.open(path)
    t = im.info['transparency']
    a = np.array(im)
    lab, n = ndimage.label(a != t, structure=np.ones((3, 3)))
    comps = {}
    for i, sl in enumerate(ndimage.find_objects(lab)):
        ys, xs = sl
        comps[(xs.start, ys.start)] = (i + 1, xs.start, ys.start, xs.stop - xs.start, ys.stop - ys.start)
    return im, a, t, lab, comps


def cut(im, a, t, lab, comps, parts):
    ids = [comps[p][0] for p in parts]
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rgba = np.array(im.convert('RGBA'))[y0:y1, x0:x1].copy()
    rgba[~m[y0:y1, x0:x1]] = 0
    return Image.fromarray(rgba, 'RGBA'), [int(x0), int(y0), int(x1 - x0), int(y1 - y0)], a[y0:y1, x0:x1], m[y0:y1, x0:x1]


def body_anchor(name, idx, mask):
    suit = np.isin(idx, list(SUIT)) & mask
    ys, xs = np.where(suit)
    if name in AIRBORNE:
        return [int(round((xs.min() + xs.max()) / 2)), int(ys.max() + 1)]
    bottom = ys.max()
    sel = ys >= bottom - 5
    return [int(round(xs[sel].mean())), int(bottom + 1)]


def check_all_assigned(comps, table, credit, sheet):
    used = [p for v in table.values() for p in v] + [credit]
    assert len(used) == len(set(used)), f'{sheet}: a component is assigned twice'
    missing = set(comps) - set(used)
    extra = set(used) - set(comps)
    assert not missing and not extra, (sheet, 'unassigned', sorted(missing), 'unknown', sorted(extra))


def contact(cells, frames, path, S=3, per=8, title=''):
    colw = max(c['rect'][2] for c in cells) * S + 14
    rowh = max(c['rect'][3] for c in cells) * S + 34
    rows = (len(cells) + per - 1) // per
    img = Image.new('RGB', (per * colw, rows * rowh + 24), (38, 43, 54))
    d = ImageDraw.Draw(img)
    d.text((6, 6), title, fill='white')
    for i, c in enumerate(cells):
        x = i % per * colw; y = 24 + i // per * rowh
        d.text((x + 4, y + 3), f"#{i} {c['name']} {c['rect']}", fill='white')
        im = frames[c['name']]
        big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        bg = Image.new('RGB', big.size, (92, 128, 104) if i % 2 else (72, 92, 128))
        bg.paste(big, (0, 0), big)
        img.paste(bg, (x + 4, y + 18))
        ax, ay = c['anchor']
        cx, cy = x + 4 + ax * S, y + 18 + ay * S
        d.line([cx - 6, cy, cx + 6, cy], fill=(255, 60, 60)); d.line([cx, cy - 6, cx, cy + 6], fill=(255, 60, 60))
    img.save(path)


# Action strips (engine animation names) → ordered cells. Rationale per action in MOVE_FRAME_MAP.md.
SEQ = {
    'idle': ['ready0', 'ready1', 'ready2', 'ready1'], 'walk': ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5'],
    'walk_back': ['walk5', 'walk4', 'walk3', 'walk2', 'walk1', 'walk0'], 'run': ['run0', 'run1', 'run2', 'run3', 'run4', 'run5'],
    'dash': ['run4'], 'jump': ['reach0', 'tuck0', 'roll0', 'roll1', 'roll2'], 'fall': ['rise2'], 'crouch': ['crouch0'], 'guard': ['react2'],
    'hurt': ['react0'], 'hurt2': ['react3'], 'knockdown': ['down1', 'down2', 'down3'], 'getup': ['down5', 'set0', 'ready0'],
    'stagger': ['down0'], 'launched': ['down4'],
    # J1 / J2 / J3 (fresh Light retaps)
    'light': ['punch0', 'punch1'], 'bJ2': ['punch2', 'punch3', 'punch4'], 'bJ3': ['kick2', 'kick4'],
    # Heavy, Low, Launcher, Air
    'heavy': ['kick2', 'kick3', 'kick5'], 'bLow': ['set0', 'spinKick0'], 'up': ['set0', 'highKick0', 'follow0'],
    'air': ['tuck0', 'flyKick0'], 'down_air': ['flyKick0'],
    # Forward+Heavy command chain: advancing palm → turning kick → knock-away; confirmed Up+Heavy → launcher (up)
    'bPalm': ['punch3', 'punch4'], 'bTurn': ['kick1', 'kick3'], 'bAway': ['acro0', 'acro2'],
    # specials
    'bCrescent': ['kick1', 'kick3', 'kick4', 'spinKick0', 'follow0'],
    'bRising': ['set0', 'riseStrike0', 'jumpKick0'],
    'bCall': ['rise0', 'ready2'],                  # visible call commit: raised-arm signal → ready
    'grab': ['punch0', 'react1'],
    # ultimate beats
    'ultOpen': ['run4', 'punch4'], 'ultLow': ['acro3', 'set0'], 'ultRise': ['jumpKick0', 'highKick0'],
    'ultLand': ['follow0', 'rise0'],
    # presentation
    'intro': ['acro1', 'acro2', 'set0', 'ready0'], 'win': ['rise0'], 'lose': ['down1', 'down2', 'down3'],
    # double-tap blink (rangers.js): the supplied low dive is the travel afterimage
    'blink': ['acro3'],
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard'}

# Falconzord render cells used by falconzord.js (anchor = wing-root / torso centre, see falcon_anchor()).
ZSEQ = {
    'approach': ['fly0', 'fly1'], 'turn': ['bank0', 'bank1'], 'sweep': ['sweep0', 'sweep1', 'sweep2', 'sweep3', 'sweep4'],
    'zap': ['zap0', 'zap1'], 'talon': ['talon0'], 'dive': ['dive0'], 'rise': ['jet0'], 'thrust': ['thrust0', 'thrust1', 'thrust2'],
    'energy': ['energy0'], 'streak': ['streak0'], 'goldFly': ['goldFly0'], 'glide': ['glide0'],
    'shot': ['shot0', 'shot1'], 'impact': ['impact0'], 'front': ['front0', 'front1'], 'tuck': ['tuck0', 'tuck1', 'tuck2'],
}
# Facing of each Falconzord cell as drawn (+1 = head to the right). Measured on the contact sheet: the banking/thrust
# poses are drawn heading LEFT (red wing thrusters trail to the right). The renderer mirrors by travel direction.
ZFACE = {n: -1 for n in ('bank0', 'bank1', 'thrust0', 'thrust1', 'thrust2', 'dive0')}
# Torso / wing-root anchors (cell px). Measured on the enlarged contact sheet: the point where the wing meets the
# body (the dark neck/shoulder joint), NOT the wing tips, so frames do not jump when the wing pose changes.
ZANCHOR = {
    'fly0': (44, 38), 'fly1': (48, 34), 'bank0': (40, 30), 'bank1': (32, 26), 'front0': (26, 30), 'zap0': (56, 34), 'zap1': (52, 32),
    'talon0': (34, 34), 'energy0': (38, 40), 'thrust0': (34, 22), 'thrust1': (24, 26), 'thrust2': (22, 26),
    'jet0': (36, 30), 'dive0': (30, 26), 'sweep0': (36, 18), 'sweep1': (36, 18), 'sweep2': (36, 18), 'sweep3': (36, 18), 'sweep4': (34, 18),
    'glide0': (32, 30), 'streak0': (88, 26), 'goldFly0': (36, 20), 'front1': (32, 34), 'tuck0': (32, 12), 'tuck1': (32, 14), 'tuck2': (32, 16),
}


def main():
    assert sha(BSRC) == BSHA, 'Black sheet hash changed'
    assert sha(ZSRC) == ZSHA, 'Falconzord sheet hash changed'
    out = {}
    # ── Black Ranger ──
    im, a, t, lab, comps = label(BSRC)
    assert im.size == (396, 970) and im.mode == 'P' and t == 74
    check_all_assigned(comps, BLACK, BLACK_CREDIT, 'black')
    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    frames, cells = {}, []
    for name, parts in BLACK.items():
        img, rect, idx, mask = cut(im, a, t, lab, comps, parts)
        anc = body_anchor(name, idx, mask)
        frames[name] = img
        img.save(OUT / 'cells' / f'{name}.png')
        cells.append(dict(name=name, rect=rect, parts=[list(p) for p in parts], anchor=anc,
                          opaquePixels=int(mask.sum()), kind='body'))
    # duplicate detection (pixel-identical cells)
    dup = {}
    for i, c in enumerate(cells):
        for c2 in cells[:i]:
            if frames[c['name']].tobytes() == frames[c2['name']].tobytes():
                dup[c['name']] = c2['name']
    cx, cy, cw, ch = comps[BLACK_CREDIT][1:]
    im.convert('RGBA').crop((cx, cy, cx + cw, cy + ch)).save(OUT / 'credit_panel.png')
    by = {c['name']: c for c in cells}
    anim = {}
    for action, names in SEQ.items():
        strip = Image.new('RGBA', (FW * len(names), FH))
        for i, n in enumerate(names):
            ax, ay = by[n]['anchor']
            assert OX - ax >= 0 and OX - ax + frames[n].width <= FW and OY - ay >= 0 and OY - ay + frames[n].height <= FH, ('frame overflow', action, n)
            strip.paste(frames[n], (FW * i + OX - ax, OY - ay))
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/mmpr_black/{action}.png', 'frames': len(names), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': 8,
                        'frameWidth': FW, 'frameHeight': FH}
    used = {n for v in SEQ.values() for n in v}
    for c in cells:
        c['usedIn'] = sorted(k for k, v in SEQ.items() if c['name'] in v)
    # portrait: helmet + shoulders of ready0, x4 nearest-neighbour (head measured at x13-33, y0-18 on the contact sheet)
    frames['ready0'].crop((8, 0, 38, 30)).resize((120, 120), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    (ROOT / 'mmprBlackSprites.js').write_text('// Generated by tools/mmpr_black/extract.py — do not hand-edit.\nexport const MMPR_BLACK_ANIM = '
                                             + json.dumps(anim, indent=1) + '\n')
    out['black'] = dict(cells=len(cells), duplicates=dup, unused=[c['name'] for c in cells if c['name'] not in used])
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': BSRC.name, 'sha256': BSHA, 'size': [396, 970], 'mode': 'P', 'transparencyIndex': 74,
        'keyPolicy': 'GIF transparency index 74 only; every opaque pixel (incl. outline (32,32,0), visor (0,0,0), black suit) is kept',
        'credit': CREDIT_TEXT, 'creditPanel': [cx, cy, cw, ch],
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY},
        'cells': cells, 'sequences': SEQ, 'duplicates': dup, 'unusedCells': out['black']['unused']}, indent=1) + '\n')
    contact(cells, frames, DOC / 'contact_sheet.png', title='Black Ranger (mmpr_black) — numbered cells; red cross = body anchor (feet)')

    # ── Falconzord (shared) ──
    im, a, t, lab, comps = label(ZSRC)
    assert im.size == (410, 532) and im.mode == 'P' and t == 76
    check_all_assigned(comps, FALCON, FALCON_CREDIT, 'falcon')
    (ZOUT / 'cells').mkdir(parents=True, exist_ok=True)
    zf, zc = {}, []
    for name, parts in FALCON.items():
        img, rect, idx, mask = cut(im, a, t, lab, comps, parts)
        anc = list(ZANCHOR.get(name, (img.width // 2, img.height // 2)))
        assert 0 <= anc[0] <= img.width and 0 <= anc[1] <= img.height, (name, anc, img.size)
        zf[name] = img
        img.save(ZOUT / 'cells' / f'{name}.png')
        zc.append(dict(name=name, rect=rect, parts=[list(p) for p in parts], anchor=anc, opaquePixels=int(mask.sum()),
                       kind='fx' if name in ('shot0', 'shot1', 'impact0') else 'body'))
    zx, zy, zw, zh = comps[FALCON_CREDIT][1:]
    im.convert('RGBA').crop((zx, zy, zx + zw, zy + zh)).save(ZOUT / 'credit_panel.png')
    zused = {n for v in ZSEQ.values() for n in v}
    for c in zc:
        c['usedIn'] = sorted(k for k, v in ZSEQ.items() if c['name'] in v)
    zcells = {c['name']: {'src': f'./assets/power_rangers/falconzord/cells/{c["name"]}.png', 'w': c['rect'][2], 'h': c['rect'][3],
                          'ax': c['anchor'][0], 'ay': c['anchor'][1], 'face': ZFACE.get(c['name'], 1)} for c in zc}
    (ROOT / 'falconzordSprites.js').write_text('// Generated by tools/mmpr_black/extract.py — do not hand-edit. Shared Falconzord art (one cache for every owner).\n'
                                              'export const FALCON_CELLS = ' + json.dumps(zcells, indent=1) + '\nexport const FALCON_SEQ = ' + json.dumps(ZSEQ) + '\n')
    ZDOC.mkdir(parents=True, exist_ok=True)
    (ZDOC / 'source_rects.json').write_text(json.dumps({
        'source': ZSRC.name, 'sha256': ZSHA, 'size': [410, 532], 'mode': 'P', 'transparencyIndex': 76,
        'keyPolicy': 'GIF transparency index 76 only', 'credit': CREDIT_TEXT, 'creditPanel': [zx, zy, zw, zh],
        'cells': zc, 'sequences': ZSEQ, 'unusedCells': [c['name'] for c in zc if c['name'] not in zused]}, indent=1) + '\n')
    contact(zc, zf, ZDOC / 'contact_sheet.png', S=2, per=6, title='Falconzord (shared) — numbered cells; red cross = torso / wing-root anchor')
    out['falcon'] = dict(cells=len(zc), unused=[c['name'] for c in zc if c['name'] not in zused])
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
