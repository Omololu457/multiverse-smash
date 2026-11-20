# Ninja Academy framework (`ninjaAcademy.js`)

A reusable, profile-driven layer for **ninja fighters** and for **any dual- or multi-stance fighter**. It sits next to
`rangers.js`: an Academy ninja is a rangers.js profile (Ninja Vanish = S.P.D. Red's Blink) plus an Academy profile.
The first user is `ninja_storm_rangers` (Shane / Dustin). The framework never imports the engine: the character module
hands it a small world object every tick.

## What the framework owns

| System | Defaults (`*_DEFAULTS`, all overridable per profile) |
|---|---|
| **Focus** (one bar, carried across stances) | max 100 · +4 hit · +2 blocked · +1 / 40 f · +5 Vanish dodge · 180 f lockout after the Ultimate |
| **Ninja Vanish** | `NINJA_VANISH` **is** `SPD_RED_PROFILE.blink` (the same frozen object): 22% screen · 2 charges · 90 f refill · 3 / 5 / 3 · crossup · dodge reward |
| **Shadow Clone** | 20 Focus · 240 f · one per owner · 0.6 alpha · echo 12 f later at 50%, max 3 per combo, echoes never echo |
| **Kawarimi** | 10 Focus · 90 f cooldown · 6 f invulnerable · needs a live clone · usable out of hit / block stun |
| **Timed Mode** (per stance) | 30 Focus · 240 f · ONE shared 600 f cooldown · bonuses: `dmgMul`, `extraPassive`, `vanishStartup`, `takenMul`, `heavyKbMul`, `heavyKnockdown` |
| **Backstep** | 6 f invulnerable · ONE shared 300 f cooldown |
| **Twin Technique** | `twinPlan()`: with a live clone the finisher lands from both bodies, the pool split in two |
| **Stance dial** | Ben 10's Omnitrix grammar: ↓, ↓ within **16 f**, arms an **18 f** window, then ONE button. Instant, **0** Focus, **30 f** lockout |

## Adding a ninja (one stance)

```js
import { registerRangerProfile } from './rangers.js'
import { registerAcademyProfile, NINJA_VANISH } from './ninjaAcademy.js'
registerRangerProfile('my_ninja', { ownTick: true, blink: NINJA_VANISH /* … */ })
registerAcademyProfile('my_ninja', { stances: { base: { element: 'water', mode: { name: 'Tide Mode', dmgMul: 1.1 } } } })
```

## Adding a dual / multi-stance fighter

```js
registerAcademyProfile('my_duo', {
  startStance: 'red',
  stances: {
    red:    { element: 'air',   label: 'RED · SHANE',    mode: { name: 'Lightning Mode', dmgMul: 1.15, extraPassive: 1, vanishStartup: 1 } },
    yellow: { element: 'earth', label: 'YELLOW · DUSTIN', mode: { name: 'Quake Mode', takenMul: 0.9, heavyKbMul: 1.6, heavyKnockdown: true } },
    // a third stance is just another key + another dial button
  },
  dial: { buttons: { light: 'red', heavy: 'yellow' } },
})
```

The character module then:

1. calls `dialInput(f, raw)` each frame. It returns `{ stance, button }` when ↓↓ + a dial button completes. Check
   `stanceRefusal(f, to, busy)` (`'same' | 'down' | 'hitstun' | 'commit' | 'lockout' | null`), then call `swapStance(f, to, busy)`
   and apply the stance's own art / weight / HUD fields (`ninjaStormState.applyStance` is the example);
2. calls `tickAcademy(f, opp, W)` (Focus regen, clone life, Mode / cooldown timers) **after** its hitstop return, and
   `tickEchoes(f, opp, W)` **before** it (the echo queue runs on every sim frame, so an echo lands exactly 12 f later,
   the same as xlr8.js);
3. reads `modeDamageMul / modeTakenMul / modeHeavy` from its combat hooks and `academyHudState(f)` for the HUD.

### What a swap does (`swapStance`)

- Same stance → nothing (no cost, no lockout), like Ben refusing a same-slot swap.
- Refused while: already in that stance, the dial is on lockout, the fighter is in hitstun / blockstun, the fighter is mid
  power-commit (special / Ultimate / Mode charge-in).
- Otherwise: **instant**, 0 Focus, `vx = 0`, 30 f lockout, and it **clears the old stance's state** like Ben's
  `clearBenFormState`: removes the clone and its pending echoes, ends the active Mode (and its Vanish override), drops
  stance-scoped aims. **Persists:** Focus, Vanish charges, health, the shared Mode / backstep cooldowns.
- It pushes an `'stance'` event (the kit plays the shared "poof" cue: the same sound family as the Shadow Clone).

## World object (`W`)

`stageWidth() · frame() · seed() · damage(target, raw, opts) · hurtbox(f) → rect · comboScale(f)`. These are the only
engine calls the framework makes, so it can be tested and reused without game.js.

## Simulation vs render

- Sim state: `fighter._academy` (plain JSON) + `fighter._ranger` (rangers.js, including `blinkMod` for Mode overrides).
  Both go into the replay checkpoint snapshot, so replays / LAN are bit-identical (`harness/msv2.test.mjs` "det").
- **No `Math.random` / `gameRng`.** Use `ninjaHash(match seed, frame, player index)` (flight.js `hashRandom`, the same
  function as `rangerHash`) for anything random.
- Render-only (never written by the sim): clone ghost alpha / tint, Mode aura, streaks, dust. The character's Fx module
  reads `_academy` and never writes it.

## rangers.js: the one shared change

`blinkParams(f, p)` returns `p.blink` **unchanged (the same object)** unless the fighter carries `f._ranger.blinkMod`.
Only an Academy Mode sets that (Lightning: startup −1). S.P.D. Red / Blue / Green / Pink / Yellow never do, so their Blink numbers
are untouched. `harness/msv2_framediff.mjs` checks that `blinkParams(spd_red)` returns his own frozen object.
