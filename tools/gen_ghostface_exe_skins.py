#!/usr/bin/env python3
"""
gen_ghostface_exe_skins.py — recolor ghostface_exe's uniform sheets into 4 killer-identity skins
(Stu / Roman / Mrs. Loomis / Amber), "the person behind the mask". Billy = the base art (no recolor).

Approach: an HSV colorize pass over every non-transparent pixel — set HUE to the skin's target, boost
SATURATION, and LIFT the value on the near-black robe so the colour actually reads (a black robe has no
hue to shift, so we lift it). Outputs <stem>__<tag>.png ALONGSIDE the originals — NEVER overwrites, and
matches skins.recolorSkinAnim's expected retag (sheet.png -> sheet__tag.png). Additive-only.

USAGE: python3 tools/gen_ghostface_exe_skins.py
"""
import os, glob, colorsys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# tag -> (hue 0-1, min_saturation, value_gain, value_lift, hex-for-report)
SKINS = {
    "stu":     (135/360.0, 0.55, 1.15, 0.16, "#3fae5a"),  # Stu Macher   — sickly GREEN (unhinged accomplice)
    "roman":   (262/360.0, 0.55, 1.10, 0.18, "#7b4fd0"),  # Roman Bridger— theatrical deep PURPLE (film-mastermind)
    "loomis":  (356/360.0, 0.60, 1.10, 0.16, "#c0392b"),  # Mrs. Loomis  — vengeful CRIMSON (maternal rage / blood)
    "amber":   (330/360.0, 0.62, 1.18, 0.14, "#e84a9c"),  # Amber Freeman— modern HOT PINK/magenta (gen-Z killer)
}

SHEETS = sorted(glob.glob(os.path.join(ROOT, "ghostface_exe_*_uniform.png")))
SHEETS = [s for s in SHEETS if "__" not in os.path.basename(s)]   # never re-recolor an already-tagged file

def colorize(img, hue, min_sat, vgain, vlift):
    img = img.convert("RGBA")
    px = img.load()
    W, H = img.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, _, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
            s2 = max(min_sat, 0.0)
            v2 = min(1.0, v*vgain + vlift)
            nr, ng, nb = colorsys.hsv_to_rgb(hue, s2, v2)
            px[x, y] = (int(nr*255), int(ng*255), int(nb*255), a)
    return img

made = 0
for tag, (hue, msat, vgain, vlift, _hex) in SKINS.items():
    for src in SHEETS:
        stem = src[:-4]  # strip .png
        out = f"{stem}__{tag}.png"
        if os.path.exists(out):
            continue
        colorize(Image.open(src), hue, msat, vgain, vlift).save(out)
        made += 1
print(f"created {made} recolored sheets across {len(SKINS)} skins x {len(SHEETS)} base sheets")
for tag,(_,_,_,_,hx) in SKINS.items(): print(f"  {tag:8s} {hx}")
