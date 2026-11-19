#!/usr/bin/env python3
"""write_theme_docs.py: docs/ben10/skins/THEMES.md + docs/ben10/skins/<set>_REGIONS.md for Ben's 20 cosmetic themes.

Reads the ONE registry (benThemes.js) and the regional maps (benThemeRegions.js) through node (no copy of any colour here),
then measures every body strip of each set: which share of opaque pixels each rule claims, and the colours left as drawn.
Deterministic.   USAGE: python3 tools/ben10/write_theme_docs.py
"""
import os, re, glob, json, colorsys, subprocess
from collections import Counter
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
J = json.loads(subprocess.check_output(["node", "-e", 'Promise.all([import("./benThemes.js"),import("./benThemeRegions.js")]).then(([a,b])=>console.log(JSON.stringify({T:a.BEN_THEMES,R:b.BEN_THEME_REGIONS})))'], cwd=ROOT))
T, R = J["T"], J["R"]

def strips(key):
    if key == "classic": return sorted(glob.glob(os.path.join(ROOT, "ben10_*_uniform__classic.png")))
    if key == "jacket":
        return sorted(os.path.join(ROOT, s) for s in set(re.findall(r"(ben10_[a-z0-9_]+_uniform\.png)", open(os.path.join(ROOT, "characters.js")).read())) if os.path.exists(os.path.join(ROOT, s)))
    mod = {"diamondhead_ov": "diamondhead", "upgrade_ov": "upgrade", "feedback_ov": "feedback", "wildmutt_ov": "wildmutt"}.get(key, key)
    files = {os.path.join(ROOT, f"{mod}.js")} | set(glob.glob(os.path.join(ROOT, f"{mod}*Assets*.js")))
    out = set()
    for f in files: out |= set(re.findall(r"(ben10_[A-Za-z0-9_]+_uniform\.png)", open(f).read()))
    return sorted(os.path.join(ROOT, s) for s in out if "__" not in s and os.path.exists(os.path.join(ROOT, s)))

def inh(h, r): return r[0] <= h <= r[1] if r[0] <= r[1] else (h >= r[0] or h <= r[1])
def rule_of(rules, c):
    h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c)); h *= 360
    for i, r in enumerate(rules):
        if inh(h, r["h"]) and r["s"][0] <= s <= r["s"][1] and r["v"][0] <= v <= r["v"][1]: return i
    return None
ROLE = {"P": "PRIMARY", "S": "SECONDARY", "A": "ACCENT", "E": "ENERGY", "H": "HIGHLIGHT"}
OUT = os.path.join(ROOT, "docs/ben10/skins"); os.makedirs(OUT, exist_ok=True)
summary = []
for key, M in R.items():
    fs = strips(key); C = Counter()
    for f in fs:
        for c, n in Counter(p[:3] for p in Image.open(f).convert("RGBA").getdata() if p[3] > 0).items(): C[c] += n
    tot = sum(C.values()) or 1; per = Counter(); left = Counter()
    for c, n in C.items():
        i = rule_of(M["rules"], c)
        if i is None: left[c] += n
        else: per[i] += n
    roles = {r["role"] for r in M["rules"]}
    missing = [ROLE[k] for k in "PSAEH" if k not in roles]
    L = [f"# {M['label']}: theme regions", "",
         f"Regional map `{key}` in `benThemeRegions.js` (material: {M['mat']}). Applied to all 20 themes of `benThemes.js` at draw time by "
         f"`benThemeRecolor.js`. Measured over {len(fs)} body strip(s), {tot:,} opaque pixels. Only RGB changes; alpha, size and frame "
         f"layout are untouched.", "", "| # | role | hue ° | sat | value | reference | share of pixels |", "|---|---|---|---|---|---|---|"]
    for i, r in enumerate(M["rules"]):
        fb = f" (no HIGHLIGHT in theme → {'natural' if r.get('fb','keep')=='keep' else ROLE[r['fb']]})" if r["role"] == "H" else ""
        L.append(f"| {i+1} | {ROLE[r['role']]}{fb} | {r['h'][0]}–{r['h'][1]} | {r['s'][0]}–{r['s'][1]} | {r['v'][0]}–{r['v'][1]} | `{r['ref']}` | {100*per[i]/tot:.1f} % |")
    L += ["", f"**Left as drawn** ({100*sum(left.values())/tot:.1f} % of pixels; outline black, skin, eyes, teeth, whites): " +
          ", ".join(f"`#{c[0]:02x}{c[1]:02x}{c[2]:02x}` {100*n/tot:.1f} %" for c, n in left.most_common(8)), "",
          f"**Roles this art does not separate** (not invented, noted as missing art): {', '.join(missing) if missing else 'none'}.", "",
          f"Contact sheet: `img/contact_{key}.png` (original + 20 themes, idle + an attack pose, ×2 nearest-neighbour).", ""]
    open(os.path.join(OUT, f"{key}_REGIONS.md"), "w").write("\n".join(L))
    summary.append((key, M["label"], len(fs), 100 * (tot - sum(left.values())) / tot, missing))

L = ["# Ben 10 — cosmetic THEMES", "",
     "One pick on human Ben: **appearance** (Classic or Jacket) × **theme** (one of 20) = 40 skins, ids `<classic|jacket>-<theme>`. "
     "The theme recolours that human sprite set and, automatically, every READY alien he transforms into, through each sprite "
     "set's own regional map. There is no per-alien choice and no extra input. The original Classic and Alien Force (jacket) skins stay "
     "available, unnumbered.", "",
     "**Cosmetic only.** No damage, speed, hitbox, cost, cooldown or timing changes. A themed skin wears its original appearance's "
     "variant: Classic stats / normals / voice, or Alien Force. A theme named after an alien grants nothing and unlocks nothing; the "
     "Alien X theme does not touch the Alien X form.", "",
     "**Albedo is unaffected.** The themes exist only in `SKINS.ben10`. The recolour is gated on `rosterKey === \"ben10\"`, and Albedo's "
     "skins / `__albedo` art never pass through it. There is no Albedo / Red Omnitrix theme.", "",
     "## How it works", "",
     "- `benThemes.js`: the one registry. Each theme has 5 roles (PRIMARY / SECONDARY / ACCENT / ENERGY / HIGHLIGHT) as "
     "[dark, mid, light] swatches, a source label and a note. A theme without HIGHLIGHT keeps natural hair.",
     "- `benThemeRegions.js`: one ordered rule list per sprite set (2 humans + every READY alien). Each rule claims colours by "
     "HSV window, gives them a role, and records the region's reference tone. A pixel's brightness relative to that tone picks "
     "its point on the role's ramp, so shading, facets and fur survive. It is never a flat fill.",
     "- `benThemeRecolor.js`: when the renderer is about to draw a sheet for a themed Ben, the sheet is recoloured once into a "
     "same-size canvas: per-colour lookup, alpha copied untouched. Frame timing, crop rects, anchors and hitboxes cannot change; "
     "they never read pixels.",
     "- **Cache:** the key is owner | asset version (`window.__ASSET_V`, the existing cache-bust stamp) | appearance | form | "
     "theme | sheet path. It is an LRU bounded at 24 M pixels (≈ 96 MB). A stale entry, from a changed size or a new asset "
     "version, never matches. Nothing is generated at startup; a sheet is recoloured the first time it is drawn (a few ms).",
     "- **Sparkle** (Alien X stars, Opal glitter): a fixed integer hash of each pixel's sheet coordinate, baked once into the "
     "cached canvas. It is not animated and uses no randomness. With *reduce flashing* on, it thins to a quarter.",
     "- **Persistence:** the theme rides on the skin id, so it is saved, restored, sent over LAN and recorded in replays exactly "
     "like any skin. `applySkin` stamps `_benTheme` / `_benAppearance`. Transform, revert and swap only change the frame set, so "
     "the same theme follows every form. A new round re-applies the skin; a rematch keeps the fighter's fields.",
     "- **Careful-recolour rules:** a clothing panel drawn with black linework swaps PRIMARY ↔ SECONDARY when the theme's "
     "primary is near-black (`swapDark`: Classic's striped shirt, the jacket over a black undershirt). Pale regions (Rath's "
     "chest, bellies, undersides) take the theme's lightest listed role (`light`). Highlights are a modest lift, never "
     "chalk-white. Organic hides use a steeper ramp (`gain`) so stripes stay visible.",
     "- **Player tint / hit flash:** unchanged. A mirror match's P2 wash and team tints still draw over the themed sheet.",
     "- **Not themed:** FX sheets drawn outside the fighter sprite (projectiles, beams, the transformation flash) keep their own "
     "colours. Legacy experimental twins have no map and draw as before.", "",
     "## The 20 themes", "", "| # | id | name | source | note | P | S | A | E | H |", "|---|---|---|---|---|---|---|---|---|---|"]
for i, t in enumerate(T):
    sw = lambda k: f"`{t['roles'][k][1]}`" if k in t["roles"] else "natural"
    L.append(f"| {i+1} | `{t['id']}` | {t['name']} | {t['source']} | {t['note']}{' Sparkle: ' + t['sparkle'] + '.' if t.get('sparkle') else ''} | {sw('P')} | {sw('S')} | {sw('A')} | {sw('E')} | {sw('H')} |")
L += ["", "## Coverage per sprite set", "", "| set | strips | pixels themed | roles the art does not separate | regions doc |", "|---|---|---|---|---|"]
for key, lab, n, pct, miss in summary:
    L.append(f"| {lab} | {n} | {pct:.1f} % | {', '.join(miss) or '—'} | [{key}_REGIONS.md]({key}_REGIONS.md) |")
L += ["", "Pixels that are not themed are deliberate: outline black, skin, eyes, teeth and whites.", "",
      "## Selecting a theme (actual controls)", "",
      "Character select → Ben → the skin grid shows the originals, then Classic 1–20, then Jacket 1–20. Each card shows Ben's "
      "full-body idle frame in that theme, drawn large with crisp pixels, the theme's role colours as a strip, and a short "
      "label (e.g. CLASSIC · 1 / Blue Hour). The grid now picks the column count that gives the largest card, so the "
      "45-card set is readable. Every set that already fit at full size keeps its exact layout.",
      "- **Mouse:** click a card.",
      "- **PS5 DualSense / gamepad:** D-pad or left stick moves the cursor between cards, ✕ (Cross) picks, ◯ (Circle) goes back.",
      "- **Keyboard:** Esc / Backspace goes back. The skin grid has no keyboard browse; that is unchanged.",
      "", "Regenerate: `python3 tools/ben10/write_theme_docs.py` · contact sheets: `node tools/ben10/theme_contact_sheets.mjs`.", ""]
open(os.path.join(OUT, "THEMES.md"), "w").write("\n".join(L))
print("wrote", len(summary), "REGIONS docs + THEMES.md")
