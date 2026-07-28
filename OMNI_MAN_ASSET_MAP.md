# OMNI-MAN — Asset Map

Character: **Omni-Man / Nolan Grayson** — `rosterKey: "omniman"`, universe **Invincible** (brand-new universe, established by this build).
Archetype: overwhelming-raw-power bruiser with a toggleable **Flight** movement mode.
Energy resource (display-only rename): **Smart Atoms** (`energyType: "smart_atoms"`).

All filenames below are **exactly as uploaded** — several contain a literal colon (`:`) and MUST be
preserved verbatim (referenced with a leading `./` in sheet paths so the colon is never mistaken for a
URL scheme; note underscores in the prefix already make scheme-parsing impossible, but `./` is belt-and-braces).

Sprites are M.U.G.E.N-style "Custom Sprites based off of Green Lantern by Enzo Deygo2099, Arcue and McCready — made by Peter Coffen" (credit line baked into the master sheet).

---

## Step 1 — Master sheet + file catalog

**Master reference sheet:** `omni_man_transparent.png` — **2000×2750**, the full M.U.G.E.N sheet
(purple background, every animation row: idle/walk/jump/attacks/flying/falling + credit block).
The individual `omni_man_*.png` files are pre-cut strips lifted from this master; where a needed state
has no standalone strip (ground **walk/run**, **guard/block**), it will be re-sliced from this master.
`omni_man_transparent copy.png` (87×136) is a single-frame duplicate scrap — ignore.

| File | Dims | Frames* | Content |
|---|---|---|---|
| `omni_man_idle.png` | 264×139 | 3 | Standing idle, arms crossed, cape (measured: runs x3-79/93-168/181-254, pitch 88) |
| `omni_man_ground_punch.png` | 633×130 | 5 | Jab → straight cross (ground light/medium) |
| `omni_man_ground_punch_1.png` | 499×128 | 4 | Alt punch variant |
| `omni_man_ground_up_attack.png` | 537×166 | 4 | Overhead/rising swing (up attack / launcher) |
| `omni_man_ground_down_attack.png` | 578×133 | 5 | Low hook (down/crouch attack) |
| `omni_man_ground:air_kick.png` | 530×154 | 4 | Flying kick, leg extended (heavy kick — works ground+air) |
| `omni_man_grab_attack.png` | 468×126 | 4 | Two-handed shove/grab |
| `omni_man_push.png` | 557×153 | 4 | Big two-arm shove (command normal / knockback poke) |
| `omni_man_air_foward_punch.png` | 405×144 | 3 | **Upright** forward punch — STANDARD aerial normal (see Step 2) |
| `omni_man_air_down_attack.png` | 619×154 | 5 | Diving/lunging cape-swirl down attack (aerial down / divekick) |
| `omni_man_air_down_attack_2.png` | 382×138 | 3 | Angled dive-attack, arms out (aerial down variant) |
| `omni_man_air_hit.png` | 252×171 | 2 | Airborne hit reaction / tumble (aerial hurt) |
| `omni_man_ground:air_hit.png` | 382×127 | ~3 | Generic hurt/flinch (ground+air hurt) |
| `omni_man_ground_down_attack.png` | 578×133 | 5 | (dup row above) low hook |
| `omni_man_non_flying_jump.png` | 666×143 | 6 | Crouch → leap → airborne (STANDARD jump, flight OFF) |
| `omni_man_non_flying_landing.png` | 878×158 | ~7 | Landing recovery (STANDARD land, flight OFF) |
| `omni_man_intro_version_3.png` | 653×161 | ~6 | Flex/arms-up hero intro (standing) |
| `omni_man_intro:version_2.png` | 869×133 | ~7 | Alt intro |
| `omni_man_intro_part_1_falling.png` | 90×156 | 1 | Diving head-down from the sky (intro crash — part 1) |
| `omni_man_intro_part_2:revese.png` | 352×154 | 3 | 3-point landing crouch → stand (intro crash — part 2) |
| **`omni_man_air_to_ground_combo_punch.png`** | 1670×127 | ~13 | Upright punches → **transitions to horizontal flying dive-punch** — FLIGHT-specific dive |
| `omni_man_combo_to_launch_the_oppenets_up.png` | 1362×173 | ~11 | Launcher combo string (uppercut launch) |
| **`omni_man_combo_where_he_lands_on_his_oppenets.png`** | 1983×191 | ~13 | Flies up then body-slams down onto opponent — **longest/most elaborate → ULTIMATE** |

### Flight-system-specific sheets (NOT "air"-named — see naming trap in Step 2)
| File | Dims | Frames* | Content |
|---|---|---|---|
| `omni_man_jump:flying_idle_animation.png` | 510×148 | 4 | Horizontal superman-flight hover pose (**flight idle** — doubles as flight "jump") |
| `omni_man_flying_run:dash.png` | 368×124 | 2 | Horizontal streaking flight (flight directional movement / dash) |
| `omni_man_for_when_he_falls_from_flying_part_1.png` | 416×121 | 3 | Tumbling horizontally out of the sky (forced-descent — part 1) |
| `omni_man_for_when_he_falls_from_flying_part_2.png` | 688×144 | 4 | Head-down tumble/plummet (forced-descent — part 2) |

\*Frame counts are visual/dimension estimates; each is confirmed via alpha-gutter scan at wire time
(idle already confirmed = 3). Fragmented strips get re-sliced to uniform cells (`harness/reslice.mjs`).

---

## Step 2 — The "air"-file naming trap (REQUIRED FINDING)

Per the brief's critical naming note, every `air`-named file was opened and classified by **actual body
orientation**, not filename:

| File | Body orientation | Verdict |
|---|---|---|
| `omni_man_air_foward_punch.png` | **Upright / vertical**, feet down | **STANDARD aerial normal** → `air` slot |
| `omni_man_air_down_attack.png` | Vertical, diving/lunging downward | **STANDARD aerial** down-attack / divekick |
| `omni_man_air_down_attack_2.png` | Vertical, angled dive, arms out | **STANDARD aerial** down-attack variant |
| `omni_man_air_hit.png` | Tumbling recoil | **STANDARD aerial** hurt/hitstun |
| `omni_man_ground:air_hit.png` | Flinch | **STANDARD** hurt (ground+air) |
| `omni_man_ground:air_kick.png` | Extended flying kick | **STANDARD** kick normal (ground+air) |
| `omni_man_air_to_ground_combo_punch.png` | Upright → **horizontal superman dive** | **FLIGHT-SPECIFIC** dive attack |

**Conclusion / trap direction:** the naming is *inverted* from expectation. Almost every `air`-named
file is **standard aerial-normal** content and belongs in the schema's existing `air`/`down_air`/`hurt`
slots. The genuinely **flight-specific** content lives in the **non-`air`-named** files — the ones named
`flying_*`, `jump:flying_*`, and `falls_from_flying_*`. The single `air`-named exception that IS flight
content is `air_to_ground_combo_punch` (it resolves into the horizontal flight pose mid-sequence).

---

## Step 3 — Largest / most-elaborate sequence (ULTIMATE candidate)

Ranked by width (proxy for sequence length/elaborateness):

1. **`omni_man_combo_where_he_lands_on_his_oppenets.png` — 1983×191 (~13f)** ← **chosen ULTIMATE base.**
   Reads as a complete cinematic beat: Omni-Man launches up, then crashes down body-first onto the
   opponent. Distinct, dramatic, self-contained — ideal for the freeze/camera-focus cinematic
   architecture (Beerus Ki-Ball / Gon Adult-Form precedent).
2. `omni_man_air_to_ground_combo_punch.png` — 1670×127 (~13f): flight dive-punch (better as a **flight special**, Stage 4).
3. `omni_man_combo_to_launch_the_oppenets_up.png` — 1362×173 (~11f): launcher (Stage 2 chain finisher or a Stage-4 special).

**Fallback if the slam doesn't wire cleanly:** an upgraded/supercharged version of his hardest-hitting
special (the flight dive-punch), per the brief.

---

## Flight system asset assignments (Stage 3)

- **Flight idle/hover:** `omni_man_jump:flying_idle_animation.png`
- **Flight directional move / dash:** `omni_man_flying_run:dash.png`
- **Forced descent (Smart Atoms = 0 mid-air):** `omni_man_for_when_he_falls_from_flying_part_1.png`
  → `..._part_2.png` played back-to-back (concatenated ~7-frame plummet), then
  `omni_man_non_flying_landing.png` for the landing-recovery vulnerability window.

## Stage 1 — wired slices (CONFIRMED via alpha-gutter + rendered evidence)

| Action | Source → uniform sheet | frames | w×h | Notes |
|---|---|---|---|---|
| idle | `omni_man_idle.png` (raw) | 3 | 88×139 | clean even pitch, no reslice |
| walk/run/dash | master band 3 → `omni_man_run_uniform.png` | 6 | 129×110 | forward-charge lunge (no walk cycle in source); shared sheet, walk slower |
| jump | `omni_man_non_flying_jump.png` → `omni_man_jump_uniform.png` | 6 | 131×143 | crouch→leap→apex, hold last |
| fall | (jump sheet, last frame, sourceX 655) | 1 | 131×143 | apex/descent pose |
| hurt | `omni_man_ground:air_hit.png` → `omni_man_hit_uniform.png` | 3 | 126×127 | knockdown auto-routes here |
| intro | `omni_man_intro_version_3.png` → `omni_man_intro_uniform.png` | 6 | 146×161 | arms-raised hero flex; `introPool:["intro"]` |
| guard | — | — | — | NO guard strip → idle fallback (isBlocking stays true); flagged |

Evidence: `harness/omniman_stage1_shots.mjs` → 9/9 pass; shots `harness/shots/omniman_s1_*`.
Deferred art: dedicated guard/block pose; crash-from-sky intro sequence (`intro_part_1_falling` →
`intro_part_2:revese`) — pairs with Stage-3 forced-descent; ground walk cycle (source has none).

## Stage 2 — normals + command chain (CONFIRMED, test:omniman-stage2 10/10)

5 normals (damage from basic_attacks; heavier-than-average by design) + grab, all identity-mapped:
| Action | uniform sheet | frames | dmg |
|---|---|---|---|
| light | `omni_man_ground_punch_uniform` | 5 | 50 |
| heavy | `omni_man_ground_punch_1_uniform` | 4 | **120** (super-armored haymaker — FLAGGED) |
| up (launcher) | `omni_man_ground_up_attack_uniform` | 4 | 92 (launch 12) |
| air (STANDARD aerial) | `omni_man_air_forward_punch_uniform` | 3 | 78 |
| down_air (dive spike) | `omni_man_air_down_attack_2_uniform` | 3 | 105 |
| grab | `omni_man_grab_uniform` | 4 | 36 (throw — only animates on connect) |

**"Viltrumite Beatdown" command chain** (abilities.js OMNIMAN_CMD + updateOmniManCommandCombat,
shared rekkaContinue): Fwd+Heavy `omCombo1` (ground:air_kick, 58) → re-tap Heavy on HIT → `omCombo2`
(ground_down_attack, 54) → `omComboFin` (combo_to_launch, 95, LAUNCHER). Cancel-on-hit: a whiff/block
ends the string (verified). Free poke: Fwd+Light `omPush` (push, 46, huge pushback, cd 26).

## Stage 3 — FLIGHT mechanic (CONFIRMED, omniman_stage3_shots 15/15)

Toggleable movement MODE (P/charge-button edge) that REPLACES the jump. Flight sprites (all
FLIGHT-specific, not the `air` slot): `fly` (hover, omni_man_fly), `flyMove` (streak, omni_man_fly_move),
`forcedDescent` (crash tumble, concat of falls_from_flying part1+2 → omni_man_descent), `descentLand`
(crash-landing recovery, omni_man_land).

- **Toggle** (`toggleOmniManFlight`, P-edge): engages a free 8-dir hover (no gravity), disengage = clean fall.
- **Drain** (`applyOmniManFlightSystem` via shared `tickSustainedFormDrain`): 0.08 Smart Atoms/frame
  (~42s from full 200) — far gentler than any ultimate drain. Regen suppressed while flying.
- **Forced descent** (`triggerOmniManForcedDescent` = the drain's `revert` at 0 energy): crash from the
  sky (control locked) → landing-recovery vulnerability window (42f, fully vulnerable) → clean recovery.
- **Shared pool**: `executeOmniManSpecial` ("Viltrumite Smash", cost 35) spends the SAME `energy` pool —
  casting mid-flight shortens flight time / forces an earlier descent.
- Physics: flight branch in `moveFighter` + hover (no-gravity) branch in `applyGravity`; `_flightActive`/
  `_forcedDescent`/`_descentLandTimer` gate everything (no-ops for all other fighters).

## Stage 4 — specials (CONFIRMED, omniman_stage4_shots 8/8)

Direction-branched off Special (`_specialHeldDir`), all SHARED Smart Atoms pool (abilities.js
executeOmniManSpecial):
| Dir | Special | cost | sprite | notes |
|---|---|---|---|---|
| Neutral | Viltrumite Smash | 35 | reuses `heavy` (omSmash→heavy) | super-armored power punch, top single-blow |
| Forward | Skewering Rush | 30 | `omni_man_skewer` (air_to_ground, 12f) | flying tackle, +20 vx lunge, ground or air |
| Down | Meteor Drop | 40 | `omni_man_meteor` (air_down_attack, 5f) | diving slam, spikes down (+vy dive if airborne) |

**Deferred/flagged:** no thrown-object or Heat-Vision (eye-beam) art in the batch → no ranged special
(intentional omission). Mid-flight casts verified to draw from the same pool (shared-resource tension).

## Stage 5 — ULTIMATE (CONFIRMED, omniman_stage5_shots 9/9)

**Path taken: the LARGEST/most-elaborate sequence** (asset-map Step 3) — `combo_where_he_lands_on_his_
oppenets` (15f, widest sheet) → **"Viltrumite Onslaught"** flying **body-slam**. Built on the shared
freeze/camera-focus cinematic architecture (NEW `omnimanBodySlamCinematic.js`, twin of
beerusKiBallCinematic / batmanDarkKnightCinematic): LEAP→SLAM→SETTLE (~130f); the caster's own
`ultimate` sprite plays through the freeze via `_spriteCastMove`; camera frames both fighters; a hard
shake + white flash + expanding ground-shockwave rings land on the SLAM connect beat; GUARANTEED
range-independent 340 dmg + knockdown (block chips to 25%). Cost 100 (half the Smart Atoms bar) — the
shared pool means it competes with flight + specials. abilities.js executeOmniManUltimate +
applyOmniManSlamDamage + triggerUltimate case; game.js freeze/draw/clear(×3)/innerCine/harness-status
all wired. Fallback (upgraded hardest special) NOT needed — the body-slam is a distinct, elaborate beat.

## Stage 6 — portrait + full test + balance (BUILD COMPLETE)

- **Portrait:** none in the batch → cropped head+torso from the idle → `omniman_portrait.png`, wired as
  `omniMan.portrait`. Renders on the select card (verified).
- **Canonical test:** `harness/omniman.test.mjs` — 36/36 (every move + flight toggle on/off + drain
  rate + shared-pool-while-flying + forced descent + ultimate). npm `test:omniman` (+ `test:omniman-
  stage0..5` re-added).
- **Regression:** full suite + explicit input/controller checks (controller-assign 16, input-wiring 10,
  ffa 22, team 16, training 32 — all green) → flight's movement-replacement did NOT break shared input.

### Balance (vs BALANCE_AUDIT.md — the 0.60 scale + bypass framework)
- Normals / command chain / all 3 specials run through `createAttackFromMove` → **scaled ×0.60 (EFF),
  in-pipeline, NO bypass**. EFF: heavy 72, specials 72–84 — strong but not warping cross-char comparison.
- **Ultimate 340 is manual-subtract → BYPASSES the 0.60 scale**, exactly like the Beerus (380) / Batman
  (300) / Kurama guaranteed-ult class. Intentional and IN-LINE with that class (not a new systemic issue).
- **Outliers (intentional, flagged):** HP 1400 = tankiest SELECTABLE char (+140 over Cell 1300; only
  hidden-boss Mahoraga 1600 higher); Atk 98 ties the roster ceiling (=Netero); heavy EFF 72 super-armored
  = top scaled heavy. Counterweights: below-median ground speed (84), reduced dashSpeed (16), a very
  committal heavy (13f startup / 26f recovery), and the SHARED Smart Atoms pool.
- **Shared-resource tension CONFIRMED:** flight drains 0.08/frame (~42s from 200); each special costs
  30–40 (≈375–500 frames of flight) and the ult costs 100 (half the bar); regen suppressed while flying →
  sustained flight genuinely competes with offense (verified: mid-flight cast −35 shortens flight; heavy
  usage forces an earlier forced descent).
- **Deferred/missing:** voice (232 `omniman_*.mp3` clips staged but UNWIRED — separate pass); dedicated
  guard pose; true ground walk cycle; crash-from-sky intro sequence; ranged/Heat-Vision + thrown-object
  specials (no art in batch); alt skins; win/lose poses.

## Post-build fixes (2026-07-27, branch combo-flow-layer)

Six fixes after Stage 6, all verified (canonical `omniman.test.mjs` 36/36 + stages 0–5 all green + `omniman_fixes_shots.mjs` evidence):

1. **Smart Atoms chargeable** — the P button was 100% consumed by the flight toggle, so there was NO way to build the shared pool (only slow passive ground regen 0.06/f). Reworked to the universal TAP-vs-HOLD charge split: a quick **P-TAP toggles Flight** (moved to `handleChargeRelease`, Gojo-Infinity pattern), a **P-HOLD charges Smart Atoms** (+0.5/f via the normal `doEnergyCharge` path, gated off while flying / forced-descent). Evidence: hold-P 40f = +22 energy (was −3).
2. **Clean floating** — the janky ground crouch-lunge (`run_uniform`) pose-popped when starting/stopping. Fixed by #3.
3. **No walk cycle** — `walk`/`run`/`dash` all re-pointed to the **idle-float sheet** (`omni_man_idle.png`); he glides in his hover pose, never plants his feet. Movement speed is stat-driven in physics (not anim-timed) so this doesn't slow him.
4. **Teleport-dash** — `movement: { dashTeleport: true }` + an `omniman` branch in `detectDoubleTapDashTeleport` (reposition-only blink, streaking `flyMove` pose). Double-tap TOWARD → shared `teleportBehindTarget` gap-close; free, like Gojo/Sasuke/Rick. Lone-tap safe (no teleport).
5. **Speed** — ground `speed` 84→**90** (roster median, tied Naruto/Sasuke), `dashSpeed` 16→**18**; `physics.flightSpeed` 8→**13** (a real movement velocity, not anim speed). Measured: walk 8.1 px/f, **flight 13 px/f = 1.6× faster** (dash-tier airborne).
6. **Multiple intros** — 3-entry random `introPool: ["intro","intro2","introCrash"]`. Resliced `intro:version_2` → `omni_man_intro2_uniform.png` (8f 115×133); concatenated `intro_part_1_falling` + `intro_part_2:revese` → `omni_man_intro_crash_uniform.png` (4f 112×156, the deferred crash-from-sky, now live). Verified cycling ~evenly over 16 boots.

**Committed:** `fca0e76` on `combo-flow-layer` (hunk-filtered clean, isolated from the pre-existing Batman/Omni-Man voice + Gon adult-form WIP). NOTE: the previous session built + verified these fixes but never committed them (HEAD stayed at the Stage-6 build `051ca8f`), and neither the fixes NOR the base build are pushed (origin/combo-flow-layer=`86baa9b` Batman; GitHub Pages currently 404s) — so any deployed/cached build tested WITHOUT these fixes. That was the "nothing changed" cause, not a per-fix failure.

## Animation-utilization audit (2026-07-27)

Every source `omni_man_*.png` is wired to a distinct action — the "only 2-3 used" report was a stale-build perception, NOT reality. Montage `harness/omniman_anim_montage.mjs` renders **14 distinct sheets** in one pass (20+ counting the chain/grab/jump/descent states):

| Source file | Action slot | Wired? |
|---|---|---|
| idle | idle + walk/run/dash (idle-float) | ✅ |
| ground_punch / ground_punch_1 / ground_up_attack | light / heavy / up | ✅ |
| air_foward_punch / air_down_attack_2 | air / down_air | ✅ |
| ground:air_kick / ground_down_attack / combo_to_launch / push | omCombo1 / omCombo2 / omComboFin / omPush | ✅ |
| grab_attack | grab | ✅ |
| ground:air_hit | hurt | ✅ |
| **air_hit** | **hurt_air (NEW — the one real gap, now wired, Toji precedent)** | ✅ |
| non_flying_jump / non_flying_landing | jump+fall / descentLand | ✅ |
| jump:flying_idle / flying_run:dash | fly / flyMove | ✅ |
| for_when_he_falls_from_flying part1+2 | forcedDescent | ✅ |
| air_to_ground_combo_punch / air_down_attack | omSkewer / omMeteor | ✅ |
| combo_where_he_lands | ultimate | ✅ |
| intro_version_3 / intro:version_2 / intro_part_1+2 | intro / intro2 / introCrash | ✅ |
| ~~run_uniform~~ | (retired by Fix #3 — idle-float replaces the ground lunge) | intentionally unused |

**Regression:** zero real regressions. Shared teleport chars (toji/toji-motion/tobirama/rick/sharingan), charge-release chars (gojo/vegeta-ssj/goku-black-charge/itachi-mangekyou), movement (killua/flash/vegeta/vegeta-ssj-blue), input (ffa/controller-assign/input-wiring), intros (intros/intro-sequence) all green. (Only red = a PRE-EXISTING flaky voice-taunt randomization-coverage sample, unrelated.)

## Notes / risks
- Colon filenames: reference as `./omni_man_...:....png`. Confirmed safe (underscore prefix ⇒ not a URL scheme) but keep the `./`.
- No standalone ground **walk/run** or **guard/block** strip → re-slice from `omni_man_transparent.png` (Stage 1).
- `omni_man_transparent copy.png` = scrap duplicate, unused.
</content>
