# Kevin verification and balance

Checkout [Multiverse Smash](../../index.html) at /Users/omololu/Desktop/project/multiverse-smash. Browser entry tested at [localhost port 8000](http://127.0.0.1:8000/index.html). The starting branch was feat/ben10-alienx at 7117060e49f93bf493fae43660cd7c0ae710e948. During work, the checkout was switched and fast-forwarded independently to main at 5f84bd8d9698e2c88898d6b10bbeef43893c325b. Kevin was exercised as working-tree changes. No Kevin commit or staging was made.

## Damage and timing

Melee measures apply combo decay, the higher of attack and damage multipliers, the defender’s defense divisor and the global 0.60 scale. Counter-hit, guard and roster-specific handling remain in combat.js. Throws use shared release. Kevin’s projectiles stamp the owner offense once and the projectile handler resolves combo decay. Test values below are actual HP lost by Gwen in the browser on clean, non-counter hits. Openers start after the shared clock begins ticking.

| Move | Human or coated raw → HP | Ultimate raw → HP |
|---|---:|---:|
| Light opener | 48 → 28 | 63 → 37 |
| Heavy | 95 → 57 | 118 → 70 |
| Reach | 110 → 66 | 133 → 79 |
| Launcher | 78 → 46 | 96 → 57 |
| Sweep | 65 → 39 | 84 → 50 |
| Air Light / Aerial Claw | 60 → 36 | 79 → 47 |
| Descending heavy | 105 → 63 | 128 → 76 |
| Throw | 100 → 60 | 122 → 73 |
| Aerial Drive / Aerial Furnace | 91 → 54 | 156 → 93 |
| Scrap Quarry / Shard Volley | 135 → 81 | 3 × 54 → 93 total |
| Arc Torrent / Halo Launcher | — | 174 → 104 and 148 → 88 |
| Shoulder Drive | 112 → 67 | — |
| Steel / alloy / Taydenite rush | 134 → 80 / 122 → 73 / 143 → 85 | — |
| Rubber / armor / stone rush | 120 → 72 / 138 → 82 / 150 → 90 | — |
| Return to Sender, captured Mana Bolt | 101 → 60 | Same return table |
| Borrowed Thunder | 155 → 93 | 178 raw |
| Cash-out | — | 215 near activation, 108 near expiry |

For comparison, the following are the roster’s authored raw damage/startup/recovery for three existing bruisers. Baseline attack and defense multipliers are 1.0 in the inspected entries. Luffy has character-specific limb, combo and defense hooks. Superman has separate reactive heavy armor. Baki is the faster and harder-hitting close starter. Kevin puts part of his damage and protection behind a selected coating, retrieval, or confirmed route.

| Character | HP | Light | Heavy | Launcher | Air light |
|---|---:|---|---|---|---|
| Kevin | 1,050 | 48 / 6 / 11 | 95 / 12 / 22 | 78 / 8 / 9 | 60 / 6 / 12 |
| Baki | 1,160 | 72 / 3 / 9 | 112 / 7 / 15 | 96 / 5 / 7 | 84 / 4 / 9 |
| Superman | 1,150 | 45 / 4 / 8 | 80 / 8 / 18 | 70 / 5 / 12 | 50 / 4 / 11 |
| Luffy | 1,250 | 31 / 5 / 12 | 99 / 14 / 26 | 75 / 12 / 28 | 51 / 8 / 16 |

Kevin accepts a clean cancel during the first ten recovery ticks. This applies to light retaps, alloy to Launcher, rubber to Air Light, Air Light to descending Heavy, and armored steel to Heavy. Launchers separately allow the shared jump-cancel.

| Live route | Damage | What held at the tested spacing |
|---|---:|---|
| Three lights | 28 + 28 + 35 = 91 | Follow-ups reached with 20 and 19 hitstun ticks left. |
| Launcher → fresh Jump → Air Light | 46 + 30 = 76 | The air hit reached with 31 hitstun ticks left. |
| Green Machine → Launcher → Jump → Air Light | 73 + 46 + 33 = 152 | Follow-ups reached with 24 and 31 ticks left. |
| Ricochet Riot → Air Light → Demolition Drop | 72 + 36 + 57 = 165 | Follow-ups reached with 31 and 15 ticks left. |
| Wrecking Ram armors one weak shot → clean Heavy | 80 + 57 = 137 | Kevin took projectile damage, held the rush and connected with the Heavy follow-up. |

These are observed hit-confirm routes from the harness setup, subject to range, matchup, gravity, movement and the shared combo breaker. Taydenite cut into throw or delayed Heavy, Scrap Quarry into advancing pressure, and Return to Sender into approach are spacing/guard routes. Borrowed Thunder is a committed punish after an opening. These pressure options allow escapes and were not measured as continuous combos.

## Verification commands

- The repository determinism suite passed 14 checks.
- Roster-integrity check passed, including the duplicate guard. The roster has 158 entries.
- Combo-standard audit reports 235 passed and 9 failed. A comparison using the original classification and removing only Kevin produced 233 passed and the same 9 failures. They cover existing classification gaps, the zoner count and missing Goku Rose/Gogeta normals.
- A roster before/after comparison found zero differences in existing fighters’ authored stats, movement, normals, specials, ultimates, animation data and multipliers.
- The live harness passed 150 checks, including the move table, actual damage, all six materials on the 19 standard stages and the FFA Colosseum, native Mana Bolt capture, timing and direction checks, unsupported shots, simultaneous contacts, spent slots, KO and timed reversion. The twelve palette IDs returned the same gameplay results for identical human, stone-coated and Ultimate inputs.
- The sync harness passed 14 checks, including player-two capture, simulated DualSense inputs, an airborne two-jump morph and reversion, delayed LAN input injection, and replay record/playback on a two-skin mirror.
- The source digest matched the ledger. All 193 mapped cells are recorded and all twelve 2,048 × 1,214 atlases have the same layout dimensions.
- The menu harness exercised title → Play → local versus → Ben 10 → skin → stage, the car intro, two rendered fighters and HUDs, Arc Torrent, KO, rematch, and skin persistence after a page reload. It rendered Event Horizon and Glitterstorm on Jujutsu High Courtyard and Null Void. The run recorded no page errors.
- LAN injection was exercised with the project’s scripted remote peer. Physical DualSense input was not tested. The project’s browser entry was used directly. The PyCharm IDE was not the launcher for these runs.

The sample with Arc Torrent in headless Chromium recorded 180 animation-frame intervals at 1280 × 720. Median was 33.2 ms, p95 34.4 ms and maximum 50.7 ms. The browser run did not sustain 60 FPS, so the pacing numbers do not establish physical desktop performance. Both selected atlases were already decoded in the intro.
