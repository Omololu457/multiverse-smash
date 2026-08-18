#!/usr/bin/env python3
# Re-slice AOI TODO (rosterKey aoi_todo, Jujutsu Kaisen) source sheets into CLEAN uniform,
# feet-aligned cells. Mirrors tools/reslice_alt_sukuna.py (per-frame content bbox -> repack into
# one uniform cell: centered-X, BOTTOM-aligned, anchorY:0 plants feet across every standing action).
#
# SOURCE: aoitodo_row_01.png (3176x1113) + aoitodo_row_02.png (3176x657). GREEN chroma-key bg
# (0,124,13) -> pre-keyed to alpha before slicing. Sheet credit: "By akuma animation (with edits/
# palette improvements by MichelST)". Full pixel audit: AOI_TODO_ASSET_MAP.md.
#
# The action grid lives in x < ~1500 of row_01; x > 1500 holds reference/reject regions
# (unused-sprites box, loose fragments, anime screenshot, full-body render, "demostration" preview,
# "edits" box) which are EXCLUDED. Frame boxes below were auto-detected (chroma-key + column
# projection) then visually confirmed (Stage-1 slice map).
#
# STAGE 1 = movement / state only.
import sys
from PIL import Image

ALPHA = 16
BG = (0, 124, 13)
KEY_TOL = 60  # manhattan distance from chroma green to treat as background

def keyed(src):
    """Chroma-key the green background to transparent -> returns an RGBA working image."""
    im = Image.open(src).convert("RGBA"); px = im.load(); W, H = im.size
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); opx = out.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2]) > KEY_TOL:
                opx[x, y] = (r, g, b, 255)
    return out

def reslice(im, out, band, xrects, pad_to=None):
    """band=(y0,y1) sets the Y search range; xrects=[[x0,x1],...] explicit per-frame column spans.
    Each frame's Y content bbox is measured inside band, then repacked centered-X / bottom-aligned."""
    px = im.load()
    y0, y1 = band
    frames = []
    for rx0, rx1 in xrects:
        miny, maxy = y1 + 1, y0 - 1
        for y in range(y0, y1 + 1):
            for x in range(rx0, rx1 + 1):
                if px[x, y][3] > ALPHA:
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    break
        if maxy < miny:
            miny, maxy = y0, y1
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
    print(f"OK {out}: {len(frames)}f  cell {uW}x{uH}  widths={[f[2] for f in frames]}")
    print(f"   -> {{ frames: {len(frames)}, width: {uW}, height: {uH}, anchorY: 0 }}")
    return len(frames), uW, uH

def make_portrait(im, out, box, target_h=288):
    """Bust portrait cropped from a clean idle frame (head+torso), upscaled."""
    crop = im.crop(box)
    bbox = crop.getbbox()
    if bbox: crop = crop.crop(bbox)
    scale = target_h / crop.height
    big = crop.resize((max(1, int(crop.width * scale)), target_h), Image.LANCZOS)
    big.save(out)
    print(f"OK {out}: portrait {big.size}")

def main():
    im = keyed("aoitodo_row_01.png")
    im2 = keyed("aoitodo_row_02.png")   # gun/armor/whip/fire live on sheet 2

    # ── ROW0: IDLE (6f) + CROUCH-GUARD (4f), band y2..122 ──
    reslice(im, "aoi_todo_idle_uniform.png", (2, 122),
            [[10, 42], [83, 115], [156, 189], [229, 261], [302, 334], [375, 406]])
    reslice(im, "aoi_todo_crouch_uniform.png", (2, 122),
            [[511, 561], [584, 634], [657, 707], [730, 780]])

    # ── ROW1: GUARD (5f arms-cross) + WALK (8f) + RUN (8f), band y134..216 ──
    reslice(im, "aoi_todo_guard_uniform.png", (134, 216),
            [[9, 49], [66, 99], [119, 151], [171, 204], [225, 259]])
    reslice(im, "aoi_todo_walk_uniform.png", (134, 216),
            [[364, 389], [406, 438], [460, 484], [502, 525], [541, 567], [579, 612], [621, 652], [666, 695]])
    reslice(im, "aoi_todo_run_uniform.png", (134, 216),
            [[818, 871], [891, 935], [965, 1005], [1047, 1084], [1110, 1163], [1183, 1232], [1265, 1296], [1339, 1373]])

    # ── JUMP arc (8f) band y248..350 -> jump (rise 0-3) + fall (descend/land 4-7) ──
    reslice(im, "aoi_todo_jump_uniform.png", (248, 350),
            [[12, 42], [61, 92], [114, 159], [185, 222]])
    reslice(im, "aoi_todo_fall_uniform.png", (248, 350),
            [[247, 288], [302, 342], [368, 409], [436, 476]])

    # ── HIT (4f) + KNOCKDOWN (4f tumble->lie->flat) + GETUP (2f rise), band y382..478 ──
    reslice(im, "aoi_todo_hurt_uniform.png", (382, 478),
            [[9, 41], [62, 110], [141, 170], [180, 220]])
    reslice(im, "aoi_todo_knockdown_uniform.png", (382, 478),
            [[256, 310], [347, 422], [444, 510], [561, 642]])
    reslice(im, "aoi_todo_getup_uniform.png", (382, 478),
            [[676, 721], [749, 790]])

    # ── STAGE 2 NORMALS (discrete single moves from row_01 punch/kick bands). The FULL combo STRINGS
    #    (jab/cross, hook/uppercut, roundhouse) + spin-backfist/flying-kick/dive art are RESERVED for
    #    Stage 3 (rekka) / Stage 4 (specials). Elbow strike has no engine normal slot → deferred to the
    #    Stage 3 command-chain (Fwd+Heavy). down_air REUSES air (dive art reserved for the S4 dive special). ──
    reslice(im, "aoi_todo_light_uniform.png", (508, 592),
            [[73, 104], [130, 161], [184, 227]])          # band3 quick jab/cross
    reslice(im, "aoi_todo_heavy_uniform.png", (634, 732),
            [[12, 50], [70, 119], [127, 177]])            # band4 committed cross (windup→extend)
    reslice(im, "aoi_todo_up_uniform.png", (872, 996),
            [[325, 365], [391, 450]])                     # band6 vertical axe-kick launcher (leg-straight-up → follow)
    reslice(im, "aoi_todo_air_uniform.png", (1013, 1112),
            [[474, 505], [527, 572]])                     # band7 flying knee (rising→extend)
    reslice(im, "aoi_todo_crouchlight_uniform.png", (768, 866),
            [[1136, 1190], [1205, 1259]])                 # band5 crouched low punch

    # ── STAGE 3 COMMAND CHAIN (Fwd+Heavy 3-stage rekka, cancel-on-hit). The prompt's three real chain
    #    strings = jab/cross (→ already the `light` normal), hook/uppercut, roundhouse. The Stage-2-deferred
    #    ELBOW (no engine normal slot) becomes the chain OPENER. So: elbow → hook/uppercut → roundhouse.
    #    Distinct art from the S2 normals (no double-booking). ──
    reslice(im, "aoi_todo_combo1_uniform.png", (634, 732),
            [[409, 452], [477, 516]])                     # band4 ELBOW (raised bent-arm close strike) — opener
    reslice(im, "aoi_todo_combo2_uniform.png", (508, 592),
            [[418, 460], [467, 519], [539, 593]])         # band3-B hook(swirl)→cross→straight — mid
    reslice(im, "aoi_todo_combo3_uniform.png", (884, 996),
            [[796, 847], [862, 940]])                     # band6-R spinning ROUNDHOUSE (big arc) — launcher finisher

    # ── STAGE 4 SPECIALS (6 dir-branched: N=Gun / F=Flying Fire Kick / B=Whip / D=Spin Backfist / U=Armor / air=Dive).
    #    Owner-locked: gun/whip/armor all IN. ★HEALTH-CHECK: the row_02 "draw & fire gun" art is a DIFFERENT
    #    character (green bowl-cut, suited) — NOT Todo; owner chose "keep gun, render Todo" → gun uses a Todo
    #    straight-arm pose (below) + a PROCEDURAL bullet (no mismatched sprite). armor/whip/fire ARE real Todo. ──
    # GUN cast pose — Todo straight-arm point (sheet1 band4); the bullet itself is procedural (spawnProjectile).
    reslice(im, "aoi_todo_gun_uniform.png", (634, 732),
            [[643, 683], [713, 754]])
    # FLYING FIRE KICK (Fwd) — row_02 band3, real Todo kick w/ baked red-fire crescent.
    reslice(im2, "aoi_todo_firekick_uniform.png", (401, 485),
            [[79, 124], [133, 198], [215, 275]])
    # WHIP-SLASH (Back) — row_02 band2, real Todo red-ribbon swing (the ribbon is baked into the art = long disjoint).
    reslice(im2, "aoi_todo_whip_uniform.png", (219, 324),
            [[158, 267], [318, 410], [483, 537], [594, 682]])
    # SPIN BACKFIST / Whirlwind (Down) — sheet1 band5, spinning strike w/ swirl trail.
    reslice(im, "aoi_todo_spin_uniform.png", (768, 866),
            [[70, 116], [143, 208], [220, 286]])
    # ARMORED CHARGE buff (Up) — row_02 band1, real Todo cross→charge→transform→armored form (self-buff cast).
    reslice(im2, "aoi_todo_armor_uniform.png", (104, 182),
            [[153, 184], [214, 245], [281, 312], [353, 384]])
    # DIVE KICK / Ground Slam (air) — sheet1 band7, diving kick.
    reslice(im, "aoi_todo_dive_uniform.png", (1013, 1112),
            [[695, 722], [768, 831]])

    # ── STAGE 7 WIN / LOSE (row_02 band4). WIN = arms-cross victory + a chibi thought-bubble on the last frame
    #    (the "4-frame victory + chibi reaction icon" the audit called out — REAL art). ★HEALTH-CHECK: the audit
    #    said LOSE = "defeated/slumped", but the real art is Todo standing ARMS-CROSSED with a building blue
    #    eye-glow (stoic/defiant, NOT slumped) → used as-is, flagged. ──
    # blank the dark-green "win"/"lose" LABEL text (survives chroma-key) so it can't bleed into the top of the
    # win slices — keep the chibi thought-bubble (x>245) intact. (Same class as the alt_sukuna label-bleed gotcha.)
    from PIL import ImageDraw as _ID2
    _d = _ID2.Draw(im2)
    _d.rectangle([50, 500, 250, 560], fill=(0, 0, 0, 0))    # "win" label (wide — covers frames 2-3 tops)
    _d.rectangle([465, 500, 600, 560], fill=(0, 0, 0, 0))   # "lose" label
    reslice(im2, "aoi_todo_win_uniform.png", (525, 648),
            [[17, 49], [72, 120], [157, 188], [224, 321]])   # stance → arms cross → crossed + chibi bubble
    reslice(im2, "aoi_todo_lose_uniform.png", (560, 648),
            [[605, 634], [657, 686], [730, 759], [809, 838]])  # arms-crossed, blue eye-glow builds (defiant, not slumped)

    # ── PORTRAIT — bust (head+torso) from idle frame 0 ──
    make_portrait(im, "aoi_todo_portrait.png", (6, 4, 46, 74), target_h=288)

if __name__ == "__main__":
    main()
