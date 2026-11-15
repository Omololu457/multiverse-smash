#!/usr/bin/env python3
"""SYNDROME (The Incredibles) — supplied-sheet extraction for Syndrome + his arsenal.

SOURCES ARE READ-ONLY: the six supplied GBA sheets in syndrome/ are hash-checked, copied byte-identical to
assets/syndrome/source/ and never written. Every output pixel is an original source pixel; only the exact sheet
background colour becomes transparent (Syndrome sheet #AD52AD, machine sheets #FF00FF — removed independently).
No resampling, smoothing, palette reduction, redrawing or generated poses. Health bars / portraits / UI ovals /
green digit glyphs on the sheets are excluded by band (listed in docs/syndrome/SPRITE_MAP.md "excluded").
FRAMES: band segmentation (tools/syndrome/segment.py) — bodies + their own sparks; effect rows by column cells.
MIRROR: the sheets draw Syndrome's side poses, the Drones, the Velocipod side flight and the gun / mortar turrets
facing LEFT. Those groups are mirrored once here so every stored strip faces RIGHT (the engine flips by facing).
ANCHORS: feet = (centroid x of the lowest 4 opaque rows, bottom); center = opaque centroid; attach = limb
attachment end (top of shaft); rect = top-left. Each strip's frames share one cell with the anchor at one point.
OUTPUT (1x original pixels; drawn at integer scale with nearest-neighbour):
  assets/syndrome/<action>.png         Syndrome body strips (engine animationData format)
  assets/syndrome/machines/<g>.png     machine / Omnidroid component / effect strips
  syndromeSprites.js                   generated tables SYNDROME_ANIM + SYNDROME_PARTS
  docs/syndrome/source_rects.json      every frame: sheet, source rect, mirror, anchor, tip
  docs/syndrome/contact_<sheet>.png    review sheets (2x, red = anchor, cyan = tip)
Usage: python3 -I tools/syndrome/extract.py
"""
import hashlib, json, os, shutil, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
from blobs import SHEETS, SRC
from segment import segment, fixed, cols, fixedx

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/syndrome'; MOUT = OUT / 'machines'; DOC = ROOT / 'docs/syndrome'
SHA = {'syndrome': 'b74fc2d93467', 'drone': '252abdc37338', 'spinner': '6b5c11ea2a69', 'turrets': '9aca0938c145',
  'velocipod': 'dc8667b9c70b', 'omnidroid': '41be51e829aa'}   # sha256 prefixes of the supplied files

def seg(k, band, big=300, near=14, pick=None):
  fr = segment(k, band, big, near)
  return [fr[i] for i in pick] if pick is not None else fr
def col(k, band, gap=2, pick=None):
  fr = cols(k, band, gap)
  return [fr[i] for i in pick] if pick is not None else fr

# ─────────────────────────── SOURCE GROUPS (sheet, frames, mirror, anchor, role) ───────────────────────────
# Syndrome sheet rows (inspected at source resolution — docs/syndrome/SPRITE_MAP.md):
#   A y0–68   4 side hover/ready poses (fist forward, cape streaming; face LEFT)
#   B y72–143 20 front-facing idle / expression loop (hands on hips)
#   C y147–215 4 front-facing grin variations       D y222–294 4 front-facing laugh variations
#   E y294–354 3 raised-arm turned gestures (E0–2), 1 arms-crossed upright turn (E3), 6 hunched remote steps (E4–9)
#   F y357–416 4 lower running strides (+ the heel dust puff authored beside F3)
def syndrome_groups():
  S = 'syndrome'
  E = seg(S, (0, 290, 430, 356), 500, 4)          # 10 bodies, left → right
  return {
    'A': (seg(S, (0, 0, 190, 70), 500), True),
    'B': (seg(S, (0, 70, 698, 146), 500), False),
    'C': (seg(S, (0, 146, 145, 219), 500), False),
    'D': (seg(S, (0, 219, 145, 294), 500), False),
    'E': (E, True),
    'F': (seg(S, (0, 355, 220, 416), 500, 14), True),
  }

def machine_groups():
  D, P, T, V, O = 'drone', 'spinner', 'turrets', 'velocipod', 'omnidroid'
  return {
    # ── DRONE: gun drone (top), bomber drone (lower), hatch drone (bottom); all face LEFT in the sheet ──
    'droneHover': (seg(D, (0, 0, 300, 40)), True, 'center', 'gun drone hover (rotor cycle)'),
    'droneHoverLow': (seg(D, (0, 40, 300, 73)), True, 'center', 'gun drone hover, barrel lowered'),
    'droneBank': (seg(D, (0, 73, 330, 106)), True, 'center', 'gun drone banking turn'),
    'droneTilt': (seg(D, (0, 106, 190, 139)), True, 'center', 'gun drone tilt / climb'),
    'droneTurn': (seg(D, (0, 139, 190, 172), 300, 4), True, 'center', 'side → front-facing → side orientation turn'),
    'droneFire': (seg(D, (0, 172, 120, 210)), True, 'center', 'diagonal shot + recoil (muzzle flash)'),
    'droneFireLevel': (seg(D, (0, 210, 120, 243)), True, 'center', 'level shot + recoil'),
    'droneSway': (seg(D, (0, 243, 175, 278)), True, 'center', 'gun drone sway / brake'),
    'droneHit': (seg(D, (0, 276, 168, 312), 300, 4), True, 'center', 'damaged (sparks)'),
    'droneWreck': (seg(D, (0, 330, 52, 366)), True, 'center', 'destroyed hull frame'),
    'droneShot': (col(D, (125, 184, 162, 196), 1), True, 'center', 'gun drone tracer pieces'),
    'boomOval': (seg(D, (48, 348, 112, 366), 100), False, 'center', 'explosion flash (ground oval)'),
    'boomBall': (seg(D, (110, 310, 168, 366), 100), False, 'center', 'explosion flash (ball)'),
    'boomRing': (fixed(D, 170, 300, 64, 66, 67, 7), False, 'center', 'expanding smoke ring (7)'),
    'bomberHover': (seg(D, (0, 383, 290, 409)), True, 'center', 'bomber drone hover'),
    'bomberTilt': (seg(D, (0, 409, 95, 436)), True, 'center', 'bomber tilt'),
    'bomberBank': (seg(D, (0, 440, 190, 468)), True, 'center', 'bomber banking'),
    'bomberDrop': (seg(D, (0, 468, 385, 498)), True, 'center', 'bomber payload release (8)'),
    'bomberTurn': (seg(D, (0, 498, 190, 525), 300, 4), True, 'center', 'bomber orientation turn (front view)'),
    'bomberHit': (seg(D, (0, 519, 150, 556), 300, 4), True, 'center', 'bomber damaged (sparks)'),
    'bomberWreck': (seg(D, (0, 552, 50, 576)), True, 'center', 'bomber destroyed hull'),
    'bomb': (col(D, (0, 594, 68, 611), 1), False, 'center', 'bomber payload pieces (6)'),
    'puffWhite': (seg(D, (66, 585, 92, 610), 100), False, 'center', 'small flash'),
    'puffGray': (seg(D, (91, 585, 116, 610), 100), False, 'center', 'small dark flash'),
    'puff': (col(D, (116, 575, 400, 610), 1), False, 'center', 'smoke puff dissipation'),
    'hatchDrone': (seg(D, (0, 686, 155, 724)), True, 'center', 'hatch drone (top hatch opening)'),
    'hatchFire': (seg(D, (0, 728, 110, 766)), True, 'center', 'hatch drone launch'),
    'microMissile': (col(D, (0, 784, 14, 798), 1), False, 'center', 'hatch micro-missiles'),
    # ── SPINNER (symmetric orb; not mirrored) ──
    'spOpen': (seg(P, (0, 0, 377, 34)), False, 'feet', 'closed orb → cap rises (13)'),
    'spSpin': (seg(P, (377, 0, 604, 34)) + seg(P, (638, 0, 752, 34)), False, 'feet', 'blades out, spinning (6)'),
    'spBlur': (seg(P, (0, 34, 110, 75)), False, 'feet', 'full-speed spin blur (2)'),
    'spClose': (seg(P, (0, 75, 660, 118)), False, 'feet', 'blades fold → cap closes (18)'),
    'spTilt': (seg(P, (0, 118, 100, 152), 300, 3), False, 'feet', 'tilted contact states (3)'),
    'spBoom': (col(P, (0, 153, 400, 199), 2), False, 'center', 'destruction flash + smoke'),
    # ── TURRETS: gun (rotating), missile, mortar; gun + mortar aim LEFT in the sheet ──
    'gunEmerge': (col(T, (0, 3, 345, 40), 2), True, 'feet', 'emergence from the floor (10)'),
    'gunOpen': (seg(T, (0, 40, 330, 86)), True, 'feet', 'cap opens, gun deploys (8)'),
    'gunRotate': (seg(T, (0, 89, 330, 133)), True, 'feet', 'gun rotation / aim sweep (8)'),
    'gunFire': (seg(T, (0, 138, 200, 183)), True, 'feet', 'firing forward (4)'),
    'gunFireDiag': (seg(T, (0, 184, 170, 229)), True, 'feet', 'firing diagonal-forward (4)'),
    'gunFireFront': (seg(T, (0, 228, 160, 273)), True, 'feet', 'firing toward camera (4)'),
    'gunFireUp': (seg(T, (0, 273, 200, 318), 500, 6), True, 'feet', 'firing high diagonal (4)'),
    'gunFireBack': (seg(T, (0, 318, 200, 362), 500, 6), True, 'feet', 'firing backward (4)'),
    'gunRetract1': (seg(T, (0, 361, 160, 407)), True, 'feet', 'gun idle / aim hold A (4)'),
    'gunRetract2': (seg(T, (0, 407, 160, 451)), True, 'feet', 'gun idle / aim hold B (4)'),
    'gunRetract3': (seg(T, (0, 451, 160, 497)), True, 'feet', 'gun idle / aim hold C (4)'),
    'turretFlash': (seg(T, (0, 510, 56, 574), 300, 2), False, 'feet', 'destruction flash'),
    'turretSmoke': (fixedx(T, [57, 100, 144, 190, 233, 276, 318], 510, 42, 27), False, 'center', 'destruction smoke (7)'),
    'turretBroken': (col(T, (56, 537, 594, 574), 1), False, 'feet', 'broken base, smouldering (13)'),
    'msOpen': (seg(T, (0, 639, 240, 668)), False, 'feet', 'missile hatch opening (6)'),
    'msRaise': (seg(T, (0, 669, 440, 714)), False, 'feet', 'missile raised into launch position (11)'),
    'msLaunch': (seg(T, (0, 714, 172, 784), 500, 20), False, 'feet', 'launch with exhaust (4)'),
    'missile': (col(T, (174, 746, 207, 782), 1), False, 'center', 'missile in flight (2)'),
    'mortarOpen': (seg(T, (0, 903, 450, 947), 500, 2), True, 'feet', 'mortar dome emerges / turns (10)'),
    'mortarFire': (seg(T, (0, 951, 165, 995)), True, 'feet', 'mortar fire A (4)'),
    'mortarFire2': (seg(T, (0, 994, 210, 1040), 500, 6), True, 'feet', 'mortar fire B — recoil + flash (4)'),
    'mortarFire3': (seg(T, (0, 1040, 165, 1086)), True, 'feet', 'mortar fire C (4)'),
    'shell': (col(T, (215, 1027, 260, 1041), 1), True, 'center', 'heavy shell tumbling (3)'),
    'shellSplat': (col(T, (215, 1041, 402, 1058), 1), True, 'feet', 'shell burst → dissolve (11)'),
    'shellSpin': (col(T, (215, 1058, 382, 1078), 1), False, 'center', 'shell spinning edge-on (15)'),
    # ── VELOCIPOD (side frames face LEFT in the sheet; the rider is part of the craft art) ──
    'vpFront': (seg(V, (0, 0, 292, 62)), False, 'center', 'front-view rotation (4)'),
    'vpShot': (col(V, (340, 26, 372, 37), 1), True, 'center', 'Velocipod shot pieces (3)'),
    'vpSide': (seg(V, (0, 61, 352, 113)), True, 'center', 'side flight (5)'),
    'vpSide2': (seg(V, (0, 114, 352, 172)), True, 'center', 'side flight, nose down (5)'),
    'vpBank': (seg(V, (0, 186, 292, 242)), True, 'center', 'banking flight (4)'),
    'vpFront2': (seg(V, (0, 242, 212, 302)), False, 'center', 'front-view, upright (3)'),
    'vpLean': (seg(V, (0, 307, 290, 371)), True, 'center', 'tilted lean flight (4)'),
    'vpRider': (seg(V, (0, 372, 215, 438)), True, 'center', 'rider action states (3)'),
    'vpCrash': (seg(V, (0, 440, 286, 519)), True, 'center', 'crash tumble (4)'),
    'vpBurst': (seg(V, (285, 440, 508, 519), 200, 30), False, 'center', 'crash burst (2)'),
    # ── OMNIDROID component kit (side view; no mirror — the renderer flips the whole assembly) ──
    'shellLower': (seg(O, (0, 0, 258, 127), 1000), False, 'rect', 'lower shell hemisphere (flat equator on top)'),
    'shellUpper': (seg(O, (0, 958, 258, 1112), 1000), False, 'rect', 'upper dome with sensor knobs (flat equator below)'),
    'eyeOpen': (seg(O, (0, 146, 366, 176), 300, 4), False, 'center', 'eye slit opening (5)'),
    'eyeTrack': (seg(O, (0, 179, 300, 208), 300, 4), False, 'center', 'eye glint tracking (4)'),
    'eyeEmitter': (seg(O, (0, 208, 470, 237), 300, 4), False, 'center', 'eye with side emitter deployed (5)'),
    'eyeFire': (seg(O, (0, 237, 210, 360), 300, 40, [5, 0, 3, 1, 4, 2]), False, 'center', 'emitter firing / recoil (6)'),
    'limbDiag': (seg(O, (0, 466, 1416, 634), 400, 30), False, 'attach', 'diagonal limb slam: reach → impact → claw (9)'),
    'leg': (seg(O, (0, 634, 760, 800), 400, 30), False, 'attach', 'vertical leg planting / lifting (7)'),
    'legSlam': (seg(O, (0, 800, 760, 958), 400, 30), False, 'attach', 'vertical limb stomp sequence (8)'),
    'claw': (seg(O, (760, 900, 1416, 975), 400, 6), False, 'attach', 'claw opening / closing (10)'),
    'clawCharge': (seg(O, (760, 975, 1416, 1060), 400, 12), False, 'attach', 'claw with energy discharge (4)'),
    'laserArm': (seg(O, (210, 237, 358, 461), 300, 20), False, 'attach', 'segmented arm extension lengths (8)'),
    'cannonHead': (seg(O, (356, 237, 460, 461), 300, 20), False, 'center', 'arm head: straight / firing / diagonal / vertical (5)'),
    'shaftJoint': (seg(O, (0, 356, 54, 420), 300, 3), False, 'center', 'diagonal shaft end / joint'),
    'fragment': (col(O, (52, 400, 160, 420), 1), False, 'center', 'shell fragments (8)'),
    'omniMissile': (col(O, (478, 1122, 513, 1160), 1), False, 'center', 'Omnidroid missiles (2)'),
    'omniBallW': (seg(O, (510, 1133, 536, 1160), 100), False, 'center', 'white flash'),
    'omniBallG': (seg(O, (535, 1133, 560, 1160), 100), False, 'center', 'dark flash'),
    'omniPuff': (col(O, (559, 1120, 820, 1160), 1), False, 'center', 'smoke dissipation'),
    'cyanMissile': (col(O, (478, 1160, 513, 1193), 1), False, 'center', 'energy missiles (white / cyan)'),
    'crystal': (col(O, (513, 1158, 715, 1193), 1), False, 'center', 'energy crystal shards (9)'),
    'cyanBall': (seg(O, (478, 1201, 503, 1226), 100), False, 'center', 'energy flash'),
    'cyanPuff': (col(O, (502, 1190, 820, 1226), 1), False, 'center', 'energy burst dissipation'),
  }

# Syndrome body animations: (row, index) references into the inspected rows. Every frame is a supplied pose;
# reused poses are listed in docs/syndrome/SPRITE_MAP.md "reuse".
R = lambda row, *ix: [(row, i) for i in ix]
BODY = {
  'idle': (R('A', 0, 1, 2, 3, 2, 1), 8, True),
  'idleFront': (R('B', *range(20)), 7, True),
  'walk': (R('E', 4, 5, 6, 7, 8, 9), 6, True),
  'walk_back': (R('E', 9, 8, 7, 6, 5, 4), 6, True),
  'run': (R('F', 0, 1, 2, 3), 5, True),
  'dash': (R('F', 1, 2), 4, True),
  'jump': (R('A', 1, 2), 6, False),
  'doubleJump': (R('A', 2, 3, 0), 4, False),
  'fall': (R('A', 3, 2), 8, True),
  'land': (R('E', 3), 6, False),
  'crouch': (R('E', 9), 8, False),
  'guard': (R('E', 3), 8, False),
  'taunt': (R('C', 0, 1, 2, 3, 2, 1), 7, True),
  'hurt': (R('E', 0, 1), 6, False),
  'hurt_air': (R('E', 1, 2), 6, False),
  'knockdown': (R('E', 2), 8, False),
  'getup': (R('E', 3) + R('A', 0), 8, False),
  'win': (R('D', 0, 1, 2, 3, 2, 1) + R('C', 0, 1), 7, True),
  'lose': (R('E', 2, 1, 0), 10, False),
  'intro': (R('B', 0, 1, 2, 3, 4, 5, 6, 7) + R('C', 0, 1, 2, 3) + R('D', 0, 1, 2, 3), 6, False),
  'introSettle': (R('E', 3) + R('A', 0), 8, False),
  # command gestures (attack strips; frameTimeline in syndromeData.js)
  'cmdLight': (R('E', 3) + R('A', 0, 1, 2), 3, False),         # arms-crossed → fist forward (short command)
  'cmdLight2': (R('A', 1) + R('E', 3) + R('A', 0), 3, False),
  'cmdHeavy': (R('E', 3, 0, 1, 2, 1), 4, False),                # raised-arm turned gesture (large command)
  'cmdLow': (R('E', 9, 8, 9), 4, False),                        # hunched remote press
  'cmdAir': (R('A', 0, 1, 2, 3), 3, False),
  'cmdDown': (R('E', 1, 2, 1), 4, False),
  'cmdDeploy': (R('E', 4, 5, 6, 7, 8, 9), 4, False),            # remote / command presentation
  'cmdGrab': (R('A', 0, 1) + R('E', 3), 4, False),
  'cmdUlt': (R('E', 3, 0, 1, 2, 2, 1, 0), 5, False),           # extended theatrical gesture
  'ultFront': (R('D', 0, 1, 2, 3, 2, 1, 0) + R('C', 0, 1, 2, 3), 6, False),
}

def mirror(f):
  f = dict(f); f['rgba'] = f['rgba'][:, ::-1].copy(); return f

def anchor(rgba, mode):
  a = rgba[..., 3] > 0; ys, xs = np.nonzero(a); h, w = a.shape
  if mode == 'feet':
    low = ys >= ys.max() - 3; return float(np.round(xs[low].mean())), float(ys.max() + 1)
  if mode == 'center': return float(np.round(xs.mean())), float(np.round(ys.mean()))
  if mode == 'attach':
    top = ys <= ys.min() + 3; return float(np.round(xs[top].mean())), float(ys.min())
  return 0.0, 0.0

def tip(rgba, mode):
  a = rgba[..., 3] > 0; ys, xs = np.nonzero(a)
  if mode != 'attach': return None
  low = ys >= ys.max() - 6
  return [float(np.round(xs[low].mean())), float(ys.max() + 1)]

def build_strip(frames, mode, name, outdir, speed=6, loop=True):
  info = []
  for f in frames:
    ax, ay = anchor(f['rgba'], mode); info.append((f, ax, ay))
  L = max(ax for _, ax, _ in info); Rr = max(f['rgba'].shape[1] - ax for f, ax, _ in info)
  T = max(ay for _, _, ay in info); B = max(f['rgba'].shape[0] - ay for f, _, ay in info)
  cw, ch = int(np.ceil(L + Rr)), int(np.ceil(T + B))
  strip = np.zeros((ch, cw * len(frames), 4), np.uint8); rec = []
  for i, (f, ax, ay) in enumerate(info):
    ox, oy = int(round(L - ax)), int(round(T - ay)); h, w = f['rgba'].shape[:2]
    reg = strip[oy:oy + h, i * cw + ox:i * cw + ox + w]
    m = f['rgba'][..., 3] > 0; reg[m] = f['rgba'][m]
    tp = tip(f['rgba'], mode)
    rec.append(dict(rect=f['rect'], mirror=f.get('_mirror', False), anchor=[ax, ay], cellOffset=[ox, oy],
      tip=[tp[0] + ox, tp[1] + oy] if tp else None))
  Image.fromarray(strip).save(outdir / f'{name}.png', optimize=True)
  meta = dict(frames=len(frames), width=cw, height=ch, originX=int(round(L)), originY=int(round(T)))
  return meta, rec

def main():
  for k, (fn, _) in SHEETS.items():
    h = hashlib.sha256((Path(SRC) / fn).read_bytes()).hexdigest()
    assert h.startswith(SHA[k]), (k, h)
  (OUT / 'source').mkdir(parents=True, exist_ok=True); MOUT.mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
  for k, (fn, _) in SHEETS.items():
    dst = OUT / 'source' / fn
    if not dst.exists(): shutil.copyfile(Path(SRC) / fn, dst)
    assert hashlib.sha256(dst.read_bytes()).hexdigest().startswith(SHA[k])
  rows = syndrome_groups()
  counts = {'A': 4, 'B': 20, 'C': 4, 'D': 4, 'E': 10, 'F': 4}
  for r, n in counts.items(): assert len(rows[r][0]) == n, (r, len(rows[r][0]), [f['rect'] for f in rows[r][0]])
  cells = {r: [dict(mirror(f), _mirror=True) if mir else f for f in fr] for r, (fr, mir) in rows.items()}
  rects, anim = {}, {}
  # every Syndrome body strip shares ONE cell size + feet origin so actions never jitter between strips
  allf = [f for r in cells for f in cells[r]]
  L = max(anchor(f['rgba'], 'feet')[0] for f in allf); Rr = max(f['rgba'].shape[1] - anchor(f['rgba'], 'feet')[0] for f in allf)
  T = max(anchor(f['rgba'], 'feet')[1] for f in allf)
  pad = dict(L=int(np.ceil(L)), R=int(np.ceil(Rr)), T=int(np.ceil(T)))
  for name, (refs, speed, loop) in BODY.items():
    fr = [cells[r][i] for r, i in refs]
    cw, ch = pad['L'] + pad['R'], pad['T'] + 1
    strip = np.zeros((ch, cw * len(fr), 4), np.uint8); rec = []
    for i, f in enumerate(fr):
      ax, ay = anchor(f['rgba'], 'feet'); ox, oy = int(round(pad['L'] - ax)), int(round(pad['T'] - ay)); h, w = f['rgba'].shape[:2]
      reg = strip[oy:oy + h, i * cw + ox:i * cw + ox + w]; m = f['rgba'][..., 3] > 0; reg[m] = f['rgba'][m]
      rec.append(dict(ref=list(refs[i]), rect=f['rect'], mirror=f.get('_mirror', False)))
    Image.fromarray(strip).save(OUT / f'{name}.png', optimize=True)
    anim[name] = dict(sheet=f'./assets/syndrome/{name}.png', frames=len(fr), width=cw, height=ch, originX=pad['L'], originY=pad['T'],
      anchorY=0, loop=loop, lockLastFrame=not loop, speed=speed, frameWidth=cw, frameHeight=ch)
    rects[f'body/{name}'] = rec
  # portrait: head + shoulders of the confident grin (C0), original pixels
  c0 = cells['C'][0]['rgba']; Image.fromarray(c0[:40]).save(OUT / 'portrait.png')
  parts, prec = {}, {}
  for name, (fr, mir, mode, role) in machine_groups().items():
    assert fr, name
    fr = [dict(mirror(f), _mirror=True) if mir else f for f in fr]
    meta, rec = build_strip(fr, mode, name, MOUT)
    parts[name] = dict(sheet=f'./assets/syndrome/machines/{name}.png', anchor=mode, role=role, tips=[r['tip'] for r in rec], **meta)
    prec[name] = rec
  rects.update({f'machines/{k}': v for k, v in prec.items()})
  js = ['// Generated by tools/syndrome/extract.py — do not hand-edit. 1x original pixels; drawn at integer scale (nearest).',
        'export const SYNDROME_ANIM = ' + json.dumps(anim, indent=1),
        '// Machine + Omnidroid component strips. originX/originY = the anchor (feet / center / limb attachment / rect);',
        '// tips = per-frame contact point (limb strips) in cell pixels, already faced RIGHT.',
        'export const SYNDROME_PARTS = ' + json.dumps(parts, indent=1), '']
  (ROOT / 'syndromeSprites.js').write_text('\n'.join(js))
  (DOC / 'source_rects.json').write_text(json.dumps(rects, indent=1))
  # contact sheets (2x): body + each machine sheet family
  fam = {'body': [f'body'], 'drone': ['drone', 'bomb', 'boom', 'puff', 'hatch', 'micro', 'bomber'], 'spinner': ['sp'],
    'turrets': ['gun', 'turret', 'ms', 'missile', 'mortar', 'shell'], 'velocipod': ['vp'],
    'omnidroid': ['shell', 'eye', 'limb', 'leg', 'claw', 'laser', 'cannon', 'shaft', 'fragment', 'omni', 'cyan', 'crystal']}
  def contact(names, path, src='machines'):
    ims = []
    for n in names:
      p = (MOUT if src == 'machines' else OUT) / f'{n}.png'; im = Image.open(p).convert('RGBA')
      meta = parts[n] if src == 'machines' else anim[n]
      bg = Image.new('RGBA', im.size, (40, 44, 58, 255)); bg.alpha_composite(im); d = ImageDraw.Draw(bg)
      for i in range(meta['frames']):
        x = i * meta['width'] + meta['originX']; y = meta['originY']
        d.rectangle([i * meta['width'], 0, (i + 1) * meta['width'] - 1, meta['height'] - 1], outline=(70, 76, 96))
        d.rectangle([x - 1, y - 1, x + 1, y + 1], outline=(255, 40, 40))
        if src == 'machines' and parts[n]['tips'][i]: tx, ty = parts[n]['tips'][i]; d.rectangle([tx - 1, ty - 1, tx + 1, ty + 1], outline=(40, 230, 255))
      ims.append((n, bg))
    W = max(min(im.width, 1400) for _, im in ims) + 8; H = sum(im.height + 14 for _, im in ims)
    sheet = Image.new('RGBA', (W, H), (24, 26, 34, 255)); d = ImageDraw.Draw(sheet); y = 0
    for n, im in ims:
      d.text((2, y), n, fill=(230, 230, 240)); sheet.alpha_composite(im.crop((0, 0, min(im.width, 1400), im.height)), (4, y + 12)); y += im.height + 14
    sheet.resize((W * 2, H * 2), Image.NEAREST).save(path)
  contact(list(BODY), DOC / 'contact_syndrome.png', 'body')
  groups = list(parts)
  for k in ['drone', 'spinner', 'turrets', 'velocipod', 'omnidroid']:
    names = [g for g in groups if any(g.startswith(p) for p in fam[k])]
    if k == 'omnidroid': names = [g for g in names if not g.startswith('shell') or g.startswith('shellL') or g.startswith('shellU')]
    if k == 'turrets': names = [g for g in names if not g.startswith('shellL') and not g.startswith('shellU')]
    contact(names, DOC / f'contact_{k}.png')
  total = sum(p['frames'] for p in parts.values())
  print(f'body strips {len(anim)}  machine strips {len(parts)} ({total} frames)')
  for n, p in parts.items(): print(f'  {n:16s} {p["frames"]:3d}  {p["width"]}x{p["height"]}')

if __name__ == '__main__':
  main()
