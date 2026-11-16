#!/usr/bin/env python3
"""Cut the owner-supplied MUGEN effect sheets (the "ice shit" folder) into Enoch's render-only effect frames.
Explicit frame rects (x, y, w, h) per effect, chosen by eye from the sheets; each frame is saved as its own PNG under
assets/enoch/vfx/ and listed in enochVfx.js (name -> [[w, h], ...]). Anchor: 'c' = draw centred on the point, 'b' = feet.
   python3 -I tools/enoch/cut_vfx.py [--src DIR]"""
import json, sys
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[sys.argv.index('--src') + 1]) if '--src' in sys.argv else Path.home() / 'Downloads/new/untitled folder/ice shit'
OUT = ROOT / 'assets/enoch/vfx'
G = lambda W, H, cols, rows, n: [(round(W * (i % cols) / cols), round(H * (i // cols) / rows), round(W / cols), round(H / rows)) for i in range(n)]
FX = {
  # ice burst: spark → sphere → spikes → fading shell → dust
  'iceBurst': ('ice_punch_mugen_sprite_sheet_nzc_effect__by_boltanim_difzs5p.png', 'c',
               [(0, 0, 46, 36), (48, 0, 70, 56), (116, 0, 90, 82), (0, 84, 84, 92), (84, 84, 86, 92), (170, 84, 86, 94), (0, 172, 86, 84)]),
  # rising ground fire: kindle → roar → swirl → embers
  'fireRise': ('fire_charge_effect_mugen_sprite_sheet_nzc_by_boltanim_diu09m5.png', 'b', [(0, 0, 158, 112), (164, 0, 158, 160), (330, 0, 165, 180), (0, 160, 185, 235),
               (186, 176, 182, 220), (372, 182, 185, 215), (0, 382, 190, 215), (190, 400, 180, 190), (372, 400, 185, 160)]),
  # the four flame pillars (Fire Wall)
  'firePillar': ('fire_explosion_mugen_sprite_sheet_nzc_effect_by_boltanim_dh20cbb.png', 'b',
                 [(10, 160, 137, 287), (166, 156, 134, 291), (317, 164, 137, 283), (473, 166, 120, 281)]),
  # the flame jet (Heat Lens muzzle) + the burst puffs
  'fireJet': ('fire_explosion_mugen_sprite_sheet_nzc_effect_by_boltanim_dh20cbb.png', 'c', [(524, 16, 273, 129)]),
  'firePuff': ('fire_explosion_mugen_sprite_sheet_nzc_effect_by_boltanim_dh20cbb.png', 'c',
               [(854, 65, 104, 132), (606, 177, 112, 136), (730, 181, 110, 115), (870, 236, 90, 56)]),
  # a water splash: crown → spread → settle
  'waterSplash': ('water_splash_mugen_sprite_sheet_nzc_effect_by_boltanim_dhjo2zb.png', 'b',
                  [(0, 84, 156, 82), (158, 84, 148, 82), (312, 92, 134, 70), (312, 0, 124, 84)]),
  # the FIRE CAGE: the tall flame columns of the eruption sheet (a foe trapped in fire)
  'fireCage': ('fire_eruption_mugen_sprite_sheet_nzc_effect__by_boltanim_dilftp9.png', 'b',
               [(19, 31, 269, 349), (321, 51, 305, 337), (633, 31, 306, 350), (4, 415, 306, 349), (652, 432, 243, 331)]),
  # ICICLE SLABS (the vector sheet, navy background keyed out, scaled down): the ice box's lid and the air ice-slide block
  'icicle': ('blue-ice-sheets-with-icicles-vector-illustration/41940.jpg', 'c',
             [(386, 1929, 3632, 1028), (2880, 450, 1234, 1382), (225, 514, 2443, 1093), (321, 3182, 1575, 932)]),
  # ICE METEOR (Iceman partner sheet, MvC — "no credit needed", credited anyway): the falling boulder + the shatter chunks
  'iceRock': ('Arcade - Marvel vs. Capcom - Partners - Iceman.png', 'c', [(1, 130, 84, 147), (94, 169, 71, 108)]),
  'iceChunk': ('Arcade - Marvel vs. Capcom - Partners - Iceman.png', 'c',
               [(174, 229, 33, 48), (216, 225, 78, 52), (302, 225, 68, 52), (373, 251, 32, 26), (406, 228, 54, 49), (464, 246, 47, 31), (514, 241, 40, 36)]),
  # FIRE METEOR (Luminous Arc 2 "Fire Bullet", ripped by d9rad — "starts above the enemy and falls down"): the falling comet,
  # the impact bloom, then the ground burning
  'fireFall': ('DS _ DSi - Luminous Arc 2 - Miscellaneous - Fire Bullet.png', 'c', [(188, 159, 20, 43), (220, 149, 20, 71), (256, 177, 28, 43)]),
  'fireBall': ('DS _ DSi - Luminous Arc 2 - Miscellaneous - Fire Bullet.png', 'c', [(11, 161, 31, 39), (60, 159, 35, 38), (107, 167, 35, 36), (148, 168, 33, 35)]),
  'fireImpact': ('DS _ DSi - Luminous Arc 2 - Miscellaneous - Fire Bullet.png', 'b',
                 [(294, 180, 42, 40), (344, 169, 44, 51), (396, 165, 46, 55), (2, 226, 46, 51), (56, 233, 46, 44), (109, 233, 46, 44), (162, 233, 46, 44)]),
  # GROWING FLAMES (Joe & Mac, ripped by Vaati): kindle → roar (the burning floor of the fire meteor, the melting snowman's fire)
  'flameGrow': ('Arcade - Joe & Mac_ Caveman Ninja - Weapons - Fire.png', 'b',
                [(341, 128, 26, 32), (390, 113, 32, 46), (449, 99, 37, 59), (507, 89, 39, 70), (571, 72, 43, 86), (633, 72, 44, 86), (692, 72, 48, 86), (767, 72, 45, 86), (840, 73, 45, 86)]),
}
KEY = {'icicle': ((28, 47, 90), 70, 0.18), 'iceRock': ((0, 128, 255), 45, 1), 'iceChunk': ((0, 128, 255), 45, 1),
       'fireFall': ((153, 0, 153), 40, 1), 'fireBall': ((153, 0, 153), 40, 1), 'fireImpact': ((153, 0, 153), 40, 1), 'flameGrow': ((255, 255, 255), 12, 1)}   # name: (background colour, distance → transparent, scale)
OUT.mkdir(parents=True, exist_ok=True); meta = {}
for name, (fn, anchor, rects) in FX.items():
  im = Image.open(SRC / fn).convert('RGBA'); meta[name] = {'anchor': anchor, 'frames': []}
  if name in KEY:   # opaque background → alpha by colour distance (soft 30-level edge)
    bgc, dist, _ = KEY[name]; a = np.array(im).astype(int); d = np.sqrt(((a[..., :3] - np.array(bgc)) ** 2).sum(-1))
    a[..., 3] = np.clip((d - dist) * 255 / 30, 0, 255); im = Image.fromarray(a.astype(np.uint8), 'RGBA')
  for k, (x, y, w, h) in enumerate(rects):
    fr = im.crop((x, y, x + w, y + h))
    a = np.array(fr); lab, n = ndimage.label(ndimage.binary_dilation(a[..., 3] > 8, iterations=3))   # keep the main blob only:
    if n > 1:                                                                                          # slivers of neighbouring cells go
      big = 1 + int(np.argmax(ndimage.sum(np.ones_like(lab), lab, range(1, n + 1)))); a[lab != big] = 0; fr = Image.fromarray(a)
    bb = fr.getbbox() or (0, 0, w, h)
    if anchor == 'c': fr = fr.crop(bb)
    else: fr = fr.crop((bb[0], bb[1], bb[2], h if bb[3] > h - 30 else bb[3]))   # feet frames keep their ground line
    if name in KEY and KEY[name][2] != 1: fr = fr.resize((max(1, round(fr.width * KEY[name][2])), max(1, round(fr.height * KEY[name][2]))), Image.LANCZOS)
    fr.save(OUT / f'{name}_{k}.png'); meta[name]['frames'].append(list(fr.size))
(ROOT / 'enochVfx.js').write_text('// GENERATED by tools/enoch/cut_vfx.py: Enoch\'s effect frames (render-only), cut from the owner-supplied effect sheets.\n'
  'export const ENOCH_VFX = ' + json.dumps(meta) + '\nexport const ENOCH_VFX_PATH = (name, k) => `./assets/enoch/vfx/${name}_${k}.png`\n')
print({k: len(v['frames']) for k, v in meta.items()})
