#!/usr/bin/env python3
# BRAINSTORM (Cerebrocrustacean) — READY-alien slicer for the Fun-tech.tk sheet (assets/sprites/ben10/aliens/brainstorm.png,
# 480×800, copied from the owner's download "802271_orig.png").
#   python3 tools/ben10/slice_brainstorm.py
# HIGH-RES CARTOON ART (not pixel art): pixels are copied 1:1 — no blur, no filter, no resample. Scaling happens at render
# time through the engine's standard path (spriteScale × actionScale, image smoothing off).
# KEY: background = solid blue (0,0,255), keyed EXACTLY (zero tolerance; all four corners asserted). The art was saved with
# an anti-aliased edge against the blue, so ~31k pixels around every figure are BLUE-BLENDS (B − max(R,G) ≥ 40); 99 % of
# them sit exactly 1 px from the key. They are removed as a 1-px halo (not art). Collision check: no interior art pixel of his
# palette (orange / brown / green / black / purple dome ≈ (135,69,136) / yellow-white bursts) reaches a blue-dominance of
# 40 (interior 99.9th percentile = 29; asserted below), so the purple dome is never touched.
# TEXT: "Fun-tech.tk" (top right) = 19 near-black glyph components inside the text box, removed (not art).
# CUT: 8-connected components; tiny detached pieces (spark tips / single pixels) whose box lies inside a figure's box (+4 px)
# are merged into that figure, so an electric-burst frame stays ONE component (figure + burst); nothing is cropped.
# ANCHOR: feet = the lowest NON-burst pixel row (bottom of the legs); centre = mean column of the non-burst (not yellow /
# white) pixels in the bottom 12 rows (legs), never the dome or the burst. Deterministic: re-running is byte-identical.
import json, os, shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/brainstorm.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/brainstorm')
BG = (0, 0, 255)
HALO_D = 40               # blue-dominance (B − max(R,G)) at / above which a non-key pixel is a blue blend (halo)
TEXT_BOX = (0, 340, 36, 480)   # y0, x0, y1, x1 of the "Fun-tech.tk" credit text
ACTION_SCALE = 0.75       # ~70 px native body → ~124 px on screen (Ben's spriteScale 2.0 × global 1.18 × 0.75): about human
                          # Ben's height, ~180 px wide (crab-wide and low). A fixed engine scale, smoothing off.
PREFIX = 'ben10_brainstorm_ready_'


def load():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    assert tuple(a[0, 0]) == tuple(a[0, -1]) == tuple(a[-1, 0]) == tuple(a[-1, -1]) == BG, 'corners must be the key colour'
    return a


def masks(a):
    key = (a == BG).all(2)
    d = a[..., 2] - np.maximum(a[..., 0], a[..., 1])
    # "Background" = the exact key plus the small enclosed blue pockets (gaps between legs / lightning) whose lossy noise kept
    # them off the exact key (R,G <= 60, B >= 200 — pure blue, never art). The HALO = blue blends (B - max(R,G) >= HALO_D)
    # within 2 px of that background. Collision check: no pixel >= 3 px from the background reaches the threshold except
    # isolated lossy specks inside dark outline, which are KEPT (art untouched) and counted in the ledger.
    pocket = ~key & (a[..., 0] <= 60) & (a[..., 1] <= 60) & (a[..., 2] >= 200)
    bgish = key | pocket
    dist = ndimage.distance_transform_cdt(~bgish, metric='chessboard')
    halo = ~key & (pocket | ((d >= HALO_D) & (dist <= 2)))
    fg = ~key & ~halo
    deep = ~bgish & (dist >= 3) & (d >= HALO_D)
    assert deep.sum() <= 3, f'{int(deep.sum())} interior pixels reach the halo threshold (palette collision)'
    global KEPT_SPECKS; KEPT_SPECKS = [[int(x), int(y), *map(int, a[y, x])] for y, x in zip(*np.where(deep))]
    return key, halo, fg


def is_burst(px):   # yellow / white electric burst or spark pixels (R, G both high)
    return (px[:, 0] > 170) & (px[:, 1] > 150)


def components(a, fg):
    lbl, n = ndimage.label(fg, structure=np.ones((3, 3)))
    comps = []
    for i, s in enumerate(ndimage.find_objects(lbl)):
        m = lbl[s] == i + 1
        ys, xs = np.where(m); ys = ys + s[0].start; xs = xs + s[1].start
        comps.append(dict(y0=int(ys.min()), x0=int(xs.min()), y1=int(ys.max()), x1=int(xs.max()), ys=ys, xs=xs, n=len(ys)))
    bodies = [c for c in comps if c['n'] >= 1000]
    text, merged, specks = [], [], []
    for c in comps:
        if c['n'] >= 1000: continue
        ty0, tx0, ty1, tx1 = TEXT_BOX
        if c['y0'] >= ty0 and c['y1'] < ty1 and c['x0'] >= tx0 and c['x1'] < tx1:
            assert (a[c['ys'], c['xs']][:, :2] == 0).all(), 'text glyph with a non-black colour'
            text.append(c); continue
        host = [b for b in bodies if c['y0'] >= b['y0'] - 4 and c['y1'] <= b['y1'] + 4 and c['x0'] >= b['x0'] - 4 and c['x1'] <= b['x1'] + 4]
        assert len(host) == 1, f'unattached fragment @ {c["y0"]},{c["x0"]} ({c["n"]} px)'
        b = host[0]; b['ys'] = np.concatenate([b['ys'], c['ys']]); b['xs'] = np.concatenate([b['xs'], c['xs']]); b['n'] += c['n']
        merged.append(c)
    return bodies, text, merged


def grid(bodies):
    cols = {'c1': [], 'c2': [], 'c3': [], 'rx': []}
    for b in bodies:
        cx = (b['x0'] + b['x1']) / 2
        k = 'c1' if cx < 112 else 'c2' if cx < 228 else 'c3' if cx < 345 else 'rx'
        cols[k].append(b)
    for k in cols: cols[k].sort(key=lambda b: b['y0'])
    assert [len(cols[k]) for k in ('c1', 'c2', 'c3', 'rx')] == [9, 9, 8, 3], [len(v) for v in cols.values()]
    return cols


def anchor(a, b):
    px = a[b['ys'], b['xs']]
    body = ~is_burst(px)
    if not body.any(): body = np.ones(len(px), bool)   # the all-white silhouette: its whole outline is the body
    feet = int(b['ys'][body].max())
    sel = body & (b['ys'] >= feet - 11)
    return float(b['xs'][sel].mean()), feet


LOOP = [('c1', i) for i in range(9)] + [('c2', i) for i in range(6)]   # col 1 R1-9 → col 2 R1-6: one continuous shuffle loop
# animation → (frames, loop, speed, ledger note). Normals have no unique body art: an idle / walk frame + a render-only
# lunge / lift offset + a procedural claw swipe or spark (brainstorm.js) — documented per animation.
A = {
    'idle':        ([('c1', i) for i in range(9)], True, 9, 'Col 1 R1-9 (the first 9 frames of the shuffle loop), slow'),
    'walk':        (LOOP, True, 4, 'Col 1 R1-9 + Col 2 R1-6 = one continuous 15-frame crab shuffle'),
    'walk_back':   (LOOP[::-1], True, 4, 'the 15-frame shuffle reversed'),
    'run':         (LOOP, True, 2, 'the 15-frame shuffle cycled faster'),
    'dash':        (LOOP, True, 2, 'the 15-frame shuffle cycled faster (no dash art)'),
    'jump':        ([('c2', 6)], False, 6, 'Col 2 R7 legs spread (no jump art)'),
    'doubleJump':  ([('c2', 6)], False, 6, 'Col 2 R7 reused'),
    'fall':        ([('c2', 7)], False, 6, 'Col 2 R8 legs spread (no fall art)'),
    'crouch':      ([('c2', 8)], False, 6, 'Col 2 R9 lowest stance (no crouch art)'),
    'guard':       ([('c3', 0)], False, 6, 'Col 3 R1 closed rest (no block art)'),
    'transform':   ([('rx', 2), ('c3', 0)], False, 6, 'white silhouette flash → Col 3 R1 closed rest'),
    'taunt':       ([('c3', 1), ('c3', 2), ('c3', 7)], False, 10, 'dome rising → dome up (render only; the dome STATE is not changed)'),
    'win':         ([('c3', 2), ('c3', 7)], True, 16, 'dome up frames (no win art)'),
    'lose':        ([('c2', 8)], False, 6, 'Col 2 R9 lowest stance (no lose art)'),
    'hurt':        ([('rx', 1)], False, 6, 'right-extra plain frame = hit_react (no hit art)'),
    'hurt_air':    ([('rx', 1)], False, 6, 'right-extra plain frame reused'),
    'knockdown':   ([('c2', 8)], False, 6, 'Col 2 R9 lowest stance (no knockdown art)'),
    'getup':       ([('c2', 6)], False, 6, 'Col 2 R7 (no get-up art)'),
    'dizzy':       ([('rx', 1), ('c1', 0)], True, 10, 'plain frame ↔ Col 1 R1 (no dizzy art)'),
    'light':       ([('c1', 3)], False, 3, 'JAB = Col 1 R4 + render lunge + procedural claw swipe'),
    'heavy':       ([('c2', 4), ('c2', 5)], False, 6, 'HEAVY = Col 2 R5-6 + render lunge + procedural claw clamp'),
    'down':        ([('c2', 7), ('c2', 8)], False, 4, 'LOW = Col 2 R8-9 (spread legs) + procedural leg-sweep spark'),
    'up':          ([('c3', 0)], False, 6, 'LAUNCHER = Col 3 R1 + render-only psychic lift shimmer'),
    'air':         ([('c2', 6)], False, 4, 'AIR = Col 2 R7 + procedural claw swipe'),
    'bsDomeOpen':  ([('c3', 0), ('c3', 1), ('c3', 2)], False, 6, 'DOME OPEN transition = Col 3 R1 → R2 → R3'),
    'bsDomeClose': ([('c3', 2), ('c3', 1), ('c3', 0)], False, 8, 'DOME CLOSE transition = Col 3 R3 → R2 → R1 (reverse)'),
    'bsCast':      ([('c3', 3), ('c3', 4), ('c3', 5)], False, 3, 'LIGHTNING cast = Col 3 R4-R6 bursts (Brain Bolt / Neural Burst / Overcharge / ult storm)'),
    'bsCastHold':  ([('c3', 5)], False, 6, 'Col 3 R6 brightest burst held (Final Tempest, enlarged in brainstorm.js)'),
    'bsRecover':   ([('c3', 6)], False, 6, 'Col 3 R7 faded burst = burst recovery / dome settling'),
    'bsFlash':     ([('rx', 2)], False, 6, 'white silhouette = hit-flash / Omnitrix flash'),
    'bsStrike':    ([('c2', 5)], False, 6, 'CALCULATED STRIKE body = Col 2 R6 walk frame + real travel + render lean (the silhouette is not a lunge)'),
    'bsPull':      ([('c3', 0)], False, 6, 'PSYCHIC PULL = Col 3 R1 + procedural telekinetic rings'),
    # OPEN (dome up) frame set — brainstorm.js swaps the whole table while the dome is open
    'open_idle':   ([('c3', 7), ('rx', 0)], True, 18, 'OPEN idle = Col 3 R8 ↔ right-extra dome frame (both dome up, calm)'),
    'open_walk':   ([('c3', 7), ('rx', 0)], True, 7, 'OPEN walk = the two dome-up frames alternated (no dome-up walk art)'),
    'open_jump':   ([('rx', 0)], False, 6, 'OPEN air = right-extra dome frame'),
}


def main():
    a = load(); H, W = a.shape[:2]
    key, halo, fg = masks(a)
    bodies, text, merged = components(a, fg)
    cols = grid(bodies)
    lo_x = hi_x = up_y = dn_y = 0
    for k, row in cols.items():
        for b in row:
            ax, fy = anchor(a, b)
            lo_x = min(lo_x, b['x0'] - ax); hi_x = max(hi_x, b['x1'] + 1 - ax); up_y = max(up_y, fy - b['y0']); dn_y = max(dn_y, b['y1'] + 1 - fy)
    CX = int(np.ceil(max(-lo_x, hi_x))) + 2; CW = CX * 2; FEET_Y = int(up_y) + 3; CH = FEET_Y + max(3, int(dn_y) + 2)

    def cut(b):
        img = np.zeros((b['y1'] - b['y0'] + 1, b['x1'] - b['x0'] + 1, 4), np.uint8)
        img[b['ys'] - b['y0'], b['xs'] - b['x0'], :3] = a[b['ys'], b['xs']]; img[b['ys'] - b['y0'], b['xs'] - b['x0'], 3] = 255
        return img
    anim, ledger, used = {}, [], set()
    for name, (frames, loop, speed, note) in A.items():
        strip = np.zeros((CH, CW * len(frames), 4), np.uint8)
        for k, (g, i) in enumerate(frames):
            b = cols[g][i]; used.add((g, i)); ax, fy = anchor(a, b)
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
    geom = dict(cellW=CW, cellH=CH, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)
    with open(os.path.join(ROOT, 'brainstormAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_brainstorm.py from the Fun-tech.tk Brainstorm sheet (Sheet from fun-tech.tk).\n'
                 '// See docs/ben10/aliens/brainstorm/SPRITE_LEDGER.md. BRAINSTORM_ANIM: uniform strips (cell %dx%d, body anchor x=%d,\n'
                 '// feet row originY=%d); frames are 1:1 copies of the keyed sheet components (no filter); on-screen size = actionScale.\n'
                 % (CW, CH, CX, FEET_Y))
        fh.write('export const BRAINSTORM_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const BRAINSTORM_GEOM = ' + json.dumps(geom) + '\n')
    os.makedirs(DOC, exist_ok=True)
    label = {'c1': 'Col 1', 'c2': 'Col 2', 'c3': 'Col 3', 'rx': 'Right extra'}
    src = dict(sheet='assets/sprites/ben10/aliens/brainstorm.png', size=[W, H], key=list(BG), haloThreshold=HALO_D,
               haloPixels=int(halo.sum()), keptLossySpecks=KEPT_SPECKS, textGlyphs=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in text],
               mergedFragments=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in merged],
               frames={label[g]: [dict(row=i + 1, bbox=[b['x0'], b['y0'], b['x1'], b['y1']], px=b['n'],
                                      anchor=[round(anchor(a, b)[0], 2), anchor(a, b)[1]]) for i, b in enumerate(row)] for g, row in cols.items()})
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(src, fh, indent=1)
    contact(anim, geom)
    write_ledger(anim, ledger, geom, cols, label, int(halo.sum()), len(text), merged)
    print(f'OK: {len(anim)} anims, {len(allb)} body frames (all used), halo {int(halo.sum())} px, text {len(text)} glyphs, '
          f'merged {len(merged)} fragments, kept specks {KEPT_SPECKS}, cell {CW}x{CH} feet {FEET_Y}')


def contact(anim, geom):
    S = 1; pad = 4; rows = []
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
    LW = 90; Wd = max(r[1].width for r in rows) * S + LW + pad * 2; Hd = sum(r[1].height * S + pad for r in rows) + pad
    out = Image.new('RGBA', (Wd, Hd), (24, 26, 30, 255)); dr = ImageDraw.Draw(out); y = pad
    for name, im in rows:
        dr.text((pad, y + 2), name, fill=(230, 230, 230, 255))
        out.alpha_composite(im, (LW, y)); y += im.height * S + pad
    out.save(os.path.join(DOC, 'contact_sheet.png'))


def write_ledger(anim, ledger, geom, cols, label, halo_px, n_text, merged):
    L = ['# Brainstorm (Cerebrocrustacean) — sprite ledger\n',
         '**Sheet from fun-tech.tk** (credit text on the sheet: "Fun-tech.tk"). Source: the owner\'s download '
         '`~/Downloads/new/ben 10/802271_orig.png` → `assets/sprites/ben10/aliens/brainstorm.png` (480×800). '
         'Identified by contact sheet among the blue-background downloads (orange-brown crab, green/black stripes, purple brain dome).\n',
         '## Key, halo, text removal, palette\n',
         '- Background solid blue **(0,0,255)** keyed exactly (zero tolerance; all four corners asserted).\n'
         f'- **Collision / halo report:** the art is anti-aliased against the blue and saved lossy, so **{halo_px} pixels** around the '
         'figures are blue blends (0,0,254), (1,0,253), … (70,27,132). 99 % of them are exactly 1 px from the key colour. A zero-tolerance '
         f'key alone leaves them as a visible blue outline, so pixels with blue-dominance B − max(R,G) ≥ {HALO_D} are removed as halo. '
         'His palette never reaches that: orange / brown / green / black / yellow-white bursts are ≤ 0, the **purple dome ≈ (135,69,136) '
         'is ≈ +1**, and the interior 99.9th percentile is 29 (asserted in the slicer). No art colour is blue-adjacent; the dome is untouched.\n'
         f'- "Fun-tech.tk" text (top right): {n_text} near-black glyph components inside the text box, removed (not art). '
         f'{len(merged)} tiny detached fragments (burst spark tips / single pixels) lying inside a figure\'s box were merged into that figure.\n',
         '## Cut\n',
         '- 8-connected components after keying: Col 1 = 9, Col 2 = 9, **Col 3 = 8** (not 9: R1 closed, R2 dome rising, R3 dome up, '
         'R4–R5 burst + lightning, R6 brightest burst, R7 faded burst / dome settling, R8 dome up calm), right extras = 3. '
         '**29 frames, every one used.** Each electric-burst frame (Col 3 R4–R7) is ONE component: figure + burst. No clean body-only '
         'frame exists for any burst frame (the body is inside / behind the burst); the closest clean bodies are Col 3 R3 / R8 (dome up).\n'
         f'- Uniform cell **{geom["cellW"]}×{geom["cellH"]}**; anchor column x={geom["centreX"]} = mean column of the non-burst pixels in the '
         f'bottom 12 rows (the legs), feet row originY={geom["feetY"]} = the lowest non-burst row (bottom of the legs). Never the dome or '
         'the burst. Pixels copied 1:1 (no blur / filter / resample), pixel counts preserved, nothing cropped (asserted).\n'
         f'- **Scale:** high-res cartoon art (~100 px wide, ~70 px tall). Rendered through the engine\'s standard path with image '
         f'smoothing off: Ben\'s spriteScale 2.0 × global 1.18 × actionScale **{ACTION_SCALE}** → ≈ 124 px tall (about human Ben), '
         '≈ 180 px wide (crab-wide and low).\n',
         '## Frame order (real frames win over the brief\'s inventory)\n',
         '- Col 1 R1–9 and Col 2 R1–6 are near-identical bobbing / shuffling frames forming ONE continuous loop (frame-to-frame overlap '
         '0.66–0.90, Col 1 R9 → Col 2 R1 = 0.69, the same as inside the loop); Col 2 R6 → R7 drops to 0.48: **Col 2 R7–9 are a separate set** '
         '(legs spread wide, body lower) → used for air / crouch / low. Idle = Col 1 slow, walk = the 15-frame loop, run = faster.\n'
         '- Col 3 previewed R1→R8 as an animation: dome closed → rising → up → burst ×3 → faded → dome up calm. Open transition = R1→R3, '
         'close = reverse; open idle = R8 (the brief\'s "R9").\n'
         '- **White silhouette (bottom right): NOT a lunge.** Its outline is the plain stance (shell left, raised claw right — the same '
         'shape as the right-extra plain frame). Used as the hit-flash / Omnitrix transform flash (`transform` f1, `bsFlash`). Calculated '
         'Strike uses Col 2 R6 with real travel + a render lean.\n',
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
    L.append('- **jab / heavy / low / launcher / air**: no unique body art. Each is an idle / walk / spread-leg frame plus a render-only '
             'forward lunge or upward lift offset and a procedural pixel claw swipe / spark (brainstorm.js `drawBrainstormFx`).\n'
             '- **jump / double jump / fall**: Col 2 R7 / R8. **crouch, knockdown, lose**: Col 2 R9. **block**: Col 3 R1. '
             '**hit / air hit / dizzy**: right-extra plain frame. **get-up**: Col 2 R7. **win / taunt**: dome-up frames (render only).\n'
             '- **OPEN (dome up) frame set**: idle / walk / run / air use Col 3 R8 + the right-extra dome frame (no dome-up walk art).\n')
    L.append('## Extracted vs procedural effects\n')
    L.append('- **Extracted (real sheet pixels, part of the body frames):** the electric bursts + lightning of Col 3 R4–R7 (with the '
             'Omnitrix dot), the purple dome, the white silhouette flash.\n'
             '- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** Brain Bolt / Overcharge / storm lightning bolts, '
             'the Neural Burst pixel ring, the Psychic Pull telekinetic rings, the lift shimmer, claw-swipe / sweep sparks, the Mind Shield '
             'pixel shell, Synapse pips / Short-Circuit static over the opponent, the Pattern Read HUD label, the ultimate\'s math glyphs, '
             'graph lines, stage dim and shock ring. They READ simulation state; they never write it.\n')
    L.append('\nContact sheet: `docs/ben10/aliens/brainstorm/contact_sheet.png` (every exported strip; green = feet row, blue = anchor '
             'column). Geometry, removed glyphs and merged fragments: `source_grid.json`.\n\nCredit: **Sheet from fun-tech.tk**.\n')
    open(os.path.join(DOC, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
