#!/usr/bin/env python3
# Re-slice FOUR ARMS (Dragonrod sheet, peach bg #FFE1CE) -> feet-aligned uniform strips.
# Same CC-box scheme as reslice_heatblast.py. Run: python3 tools/reslice_fourarms.py [verify]
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
SRC="fourarms_sprite_sheet_by_dragonrod342_d7yi8wt.png"; BAND=50; FLIP_H=False
def load():
    a=np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    bg=(np.abs(a-np.array([255,225,206])).sum(2)<40)|(a.sum(2)>720)
    return Image.fromarray(np.dstack([a.astype("uint8"),np.where(bg,0,255).astype("uint8")]),"RGBA"),bg
def boxes_of(bg):
    lbl,n=ndimage.label(~bg); bxs=[]
    for i in range(1,n+1):
        ys,xs=np.where(lbl==i)
        if len(ys)<150: continue
        y0,y1,x0,x1=int(ys.min()),int(ys.max()),int(xs.min()),int(xs.max())
        if (x1-x0)<12 or (y1-y0)<12: continue
        bxs.append((y0,x0,y1,x1))
    bxs.sort(key=lambda b:(b[0]//BAND,b[1])); return bxs
def reslice(im,boxes,out,picks,pad=1):
    cells=[]
    for p in picks:
        y0,x0,y1,x1=boxes[p]; c=im.crop((x0,y0,x1+1,y1+1))
        if FLIP_H: c=c.transpose(Image.FLIP_LEFT_RIGHT)
        cells.append(c)
    uW=max(c.width for c in cells)+2*pad; uH=max(c.height for c in cells)+2*pad
    strip=Image.new("RGBA",(uW*len(cells),uH),(0,0,0,0))
    for i,c in enumerate(cells): strip.paste(c,(i*uW+(uW-c.width)//2,uH-c.height-pad),c)
    strip.save(out); print(f"OK {out}: {len(cells)}f cell {uW}x{uH}")
PICKS={"idle":[0,1,2,3],"walk":[14,15,16,17,18,19],"jump":[4,5],"fall":[5],"crouch":[12],
       "light":[28,29],"heavy":[32,33,34],"up":[30,31],"air":[43,44],"slam":[40,41,42]}
def main():
    im,bg=load(); boxes=boxes_of(bg); print(f"detected {len(boxes)} boxes")
    for act,picks in PICKS.items():
        picks=[p for p in picks if p<len(boxes)]
        if picks: reslice(im,boxes,f"ben10_fourarms_{act}_uniform.png",picks)
def verify():
    acts=list(PICKS.keys()); cw=220; ch=110
    mont=Image.new("RGBA",(cw,ch*len(acts)),(28,28,34,255)); d=ImageDraw.Draw(mont)
    try: font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf",12)
    except: font=ImageFont.load_default()
    for i,act in enumerate(acts):
        im=Image.open(f"ben10_fourarms_{act}_uniform.png").convert("RGBA")
        sc=min(cw/im.width,(ch-14)/im.height,1.6); r=im.resize((int(im.width*sc),int(im.height*sc)),Image.NEAREST)
        mont.alpha_composite(r,(2,i*ch+14)); d.text((2,i*ch+1),f"{act} ({im.width}x{im.height})",fill=(255,230,80,255),font=font)
    mont.convert("RGB").save("harness/shots/s3_fourarms_verify.png"); print("wrote s3_fourarms_verify.png")
if __name__=="__main__":
    (verify if len(sys.argv)>1 and sys.argv[1]=="verify" else main)()
