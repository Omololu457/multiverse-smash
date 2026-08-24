#!/usr/bin/env python3
# Stage-1 probe for IRON MAN 3 (GBA). Detects sprite ROWS (tall colorful bands, not thin
# label text) and, within a given y-band, the frame COLUMN segments. Blue-key (77,109,243).
import numpy as np
from PIL import Image
SRC="Game Boy Advance - The Invincible Iron Man - Playable Characters - Iron Man.png"
a=np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H,W,_=a.shape
BG=np.array([77,109,243])
bgmask=np.abs(a-BG).sum(2)<=60          # background
# label text is near-black on blue; suit is red/gold (high R). Treat "content" = non-bg.
content=~bgmask
# "suit" = strongly red/gold (helps separate sprite rows from black label text)
R,G,Bl=a[:,:,0],a[:,:,1],a[:,:,2]
suit=(R>120)&(R>Bl+40)&(~bgmask)

def rowprofile():
    occ=content.sum(1); suitocc=suit.sum(1)
    # find bands where suit present (sprite rows)
    on=suitocc>3
    bands=[]; inb=False;s=0
    for y in range(H):
        if on[y] and not inb: inb=True;s=y
        elif not on[y] and inb: inb=False;bands.append((s,y))
    if inb:bands.append((s,H))
    m=[]
    for b in bands:
        if m and b[0]-m[-1][1]<=5: m[-1]=(m[-1][0],b[1])
        else: m.append(list(b))
    return m

def cols(y0,y1,minh=6,gap=3):
    sub=content[y0:y1]
    occ=sub.sum(0)
    on=occ>0
    segs=[];inb=False;s=0
    for x in range(W):
        if on[x] and not inb: inb=True;s=x
        elif not on[x] and inb: inb=False;segs.append((s,x))
    if inb:segs.append((s,W))
    m=[]
    for a2,b2 in segs:
        if m and a2-m[-1][1]<=gap: m[-1]=(m[-1][0],b2)
        else: m.append([a2,b2])
    # keep only segs whose content height >= minh (drops thin label text rows)
    out=[]
    for x0,x1 in m:
        colh=content[y0:y1,x0:x1].any(0)  # per-x any
        # measure max vertical extent
        ys=np.where(content[y0:y1,x0:x1].any(1))[0]
        h=(ys.max()-ys.min()+1) if len(ys) else 0
        if h>=minh: out.append((x0,x1,x1-x0,h))
    return out

import sys
if len(sys.argv)>=3:
    y0,y1=int(sys.argv[1]),int(sys.argv[2])
    minh=int(sys.argv[3]) if len(sys.argv)>3 else 10
    for c in cols(y0,y1,minh):
        print(c)
else:
    for i,b in enumerate(rowprofile()):
        # suit extent within band
        print(i,b[0],b[1],'h=%d'%(b[1]-b[0]))
