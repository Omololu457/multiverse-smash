from PIL import Image
import sys
sys.setrecursionlimit(10**7)
im=Image.open('superman_jus_addons_by_planeptunearte_deaeqvi.png').convert('RGBA')
w,h=im.size; px=im.load()
BG=(114,114,114); TOL=40
def isbg(p):
    return abs(p[0]-BG[0])<=TOL and abs(p[1]-BG[1])<=TOL and abs(p[2]-BG[2])<=TOL and abs(p[0]-p[1])<14 and abs(p[1]-p[2])<14
fg=bytearray(w*h)
for y in range(h):
    for x in range(w):
        p=px[x,y]
        if p[3]>20 and not isbg(p): fg[y*w+x]=1
# iterative flood fill CC (8-connective)
lab=[-1]*(w*h); comps=[]
from collections import deque
for sy in range(h):
    for sx in range(w):
        i=sy*w+sx
        if fg[i] and lab[i]<0:
            q=deque([i]); lab[i]=len(comps)
            minx=maxx=sx; miny=maxy=sy; cnt=0
            while q:
                j=q.popleft(); cnt+=1
                jy,jx=divmod(j,w)
                if jx<minx:minx=jx
                if jx>maxx:maxx=jx
                if jy<miny:miny=jy
                if jy>maxy:maxy=jy
                for dy in(-1,0,1):
                    for dx in(-1,0,1):
                        ny,nx=jy+dy,jx+dx
                        if 0<=nx<w and 0<=ny<h:
                            k=ny*w+nx
                            if fg[k] and lab[k]<0: lab[k]=len(comps); q.append(k)
            comps.append([minx,miny,maxx,maxy,cnt])
# keep sizable comps
comps=[c for c in comps if c[4]>=80]
comps.sort(key=lambda c:(c[1],c[0]))
print("comps:",len(comps))
# group into row bands by y-overlap
bands=[]
for c in comps:
    placed=False
    for b in bands:
        # overlap if vertical center within band's y-range
        cy=(c[1]+c[3])/2
        if b['y0']-15<=cy<=b['y1']+15:
            b['items'].append(c); b['y0']=min(b['y0'],c[1]); b['y1']=max(b['y1'],c[3]); placed=True; break
    if not placed:
        bands.append({'y0':c[1],'y1':c[3],'items':[c]})
bands.sort(key=lambda b:b['y0'])
for bi,b in enumerate(bands):
    its=sorted(b['items'],key=lambda c:c[0])
    print(f"ROW {bi+1}: y[{b['y0']}-{b['y1']}] comps={len(its)}")
    for c in its:
        print(f"    box x[{c[0]}-{c[2]}] w={c[2]-c[0]+1} y[{c[1]}-{c[3]}] h={c[3]-c[1]+1} px={c[4]}")
