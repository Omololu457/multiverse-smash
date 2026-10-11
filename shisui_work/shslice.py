"""Shisui shared slicer: border flood-fill navy key (preserves interior navy px),
island frame detection, feet-aligned uniform repack. FX blocks via luminance alpha."""
import numpy as np
from PIL import Image
from collections import deque

NAVY=np.array([0,64,128])

def load(f):
    return np.array(Image.open(f).convert("RGBA"))

def flood_key(a, tol=34):
    """Flood-fill from all 4 borders over navy-ish pixels -> alpha 0. Interior navy survives."""
    h,w=a.shape[:2]
    r,g,b=a[...,0].astype(int),a[...,1].astype(int),a[...,2].astype(int)
    navy=(np.abs(r-NAVY[0])<tol)&(np.abs(g-NAVY[1])<tol)&(np.abs(b-NAVY[2])<tol)
    visited=np.zeros((h,w),bool)
    dq=deque()
    for x in range(w):
        for y in (0,h-1):
            if navy[y,x] and not visited[y,x]: visited[y,x]=True; dq.append((y,x))
    for y in range(h):
        for x in (0,w-1):
            if navy[y,x] and not visited[y,x]: visited[y,x]=True; dq.append((y,x))
    while dq:
        y,x=dq.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and not visited[ny,nx] and navy[ny,nx]:
                visited[ny,nx]=True; dq.append((ny,nx))
    out=a.copy()
    out[visited,3]=0
    return out

def content_mask(a):
    return a[...,3]>16

def col_islands(mask,y0,y1,x0=0,x1=None,min_w=3,gap=4):
    if x1 is None: x1=mask.shape[1]
    sub=mask[y0:y1, x0:x1]
    cols=sub.any(axis=0)
    isl=[]; s=None; g=0
    for i,v in enumerate(cols):
        if v:
            if s is None: s=i
            g=0
        else:
            if s is not None:
                g+=1
                if g>=gap: isl.append((x0+s,x0+i-g+1)); s=None; g=0
    if s is not None: isl.append((x0+s,x0+len(cols)-1))
    return [(a_,b_) for a_,b_ in isl if b_-a_>=min_w]

def bbox(a, rx0,rx1, ry0,ry1):
    sub=a[ry0:ry1, rx0:rx1]
    m=sub[...,3]>16
    ys=np.where(m.any(axis=1))[0]; xs=np.where(m.any(axis=0))[0]
    if not len(ys) or not len(xs): return None
    return (rx0+int(xs.min()), rx0+int(xs.max())+1, ry0+int(ys.min()), ry0+int(ys.max())+1)

def repack(a, cells, pad=2, align='feet', out=None, bg_report=False):
    """cells: list of (x0,x1,y0,y1) content bboxes. Uniform strip, bottom(feet)-aligned."""
    crops=[a[y0:y1,x0:x1] for (x0,x1,y0,y1) in cells]
    cw=max(c.shape[1] for c in crops)+pad*2
    ch=max(c.shape[0] for c in crops)+pad*2
    strip=np.zeros((ch, cw*len(crops),4),np.uint8)
    for i,c in enumerate(crops):
        hh,ww=c.shape[:2]
        ox=i*cw+(cw-ww)//2
        oy=(ch-hh-pad) if align=='feet' else (ch-hh)//2
        strip[oy:oy+hh, ox:ox+ww]=c
    im=Image.fromarray(strip,"RGBA")
    if out: im.save(out)
    return im, cw, ch, len(crops)

def lum_alpha(a, y0,y1, x0,x1, thresh=24):
    """FX on black square: alpha = luminance (additive-style). Returns RGBA crop."""
    sub=a[y0:y1,x0:x1,:3].astype(float)
    lum=(0.299*sub[...,0]+0.587*sub[...,1]+0.114*sub[...,2])
    al=np.clip(lum,0,255).astype(np.uint8)
    al[al<thresh]=0
    out=np.dstack([a[y0:y1,x0:x1,:3], al]).astype(np.uint8)
    return out

def force_n(islands, n):
    """Split widest / merge narrowest to reach exactly n islands."""
    isl=[list(i) for i in islands]
    # merge nearest pairs if too many
    while len(isl)>n:
        # merge the pair with smallest gap
        gaps=[(isl[i+1][0]-isl[i][1], i) for i in range(len(isl)-1)]
        gaps.sort(); _,i=gaps[0]
        isl[i]=[isl[i][0], isl[i+1][1]]; del isl[i+1]
    # split widest if too few
    while len(isl)<n:
        widths=[(isl[i][1]-isl[i][0], i) for i in range(len(isl))]
        widths.sort(reverse=True); _,i=widths[0]
        x0,x1=isl[i]; mid=(x0+x1)//2
        isl[i]=[x0,mid]; isl.insert(i+1,[mid,x1])
    return [tuple(i) for i in isl]
