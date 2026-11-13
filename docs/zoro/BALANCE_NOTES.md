# Roronoa Zoro — balance notes

Zoro is a **strong, fast** swordsman: big damage per hit and a scary stance, with **Toji's movement** (owner request,
after the build), paid for by a Spirit economy that gates everything good. Mechanical claims below are checked by
`harness/zoro_matchups.test.mjs` (12/0) unless marked *design read*.

## Profile
| | Zoro | Notes |
|---|---|---|
| HP | 1000 | roster standard |
| Walk / speed | speed 98 | **= Toji** (top speed tier) |
| Dash | dashSpeed 22 · duration 10 · cooldown 26 | **= Toji** (12.1 px/f ground dash) |
| Teleport-dash | double-tap **toward** = speed-tier blink to the foe's side (48f cooldown) | Toji's designed blink; resolves after a 5-tick window so →→+A stays **Oni Giri** and ↓-motions (Ashura/Taka/Shishi) never blink |
| Jump | jumpPower 28 | lower than the roster median (32) |
| Weight | 1.1 | horizontal knockback taken ÷1.1 |
| Evasion | Teleport-dash, ground dash, Oni Giri dash-through, Wake-up reversal (6 invuln) | no roll, no air-dash tricks |
| Meter | Spirit 100: +5 per sword hit, +3 per hit taken, +1/s | no Charge-button refill |

## Matchups

### vs Monkey D. Luffy — **5-5 (even)**
* **Luffy's reach vs Zoro's damage.** Stretch Piston reaches 230 px and Reel-In 270 px; Zoro's longest normal is
  96 px. Zoro hits harder: Heavy slash 90 raw vs Luffy's Heavy 58, Oni Giri 90, and ASHURA.
* Luffy controls neutral from range and whiffs-punishes Zoro's approach. Zoro wins once inside: the Jab → Slash →
  Heavy string (116 HP) and Oni Giri through Luffy's extended limb. Luffy's limb hurtbox is live while stretched,
  so Taka Nami and Oni Giri punish a whiffed Piston.
* Balloon Brace absorbs one Zoro normal, but not Tatsu Maki (a projectile) and not ASHURA (an ultimate).

### vs Superman — **4-6 (Superman favoured)**
* **Superman's tools:** flight keeps him out of Zoro's ground game, freeze breath stops his approach, and the
  held Heat Vision taxes Zoro from range. Zoro has no anti-air beyond Rising slash and Taka Nami's upward aim.
* **Zoro's out: Conqueror's Haki.** Once Zoro drops under 25%, Haki (verified):
  * cancels Superman's **in-flight beam projectiles**;
  * drops his **sustained Heat Vision**: even with Special still held, there's no beam until a fresh press;
  * stuns Superman for 1 s and shoves him away, resetting the match tempo, often into an Oni Giri or Taka Nami.
* It's once per match, so Zoro must survive long enough to get there. That's why it stays 6-4, not 7-3.

### vs Green Arrow — **6-4 (Zoro favoured)**, *design read*
* Green Arrow is **not on `main`**: he's an in-progress build in another session's uncommitted working tree, so
  this matchup can't be tested here. The read is against that build's design (a fragile 920-HP tech zoner whose
  drones guard space).
* **Oni Giri closes the drones' space:** a 15 px/f dash *through* the target that ignores body collision and
  ends behind him, so Arrow's keep-away walls don't hold. Tatsu Maki's drag pulls him off his spacing.
* Caveat: Haki cancels the shared `activeSummons` registry and all enemy projectiles in range. Green Arrow's
  drones live in his own registry (`drones.js`), so Haki would **not** clear them until that build exposes them
  as summons. Re-check when Green Arrow lands.

## Why he is not broken
* **Grounded:** Toji's ground speed, but a single low, heavy jump (jumpPower 28, 1 jump; Toji has 33 and a double jump).
* **Short mobility:** his only evasion is Oni Giri (12 Spirit, +14 whiff recovery, punishable) and the wake-up
  reversal (−12 on block).
* **Spirit-gated:** every special costs Spirit (10–20), Santoryu costs 15, ASHURA costs the full 100 and then
  **locks Spirit gain for 4 s**. NAP is free but sleeps him for 90 frames with no block.
* **Santoryu has a 4 s cooldown** after its 10 s run, and ASHURA only exists inside it, so the super is
  telegraphed by the aura.
* **ASHURA must connect on its first cut**; a whiff is a long recovery with 0 Spirit.
* **Scaling 85% per hit** (steeper than the shared curve): long strings fall off fast. Combo 4, the full resource
  dump, deals 211 HP (~21%).
* **Haki is once per match** and only under 25% HP.

## Watch list
* **CPU Zoro leans on Oni Giri:** the AI holds Forward while pressing Special, so its fallback maps to Oni Giri.
  It's punishable on whiff, but a smarter AI profile could mix in Taka Nami / Tatsu Maki.
* **Tatsu Maki Spirit refund:** ticks are sword hits (+5) so Combo 4 can pay for ASHURA. A full-duration hit can
  refund more than its 20 cost. It's fine on hit only (blocked ticks give nothing), but watch for tornado farming.
* **The ↗ of Shishi Sonson** briefly suppresses jumping right after any quarter-circle (≈3 frames, held ↗
  longer). It's needed so the counter isn't eaten by a jump, but a QCF → instant jump is a few frames late.

## Engine note: shared speed reset (not Zoro-specific)
`resetRound` (and the other reset paths in game.js) call Goku's `revertGoku` on **every** fighter, which stamps
`speed` 84 / `dashSpeed` 16 on the whole roster each round. Zoro is protected: `zoroRoundReset` runs right after it
and re-applies his own 98 / 22 (Zoro-only), so he really plays at Toji's designed speed with the blink.
**Toji himself is still flattened to 84 / 16 in live matches and never blinks**, as is every other fighter's designed
speed. Fixing that means guarding `revertGoku` to Goku: a roster-wide movement change, left for the owner to decide.
