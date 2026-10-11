#!/usr/bin/env python3
# Recolor Sasuke's purple Susanoo ribcage → EMERALD (matching Shisui Fallen's Susanoo). Luminance ramp,
# alpha preserved. Output shisui_fallen_ribcage.png (distinct filename, additive).
import numpy as np
from PIL import Image
A = np.asarray(Image.open("sasuke_susano_ribcage.png").convert("RGBA")).astype(np.float32)
rgb, al = A[..., :3], A[..., 3]
lum = (0.299*rgb[...,0] + 0.587*rgb[...,1] + 0.114*rgb[...,2]) / 255.0
DARK = np.array([16, 104, 58], float); LITE = np.array([176, 255, 206], float)
t = np.clip((lum - 0.18) / 0.72, 0, 1)[..., None]
out = DARK[None,None,:]*(1-t) + LITE[None,None,:]*t
res = np.dstack([out.astype("uint8"), al.astype("uint8")])
Image.fromarray(res, "RGBA").save("shisui_fallen_ribcage.png")
print("OK shisui_fallen_ribcage.png", Image.open("shisui_fallen_ribcage.png").size)
