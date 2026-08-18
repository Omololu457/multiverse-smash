#!/usr/bin/env python3
# Re-slice Light Yagami (Death Note, JUS sprite by prodijiu) source art into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_boruto.py / reslice_byakuya.py (alpha-gutter frame detect -> per-frame content bbox ->
# repack into one uniform cell: centered-X, BOTTOM-aligned) so a single anchorY: 0 plants feet across every
# standing action. Same band/keep/pick/xrects/minw/pingpong knobs.
#
# SOURCE FORMAT: per-action files (light_yagami_<action>.png), already extracted from the master JUS sheet.
# Several files carry TWO segments in one strip (stand_defense = STAND + DEFENSE; run_dash = RUN + DASH) that
# are split by `keep=` frame ranges AFTER column slicing.
#
# STAGE-0 / CONFIRMED-DESIGN pre-processing (see memory light-yagami-build):
#   * NO keyblack — the #000000-outline vs #050505-fill trick must survive; keying black would erase it.
#   * run_dash x=145 1px stray + koma_special_attacks x=578 1px stray auto-dropped by minw>=4 (audit's own
#     confirmed artifacts — never real frames).
#   * DEDUP: the 10-frame B body chain (b/b_forward/win_lose/koma) + jump's first-3 frames (jump_b/jump_y/
#     y_up) are stored once at their source file; call sites reference those strips (no duplicate cells).
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

def reslice(src, out, band=None, keep=None, pick=None, xrects=None, minw=4, pad_to=None, pingpong=False, split=None):
    im = Image.open(src).convert("RGBA"); W, H = im.size
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
    # SPLIT one detected run (idx) into N equal-width columns — for a gapless composite the column slicer can't
    # separate (e.g. the ultimate's 124px "writing" block = 4 touching Light poses). No alpha gutter → equal cut.
    if split is not None:
        idx, n = split
        rx0, rx1 = runs[idx]; step = (rx1 - rx0 + 1) / n
        sub = [[int(round(rx0 + i * step)), int(round(rx0 + (i + 1) * step)) - 1] for i in range(n)]
        runs = runs[:idx] + sub + runs[idx + 1:]
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
    # PING-PONG: bake a 1->N->1 bounce into the strip (no engine yoyo) so a straight loop reads smoothly.
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

def make_portrait_rect(src, out, x0, x1, target_h=288, bust=1.0):
    """Portrait from an explicit x-range of a RAGGED strip (row_01's dedicated 46px face mugshot). Vertically
    bbox the content in [x0,x1], optionally keep the top `bust` fraction, upscale NEAREST to target_h."""
    im = Image.open(src).convert("RGBA"); H = im.height; px = im.load()
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    h = int((y1 - y0 + 1) * bust)
    crop = im.crop((x0, y0, x1 + 1, y0 + h))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (face portrait from {src} x[{x0},{x1}])")

def make_portrait(src, out, target_h=288, frame=0, nframes=1, bust=0.62):
    im = Image.open(src).convert("RGBA")
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
    # stand_defense: STAND (3f, cells 0-2) + DEFENSE (3f, cells 3-5). Idle ping-pongs 1->3->1 (no yoyo engine).
    reslice("light_yagami_stand_defense.png", "light_idle_uniform.png",  keep=(0, 2), pingpong=True)  # idle 3f -> 1->3->1
    reslice("light_yagami_stand_defense.png", "light_guard_uniform.png", keep=(3, 5))                 # guard raise/hold/recoil (hold f2)
    # run_dash: RUN (7f, cells 0-6; the 1px stray at x=145 is auto-dropped) + DASH (8f, cells 7-14).
    reslice("light_yagami_run_dash.png", "light_run_uniform.png",  keep=(0, 6))    # run cycle (7f)
    reslice("light_yagami_run_dash.png", "light_dash_uniform.png", keep=(7, 14))   # dash burst (8f, wide cells)
    # jump: 6f (first 3 are the shared base reused by jump_b/jump_y/y_up — stored once here).
    reslice("light_yagami_jump.png", "light_jump_uniform.png")                     # jump/fall arc (6f)
    # damage: 4f hit-reaction -> knockdown (notebook drops on the final frame — preserved).
    reslice("light_yagami_damage.png", "light_hurt_uniform.png")                   # hurt/knockdown (4f)

    # PORTRAIT — placeholder bust from the idle stance frame 0 (final row_01 face portrait chosen at Stage 7).
    make_portrait("light_yagami_stand_defense.png", "light_portrait.png")

    # ── STAGE 2 — normals (B family). Each source strip = a 10f body chain + a trailing FX set. DEDUP: the
    # 10-frame body chain (22,22,22,24,24,24,24,29,27,23) is IDENTICAL in b/b_forward → stored ONCE from b.png
    # and reused by both the `light` and `heavy` sprite keys. Only the FX set differs (gold vs blue crescent),
    # spawned as a separate overlay at the hitbox origin (game.drawLightNormalFx), NOT baked onto the body. ──
    reslice("light_yagami_b.png",         "light_b_body_uniform.png",   keep=(0, 9))    # shared B body chain (10f) — drives light + heavy
    reslice("light_yagami_b.png",         "light_b_goldfx_uniform.png", keep=(10, 15))  # B (neutral) gold spark FX (6f)
    reslice("light_yagami_b_forward.png", "light_bfwd_bluefx_uniform.png", keep=(10, 16))  # B+Forward blue crescent-arc FX (7f)
    reslice("light_yagami_b_down.png",    "light_bdown_uniform.png")                    # B+Down crouch swipe (6f, no FX)

    # ── STAGE 4 — specials (Y family + reclassified B+Up). Each source sheet = [Light cast body + laugh] +
    # [summoned call-in / FX frames]. The summons (Ryuk / L / gunman / vortex / violet burst) are one-shot
    # spawns tied to the cast's active window (Ghostface phantom-hitbox idiom — NOT persistent assists): they
    # ride a spawnProjectile as the projectile's own sprite sheet. DEDUP: every ground special shares ONE cast
    # pose (identical "gesture + laugh" body, 22px frames across b_up/y/y_forward/y_down) → light_cast; both
    # air specials share light_aircast (the jump base). The 11px laugh cell (クックック) is kept in the cast.
    reslice("light_yagami_y.png",         "light_cast_uniform.png",     keep=(0, 2))    # SHARED ground cast — gesture + laugh (3f)
    reslice("light_yagami_jump_b.png",    "light_aircast_uniform.png",  keep=(0, 2))    # SHARED air cast — jump base (3f, deduped jump-first-3)
    # summon / FX sheets (drive the projectile sprites):
    reslice("light_yagami_b_up.png",      "light_ryuk_uniform.png",     keep=(3, 7))    # Ryuk anti-air — 5f (~64px)
    reslice("light_yagami_y.png",         "light_vortex_uniform.png",   keep=(3, 6))    # Y neutral vortex — 4f blue-white (~83px, widest)
    reslice("light_yagami_y_up.png",      "light_lrising_uniform.png",  keep=(3, 9))    # L rising burst — 7f (golden ring → spark → L)
    reslice("light_yagami_y_forward.png", "light_ldivekick_uniform.png", keep=(3, 6))   # L diving kick — 4f (violet crescent baked, Ryuk palette)
    reslice("light_yagami_y_down.png",    "light_violet_uniform.png",   keep=(3, 5))    # violet burst — 3f (grow → strike → dissipate)
    reslice("light_yagami_jump_b.png",    "light_gunman_uniform.png",   keep=(3, 10))   # gunman rocket — 8f (unnamed lavender gunman, peaks 97px)
    reslice("light_yagami_jump_y.png",    "light_airfigure_uniform.png", keep=(0, 4))   # air punch figure — 5f (lavender figure punch + burst)

    # ── STAGE 5 — ULTIMATE "As Planned" (Death Note writing). ultimate_action = 3 startup + ONE 124px block
    # (4 touching Light-writing poses, no alpha gap → split into 4) + 3 recovery (matches B recovery tail).
    # → 10f cast strip: startup → writing animation → recovery. The LIVE fighter plays this over the cinematic.
    reslice("light_yagami_ultimate_action.png", "light_ultwrite_uniform.png", split=(3, 4))   # 3 + 4(split) + 3 = 10f

    # ── STAGE 6 — 2nd ULTIMATE "I Am Kira" (notebook→scythe). koma_special_attacks = [94px "I'M KIRA" cut-in
    # panel] + [3 small body] + [6 scythe-transform frames] (1px stray x=578 auto-dropped by minw). The scythe
    # cast = body → notebook-into-scythe → swing (9f); the panel is a fullscreen cinematic flash overlay.
    reslice("light_yagami_koma_special_attacks.png", "light_scythe_uniform.png", keep=(1, 9))   # body + scythe transform/swing (9f)
    reslice("light_yagami_koma_special_attacks.png", "light_kira_panel.png",     keep=(0, 0))   # "THAT'S RIGHT. I'M KIRA." cut-in panel (1f, cinematic overlay)
    # koma.png = ["JUST AS PLANNED" cut-in] + [10f B body (deduped)] + [2 body + laugh]. Only the panel is used
    # here — as the "As Planned" writing-ultimate cut-in flash (parallels the scythe ult's I'M KIRA panel).
    reslice("light_yagami_koma.png", "light_asplanned_panel.png", keep=(0, 0))                   # "JUST AS PLANNED" cut-in panel (1f, writing-ult overlay)

    # ── STAGE 7 — portrait + win/lose. row_01 = [title balloon (discard)] + [46px FACE (portrait)] + [24px body
    # (select preview)] + [diamond-ring frags (koma-only, unused)]. win_lose = [10f B body (WIN, deduped → reuse
    # light_b_body_uniform)] + [2 body + laugh (LOSE)]. Real face portrait REPLACES the Stage-1 idle-bust placeholder.
    make_portrait_rect("light_yagami_row_01.png", "light_portrait.png", 213, 258)                # dedicated 46px face mugshot
    reslice("light_yagami_win_lose.png", "light_lose_uniform.png", keep=(10, 12))                # LOSE — 2 body + laugh (Ryuk laughs at his defeat)
