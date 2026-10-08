import numpy as np, json, os
from PIL import Image

T = "jiraiya_sage_mode_sprite_sheet_by_dantewreckmen_999_d93c7xy.png"
S = "jiraiya_sage_mode_short_sprite_sheet_by_dantewreckmen_999_d93ca2b.png"
OUT = "jiraiya_work"
os.makedirs(OUT, exist_ok=True)

def keyed(path, tol=60):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
    # flat green bg variants (0,128/129/130,0). distance to nearest of those.
    best = None
    for g in (128,129,130):
        bg = np.array([0,g,0])
        d = np.sqrt(((im-bg)**2).sum(2))
        best = d if best is None else np.minimum(best,d)
    keep = best > tol
    rgba = np.dstack([im.astype(np.uint8),(keep*255).astype(np.uint8)])
    # despill
    g_dom = (im[:,:,1] > im[:,:,0]+40) & (im[:,:,1] > im[:,:,2]+40) & keep
    rgba[:,:,1][g_dom] = np.maximum(im[:,:,0],im[:,:,2])[g_dom].astype(np.uint8)
    return rgba, keep

rgba,keep = keyed(T)
H,W = keep.shape
# row density profile
rowsum = keep.sum(1)
# print band transitions: runs of rows with content (density>threshold)
thr = 3
rowhas = rowsum>thr
bands=[]; s=-1; gap=0; GAP=6
for y in range(H):
    if rowhas[y]:
        if s<0: s=y
        gap=0
    else:
        if s>=0:
            gap+=1
            if gap>=GAP:
                bands.append((s,y-gap)); s=-1; gap=0
if s>=0: bands.append((s,H-1))
bands=[b for b in bands if b[1]-b[0]+1>=8]
print(f"T {W}x{H}: {len(bands)} content bands (gap>={GAP}, minh8)")
for i,(y0,y1) in enumerate(bands):
    sub=keep[y0:y1+1]
    cols=np.where(sub.any(0))[0]
    x0,x1=(int(cols.min()),int(cols.max())) if len(cols) else (0,0)
    print(f" band {i:2d} y{y0:4d}-{y1:4d} h{y1-y0+1:3d} x{x0:4d}-{x1:4d} dens{int(rowsum[y0:y1+1].mean())}")
json.dump([[int(a),int(b)] for a,b in bands], open(f"{OUT}/T_bands.json","w"))
