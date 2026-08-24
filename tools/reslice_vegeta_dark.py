#!/usr/bin/env python3
# Re-slice DARK VEGETA (rosterKey vegeta_dark) from the akuma-animation master sheet
#   dcxehsy_e41e5990_33a8_46c3_8741_ef27b60e45cc_by_mjdmadgaming_ddk5ebw.png  (1852x2421)
# into CLEAN, feet-aligned uniform cells (one *_uniform.png per action).
#
# ★ GREEN-KEY bg (0,128,0), fully opaque. Costume is black/red/white -> keys cleanly.
#   Detection order MUST match tools/vegeta_black_stage0.py (dilate=3, MIN=500, ROWTOL=60
#   row-grouping) so the pick indices below line up with vegeta_black_stage0_montage.png
#   and VEGETA_BLACK_ASSET_MAP.md.
# ★ FLIP_H=True: the sheet is drawn facing LEFT (idle fists/face on the left); the engine
#   draws P1 un-flipped expecting RIGHT-facing art -> mirror every cell.
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "dcxehsy_e41e5990_33a8_46c3_8741_ef27b60e45cc_by_mjdmadgaming_ddk5ebw.png"
# ★FACING FIX (2026-08-24): this sheet's frames are drawn facing RIGHT in the raw art (verified by a
# RELIABLE relative comparison against Goku, a known right-facer, rendered on the same side) — so they must
# NOT be flipped. The original FLIP_H=True mirrored the whole character to face LEFT (backward, away from the
# opponent). Correct value is FALSE (the engine wants right-facing base art and this sheet already is).
FLIP_H = False

def load():
    a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
    green = (g > 80) & (g < 180) & (r < 70) & (b < 70) & (g > r + 40) & (g > b + 40)
    alpha = np.where(green, 0, 255).astype('uint8')
    rgba = np.dstack([a.astype('uint8'), alpha])
    return Image.fromarray(rgba, "RGBA"), green

def detect_boxes(green):
    """Same ordering as vegeta_black_stage0.py -> global montage indices."""
    content = ~green
    mask = ndimage.binary_dilation(content, iterations=3)
    lbl, n = ndimage.label(mask)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n+1))
    boxes = []
    for i in range(1, n+1):
        if sizes[i-1] < 500:
            continue
        ys, xs = np.where(lbl == i)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        if (x1-x0+1) < 18 or (y1-y0+1) < 18:
            continue
        boxes.append([y0, x0, y1, x1])
    boxes.sort(key=lambda b: (b[0], b[1]))
    ROWTOL = 60
    rows = []
    for bx in boxes:
        for row in rows:
            if abs(row[0][0] - bx[0]) < ROWTOL:
                row.append(bx); break
        else:
            rows.append([bx])
    for row in rows:
        row.sort(key=lambda b: b[1])
    rows.sort(key=lambda r: np.mean([b[0] for b in r]))
    return [tuple(bx) for row in rows for bx in row]   # (y0,x0,y1,x1)

ALPHA = 16
def content_bbox(im, box):
    y0, x0, y1, x1 = box
    cell = np.asarray(im.crop((x0, y0, x1+1, y1+1)))
    mask = cell[:,:,3] > ALPHA
    ys, xs = np.where(mask)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())

# ★ MIXED-FACING SHEET (confirmed vs the raw art): MOST frames are drawn facing LEFT → FLIP_H=True bakes
#   them right-facing (what the engine expects). BUT the DIVE frames [13-16] are drawn facing RIGHT already,
#   so they must NOT be flipped (flip=False) or they end up backward (lunging AWAY from the opponent). Pass
#   `flip` per-strip to override the global default for such odd-facing strips.
def reslice(im, boxes, out, picks, flip=None):
    do_flip = FLIP_H if flip is None else flip
    frames = [content_bbox(im, boxes[p]) for p in picks]
    uW = max(f[2]-f[0]+1 for f in frames) + 2
    uH = max(f[3]-f[1]+1 for f in frames) + 2
    strip = Image.new("RGBA", (uW*len(frames), uH), (0,0,0,0))
    for i, (cx0, cy0, cx1, cy1) in enumerate(frames):
        cell = im.crop((cx0, cy0, cx1+1, cy1+1))
        if do_flip:
            cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
        w, h = cell.size
        strip.paste(cell, (i*uW + (uW-w)//2, uH-h-1), cell)
    strip.save(out)
    print(f"OK {out:42s}: {len(frames)}f  flip={do_flip}  {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")

def make_portrait(out, target_h=288):
    """Bust from the colored full-body reference (montage idx 12): head + chest plate."""
    full = Image.open(SRC).convert("RGB")
    a = np.asarray(full).astype(int)
    r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
    green = (g > 80) & (g < 180) & (r < 70) & (b < 70) & (g > r + 40) & (g > b + 40)
    # idx12 region (from stage0): y58-817, x1477-1718. Bust = head..upper chest (~top 42%).
    y0, y1, x0, x1 = 58, 817, 1477, 1718
    bust_y1 = y0 + int((y1 - y0) * 0.42)
    sub = np.asarray(full)[y0:bust_y1, x0:x1].copy()
    gm = green[y0:bust_y1, x0:x1]
    rgba = np.dstack([sub, np.where(gm, 0, 255).astype('uint8')])
    im = Image.fromarray(rgba, "RGBA")
    # tight crop to content
    m = np.asarray(im)[:,:,3] > 16
    ys, xs = np.where(m)
    im = im.crop((xs.min(), ys.min(), xs.max()+1, ys.max()+1))
    scale = target_h / im.height
    im = im.resize((max(1, round(im.width*scale)), target_h), Image.NEAREST)
    im.save(out)
    print(f"OK {out:42s}: {im.size} (colored-ref bust)")

if __name__ == "__main__":
    im, green = load()
    boxes = detect_boxes(green)
    print(f"detected {len(boxes)} boxes\n")

    # ── STAGE 1 — MOVEMENT / STATE (see VEGETA_BLACK_ASSET_MAP.md content map). ──
    reslice(im, boxes, "vegeta_dark_idle_uniform.png",      [0,1,2,3])            # relaxed fighting-stance idle loop (PRIMARY)
    reslice(im, boxes, "vegeta_dark_idlecross_uniform.png", [4,5,6,7])            # arms-crossed stance (alt; reserved taunt/guard)
    reslice(im, boxes, "vegeta_dark_dive_uniform.png",      [13,14,15,16])              # forward dive/lunge (4f) -> feeds jump/fall (global FLIP_H=False now — whole sheet faces right)
    reslice(im, boxes, "vegeta_dark_run_uniform.png",       [19,20,21,22,23,24,25])# 7f crouch-to-run cycle (walk borrows, slower)
    reslice(im, boxes, "vegeta_dark_hurt_uniform.png",      [28,29,30])           # standing recoil flinch (clean single poses; idx27 is a merged 2-pose box, skipped)
    reslice(im, boxes, "vegeta_dark_knockdown_uniform.png", [31,32,33,34,35,36,37,38]) # tip-over -> sprawl -> lie
    reslice(im, boxes, "vegeta_dark_getup_uniform.png",     [39,40,41,42,43,44])  # roll -> rise -> stand
    make_portrait("vegeta_dark_portrait.png")

    # ── STAGE 2 — NORMALS (all CONFIRMED distinct art via direct frame review; dmg ×0.60 via
    #    GLOBAL_DAMAGE_SCALE). down_air REUSES air (project pattern). Blade-FX frames (65,72,85,86)
    #    + ki-blasts (96-98) are Stage-4 SPECIALS → excluded. RESERVED for the Stage-3 command chain:
    #    lunging straight [55-58], rapid flurry [89-95]. ──
    reslice(im, boxes, "vegeta_dark_light_uniform.png",       [50,51,52])   # jab — quick straight punch string
    reslice(im, boxes, "vegeta_dark_heavy_uniform.png",       [80,81,82])   # side kick — long horizontal reach (committed heavy)
    reslice(im, boxes, "vegeta_dark_up_uniform.png",          [69,70,71])   # uppercut — rising fist LAUNCHER (own art)
    reslice(im, boxes, "vegeta_dark_air_uniform.png",         [67,68])      # airborne jump kick (down_air reuses this)
    reslice(im, boxes, "vegeta_dark_crouchlight_uniform.png", [78])         # Down+B — clean low ducked poke (idx64 had motion-streak artifacts; 79/84 carry blade trails → single clean frame)

    # ── STAGE 3 — COMMAND CHAIN "Villain's Rush": Fwd+Heavy 3-stage rekka (re-tap Heavy to continue,
    #    cancel-on-hit). Chain order CONFIRMED via direct frame review (subagent): opener=deep lunge→
    #    two-handed thrust / mid=rapid flurry MULTI-HIT / ender=streak-punch → rising uppercut LAUNCHER
    #    (idx95 = the sheet's one true launcher arc). Rendered by move name via updateVegetaDarkCommandCombat. ──
    reslice(im, boxes, "vegeta_dark_rush1_uniform.png", [55,56,57])   # opener — deep forward lunge → two-handed thrust
    reslice(im, boxes, "vegeta_dark_rush2_uniform.png", [91,92,93])   # mid — rapid flurry (multi-hit barrage)
    # rush3 (LAUNCHER ender) REUSES the up-normal uppercut art [69-71] — the sheet's confirmed-clean rising
    # uppercut. Standalone [94,95] read as swing-and-recover (subagent), so the launcher borrows the clean
    # up-normal (documented reuse, like down_air↔air). No separate rush3 sheet is emitted.

    # ── STAGE 4 — SPECIALS cast/attack poses (subagent-picked). Projectiles are PROCEDURAL (ki sphere /
    #    sickle crescent) — the sheet's blast art is illustrative (Vegito/Gwen/Vilgax pattern). ──
    reslice(im, boxes, "vegeta_dark_kicast_uniform.png", [112,113])   # Ki Blast — hands-forward firing pose
    reslice(im, boxes, "vegeta_dark_knife_uniform.png",  [86])        # Knife Slash (F) — straight diagonal cut (real red slash art)
    reslice(im, boxes, "vegeta_dark_sickle_uniform.png", [85])        # Sickle Throw (B) — curved-crescent throw cast pose

    # ── STAGE 5 — dark-aura TRANSFORMATION morph pose (REAL aura-buildup art [45-48]: black-spike aura +
    #    purple body-rim). Plays once on enter (the power-up cinematic), then reverts to normal actions with
    #    a procedural purple aura overlay while the form is sustained. NO costume/hair swap (item-1 correction). ──
    reslice(im, boxes, "vegeta_dark_aura_uniform.png", [45,46,47,48])

    # ── STAGE 6 — WIN / INTRO (real on-sheet art). lose = REUSE knockdown/lying (no dedicated lose art). ──
    reslice(im, boxes, "vegeta_dark_win_uniform.png",   [168,169,170,171,172])   # WIN — arms-crossed laughing/taunting victory
    reslice(im, boxes, "vegeta_dark_intro_uniform.png", [173,174,175,176,177])   # INTRO — dark-tendril columns part → reveal Vegeta (owner: intro vs 2nd-stage)
