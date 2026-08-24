#!/usr/bin/env python3
# Re-slice IRON MAN 3 (Marvel) from the SINGLE GBA rip
#   Game Boy Advance - The Invincible Iron Man - Playable Characters - Iron Man.png
#   (1396x2471 RGB, flat blue bg [77,109,243], ripper "Mr. L" / TSR) into CLEAN,
#   feet-aligned uniform cells.
#
# SOURCE FORMAT: flat blue-bg sheet, densely self-labeled (black on-sheet text tags:
# "Idle", "Running", "Charged Shot", "Super Nova (Kills all onscreen Enemies)", "Dead",
# etc.), a credit box (Mr. L / TSR / Credit?No), an Extra-Life icon, End-of-Level flags,
# and bottom comic box-art renders (incl. a black-boxed helmet bust). NONE of the labels/
# UI/box-art is sprite art, so we KEY the blue bg to transparent, then carve each animation
# by EXPLICIT xrects within a measured y-band (labels/UI simply never fall inside an xrect).
# Per-frame content bbox -> repack centered-X, BOTTOM-aligned into one uniform cell
# (single anchorY:0 plants feet across every standing action).
#
# FULLY INDEPENDENT character (iron_man_3) — SEPARATE from iron_man (IM1, JUS chibi) and
# iron_man_2 (Data East 1991). Borrows no art from them; nothing here patches them.
# Full visual pixel audit + owner-locked Stage-0 decisions: IRON_MAN_3_ASSET_MAP.md.
import numpy as np
from PIL import Image

SRC = "Game Boy Advance - The Invincible Iron Man - Playable Characters - Iron Man.png"
BG = np.array([77, 109, 243])    # measured flat blue background
KEY_TOL = 60                     # sum-abs distance; the suit reds/golds all far exceed this
ALPHA = 16

def load_keyed():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    bgmask = np.abs(a - BG).sum(2) <= KEY_TOL
    alpha = np.where(bgmask, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")

def reslice(im, out, band, xrects):
    """band=(y0,y1); xrects=list of (x0,x1). Each frame is content-bboxed vertically inside
    the band, then repacked centered-X / bottom-aligned into a uniform cell."""
    y0, y1 = band; px = im.load()
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

def carve_keyed(out, box, key, tol=70, target_h=None, pad=2):
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    x0, y0, x1, y1 = box
    sub = a[y0:y1, x0:x1]
    mask = np.abs(sub - np.array(key)).sum(2) <= tol
    alpha = np.where(mask, 0, 255).astype("uint8")
    im = Image.fromarray(np.dstack([sub.astype("uint8"), alpha]), "RGBA")
    ys, xs = np.where(alpha > 16)
    if len(xs): im = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    if target_h:
        s = target_h / im.height
        im = im.resize((max(1, round(im.width * s)), target_h), Image.NEAREST)
    canvas = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad), im)
    canvas.save(out)
    print(f"OK {out}: {canvas.size}")

if __name__ == "__main__":
    im = load_keyed()

    # ── STAGE 1 — movement / state (boxes from the visual pass — IRON_MAN_3_ASSET_MAP.md) ──
    # IDLE — primary 6-frame loop (top row). The 7th sprite merges the "Idle" text label -> excluded.
    reslice(im, "iron_man_3_idle_uniform.png", (0, 44),
            [(1, 31), (36, 66), (71, 103), (108, 139), (145, 176), (181, 211)])
    # RUNNING — 8-frame leaning-forward stride (row 3). No separate Walk (source structure) — walk/run/dash
    # all reference this sheet in characters.js. Narrow legs-crossed frames merged into their neighbours.
    reslice(im, "iron_man_3_run_uniform.png", (100, 138),
            [(1, 30), (36, 63), (68, 94), (99, 142), (147, 177), (182, 211), (216, 242), (247, 295)])
    # CROUCH — "Crouching / Looking Down" low pose (2f hold).
    reslice(im, "iron_man_3_crouch_uniform.png", (228, 259),
            [(1, 28), (33, 60)])
    # JUMP — full rise/apex/fall arc (9f). fall REUSES this sheet — FLAG.
    reslice(im, "iron_man_3_jump_uniform.png", (296, 345),
            [(1, 33), (38, 65), (70, 102), (107, 139), (144, 176), (181, 213), (218, 245), (250, 277), (282, 308)])
    # HURT — standing recoil (3f).
    reslice(im, "iron_man_3_hurt_uniform.png", (1937, 1975),
            [(1, 31), (36, 65), (70, 102)])
    # DEAD -> knockdown/getup. Per ripper note "first four sprites loop as Iron Man rolls": upright collapse
    # -> flat roll. Used FORWARD for knockdown (a fall), REVERSED for getup (a rise).
    # ★ band top-capped at 2123: the Extra-Life 1-up icons sit at y2127-2143 (same x) — excluded.
    reslice(im, "iron_man_3_knockdown_uniform.png", (2095, 2123),
            [(1, 29), (34, 62), (67, 95), (100, 135), (140, 180), (184, 225), (229, 269)])
    reslice(im, "iron_man_3_getup_uniform.png", (2095, 2123),
            [(229, 269), (184, 225), (140, 180), (100, 135), (67, 95), (34, 62), (1, 29)])
    # INTRO — "Start of Level" rise-to-stance pose sequence (11f, play-once). (DECISION A: include.)
    reslice(im, "iron_man_3_intro_uniform.png", (1828, 1865),
            [(1, 33), (38, 69), (74, 101), (106, 133), (138, 167), (172, 203), (208, 235), (240, 267), (272, 301), (306, 337), (342, 374)])
    # WIN — "End of Level" triumphant flourish -> fists-up finish (last 4f). (DECISION A: include.)
    reslice(im, "iron_man_3_win_uniform.png", (1888, 1928),
            [(674, 703), (708, 739), (744, 775), (780, 810)])

    # ── STAGE 2 — NORMALS. All 5 explicitly-labeled Shooting-context poses preserved INDIVIDUALLY (Stage-0
    # item: do not collapse), each mapped to a distinct normal slot; `up` uses the separate "Looking Up" aim
    # pose (a real upward-aim, its own art — not a shooting context, so no collapse). These are the arm-
    # extended repulsor POSES with short point-blank hitboxes (×0.60); the TRAVELING repulsor projectiles are
    # the Stage-4 charge system (Basic/Charged/Supercharged), not built here. ──
    # LIGHT — "Shooting" (standing): quick arm-extended repulsor (2f).
    reslice(im, "iron_man_3_light_uniform.png", (426, 463),
            [(1, 42), (47, 86)])
    # HEAVY — "Shooting (Running)": committed ADVANCING repulsor (moving-forward firing stride, longer reach, 3f).
    reslice(im, "iron_man_3_heavy_uniform.png", (470, 506),
            [(118, 144), (149, 178), (183, 218)])
    # UP — "Looking Up" aim pose: upward-angled repulsor LAUNCHER / anti-air (1f, own art).
    reslice(im, "iron_man_3_up_uniform.png", (183, 225),
            [(1, 31)])
    # AIR — "Shooting (Jumping)": aerial repulsor (2f).
    reslice(im, "iron_man_3_air_uniform.png", (543, 589),
            [(86, 126), (176, 214)])
    # DOWN_AIR — "Shooting (Double Jump)": downward-angled aerial repulsor (2f, from the CLEAN right-side row;
    # the left of this band is the Charging-Shot FX composite — excluded by x-range).
    reslice(im, "iron_man_3_down_air_uniform.png", (600, 662),
            [(572, 610), (615, 653)])
    # CROUCHLIGHT — "Shooting (Crouching)": low repulsor from a crouch (1f; the (44,101) blob is the label).
    reslice(im, "iron_man_3_crouchlight_uniform.png", (509, 538),
            [(1, 39)])

    # ── STAGE 4 — 3-TIER CHARGE SYSTEM (Basic → Charged → Supercharged, confirmed on-sheet) + Super Move
    # (standing/midair) + Super Laser (DECISION B: separate specials). REAL projectile art per tier. ──
    # BASIC SHOT (T1) — small energy-bolt: launch + compact travel frames. (★avoid the on-sheet RED divider
    # bars at x~178+ that separate travel/impact sub-sequences.)
    reslice(im, "iron_man_3_basic_shot_uniform.png", (704, 738),
            [(1, 35), (40, 74)])
    # CHARGED SHOT (T2) — larger cyan-white burst (travel frames).
    reslice(im, "iron_man_3_charged_shot_uniform.png", (794, 838),
            [(79, 128), (133, 182), (187, 238)])
    # SUPERCHARGED SHOT (T3) — brightest yellow-white burst (travel frames).
    reslice(im, "iron_man_3_supercharged_shot_uniform.png", (952, 1006),
            [(77, 125), (130, 179), (184, 236)])
    # CHARGING FX — the "Charging Shot (Put over Iron Man's Fist)" composite graphic (grows during windup).
    reslice(im, "iron_man_3_charge_fx_uniform.png", (742, 782),
            [(22, 51), (87, 115)])
    # SUPER MOVE (standing) — spinning-ring windup → burst cast pose.
    reslice(im, "iron_man_3_super_move_uniform.png", (1151, 1191),
            [(131, 157), (162, 199), (204, 239), (277, 306)])
    # SUPER MOVE (midair) — airborne variant (thruster clouds).
    reslice(im, "iron_man_3_super_move_air_uniform.png", (1221, 1265),
            [(122, 147), (152, 183), (191, 226), (264, 293)])
    # SUPER LASER — long horizontal cyan beam (2 travel frames of the full beam; huge horizontal projectile).
    reslice(im, "iron_man_3_super_laser_uniform.png", (1385, 1452),
            [(217, 445), (682, 910)])

    # PORTRAIT — the black-boxed classic helmet bust (bottom render strip), black-keyed, upscaled.
    carve_keyed("iron_man_3_portrait.png", (776, 2315, 862, 2442), (0, 0, 0), tol=48, target_h=288)

    # Declared reuses (no dedicated art / not engine-consumed — FLAGGED in characters.js):
    #   walk = run,  dash = run,  fall = jump,  guard = crouch.
    #   Turning-Around / Looking-Up / Crouching-LookDown-variant / Double-Jump / Dashing-FX = on-sheet but
    #   not engine-consumed at Stage 1 (documented in IRON_MAN_3_ASSET_MAP.md).
