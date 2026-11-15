#!/usr/bin/env python3
"""Starfire skins: PRECOMPUTED recolours of the extracted strips (tools/starfire/extract.py output). Cosmetic only.

Region model (the body art uses 15 colours + 1 stray navy pixel):
  outline  (0,0,0)                                        kept
  skin     (240,168,128) (240,248,224)                    NEVER recoloured (face, arms, legs, the white hurt flash)
  hair     (104,8,16) (176,32,40) (208,80,24)              → `hair`
  costume  (56,0,152) (120,48,200) (184,128,232)            → `costume` (top, skirt, sleeves)
  boots    costume pixels within 16 px of each body frame's lowest opaque row → `boots`
  metal    (0,48,152) (72,104,216) (128,168,240) (32,32,112) → `metal` (gauntlets, collar, armband, belt plate)
  eyes     eye-green pixels INSIDE the validated per-frame eye boxes (docs/starfire/eye_anchors.json) → `eyes`
           (geometry fixed: only the three eye tones change; the eye mask is asserted identical per file)
  gem      other eye-green clusters ≤ 12 px touching metal / skin (collar + wrist gems) → `eyes` (canon: gems match eyes)
  energy   the remaining eye-green clusters (energy fists / rings, hand glow in the levitation poses) → `energy`
  laser    on the Shooting Laser glare frames (laser5-7) the blue glare lines over the face → `laser`
FX: Energy Ball → `projectile`, Energy Exploding → `explosion`, Laser cap / body → `laser` (each defaults to `fx`), mapped
by luminance (non-black pixels). Portrait / cut-in bust / overlays / health icons: by colour (all greens → `eyes`;
portrait eyes are mapped separately and never used for gameplay).
Every mapping is by the source ramp's luminance order, so shading, outlines, alpha, dimensions and pivots are preserved.
Asserted per file: skin + outline pixels, alpha and size byte-identical to the source; eye mask unchanged.

Materials (stars / glitter = sparse fixed-integer-hash pixels; iridescent = one luminance-mapped layer) are precomputed
overlay strips assets/starfire/skins/<tag>/mat/p<k>/<strip>.png written only inside the costume mask; starfireFx draws
them with a slow crossfade (static under reduced effects). No RNG, no runtime pixel scans, no per-frame canvases.

Usage: python3 tools/starfire/build_skins.py
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/starfire'
OUTS = A / 'skins'
DOCS = ROOT / 'docs/skins/starfire'
SPEC = json.loads((ROOT / 'tools/starfire/skins.json').read_text())['skins']
META = json.loads((ROOT / 'docs/starfire/source_rects.json').read_text())
EYES = json.loads((ROOT / 'docs/starfire/eye_anchors.json').read_text())['actions']
FW, FH, OX, OY = (META['frame'][k] for k in ('width', 'height', 'originX', 'originY'))
STRIPS = sorted(EYES)
FLAT = ['portrait.png', 'cutscene/bust.png', 'icons/expressions.png'] + [f'cutscene/{n}.png' for n in ['eye0', 'eye1', 'mouth0', 'mouth1', 'mouth2']]
SRC = {'hair': [(104, 8, 16), (176, 32, 40), (208, 80, 24)], 'costume': [(56, 0, 152), (120, 48, 200), (184, 128, 232)],
       'metal': [(32, 32, 112), (0, 48, 152), (72, 104, 216), (128, 168, 240)], 'green': [(0, 88, 24), (32, 232, 0), (152, 248, 112)],
       'skin': [(240, 168, 128), (240, 248, 224)]}
ROLE = {'outline': 0, 'skin': 1, 'hair': 2, 'costume': 3, 'boots': 4, 'metal': 5, 'eyes': 6, 'gem': 7, 'energy': 8, 'laser': 9, 'other': 10}
lum = lambda c: 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]


def is_any(rgb, cols):
    m = np.zeros(rgb.shape[:2], bool)
    for c in cols: m |= (rgb == c).all(-1)
    return m


def classify_colour(rgb, op):
    role = np.full(rgb.shape[:2], ROLE['other'], np.uint8)
    for k in ('hair', 'costume', 'metal', 'skin'): role[is_any(rgb, SRC[k])] = ROLE[k]
    role[is_any(rgb, SRC['green'])] = ROLE['energy']
    role[(rgb == 0).all(-1)] = ROLE['outline']
    role[~op] = ROLE['other']
    return role


def classify_body(rgba, action):
    rgb = rgba[..., :3]; op = rgba[..., 3] > 0; role = classify_colour(rgb, op)
    green = role == ROLE['energy']
    for fi, fr in enumerate(EYES[action]):
        sl = (slice(None), slice(fi * FW, (fi + 1) * FW)); r = role[sl]; g = green[sl]; o = op[sl]
        em = np.zeros(g.shape, bool)
        for e in fr['eyes']:
            x, y, w, h = e['rect']; em[y:y + h, x:x + w] = True
        r[g & em] = ROLE['eyes']
        rest = g & ~em
        lab, n = ndimage.label(rest, structure=np.ones((3, 3)))
        touch = ndimage.binary_dilation((r == ROLE['metal']) | (r == ROLE['skin']), structure=np.ones((3, 3)))
        for i in range(1, n + 1):
            m = lab == i
            if m.sum() <= 12 and (m & touch).any(): r[m] = ROLE['gem']
        if fr['cell'] in ('laser5', 'laser6', 'laser7') and fr['eyes']:
            xs = [e['rect'][0] for e in fr['eyes']] + [e['rect'][0] + e['rect'][2] for e in fr['eyes']]
            ys = [e['rect'][1] for e in fr['eyes']] + [e['rect'][1] + e['rect'][3] for e in fr['eyes']]
            win = np.zeros(g.shape, bool); win[max(0, min(ys) - 14):max(ys) + 10, max(0, min(xs) - 14):max(xs) + 6] = True
            r[win & (r == ROLE['metal'])] = ROLE['laser']
        ys = np.where(o.any(1))[0]
        if len(ys):
            low = np.zeros(g.shape, bool); low[max(0, ys.max() - 15):ys.max() + 1, :] = True
            r[low & (r == ROLE['costume'])] = ROLE['boots']
    return role


def ramp_map(rgb, src, dst):
    """piecewise by luminance: source tone i → destination tone i (exact for palette colours), linear between."""
    s = np.array([lum(np.array(c, float)) for c in src]); d = np.array(dst, float)
    o = np.argsort(s); s = s[o]
    t = np.interp(lum(rgb.astype(float)), s, np.arange(len(s)) * (len(d) - 1) / max(1, len(s) - 1))
    i0 = np.floor(t).astype(int); i1 = np.minimum(i0 + 1, len(d) - 1); u = (t - i0)[..., None]
    return np.round(d[i0] * (1 - u) + d[i1] * u).astype(np.uint8)


def fx_ramp(sk, key):
    c = sk.get(key) or sk['fx']; f0 = np.array(c[0], float)
    return [tuple(np.round(f0 * 0.3)), tuple(np.round(f0 * 0.6)), tuple(f0), tuple(c[1]), tuple(c[2])]
FX_SRC = [(10, 10, 10), (40, 40, 40), (80, 80, 80), (140, 140, 140), (230, 230, 230)]   # luminance anchors


def apply(rgba, role, sk):
    out = rgba.copy(); rgb = rgba[..., :3]
    def put(rk, src, dst):
        m = role == ROLE[rk]
        if m.any(): out[..., :3][m] = ramp_map(rgb[m], src, dst)
    put('hair', SRC['hair'], sk['hair']); put('costume', SRC['costume'], sk['costume'])
    put('boots', SRC['costume'], sk.get('boots') or sk['costume']); put('metal', SRC['metal'][1:], sk['metal'])
    put('eyes', SRC['green'], sk['eyes']); put('gem', SRC['green'], sk['eyes']); put('energy', SRC['green'], sk['energy'])
    m = role == ROLE['laser']
    if m.any(): out[..., :3][m] = ramp_map(rgb[m], FX_SRC, fx_ramp(sk, 'laser'))
    return out


def recolor_fx(rgba, sk, key):
    out = rgba.copy(); rgb = rgba[..., :3]; op = rgba[..., 3] > 0
    m = op & ~(rgb == 0).all(-1)
    out[..., :3][m] = ramp_map(rgb[m], FX_SRC, fx_ramp(sk, key))
    return out


def hsh(x, y, f, k):
    h = (x * 73856093) ^ (y * 19349663) ^ (f * 83492791) ^ (k * 2654435761)
    h &= 0xffffffff; h ^= h >> 13; h = (h * 1274126177) & 0xffffffff; return h ^ (h >> 16)


def material(rgba, role, sk, k):
    mat = sk['material']; reg = role == ROLE[mat['region']]
    ov = np.zeros_like(rgba)
    if mat['kind'] == 'iridescent':
        ov[..., :3][reg] = ramp_map(rgba[..., :3][reg], SRC['costume'], mat['colors']); ov[..., 3][reg] = 255
        return ov
    ys, xs = np.where(reg); cols = mat['colors']
    for y, x in zip(ys, xs):
        h = hsh(int(x % FW), int(y), int(x // FW), k)
        if h % mat['density'] == 0: ov[y, x, :3] = cols[(h >> 8) % len(cols)]; ov[y, x, 3] = 255
    return ov


def main():
    DOCS.mkdir(parents=True, exist_ok=True)
    assert len(SPEC) == 10 and len({s['id'] for s in SPEC}) == 10
    audit, table = {}, []
    roles_cache = {st: classify_body(np.array(Image.open(A / f'{st}.png').convert('RGBA')), st) for st in STRIPS}
    region_px = {st: {k: int((roles_cache[st] == v).sum()) for k, v in ROLE.items()} for st in STRIPS}
    for sk in SPEC:
        assert sk['id'].startswith('sf_') and not sk['id'].endswith('AlienX') and 'cyborg' not in sk['id'].lower(), sk['id']
        tag = sk['tag']; d = OUTS / tag
        for sub in ('fx', 'cutscene', 'icons'): (d / sub).mkdir(parents=True, exist_ok=True)
        a = {'files': 0, 'skinPixels': 0, 'outlinePixels': 0, 'eyePixels': 0, 'recoloured': 0, 'materialPixels': 0}
        phases = 1 if sk.get('material', {}).get('kind') == 'iridescent' else 4
        for st in STRIPS:
            src = np.array(Image.open(A / f'{st}.png').convert('RGBA')); role = roles_cache[st]; new = apply(src, role, sk)
            for r in ('skin', 'outline'):
                m = role == ROLE[r]; assert (new[m] == src[m]).all(), (r, 'changed', tag, st); a[r + 'Pixels'] += int(m.sum())
            em = role == ROLE['eyes']; a['eyePixels'] += int(em.sum())
            assert (classify_colour(src[..., :3], src[..., 3] > 0)[em] == ROLE['energy']).all()            # eye mask = original green eye pixels
            assert new.shape == src.shape and (new[..., 3] == src[..., 3]).all(), ('alpha/size', tag, st)
            Image.fromarray(new, 'RGBA').save(d / f'{st}.png'); a['files'] += 1; a['recoloured'] += int((new != src).any(-1).sum())
            if 'material' in sk:
                for k in range(phases):
                    (d / 'mat' / f'p{k}').mkdir(parents=True, exist_ok=True)
                    ov = material(src, role, sk, k); a['materialPixels'] += int((ov[..., 3] > 0).sum())
                    assert not (ov[..., 3] > 0)[role != ROLE[sk['material']['region']]].any(), ('material outside region', tag, st)
                    Image.fromarray(ov, 'RGBA').save(d / 'mat' / f'p{k}' / f'{st}.png')
        for f, key in [('ball_strip', 'projectile'), ('explosion_strip', 'explosion'), ('laser_cap0', 'laser'), ('laser_cap1', 'laser'),
                       ('laser_body0', 'laser'), ('laser_body1', 'laser')]:
            src = np.array(Image.open(A / 'fx' / f'{f}.png').convert('RGBA')); new = recolor_fx(src, sk, key)
            assert (new[..., 3] == src[..., 3]).all(); Image.fromarray(new, 'RGBA').save(d / 'fx' / f'{f}.png'); a['files'] += 1
        for rel in FLAT:
            src = np.array(Image.open(A / rel).convert('RGBA')); op = src[..., 3] > 0; role = classify_colour(src[..., :3], op)
            role[role == ROLE['energy']] = ROLE['eyes']                 # portrait / bust / icons: greens are her eyes + gems
            new = apply(src, role, sk)
            m = role == ROLE['skin']; assert (new[m] == src[m]).all(), ('skin changed', tag, rel)
            Image.fromarray(new, 'RGBA').save(d / rel); a['files'] += 1; a['skinPixels'] += int(m.sum())
        audit[tag] = a
        table.append({k: sk.get(k) for k in ['id', 'tag', 'name', 'classification', 'crossover', 'inspiration', 'url', 'research', 'notes', 'hud']}
                     | {'fx': ['#%02x%02x%02x' % tuple(c) for c in sk['fx']], 'material': ({**sk['material'], 'phases': phases} if 'material' in sk else None)})
    (ROOT / 'starfireSkinTable.js').write_text('// Generated by tools/starfire/build_skins.py from tools/starfire/skins.json — do not hand-edit.\n'
                                              'export const STARFIRE_SKIN_TABLE = ' + json.dumps(table, indent=1, ensure_ascii=False) + '\n')
    (DOCS / 'region_mapping.json').write_text(json.dumps({
        'regions': {'outline': '(0,0,0) kept', 'skin': '(240,168,128) (240,248,224) — never recoloured',
                    'hair': '(104,8,16) (176,32,40) (208,80,24)', 'costume': '(56,0,152) (120,48,200) (184,128,232)',
                    'boots': "costume pixels within 16 px of each body frame's lowest opaque row",
                    'metal': '(0,48,152) (72,104,216) (128,168,240) (+1 stray (32,32,112))',
                    'eyes': 'eye greens inside the validated per-frame eye boxes (geometry fixed)',
                    'gem': 'other eye-green clusters ≤ 12 px touching metal / skin (collar + wrist gems) — eyes ramp',
                    'energy': 'remaining eye-green clusters (energy fists / rings, levitation hand glow) — hand energy',
                    'laser': 'blue glare lines over the face on Shooting Laser 5-7 — laser ramp',
                    'projectile': 'Energy Ball strip by luminance', 'explosion': 'Energy Exploding strip by luminance',
                    'laserPieces': 'Laser cap / body by luminance'},
        'sourceRamps': SRC, 'strips': STRIPS, 'flat': FLAT, 'regionPixelsPerStrip': region_px, 'skins': SPEC, 'audit': audit}, indent=1, ensure_ascii=False) + '\n')
    contact_sheet()
    print(json.dumps(audit, indent=1))


def contact_sheet():
    cols = [('idle', 0), ('walk', 4), ('heavy', 6), ('sfJ2', 2), ('sfLaser', 6), ('lev', 2), ('sfBolt', 3), ('hurt', 3)]
    rows = [('default', None)] + [(s['tag'], s) for s in SPEC]
    S = 2; cw, ch = 96 * S, 104 * S; fxw = 74 * S; pw = 70 * S
    img = Image.new('RGB', (190 + len(cols) * cw + fxw + pw, 24 + len(rows) * ch), (34, 38, 48)); dr = ImageDraw.Draw(img)
    for j, (act, fi) in enumerate(cols): dr.text((190 + j * cw + 4, 6), f'{act}[{fi}]', fill='white')
    dr.text((190 + len(cols) * cw + 4, 6), 'ball / boom / laser', fill='white'); dr.text((190 + len(cols) * cw + fxw + 4, 6), 'portrait', fill='white')
    for i, (tag, sk) in enumerate(rows):
        y = 24 + i * ch; name = (sk['name'] if sk else 'Default').replace('—', '-')
        for k, part in enumerate([name[:26], name[26:52]]): dr.text((6, y + ch // 2 - 10 + k * 12), part, fill='white')
        base = A if tag == 'default' else OUTS / tag
        for j, (act, fi) in enumerate(cols):
            box = (fi * FW + OX - 48, 0, fi * FW + OX + 48, FH)
            cell = Image.open(base / f'{act}.png').convert('RGBA').crop(box)
            if sk and sk.get('material'): cell = Image.alpha_composite(cell, Image.open(OUTS / tag / 'mat' / 'p0' / f'{act}.png').convert('RGBA').crop(box))
            bg = Image.new('RGBA', cell.size, (70, 78, 96, 255) if j % 2 else (200, 204, 214, 255)); bg.alpha_composite(cell)
            img.paste(bg.resize((cell.width * S, cell.height * S), Image.Resampling.NEAREST), (190 + j * cw, y))
        x0 = 190 + len(cols) * cw
        ball = Image.open(base / 'fx/ball_strip.png').convert('RGBA').resize((51, 51), Image.Resampling.NEAREST)
        exw = Image.open(base / 'fx/explosion_strip.png').width // 11
        ex = Image.open(base / 'fx/explosion_strip.png').convert('RGBA').crop((exw * 4, 0, exw * 5, 40 + 4)).resize((exw * 2, 88), Image.Resampling.NEAREST)
        lz = Image.open(base / 'fx/laser_body0.png').convert('RGBA').resize((128, 20), Image.Resampling.NEAREST)
        img.paste(ball, (x0 + 4, y + 4), ball); img.paste(ex, (x0 + 60, y + 4), ex); img.paste(lz, (x0 + 4, y + 120), lz)
        por = Image.open(base / 'portrait.png').convert('RGBA'); por.thumbnail((pw - 4, ch - 4), Image.Resampling.NEAREST)
        img.paste(por, (x0 + fxw + 2, y + 2), por)
    img.save(DOCS / 'skins_contact.png')
    img.save(ROOT / 'docs/starfire/skins_contact.png')


if __name__ == '__main__':
    main()
