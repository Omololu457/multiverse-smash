import sys
from PIL import Image
f=sys.argv[1]; y0=int(sys.argv[2]); y1=int(sys.argv[3]); out=sys.argv[4]
bg=sys.argv[5] if len(sys.argv)>5 else "magenta"
colors={"magenta":(255,0,255,255),"black":(0,0,0,255),"white":(255,255,255,255)}
im=Image.open(f).convert("RGBA")
crop=im.crop((0,y0,im.size[0],y1))
back=Image.new("RGBA",crop.size,colors[bg])
comp=Image.alpha_composite(back,crop).convert("RGB")
# upscale 2x if narrow
if comp.size[0]<700:
    comp=comp.resize((comp.size[0]*2,comp.size[1]*2),Image.NEAREST)
comp.save(out)
print("saved",out,comp.size)
