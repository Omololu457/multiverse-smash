#!/usr/bin/env python3
"""Maki Zenin — 12 THEMED base-form alt-color skins (__<tag>.png sheets).

Capture-masks-from-original (contamination-proof; same as gen_omega_creative / gen_gold_creative).
Recolors the BASE-form sheets only (characters.maki.animationData, retagged by skins.js recolorSkinAnim).
The ≤25%-HP Shibuya (Ultimate) form is intentionally NOT recolored — these skins carry NO recolorTag, so
enterMakiShibuya keeps the canonical black-costume Shibuya sheets (a distinct awakened form).

THREE cleanly-separable regions (verified across idle/run/intro/attack sheets). The dark navy uniform is
BIMODAL in value, which gives a real body-vs-trim split; blue SATURATION separates both from the neutral
black outline (line-art guard):
  * UNIFORM — the lighter navy garment body: hue 200-265, sat>=0.22, val>=0.28. Primary identity colour.
  * TRIM    — the darker navy edges/shadow: hue 200-265, sat>=0.22, val<0.28. Secondary trim colour.
  * ROPE    — the red naginata cord/tassel accent: (hue>=336 or hue<=18) & sat>=0.35.

PROTECTED (never selected → untouched): GREEN/teal hair (hue 120-200), SKIN (warm hue ~10-45), the
white/gray naginata BLADE (sat<0.18), and the pure-black OUTLINE (sat<0.22 in the dark band). Every outline
stroke stays a fixed coloring-book boundary — masks never select neutral pixels, so no bleed / blobby merge.

LINE-ART GUARD: `floor` keeps a dark UNIFORM/TRIM target a clear margin above outline-black so a near-black
skin never fuses garment into the outline (see obsidian). Multi-tone shading preserved via the tone-remap
in paint(). Cosmetic only — ZERO gameplay/stat changes.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import rgb_hsv, hex2rgb
from gen_rick_creative import void_flatten   # reuse the proven full-form void flattener (Rick/Rengoku/Shinobu)
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def uniform(h, s, v): return 200 <= h*360 <= 265 and s >= 0.22 and v >= 0.28
def trim(h, s, v):    return 200 <= h*360 <= 265 and s >= 0.22 and v < 0.28
def rope(h, s, v):    return (h*360 >= 336 or h*360 <= 18) and s >= 0.35
REGIONS = [("uniform", uniform), ("trim", trim), ("rope", rope)]

def paint(px, idxs, target_hex, spread=1.0, to_sat=None, floor=0.0):
    if not idxs: return 0
    th, ts, tv = rgb_hsv(*hex2rgb(target_hex))
    if to_sat is not None: ts = to_sat
    pivot = sum(rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])[2] for i in idxs) / len(idxs)
    for i in idxs:
        _, _, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        px[i*4]   = max(0, min(255, round(nr*255)))
        px[i*4+1] = max(0, min(255, round(ng*255)))
        px[i*4+2] = max(0, min(255, round(nb*255)))
    return len(idxs)

def recolor(path, tag, cfg):
    img = Image.open(path).convert("RGBA"); W, H = img.size
    px = bytearray(img.tobytes())
    masks = {name: [] for name, _ in REGIONS}
    for i in range(W*H):
        if px[i*4+3] == 0: continue
        h, s, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        for name, sel in REGIONS:
            if sel(h, s, v):
                masks[name].append(i); break
    total = 0
    for name, _ in REGIONS:
        spec = cfg[name]
        hexv, to_sat = spec[0], spec[1]
        spread = spec[2] if len(spec) > 2 else 1.0
        floor  = spec[3] if len(spec) > 3 else 0.0
        total += paint(px, masks[name], hexv, spread=spread, to_sat=to_sat, floor=floor)
    Image.frombytes("RGBA", (W, H), bytes(px)).save(path[:-4] + f"__{tag}.png")
    return total

# spec = (hex, to_sat|None, [spread], [floor]). to_sat forces sat for grayscale/near-black targets.
SKINS = {
    # ── GROUP 1 ──
    "crimson":  dict(uniform=("#A81E1E", None),          trim=("#141419", 0.10, 1.2, 0.05), rope=("#E23A2A", None)),
    "cobalt":   dict(uniform=("#1E4FA8", None),          trim=("#C6C6CC", 0.05),            rope=("#5A8FE0", None)),
    "emerald":  dict(uniform=("#1E8F3E", None),          trim=("#141419", 0.10, 1.2, 0.05), rope=("#4FD07A", None)),
    "golden":   dict(uniform=("#C9962E", None),          trim=("#141419", 0.10, 1.2, 0.05), rope=("#E0A030", None)),
    # ── GROUP 2 ──
    "rosethorn":dict(uniform=("#E24C9E", None),          trim=("#DAD9D3", 0.04),            rope=("#F06AB8", None)),
    "amethyst": dict(uniform=("#6A2EA8", None),          trim=("#C6C6CC", 0.05),            rope=("#A05AE0", None)),
    "ashen":    dict(uniform=("#4A4A52", 0.08, 1.1),     trim=("#6E1F26", None),            rope=("#8A6A6A", 0.28)),
    # LIGHT uniform: both bands pale (the dominant dark band would look inverted if trimmed black), so the
    # whole garment reads white/pale-gray and the black OUTLINE supplies the "black trim" edge. floor lifts
    # the dark band up to pale. rope near-black.
    "ivory":    dict(uniform=("#E7E6E0", 0.04),          trim=("#C6C5BF", 0.05, 1.0, 0.55), rope=("#332826", 0.28)),
    # ── GROUP 3 ──
    "teal":     dict(uniform=("#1E8F8F", None),          trim=("#141419", 0.10, 1.2, 0.05), rope=("#4FD0D0", None)),
    "sunfire":  dict(uniform=("#C85A1E", None),          trim=("#141419", 0.10, 1.2, 0.05), rope=("#E07A30", None)),
    # OBSIDIAN EDGE — near-black uniform+trim, single vivid-red rope accent (minimalist)
    "obsidian": dict(uniform=("#1A1A20", 0.12, 1.4, 0.14), trim=("#141418", 0.12, 1.4, 0.12), rope=("#E22A2A", None)),
    "twilight": dict(uniform=("#3A3A8F", None),          trim=("#C6C6CC", 0.05),            rope=("#6A6AE0", None)),
}
GROUPS = {1: ["crimson","cobalt","emerald","golden"],
          2: ["rosethorn","amethyst","ashen","ivory"],
          3: ["teal","sunfire","obsidian","twilight"]}

def base_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const maki = {"); rest = src[i:]
    j = i + rest.index("export const characters")   # maki block ends before the export
    sheets = set(re.findall(r'sheet:\s*"\./(maki[a-z0-9_]+\.png)"', src[i:j]))
    # exclude the Shibuya-form sheets (not part of base-form skins)
    return {s for s in sheets if "shibuya" not in s}

def all_targets():
    return sorted(base_sheets() | {"maki_portrait.png"})

def build(tag):
    cfg = SKINS[tag]; total = 0
    for name in all_targets():
        path = os.path.join(ROOT, name)
        if not os.path.exists(path): print(f"  SKIP(missing) {name}"); continue
        c = recolor(path, tag, cfg); total += c
        print(f"  {c:7d}px  {name}")
    print(f"DONE {tag}: {total}px")

# VOID HUNTER (Part A) — full-form near-black flatten of EVERY base sheet (uniform/hair/skin/face all void),
# same treatment as Rick Void / Rengoku Void Ember / Superman Phantom Zone. The procedural starfield+nebula
# overlay is Part B (game.js drawVoidHunterOverlay). Tag "voidhunter"; near-black #0F0F12.
VOID_HEX = "#0F0F12"
def build_void():
    total = 0
    for name in all_targets():
        path = os.path.join(ROOT, name)
        if not os.path.exists(path): print(f"  SKIP(missing) {name}"); continue
        img = Image.open(path).convert("RGBA")
        n = void_flatten(img, VOID_HEX)
        img.save(path[:-4] + "__voidhunter.png"); total += n
        print(f"  {n:7d}px  {name}")
    print(f"DONE voidhunter: {total}px")

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "voidhunter":
        print("\n=== voidhunter (Part A: full-form flatten) ==="); build_void(); return
    tags = GROUPS.get(int(arg)) if arg.isdigit() else ([arg] if arg != "all" else list(SKINS))
    for t in tags:
        print(f"\n=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
