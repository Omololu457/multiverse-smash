#!/usr/bin/env python3
"""Generate goku portraits (base + per form) = a head bust from the standing frame,
teal-keyed, 4x nearest-neighbour. Feeds character.portrait + the Phase-5 mugshot swap."""
from PIL import Image
import numpy as np
SHEETS = {"": "assets/source/goku_original.png", "ssj": "assets/goku_forms/goku_ssj.png",
          "ssj2": "assets/goku_forms/goku_ssj2.png", "ssj3": "assets/goku_forms/goku_ssj3.png",
          "god": "assets/goku_forms/goku_god.png", "blue": "assets/goku_forms/goku_blue.png",
          "ui": "assets/goku_forms/goku_ui.png"}
BOX = (1099, 211, 1151, 260)   # head + shoulders in the standing donor frame
def key_teal(im):
    a = np.array(im.convert("RGBA")); rgb = a[:, :, :3].astype(int)
    a[(np.abs(rgb - [0, 128, 128]).sum(2) <= 30), 3] = 0
    return Image.fromarray(a, "RGBA")
for form, path in SHEETS.items():
    im = key_teal(Image.open(path).convert("RGBA").crop(BOX))
    im = im.resize((im.width * 4, im.height * 4), Image.NEAREST)
    im.save("goku_portrait.png" if form == "" else f"goku_{form}_portrait.png")
print("wrote portraits")
