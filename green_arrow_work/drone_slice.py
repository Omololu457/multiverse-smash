#!/usr/bin/env python3
"""Drone sheets (JPEG, upscaled pixel art) -> clean per-animation strips.
Pipeline per the brief:
 1. native block ~3px -> mode-downsample each frame by BLOCK to kill JPEG mush.
 2. per-drone palette (median-cut <=16) snap.
 3. key out lavender-grey bg (~#B3AFBD) with tuned tolerance; drop 1px fringe.
 4. white row LABELS (x<LABEL_CUT) are excluded from all frames.
 5. one integer re-upscale (UP) so drones share GA's pixel density.
Outputs: ga_<drone>_<anim>_sheet.png strips + a side-by-side contact sheet.
"""
import numpy as np
from PIL import Image, ImageDraw
from collections import Counter

BG = np.array([179, 175, 189])
BG_TOL = 42
LABEL_CUT = 430
BLOCK = 3            # native upscale factor in the JPEG
UP = 1              # re-upscale after downsample (native density == GA density)
MINPIX = 6

SHEETS = {
    "Free-Drones-Pack-Pixel-Art2.jpg": [
        # (drone, anim, count)  rows top->bottom
        ("overwatch", "death", 6), ("overwatch", "idle", 4), ("overwatch", "scan", 8),
        ("overwatch", "walk", 4), ("overwatch", "walkscan", 8),
        ("bulwark", "capsule", 6), ("bulwark", "drop", 6), ("bulwark", "walk", 4),
        ("bulwark", "walk2", 4),
    ],
    "Free-Drones-Pack-Pixel-Art3.jpg": [
        ("aegis", "death", 6), ("aegis", "idle", 4), ("aegis", "walk", 4),
        ("kestrel", "back", 4), ("kestrel", "death", 8), ("kestrel", "fire1", 11),
        ("kestrel", "fire2", 11), ("kestrel", "forward", 4), ("kestrel", "idle", 4),
    ],
    "Free-Drones-Pack-Pixel-Art6.jpg": [
        ("skyhook", "death", 6), ("skyhook", "idle", 4), ("skyhook", "landing", 7),
        ("skyhook", "walk", 4),
        ("payload", "drop", 6), ("payload", "bombs", 6),
    ],
}

def load_fg(path):
    im = Image.open(path).convert("RGB")
    a = np.array(im).astype(int)
    dist = np.sqrt(((a - BG) ** 2).sum(axis=2))
    fg = dist > BG_TOL
    fg[:, :LABEL_CUT] = False       # drop label column
    return a, fg

def bands(fg):
    rowhas = fg.any(axis=1)
    out = []
    y = 0; H = len(rowhas)
    while y < H:
        if rowhas[y]:
            y0 = y
            while y < H and rowhas[y]:
                y += 1
            # ignore 1-2px specks
            if y - y0 >= 6:
                out.append((y0, y - 1))
        else:
            y += 1
    return out

FORCE_EQUAL = {("skyhook", "death"): 6, ("payload", "bombs"): 6}

def split_equal(fg, y0, y1, n):
    """Divide the row's foreground x-extent into n equal frames (for scatter/tiny rows)."""
    sub = fg[y0:y1+1]
    cols = np.where(sub.any(axis=0))[0]
    if len(cols) == 0:
        return []
    x0, x1 = int(cols.min()), int(cols.max())
    w = (x1 - x0 + 1) / n
    out = []
    for k in range(n):
        fx0 = x0 + int(round(k*w)); fx1 = x0 + int(round((k+1)*w)) - 1
        fsub = sub[:, fx0:fx1+1]
        if fsub.sum() == 0:
            out.append((fx0, y0, fx1, y1)); continue
        ys = np.where(fsub.any(axis=1))[0]
        out.append((fx0, y0+int(ys.min()), fx1, y0+int(ys.max())))
    return out

def split_row(a, fg, y0, y1, gap=6):
    sub = fg[y0:y1+1]
    colhas = sub.any(axis=0)
    frames = []
    x = 0; W = sub.shape[1]
    while x < W:
        if colhas[x]:
            xs = x; run = 0; xe = x
            while x < W:
                if colhas[x]:
                    xe = x; run = 0
                else:
                    run += 1
                    if run >= gap: break
                x += 1
            fsub = sub[:, xs:xe+1]
            if fsub.sum() >= MINPIX:
                ys = np.where(fsub.any(axis=1))[0]
                xr = np.where(fsub.any(axis=0))[0]
                frames.append((xs+int(xr.min()), y0+int(ys.min()), xs+int(xr.max()), y0+int(ys.max())))
        else:
            x += 1
    return frames

def mode_downsample(cell_rgba, block):
    """Downsample by block using the modal opaque colour (crisp native pixels)."""
    h, w = cell_rgba.shape[:2]
    nh, nw = max(1, h // block), max(1, w // block)
    out = np.zeros((nh, nw, 4), dtype=np.uint8)
    for j in range(nh):
        for i in range(nw):
            blk = cell_rgba[j*block:(j+1)*block, i*block:(i+1)*block].reshape(-1, 4)
            opaque = blk[blk[:, 3] > 128]
            if len(opaque) < (block*block) * 0.35:
                continue  # mostly transparent -> stays transparent (fringe removal)
            cols = [tuple(p) for p in opaque]
            out[j, i] = Counter(cols).most_common(1)[0][0]
    return out

def frame_rgba(a, fg, box):
    x0, y0, x1, y1 = box
    sub = np.zeros((y1-y0+1, x1-x0+1, 4), dtype=np.uint8)
    region = a[y0:y1+1, x0:x1+1]
    mask = fg[y0:y1+1, x0:x1+1]
    sub[:, :, :3] = region
    sub[:, :, 3] = np.where(mask, 255, 0)
    return sub

def quantize(img, ncol=16):
    """median-cut palette snap on opaque pixels."""
    rgb = Image.fromarray(img[:, :, :3], "RGB").quantize(colors=ncol, method=Image.MEDIANCUT).convert("RGB")
    out = img.copy()
    out[:, :, :3] = np.array(rgb)
    return out

def build():
    drone_frames = {}   # (drone,anim) -> list of native rgba arrays
    originals = {}
    for path, rows in SHEETS.items():
        a, fg = load_fg(path)
        bds = bands(fg)
        if len(bds) != len(rows):
            print(f"!! {path}: detected {len(bds)} bands, expected {len(rows)} rows")
            for i, b in enumerate(bds):
                print("    band", i, b, "frames~", len(split_row(a, fg, b[0], b[1])))
        for (drone, anim, cnt), (y0, y1) in zip(rows, bds):
            if (drone, anim) in FORCE_EQUAL:
                fr = split_equal(fg, y0, y1, FORCE_EQUAL[(drone, anim)])
            else:
                fr = split_row(a, fg, y0, y1)
            natives = []
            for box in fr:
                cell = frame_rgba(a, fg, box)
                nat = mode_downsample(cell, BLOCK)
                if UP > 1:
                    nat = np.array(Image.fromarray(nat, "RGBA").resize(
                        (nat.shape[1]*UP, nat.shape[0]*UP), Image.NEAREST))
                natives.append(nat)
            drone_frames[(drone, anim)] = natives
            originals[(drone, anim)] = (path, y0, y1, fr)
            status = "ok" if len(fr) == cnt else f"GOT {len(fr)} != {cnt}"
            print(f"  {drone:9s} {anim:9s} frames={len(fr):2d} ({status})")
    # per-drone palette snap (collect all frames of a drone, snap consistently)
    drones = sorted(set(k[0] for k in drone_frames))
    for (drone, anim), frames in list(drone_frames.items()):
        drone_frames[(drone, anim)] = [quantize(f) for f in frames]
    # write strips bottom-centre aligned into uniform cells
    meta = {}
    for (drone, anim), frames in drone_frames.items():
        if not frames: continue
        imgs = [Image.fromarray(f, "RGBA") for f in frames]
        cw = max(i.width for i in imgs) + 2
        ch = max(i.height for i in imgs) + 2
        strip = Image.new("RGBA", (cw*len(imgs), ch), (0, 0, 0, 0))
        for k, im in enumerate(imgs):
            strip.alpha_composite(im, (k*cw + (cw-im.width)//2, (ch-im.height)//2))
        fn = f"ga_{drone}_{anim}_sheet.png"
        strip.save("./"+fn)
        meta[f"{drone}_{anim}"] = [fn, cw, ch, len(imgs)]
    import json
    json.dump(meta, open("green_arrow_work/drone_meta.json", "w"), indent=1)
    print(f"\nwrote {len(meta)} drone strips")

    # contact sheet: cleaned strip next to ORIGINAL row crop, per anim
    SC = 3
    rows = sorted(drone_frames.keys())
    rowh = 150
    out = Image.new("RGBA", (1700, rowh*len(rows)+10), (24, 24, 30, 255))
    d = ImageDraw.Draw(out)
    cy = 6
    for key in rows:
        drone, anim = key
        path, y0, y1, fr = originals[key]
        d.text((6, cy+4), f"{drone}", fill=(120, 255, 160, 255))
        d.text((6, cy+20), f"{anim}", fill=(150, 220, 255, 255))
        d.text((6, cy+36), f"{len(fr)}f", fill=(150, 150, 160, 255))
        # original (downscaled)
        orig = Image.open(path).convert("RGBA").crop((fr[0][0]-4 if fr else 430, y0, (fr[-1][2]+4) if fr else 800, y1))
        oscale = min(1.0, 700/max(1, orig.width))
        orig = orig.resize((max(1,int(orig.width*oscale)), max(1,int(orig.height*oscale))), Image.NEAREST)
        out.alpha_composite(orig, (90, cy+4))
        # cleaned
        cl = Image.open(f"./ga_{drone}_{anim}_sheet.png").convert("RGBA")
        cl = cl.resize((cl.width*SC, cl.height*SC), Image.NEAREST)
        out.alpha_composite(cl, (90, cy+70))
        cy += rowh
    out.convert("RGB").save("docs/greenarrow/contact_drones.png")
    print("wrote docs/greenarrow/contact_drones.png", out.size)

build()
