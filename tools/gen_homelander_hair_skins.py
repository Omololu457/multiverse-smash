#!/usr/bin/env python3
"""Homelander CREATIVE hair-recolor skins. Detects his golden-blond hair (B<~100, strong yellow —
distinct from his peachy skin where B>150) and to-tones it to a target hue, preserving each pixel's
value so highlights/shadows survive. Suit/cape/face untouched (iconic). Sheets auto-discovered from
characters.js homelander animationData. Usage: gen_homelander_hair_skins.py [<tag>|all|probe]."""
import sys, os, re, colorsys
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),"..")
SPREAD=1.0
# tag -> target hair hex
HAIR={
 "pinkhair":"#F06EB0","greenhair":"#4FB24F","silverhair":"#D2D6DC","ravenhair":"#2A2A32",
 "bluehair":"#4A86E0","crimsonhair":"#D0392B","purplehair":"#9B59D0","tealhair":"#1FB8B0",
}
def hsv(r,g,b): return colorsys.rgb_to_hsv(r/255,g/255,b/255)
def hx(h): return (int(h[1:3],16),int(h[3:5],16),int(h[5:7],16))
def is_hair(p):
    r,g,b,a=p
    if a<80: return False
    if b>=100: return False
    if not (r>=g>=b): return False
    return r>130 and g>88 and (g-b)>52 and (r-g)<120
def tone(p,target_hex,pivot=0.5,spread=SPREAD):
    r,g,b,a=p
    th,ts,tv=hsv(*hx(target_hex))
    _,_,v=hsv(r,g,b)
    nv=max(0.0,min(1.0,tv+(v-pivot)*spread))
    nr,ng,nb=colorsys.hsv_to_rgb(th,ts,nv)
    return (round(nr*255),round(ng*255),round(nb*255),a)
def sheets_for(char):
    txt=open(os.path.join(ROOT,"characters.js"),encoding="utf-8").read()
    m=re.search(r'const '+char+r' = \{.*?animationData:\s*\{(.*?)\n  \}\n\}',txt,re.S)
    blk=m.group(1) if m else txt
    s=set()
    for mm in re.finditer(r'sheet:\s*"\./('+char+r'_[a-zA-Z0-9]+_uniform\.png)"',blk): s.add(mm.group(1))
    return sorted(s)
def recolor(img,target):
    px=bytearray(img.tobytes()); W,H=img.size
    for i in range(0,len(px),4):
        p=(px[i],px[i+1],px[i+2],px[i+3])
        if is_hair(p):
            c=tone(p,target); px[i],px[i+1],px[i+2],px[i+3]=c
    out=Image.frombytes("RGBA",(W,H),bytes(px)); return out
def probe():
    im=Image.open(os.path.join(ROOT,"homelander_idle_uniform.png")).convert("RGBA")
    px=im.load(); W,H=im.size
    for y in range(H):
        for x in range(W):
            if is_hair(px[x,y]): px[x,y]=(255,0,255,255)
    im.resize((W*3,H*3),Image.NEAREST).save(os.path.join(ROOT,"homelander_work","_hair_mask.png")); print("wrote hair mask")
def run(tag):
    tgt=HAIR[tag]; sheets=sheets_for("homelander")+["homelander_portrait.png"]
    n=0
    for sh in sheets:
        p=os.path.join(ROOT,sh)
        if not os.path.exists(p): continue
        im=Image.open(p).convert("RGBA")
        recolor(im,tgt).save(os.path.join(ROOT,sh.replace(".png","__"+tag+".png"))); n+=1
    print("DONE",tag,"->",n,"sheets")
if __name__=="__main__":
    a=sys.argv[1] if len(sys.argv)>1 else "all"
    if a=="probe": probe()
    elif a=="all":
        for t in HAIR: run(t)
    else: run(a)
