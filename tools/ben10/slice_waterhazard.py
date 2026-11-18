#!/usr/bin/env python3
# WATER HAZARD (Orishan) — READY-alien slicer for the Fun-tech.tk sheet (assets/sprites/ben10/aliens/waterhazard.png, 1200×2000,
# a byte copy of the owner's download "351942199_orig.png" (and its identical "351942199_orig (1).png"); found by contact sheet
# among the blue-background downloads — dark red / maroon insectoid with green eyes and claws, hunched, a glowing green / cyan
# water orb charging in the third column, "Fun-tech.tk / Ben 10 Game creator" text, a white silhouette bottom right).
#   python3 tools/ben10/slice_waterhazard.py
# HIGH-RES CARTOON ART (not pixel art, frames ~250 px tall): pixels are copied 1:1 — no blur, no filter, no resample. Scaling
# happens at render time through the engine's standard path (spriteScale × actionScale, image smoothing off).
# KEY: background = solid blue (0,0,255), keyed EXACTLY (zero tolerance; all four corners asserted). The art is anti-aliased
# against the blue: a blue-blend edge pixel (B − max(R,G) ≥ 40 within 2 px of the key) is removed as halo (Jetray's rule).
# Palette check: maroon / dark red, black, grey, lime-green lights, green eyes, cyan / green orb — none blue-dominant inside the
# art (asserted on the bodies, the cyan orb rim included: cyan = (0,204,204) has B = G).
# TEXT: "Fun-tech.tk" (black) and "Ben 10 / Game creator" (green-cyan) glyphs in the top-right box: removed, not art.
# ORB FX: the orb itself touches the hand in every charge frame → part of that frame. The FREE-FLOATING droplets / spark lines /
# ring segments beside Col 3 R4–R6 are kept in THAT frame's cell at their exact sheet offset (never cropped, never moved, never
# a separate entity) and listed in the ledger as extracted FX.
# DUPLICATES: Col 3 R3 = Col 3 R6 (body) = Col 4 R1, pixel-exact (asserted); the white silhouette Col 4 R3 = Col 4 R2's exact
# outline (asserted).
# ANCHOR: he is permanently hunched — the body centre is the TORSO (median x of the figure in its hip band, 45–60 % of its height),
# never the claws; the feet baseline is the lowest pixel row. Deterministic: re-running is byte-identical.
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/sprites/ben10/aliens/waterhazard.png')
DOC = os.path.join(ROOT, 'docs/ben10/aliens/waterhazard')
BG = (0, 0, 255)
HALO_D = 40
GREY_D = 22   # his slate greys are faintly blue ((88,86,109), (52,51,72): B − max(R,G) = 21) — reported, below the halo threshold
TEXT_BOX = (0, 840, 300, 1200)   # y0, x0, y1, x1 of the credit text
ACTION_SCALE = 0.21   # ~250 px hunched frame → ≈ 124 px on screen (Ben's spriteScale 2.0 × global 1.18 × 0.21) ≈ human Ben's height.
PREFIX = 'ben10_waterhazard_ready_'
# grid cells: name → (label, x0, y0) of the drawing's bounding box on the RAW sheet (before halo removal)
CELLS = {
    'stand': ('Col 1 R1', 32, 28), 'w1': ('Col 1 R2', 18, 329), 'w2': ('Col 1 R3', 7, 645), 'w3': ('Col 1 R4', 7, 893),
    'w4': ('Col 1 R5', 0, 1204), 'w5': ('Col 1 R6', 13, 1481), 'w6': ('Col 1 R7', 9, 1762),
    'st1': ('Col 2 R1', 278, 52), 'st2': ('Col 2 R2', 287, 386), 'front': ('Col 2 R3', 298, 690), 'tall': ('Col 2 R4', 272, 1031),
    'leap': ('Col 2 R5', 279, 1359), 'reach': ('Col 2 R6', 267, 1660),
    'crouch': ('Col 3 R1', 550, 92), 'hunch': ('Col 3 R2', 547, 376), 'aim': ('Col 3 R3', 540, 660), 'orb': ('Col 3 R4', 515, 1059),
    'ring': ('Col 3 R5', 521, 1422), 'drip': ('Col 3 R6', 538, 1707),
    'rise': ('Col 4 R2', 905, 1147), 'sil': ('Col 4 R3', 915, 1554),
}
DUPE_XY = {'Col 4 R1': (909, 656)}          # = Col 3 R3 (aim), pixel-exact
FX_CELLS = ('orb', 'ring', 'drip')
ORB_CELLS = ('aim', 'orb', 'ring', 'drip')            # frames that own free-floating droplets / ring segments
SPECKS = []


def load():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    assert tuple(a[0, 0]) == tuple(a[0, -1]) == tuple(a[-1, 0]) == tuple(a[-1, -1]) == BG, 'corners must be the key colour'
    return a


def masks(a):
    key = (a == BG).all(2)
    d = a[..., 2] - np.maximum(a[..., 0], a[..., 1])
    dist = ndimage.distance_transform_cdt(~key, metric='chessboard')
    halo = ~key & (d >= HALO_D) & (dist <= 2)
    for _ in range(8):   # a blend pixel touching a removed halo pixel is halo too
        grow = ~key & ~halo & (d >= HALO_D) & ndimage.binary_dilation(halo | key, structure=np.ones((3, 3)))
        if not grow.any(): break
        halo |= grow
    return key, halo, ~key & ~halo, d


def comps(fg):
    lbl, n = ndimage.label(fg, structure=np.ones((3, 3)))
    out = []
    for i, s in enumerate(ndimage.find_objects(lbl)):
        m = lbl[s] == i + 1
        ys, xs = np.where(m); ys = ys + s[0].start; xs = xs + s[1].start
        out.append(dict(y0=int(ys.min()), x0=int(xs.min()), y1=int(ys.max()), x1=int(xs.max()), ys=ys, xs=xs, n=len(ys), fx=0))
    return out


def gather(fg, A_):
    cs = comps(fg)
    bodies = [c for c in cs if c['n'] >= 3000]
    for b in bodies: b.update(bx1=b['x1'], by0=b['y0'], fxl=[], frl=[])
    text, fx = [], []
    for c in cs:
        if c['n'] >= 3000: continue
        ty0, tx0, ty1, tx1 = TEXT_BOX
        if c['y0'] >= ty0 and c['y1'] < ty1 and c['x0'] >= tx0 and c['x1'] < tx1:
            text.append(c); continue
        # a droplet / ring segment / spark: belongs to the body on its row, within 120 px to the side
        host = [b for b in bodies if c['y0'] >= b['y0'] - 80 and c['y1'] <= b['y1'] and c['x0'] >= b['x0'] - 30 and c['x1'] <= b['x1'] + 120]
        assert host, f'unattached fragment @ {c["x0"]},{c["y0"]} ({c["n"]} px)'
        b = min(host, key=lambda b: abs(b['x1'] - c['x0']) + abs(b['y0'] - c['y0']) * 0.1)
        px = A_[c['ys'], c['xs']]                                              # a free FX piece = water-coloured (cyan / green: G ≥ 150, R ≤ 130)
        free = bool(((px[:, 1] >= 150) & (px[:, 0] <= 130)).mean() > 0.5)
        c['free'] = free
        (b['fxl'] if free else b['frl']).append(c)
        fx.append(c)
    for b in bodies:   # body arrays first (figure + its detached art fragments), then the free FX pieces at the tail
        parts = [b] + b['frl']
        b['ys'] = np.concatenate([q['ys'] for q in parts] + [q['ys'] for q in b['fxl']])
        b['xs'] = np.concatenate([q['xs'] for q in parts] + [q['xs'] for q in b['fxl']])
        b['fx'] = sum(q['n'] for q in b['fxl']); b['n'] = len(b['ys'])
        b['y0'], b['y1'], b['x0'], b['x1'] = int(b['ys'].min()), int(b['ys'].max()), int(b['xs'].min()), int(b['xs'].max())
    return bodies, text, fx


def find(bodies, x, y):
    best = min(bodies, key=lambda b: abs(b['by0'] - y) + abs(b['x0'] - x))
    assert abs(best['by0'] - y) <= 4, f'no figure at {x},{y}'
    return best


def body_only(b):   # the figure's own pixels (the free FX excluded), for anchors / duplicate checks
    return b['ys'][:b['n'] - b['fx']], b['xs'][:b['n'] - b['fx']]


def mask_of(ys, xs):
    m = np.zeros((ys.max() - ys.min() + 1, xs.max() - xs.min() + 1), bool); m[ys - ys.min(), xs - xs.min()] = True
    return m


def cut(a, b):
    img = np.zeros((b['y1'] - b['y0'] + 1, b['x1'] - b['x0'] + 1, 4), np.uint8)
    img[b['ys'] - b['y0'], b['xs'] - b['x0'], :3] = a[b['ys'], b['xs']]; img[b['ys'] - b['y0'], b['xs'] - b['x0'], 3] = 255
    return img


A = {   # name: (cells, loop, speed, note)
    'idle':        (['stand', 'tall'], True, 16, 'Col 1 R1 ↔ Col 2 R4 (standing hunched, claws down) — a slow two-pose loop'),
    'idleAlt':     (['tall'], False, 8, 'Col 2 R4 (REUSED)'),
    'walk':        (['w1', 'w2', 'w3', 'w4', 'w5', 'w6'], True, 7, 'the Col 1 R2–R7 stride cycle'),
    'walk_back':   (['w6', 'w5', 'w4', 'w3', 'w2', 'w1'], True, 8, 'the stride cycle reversed'),
    'run':         (['w1', 'w2', 'w3', 'w4', 'w5', 'w6'], True, 4, 'the SAME stride cycle CYCLED FASTER (no run art)'),
    'dash':        (['st1'], False, 4, 'Col 2 R1 long stride'),
    'jump':        (['rise', 'leap'], False, 6, 'JUMP RISE = Col 4 R2 (crouch, arm up) → Col 2 R5 leap'),
    'doubleJump':  (['leap'], False, 6, 'Col 2 R5 leap (REUSED)'),
    'fall':        (['leap'], False, 6, 'Col 2 R5 leap (REUSED; no fall art)'),
    'crouch':      (['crouch'], False, 6, 'Col 3 R1 crouch'),
    'guard':       (['crouch'], False, 6, 'BLOCK = Col 3 R1 crouch (REUSED; no block art)'),
    'crouchGuard': (['crouch'], False, 6, 'Col 3 R1 crouch (REUSED)'),
    'blockHit':    (['crouch'], False, 6, 'Col 3 R1 crouch (REUSED; no block-hit art)'),
    'hurt':        (['reach'], False, 6, 'HIT REACT = Col 2 R6 reach (REUSED, as briefed; no hit art light or heavy)'),
    'hurt_air':    (['leap'], False, 6, 'Col 2 R5 leap (REUSED; no air-hit art)'),
    'knockdown':   (['crouch'], False, 6, 'Col 3 R1 crouch (REUSED; no knockdown / lying art)'),
    'getup':       (['crouch', 'stand'], False, 6, 'Col 3 R1 → Col 1 R1 (REUSED; no get-up art)'),
    'dizzy':       (['hunch', 'front'], True, 12, 'Col 3 R2 ↔ Col 2 R3 sway (REUSED; no dizzy art)'),
    'transform':   (['sil', 'rise', 'stand'], False, 6, 'TRANSFORM-IN = the white silhouette flash → Col 4 R2 → Col 1 R1'),
    'taunt':       (['front'], False, 10, 'Col 2 R3 front-on, hood up'),
    'win':         (['stand', 'front'], True, 16, 'Col 1 R1 ↔ Col 2 R3 (REUSED idle, as briefed; no win art)'),
    'lose':        (['crouch'], False, 6, 'Col 3 R1 crouch (REUSED, as briefed; no lose art)'),
    'light':       (['st2', 'reach'], False, 3, 'JAB = Col 2 R2 → R6 reach (+ render lunge)'),
    'heavy':       (['leap', 'reach'], False, 6, 'HEAVY = Col 2 R5 lunge → R6 reach, extended (170 px)'),
    'down':        (['crouch'], False, 4, 'LOW = Col 3 R1 crouch claw'),
    'up':          (['rise', 'aim'], False, 6, 'LAUNCHER = Col 4 R2 → Col 3 R3 rising arm'),
    'air':         (['leap'], False, 4, 'AIR = Col 2 R5 leap body'),
    'grab':        (['reach'], False, 6, 'Col 2 R6 reach (REUSED)'),
    'whCharge':    (['aim', 'orb'], False, 8, 'PRESSURE BLAST charge = Col 3 R3 (orb forming) → R4 (FULL CHARGE peak, droplets)'),
    'whFire':      (['ring', 'drip'], False, 6, 'PRESSURE BLAST release = Col 3 R5 (burst ring) → R6 (smaller orb, droplets)'),
    'whBurst':     (['orb', 'ring'], False, 5, 'HYDRO BURST = Col 3 R4 → R5 (+ procedural radial splash ring)'),
    'whLash':      (['leap', 'reach'], False, 4, 'CLAW LASH = Col 2 R5 lunge → R6 reach (the dash slash)'),
    'whSweep':     (['crouch'], False, 6, 'UNDERTOW SWEEP = Col 3 R1 crouch (+ procedural water ring at his feet)'),
    'whDive':      (['aim'], False, 6, 'GEYSER DIVE = Col 3 R3 charge frame (+ procedural downward orb)'),
    'whMelt':      (['rise'], False, 6, 'PUDDLE enter = Col 4 R2 crouch (the body sinks into the procedural puddle)'),
    'whReform':    (['rise', 'stand'], False, 6, 'PUDDLE exit = Col 4 R2 → Col 1 R1'),
    'whGeyser':    (['rise', 'aim'], False, 5, 'GEYSER UPPERCUT = Col 4 R2 → Col 3 R3 rising arm (+ procedural geyser)'),
    'whUltOrb':    (['orb', 'ring', 'drip'], True, 5, 'ultimate Pressure Barrage = the Col 3 R4–R6 orb frames'),
    'whFlash':     (['sil'], False, 6, 'white silhouette = hit / Omnitrix transform / timeout-revert flash'),
}


def main():
    a = load(); H, W = a.shape[:2]
    key, halo, fg, d = masks(a)
    bodies, text, fx = gather(fg, a)
    F = {k: find(bodies, x, y) for k, (_, x, y) in CELLS.items()}
    D = {k: find(bodies, x, y) for k, (x, y) in DUPE_XY.items()}
    assert len({id(v) for v in list(F.values()) + list(D.values())}) == len(bodies) == len(F) + len(D), f'{len(bodies)} figures'
    for k in F: assert (F[k]['fx'] > 0) == (k in FX_CELLS), f'{k}: free FX only beside the orb frames ({F[k]["fx"]})'
    # duplicates: Col 4 R1 = Col 3 R3 = Col 3 R6's body, pixel-exact
    def same(p, q):
        py, px_ = body_only(p); qy, qx = body_only(q)
        mp, mq = mask_of(py, px_), mask_of(qy, qx)
        if mp.shape != mq.shape or not (mp == mq).all(): return False
        o = np.lexsort((px_, py)); r = np.lexsort((qx, qy))
        return bool((a[py[o], px_[o]] == a[qy[r], qx[r]]).all())
    assert same(D['Col 4 R1'], F['aim']) and same(F['drip'], F['aim']), 'Col 3 R3 = Col 3 R6 = Col 4 R1'
    sy, sx = body_only(F['sil']); ry, rx = body_only(F['rise'])
    # on the RAW sheet (every non-key pixel; the halo then differs: white blends are less blue-dominant than maroon ones)
    def raw(b):
        sub = ~(a[b['by0'] - 3:b['y1'] + 4, b['x0'] - 3:b['x1'] + 4] == BG).all(2); ys, xs = np.where(sub)
        return sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rs, rr = raw(F['sil']), raw(F['rise'])
    assert rs.shape == rr.shape and (rs == rr).all(), 'silhouette = Col 4 R2 outline'
    assert ((a[sy, sx] >= 200).all(1)).mean() > 0.97, 'silhouette is white'
    # palette: bodies never blue-dominant except a few lossy interior specks (kept, listed)
    for k, b in F.items():
        px = a[b['ys'], b['xs']]; dd = px[:, 2] - np.maximum(px[:, 0], px[:, 1])
        sp = dd >= HALO_D
        orbf = k in ORB_CELLS   # the orb's translucent cyan rim is blue-leaning (kept: it is the orb art, not a halo)
        assert sp.sum() <= (400 if orbf else 40) and np.percentile(dd, 99) <= (HALO_D - 1 if orbf else GREY_D), f'{k}: blue-adjacent palette ({int(sp.sum())}, p99 {np.percentile(dd, 99)})'
        SPECKS.extend([[k, int(x), int(y), *map(int, a[y, x])] for y, x in zip(b['ys'][sp], b['xs'][sp])])
    # anchors: torso centre x = median x of the body in its hip band (45–60 % of the body height); feet = lowest body row
    anc = {}
    for k, b in F.items():
        ys, xs = body_only(b); y0, y1 = ys.min(), ys.max(); hb = (ys >= y0 + 0.45 * (y1 - y0)) & (ys <= y0 + 0.60 * (y1 - y0))
        anc[k] = (float(np.median(xs[hb])), float(y1 + 1))
    lo_x = hi_x = up_y = dn_y = 0
    for k, b in F.items():
        ax, fy = anc[k]
        lo_x = min(lo_x, b['x0'] - ax); hi_x = max(hi_x, b['x1'] + 1 - ax); up_y = max(up_y, fy - b['y0']); dn_y = max(dn_y, b['y1'] + 1 - fy)
    CX = int(np.ceil(max(-lo_x, hi_x))) + 2; CW = CX * 2; FEET = int(np.ceil(up_y)) + 3; CH = FEET + max(3, int(np.ceil(dn_y)) + 2)
    anim, ledger, used = {}, [], set()
    for name, (cells, loop, speed, note) in A.items():
        strip = np.zeros((CH, CW * len(cells), 4), np.uint8)
        for i, k in enumerate(cells):
            b = F[k]; used.add(k); img = cut(a, b); h, w = img.shape[:2]
            x_at = i * CW + int(round(CX - anc[k][0])) + b['x0']; y_at = int(round(FEET - anc[k][1])) + b['y0']
            assert x_at >= i * CW and x_at + w <= (i + 1) * CW and y_at >= 0 and y_at + h <= CH, f'{name}: frame cropped'
            m = img[..., 3] > 0; strip[y_at:y_at + h, x_at:x_at + w][m] = img[m]
            assert (strip[:, i * CW:(i + 1) * CW, 3] > 0).sum() == b['n'], f'{name} f{i}: pixel count changed'
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, f'{PREFIX}{name}_uniform.png'))
        anim[name] = dict(sheet=f'./{PREFIX}{name}_uniform.png', frames=len(cells), width=CW, height=CH, speed=speed, anchorY=0,
                          loop=loop, lockLastFrame=not loop, originY=FEET, actionScale=ACTION_SCALE)
        ledger.append((name, cells, note))
    assert used == set(F), f'unused drawings: {sorted(set(F) - used)}'
    # the orb centre (for the Pressure Blast / Geyser Dive spawn point), from the full-charge frame: the largest green blob
    ob = F['orb']; px = a[ob['ys'], ob['xs']]; g = (px[:, 1] >= 200) & (px[:, 0] <= 80)
    orb = [round(float(ob['xs'][g].mean() - anc['orb'][0]), 1), round(float(ob['ys'][g].mean() - anc['orb'][1]), 1)]
    geom = dict(cellW=CW, cellH=CH, centreX=CX, feetY=FEET, actionScale=ACTION_SCALE, screenScale=round(2.0 * 1.18 * ACTION_SCALE, 4), orb=orb)
    with open(os.path.join(ROOT, 'waterhazardAssets.js'), 'w') as fh:
        fh.write('// Generated by tools/ben10/slice_waterhazard.py from the Fun-tech.tk Water Hazard sheet (Sheet from fun-tech.tk).\n'
                 '// See docs/ben10/aliens/waterhazard/SPRITE_LEDGER.md. WATERHAZARD_ANIM: uniform strips (cell %dx%d, torso centre x=%d,\n'
                 '// feet row originY=%d); frames are 1:1 copies of the keyed sheet (no filter); on-screen size = actionScale.\n'
                 '// WATERHAZARD_GEOM.orb = the full-charge orb centre from (centre column, feet row) in sheet px, art facing right.\n' % (CW, CH, CX, FEET))
        fh.write('export const WATERHAZARD_ANIM = ' + json.dumps(anim, indent=2) + '\n')
        fh.write('export const WATERHAZARD_GEOM = ' + json.dumps(geom) + '\n')
    os.makedirs(DOC, exist_ok=True)
    src = dict(sheet='assets/sprites/ben10/aliens/waterhazard.png', size=[W, H], key=list(BG), haloThreshold=HALO_D, haloPixels=int(halo.sum()),
               keptLossySpecks=SPECKS, textGlyphs=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in text],
               freeFx=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in fx if c['free']],
               mergedArtFragments=[[c['x0'], c['y0'], c['x1'], c['y1'], c['n']] for c in fx if not c['free']], duplicates={'Col 4 R1': 'Col 3 R3', 'Col 3 R6 (body)': 'Col 3 R3'},
               frames={k: dict(cell=CELLS[k][0], bbox=[F[k]['x0'], F[k]['y0'], F[k]['x1'], F[k]['y1']], px=F[k]['n'], freeFxPx=F[k]['fx'],
                               anchor=[round(anc[k][0], 2), round(anc[k][1], 2)]) for k in F})
    with open(os.path.join(DOC, 'source_grid.json'), 'w') as fh: json.dump(src, fh, indent=1)
    contact(anim, geom)
    previews(anim)
    write_ledger(anim, ledger, geom, int(halo.sum()), text, [c for c in fx if c['free']], [c for c in fx if not c['free']])
    print(f'OK: {len(anim)} anims, {len(F)} distinct drawings (all used) + {len(D)} duplicate, halo {int(halo.sum())} px, text {len(text)} '
          f'glyphs, free FX {sum(c["free"] for c in fx)} pieces, fragments {sum(not c["free"] for c in fx)}, specks {len(SPECKS)}, cell {CW}x{CH} feet {FEET} centre {CX}, orb {orb}')


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
        rows.append((name, bd.resize((bd.width // 2, bd.height // 2), Image.NEAREST)))
    LW = 80; per = 3; cols = [rows[i::per] for i in range(per)]
    colW = max(r[1].width for r in rows) + LW + pad * 2; Hd = max(sum(r[1].height + pad for r in c) for c in cols) + pad
    out = Image.new('RGBA', (colW * per, Hd), (24, 26, 30, 255)); dr = ImageDraw.Draw(out)
    for ci, c in enumerate(cols):
        y = pad
        for name, im in c:
            dr.text((ci * colW + pad, y + 2), name, fill=(230, 230, 230, 255))
            out.alpha_composite(im, (ci * colW + LW, y)); y += im.height + pad
    out.save(os.path.join(DOC, 'contact_sheet.png'))


def previews(anim):
    for name in ('idle', 'walk', 'whCharge', 'whFire', 'transform', 'whUltOrb'):
        d = anim[name]; im = Image.open(os.path.join(ROOT, d['sheet'][2:])).convert('RGBA')
        fr = []
        for k in range(d['frames']):
            c = im.crop((k * d['width'], 0, (k + 1) * d['width'], d['height']))
            bg = Image.new('RGBA', c.size, (40, 44, 52, 255)); bg.alpha_composite(c); fr.append(bg.convert('P', palette=Image.ADAPTIVE))
        fr[0].save(os.path.join(DOC, f'preview_{name}.gif'), save_all=True, append_images=fr[1:], duration=max(60, d['speed'] * 16), loop=0)


def write_ledger(anim, ledger, geom, halo_px, text, fx, frags):
    L = ['# Water Hazard (Orishan) — sprite ledger\n',
         '**Sheet from fun-tech.tk** (credit text on the sheet: "Fun-tech.tk", "Ben 10 Game creator"). Source: the owner\'s download '
         '`351942199_orig.png` (byte-identical to `351942199_orig (1).png`) → `assets/sprites/ben10/aliens/waterhazard.png` (1200×2000). '
         'Identified by contact sheet among the ten blue-background Fun-tech downloads: dark red / maroon insectoid, green eyes and claws, '
         'hunched, the glowing green / cyan orb charging in the third column, white silhouette bottom right.\n',
         '## Key, palette, halo, text\n',
         '- Background solid blue **(0,0,255)** keyed exactly (zero tolerance; all four corners asserted).\n'
         '- **Palette collision check:** maroon / dark red, black, greys, lime-green lights, green eyes and the cyan / green orb are never '
         f'blue-dominant inside the art beyond his own slate greys: **reported collision-adjacent colours** — the body greys (88,86,109) and '
         f'(52,51,72) are faintly blue (B − max(R,G) = 21; 99th percentile ≤ {GREY_D} per frame, asserted), and the orb\'s pale ring '
         f'(102,223,255) is blue-leaning (32); all stay below the halo threshold {HALO_D}, so none is keyed or eaten. The orb\'s cyan '
         f'(0,204,204) has B = G. The art is anti-aliased against the blue: **{halo_px}** blue-blend edge pixels (B − max(R,G) ≥ {HALO_D}, within '
         f'2 px of the key) are removed as halo, never art. **{len(SPECKS)} lossy bluish specks** sit inside the art (narrow gaps between '
         'limbs, the orb\'s translucent rim); they are KEPT untouched and listed in `source_grid.json`.\n'
         f'- Text: {len(text)} glyph components ("Fun-tech.tk" black, "Ben 10 / Game creator" green-cyan), top right, **removed** (not art). '
         f'{len(frags)} detached art fragments (claw / toe tips cut off by the halo) merged into the figure of their cell.\n',
         '## Cut, duplicates, true sequences\n',
         '- 22 figures on the sheet = **21 distinct drawings + 1 duplicate**: Col 4 R1 = Col 3 R3 pixel-exact, and Col 3 R6\'s body = Col 3 R3 '
         'pixel-exact (R6 adds free droplets) — asserted.\n'
         '- **True sequences** (previewed as animation, `preview_*.gif`): Col 1 R1 is a standing hunch; **Col 1 R2–R7 is a 6-frame stride '
         'cycle** (walk; run = the SAME cycle faster — no run art). Col 2: R1 / R2 long strides, R3 front-on with the hood up, R4 standing tall, '
         'R5 a crouched leap, R6 a forward reaching claw. **Col 3 R3 → R4 → R5 → R6 is the orb sequence**: orb forming in the raised hand, '
         'FULL CHARGE (big glowing orb + droplets), the burst ring, then a smaller orb dripping. Col 3 R1 is a low crouch with the claw out, '
         'R2 a hunched step. **Col 4: R1 = Col 3 R3 (aiming), R2 a crouch with the arm raised, R3 the white silhouette.** Real frames win: '
         'the brief\'s "Col 4 f2 crouch" is the arm-raised crouch (used as puddle enter / exit and jump rise).\n'
         f'- Uniform cell **{geom["cellW"]}×{geom["cellH"]}**. **Anchor = the TORSO** (median x of the body in its hip band, 45–60 % of its '
         'height — he is permanently hunched, so never the claws); feet baseline = the lowest body row on the feet row '
         f'originY={geom["feetY"]}. Pixels copied 1:1, pixel counts preserved, nothing cropped (claws, antennae, the orb and its droplets '
         'included — asserted).\n'
         f'- **Scale:** high-res cartoon art. Engine standard path, smoothing off: spriteScale 2.0 × global 1.18 × actionScale **{ACTION_SCALE}** '
         f'= ×{geom["screenScale"]} (a fixed engine scale; no resample filter) → ≈ human Ben\'s height.\n',
         '## White silhouette (Col 4 R3)\n',
         '- **Verified: the exact outline of Col 4 R2** (the crouch with the arm raised; mask match, pure white, asserted). Used as the '
         '**hit-flash / Omnitrix transform flash / timeout-revert flash** (`transform` f1, `whFlash`); not a move body.\n',
         '## Every distinct drawing → animation → move\n', '| Drawing | Animations (moves) |', '|---|---|']
    for k, (lab, _, _) in CELLS.items():
        L.append(f'| {lab}{" (= Col 4 R1)" if k == "aim" else ""} | {", ".join(n for n, cells, _ in ledger if k in cells)} |')
    L.append('\n## Animation → move (exported strips `' + PREFIX + '<anim>_uniform.png`)\n')
    L.append('| Animation | Frames | Speed | Source / move |'); L.append('|---|---|---|---|')
    for k, cells, note in ledger: L.append(f'| `{k}` | {len(cells)} | {anim[k]["speed"]} | {note} |')
    L.append('\n## Missing poses (closest real frame reused, no art invented)\n')
    L.append('- **hit light / heavy**: Col 2 R6 reach (as briefed). **air hit**: Col 2 R5 leap. **block / block-hit / crouch-guard, '
             'knockdown, lose**: Col 3 R1 crouch. **get-up**: Col 3 R1 → Col 1 R1. **dizzy**: Col 3 R2 ↔ Col 2 R3. **win**: Col 1 R1 ↔ Col 2 R3. '
             '**jump / fall**: Col 4 R2 → Col 2 R5 leap. **PUDDLE FORM**: the sheet has **no puddle frame** — the body sinks from Col 4 R2 into '
             'a **procedural pixel puddle** in his palette (render-only), and reforms Col 4 R2 → Col 1 R1.\n')
    L.append('## Extracted vs procedural effects\n')
    L.append(f'- **Extracted (real sheet pixels):** the orb in Col 3 R3–R6 / Col 4 R1 (touching the hand → part of the frame); the '
             f'**{len(fx)} free-floating droplets / spark lines / ring segments** beside Col 3 R4–R6 ({sum(c["n"] for c in fx)} px), kept in '
             'their own frame\'s cell at their exact sheet offset (never cropped, never a separate entity); the white silhouette flash.\n'
             '- **Procedural pixel-style, render-only (no hitbox, no GAME_STATE presence):** the puddle shape and its ripple, splash rings, '
             'the Pressure Blast water jet trail, the Hydro Burst radial ring, the Undertow water ring, the geyser column, the Geyser Dive '
             'downward orb trail, Drenched droplets / Short Fuse sparks over the opponent, the Pressure Core glow, the ultimate\'s vortex '
             'spiral and towering geyser, screen shake. They READ simulation state; they never write it.\n')
    L.append('\nContact sheet: `docs/ben10/aliens/waterhazard/contact_sheet.png` (every exported strip at ½ size; green = feet row, '
             'yellow = torso-centre column). Geometry, removed glyphs, free FX pieces, duplicates, anchors: `source_grid.json`.\n\n'
             'Credit: **Sheet from fun-tech.tk**.\n')
    open(os.path.join(DOC, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
