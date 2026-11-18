#!/usr/bin/env python3
# HIGHBREED — READY-alien slicer for the DS "Ben 10: Alien Force" boss sheet (assets/sprites/ben10/aliens/highbreed.png, 1000×3500,
# a byte copy of the tracked root file "DS _ DSi - Ben 10_ Alien Force - Bosses - Atasian_Highbreed.png"; identified by contact
# sheet: grey-skinned insectoid humanoid, orange bat-like wings, purple-black face / mandibles, solid green background, labelled rows
# "Idle (during dialouge)" … "Hurt (flying)", a boxed "projectile ?" frame, a "Text icon" box, credit "Ripped by:
# Eeveeloverthespriter8"). NOTE: in canon Ben never turns into a Highbreed; the owner asked for him as an Omnitrix form anyway.
#   python3 tools/ben10/slice_highbreed.py
# PIXEL ART (DS rip, frames ~95 px tall, 51 colours, no anti-aliasing): pixels are copied 1:1 — no filter, no resample. Scaling
# happens at render time: Ben's spriteScale 2.0 × actionScale 1.0 = an integer ×2, nearest-neighbour (smoothing off).
# KEY: background = solid green (20,149,63), keyed EXACTLY (zero tolerance; all four corners asserted). No halo exists (a pixel
# rip): every non-key pixel is either art or a label.
# PALETTE: greys / light blue-greys, near-blacks, purple / dark purple, orange — none is green-dominant inside the art (asserted);
# the only green-leaning colours on the sheet ((57,112,0), (47,92,0), (33,64,0)) are the Eevee mascot's collar in the credit box.
# NOT ART (excluded): every label glyph and label box (PURE BLACK (0,0,0) — the art never uses pure black, asserted), the
# "Text icon" box frame (kept: the small purple icon inside it, separately, as a cosmetic Dialogue-Taunt marker), the
# "projectile ?" box and the 31-px dark sliver inside it (VERDICT: unclear — not usable as a projectile, see the ledger), and the
# bottom-right credit box with the Eevee mascot and its text.
# CUT: every drawing is ONE 8-connected component (the white claw arcs touch the body in every attack frame, so they are part of
# that frame — none is free-floating). 3 single-pixel specks are merged into the frame whose box they sit in (within 3 px).
# ROWS: drawings are clustered into rows by their vertical centre, then the rows are mapped to the sheet's labelled sequences by
# CONTENT (windup → arc → recovery), because the label boxes sit sometimes above the first row and sometimes at the end of a block.
# ANCHORS: ground frames (walk / run / idle-dialogue / hurt walking & running / ground attacks / defeat / take off): feet = the
# lowest row, centre x = the torso (median x of the non-wing pixels in the 45–60 % band). Flying frames (flying / attack & hurt
# flying / flying-above attack row 1): torso centre (median of the non-wing, non-arc pixels) with ONE hover offset (HOVER px
# below it on the feet row). Top-down "flying above" frames: the body centroid (same hover offset). Deterministic.
import json, os, shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ORIG = os.path.join(ROOT, 'DS _ DSi - Ben 10_ Alien Force - Bosses - Atasian_Highbreed.png')
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/highbreed.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/highbreed')
BG = (20, 149, 63)
ACTION_SCALE = 1.0      # Ben's spriteScale 2.0 × 1.0 = an integer ×2 (≈ 190 px standing; Rath ×3, Humongousaur ×1.5)
HOVER = 52              # flying frames: the feet row sits 52 px below the torso centre (≈ a standing torso's height above its feet)
PREFIX = 'ben10_highbreed_ready_'
ICON_BOX = (836, 30, 927, 96)          # x0, y0, x1, y1 of the "Text icon" label box (the icon inside is kept separately)
PROJ_BOX = (585, 1495, 675, 1565)      # the "projectile ?" box
CREDIT_BOX = (705, 3310, 965, 3475)    # the credit box (Eevee mascot + "Ripped by" text)
# the sheet's labelled sequences → the clustered rows (top to bottom), mapped by content
SEQ = [
    ('dialogue', [0], 'Idle (during dialouge)', 'ground'),
    ('walking', [1], 'walking', 'ground'),
    ('running', [2, 3], 'running (12 + 1 extra)', 'ground'),
    ('flying', [4, 5], 'flying (11 + 4)', 'fly'),
    ('above', [6, 7, 8], 'flying above — TOP-DOWN camera (9 + 9 + 2)', 'top'),
    ('defeat', [9, 10, 11], 'Defeat (loop until screen fade) (8 + 8 + 7)', 'ground'),
    ('aboveAtk', [12, 13], 'flying above (attack) — 9 front-on wing-spread frames turning into 4 top-down (label at the block end)', 'fly'),
    ('atk1W', [14], 'Attack 1 (walking)', 'ground'),
    ('atk2W', [15, 16], 'Attack 2 (walking) — 12 + 6 (label at the block end)', 'ground'),
    ('hurtW', [17, 18], 'Hurt (walking) — 14 + 8 (two "hurt (walking)" labels)', 'ground'),
    ('takeoff', [19], 'take off (at end change to flying above)', 'ground'),
    ('atk1R', [20], 'Attack 1 (running)', 'ground'),
    ('atk2R', [21, 22], 'Attack 2 (running) — 11 + 2 (label at the block end)', 'ground'),
    ('hurtR', [23, 24], 'Hurt (running) — 11 + 2', 'ground'),
    ('atk1F', [25, 26], 'Attack 1 (flying) — 9 + 2', 'fly'),
    ('atk2F', [27, 28], 'Attack 2 (flying) — 8 + 5', 'fly'),
    ('hurtF', [29], 'Hurt (flying)', 'fly'),
]
COUNTS = {'dialogue': 13, 'walking': 12, 'running': 13, 'flying': 15, 'above': 20, 'defeat': 23, 'aboveAtk': 13, 'atk1W': 12,
          'atk2W': 18, 'hurtW': 22, 'takeoff': 4, 'atk1R': 11, 'atk2R': 13, 'hurtR': 13, 'atk1F': 11, 'atk2F': 13, 'hurtF': 4}
TOPDOWN_AT = {'aboveAtk': range(9, 13)}   # aboveAtk frames 9–12 are top-down (centroid anchor)
SPECKS = []


def load():
    if not os.path.exists(SRC):
        os.makedirs(os.path.dirname(SRC), exist_ok=True); shutil.copyfile(ORIG, SRC)
    assert open(SRC, 'rb').read() == open(ORIG, 'rb').read(), 'highbreed.png must be a byte copy of the root sheet'
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    assert tuple(a[0, 0]) == tuple(a[0, -1]) == tuple(a[-1, 0]) == tuple(a[-1, -1]) == BG, 'corners must be the key colour'
    return a


def inside(c, box):
    x0, y0, x1, y1 = box
    return c['x0'] >= x0 and c['y0'] >= y0 and c['x1'] <= x1 and c['y1'] <= y1


def components(a):
    fg = ~(a == BG).all(2)
    lbl, n = ndimage.label(fg, structure=np.ones((3, 3)))
    out = []
    for i, s in enumerate(ndimage.find_objects(lbl)):
        m = lbl[s] == i + 1; ys, xs = np.where(m); ys = ys + s[0].start; xs = xs + s[1].start
        px = a[ys, xs]
        out.append(dict(ys=ys, xs=xs, y0=int(ys.min()), x0=int(xs.min()), y1=int(ys.max()) + 1, x1=int(xs.max()) + 1, n=len(ys),
                        blk=float((px == 0).all(1).mean())))
    return out


def classify(a, cs):
    frames, text, icon, proj, credit, specks = [], [], [], [], [], []
    for c in cs:
        if inside(c, CREDIT_BOX): credit.append(c)
        elif inside(c, PROJ_BOX): (text if c['blk'] == 1.0 else proj).append(c)
        elif c['blk'] == 1.0: text.append(c)                      # label glyphs + label boxes (pure black only)
        elif inside(c, ICON_BOX): icon.append(c)
        elif c['n'] < 20: specks.append(c)
        else: frames.append(c)
    assert len(icon) == 1 and len(proj) == 1 and len(specks) == 3, (len(icon), len(proj), len(specks))
    for f in frames: assert f['blk'] == 0.0, f'art uses pure black @ {f["x0"]},{f["y0"]}'
    for s in specks:   # a lone pixel: part of the frame whose box (±3 px) holds it
        host = [f for f in frames if f['x0'] - 3 <= s['x0'] and s['x1'] <= f['x1'] + 3 and f['y0'] - 3 <= s['y0'] and s['y1'] <= f['y1'] + 3]
        assert len(host) == 1, f'speck @ {s["x0"]},{s["y0"]}: {len(host)} hosts'
        h = host[0]; h['ys'] = np.concatenate([h['ys'], s['ys']]); h['xs'] = np.concatenate([h['xs'], s['xs']]); h['n'] += s['n']
        h['y0'], h['x0'], h['y1'], h['x1'] = min(h['y0'], s['y0']), min(h['x0'], s['x0']), max(h['y1'], s['y1']), max(h['x1'], s['x1'])
        SPECKS.append([s['x0'], s['y0'], *map(int, a[s['ys'][0], s['xs'][0]])])
    return frames, text, icon[0], proj[0], credit


def rows_of(frames):
    fs = sorted(frames, key=lambda c: (c['y0'] + c['y1']) / 2); rows = []
    for c in fs:
        cy = (c['y0'] + c['y1']) / 2
        if rows and abs(cy - rows[-1]['cy']) < 35:
            rows[-1]['f'].append(c); rows[-1]['cy'] = sum((x['y0'] + x['y1']) / 2 for x in rows[-1]['f']) / len(rows[-1]['f'])
        else: rows.append(dict(cy=cy, f=[c]))
    return [sorted(r['f'], key=lambda c: c['x0']) for r in rows]


def is_wing(px): return (px[:, 0] >= 140) & (px[:, 2] <= 80) & (px[:, 0] - px[:, 2] >= 100)     # orange wing membrane
def is_arc(px): return (px >= 231).all(1)                                                           # white claw arc / highlight


def anchor(a, f, kind):
    px = a[f['ys'], f['xs']]
    core = ~is_wing(px) & ~is_arc(px)
    ys, xs = f['ys'][core], f['xs'][core]
    if kind == 'top':
        return float(np.mean(f['xs'])), float(np.mean(f['ys'])) + HOVER
    if kind == 'fly':
        return float(np.median(xs)), float(np.median(ys)) + HOVER
    y0, y1 = f['y0'], f['y1'] - 1
    hb = (ys >= y0 + 0.45 * (y1 - y0)) & (ys <= y0 + 0.60 * (y1 - y0))
    return float(np.median(xs[hb])), float(f['y1'])


def cut(a, f):
    img = np.zeros((f['y1'] - f['y0'], f['x1'] - f['x0'], 4), np.uint8)
    img[f['ys'] - f['y0'], f['xs'] - f['x0'], :3] = a[f['ys'], f['xs']]; img[f['ys'] - f['y0'], f['xs'] - f['x0'], 3] = 255
    return img


def R(k, *idx): return [(k, i) for i in idx]
def rng(k, a_, b): return [(k, i) for i in range(a_, b)]


# animation: (frames [(seq, i)], loop, speed, note)
A = {
    'idle':        (R('walking', 0), True, 12, 'COMBAT IDLE = walking f0 held (the sheet has no standing combat idle; the "Idle (during dialouge)" loop is the Dialogue Taunt only)'),
    'idleAlt':     (R('walking', 0), False, 8, 'walking f0 (REUSED)'),
    'walk':        (rng('walking', 0, 12), True, 5, 'walking — the 12-frame stride cycle'),
    'walk_back':   (rng('walking', 0, 12)[::-1], True, 6, 'walking reversed'),
    'run':         (rng('running', 0, 12), True, 3, 'running — the 12-frame run cycle'),
    'dash':        (R('running', 12), False, 4, 'running extra frame (row 2, the lone 13th drawing: a forward lean) — dash'),
    'jump':        (rng('takeoff', 0, 3), False, 5, 'TAKE OFF f0–f2 (the transition between running and flying; f3 turns top-down → Ultimate only)'),
    'doubleJump':  (rng('flying', 0, 4), False, 4, 'flying f0–f3 (a wing beat)'),
    'fall':        (rng('flying', 0, 15), True, 4, 'flying — the 15-frame flight loop (airborne idle / move)'),
    'fly':         (rng('flying', 0, 15), True, 4, 'flying — the flight loop (the FLYING movement state)'),
    'crouch':      (R('walking', 0), False, 6, 'walking f0 (REUSED as briefed; no crouch art)'),
    'guard':       (R('walking', 0), False, 6, 'BLOCK = walking f0 (REUSED as briefed; no block art)'),
    'crouchGuard': (R('walking', 0), False, 6, 'walking f0 (REUSED)'),
    'blockHit':    (R('hurtW', 0), False, 6, 'Hurt (walking) f0 (REUSED; no block-hit art)'),
    'hurt':        (rng('hurtW', 0, 9), False, 2, 'HIT REACT (grounded) = Hurt (walking) f0–f8, the standing recoil'),
    'hurt_run':    (rng('hurtR', 0, 13), False, 2, 'HIT REACT (running) = Hurt (running), all 13'),
    'hurt_air':    (rng('hurtF', 0, 4), False, 3, 'HIT REACT (flying) = Hurt (flying), all 4'),
    'knockdown':   (rng('defeat', 0, 5), False, 4, 'KNOCKDOWN = Defeat f0–f4 (the first few frames, as briefed)'),
    'getup':       (rng('hurtW', 9, 22), False, 3, 'GET UP = Hurt (walking) f9–f21, the crouched recovery rising'),
    'dizzy':       (rng('hurtW', 9, 13), True, 8, 'Hurt (walking) f9–f12 crouched sway (REUSED; no dizzy art)'),
    'transform':   (R('dialogue', 0) + R('walking', 0), False, 6, 'TRANSFORM-IN = Idle (during dialouge) f0 → walking f0 (the Omnitrix flash is the engine\'s)'),
    'taunt':       (rng('dialogue', 0, 13), True, 5, 'DIALOGUE TAUNT = Idle (during dialouge), the 13-frame talk loop (cosmetic only)'),
    'win':         (rng('dialogue', 0, 13), True, 6, 'WIN = Idle (during dialouge) loop (REUSED as briefed; no win art)'),
    'lose':        (rng('defeat', 5, 23), True, 4, 'LOSE = Defeat f5–f22, the lying loop (as briefed)'),
    # grounded (idle / walking) state
    'light':       (rng('atk1W', 0, 12), False, 2, 'JAB (grounded) = Attack 1 (walking), claw arcs f4–f7'),
    'heavy':       (rng('atk2W', 0, 18), False, 2, 'HEAVY (grounded) = Attack 2 (walking), windup f0–f7, arcs f8–f11, recovery f12–f17'),
    'down':        (rng('hurtW', 9, 14)[::-1], False, 3, 'LOW = Hurt (walking) f13 → f9 REVERSED (the crouched frames played backwards as a low claw; no low art, as briefed)'),
    'up':          (rng('atk1R', 0, 11), False, 2, 'LAUNCHER = Attack 1 (running), an anti-air lunge'),
    'air':         (rng('atk1F', 0, 11), False, 2, 'AIR = Attack 1 (flying), claw arc f6–f8'),
    'grab':        (rng('atk2W', 0, 8), False, 4, 'Attack 2 (walking) windup (REUSED; no grab art)'),
    # RUNNING state (the move-set selector)
    'lightRun':    (rng('atk1R', 0, 11), False, 2, 'JAB (running) = Attack 1 (running)'),
    'heavyRun':    (rng('atk2R', 0, 13), False, 2, 'HEAVY (running) = Attack 2 (running)'),
    # FLYING state
    'lightFly':    (rng('atk1F', 0, 11), False, 2, 'JAB (flying) = Attack 1 (flying)'),
    'heavyFly':    (rng('atk2F', 0, 13), False, 2, 'HEAVY (flying) = Attack 2 (flying)'),
    'airFly':      (rng('atk1F', 0, 11), False, 2, 'AIR (flying) = Attack 1 (flying)'),
    # specials
    'hbClaws':     (rng('atk2W', 0, 18), False, 2, 'RENDING CLAWS (grounded) = Attack 2 (walking) claw arc'),
    'hbClawsRun':  (rng('atk2R', 0, 13), False, 2, 'RENDING CLAWS (running) = Attack 2 (running)'),
    'hbClawsFly':  (rng('atk2F', 0, 13), False, 2, 'RENDING CLAWS (flying) = Attack 2 (flying)'),
    'hbDiveUp':    (rng('takeoff', 0, 3), False, 3, 'TALON DIVE leap = take off f0–f2'),
    'hbDive':      (rng('atk1F', 0, 11), False, 2, 'TALON DIVE = Attack 1 (flying) dive'),
    'hbLance':     (rng('atk2R', 0, 13), False, 2, 'GENETIC LANCE (melee fallback) = Attack 2 (running) lunge'),
    'hbLanceFly':  (rng('atk1F', 0, 11), False, 2, 'GENETIC LANCE (flying) = Attack 1 (flying)'),
    'hbWing':      (rng('atk2F', 0, 13), False, 2, 'WING SLASH (air) = Attack 2 (flying) arc'),
    # ultimate
    'hbUltRise':   (R('takeoff', 3) + rng('aboveAtk', 0, 13), False, 3, 'GENETIC PURGE take-off = take off f3 (turning top-down) → flying above (attack): front-on wing spread → top-down'),
    'hbUltCircle': (rng('above', 0, 20), True, 3, 'GENETIC PURGE aerial shot = flying above (TOP-DOWN camera), the 20-frame loop — ULTIMATE ONLY'),
    'hbUltDive':   (rng('atk1F', 0, 11), False, 1, 'GENETIC PURGE dive barrage = Attack 1 (flying)'),
    'hbUltBeam':   (rng('atk2W', 0, 18), False, 2, 'GENETIC PURGE purge beam = Attack 2 (walking), landed'),
}


def main():
    a = load(); H, W = a.shape[:2]
    frames, text, icon, proj, credit = classify(a, components(a))
    rows = rows_of(frames)
    assert len(rows) == 30, f'{len(rows)} rows'
    S, kinds = {}, {}
    for name, idx, label, kind in SEQ:
        S[name] = [f for r in idx for f in rows[r]]; kinds[name] = kind
        assert len(S[name]) == COUNTS[name], f'{name}: {len(S[name])} frames'
    assert sum(len(v) for v in S.values()) == len(frames) == 230
    # palette: no green-dominant art pixel (the key never appears inside a frame; the collar greens are credit-box only)
    for name, fs in S.items():
        for f in fs:
            px = a[f['ys'], f['xs']]
            assert not ((px[:, 1] > px[:, 0] + 30) & (px[:, 1] > px[:, 2] + 30)).any(), f'{name}: green-leaning art pixel'
    anc = {}
    for name, fs in S.items():
        for i, f in enumerate(fs):
            k = 'top' if (name in TOPDOWN_AT and i in TOPDOWN_AT[name]) else kinds[name]
            anc[(name, i)] = anchor(a, f, k)
    lo_x = hi_x = up_y = dn_y = 0
    for (name, i), (ax, fy) in anc.items():
        f = S[name][i]
        lo_x = min(lo_x, f['x0'] - ax); hi_x = max(hi_x, f['x1'] - ax); up_y = max(up_y, fy - f['y0']); dn_y = max(dn_y, f['y1'] - fy)
    CX = int(np.ceil(max(-lo_x, hi_x))) + 2; CW = CX * 2; FEET = int(np.ceil(up_y)) + 2; CH = FEET + max(2, int(np.ceil(dn_y)) + 2)
    anim, ledger, used = {}, [], set()
    for name, (cells, loop, speed, note) in A.items():
        strip = np.zeros((CH, CW * len(cells), 4), np.uint8)
        for j, key in enumerate(cells):
            f = S[key[0]][key[1]]; used.add(key); img = cut(a, f); h, w = img.shape[:2]
            ax, fy = anc[key]
            x_at = j * CW + int(round(CX - ax)) + f['x0']; y_at = int(round(FEET - fy)) + f['y0']
            assert x_at >= j * CW and x_at + w <= (j + 1) * CW and y_at >= 0 and y_at + h <= CH, f'{name}: frame cropped'
            m = img[..., 3] > 0; strip[y_at:y_at + h, x_at:x_at + w][m] = img[m]
            assert (strip[:, j * CW:(j + 1) * CW, 3] > 0).sum() == f['n'], f'{name} f{j}: pixel count changed'
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, f'{PREFIX}{name}_uniform.png'))
        anim[name] = dict(sheet=f'./{PREFIX}{name}_uniform.png', frames=len(cells), width=CW, height=CH, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET, actionScale=ACTION_SCALE)
        ledger.append((name, cells, note))
    unused = sorted(set((n, i) for n, fs in S.items() for i in range(len(fs))) - used)
    # the Text icon: a cosmetic marker strip of its own (Dialogue Taunt only; never combat art)
    ic = cut(a, icon); Image.fromarray(ic, 'RGBA').save(os.path.join(ROOT, f'{PREFIX}fx_texticon.png'))
    geom = dict(cellW=CW, cellH=CH, centreX=CX, feetY=FEET, hover=HOVER, actionScale=ACTION_SCALE, screenScale=round(2.0 * ACTION_SCALE, 4),
                icon=dict(sheet=f'./{PREFIX}fx_texticon.png', w=int(ic.shape[1]), h=int(ic.shape[0])))
    with open(os.path.join(ROOT, 'highbreedAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_highbreed.py from the DS Ben 10: Alien Force Highbreed sheet (Ripped by: Eeveeloverthespriter8).\n'
                 '// See docs/ben10/aliens/highbreed/SPRITE_LEDGER.md. HIGHBREED_ANIM: uniform strips (cell %dx%d, centre x=%d, feet row\n'
                 '// originY=%d; flying frames hang %d px below the torso centre). 1:1 pixel copies, nearest-neighbour; on screen ×2.\n'
                 '// HIGHBREED_GEOM.icon = the sheet\'s "Text icon" (cosmetic Dialogue-Taunt marker only, never combat art).\n' % (CW, CH, CX, FEET, HOVER))
        fh.write('export const HIGHBREED_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const HIGHBREED_GEOM = ' + json.dumps(geom) + '\n')
    os.makedirs(DOC, exist_ok=True)
    box = lambda c: [c['x0'], c['y0'], c['x1'], c['y1'], c['n']]
    src = dict(sheet='assets/sprites/ben10/aliens/highbreed.png', original=os.path.basename(ORIG), size=[W, H], key=list(BG),
               labelComponents=[box(c) for c in text], textIcon=box(icon), projectileSliver=box(proj), creditBox=[box(c) for c in credit],
               mergedSpecks=SPECKS, unusedDrawings=[f'{n} f{i}' for n, i in unused],
               sequences={n: dict(label=lab, kind=k, frames=[dict(bbox=[f['x0'], f['y0'], f['x1'], f['y1']], px=f['n'],
                                                                   anchor=[round(anc[(n, i)][0], 2), round(anc[(n, i)][1], 2)]) for i, f in enumerate(S[n])])
                          for n, _, lab, k in SEQ})
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(src, fh, indent=1)
    contact(anim, geom)
    previews(anim)
    write_ledger(anim, ledger, geom, text, icon, proj, credit, unused)
    proj_img = cut(a, proj); Image.fromarray(proj_img, 'RGBA').resize((proj_img.shape[1] * 8, proj_img.shape[0] * 8), Image.NEAREST).save(os.path.join(DOC, 'projectile_box_contents_x8.png'))
    print(f'OK: {len(anim)} anims, {len(frames)} drawings in {len(SEQ)} sequences ({len(unused)} unused), labels {len(text)} comps, '
          f'specks {len(SPECKS)}, cell {CW}x{CH} feet {FEET} centre {CX}, icon {ic.shape[1]}x{ic.shape[0]}, projectile sliver {proj["n"]} px')


def contact(anim, geom):
    pad = 4; rows = []
    for name, d in anim.items():
        im = Image.open(os.path.join(ROOT, d['sheet'][2:])).convert('RGBA')
        bd = Image.new('RGBA', im.size, (40, 44, 52, 255)); bd.alpha_composite(im)
        dr = ImageDraw.Draw(bd)
        for k in range(d['frames']):
            x = k * d['width']
            dr.line([(x, geom['feetY']), (x + d['width'] - 1, geom['feetY'])], fill=(0, 200, 120, 255))
            dr.line([(x + geom['centreX'], 0), (x + geom['centreX'], d['height'])], fill=(200, 200, 90, 255))
            dr.rectangle([x, 0, x + d['width'] - 1, d['height'] - 1], outline=(80, 80, 90, 255))
        s = min(1.0, 1400 / bd.width)
        rows.append((name, bd.resize((max(1, int(bd.width * s)), max(1, int(bd.height * s))), Image.NEAREST)))
    LW = 90; per = 2; cols = [rows[i::per] for i in range(per)]
    colW = max(r[1].width for r in rows) + LW + pad * 2; Hd = max(sum(r[1].height + pad for r in c) for c in cols) + pad
    out = Image.new('RGBA', (colW * per, Hd), (24, 26, 30, 255)); dr = ImageDraw.Draw(out)
    for ci, c in enumerate(cols):
        y = pad
        for name, im in c:
            dr.text((ci * colW + pad, y + 2), name, fill=(230, 230, 230, 255))
            out.alpha_composite(im, (ci * colW + LW, y)); y += im.height + pad
    out.save(os.path.join(DOC, 'contact_sheet.png'))


def previews(anim):
    for name in ('walk', 'run', 'fly', 'taunt', 'light', 'heavy', 'lightRun', 'heavyRun', 'air', 'heavyFly', 'hbUltRise', 'hbUltCircle', 'lose'):
        d = anim[name]; im = Image.open(os.path.join(ROOT, d['sheet'][2:])).convert('RGBA')
        fr = []
        for k in range(d['frames']):
            c = im.crop((k * d['width'], 0, (k + 1) * d['width'], d['height']))
            bg = Image.new('RGBA', c.size, (40, 44, 52, 255)); bg.alpha_composite(c); fr.append(bg.convert('P', palette=Image.ADAPTIVE))
        fr[0].save(os.path.join(DOC, f'preview_{name}.gif'), save_all=True, append_images=fr[1:], duration=max(60, d['speed'] * 16), loop=0)


def write_ledger(anim, ledger, geom, text, icon, proj, credit, unused):
    L = ['# Highbreed — sprite ledger\n',
         '**Ripped by: Eeveeloverthespriter8** (credit box on the sheet: "Ripped by: Eeveeloverthespriter8 / Credit isnt necisary but '
         'itd be nice"). Source: the tracked root file `DS _ DSi - Ben 10_ Alien Force - Bosses - Atasian_Highbreed.png` (DS *Ben 10: '
         'Alien Force*, bosses) → byte copy `assets/sprites/ben10/aliens/highbreed.png` (1000×3500). Identified by contact sheet: '
         'grey-skinned insectoid humanoid, orange bat-like wings, purple-black face / mandibles, solid green background, the labelled '
         'rows of the brief, the boxed "projectile ?" frame, the "Text icon" box and the credit box.\n',
         '> Canon note: Ben never transforms into a Highbreed in the show (they are a hostile race). The owner asked for him as a '
         'playable Omnitrix form anyway; he is built exactly as instructed.\n',
         '## Key, palette, labels\n',
         '- Background solid green **(20,149,63)** keyed exactly (zero tolerance; four corners asserted). A pixel rip: **no halo**, '
         '51 colours on the whole sheet.\n'
         '- **Palette collision check: none.** His greys / blue-greys, near-blacks (24,24,24) / (41,41,41), purples (75,0,108) / '
         '(99,24,99), oranges (239,99,0) / (231,140,49) and the white arcs are never green-dominant (asserted per frame). The only '
         'green-leaning colours on the sheet — (57,112,0), (47,92,0), (33,64,0) — are the Eevee mascot\'s collar inside the credit box '
         '(excluded). **Pure black (0,0,0) is used ONLY by labels / boxes** (the art never uses it — asserted), so every label glyph '
         f'and label box is cut by colour: **{len(text)} label components removed** (not art).\n'
         f'- **Credit box** (bottom right: Eevee mascot + text, {sum(c["n"] for c in credit)} px) — excluded, not art.\n'
         f'- **3 single-pixel specks** merged into the frame whose box holds them: {SPECKS}.\n',
         '## "projectile ?" — VERDICT: EXCLUDED\n',
         f'- The box holds one **{proj["n"]}-px dark sliver** ({proj["x1"] - proj["x0"]}×{proj["y1"] - proj["y0"]} px, at sheet '
         f'{proj["x0"]},{proj["y0"]}; greys + black — see `projectile_box_contents_x8.png`). It is not a readable thrown object or '
         'energy shape: a few pixels with no silhouette, no motion frames, and the ripper themselves marked it "?". **It is not used as '
         'a projectile.** GENETIC LANCE is therefore the **melee lunge fallback** (Attack 2 (running), 45 dmg, 280 px), as briefed — no '
         'projectile art is invented.\n',
         '## "Text icon" — cosmetic only\n',
         f'- The small purple hand / icon inside the top-right "Text icon" box ({icon["x1"] - icon["x0"]}×{icon["y1"] - icon["y0"]} px, '
         f'{icon["n"]} px) is a dialogue-UI icon, not a fighter frame. Exported alone as `{PREFIX}fx_texticon.png` and drawn beside him '
         '**only during the Dialogue Taunt** (render-only). Never combat art.\n',
         '## Sequences (clustered rows → labelled sequence, mapped by CONTENT)\n',
         'The label boxes sit sometimes above the first row of their block ("walking", "running", "flying", "Defeat", "Attack 1 …", '
         '"Hurt (running/flying)") and sometimes at the END of the block ("Idle (during dialouge)", "flying above (attack)", '
         '"Attack 2 (walking/running)", "take off"). Every block was previewed as an animation (`preview_*.gif`) and assigned by its '
         'content: a windup → white claw arc → recovery is one attack.\n',
         '| Sequence | Frames | Sheet label / note |', '|---|---|---|']
    for n, _, lab, k in SEQ:
        L.append(f'| `{n}` | {COUNTS[n]} | {lab} ({"ground: feet + torso" if k == "ground" else "flying: torso + hover" if k == "fly" else "TOP-DOWN: centroid + hover"} anchor) |')
    L.append('\n- **Real frames vs the brief\'s inventory:** dialogue idle 13 (≈12), walking 12, running 12 + 1, flying 15 (≈12 + 4 → 11 + 4), '
             'flying above **20** (9 + 9 + 2, not ≈14), Defeat 23 (≈24), an **extra block "flying above (attack)" (13: 9 front-on '
             'wing-spread frames turning into 4 top-down)** not in the inventory, Attack 1 (walking) 12, **Attack 2 (walking) 18** '
             '(windup 8 + arc 4 + recovery 6; ≈5 in the brief), Hurt (walking) **22** (9 standing recoil + 13 crouched recovery), take '
             'off 4, Attack 1 (running) 11, **Attack 2 (running) 13**, **Hurt (running) 13**, Attack 1 (flying) 11, **Attack 2 (flying) '
             '13**, Hurt (flying) 4. Real frames win.\n'
             '- **"flying above" is confirmed a TOP-DOWN camera angle on the same alien** (wings spread flat, head / mandibles seen '
             'from above, arms hanging below): used ONLY in the Ultimate\'s aerial shot (`hbUltCircle`), never as a standing / combat '
             'animation. "flying above (attack)" (front-on wing spread → top-down) is used only as the Ultimate\'s take-off (`hbUltRise`).\n'
             '- **"take off" is confirmed a TRANSITION** (running crouch → wings open → turning top-down), not a standalone move: f0–f2 '
             'are the jump / Talon Dive leap, f3 (already turning top-down, "at end change to flying above") only opens the Ultimate.\n')
    L.append(f'- Uniform cell **{geom["cellW"]}×{geom["cellH"]}**, centre x = {geom["centreX"]}, feet row originY = {geom["feetY"]}. '
             f'Ground frames: feet = lowest row, centre = torso (median x of the non-wing, non-arc pixels in the 45–60 % band). Flying '
             f'frames: the torso centre with ONE hover offset ({HOVER} px above the feet row). Top-down frames: the body centroid, same '
             'hover offset. Pixels copied 1:1, pixel counts preserved, nothing cropped (wings, mandibles, claws and arcs included — '
             f'asserted). On screen ×{geom["screenScale"]:g} (Ben\'s spriteScale 2.0 × actionScale {ACTION_SCALE:g}): an integer '
             'nearest-neighbour scale.\n')
    L.append('## Animation → move (exported strips `' + PREFIX + '<anim>_uniform.png`)\n')
    L.append('Per-state rows (the MOVE-SET SELECTOR picks the row by his current movement state; same buttons, same numbers):\n')
    L.append('| Move | Grounded (idle / walking) | Running | Flying |'); L.append('|---|---|---|---|')
    L.append('| Jab | `light` Attack 1 (walking) | `lightRun` Attack 1 (running) | `lightFly` Attack 1 (flying) |')
    L.append('| Heavy | `heavy` Attack 2 (walking) | `heavyRun` Attack 2 (running) | `heavyFly` Attack 2 (flying) |')
    L.append('| Air | — | — | `air` / `airFly` Attack 1 (flying) |')
    L.append('| Rending Claws | `hbClaws` Attack 2 (walking) | `hbClawsRun` Attack 2 (running) | `hbClawsFly` Attack 2 (flying) |')
    L.append('| Genetic Lance (melee) | `hbLance` Attack 2 (running) | `hbLance` | `hbLanceFly` Attack 1 (flying) |')
    L.append('| Hit react | `hurt` Hurt (walking) | `hurt_run` Hurt (running) | `hurt_air` Hurt (flying) |\n')
    L.append('| Animation | Frames | Speed | Source / move |'); L.append('|---|---|---|---|')
    for k, cells, note in ledger: L.append(f'| `{k}` | {len(cells)} | {anim[k]["speed"]} | {note} |')
    L.append('\n## Missing poses (closest real frame reused, no art invented)\n')
    L.append('- **combat idle / crouch / block / crouch-guard**: walking f0 (as briefed). **block-hit**: Hurt (walking) f0. **LOW**: Hurt '
             '(walking) f13 → f9 REVERSED (as briefed: no low-attack art). **win**: Idle (during dialouge) loop (as briefed). **get-up**: '
             'Hurt (walking) f9–f21 (the crouched recovery). **dizzy**: Hurt (walking) f9–f12. **grab**: Attack 2 (walking) windup. '
             '**transform-in**: Idle (during dialouge) f0 → walking f0 (no transform art; the Omnitrix flash is the engine\'s).\n')
    if unused: L.append(f'- Drawings not used by any animation: {", ".join(f"{n} f{i}" for n, i in unused)}.\n')
    L.append('## Extracted vs procedural effects\n')
    L.append('- **Extracted (real sheet pixels):** the white claw arcs in Attack 1 / 2 (walking, running, flying) — every arc touches '
             'the body, so it is part of that frame (no free-floating arc exists on the sheet); the Text icon (cosmetic, Dialogue Taunt only). '
             'The "projectile ?" sliver is **not** used (verdict above).\n'
             '- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the MUTATED glow, the DNA-strand spiral of the '
             'Ultimate, the purge beam burst, the wing trail, dive streaks, screen shake. They READ simulation state; they never write it.\n')
    L.append('\nContact sheet: `docs/ben10/aliens/highbreed/contact_sheet.png` (every exported strip; green = feet row, yellow = centre '
             'column). Geometry, removed labels, the icon, the projectile sliver, anchors: `source_grid.json`.\n\n'
             'Credit: **Ripped by: Eeveeloverthespriter8**.\n')
    open(os.path.join(DOC, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
