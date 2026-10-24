# Soldier Boy — Balance Notes

Archetype: **Bruiser / Gunner** (Marvel universe). Grounded, slow (walk ≈4.8), heavy jump, high HP
(1080) and attack, with a range game (SMG / rifle / boomerang shield) and a loadout-swap **Armed Mode**.
His whole kit is paid for out of one pool — **Nuclear Charge** (max 100, passive 3/s, +6 on a landed
hit, +4 on one taken). The Ultimate needs the pool **full**, so every special is a choice against the nuke.

## vs Homelander (flyer)
Homelander out-zones him from the air and can refuse the ground game entirely. Soldier Boy answers the
sky with tools, not mobility:
- **Gold Rush (→→+P, armored f1–6)** blows through a committed dive/laser approach — the armor eats the
  first hit and the lunge closes the gap for 85.
- **Shield Toss (↓↘→+P)** is a 420px round-trip that taxes him for floating at mid-range; the return
  arc catches a retreat.
- **Cape Cyclone (→↓↘+P)** is a dedicated anti-air (3×30, upper-body invuln f3–8) for when he commits
  to a descent.
- The catch: all three cost Charge (20/15/25). Dumping meter to swat flight means **no nuke**. Spend it
  to punish actual commitments, not to chase — and let the +6/+4 build it back while you trade.

## vs Superman
Pure stat disadvantage: Superman has more HP (1150 vs 1080), more weight, and flight. Soldier Boy can't
win a raw slugfest or a mobility race, so he wins on **resource discipline**:
- Bank Charge off chip and trades (he eats hits well — high defense + the +4-on-taken refund), keep ONE
  Shield Toss on screen for space, and **hold the full meter** for the moment Superman over-commits
  (a whiffed flying punch, a mode cast). A clean **Nuclear Burst (280 over three radial pulses, 360px)**
  is the equalizer — but it's a one-shot per full bar with a 90f recovery lockout, so it has to land.
- Don't trade the ultimate for a stray poke: the fight is won by forcing one bad Superman read and
  cashing the nuke, then grinding chip with guns while the meter refills.

## vs Spider-Man (mobility)
His worst matchup on paper — Spidey's speed (96) and double mobility leave Soldier Boy (walk ~4.8)
swinging at air. He covers approaches instead of chasing:
- **SMG Barrage (↓↓+P)** throws a wall of 6 bullets over 30f with hashed vertical spread — it contests
  the web-swing lanes and the dash-in.
- **Cape Cyclone** covers the up-and-over cross-up and the air approach with its invuln window.
- **Armed Mode** turns his Jab into a check-SMG and his Heavy into a rifle so he can threaten from
  neutral without walking forward into a counter-poke — at the cost of −10% move speed and 1.5 Charge/s,
  so it's a commitment, not a default.

## Why he isn't broken
- **One pool, hard choices.** Every special spends Charge (15–25); the Ultimate needs the *full* 100.
  Firing specials actively denies the nuke, and the nuke denies specials. There's no "do everything."
- **Ultimate is gated + punishable.** Full meter only, 280 unscaled but a **90f recovery lockout** — a
  blocked or whiffed Nuclear Burst is a free punish, and it empties the bar.
- **One Shield Toss on screen.** The boomerang IS its own cooldown — he can't wall with shields.
- **Armed Mode is a tax, not a buff.** 12s cap, drains 1.5 Charge/s (bleeds the nuke), −10% movement on
  an already-slow bruiser, and an 8s cooldown after it ends or is cancelled. Strong zoning, real cost.
- **Slow + grounded.** Walk ~4.8, heavy jump, no flight. Fast/aerial characters can always try to run
  the clock; he has to earn the knockdown.
- **Defensives have cooldowns.** Gold Brace (absorb one hit, 6s), Back Roll i-frames (5s), Second Wind
  (once per round, below 20% HP). No infinite turtling.
- **Fully deterministic.** All randomness (SMG spread, SFX pitch) is hash(seed, frame, playerIndex) —
  no Math.random/gameRng — so nothing is a coin-flip in his favor.
