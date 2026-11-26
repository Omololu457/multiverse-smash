#!/usr/bin/env python3
"""tools/skinqa/fixall.py — run frames.py findings through repairs, roster-wide:
  * action sheets whose skin art is STALE (silhouette ≠ the current default on most frames, but not a deliberate re-shape:
    the skin's alpha matches the MIRRORED default or a different frame order) → rebuilt = the skin's learned colour mapping
    applied to the current default sheet
  * frames that flash back to the default colours → repair.py (learned mapping on the un-recoloured pixels)
usage: fixall.py allskins.json qa.json [key ...]  → prints what it touched"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from frames import load, cells, ROOT, _cache
from repair import learn, key, repair


def apply_lut(B, lut):
    lk = np.array(list(lut), np.int64); lrgb = np.stack([(lk >> 16) & 255, (lk >> 8) & 255, lk & 255], -1).astype(np.int32)
    out = B.copy(); op = B[..., 3] > 0; kb = key(B[..., :3]); ys, xs = np.nonzero(op)
    u, inv = np.unique(kb[ys, xs], return_inverse=True); res = np.zeros((u.size, 3), np.int64)
    for j, kv in enumerate(u.tolist()):
        rgb = np.array([(kv >> 16) & 255, (kv >> 8) & 255, kv & 255])
        t = lut.get(kv)
        if t is not None: res[j] = [(t >> 16) & 255, (t >> 8) & 255, t & 255]; continue
        d = np.abs(lrgb - rgb).sum(-1); i = int(d.argmin())
        if d[i] <= 26:
            t2 = lut[int(lk[i])]; res[j] = np.clip(rgb + np.array([(t2 >> 16) & 255, (t2 >> 8) & 255, t2 & 255]) - lrgb[i], 0, 255)
        else: res[j] = rgb
    out[ys, xs, :3] = res[inv].astype(np.uint8); return out


def stale(B, S, b):
    if B.shape != S.shape: return False
    bad = tot = 0
    for _, sl in cells(B, b):
        ab, as_ = B[sl][..., 3] > 0, S[sl][..., 3] > 0; n = ab.sum()
        if n < 20: continue
        tot += 1
        if (ab != as_).sum() > max(6, 0.03 * n): bad += 1
    if not tot or bad < 0.5 * tot: return False
    # deliberate re-shapes (hairstyle / costume pieces) keep the default's frame ORDER and pose: overlap stays high.
    # STALE = the skin sheet is a MIRRORED or re-ordered copy of an older default: its silhouette matches the flipped
    # default far better than the default itself. Anything else is a deliberate re-shape and is left alone.
    a, s_ = B[..., 3] > 0, S[..., 3] > 0
    same = (a == s_).mean(); flip = max((a[:, ::-1] == s_).mean(), max(((B[sl][..., 3] > 0)[:, ::-1] == (S[sl][..., 3] > 0)).mean() for _, sl in cells(B, b)))
    return flip > same + 0.01


def main():
    d = json.load(open(sys.argv[1])); qa = json.load(open(sys.argv[2])); keys = sys.argv[3:] or list(qa)
    for k in keys:
        v = d[k]
        for sid, r in qa.get(k, {}).items():
            if not (r['geom'] or r['revert']): continue
            sk = next(s for s in v['skins'] if s['id'] == sid)
            sheets = {}
            for a, sh in sk['anim'].items(): sheets.setdefault(sh, a)
            pairs = [(load(v['base'][a]['sheet']), load(sh)) for sh, a in sheets.items()]
            if all(B is not None and S is not None and B.shape != S.shape for B, S in pairs): continue   # different art, not a recolour
            rebuilt = []
            if r['geom']:
                okpairs = [(B, S) for (sh, a), (B, S) in zip(sheets.items(), pairs) if B is not None and S is not None and B.shape == S.shape and not stale(B, S, v['base'][a])]
                lut = learn(okpairs) if okpairs else {}
                for (sh, a), (B, S) in zip(sheets.items(), pairs):
                    if lut and B is not None and S is not None and stale(B, S, v['base'][a]):
                        Image.fromarray(apply_lut(B, lut)).save(os.path.join(ROOT, sh.replace('./', '', 1)), optimize=True)
                        _cache.pop(sh.replace('./', '', 1), None); rebuilt.append(a)
            fixed = repair(d, k, sid) if r['revert'] or rebuilt else 0
            print(f'{k} {sid}: rebuilt={rebuilt} repaired_px={fixed}', flush=True)


if __name__ == '__main__':
    main()
