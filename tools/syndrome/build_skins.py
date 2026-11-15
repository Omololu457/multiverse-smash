#!/usr/bin/env python3
"""Syndrome: precompute the TWELVE whole-arsenal skins (cosmetic only; Syndrome AND every machine he commands).

Input: the extracted default strips (assets/syndrome/*.png, assets/syndrome/machines/*.png, portrait.png — produced by
tools/syndrome/extract.py), their cell widths (syndromeSprites.js via node) and the palette spec tools/syndrome/skins.json.

The GBA sources are INDEXED art: every family uses a small exact palette (body 15 colours, drone 17, spinner 16,
turret 16, velocipod 18, Omnidroid 19). So regions are EXACT-COLOUR roles per family (table ROLES below), refined by a
spatial rule only where one colour plays two parts:
  body (0,0,0)        edge-adjacent to transparency → outline (kept); interior and NOT within 3 px of skin / hair → suitDark
                      (the black suit); interior near the face → kept (mask, eye lines)
  body white / grey   within 2 px of skin → kept (eye whites); otherwise suitLight (gloves, boots, emblem, chest)
  machine (0,0,0)     always outline (kept)
  skin tones          never recoloured (Syndrome's face / hands, the Velocipod rider's face)
Each role's source colours are ranked by luminance inside that role & family; the rank picks a point on the skin's
3-stop ramp [dark, mid, light]. Alpha, dimensions and strip layout are byte-for-byte the default's → geometry, anchors,
hitboxes, timing and frame data are identical. Smoke / dust greys in effect strips are not plating and are kept;
energy colours (yellow / orange / cyan) follow the skin's glow ramp.
Patterns (stars / glitter / circuit / crystal / embers / rose / aurora) are STATIC deterministic hash placements on
plating pixels, keyed by the cell-local position (no RNG, no animation, never on outline / skin / glow).

Writes assets/syndrome/skins/<tag>/{*.png, machines/*.png, portrait.png}, syndromeSkinTable.js,
docs/syndrome/region_mapping.json, docs/syndrome/skins_contact.png and docs/syndrome/preview_<tag>.png.
Usage: python3 tools/syndrome/build_skins.py
"""
from pathlib import Path
import json, subprocess, hashlib
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/syndrome'
OUT = A / 'skins'
DOC = ROOT / 'docs/syndrome'
SPEC = json.loads((ROOT / 'tools/syndrome/skins.json').read_text())
H = lambda s: np.array([int(s[i:i + 2], 16) for i in (1, 3, 5)], float)
lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

mods = json.loads(subprocess.run(['node', '-e', "import('./syndromeSprites.js').then(m=>console.log(JSON.stringify({a:m.SYNDROME_ANIM,p:m.SYNDROME_PARTS})))"],
                                 cwd=ROOT, capture_output=True, text=True, check=True).stdout)
CELLW = {}
for d in mods['a'].values(): CELLW[Path(d['sheet']).name] = d.get('frameWidth') or d['width']
for d in mods['p'].values(): CELLW['machines/' + Path(d['sheet']).name] = d.get('frameWidth') or d['width']

C = lambda *t: tuple(t)
SKIN = {C(222, 181, 165), C(255, 206, 198), C(255, 239, 222), C(115, 99, 90), C(222, 181, 132)}
GLOW = {C(255, 255, 0), C(255, 123, 0), C(255, 189, 0), C(206, 156, 16), C(247, 189, 24), C(206, 214, 16), C(255, 231, 49),
        C(41, 165, 24), C(57, 255, 57), C(173, 255, 255), C(99, 206, 247), C(90, 181, 231), C(74, 165, 214), C(123, 222, 255),
        C(49, 140, 198), C(132, 231, 255), C(90, 198, 239), C(41, 123, 181), C(16, 99, 156), C(66, 148, 206), C(8, 74, 140),
        C(33, 107, 165)}
ACCENT = {C(231, 16, 49), C(156, 8, 33), C(222, 16, 57), C(148, 16, 41), C(181, 16, 49), C(255, 0, 0), C(173, 0, 0)}
CAMO = {C(74, 82, 49), C(107, 115, 74), C(148, 173, 107), C(82, 123, 74), C(99, 123, 74), C(66, 82, 57), C(148, 173, 115),
        C(90, 99, 90), C(115, 107, 66)}
METAL = {C(198, 189, 198), C(99, 99, 99), C(148, 140, 148), C(165, 165, 173), C(132, 123, 132), C(189, 198, 198),
         C(165, 173, 173), C(214, 222, 222), C(140, 148, 148), C(173, 181, 181), C(231, 231, 239), C(90, 99, 99),
         C(107, 107, 115), C(206, 206, 206), C(41, 41, 49), C(66, 66, 66), C(66, 82, 99), C(181, 181, 189)}
OMNI = {C(0, 0, 90), C(0, 0, 41), C(0, 0, 57), C(16, 0, 115), C(0, 0, 74), C(0, 0, 82), C(90, 66, 148), C(156, 148, 189),
        C(66, 24, 140), C(123, 107, 181), C(66, 41, 156), C(66, 57, 82), C(115, 115, 165)}
VPHULL = {C(41, 66, 99), C(33, 49, 74), C(74, 123, 189), C(0, 57, 123), C(99, 123, 173), C(57, 82, 148)}
BODY = {'suitDark': {C(66, 66, 66)}, 'suitLight': {C(255, 255, 255), C(181, 181, 189)},
        'cape': {C(0, 57, 123), C(74, 99, 165), C(107, 140, 222)},
        'hair': {C(132, 99, 24), C(206, 115, 49), C(222, 165, 33), C(239, 231, 49)}}


def family(name):
    """strip path (relative to assets/syndrome) → family"""
    if not name.startswith('machines/'): return 'body'
    n = name[9:-4]
    if n.startswith(('sp',)): return 'spinner'
    if n.startswith('vp'): return 'velocipod'
    if n.startswith(('drone', 'bomber', 'hatch', 'bomb')): return 'drone'
    if n.startswith(('gun', 'missile', 'ms', 'mortar', 'turret', 'microMissile')): return 'turret'
    if n.startswith(('shell', 'limb', 'leg', 'claw', 'eye', 'laser', 'cannon', 'shaft', 'omni')): return 'omni'
    return 'fx'


def role_of(fam, col):
    if col == (0, 0, 0) or col in SKIN: return None
    if col in GLOW: return 'glow'
    if fam == 'body':
        for r, s in BODY.items():
            if col in s: return r
        return None
    if fam == 'fx': return None   # smoke / dust / debris greys are not plating
    if col in ACCENT: return 'accent'
    if col in CAMO: return 'camo'
    if fam == 'omni' and (col in OMNI or col == (255, 255, 255) or col == (66, 66, 66)): return 'armor'
    if fam == 'velocipod' and col in VPHULL: return 'armor'
    if col in METAL or col == (255, 255, 255): return 'metal'
    return None


def ramp(stops, t):
    a, b, c = (H(s) for s in stops)
    return a + (b - a) * (t / 0.5) if t <= 0.5 else b + (c - b) * ((t - 0.5) / 0.5)


def hsh(*k):
    return int.from_bytes(hashlib.blake2b(repr(k).encode(), digest_size=4).digest(), 'little') / 2 ** 32


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx == 0 and dy == 0: continue
            s = np.roll(np.roll(m, dy, 0), dx, 1)
            if dy > 0: s[:dy] = False
            if dy < 0: s[dy:] = False
            if dx > 0: s[:, :dx] = False
            if dx < 0: s[:, dx:] = False
            out |= s
    return out


STRIPS = sorted([p.name for p in A.glob('*.png')] + ['machines/' + p.name for p in (A / 'machines').glob('*.png')])
# families' role palettes, ranked by luminance (shared by every skin)
PAL = {}
CACHE = {}
for s in STRIPS:
    im = np.array(Image.open(A / s).convert('RGBA'))
    CACHE[s] = im
    fam = family(s)
    cols = {tuple(int(v) for v in c) for c in im[im[..., 3] > 0][:, :3]}
    for col in cols:
        r = role_of(fam, col)
        if r: PAL.setdefault((fam, r), set()).add(col)
RANK = {}
for (fam, r), cols in PAL.items():
    ls = sorted(cols, key=lum)
    lo, hi = lum(ls[0]), lum(ls[-1])
    for col in ls: RANK[(fam, r, col)] = 0.5 if hi - lo < 1 else (lum(col) - lo) / (hi - lo)


def regions(s, im):
    """→ HxW array of role names ('' = keep)."""
    fam = family(s)
    h, w = im.shape[:2]
    a = im[..., 3] > 0
    reg = np.full((h, w), '', dtype=object)
    cols = im[..., :3].astype(int)
    key = cols[..., 0] * 65536 + cols[..., 1] * 256 + cols[..., 2]
    for col in {tuple(int(v) for v in c) for c in im[a][:, :3]}:
        r = role_of(fam, col)
        if r: reg[a & (key == col[0] * 65536 + col[1] * 256 + col[2])] = r
    if fam == 'body':
        pad = np.pad(a, 1, constant_values=False)
        edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        skin = np.zeros_like(a)
        for col in SKIN: skin |= a & (key == col[0] * 65536 + col[1] * 256 + col[2])
        hair = reg == 'hair'
        black = a & (key == 0)
        reg[black & ~edge & ~dilate(skin | hair, 3)] = 'suitDark0'   # the black suit (darkest suit tone)
        reg[(reg == 'suitLight') & dilate(skin, 2)] = ''              # eye whites / face highlights stay
    return reg


def pattern_px(kind, s, x, y, base, R, role):
    """deterministic static pattern value for one plating pixel, or None"""
    if role not in ('metal', 'armor', 'suitDark', 'suitDark0', 'cape', 'camo'): return None
    h = hsh(kind, x, y)
    if kind == 'stars':
        if role in ('suitDark', 'suitDark0', 'armor', 'metal', 'cape') and h < 0.022: return np.array([255, 255, 255.]) if h < 0.012 else H('#b8c0ff')
    elif kind == 'glitter':
        if h < 0.03: return np.minimum(255, H(R['metal'][2]) * 1.0)
    elif kind == 'circuit':
        if role in ('suitDark', 'suitDark0', 'armor', 'metal'):
            gx, gy = x // 9, y // 9
            on = (x % 9 == 0 and hsh('cv', gx, gy) < 0.16) or (y % 9 == 0 and hsh('ch', gx, gy) < 0.16)
            if on: return H(R['glow'][1])
    elif kind == 'crystal':
        if (x + y) % 7 == 0 and hsh('cr', (x - y) // 5, y // 5) < 0.3: return H(R['metal'][2])
    elif kind == 'embers':
        if h < 0.02: return H(R['glow'][1]) if h < 0.012 else H(R['glow'][0])
    elif kind == 'rose':
        if h < 0.018: return H(R['glow'][1])
    elif kind == 'aurora':
        band = ((y + x // 3) // 16) % 3
        tint = [H('#3affb0'), H('#2ad0e8'), H('#a070ff')][band]
        return base * 0.8 + tint * 0.2
    return None


def recolor(s, im, reg, skin):
    R = skin['ramps']
    fam = family(s)
    out = im.copy()
    cw = CELLW.get(s, im.shape[1])
    ys, xs = np.nonzero(reg != '')
    for y, x in zip(ys, xs):
        role = reg[y, x]
        col = tuple(int(v) for v in im[y, x, :3])
        if role == 'suitDark0':
            c = H(R['suitDark'][0])
        else:
            c = ramp(R[role], RANK[(fam, role, col)])
        if skin.get('pattern'):
            p = pattern_px(skin['pattern'], s, x % cw, y, c, R, role)
            if p is not None: c = p
        out[y, x, :3] = np.clip(np.round(c), 0, 255)
    return out


def main():
    table, audit = [], {}
    REG = {s: regions(s, CACHE[s]) for s in STRIPS}
    for s in STRIPS:
        r = REG[s]
        audit[s] = {k: int((r == k).sum()) for k in ('suitDark', 'suitDark0', 'suitLight', 'cape', 'hair', 'metal', 'armor', 'accent', 'camo', 'glow')}
        audit[s]['kept'] = int(((CACHE[s][..., 3] > 0) & (r == '')).sum())
        audit[s]['family'] = family(s)
    for sk in SPEC['skins']:
        d = OUT / sk['tag']
        (d / 'machines').mkdir(parents=True, exist_ok=True)
        for s in STRIPS:
            Image.fromarray(recolor(s, CACHE[s], REG[s], sk), 'RGBA').save(d / s, optimize=True)
        table.append({k: sk[k] for k in ('id', 'tag', 'name', 'classification', 'crossover', 'inspiration', 'hud', 'pattern')})
        print('skin', sk['tag'])
    (ROOT / 'syndromeSkinTable.js').write_text('// Generated by tools/syndrome/build_skins.py from tools/syndrome/skins.json — do not hand-edit.\n'
                                              'export const SYNDROME_SKIN_TABLE = ' + json.dumps(table, indent=1, ensure_ascii=False) + '\n')
    (DOC / 'region_mapping.json').write_text(json.dumps({'roles': {f'{f}:{r}': sorted(map(list, c), key=lambda c: lum(c)) for (f, r), c in sorted(PAL.items())},
                                                        'perStrip': audit}, indent=1))
    contact(SPEC['skins'])


def cell(path, i=0):
    im = Image.open(path).convert('RGBA')
    s = str(path.relative_to(path.parents[1] if path.parent.name == 'machines' else path.parent))
    s = s if path.parent.name == 'machines' else path.name
    cw = CELLW.get(s, im.size[0])
    return im.crop((i * cw, 0, (i + 1) * cw, im.size[1]))


def lineup(base):
    """one arsenal row: Syndrome idle, drone, spinner, gun turret, missile turret, velocipod, Omnidroid shell+claw+eye"""
    parts = [('idle.png', 0, 2), ('machines/droneHover.png', 0, 2), ('machines/spOpen.png', 12, 2), ('machines/gunOpen.png', -1, 2),
             ('machines/msRaise.png', -1, 2), ('machines/vpSide.png', 0, 2), ('machines/shellLower.png', 0, 1), ('machines/claw.png', 0, 2),
             ('machines/eyeOpen.png', -1, 2)]
    ims = []
    for s, i, k in parts:
        p = base / s
        im = Image.open(p).convert('RGBA')
        cw = CELLW.get(s, im.size[0]); n = max(1, im.size[0] // cw); i = i % n
        c = im.crop((i * cw, 0, (i + 1) * cw, im.size[1]))
        bb = c.getbbox()
        if bb: c = c.crop(bb)
        ims.append(c.resize((c.size[0] * k, c.size[1] * k), Image.NEAREST))
    W = sum(i.size[0] for i in ims) + 10 * len(ims) + 10
    Ht = max(i.size[1] for i in ims) + 16
    row = Image.new('RGBA', (W, Ht), (0, 0, 0, 0))
    x = 8
    for i in ims:
        row.alpha_composite(i, (x, Ht - 8 - i.size[1])); x += i.size[0] + 10
    return row


def contact(skins):
    rows = [('Default', '', lineup(A))] + [(s['name'], s['classification'], lineup(OUT / s['tag'])) for s in skins]
    W = max(r[2].size[0] for r in rows) + 230
    Ht = sum(r[2].size[1] for r in rows)
    sheet = Image.new('RGBA', (W, Ht), (34, 36, 44, 255))
    dr = ImageDraw.Draw(sheet)
    y = 0
    for k, (n, cl, r) in enumerate(rows):
        dr.rectangle([0, y, W, y + r.size[1]], fill=(34, 36, 44, 255) if k % 2 == 0 else (52, 54, 66, 255))
        dr.text((8, y + 8), n, fill=(255, 255, 255, 255)); dr.text((8, y + 22), cl, fill=(170, 175, 190, 255))
        sheet.alpha_composite(r, (220, y)); y += r.size[1]
    sheet.save(DOC / 'skins_contact.png')
    for s in skins:
        r = lineup(OUT / s['tag'])
        bg = Image.new('RGBA', r.size, (40, 42, 52, 255)); bg.alpha_composite(r); bg.save(DOC / f"preview_{s['tag']}.png")
    print('contact', sheet.size)


main()
