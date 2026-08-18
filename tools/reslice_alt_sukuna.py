#!/usr/bin/env python3
# Re-slice ALTERNATE SUKUNA (rosterKey alt_sukuna, JJK — alternate-universe Sukuna) source ROW strips
# into CLEAN uniform, feet-aligned cells. Mirrors tools/reslice_brainiac.py / reslice_onoki.py
# (alpha-gutter frame detect -> per-frame content bbox -> repack into one uniform cell: centered-X,
# BOTTOM-aligned) so a single anchorY:0 plants feet across every standing action.
#
# SOURCE: sukuna_row_01..10.png, all 1945px wide, RGBA transparent bg. Original sprites by Cinontk,
# sheet compiled by Bitsverse644 (anti-repost watermark on rows 08-10 -> NOT art). This is a SEPARATE
# build from the existing `sukuna` char (different, larger sheets). Full pixel audit: SUKUNA_ASSET_MAP.md.
#
# LAYOUT NOTE: row_02 (1945x1301) stacks MANY animation bands VERTICALLY in its LEFT region (x<1060);
# the right side (x>1060) is a tall reference render. row_01 is the intro. row_03 holds a clean bust
# render (portrait source). Every box below was visually confirmed (Stage-1 slice map).
#
# STAGE 1 = movement / state only. Owner-locked design: "Alternate Sukuna", honest modest kit,
# Domain Expansion = ultimate, energy beam = special, borrow existing-sukuna FX for gaps.
import sys
from PIL import Image

ALPHA = 16

def reslice(src, out, band, xrects, pad_to=None):
    """band=(y0,y1) sets the Y search range; xrects=[[x0,x1],...] are explicit per-frame column spans.
    Each frame's Y content bbox is measured inside band, then repacked centered-X / bottom-aligned."""
    im = Image.open(src).convert("RGBA"); px = im.load()
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
        if maxy < miny:  # empty span guard
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

def make_portrait(src, out, box, target_h=288):
    """Bust portrait cropped from the row_03 clean reference render, upscaled nearest-neighbor."""
    im = Image.open(src).convert("RGBA")
    crop = im.crop(box)
    # tight bbox inside the crop, then square-ish bust
    bbox = crop.getbbox()
    if bbox: crop = crop.crop(bbox)
    scale = target_h / crop.height
    big = crop.resize((max(1, int(crop.width * scale)), target_h), Image.LANCZOS)
    big.save(out)
    print(f"OK {out}: portrait {big.size}")

def main():
    R2 = "sukuna_row_02.png"
    # NOTE: this sheet labels each animation ABOVE its content. Bands verified deterministically
    # against the confirmed "Stand:/Walk:/Dash:/Jump:/Guard:/Hit:/Down:" label order (SUKUNA_ASSET_MAP.md).
    # ── IDLE — the "Stand:"-labeled band (y138-197), 3 clean standing frames ──
    reslice(R2, "alt_sukuna_idle_uniform.png", (138, 197),
            [[12,34],[39,61],[67,89]])
    # ── WALK — "Walk:"-labeled band, 6 frames ──
    reslice(R2, "alt_sukuna_walk_uniform.png", (224, 283),
            [[10,34],[41,61],[66,91],[96,118],[125,147],[153,202]])
    # ── DASH — "Dash:"-labeled motion-blur, 2f ──
    reslice(R2, "alt_sukuna_dash_uniform.png", (308, 354),
            [[9,44],[49,83]])
    # ── JUMP/FALL — "Jump:"-labeled 6-frame arc (band starts y378 to trim label off frame 0).
    #    Split: jump = prep+rise (f0-2); fall = apex+descend+land (f3-5). ──
    reslice(R2, "alt_sukuna_jump_uniform.png", (378, 435),
            [[10,68],[75,101],[107,133]])
    reslice(R2, "alt_sukuna_fall_uniform.png", (378, 435),
            [[141,167],[175,201],[209,231]])
    # ── CROUCH — 3 squat frames (right of the Stand row), tight y93-128 ──
    reslice(R2, "alt_sukuna_crouch_uniform.png", (93, 128),
            [[582,608],[612,638],[642,668]])
    # ── GUARD — single arms-up block pose ──
    reslice(R2, "alt_sukuna_guard_uniform.png", (462, 512),
            [[14,48]])
    # ── HURT/KNOCKDOWN/GETUP — sprites live at y536-582; the "Hit:"/"Down:" labels sit above (y518-535) ──
    reslice(R2, "alt_sukuna_hurt_uniform.png", (536, 582),
            [[10,40],[46,73],[79,112]])
    # ── KNOCKDOWN — 2 lying frames (merged pair split at x200) ──
    reslice(R2, "alt_sukuna_knockdown_uniform.png", (536, 582),
            [[146,200],[201,255]])
    # ── GETUP — rising pose ──
    reslice(R2, "alt_sukuna_getup_uniform.png", (536, 582),
            [[262,295]])
    # ── INTRO — row_01 flourish loop; blank the "Intro:" label (x0-46,y0-14) on a working copy first ──
    r1 = Image.open("sukuna_row_01.png").convert("RGBA")
    from PIL import ImageDraw as _ID
    _ID.Draw(r1).rectangle([0, 0, 46, 14], fill=(0, 0, 0, 0))
    r1.save("_alt_sukuna_row01_clean.png")
    reslice("_alt_sukuna_row01_clean.png", "alt_sukuna_intro_uniform.png", (0, 65),
            [[5,39],[45,78],[84,117],[123,156],[161,194],[200,226],
             [234,271],[272,310],[314,336],[340,362],[366,388],[392,416],[420,442]])
    # ── STAGE 2 NORMALS (row_02 attack bands; Cleave-string b15-L crescents + beam/spin/grab RESERVED
    #    for Stages 3-4). Allocation avoids double-booking: light=clean jabs, heavy=overhead (no FX),
    #    up=rising cleave-arc launcher, air=airborne punch, down_air=REUSE air. See SUKUNA_ASSET_MAP.md. ──
    reslice(R2, "alt_sukuna_light_uniform.png", (843, 901),
            [[337,361],[367,391],[398,420]])                       # b15-R quick jabs
    reslice(R2, "alt_sukuna_heavy_uniform.png", (786, 837),
            [[12,46],[58,92],[99,128]])                            # b14-L overhead smash
    reslice(R2, "alt_sukuna_up_uniform.png", (1053, 1109),
            [[5,34],[75,104],[110,147],[153,188]])                 # b17 rising vertical cleave (launcher)
    reslice(R2, "alt_sukuna_air_uniform.png", (1118, 1173),
            [[10,74],[81,130]])                                    # b18-L airborne punch (excl. tumble f3)

    # ── STAGE 3 CLEAVE command-string (b15-L red-crescent rekka). 6 frames → cleave1 (windup→prep→
    #    CRESCENT#1) + cleave2 (CRESCENT#2→trail→recover finisher). This is the RESERVED string art. ──
    reslice(R2, "alt_sukuna_cleave1_uniform.png", (843, 901),
            [[6,34],[43,84],[89,140]])
    reslice(R2, "alt_sukuna_cleave2_uniform.png", (843, 901),
            [[148,200],[209,249],[257,283]])

    # ── STAGE 4 SPECIALS art ──
    # Neutral BEAM (Fūga: Fire Arrow) caster poses — b13 charge→thrust (beam baked into thrust frames);
    # the traveling projectile itself is procedural. band y714-773.
    reslice(R2, "alt_sukuna_beam_uniform.png", (714, 773),
            [[657,697],[700,740],[743,800],[805,870]])
    # Forward SPIN-KICK (roundhouse lunge, pale-tan arc) — b16-bot 4f. band y978-1045.
    reslice(R2, "alt_sukuna_spinkick_uniform.png", (978, 1045),
            [[14,40],[47,108],[114,149],[155,190]])
    # Down CURSED GRAB (short command grab, also fixes the S2 basic-grab temp-reuse) — row_03 grab-hold 3f.
    reslice("sukuna_row_03.png", "alt_sukuna_grab_uniform.png", (5, 60),
            [[11,52],[57,98],[100,137]])

    # ── STAGE 5 ULTIMATE "Ultimate Action:" charge stance (b12 y613-672, 5f) → Domain trigger pose ──
    reslice(R2, "alt_sukuna_ultcharge_uniform.png", (613, 672),
            [[10,34],[40,64],[71,93],[102,124],[129,155]])
    # Domain Expansion backdrop = row_07 Malevolent Shrine, 3-panel FORMATION progression (forming→full).
    # NOT a uniform gameplay sheet — full-panel overlays drawn fullscreen during the cinematic (Saitama
    # death-punch-backdrop pattern). Each panel tightly bboxed.
    r7 = Image.open("sukuna_row_07.png").convert("RGBA")
    for i, (x0, x1) in enumerate([(7, 645), (645, 1285), (1285, 1922)], start=1):
        panel = r7.crop((x0, 0, x1, r7.height))
        bb = panel.getbbox()
        if bb: panel = panel.crop(bb)
        panel.save(f"alt_sukuna_domain{i}.png")
        print(f"OK alt_sukuna_domain{i}.png: {panel.size}")

    # ── STAGE 6 WIN pose — row_03 taunt band, arrogant mocking-laugh (arms spread). FALLBACK win; the
    #    outline-only ghost-afterimage victory FX (row_03 y696-746) is DEFERRED polish, not built. ──
    reslice("sukuna_row_03.png", "alt_sukuna_win_uniform.png", (256, 314),
            [[51,100],[105,165],[170,231]])

    # ── PORTRAIT — bust from row_03 clean render ──
    make_portrait("sukuna_row_03.png", "alt_sukuna_portrait.png", (1336, 30, 1566, 400), target_h=288)

if __name__ == "__main__":
    main()
