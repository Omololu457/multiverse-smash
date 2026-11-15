#!/usr/bin/env python3
"""Megumi Fushiguro (megumi_fushiguro) — supplied-sheet extraction.

SOURCE IS READ-ONLY: assets/megumi_fushiguro/source/megumi_fushiguro_jus_by_xxniiroxx_dehd6g3-fullview.jpg
(1920x4230, quality-100 JPEG, 4:4:4) is hash-checked and never written.
CLEANING: tools/megumi/clean.py (border-connected key segmentation, local enclosed-pocket masks, annotation-line
removal, gamut-protected edge decontamination). No blur, smoothing, resampling or palette reduction: every output
pixel is a source pixel (or that pixel with the measured key share removed at the outer edge).
FRAMES: tools/megumi/frames.py — explicit hand-audited rectangles. ANCHORS: see frames.py figure families.
OUTPUT (1x original pixels; the game scales by an integer factor with nearest-neighbour):
  assets/megumi_fushiguro/<action>.png      Megumi action strips (one cell per action, feet origin)
  assets/megumi_fushiguro/summons/<g>.png   summon strips with their OWN bounds (wings / tongue / water never cropped)
  megumiSprites.js                          generated animation table
  docs/megumi/source_rects.json             every frame: source rect + anchor
  docs/megumi/contact_*.png                 review sheets (2x, red = anchor)
Usage: python3 -I tools/megumi/extract.py
"""
from pathlib import Path
import hashlib, json, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
sys.path.insert(0, str(Path(__file__).resolve().parent))
from clean import clean
from frames import G, MEGUMI_GROUPS, AIR_GROUPS, OWN_FEET, SUMMON_GROUPS, LEFT_GROUPS, MAHORAGA_GROUPS

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/megumi_fushiguro/source/megumi_fushiguro_jus_by_xxniiroxx_dehd6g3-fullview.jpg'
SHA = 'aee098808b8af0988e91f17f17416cba985841e7dd1838345b43799749b63940'
OUT = ROOT / 'assets/megumi_fushiguro'
DOC = ROOT / 'docs/megumi'


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def split_rect(rgba, x0, x1, y0, y1):
    col = (rgba[y0:y1, x0:x1, 3] > 0).sum(0)
    w = x1 - x0; lo, hi = w // 3, 2 * w // 3
    c = lo + int(np.argmin(col[lo:hi]))
    assert col[c] <= 3, ('split column not empty enough', x0, x1, int(col[c]))
    return [(x0, x0 + c, y0, y1), (x0 + c + 1, x1, y0, y1)]


def expand(rgba):
    out = {}
    for g, rects in G.items():
        rs = []
        for r in rects:
            if r[0] == 'split': rs += split_rect(rgba, *r[1:])
            else: rs.append(r)
        out[g] = rs
    return out


def cut(rgba, r):
    x0, x1, y0, y1 = r
    sub = rgba[y0:y1, x0:x1].copy()
    m = sub[..., 3] > 0
    assert m.any(), ('empty frame', r)
    ys, xs = np.where(m)
    bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    return sub[by0:by1, bx0:bx1], [x0 + bx0, y0 + by0, bx1 - bx0, by1 - by0]


def head_template(img):
    """Megumi's head from the first stance frame: hair + face rows (top 14 px)."""
    return img[:14].astype(np.int32)


def match_head(img, tpl):
    H, W = img.shape[:2]; th, tw = tpl.shape[:2]
    tm = tpl[..., 3] > 0
    best = (1e9, 0, 0)
    a = img.astype(np.int32)
    for dy in range(-2, max(1, H - th + 1)):
        for dx in range(-tw // 2, W - tw // 2):
            ys0, xs0 = max(0, dy), max(0, dx)
            ys1, xs1 = min(H, dy + th), min(W, dx + tw)
            if ys1 - ys0 < th - 3 or xs1 - xs0 < tw - 4: continue
            fa = a[ys0:ys1, xs0:xs1]; ta = tpl[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
            tmm = ta[..., 3] > 0
            if tmm.sum() < tm.sum() * 0.7: continue
            fo = fa[..., 3] > 0
            both = tmm & fo
            if both.sum() < 10: continue
            diff = np.abs(fa[..., :3] - ta[..., :3]).sum(2)[both].mean() / 3
            miss = (tmm & ~fo).sum() / tmm.sum()
            s = diff + 80 * miss
            if s < best[0]: best = (s, dx, dy)
    return best


def core_mask(img):
    """Creature core: drop electric / slash / water / grass pixels (bright cyan-blue, saturated pale blue, yellow grass)."""
    r, g, b = [img[..., i].astype(int) for i in range(3)]
    a = img[..., 3] > 0
    electric = (b > 150) & (b > r + 40)
    grass = (r > 150) & (g > 120) & (b < 110) & (r - b > 80)
    return a & ~electric & ~grass


def anchors(groups, imgs):
    tpl = head_template(imgs[('stance', 0)][0])
    tw = tpl.shape[1]
    meta = {}
    for g, rects in groups.items():
        rects_full = [None] * len(rects)
        floors = {}
        for i, r in enumerate(rects):   # ground line per sheet band (a group may span two sheet rows)
            rc = imgs[(g, i)][1]; floors[r[3]] = max(floors.get(r[3], 0), rc[1] + rc[3])
        for i in range(len(rects)):
            img, rect = imgs[(g, i)]
            band_floor = floors[rects[i][3]]
            x0, y0, w, h = rect
            if g in MEGUMI_GROUPS:
                s, dx, dy = match_head(img, tpl)
                if s < 40: ax, how = dx + tw / 2, f'head {s:.1f}'
                else:
                    m = img[..., 3] > 0; cols = np.where(m.any(0))[0]; ax, how = (cols.min() + cols.max() + 1) / 2, f'bbox (head score {s:.0f})'
                feet = (g in AIR_GROUPS) or ((g, i) in OWN_FEET)
                ay = h if feet else band_floor - y0
            elif g in LEFT_GROUPS:
                ax, ay, how = 50, band_floor - y0, 'rump+50'
            else:
                m = core_mask(img)
                if m.sum() < 20: m = img[..., 3] > 0
                cols = np.where(m.any(0))[0]
                ax, ay, how = (cols.min() + cols.max() + 1) / 2, band_floor - y0, 'core-bottom'
            meta[(g, i)] = {'rect': rect, 'anchor': [round(float(ax), 1), int(ay)], 'how': how}
    return meta


# ── engine actions (Megumi strips) — rationale in docs/megumi/SPRITE_MAP.md ──
def R(g, *ks): return [(g, k) for k in ks]
ACTIONS = {
    'intro': R('special', *range(13)),                 # 'specially action': shadow pool spreads, stored weapons rise, recede
    'introSettle': R('stance', 0, 1, 2, 3),
    'introMahoraga': R('signMahoraga', *range(9)) + R('signMahoraga', 8) * 30,   # held sign while the supplied Mahoraga plays (fx)
    'idle': R('stance', 0, 1, 2, 3),
    'walk': R('move', *range(8)),                       # the sheet's only locomotion cycle ('move'), slower playback
    'walk_back': R('move', *range(7, -1, -1)),
    'run': R('move', *range(8)),
    'dash': R('move', 1, 2, 5, 6),
    'jump': R('jump', 2, 3, 4),
    'doubleJump': R('jump', 3, 4, 5),
    'fall': R('jump', 5, 6),
    'land': R('jump', 7, 8, 9, 10, 11),
    'crouch': R('guardA', 4),
    'guard': R('guardA', 3, 4),
    'taunt': R('guardB', *range(11)),                   # crouch → reach into his shadow → rise with a stored blade
    'hurt': R('damage', 0, 1, 2),
    'hurt_air': R('damage', 3),
    'knockdown': R('damage', 3, 4, 5),
    'getup': R('damage', 6, 7, 8, 9),
    'win': R('win', *range(11)),                        # Nue descends and carries him up (sheet 'win')
    'lose': R('lose', *range(5)),
    # ── normals ──
    'light': R('weakA', *range(9)),
    'mL2': R('wfwdA', *range(6)),
    'mL3': R('weakC', *range(13)),
    'mLow': R('guardC', *range(11)),
    'heavy': R('weakB', *range(2, 15)),
    'mAdv': R('wfwdB', *range(11)),
    'up': R('wupA', *range(6)),
    'mLaunch': R('wupC', *range(12)),
    'air': R('airNueM', *range(6)),
    'mAirEnd': R('airToadM', *range(6)),
    # ── summon gestures ──
    'mDog': R('dogM', *range(6)),
    'mToad': R('toadM', *range(6)),
    'mNue': R('nueM', *range(6)),
    'mRabbit': R('rabbitM', *range(6)),
    'mSerpent': R('serpentM', *range(6)),
    'mAirNue': R('airNueM', *range(6)),
    'mElephant': R('signElephant', *range(15)),
    'mStep': R('special', 2, 3, 4, 8, 9, 10),
    'ultOpen': R('signKon', *range(14)),
    'ultSign': R('signDomain', *range(9)),
    'ultDomain': R('domain', *range(15)),
}
LOOP = {'idle', 'walk', 'walk_back', 'run', 'dash', 'guard', 'crouch', 'fall'}
SPEED = {'idle': 9, 'walk': 6, 'walk_back': 6, 'run': 4, 'dash': 3, 'jump': 4, 'doubleJump': 3, 'fall': 6, 'land': 3, 'crouch': 8,
         'guard': 10, 'hurt': 5, 'hurt_air': 8, 'knockdown': 6, 'getup': 6, 'win': 7, 'lose': 8, 'intro': 6, 'introSettle': 8,
         'introMahoraga': 6, 'taunt': 6}


def compose(name, cells, imgs, meta, pad=2):
    L = max(meta[c]['anchor'][0] for c in cells); Rr = max(imgs[c][1][2] - meta[c]['anchor'][0] for c in cells)
    U = max(meta[c]['anchor'][1] for c in cells); D = max(imgs[c][1][3] - meta[c]['anchor'][1] for c in cells)
    ox, oy = int(np.ceil(L)) + pad, int(U) + pad
    W, H = ox + int(np.ceil(Rr)) + pad, oy + max(0, int(D)) + pad
    strip = Image.new('RGBA', (W * len(cells), H), (0, 0, 0, 0))
    for k, c in enumerate(cells):
        img = Image.fromarray(imgs[c][0], 'RGBA'); ax, ay = meta[c]['anchor']
        px, py = k * W + ox - int(round(ax)), oy - ay
        assert px >= k * W and px + img.width <= (k + 1) * W and py >= 0 and py + img.height <= H, (name, c)
        strip.alpha_composite(img, (px, py))
    return strip, {'frames': len(cells), 'width': W, 'height': H, 'originX': ox, 'originY': oy}


def contact(path, keys, imgs, meta, title, S=2, per=12):
    cw = max(imgs[k][1][2] for k in keys) * S + 10; chh = max(imgs[k][1][3] for k in keys) * S + 26
    rows = (len(keys) + per - 1) // per
    sheet = Image.new('RGB', (min(per, len(keys)) * cw, rows * chh + 20), (40, 44, 56)); d = ImageDraw.Draw(sheet)
    d.text((4, 4), title, fill='white')
    for i, k in enumerate(keys):
        x, y = i % per * cw, 20 + i // per * chh
        img = Image.fromarray(imgs[k][0], 'RGBA'); big = img.resize((img.width * S, img.height * S), Image.NEAREST)
        sheet.paste(big, (x + 4, y + 14), big)
        ax, ay = meta[k]['anchor']; d.ellipse([x + 4 + ax * S - 3, y + 14 + ay * S - 3, x + 4 + ax * S + 3, y + 14 + ay * S + 3], outline='red')
        d.text((x + 4, y + 2), f'{k[0]}{k[1]}', fill=(255, 230, 120))
    sheet.save(path)


def main():
    assert sha(SRC) == SHA, 'source hash mismatch'
    a = np.asarray(Image.open(SRC).convert('RGB'))
    assert a.shape == (4230, 1920, 3)
    rgba, stats = clean(a)
    groups = expand(rgba)
    imgs = {}
    for g, rects in groups.items():
        for i, r in enumerate(rects): imgs[(g, i)] = cut(rgba, r)
    # no pixel may belong to two frames
    owner = np.zeros(rgba.shape[:2], np.int32)
    for k, (g, rects) in enumerate(groups.items()):
        for r in rects:
            x0, x1, y0, y1 = r; m = rgba[y0:y1, x0:x1, 3] > 0
            assert not (owner[y0:y1, x0:x1][m] > 0).any(), ('overlapping frames', g, r)
            owner[y0:y1, x0:x1][m] = k + 1
    meta = anchors(groups, imgs)
    OUT.mkdir(parents=True, exist_ok=True); (OUT / 'summons').mkdir(exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    anim = {}
    for name, cells in ACTIONS.items():
        strip, d = compose(name, cells, imgs, meta)
        strip.save(OUT / f'{name}.png', optimize=True)
        anim[name] = {'sheet': f'./assets/megumi_fushiguro/{name}.png', **d, 'anchorY': 0, 'loop': name in LOOP, 'lockLastFrame': True,
                      'speed': SPEED.get(name, 4), 'frameWidth': d['width'], 'frameHeight': d['height']}
    summon = {}
    for g in SUMMON_GROUPS + LEFT_GROUPS + MAHORAGA_GROUPS:
        cells = [(g, i) for i in range(len(groups[g]))]
        strip, d = compose(g, cells, imgs, meta)
        strip.save(OUT / 'summons' / f'{g}.png', optimize=True)
        summon[g] = {'sheet': f'./assets/megumi_fushiguro/summons/{g}.png', **d}
    # portrait: stance frame 0 head + shoulders (original pixels), and the full-body select icon
    st = Image.fromarray(imgs[('stance', 0)][0], 'RGBA')
    st.save(OUT / 'portrait.png')
    src = {f'{g}{i}': meta[(g, i)] for g in groups for i in range(len(groups[g]))}
    used = sorted({f'{g}{i}' for cells in ACTIONS.values() for g, i in cells} |
                  {f'{g}{i}' for g in SUMMON_GROUPS + LEFT_GROUPS + MAHORAGA_GROUPS for i in range(len(groups[g]))})
    unused = sorted(set(src) - set(used))
    json.dump({'source': SRC.name, 'sha256': SHA, 'size': [1920, 4230], 'clean': stats,
               'groups': {g: len(r) for g, r in groups.items()}, 'frames': src, 'actions': {k: [f'{g}{i}' for g, i in v] for k, v in ACTIONS.items()},
               'unusedFrames': unused}, open(DOC / 'source_rects.json', 'w'), indent=1)
    with open(ROOT / 'megumiSprites.js', 'w') as f:
        f.write('// Generated by tools/megumi/extract.py — do not hand-edit. 1x original pixels; drawn at MEGUMI_SCALE (integer, nearest).\n')
        f.write('export const MEGUMI_ANIM = ' + json.dumps(anim, indent=1) + '\n')
        f.write('export const MEGUMI_SUMMON_ANIM = ' + json.dumps(summon, indent=1) + '\n')
    for g in groups:
        keys = [(g, i) for i in range(len(groups[g]))]
    contact(DOC / 'contact_megumi.png', [(g, i) for g in MEGUMI_GROUPS if g not in ('domain',) for i in range(len(groups[g]))], imgs, meta,
            'Megumi body frames (2x, red = feet anchor)', per=16)
    contact(DOC / 'contact_summons.png', [(g, i) for g in SUMMON_GROUPS for i in range(len(groups[g]))], imgs, meta,
            'Summon frames (2x, red = anchor)', per=10)
    contact(DOC / 'contact_large.png', [(g, i) for g in ['elephant', 'mahoraga', 'domain'] for i in range(len(groups[g]))], imgs, meta,
            'Elephant / Mahoraga / Domain frames (1x, red = anchor)', S=1, per=6)
    print(json.dumps(stats), sum(len(r) for r in groups.values()), 'frames;', len(unused), 'unused:', ' '.join(unused))


if __name__ == '__main__':
    main()
