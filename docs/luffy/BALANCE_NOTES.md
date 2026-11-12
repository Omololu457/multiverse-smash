# Luffy — balance and measured routes

These mechanics are original game designs. Medium is the existing difficulty
scale's equivalent of 3/5. See CONTROLS.md for every input, timing and resource rule.

## Engine units and movement

HP 1000, Stamina maximum 100, ordinary start 50, training refill 100. Authored
attack/defense are both 85. Speed is 85, converted by the shared construction
formula to 6 logical pixels per neutral movement tick. Thirty unobstructed forward
ticks measured 180px. This is slightly above the ordinary speed-80 brawler.
Jump impulse is -31px/tick, gravity 0.85px/tick²; a genuine jump measured 549.9px
above the starting floor. There is one jump per landing. Dash speed is 18 for
8 ticks, through the ordinary dash/cooldown contract. Weight metadata is 1;
there is no private weight or knockback multiplier.

Authored startup/active/recovery numbers are exact simulation ticks at 60Hz
(`frameExact`). Shared hitstop pauses actions. First contact occurs on the listed
startup tick, not after multiplying legacy timing units. Anchor descent is capped
at 18px of actual per-tick movement, with 24f vulnerable landing recovery.

RangeX is measured from the body's forward collision edge. The 60px body adds
30px to center reach: Piston range230 ≈260px; Reel range270 ≈300px. Render bounds,
body hurtbox and movement body remain separate. The extended distal hand can be
punished during its deliberate vulnerability window.

## Damage and economy

All damage goes through the integrated engine's shared 0.60 raw normalization,
attack/defense modifiers, rounding, combo scaling and juggle limits. No private
85% scaling rule or changes to another fighter's move data were introduced.
Numbers below are actual HP lost against the default Goku fixture at a fixed
seed. Different defense, spacing and shared defensive escapes change outcomes.

Neutral recovery uses integer accumulation: one Stamina each 30 eligible ticks.
Clean normal instances award +3 once; grounded normals additionally grant one
pip. Specials/ultimate never award normal-hit resources. Holding Charge grants
nothing and suspends neutral regeneration. Three Wind-Up pips have independent
180/120f decay. Snapback spends a pip, not Stamina; no damage or invulnerability.

Reel pull is capped at 110px, once per combo; Snapback is also once per combo.
Locks clear only after the opponent escapes hitstun and the pull ends. Pinwheel
has three discrete contact gates; repeated animation updates cannot create hits
or extra pips. Anchor has one use per genuine airtime. Ultimate has four contacts
only after a clean opener, no capture state, and the shared 1200f recast cooldown.
Balloon absorbs one ordinary melee strike; throws, projectiles, launchers, spikes
and ultimate contacts bypass it. It awards no healing or damage event.

## Measured routes

`node harness/luffy_combos.mjs` uses real keyboard inputs through the full game,
steps each frame, and records hitstun, action recovery, spacing, damage, resources
and escape frames between contacts. Gaps below measure fighter left-edge spacing.
A true-combo label requires every intended contact and zero intervening neutral
escape frames in this fixture. Shared defensive escapes remain available.

| Route | Initial gap | Hits / HP damage | Gross Stamina / pips spent | Result |
|---|---:|---:|---|---|
| J1 → J2 → J3 | 80 | 3 / 37 | 0 / 0 | True combo |
| J1 → Heavy → Piston | 80 | 3 / 68 | 12 / 0 | True combo |
| Launcher → manual forward jump → Air Heel → Anchor | 80 | 3 / 61 | 15 / 0 | Reset before Anchor; escape window |
| Heavy → Piston → Snapback → advancing normal | 80 | 3 / 70 | 12 / 1 | True combo |
| Same resource route at distance | 180 | 2 / 58 | 12 / 1 | Final normal misses; pressure only |
| Reel → grounded Light chain | 180 | 4 / 49 | 18 / 0 | True combo |
| Same pull route near max reach | 300 | 1 / 14 | 18 / 0 | Follow-up whiffs; pressure only |
| F+Heavy → Heavy → Up+Heavy → manual jump → Air Heel | 80 | 4 / 71 | 0 / 0 | True combo |
| Confirmed Heavy → Full-Stretch Finale | 80 | 5 / 133 | 100 / 0 | True combo with full meter |

The air route requires a forward chase; Anchor does not capture or restand the
target. The final recorded escape frames and full contact/resource trace are
stored in combo_results.json. Resource totals are gross costs, not the net meter
after the harness's subsequent neutral wait. Clean normal rewards still apply.

## Counterplay and limitations

J3 has 22f recovery against 10f authored blockstun. Heavy has 26f recovery;
Piston 25f and Reel 30f. Whiff/block never grants the confirmed cancel. Snapback
requires a fresh retap in ten frames and retracts only in late recovery (Piston28,
Reel40). An accepted retap waits for that late portion; holding cannot activate it.
Balloon's recovery remains vulnerable, including after its one absorption.

The tests bound pull/retraction reuse, pip rewards, multihits, wall movement,
airtime resets and ultimate contact count. These checks do not certify competitive
balance across the whole roster. Prolonged FFA, every terrain/modifier combination,
physical controller hardware and a roster-wide matchup study remain untested.
