#!/usr/bin/env python3
"""tools/edoskin/gen_portraits.py — MSV1-EDO select-screen portraits: <portrait>__edo.png (skins.js recolorPortrait naming).
Portraits are separate, larger art with their own palettes, so they get the same LOOK per pixel (no per-frame landmarks):
exposed skin (blood builder's skin mask) → the four-step ash ramp by brightness quartile of that portrait's skin; linework
(luminance < 40) untouched; everything else → the documented clothes transform (gen.clothes). Alpha byte-identical.
  python3 tools/edoskin/gen_portraits.py [--only k1,k2]
"""
import argparse, json, os, re, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'tools', 'bloodmap'))
import gen, build as BM

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only'); A = ap.parse_args()
    global OV; OV = json.load(open(os.path.join(HERE, 'overrides.json'))) if os.path.exists(os.path.join(HERE, 'overrides.json')) else {}
    elig = json.load(open(os.path.join(HERE, 'eligibility.json'))); por = json.load(open(os.path.join(HERE, 'portraits.json')))
    keys = [k for k, c in elig['classes'].items() if c in ('HUMAN', 'MASKED') and k not in elig.get('exclude', {})]
    if A.only: keys = [k for k in keys if k in A.only.split(',')]
    for k in sorted(keys):
        src = por.get(k)
        if not src or not os.path.exists(os.path.join(ROOT, src)): print('no portrait', k); continue
        im = np.asarray(Image.open(os.path.join(ROOT, src)).convert('RGBA')).copy()
        a = im[..., 3] > 0
        L = 0.299 * im[..., 0] + 0.587 * im[..., 1] + 0.114 * im[..., 2]
        sk = BM.skin_mask(im) & a & (L >= gen.OUTLINE_L) if elig['classes'][k] == 'HUMAN' else np.zeros_like(a)
        # HAIR guard (portraits have no face box): blond / golden / orange hair sits at a higher hue than skin
        rgbf = im[..., :3].astype(np.float32) / 255; mx, mn = rgbf.max(-1), rgbf.min(-1); dl = np.maximum(mx - mn, 1e-6)
        hue = np.where(mx == rgbf[..., 0], ((rgbf[..., 1] - rgbf[..., 2]) / dl) % 6, np.where(mx == rgbf[..., 1], (rgbf[..., 2] - rgbf[..., 0]) / dl + 2, (rgbf[..., 0] - rgbf[..., 1]) / dl + 4)) * 60
        sk &= ~((hue > 32) & ((mx - mn) / np.maximum(mx, 1e-6) > 0.35))
        ov = OV.get(k, {})
        if ov.get('addSkin'):                       # hand-listed skin colours (e.g. green skin): portrait pixels near any of them are skin
            ref = np.array([[int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)] for c in ov['addSkin']], np.float32)
            dist = np.min(np.linalg.norm(im[..., None, :3].astype(np.float32) - ref[None, None], axis=-1), axis=-1)
            sk = sk | (a & (dist < 40) & (L >= gen.OUTLINE_L))
        out = im.copy()
        # clothes: vectorised over unique colours
        rest = a & ~sk & (L >= gen.OUTLINE_L)
        pk = (im[..., 0].astype(np.int64) << 16) | (im[..., 1].astype(np.int64) << 8) | im[..., 2]
        u, inv = np.unique(pk[rest], return_inverse=True)
        lut = np.array([gen.clothes(((c >> 16) & 255, (c >> 8) & 255, c & 255)) for c in u], np.uint8).reshape(-1, 3)
        if len(u): out[rest, :3] = lut[inv.reshape(-1)]
        if sk.any():
            q = np.quantile(L[sk], [0.25, 0.5, 0.75])
            step = (L[sk] < q[2]).astype(int) + (L[sk] < q[1]) + (L[sk] < q[0])   # brightest quartile → highlight
            out[sk, :3] = np.array(gen.RAMP, np.uint8)[3 - (3 - step)]
        assert (out[..., 3] == im[..., 3]).all()
        dst = re.sub(r'\.(png|jpe?g)$', '__edo.png', src, flags=re.I)
        Image.fromarray(out, 'RGBA').save(os.path.join(ROOT, dst), optimize=True)
    print('portraits', len(keys))

if __name__ == '__main__':
    main()
