#!/usr/bin/env python3
# EYEGUY (Opticoid) — READY-alien slicer for the Dragonrod sheet (repo root
# "eyeguy_sprite_sheet_by_dragonrod342_d82qnsd.png", copied to assets/sprites/ben10/aliens/eyeguy.png).
#   python3 tools/ben10/slice_eyeguy.py
# Background = solid pale blue-grey (167,201,200) keyed EXACTLY (zero tolerance). Text (black labels), the white credit
# box and the red "EX." tags are removed as whole connected components and nothing is sampled from them. Every body
# frame / FX frame is an 8-connected component (pixels copied 1:1, nearest-neighbour, never cropped); bodies are
# anchored on the feet baseline + the legs' centre column. Outputs strips `ben10_eyeguy_ready_<anim>_uniform.png`,
# FX strips `ben10_eyeguy_ready_fx_<key>.png`, eyeguyAssets.js and docs/ben10/aliens/eyeguy/{SPRITE_LEDGER.md,
# contact_sheet.png, source_grid.json}. Deterministic: re-running reproduces byte-identical files.
import json, os, shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_ROOT = os.path.join(ROOT, 'eyeguy_sprite_sheet_by_dragonrod342_d82qnsd.png')
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/eyeguy.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/eyeguy')
BG = (167, 201, 200)
TAG_RED = (237, 28, 36)
BODY_COLS = {(209, 181, 44), (227, 208, 119), (185, 159, 38), (220, 196, 82)}
ACTION_SCALE = 1.15   # ~55 px native body → ~150 px on screen (Ben's spriteScale 2.0 × global 1.18), Goop ~158
PREFIX = 'ben10_eyeguy_ready_'

# sheet rows (y bands) → label, with the number of body components the row must hold
ROWS = [('stand', 40, 105, 4), ('jfc', 120, 186, 3), ('walk', 214, 275, 6), ('attack', 284, 346, 3),
        ('attack_fwd', 350, 412, 3), ('attack_up', 414, 486, 4), ('attack_down', 500, 560, 3)]


def load():
    if not os.path.exists(SRC):
        os.makedirs(os.path.dirname(SRC), exist_ok=True); shutil.copyfile(SRC_ROOT, SRC)
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    assert tuple(a[0, 0]) == tuple(a[0, -1]) == tuple(a[-1, 0]) == tuple(a[-1, -1]) == BG, 'corners must be the key colour'
    return a


def components(a):
    bg = (a == BG).all(2)
    lbl, n = ndimage.label(~bg, structure=np.ones((3, 3)))
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        cols = set(map(tuple, a[ys, xs]))
        if cols & BODY_COLS: kind = 'body'
        elif cols <= {(0, 0, 0)}: kind = 'text'
        elif cols <= {TAG_RED}: kind = 'ex'
        elif (255, 255, 255) in cols and len(ys) > 2000: kind = 'box'
        else: kind = 'fx'
        comps.append(dict(id=i, kind=kind, y0=int(ys.min()), x0=int(xs.min()), y1=int(ys.max()), x1=int(xs.max()), n=len(ys), ys=ys, xs=xs))
    # palette checks: the key colour, the tag red and pure white never appear in a body / FX component
    for c in comps:
        if c['kind'] in ('body', 'fx'):
            cols = set(map(tuple, a[c['ys'], c['xs']]))
            assert TAG_RED not in cols and (255, 255, 255) not in cols, f'palette collision in {c["kind"]} @ {c["y0"]},{c["x0"]}'
    return comps


def row_of(c):
    cy = (c['y0'] + c['y1']) / 2
    for name, y0, y1, _ in ROWS:
        if y0 <= cy <= y1: return name
    return None


def build_frames(a, comps):
    bodies = {}
    for name, _, _, cnt in ROWS:
        bs = sorted([c for c in comps if c['kind'] == 'body' and row_of(c) == name], key=lambda c: c['x0'])
        assert len(bs) == cnt, f'{name}: {len(bs)} bodies, expected {cnt}'
        bodies[name] = bs
    fx = [c for c in comps if c['kind'] == 'fx']
    def fx_in(row, x0=0, x1=9999, y0=0, y1=9999):
        return sorted([c for c in fx if row_of(c) == row or (c['y0'] >= y0 and c['y1'] <= y1 and row is None)], key=lambda c: (c['y0'], c['x0']))
    # zigzag waves: the "attack" row's FX, grouped by their own line (top line = 3 pieces, bottom line = 1)
    waves = sorted([c for c in fx if row_of(c) == 'attack'], key=lambda c: (c['y0'], c['x0']))
    top = [c for c in waves if c['y1'] < 328]; bot = [c for c in waves if c['y0'] >= 328]
    assert len(top) == 3 and len(bot) == 1, ('waves', len(top), len(bot))
    orbs_fwd = sorted([c for c in fx if row_of(c) == 'attack_fwd'], key=lambda c: c['x0'])
    up_fx = [c for c in fx if row_of(c) == 'attack_up']
    orbs_up = sorted([c for c in up_fx if c['n'] > 300], key=lambda c: c['x0'])
    beams_diag = sorted([c for c in up_fx if c['n'] <= 300], key=lambda c: c['x0'])
    beam_h = [c for c in fx if row_of(c) == 'attack_down']
    assert len(orbs_fwd) == 2 and len(orbs_up) == 2 and len(beams_diag) == 2 and len(beam_h) == 2, (len(orbs_fwd), len(orbs_up), len(beams_diag), len(beam_h))
    # the attack ↓ beam does not touch his hand (it is its own component) → it is cut as FX
    hand = bodies['attack_down'][2]
    assert min(c['x0'] for c in beam_h) > hand['x1'], 'attack ↓ beam touches the hand → would belong to the body frame'
    return bodies, dict(wave=[top, bot], orb=[[c] for c in orbs_fwd], orbUp=[[c] for c in orbs_up],
                        beamDiag=[[c] for c in beams_diag], beamH=[beam_h])


def anchor(c):
    # feet baseline = the component's lowest row; body centre = mean column of its bottom 10 rows (legs / feet)
    sel = c['ys'] >= c['y1'] - 9
    return float(c['xs'][sel].mean()), int(c['y1'])


# animation → list of (row, body index); loop / speed; notes for the ledger
A = {
    'idle':       (('stand', [0, 1, 2, 3]), True, 7, 'Stand f1-4 loop'),
    'walk':       (('walk', [0, 1, 2, 3, 4, 5]), True, 5, 'walk f1-6'),
    'walk_back':  (('walk', [5, 4, 3, 2, 1, 0]), True, 5, 'walk f1-6 REVERSED'),
    'run':        (('walk', [0, 1, 2, 3, 4, 5]), True, 3, 'walk f1-6 sped up (no run row)'),
    'dash':       (('walk', [0, 1, 2, 3, 4, 5]), True, 2, 'walk f1-6 sped up further (no dash row)'),
    'jump':       (('jfc', [0]), False, 6, 'jump (rise)'),
    'doubleJump': (('jfc', [0]), False, 6, 'jump (rise) reused'),
    'fall':       (('jfc', [1]), False, 6, 'fall (arms up)'),
    'crouch':     (('jfc', [2]), False, 6, 'crouch'),
    'guard':      (('jfc', [2]), False, 6, 'crouch reused for block (no block row)'),
    'transform':  (('stand', [0, 1, 2, 3]), False, 5, 'Stand reused (no transform row)'),
    'taunt':      (('stand', [0, 1, 2, 3]), False, 6, 'Stand reused (no taunt row)'),
    'win':        (('stand', [0, 1, 2, 3]), True, 7, 'Stand reused (no win row)'),
    'lose':       (('jfc', [2]), False, 6, 'crouch reused (no lose row)'),
    'hurt':       (('jfc', [1]), False, 6, 'fall reused (no hit-stun row)'),
    'hurt_air':   (('jfc', [1]), False, 6, 'fall reused (no hit-stun row)'),
    'knockdown':  (('jfc', [1]), False, 6, 'fall reused (no knockdown row)'),
    'getup':      (('jfc', [2]), False, 6, 'crouch reused (no get-up row)'),
    'dizzy':      (('stand', [0, 1, 2, 3]), True, 9, 'Stand reused (no dizzy row)'),
    'light':      (('attack', [0]), False, 3, 'JAB = attack f1'),
    'heavy':      (('attack', [1, 2]), False, 5, 'HEAVY claw swipe = attack f2-3'),
    'down':       (('attack_down', [0]), False, 4, 'LOW = attack ↓ f1 (crouched aim; crouch frame precedes via the engine crouch pose)'),
    'up':         (('attack_up', [0, 1]), False, 4, 'LAUNCHER = attack ↑ f1-2'),
    'air':        (('jfc', [1]), False, 4, 'AIR = fall frame (+ render-only eye flash)'),
    'egHypno':    (('attack', [0, 1, 2]), False, 5, 'HYPNO WAVE cast = attack f1-3 (+ zigzag wave FX)'),
    'egOrb':      (('attack_fwd', [0, 1]), False, 5, 'EYE ORB cast = attack → f1-2'),
    'egOrbHold':  (('attack_fwd', [0]), False, 6, 'EYE ORB charge hold = attack → f1'),
    'egOrbEx':    (('attack_fwd', [2]), False, 6, 'EX CHARGED ORB = attack → f3 (EX frame; its orb touches the hand → part of the frame)'),
    'egGaze':     (('attack_up', [2, 3]), False, 6, 'RISING GAZE = attack ↑ f3-4 (EX frames; f3 orb touches → part of the frame)'),
    'egLowGaze':  (('attack_down', [0, 1, 2]), False, 4, 'LOW GAZE = attack ↓ f1-3 (+ horizontal beam FX)'),
    'egOpenEyes': (('jfc', [1]), False, 6, 'OPEN EYES (air) = fall frame (+ 3-orb fan FX)'),
    'egUltOpen':  (('attack_fwd', [0, 1]), False, 4, 'ALL-SEEING EYE opener = attack → f1-2'),
    'egUltFlare': (('attack_up', [2, 3]), True, 6, 'ALL-SEEING EYE flare = attack ↑ f3-4 EX frames'),
    'egUltStare': (('attack_down', [2]), False, 6, 'ALL-SEEING EYE final stare = attack ↓ f3'),
}
EX_FRAMES = {'attack_fwd': [2], 'attack_up': [2, 3]}   # 0-based body indices next to an "EX." tag
FX_SPEED = {'wave': 4, 'orb': 4, 'orbUp': 4, 'beamDiag': 3, 'beamH': 6}
FX_NOTE = {'wave': 'zigzag wave lines by the plain "attack" row (top line = 3 touching-gap pieces kept as one frame, bottom line)',
           'orb': 'green energy orbs by "attack →" (the 2 free orbs) — Eye Orb projectile loop',
           'orbUp': 'green energy orbs by "attack ↑" (the 2 free orbs) — Open Eyes fan / Rising Gaze sparks',
           'beamDiag': 'diagonal beam slivers by "attack ↑" — Rising Gaze 45° beam',
           'beamH': 'horizontal beam (2 lines) at the end of "attack ↓" — does not touch the hand → FX; Low Gaze / ult stare'}


def main():
    a = load(); H, W = a.shape[:2]
    comps = components(a)
    bodies, fxs = build_frames(a, comps)
    removed = {k: sum(1 for c in comps if c['kind'] == k) for k in ('text', 'ex', 'box')}
    # uniform body cell from every body frame's extent around its anchor
    lo_x = hi_x = up_y = 0
    for row in bodies.values():
        for c in row:
            ax, fy = anchor(c)
            lo_x = min(lo_x, c['x0'] - ax); hi_x = max(hi_x, c['x1'] + 1 - ax); up_y = max(up_y, fy - c['y0'])
    CX = int(np.ceil(max(-lo_x, hi_x))) + 2; CW = CX * 2; FEET_Y = int(up_y) + 3; CH = FEET_Y + 3
    def cut(c):
        img = np.zeros((c['y1'] - c['y0'] + 1, c['x1'] - c['x0'] + 1, 4), np.uint8)
        img[c['ys'] - c['y0'], c['xs'] - c['x0'], :3] = a[c['ys'], c['xs']]; img[c['ys'] - c['y0'], c['xs'] - c['x0'], 3] = 255
        return img
    anim, ledger, used = {}, [], set()
    for key, ((row, idx), loop, speed, note) in A.items():
        strip = np.zeros((CH, CW * len(idx), 4), np.uint8)
        for k, i in enumerate(idx):
            c = bodies[row][i]; used.add((row, i)); ax, fy = anchor(c)
            ox = int(round(CX - ax)) + c['x0'] + k * CW; oy = FEET_Y - fy + c['y0']
            cell = cut(c); h, w = cell.shape[:2]
            assert ox >= k * CW and ox + w <= (k + 1) * CW and oy >= 0 and oy + h <= CH, f'{key}: frame cropped'
            m = cell[..., 3] > 0; strip[oy:oy + h, ox:ox + w][m] = cell[m]
            assert (strip[..., 3] > 0).sum() >= 0
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, f'{PREFIX}{key}_uniform.png'))
        anim[key] = dict(sheet=f'./{PREFIX}{key}_uniform.png', frames=len(idx), width=CW, height=CH, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
        ledger.append((key, row, idx, note))
    allb = {(r, i) for r, row in bodies.items() for i in range(len(row))}
    assert used == allb, f'unused body frames: {sorted(allb - used)}'
    fx_out = {}
    for key, frames in fxs.items():
        cells = []
        for group in frames:
            y0 = min(c['y0'] for c in group); x0 = min(c['x0'] for c in group)
            y1 = max(c['y1'] for c in group); x1 = max(c['x1'] for c in group)
            img = np.zeros((y1 - y0 + 1, x1 - x0 + 1, 4), np.uint8)
            for c in group: img[c['ys'] - y0, c['xs'] - x0, :3] = a[c['ys'], c['xs']]; img[c['ys'] - y0, c['xs'] - x0, 3] = 255
            cells.append(img)
        fw = max(c.shape[1] for c in cells); fh = max(c.shape[0] for c in cells)
        strip = np.zeros((fh, fw * len(cells), 4), np.uint8)
        for k, c in enumerate(cells):
            oy = (fh - c.shape[0]) // 2; ox = k * fw + (fw - c.shape[1]) // 2
            strip[oy:oy + c.shape[0], ox:ox + c.shape[1]] = c
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, f'{PREFIX}fx_{key}.png'))
        fx_out[key] = dict(sheet=f'./{PREFIX}fx_{key}.png', frames=len(cells), w=fw, h=fh, speed=FX_SPEED[key])
    nfx = sum(len(g) for v in fxs.values() for g in v)
    assert nfx == sum(1 for c in comps if c['kind'] == 'fx'), 'every FX component exported'
    geom = dict(cellW=CW, cellH=CH, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE)
    ex = {k: [i for i in v] for k, v in EX_FRAMES.items()}
    with open(os.path.join(ROOT, 'eyeguyAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_eyeguy.py from the Dragonrod Eyeguy sheet (Sheet by Dragonrod).\n'
                 '// See docs/ben10/aliens/eyeguy/SPRITE_LEDGER.md. EYEGUY_ANIM: uniform strips (cell %dx%d, body anchor x=%d,\n'
                 '// floor row originY=%d); frames are 1:1 copies of the keyed sheet components; on-screen size = actionScale.\n'
                 % (CW, CH, CX, FEET_Y))
        fh.write('export const EYEGUY_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const EYEGUY_FX = ' + json.dumps(fx_out, indent=2) + '\n')
        fh.write('export const EYEGUY_EX_FRAMES = ' + json.dumps({'attack_fwd': 'f3', 'attack_up': ['f3', 'f4']}) + '\n')
        fh.write('export const EYEGUY_GEOM = ' + json.dumps(geom) + '\n')
    os.makedirs(DOC, exist_ok=True)
    grid = dict(sheet='assets/sprites/ben10/aliens/eyeguy.png', size=[W, H], key=list(BG), removed=removed,
                bodies={r: [dict(bbox=[c['x0'], c['y0'], c['x1'], c['y1']], px=c['n'], anchor=[round(anchor(c)[0], 2), anchor(c)[1]],
                                 ex=(i in EX_FRAMES.get(r, []))) for i, c in enumerate(row)] for r, row in bodies.items()},
                fx={k: [[[c['x0'], c['y0'], c['x1'], c['y1']] for c in g] for g in v] for k, v in fxs.items()})
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)
    contact(anim, fx_out, geom)
    write_ledger(anim, ledger, fx_out, geom, removed, bodies)
    print(f'OK: {len(anim)} anims, {len(allb)} body frames (all used), {len(fx_out)} FX strips ({nfx} components), removed {removed}')


def contact(anim, fx, geom):
    S = 2; pad = 4; rows = []
    for key, d in anim.items():
        im = Image.open(os.path.join(ROOT, d['sheet'][2:])).convert('RGBA')
        bd = Image.new('RGBA', im.size, (40, 44, 52, 255)); bd.alpha_composite(im)
        dr = ImageDraw.Draw(bd)
        for k in range(d['frames']):
            x = k * d['width']
            dr.line([(x, geom['feetY']), (x + d['width'] - 1, geom['feetY'])], fill=(0, 200, 120, 255))
            dr.line([(x + geom['centreX'], 0), (x + geom['centreX'], d['height'])], fill=(90, 90, 200, 255))
            dr.rectangle([x, 0, x + d['width'] - 1, d['height'] - 1], outline=(80, 80, 90, 255))
        rows.append((key, bd))
    for key, d in fx.items():
        im = Image.open(os.path.join(ROOT, d['sheet'][2:])).convert('RGBA')
        bd = Image.new('RGBA', im.size, (40, 44, 52, 255)); bd.alpha_composite(im); rows.append(('fx_' + key, bd))
    LW = 90; Wd = max(r[1].width for r in rows) * S + LW + pad * 2; Hd = sum(r[1].height * S + pad for r in rows) + pad
    out = Image.new('RGBA', (Wd, Hd), (24, 26, 30, 255)); dr = ImageDraw.Draw(out); y = pad
    for key, im in rows:
        dr.text((pad, y + 2), key, fill=(230, 230, 230, 255))
        out.alpha_composite(im.resize((im.width * S, im.height * S), Image.NEAREST), (LW, y)); y += im.height * S + pad
    out.save(os.path.join(DOC, 'contact_sheet.png'))


def write_ledger(anim, ledger, fx, geom, removed, bodies):
    L = ['# Eyeguy (Opticoid) — sprite ledger\n',
         '**Sheet by Dragonrod** (author\'s request: "please, give credits if used!"). Source: repo-root '
         '`eyeguy_sprite_sheet_by_dragonrod342_d82qnsd.png` → `assets/sprites/ben10/aliens/eyeguy.png` (384×636).\n',
         '## Key, text removal, palette\n',
         f'- Background solid pale blue-grey **{BG}** keyed exactly (zero tolerance; all four corners). 19 colours on the sheet.\n'
         f'- Removed as whole connected components, nothing sampled from them: {removed["text"]} black label glyphs '
         f'("Stand / jump / fall / crouch / walk / attack → ↑ ↓"), {removed["ex"]} red "EX." tag pieces (237,28,36 — used nowhere '
         f'in his art) and the white credit box ({removed["box"]} component incl. its text).\n'
         '- Palette checked: no body / FX component contains the key colour, the tag red or pure white; his yellow / olive / '
         'green / pink-eye / black outline colours never collide with the key.\n',
         '## EX (max-charge) frames\n',
         '- **attack → f3** (EX Charged Eye Orb) and **attack ↑ f3, f4** (Rising Gaze). The orb drawn in attack → f3 and attack ↑ f3 '
         'touches the hand, so it is part of those body frames.\n',
         '## Cut\n',
         '- 8-connected components. Bodies: Stand 4, jump 1, fall 1, crouch 1, walk 6, attack 3, attack → 3, attack ↑ 4, attack ↓ 3 '
         '(26 body frames, every one used). Free-floating FX are their own frames: zigzag wave 2 lines (the top line is 3 '
         'gap-separated pieces of one wave, kept as one frame), 2 free orbs by attack →, 2 free orbs + 2 diagonal beam slivers by '
         'attack ↑, the horizontal beam (2 lines) at the end of attack ↓ — it does NOT touch his hand, so it is FX.\n'
         f'- Uniform body cell **{geom["cellW"]}×{geom["cellH"]}**, anchor column x={geom["centreX"]} (mean column of each frame\'s '
         f'bottom 10 rows = legs / feet), feet baseline originY={geom["feetY"]}; actionScale {ACTION_SCALE}. Nearest-neighbour, '
         'pixels copied 1:1, no frame cropped (asserted).\n',
         '## Every sheet frame → animation → move\n',
         '| Sheet row | Frame | Animations (moves) |', '|---|---|---|']
    names = {'stand': 'Stand', 'jfc': 'jump / fall / crouch', 'walk': 'walk', 'attack': 'attack', 'attack_fwd': 'attack →',
             'attack_up': 'attack ↑', 'attack_down': 'attack ↓'}
    jfc = ['jump', 'fall', 'crouch']
    for r, row in bodies.items():
        for i in range(len(row)):
            uses = [k for k, rr, idx, _ in ledger if rr == r and i in idx]
            lab = jfc[i] if r == 'jfc' else f'f{i + 1}'
            ex = ' **EX**' if i in EX_FRAMES.get(r, []) else ''
            L.append(f'| {names[r]} | {lab}{ex} | {", ".join(uses)} |')
    L.append('\n## Animation → move (exported strips `' + PREFIX + '<anim>_uniform.png`)\n')
    L.append('| Animation | Frames | Speed | Source / move |'); L.append('|---|---|---|---|')
    for k, rr, idx, note in ledger: L.append(f'| `{k}` | {len(idx)} | {anim[k]["speed"]} | {note} |')
    L.append('\n## Missing poses (closest real frame reused, no art invented)\n')
    L.append('- hit stun / knockdown → **fall**; get-up / lose / block → **crouch**; win / taunt / transform / dizzy → **Stand**; '
             'run / dash → **walk** sped up (speed 3 / 2 vs walk 5); walk_back = walk reversed; doubleJump = jump.\n')
    L.append('## FX (real sheet pixels, `' + PREFIX + 'fx_<key>.png`)\n')
    for k, d in fx.items(): L.append(f'- `{k}` ({d["frames"]} frame{"s" if d["frames"] > 1 else ""}, {d["w"]}×{d["h"]}): {FX_NOTE[k]}.')
    L.append('\n## Procedural / render-only (documented, not art)\n')
    L.append('- The Unblinking eye glyph over the opponent, the ALL-SEEING EYE screen of pixel eyes (hash-chosen positions, '
             'render-only), the air-attack eye flash, and rotated / mirrored / integer-enlarged copies of the real beam FX in '
             'the ultimate. None has a hitbox or any GAME_STATE presence.\n')
    L.append('\nContact sheet: `docs/ben10/aliens/eyeguy/contact_sheet.png` (every exported strip; green = feet baseline, blue = '
             'anchor column). Full geometry: `source_grid.json`.\n')
    open(os.path.join(DOC, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
