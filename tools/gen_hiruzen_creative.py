#!/usr/bin/env python3
# HIRUZEN SARUTOBI — creative skin batch (13 skins). Same discipline as the other gen_<char>_creative.py
# tools: a VALUE-PRESERVING recolor of his base sheets (near-black/grey combat garb + hood + hair), keeping
# his warm-orange SKIN (face + sandals) natural. Because his body is essentially monochrome-dark, the recolor
# maps each non-skin pixel's LUMINANCE onto a per-skin colour ramp (shadow→mid→highlight) — this reproduces
# the color_palletts.png reference swatches (skins 1-4 are reverse-engineered from those exact garb colours,
# applied project-wide since the swatches are single-pose) and extends to 9 new palettes. Writes
# hiruzen_<sheet>__<tag>.png for every animationData sheet + the portrait. Cosmetic only.
from PIL import Image
import numpy as np

SHEETS = [
    "hiruzen_idle_uniform.png", "hiruzen_run_uniform.png", "hiruzen_dash_uniform.png",
    "hiruzen_jump_uniform.png", "hiruzen_back_jump_uniform.png", "hiruzen_block_uniform.png",
    "hiruzen_hit_uniform.png", "hiruzen_intro_uniform.png", "hiruzen_introrobe_uniform.png",
    "hiruzen_punches_uniform.png", "hiruzen_spin_uniform.png", "hiruzen_portrait.png",
]

# Each skin: a 3-stop garb ramp (shadow, mid, highlight) mapped onto luminance. `trim` (optional) overrides
# the shadow band with a distinct hue for a two-tone base+trim look. `skin`: how to treat the warm face/
# sandals — "keep" (natural), "grey" (desaturate), "dark" (near-black, for the Void silhouette).
def R(*hexes): return [tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) for h in hexes]

SKINS = {
    # ── 1-4: reverse-engineered from color_palletts.png (single-pose swatches → applied to every sheet) ──
    "shadow_operative": {"ramp": R("14161e", "34343e", "5a5a68"), "skin": "keep"},   # cool pure-black (distinct from default's warm-black)
    "earthen_sage":     {"ramp": R("2e1c10", "6e4224", "b07a44"), "skin": "keep"},   # brown-orange garb
    "silver_veteran":   {"ramp": R("45454c", "8a8a92", "cacad2"), "skin": "keep"},   # grey/silver garb
    "crimson_will":     {"ramp": R("340808", "8a1818", "cc3636"), "skin": "keep"},   # red garb
    # ── 5-13: new recolors ──
    # formal Hokage robe: his combat garb is near-BLACK, so a white/cream robe needs the value LIFTED
    # (compress the dark body up into the cream range); red only in the deepest shadow lines (trim).
    "third_hokage":     {"ramp": R("bcb28e", "ddd3b6", "f2ead4"), "trim": (0x86, 0x1a, 0x1a), "trimT": 0.085, "lift": (0.46, 0.54), "skin": "keep"},  # cream robe, red only in the deepest trim lines
    "will_of_fire":     {"ramp": R("5a1206", "c8481a", "ff8a34"), "skin": "keep"},   # warm saturated orange-red, flame trim
    "the_professor":    {"ramp": R("0d1430", "1f3060", "48597f"), "trim": (0x3a, 0x3e, 0x46), "trimT": 0.30, "skin": "keep"},  # deep navy, muted grey trim
    "youthful_war":     {"ramp": R("121212", "3a3a3a", "9e9e9e"), "skin": "keep", "gamma": 0.78},  # brighter/higher-contrast NEUTRAL version of his base tones (intensity boost, no hue change)
    "enmas_bond":       {"ramp": R("463010", "9a6e28", "dcac4c"), "skin": "keep"},   # golden-brown, warm fur-adjacent
    "ashes_konoha":     {"ramp": R("3a3a3a", "8c8c8c", "dcdcdc"), "skin": "grey"},   # fully desaturated grey-white
    "leafs_guardian":   {"ramp": R("0e2410", "1e4c26", "3c8046"), "skin": "keep"},   # deep forest green
    "sarutobi_elder":   {"ramp": R("1e0e30", "40205c", "6e3c96"), "skin": "keep"},   # deep purple-violet
    "eternal_void":     {"ramp": R("040406", "0e0e14", "1c1c24"), "skin": "dark"},   # black silhouette (amber aura = game.js overlay)
}

# warm SKIN mask (face + sandals): clearly orange/warm and reasonably bright
def skin_mask(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > 95) & (r > g + 18) & (g > b + 6)

def lerp(c0, c1, t):
    return tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))

def ramp_color(ramp, L):  # L in 0..1 → shadow/mid/highlight
    if L < 0.5: return lerp(ramp[0], ramp[1], L / 0.5)
    return lerp(ramp[1], ramp[2], (L - 0.5) / 0.5)

def recolor(src, cfg):
    im = np.array(Image.open(src).convert("RGBA")).astype(float)
    rgb, a = im[:, :, :3], im[:, :, 3]
    op = a > 8
    lum = (0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]) / 255.0
    lum_raw = lum.copy()   # ORIGINAL luminance (for trim thresholding — the deepest real shadows)
    if "gamma" in cfg: lum = np.power(np.clip(lum, 0, 1), cfg["gamma"])
    if "lift" in cfg: lo, span = cfg["lift"]; lum = lo + np.clip(lum, 0, 1) * span   # raise dark garb into a light range (cream robe)
    sk = skin_mask(rgb) & op
    out = im.copy()
    ramp, trim, trimT = cfg["ramp"], cfg.get("trim"), cfg.get("trimT", 0.0)
    ys, xs = np.where(op & ~sk)
    for y, x in zip(ys, xs):
        L = float(lum[y, x])
        if trim is not None and float(lum_raw[y, x]) < trimT:   # trim = the deepest ORIGINAL shadow lines
            base = trim
        else:
            base = ramp_color(ramp, L)
        if "sat" in cfg:  # push chroma away from the ramp midpoint for a punchier read
            m = sum(base) / 3
            base = tuple(int(max(0, min(255, m + (base[i] - m) * cfg["sat"]))) for i in range(3))
        out[y, x, 0], out[y, x, 1], out[y, x, 2] = base
    # SKIN treatment
    if cfg["skin"] == "grey":
        g = (0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2])
        for i in range(3): out[:, :, i] = np.where(sk, np.clip(g * 1.05, 0, 255), out[:, :, i])
    elif cfg["skin"] == "dark":
        for i in range(3): out[:, :, i] = np.where(sk, rgb[:, :, i] * 0.16, out[:, :, i])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")

if __name__ == "__main__":
    import sys
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for tag, cfg in SKINS.items():
        if only and tag != only: continue
        for s in SHEETS:
            out = s.replace(".png", f"__{tag}.png")
            recolor(s, cfg).save(out)
        print(f"OK {tag}: {len(SHEETS)} sheets")
