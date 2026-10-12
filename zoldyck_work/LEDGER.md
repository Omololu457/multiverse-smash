# Killua (Godspeed) — `zoldyck` — BUILD LEDGER

**NEW additive fighter** (rosterKey `zoldyck`, display "Killua (Godspeed)", title "The Lightning",
universe `hunter_x_hunter`). Built from the AmandioHype "new outfit" Killua JUS sheet
(`killua_zoldyck_sprites_jus_new_outfit__by_amandiohype_dduudqn.png`, 1520×3760, olive-green
`(55,86,40)`+noise bg). **Base `killua` is byte-identical** — `zoldyck` avoids its exact-match
`=== "killua"` guards and its `killua_*` filenames. **combat.js UNTOUCHED** every phase.

Credits (in-game SOURCED_ART): **AmandioHype · Mikeel8888 · sonictheminecrafthog** (the sheet's own
baked credit block). The 6 embedded anime screencaps are cut-in overlays only.

## Identity / stats
HP **1010**, Volts (maxEnergy) **100**, atk 86 / def 76 / spd 97, spriteScale **2.10** (idle content
44px × 2.10 × 1.18 ≈ **109px** on-screen, HxH kid band). `energyConfig.label = "Volts"`.
Archetype: **fragile electric rushdown / assassin**. Brutality: inherits killua's HARD exclusion (kid; no gore).

## Pipeline (`zoldyck_work/`)
- `analyze.py` — border-flood-fill key (BG_TOL 45; cyan/white lightning far from olive → protected) → `keyed_full.png` + band report + magenta/black/white proofs.
- `slice.py` — feet-aligned uniform reslice driven by `actions.json` (`force_frames` even-split for FX-bridged rows: dash/palm).
- `fx_slice.py` — DIRECT-color key for the white-bordered FX boxes (olive interior the border-fill can't reach): bolt / pillar / barrage.
- `gen_recolor.py` — palette-box LUT (Anime→Anime Old / Anime→Manga) over every BODY sheet; Godspeed frames + FX excluded.

## Section ledger — the AmandioHype sheet K, part by part
| Sheet region | Used as | Phase |
|---|---|---|
| Mugshot x5-240 y30-313 | `zoldyck_portrait.png` (230×281, olive specks cleaned) | 1 |
| Palettes x760-935 y335-385 (AnimeOld/Anime/Manga/Base) | recolor LUT source (Anime=default) | 3 |
| 6 cut-ins x318-676 y30-168 | `zoldyck_cutin1-6.png` (reserved cinematic overlays) | 1 |
| Stance / Move / Dash / Jump / Guard / Damage / KO / Hanging | idle/walk/dash/jump/guard/hurt/knockdown/hang | 1 |
| Ultimate-Action frames y935-980 + sparks | `charge` (Volts recharge + Godspeed activation pose) | 1/3 |
| B (light) / Y (heavy) / Y+Up (up) / B+Jump (air) / Y+Jump (down-air) | 5 basic normals | 1 |
| B+Fwd / B+Up / Y+Fwd / Y+Down / B+Down | command/cast poses zoldyckCommand/Orbit/Yoyo/Claw/Palm (sheets ready) | 1 |
| Win / Lose | win / lose | 1 |
| 2-Koma (Rhythm Echo) | `zoldyckRhythmEcho` cast | 2 |
| 4-Koma A (Thunderbolt) + blast FX box x388-625 | `zoldyckThunderbolt` cast + `zoldyck_boltfx` | 2 |
| 4-Koma B (walk+reach pocket; **red item = ChocoRobo-kun candy box**, 9×9px `#DC0608` @x499 y2511) | `zoldyckSnack` cast → **U+Special Snack Break** | 2 |
| 5-Koma A (afterimage strikes) | `zoldyckEchoStrike` cast | 2 |
| 5-Koma B (barrage) + blast FX box x652-889 | `zoldyckBarrage` cast + `zoldyck_barragefx` | 2 |
| 6-Koma A (Narukami) + FX2 pillars box x267-551 | `zoldyckNarukami` cast + `zoldyck_pillarfx` | 2 |
| 6-Koma B#1 (Godspeed): activation + 4 blue bursts + run poses + bolt/afterimage/crescent FX | `zoldyckGsRun` (Whirlwind) + code-drawn burst/crescent | 3 |
| 6-Koma B#2 (auto-react "after pass the line"): 8 crouch/read poses + cyan floor-line FX | `zoldyckGsCrouch` (Speed of Lightning) + code-drawn floor line | 3 |
| **UNUSED**: FX1 sparks (6-Koma A), bottom spark box, the lightning-bolt teleport frames, the two GON example boxes (excluded per brief), the Base palette | — teleport/aura/afterimages are code-drawn instead (`drawZoldyckFx`) | — |

## KIT — numbers + canon labels
**Normals (Light/Heavy ± dir):** light 38 / heavy 78 / up(upAttack) 60 launcher / air 50 / down-air 70 (CANON — base Killua feel).

**VOLTS (CANON-ADJACENT):** the energy meter, labelled "Volts". Does NOT self-regenerate (`regenEnergy` early-returns for zoldyck). Recharge by **HOLDING Charge** (`doEnergyCharge` +0.5/f, vulnerable while charging).

**Specials (Special `l` + dir, `executeZoldyckSpecial` / `_specialHeldDir`):**
| Input | Move | Volts | Effect | Label |
|---|---|---|---|---|
| N | Thunderbolt | 22 | forward bolt projectile (boltfx) | CANON-ADJ |
| F | Rhythm Echo | 18 | step fwd + 36f intangibility (afterimages absorb hits ~0.6s) | CANON-ADJ |
| B | Echo Strike | 26 | zip fwd + advancing multi-hit 64 | CANON-ADJ |
| D | Narukami | 30 | leap → 3 lightning pillars strike down at the foe's column | ORIGINAL (canon name) |
| U | Snack Break | 0 | ChocoRobo — long VULNERABLE anim, refills +40 Volts | ORIGINAL |

**Ultimate (Ult `u`):**
- NEUTRAL = **Thunderbolt Barrage** (100 Volts) — zip-in + 6 guaranteed beats + 110 finisher (~145 EFF). CANON-ADJ.
- DOWN = **Godspeed** (CANON) — full-body electricity. Entry **30 Volts**, drain **0.26/f** (~4.5s), ends at 0 Volts with a **drained stagger** (34f vulnerable). Buff ×1.2 dmg / ×1.35 atk-speed / dash 26 / speed 115.
  - Two modes toggled with **Charge** (no recharge during Godspeed):
    - **WHIRLWIND** (rush, default) — bolt-dash + blue afterimages, faster strings, **crescent** Thunderbolt variant (72 dmg, faster/bigger).
    - **SPEED OF LIGHTNING** (auto-react, "after pass the line") — crouch/read stance + cyan floor line (185px); when the foe crosses it OR attacks in range → auto lightning-teleport counter (48 dmg), **max 3** per activation. Normal blocking still applies.
  - **Canon naming note:** sources disagree which mode is the automatic one — this build uses **SPEED OF LIGHTNING = auto-react** and **WHIRLWIND = rush**, matching the brief's labels.
- Refuses Barrage AND Godspeed during **KO / Brutality / Domain / Rick-Prime rewind** (`zdUltRefused` at entry + per-frame `cinematicSafe` check → clean end, no softlock, never OOB).

**OMOLOLU GUARD:** omololu's Flash Time copies Godspeed's drain *concept* only (separate fns/state, no shared module). Changing zoldyck does not affect it. Verified green every phase (live 13/0, kit 19/0, Flash Time 18/0). The shared `tickSustainedFormDrain` was NOT modified (Godspeed uses a plain meter decrement).

## Lines (original, text-only; voice = base Killua intro alias)
Sharp, teasing, protective of Gon. HxH matchups (arcade.js opt-in): **gon · hisoka · kurapika · chrollo · shizuku · meruem · netero** + a killua self-mirror + generic `arcadeRivalLines`.

## Skins
Anime (default) / Anime Old / Manga — palette-box recolor LUT over body sheets; **Godspeed frames keep their own blue palette** (`zdRecolorAnim` + `gen_recolor.py` exclude gsrun/gscrouch + FX). All skins share the default portrait (the detailed illustration corrupts under the body LUT).

## Verification
test:zoldyck-phase1 **17/0** · phase2 **15/0** · phase3 **15/0** (Godspeed activation / drain / mode-toggle / no-recharge / drained stagger / auto-react counter / 3 skins). base killua **24/0**, determinism **9/0** (no gameRng/Math.random), OMOLOLU GUARD green, roster-integrity ✓, combo-standard 225/9 (pre-existing gogeta/goku_rose + unclassified newer fighters). combat.js + base killua byte-identical all phases.

## Commits
- P1 assets **2606844a** (code swept into concurrent shisui commit cbc1d5b5).
- P2 **8642463604** (Volts + specials + Barrage; recovered via private-index after a concurrent commit cleared the index).
- P3 (Godspeed + lines + skins + ledger) — this commit.

★ SEVERE shared-checkout concurrency throughout (gon + shisui_itachi_kids sessions): foreign edits were
excluded every phase via HEAD+exact-edit reconstruction / private-index `commit-tree`. See the memory file.
