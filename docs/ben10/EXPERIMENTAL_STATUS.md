# Ben readiness — integration 2026-11-11

Normal selection approves Swampfire only. Alien Force and Classic humans have
verified stats and their own human artwork. Prime remains pending-art and requires
explicit development mode (`?benExperimental=1`); Albedo remains roster-disabled.
This switch changes only Ben availability, not general disabled-roster policy.

Registry readiness, saved-loadout migration, picker, runtime form entry and Vow
use the same availability predicate in aliens.js. Invalid/old production loadouts
fall back to Swampfire. Development preserves legacy forms instead of deleting
unfinished content. Legacy catalog slot numbers are historical; live dial index
is the filtered selected loadout position, not a unique registry identifier.

All entries below have four passing activation/scheduler/finite-state checks in
harness/ben10_experimental_catalog.test.mjs (neutral/forward/down/ultimate). These
52 checks do not certify complete hits, balance, armor, art, replay or LAN per kit.
Every listed legacy form still renders tinted human placeholders. None is safe to
advertise as a finished alien. Synthesized sounds are placeholders throughout.

- XLR8: Dash Strike / Sonic Rush; momentum callbacks owner-epoch protected.
- Diamondhead: Shard Barrage / Rising Diamonds; real eruption launcher verified.
- Feedback: reactive absorb / discharge; generic projectile/guard interactions
  retained. Full counter matrix and artwork remain unapproved.
- Wildmutt: Pounce launcher; real alien body/animation set missing.
- Heatblast: ranged fireball; procedural projectile is not finished alien art.
- Four Arms: Quad Slam / command grab; superArmor metadata is not a universal
  incoming-hit immunity contract. Complete armor/throw balance needs review.
- Upgrade: Plasma Beam / Merge phase; no finished liquid-tech body animation.
- Eye Guy: beams; legacy piercing/beam presentation flags are not universally
  supported by projectile construction or hit resolution.
- Alien X: Reality Warp's long vulnerable startup is intentionally interruptible;
  scheduled ultimate windup is now canceled with owner/action invalidation.
- Cannonbolt: Roll Smash / wall bounce logic retained; generic superArmor support
  remains incomplete. Placeholder body cannot represent a finished rolling form.
- Clockwork: actual Time Ray hit applies 96-tick slowdown; movement and expiry
  verified. Artwork and the rest of the temporal kit remain experimental.
- Chromastone: absorb redirect / ultraviolet beam. Older comment claiming absorb
  is not hooked conflicts with the implemented shared Feedback counter path.
- Brainstorm: lightning bolt; procedural bolt and human body remain placeholders.

Swampfire is the approved form: real sheet, all 250 source cells ledgered, mapped
body/FX strips, full kit, Regrowth, lifecycle, keyboard, visual, replay and LAN
checks. See aliens/swampfire/README.md for implementation details and updates.TXT
for exact results/limitations. No unavailable artwork was invented for other forms.

Remaining decisions: author real legacy alien art, approve each kit and armor
contract, decide Prime's intended art, and conduct multiplayer balance playtests.
