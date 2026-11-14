from PIL import Image
from collections import deque
import json
SHEET='superman_jus_addons_by_planeptunearte_deaeqvi.png'
im=Image.open(SHEET).convert('RGBA'); W,H=im.size; px=im.load()
BG=(114,114,114); TOL=40
def isbg(p): return p[3]<=20 or (abs(p[0]-BG[0])<=TOL and abs(p[1]-BG[1])<=TOL and abs(p[2]-BG[2])<=TOL and abs(p[0]-p[1])<14 and abs(p[1]-p[2])<14)
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
comps=[c for c in comps if c[4]>=80]; comps.sort(key=lambda c:c[1]); bands=[]
for c in comps:
  cy=(c[1]+c[3])/2; placed=False
  for b in bands:
    if b['y0']-15<=cy<=b['y1']+15: b['items'].append(c); b['y0']=min(b['y0'],c[1]); b['y1']=max(b['y1'],c[3]); placed=True; break
  if not placed: bands.append({'y0':c[1],'y1':c[3],'items':[c]})
bands.sort(key=lambda b:b['y0'])
rows=[sorted(b['items'],key=lambda c:c[0]) for b in bands]

def frame_img(b):
  sub=Image.new('RGBA',(b[2]-b[0]+1,b[3]-b[1]+1),(0,0,0,0)); sp=sub.load()
  cols=[0]*(b[2]-b[0]+1)
  for yy in range(b[1],b[3]+1):
    for xx in range(b[0],b[2]+1):
      p=px[xx,yy]
      if not isbg(p): sp[xx-b[0],yy-b[1]]=p; cols[xx-b[0]]+=1
  # BODY ANCHOR = densest torso column (cape is thinner → won't dominate).
  # Use a smoothed window to find the center of the densest 5-col band.
  best=0; bestx=len(cols)//2
  for x in range(len(cols)):
    s=sum(cols[max(0,x-2):x+3])
    if s>best: best=s; bestx=x
  return sub, bestx   # anchor x within the crop

def build(name, cells, pad=3):
  imgs=[]; anchors=[]
  for (r,c) in cells:
    img,ax=frame_img(rows[r][c]); imgs.append(img); anchors.append(ax)
  # cell width: anchor centered, fits widest left + widest right extent
  maxL=max(ax for ax in anchors)
  maxR=max(img.width-ax for img,ax in zip(imgs,anchors))
  cw=maxL+maxR+pad*2
  anchorX=maxL+pad
  ch=max(i.height for i in imgs)+pad*2
  out=Image.new('RGBA',(cw*len(imgs),ch),(0,0,0,0))
  for k,(img,ax) in enumerate(zip(imgs,anchors)):
    ox=k*cw+anchorX-ax
    oy=ch-pad-img.height   # bottom align
    out.paste(img,(ox,oy),img)
  out.save('./'+name); print(f"{name}: {len(imgs)}f cell={cw}x{ch}")
  return cw,ch,len(imgs)

meta={}
meta['idle']=build('superman_idle_uniform.png',[(2,0),(5,0),(4,0)])      # R3.0 cape-down, R6.0 stance, R5.0 cape-spread → standing cape-sway
meta['walk']=build('superman_walk_uniform.png',[(6,0),(6,1),(6,2)])      # R7.0,R7.1,R7.2 forward advance (drop turned-away R7.3)
meta['flycruise']=build('superman_flycruise_uniform.png',[(1,0),(9,1),(9,3)]) # R2.0 glide, R10.1 streaming, R10.3 forward
json.dump(meta,open('superman_work/fix_meta.json','w'),indent=1); print(json.dumps(meta))
