#!/usr/bin/env python3
"""Robin (Dick Grayson, Teen Titans) — supplied GBA sheet extraction.

SOURCE IS READ-ONLY: "Game Boy Advance - Teen Titans - Playable Characters - Robin.png" (804x1555 RGB, sha256 below)
is hash-checked and never written.

BACKGROUND POLICY: only the exact key colour RGB(77,109,243) is removed (no tolerance), also inside enclosed gaps
(the GBA transparent index). Outlines (0,0,0), the navy hair / cape ramps, mask, cape lining and every FX pixel are
art. Nearest-neighbour only; no pixel is redrawn, blurred or anti-aliased.

LABELS / SEPARATORS / CREDITS: printed black text components are dropped only when they lie INSIDE one of the
pinned label rectangles below (the "Swinging Stick" title box, the "Play 3 Times" bracket, the horizontal section
rules and the three explosion separators are black-only components and are dropped the same way, by rectangle).
The anti-aliased title-box pixels exist only inside the "Swinging Stick" box. The "Brought to you by... Mr. C" panel
is cut to assets/robin/credit_panel.png for attribution only (never animated).

FRAMES are 8-connected component unions assigned by explicit per-band x cuts (a component goes by its centre x).
Detached staff tips / speed dashes belong to the frame whose cut contains their centre (audited in the contact
sheet). Every art component is assigned exactly once; the script fails loudly otherwise.

ANCHORS (feet origin): y = the band's shared ground line (lowest art row of the band — airborne poses keep their
authored lift); x = the head centre (hair + face top rows), so a long staff never drags the body sideways.
Explicit per-cell corrections live in ANCHOR_DX (authored on docs/robin/transitions.png).

CELL: one strip cell size for every action, sized from the widest staff reach and the tallest overhead staff
(asserted per frame; nothing is cropped or squeezed).

Usage: python3 tools/robin/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Game Boy Advance - Teen Titans - Playable Characters - Robin.png'
SHA = 'ec8561a712bc9a7a9f84aa09372ea7be39e2d22f4164de047bcd4b8601f399d8'
OUT = ROOT / 'assets/robin'
DOC = ROOT / 'docs/robin'
KEY = (77, 109, 243)

# Strip cell: feet origin (OX, OY). Widest reach = Swinging Stick thrusts (~88 px forward of the head centre); the
# tallest = the rising-staff overhead poses (~92 px). Both asserted per frame below.
FW, FH, OX, OY = 160, 104, 72, 100

LABELS = {
    'Appearing': (116, 1, 169, 14), 'Idle': (305, 68, 327, 80), 'Running': (677, 137, 719, 150),
    'Jumping/Double Jump': (374, 194, 441, 219), 'Landing': (311, 270, 352, 284), 'Punch 1': (446, 336, 488, 348),
    'Punch 2': (332, 395, 375, 407), 'Punch 3': (599, 466, 642, 478),
    'Swinging Stick (title box + section rule)': (0, 503, 804, 529),
    'Play 3 Times (bracket + caption)': (146, 712, 670, 795), 'Midair Kick': (451, 860, 509, 872),
    'section rule (y 859)': (0, 858, 804, 860), 'Throwing Bombs': (620, 937, 705, 951),
    'Hacking Computer': (558, 1014, 654, 1028), 'Hurt': (309, 1081, 334, 1092), 'Defeated': (756, 1127, 803, 1139),
    'Bomb': (18, 1204, 48, 1215), 'Bomb Explosion': (447, 1216, 529, 1230),
    'explosion separators': (315, 1216, 415, 1256), 'Health Icon': (279, 1257, 340, 1269), 'Cutscenes': (64, 1437, 120, 1448),
}
CREDIT = (635, 1414, 804, 1555)   # "Brought to you by... Mr. C" — Credit? No / Permission? No

# (prefix, y0, y1, x cuts (frame starts), end)
BANDS = [
    ('appear', 0, 66, [0, 37, 76], 116),
    ('idle', 66, 130, [0, 38, 78, 116, 153, 190, 228, 266], 306),
    ('run', 130, 191, [0, 48, 97, 156, 208, 256, 299, 340, 380, 425, 484, 536, 586, 631], 677),
    ('jump', 191, 268, [0, 41, 78, 110, 144, 179, 212, 249, 288, 332], 372),
    ('land', 268, 332, [0, 39, 75, 116, 156, 195, 232, 271], 308),
    ('p1', 332, 395, [0, 38, 78, 121, 171, 239, 305, 364, 410], 444),
    ('p2', 395, 453, [0, 44, 95, 162, 228, 288], 332),
    ('p3', 453, 527, [0, 34, 74, 117, 165, 214, 246, 289, 330, 366, 407, 447, 486, 523, 562], 600),
    ('st1', 527, 614, [0, 51, 104, 144, 189, 240, 300, 352, 444, 534, 622, 711], 804),
    ('st2', 614, 711, [0, 82, 135, 165, 197, 244, 298, 384, 469, 553, 641, 735], 804),
    ('st3', 711, 778, [0, 38, 89, 148, 236, 319, 411, 495, 583, 670], 760),
    ('st4', 778, 860, [0, 52, 107, 162, 215], 256),
    ('ak', 860, 937, [0, 32, 77, 144, 211, 276, 331, 366, 410], 450),
    ('thr', 937, 1013, [0, 34, 76, 120, 164, 208, 256, 306, 352, 394, 429, 462, 499, 538, 582], 620),
    ('hack', 1013, 1074, [0, 43, 89, 137, 183, 228, 274, 323, 373, 422, 471, 518], 560),
    ('hurt', 1074, 1142, [0, 53, 111, 164, 217, 268], 308),
    ('def', 1142, 1202, [0, 41, 82, 122, 162, 201, 241, 282, 324, 366, 407, 447, 487, 526, 566, 608, 650, 692, 734], 776),
]
FX_BANDS = [   # projectile / effect cells (no feet anchor)
    ('bomb', 1202, 1216, [0], 18),
    ('exp', 1216, 1257, [0, 26, 58, 93, 133, 176, 223, 272, 316, 366, 413], 460),
]
ANCHOR_DX = {}   # per-cell corrections (px, + = toward facing); none needed after review of transitions.png
HAIR = [(0, 48, 96), (64, 112, 168), (136, 176, 224)]
FACE = [(248, 208, 168), (192, 152, 120)]


BAND_OF = {f'{pre}{k}': pre for pre, _, _, xs, _ in BANDS + FX_BANDS for k in range(len(xs))}


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def inside(c, r): return c['x'] >= r[0] and c['y'] >= r[1] and c['x'] + c['w'] <= r[2] and c['y'] + c['h'] <= r[3]


def components():
    im = Image.open(SRC)
    assert im.size == (804, 1555) and im.mode == 'RGB', (im.size, im.mode)
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


def assign(comps, a, lab):
    text, frames = [], {}
    for c in comps:
        lab_rect = [r for r in LABELS.values() if inside(c, r)]
        if c['black'] and lab_rect:
            text.append(c['id']); c['role'] = 'text'; continue
        if c['x'] >= 657 and c['y'] >= 503 and c['y'] + c['h'] <= 529:   # anti-aliased title-box glyph pixels
            text.append(c['id']); c['role'] = 'text'; continue
        if inside(c, CREDIT): c['role'] = 'credit'; continue
        cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
        name = None
        if 1257 <= c['y'] < 1440 and c['x'] < 279:                        # health-icon grid (+ daze sparkles)
            r = 0 if cy < 1287 else 1 if cy < 1317 else 2 if cy < 1347 else 3 if cy < 1377 else 4 if cy < 1409 else 5
            if r < 4: name = 'icon_r%d_c%d' % (r, int((c['x'] + 2) // 28))
            elif r == 4: name = 'icon_daze%d' % (0 if cx < 38 else 1)
            else: name = 'icon_down'
        elif c['y'] >= 1440 and c['x'] < 130:                              # cutscene bust + mask / mouth pieces
            if c['h'] > 50: name = 'bust'
            elif c['y'] < 1538: name = 'mask%d' % (0 if c['x'] < 32 else 1)
            else: name = 'mouth%d' % ((c['x'] + 1) // 34)
        else:
            for pre, y0, y1, xs, end in BANDS + FX_BANDS:
                if not (y0 <= cy < y1): continue
                cuts = xs + [end]
                for k in range(len(xs)):
                    if cuts[k] <= cx < cuts[k + 1]: name = f'{pre}{k}'; break
                if name: break
        assert name, ('unassigned component', c)
        c['role'] = name
        frames.setdefault(name, []).append(c['id'])
    for pre, _, _, xs, _ in BANDS + FX_BANDS:
        for k in range(len(xs)): assert f'{pre}{k}' in frames, ('empty frame', pre, k)
    return frames, text


def cut_frame(a, lab, ids):
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    rgba[..., :3] = a[y0:y1, x0:x1]
    rgba[..., 3] = np.where(m[y0:y1, x0:x1], 255, 0)
    return rgba, [x0, y0, x1 - x0, y1 - y0], m[y0:y1, x0:x1]


def head_x(name, rgba, mask):
    """Head centre: the topmost face-skin rows (the face is unique to the head; the hair spikes vary by pose)."""
    rgb = rgba[..., :3]
    face = np.zeros(mask.shape, bool)
    for c in FACE: face |= (rgb == c).all(-1)
    face &= mask
    if face.sum() >= 6:
        ys, xs = np.where(face); top = ys.min(); sel = ys < top + 8
        return float(xs[sel].mean())
    ys, xs = np.where(mask); top = ys.min(); sel = ys < top + 14
    return float(xs[sel].mean())


# ── animation strips (engine action → ordered cells). Rationale per action: docs/robin/SPRITE_MAP.md ──
R = lambda pre, *ks: [f'{pre}{k}' for k in ks]
SEQ = {
    'intro': R('appear', 0, 1, 2),                                   # Appearing: streak silhouette → pale → solid
    'introSettle': R('appear', 2) + R('idle', 0, 1, 2, 3),           # completes the reveal into the confident idle
    'idle': R('idle', *range(8)),
    'walk': R('run', *range(14)),                                    # no walk cycle on the sheet: run cycle, slower playback
    'walk_back': R('run', *range(13, -1, -1)),                       # reversed run cycle (documented reuse)
    'run': R('run', *range(14)),
    'dash': R('run', 2, 3, 9, 10),                                   # longest-stride run poses (ordinary dash)
    'rStep': R('run', 9, 10, 11, 12),                                # Smoke Step: the low sprint strides
    'jump': R('jump', 0, 1, 2, 3, 4),                                # take-off → rising stretch
    'doubleJump': R('jump', 5, 6, 7, 8, 9),                          # the cape-swirl flip (the sheet's "Double Jump")
    'fall': R('jump', 4, 3),                                         # hang / descend
    'land': R('land', *range(8)),                                    # full Landing sequence
    'crouch': R('land', 3),                                          # deepest landing crouch
    'guard': R('hack', 0),                                           # no guard art: braced cape-forward stance
    'hurt': R('hurt', 3, 4, 5),                                      # recoil
    'knockdown': R('hurt', 0, 1, 2, 3, 4, 5),                        # blast silhouette → flash → pale → recoil
    'lose': R('def', *range(19)),                                    # Defeated: flicker → pale → dissolve
    'win': R('idle', *range(8)),
    # ── normals ──
    'light': R('p1', *range(9)),                                     # Punch 1 — wind → spinning back-fist → recover
    'rJ2': R('p2', *range(6)),                                       # Punch 2 — advancing straight
    'rJ3': R('p3', *range(15)),                                      # Punch 3 — full acrobatic rising finisher
    'rLow': R('st2', 9, 10, 11) + R('land', 7),                      # low staff check (the ground-skimming thrust cells)
    'heavy': R('st1', *range(12)),                                   # Swinging Stick row 1 — draw → spin → horizontal sweep
    'up': R('st2', 0, 1, 2, 3, 4, 5),                                # Swinging Stick row 2 — rising pole-vault launcher
    'rAdv': R('st2', 6, 7, 8, 9, 10, 11) + R('st4', *range(5)),      # Row 2 low/advancing lunge → stow (committed ender)
    'air': R('ak', *range(9)),                                       # Midair Kick
    # ── specials ──
    'rBomb': R('thr', 4, 5, 6, 7, 8, 9, 10),                         # Bird's-Eye Bomb (ground): crouch → rise → release → stand
    'rAirBomb': R('thr', 0, 1, 2, 3),                                # air throw: the sheet's airborne leaping-throw cells
    'rSmoke': R('thr', 4, 5) + R('land', 5, 6, 7),                   # Smoke Drop: low drop at the feet → rise
    'rPlant': R('land', 1, 2, 3, 4, 5, 6, 7),                        # Dead Drop: crouch, plant, rise
    'rExpress': R('st3', *range(10)) + R('st4', *range(5)),          # Staff Express: lead-in → "Play 3 Times" flurry → stow
    'rRoof': R('st2', 0, 1, 2, 3, 4, 5) + R('thr', 11, 12, 13, 14),  # Rooftop Route: rising vault → acrobatic finish
    'rHack': R('hack', *range(12)),                                  # Remote Override (Hacking Computer)
    # ── ultimate beats ──
    'ultOpen': R('st1', *range(12)),
    'ultPose': R('appear', 2),
    'ultFlurry': R('st3', 3, 4, 5, 6, 7, 8),
    'ultRise': R('st2', 1, 2, 3, 4, 5),
    'ultHack': R('hack', *range(12)),
    'ultLeap': R('thr', 11, 12, 13, 14),
    'ultLand': R('land', *range(8)),
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard', 'dash', 'win'}
SPEED = {'idle': 7, 'walk': 6, 'walk_back': 6, 'run': 3, 'dash': 3, 'jump': 4, 'doubleJump': 3, 'fall': 6, 'land': 2, 'rStep': 3, 'hurt': 5,
         'knockdown': 5, 'lose': 5, 'intro': 14, 'introSettle': 9, 'win': 8, 'crouch': 8, 'guard': 8}


def contact(names, cells, imgs, path, S=2, per=10, title=''):
    colw = max(cells[n]['rect'][2] for n in names) * S + 12
    rowh = max(cells[n]['rect'][3] for n in names) * S + 30
    rows = (len(names) + per - 1) // per
    img = Image.new('RGB', (per * colw, rows * rowh + 22), (38, 43, 54))
    d = ImageDraw.Draw(img); d.text((6, 6), title, fill='white')
    for i, n in enumerate(names):
        x = i % per * colw; y = 22 + i // per * rowh
        d.text((x + 3, y + 2), f'{n}', fill='white')
        im = imgs[n]; big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        bg = Image.new('RGB', big.size, (92, 128, 104) if i % 2 else (72, 92, 128)); bg.paste(big, (0, 0), big)
        img.paste(bg, (x + 3, y + 16))
        if 'anchor' in cells[n]:
            ax, ay = cells[n]['anchor']; cx, cy = x + 3 + ax * S, y + 16 + min(ay, im.height) * S - 1
            d.line([cx - 5, cy, cx + 5, cy], fill=(255, 50, 50)); d.line([cx, cy - 8, cx, cy], fill=(255, 50, 50))
    img.save(path)


def filmstrips(strips, rows, path, S=1):
    maxn = max(strips[k].width // FW for k in rows)
    cw, ch = FW * S, FH * S + 14
    img = Image.new('RGB', (cw * maxn, ch * len(rows)), (40, 44, 52)); d = ImageDraw.Draw(img)
    for r, k in enumerate(rows):
        n = strips[k].width // FW
        for i in range(n):
            cell = strips[k].crop((FW * i, 0, FW * (i + 1), FH)).resize((cw, FH * S), Image.Resampling.NEAREST)
            x, y = cw * i, ch * r + 14
            bg = Image.new('RGB', cell.size, (70, 84, 110)); bg.paste(cell, (0, 0), cell); img.paste(bg, (x, y))
            ox = x + OX * S; d.line([ox, y, ox, y + FH * S], fill=(255, 60, 60)); d.line([x, y + OY * S, x + cw, y + OY * S], fill=(255, 220, 60))
        d.text((4, ch * r + 1), k, fill='white')
    img.save(path)


def pad_strip(cells_imgs, w, h, bottom=False):
    """FX strip: uniform cells, each frame centred (or bottom-aligned)."""
    s = Image.new('RGBA', (w * len(cells_imgs), h))
    for i, im in enumerate(cells_imgs):
        assert im.width <= w and im.height <= h, ('fx overflow', im.size, w, h)
        s.paste(im, (i * w + (w - im.width) // 2, (h - im.height) if bottom else (h - im.height) // 2))
    return s


def main():
    assert sha(SRC) == SHA, 'Robin sheet hash changed'
    im, a, lab, comps = components()
    frames, text = assign(comps, a, lab)
    for d in ['cells', 'icons', 'cutscene', 'fx']: (OUT / d).mkdir(parents=True, exist_ok=True)
    DOC.mkdir(parents=True, exist_ok=True)
    imgs, cells = {}, {}
    body_bands = {pre for pre, *_ in BANDS}
    floors = {}
    for pre, y0, y1, xs, _ in BANDS:
        ys = []
        for k in range(len(xs)):
            m = np.isin(lab, frames[f'{pre}{k}']); yy = np.where(m)[0]; ys.append(int(yy.max()) + 1)
        floors[pre] = max(ys)
    for name, ids in frames.items():
        rgba, rect, mask = cut_frame(a, lab, ids)
        img = Image.fromarray(rgba, 'RGBA'); imgs[name] = img
        pre = BAND_OF.get(name)
        kind = 'body' if pre in body_bands else 'fx' if pre in ('bomb', 'exp') else 'icon' if name.startswith('icon') else 'cutscene'
        c = dict(name=name, rect=rect, components=len(ids), opaquePixels=int(mask.sum()), kind=kind)
        if kind == 'body':
            ax = head_x(name, rgba, mask)
            c['anchor'] = [int(round(ax)) + ANCHOR_DX.get(name, 0), floors[pre] - rect[1]]
            c['groundGap'] = floors[pre] - (rect[1] + rect[3])
        cells[name] = c
        img.save(OUT / {'body': 'cells', 'fx': 'fx', 'icon': 'icons', 'cutscene': 'cutscene'}[kind] / f'{name}.png')
    # ── reach audit → cell fits every frame ──
    reach = {'left': 0, 'right': 0, 'up': 0, 'down': 0}
    for n, c in cells.items():
        if c['kind'] != 'body': continue
        ax, ay = c['anchor']; w, h = c['rect'][2:]
        reach['left'] = max(reach['left'], ax); reach['right'] = max(reach['right'], w - ax)
        reach['up'] = max(reach['up'], ay); reach['down'] = max(reach['down'], h - ay)
    assert reach['left'] <= OX and reach['right'] <= FW - OX and reach['up'] <= OY and reach['down'] <= FH - OY, reach
    # ── body strips ──
    anim, strips = {}, {}
    for action, ns in SEQ.items():
        strip = Image.new('RGBA', (FW * len(ns), FH))
        for i, n in enumerate(ns):
            ax, ay = cells[n]['anchor']; px, py = OX - ax, OY - ay; w, h = imgs[n].size
            assert px >= 0 and px + w <= FW and py >= 0 and py + h <= FH, ('frame overflow', action, n, px, py, w, h)
            strip.paste(imgs[n], (FW * i + px, py))
        strip.save(OUT / f'{action}.png'); strips[action] = strip
        anim[action] = {'sheet': f'./assets/robin/{action}.png', 'frames': len(ns), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': SPEED.get(action, 4),
                        'frameWidth': FW, 'frameHeight': FH}
    used = {n for v in SEQ.values() for n in v}
    # ── FX strips: bomb (1 cell) + the complete 11-cell explosion (uniform cells, centred on the blast core) ──
    exp = [imgs[f'exp{k}'] for k in range(11)]
    EW = max(i.width for i in exp) + 2; EH = max(i.height for i in exp) + 2
    pad_strip(exp, EW, EH, bottom=True).save(OUT / 'fx/explosion_strip.png')
    # SMOKE: derived from the supplied explosion's late cloud / debris cells (exp5..exp9) — same pixels and silhouettes,
    # remapped by luminance onto a separate muted grey-slate ramp with partial alpha (no new art, no blur).
    SM = [(52, 58, 70), (84, 92, 106), (120, 128, 142), (158, 166, 178), (196, 202, 210)]
    smoke = []
    for k in (5, 6, 7, 8, 9):
        q = np.array(exp[k]).copy(); op = q[..., 3] > 0
        lum = (0.3 * q[..., 0] + 0.59 * q[..., 1] + 0.11 * q[..., 2])
        idx = np.clip((lum / 256 * len(SM)).astype(int), 0, len(SM) - 1)
        for i, c in enumerate(SM): q[(idx == i) & op, :3] = c
        q[..., 3] = np.where(op, 200, 0)
        smoke.append(Image.fromarray(q, 'RGBA'))
    pad_strip(smoke, EW, EH, bottom=True).save(OUT / 'fx/smoke_strip.png')
    b = imgs['bomb0']; BW, BH = b.width + 2, b.height + 2
    pad_strip([b], BW, BH).save(OUT / 'fx/bomb_strip.png')
    fx = {'explosion': {'w': EW, 'h': EH, 'frames': 11}, 'smoke': {'w': EW, 'h': EH, 'frames': 5, 'from': 'exp5-exp9'}, 'bomb': {'w': BW, 'h': BH, 'frames': 1}}
    # ── cutscene bust + mask / mouth overlays (exact template placement on the bust) ──
    bust = np.array(imgs['bust']); overlays = {}
    for n in [k for k in imgs if k.startswith('mask') or k.startswith('mouth')]:
        o = np.array(imgs[n]); oh, ow = o.shape[:2]; best = None; m = o[..., 3] > 0
        for y in range(bust.shape[0] - oh + 1):
            for x in range(bust.shape[1] - ow + 1):
                win = bust[y:y + oh, x:x + ow]
                diff = int((win[m][:, :3].astype(int) != o[m][:, :3].astype(int)).any(-1).sum() + (win[m][:, 3] == 0).sum())
                if best is None or diff < best[0]: best = (diff, x, y)
        overlays[n] = {'x': best[1], 'y': best[2], 'w': ow, 'h': oh, 'mismatch': best[0], 'opaque': int(m.sum())}
    bi = imgs['bust']
    por = Image.new('RGBA', (128, 160)); por.paste(bi.resize((bi.width * 2, bi.height * 2), Image.Resampling.NEAREST), ((128 - bi.width * 2) // 2, 160 - bi.height * 2)); por.save(OUT / 'portrait.png')
    bi.save(OUT / 'cutscene/bust.png')
    im.crop(CREDIT).save(OUT / 'credit_panel.png')
    # ── health icons → named expressions ──
    ICONS = {'calm': [f'icon_r0_c{k}' for k in range(10)], 'grit': [f'icon_r1_c{k}' for k in range(6)],
             'shout': [f'icon_r2_c{k}' for k in range(6)], 'smirk': [f'icon_r3_c{k}' for k in range(6)],
             'daze': ['icon_daze0', 'icon_daze1'], 'down': ['icon_down']}
    iw = max(imgs[n].width for v in ICONS.values() for n in v) + 2; ih = max(imgs[n].height for v in ICONS.values() for n in v) + 2
    sheet = Image.new('RGBA', (iw * 10, ih * len(ICONS)))
    for r, (k, ns) in enumerate(ICONS.items()):
        for i, n in enumerate(ns):
            g = imgs[n]; sheet.paste(g, (iw * i + (iw - g.width) // 2, ih * r + (ih - g.height)))
    sheet.save(OUT / 'icons/expressions.png')
    meta_icons = {'w': iw, 'h': ih, 'rows': {k: [i, len(v)] for i, (k, v) in enumerate(ICONS.items())}}
    cut = {'bust': {'w': bi.width, 'h': bi.height}, 'overlays': overlays}
    (ROOT / 'robinSprites.js').write_text('// Generated by tools/robin/extract.py — do not hand-edit.\n'
                                         'export const ROBIN_ANIM = ' + json.dumps(anim, indent=1) + '\n'
                                         'export const ROBIN_ICONS = ' + json.dumps(meta_icons) + '\n'
                                         'export const ROBIN_CUTSCENE = ' + json.dumps(cut) + '\n'
                                         'export const ROBIN_FX = ' + json.dumps(fx) + '\n'
                                         'export const ROBIN_CELL = ' + json.dumps({'w': FW, 'h': FH, 'ox': OX, 'oy': OY}) + '\n')
    for n, c in cells.items(): c['usedIn'] = sorted(k for k, v in SEQ.items() if n in v)
    body = [n for n in cells if cells[n]['kind'] == 'body']
    unused = [n for n in body if n not in used]
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': SRC.name, 'sha256': SHA, 'size': [804, 1555], 'mode': 'RGB', 'key': list(KEY),
        'keyPolicy': 'exact RGB(77,109,243) only (also inside enclosed gaps); outlines (0,0,0) kept',
        'labels': LABELS, 'textComponents': len(text), 'creditPanel': list(CREDIT),
        'credit': 'Brought to you by... Mr. C — Credit? No / Permission? No (panel excluded from animation)',
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY}, 'reach': reach, 'bandFloors': floors,
        'anchorDx': ANCHOR_DX, 'cells': list(cells.values()), 'sequences': SEQ, 'unusedBodyCells': unused,
        'icons': meta_icons, 'cutscene': cut, 'fx': fx}, indent=1) + '\n')
    seen = []
    for pre, *_ in BANDS:
        seen += sorted([n for n in body if BAND_OF[n] == pre], key=lambda n: int(n[len(pre):]))
    contact(seen, cells, imgs, DOC / 'contact_sheet.png', per=15, title='Robin (robin) — every body cell; red = feet anchor (x: head centre)')
    others = [n for n in cells if cells[n]['kind'] != 'body']
    contact(others, cells, imgs, DOC / 'contact_sheet_fx_icons.png', S=3, per=11, title='Robin — bomb / explosion / health icons / cutscene pieces')
    filmstrips(strips, ['intro', 'introSettle', 'light', 'rJ2', 'rJ3', 'rLow', 'heavy', 'up', 'rAdv', 'rExpress', 'rRoof', 'air', 'rBomb', 'rAirBomb', 'rSmoke', 'rPlant', 'rHack', 'jump', 'doubleJump', 'land'], DOC / 'transitions.png')
    print(json.dumps({'counts': {pre: len(xs) for pre, _, _, xs, _ in BANDS}, 'bodyCells': len(body), 'other': len(others),
                      'text': len(text), 'unused': unused, 'reach': reach, 'overlays': overlays, 'floors': floors, 'fx': fx}, indent=1))


if __name__ == '__main__':
    main()
