from PIL import Image, ImageDraw
import json
STRIPS={'idle':3,'jump':3,'fall':1,'hurt':2,'knockdown':1,'light':3,'heavy':4,'grab':4,
 'heatCharge':4,'ultSilhouette':1,'flyHover':4,'flyCruise':4,'flyRise':3,'flyDive':1,
 'flyTurn':2,'flyDash':2,'takeoff':1,'land':1}
def is_skin(p): return p[3]>60 and p[0]>200 and p[1]>130 and p[2]>105 and p[0]>=p[1]-6 and p[1]>=p[2]-6 and 18<(p[0]-p[2])<120
def is_fg(p): return p[3]>40
def detect(cell):
    w,h=cell.size; px=cell.load()
    top=None
    for y in range(h):
        if any(is_fg(px[x,y]) for x in range(w)): top=y; break
    if top is None: return None
    band=max(6,int(h*0.32)); hb=(top,min(h,top+band))
    sx=[];sy=[]
    for y in range(hb[0],hb[1]):
        for x in range(w):
            if is_skin(px[x,y]): sx.append(x);sy.append(y)
    if len(sx)>=4:
        mnx,mxx=min(sx),max(sx);mny,mxy=min(sy),max(sy)
        ex=mxx-0.30*(mxx-mnx); ey=mny+0.45*(mxy-mny)
    else:
        cols=[x for x in range(w) for y in range(hb[0],hb[1]) if is_fg(px[x,y])]
        if not cols: return None
        ex=min(cols)+0.6*(max(cols)-min(cols)); ey=hb[0]+0.5*(hb[1]-hb[0])
    return ex/w, ey/h
out={}; dbg=[]
for name,n in STRIPS.items():
    fn=f'homelander_{name}_uniform.png'
    import os
    if not os.path.exists(fn): print('MISSING',fn); continue
    im=Image.open(fn).convert('RGBA'); W,H=im.size; cw=W//n
    anchors=[]
    for i in range(n):
        cell=im.crop((i*cw,0,(i+1)*cw,H)); a=detect(cell)
        if a is None: a=(0.6,0.16)
        anchors.append([round(a[0],4),round(a[1],4)])
        d=ImageDraw.Draw(cell); ex,ey=a[0]*cw,a[1]*H
        d.ellipse([ex-3,ey-3,ex+3,ey+3],outline=(255,0,255,255),width=2)
        dbg.append((f"{name}{i}",cell))
    out[name]=anchors
pad=6;cols=6
cw=max(c.width for _,c in dbg)*2+pad;ch=max(c.height for _,c in dbg)*2+18
rows=(len(dbg)+cols-1)//cols
mon=Image.new('RGBA',(cw*cols,ch*rows),(60,60,72,255));dd=ImageDraw.Draw(mon)
for k,(lbl,c) in enumerate(dbg):
    c2=c.resize((c.width*2,c.height*2),Image.NEAREST);cx=(k%cols)*cw;cy=(k//cols)*ch
    mon.paste(c2,(cx+2,cy+16),c2);dd.text((cx+2,cy+2),lbl,fill=(255,255,120,255))
mon.save('homelander_work/_eye_debug.png')
json.dump(out,open('homelander_work/eye_anchors.json','w'))
print('done',{k:len(v) for k,v in out.items()})
