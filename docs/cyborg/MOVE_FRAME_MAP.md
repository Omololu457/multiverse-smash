# Cyborg — move → frame map

Every move's authored frame data (cyborgData.js `CYBORG_MOVES`, `n(raw, startup, active, recovery)`) and the strip it plays.
Stored damage is round(raw × 1.7), the same roster-parity lever the Rangers use.
Frame data was measured by harness/cyborg.test.mjs. Results are in `mechanics_results.json → moves`.
Strip cell names are listed in SPRITE_LEDGER.md.

## Normals

| Move | Input | Strip (frames) | Startup | Active | Recovery | Raw → stored | Notes |
|---|---|---|---|---|---|---|---|
| J1 Servo Jab | Light | `light` (3) p1·1,2,1 | 6 | 2 | 10 | 22 → 37 | Hitstun 18. |
| J2 Piston Straight | fresh Light after a clean J1 | `cJ2` (6) Punch 2 | 8 | 2 | 12 | 28 → 48 | |
| J3 Shoulder Finish | fresh Light after a clean J2 | `cJ3` (6) p1·3-7,9 | 11 | 3 | 18 | 36 → 61 | Three stages maximum. |
| Hydraulic Cross (Heavy) | Heavy | `heavy` (9) Punch 1 complete | 16 | 3 | 24 | 66 → 112 | |
| Low Drive | Down + Light / Down + Heavy | `cLow` (3) land3, land4, mp3 | 9 | 2 | 16 | 28 → 48 | Hits low. |
| Rising Piston (launcher) | Up + Heavy / Up-Attack | `up` (4) land4 + ap1,5,6 | 13 | 3 | 22 | 46 → 78 | launchVy −21. |
| Air Hammer | Air Light / Air Heavy (also air Down + Light) | `air` (7) Aerial Punch | 9 | 3 | 16 | 36 → 61 | |
| Advancing punch | Forward + Heavy | `cAdv` (5) run3,4 + p2·2-4 | 12 | 3 | 18 | 30 → 51 | Travel stops in front of the foe. |
| Piston strike | fresh Heavy after cAdv | `cPiston` (4) p1·4-7 | 12 | 3 | 20 | 34 → 58 | |
| Knock-away | fresh Heavy after cPiston | `cKnock` (6) mp0,1 + p2·2,3,5,6 | 15 | 3 | 26 | 44 → 75 | Up + Heavy here = Rising Piston. |

## Specials

All specials cost Power. Weapon moves also cost Heat.

| Move | Input | Strip (frames) | Startup | Active | Recovery | Raw | Cost |
|---|---|---|---|---|---|---|---|
| Sonic Shot | Neutral Special (tap) | `cShot` (8) cn0-4,7-9 | 12 (spawn) | projectile | 20 | 32 | 12 Power / 12 Heat |
| Sonic Cannon | Neutral Special held ≥ 18 f (branch) | `cCannon` (10); loop cn4/cn5 | first pulse 22 | pulses at 22/28/34/40 | 16 | 4 × 14 | 5 Power / 10 Heat per pulse |
| Straight Missile | Forward + Special | `cMissile` (8) Shooting Missile | 18 (spawn) | projectile | 22 | 46 | 15 Power / 18 Heat; one active |
| Missile Rack | Up + Special | `cRack` (10); loop mr5-7 | 24 | spawns at 24, 32, 40, 48, 56 | 16 | 5 × 14 | 6 Power / 8 Heat per missile |
| Mega Punch | Down + Special | `cMega` (11) | 22 | 4 (+ shockwave) | 30 | 78 → 133 | 20 Power, no Heat |
| Mega Slam (air) | air Down + Special | `cSlamAir` (mp2) → `cSlamLand` (8) | hang + capped descent | landing 1-4 | 26 | 64 → 109 | 20 Power; once per airtime |
| Sonic Recoil | Back + Special | `cRecoil` (6) cn2-4,6-8 | 10 | 3 | 24 | 28 → 48 | 18 Power / 16 Heat; pushes self ~30 px back |
| Vent | hold Charge (grounded, neutral) | `cVent` (idle0 + steam FX) | 8 | while held | 12 on release | — | −0.75 Heat per frame; no Power |

**Rack spread.** The missiles use a fixed vy spread: −1.1, −0.45, 0.2, 0.85, 1.5 (measured). Nothing in it is random.

**Thruster reboost.** Jump while airborne plays `doubleJump` (6 frames).
- vy −19 (measured).
- Costs 8 Power.
- Allowed once per airtime.
- No hitbox.

## Ultimate — BOOYAH PROTOCOL — FULL SYSTEMS IMPACT

The opener is `cUltOpen`: strip `ultOpen` (cn0-4, 7), startup 30, active 3, recovery 60 on a miss, raw 30, 100 Power.

On a clean hit the frozen cinematic plays (`ULT` in cyborgData.js; frames counted from the confirm):

| Frames | Beat | Strip | Contact (raw) |
|---|---|---|---|
| 0-39 | Supplied bust cut-in with eye/mouth overlays | `ultOpen` hold | — |
| 40-69 | Sonic Cannon | `ultCannon` (cn4, 5) | @52: 40 |
| 70-109 | Rack loop, three missiles | `ultRack` (mr4-7) | @82, @90, @98: 20 each |
| 110-149 | Reboost → aerial punch | `ultBoost` (djump1-3) → `ultAir` (ap2-4) | @134: 40 |
| 150-209 | Full Mega Punch | `ultMega` (mp0-10) | @172: 110 |

- **Total:** 30 + 40 + 60 + 40 + 110 = **280 raw**. The measured run had 7 contacts summing to 282 raw, because the shared hit system rounds each contact.
- **Heat afterwards:** set to 60.
- **Whiff:** total measured at 93 f.

## Presentation strips

| Strip | Frames | Used for |
|---|---|---|
| `intro` | 3 | Appearing |
| `idle` | 10 | Standing |
| `walk` / `walk_back` / `run` | 14 each | Movement |
| `dash` | 4 | Dash |
| `jump` | 5 | Jump |
| `fall` | 4 | Fall |
| `land` | 9 | Landing; played for 16 f after a real landing (`_cyLand`) |
| `crouch` | 1 | Crouch |
| `guard` | 1 | Guard |
| `hurt` | 5 | Hit reaction |
| `knockdown` | 4 | Knockdown |
| `lose` | 26 | Flash → stripe dissolve |
