import numpy as np, json
from PIL import Image

SHEET="vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3.png"
im = Image.open(SHEET).convert("RGB")
a = np.asarray(im).astype(np.int16)
H,W,_=a.shape
bg=np.array([240,128,48])
dist=np.sqrt(((a-bg)**2).sum(axis=2))
# alpha: not-orange. Kill orangish fringe too (r>>b and warm).
r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
orangey=(dist<70)
alpha=(~orangey).astype(np.uint8)*255
rgba=np.dstack([np.asarray(im).astype(np.uint8), alpha])
redlabel=(r>150)&(g<70)&(b<70)
fg=(alpha>0)&~redlabel
PORT_X=950

ROWS=[(53,116),(151,214),(267,324),(395,465),(543,607),(675,747),(803,866),(925,992),(1051,1113),(1385,1437),(1720,1798),(1997,2073),(2136,2206),(2265,2326),(3185,3245),(3300,3373)]
def frames_in(y0,y1):
    strip=fg[y0:y1,:PORT_X]; cc=strip.sum(axis=0); out=[];x=0
    while x<PORT_X:
        if cc[x]>0:
            x0=x;gap=0
            while x<PORT_X and (cc[x]>0 or gap<4):
                gap=0 if cc[x]>0 else gap+1; x+=1
            x1=x-gap
            if x1-x0>=8: out.append((x0,x1))
        else:x+=1
    return out
ROWFR=[frames_in(y0,y1) for (y0,y1) in ROWS]

def crop_frame(ri,fi):
    y0,y1=ROWS[ri]; x0,x1=ROWFR[ri][fi]
    sub=rgba[y0:y1,x0:x1].copy()
    m=(sub[:,:,3]>0)&~redlabel[y0:y1,x0:x1]
    sub[~m]=[0,0,0,0]
    if not m.any(): return None
    ys,xs=np.where(m); return sub[ys.min():ys.max()+1, xs.min():xs.max()+1]

MAP={
 "intro":(0,None),"idle":(1,None),"walk":(2,list(range(8))),"run":(2,None),"dash":(2,[4]),
 "jump":(3,None),"fall":(3,[3]),"guard":(4,[0,3,6]),"crouch":(3,[0]),"hurt":(14,[0]),
 "knockdown":(14,[0,1,2]),"light":(6,[0,1,2]),"heavy":(13,[0,1,2]),"up":(7,[0,1,2]),
 "air":(9,None),"down_air":(12,[0,1,2,3]),"crouchLight":(6,[0,1,2]),"win":(15,[0,1,2]),"lose":(14,[3,4]),
 "vilgaxBlastCast":(10,[0,1,2,3]),"vilgaxBlastXCast":(11,[0,1,2,3]),"vilgaxSlash":(7,[0,1,2,3]),
 "vilgaxThrow":(7,[0,1,2]),"vilgaxTumble":(14,None),"vilgaxVanish":(9,[0,3]),"vilgaxUltAction":(5,None),
}
OUT={
 "intro":"intro","idle":"idle","walk":"walk","run":"run","dash":"dash","jump":"jump","fall":"fall",
 "guard":"guard","crouch":"crouch","hurt":"hurt","knockdown":"knockdown","light":"light","heavy":"heavy",
 "up":"up","air":"air","down_air":"down_air","crouchLight":"crouchlight","win":"win","lose":"lose",
 "vilgaxBlastCast":"blastcast","vilgaxBlastXCast":"blastxcast","vilgaxSlash":"slash","vilgaxThrow":"throw",
 "vilgaxTumble":"tumble","vilgaxVanish":"vanish","vilgaxUltAction":"ultaction",
}
PAD=3; summary={}
montage_rows=[]
for act,(ri,idxs) in MAP.items():
    fr=ROWFR[ri]; sel=range(len(fr)) if idxs is None else idxs
    crops=[crop_frame(ri,i) for i in sel]; crops=[c for c in crops if c is not None]
    if not crops: continue
    cw=max(c.shape[1] for c in crops)+2*PAD; ch=max(c.shape[0] for c in crops)+2*PAD
    strip=np.zeros((ch, cw*len(crops),4),np.uint8)
    for i,c in enumerate(crops):
        h,w=c.shape[:2]; px=i*cw+(cw-w)//2; py=ch-h-PAD
        strip[py:py+h, px:px+w]=c
    Image.fromarray(strip,"RGBA").save(f"vilgax_{OUT[act]}_uniform.png")
    summary[act]={"frames":len(crops),"width":cw,"height":ch,"sheet":f"./vilgax_{OUT[act]}_uniform.png"}
    montage_rows.append((act,strip))
import json as _j;_j.dump(summary,open("vilgax_work/_summary_clean.json","w"))
print(json.dumps(summary,indent=0))
# QA montage (scaled up 1x on dark bg)
MW=max(s.shape[1] for _,s in montage_rows); MH=sum(s.shape[0]+16 for _,s in montage_rows)
mont=Image.new("RGBA",(MW+10,MH),(30,30,40,255)); yy=4
from PIL import ImageDraw; dd=ImageDraw.Draw(mont)
for act,s in montage_rows:
    img=Image.fromarray(s,"RGBA"); mont.alpha_composite(img,(6,yy)); dd.text((6,yy),act,fill=(255,255,0,255)); yy+=s.shape[0]+16
mont.save("vilgax_work/_qa_montage.png")
print("QA montage -> vilgax_work/_qa_montage.png")
