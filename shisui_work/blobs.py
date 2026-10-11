import sys, numpy as np
sys.path.insert(0,'shisui_work')
import shslice as S
try:
    from scipy import ndimage
    HAVE=True
except Exception:
    HAVE=False

def blobs(f, min_area=180, min_w=8, min_h=14, x0=0,x1=None,y0=0,y1=None, tol=34):
    a=S.load(f); k=S.flood_key(a,tol); m=S.content_mask(k)
    H,W=m.shape
    if x1 is None:x1=W
    if y1 is None:y1=H
    sub=np.zeros_like(m); sub[y0:y1,x0:x1]=m[y0:y1,x0:x1]
    lbl,n=ndimage.label(sub)
    out=[]
    for i in range(1,n+1):
        ys,xs=np.where(lbl==i)
        bw=xs.max()-xs.min()+1; bh=ys.max()-ys.min()+1
        if bw*bh<min_area or bw<min_w or bh<min_h: continue
        out.append((int(xs.min()),int(xs.max())+1,int(ys.min()),int(ys.max())+1,len(ys)))
    return out,k

def cluster_rows(blist, yov=0.35):
    # sort by y, group blobs whose y-ranges overlap enough into rows
    bs=sorted(blist,key=lambda b:(b[2],b[0]))
    rows=[]
    for b in bs:
        placed=False
        for r in rows:
            ry0=min(x[2] for x in r); ry1=max(x[3] for x in r)
            ov=min(ry1,b[3])-max(ry0,b[2])
            if ov>0 and ov>=yov*min(ry1-ry0,b[3]-b[2]):
                r.append(b);placed=True;break
        if not placed: rows.append([b])
    for r in rows: r.sort(key=lambda b:b[0])
    rows.sort(key=lambda r:min(b[2] for b in r))
    return rows

if __name__=="__main__":
    f=sys.argv[1]; X0=int(sys.argv[2]);X1=int(sys.argv[3]);Y0=int(sys.argv[4]);Y1=int(sys.argv[5])
    bl,_=blobs(f,x0=X0,x1=X1,y0=Y0,y1=Y1)
    rows=cluster_rows(bl)
    for ri,r in enumerate(rows):
        yy0=min(b[2] for b in r);yy1=max(b[3] for b in r)
        xr=[(b[0],b[1]) for b in r]
        print(f"row{ri:2d} y{yy0:4d}-{yy1:4d} n={len(r):2d} x={xr}")
