#!/usr/bin/env python3
"""Slice M (sputnick edo-tensei, SOFT green sheet) summon assets. Even-divide overlapping frames; clean
residual green halos on the orange Kurama. Render ≤100% native (never upscale) per the quality gate."""
import numpy as np
from PIL import Image

M = np.asarray(Image.open("madara_war_work/M_keyed.png").convert("RGBA")).astype(np.int32)

def even(x0,x1,n): w=(x1-x0)//n; return [(x0+i*w, x0+(i+1)*w) for i in range(n)]

def crop(y0,y1,cx0,cx1,degreen=False,pad=2):
    sub = M[y0:y1, cx0:cx1].copy()
    if degreen:                                   # drop residual green-ish pixels (orange fox has no green)
        r,g,b = sub[...,0],sub[...,1],sub[...,2]
        greenish = (g > r+18) & (g > b+18) & (sub[...,3]>0)
        sub[greenish,3] = 0
    m = sub[...,3] > 10
    if not m.any(): return None
    ys=np.where(m.any(axis=1))[0]; xs=np.where(m.any(axis=0))[0]
    c = sub[ys.min():ys.max()+1, xs.min():xs.max()+1].astype(np.uint8)
    out=np.zeros((c.shape[0]+2*pad,c.shape[1]+2*pad,4),np.uint8); out[pad:pad+c.shape[0],pad:pad+c.shape[1]]=c
    return Image.fromarray(out,"RGBA")

def build(name, cells, anchor="bottom"):
    cells=[c for c in cells if c is not None]
    mw=max(c.width for c in cells); mh=max(c.height for c in cells)
    sh=Image.new("RGBA",(mw*len(cells),mh),(0,0,0,0))
    for i,c in enumerate(cells):
        oy=mh-c.height if anchor=="bottom" else (mh-c.height)//2
        sh.alpha_composite(c,(i*mw+(mw-c.width)//2,oy))
    sh.save(name)
    mag=Image.new("RGBA",sh.size,(255,0,255,255)); mag.alpha_composite(sh)
    sc=max(1,1300//sh.width); mag.resize((sh.width*sc,mh*sc),Image.NEAREST).convert("RGB").save("madara_war_work/_pm_"+name.replace(".png","")+".png")
    print(f"{name}: {len(cells)}f cell {mw}x{mh}")

# Summon smoke (5f puffs)
build("madara_summon_smoke_uniform.png", [crop(1352,1412,s,e) for s,e in [(181,369),(379,480),(500,556),(565,629),(150,172)]][:5], anchor="center")
# Gedo Mazo statue (1f)
build("madara_gedo_mazo_uniform.png", [crop(1418,1595, 9,152)], anchor="bottom")
# Kurama RUN (4f) — looming orange fox, green-cleaned
build("madara_kurama_uniform.png", [crop(4291,4794,s,e, degreen=True) for s,e in even(2,1325,4)], anchor="bottom")
# Bijuudama — sphere growth (8f) + burst — from the sphere strip
build("madara_bijuudama_uniform.png", [crop(5206,5440,s,e) for s,e in even(955,1420,8)], anchor="center")
# Kajukai Korin — flowering wood field (6f)
build("madara_kajukai_uniform.png", [crop(1898,2015,s,e) for s,e in even(2,1049,6)], anchor="bottom")
