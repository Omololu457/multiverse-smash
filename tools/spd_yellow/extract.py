#!/usr/bin/env python3
"""S.P.D. Yellow Ranger (Elizabeth "Z" Delgado) sprite extraction.

Read-only source (sha256 verified, never written). Background policy, VERIFIED on this sheet (see docs/spd_yellow/SPRITE_LEDGER.md):
  * The outer sheet colour RGB(251,234,66) IS IN Z's suit palette (a suit/blade highlight: 10 blade pixels in blade3, 1 suit
    pixel in acro1, all fully enclosed by suit/blade pixels). It is therefore NEVER keyed inside a cell.
  * The frame-cell fill RGB(249,251,155) is keyed (a) wherever it is 4-connected to the cell border (through fill or outer
    colour), and (b) in ENCLOSED fill regions of >= 20 px (the leg/arm gaps sealed by the floor shadow; inspected
    enlarged, magenta-marked). Enclosed regions < 20 px in BODY cells are KEPT (effect cells — streak lines — key every enclosed fill pixel, it is background seen between the lines): they are bordered by suit tones and read as the
    brightest suit highlight; erasing them would punch holes in the yellow suit.
No tolerance, no hue keying, no global yellow removal, nearest-neighbour only. Cell rectangles are detected as connected
non-outer regions, then asserted against the expected band layout so a changed source fails.

Usage: python3 tools/spd_yellow/extract.py
"""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/spd_yellow'
OUT = ROOT / 'assets/spd_yellow'
SRC = ROOT / 'Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Power Rangers - Yellow Ranger.png'
SHA = 'c6f7731e9301f082f170deb86d2a42228f6452b602949d2687083e8c5608f6e8'
OUTER = (251, 234, 66)
CELL = (249, 251, 155)
GAP_MIN = 20
FW, FH, OX, OY = 160, 96, 80, 84      # strip frame + origin. OX = FW/2: the engine mirrors the WHOLE cell for facing -1 (sprite.js), so a centred origin keeps both facings on the hitbox centre

# (name, band y, kind, count) — names describe the OBSERVED pose (enlarged inspection), not a certified action.
LAYOUT = [
    ('ready', 8, 'body', 2),        # standing ready, fists up (2-frame breathe)
    ('run', 72, 'body', 8),         # locomotion cycle (-> icon)
    ('crouch', 136, 'body', 1),     # deep set / crouch (down icon)
    ('jump', 200, 'body', 2),       # jump rise / tuck (A icon)
    ('guard', 272, 'body', 1),      # hunched guard / hit reaction
    ('fall', 328, 'body', 5),       # hit-back, tumble, flat, roll, rise-to-pose
    ('strike', 400, 'body', 4),     # fist chamber, straight punch, HIGH kick, recover (B icon)
    ('blade', 464, 'body', 7),      # sword kata: guard cross, low draw, high thrust, low slash, overhead-ready, raised, back cut
    ('acro', 536, 'body', 6),       # airborne leap, spin, tuck, flying side kick, landing set, low crouch
    ('airKick', 640, 'body', 2),    # air tuck, flying kick (A B icons)
    ('flip', 712, 'body', 1),       # inverted aerial kick (->-> + B icon)
    ('slash', 768, 'body', 8),      # sword combo: low draw, forward thrust, tuck, back sweep, low draw, thrust, raise, cross
    ('aim', 840, 'body', 3),        # COMPACT PISTOL: draw (arm back), pistol extended, pistol tilt (recoil)
    ('airAim', 904, 'body', 1),     # airborne pose (single)
    ('fire', 976, 'body', 3),       # pistol + jagged muzzle beam, pistol + big blast, BRACED LONG GUN (only long-gun frame)
    ('streak', 1040, 'effect', 2),  # phase streaks (->+-> icon): narrow vanish streak, wide diagonal travel streak
    ('beam', 1120, 'effect', 3),    # muzzle star, thin bolt, long beam
]
CREDIT_PANEL = [620, 18, 102, 118]


def detect(src):
    w, h = src.size
    px = src.load()
    seen = bytearray(w * h)
    rects = []
    for y in range(h):
        for x in range(w):
            if seen[y * w + x] or px[x, y] == OUTER:
                continue
            stack = [(x, y)]; seen[y * w + x] = 1
            x0 = x1 = x; y0 = y1 = y; n = 0
            while stack:
                a, b = stack.pop(); n += 1
                x0 = min(x0, a); x1 = max(x1, a); y0 = min(y0, b); y1 = max(y1, b)
                for c, d in ((a - 1, b), (a + 1, b), (a, b - 1), (a, b + 1)):
                    if 0 <= c < w and 0 <= d < h and not seen[d * w + c] and px[c, d] != OUTER:
                        seen[d * w + c] = 1; stack.append((c, d))
            rects.append((x0, y0, x1 - x0 + 1, y1 - y0 + 1, n))
    return rects


def key_cell(im, effect=False):
    """Return (keyed image, stats). Implements the documented policy exactly."""
    w, h = im.size
    p = im.load()
    reach = set()
    st = [(a, b) for a in range(w) for b in (0, h - 1)] + [(a, b) for b in range(h) for a in (0, w - 1)]
    while st:
        a, b = st.pop()
        if (a, b) in reach or not (0 <= a < w and 0 <= b < h):
            continue
        if p[a, b][:3] not in (CELL, OUTER):
            continue
        reach.add((a, b)); st += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)]
    kill = {q for q in reach if p[q][:3] == CELL}
    outerBorder = sum(1 for q in reach if p[q][:3] == OUTER)
    kept = []; seen = set()
    for a in range(w):
        for b in range(h):
            if p[a, b][:3] == CELL and (a, b) not in reach and (a, b) not in seen:
                reg = []; s2 = [(a, b)]
                while s2:
                    q = s2.pop()
                    if q in seen or not (0 <= q[0] < w and 0 <= q[1] < h) or p[q][:3] != CELL:
                        continue
                    seen.add(q); reg.append(q); s2 += [(q[0] + 1, q[1]), (q[0] - 1, q[1]), (q[0], q[1] + 1), (q[0], q[1] - 1)]
                if effect or len(reg) >= GAP_MIN:
                    kill.update(reg)
                else:
                    kept.append([list(reg[0]), len(reg)])
    for q in kill:
        p[q] = (0, 0, 0, 0)
    outerKept = sum(1 for a in range(w) for b in range(h) if p[a, b][3] and p[a, b][:3] == OUTER)
    return im, {'keyedPixels': len(kill), 'keptSmallFillRegions': kept, 'outerColourKept': outerKept, 'outerOnBorderPath': outerBorder}


def stance_x(im):
    """Anchor X = centre of the opaque pixels in the lowest 6 opaque rows (feet + floor shadow)."""
    a = im.getchannel('A'); w, h = im.size; px = a.load()
    rows = [y for y in range(h) if any(px[x, y] for x in range(w))]
    xs = [x for y in rows[-6:] for x in range(w) if px[x, y]]
    return round(sum(xs) / len(xs)) if xs else w // 2


def muzzle(im, y0, y1):
    """Weapon muzzle = the forward-most opaque pixel between rows y0..y1 (measured on the cell; facing right)."""
    px = im.load(); best = None
    for y in range(y0, y1):
        for x in range(im.width - 1, -1, -1):
            if px[x, y][3]:
                if best is None or x > best[0]:
                    best = (x, y)
                break
    return list(best)


# Muzzle search bands (cell rows), measured from the enlarged contact sheet: the weapon arm row only.
MUZZLE_ROWS = {'aim1': (8, 22), 'aim2': (4, 20), 'fire0': (10, 22), 'fire2': (10, 24), 'airAim0': (6, 22)}


def main():
    raw = SRC.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == SHA, 'source hash changed'
    src = Image.open(SRC)
    assert src.size == (727, 1160) and src.mode == 'RGB' and src.getpixel((0, 0)) == OUTER
    src = src.convert('RGB')
    rects = detect(src)
    credit = [r for r in rects if r[0] >= 600]
    icons = [r for r in rects if r[0] < 46 and r[2] * r[3] < 600]
    cellsRaw = sorted([r for r in rects if 46 <= r[0] < 600], key=lambda r: (r[1] // 8, r[0]))
    assert len(credit) == 1 and list(credit[0][:4]) == CREDIT_PANEL, credit
    cells = []
    for name, by, kind, count in LAYOUT:
        band = [r for r in cellsRaw if abs(r[1] - by) <= 1]
        assert len(band) == count, (name, by, len(band), count)
        for k, (x, y, w, h, n) in enumerate(band):
            cells.append(dict(name=f'{name}{k}', rect=[x, y, w, h], kind=kind))
    assert len(cells) == len(cellsRaw) == 59, ('unaccounted cells', len(cellsRaw), len(cells))

    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    frames = {}
    for c in cells:
        x, y, w, h = c['rect']
        im, st = key_cell(src.crop((x, y, x + w, y + h)).convert('RGBA'), effect=c['kind'] == 'effect')
        c.update(st)
        c['bbox'] = list(im.getbbox() or (0, 0, 0, 0))
        c['opaquePixels'] = sum(1 for a in im.getdata() if a[3] > 0)
        if c['kind'] == 'body':
            c['anchor'] = [stance_x(im), h]
        elif c['name'].startswith('beam'):
            c['anchor'] = [c['bbox'][0], (c['bbox'][1] + c['bbox'][3]) // 2]
        else:
            c['anchor'] = [w // 2, h]
        if c['name'] in MUZZLE_ROWS:
            c['muzzle'] = muzzle(im, *MUZZLE_ROWS[c['name']])
        frames[c['name']] = im
        im.save(OUT / 'cells' / f"{c['name']}.png")
    by = {c['name']: c for c in cells}
    # The muzzle beam of fire0/fire1 is drawn ON the frame; for the pistol's own muzzle use aim1/aim2 (weapon only).

    # Action sequences (presentation names). Mapping rationale: docs/spd_yellow/MOVE_FRAME_MAP.md.
    run = [f'run{i}' for i in range(8)]
    seq = {
        'idle': ['ready0', 'ready1'], 'walk': run, 'run': run, 'walk_back': run[::-1], 'dash': ['run1'],
        'jump': ['jump0'], 'fall': ['jump1'], 'crouch': ['crouch0'], 'guard': ['guard0'],
        'hurt': ['fall0'], 'knockdown': ['fall0', 'fall1', 'fall2'], 'getup': ['fall3', 'fall4', 'ready0'],
        # ── melee normals ──
        'light': ['strike0', 'strike1'],                 # jab
        'yJ2': ['slash0', 'slash1'],                     # blade low draw -> forward thrust
        'yJ3': ['blade2', 'blade3'],                     # high thrust -> low slash
        'heavy': ['slash6', 'slash7', 'blade6'],         # raised blade -> cross -> back cut
        'yLow': ['crouch0', 'blade1'],                   # low set -> low draw (hits low)
        'up': ['strike0', 'strike2', 'strike3'],         # chamber -> HIGH kick (launcher) -> recover
        'air': ['airKick0', 'airKick1'], 'down_air': ['airKick1'],
        'yFlip': ['flip0'],                              # air Heavy: inverted aerial kick
        'yAcro': ['acro0', 'acro1', 'acro2', 'acro3', 'acro4'],   # Fwd+Heavy acrobatic leap kick (contact on acro3)
        'ySweep': ['slash2', 'slash3'],                  # Back+Heavy turning back-sweep cut
        'yBreak': ['blade4', 'slash1'],                  # PARTNER BREAK: overhead-ready -> forward thrust
        # ── firearms (weapon frames verified: fire0 vs fire2 = identical body, rows 9-28 weapon swap) ──
        'yPistol': ['aim0', 'aim1'],                     # draw -> compact pistol out (held here while Special is held)
        'yPistolShot': ['fire0', 'aim2'],                # pistol fires (supplied jagged muzzle beam) -> recoil tilt
        'yLongHold': ['fire2'],                          # LONG GUN braced (shown from the 24 f draw threshold)
        'yLongShot': ['fire1', 'fire2'],                 # big muzzle blast (weapon hidden by the flash) -> braced recovery
        'yAirShot': ['airAim0'],                         # airborne pistol
        # ── clone / coin orders / zord ──
        'yClone': ['blade0', 'ready0'],                  # split: guard cross -> ready
        'ySwap': ['blade0'],                             # swap cross-guard (body dissolves; streak FX drawn)
        'yStance': ['acro5'],                            # Tactical Coin command stance (low set, hand at belt)
        'yCall': ['blade5'],                             # raised blade: Ninja Intercept signal
        'grab': ['strike0', 'strike1'],
        'win': ['blade5', 'ready0'], 'intro': ['blade0', 'ready0'], 'lose': ['fall2'],
        'yBlinkRec': ['acro4'],                          # dash/teleport arrival readable recovery (landing set)
    }
    used = {n for v in seq.values() for n in v}
    # Supplied EFFECT cells are drawn by spdYellowFx.js (render-only), not as body strips:
    FX_USE = {'streak0': 'blink VANISH/launch phase (start) + swap vanish', 'streak1': 'blink TRAVEL/arrival phase + swap arrival',
              'beam0': 'muzzle star on every pistol / long-gun / Cover Me release', 'beam1': 'pistol bolt projectile art (incl. Cover Me, air pistol)',
              'beam2': 'long-gun beam projectile art (incl. ultimate brace)'}
    DUPES = {'slash4': 'pixel-identical to slash0 and blade1', 'slash5': 'pixel-identical to slash1', 'slash7': 'pixel-identical to blade0', 'slash6': 'pixel-identical to blade5'}
    for stale in OUT.glob('*.png'):
        if stale.stem not in seq and not stale.stem.startswith('fx_') and stale.stem != 'portrait':
            stale.unlink()
    anim = {}
    for action, names in seq.items():
        strip = Image.new('RGBA', (FW * len(names), FH))
        for i, n in enumerate(names):
            ax, ay = by[n]['anchor']
            strip.paste(frames[n], (FW * i + OX - ax, OY - ay), frames[n])
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/spd_yellow/{action}.png', 'frames': len(names), 'width': FW, 'height': FH,
                        'anchorY': 0, 'loop': action in ('idle', 'walk', 'run', 'walk_back', 'crouch', 'guard'),
                        'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': 8, 'frameWidth': FW, 'frameHeight': FH}
    # Muzzle anchors in STRIP space (relative to the origin, facing right): render + projectile spawn use these.
    muz = {n: [by[n]['muzzle'][0] - by[n]['anchor'][0], by[n]['muzzle'][1] - by[n]['anchor'][1]] for n in MUZZLE_ROWS}
    js = ('// Generated by tools/spd_yellow/extract.py — do not hand-edit.\nexport const SPD_YELLOW_ANIM = ' + json.dumps(anim, indent=2) +
          '\n// Weapon muzzle offsets from the sprite origin (px at source scale, facing right; y negative = up).\nexport const SPD_YELLOW_MUZZLE = ' +
          json.dumps(muz) + '\n')
    (ROOT / 'spdYellowSprites.js').write_text(js)

    # Portrait: helmet/shoulders of ready0, nearest-neighbour x5.
    hb = frames['ready0'].getbbox()
    frames['ready0'].crop((hb[0] + 2, 0, hb[0] + 22, 20)).resize((100, 100), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    # Supplied effect art (cropped to content, never redrawn).
    for n in ('beam0', 'beam1', 'beam2', 'streak0', 'streak1'):
        im = frames[n]; im.crop(im.getbbox()).save(OUT / f'fx_{n}.png')

    for c in cells:
        c['usedIn'] = sorted(a for a, v in seq.items() if c['name'] in v)
    meta = {'source': SRC.name, 'sha256': SHA, 'size': [727, 1160], 'mode': 'RGB', 'outerBackground': OUTER, 'cellBackground': CELL,
            'keyPolicy': f'cell-fill RGB{CELL} keyed when border-connected or in enclosed regions >= {GAP_MIN} px; outer RGB{OUTER} never keyed inside cells (suit/blade highlight)',
            'credit': 'ripped by the FRANKETE, for TSR (WANTED-poster credit panel, top right) — excluded from runtime', 'creditPanel': CREDIT_PANEL,
            'inputIcons': [list(r[:4]) for r in icons], 'inputIconNote': 'left-column controller glyphs — labels, not body art',
            'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY}, 'muzzle': muz,
            'frames': cells, 'sequences': seq, 'fxCells': FX_USE, 'pixelDuplicates': DUPES,
            'unusedCells': [c['name'] for c in cells if c['name'] not in used and c['name'] not in FX_USE]}
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'source_rects.json').write_text(json.dumps(meta, indent=2) + '\n')

    S = 3; colw = 72 * S + 12; rowh = 64 * S + 34; per = 8
    contact = Image.new('RGB', (per * colw, ((len(cells) + per - 1) // per) * rowh), (38, 43, 54)); d = ImageDraw.Draw(contact)
    for i, c in enumerate(cells):
        x = i % per * colw; y = i // per * rowh
        d.text((x + 4, y + 3), f"{c['name']} {c['rect'][0]},{c['rect'][1]}", fill='white')
        im = frames[c['name']]; big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        d.rectangle([x + 4, y + 18, x + 4 + big.width, y + 18 + big.height], outline=(90, 96, 110))
        contact.paste(big, (x + 4, y + 18), big)
        ax, ay = c['anchor']; cx, cy = x + 4 + ax * S, y + 18 + ay * S
        d.line([cx - 5, cy, cx + 5, cy], fill=(80, 255, 120)); d.line([cx, cy - 5, cx, cy], fill=(80, 255, 120))
        if 'muzzle' in c:
            mx, my = x + 4 + c['muzzle'][0] * S, y + 18 + c['muzzle'][1] * S
            d.ellipse([mx - 4, my - 4, mx + 4, my + 4], outline=(255, 60, 60))
    contact.save(DOC / 'contact_sheet.png')
    print('cells', len(cells), 'actions', len(seq), 'icons', len(icons), 'unused (all pixel duplicates?)', meta['unusedCells'], all(u in DUPES for u in meta['unusedCells']))
    print('muzzle', muz)
    print('kept small fill regions', {c['name']: c['keptSmallFillRegions'] for c in cells if c['keptSmallFillRegions']})
    print('outer kept', {c['name']: c['outerColourKept'] for c in cells if c['outerColourKept']})


if __name__ == '__main__':
    main()
