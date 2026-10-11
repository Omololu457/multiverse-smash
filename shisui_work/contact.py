import sys,glob,os; from PIL import Image, ImageDraw
pat=sys.argv[1]; out=sys.argv[2]
fs=sorted(glob.glob(pat))
cell_w=max(Image.open(f).size[0] for f in fs)+8
rows=[]
pad=18
th=0; maxw=0
imgs=[]
for f in fs:
    im=Image.open(f).convert("RGBA")
    imgs.append((os.path.basename(f).replace("shisui_trinity_","").replace("_uniform.png",""),im))
# layout: stack vertically, each row = label + strip on magenta
W=max(im.size[0] for _,im in imgs)+200
H=sum(im.size[1]+pad for _,im in imgs)+20
canvas=Image.new("RGBA",(W,H),(255,0,255,255))
d=ImageDraw.Draw(canvas)
y=10
for name,im in imgs:
    canvas.alpha_composite(im,(190,y))
    d.text((6,y+4),f"{name}",fill=(0,0,0))
    d.text((6,y+16),f"{im.size[0]}x{im.size[1]}",fill=(0,0,0))
    # frame separators (assume uniform cells): draw faint lines every cell
    y+=im.size[1]+pad
canvas.convert("RGB").save(out)
print("saved",out,canvas.size,"n=",len(imgs))
