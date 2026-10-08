#!/usr/bin/env python3
"""Slice the Vaydra "Adult Naruto KCM" sheet (V) into per-action uniform strips for the
Naruto (Adult KCM) rework. ALL fighter BODY frames come from V (green bg 35,118,34 + noise).

Keying = BORDER FLOOD-FILL: only green components touching the sheet edge go transparent, so
interior near-green pixels survive (no halo / no punch-through). Frames are cut per the Stage-1
visual audit of V, FORCE-TO-N split at coverage valleys where extended limbs bridge poses, then
repacked into fixed-width cells (center-X, feet/bottom-align, anchorY:0) at NATIVE V resolution
(one spriteScale on the character; natural per-pose height variation).

USAGE:  python3 tools/reslice_naruto_kcm.py --key   # write V_keyed.png + keying QA
        python3 tools/reslice_naruto_kcm.py          # slice all actions -> naruto_hokage_kcm_*.png
"""
import numpy as np, sys, json
from PIL import Image
from scipy import ndimage

SRC = "adult_naruto_kcm_sprites_by_vahidras_di37okp.png"
BG = np.array([35, 118, 34]); TOL = 55; PAD = 3

def key_border_floodfill(tol=TOL):
    rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    greenish = np.sqrt(((rgb - BG) ** 2).sum(2)) <= tol
    lbl, n = ndimage.label(greenish)
    border = set(np.unique(np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])))
    border.discard(0)
    alpha = np.where(np.isin(lbl, list(border)), 0, 255).astype(np.uint8)
    rgba = np.dstack([rgb.astype(np.uint8), alpha])
    gdom = (rgb[:, :, 1] > rgb[:, :, 0] + 40) & (rgb[:, :, 1] > rgb[:, :, 2] + 40) & (alpha > 0)
    rgba[:, :, 1][gdom] = np.maximum(rgb[:, :, 0], rgb[:, :, 2])[gdom].astype(np.uint8)
    return rgba

RGBA = key_border_floodfill(); ALPHA = RGBA[:, :, 3]

def raw_islands(y0, y1, x0, x1, gap=4, min_w=8):
    occ = (ALPHA[y0:y1, x0:x1] > 0).any(0)
    runs, s = [], None
    for x, v in enumerate(occ):
        if v and s is None: s = x
        elif not v and s is not None: runs.append([s, x - 1]); s = None
    if s is not None: runs.append([s, len(occ) - 1])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] - 1 <= gap: merged[-1][1] = r[1]
        else: merged.append(list(r))
    return [[x0 + a, x0 + b] for a, b in merged if b - a + 1 >= min_w]

def force_to_n(y0, y1, x0, x1, n):
    isl = raw_islands(y0, y1, x0, x1)
    col = (ALPHA[y0:y1, :] > 0).sum(0)
    while len(isl) < n:
        wi = max(range(len(isl)), key=lambda i: isl[i][1] - isl[i][0])
        a, b = isl[wi]; m = int((b - a) * 0.3); lo, hi = a + m, b - m
        if hi <= lo: break
        seam = lo + int(np.argmin(col[lo:hi + 1]))
        isl[wi:wi + 1] = [[a, seam], [seam + 1, b]]
    while len(isl) > n and len(isl) > 1:
        gi = min(range(len(isl) - 1), key=lambda i: isl[i + 1][0] - isl[i][1])
        isl[gi:gi + 2] = [[isl[gi][0], isl[gi + 1][1]]]
    return [(a, b + 1) for a, b in isl]

def emit(name, segs):
    frames = []
    for (y0, y1, x0, x1, n) in segs:
        rows = np.where((ALPHA[y0:y1, x0:x1] > 0).any(1))[0]
        if len(rows) == 0: continue
        ty0, ty1 = y0 + rows[0], y0 + rows[-1] + 1
        for (a, b) in force_to_n(y0, y1, x0, x1, n):
            if (ALPHA[ty0:ty1, a:b] > 0).any(): frames.append((ty0, ty1, a, b))
    h = max(y1 - y0 for (y0, y1, _, _) in frames)
    cw = max(b - a for (_, _, a, b) in frames) + 2 * PAD
    sheet = Image.new("RGBA", (cw * len(frames), h), (0, 0, 0, 0))
    full = Image.fromarray(RGBA, "RGBA")
    for i, (y0, y1, a, b) in enumerate(frames):
        fw, fh = b - a, y1 - y0
        sheet.paste(full.crop((a, y0, b, y1)), (i * cw + (cw - fw) // 2, h - fh), full.crop((a, y0, b, y1)))
    out = f"naruto_hokage_kcm_{name}_uniform.png"
    sheet.save(out)
    print(f"  {out:42s} {len(frames)}f  {cw}x{h}")
    return {"frames": len(frames), "width": int(cw), "height": int(h), "sheet": f"./{out}"}

# action -> [(y0,y1,x0,x1,N)]  (from the Stage-1 V audit, feet-aligned)
CFG = {
 'idle':      [(183,272,  0,110, 2)],   # gather + ready stance (closed gold coat)
 'run':       [(186,263,115,512, 6)],   # 6-frame run, coat flaring
 'dash':      [(253,328,115,495, 5)],   # dash-punch lunges (also Dash Barrage art)
 'light':     [(325,403,105,512, 6)],   # standing punches (incl chakra-arm-trail @ frame0)
 'chakra_arm':[(325,403,100,200, 1)],   # the golden chakra-arm-trail punch (Chakra Arm Strike)
 'heavy':     [(404,480,130,292, 2)],   # 2 clean side/front kicks (box agent)
 'hurt':      [(486,562,  0,145, 3)],   # 3 stagger/recoil frames (box agent)
 'knockdown': [(518,564,238,312, 1)],   # lying/seated downed (held; also defeat)
 'getup':     [(556,609,305,406, 2)],   # 2 one-knee recovery frames (box agent)
 'jump':      [(688,793,  0,180, 3)],   # leap / jump-knee
 'air':       [(700,784,113,252, 2)],   # 2 mid-air flip frames, top row only (box agent)
 'flip_kick': [(770,880,355,480, 2)],   # handstand-kick (Rising Flip Kick)
 'win':       [(688,793,258,312, 1)],   # relaxed standing (fallback — no arms-up win frame)
 'fist_fx':   [(560,620, 15,160, 1)],   # oversized chakra-fist FX
 'gather':    [(183,272,  0, 48, 1)],   # hands-together summon/gather (Gamabunta + TBB cast pose)
}

def main():
    if "--key" in sys.argv:
        Image.fromarray(RGBA, "RGBA").save("V_keyed.png"); print("wrote V_keyed.png"); return
    meta = {}
    for name, segs in CFG.items(): meta[name] = emit(name, segs)
    # portrait: head/upper crop from idle stance frame
    sub = ALPHA[183:272, 50:98] > 0
    ys = np.where(sub.any(1))[0]; xs = np.where(sub.any(0))[0]
    x0, y0, x1, y1 = 50 + xs[0], 183 + ys[0], 50 + xs[-1] + 1, 183 + ys[0] + 56
    Image.fromarray(RGBA, "RGBA").crop((x0, y0, x1, y1)).save("naruto_hokage_portrait.png")
    print(f"  naruto_hokage_portrait.png  {x1-x0}x{y1-y0}")
    json.dump(meta, open("tools/nh_kcm_meta.json", "w"), indent=1)
    print("wrote tools/nh_kcm_meta.json")

if __name__ == "__main__":
    main()
