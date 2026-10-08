# Config-driven slicer: crop action region from keyed sheet, auto-detect frames, repack to uniform strip.
# Mirrors tools/repack_jesus.py frame logic. Character BODY frames only; FX rendered procedurally.
import numpy as np, json, os, sys
from PIL import Image
OUT="jiraiya_slices"; WORK="jiraiya_work"
os.makedirs(OUT,exist_ok=True)
Tk=Image.open(f"{WORK}/T_keyed.png").convert("RGBA")
Sk=Image.open(f"{WORK}/S_keyed.png").convert("RGBA")
SHEETS={"T":Tk,"S":Sk}

def frames_of(a, min_w=6, min_area=120, gap=2):
    # column runs with small-gap bridging
    col=a.any(0)
    runs=[]; s=-1; g=0
    for i,v in enumerate(col):
        if v:
            if s<0: s=i
            g=0
        else:
            if s>=0:
                g+=1
                if g>gap: runs.append((s,i-g)); s=-1; g=0
    if s>=0: runs.append((s,len(col)-1))
    out=[]
    for x0,x1 in runs:
        if x1-x0+1<min_w: continue
        sub=a[:,x0:x1+1]; ys=np.where(sub.any(1))[0]
        if len(ys)==0: continue
        y0,y1=int(ys[0]),int(ys[-1])
        if (x1-x0+1)*(y1-y0+1)<min_area: continue
        out.append((x0,y0,x1,y1))
    return out

def do(cfg):
    sh=SHEETS[cfg.get("sheet","T")]
    x0,y0,x1,y1=cfg["x0"],cfg["y0"],cfg["x1"],cfg["y1"]
    reg=sh.crop((x0,y0,x1,y1))
    a=np.asarray(reg)[:,:,3]>16
    boxes=frames_of(a, min_w=cfg.get("min_w",6), min_area=cfg.get("min_area",120), gap=cfg.get("gap",2))
    # drop short-height debris relative to median
    if boxes:
        hs=sorted([b[3]-b[1]+1 for b in boxes]); med=hs[len(hs)//2]
        boxes=[b for b in boxes if (b[3]-b[1]+1)>=cfg.get("hfrac",0.45)*med]
    if "take" in cfg: boxes=boxes[cfg["take"][0]:cfg["take"][1]]
    crops=[reg.crop((b[0],b[1],b[2]+1,b[3]+1)) for b in boxes]
    if not crops:
        print(f"!! {cfg['name']}: NO FRAMES"); return None
    cw=max(c.width for c in crops); ch=max(c.height for c in crops)
    strip=Image.new("RGBA",(cw*len(crops),ch),(0,0,0,0))
    for i,c in enumerate(crops): strip.alpha_composite(c,(i*cw+(cw-c.width)//2, ch-c.height))
    outp=f"{OUT}/jiraiya_{cfg['name']}_uniform.png"; strip.save(outp)
    print(f"{cfg['name']:14s} frames={len(crops):2d} w={cw:3d} h={ch:3d} widths={[c.width for c in crops]}")
    return {"name":cfg["name"],"frames":len(crops),"width":cw,"height":ch}

if __name__=="__main__":
    cfg=json.load(open(sys.argv[1]))
    res=[do(c) for c in cfg]
    json.dump([r for r in res if r], open(f"{OUT}/_built.json","w"), indent=1)
