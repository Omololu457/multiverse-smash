"""MSV1-DINO: per-form portraits + the team portrait + the DRAGO CLONE strips (premade, nothing recoloured at runtime).

  assets/dt_<form>/portrait_large.png  (the sheet's own portrait, nearest-neighbour fit into 100x112, centred)
  assets/dt_<form>/portrait_small.png  (the same fit into 31x34 — the HUD / partner size the MSV1 Rangers use)
  assets/dinothunder/portrait_large.png / portrait_small.png  (the four portraits side by side, Red first)
  assets/dt_white/clone/<anim>.png     (the evil White Ranger clone: Trent's own strips, suit white → charcoal,
                                        gold trim → blood red, visor kept; a fixed per-colour map, alpha untouched)
Run: python3 tools/dino/portraits.py
"""
import os, glob
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = lambda *p: os.path.join(ROOT, 'assets', *p)
FORMS = {'dt_red': 'red', 'dt_blue': 'blue', 'dt_yellow': 'yellow', 'dt_white': 'white'}


def fit(im, w, h):
    k = min(w / im.width, h / im.height)
    nw, nh = max(1, round(im.width * k)), max(1, round(im.height * k))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(im.resize((nw, nh), Image.NEAREST), ((w - nw) // 2, h - nh))
    return out


def portraits():
    smalls = []
    for form, sheet in FORMS.items():
        src = Image.open(A('dinothunder', f'{sheet}_portrait.png')).convert('RGBA')
        fit(src, 100, 112).save(A(form, 'portrait_large.png'))
        s = fit(src, 31, 34); s.save(A(form, 'portrait_small.png')); smalls.append(src)
    team = Image.new('RGBA', (4 * 88, 112), (0, 0, 0, 0))
    for i, src in enumerate(smalls):
        team.paste(fit(src, 88, 104), (i * 88, 8))
    team.save(A('dinothunder', 'portrait_large.png'))
    fit(team, 62, 34).save(A('dinothunder', 'portrait_small.png'))


def clone_map(px):
    """white / light grey suit → charcoal; gold / yellow → blood red; black stays; everything else darkened 45 %."""
    r, g, b, a = px
    if a == 0: return px
    hi, lo = max(r, g, b), min(r, g, b)
    if hi < 40: return (r, g, b, a)                                   # outlines / visor black
    if hi - lo < 28:                                                    # neutral (the white suit, its grey shading)
        v = round(30 + hi * 0.30); return (v, v, v + 6, a)
    if r > 150 and g > 110 and b < 110:                                 # gold trim / Drago gold
        return (min(255, round(r * 0.85)), round(g * 0.12), round(b * 0.12), a)
    return (round(r * 0.55), round(g * 0.45), round(b * 0.5), a)


def clones():
    os.makedirs(A('dt_white', 'clone'), exist_ok=True)
    n = 0
    for p in sorted(glob.glob(A('dt_white', '*.png'))):
        name = os.path.basename(p)
        if name.startswith('portrait'): continue
        im = Image.open(p).convert('RGBA')
        im.putdata([clone_map(px) for px in im.getdata()])
        im.save(A('dt_white', 'clone', name)); n += 1
    return n


if __name__ == '__main__':
    portraits()
    print('portraits ok; clone strips', clones())
