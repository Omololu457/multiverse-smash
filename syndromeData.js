// SYNDROME (syndrome, The Incredibles) — DATA ONLY: frame data, machine budgets, operation schedules, the ultimate
// schedule and the roster entry. Logic: syndromeState.js (sim), syndrome.js (command layer), syndromeFx.js (render,
// composite Omnidroid). Art: the six supplied GBA sheets (Syndrome / Drone / Spinner / Turrets / Velocipod /
// Omnidroid 10), extracted by tools/syndrome/extract.py — docs/syndrome/SPRITE_MAP.md, OMNIDROID_ASSEMBLY.md.
// THE CONDUCTOR: the player controls Syndrome only. His supplied gestures issue commands; machines perform the
// attacks. Never a pet-control interface, never a playable machine.
import { SYNDROME_ANIM } from './syndromeSprites.js'

// Stored damage = authored raw (the roster's convention: Goku light/heavy are stored 45/85). Live health loss is the
// shared formula floor(stored × comboScale × 0.6) — docs/syndrome/DAMAGE_AUDIT.md. No roster-parity multiplier.
export const SYNDROME_DAMAGE_SCALE = 1
export const dmg = raw => Math.round(raw * SYNDROME_DAMAGE_SCALE)
export const SYNDROME_SCALE = 2          // integer nearest-neighbour presentation (68 px GBA body → 136 px)
export const MACHINE_SCALE = 2           // every machine / Omnidroid component uses the same factor (no stretching)

export const COST = { duet: 25, spin: 18, velo: 25, turret: 30, hammer: 30, rise: 25, sweep: 25, zero: 20, ult: 100 }

// ── normal-command boxes are measured from the body FRONT (bx0..bx1) and from the FLOOR (fy = top above floor, fh)
// so they sit exactly where the machine is drawn (syndromeFx follows the same numbers).
const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 60, rangeY: 50, knockbackX: 3, knockbackY: -2, ...extra })

// ── MOVES (60 sim ticks / s). startup = frames before the first active frame. ──
export const SYNDROME_MOVES = {
  // Square chain: short gesture → Spinner snap / Drone crossing / Spinner outward pass (clean-hit retaps only)
  light: n(45, 5, 3, 11, { box: [6, 78, 92, 46], machine: 'spinSnap' }),
  sL2: n(45, 6, 3, 12, { hitstun: 18, blockstun: 10, box: [4, 96, 104, 40], machine: 'droneCross' }),
  sL3: n(65, 8, 4, 18, { hitstun: 22, blockstun: 12, knockbackX: 8, knockbackY: -4, box: [8, 124, 92, 50], machine: 'spinPass' }),
  sLow: n(42, 7, 3, 13, { hitLevel: 'low', hitstun: 18, blockstun: 10, box: [4, 92, 30, 30], machine: 'spinLow' }),
  // Triangle: raised command gesture → an Omnidroid claw drives into the nearby lane
  heavy: n(95, 14, 4, 22, { category: 'heavy', hitstun: 26, blockstun: 14, knockbackX: 8, knockbackY: -3, box: [44, 150, 80, 80], machine: 'clawDrive' }),
  // Up + Triangle: a claw rises from a visible rear/side point in front of Syndrome — launches
  sLaunch: n(75, 12, 4, 20, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 12, launchVy: -19, box: [14, 86, 150, 150], machine: 'clawRise' }),
  // air Square: a Drone intercepts at Syndrome's forward side
  air: n(65, 6, 4, 13, { air: true, hitstun: 20, knockbackX: 4, knockbackY: -3, box: [-6, 84, 104, 120], airY: 34, machine: 'droneAir' }),   // strafe sweeps forward-DOWN (to 36 px below the feet) so a fast launcher jump-cancel still meets the rising foe
  // air Down + Triangle: an Omnidroid limb descends along a visible path from above (box follows the claw)
  sDownAir: n(85, 12, 8, 18, { category: 'heavy', air: true, hitstun: 26, blockstun: 12, knockbackX: 3, knockbackY: 8, box: [-10, 74, 0, 0], machine: 'legDrop' }),
  // ── specials: command gestures (no body box — the machine's own volume hits) ──
  sDuet: n(0, 10, 1, 14, { category: 'special', isSpecial: true, noBody: true, cost: COST.duet, releaseAt: 10, op: 'duet' }),
  sSpin: n(0, 9, 1, 15, { category: 'special', isSpecial: true, noBody: true, cost: COST.spin, releaseAt: 9, op: 'spin' }),
  sVelo: n(0, 12, 1, 16, { category: 'special', isSpecial: true, noBody: true, cost: COST.velo, releaseAt: 12, op: 'velo' }),
  sTurret: n(0, 14, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: COST.turret, releaseAt: 14, op: 'turret', family: 'gun' }),
  sTurretMs: n(0, 14, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: COST.turret, releaseAt: 14, op: 'turret', family: 'missile' }),
  sTurretMortar: n(0, 14, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: COST.turret, releaseAt: 14, op: 'turret', family: 'mortar' }),
  sHammer: n(0, 12, 1, 40, { category: 'special', isSpecial: true, noBody: true, cost: COST.hammer, releaseAt: 12, op: 'hammer' }),
  sRise: n(0, 12, 1, 30, { category: 'special', isSpecial: true, noBody: true, cost: COST.rise, releaseAt: 12, op: 'rise' }),
  sSweep: n(0, 12, 1, 34, { category: 'special', isSpecial: true, noBody: true, cost: COST.sweep, releaseAt: 12, op: 'sweep' }),
  // L2 + neutral R1: Zero-Point Hold — glove-anchored short capture (blockable, one per combo)
  sZero: n(20, 12, 4, 20, { category: 'special', isSpecial: true, cost: COST.zero, hitstun: 44, blockstun: 12, knockbackX: 0, knockbackY: 0, box: [0, 110, 104, 56], zero: true }),
  // R2 ULTIMATE opener: the theatrical gesture + a short Zero-Point capture. Clean hit only → cinematic.
  ultOpen: n(30, 16, 4, 40, { category: 'ultimate', isUltimate: true, cost: COST.ult, hitstun: 60, blockstun: 14, knockbackX: 0, knockbackY: 0, box: [0, 150, 110, 60], zero: true }),
}
export const CHAIN = { light: 'sL2', sL2: 'sL3' }
export const HEAVY_FROM = ['light', 'sL2', 'sLow']
export const SPECIAL_FROM = ['light', 'sL2', 'sL3', 'sLow', 'heavy', 'sLaunch']
export const ULT_FROM = ['heavy', 'sL3']
export const NORMAL_KEYS = ['light', 'sL2', 'sL3', 'sLow', 'heavy', 'sLaunch', 'air', 'sDownAir']
// Machine that performs each normal (convergence reads the Spinner family)
export const SPINNER_NORMALS = ['light', 'sL3', 'sLow']

// ── OPERATIONS (sim px / frames). Every budget is a TOTAL per deployment. ──
// Hunter Duet: two Drones (high + low) for `life` frames. Six staggered shots, each COMMITS its direction at release
// (target position sampled on that tick, straight flight, no homing). 6 × 25 = 150.
export const DUET = { life: 240, shots: [40, 68, 96, 124, 152, 180], raw: 25, speed: 10, hitstun: 14, kbx: 3, kby: -2, shotLife: 50, w: 22, h: 14,
  highY: 230, lowY: 92, side: 120, retarget: 30, ease: 0.12, fade: 18 }
// Convergence: a Spinner's clean hit on the Duet's target reschedules the REMAINING shots into a crossing pass
// (both drones, two volleys 8 f apart). Same shots consumed, same damage, same expiry. Once per deployment.
export const CONVERGE = { delay: 10, gap: 8 }
// Spin Cycle: outbound one hit (60) then ONE return pass (50) — 110 total.
export const SPIN = { out: 26, hold: 8, back: 24, reach: 270, rawOut: 60, rawBack: 50, w: 56, h: 52, hitstun: 20, kbx: 6, kby: -3, open: 8 }
// Velocipod: telegraph at the CAPTURED target point, one committed diagonal pass (150), disengage.
export const VELO = { warn: 26, pass: 22, exit: 30, raw: 150, w: 120, h: 70, hitstun: 32, kbx: 12, kby: -10, startDX: 420, startDY: 300, endDX: 380, endDY: 140 }
// Turrets (one slot; a second deploy is REJECTED before anything is spent). Shared deploy timing; three families.
export const TURRET = { ahead: 70, emerge: 30, life: 360, retract: 24, hp: 3, range: 640, w: 64, h: 70, hitLockout: 12,
  gun: { shots: 9, every: 24, first: 40, raw: 20, speed: 11, hitstun: 12, kbx: 2, kby: -1, w: 18, h: 12, life: 70 },
  missile: { shots: 3, every: 60, first: 54, raw: 60, rise: 26, fall: 22, hitstun: 26, kbx: 4, kby: -6, w: 40, h: 54, warn: 22 },
  mortar: { shots: 4, every: 50, first: 48, raw: 45, vx: 6.5, vy: -11, g: 0.55, roll: 34, rollVx: 5, hitstun: 22, kbx: 5, kby: -3, w: 34, h: 34, life: 110 } }
// Omnidroid specials (one active Omnidroid action per Syndrome). Captured point → warning → contact → retract.
export const HAMMER = { range: 330, minAhead: 70, warn: 40, active: 4, life: 92, raw: 170, w: 156, h: 90, hitstun: 34, kbx: 4, kby: -12 }
export const RISE = { range: 300, minAhead: 60, warn: 26, active: 5, life: 70, raw: 130, w: 70, h: 190, hitstun: 32, kbx: 2, kby: -20 }
export const SWEEP = { from: -60, to: 360, warn: 18, active: 18, life: 66, raw: 120, w: 120, h: 44, hitstun: 30, kbx: 9, kby: -6 }
// Zero-Point Hold: a capture holds the target in place for the move's hitstun (scaled by the shared combo hitstun
// curve); once per combo; never refreshed while the target is held.
export const ZERO = { hold: 44, lift: 10 }
// Owner policy: scheduled machine shots that come due while Syndrome is in hitstun / grabbed are CONSUMED (skipped),
// never delayed into a free combo breaker. Committed Omnidroid strikes past their warning still land.

// ── ULTIMATE: OPERATION KRONOS — FINAL DEMONSTRATION (frames after the opener's clean capture; freeze contract) ──
// Cinematic rebuild 2026-11-23. Timeline frames below; HIT-STOP (`stop`, held frames on a contact) and SLOW-MOTION
// (`slow`: the timeline advances every 2nd tick) are added on top, so the cinematic lasts ~350 ticks.
//   0–55    A  THE MONOLOGUE: letterbox + title card, camera pushes in on Syndrome, Zero-Point field holds the
//              captive; a shadow grows, the Omnidroid DROPS from the sky and lands behind the captive @46
//  56–127   B  THE MACHINE ORCHESTRA (90): Drone strafes @62/@72, Spinner @86, Velocipod streak @100, turret volley @114
// 128–195   C  THE CLAWS (70): ground cracks glow, a claw ERUPTS and lifts @142 (40); the Omnidroid's limb pins @166 (30)
// 196–257   D  FINAL DEMONSTRATION (230): pull-out, the Omnidroid leaps, eye charges, slow-motion — its leg drives the
//              captive out of the claw and into the stage: the SLAM @236
// 258–299   E  aftermath: dust, the Omnidroid lifts away, smug Syndrome, control returns
// Opener 30 + 90 + 70 + 230 = 420 raw (stored, unchanged), scaled once by the combo scale captured at the capture.
export const ULT = { total: 300, settle: 258, cutIn: 34, land: 46, cracks: 128, finisher: 196, leap: 204, slamAt: 236,
  slow: { from: 208, to: 234 },
  contacts: [{ at: 62, raw: 15, kind: 'drone', stop: 2, shake: 4 }, { at: 72, raw: 15, kind: 'drone', stop: 2, shake: 4 },
    { at: 86, raw: 20, kind: 'spinner', stop: 3, shake: 6 }, { at: 100, raw: 25, kind: 'velo', stop: 4, shake: 8 },
    { at: 114, raw: 15, kind: 'turret', stop: 3, shake: 6 }, { at: 142, raw: 40, kind: 'lift', stop: 7, shake: 12 },
    { at: 166, raw: 30, kind: 'pin', stop: 6, shake: 11 }, { at: 236, raw: 230, kind: 'slam', stop: 16, shake: 18 }],
  beats: [{ from: 0, pose: 'ultPose' }, { from: 56, pose: 'ultFront' }, { from: 128, pose: 'ultPose' }, { from: 258, pose: 'introSettle' }] }

// ── body frame timelines (elapsed tick → strip frame) ──
const even = (n, total) => Array.from({ length: n }, (_, i) => [Math.round(i * total / n), i])
export const TIMELINE = {
  light: [[0, 0], [2, 1], [4, 2], [8, 3]],
  sL2: [[0, 0], [3, 1], [6, 2]],
  sL3: [[0, 0], [3, 1], [6, 2], [12, 3]],
  sLow: [[0, 0], [4, 1], [9, 2]],
  heavy: [[0, 0], [4, 1], [8, 2], [13, 3], [24, 4]],
  sLaunch: [[0, 0], [4, 1], [8, 2], [12, 3], [22, 4]],
  air: [[0, 0], [3, 1], [6, 2], [12, 3]],
  sDownAir: [[0, 0], [5, 1], [12, 2]],
  sDuet: even(6, 22), sSpin: [[0, 0], [3, 1], [6, 2], [9, 3]], sVelo: even(6, 26), sTurret: even(6, 30), sTurretMs: even(6, 30), sTurretMortar: even(6, 30),
  sHammer: [[0, 0], [4, 1], [8, 2], [12, 3], [40, 4]], sRise: [[0, 0], [4, 1], [8, 2], [12, 3], [30, 4]], sSweep: [[0, 0], [4, 1], [8, 2], [12, 3], [32, 4]],
  sZero: [[0, 0], [4, 1], [8, 2], [12, 3], [24, 2]],
  ultOpen: [[0, 0], [4, 1], [8, 2], [16, 3], [30, 4], [42, 5], [52, 6]],
}
// strip used by each move (several moves share one supplied gesture strip — docs/syndrome/SPRITE_MAP.md "reuse")
export const MOVE_STRIP = { light: 'cmdLight', sL2: 'cmdLight2', sL3: 'cmdLight', sLow: 'cmdLow', heavy: 'cmdHeavy', sLaunch: 'cmdHeavy',
  air: 'cmdAir', sDownAir: 'cmdDown', sDuet: 'cmdDeploy', sSpin: 'cmdLight', sVelo: 'cmdDeploy', sTurret: 'cmdDeploy', sTurretMs: 'cmdDeploy',
  sTurretMortar: 'cmdDeploy', sHammer: 'cmdHeavy', sRise: 'cmdHeavy', sSweep: 'cmdHeavy', sZero: 'cmdGrab', ultOpen: 'cmdUlt' }

export const syndrome = {
  rosterKey: 'syndrome', name: 'Syndrome', displayName: 'Syndrome', universe: 'the_incredibles',
  color: '#2a2a33', series: 'The Incredibles', era: 'Supplied GBA "The Incredibles" sheets (Syndrome, Drone, Spinner, Turrets, Velocipod, Omnidroid 10)',
  tagline: 'Begin the demonstration.', introTitle: 'SYNDROME — THE CONDUCTOR', archetype: 'Arsenal Conductor / Zoner-Pressure',
  bio: 'Buddy Pine, now Syndrome: a genius inventor with no powers of his own who fights with an arsenal of his machines. In this game he conducts — every gesture is a command, and Drones, Spinners, Turrets, the Velocipod and the giant Omnidroid perform the attacks. Zero-Point Hold, Convergence and the composite Omnidroid staging are fighting-game adaptations of the supplied sprites.',
  primary: 'zoner', secondary: ['all-rounder', 'setplay'], archetypes: ['zoner', 'all-rounder', 'setplay'],
  traits: { hasEnergy: true, energyType: 'tech', energyName: 'Power', mobility: 'medium', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Power', color: '#5fd0ff' },
  // speed 92 (< the 98 teleport tier → an ordinary double-tap dash). maxJumps 2 = the SHARED double jump.
  stats: { maxHealth: 1180, maxEnergy: 100, attack: 82, defense: 70, speed: 92, jumpPower: 25, maxJumps: 2, weight: 1,
    dashSpeed: 19, dashDuration: 10, dashCooldownMax: 26 },
  hasSprites: true, spriteScale: SYNDROME_SCALE, spriteSheet: SYNDROME_ANIM.idle.sheet, portrait: './assets/syndrome/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequencePool: [['intro', 'introSettle']],
  basic_attacks: { light: SYNDROME_MOVES.light, heavy: SYNDROME_MOVES.heavy, crouchLight: SYNDROME_MOVES.sLow, upAttack: SYNDROME_MOVES.sLaunch,
    airAttack: SYNDROME_MOVES.air, downAir: SYNDROME_MOVES.sDownAir,
    grab: { damage: dmg(45), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 10, throwForceY: -5, damageType: 'grab' } },
  specials: { neutral: { name: 'Hunter Duet', cost: COST.duet }, forward: { name: 'Spin Cycle', cost: COST.spin }, up: { name: 'Velocipod Intercept', cost: COST.velo },
    down: { name: 'Deploy Turret', cost: COST.turret }, back: { name: 'Omnidroid: Hammerfall', cost: COST.hammer } },
  ultimate: { name: 'OPERATION KRONOS: FINAL DEMONSTRATION', cost: COST.ult,
    description: 'Theatrical gesture + Zero-Point capture (raw 30). Clean capture: the Omnidroid rises, the machine orchestra plays (90), two giant claws lift and pin (70), the slam (230) — 420 raw. Block / whiff: no capture, real recovery.' },
  animationData: {
    ...SYNDROME_ANIM,
    ...Object.fromEntries(Object.entries(MOVE_STRIP).map(([k, s]) => [k, { ...SYNDROME_ANIM[s], frameTimeline: TIMELINE[k] }])),
    ultPose: { ...SYNDROME_ANIM.cmdUlt, frameTimeline: [[0, 1], [6, 2], [14, 3], [30, 4]] },
    ultFront: { ...SYNDROME_ANIM.ultFront, frameTimeline: even(11, 66) },
  },
}
