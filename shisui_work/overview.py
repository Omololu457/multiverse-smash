import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0,'shisui_work')
from rowscan import load, content_mask, row_bands

f=sys.argv[1]; outw=int(sys.argv[2]); out=sys.argv[3]
im,a=load(f)
m=content_mask(a)
bands=row_bands(m, min_gap=5, min_h=4)
# composite on magenta
mag=Image.new("RGBA", im.size, (255,0,255,255))
comp=Image.alpha_composite(mag, im).convert("RGB")
W,H=im.size
scale=outw/W; outh=int(H*scale)
small=comp.resize((outw,outh), Image.NEAREST)
d=ImageDraw.Draw(small)
for i,(s,e) in enumerate(bands):
    ys=int(s*scale); ye=int(e*scale)
    d.line([(0,ys),(outw,ys)],fill=(0,255,0),width=1)
    d.line([(0,ye),(outw,ye)],fill=(255,255,0),width=1)
    d.text((2,ys+1), f"b{i} y{s}-{e}", fill=(0,255,0))
small.save(out)
print("saved",out,small.size,"#bands",len(bands))
