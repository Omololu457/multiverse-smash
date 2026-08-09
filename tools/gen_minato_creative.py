#!/usr/bin/env python3
"""Minato Namikaze — 12 GENUINELY creative alt-skins: HAIR + OUTFIT + ACCENT all recolor together as a
coordinated palette identity (same bar as the Maki/Hisoka/Gojo-redo creative batches), NOT flat single-
region recolors. Minato's FIRST dedicated skin batch. Cosmetic only — ZERO gameplay/stat changes.

FOUR independently-targeted classes, decided ONCE from the ORIGINAL pixels (capture-masks-first =
contamination-proof; recoloring hair never shifts the outfit/accent masks). Each pixel is assigned to at
most one class, in priority order so regions never overlap:
  * OUTLINE — near-black line-art (s<0.25 & v<0.22). PROTECTED — every stroke stays a fixed coloring-book
              boundary (the line-art-boundary preservation rule): masks only touch hair/outfit/accent, so
              no bleed / blobby merge.
  * SKIN    — warm face + hands + ankles (8<=h<=45, 0.15<=s<=0.72, v>=0.55). PROTECTED (face excluded).
              Matched BEFORE hair so the peachy/pale-cream face highlights (h~40, s~0.4 — too yellow for a
              tight skin hue, too desaturated to be blond) aren't recolored as outfit; the sat<=0.72 CEILING
              keeps fully-saturated blond gold (s~1.0) out of skin so the hair still recolors.
  * HAIR    — blond spikes (25<=h<=58, s>=0.55) — very saturated gold, distinct from the lower-sat skin.
  * ACCENT  — the red flame trim at the haori hem (h>=335 or h<=16, s>=0.45) — matched after skin so
              orange-red flame shadow (v<0.55) is taken but peachy skin (v>=0.55) is not.
  * OUTFIT  — everything else opaque: the white/cream Hokage haori (multi-tone: white highlight + gray +
              shadow), the dark navy undersuit, and the olive flak jacket, all recolored together so the
              outfit reads as ONE coherent garment identity. BIMODAL/wide value spread preserved by to-tone.

paint(): to-tone re-centre on the target hue/sat at the target value, preserving each region's own
light/dark SPREAD (multi-tone shading kept). `floor` keeps a near-black target a margin above outline-black
so it never fuses into the outline; `to_sat` sets output saturation (low for white/cream); `spread`
widens/narrows shading contrast.

VOID FLASH (voidflash) is the black-base half of the Void-family technique: EVERY class (incl. skin/face)
is flattened to near-black so the silhouette reads as a void; game.js drawVoidFlashOverlay adds the drifting
golden-yellow Flying-Raijin sparks on top (Part B). Same proven pattern as Maki Void Hunter / Superman
Phantom Zone / Rick Void Form.

USAGE: gen_minato_creative.py [tag|group N|all|debug]     # default: all 12
"""
import os, sys, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def classify(h, s, v, void=False):
    if s < 0.25 and v < 0.22:                        return "OUTLINE"
    if void:                                          # VOID FLASH: flatten everything (incl. skin) to void
        return "OUTFIT" if not (s < 0.25 and v < 0.22) else "OUTLINE"
    if 8 <= h <= 45 and 0.15 <= s <= 0.72 and v >= 0.55: return "SKIN"
    if 25 <= h <= 58 and s >= 0.55:                  return "HAIR"
    if (h >= 335 or h <= 16) and s >= 0.45:          return "ACCENT"
    return "OUTFIT"

def hex2rgb(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def paint(px, pts, hexcol, to_sat, floor, spread):
    """Re-tone the classified region pixels onto the target, preserving per-region value spread."""
    if not pts: return 0
    tr, tg, tb = hex2rgb(hexcol)
    th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    ts = to_sat
    vals = [colorsys.rgb_to_hsv(px[x, y][0]/255, px[x, y][1]/255, px[x, y][2]/255)[2] for (x, y) in pts]
    pivot = sum(vals) / len(vals)
    for (x, y), v in zip(pts, vals):
        nv = max(floor, min(1.0, tv + (v - pivot) * spread))
        nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        a = px[x, y][3]
        px[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return len(pts)

# each region tuple = (hex, to_sat, floor, spread)
SKINS = {
    # NOTE: OUTFIT lumps the white haori (25% of pixels at full value) + navy undersuit + olive flak. A
    # HIGH spread would blow the white haori up to light gray → "black outfit" reads gray. The black/dark
    # targets use a COMPRESSED spread (~0.62) so every outfit pixel stays dark (≤~0.34) yet keeps fold
    # shading. The WHITE target (ivoryseal) keeps a high spread so it stays bright with gray shadows.
    # ── GROUP 1 ──
    "crimsonflash":  dict(hair=("#B01E28", 0.80, 0.16, 1.15), outfit=("#141414", 0.05, 0.09, 0.62), accent=("#D8202E", 0.86, 0.34, 1.05)),
    "cobaltstrike":  dict(hair=("#1E3A8C", 0.78, 0.16, 1.15), outfit=("#131417", 0.10, 0.09, 0.62), accent=("#5AC8F0", 0.62, 0.44, 1.05)),
    "emeraldsage":   dict(hair=("#1E6B3A", 0.72, 0.15, 1.15), outfit=("#141414", 0.05, 0.09, 0.62), accent=("#D4A82E", 0.78, 0.34, 1.05)),
    "obsidianhokage":dict(hair=("#131318", 0.22, 0.08, 0.95), outfit=("#17171C", 0.16, 0.10, 0.60), accent=("#E8B923", 0.85, 0.40, 1.05)),
    # ── GROUP 2 ──
    "amethystflicker":dict(hair=("#5A2A93", 0.70, 0.16, 1.15), outfit=("#141216", 0.10, 0.09, 0.62), accent=("#A85CE8", 0.62, 0.40, 1.05)),
    "rosetempest":   dict(hair=("#E68DB4", 0.42, 0.48, 1.18), outfit=("#4A1F28", 0.58, 0.13, 0.62), accent=("#EE6CA3", 0.55, 0.42, 1.05)),
    "ivoryseal":     dict(hair=("#ECE7DC", 0.07, 0.54, 1.22), outfit=("#EEECE4", 0.05, 0.55, 1.28), accent=("#18181E", 0.12, 0.06, 1.05)),
    # GOLDEN LEGACY — a RICHER, DEEPER amber-gold, NOT natural blond. Lower target value + a COMPRESSED
    # spread (0.82) so the bright blond highlights (natural v~0.9 → bright yellow #E5AC00) are pulled down
    # to a deep amber, and a warmer amber hue (~40 vs blond ~43). Real separation = clearly darker + amber.
    "goldenlegacy":  dict(hair=("#9A6D0F", 0.93, 0.24, 0.82), outfit=("#141414", 0.05, 0.09, 0.62), accent=("#E6B62E", 0.84, 0.42, 1.05)),
    # ── GROUP 3 ──
    "tealsealmaster":dict(hair=("#177A72", 0.80, 0.16, 1.15), outfit=("#141414", 0.05, 0.09, 0.62), accent=("#28D0C0", 0.80, 0.42, 1.05)),
    "ashenveteran":  dict(hair=("#4A4A50", 0.08, 0.26, 1.05), outfit=("#2C2C30", 0.07, 0.15, 0.72), accent=("#7A2A24", 0.68, 0.17, 1.05)),
    "voidflash":     dict(hair=("#0F0F14", 0.18, 0.06, 0.32), outfit=("#101015", 0.16, 0.06, 0.30), accent=("#0F0F14", 0.18, 0.06, 0.32)),
    "stormseal":     dict(hair=("#33517E", 0.58, 0.27, 1.15), outfit=("#2B2E34", 0.11, 0.15, 0.72), accent=("#30D8EE", 0.80, 0.44, 1.05)),
}
GROUPS = {1: ["crimsonflash", "cobaltstrike", "emeraldsage", "obsidianhokage"],
          2: ["amethystflicker", "rosetempest", "ivoryseal", "goldenlegacy"],
          3: ["tealsealmaster", "ashenveteran", "voidflash", "stormseal"]}

def base_sheets():
    import re
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("const minato = {"); j = i + src[i:].index("export const characters")
    sheets = sorted(set(re.findall(r'sheet:\s*"\./(minato[a-z0-9_]+\.png)"', src[i:j])))
    return sheets

def targets():
    return sorted(set(base_sheets()) | {"minato_portrait.png"})

def recolor(path, cfg, void=False):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    regions = {"HAIR": [], "OUTFIT": [], "ACCENT": []}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v, void)
            if c in regions: regions[c].append((x, y))
    n = 0
    n += paint(px, regions["HAIR"],   *cfg["hair"])
    n += paint(px, regions["OUTFIT"], *cfg["outfit"])
    n += paint(px, regions["ACCENT"], *cfg["accent"])
    return img, n

def debug_mask(path):
    """Write a colorized class map next to the idle sheet so regions can be eyeballed before committing."""
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    COLORS = {"OUTLINE": (0,0,0), "SKIN": (255,150,150), "HAIR": (255,230,0),
              "ACCENT": (255,0,0), "OUTFIT": (0,120,255)}
    out = Image.new("RGBA", (W, H), (30,30,30,255)); op = out.load()
    counts = {}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            c = classify(h, s, v)
            counts[c] = counts.get(c, 0) + 1
            op[x, y] = COLORS[c] + (255,)
    dst = os.path.join(ROOT, "harness", "shots", "minato_classmask.png")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.resize((W*4, H*4), Image.NEAREST).save(dst)
    print("class counts:", counts)
    print("wrote", dst)

def run(tags):
    tgts = targets()
    for tag in tags:
        cfg = SKINS[tag]; void = (tag == "voidflash")
        total = 0
        for sheet in tgts:
            src = os.path.join(ROOT, sheet)
            if not os.path.exists(src): print("  MISSING", sheet); continue
            img, n = recolor(src, cfg, void); total += n
            out = os.path.join(ROOT, sheet.replace(".png", f"__{tag}.png"))
            img.save(out)
        print(f"{tag:16s} {len(tgts)} sheets, {total} px recolored")

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "debug":
        debug_mask(os.path.join(ROOT, "minato_idle_uniform.png"))
    elif arg == "all":
        run([t for g in (1,2,3) for t in GROUPS[g]])
    elif arg == "group":
        run(GROUPS[int(sys.argv[2])])
    else:
        run([arg])
