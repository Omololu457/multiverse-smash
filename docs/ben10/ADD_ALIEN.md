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

Keep `formState` plain data: store ids (e.g. a cast id) and look live projectiles up each frame — never store object
references (they make GAME_STATE circular / non-serializable).

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
