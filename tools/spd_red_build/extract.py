# tools/spd_red_build/extract.py — S.P.D. Red Ranger sprite extraction (Phase 2).
#
#   python3 -I tools/spd_red_build/extract.py <repo-root>
#
# Source: assets/incoming/spd_red/spd_red_sheet.png (Plug & Play "Power Rangers S.P.D.: Escape of the Five Fugitives",
# ripped by the FRANKETE for TSR). Rules honoured:
#   * CHROMA KEY with a tight tolerance: exactly the two flat background colours — the dark-red page (182,52,52) and
#     the pink cell fill (255,123,123) — tolerance 0 (exact RGB match). Verified below: the nearest KEPT colour is far
#     from both keys, and every suit pixel of idle / run survives (100%).
#   * the input LABELS down the left side (x <= 44) are identified, documented and kept OUT of every cut: cuts come
#     only from the pink cells (x >= 47), asserted per frame.
#   * 8-connected component cuts (one pink cell = one frame), NEAREST-NEIGHBOUR ONLY (1:1 copies, never resampled).
#   * the floor SHADOW baked under the feet (flat pure-black blob on the cell's bottom rows) is removed, so the sprite
#     can leave the ground; that is a removal, never new art. Ledgered.
#   * NO invented art. Derived copies (frames reused by several animations, the poster crop, the gem crop) are
#     ledgered as derived. The sheet already faces RIGHT (the engine's stored facing) → no mirror.
#   * the ONLY exclusion is the ripper credit band of the WANTED poster ("ripped by the FRANKETE for TSR"; its scroll
#     ornaments are interleaved with the lettering) → docs/spd_red/CREDITS.md.
# Outputs: assets/spd_red/*.png, spdRedSprites.js (SPD_RED_ANIM / SPD_RED_FX), docs/spd_red/contact_sheet.png,
#          docs/spd_red/frames.json, docs/spd_red/SPRITE_LEDGER.md
import sys, os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets/incoming/spd_red/spd_red_sheet.png')
OUT = os.path.join(ROOT, 'assets/spd_red')
DOCS = os.path.join(ROOT, 'docs/spd_red')
os.makedirs(OUT, exist_ok=True); os.makedirs(DOCS, exist_ok=True)
sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()
rgb = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W = rgb.shape[:2]
KEY_BG, KEY_CELL = (182, 52, 52), (255, 123, 123)
isBG = (rgb == KEY_BG).all(2); isCELL = (rgb == KEY_CELL).all(2)
keyed = isBG | isCELL
LABEL_MAX_X, CELL_MIN_X = 44, 47
POSTER = (620, 18, 721, 135)          # x0, y0, x1, y1 (inclusive) — the WANTED poster, top right
CREDIT_Y = 97                         # poster rows >= 97 = the credit band (excluded)

# ── components: pink cells (frames), labels, poster ──
lab, n = nd.label(~isBG, structure=np.ones((3, 3), int))
comps = []
for i, s in enumerate(nd.find_objects(lab), 1):
    comps.append(dict(id=i, y0=s[0].start, y1=s[0].stop - 1, x0=s[1].start, x1=s[1].stop - 1))
cells = [c for c in comps if c['x0'] >= CELL_MIN_X and c['x1'] < POSTER[0]]
labels = [c for c in comps if c['x1'] <= LABEL_MAX_X]
assert len(cells) + len(labels) + 1 == len(comps), 'unclassified component'
# rows = cells grouped by their top edge
tops = sorted(set(c['y0'] for c in cells))
ROWS = []
for t in tops:
    r = sorted([c for c in cells if c['y0'] == t], key=lambda c: c['x0'])
    ROWS.append(r)
EXPECT = [2, 8, 1, 2, 1, 5, 4, 3, 2, 3, 2, 1, 6, 3, 1, 3, 2, 3]
COUNTS = [len(r) for r in ROWS]
assert COUNTS == EXPECT, COUNTS
FR = {}
for ri, r in enumerate(ROWS, 1):
    for fi, c in enumerate(r, 1): FR[f'R{ri}F{fi}'] = c
# labels → the row they sit beside (vertical overlap with the row band)
LABEL_TEXT = {2: '→', 3: '↓', 4: 'A', 8: 'B', 11: 'A , B', 12: '→→ + B', 13: '↑ + B', 14: '↓ + B', 15: '↓ + B', 16: 'A + B', 17: '→ + →'}
ASCII = lambda t: t.replace('→', '->').replace('↓', 'Dn').replace('↑', 'Up')   # contact-sheet font has no arrows
row_label = {}
for L in labels:
    for ri, r in enumerate(ROWS, 1):
        ry0, ry1 = r[0]['y0'], max(c['y1'] for c in r)
        if L['y0'] <= ry1 and L['y1'] >= ry0: row_label.setdefault(ri, []).append(L)
assert sorted(row_label) == sorted(LABEL_TEXT), sorted(row_label)
for fid, c in FR.items():   # LABELS NEVER CUT: every frame box starts right of the label column
    assert c['x0'] > LABEL_MAX_X and c['x0'] >= CELL_MIN_X, fid

def raw_frame(fid):
    """RGBA of one cell, chroma-keyed (exact), shadow removed. Returns (img, shadow_px, kept_px)."""
    c = FR[fid]
    sub = rgb[c['y0']:c['y1'] + 1, c['x0']:c['x1'] + 1]
    k = keyed[c['y0']:c['y1'] + 1, c['x0']:c['x1'] + 1]
    a = (~k).astype(np.uint8) * 255
    # FLOOR SHADOW: the flat pure-black blob baked under the feet. In the sprite's bottom band (lowest 8 opaque rows) a
    # black pixel is shadow when nothing but black / empty sits above it in its column within that band (so the
    # thin dark line directly under a boot sole stays as outline; boots, gloves and suit blacks above are untouched).
    op = a > 0; blk = (sub <= 42).all(2) & op   # pure black + the near-black shadow shades (8,8,8) (33,16,16) (42,42,42) …
    sh = 0
    rows = np.nonzero(op.any(1))[0]
    NOSHADOW = fid.startswith('R17') or fid.startswith('R18')   # speed streaks / beam sprites: loose particles ARE the art
    if len(rows) and not NOSHADOW:
        bot = rows.max(); top = max(0, bot - 7)
        for x in range(sub.shape[1]):
            run = []
            for y in range(bot, top - 1, -1):
                if not op[y, x]:
                    if run: break
                    continue
                if not blk[y, x]: run = None; break
                run.append(y)
            if not run: continue
            # a dark run reaching the band top that continues above it is a LIMB (black arm / glove), not shadow
            if run[-1] == top and top > 0 and op[top - 1, x]: continue
            for y in run: a[y, x] = 0; sh += 1
        # stray black specks left in the band that are no longer touching any non-black pixel
        op2 = a > 0; nb = op2 & ~blk
        near = nd.binary_dilation(nb, structure=np.ones((3, 3), bool))
        speck = op2 & blk & ~near; speck[:top] = False
        a[speck] = 0; sh += int(speck.sum())
        # detached shadow crumbs: tiny (<= 10 px) opaque islands in the band, not 8-connected to the body
        il, inn = nd.label(a > 0, structure=np.ones((3, 3), int))
        for j, sl in enumerate(nd.find_objects(il), 1):
            m = il[sl] == j
            if m.sum() <= 10 and sl[0].start >= top and not fid.startswith('R16'):
                a[sl][m] = 0; sh += int(m.sum())
    img = np.dstack([sub.astype(np.uint8), a])
    return Image.fromarray(img, 'RGBA'), sh, int((a > 0).sum())

DESC = {
 'R1F1': 'idle A (standing, fists loose)', 'R1F2': 'idle B',
 'R2F1': 'run 1', 'R2F2': 'run 2 (long stride)', 'R2F3': 'run 3', 'R2F4': 'run 4', 'R2F5': 'run 5', 'R2F6': 'run 6 (long stride)', 'R2F7': 'run 7', 'R2F8': 'run 8',
 'R3F1': 'crouch / landing',
 'R4F1': 'punch 1 — lunging jab (rear leg extended)', 'R4F2': 'punch 2 — compact straight',
 'R5F1': 'hunched ready / guard stance',
 'R6F1': 'struck — recoil leaning back', 'R6F2': 'thrown — airborne, horizontal', 'R6F3': 'lying flat, face down', 'R6F4': 'back-roll, legs up (getting up)', 'R6F5': 'rising stagger, arms flung',
 'R7F1': 'wide forward ready stance', 'R7F2': 'back-handspring (arched, vertical)', 'R7F3': 'one-hand handstand kick (horizontal)', 'R7F4': 'low handspring landing / sweep',
 'R8F1': 'standing chamber', 'R8F2': 'prone slide sweep (low)', 'R8F3': 'kneeling low crouch',
 'R9F1': 'fighting pose (same pose as R7F1, not pixel-identical)', 'R9F2': 'victory pose — fist raised high',
 'R10F1': 'kick chamber', 'R10F2': 'HIGH kick (leg vertical)', 'R10F3': 'kick recovery (pixel-identical to R10F1)',
 'R11F1': 'tuck jump (knees up)', 'R11F2': 'flying side kick',
 'R12F1': 'one-hand handstand kick (dash attack)',
 'R13F1': 'run-in stance', 'R13F2': 'leaping split kick', 'R13F3': 'stride', 'R13F4': 'stride landing', 'R13F5': 'turned spin (back to camera)', 'R13F6': 'standing side kick',
 'R14F1': 'blaster drawn, low', 'R14F2': 'blaster aimed (arm extended)', 'R14F3': 'blaster fired (muzzle kick)',
 'R15F1': 'hopping shot (one knee up, aiming)',
 'R16F1': 'white beam from the hands — small', 'R16F2': 'white beam — full', 'R16F3': 'large weapon braced (Deltamax)',
 'R17F1': 'RED SPEED STREAK — horizontal (body dissolving into streaks)', 'R17F2': 'RED SPEED STREAK — diagonal (re-forming)',
 'R18F1': 'SPRITE: small bolt with a star-burst head', 'R18F2': 'SPRITE: white beam bolt with red trim', 'R18F3': 'SPRITE: thin red beam line',
}
assert set(DESC) == set(FR), set(FR) ^ set(DESC)

CELL_W, CELL_H, OX, OY = 160, 84, 80, 80      # feet at y=80, pivot x=80 (right-facing frame coords)
def feet_pivot(im):
    a = np.array(im)[:, :, 3]; ys, xs = np.nonzero(a)
    if not len(ys): return im.width // 2
    bot = ys.max(); sel = xs[ys >= bot - 5]
    return int(np.median(sel))
# frames whose lowest rows are a hand / a kick / a prone body pivot on the bbox centre instead of the feet
CENTRED = {'R6F2', 'R6F3', 'R8F2', 'R7F3', 'R12F1', 'R7F2', 'R7F4', 'R6F4'}
def place(fid):
    im, sh, kept = raw_frame(fid)
    bb = im.getbbox(); im = im.crop(bb)
    piv = im.width // 2 if fid in CENTRED else feet_pivot(im)
    return im, piv

ANIMS = {
 'idle': (['R1F1', 'R1F2'], 24, True),
 'walk': (['R2F1', 'R2F2', 'R2F3', 'R2F4', 'R2F5', 'R2F6', 'R2F7', 'R2F8'], 8, True),
 'walk_back': (['R2F8', 'R2F7', 'R2F6', 'R2F5', 'R2F4', 'R2F3', 'R2F2', 'R2F1'], 8, True),
 'run': (['R2F1', 'R2F2', 'R2F3', 'R2F4', 'R2F5', 'R2F6', 'R2F7', 'R2F8'], 4, True),
 'dash': (['R17F1'], 4, True),
 'jump': (['R11F1'], 6, False),
 'fall': (['R11F1'], 6, False),
 'crouch': (['R3F1'], 6, True),
 'guard': (['R5F1'], 6, True),
 'guard_hit': (['R5F1'], 6, False),
 'hurt': (['R6F1'], 6, False),
 'hurt_heavy': (['R6F1'], 6, False),
 'hurt_air': (['R6F2'], 6, False),
 'knockdown': (['R6F1', 'R6F2', 'R6F3'], 9, False),
 'getup': (['R6F4', 'R6F5', 'R7F1'], 9, False),
 'grab': (['R4F2'], 6, False),
 'throw': (['R4F2', 'R4F1'], 7, False),
 'taunt': (['R9F1', 'R9F2'], 14, False),
 'idleGlint': (['R1F1', 'R1F2'], 24, True),          # IDLE > 10 s (same art; the gem glint is drawn by spdRedFx)
 'intro': (['R17F2', 'R17F1', 'R3F1', 'R1F1'], 9, False),   # blink-in (R17) → crouch (R3) → idle (R1)
 'win': (['R9F1', 'R9F2'], 20, False),               # WIN 1 — pose + spinning gem (spdRedFx)
 'win2': (['R16F3'], 30, False),                     # WIN 2 — Deltamax braced pose
 'lose': (['R6F1', 'R6F2', 'R6F3'], 12, False),      # LOSE — settles into the lying frame
 'blinkStart': (['R17F1'], 3, False),                # blink wind-up (vanish streak)
 'blinkEnd': (['R17F2'], 3, False),                  # blink recovery (re-form streak)
 # NORMALS
 'light': (['R4F1'], 4, False),                      # Jab
 'sStraight': (['R4F1', 'R4F2'], 4, False),          # Straight
 'sKick': (['R8F1', 'R13F6'], 5, False),             # Kick (chamber → side kick)
 'heavy': (['R10F1', 'R10F2', 'R10F3'], 6, False),   # Heavy kick (launches)
 'sLow': (['R3F1', 'R8F2', 'R8F3'], 5, False),       # Low kick (crouch → slide sweep → recover)
 'up': (['R13F1', 'R13F2', 'R13F3'], 5, False),      # Rising kick (anti-air)
 'air': (['R7F2', 'R7F3'], 5, False),                # Air kick (flip kick)
 'down_air': (['R7F3'], 6, False),
 'sFlip': (['R7F1', 'R7F2', 'R7F3', 'R7F4'], 5, False),   # Acrobatic flip (roll)
 'sWake': (['R13F4', 'R13F5', 'R13F6'], 5, False),   # Wake-up reversal (spin → side kick)
 # SPECIALS
 'sBlaster': (['R14F1', 'R14F2', 'R14F3'], 4, False),     # Delta Blaster
 'sBlasterAir': (['R15F1'], 6, False),                    # air Delta Blaster
 'sRapid': (['R14F2', 'R14F3'], 3, True),                 # Rapid Fire
 'sCharge': (['R7F1', 'R12F1'], 6, False),                # Delta Charge
 'sPhase': (['R11F1', 'R11F2'], 6, False),                # Phase Strike
 'sUpper': (['R13F1', 'R13F2', 'R9F2'], 5, False),        # Sky Uppercut
 'sDeltamax': (['R16F3', 'R16F1', 'R16F2'], 8, False),    # Deltamax Strike
 'sJudge': (['R14F1', 'R14F2'], 8, False),                # Judgment — point the morpher
 'sSuper': (['R9F2', 'R17F1', 'R11F2', 'R17F1', 'R12F1', 'R17F1', 'R13F2', 'R16F3', 'R16F1', 'R16F2'], 8, False),   # S.P.D. Emergency
}

uses = {}
def strip(name, fids):
    out = Image.new('RGBA', (CELL_W * len(fids), CELL_H), (0, 0, 0, 0))
    for i, fid in enumerate(fids):
        img, piv = place(fid)
        out.paste(img, (i * CELL_W + OX - piv, OY - img.height), img)
        uses.setdefault(fid, []).append(name)
    out.save(os.path.join(OUT, name + '.png'))

anim_js = {}
for name, (fids, speed, loop) in ANIMS.items():
    strip(name, fids)
    anim_js[name] = {'sheet': f'./assets/spd_red/{name}.png', 'frames': len(fids), 'width': CELL_W, 'height': CELL_H,
                     'speed': speed, 'anchorY': 0, 'originX': OX, 'originY': OY, 'loop': loop, 'lockLastFrame': True}

FX = {}
def fxsave(fname, fid, key, use):
    im, sh, kept = raw_frame(fid); im = im.crop(im.getbbox()); im.save(os.path.join(OUT, fname))
    FX[key] = {'sheet': f'./assets/spd_red/{fname}', 'w': im.width, 'h': im.height}
    uses.setdefault(fid, []).append(use)
fxsave('fx_bolt.png', 'R18F1', 'bolt', 'FX bolt (Delta Blaster)')
fxsave('fx_beam.png', 'R18F2', 'beam', 'FX beam (Deltamax / Super beam, tiled)')
fxsave('fx_tracer.png', 'R18F3', 'tracer', 'FX tracer (Rapid Fire)')
fxsave('fx_streak_h.png', 'R17F1', 'streakH', 'FX blink vanish streak')
fxsave('fx_streak_d.png', 'R17F2', 'streakD', 'FX blink travel streak')
fxsave('portrait_body.png', 'R9F2', 'portraitBody', 'portrait body')

# WANTED poster (header + mugshot window; the credit band below y=97 is EXCLUDED) and the blue GEM
sheet = Image.open(SRC).convert('RGBA')
poster = sheet.crop((POSTER[0], POSTER[1], POSTER[2] + 1, CREDIT_Y))
pa = np.array(poster); pk = ((pa[:, :, :3] == KEY_BG).all(2)); pa[pk, 3] = 0; poster = Image.fromarray(pa)
poster.save(os.path.join(OUT, 'poster.png')); FX['poster'] = {'sheet': './assets/spd_red/poster.png', 'w': poster.width, 'h': poster.height}
cy = (rgb == (0, 200, 200)).all(2); cl, cn = nd.label(cy, structure=np.ones((3, 3), int))
sizes = nd.sum(cy, cl, range(1, cn + 1)); big = int(np.argmax(sizes)) + 1
ys, xs = np.nonzero(cl == big)
GEM = (int(xs.min()) - 2, int(ys.min()) - 2, int(xs.max()) + 2, int(ys.max()) + 2)
gem = sheet.crop((GEM[0], GEM[1], GEM[2] + 1, GEM[3] + 1)); gem.save(os.path.join(OUT, 'gem.png'))
FX['gem'] = {'sheet': './assets/spd_red/gem.png', 'w': gem.width, 'h': gem.height}
# portrait: the poster art (character-select background) with the R9F2 pose standing in front — composed at draw
# time by the select screen? No: the select screen shows ONE image, so it is composed here from untouched pixels.
pb = Image.open(os.path.join(OUT, 'portrait_body.png'))
side = max(poster.width, poster.height)
por = Image.new('RGBA', (side, side), (0, 0, 0, 0))
por.paste(poster, ((side - poster.width) // 2, 0), poster)
por.paste(pb, ((side - pb.width) // 2, side - pb.height), pb)
por.save(os.path.join(OUT, 'portrait.png')); FX['portrait'] = {'sheet': './assets/spd_red/portrait.png', 'w': side, 'h': side}

js = ['// GENERATED by tools/spd_red_build/extract.py — do not hand-edit. Ledger: docs/spd_red/SPRITE_LEDGER.md',
      f'// Source assets/incoming/spd_red/spd_red_sheet.png SHA-256 {sha}',
      'export const SPD_RED_ANIM = ' + json.dumps(anim_js, indent=1),
      'export const SPD_RED_FX = ' + json.dumps(FX, indent=1), '']
open(os.path.join(ROOT, 'spdRedSprites.js'), 'w').write('\n'.join(js))

# ── chroma-key verification ──
kept_cols = set(map(tuple, rgb[~keyed].reshape(-1, 3).tolist()))
def dist(a, b): return max(abs(a[i] - b[i]) for i in range(3))
near = min((min(dist(c, KEY_BG), dist(c, KEY_CELL)), c) for c in kept_cols)
SUIT = lambda c: c[0] >= 100 and c[1] <= 20 and c[2] <= 20   # the suit reds (255,8,0) (222,8,0) (189,8,0) (165,0,0) (132,0,0) (107,0,0) …
ck = {}
for fid in [f'R1F{i}' for i in (1, 2)] + [f'R2F{i}' for i in range(1, 9)]:
    c = FR[fid]; sub = rgb[c['y0']:c['y1'] + 1, c['x0']:c['x1'] + 1]
    src_suit = sum(1 for p in sub.reshape(-1, 3).tolist() if SUIT(p))
    im, sh, kept = raw_frame(fid); arr = np.array(im)
    out_suit = sum(1 for p, al in zip(arr[:, :, :3].reshape(-1, 3).tolist(), arr[:, :, 3].reshape(-1).tolist()) if al and SUIT(p))
    left_key = int(((arr[:, :, :3] == KEY_CELL).all(2) & (arr[:, :, 3] > 0)).sum() + ((arr[:, :, :3] == KEY_BG).all(2) & (arr[:, :, 3] > 0)).sum())
    ck[fid] = {'suit_src': src_suit, 'suit_kept': out_suit, 'pct': round(100 * out_suit / max(1, src_suit), 2), 'key_left': left_key, 'shadow_removed': sh}
assert all(v['pct'] == 100.0 and v['key_left'] == 0 for v in ck.values()), ck

# ── contact sheet (every frame numbered) ──
SC = 3; pad = 6; rowsz = []
for ri, r in enumerate(ROWS, 1):
    rowsz.append((max(c['x1'] - c['x0'] + 1 for c in r), max(c['y1'] - c['y0'] + 1 for c in r)))
cw = 260 + sum(0 for _ in rowsz) + max(sum((c['x1'] - c['x0'] + 1) * SC + pad for c in r) for r in ROWS)
ch = sum(h * SC + 22 for _, h in rowsz) + 10
cs = Image.new('RGBA', (cw, ch), (24, 24, 30, 255)); d = ImageDraw.Draw(cs)
y = 6
for ri, r in enumerate(ROWS, 1):
    h = max(c['y1'] - c['y0'] + 1 for c in r)
    lt = ASCII(LABEL_TEXT.get(ri, 'none'))
    d.text((6, y + 4), f'R{ri}', fill=(255, 255, 255, 255)); d.text((40, y + 4), f'label: {lt}', fill=(255, 210, 120, 255))
    x = 150
    for fi, c in enumerate(r, 1):
        fid = f'R{ri}F{fi}'
        im, sh, kept = raw_frame(fid)
        bgc = Image.new('RGBA', im.size, (70, 70, 84, 255)); bgc.alpha_composite(im)
        cs.paste(bgc.resize((im.width * SC, im.height * SC), Image.NEAREST), (x, y + 16))
        d.text((x + 2, y + 2), fid, fill=(120, 230, 255, 255))
        x += im.width * SC + pad
    y += h * SC + 22
cs.save(os.path.join(DOCS, 'contact_sheet.png'))

frames = {fid: {'box': [c['x0'], c['y0'], c['x1'], c['y1']], 'desc': DESC[fid], 'uses': uses.get(fid, [])} for fid, c in FR.items()}
labels_out = {f'R{ri}': {'text': LABEL_TEXT[ri], 'boxes': [[L['x0'], L['y0'], L['x1'], L['y1']] for L in Ls]} for ri, Ls in sorted(row_label.items())}
json.dump({'sha256': sha, 'counts': COUNTS, 'frames': frames, 'labels': labels_out, 'poster': list(POSTER), 'creditBand': [POSTER[0], CREDIT_Y, POSTER[2], POSTER[3]],
           'gem': list(GEM), 'chroma': {'keys': [KEY_BG, KEY_CELL], 'tolerance': 0, 'nearestKept': {'dist': near[0], 'rgb': near[1]}, 'idleRun': ck}},
          open(os.path.join(DOCS, 'frames.json'), 'w'), indent=1)
print('rows', COUNTS, 'nearest kept colour', near, 'labels', {k: v['text'] for k, v in labels_out.items()})
print('unused frames', [f for f in FR if f not in uses])

# ── SPRITE LEDGER (frame → animation → trigger, + the input label printed beside its row on the sheet) ──
TRIGGER = {
 'idle': 'standing', 'walk': 'walk (5.6 px/f)', 'walk_back': 'walk backwards', 'run': 'hold → after a ground blink (8.4 px/f)',
 'dash': 'engine dash slot (unused — the blink replaces the dash)', 'jump': 'jump', 'fall': 'falling', 'crouch': 'hold ↓',
 'guard': 'block', 'guard_hit': 'blocked hit', 'hurt': 'hit', 'hurt_heavy': 'heavy hit', 'hurt_air': 'hit in the air',
 'knockdown': 'knocked down', 'getup': 'getting up', 'grab': 'grab', 'throw': 'throw', 'taunt': 'taunt',
 'idleGlint': 'idle > 10 s (+ blue gem glint)', 'intro': 'round intro (blink-in → crouch → idle)', 'win': 'WIN 1 (+ spinning gem)',
 'win2': 'WIN 2 (braced)', 'lose': 'LOSE (settles lying)', 'blinkStart': 'BLINK wind-up / vanish', 'blinkEnd': 'BLINK re-form',
 'light': 'Jab — Light', 'sStraight': 'Straight — Light, Light (or →+Light)', 'sKick': 'Kick — Heavy', 'heavy': 'Heavy kick — →+Heavy',
 'sLow': 'Low kick — ↓+Light', 'up': 'Rising kick — ↑+Heavy / Up-Attack', 'air': 'Air kick — air Light/Heavy', 'down_air': 'air ↓+attack',
 'sFlip': 'Acrobatic flip — ←+Heavy', 'sWake': 'Wake-up reversal — ↓+Heavy (or any attack on wake-up)',
 'sBlaster': 'DELTA BLASTER — ↓+Special', 'sBlasterAir': 'DELTA BLASTER (air) — air ↓+Special', 'sRapid': 'RAPID FIRE — hold ↓+Special',
 'sCharge': 'DELTA CHARGE — →→+Special', 'sPhase': 'PHASE STRIKE — ↓↘→+Special', 'sUpper': 'SKY UPPERCUT — ↑+Special',
 'sDeltamax': 'DELTAMAX STRIKE — ↓↙←+Special', 'sJudge': 'JUDGMENT — Light+Heavy+Special', 'sSuper': 'S.P.D. EMERGENCY — ↓↘→↓↘→+Special',
}
assert set(TRIGGER) == set(ANIMS), set(TRIGGER) ^ set(ANIMS)
FXUSE = {'R17F1': 'BLINK vanish streak (fx_streak_h.png) · dash · intro', 'R17F2': 'BLINK travel streak (fx_streak_d.png) · intro',
         'R18F1': 'DELTA BLASTER bolt (fx_bolt.png)', 'R18F2': 'DELTAMAX / Super beam body, tiled (fx_beam.png)', 'R18F3': 'RAPID FIRE tracer (fx_tracer.png)',
         'R9F2': 'character-select portrait body (portrait.png)'}
L = ['# S.P.D. Red Ranger: sprite ledger', '',
     f'Source: `assets/incoming/spd_red/spd_red_sheet.png` (727×1160, SHA-256 `{sha}`). This file is generated by `tools/spd_red_build/extract.py`.', '',
     '## Rules applied', '',
     '- **Chroma key:** an exact match (tolerance 0) on the two flat background colours: the page (182,52,52) and the cell fill (255,123,123).',
     f'  - The nearest kept colour is {tuple(near[1])}, {near[0]} RGB steps from a key, so a tolerance below {near[0]} would be equally safe.',
     '  - Idle and run keep 100% of their suit pixels (table below).',
     '- **Labels:** the input labels in the left column (x ≤ 44) are never cut. Every frame comes from a pink cell starting at x ≥ 47, and the extractor asserts this per frame.',
     '- **Cutting:** one 8-connected pink cell per frame, copied 1:1 with nearest-neighbour only. The sheet already faces RIGHT, so nothing is mirrored.',
     '- **Floor shadow removed:** the flat black/near-black blob baked under the feet is deleted (removal only, no repaint), so jumps don\'t carry a floor shadow.',
     '  - R17 (streaks) and R18 (beam sprites) are untouched; every source pixel is kept.',
     '- **No invented art.** Frames reused by several animations are derived copies (listed in "Used by"). The poster crop, gem crop and composed portrait are derived copies of untouched pixels.',
     '- **Only exclusion:** the poster\'s credit band (see below and `CREDITS.md`).', '',
     '## Input labels (identified, documented, never cut)', '', '| Row | Label on the sheet | Label boxes (x0,y0,x1,y1) |', '|---|---|---|']
for ri in range(1, 19):
    lb = labels_out.get(f'R{ri}')
    L.append(f"| R{ri} | {lb['text'] if lb else '(none)'} | {' '.join(str(tuple(b)) for b in lb['boxes']) if lb else ''} |")
L += ['', '## Frames', '', '| Frame | Sheet box (x0,y0,x1,y1) | Input label | Content | Used by (animation → trigger) |', '|---|---|---|---|---|']
for fid, c in FR.items():
    ri = int(fid[1:fid.index('F')]); lt = LABEL_TEXT.get(ri, '')
    u = [f"`{n}` → {TRIGGER[n]}" for n in uses.get(fid, []) if n in TRIGGER] + ([FXUSE[fid]] if fid in FXUSE else [])
    L.append(f"| {fid} | {c['x0']},{c['y0']},{c['x1']},{c['y1']} | {lt} | {DESC[fid]} | {'<br>'.join(u)} |")
L += ['', '## Non-frame cuts', '', '| Cut | Sheet box | Use | Status |', '|---|---|---|---|',
      f'| WANTED poster (header + mugshot window) | {POSTER[0]},{POSTER[1]},{POSTER[2]},{CREDIT_Y - 1} | Judgment UI frame (slides onto the HUD) · character-select portrait background | derived copy (crop) |',
      f'| Poster credit band "ripped by the FRANKETE for TSR" | {POSTER[0]},{CREDIT_Y},{POSTER[2]},{POSTER[3]} | none | **excluded, credit** (the scroll ornaments are interleaved with the lettering) |',
      f'| Blue GEM (cyan diamond on the dark badge) | {GEM[0]},{GEM[1]},{GEM[2]},{GEM[3]} | containment card icon · HUD Delta badge · WIN-1 spinning gem · idle glint | derived copy (crop) |',
      '| portrait.png | poster + R9F2 | character select / HUD nameplate | derived composite of untouched pixels |', '',
      '## Chroma-key verification (idle + run)', '', '| Frame | Suit px in source | Suit px kept | % | Key colour left | Shadow px removed |', '|---|---|---|---|---|---|']
for fid, v in ck.items():
    L.append(f"| {fid} | {v['suit_src']} | {v['suit_kept']} | {v['pct']} | {v['key_left']} | {v['shadow_removed']} |")
L += ['', '## Real frame counts per row', '', '| Row | Frames | Brief\'s read |', '|---|---|---|']
BRIEF = [2, 8, 1, 2, 1, 5, 4, 3, 2, 3, 2, 1, 6, 3, 1, 3, 2, 3]
for ri, (n, b) in enumerate(zip(COUNTS, BRIEF), 1): L.append(f'| R{ri} | {n} | {b} {"✓" if n == b else "✗"} |')
open(os.path.join(DOCS, 'SPRITE_LEDGER.md'), 'w').write('\n'.join(L) + '\n')
