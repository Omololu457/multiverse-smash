#!/usr/bin/env python3
# Re-slice Orochimaru (universe: naruto) source strips into CLEAN uniform, feet-aligned cells.
# Mirrors tools/reslice_hiruzen.py / reslice_isshiki.py (alpha-gutter frame detect -> per-frame
# content bbox -> repack into one uniform cell: centered-X, BOTTOM-aligned). anchorY 0.
#
# The raw sheets ship generic p1_*/p2_* names (one action-or-several per PNG). This tool carves
# each into named orochimaru_<action>_uniform.png. Where a PNG bundles several actions (the
# jump/guard/guardair/throwweapon sheet, the 4-tier hit sheet, the two intro sheets), band/xrects
# split them by hand-authored x-ranges lifted from an alpha-gutter probe.
from PIL import Image

ALPHA = 16

def runs_of(px, W, H, y0, y1):
    col = [sum(1 for y in range(y0, y1 + 1) if px[x, y][3] > ALPHA) for x in range(W)]
    out = []; s = -1
    for x in range(W):
        if col[x] > 0:
            if s < 0: s = x
        else:
            if s >= 0: out.append([s, x - 1]); s = -1
    if s >= 0: out.append([s, W - 1])
    return out

def reslice(src, out, band=None, xrects=None, minw=3):
    im = Image.open(src).convert("RGBA"); W, H = im.size; px = im.load()
    y0, y1 = (0, H - 1) if band is None else band
    if xrects is not None:
        runs = [list(r) for r in xrects]
    else:
        runs = [r for r in runs_of(px, W, H, y0, y1) if (r[1] - r[0] + 1) >= minw]
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
    uW = max(f[2] for f in frames) + 2
    uH = max(f[3] for f in frames) + 2
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

if __name__ == "__main__":
    # ── MOVEMENT / STATE (clean alpha gutters unless noted) ──
    # stance_1_2_3 = three idle sub-cycles; take stance-1 (first 4 frames) as the breathing loop.
    reslice("p1_stance_1_2_3.png", "orochimaru_idle_uniform.png",
            band=(0, 49), xrects=[(4, 27), (30, 52), (56, 78), (81, 103)])   # 4f — idle breathing (stance 1); band cuts label row 50
    # run_1_and_3 = run cycles 1 & 3 present, run 2 is a real gap; take cycle-1 (first 6 frames).
    reslice("p1_run_1_and_3.png", "orochimaru_run_uniform.png",
            xrects=[(5, 46), (51, 79), (84, 119), (124, 166), (170, 199), (203, 240)])  # 6f — run cycle
    # jump/guard/guardair/throwweapon bundle — split by hand:
    reslice("p1_jump_guard_guardair_throwweapon.png", "orochimaru_jump_uniform.png",
            xrects=[(4, 36), (40, 61), (66, 90), (94, 116), (121, 145)])   # 5f — crouch->leap->apex->fall
    reslice("p1_jump_guard_guardair_throwweapon.png", "orochimaru_guardair_uniform.png",
            xrects=[(161, 192)])                                            # 1f — crouched air/low guard
    reslice("p1_jump_guard_guardair_throwweapon.png", "orochimaru_guard_uniform.png",
            xrects=[(231, 251), (257, 278)])                               # 2f — standing block (hands up)
    # throw-weapon (Stage 2 grab) — sliced now for completeness: 4 windup/release + 2 kunai-in-flight.
    reslice("p1_jump_guard_guardair_throwweapon.png", "orochimaru_throw_uniform.png",
            xrects=[(286, 303), (307, 339), (345, 377), (388, 410)])       # 4f — draw -> throw
    reslice("p1_jump_guard_guardair_throwweapon.png", "orochimaru_kunai_proj_uniform.png",
            xrects=[(426, 437), (442, 453)])                               # 2f — thrown kunai projectile

    # ── HIT REACTIONS — 4 tiers off one sheet (taking_damage / special / heavy1 / heavy2). ──
    # band=(0,51) crops off the baked cyan "CHAKRA CRUNCH"/"GRAB" label text (rows 52-56).
    # chakra-crunch light recoil = 2 touching figures in one 61px run -> hand-split at x34.
    HIT = (0, 51)
    reslice("p1_taking_damage_special_heavy1_heavy2.png", "orochimaru_hurt_uniform.png",
            band=HIT, xrects=[(4, 33), (34, 64)])                          # 2f — light recoil
    reslice("p1_taking_damage_special_heavy1_heavy2.png", "orochimaru_hurt_special_uniform.png",
            band=HIT, xrects=[(82, 97), (100, 118), (121, 147)])           # 3f — special-hit stagger
    reslice("p1_taking_damage_special_heavy1_heavy2.png", "orochimaru_hurt_heavy1_uniform.png",
            band=HIT, xrects=[(190, 222), (225, 263)])                     # 2f — heavy1 tumble
    reslice("p1_taking_damage_special_heavy1_heavy2.png", "orochimaru_hurt_heavy2_uniform.png",
            band=HIT, xrects=[(406, 438)])                                 # 1f — heavy2 crumple
    # grab pose (Stage 2) — sliced now: the "GRAB" labelled pair.
    reslice("p1_taking_damage_special_heavy1_heavy2.png", "orochimaru_grab_uniform.png",
            band=HIT, xrects=[(297, 328), (332, 355)])                     # 2f — grab / seize

    # ── KNOCKDOWNS (both variants, clean gutters) ──
    reslice("p1_knocked_down_normal.png",  "orochimaru_knockdown_uniform.png")          # 8f — down -> getup
    reslice("p1_knocked_down_against.png", "orochimaru_knockdown_against_uniform.png")   # 11f — down -> regen getup

    # ── 3-PART INTRO — Orochimaru's "reborn from the white snake" cinematic (introSequence 1->2->3). ──
    # PART 1 (introduction_1): two standing gesture poses.
    reslice("p1_introduction_1_and_2.png", "orochimaru_intro1_uniform.png",
            xrects=[(4, 24), (27, 47)])                                    # 2f — appear / gesture
    # PART 2 (introduction_2): coils into serpent form; a snake emerges (ends on the snake body).
    reslice("p1_introduction_1_and_2.png", "orochimaru_intro2_uniform.png",
            xrects=[(206, 214), (222, 237), (246, 266), (271, 291), (295, 315),
                    (346, 368), (451, 473), (558, 581), (638, 673)])       # 9f — coil -> serpent
    # PART 3 (introduction_3): giant snake head roars -> body expelled -> rises to combat stance.
    reslice("p1_introduction_3.png", "orochimaru_intro3_uniform.png", band=(0, 63))   # 7f — snake head -> stand

    # ── STAGE 2 — 5 NORMALS + 2 bonus directional strongs. The strong sheets bundle CHARACTER frames
    # then the extending Kusanagi-blade/snake projectile tail; Stage 2 wires the CHARACTER frames as clean
    # feet-aligned melee (reach represents the extension), leaving the blade-as-projectile for Stage 3. ──
    # light = attack_combo snake-whip flurry (band cuts the row-0 label).
    reslice("p1_attack_combo.png", "orochimaru_light_uniform.png", band=(1, 76))          # 11f — snake-whip auto-combo
    # heavy = neutral strong: character thrust frames 0-5 (blade tail 6-12 excluded).
    reslice("p1_strong_attack.png", "orochimaru_heavy_uniform.png",
            xrects=[(4, 29), (33, 63), (67, 96), (100, 128), (132, 161), (165, 193)])     # 6f — Kusanagi thrust
    # upAttack = Up strong (launcher): character frames 0-5.
    reslice("p1_strong_attack_up.png", "orochimaru_up_uniform.png",
            xrects=[(4, 25), (29, 60), (64, 89), (93, 131), (135, 171), (175, 211)])      # 6f — rising slash
    # airAttack = air combo: figure frames (band cuts the bottom blade fragments).
    reslice("p1_attack_combo_air.png", "orochimaru_air_uniform.png", band=(0, 54),
            xrects=[(4, 26), (29, 93), (100, 124), (127, 150)])                           # 4f — air kick/snake
    # downAir = Down strong: character frames 0-5.
    reslice("p1_strong_attack_down.png", "orochimaru_downair_uniform.png",
            xrects=[(4, 28), (32, 61), (65, 91), (95, 123), (127, 155), (159, 182)])      # 6f — downward strike
    # Forward Strong (Fwd+Heavy command normal) = strong_attack_forward CHARACTER frames 0-3 ONLY.
    # NOTE: p2_special_move_01 is a CONFIRMED byte-near duplicate of this (94.6% silhouette, 1px canvas
    # offset) — sourced from THIS file only; special_move_01 is NOT imported (see Stage 3).
    reslice("p1_strong_attack_forward.png", "orochimaru_fwdstrong_uniform.png",
            xrects=[(5, 36), (40, 83), (86, 127), (130, 170)])                            # 4f — forward snake-thrust
    # Aerial Strong (air+Heavy) = strong_attack_air character frames 0-5.
    reslice("p1_strong_attack_air.png", "orochimaru_airstrong_uniform.png",
            xrects=[(4, 25), (30, 61), (65, 91), (95, 133), (138, 174), (179, 215)])      # 6f — aerial thrust

    # ── STAGE 3 — COMMAND-NORMAL CHAIN (special_move_05) + 8 SPECIALS (special_move_02-04,06-10). ──
    # special_move_01 is EXCLUDED (confirmed Forward-Strong duplicate, wired in S2). special_move_11 = the
    # Summon ULT (Stage 5); special_move_12 = a two-figure assist frame (deferred). Kusanagi 04-vs-09 are
    # TWO INDEPENDENT snake moves (04 = melee lunge, 09 = ranged barrage), NOT one tap/hold technique; the
    # actual Kusanagi SWORD moves are 06 (throw) + 07 (lunge). See OROCHIMARU_ASSET_MAP notes.
    SP = "p2_special_move_"
    # command-normal chain: sp05 = 2 combo stages (punch string + kick/flash finisher). band cuts the
    # y48 bottom label; the cyan at y11/17 is the finisher's blue-hair flash (kept).
    reslice(SP + "05_UNCONFIRMED_NAME.png", "orochimaru_chain2_uniform.png", band=(0, 47),
            xrects=[(4, 25), (34, 58), (67, 91), (102, 127)])                             # 4f — chain stage 2 (punch string)
    reslice(SP + "05_UNCONFIRMED_NAME.png", "orochimaru_chain3_uniform.png", band=(0, 47),
            xrects=[(167, 187), (194, 221), (231, 262), (269, 305)])                      # 4f — chain stage 3 (kick + flash finisher)
    # SPECIAL CAST POSES (character frames; melee reach / projectile spawns live in abilities.js).
    reslice(SP + "03_UNCONFIRMED_NAME.png", "orochimaru_snakespit_uniform.png", band=(0, 49),
            xrects=[(4, 25), (28, 67), (71, 107)])                                        # 3f — Striking Shadow Snake cast (ranged)
    reslice(SP + "07_UNCONFIRMED_NAME.png", "orochimaru_swordlunge_uniform.png",
            xrects=[(4, 25), (153, 204), (279, 336), (426, 505)])                         # 4f — Kusanagi sword lunge (melee advance)
    reslice(SP + "06_UNCONFIRMED_NAME.png", "orochimaru_swordthrow_uniform.png", band=(0, 54),
            xrects=[(4, 24), (137, 156), (252, 271), (307, 357)])                         # 4f — Kusanagi sword throw cast (ranged)
    reslice(SP + "02_UNCONFIRMED_NAME.png", "orochimaru_tailsweep_uniform.png",
            xrects=[(4, 36), (40, 82), (255, 317), (374, 416)])                           # 4f — snake-tail sweep (melee, anti-air)
    reslice(SP + "08_UNCONFIRMED_NAME.png", "orochimaru_slam_uniform.png",
            xrects=[(4, 28), (67, 101), (114, 160), (218, 245)])                          # 4f — lunge slam (melee, low)
    reslice(SP + "04_UNCONFIRMED_NAME.png", "orochimaru_snakelunge_uniform.png",
            xrects=[(43, 97), (180, 214), (219, 279), (283, 388)])                        # 4f — Striking Shadow Snake lunge (melee dive)
    reslice(SP + "09_UNCONFIRMED_NAME.png", "orochimaru_snakebarrage_uniform.png",
            xrects=[(5, 29), (33, 65), (68, 97)])                                         # 3f — Hidden Shadow Snakes cast (ranged barrage)
    reslice(SP + "10_UNCONFIRMED_NAME.png", "orochimaru_coil_uniform.png",
            xrects=[(4, 24), (129, 151), (215, 242), (278, 305), (334, 352)])             # 5f — snake-form coil (self/melee)
    # PROJECTILE SHEETS for the 3 ranged specials (tight around the flying shape).
    reslice(SP + "03_UNCONFIRMED_NAME.png", "orochimaru_snake_proj_uniform.png", band=(0, 49),
            xrects=[(126, 158), (622, 674)])                                              # 2f — thin snake projectile (snake-only frames, h<24)
    reslice(SP + "06_UNCONFIRMED_NAME.png", "orochimaru_sword_proj_uniform.png", band=(0, 54),
            xrects=[(421, 444), (479, 509)])                                              # 2f — flying Kusanagi sword
    reslice(SP + "09_UNCONFIRMED_NAME.png", "orochimaru_snakeswarm_proj_uniform.png",
            xrects=[(452, 521), (525, 595)])                                              # 2f — barrage snake segment

    # ── STAGE 4 — 3 ALTERNATE FORMS. The ONLY distinct alternate-body art is p2_second_char_* (a humanoid
    # host body: stance/run/dash/punch). It supplies the 3 forms' OWN frames for idle/run/dash/light; the
    # 3 forms are that body in 3 palettes (Host default + White Snake + Serpent Sage, recolored by
    # tools/gen_orochimaru_forms.py). Every other action (jump/hurt/heavy/specials/…) falls back to BASE
    # Orochimaru via the merged _skinAnim. The shed-skin transition (shared) comes off special_move_10. ──
    SC = "p2_second_char_"
    reslice(SC + "stance_1.png", "orochimaru_form_idle_uniform.png",
            xrects=[(4, 24), (28, 47), (51, 70), (75, 96)])                               # 4f — form idle (host body)
    reslice(SC + "run.png", "orochimaru_form_run_uniform.png", band=(1, 40),
            xrects=[(4, 45), (49, 83), (87, 118), (123, 163), (167, 201), (205, 236)])    # 6f — form run
    reslice(SC + "dash.png", "orochimaru_form_dash_uniform.png", band=(0, 42),
            xrects=[(4, 42), (45, 82), (85, 117)])                                        # 3f — form dash
    reslice(SC + "punch.png", "orochimaru_form_light_uniform.png",
            xrects=[(4, 47), (53, 96), (104, 145), (153, 195), (203, 248), (256, 297)])   # 6f — form light (punch)
    # shed-skin transition (shared by all 3 forms) — the morph sequence off special_move_10.
    reslice(SP + "10_UNCONFIRMED_NAME.png", "orochimaru_shed_uniform.png",
            xrects=[(4, 24), (80, 100), (155, 178), (246, 274), (309, 330), (356, 375)])  # 6f — gather → shed → morphed

    # ── STAGE 5 — SUMMON ULTIMATE (special_move_11). 3 caster summon-gesture frames + 2 GIANT snake heads
    # (the summoned twin serpents / Manda). Cast strip = the live caster's held pose; the giant snakes are
    # drawn as a screen-space cinematic overlay (game.js drawOrochimaruSummonCinematic) synced to the timer. ──
    reslice(SP + "11_UNCONFIRMED_NAME.png", "orochimaru_ult_cast_uniform.png",
            xrects=[(15, 39), (44, 75), (79, 107)])                                       # 3f — summon gesture (caster)
    reslice(SP + "11_UNCONFIRMED_NAME.png", "orochimaru_ult_snake_uniform.png",
            xrects=[(189, 294), (330, 514)])                                              # 2f — giant twin-snake heads (FX); band cuts label rows 64/68
