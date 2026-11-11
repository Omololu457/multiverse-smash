from pathlib import Path
import json,shutil,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2]
D=R/'docs/ben10/aliens/swampfire';D.mkdir(parents=True,exist_ok=True)
S=R/'assets/sprites/ben10/aliens/swampfire.png'
g=json.loads((D/'source_grid.json').read_text())
a=np.array(Image.open(S).convert('RGBA'));bg=np.zeros(a.shape[:2],bool)
for c in g['bg_colors']:bg|=np.all(a[:,:,:3]==c,axis=2)
a[bg]=(0,0,0,0)
used={f'{ri}.{it["c"]}':[] for ri,row in enumerate(g['rows'])for it in row['items']}
def ids(row,*cols):return [f'{row}.{i}' for i in (cols or range(len(g['rows'][row]['items'])))]
# Every action maps to Swampfire himself. Neutral walk reuses a measured restrained run.
profiles={
'idle':(ids(25),7,True),'walk':(ids(27,0,1,2,6,7,8),7,True),'run':(ids(27),4,True),'dash':(ids(27),3,True),
'jump':(ids(26,0,1,2,3,4),4,False),'fall':(ids(26,15,16),5,True),'crouch':(ids(18),5,False),
'light':(ids(0),3,False),'heavy':(ids(2),4,False),'up':(ids(1),3,False),'air':(ids(8),3,False),'down_air':(ids(14),4,False),
'guard':(ids(24),5,False),'hurt':(ids(20),4,False),'knockdown':(ids(21)+ids(22),4,False),'getup':(ids(23,5,6,7,8,9,10,11,18,19,20),3,False),
'roll':(ids(23,12,13,14,15,16,17,18,19),2,False),'transform':(ids(15)+ids(16,0,1,2),5,False),
'intro':(ids(15)+ids(16),5,False),'win':(ids(16)+ids(17),6,False),'lose':(ids(22,2,3,4,5),6,False),'taunt':(ids(28),5,False),
'grab':(ids(28,0,1,2,3),4,False),'sfFlameJet':(ids(7),4,False),'sfVine':(ids(5,0,1,2,3,10,11,12),4,False),
'sfBlaze':(ids(12)+ids(10),3,False),'sfInferno':(ids(4),5,False),
'benJab1':(ids(0,0,1,2),3,False),'benJab2':(ids(0,3,4,5),3,False),
}
# FX rows contain no fighter body. Vine eruptions split the right-side leaf from its crouching owner.
fx={'flame':ids(6),'eruption':ids(3),'explosion':ids(19),'patch':ids(13),'ember':ids(11),'jetTrail':ids(9),'vine':ids(5,4,5,6,7,8,9),'wisp':ids(29,20,21,22,23,24,25,26,27,28)}
def cut(key,kind=None):
 ri,ci=map(int,key.split('.'));it=g['rows'][ri]['items'][ci];im=Image.fromarray(a[it['y0']:it['y1'],it['x0']:it['x1']])
 if kind=='vine':im=im.crop((min(52,im.width-1),0,im.width,im.height))
 if kind=='wisp':im=im.crop((0,0,im.width,max(1,im.height-66)))
 box=im.getbbox();return im.crop(box)if box else Image.new('RGBA',(1,1))
anim={};effects={}
for action,(keys,speed,loop)in profiles.items():
 w,h=160,112;strip=Image.new('RGBA',(w*len(keys),h))
 for i,key in enumerate(keys):
  im=cut(key);arr=np.array(im);green=(arr[:,:,1]>arr[:,:,0]*1.2)&(arr[:,:,1]>arr[:,:,2])&(arr[:,:,3]>0)
  yy,xx=np.where(green & (np.indices(green.shape)[0]>=max(0,im.height-18)))
  anchor=float(np.mean(xx))if len(xx)else im.width/2
  x=round(w/2-anchor);y=h-im.height
  if x<0 or x+im.width>w or y<0:raise ValueError('clipped body '+action+' '+key)
  strip.alpha_composite(im,(i*w+x,y));used[key].append(action)
 name=f'ben10_swampfire_{action}_uniform.png';strip.save(R/name,optimize=True)
 anim[action]={'sheet':'./'+name,'frames':len(keys),'width':w,'height':h,'speed':speed,'anchorY':0,'loop':loop,'lockLastFrame':not loop}
for action,keys in fx.items():
 ims=[cut(k,action)for k in keys];w=max(im.width for im in ims);h=max(im.height for im in ims);strip=Image.new('RGBA',(w*len(ims),h))
 for i,(key,im)in enumerate(zip(keys,ims)):strip.alpha_composite(im,(i*w+(w-im.width)//2,h-im.height));used[key].append('FX '+action+(' (retained alternative; not used by current kit)' if action=='ember' else ''))
 name=f'ben10_swampfire_fx_{action}.png';strip.save(R/name,optimize=True);effects[action]={'sheet':'./'+name,'frames':len(keys),'w':w,'h':h,'speed':3}
(R/'swampfireAssets.js').write_text('// Generated from the supplied Swampfire grid. See the frame ledger.\nexport const SWAMPFIRE_ANIM = '+json.dumps(anim,indent=2)+'\nexport const SWAMPFIRE_FX = '+json.dumps(effects,indent=2)+'\n')
# Compact labeled reference with all 250 original cells; zero-tolerance keying preserves palette.
try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',12)
except OSError:font=ImageFont.load_default()
W=1500;cv=Image.new('RGBA',(W,12000),(35,37,42,255));d=ImageDraw.Draw(cv);y=8
for ri,row in enumerate(g['rows']):
 x=8;lh=0
 for it in row['items']:
  key=f'{ri}.{it["c"]}';im=cut(key);im=im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST)
  if x+max(im.width,70)+12>W:x=8;y+=lh+25;lh=0
  cv.alpha_composite(im,(x,y));d.text((x,y+im.height+2),key,fill='yellow',font=font);x+=max(im.width,70)+12;lh=max(lh,im.height)
 y+=lh+28
cv.crop((0,0,W,y)).convert('RGB').save(D/'contact_sheet.png',optimize=True)
ledger=['# Swampfire sprite ledger','',f'Source: assets/sprites/ben10/aliens/swampfire.png ({a.shape[1]}x{a.shape[0]}).',f'SHA-256: {hashlib.sha256(S.read_bytes()).hexdigest()}','',
'30 row bands; 250 cells. Row.column IDs match source_grid.json and contact_sheet.png.',
'Exact key colors: teal (0,128,128), cyan (0,248,248), gold (240,184,48), magenta (248,0,248).',
'No tolerance, recoloring, smoothing or generated art. All scaling is nearest-neighbor.',
'Body strips use a 160x112 cell. Lower green-body centroid anchors x, feet anchor y.',
'Body proportions are unchanged. Walk intentionally reuses restrained running poses at a slower cadence.',
'Vine FX crops the separate right-hand growth from row 5; wisp isolates growth above the body in row 29.',
'Wisp and cloud/patch FX are cosmetic. Hitboxes are authored independently of sprite bounds.',
'Transform/victory reuse the actual emergence/standing sequence; defeat uses the supplied prone poses.',
'', '## Per-frame use or exclusion', '']
for ri,row in enumerate(g['rows']):
 for it in row['items']:
  key=f'{ri}.{it["c"]}';uses=', '.join(used[key])or'excluded: alternate/sustained source pose; no additional gameplay action needed'
  ledger.append(f'- {key}: {uses}.')
ledger+=['','## Runtime action definitions','']
for k,v in anim.items():ledger.append(f'- {k}: {v["frames"]} frames, {v["width"]}x{v["height"]}, {v["speed"]} ticks/frame, '+('loop.'if v['loop']else'one-shot/hold.'))
(D/'SPRITE_LEDGER.md').write_text('\n'.join(ledger)+'\n')
print('Packed',len(anim),'body states and',len(effects),'FX strips; all 250 cells documented; contact height',y)
