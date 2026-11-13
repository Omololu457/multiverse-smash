# Green Arrow — PASS 3 Audit (before any change)

Undo point: `feat/green-arrow` tip **46dd4d2a** (PASS3_START.txt). Branch is built on `e67ba2a8`;
`main` is now `30162d93`. As in pass 2, the branch is stale vs the newer shared modules, so work is
developed/tested against the live **worktree** (current main + my GA code, which boots) and committed
as clean GA deltas onto the branch via private-index from branch-tip copies in `green_arrow_work/base2/`.

**Prerequisites:** PASS 2 is complete — `DRONE_MODES.md` ✅, `PASS2_AUDIT.md` ✅, drones carry
`nativeFacing` ✅. Gate satisfied.

## How the Super's bombs work NOW (`applyGreenArrowArrowstorm`, abilities.js)
- Phases: **startup** (20f: bow-skyward pose, invuln) → every live drone fires once + a **Payload
  bomber drone** is spawned → **volley** (3 explosive arrows, 45 dmg, every 18f) → end (3s Tech lockout
  + recall all drones).
- The **bomber behaviour** (`registerBehaviour("bomber")`) flies across at ~85% height and drops up to
  6 bombs via `_gaDroneShot` (`sheet ga_payload_bombs_sheet.png`, `spriteFrames 6`, `damage 35`,
  `impact: "explosion"`, `vx = facing*2, vy = 7`).
- **They do NOT target anything** (bombs just fall with a fixed `vy`), there is **no fixed spacing /
  carpet line**, and **no stage-aware ground/platform landing** — a bomb despawns on lifetime/offscreen.
- **`impact: "explosion"` is a STRING, but combat.js (`proj.impact && … proj.impact.lifetime`) expects
  an OBJECT** — so the current bombs render **no explosion FX**, only the direct-hit damage. (Pass-2
  strike drones get their blast from `_gaExplosionFx`, a separate `visualOnly` projectile; the Super's
  bombs never got that.) This is the first thing the munitions system fixes.

## BOMBS sprite row (6 frames, horizontal → vertical)
`ga_payload_bombs_sheet.png` = 6 frames of a munition rotating from horizontal to nose-down. Currently
drawn as a plain looping/one-shot strip (`spriteFrames 6`) — **the frame is NOT chosen by the bomb's
velocity angle**. PASS 3 Phase 1 adds angle-based frame selection (0°→frame 1, 90°→frame 6) + h-velocity
mirror, so a falling bomb tips nose-down and a lobbed one arcs naturally.

## How explosions are damaged + deduplicated now
- Bombs/arrows are ordinary projectiles in **`activeProjectiles`** (abilities.js:125), updated by
  `updateProjectiles` / `updateCombatProjectiles`, resolved by `resolveProjectileHitsMulti` (combat.js).
- **Dedup is per-projectile**: each projectile carries `_struck` and hits a given fighter once (and
  `piercesMulti` keeps a `_pierceHits` list). There is **no AoE blast radius** and **no per-explosion
  hitOnce id** — damage is point-collision on the projectile body.
- combat.js already supports: `proj.dot` (burn), `proj.hitFlag` (owner flag on clean hit), `proj.impact`
  (OBJECT → spawns an impact FX projectile), `proj._gaArrow` (ice/emp/net/flash on-hit status), block
  halves damage via the existing block path, and 85%/hit combo scaling via `applyScaledDamage`.
- PASS 3 Phase 1 adds the missing pieces in **munitions.js**: blast **radius** AoE, **hitOnce** per
  explosion, **hp:1 shoot-down**, **chain reactions** (cap 3, 70%), **arm time**, **telegraph reticle**,
  and **blast-hop** self-push — all on top of (not replacing) the shared `activeProjectiles` pool.

## How drone targeting picks a target now
- `d.target` is set once at spawn (the opponent) and the behaviours face/attack it; pass-2 added
  `faceMode: "target"` so turrets/gunships keep facing it. **There is no target-priority function and no
  hysteresis / retargeting** — PASS 3 Phase 4 adds a shared deterministic `pickDroneTarget` in drones.js
  (enemy summons/drones/clones → tagged fighter → nearest enemy), plus **orders** (FOCUS/GUARD/SWEEP) and
  counter-summon projectile shoot-down.

## Does the game support > 2 fighters? **YES.**
- `GAME_STATES.FFA_BATTLE` with `ffaState.fighters`, `ffaAliveFighters()`, and **team mode**
  (`ffaSameTeam(a, b)` = both have the same `a.team`). Up to `FFA_MAX_PLAYERS`. 1v1 uses `live2 = [p1, p2]`.
- So Phase 2/4 must **split wave targets across all enemy fighters and never hit a teammate**
  (`ffaSameTeam`), and fall back to `[p1, p2]` in 1v1. I'll test multi-enemy with a dummy third fighter.

## Where the ground line, platforms and stage bounds come from
- **Ground line:** module-level `groundY` in game.js (`refreshStageMetrics` = `canvas.height −
  floorHeight − groundOffset`); a fighter also stores its own `f.groundY`. Bombs land on `groundY` (or
  the first platform below).
- **Platforms:** `platforms.js` — `getPlatforms()`, climbable terrain (Wood Release primitive). A bomb's
  carpet should stop at the first platform top below its x.
- **Stage bounds:** `getStageWorldWidth()` (camera world width); `physics.stageLeft` /
  `physics.stageWidth` = the actual fighter-movement bounds. Carpet spacing = ~10% of the world width.

## Plan (munitions.js, generic like drones.js/flight.js)
Build `munitions.js`: `MUNITION_PROFILES` data (gravity/speed/turnRate/homing/blastRadius/damage/hitOnce/
hp/armTime/lifetime/onImpact/telegraph), an `activeMunitions` registry (part of GAME_STATE, ≤16, pooled),
angle-based BOMBS-frame rotation, explosion AoE + hitOnce dedup + chain reactions + blast-hop + telegraph
reticles. It **extends** the shared projectile/explosion idioms (reuses the GA explosion frames, the
`ffaSameTeam`/live-fighter list, `applyScaledDamage`) rather than building a second combat loop. No
Math.random — `hash(matchSeed, frame, player, munitionIndex)`. Then the Super rework (Phase 2), drone
bombs (Phase 3), targeting/orders (Phase 4), hazards/cleanup (Phase 5), sound (Phase 6), finals (Phase 7).
