#!/usr/bin/env python3
# Re-slice KAKASHI HATAKE (rosterKey `kakashi`, Naruto Shippuden: Ninja Council 4 DS/DSi rip,
# credit "Ripped by Neimad / DS Ripping Forum") from the single master sheet
#   "DS _ DSi - Naruto Shippuden_ Ninja Council 4 - Playable Characters - Kakashi.png" (1054x5236 RGB)
# into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#
# STRUCTURE: single GREEN field bg (0,128,0). Every sprite is moated by green -> one connected
# component of the non-green mask. Global frame index = top->bottom / left->right order printed by
# tools/kakashi_boxes.py (picks below reference THOSE indices; keep detect params in sync).
#
# ★HAZARD: Kakashi's Konoha flak-jacket is OLIVE (dark yellow-green). The bg is very pure
#   (0,128,0)±few, so a TIGHT key (sum|rgb-bg|<40) grabs the field only and leaves the olive vest
#   intact (verified 0 vest px keyed). Do NOT loosen the key.
# ★FACING: the sheet draws BOTH facings; the LEFT cluster of each row is the on-sheet "FACING RIGHT"
#   set and it VISUALLY faces right (confirmed: stance box 6, walk box 20). The engine draws P1
#   un-flipped expecting RIGHT-facing art, so we bake the FACING-RIGHT picks with FLIP_H=False.
#
# STAGE 1 = registration + movement/state + portrait. Later stages append picks below.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "DS _ DSi - Naruto Shippuden_ Ninja Council 4 - Playable Characters - Kakashi.png"
BG = np.array([0, 128, 0])
ALPHA = 16
FLIP_H = False   # FACING-RIGHT picks already face right; engine flips for left.

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    green = np.abs(a - BG).sum(2) < 40           # TIGHT field key (protects olive vest)
    alpha = np.where(green, 0, 255).astype('uint8')
    rgba = np.dstack([a.astype('uint8'), alpha])
    return Image.fromarray(rgba, "RGBA"), green

def detect_boxes(green, min_sz=350, min_w=14, min_h=22, row_bucket=48):
    lbl, n = ndimage.label(~green)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    bg_label = int(np.argmax(sizes)) + 1
    boxes = []
    for i in range(1, n + 1):
        if i == bg_label:
            continue
        if int(sizes[i - 1]) < min_sz:
            continue
        ys, xs = np.where(lbl == i)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1 - x0 + 1) < min_w or (y1 - y0 + 1) < min_h:
            continue
        boxes.append((y0, x0, y1, x1))
    boxes.sort(key=lambda b: (b[0] // row_bucket, b[1]))
    return boxes

def content_bbox(im, box):
    y0, x0, y1, x1 = box
    arr = np.asarray(im.crop((x0, y0, x1 + 1, y1 + 1)))
    ys, xs = np.where(arr[:, :, 3] > ALPHA)
    return (x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()), y0 + int(ys.max()))

def reslice(im, boxes, out, picks):
    frames = [content_bbox(im, boxes[p]) for p in picks]
    uW = max(f[2] - f[0] + 1 for f in frames) + 2
    uH = max(f[3] - f[1] + 1 for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = im.crop((cx0, cy0, cx1 + 1, cy1 + 1))
        if FLIP_H:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        strip.paste(cell, (i * uW + (uW - w) // 2, uH - h - 1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)}f  -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def reslice_rects(im, rects, out):
    """Reslice from EXPLICIT pixel rects (x0,y0,x1,y1) — for small sprites the box detector filters out
    by height (e.g. the ~20px-tall Pakkun pug). Content-tightened, bottom-aligned, uniform strip."""
    frames = []
    for (x0, y0, x1, y1) in rects:
        arr = np.asarray(im.crop((x0, y0, x1 + 1, y1 + 1)))
        ys, xs = np.where(arr[:, :, 3] > ALPHA)
        if len(xs) == 0:
            continue
        frames.append((x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()), y0 + int(ys.max())))
    uW = max(f[2] - f[0] + 1 for f in frames) + 2
    uH = max(f[3] - f[1] + 1 for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = im.crop((cx0, cy0, cx1 + 1, cy1 + 1))
        if FLIP_H:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        strip.paste(cell, (i * uW + (uW - w) // 2, uH - h - 1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)}f rects -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_portrait(im, boxes, out, pick=5, target_h=288):
    """Face close-up bust from the MUGSHOTS band (box 5). NEAREST-scaled to HUD height."""
    b = boxes[pick]
    crop = im.crop((b[1], b[0], b[3] + 1, b[2] + 1))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (face bust from box {pick})")

# ── STAGE 1 action -> global frame indices (FACING-RIGHT set; left→right = animation order). ──
IDLE        = [6, 7, 8, 9, 10, 11]        # STANCE — 6f idle loop
WALK        = [20, 18, 19, 21, 22, 23]    # WALK — genuine alternating-leg cycle (x-order)
RUN         = [30, 31, 32, 33, 34, 35]    # RUN — forward-lean sprint (distinct from walk)
CROUCH      = [42, 43]                     # CROUCH — static low pose (into→held)
CROUCH_WALK = [46, 47, 48, 49, 50, 51]    # CROUCH WALK — alternating low stride (reserved)
JUMP        = [58, 59, 60, 61, 66]        # JUMP — 5f arc
WALL_JUMP   = [68, 69, 70, 71]            # WALL JUMP — push-off (reserved)
TELEPORT    = [76]                         # TELEPORT — crouch-vanish pose (FX streak separate; reserved)
HURT        = [78, 79]                     # DAMAGE flinch (hitstun)
KNOCKDOWN   = [80, 81, 88, 82]             # DAMAGE fall → side → flat(=downed/LOSE frame) → rise; lockLastFrame holds recovery
FAST_GETUP  = [90, 91]                     # FAST GET UP — quick recovery (reserved; 2f detected, prompt said 4)

# ── STAGE 2 normals (FACING-RIGHT; standalone single-button attacks; ×0.60 via GLOBAL_DAMAGE_SCALE).
#    Sourced from the Y-COMBO string + the directional Y+attack rows. The FULL two-segment Y-combo
#    (94-119) is reserved for the Stage-3 cancelable rekka; these are the standalone slices. ──
N_LIGHT  = [94, 95]                         # Y-combo opener — quick kunai DRAW-SLASH (long horizontal reach)
N_HEAVY  = [103, 104, 105]                  # Y-combo seg1 finisher — orange-streaked sweeping KICK (committed, big arc)
N_UP     = [124, 125, 126, 120, 121]        # Y+UP ATTACK — rising overhead KICK launcher (★x-order, NOT numeric: tall frames 120/121 last)
N_AIR    = [142, 143, 144, 145, 146]        # Y+JUMP ATTACK — diving strike w/ orange trail (down_air REUSES this)
N_CROUCHL= [153, 154, 155]                  # Y+CROUCH ATTACK — low sliding kunai slash (active slice; skip idle 152 / recover 156)
N_RUNATK = [130, 131, 132, 133, 134, 135]   # Y+RUN ATTACK — sliding slash (RESERVED: no dash-attack slot; earmarked for Stage-3 poke)

# ── STAGE 3 command chain — "Y-Combo" Fwd+Heavy cancel-on-hit rekka. Per direct FRAME REVIEW (not the
#    2-row "segment" count), the Y-combo's natural cancelable beats are 3 distinct strikes: kunai SLASH →
#    PUNCH flurry → orange KICK launcher. Sourced from the two-segment Y-combo rows (94-106 / 107-119). ──
CMB1 = [95, 96, 97]            # combo1 — kunai draw-SLASH opener + first punches
CMB2 = [99, 100, 101, 102]     # combo2 — mid PUNCH flurry (slash → orange-fist thrust → punches)
CMB3 = [116, 117, 118]         # combo3 — orange-streaked KICK LAUNCHER finisher (from seg2: cock → kick)

# ── STAGE 4 special — "Weapon Throw" kunai (orange spinning-slash projectile), 3 DISTINCT stance contexts
#    (built separately per the prompt, not one anim reused). FACING-RIGHT cast poses. ──
WT_STAND  = [164, 162, 165]              # WEAPON THROW (standing) — windup → throw → release (x-order)
WT_CROUCH = [168, 169, 170, 171]         # WEAPON THROW (crouch) — crouched throw
WT_AIR    = [176, 177, 178, 179, 180]    # WEAPON THROW (air) — airborne throw

# ── STAGE 5 summons — two STRUCTURALLY DIFFERENT techniques (built differently per the prompt):
#    (A) Pakkun = lingering COMPANION assist; (B) Nin-Dogs = one-shot BURST. FACING-RIGHT sets. ──
PAKKUN_CAST = [186, 195, 196]            # Kakashi summon — hand-seals → crouch-reach → ground SLAM
NINDOGS_CAST = [234, 243, 246]           # Kakashi summon — hand-seals → crouch-reach → ground SLAM (Nin-Dogs)
NINDOGS_PACK = [254, 255, 256, 257]      # the 8-dog pack: emerge in smoke → erupt → dust-clear → rush forward
# Pakkun the pug is UNINDEXED (frames ~20px tall, below the box detector's min_h) → explicit pixel rects:
PAKKUN_READY_RECTS = [(186, 2541, 207, 2561), (219, 2541, 241, 2561)]                                  # sitting pug (spawn/ready pose)
PAKKUN_BITE_RECTS  = [(423, 2541, 452, 2561), (461, 2542, 492, 2561), (500, 2541, 527, 2561), (534, 2543, 559, 2561)]  # mouth-open lunge/bite

# ── STAGE 6 RAIKIRI (signature LIGHTNING technique; owner-designated ULTIMATE). FACING-RIGHT poses. ──
RAIKIRI_CHARGE  = [286, 288, 290]        # charging blue lightning — dim → bright → BRIGHTEST (290 = REPEAT-hold peak)
RAIKIRI_DASH    = [302, 306, 309, 312]   # forward dashing thrust — lean → lunge → deep lunge → lightning-arc impact
RAIKIRI_SUPPORT = [329, 332, 335]        # SUPPORT SPECIAL VERSION — long cross-screen dash (Sharingan-gated empowered variant)

# ── STAGE 7 MANGEKYOU SHARINGAN (activated timed MODE) — 14-frame "REPEAT" ready stance, headband lifted,
#    eye exposed. FACING-RIGHT set. Rendered as the idle while the mode is active (_skinAnim idle-swap). ──
# ★box 379 DROPPED — visual QA found it's an attack-thrust pose (the one anomalously-wide box), not a ready-stance
#   frame; excluded so the idle loop stays a clean held stance (13 frames — frame-review over blind frame-count).
MANGEKYOU_STANCE = [373, 374, 375, 376, 377, 378, 380, 381, 382, 383, 384, 385, 386]

# ── STAGE 9 — WIN (10-frame standing→ready-stance victory sequence) + LOSE (reuse DAMAGE's final downed
#    frame, owner Item-3 decision). FACING-RIGHT sets. ──
WIN  = [393, 394, 395, 396, 397, 398, 399, 400, 401, 402]   # victory: rise into confident ready stance
LOSE = [88]                                                  # flat downed pose (the DAMAGE sequence's final frame)

def main():
    im, green = load()
    boxes = detect_boxes(green)
    print(f"detected {len(boxes)} boxes\n")
    reslice(im, boxes, "kakashi_idle_uniform.png",        IDLE)
    reslice(im, boxes, "kakashi_walk_uniform.png",        WALK)
    reslice(im, boxes, "kakashi_run_uniform.png",         RUN)
    reslice(im, boxes, "kakashi_crouch_uniform.png",      CROUCH)
    reslice(im, boxes, "kakashi_crouchwalk_uniform.png",  CROUCH_WALK)
    reslice(im, boxes, "kakashi_jump_uniform.png",        JUMP)
    reslice(im, boxes, "kakashi_walljump_uniform.png",    WALL_JUMP)
    reslice(im, boxes, "kakashi_teleport_uniform.png",    TELEPORT)
    reslice(im, boxes, "kakashi_hurt_uniform.png",        HURT)
    reslice(im, boxes, "kakashi_knockdown_uniform.png",   KNOCKDOWN)
    reslice(im, boxes, "kakashi_fastgetup_uniform.png",   FAST_GETUP)
    make_portrait(im, boxes, "kakashi_portrait.png")
    # ── STAGE 2 normals ──
    reslice(im, boxes, "kakashi_light_uniform.png",       N_LIGHT)
    reslice(im, boxes, "kakashi_heavy_uniform.png",       N_HEAVY)
    reslice(im, boxes, "kakashi_up_uniform.png",          N_UP)
    reslice(im, boxes, "kakashi_air_uniform.png",         N_AIR)
    reslice(im, boxes, "kakashi_crouchlight_uniform.png", N_CROUCHL)
    reslice(im, boxes, "kakashi_runattack_uniform.png",   N_RUNATK)   # RESERVED (Stage 3 / dash-attack)
    # ── STAGE 3 command chain ──
    reslice(im, boxes, "kakashi_combo1_uniform.png",      CMB1)
    reslice(im, boxes, "kakashi_combo2_uniform.png",      CMB2)
    reslice(im, boxes, "kakashi_combo3_uniform.png",      CMB3)
    # ── STAGE 4 Weapon Throw cast poses ──
    reslice(im, boxes, "kakashi_throw_uniform.png",       WT_STAND)
    reslice(im, boxes, "kakashi_throwcrouch_uniform.png", WT_CROUCH)
    reslice(im, boxes, "kakashi_throwair_uniform.png",    WT_AIR)
    # ── STAGE 5 summons ──
    reslice(im, boxes, "kakashi_pakkun_cast_uniform.png",  PAKKUN_CAST)
    reslice(im, boxes, "kakashi_nindogs_cast_uniform.png", NINDOGS_CAST)
    reslice(im, boxes, "kakashi_nindogs_pack_uniform.png", NINDOGS_PACK)
    reslice_rects(im, PAKKUN_READY_RECTS, "kakashi_pakkun_ready_uniform.png")   # pug spawn/ready pose
    reslice_rects(im, PAKKUN_BITE_RECTS,  "kakashi_pakkun_bite_uniform.png")    # pug bite attack
    # ── STAGE 6 Raikiri poses ──
    reslice(im, boxes, "kakashi_raikiri_charge_uniform.png",  RAIKIRI_CHARGE)
    reslice(im, boxes, "kakashi_raikiri_dash_uniform.png",    RAIKIRI_DASH)
    reslice(im, boxes, "kakashi_raikiri_support_uniform.png", RAIKIRI_SUPPORT)
    # ── STAGE 7 Mangekyou stance ──
    reslice(im, boxes, "kakashi_mangekyou_stance_uniform.png", MANGEKYOU_STANCE)
    # ── STAGE 9 win/lose ──
    reslice(im, boxes, "kakashi_win_uniform.png",  WIN)
    reslice(im, boxes, "kakashi_lose_uniform.png", LOSE)

if __name__ == "__main__":
    main()
