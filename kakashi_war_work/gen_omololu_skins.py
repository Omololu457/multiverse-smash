#!/usr/bin/env python3
# Copy a selection of OMOLOLU's skin treatments onto kakashi_war, using omololu's EXACT HSV region-split
# transforms (tools/gen_omololu_underskin.py + gen_omololu_suit_recolor.py) applied to the kakashi_war sheet
# set. Alpha preserved byte-for-byte. Output: kakashi_war_<action>_uniform__<tag>.png (+ portrait + frog).
#   alienx   — Alien X: void-crush EVERY opaque pixel to matte near-black; the colourful starfield is drawn
#              at runtime by game.js drawAlienXStarfield (gated on skinId ending "AlienX").
#   webweave — sleek WHITE bodysuit + crisp BLACK seams on the neutral region (hair/pants/mask); warm
#              skin + red headband kept.
#   violet / emerald — themed hue retint of the neutral hair/outfit region; warm skin + red kept.
import colorsys
from PIL import Image

# body sheets (match characters.js kakashiWar.animationData) + portrait + frog.
BODY = ["idle", "run", "dash", "jump", "guard", "hurt", "knockdown", "getup", "light", "heavy", "heavyair",
        "heavyfwd", "heavydown", "intro", "win", "taunt", "raikiri_charge", "raikiri_strike",
        "raikiri_air_charge", "raikiri_air_strike", "mangekyou_cast", "tsuiga_cast", "sennen",
        "frog", "frog_damage"]

def paths_for(tag):
    out = []
    for s in BODY:
        out.append((f"kakashi_war_{s}_uniform.png", f"kakashi_war_{s}_uniform__{tag}.png"))
    out.append(("kakashi_war_portrait.png", f"kakashi_war_portrait__{tag}.png"))
    return out

# ── transforms (verbatim intent from the omololu generators) ──
KEEP_SAT_MAX = 0.35
def void_px(r, g, b):
    v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[2]
    nv = max(0.02, min(0.14, 0.03 + v * 0.10)); gg = round(nv * 255)
    return (gg, gg, max(gg, round(gg * 1.14)))

THEMES = {  # (hue, sat, value floor, value top, gamma)
    "violet":  (275.0 / 360.0, 0.72, 0.32, 0.80, 0.60),
    "emerald": (145.0 / 360.0, 0.78, 0.32, 0.78, 0.60),
}
SEAM_V, SEAM_OUT_V, BODY_LO, BODY_HI = 0.14, 0.03, 0.14, 0.28
def theme_px(r, g, b, theme):
    hue, sat, floor, top, gamma = theme
    hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if ss >= KEEP_SAT_MAX:
        return (r, g, b)
    if vv < SEAM_V:
        nr, ng, nb = colorsys.hsv_to_rgb(hue, 0.0, SEAM_OUT_V)
    else:
        v01 = max(0.0, min(1.0, (vv - BODY_LO) / (BODY_HI - BODY_LO)))
        nv = floor + (v01 ** gamma) * (top - floor)
        nr, ng, nb = colorsys.hsv_to_rgb(hue, sat, nv)
    return (round(nr * 255), round(ng * 255), round(nb * 255))

SUIT = dict(sat_max=0.35, seam_v=0.14, seam_out=0.03, lo=0.14, hi=0.26, floor=0.68, top=0.99, gamma=0.55, suit_sat=0.02, suit_hue=210.0 / 360.0)
def suit_px(r, g, b):
    S = SUIT
    hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if ss >= S["sat_max"]:
        return (r, g, b)
    if vv < S["seam_v"]:
        nr, ng, nb = colorsys.hsv_to_rgb(S["suit_hue"], 0.0, S["seam_out"])
    else:
        v01 = max(0.0, min(1.0, (vv - S["lo"]) / (S["hi"] - S["lo"])))
        nv = S["floor"] + (v01 ** S["gamma"]) * (S["top"] - S["floor"])
        nr, ng, nb = colorsys.hsv_to_rgb(S["suit_hue"], S["suit_sat"], nv)
    return (round(nr * 255), round(ng * 255), round(nb * 255))

def apply(tag):
    fn = (lambda r, g, b: void_px(r, g, b)) if tag == "alienx" else \
         (lambda r, g, b: suit_px(r, g, b)) if tag == "webweave" else \
         (lambda r, g, b: theme_px(r, g, b, THEMES[tag]))
    total = 0
    for src, dst in paths_for(tag):
        try:
            img = Image.open(src).convert("RGBA")
        except FileNotFoundError:
            print("  MISSING", src); continue
        px = img.load(); W, H = img.size
        for y in range(H):
            for x in range(W):
                r, g, b, a = px[x, y]
                if a < 8:
                    continue
                nr, ng, nb = fn(r, g, b); px[x, y] = (nr, ng, nb, a); total += 1
        img.save(dst)
    print(f"[{tag}] recoloured {total}px → kakashi_war_*__{tag}.png")

if __name__ == "__main__":
    for t in ["alienx", "webweave", "violet", "emerald"]:
        apply(t)
