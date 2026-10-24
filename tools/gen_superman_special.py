#!/usr/bin/env python3
"""Superman SPECIAL skins that need per-pixel work beyond palette swaps.
  cyborg  — Cyborg Superman (Hank Henshaw): the FRONT half of the body goes metallic silver with red
            circuit lines (red robotic eye is code-drawn in game.js). Rear/cape stays normal.
  bizarro — TRUE Bizarro: chalk-grey corpse SKIN, dulled steel-blue suit, muddy maroon cape, dirty shield.
Sheets auto-discovered from characters.js. Usage: gen_superman_special.py <cyborg|bizarro|all|probe>."""
import sys, os, re, colorsys
from PIL import Image
ROOT=os.path.join(os.path.dirname(__file__),"..")
def hsv(r,g,b): return colorsys.rgb_to_hsv(r/255,g/255,b/255)
def hx(h): return (int(h[1:3],16),int(h[3:5],16),int(h[5:7],16))
def is_skin(p): r,g,b,a=p; return a>80 and r>200 and g>130 and b>105 and r>=g-6 and g>=b-6 and 18<(r-b)<120
def is_blue(p):
    r,g,b,a=p
    if a<100: return False
    h,s,v=hsv(r,g,b); hd=h*360
    return s>=0.28 and 195<=hd<=248
def is_red(p):
    r,g,b,a=p
    if a<100: return False
    h,s,v=hsv(r,g,b); hd=h*360
    return s>=0.42 and (hd<18 or hd>=343) and g<95
def is_yellow(p):
    r,g,b,a=p
    if a<100: return False
    h,s,v=hsv(r,g,b); hd=h*360
    return s>=0.35 and v>=0.40 and 40<=hd<=70
def tone(p,target_hex,pivot=0.5,satmul=1.0):
    r,g,b,a=p; th,ts,tv=hsv(*hx(target_hex)); _,_,v=hsv(r,g,b)
    nv=max(0.0,min(1.0,tv+(v-pivot))); nr,ng,nb=colorsys.hsv_to_rgb(th,ts*satmul,nv)
    return (round(nr*255),round(ng*255),round(nb*255),a)
def metal(p):  # desaturate to cool silver, keep shading
    r,g,b,a=p; _,_,v=hsv(r,g,b)
    nv=min(1.0,0.28+v*0.8); nr,ng,nb=colorsys.hsv_to_rgb(0.60,0.08,nv)
    return (round(nr*255),round(ng*255),round(nb*255),a)
def sheets():
    txt=open(os.path.join(ROOT,"characters.js"),encoding="utf-8").read()
    m=re.search(r'const superman = \{.*?animationData:\s*\{(.*?)\n  \}\n\}',txt,re.S)
    blk=m.group(1) if m else txt
    s=set()
    for mm in re.finditer(r'sheet:\s*"\./(superman_[a-zA-Z0-9]+_uniform\.png)"',blk): s.add(mm.group(1))
    return sorted(s)+["superman_portrait.png"]
def cell_bounds(px,x0,x1,H):
    mnx=x1;mxx=x0
    for y in range(H):
        for x in range(x0,x1):
            if px[x,y][3]>60: mnx=min(mnx,x);mxx=max(mxx,x)
    return (mnx,mxx) if mxx>=mnx else None
def do_cyborg(im):
    px=im.load();W,H=im.size
    # estimate per-cell width by detecting column gaps is overkill; metallic the FRONT half per-cell.
    # Treat the whole strip: for each contiguous figure (we don't know cells), use global: metallic pixels
    # whose x is in the FRONT (facing-right) half of their local blob. Approx: per vertical column region.
    # Simple + robust: metallic any non-cape pixel on the RIGHT 48% of each cell. Detect cells by equal split.
    return im
def recolor_cyborg(im, ncells):
    px=im.load();W,H=im.size; cw=W//max(1,ncells)
    for ci in range(ncells):
        x0,x1=ci*cw,(ci+1)*cw
        b=cell_bounds(px,x0,x1,H)
        if not b: continue
        mnx,mxx=b; cx=mnx+ (mxx-mnx)*0.5
        for y in range(H):
            for x in range(x0,x1):
                p=px[x,y]
                if p[3]<60: continue
                if x < cx: continue                 # rear half stays normal
                if is_red(p): continue              # keep red cape/boots on the rear anyway
                # FRONT half → metal; red circuit line every ~5 rows
                if (y % 6)==0 and not is_skin(p): px[x,y]=(200,30,30,p[3])
                else: px[x,y]=metal(p)
    return im
def recolor_bizarro(im):
    px=im.load();W,H=im.size
    for y in range(H):
        for x in range(W):
            p=px[x,y]
            if p[3]<60: continue
            if is_skin(p): px[x,y]=tone(p,"#C8CAC6",satmul=0.15)   # chalk-grey corpse skin
            elif is_yellow(p): px[x,y]=tone(p,"#B8B29A",satmul=0.3) # dirty shield
            elif is_blue(p): px[x,y]=tone(p,"#4A5468",satmul=0.5)   # dull steel-blue suit
            elif is_red(p): px[x,y]=tone(p,"#5A2A32",satmul=0.6)    # muddy maroon cape
    return im
# nominal frame counts for cyborg cell split
FRAMES={"superman_idle_uniform.png":2,"superman_walk_uniform.png":3,"superman_crouch_uniform.png":1,"superman_light_uniform.png":2,"superman_heavy_uniform.png":2,"superman_uppercut_uniform.png":2,"superman_air_uniform.png":2,"superman_sweep_uniform.png":2,"superman_flightdash_uniform.png":1,"superman_jump_uniform.png":2,"superman_fall_uniform.png":2,"superman_flight_uniform.png":3,"superman_flycruise_uniform.png":1,"superman_flightrise_uniform.png":1,"superman_flyturn_uniform.png":1,"superman_land_uniform.png":2,"superman_beam_uniform.png":3,"superman_hurt_uniform.png":1,"superman_guard_uniform.png":1,"superman_cardboard_uniform.png":3,"superman_portrait.png":1}
def run(tag):
    n=0
    for sh in sheets():
        p=os.path.join(ROOT,sh)
        if not os.path.exists(p): continue
        im=Image.open(p).convert("RGBA")
        if tag=="cyborg": im=recolor_cyborg(im, FRAMES.get(sh,1))
        else: im=recolor_bizarro(im)
        im.save(os.path.join(ROOT,sh.replace(".png","__"+tag+".png"))); n+=1
    print("DONE",tag,n)
if __name__=="__main__":
    a=sys.argv[1] if len(sys.argv)>1 else "all"
    if a=="all":
        run("cyborg"); run("bizarro")
    else: run(a)
