#!/usr/bin/env python3
# Re-slice Genos (One-Punch Man) from the SINGLE master sheet
#   ddk5eh3-5cfadb89-4c66-4fc4-b56f-bcb3d538c4f8.png  (884x2228 RGB)
# into CLEAN, feet-aligned uniform cells (one *_uniform.png per action). Unlike the Saitama
# pipeline (which received pre-cut per-move PNGs), this sheet is one teal-keyed atlas gridded
# by GREEN divider lines, so slicing is: key teal+green -> transparent, crop a measured y-band,
# segment frames by teal-gap columns (SAME segmenter as the Stage-0 analysis so pick indices
# match the numbered contact sheets), per-frame content bbox, repack centered-X / bottom-aligned
# into one uniform cell (single anchorY:0 plants feet everywhere). See GENOS_ASSET_MAP.md.
import sys
from PIL import Image
import numpy as np

SRC = "ddk5eh3-5cfadb89-4c66-4fc4-b56f-bcb3d538c4f8.png"
ALPHA = 16

# 24 green divider rows -> 23 bands (measured; NOT eyeballed). Band N = rows (divs[N-1], divs[N]).
DIVS = [0,74,199,274,347,420,497,570,643,716,808,895,975,1113,1185,1258,1348,
        1427,1510,1628,1892,2000,2089,2227]
BANDS = {i+1: (DIVS[i]+1, DIVS[i+1]-1) for i in range(len(DIVS)-1)}

def load_keyed():
    """Master sheet -> RGBA with teal #008080 AND pure-green grid keyed to transparent."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    teal = np.array([0,128,128])
    tmask = (np.abs(a-teal).sum(2) < 40)
    gmask = (a[:,:,1] > 200) & (a[:,:,0] < 80) & (a[:,:,2] < 80)
    alpha = np.where(tmask | gmask, 0, 255).astype('uint8')
    rgba = np.dstack([a.astype('uint8'), alpha])
    return Image.fromarray(rgba, "RGBA")

def col_runs(px, W, y0, y1, minpx=3, gap=4, minw=4):
    """Column frame-segmentation identical to the Stage-0 analysis (minpx>=3, merge gap<=4,
    drop runs narrower than minw). Guarantees pick indices line up with numbered_b*.png."""
    on = []
    for x in range(W):
        c = sum(1 for y in range(y0, y1+1) if px[x, y][3] > ALPHA)
        on.append(c >= minpx)
    runs = []; s = -1
    for x in range(W):
        if on[x]:
            if s < 0: s = x
        elif s >= 0:
            runs.append([s, x-1]); s = -1
    if s >= 0: runs.append([s, W-1])
    merged = []
    for r in runs:
        if merged and r[0]-merged[-1][1] <= gap: merged[-1][1] = r[1]
        else: merged.append(list(r))
    return [r for r in merged if r[1]-r[0]+1 >= minw]

def reslice(im, out, band, pick=None):
    W, H = im.size; px = im.load()
    y0, y1 = BANDS[band]
    runs = col_runs(px, W, y0, y1)
    if pick is not None:
        runs = [runs[i] for i in pick]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = y1+1, y0-1
        for y in range(y0, y1+1):
            for x in range(rx0, rx1+1):
                if px[x, y][3] > ALPHA:
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    break
        frames.append((rx0, miny, rx1-rx0+1, maxy-miny+1))
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    strip = Image.new("RGBA", (uW*len(frames), uH), (0,0,0,0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx+sw, sy+sh))
        strip.paste(cell, (i*uW + (uW-sw)//2, uH-sh-1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_portrait(strip_src, out, target_h=288):
    """Bust portrait from an already-resliced idle strip's frame 0 (head + upper torso)."""
    im = Image.open(strip_src).convert("RGBA"); W, H = im.size; px = im.load()
    # frame 0 occupies the first cell; find its content bbox
    cw = W // max(1, sum(1 for _ in [0]))  # single-cell fallback; we just bbox the whole first cell region
    xs = [x for x in range(W) for y in range(H) if px[x, y][3] > ALPHA]
    ys = [y for x in range(W) for y in range(H) if px[x, y][3] > ALPHA]
    # limit to leftmost cell: recompute using per-column presence, take first contiguous block
    colhit = [any(px[x, y][3] > ALPHA for y in range(H)) for x in range(W)]
    x0 = next(x for x in range(W) if colhit[x])
    x1 = next((x for x in range(x0, W) if not colhit[x]), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1+1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    bust_h = int((y1-y0+1) * 0.60)
    crop = im.crop((x0, y0, x1+1, y0+bust_h))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width*scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (bust from {strip_src})")

if __name__ == "__main__":
    im = load_keyed()
    # ── STAGE 1 — movement / state (picks match numbered_b1/b2/b3.png) ──
    # Band 1: idle / taunt / walk / dash
    reslice(im, "genos_idle_uniform.png",  1, pick=[6,7,8,9])                 # standing breathing
    reslice(im, "genos_taunt_uniform.png", 1, pick=[0,1,2,3,4,5])            # relaxed -> arm-extend gesture
    reslice(im, "genos_walk_uniform.png",  1, pick=[10,11,12,13,14,15,16,17])# 8-frame walk cycle
    reslice(im, "genos_dash_uniform.png",  1, pick=[18,19])                  # motion-streak -> lunge
    # Band 2: run / jump  (13,14 = detached-limb FX props -> EXCLUDED per owner decision)
    reslice(im, "genos_run_uniform.png",   2, pick=[0,1,2,3,4,5,6,7,8,9])    # boosted run cycle
    reslice(im, "genos_jump_uniform.png",  2, pick=[10,11,12])               # knee-raise + boot-thruster
    # Band 3: hurt / knockdown / getup  (7 = <4px debris, dropped by segmenter's minw)
    reslice(im, "genos_hurt_uniform.png",      3, pick=[0,1,2])              # stagger flinch
    reslice(im, "genos_knockdown_uniform.png", 3, pick=[3,4,5,6])            # fall -> prone -> bowed leak
    reslice(im, "genos_getup_uniform.png",     3, pick=[8,9,10,11,12])       # rise w/ core-spark -> stand
    # Portrait — bust from idle frame 0
    make_portrait("genos_idle_uniform.png", "genos_portrait.png")

    # ── STAGE 2 — normals + guard (band 4 palm-thrust, band 8 dash-punch/guard) ──
    # Band 4 = a palm-thrust that ignites a short fire-jet (0=ready→2=extend→3-5=palm fire; 11-13=ring
    #   projectiles EXCLUDED here, reserved for a Stage-4 projectile). light = un-ignited jab; heavy = ignited.
    reslice(im, "genos_light_uniform.png", 4, pick=[0,1,2])              # jab (no fire) — fast poke
    reslice(im, "genos_heavy_uniform.png", 4, pick=[0,1,2,3,4,5])        # palm-cannon (short disjoint fire)
    # Band 8 = jet-dash punch (0-3), committed punch (4), crossed-arms guard (5-6), counter-burst (7).
    reslice(im, "genos_air_uniform.png",   8, pick=[0,1,2,3])            # jet-dash punch → AIR normal (down_air reuses)
    reslice(im, "genos_guard_uniform.png", 8, pick=[5,6])               # crossed-arms guard (fills Stage-1 gap)

    # ── STAGE 3 — command chain (Fwd+Heavy 3-stage rekka): rapid-rush → spin-launcher ──
    # opener + rapid-burst come from band 7 (windup punches 1-5 / diagonal streak multi-hit 6-12);
    # finisher = band 5 spinning charge (energy-ring build 1-6 → spin kick 7-8).
    reslice(im, "genos_rush1_uniform.png", 7, pick=[1,2,3,4,5])          # opener — forward punches
    reslice(im, "genos_rush2_uniform.png", 7, pick=[6,7,8,9,10,11,12])   # rapid streak-burst (multi-hit)
    reslice(im, "genos_rush3_uniform.png", 5, pick=[1,2,3,4,5,6,7,8])    # spinning charge LAUNCHER finisher

    # ── STAGE 4 — specials (Incineration Cannon 3-tier / Machine Gun Blows / Jet Dash / Afterimage Dash) ──
    # Incineration Cannon cast poses — the SAME two-hand palm blast at 3 scales (tap/mid/long hold tiers).
    reslice(im, "genos_incinerate1_uniform.png", 6,  pick=[0,1,2,3,4,5,6])   # tier 1 (small blast)
    reslice(im, "genos_incinerate2_uniform.png", 12, pick=[0,1,2,3,4,5])     # tier 2 (big burst)
    reslice(im, "genos_incinerate3_uniform.png", 20, pick=[0,1,2,3,4])       # tier 3 (GIANT flame column)
    reslice(im, "genos_machinegun_uniform.png",  16, pick=[0,1,2,3,4,5,6])   # Machine Gun Blows (yellow spread flurry; air reuses)
    reslice(im, "genos_jetdash_uniform.png",     9,  pick=[0,1,2,3,4,5,6])   # Jet Dash (lunging gap-closer strike)
    reslice(im, "genos_afterimage_uniform.png",  18, pick=[2,3,4,5,6,7,8,9,10])  # Afterimage Dash (cyan flash → strike)

    # ── STAGE 5 — Overdrive ULTIMATE (band 13 flame-aura ignite pose) ──
    reslice(im, "genos_overdrive_uniform.png", 13, pick=[0,1,2,3,4,5])   # rise → flame column erupts (Overdrive ignite)

    # ── STAGE 6 — win pose (band 20 standing tail → fist-raised). lose = REUSE knockdown (flagged). ──
    reslice(im, "genos_win_uniform.png", 20, pick=[8,9,10,11,12])        # victory: stand → fist-raised
