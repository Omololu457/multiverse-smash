#!/usr/bin/env python3
"""Derive Sakura's 3 alternate palettes (the sheet's own "Color Paletes" row: Blue / Dark / Orange)
by HSV-recoloring ONLY her maroon VEST garment. Skin (tan), hair (pink), pants (grey/white) and the
dark outline are classified out and left byte-identical — so alpha is never touched (clean keying
preserved, no re-key box). Mirrors tools/gen_omololu_recolor.py discipline.

USAGE:  python3 tools/gen_sakura_recolor.py            # write all 3 palettes for every sakura_*.png
        python3 tools/gen_sakura_recolor.py --verify   # report changed-pixel / alpha-identical checks
"""
import numpy as np, glob, sys, os
from PIL import Image

# VEST = red-hued, saturated, mid/low value (maroon #b83050 range). Hair (light pink, low sat) and
# skin (tan, hue≈0.08) fall outside this mask, so they stay untouched.
def rgb_to_hsv(arr):
    r, g, b = arr[..., 0] / 255., arr[..., 1] / 255., arr[..., 2] / 255.
    mx = np.max(arr[..., :3], axis=-1) / 255.; mn = np.min(arr[..., :3], axis=-1) / 255.
    df = mx - mn + 1e-9
    h = np.zeros_like(mx)
    mask = mx == r; h[mask] = (60 * ((g - b) / df) % 360)[mask]
    mask = mx == g; h[mask] = (60 * ((b - r) / df) + 120)[mask]
    mask = mx == b; h[mask] = (60 * ((r - g) / df) + 240)[mask]
    s = np.where(mx == 0, 0, df / (mx + 1e-9)); v = mx
    return h / 360., s, v

def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6).astype(int); f = h * 6 - i
    p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    i = i % 6
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)

def vest_mask(h, s, v, a):
    red = (h < 0.045) | (h > 0.92)
    return red & (s >= 0.45) & (v <= 0.82) & (a > 0)

# target hue (for blue/orange) preserving each pixel's own value (shading); 'gray' = desaturated dark.
PALETTES = {"blue": ("hue", 0.60), "dark": ("gray", 0.0), "orange": ("hue", 0.075)}

def recolor(arr, mode, param):
    out = arr.copy()
    h, s, v = rgb_to_hsv(arr); a = arr[..., 3]
    m = vest_mask(h, s, v, a)
    if mode == "hue":
        nh = np.full_like(h, param)
        rgb = hsv_to_rgb(nh, np.clip(s, 0, 1), v)
    else:  # gray/dark — crush saturation, keep shading
        g = (v * 0.80)[..., None]; rgb = np.concatenate([g, g, g], -1)
    out[..., :3] = np.where(m[..., None], (rgb * 255).astype(np.uint8), arr[..., :3])
    return out, int(m.sum())

SHEETS = sorted(glob.glob("sakura_*_uniform.png")) + ["sakura_portrait.png", "sakura_katsuyu.png"]

def main():
    verify = "--verify" in sys.argv
    tot = {}
    for f in SHEETS:
        base = np.array(Image.open(f).convert("RGBA"))
        for tag, (mode, param) in PALETTES.items():
            out, n = recolor(base, mode, param)
            outf = f.replace(".png", f"__{tag}.png")
            if verify:
                # alpha must be byte-identical (no re-key); only vest pixels differ
                asame = np.array_equal(base[..., 3], out[..., 3])
                diff = (base[..., :3] != out[..., :3]).any(-1).sum()
                tot.setdefault(tag, [0, 0]); tot[tag][0] += n
                if not asame: print(f"  !! {outf}: ALPHA CHANGED")
                if diff != n: print(f"  !! {outf}: changed {diff} != vest {n}")
            else:
                Image.fromarray(out, "RGBA").save(outf)
        if not verify: print(f"  recolored {f} -> __blue/__dark/__orange")
    if verify:
        for tag, (n, _) in tot.items(): print(f"  {tag}: {n} vest px recolored across {len(SHEETS)} sheets, alpha identical")

if __name__ == "__main__":
    main()
