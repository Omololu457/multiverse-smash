#!/usr/bin/env python3
"""Green Ranger (green_ranger) extraction from the supplied Supaman2525 custom sheet.

SOURCE (read-only, hash-checked, never written):
  mmpr_green_ranger_custom_sprite_sheet_by_supaman2525_d65abhs.png
  462x2133 RGBA, every pixel alpha 255. The blue background is OPAQUE RGB(0,162,232).
  (The brief's reference size is 443x2048. The repository copy is the only copy on disk and measures
  462x2133; the owner approved building from it on 2026-11-14. See docs/green_ranger/SPRITE_LEDGER.md.)

BACKGROUND POLICY: only pixels EXACTLY equal to RGB(0,162,232) are removed. No tolerance, no hue keying.
  The near colour RGB(0,170,238) (156 px, inside the decorative morpher illustration) is kept.
  216 key-coloured regions are fully enclosed by artwork (gaps between limbs, ring gaps in the flute circles,
  bow-string gaps, the inside of the Tommy HUD box). They are removed like the rest of the background and are
  listed in source_rects.json -> enclosedKeyRegions so every ambiguous region is documented.

FRAMES ARE COMPONENT UNIONS. Every 8-connected opaque component is assigned to exactly one named cell (or one
non-animation group: credit / hud / portrait / illustration / reserved). Detached trail pieces and specks are listed
with the pose they belong to. The script asserts no component is unassigned or assigned twice.

EFFECT SPLITS: two energy shapes are attached to the hand in the authored cast poses. They are separated by
COLOUR (the energy palette below never occurs in the suit), not by a rectangle:
  - pulseShot  = energy-palette pixels of cast1 (the flame shot)   -> Emerald Pulse projectile
  - pulseDisc  = energy-palette pixels of castDisc (the oval disc)  -> the note-empowered second shot
Nearest-neighbour only. Run once; outputs are cached PNGs + greenRangerSprites.js.

Usage: python3 tools/green_ranger/extract.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/green_ranger'
OUT = ROOT / 'assets/green_ranger'
SRC = ROOT / 'mmpr_green_ranger_custom_sprite_sheet_by_supaman2525_d65abhs.png'
SHA = '87b9be3454776e5bc13edaab43d7493e0d3c12a9c642ef2261b69958cac7af20'
SIZE = (462, 2133)
KEY = (0, 162, 232)
# Transcribed from the credit panel at (4,2046) (enlarged inspection; line breaks as drawn, spelling as drawn):
CREDIT_TEXT = ('Green Ranger From Mighty Morphin PowerRangers / Sprites Edit By Supaman2525 / '
               'Credit Goes to belial the hegehog / Please Give Credit when used.')

FW, FH, OX, OY = 240, 160, 110, 146     # strip frame box + body origin (feet)

# name: component top-left corners (x, y). Names describe the OBSERVED pose (enlarged inspection).
CELLS = {
    # band A (y29-130): civilian Tommy + morph (intro only)
    'tommyArms': [(1, 47)], 'tommyChest': [(71, 47)], 'tommyRaiseGlow': [(112, 29)], 'tommyRaise': [(165, 29)],
    'morphFlash': [(210, 29)], 'morphSuit': [(265, 29)],
    # band B (y130-215): helmeted overhead with shield flash, arms wide, flex, ready
    'shieldFlash': [(6, 130)], 'shieldSet': [(61, 130)], 'armsWide': [(109, 142)], 'flex': [(190, 140)], 'ready': [(237, 142)],
    # band C (y229-305): upper-body arm extensions
    'extendWide': [(0, 233)], 'guardCross': [(74, 231)], 'highGuard': [(134, 229)], 'lowHook': [(186, 236)], 'lungeReach': [(248, 234)],
    # band D: three compact ready poses
    'idle0': [(3, 334)], 'idle1': [(45, 334)], 'idle2': [(88, 334)],
    # band E: six stepping poses / band F: six running poses
    'walk0': [(3, 412)], 'walk1': [(49, 411)], 'walk2': [(92, 412)], 'walk3': [(122, 413)], 'walk4': [(166, 412)], 'walk5': [(203, 412)],
    'run0': [(2, 490)], 'run1': [(46, 488)], 'run2': [(102, 491)], 'run3': [(138, 490)], 'run4': [(189, 489)], 'run5': [(251, 492)],
    # band G: crouch, rising reach, airborne poses, three tumble balls
    'crouch0': [(4, 573)], 'rise0': [(48, 563)], 'rise1': [(92, 568)], 'air0': [(149, 570)], 'air1': [(198, 568)], 'diveLean': [(245, 574)],
    'ball0': [(298, 577)], 'ball1': [(335, 575)], 'ball2': [(382, 572)],
    # band H: crouch-set, rising knee kick (+1 px trail speck), high kick arc, flying kick, crescent heel, roundhouse follow
    'set0': [(11, 686)], 'riseKnee': [(62, 654), (98, 708)], 'kickArc': [(115, 658)], 'flyKick': [(182, 662)], 'crescentHeel': [(262, 650)],
    'roundhouse': [(329, 661)],
    # band I: grounded punch sequence
    'punchChamber': [(5, 746)], 'punchStraight': [(58, 746)], 'punchWind': [(126, 743)], 'punchGuard': [(183, 742)], 'punchLunge': [(239, 748)],
    # band J: kick sequence (high kick carries a detached 8x8 green swoosh)
    'kickStance0': [(6, 831)], 'kickTurn': [(63, 831)], 'kickSpin': [(111, 825)], 'kickHigh': [(175, 828), (204, 846)], 'kickLow': [(240, 827)],
    'kickStance1': [(299, 829)],
    # band K: Dragon Dagger blade sequences (the 38x50 crescent at (116,913) is bladeThrust's trail; (239,1129) is bladeBack's)
    'bladeLow': [(7, 919)], 'bladeThrust': [(69, 911), (116, 913)], 'bladeAirTrail': [(165, 903)], 'bladeAir': [(255, 903)],
    'bladeRise': [(2, 1022)], 'bladeRaise': [(89, 1007)], 'bladeCut': [(172, 1039)], 'bladeHold': [(303, 1040)],
    'bladeOver': [(12, 1114)], 'bladeSwing': [(57, 1124)], 'bladeFollow': [(130, 1120)], 'bladeBack': [(179, 1121), (239, 1129)],
    'daggerThrust': [(280, 1124)],
    # band L: arms raised, cast with oval disc, cast with flame shot, cast, three ring effects
    'armsRaised': [(9, 1208)], 'castDisc': [(68, 1211)], 'cast1': [(148, 1219)], 'cast0': [(251, 1218)],
    'ringDark': [(319, 1214)], 'ringBurst': [(371, 1215)], 'ringDarkGreen': [(421, 1216)],
    # band M: acrobatics (cartwheel kick carries a detached 23x16 trail at (117,1302))
    'tumbleDive': [(14, 1299)], 'cartwheelKick': [(68, 1292), (117, 1302)], 'handstandKick': [(157, 1287)], 'horizDive': [(227, 1299)],
    'sideKick': [(321, 1293)],
    # band N1: leaps / flips
    'leapOpen': [(13, 1381)], 'leapFwd': [(72, 1387)], 'leapDive': [(133, 1383)], 'leapUp': [(211, 1367)], 'flip0': [(263, 1369)],
    'flip1': [(328, 1368)], 'flipTuck': [(387, 1382)],
    # band N2: grab / guard / push, forward fall, tumble
    'grabReach': [(6, 1463)], 'guardArms': [(125, 1463)], 'pushBoth': [(64, 1464)], 'fallForward': [(175, 1479)], 'tumbleHit': [(234, 1519)],
    # band N3: flinch, recoil, fall back, launched fall, prone, seated get-up
    'hitHigh': [(63, 1542)], 'hitLow': [(13, 1547)], 'fallBack': [(107, 1547)], 'fallAir': [(162, 1549)], 'prone': [(228, 1574)],
    'seated': [(306, 1551)],
    # band P: flute pose + three call circles (inner rings / centre dots are separate components)
    'flute': [(44, 1757)],
    'callCircle0': [(105, 1771), (119, 1782), (122, 1785)], 'callCircle1': [(152, 1768), (163, 1783), (166, 1786)],
    'callCircle2': [(206, 1770), (217, 1785), (220, 1788)],
}
# Non-animation groups (every remaining component). RESERVED = Pink Ranger bow / arrow frames (future Pink fighter).
GROUPS = {
    'reservedPink': [(12, 1656), (71, 1651), (147, 1646), (220, 1646), (289, 1664), (110, 1710)],
    'portraitPhoto': [(151, 1870)],                 # helmet photo -> selection portrait
    'illustration': [(247, 1830)],                  # Green + Dragon Dagger illustration -> ultimate cut-in
    'tommyPanel': [(6, 1874), (37, 1882), (10, 1952), (34, 1961), (48, 1961), (64, 1963), (82, 1966), (75, 1967), (42, 1939)],
    'hud': [(130, 1937), (187, 1937), (129, 1954), (129, 1974), (124, 2003), (151, 2003), (170, 2003), (181, 2003), (192, 2003),
            (211, 2003), (239, 2003), (258, 2003), (269, 2003), (280, 2003)],
    'morpher': [(306, 1927)],
    'credit': [(4, 2046)],
}
# Energy palette (the cast effects / flute circles / burst ring). Measured: none of these colours occur in any suit pixel.
ENERGY = {(222, 246, 156), (48, 224, 144), (32, 200, 48), (153, 237, 11), (183, 243, 78), (214, 248, 153), (248, 248, 248),
          (160, 248, 248), (56, 168, 88), (32, 136, 56)}
# Suit / outline colours used for anchors (never trails, never FX).
SUIT = {(41, 65, 0), (8, 32, 0), (57, 106, 0), (41, 123, 0), (32, 32, 32), (0, 0, 0), (160, 128, 32), (224, 192, 32)}
AIRBORNE = {'rise0', 'rise1', 'air0', 'air1', 'ball0', 'ball1', 'ball2', 'riseKnee', 'kickArc', 'flyKick', 'bladeAirTrail', 'bladeAir',
            'tumbleDive', 'cartwheelKick', 'handstandKick', 'horizDive', 'sideKick', 'leapOpen', 'leapFwd', 'leapDive', 'leapUp',
            'flip0', 'flip1', 'flipTuck', 'tumbleHit', 'fallAir', 'crescentHeel'}
INTRO_ONLY = {'tommyArms', 'tommyChest', 'tommyRaiseGlow', 'tommyRaise', 'morphFlash', 'morphSuit', 'shieldFlash', 'shieldSet'}

# Action strips (engine animation names) -> ordered cells. Rationale: docs/green_ranger/MOVE_FRAME_MAP.md.
SEQ = {
    'idle': ['idle0', 'idle1', 'idle2', 'idle1'], 'walk': ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5'],
    'walk_back': ['walk5', 'walk4', 'walk3', 'walk2', 'walk1', 'walk0'], 'run': ['run0', 'run1', 'run2', 'run3', 'run4', 'run5'],
    'dash': ['run4'], 'jump': ['rise0', 'rise1', 'ball0', 'ball1', 'ball2'], 'fall': ['air1'], 'crouch': ['crouch0'],
    'guard': ['guardArms'], 'hurt': ['hitHigh'], 'hurt2': ['hitLow'], 'hurt_air': ['tumbleHit'],
    'knockdown': ['fallBack', 'fallAir', 'prone'], 'getup': ['seated', 'set0', 'ready'], 'stagger': ['hitLow'], 'launched': ['fallAir'],
    # J1 / J2 / J3 (fresh Light retaps)
    'light': ['punchChamber', 'punchStraight'], 'gJ2': ['guardCross', 'lowHook'], 'gJ3': ['kickSpin', 'roundhouse'],
    # Heavy, Low, Launcher, Air
    'heavy': ['kickTurn', 'kickHigh', 'kickStance1'], 'gLow': ['kickStance0', 'kickLow'], 'up': ['set0', 'crescentHeel'],
    'air': ['air0', 'flyKick'], 'down_air': ['sideKick'],
    # Forward+Heavy command chain: advancing punch -> Heavy blade strike -> knock-away slash
    'gAdv': ['lungeReach', 'punchLunge'], 'gBlade': ['bladeOver', 'bladeThrust'], 'gAway': ['bladeBack', 'bladeHold'],
    # specials
    'gEdge': ['bladeRaise', 'bladeCut', 'bladeHold'],
    'gAdvance': ['bladeOver', 'bladeSwing', 'bladeFollow'], 'gAdvanceN': ['bladeOver', 'bladeSwing', 'bladeRise'],
    'gTalon': ['set0', 'riseKnee', 'kickArc', 'tumbleDive'],
    'gPulse': ['armsRaised', 'castDisc', 'cast0'],
    'gFang': ['bladeAir', 'bladeAirTrail'],
    'gCall': ['ready', 'flute'],
    'grab': ['grabReach', 'pushBoth'],
    # ultimate call (flute -> signal) and the beats Green holds during the sequence
    'gUlt': ['flute', 'armsRaised'], 'ultWatch': ['ready', 'armsWide'], 'ultSignal': ['flex'],
    # presentation
    'intro': ['tommyArms', 'tommyChest', 'tommyRaise', 'tommyRaiseGlow', 'morphFlash', 'morphSuit', 'shieldFlash', 'shieldSet', 'armsWide', 'ready'],
    'win': ['flex'], 'win_alt': ['armsWide'], 'lose': ['fallBack', 'fallAir', 'prone'],
}
STRIP_LOOP = {'idle', 'walk', 'walk_back', 'run', 'crouch', 'guard'}
FX = {'pulseShot': 'cast1', 'pulseDisc': 'castDisc'}        # colour-split energy effects
FX_CELLS = ['ringBurst', 'callCircle0', 'callCircle1', 'callCircle2']   # independent effect cells used as-is
REASONS = {   # unused / reserved cells: why
    'ringDark': 'reserved — black-cored ring with orange sparks; ambiguous (not treated as a portal), no kit use',
    'ringDarkGreen': 'reserved — black-cored ring with green sparks; ambiguous (not treated as a portal), no kit use',
    'bladeLow': 'unused — low blade slash; the kit\'s Low is the kick sweep (no low blade normal in the brief)',
    'daggerThrust': 'unused — backhand dagger thrust; Emerald Advance uses the authored swing sequence',
    'cartwheelKick': 'unused — cartwheel kick; no move in the brief fits a cartwheel (air normal = flying kick)',
    'handstandKick': 'unused — handstand kick; no move in the brief fits',
    'horizDive': 'unused — horizontal dive; dash uses a run frame (no dodge move in the kit)',
    'leapOpen': 'unused — forward leap; one jump, jump strip uses the rise + tumble poses',
    'leapFwd': 'unused — forward leap variant', 'leapDive': 'unused — diving leap', 'leapUp': 'unused — arms-up leap',
    'flip0': 'unused — flip (Green has one jump; no doubleJump strip)', 'flip1': 'unused — flip', 'flipTuck': 'unused — tuck',
    'fallForward': 'unused — forward fall; ambiguous between a lunge and a pushed fall',
    'diveLean': 'unused — forward lean from the jump band', 'extendWide': 'unused — wide arm extension (J1 uses the straight punch)',
    'highGuard': 'unused — raised-arm guard variant', 'punchWind': 'unused — punch wind-up (J1 starts from the chamber pose)',
    'punchGuard': 'unused — guard between punches',
    'cast1': 'used — flame shot split off as pulseShot; its body is a duplicate of cast0',
}


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def shab(b): return hashlib.sha256(b).hexdigest()


def label():
    im = Image.open(SRC)
    assert im.size == SIZE and im.mode == 'RGBA', (im.size, im.mode)
    rgb = np.array(im.convert('RGB'))
    assert tuple(rgb[0, 0]) == KEY
    key = (rgb[:, :, 0] == KEY[0]) & (rgb[:, :, 1] == KEY[1]) & (rgb[:, :, 2] == KEY[2])
    lab, n = ndimage.label(~key, structure=np.ones((3, 3)))
    comps = {}
    for i, sl in enumerate(ndimage.find_objects(lab)):
        ys, xs = sl
        comps[(xs.start, ys.start)] = (i + 1, xs.start, ys.start, xs.stop - xs.start, ys.stop - ys.start)
    # enclosed key regions (documented, removed like the rest of the background)
    bg, _ = ndimage.label(key)
    border = set(np.unique(np.concatenate([bg[0], bg[-1], bg[:, 0], bg[:, -1]]))) - {0}
    enc = key & ~np.isin(bg, list(border))
    el, en = ndimage.label(enc)
    encl = []
    for i, sl in enumerate(ndimage.find_objects(el)):
        ys, xs = sl
        encl.append([int(xs.start), int(ys.start), int(xs.stop - xs.start), int(ys.stop - ys.start), int((el[sl] == i + 1).sum())])
    return im, rgb, key, lab, comps, encl


def cut(im, lab, comps, parts):
    ids = [comps[p][0] for p in parts]
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rgba = np.array(im)[y0:y1, x0:x1].copy()
    rgba[~m[y0:y1, x0:x1]] = 0
    return rgba, [int(x0), int(y0), int(x1 - x0), int(y1 - y0)], m[y0:y1, x0:x1]


def colour_mask(rgba, cols):
    c = rgba[:, :, :3]
    m = np.zeros(c.shape[:2], bool)
    for col in cols:
        m |= (c[:, :, 0] == col[0]) & (c[:, :, 1] == col[1]) & (c[:, :, 2] == col[2])
    return m & (rgba[:, :, 3] > 0)


def body_anchor(name, rgba):
    suit = colour_mask(rgba, SUIT)
    ys, xs = np.where(suit)
    if name in AIRBORNE:
        return [int(round((xs.min() + xs.max()) / 2)), int(ys.max() + 1)]
    bottom = ys.max()
    # planted feet: the lowest 6 rows of the WHOLE body (boots are grey: use every opaque non-energy pixel near the
    # bottom of the suit box, never trail pixels outside the suit's horizontal extent)
    sel = ys >= bottom - 5
    return [int(round(xs[sel].mean())), int(bottom + 1)]


def check_all_assigned(comps):
    used = [p for v in CELLS.values() for p in v] + [p for v in GROUPS.values() for p in v]
    assert len(used) == len(set(used)), 'a component is assigned twice'
    missing, extra = set(comps) - set(used), set(used) - set(comps)
    assert not missing and not extra, ('unassigned', sorted(missing), 'unknown', sorted(extra))


def contact(cells, frames, path, S=3, per=8, title=''):
    colw = min(max(c['rect'][2] for c in cells), 120) * S + 14
    rowh = max(c['rect'][3] for c in cells) * S + 34
    rows = (len(cells) + per - 1) // per
    img = Image.new('RGB', (per * colw, rows * rowh + 24), (38, 43, 54))
    d = ImageDraw.Draw(img)
    d.text((6, 6), title, fill='white')
    for i, c in enumerate(cells):
        x = i % per * colw; y = 24 + i // per * rowh
        d.text((x + 4, y + 3), f"#{i} {c['name']} {c['rect']} [{c['status'].split(' ')[0]}]", fill='white')
        im = frames[c['name']]
        big = im.resize((im.width * S, im.height * S), Image.Resampling.NEAREST)
        bg = Image.new('RGB', big.size, (92, 128, 104) if i % 2 else (72, 92, 128))
        bg.paste(big, (0, 0), big)
        img.paste(bg.crop((0, 0, min(bg.width, colw - 8), bg.height)), (x + 4, y + 18))
        if c.get('anchor'):
            ax, ay = c['anchor']
            cx, cy = x + 4 + ax * S, y + 18 + ay * S
            d.line([cx - 6, cy, cx + 6, cy], fill=(255, 60, 60)); d.line([cx, cy - 6, cx, cy + 6], fill=(255, 60, 60))
    img.save(path)


def main():
    assert sha(SRC) == SHA, 'Green sheet hash changed'
    im, rgb, key, lab, comps, encl = label()
    check_all_assigned(comps)
    (OUT / 'cells').mkdir(parents=True, exist_ok=True)
    frames, cells, hashes = {}, [], {}
    used = {n for v in SEQ.values() for n in v} | set(FX_CELLS) | set(FX.values())
    for name, parts in CELLS.items():
        rgba, rect, mask = cut(im, lab, comps, parts)
        if name in FX.values():   # the body cell keeps only the non-energy pixels; the energy part becomes its own FX cell
            fx = colour_mask(rgba, ENERGY)
            body = rgba.copy(); body[fx] = 0
            fxa = rgba.copy(); fxa[~fx] = 0
            fys, fxs = np.where(fx)
            fxa = fxa[fys.min():fys.max() + 1, fxs.min():fxs.max() + 1]
            fname = [k for k, v in FX.items() if v == name][0]
            Image.fromarray(fxa, 'RGBA').save(OUT / 'cells' / f'{fname}.png')
            frames[fname] = Image.fromarray(fxa, 'RGBA')
            cells.append(dict(name=fname, rect=[rect[0] + int(fxs.min()), rect[1] + int(fys.min()), int(fxs.max() - fxs.min() + 1), int(fys.max() - fys.min() + 1)],
                              parts=[list(p) for p in parts], anchor=[int(fxa.shape[1] // 2), int(fxa.shape[0] // 2)], kind='fx',
                              split='energy-palette pixels of ' + name, opaquePixels=int(fx.sum()),
                              status='independent FX — ' + ('Emerald Pulse projectile' if fname == 'pulseShot' else 'note-empowered second Pulse shot')))
            rgba = body
        img = Image.fromarray(rgba, 'RGBA')
        frames[name] = img
        img.save(OUT / 'cells' / f'{name}.png')
        kind = 'fx' if name in FX_CELLS or name.startswith('ring') else 'body'
        anc = body_anchor(name, rgba) if kind == 'body' else [rgba.shape[1] // 2, rgba.shape[0] // 2]
        if name in REASONS: status = REASONS[name]
        elif name in FX_CELLS: status = 'independent FX — ' + ('Dragon Edge note follow-up burst' if name == 'ringBurst' else 'Dragon Call circle (3-frame cycle)')
        elif name in INTRO_ONLY: status = 'used — intro morph only'
        elif name in used: status = 'used'
        else: status = 'unused — no mapping'
        cells.append(dict(name=name, rect=rect, parts=[list(p) for p in parts], anchor=anc, opaquePixels=int((rgba[:, :, 3] > 0).sum()),
                          kind=kind, status=status, facing='right' if kind == 'body' else 'n/a',
                          sha256=shab((OUT / 'cells' / f'{name}.png').read_bytes())))
    for c in cells:
        if 'sha256' not in c: c['sha256'] = shab((OUT / 'cells' / f"{c['name']}.png").read_bytes())
        c['usedIn'] = sorted(k for k, v in SEQ.items() if c['name'] in v)
    # duplicates (pixel-identical)
    dup = {}
    names = list(frames)
    for i, a in enumerate(names):
        for b in names[:i]:
            if frames[a].size == frames[b].size and frames[a].tobytes() == frames[b].tobytes(): dup[a] = b
    # body of cast1 == cast0 ?
    groups = {}
    for g, parts in GROUPS.items():
        rgba, rect, mask = cut(im, lab, comps, parts)
        Image.fromarray(rgba, 'RGBA').save(OUT / 'cells' / f'_{g}.png')
        groups[g] = dict(rect=rect, parts=[list(p) for p in parts], status={'reservedPink': 'reserved — Pink Ranger bow/arrow frames for a future Pink fighter; never Green\'s assist or ultimate',
            'portraitPhoto': 'used — selection portrait (helmet photo)', 'illustration': 'used — ultimate cut-in illustration',
            'tommyPanel': 'unused — decorative Tommy status panel (no civilian selectable form)', 'hud': 'unused — sheet HUD bars/coins/name plate (the game HUD is used)',
            'morpher': 'unused — decorative Power Morpher illustration', 'credit': 'credit — attribution only, never animation'}[g],
            sha256=shab((OUT / 'cells' / f'_{g}.png').read_bytes()))
    by = {c['name']: c for c in cells}
    anim = {}
    for action, seq in SEQ.items():
        strip = Image.new('RGBA', (FW * len(seq), FH))
        for i, n in enumerate(seq):
            ax, ay = by[n]['anchor']
            px, py = OX - ax, OY - ay
            assert px >= 0 and px + frames[n].width <= FW and py >= 0 and py + frames[n].height <= FH, ('frame overflow', action, n, px, py, frames[n].size)
            strip.paste(frames[n], (FW * i + px, py))
        strip.save(OUT / f'{action}.png')
        anim[action] = {'sheet': f'./assets/green_ranger/{action}.png', 'frames': len(seq), 'width': FW, 'height': FH, 'anchorY': 0,
                        'loop': action in STRIP_LOOP, 'lockLastFrame': True, 'originX': OX, 'originY': OY, 'speed': 8,
                        'frameWidth': FW, 'frameHeight': FH}
    # FX cells (render-only): native size, centre anchor
    fx = {n: {'src': f'./assets/green_ranger/cells/{n}.png', 'w': frames[n].width, 'h': frames[n].height} for n in ['pulseShot', 'pulseDisc'] + FX_CELLS}
    # portrait: the supplied helmet photo (66x66) x2 nearest-neighbour; cut-in: the supplied illustration x2
    pr = Image.open(OUT / 'cells' / '_portraitPhoto.png')
    pr.resize((pr.width * 2, pr.height * 2), Image.Resampling.NEAREST).save(OUT / 'portrait.png')
    il = Image.open(OUT / 'cells' / '_illustration.png')
    il.resize((il.width * 2, il.height * 2), Image.Resampling.NEAREST).save(OUT / 'cutin.png')
    Image.open(OUT / 'cells' / '_credit.png').save(OUT / 'credit_panel.png')
    (ROOT / 'greenRangerSprites.js').write_text('// Generated by tools/green_ranger/extract.py — do not hand-edit.\n'
        'export const GREEN_RANGER_ANIM = ' + json.dumps(anim, indent=1) + '\n'
        'export const GREEN_RANGER_FX = ' + json.dumps(fx, indent=1) + '\n'
        "export const GREEN_RANGER_PORTRAIT = './assets/green_ranger/portrait.png'\nexport const GREEN_RANGER_CUTIN = './assets/green_ranger/cutin.png'\n")
    DOC.mkdir(parents=True, exist_ok=True)
    derived = {p.name: shab(p.read_bytes()) for p in sorted(OUT.glob('*.png'))}
    (DOC / 'source_rects.json').write_text(json.dumps({
        'source': SRC.name, 'sha256': SHA, 'size': list(SIZE), 'mode': 'RGBA', 'topLeft': list(KEY), 'alpha': 'all 255 (opaque background)',
        'briefReferenceSize': [443, 2048], 'sizeNote': 'repository copy is 462x2133 (only copy on disk); owner approved 2026-11-14',
        'keyPolicy': 'exact RGB(0,162,232) only; no tolerance', 'nearKeyKept': {'rgb': [0, 170, 238], 'pixels': 156, 'where': 'morpher illustration'},
        'credit': CREDIT_TEXT, 'creditPanel': groups['credit']['rect'],
        'frame': {'width': FW, 'height': FH, 'originX': OX, 'originY': OY},
        'cells': cells, 'groups': groups, 'sequences': SEQ, 'duplicates': dup, 'enclosedKeyRegions': encl,
        'derivedStripSha256': derived}, indent=1) + '\n')
    allc = cells
    contact(allc, frames, DOC / 'contact_sheet.png', title='Green Ranger (green_ranger) — numbered cells [status]; red cross = body anchor (feet)')
    print(json.dumps(dict(cells=len(cells), components=len(comps), enclosed=len(encl), duplicates=dup,
                          unused=[c['name'] for c in cells if c['status'].startswith('unused')]), indent=1))


if __name__ == '__main__':
    main()
