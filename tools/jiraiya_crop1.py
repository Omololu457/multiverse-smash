# Extract a tight alpha-bbox single sprite from a keyed sheet region.
import numpy as np, sys
from PIL import Image
sheet,name,x0,y0,x1,y1=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),int(sys.argv[6])
k=Image.open(f"jiraiya_work/{sheet}_keyed.png").convert("RGBA")
reg=k.crop((x0,y0,x1,y1))
a=np.asarray(reg)[:,:,3]>16
ys,xs=np.where(a)
if len(xs)==0: print("EMPTY"); sys.exit(1)
bb=(int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1)
out=reg.crop(bb)
out.save(f"jiraiya_slices/jiraiya_{name}_uniform.png")
print(f"{name}: {out.size}  bbox{bb}")
