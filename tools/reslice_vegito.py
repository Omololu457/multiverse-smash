#!/usr/bin/env python3
# Re-slice VEGITO ULTRA INSTINCT -SIGN- (DBZ) from the SINGLE XenoHiro016 "JUS" sheet
#   vegito_ultra_instinct__sign__v2_sprite_sheet_jus_by_xenohiro016_die4gov-fullview.jpg
#   (1280x1832 RGB, JPEG — NO alpha).
#
# ★ KEYING TECHNIQUE (rebuild fix): this character has BLACK/dark hair + face shadows sitting
#   on a DARK navy bg (~#182536). A GLOBAL color-tolerance key (transparent = "any pixel close
#   to navy, anywhere") ate holes into the hair/face because those dark interior pixels fall
#   inside the navy tolerance. FIXED HERE with EDGE-CONNECTED FLOOD-FILL keying: label the
#   contiguous navy-similar regions, then make transparent ONLY the regions that touch the
#   canvas border (i.e. background actually connected to the edge). Dark pixels enclosed inside
#   the character's own silhouette are never border-connected, so hair/face shadow stays OPAQUE.
#   Standard fix for the dark-subject-on-dark-bg case. See PART 2 of the rebuild prompt.
#
# SOURCE FORMAT: a JUS LABELED-BAND sheet on flat navy bg (#182536). Not a uniform grid.
# Slicing = key navy -> transparent, then carve each frame by an EXPLICIT (y-band, xrect)
# measured with tools/vegito_stage0_boxes.py (auto label-strip + column-gap split, then
# hand-verified against zoomed crops). Per-frame content bbox -> repack centered-X /
# BOTTOM-aligned into one uniform cell (single anchorY:0 plants feet across standing actions).
# Mirrors reslice_iron_man.py's xrect path. Fully INDEPENDENT roster character.
#
# STAGE 1 scope: idle (STANCE group1) + idle_mid/idle_low (groups 2/3, reserved for the
# Stage-5 resource-meter visual tell, owner-locked) + walk/dash/jump/guard/hurt/knockdown/getup.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "vegito_ultra_instinct__sign__v2_sprite_sheet_jus_by_xenohiro016_die4gov-fullview.jpg"
BG = np.array([24, 37, 54])   # measured navy #182536
# ── Keying params. There is NO clean color threshold on this sheet (measured: the flat navy bg sits
# at dist≤10, but dark hair/outline pixels and JPEG edge-fringe are smeared together across dist 40-100
# with no valley). So a single tolerance either eats hair (high) or leaves speckle debris (low). We fix
# it with MORPHOLOGY + CONNECTIVITY, not a smarter color rule (color rules failed twice):
KEY_TOL   = 46   # border-flood only removes CLEARLY-navy pixels → dark hair/outline is preserved (not eaten)
CLOSE_ITER = 2   # binary_closing to reconnect thin-cut hair strands + seal pinhole gaps into one solid mass
MIN_BLOB  = 80   # drop opaque islands smaller than this (px) → despeckles the leftover JPEG "confetti" in the bg
ALPHA = 16

def load_keyed():
    """SILHOUETTE-CUTOUT alpha built by CONNECTIVITY + MORPHOLOGY (not a per-pixel color rule).

    Pipeline (the interior is color-independent by construction; the confetti/halo the last version
    left is removed by despeckling, and thin-cut hair is reconnected before it can be dropped):
      1. Background = region flood-filled inward from the canvas border through contiguous CLEARLY-navy
         pixels (low KEY_TOL, so dark hair/black line-art is NOT swept into the background).
      2. Foreground = everything the flood did not reach. `binary_closing` reconnects hair strands that
         a thin navy channel had split off, and seals pinholes — the character becomes ONE solid blob.
      3. DESPECKLE: label the foreground and drop every component smaller than MIN_BLOB. The character is
         a single huge blob; the leftover dark JPEG specks in the background are tiny isolated islands →
         gone. (Done on the full sheet: every real frame-figure is far larger than MIN_BLOB, so none are
         lost; only debris between/around figures is removed.)
      4. `binary_fill_holes` → any enclosed pocket (eyes, face/gi shadow) stays opaque regardless of color.
    Transparency is applied strictly OUTSIDE the resulting silhouette. This is the by-hand cutout a
    sprite-ripper does on a dark-subject-on-dark-bg case, expressed reproducibly.
    """
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    bgmask = np.abs(a - BG).sum(2) <= KEY_TOL          # CLEARLY-navy only (boundary test)
    lbl, _ = ndimage.label(bgmask)
    border = np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])
    border_labels = set(int(v) for v in np.unique(border) if v != 0)
    edge_bg = np.isin(lbl, list(border_labels))        # background = border-connected navy only
    fg = ~edge_bg
    if CLOSE_ITER > 0:
        fg = ndimage.binary_closing(fg, iterations=CLOSE_ITER)   # reconnect thin-cut hair + seal pinholes
    flbl, _ = ndimage.label(fg)                        # despeckle: drop small disconnected opaque islands
    sizes = np.bincount(flbl.ravel())
    keep = sizes >= MIN_BLOB
    keep[0] = False
    fg = keep[flbl]
    fg = ndimage.binary_fill_holes(fg)                 # solid interior (color-independent)
    alpha = np.where(fg, 255, 0).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")

def reslice(im, out, band, xrects):
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
    print(f"OK {out}: {len(frames)}f cell {uW}x{uH}  heights={[f[3] for f in frames]}")
    print(f"   -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_portrait(out, box=(952, 25, 1232, 232), target_h=288):
    """Portrait = the dedicated top-right anime bust RENDER (head + upper torso)."""
    im = Image.open(SRC).convert("RGB").crop(box)
    scale = target_h / im.height
    im.resize((round(im.width * scale), target_h), Image.LANCZOS).save(out)
    print(f"OK {out}: bust render {im.size}")

if __name__ == "__main__":
    im = load_keyed()

    # ── STAGE 1 — movement / state ──
    # STANCE band figY 26..71 (label stripped). Three "/"-divided pose groups (item 1 RESOLVED):
    #   G1 relaxed idle [0-3] | "/"=[4] | G2 arms-out tensed [5-8] | "/" | G3 wide braced [9-12].
    reslice(im, "vegito_idle_uniform.png", (23, 72),
            [(10, 26), (40, 57), (73, 90), (106, 122)])                # G1 relaxed neutral idle
    reslice(im, "vegito_idle_mid_uniform.png", (23, 72),
            [(147, 169), (182, 205), (219, 245), (259, 283)])          # G2 tensed (Stage-5 mid tell)
    reslice(im, "vegito_idle_low_uniform.png", (23, 72),
            [(317, 354), (356, 392), (394, 430), (432, 470)])          # G3 braced (Stage-5 low tell); slash at x295-315 excluded

    # MOVE (walk) + DASH share one band, figY 93..118.
    reslice(im, "vegito_walk_uniform.png", (88, 120),
            [(9, 45), (55, 91), (99, 135), (142, 178)])                # 4-frame walk (alt-leg)
    reslice(im, "vegito_dash_uniform.png", (88, 120),
            [(367, 409), (418, 461)])                                  # 2-frame dash streak

    # JUMP (left, 9f arc) + GUARD (right, 3f) share one band, figY 148..186.
    reslice(im, "vegito_jump_uniform.png", (143, 190),
            [(10, 39), (48, 74), (81, 105), (112, 136), (143, 168), (178, 205)])  # crouch->rise->apex->descend
    reslice(im, "vegito_guard_uniform.png", (143, 190),
            [(362, 390), (398, 426), (434, 462)])                      # 3-frame guard

    # TAKING DAMAGE band figY 213..235.
    reslice(im, "vegito_hurt_uniform.png", (207, 240),
            [(9, 43), (55, 77), (87, 111), (122, 147)])                # 4-frame flinch

    # KNOCKED OUT band figY 279..308. Split fall/down vs getup.
    reslice(im, "vegito_knockdown_uniform.png", (270, 312),
            [(11, 55), (65, 109), (116, 163), (170, 214), (222, 266), (274, 361)])
    reslice(im, "vegito_getup_uniform.png", (270, 312),
            [(367, 389), (397, 437), (448, 475), (487, 519)])

    # ── STAGE 2 — normals (×0.60 in characters.js). Same flood-fill keyer as movement. ──
    # light = quick straight jab (ATTACK1 windup+strike). heavy = lunging long-reach punch.
    reslice(im, "vegito_light_uniform.png", (426, 464),
            [(49, 77), (85, 115)])                                      # 2f jab (ATTACK1[1,2])
    reslice(im, "vegito_heavy_uniform.png", (426, 464),
            [(126, 170)])                                               # 1f lunge punch, long reach (ATTACK1[3])
    # up = RISING slash launcher (ATTACK3 top sub-row, upward crescent swing).
    reslice(im, "vegito_up_uniform.png", (656, 702),
            [(120, 157), (163, 203)])                                   # 2f rising slash (ATTACK3top[2,3])
    # air = flying kick, down_air = diving kick (JUMP ATTACK row). Band CAPPED at y958 to
    # exclude the "Special Attacks" green label directly below (figures = y919..957).
    reslice(im, "vegito_air_uniform.png", (916, 958),
            [(6, 37)])                                                  # 1f compact flying kick (JUMPATTACK pose0)
    reslice(im, "vegito_downair_uniform.png", (916, 958),
            [(43, 83)])                                                 # 1f extended-leg dive kick (JUMPATTACK pose1)
    # crouchLight = low kick (ATTACK4 top sub-row, low sweeping kick).
    reslice(im, "vegito_clight_uniform.png", (778, 824),
            [(47, 74)])                                                 # 1f low kick (ATTACK4top[1])

    # ── STAGE 3 — Fwd+Heavy 3-stage RUSH rekka from the "Repeat here" dashing-slash combo row
    # (ATTACK2 bottom sub-row, figY 592..632). rush1 dash-in slash opener → rush2 crescent slashes →
    # rush3 BIG crescent LAUNCHER finisher. Rendered by move name (VEGITO_CMD in abilities.js). ──
    reslice(im, "vegito_rush1_uniform.png", (590, 634),
            [(96, 133), (149, 188)])                                    # dash-in slash opener
    reslice(im, "vegito_rush2_uniform.png", (590, 634),
            [(215, 256), (283, 323)])                                   # crescent slashes (mid)
    reslice(im, "vegito_rush3_uniform.png", (590, 621),
            [(346, 443)])                                               # big crescent LAUNCHER finisher; band bottom capped at y621 to EXCLUDE the "Repeat here" caption baked at y623-627

    # ── STAGE 4 — special CAST poses (one gather→fire pair each; FX = procedural projectiles in
    # abilities.js). Rows measured from the SPECIAL EFFECTS bands. Figure zone only (x<520 excludes
    # the FX art to the right). All flood-fill keyed. ──
    # ★ y-bands RE-CUT after a visual audit (subagent): the SPECIAL rows carry move-name / "SPECIAL
    # EFFECTS" captions and yellow FX art that the first pass caught. banshee band trimmed to figures-only
    # (caption/FX bled in below y1058); bigbang dropped below its top caption band (figure starts y1155);
    # perfect RE-SOURCED to the real blue-gi figure row (the old band sat entirely on the yellow FX blob).
    reslice(im, "vegito_banshee_uniform.png", (1019, 1058),
            [(215, 241), (255, 283)])                                   # Banshee Blast — rapid-fire stance (B)
    reslice(im, "vegito_airki_uniform.png", (1078, 1132),
            [(112, 141), (148, 178)])                                   # Air Ki Blast — charge→throw (U)
    reslice(im, "vegito_bigbang_uniform.png", (1153, 1196),
            [(42, 71), (83, 103)])                                      # Big Bang Attack — 2f character gather (x131+ = sphere VFX, excluded; FX is procedural)
    reslice(im, "vegito_galick_uniform.png", (1220, 1274),
            [(124, 155), (162, 195)])                                   # Galick Gun — two-hand forward beam (F)
    reslice(im, "vegito_spread_uniform.png", (1291, 1344),
            [(125, 155), (170, 202)])                                   # Spread Finger Beam — fingers-spread fan (D)
    reslice(im, "vegito_perfect_uniform.png", (1534, 1573),
            [(160, 202), (217, 258)])                                   # Perfect Shot — precise aim→fire (real figure row)
    # ── STAGE 6 — Kamehameha ULTIMATE cast (Ultimate Action windup [ULTACTION row] → this thrust). ──
    reslice(im, "vegito_kame_uniform.png", (1592, 1634),
            [(154, 200), (216, 270)])                                   # Kamehameha — pull-back → thrust-forward
    reslice(im, "vegito_ultaction_uniform.png", (363, 408),
            [(14, 30), (49, 69), (91, 113), (121, 144), (154, 175)])    # Ultimate Action — 5f charge windup
    reslice(im, "vegito_win_uniform.png", (1672, 1716),
            [(44, 74), (86, 113), (123, 152)])                          # WIN — 3f proud victory pose

    # Portrait — dedicated top-right bust render.
    make_portrait("vegito_portrait.png")

    # ── SELF-VERIFY TRIPWIRE (the LOCK) ──────────────────────────────────────────────────────
    # This reslicer is the ONLY writer of the vegito_*_uniform.png assets, and it RE-DERIVES every
    # frame from the raw JPEG on every run — so a re-run to add frames during a later build stage is
    # exactly where a transparency fix could be silently reverted. To make that impossible, the run
    # FAILS LOUDLY (non-zero exit) if any frame it just wrote has an interior HEAD-region hole (the
    # face/hair damage). A broken cutout can never ship or overwrite a good one unnoticed again.
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from vegito_face_check import main as face_check
    print("\n── self-verify: scanning every regenerated frame for interior face/hair holes ──")
    if face_check() != 0:
        sys.exit("ABORT: regeneration produced face/hair holes — assets NOT trustworthy (see FAIL rows above).")

    # Reuse (declared in characters.js, no dedicated art): run = dash, fall = jump.
