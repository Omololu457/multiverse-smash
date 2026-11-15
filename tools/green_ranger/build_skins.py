#!/usr/bin/env python3
"""Green Ranger skins: PRECOMPUTED region-mask recolours (run once; the game never recolours the body at runtime).

Palette hexes come from greenRangerSkinTable.js (parsed here, so the JS table is the single source of truth).
Region masks (per pixel, per frame) — never a global hue shift (the sheet has real blue / cyan / grey details):
  suit      the eight greens of the suit ramp (helmet, bodysuit, boot diamonds) + three grey-greens
  shield    the Dragon Shield golds / yellows
  outline   the darkest structural greys (0..32) and the visor black — ALWAYS preserved
  trim      mid / light greys INSIDE the body (gloves, boots, belt, mouthpiece): within 3 px of a suit/shield/outline pixel
  blade     greys OUTSIDE the body next to a dark outline (Dragon Dagger metal): kept metallic, 35% toward trim
  trail     bright greys OUTSIDE the body, not touching an outline (authored blade / kick trails) -> effect ramp
  energy    the energy palette (Pulse shot / disc, burst ring, flute circles) -> effect ramp, near-white core kept
  skinTone  Tommy's skin / hair colours -> NEVER recoloured (never takes cloth colours)
  tommy     civilian intro frames: only the green shirt follows the suit ramp; trousers / hair / skin unchanged
Not separable cleanly (documented in docs/green_ranger/SKINS.md): the Dragon Dagger's grey blade vs. the grey glove
where they overlap in a few blade frames (the 3 px body rule assigns those pixels to trim).
Usage: python3 tools/green_ranger/build_skins.py
"""
from pathlib import Path
import re, json, hashlib, colorsys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets/green_ranger'
DOC = ROOT / 'docs/green_ranger'
FW = 240
SUIT = [(8, 32, 0), (24, 65, 0), (41, 65, 0), (57, 106, 0), (41, 123, 0), (41, 156, 0), (65, 189, 0), (82, 205, 0), (16, 40, 24), (48, 64, 48), (88, 104, 88)]
SHIELD = [(152, 96, 0), (160, 128, 32), (180, 123, 49), (208, 168, 0), (213, 205, 41), (224, 192, 32), (255, 180, 24), (230, 230, 57), (248, 232, 0), (255, 246, 172), (148, 131, 90)]
OUTLINE = [(0, 0, 0), (16, 24, 24), (24, 24, 24), (32, 32, 32)]
GREYS = [(41, 41, 41), (56, 56, 56), (65, 65, 65), (96, 96, 96), (106, 106, 106), (123, 123, 123), (128, 128, 128), (156, 156, 156), (160, 160, 160), (160, 160, 164),
         (189, 189, 189), (192, 192, 192), (213, 213, 213), (224, 224, 224), (246, 246, 246), (255, 255, 255)]
SKIN = [(238, 156, 123), (189, 90, 57), (255, 205, 189), (148, 65, 24), (90, 32, 0), (72, 32, 8), (255, 230, 238), (255, 205, 213), (255, 251, 240)]
GEM = [(128, 0, 0), (255, 0, 0)]
ENERGY = [(222, 246, 156), (48, 224, 144), (32, 200, 48), (153, 237, 11), (183, 243, 78), (214, 248, 153), (248, 248, 248), (160, 248, 248), (56, 168, 88), (32, 136, 56)]
CIVILIAN = {('intro', 0), ('intro', 1), ('intro', 2), ('intro', 3)}


def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def lum(c): return (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255
def mix(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def ramp(base, levels, light=0.45, dark=0.45):
    """Map a source ramp (sorted by luminance) onto shades of `base`: darkest → base darkened, ~30% → base,
    brightest → base mixed toward white. Keeps the authored shading ORDER (no flattening)."""
    srt = sorted(levels, key=lum); n = len(srt); out = {}
    lo, hi = mix(base, (0, 0, 0), dark), mix(base, (255, 255, 255), light)
    for i, c in enumerate(srt):
        t = i / max(1, n - 1)
        out[c] = mix(lo, base, t / 0.3) if t < 0.3 else mix(base, hi, (t - 0.3) / 0.7)
    return out


def parse_table():
    js = (ROOT / 'greenRangerSkinTable.js').read_text()
    rows = re.findall(r"D\('([^']+)', '([^']+)', '([^']+)', '([^']+)', '(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})'", js)
    assert len(rows) == 10, len(rows)
    return [dict(id=r[0], tag=r[1], name=r[2], source=r[3], suit=r[4], shield=r[5], trim=r[6], effect=r[7]) for r in rows]


def cmask(rgb, cols):
    m = np.zeros(rgb.shape[:2], bool)
    for c in cols: m |= (rgb[:, :, 0] == c[0]) & (rgb[:, :, 1] == c[1]) & (rgb[:, :, 2] == c[2])
    return m


def regions(rgba, civilian=False):
    rgb, a = rgba[:, :, :3], rgba[:, :, 3] > 0
    suit, shield, outline = cmask(rgb, SUIT) & a, cmask(rgb, SHIELD) & a, cmask(rgb, OUTLINE) & a
    grey, skin, energy, gem = cmask(rgb, GREYS) & a, cmask(rgb, SKIN) & a, cmask(rgb, ENERGY) & a, cmask(rgb, GEM) & a
    core = ndimage.binary_dilation(suit | shield | outline | skin, iterations=3)
    darkn = ndimage.binary_dilation(outline | cmask(rgb, [(41, 41, 41), (65, 65, 65)]) | gem, structure=np.ones((3, 3)))
    trim = grey & core
    blade = grey & ~core & darkn
    trail = grey & ~core & ~darkn
    if civilian: trim[:] = False; blade[:] = False; trail[:] = False; shield[:] = False
    return dict(suit=suit, shield=shield, outline=outline, trim=trim, blade=blade, trail=trail, energy=energy, skinTone=skin, gem=gem)


def recolour(rgba, sk, civilian=False, stars=False, rim=None, seed=0):
    out = rgba.copy(); R = regions(rgba, civilian)
    rgb = rgba[:, :, :3]
    maps = [('suit', ramp(hx(sk['suit']), SUIT, light=0.5 if lum(hx(sk['suit'])) < 0.15 else 0.4)),
            ('shield', ramp(hx(sk['shield']), SHIELD, light=0.5)),
            ('trim', ramp(hx(sk['trim']), GREYS, light=0.6)),
            ('trail', ramp(hx(sk['effect']), GREYS, light=0.55, dark=0.2)),
            ('energy', ramp(hx(sk['effect']), ENERGY, light=0.6, dark=0.2))]
    for reg, mp in maps:
        m = R[reg]
        for src, dst in mp.items():
            sel = m & cmask(rgb, [src])
            if reg == 'energy' and lum(src) > 0.93: continue          # shared white core stays white
            out[sel, :3] = dst
    bl = ramp(hx(sk['trim']), GREYS, light=0.6)
    for src in GREYS:   # blade: keep the metal, 35% toward the trim ramp
        sel = R['blade'] & cmask(rgb, [src]); out[sel, :3] = mix(src, bl[src], 0.35)
    if stars:   # sparse 1-2 px stars on SUIT pixels only (never skin, face, outlines); deterministic per frame
        ys, xs = np.where(R['suit'])
        for i in range(len(ys)):
            h = (int(xs[i]) * 73856093 ^ int(ys[i]) * 19349663 ^ seed * 83492791) & 0xffff
            if h % 97 == 0: out[ys[i], xs[i], :3] = (232, 236, 255)
    if rim:     # Ten Shadows contrast pass: the outermost silhouette pixels get a pale rim
        a = rgba[:, :, 3] > 0
        edge = a & ~ndimage.binary_erosion(a, structure=np.ones((3, 3)))
        out[edge & R['outline'], :3] = hx(rim)
    return out, R


def hue_recolour(rgba, sk):
    """Portrait photo / cut-in illustration: photographic colours, so regions are by HUE (greens → suit, yellows → shield)."""
    out = rgba.copy().astype(float); h, w = rgba.shape[:2]
    suit, shield = hx(sk['suit']), hx(sk['shield'])
    for y in range(h):
        for x in range(w):
            r, g, b, a = rgba[y, x]
            if not a: continue
            hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if ss < 0.25 or ll < 0.06 or ll > 0.94: continue
            if 0.2 <= hh <= 0.45: tgt = suit
            elif 0.1 <= hh < 0.2: tgt = shield
            else: continue
            th, tl, ts = colorsys.rgb_to_hls(*(c / 255 for c in tgt))
            nl = min(0.92, max(0.04, tl + (ll - 0.4) * 0.9))
            out[y, x, :3] = [v * 255 for v in colorsys.hls_to_rgb(th, nl, max(ts, 0.15) if ts > 0.05 else ts)]
    return out.astype(np.uint8)


def main():
    skins = parse_table()
    js = (ROOT / 'greenRangerSkinTable.js').read_text()
    assert 'stars: true' in js and "rim: '#c9d6f2'" in js   # the table's starfield / ten-shadows flags
    extra = {sk['tag']: {'stars': sk['tag'] == 'starfield', 'rim': '#c9d6f2' if sk['tag'] == 'shadows' else None} for sk in skins}
    strips = sorted(p for p in A.glob('*.png') if p.stem not in ('portrait', 'cutin', 'credit_panel'))
    fx = ['pulseShot', 'pulseDisc', 'ringBurst', 'callCircle0', 'callCircle1', 'callCircle2']
    report = {'skins': [], 'regionPixels': {}}
    for sk in skins:
        tag, ex = sk['tag'], extra[sk['tag']]
        d = A / 'skins' / tag; (d / 'cells').mkdir(parents=True, exist_ok=True)
        for p in strips:
            im = np.array(Image.open(p).convert('RGBA')); out = im.copy(); n = im.shape[1] // FW
            for i in range(n):
                fr = im[:, i * FW:(i + 1) * FW]
                o, R = recolour(fr, sk, civilian=(p.stem, i) in CIVILIAN, stars=ex['stars'], rim=ex['rim'], seed=i)
                out[:, i * FW:(i + 1) * FW] = o
                if tag == skins[0]['tag']:
                    for k, m in R.items(): report['regionPixels'][k] = report['regionPixels'].get(k, 0) + int(m.sum())
            Image.fromarray(out, 'RGBA').save(d / p.name)
        for n in fx:
            im = np.array(Image.open(A / 'cells' / f'{n}.png').convert('RGBA'))
            o, _ = recolour(im, sk); Image.fromarray(o, 'RGBA').save(d / 'cells' / f'{n}.png')
        Image.fromarray(hue_recolour(np.array(Image.open(A / 'portrait.png').convert('RGBA')), sk), 'RGBA').save(d / 'portrait.png')
        Image.fromarray(hue_recolour(np.array(Image.open(A / 'cutin.png').convert('RGBA')), sk), 'RGBA').save(d / 'cutin.png')
        report['skins'].append({**sk, **ex, 'files': len(list(d.glob('*.png'))) + len(list((d / 'cells').glob('*.png'))),
                                'sha256_idle': hashlib.sha256((d / 'idle.png').read_bytes()).hexdigest()})
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'skins_build.json').write_text(json.dumps(report, indent=1) + '\n')
    contact(skins)
    print(json.dumps({'skins': len(skins), 'regionPixels(first skin)': report['regionPixels']}, indent=1))


GLYPH = {'note': 'note', 'starfield': 'star4', 'omnitrix': 'hexagon', 'xlr8': 'chevron2', 'heatblast': 'flame', 'cursed': 'shard', 'limitless': 'ringDot',
         'shrine': 'slash3', 'shadows': 'crescent', 'resonance': 'diamond', 'heavenly': 'bracket'}


def glyph(d, kind, x, y, r, solid, col):
    import math
    pts = {'star4': [(0, -1), (.28, -.28), (1, 0), (.28, .28), (0, 1), (-.28, .28), (-1, 0), (-.28, -.28)],
           'hexagon': [(math.cos(i * math.pi / 3), math.sin(i * math.pi / 3)) for i in range(6)],
           'chevron2': [(-1, -.8), (-.2, 0), (-1, .8), (-.6, .8), (.2, 0), (-.6, -.8)], 'flame': [(0, -1), (.7, .2), (.4, .8), (0, 1), (-.4, .8), (-.7, .2)],
           'shard': [(0, -1), (.55, -.1), (.15, 1), (-.5, .2)], 'diamond': [(0, -1), (.75, 0), (0, 1), (-.75, 0)],
           'bracket': [(-.8, -1), (.2, -1), (.2, -.6), (-.4, -.6), (-.4, .6), (.2, .6), (.2, 1), (-.8, 1)],
           'slash3': [(-.95, 1), (-.45, -1), (-.2, -1), (-.7, 1), (-.95, 1), (-.25, 1), (.25, -1), (.5, -1), (0, 1), (-.25, 1), (.45, 1), (.95, -1), (1.2, -1), (.7, 1)], 'note': [(-.6, .2), (.2, .2), (.2, -1), (.7, -.6), (.3, -.5), (.3, .8), (-.6, .8)]}
    if kind in ('ringDot', 'crescent'):
        box = [x - r, y - r, x + r, y + r]
        if solid: d.ellipse(box, fill=col, outline=(0, 0, 0))
        else: d.ellipse(box, outline=col, width=2)
        d.ellipse([x - r * .35, y - r * .35, x + r * .35, y + r * .35], fill=(40, 40, 40) if kind == 'ringDot' else None) if kind == 'ringDot' else d.ellipse([x - r * .2, y - r, x + r * 1.4, y + r * .8], fill=(38, 43, 54))
        return
    P = [(x + a * r, y + b * r) for a, b in pts[kind]]
    if solid: d.polygon(P, fill=col, outline=(0, 0, 0))
    else: d.polygon(P, outline=col, width=2)


def contact(skins):
    looks = [dict(tag=None, name='DEFAULT', effect='#5fe08a', suit='#296b00')] + skins
    cols = [('idle', 0), ('gEdge', 1), ('air', 1), ('gCall', 1), ('hurt', 0)]
    S, cw, ch = 1, 225, 150
    W = 230 + cw * len(cols) + 180; H = 40 + ch * len(looks)
    img = Image.new('RGB', (W, H), (38, 43, 54)); d = ImageDraw.Draw(img)
    d.text((8, 8), 'Green Ranger — default + 10 inspired/custom skins: idle · blade (Dragon Edge cut) · air kick · flute call · hurt · Falconzord tint · note glyph pair (slot1 outline / slot2 solid)', fill='white')
    zord = Image.open(ROOT / 'assets/power_rangers/falconzord/cells/fly0.png').convert('RGBA')
    for r, lk in enumerate(looks):
        y = 40 + r * ch
        d.text((8, y + 60), lk['name'], fill='white'); d.text((8, y + 76), (lk.get('source') or 'supplied palette')[:30], fill=(170, 180, 190))
        base = A if not lk['tag'] else A / 'skins' / lk['tag']
        for c, (act, i) in enumerate(cols):
            st = Image.open(base / f'{act}.png').convert('RGBA'); fr = st.crop((i * FW, 0, (i + 1) * FW, 160))
            fr = fr.crop((40, 40, 220, 155)).resize((216, 138), Image.Resampling.NEAREST)
            img.paste(fr, (230 + c * cw, y + 6), fr)
        zx = 230 + cw * len(cols)
        z = np.array(zord);
        if lk['tag']:
            t = hx(lk['effect']); a = z[:, :, 3] > 0; l = (z[:, :, 0] * .3 + z[:, :, 1] * .59 + z[:, :, 2] * .11) / 255
            k = np.where(l < .5, 2 * l, 1)[..., None]; w = np.where(l < .5, 0, (l - .5) * 2)[..., None]
            z = z.copy(); z[:, :, :3] = np.where(a[..., None], np.clip(np.array(t) * k * (1 - w) + 255 * w, 0, 255), z[:, :, :3]).astype(np.uint8)
        zi = Image.fromarray(z, 'RGBA').resize((96, 94), Image.Resampling.NEAREST); img.paste(zi, (zx, y + 10), zi)
        col = hx(lk['effect']); g = GLYPH[lk['tag'] or 'note']
        glyph(d, g, zx + 120, y + 60, 12, False, col); glyph(d, g, zx + 155, y + 60, 12, True, col)
    img.save(DOC / 'skins_contact.png')


if __name__ == '__main__':
    main()
