#!/usr/bin/env python3
"""Flash atlas skins — regenerate flash_atlas__<tag>.png + flash_portrait__<tag>.png from the base art.

Flash's animationData now points every action at ONE sheet (flash_atlas.png), so a skin only shows if its
flash_atlas__<tag>.png is a real recolour. The Black/Pink/Gold/Reverse/Godspeed atlases had been left as
byte-copies of the base atlas (so those skins rendered as plain red Flash). This rebuilds them with the region
recipes recorded in harness/alt_skin_manifest.mjs, and rebuilds Alien X in the S.P.D. Green "Alien X — Inspired"
style (charcoal suit with a faint green cast, white trim; the shared starfield overlay is drawn by game.js).

Regions (HSV, alpha > 0):  SUIT = red hue 345..15, sat >= .42, val >= .12   ·   BOLT = yellow hue 40..66, sat >= .42
Skin, eyes, white emblem disc, outline and the speed-line FX are never touched.  Deterministic, cosmetic only.
Usage: python3 tools/flash/build_atlas_skins.py [tag ...]
"""
import os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm = m & (mx == r); gm = m & (mx == g) & ~rm; bm = m & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    h = h * 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx

def hsv_to_rgb(h, s, v):
    h = (h % 360) / 60; i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - s * f); t = v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,))
    for k, (a, b, c) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        sel = i == k
        out[sel, 0] = a[sel]; out[sel, 1] = b[sel]; out[sel, 2] = c[sel]
    return out

def regions(arr):
    rgb = arr[..., :3] / 255.0; al = arr[..., 3] > 0
    h, s, v = rgb_to_hsv(rgb)
    suit = al & ((h >= 345) | (h <= 15)) & (s >= 0.42) & (v >= 0.12)
    bolt = al & (h >= 40) & (h <= 66) & (s >= 0.42)
    return rgb, h, s, v, suit, bolt

def paint(rgb, mask, h, s, v):
    rgb[mask] = hsv_to_rgb(h[mask], np.clip(s[mask], 0, 1), np.clip(v[mask], 0, 1))

def recolor(arr, tag):
    rgb, h, s, v, suit, bolt = regions(arr)
    out = rgb.copy()
    if tag == 'black':      # red suit → desaturated near-black (vg .6); yellow boots kept
        paint(out, suit, h, s * 0.08, v * 0.42)
    elif tag == 'pink':
        paint(out, suit, np.full_like(h, 330), np.full_like(s, 0.75) * np.minimum(1, s / 0.8), np.minimum(1, v * 1.08))
    elif tag == 'gold':
        paint(out, suit, np.full_like(h, 38), np.full_like(s, 0.88) * np.minimum(1, s / 0.8), v * 0.98)   # deep amber-gold (distinct from Reverse's lemon yellow)
    elif tag == 'reverse':  # red ↔ yellow swap, sat/val preserved
        paint(out, suit, np.full_like(h, 54), s, np.minimum(1, v * 1.1))
        paint(out, bolt, np.full_like(h, 0), s, v * 0.92)
    elif tag == 'godspeed': # near-white pale-blue suit, electric-blue bolts/boots
        paint(out, suit, np.full_like(h, 205), np.full_like(s, 0.16), np.minimum(1, v * 1.35 + 0.05))
        paint(out, bolt, np.full_like(h, 200), np.full_like(s, 0.48) + 0.4 * (s - 0.42), np.minimum(1, v * 1.12))
    elif tag == 'alienx':   # S.P.D. Green Alien X style: charcoal suit w/ faint green, white trim, green top highlight
        sv = v * 0.22 + 0.025
        hi = suit & (v > 0.86)                                   # brightest suit highlights keep a restrained green
        paint(out, suit & ~hi, np.full_like(h, 150), np.full_like(s, 0.10), sv)
        paint(out, hi, np.full_like(h, 140), np.full_like(s, 0.45), np.full_like(v, 0.46))
        paint(out, bolt, np.full_like(h, 150), np.full_like(s, 0.04), np.minimum(1, 0.62 + v * 0.36))
    else:
        raise SystemExit('unknown tag ' + tag)
    res = arr.copy()
    res[..., :3] = np.round(out * 255).clip(0, 255).astype(np.uint8)
    return res

TAGS = ['black', 'pink', 'gold', 'reverse', 'godspeed', 'alienx']

def main():
    tags = sys.argv[1:] or TAGS
    for base in ('flash_atlas', 'flash_portrait'):
        arr = np.array(Image.open(os.path.join(ROOT, base + '.png')).convert('RGBA'))
        for t in tags:
            Image.fromarray(recolor(arr, t)).save(os.path.join(ROOT, f'{base}__{t}.png'), optimize=True)
            print('wrote', f'{base}__{t}.png')

if __name__ == '__main__':
    main()
