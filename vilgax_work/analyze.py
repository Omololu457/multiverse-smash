import numpy as np
from PIL import Image

im = Image.open("vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3.png").convert("RGB")
a = np.asarray(im).astype(np.int16)
H, W, _ = a.shape
print(f"sheet {W}x{H}")

# Orange background ~ (240,128,48). Distance-based mask.
bg = np.array([240,128,48])
dist = np.sqrt(((a - bg)**2).sum(axis=2))
fg = dist > 60   # foreground = not-orange

# Red row-label text is roughly pure red (r high, g/b low). Flag to exclude from sprite detection.
r,g,b = a[:,:,0], a[:,:,1], a[:,:,2]
redlabel = (r>150) & (g<70) & (b<70)
fg_sprite = fg & ~redlabel

# Row occupancy: fg pixels per scanline (exclude right-side portraits x>1020 for row banding)
left = fg_sprite[:, :1020]
rowcount = left.sum(axis=1)
# find row bands: contiguous y where rowcount>threshold
thr = 8
bands = []
y = 0
while y < H:
    if rowcount[y] > thr:
        y0 = y
        while y < H and rowcount[y] > thr: y += 1
        if y - y0 >= 6:  # min band height
            bands.append((y0, y))
    else:
        y += 1
print(f"\n{len(bands)} row-bands (y0,y1,height):")
for i,(y0,y1) in enumerate(bands):
    print(f"  band {i:2d}: y {y0:4d}-{y1:4d}  h={y1-y0}")
