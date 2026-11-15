# Syndrome — move set (THE CONDUCTOR)

Syndrome never strikes with his own body. Every input is a **command gesture** and a machine performs the attack; the
gesture is the move's startup. Normals have NO entity: the machine is drawn from the move's own elapsed time and the
move's ordinary melee box sits where the machine is drawn. Specials spawn machine **operations** with separate budgets.

## Frame data (authored; 60 fps frames). Damage = stored / raw before the shared pipeline

| Move | key | Input | Startup | Active | Recovery | Raw damage | Power |
|---|---|---|---|---|---|---|---|
| Spinner Snap | `light` | Light | 5 | 3 | 11 | 45 | — |
| Drone Cross | `sL2` | clean Light → Light | 6 | 3 | 12 | 45 | — |
| Spinner Pass | `sL3` | clean Drone Cross → Light | 8 | 4 | 18 | 65 | — |
| Low Spinner Skim | `sLow` | Down + Light | 7 | 3 | 13 | 42 | — |
| Claw Drive | `heavy` | Heavy | 14 | 4 | 22 | 95 | — |
| Rising Claw (launcher) | `sLaunch` | Up + Heavy / Up-Attack | 12 | 4 | 20 | 75 | — |
| Drone Strafe (air) | `air` | air Light / air Up-Attack | 6 | 4 | 13 | 65 | — |
| Leg Drop (air) | `sDownAir` | air Heavy / air Up + Heavy | 12 | 8 | 18 | 85 | — |
| Hunter Duet | `sDuet` | Special | 10 | 1 | 14 | 6 × 25 = 150 | 25 |
| Spin Cycle | `sSpin` | Forward + Special | 9 | 1 | 15 | 60 + 50 = 110 | 18 |
| Velocipod Intercept | `sVelo` | Up + Special (also air) | 12 | 1 | 16 | 150 | 25 |
| Deploy Turret (gun) | `sTurret` | Down + Special | 14 | 1 | 18 | 9 × 20 = 180 | 30 |
| Missile Turret | `sTurretMs` | L2 + Down + Special | 14 | 1 | 18 | 3 × 60 = 180 | 30 |
| Mortar Turret | `sTurretMortar` | L2 + Forward + Special | 14 | 1 | 18 | 4 × 45 = 180 | 30 |
| Omnidroid: Hammerfall | `sHammer` | Back + Special | 12 | 1 | 40 | 170 | 30 |
| Rising Interception | `sRise` | L2 + Up + Special | 12 | 1 | 30 | 130 | 25 |
| Omnidroid Sweep | `sSweep` | L2 + Back + Special | 12 | 1 | 34 | 120 (low) | 25 |
| Zero-Point Hold | `sZero` | L2 + Special | 12 | 4 | 20 | 20 | 20 |
| Operation Kronos opener | `ultOpen` | Ultimate | 16 | 4 | 40 | 30 | 100 |

Specials list the command gesture's frames; the machine's own contacts come later (warning frames below). Shared
pipeline for every character: live damage = floor(raw × combo scale × 0.6 GLOBAL_DAMAGE_SCALE / defence multiplier).
Measured values: DAMAGE_AUDIT.md.

## Cancels (clean hits only; never on block or whiff)

| From | Into |
|---|---|
| Spinner Snap → Drone Cross → Spinner Pass | fresh Light (3 stages max) |
| Spinner Snap / Drone Cross / Low Skim | Heavy (Claw Drive) or Up + Heavy (Rising Claw) |
| any normal incl. Claw Drive / Rising Claw | any Special or L2-Special (grounded) |
| Claw Drive / Spinner Pass | Ultimate |
| Rising Claw hit | Jump (shared launcher jump-cancel) → air commands → double jump |

## Operations, slots and warnings

| Slot (max 1 each) | Operations | Notes |
|---|---|---|
| mobile | Hunter Duet, Velocipod Intercept | Duet: 2 Drones take high / low stations re-sampled every 30 f; shots at 40 / 68 / 96 / 124 / 152 / 180 f, each committed straight (no homing), skipped while Syndrome is in hitstun. Velocipod: 26 f reticle warning at the captured point, then a fixed diagonal pass. |
| spin | Spin Cycle | rolls out 270 px (raw 60), holds 8 f, returns (raw 50) |
| turret | gun / missile / mortar | emerges 70 px ahead; 3 opponent hits destroy it; life 360 f; auto-faces the nearest foe; missiles mark their drop point 48 f ahead; mortar shells lob then roll 34 f |
| omni | Hammerfall, Rising Interception, Sweep | floor warnings 40 / 26 / 18 f; Hammerfall targets the foe within 70–330 px ahead (captured once) |

A command whose slot is occupied is **rejected before anything is spent** (no energy, no cooldown). Normals never need a
slot, so a deployed machine can never block Light / Heavy / Up-Attack / air commands. KO, round reset, rematch,
training reset and identity change remove every machine and volume.

## Passive and system mechanics

- **Convergence** — while a Hunter Duet is out, a clean Spinner hit (Snap, Pass, Low Skim or Spin Cycle) on the Duet's
  target re-times the Duet's REMAINING shots into one crossing pass (10 f later, pairs 8 f apart).
  No extra shots, no extra damage; once per Duet.
- **Zero-Point Hold** — L2 + Special: 12 f, raw 20; a clean hit holds the target in place for its
  hitstun (≤ 44 f) so a follow-up can connect. Once per combo (re-armed when the foe recovers).
- **Double jump** — the shared one (maxJumps 2). No command refunds a jump and nothing hovers; Leg Drop caps the fall
  speed at 2 px/f only during its 8 active frames while the leg descends (it still falls).

## Ultimate — OPERATION KRONOS: FINAL DEMONSTRATION (100 Power)

Opener: 16 f theatrical gesture + Zero-Point capture (raw 30, 40 f recovery on whiff / block).
From Claw Drive or Spinner Pass on a clean hit. A blocked or whiffed opener never starts the cinematic.

Clean capture → the shared FROZEN-CINEMATIC contract (combat, physics and input freeze; 260 frames):

| Stage | Frames | What | Raw |
|---|---|---|---|
| A — rise | 0–40 | cut-in "OPERATION KRONOS / FINAL DEMONSTRATION"; the shell rises behind the captive, eye opens | — |
| B — orchestra | 44–108 | Drones cross (50, 62), Spinner orbit (76), Velocipod pass (88), turret volley (100) | 15 + 15 + 20 + 25 + 15 = 90 |
| C — lift | 110–146 | a claw lifts the captive from below (124) | 40 |
| D — pin | 136–196 | `legSlam` pins from above (146) | 30 |
| E — slam | 196–260 | the slam (196), shell fragments, settle pose, retract | 230 |

Total 30 + 90 + 70 + 230 = **420 raw**, each contact through the shared damage choke-point with the combo scale captured
at the capture. The caster's live Drones / Spinner / Velocipod / Omnidroid action are dismissed at the capture so no
live machine can add damage; a deployed turret stays frozen with the world. Afterwards the foe is knocked down and
Syndrome takes 12 f of cooldown.

## Intro and victory

Intro: front idle + grin + laugh frames, a Drone descends, a gun turret emerges, the Omnidroid shell and eye reveal behind
him; name card "SYNDROME — THE CONDUCTOR" with the original line "Begin the demonstration." (no film dialogue, no voice).
Presentation only — skippable, no gameplay effect. Victory: laugh loop with a hovering Drone, a Bomber and an open
Spinner. Defeat: the turned recoil frames (honest reuse — see SPRITE_MAP.md).
