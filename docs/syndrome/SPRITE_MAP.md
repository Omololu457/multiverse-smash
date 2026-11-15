# Syndrome — sprite map

Every pixel comes from the six supplied sheets in `syndrome/` (preserved byte-identical in `assets/syndrome/source/`).
Nothing was guessed from a grid: every frame was located by connected-component segmentation inside an explicit band
(or an explicit fixed / column rectangle where segmentation merges neighbours), inspected on enlarged contact sheets
(`docs/syndrome/contact_*.png`) and recorded with its exact source rectangle in `docs/syndrome/source_rects.json`.
Extraction: `python3 tools/syndrome/extract.py` (hash-checks every source first).

## Sources and backgrounds

| Sheet | File | SHA-256 | Background removed (exact key, per sheet) |
|---|---|---|---|
| Syndrome | `Game Boy Advance - The Incredibles - Non-Playable Characters - Syndrome.png` | `b74fc2d934679353…` | (173, 82, 173) lilac |
| Drone | `Game Boy Advance - The Incredibles - Enemies & Bosses - Drone.png` | `252abdc37338f836…` | (255, 0, 255) magenta |
| Spinner | `Game Boy Advance - The Incredibles - Enemies & Bosses - Spinner.png` | `6b5c11ea2a696fa2…` | (255, 0, 255) magenta |
| Turrets | `Game Boy Advance - The Incredibles - Enemies & Bosses - Turrets.png` | `9aca0938c1451338…` | (255, 0, 255) magenta |
| Velocipod | `Game Boy Advance - The Incredibles - Enemies & Bosses - Velocipod.png` | `dc8667b9c70ba2e9…` | (255, 0, 255) magenta |
| Omnidroid 10 | `Game Boy Advance - The Incredibles - Enemies & Bosses - Omnidroid 10.png` | `41be51e829aa5baf…` | (255, 0, 255) magenta |

Each sheet's own background colour is keyed out independently (exact RGB match — the GBA art is indexed, so no
antialias fringe exists to decontaminate). Integer nearest-neighbour scaling only (Syndrome ×2, every machine ×2).

## Excluded from extraction

- UI portraits / face icons, oval health bars and the green digit glyphs printed on the Drone, Turrets, Velocipod and
  Omnidroid sheets (outside every extraction band).
- The duplicate second explosion set and the duplicate missile-turret emergence row (the gun-turret emergence `gunEmerge`
  is reused for every turret family).
- No sheet label, credit text or watermark pixel is used.

## Syndrome body (sheet rows inspected at source resolution)

| Row | y-range | Content |
|---|---|---|
| A | 0–68 | 4 side hover / ready poses (fist forward, cape streaming; face LEFT → mirrored) |
| B | 72–143 | 20 front-facing idle / expression loop (hands on hips) |
| C | 147–215 | 4 front-facing grin variations |
| D | 222–294 | 4 front-facing laugh variations |
| E | 294–354 | E0–2 raised-arm turned gestures, E3 arms-crossed upright turn, E4–9 hunched remote steps (mirrored) |
| F | 357–416 | 4 lower running strides (mirrored) |

All 31 body strips share ONE 75×70 cell with the feet origin at (27, 69), so swapping strips never shifts the body.

| Strip | Frames (row, index) | ticks/frame | loop | note |
|---|---|---|---|---|
| `idle` | A0 A1 A2 A3 A2 A1 | 8 | True |  |
| `idleFront` | B0 B1 B2 B3 B4 B5 B6 B7 B8 B9 B10 B11 B12 B13 B14 B15 B16 B17 B18 B19 | 7 | True |  |
| `walk` | E4 E5 E6 E7 E8 E9 | 6 | True |  |
| `walk_back` | E9 E8 E7 E6 E5 E4 | 6 | True |  |
| `run` | F0 F1 F2 F3 | 5 | True |  |
| `dash` | F1 F2 | 4 | True |  |
| `jump` | A1 A2 | 6 | False |  |
| `doubleJump` | A2 A3 A0 | 4 | False |  |
| `fall` | A3 A2 | 8 | True |  |
| `land` | E3 | 6 | False |  |
| `crouch` | E9 | 8 | False |  |
| `guard` | E3 | 8 | False |  |
| `taunt` | C0 C1 C2 C3 C2 C1 | 7 | True |  |
| `hurt` | E0 E1 | 6 | False |  |
| `hurt_air` | E1 E2 | 6 | False |  |
| `knockdown` | E2 | 8 | False |  |
| `getup` | E3 A0 | 8 | False |  |
| `win` | D0 D1 D2 D3 D2 D1 C0 C1 | 7 | True |  |
| `lose` | E2 E1 E0 | 10 | False |  |
| `intro` | B0 B1 B2 B3 B4 B5 B6 B7 C0 C1 C2 C3 D0 D1 D2 D3 | 6 | False |  |
| `introSettle` | E3 A0 | 8 | False | command gestures (attack strips; frameTimeline in syndromeData.js) |
| `cmdLight` | E3 A0 A1 A2 | 3 | False | arms-crossed → fist forward (short command) |
| `cmdLight2` | A1 E3 A0 | 3 | False |  |
| `cmdHeavy` | E3 E0 E1 E2 E1 | 4 | False | raised-arm turned gesture (large command) |
| `cmdLow` | E9 E8 E9 | 4 | False | hunched remote press |
| `cmdAir` | A0 A1 A2 A3 | 3 | False |  |
| `cmdDown` | E1 E2 E1 | 4 | False |  |
| `cmdDeploy` | E4 E5 E6 E7 E8 E9 | 4 | False | remote / command presentation |
| `cmdGrab` | A0 A1 E3 | 4 | False |  |
| `cmdUlt` | E3 E0 E1 E2 E2 E1 E0 | 5 | False | extended theatrical gesture |
| `ultFront` | D0 D1 D2 D3 D2 D1 D0 C0 C1 C2 C3 | 6 | False |  |

### Honest fallbacks (no fabricated art)

- The GBA Syndrome sheet has **no** walk cycle, hurt, knockdown, crouch, guard or get-up frames. `walk` reuses the hunched
  remote steps E4–9, `hurt` = E0–1, `knockdown` = E2 (a held recoil pose — the engine lays the fighter flat; no lying sprite
  exists), `crouch` = E9, `guard` / `land` = E3, `lose` = E2,1,0. These are documented reuses of supplied poses, not new art.
- `portrait.png` = row C0 (grin), top 40 rows.

## Machines (92 strips)

| Strip | Sheet | Frames | Mirrored | Anchor | Content |
|---|---|---|---|---|---|
| `droneHover` | Drone | 6 | True | center | gun drone hover (rotor cycle) |
| `droneHoverLow` | Drone | 6 | True | center | gun drone hover, barrel lowered |
| `droneBank` | Drone | 7 | True | center | gun drone banking turn |
| `droneTilt` | Drone | 4 | True | center | gun drone tilt / climb |
| `droneTurn` | Drone | 4 | True | center | side → front-facing → side orientation turn |
| `droneFire` | Drone | 2 | True | center | diagonal shot + recoil (muzzle flash) |
| `droneFireLevel` | Drone | 2 | True | center | level shot + recoil |
| `droneSway` | Drone | 4 | True | center | gun drone sway / brake |
| `droneHit` | Drone | 3 | True | center | damaged (sparks) |
| `droneWreck` | Drone | 1 | True | center | destroyed hull frame |
| `droneShot` | Drone | 3 | True | center | gun drone tracer pieces |
| `boomOval` | Drone | 1 | False | center | explosion flash (ground oval) |
| `boomBall` | Drone | 1 | False | center | explosion flash (ball) |
| `boomRing` | Drone | 7 | False | center | expanding smoke ring (7) |
| `bomberHover` | Drone | 6 | True | center | bomber drone hover |
| `bomberTilt` | Drone | 2 | True | center | bomber tilt |
| `bomberBank` | Drone | 4 | True | center | bomber banking |
| `bomberDrop` | Drone | 8 | True | center | bomber payload release (8) |
| `bomberTurn` | Drone | 4 | True | center | bomber orientation turn (front view) |
| `bomberHit` | Drone | 3 | True | center | bomber damaged (sparks) |
| `bomberWreck` | Drone | 1 | True | center | bomber destroyed hull |
| `bomb` | Drone | 6 | False | center | bomber payload pieces (6) |
| `puffWhite` | Drone | 1 | False | center | small flash |
| `puffGray` | Drone | 1 | False | center | small dark flash |
| `puff` | Drone | 12 | False | center | smoke puff dissipation |
| `hatchDrone` | Drone | 3 | True | center | hatch drone (top hatch opening) |
| `hatchFire` | Drone | 2 | True | center | hatch drone launch |
| `microMissile` | Drone | 2 | False | center | hatch micro-missiles |
| `spOpen` | Spinner | 13 | False | feet | closed orb → cap rises (13) |
| `spSpin` | Spinner | 6 | False | feet | blades out, spinning (6) |
| `spBlur` | Spinner | 2 | False | feet | full-speed spin blur (2) |
| `spClose` | Spinner | 18 | False | feet | blades fold → cap closes (18) |
| `spTilt` | Spinner | 3 | False | feet | tilted contact states (3) |
| `spBoom` | Spinner | 14 | False | center | destruction flash + smoke |
| `gunEmerge` | Turrets | 10 | True | feet | emergence from the floor (10) |
| `gunOpen` | Turrets | 8 | True | feet | cap opens, gun deploys (8) |
| `gunRotate` | Turrets | 8 | True | feet | gun rotation / aim sweep (8) |
| `gunFire` | Turrets | 4 | True | feet | firing forward (4) |
| `gunFireDiag` | Turrets | 4 | True | feet | firing diagonal-forward (4) |
| `gunFireFront` | Turrets | 4 | True | feet | firing toward camera (4) |
| `gunFireUp` | Turrets | 4 | True | feet | firing high diagonal (4) |
| `gunFireBack` | Turrets | 4 | True | feet | firing backward (4) |
| `gunRetract1` | Turrets | 4 | True | feet | gun idle / aim hold A (4) |
| `gunRetract2` | Turrets | 4 | True | feet | gun idle / aim hold B (4) |
| `gunRetract3` | Turrets | 4 | True | feet | gun idle / aim hold C (4) |
| `turretFlash` | Turrets | 1 | False | feet | destruction flash |
| `turretSmoke` | Turrets | 7 | False | center | destruction smoke (7) |
| `turretBroken` | Turrets | 13 | False | feet | broken base, smouldering (13) |
| `msOpen` | Turrets | 6 | False | feet | missile hatch opening (6) |
| `msRaise` | Turrets | 11 | False | feet | missile raised into launch position (11) |
| `msLaunch` | Turrets | 4 | False | feet | launch with exhaust (4) |
| `missile` | Turrets | 2 | False | center | missile in flight (2) |
| `mortarOpen` | Turrets | 10 | True | feet | mortar dome emerges / turns (10) |
| `mortarFire` | Turrets | 4 | True | feet | mortar fire A (4) |
| `mortarFire2` | Turrets | 4 | True | feet | mortar fire B — recoil + flash (4) |
| `mortarFire3` | Turrets | 4 | True | feet | mortar fire C (4) |
| `shell` | Turrets | 3 | True | center | heavy shell tumbling (3) |
| `shellSplat` | Turrets | 11 | True | feet | shell burst → dissolve (11) |
| `shellSpin` | Turrets | 15 | False | center | shell spinning edge-on (15) |
| `vpFront` | Velocipod | 4 | False | center | front-view rotation (4) |
| `vpShot` | Velocipod | 3 | True | center | Velocipod shot pieces (3) |
| `vpSide` | Velocipod | 5 | True | center | side flight (5) |
| `vpSide2` | Velocipod | 5 | True | center | side flight, nose down (5) |
| `vpBank` | Velocipod | 4 | True | center | banking flight (4) |
| `vpFront2` | Velocipod | 3 | False | center | front-view, upright (3) |
| `vpLean` | Velocipod | 4 | True | center | tilted lean flight (4) |
| `vpRider` | Velocipod | 3 | True | center | rider action states (3) |
| `vpCrash` | Velocipod | 4 | True | center | crash tumble (4) |
| `vpBurst` | Velocipod | 2 | False | center | crash burst (2) |
| `shellLower` | Omnidroid 10 | 1 | False | rect | lower shell hemisphere (flat equator on top) |
| `shellUpper` | Omnidroid 10 | 1 | False | rect | upper dome with sensor knobs (flat equator below) |
| `eyeOpen` | Omnidroid 10 | 5 | False | center | eye slit opening (5) |
| `eyeTrack` | Omnidroid 10 | 4 | False | center | eye glint tracking (4) |
| `eyeEmitter` | Omnidroid 10 | 5 | False | center | eye with side emitter deployed (5) |
| `eyeFire` | Omnidroid 10 | 6 | False | center | emitter firing / recoil (6) |
| `limbDiag` | Omnidroid 10 | 9 | False | attach | diagonal limb slam: reach → impact → claw (9) |
| `leg` | Omnidroid 10 | 7 | False | attach | vertical leg planting / lifting (7) |
| `legSlam` | Omnidroid 10 | 8 | False | attach | vertical limb stomp sequence (8) |
| `claw` | Omnidroid 10 | 10 | False | attach | claw opening / closing (10) |
| `clawCharge` | Omnidroid 10 | 4 | False | attach | claw with energy discharge (4) |
| `laserArm` | Omnidroid 10 | 8 | False | attach | segmented arm extension lengths (8) |
| `cannonHead` | Omnidroid 10 | 5 | False | center | arm head: straight / firing / diagonal / vertical (5) |
| `shaftJoint` | Omnidroid 10 | 1 | False | center | diagonal shaft end / joint |
| `fragment` | Omnidroid 10 | 8 | False | center | shell fragments (8) |
| `omniMissile` | Omnidroid 10 | 2 | False | center | Omnidroid missiles (2) |
| `omniBallW` | Omnidroid 10 | 1 | False | center | white flash |
| `omniBallG` | Omnidroid 10 | 1 | False | center | dark flash |
| `omniPuff` | Omnidroid 10 | 11 | False | center | smoke dissipation |
| `cyanMissile` | Omnidroid 10 | 2 | False | center | energy missiles (white / cyan) |
| `crystal` | Omnidroid 10 | 9 | False | center | energy crystal shards (9) |
| `cyanBall` | Omnidroid 10 | 1 | False | center | energy flash |
| `cyanPuff` | Omnidroid 10 | 9 | False | center | energy burst dissipation |

Anchors: `feet` = bottom-centre on the floor, `center` = visual centre, `attach` = the socket end of a limb (its
per-frame `tips[]` record where the claw / foot lands — the hit point), `rect` = top-left (shell halves).
The Omnidroid is assembled from these components at runtime — see `OMNIDROID_ASSEMBLY.md`.
