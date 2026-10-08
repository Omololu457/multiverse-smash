#!/usr/bin/env python3
"""Slice the RBM-Kyuubi Sakura source sheet into per-action strips with navy keyed to alpha."""
import numpy as np
from PIL import Image
import os, json, sys

SRC='sakura_btng_nzc_by_rbm_kyuubi_dbxd9z4.png'
BG=np.array([0,64,128])
OUT='sakura_src_frames'
os.makedirs(OUT,exist_ok=True)

def key_rgba(threshold=24):
    rgb=np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    d=np.sqrt(((rgb-BG)**2).sum(2))
    alpha=np.where(d<=threshold,0,255).astype(np.uint8)
    out=np.dstack([rgb.astype(np.uint8),alpha])
    return out  # HxWx4

RGBA=key_rgba()
H,W,_=RGBA.shape

def alpha_mask(x0,x1,y0,y1):
    return RGBA[y0:y1,x0:x1,3]>0

def detect_frames(y0,y1,x0,x1,min_gap=4,min_w=6,pad=1):
    """Return list of (fx0,fx1) frame x-spans within the region via column occupancy gaps."""
    sub=RGBA[y0:y1,x0:x1,3]>0
    col=sub.any(0)
    frames=[]
    i=0; n=len(col)
    while i<n:
        if col[i]:
            j=i
            gap=0; last=i
            while j<n:
                if col[j]:
                    last=j; gap=0
                else:
                    gap+=1
                    if gap>min_gap: break
                j+=1
            fx0=i; fx1=last+1
            if fx1-fx0>=min_w:
                frames.append((x0+fx0,x0+fx1))
            i=last+1
        else:
            i+=1
    return frames

def tight_rows(y0,y1,x0,x1):
    sub=RGBA[y0:y1,x0:x1,3]>0
    rows=np.where(sub.any(1))[0]
    if len(rows)==0: return y0,y1
    return y0+rows[0], y0+rows[-1]+1

if __name__=='__main__':
    # quick: dump frame detection for a region given on CLI: y0 y1 x0 x1 [min_gap]
    a=sys.argv[1:]
    y0,y1,x0,x1=int(a[0]),int(a[1]),int(a[2]),int(a[3])
    mg=int(a[4]) if len(a)>4 else 4
    fr=detect_frames(y0,y1,x0,x1,min_gap=mg)
    print(f'region y{y0}-{y1} x{x0}-{x1}: {len(fr)} frames')
    for k,(fx0,fx1) in enumerate(fr):
        ty0,ty1=tight_rows(y0,y1,fx0,fx1)
        print(f'  f{k}: x{fx0}-{fx1} (w{fx1-fx0})  ytight {ty0}-{ty1}')
