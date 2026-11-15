#!/usr/bin/env python3
"""Batman rebuild — extraction of EVERY supplied sheet (sources are read-only; hash-checked, never written).

BODY  "SNES - Batman Returns - Playable Characters - Batman.png" (900x1650, flat key RGB(163,77,77)).
      Only the exact key colour is removed. The "Sheet upgraded by DAD34853" credit and the top-right HUD life icon are
      excluded by rectangle (asserted: no art component overlaps them). Components are assigned to frames by explicit
      per-frame rectangles (a component belongs to the frame whose rectangle contains its centre); every component is
      either assigned or explicitly excluded (asserted).
FLEET five promotional WebP sheets (labels, flat lavender background RGB(180,175,188), smooth non-integer upscale,
      lossy compression) + drones_test002.webp (true RGBA, native pixels, handwritten labels).
      Promo sheets: background = the border-connected near-key region (|d| <= 26 per channel), so enclosed light metal
      and white / cyan exhaust are kept; fringe pixels that touch the background and are closer to the key than to any
      art colour (d < 48) are dropped; the remaining pixels are snapped to a per-sheet median-cut palette (32 colours,
      darkest entries kept) to remove compression noise. No native grid is recoverable (measured; see ASSET_MANIFEST),
      so art stays at sheet resolution and the engine scales it with nearest-neighbour.
      drones_test002: alpha kept as-is; the four handwritten labels are excluded by rectangle.
EXPLOSION for payload / ultimate impacts: the existing committed Krybot strip assets/krybot/explosion.png (5 x 64px,
      credited in credits.js / docs/krybot/CREDITS.md) is referenced read-only, never copied for the default skin.

Outputs: assets/batman/body.png (one row per action, symmetric cells), assets/batman/fleet.png (one row per group),
assets/batman/portrait.png, batmanSprites.js, docs/batman/source_rects.json, docs/batman/contact_*.png.
Usage: python3 tools/batman/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/batman'
DOC = ROOT / 'docs/batman'
SRC = {
    'body': ('SNES - Batman Returns - Playable Characters - Batman.png', '12f83f426fef'),
    'd2': ('Free-Drones-Pack-Pixel-Art2.webp', 'd06fe1402f66'),
    'd3': ('Free-Drones-Pack-Pixel-Art3.webp', '4055f8fb58e6'),
    'd4': ('Free-Drones-Pack-Pixel-Art4.webp', 'c484204b5add'),
    'd6': ('Free-Drones-Pack-Pixel-Art6.webp', '7177a4d4cdad'),
    'dt': ('drones_test002.webp', 'ba7268ebe903'),
    'rb': ('Robots-Pixel-Art-Sprite-Sheet-Pack6-1536x1024.webp', 'ac5ae72caca2'),
}
def sha(p): return hashlib.sha256((ROOT / p).read_bytes()).hexdigest()

# ════════════════════════════ BODY ════════════════════════════
KEY = (163, 77, 77)
EXCLUDE = {'hud_icon': (780, 10, 890, 72), 'credit_text': (596, 470, 900, 540)}
# frame rectangles (x0, y0, x1, y1) on the source; centre-of-component assignment
def row(r, y0, y1, cuts, end):
    xs = cuts + [end]
    return {f'r{r}_{i}': (xs[i], y0, xs[i + 1], y1) for i in range(len(cuts))}
FR = {}
FR.update(row(0, 0, 110, [0, 90, 170, 250], 330))
FR.update(row(1, 110, 220, [0, 70, 135, 212, 285, 360], 440))
FR.update(row(2, 220, 332, [0, 105, 205, 290, 370, 450, 530, 595, 690], 780))
FR.update(row(3, 332, 465, [0, 100, 170, 260, 345, 440, 535, 660, 750], 850))
FR.update(row(4, 465, 575, [0, 130, 215, 335, 440], 560))
FR.update(row(5, 575, 656, [0, 118, 200, 272], 365))
FR.update({f'bat_{i}': (x0, 600, x1, 640) for i, (x0, x1) in enumerate([(370, 400), (400, 430), (430, 451), (451, 470), (470, 492)])})
FR.update(row(6, 656, 805, [0, 160, 280, 410, 540, 662, 780], 880))
FR.update(row(7, 805, 930, [0, 113, 190, 300, 465, 560, 700, 795], 880))
FR.update(row(8, 930, 1030, [0, 120, 215, 335, 425, 510, 590], 660))
FR.update(row(9, 1030, 1146, [0, 110, 200, 295, 395, 480, 590, 675, 745], 830))
FR.update(row(10, 1146, 1240, [0, 96, 186, 310, 410, 515], 630))
FR.update({'r11_0': (0, 1240, 100, 1356), 'r11_1': (100, 1240, 192, 1356), 'r11_2': (192, 1240, 268, 1356),
           'line_h': (268, 1240, 330, 1268), 'line_d': (268, 1268, 330, 1330),
           'r11_3': (400, 1240, 500, 1356), 'r11_4': (500, 1240, 600, 1356), 'r11_5': (600, 1240, 690, 1356), 'r11_6': (690, 1240, 790, 1356)})
FR.update(row(12, 1356, 1480, [0, 90, 175, 265], 380))
FR.update(row(13, 1480, 1620, [0, 100, 210, 360, 480, 610, 730], 850))

# Tool / hand anchors (source px, measured from pixels: muzzle = rightmost / topmost DARK gun pixel, hand = rightmost
# pixel of the throwing arm, ropeTop = the rope's highest pixel; facing right).
# grapnel muzzle for the gun frames, rope top for the rope frames (the rope continues off-screen from there), batarang
# release hand for the throw. Mirrored by the engine for facing left (x' = -x about the cell centre).
TOOL = {
    'r11_0': ('muzzle', 85, 1263), 'r11_1': ('muzzle', 180, 1266), 'r11_2': ('muzzle', 258, 1267),
    'r12_0': ('muzzle', 72, 1366), 'r12_1': ('muzzle', 150, 1373),
    'r5_3': ('hand', 357, 613),
    'r6_2': ('ropeTop', 354, 687), 'r6_3': ('ropeTop', 494, 659), 'r6_4': ('ropeTop', 623, 659), 'r6_5': ('ropeTop', 713, 658),
}
BELT = lambda c: c[0] >= 76 and c[2] <= 50 and c[0] > c[1] + 30           # gold / orange belt + emblem
SKIN = {(192, 96, 72), (198, 99, 74), (248, 136, 128), (255, 140, 132), (248, 192, 200), (255, 198, 206)}

# ── ACTIONS: (cells, ticks per frame, loop). Interpretations + reachable input in docs/batman/SPRITE_TO_MOVE_MAP.md ──
A = lambda *c: list(c)
ACTIONS = {
    'idle': (A('r0_0', 'r0_1', 'r0_2', 'r0_3'), 9, True),
    'walk': (A('r1_0', 'r1_1', 'r1_2', 'r1_3', 'r1_4', 'r1_5'), 6, True),
    'walk_back': (A('r1_5', 'r1_4', 'r1_3', 'r1_2', 'r1_1', 'r1_0'), 7, True),
    'run': (A('r1_0', 'r1_1', 'r1_2', 'r1_3', 'r1_4', 'r1_5'), 4, True),
    'dash': (A('r3_8', 'r4_0'), 5, False),
    'jump': (A('r3_0', 'r3_1', 'r3_2'), 5, False),
    'doubleJump': (A('r4_1', 'r3_3', 'r4_3'), 4, False),
    'fall': (A('r3_4', 'r4_0'), 9, False),
    'land': (A('r3_0', 'r13_6'), 4, False),
    'crouch': (A('r10_0',), 8, True),
    'guard': (A('r8_5', 'r8_6'), 6, False),
    'hurt': (A('r8_0',), 6, False),
    'knockdown': (A('r8_1', 'r8_2'), 7, False),
    'getup': (A('r8_3', 'r8_4'), 9, False),
    'lose': (A('r8_1', 'r8_2'), 8, False),
    'win': (A('r11_3', 'r7_6', 'r7_7'), 14, False),
    'intro': (A('r13_0', 'r13_1', 'r13_2', 'r13_3', 'r13_4', 'r13_5', 'r13_6'), 7, False),
    'introSettle': (A('r7_6', 'r7_7', 'r0_0'), 12, False),
    'grab': (A('r7_0', 'r7_1', 'r7_5'), 6, False),
    # melee
    'light': (A('r2_0', 'r2_1', 'r2_2'), 4, False),
    'bL2': (A('r7_3', 'r7_4'), 4, False),
    'bL3': (A('r7_2', 'r2_3'), 5, False),
    'heavy': (A('r2_6', 'r2_7', 'r2_8'), 5, False),
    'bSpin': (A('r2_3', 'r2_4', 'r2_5', 'r2_6', 'r2_7', 'r2_8'), 5, False),
    'up': (A('r10_0', 'r10_3', 'r3_1'), 5, False),
    'bLow': (A('r10_0', 'r10_1', 'r10_2'), 4, False),
    'bSweep': (A('r10_4', 'r10_5'), 6, False),
    'air': (A('r3_5', 'r3_6'), 4, False),
    'bAirK': (A('r3_7', 'r4_2'), 5, False),
    'bDive': (A('r4_4',), 6, True),
    'bDiveLand': (A('r13_5', 'r13_6'), 6, False),
    'bCounter': (A('r8_5',), 8, False),
    'bCounterHit': (A('r13_1', 'r13_2', 'r2_7', 'r2_8'), 4, False),
    # gadgets
    'bBatarang': (A('r5_0', 'r5_1', 'r5_2', 'r5_3'), 4, False),
    'bGrapnel': (A('r11_0', 'r11_1', 'r11_2'), 5, False),
    'bRopeKick': (A('r6_0', 'r6_1', 'r6_2', 'r6_3', 'r6_4', 'r6_5'), 4, False),
    'bRopeLand': (A('r6_6',), 8, False),
    'bRooftop': (A('r12_0', 'r12_1', 'r12_2', 'r12_3', 'r13_4'), 5, False),
    'bSmoke': (A('r11_4', 'r11_5', 'r11_6'), 6, False),
    # fleet command gestures
    'cmdSky': (A('r11_3', 'r7_3'), 10, False),
    'cmdPoint': (A('r11_0', 'r11_2'), 8, False),
    'cmdCarrier': (A('r7_3', 'r7_4', 'r0_0'), 9, False),
    'cmdSkyhook': (A('r12_0', 'r12_1'), 9, False),
    'cmdCover': (A('r9_6', 'r9_7', 'r9_8'), 7, False),
    'cmdAuto': (A('r9_0', 'r9_1', 'r9_2', 'r9_3', 'r9_4', 'r9_5'), 5, False),
    # ultimate
    'ultOpen': (A('r11_0', 'r11_1', 'r11_2'), 5, False),
    'ultWatch': (A('r12_1',), 8, True),
    'ultSalute': (A('r11_3',), 8, True),
}

def load_body():
    p, h = SRC['body']; assert sha(p).startswith(h), p
    a = np.array(Image.open(ROOT / p).convert('RGB'))
    assert a.shape == (1650, 900, 3)
    return a

def body_cells(a):
    fg = ~(a == KEY).all(-1)
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    owner, excluded = {}, []
    inside = lambda r, x, y: r[0] <= x < r[2] and r[1] <= y < r[3]
    for i, (ys, xs) in enumerate(objs):
        cx, cy = (xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2
        ex = [k for k, r in EXCLUDE.items() if inside(r, cx, cy)]
        if ex: excluded.append((ex[0], i + 1)); continue
        hit = [k for k, r in FR.items() if inside(r, cx, cy)]
        assert len(hit) == 1, f'component {i + 1} x{xs.start}-{xs.stop} y{ys.start}-{ys.stop}: {hit}'
        owner.setdefault(hit[0], []).append(i + 1)
    # exclusions never touch art: every excluded component lies wholly inside its rectangle
    for k, i in excluded:
        ys, xs = objs[i - 1]; r = EXCLUDE[k]
        assert r[0] <= xs.start and xs.stop <= r[2] and r[1] <= ys.start and ys.stop <= r[3], (k, xs, ys)
    assert set(owner) == set(FR), set(FR) - set(owner)
    out = {}
    for name, ids in owner.items():
        m = np.isin(lab, ids); ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        rgba[..., :3] = a[y0:y1, x0:x1]; rgba[..., 3] = m[y0:y1, x0:x1] * 255
        px = [tuple(c) for c in a[y0:y1, x0:x1][m[y0:y1, x0:x1]]]
        belt = np.array([[xx, yy] for (yy, xx), c in zip(zip(ys, xs), [tuple(a[y, x]) for y, x in zip(ys, xs)]) if BELT(c)])
        ax = float(belt[:, 0].mean()) if len(belt) >= 8 else (x0 + x1) / 2
        out[name] = dict(rect=[int(x0), int(y0), int(x1 - x0), int(y1 - y0)], img=rgba, comps=len(ids), ax=ax, ay=int(y1))
    return out, excluded

# Anchor overrides (source x of the body centre) for frames without a visible belt or whose belt is displaced by the
# pose (back views, cape spreads, horizontal glides). Chosen on the contact sheet so the torso stays over the hurtbox.
AX = {'r2_4': 412, 'r2_5': 490, 'r13_2': 281, 'r4_4': 500, 'r3_8': 790, 'r8_2': 268, 'r8_1': 168, 'r9_8': 784,
      'r13_1': 152, 'r13_3': 424, 'r13_4': 545, 'r11_6': 730}
AIRY = {}   # none: every cell keeps its own lowest pixel as the ground anchor (airborne poses are placed by physics)

# ════════════════════════════ FLEET ════════════════════════════
BG = np.array([180, 175, 188])
def promo(key):
    p, h = SRC[key]; assert sha(p).startswith(h), p
    a = np.array(Image.open(ROOT / p).convert('RGB')).astype(int)
    near = np.abs(a - BG).max(-1) <= 26
    lab, n = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndimage.sum(near, lab, range(1, n + 1))
    bgm = np.isin(lab, list(border | {i + 1 for i, s in enumerate(sizes) if s > 4000}))
    fg = ~bgm
    # fringe: touching background and closer to the key than to any art colour
    touch = ndimage.binary_dilation(bgm, structure=np.ones((3, 3))) & fg
    fr = touch & (np.abs(a - BG).sum(-1) < 48)
    fg &= ~fr
    return a, fg

def quantize(a, fg, n=32):
    px = a[fg].astype(np.uint8).reshape(-1, 1, 3)
    pal = Image.fromarray(px, 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    lut = np.array(pal.getpalette()[:n * 3]).reshape(-1, 3)
    idx = np.array(pal).reshape(-1)
    q = a.copy(); q[fg] = lut[idx]
    return q, lut

# Groups: (sheet, label on sheet, rects [x,y,w,h], anchor mode, ticks per frame, interpretation)
# rects come from tools/batman/analyze.py (row / column gap scan on the matte) with hand cuts where frames touch.
G = {}
def g(name, sheet, label, rects, speed, note, anchor='body'):
    G[name] = dict(sheet=sheet, label=label, rects=rects, speed=speed, note=note, anchor=anchor)
# Free-Drones-Pack-Pixel-Art2 — top disc / scanner (SCOUT), capsule, lower drone (BOMBARDIER)
g('scout_death', 'd2', 'DEATH', [[628, 106, 100, 73], [747, 120, 100, 76], [865, 144, 101, 59], [985, 151, 95, 52], [1115, 150, 85, 54], [1233, 150, 84, 53]], 6, 'disc scanner destroyed: rotor bends, sparks, sinks', 'slot')
g('scout_idle', 'd2', 'IDLE', [[628, 227, 100, 70], [748, 224, 99, 76], [866, 224, 101, 72], [984, 225, 104, 73]], 6, 'hover bob (airborne deployment hover)')
g('scout_scan', 'd2', 'SCAN', [[627, 345, 101, 71], [747, 344, 100, 69], [866, 344, 101, 71], [984, 345, 101, 71], [1104, 345, 101, 71], [1222, 344, 101, 70], [1342, 344, 99, 69], [1459, 344, 101, 72]], 4, 'scanner eye sweep (target acquisition)')
g('scout_walk', 'd2', 'WALK', [[628, 467, 100, 73], [747, 465, 100, 75], [866, 465, 101, 73], [984, 465, 101, 75]], 5, 'banked patrol flight')
g('scout_walkscan', 'd2', 'WALK_SCAN', [[628, 585, 100, 71], [744, 584, 103, 70], [866, 584, 101, 72], [984, 587, 103, 69], [1104, 585, 101, 71], [1222, 584, 101, 70], [1342, 584, 99, 71], [1460, 586, 100, 70]], 4, 'moving scan (patrol while scanning)')
g('capsule', 'd2', 'CAPSULE', [[660, 736, 39, 63], [779, 730, 38, 68], [894, 725, 45, 73], [1008, 721, 51, 77], [1133, 757, 43, 43], [1253, 761, 43, 36]], 6, 'capsule vents (sparks), collapses — smoke/cover payload', 'foot')
g('bomber_drop', 'd2', 'DROP', [[643, 826, 74, 64], [760, 824, 75, 70], [877, 824, 77, 83], [1000, 824, 72, 85], [1118, 824, 74, 60], [1234, 824, 78, 71]], 5, 'thruster drop / descent (arrival)', 'top')
g('bomber_walk', 'd2', 'WALK', [[640, 945, 76, 63], [760, 942, 75, 72], [879, 942, 74, 78], [1000, 943, 72, 84]], 5, 'orbital patrol bank A', 'top')
g('bomber_walk2', 'd2', 'WALK2', [[641, 1064, 76, 58], [760, 1061, 75, 71], [879, 1061, 74, 79], [1000, 1062, 72, 86]], 5, 'orbital patrol bank B (tilted)', 'top')
# Art3 — box hover platform, nose-gun interceptor
g('platform_death', 'd3', 'DEATH', [[481, 138, 79, 45], [597, 167, 78, 43], [712, 178, 78, 41], [827, 178, 77, 41], [941, 178, 79, 41], [1056, 177, 78, 42]], 6, 'platform drops and sags (destroyed)', 'slot')
g('platform_idle', 'd3', 'IDLE', [[482, 252, 78, 54], [597, 252, 78, 56], [712, 248, 78, 64], [825, 252, 79, 61]], 6, 'hover with down-thrust lines', 'top')
g('platform_walk', 'd3', 'WALK', [[471, 368, 89, 57], [592, 368, 84, 60], [706, 368, 83, 62], [818, 368, 86, 65]], 5, 'lateral move with side streak', 'top')
g('inter_back', 'd3', 'BACK', [[477, 484, 87, 44], [592, 482, 88, 45], [707, 485, 87, 43], [822, 488, 88, 44]], 5, 'disengage (reverse thrust)')
g('inter_death', 'd3', 'DEATH', [[478, 600, 87, 44], [581, 595, 102, 45], [694, 605, 104, 43], [818, 620, 96, 44], [937, 631, 87, 44], [1051, 644, 87, 33], [1166, 644, 87, 33], [1281, 644, 87, 33]], 5, 'hit, smoke, falls and crashes', 'slot')
g('inter_fire1', 'd3', 'FIRE1', [[476, 713, 89, 45], [592, 712, 88, 44], [707, 713, 88, 44], [823, 717, 87, 43], [936, 714, 88, 45], [1052, 712, 86, 44], [1166, 714, 89, 43], [1281, 717, 87, 43], [1396, 714, 89, 44], [1512, 712, 86, 44], [1625, 714, 89, 43]], 3, 'firing stage 1 (recoil cycle)')
g('inter_fire2', 'd3', 'FIRE2', [[477, 826, 88, 46], [592, 824, 88, 46], [707, 825, 88, 47], [823, 828, 87, 48], [936, 826, 88, 46], [1051, 824, 88, 48], [1167, 827, 87, 45], [1280, 828, 88, 48], [1395, 827, 89, 45], [1512, 824, 87, 48], [1625, 827, 88, 45]], 3, 'firing stage 2 (cyan afterburner variant)')
g('inter_fwd', 'd3', 'FORWARD', [[477, 940, 88, 48], [592, 939, 88, 45], [704, 940, 90, 48], [822, 944, 88, 45]], 4, 'approach (forward thrust)')
g('inter_idle', 'd3', 'IDLE', [[477, 1057, 88, 45], [592, 1056, 88, 44], [707, 1057, 88, 44], [823, 1060, 87, 44]], 5, 'acquisition hover')
# Art4 — operators (labels are wrong: these are three crew members' gesture loops, not death/idle/walk) + carrier
g('crew_a', 'd4', 'DEATH (mislabelled)', [[298, 64, 75, 136], [493, 66, 76, 134], [671, 65, 79, 135], [855, 66, 102, 134], [1034, 64, 112, 136], [1223, 65, 95, 135], [1435, 65, 69, 135], [1619, 66, 75, 134]], 7, 'operator A: raises and fires a sidearm, holsters', 'foot')
g('crew_b', 'd4', 'IDLE (mislabelled)', [[302, 253, 67, 135], [491, 253, 67, 135], [673, 253, 87, 135], [850, 253, 105, 135], [1040, 253, 84, 135], [1248, 252, 62, 136], [1439, 253, 68, 135], [1627, 253, 65, 135]], 7, 'operator B: draws and fires, recovers', 'foot')
g('crew_c', 'd4', 'WALK (mislabelled)', [[294, 437, 75, 139], [479, 437, 78, 139], [668, 437, 92, 139], [850, 437, 94, 139], [1034, 437, 89, 139], [1250, 437, 59, 139], [1439, 437, 73, 139], [1624, 437, 68, 139]], 7, 'operator C (cyber arm): aims and fires, recovers — standing in place, not walking', 'foot')
g('carrier_back', 'd4', 'BACK (= collapse)', [[288, 619, 155, 117], [460, 642, 156, 117], [634, 653, 156, 110], [808, 650, 156, 113], [983, 650, 154, 113], [1156, 650, 156, 113]], 6, 'carrier frame sags and its deck buckles — the actual destruction', 'slot')
g('carrier_hover', 'd4', 'DEATH (= hover)', [[288, 793, 156, 125], [460, 793, 156, 127], [634, 794, 157, 128], [808, 793, 157, 131]], 6, 'intact carrier with down-thrust lines — arrival / delivery hover', 'top')
g('carrier_move', 'd4', 'IDLE (= lateral)', [[278, 968, 165, 125], [458, 968, 158, 130], [630, 968, 161, 132], [802, 968, 163, 135]], 6, 'intact carrier with side jets — lateral transit', 'top')
# Art6 — hook rotorcraft + fixed-wing aircraft + bombs
D6X = [340, 543, 745, 950, 1160, 1370]
g('heli_death', 'd6', 'DEATH', [[x, 56, 205, 170] for x in D6X], 5, 'flash silhouette → debris scatter (destroyed)', 'slot')
g('heli_idle', 'd6', 'IDLE', [[340, 261, 180, 132], [548, 260, 179, 131], [757, 261, 179, 132], [965, 264, 179, 132]], 4, 'hover, hook hanging (extraction approach)', 'top')
g('heli_land', 'd6', 'LANDING', [[340, 470, 180, 131], [548, 480, 180, 131], [756, 494, 180, 131], [965, 500, 179, 132], [1173, 509, 179, 131], [1383, 516, 178, 134], [1591, 527, 178, 132]], 5, 'descent with hook lowered (pickup approach); 8th cell clipped by the sheet edge — not used', 'top')
g('heli_walk', 'd6', 'WALK', [[341, 680, 179, 132], [548, 676, 180, 135], [757, 680, 179, 131], [964, 681, 180, 134]], 4, 'lateral transit, hook swinging', 'top')
g('plane_drop', 'd6', 'DROP', [[343, 893, 176, 43], [552, 893, 175, 43], [760, 893, 176, 43], [968, 893, 176, 50], [1177, 893, 175, 51], [1385, 893, 177, 51]], 4, 'bomb-bay opens, payload shows under the fuselage', 'top')
g('bombs', 'd6', 'BOMBS', [[328, 1083, 30, 20], [358, 1083, 34, 20], [392, 1083, 35, 20], [437, 1080, 22, 27], [473, 1080, 19, 29], [512, 1076, 12, 34]], 3, 'bomb tumbling horizontal → vertical (6 attitudes)', 'center')
# drones_test002 — native pixels
g('hunter', 'dt', 'Hunter row 1', [[9, 5, 23, 29], [45, 5, 30, 29], [91, 5, 33, 29], [134, 5, 40, 29]], 5, 'bipedal walker: step, step, fire (muzzle flash), fire', 'foot')
g('hunter_turn', 'dt', 'Hunter row 2', [[9, 45, 23, 29], [47, 45, 30, 29], [86, 45, 36, 29], [136, 45, 43, 29]], 5, 'the same walker facing back, firing behind it', 'foot')
g('lurker', 'dt', 'Lurker', [[6, 100, 81, 31], [97, 99, 103, 34]], 6, 'tracked cannon: rest, firing (the long line is its shot streak)', 'foot')
g('steelwing', 'dt', 'Steel Wing', [[12, 153, 36, 47], [65, 154, 37, 34], [120, 152, 37, 40], [173, 162, 40, 26]], 5, 'winged gun flyer: three banking cells (muzzle flashes included) + level strafe with flash', 'center')
g('defender', 'dt', 'Defender row 1', [[11, 214, 51, 35], [76, 210, 51, 39], [138, 214, 54, 35], [201, 214, 54, 35]], 6, 'tracked launcher: rack flat, rack raised, gun mount, gun firing', 'foot')
g('defender2', 'dt', 'Defender row 2', [[11, 263, 51, 39], [80, 267, 51, 35]], 6, 'launcher variant: rack raised (alt), scanner dome mount', 'foot')
g('ammo', 'dt', 'Defender pieces', [[151, 273, 30, 11], [147, 290, 34, 15], [190, 279, 24, 23]], 4, 'loose launcher pieces: missile pod (flat), gun mount, missile pod (angled) — used as arcing rounds', 'center')
# Robots-Pixel-Art-Sprite-Sheet-Pack6
g('auto_a1', 'rb', 'ATTACK1', [[405, 128, 73, 84], [583, 128, 167, 83], [762, 128, 116, 83], [939, 128, 84, 83]], 4, 'arm blaster: aim, beam, beam breaks up, recover', 'left34')
g('auto_a2', 'rb', 'ATTACK2', [[410, 307, 68, 83], [593, 307, 157, 83], [766, 305, 114, 85], [939, 307, 88, 83], [1121, 307, 72, 83], [1307, 305, 64, 85]], 4, 'stepping blaster follow-through', 'left34')
g('auto_a3', 'rb', 'ATTACK3', [[407, 494, 53, 74], [587, 510, 68, 58], [766, 513, 67, 55], [944, 510, 163, 58], [1121, 506, 138, 62], [1299, 495, 97, 73]], 4, 'crouch, shoulder cannon forward, heavy cyan beam, recover', 'left34')
g('auto_a4', 'rb', 'ATTACK4', [[401, 663, 57, 83], [580, 666, 56, 81], [758, 666, 57, 80], [936, 663, 58, 83], [1116, 666, 56, 80], [1294, 666, 57, 80]], 5, 'arm thrust stepping in place — used as the brace / reposition stride (no damage)', 'left34')
g('auto_death', 'rb', 'DEATH', [[405, 843, 62, 83], [581, 843, 63, 83], [758, 838, 63, 88], [936, 848, 65, 78], [1113, 854, 59, 72], [1297, 863, 50, 63]], 5, 'shutdown: red silhouette → disintegrates', 'slot')

LABEL_RECTS = {'dt': [(200, 28, 50, 25), (218, 104, 42, 24), (230, 157, 48, 34), (223, 280, 60, 22)]}

def fleet():
    sheets = {}
    for k in ['d2', 'd3', 'd4', 'd6', 'rb']:
        a, fg = promo(k); q, lut = quantize(a, fg); sheets[k] = (q, fg)
    p, h = SRC['dt']; assert sha(p).startswith(h)
    t = np.array(Image.open(ROOT / p).convert('RGBA'))
    fgt = t[..., 3] > 0
    for x, y, w, hh in LABEL_RECTS['dt']: fgt[y:y + hh, x:x + w] = False
    sheets['dt'] = (t[..., :3].astype(int), fgt)
    out = {}
    for name, gg in G.items():
        q, fg = sheets[gg['sheet']]
        frames = []
        r0 = gg['rects']
        miny = min(r[1] for r in r0)
        for i, (x, y, w, hh) in enumerate(r0):
            m = fg[y:y + hh, x:x + w].copy()
            img = np.zeros((hh, w, 4), np.uint8); img[..., :3] = q[y:y + hh, x:x + w]; img[..., 3] = m * 255
            lab, n = ndimage.label(m, structure=np.ones((3, 3)))
            if n:
                big = np.argmax(ndimage.sum(m, lab, range(1, n + 1))) + 1
                bys, bxs = np.nonzero(lab == big)
                bcx = x + (bxs.min() + bxs.max() + 1) / 2
            else: bcx = x + w / 2
            mode = gg['anchor']
            if mode == 'slot': ax = r0[0][0] + r0[0][2] / 2 + (i * ((r0[-1][0] - r0[0][0]) / max(1, len(r0) - 1)))
            elif mode == 'left34': ax = x + 34
            elif mode == 'center': ax = x + w / 2
            else: ax = bcx
            if mode in ('foot',): ay = y + hh
            elif mode in ('center',): ay = y + hh / 2
            else: ay = miny            # 'top'/'body'/'slot'/'left34': keep the authored vertical drift from the row top
            frames.append(dict(rect=[x, y, w, hh], img=img, ax=ax, ay=ay))
        out[name] = frames
    return out

# ════════════════════════════ PACK ════════════════════════════
def pack_rows(rows):
    """rows: list of (name, [cells as (img, ax, ay)]) → atlas + layout. Symmetric cells (origin = horizontal centre)."""
    lay, atl_rows = {}, []
    for name, cells in rows:
        L = max(max(ax - 0, 0) for img, ax, ay in cells)
        half = int(np.ceil(max(max(ax, img.shape[1] - ax) for img, ax, ay in cells))) + 1
        up = int(np.ceil(max(ay for img, ax, ay in cells))) + 1
        down = int(np.ceil(max(img.shape[0] - ay for img, ax, ay in cells))) + 1
        cw, ch = half * 2, up + down
        strip = np.zeros((ch, cw * len(cells), 4), np.uint8)
        for i, (img, ax, ay) in enumerate(cells):
            ox, oy = int(round(half - ax)) + i * cw, int(round(up - ay))
            hh, ww = img.shape[:2]
            sub = strip[oy:oy + hh, ox:ox + ww]; msk = img[..., 3] > 0; sub[msk] = img[msk]
        atl_rows.append((name, strip, cw, ch, half, up))
    W = max(s.shape[1] for _, s, *_ in atl_rows); H = sum(s.shape[0] for _, s, *_ in atl_rows)
    atlas = np.zeros((H, W, 4), np.uint8); y = 0
    for name, s, cw, ch, half, up in atl_rows:
        atlas[y:y + s.shape[0], :s.shape[1]] = s
        lay[name] = dict(sourceY=y, width=cw, height=ch, originX=half, originY=up, frames=s.shape[1] // cw)
        y += s.shape[0]
    return atlas, lay

def main():
    OUT.mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    a = load_body()
    cells, excluded = body_cells(a)
    for k, v in AX.items(): cells[k]['ax'] = v
    rel = lambda k: (cells[k]['img'], cells[k]['ax'] - cells[k]['rect'][0], cells[k]['ay'] - cells[k]['rect'][1])
    used = set()
    body_rows = []
    for name, (cl, spd, loop) in ACTIONS.items():
        body_rows.append((name, [rel(c) for c in cl])); used |= set(cl)
    # projectile / tool rows (batarang rotation, grapnel lines) packed in the body atlas too
    body_rows.append(('fxBatarang', [(cells[f'bat_{i}']['img'], cells[f'bat_{i}']['rect'][2] / 2, cells[f'bat_{i}']['rect'][3] / 2) for i in range(5)]))
    body_rows.append(('fxLineH', [(cells['line_h']['img'], 0, cells['line_h']['rect'][3] / 2)]))
    body_rows.append(('fxLineD', [(cells['line_d']['img'], 0, cells['line_d']['rect'][3])]))
    used |= {f'bat_{i}' for i in range(5)} | {'line_h', 'line_d'}
    unused = sorted(set(cells) - used)
    assert not unused, unused
    body_atlas, body_lay = pack_rows(body_rows)
    Image.fromarray(body_atlas).save(OUT / 'body.png', optimize=True)
    # tool anchors relative to each action's cell origin
    tools = {}
    for name, (cl, spd, loop) in ACTIONS.items():
        for i, c in enumerate(cl):
            if c in TOOL:
                kind, tx, ty = TOOL[c]
                tools.setdefault(name, {})[i] = dict(kind=kind, dx=round(tx - cells[c]['ax'], 1), dy=round(ty - cells[c]['ay'], 1))
    fl = fleet()
    fleet_atlas, fleet_lay = pack_rows([(n, [(f['img'], f['ax'] - f['rect'][0], f['ay'] - f['rect'][1]) for f in fr]) for n, fr in fl.items()])
    Image.fromarray(fleet_atlas).save(OUT / 'fleet.png', optimize=True)
    # portrait: cowl + chest from the front-facing victory cell r7_6
    c = cells['r7_6']['img']; por = c[0:46, :]
    Image.fromarray(por).resize((por.shape[1] * 3, por.shape[0] * 3), Image.NEAREST).save(OUT / 'portrait.png')
    # ── batmanSprites.js ──
    anim = {}
    for name, (cl, spd, loop) in ACTIONS.items():
        L = body_lay[name]
        anim[name] = dict(sheet='./assets/batman/body.png', frames=L['frames'], width=L['width'], height=L['height'], sourceY=L['sourceY'],
                          anchorY=0, loop=loop, lockLastFrame=True, originX=L['originX'], originY=L['originY'], speed=spd,
                          frameWidth=L['width'], frameHeight=L['height'])
    fx = {k: body_lay[k] for k in ('fxBatarang', 'fxLineH', 'fxLineD')}
    fleet_js = {n: dict(fleet_lay[n], speed=G[n]['speed']) for n in fl}
    js = ('// Generated by tools/batman/extract.py — do not hand-edit.\n'
          f'export const BATMAN_ANIM = {json.dumps(anim, indent=1)}\n'
          f'export const BATMAN_FX_CELLS = {json.dumps(fx)}\n'
          f'export const BATMAN_TOOL_ANCHORS = {json.dumps(tools)}\n'
          f'export const BATMAN_FLEET_CELLS = {json.dumps(fleet_js, indent=1)}\n'
          f"export const BATMAN_BODY_SHEET = './assets/batman/body.png'\nexport const BATMAN_FLEET_SHEET = './assets/batman/fleet.png'\n"
          f"export const BATMAN_EXPLOSION_SHEET = './assets/krybot/explosion.png'   // existing committed Krybot strip (5 x 64px), read-only reuse\n")
    (ROOT / 'batmanSprites.js').write_text(js)
    # ── ledger ──
    led = dict(sources={k: dict(file=v[0], sha256=sha(v[0])) for k, v in SRC.items()},
               body=dict(cells={k: dict(rect=v['rect'], anchor=[round(v['ax'], 1), v['ay']], components=v['comps']) for k, v in sorted(cells.items())},
                         excluded=sorted({k for k, _ in excluded}), exclude_rects=EXCLUDE, actions={k: dict(cells=v[0], ticksPerFrame=v[1], loop=v[2]) for k, v in ACTIONS.items()},
                         tool_anchors_source=TOOL),
               fleet={n: dict(sheet=SRC[gg['sheet']][0], label=gg['label'], note=gg['note'], ticksPerFrame=gg['speed'],
                              rects=[f['rect'] for f in fl[n]], anchors=[[round(f['ax'], 1), round(f['ay'], 1)] for f in fl[n]]) for n, gg in G.items()},
               labels_excluded={'drones_test002.webp': LABEL_RECTS['dt'], 'promo sheets': 'row labels lie left of every art rect (x < first rect) — never sampled'})
    (DOC / 'source_rects.json').write_text(json.dumps(led, indent=1))
    # ── contact sheets ──
    for nm, atl, lay in (('body', body_atlas, body_lay), ('fleet', fleet_atlas, fleet_lay)):
        im = Image.new('RGBA', (atl.shape[1] + 140, atl.shape[0]), (60, 60, 72, 255)); im.alpha_composite(Image.fromarray(atl), (140, 0))
        d = ImageDraw.Draw(im)
        for k, L in lay.items():
            d.text((4, L['sourceY'] + 4), k, fill=(255, 255, 0))
            for i in range(L['frames']):
                x = 140 + i * L['width']
                d.rectangle([x, L['sourceY'], x + L['width'] - 1, L['sourceY'] + L['height'] - 1], outline=(90, 90, 110))
                d.line([x + L['originX'], L['sourceY'] + L['originY'] - 4, x + L['originX'], L['sourceY'] + L['originY'] + 4], fill=(0, 255, 0))
        im.save(DOC / f'contact_{nm}.png')
    print('body cells', len(cells), 'actions', len(ACTIONS), 'atlas', body_atlas.shape, '| fleet groups', len(fl), 'atlas', fleet_atlas.shape, '| excluded', sorted({k for k, _ in excluded}))

if __name__ == '__main__':
    main()
