#!/usr/bin/env python3
"""
sprite_tool.py — composable sprite creation / editing pipeline for multiverse-smash.

ONE tool, four verbs, each a self-contained step you can run in isolation and pipe
into the next. It deliberately reuses the conventions the rest of tools/ already
established so its output drops straight into a characters.js animationData entry:

  * uniform-cell output ......... every frame repacked into one uW×uH cell, the
                                  *_uniform.png strip the engine + reslice_*.py emit.
  * feet-alignment .............. cells are centered-X and BOTTOM-aligned (1px bottom
                                  pad) so feet line up across frames → anchorY: 0.
  * alpha / green-key handling .. same numpy key math as reslice_bardock.py /
                                  reslice_piccolo.py (teal #008080 + green #00FF50 EB
                                  family), plus a border-flood "tight key" so a
                                  green-skinned foreground (Piccolo/Frieza fills) is
                                  NOT eaten by the background key.
  * animationData shape ......... each slice prints the exact
                                  { frames, width, height, anchorY: 0, sheet } line.

VERBS
  generate  text description → base sprite sheet.  No image-gen backend is wired in
            this environment, so this emits a KEYABLE PLACEHOLDER sheet (numbered
            cells on green) and prints the TODO + the documented backend interface.
            The placeholder is real enough to flow through key→slice→recolor, so the
            rest of the pipeline is testable standalone today.
  key       strip a background (green-screen / solid color / alpha) with an optional
            tight border-flood so foreground colors close to the key survive.
  slice     detect animation frames (alpha-gutter columns OR connected components),
            crop each to content, repack into one feet-aligned *_uniform.png strip.
  recolor   palette remap / hue shift for alt skins or transform-tier art. Delegates
            to tools/recolor_palette.py (single source of truth) so behavior matches
            every existing gen_*_creative.py skin build.

  contact   (helper) tile a *_uniform.png strip into a scaled montage PNG for eyeballing
            a slice/key/recolor before you commit it — same idea as the preview() in
            gen_*_creative.py. For an interactive check, open tools/sprite_preview.html.

Run `python3 tools/sprite_tool.py <verb> -h` for per-verb flags.
See SPRITE_TOOL.md for a worked Cell (the roster's spriteless dev char) example.
"""
import argparse
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# EB (Extreme Butoden) rip family background: solid green cell + teal outer gutter.
# Same constants reslice_bardock/goku/gohan/gotenks/piccolo/frieza key transparent.
EB_GREEN = (0, 255, 80)
EB_TEAL = (0, 128, 128)
ALPHA_THRESH = 16   # a pixel is "content" when alpha > this (matches reslice_*.py)


# ─────────────────────────────────────────────────────────────────────────────
# KEY — background removal
# ─────────────────────────────────────────────────────────────────────────────
def _key_mask(rgb, key, tol):
    """Boolean mask of pixels within L1 distance `tol` of `key` (numpy, like reslice_bardock.load)."""
    return np.abs(rgb.astype(int) - np.array(key)).sum(2) < tol


def key_image(src, out, mode="green", key=None, tol=60, teal_tol=40,
              flood=False, report=False):
    """Remove a background → RGBA PNG with the background made transparent.

    mode:
      green  EB family — key BOTH green(#00FF50, tol) and teal(#008080, teal_tol) gutter.
      color  key one solid `key` hex with `tol`.
      alpha  input already has alpha; just clean near-zero alpha to 0 (passthrough).

    flood=True → TIGHT KEY: only remove key-colored pixels CONNECTED TO THE BORDER
      (background), so an interior region that happens to match the key color — e.g.
      Piccolo's / a green alien's SKIN — is preserved. This is the codebase's
      "green-fill" tight-key approach expressed as a border-connected component filter.
    """
    im = Image.open(src)
    if mode == "alpha":
        im = im.convert("RGBA")
        a = np.asarray(im)
        alpha = np.where(a[:, :, 3] > ALPHA_THRESH, a[:, :, 3], 0).astype("uint8")
        outarr = a.copy()
        outarr[:, :, 3] = alpha
        result = Image.fromarray(outarr, "RGBA")
        removed = int((a[:, :, 3] <= ALPHA_THRESH).sum())
    else:
        rgb = np.asarray(im.convert("RGB"))
        if mode == "green":
            bg = _key_mask(rgb, EB_GREEN, tol) | _key_mask(rgb, EB_TEAL, teal_tol)
        elif mode == "color":
            if not key:
                raise SystemExit("key: --mode color needs --key '#rrggbb'")
            bg = _key_mask(rgb, _hex2rgb(key), tol)
        else:
            raise SystemExit(f"key: unknown --mode {mode}")

        if flood:
            # keep only key-matching pixels reachable from the image border → the
            # true background. Interior key-colored islands (foreground) survive.
            lbl, n = ndimage.label(bg)
            border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
            border.discard(0)
            bg = np.isin(lbl, list(border))

        alpha = np.where(bg, 0, 255).astype("uint8")
        result = Image.fromarray(np.dstack([rgb.astype("uint8"), alpha]), "RGBA")
        removed = int(bg.sum())

    result.save(out)
    if report:
        pct = 100.0 * removed / (result.width * result.height)
        print(f"  keyed {removed} px transparent ({pct:.1f}%) — {'flood/tight' if flood else 'threshold'}")
    print(f"OK {out}: {result.size} RGBA  (mode={mode}{', flood' if flood else ''})")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# SLICE — frame detection → uniform feet-aligned strip
# ─────────────────────────────────────────────────────────────────────────────
def _content_bbox_global(arr, box):
    """Tighten a detected box to its own opaque bbox (like reslice_bardock.content_bbox)."""
    y0, x0, y1, x1 = box
    sub = arr[y0:y1 + 1, x0:x1 + 1, 3] > ALPHA_THRESH
    ys, xs = np.where(sub)
    return (x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()), y0 + int(ys.max()))


def _detect_cc(arr, min_area, min_dim, band):
    """Connected-component frames (reslice_bardock scheme): label opaque islands, filter
    by area + min dimension, order by (y//band, x). Best for grid/montage source sheets."""
    opaque = arr[:, :, 3] > ALPHA_THRESH
    lbl, n = ndimage.label(opaque)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(ys) < min_area:
            continue
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1 - x0 + 1) < min_dim or (y1 - y0 + 1) < min_dim:
            continue
        boxes.append((y0, x0, y1, x1))
    boxes.sort(key=lambda b: (b[0] // band, b[1]))
    return boxes


def _detect_gutter(arr, min_w):
    """Alpha-gutter frames (slice_scan / reslice_strip scheme): a frame is a maximal run
    of columns that contain any opaque pixel, separated by fully-transparent gutters.
    Best for horizontal strips where figures may share a vertical extent."""
    H, W = arr.shape[:2]
    col = (arr[:, :, 3] > ALPHA_THRESH).any(axis=0)
    runs, s = [], -1
    for x in range(W):
        if col[x]:
            if s < 0:
                s = x
        elif s >= 0:
            runs.append((s, x - 1))
            s = -1
    if s >= 0:
        runs.append((s, W - 1))
    runs = [(a, b) for (a, b) in runs if (b - a + 1) >= min_w]
    boxes = []
    for x0, x1 in runs:
        ys = np.where((arr[:, x0:x1 + 1, 3] > ALPHA_THRESH).any(axis=1))[0]
        boxes.append((int(ys.min()), x0, int(ys.max()), x1))
    return boxes


def slice_sheet(src, out, method="gutter", flip=False, min_area=500, min_dim=18,
                band=60, min_w=2, picks=None, pad=1, report=False):
    """Detect frames, crop each to content, repack into one uniform feet-aligned strip.

    Cell packing is IDENTICAL to reslice_*.py: uW = max frame width + 2, uH = max
    frame height + 2, each frame centered horizontally and bottom-aligned with a `pad`px
    bottom gap → the strip drops in with anchorY: 0 (feet planted). `--picks 0,3,5`
    keeps/reorders specific detected frames; `--flip` mirrors every cell (for rips drawn
    facing LEFT, since the engine draws P1 un-flipped expecting RIGHT).
    """
    im = Image.open(src).convert("RGBA")
    arr = np.asarray(im)
    boxes = _detect_cc(arr, min_area, min_dim, band) if method == "cc" else _detect_gutter(arr, min_w)
    if report:
        print(f"  detected {len(boxes)} raw frame(s) via {method}")
    if not boxes:
        raise SystemExit(f"slice: no frames detected in {src} (try --method cc / lower --min-area / --min-w)")

    if picks is not None:
        try:
            boxes = [boxes[p] for p in picks]
        except IndexError:
            raise SystemExit(f"slice: --picks out of range (only {len(boxes)} frames detected)")

    frames = [_content_bbox_global(arr, b) for b in boxes]
    uW = max(f[2] - f[0] + 1 for f in frames) + 2 * pad
    uH = max(f[3] - f[1] + 1 for f in frames) + 2 * pad
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = im.crop((cx0, cy0, cx1 + 1, cy1 + 1))
        if flip:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        strip.paste(cell, (i * uW + (uW - w) // 2, uH - h - pad), cell)
    strip.save(out)
    n = len(frames)
    print(f"OK {out}: {n}f cell {uW}x{uH}")
    print(f"   animationData → {{ frames: {n}, width: {uW}, height: {uH}, "
          f"speed: 6, anchorY: 0, sheet: \"./{os.path.basename(out)}\" }}")
    return n, uW, uH


# ─────────────────────────────────────────────────────────────────────────────
# RECOLOR — delegate to tools/recolor_palette.py (single source of truth)
# ─────────────────────────────────────────────────────────────────────────────
def _load_recolor_palette():
    spec = importlib.util.spec_from_file_location(
        "recolor_palette", os.path.join(os.path.dirname(__file__), "recolor_palette.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def recolor_sheet(src, out_tag, to_hue=None, to=None, from_hue=None, from_=None,
                  yband=None, tol=45.0, min_sat=0.15, report=False):
    """Palette remap / hue shift → <stem>__<out_tag>.png via recolor_palette.recolor_file.
    Thin wrapper so alt-skin / transform-tier art matches every gen_*_creative.py build."""
    rp = _load_recolor_palette()
    opts = dict(to_hue=to_hue, to=to, from_hue=from_hue, from_=from_,
                yband=yband, tol=tol, min_sat=min_sat)
    opts = {k: v for k, v in opts.items() if v is not None}
    changed = rp.recolor_file(src, out_tag, **opts)
    stem, _ = os.path.splitext(src)
    print(f"OK {stem}__{out_tag}.png  ({changed} px changed)")
    if report and changed == 0:
        print("  WARNING: 0 px changed — selection missed; retune --from-hue/--from/--yband")
    return changed


# ─────────────────────────────────────────────────────────────────────────────
# GENERATE — text → base sheet.  No backend wired → keyable placeholder + TODO.
# ─────────────────────────────────────────────────────────────────────────────
GEN_BACKEND_DOC = """\
  GENERATE BACKEND — not configured in this environment (no image-gen API key / script found).
  A placeholder sheet was written so the key→slice→recolor pipeline is testable today.

  To wire real AI generation, implement one function with this signature and set the
  SPRITE_GEN_BACKEND env var to its 'module:function' path:

      def generate(prompt: str, out_path: str, *, cols: int, rows: int,
                   cell_w: int, cell_h: int, ref: str | None) -> str:
          '''Produce a sprite SHEET PNG at out_path — cols*rows frames on a SOLID
          #00FF50 GREEN background (so `sprite_tool.py key --mode green` cleans it),
          each figure BOTTOM-aligned in its cell. Return out_path.'''

  Candidate backends (pick per what becomes available):
    * Anthropic (Claude image tooling), OpenAI Images, Stability, Replicate — call the
      API, request a transparent-or-green-screen pixel-art sheet, save to out_path.
    * A local diffusion model / ComfyUI workflow exposed over HTTP.
  Whatever the backend, KEEP the green-screen + bottom-aligned-cell contract above so
  the downstream verbs are unchanged."""


def _draw_placeholder(prompt, out, cols, rows, cell_w, cell_h, ref):
    """A deterministic keyable stand-in: numbered humanoid silhouettes on EB green, one
    per cell, bottom-aligned. Doubles as a self-contained slice smoke-test fixture."""
    W, H = cols * cell_w, rows * cell_h
    im = Image.new("RGB", (W, H), EB_GREEN)   # keyable green background — nothing else opaque
    d = ImageDraw.Draw(im)
    # a tint derived from the prompt so different prompts look different (kept off-green so it keys)
    tint = (60 + (sum(map(ord, prompt)) % 150), 40, 200)
    for r in range(rows):
        for c in range(cols):
            cx, cy = c * cell_w, r * cell_h
            bw, bh = int(cell_w * 0.42), int(cell_h * 0.66)
            x0 = cx + (cell_w - bw) // 2
            y1 = cy + cell_h - 4          # bottom-aligned (feet near cell bottom → anchorY 0)
            y0 = y1 - bh
            d.rectangle([x0, y0, x0 + bw, y1], fill=tint, outline=(0, 0, 0), width=2)
            head_r = bw // 3
            hx = x0 + bw // 2
            d.ellipse([hx - head_r, y0 - head_r * 2, hx + head_r, y0], fill=tint, outline=(0, 0, 0), width=2)
    im.save(out)
    return im


def generate_sheet(prompt, out, cols=4, rows=1, cell_w=96, cell_h=128, ref=None):
    """text → base sheet. Uses SPRITE_GEN_BACKEND (module:function) if set, else a
    keyable placeholder + a printed TODO documenting the backend interface."""
    backend = os.environ.get("SPRITE_GEN_BACKEND")
    if backend:
        mod_name, fn_name = backend.split(":")
        spec = importlib.util.find_spec(mod_name)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        path = getattr(mod, fn_name)(prompt, out, cols=cols, rows=rows,
                                     cell_w=cell_w, cell_h=cell_h, ref=ref)
        print(f"OK {path}: generated via backend {backend}")
        return path
    _draw_placeholder(prompt, out, cols, rows, cell_w, cell_h, ref)
    print(f"OK {out}: PLACEHOLDER {cols*rows}-frame sheet ({cols*cell_w}x{rows*cell_h}) on keyable green")
    print(f'   prompt: "{prompt}"' + (f"  ref: {ref}" if ref else ""))
    print("\n" + GEN_BACKEND_DOC)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# CONTACT — montage a strip for eyeballing (like gen_*_creative.py preview())
# ─────────────────────────────────────────────────────────────────────────────
def contact_sheet(src, out, cell_w=None, scale=3, bg=(28, 28, 34)):
    """Tile a *_uniform.png strip into a labeled, scaled montage for a quick visual check."""
    im = Image.open(src).convert("RGBA")
    W, H = im.size
    if cell_w is None:
        # infer: gutter-detect on the strip to find the cell pitch
        arr = np.asarray(im)
        boxes = _detect_gutter(arr, 2)
        n = max(1, len(boxes))
        cell_w = W // n
    n = max(1, W // cell_w)
    pad = 6
    mont = Image.new("RGBA", (n * (cell_w * scale + pad) + pad, H * scale + 24 + pad), (*bg, 255))
    d = ImageDraw.Draw(mont)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
    except Exception:
        font = ImageFont.load_default()
    for i in range(n):
        cell = im.crop((i * cell_w, 0, (i + 1) * cell_w, H))
        rs = cell.resize((cell_w * scale, H * scale), Image.NEAREST)
        x = pad + i * (cell_w * scale + pad)
        mont.alpha_composite(rs, (x, 20))
        d.text((x + 2, 4), f"{i}", fill=(230, 230, 235, 255), font=font)
    mont.convert("RGB").save(out)
    print(f"OK {out}: contact sheet, {n} frames @ {scale}x")
    return n


# ─────────────────────────────────────────────────────────────────────────────
def _hex2rgb(h):
    h = h.strip().lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _parse_picks(s):
    return [int(x) for x in s.split(",")] if s else None


def main():
    ap = argparse.ArgumentParser(prog="sprite_tool.py", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="text description → base sprite sheet (stub backend + keyable placeholder)")
    g.add_argument("--prompt", required=True)
    g.add_argument("--out", required=True)
    g.add_argument("--cols", type=int, default=4)
    g.add_argument("--rows", type=int, default=1)
    g.add_argument("--cell-w", dest="cell_w", type=int, default=96)
    g.add_argument("--cell-h", dest="cell_h", type=int, default=128)
    g.add_argument("--ref", default=None, help="reference character name for style match (passed to backend)")

    k = sub.add_parser("key", help="remove background (green-screen / solid color / alpha), optional tight flood")
    k.add_argument("--in", dest="src", required=True)
    k.add_argument("--out", required=True)
    k.add_argument("--mode", choices=["green", "color", "alpha"], default="green")
    k.add_argument("--key", default=None, help="#rrggbb for --mode color")
    k.add_argument("--tol", type=int, default=60)
    k.add_argument("--teal-tol", dest="teal_tol", type=int, default=40)
    k.add_argument("--flood", action="store_true", help="tight key: only remove border-connected background")
    k.add_argument("--report", action="store_true")

    s = sub.add_parser("slice", help="detect frames → uniform feet-aligned *_uniform.png strip")
    s.add_argument("--in", dest="src", required=True)
    s.add_argument("--out", required=True)
    s.add_argument("--method", choices=["gutter", "cc"], default="gutter")
    s.add_argument("--flip", action="store_true", help="mirror each cell (rips drawn facing LEFT)")
    s.add_argument("--min-area", dest="min_area", type=int, default=500, help="cc: min opaque px per frame")
    s.add_argument("--min-dim", dest="min_dim", type=int, default=18, help="cc: min frame width/height")
    s.add_argument("--band", type=int, default=60, help="cc: row-band height for reading order")
    s.add_argument("--min-w", dest="min_w", type=int, default=2, help="gutter: min frame width")
    s.add_argument("--picks", default=None, help="comma list to keep/reorder detected frames, e.g. 0,3,5")
    s.add_argument("--pad", type=int, default=1)
    s.add_argument("--report", action="store_true")

    r = sub.add_parser("recolor", help="palette remap / hue shift → __<tag>.png (via recolor_palette.py)")
    r.add_argument("--in", dest="src", required=True)
    r.add_argument("--out-tag", dest="out_tag", required=True)
    r.add_argument("--to-hue", dest="to_hue", default=None)
    r.add_argument("--to", default=None, help="#rrggbb exact-map target")
    r.add_argument("--from-hue", dest="from_hue", default=None, help="LO-HI hue selection")
    r.add_argument("--from", dest="from_", default=None, help="#rgb,#rgb sample selection")
    r.add_argument("--yband", default=None, help="LO-HI vertical fraction to scope (e.g. 0-0.45 = head)")
    r.add_argument("--tol", type=float, default=45.0)
    r.add_argument("--min-sat", dest="min_sat", type=float, default=0.15)
    r.add_argument("--report", action="store_true")

    c = sub.add_parser("contact", help="tile a strip into a scaled montage for a visual check")
    c.add_argument("--in", dest="src", required=True)
    c.add_argument("--out", required=True)
    c.add_argument("--cell-w", dest="cell_w", type=int, default=None)
    c.add_argument("--scale", type=int, default=3)

    a = ap.parse_args()
    if a.cmd == "generate":
        generate_sheet(a.prompt, a.out, a.cols, a.rows, a.cell_w, a.cell_h, a.ref)
    elif a.cmd == "key":
        key_image(a.src, a.out, a.mode, a.key, a.tol, a.teal_tol, a.flood, a.report)
    elif a.cmd == "slice":
        slice_sheet(a.src, a.out, a.method, a.flip, a.min_area, a.min_dim,
                    a.band, a.min_w, _parse_picks(a.picks), a.pad, a.report)
    elif a.cmd == "recolor":
        recolor_sheet(a.src, a.out_tag, a.to_hue, a.to, a.from_hue, a.from_,
                      a.yband, a.tol, a.min_sat, a.report)
    elif a.cmd == "contact":
        contact_sheet(a.src, a.out, a.cell_w, a.scale)


if __name__ == "__main__":
    main()
