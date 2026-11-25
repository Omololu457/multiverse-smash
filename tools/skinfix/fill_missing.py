#!/usr/bin/env python3
"""tools/skinfix/fill_missing.py — regenerate skin sheets that a skin's animationData points at but that do not exist on disk
(a default sheet was added / re-sliced after the skin pack was made, so the skin went blank or fell back in that pose).

For each (fighter, skin) with missing `<sheet>` files it LEARNS the skin's colour map from every pair it does have
(default sheet → skin sheet, same size, pixel-for-pixel) and applies it to the default art of the missing slot:
  * a colour seen in the pairs maps exactly (most votes wins);
  * an unseen colour takes the map of its nearest seen colour, keeping its own brightness offset (so shading survives).
Alpha / grid / size are the default sheet's → identical timing, hitboxes and anchors. Deterministic, no randomness.

    python3 tools/skinfix/fill_missing.py DUMP.json [key ...]      (DUMP = getSkins() dump: {key:{def,skins:[{id,anim}]}})
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P = lambda s: os.path.join(ROOT, s.lstrip('./')) if s else None


def rgba(p): return np.array(Image.open(p).convert('RGBA'))


def learn(pairs):
    votes = {}
    for d, s in pairs:
        if d.shape != s.shape: continue
        m = (d[..., 3] > 0) & (s[..., 3] > 0)
        dk = (d[..., 0].astype(np.int64) << 16) | (d[..., 1].astype(np.int64) << 8) | d[..., 2]
        sk = (s[..., 0].astype(np.int64) << 16) | (s[..., 1].astype(np.int64) << 8) | s[..., 2]
        a, b = dk[m], sk[m]
        pair = a * (1 << 24) + b
        u, n = np.unique(pair, return_counts=True)
        for pp, nn in zip(u.tolist(), n.tolist()):
            k, v = pp >> 24, pp & 0xFFFFFF
            votes.setdefault(k, {}); votes[k][v] = votes[k].get(v, 0) + nn
    lut = {k: max(v.items(), key=lambda kv: kv[1])[0] for k, v in votes.items()}
    return lut


def apply(lut, d):
    out = d.copy()
    if not lut: return None
    src = np.array(list(lut.keys()), np.int64); dst = np.array(list(lut.values()), np.int64)
    S = np.stack([(src >> 16) & 255, (src >> 8) & 255, src & 255], 1).astype(np.float32)
    D = np.stack([(dst >> 16) & 255, (dst >> 8) & 255, dst & 255], 1).astype(np.float32)
    on = d[..., 3] > 0; ys, xs = np.nonzero(on)
    px = d[ys, xs, :3].astype(np.float32)
    uniq, inv = np.unique(px, axis=0, return_inverse=True)
    res = np.zeros_like(uniq)
    for i, c in enumerate(uniq):
        dist = ((S - c) ** 2 * np.array([0.3, 0.59, 0.11])).sum(1)
        j = int(np.argmin(dist))
        if dist[j] < 1e-6: res[i] = D[j]
        else:
            dl = (c * [0.299, 0.587, 0.114]).sum() - (S[j] * [0.299, 0.587, 0.114]).sum()
            res[i] = np.clip(D[j] + dl * 0.85, 0, 255)
    out[ys, xs, :3] = np.round(res[inv.reshape(-1)]).astype(np.uint8)
    return out


def main():
    dump = json.load(open(sys.argv[1])); keys = sys.argv[2:] or list(dump)
    made = []
    for k in keys:
        v = dump[k]; dfa = v.get('def') or {}
        for s in v['skins']:
            an = s.get('anim') or {}
            miss = {}
            for a, x in an.items():
                if isinstance(x, dict) and x.get('sheet') and not os.path.exists(P(x['sheet'])):
                    ds = (dfa.get(a) or {}).get('sheet')
                    if ds and os.path.exists(P(ds)): miss[x['sheet']] = ds
            if not miss: continue
            pairs = []
            for a, x in an.items():
                if not (isinstance(x, dict) and x.get('sheet')): continue
                ds = (dfa.get(a) or {}).get('sheet')
                if ds and ds != x['sheet'] and os.path.exists(P(x['sheet'])) and os.path.exists(P(ds)):
                    pairs.append((rgba(P(ds)), rgba(P(x['sheet']))))
            lut = learn(pairs)
            if not lut: print('  no pairs to learn from:', k, s['id']); continue
            for dst, src in miss.items():
                o = apply(lut, rgba(P(src)))
                Image.fromarray(o).save(P(dst), optimize=True); made.append(dst)
            print(f'{k} {s["id"]}: {len(miss)} sheet(s) from {len(lut)} learned colours')
    print('made', len(made))


if __name__ == '__main__':
    main()
