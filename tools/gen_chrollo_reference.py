#!/usr/bin/env python3
"""Generate Chrollo Lucilfer's canonical "Phantom Troupe" reference-palette alt skin
(__troupe.png sheets + portrait).

WHY A DEDICATED GENERATOR (not a recolor_palette.py one-liner)
-------------------------------------------------------------
Chrollo's sprite is TINY (idle frames ~28px wide). Across the sheets his outfit uses ONE
shared dark-blue palette for BOTH the coat and the trousers (hue ~230-300, low-ish sat, dark
value); the difference between them is purely VERTICAL POSITION, not colour. A pure colour
selection therefore cannot tell coat from trousers. So the coat/trouser split is done by a
per-frame Y-BAND (top ~62% of the character = coat, bottom = trousers), while the other
regions are cleanly colour-separable. Every region is remapped TONE-PRESERVING (each pixel's
relative shading survives) so highlights/shadows are kept, never flattened to a dead colour.
Alpha is preserved. If a region has no pixels in a frame it is a safe no-op.

CANONICAL REFERENCE PALETTE (target colours)
  coat        deep purple   #4A2E5C   <- the dominant, must-nail change (navy -> purple)
  fur trim    white/silver  #E8E4DC   (collar / cuffs)
  trousers    black/charcoal#1A1A1E
  leg-wraps   gray          #8A8A8E   (see FLAG below)
  buttons     gold          #D4A537   (coat-front accents)
  inner lining dark maroon  #5A1F2A   (see FLAG below)

PER-REGION MASK RECIPE (measured from chrollo_idle_uniform.png, verified across sheets)
  COAT      : hue 200-310, sat >= 0.12, per-frame yband < 0.62  -> #4A2E5C tone-preserving
  TROUSERS  : hue 200-310, sat >= 0.12, per-frame yband >= 0.62  -> #1A1A1E tone-preserving
              (trousers are already near-black navy; this nudges them fully neutral-charcoal)
  FUR/SILVER: sat < 0.12, val >= 0.35 (any yband)               -> #E8E4DC tone-preserving
              This low-sat bright band is the collar/cuff fur AND the gray leg-wraps -- both
              are NEUTRAL greys at this resolution and are NOT separable from each other, so
              one silver remap serves both (leg-wraps read as a slightly darker silver by
              virtue of their own lower luminance being preserved).
  BUTTONS   : hue 40-70, sat >= 0.40 (real gold pixels rgb~205,177,71 exist on the coat front
              and at the feet) -> #D4A537 tone-preserving. A genuine, separable micro-region.
  SKIN      : warm hue 5-45, sat >= 0.25 -> UNTOUCHED (face/hands stay natural).

FLAGS (honesty rule -- regions NOT applied because they aren't separable at ~28px)
  * INNER LINING (dark maroon #5A1F2A): the coat's inner lining is at most a 1-2px dark sliver
    that shares the coat's dark-blue value; there is no hue/position gate that isolates it
    from the coat body without smearing maroon across the coat. NOT applied. Flagged.
  * LEG-WRAPS as a DISTINCT gray (#8A8A8E): folded into the FUR/SILVER neutral remap above --
    the leg-wraps are the same low-sat grey family as the fur and cannot be split out cleanly.

Cosmetic only. Multi-frame verified. Tag = troupe. See MEMORY chrollo notes.
"""
import sys, os, colorsys
from PIL import Image

TAG = "troupe"
COAT   = "#4A2E5C"
TROUSER= "#1A1A1E"
FUR    = "#E8E4DC"
GOLD   = "#D4A537"
COAT_TROUSER_SPLIT = 0.62   # per-frame yband fraction: above=coat, below=trousers
# The full-body PORTRAIT is a tall render whose long coat-skirt reaches the very bottom, so
# the sprite's 0.62 split would turn the whole lower coat black. The portrait's actual trousers
# are only a tiny bottom-centre sliver, so it uses a much lower split (almost all = coat).
PORTRAIT_SPLIT = 0.90
ROOT = os.path.join(os.path.dirname(__file__), "..")

# sheet -> frame count (frames only matter for the per-frame coat/trouser yband split).
# Values for wired sheets come from characters.js / abilities.js; ult sheets sliced by their
# on-disk geometry (uniform frames). A wrong frame count only shifts the coat/trouser boundary
# slightly, never mis-colours a region, so this is robust.
FRAMES = {
    "chrollo_block_uniform.png": 2,
    "chrollo_downattack_uniform.png": 7,
    "chrollo_hit_uniform.png": 4,
    "chrollo_idle_uniform.png": 4,
    "chrollo_intro2_uniform.png": 4,
    "chrollo_intro3_uniform.png": 12,
    "chrollo_intro4_uniform.png": 9,
    "chrollo_intro_uniform.png": 7,
    "chrollo_jump_uniform.png": 8,
    "chrollo_kick_uniform.png": 5,
    "chrollo_knifethrust_uniform.png": 5,
    "chrollo_nenbeast_uniform.png": 16,
    "chrollo_nencast_uniform.png": 4,
    "chrollo_punch_uniform.png": 3,
    "chrollo_punchcombo_uniform.png": 9,
    "chrollo_run_uniform.png": 6,
    "chrollo_sidekickcombo_uniform.png": 9,
    "chrollo_skillhunter_cast_uniform.png": 17,
    "chrollo_ult1_uniform.png": 4,
    "chrollo_ult2_uniform.png": 7,
    "chrollo_ult3_uniform.png": 7,
    "chrollo_upattack_uniform.png": 4,
}


def hsv(r, g, b):
    return colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)


def _p(px, x, y, W):
    i = (y * W + x) * 4
    return (px[i], px[i + 1], px[i + 2], px[i + 3])


def _hexrgb(h):
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def is_blue(p):
    r, g, b, a = p
    if a < 128:
        return False
    h, s, v = hsv(r, g, b); hd = h * 360
    return s >= 0.12 and 200 <= hd <= 310


def is_neutral_bright(p):
    r, g, b, a = p
    if a < 128:
        return False
    h, s, v = hsv(r, g, b)
    return s < 0.12 and v >= 0.35


def is_gold(p):
    r, g, b, a = p
    if a < 128:
        return False
    h, s, v = hsv(r, g, b); hd = h * 360
    return s >= 0.40 and 40 <= hd <= 70


def remap_tone(px, coords, target_hex, W, spread=1.0):
    """Tone-preserving remap: shift each selected pixel to target hue/sat but keep its
    relative value (luminance) around the group's pivot, so shading survives."""
    if not coords:
        return 0
    th, ts, tv = hsv(*_hexrgb(target_hex))
    vals = [hsv(*_p(px, x, y, W)[:3])[2] for (x, y) in coords]
    pivot = sum(vals) / len(vals)
    n = 0
    for (x, y) in coords:
        v = hsv(*_p(px, x, y, W)[:3])[2]
        nv = max(0.0, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        i = (y * W + x) * 4
        px[i] = round(nr * 255); px[i + 1] = round(ng * 255); px[i + 2] = round(nb * 255)
        n += 1
    return n


def recolor_frame(px, W, box, split=COAT_TROUSER_SPLIT):
    fx0, fy0, fx1, fy1 = box
    minx, maxx, miny, maxy = fx1, fx0, fy1, fy0
    found = False
    for y in range(fy0, fy1):
        for x in range(fx0, fx1):
            if _p(px, x, y, W)[3] >= 128:
                found = True
                minx = min(minx, x); maxx = max(maxx, x)
                miny = min(miny, y); maxy = max(maxy, y)
    if not found:
        return (0, 0, 0, 0)
    ch = max(1, maxy - miny)

    coat, trouser, fur, gold = [], [], [], []
    for y in range(miny, maxy + 1):
        frac = (y - miny) / ch
        for x in range(minx, maxx + 1):
            p = _p(px, x, y, W)
            if p[3] < 128:
                continue
            if is_gold(p):
                gold.append((x, y))
            elif is_blue(p):
                (coat if frac < split else trouser).append((x, y))
            elif is_neutral_bright(p):
                fur.append((x, y))
            # skin / outline / everything else: untouched
    nc = remap_tone(px, coat, COAT, W, spread=1.15)
    nt = remap_tone(px, trouser, TROUSER, W, spread=1.0)
    nf = remap_tone(px, fur, FUR, W, spread=1.0)
    ng = remap_tone(px, gold, GOLD, W, spread=1.0)
    return (nc, nt, nf, ng)


def process_sheet(path, frames, out_path, split=COAT_TROUSER_SPLIT):
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    px = bytearray(img.tobytes())
    fw = W // frames
    tot = [0, 0, 0, 0]
    for f in range(frames):
        x0 = f * fw
        x1 = W if f == frames - 1 else (f + 1) * fw
        r = recolor_frame(px, W, (x0, 0, x1, H), split)
        for i in range(4):
            tot[i] += r[i]
    Image.frombytes("RGBA", (W, H), bytes(px)).save(out_path)
    return tot


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    grand = [0, 0, 0, 0]
    for name, frames in sorted(FRAMES.items()):
        if only and only not in name:
            continue
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            print(f"  SKIP (missing) {name}"); continue
        out = os.path.join(ROOT, name.replace(".png", f"__{TAG}.png"))
        c, t, fu, g = process_sheet(p, frames, out)
        for i, v in enumerate((c, t, fu, g)):
            grand[i] += v
        print(f"  {name:38} f={frames:2}  coat={c:5} trouser={t:5} fur={fu:5} gold={g:3}")
    # portrait (single frame)
    port = os.path.join(ROOT, "chrollo_portrait.png")
    if os.path.exists(port) and (not only or "portrait" in only):
        c, t, fu, g = process_sheet(port, 1, port.replace(".png", f"__{TAG}.png"), PORTRAIT_SPLIT)
        for i, v in enumerate((c, t, fu, g)):
            grand[i] += v
        print(f"  {'chrollo_portrait.png':38} f= 1  coat={c:5} trouser={t:5} fur={fu:5} gold={g:3}")
    print(f"DONE {TAG}: coat={grand[0]} trouser={grand[1]} fur={grand[2]} gold={grand[3]}")


if __name__ == "__main__":
    main()
