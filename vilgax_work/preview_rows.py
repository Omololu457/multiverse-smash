import numpy as np
from PIL import Image

im = Image.open("vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3.png").convert("RGB")
a = np.asarray(im).astype(np.int16)
H, W, _ = a.shape
bg = np.array([240,128,48])
dist = np.sqrt(((a - bg)**2).sum(axis=2))
fg = dist > 60
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
redlabel = (r>150) & (g<70) & (b<70)
fg_sprite = fg & ~redlabel
PORT_X = 950
rgba = np.dstack([np.asarray(im), (fg*255).astype(np.uint8)])  # strip orange -> alpha

rows = [(53,116),(151,214),(267,324),(395,465),(543,607),(675,747),(803,866),(925,992),(1051,1113),(1385,1437),(1720,1798),(1997,2073),(2136,2206),(2265,2326),(3185,3245),(3300,3373)]
def frames_in(y0,y1):
    strip = fg_sprite[y0:y1,:PORT_X]; cc=strip.sum(axis=0); out=[];x=0
    while x<PORT_X:
        if cc[x]>0:
            x0=x;gap=0
            while x<PORT_X and (cc[x]>0 or gap<4):
                gap=0 if cc[x]>0 else gap+1; x+=1
            x1=x-gap
            if x1-x0>=8: out.append((x0,x1))
        else:x+=1
    return out

# Build one tall preview: each row's frames trimmed, bottom-aligned, on magenta bg for visibility
CELL=70; PAD=4
canvas=Image.new("RGBA",(16*CELL, len(rows)*CELL),(255,0,255,255))
for ri,(y0,y1) in enumerate(rows):
    fr=frames_in(y0,y1)
    for fi,(x0,x1) in enumerate(fr[:16]):
        sub=rgba[y0:y1, x0:x1]
        # trim to content
        mask=sub[:,:,3]>0
        if not mask.any(): continue
        ys,xs=np.where(mask); cy0,cy1,cx0,cx1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        crop=Image.fromarray(sub[cy0:cy1,cx0:cx1].astype(np.uint8),"RGBA")
        # bottom-center in cell
        cw,ch=crop.size; sc=min(1.0,(CELL-PAD)/max(cw,ch))
        if sc<1.0: crop=crop.resize((max(1,int(cw*sc)),max(1,int(ch*sc))))
        cw,ch=crop.size
        px=fi*CELL+(CELL-cw)//2; py=ri*CELL+(CELL-ch)-PAD
        canvas.alpha_composite(crop,(px,py))
canvas.save("vilgax_work/_rows_preview.png")
print("rows preview -> vilgax_work/_rows_preview.png  (", len(rows),"rows )")
for ri,(y0,y1) in enumerate(rows):
    print(f"  row {ri:2d}  y{y0}-{y1}  frames={len(frames_in(y0,y1))}")
