# tools/ninja_storm_build/extract.py — Ninja Storm Red (Shane) + Yellow (Dustin) sprite extraction.
#
#   python3 -I tools/ninja_storm_build/extract.py <repo-root>
#
# Sources (supplied, copied verbatim into assets/incoming/ninja_storm/):
#   red.png / yellow.png — "Ninja Storm Red/Yellow Ranger from 'Power Rangers Super Legends' (DS), ripped by Grim,
#   spritedatabase.net". The two sheets share ONE layout: tools/ninja_storm_build/segment.py finds the identical 331
#   frame boxes on both (asserted below), so one animation table serves both characters.
# Rules:
#   * CHROMA KEY: the flat page colour (82,144,118), tolerance 24 (sum of |dRGB|) — the same threshold the segmenter
#     uses, so every kept pixel is inside a ledgered frame box.
#   * NEAREST-NEIGHBOUR 1:1 copies only, never resampled. No invented art. The sheets face RIGHT (engine stored facing).
#   * The credit block (mugshots + ripper text, top right) is excluded from every frame cut; the LARGE mugshot is
#     reused as the select-screen portrait (it is the game's own character art) — ledgered as derived.
#   * The crescent projectile is CUT from the real slash frame R15F3 (its white/gold trail pixels only, the body is
#     dropped) — the sheet has no standalone body-less crescent, so this is a derived crop, never new art.
# Outputs: assets/ninja_storm/<red|yellow>/*.png, ninjaStormSprites.js, docs/ninja_storm_rangers/frames_<red|yellow>.json +
#          contact_sheet_<red|yellow>.png. ONE fighter (ninja_storm_rangers): red = Shane's stance, yellow = Dustin's stance.
import sys, os, json, hashlib, shutil
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segment import frames as seg_frames, BG

ROOT = sys.argv[1]
INC = os.path.join(ROOT, 'assets/incoming/ninja_storm')
os.makedirs(INC, exist_ok=True)
SRC = {'red': 'Red Ranger.png', 'yellow': 'Yellow Ranger.png'}
for k, f in SRC.items():
    dst = os.path.join(INC, k + '.png')
    if not os.path.exists(dst): shutil.copyfile(os.path.join(ROOT, f), dst)

# Cloud sub-row (R19F4 + R19F5 touch each other): 7 real frames split at the empty column valleys (measured).
CLOUD_SPLITS = [(227, 347), (350, 458), (460, 568), (570, 678), (680, 789), (791, 900), (903, 1021)]
CELL = {'n': (160, 104, 80, 100), 'big': (200, 136, 100, 132)}   # w, h, originX, originY (feet)

# ── ANIMATION TABLE (frame ids from segment.py; verified against the real pixels — docs/*/SPRITE_LEDGER.md) ──
# speed = ticks per frame for looping / untimed anims (timed moves get a frameTimeline in ninjaStormData.js).
ANIMS = {
  'idle':        (['R0F0', 'R0F1', 'R0F2', 'R0F3'], 10, True, 'n'),
  'idle_alt':    (['R0F4', 'R0F5', 'R0F6'], 12, True, 'n'),
  'walk':        (['R1F8', 'R1F9', 'R1F10', 'R1F11'], 8, True, 'n'),
  'walk_back':   (['R1F11', 'R1F10', 'R1F9', 'R1F8'], 8, True, 'n'),
  'run':         (['R1F0', 'R1F1', 'R1F2', 'R1F3', 'R1F4', 'R1F5', 'R1F6', 'R1F7'], 4, True, 'n'),
  'dash':        (['R6F2', 'R4F10'], 4, True, 'n'),
  'jump':        (['R8F0', 'R8F1', 'R8F2'], 5, False, 'n'),
  'fall':        (['R8F3', 'R8F4', 'R8F5', 'R8F6'], 6, False, 'n'),
  'land':        (['R8F19', 'R8F20', 'R8F21', 'R8F22'], 3, False, 'n'),
  'crouch':      (['R12F0', 'R12F1', 'R12F3'], 3, False, 'n'),
  'guard':       (['R4F7', 'R4F8'], 8, True, 'n'),
  'guard_hit':   (['R4F6'], 6, False, 'n'),
  'crouch_guard': (['R4F11', 'R4F12'], 8, True, 'n'),
  'hurt':        (['R26F0', 'R26F1'], 6, False, 'n'),
  'hurt_heavy':  (['R26F1', 'R26F2'], 6, False, 'n'),
  'hurt_air':    (['R11F18', 'R11F19'], 6, False, 'n'),
  'knockdown':   (['R26F2', 'R26F3', 'R26F4', 'R26F5', 'R26F6', 'R26F7', 'R26F8', 'R26F9', 'R26F10'], 5, False, 'n'),
  'airRoll':     (['R10F6', 'R10F7', 'R10F8', 'R10F9', 'R10F10', 'R10F11', 'R10F12', 'R10F13', 'R10F14'], 4, False, 'n'),
  'getup':       (['R27F0', 'R27F1', 'R27F2', 'R27F3', 'R27F4', 'R27F5', 'R27F6', 'R27F7', 'R27F8'], 4, False, 'n'),
  'grab':        (['R3F7'], 6, False, 'n'),
  'throw':       (['R3F8', 'R3F9'], 7, False, 'n'),
  'taunt':       (['R25F3', 'R25F4'], 14, False, 'n'),
  'intro':       (['R25F0', 'R25F1', 'R25F2', 'R25F3'], 9, False, 'n'),
  'win':         (['R25F3', 'R25F4', 'R25F5'], 16, False, 'n'),
  'lose':        (['R22F2', 'R22F3'], 14, False, 'n'),
  # Ninja Vanish body poses (the streak itself is FX art R2, drawn by ninjaStormFx)
  'vanishStart': (['R13F0', 'R13F1'], 2, False, 'n'),
  'vanishEnd':   (['R13F9', 'R13F10', 'R13F11'], 1, False, 'n'),
  # normals
  'light':       (['R3F0', 'R3F1', 'R3F2', 'R3F3'], 3, False, 'n'),
  'nStraight':   (['R3F4', 'R3F5', 'R3F6', 'R3F7', 'R3F8', 'R3F9'], 3, False, 'n'),
  'heavy':       (['R3F10', 'R3F11', 'R3F12', 'R3F13', 'R3F14', 'R3F15'], 4, False, 'n'),
  'heavyQuake':  (['R4F0', 'R4F1', 'R4F2', 'R4F3', 'R4F4', 'R4F5'], 4, False, 'n'),
  'up':          (['R5F5', 'R5F6', 'R5F7', 'R5F8', 'R5F9', 'R5F10', 'R5F11', 'R5F12'], 3, False, 'n'),
  'nLow':        (['R12F4', 'R12F5', 'R12F6', 'R12F7', 'R12F8', 'R12F9', 'R12F10'], 3, False, 'n'),
  'air':         (['R10F0', 'R10F1', 'R10F2', 'R10F3', 'R10F4', 'R10F5'], 3, False, 'n'),
  'down_air':    (['R9F9', 'R9F10', 'R9F11', 'R9F12'], 4, False, 'n'),
  'airSpin':     (['R9F0', 'R9F1', 'R9F2', 'R9F3', 'R9F4', 'R9F5', 'R9F6', 'R9F7', 'R9F8'], 3, False, 'n'),
  'nBackstep':   (['R27F13', 'R27F14', 'R27F15', 'R27F16', 'R27F17'], 4, False, 'n'),
  'nWake':       (['R27F9', 'R27F10', 'R27F11', 'R27F12'], 4, False, 'n'),
  # specials
  'nShuriken':   (['R5F0', 'R5F1', 'R5F2', 'R5F3', 'R5F4'], 3, False, 'n'),
  'nShurikenAir': (['R10F3', 'R10F4', 'R10F5'], 3, False, 'n'),
  'nBlade':      (['R14F0', 'R14F1', 'R14F2', 'R14F3', 'R14F4', 'R14F5', 'R14F6', 'R14F7', 'R14F8', 'R14F9', 'R14F10', 'R14F11'], 3, False, 'n'),
  'nBladeMode':  (['R15F0', 'R15F1', 'R15F2', 'R15F3', 'R15F4', 'R15F5', 'R15F6', 'R15F7', 'R15F8', 'R15F9'], 3, False, 'n'),
  'nWave':       (['R15F10', 'R15F11', 'R15F12', 'R15F13', 'R15F14'], 3, False, 'n'),
  'nWaveAir':    (['R18F3', 'R18F4', 'R18F5', 'R18F6', 'R18F7'], 3, False, 'n'),
  'nRise':       (['R16F7', 'R16F8', 'R16F9', 'R16F10', 'R16F11'], 3, False, 'n'),
  'nSpinSlash':  (['R16F0', 'R16F1', 'R16F2', 'R16F3', 'R16F4', 'R16F5', 'R16F6'], 3, False, 'n'),
  'nLowSlash':   (['R17F0', 'R17F1', 'R17F2', 'R17F3', 'R17F4', 'R17F5', 'R17F6'], 3, False, 'n'),
  'nAirSlash':   (['R18F0', 'R18F1', 'R18F2', 'R19F0', 'R19F1', 'R19F2', 'R19F3'], 3, False, 'n'),
  'nLock':       (['R20F0', 'R20F1'], 6, False, 'n'),
  'nLockUp':     (['R20F2', 'R20F3', 'R20F4', 'R20F5'], 4, False, 'n'),   # aim at an airborne foe
  'nLockAir':    (['R20F10', 'R20F11'], 6, False, 'n'),
  'nLockLow':    (['R20F6', 'R20F7', 'R20F8', 'R20F9'], 4, False, 'n'),
  'nClone':      (['R6F3', 'R6F4', 'R6F5', 'R6F6', 'R6F7'], 3, False, 'n'),
  'nSwap':       (['R13F2', 'R13F3', 'R13F4', 'R13F5', 'R13F6', 'R13F7', 'R13F8'], 2, False, 'n'),
  'nDashThrust': (['R22F7', 'R22F8', 'R22F9', 'R22F10', 'R22F11', 'R22F12'], 3, False, 'n'),
  'nRush':       (['R11F1', 'R11F2', 'R11F3', 'R11F4', 'R11F5'], 3, False, 'n'),
  'nMode':       (['CLOUD0', 'CLOUD1', 'CLOUD2', 'CLOUD3', 'CLOUD4', 'CLOUD5', 'CLOUD6'], 5, False, 'big'),
  'nUltBurst':   (['R23F0', 'R23F1', 'R23F2', 'R23F3', 'R23F4', 'R23F6', 'R23F7'], 6, False, 'big'),
  'nUltDebris':  (['R24F1', 'R24F3', 'R24F5', 'R24F6', 'R24F7'], 7, False, 'big'),
  'idleStand':   (['R22F0', 'R22F1', 'R22F4', 'R22F5', 'R22F6', 'R6F0', 'R6F1', 'R6F8', 'R6F9', 'R11F12', 'R11F16', 'R13F9', 'R4F9', 'R12F2'], 12, True, 'n'),
}
# FX strips (body-less; drawn by ninjaStormFx at their own size, origin = centre)
FX = {
  'fxStreak':  ['R2F0', 'R2F1', 'R2F2', 'R2F3', 'R2F4'],     # Ninja Vanish trail (render-only)
  'fxSpeck':   ['R2F5', 'R2F6', 'R2F7', 'R2F8', 'R8F9', 'R8F11', 'R8F13', 'R8F14', 'R8F16', 'R8F17', 'R8F18'],   # dust specks
  'fxDust':    ['R8F11'],
  'fxStar':    ['R21F0', 'R21F1'],                           # shuriken (no triangle icons exist on the sheet — see ledger)
  'fxBeam':    ['R21F2', 'R21F3', 'R21F4', 'R21F5'],         # lock-on beam: muzzle flash + 3 segments
  'fxBeamD':   ['R21F6', 'R21F7'],                           # diagonal beam
  'fxSpark':   ['R21F8', 'R21F9', 'R21F10', 'R21F11', 'R21F12', 'R21F13', 'R21F14', 'R11F17'],
  'fxChunk':   ['R23F5', 'R24F0', 'R24F2', 'R24F4', 'R24F8', 'R24F9', 'R24F10', 'R24F11'],   # loose debris chunks
  'fxSlide':   ['R11F6', 'R11F7', 'R11F8', 'R11F9', 'R11F10', 'R11F11', 'R11F13', 'R11F14', 'R11F15'],   # landing skid dust (with body) — ultimate arrival
  'fxLandRing': ['R8F7', 'R8F8', 'R8F10', 'R8F12', 'R8F15'],   # landing ring + dust (body baked in) — landing FX after a Vanish from the air
}
EXCLUDED = {'R7F0': 'tutorial direction arrow ↑ (UI marker, not character art)', 'R7F1': 'tutorial direction arrow ↗ (UI marker)',
            'R11F0': 'stray 4-px fragment (sheet noise)'}

def load(key):
    rgb = np.asarray(Image.open(os.path.join(INC, key + '.png')).convert('RGB')).astype(int)
    keep = np.abs(rgb - np.array(BG)).sum(2) > 24
    keep[:125, 780:] = False
    rgba = np.zeros(rgb.shape[:2] + (4,), np.uint8); rgba[..., :3] = rgb; rgba[..., 3] = keep * 255
    return rgba, keep

def boxes(path):
    B = {f['id']: f for f in seg_frames(path)}
    y0, y1 = 1384, 1489
    for i, (a, b) in enumerate(CLOUD_SPLITS): B[f'CLOUD{i}'] = {'id': f'CLOUD{i}', 'x': a, 'y': y0, 'w': b - a + 1, 'h': y1 - y0 + 1}
    return B

def crop(rgba, keep, b):
    x, y, w, h = b['x'], b['y'], b['w'], b['h']
    k = keep[y:y + h, x:x + w]
    ys, xs = np.where(k)
    if not len(ys): return None, None
    t, l = ys.min(), xs.min()
    c = rgba[y + t:y + ys.max() + 1, x + l:x + xs.max() + 1].copy()
    return c, c[..., 3] > 0

def anchor(m, kind):
    h, w = m.shape
    if kind == 'big':   # body stands in the middle of the burst / cloud: the planted feet = the densest bottom columns
        band = m[max(0, h - 10):]
        cols = band.sum(0); xs = np.where(cols > 0)[0]
        return int(round(np.average(np.arange(w), weights=cols + 1e-9))) if len(xs) else w // 2
    rows = m[int(h * 0.15):max(int(h * 0.15) + 1, int(h * 0.55))]   # torso band: median of the body pixels
    ys, xs = np.where(rows)
    return int(np.median(xs)) if len(xs) else w // 2

def build(key, B):
    rgba, keep = load(key)
    out = os.path.join(ROOT, 'assets/ninja_storm', key); os.makedirs(out, exist_ok=True)
    anim, used, meta = {}, {}, {}
    for name, (ids, speed, loop, kind) in ANIMS.items():
        W, H, OX, OY = CELL[kind]
        strip = Image.new('RGBA', (W * len(ids), H))
        for j, fid in enumerate(ids):
            c, m = crop(rgba, keep, B[fid])
            ax = anchor(m, kind)
            px, py = OX - ax, OY - c.shape[0] + 1
            assert px >= 0 and px + c.shape[1] <= W and py >= 0, (name, fid, px, py, c.shape)
            strip.paste(Image.fromarray(c), (j * W + px, py), Image.fromarray(c))
            used.setdefault(fid, []).append(name); meta[fid] = {'ax': int(ax), 'w': int(c.shape[1]), 'h': int(c.shape[0])}
        strip.save(os.path.join(out, name + '.png'))
        anim[name] = {'sheet': f'./assets/ninja_storm/{key}/{name}.png', 'frames': len(ids), 'width': W, 'height': H, 'speed': speed,
                      'anchorY': 0, 'originX': OX, 'originY': OY, 'loop': loop, 'lockLastFrame': True}
    fx = {}
    for name, ids in FX.items():
        cs = [crop(rgba, keep, B[fid])[0] for fid in ids]
        W = max(c.shape[1] for c in cs); H = max(c.shape[0] for c in cs)
        strip = Image.new('RGBA', (W * len(cs), H))
        for j, c in enumerate(cs):
            strip.paste(Image.fromarray(c), (j * W + (W - c.shape[1]) // 2, (H - c.shape[0]) // 2))
        strip.save(os.path.join(out, name + '.png'))
        for fid in ids: used.setdefault(fid, []).append(name)
        fx[name] = {'sheet': f'./assets/ninja_storm/{key}/{name}.png', 'frames': len(cs), 'width': W, 'height': H}
    # crescent projectile: the white / gold trail pixels of R15F3, right of the body (derived crop, no new art)
    c, m = crop(rgba, keep, B['R15F3'])
    r, g, bl = c[..., 0].astype(int), c[..., 1].astype(int), c[..., 2].astype(int)
    trail = m & (((r > 200) & (g > 200) & (bl > 170)) | ((r > 170) & (g > 120) & (bl < 120) & (g > bl + 40)))
    trail[:, :int(c.shape[1] * 0.45)] = False
    ys, xs = np.where(trail)
    cc = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(); cc[..., 3] = trail[ys.min():ys.max() + 1, xs.min():xs.max() + 1] * 255
    Image.fromarray(cc).save(os.path.join(out, 'fxCrescent.png'))
    fx['fxCrescent'] = {'sheet': f'./assets/ninja_storm/{key}/fxCrescent.png', 'frames': 1, 'width': int(cc.shape[1]), 'height': int(cc.shape[0])}
    used.setdefault('R15F3', []).append('fxCrescent (derived crop)')
    # portrait = the large credit-block mugshot (the game's own character art; the ripper text is not included)
    full = Image.open(os.path.join(INC, key + '.png')).convert('RGB')
    mug = np.asarray(full.crop((800, 0, 862, 70))).astype(int)
    pm = np.abs(mug - np.array(BG)).sum(2) > 24
    ys, xs = np.where(pm)
    port = full.crop((800 + xs.min(), ys.min(), 800 + xs.max() + 1, ys.max() + 1)).convert('RGBA')
    pa = np.asarray(port).copy(); pa[..., 3] = (np.abs(pa[..., :3].astype(int) - np.array(BG)).sum(2) > 24) * 255
    Image.fromarray(pa).resize((port.width * 3, port.height * 3), Image.NEAREST).save(os.path.join(out, 'portrait.png'))
    return anim, fx, used, meta, rgba

def main():
    Bs = {k: boxes(os.path.join(INC, k + '.png')) for k in SRC}
    ids_r = {k: (v['x'], v['y'], v['w'], v['h']) for k, v in Bs['red'].items()}
    ids_y = {k: (v['x'], v['y'], v['w'], v['h']) for k, v in Bs['yellow'].items()}
    assert ids_r == ids_y, 'the two sheets no longer share one layout'
    res = {}
    for key in SRC:
        anim, fx, used, meta, rgba = build(key, Bs[key])
        res[key] = (anim, fx)
        docs = os.path.join(ROOT, 'docs/ninja_storm_rangers'); os.makedirs(docs, exist_ok=True)
        sha = hashlib.sha256(open(os.path.join(INC, key + '.png'), 'rb').read()).hexdigest()
        allids = sorted(Bs[key], key=lambda s: (s.startswith('CLOUD'), int(s[1:].split('F')[0]) if s[0] == 'R' else 0, int(s.split('F')[-1]) if 'F' in s else int(s[5:])))
        rows = [{'id': i, **{k: Bs[key][i][k] for k in ('x', 'y', 'w', 'h')}, 'use': used.get(i, []), 'excluded': EXCLUDED.get(i)} for i in allids]
        json.dump({'source': f'assets/incoming/ninja_storm/{key}.png', 'sha256': sha, 'frames': rows}, open(os.path.join(docs, f'frames_{key}.json'), 'w'), indent=1)
        # labelled contact sheet
        im = Image.open(os.path.join(INC, key + '.png')).convert('RGB').resize((1044 * 2, 2151 * 2), Image.NEAREST)
        d = ImageDraw.Draw(im)
        for r in rows:
            if r['id'] in ('R19F4', 'R19F5'): continue
            col = (255, 255, 0) if r['use'] else (255, 80, 80)
            d.rectangle([r['x'] * 2, r['y'] * 2, (r['x'] + r['w']) * 2, (r['y'] + r['h']) * 2], outline=col)
            d.text((r['x'] * 2 + 1, (r['y'] + r['h']) * 2 + 1), r['id'], fill=(255, 255, 255))
        im.save(os.path.join(docs, f'contact_sheet_{key}.png'))
        unused = [r['id'] for r in rows if not r['use'] and not r['excluded'] and r['id'] not in ('R19F4', 'R19F5')]
        print(key, 'anims', len(anim), 'fx', len(fx), 'unused', unused)
    anim_r, fx_r = res['red']; anim_y, fx_y = res['yellow']
    geo = lambda a: {k: {kk: vv for kk, vv in v.items() if kk != 'sheet'} for k, v in a.items()}
    assert geo(anim_r) == geo(anim_y)
    js = ['// GENERATED by tools/ninja_storm_build/extract.py — do not hand-edit. Ledger: docs/ninja_storm_rangers/SPRITE_LEDGER.md (both stances)',
          '// One shared layout: the two sheets have identical frame boxes, so Shane and Dustin share every cell size / origin.',
          f'export const NS_ANIM_RED = {json.dumps(anim_r, indent=1)}',
          f'export const NS_ANIM_YELLOW = {json.dumps(anim_y, indent=1)}',
          f'export const NS_FX = {{ red: {json.dumps(fx_r)}, yellow: {json.dumps(fx_y)} }}', '']
    open(os.path.join(ROOT, 'ninjaStormSprites.js'), 'w').write('\n'.join(js))

main()
