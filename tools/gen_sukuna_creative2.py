#!/usr/bin/env python3
"""Sukuna creative skin pack (12) — RECOLOR-ONLY, built on the transparency-repaired base.

Coordinated-element model (same standard as Hisoka/Maki/Miwa redos): HAIR + MARKINGS vary together as the
accent, CLOTHING is the separate (usually black) contrast. Regions MEASURED from the base sheets:
  * CLOTHING = the navy suit/hakama (hue 210-285, sat>=0.22) + the red robe/scarf/shoes (hue 335-360,
               sat>=0.52, lower yband 0.42-1.0). Both -> the skin's `cloth` target.
  * HAIR     = pink spikes (hue 315-360, sat>=0.28, val>=0.50, TOP yband 0-0.34) -> `hair` target.
  * MARKINGS = red eyes / face markings (hue 335-360, sat>=0.45, val 0.25-0.72, face yband 0.22-0.46)
               -> `mark` target. (Sukuna's iconic BLACK tattoo stripes are pure black — line-art — and are
               deliberately KEPT black: every pass gates min_sat/min_val above the black, so no outline
               stroke is ever crossed and no region merges into a blob.)
  * SKIN (face/hands, warm hue 0-30) — EXCLUDED from every pass (all passes select the magenta/navy side,
               never the warm skin side) → face/skin never bleeds. Per the brief's bleed-risk rule.

`to_tone` maps a region to the target hue while PRESERVING each pixel's base->shadow value offset (pivot =
region mean), so multi-tone shading is preserved with no per-skin ratio guess.

Pass order per frame (yband relative to each frame's own opaque bbox): OUTFIT_NAVY -> OUTFIT_ROBE -> HAIR ->
MARK. Outfit first (on the ORIGINAL navy/red) so a hair/mark target landing in those bands can't be
re-grabbed; hair (top) and mark (face) are yband-separated so they never clash. `None` = region unchanged.
Void Sovereign additionally gets a procedural ember overlay wired in game.js (drawSukunaVoidEmberOverlay).
Cosmetic only; zero gameplay.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import apply_recolor, _NS
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def OUTFIT_NAVY(h): return dict(from_hue="210-285", min_sat=0.22, min_val=0.06, to_tone=h)
def OUTFIT_ROBE(h): return dict(from_hue="335-360", min_sat=0.52, min_val=0.20, yband="0.42-1.0", to_tone=h)
def HAIR(h):        return dict(from_hue="315-360", min_sat=0.28, min_val=0.50, yband="0-0.34", to_tone=h)
def MARK(h):        return dict(from_hue="335-360", min_sat=0.45, min_val=0.25, max_val=0.72, yband="0.22-0.46", to_tone=h)

# tag -> dict(hair, mark, cloth)  (None = leave region unchanged)
SKINS = {
    # ── GROUP 1 ──
    "obsidiancurse":     dict(hair="#181818", mark="#D81823", cloth="#141416"),  # near-black base, single vivid-red marking accent
    "crimsonking":       dict(hair="#9E1B1B", mark="#9E1B1B", cloth="#0F0F12"),  # deep/rich red hair+markings, black clothing
    "voidsovereign":     dict(hair="#141416", mark="#4E1212", cloth="#0F0F12"),  # full near-black + drifting dark-red embers (game.js overlay)
    "goldentyrant":      dict(hair="#D4A02A", mark="#D4A02A", cloth="#0F0F12"),  # warm gold hair+markings, black clothing
    # ── GROUP 2 ──
    "azuremalice":       dict(hair="#1F58A8", mark="#1F58A8", cloth="#0F0F12"),  # deep blue
    "emeraldrot":        dict(hair="#1E7A42", mark="#1E7A42", cloth="#0F0F12"),  # deep green
    "amethystsovereign": dict(hair="#7A2FB8", mark="#7A2FB8", cloth="#0F0F12"),  # richer purple than natural
    "ivorydecree":       dict(hair="#ECECE6", mark="#ECECE6", cloth="#0F0F12"),  # white/pale
    # ── GROUP 3 ──
    "ashenruin":         dict(hair="#70707A", mark="#70707A", cloth="#4A1414"),  # charcoal-gray hair/mark, dark-red clothing (battle-worn)
    "sunfiremalevolence":dict(hair="#D2621C", mark="#D2621C", cloth="#0F0F12"),  # burnt-orange
    "tealcataclysm":     dict(hair="#178C8C", mark="#178C8C", cloth="#0F0F12"),  # deep teal
    "rosecarnage":       dict(hair="#EA4C8E", mark="#EA4C8E", cloth="#0F0F12"),  # vivid pink
}

def passes_for(cfg):
    ps = []
    if cfg["cloth"]: ps += [OUTFIT_NAVY(cfg["cloth"]), OUTFIT_ROBE(cfg["cloth"])]
    if cfg["hair"]:  ps.append(HAIR(cfg["hair"]))
    if cfg["mark"]:  ps.append(MARK(cfg["mark"]))
    return [_NS(**p) for p in ps]

def recolor_sheet(path, tag, cfg, cell_w):
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    n = max(1, W // cell_w)
    passes = passes_for(cfg)
    total = 0
    for i in range(n):
        box = (i * cell_w, 0, (i + 1) * cell_w, H)
        frame = img.crop(box)
        bb = frame.getbbox()
        if bb is None:
            continue
        content = frame.crop(bb)
        for p in passes:
            content, c = apply_recolor(content, p); total += c
        frame.paste(content, (bb[0], bb[1])); img.paste(frame, box)
    img.save(path[:-4] + f"__{tag}.png")
    return total

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const sukuna"); rest = src[i+12:]
    j = i+12 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    w = {}
    for m in re.finditer(r'width:\s*(\d+)[^}]*?sheet:\s*"\./(sukuna_[^"]+)"', block):
        w.setdefault(m.group(2), int(m.group(1)))
    return sorted(w.items())

def build(tag):
    cfg = SKINS[tag]
    total = 0
    for name, cell_w in wired_sheets():
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        c = recolor_sheet(path, tag, cfg, cell_w)
        total += c
        print(f"  {c:6d}px  {name}")
    print(f"DONE {tag}: {total}px")

def main():
    args = sys.argv[1:]
    if not args:
        print("tags:", ", ".join(SKINS)); sys.exit(1)
    tags = list(SKINS) if args[0] == "ALL" else args
    for t in tags:
        if t not in SKINS:
            print(f"unknown tag {t}"); continue
        print(f"=== {t} ==="); build(t)

if __name__ == "__main__":
    main()
