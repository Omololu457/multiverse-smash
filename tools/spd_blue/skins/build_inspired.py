#!/usr/bin/env python3
"""S.P.D. Blue Ranger crossover / palette skins. Requires Pillow + scipy; never edits base art.

SPD Blue's Plug & Play art uses an exact, closed palette (verified over every cell by tools/spd_blue/extract.py):
  SUIT   6-step blue ramp  (0,8,74) (24,33,99) (41,49,123) (66,74,156) (82,99,181) (99,115,206)   helmet + suit
  LIGHT  3-step neutral    (148,148,140) (198,198,181) (247,255,231)   gloves, belt, chest/leg stripes …
         … but ALSO the baton blade, muzzle flash and beam core. Split by connectivity: a light blob whose 1-px rim is
         >= 45% transparent, or which is >= 160 px, floats in the air = WEAPON/EFFECT (kept — this also keeps the
         white Ranger gloves when a fist sticks out); the rest is TRIM.
  OUTLINE (0,0,0) (8,8,8) · SHADOW (49,49,41) (99,99,90) · a handful of single stray pixels — all kept exactly.
Every skin is a FINITE colour map per region (no hue filters): suit index i -> ramp[i], trim index j -> trim[j]. Alpha,
dimensions, pivots, outlines untouched; nearest-neighbour only. Region masks are written to assets/spd_blue/skins/masks/
(0 transparent · 1 outline · 2 suit · 3 trim · 4 shadow · 5 weapon/effect · 6 other) and documented in
docs/skins/spd_blue/region_mapping.json. Outputs assets/spd_blue/skins/<tag>/<sheet>.png (all 31 action strips, the
blaster shot, the portrait, and cells/phase0.png for the teleport ghost) + docs/skins/spd_blue/skins_contact.png.
    python3 tools/spd_blue/skins/build_inspired.py        (from the repo root)
"""
from pathlib import Path
import json, hashlib
import numpy as np
import scipy.ndimage as nd
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'assets/spd_blue'; OUT = SRC / 'skins'; DOC = ROOT / 'docs/skins/spd_blue'
BLUE = [(0, 8, 74), (24, 33, 99), (41, 49, 123), (66, 74, 156), (82, 99, 181), (99, 115, 206)]
LIGHT = [(148, 148, 140), (198, 198, 181), (247, 255, 231)]
OUTLINE = [(0, 0, 0), (8, 8, 8)]; SHADOW = [(49, 49, 41), (99, 99, 90)]
REGIONS = {0: 'transparent', 1: 'outline', 2: 'suit (helmet + body blue)', 3: 'trim (gloves/belt/stripes)',
           4: 'shadow greys', 5: 'free-floating light pixels, kept (baton blade, muzzle flash, beam core, white gloves at arm\'s end)', 6: 'other (kept)'}

SKINS = {
  # A. ALIEN X — Inspired: void-black suit, white trim (the shared starfield overlay draws on top; id ends "AlienX").
  'alienx':  {'suit': [(6, 6, 8), (10, 10, 13), (14, 15, 18), (19, 20, 24), (25, 27, 32), (33, 35, 41)],
              'trim': [(150, 156, 160), (205, 210, 214), (240, 244, 246)], 'barrier': ('#c8ffd8', '#2fbf6a')},
  # B. UPGRADE — Inspired: black suit, glowing green trim.
  'upgrade': {'suit': [(4, 6, 4), (8, 11, 8), (12, 16, 12), (17, 22, 17), (23, 30, 23), (31, 40, 31)],
              'trim': [(30, 150, 60), (70, 215, 100), (150, 255, 170)], 'barrier': ('#8dffad', '#1fd060')},
  # C. DIAMONDHEAD — Inspired: green-crystal suit, pale mint trim.
  'diamondhead': {'suit': [(8, 60, 50), (14, 88, 72), (24, 118, 96), (44, 156, 128), (76, 196, 162), (120, 228, 196)],
              'trim': [(150, 170, 165), (205, 225, 218), (240, 255, 248)], 'barrier': ('#a8ffe6', '#2fbf9a')},
  # D. HEATBLAST — Inspired: magma suit, yellow-hot trim.
  'heatblast': {'suit': [(70, 10, 0), (110, 22, 4), (150, 40, 6), (195, 70, 10), (230, 110, 20), (255, 150, 40)],
              'trim': [(200, 140, 20), (245, 200, 50), (255, 245, 150)], 'barrier': ('#ffc070', '#ff6a10')},
  # E. SPD RED — Inspired Palette: the EXACT 6-step red ramp of assets/spd_red (same game, same neutral trim).
  'spd_red': {'suit': [(107, 0, 0), (132, 0, 0), (165, 0, 0), (189, 8, 0), (222, 8, 0), (255, 8, 0)],
              'trim': LIGHT, 'barrier': ('#ff8a80', '#e01010')},
  # F. SPD SHADOW — Inspired: charcoal-navy suit, badge-gold trim. Colour only — no canine features, no Cruger claim.
  'shadow':  {'suit': [(6, 6, 12), (12, 12, 20), (19, 19, 30), (28, 28, 42), (38, 38, 56), (50, 50, 72)],
              'trim': [(150, 118, 40), (205, 170, 70), (245, 220, 130)], 'barrier': ('#ffe39a', '#b8901c')},
  # ── S.P.D. squad: the EXACT 6-step suit ramps sampled from the supplied Plug & Play Green / Yellow / Pink Ranger
  #    sheets in the repo root (same game; their sheet-background colours excluded). Team palette swaps.
  'green':   {'suit': [(8, 66, 24), (16, 99, 33), (24, 123, 49), (24, 156, 66), (33, 181, 82), (41, 214, 99)],
              'trim': LIGHT, 'barrier': ('#9dffa0', '#21b552')},
  'yellow':  {'suit': [(156, 132, 0), (173, 148, 16), (189, 173, 41), (206, 198, 57), (222, 222, 82), (239, 247, 107)],
              'trim': LIGHT, 'barrier': ('#fff59b', '#d6c21c')},
  'pink':    {'suit': [(255, 16, 107), (255, 41, 123), (255, 66, 140), (255, 99, 156), (255, 107, 181), (255, 115, 206)],
              'trim': LIGHT, 'barrier': ('#ffb0d6', '#ff2a86')},
  # S.W.A.T. Mode — Inspired: gunmetal suit, steel trim (palette only; no added armour panels).
  'swat':    {'suit': [(18, 22, 30), (28, 33, 44), (40, 46, 60), (56, 64, 80), (74, 84, 102), (96, 108, 128)],
              'trim': [(120, 128, 140), (168, 176, 188), (214, 220, 228)], 'barrier': ('#b9c6d8', '#5a6c88')},
  # A-Squad (Rogue) — Inspired: black suit, red trim.
  'asquad':  {'suit': [(8, 8, 10), (14, 14, 17), (21, 21, 25), (30, 30, 35), (40, 40, 46), (54, 54, 62)],
              'trim': [(150, 10, 10), (205, 24, 20), (250, 70, 60)], 'barrier': ('#ff7a70', '#b80c0c')},
  # Shared crossover trio (with Alien X above): Ben 10 green jacket + black trim; Albedo pale + red trim.
  'ben10':   {'suit': [(10, 50, 14), (16, 72, 20), (24, 96, 28), (36, 124, 38), (52, 150, 52), (72, 176, 70)],
              'trim': [(34, 34, 36), (62, 62, 66), (98, 98, 104)], 'barrier': ('#7dff7a', '#1aa31a')},
  'albedo':  {'suit': [(96, 96, 100), (124, 124, 128), (152, 152, 156), (180, 180, 184), (206, 206, 210), (228, 228, 232)],
              'trim': [(130, 8, 8), (180, 18, 16), (226, 36, 30)], 'barrier': ('#ff9a90', '#c81414')},
  # Omega-inspired tribute (white + blue) and Nova-inspired tribute (silver + purple).
  'omega':   {'suit': [(120, 128, 140), (150, 158, 170), (178, 186, 198), (204, 210, 220), (226, 230, 238), (244, 246, 250)],
              'trim': [(20, 60, 160), (40, 100, 220), (100, 160, 255)], 'barrier': ('#9cc6ff', '#2a64e0')},
  'nova':    {'suit': [(78, 80, 90), (104, 106, 118), (132, 134, 146), (160, 162, 174), (188, 190, 200), (214, 216, 224)],
              'trim': [(80, 30, 140), (120, 50, 200), (176, 110, 255)], 'barrier': ('#d0a8ff', '#7a32d0')},
  # ── creative extras ──
  # Delta Base Night Patrol: near-black suit, neon-cyan trim.
  'nightpatrol': {'suit': [(4, 8, 14), (8, 13, 22), (12, 19, 30), (17, 26, 40), (23, 35, 52), (31, 46, 66)],
              'trim': [(0, 150, 170), (0, 215, 235), (140, 255, 255)], 'barrier': ('#8ffcff', '#00c8e0')},
  # Chrome Deltamax: high-contrast mirror silver (dark troughs, bright speculars), white trim.
  'chrome':  {'suit': [(40, 44, 52), (86, 92, 104), (150, 156, 168), (118, 124, 136), (200, 206, 216), (250, 252, 255)],
              'trim': [(170, 176, 186), (220, 224, 232), (255, 255, 255)], 'barrier': ('#f0f6ff', '#9aa6ba')},
  # Holo-Training Sim: light cyan/teal hologram tones (alpha stays opaque — palette only).
  'holo':    {'suit': [(20, 110, 120), (40, 140, 150), (70, 175, 182), (110, 205, 210), (150, 228, 232), (195, 248, 250)],
              'trim': [(140, 230, 220), (200, 255, 248), (240, 255, 255)], 'barrier': ('#b8fff8', '#38c8c8')},
  # Gruumm's Conquest: villain purple suit, gold trim.
  'gruumm':  {'suit': [(36, 6, 54), (54, 12, 78), (74, 20, 104), (98, 32, 134), (124, 48, 164), (152, 70, 194)],
              'trim': [(160, 120, 20), (214, 170, 40), (255, 222, 100)], 'barrier': ('#ffd86a', '#8a2ac8')},
  # Kat's Lab Prototype: lab-white suit, gold trim.
  'katlab':  {'suit': [(150, 146, 136), (176, 172, 162), (200, 198, 188), (222, 220, 212), (238, 237, 230), (252, 252, 248)],
              'trim': [(170, 130, 30), (220, 180, 60), (255, 225, 120)], 'barrier': ('#ffe9a0', '#d0a020')},
  # Sapphire Glitter: the canon blue with baked glitter (fixed integer hash of the pixel position, no RNG).
  'glitter': {'suit': BLUE, 'trim': LIGHT, 'glitter': ((190, 220, 255), (255, 255, 255)), 'barrier': ('#bfe0ff', '#4a8cff')},
}


def glitter_mask(shape):
    # Same integer hash as the One Piece glitter skins: ~7% sparkles, ~2% of them pure white.
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.uint64)
    hh = (xx * np.uint64(374761393) + yy * np.uint64(668265263)) & np.uint64(0xFFFFFFFF)
    hh = ((hh ^ (hh >> np.uint64(13))) * np.uint64(1274126177)) & np.uint64(0xFFFFFFFF)
    hh = (hh ^ (hh >> np.uint64(16))) & np.uint64(0xFFFF)
    return hh < np.uint64(int(0.07 * 65536)), hh < np.uint64(int(0.02 * 65536))


def region_mask(arr):
    rgb = arr[..., :3]; al = arr[..., 3] > 0
    def isin(cols): return al & np.any([(rgb == c).all(-1) for c in cols], axis=0)
    m = np.where(al, 6, 0).astype(np.uint8)
    m[isin(OUTLINE)] = 1; m[isin(BLUE)] = 2; m[isin(SHADOW)] = 4
    light = isin(LIGHT)
    lab, n = nd.label(light, structure=np.ones((3, 3)))
    for i, sl in enumerate(nd.find_objects(lab), start=1):
        if sl is None: continue
        y0, y1 = max(sl[0].start - 1, 0), sl[0].stop + 1; x0, x1 = max(sl[1].start - 1, 0), sl[1].stop + 1
        b = lab[y0:y1, x0:x1] == i; ring = nd.binary_dilation(b, np.ones((3, 3))) & ~b
        # rim pixels outside the image count as transparent
        pad = np.pad(b, 1); pring = nd.binary_dilation(pad, np.ones((3, 3))) & ~pad
        tr = (~np.pad(al[y0:y1, x0:x1], 1, constant_values=False))[pring].mean() if pring.sum() else 1
        m[y0:y1, x0:x1][b] = 5 if (tr >= 0.45 or b.sum() >= 160) else 3
    return m


def paint(arr, m, sk):
    out = arr.copy()
    for i, c in enumerate(BLUE): out[(m == 2) & (arr[..., :3] == c).all(-1), :3] = sk['suit'][i]
    for j, c in enumerate(LIGHT): out[(m == 3) & (arr[..., :3] == c).all(-1), :3] = sk['trim'][j]
    if sk.get('glitter'):
        g, w = glitter_mask(m.shape); sparkle, white = sk['glitter']
        out[(m == 2) & g & ~w, :3] = sparkle; out[(m == 2) & w, :3] = white
    return out


def sources():
    files = sorted(p for p in SRC.glob('*.png'))          # 31 action strips + shot.png + portrait.png
    return files + [SRC / 'cells/phase0.png']


def main():
    (OUT / 'masks').mkdir(parents=True, exist_ok=True); DOC.mkdir(parents=True, exist_ok=True)
    audit = {}
    for f in sources():
        rel = f.relative_to(SRC).as_posix()
        arr = np.array(Image.open(f).convert('RGBA')); m = region_mask(arr)
        mp = OUT / 'masks' / rel; mp.parent.mkdir(parents=True, exist_ok=True); Image.fromarray(m, 'L').save(mp)
        audit[rel] = {'regions': {REGIONS[k]: int((m == k).sum()) for k in range(1, 7) if (m == k).any()},
                      'maskSha256': hashlib.sha256(m.tobytes()).hexdigest()}
        for tag, sk in SKINS.items():
            o = paint(arr, m, sk); assert (o[..., 3] == arr[..., 3]).all()
            dst = OUT / tag / rel; dst.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(o, 'RGBA').save(dst, optimize=True)
    (DOC / 'region_mapping.json').write_text(json.dumps({'regions': REGIONS, 'suitRamp': BLUE, 'trimRamp': LIGHT,
        'outline': OUTLINE, 'shadow': SHADOW, 'weaponRule': 'light blob with >=45% transparent rim or >=160 px',
        'skins': {t: {k: v for k, v in s.items()} for t, s in SKINS.items()}, 'files': audit}, indent=1) + '\n')
    # Contact sheet: idle / walk / baton / blaster / teleport ghost / barrier pose / hit / knockdown / win / portrait.
    poses = [('idle.png', 0), ('walk.png', 2), ('bChain.png', 1), ('shot.png', 0), ('cells/phase0.png', 0),
             ('bBarrier.png', 0), ('hurt.png', 0), ('knockdown.png', 3), ('win.png', 0), ('portrait.png', 0)]
    rows = ['default', *SKINS]; CW, CH = 112, 104
    sheet = Image.new('RGB', (110 + CW * len(poses), 18 + CH * len(rows)), (34, 43, 54)); d = ImageDraw.Draw(sheet)
    for c, (p, _) in enumerate(poses): d.text((110 + c * CW + 4, 2), p.replace('.png', ''), fill=(200, 220, 255))
    for r, tag in enumerate(rows):
        y = 18 + r * CH; d.text((6, y + CH // 2), tag, fill='white')
        for c, (p, fr) in enumerate(poses):
            im = Image.open((SRC if tag == 'default' else OUT / tag) / p).convert('RGBA')
            fw = 144 if p not in ('shot.png', 'portrait.png', 'cells/phase0.png') else im.width   # SPD_BLUE_ANIM frameWidth
            cell = im.crop((fr * fw, 0, fr * fw + fw, im.height)); bb = cell.getbbox(); cell = cell.crop(bb) if bb else cell
            k = max(1, min((CW - 8) // max(cell.width, 1), (CH - 8) // max(cell.height, 1)))
            cell = cell.resize((cell.width * k, cell.height * k), Image.Resampling.NEAREST)
            sheet.paste(cell, (110 + c * CW + (CW - cell.width) // 2, y + (CH - cell.height) // 2), cell)
    sheet.save(DOC / 'skins_contact.png')
    print(f'Built {len(SKINS)} SPD Blue palettes x {len(audit)} sheets; masks -> {OUT / "masks"}; contact -> {DOC / "skins_contact.png"}')


if __name__ == '__main__': main()
