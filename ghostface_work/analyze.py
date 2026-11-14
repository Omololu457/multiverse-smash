import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "cvs_ghost_face_sprites_by_xxultra2006xx_dfh2eaa.png"
im = Image.open(SRC).convert("RGBA")
a = np.array(im)
H, W = a.shape[:2]
rgb = a[:,:,:3].astype(np.int32)

# Border-connected flood fill of near-white → transparent (preserves white mask interior).
# "white-ish" = all channels high AND low saturation.
mx = rgb.max(axis=2); mn = rgb.min(axis=2)
whiteish = (mn >= 235) & ((mx - mn) <= 14)
# label white regions; keep only those connected to the border as background
lbl, n = ndimage.label(whiteish)
border_labels = set(lbl[0,:]) | set(lbl[-1,:]) | set(lbl[:,0]) | set(lbl[:,-1])
border_labels.discard(0)
bg = np.isin(lbl, list(border_labels))
alpha = np.where(bg, 0, 255).astype(np.uint8)
# also zero alpha where fully transparent already
out = a.copy(); out[:,:,3] = np.minimum(a[:,:,3], alpha)
keyed = Image.fromarray(out)
keyed.save("ghostface_work/_keyed.png")

# content mask
content = out[:,:,3] > 16
# ROW segmentation: rows where any content
rowhas = content.any(axis=1)
# find bands
bands=[]; s=None
for y in range(H):
    if rowhas[y] and s is None: s=y
    elif not rowhas[y] and s is not None: bands.append((s,y-1)); s=None
if s is not None: bands.append((s,H-1))
print(f"image {W}x{H}, {len(bands)} row-bands:")
for i,(y0,y1) in enumerate(bands):
    # column segmentation within band
    sub = content[y0:y1+1,:]
    colhas = sub.any(axis=0)
    cols=[]; cs=None
    for x in range(W):
        if colhas[x] and cs is None: cs=x
        elif not colhas[x] and cs is not None: cols.append((cs,x-1)); cs=None
    if cs is not None: cols.append((cs,W-1))
    # widths
    widths=[c1-c0+1 for c0,c1 in cols]
    print(f"  row {i}: y={y0}-{y1} (h={y1-y0+1})  segments={len(cols)}  widths={widths}")
