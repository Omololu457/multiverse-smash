#!/usr/bin/env python3
"""Generate Gojo Satoru's FULL head-to-toe recolor skins (__<tag>.png sheets).

Replaces the earlier HAIR-ONLY Gojo skins: each skin now recolors HAIR + MAIN CLOTHING (the
black top) + EYES to the SAME hue family (monochrome-per-skin). Face/skin tone is NEVER touched.
Targeted per-region palette replacement via recolor_palette (multi-tone --to-tone, NOT hue-rotate).
Cosmetic only; zero gameplay. Built + verified one skin at a time (Zenitsu face-bleed discipline).

GOJO REGIONS (measured — tools zone-map on gojo_idle_sheet.png, 112x64 / 4 frames):
  * EYES  — the glowing eyes are exactly ~2px of BRIGHT CYAN (RGB ~70,255,240 → hue175 sat.73 val1.0).
            Uniquely selectable by hue 150-205 + high sat/val; nothing else in the sprite is bright cyan.
            Run FIRST (on the ORIGINAL sprite) so that after HAIR turns blue/etc. the eye pass can't be
            confused by a now-saturated hair of a similar hue. bbox yband 0-0.42 keeps it head-only
            (so an in-hand blue-technique glow on the *_blue_ cast sheets isn't grabbed).
  * HAIR  — white/silver spiky mass (cool white ~195,195,204 + gray mid ~128,119,135). Select near-gray
            (max_sat .24) BRIGHT (min_val .30 skips the black outline+shirt) in the TOP band (bbox yband
            0-0.34). max_warm 16 rejects the warm face/forehead skin that sits in the same band.
  * SHIRT — the MAIN CLOTHING (black top). It is NEAR-BLACK (~15,15,15 — same value as the linework), so
            it's selected as DARK pixels (max_val .30) in the TORSO band (bbox yband 0.30-0.60). The white
            sash + white pants (bright) are excluded by max_val; the warm skin arms are bright+warm too.
            --to-tone with a punchy tone_spread lifts the flat near-black onto the target with light shading.
  * SKIN (face/hands, warm) excluded by every pass (max_warm + brightness gates). PANTS/SASH (white) left
    natural — the brief scopes clothing to the top only.
Pass order: EYES -> HAIR -> SHIRT. Applied PER-FRAME (recolor_palette.recolor_perframe) so every yband is
relative to each pose's own silhouette bbox → no cross-frame face bleed.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_perframe, apply_recolor, _NS
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── region pass builders (bbox-relative ybands; multi-tone preserved) ──────────
def EYES(h):        return dict(from_hue="150-205", min_sat=0.40, min_val=0.55, yband="0.0-0.42", to_tone=h, tone_spread=1.0)
def HAIR(h, sp=1.15): return dict(min_sat=0.0, max_sat=0.24, min_val=0.30, max_val=1.0, max_warm=16, yband="0.0-0.34", to_tone=h, tone_spread=sp)
def SHIRT(h, sp=2.4): return dict(min_sat=0.0, max_sat=1.0, min_val=0.0, max_val=0.30, max_warm=40, yband="0.30-0.60", to_tone=h, tone_spread=sp)

# ── skin table: tag -> (display name, hair hex, clothing hex, eye hex) ──
SKINS = {
    "cerulean": dict(name="Cerulean", hair="#7EC8E3", shirt="#5A9BC4", eyes="#7EC8E3"),
    "amethyst": dict(name="Amethyst", hair="#B9A0DC", shirt="#8A6BB0", eyes="#B9A0DC"),
    "solar":    dict(name="Solar",    hair="#E8823C", shirt="#B85F28", eyes="#E8823C"),
    "rose":     dict(name="Rose",     hair="#F2A8C4", shirt="#C77894", eyes="#F2A8C4"),
}

def passes(cfg):
    return [EYES(cfg["eyes"]), HAIR(cfg["hair"]), SHIRT(cfg["shirt"])]

def wired_sheets():
    """[(sheet_name, cell_w)] scraped from characters.js gojo block (width paired with each gojo_* sheet)."""
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const gojo = {"); rest = src[i+13:]
    j = i+13 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    w = {}
    for m in re.finditer(r'width:\s*(\d+)[^}]*?sheet:\s*"\./(gojo_[^"]+)"', block):
        w.setdefault(m.group(2), int(m.group(1)))
    return sorted(w.items())

def make_portrait(tag):
    """Portrait = a clean bust cropped from the RECOLORED idle sheet (avoids recoloring the cover-art
    portrait's blue sky). Upper ~62% of idle frame 1 (head + shoulders)."""
    idle = os.path.join(ROOT, f"gojo_idle_sheet__{tag}.png")
    im = Image.open(idle).convert("RGBA"); W, H = im.size; cw = W // 4
    fr = im.crop((cw, 0, 2*cw, H)); bb = fr.getbbox()
    if bb:
        x0, y0, x1, y1 = bb
        bust = fr.crop((x0, y0, x1, y0 + int((y1-y0)*0.62)))
    else:
        bust = fr
    bust.save(os.path.join(ROOT, f"gojo_portrait__{tag}.png"))

def build(tag, only_sheet=None):
    cfg = SKINS[tag]; ps = passes(cfg)
    total = 0
    for name, cell_w in wired_sheets():
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        n, changed, per = recolor_perframe(path, tag, cell_w, ps)
        total += changed
        print(f"  {changed:6d}px  {name}  ({n}f)")
    if not only_sheet:
        make_portrait(tag)
        print(f"  portrait -> gojo_portrait__{tag}.png")
    print(f"DONE {tag}: {total}px")

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else None
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if tag == "ALL":
        for t in SKINS:
            print(f"=== {t} ==="); build(t)
        return
    if tag not in SKINS:
        print("skins:", ", ".join(SKINS)); sys.exit(1)
    build(tag, only)

if __name__ == "__main__":
    main()
