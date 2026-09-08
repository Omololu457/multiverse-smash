#!/usr/bin/env python3
# Re-slice UPGRADE (Dragonrod sheet, blue bg #00A2E8) -> feet-aligned uniform strips (CC-box scheme).
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
SRC="upgrade_sprite_sheet_by_dragonrod342_d7z5d59.png"; BAND=46; FLIP_H=False
def load():
    a=np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    bg=(np.abs(a-np.array([0,162,232])).sum(2)<70)|(a.sum(2)>715)
    return Image.fromarray(np.dstack([a.astype("uint8"),np.where(bg,0,255).astype("uint8")]),"RGBA"),bg
def boxes_of(bg):
    lbl,n=ndimage.label(~bg); bxs=[]
    for i in range(1,n+1):
        ys,xs=np.where(lbl==i)
        if len(ys)<140: continue
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
PICKS={"idle":[0,1,2,3],"walk":[6,7,8,9,10,11],"jump":[12],"fall":[13,14],"crouch":[15],
       "light":[31,32],"heavy":[36,37,38],"up":[41,42,43],"air":[33,34],"beam":[36,37,38,39]}
def main():
    im,bg=load(); boxes=boxes_of(bg); print(f"detected {len(boxes)} boxes")
    for act,picks in PICKS.items():
        picks=[p for p in picks if p<len(boxes)]
        if picks: reslice(im,boxes,f"ben10_upgrade_{act}_uniform.png",picks)
def verify():
    acts=list(PICKS.keys()); cw=230; ch=100
    mont=Image.new("RGBA",(cw,ch*len(acts)),(28,28,34,255)); d=ImageDraw.Draw(mont)
    try: font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf",12)
    except: font=ImageFont.load_default()
    for i,act in enumerate(acts):
        im=Image.open(f"ben10_upgrade_{act}_uniform.png").convert("RGBA")
        sc=min(cw/im.width,(ch-14)/im.height,1.5); r=im.resize((int(im.width*sc),int(im.height*sc)),Image.NEAREST)
        mont.alpha_composite(r,(2,i*ch+14)); d.text((2,i*ch+1),f"{act} ({im.width}x{im.height})",fill=(255,230,80,255),font=font)
    mont.convert("RGB").save("harness/shots/s3_upgrade_verify.png"); print("wrote s3_upgrade_verify.png")
if __name__=="__main__":
    (verify if len(sys.argv)>1 and sys.argv[1]=="verify" else main)()
