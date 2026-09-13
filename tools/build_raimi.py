#!/usr/bin/env python3
# Build Spider-Man (Sam Raimi) — rosterKey "spiderman_raimi" — from the single fan-art sheet
# spiderman/spider_man_sam_raimi_sprite_sheet_by_jaspion_v_dkhnze5.png (art by Jaspion; teal bg).
# Pipeline (mirrors tools/reslice_spiderman.py): (1) KEY the solid teal background (48,121,114) to
# alpha via global colour-distance — safe here because the dark-red/black suit shares no teal; then
# (2) per-band alpha-gutter frame-detect -> per-frame bbox -> repack into ONE uniform, centered-X,
# BOTTOM-aligned cell so a single anchorY:0 plants feet across every standing action.
# SOURCE stays UNTOUCHED (we key an in-memory copy). Outputs raimi_<action>_uniform.png.
import sys
from PIL import Image

SRC = "spiderman/spider_man_sam_raimi_sprite_sheet_by_jaspion_v_dkhnze5.png"
BG = (48, 121, 114); TOL = 60
ALPHA = 16

def keyed_master():
    im = Image.open(SRC).convert("RGBA"); W, H = im.size; px = im.load()
    t2 = TOL * TOL
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a > 0 and (r-BG[0])**2 + (g-BG[1])**2 + (b-BG[2])**2 <= t2:
                px[x, y] = (0, 0, 0, 0)
    return im

def runs_of(px, x0, x1, y0, y1):
    col = [any(px[x, y][3] > ALPHA for y in range(y0, y1 + 1)) for x in range(x0, x1 + 1)]
    out = []; s = -1
    for i, x in enumerate(range(x0, x1 + 1)):
        if col[i]:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, x1])
    return out

def even(x0, x1, n):
    w = (x1 - x0 + 1) / n
    return [(int(round(x0 + i * w)), int(round(x0 + (i + 1) * w)) - 1) for i in range(n)]

def reslice(im, out, band, keep=None, pick=None, xrects=None, minw=10, pad_to=None):
    W, H = im.size; px = im.load()
    y0, y1 = band
    if xrects is not None:
        runs = [list(r) for r in xrects]
    else:
        runs = runs_of(px, 0, W - 1, y0, y1)
        runs = [r for r in runs if (r[1] - r[0] + 1) >= minw]
        if keep is not None: runs = runs[keep[0]:keep[1] + 1]
        if pick is not None: runs = [runs[i] for i in pick]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = y1 + 1, y0 - 1
        for y in range(y0, y1 + 1):
            if any(px[x, y][3] > ALPHA for x in range(rx0, rx1 + 1)):
                if y < miny: miny = y
                if y > maxy: maxy = y
        if maxy < miny: continue
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    if not frames:
        print(f"!! {out}: NO frames in band {band}"); return 0, 0, 0
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    if pad_to: uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        strip.paste(cell, (i * uW + (uW - sw) // 2, uH - sh - 1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    return len(frames), uW, uH

# ── FINAL animation map (tight gap-separated bands + honest frame picks). Movement + core normals
#    + Stage-3/4 web SPECIALS (web-shoot / flying-web-kick / spider-sense rows) + Web Cocoon ult cast. ──
FINAL_JOBS = [
    # idle — band1 standing frames (the leading 5 are a ceiling-roll/getup; take the 6 clean standing
    # frames 5-10; frames 6 & 9 carry a spider-sense flash above the head — a lively pulse, feet stay planted).
    dict(out="raimi_idle_uniform.png", band=(239, 341), pick=[5, 6, 7, 8, 9, 10]),
    # walk / run — one row (472,560): frames 0-6 = walk stride, 7-13 = forward run lean.
    dict(out="raimi_walk_uniform.png", band=(472, 560), pick=[0, 1, 2, 3, 4, 5, 6]),
    dict(out="raimi_run_uniform.png",  band=(472, 560), pick=[7, 8, 9, 10, 11, 12]),
    # jump / fall / air / down_air — leap row (1241,1348): 0-5 crouch→rise, 6-8 aerial, 8-9 curl-dive.
    dict(out="raimi_jump_uniform.png",    band=(1241, 1348), pick=[0, 1, 2, 3, 4, 5]),
    dict(out="raimi_fall_uniform.png",    band=(1241, 1348), pick=[6, 7, 8]),
    dict(out="raimi_air_uniform.png",     band=(1241, 1348), pick=[6, 7]),
    dict(out="raimi_downair_uniform.png", band=(1241, 1348), pick=[8, 9]),
    # normals — light punch string (665,780) f0-2; heavy = high-kick (813,895) f3-5; up = rising kick f2-3.
    dict(out="raimi_light_uniform.png", band=(665, 780), pick=[0, 1, 2]),
    dict(out="raimi_heavy_uniform.png", band=(813, 895), pick=[3, 4, 5]),
    dict(out="raimi_up_uniform.png",    band=(813, 895), pick=[2, 3]),
    # crouch + low attack — crouch row (1020,1079): f0-1 crouch, f2-3 low poke.
    dict(out="raimi_crouch_uniform.png",      band=(1020, 1079), pick=[0, 1]),
    dict(out="raimi_crouchlight_uniform.png", band=(1020, 1079), pick=[2, 3]),
    # knockdown — tumble row (1107,1222) f6-10. NO clean standing-flinch frame on the sheet (GAP) →
    # characters.js maps `hurt` to this sheet's frame 0 (backward-lean recoil) as an honest same-char reuse.
    dict(out="raimi_knockdown_uniform.png", band=(1107, 1222), pick=[6, 7, 8, 9, 10]),
    # win / taunt — band1 frame 11 (celebratory arm-raise). intro reuses idle (no dedicated intro art → GAP).
    dict(out="raimi_win_uniform.png", band=(239, 341), pick=[11]),

    # ── SPECIALS (Stage 3, honest to sheet) ──────────────────────────────────────────────
    # Web Shot — forward web-shooter cast. Row (911,991) f1 windup → f2 arm-thrust → f4 reach-thrust.
    # Neutral/Up/AIR route here; a procedural web-ball projectile is spawned at the release beat.
    dict(out="raimi_webshot_uniform.png", band=(911, 991), pick=[1, 2, 4]),
    # Web Zip — i-frame gap-closer. Row (1630,1697) horizontal flying-kicks that trail a web strand:
    # f1 launch → f3 full extension → f5 follow. Reads as a web-line dive-kick lunge.
    dict(out="raimi_webzip_uniform.png", band=(1630, 1697), pick=[1, 3, 5]),
    # Spider-Sense Dodge — reactive evade. Row (1630,1697) f6 = the alert pose with the white
    # spider-sense flash marks above the head (held single frame during the i-frame window).
    dict(out="raimi_spidersense_uniform.png", band=(1630, 1697), pick=[6]),
    # Ultimate "Web Cocoon" cast — the dramatic overhead web-arc unload. Row (911,991) f6→f7→f8
    # (arm raises → giant web strand arcs out over the head). Procedural web-net FX pins the foe.
    dict(out="raimi_webthwip_uniform.png", band=(911, 991), pick=[6, 7, 8]),
]

def make_portrait(im):
    # Band0 (6,205) is a hi-res portrait + logo. Crop the head/bust; trim to content; save.
    crop = im.crop((300, 5, 565, 200))
    bb = crop.getbbox()
    if bb: crop = crop.crop(bb)
    crop.save("raimi_portrait.png")
    print(f"OK raimi_portrait.png: {crop.size}")

if __name__ == "__main__":
    im = keyed_master()
    im.save("/tmp/raimi_master.png")
    for j in FINAL_JOBS:
        reslice(im, **j)
    make_portrait(im)
