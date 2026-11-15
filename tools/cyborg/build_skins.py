#!/usr/bin/env python3
"""Cyborg skins: PRECOMPUTED recolours of the extracted strips (tools/cyborg/extract.py output). Cosmetic only.

Region model (per pixel, by colour rule; the body art uses 17 colours, icons / FX a few more shades):
  outline  (0,0,0)                                   kept
  skin     orange / brown human ramp (r>g, b<=12)    NEVER recoloured — Victor's face, neck and shoulders
  eye      saturated red sensor                      kept unless the skin defines `eye` (Alien X / Upgrade: green sensor)
  panel    blue panels + weapon / energy glow        → skin `panel` ramp
  joint    dark greys (lum < 92)                     → skin `joint` ramp
  armor    greys / whites                            → skin `armor` ramp (Blue Bomber `boots` band, Autobot `legs` zone)
  thruster detached / unoutlined flame pixels in doubleJump + ultBoost frames  → skin `fx` ramp
  impact   detached / unoutlined burst + streak pixels in Mega Punch frames    → NEUTRAL (unchanged)
Every region is remapped along its luminance ramp, so shading ramps, outlines, alpha, dimensions and pivots are
preserved. Assertions: skin pixels, outline, alpha and image sizes are byte-identical to the source for every file.

Materials (Alien X stars, Disco glitter, Aurora iridescence) are SPARSE precomputed overlay strips — discrete pixels
chosen by a fixed integer hash (no RNG), clipped to the approved region — drawn by cyborgFx.js over the body with a slow
crossfade. No runtime pixel scans, no getImageData, no per-frame canvases.

Usage: python3 tools/cyborg/build_skins.py
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/cyborg'
OUTS = A / 'skins'
DOCS = ROOT / 'docs/skins/cyborg'
SPEC = json.loads((ROOT / 'tools/cyborg/skins.json').read_text())['skins']
META = json.loads((ROOT / 'docs/cyborg/source_rects.json').read_text())
FW, FH, OX, OY = (META['frame'][k] for k in ('width', 'height', 'originX', 'originY'))
ACTIONS = list(META['sequences'])
THRUSTER = {'doubleJump', 'ultBoost'}
IMPACT = {'cMega', 'cSlamLand', 'cLow', 'ultMega'}
SRC_RAMP = {'armor': [(104, 112, 120), (152, 168, 176), (192, 208, 216), (248, 248, 248)],
            'joint': [(40, 48, 56), (80, 88, 88)], 'panel': [(0, 80, 176), (40, 152, 240), (96, 200, 248)]}
lum = lambda c: 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]
ROLE = {'outline': 0, 'skin': 1, 'eye': 2, 'panel': 3, 'joint': 4, 'armor': 5}


def classify(rgb):
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    L = lum(rgb.astype(float))
    role = np.full(r.shape, ROLE['armor'], np.uint8)
    role[L < 92] = ROLE['joint']
    role[(b >= r + 60) & (b >= g)] = ROLE['panel']
    role[(r >= 80) & (r > g) & (b <= 12)] = ROLE['skin']
    role[(r >= 180) & (g <= 20) & (b <= 60)] = ROLE['eye']
    role[(r == 0) & (g == 0) & (b == 0)] = ROLE['outline']
    return role


def ramp_map(rgb, src, dst):
    s = np.array([lum(np.array(c, float)) for c in src]); d = np.array(dst, float)
    t = np.clip((lum(rgb.astype(float)) - s[0]) / max(1.0, s[-1] - s[0]), 0, 1) * (len(d) - 1)
    i0 = np.floor(t).astype(int); i1 = np.minimum(i0 + 1, len(d) - 1); u = (t - i0)[..., None]
    return np.round(d[i0] * (1 - u) + d[i1] * u).astype(np.uint8)


def fx_mask(rgba):
    """Unoutlined effect pixels in one frame cell (thruster flames, Mega Punch burst / streaks). The GBA body is walled by
    its dark outline AND dark shading (luminance < 95; the art uses selective outlining, so pure black alone leaks);
    flames and bursts contain no dark pixels. FX = opaque pixels reachable from the transparent background (4-connected)
    without crossing a wall pixel, excluding Victor's skin ramp. Verified: idle / run / heavy → 0 px."""
    op = rgba[..., 3] > 0
    if not op.any(): return op
    wall = (lum(rgba[..., :3].astype(float)) < 95) & op
    lab, n = ndimage.label(~wall)
    outside = np.isin(lab, np.unique(lab[~op]))
    return outside & op & ~wall & (classify(rgba[..., :3]) != ROLE['skin'])


def hsh(x, y, f, k):
    h = (x * 73856093) ^ (y * 19349663) ^ (f * 83492791) ^ (k * 2654435761)
    h &= 0xffffffff; h ^= h >> 13; h = (h * 1274126177) & 0xffffffff; return h ^ (h >> 16)


def recolor(rgba, sk, kind='body', action=None):
    """→ (new rgba, roles, fxmask). kind: body strip | fx strip | flat (portrait / icons / cutscene)."""
    out = rgba.copy(); rgb = rgba[..., :3]; op = rgba[..., 3] > 0
    role = classify(rgb)
    fxm = np.zeros(op.shape, bool); legs = np.zeros(op.shape, bool); boots = np.zeros(op.shape, bool)
    if kind == 'body':
        for fi in range(rgba.shape[1] // FW):
            sl = (slice(None), slice(fi * FW, (fi + 1) * FW))
            if action in THRUSTER or action in IMPACT: fxm[sl] = fx_mask(rgba[sl])
            ys = np.where(op[sl].any(1))[0]
            if len(ys):
                top = ys.min(); bodyH = max(1, OY - top)
                legs[sl][int(OY - 0.40 * bodyH):, :] = True
                boots[sl][OY - 11:OY + 2, :] = True
    def put(mask, src, dst):
        m = mask & op
        if m.any(): out[..., :3][m] = ramp_map(rgb[m], src, dst)
    armor = (role == ROLE['armor']) & ~fxm; joint = (role == ROLE['joint']) & ~fxm; panel = (role == ROLE['panel']) & ~fxm
    if kind == 'fx':   # weapon effects: blue energy → fx ramp; casing / whites / darks keep their supplied look
        put(panel, SRC_RAMP['panel'], sk['fx'])
        return out, role, fxm
    if 'legs' in sk: put(armor & ~legs, SRC_RAMP['armor'], sk['armor']); put(armor & legs, SRC_RAMP['armor'], sk['legs'])
    elif 'boots' in sk: put(armor & ~boots, SRC_RAMP['armor'], sk['armor']); put(armor & boots, SRC_RAMP['armor'], sk['boots'])
    else: put(armor, SRC_RAMP['armor'], sk['armor'])
    put(joint, SRC_RAMP['joint'], sk['joint']); put(panel, SRC_RAMP['panel'], sk['panel'])
    if 'eye' in sk: out[..., :3][(role == ROLE['eye']) & op & ~fxm] = sk['eye']
    if kind == 'body' and action in THRUSTER:
        th = fxm & op & (lum(rgb.astype(float)) >= 60)
        if th.any(): out[..., :3][th] = ramp_map(rgb[th], SRC_RAMP['panel'], sk['fx'])
    return out, role, fxm   # IMPACT fx pixels stay untouched (neutral)


def material(rgba, role, fxm, sk, k):
    mat = sk['material']; op = rgba[..., 3] > 0
    reg = np.zeros(op.shape, bool)
    for r in mat['region'].split('+'): reg |= role == ROLE[r]
    reg &= op & ~fxm
    ov = np.zeros_like(rgba)
    if mat['kind'] == 'iridescent':
        m = reg; ov[..., :3][m] = ramp_map(rgba[..., :3][m], SRC_RAMP['panel'], mat['colors']); ov[..., 3][m] = 255
        return ov
    ys, xs = np.where(reg); cols = mat['colors']
    for y, x in zip(ys, xs):
        h = hsh(int(x % FW), int(y), int(x // FW), k)
        if h % mat['density'] == 0:
            ov[y, x, :3] = cols[(h >> 8) % len(cols)]; ov[y, x, 3] = 255
    return ov


def main():
    DOCS.mkdir(parents=True, exist_ok=True)
    audit, table = {}, []
    for sk in SPEC:
        tag = sk['tag']; d = OUTS / tag; (d / 'fx').mkdir(parents=True, exist_ok=True); (d / 'cutscene').mkdir(exist_ok=True); (d / 'icons').mkdir(exist_ok=True)
        a = {'files': 0, 'skinPixels': 0, 'recoloured': 0, 'thruster': 0, 'impactKept': 0, 'materialPixels': 0}
        phases = 1 if sk.get('material', {}).get('kind') == 'iridescent' else 4
        for action in ACTIONS:
            src = np.array(Image.open(A / f'{action}.png').convert('RGBA'))
            new, role, fxm = recolor(src, sk, 'body', action)
            sk_mask = (role == ROLE['skin']) & (src[..., 3] > 0)
            assert (new[sk_mask] == src[sk_mask]).all(), ('skin pixel changed', tag, action)
            assert (new[..., 3] == src[..., 3]).all() and new.shape == src.shape, ('alpha/size changed', tag, action)
            assert (new[(role == ROLE['outline']) & (src[..., 3] > 0)] == src[(role == ROLE['outline']) & (src[..., 3] > 0)]).all()
            if action in IMPACT:
                im = fxm & (src[..., 3] > 0); assert (new[im] == src[im]).all(), ('impact recoloured', tag, action); a['impactKept'] += int(im.sum())
            if action in THRUSTER: a['thruster'] += int((fxm & (src[..., 3] > 0)).sum())
            Image.fromarray(new, 'RGBA').save(d / f'{action}.png')
            a['files'] += 1; a['skinPixels'] += int(sk_mask.sum()); a['recoloured'] += int((new != src).any(-1).sum())
            if 'material' in sk:
                for k in range(phases):
                    (d / 'mat' / f'p{k}').mkdir(parents=True, exist_ok=True)
                    ov = material(src, role, fxm, sk, k); a['materialPixels'] += int((ov[..., 3] > 0).sum())
                    Image.fromarray(ov, 'RGBA').save(d / 'mat' / f'p{k}' / f'{action}.png')
        for f in ['missile_strip', 'explosion_strip', 'sonic_strip']:
            src = np.array(Image.open(A / 'fx' / f'{f}.png').convert('RGBA')); new, *_ = recolor(src, sk, 'fx')
            Image.fromarray(new, 'RGBA').save(d / 'fx' / f'{f}.png'); a['files'] += 1
        for rel in ['portrait.png', 'cutscene/bust.png', 'icons/expressions.png'] + [f'cutscene/{n}.png' for n in ['eye0', 'eye1', 'mouth0', 'mouth1', 'mouth2']]:
            p = A / rel if (A / rel).exists() else A / 'cutscene' / Path(rel).name
            src = np.array(Image.open(p).convert('RGBA')); new, role, _ = recolor(src, sk, 'flat')
            m = (role == ROLE['skin']) & (src[..., 3] > 0); assert (new[m] == src[m]).all(), ('skin changed', tag, rel)
            Image.fromarray(new, 'RGBA').save(d / rel); a['files'] += 1; a['skinPixels'] += int(m.sum())
        audit[tag] = a
        table.append({k: sk.get(k) for k in ['id', 'tag', 'name', 'classification', 'crossover', 'inspiration', 'url', 'notes', 'hud']}
                     | {'fx': ['#%02x%02x%02x' % tuple(c) for c in sk['fx']], 'material': ({**sk['material'], 'phases': phases} if 'material' in sk else None)})
    (ROOT / 'cyborgSkinTable.js').write_text('// Generated by tools/cyborg/build_skins.py from tools/cyborg/skins.json — do not hand-edit.\n'
                                            'export const CYBORG_SKIN_TABLE = ' + json.dumps(table, indent=1) + '\n')
    (DOCS / 'region_mapping.json').write_text(json.dumps({
        'regions': {'outline': '(0,0,0) kept', 'skin': 'r>=80, r>g, b<=12 — never recoloured', 'eye': 'r>=180, g<=20, b<=60',
                    'panel': 'b>=r+60 and b>=g', 'joint': 'grey, luminance < 92', 'armor': 'other greys / whites',
                    'thruster': 'unoutlined / detached light pixels in doubleJump, ultBoost', 'impact': 'unoutlined / detached light pixels in cMega, cSlamLand, cLow, ultMega (neutral)',
                    'bluebomberBoots': 'armor pixels in rows OY-11..OY+1 of each body frame', 'autobotLegs': 'armor pixels below 40% of body height above the feet'},
        'sourceRamps': SRC_RAMP, 'skins': SPEC, 'audit': audit}, indent=1) + '\n')
    contact_sheet()
    print(json.dumps(audit, indent=1))


def contact_sheet():
    cols = [('idle', 0), ('run', 3), ('heavy', 4), ('cCannon', 4), ('cMissile', 3), ('doubleJump', 2), ('cMega', 5), ('hurt', 3), ('lose', 0)]
    rows = [('default', None)] + [(s['tag'], s) for s in SPEC]
    S = 2; cw, ch = 96 * S, 104 * S; pw = 70 * S
    img = Image.new('RGB', (150 + len(cols) * cw + pw, 24 + len(rows) * ch), (34, 38, 48)); dr = ImageDraw.Draw(img)
    for j, (act, fi) in enumerate(cols): dr.text((150 + j * cw + 4, 6), f'{act}[{fi}]', fill='white')
    dr.text((150 + len(cols) * cw + 4, 6), 'portrait', fill='white')
    for i, (tag, sk) in enumerate(rows):
        y = 24 + i * ch; dr.text((6, y + ch // 2), tag, fill='white')
        base = A if tag == 'default' else OUTS / tag
        for j, (act, fi) in enumerate(cols):
            st = Image.open(base / f'{act}.png'); cell = st.crop((fi * FW + OX - 48, OY - 92, fi * FW + OX + 48, OY + 12))
            if sk and sk.get('material'):
                ov = Image.open(OUTS / tag / 'mat' / 'p0' / f'{act}.png').crop((fi * FW + OX - 48, OY - 92, fi * FW + OX + 48, OY + 12)); cell = Image.alpha_composite(cell, ov)
            bg = Image.new('RGBA', cell.size, (70, 78, 96, 255) if j % 2 else (200, 204, 214, 255)); bg.alpha_composite(cell)
            img.paste(bg.resize((cell.width * S, cell.height * S), Image.Resampling.NEAREST), (150 + j * cw, y))
        por = Image.open(base / 'portrait.png').convert('RGBA'); por.thumbnail((pw - 4, ch - 4), Image.Resampling.NEAREST)
        img.paste(por, (150 + len(cols) * cw + 2, y + 2), por)
    img.save(DOCS / 'skins_contact.png')


if __name__ == '__main__':
    main()
