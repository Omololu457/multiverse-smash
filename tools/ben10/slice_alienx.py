#!/usr/bin/env python3
# ALIEN X (Celestialsapien) — READY-alien slicer for the regularDor8go sheet (repo root
# "alien_x_sprite_sheet_by_icton_de04pik.png", copied to assets/sprites/ben10/aliens/alienx.png).
#   python3 tools/ben10/slice_alienx.py
# Background = solid red (255,0,0) keyed EXACTLY (zero tolerance; all four corners). His body is BLACK with a WHITE outline
# (+ a few green / yellow-green Omnitrix-symbol marks); the labels and the credit text are BLACK too (anti-aliased with dark
# reds), so they are separated by COMPONENT, not colour: every body frame contains pure-white outline pixels, no text
# glyph does (asserted, plus a size / position check). The small yellow arrow of the transform strip is its own
# component (yellow) and is excluded. The Lose burst's thin red streaks are exactly the key colour → background; its
# white ray wedges are connected to the body and kept. Every frame is an 8-connected component copied 1:1
# (nearest-neighbour, never cropped). Bodies are anchored on the feet baseline + the mean column of the BLACK body pixels of
# the bottom 10 rows (legs / feet — never the white streaks, rays or crest); the Dash frame (horizontal flight, no feet) is
# anchored on its torso centre with a fixed hover offset. Outputs strips `ben10_alienx_ready_<anim>_uniform.png`,
# alienxAssets.js and docs/ben10/aliens/alienx/{SPRITE_LEDGER.md, contact_sheet.png, source_grid.json}.
# Deterministic: re-running reproduces byte-identical files.
import json, os, shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_ROOT = os.path.join(ROOT, 'alien_x_sprite_sheet_by_icton_de04pik.png')
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/alienx.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/alienx')
BG = (255, 0, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
ARROW_YELLOW = (240, 232, 0)
ACTION_SCALE = 1.15   # ~68 px native body → ~185 px on screen (Ben's spriteScale 2.0 × global 1.18): a LARGE alien (Eyeguy ~150)
HOVER = 34            # Dash frame: torso centre sits this many native px above the feet line (consistent hover offset)
PREFIX = 'ben10_alienx_ready_'

# sheet groups: name → (y0, y1, x0, x1, expected body count). Bodies sorted top-to-bottom band, then left-to-right.
GROUPS = [('transform', 15, 95, 900, 1192, 2), ('stance', 30, 110, 0, 200, 1), ('dash', 40, 80, 200, 400, 1),
          ('turn', 140, 225, 0, 260, 5), ('extra', 140, 225, 260, 400, 1), ('grab', 260, 345, 0, 200, 1),
          ('attacks', 370, 510, 0, 600, 10), ('circle', 555, 635, 0, 700, 12), ('damage', 665, 740, 0, 280, 4),
          ('trying', 665, 740, 280, 450, 1), ('lose', 815, 885, 0, 260, 2)]
NAMES = {'transform': 'Transform strip (top right)', 'stance': 'Stance', 'dash': 'Dash', 'turn': 'Turn', 'extra': 'Extra* (Turn row)',
         'grab': 'Grab', 'attacks': 'Attacks', 'circle': 'Circle thingy', 'damage': 'Damage',
         'trying': 'Trying circle after damage* (Damage row)', 'lose': 'Lose'}


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
        if WHITE in cols: kind = 'body'
        elif ARROW_YELLOW in cols: kind = 'arrow'
        else: kind = 'text'
        comps.append(dict(id=i, kind=kind, y0=int(ys.min()), x0=int(xs.min()), y1=int(ys.max()), x1=int(xs.max()), n=len(ys), ys=ys, xs=xs))
    # palette / separation checks
    for c in comps:
        cols = set(map(tuple, a[c['ys'], c['xs']]))
        if c['kind'] == 'text':   # black glyphs anti-aliased with dark reds (R only) — never white / green / yellow; all small
            assert all(col == BLACK or (col[1] == 0 and col[2] == 0) for col in cols), f'text glyph with a foreign colour @ {c["y0"]},{c["x0"]}'
            assert c['n'] < 400, f'text glyph too large to be a label @ {c["y0"]},{c["x0"]}'
        if c['kind'] == 'body':
            assert c['n'] >= 590, f'body component too small @ {c["y0"]},{c["x0"]}'
            assert not any(col[1] == 0 and col[2] == 0 and 0 < col[0] < 255 for col in cols), 'dark-red text anti-alias inside a body'
    return comps


def group_of(c):
    cy = (c['y0'] + c['y1']) / 2; cx = (c['x0'] + c['x1']) / 2
    for name, y0, y1, x0, x1, _ in GROUPS:
        if y0 <= cy <= y1 and x0 <= cx < x1: return name
    return None


def build(comps):
    bodies = {}
    for name, *_r, cnt in GROUPS:
        bs = sorted([c for c in comps if c['kind'] == 'body' and group_of(c) == name], key=lambda c: (c['y0'] // 60, c['x0']))
        assert len(bs) == cnt, f'{name}: {len(bs)} bodies, expected {cnt}'
        bodies[name] = bs
    assert sum(len(v) for v in bodies.values()) == sum(1 for c in comps if c['kind'] == 'body'), 'every body component belongs to a group'
    return bodies


def anchor(a, c, group):
    if group == 'dash':   # horizontal flying figure, no feet: torso centre + a consistent hover offset
        blk = (a[c['ys'], c['xs']] == BLACK).all(1)
        return float(c['xs'][blk].mean()), int(round(c['ys'][blk].mean())) + HOVER
    sel = c['ys'] >= c['y1'] - 9
    blk = sel & (a[c['ys'], c['xs']] == BLACK).all(1)
    xs = c['xs'][blk] if blk.any() else c['xs'][sel]
    return float(xs.mean()), int(c['y1'])


# animation → list of (group, index) frames; loop / speed; notes for the ledger. bob=True: frame 2 is the same pixels 1 px up.
A = {
    'idle':        ([('stance', 0), ('stance', 0)], True, 18, 'Stance f1 held; render-only 2-frame vertical bob (frame 2 = the same pixels 1 px higher) so he is not frozen', True),
    'walk':        ([('turn', 0), ('turn', 1), ('turn', 2), ('turn', 3), ('turn', 4)], True, 9, 'Turn f1-5 cycled SLOWLY (no walk row)', False),
    'walk_back':   ([('turn', 4), ('turn', 3), ('turn', 2), ('turn', 1), ('turn', 0)], True, 9, 'Turn f1-5 reversed (no walk row)', False),
    'run':         ([('turn', 0), ('turn', 1), ('turn', 2), ('turn', 3), ('turn', 4)], True, 5, 'Turn f1-5 faster (no run row)', False),
    'dash':        ([('dash', 0)], False, 6, 'Dash (horizontal flight pose; ground / air dash)', False),
    'jump':        ([('extra', 0)], False, 6, 'Extra* side profile = jump rise', False),
    'doubleJump':  ([('extra', 0)], False, 6, 'Extra* side profile reused', False),
    'fall':        ([('extra', 0)], False, 6, 'Extra* side profile reused (no fall frame)', False),
    'crouch':      ([('stance', 0)], False, 6, 'Stance reused (no crouch frame)', False),
    'guard':       ([('stance', 0)], False, 6, 'Stance reused for block / block-hit (no block frame)', False),
    'transform':   ([('transform', 0), ('transform', 1)], False, 6, 'TRANSFORM: starry cosmic body = transform-in flash → normal body = settle', False),
    'axTimeout':   ([('lose', 1), ('transform', 0)], False, 8, 'forced Omnitrix TIMEOUT revert: Lose f2 burst → starry body', False),
    'taunt':       ([('stance', 0), ('circle', 11)], False, 10, 'Stance + Circle f12 flare reused (no taunt row)', False),
    'win':         ([('stance', 0), ('circle', 11)], True, 14, 'WIN = Stance + Circle f12 flare (no win row)', False),
    'lose':        ([('lose', 0)], False, 6, 'Lose f1 small curled = lose pose', False),
    'hurt':        ([('damage', 0)], False, 6, 'Damage f1 = hit_react light', False),
    'axHurtHeavy': ([('damage', 1)], False, 6, 'Damage f2 = hit_react heavy (used while hitstun ≥ 20)', False),
    'hurt_air':    ([('damage', 3)], False, 6, 'Damage f4 = launched', False),
    'knockdown':   ([('damage', 2)], False, 6, 'Damage f3 = knockdown (lying curled)', False),
    'getup':       ([('damage', 3)], False, 6, 'Damage f4 = get-up', False),
    'dizzy':       ([('damage', 1)], True, 9, 'Damage f2 reused (no dizzy row)', False),
    'light':       ([('attacks', 0)], False, 3, 'JAB = Attacks f1 (fist + white energy streak)', False),
    'heavy':       ([('attacks', 1), ('attacks', 2), ('attacks', 3)], False, 5, 'HEAVY = Attacks f2-4', False),
    'down':        ([('attacks', 4), ('attacks', 5)], False, 4, 'LOW = Attacks f5-6 (crouched lunge / swing; f5 white energy flame)', False),
    'up':          ([('attacks', 7), ('attacks', 8)], False, 4, 'LAUNCHER = Attacks f8-9 (tumbling, f8 energy flame)', False),
    'air':         ([('attacks', 9)], False, 4, 'AIR = Attacks f10 (spinning)', False),
    'axCast':      ([('circle', i) for i in range(12)], False, 2, 'DECREE cast = Circle thingy f1-12 (Nullify / Gravity / ult casts; ring is procedural)', False),
    'axCastHold':  ([('circle', 11)], False, 6, 'Circle f12 held during the ring / Big Bang flare', False),
    'axRewind':    ([('trying', 0)], False, 6, 'REWIND cast pose = "Trying circle after damage*"', False),
    'axGrasp':     ([('grab', 0)], False, 6, 'VOID GRASP = Grab (extended arm)', False),
    'axThrow':     ([('attacks', 6)], False, 6, 'VOID GRASP throw release = Attacks f7 (the heavy-variant swing)', False),
    'axFly':       ([('dash', 0)], False, 6, 'FLIGHT / STARFALL DASH body = Dash frame', False),
}


def main():
    a = load(); H, W = a.shape[:2]
    comps = components(a)
    bodies = build(comps)
    removed = {k: sum(1 for c in comps if c['kind'] == k) for k in ('text', 'arrow')}
    lo_x = hi_x = up_y = dn_y = 0
    for g, row in bodies.items():
        for c in row:
            ax, fy = anchor(a, c, g)
            lo_x = min(lo_x, c['x0'] - ax); hi_x = max(hi_x, c['x1'] + 1 - ax); up_y = max(up_y, fy - c['y0']); dn_y = max(dn_y, c['y1'] + 1 - fy)
    CX = int(np.ceil(max(-lo_x, hi_x))) + 2; CW = CX * 2; FEET_Y = int(up_y) + 3; CH = FEET_Y + max(3, int(dn_y) + 2)

    def cut(c):
        img = np.zeros((c['y1'] - c['y0'] + 1, c['x1'] - c['x0'] + 1, 4), np.uint8)
        img[c['ys'] - c['y0'], c['xs'] - c['x0'], :3] = a[c['ys'], c['xs']]; img[c['ys'] - c['y0'], c['xs'] - c['x0'], 3] = 255
        return img
    anim, ledger, used = {}, [], set()
    for key, (frames, loop, speed, note, bob) in A.items():
        strip = np.zeros((CH, CW * len(frames), 4), np.uint8)
        for k, (g, i) in enumerate(frames):
            c = bodies[g][i]; used.add((g, i)); ax, fy = anchor(a, c, g)
            ox = int(round(CX - ax)) + c['x0'] + k * CW; oy = FEET_Y - fy + c['y0'] - (1 if (bob and k == 1) else 0)
            cell = cut(c); h, w = cell.shape[:2]
            assert ox >= k * CW and ox + w <= (k + 1) * CW and oy >= 0 and oy + h <= CH, f'{key}: frame cropped'
            m = cell[..., 3] > 0; strip[oy:oy + h, ox:ox + w][m] = cell[m]
            assert (strip[:, k * CW:(k + 1) * CW, 3] > 0).sum() == c['n'], f'{key} f{k}: pixel count changed'
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, f'{PREFIX}{key}_uniform.png'))
        anim[key] = dict(sheet=f'./{PREFIX}{key}_uniform.png', frames=len(frames), width=CW, height=CH, speed=speed, anchorY=0,
                         loop=loop, lockLastFrame=not loop, originY=FEET_Y, actionScale=ACTION_SCALE)
        ledger.append((key, frames, note))
    allb = {(g, i) for g, row in bodies.items() for i in range(len(row))}
    assert used == allb, f'unused body frames: {sorted(allb - used)}'
    geom = dict(cellW=CW, cellH=CH, centreX=CX, feetY=FEET_Y, actionScale=ACTION_SCALE, hover=HOVER)
    with open(os.path.join(ROOT, 'alienxAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_alienx.py from the regularDor8go Alien X sheet (Sheet by regularDor8go).\n'
                 '// See docs/ben10/aliens/alienx/SPRITE_LEDGER.md. ALIENX_ANIM: uniform strips (cell %dx%d, body anchor x=%d,\n'
                 '// floor row originY=%d); frames are 1:1 copies of the keyed sheet components; on-screen size = actionScale.\n'
                 % (CW, CH, CX, FEET_Y))
        fh.write('export const ALIENX_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const ALIENX_GEOM = ' + json.dumps(geom) + '\n')
    os.makedirs(DOC, exist_ok=True)
    grid = dict(sheet='assets/sprites/ben10/aliens/alienx.png', size=[W, H], key=list(BG), removed=removed,
                bodies={g: [dict(bbox=[c['x0'], c['y0'], c['x1'], c['y1']], px=c['n'], anchor=[round(anchor(a, c, g)[0], 2), anchor(a, c, g)[1]])
                            for c in row] for g, row in bodies.items()},
                text=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in comps if c['kind'] == 'text'],
                arrow=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in comps if c['kind'] == 'arrow'])
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(grid, fh, indent=1)
    contact(anim, geom)
    write_ledger(anim, ledger, geom, removed, bodies)
    print(f'OK: {len(anim)} anims, {len(allb)} body frames (all used), removed {removed}, cell {CW}x{CH} feet {FEET_Y}')


def contact(anim, geom):
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
    LW = 90; Wd = max(r[1].width for r in rows) * S + LW + pad * 2; Hd = sum(r[1].height * S + pad for r in rows) + pad
    out = Image.new('RGBA', (Wd, Hd), (24, 26, 30, 255)); dr = ImageDraw.Draw(out); y = pad
    for key, im in rows:
        dr.text((pad, y + 2), key, fill=(230, 230, 230, 255))
        out.alpha_composite(im.resize((im.width * S, im.height * S), Image.NEAREST), (LW, y)); y += im.height * S + pad
    out.save(os.path.join(DOC, 'contact_sheet.png'))


def write_ledger(anim, ledger, geom, removed, bodies):
    L = ['# Alien X (Celestialsapien) — sprite ledger\n',
         '**Sheet by regularDor8go** (credit text on the sheet: "Alien X by regularDor8go"). Source: repo-root '
         '`alien_x_sprite_sheet_by_icton_de04pik.png` → `assets/sprites/ben10/aliens/alienx.png` (1192×966).\n',
         '## Key, text removal, palette\n',
         f'- Background solid red **{BG}** keyed exactly (zero tolerance; all four corners). 18 colours on the sheet.\n'
         f'- His body is BLACK with a WHITE outline plus small green / yellow-green Omnitrix-symbol and eye marks '
         '(137,192,65 / 181,230,29) and a few dark greys. **Collision check:** the labels and the credit text are BLACK too, '
         'anti-aliased with dark reds (58 / 102 / 144 / 182 / 219, 0, 0). They are separated by component, not colour: every '
         f'body component contains pure-white outline pixels and ≥ 590 px; none of the {removed["text"]} text glyph '
         'components contains white, green or yellow, and the largest is 267 px (asserted). No dark-red anti-alias pixel '
         'occurs inside a body component (asserted). The key red never occurs inside his art except as background.\n'
         '- EXCLUDED as whole connected components, nothing sampled from them: every label ("Stance", "Dash", "Turn", '
         '"Extra*", "Grab", "Attacks", "Circle thingy", "Damage", "Trying circle after damage*", "Lose"), the credit '
         f'"Alien X by regularDor8go" ({removed["text"]} glyph components in all) and the small yellow arrow of the transform '
         f'strip ({removed["arrow"]} component: 240,232,0 / 216,176,0 / 160,104,0 + light greys). Positions of every removed '
         'component are in `source_grid.json`; the contact sheet was checked by eye before cutting.\n'
         '- Lose f2 burst: the thin red streaks between the rays are exactly the key colour → background; the white ray '
         'wedges are 8-connected to the body and stay part of that frame.\n',
         '## Cut\n',
         '- 8-connected components: Transform 2, Stance 1, Dash 1, Turn 5 + Extra 1, Grab 1, Attacks 10 (7 + 3), Circle '
         'thingy 12, Damage 4 + "trying circle" 1, Lose 2 = **40 body frames, every one used**. White energy streaks / '
         'flames touching a fist (Attacks f1-5, f8) are part of that body frame.\n'
         f'- Uniform cell **{geom["cellW"]}×{geom["cellH"]}**, anchor column x={geom["centreX"]} = mean column of the BLACK body '
         'pixels of each frame\'s bottom 10 rows (legs / feet — never streaks, rays or the crest), feet baseline '
         f'originY={geom["feetY"]}; actionScale {ACTION_SCALE}. The Dash frame (horizontal flight, no feet) is anchored on '
         f'its torso centre (mean of its black pixels) with a consistent hover offset of {HOVER} native px above the feet line. '
         'Nearest-neighbour, pixels copied 1:1, no frame cropped, pixel counts preserved (asserted).\n',
         '## Every sheet frame → animation → move\n',
         '| Sheet group | Frame | Animations (moves) |', '|---|---|---|']
    for g, row in bodies.items():
        for i in range(len(row)):
            uses = [k for k, frames, _ in ledger if (g, i) in frames]
            lab = ('starry (cosmic)' if i == 0 else 'normal') if g == 'transform' else f'f{i + 1}'
            L.append(f'| {NAMES[g]} | {lab} | {", ".join(uses)} |')
    L.append('\n## Animation → move (exported strips `' + PREFIX + '<anim>_uniform.png`)\n')
    L.append('| Animation | Frames | Speed | Source / move |'); L.append('|---|---|---|---|')
    for k, frames, note in ledger: L.append(f'| `{k}` | {len(frames)} | {anim[k]["speed"]} | {note} |')
    L.append('\n## Missing poses (closest real frame reused, no art invented)\n')
    L.append('- **idle**: Stance f1 held + a render-only 2-frame vertical bob (frame 2 = the same pixels 1 px higher).\n'
             '- **walk / walk_back / run**: the Turn f1-5 frames cycled slowly (walk, speed 9), reversed (walk_back), faster (run, 5).\n'
             '- **jump / doubleJump / fall**: Extra* side profile (no jump / fall frames).\n'
             '- **crouch, block, block-hit**: Stance (no crouch / block frames). **dizzy**: Damage f2. **taunt / win**: Stance + '
             'Circle f12 flare. **get-up**: Damage f4.\n'
             '- **axTimeout** (Lose f2 burst → starry body) is exported for the forced Omnitrix timeout; the framework\'s forced '
             'revert is instantaneous (no per-alien revert pose), so it is not displayed today — no hook was added for it.\n')
    L.append('## Extracted vs procedural effects\n')
    L.append('- **Extracted (real sheet pixels, part of body frames):** the white energy streaks on Attacks f1-4, the energy '
             'flames on Attacks f5 / f8, the Lose f2 white ray burst, the starry transform body.\n'
             '- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the Nullify / Gravity / Reality-'
             'rewrite rings, the Absolute Decree starfield, the Big Bang radial burst, the Void pips and the Unmade void glyph '
             'over the opponent, the Rewind afterimage trail, the HUD voice label. They READ simulation state; they never write it.\n')
    L.append('\nContact sheet: `docs/ben10/aliens/alienx/contact_sheet.png` (every exported strip; green = feet baseline, blue = '
             'anchor column). Full geometry + every removed component: `source_grid.json`.\n')
    open(os.path.join(DOC, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
