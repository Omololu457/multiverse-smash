#!/usr/bin/env python3
"""Omega Ranger — 10 more alt-colour skins (cosmetic only, zero gameplay).

    python3 tools/gen_omega_more.py [tag|all]

Reuses tools/gen_omega_creative.py's region system unchanged: masks are captured from the ORIGINAL pixels
(ARMOR = white/grey plates, VISOR = blue lens, EMBLEM = gold crest/trim; black outlines match none and stay
byte-identical), then each region is tone-remapped so the shading survives. One addition: `glitter`, a
deterministic sparkle on armour pixels (integer hash of x, y — no RNG), like the One Piece fighters' glitter skins.
Writes `<sheet>__<tag>.png` next to every wired Omega sheet + the mugshot. Registered by omegaSkins.js.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import gen_omega_creative as G
from PIL import Image

ROOT = G.ROOT
K = lambda hexv, sat=None, spread=1.0, floor=0.0: (hexv, sat, spread, floor)

# tag: armor, visor, emblem, [glitter]
SKINS = {
    'ben10':   dict(armor=K('#1C1F1C', 0.10, 1.45, 0.15), visor=K('#3CFF4A', None), emblem=K('#7CFF3A', None)),     # Ben 10: black + Omnitrix green
    'nova':    dict(armor=K('#A3A6B6', 0.08), visor=K('#E02AA8', None), emblem=K('#7A3FD0', None)),                 # Nova Ranger tribute: silver, magenta lens, purple crest
    'shadow':  dict(armor=K('#18234F', None, 1.3, 0.12), visor=K('#0E0E14', 0.10), emblem=K('#D9A733', None)),       # Shadow Ranger tribute: midnight navy, badge gold
    'krybot':  dict(armor=K('#70757F', 0.07), visor=K('#FF8A1E', None), emblem=K('#16161A', 0.10)),                  # Krybot Infiltrator: Troobian silver, orange sensor
    'gruumm':  dict(armor=K('#3A1450', None, 1.3, 0.12), visor=K('#7CFF3A', None), emblem=K('#D4A22C', None)),       # Gruumm's Corruption: villain purple, toxic lens, gold
    'magma':   dict(armor=K('#2B2224', 0.12, 1.45, 0.15), visor=K('#FF5A14', None), emblem=K('#FFC21E', None)),     # Magma Core: charcoal plates, lava lens
    'arctic':  dict(armor=K('#86C4EC', 0.40), visor=K('#0E1E5C', None), emblem=K('#F4F8FF', 0.02)),                  # Arctic Patrol: ice plates, deep-blue lens
    'neon':    dict(armor=K('#1C1C26', 0.12, 1.45, 0.15), visor=K('#FF2BD6', None), emblem=K('#2BF0FF', None)),     # Neon Delta Base: night black, magenta + cyan
    'holo':    dict(armor=K('#6FE8F0', 0.42), visor=K('#F4FFFF', 0.02), emblem=K('#0E5A66', None)),                  # Holo-Training Sim: hologram cyan
    'glitter': dict(armor=K('#B03A9E', None), visor=K('#F4F2F8', 0.02), emblem=K('#D8D8E0', 0.03), glitter=True),    # Galaxy Glitter: orchid + sparkles
}
NAMES = {'ben10': 'Ben 10', 'nova': 'Nova Ranger Tribute', 'shadow': 'Shadow Ranger Tribute', 'krybot': 'Krybot Infiltrator',
         'gruumm': "Gruumm's Corruption", 'magma': 'Magma Core', 'arctic': 'Arctic Patrol', 'neon': 'Neon Delta Base',
         'holo': 'Holo-Training Sim', 'glitter': 'Galaxy Glitter'}

def h32(x, y):
    h = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return h ^ (h >> 16)

def recolor(path, tag, cfg):
    img = Image.open(path).convert('RGBA'); W, H = img.size
    px = bytearray(img.tobytes())
    masks = {name: [] for name, _ in G.REGIONS}
    for i in range(W * H):
        if px[i * 4 + 3] == 0: continue
        h, s, v = G.rgb_hsv(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])
        for name, sel in G.REGIONS:
            if sel(h, s, v): masks[name].append(i); break
    total = 0
    for name, _ in G.REGIONS:
        hexv, sat, spread, floor = cfg[name]
        total += G.paint(px, masks[name], hexv, spread=spread, to_sat=sat, floor=floor)
    if cfg.get('glitter'):
        for i in masks['armor']:
            x, y = i % W, i // W; r = h32(x, y) % 13
            if r == 0: k = 0.75      # bright sparkle
            elif r == 1: k = 0.35    # soft sparkle
            else: continue
            for c in range(3): px[i * 4 + c] = round(px[i * 4 + c] + (255 - px[i * 4 + c]) * k)
    Image.frombytes('RGBA', (W, H), bytes(px)).save(path[:-4] + f'__{tag}.png')
    return total

def build(tag):
    targets = G.wired_sheets() + ['SPD_Omega_Ranger_mugshot.png']
    n = 0
    for name in targets:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p): print('  SKIP (missing)', name); continue
        n += recolor(p, tag, SKINS[tag])
    print(f'{tag:8} {len(targets)} sheets, {n} px')

if __name__ == '__main__':
    t = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for tag in (SKINS if t == 'all' else [t]): build(tag)
