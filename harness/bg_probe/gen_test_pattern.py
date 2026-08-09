# Generates a diagnostic stage-background test pattern: edge frame, corner/edge labels,
# a grid, and reference CIRCLES (which become ellipses under non-uniform stretch → reveals
# aspect distortion). Usage: python3 gen_test_pattern.py W H out.png
import sys
from PIL import Image, ImageDraw, ImageFont
W, H, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
img = Image.new("RGB", (W, H), (30, 34, 46))
d = ImageDraw.Draw(img)
def font(sz):
    for p in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf","/System/Library/Fonts/Helvetica.ttc"]:
        try: return ImageFont.truetype(p, sz)
        except: pass
    return ImageFont.load_default()
# grid
step = W // 16
for x in range(0, W, step): d.line([(x,0),(x,H)], fill=(60,66,86), width=2)
for y in range(0, H, step): d.line([(0,y),(W,y)], fill=(60,66,86), width=2)
# 24px bright edge frame (proves the image reaches all 4 canvas edges — gaps show as missing frame)
fw = 24
for i,(col) in enumerate([(255,60,60)]):
    d.rectangle([i*fw,i*fw,W-1-i*fw,H-1-i*fw], outline=col, width=fw)
# reference circles: a true circle renders as an ellipse if X and Y scale differ → visual distortion gauge
r = min(W,H)//7
for (cx,cy,c) in [(W//2,H//2,(90,220,120)),(W//5,H//5,(90,180,255)),(4*W//5,H//5,(255,210,90)),
                  (W//5,4*H//5,(255,150,220)),(4*W//5,4*H//5,(200,160,255))]:
    d.ellipse([cx-r,cy-r,cx+r,cy+r], outline=c, width=10)
    d.line([(cx-r,cy),(cx+r,cy)], fill=c, width=3); d.line([(cx,cy-r),(cx,cy+r)], fill=c, width=3)
# labels
big, med = font(H//12), font(H//22)
d.text((W//2, H//2-r-H//16), f"{W}x{H}", font=big, fill=(255,255,255), anchor="mm")
d.text((W//2, H//2+H//16), f"AR {W/H:.3f}:1", font=med, fill=(230,230,230), anchor="mm")
d.text((W//2, 40+fw), "TOP EDGE", font=med, fill=(255,255,255), anchor="ma")
d.text((W//2, H-40-fw), "BOTTOM EDGE", font=med, fill=(255,255,255), anchor="md")
for (lbl,x,y,a) in [("TL",fw+10,fw+10,"la"),("TR",W-fw-10,fw+10,"ra"),("BL",fw+10,H-fw-10,"ld"),("BR",W-fw-10,H-fw-10,"rd")]:
    d.text((x,y), lbl, font=med, fill=(255,255,0), anchor=a)
img.save(out)
print(f"wrote {out} {W}x{H} AR={W/H:.3f}")
