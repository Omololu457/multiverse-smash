# MSV1-DINO — balance notes

Numbers are the brief's; this file records what they produce in the engine and why nothing was tuned beyond them.

* **Health / tier.** One 1248 pool (S.P.D. Red ×1.04), roster parity ×1.6 like every MS_V1 Ranger. Four forms share it, so a swap
  never refunds health; it only moves the threat.
* **Swap economy.** 15 gem of a 0–100 bar that regenerates 6/s: a swap every 2.5 s at best, and the 90-frame cooldown caps it at
  one per 1.5 s. The swap-in strike (30) is the only damage a swap gives, and the +10 % special bonus lasts 3 s.
* **Combo ceiling.** Measured strings (COMBOS.md) sit at 138–192 (11–16 % of a 1200-HP foe), 229 inside Super Dino Mode, 369 for
  the full-meter Z-Rex string: no touch-of-death, comparable to S.P.D. Red's own 3-hit confirms.
* **Defensive tools are short and visible.** Tricera Skin 2 s (40 % damage taken, throws still beat it), Camouflage 2.5 s (ends on the
  first attack or on being hit; footstep dust + shimmer so it is fair), Blue Dino Dash armor only on frames 1–4 for ONE hit,
  Super Dino Mode armor only on heavies and once per move.
* **Trent's risk.** Corruption (+20 per Camouflage / Clone, +1 per 10 damage) means two powers + a few hits make him Evil: +25 %
  damage / +10 % speed but −2 % max HP per second for 6 s and no swap out — a real cost (≈150 HP if it runs out).
* **Drago Clone.** 50 gem, echoes at 50 %, cannot KO, one 50 counter when struck. Trent never trades places with it
  (`fixedReal`), so it is pressure, not a hidden-identity trick, and the CPU never has to guess.
* **CPU.** Swaps to counter using only visible state (Kira vs fliers / projectiles, Ethan vs pressure, Conner to chase, Trent to mix
  up) through the same keys a player presses; a 160-frame dwell stops ping-ponging. Same seed → identical CPU match (tested).
* **Untouched.** The frame-data diff (`harness/dino_framedata_diff.mjs`) proves every existing character, skin, alien and Ranger
  profile is byte-identical.
