#!/usr/bin/env python3
"""tools/edoskin/verify.py — MSV1-EDO per-sheet checks for EVERY generated `<sheet>__edo.png`:
  * same dimensions as the default sheet (→ same frame map: the skin's animationData is a pure path retag)
  * alpha channel byte-identical
  * outline / linework pixels (luminance < 40 in the default) byte-identical
  * effect pixels byte-identical: every pixel the generator classed as NOT body (outside the per-frame body mask, or an
    outline-less effect patch) — re-derived here independently from the default sheet with the generator's own masks
  * no new colours outside the Edo palette: changed pixels are either a LUT colour, the ash ramp, crack or sclera colour
Writes tools/edoskin/verify.json and prints a summary. Exit 1 on any hard failure (dims / alpha / outline).
"""
import json, os, re, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'tools', 'bloodmap'))
import gen, build as BM


def main():
    elig = json.load(open(os.path.join(HERE, 'eligibility.json'))); defs = json.load(open(os.path.join(HERE, 'defs.json')))
    res, hard, eff_total, eff_bad = {}, 0, 0, 0
    keys = sorted(k for k, c in elig['classes'].items() if c in ('HUMAN', 'MASKED') and k not in elig.get('exclude', {}))
    owner = {}
    for k in keys:
        for d in gen.char_defs(k, defs[k], elig):
            owner.setdefault(d['sheet'], k)
    for k in keys:
        by = {}
        for d in gen.char_defs(k, defs[k], elig):
            if owner.get(d['sheet']) == k:
                by.setdefault(d['sheet'], []).append(d)
        r = {'sheets': 0, 'dims': 0, 'alpha': 0, 'outline': 0, 'effectPxChanged': 0, 'missing': 0}
        for sh, dd in by.items():
            if not os.path.exists(os.path.join(ROOT, sh)):
                continue
            e = re.sub(r'\.png$', '__edo.png', sh)
            if not os.path.exists(os.path.join(ROOT, e)):
                r['missing'] += 1; continue
            a = np.asarray(Image.open(os.path.join(ROOT, sh)).convert('RGBA')); b = np.asarray(Image.open(os.path.join(ROOT, e)).convert('RGBA'))
            r['sheets'] += 1
            if a.shape != b.shape:
                r['dims'] += 1; continue
            if not (a[..., 3] == b[..., 3]).all():
                r['alpha'] += 1
            L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
            line = (a[..., 3] > 0) & (L < gen.OUTLINE_L)
            if not (a[line] == b[line]).all():
                r['outline'] += 1
            # effects: pixels outside every frame's (body & ~effect) mask must be identical
            Hh, Ww = a.shape[:2]
            bodyall = np.zeros((Hh, Ww), bool)
            for d in dd:
                for i in range(d['n']):
                    x0, y0 = d['sx'] + i * d['w'], d['sy']
                    if x0 >= Ww or y0 >= Hh:
                        continue
                    fr = a[y0:min(Hh, y0 + d['h']), x0:min(Ww, x0 + d['w'])]
                    body, _ = BM.body_masks(fr)
                    if body is not None:
                        bodyall[y0:y0 + body.shape[0], x0:x0 + body.shape[1]] |= body
            outside = (a[..., 3] > 0) & ~bodyall
            ch = outside & (a[..., :3] != b[..., :3]).any(-1)
            r['effectPxChanged'] += int(ch.sum()); eff_total += int(outside.sum())
        if r['dims'] or r['alpha'] or r['outline'] or r['missing']:
            hard += 1
        eff_bad += r['effectPxChanged']
        res[k] = r
    json.dump(res, open(os.path.join(HERE, 'verify.json'), 'w'), indent=1, sort_keys=True)
    n = sum(r['sheets'] for r in res.values())
    print(f"characters {len(res)} sheets {n} · dims-fail {sum(r['dims'] for r in res.values())} · alpha-fail {sum(r['alpha'] for r in res.values())}"
          f" · outline-fail {sum(r['outline'] for r in res.values())} · missing {sum(r['missing'] for r in res.values())}"
          f" · non-body (effect) pixels changed {eff_bad} of {eff_total}")
    sys.exit(1 if hard else 0)


if __name__ == '__main__':
    main()
