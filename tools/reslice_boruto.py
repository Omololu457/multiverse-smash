#!/usr/bin/env python3
# Re-slice Boruto Uzumaki source art into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_kiba.py / reslice_onoki.py (alpha-gutter frame detect -> per-frame content bbox ->
# repack into one uniform cell: centered-X, BOTTOM-aligned) so a single anchorY: 0 plants feet across every
# standing action. Same band/keep/pick/xrects/keyblack/scrub knobs, PLUS a `blue` label-strip pre-pass.
#
# SOURCE FORMAT: per-action files (boruto_<action>.png) plus TWO double-row bundles (row_10 aerial-combos,
# row_12 throw-weapon) that must be split by the horizontal transparent band FIRST, then column-sliced.
#
# STAGE-0 / CONFIRMED-DESIGN pre-processing baked in:
#   * MANDATORY blue-text-label strip: row_05 ("JUMP"/"GUARD"), row_10 combo labels, row_12 throw labels,
#     row_13 (unnamed-sweep label), chacra_charge ("CHACRA CHARGE:"), sutorimu_fuuton (top-cropped label
#     fragment). Handled by blue=True -> strip_blue_labels() removes bright saturated-blue text pixels only
#     (Boruto's body carries no bright pure-blue), run BEFORE frame detection.
#   * introduction.png carries 2 orphan 1px label-fragment specks (x=598, x=833) -> dropped automatically
#     by the minw>=3 sub-frame-debris filter (isolated 1px runs never survive detection).
#   * row_13 vs chacra_charge (audit lean, CONFIRMED): chacra_charge.png = the REAL charge state (Stage 1);
#     row_13 = a bonus unnamed SWEEP special (Stage 3). Not resolved here beyond the label strip.
import sys
from PIL import Image

ALPHA = 16

def strip_blue_labels(im, dilate=2):
    """In-place: erase baked-in BRIGHT-SATURATED-BLUE text labels (the source sheets' burned-in move names).
    Two-pass: (1) find the pure bright-blue CORE (verified text-only vs Boruto's dark-navy jacket, which never
    reaches b>=150 with b>r+70) then (2) erase that core PLUS a `dilate`-px halo so the darker ANTI-ALIASED
    text edges go too (a core-only strip leaves grey ghost letters). Labels sit clear of the sprites so the
    small halo never touches the character."""
    W, H = im.size; px = im.load()
    core = [(x, y) for y in range(H) for x in range(W)
            if (lambda p: p[3] > 0 and p[2] >= 150 and p[2] > p[0] + 70 and p[2] > p[1] + 70)(px[x, y])]
    kill = set()
    for (x, y) in core:
        for dy in range(-dilate, dilate + 1):
            for dx in range(-dilate, dilate + 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H: kill.add((nx, ny))
    for (x, y) in kill: px[x, y] = (0, 0, 0, 0)
    return len(kill)

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
            blue=False, minw=3, pad_to=None, pingpong=False):
    im = Image.open(src).convert("RGBA"); W, H = im.size
    if blue:
        n = strip_blue_labels(im)
        print(f"   [{src}] stripped {n} blue-label px")
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
        runs = [r for r in runs if (r[1] - r[0] + 1) >= minw]   # drop sub-minw debris slivers / 1px specks
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
    if pad_to is not None:
        uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    # PING-PONG: bake a 1→N→1 bounce into the strip (no engine yoyo support) so a straight loop reads
    # smoothly — [0,1,..,N-1,N-2,..,1]. Avoids the visible pop between last and first frame on a plain loop.
    order = list(range(len(frames)))
    if pingpong and len(frames) > 2:
        order = order + list(range(len(frames) - 2, 0, -1))
    strip = Image.new("RGBA", (uW * len(order), uH), (0, 0, 0, 0))
    for i, fi in enumerate(order):
        sx, sy, sw, sh = frames[fi]
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        dx = i * uW + (uW - sw) // 2
        dy = uH - sh - 1
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"OK {out}: {len(order)} frames, cell {uW}x{uH}  widths={[frames[i][2] for i in order]}")
    print(f"   animationData -> {{ frames: {len(order)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(order), uW, uH

def split_row(src, top_out, bot_out, blue=False, top_keep=None, bot_keep=None):
    """Split a DOUBLE-ROW sheet by its horizontal transparent band, then column-slice each half separately.
    Returns nothing; writes top_out and bot_out. Used for row_10 / row_12."""
    im = Image.open(src).convert("RGBA"); W, H = im.size
    if blue: strip_blue_labels(im)
    px = im.load()
    rows = [sum(1 for x in range(W) if px[x, y][3] > ALPHA) for y in range(H)]
    # find the widest empty band separating the two rows (scan the middle third)
    band_y, best = H // 2, -1
    lo, hi = H // 4, 3 * H // 4
    run_s = -1; runs = []
    for y in range(lo, hi):
        if rows[y] == 0:
            if run_s < 0: run_s = y
        else:
            if run_s >= 0: runs.append((run_s, y - 1)); run_s = -1
    if run_s >= 0: runs.append((run_s, hi - 1))
    if runs:
        s, e = max(runs, key=lambda r: r[1] - r[0]); band_y = (s + e) // 2
    print(f"   [{src}] split band y={band_y}")
    _band_slice(im, top_out, 0, band_y, keep=top_keep)
    _band_slice(im, bot_out, band_y + 1, H - 1, keep=bot_keep)

def _band_slice(im, out, y0, y1, keep=None, minw=3):
    W, H = im.size; px = im.load()
    runs = runs_of(px, 0, W - 1, y0, y1)
    runs = [r for r in runs if (r[1] - r[0] + 1) >= minw]
    if keep is not None: runs = runs[keep[0]:keep[1] + 1]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = y1 + 1, y0 - 1
        for y in range(y0, y1 + 1):
            for x in range(rx0, rx1 + 1):
                if px[x, y][3] > ALPHA:
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    break
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    uW = max(f[2] for f in frames) + 2; uH = max(f[3] for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        strip.paste(cell, (i * uW + (uW - sw) // 2, uH - sh - 1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    print(f"   animationData -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")

def stitch(parts, out, scrub_map=None, blue=False):
    cells = []
    for src in parts:
        im = Image.open(src).convert("RGBA"); W, H = im.size
        if blue: strip_blue_labels(im)
        px = im.load()
        if scrub_map and src in scrub_map:
            for (x0, y0, x1, y1) in scrub_map[src]:
                for y in range(max(0, y0), min(H, y1 + 1)):
                    for x in range(max(0, x0), min(W, x1 + 1)):
                        px[x, y] = (0, 0, 0, 0)
        for rx0, rx1 in runs_of(px, 0, W - 1, 0, H - 1):
            if rx1 - rx0 + 1 < 3: continue
            miny, maxy = H, -1
            for y in range(H):
                for x in range(rx0, rx1 + 1):
                    if px[x, y][3] > ALPHA:
                        if y < miny: miny = y
                        if y > maxy: maxy = y
                        break
            if maxy < 0: continue
            cells.append(im.crop((rx0, miny, rx1 + 1, maxy + 1)))
    uW = max(c.width for c in cells) + 2; uH = max(c.height for c in cells) + 2
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - 1), c)
    strip.save(out)
    print(f"OK {out}: {len(cells)} frames, cell {uW}x{uH}  (stitched {parts})")
    print(f"   animationData -> {{ frames: {len(cells)}, width: {uW}, height: {uH}, anchorY: 0 }}")

def make_portrait(src, out, target_h=288, frame=0, nframes=1, bust=0.62, blue=False):
    im = Image.open(src).convert("RGBA")
    if blue: strip_blue_labels(im)
    W, H = im.size; px = im.load()
    cw = W // nframes
    x0f, x1f = frame * cw, (frame + 1) * cw - 1
    col = [sum(1 for y in range(H) if px[x, y][3] > ALPHA) for x in range(x0f, x1f + 1)]
    x0 = x0f + next(i for i, c in enumerate(col) if c > 0)
    x1 = x0f + (next((i for i in range(x0 - x0f, len(col)) if col[i] == 0), len(col)) - 1)
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    bust_h = int((y1 - y0 + 1) * bust)
    crop = im.crop((x0, y0, x1 + 1, y0 + bust_h))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (bust from {src} frame {frame})")

if __name__ == "__main__":
    # ── STAGE 1 — movement / state ──
    reslice("boruto_stance.png",   "boruto_idle_uniform.png", pingpong=True)   # idle — 7f baked to 12f 1->7->1 bounce
    reslice("boruto_run.png",      "boruto_run_uniform.png")           # run — 6f true loop
    reslice("boruto_dash.png",     "boruto_dash_uniform.png")          # dash — 3f (push-off / afterimage smear / arrival)
    reslice("boruto_introduction.png", "boruto_intro_uniform.png")     # intro — 4f (1px orphan specks auto-dropped by minw)
    reslice("boruto_chacra_charge.png", "boruto_charge_uniform.png", blue=True)  # chakra charge — held state (label stripped)
    reslice("boruto_taking_damage.png", "boruto_hurt_uniform.png")     # hit(light) — 3f progressive recoil
    reslice("boruto_taking_heavy_damage.png", "boruto_hurt_heavy_uniform.png")  # hit(heavy) — 5f airborne knockback
    reslice("boruto_knocked_down.png", "boruto_knockdown_uniform.png") # knockdown — 5f (impact->prone->siftup->knee->rise)
    reslice("boruto_winning_pose.png", "boruto_win_uniform.png")       # win — 3f front-facing (WIN ONLY, silhouette differs)

    # row_05: JUMP set (left) + GUARD set (right), one row, two blue labels stripped.
    reslice("boruto_row_05.png", "boruto_jump_uniform.png",  blue=True, keep=(0, 3))   # jump — 4f (velocity-driven)
    reslice("boruto_row_05.png", "boruto_guard_uniform.png", blue=True, keep=(4, 6))   # guard — 3f (stand+crouch blocks)

    # PORTRAIT — bust from the idle stance frame 0 (introduction is the only front-facing set but win-only art).
    make_portrait("boruto_stance.png", "boruto_portrait.png")

    # ── STAGE 2 — 5 normals + Low Sweep bonus + 2 aerial-combo cancel strings ──
    reslice("boruto_row_09.png", "boruto_light_uniform.png")             # light — Punch set A (4f) → Kick set B (4f) 2-hit auto-combo
    reslice("boruto_strong_attack_forward.png", "boruto_heavy_uniform.png")  # heavy — 4f (windup→IMPACT→extension→long punishable recovery)
    reslice("boruto_strong_attack_up.png", "boruto_up_uniform.png")      # up — 3f uppercut (active frame 2 ONLY)
    reslice("boruto_row_11.png", "boruto_air_uniform.png")               # air — Air punch (3f) + Air kick (3f), both DESCENDING
    reslice("boruto_strong_attack_air.png", "boruto_downair_uniform.png")    # down_air — 3f divekick (hold frame 2 descending)
    reslice("boruto_strong_attack_down.png", "boruto_lowsweep_uniform.png")  # Low Sweep bonus — 6f forced-knockdown low sweep (active frame 4)

    # row_10: DOUBLE-ROW aerial-combo sheet (band y≈84). Split top/bottom FIRST, then column-slice each half.
    # Two distinct aerial cancel strings: Combo 1 (≈8f) and Combo 2 (≈9f, ends in a ~180° spinning dive).
    # Blue combo-name labels stripped. (top→combo1 / bottom→combo2 verified after slicing.)
    split_row("boruto_row_10.png", "boruto_aircombo1_uniform.png", "boruto_aircombo2_uniform.png", blue=True)

    # ── STAGE 3 — directional specials + FX cast poses ──
    reslice("boruto_rasengan_normal_ground.png", "boruto_rasengan_ground_uniform.png")   # N-special ground — Rasengan thrust (8f; orb parented from ~frame 3)
    reslice("boruto_rasengan_normal_air.png",    "boruto_rasengan_air_uniform.png")      # N-special air — Rasengan (6f; dark impact frames 4-6)
    reslice("boruto_invisible_rasengan.png",     "boruto_vanishing_uniform.png")         # air Back — Vanishing Rasengan (faint FX; ground+air poses)
    reslice("boruto_raiton_normal_shiden.png",   "boruto_shiden_uniform.png", blue=True) # F-special — Lightning Shiden thrust (arc FX authored in game.js)
    reslice("boruto_fuuton_suiton.png",          "boruto_windwater_uniform.png", blue=True)  # B-special — Wind/Water breath cast (one reusable cast, drives a projectile)
    reslice("boruto_kage_bunshin.png",           "boruto_clone_uniform.png", blue=True)  # D-special — Shadow Clone seal (caster only; clone+smoke authored)
    reslice("boruto_sutorimu_fuuton.png",        "boruto_sutorimu_all_uniform.png", blue=True)  # Palm Blast (set A) + Rush Slide (set B) — inspect counts, split below
    split_row("boruto_row_12.png", "boruto_throw_ground_uniform.png", "boruto_throw_air_uniform.png", blue=True)  # Throw Weapon ground + air (kunai projectile authored)

    # ── STAGE 4 — Kote (Scientific Ninja Tool) ULTIMATE cinematic. Stitch the 5 parts (4f each) into one
    # continuous ~20f firing sequence (spliced at each part's near-identical neutral-stance seam). The LIVE
    # fighter plays this as the cast pose; authored muzzle-flash/gauntlet/part-3 recoil FX layer over it. ──
    stitch(["boruto_special_move_kote_part_1.png", "boruto_special_move_kote_part_2.png",
            "boruto_special_move_kote_part_3.png", "boruto_special_move_kote_part_4.png",
            "boruto_special_move_kote_part_5.png"], "boruto_kote_uniform.png", blue=True)
