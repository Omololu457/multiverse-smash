#!/usr/bin/env python3
"""tools/originalskins/build.py — creative skins for the ORIGINALS (Omololu, Dseyl, Enoch), each one inspired by another
fighter in the roster (cosmetic only). Same method as tools/alienskins/build.py:

  * BODY PALETTE = every colour in the fighter's plain body sheets. Pixels whose colour is NOT in it are technique FX
    (Omololu's rods, Enoch's fire / water, Dseyl's beams) and stay byte-identical.
  * Each palette colour gets a ROLE (hair · top · inner · legs · trim · line · skin · keep) from hue / sat / value +
    its height in the frame (rel = 0 head … 1 feet). Skin, eyes, outline black and the visor stay as they are.
  * Each skin maps roles → a dark→light ramp shaded by the original pixel's brightness, plus a deterministic texture
    (hash of x / y / frame — never random): Akatsuki clouds, Zenitsu triangles, Rengoku flame hems, sakura petals,
    Heatblast cracks, Diamondhead facets, Big Chill frost, lightning, aura glints … and chest emblems.
Every sheet → `<sheet>__<tag>.png` beside it (same size / alpha / grid → identical timing, hitboxes, anchors), read by
skins.js recolorSkinAnim(key, tag). Portrait → `<portrait>__<tag>.png` (head + chest of the recoloured idle frame).

    python3 tools/originalskins/build.py [omololu|dseyl|enoch ...]
"""
import os, sys, colorsys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(HERE, '..', 'alienskins'))
from build import hx, h3, ramp, sheets_of, frame_rel, tex as alien_tex, omnitrix  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DOCS = os.path.join(ROOT, 'docs/skins/originals')


def hsv(c):
    h, s, v = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255); return h * 360, s, v


# ── roles ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def role_omololu(c, rel):
    h, s, v = hsv(c)
    if (h <= 12 or h >= 340) and s > 0.45: return 'keep'                        # red eye
    if 15 <= h <= 35 and s >= 0.4: return 'skin'                                # skin + brown robe lining
    if v < 0.11: return 'hair' if rel < 0.14 else 'keep'                        # outline black (hair on top)
    if s < 0.16 and v < 0.42:
        if rel < 0.14: return 'hair'
        return 'top' if rel < 0.56 else 'legs'                                  # the robe
    if s < 0.06 and v >= 0.45: return 'trim'                                    # belt plate / leg wraps
    return 'keep'


def role_dseyl(c, rel):
    h, s, v = hsv(c)
    if v < 0.07: return 'keep'                                                  # mask / collar black
    if 10 <= h <= 30 and s >= 0.4: return 'skin'
    if (h >= 340 or h <= 8) and s >= 0.5: return 'legs'                         # maroon trousers
    if s < 0.08 and v >= 0.36 and rel < 0.8: return 'top'                       # the white shirt
    if s < 0.1 and 0.18 <= v < 0.25 and rel >= 0.8: return 'inner'              # boots
    return 'keep'                                                               # #424242 outline


def role_enoch(c, rel):
    h, s, v = hsv(c)
    if v < 0.07: return 'keep'
    if 22 <= h <= 40 and s > 0.6 and v > 0.7: return 'keep'                     # visor glow
    if 10 <= h <= 30 and s >= 0.4: return 'skin'
    if 190 <= h <= 205 and s >= 0.55: return 'line'                             # teal edge line
    if 222 <= h <= 240 and s >= 0.35: return 'top'                              # navy jacket
    if 205 <= h <= 220 and 0.12 <= s <= 0.32 and v >= 0.45: return 'legs'       # pale-blue trousers
    if s < 0.2 and v < 0.2 and rel < 0.16: return 'hair'                        # cap
    if s < 0.08 and rel > 0.88: return 'trim'                                   # shoes / soles
    return 'keep'


CHARS = {
    'omololu': dict(role=role_omololu, palette=['omololu_idle_uniform.png', 'omololu_run_uniform.png', 'omololu_block_uniform.png',
                                                'omololu_crouch_uniform.png', 'omololu_jump_uniform.png'], idle=('omololu_idle_uniform.png', 40)),
    'dseyl':   dict(role=role_dseyl, palette=['assets/dseyl/idle.png', 'assets/dseyl/walk.png', 'assets/dseyl/run.png',
                                              'assets/dseyl/guard.png', 'assets/dseyl/crouch.png'], idle=('assets/dseyl/idle.png', 75)),
    'enoch':   dict(role=role_enoch, palette=['assets/enoch/idle.png', 'assets/enoch/walk.png', 'assets/enoch/run.png',
                                              'assets/enoch/guard.png', 'assets/enoch/crouch.png'], idle=('assets/enoch/idle.png', 85)),
}

# ── ramps ────────────────────────────────────────────────────────────────────────────────────────────────────────────
BLACK = ['#050506', '#101014', '#1e1e24', '#34343c']
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

S = {}
S['omololu'] = [
    ('rose', 'Rosé (Goku Black)', dict(pat='aura', glint='#ff8ad8', hair=['#3a0828', '#a0186a', '#ff5ab8', '#ffd0f0'],
                                       top=['#08080c', '#18161e', '#2c2834', '#48404e'], legs=['#08080c', '#18161e', '#2c2834', '#48404e'],
                                       trim=['#6a1040', '#c02a7a', '#ff6ab8', '#ffe0f4'])),
    ('hollowpurple', 'Hollow Purple (Gojo)', dict(pat='void', hair=WHITE, top=['#04040e', '#0c0c22', '#1a1a3e', '#30305e'],
                                                  legs=['#04040e', '#0c0c22', '#1a1a3e', '#30305e'], trim=PURPLE)),
    ('kingofcurses', 'King of Curses (Sukuna)', dict(pat='marks', hair=['#5a1a1e', '#b04a4a', '#f08a7a', '#ffd0c0'],
                                                     top=['#7a746a', '#b8b0a2', '#e4ded2', '#fffaf0'], legs=['#7a746a', '#b8b0a2', '#e4ded2', '#fffaf0'],
                                                     trim=BLACK)),
    ('akatsuki', 'Akatsuki (Itachi)', dict(pat='clouds', hair=['#04040a', '#0e0e1a', '#1c1c2e', '#30304a'],
                                           top=['#040406', '#0e0e12', '#1c1c22', '#2e2e38'], legs=['#040406', '#0e0e12', '#1c1c22', '#2e2e38'],
                                           trim=['#5a0a0e', '#a01a22', '#e03a3a', '#ff9a8a'])),
    ('sage', 'Sage Mode (Naruto)', dict(pat='hemflame', flame=['#5a0602', '#c01a06', '#ff5a10'], hair=GOLD, top=ORANGE,
                                        legs=['#0a0a14', '#16162a', '#262648', '#3e3e6e'], trim=RED)),
    ('thunderclap', 'Thunderclap (Zenitsu)', dict(pat='triangles', hair=['#8a3a02', '#e08a0a', '#ffd21e', '#fff6b0'], top=YELLOW,
                                                  legs=['#06060a', '#121218', '#22222c', '#383848'], trim=WHITE)),
    ('flamehashira', 'Flame Hashira (Rengoku)', dict(pat='hemflame', flame=['#8a0a02', '#ff3a06', '#ffb01a'],
                                                     hair=['#8a1a02', '#e05a08', '#ffc21e', '#fff2a0'], top=WHITE, legs=WHITE, trim=BLACK)),
    ('magmacore', 'Magma Core (Heatblast)', dict(pat='magma', crack=['#ff4a00', '#ff9a10', '#ffe060'], hair=['#8a1000', '#ff4a00', '#ffa020', '#fff0a0'],
                                                 top=['#0e0302', '#2a0a04', '#4e1608', '#7a2a10'], legs=['#0a0201', '#220804', '#3e1206', '#62220c'],
                                                 trim=['#8a1000', '#ff4a00', '#ffa020', '#fff0a0'])),
    ('crystal', 'Crystal (Diamondhead)', dict(pat='facet', hair=['#0a5a40', '#22c890', '#8affd8', '#f0fffa'], top=['#04281c', '#0a6a48', '#1eb07c', '#7ef0c4'],
                                              legs=['#031c14', '#075238', '#138e62', '#4ed8a4'], trim=['#0a5a40', '#22c890', '#8affd8', '#f0fffa'])),
    ('homelander', 'Homelander', dict(emblem='eagle', hair=['#6a4a0a', '#c09a2a', '#f0d26a', '#fff6c8'], top=NAVY, legs=RED, trim=GOLD)),
]
S['dseyl'] = [
    ('homelander', 'Homelander', dict(emblem='eagle', top=NAVY, legs=NAVY, inner=RED)),
    ('omniman', 'Omni-Man', dict(emblem='ring', top=['#8a8a90', '#c8c8cc', '#ececf0', '#ffffff'], legs=['#8a8a90', '#c8c8cc', '#ececf0', '#ffffff'],
                                 inner=BLACK)),
    ('invincible', 'Invincible', dict(top=YELLOW, legs=BLUE, inner=BLUE)),
    ('superman', 'Superman', dict(emblem='shield', top=BLUE, legs=BLUE, inner=RED)),
    ('mrincredible', 'Mr. Incredible', dict(emblem='incredible', top=RED, legs=RED, inner=BLACK)),
    ('dash', 'Dash (Speed Suit)', dict(pat='speed', emblem='incredible', top=RED, legs=BLACK, inner=BLACK)),
    ('ultrainstinct', 'Ultra Instinct (Goku)', dict(pat='aura', glint='#e8f0ff', top=['#06102a', '#12285a', '#24468e', '#4a72c0'], legs=ORANGE,
                                                    inner=NAVY)),
    ('jetray', 'Jetray', dict(pat='speed', top=['#3a0606', '#8a0e10', '#d02a1e', '#ff7a4a'], legs=BLACK, inner=YELLOW)),
    ('xlr8', 'XLR8', dict(pat='speed', top=['#02060e', '#0a1a3a', '#1a3e80', '#3c7ae0'], legs=['#020306', '#081430', '#123066', '#2a5ab0'],
                          inner=BLACK)),
    ('blueevolution', 'Blue Evolution (Vegeta)', dict(pat='aura', glint='#8af0ff', top=['#6a6a74', '#c4c8d4', '#eef2fa', '#ffffff'],
                                                      legs=['#06103a', '#122a7a', '#2450c8', '#6a9aff'], inner=WHITE)),
]
S['enoch'] = [
    ('bigchill', 'Big Chill', dict(pat='frost', top=['#030a1c', '#0a2048', '#1c4a8a', '#4a8ad0'], legs=['#0a2a4a', '#2a7ab0', '#7ad8f8', '#e0fbff'],
                                   line=['#2a4a8a', '#6aa0e0', '#c0e4ff', '#ffffff'], hair=['#2a4a8a', '#6aa0e0', '#c0e4ff', '#ffffff'], trim=WHITE)),
    ('heatblast', 'Heatblast', dict(pat='magma', crack=['#ff4a00', '#ff9a10', '#ffe060'], top=['#0e0302', '#2a0a04', '#4e1608', '#7a2a10'],
                                    legs=['#0a0201', '#220804', '#3e1206', '#62220c'], line=['#8a1000', '#ff4a00', '#ffa020', '#fff0a0'],
                                    hair=['#8a1000', '#ff4a00', '#ffa020', '#fff0a0'], trim=['#3a0a02', '#7a1a04', '#c03a08', '#ff7a1a'])),
    ('frieza', 'Final Form (Frieza)', dict(pat='aura', glint='#ffffff', top=WHITE, legs=['#2a0a40', '#5a1e86', '#9a4ad0', '#e0b4ff'],
                                           line=PURPLE, hair=['#2a0a40', '#5a1e86', '#9a4ad0', '#e0b4ff'], trim=WHITE)),
    ('beerus', 'Destroyer (Beerus)', dict(top=BLACK, legs=['#04202a', '#0a4a5a', '#1a8a9a', '#6ad8e0'], line=GOLD, hair=PURPLE, trim=GOLD)),
    ('byakuya', 'Senbonzakura (Byakuya)', dict(pat='sakura', top=WHITE, legs=BLACK, line=['#6a6a74', '#b4b4bc', '#e0e0e8', '#ffffff'],
                                               hair=BLACK, trim=WHITE)),
    ('godspeed', 'Godspeed (Killua)', dict(pat='lightning', bolt='#a8f4ff', top=['#0a1a3a', '#1a3a7a', '#3a6ac0', '#9ad0ff'], legs=NAVY,
                                           line=CYAN, hair=WHITE, trim=CYAN)),
    ('rengoku', 'Flame Hashira (Rengoku)', dict(pat='hemflame', flame=['#8a0a02', '#ff3a06', '#ffb01a'], top=WHITE, legs=BLACK,
                                                line=['#5a0a02', '#c02a06', '#ff7a1a', '#ffd07a'], hair=['#8a1a02', '#e05a08', '#ffc21e', '#fff2a0'], trim=BLACK)),
    ('megawhatt', 'Megawhatt', dict(pat='lightning', bolt='#fff6a0', top=YELLOW, legs=BLACK, line=['#6a5a02', '#d8c20a', '#fff04a', '#ffffd0'],
                                    hair=YELLOW, trim=YELLOW)),
    ('ssblue', 'Super Saiyan Blue (Goku)', dict(pat='aura', glint='#8af0ff', top=['#06103a', '#122a7a', '#2450c8', '#6a9aff'], legs=ORANGE,
                                                line=CYAN, hair=CYAN, trim=BLUE)),
    ('frostemperor', 'Frost Emperor', dict(pat='facet', top=['#0a2a5a', '#2a6ab0', '#8ad0ff', '#f0ffff'], legs=['#1a4a7a', '#4a90d0', '#b0e6ff', '#ffffff'],
                                           line=['#04122a', '#0a2a5a', '#1a5a9a', '#4a9ae0'], hair=['#0a2a5a', '#2a6ab0', '#8ad0ff', '#f0ffff'], trim=WHITE)),
]


# ── textures ─────────────────────────────────────────────────────────────────────────────────────────────────────────
CLOTH = ('top', 'legs', 'inner')


def tex(sk, r, c, t, x, y, fi, rel):
    p = sk.get('pat')
    if p == 'magma' and r in ('top', 'legs', 'inner'):                          # Heatblast: big rock plates split by glowing cracks
        G = 8
        cx, cy = x // G, y // G
        best = [9e9, 9e9]
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                px_ = (cx + dx) * G + h3(cx + dx, cy + dy, 0, 9) * G; py_ = (cy + dy) * G + h3(cx + dx, cy + dy, 1, 9) * G
                d = (px_ - x) ** 2 + (py_ - y) ** 2
                if d < best[0]: best = [d, best[0]]
                elif d < best[1]: best[1] = d
        if best[1] ** 0.5 - best[0] ** 0.5 < 0.8: return ramp(sk['crack'], 0.4 + 0.6 * h3(x, y, 0, 10))
        return c
    if p in ('magma', 'facet', 'frost', 'speed', 'circuit'):
        if r in ('skin',): return c
        return alien_tex(sk, r if r != 'line' else 'trim', c, t, x, y, fi)
    if p == 'clouds' and r in ('top', 'legs'):                                  # Akatsuki: red clouds, white rim
        cx, cy = (x + 3 * (y // 13)) // 12, y // 13
        ox = cx * 12 + 3 + h3(cx, cy, 0, 21) * 6 - 3 * (y // 13); oy = cy * 13 + 3 + h3(cx, cy, 1, 21) * 6
        if h3(cx, cy, 2, 21) < 0.55:
            d = min(((x - ox) / 1.6) ** 2 + (y - oy) ** 2, ((x - ox - 3) / 1.6) ** 2 + (y - oy + 1) ** 2) ** 0.5
            if d < 1.9: return hx('#c81e28') * (0.75 + 0.35 * t)
            if d < 2.7: return hx('#f2f0ee')
        return c
    if p == 'triangles' and r == 'top':                                         # Zenitsu haori: white triangles
        tx, ty = x % 6, y % 6
        if ((x // 6 + y // 6) % 2 == 0) and ty >= tx - 0 and ty <= 5 - abs(tx - 3) + 1 and ty > 1: return hx('#fffbe8') * (0.8 + 0.2 * t)
        return c
    if p == 'hemflame' and r in ('top', 'legs') and rel > 0.62:                # Rengoku / Sage: flame tongues up the hem
        edge = 0.86 - 0.08 * (0.5 + 0.5 * np.sin(x * 0.9 + fi * 0.6)) - 0.06 * h3(x // 2, 0, fi // 3, 22)
        if rel > edge:
            k = min(1.0, (rel - edge) / 0.14)
            F = sk['flame']; return ramp(F, 1 - k) * 0.85 + c * 0.15
        return c
    if p == 'sakura' and r in ('top', 'line', 'legs'):                         # Byakuya: drifting pink petals
        v = h3(x // 3, y // 3, fi // 8, 23)
        if v > 0.93 and (x % 3 + y % 3) in (1, 2, 3): return hx('#ff9ac8') if (x + y) % 2 else hx('#ffd0e4')
        return c
    if p == 'lightning' and r in ('top', 'legs', 'line'):                      # Godspeed / Megawhatt: zig-zag bolts
        band = (y + 2 * ((x // 3) % 2)) % 11
        if band == 0 and h3(x // 5, y // 11, fi // 3, 24) > 0.5: return hx(sk['bolt'])
        return c
    if p == 'aura':                                                             # Rosé / UI / Blue / Frieza: sheen + glints
        if r in CLOTH + ('hair', 'line') and t > 0.72: c = c * 0.8 + hx(sk['glint']) * 0.2
        if r in CLOTH + ('hair', 'line') and h3(x, y, fi // 4, 25) > 0.985: return hx(sk['glint'])
        return c
    if p == 'void' and r in ('top', 'legs'):                                    # Hollow Purple: violet sparks in black
        v = h3(x, y, fi // 4, 26)
        if v > 0.975: return hx('#e8b8ff')
        if v > 0.955: return hx('#8a3ad8') * 0.8
        return c
    return c


def sukuna_marks(arr, out, role, rel, fw):
    """King of Curses: black under-eye bands + forearm bands on the skin (shape, not noise)."""
    ys, xs = np.nonzero(role == 'skin')
    for y, x in zip(ys, xs):
        r = rel[y, x]
        if (0.08 < r < 0.13 and y % 2 == 0) or (0.3 < r < 0.55 and y % 5 == 0):
            out[y, x, :3] = (18, 8, 10)


EMB = {
    'eagle':      (['..g...g..', '.gg...gg.', '..gGGGg..', '...GGG...', '....g....'], {'g': '#e0a81e', 'G': '#fff08a'}),
    'shield':     (['.yyyyy.', 'yrrrrry', 'yryyyyy', '.yrrry.', '..yyy..', '...y...'], {'y': '#ffd21e', 'r': '#d01e28'}),
    'incredible': (['.kkkkk.', 'koooook', 'kookook', 'kookook', 'koooook', '.kkkkk.'], {'k': '#101010', 'o': '#ff8a1a'}),
    'ring':       (['.rrr.', 'r...r', 'r...r', 'r...r', '.rrr.'], {'r': '#d01e28'}),
}


def emblem(out, cx, cy, kind):
    pat, cols = EMB[kind]
    for j, row in enumerate(pat):
        for i, ch in enumerate(row):
            if ch == '.': continue
            y, x = cy - len(pat) // 2 + j, cx - len(row) // 2 + i
            if 0 <= y < out.shape[0] and 0 <= x < out.shape[1] and out[y, x, 3]: out[y, x, :3] = hx(cols[ch])


# ── per-sheet work ───────────────────────────────────────────────────────────────────────────────────────────────────
def body_palette(ch):
    pal = set()
    for f in CHARS[ch]['palette']:
        a = np.array(Image.open(os.path.join(ROOT, f)).convert('RGBA'))
        pal |= {tuple(int(v) for v in p[:3]) for p in a[a[..., 3] > 0]}
    return pal


def classify(arr, fw, ch, pal):
    rgb = arr[..., :3]; on = arr[..., 3] > 0
    key = rgb[..., 0].astype(np.int64) * 65536 + rgb[..., 1].astype(np.int64) * 256 + rgb[..., 2]
    palk = np.array(sorted(r * 65536 + g * 256 + b for r, g, b in pal), np.int64)
    inpal = on & np.isin(key, palk)
    rel = frame_rel(inpal, fw)
    role = np.full(on.shape, '', object); cache = {}
    ys, xs = np.nonzero(inpal)
    for y, x in zip(ys, xs):
        c = tuple(int(v) for v in rgb[y, x]); k = (c, round(float(rel[y, x]), 2))
        if k not in cache: cache[k] = CHARS[ch]['role'](c, k[1])
        role[y, x] = cache[k]
    L = rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114
    return role, L.astype(np.float32), rel, inpal


def role_norm(role, L):
    out = {}
    for r in ('hair', 'top', 'inner', 'legs', 'trim', 'line', 'skin'):
        m = role == r
        if m.any(): out[r] = (float(np.percentile(L[m], 2)), float(np.percentile(L[m], 98)) + 1)
    return out


def recolor(arr, fw, sk, role, L, rel, inpal, norms):
    out = arr.copy()
    ys, xs = np.nonzero(inpal)
    for y, x in zip(ys, xs):
        r = role[y, x]
        if r in ('keep', 'skin', ''): continue
        stops = sk.get(r)
        if stops is None: continue
        lo, hi = norms.get(r, (0, 256))
        t = (float(L[y, x]) - lo) / max(1.0, hi - lo)
        c = tex(sk, r, ramp(stops, t), t, x % fw, y, x // fw, float(rel[y, x]))
        out[y, x, :3] = np.clip(np.round(c), 0, 255).astype(np.uint8)
    if sk.get('pat') == 'marks': sukuna_marks(arr, out, role, rel, fw)
    if sk.get('emblem'):
        for i in range(-(-arr.shape[1] // fw)):
            sl = slice(i * fw, (i + 1) * fw)
            chest = np.isin(role[:, sl], ['top', 'inner']) & (rel[:, sl] > 0.24) & (rel[:, sl] < 0.42)
            ys_, xs_ = np.nonzero(chest)
            if ys_.size < 30: continue
            emblem(out, i * fw + int(np.median(xs_)), int(np.median(ys_)), sk['emblem'])
    return out


def build_char(ch):
    C = CHARS[ch]; pal = body_palette(ch); sheets = sheets_of(ch)
    cache = {}
    for name, fw in sheets.items():
        base = np.array(Image.open(os.path.join(ROOT, name)).convert('RGBA'))
        role, L, rel, inpal = classify(base, fw, ch, pal)
        cache[name] = (base, fw, role, L, rel, inpal, role_norm(role, L))
    made = []
    for tag, nm, sk in S[ch]:
        for name, (base, fw, role, L, rel, inpal, norms) in cache.items():
            out = recolor(base, fw, sk, role, L, rel, inpal, norms)
            Image.fromarray(out).save(os.path.join(ROOT, name[:-4] + '__' + tag + '.png'), optimize=True)
        portrait(ch, tag)
        made.append((tag, nm)); print(f'  {ch:8s} {tag:16s} {nm}')
    return made


def portrait(ch, tag):
    import subprocess
    p = subprocess.run(['node', '-e', f"import('{ROOT}/characters.js').then(m=>console.log(m.characters['{ch}'].portrait))"],
                       capture_output=True, text=True, cwd=ROOT).stdout.strip().splitlines()[-1].replace('./', '')
    idle, fw = CHARS[ch]['idle']
    im = Image.open(os.path.join(ROOT, idle[:-4] + '__' + tag + '.png')).convert('RGBA')
    f0 = im.crop((0, 0, fw, im.height)); bb = f0.getbbox()
    hh = int((bb[3] - bb[1]) * 0.55)
    f0 = f0.crop((max(0, bb[0] - 1), max(0, bb[1] - 1), min(fw, bb[2] + 1), bb[1] + hh))
    k = max(1, min(128 // f0.width, 120 // f0.height))
    big = f0.resize((f0.width * k, f0.height * k), Image.NEAREST)
    plate = Image.new('RGBA', (128, 128), (14, 18, 32, 255))
    plate.alpha_composite(big, ((128 - big.width) // 2, 128 - big.height))
    plate.save(os.path.join(ROOT, p[:-4] + '__' + tag + '.png'))


def contact(ch, made):
    os.makedirs(DOCS, exist_ok=True)
    sheets = sheets_of(ch)
    cols = {'omololu': ['omololu_idle_uniform.png', 'omololu_run_uniform.png', 'omololu_light_uniform.png', 'omololu_heavy_uniform.png'],
            'dseyl': ['assets/dseyl/idle.png', 'assets/dseyl/walk.png', 'assets/dseyl/taunt.png', 'assets/dseyl/dash.png'],
            'enoch': ['assets/enoch/idle.png', 'assets/enoch/run.png', 'assets/enoch/dash_fire.png', 'assets/enoch/atkSlide_water.png']}[ch]
    rows = [('Default', None)] + [(nm, tag) for tag, nm in made]
    tiles = []
    for nm, tag in rows:
        row = []
        for n in cols:
            w = sheets.get(n)
            if not w: continue
            im = Image.open(os.path.join(ROOT, n[:-4] + ('__' + tag if tag else '') + '.png')).convert('RGBA')
            idx = 0 if 'idle' in n else min(2, im.width // w - 1)
            row.append(im.crop((idx * w, 0, idx * w + w, im.height)).resize((w * 2, im.height * 2), Image.NEAREST))
        tiles.append((nm, row))
    W = max(sum(t.width + 6 for t in r) for _, r in tiles) + 190; Hh = sum(max(t.height for t in r) + 6 for _, r in tiles)
    sh = Image.new('RGBA', (W, Hh), (48, 50, 60, 255)); dr = ImageDraw.Draw(sh); y = 0
    for nm, r in tiles:
        dr.text((6, y + 8), nm, fill=(240, 240, 240, 255)); x = 190
        for t in r: sh.alpha_composite(t, (x, y)); x += t.width + 6
        y += max(t.height for t in r) + 6
    p = os.path.join(DOCS, f'contact_{ch}.png'); sh.save(p); print('  sheet', os.path.relpath(p, ROOT))


def main():
    for ch in [a for a in sys.argv[1:] if a in CHARS] or list(CHARS):
        contact(ch, build_char(ch))


if __name__ == '__main__':
    main()
