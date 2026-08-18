#!/usr/bin/env python3
# Re-slice Kiba Inuzuka (+ Akamaru, merged) source art into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_onoki.py (alpha-gutter frame detect -> per-frame content bbox -> repack into
# one uniform cell: centered-X, BOTTOM-aligned) so a single anchorY: 0 plants feet across every
# standing action. Same band/keep/pick/xrects/keyblack/scrub/crop knobs.
#
# SOURCE FORMAT: per-action files (kiba_<action>.png) plus a handful of MERGED multi-state bundles
# (jump_guard_guard_air = 3 states; taking_damage_* = 2; taking_heavy_damage_1_2_3 = 3) that get
# split by run-range via keep=(a,b).
#
# STAGE 0 INVESTIGATION RESOLUTIONS baked in:
#   * Akamaru's OWN standalone art (akamaru_*.png) is unfinished GRAYSCALE line art -> NEVER used for
#     gameplay. Akamaru appears ONLY inside Kiba's merged fusion technique art. akamaru_winning_pose.png
#     is uncolored line-art w/ burned-in text -> UNUSABLE; win pose derives from a clean colored Kiba
#     row_71 standing pose instead.
#   * kiba_special_move_5_* = joke/troll content ("URINA/XIXI/PISS", "Bomba Fumaca", wrong-character
#     Naruto sprites) -> EXCLUDED entirely, never sliced.
#   * Four Legs "BLUE BLOCK" = a solid blue background wedge behind the DISCARDABLE tail frames
#     (uncolored white-wolf frames + a technique-diagram panel). Only the clean colored Kiba frames are
#     sliced; blue-block frames are dropped via keep-range.
import sys
from PIL import Image

ALPHA = 16

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
    if pad_to is not None:
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

def stitch(parts, out, scrub_map=None):
    """Concatenate several source sheets into ONE feet-aligned uniform strip (each source's frames in
    order). scrub_map: {src: [(x0,y0,x1,y1), ...]} clears baked label rects before frame detection."""
    cells = []
    for src in parts:
        im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
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
    uW = max(c.width for c in cells) + 2
    uH = max(c.height for c in cells) + 2
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - 1), c)
    strip.save(out)
    print(f"OK {out}: {len(cells)} frames, cell {uW}x{uH}  (stitched {parts})")
    print(f"   animationData -> {{ frames: {len(cells)}, width: {uW}, height: {uH}, anchorY: 0 }}")

def recolor_green_to_grey(path):
    """In-place: remap the OFF-PALETTE green/olive outfit of the Aerial-Strong sheet to Kiba's neutral
    dark-grey outfit (24/48/72 ramp), luminance-preserving. Skin (red-dominant), navy shadow (blue-
    dominant) and already-grey pixels are LEFT ALONE. Green/olive/yellow (green≥red and green>blue+12)
    → neutral grey by luminance; the bright motion-swirl becomes a light-grey speed trail."""
    im = Image.open(path).convert("RGBA"); W, H = im.size; px = im.load()
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            if g >= r and g > b + 12:                       # green/olive/yellow-with-low-blue → outfit
                lum = 0.30 * r + 0.60 * g + 0.10 * b        # green channel carries the shading
                grey = int(max(18, min(100, 20 + (lum - 30) * 0.61)))
                px[x, y] = (grey, grey, min(255, grey + 6), a)   # faint cool tint matches his greys
                n += 1
    im.save(path)
    print(f"OK recolor green→grey {path}: {n} px remapped")

def make_portrait(src, out, target_h=288, frame=0, nframes=1, bust=0.62):
    """Bust portrait from a strip frame (head + upper torso), upscaled nearest-neighbor."""
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
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
    STAGE1 = [
        ("kiba_stance.png",   "kiba_idle_uniform.png"),        # idle — single clean colored pose (held static)
        ("kiba_run.png",      "kiba_run_uniform.png"),         # run — 5f cycle
        ("kiba_dash.png",     "kiba_dash_uniform.png"),        # dash — 2f + speed lines
        ("kiba_chakra_charge.png", "kiba_charge_uniform.png"), # chakra charge — 1f held pose
        ("kiba_knocked_down.png",  "kiba_knockdown_uniform.png"), # knockdown — 6f (incl. ground bounce)
    ]
    for src, out in STAGE1:
        reslice(src, out)

    # jump_guard_guard_air (358x48): 5 runs -> jump(0-2, 3f) / guard(3, 1f) / guard_air(4, 1f)
    reslice("kiba_jump_guard_guard_air.png", "kiba_jump_uniform.png",       keep=(0, 2))
    reslice("kiba_jump_guard_guard_air.png", "kiba_guard_uniform.png",      keep=(3, 3))
    reslice("kiba_jump_guard_guard_air.png", "kiba_guard_air_uniform.png",  keep=(4, 4))

    # taking_damage_taking_special_damage (247x48): 5 runs -> hurt(0-1, 2f) / hurt_special(2-4, 3f)
    reslice("kiba_taking_damage_taking_special_damage.png", "kiba_hurt_uniform.png",         keep=(0, 1))
    reslice("kiba_taking_damage_taking_special_damage.png", "kiba_hurt_special_uniform.png", keep=(2, 4))

    # taking_heavy_damage_1_2_3 (264x46): 5 runs across 3 states -> one heavy-hurt strip (all clean Kiba)
    reslice("kiba_taking_heavy_damage_1_2_3.png", "kiba_hurt_heavy_uniform.png")

    # win pose — clean colored Kiba standing pose from row_71 (akamaru_winning_pose is unusable line-art)
    reslice("kiba_row_71.png", "kiba_win_uniform.png", keep=(1, 1))

    # PORTRAIT — bust from the idle stance (clean colored frame 0). row_72 lineup art is FX-cluttered.
    make_portrait("kiba_stance.png", "kiba_portrait.png")

    # ── STAGE 2 — 5 normals + 2 bonus directional command-normals ──
    # light + air are 2-part CONTINUOUS chains → stitched into one flowing strip each.
    stitch(["kiba_attack_combo_1.png", "kiba_attack_combo_2.png"], "kiba_light_uniform.png")   # 13f + 10f fang-claw flurry
    stitch(["kiba_attack_combo_air_1.png", "kiba_attack_combo_air_2.png"], "kiba_air_uniform.png")  # 10f + 5f air claw
    reslice("kiba_strong_attack.png",    "kiba_heavy_uniform.png")      # 5f — lunging fang strike (neutral heavy)
    reslice("kiba_strong_attack_up.png", "kiba_upstrong_uniform.png")   # 10f — rising anti-air launcher
    reslice("kiba_strong_attack_down.png", "kiba_downair_uniform.png")  # 3f — down-air spike (distinct from forward, verified)
    # BONUS directional command-normals:
    reslice("kiba_strong_attack_forward.png", "kiba_fwdstrong_uniform.png")  # 3f — Fwd+Heavy lunging strong (clean colored)
    # Aerial Strong (strong_attack_air): scrub burned "STRONG ATTACK (AIR)" text (top-left) + DROP the two
    # floating-debris-head frames (indices 8, 10) → 9 clean frames. NOTE: source is OFF-PALETTE GREEN (not
    # Kiba's dark outfit) — flagged for review; wired provisionally so it reads as an aerial spin.
    reslice("kiba_strong_attack_air.png", "kiba_aerialstrong_uniform.png",
            scrub=[(0, 0, 72, 12)], pick=[0, 1, 2, 3, 4, 5, 6, 7, 9])
    # User-approved: recolor its off-palette green outfit to Kiba's neutral dark grey (visual consistency).
    recolor_green_to_grey("kiba_aerialstrong_uniform.png")

    # ── STAGE 3 — Gatsuga (2 tiers). CLEAN single-row source sheets only (the *_2 sheets carry a blue
    # "{" brace artifact + BANNED white-wolf line-art; excluded). ──
    # Weak: 6 runs; last frame carries a green annotation ellipse → keep the 5 clean frames.
    reslice("kiba_special_move_1_weak_1.png", "kiba_gatsuga_weak_uniform.png", keep=(0, 4))   # 5f stance→crouch→all-fours→lunge→drill
    # Strong: single-row sheet whose windup frames OVERLAP (column-gutter merges them) + a blue "{" brace
    # + a stray-marked full-height leftmost frame (x2-32, h89 → inflated the cell to 91px and floated the
    # render). Use the CONSISTENT-height drill frames only: all-fours crouch → orange drill → orange drill
    # → drill-travel (heights 26/61/49/37). Genuinely bigger than Weak (orange twin-drill FX).
    reslice("kiba_special_move_1_strong_gatsuga_1.png", "kiba_gatsuga_strong_uniform.png",
            xrects=[(219, 254), (395, 440), (445, 494), (504, 571)])   # 4f

    # ── STAGE 4 — Beast-Fusion. Four Legs Technique (Shikyaku no Jutsu) = the CLEAN transform frames only
    # (Stage-0: _1/_2 CONFIRMED CLEAN; _3-_6 carry the blue-block/diagram → NOT used). Two-Headed Wolf =
    # the colored twin-drill FX frames (mode_4 + mode_5); "_1"/"_2" are genuinely ABSENT (no invention). ──
    stitch(["kiba_special_move_2_four_legs_technique_1.png",
            "kiba_special_move_2_four_legs_technique_2.png"], "kiba_fourlegs_uniform.png")   # 15+15 transform
    stitch(["kiba_special_move_3_two_headed_beast_mode_4.png",
            "kiba_special_move_3_two_headed_beast_mode_5.png"], "kiba_twoheaded_uniform.png")   # 2+2 twin-drill
