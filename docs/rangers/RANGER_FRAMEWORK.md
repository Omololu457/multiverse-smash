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
| Double-tap detection on **sim ticks**; the engine's wall-clock dash is turned off with `noDash` | The profile values passed to `registerRangerProfile` |
| BLINK: charges, refill timers, startup/travel/recovery split, invulnerable travel, edge clamp, crossup rule, air blink with momentum, run-after-blink, dodge detection, PHASE STEP face lock, wind-up refund | What a dodge pays (energy name, buff use), e.g. S.P.D. Red's +5 Delta and +15% next hit |
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

## 3. Engine wiring (one line per site; everything is gated on `getRangerProfile` / `isRanger`)

| Site | Call |
|---|---|
| game.js, 1v1 and FFA combat steps (before the command layer) | `const ev = tickRanger(f, opp, readRawControls(f) \|\| {}, RANGER_WORLD)`. The character module reads `ev` (blink/dodge/guilty/innocent/release) |
| game.js, after both `updateFacing()` calls | `rangerFacingFix(p1, p2); rangerFacingFix(p2, p1)` |
| game.js, replay checkpoint snapshot | `snap.push(JSON.stringify(f._ranger \|\| null))` |
| game.js, round/match reset | `clearRanger(f)` |
| game.js, `renderHybridFighter` body alpha | `* rangerBodyAlpha(fighter)` |
| physics.js walk multiplier | `* rangerWalkMul(fighter, dir)` |
| combat.js `applyScaledDamage` | `× rangerSealAbsorb(target, attacker)` (the card soaks 50%) plus the dodge buff `dmgMul` while `f._ranger.dodgeBuff > 0` |

`RANGER_WORLD = { stageWidth, frame, seed, attackBox: getAttackHitbox, projectiles }`. The framework never imports the engine.

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
5. Tests: `harness/rangers_framework.test.mjs` already proves a profile-only Ranger blinks. Add the new key to the in-game dummy check in `harness/spd_red_final.test.mjs` if needed.
