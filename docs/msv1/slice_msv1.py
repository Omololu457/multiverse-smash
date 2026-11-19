import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
BG=np.array([82,144,118])
ROWS=[(8,62),(62,117),(133,176),(205,255),(279,330),(340,408),(424,490),(513,582),(593,642),(667,725),(736,801),(823,866),(882,952),(977,1054),(1068,1136),(1144,1235),(1259,1296),(1319,1367),(1384,1490),(1493,1568),(1569,1617),(1632,1685),(1691,1799),(1811,1934),(1952,2003),(2020,2072),(2086,2139)]
CUTS={18:[55,115,178,215,348,460,570,680,790,900],22:[70,178,297,420,540,650],23:[145,262,365,470]}
ANCH=int(sys.argv[1]); ATT=int(sys.argv[2])
def frames(f):
  a=np.array(Image.open(f'assets/incoming/msv1/{f}.png').convert('RGB')).astype(int)
  m=(np.abs(a-BG).sum(2)>0)
  res=[]
  for ri,(y0,y1) in enumerate(ROWS):
    sub=m[y0:y1].copy()
    if ri in CUTS:
      dens=sub.sum(0); cuts=[]
      for c in CUTS[ri]:
        lo,hi=c-12,c+12; cuts.append(lo+int(np.argmin(dens[lo:hi])))
      edges=[0]+cuts+[sub.shape[1]]; fr=[]
      for xa,xb in zip(edges,edges[1:]):
        blk=sub[:,xa:xb]
        if not blk.any(): continue
        xs=np.where(blk.any(0))[0]; ys=np.where(blk.any(1))[0]
        fr.append([int(xa+xs[0]),int(y0+ys[0]),int(xs[-1]-xs[0]+1),int(ys[-1]-ys[0]+1),int(blk.sum())])
      res.append(fr); continue
    if ri<2: sub[:,800:]=False
    lab,n=nd.label(sub,structure=np.ones((3,3)))
    objs=nd.find_objects(lab); cnt=nd.sum(sub,lab,range(1,n+1))
    comps=[dict(x0=o[1].start,x1=o[1].stop,y0=o[0].start,y1=o[0].stop,n=int(c),ids=[i+1]) for i,(o,c) in enumerate(zip(objs,cnt))]
    big=[c for c in comps if c['n']>=ANCH]; small=[c for c in comps if c['n']<ANCH]
    # merge big comps that overlap horizontally substantially
    big.sort(key=lambda c:c['x0']); merged=[]
    for c in big:
      if merged:
        p=merged[-1]; ov=min(p['x1'],c['x1'])-max(p['x0'],c['x0'])
        if ov>0.5*min(p['x1']-p['x0'],c['x1']-c['x0']):
          for k in('x0','y0'):p[k]=min(p[k],c[k])
          for k in('x1','y1'):p[k]=max(p[k],c[k])
          p['n']+=c['n'];p['ids']+=c['ids'];continue
      merged.append(dict(c))
    orphans=[]
    for c in small:
      cx=(c['x0']+c['x1'])/2; best=None;bd=1e9
      for p in merged:
        d=0 if p['x0']<=cx<=p['x1'] else min(abs(cx-p['x0']),abs(cx-p['x1']))
        if d<bd: bd=d;best=p
      if best is not None and bd<=ATT:
        for k in('x0','y0'):best[k]=min(best[k],c[k])
        for k in('x1','y1'):best[k]=max(best[k],c[k])
        best['n']+=c['n'];best['ids']+=c['ids']
      else: orphans.append(c)
    # orphans: cluster by gap 6
    orphans.sort(key=lambda c:c['x0']); oc=[]
    for c in orphans:
      if oc and c['x0']-oc[-1]['x1']<=6:
        p=oc[-1]
        for k in('x0','y0'):p[k]=min(p[k],c[k])
        for k in('x1','y1'):p[k]=max(p[k],c[k])
        p['n']+=c['n'];p['ids']+=c['ids']
      else: oc.append(dict(c))
    if ri!=20:
      keep=[]
      for c in oc:
        if c['n']<60 and merged:
          cx=(c['x0']+c['x1'])/2
          best=min(merged,key=lambda p:0 if p['x0']<=cx<=p['x1'] else min(abs(cx-p['x0']),abs(cx-p['x1'])))
          d=0 if best['x0']<=cx<=best['x1'] else min(abs(cx-best['x0']),abs(cx-best['x1']))
          if d<=45:
            for k in('x0','y0'):best[k]=min(best[k],c[k])
            for k in('x1','y1'):best[k]=max(best[k],c[k])
            best['n']+=c['n'];best['ids']+=c['ids'];continue
        keep.append(c)
      oc=keep
    fr=sorted(merged+oc,key=lambda c:c['x0'])
    res.append([[int(c['x0']),int(y0+c['y0']),int(c['x1']-c['x0']),int(c['y1']-c['y0']),int(c['n'])] for c in fr])
  return a,m,res
out={}
for f in ['red_shane','yellow_dustin']:
  a,m,res=frames(f); out[f]=res
  im=Image.open(f'assets/incoming/msv1/{f}.png').convert('RGB'); d=ImageDraw.Draw(im)
  for ri,fr in enumerate(res):
    for i,(x,y,w,h,n) in enumerate(fr):
      d.rectangle([x-1,y-1,x+w,y+h],outline=(255,255,255)); d.text((x,y-9 if y>9 else y),str(i),fill=(255,255,0))
  im.save(f'{sys.argv[3]}/boxes_{f}.png')
json.dump(out,open(f'{sys.argv[3]}/cc.json','w'))
for ri in range(len(ROWS)):
  r=out['red_shane'][ri]; yv=out['yellow_dustin'][ri]
  same=[ (a[:4]==b[:4]) for a,b in zip(r,yv)]
  print(f'R{ri+1}: red {len(r)} yel {len(yv)} bboxSame {sum(same)}/{len(same)} w',[w for _,_,w,_,_ in r])
