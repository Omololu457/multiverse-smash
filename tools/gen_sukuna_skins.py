#!/usr/bin/env python3
"""Sukuna palette-swap skin pack — 10 RECOLOR-ONLY skins (same silhouette/linework/shading as the base).

Region model (MEASURED from the repaired base sukuna_* sheets — see the color analysis in the build log):
  * HAIR   — pink spikes: hue 315-360, sat>=0.28, val>=0.48, TOP band (yband 0-0.34).
  * SUIT   — the dark NAVY jacket/hakama (hue 205-285, sat>=0.20): the dominant region. Reads as
             "charcoal" on-screen but is genuinely dark navy in the pixels — recolouring it swaps the suit.
  * SKIN   — warm face/hands: hue 10-35, sat 0.12-0.72 (excludes the reds at hue 0/360 and the pink hair).
  * ACCENT — Sukuna's RED markings/scarf/robe/eyes (hue 330-360, sat>=0.50). NOTE: there is NO separable
             "claw/nail" region at this sprite resolution — the only distinct accent-coloured pixels are the
             red markings, so "accent" maps to those (flagged in the build report). Split into a face-band
             (eyes) + lower-band (robe/scarf/shoes) pass so it never collides with the HAIR band.

NOT touched: pure-black line art / tattoos (val≈0, sat≈0 — every pass gates min_val/min_sat above it), and
the pose/frame data. Recolour is per-region via recolor_palette `to_tone`, which PRESERVES each region's
existing base->shadow value spread (measures the region mean as the pivot and keeps every pixel's offset) —
so the shadow tone is a fixed darken of the base at the SAME ratio the source already uses (no per-skin guess,
no separate accent shadow needed).

Pass order per frame: SUIT -> SKIN -> ACCENT(lower, eyes) -> HAIR. SUIT first so a hair/accent target that
lands in the navy band can't be re-grabbed; SKIN before ACCENT so an accent target near the warm band can't
be re-grabbed by skin; HAIR last (top band) so it owns the spikes. `None` target = region left UNCHANGED.

Wildfire: the pipeline only does flat per-region `to_tone` (no 2-stop gradient fill), so per the brief
Wildfire's root->tip gradient FALLS BACK to a flat mid orange-red. Blood Court keeps hair (black) AND accent
(red) unchanged on purpose (monochrome-red look). Cosmetic only; zero gameplay.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import apply_recolor, _NS
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── region pass builders (yband is relative to each frame's own opaque bbox) ──
def SUIT(h):        return dict(from_hue="205-285", min_sat=0.20, min_val=0.05, to_tone=h)
def SKIN(h):        return dict(from_hue="10-35",   min_sat=0.12, max_sat=0.72, min_val=0.30, to_tone=h)
def ACCENT_LOW(h):  return dict(from_hue="330-360", min_sat=0.50, min_val=0.18, yband="0.40-1.0", to_tone=h)
def ACCENT_EYE(h):  return dict(from_hue="330-360", min_sat=0.42, min_val=0.22, max_val=0.74, yband="0.20-0.46", to_tone=h)
def HAIR(h):        return dict(from_hue="315-360", min_sat=0.28, min_val=0.48, yband="0-0.34", to_tone=h)

# ── the 10-skin palette table (base tone per region; None = leave region unchanged) ──
SKINS = {
    "ashenwolf":   dict(hair="#C8CED6", suit=None,      skin="#EAD9CC", accent="#A8D8E8"),  # white hair-tips not isolable → flat steel-grey (flag)
    "emberking":   dict(hair="#8B1A1A", suit=None,      skin="#D2A679", accent="#E8A33D"),  # "burnt-orange lapel sheen" not isolable → suit unchanged (flag)
    "jadecourt":   dict(hair="#1B4D3E", suit="#0D2B22", skin="#EAD9CC", accent="#D4AF37"),
    "frostbite":   dict(hair="#D6EAF2", suit="#3A506B", skin="#E6EEF2", accent="#9FE8E0"),
    "bloodcourt":  dict(hair="#1A1A1A", suit="#5C1A1A", skin="#EAD9CC", accent=None),        # accent held (monochrome-red); hair→black (base hair is PINK not black, so "unchanged" ≠ black → recolour to honor the intent)
    "goldenhour":  dict(hair="#C98A2B", suit="#3E2A1F", skin="#D2A679", accent="#8C6A3D"),
    "violetreign": dict(hair="#4B2E6F", suit="#231433", skin="#E3D5E0", accent="#C23BAA"),
    "static":      dict(hair="#F2F2F2", suit="#0A0A0A", skin="#D8D8D8", accent="#00E5FF"),
    "wildfire":    dict(hair="#CC4A1C", suit=None,      skin="#EAD9CC", accent="#F4B33D"),  # gradient hair → flat mid orange-red fallback (flag)
    "moonlit":     dict(hair="#B9C7D6", suit="#141A2E", skin="#DDE3EA", accent="#D8DCE0"),
}

def passes_for(cfg):
    ps = []
    if cfg["suit"]:   ps.append(SUIT(cfg["suit"]))
    if cfg["skin"]:   ps.append(SKIN(cfg["skin"]))
    if cfg["accent"]: ps += [ACCENT_LOW(cfg["accent"]), ACCENT_EYE(cfg["accent"])]
    if cfg["hair"]:   ps.append(HAIR(cfg["hair"]))
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
    """[(sheet_name, cell_w)] scraped from characters.js sukuna animationData (default sheets)."""
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
    total = 0
    for name, cell_w in wired_sheets():
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        c = recolor_sheet(path, tag, cfg, cell_w)
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
