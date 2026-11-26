#!/usr/bin/env python3
"""tools/skinqa/repair.py — FRAME REPAIR for recolour skins. A recolour skin is (mostly) a colour→colour mapping of the
default sheets. This learns that mapping from the skin's own sheets (every default colour → the colour the skin turns it into,
majority vote, only when the vote is consistent) and re-applies it to pixels the skin left at the default colour in frames
where it should not have (frames that "flash back" to the default outfit). Default colours never seen by the skin borrow the
mapping of the nearest learned colour (RGB distance ≤ 26) — mid-walk shading the original tool missed.
Pixels whose default colour the skin deliberately keeps (outlines, eyes, FX) map to themselves and are untouched.
usage: repair.py allskins.json KEY SKINID [--dry]"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__)); from frames import load, ROOT, _cache


def key(rgb): return rgb[..., 0].astype(np.int64) * 65536 + rgb[..., 1].astype(np.int64) * 256 + rgb[..., 2]


def learn(pairs):
    votes = {}
    for B, S in pairs:
        op = (B[..., 3] > 0) & (S[..., 3] > 0)
        kb = key(B[..., :3])[op]; ks = key(S[..., :3])[op]
        comb = kb * (1 << 24) + ks; u, c = np.unique(comb, return_counts=True)
        for v, n in zip(u.tolist(), c.tolist()):
            b, s_ = v >> 24, v & 0xFFFFFF; d = votes.setdefault(b, {}); d[s_] = d.get(s_, 0) + n
    lut = {}
    for b, d in votes.items():
        tot = sum(d.values()); best = max(d, key=d.get); changed = tot - d.get(b, 0)
        if best != b and d[best] >= 0.5 * changed and changed >= 0.5 * tot: lut[b] = best   # consistently recoloured
        elif d.get(b, 0) >= 0.8 * tot: lut[b] = b                                                 # consistently kept
    return lut


def repair(allskins, k, sid, dry=False):
    v = allskins[k]; sk = next(s for s in v['skins'] if s['id'] == sid)
    sheets = {}
    for a, sh in sk['anim'].items(): sheets[sh] = v['base'][a]['sheet']
    pairs = [(load(b), load(s)) for s, b in sheets.items() if load(b) is not None and load(s) is not None and load(b).shape == load(s).shape]
    lut = learn(pairs)
    if not lut: return 0
    lk = np.array(list(lut), np.int64); lrgb = np.stack([(lk >> 16) & 255, (lk >> 8) & 255, lk & 255], -1).astype(np.int32)
    fixed = 0
    for s, b in sheets.items():
        B, Sk = load(b), load(s)
        if B is None or Sk is None or B.shape != Sk.shape: continue
        op = (B[..., 3] > 0) & (Sk[..., 3] > 0) & (key(B[..., :3]) == key(Sk[..., :3]))   # left at default
        ys, xs = np.nonzero(op)
        if not ys.size: continue
        kb = key(B[ys, xs, :3]); tgt = np.full(kb.shape, -1, np.int64)
        for i, kv in enumerate(kb.tolist()):
            t = lut.get(kv)
            if t is None:
                d = np.abs(lrgb - B[ys[i], xs[i], :3].astype(np.int32)).sum(-1); j = int(d.argmin())
                if d[j] <= 26:
                    src = int(lk[j]); t2 = lut[src]
                    if t2 != src:   # shift by the same delta the neighbour colour gets
                        delta = np.array([(t2 >> 16) & 255, (t2 >> 8) & 255, t2 & 255]) - lrgb[j]
                        c = np.clip(B[ys[i], xs[i], :3].astype(int) + delta, 0, 255); t = int(c[0]) * 65536 + int(c[1]) * 256 + int(c[2])
            if t is not None and t != kv: tgt[i] = t
        m = tgt >= 0
        if not m.any(): continue
        out = Sk.copy(); out[ys[m], xs[m], 0] = (tgt[m] >> 16) & 255; out[ys[m], xs[m], 1] = (tgt[m] >> 8) & 255; out[ys[m], xs[m], 2] = tgt[m] & 255
        fixed += int(m.sum())
        if not dry:
            Image.fromarray(out).save(os.path.join(ROOT, s.replace('./', '', 1)), optimize=True)
            _cache.pop(s.replace('./', '', 1), None)
    return fixed


if __name__ == '__main__':
    d = json.load(open(sys.argv[1])); print(repair(d, sys.argv[2], sys.argv[3], '--dry' in sys.argv))
