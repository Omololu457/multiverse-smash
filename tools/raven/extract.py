#!/usr/bin/env python3
"""Raven (Rachel Roth): Teen Titans GBA sheet extraction.

SOURCE IS READ-ONLY. "Game Boy Advance - Teen Titans - Playable Characters - Raven.png" is 900x1593 RGB. Its sha256
is checked against SHA below and the file is never written.

BACKGROUND POLICY
- Only the opaque key colour RGB(77,109,243) is removed, by exact match with no tolerance.
  - The sheet has 88 colours. The nearest other colour is 67 (L1) away, so no authored blue or purple cloak pixel
    can be caught.
  - Key-coloured pixels ENCLOSED by art (gaps between arm and cloak, between the legs) are the GBA transparent index
    seen through the sprite, so they are removed too.
- BLACK IS ART. The Soul Shell's opaque black disc, all outlines and every white/gray silhouette pixel inside the
  disc are kept exactly. Nothing that is not the key colour is ever made transparent.
- Nearest-neighbour only.

LABELS
- The sheet's labels are pure-black text. Black is ALSO the outline colour, so text is not detected by colour alone.
- A black-only component counts as text only if it lies inside one of the pinned label rectangles below.
- The script asserts the exact text-component count, and that every remaining component is assigned to exactly one
  frame (or the credit panel).

FRAMES ARE COMPONENT UNIONS, assigned by explicit per-band x-partitions (8-connected components).
- Appearing #0 and the last Defeated frame are vertical-stripe dissolves: dozens of 1-px components each, which is
  why frames are partitions and not single components.
- The 1-px vertical lines between Energy Exploding frames and between Bricks Breaking frames are frame DIVIDERS on
  the sheet, not art. They are recorded, not drawn.

Usage: python3 tools/raven/extract.py
"""
from pathlib import Path
import hashlib, json, re
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Game Boy Advance - Teen Titans - Playable Characters - Raven.png'
SHA = 'a0faa5d7d2cede96255fc876a82077c9e33a65f92c7cc5539b131e5c806d28e2'
OUT = ROOT / 'assets/raven'
DOC = ROOT / 'docs/raven'
KEY = (77, 109, 243)

# Body strip cell, with the feet origin at (OX, OY). It is sized for the widest authored frame: the Soul Shell disc
# (76 px) with the bricks-launch reach, and the tallest one (the jump apex stretch).
FW, FH, OX, OY = 112, 104, 56, 92

# ── the printed labels (black text). Rects are (x0, y0, x1, y1), inclusive-padded by 1 in inside() ──
LABELS = {
    'Appearing': (126, 3, 176, 12), 'Idle': (337, 68, 355, 76), 'Walking': (497, 134, 534, 144), 'Jumping': (361, 198, 401, 207),
    'Landing': (295, 268, 332, 278), 'Punch 1': (454, 330, 492, 338), 'Punch 2': (311, 396, 350, 404),
    'Shooting Energy Shot': (482, 457, 589, 467), 'Shooting Energy Shot (Midair)': (387, 521, 494, 543),
    'Beginning to Levitate': (105, 586, 209, 595), 'Levitating': (465, 648, 513, 657), 'Putting Up Shield': (450, 719, 535, 729),
    'Shield': (643, 800, 672, 808), 'Shield End': (217, 879, 268, 887), 'Launching Piles of Bricks': (822, 969, 899, 989),
    'Hurt': (318, 1038, 339, 1045), 'Defeated': (766, 1096, 809, 1104), 'Energy Shot': (97, 1159, 157, 1169),
    'Energy Exploding': (465, 1177, 550, 1187), 'Pile of Bricks': (47, 1218, 111, 1226), 'Bricks Breaking': (153, 1239, 230, 1249),
    'Health Icon': (175, 1264, 232, 1272), 'Cutscenes': (67, 1455, 119, 1462),
}
TEXT_COMPONENTS = None   # asserted below once counted (printed on first run, then pinned)
DIVIDERS = {'explosion': [(322, 1177), (370, 1177), (417, 1177)], 'bricksBreaking': [(41, 1241), (90, 1241)]}
CREDIT = (731, 1452)     # "Brought to you by… Mr. C — Credit? No / Permission? No" panel

def cuts(xs, end): return list(xs) + [end]
# (prefix, y0, y1, [x cut points]) → frames prefix0.. between consecutive cuts (component CENTRE decides)
BANDS = [
    ('appear', 0, 66, cuts([0, 41, 86], 126)),
    ('idle', 66, 130, cuts([0, 43, 86, 128, 169, 210, 252, 295], 337)),
    ('walk', 130, 195, cuts([0, 39, 78, 115, 156, 200, 248, 297, 343, 384, 422, 463], 500)),
    ('jump', 195, 266, cuts([0, 40, 82, 114, 143, 174, 217, 267, 316], 357)),
    ('land', 266, 328, cuts([0, 52, 100, 142, 179, 214, 252], 295)),
    ('pa', 328, 390, cuts([0, 48, 97, 147, 205, 268, 328, 380, 420], 452)),
    ('pb', 390, 452, cuts([0, 41, 95, 157, 218, 270], 310)),
    ('shot', 452, 518, cuts([0, 60, 122, 180, 225, 283, 341, 389, 420, 451], 482)),
    ('ashot', 518, 584, cuts([0, 60, 122, 179, 236, 290, 341], 387)),
    ('levb', 584, 646, cuts([0, 46], 105)),
    ('lev', 646, 712, cuts([0, 59, 117, 174, 230, 287, 344, 402], 465)),
    ('shup', 712, 797, cuts([0, 53, 132, 212, 290, 370], 450)),
    ('sh', 797, 877, cuts([0, 80, 160, 240, 321, 402, 482, 563], 643)),
    ('shend', 877, 951, cuts([0, 79, 159], 217)),
    ('brick', 951, 1032, cuts([0, 59, 123, 189, 255, 311, 352, 383, 410, 437, 464, 511, 565, 621, 664, 715, 764], 822)),
    ('hurt', 1032, 1094, cuts([0, 53, 112, 168, 222, 276], 318)),
    ('def', 1094, 1158, cuts([0, 41, 82, 121, 159, 197, 236, 276, 317, 358, 398, 437, 475, 514, 554, 595, 637, 679, 719], 766)),
    ('orb', 1158, 1175, cuts([0, 31, 62], 97)),
    ('ex', 1175, 1216, cuts([0, 29, 63, 98, 138, 181, 227, 276, 322, 370, 417], 465)),
    ('pile', 1216, 1238, cuts([0], 47)),
    ('brk', 1238, 1262, cuts([0, 41, 90], 153)),
]
FX_PREFIX = ('orb', 'ex', 'pile', 'brk')
# Shield frames whose authored content is the black disc + white silhouette (no coloured body pixels).
SILHOUETTE = {'shup1', 'shup2', 'shup3', 'shup4', 'shup5', 'sh0', 'sh1', 'sh2', 'sh3', 'sh4', 'sh5', 'sh6', 'sh7', 'shend0', 'shend1'}


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def components():
    im = Image.open(SRC)
    assert im.size == (900, 1593) and im.mode == 'RGB', (im.size, im.mode)
    a = np.array(im)
    fg = ~(a == KEY).all(-1)
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    black = (a == 0).all(-1)
    comps = []
    for i, (ys, xs) in enumerate(ndimage.find_objects(lab)):
        m = lab[ys, xs] == i + 1
        comps.append(dict(id=i + 1, x=xs.start, y=ys.start, w=xs.stop - xs.start, h=ys.stop - ys.start, n=int(m.sum()),
                          black=bool((black[ys, xs] & m).sum() == m.sum())))
    return im, a, lab, comps


def inside(c, r, pad=1):
    return c['x'] >= r[0] - pad and c['y'] >= r[1] - pad and c['x'] + c['w'] <= r[2] + pad + 1 and c['y'] + c['h'] <= r[3] + pad + 1


def assign(comps):
    text, divs, frames = [], [], {}
    for c in comps:
        if c['black'] and any(inside(c, r) for r in LABELS.values()):
            text.append(c['id']); c['role'] = 'text'; continue
        if c['black'] and c['w'] == 1 and c['h'] >= 19 and any((c['x'], c['y']) in v for v in DIVIDERS.values()):
            divs.append(c['id']); c['role'] = 'divider'; continue
        if (c['x'], c['y']) == CREDIT:
            c['role'] = 'credit'; continue
        cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
        name = None
        if 1262 <= c['y'] < 1452 and c['x'] < 175:                       # Health Icon grid (+ dazed icons' sparkle specks)
            row = (c['y'] - 1262) // 32
            if row <= 3 and c['h'] > 20: name = 'icon_r%d_c%d' % (row, (c['x'] - 1) // 29)
            elif 1390 <= c['y'] < 1420: name = 'icon_daze%d' % (0 if cx < 38 else 1)
            elif c['y'] >= 1420: name = 'icon_down'
        elif c['y'] >= 1452 and c['x'] < 200:                             # cutscene bust + face overlays
            if c['h'] > 60: name = 'bust'
            elif c['y'] < 1570: name = 'eye%d' % (0 if c['x'] < 20 else 1)
            else: name = 'mouth%d' % ((c['x'] - 1) // 37)
        else:
            for pre, y0, y1, xs in BANDS:
                if not (y0 <= cy < y1): continue
                for k in range(len(xs) - 1):
                    if xs[k] <= cx < xs[k + 1]:
                        name = '%s%d' % (pre, k); break
                if name: break
        assert name, ('unassigned component', c)
        c['role'] = name
        frames.setdefault(name, []).append(c['id'])
    return frames, text, divs


def cut_frame(a, lab, ids):
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    rgba[..., :3] = a[y0:y1, x0:x1]
    rgba[..., 3] = np.where(m[y0:y1, x0:x1], 255, 0)
    return rgba, [x0, y0, x1 - x0, y1 - y0], m[y0:y1, x0:x1]


# Sheet ground line per band (the row each authored body sits on). Grounded bands: the maximum bbox bottom.
# Airborne bands (jump / air shot / levitation) have no ground line: those frames use the hood-top torso rule below.
# Every band on this sheet is authored on a common ground line (verified: each band's frames share one bbox bottom,
# including the airborne jump / midair shot / levitation rows), so every body frame keeps its authored foot placement.
GROUND_BANDS = {'appear', 'idle', 'walk', 'jump', 'land', 'pa', 'pb', 'shot', 'ashot', 'levb', 'lev', 'shup', 'sh', 'shend', 'brick', 'hurt', 'def'}
HOOD = {(16, 8, 112), (48, 24, 112), (72, 32, 176), (104, 56, 240), (152, 120, 232), (208, 176, 240)}
# Per-frame anchor overrides, set after inspecting the enlarged contact sheet. Each is documented in SPRITE_LEDGER.md.
ANCHOR_FIX = {}


def body_anchor(name, rgba, mask, rect, ground):
    """→ [x, y] in frame-local pixels.
    y: the band's sheet ground line, so the authored foot placement is kept exactly (every band is ground-lined).
    x: the centre of the topmost 10 rows of the largest component (the hood). An extended arm, cloak flare or spell
       never shifts the body. Shield-disc frames centre on the disc.
    """
    pre = re.match(r'[a-z]+', name).group(0)
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    main = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.where(main if main.sum() > 150 else mask)
    top = ys.min(); sel = ys < top + 10
    hx = float(xs[sel].mean())
    if name in SILHOUETTE: hx = (xs.min() + xs.max()) / 2
    if pre in GROUND_BANDS: fy = ground[pre] - rect[1]
    else: fy = int(top) + 58
    return list(ANCHOR_FIX.get(name, [int(round(hx)), int(fy)]))


# ── animation strips (engine action → ordered cells). Per-action rationale: docs/raven/MOVE_FRAME_MAP.md ──
R = lambda pre, *ks: [f'{pre}{k}' for k in ks]
SEQ = {
    'intro': R('appear', 0, 1, 2),                                      # Appearing: stripe materialise → pale → solid
    'idle': R('idle', *range(8)),
    'walk': R('walk', *range(12)),
    'walk_back': R('walk', *range(11, -1, -1)),                         # reversed walk (honest reuse, documented)
    'run': R('walk', *range(12)),
    'dash': R('walk', 4, 5, 6, 7),
    'jump': R('jump', 0, 1, 2, 3, 4),                                   # crouch-off → rise
    'fall': R('jump', 5, 6, 7, 8),                                      # apex turn → cloak-spread descent
    'doubleJump': R('jump', 2, 3, 4),                                   # second jump: supplied rising poses + derived aura (ravenFx)
    'land': R('land', *range(7)),
    'crouch': R('land', 2),                                             # no crouch frame: the deepest landing crouch
    'guard': R('shot', 0),                                              # no guard frame: the casting-ready cover pose
    'hurt': R('hurt', 0, 1, 2, 3, 4, 5),                                # dark flash → WHITE flash → pale → recoil (cosmetic)
    'knockdown': R('hurt', 0, 1, 3, 5),
    'lose': R('def', *range(19)),                                       # Defeated: slump → pale fade → stripe dissolve
    # normals
    'light': R('pa', 0, 1, 2, 3),                                       # J1 Shadow Jab (Punch 1 opening)
    'rJ2': R('pb', 0, 1, 2, 3, 4, 5),                                   # J2 Palm Extension (Punch 2 complete)
    'rJ3': R('pa', 3, 4, 5, 6, 7, 8),                                   # J3 Cloaked Finish (Punch 1 extension → recovery)
    'heavy': R('pa', *range(9)),                                        # Heavy Dark Palm (Punch 1 complete)
    'rLow': R('land', 1, 2) + R('pb', 2, 3, 5),                         # Low Ground Check: landing crouch → palm (body only)
    'up': R('brick', 3, 4, 5, 6, 7, 8),                                 # Launcher Rising Palm: the bricks-raise arms-up poses
    'air': R('ashot', 0, 1, 2, 3, 6),                                   # Air Aerial Palm: midair casting thrust (strike, no orb)
    'rAdv': R('walk', 4, 5) + R('pb', 1, 2, 3, 4),                      # Forward+Heavy advancing palm
    'rDark': R('pa', 3, 4, 5, 6, 7),                                    # → fresh Heavy dark strike
    'rKnock': R('shot', 0, 1, 2, 3, 4, 5, 9),                           # → fresh Heavy knock-away (cloak sweep)
    # specials
    'rPulse': R('shot', *range(10)),                                    # Dark Pulse: FULL grounded Energy Shot sequence
    'rAirPulse': R('ashot', *range(7)),                                 # Air Dark Pulse: FULL Midair Energy Shot sequence
    'rLift': R('brick', *range(17)),                                    # Lift the Room: FULL Launching Piles of Bricks
    'rSend': R('brick', 9, 10, 11, 12, 13, 14),                         # Telekinetic Send (idle pile): the throw half
    'rConjure': R('brick', *range(17)),                                 # Send / Verdict without a pile: full conjure + throw
    'rVerdict': R('brick', 3, 4, 5, 6, 7, 8, 9, 10, 11, 12),            # Falling Verdict (idle pile): raise → hold → drop
    'rShield': R('shup', *range(6)),                                    # Soul Shell entry: Putting Up Shield (all 6)
    'rShieldLoop': R('sh', *range(8)),                                  # Shield loop (all 8)
    'rShieldEnd': R('shend', 0, 1, 2),                                  # Shield End (all 3)
    'rShieldAll': R('shup', *range(6)) + R('sh', *range(8)) + R('shend', 0, 1, 2),   # the Soul Shell move: entry 0-5, loop 6-13, end 14-16
    'levStart': R('levb', 0, 1),                                        # Beginning to Levitate (both)
    'lev': R('lev', *range(8)),                                         # Levitating loop (all 8)
    'levEnd': R('levb', 1, 0) + R('jump', 6, 7),                        # exit: levitation lift reversed → descent pose
    # ultimate beats
    'ultOpen': R('shot', *range(10)),
    'ultRise': R('levb', 0, 1),
    'ultHover': R('lev', *range(8)),
    'ultCast': R('brick', 3, 4, 5, 6, 7, 8),
    'ultThrow': R('brick', 9, 10, 11, 12, 13, 14),
    'ultShell': R('shup', *range(6)) + R('sh', *range(8)),               # entry 0-5 then loop 6-13
    'ultRelease': R('shend', 0, 1, 2) + R('shot', 4, 5, 6),
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard', 'dash', 'lev', 'rShieldLoop', 'ultHover', 'ultShell'}
SPEED = {'idle': 7, 'walk': 4, 'walk_back': 4, 'run': 4, 'dash': 4, 'jump': 4, 'fall': 6, 'doubleJump': 4, 'land': 3, 'hurt': 4,
         'knockdown': 5, 'lose': 5, 'intro': 10, 'lev': 5, 'levStart': 5, 'levEnd': 4, 'rShieldLoop': 3, 'ultHover': 5, 'ultShell': 3}


def contact(names, cells, imgs, path, S=2, per=10, title='', marks=True):
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
        if marks and 'anchor' in cells[n]:
            ax, ay = cells[n]['anchor']; cx, cy = x + 3 + ax * S, y + 16 + ay * S
            d.line([cx - 5, cy, cx + 5, cy], fill=(255, 50, 50)); d.line([cx, cy - 5, cx, cy + 5], fill=(255, 50, 50))
    img.save(path)


def main():
    assert sha(SRC) == SHA, 'Raven sheet hash changed'
    im, a, lab, comps = components()
    frames, text, divs = assign(comps)
    assert len(text) == 276, ('text components', len(text))
    assert len(divs) == 5, len(divs)
    for d in ['cells', 'fx', 'icons', 'cutscene']: (OUT / d).mkdir(parents=True, exist_ok=True)
    DOC.mkdir(parents=True, exist_ok=True)
    imgs, cells, masks = {}, {}, {}
    ground = {}
    for name, ids in frames.items():
        rgba, rect, mask = cut_frame(a, lab, ids)
        imgs[name] = Image.fromarray(rgba, 'RGBA'); masks[name] = mask
        pre = re.match(r'[a-z_]+?(?=\d|$)', name).group(0) if not name.startswith(('icon', 'eye', 'mouth', 'bust')) else name
        kind = 'body'
        if name.startswith(FX_PREFIX): kind = 'fx'
        elif name.startswith('icon'): kind = 'icon'
        elif name == 'bust' or name.startswith(('eye', 'mouth')): kind = 'cutscene'
        cells[name] = dict(name=name, rect=rect, components=[[comps[i - 1]['x'], comps[i - 1]['y']] for i in sorted(ids)],
                           opaquePixels=int(mask.sum()), kind=kind, silhouette=name in SILHOUETTE)
        if kind == 'body':
            p = re.match(r'[a-z]+', name).group(0)
            ground[p] = max(ground.get(p, 0), rect[1] + rect[3])
    for name, c in cells.items():
        if c['kind'] != 'body': continue
        c['anchor'] = body_anchor(name, np.array(imgs[name]), masks[name], c['rect'], ground)
        imgs[name].save(OUT / 'cells' / f'{name}.png')
    for name, c in cells.items():
        if c['kind'] == 'body': continue
        sub = {'fx': 'fx', 'icon': 'icons', 'cutscene': 'cutscene'}[c['kind']]
        imgs[name].save(OUT / sub / f'{name}.png')
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
        anim[action] = {'sheet': f'./assets/raven/{action}.png', 'frames': len(ns), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': SPEED.get(action, 4),
                        'frameWidth': FW, 'frameHeight': FH}
    used = {n for v in SEQ.values() for n in v}
    # ── FX strips (all authored facing right; drawn mirrored for facing -1) ──
    def fx_strip(ns, path, pad=2, align='center'):
        w = max(imgs[n].width for n in ns) + pad * 2; h = max(imgs[n].height for n in ns) + pad * 2
        s = Image.new('RGBA', (w * len(ns), h))
        for i, n in enumerate(ns):
            g = imgs[n]
            gy = (h - g.height) // 2 if align == 'center' else h - pad - g.height
            s.paste(g, (w * i + (w - g.width) // 2, gy))
        s.save(path); return {'w': w, 'h': h, 'frames': len(ns), 'sheet': './assets/raven/fx/' + path.name}
    fx = {}
    fx['orb'] = fx_strip(['orb0', 'orb1', 'orb2'], OUT / 'fx/orb_strip.png')                      # Energy Shot travel loop
    fx['explosion'] = fx_strip([f'ex{k}' for k in range(11)], OUT / 'fx/explosion_strip.png')    # Energy Exploding (11)
    fx['pile'] = fx_strip(['pile0'], OUT / 'fx/pile_strip.png')                                  # Pile of Bricks
    fx['breaking'] = fx_strip(['brk0', 'brk1', 'brk2'], OUT / 'fx/breaking_strip.png', align='bottom')   # Bricks Breaking (3)
    # ── cutscene: bust + face overlays placed by exact template match on the bust ──
    bust = np.array(imgs['bust']); overlays = {}
    for n in ['eye0', 'eye1', 'mouth0', 'mouth1', 'mouth2']:
        o = np.array(imgs[n]); oh, ow = o.shape[:2]; best = None
        m = o[..., 3] > 0
        for y in range(bust.shape[0] - oh + 1):
            for x in range(bust.shape[1] - ow + 1):
                win = bust[y:y + oh, x:x + ow]
                diff = int((win[m][:, :3].astype(int) != o[m][:, :3].astype(int)).any(-1).sum() + (win[m][:, 3] == 0).sum())
                if best is None or diff < best[0]: best = (diff, x, y)
        overlays[n] = {'x': best[1], 'y': best[2], 'w': ow, 'h': oh, 'mismatch': best[0], 'opaque': int(m.sum())}
    por = Image.new('RGBA', (128, 128)); por.paste(imgs['bust'], ((128 - imgs['bust'].width) // 2, 128 - imgs['bust'].height)); por.save(OUT / 'portrait.png')
    im.crop((731, 1452, 900, 1593)).save(OUT / 'credit_panel.png')
    # ── health icons → named expressions (cosmetic) ──
    ICONS = {'calm': [f'icon_r0_c{i}' for i in range(6)], 'focus': [f'icon_r1_c{i}' for i in range(4)],
             'strain': [f'icon_r2_c{i}' for i in range(6)], 'hurt': [f'icon_r3_c{i}' for i in range(4)],
             'daze': ['icon_daze0', 'icon_daze1'], 'down': ['icon_down']}
    iw = max(imgs[n].width for v in ICONS.values() for n in v) + 2; ih = max(imgs[n].height for v in ICONS.values() for n in v) + 2
    sheet = Image.new('RGBA', (iw * 6, ih * len(ICONS)))
    for r, k in enumerate(ICONS):
        for i, n in enumerate(ICONS[k]):
            g = imgs[n]; sheet.paste(g, (iw * i + (iw - g.width) // 2, ih * r + (ih - g.height)))
    sheet.save(OUT / 'icons/expressions.png')
    meta = {'icons': {'w': iw, 'h': ih, 'rows': {k: [i, len(v)] for i, (k, v) in enumerate(ICONS.items())}},
            'cutscene': {'bust': {'w': imgs['bust'].width, 'h': imgs['bust'].height}, 'overlays': overlays}}
    (ROOT / 'ravenSprites.js').write_text('// Generated by tools/raven/extract.py — do not hand-edit.\n'
                                         'export const RAVEN_ANIM = ' + json.dumps(anim, indent=1) + '\n'
                                         'export const RAVEN_FX = ' + json.dumps(fx) + '\n'
                                         'export const RAVEN_ICONS = ' + json.dumps(meta['icons']) + '\n'
                                         'export const RAVEN_CUTSCENE = ' + json.dumps(meta['cutscene']) + '\n')
    for n, c in cells.items():
        c['usedIn'] = sorted(k for k, v in SEQ.items() if n in v)
    body = [n for n in cells if cells[n]['kind'] == 'body']
    unused = [n for n in body if n not in used]
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': SRC.name, 'sha256': SHA, 'size': [900, 1593], 'mode': 'RGB', 'key': list(KEY),
        'keyPolicy': 'exact RGB(77,109,243) only (also inside enclosed gaps); nearest other colour 67 L1 away; black outlines AND the black Soul Shell disc kept',
        'labels': LABELS, 'textComponents': len(text), 'dividers': DIVIDERS, 'creditPanel': [731, 1452, 169, 141],
        'credit': 'Brought to you by... Mr. C — Credit? No / Permission? No (panel excluded from animation)',
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY}, 'groundLines': ground,
        'cells': list(cells.values()), 'sequences': SEQ, 'duplicates': dup, 'unusedBodyCells': unused,
        'fx': fx, 'icons': meta['icons'], 'cutscene': meta['cutscene']}, indent=1) + '\n')
    seen = []
    for pre, *_ in BANDS:
        if pre in FX_PREFIX: continue
        seen += sorted([n for n in body if re.fullmatch(pre + r'\d+', n)], key=lambda n: int(re.sub(r'\D', '', n)))
    contact(seen, cells, imgs, DOC / 'contact_sheet.png', S=3, per=10, title='Raven (raven) — numbered body cells; red cross = feet/torso anchor')
    others = [n for n in cells if cells[n]['kind'] != 'body']
    contact(others, cells, imgs, DOC / 'contact_sheet_fx_icons.png', S=3, per=8, title='Raven — FX (orb / explosion / pile / breaking), health icons, cutscene pieces')
    print(json.dumps({'bodyCells': len(body), 'fxIconCut': len(others), 'text': len(text), 'duplicates': dup, 'unused': unused,
                      'overlays': overlays, 'ground': ground}, indent=1))


if __name__ == '__main__':
    main()
