#!/usr/bin/env python3
# TERRASPIN (Galapagus) — READY-alien slicer for the Fun-tech.tk sheet (assets/sprites/ben10/aliens/terraspin.png, 480×800,
# copied from the owner's download "2148577_orig.png"; found by contact sheet — olive turtle, hex shell, green Omnitrix dot,
# white spin-wind frames — and NOT the Brainstorm sheet 802271_orig.png).
#   python3 tools/ben10/slice_terraspin.py
# HIGH-RES CARTOON ART (not pixel art): pixels are copied 1:1 — no blur, no filter, no resample. Scaling happens at render
# time through the engine's standard path (spriteScale × actionScale, image smoothing off).
# KEY: background = solid blue (0,0,255), keyed EXACTLY (zero tolerance; all four corners asserted). The art is anti-aliased
# and saved lossy against the blue, so the blue-blend edge (B − max(R,G) ≥ 40 within 2 px of the background) is removed as a
# halo — never art. Collision check: his palette (olive / dark green / yellow-olive / white wind / green Omnitrix) is far from
# blue-dominant (interior 99th percentile asserted); 13 isolated lossy blue specks ≥ 3 px inside the art (wind gaps and two
# outline specks) are KEPT untouched and listed in the ledger. White wind streaks are never blue-dominant and are never keyed.
# TEXT: "Fun-tech.tk" (near-black) and "Ben 10 / Game creator" (cyan) glyphs inside the top-right text box: removed, not art.
# CUT: 8-connected components; every detached piece (wind-streak tips / single pixels) is merged into the figure of the same
# grid column whose box (+16 px) contains it, so a spin frame is ONE component (shell + streaks); nothing is cropped.
# ANCHOR: standing / curled frames: feet = lowest body row (bottom of the legs), centre = mean column of the bottom 12 body rows.
# SPIN frames (Col 2 R7–8, Col 3 R1–3): the shell's centre (centroid of the non-wind pixels) + a CONSISTENT hover offset = the
# median feet-to-body-centre distance of the standing frames, so a spinning shell rides at the same height as his standing body.
# Deterministic: re-running is byte-identical.
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/terraspin.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/terraspin')
BG = (0, 0, 255)
HALO_D = 40
TEXT_BOX = (0, 336, 116, 480)   # y0, x0, y1, x1 of the two credit text lines
ACTION_SCALE = 0.66       # ~80 px native body → ≈125 px on screen (Ben's spriteScale 2.0 × global 1.18 × 0.66): about human Ben's
                          # height, ≈ 140 px wide (turtle-wide and low). A fixed engine scale, smoothing off.
PREFIX = 'ben10_terraspin_ready_'
SPIN = {('c2', 6), ('c2', 7), ('c3', 0), ('c3', 1), ('c3', 2)}
KEPT_SPECKS = []


def load():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    assert tuple(a[0, 0]) == tuple(a[0, -1]) == tuple(a[-1, 0]) == tuple(a[-1, -1]) == BG, 'corners must be the key colour'
    return a


def masks(a):
    key = (a == BG).all(2)
    d = a[..., 2] - np.maximum(a[..., 0], a[..., 1])
    pocket = ~key & (a[..., 0] <= 60) & (a[..., 1] <= 60) & (a[..., 2] >= 200)
    bgish = key | pocket
    dist = ndimage.distance_transform_cdt(~bgish, metric='chessboard')
    halo = ~key & (pocket | ((d >= HALO_D) & (dist <= 2)))
    fg = ~key & ~halo
    deep = ~bgish & (dist >= 3) & (d >= HALO_D)
    assert deep.sum() <= 13, f'{int(deep.sum())} interior pixels reach the halo threshold (palette collision)'
    assert np.percentile(d[fg], 99) <= 25, 'palette drifted toward blue'
    KEPT_SPECKS[:] = [[int(x), int(y), *map(int, a[y, x])] for y, x in zip(*np.where(deep))]
    return key, halo, fg


def is_wind(px):   # white wind-streak pixels
    return (px[:, 0] > 170) & (px[:, 1] > 170) & (px[:, 2] > 150)


def components(a, fg):
    lbl, n = ndimage.label(fg, structure=np.ones((3, 3)))
    comps = []
    for i, s in enumerate(ndimage.find_objects(lbl)):
        m = lbl[s] == i + 1
        ys, xs = np.where(m); ys = ys + s[0].start; xs = xs + s[1].start
        comps.append(dict(y0=int(ys.min()), x0=int(xs.min()), y1=int(ys.max()), x1=int(xs.max()), ys=ys, xs=xs, n=len(ys)))
    bodies = [c for c in comps if c['n'] >= 1000]
    text, merged = [], []
    for c in comps:
        if c['n'] >= 1000: continue
        ty0, tx0, ty1, tx1 = TEXT_BOX
        if c['y0'] >= ty0 and c['y1'] < ty1 and c['x0'] >= tx0 and c['x1'] < tx1:
            px = a[c['ys'], c['xs']]
            black = (px.max(1) <= 90); cyan = (px[:, 0] <= 60) & (px[:, 1] >= 40)   # cyan glyphs + their blue-cyan blends
            assert (black | cyan).all(), 'text glyph with an unexpected colour'
            text.append(c); continue
        host = [b for b in bodies if c['y0'] >= b['y0'] - 16 and c['y1'] <= b['y1'] + 16 and c['x0'] >= b['x0'] - 16 and c['x1'] <= b['x1'] + 16]
        assert len(host) >= 1, f'unattached fragment @ {c["y0"]},{c["x0"]} ({c["n"]} px)'
        cy, cx = (c['y0'] + c['y1']) / 2, (c['x0'] + c['x1']) / 2
        b = min(host, key=lambda b: abs((b['y0'] + b['y1']) / 2 - cy) + abs((b['x0'] + b['x1']) / 2 - cx))
        b['ys'] = np.concatenate([b['ys'], c['ys']]); b['xs'] = np.concatenate([b['xs'], c['xs']]); b['n'] += c['n']
        b['y0'] = min(b['y0'], c['y0']); b['y1'] = max(b['y1'], c['y1']); b['x0'] = min(b['x0'], c['x0']); b['x1'] = max(b['x1'], c['x1'])
        merged.append(c)
    return bodies, text, merged


def grid(bodies):
    cols = {'c1': [], 'c2': [], 'c3': []}
    for b in bodies:
        cx = (b['x0'] + b['x1']) / 2
        cols['c1' if cx < 100 else 'c2' if cx < 205 else 'c3'].append(b)
    for k in cols: cols[k].sort(key=lambda b: b['y0'])
    assert [len(cols[k]) for k in ('c1', 'c2', 'c3')] == [9, 8, 5], [len(v) for v in cols.values()]
    return cols


def body_px(a, b):
    px = a[b['ys'], b['xs']]
    m = ~is_wind(px)
    if not m.any() or m.sum() < 0.2 * len(px): m = np.ones(len(px), bool)   # the all-white silhouette: whole outline = body
    return m


def standing_anchor(a, b):
    m = body_px(a, b)
    feet = int(b['ys'][m].max())
    sel = m & (b['ys'] >= feet - 11)
    return float(b['xs'][sel].mean()), feet


HOVER = [0]


def anchor(a, b, gi):
    if gi in SPIN:
        m = body_px(a, b)
        return float(b['xs'][m].mean()), int(round(b['ys'][m].mean() + HOVER[0]))
    return standing_anchor(a, b)


def mask_of(a, b, flip=False):
    m = np.zeros((b['y1'] - b['y0'] + 1, b['x1'] - b['x0'] + 1), bool)
    m[b['ys'] - b['y0'], b['xs'] - b['x0']] = True
    return m[:, ::-1] if flip else m


def iou(m1, m2):
    H = max(m1.shape[0], m2.shape[0]); W = max(m1.shape[1], m2.shape[1]); best = 0
    p1 = np.zeros((H, W), bool); p1[H - m1.shape[0]:, :m1.shape[1]] = m1
    for dx in range(0, W - m2.shape[1] + 1):
        for dy in range(0, H - m2.shape[0] + 1):
            p2 = np.zeros((H, W), bool); p2[dy:dy + m2.shape[0], dx:dx + m2.shape[1]] = m2
            best = max(best, (p1 & p2).sum() / (p1 | p2).sum())
    return best


TURN = [('c1', i) for i in range(7)]                                # Col 1 R1→R7: front → three-quarter → side / back → front
WALK = [('c1', 0), ('c1', 7), ('c1', 6), ('c1', 7)]               # front frames cycled (no walk art)
SPINF = [('c2', 6), ('c2', 7)]
CYCL = [('c3', 0), ('c3', 1), ('c3', 2)]
A = {
    'idle':        ([('c1', 0), ('c1', 7), ('c1', 6), ('c1', 7)], True, 12, 'Col 1 R1 / R8 / R7 front stance, slow bob'),
    'walk':        (WALK, True, 7, 'front frames Col 1 R1 / R8 / R7 / R8 CYCLED (no walk art; the waddle is the bob)'),
    'walk_back':   (WALK[::-1], True, 8, 'the cycled front frames reversed'),
    'run':         (WALK, True, 4, 'the cycled front frames, faster'),
    'dash':        (SPINF, True, 2, 'Col 2 R7–R8 shell spin (no dash art)'),
    'turn':        (TURN, False, 3, 'Col 1 R1→R7 turn: front → three-quarter → side / back shell → front'),
    'jump':        ([('c2', 3)], False, 6, 'Col 2 R4 arms spread wide (jump rise)'),
    'doubleJump':  (SPINF, True, 3, 'Col 2 R7–R8 shell spin (spin-jump)'),
    'fall':        ([('c2', 3)], False, 6, 'Col 2 R4 arms spread (gliding fall)'),
    'crouch':      ([('c1', 8)], False, 6, 'Col 1 R9 curled into the shell (crouch)'),
    'guard':       ([('c1', 0)], False, 6, 'Col 1 R1 standing (no block art)'),
    'blockHit':    ([('c2', 0)], False, 6, 'Col 2 R1 shell turned toward the hit'),
    'transform':   ([('c3', 4), ('c1', 0)], False, 6, 'white silhouette flash → Col 1 R1 stance'),
    'taunt':       ([('c2', 4)], False, 10, 'Col 2 R5 arm raised high'),
    'win':         ([('c2', 4), ('c2', 3)], True, 16, 'Col 2 R5 arm raised ↔ Col 2 R4 arms spread (no win art)'),
    'lose':        ([('c1', 8)], False, 6, 'Col 1 R9 curled (no lose art)'),
    'hurt':        ([('c1', 4)], False, 6, 'Col 1 R5 shell-side curl (no hit art)'),
    'hurt_air':    ([('c1', 3)], False, 6, 'Col 1 R4 back-shell curl (no air-hit art)'),
    'knockdown':   ([('c1', 8)], False, 6, 'Col 1 R9 curled (no knockdown art)'),
    'getup':       ([('c1', 5), ('c1', 6)], False, 6, 'Col 1 R6 → R7 uncurling to the front (no get-up art)'),
    'dizzy':       ([('c1', 4), ('c1', 3)], True, 10, 'Col 1 R5 ↔ R4 shell wobble (no dizzy art)'),
    'light':       ([('c2', 1)], False, 3, 'JAB = Col 2 R2 arms out + render lunge + procedural short chop'),
    'heavy':       ([('c2', 2), ('c2', 3)], False, 6, 'HEAVY = Col 2 R3 → R4 arms sweeping wide + render lunge + procedural wind blade'),
    'down':        ([('c2', 5)], False, 4, 'LOW = Col 2 R6 arms low + procedural low sweep'),
    'up':          ([('c2', 4)], False, 6, 'LAUNCHER = Col 2 R5 arm raised + procedural upward gale'),
    'air':         (SPINF, True, 3, 'AIR = Col 2 R7–R8 spin + procedural wind ring'),
    'tsInhale':    ([('c2', 4)], False, 6, 'INHALE cast = Col 2 R5 arm raised (+ Col 3 cyclone cone FX)'),
    'tsExhale':    ([('c2', 5)], False, 6, 'EXHALE cast = Col 2 R6 arms pushing low'),
    'tsSpin':      (SPINF, True, 2, 'SHELL SPIN loop = Col 2 R7–R8'),
    'tsCyclone':   (CYCL, True, 2, 'CYCLONE loop = Col 3 R1–R3 strong wind (Shell Spin active frames, Cyclone Drop, ultimate)'),
    'tsChop':      ([('c3', 3)], False, 6, 'WIND CHOP body = Col 3 R4 one arm raised, leaning (chop pose)'),
    'tsGuard':     ([('c1', 3)], False, 6, 'SHELL GUARD = Col 1 R4 back-shell curl'),
    'tsFlash':     ([('c3', 4)], False, 6, 'white silhouette = hit / Omnitrix transform / timeout-revert flash'),
}


def main():
    a = load(); H, W = a.shape[:2]
    key, halo, fg = masks(a)
    bodies, text, merged = components(a, fg)
    cols = grid(bodies)
    # hover offset: median (feet − body centre) of the standing frames
    gaps = [standing_anchor(a, b)[1] - b['ys'][body_px(a, b)].mean() for g, row in cols.items() for i, b in enumerate(row) if (g, i) not in SPIN and (g, i) != ('c3', 4)]
    HOVER[0] = float(np.median(gaps))
    lo_x = hi_x = up_y = dn_y = 0
    for g, row in cols.items():
        for i, b in enumerate(row):
            ax, fy = anchor(a, b, (g, i))
            lo_x = min(lo_x, b['x0'] - ax); hi_x = max(hi_x, b['x1'] + 1 - ax); up_y = max(up_y, fy - b['y0']); dn_y = max(dn_y, b['y1'] + 1 - fy)
    CX = int(np.ceil(max(-lo_x, hi_x))) + 2; CW = CX * 2; FEET_Y = int(np.ceil(up_y)) + 3; CH = FEET_Y + max(3, int(np.ceil(dn_y)) + 2)

    def cut(b):
        img = np.zeros((b['y1'] - b['y0'] + 1, b['x1'] - b['x0'] + 1, 4), np.uint8)
        img[b['ys'] - b['y0'], b['xs'] - b['x0'], :3] = a[b['ys'], b['xs']]; img[b['ys'] - b['y0'], b['xs'] - b['x0'], 3] = 255
        return img
    anim, ledger, used = {}, [], set()
    for name, (frames, loop, speed, note) in A.items():
        strip = np.zeros((CH, CW * len(frames), 4), np.uint8)
        for k, gi in enumerate(frames):
            g, i = gi; b = cols[g][i]; used.add(gi); ax, fy = anchor(a, b, gi)
            ox = int(round(CX - ax)) + b['x0'] + k * CW; oy = FEET_Y - fy + b['y0']
            cell = cut(b); h, w = cell.shape[:2]
            assert ox >= k * CW and ox + w <= (k + 1) * CW and oy >= 0 and oy + h <= CH, f'{name}: frame cropped'
            m = cell[..., 3] > 0; strip[oy:oy + h, ox:ox + w][m] = cell[m]
            assert (strip[:, k * CW:(k + 1) * CW, 3] > 0).sum() == b['n'], f'{name} f{k}: pixel count changed'
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, f'{PREFIX}{name}_uniform.png'))
        anim[name] = dict(sheet=f'./{PREFIX}{name}_uniform.png', frames=len(frames), width=CW, height=CH, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
        ledger.append((name, frames, note))
    allb = {(g, i) for g, row in cols.items() for i in range(len(row))}
    assert used == allb, f'unused body frames: {sorted(allb - used)}'
    # the white silhouette: which real pose is it? (best overlap, both facings)
    sil = mask_of(a, cols['c3'][4])
    sim = {f'{g.upper().replace("C", "Col ")} R{i + 1}{" (mirrored)" if fl else ""}': round(iou(sil, mask_of(a, cols[g][i], fl)), 3)
           for g, i in [('c2', 4), ('c3', 3), ('c2', 3), ('c1', 0), ('c2', 1)] for fl in (False, True)}
    geom = dict(cellW=CW, cellH=CH, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE, hover=round(HOVER[0], 2))
    with open(os.path.join(ROOT, 'terraspinAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_terraspin.py from the Fun-tech.tk Terraspin sheet (Sheet from fun-tech.tk).\n'
                 '// See docs/ben10/aliens/terraspin/SPRITE_LEDGER.md. TERRASPIN_ANIM: uniform strips (cell %dx%d, body anchor x=%d,\n'
                 '// feet row originY=%d); frames are 1:1 copies of the keyed sheet components (no filter); on-screen size = actionScale.\n'
                 % (CW, CH, CX, FEET_Y))
        fh.write('export const TERRASPIN_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const TERRASPIN_GEOM = ' + json.dumps(geom) + '\n')
    os.makedirs(DOC, exist_ok=True)
    label = {'c1': 'Col 1', 'c2': 'Col 2', 'c3': 'Col 3'}
    src = dict(sheet='assets/sprites/ben10/aliens/terraspin.png', size=[W, H], key=list(BG), haloThreshold=HALO_D,
               haloPixels=int(halo.sum()), keptLossySpecks=KEPT_SPECKS, textGlyphs=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in text],
               mergedFragments=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in merged], silhouetteOverlap=sim,
               frames={label[g]: [dict(row=i + 1, bbox=[b['x0'], b['y0'], b['x1'], b['y1']], px=b['n'], spin=(g, i) in SPIN,
                                      anchor=[round(anchor(a, b, (g, i))[0], 2), anchor(a, b, (g, i))[1]]) for i, b in enumerate(row)] for g, row in cols.items()})
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(src, fh, indent=1)
    contact(anim, geom)
    write_ledger(anim, ledger, geom, cols, label, int(halo.sum()), text, merged, sim)
    print(f'OK: {len(anim)} anims, {len(allb)} body frames (all used), halo {int(halo.sum())} px, text {len(text)} glyphs, '
          f'merged {len(merged)} fragments, kept specks {len(KEPT_SPECKS)}, cell {CW}x{CH} feet {FEET_Y} hover {HOVER[0]:.1f}')
    print('silhouette overlap', sim)


def contact(anim, geom):
    pad = 4; rows = []
    for name, d in anim.items():
        im = Image.open(os.path.join(ROOT, d['sheet'][2:])).convert('RGBA')
        bd = Image.new('RGBA', im.size, (40, 44, 52, 255)); bd.alpha_composite(im)
        dr = ImageDraw.Draw(bd)
        for k in range(d['frames']):
            x = k * d['width']
            dr.line([(x, geom['feetY']), (x + d['width'] - 1, geom['feetY'])], fill=(0, 200, 120, 255))
            dr.line([(x + geom['centreX'], 0), (x + geom['centreX'], d['height'])], fill=(90, 90, 200, 255))
            dr.rectangle([x, 0, x + d['width'] - 1, d['height'] - 1], outline=(80, 80, 90, 255))
        rows.append((name, bd))
    LW = 90; Wd = max(r[1].width for r in rows) + LW + pad * 2; Hd = sum(r[1].height + pad for r in rows) + pad
    out = Image.new('RGBA', (Wd, Hd), (24, 26, 30, 255)); dr = ImageDraw.Draw(out); y = pad
    for name, im in rows:
        dr.text((pad, y + 2), name, fill=(230, 230, 230, 255))
        out.alpha_composite(im, (LW, y)); y += im.height + pad
    out.save(os.path.join(DOC, 'contact_sheet.png'))


def write_ledger(anim, ledger, geom, cols, label, halo_px, text, merged, sim):
    best = max(sim, key=sim.get)
    L = ['# Terraspin (Galapagus) — sprite ledger\n',
         '**Sheet from fun-tech.tk** (credit text on the sheet: "Fun-tech.tk", "Ben 10 Game creator"). Source: the owner\'s download '
         '`~/Downloads/new/ben 10/2148577_orig.png` → `assets/sprites/ben10/aliens/terraspin.png` (480×800). Identified by contact '
         'sheet among the blue-background downloads: olive-green turtle, hex-patterned shell, green Omnitrix dot, white spin-wind '
         'frames. (Not `802271_orig.png` — that is the Brainstorm crab.)\n',
         '## Key, halo, text removal, palette\n',
         '- Background solid blue **(0,0,255)** keyed exactly (zero tolerance; all four corners asserted).\n'
         f'- **Collision / halo report:** {halo_px} anti-aliased blue-blend pixels around the figures (B − max(R,G) ≥ {HALO_D}, within '
         '2 px of the key) are removed as halo. His palette (olive / dark green / yellow-olive / white wind / green Omnitrix dot) is never '
         'blue-dominant (99th percentile of the kept pixels ≤ 25, asserted). **The white wind streaks are not touched**: their edge blends '
         f'are light grey-white, not blue. **{len(KEPT_SPECKS)} lossy blue specks** sit ≥ 3 px inside the art (in the wind gaps of the spin '
         'frames and two in dark outline); they are KEPT untouched (art is never edited) and listed in `source_grid.json`.\n'
         f'- Text: {len(text)} glyph components of "Fun-tech.tk" (near-black) and "Ben 10 / Game creator" (cyan), top right, removed '
         f'(not art). {len(merged)} detached wind-streak tips / single pixels were merged into the spin figure of their grid cell, so '
         'every spin frame is ONE component (shell + streaks).\n',
         '## Cut\n',
         '- 8-connected components after keying: Col 1 = 9, Col 2 = 8, **Col 3 = 5** (R1–R3 strong-wind spin, **R4** one arm raised / '
         'leaning = the chop pose, **R5** the white silhouette — the brief\'s "R5 / R6"). **22 frames, every one used.**\n'
         f'- Uniform cell **{geom["cellW"]}×{geom["cellH"]}**. Standing / curled frames: anchor column x={geom["centreX"]} = mean column '
         f'of the bottom 12 body rows, feet row originY={geom["feetY"]} = the lowest body row (bottom of the legs). **Spin frames** (Col 2 '
         f'R7–R8, Col 3 R1–R3): anchored at the shell\'s centre (centroid of the non-wind pixels) with a CONSISTENT hover offset of '
         f'{geom["hover"]} px (= the median feet-to-body-centre distance of the standing frames), so the spinning shell rides at his '
         'standing body\'s height. Pixels copied 1:1 (no blur / filter / resample), pixel counts preserved, nothing cropped — arms, shell '
         'and streaks included (asserted).\n'
         f'- **Scale:** high-res cartoon art (~90 px wide, ~80 px tall). The engine\'s standard path with image smoothing off: Ben\'s '
         f'spriteScale 2.0 × global 1.18 × actionScale **{ACTION_SCALE}** → ≈ 125 px tall (about human Ben), ≈ 140 px wide (wide and low). '
         'Not noisy at this scale; no resample filter.\n',
         '## True sequences (real frames win over the brief\'s inventory)\n',
         '- **Col 1 is a TURN**, previewed as an animation: R1 front → R2 three-quarter → R3 side → R4 back / shell → R5 shell side → R6 '
         'three-quarter → R7 front; R8 front again; R9 a side profile pulled into the shell (curled). There is no walk cycle: **walk = the '
         'front frames R1 / R8 / R7 / R8 CYCLED** (the waddle is the bob). The curled frames (R4, R5, R9) serve hit / knockdown / crouch / '
         'Shell Guard.\n'
         '- **Col 2**: R1 shell turned (block-hit), R2–R3 arms out (jab / heavy start), R4 arms spread wide (heavy end, jump / fall), R5 '
         'one arm raised high (launcher, INHALE cast, taunt, win), R6 arms out low (low, EXHALE cast), R7–R8 shell spin with wind.\n'
         '- **Col 3**: R1–R3 shell spin inside strong white wind (the cyclone loop), R4 one arm raised and leaning (WIND CHOP), R5 silhouette.\n'
         f'- **White silhouette (Col 3 R5): ARMS-UP TURTLE, verified.** Shape overlap (best alignment) with the real poses: '
         + ', '.join(f'{k} {v}' for k, v in sim.items()) + f'. Best match: **{best}** — the arm-raised pose. Decision: it is the '
         'hit-flash / Omnitrix transform flash / timeout-revert flash (`transform` f1, `tsFlash`); it is not a move body.\n',
         '## Every sheet frame → animation → move\n',
         '| Sheet frame | Animations (moves) |', '|---|---|']
    for g, row in cols.items():
        for i in range(len(row)):
            uses = [k for k, frames, _ in ledger if (g, i) in frames]
            L.append(f'| {label[g]} R{i + 1} | {", ".join(uses)} |')
    L.append('\n## Animation → move (exported strips `' + PREFIX + '<anim>_uniform.png`)\n')
    L.append('| Animation | Frames | Speed | Source / move |'); L.append('|---|---|---|---|')
    for k, frames, note in ledger: L.append(f'| `{k}` | {len(frames)} | {anim[k]["speed"]} | {note} |')
    L.append('\n## Missing poses (closest real frame reused, no art invented)\n')
    L.append('- **jab / heavy / low / launcher**: no unique attack art. Each is the closest body frame (Col 2 R2 / R3–R4 / R6 / R5) plus a '
             'render-only forward lunge or lift offset and a procedural pixel chop / wind blade / sweep / gale (terraspin.js `drawTerraspinFx`). '
             '**air**: the Col 2 spin frames + a procedural wind ring.\n'
             '- **hit light / heavy**: Col 1 R5 / R4 curled. **knockdown, lose, crouch**: Col 1 R9 curled. **get-up**: Col 1 R6 → R7. '
             '**dizzy**: Col 1 R5 ↔ R4. **block**: Col 1 R1 standing; **block-hit**: Col 2 R1. **win / taunt**: Col 2 R5 arm raised (+ R4). '
             '**jump / fall**: Col 2 R4 arms spread; **double jump / dash**: the Col 2 spin.\n')
    L.append('## Extracted vs procedural effects\n')
    L.append('- **Extracted (real sheet pixels, part of the body frames):** the white wind streaks of Col 2 R7–R8 and Col 3 R1–R3 (the '
             'Shell Spin / cyclone wind), the green Omnitrix dot, the white silhouette flash.\n'
             '- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the Inhale cyclone cone and suction streaks, the '
             'Exhale blast, wind-blade chops (normals, Wind Chop, ultimate), the launcher gale, the Cyclone Drop landing burst, the Gale Drag '
             'streaks over the opponent, Shear pips, the Thorn Shell / Shell Guard sparks, the Pressure gauge, the ultimate\'s pixel cyclone '
             'and screen shake. They READ simulation state; they never write it.\n')
    L.append('\nContact sheet: `docs/ben10/aliens/terraspin/contact_sheet.png` (every exported strip; green = feet row, blue = anchor '
             'column). Geometry, removed glyphs, merged fragments, kept specks, silhouette overlaps: `source_grid.json`.\n\n'
             'Credit: **Sheet from fun-tech.tk**.\n')
    open(os.path.join(DOC, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
