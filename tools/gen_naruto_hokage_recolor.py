"""Generate naruto_hokage recolor-skin sheets from the Color Paletes row.

The default Hokage art is an ORANGE coat + dark pants + blond hair + tan skin.
We re-centre ONLY the orange coat onto a target hue (HSV pivot that preserves the
coat's own light/dark SPREAD so folds survive), leaving hair/skin/black/outline
and any already-non-orange art (the red Four-Tails cloak / gold Rikudou) alone.
Alpha is preserved byte-for-byte (no keying halos). Writes <sheet>__<tag>.png.

5 skins keyed to the palette row: jade / azure / teal / onyx / violet.
Run:  python3 tools/gen_naruto_hokage_recolor.py [preview]
"""
import colorsys
from PIL import Image

ROOT = "."
# base-form distinct sheets referenced by narutoHokage.animationData (+ portrait)
SHEETS = [
    "idle", "run", "dash", "jump", "guard", "hurt", "knockdown", "light", "heavy",
    "up", "strong_down", "air", "intro", "win",
    "rasengan_cast", "rasenshuriken_cast", "doton_cast", "throw_cast", "kuchiyose_cast",
    "chakra_charge", "fourtails", "rikudou",
]
PORTRAIT = "naruto_hokage_portrait.png"

# (target_hue_deg, target_sat, value_spread, value_floor)  — onyx desaturates instead.
PALETTES = {
    "jade":   (108, 0.66, 1.0, 0.06),
    "azure":  (212, 0.70, 1.0, 0.06),
    "teal":   (176, 0.62, 1.0, 0.06),
    "violet": (280, 0.60, 1.0, 0.06),
    "onyx":   (None, 0.10, 1.0, 0.03),   # near-neutral dark coat
}

def is_coat(h, s, v):
    """Orange Hokage coat: warm hue, saturated, not the brighter blond hair."""
    hd = h * 360
    if v < 0.18:            # outline / deep shadow — keep (reads as black trim)
        return False
    if s < 0.50:            # tan skin / neutrals — keep
        return False
    if 5 <= hd <= 44:       # orange coat band
        # exclude bright blond hair (yellower + very bright)
        if hd >= 42 and v >= 0.72:
            return False
        return True
    return False

def recolor(img, spec):
    th, ts, spread, floor = spec
    px = img.load(); W, H = img.size
    pts = []
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            if is_coat(h, s, v):
                pts.append((x, y, v))
    if not pts:
        return 0
    pivot = sum(v for _, _, v in pts) / len(pts)
    for x, y, v in pts:
        nv = max(floor, min(1.0, pivot + (v - pivot) * spread))
        if th is None:                      # onyx: neutral grey-black
            nr = ng = nb = nv
            nb = min(1.0, nv * 1.08)        # a hair of cool tint
        else:
            nr, ng, nb = colorsys.hsv_to_rgb(th/360.0, ts, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

def run(preview=False):
    files = [f"naruto_hokage_{s}_uniform.png" for s in SHEETS] + [PORTRAIT]
    for tag, spec in PALETTES.items():
        total = 0
        for f in files:
            try:
                img = Image.open(f"{ROOT}/{f}").convert("RGBA")
            except FileNotFoundError:
                print("  MISSING", f); continue
            n = recolor(img, spec)
            total += n
            if not preview:
                img.save(f"{ROOT}/{f.replace('.png', f'__{tag}.png')}")
        print(f"{tag:8s} recolored {total} coat px across {len(files)} sheets")

if __name__ == "__main__":
    import sys
    run(preview=("preview" in sys.argv))
