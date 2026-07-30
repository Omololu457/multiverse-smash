#!/usr/bin/env python3
"""Zenitsu fiery-region recolor → per-colour alt skins, built on the PROVEN Lavender code path.

  python3 tools/gen_zenitsu_recolor.py <tag> [only_substr]     # one colour at a time

This is a DIRECT PARAMETERISATION of tools/gen_zenitsu_lavender.py — the skin that came out clean.
It reuses Lavender's exact selection (the 3 fiery BANDS) and its exact recolor (apply_recolor with
--to-tone + one shared pivot over the whole fiery region, so the orange→red gradient becomes a single
continuous light→dark ramp in the target hue: highlights stay proportionally lighter, shadows darker).

Two things the earlier "batch" version did that this one deliberately does NOT (they were the bug):
  1. It added a near-white-highlight capture step (near-white pixels adjacent to the hair). That grabbed
     eye/tooth/cheek highlights on the FACE → face/mask discolouration. Lavender never had this step, and
     its hair two-tone reads fine without it, so it is gone. The 3 bands (sat-gated) already exclude skin.
  2. It centred every colour on the target's RAW value. For extreme targets (near-#FF0000 red, saturated
     magenta, near-#000 black) that pushes the highlight/shadow spread into the 0/1 clamp → FLAT hair.
     Here each colour's target is a MID tone (see COLORS), so both highlights and shadows have room, and
     `spread`/`sat` fine-tune the preserved contrast (e.g. black uses a lighter-grey highlight, not flat).

Untouched everywhere: skin/face, black kimono, brown hakama, sword, whites/greys outside the fiery bands.
Cosmetic only.
"""
import sys, os, colorsys, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import apply_recolor, build_selection_mask, _NS
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Lavender's exact fiery selection (skin-excluding sat gates). Shared by every colour.
BANDS = [
    dict(from_hue="12-44", min_sat=0.68),
    dict(from_hue="44-64", min_sat=0.42),
    dict(from_hue="344-6", min_sat=0.60, min_val=0.26),
]

# Per-colour target. `target` is the MID/base tone the fiery region's mid maps onto; the ramp spreads
# highlights lighter / shadows darker around it. `sat` overrides target saturation (grays → ~0).
# `spread` scales the preserved highlight↔shadow contrast (<1 flattens, >1 punchier).
COLORS = {
    # near-black hair that still reads as hair: dark-grey mid, lighter-grey highlight (spread<1 so the
    # highlight is a visible grey, not pushed to white; shadows fall to near-black).
    "black":  dict(target="#242428", sat=0.05, spread=0.68),
    # crimson mid (NOT #FF0000): highlights → bright red, shadows → deep maroon. Keeps saturated punch.
    "red":    dict(target="#C81E28", sat=0.90, spread=1.0),
    # light grey mid so shadows stay a visible mid-grey (depth) while highlights go near-white.
    "white":  dict(target="#DCDCDC", sat=0.03, spread=1.0),
    # vibrant magenta-pink MID: highlights → light pink, shadows → deep magenta (was a flat single tone).
    "pink":   dict(target="#E24FA6", sat=0.72, spread=1.05),
    # cool blue mid: highlights → light blue, shadows → deep navy.
    "blue":   dict(target="#2E6FD8", sat=0.80, spread=1.0),
    # lavender parity (matches gen_zenitsu_lavender.py) in case it is ever regenerated from here.
    "lavender": dict(target="#C9A0D4", sat=None, spread=1.0),
}


def shared_pivot(img, target, sat):
    """Mean value over the union of the 3 band selections → one pivot for a continuous gradient
    (identical to gen_zenitsu_lavender.shared_pivot)."""
    px = img.tobytes(); W, H = img.size
    sv = 0.0; sn = 0
    seen = bytearray(W*H)
    for b in BANDS:
        mask = build_selection_mask(px, W, H, _NS(mode="region", to_tone=target, to_sat=sat, **b))
        for i in range(W*H):
            if mask[i] and not seen[i]:
                seen[i] = 1
                _, _, v = colorsys.rgb_to_hsv(px[i*4]/255, px[i*4+1]/255, px[i*4+2]/255)
                sv += v; sn += 1
    return (sv/sn) if sn else 0.5


def process(name, cfg):
    target, sat, spread = cfg["target"], cfg["sat"], cfg["spread"]
    img = Image.open(os.path.join(ROOT, name)).convert("RGBA")
    pivot = shared_pivot(img, target, sat)
    total = 0
    for b in BANDS:
        img, c = apply_recolor(img, _NS(mode="region", to_tone=target, to_sat=sat,
                                        tone_pivot=pivot, tone_spread=spread, **b))
        total += c
    return img, total, pivot


def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const zenitsu"); rest = src[i+13:]
    j = i+13 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    return sorted(set(re.findall(r'sheet:\s*"\./(zenitsu_[^"]+)"', src[i:j])))


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COLORS:
        print(f"usage: gen_zenitsu_recolor.py <{'|'.join(COLORS)}> [only_substr]"); sys.exit(1)
    tag = sys.argv[1]
    only = sys.argv[2] if len(sys.argv) > 2 else None
    cfg = COLORS[tag]
    tot = 0
    for name in wired_sheets() + ["zenitsu_portrait.png"]:
        if only and only not in name: continue
        if not os.path.exists(os.path.join(ROOT, name)):
            print(f"  SKIP {name}"); continue
        img, c, pv = process(name, cfg); tot += c
        img.save(os.path.join(ROOT, f"{name[:-4]}__{tag}.png"))
        print(f"  {c:6d}px  pivot={pv:.2f}  {name}")
    print(f"DONE {tag} -> {cfg['target']} spread={cfg['spread']} sat={cfg['sat']}  {tot}px")


if __name__ == "__main__":
    main()
