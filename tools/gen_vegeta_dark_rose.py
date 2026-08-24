#!/usr/bin/env python3
# Generate DARK VEGETA — SUPER SAIYAN ROSE recolor sheets (palette-swap, prototype scope).
# Creative addition (Rose is Goku Black's canon transform, NOT Vegeta's — original choice, flagged).
# Matches the color quality of this project's Goku Black SSJ Rose: MAGENTA/PINK hair + pink aura, sampled
# from goku_black_ssj_rose_*.png (hair #e6147f/#e450ff, aura #ba2bff). Costume/skin/white stay untouched
# (like Goku Black's Rose keeps his black gi).
#
# HAIR vs black COSTUME both contain near-black #070000, so they can't be split by colour — only by
# LOCATION. Per frame: find the SKIN (face) cluster, define a head band around it, and recolor the DARK
# (hair) pixels in that band → a magenta ramp (near-black roots → deep magenta, lighter strands → bright
# pink). Skin + white (gloves) + red accents are left alone. The aura sheet ALSO gets its purple rim → pink.
import numpy as np
from PIL import Image
from scipy import ndimage
import os

# Rose SALMON-ROSE ramp — matched to Goku Black's Rose IDLE hair (sampled: #ab5957 shadow / #ca807e mid /
# #edaba9 light / #fed3d3 highlight, mean ~[215,145,143]). SOFT/desaturated, NOT neon magenta. Roots->tips
# by original luminance, floored so near-black hair still lands in the rose band (consistent across frames).
DARK   = np.array([168, 88, 84])    # #a85854  (dark rose shadow — lifted so roots aren't muddy)
BRIGHT = np.array([243, 179, 174])  # #f3b3ae  (warm salmon highlight, matched to GB #edaba9/#fed3d3)
AURA_DARK   = np.array([200, 60, 140])   # rose-pink aura shadow
AURA_BRIGHT = np.array([255, 190, 228])  # light pink aura highlight

def recolor_frame(f):
    """f = HxWx4 uint8 array of ONE frame. Returns recolored copy."""
    out = f.copy()
    a = f[:, :, 3]
    op = a > 32
    if op.sum() < 20:
        return out
    r, g, b = f[:, :, 0].astype(int), f[:, :, 1].astype(int), f[:, :, 2].astype(int)
    lum = 0.3*r + 0.59*g + 0.11*b
    # skin (peach face) — the anchor for the head band. Slightly loose so shadowed skin is still caught.
    skin = op & (r > 130) & (g > 75) & (b > 60) & (r > b + 10) & (r >= g - 20) & (lum > 55)
    ys_all, xs_all = np.where(op)
    if skin.sum() >= 4:
        sy, sx = np.where(skin)
        sy0, sy1 = sy.min(), sy.max()
        sh = max(6, sy1 - sy0)
        band_top = sy0 - int(sh * 1.2)          # hair rises above the face
        band_bot = sy0 + int(sh * 0.30)         # STOP at the upper face — avoid cheek/jaw (face-bleed fix)
    else:
        # no face found (back-turned / FX frame) → fall back to top 30% of content
        y0, y1 = ys_all.min(), ys_all.max()
        band_top = y0; band_bot = y0 + int((y1 - y0) * 0.30)
    rows = np.arange(f.shape[0])[:, None]
    band = op & (rows >= band_top) & (rows <= band_bot)
    # exclude skin AND a 1px halo around it (the dark face-outline pixels next to skin — bleed fix)
    skin_halo = ndimage.binary_dilation(skin, iterations=1)
    # HAIR = dark pixels in the head band, excluding skin(+halo) + white + red accents
    white = (r > 185) & (g > 185) & (b > 185)
    red   = (r > 110) & (r > g + 55) & (r > b + 55)
    hair = band & (lum < 125) & (~skin_halo) & (~white) & (~red)
    # narrower, floored ramp → consistent salmon-rose across frames (near-black roots don't go muddy)
    t = np.clip(lum / 88.0, 0.36, 1.0)[..., None]   # higher floor → brighter, closer to GB's bright salmon
    ramp = (DARK * (1 - t) + BRIGHT * t).astype(np.uint8)
    out[hair] = np.concatenate([ramp[hair], a[hair, None]], axis=1)
    return out

def recolor_aura_extra(out, f):
    """Aura sheet: additionally push the PURPLE aura rim → pink/magenta (whole power-up reads Rose)."""
    a = f[:, :, 3]; op = a > 32
    r, g, b = f[:, :, 0].astype(int), f[:, :, 1].astype(int), f[:, :, 2].astype(int)
    lum = 0.3*r + 0.59*g + 0.11*b
    # purple-ish = blue-leaning with some red, not the costume greys
    purple = op & (b > 70) & (b > g + 25) & (r > g) & (lum > 25)
    t = np.clip(lum / 160.0, 0, 1)[..., None]
    ramp = (AURA_DARK * (1 - t) + AURA_BRIGHT * t).astype(np.uint8)
    out[purple] = np.concatenate([ramp[purple], a[purple, None]], axis=1)
    return out

# action -> (source sheet, n frames, is_aura)
SHEETS = {
    "idle": ("vegeta_dark_idle_uniform.png", 4, False),
    "idlecross": ("vegeta_dark_idlecross_uniform.png", 4, False),
    "dive": ("vegeta_dark_dive_uniform.png", 4, False),
    "hurt": ("vegeta_dark_hurt_uniform.png", 3, False),
    "knockdown": ("vegeta_dark_knockdown_uniform.png", 8, False),
    "getup": ("vegeta_dark_getup_uniform.png", 6, False),
    "light": ("vegeta_dark_light_uniform.png", 3, False),
    "heavy": ("vegeta_dark_heavy_uniform.png", 3, False),
    "up": ("vegeta_dark_up_uniform.png", 3, False),
    "air": ("vegeta_dark_air_uniform.png", 2, False),
    "crouchlight": ("vegeta_dark_crouchlight_uniform.png", 1, False),
    "rush1": ("vegeta_dark_rush1_uniform.png", 3, False),
    "rush2": ("vegeta_dark_rush2_uniform.png", 3, False),
    "kicast": ("vegeta_dark_kicast_uniform.png", 2, False),
    "knife": ("vegeta_dark_knife_uniform.png", 1, False),
    "sickle": ("vegeta_dark_sickle_uniform.png", 1, False),
    "aura": ("vegeta_dark_aura_uniform.png", 4, True),
    "win": ("vegeta_dark_win_uniform.png", 5, False),
}

if __name__ == "__main__":
    for act, (src, nf, is_aura) in SHEETS.items():
        if not os.path.exists(src):
            print("MISS", src); continue
        im = Image.open(src).convert("RGBA")
        a = np.asarray(im).copy()
        W = a.shape[1] // nf
        for i in range(nf):
            cell = a[:, i*W:(i+1)*W]
            rc = recolor_frame(cell)
            if is_aura:
                rc = recolor_aura_extra(rc, cell)
            a[:, i*W:(i+1)*W] = rc
        out = src.replace("vegeta_dark_", "vegeta_dark_rose_")
        Image.fromarray(a, "RGBA").save(out)
        print("OK", out, f"({nf}f)")
