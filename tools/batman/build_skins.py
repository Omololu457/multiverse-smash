#!/usr/bin/env python3
"""Batman skins: PRECOMPUTED palette interpretations of the extracted atlases (assets/batman/{body,fleet,portrait}.png)
and of the reused Krybot explosion strip. Every output pixel keeps its source alpha and position (zero geometry change,
no logos, no new shapes); only colours change, through a per-unique-colour lookup (cached by construction).

Regions (classified per unique colour, audited in docs/batman/skin_regions.json):
  BODY  outline (pure black / near-black) -> kept · suit ramp (low-saturation blue-grey) -> SUIT · deepest cape shade
        (8,16,24) + (32,40,56) -> CAPE · gold / orange belt + emblem -> ACCENT · brown leather -> ACCENT (darkened) ·
        skin tones -> kept · neutral greys / white (gadget metal, eyes) -> METAL (eye white kept)
  FLEET hull blues / greys -> HULL · magenta / crimson panels -> HULL2 · orange / amber lights -> FLAME ·
        cyan energy -> GLOW · white / near-black -> kept
  EXPLOSION  orange / yellow fire -> FLAME ramp; white core and black smoke kept
Lightness is remapped by shifting the region's mean lightness to the target's lightness (ramp contrast preserved).
Usage: build_skins.py   (writes assets/batman/skins/<tag>/*, batmanSkinTable.js, docs/batman/skins_contact.png)"""
import colorsys, json, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = os.path.join(ROOT, 'assets', 'batman')
EXPLOSION = os.path.join(ROOT, 'assets', 'krybot', 'explosion.png')

# tag, id, name, classification, crossover, inspiration, colours
SKINS = [
  ('blue_crusader', 'Blue Crusader', None, 'Original design: classic grey suit, royal-blue cape and cowl, bright yellow belt; fleet in grey with blue panels.',
   dict(suit=(150, 152, 162), cape=(38, 58, 140), accent=(250, 210, 40), metal=(170, 170, 180), hull=(130, 136, 150), hull2=(40, 70, 170), flame=(255, 200, 60), glow=(120, 200, 255)),
   ['#f0c830', '#ffe890'], ['#bfe4ff', '#78b8ff', '#e8c040'], ['#8c96a8', '#5c6678']),
  ('gotham_beyond', 'Gotham Beyond', 'Batman Beyond', 'Colour scheme inspired by the Batman Beyond era: matte black suit and fleet with red accents.',
   dict(suit=(52, 52, 60), cape=(16, 16, 20), accent=(210, 30, 36), metal=(90, 90, 100), hull=(40, 40, 46), hull2=(200, 28, 36), flame=(255, 60, 50), glow=(255, 70, 70)),
   ['#e03030', '#ff9a90'], ['#ff8a80', '#ff3a30', '#c02020'], ['#2c2c32', '#46464e']),
  ('white_knight', 'White Knight', None, 'Original design: pearl-white suit, pale steel cape, gold trim; white-and-gold fleet. Black outlines keep it readable.',
   dict(suit=(222, 226, 232), cape=(150, 160, 178), accent=(232, 186, 60), metal=(210, 214, 222), hull=(220, 222, 228), hull2=(220, 176, 70), flame=(255, 214, 110), glow=(255, 236, 170)),
   ['#e8c050', '#fff6d8'], ['#fff8e0', '#f0d890', '#c8a850'], ['#e4e6ec', '#c4c8d2']),
  ('arkham_bronze', 'Arkham Bronze', None, 'Original design: bronze armour tones, dark umber cape, amber lights.',
   dict(suit=(132, 98, 62), cape=(52, 36, 24), accent=(240, 160, 50), metal=(160, 130, 96), hull=(120, 92, 62), hull2=(170, 110, 50), flame=(255, 170, 60), glow=(255, 200, 120)),
   ['#e0a040', '#ffd8a0'], ['#ffe0b0', '#f0a848', '#a87038'], ['#7a6a58', '#5a4c3e']),
  ('red_rain', 'Red Rain', None, 'Original design: deep crimson suit, black-red cape, bone-white accents.',
   dict(suit=(118, 22, 32), cape=(40, 8, 14), accent=(232, 222, 206), metal=(180, 170, 160), hull=(96, 20, 28), hull2=(40, 10, 16), flame=(255, 70, 50), glow=(255, 120, 110)),
   ['#d02a30', '#f4e6d4'], ['#ffd0c8', '#e83a3a', '#e8dccc'], ['#4a1418', '#6a2028']),
  ('alienx_cosmic_knight', 'Alien X Cosmic Knight', 'Ben 10 — Alien X', 'Colour scheme inspired by Alien X: void-black suit and fleet with starlight-white and pale-cyan accents (palette only; no starfield overlay).',
   dict(suit=(40, 40, 66), cape=(8, 8, 16), accent=(236, 240, 255), metal=(200, 210, 240), hull=(28, 28, 44), hull2=(220, 226, 255), flame=(180, 220, 255), glow=(240, 246, 255)),
   ['#e8eeff', '#9ad0ff'], ['#ffffff', '#c8e4ff', '#8ab8f0'], ['#1c1c2c', '#3a3a58']),
  ('upgrade_wayne_systems', 'Upgrade Wayne Systems', 'Ben 10 — Upgrade', 'Colour scheme inspired by Upgrade: black techno suit and fleet with circuit-green accents.',
   dict(suit=(46, 52, 50), cape=(12, 14, 14), accent=(60, 230, 100), metal=(70, 80, 76), hull=(30, 32, 32), hull2=(50, 210, 90), flame=(120, 255, 140), glow=(110, 255, 150)),
   ['#40e070', '#b8ffc8'], ['#c8ffd8', '#50f088', '#2aa058'], ['#1e2422', '#34403a']),
  ('cursed_midnight', 'Cursed Midnight', 'Jujutsu Kaisen — cursed energy', 'Colour scheme inspired by cursed-energy glow: midnight-violet suit, black-violet cape, electric-blue accents.',
   dict(suit=(66, 34, 98), cape=(22, 10, 36), accent=(110, 120, 255), metal=(120, 100, 160), hull=(58, 32, 86), hull2=(100, 110, 255), flame=(150, 120, 255), glow=(140, 170, 255)),
   ['#7a80ff', '#d0c8ff'], ['#e0dcff', '#8a90ff', '#6040c0'], ['#3a2050', '#583474']),
  ('glacier_stealth', 'Glacier Stealth', None, 'Original design: ice-blue suit, slate cape, frost-white accents; arctic fleet.',
   dict(suit=(150, 196, 226), cape=(52, 76, 104), accent=(230, 248, 255), metal=(190, 214, 230), hull=(156, 192, 216), hull2=(70, 120, 170), flame=(150, 230, 255), glow=(200, 245, 255)),
   ['#9ae0ff', '#effcff'], ['#f0fcff', '#a8e4ff', '#5c98c8'], ['#c4dcec', '#90b4cc']),
  ('gilded_eclipse', 'Gilded Eclipse', None, 'Original design: eclipse-black suit and cape with polished gold trim; black-and-gold fleet.',
   dict(suit=(50, 44, 34), cape=(12, 10, 8), accent=(255, 200, 40), metal=(200, 160, 60), hull=(32, 28, 22), hull2=(230, 180, 40), flame=(255, 210, 80), glow=(255, 226, 120)),
   ['#ffc828', '#fff0a8'], ['#fff4c0', '#ffd040', '#b08820'], ['#28241e', '#463c2c']),
]

def hls(c): return colorsys.rgb_to_hls(*(v / 255 for v in c))
def rgb(h, l, s): return tuple(max(0, min(255, round(v * 255))) for v in colorsys.hls_to_rgb(h, max(0, min(1, l)), max(0, min(1, s))))

def body_region(c):
  r, g, b = c; h, l, s = hls(c); mx = max(c)
  if mx < 6: return 'keep'                                  # pure outline
  if c in ((8, 16, 24), (8, 24, 24), (32, 40, 56), (33, 41, 57)): return 'cape'
  if c == (255, 255, 255) or c == (255, 255, 206): return 'keep'   # eye whites / highlights
  if r > 180 and g > 80 and b > 60 and r - b < 140 and (g < 210 or b > 150) and not (b < 60 and g > 130): return 'keep'  # skin tones
  if r > 200 and g >= 120 and b < 80: return 'accent'       # gold / amber belt + emblem
  if r >= 70 and g < r * 0.65 and b < 30: return 'accent_dark'   # brown leather
  if s < 0.12: return 'metal'
  if b >= r: return 'suit'
  return 'keep'

def fleet_region(c):
  r, g, b = c; h, l, s = hls(c); mx = max(c)
  if mx < 22 or (l > 0.96): return 'keep'
  deg = h * 360
  if s > 0.35 and 160 <= deg <= 200 and l > 0.45: return 'glow'
  if s > 0.35 and (deg < 45 or deg > 345) and r > 150 and g > 60: return 'flame'
  if s > 0.25 and (280 <= deg <= 350 or deg < 12): return 'hull2'
  return 'hull'

def explosion_region(c):
  r, g, b = c; h, l, s = hls(c)
  if max(c) < 40 or l > 0.93 or s < 0.2: return 'keep'
  return 'flame'

def build_map(colors, classify, targets, counts):
  # region mean lightness (pixel weighted), then shift each colour's lightness by (target L - region mean L)
  acc = {}
  for c, n in counts.items():
    reg = classify(c)
    if reg == 'keep': continue
    acc.setdefault(reg, [0, 0])[0] += hls(c)[1] * n; acc[reg][1] += n
  mean = {k: v[0] / max(1, v[1]) for k, v in acc.items()}
  out, regions = {}, {}
  for c in colors:
    reg = classify(c); regions[c] = reg
    if reg == 'keep': out[c] = c; continue
    key = 'accent' if reg == 'accent_dark' else reg
    t = targets[key]; th, tl, ts = hls(t); _, l, s = hls(c)
    if reg == 'accent_dark': tl *= 0.55
    nl = l + (tl - mean[reg]) * (0.9 if reg != 'cape' else 1.0)
    ns = ts if s > 0.05 or ts < 0.1 else ts * 0.6
    out[c] = rgb(th, nl, ns)
  return out, regions

def recolor(im, classify, targets):
  px = im.load(); w, h = im.size; counts = {}
  for y in range(h):
    for x in range(w):
      p = px[x, y]
      if p[3]: counts[p[:3]] = counts.get(p[:3], 0) + 1
  mp, regions = build_map(list(counts), classify, targets, counts)
  o = im.copy(); q = o.load()
  for y in range(h):
    for x in range(w):
      p = px[x, y]
      if p[3]: q[x, y] = mp[p[:3]] + (p[3],)
  return o, regions, counts

def main():
  src = {n: Image.open(os.path.join(A, f'{n}.png')).convert('RGBA') for n in ('body', 'fleet', 'portrait')}
  exp = Image.open(EXPLOSION).convert('RGBA')
  table, audit = [], {}
  for tag, name, cross, insp, T, hud, fx, smoke in SKINS:
    d = os.path.join(A, 'skins', tag); os.makedirs(d, exist_ok=True)
    targets = dict(T); targets['accent'] = T['accent']
    b, breg, bc = recolor(src['body'], body_region, targets); b.save(os.path.join(d, 'body.png'), optimize=True)
    p, _, _ = recolor(src['portrait'], body_region, targets); p.save(os.path.join(d, 'portrait.png'), optimize=True)
    ft = dict(hull=T['hull'], hull2=T['hull2'], flame=T['flame'], glow=T['glow'])
    f, freg, fc = recolor(src['fleet'], fleet_region, ft); f.save(os.path.join(d, 'fleet.png'), optimize=True)
    e, _, _ = recolor(exp, explosion_region, dict(flame=T['flame'])); e.save(os.path.join(d, 'explosion.png'), optimize=True)
    if not audit:
      audit = {'body': {('#%02x%02x%02x' % c): [r, bc[c]] for c, r in sorted(breg.items(), key=lambda kv: -bc[kv[0]])},
               'fleet': {('#%02x%02x%02x' % c): [r, fc[c]] for c, r in sorted(freg.items(), key=lambda kv: -fc[kv[0]])[:80]}}
    table.append(dict(id='bm_' + tag, tag=tag, name=name, classification='Inspired Colour Scheme' if cross else 'Original Custom Palette',
                      crossover=cross, inspiration=insp, hud=hud, fx=fx, smoke=smoke))
  with open(os.path.join(ROOT, 'batmanSkinTable.js'), 'w') as fh:
    fh.write('// Generated by tools/batman/build_skins.py — do not hand-edit.\nexport const BATMAN_SKIN_TABLE = ' + json.dumps(table, indent=1, ensure_ascii=False) + '\n')
  os.makedirs(os.path.join(ROOT, 'docs', 'batman'), exist_ok=True)
  with open(os.path.join(ROOT, 'docs', 'batman', 'skin_regions.json'), 'w') as fh: json.dump(audit, fh, indent=1)
  contact(table)
  print('skins', len(table))

def crop(im, sy, w, h, i=0): return im.crop((i * w, sy, i * w + w, sy + h))
def contact(table):
  import importlib.util, re
  js = open(os.path.join(ROOT, 'batmanSprites.js')).read()
  def grab(name, block):
    m = re.search(r'"%s":\s*\{([^}]*)\}' % name, block); kv = dict(re.findall(r'"(\w+)":\s*("[^"]*"|[-\d.]+|true|false)', m.group(1)))
    return {k: (v.strip('"') if v.startswith('"') else (float(v) if v[0] in '-0123456789' else v)) for k, v in kv.items()}
  body_cells = [grab(k, js) for k in ('idle', 'heavy', 'bGrapnel', 'cmdAuto')]
  fl = js[js.index('BATMAN_FLEET_CELLS'):]
  fleet_cells = [grab(k, fl) for k in ('bomber_walk', 'inter_fwd', 'carrier_hover', 'heli_idle', 'plane_drop', 'auto_a1')]
  rows = [('default', None)] + [(t['name'], t['tag']) for t in table]
  CW, RH = 1180, 150
  sheet = Image.new('RGBA', (CW, RH * len(rows) + 10), (40, 44, 52, 255)); dr = ImageDraw.Draw(sheet)
  for ri, (name, tag) in enumerate(rows):
    base = os.path.join(A, 'skins', tag) if tag else A
    b = Image.open(os.path.join(base, 'body.png')).convert('RGBA'); f = Image.open(os.path.join(base, 'fleet.png')).convert('RGBA')
    e = Image.open(os.path.join(base, 'explosion.png') if tag else EXPLOSION).convert('RGBA')
    y0 = ri * RH + 8; x = 150; dr.text((8, y0 + 60), name, fill=(240, 240, 240))
    for c in body_cells:
      im = crop(b, int(c['sourceY']), int(c['width']), int(c['height'])).resize((int(c['width'] * 1.4), int(c['height'] * 1.4)), Image.NEAREST)
      sheet.alpha_composite(im, (x, y0)); x += im.width + 6
    for c in fleet_cells:
      im = crop(f, int(c['sourceY']), int(c['width']), int(c['height'])); k = min(1.0, 120 / im.height, 150 / im.width)
      im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.NEAREST); sheet.alpha_composite(im, (x, y0)); x += im.width + 6
    ex = e.crop((128, 0, 192, 64)).resize((96, 96), Image.NEAREST); sheet.alpha_composite(ex, (min(CW - 100, x), y0))
  sheet.convert('RGB').save(os.path.join(ROOT, 'docs', 'batman', 'skins_contact.png'), optimize=True)

main()
