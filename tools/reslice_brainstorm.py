#!/usr/bin/env python3
# Re-slice BRAINSTORM (DS/DSi rip, 4449x5242 teal sheet w/ black cells, small orange crab-alien).
# The full 23MP CC-label stalls, so DETECT on a 3x-downscaled copy then crop FULL-RES (x3). CC-box scheme.
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
SRC="DS _ DSi - Ben 10 Alien Force_ Vilgax Attacks - Playable Characters - Brainstorm.png"
DS=3; BAND=22; FLIP_H=False
def load_full():
    im=Image.open(SRC).convert("RGB")
    a=np.asarray(im).astype(int)
    teal=(np.abs(a-np.array([0,128,128])).sum(2)<70); black=(a.sum(2)<70)
    bg=teal|black
    rgba=Image.fromarray(np.dstack([a.astype("uint8"),np.where(bg,0,255).astype("uint8")]),"RGBA")
    return rgba, im
def boxes_of():
    im=Image.open(SRC).convert("RGB")
    sm=np.asarray(im.resize((im.width//DS,im.height//DS),Image.NEAREST)).astype(int)
    teal=(np.abs(sm-np.array([0,128,128])).sum(2)<70); black=(sm.sum(2)<70)
    lbl,n=ndimage.label(~(teal|black)); bxs=[]
    for i in range(1,n+1):
        ys,xs=np.where(lbl==i)
        if len(ys)<40: continue
        bxs.append((int(ys.min())*DS,int(xs.min())*DS,int(ys.max())*DS,int(xs.max())*DS))
    bxs.sort(key=lambda b:(b[0]//(BAND*DS),b[1])); return bxs
def reslice(rgba,boxes,out,picks,pad=1):
    cells=[]
    for p in picks:
        y0,x0,y1,x1=boxes[p]; c=rgba.crop((x0,y0,x1+1,y1+1))
        # tighten to opaque bbox (downscaled boxes are loose)
        bb=c.getbbox()
        if bb: c=c.crop(bb)
        if FLIP_H: c=c.transpose(Image.FLIP_LEFT_RIGHT)
        cells.append(c)
    uW=max(c.width for c in cells)+2*pad; uH=max(c.height for c in cells)+2*pad
    strip=Image.new("RGBA",(uW*len(cells),uH),(0,0,0,0))
    for i,c in enumerate(cells): strip.paste(c,(i*uW+(uW-c.width)//2,uH-c.height-pad),c)
    strip.save(out); print(f"OK {out}: {len(cells)}f cell {uW}x{uH}")
PICKS={"idle":[0,1,2,3],"walk":[10,11,12,13],"jump":[8],"crouch":[9],
       "light":[20,21],"heavy":[25,26],"up":[22,23],"air":[14,15],"bolt":[25,26,27]}
def main():
    rgba,_=load_full(); boxes=boxes_of(); print(f"detected {len(boxes)} boxes")
    for act,picks in PICKS.items():
        picks=[p for p in picks if p<len(boxes)]
        if picks: reslice(rgba,boxes,f"ben10_brainstorm_{act}_uniform.png",picks)
def verify():
    acts=list(PICKS.keys()); cw=230; ch=95
    mont=Image.new("RGBA",(cw,ch*len(acts)),(28,28,34,255)); d=ImageDraw.Draw(mont)
    try: font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf",12)
    except: font=ImageFont.load_default()
    for i,act in enumerate(acts):
        im=Image.open(f"ben10_brainstorm_{act}_uniform.png").convert("RGBA")
        sc=min(cw/im.width,(ch-14)/im.height,2.2); r=im.resize((int(im.width*sc),int(im.height*sc)),Image.NEAREST)
        mont.alpha_composite(r,(2,i*ch+14)); d.text((2,i*ch+1),f"{act} ({im.width}x{im.height})",fill=(255,230,80,255),font=font)
    mont.convert("RGB").save("harness/shots/s3_brainstorm_verify.png"); print("wrote s3_brainstorm_verify.png")
if __name__=="__main__":
    (verify if len(sys.argv)>1 and sys.argv[1]=="verify" else main)()
