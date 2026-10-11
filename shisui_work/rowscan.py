import sys, numpy as np
from PIL import Image, ImageDraw

NAVY=(0,64,128)
def load(f):
    im=Image.open(f).convert("RGBA")
    a=np.array(im)
    return im,a

def content_mask(a, tol=24):
    r,g,b=a[...,0].astype(int),a[...,1].astype(int),a[...,2].astype(int)
    al=a[...,3]
    navy = (abs(r-NAVY[0])<tol)&(abs(g-NAVY[1])<tol)&(abs(b-NAVY[2])<tol)
    transp = al<16
    return ~(navy|transp)

def row_bands(mask, min_gap=6, min_h=4):
    rows = mask.any(axis=1)
    bands=[]; start=None; gap=0
    for y,v in enumerate(rows):
        if v:
            if start is None: start=y
            gap=0
        else:
            if start is not None:
                gap+=1
                if gap>=min_gap:
                    bands.append((start,y-gap+1)); start=None; gap=0
    if start is not None: bands.append((start,len(rows)-1))
    return [(s,e) for s,e in bands if e-s>=min_h]

if __name__=="__main__":
    f=sys.argv[1]
    im,a=load(f)
    m=content_mask(a)
    bands=row_bands(m)
    print(f"{f}  size={im.size}  #bands={len(bands)}")
    for i,(s,e) in enumerate(bands):
        # for each band find x-extent of content
        sub=m[s:e+1,:]
        cols=sub.any(axis=0)
        xs=np.where(cols)[0]
        x0,x1=(int(xs.min()),int(xs.max())) if len(xs) else (0,0)
        print(f"  band {i:2d}: y {s:4d}-{e:4d} (h={e-s+1:3d})  x {x0:4d}-{x1:4d}")
