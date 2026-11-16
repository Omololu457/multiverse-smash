# Element framework (`elements.js`)

`elements.js` is a generic, profile-driven framework, in the same style as `flight.js`, `drones.js` and `rangers.js`. It provides:

- a **thermal** resource meter
- ground **patches** of any element
- same-type **merging**
- cross-type **reactions**
- **effects** on whoever stands in a patch

Enoch is its first user, but nothing in it is Enoch-specific.

**State.** A character owns a `field` (from `createField`) and a `thermal` (from `createThermal`). Both are plain JSON on the
character's own GAME_STATE object (Enoch: `f._enoch.field` / `f._enoch.th`), so they are snapshotted with everything else.
The module itself keeps no match state, only the static registries of element, reaction and thermal profiles.

**Rules.** No RNG, no wall clock, no rendering. Damage leaves through the caller's `ctx.damage` (the world's
`W.damage` = `applyScaledDamage`) with a `damageType` tag.

## Thermal meter

| field | default | meaning |
|---|---|---|
| `min` / `max` | −100 / +100 | caps; reaching one **overloads** |
| `cold` / `hot` | −40 / +40 | at or beyond these the meter is in the cold / hot **zone** |
| `balance` | 25 | `|v| ≤ 25` = balance zone (balance-side elements unlocked) |
| `drift` | 0.8 / 60 per frame | idle drift toward 0 (not while `active`) |
| `cheap` / `strong` | 0.8 / 1.15 | own-zone cost and damage multipliers |
| `overload` / `overloadTo` | 90 f / 50 | lock time; the meter rushes back to ±50 |
| `elements` | `{ ice: 'cold', fire: 'hot', water: 'balance' }` | which side each element belongs to |

- `thermalCheck(t, P, el)` → `{ ok, why: 'locked' | 'overload' | 'balance' | null, cost, dmg }`
- `thermalPush(t, P, delta)` → returns `'overload'` on the push that hits a cap
- `thermalTick(t, P, active)` runs once per frame: the overload countdown, the lock countdown, then idle drift
- `thermalZone(t, P)` → `'cold' | 'cool' | 'balance' | 'warm' | 'hot'`

## Patches

A patch is `{ id, type, x (left edge), width, bornFrame, owner, intensity, floor, life, calm, disc? }`. The geometry follows
Arlong's water zones: left edge plus width, merge on overlap with a width cap, oldest first.

- **Cap**: `createField(max = 4)`. Adding past the cap evicts the oldest (`evict` event).
- **Width**: each profile's `width` (16 % of the 1280-px reference screen); same-type merges are capped at `maxWidth` (28 %).
- **Merge**: an overlapping patch of the same type merges (intensity +1, ≤ `maxIntensity` 3). `extend: true` (a trail being
  laid) grows the patch without raising the intensity.
- **Lifetimes**: ICE 420 f (7 s) · FIRE 300 f (5 s) · WATER 360 f (6 s) · STEAM 180 f (3 s). `tickField(field, frame)`
  removes patches whose `frame − bornFrame ≥ life`.
- **Calm**: patches spawned by a reaction cannot react again for `CALM_FRAMES` (20), so there are no runaway chains on the
  frame they appear.
- **Disc**: a patch with `disc` (a hovering platform) never merges and never takes part in ground reactions. Its owner
  handles it.

## Reactions

`registerReaction(a, b, { name, consume, spawn: [{ type, intensity? }], burst: { dmg, damageType, knockdown, scale[] } })`.
A reaction fires when a new patch overlaps an older patch of the paired type on the same floor (oldest partner first). Both
patches are consumed, the `spawn` patches appear at the overlap, and a `burst` event carries
`dmg × scale[highest input intensity − 1]` for the caller to apply to anyone standing there.

| pair | result |
|---|---|
| ICE + FIRE | both consumed → WATER + STEAM + burst **45** blunt, knockdown, ×1.0 / 1.3 / 1.6 |
| WATER + FIRE | STEAM + burst **25** energy, no knockdown |
| WATER + ICE | ICE at intensity +1, no damage |
| STEAM + anything | nothing (STEAM is `passive`) |

## Effects

`applyPatchEffects(field, fighters, ctx)` runs once per frame for grounded fighters standing in a patch.
`ctx = { frame, owner, ownerX, sideOf, grounded, feet, cx, walker, damage }`.

| effect key | on | Enoch's values |
|---|---|---|
| `slick` | non-owners without the `walker` trait: `f._elSlick[owner] = away-direction` | ICE |
| `dot: { every, dmg, damageType }` | non-owners (the owner is immune to his own patch) | FIRE 4 / 20 f, STEAM 2 / 30 f |
| `conduct: k` | anyone: `f._elWet[owner] = k` (a profile's attack may multiply by it) | WATER 1.25 |
| `obscure: alpha` | render hint, capped by the renderer | STEAM 0.55 |

**Physics hooks** (`physics.js`). Each one is the **identity** unless the fighter is slick:

- `elWalkVx(f, target)`: walking accelerates (`SLICK.accel` 0.12) instead of snapping to speed.
- `elFriction(f, fric)`: ground friction becomes 0.95, so dashes overshoot.
- `elDashMul(f)`: ×1.2 for a dash away from the patch owner (the 20 % longer backdash).

## Adding an element: no framework edits

```js
import { registerElement, registerReaction } from './elements.js'
registerElement('sand', { life: 240, width: 0.1, effect: { slick: true } })
registerElement('mud',  { life: 120, passive: true })
registerReaction('sand', 'water', { name: 'mud', spawn: [{ type: 'mud' }], burst: { dmg: 10, damageType: 'blunt', knockdown: false, scale: [1, 1, 1] } })
```

`harness/enoch_elements.test.mjs` registers exactly this dummy profile from outside the module and checks it merges,
reacts and bursts like the built-ins.

## Tests

`node harness/enoch_elements.test.mjs` (pure node, 39 checks) covers:

- thermal drift, zones, locks, balance and overload
- patch cap, width, merge cap, intensity and lifetimes
- the three reactions with their scaling, STEAM's passivity and the disc exception
- each effect, owner immunity, the walker trait, and the identity physics hooks
- genericity (the dummy element)
- determinism: two identical 600-frame runs are byte-identical, including 4 patches and a same-frame reaction
- no `Math.random` / `Date.now`
