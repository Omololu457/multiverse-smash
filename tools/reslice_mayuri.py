#!/usr/bin/env python3
# Re-slice MAYURI KUROTSUCHI (Bleach, 12th-Division captain / mad scientist) source ROW strips into
# CLEAN uniform, feet-aligned cells. Mirrors tools/reslice_onoki.py (alpha-gutter frame detect ->
# per-frame content bbox -> repack into one uniform cell: centered-X, BOTTOM-aligned) so a single
# anchorY: 0 plants feet across every standing action. Same band/keep/pick/xrects/keyblack/scrub knobs.
#
# SOURCE FORMAT: art arrives as 68 numbered ROW strips (mayuri_kurotsuchi_row_NN.png), each strip = one
# animation laid out horizontally. Each job maps a row number -> a semantic action name per the CONFIRMED
# MAYURI DESIGN. Filenames preserved EXACTLY as delivered (mayuri_kurotsuchi_row_NN).
import sys
from PIL import Image

ALPHA = 16
SRC = "mayuri_kurotsuchi_row_%02d.png"   # source-strip name template

def runs_of(px, x0, x1, y0, y1):
    col = [sum(1 for y in range(y0, y1 + 1) if px[x, y][3] > ALPHA) for x in range(x0, x1 + 1)]
    out = []; s = -1
    for i, x in enumerate(range(x0, x1 + 1)):
        if col[i] > 0:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, x1])
    return out

def reslice(src, out, band=None, keep=None, pick=None, xrects=None, keyblack=None, scrub=None,
            minw=3, pad_to=None):
    im = Image.open(src).convert("RGBA"); W, H = im.size
    if scrub is not None:            # clear baked-in label/annotation rects
        sp = im.load()
        for (x0, y0, x1, y1) in scrub:
            for y in range(max(0, y0), min(H, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)):
                    sp[x, y] = (0, 0, 0, 0)
    if keyblack is not None:
        px = im.load()
        for y in range(H):
            for x in range(W):
                r, g, b, a = px[x, y]
                if a > 0 and max(r, g, b) < keyblack: px[x, y] = (0, 0, 0, 0)
    px = im.load()
    y0, y1 = (0, H - 1) if band is None else band
    if xrects is not None:
        runs = [list(r) for r in xrects]
    else:
        runs = runs_of(px, 0, W - 1, y0, y1)
        runs = [r for r in runs if (r[1] - r[0] + 1) >= minw]   # drop sub-minw debris slivers
        if keep is not None:
            runs = runs[keep[0]:keep[1] + 1]
        if pick is not None:
            runs = [runs[i] for i in pick]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = y1 + 1, y0 - 1
        for y in range(y0, y1 + 1):
            hit = False
            for x in range(rx0, rx1 + 1):
                if px[x, y][3] > ALPHA:
                    hit = True; break
            if hit:
                if y < miny: miny = y
                if y > maxy: maxy = y
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    if pad_to is not None:                 # force a COMMON cell size across a set of sheets
        uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        dx = i * uW + (uW - sw) // 2
        dy = uH - sh - 1
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def crop_frame(src, out, box, pad=2):
    """Crop an explicit (x0,y0,x1,y1) region and repack as a single feet-aligned uniform cell.
    Used to lift ONE sub-sprite out of a mixed row (e.g. the muzzle-flash burst)."""
    im = Image.open(src).convert("RGBA")
    x0, y0, x1, y1 = box
    cell = im.crop((x0, y0, x1 + 1, y1 + 1))
    uW, uH = cell.width + pad, cell.height + pad
    strip = Image.new("RGBA", (uW, uH), (0, 0, 0, 0))
    strip.paste(cell, ((uW - cell.width) // 2, uH - cell.height - 1), cell)
    strip.save(out)
    print(f"OK {out}: 1 frame, cell {uW}x{uH}  (cropped {box})")

def make_portrait(src, out, target_h=288):
    """Bust portrait from a strip's frame 0 (head + upper torso), upscaled nearest-neighbor."""
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > ALPHA) for x in range(W)]
    x0 = next(x for x in range(W) if col[x] > 0)
    x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    bust_h = int((y1 - y0 + 1) * 0.62)
    crop = im.crop((x0, y0, x1 + 1, y0 + bust_h))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (bust from {src} frame 0)")

def R(n): return SRC % n

if __name__ == "__main__":
    # ── STAGE 1 — movement / state ─────────────────────────────────────────────
    # idle (standing) + the iconic SEATED idle variant, walk, run + dash-start, crouch, and the
    # KNOCKDOWN row (single strip = fall 0-7 + getup 8-13). hurt = the row_14 hit-stagger (frames 0-1).
    reslice(R(3), "mayuri_idle_uniform.png")                        # standing idle (4f)
    reslice(R(4), "mayuri_idle_seated_uniform.png", keep=(4, 5))    # seated cross-legged idle variant (2f)
    reslice(R(5), "mayuri_walk_uniform.png")                        # walk (8f)
    reslice(R(29), "mayuri_run_uniform.png")                        # run — coat-trailing forward lean (6f)
    reslice(R(38), "mayuri_dash_uniform.png")                       # dash-start (2f)
    reslice(R(6), "mayuri_crouch_uniform.png")                      # crouch (4f)
    reslice(R(14), "mayuri_hurt_uniform.png",      keep=(0, 1))     # hit-stagger flinch (2f)
    reslice(R(14), "mayuri_knockdown_uniform.png", keep=(0, 7))     # knockdown: stagger->launch->prone (8f)
    reslice(R(14), "mayuri_getup_uniform.png",     keep=(8, 13))    # get-up rise (6f)

    # MOVEMENT FX overlays (rendered behind the body during dash/run) — dash-trail ghost pair (row_08/10)
    # and ground shockwave-ring pair (row_09/11). minw drops the ring-sliver debris the gutter-detect finds.
    reslice(R(8),  "mayuri_dashtrail_a_uniform.png")               # dash ghost-trail A (3f)
    reslice(R(10), "mayuri_dashtrail_b_uniform.png")               # dash ghost-trail B (3f)
    reslice(R(9),  "mayuri_shockwave_a_uniform.png", minw=14)      # shockwave rings A
    reslice(R(11), "mayuri_shockwave_b_uniform.png", minw=14)      # shockwave rings B

    # PORTRAIT — bust from standing-idle frame 0 (no dedicated mugshot art).
    make_portrait(R(3), "mayuri_portrait.png")

    # ── STAGE 2 — 5 normals + command-normal chain ─────────────────────────────
    # light = quick sword-DRAW jab (row_16), heavy = committed forward palm/finger thrust (row_17),
    # up (launcher) = crouch→vertical sword thrust to the sky (row_24, FX-paired with the green slash
    # row_26), air = airborne forward sword slash (row_30, FX-paired with row_32), down_air = aerial
    # diving slash (row_40). Command chain = row_13 split at its natural beat (frames 0-8 standing
    # poke string / 9-16 drop-to-low flurry finisher) → a 2-stage Fwd+Heavy cancel-on-hit rekka.
    reslice(R(16), "mayuri_light_uniform.png")                  # light — sword-draw jab (6f)
    reslice(R(17), "mayuri_heavy_uniform.png")                  # heavy — forward palm/finger thrust (6f)
    reslice(R(24), "mayuri_up_uniform.png")                     # up launcher — vertical sword thrust (10f)
    reslice(R(30), "mayuri_air_uniform.png", minw=20)           # air — airborne forward slash (drops the 16px detached-blade sliver → 8f)
    reslice(R(40), "mayuri_downair_uniform.png")               # down_air — aerial diving slash (6f)
    reslice(R(13), "mayuri_cmd1_uniform.png", keep=(0, 8))      # cmd chain stage 1 — standing poke string (9f)
    reslice(R(13), "mayuri_cmd2_uniform.png", keep=(9, 16))     # cmd chain stage 2 — low flurry finisher (8f)
    # ATTACK-FX green slash overlays (paired with up/air normals, rendered as an energy crescent).
    reslice(R(26), "mayuri_upslash_fx_uniform.png")             # up-attack green slash FX (7f)
    reslice(R(32), "mayuri_airslash_fx_uniform.png")            # air-attack green slash FX (6f)

    # ── STAGE 3 — 5 specials + the row_41 muzzle-flash projectile + the Lab Coat Open buff ─────
    # N = Finger-Gun Blast (row_41, muzzle flash @ frame 7 → real ranged projectile) / F = Energy Slash
    # (row_18 cast + row_20 green-crescent projectile) / U = Rising Cut launcher (row_19) / D = Poison
    # Cloud (row_37 cast + row_50 green spore-cloud projectile carrying a DoT) / B = Lab Coat Open buff
    # (row_42 coat-flung-open — temporary damage multiplier).
    reslice(R(41), "mayuri_blast_uniform.png")                  # N — finger-gun blast cast/fire (12f)
    reslice(R(18), "mayuri_slash_uniform.png")                  # F — energy-slash cast (8f)
    reslice(R(19), "mayuri_rising_uniform.png")                 # U — rising cut launcher (4f)
    reslice(R(37), "mayuri_poison_uniform.png")                 # D — poison-cloud cast (6f)
    reslice(R(42), "mayuri_coatopen_uniform.png")               # B — Lab Coat Open buff cast (9f)
    # PROJECTILE / FX sprites:
    crop_frame(R(41), "mayuri_blast_proj_uniform.png", (793, 40, 851, 68))   # muzzle-flash energy burst (finger-gun projectile)
    reslice(R(20), "mayuri_slash_proj_uniform.png", minw=30)    # green energy crescent (Energy Slash projectile — drops the 13px sliver → 5f)
    reslice(R(50), "mayuri_poison_cloud_uniform.png")           # green spore-cloud (Poison Cloud projectile, 5f)

    # ── STAGE 4 — BANKAI: Konjiki Ashisogi Jizō (construct ULT) ────────────────
    # Release-cast pose (row_43 coat/blade flourish) held on the LIVE fighter while the golden baby-faced
    # CONSTRUCT (row_48, Konjiki Ashisogi Jizō) assembles/looms over the foe in a freeze-cinematic overlay.
    reslice(R(43), "mayuri_bankai_cast_uniform.png")            # Bankai release cast pose (9f)
    reslice(R(48), "mayuri_bankai_construct_uniform.png")       # golden construct — cinematic overlay (4f)

    # ── STAGE 5 — NEMU (bespoke assist character) ──────────────────────────────
    # Nemu Kurotsuchi (Mayuri's lieutenant, black-haired) — a self-contained assist (Pain/Yachiru
    # precedent). Attack = row_64 body + row_65 impact FX; Uppercut = row_66 body + row_67 launcher FX.
    reslice(R(64), "mayuri_nemu_attack_uniform.png")            # Nemu attack — rushing strike body (6f)
    reslice(R(65), "mayuri_nemu_attack_fx_uniform.png")         # Nemu attack impact FX (3f)
    reslice(R(66), "mayuri_nemu_uppercut_uniform.png")          # Nemu uppercut — rising strike body (7f)
    reslice(R(67), "mayuri_nemu_uppercut_fx_uniform.png")       # Nemu uppercut launcher FX (4f)
