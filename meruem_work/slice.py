#!/usr/bin/env python3
# Slice MERUEM — rosterKey `meruem` — from the source sheet
#   S = "meruem_jus_sprite_complete_by_santiag02_de045ih.png" (1176x2240 RGBA)
#   bg = opaque navy (0,64,128)+noise. BORDER-FLOODFILL key (protects interior navy pixels).
# FACING: sheet draws Meruem FACING RIGHT (tail trails left, head/attacks go right). Engine draws P1
#   un-flipped expecting RIGHT-facing art -> FLIP_H=False.
# Native-px band map from the build brief; frames detected per-band as connected components, x-sorted,
# content-tightened, feet-aligned into uniform strips. Text labels sit ABOVE bands and are excluded via
# tight x/y windows. The "S" logo, Gon example, NETERO/6-Koma/Ultimate example boxes, and the "¿Lose?"
# logo gag are excluded by windowing. Menace panels + anime cut-in are RAW rects (own textured bg).
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "../meruem_jus_sprite_complete_by_santiag02_de045ih.png"
BG = np.array([0, 64, 128])
TOL = 40
ALPHA = 16
FLIP_H = False
OUT = ".."   # emit *_uniform.png into repo root (where the engine loads them)

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


def detect(y0, y1, x0=0, x1=1176, min_sz=120, min_w=8, min_h=10):
    sub = IM[y0:y1, x0:x1]
    mask = sub[..., 3] > ALPHA
    lbl, n = ndimage.label(mask)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < min_sz:
            continue
        bx0, bx1, by0, by1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        if (bx1 - bx0 + 1) < min_w or (by1 - by0 + 1) < min_h:
            continue
        boxes.append((bx0 + x0, by0 + y0, bx1 + x0, by1 + y0))
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


def by_band(out, y0, y1, idx=None, x0=0, x1=1176, feet=True, **kw):
    boxes = detect(y0, y1, x0, x1, **kw)
    if idx is not None:
        boxes = [boxes[i] for i in idx]
    return pack([tight(b) for b in boxes], out, feet=feet)


def by_rects(out, rects, feet=True):
    return pack([tight(r) for r in rects], out, feet=feet)


def portrait(out, rect, target_h=288):
    t = tight(rect)
    crop = Image.fromarray(IM).crop((t[0], t[1], t[2] + 1, t[3] + 1))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(f"{OUT}/{out}")
    print(f"OK {out}: {big.size} portrait")


def raw(out, rect, key_navy=False):
    """Raw rectangular crop from the ORIGINAL rgb (preserves textured panel bg).
    key_navy=True keys ONLY pure-navy pixels (the L-shaped panel notch) to transparent;
    the purple/green panel art is far from navy so it is untouched."""
    x0, y0, x1, y1 = rect
    crop = _rgb[y0:y1, x0:x1].astype(np.int32)
    if key_navy:
        navy = np.abs(crop - BG).sum(2) <= 55
        alpha = np.where(navy, 0, 255).astype("uint8")
        out_im = Image.fromarray(np.dstack([crop.astype("uint8"), alpha]))
    else:
        out_im = Image.fromarray(crop.astype("uint8"))
    out_im.save(f"{OUT}/{out}")
    print(f"OK {out}: raw {x1-x0}x{y1-y0}{' (navy-keyed)' if key_navy else ''}")


def main():
    # ══ PHASE 1 — BODY / MOVEMENT / NORMALS / DMG / WIN / LOSE / PORTRAIT / CUT-INS ══
    # BODY / MOVEMENT
    by_rects("meruem_idle_uniform.png", [(32, 45, 69, 92)])                    # Stand 1f (static idle)
    by_band("meruem_walk_uniform.png", 120, 175, x1=340)                       # Walk 4f
    by_rects("meruem_dash_uniform.png", [(360, 123, 404, 170)])               # Dash 1f (reddish blur)
    by_rects("meruem_glide_uniform.png",                                       # Alt. prone glide 2f (backdash)
             [(430, 137, 494, 155), (500, 137, 564, 155)])
    by_band("meruem_jump_uniform.png", 205, 310, x1=340)                       # Jump cycle
    by_band("meruem_block_uniform.png", 42, 95, x0=120, x1=340)               # Defense 3f
    # NORMALS: Light = B (neutral) 5f ; Heavy = Y (neutral, tail) 4f
    by_band("meruem_light_uniform.png", 350, 400, x1=360)                     # B 5f
    by_band("meruem_heavy_uniform.png", 830, 890, x1=340)                     # Y (tail) 4f
    by_band("meruem_up_uniform.png", 1020, 1080, x1=270)                      # Y+Up 4f (tail-upper launcher)
    by_band("meruem_air_uniform.png", 730, 795, x1=290)                       # Jump+B 4f (air normal)
    by_band("meruem_downair_uniform.png", 1225, 1295, x1=400)                 # Jump+Y 6f (spinning-tail down-air)
    # DAMAGE -> hurt / knockdown / getup (12-frame Damage band, cap x<700 to drop example blob)
    by_band("meruem_hurt_uniform.png", 1970, 2035, x1=230)                    # standing flinch 3f
    by_band("meruem_knockdown_uniform.png", 1970, 2035, x0=225, x1=500)  # fall->lie (feet/cell-bottom to floor)
    by_band("meruem_getup_uniform.png", 1970, 2035, x0=490, x1=690)          # rise 3f
    # INTRO (Ultimate Action body flare frames, before the aura-spike FX)
    by_rects("meruem_intro_uniform.png", [(41, 1399, 85, 1445), (100, 1403, 141, 1445)])
    # WIN — tableau: Meruem kneeling + Gungi board + KOMUGI (wide rects preserve layout; Komugi is scenery)
    by_rects("meruem_win_uniform.png",
             [(104, 2090, 186, 2145), (190, 2090, 285, 2145)])
    # LOSE — 1f (exclude the "S" logo gag at x404+)
    by_rects("meruem_lose_uniform.png", [(362, 2099, 398, 2142)])
    # PORTRAIT (face bust)
    portrait("meruem_portrait.png", (64, 1640, 109, 1683))
    # CUT-INS (raw textured panels + anime screencap)
    raw("meruem_menace_purple.png", (858, 2075, 999, 2214), key_navy=True)    # ultimate menace panel (purple)
    raw("meruem_menace_green.png", (1004, 2075, 1145, 2214), key_navy=True)   # ultimate menace panel (green)
    raw("meruem_cutin_anime.png", (18, 1710, 159, 1801))                      # Royal Feast anime screencap


def phase2():
    # ══ PHASE 2 — SPECIALS ART ══
    # AURA BULLET — cast pose (row1 body 3f: windup → mid → thrust) + projectile FX + impact burst.
    by_band("meruem_aura_cast_uniform.png", 355, 400, x0=440, x1=645, idx=[0, 1, 2])            # throw cast 3f
    by_rects("meruem_aura_proj_uniform.png",                                                     # traveling aura round (center-packed)
             [(685, 380, 707, 399), (717, 382, 735, 399), (751, 364, 774, 399), (787, 374, 816, 399)], feet=False)
    # KING'S LUNGE — 6-Koma X (low ant-dash → lunge → flip → strike). x<700 drops the spurious example-box edge.
    by_band("meruem_kings_lunge_uniform.png", 1688, 1735, x0=180, x1=700)                        # 7f
    # TAIL AURA RUSH — others row3 (low aura-wreathed tail rush) 5f.
    by_band("meruem_tail_rush_uniform.png", 535, 590, x0=440, x1=860)                            # 5f
    # AURA FLASH — others row4 (purple aura-flash body) 7f. Used in the ultimate barrage.
    by_band("meruem_aura_flash_uniform.png", 628, 690, x0=440, x1=900)                           # 7f
    # PHOTON FIELD — Alt aura-charge loop (bracket under frames 6-8 = loop). 7f.
    by_band("meruem_photon_charge_uniform.png", 1505, 1565, x0=160, x1=610)                      # 7f
    # ULTIMATE AURA-SPIKES — the 4 growing purple aura-spike FX (Ult flare / Ant King's Onslaught). center-packed.
    by_band("meruem_ult_spikes_uniform.png", 1388, 1452, x0=168, x1=620, feet=False, min_sz=200) # growing aura spikes
    # TAIL LANCE — Y+Forward (the Gungi Mind Stance counter answer) 4f.
    by_band("meruem_tail_lance_uniform.png", 925, 980, x1=270)                                   # 4f
    # TAIL SWEEP — Y+Down (the Ant King's Onslaught tail finisher) 6f.
    by_band("meruem_tail_sweep_uniform.png", 1120, 1180, x1=345)                                 # 6f


if __name__ == "__main__":
    import sys
    if "--phase2" in sys.argv:
        phase2()
    else:
        main()
        phase2()
