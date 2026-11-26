#!/usr/bin/env python3
"""tools/skinqa/frames.py — FRAME-BY-FRAME skin QA. For every recolour skin of every fighter, every animation, every frame
cell: compares the skin sheet with the default sheet and reports
  missing   — skin sheet file absent (the skin silently shows default art)
  geom      — frames whose silhouette (alpha) differs from the default (shifted / wrong grid → wrong hitbox look)
  revert    — frames that are (mostly) NOT recoloured while the rest of the skin is (a frame "flashes" back to default)
  dyed      — share of the default's natural skin-tone pixels that the skin turns a non-skin hue (face dyed with the outfit)
  dom       — share of saturated body pixels in one ±18° hue band (≈1.0 = one-colour flat tint)
usage: frames.py allskins.json out.json [key ...]"""
import json, os, sys, colorsys
import numpy as np
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
_cache = {}


def load(p):
    p = p.replace('./', '', 1) if p.startswith('./') else p
    if p in _cache: return _cache[p]
    fp = os.path.join(ROOT, p)
    a = np.array(Image.open(fp).convert('RGBA')) if os.path.exists(fp) else None
    if len(_cache) > 60: _cache.clear()
    _cache[p] = a; return a


def hsv_arr(rgb):
    r, g, b = [rgb[..., i].astype(np.float32) / 255 for i in range(3)]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn + 1e-6
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0); return h, s, mx


def cells(base, info):
    H, W = base.shape[:2]; w = info['w'] or W; h = info['h'] or H; sy = info['sy']
    if h >= H or sy + h > H: sy, h = 0, H
    for i in range(max(1, info['n'])):
        x0 = i * w
        if x0 + w > W: break
        yield i, (slice(sy, sy + h), slice(x0, x0 + w))


def body_palette(base):
    a0 = 'idle' if 'idle' in base else next(iter(base))
    B = load(base[a0]['sheet'])
    if B is None: return set()
    k = B[..., 0].astype(np.int64) * 65536 + B[..., 1].astype(np.int64) * 256 + B[..., 2]
    vals, cnt = np.unique(k[B[..., 3] > 0], return_counts=True)
    return set(vals[cnt >= 4].tolist())


def check_skin(k, base, skin, pal=None):
    res = dict(missing=0, geom=0, revert=0, frames=0, dyed=0.0, dom=0.0, med=0.0, bad=[])
    ch = []; seen = set(); pal = pal if pal is not None else body_palette(base); palarr = np.array(sorted(pal), np.int64)
    for a, sheet in skin['anim'].items():
        b = base[a]
        if (b['sheet'], sheet, b['sy'], b['w']) in seen: continue
        seen.add((b['sheet'], sheet, b['sy'], b['w']))
        B = load(b['sheet']); Sk = load(sheet)
        if B is None: continue
        if Sk is None: res['missing'] += 1; res['bad'].append(f'{a}:missing'); continue
        if Sk.shape != B.shape: res['geom'] += 1; res['bad'].append(f'{a}:size'); continue
        for i, sl in cells(B, b):
            bb, ss = B[sl], Sk[sl]; op = bb[..., 3] > 0; n = int(op.sum())
            if n < 20: continue
            res['frames'] += 1
            if ((bb[..., 3] > 0) != (ss[..., 3] > 0)).sum() > max(6, 0.03 * n): res['geom'] += 1; res['bad'].append(f'{a}#{i}:geom')
            diff = (np.abs(bb[..., :3].astype(int) - ss[..., :3].astype(int)).max(-1) > 14) & op
            kk = bb[..., 0].astype(np.int64) * 65536 + bb[..., 1].astype(np.int64) * 256 + bb[..., 2]
            bodyfrac = float(np.isin(kk[op], palarr).mean()) if palarr.size else 1.0
            px = bb[..., :3][op]; dark = float((px.max(-1) < 34).mean()); ncol = len(np.unique(kk[op]))
            silhouette = dark > 0.8 or ncol <= 3   # solid shadow / silhouette frames: nothing to recolour
            if bodyfrac >= 0.6 and not silhouette: ch.append((a, i, diff.sum() / n))
    if ch:
        m = float(np.median([c for _, _, c in ch])); res['med'] = m
        if m > 0.10:
            for a, i, c in ch:
                if c < max(0.03, 0.30 * m): res['revert'] += 1; res['bad'].append(f'{a}#{i}:revert{c:.2f}')
    # flatness + dyed skin on the idle (or first) sheet
    a0 = 'idle' if 'idle' in skin['anim'] else next(iter(skin['anim']), None)
    if a0:
        B = load(base[a0]['sheet']); Sk = load(skin['anim'][a0])
        if B is not None and Sk is not None and B.shape == Sk.shape:
            op = (B[..., 3] > 0) & (B[..., :3].max(-1) > 30)
            hb, sb, vb = hsv_arr(B[..., :3]); hs, ss_, vs = hsv_arr(Sk[..., :3])
            skin_px = op & (((hb >= 4) & (hb <= 42)) | (hb >= 352)) & (sb >= 0.16) & (sb <= 0.7) & (vb >= 0.3)
            if skin_px.sum() > 30:
                dh = np.abs(((hs - hb) + 180) % 360 - 180)
                res['dyed'] = float(((dh > 28) & (ss_ > 0.18) | (np.abs(ss_ - sb) > 0.45))[skin_px].mean())
            sat = op & (ss_ > 0.22) & (vs > 0.15)
            if sat.sum() > 50:
                hist = np.histogram(hs[sat], bins=36, range=(0, 360))[0]; hist2 = np.concatenate([hist, hist[:1]])
                res['dom'] = float((hist2[:-1] + hist2[1:]).max() / sat.sum())
    res['bad'] = res['bad'][:8]
    return res


def main():
    d = json.load(open(sys.argv[1])); keys = sys.argv[3:] or list(d)
    out = json.load(open(sys.argv[2])) if os.path.exists(sys.argv[2]) else {}
    for k in keys:
        v = d[k]; out[k] = {}; pal = body_palette(v['base'])
        for s in v['skins']:
            if not s['anim']: continue
            out[k][s['id']] = dict(name=s['name'], cls=s['cls'], **check_skin(k, v['base'], s, pal))
        json.dump(out, open(sys.argv[2], 'w'))
        print(k, len(out[k]), flush=True)


if __name__ == '__main__':
    main()
