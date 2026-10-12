#!/usr/bin/env python3
# Slice SHIZUKU MURASAKI — rosterKey `shizuku` — from the source sheet
#   S = "shizuku_murasaki_jus_sprites_by_amandiohype_ddz62rv.png" (1520x3696 RGBA)
#   bg = opaque green (0,128,0)+noise. BORDER-FLOODFILL key (protects interior green:
#        her GREEN SHOES + light-blue Blinky are kept; only bg-connected green is cut).
# FACING: sheet draws Shizuku FACING RIGHT (glasses/front point right). Engine draws P1
#   un-flipped expecting RIGHT-facing art -> FLIP_H=False (same as meruem).
# Native-px band map from the build brief (verified on grid crops). Frames detected per-band
# as connected components, x-sorted, content-tightened, feet-aligned into uniform strips.
# Text labels sit ABOVE bands and are excluded via tight x/y windows. Credits, "ex." Gon
# example boxes, box borders, and the pink-haired BASE palette sprite are excluded by windowing.
# The 4-Koma anime cut-ins are RAW rects (own textured bg, no keying).
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "../shizuku_murasaki_jus_sprites_by_amandiohype_ddz62rv.png"
BG = np.array([0, 128, 0])
TOL = 40
ALPHA = 16
FLIP_H = False
OUT = ".."   # emit *_uniform.png into repo root (where the engine loads them)
W_SHEET = 1520

_rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)


def keyed():
    a = _rgb
    dist = np.abs(a - BG).sum(2)
    bgish = dist <= TOL
    lbl, n = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))
    alpha = np.where(remove, 0, 255).astype("uint8")
    return np.dstack([a.astype("uint8"), alpha])


IM = keyed()


def detect(y0, y1, x0=0, x1=W_SHEET, min_sz=120, min_w=8, min_h=10, gap=4):
    """1D column-projection splitter: frames are separated by >= `gap` empty columns.
    Hand-packed JUS rows aren't a uniform grid; this reads the real inter-frame gutters."""
    sub = IM[y0:y1, x0:x1]
    mask = sub[..., 3] > ALPHA
    cols = mask.any(0)
    boxes = []
    i = 0
    W = x1 - x0
    while i < W:
        if not cols[i]:
            i += 1; continue
        j = i
        # extend run, tolerating gutters smaller than `gap`
        while j < W:
            if cols[j]:
                j += 1
            else:
                k = j
                while k < W and not cols[k]:
                    k += 1
                if (k - j) < gap and k < W:
                    j = k           # small gutter -> same frame
                else:
                    break
        bx0, bx1 = i, j - 1
        comp = mask[:, bx0:bx1 + 1]
        ys, xs = np.where(comp)
        if len(xs) >= min_sz and (bx1 - bx0 + 1) >= min_w:
            by0, by1 = int(ys.min()), int(ys.max())
            if (by1 - by0 + 1) >= min_h:
                boxes.append((bx0 + x0, by0 + y0, bx1 + x0, by1 + y0))
        i = j
    boxes.sort(key=lambda b: b[0])
    return boxes


def tight(rect):
    x0, y0, x1, y1 = rect
    arr = IM[y0:y1 + 1, x0:x1 + 1]
    ys, xs = np.where(arr[:, :, 3] > ALPHA)
    if len(xs) == 0:
        return None
    return (x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()), y0 + int(ys.max()))


def pack(frames, out, feet=True, pad=1):
    frames = [f for f in frames if f is not None]
    if not frames:
        print(f"!! {out}: NO FRAMES"); return 0, 0, 0
    uW = max(f[2] - f[0] + 1 for f in frames) + 2 * pad
    uH = max(f[3] - f[1] + 1 for f in frames) + 2 * pad
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    full = Image.fromarray(IM)
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = full.crop((cx0, cy0, cx1 + 1, cy1 + 1))
        if FLIP_H:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        px = i * uW + (uW - w) // 2
        py = (uH - h - pad) if feet else (uH - h) // 2
        strip.paste(cell, (px, py), cell)
    strip.save(f"{OUT}/{out}")
    print(f"OK {out}: {len(frames)}f  {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH


def by_band(out, y0, y1, idx=None, x0=0, x1=W_SHEET, feet=True, expect=None, **kw):
    boxes = detect(y0, y1, x0, x1, **kw)
    if expect is not None and len(boxes) != expect:
        print(f"   ~~ {out}: detected {len(boxes)} boxes (expected {expect}) -> {[ (b[0],b[2]) for b in boxes]}")
    if idx is not None:
        boxes = [boxes[i] for i in idx]
    return pack([tight(b) for b in boxes], out, feet=feet)


def by_rects(out, rects, feet=True):
    return pack([tight(r) for r in rects], out, feet=feet)


def portrait(out, rect, target_h=320):
    t = tight(rect)
    crop = Image.fromarray(IM).crop((t[0], t[1], t[2] + 1, t[3] + 1))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(f"{OUT}/{out}")
    print(f"OK {out}: {big.size} portrait (src {crop.size})")


def green_keyed_frames(out, rects, feet=False, pad=1):
    """For FX sitting inside an enclosed green box (not border-connected): key green DIRECTLY
    (dist-to-green <= TOL -> transparent). Safe for white/light FX far from green."""
    cells = []
    for (x0, y0, x1, y1) in rects:
        a = _rgb[y0:y1 + 1, x0:x1 + 1]
        dist = np.abs(a - BG).sum(2)
        alpha = np.where(dist <= TOL, 0, 255).astype("uint8")
        rgba = np.dstack([a.astype("uint8"), alpha])
        ys, xs = np.where(alpha > ALPHA)
        if len(xs) == 0:
            continue
        cx0, cx1, cy0, cy1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        cells.append(Image.fromarray(rgba[cy0:cy1 + 1, cx0:cx1 + 1], "RGBA"))
    if not cells:
        print(f"!! {out}: NO FX"); return
    uW = max(c.width for c in cells) + 2 * pad
    uH = max(c.height for c in cells) + 2 * pad
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        px = i * uW + (uW - c.width) // 2
        py = (uH - c.height - pad) if feet else (uH - c.height) // 2
        strip.paste(c, (px, py), c)
    strip.save(f"{OUT}/{out}")
    print(f"OK {out}: {len(cells)}f  {{ frames: {len(cells)}, width: {uW}, height: {uH}, anchorY: 0 }}")


def raw(out, rect):
    """Raw rectangular crop from the ORIGINAL rgb (preserves textured panel bg). No keying."""
    x0, y0, x1, y1 = rect
    Image.fromarray(_rgb.astype("uint8")).crop((x0, y0, x1, y1)).save(f"{OUT}/{out}")
    print(f"OK {out}: raw {x1-x0}x{y1-y0}")


def main():
    # ══ PHASE 1 — BODY / MOVEMENT / NORMALS / GUARD / DMG / WIN / LOSE / PORTRAIT / CUT-INS / PUFF ══
    # BODY / MOVEMENT
    by_band("shizuku_idle_uniform.png",  338, 392, x1=150, expect=3)                 # Stance 3f
    by_band("shizuku_walk_uniform.png",  416, 468, x1=505, expect=8)                 # Move 8f (run reuses this)
    by_band("shizuku_dash_uniform.png",  416, 468, x0=505, x1=615, expect=2)         # Dash 2f
    by_band("shizuku_jump_uniform.png",  498, 560, x1=320, expect=4)                 # Jump 4f
    by_band("shizuku_guard_uniform.png", 490, 556, x0=485, x1=610, expect=2)         # Guard 2f (w/ Blinky)
    # DAMAGE / KO
    by_band("shizuku_hurt_uniform.png",  588, 644, x1=250, expect=3)                 # Taking Damage 3f
    by_band("shizuku_knockdown_uniform.png", 678, 740, x1=285, feet=False)           # KO launch+lying frames 1-5
    by_band("shizuku_getup_uniform.png", 678, 740, x0=285, x1=360)                   # KO rise frames 6-7
    # NORMALS
    by_band("shizuku_light_uniform.png", 1012, 1068, x1=330, expect=5)               # B Attack 5f (light)
    by_band("shizuku_heavy_uniform.png", 1271, 1328, x1=585, expect=6)               # Y Attack 6f (heavy)
    by_band("shizuku_up_uniform.png",    1646, 1708, x1=360, expect=5)               # Y+Up 5f (launcher)
    by_band("shizuku_air_uniform.png",   1172, 1233, x1=435, expect=4)                 # B+Jump 4f (air)
    by_band("shizuku_down_air_uniform.png", 1762, 1824, x1=620, expect=6)               # Y+Jump 6f (down-air)
    # WIN / LOSE
    by_band("shizuku_win_uniform.png",   1896, 1960, x1=260, expect=4)               # Win 4f (lose starts ~x265)
    by_band("shizuku_lose_uniform.png",  1910, 1962, x0=255, x1=420, expect=2)       # Lose 2f
    # CONJURE PUFF (2 white FX in the Ultimate-Action box) — Blinky pop in/out marker
    green_keyed_frames("shizuku_conjure_puff_uniform.png",
                       [(52, 908, 112, 990), (118, 903, 178, 988)], feet=False)      # 2 white conjure puffs
    # PORTRAIT (mugshot — select-screen art)
    portrait("shizuku_portrait.png", (0, 20, 178, 312))
    # CUT-INS (raw anime screencap panels — ultimate use only; own textured bg)
    raw("shizuku_cutin_a.png",(316, 28, 377, 88))      # koma 1 (face)
    raw("shizuku_cutin_b.png",(378, 28, 463, 88))      # koma 2 (two figures)
    raw("shizuku_cutin_c.png",(316, 90, 377, 157))     # koma 3 (hair)
    raw("shizuku_cutin_d.png",(378, 90, 463, 157))     # koma 4 (blinky closeup)


def phase2():
    # ══ PHASE 2 — BLINKY SPECIALS (2-Koma / 4-Koma A / 4-Koma B) + FX puffs ══
    # EXCLUDE the Gon "ex." victim boxes (x270-565 y2245-2470 etc.) by capping x1 well left of them.
    by_band("shizuku_phantom_uniform.png", 2088, 2162, x1=420, expect=6)             # 2-Koma: Phantom Jab Rush (no Blinky)
    by_band("shizuku_pull_uniform.png",    2283, 2350, x1=240, expect=3)             # 4-Koma A: Blinky Pull (suction, w/ Blinky)
    by_band("shizuku_smash_uniform.png",   2522, 2604, x1=310, expect=4)             # 4-Koma B: Blinky Smash (blunt swing, w/ Blinky)
    # FX puffs (inside enclosed green boxes → direct green key)
    green_keyed_frames("shizuku_pull_fx_uniform.png",
                       [(88, 2372, 148, 2475), (150, 2372, 200, 2475)], feet=False)  # suction puffs / swirl
    green_keyed_frames("shizuku_smash_fx_uniform.png",
                       [(27, 2688, 108, 2778), (110, 2688, 190, 2778)], feet=False)  # 2 impact puffs


if __name__ == "__main__":
    main()
    phase2()
