# S.P.D. Yellow — controls and resource rules

Keyboard P1: J Light · K Heavy · I Up-Attack · L Special · U Ultimate · P Charge · O Grab · ; Guard · WASD move.
Controller: Square Light · Triangle Heavy · R1 Special · R2 Ultimate · L2 Charge · L1 Grab · Circle Guard · D-pad / left stick.
"Forward" / "Back" are relative to Z's facing. All inputs go through one reader (`readRawControls` press edges), so keyboard,
pad, replay and LAN behave identically (verified frame-for-frame in `harness/spd_yellow_determinism.mjs`).

## Normals

| Input | Move | Startup/active/recovery | Raw |
|---|---|---|---|
| Light → fresh Light → fresh Light | Snap Jab → Draw Thrust → High-Low Cut | 5/2/10 · 6/2/12 · 9/3/18 | 17 · 21 · 28 |
| Heavy | Cross Cut | 13/3/25 | 52 |
| Down + Light / Down + Heavy | Low Draw (low) | 8/2/16 | 24 |
| Up + Heavy / Up-Attack | Rising Heel (launcher) | 12/3/22 | 42 |
| Forward + Heavy | Acrobatic Leap Kick (travels, stops in front of the foe) | 16/4/22 | 46 |
| Back + Heavy | Turning Sweep | 11/3/20 | 34 |
| Air Light / Air Heavy | Flying Kick / Inverted Flip Kick | 8/3/17 · 10/4/18 | 30 · 38 |

The J2/J3 retaps need a clean hit (whiff or block rejects them). Holding Light never auto-chains.

## Firearms (one Neutral-Special hold)

- **Tap:** compact pistol. The shot leaves on frame 12, costs 10, raw 28, 14 f recovery. At most one ordinary pistol shot per Z.
- **Hold:** at 24 held frames the game spends +15 once and Z braces the supplied long gun (`fire2`).
  Release fires the long gun, but never before frame 30 (the brace stays visible for at least 6 f). At 45 f it resolves on its own.
  Raw 62, 30 f recovery, no hold-repeat. Total cost 25.
- **Release before 24, or not enough Energy at 24:** pistol, and no long-gun cost.
- **Interrupted hold** (hit, grab, KO): committed Energy stays spent and nothing fires.
- **Air Neutral Special:** air pistol (`airAim0`), frame 10, once per airtime, no hover (gravity untouched).

## Duplicate

| Input | Action | Cost |
|---|---|---|
| Down + Special | Split one ordinary duplicate behind Z (appears frame 14; lasts 300 f; 120 f cooldown) | 20 |
| Forward + Special | Swap positions with the idle duplicate on frame 8 (≤ 420 px; no invulnerability; 60 f cooldown) | 10 |
| Back + Special | Echo: the duplicate repeats Z's last grounded normal once at 60 % damage (Z's own action continues) | 8 |

- The duplicate has no pushbox and never body-blocks.
- Any one opponent attack box or projectile overlapping it disperses it (popped → 120 f cooldown).
- KO, grab and ultimate entry also retire it.
- A clean ordinary echo hit opens two follow-ups, once per combo each; using one closes both:
  - **Relay** (15 f): Forward + Special swap-cancels Z's current action, free.
  - **Partner Break** (12 f): a fresh Heavy becomes the overhead-ready → thrust, raw 40.

## Ninja Megazord (shared `falconzord.js` scheduler)

2 pips (210 f refill each, one at a time), 75 f between calls, one live action at a time, 120 f lock after the ultimate.
The call pose (`yCall`) commits on frame 12. If the call is interrupted before then, its Energy and pip stay spent. Once committed, the Megazord action finishes even if Z is hit.

| Trigger | Action | Cost | Raw |
|---|---|---|---|
| Up + Special | Intercept Punch | 15 + pip | 36 |
| Stance → RISING KICK | Raised-leg kick, launches (once per combo with echo launchers) | 18 + pip | 40 |
| Breach confirm → Up + Special | Sword Finish (strikes at the target's captured location) | 20 + pip | 50 |

## Command stance (Charge + Special, grounded, from neutral)

- **Left / Right:** select (world directions, as drawn).
- **Fresh Special:** confirm. The opening chord can never confirm.
- **Guard:** cancel.
- **Timeout:** 120 f limit.
- While open, the stance swallows attack presses; nothing is queued for later. No slow-motion and no invulnerability.
- A rejected order (missing coins, Energy, duplicate or record) spends nothing and leaves the stance open, with a red X and the `reject` sound.
- The panel shows pad glyphs on a controller and the bound keys on a keyboard.

Orders: see `COINS.md`.

## Blink

Double-tap Left/Right uses the shared `rangers.js` blink: 2 charges (90 f refill each), 3 f wind-up, 5 f invulnerable travel, 3 f recovery, 282 px, no crossup (stops 6 px in front). Air blink is allowed (keeps momentum, |vx| ≤ 14). The engine dash is disabled (`noDash`), so a blink never double-moves.
The vanish uses the supplied `streak0`, the travel/arrival uses `streak1`, and the recovery shows the supplied ready/low pose `acro4` (`yBlinkRec`).

## Ultimate — Duplicate Raid: Ninja Crossbreaker (Ultimate, 100)

1. A compact-pistol opener leaves on frame 20 (raw 20). It cancels from Cross Cut, High-Low Cut or Partner Break on hit.
2. A clean hit starts the frozen raid:
   - duplicate A cuts from behind the target (30), then duplicate B cuts from in front (30)
   - Z's leap kick (35)
   - Megazord punch (30), then Megazord kick (30), with the Megazord striking from behind the target
   - Z's braced long-gun beam (45), and the Megazord sword finish 6 f later (50)
3. Total: 270 raw before shared scaling.
4. A miss or block gives the opener's 50 f recovery.
5. **Showcase** (stance toggle) spends 3 coins at entry for orbiting coins. It is presentation only: same hits, damage and duration (verified).
