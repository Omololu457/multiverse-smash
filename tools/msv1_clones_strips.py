# MSV1-CLONES: compose docs/msv1/clones/strips/<char>.png from the harness captures (sign → pop → fan → hold → strike → exit)
import os, glob
from PIL import Image, ImageDraw
D = 'docs/msv1/clones/strips'; R = D + '/_raw'
for ch in ['naruto', 'sasuke', 'madara', 'tobirama', 'hashirama']:
    fs = sorted(glob.glob(f'{R}/{ch}_[0-9]*.png'))
    if not fs: continue
    cells = []
    for p in fs:
        im = Image.open(p).convert('RGB').crop((280, 190, 1000, 450))
        d = ImageDraw.Draw(im); lab = os.path.basename(p)[len(ch) + 1:-4].replace('_', ' f')
        d.rectangle((0, 0, 170, 22), fill=(0, 0, 0)); d.text((5, 4), lab, fill=(255, 255, 255))
        cells.append(im)
    W, H = cells[0].size; out = Image.new('RGB', (W * 3, H * ((len(cells) + 2) // 3)))
    for i, c in enumerate(cells): out.paste(c, ((i % 3) * W, (i // 3) * H))
    out.save(f'{D}/{ch}.png'); print(ch, len(cells))
if os.path.exists(f'{R}/naruto_kurama12_formation.png'):
    Image.open(f'{R}/naruto_kurama12_formation.png').convert('RGB').crop((200, 160, 1080, 460)).save(f'{D}/naruto_kurama_12_clones.png')
