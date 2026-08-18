#!/usr/bin/env python3
# OROCHIMARU — creative skin batch (13 skins, BASE FORM ONLY). Same discipline as gen_hiruzen_creative.py:
# a VALUE-PRESERVING recolor of his base sheets. Three regions, classified from the real pixels
# (p1_stance sample): ROBE = the grey/navy-tinted darks (the PRIMARY recolor target) → mapped by luminance
# onto a per-skin colour ramp; SKIN = pale beige-tan (protected, natural) EXCEPT the two tone-change skins
# (#2 pale_recluse, #8 white_snake_sage — whitened); HAIR = his iconic near-black (protected, kept black
# except the Void silhouette). Does NOT touch the 3 alternate FORMS (their own confirmed palettes).
# Writes orochimaru_<sheet>__<tag>.png for every animationData sheet + the portrait. Cosmetic only.
from PIL import Image
import numpy as np, sys

SHEETS = [
    "orochimaru_idle_uniform.png", "orochimaru_run_uniform.png", "orochimaru_jump_uniform.png",
    "orochimaru_guard_uniform.png", "orochimaru_guardair_uniform.png", "orochimaru_hurt_uniform.png",
    "orochimaru_hurt_special_uniform.png", "orochimaru_hurt_heavy1_uniform.png", "orochimaru_hurt_heavy2_uniform.png",
    "orochimaru_knockdown_uniform.png", "orochimaru_knockdown_against_uniform.png",
    "orochimaru_intro1_uniform.png", "orochimaru_intro2_uniform.png", "orochimaru_intro3_uniform.png",
    "orochimaru_light_uniform.png", "orochimaru_heavy_uniform.png", "orochimaru_up_uniform.png",
    "orochimaru_air_uniform.png", "orochimaru_downair_uniform.png", "orochimaru_airstrong_uniform.png",
    "orochimaru_fwdstrong_uniform.png", "orochimaru_throw_uniform.png",
    "orochimaru_chain2_uniform.png", "orochimaru_chain3_uniform.png",
    "orochimaru_snakespit_uniform.png", "orochimaru_swordlunge_uniform.png", "orochimaru_swordthrow_uniform.png",
    "orochimaru_tailsweep_uniform.png", "orochimaru_slam_uniform.png", "orochimaru_snakelunge_uniform.png",
    "orochimaru_snakebarrage_uniform.png", "orochimaru_coil_uniform.png",
    "orochimaru_shed_uniform.png", "orochimaru_ult_cast_uniform.png",
    "orochimaru_portrait.png",
]

def R(*hexes): return [tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) for h in hexes]

# ramp = 3-stop robe ramp (shadow→mid→highlight) mapped onto luminance. trim/trimT = a distinct hue in the
# deepest ORIGINAL shadow lines (two-tone). lift = compress dark robe UP into a light range (cream robes).
# skin = "keep"/"pale"/"dark". hair = "keep"/"dark".
SKINS = {
    "sound_serpent":     {"ramp": R("1a0e2c", "46247a", "8a5ec4"), "skin": "keep"},                                   # 1  Otogakure violet
    "pale_recluse":      {"ramp": R("9aa0a8", "ccd0d6", "f0f2f6"), "lift": (0.44, 0.56), "skin": "pale"},             # 2  sickly pale robe + WHITENED skin
    "crimson_sannin":    {"ramp": R("2c0a0a", "8a1818", "d03636"), "skin": "keep"},                                   # 3  blood red
    "venom":             {"ramp": R("0e2410", "2c6e22", "5eb03c"), "skin": "keep"},                                   # 4  toxic green
    "cursed_seal":       {"ramp": R("140a1e", "341a52", "6a34a0"), "trim": (0x06, 0x04, 0x0a), "trimT": 0.12, "skin": "keep"},  # 5  cursed violet, black flame trim
    "manda_scales":      {"ramp": R("241a2e", "5a4a6e", "9a86ae"), "skin": "keep"},                                   # 6  Manda scaled purple-grey
    "akatsuki_defector": {"ramp": R("0e0e14", "24242e", "45454f"), "trim": (0x8a, 0x18, 0x18), "trimT": 0.10, "skin": "keep"},  # 7  near-black + red-cloud trim
    "white_snake_sage":  {"ramp": R("c2c0ae", "e2e0d0", "f6f4ec"), "lift": (0.46, 0.54), "skin": "pale"},             # 8  true white-snake cream + WHITENED skin
    "edo_reanimation":   {"ramp": R("1a2630", "44586a", "86a2b6"), "skin": "keep"},                                   # 9  Edo Tensei cold steel-blue
    "amethyst_coil":     {"ramp": R("240a34", "5e1a8e", "a248d2"), "skin": "keep"},                                   # 10 royal amethyst
    "jade_serpent":      {"ramp": R("08281e", "1a5c46", "3ea07a"), "skin": "keep"},                                   # 11 jade / teal
    "forbidden_gold":    {"ramp": R("2a1e08", "6e5218", "c09a30"), "skin": "keep"},                                   # 12 dark ochre gold
    "umbral_serpent":    {"ramp": R("040406", "0e0e14", "1c1c24"), "skin": "dark", "hair": "dark"},                   # 13 VOID silhouette (aura = game.js overlay)
}

def lerp(c0, c1, t): return tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
def ramp_color(ramp, L):
    return lerp(ramp[0], ramp[1], L / 0.5) if L < 0.5 else lerp(ramp[1], ramp[2], (L - 0.5) / 0.5)

def masks(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    skin = (r > 132) & (g > 118) & (b < g - 12) & (r < g + 32)                              # pale beige-tan
    hair = (lum < 30) & (np.abs(r - g) < 16) & (np.abs(g - b) < 20) & (b <= r + 6)          # near-black NEUTRAL (navy darks excluded → robe)
    return skin, hair, lum

def recolor(src, cfg):
    im = np.array(Image.open(src).convert("RGBA")).astype(float)
    rgb, a = im[:, :, :3], im[:, :, 3]
    op = a > 8
    skin, hair, lum_raw = masks(rgb)
    skin &= op; hair &= op & ~skin
    lum = lum_raw / 255.0
    if "lift" in cfg: lo, span = cfg["lift"]; lum = lo + np.clip(lum, 0, 1) * span
    out = im.copy()
    ramp, trim, trimT = cfg["ramp"], cfg.get("trim"), cfg.get("trimT", 0.0)
    robe = op & ~skin & ~hair
    ys, xs = np.where(robe)
    for y, x in zip(ys, xs):
        if trim is not None and float(lum_raw[y, x]) / 255.0 < trimT:
            out[y, x, 0], out[y, x, 1], out[y, x, 2] = trim
        else:
            out[y, x, 0], out[y, x, 1], out[y, x, 2] = ramp_color(ramp, float(lum[y, x]))
    # SKIN treatment
    if cfg["skin"] == "pale":
        for i in range(3):
            white = np.clip(rgb[:, :, i] * 0.35 + 205, 0, 255)                              # lift beige → near-white, keep shading
            out[:, :, i] = np.where(skin, white, out[:, :, i])
    elif cfg["skin"] == "dark":
        for i in range(3): out[:, :, i] = np.where(skin, rgb[:, :, i] * 0.16, out[:, :, i])
    # HAIR treatment (default keep = leave original near-black)
    if cfg.get("hair") == "dark":
        for i in range(3): out[:, :, i] = np.where(hair, rgb[:, :, i] * 0.16, out[:, :, i])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")

if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for tag, cfg in SKINS.items():
        if only and tag != only: continue
        for s in SHEETS:
            recolor(s, cfg).save(s.replace(".png", f"__{tag}.png"))
        print(f"OK {tag}: {len(SHEETS)} sheets")
