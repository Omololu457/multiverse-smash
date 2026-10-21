#!/usr/bin/env python3
"""Slice Homelander per-action uniform sprite strips from the inventory bboxes.
Yellow stripped to transparent. GLOBAL uniform cell (bottom-centre / foot-anchored) across
every sheet so on-screen scale is consistent (engine anchorY:0 plants feet at cell bottom).
Emits ./homelander_<action>_uniform.png + prints animationData lines."""
import json
from PIL import Image
import numpy as np

im = Image.open('../assets/source/homelander_original.png').convert('RGBA')
a = np.array(im)
R, G, B = [a[..., i].astype(int) for i in range(3)]
yellow = (R > 235) & (G > 235) & (B < 95)
rgba = a.copy(); rgba[yellow] = (0, 0, 0, 0)          # transparent background
src = Image.fromarray(rgba, 'RGBA')

inv = json.load(open('../assets/source/homelander_inventory.json'))
BY_ID = {fr["id"]: fr for row in inv["rows"] for fr in row["frames"]}

# action → ordered frame ids (from docs/homelander/LEDGER.md row map).
ACTIONS = {
    # grounded / shared (Homelander hovers like Omni-Man → idle reuses the hover)
    "idle":      [1, 2, 3],
    "flyHover":  [1, 2, 3, 75],       # neutral hover cycle (+ row10 hover idle)
    "flyCruise": [71, 72, 73, 74],    # the longer horizontal cruise cycle (row10)
    "flyRise":   [12, 21, 22],        # rising / launch
    "flyDive":   [11],                # diving
    "flyTurn":   [5, 6],              # cape-flip turnaround (facing flip)
    "flyDash":   [13, 14],            # cape twirl → air-dash pose
    "takeoff":   [20],                # red-blast-streak takeoff
    "land":      [4],                 # landing crouch
    "jump":      [20, 21, 22],        # standard jump reuses takeoff→rise
    "fall":      [78],                # falling pose
    "hurt":      [76, 77],
    "knockdown": [79],
    # basic normals
    "light":     [23, 24, 25],        # punch string (row4)
    "heavy":     [27, 28, 29, 30],    # cape-sweep heavy (row4 tail)
    "grab":      [57, 58, 59, 60],    # grab / lift (row8)
    # Heat Vision startup (flex, eyes brightening) — the laser's charge frames
    "heatCharge": [15, 16, 17, 18],
    "ultSilhouette": [19],            # FLIGHT 37 dark-startup
}

used = [BY_ID[i] for ids in ACTIONS.values() for i in ids]
CW = max(f["w"] for f in used) + 6
CH = max(f["h"] for f in used) + 6
print(f"global cell = {CW} x {CH}")

def build(action, ids):
    n = len(ids)
    strip = Image.new('RGBA', (CW * n, CH), (0, 0, 0, 0))
    for k, fid in enumerate(ids):
        fr = BY_ID[fid]; x0, y0, x1, y1 = fr["bbox"]
        sub = src.crop((x0, y0, x1 + 1, y1 + 1))
        px = CW * k + (CW - sub.width) // 2      # horizontal centre
        py = CH - sub.height                      # bottom-align (feet at cell bottom)
        strip.alpha_composite(sub, (px, py))
    strip.save(f'../homelander_{action}_uniform.png')
    return n

lines = []
for action, ids in ACTIONS.items():
    n = build(action, ids)
    speed = 7 if action in ("idle", "flyHover", "flyCruise") else (3 if action in ("light", "heavy", "heatCharge") else 5)
    loop = action in ("idle", "flyHover", "flyCruise", "flyRise", "flyDash")
    extra = "" if loop else ", loop: false, lockLastFrame: true"
    lines.append(f'    {action}: {{ frames: {n}, width: {CW}, height: {CH}, speed: {speed}, anchorY: 0{extra}, sheet: "./homelander_{action}_uniform.png" }},')

print("\n".join(lines))
print(f"\n{len(ACTIONS)} sheets, {sum(len(v) for v in ACTIONS.values())} frames placed")
