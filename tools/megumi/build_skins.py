#!/usr/bin/env python3
"""Megumi Fushiguro — precompute the TEN appearance skins (cosmetic only).

Input: the extracted default strips (assets/megumi_fushiguro/*.png + portrait.png, produced by tools/megumi/extract.py),
their cell geometry (megumiSprites.js, dumped through node) and the palette spec tools/megumi/skins.json.

The source is a downscaled JPG, so colours are continuous (no exact palette indices). Every opaque pixel is classified
PER CELL into one region; the classification is computed once from the DEFAULT art and shared by every skin:
  outline  — dark (max channel < 40) pixels 4-adjacent to transparency (the silhouette edge)       → never recoloured
  skin     — warm pixels (R ≥ 120, R − B ≥ 45, G ≥ 70): face / hands, and warm gold accents          → never recoloured
  fx       — bright saturated pixels (V ≥ 0.55, S ≥ 0.35, not warm): aura strokes, blue slashes      → skin fx ramp
           — and light pixels (min ≥ 150) outside the body column (blade / arc highlights)
  shadow   — remaining pixels more than BODY_HALF px from the cell's root anchor column (domain spread, aura,
             stored-weapon shadow)                                                                    → skin shadow ramp
  hair     — remaining dark/cool pixels inside the head box: rows from the figure top down to the face's
             vertical centre, within ±HEAD_HALF px of the face centre column (no face found → no hair) → hair ramp
  summon   — win.png only: Nue behind Megumi (rows above floor − 46 + outside the body column)                     → never recoloured
  uniform  — every remaining body pixel                                                               → uniform ramp
Recolour = luminance-preserving: the pixel's luminance (relative to its region's range in that cell) picks a point
on the skin's 3-stop ramp. Alpha, dimensions and strip layout are byte-for-byte the default's, so geometry, hitboxes,
timing and frame data are identical. Patterns ('stars', 'circuit') are static, sparse, deterministic hash placements
on uniform pixels only (no RNG). Summon strips are NOT recoloured (separate creatures).

Writes assets/megumi_fushiguro/skins/<tag>/*.png, megumiSkinTable.js, docs/skins/megumi/region_mapping.json and
docs/megumi/skins_contact.png.   Usage: python3 tools/megumi/build_skins.py
"""
from pathlib import Path
import json, subprocess
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/megumi_fushiguro'
OUT = A / 'skins'
DOC = ROOT / 'docs/skins/megumi'
SPEC = json.loads((ROOT / 'tools/megumi/skins.json').read_text())
BODY_HALF, HEAD_HALF = 18, 11
H = lambda s: np.array([int(s[i:i + 2], 16) for i in (1, 3, 5)], float)

anim = json.loads(subprocess.run(['node', '-e', "import('./megumiSprites.js').then(m=>console.log(JSON.stringify(m.MEGUMI_ANIM)))"],
                                 cwd=ROOT, capture_output=True, text=True, check=True).stdout)
# unique strips (several actions share a sheet)
STRIPS = {}
for k, d in anim.items():
    STRIPS.setdefault(Path(d['sheet']).name, d)

REG = {'outline': 0, 'skin': 1, 'fx': 2, 'shadow': 3, 'hair': 4, 'uniform': 5, 'summon': 6}
# strips whose cells also contain summon art above Megumi (win pose: Nue behind him) → rows above floor − SUMMON_ROWS kept
SUMMON_ABOVE = {'win.png': 46}


def classify_cell(c, ox, oy=None, summon_rows=None):
    """c: HxWx4 uint8 cell → int region map (-1 transparent)."""
    h, w = c.shape[:2]
    a = c[..., 3] > 0
    rgb = c[..., :3].astype(int)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    reg = np.full((h, w), -1)
    pad = np.pad(a, 1, constant_values=False)
    edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    warm = (R >= 120) & (R - B >= 45) & (G >= 70)
    bright = (mx >= 140) & (sat >= 0.35) & ~warm
    xs = np.arange(w)[None, :].repeat(h, 0)
    out_col = np.abs(xs - ox) > BODY_HALF
    light_out = (mn >= 150) & out_col
    reg[a] = REG['uniform']
    if summon_rows:   # summon art above Megumi: excluded from every Megumi region (never recoloured)
        above = np.arange(h)[:, None] < (oy - summon_rows)
        a = a & ~above
        reg[(c[..., 3] > 0) & above] = REG['summon']
    # head box from the face (warm pixels in the top 45 % of the figure, inside the body column)
    ys = np.where(a.any(1))[0]
    if len(ys):
        top, bot = ys[0], ys[-1]
        face = warm & ~out_col & (np.arange(h)[:, None] <= top + 0.45 * (bot - top))
        if face.sum() >= 4:
            fy, fx = np.nonzero(face)
            cy, cx = int(round(fy.mean())), int(round(fx.mean()))
            head = (np.arange(h)[:, None] <= cy) & (np.abs(xs - cx) <= HEAD_HALF)
            reg[a & head] = REG['hair']
    nue_side = out_col if summon_rows else np.zeros_like(out_col)
    reg[a & out_col] = REG['summon'] if summon_rows else REG['shadow']
    reg[a & (bright | light_out) & ~nue_side] = REG['fx']
    reg[a & warm & ~nue_side] = REG['skin']
    reg[edge & (mx < 40)] = REG['outline']
    return reg


def ramp(stops, t):
    s = [H(x) for x in stops]
    t = np.clip(t, 0, 1)[..., None]
    lo = s[0] + (s[1] - s[0]) * np.clip(t / 0.45, 0, 1)
    return np.where(t < 0.45, lo, s[1] + (s[2] - s[1]) * np.clip((t - 0.45) / 0.55, 0, 1))


def hsh(x, y, k):
    v = (x * 73856093) ^ (y * 19349663) ^ (k * 83492791)
    v = (v ^ (v >> 13)) * 1274126177 & 0xffffffff
    return (v ^ (v >> 16)) & 0xffff


def recolor(c, reg, sk, cell_index):
    out = c.copy()
    rgb = c[..., :3].astype(float)
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255
    for name in ('hair', 'uniform', 'fx', 'shadow'):
        m = reg == REG[name]
        if not m.any(): continue
        l = lum[m]
        lo, hi = (0.0, max(0.55, float(l.max()))) if name != 'fx' else (float(l.min()) * 0.6, max(0.6, float(l.max())))
        t = (l - lo) / max(1e-3, hi - lo)
        out[..., :3][m] = np.clip(np.rint(ramp(sk[name], t)), 0, 255).astype(np.uint8)
    pat = sk.get('pattern')
    if pat:
        ys, xs = np.nonzero(reg == REG['uniform'])
        for y, x in zip(ys, xs):
            v = hsh(int(x), int(y), cell_index)
            if pat == 'stars' and v % 23 == 0:
                out[y, x, :3] = (255, 255, 255) if v % 2 else (190, 230, 255)
            elif pat == 'circuit' and (v % 17 == 0 or (v % 41 == 1 and x % 3 == 0)):
                out[y, x, :3] = (60, 255, 140)
    return out


def main():
    OUT.mkdir(exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    regions, audit = {}, {}
    srcs = {}
    for name, d in STRIPS.items():
        im = np.array(Image.open(A / name).convert('RGBA'))
        W, n = d['width'], d['frames']
        assert im.shape[1] == W * n, (name, im.shape, W, n)
        rm = np.full(im.shape[:2], -1)
        for i in range(n):
            rm[:, i * W:(i + 1) * W] = classify_cell(im[:, i * W:(i + 1) * W], d['originX'], d['originY'], SUMMON_ABOVE.get(name))
        regions[name] = rm; srcs[name] = (im, W, n)
        audit[name] = {k: int((rm == v).sum()) for k, v in REG.items()}
    por = np.array(Image.open(A / 'portrait.png').convert('RGBA'))
    por_reg = classify_cell(por, por.shape[1] // 2)
    audit['portrait.png'] = {k: int((por_reg == v).sum()) for k, v in REG.items()}
    table = []
    for sk in SPEC['skins']:
        assert sk['id'].startswith('mg_') and not sk['id'].endswith('AlienX') and 'cyborg' not in sk['id'].lower()
        d_out = OUT / sk['tag']; d_out.mkdir(exist_ok=True)
        for name, (im, W, n) in srcs.items():
            o = im.copy()
            for i in range(n):
                sl = slice(i * W, (i + 1) * W)
                o[:, sl] = recolor(im[:, sl], regions[name][:, sl], sk, i)
            assert (o[..., 3] == im[..., 3]).all()
            Image.fromarray(o).save(d_out / name, optimize=True)
        Image.fromarray(recolor(por, por_reg, sk, 0)).save(d_out / 'portrait.png', optimize=True)
        table.append({k: sk[k] for k in ('id', 'tag', 'name', 'classification', 'crossover', 'inspiration', 'hud', 'echo')} | {'pattern': sk.get('pattern')})
    (ROOT / 'megumiSkinTable.js').write_text('// Generated by tools/megumi/build_skins.py from tools/megumi/skins.json — do not hand-edit.\nexport const MEGUMI_SKIN_TABLE = '
                                             + json.dumps(table, indent=1, ensure_ascii=False) + '\n')
    (DOC / 'region_mapping.json').write_text(json.dumps({'rules': __doc__.split('Recolour')[0].strip(), 'pixelsPerRegion': audit}, indent=1, ensure_ascii=False))
    contact(table)
    print('skins', len(table), 'strips', len(srcs))


def contact(table):
    """Review sheet: per skin row — idle, heavy, mNue gesture, ultSign, portrait (×3 nearest) + a region-map row."""
    picks = [('idle.png', 0), ('heavy.png', 7), ('mDog.png', 3), ('ultSign.png', 6), ('win.png', 8)]
    S, rows = 3, [('default', A)] + [(t['name'], OUT / t['tag']) for t in table]
    cells = []
    for _, base in rows:
        r = []
        for name, i in picks:
            d = STRIPS[name]; im = Image.open(base / name).convert('RGBA')
            r.append(im.crop((i * d['width'], 0, (i + 1) * d['width'], d['height'])).resize((d['width'] * S, d['height'] * S), Image.NEAREST))
        p = Image.open(base / 'portrait.png').convert('RGBA'); r.append(p.resize((p.width * S, p.height * S), Image.NEAREST))
        cells.append(r)
    colw = [max(r[j].width for r in cells) + 12 for j in range(len(cells[0]))]
    rowh = max(c.height for r in cells for c in r) + 22
    # region row (default idle/heavy/... coloured by region)
    pal = {6: (60, 60, 60), 0: (0, 0, 0), 1: (240, 190, 140), 2: (60, 200, 255), 3: (120, 60, 160), 4: (230, 80, 80), 5: (90, 110, 200)}
    W = 220 + sum(colw); Hh = rowh * (len(cells) + 1) + 10
    img = Image.new('RGBA', (W, Hh), (54, 58, 72, 255)); dr = ImageDraw.Draw(img)
    for ri, r in enumerate(cells):
        y = 6 + ri * rowh; dr.text((8, y + 8), rows[ri][0], fill=(240, 240, 250))
        x = 220
        for j, c in enumerate(r):
            img.alpha_composite(c, (x, y + rowh - 22 - c.height)); x += colw[j]
    y = 6 + len(cells) * rowh; dr.text((8, y + 8), 'regions (outline/skin/fx/shadow/hair/uniform)', fill=(240, 240, 250)); x = 220
    for name, i in picks:
        d = STRIPS[name]; rm = np.array([[0]])
        im = np.array(Image.open(A / name).convert('RGBA'))[:, i * d['width']:(i + 1) * d['width']]
        reg = classify_cell(im, d['originX'], d['originY'], SUMMON_ABOVE.get(name))
        o = np.zeros(im.shape, np.uint8)
        for k, col in pal.items(): o[reg == k] = (*col, 255)
        c = Image.fromarray(o).resize((d['width'] * S, d['height'] * S), Image.NEAREST)
        img.alpha_composite(c, (x, y + rowh - 22 - c.height)); x += colw[picks.index((name, i))]
    img.save(ROOT / 'docs/megumi/skins_contact.png', optimize=True)


if __name__ == '__main__':
    main()
