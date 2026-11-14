from PIL import Image
from collections import deque
SHEET='superman_jus_addons_by_planeptunearte_deaeqvi.png'
im=Image.open(SHEET).convert('RGBA'); W,H=im.size; px=im.load()
BG=(114,114,114); TOL=40
def isbg(p):
    return p[3]<=20 or (abs(p[0]-BG[0])<=TOL and abs(p[1]-BG[1])<=TOL and abs(p[2]-BG[2])<=TOL and abs(p[0]-p[1])<14 and abs(p[1]-p[2])<14)
fg=bytearray(W*H)
for y in range(H):
    for x in range(W):
        if not isbg(px[x,y]): fg[y*W+x]=1
lab=[-1]*(W*H); comps=[]
for sy in range(H):
    for sx in range(W):
        i=sy*W+sx
        if fg[i] and lab[i]<0:
            q=deque([i]); lab[i]=len(comps); mnx=mxx=sx; mny=mxy=sy; cnt=0
            while q:
                j=q.popleft(); cnt+=1; jy,jx=divmod(j,W)
                mnx=min(mnx,jx);mxx=max(mxx,jx);mny=min(mny,jy);mxy=max(mxy,jy)
                for dy in(-1,0,1):
                    for dx in(-1,0,1):
                        ny,nx=jy+dy,jx+dx
                        if 0<=nx<W and 0<=ny<H:
                            k=ny*W+nx
                            if fg[k] and lab[k]<0: lab[k]=lab[i]; q.append(k)
            comps.append([mnx,mny,mxx,mxy,cnt])
comps=[c for c in comps if c[4]>=80]
# group rows by y center
comps.sort(key=lambda c:c[1]); bands=[]
for c in comps:
    cy=(c[1]+c[3])/2; placed=False
    for b in bands:
        if b['y0']-15<=cy<=b['y1']+15:
            b['items'].append(c); b['y0']=min(b['y0'],c[1]); b['y1']=max(b['y1'],c[3]); placed=True; break
    if not placed: bands.append({'y0':c[1],'y1':c[3],'items':[c]})
bands.sort(key=lambda b:b['y0'])
rows=[sorted(b['items'],key=lambda c:c[0]) for b in bands]
print("rows frame counts:",[len(r) for r in rows])
# transparent crop of a source box (keyed)
def crop(box):
    x0,y0,x1,y1=box[0],box[1],box[2],box[3]
    sub=Image.new('RGBA',(x1-x0+1,y1-y0+1),(0,0,0,0)); sp=sub.load()
    for yy in range(y0,y1+1):
        for xx in range(x0,x1+1):
            p=px[xx,yy]
            if not isbg(p): sp[xx-x0,yy-y0]=p
    return sub
# build a strip: list of (row_idx, col_idx) 0-based; bottom-center align into uniform cell
def strip(name, cells, pad=2):
    imgs=[crop(rows[r][c]) for (r,c) in cells]
    cw=max(i.width for i in imgs)+pad*2; ch=max(i.height for i in imgs)+pad*2
    out=Image.new('RGBA',(cw*len(imgs),ch),(0,0,0,0))
    for k,img in enumerate(imgs):
        ox=k*cw+(cw-img.width)//2; oy=ch-pad-img.height  # bottom align
        out.paste(img,(ox,oy),img)
    out.save('./'+name)
    print(f"{name}: frames={len(imgs)} cell={cw}x{ch}")
    return cw,ch,len(imgs)
R=rows
# rows: 0=hover(3) 1=idle(1) 2=capebillow(2) 3=punch(3) 4=crouchsweep(3) 5=guard(3) 6=walk(4) 7=dive(1) 8=float(2) 9=run(4)
import json
meta={}
meta['idle']=strip('superman_idle_uniform.png',[(1,0),(5,0),(5,1),(5,2)])
meta['walk']=strip('superman_walk_uniform.png',[(6,0),(6,1),(6,2),(6,3)])
meta['run']=strip('superman_run_uniform.png',[(9,0),(9,1),(9,2),(9,3)])
meta['crouch']=strip('superman_crouch_uniform.png',[(4,0)])
meta['light']=strip('superman_light_uniform.png',[(3,0),(3,1)])
meta['heavy']=strip('superman_heavy_uniform.png',[(3,1),(3,2)])
meta['sweep']=strip('superman_sweep_uniform.png',[(4,1),(4,2)])
meta['uppercut']=strip('superman_uppercut_uniform.png',[(4,0),(3,2)])
meta['air']=strip('superman_air_uniform.png',[(3,1),(3,2)])
meta['flight']=strip('superman_flight_uniform.png',[(0,0),(0,1),(0,2)])
meta['flightdash']=strip('superman_flightdash_uniform.png',[(7,0)])
meta['flightrise']=strip('superman_flightrise_uniform.png',[(0,2),(8,0),(8,1)])
meta['jump']=strip('superman_jump_uniform.png',[(0,0),(0,1)])
meta['fall']=strip('superman_fall_uniform.png',[(8,0),(8,1)])
meta['land']=strip('superman_land_uniform.png',[(2,0),(2,1)])
meta['beam']=strip('superman_beam_uniform.png',[(5,1),(5,2),(2,1)])
meta['guard']=strip('superman_guard_uniform.png',[(5,0)])
meta['hurt']=strip('superman_hurt_uniform.png',[(2,0)])
meta['cardboard']=strip('superman_cardboard_uniform.png',[(5,0),(5,1),(5,2)])
# portrait: head crop of a clean standing frame (row5 col0 guard/ready)
pbox=R[5][0]; pim=crop(pbox)
# square pad
s=max(pim.width,pim.height)+4; port=Image.new('RGBA',(s,s),(0,0,0,0))
port.paste(pim,((s-pim.width)//2,(s-pim.height)//2),pim); port.save('./superman_portrait.png')
print('portrait',port.size)
json.dump(meta,open('superman_work/strip_meta.json','w'),indent=1)
