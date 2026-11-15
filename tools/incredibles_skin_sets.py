"""Shared Ranger-style skin palettes for the Incredibles family (Violet, Dash, Elastigirl).

These mirror the best-received Power Rangers skin sets (Alien X, Upgrade, Diamondhead, Heatblast, Chromastone,
Ghostfreak, Big Chill, S.P.D. Shadow, Dragon Shield, Starlight Glitter) as colour schemes on each Parr's unchanged
pixels. Each builder maps its own regions onto these roles:

  suit    3-step ramp (light, mid, shade) replacing the red supersuit
  trim    the black gloves / boots / trunks fill
  trimHi  the blue sheen / rim on that trim
  accent  3-step ramp for Elastigirl's gold belt / emblem lines (None = keep the gold)
  ring    a render colour for FX that follow the skin (Violet's force field, Elastigirl's arm line)
  stars   optional sparkle palette BAKED into suit pixels (deterministic hash, no runtime overlay). Baking keeps the
          stars inside the body, so Violet's invisibility and Dash's body-hide still hide them — the shared
          game.js Alien X starfield is bbox-drawn and would give them away, which is why these ids never end "AlienX".
Cosmetic only. Deterministic. No geometry, logo or stat change.
"""

SETS = [
    dict(tag='alienx', name='Alien X — Cosmic', insp='Ben 10 Alien X / S.P.D. Green "Alien X — Inspired": charcoal suit, white trim, baked galaxy',
         suit=[(52, 58, 62), (34, 38, 42), (18, 20, 24)], trim=(232, 236, 240), trimHi=(255, 255, 255),
         accent=[(236, 240, 244), (196, 202, 210), (150, 156, 166)], ring='#c79bff',
         stars=[(255, 255, 255), (255, 255, 255), (143, 217, 255), (199, 155, 255), (255, 155, 208), (255, 224, 138)], density=0.07),
    dict(tag='upgrade', name='Upgrade — Circuit', insp='Ben 10 Upgrade: black suit, glowing green trim',
         suit=[(44, 44, 50), (28, 28, 34), (14, 14, 18)], trim=(56, 224, 92), trimHi=(176, 255, 176),
         accent=[(160, 255, 170), (60, 224, 96), (24, 150, 60)], ring='#3ce05c'),
    dict(tag='diamondhead', name='Diamondhead — Crystal', insp='Ben 10 Diamondhead: teal crystal suit, pale trim',
         suit=[(104, 226, 214), (52, 176, 176), (26, 114, 124)], trim=(214, 252, 250), trimHi=(255, 255, 255),
         accent=[(200, 255, 255), (120, 230, 240), (60, 170, 190)], ring='#5ce8e0'),
    dict(tag='heatblast', name='Heatblast — Magma', insp='Ben 10 Heatblast: volcanic rock suit, molten orange trim',
         suit=[(96, 64, 54), (64, 42, 36), (38, 24, 22)], trim=(255, 118, 24), trimHi=(255, 214, 92),
         accent=[(255, 230, 120), (255, 160, 40), (210, 80, 20)], ring='#ff7a18'),
    dict(tag='chromastone', name='Chromastone — Prism', insp='Ben 10 Chromastone: violet crystal suit, prism-pink trim',
         suit=[(160, 78, 210), (116, 46, 166), (74, 24, 114)], trim=(255, 150, 232), trimHi=(255, 224, 250),
         accent=[(255, 240, 150), (255, 190, 90), (220, 120, 60)], ring='#e070ff'),
    dict(tag='ghostfreak', name='Ghostfreak — Phantom', insp='Ben 10 Ghostfreak: pale spectral suit, dark violet trim',
         suit=[(228, 228, 236), (186, 186, 200), (140, 140, 158)], trim=(56, 30, 76), trimHi=(132, 84, 172),
         accent=[(180, 130, 220), (130, 80, 180), (80, 44, 120)], ring='#9a62d0'),
    dict(tag='bigchill', name='Big Chill — Frost', insp='Ben 10 Big Chill: deep-blue suit, icy cyan trim',
         suit=[(44, 86, 178), (28, 60, 136), (16, 38, 94)], trim=(140, 230, 255), trimHi=(232, 250, 255),
         accent=[(232, 250, 255), (150, 220, 250), (90, 170, 220)], ring='#8ce6ff'),
    dict(tag='shadow', name='S.P.D. Shadow — Inspired', insp='Power Rangers S.P.D. Shadow Ranger colour scheme: navy suit, silver trim',
         suit=[(58, 66, 104), (38, 44, 76), (22, 26, 50)], trim=(192, 198, 210), trimHi=(242, 244, 250),
         accent=[(242, 244, 250), (192, 198, 210), (130, 136, 150)], ring='#c0c8dc'),
    dict(tag='dragon', name='Dragon Shield — Inspired', insp='Mighty Morphin Green Ranger colour scheme: green suit, gold trim',
         suit=[(44, 176, 84), (28, 134, 60), (14, 92, 40)], trim=(232, 190, 40), trimHi=(255, 238, 140),
         accent=[(255, 238, 140), (232, 190, 40), (170, 126, 20)], ring='#e8be28'),
    dict(tag='glitter', name='Starlight Glitter', insp='S.P.D. Yellow "Starlight Glitter": hot-pink suit, gold trim, baked sparkles',
         suit=[(250, 112, 192), (216, 70, 152), (160, 40, 112)], trim=(255, 214, 80), trimHi=(255, 248, 200),
         accent=[(255, 248, 200), (255, 214, 80), (200, 150, 40)], ring='#ff70c0',
         stars=[(255, 255, 255), (255, 240, 160), (255, 214, 80)], density=0.06),
]


def hexc(c):
    return '#%02x%02x%02x' % c


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _hash(x, y):
    h = (x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995
    h = (h ^ (h >> 13)) * 0x5bd1e995 & 0xffffffff
    return (h ^ (h >> 15)) & 0xffffffff


def bake_stars(img, spec, frame_w=None):
    """Sprinkle deterministic star pixels onto pixels painted with this skin's suit ramp. Returns count."""
    pal = spec.get('stars')
    if not pal:
        return 0
    suit = set(spec['suit']); dens = int(spec.get('density', 0.06) * 10000)
    px = img.load(); W, H = img.size; n = 0
    for y in range(H):
        for x in range(W):
            p = px[x, y]
            if not p[3] or p[:3] not in suit:
                continue
            lx = x % frame_w if frame_w else x            # frame-local → same star layout on every frame
            h = _hash(lx, y)
            if h % 10000 < dens:
                px[x, y] = pal[(h >> 16) % len(pal)] + (p[3],); n += 1
    return n
