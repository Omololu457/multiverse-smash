#!/usr/bin/env python3
# Re-slice TEEN GOHAN (DBZ Extreme Butoden 3DS) into CLEAN, feet-aligned uniform cells
# (one *_uniform.png per action). Source (Stage 1 = BASE form):
#   "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Teen Gohan.png"  (1546x6838 RGBA)
#
# ★ SAME EB rip family / keying as Goku + Piccolo + Frieza: every frame sits on a solid GREEN
#   cell (#00FF50 = 0,255,80) with teal #008080 in the outer gutter. Key BOTH transparent.
#   Gohan has PEACH skin + PURPLE gi (NOT green skin like Piccolo) → the standard loose green
#   key is safe here; no tight-key hazard.
#
# ★ Box detection + ordering are IDENTICAL to tools/gohan_montage.py (size>=500, dims>=18,
#   sort by (y//60, x)). So the global frame indices below line up 1:1 with the indexed
#   montages used to pick them — see GOHAN_ASSET_MAP.md.
#
# ★ GLOBAL FACING FIX (same as Piccolo/Frieza): this EB rip is drawn facing LEFT, but the
#   engine draws P1 sprites UN-FLIPPED expecting them to face RIGHT. Mirror every cell so the
#   baked art faces right (engine then flips normally for facing == -1).
#
# STAGE 1 = movement / state + anime-face portrait. Later stages append picks below.
# ★ SSJ2 form (the gold-hair recolor of THIS same skeleton) + revert-on-knockdown wiring are
#   Stage 5 — the SSJ2 sheet is sliced there, not here.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Teen Gohan.png"
SRC_SSJ2 = "3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Teen Gohan (Super Saiyan 2).png"

def load(src=SRC):
    a = np.asarray(Image.open(src).convert("RGB")).astype(int)
    teal  = (np.abs(a - np.array([0, 128, 128])).sum(2) < 40)
    green = (np.abs(a - np.array([0, 255, 80])).sum(2) < 60)
    bg = teal | green
    alpha = np.where(bg, 0, 255).astype('uint8')
    rgba = np.dstack([a.astype('uint8'), alpha])
    return Image.fromarray(rgba, "RGBA"), bg

def detect_boxes(bg):
    """Ordered (y0,x0,y1,x1) per frame — IDENTICAL scheme to gohan_montage.py."""
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
    first calm face bust."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    top = a[:300]
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
    # IDLE = fists-up combat-ready breathing loop [13-15] — near-identical subtle frames (a real
    #   breathing loop, unlike Piccolo's single-pose gap). [12] is dropped: it's a taller ~103px
    #   enter-stance outlier (vs the uniform ~88px [13-15]) that read as a 15px head-bob. The relaxed
    #   neutral stance [6/9-11] + its palette tiers ([7]=dim, [8]=LAVENDER single-tone flash frame)
    #   are the ready-stance tier set (Stage-6 cosmetic effect frame) — documented, not the idle.
    reslice(im, boxes, "gohan_idle_uniform.png",      [13, 14, 15])
    # WALK / RUN = a REAL forward-stride cycle [43-47] (Gohan has locomotion; contrast Piccolo/Frieza).
    reslice(im, boxes, "gohan_walk_uniform.png",      [43, 44, 45, 46])
    reslice(im, boxes, "gohan_run_uniform.png",       [43, 44, 45, 46, 47])
    reslice(im, boxes, "gohan_dash_uniform.png",      [42])              # forward horizontal lunge
    reslice(im, boxes, "gohan_jump_uniform.png",      [31, 32, 33])      # launch → ascent (arms overhead)
    reslice(im, boxes, "gohan_fall_uniform.png",      [34])              # airborne descent
    reslice(im, boxes, "gohan_crouch_uniform.png",    [24])              # low duck
    reslice(im, boxes, "gohan_guard_uniform.png",     [22, 23])          # compact braced block
    reslice(im, boxes, "gohan_hurt_uniform.png",      [245, 246])        # hit-reaction flinch/recoil
    reslice(im, boxes, "gohan_knockdown_uniform.png", [238, 239])        # drop-to-back → lying (short-wide)
    reslice(im, boxes, "gohan_getup_uniform.png",     [242, 243])        # sit-up → rise
    reslice(im, boxes, "gohan_taunt_uniform.png",     [17, 18, 19])      # open-hand spread ready/beckon
    make_face_portrait("gohan_portrait.png")

    # ── STAGE 2 — NORMALS (render by move name; basic_attacks data in characters.js; all dmg ×0.60
    #    GLOBAL_DAMAGE_SCALE). Base-sheet art; SSJ2 recolor of these lands at Stage 5. down_air REUSES
    #    air (project pattern). Picks catalogued from the normals band [48-143] (subagent index pass,
    #    then in-engine subagent visual sign-off). guard/taunt already emitted in Stage 1. Reserved for
    #    Stage 3 command chain: crescent flying-kick [96,97] / spin-backhand [62,63] / sweep [143].
    # ★ light/up RE-PICKED after an in-engine subagent flagged the first picks ([72]/[121-123]) as
    #   passive fists-at-face crouch frames (no extended limb). New picks have a VISIBLY extended limb.
    reslice(im, boxes, "gohan_light_uniform.png", [78])          # jab — upright, lead arm fully extended FORWARD at shoulder height
    reslice(im, boxes, "gohan_heavy_uniform.png", [91, 92])      # diving/lunging PUNCH — lead fist thrust forward, long reach (#92=110px wide)
    reslice(im, boxes, "gohan_up_uniform.png",    [123])         # rising uppercut LAUNCHER — forward arm raised STRAIGHT UP, fist above head (single frame; [88,89]/[121,122] were tucked chambers — strip-art verified)
    reslice(im, boxes, "gohan_air_uniform.png",   [84])          # airborne extended kick (down_air reuses this)

    # ── STAGE 3 — command chain (Fwd+Heavy 3-stage rush rekka: advancing punch opener → crescent kick →
    #    spin-roundhouse LAUNCHER). Rendered by move name; GOHAN_CMD in abilities.js. Distinct escalating beats,
    #    all CONFIRMED strike art (subagent index pass + in-engine sign-off). Mirrors PICCOLO/GOKU rush chains.
    # ★ rush1/rush2 RE-PICKED after in-engine + objective-facing audit: [90,92] were KICKS/wind-ups (not a punch);
    #   [97] attacked LEFT (wrong-way after the uniform flip). New picks are all clean, right-facing, distinct.
    reslice(im, boxes, "gohan_rush1_uniform.png", [143])          # opener — committed forward PUNCH, arm extended right at shoulder height (+ swipe trail)
    reslice(im, boxes, "gohan_rush2_uniform.png", [96])           # mid — crescent sweep KICK, blue/tan motion-arc sweeping right
    reslice(im, boxes, "gohan_rush3_uniform.png", [124])          # LAUNCHER finisher — big spin-roundhouse (broad tan motion-arc, widest frame)

    # ── STAGE 4 — LONE MELEE SPECIAL "Meteor Kick" (owner: keep-one-melee-special, Goku-parallel). ★MELEE-ONLY:
    #    NO beam/charge/Ultimate art on either sheet (confirmed twice) → no ranged special, NOT invented. ★NO
    #    dedicated slice: like Goku's Dragon Fist (which reuses goku_base_heavy_uniform), Meteor Kick HONESTLY
    #    REUSES the validated lunging-kick art (gohan_heavy_uniform). Candidate dedicated frames ([48]/[133]) were
    #    rejected — [48] faced LEFT after the uniform flip; [133] was a hands-tucked wind-up (both audited). The
    #    move is a committed forward-lunging flying kick; special FEEL comes from mechanics (Ki cost / big lunge /
    #    camera / hard knockback), not new art. See GOHAN_ASSET_MAP.md §S4.

    # ── STAGE 5 — TRANSFORMATION (Base ↔ Super Saiyan 2). ──
    # (a) Base→SSJ2 MORPH = the real mid-air tumbling black→gold sequence on the BASE sheet (#163-176; gold
    #     onset at #169). Plays once on transform (Vegeta-morph slot). black [167] → gold [169,171,173,175].
    reslice(im, boxes, "gohan_transform_uniform.png", [167, 169, 171, 173, 175])
    # (b) SSJ2 GOLD FORM = recolor of the shared skeleton on the SSJ2 sheet. ★Indices INDEPENDENTLY MAPPED on the
    #     SSJ2 sheet (subagent pass) — its taller gold hair shifts the box ordering, so BASE indices DON'T align
    #     (verified: every index differs). Rendered via _skinAnim GOHAN_SSJ2_ANIM (Vegeta-SSJ pattern). Facing of
    #     the attack picks screened; a few read amb/left on the noisy metric → in-engine subagent verify after wiring.
    im2, bg2 = load(SRC_SSJ2)
    boxes2 = detect_boxes(bg2)
    print(f"SSJ2: detected {len(boxes2)} frames")
    reslice(im2, boxes2, "gohan_ssj2_idle_uniform.png",      [52, 53, 54])       # gold fists-up breathing loop
    reslice(im2, boxes2, "gohan_ssj2_walk_uniform.png",      [24, 25, 26, 27])   # gold forward stride
    reslice(im2, boxes2, "gohan_ssj2_run_uniform.png",       [24, 25, 26, 27, 28])
    reslice(im2, boxes2, "gohan_ssj2_dash_uniform.png",      [50])               # gold forward lunge
    reslice(im2, boxes2, "gohan_ssj2_jump_uniform.png",      [37, 38])           # gold ascent
    reslice(im2, boxes2, "gohan_ssj2_fall_uniform.png",      [40])               # gold descent
    reslice(im2, boxes2, "gohan_ssj2_crouch_uniform.png",    [41])               # gold duck
    reslice(im2, boxes2, "gohan_ssj2_guard_uniform.png",     [55, 56])           # gold block
    reslice(im2, boxes2, "gohan_ssj2_hurt_uniform.png",      [232, 233])         # gold flinch
    reslice(im2, boxes2, "gohan_ssj2_knockdown_uniform.png", [253, 254])         # gold lying (this cluster is where SSJ2→base revert lives on the sheet)
    reslice(im2, boxes2, "gohan_ssj2_getup_uniform.png",     [243, 244])         # gold rise
    reslice(im2, boxes2, "gohan_ssj2_light_uniform.png",     [96])               # gold jab
    reslice(im2, boxes2, "gohan_ssj2_heavy_uniform.png",     [89, 90])           # gold lunging kick
    reslice(im2, boxes2, "gohan_ssj2_up_uniform.png",        [124])              # gold uppercut launcher
    reslice(im2, boxes2, "gohan_ssj2_air_uniform.png",       [100])              # gold flying kick
    reslice(im2, boxes2, "gohan_ssj2_rush1_uniform.png",     [132])              # gold forward punch
    reslice(im2, boxes2, "gohan_ssj2_rush2_uniform.png",     [123])              # gold crescent kick
    reslice(im2, boxes2, "gohan_ssj2_rush3_uniform.png",     [141, 142])         # gold spin roundhouse

    # ── STAGE 6 — WIN + cape-reveal INTRO (base sheet). lose = REUSE knockdown (no dedicated lose art). ──
    # ★WIN: the prompt/Stage-0 expected a 9-frame arms-raised CHEER — a detailed montage audit found NO arms-up
    #   cheer and NO hand-behind-head grin on the sheet (stated art ≠ reality). The victory art is a coil →
    #   TRIUMPHANT hunched fighting stance [254-256] (+ a kneel/bow [257-259], excluded — reads as exhaustion).
    reslice(im, boxes, "gohan_win_uniform.png",   [254, 255, 256])
    # INTRO: REAL Cell-saga cape-reveal — worn [260] → held out [261,262] → flung [263,264] → plain gi [265] →
    #   shoulder-flourish toss [266,267]. Base-form only (the SSJ2 sheet has NO cape frames — confirmed Stage 0).
    reslice(im, boxes, "gohan_intro_uniform.png", [260, 261, 262, 263, 264, 265, 266, 267])
