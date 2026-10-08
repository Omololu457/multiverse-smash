#!/usr/bin/env python3
"""Slice the Taka (hawk) + Hebi (snake) SUMMON entities from the keyed Sasuke (Sensei) sheet.
Separate from slice.py / slice_specials.py (a concurrent session owns those). Summons draw
CENTER-anchored (drawSummons: drawImage at -dw/2,-dh/2) → pack each frame CENTERED in its cell
(NOT feet-aligned). Same force_to_n split as slice_specials.py. Labels ("TAKA:"/"HEBI:"/"Move:"…)
sit ABOVE their rows → excluded by content-band y-ranges; brackets = loop markers (not rendered)."""
import numpy as np, json
from PIL import Image
RGBA=np.asarray(Image.open("tools/sasuke_sensei/S_keyed.png")).copy(); ALPHA=RGBA[:,:,3]; PAD=4
# ARTIFACT ERASURE (loop-bracket over Poison frames 2-3; it sits above their bodies → safe to zero)
ALPHA[12156:12184, 515:945] = 0
def raw_islands(y0,y1,x0,x1,gap=6,min_w=12):
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
        for (a,b) in force_to_n(y0,y1,x0,x1,n):
            rows=np.where((ALPHA[y0:y1,a:b]>0).any(1))[0]
            if len(rows)==0:continue
            ty0,ty1=y0+rows[0],y0+rows[-1]+1
            frames.append((ty0,ty1,a,b))
    if not frames:print(f"  {name}: EMPTY");return None
    h=max(y1-y0 for (y0,y1,_,_) in frames)+2*PAD; cw=max(b-a for (_,_,a,b) in frames)+2*PAD
    sheet=Image.new("RGBA",(cw*len(frames),h),(0,0,0,0)); full=Image.fromarray(RGBA,"RGBA")
    for i,(y0,y1,a,b) in enumerate(frames):
        fw,fh=b-a,y1-y0; sheet.paste(full.crop((a,y0,b,y1)),(i*cw+(cw-fw)//2,(h-fh)//2),full.crop((a,y0,b,y1)))   # CENTER pack
    out=f"sasuke_sensei_{name}_uniform.png"; sheet.save(out)
    print(f"  {out:44s} {len(frames)}f {cw}x{h}")
    return {"frames":len(frames),"width":int(cw),"height":int(h),"sheet":f"./{out}"}
CFG={
 # ── TAKA (hawk) ──
 'taka_intro':  [(6755,6940, 10, 640, 4)],    # perched spawn/takeoff pose
 'taka_fly':    [(8024,8224, 10, 1270, 4)],   # "Move" row — horizontal flight loop
 'taka_attack': [(8681,8920, 10, 780, 3)],    # "Attack 1" dive/talon strike
 'taka_damage': [(8344,8563, 10, 780, 3)],    # hit reaction
 # ── HEBI (snake) ──
 'hebi_intro':  [(9555,9895, 10, 450, 2)],    # rising coil spawn
 'hebi_attack': [(10340,10620, 10, 1100, 3)], # "Attack 1" rear→lunge(mouth)→extend strike
 'hebi_poison': [(12160,12445, 10, 1130, 3)], # "Special Move:Poison" spit loop (purple particle + bracket + Damage label excluded)
 'hebi_petrify':[(12506,12751, 10, 1430, 5)], # "Damage" petrify→stone→crumble (despawn)
}
def main():
    meta={}
    for n,s in CFG.items():
        r=emit(n,s)
        if r:meta[n]=r
    json.dump(meta,open("tools/sasuke_sensei/summons_meta.json","w"),indent=1)
    print(f"\nwrote {len(meta)} summon sheets")
if __name__=="__main__":main()
