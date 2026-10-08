#!/usr/bin/env python3
"""Slice Sasuke (Sensei) MANGEKYOU-set cast poses + key FX from the keyed sheet (Phase 2).
Separate from slice.py / slice_specials.py (concurrent-session-owned) to avoid collisions.
Cast poses feet-aligned; FX layers center-packed (imported as projectile sheets). Labels sit ABOVE
their rows → excluded by content-band y-ranges. Bands from the P2 crops + content-band scan.
  Katon Goukakyuu (N) / Amaterasu (F) / Amaterasu Sword (B) / Genjutsu (U) / Kuchiyose cast (D/Ult)."""
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
 ("katon_cast",       4418,4512, 12, 300, 3),   # Great Fireball cast (fire-breath)
 ("katon_air_cast",   4418,4512, 335, 565, 3),  # air version
 ("amaterasu_cast",   4662,4744, 12, 420, 8),   # eye-focus poses (excl emblem/FX right + "FX:" label bottom)
 ("amaterasu_sword_cast", 5026,5108, 12, 980, 8),   # black-flame blade swing (black flame BAKED; excl top label)
 ("genjutsu_cast",    5932,6020, 12, 400, 6),   # arm-extend genjutsu (excl white victim FX + emblems/feathers + top label)
 ("kuchiyose_cast",   6560,6648, 12, 235, 3),   # summoning hand-slam (shared Taka/Hebi)
]
FX=[   # center-packed projectile FX
 ("fx_fireball",      4535,4606, 12, 510, 8),   # Katon fireball growth loop (excl Amaterasu label bottom)
 ("fx_amaterasu",     4660,4770, 520, 920, 6),  # Amaterasu black-flame blobs
]
def main():
    meta={}
    for n,y0,y1,x0,x1,k in CAST: r=emit(n,y0,y1,x0,x1,k,"feet"); meta[n]=r if r else meta.get(n)
    for n,y0,y1,x0,x1,k in FX:   r=emit(n,y0,y1,x0,x1,k,"center"); meta[n]=r if r else meta.get(n)
    json.dump({k:v for k,v in meta.items() if v},open("tools/sasuke_sensei/mangekyou_meta.json","w"),indent=1)
    print("wrote mangekyou sheets")
if __name__=="__main__":main()
