import numpy as np, os, sys
from PIL import Image
OUT="jiraiya_work"
def keyed(path, tol=60):
    im=np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
    best=None
    for g in (128,129,130):
        d=np.sqrt(((im-np.array([0,g,0]))**2).sum(2)); best=d if best is None else np.minimum(best,d)
    keep=best>tol
    rgba=np.dstack([im.astype(np.uint8),(keep*255).astype(np.uint8)])
    g_dom=(im[:,:,1]>im[:,:,0]+40)&(im[:,:,1]>im[:,:,2]+40)&keep
    rgba[:,:,1][g_dom]=np.maximum(im[:,:,0],im[:,:,2])[g_dom].astype(np.uint8)
    return Image.fromarray(rgba,"RGBA")
kt=keyed("jiraiya_sage_mode_sprite_sheet_by_dantewreckmen_999_d93c7xy.png")
ks=keyed("jiraiya_sage_mode_short_sprite_sheet_by_dantewreckmen_999_d93ca2b.png")
kt.save(f"{OUT}/T_keyed.png"); ks.save(f"{OUT}/S_keyed.png")
print("saved keyed", kt.size, ks.size)
# crop credits box top-right of T (approx x800-1054, y5-140), composite on white, upscale
box=kt.crop((790,0,1054,150)).convert("RGBA")
bg=Image.new("RGBA",box.size,(255,255,255,255)); bg.alpha_composite(box)
bg=bg.convert("RGB").resize((box.width*3,box.height*3),Image.LANCZOS)
bg.save(f"{OUT}/credits_box.png"); print("credits box saved", bg.size)
