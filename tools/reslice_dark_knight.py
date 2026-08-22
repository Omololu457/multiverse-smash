#!/usr/bin/env python3
"""
reslice_dark_knight.py — STAGE 1 slicer for the NEW Batman variant (rosterKey "dark_knight").

Source: df2ek1u-37586e42-9a55-49e4-8390-5496e4e247c4.png (5120x2880, RGBA, TRUE per-pixel alpha —
NO chroma key, unlike every other sheet in this project). We slice by explicit alpha-bounded frame
boxes gathered from the Stage-0 investigation (see BATMAN_VARIANT_ASSET_MAP.md).

Standard form is built from the LARGER lower-set (owner decision): idle ~229px tall grey-suit Batman.

Each action -> one horizontal uniform strip dark_knight_<action>_uniform.png, frames packed into a
common cell (cellW=max w, cellH=max h) and FEET-ALIGNED (bottom-center) so the runtime fixed-cell
sampler shows planted feet with no jitter. Prints the frame/cell dims for characters.js.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "df2ek1u-37586e42-9a55-49e4-8390-5496e4e247c4.png")

# (x, y, w, h) tight alpha bounds in full-sheet coords. Verified visually in Stage 1.
# ★SMOOTHNESS REBUILD (2026-08-22): idle+walk moved from the frame-SPARSE lower set (2f/4f) to the frame-RICH
# UPPER set (y131 idle row / y276 walk row) — SAME grey-suit style, SAME ~128px size (Stage-0's "1.8× larger
# lower set" was a mismeasurement vs the lower set's expansive cape poses), but 10-frame idle + 10-frame walk =
# genuinely smooth movement instead of a 2-pose robotic stance. Owner-flagged the old build as choppy/robotic.
FRAMES = {
    # 10-frame breathing/weight-shift idle (upper-set row1; dropped the narrow 11th cape-tuck frame)
    "idle":  [(5,131,110,133), (116,131,110,133), (229,131,116,133), (345,131,125,133), (474,131,118,133),
              (596,131,116,133), (716,131,120,134), (841,131,119,134), (965,131,118,133), (1088,131,120,133)],
    # 10-frame forward WALK cycle (upper-set row2; tall box + alpha-crop finds the full figure)
    "walk":  [(4,276,150,146), (192,276,112,146), (310,276,112,146), (425,276,112,146), (552,276,112,146),
              (678,276,112,146), (806,276,112,146), (962,276,112,146), (1081,276,112,146), (1191,276,90,146)],
    # 5-frame CAPE-WRAP evade — arm raised, cape swept across to conceal, then emerge. Featured "dodge".
    "dodge": [(535,1943,142,131), (687,1943,142,131), (839,1943,131,132), (968,1943,115,132), (1097,1943,138,132)],
    # single clean crouch/duck (kneeling, cape draped)
    "crouch":[(833,2210,119,124)],
    # 6-frame glide/dive — cape spread into bat-wing shapes (serves jump/fall/air too). Two source baselines.
    "glide": [(7,2396,168,101), (223,2396,218,128), (451,2396,199,121), (649,2436,157,118), (816,2436,119,147), (934,2436,72,132)],
    # prone/knockdown (real KO art from the lower set) — used for knockdown state
    "knockdown":[(1369,1948,152,111)],
}

# ── STAGE 2 NORMALS (side-view melee poses from the lower set). Rough boxes; tightened to alpha bbox. ──
# light = quick jab (arm-forward startup -> extended). heavy = cocked windup -> committed LUNGE punch
# (long reach). air = leaping/flying DROPKICK. crouchlight = low sweep. up-attack REUSES heavy; down_air
# REUSES air (no dedicated uppercut / down-aerial art in the standard set — FLAGGED in characters.js).
ATTACK_FRAMES = {
    "light":       [(1845,1935,140,130), (1976,1935,140,130)],
    "heavy":       [(2415,1935,145,135), (2105,1935,175,135)],
    "air":         [(1550,2182,185,140)],
    "crouchlight": [(1862,2200,205,140)],
}

def tighten(src, box):
    x,y,w,h = box[:4]
    cell = src.crop((x, y, x+w, y+h))
    bb = cell.getbbox()
    if not bb: return (x,y,w,h), cell
    cx0,cy0,cx1,cy1 = bb
    return (x+cx0, y+cy0, cx1-cx0, cy1-cy0), cell.crop(bb)

# ── STAGE 4 SPECIALS (cast poses + one projectile sprite). 5th tuple element = flip horizontally so the
# frame faces the canonical RIGHT direction (the engine flips per fighter.facing). From the lower-set
# weapon frames. crescent = Batman throw pose (flipped) + a separate crescent-hook PROJECTILE sprite. ──
SPECIAL_FRAMES = {
    "flail":         [(2905,2145,235,150,False)],   # Fwd — chain-flail swing (weighted ball long reach)
    "pistol":        [(3525,2508,185,128,False)],   # Back — lunging pistol shot, arm extended R (+ procedural bullet)
    "cape":          [(3178,2162,228,180,False)],   # Down — cape-spin spread (AoE); box re-tightened to drop flail-ball bleed (visual audit)
    "dive":          [(200,2388,240,140,False)],    # Air — head-down cape dive-bomb
    "crescent":      [(3555,2262,215,182,False)],   # Neutral — DYNAMIC crescent-chain swing (blade arcs up-right, faces R); was a static neutral pose (visual-audit fix)
    "crescentblade": [(3448,2285,98,74,True)],      # crescent-hook PROJECTILE sprite (flipped R)
}

# ── STAGE 5 RAGE MODE (front-facing bulked flex + purple energy-crackle transform). Feet-aligned; the
# bulked figures are ~164px (taller than the 129px base idle → he visibly BULKS UP on-screen). ──
RAGE_FRAMES = {
    "rageidle":      [(428,1396,132,132), (563,1396,132,132), (698,1396,132,132)],                          # 3-frame bulked flex breathing (front)
    "ragetransform": [(1598,1396,132,132), (1738,1396,132,132), (1873,1396,132,132), (2008,1396,132,132)],  # 4-frame purple energy-crackle
}

# ── STAGE 6 MECH SUIT (ultimate). Purple WIREFRAME materialize sequence + SOLID mech idle + mech lunge
# attack. Big frames (~190px) → giant powered-armor read. 5th tuple element = horizontal flip (canonical R). ──
MECH_FRAMES = {
    "mechwire":   [(4570,1020,210,205,False), (4568,1210,210,205,False), (4553,1400,222,205,False), (4553,1590,222,205,False)],   # 4-frame purple wireframe materialize
    "mechidle":   [(4810,1020,218,205,False), (4808,1213,218,205,False)],                                                          # 2-frame solid mech idle (front)
    "mechattack": [(4726,2540,248,190,False)],                                                                                     # mech lunge/strike
}

# ── STAGE 7 WIN pose — repurposed front-facing confident stance (arms out, cape spread; no bespoke victory
# art on the sheet — FLAGGED). lose = REUSE knockdown (no lose art). ──
WIN_FRAMES = { "win": [(2268,2024,158,138)] }

def build_special(src, name, boxes):
    tb = []
    for b in boxes:
        (tx,ty,tw,th), cell = tighten(src, b)
        if len(b) >= 5 and b[4]: cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        tb.append((tx,ty,tw,th,cell))
    cw = max(t[2] for t in tb); ch = max(t[3] for t in tb)
    strip = Image.new("RGBA", (cw*len(tb), ch), (0,0,0,0))
    for i,(tx,ty,tw,th,cell) in enumerate(tb):
        strip.paste(cell, (i*cw + (cw-tw)//2, ch-th), cell)
    out = os.path.join(ROOT, f"dark_knight_{name}_uniform.png")
    strip.save(out)
    print(f"  {name:14s} frames={len(tb)} cell={cw}x{ch}  -> {os.path.basename(out)}")

def build(src, name, boxes):
    cw = max(w for _,_,w,_ in boxes)
    ch = max(h for _,_,_,h in boxes)
    strip = Image.new("RGBA", (cw*len(boxes), ch), (0,0,0,0))
    for i,(x,y,w,h) in enumerate(boxes):
        cell = src.crop((x, y, x+w, y+h))
        px = i*cw + (cw - w)//2      # center horizontally
        py = ch - h                   # bottom-align (feet planted)
        strip.paste(cell, (px, py), cell)
    out = os.path.join(ROOT, f"dark_knight_{name}_uniform.png")
    strip.save(out)
    print(f"  {name:10s} frames={len(boxes)} cell={cw}x{ch}  -> {os.path.basename(out)}")
    return cw, ch, len(boxes)

def main():
    src = Image.open(SRC).convert("RGBA")
    print(f"source {src.size}  RGBA true-alpha")
    print("dark_knight STAGE 1 movement/state reslice:")
    dims = {}
    for name, boxes in FRAMES.items():
        tb = [tighten(src, b)[0] for b in boxes]   # alpha-crop each frame → correct feet-align (generous idle/walk boxes)
        dims[name] = build(src, name, tb)
    # WALK from the upper set is a LOW crouched prowl (~78px) — upscale ×1.5 (NEAREST, crisp) so it reads at
    # idle-comparable height (a stalking gait, slightly shorter than the upright idle = natural). 10 smooth frames.
    wf = os.path.join(ROOT, "dark_knight_walk_uniform.png")
    wi = Image.open(wf); wi = wi.resize((int(wi.width * 1.5), int(wi.height * 1.5)), Image.NEAREST); wi.save(wf)
    print(f"  walk       upscaled ×1.5 → cell {wi.width // 10}x{wi.height}  (crouched prowl, 10f)")
    print("dark_knight STAGE 2 normals reslice:")
    for name, boxes in ATTACK_FRAMES.items():
        tb = [tighten(src, b)[0] for b in boxes]
        dims[name] = build(src, name, tb)
    print("dark_knight STAGE 4 specials reslice:")
    for name, boxes in SPECIAL_FRAMES.items():
        build_special(src, name, boxes)
    print("dark_knight STAGE 5 rage-mode reslice:")
    for name, boxes in RAGE_FRAMES.items():
        tb = [tighten(src, b)[0] for b in boxes]
        dims[name] = build(src, name, tb)
    print("dark_knight STAGE 6 mech-suit reslice:")
    for name, boxes in MECH_FRAMES.items():
        build_special(src, name, boxes)
    print("dark_knight STAGE 7 win reslice:")
    for name, boxes in WIN_FRAMES.items():
        tb = [tighten(src, b)[0] for b in boxes]
        dims[name] = build(src, name, tb)
    # portrait: cowl lower-face close-up fragment (Stage 0 item 6) — a HUD/select bust. Tightened to the bust
    # band (y1166–1254) to EXCLUDE two small standing-Batman figures below it (y1255+) that a looser crop grabbed
    # as bottom-corner bleed (visual-audit fix).
    port = src.crop((18, 1166, 216, 1254))
    pb = port.getbbox()
    if pb: port = port.crop(pb)
    port.save(os.path.join(ROOT, "dark_knight_portrait.png"))
    print(f"  portrait   {port.size}  -> dark_knight_portrait.png (cowl lower-face fragment)")

if __name__ == "__main__":
    main()
