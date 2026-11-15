#!/usr/bin/env python3
"""Starfire (Koriand'r): Teen Titans GBA sheet extraction + per-frame EYE BOXES.

SOURCE IS READ-ONLY. "Game Boy Advance - Teen Titans - Playable Characters - Starfire.png" is 652x1375 RGB; its sha256
is asserted below and the file is never written.

BACKGROUND POLICY
- Only the opaque key colour RGB(84,109,142) is removed, by exact match (no tolerance), including key pixels enclosed by
  art (the GBA transparent index seen through gaps between arms / legs / hair). Nothing else is made transparent: black
  outlines, purple / blue costume, pale highlights, the green energy rings and the stripe-dissolve pixels are all kept.
- Nearest-neighbour only.

LABELS / DIVIDERS / CREDIT
- Labels are pure-black text. A black-only component is text only if it lies inside a pinned label rectangle (LABELS).
- The two 1-px vertical lines in the Energy Exploding row are sheet DIVIDERS (recorded, not drawn).
- The "Brought to you by… Mr. C — Credit? No / Permission? No" panel is excluded from animation (saved for credits).
- Every other component is assigned to exactly one frame (asserted).

FRAMES are unions of 8-connected components assigned by explicit per-band x-partitions measured from the pixels
(component bounding boxes; the Punch 1 / Punch 2 energy RINGS sit in the gap after their fist, so those cuts are placed
after the ring, not at the gap midpoint).

EYE BOXES (docs/starfire/EYE_ANCHORS.md)
- Starfire's eyes use three palette entries that the energy-ball art never uses: iris (32,232,0), shade (0,88,24),
  highlight (152,248,112). The collar / gauntlet gems reuse them, so detection takes eye-palette pixels that touch
  skin, clusters them, and keeps the TOPMOST cluster row (eyes sit above the collar gem; the gauntlet gems touch the
  blue gauntlet, not skin). Two clusters separated by a non-eye column = two eyes; one = a single visible eye.
- EYE_FIX pins the result for frames checked by hand on the enlarged contact sheet; EYE_STATE records frames where no
  eye is visible and why. A frame with no validated eye can never emit a beam.

Usage: python3 tools/starfire/extract.py
"""
from pathlib import Path
import hashlib, json, re
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Game Boy Advance - Teen Titans - Playable Characters - Starfire.png'
SHA = '89fbcd7483752e6a7b8f9923f0123ce14e2ebf12b3ce741ef96448313c80cad2'
OUT = ROOT / 'assets/starfire'
DOC = ROOT / 'docs/starfire'
KEY = (84, 109, 142)
FW, FH, OX, OY = 112, 104, 56, 92          # body strip cell; feet origin at (OX, OY)

LABELS = {
    'Appearing': (88, 2, 140, 12), 'Idle': (351, 69, 371, 78), 'Walking': (387, 136, 426, 146), 'Jumping': (397, 205, 439, 215),
    'Landing': (187, 289, 226, 299), 'Punch 1': (502, 354, 542, 364), 'Punch 2': (307, 421, 348, 431),
    'Shooting Energy Ball': (363, 483, 467, 493), 'Shooting Ball (Midair)': (357, 548, 423, 572),
    'Preparing to Levitate': (190, 618, 295, 629), 'Levitating': (558, 687, 608, 697), 'Shooting Laser': (403, 762, 479, 772),
    'Hurt': (253, 835, 276, 845), 'Defeated': (607, 894, 652, 904), 'Energy Ball': (18, 961, 75, 971),
    'Energy Exploding': (458, 982, 545, 993), 'Laser': (51, 1021, 80, 1031), 'Health Icon': (163, 1039, 222, 1049),
    'Cutscenes': (67, 1254, 121, 1264),
}
DIVIDERS = [(365, 981), (412, 981)]
CREDIT = (483, 1234)

def cuts(xs, end): return list(xs) + [end]
BANDS = [   # (prefix, y0, y1 (component-centre band), x cut points)
    ('appear', 0, 68, cuts([0, 24, 53], 86)),
    ('idle', 68, 135, cuts([0, 25, 53, 82, 111, 141, 172, 202, 233, 264, 294, 322], 350)),
    ('walk', 135, 204, cuts([0, 37, 69, 93, 117, 150, 188, 224, 258, 288, 315, 353], 400)),
    ('jump', 204, 287, cuts([0, 38, 77, 111, 145, 184, 229, 288, 347], 410)),
    ('land', 287, 352, cuts([0, 51, 87, 122, 154], 186)),
    ('pa', 352, 418, cuts([0, 29, 71, 115, 160, 202, 266, 330, 397, 466], 500)),
    ('pb', 418, 483, cuts([0, 37, 79, 140, 201, 265], 306)),
    ('shot', 483, 547, cuts([0, 57, 116, 172, 226, 279, 326], 360)),
    ('ashot', 547, 616, cuts([0, 57, 116, 172, 225, 278, 322], 356)),
    ('levb', 616, 687, cuts([0, 37, 83, 142], 190)),
    ('lev', 687, 759, cuts([0, 44, 92, 138, 186, 232, 280, 326, 374, 420, 468, 514], 562)),
    ('laser', 759, 826, cuts([0, 29, 63, 100, 134, 171, 210, 251, 292, 322, 345, 371], 402)),
    ('hurt', 826, 897, cuts([0, 39, 90, 139, 185, 222], 252)),
    ('def', 897, 960, cuts([0, 29, 60, 92, 124, 157, 190, 223, 256, 289, 322, 354, 386, 417, 448, 479, 510, 541, 572], 606)),
    ('ball', 960, 979, cuts([0], 17)),
    ('ex', 979, 1019, cuts([0, 25, 57, 92, 132, 175, 222, 270, 318, 365, 412], 465)),
    ('lz', 1019, 1040, cuts([0, 11], 50)),
]
FX_PREFIX = ('ball', 'ex', 'lz')

EYE_RGB = [(32, 232, 0), (0, 88, 24), (152, 248, 112)]
SKIN_RGB = [(240, 168, 128), (240, 248, 224)]
# Manual eye verification results (frame-local source pixels, inclusive rects [x, y, w, h]). Filled from the
# enlarged review sheet docs/starfire/eye_boxes_contact.png; see EYE_ANCHORS.md for each entry's reason.
EYE_FIX = {}
# Frames without a usable eye: state + reason. These frames can never emit a beam.
EYE_STATE = {
    'appear0': ('dissolve', 'Appearing stripe-materialise frame: face not yet formed'),
    'appear1': ('dissolve', 'Appearing: face still broken into stripes; eye pixels are noise'),
    'appear2': ('dissolve', 'Appearing: last materialise frame; face mottled, eyes not reliably formed'),
    'hurt0': ('hidden', 'Hurt recoil: head thrown back into shadow, no eye visible'),
    'hurt1': ('silhouette', 'Hurt flash: solid white silhouette'),
    'hurt2': ('closed', 'Hurt: eyes squeezed shut (black lid lines); the green pixel found by detection is the wrist gem'),
    'def16': ('dissolve', 'Defeated: stripe dissolve begins over the face'),
    'def17': ('dissolve', 'Defeated: stripe dissolve'),
    'def18': ('dissolve', 'Defeated: final stripe dissolve'),
}
EMIT_STATES = ('open', 'profile')


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def components():
    im = Image.open(SRC); assert im.size == (652, 1375) and im.mode == 'RGB', (im.size, im.mode)
    a = np.array(im); fg = ~(a == KEY).all(-1)
    lab, n = ndimage.label(fg, structure=np.ones((3, 3))); black = (a == 0).all(-1)
    comps = []
    for i, (ys, xs) in enumerate(ndimage.find_objects(lab)):
        m = lab[ys, xs] == i + 1
        comps.append(dict(id=i + 1, x=xs.start, y=ys.start, w=xs.stop - xs.start, h=ys.stop - ys.start, n=int(m.sum()),
                          black=bool((black[ys, xs] & m).sum() == m.sum())))
    return im, a, lab, comps


def inside(c, r, pad=1):
    return c['x'] >= r[0] - pad and c['y'] >= r[1] - pad and c['x'] + c['w'] <= r[2] + pad + 1 and c['y'] + c['h'] <= r[3] + pad + 1


def assign(comps):
    text, divs, frames = [], [], {}
    for c in comps:
        if c['black'] and any(inside(c, r) for r in LABELS.values()): text.append(c['id']); c['role'] = 'text'; continue
        if c['black'] and c['w'] == 1 and c['h'] >= 30 and (c['x'], c['y']) in DIVIDERS: divs.append(c['id']); c['role'] = 'divider'; continue
        if (c['x'], c['y']) == CREDIT: c['role'] = 'credit'; continue
        cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
        name = None
        if 1040 <= c['y'] < 1252 and c['x'] < 165:                        # Health Icon grid (6 / 4 / 4 / 4, then 2 dazed + 1 down)
            if c['y'] < 1180: name = 'icon_r%d_c%d' % ((c['y'] - 1040) // 35, (c['x'] - 1) // 27)
            elif c['y'] < 1218: name = 'icon_daze%d' % (0 if cx < 36 else 1)
            else: name = 'icon_down'
        elif c['y'] >= 1252 and c['x'] < 160:                             # cutscene bust + mouth / eye overlays
            if c['h'] > 60: name = 'bust'
            elif c['y'] < 1358: name = 'mouth%d' % ((c['x'] - 1) // 31)
            else: name = 'eye%d' % (0 if c['x'] < 32 else 1)
        else:
            for pre, y0, y1, xs in BANDS:
                if not (y0 <= cy < y1): continue
                if pre == 'ball' and c['x'] > 17: continue
                for k in range(len(xs) - 1):
                    if xs[k] <= cx < xs[k + 1]: name = '%s%d' % (pre, k); break
                if name: break
        assert name, ('unassigned component', c)
        c['role'] = name; frames.setdefault(name, []).append(c['id'])
    return frames, text, divs


def cut_frame(a, lab, ids):
    m = np.isin(lab, ids); ys, xs = np.where(m)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); rgba[..., :3] = a[y0:y1, x0:x1]; rgba[..., 3] = np.where(m[y0:y1, x0:x1], 255, 0)
    return rgba, [x0, y0, x1 - x0, y1 - y0], m[y0:y1, x0:x1]


PURPLE = [(120, 48, 200), (56, 0, 152), (184, 128, 232)]
def body_anchor(name, rgba, mask, rect, ground):
    """→ [x, y] frame-local. y: the band's sheet ground line (every band is authored on one). x: the median column of
    her purple costume pixels (top / skirt / boots) — the body core; flying hair, extended arms and energy never shift it.
    Dissolve / silhouette frames with no costume colour use the opaque-pixel median."""
    pre = re.match(r'[a-z]+', name).group(0)
    rgb = rgba[..., :3]; op = rgba[..., 3] > 0
    pm = np.zeros(op.shape, bool)
    for c in PURPLE: pm |= (rgb == c).all(-1)
    pm &= op
    xs = np.where(pm)[1] if pm.sum() > 40 else np.where(op)[1]
    return [int(round(float(np.median(xs)))), int(ground[pre] - rect[1])]


def detect_eyes(rgba):
    """→ list of eye dicts (frame-local source pixels) or [] — see module docstring."""
    rgb = rgba[..., :3]; op = rgba[..., 3] > 0
    eye = np.zeros(op.shape, bool)
    for c in EYE_RGB: eye |= (rgb == c).all(-1)
    eye &= op
    skin = np.zeros(op.shape, bool)
    for c in SKIN_RGB: skin |= (rgb == c).all(-1)
    near_skin = ndimage.binary_dilation(skin, structure=np.ones((3, 3)))
    lab, n = ndimage.label(eye, structure=np.ones((3, 3)))
    cl = []
    for i in range(1, n + 1):
        m = lab == i
        if not (m & near_skin).any() or m.sum() > 16: continue
        ys, xs = np.where(m); cl.append(dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()), n=int(m.sum())))
    if not cl: return []
    top = min(c['y0'] for c in cl)
    row = [c for c in cl if c['y0'] <= top + 3]
    # merge clusters closer than 2 px (iris + highlight of ONE eye split by a dark pixel)
    row.sort(key=lambda c: c['x0']); merged = []
    for c in row:
        if merged and c['x0'] - merged[-1]['x1'] <= 2 and abs(c['y0'] - merged[-1]['y0']) <= 2:
            m = merged[-1]; m.update(x0=min(m['x0'], c['x0']), x1=max(m['x1'], c['x1']), y0=min(m['y0'], c['y0']), y1=max(m['y1'], c['y1']), n=m['n'] + c['n'])
        else: merged.append(dict(c))
    merged = merged[:2]
    out = []
    for c in merged:
        out.append({'rect': [c['x0'], c['y0'], c['x1'] - c['x0'] + 1, c['y1'] - c['y0'] + 1], 'px': c['n']})
    return out


def eye_record(name, rgba):
    """Final per-frame eye record: {state, eyes:[{side, rect, origin, visible}], dir, source}."""
    if name in EYE_STATE: return {'state': EYE_STATE[name][0], 'eyes': [], 'reason': EYE_STATE[name][1], 'source': 'manual'}
    if name in EYE_FIX:
        eyes, src = [{'rect': r, 'px': None} for r in EYE_FIX[name]], 'manual'
    else:
        eyes, src = detect_eyes(rgba), 'detected'
    if not eyes: return {'state': 'none', 'eyes': [], 'reason': 'no eye-palette pixels touching skin (unreviewed)', 'source': src}
    rec = []
    eyes = sorted(eyes, key=lambda e: e['rect'][0])
    for i, e in enumerate(eyes):
        x, y, w, h = e['rect']
        # Her face is authored 3/4 toward +x: the LEFT box is the viewer-near eye (wider), the RIGHT box is the
        # foreshortened front eye. Profile frames show one eye.
        side = ('back' if i == 0 else 'front') if len(eyes) == 2 else 'single'
        # beam origin: the FRONT edge (authored facing right → max x) at the eye's vertical centre, pixel-centre coords
        rec.append({'side': side, 'rect': [x, y, w, h], 'origin': [x + w - 0.5, y + (h - 1) / 2 + 0.5], 'visible': True})
    return {'state': 'open' if len(rec) == 2 else 'profile', 'eyes': rec, 'dir': [1, 0], 'source': src}


R = lambda pre, *ks: [f'{pre}{k}' for k in ks]
SEQ = {
    'intro': R('appear', 0, 1, 2) + R('levb', 0, 1, 2, 3) + R('lev', 0, 1, 2, 3, 4, 5) + R('land', 2, 3, 4),   # materialise → lift → hover → settle
    'idle': R('idle', *range(12)),
    'walk': R('walk', *range(12)),
    'walk_back': R('walk', *range(11, -1, -1)),
    'run': R('walk', *range(12)),
    'dash': R('walk', 4, 5, 6, 7),
    'jump': R('jump', 0, 1, 2, 3, 4),
    'fall': R('jump', 5, 6, 7, 8),
    'doubleJump': R('jump', 2, 3, 4, 5),
    'land': R('land', *range(5)),
    'crouch': R('land', 2),
    'guard': R('pb', 0),
    'hurt': R('hurt', *range(6)),
    'knockdown': R('hurt', 0, 1, 2, 3),
    'lose': R('def', *range(19)),
    # normals
    'light': R('pa', 0, 1, 2, 3, 4),                     # J1 Star Jab: Punch 1 opening
    'sfJ2': R('pb', *range(6)),                          # J2 Advancing Strike: Punch 2 complete (energy fist + ring)
    'sfJ3': R('pa', 3, 4, 5, 6, 7, 8, 9),               # J3 Tamaranean Finisher: Punch 1 energy fist + full ring
    'heavy': R('pa', *range(10)),                        # Heavy Starfist: Punch 1 complete
    'sfLow': R('land', 0, 1, 2, 3),                      # Low Sweep: the deep landing crouch (no kick art exists)
    'up': R('levb', 0, 1, 2, 3),                         # Launcher Rising Glow: Preparing to Levitate (arms rise)
    'air': R('pb', 1, 2, 3, 4),                          # Air Strike: Punch 2 thrust
    # specials
    'sfBolt': R('shot', *range(7)),                      # STARBOLT: full Shooting Energy Ball
    'sfComet': R('ashot', *range(7)),                    # COMET SHOT: full Shooting Ball (Midair)
    'sfRush': R('walk', 4, 5, 6, 7) + R('pa', 4, 5, 6, 7),   # SOLAR RUSH: stride → energy fist
    'sfSky': R('jump', 0, 1, 2, 3, 4) + R('levb', 2, 3),     # SKYBREAK: launch → arms-up burst
    'sfOrb': R('levb', 1, 2, 3) + R('shot', 4, 5, 6),        # ORBITAL STAR: gather → release
    'sfLaser': R('laser', *range(12)),                   # STAR SIGHT: full Shooting Laser
    'sfAirLaser': R('lev', *range(12)),                  # STAR SIGHT (air): Levitating loop (eyes validated per frame)
    'levStart': R('levb', *range(4)),
    'lev': R('lev', *range(12)),
    'levEnd': R('levb', 3, 2, 1) + R('jump', 7, 8),
    # ultimate beats
    'ultOpen': R('shot', *range(7)),
    'ultRise': R('levb', *range(4)),
    'ultHover': R('lev', *range(12)),
    'ultBolt': R('ashot', 2, 3, 4, 5),
    'ultLaser': R('laser', *range(12)),
    'ultLand': R('land', *range(5)),
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard', 'dash', 'lev', 'ultHover'}
SPEED = {'idle': 6, 'walk': 4, 'walk_back': 4, 'run': 3, 'dash': 4, 'jump': 4, 'fall': 6, 'doubleJump': 3, 'land': 3, 'hurt': 4,
         'knockdown': 5, 'lose': 5, 'intro': 6, 'lev': 5, 'levStart': 4, 'levEnd': 4, 'ultHover': 5}


def contact(names, cells, imgs, path, S=3, per=10, title='', eyes=None):
    colw = max(cells[n]['rect'][2] for n in names) * S + 12; rowh = max(cells[n]['rect'][3] for n in names) * S + 30
    rows = (len(names) + per - 1) // per
    img = Image.new('RGB', (per * colw, rows * rowh + 22), (38, 43, 54)); d = ImageDraw.Draw(img); d.text((6, 6), title, fill='white')
    for i, n in enumerate(names):
        x = i % per * colw; y = 22 + i // per * rowh
        im = imgs[n]; big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        bg = Image.new('RGB', big.size, (92, 128, 104) if i % 2 else (72, 92, 128)); bg.paste(big, (0, 0), big)
        img.paste(bg, (x + 3, y + 16))
        if eyes is None:
            d.text((x + 3, y + 2), f'#{i} {n}', fill='white')
            if 'anchor' in cells[n]:
                ax, ay = cells[n]['anchor']; cx, cy = x + 3 + ax * S, y + 16 + ay * S
                d.line([cx - 5, cy, cx + 5, cy], fill=(255, 50, 50)); d.line([cx, cy - 5, cx, cy + 5], fill=(255, 50, 50))
        else:
            e = eyes[n]; tag = {'open': '2 eyes', 'profile': '1 eye (profile)'}.get(e['state'], e['state'].upper() + ' (no beam)')
            d.text((x + 3, y + 2), f'{n} {tag}{"*" if e.get("source") == "manual" else ""}', fill=(255, 255, 255) if e['eyes'] else (255, 140, 140))
            for k in e['eyes']:
                rx, ry, rw, rh = k['rect']; col = (40, 220, 255) if k['side'] == 'back' else (255, 40, 200)
                d.rectangle([x + 3 + rx * S - 1, y + 16 + ry * S - 1, x + 3 + (rx + rw) * S, y + 16 + (ry + rh) * S], outline=col)
                ox, oy = k['origin']; px, py = x + 3 + ox * S, y + 16 + oy * S
                d.ellipse([px - 2, py - 2, px + 2, py + 2], fill=(255, 255, 0)); d.line([px, py, px + 10, py], fill=(255, 255, 0))
    img.save(path)


def main():
    assert sha(SRC) == SHA, 'Starfire sheet hash changed'
    im, a, lab, comps = components()
    frames, text, divs = assign(comps)
    assert len(divs) == 2, len(divs)
    for d in ['cells', 'fx', 'icons', 'cutscene']: (OUT / d).mkdir(parents=True, exist_ok=True)
    DOC.mkdir(parents=True, exist_ok=True)
    imgs, cells, masks, ground = {}, {}, {}, {}
    for name, ids in frames.items():
        rgba, rect, mask = cut_frame(a, lab, ids)
        imgs[name] = Image.fromarray(rgba, 'RGBA'); masks[name] = mask
        kind = 'body'
        if name.startswith(FX_PREFIX): kind = 'fx'
        elif name.startswith('icon'): kind = 'icon'
        elif name == 'bust' or name.startswith(('eye', 'mouth')): kind = 'cutscene'
        cells[name] = dict(name=name, rect=rect, components=len(ids), opaquePixels=int(mask.sum()), kind=kind)
        if kind == 'body':
            p = re.match(r'[a-z]+', name).group(0); ground[p] = max(ground.get(p, 0), rect[1] + rect[3])
    eyes = {}
    for name, c in cells.items():
        if c['kind'] != 'body': continue
        c['anchor'] = body_anchor(name, np.array(imgs[name]), masks[name], c['rect'], ground)
        eyes[name] = eye_record(name, np.array(imgs[name]))
        imgs[name].save(OUT / 'cells' / f'{name}.png')
    for name, c in cells.items():
        if c['kind'] == 'body': continue
        sub = {'fx': 'fx', 'icon': 'icons', 'cutscene': 'cutscene'}[c['kind']]
        imgs[name].save(OUT / sub / f'{name}.png')
    dup = {}
    names = list(cells)
    for i, n in enumerate(names):
        for m in names[:i]:
            if imgs[n].size == imgs[m].size and imgs[n].tobytes() == imgs[m].tobytes(): dup[n] = m; break
    # ── body strips + per-action eye tables in STRIP-CELL coordinates (the exact space sprite.js draws from) ──
    anim, eye_anim = {}, {}
    for action, ns in SEQ.items():
        strip = Image.new('RGBA', (FW * len(ns), FH)); per = []
        for i, n in enumerate(ns):
            ax, ay = cells[n]['anchor']; px, py = OX - ax, OY - ay; w, h = imgs[n].size
            assert px >= 0 and px + w <= FW and py >= 0 and py + h <= FH, ('frame overflow', action, n, px, py, w, h)
            strip.paste(imgs[n], (FW * i + px, py))
            e = eyes[n]
            per.append({'cell': n, 'state': e['state'], 'emit': e['state'] in EMIT_STATES and bool(e['eyes']), 'eyes': [{'side': k['side'], 'rect': [k['rect'][0] + px, k['rect'][1] + py, k['rect'][2], k['rect'][3]],
                                                                   'origin': [k['origin'][0] + px, k['origin'][1] + py]} for k in e['eyes']]})
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/starfire/{action}.png', 'frames': len(ns), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': SPEED.get(action, 4),
                        'frameWidth': FW, 'frameHeight': FH}
        eye_anim[action] = per
    used = {n for v in SEQ.values() for n in v}
    def fx_strip(ns, path, pad=2, align='center'):
        w = max(imgs[n].width for n in ns) + pad * 2; h = max(imgs[n].height for n in ns) + pad * 2
        s = Image.new('RGBA', (w * len(ns), h))
        for i, n in enumerate(ns):
            g = imgs[n]; gy = (h - g.height) // 2 if align == 'center' else h - pad - g.height
            s.paste(g, (w * i + (w - g.width) // 2, gy))
        s.save(path); return {'w': w, 'h': h, 'frames': len(ns), 'sheet': './assets/starfire/fx/' + path.name}
    fx = {}
    fx['ball'] = fx_strip(['ball0'], OUT / 'fx/ball_strip.png')                                     # Energy Ball
    fx['explosion'] = fx_strip([f'ex{k}' for k in range(11)], OUT / 'fx/explosion_strip.png')      # Energy Exploding (11)
    # Laser pieces: two rows (dim / bright variant), each = arrow cap (lz0) + body segment (lz1). Kept 1:1, no padding.
    lz = {}
    for n in ['lz0', 'lz1']:
        g = imgs[n]; arr = np.array(g)
        # split the two rows of this column by transparent gap
        rows = np.where(arr[..., 3].any(1))[0]; gaps = np.where(np.diff(rows) > 1)[0]
        assert len(gaps) == 1, ('laser rows', n, rows)
        r0 = (rows[0], rows[gaps[0]] + 1); r1 = (rows[gaps[0] + 1], rows[-1] + 1)
        for k, (y0, y1) in enumerate([r0, r1]):
            piece = g.crop((0, int(y0), g.width, int(y1))); piece.save(OUT / 'fx' / f'laser_{"cap" if n == "lz0" else "body"}{k}.png')
            lz[f'{"cap" if n == "lz0" else "body"}{k}'] = {'w': piece.width, 'h': piece.height, 'sheet': f'./assets/starfire/fx/laser_{"cap" if n == "lz0" else "body"}{k}.png'}
    fx['laser'] = lz
    # cutscene: bust + overlays placed by exact template match
    bust = np.array(imgs['bust']); overlays = {}
    for n in [k for k in cells if k.startswith(('eye', 'mouth'))]:
        o = np.array(imgs[n]); oh, ow = o.shape[:2]; best = None; m = o[..., 3] > 0
        for y in range(bust.shape[0] - oh + 1):
            for x in range(bust.shape[1] - ow + 1):
                win = bust[y:y + oh, x:x + ow]
                diff = int((win[m][:, :3].astype(int) != o[m][:, :3].astype(int)).any(-1).sum() + (win[m][:, 3] == 0).sum())
                if best is None or diff < best[0]: best = (diff, x, y)
        overlays[n] = {'x': best[1], 'y': best[2], 'w': ow, 'h': oh, 'mismatch': best[0], 'opaque': int(m.sum())}
    por = Image.new('RGBA', (128, 128)); por.paste(imgs['bust'], ((128 - imgs['bust'].width) // 2, 128 - imgs['bust'].height)); por.save(OUT / 'portrait.png')
    im.crop((CREDIT[0], CREDIT[1], 652, 1375)).save(OUT / 'credit_panel.png')
    ICONS = {'calm': [f'icon_r0_c{i}' for i in range(6)], 'focus': [f'icon_r1_c{i}' for i in range(4)],
             'strain': [f'icon_r2_c{i}' for i in range(4)], 'hurt': [f'icon_r3_c{i}' for i in range(4)],
             'daze': ['icon_daze0', 'icon_daze1'], 'down': ['icon_down']}
    for v in ICONS.values():
        for n in v: assert n in cells, ('icon missing', n, sorted(k for k in cells if k.startswith('icon')))
    iw = max(imgs[n].width for v in ICONS.values() for n in v) + 2; ih = max(imgs[n].height for v in ICONS.values() for n in v) + 2
    sheet = Image.new('RGBA', (iw * 6, ih * len(ICONS)))
    for r, k in enumerate(ICONS):
        for i, n in enumerate(ICONS[k]):
            g = imgs[n]; sheet.paste(g, (iw * i + (iw - g.width) // 2, ih * r + (ih - g.height)))
    sheet.save(OUT / 'icons/expressions.png')
    meta = {'icons': {'w': iw, 'h': ih, 'rows': {k: [i, len(v)] for i, (k, v) in enumerate(ICONS.items())}},
            'cutscene': {'bust': {'w': imgs['bust'].width, 'h': imgs['bust'].height}, 'overlays': overlays}}
    (ROOT / 'starfireSprites.js').write_text('// Generated by tools/starfire/extract.py — do not hand-edit.\n'
                                            'export const STARFIRE_ANIM = ' + json.dumps(anim, indent=1) + '\n'
                                            'export const STARFIRE_FX = ' + json.dumps(fx) + '\n'
                                            'export const STARFIRE_ICONS = ' + json.dumps(meta['icons']) + '\n'
                                            'export const STARFIRE_CUTSCENE = ' + json.dumps(meta['cutscene']) + '\n')
    # eye manifest (frame-local per cell + strip-cell per action). Gameplay reads starfireEyes.js only.
    (ROOT / 'starfireEyes.js').write_text('// Generated by tools/starfire/extract.py — do not hand-edit. Per-action, per-frame eye boxes and beam\n'
                                         '// origins in STRIP-CELL pixels (cell 112×104, feet origin 56,92), facing right. See docs/starfire/EYE_ANCHORS.md.\n'
                                         'export const STARFIRE_EYES = ' + json.dumps(eye_anim) + '\n')
    (DOC / 'eye_anchors.json').write_text(json.dumps({'schema': 'frame-local source pixels; rect [x,y,w,h] inclusive; origin = beam start (pixel-centre coords, front edge at the eye centre line); authored facing right',
                                                      'cells': eyes, 'actions': eye_anim}, indent=1) + '\n')
    for n, c in cells.items(): c['usedIn'] = sorted(k for k, v in SEQ.items() if n in v)
    body = [n for n in cells if cells[n]['kind'] == 'body']
    unused = [n for n in body if n not in used]
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': SRC.name, 'sha256': SHA, 'size': [652, 1375], 'mode': 'RGB', 'key': list(KEY),
        'keyPolicy': 'exact RGB(84,109,142) only (also inside enclosed gaps); outlines, costume, highlights and effect pixels kept',
        'labels': LABELS, 'textComponents': len(text), 'dividers': DIVIDERS, 'creditPanel': [CREDIT[0], CREDIT[1], 652 - CREDIT[0], 1375 - CREDIT[1]],
        'credit': 'Brought to you by... Mr. C — Credit? No / Permission? No (panel excluded from animation)',
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY}, 'groundLines': ground,
        'cells': list(cells.values()), 'sequences': SEQ, 'duplicates': dup, 'unusedBodyCells': unused,
        'fx': fx, 'icons': meta['icons'], 'cutscene': meta['cutscene']}, indent=1) + '\n')
    seen = []
    for pre, *_ in BANDS:
        if pre in FX_PREFIX: continue
        seen += sorted([n for n in body if re.fullmatch(pre + r'\d+', n)], key=lambda n: int(re.sub(r'\D', '', n)))
    contact(seen, cells, imgs, DOC / 'contact_sheet.png', S=3, per=12, title='Starfire (starfire) — numbered body cells; red cross = feet / body-core anchor')
    contact(seen, cells, imgs, DOC / 'eye_boxes_contact.png', S=4, per=12, eyes=eyes,
            title='Starfire — EYE BOXES on every full-body frame (cyan = back (viewer-near) eye, magenta = front / single eye, yellow = beam origin + facing; * = hand-verified; red label = no eye)')
    others = [n for n in cells if cells[n]['kind'] != 'body']
    contact(others, cells, imgs, DOC / 'contact_sheet_fx_icons.png', S=3, per=8, title='Starfire — FX (ball / explosion / laser pieces), health icons, cutscene pieces')
    print(json.dumps({'bodyCells': len(body), 'fxIconCut': len(others), 'text': len(text), 'duplicates': dup, 'unused': unused,
                      'overlays': overlays, 'ground': ground,
                      'eyes': {k: sum(1 for e in eyes.values() if e['state'] == k) for k in sorted({e['state'] for e in eyes.values()})},
                      'noEye': [n for n, e in eyes.items() if not e['eyes']]}, indent=1))


if __name__ == '__main__':
    main()
