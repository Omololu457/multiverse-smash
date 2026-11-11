# Swampfire

Swampfire is an Omnitrix form, not a roster fighter. This implementation uses the
supplied DS/DSi sheet at `assets/sprites/ben10/aliens/swampfire.png`. See the labeled
`contact_sheet.png`, `source_grid.json` and `SPRITE_LEDGER.md` for every source cell.

## Controls

Inputs are actions. P1 keyboard defaults are J Light, K Heavy, L Special, U Ultimate,
O Grab, P Charge, ; Block, WASD movement/jump. P is not a punch notation.

- Transform: Down, Down, then Light (P1 S,S,J; controller Down,Down,Square).
- Other slots, if present: Heavy, Special, Light+Heavy, Heavy+Special after Down,Down.
- Revert: Down,Down then Light+Special (P1 S,S,J+L).
- Flame Jet: neutral Special (L / R1).
- Vine Eruption: hold Down + Special (S+L / Down+R1).
- Blaze Dash: hold toward the opponent + Special (D+L from the left, A+L from the right).
- Methane Inferno: Ultimate (U / R2), alien form only, 50 Power.
- Low: crouch + Light or Heavy while grounded.
- Launcher: Up-Attack (P1 I; controller Up+Light/Heavy). Jump to follow.
- Air / Down-Air: Light / Heavy while airborne.
- Green Flash Roll: Back,Back then Light, using Swampfire's real backflip strip.
- Energy Guard: Block+Heavy (;+K / Circle+Triangle), 10 Power, one collision contact.
- Charge: P / L2 while transformed and otherwise neutral, outside cast recovery.

These specials use the game's existing held-direction dispatcher. Quarter-circle
or dragon-punch notation is not a literal keyboard sequence or an extra parser.

## Statistics and damage

The shared HP pool remains the selected human's 950/900/1000 maximum. Transforming
never heals or resizes it. Normal play approves Alien Force and Classic; Prime is
an explicitly experimental pending-art variant.

- Speed: selected human walk speed times 0.92.
- Damage: 1.10, applied once through the damage pipeline; Vow multiplies it further.
- Defense: 1.10 divides incoming damage, not a damage-taken multiplier above one.
- Weight: 1.15 reduces incoming knockback velocity by 1/1.15, scoped to Swampfire.
- Jump: selected human's jump impulse; one jump. No invented flight/double-jump.

Move damage below is raw before the form multiplier, global 0.60 damage scale,
combo decay, blocking, defense and rounding. It is not displayed HP damage.

## Timing convention

Only this authored profile opts into exact active-frame endpoints and component
attack-speed scaling. Other characters retain their existing frame data. Normals
have no extra legacy ten-frame cooldown after their declared recovery.

First-active block advantage = blockstun - (active + recovery), using the engine's
remaining-timer convention at contact. Later active contact can be safer.

- Jab: 5 startup, 3 active, 12 recovery, 14 blockstun; raw 18; -1.
- Heavy: 15 startup, 4 active, 25 recovery, 22 blockstun; raw 58; -7.
- Low: 7 startup, 3 active, 16 recovery, 15 blockstun; raw 26; -4.
- Launcher: 12 startup, 4 active, 28 recovery, 22 blockstun; raw 48; -10.
- Air / Down-Air: 8 startup, 4 active, 12 recovery, 18 blockstun; raw 32; +2.

Flame Jet spends 12, starts at tick 14 and pulses at 14/18/22/26/30. Reach is 280
from the body center along facing. Each pulse is raw 9. Total lock is 57 ticks;
final-pulse blockstun 15 gives -12 on that pulse's first contact. With the current
pre-increment combo curve, five isolated connected pulses are 23 effective HP
against an ordinary unbuffed target: floors of 9*1.10*0.60 times 1,1,.92,.84,.76.
Do not force the raw 45 total or an old approximate combo target into HP loss.

Vine Eruption spends 18, starts at 20, then strikes at 28 and 36 at fixed forward
sites 80/180/280 from the body's center. Raw damage is 22+22+34. Clean early hits
carry the target to the next site over eight bounded simulation ticks; block or
whiff does not capture. Early hits opt out of hitstop so the fixed-site handoff
is consistent. The last hit launches. Total lock is 73; no autonomous hold refresh
or infinitely repeating callback exists.

Blaze Dash spends 10, starts moving at 12 and lunges 260 over 13 simulation ticks,
clamped to stage bounds. Its raw-48 contact is scheduled at tick 24. Total lock 50
and blockstun 12 give -14 on the first impact tick. At a wall actual travel can be
shorter. The trail is cosmetic.

Methane Inferno spends 50 and strikes at 40/50/60 for raw 60+60+100 within radius
300 of the captured center. The last active tick is followed by 100 recovery
ticks (161 total). Eruption/explosion/patch/cloud art is cosmetic; only explicit
radial colliders deal damage. It can hit each opponent once per beat in FFA.

A paid Swampfire cast may finish at zero Power, then forces reversion/timeout.
This exception makes an exactly-50-Power ultimate usable. Cast/recovery denies
walking, jumping, charging, blocking, roll, guard, manual revert and swap. A real
hit/KO/identity replacement cancels pending beats, spends no refund, and ends the
commitment. Already emitted detached projectiles retain their authored lifetime.

## Regrowth

- 35% of actual HP removed after scaling/defense/HP clamping becomes recoverable.
- Explicit self damage and events tagged regrowthEligible:false do not enter it.
- Legacy direct combat damage without attacker metadata is eligible; Swampfire
  has no HP-cost ability. HP costs must explicitly opt out of damage recovery.
- Any HP-damaging contact restarts a 120-tick wait, even if ineligible for recovery.
- After that wait, restore up to 2 HP each ten ticks: first healing at tick 130.
- Partial final restoration is permitted; never exceed the bank, max HP or 80 total.
- Revert, switch, full device reset or KO clears the bank/cap/timers. Re-entry has
  a fresh bank. KO cannot regenerate or resurrect; defeated form art can remain.
- Vine-wisp visuals and synthesized placeholder sounds do not affect collision,
  damage, timing or random state. No recorded voice pack is claimed.

## Art and reproducibility

The source has 30 row bands and 250 variable-width cells. Exact teal/cyan/gold/
magenta background keys are removed without recoloring body pixels. Detached FX
rows are separate. Body strips preserve a common origin and feet alignment in
160x112 cells. Walk intentionally reuses restrained run poses at a slower cadence;
intro/victory use supplied emergence/standing poses, not invented artwork.

To reproduce packed assets with Python 3.9+, Pillow and NumPy:

    python tools/ben10/pack_swampfire.py

The recovered original grid detector is retained as historical extraction work.
The packer uses repository-local source and geometry, not a private backup path.

## Verification

- `npm run test:ben10-integration`: actual damage/resource/lifecycle module checks.
- `npm run test:swampfire-live`: real keyboard input, art/facing, regeneration,
  human variants, settings and competitive KO/victory/rematch.
- `npm run test:ben10-replay-lan`: actual recorded input/checkpoint replay and
  two independent browser simulations communicating over the real relay.

See root updates.TXT for exact results and current limitations. Activation tests
for experimental aliens are not finished-art or full-kit certification.
