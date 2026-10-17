# Derive fatality-aftermath sprites from an EXISTING character frame (no new art): smoosh / riddled / ashen.
from PIL import Image
import math

RED=(196,20,26,255); DARK=(110,6,10,255); MEAT=(150,30,34,255)

def _load(src, fw):
    im=Image.open(src).convert("RGBA")
    if fw: im=im.crop((0,0,fw,im.height))
    bb=im.getbbox()
    return im.crop(bb) if bb else im

def smoosh(src, fw, out):  # SMASH/PUSH → pancaked flat + splatter + wide pool
    im=_load(src,fw); w,h=im.size
    nh=max(10,int(h*0.32)); flat=im.resize((int(w*1.35),nh), Image.BICUBIC)
    fw2,fh2=flat.size; PAD=max(20,fw2//3)
    cv=Image.new("RGBA",(fw2+PAD*2, fh2+26),(0,0,0,0)); cv.alpha_composite(flat,(PAD,8))
    p=cv.load(); W,H=cv.size
    # top crush-edge bloody
    fp=flat.load()
    for xx in range(fw2):
        for yy in range(fh2):
            if fp[xx,yy][3]>40: 
                p[PAD+xx,8+max(0,yy-1)]=RED; break
    # splatter outward + wide ground pool
    cy=8+fh2
    for xx in range(PAD-PAD, W):
        d=abs(xx-W//2)
        if d<fw2//2+PAD:
            for yy in range(cy, min(H, cy+10-d//5)):
                p[max(0,min(W-1,xx)),max(0,min(H-1,yy))]=RED if (xx+yy)%4 else DARK
    for i in range(14):
        a=i/14*math.tau; rr=fw2*0.5*(0.6+0.4*((i*7)%5)/5)
        xx=int(W//2+math.cos(a)*rr); yy=int(cy-4+math.sin(a)*4)
        if 0<=xx<W and 0<=yy<H: 
            for k in range(2): 
                if yy+k<H: p[xx,yy+k]=RED
    cv.save(out); return cv.size

def riddled(src, fw, out):  # PROJECTILE → kunai/shuriken stuck in + entry-wound blood
    im=_load(src,fw).copy(); w,h=im.size
    PAD=14; cv=Image.new("RGBA",(w+PAD*2,h+PAD+14),(0,0,0,0)); cv.alpha_composite(im,(PAD,2)); p=cv.load(); W,H=cv.size
    import random; random.seed(hash(out)%1000)
    STEEL=(170,178,190,255); STEELD=(90,96,110,255)
    pts=[(0.35,0.3),(0.6,0.45),(0.45,0.6),(0.7,0.68),(0.3,0.75),(0.55,0.25)]
    for (fx,fy) in pts:
        cx=PAD+int(fx*w); cy=2+int(fy*h)
        if not (0<=cx<W and 0<=cy<H and im.getpixel((min(w-1,int(fx*w)),min(h-1,int(fy*h))))[3]>30): continue
        ang=random.uniform(-0.6,0.6)-1.1; dx,dy=math.cos(ang),math.sin(ang)
        # kunai shaft sticking out
        for t in range(10):
            xx=int(cx-dx*t*2); yy=int(cy-dy*t*2)
            if 0<=xx<W and 0<=yy<H: p[xx,yy]=STEEL if t<8 else STEELD
            if 0<=xx+1<W and 0<=yy<H and t<8: p[xx+1,yy]=STEELD
        # ring handle
        hx,hy=int(cx-dx*20),int(cy-dy*20)
        for a in range(0,360,30):
            rx=int(hx+math.cos(math.radians(a))*3); ry=int(hy+math.sin(math.radians(a))*3)
            if 0<=rx<W and 0<=ry<H: p[rx,ry]=STEELD
        # blood at entry
        for k in range(3):
            if 0<=cx+k<W and 0<=cy<H: p[cx+k-1,cy]=RED
            if 0<=cx<W and 0<=cy+k+3<H and p[cx,cy+k+3][3]<40: p[cx,cy+k+3]=RED if k%2 else DARK
    cv.save(out); return cv.size

def ashen(src, fw, out):  # ENERGY/BEAM → charred charcoal + crumbling base + embers
    im=_load(src,fw); w,h=im.size; px=im.load()
    PAD=12; cv=Image.new("RGBA",(w+PAD*2,h+PAD+10),(0,0,0,0))
    out_im=Image.new("RGBA",(w,h),(0,0,0,0)); op=out_im.load()
    import random; random.seed(hash(out)%997)
    for yy in range(h):
        depth=yy/h
        for xx in range(w):
            r,g,b,a=px[xx,yy]
            if a<30: continue
            lum=int((r+g+b)/3)
            # charcoal tint, darker lower; lower rows crumble away
            if depth>0.6 and random.random()< (depth-0.6)*1.6: continue
            c=max(14,int(lum*0.35*(1-depth*0.5)))
            op[xx,yy]=(c+ (18 if random.random()<0.04 else 0), c, c, a)
            if random.random()<0.02: op[xx,yy]=(230,120,30,a)  # ember
    cv.alpha_composite(out_im,(PAD,2)); p=cv.load(); W,H=cv.size
    # ash pile at the base
    for i in range(int(w*2.2)):
        xx=PAD+random.randint(-4,w+4); yy=2+h-random.randint(0,8)
        if 0<=xx<W and 0<=yy<H: c=random.randint(30,70); p[xx,yy]=(c,c,c,230)
    cv.save(out); return cv.size

if __name__=="__main__":
    for fn,nm in [(smoosh,"smoosh"),(riddled,"riddled"),(ashen,"ashen")]:
        sz=fn("sasuke_idle_uniform.png", None, f"fatality_work/_test_{nm}.png")
        Image.open(f"fatality_work/_test_{nm}.png").resize((sz[0]*3,sz[1]*3),Image.NEAREST).save(f"fatality_work/_test_{nm}_3x.png")
        print(nm, sz)
