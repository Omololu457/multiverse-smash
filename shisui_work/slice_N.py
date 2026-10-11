import sys; sys.path.insert(0,'shisui_work')
import shslice as S, numpy as np
from PIL import Image
N="shisui_uchiha_jonin_nzc_by_altair_by_altairframemaker_def0sq6.png"
a=S.load(N); k=S.flood_key(a)   # keyed once

def cut(name, specs, align='feet', pad=2):
    """specs: list of (x0,x1,y0,y1) rough windows; each tightened to content bbox."""
    cells=[]
    for (x0,x1,y0,y1) in specs:
        bb=S.bbox(k,x0,x1,y0,y1)
        if bb is None:
            print(f"  !! {name}: empty window {(x0,x1,y0,y1)}"); continue
        cells.append(bb)
    if not cells: print(f"  !! {name}: NO cells"); return
    im,cw,ch,n=S.repack(k,cells,pad=pad,align=align,out=f"shisui_trinity_{name}_uniform.png")
    print(f"  {name:22s} {n}f  {cw}x{ch}")

# ---- body / poses ----
cut("dash",  [(10,55,460,556),(130,188,460,556)])
cut("jump",  [(8,52,566,660),(52,94,566,660),(92,143,566,660)])
cut("guard", [(236,310,566,660)])
cut("hurt",  [(12,72,683,766),(70,110,683,766)])
cut("knockdown",[(44,115,788,858),(202,281,788,858)])
cut("getup", [(284,369,788,858)])
cut("win",   [(24,60,2638,2727)])
# ---- normals ----
cut("light", [(10,72,875,955),(100,201,875,955),(210,297,875,955)])
cut("up",    [(7,51,958,1047),(61,128,958,1047),(131,211,958,1047),(223,267,958,1047)])
cut("air",   [(18,78,1625,1729),(76,150,1625,1729),(175,255,1625,1729)])
# ---- special cast poses ----
cut("fireball",  [(9,60,1961,2053),(61,134,1961,2053),(137,210,1961,2053)])
cut("genjutsu",  [(20,55,2113,2200),(68,105,2113,2200)])
cut("flurry",    [(65,121,1060,1153),(126,200,1060,1153)])
cut("armslam",   [(26,74,1456,1600)])
cut("heavy",     [(26,74,1456,1600)])   # heavy = armslam pose (susanoo arm = code FX)
cut("susanoo",   [(24,72,2273,2436)])
# ---- sprite FX ----
cut("fireball_fx", [(315,400,1961,2053),(403,489,1961,2053),(492,581,1961,2053),(579,668,1961,2053)], align='center')
cut("susanoo_torso_fx", [(104,265,2273,2436),(264,407,2273,2436)], align='feet')
cut("susanoo_arm_fx",   [(79,259,1456,1622),(259,420,1456,1622)], align='center')
print("done")
