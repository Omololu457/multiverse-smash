#!/usr/bin/env python3
# Re-slice SUPER SAIYAN GOTENKS (DBZ Extreme Butoden 3DS) into CLEAN, feet-aligned uniform cells
# (one *_uniform.png per action). Source (STANDALONE SS kit — NO base-form sheet exists):
#   "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Gotenks.png"  (1550x6645 RGBA)
#
# ★ SAME EB rip family / keying as Goku + Gohan + Piccolo + Frieza: every frame sits on a solid
#   GREEN cell (#00FF50 = 0,255,80) with teal #008080 in the outer gutter. Key BOTH transparent.
#   Gotenks has PEACH skin + GOLD hair + WHITE pants (NOT green skin like Piccolo) → the standard
#   loose green key is safe here; no tight-key hazard.
#
# ★ Box detection + ordering are IDENTICAL to tools/gotenks_montage.py (size>=500, dims>=18,
#   sort by (y//60, x)). So the global frame indices below line up 1:1 with the indexed montages
#   used to pick them — see GOTENKS_ASSET_MAP.md.
#
# ★ GLOBAL FACING FIX (same as Gohan/Piccolo/Frieza): this EB rip is drawn facing LEFT, but the
#   engine draws P1 sprites UN-FLIPPED expecting them to face RIGHT. Mirror every cell so the baked
#   art faces right (engine then flips normally for facing == -1).
#
# STAGE 1 = movement / state + anime-face portrait. Later stages append picks below.
# ★ NO transformation system (no base-form sheet) — this is a standalone SS kit (GOTENKS_ASSET_MAP.md).
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Gotenks.png"

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    teal  = (np.abs(a - np.array([0, 128, 128])).sum(2) < 40)
    green = (np.abs(a - np.array([0, 255, 80])).sum(2) < 60)
    bg = teal | green
    alpha = np.where(bg, 0, 255).astype('uint8')
    rgba = np.dstack([a.astype('uint8'), alpha])
    return Image.fromarray(rgba, "RGBA"), bg

def detect_boxes(bg):
    """Ordered (y0,x0,y1,x1) per frame — IDENTICAL scheme to gotenks_montage.py."""
    lbl, n = ndimage.label(~bg)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(ys) < 500:
            continue
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1 - x0 + 1) < 18 or (y1 - y0 + 1) < 18:
            continue
        boxes.append((y0, x0, y1, x1))
    boxes.sort(key=lambda b: (b[0] // 60, b[1]))
    return boxes

ALPHA = 16
def content_bbox(im, box):
    y0, x0, y1, x1 = box
    cell = im.crop((x0, y0, x1 + 1, y1 + 1))
    arr = np.asarray(cell)
    mask = arr[:, :, 3] > ALPHA
    ys, xs = np.where(mask)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())

FLIP_H = True
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
    print(f"OK {out}: {len(frames)}f cell {uW}x{uH}  "
          f"-> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_face_portrait(out, target_h=288):
    """Anime facial close-up from the top portrait band (HUD material). Band = 1 chibi full-body
    (leftmost) + 5 rectangular face busts on BLACK. Take the 2nd content cluster (index 1) = the
    first calm face bust (same convention as reslice_gohan.py)."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    top = a[:340]
    teal  = (np.abs(top - np.array([0, 128, 128])).sum(2) < 40)
    green = (np.abs(top - np.array([0, 255, 80])).sum(2) < 60)
    black = top.sum(2) < 60
    content = ~(teal | green | black)
    lbl, n = ndimage.label(content)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < 4000:
            continue
        comps.append((int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max()), len(xs)))
    comps.sort(key=lambda c: c[0])   # left -> right
    x0, x1, y0, y1, _ = comps[1] if len(comps) > 1 else comps[0]
    crop = Image.open(SRC).convert("RGBA").crop((x0, y0, x1 + 1, y1 + 1))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (anime face bust #1 from portrait band)")

if __name__ == "__main__":
    im, bg = load()
    boxes = detect_boxes(bg)
    print(f"detected {len(boxes)} frames\n")

    # ── STAGE 1 — MOVEMENT / STATE (feet-aligned *_uniform.png; anchorY 0 plants feet). ──
    # IDLE = primary 6-frame breathing loop [9-14] — open-hand ready stance, subtle sway (a real
    #   breathing loop; ~70x87 uniform). The ready-stance tier row [6/7/8] (=[8] LAVENDER single-tone
    #   flash frame) is the cosmetic effect-frame set (Stage-6), NOT the idle.
    reslice(im, boxes, "gotenks_idle_uniform.png",     [9, 10, 11, 12, 13, 14])
    # CROUCH = the lower hunched "crouching idle" variant [15-17] (knees bent, fists near face).
    reslice(im, boxes, "gotenks_crouch_uniform.png",   [15, 16, 17])
    # ★NO ground walk stride exists on the sheet (standalone SS kit) → walk/run BORROW idle in
    #   characters.js (Frieza/Piccolo pattern). No separate walk_uniform emitted.
    reslice(im, boxes, "gotenks_dash_uniform.png",     [42])              # forward lunge lean (dash burst)
    reslice(im, boxes, "gotenks_jump_uniform.png",     [47, 46, 45])      # leap launch → ascent → apex float
    reslice(im, boxes, "gotenks_fall_uniform.png",     [45])              # airborne descent (reuse apex pose)
    reslice(im, boxes, "gotenks_guard_uniform.png",    [24, 25])          # crossed-arm braced block
    reslice(im, boxes, "gotenks_guardhit_uniform.png", [234, 235, 236])   # crossed-arm guard-hit recoil (clip; unwired if engine lacks guardHit)
    reslice(im, boxes, "gotenks_hurt_uniform.png",     [228])             # hit-reaction stagger
    reslice(im, boxes, "gotenks_knockdown_uniform.png",[230, 231])        # drop face-down → lying flat
    reslice(im, boxes, "gotenks_getup_uniform.png",    [232, 233])        # prop up → rise, fists up
    reslice(im, boxes, "gotenks_taunt_uniform.png",    [181, 182])        # finger-point-up cocky taunt
    # ★ TORN-CLOTHING HEAVIER-DAMAGE STATE [238-241] — sitting-up-dazed, red-eyed (visibly heavier hit).
    #   Sliced here so the clip exists, but its TRIGGER is UNCONFIRMED (GOTENKS_ASSET_MAP.md item 2) →
    #   registered UNWIRED in characters.js; do NOT hook to knockdown until the owner confirms the trigger.
    reslice(im, boxes, "gotenks_dazed_uniform.png",    [238, 239, 240, 241])
    make_face_portrait("gotenks_portrait.png")

    # ── STAGE 2 — NORMALS (render by move name; basic_attacks data in characters.js; all dmg ×0.60
    #    GLOBAL_DAMAGE_SCALE). down_air REUSES air (project pattern). crouchLight auto-swaps from light
    #    while crouching (_setCrouchVariant). All picks have a VISIBLY extended limb (Gohan lesson).
    #    Reserved for Stage 3 rapid-punch-barrage: [117,118]+[122-124]. Reserved for Stage 4 specials:
    #    ki-charge aura [100,101], dash-punch [102,103], flying-kick crescents [61,85,86,164,169].
    reslice(im, boxes, "gotenks_light_uniform.png",      [57])           # jab — upright, lead arm extended FORWARD at shoulder height
    reslice(im, boxes, "gotenks_heavy_uniform.png",      [56])           # deep lunge STRAIGHT PUNCH — long reach (104px wide)
    reslice(im, boxes, "gotenks_up_uniform.png",         [146])          # rising kick LAUNCHER — leg extended upward
    reslice(im, boxes, "gotenks_air_uniform.png",        [147])          # airborne spin-kick (down_air reuses this)
    reslice(im, boxes, "gotenks_crouchlight_uniform.png",[107])          # low forward poke (crouch normal)

    # ── STAGE 3 — COMMAND CHAIN "Kamikaze Barrage" (Fwd+Heavy 3-stage rapid-punch rekka: advancing opener →
    #    rapid motion-blur barrage → finishing flurry double-punch). The barrage is the sheet's confirmed
    #    distinct rapid-combo (motion-streak marks on BOTH fists) — built as a chained string, NOT folded into
    #    the jab combo. Mirrors GOHAN/PICCOLO/IRON-MAN rush chains. All CONFIRMED strike art.
    reslice(im, boxes, "gotenks_rush1_uniform.png", [116])              # opener — advancing forward punch
    reslice(im, boxes, "gotenks_rush2_uniform.png", [117, 118])         # rapid BARRAGE — alternating fists w/ heavy motion-blur streaks
    reslice(im, boxes, "gotenks_rush3_uniform.png", [122, 123, 124])    # finishing FLURRY → both-fists thrust ender

    # ── STAGE 4 — SPECIALS cast poses. Ki Blast (procedural shard — ★projectile ART REFUTED on the sheet, so
    #    the shard is PROCEDURAL; only the cast POSE is real) + Ki Charge (resource-build energy gather). ──
    reslice(im, boxes, "gotenks_kiblast_uniform.png",  [190, 191])   # open-hand ki-blast CAST pose (procedural shard leaves hand)
    reslice(im, boxes, "gotenks_kicharge_uniform.png", [100, 101])   # standing ki-charge gather (aura particles) — resource build

    # ── STAGE 5 — SUPER GHOST KAMIKAZE ATTACK (ULT). The sheet's ONLY screen-effect finisher content, a
    #    confirmed match to the character's signature technique. windup (arms raised, cape flying) → cyan
    #    energy-flash → ghost materialization (blob → floating ghost w/ matching hair-tuft → launched dart).
    reslice(im, boxes, "gotenks_ghostwind_uniform.png",  [242, 243, 244, 245])   # windup — arms raised, cape flying
    reslice(im, boxes, "gotenks_ghostthrow_uniform.png", [252, 253, 254, 255])   # ghost-command / throw poses
    reslice(im, boxes, "gotenks_ghost_uniform.png",      [258, 259, 260, 261, 262])  # the floating GHOST (projectile sprite, matching hair-tuft)

    # ── STAGE 6+ — win/lose/portrait/harness/balance append below. ──
