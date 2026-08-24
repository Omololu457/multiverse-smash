#!/usr/bin/env python3
# Re-slice VILGAX (rosterKey `vilgax`, Ben 10, fan-made JUS sheet) from the single labeled
# master sheet into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#   vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3-fullview.jpeg (1024x2474 RGB, JPEG)
#   Credit: regulardor8go. NOT an official rip. Inventory: VILGAX_ASSET_MAP.md.
#
# STRUCTURE: FLAT bright-orange JUS field bg (255,127,38). Rows are organized by LEFT-edge red
# text labels (241,26,44); frames run to the RIGHT of each label. Two 3D renders (top-right
# standing, mid-right sword-raised) + two show screenshots (in the Koma Atakes band) are
# NON-GAMEPLAY reference art — kept out of the atlas via per-row x-limits.
#
# ★FACING: whole sheet faces RIGHT (verified). Engine draws P1 un-flipped expecting RIGHT-facing
#   art → FLIP_H=False; the engine mirrors for the left-facing side.
# ★KEY BY COLOR (JPEG, no alpha): orange -> transparent, with |Δrgb|<50 (empty rows = 0 px).
#   The red LABEL bars are keyed out ONLY in the label column (x<150) so the INTRO red-silhouette
#   FLASH frames (x>150, also red) survive.
#
# Detection is PER ROW (row y-band from VILGAX_ASSET_MAP §2), then connected-component frames
# sorted left->right = that row's frame indices. Keep row bands in sync with vilgax_stage0_boxes.py.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3-fullview.jpeg"
BG = np.array([255, 127, 38])
RED = np.array([241, 26, 44])
ALPHA = 16
FLIP_H = False

# Row y-bands (top-of-label -> next-label). Sprites sit a few px below the label bar.
ROWS = {
    "INTRO":     (41, 79),
    "STANCE":    (92, 152),    # start below the STANCE label bar
    "RUN":       (152, 238),
    "JUMP":      (238, 331),
    "GUARD":     (331, 412),
    "ULT_ACTION":(412, 499),
    "B":         (499, 577),
    "FORWARD_B": (577, 661),
    "UP_B":      (661, 823),
    "AERIAL_B":  (888, 968),
    "FORWARD_Y": (1101, 1190),
    "DOWN_Y":    (1283, 1368),
    "AERIAL_Y":  (1368, 1454),
    "X":         (1454, 1534),
    "KOMA":      (1678, 2058),
    "HURT":      (2058, 2146),
    "WIN":       (2146, 2237),
}
# Per-row x window to exclude the top-right RENDER (x>600 in the top rows) + Koma screenshots.
ROW_XLIM = {
    "INTRO": (0, 600), "STANCE": (0, 600), "RUN": (0, 600), "JUMP": (0, 600),
    "GUARD": (0, 600), "ULT_ACTION": (0, 600),
    # The mid-right sword-raised RENDER (x~630-900, y~480-720) bleeds into B / FORWARD_B / UP_B.
    "B": (0, 600), "FORWARD_B": (0, 600),
    # UP_B teleport: narrow window keeps stance + first vanish-silhouette, drops the render + the
    # JPEG-ground-line-bridged 3rd shadow (which merges with the 2nd).
    "UP_B": (0, 75),
    "KOMA": (150, 950),   # right of the two embedded screenshots
}

def load():
    # tol 64 clears most JPEG orange-halo ringing; gold gauntlet (Δ80) / red flash (Δ121) / green
    # (Δ>90) all stay well clear. Isolated survivors are removed per-cell by despeckle() in reslice.
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    orange = np.abs(a - BG).sum(2) < 64
    alpha = np.where(orange, 0, 255).astype("uint8")
    rgba = np.dstack([a.astype("uint8"), alpha])
    return Image.fromarray(rgba, "RGBA"), a

def despeckle(cell, min_px=14):
    """Drop tiny opaque JPEG-halo floaters: keep only opaque components >= min_px."""
    arr = np.asarray(cell).copy()
    op = arr[:, :, 3] > ALPHA
    lbl, n = ndimage.label(op)
    if n <= 1:
        return cell
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    drop = {i + 1 for i in range(n) if sizes[i] < min_px}
    if drop:
        mask = np.isin(lbl, list(drop))
        arr[mask, 3] = 0
    return Image.fromarray(arr, "RGBA")

def row_frames(a, row, min_sz=120, min_w=6, min_h=8, drop_white=False):
    y0, y1 = ROWS[row]
    x0, x1 = ROW_XLIM.get(row, (0, 1024))
    reg = a[y0:y1, x0:x1]
    orange = np.abs(reg - BG).sum(2) < 50
    red = np.abs(reg - RED).sum(2) < 75
    xx = np.arange(x0, x1)[None, :]
    labelcol = red & (xx < 150)           # kill label bar, keep red flash frames (x>150)
    mask = (~orange) & (~labelcol)
    if drop_white:                        # thin bright ground-line bridges the teleport silhouettes
        white = (reg[:, :, 0] > 185) & (reg[:, :, 1] > 185) & (reg[:, :, 2] > 185)
        mask = mask & (~white)
    lbl, n = ndimage.label(mask)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    fb = []
    for i in range(1, n + 1):
        if int(sizes[i - 1]) < min_sz:
            continue
        ys, xs = np.where(lbl == i)
        bx0, bx1, by0, by1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        if bx1 - bx0 < min_w or by1 - by0 < min_h:
            continue
        fb.append((bx0 + x0, by0 + y0, bx1 + x0, by1 + y0))
    fb.sort(key=lambda b: b[0])
    return fb  # list of (cx0,cy0,cx1,cy1) content bboxes, left->right

def keep_red_only(cell):
    """Zero-alpha everything that isn't RED-dominant — strips the baked-in caster figure from the
    Koma beam so only the red energy beam remains (Vilgax's green/blue/gold body is non-red-dominant)."""
    arr = np.asarray(cell).astype(int).copy()
    R, G, B, A = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    red = (R > 175) & (R > G * 1.5 + 12) & (R > B * 1.35 + 12) & (A > ALPHA)   # bright beam red only; drops the maroon vest
    out = arr.copy(); out[~red, 3] = 0
    return Image.fromarray(out.astype("uint8"), "RGBA")

def reslice(im, a, row, picks, out, center_align=False, keep_red=False, **rf):
    fb = row_frames(a, row, **rf)
    frames = [fb[p] for p in picks]
    uW = max(f[2] - f[0] + 1 for f in frames) + 2
    uH = max(f[3] - f[1] + 1 for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = despeckle(im.crop((cx0, cy0, cx1 + 1, cy1 + 1)))
        if keep_red:
            cell = keep_red_only(cell)
            bbox = cell.getbbox()          # tighten to the red beam only (drop the empty caster region)
            if bbox:
                cell = cell.crop(bbox)
        if FLIP_H:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        oy = (uH - h) // 2 if center_align else (uH - h - 1)          # projectiles center-align; bodies feet-align
        strip.paste(cell, (i * uW + (uW - w) // 2, oy), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)}f  -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_portrait(im, a, out, target_h=288):
    """Head/torso bust from the STANCE idle (frame 0). Crop top ~55% → squid-face + shoulders bust."""
    fb = row_frames(a, "STANCE")
    cx0, cy0, cx1, cy1 = fb[0]
    h = cy1 - cy0 + 1
    crop = im.crop((cx0, cy0, cx1 + 1, cy0 + int(h * 0.55)))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (idle bust)")

# ── STAGE 1 action -> row frame-index picks (FACING-RIGHT; left->right = animation order). ──
INTRO_P     = [0, 1, 2, 3, 4, 5, 6]   # 4 walk-in + 2 red-silhouette FLASH + 1 ready pose
IDLE_P      = [0, 1, 2, 3]            # STANCE breathing loop
GUARD_P     = [2, 3, 4]              # brace -> barrier grows -> FULL yellow energy barrier (lockLastFrame holds it)
RUN_P       = [0, 1, 2, 3, 4, 5, 6, 7, 8]  # 8 stride + lunging dash pose
JUMP_P      = [0, 1, 2, 3]            # leap arc; fall = last cell
HURT_P      = [0]                     # flinch (recoil)
KNOCK_P     = [2, 3, 4]              # fall -> flat(downed = LOSE stopgap, strip idx 1) -> rise

# ── STAGE 2 normals (FACING-RIGHT; ×0.60 via GLOBAL_DAMAGE_SCALE). The B row is a claw->tentacle-whip
#    sequence: split into two REAL distinct poses. No command chain (S3 = none). up/crouchLight/down_air
#    REUSE existing poses (no dedicated art). air = the REAL Aerial B dive.
N_LIGHT_P   = [0, 1, 2]              # B claw swipe (quick reach) — light
N_HEAVY_P   = [4, 5, 6]              # B green TENTACLE-WHIP arc (long reach, big sweep) — heavy (up reuses it)
N_AIR_P     = [0, 1, 2, 3]           # AERIAL B diving attack w/ tentacle-swipe trail — air (down_air reuses)

# ── STAGE 4 specials (owner-locked, VILGAX_ASSET_MAP §7). Cast POSES = real frames; red blasts are
#    PROCEDURAL (color, tier-scaled) like Genos/IronMan3; the thrown sword carries a REAL spinning-blade
#    sprite. Slots: N=Plasma Blast (tap base / hold heavy) / F=Energy-Sword Slash (melee) / B=Thrown
#    Spinning Sword (projectile) / U=Teleport (vanish) / air=Aerial Tumble (melee). D = unused.
BLASTCAST_P  = [0, 1, 2, 3]          # DOWN_Y braced charge (base plasma cast)
BLASTXCAST_P = [0, 1, 2, 3]          # X bigger charge/burst (heavy plasma cast)
SLASH_P      = [1, 2, 3, 4]          # FORWARD_B draw -> slash arc -> lunge (energy-sword melee cast)
THROW_P      = [2, 3, 4]             # FORWARD_Y draw -> windup -> throw (cast)
SWORDPROJ_P  = [6, 7, 8, 9]          # FORWARD_Y spinning-blade PROJECTILE (4-frame rotation, center-aligned)
VANISH_P     = [0, 1]                # UP_B teleport: full stance -> dissolving dark silhouette (drop_white)
TUMBLE_P     = [0, 1, 2, 3, 4, 5, 6] # AERIAL_Y spinning aerial tumble (melee cast)

# ── STAGE 5 ULT "Koma Atakes" (owner-locked). Trigger = ULT_ACTION green-charge pose (live fighter
#    plays it); the multi-beam FX = the KOMA fired-beam sprites manifested at the frozen foe. The 2
#    embedded screenshots (KOMA boxes 0,1) + small figures are EXCLUDED (min_sz + picks skip them).
ULTACTION_P  = [0, 1, 2]             # ULT_ACTION green-energy charge / power-up trigger pose
KOMABEAM_P   = [7, 8, 9, 10]         # KOMA: 2 spiky red charge-bursts -> 2 fired beams (growth strip)

# ── STAGE 6 win (real art). Lose = knockdown stopgap (owner #4). Portrait = idle bust (already made).
WIN_P        = [0, 1, 2, 3, 4]       # WIN: fist-raise (0-2, tentacle flourish) -> shrinking vanish-fade (3,4)

if __name__ == "__main__":
    im, a = load()
    for r in ROWS:
        print(f"  {r:11s} {len(row_frames(a, r))} frames")
    print("---- STAGE 1 reslice ----")
    reslice(im, a, "INTRO",  INTRO_P, "./vilgax_intro_uniform.png")
    reslice(im, a, "STANCE", IDLE_P,  "./vilgax_idle_uniform.png")
    reslice(im, a, "RUN", [0, 1, 2, 3, 4, 5, 6, 7], "./vilgax_walk_uniform.png")  # walk = run stride (no walk on sheet) at slower speed; excludes the lunge pose (idx 8)
    reslice(im, a, "GUARD",  GUARD_P, "./vilgax_guard_uniform.png")
    reslice(im, a, "RUN",    RUN_P,   "./vilgax_run_uniform.png")
    reslice(im, a, "STANCE", IDLE_P,  "./vilgax_crouch_uniform.png") # crouch = idle stopgap (no crouch on sheet)
    reslice(im, a, "JUMP",   JUMP_P,  "./vilgax_jump_uniform.png")
    reslice(im, a, "HURT",   HURT_P,  "./vilgax_hurt_uniform.png")
    reslice(im, a, "HURT",   KNOCK_P, "./vilgax_knockdown_uniform.png")
    print("---- STAGE 2 reslice ----")
    reslice(im, a, "B",        N_LIGHT_P, "./vilgax_light_uniform.png")   # claw swipe
    reslice(im, a, "B",        N_HEAVY_P, "./vilgax_heavy_uniform.png")   # tentacle-whip arc (up reuses)
    reslice(im, a, "AERIAL_B", N_AIR_P,   "./vilgax_air_uniform.png")     # dive (down_air reuses)
    print("---- STAGE 4 reslice ----")
    reslice(im, a, "DOWN_Y",    BLASTCAST_P,  "./vilgax_blastcast_uniform.png")   # base plasma cast
    reslice(im, a, "X",         BLASTXCAST_P, "./vilgax_blastxcast_uniform.png")  # heavy plasma cast
    reslice(im, a, "FORWARD_B", SLASH_P,      "./vilgax_slash_uniform.png")       # energy-sword slash
    reslice(im, a, "FORWARD_Y", THROW_P,      "./vilgax_throw_uniform.png", min_sz=100)       # sword-throw cast
    reslice(im, a, "FORWARD_Y", SWORDPROJ_P,  "./vilgax_sword_uniform.png", center_align=True, min_sz=100)  # spinning-blade projectile
    reslice(im, a, "UP_B",      VANISH_P,     "./vilgax_vanish_uniform.png", min_sz=30, min_w=6, drop_white=True)  # teleport
    reslice(im, a, "AERIAL_Y",  TUMBLE_P,     "./vilgax_tumble_uniform.png")      # aerial tumble
    print("---- STAGE 5 reslice ----")
    reslice(im, a, "ULT_ACTION", ULTACTION_P, "./vilgax_ultaction_uniform.png")   # green-charge ULT trigger pose
    reslice(im, a, "KOMA",       KOMABEAM_P,  "./vilgax_komabeam_uniform.png", center_align=True, keep_red=True, min_sz=140)  # Koma beam growth (caster stripped)
    print("---- STAGE 6 reslice ----")
    reslice(im, a, "WIN",        WIN_P,       "./vilgax_win_uniform.png")       # fist-raise → vanish-fade (real)
    make_portrait(im, a, "./vilgax_portrait.png")
