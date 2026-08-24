#!/usr/bin/env python3
# STAGE 5 — MAHORAGA form sheets for THE HANDLER's ultimate (a _skinAnim art-swap transformation:
# Vegeta-SSJ / Zaraki-Shikai pattern). While the ultimate is active the fighter renders THESE Mahoraga
# sheets instead of the Handler's (sprite.js `_skinAnim?.[action] || animationData?.[action]`). Source =
# mahoraga_row_01..06.png (row_07 is the ARISRADIKLIF#3447 credit strip, not art). Rows have NO label
# band, just a 4px left border (skipped via band start). Feet-plant bottom-align (anchorY:0), height-
# matched to idle so the form doesn't jitter. See HANDLER_ASSET_MAP.md.
import sys
from PIL import Image
ALPHA = 16

def load(src): return Image.open(src).convert("RGBA")

def frame_bbox(px, x0, x1, y0, y1):
    miny, maxy, minx, maxx = y1, y0 - 1, x1, x0 - 1
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > ALPHA:
                miny = min(miny, y); maxy = max(maxy, y); minx = min(minx, x); maxx = max(maxx, x)
    return None if maxy < miny else (minx, miny, maxx + 1, maxy + 1)

def build(src, spans, out, band, scale=1.0, center=False, pad=2):
    im = load(src); px = im.load(); y0, y1 = band
    cells = []
    for (x0, x1) in spans:
        bb = frame_bbox(px, x0, x1, y0, y1)
        if bb is None: print(f"  !! empty {x0}-{x1} in {src}", file=sys.stderr); continue
        c = im.crop(bb)
        if scale != 1.0:
            c = c.resize((max(1, round(c.width * scale)), max(1, round(c.height * scale))), Image.NEAREST)   # NEAREST = crisp pixel-art scaling (LANCZOS blurred Mahoraga)
        cells.append(c)
    uW = max(c.width for c in cells) + pad; uH = max(c.height for c in cells) + pad
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        dx = i * uW + (uW - c.width) // 2
        dy = (uH - c.height) // 2 if center else (uH - c.height - 1)   # center for icons, bottom-align for bodies
        strip.paste(c, (dx, dy), c)
    strip.save(out); print(f"{out}: {len(cells)} frames, cell {uW}x{uH}")
    return uW, uH

def content_h(sheet, ncols):
    im = load(sheet); px = im.load(); W, H = im.size; cw = W // ncols; m = 0
    for i in range(ncols):
        ys = [y for y in range(H) for x in range(i*cw, (i+1)*cw) if px[x, y][3] > ALPHA]
        if ys: m = max(m, max(ys) - min(ys) + 1)
    return m

# spans (left-border 4px skipped by band start; frame column spans from projection)
IDLE    = [(45,110)]                                                       # row_01 — Mahoraga standing
WALK    = [(226,279),(308,379),(419,502),(518,584),(609,698),(728,812)]    # row_01 — advance/walk cycle
WHEEL   = [(145,184)]                                                       # row_01 — golden Dharma Wheel icon (HUD only, center-cropped)
ENTRY   = [(137,208),(226,295),(336,400)]                                   # row_02 — draw-blade → advance (ult entry pose)
ATTACK  = [(38,109),(125,201),(222,292),(311,382)]                          # row_03 — attack combo swing (explosion/knockdown frames excluded)
COUNTER = [(49,108),(219,269),(285,323)]                                    # row_05 — brace → circular slash (adapted counter)

def main():
    build("mahoraga_row_01.png", IDLE,   "mahoraga_idle_uniform.png",   (4,134))
    ih = content_h("mahoraga_idle_uniform.png", 1)
    # height-match every body sheet to idle so the form doesn't grow/shrink between actions
    for src, spans, out, band in [
        ("mahoraga_row_01.png", WALK,    "mahoraga_walk_uniform.png",    (4,134)),
        ("mahoraga_row_02.png", ENTRY,   "mahoraga_entry_uniform.png",   (4,94)),
        ("mahoraga_row_03.png", ATTACK,  "mahoraga_attack_uniform.png",  (4,103)),
        ("mahoraga_row_05.png", COUNTER, "mahoraga_counter_uniform.png", (4,100)),
    ]:
        build(src, spans, "_tmp_native.png", band)          # measure native height
        nh = content_h("_tmp_native.png", len(spans))
        import os as _os; _os.remove("_tmp_native.png")
        build(src, spans, out, band, scale=(ih / nh if nh else 1.0))
    # Wheel icon (center-cropped, its own file for the adaptation-tracker HUD)
    build("mahoraga_row_01.png", WHEEL, "mahoraga_wheel_icon.png", (4,134), center=True)

if __name__ == "__main__":
    main()
