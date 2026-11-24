#!/usr/bin/env python3
"""build_squad_skins.py — S.P.D. Rangers SQUAD THEMES: fill the gaps so every Ranger in the squad wears every theme.

A squad theme (spdSquadSkins.js) dresses all six Rangers alike and follows each ↓↓ swap. Each Ranger's OWN existing pack
is used wherever it has that theme (Blue/Green/Pink/Yellow "inspired" packs, Red's spdRedSkins, Omega's recolours). This
tool generates only the missing (Ranger × theme) sheets, with the same finite palette-map method as
tools/spd_blue/skins/build_inspired.py (same theme ramps, copied below):
  SUIT pixels  → theme suit ramp (6 steps) by luminance within that Ranger's suit family
  TRIM pixels  → theme trim ramp (3 steps) by luminance
  everything else (outline, shadows, visor, skin, effects outside the families) kept exactly; alpha + geometry untouched.
Families per Ranger:  red    suit = red hues (r>90, g<48, b<48)               trim = S.P.D. light greys
                      yellow suit = yellow hues (h 40–70°, s>.45, v>.45)        trim = S.P.D. light greys
                      omega  suit = neutral white/greys (s<.08, v≥.40)          trim = gold/orange (h 25–55°, s>.6)
Output: assets/spd_rangers/skins/<theme>/<form>/<sheet basename>.png. Usage (from the repo root):
  node tools/spd_squad/sheets.mjs | python3 -I tools/spd_squad/build_squad_skins.py .
"""
import colorsys, json, os, sys
from PIL import Image
ROOT = sys.argv[1]
THEMES = {
  'heatblast':   {'suit': [(70, 10, 0), (110, 22, 4), (150, 40, 6), (195, 70, 10), (230, 110, 20), (255, 150, 40)], 'trim': [(200, 140, 20), (245, 200, 50), (255, 245, 150)]},
  'diamondhead': {'suit': [(8, 60, 50), (14, 88, 72), (24, 118, 96), (44, 156, 128), (76, 196, 162), (120, 228, 196)], 'trim': [(150, 170, 165), (205, 225, 218), (240, 255, 248)]},
  'upgrade':     {'suit': [(4, 6, 4), (8, 11, 8), (12, 16, 12), (17, 22, 17), (23, 30, 23), (31, 40, 31)], 'trim': [(30, 150, 60), (70, 215, 100), (150, 255, 170)]},
  'shadow':      {'suit': [(6, 6, 12), (12, 12, 20), (19, 19, 30), (28, 28, 42), (38, 38, 56), (50, 50, 72)], 'trim': [(150, 118, 40), (205, 170, 70), (245, 220, 130)]},
}
LIGHT = {(148, 148, 140), (198, 198, 181), (247, 255, 231)}
def hsv(c): return colorsys.rgb_to_hsv(*(v / 255 for v in c))
def fam_red(c):
    if c[0] > 90 and c[1] < 48 and c[2] < 48: return 'suit'
    if c in LIGHT: return 'trim'
def fam_yellow(c):
    h, s, v = hsv(c)
    if 40 / 360 <= h <= 70 / 360 and s > .45 and v > .45: return 'suit'
    if c in LIGHT: return 'trim'
def fam_omega(c):
    h, s, v = hsv(c)
    if s < .08 and v >= .40: return 'suit'
    if 25 / 360 <= h <= 55 / 360 and s > .6 and v > .45: return 'trim'
# the gaps: (form, theme) pairs the Ranger's own packs don't have
GAPS = {'spd_red': (fam_red, ['heatblast', 'diamondhead', 'upgrade']), 'omega_ranger': (fam_omega, ['heatblast', 'diamondhead', 'upgrade']),
        'spd_yellow': (fam_yellow, ['shadow'])}
lum = lambda c: .299 * c[0] + .587 * c[1] + .114 * c[2]
def ramp_index(L, lo, hi, n):
    return 0 if hi <= lo else max(0, min(n - 1, round((L - lo) / (hi - lo) * (n - 1))))
sheets = json.loads(sys.stdin.read())   # {form: [sheet paths]} — node prints it from the roster (see the usage line in spdSquadSkins.js)
audit = {}
for form, (fam, themes) in GAPS.items():
    files = [p[2:] if p.startswith('./') else p for p in sheets[form]]; files = sorted(set(files))
    imgs = {p: Image.open(os.path.join(ROOT, p)).convert('RGBA') for p in files}
    # one luminance range per family over ALL this Ranger's base sheets (so every sheet maps the same colour the same way)
    rng = {}
    for im in imgs.values():
        for (r, g, b, a) in set(im.getdata()):
            if not a: continue
            k = fam((r, g, b))
            if k: lo, hi = rng.get(k, (999, -1)); L = lum((r, g, b)); rng[k] = (min(lo, L), max(hi, L))
    for th in themes:
        T = THEMES[th]; out_dir = os.path.join(ROOT, 'assets', 'spd_rangers', 'skins', th, form); os.makedirs(out_dir, exist_ok=True)
        lut = {}
        for p, im in imgs.items():
            px = im.load(); out = im.copy(); po = out.load(); W, H = im.size; changed = 0
            for y in range(H):
                for x in range(W):
                    r, g, b, a = px[x, y]
                    if not a: continue
                    c = (r, g, b)
                    if c not in lut:
                        k = fam(c)
                        if k:
                            ramp = T[k]; lo, hi = rng[k]; lut[c] = ramp[ramp_index(lum(c), lo, hi, len(ramp))]
                        else: lut[c] = None
                    m = lut[c]
                    if m: po[x, y] = (*m, a); changed += 1
            out.save(os.path.join(out_dir, os.path.basename(p)))
            audit.setdefault(f'{th}/{form}', {})[os.path.basename(p)] = changed
        print(th, form, len(imgs), 'sheets')
json.dump({'ranges': {}, 'pixelsChanged': audit}, open(os.path.join(ROOT, 'assets', 'spd_rangers', 'skins', 'audit.json'), 'w'), indent=1)
