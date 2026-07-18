# Rick Sanchez — Asset Map & Build Notes (first pass)

Rick was previously a **data-driven placeholder** (procedural box, `specials`/`ultimate` as
data routed through the generic fallback handlers). This pass promotes him to a **full sprite
character** with a real, hand-authored kit. Universe `rick_and_morty` already existed and Rick
was already selectable, so no roster/universe-menu edits were needed.

**Fighting identity: ZONER.** Keep opponents at range with Meeseeks / Rocket / Self-Destruct.
Melee (light/heavy) is deliberately *backup* — lower damage and range than a brawler.

Verified end-to-end with `harness/rick.test.mjs` (real Chromium, real input path): **28/28 pass**.

---

## Energy rename — "Bullshit Science Energy"

Intentional in-character humor, kept as-is (per spec).

- **In-match HUD meter label:** `characters.rick.energyConfig.label = "Bullshit Science Energy"`.
  Flows `char → createFighter (...char spread) → fighter.energyConfig → ui.js drawEnergyPanel`
  (`ec.label || "ENERGY"`). Also carries `color`/`glowColor` (portal-green `#8be04e`).
- **Character-select kit panel:** `traits.energyType = "bullshit_science"` → kits.js renders it
  as "bullshit science" (underscores → spaces). `energyType` only gates a `!== "none"` check in
  transformations.js, so the rename is mechanically safe.

---

## The 3-file sprite gate (every sprite character needs all three)

1. **characters.js** — `hasSprites: true`, `spriteScale: 1.7`, full `animationData` (table below).
2. **skins.js** — `rick: [{ id:"default", spriteScale: characters.rick?.spriteScale, … }]`
   (without it, applySkin() falls to spriteScale 1 → Rick renders at half size).
3. **spritesheets.js** — `rick: { actions: { idle: "./rick_stand.png" } }` (gates `spritesReady()`
   → flips Rick from a procedural box to sprites).

`spriteScale 1.7`: idle content ≈ 67px × 1.7 ≈ 114px on-screen (roster-standard height).
Per-action `anchorY = -round(bottomTransparentGap × 1.7)` to plant the feet.

---

## Sprite → action map (`characters.rick.animationData`)

All widths are the **cell pitch** (sx = frameIndex × width). Frame counts gap-scanned (alpha
gutters). Files renamed for zip/Windows safety are noted.

| action | sheet | frames × width × height | anchorY | notes |
|---|---|---|---|---|
| idle | `rick_stand.png` | 17 × 30 × 78 | −14 | clean uniform pitch 30 |
| walk | `rick_walk.png` | 9 × 32 × 81 | −14 | clean uniform pitch 32 |
| run | `Rick_run.png` | 9 × 49 × 79 | −12 | (note capital `R` filename) |
| jump / fall | `rick_jump.png` | 5 × 43 × 78 | −7 | single-jump art reused for BOTH jumps |
| dash | `rick_air_dodge.png` | 6 × 90 × 78 | −15 | **air-dash VISUAL only** — no i-frame/mechanic change |
| hurt | `rick_land_dodge.png` | 6 × 70 × 88 | −19 | **TEMP** stand-in — see note below |
| light (jab) | `rick_jab_foward_attack_clean.png` | 10 × 63 × 90 | −12 | "JAB" label cropped off; non-uniform (flag) |
| heavy (side kick) | `rick_kick.png` | 5 × 61 × 89 | −31 | mid-weight; mild non-uniform |
| up (launcher) | `rick_up_attack_clean.png` | 12 × 70 × 106 | 0 | label/thumbnail-row/clipped-frame stripped → clean 12f |
| air (neutral air) | `rick_up_attack_2_com.png` | 9 × 44 × 86 | −26 | non-uniform (flag) |
| meeseeksThrow | `rick_meeseeks_throw.png` | 1 × 72 × 68 | −5 | brief cast pose (throw the box) |
| rocket | `rick_rocket_air_rocket_attack.png` | 4 × 51 × 82 | −2 | up-special cast pose |
| portalTravel | `rick_portal_attack_travel.png` | 13 × 66 × 80 | −15 | Portal-Behind blink; clean uniform pitch 67 |
| selfDestruct | `rick_speacial.png` | 6 × 92 × 92 | 0 | ultimate pose; messy packing (repack candidate) |

### Filenames renamed (colon/dot → underscore, for zip/Windows safety)
- `rick_jab:foward_attack.png` → `rick_jab_foward_attack.png`
- `rick_portal_attack:travel.png` → `rick_portal_attack_travel.png`
- `rick_up_attack_2.com.png` → `rick_up_attack_2_com.png`

### Sheets cleaned in-place (originals retained as untracked source)
- **`rick_up_attack_clean.png`** — the raw `rick_up_attack.png` had baked-in "UP TILT" / "SIDE UP"
  text, a tiny thumbnail row, AND the flagged clipped frame (a 14px sliver at x≈409). Cropped to
  the clean 12-frame main row (upward energy-whip). *This resolves the "verify/fix the flagged
  possible clipped frame" item.*
- **`rick_jab_foward_attack_clean.png`** — cropped the top-left "JAB" text label (y0-9, above the body).

### `rick_land_dodge.png` hurt stand-in — INSPECTED, flagged
Reads as an **upright Rick with cyan afterimage/phase trails** (a dodge/shimmer pose), *not* a
crouch or landing pose (the spec's "crouchDown" assumption is slightly off). It is passable as a
temporary hurt (upright, teal could read as hit-flash) but is **TEMPORARY pending real hurt art**.

### Reference-only sheets (present, deliberately NOT wired this pass)
- `rick_double_jump.png` — reuse single-jump anim for both jumps (per spec); kept for a future pass.
- `rick_taunt.png` — purely cosmetic; no free key in P1's scheme; not bound (per spec).
- `rick_rocket_attack.png` — alternate side-tilt candidate; `rick_kick.png` chosen as the cleaner
  mid-weight heavy. Retained as a reserve.
- `rick_poop_attack.png` / `rick_poop_attack_effect.png` — downTilt, **DEFERRED**.
- `rick_gun.png`, `rick_up_throw_attack*.png`, `rick_portal_effect.png`,
  `rick_sanchez_transparent copy 23.png` — unused this pass.
- `rick_rocket_specail.png` — reused as the Rocket **projectile** sprite (not a body action).

---

## Basic normals (zoner-tuned — melee is backup)

`characters.rick.basic_attacks`, read by combat.js `_getMD` from characters.js:

| slot | input | dmg | notes |
|---|---|---|---|
| light | J | 34 | jab, short range (rangeX 62) |
| heavy | K | 60 | side kick, mid-weight (rangeX 74) |
| upAttack | I | 56 | **launcher** (knockbackY −8, launch 10) |
| airAttack | J (air) | 44 | neutral air |
| grab | O | 30 | standard |

- **downAir: intentionally ABSENT** — no art exists (genuinely missing, *not* substituted).
- **downTilt (poop): DEFERRED** — `rick_poop_attack.png` unused.

---

## Specials — `executeRickSpecial` (abilities.js), dispatched from `triggerSpecial`

- **MEESEEKS BOX — neutral Special (L).** Throws a Meeseeks that rushes the opponent in a straight
  line and connects once (then despawns cleanly on hit/whiff/expiry). Built on the existing
  summons.js rushdown pattern (same shape as Megumi's Divine Dogs). Cost **30**.
  - `summons.js` template `meeseeks`: `behavior:"rush"`, `speed 8`, `damage 45`, `oneHit`,
    **`maxSimultaneous: 99` (NO cap)** — only energy limits how many exist; handler does **not**
    gate on `summonCooldown`. Confirmed by test: two Meeseeks coexist and both run.
  - Two-phase art via a new spawn-beat hook: holds `meeseeks_idle.png` (poof-in) for 16 frames,
    then runs `meeseeks_run_attack.png`. (`spawnSheet`/`spawnBeat` fields; `updateSummonMovement`
    holds in place during the beat, `drawSummons` swaps sheets. Backward-compatible — summons
    without `spawnSheet` are unchanged.)
- **ROCKET — Up + Special (W then L).** `getRelativeDirections` ending in "U" (up key = jump key).
  Launches Rick upward (`vy = -22`, consumes air jumps) AND spawns a rocket projectile that rises
  with him (`vy -16`, 64×72 blast) — damages anyone caught in the vertical path. Cost **40**.
  Both a recovery/mobility tool AND an attack.
- **PORTAL-PULL — QCF + Special (Down→Forward, then L).** Teleports the OPPONENT to a spot
  right next to Rick (combo-starter positioning) — reappearing ABOVE it in midair, then FALLING.
  Cost **35**, fall-impact **60**. See "Portal-Pull / Portal-Push" below.
- **PORTAL-PUSH — QCB + Special (Down→Back, then L).** Teleports the OPPONENT to maximum distance
  (the farther stage edge, clamped to the visible frame by the always-on camera bound), reappearing
  ABOVE it and FALLING. Cost **45**, fall-impact **90**. See below.
- **PORTAL-BEHIND — double-tap toward opponent (movement, NOT the special button).** Reuses the
  EXISTING shared teleport (`game.js detectDoubleTapDashTeleport` → `teleportBehindTarget`) — the
  same system Gojo/Sukuna/Toji/Sasuke use. Rick's branch is reposition-only + plays
  `rick_portal_attack_travel.png` via `_spriteCastMove`. Requires `movement.dashTeleport: true`
  (set on the character). Feel is identical to the other four by construction.

---

## Ultimate — SELF-DESTRUCT (`executeRickUltimate`, dispatched from `triggerUltimate`)

Manual Ultimate-button press. **Instant** proximity AOE — no startup / vulnerability window.

- **Cost 140 of 160 max (87.5% — near-max).** The only balance lever (per spec).
- **Damage 180, radius 220px** (center-to-center). Rick takes **NO self-damage** and is not
  knocked down (only the opponent is touched).
- **Proximity-gated:** connects only if the opponent's center is within 220px; whiffs entirely at
  range (test-confirmed both: −180 when close, −0 when far).
- Blast visual = a `visualOnly` green AOE circle (never collides — damage is applied directly so
  we can proximity-gate and guarantee zero self-damage). Body plays `rick_speacial.png`.

### Damage/radius reasoning
Damage is applied **directly** (summon-style, bypassing combat's `GLOBAL_DAMAGE_SCALE 0.60`),
matching how summons deal damage — so 180 is a genuine ~17% burst rather than being halved. That
sits above Sasuke's Susanoo arrow (230 raw × 0.6 ≈ 138 effective), which is appropriate because
Self-Destruct: (1) **whiffs entirely** if the opponent isn't close, (2) costs **near-max meter**,
and (3) deals **no self-damage / has no recovery window** — the whiff-risk + huge meter spend are
the counterplay, so the reward has to be meaningful. Radius 220 (≈3.5 body-widths, center-to-
center) is intentionally **bigger than a normal special** (which are point/projectile hits) so it
reads as an ultimate-tier "get away from me" nuke while still demanding mid-close range.

---

## Air-dodge / double-jump / taunt

- **Air-dodge:** `rick_air_dodge.png` wired as the sprite for the existing air-dash movement
  action (`dash`). **Visual only** — no new i-frame/invulnerability system, no mechanical change.
- **Double-jump:** reuses the single-jump animation for both jumps (no jump-count-aware state).
  `rick_double_jump.png` left unwired, reference-only.
- **Taunt:** `rick_taunt.png` reference-only — no free P1 key, no mechanic (per spec).

---

## Portal-Pull / Portal-Push — ONE mechanic, two destinations (built 2026-07-17)

Two SEPARATE specials sharing one helper (`abilities.js rickPortalReposition`). Both reappear the
opponent ABOVE a destination x and let them FALL, taking impact damage on landing.

- **Inputs (motion-gated, both on the Special button L):** Portal-Pull = **QCF + Special** (D→F);
  Portal-Push = **QCB + Special** (D→B). Chosen because Rick's Special button already carries
  neutral Meeseeks + Up-Special Rocket, and the double-tap-movement system is claimed by
  Portal-Behind — so QCF/QCB are the only clean, unclaimed inputs. Mnemonic: forward "draws them
  in", back "shoves them away". Neither ends in "U", so no clash with Rocket; both require a real
  Down-first motion, so plain walking never false-fires and neutral Meeseeks (the fallthrough) is
  untouched.
- **Destination logic (the only difference between the two):**
  - *Pull* → adjacent to Rick on the side he faces (`rick.x ± rick.w + 26`).
  - *Push* → the farther of the two stage edges from Rick (`0` vs `worldWidth − w`), so it's the
    MAX distance while respecting stage bounds. The always-on `physics.clampToCamera` then keeps
    the opponent inside the visible frame (they can never be shoved off-screen / off the playable
    stage) — so the realised distance is camera-limited, which is the intended safe behaviour.
- **Teleport-then-fall (reuses launcher physics, NOT a new fall-damage system):** the helper sets
  the opponent's `x`, lifts them to `floor − h − 220`, and sets `vy=0 / onGround=false /
  isLaunched=true / jumpCount=0` — the exact target-pop fields `physics.launcherAttack` uses. Gravity
  (unchanged) drops them. `hitstun=20` keeps them helpless through the drop.
- **Landing impact (marker→resolver, mirrors the `_dot` split):** the helper stamps
  `target._portalDrop = {dmg, hitstun, ttl}`; `game.js resolvePortalDropLanding` (called after
  `applyGravity` in `updateFighterState`, so it sees the regrounding frame) applies the damage +
  a small impact pop the frame they land, then clears the marker. A 240-frame ttl guards against a
  lingering marker if they never land (e.g. re-launched mid-fall). Works for p1/p2 AND ffa fighters
  (all route through `updateFighterState`).
- **Damage/cost reasoning:** Pull **60 dmg / 35 cost**, Push **90 dmg / 45 cost** (applied DIRECTLY,
  bypassing `GLOBAL_DAMAGE_SCALE 0.60`, like the ult/DOT). Pull is cheaper and hits softer because
  most of its value is the free positional/combo advantage of yanking the opponent into melee range
  — the hit is secondary. Push costs more and hits harder because the damage IS the reward: unlike
  Pull it grants no follow-up, just a full-screen spacing reset (the zoner's dream), so it must pay
  for itself. Invulnerable/eliminated opponents make it whiff (energy still spent, like a grab whiff).
- **FX:** both play `portalTravel` (`rick_portal_attack_travel.png`) on Rick + spawn a `visualOnly`
  green portal ring (`portalWarp`) where the opponent reappears; camera focus + landing shake.
- **Tested:** `harness/rick.test.mjs` now 35/35 (Pull adjacency + fall damage; Push max-distance
  direction + in-bounds + fall damage). Full regression clean (basickit/round4/susanoo/tower/
  training/ffa/team + the rest).

## DEFERRED (spec only — NOT built this pass)

- **downTilt** (`rick_poop_attack.png`) and **downAir** (no file) — no slots assigned.
- **Meeseeks polish:** current summon is functional but simple; a later pass can visually
  distinguish multiple simultaneous Meeseeks, tune cooldowns, etc.
- **Non-uniform attack sheets** (light/heavy/air/selfDestruct): sliced at frames = poses with
  round-pitch widths; some frames drift slightly. Repack to uniform cells in a polish pass.

---

## Files touched

- `characters.js` — Rick promoted to sprite char (energyConfig, zoner basic_attacks, animationData, specials/ultimate data).
- `skins.js`, `spritesheets.js` — sprite-gate entries.
- `sprite.js` — MOVE_TO_ACTION cast-move identity entries (meeseeksThrow/rocket/portalTravel/selfDestruct).
- `summons.js` — `meeseeks` template + generic spawn-beat pose-swap hook.
- `abilities.js` — `executeRickSpecial` + `executeRickUltimate`, registered in the dispatch switches.
- `game.js` — Rick branch in `detectDoubleTapDashTeleport`; harness accessors `summons()`, `liftP2()`, `resetUlt()`.
- `harness/rick.test.mjs` — new test suite (28/28).
- Sprite files: 3 renamed, 2 cleaned (`*_clean.png`).
