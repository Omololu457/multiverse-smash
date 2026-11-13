# Ranger Framework (`rangers.js`)

When a prompt says **"follow the ranger framework"**, build the new Ranger this way. The first Ranger built on it is S.P.D. Red (`spd_red`, docs in `docs/spd_red/`). Use it as the worked example.

`rangers.js` follows the same pattern as `flight.js` (`FLIGHT_PROFILES`) and `drones.js` (`DRONE_PROFILES`):

- A profile is **pure data**, registered under the fighter's `rosterKey`.
- The module owns the shared logic.
- State lives in `fighter._ranger` as plain JSON, which is part of GAME_STATE (it goes into the replay checkpoint snapshot).
- Randomness, if a kit ever needs it, is `rangerHash(matchSeed, frame, playerIndex)`. That is `flight.js` `hashRandom` re-exported. Never use `Math.random` or `gameRng`.
- Air-blink momentum is capped with `flight.js` `flightSoftLimit`. The framework duplicates none of flight's accel/drag math.

## 1. What is shared and what is per-character

| Shared: `rangers.js`, never re-implement | Per character: `<key>Data.js`, `<key>State.js`, `<key>.js`, `<key>Fx.js`, `<key>Sound.js` |
|---|---|
| Double-tap detection on **sim ticks**; the engine's wall-clock dash is turned off with `noDash`. A diagonal press never counts as a tap, so motions like ↓↘→↓↘→ cannot blink. Every double-tap stamps `r.pending` / `r.pendingAt`, even when no blink could start | The profile values passed to `registerRangerProfile` |
| BLINK: charges, refill timers, startup/travel/recovery split, invulnerable travel, edge clamp, crossup rule, air blink with momentum, run-after-blink, dodge detection, PHASE STEP face lock, wind-up refund | What a dodge pays (energy name, buff use), e.g. S.P.D. Red's +5 Delta and +15% next hit. Which moves may blink-cancel: call `startBlink(f, r.pending.dir, 0, { cancel: true })` when `r.pendingAt === r.tick`. Which `→→`+button commands exist: `refundBlink(f)` returns the charge while the blink is still in its wind-up |
| MORPH state machine (`unmorphed`, `morphing`, `morphed`; `alwaysMorphed`) | Morph art and sequence, if the Ranger has unmorphed art |
| JUDGMENT: meter, `judgmentReady` / `judgmentBegin`, time freeze, verdict rules (`VERDICT_RULES`), GUILTY containment (pin, no actions, absorb, far-side release), INNOCENT refund and re-attempt window, once per round, **Ranger opponent is always innocent** (`isRanger`) | Which hits feed the meter, the input that starts it, the poster/card art, what GUILTY unlocks (e.g. Red's 220 Super beam) |
| TEAM BADGE: `rangerBadge(f)`, `badgeRGBA(f, a)` for HUD tint and FX recolour | Emblem art |
| Render helpers: `rangerBodyAlpha(f)` (dissolve and vanish) and `rangerHudState(f)` (pips, meter, verdict) | The draw code for streaks, HUD pips and meter, card and poster (render-only, reading `f._ranger`) |
| `isRanger(f)`: any registered profile, or any power_rangers roster key containing "ranger" (Omega, Samurai, MMPR); Krybots are not | Moveset, frame data, `damageType` tags, sounds, metadata |

## 2. Profile fields

`registerRangerProfile(rosterKey, profile)` merges the profile over the defaults. Every field is optional.

```js
registerRangerProfile('spd_red', {
  team: 'S.P.D. B-Squad',
  ownTick: true,                 // Red's own spdRedState tick calls tickRanger (default false = profile-only, ticked generically)
  badge: { color: '#e0201c', accent: '#36d6e6', emblem: 'gem' },   // HUD tint + FX recolour + emblem key
  morph: { alwaysMorphed: true },                                   // no unmorphed art → born morphed
  blink: {                       // all of BLINK_DEFAULTS, overridable
    distPct: 0.22,               // horizontal travel, fraction of the 1280 px reference screen (282 px)
    startup: 3, travel: 5, recovery: 3,   // 11 frames; only `travel` is invulnerable
    charges: 2, recharge: 90,    // each spent charge refills on its own 90 f timer
    crossup: true,               // may pass THROUGH the opponent (false = stops in front, `gap` px away)
    air: true,                   // airborne blink allowed (costs a charge, keeps vx/vy, |vx| ≤ airMomentumMax)
    vertical: false,             // ↑↑ / ↓↓ blinks (verticalPct of the 720 px reference height)
    tapWindow: 12,               // max ticks between the two taps
    gap: 6,
    faceLockOnCross: 8,          // PHASE STEP: frames the foe keeps facing the wrong way after a crossup
    run: { speed: 8.4, walk: 5.6 },        // hold the direction after a ground blink → run (physics walk ×speed/walk)
    dodge: { energy: 5, window: 20, dmgMul: 1.15 },   // invulnerable travel overlapped a live foe hitbox/projectile
    airMomentumMax: 14,
  },
  judgment: {                    // omit entirely → this Ranger has no Judgment
    meterMax: 20, perHit: 1,
    rule: { type: 'hpAtOrBelow', pct: 0.30 },   // VERDICT_RULES: hpAtOrBelow | comboAtLeast | never (add new types there)
    freeze: 30,                                  // frames time stops (the target is held in hitstop)
    guilty: { seal: 180, absorb: 0.5, release: 'farSide', releaseDist: 0.45 },
    innocent: { energy: 40, holdFull: 300 },     // energy paid once per round; meter held full for ONE re-attempt
    oncePerRound: true,
    rangerAlwaysInnocent: true,
  },
  sprites: { streak: 'blinkStreak', vanish: 'blinkVanish', emblem: 'gem' },   // keys the Ranger's own FX layer resolves
})
```

## 3. Engine wiring (these are the real call sites; every one is gated on `isSpdRed` / `getRangerProfile` / `f._ranger`)

| Site | Call |
|---|---|
| game.js, 1v1 and FFA combat steps (before the command layer), **for every fighter** | `tickSpdRed(fighter, opp, readRawControls(fighter) \|\| {}, SPD_RED_WORLD)`. For `spd_red` it runs Red's tick, which calls `tickRanger(f, opp, raw, world)` and reacts to its events (blink/dodge/guilty/innocent/release). For **any other fighter with a registered profile** (a *profile-only* Ranger, `ownTick: false`) it calls `tickRanger` directly, so the whole framework runs with no new code. For everyone else it is a no-op |
| game.js, after both `updateFacing()` calls | `rangerFacingFix(p1, p2); rangerFacingFix(p2, p1)` |
| game.js `_replaySnap` (replay checkpoint) | `if (isSpdRed(f) \|\| f._ranger) snap.push(JSON.stringify(f._spdRed \|\| null), JSON.stringify(f._ranger \|\| null), JSON.stringify(f.currentAttack \|\| null))` |
| game.js, round reset / match reset | `spdRedRoundReset(f)` / `clearSpdRed(f)`. Both call `clearRanger(f)` for Red **and** for a profile-only Ranger, so charges refill each round |
| game.js `renderHybridFighter` body alpha | `* spdRedBodyAlpha(fighter)`, which returns `rangerBodyAlpha(f)` for Red and for any profile-only Ranger, and 1 for everyone else |
| physics.js walk multiplier | `* rangerWalkMul(fighter, dir)` (run after a ground blink) |
| combat.js `applyScaledDamage` | `rawDamage = spdRedDamageMods(target, rawDamage, opts)`: `× rangerSealAbsorb(target, attacker)` while the target is sealed by **any** Judgment Ranger (the card soaks 50%), plus Red's own dodge buff `dmgMul` |

The world object is `{ stageWidth, frame, seed, attackBox, projectiles }` (built from `SPD_RED_WORLD`). The framework never imports the engine.

**A Ranger with its own module.** Set `ownTick: true` in its profile, then call `tickRanger` from its own `<key>State.js` tick, which game.js calls next to `tickSpdRed`. `ownTick: true` makes the generic profile-only hook skip that Ranger, so it is never ticked twice.

**A profile-only Ranger** (no module, `ownTick` left false) gets the following from the hook above:
- Blink: double-tap, charges, invulnerable travel, crossup or stop-in-front, face lock, air blink, edge clamp.
- Run after a blink.
- The dissolve and vanish alpha.
- Morph state.
- Judgment state.

It does **not** get, because these belong to a character module:
- Moves that start Judgment.
- Energy payouts.
- HUD pips.
- Streak art.

`harness/spd_red_final.test.mjs` proves this in the live game: it registers a profile at runtime for MMPR Red and double-taps.

## 4. Sprites a Ranger needs

The minimum set for the framework to look right. Every frame must come from the supplied sheet (no invented art), cut with nearest-neighbour only, and be ledgered.

| Need | Used for | S.P.D. Red source |
|---|---|---|
| idle, walk/run, crouch, jump/fall, hurt, knockdown, getup, guard | Engine animation set | R1, R2, R3, R7, R6, R5 |
| **blink vanish** frame | Startup dissolve: the body fades over 3 f | R17 f1 |
| **blink streak** frame | Travel streak afterimage drawn along x0 → x1 (body hidden) | R17 f2 |
| **emblem** | HUD energy badge + team-tint icon | WANTED-poster gem |
| (Judgment Rangers) **verdict frame / card** | Poster sliding onto the HUD; the containment card | WANTED poster, gem |
| intro / win / lose poses | Presentation | R17→R3→R1 · R9 / R16 · R6 |

If a Ranger has no blink art, the streak falls back to a team-colour (`badgeRGBA`) motion smear. That is code-drawn, not invented sprite art.

## 5. Checklist for a new Ranger ("follow the ranger framework")

1. `registerRangerProfile('<key>', {...})` in `<key>Data.js` (data only).
2. Roster entry with `universe: 'power_rangers'`, added inside the Rangers block of `characters.js`. The block reserves space for the S.P.D. squad and more.
3. Call `tickRanger` and the hooks from section 3. If the Ranger already has a module, add one line per site; don't fork the framework.
4. FX layer: streak/dissolve from `f._ranger.blink`, HUD pips from `rangerHudState(f)`, tinted with `badgeRGBA(f)`.
5. Tests:
   - `harness/rangers_framework.test.mjs` proves a profile-only Ranger blinks in the pure module.
   - `harness/spd_red_final.test.mjs` proves it in the live game, using a runtime profile on MMPR Red.
   - Copy that block for the new key.
