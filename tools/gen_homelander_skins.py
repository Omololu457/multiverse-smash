#!/usr/bin/env python3
"""Homelander CREATIVE skins — FULL recolour (hair + blue suit + red cape/boots) per theme, shading
preserved. Overwrites the earlier hair-only files (same tags/names) so skins.js picks them up.
Usage: gen_homelander_skins.py [<tag>|all|probe]."""
import sys, os, re, colorsys
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),"..")
# tag -> dict(hair, suit, cape)
SKINS={
 "pinkhair":   dict(hair="#F06EB0", suit="#C0398A", cape="#7E1A52"),
 "greenhair":  dict(hair="#5BC85B", suit="#2E8B3A", cape="#17441F"),
 "silverhair": dict(hair="#D6DAE0", suit="#8A8E96", cape="#3A3D44"),
 "ravenhair":  dict(hair="#2C2C34", suit="#20202A", cape="#5A1420"),
 "bluehair":   dict(hair="#4A86E0", suit="#1E4FC8", cape="#12255A"),
 "crimsonhair":dict(hair="#D64033", suit="#A01818", cape="#470C0C"),
 "purplehair": dict(hair="#9B59D0", suit="#6B2EA8", cape="#2C1150"),
 "tealhair":   dict(hair="#1FC0B8", suit="#148E88", cape="#0A3A38"),
}
def hsv(r,g,b): return colorsys.rgb_to_hsv(r/255,g/255,b/255)
def hx(h): return (int(h[1:3],16),int(h[3:5],16),int(h[5:7],16))
def is_hair(p):
    r,g,b,a=p
    if a<80 or b>=100 or not (r>=g>=b): return False
    return r>130 and g>88 and (g-b)>52 and (r-g)<120
def is_blue(p):
    r,g,b,a=p
    if a<100: return False
    h,s,v=hsv(r,g,b); hd=h*360
    return s>=0.28 and 195<=hd<=248
def is_red(p):
    r,g,b,a=p
    if a<100: return False
    h,s,v=hsv(r,g,b); hd=h*360
    if s<0.42: return False
    if not (hd<18 or hd>=343): return False
    if g>95: return False          # exclude warm skin/hair
    return True
def tone(p,target_hex,pivot=0.5):
    r,g,b,a=p
    th,ts,tv=hsv(*hx(target_hex)); _,_,v=hsv(r,g,b)
    nv=max(0.0,min(1.0,tv+(v-pivot)))
    nr,ng,nb=colorsys.hsv_to_rgb(th,ts,nv)
    return (round(nr*255),round(ng*255),round(nb*255),a)
def sheets():
    txt=open(os.path.join(ROOT,"characters.js"),encoding="utf-8").read()
    m=re.search(r'const homelander = \{.*?animationData:\s*\{(.*?)\n  \}\n\}',txt,re.S)
    blk=m.group(1) if m else txt
    s=set()
    for mm in re.finditer(r'sheet:\s*"\./(homelander_[a-zA-Z0-9]+_uniform\.png)"',blk): s.add(mm.group(1))
    return sorted(s)+["homelander_portrait.png"]
def recolor(im,pal):
    px=bytearray(im.tobytes()); W,H=im.size
    for i in range(0,len(px),4):
        p=(px[i],px[i+1],px[i+2],px[i+3])
        if p[3]<60: continue
        if is_hair(p): c=tone(p,pal["hair"])
        elif is_red(p): c=tone(p,pal["cape"])
        elif is_blue(p): c=tone(p,pal["suit"])
        else: continue
        px[i],px[i+1],px[i+2],px[i+3]=c
    return Image.frombytes("RGBA",(W,H),bytes(px))
def probe():
    im=Image.open(os.path.join(ROOT,"homelander_idle_uniform.png")).convert("RGBA");px=im.load();W,H=im.size
    for y in range(H):
        for x in range(W):
            p=px[x,y]
            if p[3]<60: continue
            if is_hair(p): px[x,y]=(255,0,255,255)
            elif is_red(p): px[x,y]=(255,80,80,255)
            elif is_blue(p): px[x,y]=(80,255,80,255)
    im.resize((W*3,H*3),Image.NEAREST).save(os.path.join(ROOT,"homelander_work","_skin_mask.png"));print("mask: magenta=hair red=cape green=suit")
def run(tag):
    pal=SKINS[tag];n=0
    for sh in sheets():
        p=os.path.join(ROOT,sh)
        if not os.path.exists(p): continue
        recolor(Image.open(p).convert("RGBA"),pal).save(os.path.join(ROOT,sh.replace(".png","__"+tag+".png")));n+=1
    print("DONE",tag,n)
if __name__=="__main__":
    a=sys.argv[1] if len(sys.argv)>1 else "all"
    if a=="probe": probe()
    elif a=="all":
        for t in SKINS: run(t)
    else: run(a)
