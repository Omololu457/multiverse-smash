#!/usr/bin/env python3
"""Slice Sasuke (Sensei) RINNEGAN-set cast poses + FX from the keyed sheet (Phase 3).
Separate slicer (concurrent session owns slice.py/slice_specials.py). Cast poses feet-aligned; FX
center-packed (projectile sheets). Labels sit ABOVE rows → excluded by content-band y-ranges.
  Shinra Tensei (N) / Chakra Absorb (F) / Rinnegan Path (B) / Raiko Kenka weapon (U) / Chibaku Tensei (ULT).
  NOTE: these are Pain/Nagato Six-Paths techniques on the sheet — NOT Sasuke's canon Rinnegan power
  (Amenotejikara, absent). Labelled ORIGINAL/CANON-ADJACENT in the kit."""
import numpy as np, json
from PIL import Image
RGBA=np.asarray(Image.open("tools/sasuke_sensei/S_keyed.png")); ALPHA=RGBA[:,:,3]; PAD=3
def raw_islands(y0,y1,x0,x1,gap=6,min_w=9):
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
def emit(name,y0,y1,x0,x1,n,align="feet"):
    rows=np.where((ALPHA[y0:y1,x0:x1]>0).any(1))[0]
    if len(rows)==0: print("  %s EMPTY"%name); return None
    ty0,ty1=y0+rows[0],y0+rows[-1]+1
    frames=[(ty0,ty1,a,b) for (a,b) in force_to_n(y0,y1,x0,x1,n) if (ALPHA[ty0:ty1,a:b]>0).any()]
    h=max(b-a for (a,b,_,_) in frames); cw=max(d-c for (_,_,c,d) in frames)+2*PAD
    sheet=Image.new("RGBA",(cw*len(frames),h),(0,0,0,0)); full=Image.fromarray(RGBA,"RGBA")
    for i,(a,b,c,d) in enumerate(frames):
        fw,fh=d-c,b-a; dy=(h-fh) if align=="feet" else (h-fh)//2
        sheet.paste(full.crop((c,a,d,b)),(i*cw+(cw-fw)//2,dy),full.crop((c,a,d,b)))
    out="sasuke_sensei_%s_uniform.png"%name; sheet.save(out)
    print("  %-46s %df %dx%d"%(out,len(frames),cw,h))
    return {"frames":len(frames),"width":int(cw),"height":int(h),"sheet":"./%s"%out}
CAST=[  # (name,y0,y1,x0,x1,n)
 ("raiko_kenka_cast", 3315,3412, 12, 930, 8),   # Kuchiyose: Raiko Kenka — scroll/tag weapon throw (14f→8)
 ("shinra_tensei_cast", 3556,3640, 12, 360, 4), # Shinra Tensei — palm-thrust repulsion (y0 past top label)
 ("chibaku_cast",     5815,5897, 12, 378, 4),   # Chibaku Tensei — arm-raise gravity cast
 ("rinnegan_path_cast", 6196,6279, 12, 232, 3), # Rinnegan Path — arm-extend (pull/beam)
 ("chakra_absorb_cast", 6435,6512, 12, 360, 4), # Chakra Absorb — absorbing hand-out loop
]
FX=[   # center-packed projectile FX
 ("fx_shuriken",      3338,3404, 952, 1078, 2), # Raiko Kenka weapon shuriken
 ("fx_chibaku",       5815,5895, 384, 762, 6),  # Chibaku orb → rock-meteor growth
]
def main():
    meta={}
    for n,y0,y1,x0,x1,k in CAST: r=emit(n,y0,y1,x0,x1,k,"feet"); meta[n]=r if r else meta.get(n)
    for n,y0,y1,x0,x1,k in FX:   r=emit(n,y0,y1,x0,x1,k,"center"); meta[n]=r if r else meta.get(n)
    json.dump({k:v for k,v in meta.items() if v},open("tools/sasuke_sensei/rinnegan_meta.json","w"),indent=1)
    print("wrote rinnegan sheets")
if __name__=="__main__":main()
