import sys; sys.path.insert(0,'shisui_work')
import shslice as S
J="uchiha_shisui_jus_by_thegodgeminis_d843ju8.png"
a=S.load(J); k=S.flood_key(a)
def cut(name,specs,align='feet',pad=2):
    cells=[S.bbox(k,*s) for s in specs]; cells=[c for c in cells if c]
    if not cells: print(f"  !! {name} empty"); return
    im,cw,ch,n=S.repack(k,cells,pad=pad,align=align,out=f"shisui_puppeteer_{name}_uniform.png")
    print(f"  {name:12s} {n}f {cw}x{ch}")
# body (stand y33-95; 3 figures)
cut("idle",  [(10,70,33,96),(82,150,33,96),(158,215,33,96)])
cut("run",   [(10,66,118,183),(76,125,118,183),(139,182,118,183),(196,241,118,183),(258,313,118,183),(326,375,118,183),(389,432,118,183),(451,497,118,183)])
cut("jump",  [(10,66,186,290),(74,130,186,290),(138,198,186,290),(206,268,186,290),(276,338,186,290),(346,404,186,290),(460,520,186,290),(536,598,186,290)])
cut("guard", [(10,48,324,379),(60,95,324,379),(109,150,324,379)])
cut("hurt",  [(10,51,401,474),(54,98,401,474),(111,152,401,474),(165,196,401,474)])
cut("knockdown",[(205,270,401,474),(287,345,401,474)])
cut("getup", [(641,680,401,474)])
# normals
cut("light", [(14,52,611,666),(70,108,611,666),(124,186,611,666),(258,299,611,666)])
cut("heavy", [(14,55,696,751),(57,118,696,751),(120,198,696,751),(199,274,696,751),(272,314,696,751)])
cut("up",    [(16,54,780,856),(66,133,780,856),(148,211,780,856),(215,268,780,856),(279,315,780,856)])
cut("crouchLight",[(14,60,888,937),(74,146,888,937),(159,232,888,937)])
# air = Jump+B (need coords — try the Jump+B row near y980? Actually Jump+Y region. Use a jump frame for air.)
cut("air",   [(206,268,186,290),(276,338,186,290),(346,404,186,290)])
print("done J body/normals")
