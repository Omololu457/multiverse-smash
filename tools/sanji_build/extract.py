# tools/sanji_build/extract.py — Sanji sprite extraction (Phase 1).
#
#   python3 -I tools/sanji_build/extract.py <repo-root>
#
# Source: assets/incoming/sanji/sanji_sheet.png (GBA "One Piece", ripped by Paddy). Background is already alpha-0
# (the chroma key IS the alpha channel; nothing else is keyed out).
# Rules honoured:
#   * connected-component cut (8-connected) with per-frame component masks — frames.py
#   * NEAREST-NEIGHBOUR ONLY: every frame is copied pixel-for-pixel at 1:1, never resampled / interpolated
#   * NO invented art. Transforms, all ledgered:
#       - horizontal MIRROR of body frames (the sheet faces LEFT; the engine stores RIGHT-facing art and flips at
#         runtime) — "derived copy (mirror)"
#       - Diable Jambe "tint": the blue motion-arc pixels (arcs.py) of R1F5/R2F2/R3F2/R4F3 recoloured
#         blue→orange-white on separate *_dj strips — "tint"
#       - FX cut-outs: the standalone plate R5F11 (Plate Kick projectile) and the cocktail glass of R8F1 (HUD
#         badge) — "derived copy (crop)"
#   * the ONLY exclusion is the ripper credit text in R9 (excluded, credit → docs/sanji/CREDITS.md). The Going
#     Merry figurehead next to it is covered by the EXISTING One Piece emblem assets/zoro/merry.png (reused, not
#     duplicated).
# Outputs: assets/sanji/*.png strips (320x256 cells, feet at y=150, pivot x=160 — the Luffy/Zoro convention, same
# ripper/scale), sanjiSprites.js (SANJI_ANIM / SANJI_DJ_ANIM / SANJI_FX), docs/sanji/contact_sheet.png,
# docs/sanji/frames.json.
import sys, os, json, hashlib
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import frames as F
import arcs as A

ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets/incoming/sanji/sanji_sheet.png')
OUT = os.path.join(ROOT, 'assets/sanji')
DOCS = os.path.join(ROOT, 'docs/sanji')
CELL_W, CELL_H, OX, OY = 320, 256, 160, 150
os.makedirs(OUT, exist_ok=True); os.makedirs(DOCS, exist_ok=True)
sheet = F.load(SRC)
sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()
FRAMES = F.FRAMES

ARC_FRAMES = ('R1F5', 'R2F2', 'R3F2', 'R4F3')     # frames carrying the blue motion arcs (R1F5's is a deflect swipe)
LYING = {'R7F6', 'R3F3'}                            # pivot = body centre (lying / horizontal handstand split)
# Blue → Diable Jambe ramp (by brightness of the source blue): dark → deep orange, light → orange-white.
DJ_RAMP = {(32, 56, 88): (200, 64, 16), (40, 80, 144): (240, 120, 24), (80, 112, 200): (255, 200, 80), (80, 128, 216): (255, 240, 200)}

_arc_cache = {}
def arcs_of(fid):
    if fid not in _arc_cache: _arc_cache[fid] = A.arc_pixels(F.cut(fid), 1, 0.5) if fid in ARC_FRAMES else set()
    return _arc_cache[fid]

def feet_pivot(img):
    """Median x of opaque pixels in the bottom 6 rows (the feet / ground contact)."""
    a = img.getchannel('A').load(); w, h = img.size; xs = []
    for y in range(max(0, h - 6), h):
        xs += [x for x in range(w) if a[x, y]]
    xs.sort()
    return xs[len(xs) // 2] if xs else w // 2

def body_frame(fid, dj=False):
    img = F.cut(fid)
    if dj:
        img = img.copy(); p = img.load()
        for (x, y) in arcs_of(fid): p[x, y] = DJ_RAMP.get(p[x, y][:3], p[x, y][:3]) + (255,)
    img = img.transpose(Image.FLIP_LEFT_RIGHT)           # mirror → right-facing storage
    piv = (img.width // 2) if fid in LYING else feet_pivot(img)
    return img, piv

def strip(name, fids, dj=False):
    out = Image.new('RGBA', (CELL_W * len(fids), CELL_H), (0, 0, 0, 0))
    for i, fid in enumerate(fids):
        img, piv = body_frame(fid, dj)
        out.paste(img, (i * CELL_W + OX - piv, OY - img.height), img)
    out.save(os.path.join(OUT, name + '.png'))

# animation → (frame ids, speed, loop). Sim-timed moves get exact frameTimelines in sanjiData.js; `speed` is the
# fallback tick rate for looped / non-move states. HANDS RULE: no frame is ever used as a striking punch — every
# striking animation below is a kick, knee or shin; hand-forward frames (R1F4, R1F2) are poses only.
ANIMS = {
 # ── locomotion / states ──
 'idle': (['R6F1', 'R6F2'], 26, True),                     # hands in pockets, cigarette
 'idleLong': (['R7F1', 'R7F2', 'R7F3', 'R7F2', 'R6F4'], 22, True),   # >10 s idle: exhales smoke, settles (tie)
 'walk': (['R6F3', 'R6F4', 'R6F5', 'R6F6'], 8, True),     # pocket stroll
 'walk_back': (['R6F6', 'R6F5', 'R6F4', 'R6F3'], 9, True),
 'run': (['R1F1', 'R1F3'], 5, True),
 'dash': (['R4F11'], 4, True),
 'jump': (['R5F10'], 6, False),
 'fall': (['R3F1'], 6, False),
 'crouch': (['R5F8'], 6, True),
 'guard': (['R2F1'], 6, True),                              # leg check (raised knee), hands down
 'guard_hit': (['R1F5'], 6, False),                         # forearm DEFLECT on a blocked hit — R1F5 is a PUNCH frame (fist + arc),
                                                             # so per the HANDS RULE it is only ever this defensive pose, never a strike
 'hurt': (['R1F4'], 6, False),                              # reeling (pose, open hands — never a strike)
 'hurt_heavy': (['R7F4'], 6, False),
 'hurt_air': (['R4F1'], 6, False),
 'knockdown': (['R4F1', 'R7F6'], 8, False),
 'getup': (['R5F9', 'R5F8'], 10, False),
 'grab': (['R2F1'], 6, False),                              # knee clinch
 'throw': (['R2F1', 'R2F3'], 6, False),                     # kick-throw
 'taunt': (['R5F1', 'R5F2', 'R5F3', 'R5F4', 'R5F5', 'R5F6', 'R5F7'], 9, False),   # serves the dish
 'intro': (['R6F3', 'R6F4', 'R6F5', 'R6F6'] * 3, 6, False),   # walk-in, hands in pockets
 'sIntroLight': (['R1F2', 'R1F2', 'R7F1', 'R7F2'], 14, False),   # lights the cigarette → first drag
 'win': (['R7F1', 'R7F2', 'R7F3'], 24, True),               # WIN 1: smoking, hands in pockets
 'win2': (['R9F1', 'R9F2', 'R9F3', 'R9F4', 'R6F3'], 9, False),   # WIN 2: kick flourish → pocket pose
 'winGlass': (['R8F1', 'R8F2'], 18, True),                  # WIN 3: the cocktail-glass prop (love mode)
 'lose': (['R7F5', 'R7F6'], 30, False),                     # kneels → lies down
 # ── normals (the six Course kicks) ──
 'sCollier': (['R2F1', 'R4F4'], 4, False),                  # 1 COLLIER   high kick
 'sEpaule': (['R9F4', 'R1F6'], 5, False),                   # 2 EPAULE    descending kick (heel high → comes down)
 'sCotelette': (['R4F2', 'R4F3'], 5, False),                # 3 COTELETTE side kick
 'sSelle': (['R4F5', 'R4F7'], 5, False),                    # 4 SELLE     mid kick
 'sPoitrine': (['R9F1', 'R9F2', 'R9F3'], 5, False),         # 5 POITRINE  straight kick (launch)
 'sGigot': (['R4F2', 'R2F3'], 4, False),                    # 6 GIGOT     low kick
 # ── other normals ──
 'sCrouchKick': (['R5F9', 'R3F4'], 4, False),
 'up': (['R4F5', 'R4F8'], 5, False),                        # anti-air knee
 'air': (['R5F10', 'R4F9'], 5, False),                      # air knee/kick
 'down_air': (['R4F9'], 6, False),
 'sHandstand': (['R3F2', 'R3F3', 'R3F2'], 6, False),        # handstand spin (crossup)
 'sReversal': (['R4F6', 'R2F2'], 5, False),                 # wake-up reversal, big crescent
 # ── specials ──
 'sIgnite': (['R4F6', 'R3F2', 'R3F3', 'R4F6'], 7, False),   # Diable Jambe spin-up
 'sMouton': (['R2F2', 'R3F1', 'R3F5'], 6, False),           # Mouton Shot
 'sAntiManner': (['R9F3', 'R9F4', 'R4F10'], 6, False),      # Anti-Manner Kick Course (rising axe → heel down)
 'sConcasse': (['R4F1', 'R9F4', 'R4F10'], 6, False),        # Concasse (aerial heel drop)
 'sSkyWalk': (['R4F1', 'R5F10'], 5, False),                 # Sky Walk (Geppo)
 'sPlate': (['R5F5', 'R2F1'], 6, False),                    # Plate Kick (flick the dish → volley)
 'sHachis': (['R3F4', 'R4F11', 'R2F3', 'R4F11'], 3, True),  # Premier Hachis low flurry
 'sPTKC': (['R3F5', 'R4F4', 'R1F6', 'R4F3', 'R4F7', 'R9F2', 'R2F3', 'R9F4', 'R4F10'], 8, False),   # super
}

anim_js, dj_js = {}, {}
def entry(name, fids, speed, loop):
    return {'sheet': f'./assets/sanji/{name}.png', 'frames': len(fids), 'width': CELL_W, 'height': CELL_H,
            'speed': speed, 'anchorY': 0, 'originX': OX, 'originY': OY, 'loop': loop, 'lockLastFrame': True}
for name, (fids, speed, loop) in ANIMS.items():
    strip(name, fids)
    anim_js[name] = entry(name, fids, speed, loop)
    if any(f in ARC_FRAMES for f in fids):              # DIABLE JAMBE variant: blue arcs → orange-white ("tint")
        strip(name + '_dj', fids, dj=True)
        dj_js[name] = entry(name + '_dj', fids, speed, loop)

# ── FX (render-only) ──
plate = F.cut('R5F11'); plate = plate.crop(plate.getbbox()).transpose(Image.FLIP_LEFT_RIGHT)
plate.save(os.path.join(OUT, 'fx_plate.png'))
# Cocktail glass (HUD badge): the glass + lemon + straw = R8F1 rows 0-15 (the stem foot sits on the tray rim at
# row 16; read off the frame pixel-by-pixel). Pixel copy, not mirrored (UI emblem).
r8 = F.cut('R8F1')
glass = r8.crop((0, 0, r8.width, 16)); glass = glass.crop(glass.getbbox())
glass.save(os.path.join(OUT, 'fx_glass.png'))
# Portrait = the R6F1 pocket pose bust (top 30 rows, centred square) — pixel copy, mirrored to face right.
r6 = F.cut('R6F1').transpose(Image.FLIP_LEFT_RIGHT); bust = r6.crop((0, 0, r6.width, 30)); bust = bust.crop(bust.getbbox())
pw = max(bust.width, bust.height) + 4
por = Image.new('RGBA', (pw, pw), (0, 0, 0, 0)); por.paste(bust, ((pw - bust.width) // 2, (pw - bust.height) // 2), bust)
por.save(os.path.join(OUT, 'portrait.png'))

# ── sanjiSprites.js ──
strip_meta = lambda d: {k: v for k, v in d.items()}
js = ['// GENERATED by tools/sanji_build/extract.py — do not hand-edit. Ledger: docs/sanji/SPRITE_LEDGER.md',
      f'// Source assets/incoming/sanji/sanji_sheet.png SHA-256 {sha}',
      'export const SANJI_ANIM = ' + json.dumps(anim_js, indent=1),
      '// Diable Jambe: the same animations with the blue kick arcs tinted orange-white (swapped in while the leg is lit).',
      'export const SANJI_DJ_ANIM = ' + json.dumps(dj_js, indent=1),
      f"export const SANJI_FX = {{ plate: {{ sheet: './assets/sanji/fx_plate.png', w: {plate.width}, h: {plate.height} }}, "
      f"glass: {{ sheet: './assets/sanji/fx_glass.png', w: {glass.width}, h: {glass.height} }}, "
      "merry: { sheet: './assets/zoro/merry.png', w: 58, h: 54 } }", '']
open(os.path.join(ROOT, 'sanjiSprites.js'), 'w').write('\n'.join(js))

# ── frames.json + contact sheet ──
uses = {}
for name, (fids, _, _) in ANIMS.items():
    for f in fids: uses.setdefault(f, []).append(name)
for f in ARC_FRAMES: uses[f].append('Diable Jambe *_dj strips (tint: blue arcs → orange-white)')
uses.setdefault('R5F11', []).append('fx_plate (Plate Kick projectile)')
uses['R8F1'].append('fx_glass (derived copy: crop of the glass → Heat-bar badge)')
uses['R6F1'].append('portrait (derived copy: crop of the bust)')
json.dump({'source': 'assets/incoming/sanji/sanji_sheet.png', 'sha256': sha, 'cell': [CELL_W, CELL_H], 'origin': [OX, OY],
           'frames': {k: {'rect': v, 'arcPixels': len(arcs_of(k)), 'uses': uses.get(k, [])} for k, v in FRAMES.items()},
           'merry_and_credit_component': F.MERRY_CREDIT,
           'excluded': {'credit_text': 'text panels "Ripped by Paddy / No credit needed" inside the merry_and_credit component'}},
          open(os.path.join(DOCS, 'frames.json'), 'w'), indent=1)

K = 3
cs = Image.new('RGBA', (sheet.width * K + 40, sheet.height * K + 60), (60, 66, 78, 255))
bg = Image.new('RGBA', sheet.size, (182, 214, 182, 255)); bg.alpha_composite(sheet)
cs.paste(bg.resize((sheet.width * K, sheet.height * K), Image.NEAREST), (20, 20))
d = ImageDraw.Draw(cs)
for n, (fid, (x0, y0, x1, y1)) in enumerate(FRAMES.items(), 1):
    col = (255, 140, 0) if fid in ARC_FRAMES else (255, 40, 40)
    d.rectangle((20 + x0 * K, 20 + y0 * K, 20 + (x1 + 1) * K - 1, 20 + (y1 + 1) * K - 1), outline=col, width=2)
    d.rectangle((20 + x0 * K, 20 + y0 * K, 20 + x0 * K + 62, 20 + y0 * K + 11), fill=(0, 0, 0))
    d.text((22 + x0 * K, 20 + y0 * K), f'{n}:{fid}', fill=(255, 255, 0))
x0, y0, x1, y1 = F.MERRY_CREDIT
d.rectangle((20 + x0 * K, 20 + y0 * K, 20 + (x1 + 1) * K - 1, 20 + (y1 + 1) * K - 1), outline=(140, 140, 140), width=2)
d.text((22 + x0 * K, 22 + y1 * K - 10), 'Merry = existing emblem (reused) | credit text EXCLUDED', fill=(255, 255, 255))
d.text((20, sheet.height * K + 26), 'red = frame, orange = frame with blue kick arc (tinted for Diable Jambe), grey = Going Merry (reused emblem) + excluded credit', fill=(255, 255, 255))
cs.save(os.path.join(DOCS, 'contact_sheet.png'))
print('frames', len(FRAMES), 'anims', len(ANIMS), 'dj', len(dj_js), 'plate', plate.size, 'glass', glass.size, 'portrait', por.size,
      'unused', [f for f in FRAMES if f not in uses])
