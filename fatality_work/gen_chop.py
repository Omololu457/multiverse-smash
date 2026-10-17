# Pre-build a "chopped into pieces" sprite from an EXISTING character frame (no new art).
# Slices the body into bands, gives each a bloody cut-edge, scatters/drops them, adds drips + a ground pool.
import sys
from PIL import Image

def chop(src_path, frame_w=None, seed=7, out=None, preview=None):
    im = Image.open(src_path).convert("RGBA")
    if frame_w:                      # multi-frame sheet -> take frame 0
        im = im.crop((0, 0, frame_w, im.height))
    bb = im.getbbox()
    if not bb: return None
    im = im.crop(bb)
    w, h = im.size

    N = 5
    RED  = (196, 20, 26, 255)
    DARK = (110, 6, 10, 255)
    MEAT = (150, 30, 34, 255)
    PADX, PADY, POOL = max(18, w//2), 10, 20
    CW, CH = w + PADX*2, h + PADY + POOL + 14
    canvas = Image.new("RGBA", (CW, CH), (0,0,0,0))

    def tint_edges(band):            # paint a bloody edge along the band's top+bottom content rows
        bp = band.load(); bw, bh = band.size
        for xx in range(bw):
            # top edge
            for yy in range(bh):
                if bp[xx,yy][3] > 40:
                    for e in range(2):
                        if yy+e < bh and bp[xx,yy+e][3] > 20: bp[xx,yy+e] = MEAT if e else RED
                    break
            # bottom edge
            for yy in range(bh-1, -1, -1):
                if bp[xx,yy][3] > 40:
                    for e in range(2):
                        if yy-e >= 0 and bp[xx,yy-e][3] > 20: bp[xx,yy-e] = MEAT if e else RED
                    break
        return band

    import random
    random.seed(seed)
    band_h = h / N
    for i in range(N):
        y0, y1 = int(i*band_h), (int((i+1)*band_h) if i < N-1 else h)
        band = im.crop((0, y0, w, y1))
        band = tint_edges(band)
        frac = i/(N-1)                                   # lower pieces slide + drop more (falling apart)
        dx = int((PADX-4) * (1 if i%2 else -1) * (0.25 + 0.75*frac) + random.uniform(-3,3))
        dy = int(POOL * frac * 0.8)
        ang = (8 if i%2 else -8) * frac + random.uniform(-3,3)
        band = band.rotate(ang, expand=True, resample=Image.BICUBIC)
        canvas.alpha_composite(band, (PADX + dx, PADY + y0 + dy))

    p = canvas.load()
    def blob(cx, cy, r, col):
        for yy in range(max(0,cy-r), min(CH,cy+r)):
            for xx in range(max(0,cx-r), min(CW,cx+r)):
                if (xx-cx)**2+(yy-cy)**2 <= r*r: p[xx,yy]=col
    # blood spray at the chop line + drips
    for i in range(1,N):
        cy = PADY + int(i*band_h) + int(POOL*(i/(N-1))*0.6)
        cx = PADX + w//2 + (7 if i%2 else -7)
        blob(cx, cy, 4, RED); blob(cx+5, cy+2, 2, DARK)
        for t in range(6+i*2):
            yy = min(CH-1, cy+t); xx = min(CW-1, max(0, cx + (1 if i%2 else -1)*(t//4)))
            if p[xx,yy][3] < 40: p[xx,yy] = RED if t%2 else DARK
    # ground pool
    py = CH - POOL + 4
    for xx in range(PADX-14, PADX+w+14):
        d = abs(xx-(PADX+w//2))
        if d < w//2+14:
            for yy in range(py, min(CH, py + (POOL-6) - d//6)):
                p[max(0,min(CW-1,xx)), max(0,min(CH-1,yy))] = RED if (xx+yy)%4 else DARK

    if out: canvas.save(out)
    if preview: canvas.resize((CW*3, CH*3), Image.NEAREST).save(preview)
    return canvas.size

# Demo on Shisui's idle frame 0 (29px wide) — any character works the same way.
sz = chop("shisui_fallen_idle_uniform.png", frame_w=29, out="fatality_work/_chop_shisui.png", preview="fatality_work/_chop_shisui_3x.png")
print("shisui chop:", sz)
# Also try a bigger/clearer victim for comparison
import os
for cand in ["sasuke_idle_uniform.png","naruto_seventh_idle_uniform.png","gojo_idle_uniform.png"]:
    if os.path.exists(cand):
        from PIL import Image as I; fw = I.open(cand).width
        # guess frame0 width = full if single, else half
        sz2 = chop(cand, frame_w=None, out=f"fatality_work/_chop_{cand}", preview=f"fatality_work/_chop_{cand.replace('.png','')}_3x.png")
        print(cand, "->", sz2); break
