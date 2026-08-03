#!/usr/bin/env python3
"""Generate Sukuna's 4 coordinated head-to-toe colour skins (__<tag>.png sheets).

Same standard as Gojo's redo: each skin recolours HAIR + MAIN OUTFIT + EYES to the SAME hue family (a
genuine coordinated monochrome-per-skin look — NOT a hair-only swap). Targeted per-region palette
replacement via recolor_palette (NOT hue-rotate); multi-tone preserved per region via --to-tone.

SUKUNA REGIONS (measured — tools/_sukuna_zonemap on sukuna_idle/attack/walk):
  * HAIR   — bright pink spikes: hue 315-360, sat>=0.28, val>=0.50, TOP of the silhouette (yband 0-0.34).
  * EYES   — the red irises sit in the tattoo eye-band on the face: hue 335-360, sat>=0.45, val 0.25-0.72
             (darker & more saturated than skin; brighter-capped so it never grabs the pink hair above),
             yband 0.22-0.46 (the face band, below the hair). Recoloured to the SAME target as the hair.
  * OUTFIT — two materials, BOTH recoloured to the (deeper) clothing target so the look is coordinated:
             NAVY the main uniform/hakama (hue 210-285, sat>=0.22) + CRIMSON the robe/scarf/shoes
             (hue 335-360, sat>=0.52, lower body yband 0.42-1.0 so it's the robe, not the face eyes).
  * MARKINGS/TATTOOS — pure black face/body linework (val<~0.16, near-neutral) is caught by NO pass
             (every pass gates min_sat/min_val above it) → the tattoos stay black and fully visible.
  * SKIN (face/hands, warm hue 0-25) — excluded by every pass' HUE gate (hair/eye passes select the
             magenta side 315-360, never the orange skin side), so the natural skin tone is untouched.

PASS ORDER: OUTFIT_NAVY -> OUTFIT_CRIMSON -> HAIR -> EYES. Outfit first (on the ORIGINAL navy) so that a
hair/eye target whose hue lands in the navy band (e.g. Amethyst purple ~262°) can't be re-grabbed by the
navy pass afterwards. HAIR/CRIMSON share a hue range but are yband-separated (top vs lower), so no clash.
Applied PER-FRAME (yband relative to each frame's own bbox) so the top-of-silhouette / face-band / lower
splits stay correct on every pose. Cosmetic only; zero gameplay.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import apply_recolor, _NS
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── pass builders ──────────────────────────────────────────────────────────
def OUTFIT_NAVY(h, sp=1.0):    return dict(from_hue="210-285", min_sat=0.22, min_val=0.06, to_tone=h, tone_spread=sp)
def OUTFIT_CRIMSON(h, sp=1.0): return dict(from_hue="335-360", min_sat=0.52, min_val=0.20, yband="0.42-1.0", to_tone=h, tone_spread=sp)
def HAIR(h, sp=1.0):           return dict(from_hue="315-360", min_sat=0.28, min_val=0.50, yband="0-0.34", to_tone=h, tone_spread=sp)
def EYES(h, sp=1.0):           return dict(from_hue="335-360", min_sat=0.45, min_val=0.25, max_val=0.72, yband="0.22-0.46", to_tone=h, tone_spread=sp)

# ── skin table: tag -> (hair/eyes target, clothing target) ──
SKINS = {
    "cerulean": dict(hair="#7EC8E3", cloth="#5A9BC4"),   # blue
    "amethyst": dict(hair="#B9A0DC", cloth="#8A6BB0"),   # lavender/purple
    "solar":    dict(hair="#E8823C", cloth="#B85F28"),   # orange
    "rose":     dict(hair="#F2A8C4", cloth="#C77894"),   # pink
}

def passes_for(cfg):
    return [OUTFIT_NAVY(cfg["cloth"]), OUTFIT_CRIMSON(cfg["cloth"]), HAIR(cfg["hair"]), EYES(cfg["hair"])]

def recolor_skin(path, tag, cfg, cell_w):
    """All passes PER-FRAME (yband relative to each frame's opaque bbox) → one __<tag>.png."""
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    n = max(1, W // cell_w)
    passes = [_NS(**p) for p in passes_for(cfg)]
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
    """[(sheet_name, cell_w)] scraped from characters.js (default sukuna_* sheets, width paired)."""
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const sukuna"); rest = src[i+12:]
    j = i+12 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    w = {}
    for m in re.finditer(r'width:\s*(\d+)[^}]*?sheet:\s*"\./(sukuna_[^"]+)"', block):
        w.setdefault(m.group(2), int(m.group(1)))
    return sorted(w.items())

def build(tag, only_sheet=None):
    cfg = SKINS[tag]
    targets = wired_sheets() + [("sukuna_portrait.png", None)]
    total = 0
    for name, cell_w in targets:
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        cw = cell_w or Image.open(path).width
        c = recolor_skin(path, tag, cfg, cw)
        total += c
        print(f"  {c:6d}px  {name}")
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only_sheet = sys.argv[2] if len(sys.argv) > 2 else None
    if tag == "ALL":
        for t in SKINS:
            print(f"=== {t} ==="); build(t)
        return
    if tag not in SKINS:
        print("skins:", ", ".join(SKINS)); sys.exit(1)
    build(tag, only_sheet)

if __name__ == "__main__":
    main()
