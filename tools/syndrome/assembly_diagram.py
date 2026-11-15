#!/usr/bin/env python3
"""Syndrome: labelled diagram of the COMPOSITE Omnidroid (docs/syndrome/omnidroid_assembly.png).
Composes the supplied components exactly the way syndromeFx.js drawShell / omniStrike do (shell-local 1x coordinates,
OMNI = { eye [70,112], front [92,176], rear [-70,182], legs [±48,240] }, facing right), then marks every anchor.
Also writes docs/syndrome/omnidroid_components.png (each component strip, frame 0, with its origin cross).
Usage: python3 tools/syndrome/assembly_diagram.py"""
from pathlib import Path
import json, subprocess
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
M = ROOT / 'assets/syndrome/machines'
P = json.loads(subprocess.run(['node', '-e', "import('./syndromeSprites.js').then(m=>console.log(JSON.stringify(m.SYNDROME_PARTS)))"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
OMNI = {'eye': (70, 112), 'front': (92, 176), 'rear': (-70, 182), 'legs': [(-48, 240), (48, 240)]}
K = 2
def cell(name, i=0):
    A = P[name]; im = Image.open(M / f'{name}.png').convert('RGBA')
    return im.crop((i * A['width'], 0, (i + 1) * A['width'], A['height'])), A
def paste(cv, name, i, ax, ay, flipx=False):
    c, A = cell(name, i)
    if flipx: c = c.transpose(Image.FLIP_LEFT_RIGHT); ox = A['width'] - A['originX']
    else: ox = A['originX']
    c = c.resize((c.width * K, c.height * K), Image.NEAREST)
    cv.alpha_composite(c, (int(ax - ox * K), int(ay - A['originY'] * K)))
W, H = 1180, 900
cv = Image.new('RGBA', (W, H), (30, 32, 40, 255)); dr = ImageDraw.Draw(cv)
x0, y0 = 200, 60                                  # shell top-left (world px)
cx = x0 + 128 * K
loc = lambda p: (cx + p[0] * K, y0 + p[1] * K)
# rear leg (behind), shell, eye, front diagonal limb, front leg — the same order as drawSyndromeUnder / Over
for i, (lx, ly) in enumerate(OMNI['legs']):
    if i == 0: paste(cv, 'leg', 1, *loc((lx, ly)))
paste(cv, 'shellUpper', 0, x0, y0); paste(cv, 'shellLower', 0, x0, y0 + 126 * K)
paste(cv, 'eyeTrack', 0, *loc(OMNI['eye']))
paste(cv, 'leg', 1, *loc(OMNI['legs'][1]))
paste(cv, 'limbDiag', 2, *loc(OMNI['front']))
A = P['limbDiag']; tip = A['tips'][2]; fx, fy = loc(OMNI['front'])
tipW = (fx + (tip[0] - A['originX']) * K, fy + (tip[1] - A['originY']) * K)
def cross(p, col, lab, dx=10, dy=-18):
    x, y = p; dr.line([x - 9, y, x + 9, y], fill=col, width=3); dr.line([x, y - 9, x, y + 9], fill=col, width=3)
    dr.rectangle([x + dx - 2, y + dy - 2, x + dx + 8 + 6 * len(lab), y + dy + 13], fill=(0, 0, 0, 190)); dr.text((x + dx + 2, y + dy), lab, fill=col)
cross(loc((0, 0)), (255, 255, 120), 'shell centre-top (128,0)')
cross((x0, y0 + 126 * K), (255, 255, 120), 'equator join y=126 (upper 255w / lower 256w)', 10, 4)
cross(loc(OMNI['eye']), (120, 255, 255), 'eye visor (+70,112) eyeOpen/Track/Emitter/Fire')
cross(loc(OMNI['front']), (255, 140, 140), 'front socket (+92,176) limbDiag / laserArm', 10, 6)
cross(loc(OMNI['rear']), (255, 140, 140), 'rear socket (-70,182)')
for l in OMNI['legs']: cross(loc(l), (170, 255, 140), f'leg socket ({l[0]:+d},240)', 10, 6)
cross(tipW, (255, 200, 80), 'claw TIP (per-frame tips[]) = hit point', 12, 4)
dr.text((20, 16), 'Composite Omnidroid (facing right, components at x2 integer scale). Each layer is a separate supplied sprite;', fill=(235, 235, 235))
dr.text((20, 32), 'shell + rear leg draw UNDER the fighters, front limb / claw OVER the opponent. No full-screen collision: only the claw tip volume hits.', fill=(235, 235, 235))
cv.save(ROOT / 'docs/syndrome/omnidroid_assembly.png')
# components sheet
names = ['shellUpper', 'shellLower', 'eyeOpen', 'eyeTrack', 'eyeEmitter', 'eyeFire', 'limbDiag', 'leg', 'legSlam', 'claw', 'clawCharge', 'laserArm', 'cannonHead']
cells = [(n, *cell(n, 0)) for n in names if n in P]
CW = sum(c.width * K + 24 for _, c, _ in cells[:7]); rows = [cells[:7], cells[7:]]
sh = Image.new('RGBA', (max(sum(c.width * K + 24 for _, c, _ in r) for r in rows) + 20, sum(max(c.height * K for _, c, _ in r) + 40 for r in rows) + 10), (30, 32, 40, 255))
d2 = ImageDraw.Draw(sh); y = 10
for r in rows:
    x = 12; hmax = max(c.height * K for _, c, _ in r)
    for n, c, A in r:
        sh.alpha_composite(c.resize((c.width * K, c.height * K), Image.NEAREST), (x, y + 18))
        ox, oy = x + A['originX'] * K, y + 18 + A['originY'] * K
        d2.line([ox - 6, oy, ox + 6, oy], fill=(255, 80, 80), width=2); d2.line([ox, oy - 6, ox, oy + 6], fill=(255, 80, 80), width=2)
        d2.text((x, y), f"{n} {A['width']}x{A['height']} x{A['frames']}", fill=(235, 235, 235)); x += c.width * K + 24
    y += hmax + 40
sh.save(ROOT / 'docs/syndrome/omnidroid_components.png')
print('ok')
