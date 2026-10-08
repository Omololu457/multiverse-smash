import numpy as np, os, glob, sys
from PIL import Image
OUT="jiraiya_work"
files=sorted(glob.glob("jiraiya_slices/jiraiya_*_uniform.png"))
if len(sys.argv)>1: files=[f for f in files if any(n in f for n in sys.argv[1:])]
def mag(im):
    a=np.asarray(im.convert("RGBA")).astype(float); al=a[:,:,3:4]/255
    m=np.zeros_like(a[:,:,:3]); m[:,:,0]=255; m[:,:,2]=255
    return (a[:,:,:3]*al+m*(1-al)).astype(np.uint8)
rows=[]
pad=4; labelw=0
maxw=max(Image.open(f).width for f in files)
cells=[]
for f in files:
    im=Image.open(f); c=mag(im)
    cells.append((os.path.basename(f).replace("jiraiya_","").replace("_uniform.png",""),c,im.width,im.height))
ch=max(c[3] for c in cells)
W=maxw+8; 
# stack vertically, each row = one action strip on magenta, scaled x1
total_h=sum(c[3]+pad for c in cells)+pad
sheet=Image.new("RGB",(maxw+8, total_h),(40,40,40))
y=pad
from PIL import ImageDraw
d=ImageDraw.Draw(sheet)
for name,c,w,h in cells:
    sheet.paste(Image.fromarray(c),(4,y))
    y+=h+pad
sheet.save(f"{OUT}/contact_base.png")
print("contact_base.png", sheet.size, "rows:", len(cells))
