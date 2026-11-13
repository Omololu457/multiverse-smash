# tools/arlong_build/extract.py — Arlong sprite extraction (Phase 1).
#
#   python3 -I tools/arlong_build/extract.py <repo-root>
#
# Source: assets/incoming/arlong/arlong_sheet.png (GBA "One Piece" enemy sheet, ripped by Paddy — same ripper/scale
# as Zoro / Luffy / Buggy). Rules honoured:
#   * chroma key = the sheet's own alpha (background is already alpha-0); nothing else is keyed out
#   * 8-connected component cut (segment.py), components grouped per sheet row
#   * NEAREST-NEIGHBOUR ONLY: every frame is copied pixel-for-pixel at 1:1, never resampled / interpolated
#   * NO invented art. The only transform is a horizontal MIRROR (the sheet faces LEFT; the engine stores
#     RIGHT-facing art and flips at runtime) — ledgered as "derived copy (mirror)". Render-only afterimages /
#     tinted water use these same pixels at draw time (canvas alpha / composite), never new pixels on disk.
#   * the ONLY exclusion is the ripper credit text ("Ripped by Paddy / No credit needed") → docs/arlong/CREDITS.md
#   * the Going Merry figurehead is the SAME art Zoro's build shipped as assets/zoro/merry.png → reused, not
#     duplicated (pixel-compared below; result recorded in frames.json)
# Outputs: assets/arlong/*.png, arlongSprites.js (ARLONG_ANIM / ARLONG_FX), docs/arlong/contact_sheet.png,
#          docs/arlong/frames.json, docs/arlong/SPRITE_LEDGER.md
import sys, os, json, hashlib
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segment import segment

ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets/incoming/arlong/arlong_sheet.png')
OUT = os.path.join(ROOT, 'assets/arlong')
DOCS = os.path.join(ROOT, 'docs/arlong')
CELL_W, CELL_H, OX, OY = 256, 176, 128, 164      # feet at y=164, pivot x=128
os.makedirs(OUT, exist_ok=True); os.makedirs(DOCS, exist_ok=True)
sheet = Image.open(SRC).convert('RGBA')
sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()

FRAMES, LAB = segment(SRC)
EXPECT = [4, 4, 2, 4, 4, 3, 5, 3, 3, 3, 3, 1, 4, 3, 5, 5, 3, 2, 3, 3, 3]
counts = [sum(1 for k in FRAMES if k.split('F')[0] == f'R{r}') for r in range(1, 22)]
assert counts == EXPECT, counts
CREDIT_X = 210                                    # the credit text starts at sheet x=210 inside R21F3 (sheep = 152..209)
MERRY_RECT = (FRAMES['R21F3'][0], FRAMES['R21F3'][1], CREDIT_X - 1, FRAMES['R21F3'][3])
CREDIT_RECT = (CREDIT_X, FRAMES['R21F3'][1], FRAMES['R21F3'][2], FRAMES['R21F3'][3])

def crop(fid):
    """Frame pixels ONLY (other rows' components that poke into the bbox are cleared)."""
    x0, y0, x1, y1, ids = FRAMES[fid]
    im = sheet.crop((x0, y0, x1 + 1, y1 + 1)).copy()
    lab = LAB[y0:y1 + 1, x0:x1 + 1]; px = im.load(); keep = set(ids)
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3] and lab[y, x] not in keep: px[x, y] = (0, 0, 0, 0)
    return im
mirror = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)

DESC = {
 'R1F1': 'idle A (sawshark fishman, yellow jacket, green shorts)', 'R1F2': 'idle B', 'R1F3': 'KIRIBACHI standalone, vertical',
 'R1F4': 'PORTRAIT (grinning shark face close-up)',
 'R2F1': 'knocked back / falling (airborne)', 'R2F2': 'lying face-down', 'R2F3': 'lying, pushing up', 'R2F4': 'lying on back',
 'R3F1': 'KIRIBACHI standalone, angled', 'R3F2': 'KIRIBACHI standalone, flat',
 'R4F1': 'standing / walk 1', 'R4F2': 'walk 2', 'R4F3': 'walk 3 (arms out)', 'R4F4': 'walk 4 (arms out)',
 'R5F1': 'hunched stance (jaw closed)', 'R5F2': 'jaw-open lunge 1', 'R5F3': 'jaw-open lunge 2', 'R5F4': 'jaw-open lunge 3',
 'R6F1': 'white star-burst S', 'R6F2': 'white star-burst L (teeth)', 'R6F3': 'white star-burst M (radial)',
 'R7F1': 'standing pose', 'R7F2': 'side flex 1', 'R7F3': 'side flex 2', 'R7F4': 'karate wind-up (jacket swing)',
 'R7F5': 'WIDE STANCE with power burst',
 'R8F1': 'blade held level, hilt forward', 'R8F2': 'blade level, braced', 'R8F3': 'blade lifted to shoulder / overhead',
 'R9F1': 'Kiribachi swing 1 (blade up)', 'R9F2': 'Kiribachi swing 2', 'R9F3': 'Kiribachi swing 3 (follow-through)',
 'R10F1': 'big sweeping arc 1 (silver trail)', 'R10F2': 'big sweeping arc 2', 'R10F3': 'big sweeping arc 3',
 'R11F1': 'downward slash with arc', 'R11F2': 'spinning low slash + ground spray', 'R11F3': 'rising arc slash',
 'R12F1': 'jumping with the blade',
 'R13F1': 'sitting, dazed', 'R13F2': 'sitting up', 'R13F3': 'hunched hurt', 'R13F4': 'standing up (recovered)',
 'R14F1': 'crouched, blade resting on the ground', 'R14F2': 'kneeling, blade on the ground', 'R14F3': 'standing, blade overhead',
 'R15F1': 'leap (Shark On Darts take-off)', 'R15F2': 'DRILL / torpedo 1 (nose-first)', 'R15F3': 'DRILL / torpedo 2',
 'R15F4': 'DRILL / torpedo 3', 'R15F5': 'tumble out of the dive (nose-first landing)',
 'R16F1': 'PURPLE water jet XS', 'R16F2': 'PURPLE water jet S', 'R16F3': 'PURPLE water jet M', 'R16F4': 'PURPLE water jet L',
 'R16F5': 'PURPLE water jet XL',
 'R17F1': 'standing pose (flex 1)', 'R17F2': 'standing pose (flex 2)', 'R17F3': 'standing pose (flex 3)',
 'R18F1': 'dash lean', 'R18F2': 'lunge (wide low step)',
 'R19F1': 'punch + white impact 1', 'R19F2': 'punch + white impact 2', 'R19F3': 'punch + white impact 3',
 'R20F1': 'white burst L (+ spark)', 'R20F2': 'white burst M', 'R20F3': 'white burst S',
 'R21F1': 'hunched guard 1', 'R21F2': 'hunched guard 2', 'R21F3': 'GOING MERRY sheep figurehead + ripper credit text',
}

def feet_pivot(img):
    a = img.getchannel('A').load(); w, h = img.size; xs = []
    for y in range(max(0, h - 6), h):
        xs += [x for x in range(w) if a[x, y]]
    xs.sort()
    return xs[len(xs) // 2] if xs else w // 2

# Pivot overrides (right-facing / mirrored frame coords) for frames whose bottom rows hold the blade or a trail
# instead of the feet — read off the contact sheet (the body's centre line over the stance).
PIVOT = {'R10F1': 60, 'R10F2': 80, 'R10F3': 48, 'R11F1': 40, 'R11F2': 32, 'R11F3': 36, 'R9F3': 34,
         'R14F1': 34, 'R14F2': 40, 'R14F3': 50, 'R12F1': 40, 'R8F3': 30}
CENTRED = {'R2F1', 'R2F2', 'R2F3', 'R2F4', 'R15F1', 'R15F2', 'R15F3', 'R15F4', 'R15F5'}
# The sheet is not uniformly left-facing: these three swing follow-throughs are drawn already facing RIGHT (blade
# and ground spray on the right) — they are stored UNMIRRORED (plain 1:1 copies) so every strike points forward.
FACE_RIGHT = {'R9F3', 'R11F2', 'R11F3'}
def place(fid):
    im = crop(fid) if fid in FACE_RIGHT else mirror(crop(fid))
    piv = PIVOT.get(fid, im.width // 2 if fid in CENTRED else feet_pivot(im))
    return im, piv

# ── Animations: name → (frame ids, speed, loop). Moves read their exact frame via data timelines. ──
ANIMS = {
 'idle': (['R1F1', 'R1F2'], 22, True),
 'walk': (['R4F1', 'R4F2', 'R4F3', 'R4F4'], 9, True),
 'walk_back': (['R4F4', 'R4F3', 'R4F2', 'R4F1'], 10, True),
 'run': (['R4F3', 'R18F1', 'R4F4', 'R18F1'], 6, True),
 'dash': (['R18F1'], 6, True),
 'jump': (['R15F1'], 6, False),
 'fall': (['R15F1'], 6, False),
 'crouch': (['R21F1'], 6, True),
 'guard': (['R21F2'], 6, True),
 'guard_hit': (['R21F2'], 6, False),
 'hurt': (['R13F3'], 6, False),
 'hurt_heavy': (['R13F2'], 6, False),
 'hurt_air': (['R2F1'], 6, False),
 'knockdown': (['R2F1', 'R2F4', 'R2F2'], 9, False),
 'getup': (['R2F3', 'R13F1', 'R13F4'], 9, False),
 'grab': (['R5F1'], 6, False),
 'throw': (['R5F1', 'R19F1'], 7, False),
 'taunt': (['R17F1', 'R17F2', 'R17F3'], 12, True),
 'idleFlex': (['R7F1', 'R17F1', 'R17F2', 'R17F3', 'R7F2', 'R7F3', 'R8F3'], 18, True),   # IDLE > 10 s
 'intro': (['R14F1', 'R14F2', 'R4F1', 'R4F2', 'R4F3', 'R4F4', 'R8F1'], 12, False),
 'win': (['R17F1'], 30, True),                       # WIN 1 (portrait panel + planted blade drawn by arlongFx)
 'win2': (['R7F5', 'R14F3'], 24, False),             # WIN 2 — wide stance → blade overhead
 'lose': (['R2F2'], 30, False),                      # + the Kiribachi laid flat beside him (arlongFx)
 # NORMALS — blade
 'light': (['R5F1', 'R19F1'], 4, False),             # Jab (blunt)
 'aStraight': (['R7F4', 'R19F3'], 5, False),         # Fishman straight (blunt)
 'aSwing': (['R9F1', 'R9F2', 'R9F3'], 5, False),     # Kiribachi swing (slash)
 'heavy': (['R10F1', 'R10F2', 'R10F3'], 6, False),   # Heavy saw arc (slash, launches)
 'aLow': (['R11F1', 'R11F2'], 5, False),             # Low saw (slash, low)
 'up': (['R5F1', 'R19F2'], 6, False),                # Rising claw (blunt, anti-air)
 'air': (['R12F1'], 6, False),                       # Air saw (slash)
 'down_air': (['R15F2'], 6, False),                  # air ↓ — nose dive (blunt)
 'aLunge': (['R18F1', 'R18F2'], 6, False),           # Lunge punch (blunt)
 'aWake': (['R8F1', 'R8F3', 'R9F3'], 5, False),      # Wake-up reversal (overhead raise, slash)
 'aBite': (['R5F2', 'R5F3', 'R5F4'], 5, False),      # BITE (consumes a tooth)
 # NORMALS — weaponless Fishman Karate (blade planted / thrown)
 'aKSwing': (['R7F4', 'R19F1'], 5, False),
 'aKHeavy': (['R7F5', 'R19F2'], 6, False),
 'aKLow': (['R18F2'], 6, False),
 'aKAir': (['R15F1'], 6, False),
 'aKWake': (['R7F5', 'R19F3'], 5, False),
 # SPECIALS
 'aTooth': (['R7F5', 'R5F2', 'R5F3', 'R5F4'], 5, False),          # Shark On Tooth
 'aDarts': (['R15F1', 'R15F2', 'R15F3', 'R15F4', 'R15F5'], 4, False),   # Shark On Darts
 'aSeiken': (['R7F4', 'R19F1', 'R19F2', 'R19F3'], 6, False),      # Gosenmaigawara Seiken
 'aThrow': (['R8F1', 'R8F2', 'R8F3', 'R9F3'], 6, False),                  # Kiribachi Throw
 'aRecall': (['R19F1', 'R5F1'], 8, False),                        # recall gesture
 'aPickup': (['R14F2', 'R14F3'], 6, False),                       # pick the planted blade up
 'aTidal': (['R11F1', 'R11F2', 'R11F3'], 5, False),               # Tidal Sweep
 'aShot': (['R19F1', 'R19F2'], 5, False),                         # Water Shot
 'aSuper': (['R15F1', 'R15F2', 'R15F3', 'R15F4', 'R8F3', 'R14F3', 'R10F1', 'R10F2', 'R10F3'], 6, False),   # ARLONG PARK
}

def strip(name, fids):
    out = Image.new('RGBA', (CELL_W * len(fids), CELL_H), (0, 0, 0, 0))
    for i, fid in enumerate(fids):
        img, piv = place(fid)
        out.paste(img, (i * CELL_W + OX - piv, OY - img.height + (6 if fid in CENTRED and fid != 'R15F1' else 0)), img)
    out.save(os.path.join(OUT, name + '.png'))

anim_js = {}
for name, (fids, speed, loop) in ANIMS.items():
    strip(name, fids)
    anim_js[name] = {'sheet': f'./assets/arlong/{name}.png', 'frames': len(fids), 'width': CELL_W, 'height': CELL_H,
                     'speed': speed, 'anchorY': 0, 'originX': OX, 'originY': OY, 'loop': loop, 'lockLastFrame': True}

def hstrip(fname, fids, flip=True, cw=None, ch=None, bottom=False):
    ims = [mirror(crop(f)) if flip else crop(f) for f in fids]
    cw = cw or max(i.width for i in ims); ch = ch or max(i.height for i in ims)
    out = Image.new('RGBA', (cw * len(ims), ch), (0, 0, 0, 0))
    for k, im in enumerate(ims): out.paste(im, (k * cw + (cw - im.width) // 2, (ch - im.height) if bottom else (ch - im.height) // 2), im)
    out.save(os.path.join(OUT, fname)); return {'sheet': f'./assets/arlong/{fname}', 'frames': len(ims), 'w': cw, 'h': ch}

FX = {}
FX['bladeV'] = hstrip('fx_blade_v.png', ['R1F3'], flip=False)        # planted Kiribachi (upright) / HUD icon
FX['bladeAngled'] = hstrip('fx_blade_angled.png', ['R3F1'])          # thrown, spinning (rotated at draw time)
FX['bladeFlat'] = hstrip('fx_blade_flat.png', ['R3F2'])              # recall slide along the ground / LOSE
FX['burstA'] = hstrip('fx_burst_a.png', ['R6F1', 'R6F2', 'R6F3'])   # Fishman Karate impact bursts
FX['burstB'] = hstrip('fx_burst_b.png', ['R20F1', 'R20F2', 'R20F3']) # small impact bursts / super splash
FX['jets'] = hstrip('fx_jets.png', ['R16F1', 'R16F2', 'R16F3', 'R16F4', 'R16F5'], bottom=True)   # water jets (shot / shockwave / geyser / zone)
FX['drill'] = hstrip('fx_drill.png', ['R15F2', 'R15F3', 'R15F4'], flip=False)   # torpedo body (vertical, rotated at draw time)
FX['portrait'] = {'sheet': './assets/arlong/portrait_frame.png'}
crop('R1F4').save(os.path.join(OUT, 'portrait_frame.png'))
pw = max(crop('R1F4').width, crop('R1F4').height)
por = Image.new('RGBA', (pw, pw), (0, 0, 0, 0)); por.paste(crop('R1F4'), (0, (pw - crop('R1F4').height) // 2), crop('R1F4'))
por.save(os.path.join(OUT, 'portrait.png'))

merry = sheet.crop((MERRY_RECT[0], MERRY_RECT[1], MERRY_RECT[2] + 1, MERRY_RECT[3] + 1)); merry = merry.crop(merry.getbbox())
zm_path = os.path.join(ROOT, 'assets/zoro/merry.png'); same = False
if os.path.exists(zm_path):
    zm = Image.open(zm_path).convert('RGBA'); same = zm.size == merry.size and list(zm.getdata()) == list(merry.getdata())
FX['merry'] = {'sheet': './assets/zoro/merry.png', 'reused': True, 'identical': same}

js = ['// GENERATED by tools/arlong_build/extract.py — do not hand-edit. Ledger: docs/arlong/SPRITE_LEDGER.md',
      f'// Source assets/incoming/arlong/arlong_sheet.png SHA-256 {sha}',
      'export const ARLONG_ANIM = ' + json.dumps(anim_js, indent=1),
      'export const ARLONG_FX = ' + json.dumps(FX, indent=1), '']
open(os.path.join(ROOT, 'arlongSprites.js'), 'w').write('\n'.join(js))

# ── uses / ledger ──
TRIGGER = {
 'idle': 'neutral standing', 'walk': 'walking forward', 'walk_back': 'walking back', 'run': 'running', 'dash': 'ground dash / SWIM-DASH (in water)',
 'jump': 'jump rise', 'fall': 'falling', 'crouch': 'holding ↓', 'guard': 'blocking', 'guard_hit': 'blockstun', 'hurt': 'hitstun',
 'hurt_heavy': 'heavy hitstun', 'hurt_air': 'juggled', 'knockdown': 'knocked down', 'getup': 'wake-up', 'grab': 'grab attempt',
 'throw': 'throw', 'taunt': 'taunt', 'idleFlex': 'IDLE > 10 s (blade on shoulder + flex)', 'intro': 'INTRO walk-in (drags the blade, shoulders it)',
 'win': 'WIN 1 (portrait grin, blade planted)', 'win2': 'WIN 2 (wide stance → blade overhead)', 'lose': 'LOSE (lying, blade laid flat)',
 'light': 'Jab (L)', 'aStraight': 'Fishman straight (L,L / →+L)', 'aSwing': 'Kiribachi swing (H)', 'heavy': 'Heavy saw arc (L→H chain / ↓↘+H… see moveset)',
 'aLow': 'Low saw (↓+L)', 'up': 'Rising claw (↑+H / Up-Attack)', 'air': 'Air saw (air L/H)', 'down_air': 'air ↓+attack nose dive',
 'aLunge': 'Lunge punch (→→+L … see moveset)', 'aWake': 'Wake-up reversal', 'aBite': 'BITE (→+H close) / 0-teeth HEADBUTT',
 'aKSwing': 'weaponless Kiribachi-swing replacement (karate)', 'aKHeavy': 'weaponless heavy replacement', 'aKLow': 'weaponless low replacement',
 'aKAir': 'weaponless air replacement', 'aKWake': 'weaponless wake-up replacement',
 'aTooth': 'SHARK ON TOOTH (236+A)', 'aDarts': 'SHARK ON DARTS (66+A)', 'aSeiken': 'GOSENMAIGAWARA SEIKEN (214+A)',
 'aThrow': 'KIRIBACHI THROW (236+B)', 'aRecall': 'KIRIBACHI RECALL (236+B while planted)', 'aPickup': 'pick up the planted blade (B beside it)',
 'aTidal': 'TIDAL SWEEP (22+A)', 'aShot': 'WATER SHOT (214+B)', 'aSuper': 'ARLONG PARK super (236236+A)',
}
uses = {}
for name, (fids, *_r) in ANIMS.items():
    for f in fids: uses.setdefault(f, []).append(f'anim `{name}` → {TRIGGER.get(name, name)}')
def add(f, u): uses.setdefault(f, []).append(u)
add('R1F3', 'fx_blade_v → planted Kiribachi (stage), WIN 1 planted blade, HUD Kiribachi icon (greys out while thrown)')
add('R3F1', 'fx_blade_angled → thrown Kiribachi in flight (rotated at draw time = render-only)')
add('R3F2', 'fx_blade_flat → recalled blade sliding home; LOSE blade laid flat')
for f in ['R6F1', 'R6F2', 'R6F3']: add(f, 'fx_burst_a → Fishman Karate impact bursts (Seiken / karate hits)')
for f in ['R20F1', 'R20F2', 'R20F3']: add(f, 'fx_burst_b → karate hit sparks / Super finisher splash burst')
for f in ['R16F1', 'R16F2', 'R16F3', 'R16F4', 'R16F5']: add(f, 'fx_jets → Water Shot projectile (small→large), Seiken shockwave, WATER ZONE surface (flattened + tinted at draw), geyser, Super flood tiles')
for f in ['R15F2', 'R15F3', 'R15F4']: add(f, 'fx_drill → Shark On Darts torpedo body + Super torpedo strikes')
add('R1F4', 'portrait.png + portrait_frame.png → character select + WIN 1 panel')
add('R21F3', 'GOING MERRY (x152-209) → reuses assets/zoro/merry.png' + (' (pixel-identical)' if same else ' (same figurehead art)') + ' as the One Piece emblem / HUD Tide badge backing; credit text (x210+) EXCLUDED')
unused = [f for f in FRAMES if f not in uses]
assert not unused, unused
json.dump({'source': 'assets/incoming/arlong/arlong_sheet.png', 'sha256': sha, 'cell': [CELL_W, CELL_H], 'origin': [OX, OY],
           'rowCounts': EXPECT, 'frames': {k: {'rect': v[:4], 'components': len(v[4]), 'desc': DESC.get(k), 'uses': uses.get(k, [])} for k, v in FRAMES.items()},
           'excluded': {'credit_text': CREDIT_RECT}, 'merryIdentical': same, 'unused': unused},
          open(os.path.join(DOCS, 'frames.json'), 'w'), indent=1)

cols, cw, ch = 6, 240, 240
ids = list(FRAMES)
cs = Image.new('RGBA', (cols * cw, ((len(ids) + cols - 1) // cols) * ch), (34, 40, 52, 255)); d = ImageDraw.Draw(cs)
for k, fid in enumerate(ids):
    c = crop(fid); sc = max(1, min(3, (cw - 10) // c.width, (ch - 28) // c.height)); c = c.resize((c.width * sc, c.height * sc), Image.NEAREST)
    x, y = (k % cols) * cw, (k // cols) * ch
    d.rectangle([x + 1, y + 1, x + cw - 2, y + ch - 2], outline=(80, 92, 112, 255))
    px0, py0 = x + (cw - c.width) // 2, y + 20 + (ch - 20 - c.height) // 2
    cs.alpha_composite(c, (px0, py0))
    d.text((x + 4, y + 4), f'#{k + 1} {fid}', fill=(255, 236, 120, 255))
    if fid == 'R21F3':
        X0 = px0 + (CREDIT_X - FRAMES['R21F3'][0]) * sc
        d.rectangle([X0, py0, px0 + c.width, py0 + c.height], outline=(255, 60, 60, 255))
        d.text((x + 4, y + ch - 14), 'red box = EXCLUDED credit', fill=(255, 120, 120, 255))
cs.save(os.path.join(DOCS, 'contact_sheet.png'))

L = ['# Arlong — SPRITE LEDGER', '',
     f'Source: `assets/incoming/arlong/arlong_sheet.png` (360×1872, SHA-256 `{sha}`), GBA One Piece enemy sheet ripped by Paddy.',
     'Generated by `tools/arlong_build/extract.py` (do not hand-edit). Contact sheet: `docs/arlong/contact_sheet.png` (numbers below = its tiles).', '',
     'Rules: alpha chroma key (background already transparent), 8-connected component cut, nearest-neighbour only, no invented art.',
     'Every body/effect frame is stored as a horizontal MIRROR of the source (sheet faces left, engine stores right-facing) — **derived copy (mirror)**.',
     'Render-only afterimages, water tint/flattening, spin rotation and shimmer are drawn from these same pixels at runtime (canvas transforms), never written to disk.', '',
     '## Real frame counts per row', '', '| Row | Frames | Brief said | Note |', '|---|---|---|---|']
BRIEF = [4, 4, 2, 4, 4, 3, 5, 3, 3, 3, 3, 1, 4, 3, 4, 5, 3, 2, 3, 3, 3]
NOTE_ROW = {5: 'stance + 3 JAW-OPEN lunges (bite frames, not punches) — used for Bite / Shark On Tooth; jab/straight use R19/R7F4',
            7: 'R7F4 is a karate wind-up; R7F5 is the wide stance with a power burst',
            13: 'sitting / hurt / recovering poses (no crouch attack) — used for hurt + get-up',
            14: 'F1-F2 blade on the ground; F3 = standing with the blade OVERHEAD (WIN 2, pick-up, Super finisher)',
            15: '**5, not 4**: leap + 3 drills + a tumble-out-of-the-dive frame (Darts recovery)',
            21: '2 hunched guard poses + Going Merry/credit panel (one connected blob, split at x=210)'}
for r in range(1, 22):
    L.append(f'| R{r} | {EXPECT[r - 1]}{" (+ Merry/credit)" if r == 21 else ""} | {BRIEF[r - 1]} | {NOTE_ROW.get(r, "")} |')
L += ['', '## Frame → animation(s) → trigger', '', '| # | Frame | Rect (x0,y0,x1,y1) | What it is | Used by |', '|---|---|---|---|---|']
for k, fid in enumerate(ids):
    L.append(f'| {k + 1} | {fid} | {tuple(FRAMES[fid][:4])} | {DESC.get(fid, "")} | ' + '<br>'.join(uses.get(fid, [])) + ' |')
L += ['', '## Exclusions', '', f'* `R21F3` x≥{CREDIT_X} — the text "Ripped by Paddy / No credit needed": **excluded, credit** (see CREDITS.md). The ONLY exclusion.',
      '', '## Derived copies', '', '* every `assets/arlong/*.png` strip/FX = mirror of source pixels (derived copy, mirror) except `fx_blade_v.png`, `fx_drill.png`, `portrait*.png` and the three source-right-facing follow-throughs R9F3 / R11F2 / R11F3 inside the strips (unmirrored 1:1 copies).',
      '* `portrait.png` = R1F4 padded to a square canvas (transparent padding only).', '',
      f'Unused frames: {unused or "none"}.', '']
open(os.path.join(DOCS, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L))
print('frames', len(FRAMES), 'anims', len(ANIMS), 'merry identical', same, 'unused', unused)
