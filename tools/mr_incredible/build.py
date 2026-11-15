"""Reproducible exact-key extraction and controlled costume edits; originals read-only.
No generative art, new anatomy, interpolation, or runtime recolouring.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,hashlib
ROOT=Path(__file__).resolve().parents[2];DOC=ROOT/'docs/mr_incredible';OUT=ROOT/'assets/mr_incredible'
S=json.loads((DOC/'segments.json').read_text())
def refs(row,ids):return [(row,i) for i in ids]
V={
'idle':refs(0,list(range(5))+[5,6]*4+[7,8,9]),'walk':refs(1,range(8)),'run':refs(2,range(6)),'dash':refs(2,range(6,15)),
'jump':refs(3,range(6)),'fall':refs(3,range(6,10)),'doubleJump':refs(4,range(5)),
'light':refs(5,range(4)),'miLight2':refs(7,range(6)),'miFinish':refs(9,range(8)),
'heavy':refs(10,range(8)),'miLow':refs(9,[0,1,2,1]),'up':refs(18,range(5)),
'air':refs(11,range(6)),'down_air':refs(14,range(8)),
'miForward':refs(8,range(6)),'miDownHeavy':refs(9,[0,1,2,3,4]),
'miImpact':refs(6,range(4)),'miRush':refs(2,range(6)),
'miRise':refs(20,range(4)),'miSlam':refs(13,range(13)),
'miSpin':refs(12,[0,1,2,4,5,6]),'miLift':refs(21,range(4)),
'guard':refs(13,[0,1]),'crouch':refs(13,[12]),'land':refs(13,[11,12]),
'hurt':refs(22,[1,2,3]),'hurt_air':refs(23,[1]),'knockdown':refs(22,range(4,11)),
'getup':refs(22,range(11,15)),'lose':refs(23,range(5,15)),
'intro':refs(0,range(10)),'win':refs(23,[1,2,3,4]),'charge':refs(13,[2,3,4]),'miTransform':refs(13,[0,1,2,3,4]),
'grab':refs(21,range(4)),
# Authored alternate attack/landing effects: available for presentation/review.
'miRoll':refs(16,range(9)),'miRollFlash':refs(17,[0,1,4,5,6,7,8,9]),'miSlamFlash':refs(15,[0,1,3,4,5,7,8]),
'miSpinGround':refs(19,range(5)),'miSilhouette':refs(22,[0])+refs(23,[0]),'miShadow':refs(3,range(10,14)),'miArc':refs(12,[3]),'miRecovery':refs(21,range(4)),'miDefeatAir':refs(22,[4,5,6,7]),'miSlamAlt':refs(15,[0,1,3,4,5,7,8]),'miBurst':refs(15,[2,6])+refs(17,[2,3])}
P={
'idle':refs(0,range(7)),'walk':refs(0,range(7,15)),'run':refs(0,range(15,21)),'dash':refs(0,range(21,30)),
'jump':refs(1,[0,1,2,3,4,5]),'fall':refs(1,range(6,12)),'doubleJump':refs(1,range(12,17)),
'light':refs(4,range(4)),'miLight2':refs(4,range(4,10)),'miFinish':refs(4,range(10,18)),
'heavy':refs(7,range(8)),'miLow':refs(4,[10,11,12,11]),'up':refs(5,range(19,24)),
'air':refs(5,range(6)),'down_air':refs(6,range(9)),
'miForward':refs(7,[8,9,10,12,13,14]),'miDownHeavy':refs(4,[10,11,12,13,14]),
'miImpact':refs(7,range(15,19)),'miRush':refs(0,range(15,21)),
'miRise':refs(1,range(22,27)),'miSlam':refs(5,range(6,19)),
'miSpin':refs(8,[0,1,2,3,4,5]),'miLift':refs(1,range(17,22)),
'guard':refs(5,[6,7]),'crouch':refs(5,[18]),'land':refs(5,[17,18]),
'hurt':refs(2,list(range(7))),'hurt_air':refs(3,[0]),'knockdown':refs(2,range(7,14)),
'getup':refs(2,range(14,18)),'lose':refs(3,range(4,13)),
'intro':refs(0,range(7)),'win':refs(3,[0,1,2,3]),'charge':refs(5,[8,9,10]),'miTransform':refs(5,[6,7,8,9,10]),
'grab':refs(1,range(17,22)),
'miRoll':refs(6,range(9,19)),'miRollFlash':refs(9,[10,11,12,15,16,17,18,19,20]),'miSlamFlash':refs(9,[0,1,2,4,5,6,8,9]),
'miSpinGround':refs(8,range(20,25)),'miSilhouette':refs(8,[11,12]),'miShadow':refs(0,[7]),'miArc':refs(7,[11]),'miRecovery':refs(2,range(18,24)),'miDefeatAir':refs(3,[13,14]),'miSlamAlt':refs(8,[6,7,8,9,10,13,15,17,18,19]),'miBurst':refs(8,[11,12,14,16])+refs(9,[3,7,13,14])}
SKINS=[('default','Default',None,None,None),('modern','PRIME / MODERN','#176477','#343e48',None),('cosmic','ALIEN X / COSMIC STRENGTH','#181b2a','#d6e0ec',None),('superman',"SUPERMAN / TOMORROW’S STRONGEST",'#245aaa','#b62d39','#30282a'),('upgrade','UPGRADE / POWER CIRCUIT','#202a29','#68df65',None),('diamondhead','DIAMONDHEAD / CRYSTAL TITAN','#66bba9','#cbf5db',None),('heatblast','HEATBLAST / FURNACE FISTS','#59332e','#ee9d35',None),('cursed_rose','JJK / CURSED ROSE','#33313f','#94354e','#ec83a5'),('infinity_blue','JJK / INFINITY BLUE','#252f50','#68cddd','#e5e9ed'),('valkyrie','WINNING VALKYRIE / VICTORY FORCE','#304aaf','#d2dce6',None),('golden_age','OBSIDIAN GOLD / GOLDEN AGE','#242634','#bc9b59',None)]
def rgb(h):return np.array(tuple(bytes.fromhex(h[1:])))
metadata={};ledger={};waistlog=[];paletteAudit={}
for form,actions,bg in [('veteran',V,(173,214,214)),('prime',P,(255,0,255))]:
 src=ROOT/f'Game Boy Advance - The Incredibles - Playable Characters - Mr. Incredible ({"Red Suit" if form=="veteran" else "Young"}).png'
 a=np.array(Image.open(src).convert('RGBA'));a[np.all(a[:,:,:3]==bg,axis=2),3]=0
 if form=='veteran':a[np.all(a[:,:,:3]==(255,0,0),axis=2),3]=0
 metadata[form]={};ledger[form]={'source':src.name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'dimensions':[a.shape[1],a.shape[0]],'background':list(bg),'actions':{}}
 # Exact palette region classes keep skin, hair and black linework distinct.
 if form=='veteran':
  suit=lambda c:c[0]>c[1]*2 and c[0]>c[2]*1.5
  trim=lambda c:(c[0]>130 and c[1]>100 and c[2]<65) or c==(0,56,112)
 else:
  suit=lambda c:c in [(156,189,214),(115,132,165),(82,99,132)]
  trim=lambda c:c in [(25,107,115),(16,74,82),(49,132,140),(0,58,123)]
 hair=lambda c:c[0]>160 and c[1]>140 and c[2]<100
 paletteAudit[form]=[]
 for tag,name,main,accent,haircol in SKINS:
  dest=OUT/tag/form;dest.mkdir(parents=True,exist_ok=True)
  recol=a.copy();region=np.zeros(a.shape[:2],dtype=np.uint8)
  colors=np.unique(a[a[:,:,3]>0,:3],axis=0)
  for cc in colors:
   c=tuple(map(int,cc));mask=np.all(a[:,:,:3]==c,axis=2)&(a[:,:,3]>0)
   role=1 if suit(c) else 2 if trim(c) else 3 if hair(c) else 0
   region[mask]=role
   if tag=='default':paletteAudit[form].append({'rgb':list(c),'role':{0:'preserved skin / ink / effect',1:'main fabric',2:'costume trim',3:'hair'}[role],'count':int(mask.sum())})
   if main and role in (1,2):
    base=rgb(('#b92b40' if tag=='modern' and form=='veteran' else main) if role==1 else accent)
    lum=max(.46,min(1.25,(sum(c)/3)/ (150 if form=='prime' and role==1 else 95)))
    recol[mask,:3]=np.clip(base*lum,0,255).astype(np.uint8)
   if haircol and role==3:recol[mask,:3]=rgb(haircol)
  # Source black is linework AND fabric. Fill only enclosed fabric away from contour/face.
  # Each source rect gets its own pose-relative edit record, never a pasted rectangle.
  for ri,row in enumerate(S[form]):
   for fi,(l,t,r,b) in enumerate(row):
    sub=recol[t:b,l:r];orig=a[t:b,l:r];reg=region[t:b,l:r];h,w=reg.shape
    if tag!='default' and h>28:
     mainrgb=rgb(('#ab243b' if form=='veteran' else '#176477') if tag=='modern' else main)
     # Reclassify internal black fabric bounded by suit pixels on BOTH sides.
     opaque=orig[:,:,3]>0
     for yy in range(int(h*.33),h-2):
      xx=np.where((reg[yy]==1)|(reg[yy]==2))[0]
      if len(xx)<3:continue
      lo,hi=xx[0]+1,xx[-1]
      for x in range(lo,hi):
       if not opaque[yy,x] or tuple(orig[yy,x,:3])!=(0,0,0):continue
       # Preserve a 1px ink edge around silhouette and skin/hands.
       patch=orig[max(0,yy-1):yy+2,max(0,x-1):x+2]
       if not np.all(patch[:,:,3]>0):continue
       skin=((patch[:,:,0]>100)&(patch[:,:,0]>patch[:,:,1])&(patch[:,:,1]>=patch[:,:,2])&(patch[:,:,2]>70))
       if skin.any():continue
       # Leave chest emblem untouched above the waist.
       if yy<h*.60 and abs(x-w*.55)<w*.18:continue
       sub[yy,x,:3]=np.array((38,44,51),dtype='uint8') if tag=='modern' and yy<h*.60 else (mainrgb*.60).astype('uint8')
     # The thin belt/buckle region is identified by its trim pixels under the torso.
     # Reconstruct through neighboring fabric; preserve transparency and all non-costume pixels.
     edits=0
     for yy in range(int(h*.58),int(h*.78)):
      xs=np.where(reg[yy]==2)[0]
      if len(xs)<3:continue
      # central waist only, excludes hands outside the central 38% of body width
      for x in xs:
       if w*.34<x<w*.72:
        sub[yy,x,:3]=(mainrgb*(.82 if x<w*.56 else .65)).astype('uint8');edits+=1
     # Remove actual buckle rings (light suit pixels enclosing a black center).
     # The edit follows opaque cloth pixels and borrows the shade above each pixel.
     if tag=='modern':
      centers=[]
      for by in range(max(2,int(h*.35)),min(h-3,int(h*.84))):
       for bx in range(2,w-2):
        if tuple(orig[by,bx,:3])==(0,0,0) and all(reg[by+dy,bx+dx] in (1,2) for dx,dy in [(0,-1),(0,1),(-1,0),(1,0)]):centers.append((bx,by))
      for bx,by in centers:
       for yy in range(by-2,min(h-1,by+4)):
        rr=np.where((reg[yy]==1)|(reg[yy]==2))[0]
        if len(rr)<2:continue
        for xx in range(rr[0]+1,rr[-1]):
         if not np.all(orig[yy-1:yy+2,xx-1:xx+2,3]>0):continue
         col=orig[yy,xx,:3]
         if tuple(col)!=(0,0,0) and reg[yy,xx] not in (1,2):continue
         shade=.82 if xx<bx else .67
         sub[yy,xx,:3]=(mainrgb*shade).astype('uint8');edits+=1
      # Veteran gold waist stripe: integrate its enclosed belt ink as well.
      if form=='veteran':
       ys,xs=np.where((reg==2)&(np.indices(reg.shape)[0]>h*.5))
       for yy,xx in zip(ys,xs):
        if yy>=h-2 or xx<1 or xx>=w-1:continue
        if np.all(orig[yy-1:yy+2,xx-1:xx+2,3]>0):
         sub[yy,xx,:3]=(mainrgb*.72).astype('uint8')
         for dy in [-1,1]:
          if tuple(orig[yy+dy,xx,:3])==(0,0,0):sub[yy+dy,xx,:3]=(mainrgb*.65).astype('uint8')
     if tag=='modern':waistlog.append({'form':form,'row':ri,'frame':fi,'sourceRect':[l,t,r,b],'trimEdits':edits})
    if tag=='cosmic' and form=='prime':
     emblem=(orig[:,:,0]>140)&(orig[:,:,1]<85)&(orig[:,:,2]<110)&(orig[:,:,3]>0)
     sub[emblem,:3]=(188,199,220)
    if haircol:
     hp=(orig[:,:,0]>160)&(orig[:,:,1]>140)&(orig[:,:,2]<100)&(orig[:,:,3]>0)
     hp[int(h*.25):]=False
     sub[hp,:3]=rgb(haircol)
    if tag=='cosmic':
     for yy in range(h):
      for xx in range(w):
       if reg[yy,xx] in (1,2) and (xx*37+yy*19+fi*11+ri*7)%251==0:sub[yy,xx,:3]=(204,210,238)
    if tag=='upgrade':
     for yy in range(h):
      for xx in range(w):
       if reg[yy,xx]==1 and (xx+yy*2)%43==0:sub[yy,xx,:3]=(92,215,99)
  for action,rf in actions.items():
   strip=Image.new('RGBA',(128*len(rf),112));records=[]
   for j,(ri,fi) in enumerate(rf):
    rect=S[form][ri][fi];l,t,r,b=rect;orig=a[t:b,l:r];im=Image.fromarray(recol[t:b,l:r]);
    if action=='miShadow' and form=='prime':
     ar=np.array(im);grey=(ar[:,:,0]==ar[:,:,1])&(ar[:,:,1]==ar[:,:,2])&(ar[:,:,0]>25)&(ar[:,:,0]<140);grey[:int(ar.shape[0]*.8)]=False;ar[~grey,3]=0;im=Image.fromarray(ar)
    m=orig[:,:,3]>0
    # exclude white effects and grey shadows when choosing the body root
    c=orig[:,:,:3];body=m&~((c[:,:,0]>235)&(c[:,:,1]>235)&(c[:,:,2]>235))&~((c[:,:,0]==c[:,:,1])&(c[:,:,1]==c[:,:,2])&(c[:,:,0]>35))
    ys,xs=np.where(body)
    if not len(ys):ys,xs=np.where(m)
    fy=int(ys.max())+1;low=body[max(0,fy-5):fy];ly,lx=np.where(low);fx=int(np.median(lx)) if len(lx)>0 else im.width//2
    if action in ['knockdown','lose','doubleJump','miShadow','miSilhouette']:fx=im.width//2
    fx=max(im.width-64,min(64,fx)) # constrain root for wide horizontal poses; preserve every source pixel
    fy=max(im.height-12,min(100,fy)) # retain below-root effects in the 12px clearance
    ox,oy=64-fx,100-fy
    assert ox>=0 and oy>=0 and ox+im.width<=128 and oy+im.height<=112,(form,action,rect,ox,oy)
    strip.alpha_composite(im,(j*128+ox,oy));records.append({'group':[ri,fi],'rect':rect,'root':[l+fx,t+fy],'destination':[ox,oy]})
   strip.save(dest/f'{action}.png')
   if tag=='default':
    metadata[form][action]={'sheet':f'./assets/mr_incredible/default/{form}/{action}.png','frames':len(rf),'width':128,'height':112,'originX':64,'originY':100,'speed':5,'loop':action in ['idle','walk','run','guard','charge','crouch','lose'],'lockLastFrame':True}
    ledger[form]['actions'][action]=records
  portrait=Image.fromarray(recol).crop((0,0,40,34));portrait.save(dest/'portrait.png')
(DOC/'region_mapping.json').write_text(json.dumps(paletteAudit,indent=2))
(DOC/'source_rects.json').write_text(json.dumps(ledger,indent=2));(DOC/'modern_edit_masks.json').write_text(json.dumps(waistlog,indent=2))
(ROOT/'mrIncredibleSprites.js').write_text('// Generated by tools/mr_incredible/build.py. Exact independent source rectangles in docs/mr_incredible/source_rects.json.\nexport const MR_ANIM = '+json.dumps(metadata,indent=2)+'\n')
(ROOT/'mrIncredibleSkinTable.js').write_text('export const MR_SKIN_TABLE = '+json.dumps([{'id':'default' if t=='default' else 'mi_'+t,'tag':t,'name':n,'effect':{'default':'#ffce74','cosmic':'#c9c1ff','heatblast':'#ed9c45','cursed_rose':'#ec9bcf','upgrade':'#8cfb6d','diamondhead':'#a8ebd0','golden_age':'#e1c787'}.get(t,'#83dcf5'),'classification':'Default' if t=='default' else 'Original controlled costume edit' if t=='modern' else 'Crossover inspired palette' if t not in ['golden_age'] else 'Original palette'} for t,n,*_ in SKINS],indent=2)+'\n')
# Three-column comparison and paired skin contact sheet.
acts=['idle','crouch','light','heavy','air','miSlam','hurt','knockdown']
canvas=Image.new('RGB',(900,1960),'#242a35');d=ImageDraw.Draw(canvas)
for i,title in enumerate(['Original young','Modern young','Modern veteran']):d.text((i*300+20,8),title,fill='white')
for j,act in enumerate(acts):
 for i,(tag,form) in enumerate([('default','prime'),('modern','prime'),('modern','veteran')]):
  im=Image.open(OUT/tag/form/f'{act}.png');idx=min({'heavy':3,'miSlam':5,'crouch':0,'idle':0}.get(act,1),im.width//128-1);im=im.crop((idx*128,0,idx*128+128,112)).resize((256,224),Image.Resampling.NEAREST);canvas.paste(im,(i*300+20,30+j*240),im)
 d.text((8,240+j*240),act,fill='white')
canvas.save(DOC/'modern_suit_comparison.png')
canvas=Image.new('RGB',(880,11*170),'#242a35');d=ImageDraw.Draw(canvas)
for j,(tag,name,*_) in enumerate(SKINS):
 d.text((12,j*170+4),name,fill='white')
 for i,(form,act) in enumerate([('veteran','idle'),('prime','idle'),('veteran','heavy'),('prime','heavy')]):
  im=Image.open(OUT/tag/form/f'{act}.png').crop((0,0,128,112));canvas.paste(im,(30+i*205,j*170+30),im)
canvas.save(DOC/'skins_contact.png')
print('Built',len(SKINS),'paired skins;',sum(len(v) for k in S.values() for v in k),'segmented source groups')
