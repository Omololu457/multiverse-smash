# Adding an Omnitrix alien

Readiness, mechanics and art are separate concerns. A registry label alone does
not make a form playable or finished. Do not add a new roster character for an alien.

## Extension points

- Add declarative identity, modifiers, moves, readiness, sheet and ledger metadata
  in `aliens.js` (Swampfire's definition lives in the leaf `swampfire.js`).
- Add or reuse a mechanical pool entry in `fighters.js` and route its actual
  special/ultimate functions in `abilities.js`. Do not pre-scale raw move damage
  and then also apply the same form modifier in the damage pipeline.
- Add real animation definitions and verified sprite files. `benAlienHasArt` is
  actual runtime art availability, not the old misleading whitelist name.
- Supply a labeled contact sheet, geometry and source-frame ledger with every
  frame used, reused, or excluded for a stated reason.
- Extend generic optional hooks only when needed. Swampfire's exact-frame profile,
  explicit rectangle/radial projectile colliders and bounded connecting hold are
  opt-in; they do not retime unrelated authored moves.

## Exposure contract

`isAlienAvailable(key, experimental)` is the common capability rule. Normal play
requires status ready plus actual sheet/ledger references. Experimental access is
explicit, separate from roster developer unlocks, and labels placeholder forms.
Currently Swampfire and Heatblast are approved; 12 former picker forms remain experimental.
The other mechanical pool records remain retained and unexposed.

`createOmnitrixState` prunes invalid or disallowed old selections and falls back to
an approved form. `applyAlien` and framework transform/swap entry points validate
availability again. Never offer a slot merely because a pool key exists. The
legacy BEN10_ART_ALIENS export is a compatibility catalog, not proof of real art.
`buildLoadout` / `getAlienBySlot` default to approved definitions, with explicit
experimental options; empty metadata slots are not selectable production forms.

Normal default loadout is Swampfire (slot 1) + Heatblast (slot 2). Ben-only development mode can be opened with
`?benExperimental=1`; harness matches have an explicit experimental override and
retain the legacy five-form development default. A match carries its policy and
loadouts in replay/host setup, so local preferences cannot change peer eligibility.
Prime is a pending-art experiment and is filtered from normal skin selection.

## Generic ready-form hooks (added with Heatblast, 2026-11-17)

All optional and backward-compatible: an entry that defines none of them (Swampfire) behaves
exactly as before; every site is ben10/albedo-gated through `benReadyForm(f)` (ben10State.js),
which returns the active alien's registry entry only when it is `status: "ready"`.

- **Stats** (`fighters.applyAlien`): any ready entry gets human-variant stats × `mods`
  (speed / damage / defense / weight). Optional `maxJumps` (default 1; Heatblast 2 = the shared
  double jump) and `onApply(fighter)`. Swampfire's Regrowth start stays keyed to Swampfire.
- **Art**: a ready entry with an `anim` table has art (`benAlienHasArt`), used as `_skinAnim`.
- **State**: `fighter.omnitrix.formState` is the per-form GAME_STATE slot; `clearBenFormState`
  nulls it (and any `_benGlide`) on swap / revert / KO.
- **Dispatch** (`abilities.js`): `fireSpecial(f, ctx, api)` / `fireUltimate(f, ctx, api)` run before
  the per-alien chain; `tick(f, input, ctx, api)` runs once per frame from game.js after the device
  update. `api` = spendEnergy, scheduleBenSpawn, spawnProjectile (copies `fire` / `hb*` tags onto
  the projectile), applyScaledDamage, getComboScale, getOpponent, activeProjectiles, shake,
  focusCamera — so the alien module stays a leaf (no engine imports, no cycles).
- **Combat** (`combat.js`): `absorb(defender, { proj | move, attacker })` before a melee or projectile
  hit resolves (true = negated); `onContact(owner, target, { proj | move, blocked, dealDamage,
  comboScale })` after a contact the form owns lands. Ready-form defense / knockback weight and
  the crouch+attack Low use the entry's mods instead of a Swampfire check.
- **Physics**: `_benLunge` and `_benPowerCommit` now apply to any ready form; new `_benGlide =
  { vx, vy, minY }` integrates position (stage / floor clamped) and skips gravity while set.
- **Input**: `blockHeavy(f)` lets a ready form own Block + Heavy (Heatblast: Heat Absorb) in place
  of Ben's Energy Guard.
- **HUD**: `heatblast.js` exports render-only `drawHeatblastHud` (ui.js, under the Omnitrix bar) and
  `drawHeatblastFx` (game.js fighter overlays); both read state only.

## Optional per-alien hooks (added with Megawhatt, 2026-11-17)

All optional, backward-compatible and ben10-gated: they resolve through `benReadyForm(f)`, which is `null` for every
non-Ben fighter and for forms that do not define the hook, so every existing character/form takes the old path.

| Hook (on the registry entry) | Engine call site | Contract |
|---|---|---|
| `flightProfile: "<key>"` + `FLIGHT_PROFILES.<key>` | flight.js `getFlightProfile` now also reads `fighter._alienFlightProfile` (set in `onApply`) | reuse flight.js per alien; `clearBenFormState` deletes `_alienFlightProfile` and nulls `_flightCtl`. Existing flyers' profiles are untouched. |
| `incomingScale(f)` | combat.js `applyScaledDamage`, after the form `mods.defense` divide | multiplier on damage taken (Megawhatt Ground Draw ×1.15) |
| `hurtbox(f)` | combat.js hurtbox getter, before the rosterKey overrides | return a box to override, `null` = ordinary box (Megawhatt Live Wire low profile) |
| `phasing(f)` | physics.js body collision (`benAlienPhasing(p1, p2)`) | `true` = no body push this frame (cross-ups) |
| `drawHud(ctx, f, {x, enY, enH, pbw, flip})` | ui.js, under the Omnitrix Power bar | render-only gauge |
| `drawFx(c, f, frame, opp)` | game.js fighter overlays | render-only; reads state only |
| `drawUnder(c, f)` | game.js world-space layer under both fighters | render-only (Megawhatt Blackout dim) |
| projectile `alien: {...}` tag | abilities.js `benAlienApi.spawnProjectile` copies `alien` onto the projectile | plain-data tag read back in `onContact` (cast ids, pip ownership) |

### Goop hooks (added with Goop, 2026-11-17)

Same contract: optional, backward-compatible, ben10-gated through `benReadyForm`; a form that defines none of them
(Swampfire / Heatblast / Megawhatt) takes exactly the old path, and non-Ben fighters never reach them.

| Hook (on the registry entry) | Engine call site | Contract |
|---|---|---|
| `weakpoint(f)` + `onWeakpoint(f, hit, info)` | combat.js melee (`resolveAttackHit`) + projectile overlap tests, via `benAlienWeakHit` | a second small hurtbox (Goop's anti-gravity projector) tested alongside the body; `onWeakpoint` is told every test result so the form can attribute the hit (weak point wins when both overlap — one hit, counted once) |
| `evade(f, { move, attacker } \| { proj })` | same two overlap tests, via `benAlienEvades` | `true` = this melee move / projectile misses the BODY (Goop Puddle Form low profile: everything but a grounded `hitLevel: "low"` move); the weak point is still tested |
| `damageTaken(f, raw, opts)` | combat.js `applyScaledDamage` (`benAlienDamageMods`), after the attacker's form multiplier | damage this form takes, with full `opts` (source / attacker / move) — unlike `incomingScale` it also sees melee, whose defense is pre-applied (Goop goo body −25% physical melee normals, projector +15%) |
| `damageDealt(f, target, raw, opts)` | same site, for damage attributed to the form (`opts.attacker` / `opts.boostFrom`) | status on the opponent owned by the form (Goop Corrode +15%, chip +25%) |

### XLR8 hooks (added with XLR8, 2026-11-17)

Same contract: optional, backward-compatible, ben10-gated through `benReadyForm` (or a projectile field nothing else
sets); a form that defines none of them takes exactly the old path, and non-Ben fighters never reach them.

| Hook (on the registry entry) | Engine call site | Contract |
|---|---|---|
| `moveFrames(f, key, moveData)` | combat.js `startMove`, before the timing is computed | return a (copied) move table to use — XLR8 Flash Time ×0.7 startup / recovery, min 1f — or `false` to refuse the normal (XLR8 Blur Step recovery). Return `moveData` unchanged otherwise. |
| `blockSpecial(f, ctx)` | game.js Omnitrix input handler, next to `blockHeavy` | Block + Special edge, not while power-committed; `true` = handled. The press can still be buffered (10f): swallow it in the form (XLR8 refuses `fireSpecial` until Special has been released for one buffer window). |
| projectile `timeScale` + `timeScaleT` lease | combat.js `updateProjectiles` | while `timeScaleT > 0` the step is `vx/vy × timeScale` and the lease counts down; the owning form refreshes it every frame (XLR8 Flash Time slows the opponent's projectiles ×0.5), so it lapses within 2 frames once the effect stops (swap / KO safe). Absent = unchanged. |

| `drawBehind(c, f, frame)` | game.js body draw, next to `drawSpeedLines` | render-only layer BEHIND the body (XLR8: full-sprite afterimages replayed from the sprite handler's last draw + his blur-bar streak + speed lines). |
| `formState.speedTier = true` | game.js `isSpeedTierTeleport` | the form gets the shared speed-tier double-tap-toward blink (Killua's). Lives in formState, so swap / revert / KO clear it. |
| `formState.mobility = "very_high"` | physics.js air-dash cap | two air-dashes (Killua's). Same lifetime as above. |

Teleports need no hook: the ability context carries `stageLeft` / `stageWidth` (clamp in the form) plus `seed` / `frame`
for hash(match seed, frame, player index) placement (XLR8 Blur Step / Time Sprint).

Keep `formState` plain data: store ids (e.g. a cast id) and look live projectiles up each frame — never store object
references (they make GAME_STATE circular / non-serializable).

### Eyeguy hook (added with Eyeguy, 2026-11-17)

| Hook (on the registry entry) | Engine call site | Contract |
|---|---|---|
| `guardBreak(owner, target, { proj })` | combat.js projectile loop, before the block branch, via `benAlienGuardBreak` (only when `isBenDevice(proj.owner)`) | `true` = this projectile the form owns ignores the target's held guard for this hit (full damage + hitstun); the projectile is stamped `_benGuardBreak` so the form consumes its own state in `onContact`. Eyeguy: Unblinking's one guard-breaking beam / orb |

### Hooks added for Ghostfreak (2026-11-17)

All optional, backward-compatible and ben10-gated (`benReadyForm` is null for everyone else; a form that does not define
the hook / flag changes nothing).

| Hook / flag | Engine call site | Contract |
|---|---|---|
| `blockLight(f, ctx)` | game.js Omnitrix input handler, next to `blockSpecial` | Block + Light edge (no shared meaning before); `true` = handled, the Light press is consumed (`_omxConsume.light`, 3f input lock) so it never also jabs. Ghostfreak: PHASE toggle. |
| `bodyAlpha(f)` | game.js body draw, multiplied into the Shadow-Sink / S.P.D. Red / Dash alpha | render-only body alpha in [0, 1]; never write state. Ghostfreak: 0.4 Intangible, 0 while inside a possessed target. |
| `formState.noBlock` | game.js guard condition (`isBlocking`), next to the `_noBlock` match modifier | truthy = the guard input is ignored this frame. Ghostfreak: while phased. |
| `formState.noAttack` | combat.js `controls.grab` branch | truthy = the normal throw is not attempted. (Normals are refused through `moveFrames` → `false`; specials / ult through the form's own `fireSpecial` / `fireUltimate`.) Ghostfreak: phased / materializing. |
| `_benTerrorT` (lease on the VICTIM) | physics.js `moveFighter` (dash flag, walk multiplier, `canJump`) | > 0 = no dash / run / jump / double jump, walk ×0.6; physics decrements it each victim frame, so the owner must refresh it (to 2) every frame it should hold — swap / KO / revert make it lapse on its own within 2 frames. Ghostfreak: TERROR. Undefined for everyone else. |

360° Vision needed no hook: the form tick sets `facing` (the engine ties facing to walk input and has no auto-face),
and the shared guard is omnidirectional.

### Alien X hooks (added with Alien X, 2026-11-17)

Same contract: optional, backward-compatible, ben10-gated (through `benReadyForm` / `_readyDef`, or a fighter field
nothing else sets); a form that defines none of them takes exactly the old path, and non-Ben fighters never reach them.

| Hook | Engine call site | Contract |
|---|---|---|
| `drainMult` (number, on the registry entry) | fighters.js `updateTransformDevice`, the transformed drain (before the Vow ×1.6) | multiplies this form's Omnitrix Power drain (Alien X ×1.5 ≈ 13 s from full). Absent = ×1. |
| `negateSpecial(owner, target, commit)` | abilities.js `triggerSpecial` (after the readiness checks), via `benAlienNegatesSpecial` asked for the OPPONENT of the fighter pressing Special | `true` = negate that special (`commit=false` only asks; `commit=true` consumes the owner's state). The engine then plays a negated startup: the special the press would pick (fallback direction rule), its DECLARED specials-table Power cost spent (a kit with no table, e.g. Goku, spends 0), an attack state with its startup + recovery and no active frame (no hitbox, no projectile), posed with the special's own strip if shipped, else `special` / `heavy`. If that cost cannot be paid the press proceeds as an ordinary special attempt. Input polling and the simulation clock are untouched. Alien X UNMADE. |
| `target._benPinT` (frames, set by a form on its OPPONENT) | physics.js `moveFighter` (decrements once per frame, before anything else) + the walk multiplier + `canJump` | while > 0 the pinned fighter walks at ×0.5 and cannot jump; self-clearing, so it never outlives the pin even if the setter swaps out. Absent / 0 = unchanged for every fighter. Alien X Gravity (30f on the grounded 2nd hit). |
| `flightProfile: "alienx"` | flight.js `FLIGHT_PROFILES.alienx` (data only) via the existing `_alienFlightProfile` hook | reused per-alien flight hook (Megawhatt's); no flight-logic change. |

## Slot count — PICK FIVE (2026-11-17)

The Omnitrix holds **five** aliens. The player PICKS five on the alien-select screen out of every READY form
(Swampfire, Heatblast, Megawhatt, Goop, XLR8, Eyeguy, Ghostfreak, Alien X, Brainstorm, Terraspin, Wildvine, Jetray, …); adding a ready alien adds a CHOICE, never a dial slot.
Brainstorm (2026-11-17) was briefed as a new slot 9 (↓↓ + Block+Light+Special chord); under PICK FIVE it is a pick instead (registry `slot: 9` is catalog metadata only), so no slot count, chord, HUD or Vow change was made.
Terraspin (2026-11-17) was briefed as a new slot 10 (↓↓ + Block+Heavy+Special chord); under PICK FIVE it is a pick as well (registry `slot: 10` is catalog metadata only) — no slot count, chord, HUD or Vow change.
Wildvine (2026-11-17) was briefed as a new slot 11 (↓↓ + Block+Light+Heavy chord); under PICK FIVE it is a pick as well (registry `slot: 11` is catalog metadata only) — no slot count, chord, HUD or Vow change.
Jetray (2026-11-17) was briefed as a new slot 12 (↓↓ + Block+Light+Heavy+Special chord); under PICK FIVE it is a pick as well (registry `slot: 12` is catalog metadata only) — no slot count, chord, HUD or Vow change.
(Eyeguy briefly raised the count 5 → 6 with a ↓↓ + Ultimate slot and Ghostfreak 6 → 7 with ↓↓ + Up-Attack; the owner
reverted both to pick-five. Their dial branches stay in game.js, gated on `BEN10_SLOT_COMBOS.length`, so they are dormant.)

The number of Omnitrix dial slots has ONE source of truth: `BEN10_SLOT_COUNT` (= 5) in `aliens.js`.
- `fighters.js` `MAX_OMNITRIX_SLOTS` reads it (loadout cap, default-loadout cap); `buildLoadout()` defaults to it; the
  Binding Vow pick is `hash(seed, frame, player) mod loadout length`, so it follows automatically; the alien-select
  pick cap and the HUD read `BEN10_SLOT_COMBOS.length`. `DEFAULT_OMNITRIX` (no pick made) = Swampfire, Heatblast,
  Megawhatt, Goop, XLR8.
- `game.js` `BEN10_SLOT_COMBOS` must hold one input per slot (a mismatch logs a warning; extra slots are unreachable,
  never a crash). Every slot is ↓↓ then ONE button (no chords): J / K / L / O (Grab) / P (Charge); ↓↓ + ; (Block) reverts.
  U is always the ultimate. The in-match controls box names the player's own five picks.
- The dial is POSITIONAL: slot N = the N-th alien of the live loadout (ready forms, in pick / `DEFAULT_OMNITRIX` order).
  A registry `slot` is documentation of intent, never identity.

A new ready alien therefore needs NO slot / input change: register it, and it appears on the alien-select screen.
Tests must read `BEN10_SLOT_COUNT` (never a literal count) and pick the alien into a loadout to reach it.
Placeholder behaviour needs no change: `buildLoadout()` fills every empty slot with `makePlaceholder(slot)`.

## Required lifecycle contract

- Store authoritative gameplay state as ordinary serializable fighter/device data.
- Use simulation frames and the established match-seed/frame/player hash for RNG.
- Keep frame ledgers, sprite drawing, sounds and particles outside collision state.
- Preserve the selected human's HP pool and complete stat/art snapshot on reversion.
- Clear form-local state on switching/reversion and all device transients on round,
  rematch or general training reset. Identity replacement clears old Ben-owned state.
- Tag delayed Ben actions with an owner/form/action generation. Invalidated work
  cannot execute; already emitted detached projectiles keep their authored lifetime.
- KO clears executable transient state and recovery, retaining art only for the
  defeat pose until a full human/device reset. Never regenerate at zero HP.
- Distinguish once-per-round passives from once-per-match rules. Full healing does
  not counterfeit a new round for Last Resort.

## Verification before approval

Test actual move dispatch, Power spending, spawn-to-hit collision, effective damage,
block/interrupt/launch behavior, human restore, resets, art in both directions and
supported replay/network modes. Test stale saved loadouts and direct entry points.
Do not replace failed assertions with broad tolerances or mark placeholders ready.
Review Swampfire's README and ledger as an implemented example.

Alien X reuses the existing ready-form hooks for everything else: `tick`, `fireSpecial` / `fireUltimate`, `onContact` (Void pips, pin, ult capture), `moveFrames` (Block + Light swallows the jab), `damageTaken` (Serena chip ×0.6), `drawHud` / `drawFx` / `drawUnder` (render-only voice + Void HUD, pixel rings, ult starfield) and `_benGlide` (Starfall Dash). Position history for Rewind is a bounded 60-entry ring buffer inside `formState` (no engine hook). Void Grasp is a form-owned command grab using `combat.resolveGrab`'s throw-escape rule (no engine hook).

### Brainstorm hooks (added with Brainstorm, 2026-11-17)

Same contract: optional, backward-compatible, ben10-gated (through `benReadyForm`, or a fighter field nothing else sets);
a form that defines none of them takes exactly the old path, and non-Ben fighters never reach them.

| Hook | Engine call site | Contract |
|---|---|---|
| `struck(f, info)` (per-category "last attack seen") | combat.js melee contact (next to `benAlienContact`), projectile contact (next to `benAlienContact`) and `resolveGrab` connect, via `benAlienStruck(defender, info)` | told every attack that LANDED on this form or was BLOCKED by it: `info = { kind: "melee" \| "projectile" \| "grab", move \| proj, attacker, blocked, air }` (`air` = the melee attacker was airborne). Observation only — no return value, changes nothing. Brainstorm PATTERN READ logs HIGH / LOW / PROJECTILE / GRAB / AIR. Command grabs that bypass `resolveGrab` are not reported. |
| `bodyOffset(f)` / `targetOffset(owner, target)` (render-only) | game.js body draw, via `benAlienBodyOffset(f, opp)` (summed into the same canvas translate as the Ghostface staging dx; untinted path) | `{ dx, dy }` world px or null: `bodyOffset` moves the form's own body (Brainstorm normals' lunge / launcher lift — no unique attack art), `targetOffset` moves the OPPONENT's body while the form owns it (Brainstorm ult: the held opponent floats). Draw only — never collision, hitboxes or GAME_STATE. |
| `specialTax(owner, target)` (a status that adds startup + cost to the opponent's specials) | abilities.js `triggerSpecial` (right after the Alien X negate check), via `benAlienSpecialTax` asked for the OPPONENT of the fighter pressing Special; released by the owner's form tick through `api.fireTaxedSpecial(target)` | return `{ startup, costMult }` to tax that press, else null. The press is held: `target._benTaxedSpecial = { t, dir, costMult }` and `attackCooldown = startup` (the fighter can do nothing else); when the owner's tick counts `t` down to 0 the special fires through `triggerSpecial` (`_benTaxPass` skips the tax) and `costMult − 1` of whatever energy / Power it spent is charged on top (clamped to what is left). The target's authored frame data, input polling and the simulation clock are untouched. If the owner leaves before releasing it (swap / revert / KO) the held special is dropped after its stall (a stale record is cleared on the next press). Brainstorm SHORT-CIRCUIT: +6f, ×1.5. Specials that bypass `triggerSpecial` are not taxed (the same coverage as `negateSpecial`). |

The DOME reuses existing hooks only: `blockLight` (the toggle; Ghostfreak's), `moveFrames` (no normals while it moves),
`formState.noAttack` (no throw while it moves), `damageDealt` (lightning ×1.25 while exposed), `incomingScale` (projectile /
ability damage at ×0.80 defense while exposed — the registry `mods.defense` holds the closed ×1.10; melee reads
`defenseMultiplier`) and the Megawhatt `_skinAnim` frame-set swap (closed / dome-up tables). MIND SHIELD reuses `blockHeavy`
(Heatblast's) + `absorb` (catch) and spawns the throw-back through `api.spawnProjectile` (ownership transferred). The moves
reuse `fireSpecial` / `fireUltimate` / `onContact` / `_benGlide` (Calculated Strike travel) / `drawHud` / `drawFx` /
`drawUnder` (the ult's stage dim).

### Terraspin hook (added with Terraspin, 2026-11-17)

| Hook | Engine call site | Contract |
|---|---|---|
| `_benDrag` movement status (a status that scales the opponent's movement AWAY from the form's owner) | physics.js `moveFighter`, the "Apply X movement" line (`fighter.x += fighter.vx`) | a ready form's tick stamps its OPPONENT with `_benDrag = { x, ground, air, ttl, pvx }` every frame the status lasts (`x` = the owner's centre; `ttl: 2`, so it lapses on its own within 2 frames of the owner no longer re-stamping it — swap / revert / KO need no cleanup). While `ttl > 0`: horizontal displacement AWAY from `x` is `vx × ground` (walk / run / dash / backward-jump momentum); airborne, a change of `vx` that pushes further away keeps only `× air` of that change (air control). Toward the owner: unchanged. The fighter's `vx` on the ground, its input polling and the simulation clock are untouched. Plain data (GAME_STATE). Absent for everyone else → byte-identical. Terraspin GALE DRAG: ground ×0.7, air ×0.5. Movement that bypasses `vx` (teleports, scripted dashes that write `x`) is not dragged. |

Everything else Terraspin needs reuses existing hooks: `fireSpecial` / `fireUltimate` / `onContact` (Shear pips, Pressure +5,
Exhale push + knockdown via the existing `knockdownState` / `knockdownTimer` / `invulnTimer` trio, ult capture), the tick's raw
input (`input.special` held = INHALE hold-to-charge, `input.block` = block-cancel), `_benPowerCommit` (committed Inhale /
recovery without `attackCooldown`, so a second P press still reaches `fireSpecial` for Exhale), `moveFrames` + `formState.noAttack`
(no normals / throw while busy), `_benGlide` (Wind Chop / Shell Spin travel, Cyclone Drop dive), `api.activeProjectiles()`
(Inhale catch, Wind Chop / Heavy cut — deleted, ownership-aware, beams skipped), `absorb` (Thorn Shell deflect: the projectile
is replaced by a copy moving away at 70% — ownership unchanged), `struck` (Thorn Shell 12 chip to a melee attacker, once per
attacker per spin, cannot KO; Shell Guard marks the melee hit), `damageTaken` (Shell Guard: that hit at 40%), `blockHeavy`
(Shell Guard), `bodyOffset` / `targetOffset` (normals' lunge, ult spin-in + held lift), `drawHud` (Pressure gauge) / `drawFx` /
`drawUnder` (ult stage dim).

### Wildvine hooks (added with Wildvine, 2026-11-17)

Same contract: optional, backward-compatible, ben10-gated (a fighter field / projectile tag nothing else sets, or a registry
field only a ready form defines); a form that does not use them takes exactly the old path.

| Hook | Engine call site | Contract |
|---|---|---|
| `_benRootT` ROOT lease (frames, set by a form on its OPPONENT) | physics.js `moveFighter`: decremented next to `_benTerrorT`, and joins `canMove` | while > 0 the fighter cannot walk, run, dash or jump (exactly the `canMove = false` branch: friction only, gravity unchanged); guard, normals, specials, input polling and the clock are untouched. A 2-frame lease: the owner's form tick re-stamps it (to 2) every frame the root lasts, so swap / revert / KO end it within 2 frames. Absent for everyone else → byte-identical. Wildvine: Snare Vine (30f) and ROOTED (36f). |
| `drainMult` as a FUNCTION `(fighter) => number` | fighters.js `updateTransformDevice` (the existing `drainMult` read) | a number keeps working exactly as before (Alien X ×1.5); a function is called with the fighter each drain step. Wildvine: ×0.9 while FULL BLOOM lasts, else ×1. |
| projectile tag `alien.hidden: true` | ui.js `drawProjectiles`, first line of the per-projectile body | the hitbox is not drawn by the generic renderer (the form module draws its own plant / vine / thorn FX). Only a ready form's `alien` tag can carry it. |
| OWNER-LIMITED PLANTED OBJECTS (pattern, no engine hook) | the form's own `tick` + `drawUnder` | plants are plain records in `formState.garden` ({ id, type, x, y, t, cast, consumed, by }) with a fixed position, growth stage and lifetime; contact is a rectangle test in the form tick (never solid collision — no walls / floor changes), consumed through ONE gate (`consumePlant`) so a plant fires at most once even with simultaneous contacts; damage goes through a hidden `api.spawnProjectile` hitbox (blocking, scaling and hit effects stay the engine's). Cleared with the formState on swap / revert / KO / rematch / round end. |

### Jetray hooks (added with Jetray, 2026-11-17)

| Hook | Engine call site | Contract |
|---|---|---|
| `_benGrounded` status `{ ttl, air }` (stamped by a form on its OPPONENT every frame it lasts; `ttl: 2` so it lapses on its own) | physics.js `moveFighter`: the air-dash cap (`maxAirDash`), the `canJump` gate, and the "Apply X movement" line | while `ttl > 0`: no air dash (cap 0), no double jump (`jumpCount >= 1` refuses the jump — the FIRST jump still works), and airborne horizontal displacement × `air` outside hitstun (air drift; knockback flight untouched). Ground walk / run / dash, input polling and the simulation clock are untouched. Absent for everyone else → byte-identical. Jetray NEUROSHOCK → GROUNDED: `air: 0.5`, 150f. |
| `bodyOffset(f).rot` (optional, radians) | game.js body draw, untinted path (next to the existing `dx` / `dy` translate) | a render-only rotation of the body about its hurtbox centre. Absent / 0 → the old draw (the no-offset fast path is kept). Jetray BARREL ROLL: one full turn over the roll. |
| `chargeSpecial(f, ctx)` (optional; Charge + Special = P + L) | game.js `handleOmnitrixSwitch`, right after the `blockSpecial` call | hold Charge and press Special (or both together): return true to own the press — the Special is consumed (never also casts) and Charge stops refilling. Absent → nothing changes. Jetray + XLR8 FLASH TIME (`chargeSpecial: blockSpecial`, so Block + Special still works too). |

2026-11-17 owner rework: EYE LASER and TAIL VOLLEY are real LASERS on the Homelander / Superman heat-vision architecture
(`beam.js`: `createLaser` / `laserStep` lock-on driver, `marchBeam` hitscan, `drawBeam3` look, `drawLaserGauge` HUD bar) — the eye
beam applies damage the way Homelander's does (straight `api.applyScaledDamage` + hitstun / blockstun, so a held beam does not strobe
the per-hit impact flash), the tail pulses are hidden hitscan hitboxes. FLIGHT is the Homelander / Superman model (P tap = take
off / descend-to-land, stays up with nothing held, air dashes) on `FLIGHT_PROFILES.jetray`; the P tap is read on the SIM clock
from the form's raw input (game.js's charge-tap uses the wall clock, which a Ben form must not). Every Jetray / XLR8 hitbox carries
`alien.hidden` (no generic coloured shape). GOTCHA: `combat.updateProjectiles` culls lifetime ≤ 0 BEFORE hits resolve — a
lifetime-1 hitbox never connects in the real game (XLR8's Sonic Dive had this; fixed to 2). GOTCHA: tinting a sprite with
`source-atop` directly on the stage canvas paints a solid box — tint on an offscreen canvas first (Jetray + XLR8 afterimages).

Everything else Jetray needs reuses existing hooks: the per-alien FLIGHT PROFILE (`_alienFlightProfile` → flight.js `FLIGHT_PROFILES.jetray`;
MACH TIME swaps in `jetray_mach` ×1.5 by re-pointing the same field each tick), XLR8's Block+Special `blockSpecial` + buffered-press
swallow, `moveFrames` (Mach Time ×0.7 startup / recovery; Barrel Roll takes the ←← + Light press; no normals while a special owns him),
XLR8's projectile `timeScale` lease (opponent projectiles ×0.5) and its echo pattern (scheduled in formState, `api.applyScaledDamage`
× `api.getComboScale` — bypasses `onContact`, so echoes never chain or add pips), `onContact` (Neuro pips per cast, ult capture, Wing
Dash carry), `_benGlide` (Wing Dash / Sonic Dive / ult swoop travel), `invulnTimer` (Barrel Roll i-frames 4–10), the knockdown trio
(ult skid + bounce), `drawHud` / `drawFx` / `drawUnder` (Mach wash; the ult's hyperspace "travel background" covers the stage —
render-only, so no camera-mode hook was needed) / `drawBehind` (Mach afterimages) / `targetOffset`. Eye Laser: a per-frame EYE
anchor table generated by the slicer (`JETRAY_EYES`, mirrored for facing −1) + a segment-vs-hurtbox test that lands a small
hitbox at the entry point (angled beams without a rotated-hitbox hook). Tail Volley: rear bolts are ordinary `spawnProjectile`s with
a negative facing-relative `vx` (no rear-spawn hook needed).
