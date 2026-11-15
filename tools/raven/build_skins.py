#!/usr/bin/env python3
"""Raven skins: PRECOMPUTED recolours of the extracted strips (tools/raven/extract.py output). Cosmetic only.

Region model (per pixel, by colour rule; the body art uses 16 colours):
  outline  (0,0,0)                         kept — includes the black Soul Shell disc and the dark-magic hand
  skin     greys, |r-g|,|g-b| <= 16, r>=60  NEVER recoloured — her grey face / legs and the shell's silhouette lines
  gem      reds, r >= g + 80                → skin `gem` ramp (chakra + belt gems)
  cloak    purple / navy (everything else)  → skin `cloak` ramp (hood, cloak, leotard)
  boots    cloak pixels within 12 px of each body frame's lowest opaque row → skin `boots` ramp when given, else cloak
FX: the Dark Pulse orb + Energy Exploding strips are remapped by luminance onto the skin `fx` ramp; the brick pile /
breaking strips stay natural stone (copied unchanged). Every mapping is by the source palette's luminance order, so
shading, outlines, alpha, dimensions and pivots are preserved. Asserted per file: skin + outline pixels, alpha and size
byte-identical to the source.

Materials (stars / glitter = sparse fixed-integer-hash pixels; iridescent = one luminance-mapped layer) are precomputed
overlay strips assets/raven/skins/<tag>/mat/p<k>/<strip>.png, written only inside the cloak mask, drawn by ravenFx.js
with a slow crossfade (static under reduced effects). No RNG, no runtime pixel scans, no per-frame canvases.

Usage: python3 tools/raven/build_skins.py
"""
from pathlib import Path
import json, shutil
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/raven'
OUTS = A / 'skins'
DOCS = ROOT / 'docs/skins/raven'
SPEC = json.loads((ROOT / 'tools/raven/skins.json').read_text())['skins']
META = json.loads((ROOT / 'docs/raven/source_rects.json').read_text())
FW, FH, OX, OY = (META['frame'][k] for k in ('width', 'height', 'originX', 'originY'))
STRIPS = sorted(p.stem for p in A.glob('*.png') if p.stem not in ('portrait', 'credit_panel'))
FLAT = ['portrait.png', 'cutscene/bust.png', 'icons/expressions.png'] + [f'cutscene/{n}.png' for n in ['eye0', 'eye1', 'mouth0', 'mouth1', 'mouth2']]
SRC = {'cloak': [(0, 0, 64), (16, 8, 112), (48, 24, 112), (72, 32, 176), (104, 56, 240), (152, 120, 232), (208, 176, 240)],
       'gem': [(136, 0, 16), (248, 0, 40), (248, 128, 144)]}
lum = lambda c: 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]
ROLE = {'outline': 0, 'skin': 1, 'gem': 2, 'cloak': 3}


def classify(rgb):
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    role = np.full(r.shape, ROLE['cloak'], np.uint8)
    role[(r >= g + 80)] = ROLE['gem']
    role[(np.abs(r - g) <= 16) & (np.abs(g - b) <= 16) & (r >= 60)] = ROLE['skin']
    role[(r == 0) & (g == 0) & (b == 0)] = ROLE['outline']
    return role


def ramp_map(rgb, src, dst):
    """piecewise by luminance: source tone i → destination tone i (exact for palette colours), linear between."""
    s = np.array([lum(np.array(c, float)) for c in src]); d = np.array(dst, float)
    o = np.argsort(s); s = s[o]
    t = np.interp(lum(rgb.astype(float)), s, np.arange(len(s)) * (len(d) - 1) / max(1, len(s) - 1))
    i0 = np.floor(t).astype(int); i1 = np.minimum(i0 + 1, len(d) - 1); u = (t - i0)[..., None]
    return np.round(d[i0] * (1 - u) + d[i1] * u).astype(np.uint8)


def boots_mask(rgba):
    op = rgba[..., 3] > 0; m = np.zeros(op.shape, bool)
    for fi in range(rgba.shape[1] // FW):
        sl = (slice(None), slice(fi * FW, (fi + 1) * FW)); ys = np.where(op[sl].any(1))[0]
        if len(ys): m[sl][max(0, ys.max() - 11):ys.max() + 1, :] = True
    return m


def hsh(x, y, f, k):
    h = (x * 73856093) ^ (y * 19349663) ^ (f * 83492791) ^ (k * 2654435761)
    h &= 0xffffffff; h ^= h >> 13; h = (h * 1274126177) & 0xffffffff; return h ^ (h >> 16)


def recolor(rgba, sk, body=False):
    out = rgba.copy(); rgb = rgba[..., :3]; op = rgba[..., 3] > 0; role = classify(rgb)
    cloak = (role == ROLE['cloak']) & op; gem = (role == ROLE['gem']) & op
    if body and 'boots' in sk:
        bm = boots_mask(rgba) & cloak
        out[..., :3][cloak & ~bm] = ramp_map(rgb[cloak & ~bm], SRC['cloak'], sk['cloak'])
        out[..., :3][bm] = ramp_map(rgb[bm], SRC['cloak'], sk['boots'])
    else:
        out[..., :3][cloak] = ramp_map(rgb[cloak], SRC['cloak'], sk['cloak'])
    out[..., :3][gem] = ramp_map(rgb[gem], SRC['gem'], sk['gem'])
    return out, role


def recolor_fx(rgba, sk):
    """orb / explosion: every non-black opaque pixel → the fx ramp (a darkened fx[0] below), by luminance."""
    out = rgba.copy(); rgb = rgba[..., :3]; op = rgba[..., 3] > 0
    m = op & ~((rgb[..., 0] == 0) & (rgb[..., 1] == 0) & (rgb[..., 2] == 0))
    f0 = np.array(sk['fx'][0], float)
    dst = [tuple(np.round(f0 * 0.3)), tuple(np.round(f0 * 0.6)), tuple(f0), tuple(sk['fx'][1]), tuple(sk['fx'][2])]
    src = [(10, 10, 10), (40, 40, 40), (80, 80, 80), (140, 140, 140), (230, 230, 230)]   # luminance anchors
    out[..., :3][m] = ramp_map(rgb[m], src, dst)
    return out


def material(rgba, role, sk, k):
    mat = sk['material']; op = rgba[..., 3] > 0
    reg = (role == ROLE[mat['region']]) & op
    ov = np.zeros_like(rgba)
    if mat['kind'] == 'iridescent':
        ov[..., :3][reg] = ramp_map(rgba[..., :3][reg], SRC['cloak'][1:6:2], mat['colors']); ov[..., 3][reg] = 255
        return ov
    ys, xs = np.where(reg); cols = mat['colors']
    for y, x in zip(ys, xs):
        h = hsh(int(x % FW), int(y), int(x // FW), k)
        if h % mat['density'] == 0: ov[y, x, :3] = cols[(h >> 8) % len(cols)]; ov[y, x, 3] = 255
    return ov


def main():
    DOCS.mkdir(parents=True, exist_ok=True)
    audit, table = {}, []
    for sk in SPEC:
        assert sk['id'].startswith('rv_') and not sk['id'].endswith('AlienX') and 'cyborg' not in sk['id'], sk['id']
        tag = sk['tag']; d = OUTS / tag
        for sub in ('fx', 'cutscene', 'icons'): (d / sub).mkdir(parents=True, exist_ok=True)
        a = {'files': 0, 'skinPixels': 0, 'outlinePixels': 0, 'recoloured': 0, 'materialPixels': 0}
        phases = 1 if sk.get('material', {}).get('kind') == 'iridescent' else 4
        for st in STRIPS:
            src = np.array(Image.open(A / f'{st}.png').convert('RGBA')); new, role = recolor(src, sk, body=True)
            op = src[..., 3] > 0
            for r in ('skin', 'outline'):
                m = (role == ROLE[r]) & op; assert (new[m] == src[m]).all(), (r, 'changed', tag, st); a[r + 'Pixels'] += int(m.sum())
            assert new.shape == src.shape and (new[..., 3] == src[..., 3]).all(), ('alpha/size', tag, st)
            Image.fromarray(new, 'RGBA').save(d / f'{st}.png'); a['files'] += 1; a['recoloured'] += int((new != src).any(-1).sum())
            if 'material' in sk:
                for k in range(phases):
                    (d / 'mat' / f'p{k}').mkdir(parents=True, exist_ok=True)
                    ov = material(src, role, sk, k); a['materialPixels'] += int((ov[..., 3] > 0).sum())
                    assert not (ov[..., 3] > 0)[(role != ROLE['cloak']) | ~op].any(), ('material outside cloak', tag, st)
                    Image.fromarray(ov, 'RGBA').save(d / 'mat' / f'p{k}' / f'{st}.png')
        for f in ['orb_strip', 'explosion_strip']:
            src = np.array(Image.open(A / 'fx' / f'{f}.png').convert('RGBA')); new = recolor_fx(src, sk)
            assert (new[..., 3] == src[..., 3]).all(); Image.fromarray(new, 'RGBA').save(d / 'fx' / f'{f}.png'); a['files'] += 1
        for f in ['pile_strip', 'breaking_strip']: shutil.copyfile(A / 'fx' / f'{f}.png', d / 'fx' / f'{f}.png'); a['files'] += 1   # natural stone
        for rel in FLAT:
            src = np.array(Image.open(A / rel).convert('RGBA')); new, role = recolor(src, sk)
            m = (role == ROLE['skin']) & (src[..., 3] > 0); assert (new[m] == src[m]).all(), ('skin changed', tag, rel)
            Image.fromarray(new, 'RGBA').save(d / rel); a['files'] += 1; a['skinPixels'] += int(m.sum())
        audit[tag] = a
        table.append({k: sk.get(k) for k in ['id', 'tag', 'name', 'classification', 'crossover', 'inspiration', 'url', 'research', 'notes', 'hud']}
                     | {'fx': ['#%02x%02x%02x' % tuple(c) for c in sk['fx']], 'material': ({**sk['material'], 'phases': phases} if 'material' in sk else None)})
    (ROOT / 'ravenSkinTable.js').write_text('// Generated by tools/raven/build_skins.py from tools/raven/skins.json — do not hand-edit.\n'
                                           'export const RAVEN_SKIN_TABLE = ' + json.dumps(table, indent=1, ensure_ascii=False) + '\n')
    (DOCS / 'region_mapping.json').write_text(json.dumps({
        'regions': {'outline': '(0,0,0) kept — outlines, black Soul Shell disc, dark-magic hand', 'skin': 'greys |r-g|,|g-b|<=16, r>=60 — never recoloured (face, legs, shell silhouette lines)',
                    'gem': 'r >= g + 80 (chakra + belt gems)', 'cloak': 'remaining purple / navy (hood, cloak, leotard)',
                    'boots': 'cloak pixels within 12 px of each body frame\'s lowest opaque row (only skins with a boots ramp)',
                    'fx': 'orb + explosion strips, non-black pixels by luminance', 'bricks': 'pile + breaking strips copied unchanged (stone)'},
        'sourceRamps': SRC, 'strips': STRIPS, 'flat': FLAT, 'skins': SPEC, 'audit': audit}, indent=1, ensure_ascii=False) + '\n')
    contact_sheet()
    print(json.dumps(audit, indent=1))


def contact_sheet():
    cols = [('idle', 0), ('walk', 4), ('heavy', 5), ('rPulse', 4), ('rShieldLoop', 3), ('lev', 2), ('ultCast', 0), ('hurt', 2)]
    rows = [('default', None)] + [(s['tag'], s) for s in SPEC]
    S = 2; cw, ch = 96 * S, 104 * S; fxw = 70 * S; pw = 70 * S
    img = Image.new('RGB', (170 + len(cols) * cw + fxw + pw, 24 + len(rows) * ch), (34, 38, 48)); dr = ImageDraw.Draw(img)
    for j, (act, fi) in enumerate(cols): dr.text((170 + j * cw + 4, 6), f'{act}[{fi}]', fill='white')
    dr.text((170 + len(cols) * cw + 4, 6), 'orb / boom', fill='white'); dr.text((170 + len(cols) * cw + fxw + 4, 6), 'portrait', fill='white')
    for i, (tag, sk) in enumerate(rows):
        y = 24 + i * ch; dr.text((6, y + ch // 2 - 6), (sk['name'] if sk else 'Default').replace('—', '-')[:30], fill='white')
        base = A if tag == 'default' else OUTS / tag
        for j, (act, fi) in enumerate(cols):
            box = (fi * FW + OX - 48, 0, fi * FW + OX + 48, FH)
            cell = Image.open(base / f'{act}.png').convert('RGBA').crop(box)
            if sk and sk.get('material'): cell = Image.alpha_composite(cell, Image.open(OUTS / tag / 'mat' / 'p0' / f'{act}.png').convert('RGBA').crop(box))
            bg = Image.new('RGBA', cell.size, (70, 78, 96, 255) if j % 2 else (200, 204, 214, 255)); bg.alpha_composite(cell)
            img.paste(bg.resize((cell.width * S, cell.height * S), Image.Resampling.NEAREST), (170 + j * cw, y))
        x0 = 170 + len(cols) * cw
        orb = Image.open(base / 'fx/orb_strip.png').convert('RGBA').crop((0, 0, 31, 16)).resize((62, 32), Image.Resampling.NEAREST)
        ex = Image.open(base / 'fx/explosion_strip.png').convert('RGBA').crop((47 * 4, 0, 47 * 5, 40)).resize((94, 80), Image.Resampling.NEAREST)
        img.paste(orb, (x0 + 4, y + 10), orb); img.paste(ex, (x0 + 4, y + 60), ex)
        por = Image.open(base / 'portrait.png').convert('RGBA'); por.thumbnail((pw - 4, ch - 4), Image.Resampling.NEAREST)
        img.paste(por, (x0 + fxw + 2, y + 2), por)
    img.save(DOCS / 'skins_contact.png')


if __name__ == '__main__':
    main()
