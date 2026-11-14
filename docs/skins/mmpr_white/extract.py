#!/usr/bin/env python3
"""White Ranger (Tommy Oliver, MMPR movie Genesis sheet) + shared Ninja Megazord extraction.

Sources are READ-ONLY. Both are hash-checked and never written.
Background policy: the GIF transparency index (74 on both sheets, palette colour (0,0,0)) is the only thing removed.
Opaque black (palette index 0, e.g. the visor / chest-shield shading) and the (32,32,32) outline are kept. No tolerance,
no colour keying, nearest-neighbour only.

FRAMES ARE COMPONENT UNIONS. Every 8-connected opaque component on each sheet is assigned to exactly one named cell
(or to the credit panel). Detached trail pieces / specks are listed explicitly with the pose they belong to. The
script asserts that no component is unassigned and none is assigned twice, so a changed source fails loudly.
Cell names describe the OBSERVED pose (enlarged inspection); the action mapping is in docs/mmpr_white/MOVE_FRAME_MAP.md.

Usage: python3 tools/mmpr_white/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/mmpr_white'
ZDOC = ROOT / 'docs/power_rangers/ninja_megazord'
OUT = ROOT / 'assets/mmpr_white'
ZOUT = ROOT / 'assets/power_rangers/ninja_megazord'
WSRC = ROOT / 'Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Rangers - White Ranger.gif'
ZSRC = ROOT / 'Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Zords - Ninja Megazord.gif'
WSHA = '833beb9a16c40ef5'   # prefix check (full digest recorded in source_rects.json)
ZSHA = '80a82b068706eadb'
CREDIT_TEXT = 'Sprites ripped by Belial the Hedgehog.'
ZCREDIT_TEXT = 'Sprites ripped by Belial'   # the Megazord panel is narrower: the visible text stops at "Belial"

# White strips: frame box + body origin (feet). Large enough for the widest frame (sabaWind0 85 px, cart0 83 px).
FW, FH, OX, OY = 208, 128, 104, 118

WHITE = {
    # band 1: three ready poses (subtle breathing)
    'ready0': [(2, 2)], 'ready1': [(47, 1)], 'ready2': [(94, 1)],
    # band 2: six walking poses
    'walk0': [(1, 83)], 'walk1': [(44, 80)], 'walk2': [(88, 78)], 'walk3': [(118, 79)], 'walk4': [(161, 78)], 'walk5': [(198, 77)],
    # band 3: six running poses
    'run0': [(1, 162)], 'run1': [(49, 160)], 'run2': [(103, 161)], 'run3': [(138, 159)], 'run4': [(185, 159)], 'run5': [(248, 162)],
    # band 4: low crouch, then the airborne kicks with gold/white trails. riseKick0 carries a detached 1-px trail speck.
    'crouch0': [(7, 264)], 'riseKick0': [(60, 235), (96, 289)], 'highKick0': [(111, 241)], 'airKick0': [(176, 245)],
    'flipKick0': [(247, 234)], 'trailLand0': [(313, 243)],
    # band 5: grounded punch / extension sequence
    'punch0': [(5, 329)], 'punch1': [(68, 326)], 'punch2': [(122, 325)], 'step0': [(178, 325)], 'lunge0': [(234, 330)],
    # band 6: grounded kick sequence (frontKick0 has a detached 8x8 trail tip)
    'stance0': [(3, 408)], 'turn0': [(61, 408)], 'pivot0': [(108, 406)], 'frontKick0': [(171, 407), (200, 425)],
    'lowKick0': [(236, 403)], 'stance1': [(294, 405)],
    # band 7 (beside the credit panel): Saba poses. ONLY sabaWind0 draws the blade (held back/up behind Tommy);
    # sabaCut0 is the forward cut whose slash streak is the detached piece at (143,506); hold0 / sabaDraw0 grip at the chest.
    'hold0': [(3, 488)], 'sabaDraw0': [(36, 488)], 'sabaCut0': [(94, 486), (143, 506)], 'sabaWind0': [(194, 481)],
    # band 8: compact, rising fist, compact, airborne, extended flying kick, tucked ball
    'compact0': [(1, 568)], 'uppercut0': [(49, 560)], 'compact1': [(95, 572)], 'air0': [(148, 563)], 'flyKick0': [(221, 574)],
    'ball0': [(393, 610)],
    # band 9: acrobatic rotation / low movement / air recovery (cart0 has a detached trail piece)
    'rot0': [(3, 659)], 'cart0': [(52, 652), (101, 662)], 'hand0': [(136, 646)], 'dive0': [(207, 666)], 'reach0': [(282, 642)],
    'land0': [(328, 652)], 'roll0': [(378, 650)], 'roll1': [(419, 647)],
    # band 10: additional airborne rotations, kneeling landing
    'jump0': [(6, 737)], 'flip0': [(62, 744)], 'flip1': [(114, 743)], 'flip2': [(182, 746)], 'kneel0': [(237, 746)],
    # band 11: guard / recoil (back turned) / flinch (head clutch) / forward stagger
    'guard0': [(3, 826)], 'recoil0': [(59, 828)], 'flinch0': [(118, 828)], 'stagger0': [(164, 844)],
    # band 12: stagger, fall back, falling, flat, upside-down fall, prone, sit-up get-up
    'down0': [(6, 906)], 'down1': [(54, 897)], 'down2': [(99, 903)], 'down3': [(156, 903)], 'down4': [(225, 922)],
    'prone0': [(217, 898)], 'sit0': [(296, 908)],
}
WHITE_CREDIT = (318, 508)

NINJA = {
    # band 1: two ready poses, raised-arm guard
    'ready0': [(4, 3)], 'ready1': [(69, 3)], 'guard0': [(134, 4)],
    # band 2: six stepping poses
    'walk0': [(2, 99)], 'walk1': [(56, 100)], 'walk2': [(104, 100)], 'walk3': [(146, 101)], 'walk4': [(186, 104)], 'walk5': [(233, 103)],
    # band 3: short jab, straight extended punch, turning recoil, rear-view extended punch (the other arm)
    'jab0': [(3, 197)], 'punch0': [(65, 195)], 'turn0': [(160, 198)], 'punch1': [(235, 200)],
    # band 4: step-in, raised-leg high kick, knee, recovery
    'step0': [(1, 297)], 'crane0': [(65, 292)], 'knee0': [(143, 295)], 'recover0': [(204, 292)],
    # band 5: chamber, rear-view kick (drawn kicking LEFT), rear/turned body, horizontal push kick
    'chamber0': [(2, 393)], 'rearKick0': [(66, 394)], 'rear0': [(147, 393)], 'push0': [(212, 392)],
    # band 6: sword draw (raised), overhead wind-up, strike follow-through, the supplied arc (separate FX), finishing pose
    'draw0': [(3, 491)], 'wind0': [(73, 491)], 'cut0': [(158, 507)], 'arc0': [(230, 504)], 'finish0': [(325, 502)],
    # band 7: stagger, fall, two prone
    'stagger0': [(4, 603)], 'fall0': [(66, 610)], 'prone0': [(153, 625)], 'prone1': [(260, 625)],
    # band 8: kneeling / seated / get-up candidates
    'kneel0': [(6, 725)], 'kneel1': [(83, 710)], 'rise0': [(140, 699)],
}
NINJA_CREDIT = (233, 729)

# Body-anchor palette (White sheet): visor (0), outline (32,32,32)=5, dark grey (96,96,96)=18. The kick trails are
# drawn only in 64/69/49/45 (no outline), so trail pixels never move the feet anchor.
SUIT = {0, 5, 18}
AIRBORNE = {'riseKick0', 'highKick0', 'airKick0', 'flipKick0', 'uppercut0', 'air0', 'flyKick0', 'ball0', 'cart0', 'hand0', 'dive0',
            'roll0', 'roll1', 'jump0', 'flip0', 'flip1', 'flip2', 'rot0', 'down4'}


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


def zord_anchor(name, mask):
    ys, xs = np.where(mask)
    if name == 'arc0':
        return [int(xs.min()), int(round((ys.min() + ys.max()) / 2))]   # FX: the arc's trailing (left) edge, mid-height
    bottom = ys.max()
    sel = ys >= bottom - 5
    return [int(round(xs[sel].mean())), int(bottom + 1)]               # feet (both planted feet, lowest six rows)


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
    'dash': ['run4'], 'jump': ['jump0', 'ball0', 'roll0', 'roll1'], 'fall': ['air0'], 'crouch': ['crouch0'], 'guard': ['guard0'],
    'hurt': ['flinch0'], 'hurt2': ['recoil0'], 'stagger': ['stagger0'], 'knockdown': ['down2', 'down3', 'prone0'],
    'launched': ['down4'], 'getup': ['sit0', 'kneel0', 'ready0'],
    # J1 / J2 / J3 (fresh Light retaps) — HAND
    'light': ['punch1', 'punch0'], 'wJ2': ['pivot0', 'turn0'], 'wJ3': ['stance0', 'frontKick0'],
    # Heavy = Saba Cut (BLADE). The blade itself is visible only in sabaWind0; sabaCut0 shows the supplied slash streak.
    'heavy': ['sabaDraw0', 'sabaWind0', 'sabaCut0'],
    # Low (FOOT), Launcher (FOOT), Air
    'wLow': ['crouch0', 'lowKick0'], 'up': ['crouch0', 'riseKick0', 'highKick0'], 'air': ['ball0', 'airKick0'], 'down_air': ['airKick0'],
    # Forward+Heavy chain: advancing strike → fresh Heavy Saba cut → fresh Heavy knock-away kick
    'wAdv': ['step0', 'lunge0'], 'wSaba': ['sabaWind0', 'sabaCut0'], 'wKnock': ['stance1', 'flipKick0'],
    # specials
    'wAnswer': ['hold0', 'sabaDraw0', 'sabaWind0', 'sabaCut0', 'stance1'],   # Saba's Answer
    'wFeint': ['sabaDraw0', 'hold0'],                                          # released before the active frames
    'wAscent': ['compact0', 'riseKick0', 'air0'],                              # White Tiger Ascent (grounded Down+Special)
    'wDescent': ['ball0', 'flyKick0'],                                         # Tiger Descent (air Down+Special)
    'wCall': ['punch2', 'reach0'],                                             # Megazord order: guard → raised-arm signal
    'wOrder': ['reach0'],                                                      # Formation signal (follow-up accepted)
    'grab': ['punch1', 'punch0'],
    # ultimate beats
    'ultOpen': ['sabaDraw0', 'sabaWind0', 'sabaCut0'], 'ultKick': ['jump0', 'airKick0'], 'ultLand': ['land0', 'hold0'],
    'ultFinal': ['sabaWind0', 'sabaCut0'],
    # presentation: acrobatic entrance → Saba-ready; upright chest-grip pose; actual stagger / fall / prone
    'intro': ['cart0', 'hand0', 'land0', 'hold0'], 'win': ['sabaDraw0'], 'lose': ['down0', 'down1', 'down2', 'down3', 'prone0'],
    # double-tap blink (rangers.js): the supplied low dive is the travel afterimage
    'blink': ['dive0'],
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard'}

# Ninja Megazord render sequences (shared art, one cache for every owner).
ZSEQ = {
    'ready': ['ready0', 'ready1'], 'guard': ['guard0'], 'step': ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5'],
    'jab': ['jab0'], 'punch': ['punch0'], 'punch2': ['punch1'], 'turn': ['turn0'],
    'stepIn': ['step0'], 'crane': ['crane0'], 'knee': ['knee0'], 'recover': ['recover0'], 'chamber': ['chamber0'], 'push': ['push0'],
    'rear': ['rear0'], 'draw': ['draw0'], 'wind': ['wind0'], 'cut': ['cut0'], 'arc': ['arc0'], 'finish': ['finish0'],
    'kneel': ['kneel0', 'kneel1'], 'rise': ['rise0'],
}
# Facing as drawn (+1 = facing right). rearKick0 kicks to the LEFT (rear view); everything else attacks to the right.
ZFACE = {'rearKick0': -1}


def main():
    assert sha(WSRC).startswith(WSHA), 'White sheet hash changed'
    assert sha(ZSRC).startswith(ZSHA), 'Ninja Megazord sheet hash changed'
    out = {}
    # ── White Ranger ──
    im, a, t, lab, comps = label(WSRC)
    assert im.size == (460, 996) and im.mode == 'P' and t == 74
    check_all_assigned(comps, WHITE, WHITE_CREDIT, 'white')
    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    frames, cells = {}, []
    for name, parts in WHITE.items():
        img, rect, idx, mask = cut(im, a, t, lab, comps, parts)
        anc = body_anchor(name, idx, mask)
        frames[name] = img
        img.save(OUT / 'cells' / f'{name}.png')
        cells.append(dict(name=name, rect=rect, parts=[list(p) for p in parts], anchor=anc, opaquePixels=int(mask.sum()), kind='body'))
    dup = {}
    for i, c in enumerate(cells):
        for c2 in cells[:i]:
            if frames[c['name']].tobytes() == frames[c2['name']].tobytes():
                dup[c['name']] = c2['name']
    cx, cy, cw, ch = comps[WHITE_CREDIT][1:]
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
        anim[action] = {'sheet': f'./assets/mmpr_white/{action}.png', 'frames': len(names), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': 8,
                        'frameWidth': FW, 'frameHeight': FH}
    used = {n for v in SEQ.values() for n in v}
    for c in cells:
        c['usedIn'] = sorted(k for k, v in SEQ.items() if c['name'] in v)
    # portrait: helmet + shoulders of ready0, x4 nearest-neighbour
    r0 = frames['ready0']; hx = by['ready0']['anchor'][0]
    frames['ready0'].crop((max(0, hx - 17), 0, max(0, hx - 17) + 30, 30)).resize((120, 120), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    (ROOT / 'mmprWhiteSprites.js').write_text('// Generated by tools/mmpr_white/extract.py — do not hand-edit.\nexport const MMPR_WHITE_ANIM = '
                                             + json.dumps(anim, indent=1) + '\n')
    out['white'] = dict(cells=len(cells), duplicates=dup, unused=[c['name'] for c in cells if c['name'] not in used])
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': WSRC.name, 'sha256': sha(WSRC), 'size': [460, 996], 'mode': 'P', 'transparencyIndex': 74,
        'keyPolicy': 'GIF transparency index 74 only; every opaque pixel (incl. visor/shield black index 0, outline (32,32,32)) is kept',
        'credit': CREDIT_TEXT, 'creditPanel': [cx, cy, cw, ch],
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY},
        'cells': cells, 'sequences': SEQ, 'duplicates': dup, 'unusedCells': out['white']['unused']}, indent=1) + '\n')
    contact(cells, frames, DOC / 'contact_sheet.png', title='White Ranger (mmpr_white) — numbered cells; red cross = body anchor (feet)')

    # ── Ninja Megazord (shared) ──
    im, a, t, lab, comps = label(ZSRC)
    assert im.size == (410, 787) and im.mode == 'P' and t == 74
    check_all_assigned(comps, NINJA, NINJA_CREDIT, 'ninja')
    (ZOUT / 'cells').mkdir(parents=True, exist_ok=True)
    zf, zc = {}, []
    for name, parts in NINJA.items():
        img, rect, idx, mask = cut(im, a, t, lab, comps, parts)
        anc = zord_anchor(name, mask)
        zf[name] = img
        img.save(ZOUT / 'cells' / f'{name}.png')
        zc.append(dict(name=name, rect=rect, parts=[list(p) for p in parts], anchor=anc, opaquePixels=int(mask.sum()),
                       kind='fx' if name == 'arc0' else 'body'))
    zx, zy, zw, zh = comps[NINJA_CREDIT][1:]
    im.convert('RGBA').crop((zx, zy, zx + zw, zy + zh)).save(ZOUT / 'credit_panel.png')
    zused = {n for v in ZSEQ.values() for n in v}
    for c in zc:
        c['usedIn'] = sorted(k for k, v in ZSEQ.items() if c['name'] in v)
    zcells = {c['name']: {'src': f'./assets/power_rangers/ninja_megazord/cells/{c["name"]}.png', 'w': c['rect'][2], 'h': c['rect'][3],
                          'ax': c['anchor'][0], 'ay': c['anchor'][1], 'face': ZFACE.get(c['name'], 1)} for c in zc}
    (ROOT / 'ninjaMegazordSprites.js').write_text('// Generated by tools/mmpr_white/extract.py — do not hand-edit. Shared Ninja Megazord art (one cache for every owner).\n'
                                                 'export const NINJA_CELLS = ' + json.dumps(zcells, indent=1) + '\nexport const NINJA_SEQ = ' + json.dumps(ZSEQ) + '\n')
    ZDOC.mkdir(parents=True, exist_ok=True)
    (ZDOC / 'source_rects.json').write_text(json.dumps({
        'source': ZSRC.name, 'sha256': sha(ZSRC), 'size': [410, 787], 'mode': 'P', 'transparencyIndex': 74,
        'keyPolicy': 'GIF transparency index 74 only', 'credit': ZCREDIT_TEXT, 'creditPanel': [zx, zy, zw, zh],
        'cells': zc, 'sequences': ZSEQ, 'unusedCells': [c['name'] for c in zc if c['name'] not in zused]}, indent=1) + '\n')
    contact(zc, zf, ZDOC / 'contact_sheet.png', S=2, per=6, title='Ninja Megazord (shared) — numbered cells; red cross = feet anchor (arc0: trailing edge)')
    out['ninja'] = dict(cells=len(zc), unused=[c['name'] for c in zc if c['name'] not in zused])
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
