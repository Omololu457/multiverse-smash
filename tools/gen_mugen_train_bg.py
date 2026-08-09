#!/usr/bin/env python3
# Generates a LABELED PLACEHOLDER background for the "Mugen Train" (Demon Slayer) stage at 2752x1536
# (the confirmed full-scroll size — matches valley_of_the_end_bg.png; renders through ui.drawBattleBackground,
# stretched to the 3200-wide world, no tiling/seams). Themed to the stage palette (game.js:530 —
# sky #0c1330 / mid #241a3a / floor #1a1326 / accent #f59e0b) so it reads as Mugen Train, but overlaid with
# obvious PLACEHOLDER text so it is never mistaken for final art. Drop-in replace mugen_train_bg.png with
# painted 2752x1536 art later — zero code changes needed (the stage already points at this filename).
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 2752, 1536
OUT = os.path.join(os.path.dirname(__file__), "..", "mugen_train_bg.png")

def font(sz, bold=True):
    for p in (["/System/Library/Fonts/Supplemental/Arial Bold.ttf"] if bold else []) + \
             ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
def hx(h): h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

SKY, MID, FLOOR, ACCENT = hx("#0c1330"), hx("#241a3a"), hx("#1a1326"), hx("#f59e0b")

img = Image.new("RGB", (W, H), SKY)
d = ImageDraw.Draw(img, "RGBA")

# --- vertical night-sky gradient (matches the stage's sky/mid/floor stops) ---
for y in range(H):
    t = y / H
    col = lerp(SKY, MID, min(1, t / 0.62)) if t < 0.62 else lerp(MID, FLOOR, (t - 0.62) / 0.38)
    d.line([(0, y), (W, y)], fill=col)

# --- moon (amber-pale) upper-right ---
mx, my, mr = int(W * 0.78), int(H * 0.24), 150
for i in range(mr, 0, -3):
    a = int(60 * (1 - i / mr))
    d.ellipse([mx - i, my - i, mx + i, my + i], fill=(255, 236, 190, a))
d.ellipse([mx - mr*0.6, my - mr*0.6, mx + mr*0.6, my + mr*0.6], fill=(250, 244, 224))

# --- distant hills silhouette ---
d.polygon([(0, int(H*0.66)), (int(W*0.22), int(H*0.58)), (int(W*0.45), int(H*0.64)),
           (int(W*0.7), int(H*0.57)), (W, int(H*0.63)), (W, H), (0, H)], fill=(20, 16, 34))

# --- the Mugen Train: locomotive + cars silhouette along the lower third, with amber firebox/window glow ---
gy = int(H * 0.70)                                   # track line (kept in the top ~75%, above the drawn floor)
d.line([(0, gy + 60), (W, gy + 60)], fill=(40, 30, 52), width=8)   # rail
locomotive_x = int(W * 0.16)
# boiler
d.rounded_rectangle([locomotive_x, gy - 90, locomotive_x + 360, gy + 40], radius=40, fill=(12, 10, 20))
d.rectangle([locomotive_x + 300, gy - 150, locomotive_x + 440, gy + 40], fill=(12, 10, 20))   # cab
d.rectangle([locomotive_x + 120, gy - 150, locomotive_x + 170, gy - 90], fill=(12, 10, 20))   # smokestack
# amber firebox + cab window glow (the stage accent = the train's fire)
d.ellipse([locomotive_x + 20, gy - 20, locomotive_x + 90, gy + 40], fill=ACCENT)
d.rectangle([locomotive_x + 330, gy - 120, locomotive_x + 410, gy - 60], fill=(255, 200, 90))
# passenger cars trailing to the right, each with lit amber windows
cx = locomotive_x + 470
for car in range(7):
    d.rounded_rectangle([cx, gy - 70, cx + 300, gy + 40], radius=16, fill=(14, 11, 22))
    for wxi in range(4):
        wx = cx + 30 + wxi * 68
        d.rectangle([wx, gy - 48, wx + 40, gy - 8], fill=(255, 190, 80))
    cx += 330

# --- soft amber steam/smoke drifting up from the stack ---
sx = locomotive_x + 145
for i in range(6):
    r = 40 + i * 22
    d.ellipse([sx - r, gy - 200 - i*70, sx + r, gy - 120 - i*70], fill=(120, 90, 60, 40))
    sx += 30

# ================= PLACEHOLDER OVERLAY (unmistakable it is not final art) =================
# dim band behind the text for legibility
d.rectangle([0, int(H*0.40), W, int(H*0.60)], fill=(0, 0, 0, 90))
tf, sf, ff = font(150), font(70), font(56)
def ctext(y, s, fnt, fill):
    d.text((W//2, y), s, font=fnt, fill=fill, anchor="mm")
ctext(int(H*0.46), "MUGEN  TRAIN", tf, (255, 236, 200))
ctext(int(H*0.535), "PLACEHOLDER  BACKGROUND", sf, ACCENT)
ctext(int(H*0.585), "2752 x 1536  ·  replace  mugen_train_bg.png  with  final  art", ff, (210, 200, 220))
# corner crop-safe reminder + dashed extent frame
d.rectangle([6, 6, W-6, H-6], outline=(245, 158, 11, 180), width=6)
for (lbl, x, y, a) in [("TOP  ~75%  =  key  scenery", W//2, 40, "ma")]:
    d.text((x, y), lbl, font=ff, fill=(180, 170, 200), anchor=a)

img.save(OUT)
print(f"wrote {os.path.abspath(OUT)}  {W}x{H}  AR={W/H:.3f}")
