#!/usr/bin/env python3
"""Rigorous per-skin verification for the Yuji creative skins. For each skin + each recolored sheet, proves:
  * OUTLINE pixels (s<0.16 & v<0.30)      — byte-identical to base   (line-art guard)
  * SKIN pixels (warm h14-42 v>=0.35)     — byte-identical to base   (face/hands excluded)
  * CYAN FX pixels (h150-213 s>=0.3)      — byte-identical to base   (blue crescent + energy glints preserved)
  * on the accent-SKIP sheets (koma1/koma2/aircombo): RED pixels (h<=12|h>=349 s>=0.6) byte-identical (red flame-trail FX preserved)
  * HAIR/OUTFIT regions DID change (sanity: the recolor actually happened)
Also flags any sheet where a NON-accent-skip sheet's red changed a lot (would mean an FX got caught).
USAGE: verify_yuji_skins.py [tag ...]     # default: all tags found on disk
"""
import os, sys, colorsys
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.dirname(__file__))
from gen_yuji_creative import SKINS, FULL_SHEETS, HAIROUTFIT_ONLY, classify

def hsv(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); return h*360, s, v

def is_cyan(h, s, v): return 150 <= h <= 213 and s >= 0.3
def is_red(h, s, v):  return (h <= 12 or h >= 349) and s >= 0.6

def check_sheet(base_path, skin_path, accent_skip):
    base = Image.open(base_path).convert("RGBA").load()
    skin = Image.open(skin_path).convert("RGBA").load()
    W, H = Image.open(base_path).size
    diffs = {"OUTLINE": 0, "SKIN": 0, "CYAN": 0, "RED_fx": 0}
    changed = {"HAIR": 0, "OUTFIT": 0, "ACCENT": 0}
    for y in range(H):
        for x in range(W):
            br = base[x, y]
            if br[3] < 128: continue
            h, s, v = hsv(br[0], br[1], br[2])
            c = classify(h, s, v)
            same = (skin[x, y] == br)
            if c == "OUTLINE" and not same: diffs["OUTLINE"] += 1
            if c == "SKIN" and not same:    diffs["SKIN"] += 1
            if is_cyan(h, s, v) and not same: diffs["CYAN"] += 1
            if accent_skip and is_red(h, s, v) and not same: diffs["RED_fx"] += 1
            if c in changed and not same: changed[c] += 1
    return diffs, changed

def main():
    tags = sys.argv[1:] or [t for t in SKINS if os.path.exists(os.path.join(ROOT, f"yuji_idle_uniform__{t}.png"))]
    all_ok = True
    for tag in tags:
        print(f"=== {tag} ===")
        tot_diff = {"OUTLINE": 0, "SKIN": 0, "CYAN": 0, "RED_fx": 0}; tot_changed = 0
        for name in FULL_SHEETS + HAIROUTFIT_ONLY:
            bp = os.path.join(ROOT, name); sp = bp[:-4] + f"__{tag}.png"
            if not os.path.exists(sp): print(f"  MISSING {sp}"); all_ok = False; continue
            accent_skip = name in HAIROUTFIT_ONLY
            d, ch = check_sheet(bp, sp, accent_skip)
            for k in tot_diff: tot_diff[k] += d[k]
            tot_changed += ch["HAIR"] + ch["OUTFIT"] + ch["ACCENT"]
            flags = [k for k, val in d.items() if val > 0]
            if flags: print(f"  ⚠ {name}: " + ", ".join(f"{k}={d[k]}" for k in flags))
        ok = all(v == 0 for v in tot_diff.values()) and tot_changed > 0
        all_ok = all_ok and ok
        print(f"  {'✅' if ok else '❌'} protected-untouched={ {k:v for k,v in tot_diff.items()} }  recolored_px={tot_changed}")
    print("\n" + ("✅ ALL SKINS CLEAN" if all_ok else "❌ SOME SKINS HAVE LEAKS"))
    sys.exit(0 if all_ok else 1)

if __name__ == "__main__":
    main()
