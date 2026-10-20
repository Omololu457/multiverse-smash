import numpy as np
from PIL import Image, ImageDraw

im = Image.open("vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3.png").convert("RGB")
a = np.asarray(im).astype(np.int16)
H, W, _ = a.shape
bg = np.array([240,128,48])
dist = np.sqrt(((a - bg)**2).sum(axis=2))
fg = dist > 60
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
redlabel = (r>150) & (g<70) & (b<70)
fg_sprite = fg & ~redlabel

# Sprite rows live in x < 950 (portraits are to the right). Cinematic panels: skip bands taller than 120.
PORT_X = 950
col_region = fg_sprite[:, :PORT_X]
rowcount = col_region.sum(axis=1)
thr = 8
bands=[]; y=0
while y<H:
    if rowcount[y]>thr:
        y0=y
        while y<H and rowcount[y]>thr: y+=1
        if 30 <= (y-y0) <= 120: bands.append((y0,y))  # sprite-row height window
    else: y+=1

ov = im.copy(); d=ImageDraw.Draw(ov)
out=[]
for bi,(y0,y1) in enumerate(bands):
    strip = fg_sprite[y0:y1, :PORT_X]
    colcount = strip.sum(axis=0)
    # split into frames: contiguous columns with content, gap>=4 separates frames
    frames=[]; x=0
    while x<PORT_X:
        if colcount[x]>0:
            x0=x
            gap=0
            while x<PORT_X and (colcount[x]>0 or gap<4):
                if colcount[x]>0: gap=0
                else: gap+=1
                x+=1
            x1=x-gap
            if x1-x0>=8: frames.append((x0,x1))
        else: x+=1
    out.append((y0,y1,frames))
    d.rectangle([0,y0,PORT_X,y1], outline=(0,0,255), width=1)
    for (fx0,fx1) in frames:
        d.rectangle([fx0,y0,fx1,y1], outline=(0,255,0), width=1)
    print(f"row {bi:2d}: y {y0:4d}-{y1:4d} h={y1-y0:2d}  frames={len(frames):2d}  widths={[fx1-fx0 for fx0,fx1 in frames]}")

ov.save("vilgax_work/_overview_boxes.png")
print(f"\n{len(bands)} sprite rows total. overview -> vilgax_work/_overview_boxes.png")
