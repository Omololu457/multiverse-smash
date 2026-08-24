#!/usr/bin/env python3
"""Visual verification for variant crew recolors.
Renders per companion: [ original first-frame | recolored first-frame | changed-pixels highlight ]
so the accent region + any bleed can be eyeballed. Writes one labelled montage PNG.

Usage: python3 tools/vv_crew.py OUT.png  comp:killer:sheet.png  [comp:killer:sheet.png ...]
The recolored file is <sheet base>__crew_<killer>.png (same dir).
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
PANEL_H = 190
try:
    FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
except Exception:
    FONT = ImageFont.load_default()

def first_frame(im):
    w, h = im.size
    cw = h if w >= h else w          # square cell = height (horizontal strip)
    return im.crop((0, 0, cw, h))

def fit(im, H):
    w, h = im.size
    return im.resize((max(1, int(w * H / h)), H), Image.NEAREST)

def panel(comp, killer, sheet):
    src = os.path.join(ROOT, sheet)
    rec = os.path.join(ROOT, sheet.replace(".png", f"__crew_{killer}.png"))
    a = Image.open(src).convert("RGBA")
    b = Image.open(rec).convert("RGBA")
    fa, fb = first_frame(a), first_frame(b)
    # changed-pixel highlight over dimmed grayscale of the original frame
    diff = Image.new("RGBA", fa.size, (0, 0, 0, 255))
    pa, pb = fa.load(), fb.load()
    dd = diff.load()
    changed = 0
    for y in range(fa.size[1]):
        for x in range(fa.size[0]):
            ra, ga, ba, aa = pa[x, y]
            rb, gb, bb, ab = pb[x, y]
            if aa == 0 and ab == 0:
                continue
            g = (ra + ga + ba) // 3
            if (ra, ga, ba) != (rb, gb, bb) or aa != ab:
                dd[x, y] = (255, 0, 255, 255); changed += 1
            else:
                dd[x, y] = (g // 3, g // 3, g // 3, 255)
    panels = [fit(p, PANEL_H) for p in (fa, fb, diff)]
    W = sum(p.size[0] for p in panels) + 24
    out = Image.new("RGBA", (W, PANEL_H + 26), (20, 20, 24, 255))
    x = 4
    for p in panels:
        out.paste(p, (x, 22)); x += p.size[0] + 8
    d = ImageDraw.Draw(out)
    d.text((4, 4), f"{comp} -> {killer}   (orig | crew | changed={changed}px magenta)", font=FONT, fill=(255, 255, 255, 255))
    return out

def main():
    out_path = sys.argv[1]
    rows = []
    for spec in sys.argv[2:]:
        comp, killer, sheet = spec.split(":", 2)
        try:
            rows.append(panel(comp, killer, sheet))
        except FileNotFoundError as e:
            print("MISSING", spec, e)
    if not rows:
        print("no rows"); return
    W = max(r.size[0] for r in rows)
    H = sum(r.size[1] for r in rows) + 4 * len(rows)
    mont = Image.new("RGBA", (W, H), (10, 10, 12, 255))
    y = 0
    for r in rows:
        mont.paste(r, (0, y)); y += r.size[1] + 4
    mont.save(os.path.join(ROOT, out_path))
    print("wrote", out_path, mont.size)

if __name__ == "__main__":
    main()
