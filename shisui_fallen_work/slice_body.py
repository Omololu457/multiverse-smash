#!/usr/bin/env python3
"""Slice Shisui (Fallen) body + normals from the Fallen-recoloured H into feet-aligned *_uniform.png sheets."""
import numpy as np
from PIL import Image
F = np.asarray(Image.open("shisui_fallen_work/H_fallen.png").convert("RGBA"))

def crop(y0, y1, x0, x1, pad=2):
    sub = F[y0:y1, x0:x1]; m = sub[..., 3] > 16
    if not m.any(): return None
    ys = np.where(m.any(axis=1))[0]; xs = np.where(m.any(axis=0))[0]
    c = sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    o = np.zeros((c.shape[0]+2*pad, c.shape[1]+2*pad, 4), np.uint8); o[pad:pad+c.shape[0], pad:pad+c.shape[1]] = c
    return Image.fromarray(o, "RGBA")

def even(x0, x1, n): w = (x1 - x0) // n; return [(x0+i*w, x0+(i+1)*w) for i in range(n)]

def build(name, y0, y1, spans, anchor="bottom"):
    cells = [crop(y0, y1, s, e) for s, e in spans]; cells = [c for c in cells if c]
    mw = max(c.width for c in cells); mh = max(c.height for c in cells)
    sh = Image.new("RGBA", (mw*len(cells), mh), (0,0,0,0))
    for i, c in enumerate(cells):
        oy = mh - c.height if anchor == "bottom" else (mh - c.height)//2
        sh.alpha_composite(c, (i*mw + (mw - c.width)//2, oy))
    sh.save(name); print(f"{name}: {len(cells)}f cell {mw}x{mh}")
    return mw, mh

build("shisui_fallen_idle_uniform.png",  480, 565, [(7,32),(72,97)])
build("shisui_fallen_run_uniform.png",   558, 655, even(8, 409, 6))
build("shisui_fallen_jump_uniform.png",  645, 735, [(7,50),(62,101),(124,161),(174,231)])
build("shisui_fallen_guard_uniform.png", 735, 835, [(8,54),(92,123)])
build("shisui_fallen_hurt_uniform.png",  828, 922, [(7,62),(94,121),(144,188),(203,253),(273,302),(321,367)])
build("shisui_fallen_knockdown_uniform.png", 918, 1000, [(9,86),(192,260),(276,307),(326,363)])
build("shisui_fallen_light_uniform.png", 1248, 1345, [(9,65),(76,139),(273,305),(327,372),(383,428),(434,468),(475,527),(542,594),(610,643)])
build("shisui_fallen_heavy_uniform.png", 2178, 2260, [(4,69),(77,145),(152,272),(276,353),(361,395),(402,436),(443,477)])
build("shisui_fallen_up_uniform.png",    2622, 2710, [(3,50),(69,126),(135,201),(208,263)])
build("shisui_fallen_air_uniform.png",   1055, 1140, [(10,34),(67,91),(123,147)])
build("shisui_fallen_kunai_uniform.png", 998, 1080, [(9,38),(54,104),(122,168)])
build("shisui_fallen_finisher_uniform.png", 2938, 3045, [(3,51),(64,168),(183,244),(280,436),(452,515),(526,577),(594,626)])
build("shisui_fallen_intro_uniform.png", 378, 458, [(19,31),(43,68),(96,133),(155,192),(215,252)], anchor="bottom")
# portrait / cut-in illustration (exclude credit box at x504+)
port = crop(0, 362, 0, 466, pad=0)
port.save("shisui_fallen_portrait.png"); print("portrait", port.size)
# Mangekyou focus pose (for Sharingan Glare / Kotoamatsukami) — the standing figure (2nd cell)
build("shisui_fallen_mangekyou_uniform.png", 2735, 2810, [(49,97)])
