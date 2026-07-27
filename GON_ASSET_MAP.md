# GON FREECSS — Asset Map

3rd Hunter x Hunter character (after Netero, Killua). rosterKey `gon`. Balanced all-rounder.
Source art = ~33 per-action PNGs (`gon_*.png`) + two master reference sheets. Uploaded filenames are
preserved exactly; `*_uniform.png` are RE-SLICED (tools/reslice_strip.mjs → uniform feet-aligned cells)
copies of the uploaded strips (originals kept, recoverable from git).

## Master sheets
- `gon_freecss_transparent.png` (1524×2559) — FX/effect atlas (explosions, charges, aura, projectiles).
- `gon_freecss_transparent_2.png` (1515×2079) — LABELED body-pose rows (STANCE / MOVE / DASH / JUMP /
  GUARD / TAKING DAMAGE / KNOCKED OUT / …) + a MUGSHOT/LIFEBARS portrait (top-left).
- `gon_freecss_transparent copy.png` — byte-identical duplicate of `transparent.png` (unused).

## STAGE 1 — movement / state  ✅ WIRED
| Action | Sheet (resliced) | Source | frames · cell |
|---|---|---|---|
| idle | `gon_idle_uniform.png` | STANCE row extracted from `transparent_2` → `gon_idle.png` | 4 · 36×47 |
| walk / run | `gon_walk_uniform.png` | `gon_walk.png` (MOVE row) | 8 · 49×46 |
| dash | `gon_dash_uniform.png` | `gon_freecss_dash.png` | 2 · 43×43 |
| jump / fall | `gon_jump_uniform.png` | `gon_jump.png` | 7 · 40×47 |
| guard | `gon_guard_uniform.png` | `gon_freecss_gaurd.png` | 3 · 37×45 |
| hurt | `gon_hit_uniform.png` | `gon_hit.png` | 4 · 42×45 |
| portrait | `gon_portrait.png` | celebrate pose cropped from `transparent_2` top-left | still |
| intro | *(idle-hold stopgap)* | — no dedicated intro strip; `introPool:["idle"]` | — |

spriteScale **2.5** (idle content 45px → ~112px on-screen, roster band). anchorY −2 (botGap 1 × 2.5).

## STAGE 2 — normals + Toji-rekka chain  ✅ WIRED
5 normals + a Down+Heavy cancel-on-hit "Rush" chain (Flash architecture: `updateGonCommandCombat`,
`GON_COMMAND` in abilities.js). All strips resliced → `*_uniform.png`.
| Slot | Sheet (resliced) | Source | frames · cell |
|---|---|---|---|
| light | `gon_foward_punch_uniform.png` | `gon_freecss_foward_punch.png` | 3 · 50×47 |
| heavy | `gon_dash_headbutt_uniform.png` | `gon_freecss_dash_headbutt_attack.png` | 7 · 50×42 |
| up (launcher) | `gon_super_up_kick_uniform.png` | `gon_freecss_super_up_kick.png` | 7 · 58×58 |
| air | `gon_air_attack_uniform.png` | `gon_freecss_y+jump_attack.png` | 8 · 35×51 |
| down_air | `gon_down_air_uniform.png` | `gon_freecss_down_air_attack.png` | 3 · 36×46 |
| rush1 (rekka opener, flurry) | `gon_second_hit_uniform.png` | `gon_freecss_second_hit_animation.png` | 4 · 55×24 |
| rush2 (rekka finisher, launcher) | `gon_super_up_attack_uniform.png` | `gon_super_up_attack.png` | 10 · 82×82 |

Rekka = Down+Heavy → rush1 → (re-tap Heavy in recovery, ON CLEAN HIT) → rush2. A whiff/block leaves
`_cmdHitLanded` false → chain stops (mid-chain interrupt). Verified: rush1→rush2 = 2-hit combo; whiff blocks.

## STAGE 3 — Jajanken (3 separate specials)  ✅ WIRED
Direction-branched SPECIAL button (`_specialHeldDir`, Killua/Flash architecture), no gating.
`executeGonSpecial` + `fireGonRock/Scissors/Paper` in abilities.js; registered in `triggerSpecial`.
| Input | Move | Sheet (resliced) | Source | dmg (eff) · energy |
|---|---|---|---|---|
| Neutral+Special | **ROCK** (charge→punch) | `gon_rock_uniform.png` (10 · 63×47) | `gon_freecss_specail_puch.png` | 90 single · 45 · **18f telegraph** |
| Fwd+Special | **SCISSORS** (multi-hit jab) | `gon_scissors_uniform.png` (12 · 59×48) | `gon_freecss_super_sisors_attack.png` | ~12/hit ×5 · 30 |
| Down+Special | **PAPER** (palm push) | `gon_paper_uniform.png` (5 · 43×50) | `gon_freecss_push.png` | 27 single · 24 · huge knockback |

Rock's 18-frame startup shows the charge-windup frames = a real, blockable telegraph (highest dmg/commitment).
Scissors uses the Flash spin-whirl multi-hit re-arm pattern. Paper is a spacing tool (low dmg, big push).
UNUSED so far: `gon_charge_1/2.png` (aura FX overlays), `gon__specail_1.png`, `gon_special_2/3/4/5.png`,
`gon_dasheffect_1.png`, `gon_freecss_push_effect.png`. Projectiles reserved (no fishing-rod content):
`gon_projectilethrow_1.png`, `gon_specialprojectile_5.png`.

## STAGE 4 — Adult Form (Ultimate)  ✅ WIRED
Ultimate = **Adult Form**, a sustained BUFF-MODE transformation (Godspeed/Flash-Time architecture — no
adult body-swap art in the batch, so it's an overlay on the child body + a green Nen aura) with a HARD
trade-off and a NOVEL match-ending payoff. `executeGonUltimate` / `enterGonAdultForm` /
`applyGonAdultFormSystem` in abilities.js; `gonAdultFormCinematic.js` (mirrors killuaGodspeedCinematic.js).
| Piece | Detail |
|---|---|
| Activation | ultimate button; near-max Nen (≥140/160); frozen growth cinematic (`transform` pose) |
| Movement LOCKOUT | `canJump=false` + `noDash=true` + `speed=40` (walk clamps to the 4px/f floor) = slow lumber only |
| Drain | 0.30 Nen/frame → auto-revert on empty (shared `tickSustainedFormDrain`). Reverting is NOT a loss. |
| Buff | damageMultiplier/attackMultiplier ×1.3 while active |
| SUDDEN-DEATH | SPECIAL button (replaces Jajanken while in form) → `fireGonSuddenDeath` ("Final Blow"): short-range (rangeX 82), fast (6f startup). One throw per form. |
| ON HIT (clean, unblocked) | **INSTANT MATCH WIN** for Gon — bypasses roundWins entirely (works at 0-0) |
| ON MISS (whiff OR block) | **INSTANT MATCH LOSS** for Gon — bypasses roundWins entirely (works while Gon leads) |

Match-override integration (game.js): `_matchOverride` module var + `_checkMatchOver()` refactored so a
forced winner ends the match INDEPENDENTLY of the roundWins>=2 / MAX_ROUNDS gate; `forceMatchEnd(side)`
arms it and routes through the same victory path; `_updateGonSuddenDeath()` (per frame, before
checkRoundEnd) reads combat's `_sdConnect` marker (clean/blocked, set in combat.resolveAttackHit) + the
armed `_suddenDeathWatch` and calls forceMatchEnd. Reset paths clear the cinematic + revert the form +
clear the watch + null the override.

Sheets (resliced): `gon_transform_uniform.png` (14 · 80×220, cinematic pose) from `gon_tranformation.png`;
`gon_finalblow_uniform.png` (16 · 105×219, the sudden-death strike) from `gon_finalblow.png`. Both use
`actionScale 0.42` (tall adult cells → ~1.6× child on-screen). Test: `test:gon-stage4` 25/25 (activation,
lockout behavior, clean-hit→win@0-0, whiff→loss-while-leading, override-independence, not-reachable-outside-form).

UNUSED Stage-4 candidates (deferred): `gon_freecss_stadium_lift.png` + `_effect.png` (an Adult-Form move),
a full adult body-swap (idle/walk/attack art doesn't exist → buff-mode overlay instead).

## Notes / flags
- **Intro** is an idle-hold stopgap (no dedicated intro strip). A bespoke intro could be cropped later.
- rosterKey is lowercase `gon` (required — getAction() lowercases the key).
