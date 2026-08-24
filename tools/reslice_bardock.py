#!/usr/bin/env python3
# Re-slice BARDOCK (DBZ Extreme Butoden 3DS) into CLEAN, feet-aligned uniform cells
# (one *_uniform.png per action). Source (STANDALONE single-form kit — the SSJ gold-hair frames
# are a brief cosmetic FLASH, NOT a sustained alt-state; see BARDOCK_ASSET_MAP.md item 1):
#   "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Bardock.png"  (1550x8030 RGBA)
#
# ★ SAME EB rip family / keying as Goku + Gohan + Gotenks + Piccolo + Frieza: every frame sits on a
#   solid GREEN cell (#00FF50 = 0,255,80) with teal #008080 in the outer gutter. Key BOTH transparent.
#   Bardock has PEACH skin + BLACK hair + GREEN Saiyan armor (NOT green skin like Piccolo) → the
#   standard loose green key is safe here; no tight-key hazard.
#
# ★ Box detection + ordering are IDENTICAL to tools/bardock_montage.py (size>=500, dims>=18,
#   sort by (y//60, x)). So the global frame indices below line up 1:1 with the indexed montages
#   used to pick them — see BARDOCK_ASSET_MAP.md.
#
# ★ GLOBAL FACING FIX (same as Gohan/Gotenks/Piccolo/Frieza): this EB rip is drawn facing LEFT, but
#   the engine draws P1 sprites UN-FLIPPED expecting them to face RIGHT. Mirror every cell so the baked
#   art faces right (engine then flips normally for facing == -1).
#
# STAGE 1 = movement / state + anime-face portrait. Later stages append picks below.
# ★ Portrait band: boxes #0 (full-figure) + #1-5 (five 256x256 face busts). Ready-stance tier row
#   #6/#7 + #8 = LAVENDER single-tone FLASH frame (cosmetic; Stage-6). Idle breathing loop = #9-16;
#   #17-23 = a 2nd combat-ready idle variant (reserved). See BARDOCK_ASSET_MAP.md.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Bardock.png"

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    teal  = (np.abs(a - np.array([0, 128, 128])).sum(2) < 40)
    green = (np.abs(a - np.array([0, 255, 80])).sum(2) < 60)
    bg = teal | green
    alpha = np.where(bg, 0, 255).astype('uint8')
    rgba = np.dstack([a.astype('uint8'), alpha])
    return Image.fromarray(rgba, "RGBA"), bg

def detect_boxes(bg):
    """Ordered (y0,x0,y1,x1) per frame — IDENTICAL scheme to bardock_montage.py."""
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
    """Anime facial close-up from the top portrait band (HUD material). Band = 1 full-body figure
    (leftmost, #0) + 5 rectangular 256x256 face busts on BLACK (#1-5). Take the 2nd content cluster
    (index 1) = the first calm face bust (same convention as reslice_gotenks.py)."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    top = a[:260]
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
    # IDLE = calm 6-frame breathing loop [9-14] (relaxed ready stance, subtle sway). The tier row
    #   [6]/[7] + [8] LAVENDER single-tone flash is the cosmetic effect-frame set (Stage-6), NOT idle.
    #   The 2nd combat-ready idle variant [17-23] (hands up/clawed) is RESERVED.
    reslice(im, boxes, "bardock_idle_uniform.png",     [9, 10, 11, 12, 13, 14])
    # CROUCH = low crouch, ★SWORD-DRAWN variant [27,28] (green blade held low) — the sheet's crouch
    #   carries the sword (BARDOCK_ASSET_MAP.md item 2). Satisfies the prompt's "crouch incl. sword variant".
    reslice(im, boxes, "bardock_crouch_uniform.png",   [27, 28])
    # ★NO ground walk stride exists on the sheet → walk/run BORROW idle in characters.js (EB pattern:
    #   Frieza/Piccolo/Gotenks). No separate walk_uniform emitted.
    reslice(im, boxes, "bardock_dash_uniform.png",     [42])              # deep forward lunge lean (dash burst)
    reslice(im, boxes, "bardock_jump_uniform.png",     [47, 48])          # leap launch → ascent
    reslice(im, boxes, "bardock_fall_uniform.png",     [48])              # airborne descent (reuse ascent pose)
    reslice(im, boxes, "bardock_guard_uniform.png",    [24, 25])          # fists-up braced block
    reslice(im, boxes, "bardock_guardhit_uniform.png", [218, 219])        # lean-back guard-hit recoil
    reslice(im, boxes, "bardock_hurt_uniform.png",     [256])             # hit-reaction stagger (struck back)
    reslice(im, boxes, "bardock_knockdown_uniform.png",[271, 272, 273])   # collapse → lying prone → flat
    reslice(im, boxes, "bardock_getup_uniform.png",    [268, 269, 270])   # push up → rise → stand
    # ★ WIN = REAL standing ARMS-CROSSED victory pose [276-281] (confirmed on-sheet — unlike Goku/Gotenks,
    #   Bardock HAS win art, so NO borrowing). Finalized at Stage 6; wired now since it renders cleanly.
    reslice(im, boxes, "bardock_win_uniform.png",      [276, 277, 278, 279, 280, 281])
    make_face_portrait("bardock_portrait.png")

    # ── STAGE 2 — NORMALS (render by move name; basic_attacks data in characters.js; all dmg ×0.60
    #    GLOBAL_DAMAGE_SCALE). ★Bardock's SWORD differentiator is baked into the three slots the sheet
    #    actually depicts armed (BARDOCK_ASSET_MAP.md item 2): overhead slash = HEAVY, diving sword =
    #    DOWN_AIR, low sword = CROUCHLIGHT. light/up/air stay unarmed. All picks have a visibly extended
    #    limb/weapon (Gohan lesson); every one screened AFTER flip to confirm it reaches to the RIGHT. ──
    reslice(im, boxes, "bardock_light_uniform.png",      [74])   # jab — lead arm extended forward (quick)
    reslice(im, boxes, "bardock_heavy_uniform.png",      [154])  # ★SWORD overhead slash w/ red trail — long reach (the differentiator)
    reslice(im, boxes, "bardock_up_uniform.png",         [134])  # rising AXE-KICK launcher — leg extended straight up (own art)
    reslice(im, boxes, "bardock_air_uniform.png",        [85])   # airborne flying kick — leg extended
    reslice(im, boxes, "bardock_downair_uniform.png",    [65])   # ★SWORD diving strike w/ arc trail — angled down (own art, NOT a reuse)
    reslice(im, boxes, "bardock_crouchlight_uniform.png",[66])   # ★SWORD low thrust — crouch normal (auto-swaps from light while crouching)

    # ── STAGE 3 — COMMAND CHAIN "Blade Rush" (Fwd+Heavy 3-stage SWORD rekka: forward sword thrust →
    #    big overhead slash → rising spin-slash LAUNCHER). ★A pure-SWORD string = the cleanest showcase
    #    of Bardock's differentiator; mirrors updateVegitoCommandCombat (the sibling sword rekka). All
    #    CONFIRMED distinct blade art, none reusing the neutral heavy slash [154]. Every frame screened
    #    AFTER flip + IN-ENGINE to confirm the blade reaches RIGHT (Gohan lesson). ──
    reslice(im, boxes, "bardock_rush1_uniform.png", [79])   # opener — forward SWORD thrust (advancing)
    reslice(im, boxes, "bardock_rush2_uniform.png", [163])  # mid — big vertical overhead SWORD slash w/ red trail
    reslice(im, boxes, "bardock_rush3_uniform.png", [129])  # finisher — rising spin-slash LAUNCHER w/ red arc trail

    # ── STAGE 4 — SPECIALS (small MELEE kit; abilities.js executeBardockSpecial). ★No ranged/energy
    #    special exists on the sheet (BARDOCK_ASSET_MAP.md item 4) — NOT invented. The offensive special
    #    is MELEE (a dashing SWORD lunge). The golden ki-orb [203,204] is assigned its resource-build role
    #    (Ki Charge) — the faithful reading (no beam/nova payoff exists to connect it to). ──
    reslice(im, boxes, "bardock_rebellion_uniform.png", [49])        # "Rebellion Rush" — horizontal dashing SWORD lunge
    reslice(im, boxes, "bardock_kicharge_uniform.png",   [203, 204]) # "Ki Charge" — golden ki-orb gather (resource build)

    # ── STAGE 5 — SUPER SAIYAN COSMETIC FLASH (a BRIEF visual beat, NOT a playable alt-state — the sheet
    #    has NO SSJ combat kit; BARDOCK_ASSET_MAP.md item 1, demoted like Goku's SSJ3). The 5 gold-hair
    #    frames as a power-up flourish: kneel-charge → rise/arm-up → peak → arms-spread flare → settle.
    #    Wired to the cosmetic TAUNT slot in characters.js — plays gold, then REVERTS to base (no gold
    #    idle/walk/normals exist, so there is no sustained form). ──
    reslice(im, boxes, "bardock_ssjflash_uniform.png", [201, 199, 198, 195, 200])

    # ── STAGE 6 — INTRO (REAL adjust-stance entrance, deferred from S1; BARDOCK_ASSET_MAP.md). Bardock
    #    HAS a genuine standing/adjusting-stance sequence on the sheet (unlike Goku/Gotenks) → NO borrowing.
    #    stand upright → adjust → lean → settle into combat-ready stance (holds last frame). Win (arms-
    #    crossed [276-281]) + portrait (bust #1) + lose (reuse knockdown) were already emitted in Stage 1. ──
    reslice(im, boxes, "bardock_intro_uniform.png", [285, 289, 294, 296, 297])

    # ── UNUSED reserves (preserved, not wired): open-palm push CUT [176,177]; flex [36,37,144,145,185,186];
    #    sword stance/sweep [30,31,34,130,131,155-159,167,174,183]; overhead double-fist smash [97,124];
    #    backflip [160-162]; 2nd combat-ready idle variant [17-23]; lavender-flash tier frame [8]. ──
