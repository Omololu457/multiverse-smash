#!/usr/bin/env python3
"""Compose labeled Albedo theme contact sheets from tools/albedo/render_frames.mjs output.
USAGE: python3 tools/albedo/contact_sheets.py <framesDir> <outDir>
One PNG per form: rows = samples (idle, attack), columns = default + 20 themes, labeled; gameplay scale (x2) and an
enlarged nearest-neighbour copy (x4) for the human appearances. Deterministic (no AA: NEAREST only)."""
import json, os, sys
from PIL import Image, ImageDraw

THEMES = ["default", "scarletInversion", "ashenPrototype", "redSingularity", "redlineVirus", "bloodPrism", "rubyFacet", "crimsonWinter",
          "hauntedSignal", "redResonance", "whiteFurnace", "redSun", "scarletProtocol", "negativeVelocity", "cursedRose",
          "violetReversal", "imperialPearl", "crimsonVictory", "magentaAftershock", "falseEmperor", "rubyOpal"]
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
idx = json.load(open(os.path.join(src, "index.json")))

def sheet(form, scale, name):
    rows = idx[form]
    ims0 = {(r, t): Image.open(os.path.join(src, form, f"{r}__{t}.png")).convert("RGBA") for r in rows for t in THEMES}
    ims = ims0
    if max(i.height for i in ims.values()) > 120 and scale > 1: scale = 1      # big resampled forms (Jetray, Water Hazard…) at native size
    cw = max(i.width for i in ims.values()) * scale + 8
    ch = max(i.height for i in ims.values()) * scale + 8
    LBL = 26
    W, H = cw * len(THEMES), (ch + LBL) * len(rows) * 2 + 4
    o = Image.new("RGB", (W, H), (16, 16, 20)); d = ImageDraw.Draw(o)
    for bi, bg in enumerate([(232, 232, 236), (36, 38, 48)]):            # bright stage / dark stage backgrounds
        for ri, r in enumerate(rows):
            y0 = (bi * len(rows) + ri) * (ch + LBL)
            for ti, t in enumerate(THEMES):
                x0 = ti * cw
                d.rectangle([x0, y0 + LBL, x0 + cw - 2, y0 + LBL + ch - 2], fill=bg)
                im = ims[(r, t)]; im2 = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
                o.paste(im2, (x0 + 4, y0 + LBL + ch - 4 - im2.height), im2)
                lab = f"{ti:02d} {t}" if t != "default" else "default"
                d.text((x0 + 2, y0 + 2), lab[:22], fill=(255, 230, 120)); d.text((x0 + 2, y0 + 13), ("bright " if bi == 0 else "dark ") + r.split("_uniform")[0][-14:], fill=(160, 160, 170))
    o.save(os.path.join(out, name), optimize=True)

for form in idx:
    sheet(form, 2, f"{form}_themes.png")
    if form in ("older", "kid"):
        sheet(form, 4, f"{form}_themes_x4.png")
print("sheets", len(idx))
