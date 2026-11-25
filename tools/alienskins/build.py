#!/usr/bin/env python3
"""tools/alienskins/build.py — Ben 10 ALIEN skins for Rick, Rick Prime and Tobirama (cosmetic only).

Every sheet the fighter draws (characters.js animationData) is re-coloured into `<sheet>__<tag>.png` beside it — same size,
same alpha, same frame grid → identical timing / hitboxes / anchors. Read by skins.js recolorSkinAnim(key, tag).

HOW PIXELS ARE SORTED (per character):
  * BODY PALETTE = every colour in the fighter's plain body sheets (stand / walk / run …). A pixel whose colour is NOT in it is
    technique FX (Rick's portal / dodge after-images / gun glow, Tobirama's water) → left byte-identical.
  * Each palette colour gets a ROLE from its hue / saturation / value + where it sits in the frame (rel = 0 head … 1 feet):
        hair · top (lab coat / armour) · inner (shirt / undersuit top) · legs · trim (fur collar, leg wraps) · skin · keep
    keep = outline black, eyes, teeth, buckles.
  * Rick Prime's sheets are a pixel-for-pixel recolour of Rick's, so his roles + shading come from Rick's base sheet.
Each skin maps roles → a ramp (dark → light, shaded by the original pixel's brightness) plus a deterministic texture
(hash of x / y / frame — no randomness): Upgrade circuit traces, Heatblast magma cracks, Diamondhead facets, Alien X stars …
Ben 10 / Albedo skins also stamp an Omnitrix badge on the chest.

    python3 tools/alienskins/build.py [rick|rickPrime|tobirama ...] [--sheets]
"""
import json, os, re, subprocess, sys, colorsys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS = os.path.join(ROOT, 'docs/skins/alien')


def hx(c):
    c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def h3(x, y, z, salt=0):
    v = (int(x) * 374761393 + int(y) * 668265263 + int(z) * 2147483647 + salt * 1274126177) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def ramp(stops, t):
    S = [hx(s) for s in stops]
    t = min(1.0, max(0.0, t)) * (len(S) - 1)
    i = min(int(t), len(S) - 2); f = t - i
    return S[i] * (1 - f) + S[i + 1] * f


def sheets_of(key):
    js = subprocess.run(['node', '-e', f"import('{ROOT}/characters.js').then(m=>{{const c=m.characters['{key}'];const o={{}};"
                         "for(const d of Object.values(c.animationData||{})) if(d?.sheet) o[d.sheet.replace('./','')]=d.width;"
                         "console.log(JSON.stringify(o))})"], capture_output=True, text=True, cwd=ROOT).stdout
    return json.loads(js.strip().splitlines()[-1])


# ── roles ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def hsv(c):
    h, s, v = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255); return h * 360, s, v


def role_rick(c, rel):
    h, s, v = hsv(c)
    if v < 0.06: return 'keep'
    if 188 <= h <= 218 and s >= 0.28: return 'hair'
    if 150 <= h <= 187 and s >= 0.28: return 'inner' if 0.18 < rel < 0.75 else 'keep'
    if 33 <= h <= 50 and s >= 0.45: return 'legs' if rel > 0.45 else 'keep'
    if 15 <= h <= 45 and 0.07 <= s <= 0.45 and v >= 0.25: return 'skin'
    if s < 0.06 and v >= 0.3: return 'top' if rel > 0.2 else 'keep'
    if v < 0.3: return 'keep'
    return 'keep'


def role_tobirama(c, rel):
    h, s, v = hsv(c)
    if v < 0.03: return 'keep'
    if (h <= 8 or h >= 350) and s > 0.4: return 'keep'                       # red eye markings
    if 15 <= h <= 35 and 0.15 <= s <= 0.5 and v >= 0.4: return 'skin'
    if 200 <= h <= 232 and s >= 0.5: return 'top'                              # blue armour
    if 236 <= h <= 250 and s >= 0.3: return 'top'                              # its violet sheen
    if s < 0.32 and v >= 0.3:                                                  # pale blue-grey: hair / fur / wraps
        if rel < 0.15: return 'hair'
        return 'trim'
    if s < 0.35 and v < 0.3: return 'inner' if rel < 0.56 else 'legs'          # black undersuit
    return 'keep'


CHARS = {
    'rick':      dict(role=role_rick, palette=['rick_stand.png', 'rick_walk.png', 'Rick_run.png', 'rick_kick.png', 'rick_taunt.png', 'rick_jump.png'],
                      src_tag=None, out_tag=lambda t: t, portrait='stand'),
    'rickPrime': dict(role=role_rick, palette=['rick_stand.png', 'rick_walk.png', 'Rick_run.png', 'rick_kick.png', 'rick_taunt.png', 'rick_jump.png'],
                      src_tag='rickprime', out_tag=lambda t: 'rickprime__' + t, portrait='stand'),
    'tobirama':  dict(role=role_tobirama, palette=['tobirama_idle_uniform.png', 'tobirama_walk_uniform.png', 'tobirama_run_uniform.png',
                                                   'tobirama_block_uniform.png', 'tobirama_low_kick_uniform.png'],
                      src_tag=None, out_tag=lambda t: t, portrait='head'),
}

# ── the skins ────────────────────────────────────────────────────────────────────────────────────────────────────────
# role → ramp (dark → light) or None (keep). pat = texture. badge = Omnitrix on the chest ('green' / 'red').
BLACK_SUIT = ['#030404', '#0b0e0d', '#1a1f1d', '#2c332f']
U = dict(
    upgrade=dict(name='Upgrade', pat='circuit', glow='#3dff6e', eye='#3dff6e',
                 hair=['#0a3a18', '#18a040', '#5dff8a', '#d8ffe2'], top=BLACK_SUIT, inner=BLACK_SUIT, legs=BLACK_SUIT, trim=BLACK_SUIT,
                 skin=['#050807', '#101a14', '#1f2c24', '#33443a']),
    ben10=dict(name='Ben 10 — Alien Force', pat='stripe', badge='green',
               hair=['#2a1608', '#5a3416', '#8a5a2c', '#b8844c'], top=['#0c2a0e', '#1c5e1e', '#3c9a36', '#8ad87a'],
               inner=['#08080a', '#16161a', '#2a2a30', '#44444c'], legs=['#0e1a30', '#22385e', '#3e5a8a', '#7090c0'],
               trim=['#0c2a0e', '#1c5e1e', '#3c9a36', '#8ad87a'], skin=None),
    albedo=dict(name='Albedo — Negative Ten', pat='stripe', badge='red',
                hair=['#6a6a74', '#b4b4bc', '#e8e8ee', '#ffffff'], top=['#2a0408', '#6e0a14', '#b8182a', '#ff5a5a'],
                inner=['#060606', '#121214', '#24242a', '#3a3a42'], legs=['#0e0e12', '#1e1e24', '#34343c', '#50505a'],
                trim=['#2a0408', '#6e0a14', '#b8182a', '#ff5a5a'], skin=None, eye='#ff2a2a'),
    heatblast=dict(name='Heatblast', pat='magma', crack=['#ff4a00', '#ff9a10', '#ffe060'],
                   hair=['#8a1000', '#ff4a00', '#ffa020', '#fff0a0'], top=['#0e0302', '#2a0a04', '#4e1608', '#7a2a10'],
                   inner=['#0e0302', '#2a0a04', '#4e1608', '#7a2a10'], legs=['#0a0201', '#220804', '#3e1206', '#62220c'],
                   trim=['#8a1000', '#ff4a00', '#ffa020', '#fff0a0'], skin=['#7a1400', '#d84000', '#ff8a10', '#ffd040'], eye='#fff6c0'),
    diamondhead=dict(name='Diamondhead', pat='facet',
                     hair=['#0a5a40', '#22c890', '#8affd8', '#f0fffa'], top=['#04281c', '#0a6a48', '#1eb07c', '#7ef0c4'],
                     inner=['#031c14', '#075238', '#138e62', '#4ed8a4'], legs=['#02160f', '#06402c', '#0e7450', '#38c08c'],
                     trim=['#0a5a40', '#22c890', '#8affd8', '#f0fffa'], skin=['#0a4a34', '#16a072', '#5ae8b8', '#d0fff0'], eye='#eafff6'),
    alienx=dict(name='Alien X', full='stars'),
    alienx_half=dict(name='Alien X — Half', full='half'),
    bigchill=dict(name='Big Chill', pat='frost',
                  hair=['#2a4a8a', '#6aa0e0', '#c0e4ff', '#ffffff'], top=['#030a1c', '#0a2048', '#1c4a8a', '#4a8ad0'],
                  inner=['#0a2a4a', '#2a7ab0', '#7ad8f8', '#e0fbff'], legs=['#02061a', '#081a3a', '#143066', '#2a5096'],
                  trim=['#2a4a8a', '#6aa0e0', '#c0e4ff', '#ffffff'], skin=['#2a4a8a', '#4a74c0', '#80aaee', '#c4dcff'], eye='#7affff'),
    ghostfreak=dict(name='Ghostfreak', pat='ghost',
                    hair=['#06060a', '#141420', '#24203a', '#3a3058'], top=['#6a6a76', '#a8a8b4', '#dcdce4', '#ffffff'],
                    inner=['#0a080e', '#1a1424', '#2e2440', '#4a3a66'], legs=['#08080c', '#16141e', '#2a2636', '#423c54'],
                    trim=['#6a6a76', '#a8a8b4', '#dcdce4', '#ffffff'], skin=['#8a8a94', '#b8b8c2', '#e0e0e8', '#ffffff'], eye='#b04aff'),
    xlr8=dict(name='XLR8', pat='speed',
              hair=['#02040a', '#0a1428', '#14284e', '#24467e'], top=['#02060e', '#0a1a3a', '#1a3e80', '#3c7ae0'],
              inner=['#020204', '#0a0a10', '#16161e', '#262632'], legs=['#020306', '#081430', '#123066', '#2a5ab0'],
              trim=['#02060e', '#0a1a3a', '#1a3e80', '#3c7ae0'], skin=['#05070c', '#0e1424', '#1c2844', '#344a72'], eye='#4ae8ff'),
)
# Rick Prime = Rick's evil double → the NEGATIVE aliens (Albedo's red / black Omnitrix line-up), plus Alien X.
NEG = dict(
    upgrade=dict(U['upgrade'], name='Negative Upgrade', glow='#ff2a3a', eye='#ff2a3a', hair=['#3a0408', '#a0101e', '#ff4a5a', '#ffd8dc']),
    albedo=U['albedo'],
    ben10=dict(U['ben10'], name='Ben 10 — Omniverse', top=['#0e0e10', '#1e1e22', '#3a3a40', '#6a6a72'], trim=['#0a3a10', '#1a8a2a', '#3ad04a', '#a0ffa0'],
               inner=['#0a3a10', '#1a8a2a', '#3ad04a', '#a0ffa0'], pat='stripe'),
    heatblast=dict(U['heatblast'], name='Negative Heatblast', crack=['#2a6aff', '#7ab8ff', '#e8f6ff'],
                   hair=['#0a1a6a', '#2a5aff', '#8ac0ff', '#ffffff'], trim=['#0a1a6a', '#2a5aff', '#8ac0ff', '#ffffff'],
                   skin=['#0a1a5a', '#2a50d0', '#70a8ff', '#e0f0ff'], eye='#ffffff'),
    diamondhead=dict(U['diamondhead'], name='Negative Diamondhead',
                     hair=['#5a0a14', '#c8223a', '#ff8a9a', '#fff0f2'], top=['#28040a', '#6a0a1a', '#b01e34', '#f07e90'],
                     inner=['#1c0308', '#520716', '#8e1328', '#d84e64'], legs=['#16020a', '#40061a', '#740e26', '#c03852'],
                     trim=['#5a0a14', '#c8223a', '#ff8a9a', '#fff0f2'], skin=['#4a0a14', '#a01630', '#e85a72', '#ffd0d8'], eye='#fff0f2'),
    alienx=U['alienx'], alienx_half=U['alienx_half'],
    bigchill=dict(U['bigchill'], name='Ultimate Big Chill', pat='frost',
                  top=['#06020e', '#1a0a2e', '#3a1a66', '#7a4ac0'], inner=['#2a0a3a', '#6a1a8a', '#c04ae0', '#ffd0ff'],
                  hair=['#3a0a4a', '#8a2ab0', '#e08aff', '#ffffff'], trim=['#3a0a4a', '#8a2ab0', '#e08aff', '#ffffff'],
                  skin=['#1a1040', '#3a2a80', '#7a6ad0', '#d0c8ff'], eye='#ff6aff'),
    ghostfreak=dict(U['ghostfreak'], name='Zs\'Skayr'),
    xlr8=dict(U['xlr8'], name='Negative XLR8', top=['#0e0204', '#3a0610', '#80101e', '#e03a4a'], legs=['#0a0204', '#2a0610', '#5e0e1a', '#b02a3a'],
              trim=['#0e0204', '#3a0610', '#80101e', '#e03a4a'], eye='#ff4a5a'),
)
SKINS = {'rick': U, 'tobirama': U, 'rickPrime': NEG}
ORDER = ['upgrade', 'ben10', 'albedo', 'heatblast', 'diamondhead', 'alienx', 'alienx_half', 'bigchill', 'ghostfreak', 'xlr8']


# ── per-sheet work ───────────────────────────────────────────────────────────────────────────────────────────────────
def body_palette(ch):
    pal = set()
    for f in CHARS[ch]['palette']:
        a = np.array(Image.open(os.path.join(ROOT, f)).convert('RGBA'))
        pal |= {tuple(int(v) for v in p[:3]) for p in a[a[..., 3] > 0]}
    return pal


def frame_rel(a_body, fw):
    """per-pixel rel height (0 head … 1 feet) inside each frame, from the BODY pixels only (FX ignored)"""
    H, W = a_body.shape; rel = np.zeros((H, W), np.float32)
    for x0 in range(0, W, fw):
        rows = np.nonzero(a_body[:, x0:x0 + fw].any(1))[0]
        if not rows.size: continue
        top, bot = rows[0], rows[-1]
        rel[:, x0:x0 + fw] = ((np.arange(H) - top) / max(1, bot - top))[:, None]
    return rel


def classify(arr, fw, ch, pal):
    rgb = arr[..., :3]; on = arr[..., 3] > 0
    key = rgb[..., 0].astype(np.int64) * 65536 + rgb[..., 1].astype(np.int64) * 256 + rgb[..., 2]
    palk = np.array(sorted(r * 65536 + g * 256 + b for r, g, b in pal), np.int64)
    inpal = on & np.isin(key, palk)
    rel = frame_rel(inpal, fw)
    role = np.full(on.shape, '', object)
    cache = {}
    ys, xs = np.nonzero(inpal)
    for y, x in zip(ys, xs):
        c = tuple(int(v) for v in rgb[y, x]); rb = round(float(rel[y, x]), 2)
        k = (c, rb)
        if k not in cache: cache[k] = CHARS[ch]['role'](c, rb)
        role[y, x] = cache[k]
    L = (rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114)
    return role, L.astype(np.float32), rel, inpal


def role_norm(role, L):
    """per role: (lo, hi) brightness range → shading t in [0, 1]"""
    out = {}
    for r in ('hair', 'top', 'inner', 'legs', 'trim', 'skin'):
        m = role == r
        if m.any(): out[r] = (float(np.percentile(L[m], 2)), float(np.percentile(L[m], 98)) + 1)
    return out


def tex(sk, r, c, t, x, y, fi):
    p = sk.get('pat')
    if p is None or r == 'skin' and p not in ('magma', 'facet', 'frost'): return c
    if p == 'circuit' and r != 'hair':                                       # Upgrade: green circuit traces on black
        g = hx(sk['glow'])
        cx, cy = x // 5, y // 6
        hor = (y % 6 == 0) and h3(cx, cy, 0, 3) > 0.45
        ver = (x % 5 == 0) and h3(cx, cy, 1, 4) > 0.55
        node = (x % 5 == 0) and (y % 6 == 0) and h3(cx, cy, 2, 5) > 0.6
        if node: return g * 0.4 + hx('#ffffff') * 0.6
        if hor or ver: return c * 0.25 + g * (0.6 + 0.3 * t)
        return c
    if p == 'magma' and r in ('top', 'inner', 'legs'):                       # Heatblast: rock plates split by glowing cracks
        cx, cy = (x + int(h3(y // 4, 0, 0, 7) * 3)) // 4, (y + int(h3(x // 4, 0, 0, 8) * 3)) // 4
        best = [9e9, 9e9]
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                px_ = (cx + dx) * 4 + h3(cx + dx, cy + dy, 0, 9) * 4; py_ = (cy + dy) * 4 + h3(cx + dx, cy + dy, 1, 9) * 4
                d = (px_ - x) ** 2 + (py_ - y) ** 2
                if d < best[0]: best = [d, best[0]]
                elif d < best[1]: best[1] = d
        edge = best[1] ** 0.5 - best[0] ** 0.5
        if edge < 0.9: return ramp(sk['crack'], 0.4 + 0.6 * h3(x, y, 0, 10))
        return c
    if p == 'facet':                                                          # Diamondhead: crystal facets + glints
        a = ((x + y) // 4) % 2; b = ((x - y) // 4) % 2
        k = 0.82 + 0.28 * (a ^ b) + 0.08 * (((x + 2 * y) // 3) % 2)
        c = c * k
        if h3(x, y, fi // 6, 12) > 0.975: return hx('#ffffff')
        return c
    if p == 'frost':
        if h3(x, y, 0, 13) > 0.965: return hx('#e8ffff')
        return c
    if p == 'ghost' and r in ('top', 'trim'):                                 # Ghostfreak: black stripes curling over the white
        if ((x * 2 + y + int(3 * np.sin(y * 0.35))) % 11) < 2: return hx('#0a0810') * 0.6 + c * 0.1
        return c
    if p == 'speed' and r in ('top', 'legs', 'trim'):                         # XLR8: black racing stripes
        if (y + x // 3) % 9 < 1: return hx('#000000')
        return c
    if p == 'stripe' and r == 'top':                                          # Ben's jacket stripe
        return c
    return c


def omnitrix(out, cx, cy, col):
    """5×5 Omnitrix badge: dark ring, coloured hourglass"""
    G = hx('#3dff4a') if col == 'green' else hx('#ff2a2a')
    D = hx('#0a0a0a'); Hh = G * 0.55 + hx('#ffffff') * 0.45
    pat = ['.ddd.', 'dGHGd', 'ddGdd', 'dGHGd', '.ddd.']
    for j, row in enumerate(pat):
        for i, ch_ in enumerate(row):
            y, x = cy - 2 + j, cx - 2 + i
            if ch_ == '.' or not (0 <= y < out.shape[0] and 0 <= x < out.shape[1]) or out[y, x, 3] == 0: continue
            out[y, x, :3] = {'d': D, 'G': G, 'H': Hh}[ch_]


def full_alien(arr, fw, role, L, inpal, half):
    out = arr.copy(); a = arr[..., 3]; H = a.shape[0]
    edge_pad = np.pad(a > 0, 1)
    edge = ~(edge_pad[:-2, 1:-1] & edge_pad[2:, 1:-1] & edge_pad[1:-1, :-2] & edge_pad[1:-1, 2:])
    seams = []
    for i in range(-(-a.shape[1] // fw)):
        fr = inpal[:, i * fw:(i + 1) * fw]; rows = np.nonzero(fr.any(1))[0]
        if not rows.size: seams.append(None); continue
        h = rows[-1] - rows[0]; mids = []
        for y in range(rows[0], rows[0] + max(4, int(h * 0.6))):
            xs = np.nonzero(fr[y])[0]
            if xs.size: mids.append((xs[0] + xs[-1]) / 2)
        seams.append(float(np.median(mids)) if mids else fw / 2)
    ys, xs = np.nonzero(inpal)
    for y, x in zip(ys, xs):
        r = role[y, x]; fi, lx = x // fw, x % fw
        if half:
            if seams[fi] is None or lx >= seams[fi]: continue
        if r == 'keep' and (L[y, x] < 20 or edge[y, x]): continue
        t = float(L[y, x]) / 255.0
        if r == 'hair': c = ramp(['#7d8296', '#cfd3de', '#f4f6fa', '#ffffff'], min(1.0, t * 1.7))
        elif r == 'keep': c = hx('#4dff6a') if L[y, x] > 150 else hx('#0a0a14')           # eyes → Alien X green
        else:
            neb = 0.5 + 0.5 * np.sin(lx * 0.21 + y * 0.13) * np.cos(lx * 0.09 - y * 0.17)
            c = ramp(['#000000', '#020309', '#060814', '#0d1128'], t ** 1.5) + hx('#1a1240') * 0.2 * neb * (0.3 + t)
            v = h3(lx, y, fi // 4, 11)
            if v > 0.982: c = hx('#ffffff')
            elif v > 0.968: c = hx('#dfe8ff') * 0.85
            elif v > 0.958: c = hx('#7fc8ff') * 0.7
            elif v > 0.95: c = hx('#a98cff') * 0.5
            if t > 0.78: k = (t - 0.78) / 0.22; c = c * (1 - 0.2 * k) + hx('#9fb4ff') * 0.2 * k
        if half and seams[fi] - 1 <= lx < seams[fi]: c = c * 0.4 + hx('#ffffff') * 0.6
        out[y, x, :3] = np.clip(np.round(c), 0, 255).astype(np.uint8)
    return out


def recolor(arr, fw, sk, role, L, rel, inpal, norms):
    if sk.get('full'): return full_alien(arr, fw, role, L, inpal, sk['full'] == 'half')
    out = arr.copy()
    ys, xs = np.nonzero(inpal)
    for y, x in zip(ys, xs):
        r = role[y, x]
        if r == 'keep':
            if sk.get('eye') and rel[y, x] < 0.2 and L[y, x] > 200 and False: pass
            continue
        stops = sk.get(r)
        if stops is None: continue
        lo, hi = norms.get(r, (0, 256))
        t = (float(L[y, x]) - lo) / max(1.0, hi - lo)
        c = ramp(stops, t)
        c = tex(sk, r, c, t, x % fw, y, x // fw)
        out[y, x, :3] = np.clip(np.round(c), 0, 255).astype(np.uint8)
    if sk.get('badge'):
        for i in range(-(-arr.shape[1] // fw)):
            sl = slice(i * fw, (i + 1) * fw)
            chest = np.isin(role[:, sl], ['inner', 'top']) & (rel[:, sl] > 0.26) & (rel[:, sl] < 0.42)
            ys_, xs_ = np.nonzero(chest)
            if ys_.size < 12: continue
            omnitrix(out, i * fw + int(np.median(xs_)), int(np.median(ys_)), sk['badge'])
    return out


def build_char(ch):
    C = CHARS[ch]; pal = body_palette(ch); sheets = sheets_of(ch if ch != 'rickPrime' else 'rick')
    made = []
    for tag in ORDER:
        sk = SKINS[ch][tag]; ot = C['out_tag'](tag)
        for name, fw in sheets.items():
            base = np.array(Image.open(os.path.join(ROOT, name)).convert('RGBA'))
            role, L, rel, inpal = classify(base, fw, ch, pal)
            norms = role_norm(role, L)
            out = recolor(base, fw, sk, role, L, rel, inpal, norms)
            if C['src_tag']:   # Rick Prime: FX / untouched pixels come from HIS sheet, re-coloured body from the alien
                prime = np.array(Image.open(os.path.join(ROOT, name[:-4] + '__' + C['src_tag'] + '.png')).convert('RGBA'))
                changed = (out != base).any(-1)
                out = np.where(changed[..., None], out, prime)
            Image.fromarray(out).save(os.path.join(ROOT, name[:-4] + '__' + ot + '.png'), optimize=True)
        portrait(ch, sheets, ot)
        made.append((tag, ot, sk['name']))
        print(f'  {ch:9s} {ot:24s} {sk["name"]}')
    return made


def portrait(ch, sheets, ot):
    if CHARS[ch]['portrait'] == 'stand':      # Rick / Rick Prime: the recoloured stand frame ×3 (like the old creative set)
        st = Image.open(os.path.join(ROOT, 'rick_stand__' + ot + '.png')).convert('RGBA')
        f0 = st.crop((0, 0, 30, st.height)); bb = f0.getbbox()
        if bb: f0 = f0.crop((max(0, bb[0] - 2), max(0, bb[1] - 2), min(f0.width, bb[2] + 2), min(f0.height, bb[3] + 2)))
        f0.resize((f0.width * 3, f0.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'rick_portrait__' + ot + '.png'))
    else:                                     # Tobirama: head + chest of the recoloured idle frame on his portrait's dark plate
        idle = Image.open(os.path.join(ROOT, 'tobirama_idle_uniform__' + ot + '.png')).convert('RGBA')
        f0 = idle.crop((0, 0, 39, idle.height)); bb = f0.getbbox()
        f0 = f0.crop((max(0, bb[0] - 1), max(0, bb[1] - 1), min(39, bb[2] + 1), bb[1] + 44))
        k = max(1, min(128 // f0.width, 120 // f0.height))
        big = f0.resize((f0.width * k, f0.height * k), Image.NEAREST)
        plate = Image.new('RGBA', (128, 128), (11, 22, 40, 255))
        plate.alpha_composite(big, ((128 - big.width) // 2, 128 - big.height))
        plate.save(os.path.join(ROOT, 'tobirama_portrait__' + ot + '.png'))


def contact(ch, made):
    os.makedirs(DOCS, exist_ok=True)
    stand = {'rick': ('rick_stand', 30), 'rickPrime': ('rick_stand', 30), 'tobirama': ('tobirama_idle_uniform', 39)}[ch]
    acts = {'rick': [('rick_walk', 30), ('rick_kick', None), ('rick_gun', None)], 'rickPrime': [('rick_walk', 30), ('rick_kick', None), ('rick_gun', None)],
            'tobirama': [('tobirama_walk_uniform', 47), ('tobirama_attack_combo_2_uniform', None), ('tobirama_foward_water_slash_uniform', None)]}[ch]
    sheets = sheets_of(ch if ch != 'rickPrime' else 'rick')
    cols = [stand] + [(n, sheets.get(n + '.png') or w) for n, w in acts]
    base_t = 'rickprime' if ch == 'rickPrime' else None
    rows = [('default', base_t)] + [(nm, ot) for _, ot, nm in made]
    tiles = []
    for nm, ot in rows:
        row = []
        for n, w in cols:
            if not w: continue
            p = os.path.join(ROOT, n + ('__' + ot if ot else '') + '.png')
            if not os.path.exists(p): continue
            im = Image.open(p).convert('RGBA'); idx = 3 if 'attack' in n or 'kick' in n or 'gun' in n or 'slash' in n else 0
            idx = min(idx, im.width // w - 1)
            row.append(im.crop((idx * w, 0, idx * w + w, im.height)).resize((w * 2, im.height * 2), Image.NEAREST))
        tiles.append((nm, row))
    W = max(sum(t.width + 6 for t in r) for _, r in tiles) + 170; Hh = sum(max(t.height for t in r) + 6 for _, r in tiles)
    sh = Image.new('RGBA', (W, Hh), (48, 50, 60, 255)); dr = ImageDraw.Draw(sh); y = 0
    for nm, r in tiles:
        dr.text((6, y + 8), nm, fill=(240, 240, 240, 255)); x = 170
        for t in r: sh.alpha_composite(t, (x, y)); x += t.width + 6
        y += max(t.height for t in r) + 6
    p = os.path.join(DOCS, f'contact_{ch}.png'); sh.save(p); print('  sheet', os.path.relpath(p, ROOT))


def main():
    chars = [a for a in sys.argv[1:] if a in CHARS] or list(CHARS)
    for ch in chars:
        made = build_char(ch); contact(ch, made)


if __name__ == '__main__':
    main()
