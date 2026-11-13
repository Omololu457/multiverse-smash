#!/usr/bin/env python3
"""Green Arrow — assemble uniform animation strips from the SNES sheet.
Background = white alpha-0 -> key on alpha. Nearest-neighbour only, no interpolation,
no invented art. Fire/Ice projectiles are keyed by colour (orange / blue). The plain
arrow is a derived crop of the fire-arrow shaft (ledger: 'derived crop'). EMP arrow is
an ALLOWED palette tint of the ice arrow (ledger: 'tint').
Outputs: green_arrow_*_uniform.png strips + green_arrow_portrait.png + green_arrow_logo.png
+ green_arrow_wordmark.png, a strip_meta.json, and a verification contact sheet.
"""
import json
import numpy as np
from PIL import Image, ImageDraw

SHEET = 'SNES - Justice League Task Force - Fighters - Green Arrow.png'
im = Image.open(SHEET).convert('RGBA')
W, H = im.size
arr = np.array(im)
alpha = arr[:, :, 3]
FG = alpha > 20

# --- content y-bands ---
rowhas = FG.any(axis=1)
bands = []
y = 0
while y < H:
    if rowhas[y]:
        y0 = y
        while y < H and rowhas[y]:
            y += 1
        bands.append((y0, y - 1))
    else:
        y += 1

def split_band(y0, y1, gap, x0=0, x1=W-1, mask=FG, minpix=12):
    sub = mask[y0:y1+1, x0:x1+1]
    colhas = sub.any(axis=0)
    out = []
    x = 0; Wc = sub.shape[1]
    while x < Wc:
        if colhas[x]:
            xs = x; run = 0; xe = x
            while x < Wc:
                if colhas[x]:
                    xe = x; run = 0
                else:
                    run += 1
                    if run >= gap:
                        break
                x += 1
            fsub = sub[:, xs:xe+1]
            if fsub.sum() >= minpix:
                ys = np.where(fsub.any(axis=1))[0]
                xsr = np.where(fsub.any(axis=0))[0]
                out.append((x0+xs+xsr.min(), y0+ys.min(), x0+xs+xsr.max(), y0+ys.max()))
        else:
            x += 1
    return out

def frames_for(bi, gap, **kw):
    y0, y1 = bands[bi]
    return split_band(y0, y1, gap, **kw)

def crop(box):
    x0, y0, x1, y1 = box
    sub = arr[y0:y1+1, x0:x1+1].copy()
    sub[sub[:, :, 3] <= 20] = (0, 0, 0, 0)
    return Image.fromarray(sub, 'RGBA')

def strip(name, imgs, pad=2):
    cw = max(i.width for i in imgs) + pad*2
    ch = max(i.height for i in imgs) + pad*2
    out = Image.new('RGBA', (cw*len(imgs), ch), (0, 0, 0, 0))
    for k, img in enumerate(imgs):
        ox = k*cw + (cw-img.width)//2
        oy = ch - pad - img.height  # bottom align (feet planted)
        out.alpha_composite(img, (ox, oy))
    out.save('./' + name)
    return [name, cw, ch, len(imgs)]

META = {}
def mk(name, boxes, pad=2):
    imgs = [crop(b) for b in boxes]
    META[name] = strip(name, imgs, pad)
    return imgs

# ------------------------------------------------------------------
# Resolve each band's frames with a tuned gap (verified vs expected count).
# Band indices (0-based) in sheet order:
#  0 idle+portrait+logo | 1 wordmark | 2 walk | 3 jump+flip | 4 punches | 5 kicks
#  6 crouch | 7 ground | 8 dash/roll/guard | 9 lunge/bowslash | 10 draw->release
#  11 antiair+fire+ice | 12 air draw/release | 13 explosive dive+explosion
#  14 hit-react | 15 knockdown | 16 win+superman+credit
B = {i: None for i in range(len(bands))}
GAPS = {0:5,2:4,3:5,4:4,5:4,6:4,7:5,8:4,9:2,10:4,12:4,13:4,14:4,15:4,16:6}
for i, g in GAPS.items():
    B[i] = frames_for(i, g)
# B9 lunge/bowslash: gap=2 to break the touching stance frames
print("resolved frame counts:")
for i in sorted(B):
    if B[i] is not None:
        print(f"  B{i}: {len(B[i])}  {[(b[2]-b[0]+1,b[3]-b[1]+1) for b in B[i]]}")

# ------------------------------------------------------------------
# MOVEMENT / STATE
mk('green_arrow_idle_uniform.png',   [B[0][0], B[0][1], B[0][2]])            # 3 idle
mk('green_arrow_walk_uniform.png',   B[2][:6])                               # 6 walk
mk('green_arrow_jump_uniform.png',   [B[3][0], B[3][1], B[3][2]])            # crouch/rise/arc
mk('green_arrow_fall_uniform.png',   [B[3][2]])                             # arc as fall
mk('green_arrow_crouch_uniform.png', [B[6][0]])                             # crouch
mk('green_arrow_flip_uniform.png',   B[3][3:7])                             # 4 somersault
# ------------------------------------------------------------------
# NORMALS
mk('green_arrow_light_uniform.png',  [B[4][0], B[4][1]])                     # jab, straight
mk('green_arrow_heavy_uniform.png',  [B[4][4], B[4][5], B[4][6]])            # elbow/turn
mk('green_arrow_up_uniform.png',     B[5][3:6])                              # spinning back kick (launcher)
mk('green_arrow_highkick_uniform.png', [B[5][0], B[5][1], B[5][2]])          # high kick (anti-air)
mk('green_arrow_crouchatk_uniform.png',[B[6][1], B[6][2]])                   # crouch jab/kick
mk('green_arrow_lowarrow_uniform.png', B[6][3:7] if len(B[6])>=7 else B[6][3:]) # low arrow (crouch release)
mk('green_arrow_slide_uniform.png',  [B[7][0], B[7][1]])                     # slide/sweep
mk('green_arrow_rising_uniform.png', [B[7][2], B[7][3]])                     # rising kick
mk('green_arrow_air_uniform.png',    [B[12][1], B[12][2]])                   # air attack pose
# dash / guard / back-step from band 8
mk('green_arrow_dash_uniform.png',   B[8][:3])
mk('green_arrow_guard_uniform.png',  [B[8][min(5,len(B[8])-1)]])
mk('green_arrow_block_uniform.png',  [B[8][min(5,len(B[8])-1)]])
# bow slash (melee) from band 9 lunge frames
_b9 = B[9]
slash = [_b9[min(2,len(_b9)-1)], _b9[min(3,len(_b9)-1)], _b9[min(4,len(_b9)-1)]]
mk('green_arrow_bowslash_uniform.png', slash)
# ------------------------------------------------------------------
# ARROW CAST POSES
mk('green_arrow_draw_uniform.png',   B[10][:7])                              # standing draw->aim->release
mk('green_arrow_aim_uniform.png',    [B[10][2], B[10][3]])                   # aim hold (for charge)
# anti-air archer poses = band 11 LEFT of x<520 (projectiles are x>=535)
aa = split_band(bands[11][0], bands[11][1], 4, x0=0, x1=520)
mk('green_arrow_antiair_uniform.png', aa[:4] if len(aa)>=2 else aa)
mk('green_arrow_firecast_uniform.png', [B[10][1], B[10][2], B[10][5]])       # cast pose (plain draw reused)
mk('green_arrow_icecast_uniform.png',  [B[10][1], B[10][2], B[10][5]])
mk('green_arrow_airdraw_uniform.png',  B[12][:4])                            # air draw/release
mk('green_arrow_dive_uniform.png',     B[13][:4])                            # explosive-arrow dive
# ------------------------------------------------------------------
# HIT / KNOCKDOWN
mk('green_arrow_hurt_uniform.png',   [B[14][0], B[14][1]])
mk('green_arrow_stagger_uniform.png', B[14][:9])
mk('green_arrow_knockdown_uniform.png', B[15][:7])
# ------------------------------------------------------------------
# WIN POSES
mk('green_arrow_win_uniform.png',    [B[16][0], B[16][1]])                   # fist raise x2
mk('green_arrow_skyward_uniform.png', [B[16][2]])                           # bow skyward
# portrait = B0 fr3 (fist-raised portrait pose)
pim = crop(B[0][3])
s = max(pim.width, pim.height) + 4
port = Image.new('RGBA', (s, s), (0, 0, 0, 0))
port.alpha_composite(pim, ((s-pim.width)//2, (s-pim.height)//2))
port.save('./green_arrow_portrait.png')
META['portrait'] = ['green_arrow_portrait.png', s, s, 1]
# logo icon = B0 fr4 (39x32)
crop(B[0][4]).save('./green_arrow_logo.png')
META['logo'] = ['green_arrow_logo.png', B[0][4][2]-B[0][4][0]+1, B[0][4][3]-B[0][4][1]+1, 1]
# wordmark = whole band 1 (both words together)
wy0, wy1 = bands[1]
wx = np.where(FG[wy0:wy1+1].any(axis=0))[0]
wm = crop((int(wx.min()), wy0, int(wx.max()), wy1))
wm.save('./green_arrow_wordmark.png')
META['wordmark'] = ['green_arrow_wordmark.png', wm.width, wm.height, 1]

# ------------------------------------------------------------------
# PROJECTILES — colour-keyed
R = arr[:, :, 0].astype(int); G = arr[:, :, 1].astype(int); Bl = arr[:, :, 2].astype(int)
orange = FG & (R > 120) & (R - Bl > 40) & (R - G > -10)
blue = FG & (Bl > 120) & (Bl - R > 30)
fire_boxes = split_band(1128, 1162, 6, x0=535, x1=W-1, mask=orange, minpix=20)
ice_boxes = split_band(1185, 1224, 6, x0=535, x1=W-1, mask=blue, minpix=20)
print("fire_boxes:", [(b[2]-b[0]+1, b[3]-b[1]+1) for b in fire_boxes])
print("ice_boxes:", [(b[2]-b[0]+1, b[3]-b[1]+1) for b in ice_boxes])
# fire/ice: crop WITH full colour (not just orange mask) so the whole flame comes through
def crop_region(box):
    return crop(box)
fire_imgs = [crop_region(b) for b in fire_boxes]
ice_imgs = [crop_region(b) for b in ice_boxes]
META['firearrow'] = strip('green_arrow_firearrow_uniform.png', fire_imgs)
META['icearrow'] = strip('green_arrow_icearrow_uniform.png', ice_imgs)
# plain arrow = derived crop of fire-arrow frame-1 shaft+fletch (before the flame) ->
# take the left third of fire frame 0 and desaturate the flame to a wood/steel arrow.
f0 = fire_boxes[0]
shaft = crop((f0[0], f0[1], f0[0] + (f0[2]-f0[0])//2, f0[3]))  # left-half = nocked shaft
sa = np.array(shaft)
# recolour any warm flame pixels to muted wood/steel so it reads as a plain arrow
m = sa[:, :, 3] > 20
warm = m & (sa[:, :, 0].astype(int) - sa[:, :, 2].astype(int) > 30)
sa[warm] = (120, 96, 60, 255)
Image.fromarray(sa, 'RGBA').save('./green_arrow_plainarrow.png')
META['plainarrow'] = ['green_arrow_plainarrow.png', shaft.width, shaft.height, 1, 'derived crop']
# EMP arrow = ALLOWED TINT of ice arrow (electric yellow-white)
ei = np.array(ice_imgs[0].copy()) if ice_imgs else None
def tint_emp(img):
    a = np.array(img); mm = a[:, :, 3] > 20
    # map blue -> electric yellow-white: swap/boost R&G, keep bright core white
    r = a[:, :, 0].astype(int); g = a[:, :, 1].astype(int); b = a[:, :, 2].astype(int)
    lum = (r + g + b) // 3
    out = a.copy()
    out[mm, 0] = np.clip(lum[mm] + 150, 0, 255)
    out[mm, 1] = np.clip(lum[mm] + 150, 0, 255)
    out[mm, 2] = np.clip(lum[mm] + 40, 0, 255)
    return Image.fromarray(out, 'RGBA')
emp_imgs = [tint_emp(i) for i in ice_imgs]
META['emparrow'] = strip('green_arrow_emparrow_uniform.png', emp_imgs)
META['emparrow'].append('tint')
# explosion = band 13 frames 4..7
mk('green_arrow_explosion_uniform.png', B[13][4:8])

json.dump(META, open('green_arrow_work/strip_meta.json', 'w'), indent=1, default=int)
print("\nwrote", len(META), "strips")

# ------------------------------------------------------------------
# verification contact sheet of every assembled strip
items = sorted(META.items())
SC = 2
pad = 8
rowh = max(m[2] for _, m in items if len(m) >= 3) * SC + 28
cw = max((m[1]*m[3]) for _, m in items) * SC + 220
out = Image.new('RGBA', (cw, rowh*len(items)+10), (22, 22, 28, 255))
d = ImageDraw.Draw(out)
cy = 6
for name, m in items:
    fn = m[0]
    try:
        img = Image.open('./'+fn).convert('RGBA')
        img = img.resize((img.width*SC, img.height*SC), Image.NEAREST)
        out.alpha_composite(img, (210, cy))
    except Exception as e:
        pass
    d.text((6, cy+4), f"{name}", fill=(150, 220, 255, 255))
    d.text((6, cy+18), f"{m[3]}f {m[1]}x{m[2]}", fill=(150, 150, 160, 255))
    cy += rowh
out.save('docs/greenarrow/contact_ga.png')
print("wrote docs/greenarrow/contact_ga.png", out.size)
