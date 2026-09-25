from PIL import Image
import colorsys, os
# Hue-rotate the base sheets, preserving alpha exactly (cosmetic recolor, dims unchanged).
TAGS = {"azure": 0.58, "crimson": 0.02}  # target hue anchors (rotate toward blue / red-gold)
SHEETS = ["jesus_idle_uniform","jesus_walk_uniform","jesus_run_uniform",
          "jesus_light_uniform","jesus_heavy_uniform","jesus_hurt_uniform",
          "jesus_jump_uniform","jesus_guard_uniform","jesus_up_uniform","jesus_air_uniform",
          "jesus_intro_uniform","jesus_taunt_uniform","jesus_win_uniform","jesus_lose_uniform"]
PORTRAIT = "jesus_portrait"

def hue_shift(img, dh):
    img = img.convert("RGBA")
    px = img.load()
    w,h = img.size
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            if a == 0: continue
            hh,ss,vv = colorsys.rgb_to_hsv(r/255,g/255,b/255)
            hh = (hh + dh) % 1.0
            nr,ng,nb = colorsys.hsv_to_rgb(hh,ss,vv)
            px[x,y] = (int(nr*255),int(ng*255),int(nb*255),a)
    return img

for tag,anchor in TAGS.items():
    dh = anchor  # rotate hue by anchor amount (simple global rotation)
    for name in SHEETS + [PORTRAIT]:
        src = f"{name}.png"
        if not os.path.exists(src):
            print("MISSING", src); continue
        out = hue_shift(Image.open(src), dh)
        dst = f"{name}__{tag}.png"
        out.save(dst)
        print("wrote", dst, out.size)
