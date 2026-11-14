import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

out = np.array(Image.open("ghostface_work/_keyed.png").convert("RGBA"))
H,W = out.shape[:2]
content = out[:,:,3] > 16

def row_bands():
    rh = content.any(axis=1); b=[]; s=None
    for y in range(H):
        if rh[y] and s is None: s=y
        elif not rh[y] and s is not None: b.append((s,y-1)); s=None
    if s is not None: b.append((s,H-1))
    return b

def col_segs(y0,y1):
    sub=content[y0:y1+1,:]; ch=sub.any(axis=0); segs=[]; cs=None
    for x in range(W):
        if ch[x] and cs is None: cs=x
        elif not ch[x] and cs is not None: segs.append((cs,x-1)); cs=None
    if cs is not None: segs.append((cs,W-1))
    return [s for s in segs if s[1]-s[0]+1 > 3]  # drop 2px dividers

def density_split(y0,y1,c0,c1,expected=None):
    """split a wide merged group at deep column-occupancy valleys."""
    sub = content[y0:y1+1, c0:c1+1]
    col = sub.sum(axis=0).astype(float)
    w = len(col)
    # smooth
    k=5; sm=np.convolve(col, np.ones(k)/k, mode='same')
    med = np.median(sm[sm>0]) if (sm>0).any() else 0
    # candidate valleys: local minima well below median, not near edges
    cuts=[]
    margin=max(8, w//12)
    i=margin
    while i < w-margin:
        if sm[i] < med*0.42 and sm[i] <= sm[i-1] and sm[i] <= sm[i+1]:
            # find local min window
            j=i
            while j+1<w-margin and sm[j+1] <= sm[i]*1.05: j+=1
            cut=(i+j)//2
            if not cuts or cut-cuts[-1] > w//8:
                cuts.append(cut)
            i=j+max(8,w//10)
        else:
            i+=1
    bounds=[0]+cuts+[w]
    frames=[(c0+bounds[k], c0+bounds[k+1]-1) for k in range(len(bounds)-1)]
    return frames

bands=row_bands()
ROWS=[]
for i,(y0,y1) in enumerate(bands):
    segs=col_segs(y0,y1)
    frames=[]
    med_w=np.median([c1-c0+1 for c0,c1 in segs])
    for (c0,c1) in segs:
        w=c1-c0+1
        if w > med_w*1.55 and w>110:
            frames += density_split(y0,y1,c0,c1)
        else:
            frames.append((c0,c1))
    ROWS.append((y0,y1,frames))
    print(f"R{i}: y={y0}-{y1}  frames={len(frames)}  x={[ (f[0],f[1]) for f in frames]}")

# montage: each frame tight-cropped (content bbox), bottom aligned, laid in a grid labelled
import json
json.dump([(y0,y1,frames) for (y0,y1,frames) in ROWS], open("ghostface_work/_rows.json","w"))

# build verification montage
cellW, cellH, pad = 90, 128, 4
ncols = max(len(f) for _,_,f in ROWS)
mont = Image.new("RGB", (ncols*(cellW+pad)+pad, len(ROWS)*(cellH+pad)+pad), (40,40,46))
dr=ImageDraw.Draw(mont)
for ri,(y0,y1,frames) in enumerate(ROWS):
    for ci,(c0,c1) in enumerate(frames):
        crop = out[y0:y1+1, c0:c1+1]
        m = crop[:,:,3]>16
        if not m.any(): continue
        ys,xs=np.where(m); by0,by1,bx0,bx1=ys.min(),ys.max(),xs.min(),xs.max()
        fig=Image.fromarray(crop[by0:by1+1,bx0:bx1+1])
        fw,fh=fig.size
        sc=min((cellW-6)/fw,(cellH-6)/fh,1.0)
        fig=fig.resize((max(1,int(fw*sc)),max(1,int(fh*sc))))
        px=ci*(cellW+pad)+pad+(cellW-fig.size[0])//2
        py=ri*(cellH+pad)+pad+(cellH-fig.size[1]-2)  # bottom align
        mont.paste(fig,(px,py),fig)
        dr.rectangle([ci*(cellW+pad)+pad, ri*(cellH+pad)+pad, ci*(cellW+pad)+pad+cellW, ri*(cellH+pad)+pad+cellH], outline=(90,90,110))
        dr.text((ci*(cellW+pad)+pad+2, ri*(cellH+pad)+pad+2), f"{ri}.{ci}", fill=(255,230,80))
mont.save("ghostface_work/_frames_montage.png")
print("montage saved")
