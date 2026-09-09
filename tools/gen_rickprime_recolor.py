#!/usr/bin/env python3
"""gen_rickprime_recolor.py — build Rick Prime as a palette recolor of base Rick's sheets.

Rick Prime (rosterKey "rickPrime") is a PURE recolor of base Rick's on-disk art into new
<stem>__rickprime.png files (NEVER in-place edits), like tools/gen_albedo_recolor.py.

────────────────────────────────────────────────────────────────────────────────────────
ROOT CAUSE OF THE PRIOR (WRONG) PASS — diagnosed empirically, 2026-09-08:
  The prior pass targeted COAT #2E2E3C via gen_rick_creative.paint(), a MULTI-TONE remap that
  keeps the target hue+sat but re-centers the region's value with the SOURCE's FULL luminance
  spread: nv = target_v + (pixel_v - pivot). Base Rick's coat is a near-WHITE lab coat (mean
  value ~0.70, wide spread). Re-centering that onto a dark target with spread=1.0 pushed the
  shadow folds to val ~0.08 → the coat came out NEAR-BLACK (#0F0F14), not navy. Under the
  in-game MIRROR TINT (#e2493b, applied to P2 in a Rick-vs-Rick match) that near-black navy
  reads BURGUNDY and the (correctly-unchanged) blue hair reads pinkish-gray — the reported bug.
  So: (a) the value math produced the wrong brightness for a near-white source (the classic
  desaturated-source failure the Ghostface notes warn about), and (b) the symptom was amplified
  by the mirror tint. Hair was already correct (unchanged ≈ base ≈ reference).

FIX — DIRECT COLOR TARGETING to EXACT reference-sampled hexes + a FLATTER application
(compressed tonal spread) so each region actually LANDS on its sampled color instead of
smearing across black→gray. Values are region-AVERAGED straight from rickprime_reference.png:
  JACKET (white lab coat)   -> #413D51  navy/charcoal   (ref hsv 251°,0.25,0.32)
  ACCENT (teal collar/chest)-> #692E49  crimson stripe  (ref hsv 332°,0.56,0.41)  [stands in for
                               the red diagonal stripe — base Rick has no isolable stripe geometry]
  PANTS (brown + shoes)     -> #292A37  dark navy       (ref hsv 236°,0.26,0.22)
  HAIR + SKIN               -> UNCHANGED (ref hair #94AAB5 ≈ base Rick's blue-grey; skin excluded)

FLAT_SPREAD (0.35) compresses each region's light/dark range around the target value so the
coat reads as a consistent navy (mid≈target), NOT a black-to-gray gradient. This is the
"direct region replacement / flat wash" the Ghostface tint tool uses for the same reason.

REUSES the PROVEN per-region MASKS from tools/gen_rick_creative.py (is_coat/is_shirt/is_pants,
per-frame band scoping, wired_sheets()). The masks were never the problem — only the paint math.

HONEST GAPS (source art can't isolate — flagged, NOT faked): the literal red DIAGONAL STRIPE and
the WHITE ANKLE-WRAP have no isolable regions in base Rick's art (solid lab coat / plain brown
shoes) → approximated (red chest accent) / omitted. Silhouette unchanged (pure recolor).

USAGE: python3 tools/gen_rickprime_recolor.py            # build all __rickprime sheets + portrait
       python3 tools/gen_rickprime_recolor.py preview    # build + 3-way ref/OLD/NEW contact sheet
"""
import os, sys, importlib.util, colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TAG = "rickprime"

# EXACT reference-sampled targets (region averages of rickprime_reference.png).
JACKET = "#413D51"   # white lab coat  -> dark navy/charcoal jacket
ACCENT = "#692E49"   # teal collar/chest -> crimson accent (stands in for the red diagonal stripe)
PANTS  = "#292A37"   # brown pants+shoes -> dark navy
FLAT_SPREAD = 0.35   # <1 compresses the source's tonal range so the region LANDS on the target value

def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
RC = _load("gen_rick_creative", os.path.join(os.path.dirname(__file__), "gen_rick_creative.py"))

def _hex(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def paint_flat(img, fw, mask, hexcol, spread=FLAT_SPREAD):
    """DIRECT color targeting: set the masked region to `hexcol`, keeping only a COMPRESSED slice
    of the source shading (spread<1) so the whole region reads as the sampled color instead of
    smearing to black/white. Per-frame pivot (each frame's own mean value) keeps cross-frame
    consistency. This is the flat-wash fix for a near-white/desaturated source region."""
    if not mask: return 0
    px = img.load(); W, H = img.size
    tr, tg, tb = _hex(hexcol); th, ts, tv = colorsys.rgb_to_hsv(tr/255, tg/255, tb/255)
    n = 0
    for f in range((W + fw - 1)//fw):
        x0, x1 = f*fw, min(f*fw+fw, W)
        pts = [(x, y) for (x, y) in mask if x0 <= x < x1]
        if not pts: continue
        pivot = sum(RC.hsv(px[x, y])[2] for (x, y) in pts) / len(pts)
        for (x, y) in pts:
            v = RC.hsv(px[x, y])[2]
            nv = max(0.0, min(1.0, tv + (v - pivot) * spread))
            r, g, b = colorsys.hsv_to_rgb(th, ts, nv)
            px[x, y] = (int(r*255), int(g*255), int(b*255), px[x, y][3]); n += 1
    return n

def build():
    sheets = RC.wired_sheets()   # {filename: frame_width} — exactly rick.animationData's sheets
    total = 0
    for name, fw in sorted(sheets.items()):
        img = Image.open(os.path.join(ROOT, name)).convert("RGBA")
        B = RC.BANDS_SPRITE
        # Capture masks FIRST (from the original) then paint — cross-region-regrab guard.
        # HAIR is intentionally omitted (blue hair kept — matches the reference); SKIN never matches these masks.
        ms = RC.mask_of(img, fw, RC.is_shirt, B["shirt"])
        mc = RC.mask_of(img, fw, RC.is_coat,  B["coat"])
        mp = RC.mask_of(img, fw, RC.is_pants, B["pants"])
        s = paint_flat(img, fw, ms, ACCENT)
        c = paint_flat(img, fw, mc, JACKET)
        p = paint_flat(img, fw, mp, PANTS)
        img.save(os.path.join(ROOT, f"{name[:-4]}__{TAG}.png"))
        total += s + c + p
        print(f"  jacket={c:5d} accent={s:5d} pants={p:5d}  {name} -> {name[:-4]}__{TAG}.png")
    # PORTRAIT — crop a clean standing frame from the recolored stand sheet (base rick_pfp.png has a
    # light bg inseparable from the coat, so every rick skin uses a stand-crop). rick-skin naming.
    stand = Image.open(os.path.join(ROOT, f"rick_stand__{TAG}.png")).convert("RGBA")
    f0 = stand.crop((0, 0, 30, stand.height)); bb = f0.getbbox()
    if bb: f0 = f0.crop((max(0, bb[0]-2), max(0, bb[1]-2), min(f0.width, bb[2]+2), min(f0.height, bb[3]+2)))
    f0 = f0.resize((f0.width*3, f0.height*3), Image.NEAREST)
    f0.save(os.path.join(ROOT, f"rick_portrait__{TAG}.png"))
    print(f"  portrait -> rick_portrait__{TAG}.png {f0.size}")
    print(f"OK — wrote {len(sheets)} __{TAG} sheets + portrait ({total} px recolored)")

def _frame0(path, fw=30):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    x1 = min(fw, W)
    ys = [y for y in range(H) for x in range(0, x1) if px[x, y][3] > 16]
    xs = [x for x in range(0, x1) for y in range(H) if px[x, y][3] > 16]
    return im.crop((min(xs), min(ys), max(xs)+1, max(ys)+1)) if ys else im

def preview():
    build()
    # 3-WAY: reference | OLD (wrong) output | NEW output, so the fix is directly checkable.
    ref = Image.open(os.path.join(ROOT, "rickprime_reference.png")).convert("RGBA")
    old_path = os.path.join(ROOT, "harness", "shots", "_OLD_rick_stand__rickprime.png")
    cells = [("REFERENCE", ref)]
    if os.path.exists(old_path): cells.append(("OLD (wrong)", _frame0(old_path)))
    cells.append(("NEW (fixed)", _frame0(f"rick_stand__{TAG}.png")))
    Hc = 300; pad = 14; lbl = 20
    def scale_h(im, h): s = h/im.height; return im.resize((max(1, round(im.width*s)), h), Image.NEAREST)
    scaled = [(nm, scale_h(im, Hc)) for nm, im in cells]
    Wtot = sum(im.width for _, im in scaled) + pad*(len(scaled)+1)
    canvas = Image.new("RGBA", (Wtot, Hc+lbl+pad), (26, 26, 32, 255))
    d = ImageDraw.Draw(canvas)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 14)
    except Exception: font = ImageFont.load_default()
    x = pad
    for nm, im in scaled:
        canvas.alpha_composite(im, (x, lbl)); d.text((x, 2), nm, fill=(235, 235, 240, 255), font=font); x += im.width + pad
    out = os.path.join(ROOT, "rickprime_3way_compare.png"); canvas.convert("RGB").save(out)
    print("-> rickprime_3way_compare.png (reference | OLD wrong | NEW fixed)")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "preview": preview()
    else: build()
