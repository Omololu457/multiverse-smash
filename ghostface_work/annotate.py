import numpy as np
from PIL import Image, ImageDraw
out = np.array(Image.open("ghostface_work/_keyed.png").convert("RGBA"))
H,W = out.shape[:2]
content = out[:,:,3] > 16
# put keyed over mid-grey so transparent reads clearly
bgc = np.zeros_like(out); bgc[:,:,:3]=60; bgc[:,:,3]=255
comp = Image.alpha_composite(Image.fromarray(bgc), Image.fromarray(out)).convert("RGB")
dr = ImageDraw.Draw(comp)
rowhas = content.any(axis=1)
bands=[]; s=None
for y in range(H):
    if rowhas[y] and s is None: s=y
    elif not rowhas[y] and s is not None: bands.append((s,y-1)); s=None
if s is not None: bands.append((s,H-1))
for i,(y0,y1) in enumerate(bands):
    sub = content[y0:y1+1,:]
    col = sub.sum(axis=0)  # occupancy per column
    colhas = col>0
    cols=[]; cs=None
    for x in range(W):
        if colhas[x] and cs is None: cs=x
        elif not colhas[x] and cs is not None: cols.append((cs,x-1)); cs=None
    if cs is not None: cols.append((cs,W-1))
    for (c0,c1) in cols:
        w=c1-c0+1
        color=(255,60,60) if w>2 else (60,120,255)  # red=frame grp, blue=divider
        dr.rectangle([c0,y0,c1,y1], outline=color, width=1)
    dr.text((2,y0+1), f"R{i}", fill=(255,255,0))
comp.save("ghostface_work/_annotated.png")
# Also dump column-occupancy valley hints for the wide merged groups
def valleys(y0,y1,c0,c1,k):
    sub=content[y0:y1+1,c0:c1+1]; col=sub.sum(axis=0)
    # normalized; find k-1 interior minima by splitting into k equal-ish by occupancy valleys
    print(f"   group x={c0}-{c1} w={c1-c0+1}: colprofile min/med/max={col.min()}/{int(np.median(col))}/{col.max()}")
print("annotated saved")
