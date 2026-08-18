# Authors a NEW Kamui reflect-portal spritesheet, consistent with obito_portalfx.png's dithered
# swirling-vortex style — but ANIMATED (6 rotation frames) and Kamui-tinted (violet→white), for the
# Obito/Tobi Portal-Reflect stance. Output: obito_portal_reflect.png (6 frames, 104x120 each).
import math
from PIL import Image, ImageDraw

FW, FH, N = 104, 120, 6
sheet = Image.new("RGBA", (FW*N, FH), (0,0,0,0))

def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(len(a)))
VIOLET = (150,110,230); WHITE = (238,232,255); ORANGE=(224,138,42)

for f in range(N):
    fr = Image.new("RGBA",(FW,FH),(0,0,0,0))
    d = ImageDraw.Draw(fr)
    cx, cy = FW/2, FH/2
    Rout = min(FW,FH)*0.47
    spin = f*(2*math.pi/N)                      # per-frame rotation → smooth spin
    ARMS = 13
    for arm in range(ARMS):
        base = arm*(2*math.pi/ARMS) + spin
        steps = 60
        for s in range(steps):
            rr = Rout*(0.10 + 0.90*s/steps)     # from center out
            theta = base + 3.4*math.log(rr+1)   # logarithmic spiral (tight)
            x = cx + rr*math.cos(theta)
            y = cy + rr*math.sin(theta)*(FH/FW) # slight vertical squash → oval portal
            t = s/steps                          # 0 center → 1 rim
            col = lerp(WHITE, VIOLET, t)
            a = int(210*(1-t)+60)                # brighter/denser toward center
            dot = max(0.6, 2.4*(1-t))
            d.ellipse([x-dot,y-dot,x+dot,y+dot], fill=col+(a,))
    # bright convergence core + a thin orange rim ring (Kamui accent)
    d.ellipse([cx-4,cy-4,cx+4,cy+4], fill=WHITE+(235,))
    for k in range(2):
        rr = Rout*(0.96-0.06*k)
        d.ellipse([cx-rr,cy-rr*(FH/FW),cx+rr,cy+rr*(FH/FW)], outline=ORANGE+(120,), width=2)
    sheet.alpha_composite(fr,(f*FW,0))

sheet.save("obito_portal_reflect.png")
print("wrote obito_portal_reflect.png", sheet.size)
