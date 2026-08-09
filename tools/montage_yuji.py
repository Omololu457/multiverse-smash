#!/usr/bin/env python3
"""Lay out each PNG's alpha-gutter-detected frames as a labeled row on a
checker background, stacked into one tall montage for visual adjudication."""
from PIL import Image, ImageDraw

ALPHA = 8
SCALE = 3
PAD = 6

def col_alpha(im):
    w,h = im.size; px = im.load()
    return [max(px[x,y][3] for y in range(h)) for x in range(w)]

def segments(cols, thresh=ALPHA):
    runs=[]; s=None
    for x,a in enumerate(cols):
        if a>thresh:
            if s is None: s=x
        else:
            if s is not None: runs.append((s,x-1)); s=None
    if s is not None: runs.append((s,len(cols)-1))
    return runs

def frames(path):
    im = Image.open(path).convert("RGBA")
    runs = segments(col_alpha(im))
    return im, [im.crop((a,0,b+1,im.size[1])) for a,b in runs]

def checker(w,h,sz=8):
    bg = Image.new("RGBA",(w,h),(40,40,48,255))
    d = ImageDraw.Draw(bg)
    for y in range(0,h,sz):
        for x in range(0,w,sz):
            if (x//sz + y//sz)%2==0:
                d.rectangle([x,y,x+sz-1,y+sz-1], fill=(70,70,80,255))
    return bg

def build(rows, out):
    # rows: list of (label, path)
    rendered = []
    for label,path in rows:
        try:
            im, fr = frames(path)
        except Exception as e:
            print(f"skip {path}: {e}"); continue
        rendered.append((label, im, fr))
    if not rendered: return
    maxh = max(im.size[1] for _,im,_ in rendered)
    # width = sum of frame widths in the widest row
    def rowwidth(fr): return sum(f.size[0] for f in fr) + PAD*(len(fr)+1)
    W = max(rowwidth(fr) for _,_,fr in rendered)*SCALE
    rowH = (maxh*SCALE) + 26
    H = rowH*len(rendered)
    canvas = checker(W,H)
    d = ImageDraw.Draw(canvas)
    for i,(label,im,fr) in enumerate(rendered):
        y0 = i*rowH
        d.text((4,y0+2), f"{label}  [{len(fr)} frames  {im.size[0]}x{im.size[1]}]", fill=(255,255,120,255))
        x = PAD*SCALE
        for j,f in enumerate(fr):
            fw,fh = f.size
            big = f.resize((fw*SCALE, fh*SCALE))
            yy = y0+22 + (maxh*SCALE - fh*SCALE)
            canvas.alpha_composite(big, (x, yy))
            d.text((x, y0+22), str(j), fill=(160,255,160,255))
            x += fw*SCALE + PAD*SCALE
    canvas.convert("RGB").save(out)
    print(f"wrote {out}  ({W}x{H})")

import sys
which = sys.argv[1] if len(sys.argv)>1 else "intro"
if which=="intro":
    build([
        ("intro_1 (uniform src)", "yuji_intro_1.png"),
        ("yuji_yuji_intro_2 (ALT src)", "yuji_yuji_intro_2.png"),
        ("intro_2_uniform (WIRED)", "yuji_intro_2_uniform.png"),
        ("intro_3", "yuji_intro_3.png"),
        ("win", "yuji_win.png"),
        ("lose", "yuji_lose.png"),
    ], "/tmp/yuji_intro_montage.png")
elif which=="fx":
    build([
        ("charge (GREYSCALE)", "yuji_charge.png"),
        ("sukuna_slash (icon?)", "yuji_sukuna_slash.png"),
        ("sukuna_slahs_effect", "yuji_sukuna_slahs_effect.png"),
        ("ultimate_effect", "yuji_ultimate_effect.png"),
        ("ultimate_effect_1", "yuji_ultimate_effect_1.png"),
    ], "/tmp/yuji_fx_montage.png")
elif which=="koma":
    build([
        ("koma_attack_2 (=ultimate_2) 25f", "yuji_koma_attack_2.png"),
        ("koma2_uniform WIRED 25f", "yuji_koma2_uniform.png"),
    ], "/tmp/yuji_koma_montage.png")
