#!/usr/bin/env python3
"""Phase 2 — slice Hinata's five Gentle-Fist specials + Byakugan + FX.
CHAR cast poses: from the palette-normalized sheet (tools/hinata/S_norm.png), feet-aligned, force-to-N.
NAVY FX (pulse rings / trigram field): from S_norm (already navy-keyed), center-packed.
BLACK-BACKED GLOW FX (cyan sphere / arrow): from the RAW sheet via LUMINANCE alpha (black box → glow),
  navy excluded — these render as additive-style glow, not a navy key (task: light + dark stage safe).
GHOST frames (Hakkesho Guuten see-through): translucency PRESERVED (alpha scaled down, not forced opaque)."""
import numpy as np, json
from PIL import Image

NORM = np.asarray(Image.open("tools/hinata/S_norm.png")).copy()
RAW = np.asarray(Image.open("hinata_naruto_the_last__by_aryasyddanwahab_deapca3.png").convert("RGB")).astype(int)
# erase the Portuguese special-row labels on the working copy (neutral near-white), same gate as slice.py
for a, b in [(1856, 1867), (1973, 1984), (2118, 2129), (2249, 2260), (2477, 2488)]:
    s = NORM[a:b]; rgb = s[:, :, :3].astype(int); mn = rgb.min(2); mx = rgb.max(2)
    s[:, :, 3][(mn >= 200) & (mx - mn <= 18)] = 0
ALPHA = NORM[:, :, 3]; PAD = 3
BG = np.array([0, 64, 128])


def raw_islands(y0, y1, x0, x1, gap=6, min_w=9):
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


def emit_char(name, y0, y1, x0, x1, n, align="feet", alpha_scale=1.0):
    frames = []
    rows = np.where((ALPHA[y0:y1, x0:x1] > 0).any(1))[0]
    if len(rows) == 0: print(f"  {name}: EMPTY"); return None
    ty0, ty1 = y0 + rows[0], y0 + rows[-1] + 1
    for (a, b) in force_to_n(y0, y1, x0, x1, n):
        if (ALPHA[ty0:ty1, a:b] > 0).any(): frames.append((ty0, ty1, a, b))
    h = max(y1 - y0 for (y0, y1, _, _) in frames); cw = max(b - a for (_, _, a, b) in frames) + 2 * PAD
    sheet = Image.new("RGBA", (cw * len(frames), h), (0, 0, 0, 0)); full = Image.fromarray(NORM, "RGBA")
    for i, (yy0, yy1, a, b) in enumerate(frames):
        fw, fh = b - a, yy1 - yy0
        crop = full.crop((a, yy0, b, yy1))
        if alpha_scale != 1.0:
            arr = np.asarray(crop).copy(); arr[:, :, 3] = (arr[:, :, 3].astype(float) * alpha_scale).astype(np.uint8); crop = Image.fromarray(arr, "RGBA")
        dy = (h - fh) if align == "feet" else (h - fh) // 2
        sheet.paste(crop, (i * cw + (cw - fw) // 2, dy), crop)
    out = f"hinata_{name}_uniform.png"; sheet.save(out)
    print(f"  {out:34s} {len(frames)}f {cw}x{h}")
    return {"frames": len(frames), "width": int(cw), "height": int(h), "sheet": f"./{out}"}


def emit_glow(name, boxes, y0, y1):
    """Black-backed glow FX: alpha = luminance from the RAW sheet (navy + near-black -> transparent)."""
    frs = []
    for (x0, x1) in boxes:
        reg = RAW[y0:y1, x0:x1]
        L = reg.max(2)
        navy = np.sqrt(((reg - BG) ** 2).sum(2)) <= 45
        alpha = np.clip(L, 0, 255).astype(np.uint8)
        alpha[(L < 30) | navy] = 0
        rgba = np.dstack([reg.astype(np.uint8), alpha])
        # trim to content
        ys, xs = np.where(alpha > 0)
        if len(ys) == 0: continue
        frs.append(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    if not frs: print(f"  {name}: EMPTY"); return None
    h = max(f.shape[0] for f in frs); cw = max(f.shape[1] for f in frs) + 2 * PAD
    sheet = Image.new("RGBA", (cw * len(frs), h), (0, 0, 0, 0))
    for i, f in enumerate(frs):
        im = Image.fromarray(f, "RGBA"); dy = (h - f.shape[0]) // 2
        sheet.paste(im, (i * cw + (cw - f.shape[1]) // 2, dy), im)
    out = f"hinata_{name}_uniform.png"; sheet.save(out)
    print(f"  {out:34s} {len(frs)}f {cw}x{h}")
    return {"frames": len(frs), "width": int(cw), "height": int(h), "sheet": f"./{out}"}


meta = {}
# ── CHAR cast poses (feet-aligned, navy-keyed, normalized) ──
meta["byakugan"]  = emit_char("byakugan",  1889, 1960, 0, 260, 4)    # Sp1 Byakugan activation
meta["shugo"]     = emit_char("shugo",     2013, 2085, 0, 455, 6)    # Sp2 Shugo Hakke (rotation guard)
meta["hasangeki"] = emit_char("hasangeki", 2162, 2233, 0, 290, 4)    # Sp3 Hakke Hasangeki (double palm)
meta["gf_setup"]  = emit_char("gf_setup",  2280, 2364, 0, 205, 3)    # Sp4 Sixty-Four Palms setup
meta["gf_end"]    = emit_char("gf_end",    2280, 2364, 575, 740, 2)  # Sp4 end-of-animation frames
meta["gf_rush"]   = emit_char("gf_rush",   2399, 2450, 0, 760, 9)    # Sp4 palm rush loop (9f)
meta["hakkesho"]  = emit_char("hakkesho",  2513, 2588, 0, 540, 8)    # Sp5 Hakkesho Guuten rotation (8f)
meta["hakkesho_recover"] = emit_char("hakkesho_recover", 2616, 2693, 425, 745, 4)  # Sp5 arms-out recovery
# ── GHOST frames (translucency preserved) ──
meta["hakkesho_ghost"] = emit_char("hakkesho_ghost", 2616, 2693, 0, 420, 6, alpha_scale=0.55)  # see-through
# ── NAVY FX (center-packed) ──
meta["fx_pulse"]   = emit_char("fx_pulse",   1889, 1960, 260, 620, 4, align="center")  # Byakugan pulse rings
meta["fx_trigram"] = emit_char("fx_trigram", 2280, 2364, 205, 410, 1, align="center")  # 8-trigram yin-yang field
# ── PHASE 3: ULTIMATE + unused attacks ──
meta["juuhou"]  = emit_char("juuhou",  2749, 2820, 0, 590, 10)   # ULT — Juuhou Soshiken (Twin Lion Fists): gather → lion-fist loop
meta["unused1"] = emit_char("unused1", 2874, 2944, 0, 420, 6)    # Unused Attack 1 — two-handed chakra-palm burst (documented unused)
meta["unused2"] = emit_char("unused2", 2977, 3056, 0, 750, 11)   # Unused Attack 2 — spinning chakra-kick string (documented unused)
# ── BLACK-BACKED GLOW FX (luminance alpha) ──
meta["fx_sphere"] = emit_glow("fx_sphere", [(22, 144), (167, 289), (311, 432), (450, 619)], 3078, 3227)  # cyan rotation sphere
meta["fx_arrow"]  = emit_glow("fx_arrow",  [(405, 575)], 2300, 2352)  # Sixty-Four Palms arrow

json.dump({k: v for k, v in meta.items() if v}, open("tools/hinata/special_meta.json", "w"), indent=1)
print(f"\nwrote {len([v for v in meta.values() if v])} special sheets")
