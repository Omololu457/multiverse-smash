#!/usr/bin/env python3
"""Slice Susanoo ladder STAGE art (S1 hooded torso / S2 full body / S3 armored samurai) from keyed P
into uniform sheets for _skinAnim form swaps. Frames centered in a max-bbox cell (blades extend, so
cell is generous). Bottom-aligned so feet plant."""
import numpy as np
from PIL import Image
import sys; sys.path.insert(0,"madara_war_work")
from slice_p import crop_cell

K = np.asarray(Image.open("madara_war_work/P_keyed.png").convert("RGBA"))

def build(name, band, spans, anchor="bottom", pad=2):
    y0,y1 = band
    cells = [crop_cell(K,y0,y1,s,e,pad=pad) for s,e in spans]
    cells = [c for c in cells if c is not None]
    mw = max(c.width for c in cells); mh = max(c.height for c in cells)
    sheet = Image.new("RGBA",(mw*len(cells),mh),(0,0,0,0))
    for i,c in enumerate(cells):
        ox=i*mw+(mw-c.width)//2; oy=mh-c.height if anchor=="bottom" else (mh-c.height)//2
        sheet.alpha_composite(c,(ox,oy))
    sheet.save(name)
    mag=Image.new("RGBA",sheet.size,(255,0,255,255)); mag.alpha_composite(sheet)
    sc=max(1,1600//sheet.width); mag.resize((sheet.width*sc,mh*sc),Image.NEAREST).save("madara_war_work/_proof_"+name.replace(".png","")+".png")
    print(f"{name}: {len(cells)}f cell {mw}x{mh} sheet {sheet.size}")
    return mw,mh

# STAGE 1 — hooded torso blade combo (8f): 6 top + first 2 bottom (drop blade-tip slivers <40w)
s1_top=[(26,280),(376,585),(599,940),(983,1194),(1224,1510),(1521,1768)]
build("madara_susanoo_s1_uniform.png", (1883,2080), s1_top, anchor="bottom")

# STAGE 2 — full body (8f top). Drop the trailing sliver (1645,1692).
s2_top=[(12,192),(228,617),(632,752),(781,925),(974,1139),(1166,1296),(1322,1545)]
build("madara_susanoo_s2_uniform.png", (5700,5975), s2_top, anchor="bottom")

# STAGE 2 — the two "OR" endings (keep BOTH): default finisher (left) + alternative (right).
s2_or=[(22,236),(259,505),(1224,1768)]   # 2 default-ending frames + the alt (right block)
build("madara_susanoo_s2_finish_uniform.png", (5995,6250), s2_or, anchor="bottom")

# STAGE 3 — armored samurai (7f): detected 6 (one merged). Keep the 6 clean (drop <60w slivers).
s3=[(10,229),(248,658),(675,930),(1036,1193),(1237,1443),(1489,1803)]
build("madara_susanoo_s3_uniform.png", (6260,6610), s3, anchor="bottom")
