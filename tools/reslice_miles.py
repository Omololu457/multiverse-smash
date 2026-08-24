#!/usr/bin/env python3
# Re-slice MILES MORALES (Marvel / Spider-Man) from the SINGLE xxalexsmashxx "JUS" sprite sheet
#   miles_morales___jus_sprite_sheet___credits_desc_by_xxalexsmashxx_dfsvf9b-fullview.jpg
#   (1280x1974 RGB, JPEG) into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#
# SOURCE FORMAT: a LABELED-BAND sheet (mauve text labels ABOVE each animation row) on a flat
# royal-blue bg (#425EFF ≈ 66,94,255) with a white outer margin. NOT a uniform grid. So slicing
# mirrors reslice_iron_man.py: key bg -> transparent, carve each frame by an explicit xrect within
# a measured y-band, content-bbox it, repack centered-X / BOTTOM-aligned into one uniform cell
# (single anchorY:0 plants feet across every standing action).
#
# ★ LOSSY JPG: the blue bg has compression fringing, so the key is TOLERANCE-based (sum-abs) and we
#   also key the white margin + the mauve label boxes. Miles' RED suit accents have low blue, so they
#   never collide with the blue/mauve keys.
#
# ★ FACING: this rip is drawn facing RIGHT (the Y web-shot + X beam both travel to the right, i.e.
#   forward = right). The engine draws P1 UN-flipped expecting right-facing, so NO horizontal flip
#   is applied (same as reslice_iron_man.py). FLIP_H = False.
#
# STAGE 1 = movement / state + portrait. Later stages append picks below. Full pixel audit &
# Stage-0 resolutions: MILES_MORALES_ASSET_MAP.md.
import numpy as np
from PIL import Image

SRC = "miles_morales___jus_sprite_sheet___credits_desc_by_xxalexsmashxx_dfsvf9b-fullview.jpg"
BLUE = np.array([66, 94, 255])   # measured royal-blue background
KEY_TOL = 70                     # sum-abs distance for the (lossy-JPG) blue key
ALPHA = 16
FLIP_H = False

def load_keyed():
    """Sheet RGB -> RGBA with blue bg + white margin + mauve label boxes keyed transparent."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    blue  = np.abs(a - BLUE).sum(2) <= KEY_TOL
    white = (r > 228) & (g > 228) & (b > 228)
    mauve = (r > 100) & (r < 170) & (g > 25) & (g < 100) & (b > 90) & (b < 155) & (b > g + 20)
    # ★ JPG anti-alias HALO: the fringe between blue bg and the black/red suit is a blue-dominant
    #   blend (e.g. ~40,55,150) that the exact-blue key misses. Key any strongly blue-dominant pixel.
    #   Safe: Miles' suit is black + dark-red (low blue) and the eyes are white (not blue-dominant).
    fringe = (b > r + 25) & (b > g + 25) & (b > 100)
    bgmask = blue | white | mauve | fringe
    alpha = np.where(bgmask, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")

def load_keyed_fx():
    """FX variant of the key: BLUE + halo ONLY (keep white + yellow). The venom ring-burst FX is bright
    yellow with WHITE highlights — the white key in load_keyed() would punch holes in it, so the ring is
    sliced from this image instead. No white margin / mauve labels sit near the mid-sheet ring region."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    blue   = np.abs(a - BLUE).sum(2) <= KEY_TOL
    fringe = (b > r + 25) & (b > g + 25) & (b > 100)
    alpha  = np.where(blue | fringe, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")

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
        if maxy < miny:   # fully-transparent frame (e.g. the vanished tail of the stealth fade) — keep the slot
            miny, maxy = y1 - 1, y1
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

def make_portrait(strip_src, out, target_h=288, bust_frac=0.58):
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
    # STANCE (idle) = 3-frame subtle breathing sway (frames 2&3 touch on the sheet -> split at the seam).
    reslice(im, "miles_idle_uniform.png", (98, 136),
            [(7, 29), (31, 52), (53, 76)])
    # RUN = genuine 6-frame alternating-leg cycle. Miles has NO separate walk on the sheet -> walk
    #   BORROWS this cycle in characters.js (JUS pattern, cf. Iron Man run=walk).
    reslice(im, "miles_run_uniform.png", (170, 202),
            [(5, 32), (41, 69), (85, 104), (123, 149), (167, 194), (213, 233)])
    # JUMP = ascent half of the 7-frame arc (crouch -> launch -> rise -> apex).
    reslice(im, "miles_jump_uniform.png", (236, 281),
            [(8, 27), (33, 52), (57, 80), (83, 112)])
    # FALL = descent half of the same arc (fall -> pre-land -> land).
    reslice(im, "miles_fall_uniform.png", (236, 281),
            [(119, 147), (152, 171), (183, 202)])
    # GUARD = single held block/brace pose (all the sheet provides; MILES_MORALES_ASSET_MAP.md item 3).
    reslice(im, "miles_guard_uniform.png", (318, 348), [(9, 31)])
    # HURT / FALL / GET UP = one long 12-frame row -> split flinch / knockdown / getup.
    reslice(im, "miles_hurt_uniform.png", (1779, 1817),
            [(11, 30), (41, 59)])                                              # standing flinch x2
    reslice(im, "miles_knockdown_uniform.png", (1779, 1817),
            [(75, 111), (129, 166), (189, 226), (249, 286), (317, 355), (367, 402)])  # fall -> prone
    reslice(im, "miles_getup_uniform.png", (1779, 1817),
            [(411, 429), (438, 464), (477, 503), (521, 543)])                 # rise -> stand
    # INTRO = 5-frame landing-into-stance entrance (deferred final-wire to Stage 6; emitted now, renders clean).
    reslice(im, "miles_intro_uniform.png", (28, 68),
            [(4, 41), (44, 73), (80, 107), (111, 133), (138, 156)])
    # Portrait — bust from idle frame 0 (Stage 6 may swap to the large top-right hero render).
    make_portrait("miles_idle_uniform.png", "miles_portrait.png")

    # Reuse (declared in characters.js, no dedicated art): walk = run, dash = run.

    # ── STAGE 2 — NORMALS (render by move name; basic_attacks hit data in characters.js; all dmg ×0.60
    #    GLOBAL_DAMAGE_SCALE). The 4 button-mapped normals on the sheet map 1:1 (MILES_MORALES_ASSET_MAP.md):
    #    B = light straight punch, Forward+B = heavy committed forward punch (red impact), Up+B = rising
    #    anti-air LAUNCHER (red crescent arc), Aerial B = air slash (big RED CRESCENT arc). down_air REUSES
    #    the air slash (no dedicated down-aerial art on the sheet — honest reuse, flagged). No crouch normal
    #    exists → no crouchLight. Every pick has a visibly extended limb reaching RIGHT (Gohan facing lesson);
    #    strips keep all frames (windup→strike) so the swing reads. ──
    reslice(im, "miles_light_uniform.png", (466, 504),
            [(9, 32), (48, 69), (85, 120), (133, 168)])          # B — straight punch (windup → cock → extend right)
    reslice(im, "miles_heavy_uniform.png", (543, 581),
            [(12, 31), (43, 66), (75, 105), (109, 132)])         # Forward+B — committed forward punch w/ red impact
    reslice(im, "miles_up_uniform.png", (615, 661),
            [(10, 35), (42, 68), (77, 102)])                     # Up+B — rising anti-air LAUNCHER w/ red crescent arc
    reslice(im, "miles_air_uniform.png", (780, 825),
            [(10, 28), (45, 81), (98, 116)])                     # Aerial B — air slash w/ big RED CRESCENT arc

    # ── STAGE 4 — SPECIALS (fixed-slot venom rushdown/zoner; abilities.js executeMilesSpecial + the Charge
    #    dash-kick). Cast POSES are real reslice frames; the web/beam projectiles + the ring-burst are drawn
    #    procedurally / from the sliced ring FX. Owner-locked mapping (Stage-0 items 5,8): Special(L) N=Web-shot
    #    (Y) / F=Venom Strike (Fwd+Y) / U=Rising Venom-Arc (Up+Y) / D=Camouflage-Stealth (Down+Y) / air=Aerial
    #    Dive (Air+Y) / B=X Venom-Beam (the standalone X). Charge(O)=Down+B dash-kick (offensive gap-closer). ──
    reslice(im, "miles_web_uniform.png",        (860, 896),
            [(12, 53), (61, 101), (109, 150)])                   # Web-shot cast (Y) — neutral → windup → throw (web line is procedural)
    reslice(im, "miles_venomstrike_uniform.png", (948, 988),
            [(68, 103), (107, 175), (185, 207)])                 # Venom Strike cast (Fwd) — charge → yellow venom punch
    reslice(im, "miles_venomarc_uniform.png",   (1047, 1097),
            [(12, 35), (44, 68), (75, 101), (107, 130)])         # Rising Venom-Arc cast (Up) — rising yellow crescent (anti-air)
    reslice(im, "miles_stealth_uniform.png",    (1155, 1182),
            [(16, 37), (40, 61), (64, 86), (90, 109), (118, 131), (142, 153)])  # Camouflage (Down) — fade-to-transparent
    reslice(im, "miles_dive_uniform.png",       (1233, 1264),
            [(12, 40), (56, 89), (109, 142), (157, 197)])        # Aerial Dive cast (air) — diving pose w/ speed trail
    reslice(im, "miles_venombeam_uniform.png",  (1307, 1347),
            [(197, 232), (236, 305), (313, 336)])                # X Venom-Beam cast (Back) — two-handed charge → thrust
    reslice(im, "miles_dashkick_uniform.png",   (703, 737),
            [(9, 35), (44, 70), (80, 119), (121, 150), (156, 182)])  # Down+B dash-kick (Charge O) — crouch → wing-streak → flying kick → run

    # Venom ring-burst FX (yellow/white expanding rings from the Forward+Y burst) — BLUE-ONLY key (keep white).
    imfx = load_keyed_fx()
    reslice(imfx, "miles_venomring_uniform.png", (946, 992),
            [(223, 258), (268, 305), (313, 330), (334, 350)])    # 4-stage expanding venom ring (small → bright → fade)

    # ── STAGE 5 — ULTIMATE "Venom Overload" (abilities.js executeMilesUltimate; INLINE freeze-cinematic).
    #    Owner-locked palette = BLACK/RED (Miles' own colours; the red/blue "Classic Spider-Man" duplicate is
    #    earmarked as a future alt-skin, NOT the gameplay ult). Cast = a play-ONCE 6-frame sequence from the
    #    X+Up combo row 2: stance → RED crescent → dash → YELLOW venom crescent → venom fist glow → burst.
    #    The "Ultimate Action" 2-frame tell (Stage-0 item 2) is the meter-full ready pose; the payoff = giant
    #    venom ring-bursts (miles_venomring) manifested at the foe. Yellow venom FX survives the normal key. ──
    reslice(im, "miles_ult_uniform.png", (1445, 1496),
            [(13, 35), (252, 277), (356, 381), (388, 418), (426, 450), (458, 483)])

    # ── STAGE 6 — WIN / LOSE (both SINGLE-frame on the sheet, MILES_MORALES_ASSET_MAP.md item 3 — real, not
    #    padded). WIN = Miles UNMASKED (Afro visible), confident standing pose. LOSE = prone/KO. ──
    reslice(im, "miles_win_uniform.png",  (1853, 1896), [(10, 32)])   # unmasked confident stance
    reslice(im, "miles_lose_uniform.png", (1930, 1952), [(12, 46)])   # prone / KO
