#!/usr/bin/env python3
"""Beast Boy (Garfield "Gar" Logan) — Teen Titans GBA sheet extraction.

SOURCE IS READ-ONLY: "Game Boy Advance - Teen Titans - Playable Characters - Beast Boy.png" (1193x1254 RGB, sha256
below) is hash-checked and never written.

BACKGROUND POLICY: only the exact key colour RGB(77,109,243) is removed (no tolerance). The sheet has 69 colours and the
nearest other colour is 161 L1 away, so no blue/purple costume, hair or plumage pixel can be caught. Key pixels enclosed
by art (gaps between limbs, under the bird's wings) are the GBA transparent index and are removed too. Outlines (0,0,0)
are art. Nearest-neighbour only; no pixel is redrawn.

LABELS are pure-black text; black is also the outline colour, so a black-only component is text ONLY if it lies inside
one of the pinned label rectangles below (asserted: 244 glyph components, no non-black component touches a label).

FRAMES are 8-connected component unions assigned by explicit per-band x cuts. Every art component is assigned exactly
once (or to the credit panel); the script fails loudly otherwise.

ANCHORS (feet origin): feet = lowest outline row of the main body; x = head centre for humanoid cells, body centroid for
animal cells, then an explicit per-cell correction table (ANCHOR_DX) authored on the transition filmstrips
(docs/beast_boy/transitions.png) so a morph never makes the fighter visually teleport. Airborne animal cells (tiger
leap, bird flight) carry an explicit lift (ANCHOR_DY) relative to the shared ground line.

Usage: python3 tools/beast_boy/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Game Boy Advance - Teen Titans - Playable Characters - Beast Boy.png'
SHA = 'f261da2b027684cc7b60a43ea2bb239e22f22b20e9c7ae37286bc86a9d567984'
OUT = ROOT / 'assets/beast_boy'
DOC = ROOT / 'docs/beast_boy'
KEY = (77, 109, 243)

# Strip cell (feet origin OX, OY). Sized for the widest authored frame (Tiger Slash lunge, 125 px) and the tallest
# reach above the feet (bird climb / tiger leap) — asserted per frame.
FW, FH, OX, OY = 272, 136, 136, 112

# ── printed labels (black text), padded by 2 px for descenders / parentheses ──
LABELS = {
    'Appearing': (117, 0, 170, 14), 'Idle': (568, 60, 592, 72), 'Running': (597, 122, 640, 136), 'Jumping': (358, 178, 402, 192),
    'Landing': (489, 245, 530, 258), 'Punch 1': (440, 301, 482, 314), 'Punch 2': (333, 358, 376, 372), 'Gorilla Kick': (714, 418, 775, 432),
    'Changing into Triceratops (Reverse for Changing Back)': (207, 479, 354, 506), 'Triceratops Charging': (687, 538, 796, 552),
    'Aerial Kick': (430, 598, 488, 612), 'Changing into Bird (Reverse for Changing Back)': (163, 671, 308, 699),
    'Bird Flying': (355, 730, 410, 744), 'Tiger Slash': (1163, 790, 1193, 816), 'Hurt': (260, 856, 286, 868),
    'Defeated': (382, 910, 429, 922), 'Health Icon': (210, 972, 271, 987), 'Cutscenes': (52, 1148, 108, 1162),
}
CREDIT = (1024, 1113, 1193, 1254)   # "Brought to you by... Mr. C" panel — Credit? No / Permission? No

# (prefix, y0, y1, x cuts, end) → frames prefix0.. between consecutive cuts (a component goes by its centre x)
BANDS = [
    ('appear', 0, 60, [0, 40, 80], 120),
    ('idle', 60, 116, [0, 40, 80, 120, 162, 204, 247, 289, 331, 372, 413, 453, 493, 533], 575),
    ('run', 116, 177, [0, 40, 85, 141, 193, 241, 275, 298, 335, 380, 439, 491, 539, 572], 600),
    ('jump', 177, 245, [0, 48, 89, 120, 152, 185, 216, 246, 281, 320], 365),
    ('land', 245, 301, [0, 36, 78, 126, 177, 228, 276, 323, 367, 411, 453], 495),
    ('p1', 301, 359, [0, 34, 72, 116, 166, 234, 300, 359, 405], 440),
    ('p2', 359, 415, [0, 46, 97, 165, 233, 293], 340),
    ('gor', 415, 476, [0, 39, 83, 133, 187, 241, 318, 397, 474, 528, 569, 623, 673], 720),
    ('trc', 476, 540, [0, 36, 76, 130], 205),
    ('tri', 540, 597, [0, 85, 173, 260, 346, 432, 518, 604], 690),
    ('ak', 597, 665, [0, 29, 65, 121, 180, 236, 283, 317, 352, 391], 435),
    ('brc', 665, 726, [0, 35, 79, 126], 170),
    ('bird', 726, 763, [0, 28, 58, 92, 123, 154, 185, 216, 251, 293, 324], 355),
    ('tig', 763, 849, [0, 35, 77, 129, 205, 309, 439, 564, 660, 757, 857, 956, 1032, 1084, 1126], 1162),
    ('hurt', 849, 911, [0, 43, 93, 142, 186, 226], 268),
    ('def', 911, 972, [0, 30, 62, 94, 127, 160, 193, 225, 257, 288, 319, 350], 380),
]
# Form of every body cell (drives anchors, hurtbox documentation and the per-form skin masks).
# morph_* = a transition cell: costume colours stay costume, the green/teal ramps belong to the arriving animal.
FORM = {}
for pre, _, _, xs, _ in BANDS:
    for k in range(len(xs)):
        FORM[f'{pre}{k}'] = 'human'
FORM.update({'gor2': 'morph_gorilla', 'gor11': 'morph_gorilla', **{f'gor{k}': 'gorilla' for k in range(3, 11)}})
FORM.update({'trc2': 'morph_tri', 'trc3': 'tri', **{f'tri{k}': 'tri' for k in range(8)}})
FORM.update({'brc2': 'morph_bird', 'brc3': 'bird', **{f'bird{k}': 'bird' for k in range(11)}})
FORM.update({'tig2': 'morph_tiger', 'tig12': 'morph_tiger', **{f'tig{k}': 'tiger' for k in range(3, 12)}})
# Pure-FX parts drawn INSIDE body cells (the gorilla's kick swoosh, the tiger's slash arcs) are classified per pixel by
# the skin build (neutral white/grey/black ramps → never recoloured); they are not separate components on this sheet.

# Per-cell anchor corrections (px, source pixels; + = toward facing). Authored on transitions.png so the torso / feet
# line carries through each morph. Animals that face right on the sheet keep their natural forward reach.
ANCHOR_DX = {
    'gor2': 0, 'gor3': -4, 'gor4': -6, 'gor5': -14, 'gor6': -16, 'gor7': -16, 'gor8': -10, 'gor9': -4, 'gor10': -4, 'gor11': 0,
    'trc2': 0, 'trc3': 0, **{f'tri{k}': 0 for k in range(8)},
    'brc2': 6, 'brc3': 6,
    'tig2': 0, 'tig3': -10, 'tig4': -18, 'tig5': -26, 'tig6': -22, 'tig7': -18, 'tig8': -20, 'tig9': -22, 'tig10': -22, 'tig11': -18,
    'tig12': 0,
}
ANCHOR_DY = {}   # lift above the shared ground line (sheet frames sit on a baseline already; kept explicit for audits)


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def inside(c, r):
    return c['x'] >= r[0] and c['y'] >= r[1] and c['x'] + c['w'] <= r[2] and c['y'] + c['h'] <= r[3]


def overlaps(c, r):
    return c['x'] < r[2] and c['x'] + c['w'] > r[0] and c['y'] < r[3] and c['y'] + c['h'] > r[1]


def components():
    im = Image.open(SRC)
    assert im.size == (1193, 1254) and im.mode == 'RGB', (im.size, im.mode)
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


def assign(comps):
    global LAB
    text, frames = [], {}
    for c in comps:
        if c['black'] and any(inside(c, r) for r in LABELS.values()):
            text.append(c['id']); c['role'] = 'text'; continue
        for r in LABELS.values():   # bbox overlap with a neighbouring label is fine; an art PIXEL inside a label is not
            if overlaps(c, r): assert not (LAB[r[1]:r[3], r[0]:r[2]] == c['id']).any(), ('art pixel inside a label', c, r)
        if inside(c, CREDIT):
            c['role'] = 'credit'; continue
        cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
        name = None
        if 972 <= c['y'] < 1148 and c['x'] < 210:                       # Health Icon grid (+ daze sparkles)
            if c['n'] < 30: name = 'icon_daze%d' % (0 if cx < 38 else 1)   # sparkle specks around the dazed heads
            else:
                r = (c['y'] - 975 + 3) // 29
                if r < 4: name = 'icon_r%d_c%d' % (r, int((c['x'] - 1 + 4) // (30 if r < 3 else 32)))
                elif r == 4: name = 'icon_daze%d' % (0 if cx < 38 else 1)
                else: name = 'icon_down'
        elif c['y'] >= 1148 and c['x'] < 130:                            # cutscene bust + face overlays
            if c['h'] > 50: name = 'bust'
            elif c['y'] < 1233: name = 'eye%d' % {1: 0, 18: 1, 32: 2, 49: 3}[c['x']]
            else: name = 'mouth%d' % ((c['x'] - 1) // 42)
        else:
            for pre, y0, y1, xs, end in BANDS:
                if not (y0 <= cy < y1): continue
                cuts = xs + [end]
                for k in range(len(xs)):
                    if cuts[k] <= cx < cuts[k + 1]: name = f'{pre}{k}'; break
                if name: break
        assert name, ('unassigned component', c)
        c['role'] = name
        frames.setdefault(name, []).append(c['id'])
    assert len(text) == 244, len(text)   # every glyph incl. the 4 parentheses
    for pre, _, _, xs, _ in BANDS:
        for k in range(len(xs)): assert f'{pre}{k}' in frames, ('empty frame', pre, k)
    return frames, text


SKIN = {(184, 248, 200), (64, 248, 144), (0, 168, 104)}   # Gar's face ramp (light) — used only to find the head centre


def cut_frame(a, lab, ids):
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    rgba[..., :3] = a[y0:y1, x0:x1]
    rgba[..., 3] = np.where(m[y0:y1, x0:x1], 255, 0)
    return rgba, [x0, y0, x1 - x0, y1 - y0], m[y0:y1, x0:x1]


def body_anchor(name, rgba, mask, band_floor):
    """→ [ax, ay] in cell pixels. ay = the band's shared ground line (sheet frames stand on one baseline per band, so
    jump/leap/flight heights stay authored); ax = head centre (human) or body centroid (animal) + ANCHOR_DX."""
    form = FORM[name]
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    main = lab == (int(np.argmax(sizes)) + 1)
    rgb = rgba[..., :3]
    if form == 'human':
        hair = ((rgb == (0, 232, 224)).all(-1) | (rgb == (0, 144, 144)).all(-1)) & main
        src = hair if hair.sum() > 12 else main
        ys, xs = np.where(src); top = ys.min(); sel = ys < top + 12
        hx = float(xs[sel].mean())
    else:
        ys, xs = np.where(main); hx = float(xs.mean())
    return [int(round(hx)) + ANCHOR_DX.get(name, 0), band_floor + ANCHOR_DY.get(name, 0)]


# ── animation strips (engine action → ordered cells). Rationale per action: docs/beast_boy/MOVE_FRAME_MAP.md ──
R = lambda pre, *ks: [f'{pre}{k}' for k in ks]
SEQ = {
    'intro': R('appear', 0, 1, 2),                                  # Appearing (dissolve-in → flash → solid), then Idle
    'idle': R('idle', *range(14)),
    'walk': R('run', *range(14)),                                   # no walk cycle on the sheet: run cycle, slower playback
    'walk_back': R('run', *range(13, -1, -1)),                      # reversed run cycle (documented reuse)
    'run': R('run', *range(14)),
    'dash': R('run', 2, 3, 4, 9, 10),                               # longest-stride run poses
    'jump': R('jump', 0, 1, 2, 3, 4),
    'fall': R('jump', 5, 6, 7, 8, 9),
    'land': R('land', *range(11)),                                  # full Landing sequence (crouch → rise)
    'crouch': R('land', 4),                                         # no crouch art: the deepest landing crouch
    'guard': R('p1', 0),                                            # no guard art: Punch 1's ready cover pose
    'hurt': R('hurt', 1, 2, 3, 4, 5),                               # white flash → pale → recoil (flash is cosmetic)
    'knockdown': R('hurt', 0, 1, 3, 4, 5),
    'lose': R('def', *range(12)),                                   # Defeated: flicker → pale → stripe dissolve
    'win': R('appear', 2) + R('idle', 0),                           # confident ready pose (no separate victory art)
    # humanoid normals
    'light': R('p2', 1, 2, 5),                                     # J1 Quick Jab (Punch 2: smear start → extension → recover)
    'bJ2': R('p1', 1, 2, 4, 7),                                     # J2 Long Straight (Punch 1 wind → smear → extension → recover)
    'bJ3': R('p2', 0, 1, 2, 3, 4, 5),                               # J3 Turning Finish (Punch 2 complete: turned smear → drive)
    'heavy': R('p1', *range(9)),                                    # Full Stretch (Punch 1 complete incl. the turned stretch)
    'bLow': R('ak', 1, 2, 3, 5),                                    # Ankle Check: Aerial Kick's low horizontal leg poses (grounded reuse)
    'up': R('land', 4) + R('ak', 5, 6, 9),                          # Rising Kick: crouch → rising knee/leg → upright
    'air': R('ak', *range(7)),                                      # Aerial Kick
    'bAdv': R('run', 9, 10) + R('p2', 1, 2, 5),                     # Forward+Heavy advancing jab
    'bStr': R('p1', 1, 2, 4, 5, 7),                                 # → fresh Heavy straight
    'bKnock': R('p1', 2, 3, 4, 5, 6, 7, 8),                         # → fresh Heavy knock-away (turn → full stretch)
    # animal specials (transform → one strike → return), see TRANSFORM CONTRACT in beastBoyData.js
    'gorilla': R('gor', *range(13)),                                # GORILLA BREAK (full Gorilla Kick sequence)
    'tricera': R('trc', 0, 1, 2, 3) + R('tri', *range(8)) + R('trc', 3, 2, 1, 0),   # TRICERATOPS DRIVE (morph → charge loop → reverse)
    'tiger': R('tig', *range(15)),                                  # TIGER CROSS (complete Tiger Slash incl. morph + return)
    'tigerAir': R('tig', 2, 3, 5, 6, 7),                            # aerial Tiger: morph → leap/slash poses (airborne cells of the same sequence)
    'tigerLand': R('tig', 8, 9, 10, 11, 12, 13, 14),                # its landing recovery: tiger settle → morph back → human
    'bird': R('brc', 0, 1, 2, 3) + R('bird', *range(11)) + R('brc', 3, 2, 1, 0),   # BIRD INTERCEPT as one strip (morph → flight → reverse)
    'birdIn': R('brc', 0, 1, 2, 3),                                 # BIRD INTERCEPT entry (morph)
    'birdFly': R('bird', *range(11)),                               # its flight arc (supplied flying poses)
    'birdOut': R('brc', 3, 2, 1, 0),                                # reverse morph (sheet: "Reverse for Changing Back")
    'feint': R('run', 13, 12) + R('p1', 0) + R('idle', 0),          # FALSE START (sidestep / ready; humanoid)
    # ultimate beats
    'ultOpen': R('p2', 0, 1, 2, 3, 4, 5),
    'ultGorilla': R('gor', *range(13)), 'ultBirdIn': R('brc', 0, 1, 2, 3), 'ultBird': R('bird', *range(11)),
    'ultTiger': R('tig', *range(15)), 'ultTri': R('trc', 0, 1, 2, 3) + R('tri', *range(8)) + R('trc', 3, 2, 1, 0),
    'ultPose': R('appear', 2),
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard', 'dash', 'birdFly'}
SPEED = {'idle': 6, 'walk': 6, 'walk_back': 6, 'run': 4, 'dash': 4, 'jump': 4, 'fall': 5, 'land': 2, 'hurt': 4,
         'knockdown': 5, 'lose': 6, 'intro': 10, 'win': 12, 'crouch': 8, 'guard': 8}


def contact(names, cells, imgs, path, S=2, per=10, title=''):
    colw = max(cells[n]['rect'][2] for n in names) * S + 12
    rowh = max(cells[n]['rect'][3] for n in names) * S + 30
    rows = (len(names) + per - 1) // per
    img = Image.new('RGB', (per * colw, rows * rowh + 22), (38, 43, 54))
    d = ImageDraw.Draw(img); d.text((6, 6), title, fill='white')
    for i, n in enumerate(names):
        x = i % per * colw; y = 22 + i // per * rowh
        d.text((x + 3, y + 2), f'#{i} {n} {FORM.get(n, "")}', fill='white')
        im = imgs[n]; big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        bg = Image.new('RGB', big.size, (92, 128, 104) if i % 2 else (72, 92, 128)); bg.paste(big, (0, 0), big)
        img.paste(bg, (x + 3, y + 16))
        if 'anchor' in cells[n]:
            ax, ay = cells[n]['anchor']; cx, cy = x + 3 + ax * S, y + 16 + min(ay, im.height) * S - 1
            d.line([cx - 5, cy, cx + 5, cy], fill=(255, 50, 50)); d.line([cx, cy - 8, cx, cy], fill=(255, 50, 50))
    img.save(path)


def filmstrips(strips, path, S=2):
    """Each animal action laid out frame-by-frame on ONE shared feet origin, with the origin line drawn — the review
    sheet used to author ANCHOR_DX (no visual teleport through a morph)."""
    rows = [k for k in ['gorilla', 'tricera', 'tiger', 'birdIn', 'birdFly', 'birdOut', 'light', 'heavy', 'air']]
    maxn = max(strips[k].width // FW for k in rows)
    cw, ch = FW * S // 2, FH * S // 2 + 14
    img = Image.new('RGB', (cw * maxn, ch * len(rows)), (40, 44, 52)); d = ImageDraw.Draw(img)
    for r, k in enumerate(rows):
        n = strips[k].width // FW
        for i in range(n):
            cell = strips[k].crop((FW * i, 0, FW * (i + 1), FH)).resize((cw, FH * S // 2), Image.Resampling.NEAREST)
            x, y = cw * i, ch * r + 14
            bg = Image.new('RGB', cell.size, (70, 84, 110)); bg.paste(cell, (0, 0), cell); img.paste(bg, (x, y))
            ox = x + OX * S // 2; d.line([ox, y, ox, y + FH * S // 2], fill=(255, 60, 60)); d.line([x, y + OY * S // 2, x + cw, y + OY * S // 2], fill=(255, 220, 60))
        d.text((4, ch * r + 1), k, fill='white')
    img.save(path)


def main():
    assert sha(SRC) == SHA, 'Beast Boy sheet hash changed'
    im, a, lab, comps = components()
    global LAB
    LAB = lab
    frames, text = assign(comps)
    for d in ['cells', 'icons', 'cutscene']: (OUT / d).mkdir(parents=True, exist_ok=True)
    DOC.mkdir(parents=True, exist_ok=True)
    imgs, cells = {}, {}
    band_of = {f'{pre}{k}': (y0, y1) for pre, y0, y1, xs, _ in BANDS for k in range(len(xs))}
    # shared ground line per band = the lowest outline row of the band's grounded frames (sheet baseline)
    floors = {}
    for pre, y0, y1, xs, _ in BANDS:
        ys = []
        for k in range(len(xs)):
            ids = frames[f'{pre}{k}']; m = np.isin(lab, ids); yy = np.where(m)[0]; ys.append(int(yy.max()) + 1)
        floors[pre] = max(ys)
    for name, ids in frames.items():
        rgba, rect, mask = cut_frame(a, lab, ids)
        img = Image.fromarray(rgba, 'RGBA'); imgs[name] = img
        kind = 'body' if name in band_of else 'icon' if name.startswith('icon') else 'cutscene'
        c = dict(name=name, rect=rect, components=[[comps[i - 1]['x'], comps[i - 1]['y']] for i in sorted(ids)],
                 opaquePixels=int(mask.sum()), kind=kind)
        if kind == 'body':
            pre = next(p for p, *_ in BANDS if name.startswith(p) and name[len(p):].isdigit())
            c['form'] = FORM[name]
            c['anchor'] = body_anchor(name, rgba, mask, floors[pre] - rect[1])
            c['groundGap'] = floors[pre] - (rect[1] + rect[3])     # >0 = authored airborne pose above the band baseline
        cells[name] = c
        img.save(OUT / {'body': 'cells', 'icon': 'icons', 'cutscene': 'cutscene'}[kind] / f'{name}.png')
    dup = {}
    names = list(cells)
    for i, n in enumerate(names):
        for m in names[:i]:
            if imgs[n].size == imgs[m].size and imgs[n].tobytes() == imgs[m].tobytes(): dup[n] = m; break
    # ── body strips ──
    anim, strips = {}, {}
    for action, ns in SEQ.items():
        strip = Image.new('RGBA', (FW * len(ns), FH))
        for i, n in enumerate(ns):
            ax, ay = cells[n]['anchor']; px, py = OX - ax, OY - ay; w, h = imgs[n].size
            assert px >= 0 and px + w <= FW and py >= 0 and py + h <= FH, ('frame overflow', action, n, px, py, w, h)
            strip.paste(imgs[n], (FW * i + px, py))
        strip.save(OUT / f'{action}.png'); strips[action] = strip
        anim[action] = {'sheet': f'./assets/beast_boy/{action}.png', 'frames': len(ns), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': SPEED.get(action, 4),
                        'frameWidth': FW, 'frameHeight': FH}
    used = {n for v in SEQ.values() for n in v}
    # per-strip per-frame form (render / skin audit / hurtbox docs)
    forms = {k: [FORM[n] for n in v] for k, v in SEQ.items()}
    # ── cutscene bust + face overlays (exact template placement on the bust) ──
    bust = np.array(imgs['bust']); overlays = {}
    for n in ['eye0', 'eye1', 'eye2', 'eye3', 'mouth0', 'mouth1', 'mouth2']:
        o = np.array(imgs[n]); oh, ow = o.shape[:2]; best = None; m = o[..., 3] > 0
        for y in range(bust.shape[0] - oh + 1):
            for x in range(bust.shape[1] - ow + 1):
                win = bust[y:y + oh, x:x + ow]
                diff = int((win[m][:, :3].astype(int) != o[m][:, :3].astype(int)).any(-1).sum() + (win[m][:, 3] == 0).sum())
                if best is None or diff < best[0]: best = (diff, x, y)
        overlays[n] = {'x': best[1], 'y': best[2], 'w': ow, 'h': oh, 'mismatch': best[0], 'opaque': int(m.sum())}
    por = Image.new('RGBA', (128, 128)); b = imgs['bust']
    por.paste(b.resize((b.width * 2, b.height * 2), Image.Resampling.NEAREST), ((128 - b.width * 2) // 2, 128 - b.height * 2)); por.save(OUT / 'portrait.png')
    b.save(OUT / 'cutscene/bust.png')
    im.crop(CREDIT).save(OUT / 'credit_panel.png')
    # ── health icons → named expressions ──
    ICONS = {'grin': [f'icon_r0_c{k}' for k in range(7)], 'blink': [f'icon_r1_c{k}' for k in range(4)],
             'smirk': [f'icon_r2_c{k}' for k in range(4)], 'strain': [f'icon_r3_c{k}' for k in range(4)],
             'daze': ['icon_daze0', 'icon_daze1'], 'down': ['icon_down']}
    # daze sparkles are separate components: merge them onto their head (same source offsets)
    def merged(ns):
        boxes = [cells[n]['rect'] for n in ns]
        x0 = min(r[0] for r in boxes); y0 = min(r[1] for r in boxes); x1 = max(r[0] + r[2] for r in boxes); y1 = max(r[1] + r[3] for r in boxes)
        return x0, y0, x1, y1
    icon_imgs = {}
    for k, ns in ICONS.items():
        for n in ns: icon_imgs[n] = imgs[n]
    iw = max(i.width for i in icon_imgs.values()) + 2; ih = max(i.height for i in icon_imgs.values()) + 2
    sheet = Image.new('RGBA', (iw * 7, ih * len(ICONS)))
    for r, (k, ns) in enumerate(ICONS.items()):
        for i, n in enumerate(ns):
            g = icon_imgs[n]; sheet.paste(g, (iw * i + (iw - g.width) // 2, ih * r + (ih - g.height)))
    sheet.save(OUT / 'icons/expressions.png')
    meta_icons = {'w': iw, 'h': ih, 'rows': {k: [i, len(v)] for i, (k, v) in enumerate(ICONS.items())}}
    cut = {'bust': {'w': b.width, 'h': b.height}, 'overlays': overlays}
    (ROOT / 'beastBoySprites.js').write_text('// Generated by tools/beast_boy/extract.py — do not hand-edit.\n'
                                            'export const BEAST_BOY_ANIM = ' + json.dumps(anim, indent=1) + '\n'
                                            'export const BEAST_BOY_FORMS = ' + json.dumps(forms) + '\n'
                                            'export const BEAST_BOY_ICONS = ' + json.dumps(meta_icons) + '\n'
                                            'export const BEAST_BOY_CUTSCENE = ' + json.dumps(cut) + '\n')
    for n, c in cells.items(): c['usedIn'] = sorted(k for k, v in SEQ.items() if n in v)
    body = [n for n in cells if cells[n]['kind'] == 'body']
    unused = [n for n in body if n not in used]
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': SRC.name, 'sha256': SHA, 'size': [1193, 1254], 'mode': 'RGB', 'key': list(KEY),
        'keyPolicy': 'exact RGB(77,109,243) only (also inside enclosed gaps); nearest other colour 161 L1 away; outlines (0,0,0) kept',
        'labels': LABELS, 'textComponents': len(text), 'creditPanel': list(CREDIT),
        'credit': 'Brought to you by... Mr. C — Credit? No / Permission? No (panel excluded from animation)',
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY}, 'bandFloors': floors,
        'anchorDx': ANCHOR_DX, 'cells': list(cells.values()), 'sequences': SEQ, 'forms': forms, 'duplicates': dup,
        'unusedBodyCells': unused, 'icons': meta_icons, 'cutscene': cut}, indent=1) + '\n')
    seen = []
    for pre, *_ in BANDS:
        seen += sorted([n for n in body if n.startswith(pre) and n[len(pre):].isdigit()], key=lambda n: int(n[len(pre):]))
    contact(seen, cells, imgs, DOC / 'contact_sheet.png', per=15, title='Beast Boy (beast_boy) — numbered body cells + form; red = feet anchor (x: head centre / body centroid + ANCHOR_DX)')
    others = [n for n in cells if cells[n]['kind'] != 'body']
    contact(others, cells, imgs, DOC / 'contact_sheet_icons_cutscene.png', S=3, per=8, title='Beast Boy — health icons / cutscene bust + face pieces')
    filmstrips(strips, DOC / 'transitions.png')
    counts = {pre: len(xs) for pre, _, _, xs, _ in BANDS}
    print(json.dumps({'counts': counts, 'bodyCells': len(body), 'other': len(others), 'duplicates': dup, 'unused': unused,
                      'overlays': overlays, 'floors': floors}, indent=1))


if __name__ == '__main__':
    main()
