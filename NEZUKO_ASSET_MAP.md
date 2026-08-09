# Nezuko Kamado — Asset Map

FIFTH Demon Slayer sprite character (after Zenitsu, Rengoku, Shinobu, Inosuke).
rosterKey `nezuko`, universe `demon_slayer`. Petite agile demon rushdown, no energy meter
(cooldown-gated — HUD flavor "TOTAL CONCENTRATION").

Source art: 36 cropped `nezuko_*.png` strips + 2 master references
(`nezuko_transparent.png`, `nezuko_kamado_jus_spritesheet_by_michelstgamer_ddso7fn.png`).
Frame grids derived from alpha-gutter column analysis (uniform slice = `sourceX + i*width`).

## Registration gate (files touched)
| File | What |
|---|---|
| `characters.js` | `const nezuko = {...}` entry + added to `export const characters` |
| `spritesheets.js` | `nezuko: { actions: { idle: "./nezuko_idle.png" } }` — spritesReady() gate |
| `skins.js` | `SKINS.nezuko` default entry — **REQUIRED**: without it `getSkins()` returns the `spriteScale:1` fallback and `applySkin()` renders her at ~half size (the Saiki/Shinobu gotcha) |
| `nezuko_portrait.png` | generated (bust crop of idle frame 0, ×4) — no portrait was in the source set |
| `harness/nezuko_stage1.mjs` + `package.json` | `test:nezuko-stage1` |

## Base stats (STAGE 1 — PLACEHOLDER, balance pass deferred per spec)
`HP 1020 · energy 0 (cooldown-gated) · atk 84 · def 80 · spd 95 · jumps 2 · jumpPower 30 ·
dashSpeed 21 / dur 8 / cd 34 · spriteScale 2.0`.
spriteScale 2.0: canon 153cm → target ≈95px (0.623×153). Verified ≈ Shinobu's calibrated
on-screen height in the same harness (Nezuko 476px vs Shinobu 473px idle).

## STAGE 1 — Movement / State (WIRED + verified, test:nezuko-stage1 22/0)
| Action | File | Sheet px | Grid (frames · w×h · sourceX) | Notes |
|---|---|---|---|---|
| idle | `nezuko_idle.png` | 154×53 | 3 · 44×53 · sx6 | breathing loop |
| walk | `nezuko_run_tall.png` | 204×47 | 4 · 50×47 | upright run cycle (held-forward) |
| run | `nezuko_run_tall.png` | 204×47 | 4 · 50×47 (speed 4) | same sheet, faster playback |
| **dash** | `nezuko_run_tiny.png` | 212×51 | 4 · 50×51 · sx9 | hunched scramble burst — **DISTINCT sheet from run** (double-tap) |
| jump | `nezuko_jump.png` | 49×58 | 1 · 49×58 | rise pose (hold last) |
| fall | `nezuko_jump.png` | 49×58 | 1 · 49×58 | descent (same sheet) |
| guard | `nezuko_block.png` | 47×53 | 1 · 47×53 | braced block (down-hold) |
| hurt | `nezuko_hit.png` | 222×68 | 2 · 56×68 · sx0 | flinch recoil (front of sheet) |
| knockdown | `nezuko_hit_2.png` | 265×62 | 5 · 52×62 · sx5 | sprawl→downed→rise (sprite.js knockdown hook) |
| crouch* | `nezuko_crouch.png` | 32×46 | 1 · 32×46 | **DORMANT — see FLAG below** |

## ⚠️ STAGE 1 FLAGS
- **crouch is DORMANT.** The engine has **no crouch-state producer** — `getAnimationState`
  never returns `crouch_idle`/`crouch_move` (they exist only as dead table/alias entries),
  and **down-hold = guard/block**. The `crouch` action is declared + ready (mirroring the
  kasumi/ghostface precedent, both also dormant) so the file is wired, but it will NOT
  display in-game until a crouch state is hooked into the engine (a global change affecting
  all characters). Not silently dropped — flagged for a decision.
- **hit.png vs hit_2.png both contain full knockdown arcs.** Per spec role split, `hit.png`'s
  flinch poses (frames 0–1) drive `hurt`; the fuller tumble/getup arc lives in `hit_2.png`
  → `knockdown`. hit.png frames 2–4 (its own tumble/getup) are not used by the brief hurt
  state — the role is covered by hit_2.
- **spriteScale 2.0 is a trial** matched to Shinobu; re-confirm against measureSprite in a
  later height-audit pass before locking.

## STAGE 2 — B-family (Light) normals (WIRED + verified, test:nezuko-stage2 9/0)
| Input | Move | File | Grid (frames · w×h) | Wiring |
|---|---|---|---|---|
| B (j) | punch (jab flurry) | `nezuko_punch.png` | 4 · 55×60 | `animationData.light` + `basic_attacks.light` (25 dmg) |
| Up+B (i) | rising kick (launcher) | `nezuko_up_attack.png` | 2 · 62×74 | `animationData.up` + `basic_attacks.upAttack` (36 dmg) |
| Jump+B (air j) | aerial kick | `nezuko_air_attack_1.png` | 1 · 47×56 | `animationData.air` + `basic_attacks.airAttack` (30 dmg) |
| Fwd+B (d+j) | **ball kick → projectile** | `nezuko_ball_kick.png` (2 · 53×62) + `nezuko_ball_kick_projectile.png.png` (4 · 14×26) | COMMAND normal `updateNezukoCommandCombat` → `_spriteCastMove` "nezukoBallKick" + `spawnProjectile` (38 dmg, travels) |
| Down+B (s+j) | **dodge (i-frame evade)** | `nezuko_dodge.png` | 3 · 52×61 | COMMAND normal → `invulnTimer` 18 + `_spriteCastMove` "nezukoDodge"; **NO strike hitbox / 0 dmg** |

Wiring surface: `characters.js` (animationData light/up/air/nezukoBallKick/nezukoDodge),
`abilities.js` (`updateNezukoCommandCombat` + `fireNezukoBallKick`/`fireNezukoDodge`),
`game.js` (import + dispatcher call site, gated `rosterKey==="nezuko"`, before normal path).
Neutral/Up/Air Light use the engine's standard slots; only Fwd+B and Down+B are intercepted.
Both command normals set `attackCooldown` so a still-held Light can't double-fire a punch
(startMove gates on it, combat.js:1685).

⚠️ **`nezuko_ball_kick_projectile.png.png`** — the real on-disk filename has a DOUBLE `.png`
extension (differs from the spec's `_png.png`). Referenced verbatim in the projectile sheet path.

## STAGE 3 — Y-family (Heavy) normals (WIRED + verified, test:nezuko-stage3 7/0)
| Input | Move | File | Grid (frames · w×h · sourceX) | Wiring |
|---|---|---|---|---|
| Y (k) | straight heavy punch | `nezuko_foward_punch.png` | 3 · 50×49 · sx2 | `animationData.heavy` + `basic_attacks.heavy` (44 dmg) |
| Jump+Y (air k) | aerial spin kick | `nezuko_air_attack_2.png` | 4 · 55×66 | `animationData.air_heavy` + `basic_attacks.airHeavy` (38 dmg) |
| Jump+Down (air s+j) | downward dive | `nezuko_air_down_attack.png` | 3 · 51×56 | `animationData.down_air` + `basic_attacks.downAir` (40 dmg) |
| Fwd+Y (d+k) | lunging hook | `nezuko_angry_punch.png` | 2 · 51×64 | COMMAND normal `updateNezukoCommandCombat`→`fireNezukoCommand("nezukoAngryPunch")` (real strike, 24 dmg) |
| Down+Y (s+k) | spinning side kick | `nezuko_side_kick.png` | 4 · 53×59 · sx6 | COMMAND normal → `fireNezukoCommand("nezukoSideKick")` (real strike, knockback, 27 dmg) |

Wiring surface: `characters.js` (animationData heavy/air_heavy/down_air/nezukoAngryPunch/nezukoSideKick
+ basic_attacks.airHeavy), `abilities.js` (`NEZUKO_GROUND` table + `fireNezukoCommand`; extended
`updateNezukoCommandCombat` with heavy-edge branch). Neutral Y / Jump+Y / air-down use the engine's
standard heavy/air_heavy/down_air slots; only Fwd+Y and Down+Y are intercepted. All 5 visually distinct
from the B-family (different sheets). air-down (down_air = S+J in air) is distinct from Jump+Y (air_heavy = K in air).

## STAGE 4 — Core extended specials (WIRED + verified, test:nezuko-stage4 12/0)
| Input | Move | File | Grid (frames · w×h · sourceX) | Wiring |
|---|---|---|---|---|
| neutral Special (l) | **Combo Kick rekka** | `nezuko_combo_1.png` | opener 3 · 56×52 · sx0 → finisher 4 · 55×52 · sx168 | `executeNezukoSpecial`→`fireNezukoCombo("nezukoCombo1")`; re-press Special on clean hit → `nezukoCombo2` via `rekkaContinue` (cancel-on-hit). Both stages = SAME sheet, sourceX split |
| Fwd+Special (d+l) | Super Kick | `nezuko_super_kick.png` | 3 · 58×58 | `fireNezukoSuperKick` (forward lunge, 82 dmg) |
| Special airborne (l) | Air Special | `nezuko_specail_air_to_kick_attack.png` | 5 · 55×76 | `fireNezukoAirSpecial` (diving kick, 58 dmg) |
| CHARGE hold-release (p) | Run & Scratch | `nezuko_run_and_scratch.png` | 8 · 55×57 | `fireNezukoRunScratchRelease` via `game.handleChargeRelease` (Rengoku charge-release pattern; forward claw rush, 66 dmg) |

Wiring surface: `characters.js` (animationData nezukoAirSpecial/nezukoSuperKick/nezukoCombo1/nezukoCombo2/
nezukoRunScratch), `abilities.js` (`NEZUKO_COMBO` table + `fireNezukoCombo`; special-edge rekka-continue
added to `updateNezukoCommandCombat`; `fireNezukoAirSpecial`/`fireNezukoSuperKick`/`fireNezukoRunScratch`
+ `executeNezukoSpecial` + `fireNezukoRunScratchRelease` export + `triggerSpecial` case "nezuko"),
`game.js` (import `fireNezukoRunScratchRelease` + `handleChargeRelease` nezuko branch).

**Input map (no collisions, verified):** neutral-Special = Combo rekka · Fwd+Special = Super Kick ·
airborne-Special = Air Special · CHARGE(p) hold-release = Run & Scratch. All on distinct
inputs/buttons. Combo damage-scales (opener + scaled finisher). No energy cost (cooldown/recovery-gated).

## STAGE 5 — Defensive/utility specials (WIRED + verified, test:nezuko-stage5 12/0)
| Input | Move | File | Grid (frames · w×h · sourceX) | Wiring |
|---|---|---|---|---|
| Back+Special (a+l) | **Bite** (command grab) | `nezuko_bite.png` | 4 · 50×73 · sx5 | `fireNezukoBite` → `resolveGrab` (reach 84, unblockable) + `_grabThrowDmg` 96; forward lunge closes in |
| Down+Special (s+l = Block+Special) | **Counter Stance** | `nezuko_counter_attack.png` | 2 · 40×47 · sx9 | `fireNezukoCounter` sets `_nzCountering` (22f) → `combat.shouldNezukoCounter` NEGATES the hit + ripostes (−78, stun/shove attacker) |
| Up+Special (w+l) | **Blood Demon Slumber** (heal) | `nezuko_health_reset.png` | 2 · 56×76 · loop | `fireNezukoSlumber`: not-`attacking` lock (hittable, no i-frames) + per-frame heal (230 over 72f) in `updateMiscTimers`; `_nzSlumberVuln` → combat 1.5× damage taken; a hit INTERRUPTS (forfeits remaining heal) |

Wiring surface: `characters.js` (animationData nezukoBite/nezukoCounter/nezukoSlumber), `abilities.js`
(`fireNezukoBite`/`fireNezukoCounter`/`fireNezukoSlumber` + extended `executeNezukoSpecial` direction map),
`combat.js` (`shouldNezukoCounter` + top-priority counter check in resolveAttackHit + `_nzSlumberVuln` dmg amp),
`game.js` (`updateMiscTimers`: `_nzCountering`/`nzCounterCd`/`nzSlumberCd` ticks + slumber heal/vuln/interrupt;
snapshot exposes `castMove`/`nzCountering`/`nzSlumberTimer`/`nzSlumberVuln`; test helper `p1SpecialDir`).

**Full special-button direction map (Stages 4-5, no collisions):** neutral = Combo rekka · Fwd = Super Kick ·
Back = Bite · Down = Counter Stance · Up = Blood Demon Slumber · airborne = Air Special · CHARGE(p) = Run & Scratch.

⚠️ **Counter Stance priority:** the counter check runs at the TOP of hit-resolution (before block/invuln) so the
Down-hold that arms it (Block+Special) can't first route the incoming hit through the block/parry path.

⚠️ **STAGE 5 STOP conditions (both verified live):** counter ACTUALLY reverses (p2 1020→942 riposte, p1 0 dmg
taken — not just an animation); slumber HP recovery (+230) AND vulnerability window (1.5× → 54 vs 36 baseline,
hittable) are both live.

## STAGE 6 — Ally Call assists + Taunt (WIRED + verified, test:nezuko-stage6 9/0)
The GRAB button (O) is repurposed as Nezuko's "Kamado family" input (her grab-like move is Bite on Back+Special).
| Input | Move | File | Wiring |
|---|---|---|---|
| Fwd+Grab (d+o) | **Tanjiro Assist** (Water Breathing slash cameo) | `nezuko_tanjiro_assist.png` (4f · 81×58) | `fireNezukoAllyCall("tanjiro")` → `spawnAssistSummon` (rush→one-hit→despawn, Inosuke Beast-Assist path) |
| Back+Grab (a+o) | **Zenitsu Assist** (Thunderclap cameo) | `nezuko_zenistu_assit.png` (4f · 63×49) | `fireNezukoAllyCall("zenitsu")` |
| neutral Grab (o) | **Nut Kick** (taunt/hit) | `nezuko_nut_kick.png` (3f · 46×69 · sx3) | `fireNezukoNutKick` — real `createAttackFromMove` with a bounded startup(5)/active(3)/recovery(18) window; 22 dmg |

Wiring surface: `characters.js` (animationData nezukoNutKick — assists render as SUMMONS, no fighter animationData),
`abilities.js` (`NEZUKO_ASSIST` config + `fireNezukoAllyCall`/`fireNezukoNutKick`; grab-edge branch in
`updateNezukoCommandCombat` → Fwd/Back/neutral), `game.js` (`nzAssistCd` tick; snapshot `nzLastSibling`;
test helper `p1ClearCooldowns`). Assists reuse Nezuko's OWN Tanjiro/Zenitsu art (they aren't playable chars).

⚠️ **STAGE 6 STOP conditions (both verified live):** the direction-hold selects the right sibling (Fwd→Tanjiro
110 dmg, Back→Zenitsu 62 dmg); Nut Kick's hitbox is windowed (startup→active→recovery) — connects in range
during ACTIVE, whiffs out of range but still commits to recovery (punishable, not a free taunt).
NOTE: the universal 10s down-hold "taunt flourish" (which heals 50% HP) is intentionally NOT wired for Nezuko
(it would overshadow Blood Demon Slumber); nut_kick is a real move on neutral-Grab instead.

## STAGE 7 — Ultimates (WIRED + verified, test:nezuko-stage7 12/0)
Ultimate button is TAP/HOLD split (Madara pattern — `handleUltimateRelease`, release-driven). No energy
(cooldown-gated via triggerUltimate's universal 20s lockout). Both independently selectable — neither forces the other.
| Input | Ultimate | Files | Wiring |
|---|---|---|---|
| **TAP** Ultimate (u) | **Kekijutsu Baketsu** (two-phase) | `nezuko_ultimate_punches.png` (6f · 54×54) → `nezuko_ultimate_up_attack.png` (2f · 52×55) | `executeNezukoKekijutsu` fires phase 1 barrage (`nezukoUlt1a`), `updateNezukoUltChain` (per-frame) auto-chains phase 2 finisher (`nezukoUlt1b`, launcher) |
| **HOLD** Ultimate (≥250ms) | **Demon Transformation** (mode-change) | `nezuko_transformation.png` (10f · 54×55) → `nezuko_transformation_idle.png` (2f · 47×75 loop) | `enterNezukoDemon`: ×1.4 dmg / ×1.25 speed buff + full `_skinAnim` clone with idle→transformationIdle, for 420f; `revertNezukoDemon` on timer expiry (updateMiscTimers) restores mults + `_skinAnim` |

Wiring surface: `characters.js` (animationData nezukoUlt1a/nezukoUlt1b/nezukoTransform/nezukoTransformIdle),
`abilities.js` (Kekijutsu phases + `updateNezukoUltChain`; `enterNezukoDemon`/`revertNezukoDemon`;
`executeNezukoUltimate(fighter,ctx,hold)` + `triggerUltimate` case "nezuko"), `game.js`
(`handleUltimateRelease`/press-path now release-driven for nezuko too; `updateMiscTimers` ult-chain driver +
demon-timer auto-revert; imports; snapshot `nzDemonActive`/`nzDemonTimer`/`dmgMult`/`ultCooldown`;
`p1ClearCooldowns` also clears ultimateCooldown).

⚠️ **STAGE 7 STOP conditions (verified live):** both ults are independently selectable (TAP=Kekijutsu doesn't
transform; HOLD=Transformation doesn't fire the barrage — not sequence-locked); the transformation timer
expires CLEANLY back to base (nzDemonActive→false, dmgMult 1.4→1, idle → nezuko_idle).

## STAGE 8 — Intro / Win / Lose (WIRED + verified, test:nezuko-stage8 13/0)
| Slot | File | Grid | Wiring |
|---|---|---|---|
| Intro (main) | `nezuko_intro.png` | 10f · 56×70 | `animationData.intro` — box → emerge; in `introPool` |
| Intro (alt/short) | `nezuko_intro_2.png` | 3f · 49×63 | `animationData.intro2` — in `introPool` (random-cycle) |
| **Win** | `nezuko_intro_3.png` (frames 0-1) | 2f · 56×44 · **sourceX 10** | `animationData.win` — alert-in-box |
| **Lose** | `nezuko_intro_3.png` (frame 2) | 1f · 56×44 · **sourceX 122** | `animationData.lose` — asleep (Zzz) |

`introPool: ["intro", "intro2"]`. WIN and LOSE are SPLIT from the ONE `nezuko_intro_3` sheet via distinct
sourceX/frame-count — NOT the whole file for both. Displayed by a match-victory hook in `game._checkMatchOver`:
winner→`_forceAction="win"`, loser→`_forceAction="lose"`, gated on the fighter defining win/lose animationData
(roster-safe; fighters are recreated on rematch so the override never leaks). `game.js` snapshot exposes
`spriteSourceX`/`forceAction`; test helper `forceMatchWin`.

⚠️ **STAGE 8 STOP condition (verified live):** `intro_3` is actually SPLIT into two usable clips —
win = frames 0-1 (sx 10, 2f), lose = frame 2 (sx 122, 1f), same sheet but distinct ranges (screenshot-confirmed:
win = alert-in-box, lose = asleep-with-Zzz). The victory hook renders the correct clip per outcome.

## STAGE 9 — Full-kit playtest + accounting (BUILD COMPLETE)
Full suite `test:nezuko` (stages 1-8) = **96 passed, 0 failed**. Regression sweep green: Madara 44/0
(tap/hold ult sibling), Rengoku 41/0 (charge-release + counter sibling), Inosuke 39/0 (assist sibling),
Shinobu 35/0, basickit 17/0, up-attack 35/0, cancel-window 17/0.

**Source-file accounting — every file used, none dropped (37 gameplay + 2 masters):**
36 spec sprites + generated `nezuko_portrait.png` = 37, ALL referenced in characters.js/abilities.js (verified
by filename cross-check). The 2 masters (`nezuko_transparent.png`, `..._by_michelstgamer_ddso7fn.png`) are
cross-check-only, never wired — as specified. `nezuko_health_reset.png` appears in the spec under both
MOVEMENT/STATES and SPECIALS; it is one file with one role (Blood Demon Slumber). Projectile file's real
on-disk name has a DOUBLE `.png` (`nezuko_ball_kick_projectile.png.png`) — referenced verbatim.

**Full input map:**
`B`=punch · `Fwd+B`=ball-kick(proj) · `Up+B`=up-kick · `Down+B`=dodge(i-frames) · `Jump+B`=air kick ·
`Y`=heavy punch · `Fwd+Y`=angry punch · `Down+Y`=side kick · `Jump+Y`=air spin · `Jump+Down`=air dive ·
`Special`=Combo rekka · `Fwd+Special`=Super Kick · `Back+Special`=Bite(grab) · `Down+Special`=Counter ·
`Up+Special`=Blood Demon Slumber · `air Special`=Air kick · `Charge(hold)`=Run & Scratch ·
`Grab`=Nut Kick · `Fwd+Grab`=Tanjiro · `Back+Grab`=Zenitsu · `Ult TAP`=Kekijutsu Baketsu · `Ult HOLD`=Demon Transformation.

## ⚠️ BALANCE (deferred, per spec BALANCE NOTE)
All damage/cooldown numbers are PLACEHOLDERS not yet locked. Nezuko is a **versatility outlier** (large kit:
two full normal families + 6 specials + direction-gated Ally Call + a taunt-hit + two ultimates) — comparable
in breadth to Madara/Ichigo (scope exception). She has NO energy meter (cooldown-gated, "TOTAL CONCENTRATION"
HUD, like her Demon Slayer siblings). A dedicated balance pass against this roster's damage-scale + resource
conventions is still owed before locking numbers.

## Engine gaps flagged (not Nezuko-specific)
- **crouch** (`nezuko_crouch.png`) is DORMANT — the engine produces no crouch state (down-hold = guard).
  The action is declared + ready (kasumi/ghostface precedent); it displays only if a crouch state is ever hooked.
- The universal down-hold "taunt flourish" (50% heal) is intentionally NOT enrolled for Nezuko (would
  overshadow Blood Demon Slumber); nut_kick is a real move on neutral-Grab instead.

## Full source-file accounting (36 gameplay files)
STAGE 1 wired (11): idle, crouch*, run_tall, run_tiny, jump, block, hit, hit_2 — plus
portrait derived from idle. Remaining 25 files reserved for Stages 2–8 above; none dropped.
