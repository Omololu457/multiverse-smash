#!/usr/bin/env python3
# Re-slice IRON MAN 1 (Marvel) from the SINGLE danorenovado "JUS" chibi sheet
#   iron_man_jus_sprite_sheet__old__by_danorenovado_ddxdqsr-375w-2x.jpg  (596x1107 RGB, JPEG)
# into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#
# SOURCE FORMAT: a LABELED-BAND sheet (printed text labels left of / between animation groups),
# NOT a uniform grid and NOT numbered rows, on a flat lavender bg (#c7bfe6, no alpha). So slicing is:
#   key the lavender bg -> transparent, then carve each frame by an EXPLICIT xrect within a measured
#   y-band (the labels and the excluded MCU render / stray figure are simply never inside an xrect).
# Per-frame content bbox -> repack centered-X, BOTTOM-aligned into one uniform cell (single anchorY:0
# plants feet across every standing action). Mirrors reslice_deathstroke.py's xrects path + a color
# key like reslice_genos.load_keyed(). Full pixel audit: IRON_MAN_ASSET_MAP.md.
#
# Fully INDEPENDENT character — does NOT touch the other two Iron Man sources in the tree
# (Iron Man.png / GBA Invincible Iron Man = separate IM2/IM3, out of scope).
import numpy as np
from PIL import Image

SRC = "iron_man_jus_sprite_sheet__old__by_danorenovado_ddxdqsr-375w-2x.jpg"
BG = np.array([199, 191, 230])   # measured lavender background (uniform)
KEY_TOL = 45                     # sum-abs distance; sprite reds/golds/navy/cyan all far exceed this
ALPHA = 16

def load_keyed():
    """Sheet RGB -> RGBA with the flat lavender bg keyed to transparent."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    bgmask = np.abs(a - BG).sum(2) <= KEY_TOL
    alpha = np.where(bgmask, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")

def reslice(im, out, band, xrects):
    """band = (y0,y1) measured; xrects = list of (x0,x1) frame columns. Each frame is content-bboxed
    inside the band, then repacked centered-X / bottom-aligned into a uniform cell."""
    W, H = im.size; px = im.load()
    y0, y1 = band
    frames = []
    for rx0, rx1 in xrects:
        miny, maxy = y1 + 1, y0 - 1
        for y in range(y0, y1 + 1):
            for x in range(rx0, rx1 + 1):
                if px[x, y][3] > ALPHA:
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    break
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        strip.paste(cell, (i * uW + (uW - sw) // 2, uH - sh - 1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  heights={[f[3] for f in frames]}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_portrait(strip_src, out, target_h=288, bust_frac=0.62):
    """Bust portrait from an already-resliced strip's frame 0 (head + upper torso)."""
    im = Image.open(strip_src).convert("RGBA"); W, H = im.size; px = im.load()
    colhit = [any(px[x, y][3] > ALPHA for y in range(H)) for x in range(W)]
    x0 = next(x for x in range(W) if colhit[x])
    x1 = next((x for x in range(x0, W) if not colhit[x]), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    crop = im.crop((x0, y0, x1 + 1, y0 + int((y1 - y0 + 1) * bust_frac)))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (bust from {strip_src})")

if __name__ == "__main__":
    im = load_keyed()

    # ── STAGE 1 — movement / state ──
    # Band 0 (y0..68): "Stand" label + 4 idle frames, then "Crouch" label + 2 crouch frames.
    reslice(im, "iron_man_idle_uniform.png",   (0, 68),
            [(46, 91), (96, 137), (144, 183), (200, 234)])          # 4-frame neutral idle loop
    reslice(im, "iron_man_crouch_uniform.png", (0, 68),
            [(312, 351), (360, 399)])                                # 2-frame crouch

    # Band 1 (y78..143): 8-frame walk cycle (last 3 frames touch -> split by measured gaps at 330/371).
    reslice(im, "iron_man_walk_uniform.png", (78, 143),
            [(56, 95), (108, 144), (156, 192), (200, 239),
             (248, 286), (291, 329), (330, 369), (371, 407)])

    # Band 2 (y152..223): "Dash" + 2 lean/streak frames, then "Jump" + 2 boot-thruster frames.
    reslice(im, "iron_man_dash_uniform.png", (152, 223), [(60, 111), (120, 174)])
    reslice(im, "iron_man_jump_uniform.png", (152, 223), [(258, 298), (312, 349)])

    # Band 3 (y246..310): "Intro" + 3 frames (2 helmet-ON hero stance -> 3rd = helmet-OPEN face reveal).
    reslice(im, "iron_man_intro_uniform.png", (246, 310), [(57, 103), (118, 159), (169, 214)])

    # Band 4 (y328..391): "Guard" + 2 repulsor/forearm block frames.
    reslice(im, "iron_man_guard_uniform.png", (328, 391), [(72, 111), (128, 167)])

    # Band 6 (y496..559): "Hurt" + full hit->KO set. Split into flinch / knockdown / getup.
    reslice(im, "iron_man_hurt_uniform.png", (496, 559),
            [(48, 94), (104, 143), (160, 198)])                      # standing flinch x3
    reslice(im, "iron_man_knockdown_uniform.png", (496, 559),
            [(216, 274), (288, 318), (329, 382), (396, 439)])        # fall -> tumble -> roll -> down
    reslice(im, "iron_man_getup_uniform.png", (496, 559),
            [(448, 511), (520, 579)])                                # lie -> prop-up (begin rise)

    # Portrait — bust from idle frame 0 (Stage 6 may swap to the helmet-open "Super" bust).
    make_portrait("iron_man_idle_uniform.png", "iron_man_portrait.png")

    # Reuse (declared in characters.js, no dedicated art): run = walk, fall = jump.

    # ── STAGE 2 — normals (from the two Melee bands; real slicing pass done — IRON_MAN_ASSET_MAP.md). ──
    # Melee row 1 (band 7, y584..647) frames: 0=lunge-in 1=guard-up 2=jab-windup 3=jab-ext 4=punch 5=cock
    #   6=red-repulsor-burst 7=recoil 8=yellow-gauntlet-flare 9=recover. Row 2 (band 8, y656..719): 0=dash-
    #   lunge-punch 1=uppercut-windup 2=uppercut-rise(arc) 3=uppercut-apex 4=low-repulsor-thrust 5=recover.
    # light = quick jab (row1 windup -> extension)
    reslice(im, "iron_man_light_uniform.png", (584, 647), [(176, 207), (224, 267)])
    # heavy = committed straight repulsor punch (row1 cock -> RED repulsor burst; long reach, disjoint)
    reslice(im, "iron_man_heavy_uniform.png", (584, 647), [(320, 365), (373, 407)])
    # up (LAUNCHER) = rising uppercut w/ motion arc (row2 windup -> rise -> apex)
    reslice(im, "iron_man_up_uniform.png", (656, 719), [(126, 159), (170, 207), (216, 247)])
    # air = flying straight punch (row1 punch frames; NO dedicated aerial art on this sheet -> FLAG repurposed)
    reslice(im, "iron_man_air_uniform.png", (584, 647), [(272, 311), (320, 365)])
    # crouchLight = low forward repulsor thrust (row2 f4). Auto-swapped by combat.js _setCrouchVariant when a
    # light is thrown while crouching (opt-in via THIS key; movement.crouchIdle already set). Single held pose.
    reslice(im, "iron_man_crouchthrust_uniform.png", (656, 719), [(256, 315)])
    # NOTE: down_air REUSES the air sheet (no dedicated down-aerial art) — HONEST REUSE, flagged in characters.js.

    # ── STAGE 3 — command chain (Fwd+Heavy 3-stage rekka; mirrors updatePiccoloCommandCombat). ──
    # rush1 = forward dash-lunge PUNCH opener (row2 f0 — the gap-closer)
    reslice(im, "iron_man_rush1_uniform.png", (656, 719), [(67, 116)])
    # rush2 = committed straight repulsor PUNCH (row1 cock -> RED repulsor burst) — mid hit
    reslice(im, "iron_man_rush2_uniform.png", (584, 647), [(320, 365), (373, 407)])
    # rush3 = yellow-gauntlet repulsor FLARE (row1 recoil -> raised-gauntlet blast) — LAUNCHER finisher
    reslice(im, "iron_man_rush3_uniform.png", (584, 647), [(424, 463), (472, 513)])

    # ── STAGE 4 — specials. ──
    # Charge→Blast: ONE 6-frame cast sheet = Charge windup (band5 f2,f3: fists clenched, arc-reactor gather)
    #   → Blast release (band5 f8-11: palm repulsor extends → cyan beam → deep-lunge full beam → recover).
    #   The cyan repulsor BOLT is a procedural projectile (abilities.js), spawned at the release frame.
    reslice(im, "iron_man_blast_uniform.png", (408, 471),
            [(81, 111), (128, 171), (240, 287), (296, 351), (360, 427), (442, 479)])
    # Spider-leg strike (SELF-CONTAINED SUIT special, Stage-0 item 2): the LARGE Iron-Spider frames (band 10b):
    #   crouch (no legs) → 4 golden legs whip out (arcs) → jagged full-splay strike. Legs extend ABOVE the head
    #   → band top raised to 808 for leg-tip headroom. The "Super" pose (band10b far-right) is RESERVED (Stage 5/6).
    reslice(im, "iron_man_spiderlegs_uniform.png", (808, 936), [(80, 167), (176, 287), (302, 428)])

    # ── STAGE 5 — ULTIMATE cast pose. The single helmet-open "Super" pose (band 10b, x512..591): Tony's face
    # shown, arms crossed, multi-color chest glow. Stage-0 item 4 resolved it as the ult TRIGGER / portrait
    # (NOT a windup, NOT a full animation) — the Proton Cannon payoff = a scaled repulsor blast (procedural). ──
    reslice(im, "iron_man_super_uniform.png", (808, 936), [(512, 591)])

    # ── STAGE 6 — portrait stays the clean Stage-1 idle bust (iconic HELMETED Iron Man). A Super-pose (helmet-
    # open, Tony's face) portrait was TRIED but make_portrait truncates on the arms-crossed pose's internal
    # transparent gap → a narrow strip; the helmeted idle bust is the stronger game portrait. A manual face-crop
    # Super portrait is DEFERRED polish. win pose = REUSE the Super pose (confident helmet-open hero stance — no
    # bespoke victory art on the sheet, FLAGGED); lose = REUSE knockdown (both declared in characters.js).
