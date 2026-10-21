#!/usr/bin/env python3
"""Per-frame EYE ANCHOR detection for Heat Vision. For every frame, find the eye
position in frame-local coords. Glowing red/pink eye pixels in the head region win;
otherwise fall back to the face (skin) centroid. Writes the final inventory.json and
an eye-anchor overlay contact sheet."""
import json
from PIL import Image, ImageDraw
import numpy as np

SRC = '../assets/source/homelander_original.png'
im = Image.open(SRC).convert('RGBA')
a = np.array(im)
H, W = a.shape[:2]
R, G, B = [a[..., i].astype(int) for i in range(3)]

inv = json.load(open('inventory_raw.json'))

# skin / face: peachy-tan (R>175, G 110-205, B 80-175, R>B+25), excludes blue suit & red cape
skin = (R > 175) & (G > 105) & (G < 210) & (B > 70) & (B < 180) & (R > B + 25) & (R > G + 10)
# glowing eye: very bright red or hot pink, highly saturated
eye_red = (R > 185) & (R - G > 85) & (R - B > 55)
eye_pink = (R > 215) & (G > 90) & (B > 120) & (R - G > 60)
eye = eye_red | eye_pink

def anchor_for(bb):
    x0, y0, x1, y1 = bb
    w = x1 - x0 + 1; h = y1 - y0 + 1
    # head region = top 45% of the sprite
    hy1 = y0 + int(h * 0.45)
    # 1) try glowing eyes in head region, but reject if the "eye" region is huge (cape bleed)
    es = eye[y0:hy1 + 1, x0:x1 + 1]
    sk = skin[y0:hy1 + 1, x0:x1 + 1]
    # restrict eye pixels to within/near skin (dilate skin horizontally a touch)
    if sk.any():
        sy, sx = np.where(sk)
        scx = sx.mean(); scy = sy.mean()
    else:
        scx = w / 2; scy = h * 0.22
    method = "skin"
    ax, ay = scx, scy
    if es.sum() >= 2 and es.sum() <= 0.08 * w * h:  # small bright cluster, not cape wash
        ey, ex = np.where(es)
        # keep eye pixels close to the face centroid (within half width)
        keep = (np.abs(ex - scx) < w * 0.5)
        if keep.sum() >= 2:
            ax = ex[keep].mean(); ay = ey[keep].mean(); method = "eye_glow"
    # face anchor: eyes sit a bit below top of skin; nudge for pose. Use detected value.
    return (round(float(ax), 1), round(float(ay), 1), method, int(es.sum()))

# which frames "can fire": all upright/standing/flex/flight poses. We store an anchor
# for EVERY frame (cheap, consistent), and flag fireable = skin visible in head & not a
# fully-horizontal lying frame (h/w ratio). Non-fireable: knockdown/hurt lying flat.
for row in inv["rows"]:
    for fr in row["frames"]:
        ax, ay, method, epix = anchor_for(fr["bbox"])
        fr["eye_anchor"] = [ax, ay]          # local to bbox top-left, in source px
        fr["eye_method"] = method
        fr["eye_glow_px"] = epix
        ratio = fr["h"] / max(1, fr["w"])
        fr["fireable"] = bool(ratio > 0.75)  # upright enough to aim beams

inv["eye_anchor_doc"] = ("eye_anchor is [x,y] offset from the frame bbox top-left in "
    "source pixels; beam origin. method=eye_glow when glowing red/pink eye pixels were "
    "found, else skin-centroid fallback. fireable=false on flat lying hurt/fall frames.")

json.dump(inv, open('../assets/source/homelander_inventory.json', 'w'), indent=1)

# overlay contact sheet with anchors
S = 3
yellow = (R > 235) & (G > 235) & (B < 95)
disp = a.copy(); disp[yellow] = (28, 28, 34, 255)
img = Image.fromarray(disp).resize((W * S, H * S), Image.NEAREST).convert('RGBA')
d = ImageDraw.Draw(img)
nfire = 0; nglow = 0
for row in inv["rows"]:
    for fr in row["frames"]:
        x0, y0, x1, y1 = fr["bbox"]
        col = (0, 200, 255, 255) if fr["fireable"] else (120, 120, 120, 255)
        d.rectangle([x0 * S, y0 * S, (x1 + 1) * S, (y1 + 1) * S], outline=col, width=1)
        if fr["fireable"]:
            nfire += 1
            ex = (x0 + fr["eye_anchor"][0]) * S
            ey = (y0 + fr["eye_anchor"][1]) * S
            c = (255, 40, 40, 255) if fr["eye_method"] == "eye_glow" else (255, 200, 0, 255)
            if fr["eye_method"] == "eye_glow":
                nglow += 1
            d.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], outline=c, width=1)
            d.line([ex, ey, ex + 26, ey], fill=c, width=1)  # beam direction hint
img.convert('RGB').save('../assets/source/homelander_eye_anchors.png')
print(f"frames={inv['frame_count']} fireable={nfire} eye_glow_detected={nglow}")
