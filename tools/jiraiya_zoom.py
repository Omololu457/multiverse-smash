import numpy as np, sys
from PIL import Image
def mag(im,scale=3):
    a=np.asarray(im.convert("RGBA")).astype(float); al=a[:,:,3:4]/255
    m=np.zeros_like(a[:,:,:3]); m[:,:,0]=255; m[:,:,2]=255
    o=(a[:,:,:3]*al+m*(1-al)).astype(np.uint8)
    im2=Image.fromarray(o); return im2.resize((im2.width*scale,im2.height*scale),Image.NEAREST)
name=sys.argv[1]; scale=int(sys.argv[2]) if len(sys.argv)>2 else 3
mag(Image.open(f"jiraiya_slices/jiraiya_{name}_uniform.png"),scale).save(f"jiraiya_work/zoom_{name}.png")
print("ok")
