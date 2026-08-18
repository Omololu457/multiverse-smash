#!/usr/bin/env python3
# Generate the 3 Orochimaru FORM palettes (Stage 4). The only distinct alternate-body art is the
# host-body sheets (orochimaru_form_<action>_uniform.png, sliced by reslice_orochimaru.py from
# p2_second_char_*). The 3 forms are that body in 3 palettes:
#   host    = the sliced sheets as-is (dark host body)          — no recolor here
#   white   = White Snake true form  (desaturated + brightened) — his pale serpent body
#   serpent = Serpent Sage form      (hue → venom green, richer) — an empowered cursed form
# Global HSV transforms over the opaque pixels (these are whole-body FORM swaps, not region skins),
# giving 3 clearly-distinct silhouettes. Writes orochimaru_form_<palette>_<action>_uniform.png.
import colorsys
from PIL import Image

ACTIONS = ["idle", "run", "dash", "light"]

def recolor(src, out, mode):
    im = Image.open(src).convert("RGBA"); px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 16:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if mode == "white":
                # White Snake: wash out the colour, lift toward white — a pale serpent body.
                s = s * 0.18
                v = min(1.0, v * 1.35 + 0.16)
            elif mode == "serpent":
                # Serpent Sage: push toward a toxic snake-green, richer + slightly darker.
                h = 0.28
                s = min(1.0, s * 0.7 + 0.4)
                v = max(0.0, v * 0.92)
            nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    im.save(out)
    print(f"OK {out}")

if __name__ == "__main__":
    for act in ACTIONS:
        base = f"orochimaru_form_{act}_uniform.png"
        recolor(base, f"orochimaru_form_white_{act}_uniform.png", "white")
        recolor(base, f"orochimaru_form_serpent_{act}_uniform.png", "serpent")
