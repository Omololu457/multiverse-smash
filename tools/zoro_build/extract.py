# tools/zoro_build/extract.py — Roronoa Zoro sprite extraction (Phase 1).
#
#   python3 -I tools/zoro_build/extract.py <repo-root>
#
# Source: assets/incoming/zoro/zoro_sheet.png (GBA "One Piece", ripped by Paddy).
# Rules honoured:
#   * chroma key = the sheet's own alpha (background is already alpha-0); nothing else is keyed out
#   * connected-component cut (8-connected, 3px merge gap) — see components.py; rects frozen below
#   * NEAREST-NEIGHBOUR ONLY: frames are copied pixel-for-pixel at 1:1, never resampled / interpolated
#   * NO invented art: every output pixel is a source pixel. The only transforms are
#       - horizontal MIRROR of body frames (the sheet faces LEFT, the engine stores RIGHT-facing art and
#         flips at runtime, so facing-left Zoro shows the exact original orientation), and
#       - FX cut-outs (Taka Nami arc) = the arc-coloured pixels of R4F5 only ("derived copy" in the ledger)
#   * the ONLY exclusion is the ripper credit text in R9 (excluded, credit → docs/zoro/CREDITS.md)
# Outputs: assets/zoro/*.png strips (320x256 cells, feet at y=150, pivot x=160 — the Luffy convention, same
# ripper/scale), zoroSprites.js (ZORO_ANIM), docs/zoro/contact_sheet.png, docs/zoro/frames.json.
import sys, os, json, hashlib
from PIL import Image, ImageDraw

ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets/incoming/zoro/zoro_sheet.png')
OUT = os.path.join(ROOT, 'assets/zoro')
DOCS = os.path.join(ROOT, 'docs/zoro')
CELL_W, CELL_H, OX, OY = 320, 256, 160, 150
os.makedirs(OUT, exist_ok=True); os.makedirs(DOCS, exist_ok=True)

sheet = Image.open(SRC).convert('RGBA')
sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()

# Inclusive source rects from the connected-component pass (components.py, gap 3). Row/frame ids are the
# REAL counts read off the sheet (R4 has 5 frames, not 6). R3F3 includes the detached 2x2 white speck
# (component [141,127]-[142,128], 7px right of the head — a sweat/impact speck, kept, not dropped).
FRAMES = {
 'R1F1': (15, 1, 45, 54), 'R1F2': (49, 2, 76, 54), 'R1F3': (84, 1, 111, 54),
 'R1F4': (120, 0, 150, 54), 'R1F5': (159, 1, 189, 54), 'R1F6': (197, 2, 227, 54),
 'R2F1': (19, 62, 49, 117), 'R2F2': (59, 62, 89, 117),
 'R3F1': (0, 123, 49, 176), 'R3F2': (58, 127, 92, 176), 'R3F3': (99, 127, 142, 176),
 'R3F4': (152, 133, 197, 176), 'R3F5': (211, 162, 274, 176),
 'R4F1': (2, 193, 62, 237), 'R4F2': (71, 187, 107, 237), 'R4F3': (115, 193, 151, 237),
 'R4F4': (162, 187, 207, 237), 'R4F5': (217, 190, 285, 237),
 'R5F1': (3, 247, 95, 288), 'R5F2': (109, 247, 169, 288), 'R5F3': (181, 256, 228, 288),
 'R6F1': (3, 301, 63, 345), 'R6F2': (75, 303, 121, 345), 'R6F3': (128, 306, 176, 345), 'R6F4': (184, 293, 249, 345),
 'R7F1': (11, 359, 62, 410), 'R7F2': (66, 360, 132, 410), 'R7F3': (143, 360, 191, 410), 'R7F4': (207, 360, 254, 410),
 'R8F1': (13, 426, 53, 479), 'R8F2': (62, 426, 102, 480), 'R8F3': (114, 427, 154, 479), 'R8F4': (163, 426, 202, 479),
 'R9F1': (12, 489, 46, 548), 'R9F2': (68, 501, 89, 547),
 # Going Merry: shares one component with the credit text panels. The text panels start at sheet x=168;
 # everything left of that (figurehead head, neck, bow) is art and is kept. Pixels at x>=168 = excluded.
 'R9F3': (110, 495, 167, 548),
}
CREDIT_RECT = (168, 495, 273, 548)   # excluded, credit (never written anywhere)
MOUTH_SWORD = {'R3F1', 'R4F2', 'R4F3', 'R4F4', 'R6F4', 'R7F1', 'R7F3', 'R7F4'}   # three-sword frames, judged by eye

def crop(fid):
    x0, y0, x1, y1 = FRAMES[fid]
    return sheet.crop((x0, y0, x1 + 1, y1 + 1))

def feet_pivot(img):
    """Median x of opaque pixels in the bottom 6 rows (the feet / ground contact)."""
    a = img.getchannel('A').load(); w, h = img.size; xs = []
    for y in range(max(0, h - 6), h):
        xs += [x for x in range(w) if a[x, y]]
    xs.sort()
    return xs[len(xs) // 2] if xs else w // 2

def body_frame(fid):
    img = crop(fid).transpose(Image.FLIP_LEFT_RIGHT)   # mirror → right-facing storage
    piv = (img.width // 2) if fid in ('R3F5',) else feet_pivot(img)   # lying knockdown: centre of the body
    return img, piv

def strip(name, fids):
    out = Image.new('RGBA', (CELL_W * len(fids), CELL_H), (0, 0, 0, 0))
    for i, fid in enumerate(fids):
        img, piv = body_frame(fid)
        out.paste(img, (i * CELL_W + OX - piv, OY - img.height), img)
    out.save(os.path.join(OUT, name + '.png'))
    return out

# animation → (frame ids, speed, loop). Sim-timed moves get exact frameTimelines in zoroData.js; `speed`
# here is only the fallback tick rate for looped / non-move states.
ANIMS = {
 'idle': (['R2F1', 'R2F2'], 26, True),
 'walk': (['R1F1', 'R1F2', 'R1F3', 'R1F4', 'R1F5', 'R1F6'], 6, True),
 'walk_back': (['R1F6', 'R1F5', 'R1F4', 'R1F3', 'R1F2', 'R1F1'], 7, True),
 'run': (['R1F1', 'R1F2', 'R1F3', 'R1F4', 'R1F5', 'R1F6'], 4, True),
 'dash': (['R5F3'], 4, True),
 'jump': (['R6F2'], 6, False),
 'fall': (['R6F3'], 6, False),
 'crouch': (['R3F4'], 6, True),
 'guard': (['R4F3'], 6, True),
 'guard_hit': (['R4F3'], 6, False),
 'hurt': (['R3F2'], 6, False),
 'hurt_heavy': (['R3F3'], 6, False),
 'hurt_air': (['R3F3'], 6, False),
 'knockdown': (['R3F3', 'R3F5'], 8, False),
 'getup': (['R3F4', 'R2F1'], 10, False),
 'grab': (['R5F3'], 6, False),
 'throw': (['R5F3', 'R6F4'], 6, False),
 'taunt': (['R7F2', 'R7F1'], 18, False),
 'intro': (['R1F1', 'R1F2', 'R1F3', 'R1F4', 'R1F5', 'R1F6', 'R1F1', 'R1F2', 'R1F3', 'R1F4', 'R1F5', 'R1F6', 'R3F1'], 6, False),
 'win': (['R2F1', 'R2F2'], 30, False),
 'win2': (['R7F1'], 30, False),
 'lose': (['R9F1'], 30, False),
 'nap': (['R9F2'], 30, True),
 # normals
 'light': (['R4F1', 'R4F2'], 4, False),             # Jab
 'zSlash': (['R4F3', 'R4F4'], 5, False),            # Slash
 'heavy': (['R4F4', 'R4F5'], 6, False),             # Heavy slash (launch)
 'zLow': (['R6F1', 'R6F3'], 5, False),              # Low thrust
 'up': (['R6F3', 'R6F2', 'R6F4'], 5, False),        # Rising slash (anti-air)
 'air': (['R7F3', 'R7F4'], 5, False),               # Air slash
 'down_air': (['R6F3'], 6, False),                  # air plunge (engine-required downAir)
 'zWake': (['R5F1', 'R5F2'], 5, False),             # Wake-up reversal
 # specials
 'zTaka': (['R4F2', 'R4F5'], 6, False),             # Taka Nami cast
 'zOni': (['R4F4', 'R5F2', 'R5F1', 'R5F3'], 5, False),   # Oni Giri
 'zTatsu': (['R4F2', 'R4F4'], 6, False),            # Tatsu Maki cast
 'zTora': (['R6F2', 'R6F3'], 6, False),             # Tora Gari leap → low cut
 'zShishi': (['R3F1'], 6, False),                   # Shishi Sonson ready (counter window)
 'zShishiStrike': (['R5F2', 'R5F3'], 5, False),     # Shishi Sonson draw-through
 'zNap': (['R9F2'], 30, False),                     # NAP (Spirit regen)
 'zSanto': (['R3F1', 'R7F1'], 8, False),            # Santoryu activation (sword to the mouth)
 'zAshura': (['R7F1', 'R5F1', 'R5F2', 'R7F2', 'R4F5'], 6, False),   # super
 'zAshuraMiss': (['R5F3'], 6, False),
 # Santoryu stance overrides (mouth-sword frames)
 'zsIdle': (['R7F1'], 30, True),
 'zsLight': (['R7F1', 'R7F2'], 4, False),
 'zsHeavy': (['R7F3', 'R7F4'], 6, False),
}

anim_js = {}
for name, (fids, speed, loop) in ANIMS.items():
    strip(name, fids)
    anim_js[name] = {'sheet': f'./assets/zoro/{name}.png', 'frames': len(fids), 'width': CELL_W, 'height': CELL_H,
                     'speed': speed, 'anchorY': 0, 'originX': OX, 'originY': OY, 'loop': loop, 'lockLastFrame': True,
                     'src': fids}

# ── FX (render-only) ──────────────────────────────────────────────────────────────────────────────────
# Tatsu Maki tornado: R8F1-4, unmirrored (symmetric FX), bottom-centred in 48x64 cells.
TW, TH = 48, 64
tor = Image.new('RGBA', (TW * 4, TH), (0, 0, 0, 0))
for i, fid in enumerate(['R8F1', 'R8F2', 'R8F3', 'R8F4']):
    img = crop(fid); tor.paste(img, (i * TW + (TW - img.width) // 2, TH - img.height), img)
tor.save(os.path.join(OUT, 'fx_tornado.png'))

# Taka Nami flying slash: the arc pixels of R4F5 (white/yellow/gold, no black outline) that are NOT part of
# Zoro's outlined body. 8-connected components of arc-coloured pixels; a component is the arc when fewer
# than 25% of its pixels touch a black outline pixel. Mirrored to face right like the body.
ARC = {(248, 248, 248), (216, 224, 64), (168, 136, 0)}
src = crop('R4F5'); p = src.load(); w, h = src.size
isarc = [[p[x, y][3] > 0 and p[x, y][:3] in ARC for x in range(w)] for y in range(h)]
isblk = lambda x, y: 0 <= x < w and 0 <= y < h and p[x, y][3] > 0 and p[x, y][:3] == (0, 0, 0)
seen = [[False] * w for _ in range(h)]; keep = set()
for y in range(h):
    for x in range(w):
        if isarc[y][x] and not seen[y][x]:
            st = [(x, y)]; seen[y][x] = True; comp = []
            while st:
                cx, cy = st.pop(); comp.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and isarc[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True; st.append((nx, ny))
            touch = sum(1 for (cx, cy) in comp if any(isblk(cx + dx, cy + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)))
            if len(comp) >= 12 and touch / len(comp) < 0.25:
                keep |= set(comp)
arc = Image.new('RGBA', src.size, (0, 0, 0, 0)); ap = arc.load()
for (x, y) in keep: ap[x, y] = p[x, y]
arc = arc.crop(arc.getbbox()).transpose(Image.FLIP_LEFT_RIGHT)
arc.save(os.path.join(OUT, 'fx_takanami.png'))
# Ashura afterimage source = the R7F1 mouth-sword frame strip ('zsIdle'), already written above.

# Going Merry emblem (UI only → NOT mirrored) + portrait = the emblem (the brief's roster/select icon).
merry = crop('R9F3'); merry = merry.crop(merry.getbbox())
merry.save(os.path.join(OUT, 'merry.png'))
pw = max(merry.width, merry.height) + 4
por = Image.new('RGBA', (pw, pw), (0, 0, 0, 0)); por.paste(merry, ((pw - merry.width) // 2, (pw - merry.height) // 2), merry)
por.save(os.path.join(OUT, 'portrait.png'))

# ── zoroSprites.js ─────────────────────────────────────────────────────────────────────────────────────
js = ['// GENERATED by tools/zoro_build/extract.py — do not hand-edit. Ledger: docs/zoro/SPRITE_LEDGER.md',
      f'// Source assets/incoming/zoro/zoro_sheet.png SHA-256 {sha}',
      'export const ZORO_ANIM = ' + json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'src'} for k, v in anim_js.items()}, indent=1),
      f"export const ZORO_FX = {{ tornado: {{ sheet: './assets/zoro/fx_tornado.png', frames: 4, w: {TW}, h: {TH} }}, "
      f"takaNami: {{ sheet: './assets/zoro/fx_takanami.png', frames: 1, w: {arc.width}, h: {arc.height} }}, "
      f"merry: {{ sheet: './assets/zoro/merry.png', w: {merry.width}, h: {merry.height} }} }}", '']
open(os.path.join(ROOT, 'zoroSprites.js'), 'w').write('\n'.join(js))

# ── frames.json + contact sheet (every source frame numbered) ────────────────────────────────────────
uses = {}
for name, (fids, _, _) in ANIMS.items():
    for f in fids: uses.setdefault(f, []).append(name)
uses.setdefault('R8F1', []).append('fx_tornado'); [uses.setdefault(f, []).append('fx_tornado') for f in ('R8F2', 'R8F3', 'R8F4')]
uses['R4F5'].append('fx_takanami (derived copy: arc pixels only)')
uses.setdefault('R9F3', []).extend(['merry emblem', 'portrait'])
uses['R7F1'].append('Ashura afterimage source (render-only derived copies)')
json.dump({'source': 'assets/incoming/zoro/zoro_sheet.png', 'sha256': sha, 'cell': [CELL_W, CELL_H], 'origin': [OX, OY],
           'frames': {k: {'rect': v, 'mouthSword': k in MOUTH_SWORD, 'uses': uses.get(k, [])} for k, v in FRAMES.items()},
           'excluded': {'credit_text': list(CREDIT_RECT)}}, open(os.path.join(DOCS, 'frames.json'), 'w'), indent=1)

K = 3
cs = Image.new('RGBA', (sheet.width * K + 40, sheet.height * K + 40), (60, 66, 78, 255))
bg = Image.new('RGBA', sheet.size, (182, 214, 182, 255)); bg.alpha_composite(sheet)
cs.paste(bg.resize((sheet.width * K, sheet.height * K), Image.NEAREST), (20, 20))
d = ImageDraw.Draw(cs)
for n, (fid, (x0, y0, x1, y1)) in enumerate(FRAMES.items(), 1):
    col = (255, 80, 200) if fid in MOUTH_SWORD else (255, 40, 40)
    d.rectangle((20 + x0 * K, 20 + y0 * K, 20 + (x1 + 1) * K - 1, 20 + (y1 + 1) * K - 1), outline=col, width=2)
    d.rectangle((20 + x0 * K, 20 + y0 * K, 20 + x0 * K + 58, 20 + y0 * K + 11), fill=(0, 0, 0))
    d.text((22 + x0 * K, 20 + y0 * K), f'{n}:{fid}', fill=(255, 255, 0))
x0, y0, x1, y1 = CREDIT_RECT
d.rectangle((20 + x0 * K, 20 + y0 * K, 20 + (x1 + 1) * K - 1, 20 + (y1 + 1) * K - 1), outline=(140, 140, 140), width=2)
d.text((22 + x0 * K, 22 + y1 * K - 10), 'EXCLUDED: credit', fill=(255, 255, 255))
d.text((20, sheet.height * K + 24), 'red = frame, magenta = mouth-sword (three-sword) frame, grey = excluded credit text', fill=(255, 255, 255))
cs.save(os.path.join(DOCS, 'contact_sheet.png'))
print('frames', len(FRAMES), 'anims', len(ANIMS), 'arc px', len(keep), 'merry', merry.size)
