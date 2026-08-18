# ONOKI — Asset Map & Staged Build Plan

Onoki, the Third Tsuchikage of Iwagakure ("Onoki of Both Scales"). Naruto universe,
`rosterKey: "onoki"`. Schema-exception versatility kit. Source art arrived as **62 numbered
ROW strips** (`onoki_row_NN.png`) — each strip is one animation laid out horizontally.
RE-SLICED into clean uniform, feet-aligned cells by `tools/reslice_onoki.py` → the
`onoki_*_uniform.png` copies (the exact-as-uploaded row originals are kept untouched).

## STRUCTURAL SIGNATURE — two new-to-Onoki mechanics (user-confirmed, max effort)
1. **GROUND↔FLIGHT MODE TOGGLE.** Onoki is the roster's first character with *dedicated*
   ground-vs-flight movement art (canon Dust Release levitation). Pixel-verified distinct:
   row_02 feet-planted idle vs row_03 airborne hover idle. Wires into the existing shared
   `traits.canFly` flight-toggle system (abilities.js `toggleOmniManFlight`, physics.js
   `_flightActive` gravity gate, sprite.js `fly`/`flyMove` resolution) — but ships distinct
   fly/flyMove sheets instead of reusing idle like Omni-Man/Superman.
2. **PERSISTENT GOLEM SUMMON ULT.** Dust Release: Detachment of the Primitive World — a stone
   golem (rows 34–38, a distinct larger sub-character with its own 5-move set) summoned as a
   persistent on-field entity (reuse `summons.js` architecture: Meeseeks/Nue), NOT a one-shot
   cinematic hit.

## Stats / identity
- HP 1120 / EN 200 (shared "particle" pool: flight drain + jutsu) / atk 88 / def 82 / spd 84.
  Frail ancient Kage — edge is versatility + flight mobility + ranged Dust Release, not durability.
- `energyType: "particle"` (Kekkei Tota Dust Release / Particle Style) → HUD label.
- `spriteScale: 1.55` → idle content ≈96px on-screen (reads short, canon ~140cm). anchorY:0 everywhere.

## STAGE 1 — registration + movement/state (ground + flight) — ✅ DONE (test:onoki-stage1 25/0)
5-file gate: reslice tool + spritesheets.js manifest + characters.js def + skins.js default +
credits.js (PROJECT_ART_KEYS). Harness `onoki_stage1.mjs` + `onokiFlightToggle` __harness hook +
charDef `traits` field.

Wired animationData → sheet:
| action    | row  | sheet                              | frames |
|-----------|------|------------------------------------|--------|
| idle      | 02   | onoki_idle_uniform                 | 10     |
| walk/run  | 04   | onoki_walk_uniform                 | 8      |
| dash      | 55   | onoki_dash_uniform                 | 5      |
| guard     | 42   | onoki_guard_uniform                | 7      |
| jump      | 08   | onoki_jump_uniform                 | 4      |
| fall      | 09   | onoki_jump_flip_uniform            | 6      |
| fly       | 03   | onoki_hover_idle_uniform           | 8      |
| flyMove   | 20   | onoki_flight_glide_uniform         | 9      |
| hurt      | 13   | onoki_hit_uniform                  | 9      |
| knockdown | 10   | onoki_knockdown_uniform            | 5      |
| getup     | 11   | onoki_getup_uniform                | 7      |
| taunt     | 18   | onoki_taunt_uniform                | 8      |

SLICED + HELD IN RESERVE (need dedicated hooks in later stages):
fast_dive (row_06), aerial_spin (row_29), dodge_roll (row_50), backflip (row_44),
downed_slide (row_17), heavy_stun reaction (row_32), crouch (row_14), flight_dash (row_05).

## STAGE 2 — 5 normals + command normal — ✅ DONE (test:onoki-stage2 15/0)
Reslice STAGE2 block → light row_56 (4f), heavy row_24 (7f rock-arm straight), up row_25 (8f rock
uppercut launcher), air row_21 (8f dive kick), down_air row_62 (9f rock-leg spike), cmdchain row_31
(11f). Wired animationData light/heavy/up/air/down_air + onokiCombo; tuned basic_attacks (heavy
rangeX 96 long-reach rock arm, up launcher launch 11, down_air spike kbY 11). Command normal =
NEW `updateOnokiCommandCombat` in abilities.js (single Fwd+Heavy `onokiCombo`, Madara Susanoo-Punch
pattern, FREE cd36, damage 70) + game.js import + dispatch (after hashirama). currentMove="onokiCombo"
→ sprite.js identity map. NOT a rekka (source art is one continuous combo).

## STAGE 3 — 6 Dust Release specials — ✅ DONE (test:onoki-stage3 24/0)
Reslice STAGE3 block. Direction-branched via executeOnokiSpecial (NEW in abilities.js, triggerSpecial
case "onoki"): Neutral=onokiRockFist (row_23, super-armored transform) / Fwd=onokiLunge (row_26, travels
vx) / Back=onokiArmSwing (row_60) / Up=onokiTauntFin (row_48, LAUNCHER launchVy-28) / Down=onokiCapeSpin
(row_15 poses 0-8 + spawns 2 `onokiRock` projectiles). Jutsu Charge/Launch = SEPARATE CHARGE(P)-hold→
release `fireOnokiJutsu` (game.js handleChargeRelease, placed BEFORE the flight toggle; fires on wasHeld,
does NOT return on tap → P-TAP still toggles flight). charge pose=row_45 loop, launch pose=row_16,
spawns procedural `onokiJutsuBlast` dusty sphere (no dedicated proj art). Rock projectile art = row_15
run-9 MIDDLE chunk via NEW crop_frame() helper (549,29,567,51). animationData +7 keys (onokiRockFist/
Lunge/ArmSwing/TauntFin/CapeSpin/onokiJutsu/charge). Regression: hashirama 35/0 (flaky sampling, not mine).

## STAGE 4 — flight-mode / air specials + Rock Platform Ride — ✅ DONE (test:onoki-stage4 14/0)
Added an AIRBORNE branch to executeOnokiSpecial (fires while airborne OR _flightActive; grounded===false
covers both): Up=onokiPlatformRide (row_52, NEW fireOnokiPlatformRide — instant rise fighter.y-90 +18f
i-frames + 0 dmg, self-contained "simpler single-platform-ride", NO platform-collision dependency) /
Down|Fwd=onokiFastDive (row_06, spike, vx+vy dive carries during flight) / neutral|Back=onokiAerialSpin
(row_29). NEW ONOKI_AIR_SPECIALS + fireOnokiAirSpecial helper. Sliced row_52 (fast_dive/aerial_spin were
already sliced in S1). +3 animationData keys. Harness fires via liftP1+p1SpecialDir; proves an air special
fires while _flightActive. Regression: onoki S3 ground specials still 24/0 (grounded skips air branch).

## STAGE 5 — GOLEM SUMMON ULTIMATE — ✅ DONE (test:onoki-stage5 10/0)
"Dust Release: Detachment of the Primitive World." NEW executeOnokiUltimate (triggerUltimate case "onoki",
cost 100): camera-focus cast beat (Onoki holds onokiUltCast = row_46 runs 0-2 hand-sign frames) →
schedulePendingSpawn(30) hands off to a PERSISTENT stone GOLEM. Golem = NEW summons.js `onokiGolem` template
(oneHit:FALSE → strikes on 54f cadence for its ~600f/10s life; behavior "rush", spriteScale 1.15 → ~174px,
~1.8× Onoki). Two-phase spawn: transition/forming pose (spawnSheet, spawnBeat 24) → idle rush. NEW
updateOnokiGolemPose driver (hooked in updateSummons next to narutoToad) swaps idle↔punch↔swing on the
attack cadence (alternating), all poses padded to a COMMON 178x151 cell (NEW reslice pad_to param) so feet
stay planted through swaps. Golem sheets = rows 34(idle)/35(transition)/36(swing)/37(punch); row_38 leap =
RESERVE (airborne pose doesn't ground-align). Damage via applyScaledDamage (×0.60). Payoff = ONGOING golem
threat, NOT a one-shot nuke (distinct from roster freeze-cinematic ults). Regression: Rick/Meeseeks 35/0
(shared updateSummons clean). GOTCHA: cast-pose harness check must POLL a window (single-frame check races the fire timing).

## STAGE 6 — FINAL: canonical suite + balance + label — ✅ DONE = FULL BUILD COMPLETE (test:onoki 31/0)
Canonical harness/onoki.test.mjs: static sheet+portrait+golem/proj sweep + stats gate + flight art +
normals + command normal + 6 specials + air specials + platform ride + golem ult + 30-action fallback-box
sweep. NEW ui.js ENERGY_TYPE_LABELS["particle"]="Particle" (naruto universe wasn't overridden → was
generic "ENERGY"). NEW game.js __harness.p1Ultimate hook (deterministic ult trigger, mirrors p1SpecialDir
— the "u" key is gated/flaky in long suites). Portrait done (S1). BALANCE_AUDIT entry added: VERSATILITY
schema-exception (Madara/Hashirama class), honest ×0.60 end-to-end, FRAIL frame (no stat record), 2
mechanic watch-items (persistent golem field-presence/total-if-camped; dual-use charge button). Regression:
Rick 35/0, Hashirama 35/0, energy-labels 11/0, credits 14/2 pre-existing (toji/pain). GAPS by design: no
skins batch (row_01 palette-swatch reference banked, Hiruzen precedent), no voice (zero source clips).

## SKINS BATCH — ✅ DONE (test:onoki-skins 17/0)
NEW tools/gen_onoki_creative.py: Default + 12 creative recolors + 1 Alien-X Void = 13. CAPE-primary
to-tone recolor (classify() 4 regions: CAPE green / OUTFIT navy / ACCENT red / SKIN+OUTLINE protected;
palette pixel-confirmed from onoki_row_02.png). Skins: Stone Sovereign / Iron Fortress / Jade Mountain /
Dust Release (prismatic) / Tsuchikage (crimson+cream Kage robe) / Golden Kage / Third's Regalia / Molten
Core / Crimson Rock / Ash Elder / Young Prime / Sand Accord / Eternal Void. Void = full-black + NEW game.js
drawOnokiVoidAuraOverlay (amber-stone dust motes + glow + glowing amber eyes, gated skinId onokiEternalVoid,
Hiruzen/Isshiki pattern). 391 PNGs (13×29 sheets + 13 portraits). skins.js append-only (14 entries).
credits: onoki already in PROJECT_ART_KEYS (covers recolors). Tools modes: probe/preview/all/<tag>.

## FOLLOW-UP still open
- VOICE: no source clips exist → blocked until clips are provided.

## PLANNED LATER STAGES (from the CONFIRMED ONOKI DESIGN)
- **Stage 3 — ground specials.** Rock Fist Transform Strike row_23, Rock Fist Lunge row_26,
  Rock Arm Swing row_60, Spinning Cape + Rock Projectiles row_15 (poses + 2 projectiles — MIXED,
  needs band/pick split), Jutsu Charge/Launch row_16 + row_45 (charge-hold), Taunting Combo
  Finisher row_48.
- **Stage 4 — flight-mode specials + Rock Platform Ride** row_52 (positioning special; a single-
  platform-ride version, independent of any unbuilt platform-collision system).
- **Stage 5 — GOLEM SUMMON ULT.** Cast row_46 (freeze/camera-focus beat) → hand off to the
  persistent Golem entity. Golem moveset: idle row_34, transition row_35, swing row_36,
  punch row_37, leap row_38 (131–186px scale, its own summon template in summons.js).
- **Stage 6 — portrait/skins/balance/voice.** Portrait ✅ already generated (bust from idle
  frame 0, onoki_portrait.png). Skins batch: row_01 is a palette-swatch reference (bank it,
  Hiruzen color_palletts precedent).

## FILE-HANDLING NOTES / GOTCHAS (verify before wiring)
- MIXED rows needing band/pick/xrects: row_15 (poses + 2 projectiles), row_46 (2-row cast block),
  row_49 (25 poses + boulder props), row_53 (pure prop sheet — FX only), row_58 (leftovers grid).
- Duplicate-shaped rows to pixel-compare before use: row_12/33/39 (idle variants), row_28/43/54
  (run/walk variants) — may be extra flight-mode/costume states or genuinely redundant.
- BONUS/unassigned real content held in reserve: row_19, 22, 30 (compare vs row_23 rock-fist),
  40, 41, 51, 57, 59 (compare vs row_24/60), 61.
- row_32 "heavy stun" is a REACTION (KRAK! FX), not an attack — wire as a heavy-hit-taken state.
