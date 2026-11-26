#!/usr/bin/env python3
"""tools/creativeskins/build.py — CREATIVE skins for any fighter (cosmetic only), each one inspired by another fighter in the
roster. Generalises tools/originalskins/build.py (Omololu / Dseyl / Enoch) to the whole roster:

  * BODY PALETTE = every colour in the fighter's plain body sheets (idle / walk / run / guard / crouch / jump …).
    A pixel whose colour is NOT in it is technique FX and stays byte-identical.
  * Palette colours are sorted into REGIONS automatically:
        keep  = outline black, eye glints, tiny accents (< 6 px)          → untouched
        skin  = natural skin tones                                         → untouched (faces stay natural)
        hair  = colours that live at the top of the frame (head)
        A/B/C/D = the remaining colour families (by hue, or dark / light neutrals), biggest area first
    Per-character overrides (OVR) can pin colours to a region when the automatic split needs help.
  * A skin THEME maps regions → dark→light ramps (shaded by each pixel's original brightness inside its region) plus a
    deterministic texture (hash of x / y / frame, never random): Akatsuki clouds, Zenitsu triangles, flame hems, sakura,
    lightning, magma cracks, crystal facets, frost, web lines, circuit traces, Alien X starfield …
Every sheet → `<sheet>__<tag>.png` beside it (same size / alpha / grid → identical timing, hitboxes, anchors), read by
skins.js recolorSkinAnim(key, tag) through creativeSkins.js (written by this tool). Portrait → `<portrait>__<tag>.png`.

    python3 tools/creativeskins/build.py KEY [KEY ...] [--n 10] [--only tag,tag] [--manifest]
"""
import json, os, re, subprocess, sys, colorsys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS = os.path.join(ROOT, 'docs/skins/creative')
MANIFEST = os.path.join(ROOT, 'tools/creativeskins/manifest.json')


def hx(c):
    c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def H3(x, y, z, salt=0):
    """vectorised integer hash → [0, 1)"""
    x = np.asarray(x, np.int64) & 0xFFFFFFFF; y = np.asarray(y, np.int64) & 0xFFFFFFFF; z = np.asarray(z, np.int64) & 0xFFFFFFFF
    v = (x * 374761393 + y * 668265263 + z * 2147483647 + salt * 1274126177) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def ramp_v(stops, t):
    S = np.stack([hx(s) for s in stops]); n = len(S) - 1
    t = np.clip(t, 0, 1) * n; i = np.minimum(t.astype(int), n - 1); f = (t - i)[..., None]
    return S[i] * (1 - f) + S[i + 1] * f


def node_json(js):
    out = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, cwd=ROOT)
    if out.returncode: raise SystemExit(out.stderr[-800:])
    return json.loads(out.stdout.strip().splitlines()[-1])


def char_info(key):
    return node_json(f"""const {{ characters }} = await import('{ROOT}/characters.js'); const c = characters['{key}'];
const sheets = {{}}; const acts = {{}}; const hts = {{}};
for (const [a, d] of Object.entries(c.animationData || {{}})) if (d?.sheet) {{ const s = d.sheet.replace(/^\\.\\//, ''); sheets[s] = d.width || 0; hts[s] = d.height || 0; (acts[s] = acts[s] || []).push(a) }}
console.log(JSON.stringify({{ name: c.name, portrait: c.portrait || null, sheets, acts, hts }}))""")


# ── region split ─────────────────────────────────────────────────────────────────────────────────────────────────────
PLAIN = ('idle', 'walk', 'run', 'guard', 'block', 'crouch', 'jump', 'fall', 'stand', 'hurt', 'walk_back', 'dash')


def hsv(c):
    h, s, v = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255); return h * 360, s, v


SKP = dict(h=(4, 42), s=(0.16, 0.8), v=0.26, dark=False)


def is_skin(c):
    h, s, v = hsv(c)
    if SKP['h'][0] < 0 and h >= 360 + SKP['h'][0] and SKP['s'][0] <= s <= SKP['s'][1] and v >= SKP['v']: return True
    if SKP['h'][0] <= h <= SKP['h'][1] and SKP['s'][0] <= s <= SKP['s'][1] and v >= SKP['v']: return True
    if SKP['dark'] and 0 <= h <= 38 and 0.22 <= s <= 0.85 and 0.13 <= v: return True
    return (4 <= h <= 42 and 0.16 <= s <= 0.72 and v >= 0.26) or (6 <= h <= 40 and 0.08 <= s < 0.16 and v >= 0.62)   # + pale skin


def frame_rel(mask, fw, fh=0):
    H, W = mask.shape; rel = np.zeros((H, W), np.float32)
    if fh and H > 2 * fh:   # ATLAS (one sheet, many animations at different sourceY): rel inside each band of non-empty rows
        occ = mask.any(1); y = 0
        while y < H:
            if not occ[y]: y += 1; continue
            y1 = y
            while y1 < H and occ[y1]: y1 += 1
            rel[y:y1] = ((np.arange(y, y1) - y) / max(1, y1 - 1 - y))[:, None]; y = y1
        return rel
    fh = fh if fh and fh < H else H
    for y0 in range(0, H, fh):
        for x0 in range(0, W, fw):
            rows = np.nonzero(mask[y0:y0 + fh, x0:x0 + fw].any(1))[0]
            if not rows.size: continue
            rel[y0:y0 + fh, x0:x0 + fw] = ((np.arange(y0, min(H, y0 + fh)) - y0 - rows[0]) / max(1, rows[-1] - rows[0]))[:, None]
    return rel


Q = 1


def ckey(rgb):
    q = (rgb.astype(np.int64) // Q) * Q
    return q[..., 0] * 65536 + q[..., 1] * 256 + q[..., 2]


def regions(key, info, ovr):
    """palette colour (int key) → region name"""
    plain = [s for s, acts in info['acts'].items() if any(a in PLAIN for a in acts)] or list(info['sheets'])[:3]
    stats = {}
    for s in plain:
        p = os.path.join(ROOT, s)
        if not os.path.exists(p): continue
        a = np.array(Image.open(p).convert('RGBA')); fw = info['sheets'][s] or a.shape[1]
        on = a[..., 3] > 0; rel = frame_rel(on, fw, info['hts'].get(s, 0)); k = ckey(a[..., :3])
        for kk, rr in zip(k[on].tolist(), rel[on].tolist()):
            st = stats.setdefault(kk, [0, 0.0]); st[0] += 1; st[1] += rr
    total = sum(v[0] for v in stats.values()) or 1
    global Q
    if len(stats) > 300 and 'q' not in ovr and Q == 1:   # PAINTED sprite (hundreds of near-identical shades): group them
        Q = 10; return regions(key, info, ovr)
    reg = {}; fam = {}
    for kk, (n, rs) in stats.items():
        c = ((kk >> 16) & 255, (kk >> 8) & 255, kk & 255); h, s, v = hsv(c); mrel = rs / n
        hexc = '#%02x%02x%02x' % c
        if hexc in ovr.get('force', {}): reg[kk] = ovr['force'][hexc]; continue
        if v < 0.085 or n < 6 or n / total < 0.0008: reg[kk] = 'keep'; continue
        if is_skin(c) and not ovr.get('noskin'): reg[kk] = 'skin'; continue
        if (h <= 12 or h >= 345) and s > 0.55 and v > 0.5 and n / total < 0.004: reg[kk] = 'keep'; continue   # eyes / sharingan
        if mrel < ovr.get('hairrel', 0.16): reg[kk] = 'hair'; continue
        if s < 0.16: f = 'n_dark' if v < 0.42 else 'n_light'
        else: f = int(((h + 15) % 360) // 30)
        fam.setdefault(f, []).append((kk, n))
        reg[kk] = f
    # merge hue families: biggest families become A, B, C, D (rest join the nearest by rank → D)
    order = sorted(fam, key=lambda f: -sum(n for _, n in fam[f]))
    names = {}
    for i, f in enumerate(order): names[f] = 'ABCD'[min(i, 3)]
    for kk, r in list(reg.items()):
        if r in names: reg[kk] = names[r]
    for hexc, r in ovr.get('force', {}).items(): reg[int(hexc[1:], 16)] = r
    return reg


# ── themes ───────────────────────────────────────────────────────────────────────────────────────────────────────────
BLACK = ['#050506', '#101014', '#1e1e24', '#34343c']
CHAR = ['#08080c', '#18161e', '#2c2834', '#48404e']
WHITE = ['#8a8a94', '#c4c4cc', '#e8e8ee', '#ffffff']
NAVY = ['#040818', '#0c1838', '#1c3066', '#3a56a0']
RED = ['#3a0408', '#8a0e16', '#d01e28', '#ff6a5a']
GOLD = ['#4a2e04', '#a06a0a', '#e0a81e', '#fff08a']
ORANGE = ['#5a1e02', '#c04e06', '#ff8a1a', '#ffd08a']
BLUE = ['#06123a', '#14328a', '#2a62d8', '#8ab8ff']
CYAN = ['#043a4a', '#0a8aa8', '#3ae0ff', '#e0ffff']
PURPLE = ['#1a0630', '#4a1680', '#8a3ad8', '#e0b0ff']
PINK = ['#4a0a2a', '#a01e5a', '#ff5aa0', '#ffd0e8']
YELLOW = ['#5a3a02', '#c08a08', '#ffd21e', '#fff6b0']
GREEN = ['#0c2a0e', '#1c5e1e', '#3c9a36', '#8ad87a']
TEAL = ['#02262a', '#0a5a60', '#1aa0a0', '#7ae8e0']
SILVER = ['#4a4e5a', '#8a90a0', '#c8cedc', '#ffffff']
ROSEHAIR = ['#3a0828', '#a0186a', '#ff5ab8', '#ffd0f0']
BLOND = ['#6a4a0a', '#c09a2a', '#f0d26a', '#fff6c8']
FIREHAIR = ['#8a1a02', '#e05a08', '#ffc21e', '#fff2a0']
ICE = ['#0a2a4a', '#2a7ab0', '#7ad8f8', '#e0fbff']

# tag: (display name, inspired-by key(s) — never given to those fighters, spec)
THEMES = {
    'rose':          ('Rosé', ('goku_black',), dict(pat='aura', glint='#ff8ad8', hair=ROSEHAIR, A=CHAR, B=CHAR, C=PINK, D=ROSEHAIR)),
    'hollowpurple':  ('Hollow Purple', ('gojo', 'gojo_shinjuku'), dict(pat='void', hair=WHITE, A=['#04040e', '#0c0c22', '#1a1a3e', '#30305e'],
                                                                     B=['#04040e', '#0c0c22', '#1a1a3e', '#30305e'], C=PURPLE, D=PURPLE)),
    'akatsuki':      ('Akatsuki', ('itachi', 'pain', 'obito', 'tobi', 'six_paths_pain'), dict(pat='clouds', hair=BLACK, A=BLACK, B=BLACK, C=RED, D=RED)),
    'flamehashira':  ('Flame Hashira', ('rengoku',), dict(pat='hemflame', flame=['#8a0a02', '#ff3a06', '#ffb01a'], hair=FIREHAIR, A=WHITE, B=BLACK, C=ORANGE, D=BLACK)),
    'thunderclap':   ('Thunderclap', ('zenitsu',), dict(pat='triangles', hair=['#8a3a02', '#e08a0a', '#ffd21e', '#fff6b0'], A=YELLOW, B=BLACK, C=WHITE, D=WHITE)),
    'magmacore':     ('Magma Core (Heatblast)', (), dict(pat='magma', crack=['#ff4a00', '#ff9a10', '#ffe060'], hair=['#8a1000', '#ff4a00', '#ffa020', '#fff0a0'],
                                                         A=['#0e0302', '#2a0a04', '#4e1608', '#7a2a10'], B=['#0a0201', '#220804', '#3e1206', '#62220c'],
                                                         C=['#8a1000', '#ff4a00', '#ffa020', '#fff0a0'], D=['#3a0a02', '#7a1a04', '#c03a08', '#ff7a1a'])),
    'crystal':       ('Crystal (Diamondhead)', (), dict(pat='facet', hair=['#0a5a40', '#22c890', '#8affd8', '#f0fffa'], A=['#04281c', '#0a6a48', '#1eb07c', '#7ef0c4'],
                                                        B=['#031c14', '#075238', '#138e62', '#4ed8a4'], C=['#0a5a40', '#22c890', '#8affd8', '#f0fffa'],
                                                        D=['#0a5a40', '#22c890', '#8affd8', '#f0fffa'])),
    'bigchill':      ('Deep Freeze (Big Chill)', (), dict(pat='frost', hair=['#2a4a8a', '#6aa0e0', '#c0e4ff', '#ffffff'], A=['#030a1c', '#0a2048', '#1c4a8a', '#4a8ad0'],
                                                          B=['#02061a', '#081a3a', '#143066', '#2a5096'], C=ICE, D=['#2a4a8a', '#6aa0e0', '#c0e4ff', '#ffffff'])),
    'sage':          ('Sage Mode', ('naruto', 'naruto_seventh', 'minato', 'jiraiya'), dict(pat='hemflame', flame=['#5a0602', '#c01a06', '#ff5a10'], hair=GOLD, A=ORANGE,
                                                                                         B=['#0a0a14', '#16162a', '#262648', '#3e3e6e'], C=RED, D=RED)),
    'homelander':    ('Homelander', ('homelander',), dict(emblem='eagle', hair=BLOND, A=NAVY, B=NAVY, C=RED, D=GOLD)),
    'manofsteel':    ('Man of Steel', ('superman',), dict(emblem='shield', hair=BLACK, A=BLUE, B=BLUE, C=RED, D=YELLOW)),
    'godspeed':      ('Godspeed', ('killua',), dict(pat='lightning', bolt='#a8f4ff', hair=WHITE, A=['#0a1a3a', '#1a3a7a', '#3a6ac0', '#9ad0ff'], B=NAVY, C=CYAN, D=CYAN)),
    'senbonzakura':  ('Senbonzakura', ('byakuya',), dict(pat='sakura', hair=BLACK, A=WHITE, B=BLACK, C=PINK, D=SILVER)),
    'ultrainstinct': ('Ultra Instinct', ('goku',), dict(pat='aura', glint='#e8f0ff', hair=SILVER, A=['#06102a', '#12285a', '#24468e', '#4a72c0'], B=ORANGE, C=NAVY, D=SILVER)),
    'ssblue':        ('Super Saiyan Blue', ('goku', 'vegeta'), dict(pat='aura', glint='#8af0ff', hair=CYAN, A=['#06103a', '#122a7a', '#2450c8', '#6a9aff'], B=ORANGE, C=BLUE, D=CYAN)),
    'finalform':     ('Final Form (Frieza)', (), dict(pat='aura', glint='#ffffff', hair=PURPLE, A=WHITE, B=['#2a0a40', '#5a1e86', '#9a4ad0', '#e0b4ff'], C=PURPLE, D=WHITE)),
    'xlr8':          ('XLR8', (), dict(pat='speed', hair=BLACK, A=['#02060e', '#0a1a3a', '#1a3e80', '#3c7ae0'], B=['#020306', '#081430', '#123066', '#2a5ab0'], C=BLACK, D=CYAN)),
    'upgrade':       ('Upgrade', (), dict(pat='circuit', glow='#3dff6e', hair=['#0a3a18', '#18a040', '#5dff8a', '#d8ffe2'], A=BLACK, B=BLACK, C=BLACK, D=['#0a3a18', '#18a040', '#5dff8a', '#d8ffe2'])),
    'ghostfreak':    ('Ghostfreak', (), dict(pat='ghost', hair=['#06060a', '#141420', '#24203a', '#3a3058'], A=['#6a6a76', '#a8a8b4', '#dcdce4', '#ffffff'],
                                                 B=['#0a080e', '#1a1424', '#2e2440', '#4a3a66'], C=['#0a080e', '#1a1424', '#2e2440', '#4a3a66'], D=['#6a6a76', '#a8a8b4', '#dcdce4', '#ffffff'])),
    'benten':        ('Ben 10', ('ben10',), dict(badge='green', hair=['#2a1608', '#5a3416', '#8a5a2c', '#b8844c'], A=GREEN, B=['#0e1a30', '#22385e', '#3e5a8a', '#7090c0'],
                                                 C=['#08080a', '#16161a', '#2a2a30', '#44444c'], D=GREEN)),
    'albedo':        ('Albedo — Negative', ('albedo',), dict(badge='red', hair=['#6a6a74', '#b4b4bc', '#e8e8ee', '#ffffff'], A=RED, B=BLACK, C=BLACK, D=RED)),
    'spidey':        ('Web-Slinger (Spider-Man)', ('spiderman',), dict(pat='web', hair=BLACK, A=RED, B=BLUE, C=BLUE, D=RED)),
    'kingofcurses':  ('King of Curses', ('sukuna', 'sukuna_shinjuku', 'alt_sukuna'), dict(pat='marks', hair=['#5a1a1e', '#b04a4a', '#f08a7a', '#ffd0c0'],
                                                                                    A=['#7a746a', '#b8b0a2', '#e4ded2', '#fffaf0'], B=BLACK, C=BLACK, D=RED)),
    'destroyer':     ('Destroyer (Beerus)', ('beerus',), dict(hair=PURPLE, A=BLACK, B=TEAL, C=GOLD, D=GOLD)),
    'alienx':        ('Alien X', (), dict(full='stars')),
}
ORDER = ['alienx', 'rose', 'akatsuki', 'godspeed', 'magmacore', 'senbonzakura', 'homelander', 'bigchill', 'thunderclap', 'ultrainstinct',
         'crystal', 'flamehashira', 'spidey', 'hollowpurple', 'sage', 'finalform', 'ssblue', 'upgrade', 'manofsteel', 'kingofcurses',
         'benten', 'xlr8', 'destroyer', 'ghostfreak', 'albedo']


# ── textures (vectorised) ────────────────────────────────────────────────────────────────────────────────────────────
CLOTH = ('A', 'B', 'C')


def apply_tex(sk, reg, col, t, X, Y, FI, REL):
    """col: (N,3) ramp colours for N pixels; reg: (N,) region names; X local-x, Y, FI frame index, REL rel height"""
    p = sk.get('pat')
    cloth = np.isin(reg, CLOTH); anyc = np.isin(reg, CLOTH + ('D', 'hair'))
    if p == 'aura':
        g = hx(sk['glint']); m = anyc & (t > 0.72); col[m] = col[m] * 0.8 + g * 0.2
        col[anyc & (H3(X, Y, FI // 4, 25) > 0.985)] = g
    elif p == 'void':
        v = H3(X, Y, FI // 4, 26)
        col[cloth & (v > 0.955)] = hx('#8a3ad8') * 0.8; col[cloth & (v > 0.975)] = hx('#e8b8ff')
    elif p == 'frost':
        col[anyc & (H3(X, Y, 0, 13) > 0.965)] = hx('#e8ffff')
    elif p == 'facet':
        a = ((X + Y) // 4) % 2; b = ((X - Y) // 4) % 2
        k = 0.82 + 0.28 * (a ^ b) + 0.08 * (((X + 2 * Y) // 3) % 2)
        col[anyc] = col[anyc] * k[anyc][:, None]
        col[anyc & (H3(X, Y, FI // 6, 12) > 0.975)] = hx('#ffffff')
    elif p == 'speed':
        col[np.isin(reg, ('A', 'B', 'D')) & (((Y + X // 3) % 9) < 1)] = hx('#000000')
    elif p == 'circuit':
        g = hx(sk['glow']); cx, cy = X // 5, Y // 6
        hor = (Y % 6 == 0) & (H3(cx, cy, 0, 3) > 0.45); ver = (X % 5 == 0) & (H3(cx, cy, 1, 4) > 0.55)
        m = cloth & (hor | ver); col[m] = col[m] * 0.25 + g * 0.75
        col[cloth & (X % 5 == 0) & (Y % 6 == 0) & (H3(cx, cy, 2, 5) > 0.6)] = g * 0.4 + hx('#ffffff') * 0.6
    elif p == 'ghost':
        m = np.isin(reg, ('A', 'D')) & (((X * 2 + Y + (3 * np.sin(Y * 0.35)).astype(int)) % 11) < 2)
        col[m] = hx('#0a0810') * 0.6 + col[m] * 0.1
    elif p == 'clouds':
        cx, cy = (X + 3 * (Y // 13)) // 12, Y // 13
        ox = cx * 12 + 3 + H3(cx, cy, 0, 21) * 6 - 3 * (Y // 13); oy = cy * 13 + 3 + H3(cx, cy, 1, 21) * 6
        d = np.minimum((((X - ox) / 1.6) ** 2 + (Y - oy) ** 2), (((X - ox - 3) / 1.6) ** 2 + (Y - oy + 1) ** 2)) ** 0.5
        has = H3(cx, cy, 2, 21) < 0.55; m = np.isin(reg, ('A', 'B')) & has
        col[m & (d < 2.7)] = hx('#f2f0ee')
        mm = m & (d < 1.9); col[mm] = hx('#c81e28') * (0.75 + 0.35 * t[mm])[:, None]
    elif p == 'triangles':
        tx, ty = X % 6, Y % 6
        m = (reg == 'A') & (((X // 6 + Y // 6) % 2) == 0) & (ty <= 6 - np.abs(tx - 3)) & (ty > 1)
        col[m] = hx('#fffbe8') * (0.8 + 0.2 * t[m])[:, None]
    elif p == 'hemflame':
        edge = 0.86 - 0.08 * (0.5 + 0.5 * np.sin(X * 0.9 + FI * 0.6)) - 0.06 * H3(X // 2, 0, FI // 3, 22)
        m = np.isin(reg, ('A', 'B')) & (REL > 0.62) & (REL > edge)
        k = np.clip((REL - edge) / 0.14, 0, 1)
        col[m] = ramp_v(sk['flame'], 1 - k[m]) * 0.85 + col[m] * 0.15
    elif p == 'sakura':
        v = H3(X // 3, Y // 3, FI // 8, 23); s3 = X % 3 + Y % 3
        m = np.isin(reg, ('A', 'B', 'D')) & (v > 0.93) & (s3 >= 1) & (s3 <= 3)
        col[m] = np.where(((X + Y) % 2)[m][:, None] == 1, hx('#ff9ac8'), hx('#ffd0e4'))
    elif p == 'lightning':
        band = (Y + 2 * ((X // 3) % 2)) % 11
        col[np.isin(reg, ('A', 'B', 'D')) & (band == 0) & (H3(X // 5, Y // 11, FI // 3, 24) > 0.5)] = hx(sk['bolt'])
    elif p == 'web':
        m = np.isin(reg, ('A', 'D')) & (((X + Y) % 7 == 0) | ((X - Y) % 7 == 0) | (Y % 6 == 0))
        col[m] = col[m] * 0.35
    elif p == 'magma':
        G = 8; cx, cy = X // G, Y // G
        best0 = np.full(X.shape, 9e9); best1 = np.full(X.shape, 9e9)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                px_ = (cx + dx) * G + H3(cx + dx, cy + dy, 0, 9) * G; py_ = (cy + dy) * G + H3(cx + dx, cy + dy, 1, 9) * G
                dd = (px_ - X) ** 2 + (py_ - Y) ** 2
                lt0 = dd < best0; best1 = np.where(lt0, best0, np.minimum(best1, dd)); best0 = np.where(lt0, dd, best0)
        m = cloth & ((best1 ** 0.5 - best0 ** 0.5) < 0.8)
        col[m] = ramp_v(sk['crack'], 0.4 + 0.6 * H3(X[m], Y[m], 0, 10))
    return col


EMB = {
    'eagle':  (['..g...g..', '.gg...gg.', '..gGGGg..', '...GGG...', '....g....'], {'g': '#e0a81e', 'G': '#fff08a'}),
    'shield': (['.yyyyy.', 'yrrrrry', 'yryyyyy', '.yrrry.', '..yyy..', '...y...'], {'y': '#ffd21e', 'r': '#d01e28'}),
    'green':  (['.ddd.', 'dGHGd', 'ddGdd', 'dGHGd', '.ddd.'], {'d': '#0a0a0a', 'G': '#3dff4a', 'H': '#9eff9e'}),
    'red':    (['.ddd.', 'dGHGd', 'ddGdd', 'dGHGd', '.ddd.'], {'d': '#0a0a0a', 'G': '#ff2a2a', 'H': '#ff9e9e'}),
}


def stamp(out, cx, cy, kind):
    pat, cols = EMB[kind]
    for j, row in enumerate(pat):
        for i, ch in enumerate(row):
            if ch == '.': continue
            y, x = cy - len(pat) // 2 + j, cx - len(row) // 2 + i
            if 0 <= y < out.shape[0] and 0 <= x < out.shape[1] and out[y, x, 3]: out[y, x, :3] = hx(cols[ch])


# ── per-sheet ────────────────────────────────────────────────────────────────────────────────────────────────────────
def prep_sheet(path, fw, reg, fh=0):
    a = np.array(Image.open(path).convert('RGBA'))
    on = a[..., 3] > 0; k = ckey(a[..., :3])
    R = np.full(on.shape, '', object)
    ys, xs = np.nonzero(on); kk = k[ys, xs]
    lut = {c: r for c, r in reg.items()}
    # colours this sheet uses that the body palette never saw (mid-animation shading, motion-blur tones): borrow the region
    # of the nearest palette colour (RGB L1 ≤ 30) so no frame "flashes back" to the default outfit. Far colours = FX.
    pk = np.array([c for c, r in reg.items() if r in ('A', 'B', 'C', 'D', 'hair', 'skin')], np.int64)
    if pk.size:
        prgb = np.stack([(pk >> 16) & 255, (pk >> 8) & 255, pk & 255], -1).astype(np.int32)
        for c in set(np.unique(kk).tolist()) - set(lut):
            rgb = np.array([(c >> 16) & 255, (c >> 8) & 255, c & 255]); dd = np.abs(prgb - rgb).sum(-1); j = int(dd.argmin())
            if dd[j] <= 30 and rgb.max() > 30: lut[c] = reg[int(pk[j])]
    rr = np.array([lut.get(int(c), '') for c in kk.tolist()], object) if kk.size else np.array([], object)
    R[ys, xs] = rr
    body = np.isin(R, ('A', 'B', 'C', 'D', 'hair', 'skin', 'keep'))
    rel = frame_rel(body, fw or a.shape[1], fh)
    L = (a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114).astype(np.float32)
    norms = {}
    for r in ('hair', 'A', 'B', 'C', 'D'):
        m = R == r
        if m.sum() > 3: norms[r] = (float(np.percentile(L[m], 2)), float(np.percentile(L[m], 98)) + 1)
    return a, R, rel, L, norms, fw or a.shape[1]


def full_alien(a, R, L, fw):
    out = a.copy(); m = np.isin(R, ('A', 'B', 'C', 'D', 'hair', 'skin'))
    ys, xs = np.nonzero(m); X = xs % fw; FI = xs // fw; t = L[ys, xs] / 255.0; reg = R[ys, xs]
    neb = 0.5 + 0.5 * np.sin(X * 0.21 + ys * 0.13) * np.cos(X * 0.09 - ys * 0.17)
    c = ramp_v(['#000000', '#020309', '#060814', '#0d1128'], t ** 1.5) + hx('#1a1240') * (0.2 * neb * (0.3 + t))[:, None]
    hair = reg == 'hair'; c[hair] = ramp_v(['#7d8296', '#cfd3de', '#f4f6fa', '#ffffff'], np.minimum(1, t[hair] * 1.7))
    v = H3(X, ys, FI // 4, 11)
    c[(v > 0.95) & ~hair] = hx('#a98cff') * 0.5; c[(v > 0.958) & ~hair] = hx('#7fc8ff') * 0.7
    c[(v > 0.968) & ~hair] = hx('#dfe8ff') * 0.85; c[(v > 0.982) & ~hair] = hx('#ffffff')
    out[ys, xs, :3] = np.clip(np.round(c), 0, 255).astype(np.uint8)
    return out


def recolor(prep, sk):
    a, R, rel, L, norms, fw = prep
    if sk.get('full'): return full_alien(a, R, L, fw)
    out = a.copy()
    m = np.isin(R, ('A', 'B', 'C', 'D', 'hair'))
    ys, xs = np.nonzero(m)
    if not ys.size: return out
    reg = R[ys, xs]; col = np.zeros((ys.size, 3), np.float32); t = np.zeros(ys.size, np.float32)
    for r in ('hair', 'A', 'B', 'C', 'D'):
        mm = reg == r
        if not mm.any(): continue
        lo, hi = norms.get(r, (0, 256)); tt = (L[ys[mm], xs[mm]] - lo) / max(1.0, hi - lo)
        stops = sk.get(r) or sk.get('C') or sk.get('A'); t[mm] = tt; col[mm] = ramp_v(stops, tt)
    col = apply_tex(sk, reg, col, t, xs % fw, ys, xs // fw, rel[ys, xs])
    out[ys, xs, :3] = np.clip(np.round(col), 0, 255).astype(np.uint8)
    if sk.get('pat') == 'marks':
        sm = (R == 'skin') & (((rel > 0.08) & (rel < 0.13) & (np.arange(R.shape[0])[:, None] % 2 == 0)) |
                              ((rel > 0.3) & (rel < 0.55) & (np.arange(R.shape[0])[:, None] % 5 == 0)))
        out[sm, :3] = (18, 8, 10)
    em = sk.get('emblem') or sk.get('badge')
    if em:
        for i in range(-(-a.shape[1] // fw)):
            sl = slice(i * fw, (i + 1) * fw)
            chest = np.isin(R[:, sl], ('A', 'C')) & (rel[:, sl] > 0.24) & (rel[:, sl] < 0.42)
            yy, xx = np.nonzero(chest)
            if yy.size < 30: continue
            stamp(out, i * fw + int(np.median(xx)), int(np.median(yy)), em)
    return out


# ── driver ───────────────────────────────────────────────────────────────────────────────────────────────────────────
OVR = json.load(open(os.path.join(os.path.dirname(__file__), 'overrides.json'))) if os.path.exists(os.path.join(os.path.dirname(__file__), 'overrides.json')) else {}


def pick_themes(key, n, have_names, avoid=()):
    hv = ' '.join(have_names).lower(); avoid_k = set(avoid)
    seed = sum((i + 1) * ord(c) for i, c in enumerate(key))
    order = sorted(ORDER, key=lambda t: float(H3(seed, sum(map(ord, t)), 5, 2)))
    out = []
    if 'alien x' not in hv: out.append('alienx')
    for tag in order:
        if tag in out: continue
        nm, avoid, _ = THEMES[tag]
        if key in avoid or tag == 'alienx' or tag in avoid_k: continue
        if tag in ('benten', 'albedo') and ('ben 10' in hv or 'albedo' in hv): continue
        if nm.lower().split(' (')[0] in hv: continue
        out.append(tag)
        if len(out) >= n: break
    return out


def build(key, n=10, only=None):
    info = char_info(key); ov = OVR.get(key, {})
    global Q; Q = ov.get('q', 1)
    SKP.update(h=tuple(ov.get('skinh', (4, 42))), s=tuple(ov.get('skins', (0.16, 0.8))), v=ov.get('skinv', 0.26), dark=ov.get('darkskin', False))
    reg = regions(key, info, ov)
    have = node_json(f"const {{ getSkins }} = await import('{ROOT}/skins.js'); console.log(JSON.stringify((getSkins('{key}')||[]).filter(s=>s.classification!=='Creative').map(s=>s.name)))")
    tags = only or ov.get('themes') or pick_themes(key, n, have, ov.get('avoid', ()))
    preps = {}
    for s, fw in info['sheets'].items():
        p = os.path.join(ROOT, s)
        if os.path.exists(p): preps[s] = prep_sheet(p, fw, reg, info['hts'].get(s, 0))
    made = []
    for tag in tags:
        nm, _, sk = THEMES[tag]; ctag = 'cs' + tag
        for s, pr in preps.items():
            Image.fromarray(recolor(pr, sk)).save(os.path.join(ROOT, s[:-4] + '__' + ctag + '.png'), optimize=True)
        portrait(key, info, ctag)
        made.append((ctag, nm))
    contact(key, info, made)
    return made


def portrait(key, info, ctag):
    idle = next((s for s, acts in info['acts'].items() if 'idle' in acts), None)
    if not idle or not info.get('portrait'): return
    pth = info['portrait'].replace('./', '')
    out = os.path.join(ROOT, re.sub(r'\.(png|jpe?g)$', '', pth, flags=re.I) + '__' + ctag + '.png')
    fw = info['sheets'][idle]; im = Image.open(os.path.join(ROOT, idle[:-4] + '__' + ctag + '.png')).convert('RGBA')
    f0 = im.crop((0, 0, fw or im.width, min(im.height, info['hts'].get(idle, 0) or im.height))); bb = f0.getbbox()
    if not bb: return
    hh = max(8, int((bb[3] - bb[1]) * 0.5))
    f0 = f0.crop((max(0, bb[0] - 1), max(0, bb[1] - 1), min(f0.width, bb[2] + 1), min(f0.height, bb[1] + hh)))
    k = max(1, min(128 // max(1, f0.width), 120 // max(1, f0.height)))
    big = f0.resize((f0.width * k, f0.height * k), Image.NEAREST)
    plate = Image.new('RGBA', (128, 128), (14, 18, 32, 255))
    plate.alpha_composite(big, ((128 - big.width) // 2, max(0, 128 - big.height)))
    plate.save(out)


def contact(key, info, made):
    os.makedirs(DOCS, exist_ok=True)
    pick = []
    for want in ('idle', 'run', 'walk', 'light', 'heavy', 'special'):
        s = next((s for s, acts in info['acts'].items() if want in acts), None)
        if s and s not in pick: pick.append(s)
        if len(pick) >= 3: break
    rows = [('Default', None)] + [(nm, t) for t, nm in made]
    tiles = []
    for nm, t in rows:
        row = []
        for s in pick:
            fw = info['sheets'][s]; p = os.path.join(ROOT, s[:-4] + ('__' + t if t else '') + '.png')
            if not os.path.exists(p): continue
            im = Image.open(p).convert('RGBA'); fw = fw or im.width
            idx = 0 if s == pick[0] else min(2, im.width // fw - 1)
            fh = info['hts'].get(s, 0) or im.height
            f = im.crop((idx * fw, 0, idx * fw + fw, min(im.height, fh))); bb = f.getbbox()
            if bb: f = f.crop(bb)
            sc = max(1, min(3, 150 // max(1, f.height)))
            row.append(f.resize((f.width * sc, f.height * sc), Image.NEAREST))
        tiles.append((nm, row))
    W = max(sum(t.width + 6 for t in r) for _, r in tiles) + 200; Hh = sum((max([t.height for t in r] or [10])) + 8 for _, r in tiles)
    sh = Image.new('RGBA', (W, Hh), (48, 50, 60, 255)); dr = ImageDraw.Draw(sh); y = 0
    for nm, r in tiles:
        dr.text((6, y + 6), nm.encode('ascii', 'replace').decode().replace('?', 'e'), fill=(240, 240, 240, 255)); x = 200
        for t in r: sh.alpha_composite(t, (x, y)); x += t.width + 6
        y += (max([t.height for t in r] or [10])) + 8
    sh.save(os.path.join(DOCS, f'{key}.png'))


def main():
    args = sys.argv[1:]; n = 10; only = None; keys = []
    i = 0
    while i < len(args):
        if args[i] == '--n': n = int(args[i + 1]); i += 2; continue
        if args[i] == '--only': only = args[i + 1].split(','); i += 2; continue
        keys.append(args[i]); i += 1
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    for k in keys:
        made = build(k, n, only)
        man[k] = [[t, nm] for t, nm in made]
        json.dump(man, open(MANIFEST, 'w'), indent=1, ensure_ascii=False)
        print(f'{k}: ' + ', '.join(nm for _, nm in made), flush=True)


if __name__ == '__main__':
    main()
