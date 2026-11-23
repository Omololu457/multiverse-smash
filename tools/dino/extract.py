#!/usr/bin/env python3
"""tools/dino/extract.py — MSV1-DINO phase 1: the five Dino Thunder sheets → labelled, keyed frames.

  python3 tools/dino/extract.py            → tools/dino/out/frames/<sheet>/<section>_<i>.png + tools/dino/out/frames.json
                                             + docs/msv1/dino/ledgers/<sheet>.json + docs/msv1/dino/compare.png

Keying: every sheet's OWN background, EXACT colour (zero tolerance): blue / yellow / white = (0,128,0) dark green,
drago = (0,255,0) lime, red.gif = palette INDEX 30 (pure blue) — the staff row's blue sparkle uses other indices and survives.
Frames are COMPONENT MASKS (8-connected after a 2 px dilation; tools/dino/comps.py), so overlapping afterimage frames
never bleed into each other. Nearest-neighbour only; no pixel is ever invented.
Trent (white.png + drago.png) is unified onto ONE palette (TRENT_PALETTE below); see docs/msv1/dino/SPRITE_MAP.md.
Excluded (only): text labels, credit boxes, the "example" composites, the old game's PV / HP health bars.
"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from comps import load
OUT = os.path.join(HERE, 'out'); DOCS = os.path.join(ROOT, 'docs', 'msv1', 'dino')

# section → list of frames, each frame = list of component indices (comps.py order, gap 2). Order = play order.
R = lambda *xs: [[x] for x in xs]
SPEC = {
  'red': {
    'portrait': [[0]], 'smallZord': [[10]], 'rider': [[11]], 'emblem': [[26]],
    'stand': R(1, 2, 3), 'run': R(5, 6, 7, 8, 9), 'jump': R(12, 13, 14, 16, 15), 'punch': R(17, 18), 'airKick': R(19, 20, 21),
    'staffA': R(23, 24, 25), 'staffB': [[27], [28], [29], [30, 31, 32, 33, 34, 35, 36, 37, 38, 39]],
  },
  'blue': {
    'portrait': [[5]], 'smallZord': [[6]], 'smallRider': [[16]], 'emblem': [[18]], 'rider': [[17, 20]],
    'stand': R(0, 2, 3), 'run': R(11, 12, 13, 14, 15), 'jump': R(21, 22, 23, 24),
    'zordPose': R(34, 30), 'sparkle': [[35, 36, 37, 38, 39, 40, 41, 42, 43]], 'ring': R(31, 32),
    'weaponUp': R(53, 54, 55), 'climb': R(56, 57, 49, 58, 59, 52, 60),
    'weaponDown': [[68], [69], [66], [67, 70, 71, 72, 73, 74, 75, 76, 77, 83, 84, 85, 86, 87, 88]],
    'lose': R(78, 79), 'damage': R(80, 81, 82), 'combo': R(92, 93, 94, 95, 96, 97, 98, 99), 'airPunch': R(100, 101, 102),
    'mission': [[108]], 'bossKilled': [[107]],
  },
  'yellow': {
    'portrait': [[6]], 'rider': [[7]], 'gemDots': [[13]], 'emblemSmall': [[14]], 'smallZord': [[15]], 'emblem': [[17]], 'smallFlyer': [[18]],
    'go': [[5]],   # the two stacked "GO!" sprites (split by rows below)
    'stand': R(0, 2, 3), 'jump': R(9, 10, 11, 12), 'lose': R(21, 22),
    'zordPose': R(32, 28), 'sparkle': [[33, 34, 35, 36, 37, 38, 39, 40, 41]], 'ring': R(29, 30),
    'damage': R(45, 43, 44, 46), 'run': R(47, 49, 51, 52, 53, 54, 55, 56), 'climb': R(68, 58, 60, 63, 64, 65, 66, 67),
    'weaponDown': [[79], [80], [75], [76, 77, 78, 81, 82, 83, 84, 85, 86, 87, 88, 93, 94, 95, 96]],
    'weaponUp': R(89, 90, 91, 92), 'combo': R(98, 99, 100, 101, 102, 103, 104, 105, 106, 107), 'airKick': R(114, 115, 116),
    'mission': [[117, 118]], 'bossKilled': [[119]],
  },
  'white': {
    'appear': [[5]], 'portrait': [[14]], 'stand': R(15, 16, 17, 18, 19), 'walk': R(21, 22, 23, 24, 25, 26, 27),
    'comboA': R(29, 30, 31, 32, 33, 34), 'comboB': R(35, 36, 37, 38, 39, 40, 41),
  },
  'drago': {
    'stand': R(4, 5), 'ready': R(6, 7), 'slash': R(8, 9, 10, 11), 'thrust': R(12, 13, 14, 15), 'kick': R(16, 17, 18, 19),
    'crescent': R(21, 22, 20, 23), 'run': R(24, 25, 26, 27, 28, 29, 30, 31),
    'dashA': R(32, 33, 34, 35, 36, 37, 38, 39), 'dashB': R(40, 41, 42, 43, 44, 45, 46), 'dashC': R(47, 48, 49), 'end': R(50, 51),
  },
}
# what every excluded component is (the ledger lists them; nothing else is dropped)
EXCLUDED = {
  'red': {4: 'HP bar (old game)', 22: 'credit box'},
  'blue': {1: 'label', 4: 'EXTRAS box outline', 7: 'credit box', 8: 'label', 9: 'label', 10: 'PV bar (old game)', 19: 'label', 25: 'example box (Ranger on the Zord head) + clean head — the CLEAN head is cut out separately', 26: 'example composite', 27: 'label "example"', 28: 'label', 29: 'label', 33: 'example composite (Ranger inside the ring)', 44: 'label', 45: 'label', 46: 'label', 47: 'label', 48: 'label', 50: 'label', 51: 'label', 61: 'label', 62: 'label', 63: 'label', 64: 'label', 65: 'label', 89: 'label', 90: 'label', 91: 'label', 103: 'label', 104: 'label', 105: 'label', 106: 'label'},
  'yellow': {1: 'label', 4: 'EXTRAS box outline + credit box', 8: 'label', 16: 'PV bar (old game)', 19: 'label', 20: 'PV bar (old game)', 23: 'example box + example composite', 24: 'label "example"', 25: 'CLEAN Ptera head (cut out separately)', 26: 'label', 27: 'label', 31: 'example composite (Ranger inside the ring)', 42: 'label', 48: 'label', 50: 'label', 57: 'label', 59: 'label', 61: 'label', 62: 'label', 69: 'label', 70: 'label', 71: 'label', 72: 'label', 73: 'label', 74: 'label', 97: 'label', 108: 'label', 109: 'label', 110: 'label', 111: 'label', 112: 'label', 113: 'label'},
  'white': {0: 'credit box', 1: 'label', 2: 'label', 3: 'label', 4: 'label', 6: 'note', 7: 'note', 8: 'note', 9: 'note', 10: 'note', 11: 'note', 12: 'note', 13: 'label', 20: 'label', 28: 'label'},
  'drago': {i: 'label / credit text' for i in [0, 1, 2, 3] + list(range(52, 62))},
}
# the clean Zord heads (the copies WITHOUT the Ranger): rectangles inside the example boxes' component
HEADS = {'blue': ('triceraHead', (648, 274, 871, 470)), 'yellow': ('pteraHead', (650, 289, 869, 450))}

# Trent: ONE palette = the Drago sheet's 15 body colours (all 15 are byte-identical in the White sheet). White-only colours and
# strays map onto it; White's green-blended streak halos (white blade light over the dark-green background) become the
# canonical light colour with the blend's alpha.
TRENT_PALETTE = [(248, 248, 248), (80, 80, 80), (176, 176, 176), (56, 56, 56), (120, 120, 120), (216, 216, 216), (40, 40, 32), (232, 232, 232),
                 (248, 240, 128), (248, 184, 96), (152, 112, 48), (200, 144, 64), (240, 168, 80), (176, 0, 0), (0, 0, 0)]
def unify_trent(rgba, src_bg):
    a = rgba.astype(np.int32); out = rgba.copy(); stats = {'kept': 0, 'remapped': 0, 'dehaloed': 0}
    pal = np.array(TRENT_PALETTE)
    m = a[:, :, 3] > 0
    for y, x in zip(*np.nonzero(m)):
        c = tuple(int(v) for v in a[y, x, :3])
        if c in TRENT_PALETTE: stats['kept'] += 1; continue
        r, g, b = c
        if src_bg is not None and g > r + 18 and abs(r - b) <= 12:   # a light colour blended over the green background
            gb = src_bg[1]; al = max(0.05, min(1.0, 1 - (g - r) / gb))
            lum = r / al; best = pal[np.argmin(np.abs(pal[:, 0] - lum) + np.abs(pal[:, 1] - lum) + np.abs(pal[:, 2] - lum))]
            out[y, x, :3] = best; out[y, x, 3] = int(round(al * 255)); stats['dehaloed'] += 1; continue
        best = pal[np.argmin(((pal - np.array(c)) ** 2).sum(1))]
        out[y, x, :3] = best; stats['remapped'] += 1
    return out, stats

def label_map(rgba, gap=2):
    m = rgba[:, :, 3] > 0
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=gap), structure=np.ones((3, 3)))
    lab = np.where(m, lab, 0)
    # comps.py order (sorted by (y//40, x)) → label id
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sl is None: continue
        sub = lab[sl] == i + 1; ys, xs = np.nonzero(sub)
        if not len(xs): continue
        boxes.append((sl[1].start + xs.min(), sl[0].start + ys.min(), i + 1))
    order = sorted(boxes, key=lambda b: (b[1] // 40, b[0]))
    return lab, [b[2] for b in order]

def crop(arr):
    al = arr[:, :, 3] > 0; ys, xs = np.nonzero(al)
    return arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (int(xs.min()), int(ys.min()))

def main():
    frames = {}; ledgers = {}
    os.makedirs(os.path.join(OUT, 'frames'), exist_ok=True); os.makedirs(os.path.join(DOCS, 'ledgers'), exist_ok=True)
    for sheet, spec in SPEC.items():
        rgba = load(sheet); lab, order = label_map(rgba)
        used = set(); led = {'sheet': sheet, 'components': len(order), 'sections': {}, 'excluded': {}, 'heads': {}}
        fdir = os.path.join(OUT, 'frames', sheet); os.makedirs(fdir, exist_ok=True)
        for sec, flist in spec.items():
            out = []
            for i, ids in enumerate(flist):
                mask = np.isin(lab, [order[k] for k in ids]); used.update(ids)
                arr = np.zeros_like(rgba); arr[mask] = rgba[mask]
                c, (x0, y0) = crop(arr)
                out.append({'ids': ids, 'x': x0, 'y': y0, 'w': int(c.shape[1]), 'h': int(c.shape[0]), 'arr': c})
            if sheet == 'yellow' and sec == 'go':   # two stacked GO! sprites: split at the empty row between them
                c = out[0]['arr']; rows = np.nonzero(c[:, :, 3].any(1))[0]; gaps = [r for r in range(rows.min(), rows.max()) if not c[r, :, 3].any()]
                cut = gaps[len(gaps) // 2] if gaps else c.shape[0] // 2
                out = [{'ids': out[0]['ids'], 'x': out[0]['x'], 'y': out[0]['y'], 'arr': crop(c[:cut])[0]}, {'ids': out[0]['ids'], 'x': out[0]['x'], 'y': out[0]['y'] + cut, 'arr': crop(c[cut:])[0]}]
            if sheet == 'yellow' and sec == 'gemDots':   # 4 gem dots in one component group → 4 frames (gap-0 components, left → right)
                c = out[0]['arr']; l0, n0 = ndimage.label(c[:, :, 3] > 0, structure=np.ones((3, 3)))
                parts = sorted([(sl[1].start, j + 1) for j, sl in enumerate(ndimage.find_objects(l0))])
                out = [{'ids': out[0]['ids'], 'x': out[0]['x'] + x, 'y': out[0]['y'], 'arr': crop(np.where((l0 == j)[:, :, None], c, 0).astype(np.uint8))[0]} for x, j in parts]
            for i, fr in enumerate(out):
                a = fr['arr']
                if sheet in ('white', 'drago') and sec != 'portrait':   # the painted portrait keeps its own shading
                    a, st = unify_trent(a, (0, 128, 0) if sheet == 'white' else (0, 255, 0)); fr['trent'] = st; fr['arr'] = a
                Image.fromarray(a).save(os.path.join(fdir, f'{sec}_{i}.png'))
                fr['w'], fr['h'] = int(a.shape[1]), int(a.shape[0])
            led['sections'][sec] = [{k: v for k, v in fr.items() if k != 'arr'} for fr in out]
            frames.setdefault(sheet, {})[sec] = len(out)
        if sheet in HEADS:
            name, (x0, y0, x1, y1) = HEADS[sheet]
            sub = rgba[y0:y1, x0:x1].copy()
            # drop the example box's 1 px outline (the dark frame line) — only fully-opaque straight runs ≥ 80 % of the side
            for r in range(sub.shape[0]):
                if (sub[r, :, 3] > 0).mean() > 0.8 and len({tuple(p) for p in sub[r, :, :3][sub[r, :, 3] > 0]}) <= 2: sub[r, :, 3] = 0
            for cc in range(sub.shape[1]):
                if (sub[:, cc, 3] > 0).mean() > 0.8 and len({tuple(p) for p in sub[:, cc, :3][sub[:, cc, 3] > 0]}) <= 2: sub[:, cc, 3] = 0
            c, _ = crop(sub); Image.fromarray(c).save(os.path.join(fdir, f'{name}_0.png'))
            led['heads'][name] = {'rect': [x0, y0, x1, y1], 'w': int(c.shape[1]), 'h': int(c.shape[0])}; frames[sheet][name] = 1
        for k in range(len(order)):
            if k in used: continue
            led['excluded'][k] = EXCLUDED.get(sheet, {}).get(k, 'UNACCOUNTED')
        ledgers[sheet] = led
        json.dump(led, open(os.path.join(DOCS, 'ledgers', sheet + '.json'), 'w'), indent=1, default=int)
    json.dump(frames, open(os.path.join(OUT, 'frames.json'), 'w'), indent=1)
    bad = [(s, k) for s, l in ledgers.items() for k, v in l['excluded'].items() if v == 'UNACCOUNTED']
    print(json.dumps(frames))
    print('UNACCOUNTED components:', bad)
    tr = {}
    for s in ('white', 'drago'):
        for sec in ledgers[s]['sections'].values():
            for fr in sec:
                for k, v in fr.get('trent', {}).items(): tr[(s, k)] = tr.get((s, k), 0) + v
    print('Trent unification:', {f'{a}.{b}': v for (a, b), v in tr.items()})
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main())
