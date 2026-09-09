#!/usr/bin/env python3
"""
sprite_gen_backend.py — REAL image-generation backend for sprite_tool.py `generate`,
using the Stability AI REST API (v2beta Stable Image). No SDK required — plain HTTPS
via `requests`.

It implements the documented backend contract sprite_tool.py expects:

    generate(prompt: str, out_path: str, *, cols: int, rows: int,
             cell_w: int, cell_h: int, ref: str | None) -> str

and writes a sprite SHEET (cols*rows frames, each figure BOTTOM-aligned in its
cell) on a SOLID #00FF50 green background by default — so the existing
`sprite_tool.py key --mode green` → `slice` pipeline consumes it unchanged.

HOW IT WORKS
  * One Stable Image call PER FRAME (txt2img), style_preset "pixel-art", with a
    per-frame pose hint. A fixed base seed is reused across frames so the character
    identity stays as consistent as txt2img allows (cross-frame drift is the known
    limitation of any per-frame txt2img approach — documented, not hidden).
  * Each frame is run through Stability's remove-background edit endpoint to get a
    clean cutout, then composited bottom-aligned into its cell. This yields an EXACT
    #00FF50 background (no gradient/anti-alias green to fight) so keying is crisp.
  * Set SPRITE_GEN_BG=alpha to emit a transparent sheet instead (then use
    `sprite_tool.py key --mode alpha` or slice directly).

ACTIVATION (from the repo root):
    export STABILITY_API_KEY=sk-...            # your Stability key (bills your account)
    python3 tools/sprite_tool.py generate --prompt "..." --out cell_idle_raw.png \\
        --cols 6 --rows 1 --cell-w 96 --cell-h 128 --ref piccolo
  sprite_tool.py auto-uses this module (SPRITE_GEN_BACKEND defaults to
  "sprite_gen_backend:generate"); with no key it falls back to the keyable placeholder.

CONFIG (env vars, all optional except the key):
  STABILITY_API_KEY     required to make real calls.
  SPRITE_GEN_MODEL      core | sd3 | ultra        (default core — cheapest, pixel-art preset)
  SPRITE_GEN_BG         green | alpha             (default green — pipeline-contract bg)
  SPRITE_GEN_REMOVE_BG  1 | 0                     (default 1 — clean cutout per frame)
  SPRITE_GEN_STYLE      Stability style_preset    (default pixel-art)
  SPRITE_GEN_SEED       int; 0 = random per run   (default 42 — stable identity)
  SPRITE_GEN_NEG        extra negative-prompt text (appended to the built-in one)
  SPRITE_GEN_DRY_RUN    1 = skip all HTTP, synthesize frames locally (offline test path)
"""
import io
import os

from PIL import Image, ImageDraw

API_ROOT = "https://api.stability.ai/v2beta/stable-image"
GEN_URLS = {
    "core":  f"{API_ROOT}/generate/core",
    "sd3":   f"{API_ROOT}/generate/sd3",
    "ultra": f"{API_ROOT}/generate/ultra",
}
REMOVE_BG_URL = f"{API_ROOT}/edit/remove-background"
GREEN = (0, 255, 80)

# Stability's allowed aspect_ratio strings → numeric w/h, for mapping a cell size to
# the nearest permitted request aspect (the returned image is then fit into the cell).
_ASPECTS = {
    "16:9": 16/9, "21:9": 21/9, "9:16": 9/16, "9:21": 9/21, "1:1": 1.0,
    "2:3": 2/3, "3:2": 3/2, "4:5": 4/5, "5:4": 5/4,
}

_NEG_BASE = ("multiple characters, several figures, split screen, grid, text, "
             "watermark, signature, blurry, low quality, extra limbs, cropped, frame border")


def available():
    """True when this backend can actually run (key present, or dry-run)."""
    return bool(os.environ.get("STABILITY_API_KEY")) or _flag("SPRITE_GEN_DRY_RUN")


def _flag(name, default=False):
    v = os.environ.get(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def _nearest_aspect(cell_w, cell_h):
    target = cell_w / cell_h
    return min(_ASPECTS, key=lambda k: abs(_ASPECTS[k] - target))


def _pose_hint(i, n):
    """Light, honest per-frame variation for an N-frame loop."""
    if n <= 1:
        return "neutral idle stance"
    seq = ["neutral idle stance", "weight shifting, mid-breath", "peak of the motion",
           "settling back", "follow-through", "recovering to neutral"]
    return f"{seq[i % len(seq)]} (animation frame {i+1} of {n})"


def _build_prompt(prompt, ref, pose):
    parts = [prompt.strip().rstrip(".")]
    if ref:
        parts.append(f"drawn in the pixel-art style of the character {ref}")
    parts += [
        pose,
        "single full-body 2D fighting-game character sprite",
        "side-on pose facing right, standing on the ground, feet at the bottom",
        "clean thick outlines, crisp pixel art, flat cel shading",
        "isolated on a solid chroma-key green background, no shadow, no ground",
    ]
    return ", ".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# Stability REST calls (multipart; Stability requires a multipart body even with no
# file upload — the conventional `files={"none": ""}` trick supplies one).
# ─────────────────────────────────────────────────────────────────────────────
def _headers(key):
    return {"Authorization": f"Bearer {key}", "Accept": "image/*"}


def _stability_core(key, prompt, aspect, model, style, seed, extra_neg):
    import requests
    url = GEN_URLS.get(model, GEN_URLS["core"])
    neg = _NEG_BASE + (", " + extra_neg if extra_neg else "")
    data = {"prompt": prompt, "output_format": "png", "aspect_ratio": aspect,
            "negative_prompt": neg, "seed": str(seed)}
    if style:
        data["style_preset"] = style          # sd3 ignores style_preset; harmless
    resp = requests.post(url, headers=_headers(key), files={"none": ""}, data=data, timeout=120)
    if resp.status_code != 200:
        raise RuntimeError(f"Stability generate {resp.status_code}: {resp.text[:400]}")
    return Image.open(io.BytesIO(resp.content)).convert("RGBA")


def _stability_remove_bg(key, img):
    import requests
    buf = io.BytesIO()
    img.convert("RGBA").save(buf, format="PNG")
    buf.seek(0)
    resp = requests.post(REMOVE_BG_URL, headers=_headers(key),
                         files={"image": ("frame.png", buf, "image/png")},
                         data={"output_format": "png"}, timeout=120)
    if resp.status_code != 200:
        raise RuntimeError(f"Stability remove-background {resp.status_code}: {resp.text[:400]}")
    return Image.open(io.BytesIO(resp.content)).convert("RGBA")


def _synthetic_frame(prompt, i, n, aspect):
    """DRY-RUN stand-in: a transparent-cutout humanoid, so the compose/pipeline path
    is exercised end-to-end offline (no key, no network). NOT real art."""
    w, h = 384, 512
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    tint = (60 + (sum(map(ord, prompt)) % 150), 40, 200, 255)
    lean = int((i - n / 2) * 8)               # slight per-frame pose shift
    bw, bh = int(w * 0.34), int(h * 0.5)
    x0 = (w - bw) // 2 + lean
    y1 = h - 8
    y0 = y1 - bh
    d.rectangle([x0, y0, x0 + bw, y1], fill=tint, outline=(0, 0, 0, 255), width=4)
    hr = bw // 2
    hx = x0 + bw // 2
    d.ellipse([hx - hr, y0 - hr * 2, hx + hr, y0], fill=tint, outline=(0, 0, 0, 255), width=4)
    return im


# ─────────────────────────────────────────────────────────────────────────────
def _fit_bottom(frame, cell_w, cell_h, pad=1):
    """Scale a frame to CONTAIN within the cell (minus pad), returned same-size as scaled."""
    fw, fh = frame.size
    scale = min((cell_w - 2 * pad) / fw, (cell_h - 2 * pad) / fh)
    nw, nh = max(1, int(fw * scale)), max(1, int(fh * scale))
    return frame.resize((nw, nh), Image.LANCZOS)


def compose_sheet(frames, cols, rows, cell_w, cell_h, bg="green"):
    """Tile frames into one sheet, each centered-X and BOTTOM-aligned in its cell."""
    W, H = cols * cell_w, rows * cell_h
    if bg == "alpha":
        sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    else:
        sheet = Image.new("RGBA", (W, H), (*GREEN, 255))
    for i, frame in enumerate(frames):
        r, c = divmod(i, cols)
        fit = _fit_bottom(frame.convert("RGBA"), cell_w, cell_h)
        fw, fh = fit.size
        x = c * cell_w + (cell_w - fw) // 2
        y = r * cell_h + (cell_h - fh) - 1        # feet near cell bottom → anchorY 0
        sheet.alpha_composite(fit, (x, y))
    return sheet


def generate(prompt, out_path, *, cols=4, rows=1, cell_w=96, cell_h=128, ref=None):
    """Contract entry point sprite_tool.py calls. Returns out_path."""
    if not available():
        raise RuntimeError(
            "STABILITY_API_KEY not set (and SPRITE_GEN_DRY_RUN not enabled). "
            "export STABILITY_API_KEY=... to generate for real.")

    n = max(1, cols * rows)
    dry = _flag("SPRITE_GEN_DRY_RUN")
    key = os.environ.get("STABILITY_API_KEY", "")
    model = os.environ.get("SPRITE_GEN_MODEL", "core")
    style = os.environ.get("SPRITE_GEN_STYLE", "pixel-art")
    bg = os.environ.get("SPRITE_GEN_BG", "green")
    remove_bg = _flag("SPRITE_GEN_REMOVE_BG", default=True)
    extra_neg = os.environ.get("SPRITE_GEN_NEG", "")
    base_seed = int(os.environ.get("SPRITE_GEN_SEED", "42"))
    aspect = _nearest_aspect(cell_w, cell_h)

    frames = []
    for i in range(n):
        pose = _pose_hint(i, n)
        fp = _build_prompt(prompt, ref, pose)
        seed = 0 if base_seed == 0 else base_seed          # stable identity across frames
        if dry:
            frame = _synthetic_frame(prompt, i, n, aspect)
        else:
            frame = _stability_core(key, fp, aspect, model, style, seed, extra_neg)
            if remove_bg:
                frame = _stability_remove_bg(key, frame)
        frames.append(frame)
        print(f"  frame {i+1}/{n}: {pose}")

    sheet = compose_sheet(frames, cols, rows, cell_w, cell_h, bg)
    sheet.save(out_path)
    tag = "DRY-RUN synthetic" if dry else f"Stability {model}"
    print(f"OK {out_path}: {cols*rows}-frame sheet ({sheet.width}x{sheet.height}) "
          f"bg={bg} via {tag}")
    return out_path


if __name__ == "__main__":
    # Tiny manual harness: `SPRITE_GEN_DRY_RUN=1 python3 tools/sprite_gen_backend.py`
    import sys
    p = sys.argv[1] if len(sys.argv) > 1 else "a green-skinned alien mage, idle"
    generate(p, "sprite_gen_backend_test.png", cols=4, rows=1, cell_w=96, cell_h=128)
