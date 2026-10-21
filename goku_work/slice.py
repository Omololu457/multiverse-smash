#!/usr/bin/env python3
"""Phase 3a: slice per-action UNIFORM STRIPS from the base sheet + the six form
full-sheets (same layout → same source coords). Each strip = N frames in uniform
W×H cells, feet-anchored (content bottom at cell bottom, h-centred), teal bg so the
engine's teal/green key makes it transparent. Output: goku_<form>_<action>_uniform.png
at repo root (matching the engine's ./goku_base_<action>_uniform.png convention).

Source sheets are only READ.
"""
import sys, json
import numpy as np
from PIL import Image

SHEETS = {
    "base": "assets/source/goku_original.png",
    "ssj":  "assets/goku_forms/goku_ssj.png",
    "ssj2": "assets/goku_forms/goku_ssj2.png",
    "ssj3": "assets/goku_forms/goku_ssj3.png",
    "god":  "assets/goku_forms/goku_god.png",
    "blue": "assets/goku_forms/goku_blue.png",
    "ui":   "assets/goku_forms/goku_ui.png",
}
TEAL = (0, 128, 128, 255)

# action -> list of (x,y,w,h) tight source bboxes (from the committed inventory)
PICKS = {
 "idle":      [(1,15,48,53),(52,16,48,52),(101,16,48,52),(150,15,48,53),(200,15,48,53),(250,14,48,54)],
 "walk":      [(109,493,42,60),(161,508,38,45),(202,490,43,63),(267,501,49,52)],
 "jump":      [(318,489,39,64),(360,488,39,65),(403,499,44,54)],
 "crouch":    [(1,431,57,41),(62,432,57,40)],
 "guard":     [(0,506,45,47),(53,513,47,40)],
 "hurt":      [(1197,496,44,52)],
 "knockdown": [(326,608,68,24)],
 "getup":     [(395,594,34,38)],
 "kiCharge":  [(166,172,32,64),(203,172,33,64),(237,172,34,64),(273,172,36,64),
               (310,172,36,64),(348,172,36,64),(386,171,36,65),(423,171,36,65)],
 "win":       [(319,17,42,51),(364,18,36,50),(403,21,40,47),(444,12,37,56),
               (482,13,37,55),(524,12,38,56),(588,13,43,56),(638,17,50,52)],
}
PAD = 3
TEAL_TOL = 28      # teal → transparent key (sprite colours are all >TOL away from #008080)

def key_teal(crop):
    """Return an RGBA crop with near-teal pixels made fully transparent."""
    a = np.array(crop.convert("RGBA"))
    rgb = a[:, :, :3].astype(int)
    teal = (np.abs(rgb - np.array([0, 128, 128])).sum(2) <= TEAL_TOL)
    a[teal, 3] = 0                              # alpha 0 on the teal background
    return Image.fromarray(a, "RGBA")

def build_strip(sheet_img, frames):
    cellw = max(w for _,_,w,_ in frames) + PAD*2
    cellh = max(h for _,_,_,h in frames) + PAD*2
    strip = Image.new("RGBA", (cellw*len(frames), cellh), (0, 0, 0, 0))   # TRANSPARENT cells
    for i,(x,y,w,h) in enumerate(frames):
        crop = key_teal(sheet_img.crop((x,y,x+w,y+h)))
        cx = i*cellw + (cellw - w)//2          # h-centre
        cy = cellh - PAD - h                    # feet to bottom (anchorY 0)
        strip.paste(crop, (cx, cy), crop)      # use alpha as the paste mask
    return strip, cellw, cellh

def main(forms=None):
    forms = forms or list(SHEETS)
    meta = {}
    imgs = {f: Image.open(p).convert("RGBA") for f,p in SHEETS.items() if f in forms}
    for form in forms:
        img = imgs[form]
        for action, frames in PICKS.items():
            strip, cw, ch = build_strip(img, frames)
            out = f"goku_{form}_{action}_uniform.png"
            strip.save(out)
            meta[action] = {"frames": len(frames), "width": cw, "height": ch}
    json.dump(meta, open("goku_work/_strip_meta.json","w"), indent=1)
    print("strip cell dims (action: frames/w/h):")
    for a,m in meta.items():
        print(f"  {a:10s} frames={m['frames']} {m['width']}x{m['height']}")
    print(f"wrote strips for forms: {forms}")

if __name__ == "__main__":
    main(sys.argv[1:] or None)
