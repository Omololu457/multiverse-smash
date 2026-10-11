from PIL import Image
import numpy as np, glob, os
# animationData sheets only (not _fx/koto/portrait)
ACTIONS=["idle","run","dash","jump","hurt","knockdown","getup","guard","win","charge",
         "light","heavy","up","air","fireball","genjutsu","armslam","flurry","susanoo"]
def recolor(a):
    out=a.copy()
    r,g,b,al=[a[...,i].astype(int) for i in range(4)]
    mx=np.maximum(np.maximum(r,g),b); mn=np.minimum(np.minimum(r,g),b)
    sat=mx-mn; lum=(r*0.3+g*0.59+b*0.11)
    # VEST = low-saturation grey/olive, mid luminance (exclude navy clothing which is blue-dominant, exclude skin)
    greyish=(sat<=34) & (lum>=44) & (lum<=150) & (b<=g+14)      # grey/olive, not blue-dominant
    olive=(g>=r) & (g>=b) & (sat>14) & (sat<=50) & (lum>=44) & (lum<=140)  # the (64,80,64) olive vest
    vest=(greyish|olive) & (al>40)
    # map vest luminance → green ramp
    L=lum[vest]
    out[...,0][vest]=np.clip(L*0.28,0,255).astype(np.uint8)     # low red
    out[...,1][vest]=np.clip(60+L*0.95,0,255).astype(np.uint8)  # strong green
    out[...,2][vest]=np.clip(L*0.30,0,255).astype(np.uint8)     # low blue
    return out
n=0
for act in ACTIONS:
    f=f"shisui_trinity_{act}_uniform.png"
    if not os.path.exists(f): continue
    a=np.array(Image.open(f).convert("RGBA"))
    Image.fromarray(recolor(a),"RGBA").save(f.replace(".png","__green.png")); n+=1
# portrait recolor too
pf="shisui_trinity_portrait.png"
if os.path.exists(pf):
    a=np.array(Image.open(pf).convert("RGBA")); Image.fromarray(recolor(a),"RGBA").save("shisui_trinity_portrait__green.png"); n+=1
print("generated",n,"green sheets")
