#!/usr/bin/env python3
"""Slice the Raiton-set specials from exact per-frame boxes (from the visual audit). CHAR cast poses
feet-aligned; FX layers center-packed (imported as projectile sheets)."""
import numpy as np, json
from PIL import Image
RGBA=np.asarray(Image.open("tools/sasuke_sensei/S_keyed.png")); PAD=3
def emit(name, boxes, align="feet"):
    full=Image.fromarray(RGBA,"RGBA"); frs=[full.crop((x0,y0,x1,y1)) for (x0,y0,x1,y1) in boxes]
    h=max(f.height for f in frs); cw=max(f.width for f in frs)+2*PAD
    sheet=Image.new("RGBA",(cw*len(frs),h),(0,0,0,0))
    for i,f in enumerate(frs):
        dx=i*cw+(cw-f.width)//2; dy=(h-f.height) if align=="feet" else (h-f.height)//2
        sheet.paste(f,(dx,dy),f)
    out=f"sasuke_sensei_{name}_uniform.png"; sheet.save(out)
    print(f"  {out:46s} {len(frs)}f {cw}x{h}")
    return {"frames":len(frs),"width":int(cw),"height":int(h),"sheet":f"./{out}"}
# CHAR cast poses (feet-aligned)
CHAR={
 'chidori_cast':[(13,3702,64,3756),(81,3703,134,3757),(142,3698,207,3770),(225,3698,323,3763),(346,3696,441,3768),(451,3696,550,3768),(561,3696,656,3768),(661,3696,756,3768)],
 'chidori_air':[(32,3856,102,3918),(123,3858,221,3923),(242,3856,340,3921)],
 'chidori_eisou_cast':[(28,4845,83,4918),(94,4843,152,4916),(168,4848,251,4917),(264,4853,350,4920),(364,4852,440,4919),(484,4843,565,4927),(580,4843,664,4927),(686,4851,761,4921)],
 'raiton_sword1_cast':[(19,5384,77,5458),(79,5384,168,5461)],
 'raiton_sword2_cast':[(203,5408,273,5466),(302,5403,388,5463),(410,5396,500,5461),(517,5404,573,5464)],
 'raiton_sword3_cast':[(626,5392,735,5463),(746,5392,847,5463),(864,5392,933,5463)],
 'kirin_fire_cast':[(20,4044,77,4111),(103,4012,157,4110),(176,4012,228,4110)],
 'kirin_control_cast':[(21,4182,66,4278),(75,4182,126,4278),(146,4208,231,4275),(241,4204,311,4271)],
}
# FX layers (center-packed projectiles)
FX={
 'fx_chidori_bolt':[(33,3782,63,3805),(79,3783,125,3826),(142,3779,190,3814),(202,3782,258,3814)],
 'fx_chidori_spark':[(798,3732,870,3770),(892,3733,962,3769),(980,3732,1017,3763)],
 'fx_eisou_spear':[(169,4957,192,4979),(207,4956,231,4979),(248,4959,268,4979),(310,4956,337,4976),(348,4963,402,4969)],
 'fx_raiton_sword1':[(27,5509,75,5539),(85,5509,133,5539)],
 'fx_raiton_sword2':[(6,5593,56,5630),(65,5593,111,5630),(122,5593,173,5630),(185,5593,235,5628)],
 'fx_raiton_sword3':[(33,5664,119,5713),(133,5664,206,5713),(214,5667,290,5713),(299,5662,374,5711),(396,5662,472,5711),(480,5662,569,5700),(577,5667,653,5706),(662,5666,749,5707)],
 'fx_kirin_fireball':[(280,4032,285,4038),(306,4029,321,4042),(343,4020,373,4050)],
 'fx_kirin_dragon':[(394,4012,448,4064),(460,4014,518,4069),(538,4012,587,4062)],
 'fx_kirin_pillars':[(349,4292,379,4356),(392,4292,420,4356),(433,4292,459,4356),(474,4292,498,4356)],
}
meta={}
for n,b in CHAR.items(): meta[n]=emit(n,b,"feet")
for n,b in FX.items(): meta[n]=emit(n,b,"center")
json.dump(meta,open("tools/sasuke_sensei/raiton_meta.json","w"),indent=1)
print(f"\nwrote {len(meta)} Raiton sheets")
