#!/usr/bin/env python3
"""Yamamoto Genryūsai — 8 REAL pre-drawn costume skins (from the master sheet's palette-header rows 1 & 3)
+ 1 NEW Void skin. NOT hue-rotations of corrupted samples: each costume's colour ramp is extracted from the
game-original variant crop and PALETTE-SWAPPED across his full animation set.

WHY per-crop, not the Stage-0 full-row clean: the sheet is JPEG-damaged; the MAIN build's prep_yamamoto.py
quantised each ROW as a whole (row 1 holds 4 variants), which MERGED the subtly-different dark hakama blues
(navy≈ice≈forest all collapsed to one blue). The confirmed fix (build prompt step 2): extract each variant
crop from the RAW row, then re-quantise EACH CROP SEPARATELY (median-cut) so its own hakama hue survives —
the RAW crops DO carry the distinct hues (navy h206 / wine h354 / ice h210 / forest h167 / khaki h39 /
ghost desat / violet h254 / crimson h290).

METHOD: (1) extract + per-crop-quantise the 8 variants; (2) derive each variant's GARMENT (hakama/robe)
value→colour ramp from its cleaned crop; (3) classify the GARMENT region in every animation frame (dark
saturated cloth — NOT the pale skin/beard/white shitagi, NOT the near-black outline, NOT the warm Ryūjin
Jakka fire) and value-preservingly remap it to the target variant's real ramp. Skin/beard/white/fire are
PROTECTED so only the costume colour changes. Void = garment→near-black + a runtime pale-blue aura overlay.

USAGE: gen_yamamoto_palette_skins.py [probe|preview|all]   (default: probe)
  probe   -> print each variant's extracted ramp + verify recolored-hakama hue matches target
  preview -> recolor idle + one attack for all 9 → yamamoto_skins_preview.png
  all     -> recolor EVERY animationData sheet + portrait for all 9 skins (writes __<tag>.png)
"""
import os, sys, colorsys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "Bleach_Dark_Souls_Genryusai_Shigekuni_Yamamoto_row_%02d.png")
CLEAN = os.path.join(ROOT, "yamamoto_clean", "row_%02d.png")

# tag, display name, source (row, figure-index among the row's SOLID figures), adj
# adj = per-variant ramp correction {hue, vlift, sboost}. MOST variants are pure-crop (adj={}); two are
# identity-corrected because the JPEG damage destroyed their hakama pixels beyond clean recovery — using the
# CONFIRMED audit identity (which the build prompt itself supplies): "Pale Ice-Blue" needs a value lift (the
# crop's blue survived but its paleness didn't), and "Crimson Red" reads dull-magenta h320 (collapsed toward
# violet) → nudged to a clear red. All 6 others use the crop colour untouched.
VARIANTS = [
    ("navyHakama",  "Navy Hakama", 1, 0, {}),
    ("wineHakama",  "Wine Hakama", 1, 1, {}),
    ("iceBlue",     "Ice-Blue",    1, 2, {"vlift": 0.52, "sboost": -0.12}),   # identity: PALE ice-blue → lift value
    ("forestGreen", "Forest Green",1, 3, {}),
    ("khaki",       "Khaki",       3, 0, {}),
    ("ghostWhite",  "Ghost-White", 3, 1, {"vlift": 0.20}),
    ("violet",      "Violet",      3, 2, {}),
    ("crimson",     "Crimson",     3, 3, {"hue": 0.985, "sboost": 0.28}),     # identity: Crimson RED (crop collapsed to magenta)
]
BASE_TAG = "navyHakama"   # the animation frames are drawn in the navy/blue hakama

SHEETS = [
    "yamamoto_idle_uniform.png", "yamamoto_walk_uniform.png", "yamamoto_dash_uniform.png",
    "yamamoto_turn_uniform.png", "yamamoto_guard_uniform.png", "yamamoto_hurt_uniform.png",
    "yamamoto_hurt_air_uniform.png", "yamamoto_knockdown_uniform.png", "yamamoto_getup_uniform.png",
    "yamamoto_intro_uniform.png", "yamamoto_light_uniform.png", "yamamoto_heavy_uniform.png",
    "yamamoto_up_uniform.png", "yamamoto_air_uniform.png", "yamamoto_downair_uniform.png",
    "yamamoto_chain_uniform.png", "yamamoto_beam_cast_uniform.png", "yamamoto_beam_proj_uniform.png",
    "yamamoto_eruption_uniform.png", "yamamoto_thrust_uniform.png", "yamamoto_stab_uniform.png",
    "yamamoto_overhead_uniform.png", "yamamoto_shunpo_out_uniform.png", "yamamoto_shunpo_in_uniform.png",
    "yamamoto_ult_uniform.png",
]

def solid_runs(row):
    a = np.array(Image.open(CLEAN % row).convert("RGBA")); W = a.shape[1]
    dens = (a[:, :, 3] > 16).sum(axis=0); nz = dens > 0; runs = []; s = -1
    for x in range(W):
        if nz[x]:
            if s < 0: s = x
        else:
            if s >= 0: runs.append((s, x - 1)); s = -1
    if s >= 0: runs.append((s, W - 1))
    return [(a0, a1) for a0, a1 in runs if dens[a0:a1 + 1].max() > 40]

def extract_clean_crop(row, fig_idx, ncolors=20):
    """RAW crop at the confirmed solid-figure position, quantised SEPARATELY (per-crop Stage-0)."""
    x0, x1 = solid_runs(row)[fig_idx]
    a = np.array(Image.open(RAW % row).convert("RGBA"))
    seg = a[:, x0:x1 + 1, :]
    op = seg[:, :, 3] > 16
    ys, xs = np.where(op)
    seg = seg[ys.min():ys.max() + 1, xs.min():xs.max() + 1, :]
    m = seg[:, :, 3] > 16
    px = seg[:, :, :3][m].astype(np.uint8)
    strip = Image.fromarray(px.reshape(-1, 1, 3), "RGB")
    q = strip.quantize(colors=ncolors, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = np.array(q.getpalette()).reshape(-1, 3); idx = np.array(q).reshape(-1)
    out = seg.copy()
    out[:, :, :3][m] = pal[idx]
    return out

def hsv(px):
    r, g, b = px[..., 0] / 255., px[..., 1] / 255., px[..., 2] / 255.
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn
    v = mx; s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0.0)
    h = np.zeros_like(v)
    mask = d > 1e-6
    rc = np.where(mask, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(mask, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(mask, (mx - b) / np.maximum(d, 1e-6), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc)) / 6.0 % 1.0
    return h, s, v

def is_protected(h, s, v):
    """Skin/beard/white shitagi/fire/outline — everything that is NOT the recolourable garment."""
    outline = v < 0.12
    grayish = s < 0.16                       # white beard / grey shitagi / near-neutral (protect)
    warm    = ((h <= 0.11) | (h >= 0.93)) & (s >= 0.16) & (v >= 0.42)  # tan skin + orange Ryūjin Jakka fire
    palehi  = v >= 0.80                        # bright highlights (beard/sash/fire core)
    return outline | grayish | warm | palehi

def garment_ramp(crop, levels=6):
    """Value-sorted colour anchors of the crop's GARMENT (recolourable cloth)."""
    m = crop[:, :, 3] > 16
    px = crop[:, :, :3][m].astype(float)
    h, s, v = hsv(px)
    g = ~is_protected(h, s, v)
    gpx = px[g]; gv = v[g]
    if len(gpx) < 8:                          # fallback: use all non-outline cloth
        g = v >= 0.12; gpx = px[g]; gv = v[g]
    order = np.argsort(gv)
    gpx, gv = gpx[order], gv[order]
    anchors = []
    for i in range(levels):
        lo = i / levels; hi = (i + 1) / levels
        band = gpx[(gv >= np.quantile(gv, lo)) & (gv <= np.quantile(gv, hi))]
        if len(band): anchors.append((band.mean(0), band.mean(0).max() / 255.))
    anchors.sort(key=lambda t: t[1])
    return anchors   # list of (rgb, value)

def ramp_color(ramp, v):
    """Interpolate the target ramp at brightness v (0-1)."""
    if not ramp: return np.array([v * 255] * 3)
    vs = [a[1] for a in ramp]; cs = [a[0] for a in ramp]
    if v <= vs[0]: return cs[0]
    if v >= vs[-1]: return cs[-1]
    for i in range(1, len(vs)):
        if v <= vs[i]:
            t = (v - vs[i - 1]) / max(1e-6, vs[i] - vs[i - 1])
            return cs[i - 1] * (1 - t) + cs[i] * t
    return cs[-1]

def recolor_frame(arr, ramp, void=False):
    """Value-preserving remap of the GARMENT region to the target ramp. arr = HxWx4 int."""
    out = arr.copy()
    m = arr[:, :, 3] > 16
    px = arr[:, :, :3][m].astype(float)
    h, s, v = hsv(px)
    g = ~is_protected(h, s, v)
    idx = np.where(m.reshape(-1))[0]
    flat = out[:, :, :3].reshape(-1, 3)
    gi = idx[g]
    if void:
        # near-black, keep a hint of the garment shading (so folds read) with a cool tint
        vv = v[g]
        col = np.stack([12 + vv * 26, 14 + vv * 30, 20 + vv * 42], axis=1)
        flat[gi] = np.clip(col, 0, 255).astype(np.uint8)
    else:
        cols = np.array([ramp_color(ramp, vv) for vv in v[g]])
        flat[gi] = np.clip(cols, 0, 255).astype(np.uint8)
    out[:, :, :3] = flat.reshape(out.shape[0], out.shape[1], 3)
    return out

def adjust_ramp(ramp, adj):
    """Apply optional identity-correction to a crop-extracted ramp (hue force / value lift / sat boost)."""
    if not adj: return ramp
    out = []
    for rgb, _v in ramp:
        h, s, v = colorsys.rgb_to_hsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
        if "hue" in adj: h = adj["hue"]
        if "sboost" in adj: s = min(1.0, max(0.0, s + adj["sboost"]))
        if "vlift" in adj: v = v + (1.0 - v) * adj["vlift"]
        r, g, b = colorsys.hsv_to_rgb(h, s, v)
        c = np.array([r * 255, g * 255, b * 255])
        out.append((c, c.max() / 255.))
    out.sort(key=lambda t: t[1])
    return out

def build_ramps():
    ramps = {}
    for tag, _, row, fi, adj in VARIANTS:
        ramps[tag] = adjust_ramp(garment_ramp(extract_clean_crop(row, fi)), adj)
    return ramps

def recolor_sheet(sheet, ramp, tag, void=False):
    src = os.path.join(ROOT, sheet)
    a = np.array(Image.open(src).convert("RGBA")).astype(int)
    out = recolor_frame(a, ramp, void=void)
    dst = src.replace(".png", f"__{tag}.png")
    Image.fromarray(out.astype(np.uint8), "RGBA").save(dst)
    return dst

def make_portrait(tag, ramp, void=False):
    src = os.path.join(ROOT, "yamamoto_portrait.png")
    a = np.array(Image.open(src).convert("RGBA")).astype(int)
    out = recolor_frame(a, ramp, void=void)
    Image.fromarray(out.astype(np.uint8), "RGBA").save(src.replace(".png", f"__{tag}.png"))

# ─────────────────────────────────────────────────────────────────────────────
def probe():
    ramps = build_ramps()
    print("── extracted GARMENT ramps (per-crop-quantised, real colours) + recolor validation ──")
    idle = np.array(Image.open(os.path.join(ROOT, "yamamoto_idle_uniform.png")).convert("RGBA")).astype(int)
    for tag, name, row, fi, adj in VARIANTS:
        r = ramps[tag]
        mid = r[len(r) // 2][0]
        hh, ss, vv = colorsys.rgb_to_hsv(mid[0] / 255, mid[1] / 255, mid[2] / 255)
        # recolor idle, measure the resulting garment hue
        rec = recolor_frame(idle, r)
        m = rec[:, :, 3] > 16
        px = rec[:, :, :3][m].astype(float); h, s, v = hsv(px); g = ~is_protected(h, s, v)
        gm = px[g].mean(0) if g.any() else np.zeros(3)
        gh, gs, gv2 = colorsys.rgb_to_hsv(gm[0] / 255, gm[1] / 255, gm[2] / 255)
        print(f"{name:12s} ramp-mid=({int(mid[0])},{int(mid[1])},{int(mid[2])}) hue={int(hh*360):3d} | "
              f"recolored-hakama meanRGB=({int(gm[0])},{int(gm[1])},{int(gm[2])}) hue={int(gh*360):3d} sat={gs:.2f} val={gv2:.2f}")

def preview():
    ramps = build_ramps()
    acts = ["yamamoto_idle_uniform.png", "yamamoto_overhead_uniform.png"]   # idle + one attack
    def first_frame(arr, nframes_guess=None):
        # crop the first frame by alpha-gutter
        m = arr[:, :, 3] > 16
        cols = m.any(axis=0); xs = np.where(cols)[0]
        # first contiguous run
        start = xs[0]; end = start
        for x in range(start, arr.shape[1]):
            if not cols[x]: break
            end = x
        return arr[:, start:end + 1, :]
    rows = []
    labels = [n for _, n, _, _, _ in VARIANTS] + ["Void"]
    tags = [t for t, _, _, _, _ in VARIANTS] + ["voidEternal"]
    for act in acts:
        base = np.array(Image.open(os.path.join(ROOT, act)).convert("RGBA")).astype(int)
        cells = []
        for tag in tags:
            if tag == "voidEternal":
                rec = recolor_frame(base, None, void=True)
            else:
                rec = recolor_frame(base, ramps[tag])
            cell = first_frame(rec)
            cells.append(Image.fromarray(cell.astype(np.uint8), "RGBA"))
        rows.append(cells)
    cw = max(c.width for r in rows for c in r) + 6
    ch = max(c.height for r in rows for c in r) + 18
    W = cw * len(tags); H = ch * len(acts) + 4
    canvas = Image.new("RGBA", (W, H), (28, 28, 32, 255)); d = ImageDraw.Draw(canvas)
    for ri, cells in enumerate(rows):
        for ci, c in enumerate(cells):
            x = ci * cw; y = ri * ch + 14
            # checker
            for yy in range(y, y + c.height):
                for xx in range(x, x + c.width):
                    pass
            canvas.alpha_composite(c, (x + (cw - c.width) // 2, y))
            if ri == 0: d.text((x + 2, 2), labels[ci][:11], fill=(255, 235, 140, 255))
    canvas.convert("RGB").save(os.path.join(ROOT, "yamamoto_skins_preview.png"))
    print("wrote yamamoto_skins_preview.png", (W, H))

def build_all():
    ramps = build_ramps()
    n = 0
    for tag, name, row, fi, adj in VARIANTS:
        for sheet in SHEETS:
            recolor_sheet(sheet, ramps[tag], tag); n += 1
        make_portrait(tag, ramps[tag]); n += 1
    # Void
    for sheet in SHEETS:
        recolor_sheet(sheet, None, "voidEternal", void=True); n += 1
    make_portrait("voidEternal", None, void=True); n += 1
    print(f"wrote {n} recolored PNGs across {len(VARIANTS)+1} skins")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "probe"
    {"probe": probe, "preview": preview, "all": build_all}[mode]()
