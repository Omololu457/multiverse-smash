#!/usr/bin/env python3
# JETRAY (Aerophibian) — READY-alien slicer for the Fun-tech.tk sheet (assets/sprites/ben10/aliens/jetray.png, 1200×2000,
# copied from the owner's download "820786773_orig.png"; found by contact sheet among the blue-background downloads — red-and-
# yellow manta with a yellow horned head, green warp-bubble streak frames, white diving-manta silhouette).
#   python3 tools/ben10/slice_jetray.py
# HIGH-RES CARTOON ART (not pixel art, frames ~300 px wide): pixels are copied 1:1 — no blur, no filter, no resample. Scaling
# happens at render time through the engine's standard path (spriteScale × actionScale, image smoothing off).
# KEY: background = solid blue (0,0,255), keyed EXACTLY (zero tolerance; all four corners asserted). The body frames are flat
# vector-style art; any blue-blend edge pixel (B − max(R,G) ≥ 40 within 2 px of the key) is removed as halo (never art).
# Palette check: dark-red / maroon, yellow / gold, green Omnitrix + eyes, black — none blue-dominant (asserted on the bodies).
# WARP-BUBBLE STREAK FRAMES (right column R1–R3): the fading trail is a NON-LINEAR lavender → blue gradient (B falls 252 → 186 as
# R = G rises 12 → 103 — not a single colour alpha-mixed over the key), so un-blending against the key cannot recover a clean
# alpha. Decision: cut ONLY the opaque core (figure + green bubble + its pale rim) — the grey-lavender trail (R ≈ G, B ≥ R + 20)
# and every blue-blend pixel touching it are dropped — and the fading trail is rebuilt in jetray.js as a procedural pixel streak.
# No blue fringe survives (asserted: no kept pixel within 2 px of a removed one is blue-dominant).
# TEXT: "Fun-tech.tk" (black) and "Ben 10 / Game creator" (green-cyan) glyphs in the top-right box: removed, not art.
# DUPLICATES: the 12 left-column cells hold only 7 distinct drawings (Col 1 R2 = R4 = R6 = Col 2 R2; Col 1 R3 = R5 = Col 2 R1;
# Col 2 R5 has the same outline as Col 3 R4 (beak closed vs open) and as the white silhouette Col 3 R5) — asserted pixel-exact.
# ANCHOR: the chest Omnitrix (largest green component) = torso centre, + a CONSISTENT hover offset (he has no ground contact; wing
# tips / tail are never the anchor). Streak frames: the green bubble's centroid. Per-frame EYE anchor (mean of the two small green
# eye components; Col 3 R4 = its twin Col 2 R5's) is exported for the Eye Laser. Deterministic: re-running is byte-identical.
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/jetray.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/jetray')
BG = (0, 0, 255)
HALO_D = 40
TEXT_BOX = (0, 760, 300, 1200)   # y0, x0, y1, x1 of the credit text
ACTION_SCALE = 0.20   # ~274 px upright frame → ≈ 129 px on screen (Ben's spriteScale 2.0 × global 1.18 × 0.20) ≈ human Ben's
                      # height; the side glide's wingspan (~310 px) → ≈ 146 px. A fixed engine scale, smoothing off.
HOVER_PX = 6          # grounded hover: he floats 6 screen px above the floor (render offset baked into the anchor)
PREFIX = 'ben10_jetray_ready_'
# grid cells: (x0, y0) of each distinct drawing's bounding box on the sheet → name
CELLS = {
    'g1': ('Col 1 R1', 19, 20), 'g2': ('Col 1 R2', 15, 354), 'g3': ('Col 1 R3', 13, 721),
    'bank': ('Col 2 R3', 341, 701), 'up': ('Col 2 R4', 393, 1027), 'dive': ('Col 2 R5', 359, 1372), 'upw': ('Col 2 R6', 396, 1703),
    'beak': ('Col 3 R4', 799, 1162), 'sil': ('Col 3 R5', 806, 1562),
    's1': ('Col 3 R1', 739, 396), 's2': ('Col 3 R2', 682, 617), 's3': ('Col 3 R3', 716, 903),
}
DUPES = {'Col 1 R4': 'g2', 'Col 1 R6': 'g2', 'Col 2 R2': 'g2', 'Col 1 R5': 'g3', 'Col 2 R1': 'g3'}
DUPE_XY = {'Col 1 R4': (16, 1091), 'Col 1 R6': (20, 1742), 'Col 2 R2': (351, 352), 'Col 1 R5': (11, 1435), 'Col 2 R1': (348, 44)}
STREAK = ('s1', 's2', 's3')
KEPT = []
SPECKS = []


def load():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    assert tuple(a[0, 0]) == tuple(a[0, -1]) == tuple(a[-1, 0]) == tuple(a[-1, -1]) == BG, 'corners must be the key colour'
    return a


def is_trail(px):   # the streak frames' grey-lavender fading trail (R ≈ G, bluer than it is red)
    return (np.abs(px[..., 0] - px[..., 1]) <= 4) & (px[..., 2] >= px[..., 0] + 20)


def masks(a):
    key = (a == BG).all(2)
    d = a[..., 2] - np.maximum(a[..., 0], a[..., 1])
    trail = ~key & is_trail(a)
    region = np.zeros(trail.shape, bool); region[380:1020, 680:] = True               # the three streak cells only
    trail &= region
    gone = key | trail
    dist = ndimage.distance_transform_cdt(~gone, metric='chessboard')
    halo = ~gone & (d >= HALO_D) & (dist <= 2)
    for _ in range(8):   # a blend pixel touching a removed halo pixel is halo too (the streak trail's soft edge runs deep)
        grow = ~gone & ~halo & (d >= HALO_D) & ndimage.binary_dilation(halo | gone, structure=np.ones((3, 3)))
        if not grow.any(): break
        halo |= grow
    fg = ~gone & ~halo
    return key, trail, halo, fg, d


def comps(fg):
    lbl, n = ndimage.label(fg, structure=np.ones((3, 3)))
    out = []
    for i, s in enumerate(ndimage.find_objects(lbl)):
        m = lbl[s] == i + 1
        ys, xs = np.where(m); ys = ys + s[0].start; xs = xs + s[1].start
        out.append(dict(y0=int(ys.min()), x0=int(xs.min()), y1=int(ys.max()), x1=int(xs.max()), ys=ys, xs=xs, n=len(ys)))
    return out


def gather(a, fg):
    cs = comps(fg)
    bodies = [c for c in cs if c['n'] >= 3000]
    text, merged = [], []
    for c in cs:
        if c['n'] >= 3000: continue
        ty0, tx0, ty1, tx1 = TEXT_BOX
        if c['y0'] >= ty0 and c['y1'] < ty1 and c['x0'] >= tx0 and c['x1'] < tx1:
            text.append(c); continue
        host = [b for b in bodies if c['y0'] >= b['y0'] - 24 and c['y1'] <= b['y1'] + 24 and c['x0'] >= b['x0'] - 24 and c['x1'] <= b['x1'] + 24]
        assert host, f'unattached fragment @ {c["x0"]},{c["y0"]} ({c["n"]} px)'
        b = min(host, key=lambda b: abs((b['y0'] + b['y1']) / 2 - (c['y0'] + c['y1']) / 2) + abs((b['x0'] + b['x1']) / 2 - (c['x0'] + c['x1']) / 2))
        for k in ('ys', 'xs'): b[k] = np.concatenate([b[k], c[k]])
        b['n'] += c['n']; b['y0'] = min(b['y0'], c['y0']); b['y1'] = max(b['y1'], c['y1']); b['x0'] = min(b['x0'], c['x0']); b['x1'] = max(b['x1'], c['x1'])
        merged.append(c)
    return bodies, text, merged


def find(bodies, x, y):
    # the figure whose top-left corner is nearest the cell's original (pre-trail-removal) corner; streak cores start further
    # right once their trail is dropped, so they match on the row (y) and the right half of the cell
    best = min(bodies, key=lambda b: abs(b['y0'] - y) * 4 + max(0, abs(b['x0'] - x) - 200))
    assert abs(best['y0'] - y) <= 30 and best['x0'] - x <= 260 and best['x0'] >= x - 30, f'no figure near {x},{y}'
    return best


def greens(a, b):
    """green components inside the figure: (size, cx, cy) largest first."""
    sub = np.zeros((b['y1'] - b['y0'] + 1, b['x1'] - b['x0'] + 1), bool)
    px = a[b['ys'], b['xs']]
    g = (px[:, 1] > 150) & (px[:, 0] < 170) & (px[:, 2] < 130) & (px[:, 1] > px[:, 0] + 30)
    sub[b['ys'][g] - b['y0'], b['xs'][g] - b['x0']] = True
    lbl, n = ndimage.label(sub)
    out = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        out.append((len(ys), xs.mean() + b['x0'], ys.mean() + b['y0']))
    return sorted(out, reverse=True)


def mask_of(b):
    m = np.zeros((b['y1'] - b['y0'] + 1, b['x1'] - b['x0'] + 1), bool)
    m[b['ys'] - b['y0'], b['xs'] - b['x0']] = True
    return m


def cut(a, b):
    img = np.zeros((b['y1'] - b['y0'] + 1, b['x1'] - b['x0'] + 1, 4), np.uint8)
    img[b['ys'] - b['y0'], b['xs'] - b['x0'], :3] = a[b['ys'], b['xs']]; img[b['ys'] - b['y0'], b['xs'] - b['x0'], 3] = 255
    return img


A = {   # name: (cells, loop, speed, note)
    'idle':       (['g2', 'g3'], True, 10, 'HOVER = the side-glide wing beat Col 1 R2 ↔ R3 (the flap loop), slow'),
    'walk':       (['g2', 'g3'], True, 6, 'the flap loop CYCLED FASTER (no walk art — he skims, 6 px above the floor)'),
    'walk_back':  (['g3', 'g2'], True, 7, 'the flap loop reversed'),
    'run':        (['g2', 'g3'], True, 3, 'the flap loop, fastest'),
    'dash':       (['g3'], False, 4, 'Col 1 R3 glide (wings back)'),
    'turn':       (['g1'], False, 4, 'Col 1 R1 three-quarter front (mid-turn)'),
    'jump':       (['up'], False, 6, 'JUMP RISE = Col 2 R4 upright'),
    'doubleJump': (['upw'], False, 6, 'Col 2 R6 upright, wings up'),
    'fall':       (['bank'], False, 6, 'JUMP FALL = Col 2 R3 banking dive, wings swept down'),
    'crouch':     (['g3'], False, 6, 'Col 1 R3 glide + render-only low offset (no crouch art)'),
    'guard':      (['up'], False, 6, 'BLOCK = Col 2 R4 upright, wings closed in front'),
    'blockHit':   (['up'], False, 6, 'Col 2 R4 upright (no block-hit art)'),
    'transform':  (['sil', 'g1'], False, 6, 'white silhouette flash → Col 1 R1'),
    'taunt':      (['beak'], False, 10, 'Col 3 R4 beak open (screech)'),
    'win':        (['upw', 'up'], True, 16, 'Col 2 R6 ↔ R4 upright (no win art)'),
    'lose':       (['dive'], False, 6, 'Col 2 R5 dive (no lose art)'),
    'hurt':       (['bank'], False, 6, 'Col 2 R3 banking dive (no hit art)'),
    'hurt_air':   (['bank'], False, 6, 'Col 2 R3 banking dive (no air-hit art)'),
    'knockdown':  (['dive'], False, 6, 'Col 2 R5 dive (no knockdown art)'),
    'getup':      (['bank', 'up'], False, 6, 'Col 2 R3 → R4 righting himself (no get-up art)'),
    'dizzy':      (['bank', 'dive'], True, 10, 'Col 2 R3 ↔ R5 wobble (no dizzy art)'),
    'light':      (['g2'], False, 3, 'JAB = Col 1 R2 glide + render lunge + procedural wing flick'),
    'heavy':      (['g3', 'g2'], False, 6, 'HEAVY = Col 1 R3 → R2 + render lunge + procedural wing slash (170 px)'),
    'down':       (['g3'], False, 4, 'LOW = Col 1 R3 low glide + render-only low offset + procedural low sweep'),
    'up':         (['upw'], False, 6, 'LAUNCHER = Col 2 R6 upright, wings up + procedural rising wing sweep'),
    'air':        (['dive'], False, 4, 'AIR = Col 2 R5 diving + procedural slash'),
    'fly':        (['g2', 'g3'], True, 5, 'FLIGHT = the flap loop'),
    'flyHover':   (['g2', 'g3'], True, 8, 'flight hover = the flap loop, slower'),
    'flyCruise':  (['g3', 'g2'], True, 3, 'flight cruise = the flap loop, fast'),
    'jrEye':      (['beak'], False, 6, 'EYE LASER cast = Col 3 R4 beak open (+ procedural eye beam from the per-frame eye anchor)'),
    'jrTail':     (['g2'], False, 6, 'TAIL VOLLEY = Col 1 R2 glide (tail out behind) + procedural tail bolts'),
    'jrDash':     (['s1', 's2', 's3'], True, 2, 'WING DASH / MACH TIME travel / COSMIC DRAG warp = the 3 warp-bubble cores (+ procedural trail)'),
    'jrDive':     (['dive'], False, 6, 'SONIC DIVE active / slam = Col 2 R5 dive (the Col 3 R4 drawing with the beak closed)'),
    'jrRoll':     (['bank'], False, 6, 'BARREL ROLL = Col 2 R3 banking (render-only rotation)'),
    'jrMach':     (['g1'], False, 6, 'MACH TIME activation = Col 1 R1 three-quarter front, wings flared'),
    'jrFlash':    (['sil'], False, 6, 'white silhouette = hit / Omnitrix transform / timeout-revert flash'),
}


def main():
    a = load(); H, W = a.shape[:2]
    key, trail, halo, fg, d = masks(a)
    bodies, text, merged = gather(a, fg)
    F = {k: find(bodies, x, y) for k, (_, x, y) in CELLS.items()}
    D = {k: find(bodies, x, y) for k, (x, y) in DUPE_XY.items()}
    assert len(bodies) == len(F) + len(D), f'{len(bodies)} figures, expected {len(F) + len(D)}'
    # duplicates are pixel-exact copies
    for lab, k in DUPES.items():
        b, o = D[lab], F[k]
        assert mask_of(b).shape == mask_of(o).shape and (mask_of(b) == mask_of(o)).all(), lab
        assert (a[b['y0']:b['y1'] + 1, b['x0']:b['x1'] + 1][mask_of(b)] == a[o['y0']:o['y1'] + 1, o['x0']:o['x1'] + 1][mask_of(o)]).all(), lab
    # Col 3 R4 / R5 have Col 2 R5's exact outline on the RAW sheet (every non-key pixel; edge blends then differ by colour)
    raw = lambda x0, y0: ~(a[y0:y0 + 214, x0:x0 + 288] == BG).all(2)
    assert (raw(359, 1372) == raw(799, 1162)).all() and (raw(359, 1372) == raw(806, 1562)).all(), 'Col 3 R4 / R5 outline = Col 2 R5'
    # palette: body frames never blue-dominant; streak cores: no blue fringe next to anything removed
    for k, b in F.items():
        px = a[b['ys'], b['xs']]; dd = px[:, 2] - np.maximum(px[:, 0], px[:, 1])
        if k in STREAK:
            near = ndimage.distance_transform_cdt(~(key | trail | halo), metric='chessboard')[b['ys'], b['xs']] <= 2
            KEPT.append([k, int((dd >= HALO_D).sum()), int(((dd >= HALO_D) & near).sum())])
            assert ((dd >= HALO_D) & near).sum() == 0, f'{k}: blue fringe'
        else:
            sp = dd >= HALO_D                                                          # interior lossy specks (≥ 3 px inside): KEPT, listed
            assert sp.sum() <= 12 and np.percentile(dd, 99) <= 0, f'{k}: blue-adjacent palette ({int(sp.sum())})'
            SPECKS.extend([[k, int(x), int(y), *map(int, a[y, x])] for y, x in zip(b['ys'][sp], b['xs'][sp])])
    # anchors
    anc, eyes = {}, {}
    for k, b in F.items():
        if k in STREAK:
            px = a[b['ys'], b['xs']]; g = (px[:, 1] > 150) & (px[:, 1] > px[:, 0] + 30)
            anc[k] = (float(b['xs'][g].mean()), float(b['ys'][g].mean()))
            continue
        gr = greens(a, b) if k != 'sil' else greens(a, F['dive'])
        ref = F['dive'] if k == 'sil' else b
        om = gr[0]; ey = [g for g in gr[1:] if g[0] >= 6 and g[2] < om[2] - 25][:2]
        if k == 'beak': ey = [g for g in greens(a, F['dive'])[1:] if g[0] >= 6][:2]; ey = [(n, x - F['dive']['x0'] + b['x0'], y - F['dive']['y0'] + b['y0']) for n, x, y in ey]
        if k == 'sil': ey = [(n, x - F['dive']['x0'] + b['x0'], y - F['dive']['y0'] + b['y0']) for n, x, y in ey]; om = (om[0], om[1] - F['dive']['x0'] + b['x0'], om[2] - F['dive']['y0'] + b['y0'])
        assert om[0] >= 40 and len(ey) == 2, f'{k}: omnitrix / eyes not found {gr[:4]}'
        anc[k] = (om[1], om[2]); eyes[k] = (sum(e[1] for e in ey) / 2, sum(e[2] for e in ey) / 2)
    body_keys = [k for k in F if k not in STREAK]
    drop = float(np.median([F[k]['y1'] + 1 - anc[k][1] for k in body_keys if k != 'sil']))
    total_scale = 2.0 * 1.18 * ACTION_SCALE
    hover = drop + HOVER_PX / total_scale        # chest → "feet" row: the median chest-to-lowest-pixel drop + the 6 px hover
    lo_x = hi_x = up_y = dn_y = 0
    for k, b in F.items():
        ax, ay = anc[k]; fy = ay + hover
        lo_x = min(lo_x, b['x0'] - ax); hi_x = max(hi_x, b['x1'] + 1 - ax); up_y = max(up_y, fy - b['y0']); dn_y = max(dn_y, b['y1'] + 1 - fy)
    CX = int(np.ceil(max(-lo_x, hi_x))) + 2; CW = CX * 2; FEET = int(np.ceil(up_y)) + 3; CH = FEET + max(3, int(np.ceil(dn_y)) + 2)
    anim, ledger, used, eyeTab = {}, [], set(), {}
    for name, (cells, loop, speed, note) in A.items():
        strip = np.zeros((CH, CW * len(cells), 4), np.uint8)
        eyeTab[name] = []
        for i, k in enumerate(cells):
            b = F[k]; used.add(k); img = cut(a, b); h, w = img.shape[:2]
            x_at = i * CW + int(round(CX - anc[k][0])) + b['x0']; y_at = int(round(FEET - (anc[k][1] + hover))) + b['y0']   # sheet → cell
            assert x_at >= i * CW and x_at + w <= (i + 1) * CW and y_at >= 0 and y_at + h <= CH, f'{name}: frame cropped'
            m = img[..., 3] > 0; strip[y_at:y_at + h, x_at:x_at + w][m] = img[m]
            assert (strip[:, i * CW:(i + 1) * CW, 3] > 0).sum() == b['n'], f'{name} f{i}: pixel count changed'
            if k in eyes:   # eye anchor in cell px relative to (centre column, feet row); +x = forward (the art faces right)
                ex, ey = eyes[k]; eyeTab[name].append([round(ex - b['x0'] + x_at - i * CW - CX, 1), round(ey - b['y0'] + y_at - FEET, 1)])
            else: eyeTab[name].append(None)
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, f'{PREFIX}{name}_uniform.png'))
        anim[name] = dict(sheet=f'./{PREFIX}{name}_uniform.png', frames=len(cells), width=CW, height=CH, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET, actionScale=ACTION_SCALE)
        ledger.append((name, cells, note))
    assert used == set(F), f'unused drawings: {sorted(set(F) - used)}'
    geom = dict(cellW=CW, cellH=CH, centreX=CX, feetY=FEET, actionScale=ACTION_SCALE, hoverPx=HOVER_PX, chestToFeet=round(hover, 2),
                screenScale=round(total_scale, 4))
    with open(os.path.join(ROOT, 'jetrayAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_jetray.py from the Fun-tech.tk Jetray sheet (Sheet from fun-tech.tk).\n'
                 '// See docs/ben10/aliens/jetray/SPRITE_LEDGER.md. JETRAY_ANIM: uniform strips (cell %dx%d, chest anchor x=%d, hover\n'
                 '// "feet" row originY=%d); frames are 1:1 copies of the keyed sheet (no filter); on-screen size = actionScale.\n'
                 '// JETRAY_EYES[anim][frame] = [dx, dy] of the eyes from (centre column, feet row) in sheet px, art facing right\n'
                 '// (multiply by the screen scale; mirror dx for facing −1); null = no eyes visible (warp-bubble cores).\n' % (CW, CH, CX, FEET))
        fh.write('export const JETRAY_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const JETRAY_EYES = ' + json.dumps(eyeTab) + '\n')
        fh.write('export const JETRAY_GEOM = ' + json.dumps(geom) + '\n')
    os.makedirs(DOC, exist_ok=True)
    src = dict(sheet='assets/sprites/ben10/aliens/jetray.png', size=[W, H], key=list(BG), haloThreshold=HALO_D,
               haloPixels=int(halo.sum()), trailPixelsDropped=int(trail.sum()), streakCoreBluish=KEPT, keptLossySpecks=SPECKS,
               textGlyphs=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in text],
               mergedFragments=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in merged], duplicates=DUPES,
               frames={k: dict(cell=CELLS[k][0], bbox=[F[k]['x0'], F[k]['y0'], F[k]['x1'], F[k]['y1']], px=F[k]['n'],
                               anchor=[round(anc[k][0], 2), round(anc[k][1], 2)], eyes=[round(v, 2) for v in eyes[k]] if k in eyes else None) for k in F})
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(src, fh, indent=1)
    contact(anim, geom)
    write_ledger(anim, ledger, geom, int(halo.sum()), int(trail.sum()), text, merged)
    print(f'OK: {len(anim)} anims, {len(F)} distinct drawings (all used) + {len(D)} duplicates, halo {int(halo.sum())} px, trail '
          f'{int(trail.sum())} px dropped, text {len(text)} glyphs, merged {len(merged)}, cell {CW}x{CH} feet {FEET}, chest→feet {hover:.1f}')
    print('streak cores (kept blue-dominant px, of which next to a removed px):', KEPT)


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
        rows.append((name, bd.resize((bd.width // 2, bd.height // 2), Image.NEAREST)))
    LW = 80; Wd = max(r[1].width for r in rows) + LW + pad * 2
    per = 2; cols = [rows[i::per] for i in range(per)]
    colW = Wd; Hd = max(sum(r[1].height + pad for r in c) for c in cols) + pad
    out = Image.new('RGBA', (colW * per, Hd), (24, 26, 30, 255)); dr = ImageDraw.Draw(out)
    for ci, c in enumerate(cols):
        y = pad
        for name, im in c:
            dr.text((ci * colW + pad, y + 2), name, fill=(230, 230, 230, 255))
            out.alpha_composite(im, (ci * colW + LW, y)); y += im.height + pad
    out.save(os.path.join(DOC, 'contact_sheet.png'))


def write_ledger(anim, ledger, geom, halo_px, trail_px, text, merged):
    L = ['# Jetray (Aerophibian) — sprite ledger\n',
         '**Sheet from fun-tech.tk** (credit text on the sheet: "Fun-tech.tk", "Ben 10 Game creator"). Source: the owner\'s download '
         '`~/Downloads/new/ben 10/820786773_orig.png` → `assets/sprites/ben10/aliens/jetray.png` (1200×2000). Identified by contact '
         'sheet among the blue-background downloads: red-and-yellow manta with a yellow horned head, green warp-bubble streak frames, '
         'white diving-manta silhouette.\n',
         '## Key, palette, halo, text\n',
         '- Background solid blue **(0,0,255)** keyed exactly (zero tolerance; all four corners asserted).\n'
         '- **Palette collision check:** his dark red / maroon, yellow / gold, green Omnitrix + eyes and black are never blue-dominant '
         f'(99th percentile of B − max(R,G) ≤ 0, asserted). The art is anti-aliased against the blue: **{halo_px}** blue-blend edge '
         f'pixels (B − max(R,G) ≥ {HALO_D}, within 2 px of the key / trail) are removed as halo, never art. **{len(SPECKS)} lossy bluish '
         'specks** sit ≥ 3 px inside the art (narrow gaps between wing and body); they are KEPT untouched and listed in `source_grid.json`.\n'
         f'- Text: {len(text)} glyph components ("Fun-tech.tk" black, "Ben 10 / Game creator" green-cyan), top right, removed (not art). '
         f'{len(merged)} detached fragments merged into the figure of their grid cell.\n',
         '## Warp-bubble streak frames — halo decision\n',
         '- The fading trail is a **non-linear lavender → blue gradient** (e.g. (12,12,252) → (60,60,227) → (103,103,186): B falls faster '
         'than R = G rises), not one colour alpha-mixed over the key, so **un-blending against the key cannot recover a clean alpha**. '
         f'Decision: **cut only the opaque core** (figure + green bubble + its pale rim); the {trail_px} grey-lavender trail pixels (R ≈ G, '
         'B ≥ R + 20) and the blue-blend pixels touching them are dropped, and the fading trail is **rebuilt in jetray.js as a procedural '
         'pixel streak** (render-only). No blue fringe survives (asserted: no kept pixel within 2 px of a removed one is blue-dominant).\n',
         '## Cut, duplicates, true sequences\n',
         '- The 12 left-column cells hold only **7 distinct drawings** (pixel-exact duplicates, asserted): Col 1 R2 = R4 = R6 = Col 2 R2 '
         '(side glide, wings forward), Col 1 R3 = R5 = Col 2 R1 (side glide, wings back). Col 1 R1 is a three-quarter front glide; Col 2 R3 '
         'and R5 are front-on banking dives (wings swept down); Col 2 R4 and R6 are upright (wings closed / wings up). **Col 3 R4** has the '
         'same outline as Col 2 R5 with the **beak open**.\n'
         '- **True sequence:** previewing the left columns as animation, the sheet order R1 → R2 → R3 → R2 → R3 … is a two-pose WING BEAT '
         '(Col 1 R2 ↔ R3) after a three-quarter lead-in (R1). So **hover / walk / run / fly = the flap loop**, walk and run being the same '
         'loop cycled faster (no walk art).\n'
         f'- Uniform cell **{geom["cellW"]}×{geom["cellH"]}**. **Anchor = the chest Omnitrix** (centroid of the largest green component = '
         'torso centre) — wing tips and tail are never the anchor; the streak frames anchor at the green bubble\'s centroid. A CONSISTENT '
         f'chest → "feet" drop of {geom["chestToFeet"]} sheet px (the median chest-to-lowest-pixel drop + the **6 px grounded hover**) sits '
         f'every frame on the feet row originY={geom["feetY"]}. Pixels copied 1:1, pixel counts preserved, nothing cropped (wings, horns, '
         'tail, bubble included — asserted).\n'
         '- **Eye anchor per frame** (mean of the two green eye components; Col 3 R4 uses its closed-beak twin Col 2 R5) exported as '
         '`JETRAY_EYES` for the Eye Laser — mirrored for facing −1.\n'
         f'- **Scale:** high-res cartoon art (~300 px wide). Engine standard path, smoothing off: spriteScale 2.0 × global 1.18 × '
         f'actionScale **{ACTION_SCALE}** = ×{geom["screenScale"]} → the upright frame ≈ 129 px tall (≈ human Ben), the side glide ≈ 146 px '
         'wingspan. **Conflict reported:** the brief\'s "wingspan ≈ 1.4× Ben\'s width" and "body ≈ Ben\'s height" cannot both hold for this '
         'art (a 1.4× wingspan would make him half Ben\'s height); body height was kept, the wingspan is ≈ 2.4× Ben\'s width. Not noisy at '
         'this scale; no resample filter.\n'
         '- **Hurtbox = torso + inner wing** (fighters.js `sizeW 70 × sizeH 96`), NOT the full wing tips: the tips (~±75 px) are cosmetic.\n',
         '## White silhouette (Col 3 R5)\n',
         '- **Verified: the exact outline of Col 2 R5** (the diving manta, pixel-exact mask match — the brief\'s "wide diving manta shape"). '
         'Decision: it is the **hit-flash / Omnitrix transform flash / timeout-revert flash** (`transform` f1, `jrFlash`); not a move body.\n',
         '## Every distinct drawing → animation → move\n', '| Drawing | Animations (moves) |', '|---|---|']
    names = {'g1': 'Col 1 R1', 'g2': 'Col 1 R2 (= R4, R6, Col 2 R2)', 'g3': 'Col 1 R3 (= R5, Col 2 R1)', 'bank': 'Col 2 R3', 'up': 'Col 2 R4',
             'dive': 'Col 2 R5', 'upw': 'Col 2 R6', 's1': 'Col 3 R1', 's2': 'Col 3 R2', 's3': 'Col 3 R3', 'beak': 'Col 3 R4', 'sil': 'Col 3 R5'}
    for k, lab in names.items():
        L.append(f'| {lab} | {", ".join(n for n, cells, _ in ledger if k in cells)} |')
    L.append('\n## Animation → move (exported strips `' + PREFIX + '<anim>_uniform.png`)\n')
    L.append('| Animation | Frames | Speed | Source / move |'); L.append('|---|---|---|---|')
    for k, cells, note in ledger: L.append(f'| `{k}` | {len(cells)} | {anim[k]["speed"]} | {note} |')
    L.append('\n## Missing poses (closest real frame reused, no art invented)\n')
    L.append('- **hit light / heavy, air hit**: Col 2 R3 banking dive. **knockdown, lose**: Col 2 R5 dive. **get-up**: Col 2 R3 → R4. '
             '**dizzy**: Col 2 R3 ↔ R5. **block / block-hit**: Col 2 R4 upright. **win**: Col 2 R6 ↔ R4 upright. **crouch / LOW**: Col 1 R3 '
             'glide + a render-only low offset. **jab / heavy**: the glide frames + render-only forward lunge + procedural pixel wing slash. '
             '**launcher**: Col 2 R6 upright wings-up + procedural rising sweep.\n')
    L.append('## Extracted vs procedural effects\n')
    L.append('- **Extracted (real sheet pixels):** the warp-bubble cores (figure + green bubble + rim) of Col 3 R1–R3, the green Omnitrix, '
             'the white silhouette flash.\n'
             '- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the warp-bubble fading TRAIL (rebuilt), eye-laser '
             'beams and their glow, tail-laser bolts, wing-slash arcs, sonic-boom rings, Mach Time afterimages and echo ghosts, the Grounded '
             'leg crackle, Neuro pips, the barrel-roll rotation, the ultimate\'s hyperspace starfield / planets / ringed gas giant / asteroid '
             'belt / sun flare and screen shake. They READ simulation state; they never write it.\n')
    L.append('\nContact sheet: `docs/ben10/aliens/jetray/contact_sheet.png` (every exported strip at ½ size; green = feet row, blue = anchor '
             'column). Geometry, removed glyphs, merged fragments, duplicates, anchors, eyes: `source_grid.json`.\n\n'
             'Credit: **Sheet from fun-tech.tk**.\n')
    open(os.path.join(DOC, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
