# Enoch: balance notes

**Numbers.** They come from the real data via `harness/enoch_balance.test.mjs` (`docs/enoch/balance_results.json`). The
behaviour comes from the live tests:
- `harness/enoch_kit.test.mjs`: moves, glide, defence, matchups, determinism
- `harness/enoch_combos.test.mjs`: the five combos

**Damage.** "Raw" is stored damage. Live damage = raw × 0.6 (the global factor) × the combo scale.

## Matchups

| opponent | call | why |
|---|---|---|
| **Frozone** | **5-5** | The mirror of his own base. Frozone has more health (1150 vs 980), a bigger super (410 raw vs 330–390) and faster rushdown. Enoch has full-screen fire (Heat Lens), patches and reactions. **Decision:** Frozone is an *ice-walker* on Enoch's ICE (a skater doesn't slip on ice), so Enoch's slick zoning doesn't work on him. Enoch's FIRE and STEAM still hurt him. Decided on Enoch's side (`ICE_WALKER` in `enochState.js`); Frozone's files are byte-identical. Tested in the kit (Frozone keeps footing; fire still burns). |
| **Arlong** | Enoch favoured on paper, honestly near **5-5** | Arlong's water zones turn Enoch's FIRE into STEAM (no fire DOT there), but they also make Arlong WET for the laser (×1.25). The heaviest, highest-health fighter (1320) meets a light zoner who chips him from range. Arlong wins up close. **Decision:** (1) FIRE laid on an Arlong water zone becomes STEAM (`stats.arlongDouse`); (2) a target standing in an Arlong zone counts as wet (+25 % laser); (3) Arlong's own state is never mutated, so no Arlong file changes. Both are tested live (kit X). |
| **Superman / Homelander** | **4-6** | Flyers ignore his whole ground game: patches, slick, fire DOT and bursts only touch *grounded* fighters, and a glide can't follow them up. They have more health (1150 / 1050), top speed (99) and their own long-range heat vision. His answers are only partial: the sustained beam aims ±30°, the Ice Blast angles up to 30° at an airborne foe, and the rising palm is the anti-air. That is a real, accepted bad matchup for a ground controller. |
| **Sanji** | **5-5** | Sanji's lit **Diable Jambe** (`_sanji.dj > 0`) standing on Enoch's ICE melts it to WATER, with no burst. Fire meets ice, so Sanji is the one character who erases Enoch's ice by walking on it, but in doing so he hands Enoch WATER (the laser ×1.25 and Steam Burst set-ups). Unlit, Sanji slips like everyone else. Enoch-side only; Sanji's state is only *read*. Tested live (kit X). |

## Why he is not broken

1. **The lowest health of the cast:** 980 (Frozone 1150, Superman 1150, Homelander 1050, Arlong 1320, Sanji 1180).
   He is also light (weight 0.85).
2. **The thermal meter is the leash.**
   - From neutral, **4 Ice Blasts** (or 4 Heat Lenses) put him in a zone that **locks the other element**.
   - **10 in a row overload** him: that element is locked for 1.5 s and the meter sits at ±50.
   - Water moves exist only in the balance zone (±25), and each one pushes 20–25 away from 0, so they can't be chained
     either.
   - The meter drifts back at only 0.8 / s, so spending it has a real cost.
3. **Hard caps.**
   - 4 patches on screen (the oldest is evicted) and 3 Ice Blasts in flight.
   - The sustained beam is ≤ 1.2 s and **≤ 84 raw per use** (12 × 7), and costs +12 hot.
   - The biggest burst is **72 raw**, and only from an intensity-3 patch, which takes three merges.
   - The glide lasts ≤ 4 s and ends on any hit. It is never flight; the feet never leave the floor.
   - The disc has 80 HP, and fire melts it.
4. **Cooldowns:** Deep Freeze 8 s · Tide Break 6 s · guard cancel 10 s (which also costs 25 thermal).
5. **Supers 330 / 340 / 390 raw**, all below Frozone's 410. Each locks his thermal for 3 s afterwards.
6. **Standard combo scaling.** The brief asked for 85 % per hit; he uses the engine's shared curve (1 → 0.65 plus starter
   weighting), so his combos can't out-scale anyone else's. The five brief combos do 78–153 live without meter and 252
   with Thermal Shock (`COMBOS.md`).
7. **Set-up dependency.** His best damage (bursts, wet ×1.25, Steam Burst, Tide Break) needs patches placed first. Every
   patch is visible, timed (3–7 s) and walkable-around.

## Frame data: what the brief gave, and the values it left open

The brief's values, verified live against a blocking dummy:
- Jab +1, Straight −3, Heavy −5, wake-up reversal −12.
- The authored blockstun adds `BLOCK_SYNC = 2`, because the engine clears the attacker's move 2 frames after an equal
  blockstun.

**Left open in the brief, chosen here** (all punishable or neutral, none plus):

| move | on block | reason |
|---|---|---|
| low sweep | −2 | a light low; safe-ish but not a frame trap |
| rising palm | −4 | the anti-air; punishable up close if blocked |
| air strike | 0 | air normal (landing recovery decides) |
| slide | −6 | travels and lays ICE; punishable |
| Ice Blast | −6 | the projectile is the point, not the recovery |
| Frost Floor | −8 | a low eruption + ICE patch |
| Deep Freeze | −10 | a freeze on hit, so a clear punish on block |
| Heat Lens (tap) | −6 | hitscan, full screen |
| Scorch Sweep | −8 | lays FIRE ahead |
| Steam Burst | −10 | 85 raw; water-only |
| Condense | −4 | slow orb, set-up tool |
| Ice Disc / Tide Break / super | 0 / 0 / 0 | not attacks that are blocked in the usual sense (platform, a patch conversion, the freeze-contract cinematic) |

## Deviations from the brief (and why)

| brief | built | why |
|---|---|---|
| 85 % per-hit combo scaling | the engine's standard curve | parity with the whole roster |
| ICE + FIRE burst "knockdown" | a juggle-able pop (vy −11, hitstun 34) | a hard knockdown ends combos 2 and 3 at the burst |
| Heavy "launches" | launchVy −12 (a pop of about 85 px) | a −19 launcher put the foe out of reach of combo 1's Ice Blast |
| Ice Blast flat | aims up ≤ 30° at an *airborne* foe only | combo 1 (catches the popped body); still flat on the ground |
| (glide passes the foe) | an ICE glide passes through (physics pass-through hook); a fire glide collides | combo 3's "Ice Glide past" |
| super from full meter | also cancellable out of a clean committed special (Tide Break) | combo 5 |
| Frozone untouched | still byte-identical; Frozone is treated as an ice-walker on Enoch's ice (Enoch-side rule) | a skater on ice; keeps the mirror 5-5 |
