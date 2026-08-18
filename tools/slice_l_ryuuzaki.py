#!/usr/bin/env python3
# Batch processor for the l_ryuuzaki_sprite_rows raw dump (Death Note — L Lawliet / "Ryuuzaki",
# plus the Ryuk shinigami monster sheets). Same one-pass pipeline as tools/slice_six_paths_of_pain.py
# but with a GENERIC auto-sampling chroma keyer (this dump's flat background is TEAL 0,102,102, not
# green) — the bg color is sampled from each sheet's own border, never assumed.
#
#   STEP 1  background removal — distance-key the sampled flat bg, hue-aware de-halo of the thin
#           anti-alias fringe, hue-aware de-spill on surviving edge pixels. No halo; no non-bg pixel
#           recolored (grey/white/gold art untouched — only bg-hued spill is pulled toward neutral).
#   STEP 2  ROW-ONLY slice — content bands split on measured fully-transparent horizontal gutters;
#           one file per row (whole multi-frame animation kept together); crop only. Fused rows with
#           no true gutter are emitted whole and flagged, never guessed.
import os, glob
import numpy as np
from PIL import Image
from collections import Counter

SRC="l_ryuuzaki_sprite_rows"
OUT="l_ryuuzaki_sprite_rows_sliced"
ALPHA=16; GAP_MIN=2; MIN_BAND_H=5; SPECK=2
HARD=62.0; SOFT=120.0; HUE_COS=0.86

def sample_bg(a):
    H,W=a.shape[:2]
    border=np.concatenate([a[0,:,:3],a[H-1,:,:3],a[:,0,:3],a[:,W-1,:3]],axis=0)
    return np.array(Counter(map(tuple,border.tolist())).most_common(1)[0][0],dtype=float)

def key_bg(path):
    a=np.array(Image.open(path).convert("RGBA"))
    rgb=a[...,:3].astype(float); orig=a[...,3]
    already=(orig.min()<250) and ((orig<ALPHA).mean()>0.02)
    if already: return a,False,int((orig<ALPHA).sum()),None
    C=sample_bg(a); alpha=orig.copy()
    dist=np.sqrt(((rgb-C)**2).sum(axis=2))
    cchroma=C-C.mean(); cn=np.linalg.norm(cchroma)
    pch=rgb-rgb.mean(axis=2,keepdims=True); pnorm=np.linalg.norm(pch,axis=2)
    cos=(pch*cchroma).sum(axis=2)/(pnorm*cn+1e-6)
    alpha[dist<=HARD]=0
    fringe=(dist<=SOFT)&(cos>=HUE_COS)
    for _ in range(2):
        trans=alpha==0; neigh=np.zeros_like(trans)
        neigh[1:,:]|=trans[:-1,:];neigh[:-1,:]|=trans[1:,:]
        neigh[:,1:]|=trans[:,:-1];neigh[:,:-1]|=trans[:,1:]
        neigh[1:,1:]|=trans[:-1,:-1];neigh[:-1,:-1]|=trans[1:,1:]
        neigh[1:,:-1]|=trans[:-1,1:];neigh[:-1,1:]|=trans[1:,:-1]
        cut=fringe&neigh&(alpha>0)
        if not cut.any():break
        alpha[cut]=0
    keep=alpha>0;trans=alpha==0;edge=np.zeros_like(trans)
    edge[1:,:]|=trans[:-1,:];edge[:-1,:]|=trans[1:,:];edge[:,1:]|=trans[:,:-1];edge[:,:-1]|=trans[:,1:]
    proj=(pch*cchroma).sum(axis=2)/(cn*cn+1e-6)
    spill=keep&edge&(cos>=HUE_COS)&(proj>0.25)
    out_rgb=rgb.copy(); remove=(0.8*proj[...,None])*cchroma[None,None,:]
    out_rgb[spill]=(rgb[spill]-remove[spill]).clip(0,255)
    out=a.copy(); out[...,:3]=out_rgb.astype(np.uint8); out[...,3]=alpha.astype(np.uint8)
    return out,True,int((alpha==0).sum()),tuple(int(x) for x in C)

def row_bands(alpha):
    H,W=alpha.shape; rc=(alpha>ALPHA).sum(axis=1); ne=rc>SPECK
    raw=[];s=-1
    for y in range(H):
        if ne[y]:
            if s<0:s=y
        elif s>=0: raw.append([s,y-1]);s=-1
    if s>=0: raw.append([s,H-1])
    merged=[]
    for b in raw:
        if merged and b[0]-merged[-1][1]-1<GAP_MIN: merged[-1][1]=b[1]
        else: merged.append(b[:])
    return [tuple(b) for b in merged if b[1]-b[0]+1>=MIN_BAND_H]

def xspan(alpha,y0,y1):
    cols=(alpha[y0:y1+1,:]>ALPHA).any(axis=0); xs=np.where(cols)[0]
    return (int(xs[0]),int(xs[-1])) if len(xs) else None

def main():
    os.makedirs(OUT,exist_ok=True)
    files=sorted(glob.glob(os.path.join(SRC,"*.png")))
    n_removed=n_already=n_rows=0; manifest=[]; flagged=[]; bgs=set()
    for f in files:
        stem=os.path.splitext(os.path.basename(f))[0]
        rgba,needed,_,C=key_bg(f)
        if needed: n_removed+=1; bgs.add(C)
        else: n_already+=1
        im=Image.fromarray(rgba,"RGBA"); alpha=rgba[...,3]
        bands=row_bands(alpha)
        if not bands:
            flagged.append((os.path.basename(f),"no content after keying")); continue
        multi=len(bands)>1
        for i,(y0,y1) in enumerate(bands,start=1):
            xs=xspan(alpha,y0,y1)
            if xs is None: continue
            x0,x1=xs; crop=im.crop((x0,y0,x1+1,y1+1))
            name=f"{stem}_row_{i:02d}.png" if multi else f"{stem}.png"
            crop.save(os.path.join(OUT,name)); n_rows+=1
            manifest.append((name,os.path.basename(f),i,len(bands),crop.size[0],crop.size[1]))
    with open(os.path.join(OUT,"_manifest.tsv"),"w") as m:
        m.write("output\tsource\tband_index\tbands_in_source\twidth\theight\n")
        for r in manifest: m.write("\t".join(map(str,r))+"\n")
    print(f"SOURCE FILES PROCESSED : {len(files)}")
    print(f"  needed bg removal    : {n_removed}   (sampled bg colors: {sorted(bgs)})")
    print(f"  already transparent  : {n_already}")
    print(f"ROW FILES WRITTEN      : {n_rows}")
    multi_src=sorted(set(m[1] for m in manifest if m[3]>1))
    print(f"SOURCES THAT SPLIT >1 BAND: {len(multi_src)}")
    for s in multi_src:
        print(f"    {s} -> {max(m[2] for m in manifest if m[1]==s)} rows")
    print("FLAGGED / SKIPPED:", "none" if not flagged else "")
    for name,why in flagged: print(f"    {name}: {why}")

if __name__=="__main__": main()
