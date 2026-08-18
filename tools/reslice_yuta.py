#!/usr/bin/env python3
# Re-slice YUTA OKKOTSU (rosterKey `yuta`, Jujutsu Kaisen) source rows into CLEAN uniform,
# feet-aligned cells. Source = per-row PNGs already split from the master sheet
# (yuta_row_01_header.png .. yuta_row_16_rikas_invocation.png). Sheet credit:
# "Made by Soulfire — Petamynx, Dano, Santoryu". Full pixel audit: YUTA_ASSET_MAP.md.
#
# Each row PNG has: a top LABEL BAND (purple text) -> an EMPTY gap -> the sprite band.
# Background is transparent (alpha 0); leftover RGB is label-color bleed. We auto-strip the
# label by cutting above the first empty horizontal gap, then repack each frame content-bbox
# into one uniform cell (centered-X, BOTTOM-aligned, anchorY:0 -> feet plant across actions).
#
# STAGE 1 = movement / state only (idle, crouch, walk, guard, hurt, knockdown, getup).
import sys
from PIL import Image

ALPHA = 16

def load(src):
    return Image.open(src).convert("RGBA")

GAP_MAX = 6   # rows with <= this many opaque px count as an "empty" separator (stray sword-tip pixels
              # can bridge the label band to the sprite band — e.g. row_11 has n=4 in its gap).

def content_band(im, xlo=None, xhi=None):
    """Return (y0, y1) of the sprite band, skipping the top label band + its (near-)empty gap.
    xlo/xhi scope the search to a column range — REQUIRED when left/right sub-regions carry their
    own labels at different y offsets (e.g. row_11: "Up Attack" at y0-11 but "Air Kick" at y14-25)."""
    px = im.load(); W, H = im.size
    x0 = 0 if xlo is None else max(0, xlo)
    x1 = W if xhi is None else min(W, xhi)
    counts = [sum(1 for x in range(x0, x1) if px[x, y][3] > ALPHA) for y in range(H)]
    started = False; gap = None
    for y, c in enumerate(counts):
        if c > GAP_MAX: started = True
        if started and c <= GAP_MAX:
            gap = y; break
    if gap is None:
        return 0, H  # no label band detected
    y = gap
    while y < H and counts[y] <= GAP_MAX: y += 1
    return y, H

def frame_bbox(px, x0, x1, y0, y1):
    """Tight content bbox of one frame within column span [x0,x1) and band [y0,y1)."""
    miny, maxy = y1, y0 - 1
    minx, maxx = x1, x0 - 1
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > ALPHA:
                if y < miny: miny = y
                if y > maxy: maxy = y
                if x < minx: minx = x
                if x > maxx: maxx = x
    if maxy < miny:
        return None
    return (minx, miny, maxx + 1, maxy + 1)

def idle_foot_offset(idle_sheet, ncols, foot_px=14):
    """Measure the idle sheet's foot-centroid offset from its cell CENTER (avg over frames). The engine
    centers every cell on the fighter, so to keep the character from JUMPING horizontally between actions
    the walk's feet must sit at this SAME offset. Returns a signed px offset (idle is ~-9 = left-of-center)."""
    im = load(idle_sheet); px = im.load(); W, H = im.size; cw = W // ncols
    offs = []
    for i in range(ncols):
        ys = [y for y in range(H) for x in range(i * cw, (i + 1) * cw) if px[x, y][3] > ALPHA]
        if not ys: continue
        yb = max(ys)
        feet = [x - i * cw for y in range(yb - foot_px + 1, yb + 1) for x in range(i * cw, (i + 1) * cw) if px[x, y][3] > ALPHA]
        if feet: offs.append(sum(feet) / len(feet) - cw / 2)
    return sum(offs) / len(offs) if offs else 0.0

def build_leg_aligned(src, spans, out, band, foot_px=16, pad=2, foot_off=0.0, scale=1.0):
    """Pack frames so the LOWER-BODY (feet) x-centroid lands at a CONSISTENT position — not the full
    content bbox (whose center the trailing katana swings ~19px/frame → visible jitter). Additionally the
    foot centroid is placed at `foot_off` px from the cell CENTER so it matches the idle sheet's anchor
    (the engine centers each cell on the fighter → mismatched anchors make the body teleport between
    actions). `scale` (<1) shrinks every frame to reconcile a source size difference vs idle. Y is
    bottom-aligned (anchorY:0 feet-plant)."""
    im = load(src); px = im.load()
    y0, y1 = band
    frames = []
    for x0, x1 in spans:
        bb = frame_bbox(px, x0, x1, y0, y1)
        if bb is None: continue
        bx0, by0, bx1, by1 = bb
        cell = im.crop(bb); cw, ch = cell.size
        lo = [x - bx0 for y in range(max(by0, by1 - foot_px), by1) for x in range(bx0, bx1) if px[x, y][3] > ALPHA]
        legcx = (sum(lo) / len(lo)) if lo else cw / 2
        if scale != 1.0:
            nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
            cell = cell.resize((nw, nh), Image.LANCZOS); legcx *= scale; cw, ch = nw, nh
        frames.append((cell, legcx, cw, ch))
    # place foot at position f so (f - uW/2) == foot_off, with room for each frame's left/right extent.
    L = max(f[1] for f in frames); R = max(f[2] - f[1] for f in frames)
    f = max(L, R + 2 * foot_off) + pad
    uW = int(round(2 * (f - foot_off)))
    uH = max(fr[3] for fr in frames) + 2
    strip = Image.new("RGBA", (uW * len(frames), uH), (0, 0, 0, 0))
    for i, (cell, legcx, cw, ch) in enumerate(frames):
        strip.paste(cell, (int(round(i * uW + f - legcx)), uH - ch - 1), cell)
    strip.save(out)
    print(f"{out}: {len(frames)} frames (leg-aligned, foot_off={foot_off:.1f}, scale={scale:.3f}), cell {uW}x{uH}")
    return uW, uH

def build(src, spans, out, pad_to=None, band=None):
    """spans = list of (x0,x1) column spans (one per frame). Repack -> uniform strip.
    band=(y0,y1) overrides auto-detect — needed when a right sub-region carries its own label at a
    different y than the (full-width) top label band (e.g. row_11 "Air Kick" y14-25 -> sprite y36+)."""
    im = load(src); px = im.load()
    y0, y1 = band if band is not None else content_band(im)
    boxes = []
    for (x0, x1) in spans:
        bb = frame_bbox(px, x0, x1, y0, y1)
        if bb is None:
            print(f"  !! empty frame span {x0}-{x1} in {src}", file=sys.stderr)
            continue
        boxes.append(bb)
    uW = max(b[2] - b[0] for b in boxes) + 2
    uH = max(b[3] - b[1] for b in boxes) + 2
    if pad_to:
        uW = max(uW, pad_to[0]); uH = max(uH, pad_to[1])
    strip = Image.new("RGBA", (uW * len(boxes), uH), (0, 0, 0, 0))
    for i, (bx0, by0, bx1, by1) in enumerate(boxes):
        cell = im.crop((bx0, by0, bx1, by1))
        cw, ch = cell.size
        dx = i * uW + (uW - cw) // 2
        dy = uH - ch - 1              # BOTTOM-align -> feet plant
        strip.paste(cell, (dx, dy), cell)
    strip.save(out)
    print(f"{out}: {len(boxes)} frames, cell {uW}x{uH}")
    return uW, uH

# ── STAGE 1 action -> (source row, [frame column spans]) ──────────────────────
# Column spans auto-detected (content-band column projection, gap>=4) then locked here.
IDLE   = [(14,61),(71,119),(138,188),(209,255),(263,310),(320,368),(378,426),(449,499),(507,558),(577,624)]
CROUCH = [(642,697)]
# row_03 "Walk 1" is really a turn (frames 0-1 front → side) then a settle; only the SIDE-PROFILE frames
# 2-6 read as a forward advance. We use those (dropping the front-view turn frames that "pop") and
# LEG-ALIGN them (build_leg_aligned) so the trailing-katana bbox swing doesn't jitter the body.
WALK   = [(121,169),(179,227),(243,296),(304,357),(364,417)]                        # row_03 Walk 1, side-profile frames 2-6
GUARD  = [(17,50),(56,87),(99,127),(137,165)]                                        # row_05 Guard
# row_04 Hurt sequence (6 frames): knockback(2) -> fall+lie(2) -> getup(2)
HURT_KNOCK = [(19,60),(73,114)]
KNOCKDOWN  = [(125,197),(210,262)]
GETUP      = [(279,343),(359,399)]

# ── STAGE 2 normals (5 slots). Standalone normals only; sword-combo/kick-chain/aerial-chain are Stage 3. ──
N_LIGHT = [(583,612),(625,672),(692,735),(755,798)]                            # row_07 "Kick 1" basic kick
N_HEAVY = [(26,54),(68,96),(112,142),(157,200),(207,262)]                      # row_06 "Attack 1" sword swing
N_UP    = [(18,145),(155,214),(236,296),(307,350),(368,404),(429,467)]         # row_11 "Up Attack" anti-air sword launcher
N_AIR   = [(584,642),(650,693),(712,755),(764,814)]                            # row_11 "Air Kick" aerial kick
# down_air REUSES the air sheet (no dedicated down-aerial art) — declared as a reuse in characters.js.

# ── STAGE 3 sword-combo Fwd+Heavy rekka (Attack 1 → Attack 2 → Attack 3). combo1 REUSES the heavy sheet
# (heavy IS Attack 1). combo2 = row_06 Attack 2, combo3 = row_07 Attack 3 (thrust finisher). ──
CMB2 = [(574,610),(635,669),(695,735),(759,803),(821,901)]                     # row_06 "Attack 2"
CMB3 = [(20,67),(96,138),(173,224),(231,307),(319,398),(417,473)]              # row_07 "Attack 3" thrust

# ── STAGE 4 specials (5 directional cast poses). ──
SP_CEM    = [(576,637),(643,694),(699,750),(756,807),(813,864),(870,915),(920,963)]                 # row_15 R "Cursed Energy Manipulation" thrust→beam (N)
SP_STRONG = [(28,71),(81,111),(125,197),(222,263),(283,359),(376,452),(476,537),(548,607)]          # row_10 "Strong Attack" green-arc swing (F)
SP_KICK4  = [(14,130),(145,206),(217,261),(275,316),(321,375),(393,430),(453,502)]                  # row_09 "Kick 4" dark cursed-energy wing sweep (D)
SP_SPEECH = [(14,71),(78,141),(148,211),(217,280),(286,338),(346,397),(413,464),(474,525)]          # row_14 L "Cursed Speech" incantation (U)
SP_RCT    = [(15,61),(73,124),(132,172),(185,232),(248,298)]                                        # row_15 L "Reverse Cursed Technique" self-heal (B)

# ── STAGE 5 — RIKA (V2 remodel) assist-summon poses. Rika rows have NO label band (transparent bg, no
# text) and loose composite limb parts to the RIGHT of the assembled animation → we take only the LEFT
# frames and force band=(0,H). All poses PADDED to one common cell so idle↔reach↔screech swaps stay
# feet(tail)-planted (onokiGolem pose-swap pattern). ──
RIKA_CELL   = (150, 130)
RIKA_IDLE   = [(51,170),(177,296),(308,427),(436,555),(564,683)]                  # row_02 L — hunched idle (5f)
RIKA_REACH  = [(89,217),(231,358),(374,502),(515,617),(639,780)]                  # row_04 L — reach/claw lunge (5f)
RIKA_SCREECH= [(69,183),(197,320),(334,418),(426,510),(525,640),(658,781)]        # row_07 — screech/roar (6f)
RIKA_SPAWN  = [(38,129),(152,242),(251,347),(355,447),(468,565)]                  # row_10 — emerge from tail (5f)
# Yuta's "Rika's Invocation" cast pose (row_16): draw sword → kneel/channel. Frames 0-7 (Yuta only; the
# wide frame @idx12 = Rika manifesting, excluded from the caster pose).
YUTA_ULTCAST = [(18,85),(97,131),(145,177),(204,225),(236,257),(264,285),(295,317),(345,365)]
# WIN pose (Stage 6) — repurposed row_16 empowered STANDING frames (sword-ready, confident). No bespoke
# victory art exists (FLAGGED gap). LOSE reuses the knockdown lying pose (also flagged, no new sheet).
YUTA_WIN = [(372,392),(398,427),(444,477),(482,515)]

def sheet_char_h(sheet, ncols):
    """Max content height (head→foot) across a sheet's frames — the on-screen character height."""
    im = load(sheet); px = im.load(); W, H = im.size; cw = W // ncols; hmax = 0
    for i in range(ncols):
        ys = [y for y in range(H) for x in range(i * cw, (i + 1) * cw) if px[x, y][3] > ALPHA]
        if ys: hmax = max(hmax, max(ys) - min(ys) + 1)
    return hmax

def main():
    build("yuta_row_02.png", IDLE,   "yuta_idle_uniform.png")
    build("yuta_row_02.png", CROUCH, "yuta_crouch_uniform.png")
    # WALK: leg-aligned (no jitter) + anchored to IDLE's foot offset (no idle↔walk horizontal jump) +
    # scaled to IDLE's character height (no "grows when walking"). Measured off the just-built idle sheet.
    ioff = idle_foot_offset("yuta_idle_uniform.png", 10)
    idle_h = sheet_char_h("yuta_idle_uniform.png", 10)
    build_leg_aligned("yuta_row_03.png", WALK, "_yuta_walk_native.png", band=(23,78))   # measure native height
    walk_h = sheet_char_h("_yuta_walk_native.png", len(WALK))
    import os as _os; _os.remove("_yuta_walk_native.png")
    wscale = idle_h / walk_h if walk_h else 1.0
    build_leg_aligned("yuta_row_03.png", WALK, "yuta_walk_uniform.png", band=(23,78), foot_off=ioff, scale=wscale)
    build("yuta_row_05.png", GUARD,  "yuta_guard_uniform.png")
    build("yuta_row_04.png", HURT_KNOCK, "yuta_hurt_uniform.png")
    build("yuta_row_04.png", KNOCKDOWN,  "yuta_knockdown_uniform.png")
    build("yuta_row_04.png", GETUP,      "yuta_getup_uniform.png")
    # Stage 2 normals
    build("yuta_row_07.png", N_LIGHT, "yuta_light_uniform.png")
    build("yuta_row_06.png", N_HEAVY, "yuta_heavy_uniform.png")
    build("yuta_row_11.png", N_UP,    "yuta_up_uniform.png")
    build("yuta_row_11.png", N_AIR,   "yuta_air_uniform.png", band=(36, 92))   # Air Kick label sits at y14-25 (below the global gap) -> force sprite band
    # Stage 3 sword combo (combo1 reuses yuta_heavy_uniform.png)
    build("yuta_row_06.png", CMB2, "yuta_combo2_uniform.png")
    build("yuta_row_07.png", CMB3, "yuta_combo3_uniform.png")
    # Stage 4 special cast poses
    build("yuta_row_15.png", SP_CEM,    "yuta_cem_uniform.png")
    build("yuta_row_10_strong_attack.png", SP_STRONG, "yuta_strong_uniform.png")
    build("yuta_row_09_kick4.png", SP_KICK4, "yuta_kick4_uniform.png")
    build("yuta_row_14.png", SP_SPEECH, "yuta_speech_uniform.png")
    build("yuta_row_15.png", SP_RCT,    "yuta_rct_uniform.png")
    # Stage 5 Rika assist poses (padded to a common cell, band=full)
    build("rika_v2_row_02.png", RIKA_IDLE,    "rika_idle_uniform.png",    band=(0,127), pad_to=RIKA_CELL)
    build("rika_v2_row_04.png", RIKA_REACH,   "rika_reach_uniform.png",   band=(0,105), pad_to=RIKA_CELL)
    build("rika_v2_row_07.png", RIKA_SCREECH, "rika_screech_uniform.png", band=(0,90),  pad_to=RIKA_CELL)
    build("rika_v2_row_10.png", RIKA_SPAWN,   "rika_spawn_uniform.png",   band=(0,99),  pad_to=RIKA_CELL)
    build("yuta_row_16_rikas_invocation.png", YUTA_ULTCAST, "yuta_ultcast_uniform.png")
    build("yuta_row_16_rikas_invocation.png", YUTA_WIN, "yuta_win_uniform.png")

if __name__ == "__main__":
    main()
