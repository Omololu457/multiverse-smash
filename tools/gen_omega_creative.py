#!/usr/bin/env python3
"""Generate the Omega Ranger's (S.P.D.) 12 creative alt-color skins (__<tag>.png sheets).

Targeted per-region palette replacement — cosmetic only, zero gameplay. Unlike recolor_multi
(sequential passes, where a later hue-selected pass can re-grab an earlier pass' recolored output),
this CAPTURES EVERY REGION MASK FROM THE ORIGINAL sheet FIRST, then paints each masked region. That
makes cross-contamination impossible even when the armor and visor targets share a hue family (e.g.
Cobalt = blue armor + blue-ish visor), which the sequential path could not handle safely.

OMEGA RANGER REGIONS (measured — cleanly separable, verified across idle/run/intro sheets; only ~16
AA pixels/sheet fall outside all three). The ranger is FULLY HELMETED — there is NO exposed skin, so
the usual skin-bleed guard is unnecessary:
  * ARMOR  — the white/gray plates (the bulk of the suit): sat<=0.20, val>=0.34. Boots are the SAME
             white plating and are NOT separable from the body armor, so they follow the armor color
             (documented; a true 4th "boots" zone does not exist in this sprite).
  * VISOR  — the blue helmet visor: hue 195-255, sat>=0.45, val>=0.10.
  * EMBLEM — the gold trim / chest badge: hue 33-62, sat>=0.45, val>=0.28.
  * Black outlines (val<0.34) are matched by NONE of the above and stay byte-identical.
Multi-tone shading is preserved everywhere via a tone remap (target hue+sat, region mid-tone recentred
on the target value, original highlight/shadow spread kept) — same math as recolor_palette --to-tone.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import rgb_hsv, hex2rgb
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── region selectors (evaluated against the ORIGINAL pixel) ─────────────────
def _armor(h, s, v):  return s <= 0.20 and v >= 0.34
def _visor(h, s, v):  return 195 <= h*360 <= 255 and s >= 0.45 and v >= 0.10
def _emblem(h, s, v): return 33 <= h*360 <= 62 and s >= 0.45 and v >= 0.28

REGIONS = [("armor", _armor), ("visor", _visor), ("emblem", _emblem)]

# ── tone remap: paint a captured mask onto target hex, preserving shading spread ──
# floor: a minimum output VALUE for recolored fill pixels. LINE-ART GUARD — on a near-black armor
# target the darkest fill would otherwise collapse onto the (true-black, val≈0) outline strokes and
# adjacent plates would fuse into a blob. Clamping the fill a clear margin above outline-black keeps
# every outline reading as a separating line. Only ever applied to selected FILL pixels (masks exclude
# outlines by construction), so the outlines themselves stay byte-identical.
def paint(px, idxs, target_hex, spread=1.0, to_sat=None, floor=0.0):
    if not idxs:
        return 0
    th, ts, tv = rgb_hsv(*hex2rgb(target_hex))
    if to_sat is not None:
        ts = to_sat
    # pivot = mean value of the ORIGINAL selected pixels (region mid-tone -> target value)
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
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    px = bytearray(img.tobytes())
    # capture ALL region masks from the ORIGINAL simultaneously (disjoint by construction)
    masks = {name: [] for name, _ in REGIONS}
    for i in range(W*H):
        if px[i*4+3] == 0:
            continue
        h, s, v = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
        for name, sel in REGIONS:
            if sel(h, s, v):
                masks[name].append(i)
                break
    total = 0
    for name, _ in REGIONS:
        spec = cfg[name]
        hexv, to_sat = spec[0], spec[1]
        spread = spec[2] if len(spec) > 2 else 1.0
        floor  = spec[3] if len(spec) > 3 else 0.0
        total += paint(px, masks[name], hexv, spread=spread, to_sat=to_sat, floor=floor)
    Image.frombytes("RGBA", (W, H), bytes(px)).save(path[:-4] + f"__{tag}.png")
    return total

# ── the 12 skins: region -> (target_hex, to_sat|None, [spread]) ─────────────
# to_sat forces saturation when a hex's own sat is unhelpful (grayscale silver, near-black, pale ice).
K_BLACK   = ("#101015", 0.10)          # visor black (flattened)
K_WHITE   = ("#F0F2F5", 0.02)          # visor white
K_ICE     = ("#AFD4F0", 0.32)          # visor pale ice-blue (sat kept up so armor gate never re-reads it)
E_GOLD    = ("#C9922E", None)          # emblem gold (base-like, normalized)
E_SILVER  = ("#C6C6CC", 0.03)          # emblem silver
E_BLACK   = ("#141418", 0.10)          # emblem black
E_RED     = ("#C0272B", None)          # emblem red
E_WHITE   = ("#F0F0F0", 0.02)          # emblem white
E_VRED    = ("#E01E1E", None)          # emblem vivid red (obsidian accent)

SKINS = {
    #  tag              armor(hex,sat)        visor       emblem
    "crimson":   dict(armor=("#8F1F1F", None), visor=K_BLACK, emblem=E_GOLD),
    "cobalt":    dict(armor=("#2A4D8F", None), visor=K_ICE,   emblem=E_SILVER),
    "verdant":   dict(armor=("#2E5E3A", None), visor=K_BLACK, emblem=E_GOLD),
    "vanguard":  dict(armor=("#C9922E", None), visor=K_BLACK, emblem=E_BLACK),
    "amethyst":  dict(armor=("#6B3FA0", None), visor=K_BLACK, emblem=E_SILVER),
    "rose":      dict(armor=("#D45A8C", None), visor=K_WHITE, emblem=E_GOLD),
    "slate":     dict(armor=("#4A4A52", 0.10), visor=K_BLACK, emblem=E_RED),
    "sunburst":  dict(armor=("#E8823C", None), visor=K_BLACK, emblem=E_WHITE),
    # obsidian: near-black, but armor lifted to dark charcoal w/ boosted spread + value FLOOR so the
    # black outlines still separate every plate (line-art guard — plain #15151A collapsed into a blob).
    # visor stays the darkest element (a single lens, no internal-plate concern).
    "obsidian":  dict(armor=("#1E1E26", 0.14, 1.45, 0.16), visor=("#141419", 0.12, 1.0, 0.09), emblem=E_VRED),
    "ivory":     dict(armor=("#D8D8D4", 0.03), visor=K_BLACK, emblem=E_GOLD),
    "teal":      dict(armor=("#1E6B6B", None), visor=K_BLACK, emblem=E_SILVER),
    "solar":     dict(armor=("#E8C93B", None), visor=K_BLACK, emblem=E_RED),
}

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const omegaRanger"); rest = src[i+17:]
    j = i+17 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    return sorted(set(re.findall(r'sheet:\s*"\./(omega_ranger_[^"]+)"', block)))

def build(tag, only_sheet=None):
    cfg = SKINS[tag]
    targets = wired_sheets() + ["SPD_Omega_Ranger_mugshot.png"]
    total = 0
    for name in targets:
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        c = recolor(path, tag, cfg)
        total += c
        print(f"  {c:7d}px  {name}")
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only_sheet = sys.argv[2] if len(sys.argv) > 2 else None
    if tag in (None, "all"):
        for t in SKINS:
            print(f"\n=== {t} ===")
            build(t, only_sheet)
    else:
        build(tag, only_sheet)

if __name__ == "__main__":
    main()
