#!/usr/bin/env python3
"""S.P.D. Red: find WHERE each gun / beam frame's shot leaves the art (the barrel tip / beam mouth).

For every frame that fires something, the muzzle is the forward-most opaque pixel of the weapon (the art faces
RIGHT), restricted to the upper-body band so a boot can never win. Its height is the centre of the opaque pixels
in the last 3 columns of that tip. Output:
  * prints the table that spdRedMuzzles.js carries (cell px, origin = the feet at (80, 80))
  * docs/spd_red/muzzle_anchors.png: every firing frame ×4 with a BOX on the muzzle and the TRACE line the shot follows

    python3 tools/spd_red_build/detect_muzzles.py "$PWD"
"""
import sys, os
from PIL import Image, ImageDraw

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
A = os.path.join(ROOT, 'assets', 'spd_red')
CELL_W, CELL_H, Z = 160, 84, 4

# key → (sheet, frame index, what fires from it)
FRAMES = {
    'blaster':     ('sBlaster', 1,    'DELTA BLASTER bolt (aimed frame: the bolt spawns while this frame shows)'),
    'recoil':      ('sBlaster', 2,    'muzzle kick after the shot (no spawn: reference only)'),
    'rapid':       ('sRapid', 0,      'RAPID FIRE tracer (aimed frame)'),
    'blasterAir':  ('sBlasterAir', 0, 'DELTA BLASTER (air) bolt'),
    'judge':       ('sJudge', 1,      'JUDGMENT morpher scan beam'),
    'deltamax':    ('sDeltamax', 0,   'DELTAMAX STRIKE / SUPER beam mouth (braced Deltamax Striker)'),
    'deltamaxFire':('sDeltamax', 2,   'beam frame: the art beam runs from the hands to this mouth'),
}

def cell(name, i):
    im = Image.open(os.path.join(A, name + '.png')).convert('RGBA')
    return im.crop((i * CELL_W, 0, i * CELL_W + CELL_W, CELL_H))

def muzzle(c, y_max=60):
    px = c.load()
    for x in range(CELL_W - 1, -1, -1):
        if any(px[x, y][3] for y in range(y_max)):
            ys = [y for xx in range(x - 2, x + 1) for y in range(y_max) if px[xx, y][3]]
            # weapon band only: the rows that are opaque in the very tip column
            tip_ys = [y for y in range(y_max) if px[x, y][3]]
            lo, hi = min(tip_ys), max(tip_ys)
            band = [y for y in ys if lo - 2 <= y <= hi + 2]
            return x, round(sum(band) / len(band))
    return None

def main():
    rows = []
    for key, (sheet, i, what) in FRAMES.items():
        c = cell(sheet, i)
        mx, my = muzzle(c)
        if key == 'deltamaxFire':   # beam frames: the beam axis is the braced weapon's (the art beam is spiky at its end)
            my = rows[-1][3]
        rows.append((key, sheet, i, my, mx, what))
        print(f"  {key:13s} {sheet}[{i}]  muzzle=({mx},{my})  {what}")

    pad = 18
    out = Image.new('RGBA', (CELL_W * Z + 2 * pad, len(rows) * (CELL_H * Z + pad) + pad), (40, 40, 52, 255))
    d = ImageDraw.Draw(out)
    for r, (key, sheet, i, my, mx, what) in enumerate(rows):
        oy = pad + r * (CELL_H * Z + pad)
        big = cell(sheet, i).resize((CELL_W * Z, CELL_H * Z), Image.NEAREST)
        out.alpha_composite(big, (pad, oy))
        bx, by = pad + mx * Z, oy + my * Z
        d.line([(bx, by), (pad + CELL_W * Z, by)], fill=(54, 214, 230, 255), width=2)          # the trace
        d.rectangle([bx - 10, by - 10, bx + 10, by + 10], outline=(255, 230, 0, 255), width=3)   # the muzzle box
        d.line([(pad + 80 * Z - 6, oy + 80 * Z), (pad + 80 * Z + 6, oy + 80 * Z)], fill=(255, 255, 255, 255), width=2)   # feet origin
        d.text((pad + 4, oy + 4), f"{key}  {sheet}[{i}]  muzzle ({mx},{my})  {what}", fill=(255, 255, 255, 255))
    path = os.path.join(ROOT, 'docs', 'spd_red', 'muzzle_anchors.png')
    out.save(path)
    print('wrote', path)

if __name__ == '__main__':
    main()
