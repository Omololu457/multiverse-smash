#!/usr/bin/env python3
# Re-slice IPPO MAKUNOUCHI (Hajime no Ippo boxer) from the SINGLE srchimuelo "JUS" sprite sheet
#   ippo_makunouchi_jus_sprite_sheet_by_srchimuelo_dfv5jdo.png
#   (1920x2062 RGBA) into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#
# SOURCE FORMAT: a LABELED-BAND sheet (dark text labels ABOVE each animation row) on a flat GREEN
# field (#008000 = 0,128,0), NO per-cell grid — identical structure to reslice_miles.py. So slicing
# mirrors Miles: key green bg -> transparent, carve each frame by an explicit xrect within a measured
# y-band, content-bbox it vertically, repack centered-X / BOTTOM-aligned into one uniform cell
# (single anchorY:0 plants feet across every standing action).
#
# ★ GREEN KEY is safe (no green-skin hazard): Ippo's palette is red gloves/trunk-stripe, white trunks,
#   black hair, skin, grey/white boots — none green. Key any GREEN-DOMINANT pixel (bg + anti-alias
#   fringe); red gloves (r>g), skin (r>g), black hair (all low), white trunks (all high) never collide.
#
# ★ FACING: this rip is drawn facing RIGHT (verified by pixel zoom — the jab extends right, nose points
#   right; /tmp/ippo/face_jab.png). The engine draws P1 UN-flipped expecting right-facing → NO
#   horizontal flip (same as reslice_miles.py / reslice_iron_man.py). FLIP_H = False.
#
# STAGE 1 = movement / state + portrait. Later stages append picks below. Full pixel audit &
# Stage-0 resolutions: IPPO_ASSET_MAP.md.
import numpy as np
from PIL import Image

SRC = "ippo_makunouchi_jus_sprite_sheet_by_srchimuelo_dfv5jdo.png"
ALPHA = 16
FLIP_H = False   # sheet faces RIGHT already

def load_keyed():
    """Sheet -> RGBA with the green field (bg + fringe) keyed transparent."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    # GREEN-DOMINANT: catches pure (0,128,0) bg AND the darker green anti-alias fringe.
    green = (g > r + 30) & (g > b + 30) & (g > 60)
    alpha = np.where(green, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA").copy()  # .copy() → writable (for clear_rect)

def clear_rect(im, x0, y0, x1, y1):
    """Erase a sheet rect to transparent BEFORE slicing — used to strip on-sheet TEXT LABELS that
    sit inside a sprite band (Ippo's labels hug their rows; the 'Jump - Fall' label overlaps the
    x-range of the low ascent frames). Only ever covers label/decoration pixels, never sprite art
    (verified by pixel audit — see IPPO_ASSET_MAP.md Stage 1)."""
    px = im.load()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px[x, y] = (0, 0, 0, 0)

def reslice(im, out, band, xrects):
    """band = (y0,y1) measured; xrects = list of (x0,x1) frame columns. Each frame is content-bboxed
    (vertically inside the band) then repacked centered-X / bottom-aligned into a uniform cell."""
    px = im.load()
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
        if FLIP_H:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        strip.paste(cell, (i * uW + (uW - sw) // 2, uH - sh - 1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  heights={[f[3] for f in frames]}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_portrait(strip_src, out, target_h=288, bust_frac=0.60):
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

    # ── STAGE 1 — MOVEMENT / STATE (feet-aligned *_uniform.png; anchorY 0 plants feet). ──
    # IDLE (Stance) = 4-frame boxer's guard-up breathing loop.
    reslice(im, "ippo_idle_uniform.png", (25, 80),
            [(5, 37), (43, 73), (82, 108), (114, 144)])
    # WALK (Movement) = 4-frame real alternating-leg boxing shuffle. Ippo has NO separate run/dash on
    #   the sheet → run + dash BORROW this walk cycle in characters.js (JUS pattern, cf. Miles run=walk).
    reslice(im, "ippo_walk_uniform.png", (100, 155),
            [(8, 34), (47, 77), (88, 121), (134, 171)])
    # JUMP/FALL live in ONE arc row (y163-300). The "Jump - Fall" TEXT LABEL sits at y~168-190 over
    #   x0-90, overlapping the x-range of the low ascent frames → strip it first (label-only pixels;
    #   the apex frames are at x≥117 and the crouch heads at y≥199, both clear of this rect).
    clear_rect(im, 0, 166, 92, 191)
    # JUMP = ascent half of the arc (crouch → launch → rise → apex). Band spans the whole arc; each
    #   frame is content-bboxed + bottom-aligned independently, so per-frame arc height is preserved.
    reslice(im, "ippo_jump_uniform.png", (163, 251),
            [(7, 41), (44, 72), (79, 101), (117, 139)])
    # FALL = descent half of the same arc (apex → fall → pre-land → land) — REAL descent art, not a jump reuse.
    reslice(im, "ippo_fall_uniform.png", (163, 251),
            [(150, 174), (186, 210), (218, 244), (250, 282)])
    # GUARD = 2-frame tighter defensive block, gloves raised HIGHER than idle (a real distinct pose).
    reslice(im, "ippo_guard_uniform.png", (285, 336),
            [(5, 37), (42, 78)])
    # DODGE / PARRY = 4-frame weaving "peekaboo" bob. Feet bottom out at y~436; a white bracket-line
    #   (y439) and the "Failed" label (y444-454) sit just below and must NOT be captured → band ends 437.
    #   (The weave-motion ref photo sits beyond x166, also excluded.)
    reslice(im, "ippo_dodge_uniform.png", (386, 437),
            [(8, 41), (43, 86), (90, 132), (133, 165)])
    # FAILED = 4-frame off-balance stumble — the whiffed consequence of Dodge/Parry, GENUINELY distinct
    #   from Walk (Stage-0 item 3). Wired as its own state (not collapsed into walk).
    reslice(im, "ippo_failed_uniform.png", (464, 516),
            [(4, 36), (42, 72), (81, 107), (113, 143)])
    # HURT / FALL / GET UP = one on-sheet chain (label "Hurt, Fall and Get Up", y1702-1762). Sliced now
    #   for playability (no fallback boxes); the win/lose + final KO-chain polish are Stage 6.
    reslice(im, "ippo_hurt_uniform.png", (1702, 1762),
            [(8, 43), (49, 73)])                                    # standing flinch x2
    reslice(im, "ippo_knockdown_uniform.png", (1702, 1762),
            [(81, 143), (153, 193), (205, 255), (273, 328)])        # stumble → tumble → lying prone
    reslice(im, "ippo_getup_uniform.png", (1702, 1762),
            [(345, 389), (393, 435), (441, 467), (473, 505)])       # rise → recover to stance
    # Portrait — bust from idle frame 0 (Stage 6 may swap to the angry-shout face bust top-right).
    make_portrait("ippo_idle_uniform.png", "ippo_portrait.png")

    # Reuse (declared in characters.js, no dedicated art): run = walk, dash = walk, crouch = guard.

    # ── STAGE 2 — NORMALS (RE-SLICED feet-aligned; basic_attacks hit data in characters.js; all dmg
    #    ×0.60 GLOBAL_DAMAGE_SCALE). The sheet's 5 button-normals map 1:1 (IPPO_ASSET_MAP.md): B=light
    #    straight jab, Forward+B=heavy lunging step-in punch (red hook arc), Up+B=rising uppercut
    #    LAUNCHER, Aerial B=airborne punch, Down+B=low crouching body-blow → crouchLight. down_air
    #    REUSES the aerial punch (no dedicated down-aerial art — honest reuse, flagged). Frames chosen
    #    by HEAD-cluster detection (figures physically touch in these dense rows); windup→strike kept so
    #    the swing reads. Ippo does NOT flip (FLIP_H=False) → every strike reaches RIGHT by construction. ──
    reslice(im, "ippo_light_uniform.png", (547, 599),
            [(4, 36), (43, 86), (91, 134), (143, 175)])          # B — straight jab (guard → extend right → retract)
    reslice(im, "ippo_heavy_uniform.png", (634, 686),
            [(4, 40), (43, 74), (77, 135), (138, 180)])          # Forward+B — lunging hook: guard → wind → RED ARC → follow
    reslice(im, "ippo_up_uniform.png", (715, 768),
            [(3, 35), (38, 80), (83, 125), (132, 164)])          # Up+B — rising uppercut LAUNCHER (red up-streak)
    reslice(im, "ippo_air_uniform.png", (885, 940),
            [(8, 31), (43, 74), (90, 118), (129, 152)])          # Aerial B — airborne punch (red down-arc); down_air reuses this
    reslice(im, "ippo_crouchlight_uniform.png", (802, 853),
            [(46, 86), (87, 130), (131, 178)])                   # Down+B — low crouching body-blow (wind → red-arc-low → extend)

    # ── STAGE 3 — COMMAND CHAIN "Y-Jabs" (Fwd+Heavy 2-stage rekka; IPPO_CMD in abilities.js). The
    #    on-sheet "Y - Jabs" row (y964-1024) is TWO segments split by a "/" marker: segment 1 = a rapid
    #    LIGHT jab flurry (red jab-trails), segment 2 = a committed STRAIGHT-punch flurry (big forward
    #    thrust). → jab1 = seg1 opener, jab2 = seg2 finisher. Band ends 1024 (feet ~1023; excludes the
    #    white segment-bracket line at y1031). All reach RIGHT (FLIP_H=False). ──
    reslice(im, "ippo_jab1_uniform.png", (964, 1024),
            [(48, 128), (135, 215), (218, 300)])                 # segment 1 — rapid jab flurry (red trails)
    reslice(im, "ippo_jab2_uniform.png", (964, 1024),
            [(515, 605), (605, 695), (700, 792)])                # segment 2 — committed straight-punch flurry

    # ── STAGE 4 — SPECIALS (heavier Y-button variants; executeIppoSpecial in abilities.js). Fixed-slot
    #    MELEE kit (Ippo is a boxer — NO projectile/ranged art, IPPO_ASSET_MAP.md item 2): N=Gazelle Punch
    #    (signature leaping counter) / F=spinning hook (white/red swirl) / U=heavy uppercut (wide blue arc,
    #    LAUNCHER) / D=heavy body-blow / air=aerial hook (swirl). Strike-pose frames (like Piccolo's casts);
    #    ref photos + the "/" Gazelle-segment marker are excluded by the xrects. All reach RIGHT. ──
    reslice(im, "ippo_hook_uniform.png", (1064, 1120),
            [(90, 155), (158, 218)])                              # Forward+Y — spinning hook punch (large white/red swirl)
    reslice(im, "ippo_upper_uniform.png", (1131, 1216),
            [(100, 168), (170, 220)])                             # Up+Y — heavy rising uppercut (wide blue circular arc) LAUNCHER
    reslice(im, "ippo_body_uniform.png", (1233, 1318),
            [(90, 150), (150, 215)])                              # Down+Y — heavy body-blow (curved swing trail)
    reslice(im, "ippo_airhook_uniform.png", (1342, 1400),
            [(52, 110), (112, 168)])                              # Aerial Y — aerial hook punch (swirl trail)
    reslice(im, "ippo_gazelle_uniform.png", (1454, 1523),
            [(115, 175), (168, 235), (515, 585), (590, 665)])     # Gazelle Punch — leaping windup (blue arc) → rising counter-strike (2 segments)

    # ── STAGE 5 — ULTIMATE "Dempsey Roll" (freeze-cinematic; executeIppoUltimate in abilities.js). The
    #    on-sheet "Ultimate - Dempsey Roll" row (y1594-1650) is TWO segments split by an ARROW (→) marker:
    #    segment 1 = rapid side-to-side WEAVING bob → segment 2 = continuous FLURRY of alternating hooks
    #    (red motion-arcs). Weave-first-then-barrage, exactly the canon technique. The label sits at y1555-
    #    1565 (excluded) and a white bracket at y1654 (excluded by band end 1650). ──
    reslice(im, "ippo_dempsey_weave_uniform.png", (1594, 1650),
            [(19, 58), (60, 103), (106, 148), (150, 190)])        # segment 1 — side-to-side weaving bob (4f)
    reslice(im, "ippo_dempsey_flurry_uniform.png", (1590, 1650),
            [(275, 320), (325, 417), (432, 478), (483, 525)])     # segment 2 — flurry of alternating red-arc hooks (4f)

    # ── STAGE 6 — WIN / LOSE (portrait/hurt/knockdown/getup already emitted above). ──
    # WIN = 4-frame victory pose, ending gloves-raised OVERHEAD.
    reslice(im, "ippo_win_uniform.png", (1798, 1856),
            [(10, 42), (49, 73), (81, 116), (120, 155)])
    # LOSE = the on-sheet defeat sequence: dejected slumping stance (5f) → collapse (1f) → lying flat (1f).
    reslice(im, "ippo_lose_uniform.png", (1896, 1955),
            [(11, 43), (48, 74), (78, 110), (114, 150), (154, 190), (195, 226), (232, 287)])
    # LOW-HEALTH STAGGER = the on-sheet "(Heart Stopped)" frames (label y1958-1971, sprites y1982-2033),
    #   REPURPOSED as a wounded low-HP idle. NOT pixel-identical to idle (the Stage-0 "identical" read was
    #   an over-read: mean pixel-diff 31-60, different frame widths) — same guard-up POSE FAMILY but a
    #   lower/hunched/wearier stance. Swapped in for `idle` below 30% HP by game.js's generic _lowHealthIdle
    #   threshold (sprite.js `idleLow`); purely cosmetic, NOT tied to any hit/move. Frames touch → head-midpoint splits.
    reslice(im, "ippo_idlelow_uniform.png", (1982, 2033),
            [(7, 43), (45, 78), (80, 112), (114, 148)])
