#!/usr/bin/env python3
"""Build labeled contact sheet(s) of every SKINLESS character's idle sprite, for
efficient first-pass skin-region identification. One clean idle frame per char,
height-normalized (nearest-neighbor pixel scaling), name printed below each.

Scope: FIRST-PASS color-region ID only. Does NOT replace the standing skin
verification (real non-idle frames, outline-bleed, near-dup palette checks)."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# key, display name, idle sheet, frame width, frame height, which frame to crop
CHARS = {
    "vegeta_dark":     ("Dark Vegeta",     "vegeta_dark_idle_uniform.png",        41, 53, 0),
    "piccolo":         ("Piccolo",         "piccolo_idle_uniform.png",            70, 168, 0),
    "bardock":         ("Bardock",         "bardock_idle_uniform.png",            108, 122, 0),
    "baki":            ("Baki Hanma",      "baki_idle_uniform.png",               40, 56, 0),
    "boruto":          ("Boruto",          "boruto_idle_uniform.png",             52, 72, 0),
    "kakashi":         ("Kakashi",         "kakashi_idle_uniform.png",            43, 67, 0),
    "kurapika":        ("Kurapika",        "kurapika_idle_uniform.png",           31, 51, 0),
    "handler":         ("Megumi (Handler)","handler_idle_uniform.png",            26, 62, 0),
    "ghostface_billy": ("Billy Ghostface", "ghostface_idle_uniform__billy.png",   75, 116, 0),
    "iron_man":        ("Iron Man (1)",    "iron_man_idle_uniform.png",           48, 66, 0),
    "iron_man_2":      ("Iron Man (2)",    "iron_man_2_idle_uniform.png",         39, 56, 0),
    "iron_man_3":      ("Iron Man (3)",    "iron_man_3_idle_uniform.png",         35, 42, 0),
    "gwen":            ("Gwen",            "gwen_idle_uniform.png",               30, 50, 0),
    "miles":           ("Miles Morales",   "miles_idle_uniform.png",              26, 37, 0),
    "dark_knight":     ("Batman (Dark Knight)","dark_knight_idle_uniform.png",    119, 128, 0),
    "vilgax":          ("Vilgax",          "vilgax_idle_uniform.png",             34, 46, 0),
    "ippo":            ("Ippo Makunouchi", "ippo_idle_uniform.png",               35, 55, 0),
}

# Two balanced sheets: anime cast / Marvel-DC-Ben10-misc cast.
SHEETS = [
    ["vegeta_dark", "piccolo", "bardock", "baki", "boruto", "kakashi", "kurapika", "handler", "ghostface_billy"],
    ["iron_man", "iron_man_2", "iron_man_3", "gwen", "miles", "dark_knight", "vilgax", "ippo"],
]

# Layout
COLS = 3
SPRITE_H = 210          # normalized sprite height (px) before fitting
CELL_W = 300
CELL_H = 300            # sprite area
LABEL_H = 46
MARGIN = 40
GAP = 24
PANEL = (154, 160, 166, 255)   # neutral medium gray panel (unbiased for color reading)
BG = (28, 30, 36, 255)         # dark slate sheet background (high contrast for labels)
TITLE_H = 70


def load_font(size, bold=True):
    cands = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for c in cands:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def crop_frame(path, fw, fh, idx):
    img = Image.open(path).convert("RGBA")
    box = (idx * fw, 0, idx * fw + fw, min(fh, img.height))
    frame = img.crop(box)
    # Autocrop to non-transparent bbox for clean centering.
    bbox = frame.getbbox()
    if bbox:
        frame = frame.crop(bbox)
    return frame


def fit_sprite(sprite):
    # Height-normalize with nearest-neighbor (pixel art), then clamp width to cell.
    w, h = sprite.size
    scale = SPRITE_H / h
    nw, nh = max(1, round(w * scale)), SPRITE_H
    if nw > CELL_W - 20:
        scale = (CELL_W - 20) / w
        nw, nh = CELL_W - 20, max(1, round(h * scale))
    return sprite.resize((nw, nh), Image.NEAREST)


def build_sheet(keys, out_path, title):
    rows = (len(keys) + COLS - 1) // COLS
    W = MARGIN * 2 + COLS * CELL_W + (COLS - 1) * GAP
    H = MARGIN * 2 + TITLE_H + rows * (CELL_H + LABEL_H) + (rows - 1) * GAP
    sheet = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(sheet)

    tfont = load_font(28)
    lfont = load_font(26)
    sfont = load_font(16, bold=False)

    draw.text((MARGIN, MARGIN - 4), title, font=tfont, fill=(255, 255, 255, 255))
    draw.text((MARGIN, MARGIN + 32), "First-pass color-region reference only — still needs full skin "
              "verification (real frames, bleed, dup-palette) before shipping.",
              font=sfont, fill=(170, 176, 184, 255))

    for i, key in enumerate(keys):
        name, fn, fw, fh, idx = CHARS[key]
        r, c = divmod(i, COLS)
        x = MARGIN + c * (CELL_W + GAP)
        y = MARGIN + TITLE_H + r * (CELL_H + LABEL_H + GAP)

        # panel
        draw.rectangle([x, y, x + CELL_W, y + CELL_H], fill=PANEL)
        draw.rectangle([x, y, x + CELL_W, y + CELL_H], outline=(90, 94, 100, 255), width=2)

        sprite = fit_sprite(crop_frame(os.path.join(ROOT, fn), fw, fh, idx))
        sx = x + (CELL_W - sprite.width) // 2
        sy = y + (CELL_H - sprite.height) // 2
        sheet.alpha_composite(sprite, (sx, sy))

        # label strip
        ly = y + CELL_H
        draw.rectangle([x, ly, x + CELL_W, ly + LABEL_H], fill=(16, 17, 20, 255))
        bb = draw.textbbox((0, 0), name, font=lfont)
        tw = bb[2] - bb[0]
        draw.text((x + (CELL_W - tw) // 2, ly + 8), name, font=lfont, fill=(255, 255, 255, 255))

    sheet.convert("RGB").save(out_path)
    print(f"WROTE {out_path}  ({W}x{H}, {len(keys)} chars)")


if __name__ == "__main__":
    build_sheet(SHEETS[0], os.path.join(ROOT, "aaaaaa_1.png"),
                "SKINLESS ROSTER · Sheet 1/2 — Anime cast (9)")
    build_sheet(SHEETS[1], os.path.join(ROOT, "aaaaaa_2.png"),
                "SKINLESS ROSTER · Sheet 2/2 — Marvel/DC/Ben10/misc (8)")
