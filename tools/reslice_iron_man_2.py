#!/usr/bin/env python3
# Re-slice IRON MAN 2 (Marvel) from the SINGLE Data East arcade rip
#   Iron Man.png  (1696x1249 RGBA, flat khaki bg [169,173,153], Flávio Arruda rip+edit of
#   "Captain America and The Avengers", 1991 Data East) into CLEAN, feet-aligned uniform cells.
#
# SOURCE FORMAT: a flat-khaki-bg sheet with printed annotations (white/yellow labels: "edited",
# "WHHT!", the S/1/2/3/4*/E* charge-tier headers), white/red combo brackets + arrows, a face-icon
# grid, a cyan-bg full-body select render, and two teal credit boxes. NONE of that is sprite art, so
# — exactly like reslice_iron_man.py (IM1) — we KEY the khaki bg to transparent, then carve each
# animation by EXPLICIT xrects within a measured y-band (labels/brackets/arrows/portraits simply
# never fall inside an xrect). Per-frame content bbox -> repack centered-X, BOTTOM-aligned into one
# uniform cell (single anchorY:0 plants feet across every standing action).
#
# Fully INDEPENDENT character (iron_man_2) — SEPARATE from iron_man (IM1, danorenovado JUS chibi) and
# from the pending IM3 (GBA Invincible Iron Man). Borrows no art from them; nothing here patches them.
# Full visual pixel audit + owner-locked Stage-0 decisions: IRON_MAN_2_ASSET_MAP.md.
import numpy as np
from PIL import Image

SRC = "Iron Man.png"
BG = np.array([169, 173, 153])   # measured flat khaki background (89.5% of the sheet)
KEY_TOL = 60                     # sum-abs distance; the suit reds/golds all far exceed this
ALPHA = 16

def load_keyed():
    """Sheet RGB -> RGBA with the flat khaki bg keyed to transparent."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    bgmask = np.abs(a - BG).sum(2) <= KEY_TOL
    alpha = np.where(bgmask, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")

def reslice(im, out, band, xrects):
    """band = (y0,y1) measured; xrects = list of (x0,x1) frame columns. Each frame is content-bboxed
    inside the band, then repacked centered-X / bottom-aligned into a uniform cell."""
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

def make_portrait(strip_src, out, target_h=288, bust_frac=0.64):
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

    # ── STAGE 1 — movement / state (boxes from the visual pass — IRON_MAN_2_ASSET_MAP.md) ──
    # ★ IDLE + WALK RE-PICKED after owner review (2026-08-22): the original idle grabbed the two ISOLATED
    #   lead-in poses (a crouch + a taunt-reach) → dissimilar frames popped; the original "walk" sliced the
    #   Y135 PUNCH COMBO, not a stride. Corrected picks (both from the HEADER strip, y-band 33-96):
    # IDLE — region C: 3-frame planted front fighting stance (subtle breathing loop, near-identical frames).
    reslice(im, "iron_man_2_idle_uniform.png", (33, 96),
            [(1153, 1189), (1196, 1229), (1243, 1276)])
    # WALK — region A: genuine 8-frame alternating-leg stride (fists up), cleanly gapped.
    reslice(im, "iron_man_2_walk_uniform.png", (33, 96),
            [(140, 169), (182, 209), (228, 253), (266, 295), (308, 348), (363, 398), (409, 437), (450, 477)])
    # RUN — DEDICATED leaning-sprint cycle (6f, own art — NOT a walk reuse; this sheet has a real run).
    reslice(im, "iron_man_2_run_uniform.png", (263, 342),
            [(52, 88), (97, 132), (151, 187), (197, 235), (260, 293), (303, 339)])
    # RUN-TO-CROUCH — the ripper's own bracketed transition group (6f, kept separate per Stage-0 item 3).
    # Registered as its own animationData key `runCrouch` (arrow at x384-410 excluded).
    reslice(im, "iron_man_2_runcrouch_uniform.png", (285, 342),
            [(423, 458), (470, 513), (529, 565), (579, 608), (625, 666), (691, 727)])
    # CROUCH — static low pose: the last 2 run-to-crouch frames held (no separate neutral-crouch art) — FLAG reuse.
    reslice(im, "iron_man_2_crouch_uniform.png", (285, 342),
            [(625, 666), (691, 727)])
    # JUMP — boot-thruster rise (2f, own art; flame at feet). fall REUSES this sheet — FLAG.
    reslice(im, "iron_man_2_jump_uniform.png", (720, 800),
            [(300, 334), (343, 389)])
    # HURT / KNOCKDOWN / GETUP — from the top KO tumble row (y715-772). The sheet draws it flat->upright
    # (a rise): used FORWARD for getup, REVERSED for knockdown (a fall), and the 2 upright frames for hurt.
    reslice(im, "iron_man_2_hurt_uniform.png", (715, 772),
            [(1165, 1204), (1211, 1246)])                                     # 2f upright recoil/flinch
    reslice(im, "iron_man_2_knockdown_uniform.png", (715, 772),
            [(1211, 1246), (1165, 1204), (1105, 1158), (1030, 1098)])         # upright -> knocked flat (fall)
    reslice(im, "iron_man_2_getup_uniform.png", (715, 772),
            [(1030, 1098), (1105, 1158), (1165, 1204), (1211, 1246)])         # flat -> prop-up -> rise

    # ── STAGE 2 — normals, all from the OWNER-LOCKED "edited" walking-punch combo (y-band 136-206). Per the
    # visual pass this combo is an OVERHEAD-SWING/HOOK sequence (no straight jab): 5 key poses left→right —
    #   (467,504) coil/guard  (509,543) chamber  (554,589) fist-up raise  (597,642) overhead swing (biggest
    #   reach)  (653,701) recovery. Mapped to distinct normals (shared strike frames = honest, FLAGGED).
    # NOTE: keep the band top >=136 — repulsor/muzzle FX sit at y103-134 above; the "edited" label at y215+. ──
    reslice(im, "iron_man_2_light_uniform.png", (136, 206),
            [(509, 543), (597, 642)])                         # quick punch: chamber -> overhead swing
    reslice(im, "iron_man_2_heavy_uniform.png", (136, 206),
            [(467, 504), (554, 589), (597, 642)])             # committed overhead hook: coil -> raise -> swing (longest reach)
    reslice(im, "iron_man_2_up_uniform.png", (136, 206),
            [(467, 504), (554, 589)])                         # rising LAUNCHER: coil -> fist thrust straight up
    reslice(im, "iron_man_2_air_uniform.png", (136, 206),
            [(554, 589), (597, 642)])                         # aerial: raise -> swing (downward hook) — down_air REUSES this
    reslice(im, "iron_man_2_crouchthrust_uniform.png", (136, 206),
            [(467, 504)])                                     # crouchLight: the hunched coil = the combo's lowest pose (own low art)

    # ── STAGE 3 — COMMAND CHAIN "Repulsor Rush" (Fwd+Heavy 3-stage rekka). Sourced from the FULLER ORIGINAL
    # (unlabeled) punch group "B" (x798-1042, y135-215) so the rekka reads DISTINCT from the edited-combo
    # normals. Its 4 poses (heights confirm identity): (798,845) coil H49 / (862,911) lunge-forward H57 /
    # (932,976) both-arms-OVERHEAD H69 (tallest = launcher) / (995,1042) forward straight-punch H53. Chained as
    # coil→lunge→straight→overhead across 3 overlapping 2-frame rushes. Band top >=136 clears the muzzle FX at y103-134. ──
    reslice(im, "iron_man_2_rush1_uniform.png", (136, 213),
            [(798, 845), (862, 911)])                         # opener/gap-closer: coil -> lunging forward reach
    reslice(im, "iron_man_2_rush2_uniform.png", (136, 213),
            [(862, 911), (995, 1042)])                        # mid: lunge -> committed straight punch
    reslice(im, "iron_man_2_rush3_uniform.png", (136, 213),
            [(995, 1042), (932, 976)])                        # finisher: straight -> both-arms-overhead LAUNCHER

    # ── STAGE 4 SPECIAL CAST POSES (real art, resliced after the visual pass — replaced the S4 placeholders). ──
    # REPULSOR cast — a GROUNDED, upright, feet-planted figure with the fist thrust straight FORWARD (the
    # procedural blue dart supplies the beam FX). The sheet's only muzzle-flash firing poses are flat/flying
    # (unusable standing), so this uses the far-left original row's aim-forward pose: (311,345) cocked windup
    # → (261,307) arm-forward fire. (band top >=158 clears the row above.)
    reslice(im, "iron_man_2_repulsor_uniform.png", (158, 210),
            [(311, 345), (261, 307)])                         # windup (cocked) -> fire (fist thrust forward)
    # WHHT! dash — the on-sheet "WHHT!" labeled boot-jet dash-lunge: 4-frame fists-first diving lunge with a
    # flame/repulsor jet leading the fist (crouch-launch -> increasingly extended horizontal dive). Label sits
    # above at ~y490-505 (outside this band). Flame propulsion is baked into these frames.
    reslice(im, "iron_man_2_whht_uniform.png", (620, 685),
            [(243, 281), (303, 361), (369, 440), (448, 528)])   # WHHT! flame dash-lunge (4f)

    # GROUND-SLAM — a headfirst DIVE-slam attack (4f: committed descent -> impact w/ splash baked in -> drive-in).
    reslice(im, "iron_man_2_groundslam_uniform.png", (1073, 1141),
            [(33, 87), (112, 176), (183, 243), (257, 296)])
    # LOCK-ON MISSILE — the cyan STAR-BURST energy bolt (4f: spawn burst -> arrow-form -> travel compact -> travel
    # elongated). Carried by the projectile as its sprite (aimAt the locked target). Faces the travel direction.
    reslice(im, "iron_man_2_missile_uniform.png", (950, 1012),
            [(1374, 1397), (1412, 1445), (1510, 1549), (1563, 1590)])
    # LOCK-ON RETICLE FX — yellow target-lock acquire (4f: small orb -> crossing bursts -> reticle forming ->
    # full crosshair CIRCLE + radial star-burst). A pure-visual overlay spawned at the target.
    reslice(im, "iron_man_2_lockon_uniform.png", (1036, 1132),
            [(1305, 1330), (1349, 1397), (1414, 1472), (1489, 1582)])

    # ── STAGE 6 — portrait (select-screen FACE ICON) + win pose (full-body SELECT RENDER). Both are on NON-khaki
    # backgrounds (green icon cell / cyan render panel), so each uses its own chroma-key, not the sheet bg. ──
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

    # PORTRAIT — the clean neutral HUD face icon (row1/col1, gold faceplate, no damage flash), green-keyed, upscaled.
    carve_keyed("iron_man_2_portrait.png", (1304, 169, 1337, 202), (96, 167, 106), tol=60, target_h=288)
    # WIN — the full-body cyan select-screen render (confident hero stance), cyan-keyed, scaled to roster body height.
    carve_keyed("iron_man_2_win_uniform.png", (1538, 196, 1603, 322), (60, 205, 236), tol=85, target_h=58)

    # Declared reuses (no dedicated art on this sheet — FLAGGED in characters.js):
    #   dash = run,  fall = jump,  guard = crouch,  intro = idle.
