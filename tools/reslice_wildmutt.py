#!/usr/bin/env python3
# Re-slice Wildmutt (Ben 10) from the #13 Dragonrod sheet
#   wildmutt_by_dragonrod342_davs1vq.png  (608x720 PNG, opaque, WHITE bg)
# into feet-aligned uniform cells (one *_uniform.png per action). Orange Vulpimancer, UNLABELED sheet
# → row identities come from a direct visual pass (see WILDMUTT_ASSET_MAP.md). Key = white→transparent.
#
# ★ PROVISIONAL — authored under an image-viewing cap: slice OUTPUT was NOT visually confirmed this
# session. HIGH-confidence rows: r0 idle, r5 pounce leap-arc, r8 spinning-ball roll (Feral Frenzy ult).
# MED/LOW: the upper locomotion rows (r1-r4) segment messily (merged/fragment frames). Frame→slot picks
# here are best-effort; PIXEL SIGN-OFF is DEFERRED to a fresh session. r10 = directional →← arrows (EXCLUDE).
import numpy as np
from PIL import Image

SRC = "wildmutt_by_dragonrod342_davs1vq.png"
ALPHA = 16

# MEASURED sub-row y-bands (fine white-key scan). Confidence noted.
ROWS = {
    "idle":    [(16, 56)],       # HIGH — 2f hunched stand
    "stride":  [(181, 252)],     # MED  — upper locomotion block (walk/run/dash candidate)
    "pounce":  [(304, 347)],     # HIGH — leap arc (Pounce special; jump/fall source)
    "land":    [(368, 412)],     # MED  — landing / crouch recovery
    "roll":    [(487, 539)],     # HIGH — ★ spinning-ball roll (Feral Frenzy ULT), 10f
    "bite":    [(554, 589)],     # MED  — crouch + bite (normals candidate)
    # r10 (610-638) = →← arrow annotations — NOT sliced.
}


def load_keyed():
    """SRC -> RGBA with the white background keyed transparent (orange sprite kept)."""
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    white = (R > 235) & (G > 235) & (B > 235)
    alpha = np.where(white, 0, 255).astype("uint8")
    return Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")


def col_runs(px, y0, y1, minpx=2, gap=7, minw=18):
    """Segment frames in a row-band by transparent-gap columns. minw=18 drops fragment limbs."""
    W = px.size if False else None
    return None  # placeholder (unused)


def _segment(im, y0, y1, minpx=2, gap=7, minw=18):
    W, H = im.size; px = im.load()
    on = [sum(1 for y in range(y0, y1 + 1) if px[x, y][3] > ALPHA) >= minpx for x in range(W)]
    runs = []; s = -1
    for x in range(W):
        if on[x]:
            if s < 0: s = x
        elif s >= 0:
            runs.append([s, x - 1]); s = -1
    if s >= 0: runs.append([s, W - 1])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] <= gap: merged[-1][1] = r[1]
        else: merged.append(list(r))
    return [r for r in merged if r[1] - r[0] + 1 >= minw]


def reslice(im, out, section, pick=None):
    y0, y1 = ROWS[section][0]
    runs = _segment(im, y0, y1)
    if pick is not None:
        runs = [runs[i] for i in pick if i < len(runs)]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = y1 + 1, y0 - 1
        px = im.load()
        for y in range(y0, y1 + 1):
            for x in range(rx0, rx1 + 1):
                if px[x, y][3] > ALPHA:
                    miny = min(miny, y); maxy = max(maxy, y); break
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    covs = []
    for i, (sx, sy, sw, sh) in enumerate(frames):
        cell = im.crop((sx, sy, sx + sw, sy + sh))
        strip.paste(cell, (i * uW + (uW - sw) // 2, uH - sh - 1), cell)
        arr = np.asarray(cell)[:, :, 3] > ALPHA
        covs.append(round(float(arr.mean()), 2))
    strip.save(out)
    print(f"OK {out}: {len(frames)}f cell {uW}x{uH} widths={[f[2] for f in frames]} cover={covs}")
    return len(frames), uW, uH


def make_portrait(im, section, out, target_h=288):
    y0, y1 = ROWS[section][0]
    runs = _segment(im, y0, y1); px = im.load()
    rx0, rx1 = runs[0]
    ys = [y for y in range(y0, y1 + 1) for x in range(rx0, rx1 + 1) if px[x, y][3] > ALPHA]
    yy0, yy1 = min(ys), max(ys)
    crop = im.crop((rx0, yy0, rx1 + 1, yy1 + 1))
    scale = target_h / crop.height
    crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST).save(out)
    print(f"OK {out}: idle bust {crop.size} -> h{target_h}")


if __name__ == "__main__":
    im = load_keyed()
    # ── STAGE 1 — movement / state (provisional; pixel sign-off deferred) ──
    reslice(im, "ben10_wildmutt_idle_uniform.png",   "idle")                    # HIGH
    # 'stride' row is 74px tall vs idle 43px — programmatic red flag that it's REARING/LUNGE poses, not a
    # low quadruped walk. Emitted as REFERENCE only (NOT wired as walk); the true locomotion row (likely
    # the short, messy r1/r2) needs the deferred visual pass to slice cleanly. walk/run/dash reuse idle for now.
    reslice(im, "ben10_wildmutt_stride_uniform.png", "stride")                  # REFERENCE (unwired)
    reslice(im, "ben10_wildmutt_jump_uniform.png",   "pounce", pick=[1,2,3,4,5])# MED — leap (drop merged f0); jump/fall
    reslice(im, "ben10_wildmutt_land_uniform.png",   "land")                    # MED
    make_portrait(im, "idle", "ben10_wildmutt_portrait.png")
    # ── emitted now for later stages (confident content) ──
    reslice(im, "ben10_wildmutt_pounce_uniform.png", "pounce")                  # HIGH — Pounce special (Stage 4)
    reslice(im, "ben10_wildmutt_roll_uniform.png",   "roll")                    # HIGH — Feral Frenzy ULT (Stage 5)
    reslice(im, "ben10_wildmutt_bite_uniform.png",   "bite")                    # MED — normals (Stage 2)
