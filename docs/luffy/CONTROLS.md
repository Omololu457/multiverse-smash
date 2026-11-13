# Monkey D. Luffy — controls

**Wind up. Let loose.** Elastic Brawler · Medium (the existing equivalent of 3/5).
These mechanics are original designs for Multiverse Smash Ultimate, not an exact
adaptation of an anime arc. Only the supplied artwork is used. Default appearance
only; no skins, recolors, transformations, or voice pack were added.

## Logical actions and default bindings

Bindings below come from game.js and input.js. Rebinding continues to use the
existing control maps; combat code contains no keyboard key or skin ID.

| Action | P1 keyboard | P2 keyboard | Standard controller |
|---|---|---|---|
| Move / directional modifier | A / D, W / S | Arrows | D-pad / left stick |
| Jump | W | Up arrow | Cross / A |
| Light | J | 1 | Square / X |
| Heavy | K | 2 | Triangle / Y |
| Up-Attack | I | 3 | Up + Square / Triangle |
| Special | L | 4 | R1 / RB |
| Ultimate | U | 5 | R2 / RT |
| Guard | ; | / | Circle / B |
| Grab / universal throw | O | 6 | L1 / LB |
| Charge | P | 7 | L2 / LT |
| Dash | Double-tap direction | Double-tap direction | Double-tap direction |

Charge does not replenish Luffy's Stamina. Use neutral recovery and clean normals.
The shared vulnerable charging stance still prevents attacks while held.

## Normals and command routes

| Input | Move | Raw damage | Startup / active / recovery |
|---|---|---:|---|
| Light | Quick Knuckle (J1) | 18 | 5 / 3 / 12 |
| Fresh Light during confirmed J1 recovery | Body Hook (J2) | 20 | 6 / 3 / 14 |
| Fresh Light during confirmed J2 recovery | Stretch Finish (J3) | 28 | 9 / 3 / 22 |
| Heavy | Coiled Straight | 58 | 14 / 3 / 26 |
| Down + Light / Heavy | Rubber Sweep | 27 | 8 / 3 / 18 |
| Up-Attack / grounded Up + Heavy | Rising Stretch | 44 | 12 / 4 / 28 |
| Air Light / Heavy | Air Heel | 30 | 8 / 4 / 16 |
| Air Down + Light / Heavy | Downward normal | 30 | 8 / 4 / 20 |
| Forward + Heavy | Advancing body blow | 24 | 8 / 3 / 17 |
| Fresh Heavy on its confirmed recovery | Stretched kick | 30 | 10 / 3 / 19 |
| Fresh Heavy on the kick's confirmed recovery | Knock-away | 42 | 12 / 3 / 26 |
| Fresh Up + Heavy at that last branch | Rising Stretch instead | 44 | 12 / 4 / 28 |

Release and press again. Holding an attack never advances either chain. Whiff,
block, armor absorption, or interruption closes the confirmation route. J3 and
the knock-away keep their recovery; there is no unlimited automatic chain.

A confirmed J1 can branch to Heavy. Confirmed J1, J2, or Heavy can cancel during
recovery into **Neutral + Special**. Release directional modifiers for that cancel;
directional specials retain their own dispatch. Confirmed Heavy can cancel into
Ultimate when the shared full-meter, disabled-move, and cooldown rules allow it.
A confirmed Air Heel can cancel into Air Down + Special. This does not guarantee
that the descending hit is a true combo; see the measured routes.

Rising Stretch leaves Luffy grounded. Manually jump-cancel the confirmed launcher
to pursue. The shared juggle limits, guard, grab, throw-tech, and defensive escape
rules remain in force.

## Specials

| Input | Move | Stamina | Behavior |
|---|---|---:|---|
| Neutral + Special | Stretch Piston | 12 | 13f start; straight attached punch, about 260px from body center |
| Forward + Special | Reel-In | 18 | 18f start; blockable attached hand, about 300px from body center |
| Down + Special | Rubber Pinwheel | 20 | 11f start; contacts at frames 11–12, 20–21, 29–30 |
| Back + Special | Balloon Brace | 18 | 10f start, 24f protection maximum, 22f recovery, 180f cooldown |
| Air Down + Special | Anchor Heel | 15 | 12f start; bounded descending strike, one use per genuine airtime |
| Fresh Special retap after a valid stretch confirm | Snapback | 1 Wind-Up pip | Retract into a 6f grounded ready state; no damage or invulnerability |

Ground direction priority is Down, Forward, Back, then Neutral. In the air only
Down + Special has a special move. Forward/back are relative to current facing.
There are no motion aliases. Ultimate takes priority over simultaneous Special;
a failed Ultimate attempt does not spill into a buffered special.

Reel-In pulls a grounded target on the same floor plane by at most 110 pixels,
up to 11 per simulation frame for ten frames. It stops short of body collision,
respects stage bounds, and cannot restand an airborne target. One pull per combo.

Balloon Brace absorbs one ordinary melee contact and awards one Wind-Up pip.
Grabs, projectiles, launchers, spikes, and ultimates bypass it. It does not heal,
reflect projectiles, or deal counter damage. Subsequent hits and recovery punish it.

Anchor Heel keeps its 12f startup, then offers at most 32 active frames while
falling, followed by 18f recovery if still airborne. Descent is capped at 18px per
frame. Genuine landing replaces the remaining action with 24f grounded recovery.
There is no bounce, air restand, or repeated protection from holding a button.

## Wind-Up and Stamina

Stamina is the existing energy pool, capped at 100. New matches, rounds, and
rematches start at the ordinary 50; training reset uses the shared full refill.

- Eligible neutral play recovers one Stamina per 30 simulation frames (2/s).
- Each distinct clean normal instance recovers three Stamina, including air normals.
- No passive recovery while attacking, guarding, charging, stunned, grabbed, in
  hitstop, or in an ultimate. Rewards clamp at 100; shared gains do not double-award.
- Distinct grounded unblocked normal instances grant one Wind-Up pip, capped at three.
- Projectiles, DOT, self-effects, blocked hits, and armor absorption grant no pips.
- An eligible normal resets pip decay to 180 frames. Each subsequent loss is 120
  frames apart until empty. Balloon does not reset an existing decay countdown.
- Character action timers pause with shared hitstop; fresh input edges are still
  observed. All counters are deterministic simulation counters, not wall-clock timers.

On a clean Piston hit, or after a valid Reel-In pull resolves, a **fresh** Special
retap is accepted for ten simulation frames. Holding Special cannot activate it.
A valid retap queues retraction until Piston frame 28 or Reel-In frame 40, the
explicit late recovery portion. It spends one pip when retraction actually starts.
Only one Snapback is allowed before the opponent escapes the combo. It never
moves the opponent, erases hitstun, teleports Luffy, or protects him from a hit.

The resource panel shows numbered Wind-Up pips and a SNAPBACK / SNAP QUEUED cue.
Stamina and pips are separate resources. Reset, KO, identity replacement, training,
and rematch clear the relevant character state.

## Ultimate

**Full-Stretch Finale** costs 100 Stamina and uses the logical Ultimate action.
The coiled opening starts in 28 frames. A clean opener enables four resolved
contacts at frames 28, 36, 44, and 56: 30 + 30 + 40 + 120 raw damage. Each contact
still uses shared collision, guard, scaling, hitstun, and juggle policy.

Whiff, block, immunity, or armor that prevents the valid opener skips the barrage
and enters 60 frames of recovery. A clean opener does not freeze or teleport the
opponent; an escape, interruption, or KO can prevent later contacts. The existing
1200f ultimate cooldown and bounded shared camera effects apply. No transformation
art or transformation state is involved.
