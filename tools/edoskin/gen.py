#!/usr/bin/env python3
"""tools/edoskin/gen.py — MSV1-EDO: the premade "Edo Tensei" skin (offline, deterministic, re-runnable).

For every ELIGIBLE character (tools/edoskin/eligibility.json) this reads each of its DEFAULT sheets (base art + form /
transformation sheets; never another skin's art) and writes `<sheet>__edo.png` next to it — the naming the existing
recolour-skin system already uses (skins.js recolorSkinAnim / abilities.js retagFormAnim swap `x.png` → `x__edo.png`).
Nothing is recoloured at runtime.

COLOURING ONLY: same size, same frame layout, alpha channel byte-identical, outline + effect pixels byte-identical.

THE LOOK
  * one PALETTE per character, read from its calm frames (idle / walk / run / jump / fall / hurt / guard / crouch …):
      SKIN   = colours the blood builder's skin mask claims (≥ 60 % of their pixels) AND that occur in a frame's FACE box
               (the top skin cluster of the body), so a tan coat or blond hair is never mistaken for skin
      BODY   = every colour of the calm frames (clothes, hair, skin, linework)
      EFFECT = any colour NOT in BODY (fire, chakra, lightning, beams baked into attack frames) → left untouched
  * SKIN   → ashen ramp by brightness rank: highlight #c9c3b8, mid #a59e92, shadow #7d776d, deepest #57524b
  * OUTLINE (luminance < 40) and bright glow (blood builder's glow rule) → untouched
  * CLOTHES / HAIR (every other BODY colour) → saturation × 0.65, value × 0.90, then a 10 % mix toward a cool grey of the
    same luminance (L, L, 1.08·L): one documented transform for everyone, light-to-dark order preserved within a ramp
  * EYES   → near-white pixels inside the blood map's per-frame EYE BOX → #141214 (iris colours untouched)
  * CRACKS → #3d3933, one pixel wide, from a hash of the CHARACTER ID only, placed relative to the blood map's per-frame
             landmarks (cheek / nose / mouth for the face, fore / upper for bare arms). Drawn only on that character's skin
             pixels (masked / armoured: on non-outline plating), never on outlines, eyes or transparent pixels. A frame
             without the landmark hides the segment (it never slides).

  python3 tools/edoskin/gen.py [--only k1,k2] [--defs defs.json] [--dry]
Writes tools/edoskin/report/<id>.json (per character: palette sizes, crack counts, eyes, sheets written, notes).
"""
import argparse, hashlib, json, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bloodmap'))
import build as BM          # reuse the blood builder's body / skin / face helpers (same pixels, same rules)

RAMP = [(0xc9, 0xc3, 0xb8), (0xa5, 0x9e, 0x92), (0x7d, 0x77, 0x6d), (0x57, 0x52, 0x4b)]   # highlight → deepest
CRACK = (0x3d, 0x39, 0x33)
SCLERA = (0x14, 0x12, 0x14)
OUTLINE_L = 40
NEAR = 24          # RGB distance: an unseen shade this close to a body colour is that colour's sibling, not an effect
CALM = {'idle', 'walk', 'run', 'jump', 'fall', 'hurt', 'guard', 'crouch', 'knockdown', 'getup', 'dash', 'block', 'stance', 'idleAlt'}
SLOTS = BM.SLOTS
FACE_SLOTS = ['cheek', 'nose', 'mouth']
ARM_SLOTS = ['fore', 'upper']
TAG = '__edo'

lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def H(key, *salt):
    h = hashlib.sha256(('edo|' + key + '|' + '|'.join(map(str, salt))).encode()).digest()
    return int.from_bytes(h[:8], 'big')


def clothes(c):
    r, g, b = [x / 255 for x in c]
    mx, mn = max(r, g, b), min(r, g, b)
    v = mx; s = (mx - mn) / mx if mx > 0 else 0
    # hue-preserving scale of saturation: move each channel toward v by the saturation factor
    k = 0.65
    r2, g2, b2 = [v - (v - x) * k for x in (r, g, b)]
    r2, g2, b2 = [x * 0.90 for x in (r2, g2, b2)]
    L = 0.299 * r2 + 0.587 * g2 + 0.114 * b2
    cool = (L, L, min(1.0, L * 1.08))
    out = [x * 0.9 + y * 0.1 for x, y in zip((r2, g2, b2), cool)]
    return tuple(int(round(max(0, min(1, x)) * 255)) for x in out)


def is_glow(c):
    r, g, b = [x / 255 for x in c]
    mx, mn = max(r, g, b), min(r, g, b)
    sat = (mx - mn) / mx if mx > 0 else 0
    return mx > 0.93 and (sat > 0.45 or mn > 0.93)


def near_white(c):
    r, g, b = [x / 255 for x in c]
    mx, mn = max(r, g, b), min(r, g, b)
    return mx > 0.80 and (mx - mn) / max(mx, 1e-6) < 0.18


def load_bloodmap(key):
    p = os.path.join(ROOT, 'data', 'bloodmaps', f'{key}.json')
    return json.load(open(p)) if os.path.exists(p) else None


def frames_for(bm, d):
    if not bm:
        return None
    k = f"{d['sheet']}|{d['sx']}|{d['sy']}|{d['w']}|{d['h']}|{d['n']}"
    ix = bm['index'].get(k)
    return [bm['frames'][i] if i is not None and i >= 0 else None for i in ix] if ix else None


def anchor(fr, slot):
    if not fr:
        return None
    i = SLOTS.index(slot) * 3
    x, y = fr['a'][i], fr['a'][i + 1]
    return None if x < 0 else (x, y)


def crack_plan(key, cls, face_area, arm_ok):
    """the crack layout for a character: [(slot, dx, dy, dir, length)] from a hash of the id only."""
    plan, notes = [], []
    if cls == 'HUMAN':
        n_face = 3 + H(key, 'nf') % 4
        cap = max(0, face_area // 7)                      # fewer where the face is small
        if cap < n_face:
            notes.append(f'face area {face_area}px → {cap} face cracks (wanted {n_face})')
            n_face = cap
        n_arm = (H(key, 'na') % 5) if arm_ok else 0
        if not arm_ok:
            notes.append('no bare forearm skin → 0 arm cracks')
    else:                                                 # MASKED / ARMOURED / ROBOT: sparse cracks on the plating
        n_face, n_arm = 1 + H(key, 'nf') % 2, 0
    dirs = [(0, 1), (1, 1), (-1, 1), (1, 0)]
    for i in range(n_face):
        h = H(key, 'f', i)
        slot = FACE_SLOTS[h % 3] if cls == 'HUMAN' else ['cheek', 'brow'][h % 2]
        plan.append((slot, int((h >> 4) % 5) - 2, int((h >> 8) % 3) - 1 + (1 if slot == 'nose' else 0), dirs[(h >> 12) % 4], 2 + (h >> 16) % 2))
    for i in range(n_arm):
        h = H(key, 'a', i)
        plan.append((ARM_SLOTS[h % 2], int((h >> 4) % 3) - 1, int((h >> 8) % 3) - 1, dirs[(h >> 12) % 3], 2 + (h >> 16) % 2))
    return plan, notes


def analyse_palette(key, cls, defs, ov):
    """skin / body palettes from the calm frames."""
    tot, skn, inface, body, above = {}, {}, set(), set(), {}
    face_area, arm_px = 0, 0
    calm = [d for d in defs if d.get('act') in CALM] or defs[:3]
    for d in calm:
        img = BM.sheet(d['sheet'])
        if img is False or img is None:
            continue
        for i in range(d['n']):
            fr = BM.frame_of(img, d, i)
            if fr is None or fr.size == 0:
                continue
            a = fr[..., 3] > 0
            cols = fr[..., :3][a]
            if not len(cols):
                continue
            packed = (cols[:, 0].astype(np.int64) << 16) | (cols[:, 1].astype(np.int64) << 8) | cols[:, 2]
            for c, n in zip(*np.unique(packed, return_counts=True)):
                tot[int(c)] = tot.get(int(c), 0) + int(n); body.add(int(c))
            sk = BM.skin_mask(fr) & a
            sp = packed[sk[a]]
            for c, n in zip(*np.unique(sp, return_counts=True)):
                skn[int(c)] = skn.get(int(c), 0) + int(n)
            bodym, _ = BM.body_masks(fr)
            if bodym is None:
                continue
            ys, xs = np.nonzero(bodym)
            fb = BM.face_box(bodym, sk, int(ys.min()), int(ys.max() - ys.min() + 1)) if cls == 'HUMAN' else None
            if fb:
                y0, y1, x0, x1, n = fb
                sub = fr[y0:y1 + 1, x0:x1 + 1]; m = sk[y0:y1 + 1, x0:x1 + 1]
                pk = (sub[..., 0].astype(np.int64) << 16) | (sub[..., 1].astype(np.int64) << 8) | sub[..., 2]
                inface.update(int(c) for c in np.unique(pk[m]))
                # HAIR test: skin-mask pixels ABOVE the face box top (fringe, spikes, a blond / orange head of hair)
                if y0 > 0:
                    top_sk = sk[:y0] & a[:y0]
                    tp = (fr[:y0, :, 0].astype(np.int64) << 16) | (fr[:y0, :, 1].astype(np.int64) << 8) | fr[:y0, :, 2]
                    for c, nn in zip(*np.unique(tp[top_sk], return_counts=True)):
                        above[int(c)] = above.get(int(c), 0) + int(nn)
                if d.get('act') == 'idle' and i == 0:
                    face_area = int(m.sum())
            if d.get('act') == 'idle' and i == 0:
                arm_px = int(sk.sum()) - face_area
    skin = {c for c in skn if skn[c] >= 0.6 * tot.get(c, 1) and c in inface and tot[c] >= 2 and above.get(c, 0) < 0.35 * tot[c]}   # mostly above the face = hair
    if cls != 'HUMAN':
        skin = set()
    for c in ov.get('addSkin', []):
        skin.add(int(c.lstrip('#'), 16))
    for c in ov.get('notSkin', []):
        skin.discard(int(c.lstrip('#'), 16))
    for c in ov.get('notBody', []):            # a colour that belongs to an effect even though it shows in a calm frame
        body.discard(int(c.lstrip('#'), 16))
    return skin, body, face_area, arm_px


def build_lut(skin, body):
    unpack = lambda c: ((c >> 16) & 255, (c >> 8) & 255, c & 255)
    lut = {}
    sk = sorted(skin, key=lambda c: -lum(unpack(c)))          # brightest first
    n = len(sk)
    for r, c in enumerate(sk):
        if n == 1: step = 1
        elif n == 2: step = (0, 2)[r]
        elif n == 3: step = (0, 1, 2)[r]
        else: step = min(3, r * 4 // n)
        lut[c] = RAMP[step]
    for c in body:
        if c in lut:
            continue
        rgb = unpack(c)
        if lum(rgb) < OUTLINE_L:
            continue                                            # outline / linework: untouched
        lut[c] = clothes(rgb)
    return lut


def effect_mask(fr, skin=frozenset()):
    """baked-in effects (slash trails, sparks, glows) are drawn WITHOUT the dark outline sprite bodies have: any patch of
    non-outline pixels whose border faces transparency more than it faces linework is an effect → left untouched.
    Skin-coloured and other pixels are tested as separate patches (a trail painted in skin tones off a bare foot)."""
    a = fr[..., 3] > 0
    L = 0.299 * fr[..., 0] + 0.587 * fr[..., 1] + 0.114 * fr[..., 2]
    line = a & (L < OUTLINE_L)
    fill = a & ~line
    pk = (fr[..., 0].astype(np.int64) << 16) | (fr[..., 1].astype(np.int64) << 8) | fr[..., 2]
    isk = np.isin(pk, np.fromiter(skin, np.int64)) if skin else np.zeros_like(a)
    st = ndi.generate_binary_structure(2, 1)
    ring_t = ndi.binary_dilation(~a, structure=st)      # pixels next to transparency
    ring_l = ndi.binary_dilation(line, structure=st)    # pixels next to linework
    out = np.zeros_like(a)
    for part in (fill & isk, fill & ~isk):
        lab, n = ndi.label(part, structure=np.ones((3, 3)))
        if not n:
            continue
        idx = range(1, n + 1)
        t = ndi.sum(part & ring_t, lab, idx); l = ndi.sum(part & ring_l, lab, idx); sz = ndi.sum(part, lab, idx)
        eff = np.zeros(n + 1, bool)
        for i, (tt, ll, zz) in enumerate(zip(t, l, sz), 1):
            eff[i] = tt > 1.5 * ll and zz >= 6
        out |= eff[lab]
    return out


def recolor_sheet(path, lut, defs_here, skin=frozenset()):
    """palette LUT applied ONLY inside each frame's BODY silhouette (blood builder body mask: the main figure and the
    pieces overlapping it). Detached effect pieces (slash trails, projectiles, flashes) stay byte-identical even when
    they share a colour with the body; so do pixels outside every frame rect."""
    img = np.asarray(Image.open(os.path.join(ROOT, path)).convert('RGBA')).copy()
    packed = (img[..., 0].astype(np.int64) << 16) | (img[..., 1].astype(np.int64) << 8) | img[..., 2]
    Hh, Ww = img.shape[:2]
    bodyall = np.zeros((Hh, Ww), bool)
    for d in defs_here:
        for i in range(d['n']):
            x0, y0 = d['sx'] + i * d['w'], d['sy']
            if x0 >= Ww or y0 >= Hh:
                continue
            fr = img[y0:min(Hh, y0 + d['h']), x0:min(Ww, x0 + d['w'])]
            body, _ = BM.body_masks(fr)
            if body is not None:
                bodyall[y0:y0 + body.shape[0], x0:x0 + body.shape[1]] |= body & ~effect_mask(fr, skin)
    m0 = bodyall & (img[..., 3] > 0)
    out = img.copy()
    keys = np.array(list(lut.keys()), np.int64)
    kr = np.stack([(keys >> 16) & 255, (keys >> 8) & 255, keys & 255], -1).astype(np.float32) if len(keys) else None
    for c in np.unique(packed[m0]):
        t = lut.get(int(c))
        if t is None and kr is not None:
            # a shade the calm frames never used (attack sheets often carry their own ramp): take the class of the
            # nearest known body colour if it is close (skin → that colour's ash step, else the clothes transform);
            # anything farther is a genuine effect colour and stays untouched
            rgb = np.array([(c >> 16) & 255, (c >> 8) & 255, c & 255], np.float32)
            dd = np.linalg.norm(kr - rgb, axis=1); j = int(np.argmin(dd))
            if dd[j] <= NEAR and lum(rgb) >= OUTLINE_L:
                t = lut[int(keys[j])] if int(keys[j]) in skin else clothes(tuple(int(v) for v in rgb))
        if t is None:
            continue
        m = m0 & (packed == c)
        out[m, 0], out[m, 1], out[m, 2] = t
    return img, out, bodyall


def paint_frames(key, cls, img, out, defs_here, bm, skin, plan, stats):
    """eyes + cracks, per frame, on the landmarks of that frame (from the blood map)."""
    packed = (img[..., 0].astype(np.int64) << 16) | (img[..., 1].astype(np.int64) << 8) | img[..., 2]
    Hh, Ww = img.shape[:2]
    for d in defs_here:
        frs = frames_for(bm, d)
        if not frs:
            stats['noMap'] += 1
            continue
        for i, fr in enumerate(frs):
            ox, oy = d['sx'] + i * d['w'], d['sy']
            if ox >= Ww or oy >= Hh or fr is None:
                continue
            e = fr.get('e') or [-1, -1, -1, -1]
            in_eye = lambda x, y: e[0] >= 0 and e[0] <= x <= e[2] and e[1] <= y <= e[3]
            # eyes: the SCLERA = small near-white specks (1-4 px each, <= 8 px per frame) inside the eye box, bordered by
            # skin / dark pixels — white hair, face paint, collars or a white mask in the box are larger and stay put
            if cls == 'HUMAN' and e[0] >= 0:
                y0, y1 = max(0, e[1]) + oy, min(d['h'], e[3] + 1) + oy
                x0, x1 = max(0, e[0]) + ox, min(d['w'], e[2] + 1) + ox
                y1, x1 = min(y1, Hh), min(x1, Ww)
                if y1 > y0 and x1 > x0:
                    sub = img[y0:y1, x0:x1]
                    rgb = sub[..., :3].astype(np.float32) / 255
                    mx, mn = rgb.max(-1), rgb.min(-1)
                    wh = (sub[..., 3] > 0) & stats['_body'][y0:y1, x0:x1] & (mx > 0.80) & ((mx - mn) / np.maximum(mx, 1e-6) < 0.18)
                    # the near-white pixels of the WHOLE frame touching this box: a component leaving the box is hair / cloth
                    lab, nn = ndi.label(wh, structure=np.ones((3, 3)))
                    keep = np.zeros_like(wh)
                    for j in range(1, nn + 1):
                        m = lab == j
                        if m.sum() <= 4:
                            keep |= m
                    if 0 < keep.sum() <= 8:
                        o2 = out[y0:y1, x0:x1]; o2[keep, 0], o2[keep, 1], o2[keep, 2] = SCLERA
                        stats['sclera'] += int(keep.sum())
            # cracks
            for (slot, dx, dy, (ux, uy), ln) in plan:
                p = anchor(fr, slot)
                if p is None:
                    stats['hidden'] += 1
                    continue
                for s in range(ln):
                    x, y = p[0] + dx + ux * s, p[1] + dy + uy * s
                    if not (0 <= x < d['w'] and 0 <= y < d['h']) or in_eye(x, y):
                        continue
                    X, Y = ox + x, oy + y
                    if X >= Ww or Y >= Hh or img[Y, X, 3] == 0 or not stats['_body'][Y, X]:
                        continue
                    src = tuple(int(v) for v in img[Y, X, :3])
                    ok = (int(packed[Y, X]) in skin) if cls == 'HUMAN' else (int(packed[Y, X]) in stats['_lut'] and lum(src) >= OUTLINE_L)
                    if ok:
                        out[Y, X, :3] = CRACK; stats['crackPx'] += 1


def char_defs(key, info, elig):
    """the character's default (base + form) defs; never another skin's art, never a tagged recolour."""
    out = []
    for d in info['defs']:
        if d['src'].startswith('skins.js') or d['sheet'].endswith('__edo.png'):
            continue
        if '__' in os.path.basename(d['sheet']) and d['src'] != 'characters.js':
            continue                                  # a tagged FORM sheet is another skin's recolour; a tagged BASE sheet is this character's own default art (rickPrime)
        if key in elig.get('baseOnly', []) and d['src'] != 'characters.js':
            continue
        out.append(d)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only'); ap.add_argument('--defs', default=os.path.join(HERE, 'defs.json')); ap.add_argument('--dry', action='store_true')
    A = ap.parse_args()
    elig = json.load(open(os.path.join(HERE, 'eligibility.json')))
    overrides = json.load(open(os.path.join(HERE, 'overrides.json'))) if os.path.exists(os.path.join(HERE, 'overrides.json')) else {}
    defs = json.load(open(A.defs))
    rep_dir = os.path.join(HERE, 'report'); os.makedirs(rep_dir, exist_ok=True)
    report = {}
    owner = {}
    keys = [k for k, c in elig['classes'].items() if c in ('HUMAN', 'MASKED') and k not in elig.get('exclude', {})]
    if A.only:
        keys = [k for k in keys if k in A.only.split(',')]
    for key in sorted(elig['classes']):                     # a sheet shared by two characters belongs to the first eligible one
        if elig['classes'][key] in ('HUMAN', 'MASKED') and key in defs and key not in elig.get('exclude', {}):
            for d in char_defs(key, defs[key], elig):
                owner.setdefault(d['sheet'], key)
    for key in keys:
        cls = elig['classes'][key]
        ov = overrides.get(key, {})
        ds = char_defs(key, defs[key], elig)
        skin, body, face_area, arm_px = analyse_palette(key, cls, ds, ov)
        lut = build_lut(skin, body)
        plan, notes = crack_plan(key, cls, face_area if cls == 'HUMAN' else 99, arm_px >= 30)
        if 'cracks' in ov:
            plan = [tuple(p[:3]) + (tuple(p[3]), p[4]) for p in ov['cracks']]; notes.append('hand-placed cracks')
        bm = load_bloodmap(key)
        stats = {'sclera': 0, 'crackPx': 0, 'hidden': 0, 'noMap': 0, '_lut': lut}
        by_sheet = {}
        for d in ds:
            if owner.get(d['sheet']) == key:
                by_sheet.setdefault(d['sheet'], []).append(d)
        written = []
        for sh, dd in sorted(by_sheet.items()):
            if not os.path.exists(os.path.join(ROOT, sh)):
                continue
            img, out, bodyall = recolor_sheet(sh, lut, dd, frozenset(skin))
            stats['_body'] = bodyall
            paint_frames(key, cls, img, out, dd, bm, skin, plan, stats)
            assert (out[..., 3] == img[..., 3]).all()
            dst = re.sub(r'\.png$', TAG + '.png', sh)
            if not A.dry:
                Image.fromarray(out, 'RGBA').save(os.path.join(ROOT, dst), optimize=True)
            written.append(dst)
        # select-screen portrait: the same palette idea per image (portraits are larger art with their own colours)
        stats.pop('_lut'); stats.pop('_body', None)
        report[key] = {'class': cls, 'skinColours': len(skin), 'bodyColours': len(body), 'faceArea': face_area,
                       'crackPlan': len(plan), 'faceCracks': sum(1 for p in plan if p[0] in FACE_SLOTS + ['brow']),
                       'armCracks': sum(1 for p in plan if p[0] in ARM_SLOTS), 'sheets': len(written), 'overrides': sorted(ov.keys()),
                       'eyes': 'handled' if stats['sclera'] else 'skipped (no separable whites)', **stats, 'notes': notes}
        print(f"{key:22s} {cls:7s} skin {len(skin):2d} body {len(body):4d} face {face_area:4d} cracks {len(plan)} sheets {len(written):3d} sclera {stats['sclera']:5d} crackPx {stats['crackPx']:6d} {'; '.join(notes)}")
        json.dump(report[key], open(os.path.join(rep_dir, key + '.json'), 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
