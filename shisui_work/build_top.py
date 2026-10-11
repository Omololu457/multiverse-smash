import sys, numpy as np
sys.path.insert(0,'shisui_work')
import shslice as S
from PIL import Image

SRC="shisui_uchiha_jonin_nzc_by_altair_by_altairframemaker_def0sq6.png"
a=S.flood_key(S.load(SRC))
mask=S.content_mask(a)

def cells_from_islands(y0,y1, islands):
    cells=[]
    for (x0,x1) in islands:
        bb=S.bbox(a, x0, x1, y0, y1)
        if bb: cells.append(bb)
    return cells

def body(action, y0,y1,x0,x1,n, gap=5, min_w=5, pad=2):
    isl=S.col_islands(mask,y0,y1,x0,x1,min_w=min_w,gap=gap)
    isl=S.force_n(isl,n)
    cells=cells_from_islands(y0,y1,isl)
    im,cw,ch,nf=S.repack(a,cells,pad=pad,align='feet',out=f"shisui_trinity_{action}_uniform.png")
    print(f"{action}: n={nf} cw={cw} ch={ch} islands={isl}")
    return cells

# IDLE / STANCE : single figure x28-72 y244-339 (text at 231-238 excluded)
body("idle", 242, 342, 26, 74, 1)

# CHARGE : single figure x86-140 y246-310
body("charge", 242, 342, 84, 142, 1)

# RUN : 6 figures y374-435, gap=3 gives clean split
body("run", 372, 437, 10, 410, 6, gap=3)

# MANGEKYOU charge FX: 4 red-on-black blocks, lum_alpha (block4 navy-ring hole stays transparent)
fx_blocks=[(143,176),(177,244),(244,306),(312,388)]
crops=[]
for (x0,x1) in fx_blocks:
    sub=S.lum_alpha(a, 244, 318, x0, x1, thresh=20)
    # autocrop to content
    al=sub[...,3]>12
    import numpy as np
    ys=np.where(al.any(axis=1))[0]; xs=np.where(al.any(axis=0))[0]
    crops.append((x0+int(xs.min()), x0+int(xs.max())+1, 244+int(ys.min()), 244+int(ys.max())+1))
# repack from raw a but with lum alpha: build manually
import numpy as np
fxcrops=[]
for (x0,x1,y0,y1) in crops:
    fxcrops.append(S.lum_alpha(a,y0,y1,x0,x1,thresh=20))
cw=max(c.shape[1] for c in fxcrops)+4; ch=max(c.shape[0] for c in fxcrops)+4
strip=np.zeros((ch,cw*len(fxcrops),4),np.uint8)
for i,c in enumerate(fxcrops):
    hh,ww=c.shape[:2]; ox=i*cw+(cw-ww)//2; oy=(ch-hh)//2
    strip[oy:oy+hh,ox:ox+ww]=c
Image.fromarray(strip,"RGBA").save("shisui_trinity_mangekyou_fx_uniform.png")
print(f"mangekyou_fx: n={len(fxcrops)} cw={cw} ch={ch}")
