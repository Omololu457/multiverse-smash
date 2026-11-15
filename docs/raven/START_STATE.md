# Raven build: start state (2026-11-14)

- **Branch:** `main`. No branch switch, pull, merge, stash, reset, clean or new worktree in this build.
- **HEAD:** `5fa3bc8d6e84f217d82ea4f4c237556f61145cb5` (White Ranger: Formation Crane Rise air conversion).
- **Source sheet:** `Game Boy Advance - Teen Titans - Playable Characters - Raven.png`.
  - Untracked in the repo. Read-only: the extractor checks the hash and never writes to it.
  - 900×1593 RGB.
  - sha256 `a0faa5d7d2cede96255fc876a82077c9e33a65f92c7cc5539b131e5c806d28e2`.
  - Key colour RGB(77,109,243).
- **Existing Raven:** no `raven` roster key and no Raven module existed before this build.
  - The only "Raven" string in any .js file is the Homelander skin `homelanderRavenHair`, a hair-colour name.
  - That skin is unrelated and is left untouched.

## Concurrent writers at start (NOT mine; never edited, reverted or committed by this build)

Three other builds have uncommitted work in the same checkout:
- **S.P.D. Yellow** (`spd_yellow`): `spdYellow*.js`, `assets/spd_yellow/`, `docs/spd_yellow/`, `docs/skins/spd_yellow/`, `tools/spd_yellow/`, `harness/spd_yellow*`.
- **Cyborg** (`cyborg`): `cyborg*.js`, `assets/cyborg/`, `docs/cyborg/`, `docs/skins/cyborg/`, `tools/cyborg/`, `harness/cyborg*`.
- **Beast Boy** (`beast_boy`): `beastBoy*.js`, `assets/beast_boy/`, `docs/beast_boy/`, `docs/skins/beast_boy/`, `tools/beast_boy/`, `harness/beast_boy*`.
  - This build was still active when Raven started: its files were modified about one minute earlier.

All three have hook lines in the same ten shared files. Those files' sizes at start:

```
 characters.js   |   6 +++
 combat.js       |  16 ++++++++
 credits.js      |   9 +++++
 game.js         | 115 +++++++++++++++++++++++++++++++++++++++++++++++++++++---
 input.js        |   4 +-
 kits.js         |   6 +++
 skins.js        |   6 +++
 sound.js        |   6 +++
 sprite.js       |   5 +++
 spritesheets.js |   3 ++
```

md5 of each shared file at start, before any Raven hook:

| File | md5 |
|---|---|
| characters.js | 188f7633e877f9fa699b6dcaec6e5fcb |
| combat.js | 0d0850787c6c00f21a1227d8dc745a1f |
| credits.js | fa4b5b21ac43bf404bffc4f16cde6101 |
| game.js | 46dd1ccf7a0e892602b23b0b39aa0115 |
| input.js | 1952c4c229e883dbaf0cf8cbb19d5ac2 |
| kits.js | b90a67bf668a1d245e7ade359ef70254 |
| skins.js | feae8e381b1c8d7b95c48fdccb80debb |
| sound.js | d5490bd61d39adeee45f84b81c7dd21c |
| sprite.js | 07efeaeeb71ae6aaff763d8ec347894d |
| spritesheets.js | 0ffac05c4f4cc223b9febc4d9077e239 |

Other untracked Teen Titans sheets (Beast Boy, Cyborg, Robin, Starfire) are not used by this build.

## Shared systems read before implementation

| System | Where | What Raven does with it |
|---|---|---|
| Double jump | `physics.js` moveFighter: `jumpCount < maxJumps`, reset only on floor contact in `applyGravity`; sprite.js `doubleJump` action when `jumpCount >= 2` | Raven sets `stats.maxJumps: 2` and ships a `doubleJump` strip. No Raven-specific jump code, no Energy tax. |
| Speed mapping | physics.js `clamp(4.5 + (raw - 78) / 20 * 5, 4.5, 9.5)`; game.js floors raw speed at `DEFAULT_SPEED = 9` | A low legacy value (for example 7) would floor to the 4.5 px/f minimum, so Raven uses an in-band raw speed (see MOVE_FRAME_MAP.md). |
| Frame order | game.js updateBattle: updateMovementInput (moveFighter) → updateFighterState (applyGravity) → updatePlayerCombat (character ticks + command layers) | Raven's tick prepares the next frame's physics (levitation vertical velocity, jump suppression). |
| flight.js (Homelander / Superman) | `flightTakeoff` sets `jumpCount = 0` and owns a separate flight-energy pool plus air dashes | Not used directly: resetting `jumpCount` would grant a jump on entry, which the brief forbids. Raven reuses its exported smoothing primitives `flightAxisStep` / `flightSoftLimit`, the same way `drones.js` does. flight.js is unchanged. |
| Defensive absorb contract | combat.js `absorbSpdBlue` at the melee site (resolveAttackHit) and the projectile site (resolveProjectileHitsMulti) | Soul Shell uses an equivalent `absorbRaven` at the same two sites. |
| Raw pad reader | input.js `readRawControls` fixed `PS5_MAP` (Cross 0, Circle 1, Square 2, Triangle 3, L1 4, R1 5, L2 6, R2 7, D-pad 12-15) | Raven joins the existing roster list. No Raven-only pad poller. |
| Universal hold-to-charge | game.js updateMovementInput (Charge / L2 / P) | Raven is gated out like Cyborg: L2 is the levitation toggle and never a hidden hold-to-charge. |

## Documentation read
- PROJECT_HANDOFF.md and the tail of updates.TXT (Black / Pink / White Ranger sections).
- docs/cyborg/INTEGRATION.md: the newest DC Teen Titans fighter, and the hook template.
- docs/beast_boy/START_STATE.md.
- No CLAUDE.md or AGENTS.md exists in the repository.
