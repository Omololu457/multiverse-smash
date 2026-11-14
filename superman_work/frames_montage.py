from PIL import Image, ImageDraw
from collections import deque
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
def crop(b):
  sub=Image.new('RGBA',(b[2]-b[0]+1,b[3]-b[1]+1),(0,0,0,0)); sp=sub.load()
  for yy in range(b[1],b[3]+1):
    for xx in range(b[0],b[2]+1):
      p=px[xx,yy]
      if not isbg(p): sp[xx-b[0],yy-b[1]]=p
  return sub
SC=2; cellW=160; cellH=170
out=Image.new('RGBA',(cellW*4, cellH*len(rows)),(50,50,60,255)); d=ImageDraw.Draw(out)
for r,row in enumerate(rows):
  for ci,b in enumerate(row):
    img=crop(b).resize(((b[2]-b[0]+1)*SC,(b[3]-b[1]+1)*SC),Image.NEAREST)
    ox=ci*cellW+(cellW-img.width)//2; oy=r*cellH+(cellH-img.height)-14
    out.paste(img,(ox,oy),img)
    d.text((ci*cellW+4, r*cellH+4), f"R{r+1}.{ci}", fill=(255,255,120,255))
out.save('superman_work/_frames_all.png'); print('rows',[len(r) for r in rows],'->',out.size)
