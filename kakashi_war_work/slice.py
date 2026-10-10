#!/usr/bin/env python3
# Slice KAKASHI (KAMUI) — rosterKey `kakashi_war` — from the source sheet
#   K = "kakashi_nzc_sprites_original_colors__by_felipedanielskibr_d837fqp.png" (750x4615 RGB)
#   bg = opaque navy (0,64,128)+noise. BORDER-FLOODFILL key (protects interior navy pixels of the pants).
# FACING: sheet draws Kakashi FACING RIGHT (confirmed stance/run). Engine draws P1 un-flipped expecting
#   RIGHT-facing art → FLIP_H=False.
# Native-px band map is from the build brief; frames detected per-band as connected components, x-sorted,
# content-tightened, feet-aligned (feet at cell bottom, 1px pad) into uniform strips. Text labels sit ABOVE
# the chosen y-bands and are excluded; small FX/log/dog sprites handled via explicit rects.
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "kakashi_nzc_sprites_original_colors__by_felipedanielskibr_d837fqp.png"
BG = np.array([0, 64, 128])
TOL = 40
ALPHA = 16
FLIP_H = False
OUT = "."   # emit *_uniform.png into repo root (where the engine loads them)


def keyed():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)
    dist = np.abs(a - BG).sum(2)
    bgish = dist <= TOL
    lbl, n = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))
    alpha = np.where(remove, 0, 255).astype("uint8")
    return np.dstack([a.astype("uint8"), alpha])


IM = keyed()


def detect(y0, y1, x0=0, x1=750, min_sz=120, min_w=8, min_h=10):
    """Connected components in a band, x-sorted."""
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
    arr = np.asarray(Image.fromarray(IM[y0:y1 + 1, x0:x1 + 1]))
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


def by_band(out, y0, y1, idx=None, x0=0, x1=750, **kw):
    boxes = detect(y0, y1, x0, x1, **kw)
    if idx is not None:
        boxes = [boxes[i] for i in idx]
    return pack([tight(b) for b in boxes], out)


def by_rects(out, rects, feet=True):
    return pack([tight(r) for r in rects], out, feet=feet)


def portrait(out, rect, target_h=288):
    t = tight(rect)
    crop = Image.fromarray(IM).crop((t[0], t[1], t[2] + 1, t[3] + 1))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(f"{OUT}/{out}")
    print(f"OK {out}: {big.size} portrait")


def main():
    # ── BODY / MOVEMENT ──
    by_band("kakashi_war_idle_uniform.png", 1000, 1080, idx=[0, 1, 2, 3], x1=300)       # Stance 4f
    by_band("kakashi_war_run_uniform.png",  1137, 1214, idx=[0, 1, 2, 3, 4, 5])          # Run 6f (walk reuses this)
    by_rects("kakashi_war_dash_uniform.png",                                             # Dash 3f (lunge→blur→land)
             [(365, 1006, 428, 1072), (448, 1006, 496, 1072), (499, 1006, 570, 1072)])
    by_rects("kakashi_war_jump_uniform.png",                                             # Jump 3f (crouch→rise→apex)
             [(28, 1267, 90, 1357), (90, 1267, 145, 1357), (145, 1267, 210, 1357)])
    by_rects("kakashi_war_guard_uniform.png", [(283, 1267, 338, 1357)])                   # Guard 1f
    by_rects("kakashi_war_kawarimi_log_uniform.png", [(444, 1285, 483, 1330)])            # Kawarimi substitution log
    # ── DAMAGE → hurt / knockdown / getup ──
    by_rects("kakashi_war_hurt_uniform.png",                                              # flinch 2f (standing)
             [(28, 1415, 80, 1511), (80, 1415, 132, 1511)])
    by_band("kakashi_war_knockdown_uniform.png", 1541, 1606, idx=[0, 1, 2, 3])            # launched→lying→rise 4f
    by_rects("kakashi_war_getup_uniform.png", [(230, 1541, 301, 1606)])                   # getup rise (last dmg2)
    # ── NORMALS: Light = Attack Combo row1 / Air = Attack Combo (Air) row1 ──
    by_band("kakashi_war_light_uniform.png", 1661, 1751, x1=410)                          # Attack Combo (ground) opener
    by_band("kakashi_war_air_uniform.png",   1903, 1995, x1=350)                          # Attack Combo (Air)
    # ── HEAVIES: Strong (neutral / Forward / Down) + Strong (Air) ──
    by_band("kakashi_war_heavy_uniform.png",     2158, 2251, x0=30, x1=360)               # Strong (neutral) 4f
    by_band("kakashi_war_heavyair_uniform.png",  2158, 2251, x0=410, x1=690)              # Strong (Air) 4f
    by_band("kakashi_war_heavyfwd_uniform.png",  2304, 2386)                              # Strong (Forward) 8f
    by_band("kakashi_war_heavydown_uniform.png", 2453, 2542, x1=270)                      # Strong (Down) 4f
    by_rects("kakashi_war_dog_uniform.png",                                               # single ground-dog (Strong-Down FX) 3f
             [(283, 2510, 314, 2538), (339, 2485, 371, 2510), (399, 2510, 427, 2538)])
    # ── INTRO / WIN / TAUNT ──
    by_band("kakashi_war_intro_uniform.png", 850, 946)                                    # Intro 3f
    by_band("kakashi_war_win_uniform.png",   4470, 4600, x0=390, x1=575, min_h=40)        # Win (Icha Icha) 4f (x390-567; min_h drops the "repeat" label)
    by_band("kakashi_war_taunt_uniform.png", 3808, 3905, x0=145, x1=230)                  # Icha Icha reading 2f (Sennen Goroshi band)
    # ── RAIKIRI (ground) charge + strike. x<400 drops trailing speed-streak fragments; y>2882 drops the label text. ──
    by_band("kakashi_war_raikiri_charge_uniform.png", 2882, 2953, x1=400)                 # Raikiri charge 5f
    by_band("kakashi_war_raikiri_strike_uniform.png", 3002, 3075, x1=400)                 # Raikiri strike 2f
    # ── RAIKIRI (air): y>3155 drops the "SPECIAL MOVE" label row; x<400 drops the speed-streak fragments. ──
    by_band("kakashi_war_raikiri_air_charge_uniform.png", 3155, 3225, x1=400)             # Air Raikiri charge 5f
    by_band("kakashi_war_raikiri_air_strike_uniform.png", 3265, 3365, x1=400)             # Air Raikiri strike 3f
    # ── PORTRAIT / SELECT ART / CUT-IN ──
    portrait("kakashi_war_portrait.png", (52, 89, 170, 243))                              # face bust (story portrait panel)
    # Select-screen illustration + Ultimate cut-in (the cut-in pose, x38-218 y297-424), full-colour, un-scaled.
    _illus = tight((38, 297, 218, 424)); Image.fromarray(IM).crop((_illus[0], _illus[1], _illus[2] + 1, _illus[3] + 1)).save(f"{OUT}/kakashi_war_illus.png")
    print(f"OK kakashi_war_illus.png: cut-in pose")
    # Sharingan EYE BANNER (x235-484 y360-423) — Kamui Raikiri / Obito's Gift cut-in overlay (used Phase 2+).
    _eb = tight((235, 360, 484, 423)); Image.fromarray(IM).crop((_eb[0], _eb[1], _eb[2] + 1, _eb[3] + 1)).save(f"{OUT}/kakashi_war_eye_banner.png")
    print(f"OK kakashi_war_eye_banner.png: eye banner")

    # ══ PHASE 2 ART ══
    # Mangekyō / Kamui cast (hand seals → reach → thrust), used as the Kamui + Kamui-Raikiri cast pose.
    by_band("kakashi_war_mangekyou_cast_uniform.png", 3420, 3512)                          # 6f cast
    # KAMUI SWIRL FX (grow → twist → collapse). Centre-packed (feet=False) so the vortex stays centred.
    by_rects("kakashi_war_kamui_swirl_uniform.png", [
        (37, 3591, 60, 3614), (72, 3579, 119, 3626), (131, 3562, 202, 3633),
        (214, 3547, 311, 3644), (331, 3545, 427, 3643), (441, 3554, 532, 3642),             # grow 6f
        (36, 3680, 100, 3744), (114, 3690, 159, 3738), (173, 3699, 192, 3722),               # collapse 3f
    ], feet=False)
    # DOTON: TSUIGA — cast (crouch hand-seal reach) + the Ninken-pack eruption/rush FX.
    by_band("kakashi_war_tsuiga_cast_uniform.png", 2610, 2698, x1=270)                      # 4f cast
    by_rects("kakashi_war_tsuiga_pack_uniform.png", [                                       # dog-pack burst/rush 4f
        (23, 2768, 102, 2800), (117, 2766, 196, 2800), (221, 2756, 298, 2800), (307, 2757, 385, 2800)])
    # SENNEN GOROSHI — the crouch-lunge "thousand years of death" poke (5f).
    by_band("kakashi_war_sennen_uniform.png", 3930, 4000)                                   # 5f poke

    # ══ PHASE 3 ART — FROG HENGE ══
    # Frog Mode: stance + 3-frame hop (sit → crouch → leap → land). One looping strip (idle+hop).
    by_rects("kakashi_war_frog_uniform.png", [
        (85, 4089, 118, 4136), (261, 4100, 298, 4136), (309, 4073, 351, 4136), (360, 4095, 401, 4136)])
    # Frog Mode (DAMAGE) — 7f squashed/knocked sequence (played on the exit-by-hit). y>4198 drops the label text.
    by_band("kakashi_war_frog_damage_uniform.png", 4196, 4255)                              # 7f
    # Henge SMOKE puff (grow → dissipate), centre-packed. 5 columns across the smoke band.
    by_rects("kakashi_war_smoke_uniform.png", [
        (40, 4312, 95, 4416), (104, 4312, 199, 4416), (206, 4312, 322, 4416),
        (340, 4312, 430, 4416), (460, 4312, 545, 4416)], feet=False)


if __name__ == "__main__":
    main()
