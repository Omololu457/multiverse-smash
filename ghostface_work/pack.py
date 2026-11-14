import numpy as np, json
from PIL import Image

out = np.array(Image.open("ghostface_work/_keyed.png").convert("RGBA"))
H,W = out.shape[:2]
content = out[:,:,3] > 16
ROWS = json.load(open("ghostface_work/_rows.json"))  # [ [y0,y1,[[c0,c1],...]], ... ]

# force-split R6 (index 6) second frame (wide aerial pair) at its occupancy valley midpoint
def force_split_mid(y0,y1,c0,c1):
    sub=content[y0:y1+1,c0:c1+1]; col=sub.sum(axis=0).astype(float)
    k=5; sm=np.convolve(col,np.ones(k)/k,mode='same')
    w=len(col); m=w//4
    cut=m+int(np.argmin(sm[m:w-m]))
    return [(c0,c0+cut-1),(c0+cut,c1)]

y0,y1,frames = ROWS[6]
if len(frames)==2 and (frames[1][1]-frames[1][0]+1) > 150:
    f0=frames[0]; f1=frames[1]
    ROWS[6]=[y0,y1,[tuple(f0)]+force_split_mid(y0,y1,f1[0],f1[1])]

def bbox(y0,y1,c0,c1):
    crop=out[y0:y1+1,c0:c1+1]; m=crop[:,:,3]>16
    ys,xs=np.where(m); return crop[ys.min():ys.max()+1, xs.min():xs.max()+1]

def getframe(r,i):
    y0,y1,fr=ROWS[r]; c0,c1=fr[i]; return bbox(y0,y1,c0,c1)

# ACTION -> list of (row,idx)
ACT = {
 "idle":     [(0,0),(0,1),(0,2)],
 "walk":     [(2,0),(2,1),(2,2),(2,3)],
 "crouch":   [(1,0),(1,1)],
 "jump":     [(6,0)],
 "hurt":     [(7,0),(7,1)],
 "knockdown":[(7,2),(7,3)],
 "taunt":    [(3,0),(3,1)],
 "light":    [(0,3),(4,0)],            # quick stab (crouch-stab + low thrust)
 "heavy":    [(4,4),(4,5)],            # lunging knife thrust
 "slash":    [(4,0),(4,1),(4,2),(4,3),(4,4),(4,5)],  # string A (rekka)
 "lowslash": [(5,0),(5,2),(5,3)],      # string B low sweeps
 "up":       [(5,3),(5,4)],            # low->rearing overhead leap (launcher)
 "air":      [(6,1),(6,2)] ,           # aerial slashes (after split, indices shift)
 "downair":  [(5,3)],                  # low descending slash
 "lunge":    [(3,1),(4,4)],            # special lunge startup+strike
 "charge":   [(3,0)],
}
# guard reuses crouch frame0 ; run reuses walk ; fall reuses jump (handled in animationData)

# global uniform cell across ALL used frames
allframes=[]
for a,lst in ACT.items():
    for (r,i) in lst:
        try: allframes.append(getframe(r,i))
        except Exception as e: print("WARN missing",a,r,i,e)
maxW=max(f.shape[1] for f in allframes); maxH=max(f.shape[0] for f in allframes)
PAD=6
cellW=maxW+PAD*2; cellH=maxH+PAD
print(f"global cell: {cellW}x{cellH}  (maxFrame {maxW}x{maxH})")

def pack(action):
    fr=[getframe(r,i) for (r,i) in ACT[action]]
    sheet=Image.new("RGBA",(cellW*len(fr), cellH),(0,0,0,0))
    for k,f in enumerate(fr):
        fh,fw=f.shape[:2]
        px=k*cellW + (cellW-fw)//2
        py=cellH-fh-2            # bottom align feet
        sheet.paste(Image.fromarray(f),(px,py),Image.fromarray(f))
    sheet.save(f"ghostface_{action}_uniform.png")
    return len(fr)

summary={}
for a in ACT: summary[a]=pack(a)
json.dump({"cellW":cellW,"cellH":cellH,"frames":summary},open("ghostface_work/_pack.json","w"),indent=1)
print("packed:",summary)
