#!/usr/bin/env python3
# Fills over-keyed ENCLOSED interior holes in the Spider-Man variant sheets that render
# see-through on dynamic (non-idle) frames: raimi_* (significant) and mci_* (minor).
# ssf2_* is already clean and is NOT touched. Body/attack sheets only — no FX hollows,
# so ALL enclosed holes are filled. Exterior/silhouette transparency is never touched
# (frame dims/anchors byte-identical). Same surgical approach as fix_kurapika_miles_overkey.py.
import glob, os, sys
import numpy as np
from PIL import Image
from collections import deque
def enclosed(alpha):
    h,w=alpha.shape; t=alpha==0; out=np.zeros((h,w),bool); q=deque()
    for x in range(w):
        for y in (0,h-1):
            if t[y,x] and not out[y,x]: out[y,x]=True;q.append((x,y))
    for y in range(h):
        for x in (0,w-1):
            if t[y,x] and not out[y,x]: out[y,x]=True;q.append((x,y))
    while q:
        x,y=q.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<w and 0<=ny<h and t[ny,nx] and not out[ny,nx]: out[ny,nx]=True;q.append((nx,ny))
    return t & ~out
def fix(path):
    arr=np.array(Image.open(path).convert("RGBA")); a=arr[:,:,3].copy(); rgb=arr[:,:,:3].astype(np.int32)
    holes=enclosed(a); n=int(holes.sum())
    if n==0: return 0
    rem=holes.copy(); h,w=a.shape
    for _ in range(60):
        if not rem.any(): break
        ys,xs=np.where(rem); prog=False
        for y,x in zip(ys,xs):
            acc=[]
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                nx,ny=x+dx,y+dy
                if 0<=nx<w and 0<=ny<h and a[ny,nx]==255 and not rem[ny,nx]: acc.append(rgb[ny,nx])
            if acc: rgb[y,x]=np.mean(acc,0).astype(np.int32); a[y,x]=255; rem[y,x]=False; prog=True
        if not prog:
            for y,x in zip(*np.where(rem)): a[y,x]=255
            break
    Image.fromarray(np.dstack([rgb.astype(np.uint8),a.astype(np.uint8)]),"RGBA").save(path)
    return n
if __name__=="__main__":
    apply="--apply" in sys.argv
    targets=sorted(glob.glob("raimi_*_uniform*.png")+glob.glob("mci_*_uniform*.png"))
    tot=0
    for f in targets:
        n=int(enclosed(np.array(Image.open(f).convert("RGBA"))[:,:,3]).sum())
        if n==0: continue
        if apply:
            filled=fix(f); tot+=filled; print(f"[FIX] {f:34} filled={filled}")
        else:
            print(f"[DRY] {f:34} enclosed_holes={n}"); tot+=n
    print(f"\n{'APPLIED' if apply else 'DRY'}: {tot} px across affected sheets (ssf2 untouched — already clean)")
