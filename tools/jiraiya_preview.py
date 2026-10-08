import numpy as np, os
from PIL import Image
T = "jiraiya_sage_mode_sprite_sheet_by_dantewreckmen_999_d93c7xy.png"
S = "jiraiya_sage_mode_short_sprite_sheet_by_dantewreckmen_999_d93ca2b.png"
OUT="jiraiya_work"; os.makedirs(OUT,exist_ok=True)
def keyed(path, tol=60):
    im=np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
    best=None
    for g in (128,129,130):
        d=np.sqrt(((im-np.array([0,g,0]))**2).sum(2)); best=d if best is None else np.minimum(best,d)
    keep=best>tol
    rgba=np.dstack([im.astype(np.uint8),(keep*255).astype(np.uint8)])
    g_dom=(im[:,:,1]>im[:,:,0]+40)&(im[:,:,1]>im[:,:,2]+40)&keep
    rgba[:,:,1][g_dom]=np.maximum(im[:,:,0],im[:,:,2])[g_dom].astype(np.uint8)
    return rgba
def comp_magenta(rgba):
    a=rgba[:,:,3:4].astype(float)/255
    mag=np.zeros_like(rgba[:,:,:3]); mag[:,:,0]=255; mag[:,:,2]=255
    out=(rgba[:,:,:3]*a+mag*(1-a)).astype(np.uint8)
    return Image.fromarray(out)
# T tiles: full width, y chunks
rgba=keyed(T); H=rgba.shape[0]
import sys
step=1150
for i,y0 in enumerate(range(0,H,step)):
    y1=min(H,y0+step)
    img=comp_magenta(rgba[y0:y1])
    # scale to width 700
    w=700; h=int(img.height*w/img.width)
    img=img.resize((w,h))
    img.save(f"{OUT}/T_tile_{i}_y{y0}-{y1}.png")
    print(f"T_tile_{i}_y{y0}-{y1}.png  {img.size}")
