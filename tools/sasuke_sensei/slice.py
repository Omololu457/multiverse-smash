#!/usr/bin/env python3
"""Slice the border-flood-fill-keyed Sasuke (Sensei) sheet into per-action uniform strips.
Bands + x-splits from row-band detection + the spec sheet-map (actual_y ≈ spec_y × 1.625).
force-to-N split (sakura-proven) + feet-align into uniform cells. Labels sit in thin bands ABOVE
the tall content bands → excluded by using content-band y-ranges."""
import numpy as np, sys, json
from PIL import Image
SRC="tools/sasuke_sensei/S_keyed.png"
RGBA=np.asarray(Image.open(SRC)).copy(); ALPHA=RGBA[:,:,3]; _RGB=RGBA[:,:,:3].astype(int); PAD=3
# ARTIFACT ERASURE (QA-flagged, not keying): walk cyan label + strong white crop-ticks
_cyan=(_RGB[:,:,1]>150)&(_RGB[:,:,2]>150)&(_RGB[:,:,0]<120)
ALPHA[549:632][_cyan[549:632]]=0                       # "*Walk For Susano'o Mode." label in the Walk band
_white=(_RGB[:,:,0]>200)&(_RGB[:,:,1]>200)&(_RGB[:,:,2]>200)
ALPHA[2380:2397][_white[2380:2397]]=0                  # white crop-guide ticks above Strong Attack
def raw_islands(y0,y1,x0,x1,gap=5,min_w=9):
    occ=(ALPHA[y0:y1,x0:x1]>0).any(0); runs=[];s=None
    for x,v in enumerate(occ):
        if v and s is None:s=x
        elif not v and s is not None:runs.append([s,x-1]);s=None
    if s is not None:runs.append([s,len(occ)-1])
    m=[]
    for r in runs:
        if m and r[0]-m[-1][1]-1<=gap:m[-1][1]=r[1]
        else:m.append(list(r))
    return [[x0+a,x0+b] for a,b in m if b-a+1>=min_w]
def force_to_n(y0,y1,x0,x1,n):
    isl=raw_islands(y0,y1,x0,x1); col=(ALPHA[y0:y1,:]>0).sum(0)
    while len(isl)<n:
        wi=max(range(len(isl)),key=lambda i:isl[i][1]-isl[i][0]); a,b=isl[wi]; m=int((b-a)*0.3); lo,hi=a+m,b-m
        if hi<=lo:break
        seam=lo+int(np.argmin(col[lo:hi+1])); isl[wi:wi+1]=[[a,seam],[seam+1,b]]
    while len(isl)>n and len(isl)>1:
        gi=min(range(len(isl)-1),key=lambda i:isl[i+1][0]-isl[i][1]); isl[gi:gi+2]=[[isl[gi][0],isl[gi+1][1]]]
    return [(a,b+1) for a,b in isl]
def emit(name,segs):
    frames=[]
    for (y0,y1,x0,x1,n) in segs:
        rows=np.where((ALPHA[y0:y1,x0:x1]>0).any(1))[0]
        if len(rows)==0:continue
        ty0,ty1=y0+rows[0],y0+rows[-1]+1
        for (a,b) in force_to_n(y0,y1,x0,x1,n):
            if (ALPHA[ty0:ty1,a:b]>0).any():frames.append((ty0,ty1,a,b))
    if not frames:print(f"  {name}: EMPTY");return None
    h=max(y1-y0 for (y0,y1,_,_) in frames); cw=max(b-a for (_,_,a,b) in frames)+2*PAD
    sheet=Image.new("RGBA",(cw*len(frames),h),(0,0,0,0)); full=Image.fromarray(RGBA,"RGBA")
    for i,(y0,y1,a,b) in enumerate(frames):
        fw,fh=b-a,y1-y0; sheet.paste(full.crop((a,y0,b,y1)),(i*cw+(cw-fw)//2,h-fh),full.crop((a,y0,b,y1)))
    out=f"sasuke_sensei_{name}_uniform.png"; sheet.save(out)
    print(f"  {out:44s} {len(frames)}f {cw}x{h}")
    return {"frames":len(frames),"width":int(cw),"height":int(h),"sheet":f"./{out}"}
CFG={
 'intro':   [(336,419,21,250,5)],
 'idle':    [(440,524,10,360,8)],
 'walk':    [(549,632,10,410,6)],
 'run':     [(673,734,7,490,5)],
 'dash':    [(778,845,12,420,5)],
 'jump':    [(867,949,7,200,3)],
 'guard':   [(867,949,240,412,3)],
 'hurt':    [(992,1072,11,212,2)],
 'special_damage':[(992,1072,214,335,3)],
 'launched':[(1119,1199,16,525,5)],
 'knockdown':[(1240,1290,17,616,7)],
 'charge':  [(2114,2195,20,116,2)],
 'throw':   [(2235,2319,18,372,5)],
 'throw_air':[(2235,2319,374,625,4)],
 'strong':  [(2380,2448,20,292,3)],
 'strong_fwd':[(2625,2701,15,515,5)],
 'strong_up':[(2760,2839,30,633,6)],
 'strong_down':[(2889,2977,26,353,4)],
 'strong_air':[(3045,3117,13,498,5)],
 'win':     [(3179,3268,24,520,10)],
 # combos (best-effort; QA will refine)
 'light':   [(1335,1432,23,234,4)],
 'heavy':   [(1335,1432,480,917,5)],
 'air':     [(1589,1700,20,1005,10)],
}
def main():
    meta={}
    for n,s in CFG.items():
        r=emit(n,s)
        if r:meta[n]=r
    json.dump(meta,open("tools/sasuke_sensei/body_meta.json","w"),indent=1)
    print(f"\nwrote {len(meta)} sheets")
if __name__=="__main__":main()
