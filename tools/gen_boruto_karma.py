#!/usr/bin/env python3
# Generate Boruto's MOMOSHIKI KARMA form art: recolor the base-form CRIMSON jacket accent → MAGENTA-PINK
# across every animationData sheet, producing boruto_*_uniform__karma.png. The blue Karma seal markings +
# glowing blue eyes are NOT baked here — they are a procedural draw overlay (game.drawBorutoKarmaOverlay),
# reusing this project's glow-eye/void-aura overlay technique (per the confirmed design). This mirrors the
# form-recolor pattern (Vegeta SSJ/Blue __tag sheets) so abilities.retagFormAnim(base, "karma") resolves.
#
# CRIMSON ACCENT (base form) sampled from boruto_idle_uniform.png: the jacket accent is r-DOMINANT, LOW-green
#   (180,0,50) core + (240,50,110) highlight. Skin (220,160,150 — g high), blonde hair (200,140,20 — g high),
#   black jacket base (dark) and white shirt (all high) are LEFT ALONE. Target = magenta-pink (168,47,106),
#   shaded by the source pixel's own value so the accent's shading ramp is preserved.
import glob, sys
from PIL import Image

# Karma magenta-pink accent (confirmed via pixel sample of the reference): RGB(168,47,106).
TARGET = (168, 47, 106)
# Reference brightness of the base crimson core (r of the dominant (180,0,50) family) → scale anchor.
REF_R = 180.0

def is_crimson_accent(r, g, b, a):
    # r-dominant, low-green jacket accent — excludes warm skin (g high) + blonde hair (g high) + white/black.
    return a > 128 and r > 120 and g < 105 and r > g + 70

def recolor(src):
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load(); n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if is_crimson_accent(r, g, b, a):
                s = max(0.42, min(1.45, r / REF_R))          # preserve the accent's shading ramp
                px[x, y] = (min(255, int(TARGET[0] * s)), min(255, int(TARGET[1] * s)), min(255, int(TARGET[2] * s)), a)
                n += 1
    out = src.replace(".png", "__karma.png")
    im.save(out)
    print(f"OK {out}: {n} crimson→magenta px")
    return n

if __name__ == "__main__":
    srcs = sorted(s for s in glob.glob("boruto_*_uniform.png") if "__" not in s)
    if not srcs:
        print("no boruto_*_uniform.png found (run from repo root)"); sys.exit(1)
    total = sum(recolor(s) for s in srcs)
    print(f"\n{len(srcs)} sheets recolored, {total} total px remapped → boruto_*_uniform__karma.png")
