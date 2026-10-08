import numpy as np, os
from PIL import Image
k=Image.open('jiraiya_work/S_keyed.png').convert('RGBA')
a=np.asarray(k).astype(float); al=a[:,:,3:4]/255
m=np.zeros_like(a[:,:,:3]); m[:,:,0]=255; m[:,:,2]=255
out=(a[:,:,:3]*al+m*(1-al)).astype(np.uint8)
im=Image.fromarray(out)
w=760; h=int(im.height*w/im.width)
im.resize((w,h)).save('jiraiya_work/S_full.png')
print('S_full', (w,h), 'orig', im.size)
# also bands for S
kk=np.asarray(k)[:,:,3]>16; H,W=kk.shape
rowhas=kk.sum(1)>3; bands=[]; s=-1; gap=0
for y in range(H):
    if rowhas[y]:
        if s<0:s=y
        gap=0
    else:
        if s>=0:
            gap+=1
            if gap>=6: bands.append((s,y-gap)); s=-1; gap=0
if s>=0: bands.append((s,H-1))
bands=[b for b in bands if b[1]-b[0]+1>=8]
for i,(y0,y1) in enumerate(bands):
    cols=np.where(kk[y0:y1+1].any(0))[0]
    print(f'Sband {i} y{y0}-{y1} h{y1-y0+1} x{int(cols.min())}-{int(cols.max())}')
