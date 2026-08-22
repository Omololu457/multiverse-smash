#!/usr/bin/env python3
# Re-slice XLR8 (Ben 10) from the ipmugenofficial FULL-GAME rip
#   xlr8_ben10_game_by_ipmugenofficial_dlje0uy-fullview.jpeg  (1280x2502 JPEG)
# into CLEAN, feet-aligned uniform cells (one *_uniform.png per action), REPLACING the old
# Dragonrod-sourced ben10_xlr8_* strips (owner decision 2026-08-22: full switch to #11,
# see XLR8_ASSET_MAP.md). This sheet is RED-keyed with dark-red TEXT LABELS between sections
# and a tall HERO POSE in the top-right that vertically bridges the idle/run rows.
#
# Keying: the background (bright red ~#fe0000), the dark-red section labels, AND the JPEG
# red/orange edge halos are ALL "red-dominant" (R noticeably above G and B) -> keyed to
# transparent in one rule. The teal/black raptor sprite (R ~= G ~= B, or teal with G,B high)
# survives. STAGE 1 = movement/state only (normals/specials = Stage 2+). See XLR8_ASSET_MAP.md.
import numpy as np
from PIL import Image

SRC = "xlr8_ben10_game_by_ipmugenofficial_dlje0uy-fullview.jpeg"
ALPHA = 16
# Exclude the top-right hero pose when slicing the idle/run rows it overlaps.
HERO_XCLIP = 1000

# Per-section ROW y-bands, MEASURED from the red-keyed content scan + label OCR (not eyeballed).
# 2-row sections are one animation that wraps: row1 frames then row2 frames, left-to-right.
ROWS = {
    "idle":     [(48, 110), (142, 204)],
    "run":      [(266, 335), (364, 431)],
    "crouchjump": [(508, 571), (610, 673)],
    "guard":    [(754, 821), (847, 914)],
    "injured":  [(983, 1052)],
    # ---- Stage 2+ sections (measured now for completeness; not sliced in Stage 1) ----
    "punch":    [(1132, 1197), (1222, 1287)],
    "punch2":   [(1353, 1413), (1440, 1502)],
    "tail":     [(1586, 1647), (1681, 1743)],
    "fasterpunch": [(1795, 1858), (1901, 1965)],
    "fasterkick":  [(2069, 2139), (2168, 2238)],
    "spread":   [(2317, 2377), (2393, 2451)],
}
HERO = (1040, 40, 1276, 432)   # x0,y0,x1,y1 of the top-right hero pose (portrait source)


def load_keyed():
    """SRC -> RGBA with red bg + dark-red labels + red/orange JPEG halos keyed transparent."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    reddom = (R > G + 18) & (R > B + 18)          # bright bg, dark labels, halos
    alpha = np.where(reddom, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")


def col_runs(px, y0, y1, x0, x1, minpx=3, gap=5, minw=12):
    """Segment frames within one row-band by transparent-gap columns (x0..x1 inclusive)."""
    on = []
    for x in range(x0, x1 + 1):
        c = sum(1 for y in range(y0, y1 + 1) if px[x, y][3] > ALPHA)
        on.append(c >= minpx)
    runs = []; s = -1
    for i, v in enumerate(on):
        x = x0 + i
        if v:
            if s < 0: s = x
        elif s >= 0:
            runs.append([s, x - 1]); s = -1
    if s >= 0: runs.append([s, x1])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] <= gap: merged[-1][1] = r[1]
        else: merged.append(list(r))
    return [r for r in merged if r[1] - r[0] + 1 >= minw]


def collect_frames(im, rowbands, xclip=None, pick=None):
    """Ordered frame bboxes (x,y,w,h) across all row-bands; xclip caps the right edge."""
    W, H = im.size; px = im.load()
    xmax = (xclip - 1) if xclip else (W - 1)
    frames = []
    for (y0, y1) in rowbands:
        for rx0, rx1 in col_runs(px, y0, y1, 0, xmax):
            miny, maxy = y1 + 1, y0 - 1
            for y in range(y0, y1 + 1):
                for x in range(rx0, rx1 + 1):
                    if px[x, y][3] > ALPHA:
                        miny = min(miny, y); maxy = max(maxy, y); break
            frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    if pick is not None:
        frames = [frames[i] for i in pick]
    return frames


def reslice(im, out, section, xclip=None, pick=None):
    frames = collect_frames(im, ROWS[section], xclip, pick)
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        strip.paste(cell, (i * uW + (uW - sw) // 2, uH - sh - 1), cell)
    strip.save(out)
    print(f"OK {out}: {len(frames)} frames, cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    print(f"   anim -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH


def make_portrait(im, out, target_h=288):
    """Bust portrait cropped from the top-right hero pose (head + upper torso)."""
    hx0, hy0, hx1, hy1 = HERO
    reg = im.crop((hx0, hy0, hx1, hy1)); px = reg.load(); W, H = reg.size
    xs = [x for x in range(W) if any(px[x, y][3] > ALPHA for y in range(H))]
    ys = [y for y in range(H) if any(px[x, y][3] > ALPHA for x in range(W))]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    bust_h = int((y1 - y0 + 1) * 0.55)
    crop = reg.crop((x0, y0, x1 + 1, y0 + bust_h))
    scale = target_h / crop.height
    crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST).save(out)
    print(f"OK {out}: hero-pose bust {crop.size} -> h{target_h}")


if __name__ == "__main__":
    im = load_keyed()
    # ── STAGE 1 — movement / state (re-sourced from ipmugen #11) ──
    # idle/run: keep both rows (continuous cycles); minw=12 drops the stray 7px halo frame.
    reslice(im, "ben10_xlr8_idle_uniform.png",   "idle",  xclip=HERO_XCLIP)   # standing idle
    reslice(im, "ben10_xlr8_run_uniform.png",    "run",   xclip=HERO_XCLIP)   # run / walk / dash
    # CROUCH AND JUMP is one crouch->jump->fall cycle repeated across both rows (0-8 == 9-17);
    # slice row-1 only into distinct crouch / jump / fall.
    reslice(im, "ben10_xlr8_crouch_uniform.png", "crouchjump", pick=[0, 1])          # held low crouch
    reslice(im, "ben10_xlr8_jump_uniform.png",   "crouchjump", pick=[2, 3, 4])       # launch -> apex (fall reuses)
    reslice(im, "ben10_xlr8_fall_uniform.png",   "crouchjump", pick=[5, 6, 7])       # descent
    reslice(im, "ben10_xlr8_guard_uniform.png",  "guard")                            # GAP FILLED: real block stance
    # INJURED (1 row, 5f: hit -> stagger -> arch -> fall -> prone) -> split hurt/knockdown/getup.
    reslice(im, "ben10_xlr8_hurt_uniform.png",      "injured", pick=[0, 1])          # GAP FILLED: flinch
    reslice(im, "ben10_xlr8_knockdown_uniform.png", "injured", pick=[2, 3, 4])       # GAP FILLED: fall -> prone
    reslice(im, "ben10_xlr8_getup_uniform.png",     "injured", pick=[4, 3, 2, 1, 0]) # GAP FILLED: reversed injured (no distinct getup art — flagged)
    make_portrait(im, "ben10_xlr8_portrait.png")                                     # UPGRADE: hero-pose bust (was idle bust)

    # ── STAGE 2 — normals / combo / specials / ult (UN-MIX: re-sourced from #11 so the whole kit is
    #    one entry; overwrites the old Dragonrod front/combo filenames so kit paths don't move) ──
    reslice(im, "ben10_xlr8_front_uniform.png", "punch",  pick=[1, 2, 3, 4, 5])      # light / air / down_air / grab / Dash Strike — claw thrust
    reslice(im, "ben10_xlr8_heavy_uniform.png", "punch2", pick=[0, 1, 2, 3, 4, 5])   # heavy — committed leaning claw strike
    reslice(im, "ben10_xlr8_combo_uniform.png", "fasterpunch")                        # combo1-3 / Sonic Rush / Sonic Blitz — 18f flurry (sub-sliced via sourceX in the kit)
    # NOTE: ben10_xlr8_up_uniform.png is DELIBERATELY LEFT UNCHANGED — the Dragonrod #10 rising-attack
    # strip is kept for the up-normal (a sprite actually drawn as a rising attack), a documented
    # content-fidelity exception to the single-source switch (owner decision 2026-08-22). It reads
    # brighter-blue / slightly smaller than the #11 body — cosmetic-only, flagged in XLR8_ASSET_MAP.md.
