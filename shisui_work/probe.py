import sys, numpy as np
sys.path.insert(0,'shisui_work')
import shslice as S
from PIL import Image

SRC="shisui_uchiha_jonin_nzc_by_altair_by_altairframemaker_def0sq6.png"
a=S.flood_key(S.load(SRC))
mask=S.content_mask(a)
H,W=mask.shape
print("size",W,H)

# per-row content extent, print bands of rows that have content, limited to x<420 (exclude portrait/palette col)
y0=int(sys.argv[1]); y1=int(sys.argv[2])
x0=int(sys.argv[3]) if len(sys.argv)>3 else 0
x1=int(sys.argv[4]) if len(sys.argv)>4 else W
sub=mask[y0:y1, x0:x1]
rows=sub.any(axis=1)
# print row ranges
start=None
for i,v in enumerate(rows):
    if v and start is None: start=i
    elif not v and start is not None:
        print(f"  yrows {y0+start}-{y0+i-1}")
        start=None
if start is not None: print(f"  yrows {y0+start}-{y1-1}")
# islands in the whole band
isl=S.col_islands(mask, y0, y1, x0, x1, min_w=3, gap=6)
print("islands:", isl)
