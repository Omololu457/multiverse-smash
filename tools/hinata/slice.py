#!/usr/bin/env python3
"""Slice the palette-NORMALIZED Hinata sheet (tools/hinata/S_norm.png) into per-action uniform strips.
Model: tools/sasuke_sensei/slice.py (raw_islands + force_to_n + feet-align). Labels sit ABOVE rows →
each band's y-range is chosen to start below the label; emit() trims to the real figure rows anyway.
Phase 1 = body / normals / strong / intro / win only. Specials are Phase 2."""
import numpy as np, json, sys
from PIL import Image

SRC = "tools/hinata/S_norm.png"
RGBA = np.asarray(Image.open(SRC)).copy(); ALPHA = RGBA[:, :, 3]; PAD = 3

# LABEL ERASURE (exclude the white row-labels that sit ABOVE each sprite row — some Portuguese).
# Labels + the divider line are NEUTRAL near-white ink (250,250,250); figure skin is WARM (252,229,221,
# max-min=31) and all FX (cyan sphere, scarf, pulse rings, chakra) live OUTSIDE these thin rows, so a
# neutral-gate erase CONFINED to the known label y-strips removes text only, never figure/FX pixels.
LABEL_ROWS = [(14, 25), (114, 124), (233, 243), (328, 338), (407, 417), (503, 514), (607, 617),
              (710, 720), (802, 812), (908, 918), (1080, 1094), (1196, 1206), (1301, 1313),
              (1410, 1422), (1527, 1538), (1628, 1645), (1748, 1758), (1856, 1867), (1973, 1984),
              (2118, 2129), (2249, 2260), (2477, 2488), (2709, 2720), (2838, 2860), (2959, 2969)]
for a, b in LABEL_ROWS:
    strip = RGBA[a:b]; rgb = strip[:, :, :3].astype(int)
    mn = rgb.min(2); mx = rgb.max(2)
    strip[:, :, 3][(mn >= 200) & (mx - mn <= 18)] = 0
ALPHA = RGBA[:, :, 3]


def raw_islands(y0, y1, x0, x1, gap=5, min_w=9):
    occ = (ALPHA[y0:y1, x0:x1] > 0).any(0); runs = []; s = None
    for x, v in enumerate(occ):
        if v and s is None: s = x
        elif not v and s is not None: runs.append([s, x - 1]); s = None
    if s is not None: runs.append([s, len(occ) - 1])
    m = []
    for r in runs:
        if m and r[0] - m[-1][1] - 1 <= gap: m[-1][1] = r[1]
        else: m.append(list(r))
    return [[x0 + a, x0 + b] for a, b in m if b - a + 1 >= min_w]


def force_to_n(y0, y1, x0, x1, n):
    isl = raw_islands(y0, y1, x0, x1); col = (ALPHA[y0:y1, :] > 0).sum(0)
    while len(isl) < n:
        wi = max(range(len(isl)), key=lambda i: isl[i][1] - isl[i][0]); a, b = isl[wi]
        mrg = int((b - a) * 0.3); lo, hi = a + mrg, b - mrg
        if hi <= lo: break
        seam = lo + int(np.argmin(col[lo:hi + 1])); isl[wi:wi + 1] = [[a, seam], [seam + 1, b]]
    while len(isl) > n and len(isl) > 1:
        gi = min(range(len(isl) - 1), key=lambda i: isl[i + 1][0] - isl[i][1]); isl[gi:gi + 2] = [[isl[gi][0], isl[gi + 1][1]]]
    return [(a, b + 1) for a, b in isl]


def emit(name, segs):
    frames = []
    for (y0, y1, x0, x1, n) in segs:
        rows = np.where((ALPHA[y0:y1, x0:x1] > 0).any(1))[0]
        if len(rows) == 0: continue
        ty0, ty1 = y0 + rows[0], y0 + rows[-1] + 1
        for (a, b) in force_to_n(y0, y1, x0, x1, n):
            if (ALPHA[ty0:ty1, a:b] > 0).any(): frames.append((ty0, ty1, a, b))
    if not frames: print(f"  {name}: EMPTY"); return None
    h = max(y1 - y0 for (y0, y1, _, _) in frames); cw = max(b - a for (_, _, a, b) in frames) + 2 * PAD
    sheet = Image.new("RGBA", (cw * len(frames), h), (0, 0, 0, 0)); full = Image.fromarray(RGBA, "RGBA")
    for i, (y0, y1, a, b) in enumerate(frames):
        fw, fh = b - a, y1 - y0
        sheet.paste(full.crop((a, y0, b, y1)), (i * cw + (cw - fw) // 2, h - fh), full.crop((a, y0, b, y1)))
    out = f"hinata_{name}_uniform.png"; sheet.save(out)
    print(f"  {out:40s} {len(frames)}f {cw}x{h}")
    return {"frames": len(frames), "width": int(cw), "height": int(h), "sheet": f"./{out}"}


# (y0,y1,x0,x1,n) — y from empirical row-band detection; n (frame count) from the sheet-map.
CFG = {
    # ── MOVEMENT / STATE ──
    'intro':          [(135, 206, 0, 340, 5)],    # 3 Hinata-alone + 2 dissolve FX (cameo x>354 excluded)
    'idle':           [(233, 315, 0, 240, 4)],    # Stance 4f
    'run':            [(328, 396, 0, 420, 6)],    # Run 6f (walk reuses this)
    'dash':           [(422, 489, 0, 210, 3)],    # Dash 3f (blur FX)
    'jump':           [(503, 587, 0, 248, 4)],    # Jump 4f (left)
    'guard':          [(503, 587, 250, 415, 2)],  # Guard 2f (right)
    'hurt':           [(607, 688, 0, 170, 2)],    # Taking Damage 2f (left)
    'special_damage': [(607, 688, 170, 340, 3)],  # Taking Special Damage 3f (right) — spare
    'launched':       [(710, 790, 0, 528, 6)],    # Heavy Damage 1-3 (2+2+2)
    'knockdown':      [(818, 888, 0, 520, 7)],    # Knocked Down ~7f
    # ── NORMALS ──
    'light':          [(908, 988, 0, 610, 8)],    # Attack Combo row1 8f
    'comboB':         [(1004, 1072, 0, 440, 6)],  # Attack Combo row2 6f — spare
    'air':            [(1101, 1178, 0, 470, 7)],  # Attack Combo (Air) 7f (left; strong-air is x>470)
    'strong_air':     [(1101, 1178, 470, 720, 4)],# Strong Attack (Air) 4f (right) — spare
    'heavy':          [(1221, 1291, 0, 490, 8)],  # Strong Attack (neutral) 8f (chakra fist FX)
    'strong_fwd':     [(1325, 1397, 0, 405, 7)],  # Strong (Forward) 7f — spare
    'up':             [(1430, 1534, 0, 450, 7)],  # Strong (Up) 7f — rising LAUNCHER (chakra arcs)
    'down_air':       [(1552, 1615, 0, 350, 5)],  # Strong (Down) 5f — slam spike
    # ── THROW / PROJECTILE (spares; grab is a GAP) ──
    'throw':          [(1653, 1718, 0, 256, 4)],  # GROUND throw 4f (left)
    'throw_air':      [(1653, 1718, 256, 480, 4)],# AIR throw 4f (right)
    # ── WIN ──
    'win':            [(1766, 1837, 0, 320, 4)],  # Winning Pose 4f
}


def main():
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    meta = {}
    for n, s in CFG.items():
        if only and n not in only: continue
        r = emit(n, s)
        if r: meta[n] = r
    json.dump(meta, open("tools/hinata/body_meta.json", "w"), indent=1)
    print(f"\nwrote {len(meta)} sheets")


if __name__ == "__main__":
    main()
