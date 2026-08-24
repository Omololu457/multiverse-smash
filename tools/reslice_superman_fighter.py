#!/usr/bin/env python3
# Re-slice SUPERMAN (Fighter) from the labeled B/Y/X sheet
#   dcna8ch-42870664-caf4-4f98-a06d-72a3680e98dc.png  (1800x3160, opaque, solid GREY #727272 bg).
# ★Content = NOT-grey AND NOT label-red (237,28,36) — dropping the red row-LABEL text AND the red
#   connecting-lines/beams so they don't fuse frames. Per-ROLE row REGIONS are measured off the
#   grid render (see SUPERMAN_FIGHTER_ASSET_MAP.md). Within each region, non-grey connected
#   components = frames (movement rows have clean grey gaps → clean split). Facing RIGHT → FLIP_H=False.
#
# STAGE 1 = movement / state + portrait. Later stages append picks below.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "dcna8ch-42870664-caf4-4f98-a06d-72a3680e98dc.png"
RGB = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W, _ = RGB.shape
GREY = (np.abs(RGB - 114).max(2) < 28)
LABELRED = (np.abs(RGB[:, :, 0] - 237) < 26) & (np.abs(RGB[:, :, 1] - 28) < 24) & (np.abs(RGB[:, :, 2] - 36) < 24)
CONTENT = (~GREY) & (~LABELRED)
IM = Image.open(SRC).convert("RGBA")
FLIP_H = False

def frames_in(region, minsize=220):
    """Connected-component frames inside (y0,y1,x0,x1), sorted left→right. Returns list of tight bboxes."""
    y0, y1, x0, x1 = region
    sub = CONTENT[y0:y1 + 1, x0:x1 + 1]
    lbl, n = ndimage.label(sub)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(ys) < minsize: continue
        comps.append([xs.min(), ys.min(), xs.max(), ys.max()])
    if not comps: return []
    # merge components that overlap in X (a frame's body + detached cape/limb)
    comps.sort(key=lambda c: c[0])
    merged = [comps[0]]
    for c in comps[1:]:
        m = merged[-1]
        if c[0] <= m[2] + 6:   # x-overlap/adjacent → same frame
            m[0] = min(m[0], c[0]); m[1] = min(m[1], c[1]); m[2] = max(m[2], c[2]); m[3] = max(m[3], c[3])
        else:
            merged.append(c)
    # back to absolute coords
    return [(x0 + a, y0 + b, x0 + cc, y0 + dd) for (a, b, cc, dd) in merged]

def reslice_region(out, region, minsize=220, want=None):
    fr = frames_in(region, minsize)
    if want is not None and len(fr) != want:
        print(f"  ! {out}: found {len(fr)} frames (wanted {want}) — {fr}")
    cells = []
    for (x0, y0, x1, y1) in fr:
        cell = IM.crop((x0, y0, x1 + 1, y1 + 1))
        # zero out any residual grey/label pixels in the cell → clean alpha
        arr = np.asarray(cell).copy()
        crgb = arr[:, :, :3].astype(int)
        mask = (np.abs(crgb - 114).max(2) < 28) | ((np.abs(crgb[:, :, 0] - 237) < 26) & (np.abs(crgb[:, :, 1] - 28) < 24) & (np.abs(crgb[:, :, 2] - 36) < 24))
        arr[mask, 3] = 0
        cells.append(Image.fromarray(arr, "RGBA"))
    if not cells:
        print(f"  !! {out}: NO frames in {region}"); return 0
    uW = max(c.width for c in cells) + 2
    uH = max(c.height for c in cells) + 2
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        if FLIP_H: c = c.transpose(Image.FLIP_LEFT_RIGHT)
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - 1), c)
    strip.save(out)
    print(f"OK {out}: {len(cells)}f cell {uW}x{uH}")
    return len(cells)

def make_portrait(out, region, target_h=288):
    fr = frames_in(region)
    if not fr: print("  !! portrait: no frame"); return
    x0, y0, x1, y1 = fr[0]
    cell = IM.crop((x0, y0, x1 + 1, int(y0 + (y1 - y0) * 0.62)))
    arr = np.asarray(cell).copy(); crgb = arr[:, :, :3].astype(int)
    arr[(np.abs(crgb - 114).max(2) < 28), 3] = 0
    cell = Image.fromarray(arr, "RGBA")
    m = np.asarray(cell)[:, :, 3] > 16; ys, xs = np.where(m)
    cell = cell.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = target_h / cell.height
    cell.resize((max(1, round(cell.width * s)), target_h), Image.NEAREST).save(out)
    print(f"OK {out}: bust portrait")

if __name__ == "__main__":
    # ── STAGE 1 — MOVEMENT / STATE (row regions measured off the grid render). ──
    reslice_region("superman_fighter_idle_uniform.png",  (110, 196, 5, 200))   # STANCE — 3f cape-sway idle
    reslice_region("superman_fighter_walk_uniform.png",  (204, 294, 5, 355))   # RUN — upright sprint
    reslice_region("superman_fighter_fly_uniform.png",   (204, 294, 452, 750)) # FLY — horizontal flight (distinct from RUN)
    reslice_region("superman_fighter_jump_uniform.png",  (298, 398, 5, 405))   # JUMP — leap/rise
    reslice_region("superman_fighter_guard_uniform.png", (404, 486, 5, 200))   # GUARD
    reslice_region("superman_fighter_hurt_uniform.png",  (2655, 2748, 5, 128)) # HURT — recoil
    reslice_region("superman_fighter_knockdown_uniform.png", (2690, 2748, 128, 330))  # FALL → lying PRONE
    reslice_region("superman_fighter_getup_uniform.png", (2655, 2748, 330, 410))  # GET UP — rising
    make_portrait("superman_fighter_portrait.png", (110, 196, 5, 200))

    # ── STAGE 2 — NORMALS (from the B-family rows; ×0.60 GLOBAL_DAMAGE_SCALE). down_air REUSES air. ──
    reslice_region("superman_fighter_light_uniform.png", (620, 702, 150, 330))   # B — lean → straight punch (jab)
    reslice_region("superman_fighter_heavy_uniform.png", (620, 702, 455, 640))   # B — coil → big lunge punch
    reslice_region("superman_fighter_up_uniform.png",    (838, 908, 5, 235))     # UP+B — rising uppercut LAUNCHER
    reslice_region("superman_fighter_air_uniform.png",   (1072, 1132, 170, 355)) # AERIAL+B — horizontal flying strike (2 clean frames)
    reslice_region("superman_fighter_crouchlight_uniform.png", (952, 1018, 5, 195))  # DOWN+B — low punch (auto-swap _setCrouchVariant)

    # ── STAGE 3 — command chain (Fwd+Heavy 3-stage rekka: B punch-flurry opener → rapid blue-fist multi-hit → FORWARD+B flying-dash launcher). ──
    reslice_region("superman_fighter_rush1_uniform.png", (620, 702, 650, 880))   # B-flurry opener
    reslice_region("superman_fighter_rush2_uniform.png", (620, 702, 865, 1130))  # B-flurry rapid blue-fist multi-hit
    reslice_region("superman_fighter_rush3_uniform.png", (740, 802, 5, 360))     # FORWARD+B flying-dash LAUNCHER finisher

    # ── STAGE 4 — SPECIALS (fixed-slot). ★ALL REAL FX baked into the cast sprites → long-DISJOINT melee (classic
    #    heat-vision approach; no procedural). N=Heat Vision / F=X blast / U=Frost Breath (tall) / D=Ice Beam / air=Aerial Ice / B=Retreat(reuse fly). ──
    reslice_region("superman_fighter_heatvision_uniform.png", (1358, 1424, 5, 360))  # FORWARD+Y — white heat-vision beam (baked)
    reslice_region("superman_fighter_xblast_uniform.png",     (1988, 2064, 5, 360))  # X — red energy blast (baked)
    reslice_region("superman_fighter_frost_uniform.png",      (1466, 1594, 5, 620))  # UP+Y — frost tornado (baked, TALL)
    reslice_region("superman_fighter_ice_uniform.png",        (1678, 1764, 5, 700))  # DOWN+Y — ice crystal beam (baked, LONG)
    reslice_region("superman_fighter_aerice_uniform.png",     (1836, 1904, 5, 620))  # AERIAL+Y — aerial ice spiral (baked)

    # ── STAGE 5 — ULTIMATE "Kryptonian Detonation": X+Up screen-filling solar EXPLOSION (5 blast frames, blue→gold). ──
    reslice_region("superman_fighter_ult_uniform.png", (2128, 2380, 130, 1460), minsize=400)  # X+Up explosion cast (drops the tiny fly-up lead frame)

    # ── STAGE 6 — win + lose (REAL dedicated rows). win = fist-raise → bald-eagle perch (patriotic victory). ──
    reslice_region("superman_fighter_win_uniform.png",  (2795, 2895, 5, 430))  # WIN — fist-raise → eagle perch
    reslice_region("superman_fighter_lose_uniform.png", (2900, 2975, 5, 220))  # LOSE — defeated slump
