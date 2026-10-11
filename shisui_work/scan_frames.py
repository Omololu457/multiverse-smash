import sys, numpy as np
sys.path.insert(0,'shisui_work')
import shslice as S
from scipy import ndimage

# (sheet, frames) table from characters.js
import subprocess, json
TABLE = """4 shisui_blade_air_uniform.png
3 shisui_blade_feint_uniform.png
8 shisui_blade_finisher_uniform.png
1 shisui_blade_focus_uniform.png
1 shisui_blade_getup_uniform.png
1 shisui_blade_guard_uniform.png
4 shisui_blade_heavy_uniform.png
2 shisui_blade_hurt_uniform.png
4 shisui_blade_iaido_uniform.png
2 shisui_blade_idle_uniform.png
4 shisui_blade_jump_uniform.png
2 shisui_blade_knockdown_uniform.png
3 shisui_blade_kunai_uniform.png
4 shisui_blade_light_uniform.png
6 shisui_blade_run_uniform.png
4 shisui_blade_up_uniform.png
2 shisui_blade_win_uniform.png
3 shisui_puppeteer_air_uniform.png
4 shisui_puppeteer_cast_uniform.png
3 shisui_puppeteer_crouchLight_uniform.png
1 shisui_puppeteer_getup_uniform.png
3 shisui_puppeteer_guard_uniform.png
5 shisui_puppeteer_heavy_uniform.png
4 shisui_puppeteer_hurt_uniform.png
3 shisui_puppeteer_idle_uniform.png
8 shisui_puppeteer_jump_uniform.png
2 shisui_puppeteer_knockdown_uniform.png
4 shisui_puppeteer_light_uniform.png
4 shisui_puppeteer_lose_uniform.png
8 shisui_puppeteer_run_uniform.png
5 shisui_puppeteer_up_uniform.png
2 shisui_puppeteer_win_uniform.png
3 shisui_trinity_air_uniform.png
1 shisui_trinity_armslam_uniform.png
1 shisui_trinity_charge_uniform.png
2 shisui_trinity_dash_uniform.png
3 shisui_trinity_fireball_uniform.png
2 shisui_trinity_flurry_uniform.png
1 shisui_trinity_genjutsu_uniform.png
1 shisui_trinity_getup_uniform.png
1 shisui_trinity_guard_uniform.png
1 shisui_trinity_heavy_uniform.png
2 shisui_trinity_hurt_uniform.png
1 shisui_trinity_idle_uniform.png
3 shisui_trinity_jump_uniform.png
2 shisui_trinity_knockdown_uniform.png
3 shisui_trinity_light_uniform.png
6 shisui_trinity_run_uniform.png
1 shisui_trinity_susanoo_uniform.png
4 shisui_trinity_up_uniform.png
1 shisui_trinity_win_uniform.png
"""
rows=[l.split() for l in TABLE.strip().splitlines()]
issues=0; checked=0
for frames_s, name in rows:
    frames=int(frames_s)
    try:
        a=S.load(name)
    except Exception as e:
        print(f"[MISSING] {name}: {e}"); issues+=1; continue
    k=S.flood_key(a,34); m=S.content_mask(k)
    H,W=m.shape
    checked+=1
    notes=[]
    if W % frames != 0:
        notes.append(f"NON-UNIFORM W={W} not divisible by frames={frames} (fw={W/frames:.1f})")
    fw=W//frames
    for fi in range(frames):
        cell=m[:, fi*fw:(fi+1)*fw]
        lbl,n=ndimage.label(cell)
        big=[]
        for i in range(1,n+1):
            ys,xs=np.where(lbl==i)
            bw=xs.max()-xs.min()+1; bh=ys.max()-ys.min()+1; area=len(ys)
            if area>=150 and bw>=6 and bh>=12:
                big.append((area,int(xs.min()),int(xs.max())+1,int(ys.min()),int(ys.max())+1))
        if not big:
            notes.append(f"f{fi}:EMPTY"); continue
        big.sort(reverse=True)
        # doubles: 2nd blob >= 45% of largest area AND horizontally separate (not overlapping x much)
        if len(big)>=2:
            a0=big[0][0]; a1=big[1][0]
            x0a,x1a=big[0][1],big[0][2]; x0b,x1b=big[1][1],big[1][2]
            xov=max(0,min(x1a,x1b)-max(x0a,x0b))
            if a1>=0.45*a0 and xov < 0.35*min(x1a-x0a, x1b-x0b):
                notes.append(f"f{fi}:DOUBLE? big2={a1}/{a0} xsep gapblobs={len(big)}")
        # figure fill span (feet alignment / off-cell)
        fy1=max(b[4] for b in big)
        if fy1 < H*0.6:
            notes.append(f"f{fi}:FLOAT bottom={fy1}/{H}")
    if notes:
        issues+=1
        print(f"[CHECK] {name} (frames={frames}):")
        for nt in notes: print("    -",nt)
print(f"\n== scanned {checked} sheets, {issues} with notes ==")
