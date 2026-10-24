#!/usr/bin/env python3
"""Pack selected connected-components into uniform per-action strips.

Reads a geo_<tag>.json (produced by extract.py), an action map (action -> ["r.c", ...]),
cuts each component on the chroma/alpha mask, and packs frames into a UNIFORM cell:
feet-baseline aligned (bottom), horizontally centered on the body bbox.
Emits <out>_<action>_uniform<suffix>.png strips + prints animationData dims.

Nearest-neighbour only. No recolor, no invented art.
"""
import sys, json
import numpy as np
from PIL import Image

def mask_of(path, bg):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    if bg is None:
        fg = a[:,:,3] > 16
    else:
        rgb = a[:,:,:3].astype(np.int16)
        fg = np.abs(rgb - np.array(bg, dtype=np.int16)).sum(axis=2) > 0
    return im, a, fg

def cut(a, fg, b):
    crop = a[b["y0"]:b["y1"], b["x0"]:b["x1"]].copy()
    m = fg[b["y0"]:b["y1"], b["x0"]:b["x1"]]
    crop[~m] = (0,0,0,0)
    return Image.fromarray(crop, "RGBA")

def main(cfg_path):
    cfg = json.load(open(cfg_path))
    src = cfg["src"]; suffix = cfg.get("suffix",""); out = cfg["out"]
    bg = cfg.get("bg")  # [r,g,b] or null
    geo = json.load(open(cfg["geo"]))
    idx = {}
    for r in geo["rows"]:
        for it in r["items"]:
            idx[f"{it['r']}.{it['c']}"] = it
    im, a, fg = mask_of(src, bg)
    pad = cfg.get("pad", 4)
    dims = {}
    for action, keys in cfg["actions"].items():
        imgs = []
        for k in keys:
            if k not in idx:
                print(f"  !! {action}: missing {k}"); continue
            imgs.append(cut(a, fg, idx[k]))
        if not imgs:
            print(f"  !! {action}: no frames"); continue
        cw = max(i.width for i in imgs) + pad*2
        ch = max(i.height for i in imgs) + pad*2
        strip = Image.new("RGBA", (cw*len(imgs), ch), (0,0,0,0))
        for n,i in enumerate(imgs):
            x = n*cw + (cw - i.width)//2          # horizontal center
            y = ch - pad - i.height               # feet baseline (bottom)
            strip.alpha_composite(i, (x,y))
        fn = f"{out}_{action}_uniform{suffix}.png"
        strip.save(fn)
        dims[action] = {"frames": len(imgs), "width": cw, "height": ch}
        print(f"  {action:10s} -> {fn}  {len(imgs)}f {cw}x{ch}")
    json.dump(dims, open(f"ben10_work/dims_{cfg.get('tag','x')}.json","w"), indent=2)
    print("DIMS:", json.dumps(dims))

if __name__ == "__main__":
    main(sys.argv[1])
