#!/usr/bin/env python3
# Assemble Green Lantern (Hal Jordan, DC) movement/state/attack sheets from the 624 pre-sliced
# individual frames hal_sprite_001..624.png. Unlike the row-strip chars (reslice_deathstroke.py),
# the source is already one-frame-per-file, so no alpha-gutter run detection is needed — we just
# take an explicit ORDERED LIST of frame indices, trim each to its content bbox, and repack into a
# single uniform, feet-aligned cell (centered-X, BOTTOM-aligned) so one anchorY:0 plants feet
# across every standing action. Same output convention as the other reslice tools.
#
# Full Stage-0 audit + owner decisions: GREEN_LANTERN_ASSET_MAP.md. Source frames kept untouched.
import sys
from PIL import Image

ALPHA = 16
SRC = "hal_sprite_{:03d}.png"

def content_bbox(im):
    px = im.load(); W, H = im.size
    minx, miny, maxx, maxy = W, H, -1, -1
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > ALPHA:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    if maxx < 0:
        return None
    return (minx, miny, maxx + 1, maxy + 1)

def assemble(indices, out, pad_to=None):
    crops = []
    for n in indices:
        im = Image.open(SRC.format(n)).convert("RGBA")
        bb = content_bbox(im)
        if bb is None:
            print(f"   !! frame {n} is empty — skipped"); continue
        crops.append(im.crop(bb))
    if not crops:
        print(f"!! {out}: no non-empty frames"); return
    uW = max(c.width for c in crops) + 2
    uH = max(c.height for c in crops) + 2
    if pad_to is not None:
        uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    strip = Image.new("RGBA", (uW * len(crops), uH), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        dx = i * uW + (uW - c.width) // 2
        dy = uH - c.height - 1
        strip.paste(c, (dx, dy), c)
    strip.save(out)
    print(f"OK {out}: {len(crops)} frames, cell {uW}x{uH}  widths={[c.width for c in crops]}")
    print(f"   animationData -> {{ frames: {len(crops)}, width: {uW}, height: {uH}, anchorY: 0 }}")

def portrait(index, out, target_h=288, box=None):
    im = Image.open(SRC.format(index)).convert("RGBA")
    if box is not None:
        im = im.crop(box)
    else:
        bb = content_bbox(im)
        if bb: im = im.crop(bb)
    scale = target_h / im.height
    big = im.resize((max(1, round(im.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size}  (portrait from frame {index})")

if __name__ == "__main__":
    # ── STAGE 1 — movement / state (frame lists from the Stage-1 selection pass) ──
    # idle — suited GL 4-frame subtle ready loop (005–008)
    assemble([5, 6, 7, 8], "gl_idle_uniform.png")
    # run — clean forward stride cycle from the pose library (289,290,292,293; 291 drops a punch-FX
    # streak, 294+ are debris dots). No dedicated WALK cycle → walk REUSES this sheet (flagged).
    assemble([289, 290, 292, 293], "gl_run_uniform.png")
    # jump — rising leap (070). fall = descending tumble (108), kept as its own 1-frame hold.
    assemble([70], "gl_jump_uniform.png")
    assemble([108], "gl_fall_uniform.png")
    # flight / hover — 6-frame airborne glide+tumble (073–075 glide, 105–107 acrobatic). Drives the
    # flight/dash movement mode (owner decision: horse = movement mode; flight art backs it).
    assemble([73, 74, 75, 105, 106, 107], "gl_flight_uniform.png")
    # hurt — standing hit-recoil/stagger. Only 419 (upright) + 421 (forward stagger) are STANDING;
    # 415–418 and 420 are PRONE (part of the knockdown tumble, not a standing recoil) → excluded.
    assemble([419, 421], "gl_hurt_uniform.png")
    # knockdown — airborne head-over-heels tumble to the ground (549,551,553,555). REAL art.
    assemble([549, 551, 553, 555], "gl_knockdown_uniform.png")
    # getup — NO clean rise-to-stance art exists (561–567 are all prone/tumble poses, no upright
    # recovery) → getup REUSES the idle sheet (pop back to ready). Honest reuse, flagged in characters.js.
    # NOTE (honest reuse, flagged): walk→run, dash→run, guard→idle, getup→idle, fall holds gl_fall,
    # crouch → NO dedicated art (movement.crouchIdle NOT set for GL; holding Down keeps idle).

    # PORTRAIT — frame 624 is already a dedicated suited-GL bust (select-screen art). Upscaled.
    portrait(624, "gl_portrait.png")

    # ── STAGE 2 — 5 normals (candidate picks, QA'd before wiring). All clean CHARACTER strikes from the
    # pose library; construct/FX frames avoided. down_air REUSES the air sheet (no clean downward aerial). ──
    assemble([262, 264], "gl_light_uniform.png")          # light  — quick straight jab (strike 262 → recover 264; 263 is a spin-kick, dropped)
    assemble([285, 286, 287], "gl_heavy_uniform.png")     # heavy  — committed lunging power punch (cock 285 → strike 286 → recover 287)
    assemble([313, 314], "gl_up_uniform.png")             # up     — rising LAUNCHER kick (strike 313 → land 314; 312 was a construct orb, dropped)
    assemble([121, 122, 123], "gl_air_uniform.png")       # air    — aerial superman flying-kick (tuck 121 → strike 122 → recover 123)

    # ── STAGE 3 — Fwd+Heavy command normal "Ring-Charged Spin Kick" (Onoki/Madara single-command pattern,
    # NOT a rekka). 263 = the sweeping spin-kick strike, bracketed by the 264/265 fists-up ready poses. ──
    assemble([264, 263, 265], "gl_spinkick_uniform.png")  # cmd — cock 264 → spin-sweep kick 263 → settle 265

    # ── STAGE 4 — ranged/mobility layer. Energy Beam cast pose = GL thrusting both arms/palms forward
    # (317→318, ring projecting). Reused as the generic construct-summon cast pose in Stage 5. ──
    assemble([317, 318], "gl_beam_uniform.png")           # beam cast — arms come forward → project

    # ── STAGE 5 — 6 fixed-slot CONSTRUCT projectiles (standalone hard-light shapes, launched as projectile
    # sprites from the arms-forward cast pose). Owner Option B: N=Fist/F=Lion/B=Blade/D=Tentacle/U=Spike/air=Sphere. ──
    # WIN pose (Stage 7). No bespoke victory/intro art exists in the sheet (flagged gap) — repurpose the
    # confident fists-up ready stance (264/265) as a held triumphant pose (Deathstroke precedent).
    assemble([264, 265], "gl_win_uniform.png")            # win — fists-up confident stance (repurposed)

    # Single clean frames (projectile sprites — 2-frame picks had slivers/size-jumps that jitter in flight).
    assemble([214], "gl_fist_uniform.png")                # N  — Emerald Fist (solid, wide)
    assemble([331], "gl_lion_uniform.png")                # F  — Lion-Head Ram (solid head)
    assemble([259], "gl_blade_uniform.png")               # B  — Sword/Blade construct (long thin poke)
    assemble([174], "gl_tentacle_uniform.png")            # D  — Binding Tentacle (long coil reach)
    assemble([159], "gl_spike_uniform.png")               # U  — Spike Crown (anti-air burst)
    assemble([258], "gl_sphere_uniform.png")              # air— Wrecking Sphere (round, aerial)
