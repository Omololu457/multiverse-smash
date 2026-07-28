# ZENITSU AGATSUMA — Asset Map

FIRST **Demon Slayer** sprite character (establishes the universe, mirroring how Power Rangers /
Hunter x Hunter / Invincible were each established by their first sprite char). rosterKey `zenitsu`.
Archetype: extreme burst-speed glass cannon (fast, precise, fragile). Canon height **164.5 cm**
(databook) → target on-screen ~102 px (`0.623 × 164.5`, see HEIGHT_REFERENCE.md).

Source art = 1 master reference sheet (888×2632, twice: `_transparent` + the `by_xxstevegamesxx`
original) + **20 pre-sliced per-action strips** (`zenitsu_*.png`). Uploaded filenames are preserved
exactly. `*_uniform.png` are RE-SLICED (tools/reslice_strip.mjs → uniform feet-aligned cells) COPIES of
the uploaded strips — the originals are kept on disk (untracked → **do not** reslice an original in
place, always copy first).

## Master sheets
- `zenitsu_transparent.png` (888×2632) — labeled body-pose atlas: idle / run / jump / hit+knockdown /
  getup / attack rows + the Tanjiro & Inosuke double-attack partner poses + the ultimate dash. The
  per-action strips below are the clean extractions of these rows.
- `zenitsu_sprite_sheet__demon_slayer__by_xxstevegamesxx_degka16.png` (888×2632) — byte-context
  duplicate (the source atlas the transparent one was cut from). Reference only.

## ⚑ "Asleep mode" finding (Stage 1 Q)
Canon Zenitsu famously fights unconscious ("asleep"). **No sleeping / unconscious pose exists anywhere**
— every frame in both the master sheet and all 20 strips shows him upright and awake (the intro even
has him draw his sword standing). There is a `getup` row (rising from a knockdown), but that is a
standard hurt-recovery pose, not a distinct sleeping combat mode. **Conclusion: no mechanical
asleep-mode signal in the art.** Proceeding without it; not a deferred design decision (nothing to
build from). Flagged here so it is not re-litigated.

## STAGE 1 — movement / state  ✅ WIRED
Resliced copies (bottom-aligned, 1px pad → single `anchorY: 0` plants feet across all standing actions).
spriteScale **2.25** (idle content 45px → ~101px on-screen, roster band).

| Action | Sheet (resliced) | Source strip | frames · cell |
|---|---|---|---|
| idle | `zenitsu_idle_uniform.png` | `zenitsu_idle.png` (7 cells) | **5** · 38×60 (cells 5-6 = a sword-raise flourish, excluded from the loop) |
| walk / run | `zenitsu_run_uniform.png` | `zenitsu_run.png` | 4 · 47×51 |
| dash | `zenitsu_dash_uniform.png` | `zenitsu_dash.png` | 3 · 51×48 |
| jump / fall | `zenitsu_jump_uniform.png` | `zenitsu_jump.png` | 6 · 39×58 (fall = last cell, sourceX 195) |
| guard | `zenitsu_guard_uniform.png` | `zenitsu_charge.png` (no dedicated block art; the low braced stance doubles as block — `maxEnergy 0` so the charge state is unused) | 5 · 41×47 (frame 0 held) |
| hurt | `zenitsu_hit_uniform.png` | `zenitsu_hit.png` (frame 0 recoil) | 1 · 57×52 |
| knockdown | `zenitsu_hit_uniform.png` | full recoil→sprawl→lie sequence | 8 · 57×52 |
| intro | `zenitsu_intro_uniform.png` | `zenitsu_intro_part_1.png` (**dedicated entrance** — sword-draw→ready; unlike Gon/Minato's idle-hold stopgaps) | 12 · 44×61 |

3-file gate done: `characters.js` (animationData + hasSprites + spriteScale + introPool),
`skins.js` (`zenitsu` default skin), `spritesheets.js` (idle-gate manifest). Evidence:
`harness/zenitsu_stage1_shots.mjs` = 10/10, shots in `harness/shots/zenitsu_s1_*`.

## STAGE 2 — normals + command chain  ✅ WIRED
5 neutral normals (genuine basics, NOT named Thunder Breathing forms) + a 3-hit Down+Heavy
"Thunderclap Flurry" rekka (cancel-on-hit, `updateZenitsuCommandCombat` — Batman/Gon architecture).
The ambiguous `super_up_attack` is RESOLVED as the rekka launcher finisher (a normal-tier launcher),
NOT a Stage 3 special. sprite.js needs no entry (identity fallback covers `zenComboN`).
| Slot | Sheet (resliced) | Source | frames · cell |
|---|---|---|---|
| light | `zenitsu_foward_slash_uniform.png` | `zenitsu_foward_slash.png` | 3 · 56×48 — quick forward slash |
| heavy | `zenitsu_foward_hit_uniform.png` | `zenitsu_foward_hit.png` | 3 · 71×53 — committed two-slash (`rangeX 78`) |
| up (launcher) | `zenitsu_up_attack_uniform.png` | `zenitsu_up_attack.png` | 3 · 61×71 — `type: launcher` |
| air | `zenitsu_down_air_2_uniform.png` | `zenitsu_down_air_attack_2.png` | 2 · 67×59 — neutral aerial thrust |
| down_air | `zenitsu_down_air_1_uniform.png` | `zenitsu_down_air_attack_1.png` | 5 · 56×58 — descending slash |
| zenCombo1 (rekka opener) | `zenitsu_down_attack_uniform.png` | `zenitsu_down_attack.png` | 4 · 71×70 — low sweep |
| zenCombo2 (rekka mid) | `zenitsu_dash_attack_uniform.png` | `zenitsu_dash_attack.png` | 5 · 53×57 — dashing lunge |
| zenCombo3 (rekka finisher) | `zenitsu_super_up_uniform.png` | `zenitsu_super_up_attack.png` | 6 · 42×71 — rising super-slash (launches) |

Evidence: `harness/zenitsu_stage2_shots.mjs` 10/10 (5 normals connect w/ correct 0.60 dmg; rekka
sequences zenCombo1→2→3 + deals combo dmg; whiff mid-chain interrupt stops the string; no projectiles).

## STAGE 3 — Thunder Breathing specials  ✅ WIRED
ONE special on the SPECIAL button (Neutral). `executeZenitsuSpecial` → `fireZenitsuThunderclap`.
`super_up_attack` was NOT used here (it became the Stage 2 rekka launcher), so Stage 3 = the single
high-confidence Thunder Breathing FORM.
| Move | Sheet (resliced) | Source | frames · cell | dmg (eff) · gate |
|---|---|---|---|---|
| **First Form: Thunderclap & Flash** (Neutral+Special) | `zenitsu_thunderclap_uniform.png` | `zenitsu_thunder_breathing_1st_from_dash_attack.png` | 8 · 56×48 | 130 raw → **78 eff** · **COOLDOWN 90f (~1.5s)** |

Near-instant lunging dash-strike (6f startup, he travels forward ~75px into the strike), single
decisive hit, blockable (12% chip). **COOLDOWN-gated, NOT energy-gated** — Zenitsu has `maxEnergy 0`,
so the no-energy roster gates its specials on a dedicated timer (`fighter.thunderCd`, ticked in
`game.updateMiscTimers`, mirrors Toji's `chainCooldown`). This is the SAME cooldown mechanism the
Stage-5 Ultimate reuses. Forward/Down on Special are reserved for the Stage-4 Double Attack (they
currently fall through to the Thunderclap so the button is never dead).

Also added a small harness-only `setP2ForceBlock` hook + `fighter._forceGuard` (updatePlayer honors it
so the passive dummy can hold a persistent guard) — needed to prove blockable here and UNBLOCKABLE in S5.

Evidence: `harness/zenitsu_stage3_shots.mjs` 11/11 (fires on Neutral+Special; resolves zenThunderclap
sprite; lunges Δx=75; connects −78; sets+respects cooldown; usable after cooldown clears; blockable
chip −9; no projectile).

## STAGE 4 — Double Attack special (Tanjiro / Inosuke)  ✅ WIRED
Both dedicated partner sprites confirmed present and resliced to summon sheets:
- `zenitsu_tanjiro_partner_uniform.png` (4 · 93×46) ← `zenitsu_tanjiro_double_attack_special.png`
- `zenitsu_inosuke_partner_uniform.png` (3 · 67×68) ← `zenitsu_inoske_double_attack_special.png`

**Input scheme (decided):** a directional modifier on the existing SPECIAL button (`_specialHeldDir`,
the Killua/Gon pattern already used in Stage 3) — **Forward+Special = Tanjiro, Down+Special = Inosuke**,
Neutral+Special = Thunderclap. Chosen over two separate slots because Zenitsu already has exactly ONE
special button and the direction-branch is the established roster idiom (no new input concept, no kit
bloat). ONE special, two outcomes, **shared cooldown** (`doubleAtkCd` 150f, both variants).

**Mechanic:** a scripted PINCER (`fireZenitsuDoubleAttack`). Zenitsu flash-dashes in from his side (his
`zenThunderclap` pose + forward lunge, 70 raw→42 eff); the chosen partner is spawned as a sprite-backed
summon on the opponent's FAR side (`spawnBeat 8` holds it there so the "appears opposite → dashes in"
reads), then it rushes INWARD (rush behavior → toward target), lands one hit (60 direct), and POOFS via
the reused `spawnClonePuff` vanish FX (`puffOnDespawn` → new handling in `updateSummons`). Combined ≈
**102 eff**. NOT two independently-controlled fighters — a pre-animated partner. Templates live in
`summons.js` (`zenitsuTanjiro`/`zenitsuInosuke`). Cooldown-gated, NOT energy (maxEnergy 0).

Evidence: `harness/zenitsu_stage4_shots.mjs` 15/15 — both variants spawn the correct partner sheet on
the far side, rush inward + connect (−102 combined), poof on despawn (clonePuff), and share one cooldown
(firing Tanjiro locks out Inosuke until it clears).

## STAGE 5 — Ultimate: dash-through slice  ✅ WIRED
**Thunderclap & Flash: Godspeed** — `executeZenitsuUltimate` (ult button "u"). Sheet
`zenitsu_ultimate_uniform.png` (6 · 51×48) ← `zenitsu_ultimate_dash_attack_...png`. sprite key
`zenUltimate`. Deliberately unlike every other roster ult:
- **Dash-THROUGH:** crouch-charge (10f) → blink PAST the opponent to the far side (`fighter.x =
  target.x + facing*(w+30)`), i-frames cover the blink. Verified Zenitsu ends beyond the opponent.
- **SAME-LEVEL requirement:** `zenitsuSameLevel` (both grounded, or both airborne within 46px). On a
  mismatch it **WHIFFS** — the hitbox is inerted (`attack.hasHit=true`) but the dash still fires and the
  cooldown is still spent. **Decision: whiff, not refund/block-activation** — simpler (no refund
  bookkeeping) and less exploitable (a refund would let you safely mash until levels line up; whiff makes
  mistiming cost you the window).
- **UNBLOCKABLE:** `attack.unblockable` → NEW guard-bypass in `combat.resolveAttackHit` (the
  `if (defender.isBlocking && !atk.unblockable)` gate). A deliberate per-move exception, verified: lands
  FULL (−180) through a held guard, where the Stage-3 special only chips (−9).
- **HIGH DAMAGE:** 300 raw → **180 EFF** (scaled pipeline — honest side of the audit; Rick-ult tier, below
  Sasuke's ~302 sword).
- **COOLDOWN-gated, NOT energy:** REUSES the existing universal `ultimateCooldown` gate (triggerUltimate
  already blocks on it) but stamped SHORT — **8s (480f)** via `_suppressUltCooldown` instead of the 20s
  default. Spends NO energy (`maxEnergy` floored 0→1 engine-wide; energy unchanged before→after). No new
  gating system built — the reused constant is `ZENITSU_ULT_CD`.

Evidence: `harness/zenitsu_stage5_shots.mjs` 17/17 — same-level connect (−180) + pass-through; mismatch
whiff (−0, flagged, cooldown still spent); unblockable (−180 through guard); cooldown starts ~480f, ticks
down, blocks recast, resets → usable; zero energy cost. Regression: roster/basickit/charge-lockout/susanoo
+ Stage-3 chip all green (the unblockable branch only affects flagged moves).

## STAGE 6 — Portrait + full-kit test + balance  ✅ DONE = BUILD COMPLETE
- **Portrait:** no dedicated mugshot in the batch → `zenitsu_portrait.png` cropped (34×40 bust) from
  idle frame 0 (tools/crop_region.mjs). Wired `characters.zenitsu.portrait` → skins.js/HUD pick it up.
- **Canonical test:** `harness/zenitsu.test.mjs` (`npm run test:zenitsu`) — **53/53**. Covers
  registration+portrait, movement/state, all 5 normals, the rekka + mid-chain interrupt, the Thunderclap
  special (cooldown+blockable), BOTH Double Attack variants (far-side spawn/poof/shared cooldown), the
  Ultimate with EXPLICIT assertions on same-level connect+pass-through / level-mismatch whiff / UNBLOCKABLE
  through guard / cooldown-not-energy, and an 18-action fallback-box sweep + no-JS-error check.
- **Regression:** roster 18, basickit 17, susanoo 24, naruto 21, hawk-summon 15, minato 47, killua 24,
  tobirama 31, beerus 38 — all green (combat.js unblockable branch + summons.js partner templates
  touch shared systems but only affect flagged moves / new ids).
- **Balance:** added a Zenitsu blockquote to BALANCE_AUDIT.md. Verdict: **shape-outlier (Ultimate gating),
  not a power-outlier.** Def 74 = new roster floor (intentional frailty counterweight); the Ultimate's
  unblockable + no-meter + 8s-recast COMBO is the only one of its kind, but 180 EFF is mid-band and the
  same-level requirement (jump-on-read → whiff → punish) is hard counterplay. 8s cooldown = the watch-knob.

## Deferred / not-yet-wired uploaded files (full accounting)
Every uploaded strip is wired EXCEPT:
- `zenitsu_intro_part_2.png` — the 2nd intro strip (a sheathe/settle sequence). The intro uses
  `zenitsu_intro_part_1.png` (12f sword-draw) alone; part_2 could extend/vary the entrance later.
- Master sheets (`zenitsu_transparent.png`, `..._by_xxstevegamesxx_...png`) — reference atlases only.
- `getup` row inside the master sheet — knockdown-recovery art, not wired (game restores idle after knockdown).
Repurposed (not "unused"): `zenitsu_charge.png` → `guard` (Zenitsu has no energy → no charge state).
NO asleep-mode art exists anywhere (see Stage-1 finding) — nothing deferred there.
rosterKey is lowercase `zenitsu` (required — getAction() lowercases the key).

## Deferred BEHAVIOR (not built, would need new art/design)
- Voice lines, a taunt action, and win/lose poses (none in the batch) — same deferral as most roster chars.
