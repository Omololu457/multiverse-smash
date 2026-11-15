#!/usr/bin/env python3
"""Beast Boy — precompute the TEN appearance skins (cosmetic only).

Input: the extracted cells (assets/beast_boy/cells|icons|cutscene, from tools/beast_boy/extract.py), their FORM and
anchors (docs/beast_boy/source_rects.json) and the palette spec tools/beast_boy/skins.json.

Per-pixel REGION classification per cell (never one global colour swap):
  human cells   skin ramp / hair ramp / costume purple / costume grey by exact colour; the shared dark sub-outline
                #182830 is split by a 5×5 neighbour vote into skin / hair / purple / grey dark; eye = a dark pixel
                (#000000 / #004060) 4-adjacent to an eye-white inside the head band, never on the outer outline.
  animal cells  per-animal regions (gorilla fur · tiger body / stripes / muzzle-underside · bird plumage / shadow / beak
                · triceratops body / shadow / under-frill / horn); neutral greys = FX / teeth (never recoloured).
  morph cells   costume colours stay costume (vote-split dark), every green / teal / dark pixel belongs to the ARRIVING
                animal — an explicit per-cell classification (FORM in extract.py), so a human-toned head never turns a
                gorilla's foot flesh-coloured and natural skins never flash green for one frame.
Outlines (#000000) and eye / teeth whites are preserved. Alpha, dimensions, anchors and strip layout are identical to
the default (same ANCHORS, same FW/FH/OX/OY), so geometry / hitboxes / timing cannot differ between skins.

MATERIALS (Alien X stars, Galaxy Glitter sparkle, Opal Safari iridescence) are 4 precomputed overlay phases per strip
(assets/beast_boy/skins/<tag>/mat/p<k>/<action>.png), written ONLY inside approved body pixels (opaque, not outline,
not eye-white, not FX); sparse deterministic hash placement, no RNG.

Usage: python3 tools/beast_boy/build_skins.py
"""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/beast_boy'
DOC = ROOT / 'docs/skins/beast_boy'
SPEC = json.loads((ROOT / 'tools/beast_boy/skins.json').read_text())
RECTS = json.loads((ROOT / 'docs/beast_boy/source_rects.json').read_text())
FR = RECTS['frame']; FW, FH, OX, OY = FR['width'], FR['height'], FR['originX'], FR['originY']
SEQ = RECTS['sequences']
CELLS = {c['name']: c for c in RECTS['cells']}

H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
SKIN = [(184, 248, 200), (64, 248, 144), (0, 168, 104), (0, 96, 80)]
HAIR = [(0, 232, 224), (0, 144, 144), (0, 64, 96)]
PURP = [(224, 0, 184), (136, 0, 120), (72, 8, 80)]
GRAY = [(168, 176, 192), (112, 112, 120)]
DARK = (24, 40, 48)
BLACK, WHITE = (0, 0, 0), (248, 248, 248)
ICON_SKIN = [(232, 248, 104), (160, 240, 32), (96, 184, 16), (56, 144, 8), (32, 104, 0)]
ICON_HAIR = [(0, 248, 104), (0, 184, 72), (0, 128, 56)]
ICON_OUT = (16, 32, 8)
SOURCE_GREENS = set(SKIN + HAIR + ICON_SKIN + ICON_HAIR)   # must not survive in any skin (unless allowGreen)


def eq(a, c): return (a[..., 0] == c[0]) & (a[..., 1] == c[1]) & (a[..., 2] == c[2])


def anyof(a, cs):
    m = np.zeros(a.shape[:2], bool)
    for c in cs: m |= eq(a, c)
    return m


def lerp(c1, c2, u): return tuple(int(round(c1[i] + (c2[i] - c1[i]) * u)) for i in range(3))


def ramp_n(hexes, n):
    """Resample an authored ramp (light→dark) to n shades (for the 5-shade icon ramp)."""
    cs = [H(h) for h in hexes]
    if len(cs) == n: return cs
    return [lerp(cs[int(np.floor(u))], cs[min(len(cs) - 1, int(np.floor(u)) + 1)], u - np.floor(u)) for u in np.linspace(0, len(cs) - 1, n)]


def vote(a, classes):
    """→ index map of the majority class among `classes` (list of bool masks) in a 5×5 window; -1 where none."""
    k = np.ones((5, 5))
    counts = np.stack([ndimage.convolve(m.astype(float), k, mode='constant') for m in classes])
    best = counts.argmax(0); best[counts.max(0) == 0] = -1
    return best


def classify(rgba, form):
    """→ dict region → bool mask for one cell (see module doc)."""
    a = rgba[..., :3]; op = rgba[..., 3] > 0
    R = {}
    animal = form.split('_')[-1] if form != 'human' else None
    if animal == 'tri': animal = 'tricera'
    if form == 'human' or form.startswith('morph'):
        R['purple'] = anyof(a, PURP) & op
        if form == 'human':
            R['skin'] = anyof(a, SKIN) & op; R['hair'] = anyof(a, HAIR) & op; R['gray'] = anyof(a, GRAY) & op
        else:
            R['gray'] = anyof(a, GRAY) & op
        dark = eq(a, DARK) & op
        if form == 'human':
            v = vote(a, [R['skin'], R['hair'], R['purple'], R['gray']])
            R['dskin'] = dark & (v == 0); R['dhair'] = dark & (v == 1); R['dpurple'] = dark & (v == 2); R['dgray'] = dark & ((v == 3) | (v == -1))
            # EYES: small 4-connected blobs of {eye-white, iris colours} that contain an eye-white and sit below the
            # top skin row (inside the face). Sprites draw the iris with the hair teal, the bust with greys / dark.
            iris_cols = HAIR + GRAY + [DARK]
            blobm = (eq(a, WHITE) | anyof(a, iris_cols)) & op
            lab, nlab = ndimage.label(blobm)
            sk_rows = np.where(R['skin'].any(1))[0]
            top = sk_rows.min() if len(sk_rows) else 0
            eye = np.zeros_like(op)
            for i, sl in enumerate(ndimage.find_objects(lab)):
                comp = lab[sl] == i + 1; n = int(comp.sum())
                if n > 60 or not (eq(a[sl], WHITE) & comp).any() or sl[0].start < top: continue
                if len(sk_rows) and sl[0].start > top + 0.5 * (sk_rows.max() - top): continue   # fang / mouth whites are not eyes
                ring = ndimage.binary_dilation(comp, iterations=1) & ~comp
                if (R['skin'][sl] & ring).sum() < 2: continue          # must be embedded in the face
                wy, wx = np.where(eq(a[sl], WHITE) & comp)                 # clip to the eye-white's own box (+1 px): a
                box = np.zeros_like(comp); box[max(0, wy.min() - 1):wy.max() + 2, max(0, wx.min() - 1):wx.max() + 2] = True
                eye[sl] |= comp & box & ~eq(a[sl], WHITE)                   # connected cheek shadow is NOT iris
            R['eye'] = eye
            for k in ('hair', 'gray', 'dskin', 'dhair', 'dpurple', 'dgray'): R[k] &= ~eye
        else:
            body = anyof(a, SKIN + HAIR) & op
            v = vote(a, [body, R['purple'] | R['gray']])
            R['dpurple'] = dark & (v == 1) & ndimage.binary_dilation(R['purple'], iterations=2)
            R['dgray'] = dark & (v == 1) & ~R['dpurple']
            dark = dark & ~(R['dpurple'] | R['dgray'])
    if animal:
        g = [eq(a, c) & op for c in SKIN]; t = [eq(a, c) & op for c in HAIR]
        d = (eq(a, DARK) & op) if form != 'human' else None
        if form.startswith('morph'): d = dark
        if animal == 'gorilla':
            R['fur0'] = g[0] | g[1] | t[0]; R['fur1'] = g[2] | t[1]; R['fur2'] = g[3] | t[2]; R['fur3'] = d
            if form == 'gorilla': R['fx'] = anyof(a, GRAY) & op            # teeth / eye glints
        elif animal == 'tiger':
            R['body0'] = g[0]; R['body1'] = g[1]; R['body2'] = g[2]; R['body3'] = g[3]; R['stripe'] = d
            R['muzzle0'] = t[0]; R['muzzle1'] = t[1]; R['muzzle2'] = t[2]
            if form == 'tiger': R['fx'] = anyof(a, GRAY) & op              # slash arcs / claws: neutral FX
        elif animal == 'bird':
            R['plum0'] = t[0]; R['plum1'] = t[1]; R['plum2'] = t[2]; R['shadow'] = d
            R['beak0'] = g[0]; R['beak1'] = g[1]; R['beak2'] = g[2]; R['beak3'] = g[3]
            if form == 'bird': R['fx'] = anyof(a, GRAY) & op
        elif animal == 'tricera':
            R['body0'] = g[0]; R['body1'] = g[1] | t[0]; R['body2'] = g[2] | t[1]; R['body3'] = g[3]
            R['shadow'] = d; R['under'] = t[2]; R['horn'] = eq(a, WHITE) & op
            if form == 'tri': R['fx'] = anyof(a, GRAY) & op
    return R


def targets(sk, form):
    """region → target RGB (None = keep source)."""
    hm = sk['human']; T = {}
    def put(k, v): T[k] = H(v) if isinstance(v, str) else v
    if hm['skin']:
        for i in range(4): put(f'_skin{i}', hm['skin'][i])
    animal = form.split('_')[-1] if form != 'human' else None
    if animal == 'tri': animal = 'tricera'
    T['purple'] = [H(x) for x in hm['purple']] if hm['purple'] else None
    T['gray'] = [H(x) for x in hm['gray']] if hm['gray'] else None
    T['skin'] = [H(x) for x in hm['skin']]; T['hair'] = [H(x) for x in hm['hair']]
    for k in ('skin', 'hair', 'purple', 'gray'):
        v = hm['dark'][k]; T['d' + k] = H(v) if v else None
    T['eye'] = H(hm['eye']) if hm['eye'] else None
    if animal == 'gorilla':
        for i, c in enumerate(sk['gorilla']['fur']): T[f'fur{i}'] = H(c)
    elif animal == 'tiger':
        tg = sk['tiger']
        for i, c in enumerate(tg['body']): T[f'body{i}'] = H(c)
        T['stripe'] = H(tg['stripe'])
        for i, c in enumerate(tg['muzzle']): T[f'muzzle{i}'] = H(c)
    elif animal == 'bird':
        b = sk['bird']
        for i, c in enumerate(b['plumage']): T[f'plum{i}'] = H(c)
        T['shadow'] = H(b['shadow'])
        for i, c in enumerate(b['beak']): T[f'beak{i}'] = H(c)
    elif animal == 'tricera':
        tr = sk['tricera']
        for i, c in enumerate(tr['body']): T[f'body{i}'] = H(c)
        T['shadow'] = H(tr['shadow']); T['under'] = H(tr['under']); T['horn'] = H(tr['horn'])
    return T


def recolor(rgba, form, sk):
    out = rgba.copy(); a = rgba[..., :3]
    R = classify(rgba, form); T = targets(sk, form)
    counts = {}
    for k, m in R.items():
        if not m.any(): continue
        counts[k] = int(m.sum())
        if k in ('skin', 'hair', 'purple', 'gray'):
            src = {'skin': SKIN, 'hair': HAIR, 'purple': PURP, 'gray': GRAY}[k]; tgt = T[k]
            if not tgt: continue
            for i, c in enumerate(src): out[m & eq(a, c), :3] = tgt[i]
        elif k == 'fx': continue
        elif k == 'eye':
            if T['eye'] is None:   # no authored iris colour: the teal iris follows the hair ramp (as in the default art)
                for i, c in enumerate(HAIR): out[m & eq(a, c), :3] = T['hair'][i]
                continue
            lightm = m & anyof(a, [HAIR[0], GRAY[0]]); out[m, :3] = tuple(int(v * 0.55) for v in T['eye']); out[lightm, :3] = T['eye']
        elif T.get(k) is not None: out[m, :3] = T[k]
    return out, counts


def recolor_icon(rgba, sk):
    out = rgba.copy(); a = rgba[..., :3]
    sr = ramp_n(sk['human']['skin'], 5); hr = ramp_n(sk['human']['hair'], 3)
    for i, c in enumerate(ICON_SKIN): out[eq(a, c), :3] = sr[i]
    for i, c in enumerate(ICON_HAIR): out[eq(a, c), :3] = hr[i]
    dk = H(sk['human']['dark']['skin']); out[eq(a, ICON_OUT), :3] = tuple(v // 2 for v in dk)
    return out


def body_mask(rgba):
    a = rgba[..., :3]; op = rgba[..., 3] > 0
    m = op & ~eq(a, BLACK) & ~eq(a, WHITE) & ~anyof(a, [(168, 176, 192), (112, 112, 120), (192, 192, 192)])
    return m & ~ndimage.binary_dilation(~op, structure=np.ones((3, 3)))     # inset 1 px: never on the silhouette rim


def h32(*v):
    x = 2166136261
    for n in v: x = ((x ^ (n & 0xffffffff)) * 16777619) & 0xffffffff
    return x


def material(strip_rgba, frames, mat, k, action):
    """One precomputed phase overlay for a strip (RGBA, same size)."""
    out = np.zeros_like(strip_rgba)
    cols = [H(c) for c in mat['colors']]
    for fi in range(frames):
        cell = strip_rgba[:, fi * FW:(fi + 1) * FW]; bm = body_mask(cell)
        ys, xs = np.where(bm)
        if mat['kind'] == 'iridescent':
            a = cell[..., :3].astype(int); lum = a.sum(-1)
            light = bm & (lum > 420)
            band = ((np.arange(FW)[None, :] + np.arange(FH)[:, None]) // 6) % 3
            for ci in range(3):
                m = light & (band == ci)
                out[:, fi * FW:(fi + 1) * FW][m] = (*cols[ci], 255)
            continue
        dens = mat['density']
        for y, x in zip(ys, xs):
            hv = h32(x, y, fi, len(action))
            if hv % dens: continue
            if (hv >> 8) % 4 != k and (hv >> 10) % 4 != k: continue     # each speck lives in 2 of 4 phases → slow twinkle
            c = cols[(hv >> 12) % len(cols)]
            out[y, fi * FW + x] = (*c, 255)
            if mat['kind'] == 'glitter' and (hv >> 16) % 5 == 0:          # a rare 3 px cross, still clipped to the body
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < FH and 0 <= xx < FW and bm[yy, xx]: out[yy, fi * FW + xx] = (*cols[1], 200)
    return out


def load(sub, name): return np.array(Image.open(A / sub / f'{name}.png').convert('RGBA'))


def main():
    DOC.mkdir(parents=True, exist_ok=True)
    audit, table = {}, []
    for sk in SPEC['skins']:
        tag = sk['tag']; base = A / 'skins' / tag
        for d in ['', 'icons', 'cutscene']: (base / d).mkdir(parents=True, exist_ok=True)
        cells = {}; regions = {}
        for n, c in CELLS.items():
            if c['kind'] != 'body': continue
            out, cnt = recolor(load('cells', n), c['form'], sk); cells[n] = out
            for k, v in cnt.items(): regions.setdefault(c['form'], {}).setdefault(k, 0); regions[c['form']][k] += v
        # strips: identical anchors / layout to extract.py
        left_green = 0
        for action, ns in SEQ.items():
            strip = np.zeros((FH, FW * len(ns), 4), np.uint8)
            for i, n in enumerate(ns):
                ax, ay = CELLS[n]['anchor']; px, py = OX - ax, OY - ay; im = cells[n]; h, w = im.shape[:2]
                region = strip[py:py + h, FW * i + px:FW * i + px + w]; m = im[..., 3] > 0; region[m] = im[m]
            src = np.array(Image.open(A / f'{action}.png').convert('RGBA'))
            assert (src[..., 3] > 0).sum() == (strip[..., 3] > 0).sum() and ((src[..., 3] > 0) == (strip[..., 3] > 0)).all(), ('alpha mismatch', tag, action)
            if not sk.get('allowGreen'): left_green += int((anyof(strip[..., :3], SOURCE_GREENS) & (strip[..., 3] > 0)).sum())
            Image.fromarray(strip, 'RGBA').save(base / f'{action}.png')
            if sk['material']:
                for k in range(4 if sk['material']['kind'] != 'iridescent' else 1):
                    (base / 'mat' / f'p{k}').mkdir(parents=True, exist_ok=True)
                    Image.fromarray(material(strip, len(ns), sk['material'], k, action), 'RGBA').save(base / 'mat' / f'p{k}' / f'{action}.png')
        assert left_green == 0, ('source green survived', tag, left_green)
        # cutscene bust + overlays + portrait (human mapping), icons (icon mapping)
        for n in ['bust', 'eye0', 'eye1', 'eye2', 'eye3', 'mouth0', 'mouth1', 'mouth2']:
            out, _ = recolor(load('cutscene', n), 'human', sk); Image.fromarray(out, 'RGBA').save(base / 'cutscene' / f'{n}.png')
        por, _ = recolor(np.array(Image.open(A / 'portrait.png').convert('RGBA')), 'human', sk); Image.fromarray(por, 'RGBA').save(base / 'portrait.png')
        ic = recolor_icon(np.array(Image.open(A / 'icons/expressions.png').convert('RGBA')), sk); Image.fromarray(ic, 'RGBA').save(base / 'icons/expressions.png')
        audit[tag] = {'regions': regions, 'sourceGreenLeft': left_green, 'material': sk['material']['kind'] if sk['material'] else None}
        table.append({k: sk[k] for k in ('id', 'tag', 'name', 'classification', 'inspiration', 'refs', 'crossover', 'hud', 'material')})
    (DOC / 'region_mapping.json').write_text(json.dumps(audit, indent=1) + '\n')
    js = ('// Generated by tools/beast_boy/build_skins.py from tools/beast_boy/skins.json — do not hand-edit.\n'
          'export const BEAST_BOY_SKIN_TABLE = ' + json.dumps(table, indent=1, ensure_ascii=False) + '\n')
    (ROOT / 'beastBoySkinTable.js').write_text(js)
    (ROOT / 'tools/beast_boy/source_greens.json').write_text(json.dumps(sorted([list(map(int, c)) for c in SOURCE_GREENS])) + '\n')   # read by harness/beast_boy_skins.test.mjs
    contact()
    print(json.dumps({t: {'greenLeft': v['sourceGreenLeft'], 'material': v['material']} for t, v in audit.items()}, indent=1))


def contact():
    """Default + TEN alternatives × human idle, portrait, gorilla, bird, tiger, triceratops, mid-morph ×2, hurt, defeat."""
    cols = [('idle', 0, 'idle'), ('portrait', None, 'portrait'), ('gorilla', 6, 'gorilla'), ('bird', 9, 'bird'), ('tiger', 9, 'tiger'),
            ('tricera', 6, 'triceratops'), ('gorilla', 2, 'morph->gorilla'), ('tiger', 12, 'morph->human'), ('hurt', 2, 'hurt'), ('lose', 5, 'defeat')]
    S, cw, ch = 2, 150, 120
    rows = [('default', 'Default')] + [(s['tag'], s['name']) for s in SPEC['skins']]
    img = Image.new('RGB', (110 + cw * len(cols), 24 + ch * len(rows)), (36, 40, 48)); d = ImageDraw.Draw(img)
    for j, (_, _, lab) in enumerate(cols): d.text((110 + j * cw + 4, 6), lab, fill='white')
    for r, (tag, name) in enumerate(rows):
        y = 24 + r * ch; d.text((4, y + ch // 2 - 6), name, fill='white')
        base = A if tag == 'default' else A / 'skins' / tag
        for j, (act, fi, _) in enumerate(cols):
            if act == 'portrait': im = Image.open(base / 'portrait.png').convert('RGBA'); cell = im.resize((96, 96), Image.Resampling.NEAREST)
            else:
                st = Image.open(base / f'{act}.png').convert('RGBA'); c = st.crop((fi * FW + OX - 75 // 1 * 1 - 0, 0, fi * FW + OX + 75, FH))
                bb = c.getbbox() or (0, 0, 1, 1); c = c.crop((0, max(0, bb[1] - 2), c.width, OY + 2))
                sc = min(S, (ch - 8) / c.height, (cw - 6) / c.width); cell = c.resize((max(1, int(c.width * sc)), max(1, int(c.height * sc))), Image.Resampling.NEAREST)
            bg = Image.new('RGB', (cw - 4, ch - 4), (88, 104, 130) if (r + j) % 2 else (64, 76, 96))
            bg.paste(cell, ((bg.width - cell.width) // 2, bg.height - cell.height - 2), cell); img.paste(bg, (110 + j * cw, y))
    img.save(DOC / 'skins_contact.png')


if __name__ == '__main__':
    main()
