// Invincible — Mark Grayson (invincible) — DATA ONLY: frame data, glass-cannon numbers, flight profile, technique profiles,
// quotes, the roster entry. Logic: invincibleState.js (sim + combat hooks), invincible.js (command layer), invincibleFx.js
// (render / HUD / sound cues). Art: the JustOruma "Invincible" SWL+ sheet, sliced by tools/invincible/slice.py.
// Docs: docs/msv1/invincible/ (REUSE, FLIGHT_REFERENCE, LEDGER, COMBOS, BALANCE_NOTES).
import { INVINCIBLE_ANIM } from './invincibleSprites.js'
import { FLIGHT_PROFILES } from './flight.js'

export const INV_KEY = 'invincible'
export const isMarkGrayson = f => f?.rosterKey === INV_KEY   // for the Omni-Man build ("Think, Mark! THINK!")
// stored damage = round(raw / 0.6): the engine's global ×0.6 write scale lands the brief's number (the MSV1 lever used by
// Gojo / Sukuna (Shinjuku) and Omni-Man (Viltrumite)), so every number below is the HP a clean hit takes off
export const dmg = raw => { let k = Math.round(raw / 0.6); while (Math.floor(k * 0.6) < raw) k++; return k }   // exact: floor(k × 0.6) === raw
export const INV_SCALE = 3          // integer nearest-neighbour presentation scale (≈45 px sheet body → ≈135 px, the roster median)
export const SCREEN = 1280          // reference screen width for "% of screen" distances
export const BAR = 100              // one super bar = 100 energy

// ── GLASS CANNON ──
// HEALTH = 65 % of the roster's median max health (118 selectable fighters at the start commit, median 1150 → 747.5 → 748)
export const ROSTER_MEDIAN_HP = 1150
export const HEALTH_FRAC = 0.65
export const MAX_HP = Math.round(ROSTER_MEDIAN_HP * HEALTH_FRAC)   // 748
// WEIGHT: light — received melee knockback ×1.3, launch height ×1.15 (combat.js invKnockback hook, defender side)
export const WEIGHT = { kbx: 1.3, kby: 1.15 }
// GROUND: 1.1 × the fastest ground runner (Ryomen Sukuna (Shinjuku): speed 94 → band 8.5 × WALK_FEEL 1.15 × his ×1.5 =
// 14.66 px/f) = 16.13 px/f. His speed stat 98 gives the band's top (9.5 × 1.15 = 10.925); physics.js multiplies walk / run /
// air drift / the engine dash by f._invSpeed = 16.13 / 10.925.
export const FASTEST_RUNNER = { key: 'sukuna_shinjuku', pxf: 14.663 }
export const RUN_PXF = +(FASTEST_RUNNER.pxf * 1.1).toFixed(3)       // 16.129
export const SPEED_MUL = +(RUN_PXF / 10.925).toFixed(4)              // 1.4763

// ── FLIGHT — AGILE (FLIGHT_REFERENCE.md): the existing per-axis flight.js integrator, tuned:
//   top 0.9 × Omni-Man (Viltrumite) 57.2 = 51.5 px/f · top speed in 21 f (0.35 s) · released → stopped in 8 f ·
//   SNAP TURN (reverseBrake 0.6): reversed in 5 f from top speed (≤ 6) · unlimited flight · no profile air dash (ZIP is his dash)
export const OMNI_TOP = 57.2
export const TOP = +(OMNI_TOP * 0.9).toFixed(2)                      // 51.48
export const FLIGHT = { top: TOP, maxV: +(TOP * 36 / 44).toFixed(2), accel: +(TOP / 21).toFixed(3), drag: 0.44, reverseBrake: 0.60,
  blockMax: 0.60,                                                    // can block in flight only below 60 % of top speed
  boomAt: 0.90, boomRearm: 0.60, boomRaw: 20, boomR: 76, boomKb: 9,   // SONIC BOOM: crossing 90 % → white rings, 20-damage push
  takeoffRaw: 15, takeoffR: 70, takeoffKb: 7,                        // takeoff from the ground: the R1 shockwave, 15-damage push
  speedDmg: 0.40,                                                    // flight attacks × (1 + 0.40 × speed / top)
  passAt: 0.70,
  punchGap: 14 }                                                     // a flight punch at speed stops his body this far short of the foe                                                     // at ≥ 70 % top speed he flies through the foe (no body collision)
FLIGHT_PROFILES[INV_KEY] = {
  accel: FLIGHT.accel, maxH: TOP, maxV: FLIGHT.maxV, drag: FLIGHT.drag, reverseBrake: FLIGHT.reverseBrake,
  overspeedDrag: 0.90, ceilEaseZone: 72, dashSpeed: 0, dashFrames: 0, maxAirDash: 0, dashCost: 9999,
  energyMax: 240, drainPerFrame: 0, groundRefillPerFrame: 2, liftoff: -9,
  takeoffFrames: 6, landRecovery: 4, landRecoveryAfterAir: 8, groundedLock: 90,
  landThreshold: 70, minPoseFrames: 3, cruiseFastFrac: 0.70, descendVy: 14,
}
export const speedFrac = f => Math.min(1, Math.hypot(f.vx || 0, f.vy || 0) / TOP)
export const speedMult = frac => 1 + FLIGHT.speedDmg * Math.max(0, Math.min(1, frac))
// Charge TAP (sim clock) = take off / come down (Dseyl's reader): a press ≤ 12 frames long
export const FLIGHT_TAP = { maxHold: 12 }

// ── SPECIALS ──
// INVINCIBLE PUNCH ↓↘→ + Special: rushes 60 % of the screen in 10 frames into the R5 burst; 110 (× flight speed when launched
// from flight); WALL BOUNCE (the engine's WALL_SPLAT fields and numbers); a whiff overshoots and is −16.
export const IPUNCH = { windup: 6, rush: 10, dist: 0.60, raw: 110, w: 70, h: 70, hitstun: 40, blockstun: 16, kbx: 18, kby: -6, chip: 0.15,
  recoveryHit: 14, whiff: 16, overshoot: 90, hitstop: 10, aimUp: 260, wall: { frames: 24, hitstun: 34, bounce: 0.35, watch: 40 } }
// SKYWARD →↓↘ + Special: the uppercut carries both up with the R1 takeoff streaks: 95, launch, then he is in flight
export const SKYWARD = { startup: 7, active: 6, raw: 95, w: 64, h: 190, boxY: -110, hitstun: 44, launchVy: -26, riseVy: -24, carry: 14, ride: 12, popVy: -7, recovery: 12, chip: 0.15 }
// ZIP (double-tap ← / →, SPD Red's teleport convention): 45 % of the screen in 5 frames, projectile-intangible frames 1-4,
// cancellable from any normal on HIT. Charges: 2 per airtime; 1 on the ground (refills on landing / after `groundReset`).
export const ZIP = { dist: 0.45, travel: 5, recovery: 6, intangible: [1, 4], window: 12, buffer: 10, behind: 10, airCharges: 2, groundCharges: 1, groundReset: 40 }
// CRASH DOWN (in the air) ↓ + Special: dives, lands with the R1 shockwave: 70, hits OTG
export const CRASH = { startup: 5, vy: 34, vx: 6, raw: 70, r: 110, hitstun: 34, kby: -9, kbx: 6, recovery: 16, maxFrames: 60, chip: 0.15 }
// NO HOLDING BACK — Super, 1 bar (↓↓ + Special): zips around the foe striking from 6 directions, 300 total
export const NHB = { cost: BAR, startup: 8, reach: 300, w: 80, h: 90, every: 9, raw: [45, 45, 45, 45, 50, 70], hitstun: 30,
  offsets: [[-1, 0], [1, 0], [0, -1], [-1, -0.7], [1, -0.7], [0, 0.4]], kbxEnd: 14, kbyEnd: -14, recovery: 18, whiffRecovery: 30, chip: 0.2 }
// TERMINAL VELOCITY — the standard ultimate (Ultimate button, 100 energy, then the universal 20 s cooldown)
export const TV = { cost: 100, ultCooldown: 1200, takeoff: 30, aim: 60, fall: 8, steer: 14, direct: 0.10, shock: 0.40,
  rawDirect: 380, rawShock: 120, hitstunDirect: 70, hitstunShock: 36, crater: 50, recovery: 24, crackLife: 600, shake: [16, 30] }
// CAN'T STAY DOWN (passive, once per round) → RESOLVE 6 s
export const CSD = { down: 60, invuln: 70, resolve: 360, dmgOut: 1.20, speed: 1.10, dmgIn: 1.25 }
export const TECHNIQUES = new Set(['kIPunch', 'kIPunchW', 'kSkyward', 'kCrash', 'kNHB', 'kTV'])

export const QUOTES = {
  intro: null, introVsOmni: 'Dad. Stop.', win: 'Still standing.', notYet: 'Not yet.', notYetVsOmni: "I'd still have you, Dad.",
  omniKeys: ['omniman', 'omniman_viltrum'],
}

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 46, rangeY: 40, boxY: 22, knockbackX: 3, knockbackY: -2, damageType: 'blunt', ...extra })
const tech = (startup, recovery, extra = {}) => n(0, startup, 1, recovery, { category: 'special', isSpecial: true, noBody: true, damageType: 'blunt', ...extra })

// ── MOVES (startup = frames before the first active frame, 60 sim ticks / s) — docs/msv1/invincible/COMBOS.md ──
// every move carries a damageType (blunt — fists and feet; impact — the shockwaves / crash / ultimate)
export const INV_MOVES = {
  kJab: n(42, 4, 2, 8, { anim: 'jab', rangeX: 44 }),
  kBarrage: tech(4, 5 * 4 + 12, { anim: 'barrage', category: 'light', damageType: 'blunt', hits: 6, every: 4, raw: 16, w: 70, h: 56, landKd: 70 }),   // long enough for 6 hits 4 f apart; ends 10 f after the last
  kStraight: n(72, 7, 3, 14, { anim: 'straight', category: 'heavy', hitstun: 22, blockstun: 12, rangeX: 58, knockbackX: 7 }),
  kUpper: n(88, 8, 4, 16, { anim: 'upper', category: 'launcher', launcher: true, antiAir: true, hitstun: 26, blockstun: 12, rangeX: 50, rangeY: 96, boxY: -30, launchVy: -30 }),
  kSweep: n(52, 6, 3, 14, { anim: 'sweep', hitLevel: 'low', knockdown: 40, hitstun: 22, blockstun: 10, rangeX: 64, rangeY: 26, boxY: 70, knockbackX: 4, knockbackY: -4 }),
  kSpin: n(78, 9, 4, 16, { anim: 'spin', category: 'heavy', hitstun: 24, blockstun: 12, rangeX: 56, rangeY: 50, boxY: 30, knockbackX: 8, knockbackY: -4 }),
  kRise: n(70, 7, 4, 15, { anim: 'rise', category: 'heavy', antiAir: true, hitstun: 26, blockstun: 12, rangeX: 40, rangeY: 104, boxY: -44, knockbackX: 3, knockbackY: -12 }),
  kFpunch: n(66, 5, 4, 10, { anim: 'fpunch', air: true, flight: true, hitstun: 22, blockstun: 11, rangeX: 62, rangeY: 80, boxY: 0, knockbackX: 7, knockbackY: -3 }),
  kIPunch: tech(IPUNCH.windup + IPUNCH.rush, IPUNCH.recoveryHit, { anim: 'ipunch', airOk: true }),
  kIPunchW: tech(1, IPUNCH.whiff + 4, { anim: 'flyFast', airOk: true }),
  kSkyward: tech(SKYWARD.startup, 22, { anim: 'upper' }),
  kCrash: tech(CRASH.startup, CRASH.maxFrames, { anim: 'dive', airOk: true, airOnly: true, damageType: 'impact' }),
  kCrashLand: tech(1, CRASH.recovery, { anim: 'takeoff', damageType: 'impact' }),
  kNHB: tech(NHB.startup, NHB.recovery + NHB.every * 6, { anim: 'zip', category: 'ultimate', super: true, bars: 1, airOk: true }),
  kTV: tech(TV.takeoff + TV.aim + TV.fall, TV.recovery, { anim: 'takeoff', category: 'ultimate', isUltimate: true, airOk: true, damageType: 'impact' }),
  kTVCrater: tech(1, TV.crater, { anim: 'crouch', damageType: 'impact' }),
}
export const NORMALS = ['kJab', 'kStraight', 'kUpper', 'kSweep', 'kSpin', 'kRise', 'kFpunch']

const even = (n, from, to) => Array.from({ length: n }, (_, i) => [Math.round(from + i * (to - from) / n), i])
export const TIMELINE = {
  kJab: [[0, 0], [4, 1]],
  kBarrage: [[0, 0], [2, 1], [4, 2], [6, 0], [8, 1], [10, 2], [12, 0], [14, 1], [16, 2], [18, 0], [20, 1], [22, 2], [24, 1]],
  kStraight: [[0, 0], [4, 1], [7, 2]],
  kUpper: [[0, 0], [5, 1], [8, 2]],
  kSweep: [[0, 0], [4, 1], [6, 2]], kSpin: [[0, 0], [5, 1], [9, 2]], kRise: [[0, 0], [4, 1], [7, 2]],
  kFpunch: [[0, 0], [3, 1], [5, 2]],
  kIPunch: [[0, 0], [IPUNCH.windup + IPUNCH.rush - 2, 1], [IPUNCH.windup + IPUNCH.rush, 2], [IPUNCH.windup + IPUNCH.rush + 3, 3], [IPUNCH.windup + IPUNCH.rush + 7, 4], [IPUNCH.windup + IPUNCH.rush + 11, 5]],
  kIPunchW: [[0, 0]],
  kSkyward: [[0, 0], [4, 1], [7, 2]],
  kCrash: [[0, 0]], kCrashLand: [[0, 0]],
  kNHB: [[0, 0], [4, 1], [8, 2], [10, 3]],
  kTV: [[0, 0]], kTVCrater: [[0, 0]],
}

const A = INVINCIBLE_ANIM
const lock = a => ({ ...a, loop: false, lockLastFrame: true })
export const INV_ANIMATION = {
  idle: { ...A.idle, loop: true }, walk: { ...A.walk, loop: true }, walk_back: { ...A.walk, loop: true }, run: { ...A.run, loop: true },
  dash: lock(A.dash), jump: lock(A.jump), doubleJump: lock(A.jump), fall: lock(A.fall), land: lock(A.crouch),
  crouch: lock(A.crouch), guard: lock(A.guard), hurt: lock(A.hurt), hurt_air: lock(A.hurt),
  knockdown: lock(A.knockdown), getup: lock(A.getup), intro: lock(A.intro), win: lock(A.win), lose: lock(A.lose),
  charge: { ...A.guard, loop: true }, taunt: lock(A.taunt), transform: lock(A.guard), ultimate: lock(A.takeoff),
  light: A.jab, heavy: A.straight, up: A.upper, air: A.fpunch, down_air: A.dive, grab: A.straight,
  // flight (sprite.js maps flight.js poses → these): hover / cruise / rise / dive / turn / takeoff / land
  flyHover: { ...A.fly, loop: true }, flyCruise: { ...A.flyFast, loop: true }, flyRise: { ...A.fly, loop: true },
  flyDive: lock(A.dive), flyTurn: lock(A.fly), takeoff: lock(A.takeoff), flyDash: lock(A.flyFast),
  ...Object.fromEntries(Object.entries(INV_MOVES).map(([k, m]) => [k, { ...lock(A[m.anim]), frameTimeline: TIMELINE[k] }])),
}

export const invincible = {
  rosterKey: INV_KEY, name: 'Invincible', displayName: 'Invincible', selectTag: 'Mark Grayson', universe: 'invincible',
  color: '#f4c430', series: 'Invincible', era: 'Mark Grayson, half-Viltrumite (sheet: JustOruma, SWL+)',
  tagline: 'Still standing.', introTitle: 'INVINCIBLE — MARK GRAYSON', archetype: 'Glass Cannon / Rushdown Flier', difficulty: 5,
  homeStage: 'Viltrumite Warzone',
  bio: 'Mark Grayson — half-human, half-Viltrumite, and nowhere near as durable as he needs to be. The fastest hands and the ' +
    'most agile flight on the roster, the lowest health. He keeps getting back up.',
  primary: 'rushdown', secondary: ['flight'], archetypes: ['melee', 'flight'],
  traits: { hasEnergy: true, energyType: 'viltrumite', mobility: 'high', scaling: 'damage', animeMovement: true, flightProfile: INV_KEY },
  passive: { name: "Can't Stay Down", effect: 'Once per round a hit that would KO him leaves him at 1 HP: he goes down, gets up, and fights on in RESOLVE for 6 s (+20% damage, +10% speed, takes +25% damage).' },
  stats: { maxHealth: MAX_HP, maxEnergy: 2 * BAR, attack: 99, defense: 72, speed: 98, maxJumps: 2, jumpPower: 33, dashSpeed: 26, dashDuration: 8, dashCooldownMax: 20 },
  hasSprites: true, spriteScale: INV_SCALE, spriteSheet: A.idle.sheet, portrait: './assets/invincible/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: {
    light: INV_MOVES.kJab, heavy: INV_MOVES.kStraight, crouchLight: INV_MOVES.kSweep, upAttack: INV_MOVES.kUpper,
    airAttack: INV_MOVES.kFpunch, downAir: INV_MOVES.kFpunch,
    grab: { damage: dmg(40), startup: 5, active: 3, recovery: 13, hitstun: 22, throwForceX: 8, throwForceY: -5, damageType: 'blunt' },
  },
  specials: {
    neutral: { name: 'Invincible Punch', cost: 0 }, forward: { name: 'Invincible Punch', cost: 0 }, up: { name: 'Skyward', cost: 0 },
    down: { name: 'Crash Down', cost: 0 },
  },
  ultimate: { name: 'Terminal Velocity', cost: 100, duration: 2, effect: 'Sky strike',
    description: 'Ultimate (100 energy): he leaves through the top of the screen, a star glints, the player steers the landing — a marker on the ground shows both players where — then he comes down as a blue-and-yellow streak: 380 direct, 120 shockwave.' },
  transformationOrder: ['base'], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: INV_ANIMATION,
}
