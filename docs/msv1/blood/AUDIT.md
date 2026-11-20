# MSV1-BLOOD — Phase 0 audit

## Existing system built on: `battleDamage.js` (FEEL PASS Phase 2)
- Per-slot damage records (`bdRecordHit`, fed from `_fireHitFeel` in game.js), levels at 15 / 40 / 70 % of max HP
  accumulated over the MATCH.
- A normalised 128×192 marks texture (scuffs, scorch, frost, small tears and smooth radial-gradient "blood" blots)
  that sprite.js composites onto the frame with `source-atop` (`fighter._bdMarkTex`).
- Floor decals baked into an offscreen layer (scorch, crack, puddle, blood ellipses; cap 150, never fade), falling
  drips at level 2+.
- Blood gated by `juiceSettings.battleDamage === "full"` AND the global `bloodFx` toggle (default OFF) AND the
  brutality eligibility list (adults only; children hard-excluded).
- Deterministic hash seeded with the match seed; nothing in GAME_STATE.

What MSV1-BLOOD changes in it: the smooth blob blood is removed from the marks texture (marks keep scuffs / scorch /
frost) and its drips are grime-only. Blood is now `battleBlood.js`, re-exported through `battleDamage.js` (one
battle-damage entry point): sprite-pixel wounds on per-frame body maps, damage-tiered per round, per-region, per
damageType, real floor drips / pools / smears with fade and a 64 cap. Same render-only, hash-seeded rules.

Other hit-effect systems found (left as they are): `juiceFx.js` hit sparks / detonations, `animeJuice.js`
(slash cuts, split gate), the hit-spark gore in game.js gated by `bloodFx` (now labelled "Gore FX" in Settings
because it is a different, brutality-adjacent effect), brutality cinematics.

## Hit events (where blood reads from)
- `combat.js` pushes a hit SPARK for every connect: `{ x, y, damage, category, moveName, attackerSide, blocked }`
  (melee: resolveAttackHit / multi-hit paths; projectiles: resolveProjectileHitsMulti with `moveName = proj.name`).
- game.js consumes each fresh spark once per sim frame (1v1 loop and the FFA loop): damage number, juice, hit feel,
  and now `_bloodOnSpark(spark)`.
- damageType: `damageTypes.js` (`sourceDamageType({ attacker, move })`) + `damageTags.js` `PROJECTILE_TAGS`:
  slash / blunt / projectile / energy / grab. Haki and anything else resolves to blunt.
- Victim health / maxHealth / position / hurtbox / facing / grounded / vx are read from the fighters (GAME_STATE),
  never written.

## Roster
See ROSTER.md — 113 playable characters, their own / skin / form sprite sets.
