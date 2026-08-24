#!/usr/bin/env python3
# Re-slice GWEN TENNYSON (rosterKey `gwen`, Ben 10, fan-made JUS chibi sheet) from the single
# landscape master sheet into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#   jus_gwen_tennyson_spritesheet_by_magnesiumselzune__by_renatoooferreiraaa_dmnjxu8.png (2373x623 RGBA)
#   Credit: magnesiumselzune (+ "justin kaiser" on the ref art) / reposted by renatoooferreiraaa.
#
# STRUCTURE: FLAT dark-navy field bg (41,49,74), fully opaque. Every sprite is moated by navy ->
# one connected component of the non-navy mask. Global frame index = top->bottom / left->right order
# printed by tools/gwen_stage0_boxes.py. KEEP detect params IN SYNC with that tool (they match here).
#
# ★FACING: the whole sheet is drawn FACING RIGHT (verified: idle box 9, walk 0-3, jump 4-7, cast 25,
#   blade 143-149 all face right). The engine draws P1 un-flipped expecting RIGHT-facing art, so we
#   bake FLIP_H=False.
# ★KEY BY COLOR, not alpha (alpha is 255 everywhere) — navy -> transparent.
#
# STAGE 1 = registration + movement/state + portrait. Later stages append picks below.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "jus_gwen_tennyson_spritesheet_by_magnesiumselzune__by_renatoooferreiraaa_dmnjxu8.png"
BG = np.array([41, 49, 74])
ALPHA = 16
FLIP_H = False   # sheet already faces RIGHT; engine flips for left.

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    navy = np.abs(a - BG).sum(2) < 40            # flat field key (high contrast → tolerance-insensitive)
    alpha = np.where(navy, 0, 255).astype('uint8')
    rgba = np.dstack([a.astype('uint8'), alpha])
    return Image.fromarray(rgba, "RGBA"), navy

def detect_boxes(navy, min_sz=200, min_w=10, min_h=12, row_bucket=60):
    lbl, n = ndimage.label(~navy)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    boxes = []
    for i in range(1, n + 1):
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

def make_portrait(im, boxes, out, pick=9, target_h=288):
    """Head/torso bust from a standing frame (box 9 = spellbook stance). NEAREST-scaled to HUD height.
    Crop the TOP ~62% of the standing cell so it reads as a face+torso bust, not a full body."""
    y0, x0, y1, x1 = boxes[pick]
    h = y1 - y0 + 1
    crop = im.crop((x0, y0, x1 + 1, y0 + int(h * 0.62)))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    # flatten onto transparent → keep RGBA
    big.save(out)
    print(f"OK {out}: {big.size} (bust from box {pick})")

# ── STAGE 1 action -> global frame indices (FACING-RIGHT; left→right = animation order). ──
# All picks verified by direct crop review (/tmp/gf_move.png, gf_labeled.png, gf_jump.png, gf_idle.png).
IDLE      = [24, 33]              # clean calm standing (hair-consistent). 30/31/32 EXCLUDED (pink mana FX
                                   #   at hand), 67/68 EXCLUDED (windswept hair → would pop vs 24).
GUARD     = [9]                    # spellbook held across chest = defensive/ready stance (own file)
WALK      = [0, 1, 2, 3]           # ✔ real 4-frame alternating-leg cycle
RUN       = [22, 23, 71, 72]       # forward-lean sprint stride (distinct from walk)
DASH      = [66]                   # low lunge/slide w/ ground motion-streak (dedicated dash pose)
JUMP      = [4, 5, 6, 7]           # leap arc (arm up, airborne); play once + hold apex; fall = last cell
CROUCH    = [20]                   # low hunched crouch (single). NB: the "2nd low pose" the audit flagged
                                   #   is NOT a crouch — box 85 = crouch-CONJURE construct summon (Stage 4),
                                   #   box 66 = the dash-slide (above). Resolved: crouch is 1 state.
HURT      = [149]                  # tumbling-back hit reaction (hitstun flinch)
KNOCKDOWN = [149, 150, 151]        # fall(tumble) → flat(downed = LOSE-pose stopgap) → rise; lockLastFrame holds recovery

# ── STAGE 2 normals (FACING-RIGHT; standalone single-button attacks; ×0.60 via GLOBAL_DAMAGE_SCALE).
#    Four REAL distinct melee poses on the sheet: straight-punch / lunge-punch / kick / low crouch-punch.
#    No command chain (S3 = none). air + down_air REUSE the light punch sheet (no dedicated aerial art).
#    ★16-19 & 106-108 are LOW CROUCH punches (hand on ground), NOT standing jabs → crouchLight.
N_LIGHT   = [43, 44, 45]           # standing STRAIGHT PUNCH (44 = white motion-streak) — light
N_HEAVY   = [46, 47]               # committed LUNGE PUNCH (coil-step → forward thrust) — heavy
N_UP      = [63, 64, 65]           # forward/high KICK w/ red streak — LAUNCHER (knockbackY launches)
N_CROUCHL = [16, 18, 19]           # genuine LOW crouch-punch (hand braced on ground) — crouchLight

# ── STAGE 4 specials (owner-locked, GWEN_ASSET_MAP.md §9). Cast POSES = real Gwen frames; the bolt/blue/
#    oval FX are PROCEDURAL (color) like Vegito/Piccolo; the 2 CONSTRUCTS carry real sliced shape sprites
#    (Green Lantern pattern). Slots: N=Mana Bolt / F=Crescent Slash (melee disjoint) / U=Spike-Crown
#    construct / D=Mana Sphere construct / B=Blue Vortex (distinct) / air=Oval-Portal Beam. ──
CAST      = [25, 26]               # hand-extended cast (orb/oval forming) — shared pose: bolt/blue/oval/constructs
CRESCENT  = [48, 49]               # crescent mana-slash swing (arc around body) — F melee disjoint pose
SPIKE     = [12]                   # standalone magenta SPIKE-CROWN construct shape (1f projectile sprite) — U
SPHERE    = [91]                   # standalone segmented mana SPHERE construct shape (1f projectile sprite) — D

# ── STAGE 5 ULTIMATE "Mana Blade" (the sheet's standout: idle → charge orb → blade extends → held → swing).
#    BLADE = the figure sequence (play-once over the freeze-cinematic: book-raise → charge → extend → hold →
#    swing). BLADE_BEAM = the detached giant cyan beam (visualOnly FX manifested during the cinematic). ──
BLADE      = [143, 144, 145, 146, 147, 148]   # Gwen blade sequence: raise → charge orb → extend → hold → swing
BLADE_BEAM = [125]                            # standalone giant cyan blade BEAM (1f FX sprite)

# ── STAGE 6 supporting FX (NOT standalone moves — attached as on-connect `impact` FX to the S4/S5 specials).
#    RIPPLE = growing magenta ring bloom (on-hit for the bolt/vortex/oval); SHARDS = mana spike-cluster burst
#    (on-hit for the constructs). Shield/dome + sonic-waveform DEFERRED (no clean attach — see §14). ──
RIPPLE = [102, 103, 104, 105]      # growing pink ring/ripple (4f) — projectile on-connect bloom
SHARDS = [93, 94, 95]              # mana spike-cluster burst (3f) — construct on-connect bloom

# ── STAGE 7 win/lose STOPGAPS (no dedicated win/lose/intro art on this sheet — §7 open dep).
#    WIN = arm-raised spellbook pose (box 143) as a triumphant victory-raise stopgap. LOSE reuses the
#    knockdown strip (flat downed frame). INTRO = deferred (no art). ──
WIN = [143]                        # arm-raised holding spellbook — victory-raise stopgap

def main():
    im, navy = load()
    boxes = detect_boxes(navy)
    print(f"detected {len(boxes)} boxes\n")
    reslice(im, boxes, "gwen_idle_uniform.png",      IDLE)
    reslice(im, boxes, "gwen_guard_uniform.png",     GUARD)
    reslice(im, boxes, "gwen_walk_uniform.png",      WALK)
    reslice(im, boxes, "gwen_run_uniform.png",       RUN)
    reslice(im, boxes, "gwen_dash_uniform.png",      DASH)
    reslice(im, boxes, "gwen_jump_uniform.png",      JUMP)
    reslice(im, boxes, "gwen_crouch_uniform.png",    CROUCH)
    reslice(im, boxes, "gwen_hurt_uniform.png",      HURT)
    reslice(im, boxes, "gwen_knockdown_uniform.png", KNOCKDOWN)
    make_portrait(im, boxes, "gwen_portrait.png")
    # ── STAGE 2 normals ── (air + down_air reuse the light sheet; no separate aerial art)
    reslice(im, boxes, "gwen_light_uniform.png",       N_LIGHT)
    reslice(im, boxes, "gwen_heavy_uniform.png",       N_HEAVY)
    reslice(im, boxes, "gwen_up_uniform.png",          N_UP)
    reslice(im, boxes, "gwen_crouchlight_uniform.png", N_CROUCHL)
    # ── STAGE 4 special cast poses + construct shape sprites ──
    reslice(im, boxes, "gwen_cast_uniform.png",     CAST)
    reslice(im, boxes, "gwen_crescent_uniform.png", CRESCENT)
    reslice(im, boxes, "gwen_spike_uniform.png",    SPIKE)
    reslice(im, boxes, "gwen_sphere_uniform.png",   SPHERE)
    # ── STAGE 5 ULTIMATE art ──
    reslice(im, boxes, "gwen_blade_uniform.png",      BLADE)
    reslice(im, boxes, "gwen_blade_beam_uniform.png", BLADE_BEAM)
    # ── STAGE 6 supporting FX (on-connect impact sprites) ──
    reslice(im, boxes, "gwen_ripple_uniform.png", RIPPLE)
    reslice(im, boxes, "gwen_shards_uniform.png", SHARDS)
    # ── STAGE 7 win stopgap ──
    reslice(im, boxes, "gwen_win_uniform.png", WIN)

if __name__ == "__main__":
    main()
