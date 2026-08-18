#!/usr/bin/env python3
# Re-slice L "Ryuuzaki" (Death Note — L Lawliet) source art into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_light.py (same Death Note universe / schema-exception pattern): alpha-gutter
# column frame-detect -> per-frame content bbox -> repack into one uniform cell (centered-X,
# BOTTOM-aligned) so a single anchorY: 0 plants feet across every standing action.
#
# SOURCE FORMAT: per-action KEYED strips in l_ryuuzaki_sprite_rows_sliced/ (teal bg already keyed to
# transparent by tools/slice_l_ryuuzaki.py; RAW originals in l_ryuuzaki_sprite_rows/ are NOT touched).
# Reuses the reslice_light.py keying/scan logic (ALPHA gutter, minw debris drop, keep=, pingpong,
# make_portrait). Measured frame counts are in L_RYUUZAKI_ASSET_MAP.md.
#
# STAGE-1 pre-processing notes (from the audit):
#   * row_20 (standing idle): 15 detected runs — the LAST 2 (widths 32,17) are dark DEBRIS ISLANDS,
#     not real frames -> keep=(0,12) drops them. Ping-ponged 1->N->1 for a smooth breathing loop.
#   * knockdown: 11 detected runs — the LAST (width 4) is a 3px DEBRIS SLIVER -> keep=(0,9). getup
#     pose reuses this strip's f10 in-engine (no duplicate art).
#   * idle_face: 5 runs — frame 0 (width ~46) is L's FACE bust -> portrait. The other 4 are STRAY
#     RYUK frames (reserved for Stage 5) -> NOT included in the Stage-1 portrait crop.
import sys
from PIL import Image

SRC = "l_ryuuzaki_sprite_rows_sliced/"
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

def reslice(src, out, band=None, keep=None, pick=None, minw=4, pad_to=None, pingpong=False):
    im = Image.open(SRC + src).convert("RGBA"); W, H = im.size
    px = im.load()
    y0, y1 = (0, H - 1) if band is None else band
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

def _detect_frames(src, minw=4):
    """Return (im, [(x0,y0,w,h), ...]) — per-frame CONTENT bboxes for one keyed strip (alpha-gutter
    column scan + per-frame tight vertical bbox). Shared by reslice() logic; used by reslice_multi()."""
    im = Image.open(SRC + src).convert("RGBA"); W, H = im.size
    px = im.load()
    runs = runs_of(px, 0, W - 1, 0, H - 1)
    runs = [r for r in runs if (r[1] - r[0] + 1) >= minw]
    frames = []
    for rx0, rx1 in runs:
        miny, maxy = H, -1
        for y in range(H):
            for x in range(rx0, rx1 + 1):
                if px[x, y][3] > ALPHA:
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    break
        frames.append((rx0, miny, rx1 - rx0 + 1, maxy - miny + 1))
    return im, frames

def reslice_multi(seq, out, pad_to=None):
    """Assemble ONE uniform, feet-aligned sheet from frames drawn across MULTIPLE source strips.
    `seq` = list of (src, one_based_frame_index). Each cell is centered-X, BOTTOM-aligned so the shared
    anchorY:0 plants feet across the whole string (matches reslice()). Used by the Stage-3 command chain,
    which UNIONS de-duplicated frames from row_07 (spine) + row_16 + row_17 + row_13. Every frame is
    emitted exactly ONCE (the caller passes the de-duped order; confirmed identical frames are omitted)."""
    cells = []
    cache = {}
    for src, fi in seq:
        if src not in cache:
            cache[src] = _detect_frames(src)
        im, frames = cache[src]
        sx, sy, sw, sh = frames[fi - 1]
        cells.append((im.crop((sx, sy, sx + sw, sy + sh)), sw, sh))
    uW = max(c[1] for c in cells) + 2
    uH = max(c[2] for c in cells) + 2
    if pad_to is not None:
        uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, (cell, sw, sh) in enumerate(cells):
        dx = i * uW + (uW - sw) // 2
        dy = uH - sh - 1
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"OK {out}: {len(cells)} frames, cell {uW}x{uH}  order={['{}#{}'.format(s.replace('l_ryuuzaki_','').replace('.png',''), fi) for s, fi in seq]}")
    print(f"   animationData -> {{ frames: {len(cells)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(cells), uW, uH

def make_portrait(src, out, target_h=288, frame=0, nframes=1, bust=0.62):
    """Portrait bust from one frame of a RAGGED strip: bbox that frame's content, keep top `bust`
    fraction, upscale NEAREST to target_h. For idle_face frame 0 = L's face (the 4 Ryuk frames are
    Stage-5 content and are excluded by cropping only frame 0)."""
    im = Image.open(SRC + src).convert("RGBA")
    W, H = im.size; px = im.load()
    # detect the FIRST content run (frame 0), independent of the trailing Ryuk frames.
    runs = runs_of(px, 0, W - 1, 0, H - 1)
    runs = [r for r in runs if (r[1] - r[0] + 1) >= 4]
    x0, x1 = runs[frame]
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > ALPHA]
    y0, y1 = min(ys), max(ys)
    bust_h = int((y1 - y0 + 1) * bust)
    crop = im.crop((x0, y0, x1 + 1, y0 + bust_h))
    scale = target_h / crop.height
    big = crop.resize((max(1, round(crop.width * scale)), target_h), Image.NEAREST)
    big.save(out)
    print(f"OK {out}: {big.size} (L face bust from {src} frame {frame} — Ryuk frames excluded)")

if __name__ == "__main__":
    # ── STAGE 1 — movement / state ──
    # idle (standing) — row_20; drop the trailing 2 debris islands (keep=(0,12)); ping-pong loop.
    reslice("l_ryuuzaki_row_20.png", "l_ryuuzaki_idle_uniform.png", keep=(0, 12), pingpong=True)
    # SEATED idle (contextual variant + win-pose) — row_22 (14 clean frames).
    reslice("l_ryuuzaki_row_22.png", "l_ryuuzaki_idle_seated_uniform.png")
    # walk (4f) / run (row_05, 10f run cycle).
    reslice("l_ryuuzaki_walk.png",   "l_ryuuzaki_walk_uniform.png")
    reslice("l_ryuuzaki_row_05.png", "l_ryuuzaki_run_uniform.png")
    # dash — cleanest cells of the run cycle (row_05 tail = faster lunge frames).
    reslice("l_ryuuzaki_row_05.png", "l_ryuuzaki_dash_uniform.png")
    # jump / fall — the capoeira acro (row_07, 8f) doubles as air-state.
    reslice("l_ryuuzaki_row_07.png", "l_ryuuzaki_jump_uniform.png")
    # hurt / knockdown / getup — knockdown; drop the trailing 3px debris sliver (keep=(0,9)).
    reslice("l_ryuuzaki_knockdown.png", "l_ryuuzaki_knockdown_uniform.png", keep=(0, 9))
    # taunt — accusing point (5f).
    reslice("l_ryuuzaki_point.png", "l_ryuuzaki_taunt_uniform.png")

    # ── STAGE 2 — 5 normals (golden-arc/energy FX family; the gold arc is BAKED into the source
    # frames, so NO separate FX overlay is generated — the swing art carries it). Each strip is
    # resliced to a uniform, feet-aligned (centered-X, BOTTOM-aligned) cell so the shared anchorY:0
    # plants feet across every normal, matching the movement/state sheets. Frame counts per the audit. ──
    # light — row_09: quick straight punch / jab (4f), small gold spark on the jab.
    reslice("l_ryuuzaki_row_09.png", "l_ryuuzaki_light_uniform.png")
    # heavy — row_10: heavier punch/palm + large GOLDEN SWIPE baked in (4f).
    reslice("l_ryuuzaki_row_10.png", "l_ryuuzaki_heavy_uniform.png")
    # up (launcher) — row_11: rising uppercut/hook + upward GOLDEN ARC baked in (5f).
    reslice("l_ryuuzaki_row_11.png", "l_ryuuzaki_up_uniform.png")
    # air — row_12: airborne spin kick + full GOLDEN CRESCENT baked in (5f).
    reslice("l_ryuuzaki_row_12.png", "l_ryuuzaki_air_uniform.png")
    # down_air — row_13: downward dive/plunge + golden flame-trail (3f). SHARED ART — this same strip
    # double-serves the Stage-3 command chain (approved shared-art, knockdown-getup precedent).
    reslice("l_ryuuzaki_row_13.png", "l_ryuuzaki_downair_uniform.png")

    # ── STAGE 3 — merged capoeira COMMAND-NORMAL CHAIN (3-stage cancelable rekka). ──
    # ONE continuous acrobatic motion fragmented across row_07 (the SPINE) + row_16 + row_17 + row_13.
    # Assembled by UNIONING the unique frames in motion order and DE-DUPLICATING on the confirmed
    # exact-pixel identical frames (verified this session by MD5-hashing each tight-bboxed frame):
    #   row_07 f2 == row_16 f1   (shared low-crouch entry)
    #   row_07 f3 == row_07 f7 == row_17 f4
    #   row_07 f4 == row_07 f8 == row_17 f5
    #   row_07 f6 == row_13 f3   (shared dive/plunge tail — ALSO Stage-2 down_air, kept intact)
    # No frame is emitted twice. row_13 f1/f2 add the downward dive; row_16 adds the low entry + aerial
    # cartwheel; row_17 adds the strong rising crescent. The getup pose (knockdown f10 == row_07 f1) is
    # reused IN-ENGINE, so row_07 f1 appears here only as the string's own opening stance.
    # The chain splits into 3 escalating beats → 3 rekka stages (Mayuri cmd1→cmd2 precedent):
    #   CMD1 = LOW SWEEP ENTRY  (drop into a low capoeira crouch, leg out)
    #   CMD2 = RISING CRESCENT  (rise into the big upward gold-arc kick — strong hit)
    #   CMD3 = AERIAL DIVE      (spin/cartwheel into the downward plunge — launcher finisher)
    # 16 UNIQUE frames total (5 + 4 + 7). One shared cell size across all three so anchorY:0 lines up.
    STAGE3_PAD = (56, 50)   # common cell so all three stages plant feet on the same baseline
    reslice_multi([("l_ryuuzaki_row_07.png", 1), ("l_ryuuzaki_row_07.png", 2),   # f2==row_16 f1 (dedup: emit row_07 f2)
                   ("l_ryuuzaki_row_16.png", 2), ("l_ryuuzaki_row_16.png", 3),
                   ("l_ryuuzaki_row_16.png", 4)],
                  "l_ryuuzaki_cmd1_uniform.png", pad_to=STAGE3_PAD)   # LOW SWEEP ENTRY (5f)
    reslice_multi([("l_ryuuzaki_row_17.png", 1), ("l_ryuuzaki_row_17.png", 2),
                   ("l_ryuuzaki_row_17.png", 3),                                   # peak rising crescent (biggest arc)
                   ("l_ryuuzaki_row_07.png", 3)],                                  # ==row_17 f4 (dedup: emit row_07 f3)
                  "l_ryuuzaki_cmd2_uniform.png", pad_to=STAGE3_PAD)   # RISING CRESCENT (4f)
    reslice_multi([("l_ryuuzaki_row_07.png", 4),                                   # ==row_17 f5 (dedup: emit row_07 f4)
                   ("l_ryuuzaki_row_07.png", 5),                                   # airborne spin apex
                   ("l_ryuuzaki_row_16.png", 5), ("l_ryuuzaki_row_16.png", 6),     # aerial cartwheel + gold trail
                   ("l_ryuuzaki_row_13.png", 1), ("l_ryuuzaki_row_13.png", 2),     # descend + downward dive plunge
                   ("l_ryuuzaki_row_07.png", 6)],                                  # ==row_13 f3 landing/recovery
                  "l_ryuuzaki_cmd3_uniform.png", pad_to=STAGE3_PAD)   # AERIAL DIVE finisher (7f)

    # ── STAGE 4 — 4 specials + the kick_trail EX (dir-branched executeLRyuuzakiSpecial, Light pattern).
    # Each move plays a CAST POSE (fighter animationData) then fires a ONE-SHOT phantom-hitbox projectile
    # whose sprite IS the FX/summon sheet (Light LIGHT_SUMMONS idiom). We reslice each source strip TWICE
    # where a move needs a distinct cast pose vs. a projectile sprite; where the whole strip reads as one
    # continuous FX (nova / rising burst / notebook), the SAME uniform sheet serves as both cast + proj. ──
    #
    # Golden NOVA (neutral) — row_19 (4f, massive golden burst; tallest strip, fills the full 60px). The
    # whole strip is the burst — used as BOTH the cast pose and the projectile sprite (biggest hitbox).
    reslice("l_ryuuzaki_row_19.png", "l_ryuuzaki_nova_uniform.png")
    # BAZOOKA (Forward) — gun_rocket (8f: windup → muzzle-flash → traveling blast → recovery). Split:
    #   * CAST = the first 4 frames (L shoulders + fires the launcher) → the fighter pose.
    #   * PROJ = the last 4 frames (the muzzle-flash → traveling blast) → the traveling projectile sprite,
    #     mirroring Light's gunman (the blast IS the projectile). One strip, two crops (Isshiki keyblack idiom).
    reslice("l_ryuuzaki_gun_rocket.png", "l_ryuuzaki_bazooka_cast_uniform.png", keep=(0, 3))
    reslice("l_ryuuzaki_gun_rocket.png", "l_ryuuzaki_bazooka_proj_uniform.png", keep=(4, 7))
    # Golden RISING BURST (Back) — row_14 (10f rising golden energy; f6-7 peak). Split:
    #   * CAST = the first 5 frames (L's rising melee wind-up) → the fighter pose.
    #   * PROJ = the peak burst frames (6-10 → the rising gold column) → the launcher projectile sprite.
    reslice("l_ryuuzaki_row_14.png", "l_ryuuzaki_rising_cast_uniform.png", keep=(0, 4))
    reslice("l_ryuuzaki_row_14.png", "l_ryuuzaki_rising_proj_uniform.png", keep=(5, 9))
    # INVESTIGATION / ANALYSIS (Down) — row_21 (12f: red notebook-item grows f1-8, held steady f9-12).
    # NON-LETHAL self-buff (Mayuri Lab Coat precedent). The WHOLE strip is the manifest-and-hold cast pose
    # (no projectile — it deals no damage). One uniform sheet = the cast/hold animation.
    reslice("l_ryuuzaki_row_21.png", "l_ryuuzaki_analysis_uniform.png")
    # EX — kick_trail (8f multi-hit capoeira flurry; row_15 is its subset). Cancel-ONLY flurry. The whole
    # strip is the flurry pose (78px tall — the fullest capture). One uniform sheet = the EX attack pose.
    reslice("l_ryuuzaki_kick_trail.png", "l_ryuuzaki_kicktrail_uniform.png")

    # ── STAGE 5 — RYUK cameo-attack (Up special). Ryuk is L's ONLY offensive summon (audit constraint:
    # NO Ryuk attack frames exist — idle/hover + laugh/lunge only). Mechanics reuse Light's LIGHT_SUMMONS.ryuk
    # verbatim in SHAPE, but the sprite points at L's OWN Ryuk art (NOT light_ryuk_uniform.png).
    #
    # idle_face SPLIT (done here): idle_face = 5 runs — run 0 (w~46) is L's FACE bust (portrait, below) and
    # runs 1-4 (w~45) are 4 STRAY RYUK crouch/walk frames. Those 4 frames are REASSIGNED into the Ryuk
    # content pool here (via reslice keep=(1,4)) as a small companion sheet. The face-bust portrait is
    # cropped ONLY from run 0 by make_portrait (Ryuk frames excluded) — l_ryuuzaki_portrait.png is untouched.
    reslice("l_ryuuzaki_idle_face.png", "l_ryuuzaki_ryuk_walk_uniform.png", keep=(1, 4))   # 4 reassigned Ryuk frames
    #
    # PRIMARY summon/projectile sheet — Ryuk SWOOPING IN. Assembled cross-strip (reslice_multi, bottom-
    # aligned so the shared cell plants Ryuk consistently) so the projectile reads hover-lead-in → laugh-lunge
    # STRIKE (the moment of attack). Order: 2 hover frames (ryuk_monster_row1 = idle/hover, gaunt shinigami
    # feathered wings) → the full 5-frame laugh/lunge (ryuk_monster_row2 = the dynamic swoop-and-cackle strike).
    # Ryuk is a LARGER entity (own ~62px scale vs L's ~50px) → the summon sheet gets a bigger spriteScale
    # (sc 1.3, matching Light's ryuk) so he LOOMS over the target.
    reslice_multi([("l_ryuuzaki_ryuk_monster_row1.png", 1), ("l_ryuuzaki_ryuk_monster_row1.png", 2),   # hover lead-in
                   ("l_ryuuzaki_ryuk_monster_row2.png", 1), ("l_ryuuzaki_ryuk_monster_row2.png", 2),
                   ("l_ryuuzaki_ryuk_monster_row2.png", 3), ("l_ryuuzaki_ryuk_monster_row2.png", 4),
                   ("l_ryuuzaki_ryuk_monster_row2.png", 5)],                                            # laugh/lunge STRIKE
                  "l_ryuuzaki_ryuk_uniform.png")   # 7f Ryuk swoop-in (hover → laugh-lunge)

    # PORTRAIT — L face-bust from idle_face frame 0 ONLY (the 4 Ryuk frames stay reserved for Stage 5).
    # bust=1.0: idle_face frame 0 IS a tight face bust (57px source) — keep the WHOLE frame (hair→chin),
    # not the top 62% (which chopped mouth/chin and left only hair+eyes). Select-screen mug reads as L.
    make_portrait("l_ryuuzaki_idle_face.png", "l_ryuuzaki_portrait.png", bust=1.0)
