# tools/reslice_jesus.py — slice the Jesus JUS sheet into per-row action strips + effect clusters.
# Source: jesus_christ_sprite_sheet_jus_by_xxalexsmashxx_dgsphko.png (2052x2852, flat JUS-green, no alpha).
# STEP1 green-key + de-spill -> RGBA.  STEP2 auto-detect horizontal row bands in the LEFT sprite column
# (green-gap separated).  STEP3 crop each band to the leftmost contiguous sprite cluster (drop far-right art).
# Honest: emits a manifest of detected bands (y0,y1,frames) so rows can be mapped to states by inspection.
import numpy as np, json, os
from PIL import Image

SRC = "jesus_christ_sprite_sheet_jus_by_xxalexsmashxx_dgsphko.png"
OUT = "jesus_slices"
BG  = np.array([0,128,0]); TOL = 70
LEFTX0, LEFTX1 = 4, 700          # left sprite column (character frames live here; effects start ~x1000)
ROW_GAP = 10                      # min green rows to separate two action bands
MIN_BAND_H = 16                   # drop label-text bands (short)

os.makedirs(OUT, exist_ok=True)
im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int16)
dist = np.sqrt(((im-BG)**2).sum(2))
keep = dist > TOL
rgba = np.dstack([im.astype(np.uint8), (keep*255).astype(np.uint8)])
# de-spill green halo on kept edge pixels
g_dom = (im[:,:,1] > im[:,:,0]+40) & (im[:,:,1] > im[:,:,2]+40) & keep
rgba[:,:,1][g_dom] = np.maximum(im[:,:,0], im[:,:,2])[g_dom].astype(np.uint8)
H,W = keep.shape

def content_cols(mask):  # column runs -> clusters
    col = mask.any(0); runs=[]; s=-1
    for i,v in enumerate(col):
        if v and s<0: s=i
        elif not v and s>=0: runs.append([s,i-1]); s=-1
    if s>=0: runs.append([s,len(col)-1])
    return runs

# ── detect row bands in the LEFT column ──
leftmask = keep[:, LEFTX0:LEFTX1]
rowhas = leftmask.any(1)
bands=[]; s=-1; gap=0
for y in range(H):
    if rowhas[y]:
        if s<0: s=y
        gap=0
    else:
        if s>=0:
            gap+=1
            if gap>=ROW_GAP:
                bands.append([s, y-gap]); s=-1; gap=0
if s>=0: bands.append([s, H-1])
bands=[b for b in bands if b[1]-b[0]+1 >= MIN_BAND_H]

manifest=[]
for i,(y0,y1) in enumerate(bands):
    # leftmost contiguous cluster of frames in this band (stop at first big green x-gap)
    sub = keep[y0:y1+1, LEFTX0:LEFTX1]
    runs = content_cols(sub)
    if not runs: continue
    x0 = runs[0][0]+LEFTX0; xr = runs[0][1]+LEFTX0
    for r in runs[1:]:
        if (r[0]+LEFTX0) - xr - 1 >= 40: break
        xr = r[1]+LEFTX0
    crop = rgba[y0:y1+1, x0:xr+1]
    # frame count via alpha gutters
    m = crop[:,:,3]>16; cc = content_cols(m[np.newaxis].any(0) if False else m)
    fcount = len([r for r in cc if r[1]-r[0]+1>=6])
    name=f"jesus_row_{i:02d}.png"
    Image.fromarray(crop,"RGBA").save(f"{OUT}/{name}")
    manifest.append({"row":i,"file":name,"y0":int(y0),"y1":int(y1),"h":int(y1-y0+1),"x0":int(x0),"x1":int(xr),"w":int(xr-x0+1),"frames_est":fcount})

json.dump(manifest, open(f"{OUT}/_manifest.json","w"), indent=1)
print(f"detected {len(manifest)} left-column row bands -> {OUT}/")
for m in manifest: print(f"  row {m['row']:2d}  y{m['y0']:4d}-{m['y1']:4d} h{m['h']:3d}  w{m['w']:4d}  ~{m['frames_est']}f  {m['file']}")
