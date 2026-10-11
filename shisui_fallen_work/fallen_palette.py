#!/usr/bin/env python3
"""Shisui (Fallen) palette remap on the keyed H sheet. Clothing (dark grey-olive) → charcoal/black with
crimson trim in the lit tones; skin / hair / the red Mangekyou are preserved. Keeps him readable on dark
stages via a slightly raised crimson floor. Output: H_fallen.png (recoloured, same geometry as H_keyed)."""
import numpy as np
from PIL import Image

def recolor(a):
    out = a.copy().astype(np.int32)
    rgb = out[..., :3]; al = out[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(2); mn = rgb.min(2); val = mx
    opaque = al > 24
    # skin — warm, r>g>b, bright-ish
    skin = opaque & (r > 150) & (g > 95) & (r > b + 25) & (g >= b)
    # red Mangekyou / existing crimson — keep
    red = opaque & (r > 120) & (g < 90) & (b < 90)
    # hair / dark outline — keep near-black
    dark = opaque & (mx < 34)
    # clothing = the dark grey-olive/blue mid-tones (r≈g, cool, not warm), everything else opaque not above
    cloth = opaque & ~skin & ~red & ~dark & (np.abs(r - g) <= 24) & (b >= r - 12) & (val >= 24) & (val < 150) & (r <= g + 24)
    # CHARCOAL→CRIMSON ramp over the clothing's luminance (dark=charcoal, lit=crimson trim)
    t = np.clip((val - 30) / 95.0, 0, 1)[..., None]
    charcoal = np.array([18, 18, 22]); crimson = np.array([150, 26, 40])
    cl = (charcoal * (1 - t) + crimson * t).astype(np.int32)
    out[cloth, 0] = cl[cloth, 0]; out[cloth, 1] = cl[cloth, 1]; out[cloth, 2] = cl[cloth, 2]
    return np.clip(out, 0, 255).astype(np.uint8)

if __name__ == "__main__":
    a = np.asarray(Image.open("shisui_fallen_work/H_keyed.png").convert("RGBA"))
    fa = recolor(a)
    Image.fromarray(fa, "RGBA").save("shisui_fallen_work/H_fallen.png")
    # before/after proof of the run row (y560-655) on magenta
    def proof(src, y0, y1, fn):
        c = Image.fromarray(src[y0:y1]); m = Image.new("RGBA", c.size, (255, 0, 255, 255)); m.alpha_composite(c)
        sc = max(1, 1200 // c.width); m.resize((c.width * sc, (y1 - y0) * sc), Image.NEAREST).convert("RGB").save(fn)
    proof(a,  558, 655, "shisui_fallen_work/_before_run.png")
    proof(fa, 558, 655, "shisui_fallen_work/_after_run.png")
    proof(fa, 480, 565, "shisui_fallen_work/_after_stance.png")
    print("recoloured H → H_fallen.png")
