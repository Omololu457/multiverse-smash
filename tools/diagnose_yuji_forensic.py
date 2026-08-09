#!/usr/bin/env python3
"""Forensic pass over disputed Yuji source PNGs to settle wiring corrections.
Read-only. Reports dims, alpha-gutter frame segmentation, greyscale test,
and cross-image similarity for the intro_2/intro_3/win contradiction."""
import sys
from PIL import Image

def load(p):
    return Image.open(p).convert("RGBA")

def col_alpha(im):
    """Return per-column max alpha (0..255)."""
    w, h = im.size
    px = im.load()
    cols = []
    for x in range(w):
        m = 0
        for y in range(h):
            a = px[x, y][3]
            if a > m: m = a
        cols.append(m)
    return cols

def segments(cols, thresh=8):
    """Find contiguous opaque column runs (candidate frames), with gaps."""
    runs = []
    start = None
    for x, a in enumerate(cols):
        if a > thresh:
            if start is None: start = x
        else:
            if start is not None:
                runs.append((start, x-1)); start = None
    if start is not None: runs.append((start, len(cols)-1))
    return runs

def is_greyscale(im, tol=12, sample_thresh=40):
    """Fraction of opaque pixels that are near-grey (r≈g≈b)."""
    w, h = im.size
    px = im.load()
    op = 0; grey = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r,g,b,a = px[x,y]
            if a < sample_thresh: continue
            op += 1
            if max(r,g,b)-min(r,g,b) <= tol: grey += 1
    return grey, op, (grey/op if op else 0)

def frame_slice(im, idx, n):
    w,h = im.size
    fw = w//n
    return im.crop((idx*fw, 0, (idx+1)*fw, h))

def img_diff(a, b):
    """Mean per-pixel RGBA abs diff over min-overlap region (0..255)."""
    w = min(a.size[0], b.size[0]); h = min(a.size[1], b.size[1])
    a = a.resize((w,h)); b = b.resize((w,h))
    pa, pb = a.load(), b.load()
    tot = 0; cnt = 0
    for y in range(0,h,2):
        for x in range(0,w,2):
            for c in range(4):
                tot += abs(pa[x,y][c]-pb[x,y][c])
            cnt += 4
    return tot/cnt if cnt else 999

def report(p):
    try:
        im = load(p)
    except Exception as e:
        print(f"  {p}: MISSING/ERR {e}"); return None
    cols = col_alpha(im)
    runs = segments(cols)
    g,o,frac = is_greyscale(im)
    print(f"  {p}: dims={im.size} opaque_runs={len(runs)} grey_frac={frac:.2f} ({g}/{o})")
    return im

print("===== DIMENSIONS / FRAME SEGMENTATION / GREYSCALE =====")
files = [
    "yuji_charge.png",
    "yuji_ultimate_2.png",
    "yuji_koma_attack_2.png",
    "yuji_koma2_uniform.png",
    "yuji_koma_attack_1.png",
    "yuji_koma1_uniform.png",
    "yuji_ultimate.png",
    "yuji_ultimate_action.png",
    "yuji_ultimate_effect.png",
    "yuji_ultimate_effect_1.png",
    "yuji_sukuna_slash.png",
    "yuji_sukuna_slahs_effect.png",
    "yuji_intro_1.png",
    "yuji_yuji_intro_2.png",
    "yuji_intro_2_uniform.png",
    "yuji_intro_3.png",
    "yuji_win.png",
    "yuji_lose.png",
    "yuji_cursed_energy_up_attack.png",
    "yuji_ball_cast_uniform.png",
    "yuji_specail_attack_1.png",
    "yuji_curesed_energy_ball_effect.png",
    "yuji_specail_attack_1_projectile.png",
    "yuji_transparent.png",
]
imgs = {}
for f in files:
    imgs[f] = report(f)

print()
print("===== INTRO CONTRADICTION: is intro_3 a WIN dup, or the 2nd half of the alt intro? =====")
i2 = imgs.get("yuji_yuji_intro_2.png")
i3 = imgs.get("yuji_intro_3.png")
win = imgs.get("yuji_win.png")
if i2 and i3:
    # segment each into frames
    r2 = segments(col_alpha(i2)); r3 = segments(col_alpha(i3))
    print(f"  intro_2 runs={len(r2)}  intro_3 runs={len(r3)}")
    # compare last opaque frame of i2 vs first opaque frame of i3
    def crop_run(im, run):
        return im.crop((run[0],0,run[1]+1,im.size[1]))
    if r2 and r3:
        last2 = crop_run(i2, r2[-1]); first3 = crop_run(i3, r3[0])
        print(f"  DIFF(last frame intro_2 , first frame intro_3) = {img_diff(last2,first3):.1f}  (low=continuous join)")
if i3 and win:
    r3 = segments(col_alpha(i3)); rw = segments(col_alpha(win))
    def crop_run(im, run):
        return im.crop((run[0],0,run[1]+1,im.size[1]))
    # compare first frame of intro_3 vs first frame of win
    if r3 and rw:
        f3 = crop_run(i3, r3[0]); fw = crop_run(win, rw[0])
        print(f"  DIFF(first frame intro_3 , first frame win) = {img_diff(f3,fw):.1f}  (low=intro_3 IS win-dup)")
        l3 = crop_run(i3, r3[-1]); lw = crop_run(win, rw[-1])
        print(f"  DIFF(last  frame intro_3 , last  frame win) = {img_diff(l3,lw):.1f}")

print()
print("===== KOMA2 ISOLATION: does koma2_uniform match koma_attack_2 / ultimate_2 content? =====")
u2 = imgs.get("yuji_ultimate_2.png")
ka2 = imgs.get("yuji_koma_attack_2.png")
k2u = imgs.get("yuji_koma2_uniform.png")
for name,a in [("ultimate_2",u2),("koma_attack_2",ka2)]:
    if a and k2u:
        print(f"  DIFF(koma2_uniform , {name}) whole-image = {img_diff(a,k2u):.1f}")
