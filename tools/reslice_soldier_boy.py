#!/usr/bin/env python3
# Slice SOLDIER BOY (soldierboy_sprite_sheet_by_crow_animaraz..., RGBA, transparent gutters)
# into clean, feet-aligned uniform cells. Source is ONE big alpha-keyed sheet whose frames are
# organised into horizontal ROW bands (see docs/soldier_boy/SPRITE_LEDGER.md).
#
# PIPELINE (matches tools/reslice_spiderman.py / reslice_onoki.py conventions):
#   1. Cut on ALPHA (corners already alpha=0 — no chroma key needed).
#   2. ROW BANDS: project alpha onto Y; a run of rows with any opaque pixel is a band,
#      transparent gutters split bands. Bands sorted top->bottom = ledger row index (1-based).
#   3. FRAMES per band: project alpha onto X within the band; opaque column runs = frames,
#      sorted left->right. (minw filters stray specks.)  Per-frame vertical bbox is then
#      recomputed so cape/FX above/below don't distort the feet baseline.
#   4. `boxes`  -> dump indexed list + labeled contact sheet (row.frame on every cell). LOOK.
#   5. `strip`  -> repack a chosen set of (row,frame) picks into ONE uniform cell:
#      centered-X on BODY center, BOTTOM-aligned (feet). NEAREST only, never interpolate.
#
# Body center for X-anchor uses the WIDEST horizontal band of the frame (torso/legs), NOT the
# full bbox — so an extended cape / gold-item streak off to one side doesn't shove the body.
import sys, json
from PIL import Image, ImageDraw

SRC = "soldierboy_sprite_sheet_by_crow_animaraz_by_metalsonictypeone_dlwzetj.png"
ALPHA = 16
MINW = 10          # min frame width (px) to count as a real frame
MINH = 10          # min band height
GUT = 1            # a gutter row/col is fully transparent


def load():
    im = Image.open(SRC).convert("RGBA")
    return im, im.load(), im.size


def row_bands(px, W, H):
    """Opaque row runs (y0,y1) split by transparent gutters."""
    opaque = []
    for y in range(H):
        hit = False
        for x in range(0, W, 2):               # stride 2 for speed; enough to detect a band
            if px[x, y][3] > ALPHA:
                hit = True; break
        opaque.append(hit)
    bands = []; s = -1
    for y in range(H):
        if opaque[y]:
            if s < 0: s = y
        else:
            if s >= 0:
                if y - s >= MINH: bands.append((s, y - 1))
                s = -1
    if s >= 0 and H - s >= MINH: bands.append((s, H - 1))
    return bands


def col_runs(px, x0, x1, y0, y1):
    """Opaque column runs within a band (frames), left->right."""
    runs = []; s = -1
    for x in range(x0, x1 + 1):
        hit = False
        for y in range(y0, y1 + 1):
            if px[x, y][3] > ALPHA:
                hit = True; break
        if hit:
            if s < 0: s = x
        else:
            if s >= 0: runs.append((s, x - 1)); s = -1
    if s >= 0: runs.append((s, x1))
    return [r for r in runs if (r[1] - r[0] + 1) >= MINW]


def frame_bbox(px, rx0, rx1, by0, by1):
    """Tight content bbox of a frame cell."""
    minx, maxx, miny, maxy = rx1 + 1, rx0 - 1, by1 + 1, by0 - 1
    for y in range(by0, by1 + 1):
        for x in range(rx0, rx1 + 1):
            if px[x, y][3] > ALPHA:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    if maxx < minx: return None
    return (minx, miny, maxx, maxy)


def detect():
    im, px, (W, H) = load()
    bands = row_bands(px, W, H)
    out = []   # list of rows; each row = list of (minx,miny,maxx,maxy)
    for (by0, by1) in bands:
        runs = col_runs(px, 0, W - 1, by0, by1)
        frames = []
        for (rx0, rx1) in runs:
            bb = frame_bbox(px, rx0, rx1, by0, by1)
            if bb: frames.append(bb)
        out.append(frames)
    return im, out


def dump_boxes():
    im, rows = detect()
    total = sum(len(r) for r in rows)
    print(f"# {len(rows)} row bands, {total} frames")
    for ri, frames in enumerate(rows, 1):
        dims = " ".join(f"{(f[2]-f[0]+1)}x{(f[3]-f[1]+1)}" for f in frames)
        print(f"row {ri:2d}: {len(frames):2d}f  {dims}")
    # labeled contact sheet, one printed row-band per visual row (wrap long bands)
    CW, CH, LH, PAD, PER = 96, 120, 14, 4, 16
    cw, ch = CW + PAD, CH + LH + PAD
    layout = []  # (visual_row, col, ri, fi, bbox)
    vr = 0
    for ri, frames in enumerate(rows, 1):
        for fi, bb in enumerate(frames):
            col = fi % PER
            if fi and col == 0: vr += 1
            layout.append((vr, col, ri, fi, bb))
        vr += 1
    vrows = (max((l[0] for l in layout), default=0) + 1)
    img = Image.new("RGB", (PAD + PER * cw, PAD + vrows * ch), (60, 60, 68))
    d = ImageDraw.Draw(img)
    for (vrw, col, ri, fi, bb) in layout:
        x0, y0, x1, y1 = bb
        cell = im.crop((x0, y0, x1 + 1, y1 + 1))
        bg = Image.new("RGB", cell.size, (60, 60, 68))
        bg.paste(cell, (0, 0), cell)
        w, h = bg.size
        sc = min(CW / w, CH / h)
        nw, nh = max(1, int(w * sc)), max(1, int(h * sc))
        bg = bg.resize((nw, nh), Image.NEAREST)
        cx, cy = PAD + col * cw, PAD + vrw * ch + LH
        img.paste(bg, (cx + (CW - nw) // 2, cy + (CH - nh)))
        d.text((cx, cy - LH + 1), f"{ri}.{fi}", fill=(150, 255, 150))
    img.save("soldier_boy_work/_contact.png")
    print("saved soldier_boy_work/_contact.png", img.size)


# ---- strip export -------------------------------------------------------------
def body_center_x(im, bb):
    """X center of the widest opaque horizontal slab (torso/legs), ignoring thin cape/FX."""
    x0, y0, x1, y1 = bb
    px = im.load()
    best = None
    for y in range(y0, y1 + 1):
        xs = [x for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
        if not xs: continue
        w = xs[-1] - xs[0]
        if best is None or w > best[0]:
            best = (w, (xs[0] + xs[-1]) // 2)
    return best[1] if best else (x0 + x1) // 2


def export_strip(picks, out, anchor="feet"):
    """picks = list of (row, frame) 1-based row, 0-based frame."""
    im, rows = detect()
    cells = []
    for (r, f) in picks:
        bb = rows[r - 1][f]
        cells.append((bb, body_center_x(im, bb)))
    uW = max(bb[2] - bb[0] + 1 for bb, _ in cells) + 4
    uH = max(bb[3] - bb[1] + 1 for bb, _ in cells) + 4
    # ensure room so body-center shift never clips
    half = uW // 2
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, (bb, bcx) in enumerate(cells):
        x0, y0, x1, y1 = bb
        cell = im.crop((x0, y0, x1 + 1, y1 + 1))
        w, h = cell.size
        # place so body-center sits at cell mid-X
        off = (bcx - x0)
        destx = i * uW + half - off
        destx = max(i * uW, min(destx, i * uW + uW - w))
        desty = uH - h - 2 if anchor == "feet" else (uH - h) // 2
        strip.paste(cell, (destx, desty), cell)
    strip.save(out)
    print(f"OK {out}: {len(cells)}f cell {uW}x{uH}")


# ---- full strip mapping (every row has a home; see docs/soldier_boy/SPRITE_LEDGER.md) ----
# key -> (picks, anchor). picks = [(row1based, frame0based), ...]. Soldier Boy faces RIGHT on
# the source sheet and the engine draws P1 un-flipped expecting RIGHT, so NO flip is applied.
def R(row, *frames):
    return [(row, f) for f in frames]

STRIPS = {
    # ── MOVEMENT / STATE ──
    "idle":        (R(1, 0, 1, 2, 3, 4), "feet"),
    "walk":        (R(4, 0, 1, 2, 3, 4, 5), "feet"),
    "run":         (R(4, 6, 7, 8, 9, 10, 11), "feet"),
    "jump":        (R(5, 0, 1, 2), "feet"),
    "fall":        (R(5, 3, 4), "feet"),
    "airflip":     (R(6, 0, 1, 2, 3, 4, 5, 6, 7), "center"),   # air_dash / air_recover
    "crouch":      (R(3, 0, 1, 2) + R(9, 0), "feet"),
    "crouchmove":  (R(10, 0, 1, 2, 3, 4, 5, 6, 7, 8), "feet"), # crouch transitions / crouch light
    "block":       (R(2, 0, 1), "feet"),                        # Gold Brace stand block
    "roll":        (R(8, 0, 1, 2, 3, 4, 5, 6, 7), "feet"),      # Back Roll / slide
    # ── NORMALS ──
    "light":       (R(7, 0, 1, 2) + R(16, 0, 1), "feet"),       # Jab (+ forward-strike chain)
    "heavy":       (R(7, 3, 4, 5) + R(15, 0, 1, 2), "feet"),    # Heavy (windup + swing)
    "up":          (R(12, 0, 1, 2), "feet"),                    # Launcher (uppercut)
    "low":         (R(22, 0, 1, 2), "feet"),                    # Low (hits low)
    "lowsweep":    (R(24, 0, 1, 2), "feet"),
    "air":         (R(20, 0, 1, 2), "center"),                  # Air attack
    "downair":     (R(37, 0, 1) + R(20, 3, 4, 5) + R(31, 0, 1, 2), "center"),  # Diving Kick
    "kick":        (R(19, 0, 1, 2, 3, 4, 5, 6, 7), "feet"),     # heavy kick string / win flourish
    "airkit":      (R(45, 0, 1, 2, 3, 4), "center"),            # air attack variants / jump attack
    # ── HURT / KNOCKDOWN / GETUP ──
    "hurt":        (R(11, 0, 1, 2) + R(46, 0, 1, 2) + R(47, 0, 1, 2), "feet"),  # hit_react light/high/mid
    "stun":        (R(13, 0, 1, 2, 3, 4), "feet"),              # hit_react heavy / stun
    "dizzy":       (R(48, 0, 1, 2, 3), "feet"),
    "blockhit":    (R(14, 0, 1) + R(49, 0, 1, 2) + R(50, 0, 1, 2) + R(51, 0, 1, 2), "feet"),
    "crouchhit":   (R(21, 0, 1, 2) + R(25, 0, 1, 2), "feet"),
    "crouchstand": (R(23, 0, 1, 2, 3, 4), "feet"),
    "knockdown":   (R(26, 0, 1, 2, 3, 4, 5, 6, 7), "feet"),     # knockdown_slide / get_up starts
    "knockdownland": (R(27, 0, 1) + R(32, 0), "feet"),
    "knockdownfall": (R(52, 0, 1, 2, 3, 4, 5, 6), "center"),
    "launchedfall":  (R(53, 0, 1, 2, 3, 4, 5), "center"),
    "tumble":      (R(54, 0, 1, 2, 3, 4), "feet"),
    "getup":       (R(55, 0, 1, 2, 3) + R(56, 0, 1, 2), "feet"),
    "lose":        (R(55, 0, 1, 2, 3), "feet"),
    "win":         (R(57, 0, 1, 2, 3) + R(58, 0, 1, 2), "feet"),
    # ── SPECIALS / FX ──
    "shieldthrow": (R(28, 0, 1, 2), "feet"),                    # Shield Toss release
    "shieldspin":  (R(34, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16), "feet"),  # full toss + whip + recovery
    "shieldproj":  (R(35, 0, 1, 2, 3, 4, 5), "center"),         # projectile art / debris
    "goldrush":    (R(33, 0, 1, 2) + R(17, 0, 1, 2, 3, 4, 5, 6) + R(18, 0, 1, 2), "feet"),  # startup + lunge + recovery
    "goldrushfx":  (R(33, 3, 4, 5, 6, 7, 8), "center"),         # streak FX
    "smg":         (R(39, 0, 1, 2, 3), "feet"),
    "rifle":       (R(40, 0, 1, 2, 3), "feet"),
    "cyclone":     (R(41, 0, 1, 2, 3, 4), "feet"),
    "armeddraw":   (R(36, 0, 1, 2, 3), "feet"),                 # Armed Mode draw/holster
    "armedjab":    (R(43, 0, 1, 2, 3), "feet"),                 # SMG (armed jab)
    "armedheavy":  (R(44, 0, 1, 2, 3), "feet"),                 # rifle (armed heavy)
    "armedaa":     (R(42, 0, 1, 2, 3), "feet"),                 # armed anti-air
    "ultpose":     (R(38, 0), "feet"),                          # Ultimate pose hold (wide)
    "ultblast":    (R(29, 0, 1, 2, 3, 4, 5), "center"),         # Ultimate detonation
    "ultrecover":  (R(30, 0, 1), "feet"),
}


def export_all():
    for key, (picks, anchor) in STRIPS.items():
        export_strip(picks, f"soldier_boy_{key}_uniform.png", anchor)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "boxes"
    if cmd == "boxes":
        dump_boxes()
    elif cmd == "all":
        export_all()
    elif cmd == "strip":
        picks = json.loads(sys.argv[2])
        out = sys.argv[3]
        anchor = sys.argv[4] if len(sys.argv) > 4 else "feet"
        export_strip([tuple(p) for p in picks], out, anchor)
