#!/usr/bin/env python3
# Build gon_portrait.png (arm-raised mugshot) + gon_cutins.png (manga chant panels)
# from the AmandioHype sheet, with a DIRECT green-key (kills enclosed green patches
# the border flood-fill couldn't reach). Outfit is white / hair black / skin tan /
# gem blue — no green on Gon, so direct keying is safe.
import numpy as np
from PIL import Image

SRC = "gon_freecss_sprites_jus_white_outfit__by_amandiohype_dcbpr6f.png"
im = Image.open(SRC).convert("RGBA")
arr = np.array(im)
rgb = arr[:, :, :3].astype(np.int16)
GREEN = np.array([0, 128, 0])
dist = np.abs(rgb - GREEN).sum(axis=2)
mask = dist <= 100                           # direct green key (incl. enclosed)
out = arr.copy()
out[mask, 3] = 0
keyed = Image.fromarray(out, "RGBA")

# Portrait: arm-raised illustration (tight to the figure)
mug = keyed.crop((24, 32, 220, 306))
bb = mug.getbbox()
if bb: mug = mug.crop(bb)
mug.save("./gon_portrait.png")
print("gon_portrait.png", mug.size)

# Cut-in panel strip (7 manga screencaps) — kept whole for Phase 2 chant pops.
pan = keyed.crop((316, 28, 655, 218))
pan.save("./gon_cutins.png")
print("gon_cutins.png", pan.size)

# proofs
for n, img in (("portrait", mug), ("cutins", pan)):
    bg = Image.new("RGBA", img.size, (255, 0, 255, 255)); bg.alpha_composite(img)
    bg.convert("RGB").resize((img.width*2, img.height*2)).save(f"gon_work/zz_{n}.png")
