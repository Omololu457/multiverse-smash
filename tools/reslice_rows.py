# Row-aware reslicer: slice a multi-row sheet into a single uniform, feet-aligned
# horizontal strip (rows concatenated top→bottom, frames left→right within each row).
# Usage: python3 tools/reslice_rows.py <src.png> <out.png> "y0-y1,y0-y1,..." [minw]
import sys
from PIL import Image
src, out, bands = sys.argv[1], sys.argv[2], sys.argv[3]
MINW = int(sys.argv[4]) if len(sys.argv) > 4 else 4
ALPHA = 16
im = Image.open(src).convert("RGBA"); W,H = im.size; px = im.load()
def solid(x,y): return px[x,y][3] > ALPHA
rows = [tuple(int(v) for v in b.split("-")) for b in bands.split(",")]
frames = []  # (sx,sy,sw,sh)
for (ry0, ry1) in rows:
    col = [sum(1 for y in range(ry0,ry1+1) if solid(x,y)) for x in range(W)]
    runs=[]; s=None
    for x in range(W):
        if col[x]>0:
            if s is None: s=x
        elif s is not None: runs.append((s,x-1)); s=None
    if s is not None: runs.append((s,W-1))
    runs=[r for r in runs if (r[1]-r[0]+1)>=MINW]
    for (x0,x1) in runs:
        miny,maxy=ry1,ry0
        for y in range(ry0,ry1+1):
            for x in range(x0,x1+1):
                if solid(x,y):
                    miny=min(miny,y); maxy=max(maxy,y); break
        frames.append((x0,miny,x1-x0+1,maxy-miny+1))
uW = max(f[2] for f in frames)+2; uH = max(f[3] for f in frames)+2
strip = Image.new("RGBA",(uW*len(frames),uH),(0,0,0,0))
for i,(sx,sy,sw,sh) in enumerate(frames):
    cell = im.crop((sx,sy,sx+sw,sy+sh))
    dx = i*uW + (uW-sw)//2; dy = uH-sh-1
    strip.paste(cell,(dx,dy),cell)
strip.save(out)
print(f"{out}: {len(frames)} frames, cell {uW}x{uH}")
