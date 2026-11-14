from PIL import Image
import sys
im=Image.open('superman_jus_addons_by_planeptunearte_deaeqvi.png').convert('RGBA')
w,h=im.size; px=im.load()
BG=(114,114,114); TOL=40
def isbg(p):
    return abs(p[0]-BG[0])<=TOL and abs(p[1]-BG[1])<=TOL and abs(p[2]-BG[2])<=TOL and abs(p[0]-p[1])<12 and abs(p[1]-p[2])<12
# build fg mask
fg=[[0]*w for _ in range(h)]
for y in range(h):
    for x in range(w):
        p=px[x,y]
        if p[3]>20 and not isbg(p): fg[y][x]=1
# row bands: rows with any fg
rowhas=[any(fg[y]) for y in range(h)]
bands=[]
y=0
while y<h:
    if rowhas[y]:
        y0=y
        while y<h and rowhas[y]: y+=1
        bands.append((y0,y-1))
    else: y+=1
print("ROW BANDS:",len(bands))
# within each band, find x column clusters (frames) by column occupancy with gap split
import numpy as np
for bi,(y0,y1) in enumerate(bands):
    colhas=[any(fg[y][x] for y in range(y0,y1+1)) for x in range(w)]
    segs=[]; x=0
    while x<w:
        if colhas[x]:
            x0=x
            while x<w and colhas[x]: x+=1
            segs.append((x0,x-1))
        else: x+=1
    # merge segments separated by small gaps (<6px) -> same frame (cape detach)
    merged=[]
    for s in segs:
        if merged and s[0]-merged[-1][1]<=5: merged[-1]=(merged[-1][0],s[1])
        else: merged.append(list(s))
    print(f"band {bi+1}: y[{y0}-{y1}] h={y1-y0+1} frames={len(merged)} xranges={[(a,b,b-a+1) for a,b in merged]}")
