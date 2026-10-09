"""naruto_seventh BASE-only palette recolors (Phase 4, ITEM 1).

The H sheet's "Color Paletes" row (y205-292) carries 6 pre-recolored stance swatches — the SAME pose in 6
color schemes. We POSITION-MATCH swatch 0 (default orange) against swatches 1-5 to extract the artist's own
EXACT per-palette colour map (LUT), then apply each LUT to the BASE orange-body sheets only (NOT the KCM-golden
/ Four-Tails-red / Rikudou-black-gold mode sheets — those keep their canonical colours). Exact, deterministic,
no guesswork. Output: naruto_seventh_<sheet>__<tag>.png  (+ recoloured portrait).

Run:  cd naruto_seventh_work && python ../tools/gen_naruto_seventh_recolor.py
Needs: naruto_seventh_work/H_keyed.png + the base naruto_seventh_*_uniform.png in the repo root.
"""
import os, sys
import numpy as np
from PIL import Image
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../naruto_seventh_work")
import key_tool as k

WORK = os.path.dirname(os.path.abspath(__file__)) + "/../naruto_seventh_work"
ROOT = os.path.dirname(os.path.abspath(__file__)) + "/.."

# 5 recolor palettes (swatch index 1..5 → tag). swatch 0 is the DEFAULT (no recolor).
TAGS = {1: "green", 2: "blue", 3: "red", 4: "shadow", 5: "silver"}

# BASE orange-body sheets (the sheet FILES referenced by base actions in characters.js). NOT mode sheets.
BASE_SHEETS = [
    "idle", "run", "dash", "jump", "guard", "hurt", "getup", "light", "heavy", "up", "air", "aircombo",
    "intro", "win", "rasengan", "rasengan_air", "rsk", "rsk_air", "doton", "throw", "throw_air",
    "charge", "strong_fwd", "strong_down", "kuchiyose",
]

def build_luts():
    keyed = k.load(os.path.join(WORK, "H_keyed.png"))
    spans = [(11,42),(50,81),(89,120),(128,159),(167,198),(206,237)]
    y0, y1 = 222, 290
    sw = [keyed[y0:y1, a:b, :] for a, b in spans]
    base = sw[0]; m0 = base[..., 3] > 8
    luts = {}
    for n, tag in TAGS.items():
        groups = {}
        src = base[..., :3][m0]; dst = sw[n][..., :3][m0]
        for c0, cn in zip(map(tuple, src), map(tuple, dst)):
            if c0 != cn:
                groups.setdefault(c0, []).append(cn)
        luts[tag] = {c0: Counter(cns).most_common(1)[0][0] for c0, cns in groups.items()}
    return luts

def apply_lut(img, lut):
    out = img.copy()
    rgb = out[..., :3]; a = out[..., 3]
    for c0, cn in lut.items():
        mask = (rgb[..., 0] == c0[0]) & (rgb[..., 1] == c0[1]) & (rgb[..., 2] == c0[2]) & (a > 8)
        out[mask, 0] = cn[0]; out[mask, 1] = cn[1]; out[mask, 2] = cn[2]
    return out

def main():
    luts = build_luts()
    print("LUTs:", {t: len(l) for t, l in luts.items()})
    files = [f"naruto_seventh_{s}_uniform.png" for s in BASE_SHEETS] + ["naruto_seventh_portrait.png"]
    made = 0
    for fn in files:
        p = os.path.join(ROOT, fn)
        if not os.path.exists(p):
            print("  MISSING (skip):", fn); continue
        img = k.load(p)
        for tag, lut in luts.items():
            out = apply_lut(img, lut)
            op = os.path.join(ROOT, fn.replace(".png", f"__{tag}.png"))
            Image.fromarray(out).save(op)
            made += 1
    print(f"generated {made} recolored sheets for {len(luts)} palettes")

if __name__ == "__main__":
    main()
