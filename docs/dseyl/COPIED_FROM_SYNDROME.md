# Dseyl — what was copied from Syndrome

Dseyl (`dseyl`) is a tribute fighter, an edited copy of Syndrome (`syndrome`). Start commit: see `START_COMMIT.txt`.

**Rule:** anything bound to Syndrome's id was copied and given Dseyl's own id. Everything else is shared **by reference**, so Syndrome's numbers and art can never drift apart between the two. Syndrome's own files were only read, never written. `harness/dseyl_framedata_diff.mjs` proves this: frame data, stats, traits and animation tables are identical for every other character, and Syndrome's files and sprites are byte-identical.

## Syndrome's implementation (read in full first)

| File | Role | How Dseyl gets it |
|---|---|---|
| `syndromeData.js` | Frame data (`SYNDROME_MOVES`), costs, machine budgets (DUET / SPIN / VELO / TURRET / HAMMER / RISE / SWEEP / ZERO), the ultimate schedule (`ULT`), timelines, the move→strip map and the roster entry | **By reference.** `dseylData.js` does `export * from './syndromeData.js'` and builds the `dseyl` roster entry as `{ ...syndrome, <overrides> }` |
| `syndromeSprites.js` | `SYNDROME_ANIM` (body strips) and `SYNDROME_PARTS` (machine / Omnidroid parts) | `SYNDROME_ANIM` by reference, re-pointed at `assets/dseyl/` (`dseylSprites.js`). `SYNDROME_PARTS` (drones, spinner, turrets, Velocipod, Omnidroid) by reference: he uses the same machine art |
| `syndromeState.js` | Simulation: `f._syndrome`, slots, hit volumes, release / operations, Zero-Point, Convergence, the Operation Kronos cinematic (module-level `cine`) | **Copied:** `dseylState.js`. It is hard-gated on `rosterKey === 'syndrome'` and owns module-level cinematic state, so it needs its own id |
| `syndrome.js` | Command layer (press edges → moves) | **Copied:** `dseyl.js` |
| `syndromeFx.js` | Render: composite Omnidroid, machines, HUD, intro card, ultimate presentation, cue playback | **Copied:** `dseylFx.js` (gated on `dseyl`). It still draws Syndrome's machine parts by reference and plays Syndrome's `syndrome_*` sounds |
| `syndromeHarness.js` | `__harness.syndromeTest` | **Copied:** `dseylHarness.js` → `__harness.dseylTest` |
| `syndromeKit.js` | Move List | **By reference:** `dseylKit.js` = `SYNDROME_KIT` plus his two powers |
| `syndromeSound.js` | WebAudio synth SFX (`syndrome_*`) | **By reference:** no copy; Dseyl's cues play the same `syndrome_*` ids |
| `syndromeSkins.js`, `syndromeSkinTable.js` | 12 whole-arsenal skins + HUD colours | HUD colours by reference. Skins NOT copied: Dseyl has the default only (`dseylSkins.js`) |
| `assets/syndrome/*.png` (31 body strips + portrait) | Body art | **Copied, then edited** (Phase 2) → `assets/dseyl/*.png` |
| `assets/syndrome/machines/*.png` (92) | Machine art | By reference |
| `assets/syndrome/fx/blank.png` | Invisible hit-volume sheet | By reference |

Every rename in the copies is an explicit identifier map in `tools/dseyl/make_copy.py`, for example `isSyndrome→isDseyl`, `_syndrome→_dseyl`, `_sy→_ds` (projectile tag), `tickSyndrome→tickDseyl`. There is no blanket text replace. The generator fails if any id-bound Syndrome name survives. Re-run it whenever Syndrome changes.

## Shared engine hooks

Each Syndrome hook got a Dseyl twin line, applied by `tools/dseyl/apply_hooks.py`. Every hook is idempotent and asserts its anchor count.

- `game.js`: imports; tick + cues (1v1 and FFA); command layer (1v1 and FFA); movement lock; Charge ownership; all four reset paths (KO / round / rematch / scene); the round-over clear lists; the replay / LAN remote flag; the GAME_STATE snapshot; the ultimate freeze contract; the cinematic-active check; the render layers under / over / HUD / intro card; and `__harness.dseylTest`.
- `combat.js`: the hitbox, block, hit and projectile-hit hooks. They are copies of Syndrome's and gated on `dseyl`.
- `sprite.js`: the frame read used for gesture-synced machine art.
- `input.js`: raw-control routing and the remote-input exclusion.
- Registration:
  - `characters.js` (export placed right after `omololu`)
  - `kits.js`, `skins.js`, `spritesheets.js`
  - `rosterParity.js` (`dseyl: 1.11`, Syndrome's boost)
  - `credits.js`

## Shared code reused unchanged

- `flight.js`: Dseyl only adds the data profile `FLIGHT_PROFILES.dseyl`.
- The `game.js` time-slow engine (`_oppTimeScaleOf` → `_updateGodspeedTimeSlow`): Flash Time plugs in the same way the Flash and Dash Parr do.
- `combat.js` damage / guard / juggle / projectile rules, through the same hooks Syndrome uses.

## Not copied

- Syndrome's 12 skins (default only).
- His docs, visual harnesses and skin builder.
