#!/usr/bin/env python3
"""Extract Phase-1 FX uniform sheets from P. Per-asset keying."""
import numpy as np
from PIL import Image

ORIG = np.asarray(Image.open("uchiha_madara_jus_2_0_by_pepino78_dao2k4z.png").convert("RGBA")).astype(np.int32)
KEYED = np.asarray(Image.open("madara_war_work/P_keyed.png").convert("RGBA"))
NAVY = np.array([0,64,128])

def cell_pre(y0,y1,x0,x1,pad=2):
    sub = KEYED[y0:y1, x0:x1].copy()
    return _tight(sub,pad)

def cell_navyglobal(y0,y1,x0,x1,tol=70,pad=2):
    sub = ORIG[y0:y1, x0:x1].copy()
    rgb = sub[...,:3]
    near = np.abs(rgb-NAVY).sum(axis=2) <= tol
    out = sub.astype(np.uint8)
    out[near,3] = 0
    return _tight(out,pad)

def _tight(sub,pad):
    mask = sub[...,3] > 8
    if not mask.any(): return None
    ys = np.where(mask.any(axis=1))[0]; xs = np.where(mask.any(axis=0))[0]
    c = sub[ys.min():ys.max()+1, xs.min():xs.max()+1].astype(np.uint8)
    out = np.zeros((c.shape[0]+2*pad, c.shape[1]+2*pad,4),np.uint8)
    out[pad:pad+c.shape[0], pad:pad+c.shape[1]] = c
    return Image.fromarray(out,"RGBA")

def build(name, cells, anchor="bottom"):
    cells = [c for c in cells if c is not None]
    mw = max(c.width for c in cells); mh = max(c.height for c in cells)
    sheet = Image.new("RGBA",(mw*len(cells),mh),(0,0,0,0))
    for i,c in enumerate(cells):
        ox = i*mw + (mw-c.width)//2
        oy = mh-c.height if anchor=="bottom" else (mh-c.height)//2
        sheet.alpha_composite(c,(ox,oy))
    sheet.save(name)
    # magenta proof
    mag = Image.new("RGBA",sheet.size,(255,0,255,255)); mag.alpha_composite(sheet)
    sc = max(1,1400//sheet.width)
    mag.resize((sheet.width*sc,mh*sc),Image.NEAREST).save("madara_war_work/_proof_"+name.replace("/","_")+".png")
    print(f"{name}: {len(cells)}f cell {mw}x{mh} sheet {sheet.size}")
    return mw,mh

# ---- Tornadoes (3) — already clean (cyan on transparent)
build("madara_gunbai_tornado_uniform.png",
      [cell_pre(2315,2410,s,e) for s,e in [(951,1026),(1043,1118),(1140,1215)]], anchor="bottom")

# ---- Goryuka (5): fireball->3 dragon heads — global navy key for pockets
build("madara_goryuka_uniform.png",
      [cell_navyglobal(5505,5595,s,e) for s,e in [(681,721),(749,835),(868,1021),(1066,1219),(1266,1410)]],
      anchor="center")

# ---- Goka Mekkyaku (12): rolling flame wave — global navy key, center-anchored
goka = []
for (y0,y1),spans in [((4647,4800),[(29,86),(97,218),(251,480),(502,737),(779,1013)]),
                       ((4820,4970),[(34,257),(284,506),(536,758),(786,1001)]),
                       ((4985,5125),[(44,188),(282,408),(456,566)])]:
    goka += [cell_navyglobal(y0,y1,s,e) for s,e in spans]
build("madara_goka_mekkyaku_uniform.png", goka, anchor="bottom")
