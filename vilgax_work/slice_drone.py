import numpy as np, json
from PIL import Image
im=Image.open("s716cB.jpg").convert("RGB")
a=np.asarray(im).astype(np.int16); H,W,_=a.shape
# grey-purple bg ~ sample corner
bg=a[10:40,10:40].reshape(-1,3).mean(axis=0)
print("bg sample:", bg.round(1))
dist=np.sqrt(((a-bg)**2).sum(axis=2))
fg=dist>42   # JPG → looser key
# labels are white text on far left (x<430). sprites start ~x450.
SX=440
col=fg[:,SX:]
rows=col.sum(axis=1)
# find row bands
bands=[];y=0
while y<H:
    if rows[y]>6:
        y0=y
        while y<H and rows[y]>6: y+=1
        if y-y0>18: bands.append((y0,y))
    else:y+=1
print(f"{len(bands)} drone rows:")
labels=["death_top","idle_top","walk_top","back","death_side","fire1","fire2","forward","idle"]
def frames_in(y0,y1):
    strip=fg[y0:y1,SX:]; cc=strip.sum(axis=0); out=[];x=0
    while x<cc.shape[0]:
        if cc[x]>0:
            xs=x;gap=0
            while x<cc.shape[0] and (cc[x]>0 or gap<6):
                gap=0 if cc[x]>0 else gap+1;x+=1
            xe=x-gap
            if xe-xs>=10: out.append((SX+xs,SX+xe))
        else:x+=1
    return out
alpha=(fg).astype(np.uint8)*255
rgba=np.dstack([np.asarray(im).astype(np.uint8),alpha])
def crop(y0,y1,xs,xe):
    sub=rgba[y0:y1,xs:xe].copy(); m=sub[:,:,3]>0
    if not m.any(): return None
    ys,xx=np.where(m); return sub[ys.min():ys.max()+1, xx.min():xx.max()+1]
# pick which rows/frames we want for the summon
WANT={"idle":(8,None),"forward":(7,None),"fire1":(5,[0,2,4,6,8,10]),"death_side":(4,[0,2,4,6,8])}
OUT={"idle":"idle","forward":"fwd","fire1":"fire","death_side":"death"}
summary={}
for li,(y0,y1) in enumerate(bands):
    lab=labels[li] if li<len(labels) else f"row{li}"
    fr=frames_in(y0,y1)
    print(f"  {lab:12s} y{y0}-{y1} frames={len(fr)}")
    if lab in WANT:
        idxs=WANT[lab][1]; sel=range(len(fr)) if idxs is None else [i for i in idxs if i<len(fr)]
        crops=[crop(y0,y1,*fr[i]) for i in sel]; crops=[c for c in crops if c is not None]
        if not crops: continue
        PAD=2; cw=max(c.shape[1] for c in crops)+2*PAD; ch=max(c.shape[0] for c in crops)+2*PAD
        strip=np.zeros((ch,cw*len(crops),4),np.uint8)
        for i,c in enumerate(crops):
            h,w=c.shape[:2]; px=i*cw+(cw-w)//2; py=(ch-h)//2
            strip[py:py+h,px:px+w]=c
        Image.fromarray(strip,"RGBA").save(f"vilgax_drone_{OUT[lab]}_uniform.png")
        summary[OUT[lab]]={"frames":len(crops),"width":cw,"height":ch}
json.dump(summary,open("vilgax_work/_drone_summary.json","w"))
print("drone sheets:",summary)
