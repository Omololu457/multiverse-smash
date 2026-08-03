#!/usr/bin/env python3
"""Generate Shinobu Kocho's 8 creative alt-color skins (__<tag>.png sheets).

Targeted per-region palette replacement via recolor_palette (NOT hue-rotate). Cosmetic; zero gameplay.

SHINOBU REGIONS (measured — tools/_shinobu_zonemap.py on shinobu_idle_uniform.png, 152x57 / 4 frames):
Her JUS sprite is small, with thick pure-black OUTLINES (v<0.08) that MUST be preserved (never recolored,
same discipline as Batman's cape/outline pass). The distinctive butterfly-wing haori HEM is a saturated
cool→magenta gradient (teal h150-190 + periwinkle h210-290 + pink h320-360), concentrated in the lower body.
  * WING  — butterfly-wing / haori-hem pattern: saturated cool+magenta gradient (hue 150-360, sat>=0.35),
            yband 0.26-1.0 so it grabs the HEM but not the top-of-head eyes/ornament (which read as
            accents, best left alone). Its own region per the brief. Run FIRST on the original sprite so
            the low-sat hair/kimono passes never see it as saturated.
  * EXT   — haori exterior: neutral white (sat<=0.16, val 0.50-1.0). max_warm guards warm-white bleed.
  * HAIR  — dark hair mass: low-sat dark (sat<=0.55, val 0.10-0.36) in the TOP yband 0-0.40. The val floor
            0.10 SKIPS the pure-black outlines (v<0.08); the val ceiling + max_warm skip the bright warm face.
  * KIMONO— inner layer / lower hakama: same dark-low-sat gate in the LOWER yband 0.50-1.0.
  * SASH  — Shinobu's obi is NOT cleanly separable at this resolution (no distinct hue cluster in the
            zonemap) → NO dedicated sash pass. Where a brief lists a sash accent it FOLDS into the nearest
            region (documented per-skin). Flagged, not invented.
  * SKIN (face/hands, warm hue 0-60, bright) excluded by every pass' hue/val/max_warm gates. NIGHT MOTH is
    the exception (full-form near-black incl. face) + a procedural drifting moth-fleck overlay in game.js.
Multi-tone preserved everywhere via --to-tone (keeps each region's highlight/shadow spread; no flatten).

PASS ORDER (universal): KIMONO -> HAIR -> WING -> EXT. Rationale: the dark low-sat passes (KIMONO/HAIR)
run FIRST on the ORIGINAL sprite, where the wing drape is still SATURATED and thus skipped by their
low-sat gate — so they only touch the genuinely dark inner bits. WING then grabs the still-original
saturated gradient. EXT (white haori) runs LAST so that even when a skin's EXT colour lands inside WING's
150-360 hue selection (e.g. Crimson Moth's crimson ~hue353), the black/other WING pass has already run and
cannot re-grab it. White (sat<0.16, val~0.81) survives every earlier pass' gate untouched until EXT.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import apply_recolor, _NS
from gen_rick_creative import void_flatten  # reuse the proven full-form void flattener
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── pass builders ──────────────────────────────────────────────────────────
def WING(h, sp=1.0):   return dict(from_hue="150-360", min_sat=0.35, min_val=0.18, yband="0.26-1.0", to_tone=h, tone_spread=sp)
# EXT (haori white) — FACE-BLEED FIX: Shinobu's pale face is mostly bright LOW-SAT skin (highlights, plus
# neutral & even cool-tinted pixels with r-b≈0), colour-indistinguishable from the white haori, so a plain
# bright-low-sat select paints the whole face in the haori colour ("splash of paint"). max_warm can't catch
# the neutral/cool face pixels. The reliable discriminator is POSITION: the face is the top ~30% of the
# silhouette (below the hair, above the shoulders); the haori white is the shoulders-down torso/sleeves. So
# EXT is applied PER-FRAME with a bbox-relative yband 0.30-1.0 → the face region is excluded, the haori is
# recoloured exactly as before. (Same lesson as Zenitsu's fix: stop the pass from catching face highlights.)
def EXT(h, sp=1.0):    return dict(min_sat=0.0, max_sat=0.16, min_val=0.50, max_val=1.0, max_warm=30, yband="0.30-1.0", to_tone=h, tone_spread=sp)
def HAIR(h, sp=1.0):   return dict(min_sat=0.0, max_sat=0.55, min_val=0.10, max_val=0.36, yband="0-0.40", max_warm=18, to_tone=h, tone_spread=sp)
def KIMONO(h, sp=1.0): return dict(min_sat=0.0, max_sat=0.55, min_val=0.10, max_val=0.36, yband="0.50-1.0", max_warm=18, to_tone=h, tone_spread=sp)

# ── skin table: tag -> region colors (+ optional order / spreads) ──
SKINS = {
    # 1 — white/red/gold Albedo homage (matches Gojo/Rengoku's Albedo). Sash-gold NOT separable → folded (flagged).
    "albedo":      dict(hair="#E8E4DC", ext="#E8E4DC", wing="#8F1F1F", kimono="#1A1A1A"),
    # 2 — deep violet-lavender wisteria motif.
    "wisteria":    dict(hair="#2A1F3A", ext="#9E7FC4", wing="#4A2E6B", kimono="#D8CCE8"),
    # 3 — deep green / gold.
    "emeraldwing": dict(hair="#1A1A1A", ext="#2E5E3A", wing="#D4A537", kimono="#B8E0C4"),
    # 4 — bold red/black. WING target is BLACK; the universal order (WING before EXT) keeps the crimson
    #     haori from being re-grabbed by the black wing pass.
    "crimsonmoth": dict(hair="#1A1A1A", ext="#8F1F2A", wing="#1A1A1A", kimono="#E8D0D4"),
    # 5 — vivid cobalt blue.
    "cobalt":      dict(hair="#1A1A1A", ext="#2A5DB8", wing="#B8D9E8", kimono="#F2F2F2"),
    # 6 — soft rose-pink.
    "rosequartz":  dict(hair="#1A1A1A", ext="#D98BA8", wing="#B8547A", kimono="#F2F2F2"),
    # 7 — warm amber/gold.
    "amberglow":   dict(hair="#1A1A1A", ext="#C9922E", wing="#3B2A14", kimono="#EDE0C0"),
    # 8 — full-form near-black + procedural moth-fleck overlay (game.js drawMothOverlay).
    "nightmoth":   dict(void="#0F0F12"),
}

# WHOLE-SHEET passes (confirmed correct — unchanged): dark inner first (skip the still-saturated wing
# drape), then WING. EXT (haori white) is applied SEPARATELY, PER-FRAME (see recolor_skin) so its
# face-excluding bbox-relative yband is correct on every pose.
def whole_sheet_passes(cfg):
    return [KIMONO(cfg["kimono"]), HAIR(cfg["hair"]), WING(cfg["wing"])]

def recolor_skin(path, tag, cfg, cell_w):
    """KIMONO/HAIR/WING whole-sheet (exactly as the confirmed batch) → EXT per-frame (face-excluded)."""
    img = Image.open(path).convert("RGBA")
    total = 0
    for opts in whole_sheet_passes(cfg):
        img, c = apply_recolor(img, _NS(**opts)); total += c
    # EXT per-frame: yband is relative to EACH frame's own opaque bbox → the face (top of the silhouette)
    # is reliably excluded regardless of the pose's vertical placement in the cell.
    W, H = img.size
    n = max(1, W // cell_w)
    ext = _NS(**EXT(cfg["ext"]))
    for i in range(n):
        box = (i * cell_w, 0, (i + 1) * cell_w, H)
        frame = img.crop(box)
        bb = frame.getbbox()
        if bb is None:
            continue
        content = frame.crop(bb)
        content, c = apply_recolor(content, ext); total += c
        frame.paste(content, (bb[0], bb[1])); img.paste(frame, box)
    img.save(path[:-4] + f"__{tag}.png")
    return total

def wired_sheets():
    """Return [(sheet_name, cell_w)] scraped from characters.js (width paired with each shinobu_* sheet)."""
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const shinobu"); rest = src[i+13:]
    j = i+13 + (rest.index("\nconst ") if "\nconst " in rest else len(rest))
    block = src[i:j]
    w = {}
    for m in re.finditer(r'width:\s*(\d+)[^}]*?sheet:\s*"\./(shinobu_[^"]+)"', block):
        w.setdefault(m.group(2), int(m.group(1)))
    return sorted(w.items())

def build(tag, only_sheet=None):
    cfg = SKINS[tag]
    # portrait is a single (non-strip) image → treat as one frame (cell_w = full width via 1e9 guard).
    targets = wired_sheets() + [("shinobu_portrait.png", None)]
    total = 0
    for name, cell_w in targets:
        if only_sheet and only_sheet not in name:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        if cfg.get("void"):
            img = Image.open(path).convert("RGBA")
            c = void_flatten(img, cfg["void"])
            img.save(path[:-4] + f"__{tag}.png")
        else:
            cw = cell_w or Image.open(path).width   # portrait: whole image is one frame
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
