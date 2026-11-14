#!/usr/bin/env python3
"""Read-only source; exact verified cell colors/regions, never blue tolerance."""
from pathlib import Path
from collections import deque
import hashlib,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];DOC=ROOT/'docs/spd_blue';OUT=ROOT/'assets/spd_blue'
SRC=ROOT/'Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Power Rangers - Blue Ranger.png'
BG=(123,177,255);OUTER=(12,76,168)
def main():
 b=json.loads((DOC/'BASELINE.json').read_text());assert hashlib.sha256(SRC.read_bytes()).hexdigest()==b['sourceSha256']
 src=Image.open(SRC);assert src.size==(727,1160) and src.mode=='RGB';assert src.getpixel((0,0))==OUTER
 cells=[]
 def add(n,x,y,w,h,ax=None,ay=None,kind='body'):cells.append(dict(name=n,rect=[x,y,w,h],anchor=[w//2 if ax is None else ax,h if ay is None else ay],kind=kind))
 for i,x in enumerate([48,88]):add('idle'+str(i),x,8,32,56,16)
 for i in range(8):add('run'+str(i),48+i*56,72,48,56,24)
 add('lowered',48,136,32,56,16)
 for i,x in enumerate([48,96]):add('jump'+str(i),x,200,40,64,16)
 add('guard',48,272,32,48,16)
 for i in range(5):add('fall'+str(i),48+i*64,328,56,48,28)
 for i,x in enumerate([48,104]):add('jab'+str(i),x,384,48,56,22)
 for i,x in enumerate([48,104]):add('low'+str(i),x,448,48,56,22)
 for i,x in enumerate([48,96,144]):add('rise'+str(i),x,512,40,64,20)
 for i,x in enumerate([48,120]):add('kick'+str(i),x,648,64,64,26)
 add('spin',48,720,48,48,24)
 for i,x in enumerate([48,120,192]):add('baton'+str(i),x,776,64,56,26)
 for i,x in enumerate([48,112,176]):add('aim'+str(i),x,840,56,56,20)
 add('airAim',48,904,48,64,16)
 for i,x in enumerate([48,128,208]):add('fire'+str(i),x,976,72,56,20)
 add('phase0',48,1040,40,56,20,kind='effect');add('phase1',96,1040,48,64,24,kind='effect')
 for i,x in enumerate([48,128,208]):add('beam'+str(i),x,1120,72,24,0,12,kind='effect')
 (OUT/'cells').mkdir(parents=True,exist_ok=True);frames={}
 for c in cells:
  x,y,w,h=c['rect'];im=src.crop((x,y,x+w,y+h)).convert('RGBA');seen=set();regions=[]
  for py in range(h):
   for px in range(w):
    rgb=im.getpixel((px,py))[:3]
    if (px,py) in seen or rgb not in [BG,OUTER]:continue
    q=deque([(px,py)]);seen.add((px,py));count=0
    while q:
     a,d=q.popleft();count+=1;im.putpixel((a,d),(0,0,0,0))
     for z in [(a-1,d),(a+1,d),(a,d-1),(a,d+1)]:
      if 0<=z[0]<w and 0<=z[1]<h and z not in seen and im.getpixel(z)[:3]==rgb:seen.add(z);q.append(z)
    regions.append(dict(seed=[px,py],rgb=rgb,pixels=count))
  c['backgroundRegions']=regions;c['bbox']=im.getbbox();c['opaquePixels']=sum(p[3]>0 for p in im.getdata());frames[c['name']]=im;im.save(OUT/'cells'/f"{c['name']}.png")
 seq={'idle':['idle0','idle1'],'walk':[f'run{i}'for i in range(8)],'run':[f'run{i}'for i in range(8)],'walk_back':[f'run{i}'for i in range(7,-1,-1)],'dash':['baton0'],
 'jump':['jump0','jump1'],'fall':['jump1'],'crouch':['lowered'],'guard':['guard'],'hurt':['fall0'],'knockdown':['fall0','fall1','fall2','fall3'],'getup':['fall3','fall4','idle0'],
 'light':['jab0','jab1'],'bJ2':['baton1'],'bJ3':['baton1','baton2'],'heavy':['baton1','baton2'],'bLow':['low0','low1'],'up':['rise0','rise1'],'air':['kick0','kick1'],'down_air':['kick1'],
 'bAdvance':['low0','low1'],'bChain':['baton1','baton2'],'bAway':['baton1','baton2'],'bShot':['aim0','aim1','aim2'],'bPursuit':['baton0','baton1','baton2'],'bRise':['rise0','rise1','kick1'],'bBarrier':['guard'],'bAirShot':['airAim'],'ultimate':['rise0','rise1'],'grab':['jab0','jab1'],'win':['idle0','idle1']}
 anim={};by={c['name']:c for c in cells}
 for action,names in seq.items():
  strip=Image.new('RGBA',(144*len(names),96))
  for i,n in enumerate(names):ax,ay=by[n]['anchor'];strip.paste(frames[n],(144*i+64-ax,84-ay))
  strip.save(OUT/f'{action}.png');anim[action]={'sheet':f'./assets/spd_blue/{action}.png','frames':len(names),'width':144,'height':96,'anchorY':0,'loop':action in ['idle','walk','run','walk_back'],'lockLastFrame':True,'originX':64,'originY':84,'speed':8,'frameWidth':144,'frameHeight':96}
 # Same descriptor vocabulary as existing spritesheets.
 example=json.loads('{}')
 (ROOT/'spdBlueSprites.js').write_text('export const SPD_BLUE_ANIM = '+json.dumps(anim,indent=2)+'\n')
 frames['idle0'].crop((5,0,29,25)).resize((96,100),Image.Resampling.NEAREST).save(OUT/'portrait.png')
 # Strip 1 is the narrow supplied beam, not a body graphic.
 beam=frames['beam1'];beam.crop(beam.getbbox()).save(OUT/'shot.png')
 meta={'source':SRC.name,'sha256':b['sourceSha256'],'size':list(src.size),'mode':src.mode,'outerBackground':OUTER,'cellBackground':BG,'credit':'The FRANKETE (for TSR)','creditPanel':[620,18,107,122],'inputLabels':[0,80,40,970],'unused':['empty band y576–647','isolated pink annotation at x459–471,y776–777'],'frames':cells,'sequences':seq}
 (DOC/'source_rects.json').write_text(json.dumps(meta,indent=2)+'\n')
 contact=Image.new('RGB',(6*220,((len(cells)+5)//6)*245),(38,43,54));d=ImageDraw.Draw(contact)
 for i,c in enumerate(cells):x=i%6*220;y=i//6*245;d.text((x+4,y+4),c['name']+' '+str(c['rect']),fill='white');im=frames[c['name']];im=im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST);contact.paste(im,(x+4,y+28),im)
 contact.save(DOC/'contact_sheet.png');print('Extracted',len(cells),'verified cells;',len(seq),'body actions; source',meta['sha256'])
if __name__=='__main__':main()
