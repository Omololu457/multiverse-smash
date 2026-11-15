#!/usr/bin/env python3
"""Robin — precompute the TEN appearance skins (cosmetic only).

Input: the extracted default art (assets/robin/*.png strips, icons/expressions.png, cutscene bust / mask / mouth
overlays, portrait.png, fx strips; produced by tools/robin/extract.py) and the palette spec tools/robin/skins.json.

The source palette shares ONE navy ramp between hair, cape exterior, staff and boots, and ONE green ramp between the
sleeves / gloves and the legs, so a global colour swap would be wrong. Every image is classified per pixel by
CONNECTED COMPONENT (8-connected, per 160×104 cell for strips):
  navy   eye   — tiny component touching an eye-white inside the face box (mask lens shading; preserved)
         staff — thin elongated component (area / longest side ≤ 3.2, longest side ≥ 12)
         hair  — component whose box meets the face box (grown by ~face height) and whose centre is not below the
                 face centre + 30 % of the face height
         boots — component touching a boot-white highlight away from the face
         cape  — every other navy component (exterior)
  green  legs  — component touching a boot component (fallback: reaches the lowest 18 % of the figure)
         arms  — every other green component (sleeves + gloves: the source draws them as ONE green ramp with no
                 dividing outline, so they share a region and a ramp)
  yellow lining — component touching more cape than torso; belt otherwise
  red    torso
  white  boot highlight when touching boots (→ boots ramp[0]); eye whites / face highlight preserved
Black outline (which is also the source's black domino mask), natural skin (S0 / S1 / SD) and eye whites are never
recoloured. Alpha, dimensions and strip layout are byte-for-byte the default's, so geometry / hitboxes / timing are
identical. Icons are head-only (their navy is hair). FX strips are luminance-ranked onto the skin's effect ramps.

MATERIALS (Starfield Detective stars, Gilded Night glitter) are 4 precomputed overlay phases per strip
(assets/robin/skins/<tag>/mat/p<k>/<strip>.png), written only on pixels of the listed cloth / trim regions; sparse
deterministic hash placement, no RNG.

Usage: python3 tools/robin/build_skins.py
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/robin'
OUT = A / 'skins'
DOC = ROOT / 'docs/skins/robin'
SPEC = json.loads((ROOT / 'tools/robin/skins.json').read_text())
FW, FH = 160, 104
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))

BLACK = (0, 0, 0)
NAVY = [(136, 176, 224), (64, 112, 168), (0, 48, 96)]                 # light → dark
NAVY_X = [(32, 32, 112), (0, 24, 48)]                                 # stray dark pixels → navy dark
GREEN = [(0, 208, 96), (0, 168, 72), (0, 104, 72)]
YELLOW = [(248, 208, 0), (200, 136, 16)]
RED = [(224, 24, 48), (128, 24, 32)]
SKIN = [(248, 208, 168), (192, 152, 120), (64, 56, 40)]
WHITE = [(240, 248, 248), (248, 248, 224)]
ICON_NAVY = [(136, 176, 224), (56, 112, 168), (0, 40, 96)]
COSTUME = set(NAVY + GREEN + YELLOW + RED + ICON_NAVY)
EIGHT = np.ones((3, 3), bool)


def eq(a, c): return (a[..., 0] == c[0]) & (a[..., 1] == c[1]) & (a[..., 2] == c[2])


def anyof(a, cs):
    m = np.zeros(a.shape[:2], bool)
    for c in cs: m |= eq(a, c)
    return m


def shade_index(a, ramp):
    """→ per-pixel index into `ramp` (-1 where none)."""
    idx = np.full(a.shape[:2], -1)
    for i, c in enumerate(ramp): idx[eq(a, c)] = i
    return idx


def comps(mask):
    lab, n = ndimage.label(mask, structure=EIGHT)
    return lab, n


def touches(cm, other):
    return bool((ndimage.binary_dilation(cm, structure=EIGHT) & other).any())


def classify(rgba, head_only=False):
    """→ dict region → bool mask for one cell / image."""
    a = rgba[..., :3]; op = rgba[..., 3] > 0
    navy = anyof(a, NAVY + NAVY_X) & op
    green = anyof(a, GREEN) & op; yel = anyof(a, YELLOW) & op; red = anyof(a, RED) & op
    skin = anyof(a, SKIN[:2]) & op; white = anyof(a, WHITE) & op
    Z = lambda: np.zeros(a.shape[:2], bool)
    R = {k: Z() for k in ('hair', 'cape', 'staff', 'boots', 'eye', 'arms', 'legs', 'lining', 'belt', 'torso', 'bootwhite')}
    if head_only:
        R['hair'] = anyof(a, ICON_NAVY) & op
        return R
    ys, xs = np.nonzero(op)
    if len(ys) == 0: return R
    fig_top, fig_bot = ys.min(), ys.max()
    if skin.any():
        sl, sn = comps(skin)
        sizes = ndimage.sum(skin, sl, range(1, sn + 1))
        face = sl == (int(np.argmax(sizes)) + 1)
        fy, fx = np.nonzero(face)
        fbox = [fy.min(), fy.max(), fx.min(), fx.max()]; fcy, fcx = fy.mean(), fx.mean()
    else:
        fbox = [fig_top, fig_top + 10, xs.min(), xs.max()]; fcy, fcx = fig_top + 5, xs.mean()
    fh = max(4, fbox[1] - fbox[0] + 1); grow = int(round(fh * 1.0)) + 2
    gbox = [fbox[0] - grow, fbox[1] + grow // 2, fbox[2] - grow, fbox[3] + grow]
    near_face = Z(); near_face[max(0, gbox[0]):max(0, gbox[1] + 1), max(0, gbox[2]):max(0, gbox[3] + 1)] = True
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    hair_zone = (yy <= fbox[1] + 1) & (np.hypot(yy - fcy, xx - fcx) <= fh * 1.8 + 6)
    lab, n = comps(navy)
    low_line = fig_top + 0.62 * (fig_bot - fig_top + 1)
    pending = []
    for i in range(1, n + 1):
        cm = lab == i; cy, cx = np.nonzero(cm); area = len(cy)
        bh, bw = np.ptp(cy) + 1, np.ptp(cx) + 1; longest = max(bh, bw)
        lining_touch = touches(cm, yel)                        # hair / staff / boots never border the cape lining
        if area <= 8 and touches(cm, white) and (cm & near_face).any(): R['eye'] |= cm
        elif lining_touch: R['cape'] |= cm
        elif longest >= 12 and area / longest <= 3.2: R['staff'] |= cm
        elif (cm & near_face).any() and (cm & hair_zone).sum() >= 0.25 * area:
            rest = cm & ~hair_zone                             # hair merged with the collar / cape → split per pixel
            if rest.sum() > 12: R['hair'] |= cm & hair_zone; R['cape'] |= rest
            else: R['hair'] |= cm
        elif touches(cm, white & ~near_face) or cy.mean() >= low_line: R['boots'] |= cm
        else: pending.append(cm)
    near_boot = ndimage.binary_dilation(R['boots'], structure=EIGHT, iterations=3)
    for cm in pending:                                         # small boot fragments split off by the outline
        (R['boots'] if cm.sum() <= 20 and (cm & near_boot).any() else R['cape'])[...] |= cm
    R['bootwhite'] = white & ndimage.binary_dilation(R['boots'], structure=EIGHT) & ~near_face
    lab, n = comps(green)
    low = fig_bot - 0.18 * (fig_bot - fig_top + 1)
    for i in range(1, n + 1):
        cm = lab == i
        if touches(cm, ndimage.binary_dilation(R['boots'], structure=EIGHT, iterations=2)) or (not R['boots'].any() and np.nonzero(cm)[0].max() >= low): R['legs'] |= cm
        else: R['arms'] |= cm
    lab, n = comps(yel)
    for i in range(1, n + 1):
        cm = lab == i; g = ndimage.binary_dilation(cm, structure=EIGHT); cy, cx = np.nonzero(cm)
        beltish = np.ptp(cy) + 1 <= 5 and len(cy) <= 45 and (g & (red | R['legs'] | R['arms'])).any()
        (R['belt'] if beltish and (g & R['cape']).sum() <= (g & (red | R['legs'])).sum() else R['lining'])[...] |= cm
    R['torso'] = red
    return R


RAMP_SRC = {'hair': NAVY, 'cape': NAVY, 'staff': NAVY, 'boots': NAVY, 'arms': GREEN, 'legs': GREEN,
            'lining': YELLOW, 'belt': YELLOW, 'torso': RED}
SPEC_KEY = {'hair': 'hair', 'cape': 'cape', 'staff': 'staff', 'boots': 'boots', 'arms': 'arms', 'legs': 'legs',
            'lining': 'lining', 'belt': 'belt', 'torso': 'torso'}


def recolor(rgba, R, sk, head_only=False):
    out = rgba.copy(); a = rgba[..., :3]
    for reg, src in RAMP_SRC.items():
        m = R[reg]
        if not m.any(): continue
        ramp = [H(h) for h in sk[SPEC_KEY[reg]]]
        if reg == 'boots': ramp = ramp[1:]                     # boots[0] is the highlight that replaces boot-white
        srcs = ICON_NAVY if head_only and reg == 'hair' else src
        for j, c in enumerate(srcs):
            out[m & eq(a, c), :3] = ramp[min(j, len(ramp) - 1)]
        for c in NAVY_X:                                       # stray dark pixels → the region's darkest shade
            out[m & eq(a, c), :3] = ramp[-1]
    out[R['bootwhite'], :3] = H(sk['boots'][0])
    return out


def per_cell(img, fn):
    """Apply fn(cell_rgba) → (cell_out, regions) cell by cell along a 160-wide strip."""
    n = max(1, img.shape[1] // FW); outs = []; regs = []
    for i in range(n):
        o, r = fn(img[:, i * FW:(i + 1) * FW]); outs.append(o); regs.append(r)
    return np.concatenate(outs, 1), regs


def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def lum_remap(rgba, ramp_dark_to_light):
    """Luminance-ranked remap of every non-black opaque colour onto the target ramp (dark → light)."""
    out = rgba.copy(); a = rgba[..., :3]; op = rgba[..., 3] > 0
    cols = sorted({tuple(int(v) for v in c) for c in a[op]} - {BLACK}, key=lum)
    if not cols: return out
    lo, hi = lum(cols[0]), lum(cols[-1]); T = ramp_dark_to_light
    for c in cols:
        u = 0 if hi == lo else (lum(c) - lo) / (hi - lo); p = u * (len(T) - 1); k = min(len(T) - 2, int(p)); w = p - k
        tgt = tuple(int(round(T[k][i] + (T[k + 1][i] - T[k][i]) * w)) for i in range(3))
        out[op & eq(a, c), :3] = tgt
    return out


def h32(*v):
    x = 2166136261
    for t in v:
        x = ((x ^ (int(t) & 0xffffffff)) * 16777619) & 0xffffffff
        x ^= x >> 13; x = (x * 0x5bd1e995) & 0xffffffff; x ^= x >> 15
    return x / 4294967296


def material_phases(shape, regs, mat, salt):
    """4 overlay phases for a strip; regs = per-cell region dicts."""
    dens = mat['density']; cols = [H(c) for c in mat['colors']]; phases = []
    allow = np.zeros(shape[:2], bool)
    for i, R in enumerate(regs):
        m = np.zeros((FH, FW), bool)
        for r in mat['regions']: m |= R[r]
        # keep 1px off the region edge so a sparkle never sits on an outline
        allow[:, i * FW:(i + 1) * FW] = ndimage.binary_erosion(m, structure=np.ones((3, 3), bool))
    ys, xs = np.nonzero(allow)
    for k in range(4):
        ov = np.zeros((shape[0], shape[1], 4), np.uint8)
        for y, x in zip(ys, xs):
            cell = x // FW; lx = x % FW
            if h32(salt, cell, lx, y) >= dens: continue
            if h32(salt, lx, y, k, 7) < 0.3: continue                       # this sparkle rests in phase k
            c = cols[int(h32(lx, y, 3) * len(cols))]
            ov[y, x] = (*c, 255)
            if mat['kind'] == 'stars' and h32(lx, y, k, 11) < 0.25:         # an occasional 4-point star
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    yy, xx = y + dy, x + dx
                    if allow[yy, xx]: ov[yy, xx] = (*c, 150)
        phases.append(ov)
    return phases


def save(arr, path):
    path.parent.mkdir(parents=True, exist_ok=True); Image.fromarray(arr, 'RGBA').save(path)


def load(p): return np.array(Image.open(p).convert('RGBA'))


def main():
    strips = sorted(p for p in A.glob('*.png') if p.name not in ('portrait.png', 'credit_panel.png'))
    CUT = ['bust', 'mask0', 'mask1', 'mouth0', 'mouth1', 'mouth2']
    over = json.loads((ROOT / 'robinSprites.js').read_text().split('export const ROBIN_CUTSCENE = ')[1].split('\n')[0])['overlays']
    bust = load(A / 'cutscene/bust.png')
    # cache classification of the default art (shared by every skin)
    strip_regs = {}
    for p in strips:
        img = load(p); strip_regs[p.name] = (img, per_cell(img, lambda c: (c, classify(c)))[1])
    bustR = classify(bust)
    icon = load(A / 'icons/expressions.png'); iconR = classify(icon, head_only=True)
    por = load(A / 'portrait.png'); porR = classify(por)
    cutR = {}
    for k in CUT[1:]:
        im = load(A / f'cutscene/{k}.png'); o = over[k]
        cutR[k] = (im, {r: m[o['y']:o['y'] + im.shape[0], o['x']:o['x'] + im.shape[1]] for r, m in bustR.items()})
    fx = {n: load(A / f'fx/{n}_strip.png') for n in ('explosion', 'smoke', 'bomb')}

    audit = {'regions': {}, 'skins': {}}
    for name, (img, regs) in strip_regs.items():
        audit['regions'][name] = {r: int(sum(R[r].sum() for R in regs)) for r in regs[0]}
    audit['regions']['bust'] = {r: int(m.sum()) for r, m in bustR.items()}
    audit['regions']['portrait'] = {r: int(m.sum()) for r, m in porR.items()}

    table = []
    for si, sk in enumerate(SPEC):
        tag = sk['tag']; d = OUT / tag; leftover = 0; alpha_ok = True
        for name, (img, regs) in strip_regs.items():
            out = np.concatenate([recolor(img[:, i * FW:(i + 1) * FW], R, sk) for i, R in enumerate(regs)], 1)
            alpha_ok &= bool((out[..., 3] == img[..., 3]).all())
            eye = np.concatenate([R['eye'] for R in regs], 1)   # mask-lens shading is preserved on purpose
            leftover += int((anyof(out[..., :3], COSTUME) & (out[..., 3] > 0) & ~eye).sum())
            save(out, d / name)
            if sk.get('material'):
                for k, ov in enumerate(material_phases(img.shape, regs, sk['material'], si * 977 + len(name))):
                    save(ov, d / f'mat/p{k}/{name}')
        save(recolor(bust, bustR, sk), d / 'cutscene/bust.png')
        for k, (im, R) in cutR.items(): save(recolor(im, R, sk), d / f'cutscene/{k}.png')
        save(recolor(icon, iconR, sk, head_only=True), d / 'icons/expressions.png')
        save(recolor(por, porR, sk), d / 'portrait.png')
        fxr = [H(c) for c in sk['fx']][::-1]                     # spec light → dark; remap wants dark → light
        save(lum_remap(fx['explosion'], fxr), d / 'fx/explosion_strip.png')
        save(lum_remap(fx['smoke'], [H(c) for c in sk['smoke']]), d / 'fx/smoke_strip.png')
        save(lum_remap(fx['bomb'], [H(c) for c in sk['bomb']][::-1]), d / 'fx/bomb_strip.png')
        audit['skins'][tag] = {'costumePixelsLeftOutsideEyes': leftover, 'alphaIdentical': alpha_ok}
        assert alpha_ok and leftover == 0, (tag, leftover)
        table.append({k: sk[k] for k in ('id', 'tag', 'name', 'classification', 'crossover', 'inspiration', 'hud', 'echo', 'material')})

    (ROOT / 'robinSkinTable.js').write_text('// Generated by tools/robin/build_skins.py from tools/robin/skins.json — do not hand-edit.\n'
                                            'export const ROBIN_SKIN_TABLE = ' + json.dumps(table, indent=1, ensure_ascii=False) + '\n')
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'region_mapping.json').write_text(json.dumps(audit, indent=1) + '\n')

    # contact sheet: default + 10 skins × (idle0, heavy4, rExpress3, air2, bust, icon, fx)
    picks = [('idle.png', 0), ('heavy.png', 5), ('rExpress.png', 4), ('air.png', 3), ('rHack.png', 6), ('doubleJump.png', 2)]
    rows = [('DEFAULT', A)] + [(s['name'].upper(), OUT / s['tag']) for s in SPEC]
    S = 2; cw = 110; rh = 104 * S // 1 + 8
    sheet = Image.new('RGBA', (180 + cw * S * len(picks) // 1 + 63 * S + 45 * S * 2 + 40, rh * len(rows)), (34, 36, 44, 255))
    dr = ImageDraw.Draw(sheet)
    for ri, (label, base) in enumerate(rows):
        y = ri * rh; dr.text((8, y + rh // 2 - 6), label, fill=(235, 235, 240, 255))
        x = 180
        for fn, fi in picks:
            im = Image.open(base / fn).convert('RGBA'); cell = im.crop((fi * FW + 25, 0, fi * FW + 25 + cw, FH))
            sheet.alpha_composite(cell.resize((cw * S, FH * S), Image.NEAREST), (x, y + 4)); x += cw * S
        b = Image.open(base / 'cutscene/bust.png').convert('RGBA'); sheet.alpha_composite(b.resize((63 * S, 77 * S), Image.NEAREST), (x, y + 30)); x += 63 * S + 10
        e = Image.open(base / 'fx/explosion_strip.png').convert('RGBA').crop((45 * 4, 0, 45 * 5, 38))
        sheet.alpha_composite(e.resize((45 * S, 38 * S), Image.NEAREST), (x, y + 30))
        bm = Image.open(base / 'fx/bomb_strip.png').convert('RGBA'); sheet.alpha_composite(bm.resize((16 * 3, 7 * 3), Image.NEAREST), (x, y + 140))
        sk = Image.open(base / 'fx/smoke_strip.png').convert('RGBA').crop((0, 0, 45, 38))
        sheet.alpha_composite(sk.resize((45 * S, 38 * S), Image.NEAREST), (x + 45 * S, y + 30))
    sheet.save(DOC / 'skins_contact.png'); sheet.save(ROOT / 'docs/robin/skins_contact.png')
    print(json.dumps(audit['skins'], indent=0))


if __name__ == '__main__':
    main()
