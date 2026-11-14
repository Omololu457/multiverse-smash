#!/usr/bin/env python3
"""MMPR Pink Ranger (Kimberly Hart, MMPR: The Movie Genesis sheet) + shared Thunder Megazord extraction.

Sources are READ-ONLY and hash-checked; they are never written.
Background policy: only the GIF transparency index is removed (Pink: index 62, Thunder: index 0). Opaque black
pixels (Pink outline (32,0,32) / (0,0,0); Thunder index 15 = opaque (0,0,0) outline) are KEPT. No tolerance, no
colour key, nearest-neighbour only, no generated or borrowed pixels.

FRAMES ARE COMPONENT UNIONS: every 8-connected opaque component of each sheet is assigned to exactly one named cell
or to the credit panel. The script asserts that nothing is unassigned and nothing is assigned twice, so a changed
source fails loudly. Cell names describe the OBSERVED pose; the action mapping is docs/mmpr_pink/MOVE_FRAME_MAP.md.

Usage: python3 tools/mmpr_pink/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/mmpr_pink'
ZDOC = ROOT / 'docs/power_rangers/thunder_megazord'
OUT = ROOT / 'assets/mmpr_pink'
ZOUT = ROOT / 'assets/power_rangers/thunder_megazord'
PSRC = ROOT / 'Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Rangers - Pink Ranger.gif'
ZSRC = ROOT / 'Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Zords - Thunder Megazord.gif'
PSHA = 'a5c35f2558b9981ba889cb355acfe769b3ef4fcda8062095111947faeb850168'
ZSHA = 'f6f8eaecaa6e051b46f874fbb872517516e419489e3e89e7b3ba30598fcc9060'
# Exact visible wording (transcribed from the enlarged sheets; line breaks as drawn).
PINK_CREDIT_TEXT = 'Sprites (shamefully) ripped by Belial.'
THUNDER_CREDIT_TEXT = 'Sprites Ripped by Belial'

# Pink strips: frame box + body origin (feet). Wide enough for the drawn bow (65 px) and the sweep trail (83 px).
FW, FH, OX, OY = 176, 128, 88, 118

PINK = {
    # band 1: three ready poses, then compact crouch, raised-arm leap, rising, raised-arm airborne gesture
    'ready0': [(2, 6)], 'ready1': [(48, 5)], 'ready2': [(94, 7)],
    'crouch0': [(180, 15)], 'raise0': [(228, 2)], 'rise0': [(272, 14)], 'rise1': [(329, 9)],
    # band 2: walk (six poses)
    'walk0': [(3, 84)], 'walk1': [(47, 81)], 'walk2': [(89, 83)], 'walk3': [(118, 85)], 'walk4': [(164, 83)], 'walk5': [(202, 84)],
    # band 3: run (six poses)
    'run0': [(2, 167)], 'run1': [(46, 167)], 'run2': [(102, 167)], 'run3': [(137, 168)], 'run4': [(185, 163)], 'run5': [(248, 168)],
    # band 4: vertical reach, leap, tuck, two rotations, horizontal extended kick
    'reach0': [(2, 245)], 'leap0': [(47, 255)], 'tuck0': [(102, 263)], 'roll0': [(144, 258)], 'roll1': [(194, 258)], 'flyKick0': [(247, 248)],
    # band 5: low set, rising kick (1-px speck = its trail), airborne kicks with authored crescent trails
    'set0': [(5, 342)], 'riseKick0': [(60, 313), (96, 367)], 'crescent0': [(109, 316)], 'crescent1': [(172, 318)],
    'crescent2': [(242, 308)], 'crescent3': [(304, 313)],
    # band 6: grounded punch / extension sequence
    'punch0': [(3, 400)], 'punch1': [(54, 401)], 'punch2': [(121, 400)], 'punch3': [(177, 399)], 'punch4': [(231, 406)],
    # band 7: grounded kick sequence (kick3 carries a detached 8x8 trail tip; kick4 = low kick with a floor-level trail)
    'kick0': [(3, 478)], 'kick1': [(58, 479)], 'kick2': [(106, 476)], 'kick3': [(168, 477), (197, 495)], 'kick4': [(234, 479)], 'kick5': [(293, 479)],
    # band 8: compact low stance, forward palm thrust with hand trail, LONG-WEAPON upward thrust (both feet planted; the
    #         long pointed shaft is held in both hands: NOT identified as the bow or a leg → unused), backward rotation
    #         with crescent (detached trail piece), handstand rotation, low horizontal dive
    'low0': [(8, 586)], 'thrust0': [(42, 583)], 'staff0': [(114, 554)], 'cart0': [(205, 570), (254, 580)], 'hand0': [(294, 567)], 'dive0': [(370, 587)],
    # band 9: the dedicated Power Bow sequence (preparation, draw, aim, release) and the separate yellow arrow
    'bow0': [(1, 663)], 'bow1': [(60, 658)], 'bow2': [(136, 653)], 'bow3': [(209, 653)], 'arrow0': [(278, 671)],
    # band 10: extended aerial rotation / jump poses
    'air0': [(2, 743)], 'air1': [(59, 751)], 'air2': [(110, 757)], 'air3': [(172, 753)], 'air4': [(225, 755)], 'air5': [(316, 750)], 'air6': [(384, 749)],
    # band 11: guard / flinch / recoil candidates beside the credit panel
    'react0': [(5, 837)], 'react1': [(70, 838)], 'react2': [(131, 838)], 'react3': [(183, 855)],
    # band 12: stagger, fall, prone, get-up
    'down0': [(8, 927)], 'down1': [(54, 919)], 'down2': [(98, 926)], 'down3': [(157, 928)], 'down4': [(234, 896)], 'down5': [(226, 953)], 'down6': [(311, 932)],
}
PINK_CREDIT = [(286, 834)]

THUNDER = {
    # row 1: ready / guarded sword poses
    'ready0': [(3, 2)], 'ready1': [(63, 2)], 'draw0': [(129, 3)], 'guard0': [(219, 3)],
    # row 2: walking / stepping, sword ready
    'walk0': [(2, 94)], 'walk1': [(67, 100)], 'walk2': [(128, 99)], 'walk3': [(188, 98)], 'walk4': [(250, 98)], 'walk5': [(315, 101)],
    # row 3: large wind-up (lightning blade), raised wind-up, horizontal attack with supplied arc
    'windup0': [(4, 212), (3, 221), (25, 243)], 'raise0': [(119, 191)], 'hslash0': [(219, 205)],
    # row 4: lunge, low sword, rising slash with arc, overhead
    'lunge0': [(5, 324)], 'low0': [(120, 326)], 'rslash0': [(196, 298)], 'over0': [(330, 295), (374, 296)],
    # row 5: front pose, sword back, forward thrust, rising slash with arc, raised sword
    'front0': [(5, 419)], 'back0': [(82, 410)], 'thrust0': [(159, 420), (229, 483)], 'rslash1': [(259, 404)], 'over1': [(361, 405), (402, 406)],
    # row 6: descending slash with arc, broad low sweep with arc, front ready, braced
    'dslash0': [(1, 520), (57, 528), (59, 529)], 'sweep0': [(84, 538)], 'ready2': [(173, 529)], 'brace0': [(260, 521)],
    # row 7: falling, prone (two parts drawn as one stacked pair), kneeling recovery, compact, braced stand
    'fall0': [(6, 643)], 'prone0': [(102, 624)], 'prone1': [(103, 668)], 'kneel0': [(194, 637)], 'kneel1': [(281, 628)], 'brace1': [(345, 618)],
}
THUNDER_CREDIT_Y = 713   # every component starting at y >= 713 is a glyph of the credit line

PINK_AIRBORNE = {'raise0', 'rise1', 'reach0', 'leap0', 'tuck0', 'roll0', 'roll1', 'flyKick0', 'riseKick0', 'crescent0', 'crescent1',
                 'crescent2', 'cart0', 'hand0', 'dive0', 'air0', 'air1', 'air2', 'air3', 'air4', 'air5', 'air6', 'down4'}
# Suit pixels used for anchors (never trail / arrow FX): outline, dark/mid/light pink, boot outline.
PINK_SUIT = {6, 7, 38, 42, 54}
PINK_FX = {'arrow0'}


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


def cut(im, a, lab, comps, parts):
    ids = [comps[p][0] for p in parts]
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rgba = np.array(im.convert('RGBA'))[y0:y1, x0:x1].copy()
    rgba[~m[y0:y1, x0:x1]] = 0
    return Image.fromarray(rgba, 'RGBA'), [int(x0), int(y0), int(x1 - x0), int(y1 - y0)], a[y0:y1, x0:x1], m[y0:y1, x0:x1]


def check_all_assigned(comps, used, sheet):
    assert len(used) == len(set(used)), f'{sheet}: a component is assigned twice'
    missing, extra = set(comps) - set(used), set(used) - set(comps)
    assert not missing and not extra, (sheet, 'unassigned', sorted(missing), 'unknown', sorted(extra))


def pink_anchor(name, idx, mask):
    if name in PINK_FX:
        return [0, int(idx.shape[0] // 2)]
    suit = np.isin(idx, list(PINK_SUIT)) & mask
    ys, xs = np.where(suit)
    if name in PINK_AIRBORNE:
        return [int(round((xs.min() + xs.max()) / 2)), int(ys.max() + 1)]
    bottom = ys.max()
    sel = ys >= bottom - 5
    return [int(round(xs[sel].mean())), int(bottom + 1)]


def contact(cells, frames, path, S=3, per=8, title='', cross=True):
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
        if cross:
            ax, ay = c['anchor']
            cx, cy = x + 4 + ax * S, y + 18 + ay * S
            d.line([cx - 6, cy, cx + 6, cy], fill=(255, 60, 60)); d.line([cx, cy - 6, cx, cy + 6], fill=(255, 60, 60))
    img.save(path)


# ── Action strips (engine animation names) → ordered cells. Rationale per action in MOVE_FRAME_MAP.md ──
SEQ = {
    'idle': ['ready0', 'ready1', 'ready2', 'ready1'], 'walk': ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5'],
    'walk_back': ['walk5', 'walk4', 'walk3', 'walk2', 'walk1', 'walk0'], 'run': ['run0', 'run1', 'run2', 'run3', 'run4', 'run5'],
    'dash': ['run4'], 'jump': ['reach0', 'leap0', 'tuck0', 'roll0', 'roll1'], 'fall': ['air5'], 'crouch': ['low0'], 'guard': ['react0'],
    'hurt': ['react1'], 'hurt2': ['react3'], 'knockdown': ['down1', 'down2', 'down3'], 'getup': ['down6', 'crouch0', 'ready0'],
    'stagger': ['down0'], 'launched': ['down4'],
    # J1 Palm Snap (punch extension) / J2 Turning Check (turned wind-up → long reach) / J3 Crescent Finish (supplied trail)
    'light': ['punch0', 'punch1'], 'pJ2': ['punch2', 'punch4'], 'pJ3': ['kick2', 'kick3', 'kick5'],
    # Heavy High Crescent (big supplied crescent), Low Sliding Sweep (low kick with floor trail), Launcher Rising Heel,
    # Air Flying Heel
    'heavy': ['kick1', 'crescent2', 'kick0'], 'pLow': ['low0', 'kick4'], 'up': ['set0', 'riseKick0', 'rise0'],
    'air': ['tuck0', 'flyKick0'], 'down_air': ['flyKick0'],
    # Forward+Heavy chain: advancing palm → fresh Heavy kick → fresh Heavy knock-away (palm thrust with hand trail)
    'pPalm': ['punch2', 'punch3'], 'pKick': ['kick1', 'crescent1'], 'pAway': ['punch3', 'thrust0'],
    # Power Bow: preparation, draw, aim (held), release
    'bow': ['bow0', 'bow1', 'bow2', 'bow3'],
    # Assist call (radio signal: raised arm) and Crane Escape (backward rotation)
    'pCall': ['crouch0', 'raise0', 'ready2'], 'pCrane': ['cart0', 'hand0', 'crouch0'],
    # ultimate beats
    'ultOpen': ['bow0', 'bow1', 'bow2', 'bow3'], 'ultKick': ['leap0', 'crescent0', 'flyKick0'], 'ultLand': ['crouch0', 'ready0'],
    # presentation
    'intro': ['air1', 'air2', 'air3', 'crouch0', 'bow0'], 'win': ['bow3', 'raise0'], 'lose': ['down0', 'down1', 'down2', 'down3'],
    'blink': ['dive0'],
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard'}

# Thunder Megazord render sequences (shared; consumed by thunderMegazord.js render + any future owner).
ZSEQ = {
    'ready': ['ready0'], 'step': ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5'], 'guard': ['guard0'],
    'hwind': ['draw0'], 'hslash': ['hslash0'],                   # Thunder Line: sword drawn back → horizontal cut
    'uwind': ['low0'], 'uslash': ['rslash0', 'rslash1'],         # Sky Splitter: low sword → two rising slashes
    'dwind': ['over1', 'over0'], 'dtop': ['dslash0'], 'dslash': ['sweep0'],   # Returning Edge: raised → top arc → descending arc
    'thrust': ['thrust0'], 'uwindL': ['windup0'], 'raise': ['raise0'],         # ultimate: lightning blade wind-up / lift
    'brace': ['brace0', 'brace1'], 'exit': ['brace1'],
}
# Facing as drawn (+1 = right), measured on the contact sheet: every attack/step cell strikes or steps to the RIGHT.
# guard0 turns its back and raises the sword to the upper LEFT (unused).
ZFACE = {'guard0': -1}


def main():
    assert sha(PSRC) == PSHA, 'Pink sheet hash changed'
    assert sha(ZSRC) == ZSHA, 'Thunder Megazord sheet hash changed'
    out = {}
    # ── Pink Ranger ──
    im, a, t, lab, comps = label(PSRC)
    assert im.size == (460, 996) and im.mode == 'P' and t == 62
    check_all_assigned(comps, [p for v in PINK.values() for p in v] + PINK_CREDIT, 'pink')
    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    frames, cells = {}, []
    for name, parts in PINK.items():
        img, rect, idx, mask = cut(im, a, lab, comps, parts)
        frames[name] = img
        img.save(OUT / 'cells' / f'{name}.png')
        cells.append(dict(name=name, rect=rect, parts=[list(p) for p in parts], anchor=pink_anchor(name, idx, mask),
                          opaquePixels=int(mask.sum()), kind='fx' if name in PINK_FX else 'body'))
    dup = {}
    for i, c in enumerate(cells):
        for c2 in cells[:i]:
            if frames[c['name']].tobytes() == frames[c2['name']].tobytes():
                dup[c['name']] = c2['name']
    cx, cy, cw, ch = comps[PINK_CREDIT[0]][1:]
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
        anim[action] = {'sheet': f'./assets/mmpr_pink/{action}.png', 'frames': len(names), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': 8,
                        'frameWidth': FW, 'frameHeight': FH}
    used = {n for v in SEQ.values() for n in v}
    for c in cells:
        c['usedIn'] = sorted(k for k, v in SEQ.items() if c['name'] in v)
    # arrow: the supplied yellow arrow, used as the projectile art (only FX cell)
    frames['arrow0'].save(OUT / 'arrow.png')
    frames['ready0'].crop((10, 0, 40, 30)).resize((120, 120), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    arrow = by['arrow0']['rect']
    (ROOT / 'mmprPinkSprites.js').write_text('// Generated by tools/mmpr_pink/extract.py — do not hand-edit.\nexport const MMPR_PINK_ANIM = '
                                            + json.dumps(anim, indent=1) + '\nexport const MMPR_PINK_ARROW = '
                                            + json.dumps({'src': './assets/mmpr_pink/arrow.png', 'w': arrow[2], 'h': arrow[3]}) + '\n')
    out['pink'] = dict(cells=len(cells), duplicates=dup, unused=[c['name'] for c in cells if c['name'] not in used])
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': PSRC.name, 'sha256': PSHA, 'size': [460, 996], 'mode': 'P', 'transparencyIndex': 62,
        'keyPolicy': 'GIF transparency index 62 only; every opaque pixel (incl. (0,0,0) index 0 and outline (32,0,32)) is kept',
        'credit': PINK_CREDIT_TEXT, 'creditPanel': [cx, cy, cw, ch],
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY},
        'cells': cells, 'sequences': SEQ, 'duplicates': dup, 'unusedCells': out['pink']['unused']}, indent=1) + '\n')
    contact(cells, frames, DOC / 'contact_sheet.png', title='Pink Ranger (mmpr_pink) — numbered cells; red cross = body anchor (feet)')

    # ── Thunder Megazord (shared) ──
    im, a, t, lab, comps = label(ZSRC)
    assert im.size == (410, 740) and im.mode == 'P' and t == 0
    credit = [k for k in comps if k[1] >= THUNDER_CREDIT_Y]
    check_all_assigned(comps, [p for v in THUNDER.values() for p in v] + credit, 'thunder')
    (ZOUT / 'cells').mkdir(parents=True, exist_ok=True)
    zf, zc = {}, []
    for name, parts in THUNDER.items():
        img, rect, idx, mask = cut(im, a, lab, comps, parts)
        anc = list(ZANCHOR.get(name) or feet_anchor(mask))
        assert 0 <= anc[0] <= img.width and 0 <= anc[1] <= img.height, (name, anc, img.size)
        zf[name] = img
        img.save(ZOUT / 'cells' / f'{name}.png')
        zc.append(dict(name=name, rect=rect, parts=[list(p) for p in parts], anchor=anc, opaquePixels=int(mask.sum()),
                       face=ZFACE.get(name, 1), kind='body'))
    xs0 = min(comps[k][1] for k in credit); ys0 = min(comps[k][2] for k in credit)
    xs1 = max(comps[k][1] + comps[k][3] for k in credit); ys1 = max(comps[k][2] + comps[k][4] for k in credit)
    im.convert('RGBA').crop((xs0, ys0, xs1, ys1)).save(ZOUT / 'credit_panel.png')
    zused = {n for v in ZSEQ.values() for n in v}
    for c in zc:
        c['usedIn'] = sorted(k for k, v in ZSEQ.items() if c['name'] in v)
    zcells = {c['name']: {'src': f'./assets/power_rangers/thunder_megazord/cells/{c["name"]}.png', 'w': c['rect'][2], 'h': c['rect'][3],
                          'ax': c['anchor'][0], 'ay': c['anchor'][1], 'face': c['face']} for c in zc}
    (ROOT / 'thunderMegazordSprites.js').write_text('// Generated by tools/mmpr_pink/extract.py — do not hand-edit. Shared Thunder Megazord art (one cache for every owner).\n'
                                                   'export const THUNDER_CELLS = ' + json.dumps(zcells, indent=1) + '\nexport const THUNDER_SEQ = ' + json.dumps(ZSEQ) + '\n')
    ZDOC.mkdir(parents=True, exist_ok=True)
    (ZDOC / 'source_rects.json').write_text(json.dumps({
        'source': ZSRC.name, 'sha256': ZSHA, 'size': [410, 740], 'mode': 'P', 'transparencyIndex': 0,
        'keyPolicy': 'GIF transparency index 0 only; index 15 (also RGB 0,0,0) is the opaque outline and is kept',
        'credit': THUNDER_CREDIT_TEXT, 'creditBox': [xs0, ys0, xs1 - xs0, ys1 - ys0], 'creditGlyphComponents': len(credit),
        'cells': zc, 'sequences': ZSEQ, 'unusedCells': [c['name'] for c in zc if c['name'] not in zused]}, indent=1) + '\n')
    contact(zc, zf, ZDOC / 'contact_sheet.png', S=2, per=6, title='Thunder Megazord (shared) — numbered cells; red cross = feet anchor; face +1 = right')
    out['thunder'] = dict(cells=len(zc), unused=[c['name'] for c in zc if c['name'] not in zused])
    print(json.dumps(out, indent=1))


# Thunder feet anchors (cell px): centre between the planted feet, bottom row. Measured on the enlarged contact sheet.
ZANCHOR = {}

def feet_anchor(mask):
    ys, xs = np.where(mask)
    sel = ys >= ys.max() - 5
    return [int(round(xs[sel].mean())), int(ys.max() + 1)]


if __name__ == '__main__':
    main()
