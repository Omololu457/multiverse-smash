#!/usr/bin/env python3
# Green Arrow alt-color skins — TARGETED costume recolor (hue-keyed), art-safe (tints only, no repaint).
# Costume green = hue ~80-140; skin/bow are warm (hue ~20) and are LEFT UNTOUCHED.
import sys, glob, numpy as np
from PIL import Image

def rgb_to_hsv(a):  # a: HxWx3 float 0..1 -> h(0..1),s,v
    mx=a.max(-1); mn=a.min(-1); df=mx-mn+1e-9
    v=mx; s=np.where(mx>0, df/ (mx+1e-9), 0)
    r,g,b=a[...,0],a[...,1],a[...,2]
    h=np.zeros_like(mx)
    mask=df>1e-6
    rc=((mx-r)/df); gc=((mx-g)/df); bc=((mx-b)/df)
    h=np.where(mx==r,(bc-gc),np.where(mx==g,2+rc-bc,4+gc-rc))
    h=(h/6.0)%1.0
    return h,s,v

def hsv_to_rgb(h,s,v):
    i=np.floor(h*6).astype(int); f=h*6-i
    p=v*(1-s); q=v*(1-f*s); t=v*(1-(1-f)*s); i=i%6
    r=np.choose(i,[v,q,p,p,t,v]); g=np.choose(i,[t,v,v,q,p,p]); b=np.choose(i,[p,p,t,v,v,q])
    return np.stack([r,g,b],-1)

# recipe: hue_lo/hi select costume; to_hue sets target hue (preserve value); sat_set/val_mul tweak.
def recolor(img, rec):
    arr=np.array(img.convert("RGBA")).astype(float); rgb=arr[...,:3]/255; al=arr[...,3]
    h,s,v=rgb_to_hsv(rgb)
    if rec.get("crush"):   # Alien X — void-crush the whole body to near-black (starfield overlays it)
        sel=al>40
        nv=np.clip(v*0.18+0.02,0,1); ns=np.clip(s*0.25,0,1)
        out=hsv_to_rgb(h,ns,nv); rgb=np.where(sel[...,None],out,rgb)
    else:
        lo,hi=rec["hue_lo"]/360,rec["hue_hi"]/360
        sel=(al>40)&(s>rec.get("min_sat",0.30))&(h>=lo)&(h<=hi)
        nh=np.full_like(h, rec["to_hue"]/360)
        ns=np.clip(s*rec.get("sat_mul",1.0),0,1)
        if rec.get("sat_set") is not None: ns=np.full_like(s, rec["sat_set"])
        nv=np.clip(v*rec.get("val_mul",1.0)+rec.get("val_add",0.0),0,1)
        out=hsv_to_rgb(nh,ns,nv); rgb=np.where(sel[...,None],out,rgb)
    arr[...,:3]=np.clip(rgb*255,0,255)
    return Image.fromarray(arr.astype(np.uint8),"RGBA")

SKINS={
 "red":        dict(hue_lo=75,hue_hi=155,to_hue=0,  sat_mul=1.05),                 # Red Arrow
 "deathstroke":dict(hue_lo=75,hue_hi=155,to_hue=26, sat_mul=1.0, val_mul=0.9),     # orange (approx)
 "neonpink":   dict(hue_lo=75,hue_hi=155,to_hue=322,sat_set=0.95,val_mul=1.18),    # neon pink
 "modern":     dict(hue_lo=75,hue_hi=155,to_hue=170,sat_mul=0.55,val_mul=0.55),    # dark sleek suit
 "ben10":      dict(hue_lo=75,hue_hi=155,to_hue=95, sat_set=0.85,val_mul=1.18),    # vivid lime (Ben 10)
 "albedo":     dict(hue_lo=75,hue_hi=155,to_hue=0,  sat_set=0.08,val_mul=1.25),    # pale gray body (Albedo)
 "valkyrie":   dict(hue_lo=75,hue_hi=155,to_hue=215,sat_mul=1.0, val_mul=1.0),     # blue (Winning Valkyrie)
 "alienx":     dict(crush=True),                                                    # void body + starfield
}

sheets=sorted(glob.glob("green_arrow_*_uniform.png"))+["green_arrow_portrait.png"]
sheets=[s for s in sheets if "__" not in s and __import__("os").path.exists(s)]
tags=sys.argv[1:] or list(SKINS)
n=0
for tag in tags:
    rec=SKINS[tag]
    for sh in sheets:
        out=sh.replace(".png",f"__{tag}.png")
        recolor(Image.open(sh),rec).save(out); n+=1
    print(f"  {tag}: {len(sheets)} sheets")
print(f"done — {n} files for {len(tags)} skins over {len(sheets)} sheets")
