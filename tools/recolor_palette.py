#!/usr/bin/env python3
"""
recolor_palette.py — TARGETED COLOR REPLACEMENT (palette remapping) for sprite sheets.

The Canva-style "select THIS color, replace with THAT color, everything else untouched"
recolor. Unlike a global hue-rotate (which shifts skin tones, shading, and linework and
produces muddy/pale results), this ONLY changes pixels that match a chosen source region
— skin, black outlines, whites, and any non-targeted color stay byte-identical.

Two conceptual modes (same core math; the flag only records intent in reports):
  --mode whole   : remap one or more source color-families across the entire sheet.
  --mode region  : same, but the selection is scoped to a specific color/region (e.g. only
                   hair pixels) — optionally further restricted to a vertical band (--yband).

SELECTION (what pixels change) — combine as needed:
  --from-hue LO-HI     select pixels whose HUE (0-360) is in [LO,HI] (wraps if LO>HI).
  --from "#rgb,#rgb"   select pixels within --tol RGB distance of any listed sample color.
  --min-sat / --max-sat  saturation gate 0-1 (default min 0.15 — excludes grays/near-white
                         outlines & desaturated skin so they stay untouched).
  --min-val / --max-val  value/brightness gate 0-1.
  --max-warm N           reject WARM pixels whose (R - B) > N. Neutral/cool regions (silver/white
                         hair: B>=R) pass; warm skin (R>>B, even when DESATURATED at shaded/anti-
                         aliased edges) is dropped. This is the robust cross-frame guard against
                         skin bleed when a loose near-gray selection would otherwise catch a face
                         or a bare limb that drifted into the hair band on some poses.
  --tol N              RGB distance for --from samples (default 45).
  --yband LO-HI        restrict to vertical fraction [LO,HI] of the sheet height (region scoping,
                       e.g. 0-0.45 = top ~half = head/hair). Applies uniformly across a strip.

RECOLOR (how selected pixels change) — pick ONE:
  --to-hue H [--to-sat S]  set hue (& optional saturation), PRESERVE each pixel's value → shading
                           is retained (highlights stay light, shadows stay dark). Best default.
  --val-gain G             multiply each recolored pixel's value by G (default 1.0). Use >1 to make a
                           DARK source region read as a bright/vibrant target (e.g. dark navy -> gold).
  --val-lift L             add L (0-1) to value after gain. Both clamp to [0,1]; relative shading kept.
  --to "#rrggbb"           map selected pixels onto this exact color, scaled by their luminance.
  --to-tone "#rrggbb"      MULTI-TONE remap (best for multi-tonal hair/gradient-shaded regions): keep the
                           target's hue+saturation, but re-CENTER the selected region's brightness on the
                           target's value while PRESERVING the existing light/dark spread between tones —
                           i.e. the region's mid tone becomes exactly the target color, highlights stay
                           proportionally lighter, shadows proportionally darker. This avoids the "flatten
                           to one flat color" look of --to (which crushes a dark target's highlights) and
                           the "wrong overall brightness" of raw --to-hue (which never moves toward the
                           target's value). Modifiers:
                             --tone-spread G  contrast of the preserved spread (default 1.0; >1 = punchier
                                              highlight/shadow separation, <1 = flatter).
                             --tone-pivot P   source value (0-1) treated as the region's "mid/base" tone
                                              that maps onto the target. Default = auto (mean value of the
                                              selected pixels), which is usually what you want.
                             --to-sat S       override the target saturation (else taken from the hex).
  --swap "#a>#b,#c>#d"     near-match swaps (e.g. a two-color inversion). All swaps computed from
                           the ORIGINAL pixels simultaneously, so red<->yellow works correctly.

OUTPUT:
  --in <file> [...]  or  --in-glob "pattern"   input sheet(s)/portrait(s).
  --out-tag <tag>    writes each <name>.png -> <name>__<tag>.png (skins.js recolorSkinAnim naming).
  --preview <file>   optional: also write a single before/after strip for eyeballing.
  --report           print how many pixels changed per file (0 => selection missed; retune).

Alpha is always preserved; fully-transparent pixels never change.
"""
import argparse, colorsys, glob, os, sys
from PIL import Image


def hex2rgb(h):
    h = h.strip().lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def rgb_hsv(r, g, b):
    return colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)  # h,s,v in 0..1


def hue_in(hdeg, lo, hi):
    if lo <= hi:
        return lo <= hdeg <= hi
    return hdeg >= lo or hdeg <= hi  # wrap


def build_selection_mask(px, W, H, args):
    """Return a 2D boolean-ish list: True where the pixel should be recolored."""
    samples = [hex2rgb(c) for c in args.from_.split(",")] if args.from_ else None
    tol2 = args.tol * args.tol
    yb = None
    if args.yband:
        lo, hi = (float(x) for x in args.yband.split("-"))
        yb = (int(lo*H), int(hi*H))
    mask = bytearray(W*H)
    for y in range(H):
        if yb and not (yb[0] <= y < yb[1]):
            continue
        for x in range(W):
            i = y*W + x
            r, g, b, a = px[i*4], px[i*4+1], px[i*4+2], px[i*4+3]
            if a == 0:
                continue
            h, s, v = rgb_hsv(r, g, b)
            hdeg = h*360.0
            if s < args.min_sat or s > args.max_sat:
                continue
            if v < args.min_val or v > args.max_val:
                continue
            if args.max_warm is not None and (r - b) > args.max_warm:
                continue  # warm skin (R>>B) — reject even when desaturated (cross-frame skin guard)
            if args.from_hue:
                lo, hi = (float(t) for t in args.from_hue.split("-"))
                if not hue_in(hdeg, lo, hi):
                    continue
            if samples is not None:
                if not any((r-sr)**2+(g-sg)**2+(b-sb)**2 <= tol2 for sr, sg, sb in samples):
                    continue
            mask[i] = 1
    return mask


def apply_recolor(img, args):
    img = img.convert("RGBA")
    W, H = img.size
    px = bytearray(img.tobytes())
    changed = 0

    if args.swap:
        pairs = []
        for part in args.swap.split(","):
            a, b = part.split(">")
            pairs.append((hex2rgb(a), hex2rgb(b)))
        tol2 = args.tol*args.tol
        src = bytes(px)  # read from ORIGINAL so swaps are simultaneous
        for i in range(W*H):
            if src[i*4+3] == 0:
                continue
            r, g, b = src[i*4], src[i*4+1], src[i*4+2]
            for (sr, sg, sb), (dr, dg, db) in pairs:
                if (r-sr)**2+(g-sg)**2+(b-sb)**2 <= tol2:
                    # preserve this pixel's shading offset from its source anchor
                    px[i*4] = max(0, min(255, dr + (r-sr)))
                    px[i*4+1] = max(0, min(255, dg + (g-sg)))
                    px[i*4+2] = max(0, min(255, db + (b-sb)))
                    changed += 1
                    break
        img = Image.frombytes("RGBA", (W, H), bytes(px))
        return img, changed

    mask = build_selection_mask(px, W, H, args)
    to_rgb = hex2rgb(args.to) if args.to else None
    to_hue = None if args.to_hue is None else float(args.to_hue)/360.0
    to_sat = None if args.to_sat is None else float(args.to_sat)

    # ── MULTI-TONE remap setup (--to-tone) ──────────────────────────────────
    # Convert the target hex to HSV, and (if no explicit pivot) measure the mean
    # value of the currently-selected pixels so the region's MID tone lands on the
    # target while the existing highlight/shadow spread is preserved around it.
    tone_hsv = None
    if args.to_tone:
        tr, tg, tb = hex2rgb(args.to_tone)
        th, ts, tv = rgb_hsv(tr, tg, tb)
        if to_sat is not None:
            ts = to_sat
        pivot = args.tone_pivot
        if pivot is None:
            sv = 0.0; sn = 0
            for i in range(W*H):
                if not mask[i]:
                    continue
                _, _, vv = rgb_hsv(px[i*4], px[i*4+1], px[i*4+2])
                sv += vv; sn += 1
            pivot = (sv/sn) if sn else 0.5
        tone_hsv = (th, ts, tv, float(pivot))

    for i in range(W*H):
        if not mask[i]:
            continue
        r, g, b = px[i*4], px[i*4+1], px[i*4+2]
        h, s, v = rgb_hsv(r, g, b)
        if tone_hsv is not None:
            th, ts, tv, pivot = tone_hsv
            nv = max(0.0, min(1.0, tv + (v - pivot)*args.tone_spread))
            nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
        elif to_hue is not None:
            ns = to_sat if to_sat is not None else s
            nv = max(0.0, min(1.0, v*args.val_gain + args.val_lift))
            nr, ng, nb = colorsys.hsv_to_rgb(to_hue, ns, nv)
        elif to_rgb is not None:
            # scale target by this pixel's luminance so shading is preserved
            luma = 0.299*r + 0.587*g + 0.114*b
            f = max(0.0, min(1.0, (luma/255.0)*args.val_gain + args.val_lift))
            nr, ng, nb = to_rgb[0]*f/255.0, to_rgb[1]*f/255.0, to_rgb[2]*f/255.0
        else:
            continue
        px[i*4] = max(0, min(255, round(nr*255)))
        px[i*4+1] = max(0, min(255, round(ng*255)))
        px[i*4+2] = max(0, min(255, round(nb*255)))
        changed += 1

    return Image.frombytes("RGBA", (W, H), bytes(px)), changed


class _NS:
    """Namespace with the same defaults as the CLI, for programmatic use."""
    def __init__(self, **kw):
        d = dict(from_hue=None, from_=None, tol=45.0, min_sat=0.15, max_sat=1.0,
                 min_val=0.0, max_val=1.0, yband=None, to_hue=None, to_sat=None,
                 val_gain=1.0, val_lift=0.0, to=None, swap=None,
                 to_tone=None, tone_spread=1.0, tone_pivot=None, max_warm=None)
        d.update(kw)
        self.__dict__.update(d)


def recolor_file(path, out_tag, **opts):
    """Recolor one sheet -> <stem>__<out_tag>.png. Returns pixels changed."""
    args = _NS(**opts)
    img = Image.open(path)
    out, changed = apply_recolor(img, args)
    stem, _ = os.path.splitext(path)
    out.save(f"{stem}__{out_tag}.png")
    return changed


def recolor_multi(path, out_tag, passes):
    """Apply several recolor passes in sequence (each a dict of opts) → one <stem>__<out_tag>.png.
    Later passes see earlier passes' output — for multi-region skins (e.g. hair→pink THEN eyes→pink)."""
    img = Image.open(path)
    total = 0
    for opts in passes:
        img, changed = apply_recolor(img, _NS(**opts))
        total += changed
    stem, _ = os.path.splitext(path)
    img.save(f"{stem}__{out_tag}.png")
    return total


def recolor_perframe(path, out_tag, cell_w, passes):
    """PER-FRAME recolor of a horizontal sprite STRIP (cell_w-wide frames).

    Fixes cross-frame skin bleed: instead of one global color-match applied blindly across the
    whole multi-frame canvas, each frame is processed INDEPENDENTLY and the recolor is constrained
    to that frame's OWN opaque bounding box. Any `yband` in a pass is therefore interpreted relative
    to the frame's bbox (its "upper region" = where the hair actually is), and the tone-remap pivot
    is measured PER FRAME (each frame's own local color range), not from a single reference frame.
    Returns (nframes, total_px_changed, per_frame_changed[])."""
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    n = max(1, W // cell_w)
    total = 0; per = []
    for i in range(n):
        box = (i*cell_w, 0, (i+1)*cell_w, H)
        frame = img.crop(box)
        bb = frame.getbbox()               # opaque content bbox within this frame
        if bb is None:
            per.append(0); continue
        content = frame.crop(bb)           # yband/pivot now relative to the silhouette itself
        changed = 0
        for opts in passes:
            content, c = apply_recolor(content, _NS(**opts))
            changed += c
        frame.paste(content, (bb[0], bb[1]))
        img.paste(frame, box)
        total += changed; per.append(changed)
    stem, _ = os.path.splitext(path)
    img.save(f"{stem}__{out_tag}.png")
    return n, total, per


def recolor_glob(pattern, out_tag, **opts):
    """Recolor every non-variant file matching a glob. Returns (nfiles, total_changed)."""
    files = [f for f in sorted(glob.glob(pattern)) if "__" not in os.path.basename(f)]
    total = 0
    for f in files:
        total += recolor_file(f, out_tag, **opts)
    return len(files), total


def main():
    ap = argparse.ArgumentParser(description="Targeted sprite-sheet color replacement (palette remap).")
    ap.add_argument("--in", dest="inputs", nargs="*", default=[])
    ap.add_argument("--in-glob", default=None)
    ap.add_argument("--out-tag", required=True)
    ap.add_argument("--mode", choices=["whole", "region"], default="whole")
    ap.add_argument("--from-hue", default=None)
    ap.add_argument("--from", dest="from_", default=None)
    ap.add_argument("--tol", type=float, default=45.0)
    ap.add_argument("--min-sat", dest="min_sat", type=float, default=0.15)
    ap.add_argument("--max-sat", dest="max_sat", type=float, default=1.0)
    ap.add_argument("--min-val", dest="min_val", type=float, default=0.0)
    ap.add_argument("--max-val", dest="max_val", type=float, default=1.0)
    ap.add_argument("--yband", default=None)
    ap.add_argument("--to-hue", dest="to_hue", default=None)
    ap.add_argument("--to-sat", dest="to_sat", default=None)
    ap.add_argument("--val-gain", dest="val_gain", type=float, default=1.0)
    ap.add_argument("--val-lift", dest="val_lift", type=float, default=0.0)
    ap.add_argument("--to", default=None)
    ap.add_argument("--to-tone", dest="to_tone", default=None)
    ap.add_argument("--tone-spread", dest="tone_spread", type=float, default=1.0)
    ap.add_argument("--tone-pivot", dest="tone_pivot", type=float, default=None)
    ap.add_argument("--max-warm", dest="max_warm", type=float, default=None)
    ap.add_argument("--swap", default=None)
    ap.add_argument("--preview", default=None)
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    files = list(args.inputs)
    if args.in_glob:
        files += sorted(glob.glob(args.in_glob))
    files = [f for f in files if "__" not in os.path.basename(f)]  # never recolor an existing variant
    if not files:
        print("no input files", file=sys.stderr); sys.exit(1)

    total_changed = 0
    for f in files:
        img = Image.open(f)
        out, changed = apply_recolor(img, args)
        stem, ext = os.path.splitext(f)
        outname = f"{stem}__{args.out_tag}.png"
        out.save(outname)
        total_changed += changed
        if args.report:
            print(f"  {os.path.basename(outname):48} changed {changed:6} px")
        if args.preview and os.path.abspath(f) == os.path.abspath(args.preview):
            base = Image.open(f).convert("RGBA")
            strip = Image.new("RGBA", (base.width, base.height*2+4), (30, 30, 38, 255))
            strip.paste(base, (0, 0)); strip.paste(out, (0, base.height+4))
            strip.convert("RGB").save(f"{stem}__{args.out_tag}__PREVIEW.png")
    print(f"wrote {len(files)} file(s) with tag '{args.out_tag}', {total_changed} px changed total")


if __name__ == "__main__":
    main()
