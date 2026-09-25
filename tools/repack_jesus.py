import numpy as np, sys, json
from PIL import Image
def frames_of(a, min_w=5, min_area=40):
    col=a.any(0); runs=[]; s=-1
    for i,v in enumerate(col):
        if v and s<0: s=i
        elif not v and s>=0: runs.append((s,i-1)); s=-1
    if s>=0: runs.append((s,len(col)-1))
    out=[]
    for x0,x1 in runs:
        if x1-x0+1<min_w: continue
        sub=a[:,x0:x1+1]; ys=np.where(sub.any(1))[0]
        if len(ys)==0: continue
        y0,y1=ys[0],ys[-1]
        if (x1-x0+1)*(y1-y0+1)<min_area: continue
        out.append((x0,y0,x1,y1))
    return out
def repack(j):
    im=Image.open(j["in"]).convert("RGBA")
    W,H=im.size
    top=j.get("top",0); bot=j.get("bot",0)
    im=im.crop((0,top,W,H-bot))
    a=np.asarray(im)[:,:,3]>16
    boxes=frames_of(a)
    hs=sorted([b[3]-b[1]+1 for b in boxes]); med=hs[len(hs)//2] if hs else 0
    boxes=[b for b in boxes if (b[3]-b[1]+1)>=0.5*med]           # drop short label/FX debris
    if "take" in j: boxes=boxes[j["take"][0]:j["take"][1]]        # frame subset
    crops=[im.crop((x0,y0,x1+1,y1+1)) for x0,y0,x1,y1 in boxes]
    if not crops: print("!! no frames",j["out"]); return None
    cw=max(c.width for c in crops); ch=max(c.height for c in crops)
    sh=Image.new("RGBA",(cw*len(crops),ch),(0,0,0,0))
    for i,c in enumerate(crops): sh.alpha_composite(c,(i*cw+(cw-c.width)//2, ch-c.height))
    sh.save(j["out"])
    return {"action":j["out"],"frames":len(crops),"width":cw,"height":ch}
if __name__=="__main__":
    res=[repack(j) for j in json.loads(sys.argv[1])]
    for r in res:
        if r: print(f'{r["action"]:34s} frames={r["frames"]:2d} width={r["width"]:3d} height={r["height"]:3d}')
