import sys, numpy as np
sys.path.insert(0,'shisui_work')
import shslice as S
from PIL import Image, ImageDraw

SRC="shisui_uchiha_jonin_nzc_by_altair_by_altairframemaker_def0sq6.png"
a=S.flood_key(S.load(SRC))
y0,y1,x0,x1=[int(v) for v in sys.argv[1:5]]
scale=float(sys.argv[5]) if len(sys.argv)>5 else 2.0
out=sys.argv[6] if len(sys.argv)>6 else "shisui_work/zoom.png"
crop=a[y0:y1,x0:x1]
mag=Image.new("RGBA",(crop.shape[1],crop.shape[0]),(255,0,255,255))
comp=Image.alpha_composite(mag,Image.fromarray(crop,"RGBA")).convert("RGB")
W,H=comp.size
big=comp.resize((int(W*scale),int(H*scale)),Image.NEAREST)
d=ImageDraw.Draw(big)
# gridlines every 20 source px in x, label absolute
for gx in range(0, W, 20):
    X=int(gx*scale)
    d.line([(X,0),(X,big.size[1])],fill=(0,255,0),width=1)
    d.text((X+1,1),str(x0+gx),fill=(255,255,0))
for gy in range(0, H, 20):
    Y=int(gy*scale)
    d.line([(0,Y),(big.size[0],Y)],fill=(0,180,0),width=1)
    d.text((1,Y+1),str(y0+gy),fill=(0,255,255))
big.save(out)
print("saved",out,big.size)
