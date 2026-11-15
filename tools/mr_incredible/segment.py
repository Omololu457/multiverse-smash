from PIL import Image,ImageDraw
import numpy as np,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BANDS={'veteran':[(34,100),(114,174),(177,231),(245,318),(320,359),(363,415),(418,473),(478,534),(539,596),(615,687),(710,783),(785,837),(839,894),(896,964),(969,1029),(1044,1119),(1124,1177),(1190,1268),(1280,1334),(1338,1401),(1406,1464),(1467,1532),(1535,1590),(1591,1653)],'prime':[(4,74),(81,149),(159,215),(222,280),(307,378),(382,454),(466,529),(560,631),(650,738),(758,833)]}
ALL={}
for form,bands in BANDS.items():
 src=ROOT/f'Game Boy Advance - The Incredibles - Playable Characters - Mr. Incredible ({"Red Suit" if form=="veteran" else "Young"}).png'
 a=np.array(Image.open(src).convert('RGBA'));bg=(173,214,214) if form=='veteran' else (255,0,255)
 a[np.all(a[:,:,:3]==bg,axis=2),3]=0
 if form=='veteran':a[np.all(a[:,:,:3]==(255,0,0),axis=2),3]=0
 rows=[]; groups=[]
 for ri,(top,bot) in enumerate(bands):
  m=a[top:bot,:,3]>0
  if ri==0: m[:,(400 if form=='veteran' else 1530):]=False
  xs=np.where(m.any(axis=0))[0]; runs=[]
  for x in xs:
   if not runs or x-runs[-1][-1]>3:runs.append([int(x)])
   else:runs[-1].append(int(x))
  rr=[]
  for run in runs:
   l,r=run[0],run[-1]+1; ys,xx=np.where(m[:,l:r]);
   if len(ys)<45:continue
   rect=[l,top+int(ys.min()),r,top+int(ys.max())+1];rr.append(rect)
  groups.append(rr)
  canvas=Image.new('RGBA',(1900,180),(40,45,55,255));d=ImageDraw.Draw(canvas)
  for j,rect in enumerate(rr):
   im=Image.fromarray(a).crop(rect);im.thumbnail((115,135)); x=j*125
   canvas.alpha_composite(im.resize((im.width*2,im.height*2)) if im.height<65 and im.width<55 else im,(x,30)); d.text((x,5),f'{ri}:{j}',fill='white')
  rows.append(canvas)
 out=Image.new('RGBA',(1900,180*len(rows)))
 for i,r in enumerate(rows):out.paste(r,(0,i*180))
 out.save(ROOT/f'docs/mr_incredible/inspect_{form}.png');ALL[form]=groups
Image.fromarray(a).save('/tmp/mr_young_clean.png')
(ROOT/'docs/mr_incredible/segments.json').write_text(json.dumps(ALL,indent=2))
