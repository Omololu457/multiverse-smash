#!/usr/bin/env python3
# gen_susano_tier3.py — key + slice the TIER 3 (Soldier) pieces from the War-Susano sheet.
# Same border-flood-fill + soft-luminance-alpha keyer. Bottom-anchored uniform strips (feet align).
# OUTPUT (repo root): sasuke_susano_soldier/soldier_bow/winged/flame.png + sasuke_susano_flame_archer.png
import os
from PIL import Image
import numpy as np
from scipy import ndimage
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "sasuke_war_susano_by_nes_by_xxjohnnyxxx_d8sb2nk.png")
THR, RAMP_LO, RAMP_K = 24, 10, 5
def key_sheet(p):
    a = np.asarray(Image.open(p).convert("RGBA")).astype(np.int32); rgb = a[:, :, :3]
    lum = 0.299*rgb[:,:,0]+0.587*rgb[:,:,1]+0.114*rgb[:,:,2]
    lbl,_ = ndimage.label(lum < THR)
    b = set(np.unique(np.concatenate([lbl[0,:],lbl[-1,:],lbl[:,0],lbl[:,-1]]))); b.discard(0)
    al = np.where(np.isin(lbl,list(b)),0,np.clip((lum-RAMP_LO)*RAMP_K,0,255)).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb.astype(np.uint8),al]),"RGBA")
def frames(al,W,y0,y1,minw=24):
    on=(al[y0:y1]>40).sum(axis=0)>2; runs=[];s=None
    for x in range(W):
        if on[x] and s is None:s=x
        elif not on[x] and s is not None:
            if x-s>=minw:runs.append((s,x-1))
            s=None
    if s is not None and W-s>=minw:runs.append((s,W-1))
    out=[]
    for x0,x1 in runs:
        ys=np.where((al[y0:y1,x0:x1+1]>40).any(axis=1))[0]
        if len(ys):out.append((x0,y0+ys.min(),x1,y0+ys.max()))
    return out
def pack(keyed,boxes,out,pad=3):
    cr=[keyed.crop((a-pad,b-pad,c+1+pad,d+1+pad)) for a,b,c,d in boxes]
    cw=max(c.width for c in cr);ch=max(c.height for c in cr)
    st=Image.new("RGBA",(cw*len(cr),ch),(0,0,0,0))
    for i,c in enumerate(cr):st.alpha_composite(c,(i*cw+(cw-c.width)//2,ch-c.height))  # bottom-anchor
    st.save(out);print(f"wrote {os.path.basename(out)}: {len(cr)}f cell {cw}x{ch}")
keyed=key_sheet(SRC);W=keyed.width;al=np.asarray(keyed)[:,:,3]
pack(keyed,frames(al,W,2395,2705),os.path.join(ROOT,"sasuke_susano_soldier.png"))
pack(keyed,frames(al,W,2835,3125),os.path.join(ROOT,"sasuke_susano_soldier_bow.png"))
pack(keyed,frames(al,W,540,840),os.path.join(ROOT,"sasuke_susano_winged.png"))
pack(keyed,frames(al,W,3135,3385),os.path.join(ROOT,"sasuke_susano_flame.png"))
fa=keyed.crop((915,3060,1260,3460));fb=np.asarray(fa)[:,:,3];ys,xs=np.where(fb>40)
fa.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)).save(os.path.join(ROOT,"sasuke_susano_flame_archer.png"));print("wrote sasuke_susano_flame_archer.png")
