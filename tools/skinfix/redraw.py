#!/usr/bin/env python3
"""tools/skinfix/redraw.py — REDRAW an existing recolour skin in place with a proper shaded theme (tools/creativeskins engine:
region split → per-region dark→light ramps shaded by each pixel's own brightness + deterministic texture; outline, eyes and
skin tones kept). The skin keeps its id and tag, so nothing that references it changes — only the art does.

    python3 tools/skinfix/redraw.py KEY TAG THEME [--preview DIR]      (TAG = the `__<tag>.png` suffix the skin's sheets use)

Only sheets that the skin already has (`<sheet>__<TAG>.png` on disk) are rewritten. The portrait is the default portrait
pushed through the colour map learned from default idle → redrawn idle (keeps the painted mugshot, matches the new look).
Extra themes for these redraws live in THEMES_X below (added to the creative engine's table at import).
"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'creativeskins')); sys.path.insert(0, HERE)
import build as B
from fill_missing import learn, apply as lut_apply

S = lambda *c: list(c)
THEMES_X = {
    'valkyrie':   dict(pat='aura', glint='#fff6c0', hair=S('#8a8e9a', '#c8ccd8', '#eef0f6', '#ffffff'), A=S('#4a5468', '#98a4ba', '#dce4f0', '#ffffff'),
                       B=S('#0c2654', '#22549e', '#4e94e0', '#b8dcff'), C=B.GOLD, D=B.GOLD),
    'lavender':   dict(pat='void', hair=S('#5a3a7a', '#a07ad0', '#d8c0f4', '#f8f0ff'), A=S('#120a22', '#2a1a48', '#4a3278', '#7a5ab0'),
                       B=S('#0c0618', '#1e1236', '#38265e', '#5e4690'), C=B.PURPLE, D=B.WHITE),
    'obsidian':   dict(pat='facet', hair=S('#020203', '#0e0c12', '#241c2a', '#4a3442'), A=S('#030304', '#0e0c10', '#221c26', '#463a4c'),
                       B=S('#020203', '#0a080c', '#18141c', '#30283a'), C=B.RED, D=S('#5a0a0a', '#a01818', '#e04040', '#ffb0a0')),
    'crimsonraiment': dict(pat='hemflame', flame=['#6a4a04', '#e0a81e', '#fff08a'], A=S('#2a0206', '#6a0a14', '#b01a24', '#ff6a5a'),
                       B=S('#3a0206', '#7a0e16', '#c42a2a', '#ff8a70'), C=B.GOLD, D=B.WHITE),
    'zerohand':   dict(pat='aura', glint='#ffe27a', hair=B.WHITE, A=S('#050506', '#121216', '#24242c', '#40404c'), B=S('#3a2a04', '#8a6a0e', '#d4a826', '#fff0a0'),
                       C=B.GOLD, D=B.BLACK),
    'guanyin':    dict(pat='aura', glint='#fff6c0', hair=B.WHITE, A=B.GOLD, B=S('#4a1e02', '#a8500a', '#f0961e', '#ffe0a0'), C=B.WHITE, D=B.GOLD),
    'springkimono': dict(pat='sakura', hair=S('#6a1a48', '#c04a8a', '#f49ac8', '#ffe0f0'), B=S('#4a0e2e', '#a02a62', '#e8609a', '#ffd0e4'),
                       A=S('#7a7068', '#c8bcb0', '#eee6dc', '#fffaf2'), C=B.PINK, D=S('#1e0a3a', '#4a1a7a', '#8a4ac0', '#dcb0ff')),
    'anbumedic':  dict(pat='facet', hair=S('#6a1a48', '#c04a8a', '#f49ac8', '#ffe0f0'), B=S('#4a4e5a', '#8a90a0', '#c8cedc', '#f4f6ff'),
                       A=B.BLACK, C=S('#3a0408', '#8a0e16', '#d01e28', '#ff6a5a'), D=B.BLACK),
    'byakugou':   dict(pat='byakugou', hair=S('#6a1a48', '#c04a8a', '#f49ac8', '#ffe0f0'), B=S('#14052a', '#36105e', '#6a2aa0', '#b47ae0'),
                       A=S('#08060e', '#16121e', '#2a2436', '#463c56'), C=B.PURPLE, D=B.GOLD),
    # Hinata (painted sheet; A = her hair, B = jacket + shorts, D = jacket stripes + leg wraps, C = sandals)
    'thelast':    dict(remap={'A': 'hair'}, pat='aura', glint='#f0e8ff', hair=S('#0c0a26', '#241e5a', '#463a96', '#8a7ad0'), A=S('#0c0a26', '#241e5a', '#463a96', '#8a7ad0'), B=S('#2e2050', '#6a54a0', '#b09ad8', '#ece2ff'),
                       D=S('#7a7688', '#c0bcd0', '#ece8f6', '#ffffff'), C=S('#140c26', '#2c1e4a', '#4a3a78', '#7a68b0')),
    'gentlefist': dict(remap={'A': 'hair'}, hair=S('#0c0a26', '#241e5a', '#463a96', '#8a7ad0'), A=S('#0c0a26', '#241e5a', '#463a96', '#8a7ad0'), B=S('#060a24', '#101c4e', '#22367e', '#4a62b0'),
                       D=S('#7a7a8a', '#c0c0d0', '#eaeaf4', '#ffffff'), C=S('#04061a', '#0c1236', '#1a2660', '#34468e')),
    'twinlions':  dict(remap={'A': 'hair'}, pat='lightning', bolt='#c8f8ff', hair=S('#0c0a26', '#241e5a', '#463a96', '#8a7ad0'), A=S('#0c0a26', '#241e5a', '#463a96', '#8a7ad0'), B=S('#04163a', '#0a3a8a', '#2a7ae0', '#9ad8ff'),
                       D=B.CYAN, C=S('#020a1e', '#06204a', '#0e3a80', '#2a64b8')),
    'uchihaarmor': dict(pat='scales', A=S('#2a0406', '#6a0e14', '#a81e24', '#e05a50'), B=S('#0a0a14', '#18182a', '#2a2a44', '#44446a'),
                       C=S('#2a0406', '#6a0e14', '#a81e24', '#e05a50'), D=B.GOLD),
    'woodrelease': dict(pat='bark', A=S('#1e1206', '#4a2e12', '#7a5228', '#b48a50'), B=S('#0c2a0e', '#1c5e1e', '#3c9a36', '#8ad87a'),
                       C=S('#1e1206', '#4a2e12', '#7a5228', '#b48a50'), D=B.GREEN),
    'amberpath':  dict(pat='facet', hair=S('#6a2a02', '#c06a0a', '#ffb02a', '#fff0b0'), A=S('#140a02', '#33200a', '#5e3c10', '#946020'),
                       B=S('#140a02', '#33200a', '#5e3c10', '#946020'), C=B.GOLD, D=B.GOLD),
    'crimsonnagato': dict(pat='aura', glint='#ff9a9a', hair=S('#5a0410', '#b0101e', '#f0303a', '#ffa0a0'), A=S('#12020a', '#2c0614', '#4c0e22', '#781a34'),
                       B=S('#12020a', '#2c0614', '#4c0e22', '#781a34'), C=B.WHITE, D=B.RED),
    'zeus':       dict(pat='lightning', bolt='#fff6a0', hair=B.BLACK, A=S('#6a6a74', '#b8b8c4', '#ececf4', '#ffffff'), B=S('#06123a', '#14286a', '#2a4aa8', '#6a8ae0'),
                       C=B.GOLD, D=B.GOLD),
    'crimsonflag': dict(A=S('#2a0206', '#7a0a14', '#c81e28', '#ff7a6a'), B=B.BLACK, C=B.GOLD, D=S('#1a1a2a', '#3a3a5a', '#6a6a9a', '#b0b0e0')),
    'exposedcore': dict(remap={'D': 'keep', 'hair': 'keep'}, pat='circuit', glow='#ff8a1a', A=S('#0a0a0e', '#1c1c24', '#30303c', '#4c4c5a'),
                       B=S('#3a2a1e', '#7a6250', '#c0a890', '#fff0dc'), C=S('#050506', '#141418', '#26262e', '#42424e')),
    # Hashirama: his hair, trousers and outline share one near-black palette (A / hair) → only the armour (B) and trims change
    'h_albedo':   dict(remap={'A': 'keep', 'hair': 'keep', 'C': 'keep'}, pat='aura', glint='#ff6a6a', B=S('#6a6a74', '#b4b4bc', '#e8e8ee', '#ffffff'), C=B.RED, D=B.RED),
    'h_valkyrie': dict(remap={'A': 'keep', 'hair': 'keep', 'C': 'keep'}, pat='aura', glint='#fff6c0', B=S('#2a4a7a', '#5a8ac8', '#a8d0f4', '#f0f8ff'), C=B.GOLD, D=B.GOLD),
    'h_rivals':   dict(remap={'A': 'keep', 'hair': 'keep', 'C': 'keep'}, pat='scales', B=S('#0a1430', '#1a2e5e', '#30509a', '#6a8ad0'), C=B.RED, D=B.RED),
    'h_blossom':  dict(remap={'A': 'keep', 'hair': 'keep', 'C': 'keep'}, pat='sakura', B=S('#5a1a3a', '#b8487a', '#f08ab4', '#ffd8ea'), C=B.WHITE, D=B.PINK),
    'h_gold':     dict(remap={'A': 'keep', 'hair': 'keep', 'C': 'keep'}, pat='aura', glint='#fff6c0', B=B.GOLD, D=S('#3a0408', '#8a0e16', '#d01e28', '#ff6a5a')),
    'h_wood':     dict(remap={'A': 'keep', 'hair': 'keep', 'C': 'keep'}, pat='bark', B=S('#22160a', '#4e3418', '#80582c', '#b88e56'), C=B.GREEN, D=B.GREEN),
    'albedo':     B.THEMES['albedo'][2],
}

_orig_tex = B.apply_tex
def apply_tex(sk, reg, col, t, X, Y, FI, REL):
    p = sk.get('pat')
    if p == 'scales':   # lacquered armour plates: a dark seam every 4 rows + a bright lip on the row under it
        m = np.isin(reg, ('A', 'B', 'C'))
        seam = m & (((Y + (X // 6) * 2) % 4) == 0); lip = m & (((Y + (X // 6) * 2) % 4) == 1)
        col[seam] = col[seam] * 0.55; col[lip] = np.minimum(255, col[lip] * 1.18 + 10); return col
    if p == 'bark':     # wood grain: wavy vertical streaks
        m = np.isin(reg, ('A', 'B', 'C'))
        g = ((X + (2 * np.sin(Y * 0.45 + X * 0.3)).astype(int)) % 5) == 0
        col[m & g] = col[m & g] * 0.6
        col[m & (H3(X, Y // 3, 0, 31) > 0.97)] = col[m & (H3(X, Y // 3, 0, 31) > 0.97)] * 0.5 + np.array([138, 216, 122]) * 0.5
        return col
    if p == 'byakugou': return col
    return _orig_tex(sk, reg, col, t, X, Y, FI, REL)
H3 = B.H3
B.apply_tex = apply_tex
_orig_recolor = B.recolor
def recolor(prep, sk):
    out = _orig_recolor(prep, sk)
    if sk.get('pat') == 'byakugou':   # Hundred Healings seal lines: thin violet strokes over the skin (face diamond + arm lines)
        a, R, rel, L, norms, fw = prep
        yy = np.arange(R.shape[0])[:, None]; xx = np.arange(R.shape[1])[None, :]
        sm = (R == 'skin') & (((rel > 0.06) & (rel < 0.09) & ((xx % fw) % 3 == 0)) | ((rel > 0.3) & (rel < 0.6) & ((yy + xx) % 6 == 0)))
        out[sm, :3] = (122, 42, 192)
    return out


def fill_regions(reg, info, maxd=46):
    """Colours that appear only in attack / special sheets (painted sheets with hundreds of shades) are not in the plain-sheet
    palette, so the creative engine would leave them untouched (the skin "falls off" in those poses). Give each one the region
    of its nearest classified colour (weighted RGB) when it is close enough; keep-region neighbours stay keep."""
    known = np.array(list(reg.keys()), np.int64); names = np.array(list(reg.values()), object)
    K = np.stack([(known >> 16) & 255, (known >> 8) & 255, known & 255], 1).astype(np.float32)
    W = np.array([0.30, 0.59, 0.11], np.float32) * 3
    for s in info['sheets']:
        p = os.path.join(ROOT, s)
        if not os.path.exists(p): continue
        a = np.array(Image.open(p).convert('RGBA')); on = a[..., 3] > 0
        ks = np.array([c for c in np.unique(B.ckey(a[..., :3])[on]).tolist() if c not in reg], np.int64)
        for i in range(0, ks.size, 512):
            c = ks[i:i + 512]; V = np.stack([(c >> 16) & 255, (c >> 8) & 255, c & 255], 1).astype(np.float32)
            d = (((V[:, None, :] - K[None]) ** 2) * W).sum(2); j = d.argmin(1); dm = d[np.arange(len(c)), j] ** 0.5
            for cc, jj, dd in zip(c.tolist(), j.tolist(), dm.tolist()): reg[cc] = names[jj] if dd < maxd else ''
    return reg


def main():
    a = sys.argv[1:]; prev = None
    if '--preview' in a: i = a.index('--preview'); prev = a[i + 1]; del a[i:i + 2]
    a = [x for x in a if x != '--portrait-only']
    key, tag, theme = a
    info = B.char_info(key); ov = B.OVR.get(key, {}); B.Q = ov.get('q', 1)
    B.SKP.update(h=tuple(ov.get('skinh', (4, 42))), s=tuple(ov.get('skins', (0.16, 0.72))), v=ov.get('skinv', 0.26), dark=ov.get('darkskin', False))
    reg = fill_regions(B.regions(key, info, ov), info); sk = THEMES_X[theme] if theme in THEMES_X else B.THEMES[theme][2]
    for c, r in list(reg.items()):
        if r in sk.get('remap', {}): reg[c] = sk['remap'][r]
    written = {}
    for s, fw in info['sheets'].items():
        src = os.path.join(ROOT, s); dst = os.path.join(ROOT, s[:-4] + '__' + tag + '.png')
        if not (os.path.exists(src) and os.path.exists(dst)): continue
        out = B.recolor(B.prep_sheet(src, fw, reg, info['hts'].get(s, 0)), sk)
        written[s] = out
    if prev:
        os.makedirs(prev, exist_ok=True)
        idle = next(s for s, acts in info['acts'].items() if 'idle' in acts)
        atk = next((s for s, acts in info['acts'].items() if any(x in acts for x in ('light', 'heavy', 'combo1'))), idle)
        tiles = []
        for s in (idle, atk):
            fw = info['sheets'][s] or 64; fh = info['hts'].get(s, 0)
            for im in (Image.open(os.path.join(ROOT, s)).convert('RGBA'), Image.open(os.path.join(ROOT, s[:-4] + '__' + tag + '.png')).convert('RGBA'), Image.fromarray(written[s]) if s in written else None):
                if im is None: continue
                f = im.crop((fw * (0 if s == idle else 2), 0, fw * (1 if s == idle else 3), fh or im.height)); bb = f.getbbox()
                if bb: f = f.crop(bb)
                tiles.append(f.resize((f.width * 3, f.height * 3), Image.NEAREST))
        W = sum(t.width + 6 for t in tiles); H = max(t.height for t in tiles) + 16
        o = Image.new('RGBA', (W, H), (88, 94, 106, 255)); x = 0
        for t in tiles: o.alpha_composite(t, (x, 14)); x += t.width + 6
        ImageDraw.Draw(o).text((2, 1), f'{key} {tag} -> {theme}   [default | old | NEW] x2', fill=(255, 255, 255, 255))
        o.save(os.path.join(prev, f'{key}__{tag}.png')); print('preview', key, tag, theme, len(written)); return
    if '--portrait-only' in sys.argv: written = {s: np.array(Image.open(os.path.join(ROOT, s[:-4] + '__' + tag + '.png')).convert('RGBA')) for s in written}
    else:
        for s, out in written.items(): Image.fromarray(out).save(os.path.join(ROOT, s[:-4] + '__' + tag + '.png'), optimize=True)
    # portrait: default portrait through the learned idle colour map
    idle = next(s for s, acts in info['acts'].items() if 'idle' in acts)
    p = info.get('portrait')
    if p and idle in written:
        pp = os.path.join(ROOT, p.lstrip('./')); import re
        dst = os.path.join(ROOT, re.sub(r'\.(png|jpe?g)$', '', p.lstrip('./'), flags=re.I) + '__' + tag + '.png')
        if os.path.exists(pp) and os.path.exists(dst):
            src = Image.open(pp).convert('RGBA')
            if len(src.getcolors(1 << 20) or []) <= 400:   # pixel-art portrait (same palette as the sprite) → learned colour map
                lut = learn([(np.array(Image.open(os.path.join(ROOT, idle)).convert('RGBA')), written[idle])])
                Image.fromarray(lut_apply(lut, np.array(src))).save(dst, optimize=True)
            else:   # painted mugshot: a colour map cannot follow it → head-and-shoulders crop of the redrawn idle (creative-skin plate)
                fw = info['sheets'][idle] or written[idle].shape[1]; fh = info['hts'].get(idle, 0) or written[idle].shape[0]
                W_ = written[idle][:fh]; best = max(range(max(1, W_.shape[1] // fw)), key=lambda i: int((W_[:, i * fw:(i + 1) * fw, 3] > 0).sum()))
                f0 = Image.fromarray(W_[:, best * fw:(best + 1) * fw]); bb = f0.getbbox(); hh = max(8, int((bb[3] - bb[1]) * 0.5))
                f0 = f0.crop((max(0, bb[0] - 1), max(0, bb[1] - 1), min(f0.width, bb[2] + 1), min(f0.height, bb[1] + hh)))
                k = max(1, min(128 // f0.width, 120 // f0.height)); big = f0.resize((f0.width * k, f0.height * k), Image.NEAREST)
                plate = Image.new('RGBA', (128, 128), (14, 18, 32, 255)); plate.alpha_composite(big, ((128 - big.width) // 2, max(0, 128 - big.height)))
                plate.save(dst)
    print(f'{key} {tag} -> {theme}: {len(written)} sheets')


if __name__ == '__main__':
    main()
