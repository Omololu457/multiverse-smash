import numpy as np, json
from PIL import Image, ImageDraw
acts=["idle","walk","crouch","jump","hurt","knockdown","taunt","light","heavy","slash","lowslash","up","air","downair","lunge","charge"]
pj=json.load(open("ghostface_work/_pack.json")); cw,ch=pj["cellW"],pj["cellH"]
scale=0.7
cellw=int(cw*scale); cellh=int(ch*scale)
maxf=6
mont=Image.new("RGB",(maxf*cellw+120, len(acts)*cellh+8),(45,45,52))
dr=ImageDraw.Draw(mont)
for ri,a in enumerate(acts):
    im=Image.open(f"ghostface_{a}_uniform.png").convert("RGBA")
    n=im.width//cw
    for k in range(n):
        cell=im.crop((k*cw,0,(k+1)*cw,ch)).resize((cellw,cellh))
        # composite on grey
        base=Image.new("RGBA",(cellw,cellh),(60,60,68,255)); base.alpha_composite(cell)
        mont.paste(base.convert("RGB"),(120+k*cellw, ri*cellh+4))
        dr.line([(120+k*cellw, ri*cellh+cellh+2),(120+(k+1)*cellw,ri*cellh+cellh+2)],fill=(80,80,90))
    dr.text((4,ri*cellh+cellh//2),f"{a}({n})",fill=(255,230,80))
    # baseline marker (feet line = cellh-2*scale)
    by=ri*cellh+4+int((ch-2)*scale)
    dr.line([(118,by),(120+maxf*cellw,by)],fill=(255,80,80))
mont.save("ghostface_work/_packed_montage.png")
print("saved",mont.size)
