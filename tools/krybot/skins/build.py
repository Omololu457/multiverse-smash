#!/usr/bin/env python3
"""Offline semantic-region palette adaptation. Requires Pillow; never edits base art.

Masks are cell-local, explicit anatomical boxes; RGB alone never decides whether
shared grey belongs to helmet, glove, boot, circuitry or undersuit. All ramps are
finite RGB maps. Outlines/alpha/geometry remain source pixels. No hue filters.
"""
from pathlib import Path
import json, hashlib
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[3]
DOC=ROOT/'docs/skins/krybot'
OUT=ROOT/'assets/krybot/skins'
META=json.loads((ROOT/'docs/krybot/source_rects.json').read_text())
REGIONS={0:'transparent',1:'outline/contact shadow',2:'helmet shell',3:'face apertures and sensors',4:'silver armor/trim',5:'dark undersuit',6:'hands/gloves',7:'feet/boots',8:'weapon/forearm tip',9:'chest circuitry',10:'existing shoulder/chest/knee plates'}
# x0,y0,x1,y1 inclusive. Per-pose anatomy, reviewed against mask_authoring.png.
HEAD={
 'idle0':[14,0,24,12],'idle1':[15,0,24,12],
 'run0':[25,0,35,11],'run1':[24,0,34,12],'run2':[25,0,34,14],'run3':[28,0,38,15],
 'run4':[25,0,35,12],'run5':[23,0,34,13],'run6':[25,0,35,15],'run7':[25,0,35,15],
 'tumble0':[5,1,16,15],'tumble1':[17,20,28,31],'tumble2':[0,20,13,30],'tumble3':[23,2,32,12],
 'jump':[16,0,26,12],'punchWind':[27,0,38,13],'punch':[33,0,44,14],
 'kickWind':[18,0,29,12],'kick':[24,0,35,15],'ready':[23,0,34,14],
 'aim':[24,6,35,18],'lowerArm':[24,6,35,19],'guard':[16,4,27,17],'recoil':[1,6,12,20],
 'fall0':[9,1,20,16],'fall1':[1,16,14,29],'fall2':[1,21,14,34],'fall3':[0,33,11,45]}
HANDS={
 'idle0':[[7,18,13,24],[25,20,31,25]],'idle1':[[9,18,15,24],[23,20,28,25]],
 'run0':[[34,12,41,18]],'run1':[[31,18,38,23]],'run2':[[29,22,35,27]],'run3':[[36,22,43,27],[25,22,30,27]],
 'run4':[[34,12,41,18]],'run5':[[30,18,37,23]],'run6':[[29,22,35,27]],'run7':[[29,22,35,27]],
 'tumble0':[[20,10,25,17]],'tumble1':[],'tumble2':[],'tumble3':[],
 'jump':[[8,10,13,15],[31,7,38,13]],'punchWind':[[4,3,12,10],[37,9,43,16]],'punch':[[48,15,54,20]],
 'kickWind':[[31,0,38,8],[12,18,19,24]],'kick':[[31,9,36,17],[10,17,15,23]],
 'ready':[[10,3,17,10],[35,11,42,19]],'aim':[[13,22,21,28]],'lowerArm':[[34,25,40,31]],
 'guard':[[22,16,28,23]],'recoil':[[21,0,28,6]],
 'fall0':[[30,0,36,7],[14,19,23,26]],'fall1':[[18,10,26,18]],'fall2':[[17,6,24,14]],'fall3':[[11,39,19,46]]}
FEET={
 'idle0':[[0,47,11,55],[23,47,31,55]],'idle1':[[0,47,11,55],[23,47,31,55]],
 'run0':[[14,47,28,55],[24,35,32,40]],'run1':[[0,42,11,50],[33,44,45,52]],
 'run2':[[5,38,15,44],[21,49,33,55]],'run3':[[10,45,23,55]],'run4':[[14,47,28,55],[24,35,32,40]],
 'run5':[[1,44,12,53],[34,46,45,54]],'run6':[[5,42,15,48],[21,50,33,55]],'run7':[[16,46,31,55]],
 'tumble0':[[24,21,31,26]],'tumble1':[[1,4,10,10]],'tumble2':[[12,0,19,8]],'tumble3':[[16,23,23,31]],
 'jump':[[2,53,11,63],[20,35,26,41]],'punchWind':[[19,41,27,50],[35,35,42,41]],
 'punch':[[18,42,25,51],[34,37,43,43]],'kickWind':[[5,36,12,43],[25,49,37,55]],
 'kick':[[8,49,22,55],[39,26,48,33]],'ready':[[2,46,13,54],[25,40,34,47]],
 'aim':[[0,48,13,55],[24,48,34,55]],'lowerArm':[[0,48,14,55],[24,48,34,55]],
 'guard':[[0,39,12,47],[22,39,34,47]],'recoil':[[3,39,11,47],[21,39,30,47]],
 'fall0':[[23,36,33,47],[40,37,49,47]],'fall1':[[44,18,54,25],[37,34,47,42]],
 'fall2':[[19,15,27,23],[32,40,41,47]],'fall3':[[43,33,55,46]]}
WEAPON={'aim':[[39,19,47,24]],'lowerArm':[[36,27,40,31]]}
# Plate polygons stay within the existing silhouette; no new armor shapes.
PLATES={
 'idle0':[[8,10,17,18],[16,12,21,19],[5,31,11,38],[24,31,29,38]],
 'idle1':[[9,10,18,18],[17,12,22,19],[5,31,11,38],[24,31,29,38]],
 'run0':[[21,9,29,17],[22,25,29,33]],'run1':[[22,12,28,19],[24,29,32,37]],
 'run2':[[20,13,28,20],[24,32,31,39]],'run3':[[22,15,30,22],[23,32,31,40]],
 'run4':[[21,9,29,17],[22,25,29,33]],'run5':[[22,12,28,19],[24,29,32,37]],
 'run6':[[20,13,28,20],[24,32,31,39]],'run7':[[20,13,28,20],[24,32,31,39]],
 'tumble0':[[9,15,18,23]],'tumble1':[[11,6,20,15]],'tumble2':[[14,14,24,22]],'tumble3':[[9,6,19,16]],
 'jump':[[13,12,20,20],[14,27,24,35]],'punchWind':[[21,11,30,20],[25,25,34,33]],
 'punch':[[27,14,35,22],[29,30,38,38]],'kickWind':[[14,12,23,19],[22,29,31,37]],
 'kick':[[19,13,28,22],[16,28,25,36]],'ready':[[17,13,26,22],[19,31,27,38]],
 'aim':[[19,19,28,28],[19,34,28,41]],'lowerArm':[[19,19,28,28],[19,34,28,41]],
 'guard':[[11,17,21,25],[10,28,18,35]],'recoil':[[9,18,18,27],[12,28,22,35]],
 'fall0':[[16,15,27,23],[30,27,39,35]],'fall1':[[13,24,23,31],[26,28,35,35]],
 'fall2':[[17,22,26,31]],'fall3':[[14,35,23,42],[32,35,41,42]]}
COLORS=[(33,24,16),(49,41,41),(74,66,66),(115,107,123),(140,140,140),(173,173,165),(214,214,206),(181,0,0)]
RAMPS={
 'tv':{
  'metal':[(33,24,16),(45,48,53),(69,75,82),(139,146,155),(181,188,195),(214,221,226),(241,244,245)],
  'dark':[(33,24,16),(28,29,32),(39,41,46),(52,56,63),(66,72,80),(87,94,102),(111,119,126)],
  'plates':[(33,24,16),(35,37,42),(55,59,65),(89,96,105),(132,140,150),(184,193,200),(224,230,234)],
  'sensor':(181,0,0),'circuit':(203,94,38)},
 'ds':{
  'metal':[(33,24,16),(41,40,46),(67,65,74),(119,117,130),(166,166,174),(211,213,213),(244,246,237)],
  'dark':[(33,24,16),(24,26,29),(36,40,44),(49,55,61),(64,72,77),(82,92,96),(106,119,121)],
  'plates':[(33,24,16),(35,33,40),(59,54,65),(96,88,105),(133,125,142),(173,170,184),(222,222,224)],
  'sensor':(0,183,184),'circuit':(0,207,211)},
 'ds_red':{
  'metal':[(33,24,16),(41,40,46),(67,65,74),(119,117,130),(166,166,174),(211,213,213),(244,246,237)],
  'dark':[(33,24,16),(9,27,29),(9,40,42),(9,55,58),(9,69,72),(9,84,88),(17,105,109)],
  'plates':[(33,24,16),(67,0,2),(119,0,4),(173,0,6),(214,13,15),(244,43,38),(255,102,83)],
  'sensor':(181,0,0),'circuit':(214,13,15)}}

def contains(rects,x,y):return any(a<=x<=c and b<=y<=d for a,b,c,d in rects)
def region(name,x,y,rgb):
    head=contains([HEAD[name]],x,y)
    if rgb==(181,0,0):return 3 if head else 9
    # Deepest source outlines, including the ambiguous baked shadow, are invariant.
    if rgb in [(33,24,16),(8,8,8),(0,0,0)]:
        a,b,c,d=HEAD[name]
        return 3 if head and a+2<=x<=c-1 and b+2<=y<=d-1 else 1
    if head:return 2
    if contains(WEAPON.get(name,[]),x,y):return 8
    if contains(HANDS[name],x,y):return 6
    if contains(FEET[name],x,y):return 7
    if contains(PLATES[name],x,y):return 10
    return 4 if rgb in COLORS[3:7] else 5

def main():
    DOC.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    masks=OUT/'masks';masks.mkdir(exist_ok=True)
    cells=[c for c in META['frames'] if c['kind']=='body'];images={};audit={}
    for c in cells:
        name=c['name'];im=Image.open(ROOT/f'assets/krybot/cells/{name}.png').convert('RGBA')
        mask=Image.new('L',im.size);count={}
        for y in range(im.height):
            for x in range(im.width):
                px=im.getpixel((x,y))
                if not px[3]:continue
                reg=region(name,x,y,px[:3]);mask.putpixel((x,y),reg);count[reg]=count.get(reg,0)+1
        mask.save(masks/f'{name}.png');audit[name]={'regions':count,'maskSha256':hashlib.sha256(mask.tobytes()).hexdigest()}
        for tag,ramp in RAMPS.items():
            dest=im.copy()
            for y in range(im.height):
                for x in range(im.width):
                    px=im.getpixel((x,y));reg=mask.getpixel((x,y));rgb=px[:3]
                    if not reg or reg==1:continue
                    if reg==3 and rgb!=(181,0,0):continue  # black face apertures stay exact
                    if reg in [3,9]:new=ramp['sensor'if reg==3 else'circuit']
                    else:
                        material='metal' if reg in [2,4,8] else 'plates' if reg==10 else 'dark'
                        # Red DS boots are red-painted; gloves stay dark cyan/black.
                        if tag=='ds_red' and reg==7:material='plates'
                        new=ramp[material][COLORS.index(rgb)]
                    dest.putpixel((x,y),(*new,px[3]))
            images[tag,name]=dest
        images['default',name]=im
    # Exact same source frame order/pivots as gameplay extraction.
    seq={
      'idle':['idle0','idle1'],'walk':[f'run{i}'for i in range(8)],'walk_back':[f'run{i}'for i in range(7,-1,-1)],
      'run':[f'run{i}'for i in range(8)],'jump':['jump'],'fall':['tumble0'],'hurt':['recoil'],'guard':['guard'],'crouch':['guard'],
      'dash':[f'run{i}'for i in range(8)],'light':['punchWind','punch'],'kJ2':['punchWind','punch'],'kJ3':['kickWind','kick'],
      'heavy':['kickWind','kick'],'kLow':['kickWind','kick'],'up':['ready','jump'],'air':['kickWind','kick'],'down_air':['kick'],
      'kAdvance':['punchWind','punch'],'kChainKick':['kickWind','kick'],'kAway':['kickWind','kick'],'kBlaster':['ready','aim','lowerArm'],
      'kBreach':['punchWind','punch'],'kLeap':['jump','tumble0','tumble1','tumble2','tumble3','kick'],'kCover':['ready','aim'],
      'ultimate':['ready','aim'],'grab':['punchWind','punch'],'knockdown':[f'fall{i}'for i in range(4)],'getup':['fall2','guard','idle0'],'win':['idle0','idle1']}
    anchors={c['name']:c['anchor']for c in cells}
    for tag in ['default',*RAMPS]:
        folder=OUT/tag;folder.mkdir(exist_ok=True)
        for action,names in seq.items():
            strip=Image.new('RGBA',(112*len(names),88))
            for i,name in enumerate(names):
                ax,ay=anchors[name];strip.paste(images[tag,name],(112*i+56-ax,80-ay))
            base=Image.open(ROOT/f'assets/krybot/{action}.png').convert('RGBA')
            assert base.size==strip.size and base.getchannel('A').tobytes()==strip.getchannel('A').tobytes(),action
            if tag=='default':assert base.tobytes()==strip.tobytes(),action
            else:strip.save(folder/f'{action}.png')
        portrait=images[tag,'idle0'].crop((8,0,29,24)).resize((84,96),Image.Resampling.NEAREST)
        if tag!='default':portrait.save(folder/'portrait.png')
    (DOC/'region_mapping.json').write_text(json.dumps({'regions':REGIONS,'head':HEAD,'hands':HANDS,'feet':FEET,'weapon':WEAPON,'plates':PLATES,'sourceColors':COLORS,'ramps':RAMPS,'frames':audit,'sequences':seq},indent=2)+'\n')
    # Required evidence rows: helper and ultimate use the exact owning body's aim.
    poses=['idle0','run1','kick','aim','recoil','fall3','aim','aim'];labels=['idle','walk','normal','blaster','hit reaction','knockdown','helper','ultimate ally']
    sheet=Image.new('RGB',(8*180,4*220),(34,43,54));d=ImageDraw.Draw(sheet)
    for row,tag in enumerate(['default',*RAMPS]):
        for col,name in enumerate(poses):
            x=col*180;y=row*220;d.text((x+5,y+5),tag+' / '+labels[col],fill='white')
            im=images[tag,name];im=im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST);sheet.paste(im,(x+7,y+28),im)
    sheet.save(DOC/'skins_contact.png')
    print('Built 3 complete alternate palettes, 30 body actions + portrait each; 28 anatomical masks. Default verified byte-identical.')

if __name__=='__main__':main()
