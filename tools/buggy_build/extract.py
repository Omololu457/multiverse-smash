# tools/buggy_build/extract.py — Buggy the Clown sprite extraction (Phase 1).
#
#   python3 -I tools/buggy_build/extract.py <repo-root>
#
# Source: assets/incoming/buggy/buggy_sheet.png (GBA "One Piece", ripped by Paddy — same ripper/scale as Zoro).
# Rules honoured:
#   * chroma key = the sheet's own alpha (background is already alpha-0); nothing else is keyed out
#   * connected-band cut (segment.py): empty-column gaps >= 4px split body rows, >= 2px split loose-piece rows
#   * NEAREST-NEIGHBOUR ONLY: every frame is copied pixel-for-pixel at 1:1, never resampled / interpolated
#   * NO invented art: every output pixel is a source pixel. The only transforms are
#       - horizontal MIRROR of body frames + parts (the sheet faces LEFT; the engine stores RIGHT-facing art and
#         flips at runtime, so facing-left Buggy shows the exact original orientation),
#       - MASKED VARIANTS ("derived copy"): a body frame with the detached part's pixels cleared and one source
#         joint disc (L2P4) pasted on the stump — rows 1..6 of every masked strip,
#       - the knife projectile = the throw-streak pixels of R4F3 only ("derived copy"),
#       - the planted-legs part = pelvis L1P6 pasted over the boot pair L3P1 ("derived copy").
#   * the ONLY exclusion is the ripper credit panel ("Ripped by Paddy / No credit needed") → docs/buggy/CREDITS.md
#   * the Going Merry figurehead is the SAME art Zoro's build already shipped as assets/zoro/merry.png → reused,
#     not duplicated (pixel-compared below; result recorded in frames.json)
# Outputs: assets/buggy/*.png, buggySprites.js (BUGGY_ANIM / BUGGY_FX / BUGGY_PARTS), docs/buggy/contact_sheet.png,
#          docs/buggy/frames.json, docs/buggy/masks_check.png.
import sys, os, json, hashlib
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segment import segment

ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets/incoming/buggy/buggy_sheet.png')
OUT = os.path.join(ROOT, 'assets/buggy')
DOCS = os.path.join(ROOT, 'docs/buggy')
CELL_W, CELL_H, OX, OY = 160, 112, 80, 100      # feet at y=100, pivot x=80 (same convention as Zoro/Luffy, smaller cell)
os.makedirs(OUT, exist_ok=True); os.makedirs(DOCS, exist_ok=True)
sheet = Image.open(SRC).convert('RGBA')
sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()

# ── 1. Frame table (REAL counts, verified by eye against the sheet) ────────────────────────────────────
ROWS = segment(SRC)
EXPECT = [5, 4, 2, 4, 4, 2, 4, 3, 2, 3, 3, 3, 4, 4, 9, 8, 7, 1, 10, 3, 6, 2, 8, 2, 1]
assert [len(r) for r in ROWS] == EXPECT, [len(r) for r in ROWS]
FRAMES = {}
for i, row in enumerate(ROWS):
    for j, r in enumerate(row):
        fid = f'R{i + 1}F{j + 1}' if i < 14 else (f'L{i - 13}P{j + 1}' if i < 24 else 'MERRY')
        FRAMES[fid] = r
CREDIT_X = 58                                   # the credit panel occupies sheet x >= 58 of the MERRY band
MERRY_RECT = (FRAMES['MERRY'][0], FRAMES['MERRY'][1], CREDIT_X - 1, FRAMES['MERRY'][3])
CREDIT_RECT = (CREDIT_X, FRAMES['MERRY'][1], FRAMES['MERRY'][2], FRAMES['MERRY'][3])   # excluded, credit

def crop(fid):
    x0, y0, x1, y1 = FRAMES[fid]
    return sheet.crop((x0, y0, x1 + 1, y1 + 1))
mirror = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)

# ── 2. Part masks (frame-relative, inclusive, UNMIRRORED source coords). Hand-read off a 6x gridded zoom. ──
#   head = hat + hair + face + cravat · hand = the FRONT (knife) hand · foot = the FRONT boot. None = no such part
#   visible in the art (R5F2/R5F3 already show the arm with its hand gone — the canon Bara Bara Hou frames).
MASKS = {
 'R1F1': ((5, 0, 30, 17), (0, 25, 11, 32), (9, 48, 23, 54)),
 'R1F2': ((9, 0, 37, 19), (0, 15, 11, 26), (12, 54, 23, 60)),
 'R1F3': ((9, 0, 37, 19), (0, 15, 11, 26), (12, 54, 23, 60)),
 'R2F1': ((7, 0, 31, 17), (0, 25, 11, 32), (10, 47, 23, 53)),
 'R2F2': ((7, 0, 31, 17), (0, 25, 11, 32), (10, 47, 23, 53)),
 'R2F3': ((7, 0, 31, 17), (0, 25, 11, 32), (10, 47, 23, 53)),
 'R2F4': ((7, 0, 31, 17), (0, 25, 11, 32), (10, 47, 23, 53)),
 'R3F1': ((14, 0, 34, 21), (0, 5, 11, 16), (13, 55, 26, 63)),
 'R4F1': ((9, 0, 33, 17), (0, 15, 11, 26), (12, 52, 24, 58)),
 'R4F2': ((8, 0, 33, 17), (0, 22, 10, 32), (8, 48, 22, 54)),
 'R4F3': ((29, 0, 55, 16), (26, 14, 34, 24), (25, 47, 40, 54)),
 'R4F4': ((36, 0, 62, 16), (0, 13, 27, 27), (34, 48, 47, 54)),
 'R5F1': ((35, 0, 60, 16), (0, 13, 22, 26), (34, 48, 48, 54)),
 'R5F2': ((9, 0, 35, 16), None, (8, 48, 22, 54)),
 'R5F3': ((9, 0, 35, 16), None, (8, 48, 22, 54)),
 'R8F1': ((16, 0, 42, 18), (0, 10, 13, 28), (11, 51, 24, 58)),
}
JOINT = 'L2P4'          # the round joint disc pasted on a stump (source art)
# stump anchor per part: head → bottom-centre of the rect · hand → arm-side (right, unmirrored) edge · foot → top-centre
def stump(part, r):
    x0, y0, x1, y1 = r
    return ((x0 + x1) // 2, y1) if part == 0 else ((x1, (y0 + y1) // 2) if part == 1 else ((x0 + x1) // 2, y0))

def masked(fid, bits):
    """Body frame (unmirrored) with the parts in `bits` (1=head 2=hand 4=foot) cleared + joint disc on each stump."""
    img = crop(fid).copy()
    m = MASKS.get(fid)
    if not m or not bits: return img
    px = img.load(); j = crop(JOINT)
    stumps = []
    for part in range(3):
        if not (bits >> part) & 1 or m[part] is None: continue
        x0, y0, x1, y1 = m[part]
        for y in range(y0, min(y1, img.height - 1) + 1):
            for x in range(x0, min(x1, img.width - 1) + 1): px[x, y] = (0, 0, 0, 0)
        stumps.append(stump(part, m[part]))
    # Slivers: a cut can leave a few pixels of the part (a hair strand, a knife tip) floating. Drop every small
    # (<= 30 px) 8-connected component that touches a cleared rect — never anything elsewhere in the frame.
    a = [[px[x, y][3] > 0 for x in range(img.width)] for y in range(img.height)]
    rects = [m[k] for k in range(3) if (bits >> k) & 1 and m[k] is not None]
    near = lambda x, y: any(r[0] - 2 <= x <= r[2] + 2 and r[1] - 2 <= y <= r[3] + 2 for r in rects)
    seen = [[False] * img.width for _ in range(img.height)]
    for y0 in range(img.height):
        for x0 in range(img.width):
            if not a[y0][x0] or seen[y0][x0]: continue
            st = [(x0, y0)]; seen[y0][x0] = True; comp = []
            while st:
                cx, cy = st.pop(); comp.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < img.width and 0 <= ny < img.height and a[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True; st.append((nx, ny))
            if len(comp) <= 30 and any(near(cx, cy) for cx, cy in comp):
                for cx, cy in comp: px[cx, cy] = (0, 0, 0, 0)
    for sx, sy in stumps:
        img.alpha_composite(j, (max(0, min(img.width - j.width, sx - j.width // 2)), max(0, min(img.height - j.height, sy - j.height // 2))))
    return img

def feet_pivot(img):
    a = img.getchannel('A').load(); w, h = img.size; xs = []
    for y in range(max(0, h - 6), h):
        xs += [x for x in range(w) if a[x, y]]
    xs.sort()
    return xs[len(xs) // 2] if xs else w // 2

UPRIGHT = set(MASKS) | {'R3F2', 'R6F1', 'R6F2', 'R8F2', 'R13F2', 'R13F3', 'R13F4', 'R14F1', 'R14F2'}
def place(img, fid):
    """Mirror to right-facing + (pivot x, bottom y) inside the cell. Upright frames pivot on the feet; airborne /
    horizontal / ball frames are centred on their box. The pivot comes from the UNMASKED frame so masking never
    shifts the body."""
    full = mirror(crop(fid))
    piv = feet_pivot(full) if fid in UPRIGHT else full.width // 2
    return mirror(img), piv

ANIMS = {   # name: (frame ids, speed, loop, masked)
 'idle': (['R1F1', 'R1F2', 'R1F3', 'R1F2'], 12, True, True),
 'walk': (['R2F1', 'R2F2', 'R2F3', 'R2F4'], 7, True, True),
 'walk_back': (['R2F4', 'R2F3', 'R2F2', 'R2F1'], 8, True, True),
 'run': (['R2F1', 'R2F2', 'R2F3', 'R2F4'], 4, True, True),
 'dash': (['R11F1', 'R11F2'], 4, True, False),           # ROLL (engine ground dash = his forward roll)
 'jump': (['R11F3'], 6, False, False),
 'fall': (['R11F3'], 6, False, False),
 'crouch': (['R4F2'], 6, True, True),
 'guard': (['R4F1'], 6, True, True),
 'guard_hit': (['R4F1'], 6, False, True),
 'hurt': (['R6F2'], 6, False, False),
 'hurt_heavy': (['R6F2'], 6, False, False),
 'hurt_air': (['R6F2'], 6, False, False),
 'knockdown': (['R6F1', 'L4P1'], 8, False, False),
 'getup': (['R4F2', 'R1F1'], 10, False, True),
 'grab': (['R5F1'], 6, False, True),
 'throw': (['R5F1', 'R4F4'], 6, False, True),
 'taunt': (['R1F2', 'R1F3'], 8, True, True),
 'intro': (['R6F1', 'R6F2', 'R1F1'], 14, False, False),
 'win': (['R1F2'], 30, True, True),                     # WIN 1 — drawn with the head-masked row (head floats)
 'win2': (['R3F1'], 30, True, True),                    # WIN 2 — cape spread, knives fanned (FX)
 'lose': (['L4P1'], 30, False, False),
 # normals
 'light': (['R4F1', 'R4F2'], 4, False, True),           # Jab
 'bSlash': (['R4F3', 'R4F4'], 5, False, True),          # Knife slash
 'heavy': (['R5F1', 'R5F2'], 6, False, True),           # Heavy carve (launch)
 'bLow': (['R10F1', 'R10F2', 'R10F3'], 4, False, False),         # Low knife (low-profile lunge)
 'bKick': (['R8F1', 'R8F2'], 5, False, True),           # Clown kick
 'up': (['R8F2', 'R8F3'], 5, False, False),             # Acrobatic kick (anti-air)
 'air': (['R9F1', 'R9F2'], 5, False, False),            # Air knife
 'down_air': (['R9F2'], 6, False, False),
 'bWake': (['R12F1', 'R12F2', 'R12F3'], 3, False, False),   # Wake-up reversal (spinning knives)
 # specials
 'bCannon': (['R5F1', 'R5F2', 'R5F3'], 6, False, True), # Chop-Chop Cannon (the hand leaves on F2)
 'bStab': (['R5F3'], 6, False, True),                   # hand follow-up (Buggy just points)
 'bFestival': (['R6F1', 'R6F2'], 10, True, False),      # Chop-Chop Festival (in pieces)
 'bBall': (['R13F2', 'R13F3', 'R13F4'], 6, False, False),   # Buggy Ball (cannon cart)
 'bEscape': (['R6F1', 'R6F2'], 6, False, False),        # Quick Escape split
 'bFan': (['R4F3', 'R4F4'], 5, False, True),            # Knife Fan
 'bCape': (['R3F1'], 6, False, True),                   # Cape Flourish
 'bHead': (['R1F1'], 6, False, True),                   # Chop-Chop Lookout (head leaves)
 'bRecall': (['R1F2', 'R1F3'], 6, False, True),         # Recall (laughing)
 'bSuper': (['R6F2', 'R14F1', 'R14F2', 'R12F1', 'R12F2', 'R12F3'], 6, False, False),
 'bSuperMiss': (['R6F1'], 6, False, False),
 'bStagger': (['R6F1', 'R6F2'], 8, True, False),        # Chop Stagger reassembly
 'bChopped': (['R6F1', 'R6F2'], 4, False, False),       # slash nullified
}
N_MASK_ROWS = 7     # row = bitmask (0 full · 1 head · 2 hand · 3 head+hand · 4 foot · 5 head+foot · 6 hand+foot)

def strip(name, fids, is_masked):
    rows = N_MASK_ROWS if is_masked else 1
    out = Image.new('RGBA', (CELL_W * len(fids), CELL_H * rows), (0, 0, 0, 0))
    for bits in range(rows):
        for i, fid in enumerate(fids):
            img, piv = place(masked(fid, bits), fid)
            out.paste(img, (i * CELL_W + OX - piv, bits * CELL_H + OY - img.height), img)
    out.save(os.path.join(OUT, name + '.png'))

anim_js = {}
for name, (fids, speed, loop, is_masked) in ANIMS.items():
    strip(name, fids, is_masked)
    anim_js[name] = {'sheet': f'./assets/buggy/{name}.png', 'frames': len(fids), 'width': CELL_W, 'height': CELL_H,
                     'speed': speed, 'anchorY': 0, 'originX': OX, 'originY': OY, 'loop': loop, 'lockLastFrame': True}
    if is_masked: anim_js[name]['maskRows'] = N_MASK_ROWS

# ── 3. Loose pieces → parts (mirrored → right-facing storage; drones.js flips by facing) ────────────────
PART_TYPES = {
 'L1P1': 'head', 'L1P2': 'head', 'L1P3': 'head', 'L1P4': 'torso', 'L1P5': 'torso', 'L1P6': 'joint', 'L1P7': 'joint',
 'L1P8': 'hand_L', 'L1P9': 'hand_R',
 **{f'L2P{k}': 'joint' for k in range(1, 9)},
 'L3P1': 'foot', 'L3P2': 'foot', 'L3P3': 'foot', 'L3P4': 'cape_strip', 'L3P5': 'cape_strip', 'L3P6': 'cape_strip', 'L3P7': 'cape_strip',
 'L4P1': 'body_lying',
 'L5P1': 'head', 'L5P2': 'torso', 'L5P3': 'joint', 'L5P4': 'hand_R', **{f'L5P{k}': 'joint' for k in range(5, 9)}, 'L5P9': 'foot', 'L5P10': 'foot',
 'L6P1': 'cape_strip', 'L6P2': 'cape_strip', 'L6P3': 'cape_strip',
 **{f'L7P{k}': 'head' for k in range(1, 7)},
 'L8P1': 'knife', 'L8P2': 'knife',
 **{f'L9P{k}': 'foot' for k in range(1, 9)},
 'L10P1': 'cape_strip', 'L10P2': 'cape_strip',
}
NOTES = {'L1P6': 'blue pelvis ring (waist joint)', 'L1P7': 'blue pelvis ring (waist joint, turned)', 'L5P3': 'blue pelvis ring (waist joint)',
         'L8P1': 'hand_R holding knives (the Cannon hand)', 'L8P2': 'hand_R holding knives, fanned', 'L3P1': 'boot pair',
         'L3P6': 'cape shoulder (epaulette)', 'L6P1': 'cape back, billowing', 'L4P1': 'full body lying flat (also the LOSE frame)'}
os.makedirs(os.path.join(OUT, 'parts'), exist_ok=True)
for fid in PART_TYPES:
    mirror(crop(fid)).save(os.path.join(OUT, 'parts', fid + '.png'))

def hstrip(fname, fids, flip=True, cw=None, ch=None):
    ims = [mirror(crop(f)) if flip else crop(f) for f in fids]
    cw = cw or max(i.width for i in ims); ch = ch or max(i.height for i in ims)
    out = Image.new('RGBA', (cw * len(ims), ch), (0, 0, 0, 0))
    for k, im in enumerate(ims): out.paste(im, (k * cw + (cw - im.width) // 2, (ch - im.height) // 2), im)
    out.save(os.path.join(OUT, fname)); return {'sheet': f'./assets/buggy/{fname}', 'frames': len(ims), 'w': cw, 'h': ch}

PARTS_JS = {
 'hand': {'idle': hstrip('part_hand_idle.png', ['L8P1', 'L8P2']), 'death': hstrip('part_hand_death.png', ['L1P8', 'L1P9'])},
 'foot': {'idle': hstrip('part_foot_idle.png', [f'L9P{k}' for k in range(1, 9)]), 'death': hstrip('part_foot_death.png', ['L3P2', 'L3P3'])},
 'head': {'idle': hstrip('part_head_idle.png', [f'L7P{k}' for k in range(1, 7)]), 'death': hstrip('part_head_death.png', ['L1P3'])},
}
# planted legs (Quick Escape leaves them standing): pelvis L1P6 over boot pair L3P1 — derived copy
boots, pel = mirror(crop('L3P1')), mirror(crop('L1P6'))
legs = Image.new('RGBA', (max(boots.width, pel.width), boots.height + pel.height - 3), (0, 0, 0, 0))
legs.paste(pel, ((legs.width - pel.width) // 2, 0), pel); legs.alpha_composite(boots, ((legs.width - boots.width) // 2, pel.height - 3))
legs.save(os.path.join(OUT, 'part_legs.png'))
PARTS_JS['legs'] = {'idle': {'sheet': './assets/buggy/part_legs.png', 'frames': 1, 'w': legs.width, 'h': legs.height},
                    'death': PARTS_JS['foot']['death']}

# ── 4. FX / UI (render-only) ─────────────────────────────────────────────────────────────────────────────
FX = {}
FX['silhouette'] = hstrip('fx_silhouette.png', ['R3F2'])            # chopped flash / reassemble flash
FX['cartGhost'] = hstrip('fx_cart_ghost.png', ['R13F1'])           # super: the cannon cart wheels in (flash)
FX['ballPlain'] = hstrip('fx_ball_plain.png', ['R14F4'], flip=False)  # Buggy Ball travelling frame
FX['ballBuggy'] = hstrip('fx_ball_buggy.png', ['R14F3'], flip=False)  # Super: the skull Buggy Ball
FX['capes'] = hstrip('fx_capes.png', ['R7F1', 'R7F2', 'R7F3', 'R7F4'])   # Cape Flourish sweep
FX['capeBack'] = hstrip('fx_cape_back.png', ['L6P1', 'L6P2', 'L6P3'])
FX['capeStrips'] = hstrip('fx_cape_strips.png', ['L3P4', 'L3P5', 'L3P6', 'L3P7', 'L10P1', 'L10P2'])
FX['cannonHand'] = hstrip('fx_cannon_hand.png', ['R5F4'])          # the hand in flight (Cannon)
FX['smallHead'] = hstrip('fx_small_head.png', ['R1F4'], flip=False)   # HUD Chop badge
ORBIT = ['L1P1', 'L1P2', 'L1P4', 'L1P5', 'L1P6', 'L1P7', 'L1P8', 'L1P9'] + [f'L2P{k}' for k in range(1, 9)] + \
        ['L3P2', 'L3P3', 'L5P1', 'L5P2', 'L5P3', 'L5P4'] + [f'L5P{k}' for k in range(5, 11)]
FX['orbit'] = hstrip('fx_orbit.png', ORBIT, cw=34, ch=27)             # Festival / Super orbiting pieces
FX['intro'] = hstrip('fx_intro_pieces.png', ['L5P1', 'L5P2', 'L5P3', 'L5P4', 'L5P9', 'L5P10', 'L5P5', 'L5P6', 'L5P7', 'L5P8'], cw=34, ch=27)
FX['lose'] = hstrip('fx_lose_pieces.png', ['L3P2', 'L3P3', 'L1P8', 'L1P9', 'L2P1', 'L2P3', 'L2P5', 'L2P7', 'L1P7'], cw=14, ch=16)
FX['split'] = hstrip('fx_split_pieces.png', ['R6F1', 'R6F2'])
FX['knivesFan'] = hstrip('fx_knives_fan.png', ['L8P1', 'L8P2'])
FX['portrait'] = {'sheet': './assets/buggy/portrait_frame.png'}
crop('R1F5').save(os.path.join(OUT, 'portrait_frame.png'))             # framed face close-up (select + win)
pw = max(crop('R1F5').width, crop('R1F5').height)
por = Image.new('RGBA', (pw, pw), (0, 0, 0, 0)); por.paste(crop('R1F5'), (0, (pw - crop('R1F5').height) // 2), crop('R1F5'))
por.save(os.path.join(OUT, 'portrait.png'))

# knife projectile: the throw-streak pixels of R4F3 (yellow/white streak, left of Buggy's outlined body).
# Mirrored to fly right. A pixel is streak if it lies left of x=27 (frame-relative) — the body starts at x=27.
src = crop('R4F3'); p = src.load(); kn = Image.new('RGBA', src.size, (0, 0, 0, 0)); kp = kn.load()
for y in range(src.height):
    for x in range(min(27, src.width)):
        if p[x, y][3]: kp[x, y] = p[x, y]
kn = mirror(kn.crop(kn.getbbox())); kn.save(os.path.join(OUT, 'fx_knife.png'))
FX['knife'] = {'sheet': './assets/buggy/fx_knife.png', 'frames': 1, 'w': kn.width, 'h': kn.height}

# Going Merry: reuse Zoro's emblem if it is the same art (pixel compare).
merry = sheet.crop((MERRY_RECT[0], MERRY_RECT[1], MERRY_RECT[2] + 1, MERRY_RECT[3] + 1)); merry = merry.crop(merry.getbbox())
zm_path = os.path.join(ROOT, 'assets/zoro/merry.png'); same = False
if os.path.exists(zm_path):
    zm = Image.open(zm_path).convert('RGBA'); same = zm.size == merry.size and list(zm.getdata()) == list(merry.getdata())
FX['merry'] = {'sheet': './assets/zoro/merry.png', 'reused': True, 'identical': same}

# ── 5. buggySprites.js ───────────────────────────────────────────────────────────────────────────────────
js = ['// GENERATED by tools/buggy_build/extract.py — do not hand-edit. Ledger: docs/buggy/SPRITE_LEDGER.md',
      f'// Source assets/incoming/buggy/buggy_sheet.png SHA-256 {sha}',
      f'// Masked strips carry {N_MASK_ROWS} rows: row = detached-part bitmask (1 head · 2 hand · 4 foot), sourceY = row * height.',
      'export const BUGGY_ANIM = ' + json.dumps(anim_js, indent=1),
      'export const BUGGY_FX = ' + json.dumps(FX, indent=1),
      'export const BUGGY_PARTS = ' + json.dumps(PARTS_JS, indent=1), '']
open(os.path.join(ROOT, 'buggySprites.js'), 'w').write('\n'.join(js))

# ── 6. frames.json + numbered contact sheet + mask check sheet ───────────────────────────────────────────
uses = {}
for name, (fids, *_rest) in ANIMS.items():
    for f in fids: uses.setdefault(f, []).append(name)
for k, v in FX.items():
    pass
def add(f, u): uses.setdefault(f, []).append(u)
for f, u in [('R3F2', 'fx_silhouette (chopped / reassemble flash)'), ('R13F1', 'fx_cart_ghost (super cart flash)'),
             ('R14F4', 'fx_ball_plain (Buggy Ball travelling frame)'), ('R14F3', 'fx_ball_buggy (super balls)'),
             ('R5F4', 'fx_cannon_hand (Cannon hand in flight)'), ('R1F4', 'fx_small_head (HUD Chop badge)'),
             ('R1F5', 'portrait + portrait_frame (select / WIN 1)'), ('R4F3', 'fx_knife (derived copy: streak pixels only)'),
             ('R6F1', 'fx_split_pieces'), ('R6F2', 'fx_split_pieces')]:
    add(f, u)
for f in ['R7F1', 'R7F2', 'R7F3', 'R7F4']: add(f, 'fx_capes (Cape Flourish sweep)')
for f in ['L6P1', 'L6P2', 'L6P3']: add(f, 'fx_cape_back (Cape Flourish / WIN 2 billow)')
for f in ['L3P4', 'L3P5', 'L3P6', 'L3P7', 'L10P1', 'L10P2']: add(f, 'fx_cape_strips (Cape Flourish trail)')
for f in ORBIT: add(f, 'fx_orbit (Festival / Super orbit)')
for f in ['L5P1', 'L5P2', 'L5P3', 'L5P4', 'L5P9', 'L5P10', 'L5P5', 'L5P6', 'L5P7', 'L5P8']: add(f, 'fx_intro_pieces (INTRO assembly)')
for f in ['L3P2', 'L3P3', 'L1P8', 'L1P9', 'L2P1', 'L2P3', 'L2P5', 'L2P7', 'L1P7']: add(f, 'fx_lose_pieces (LOSE scatter)')
for f in ['L8P1', 'L8P2']: add(f, 'part_hand_idle (HAND part) + fx_knives_fan (WIN 2)')
for f in ['L1P8', 'L1P9']: add(f, 'part_hand_death (HAND snap-back)')
for k in range(1, 9): add(f'L9P{k}', 'part_foot_idle (FOOT part spin)')
for f in ['L3P2', 'L3P3']: add(f, 'part_foot_death (FOOT snap-back)')
for k in range(1, 7): add(f'L7P{k}', 'part_head_idle (HEAD part) + idle look-around')
add('L1P3', 'part_head_death (HEAD snap-back)')
add('L1P6', 'part_legs (derived copy: pelvis over boots — planted legs)'); add('L3P1', 'part_legs (derived copy)')
add(JOINT, 'joint disc pasted on every masked stump (derived copies, rows 1-6)')
add('L1P1', 'HUD head pip'); add('L5P4', 'HUD hand pip'); add('L5P9', 'HUD foot pip')
add('MERRY', 'One Piece emblem → reuses assets/zoro/merry.png' + (' (pixel-identical)' if same else ' (same figurehead art)'))
unused = [f for f in FRAMES if f not in uses]
json.dump({'source': 'assets/incoming/buggy/buggy_sheet.png', 'sha256': sha, 'cell': [CELL_W, CELL_H], 'origin': [OX, OY],
           'rowCounts': EXPECT, 'frames': {k: {'rect': v, 'type': PART_TYPES.get(k), 'note': NOTES.get(k), 'uses': uses.get(k, []),
                                              'masks': MASKS.get(k)} for k, v in FRAMES.items()},
           'excluded': {'credit_panel': CREDIT_RECT}, 'merryIdentical': same, 'unused': unused},
          open(os.path.join(DOCS, 'frames.json'), 'w'), indent=1)

cols, cw, ch = 8, 190, 150
ids = list(FRAMES)
cs = Image.new('RGBA', (cols * cw, ((len(ids) + cols - 1) // cols) * ch), (34, 40, 52, 255)); d = ImageDraw.Draw(cs)
for k, fid in enumerate(ids):
    c = crop(fid); sc = max(1, min(2, (cw - 10) // c.width, (ch - 28) // c.height)); c = c.resize((c.width * sc, c.height * sc), Image.NEAREST)
    x, y = (k % cols) * cw, (k // cols) * ch
    d.rectangle([x + 1, y + 1, x + cw - 2, y + ch - 2], outline=(80, 92, 112, 255))
    cs.alpha_composite(c, (x + (cw - c.width) // 2, y + 18 + (ch - 18 - c.height) // 2))
    tag = PART_TYPES.get(fid) or ''
    d.text((x + 4, y + 3), f'#{k + 1} {fid} {tag}', fill=(255, 236, 120, 255))
    if fid == 'MERRY':
        X0 = x + (cw - c.width) // 2 + (CREDIT_X - FRAMES['MERRY'][0]) * sc
        d.rectangle([X0, y + 18 + (ch - 18 - c.height) // 2, x + (cw + c.width) // 2, y + 18 + (ch - 18 + c.height) // 2], outline=(255, 60, 60, 255))
        d.text((x + 4, y + ch - 14), 'red box = EXCLUDED credit', fill=(255, 120, 120, 255))
cs.save(os.path.join(DOCS, 'contact_sheet.png'))

mk = [f for f in MASKS]
mc = Image.new('RGBA', (7 * 90, len(mk) * 72), (60, 96, 60, 255)); d = ImageDraw.Draw(mc)
for r, fid in enumerate(mk):
    for bits in range(7):
        im = mirror(masked(fid, bits)); mc.alpha_composite(im, (bits * 90 + (90 - im.width) // 2, r * 72 + 70 - im.height))
    d.text((2, r * 72 + 2), fid, fill=(255, 255, 255, 255))
mc.save(os.path.join(DOCS, 'masks_check.png'))
print('frames', len(FRAMES), 'anims', len(ANIMS), 'merry identical', same, 'unused', unused)
