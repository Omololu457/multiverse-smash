// Omni-Man — Viltrumite (omniman_viltrum) — DATA ONLY: frame data, flight numbers, technique profiles, quotes, the roster
// entry. Logic: omnimanViltrumState.js (sim + combat hooks), omnimanViltrum.js (command layer), omnimanViltrumFx.js
// (render / HUD / sound cues). Art: assets/incoming/omniman/omniman.png (imhomiejaydev), sliced by
// tools/omnimanviltrum/slice.py. Docs: docs/msv1/omniman/ (REUSE, FLIGHT_REFERENCE, LEDGER, COMBOS, BALANCE_NOTES).
// The OLD Omni-Man (`omniman`, canFly flight, Smart Atoms, Viltrumite Onslaught) is a different character and is not
// touched by any of this.
import { OMNIMAN_VILTRUM_ANIM } from './omnimanViltrumSprites.js'

export const OMV_KEY = 'omniman_viltrum'
// stored damage = round(raw / 0.6): the engine's global ×0.6 write scale lands the brief's number (Gojo / Sukuna Shinjuku lever)
export const dmg = raw => Math.round(raw / 0.6)
export const OMV_SCALE = 2           // integer nearest-neighbour presentation scale (≈61 px sheet body → ≈122 px)
export const SCREEN = 1280           // reference screen width for "% of screen" distances
export const BAR = 100               // one super bar = 100 energy

// ── VILTRUMITE FLIGHT (flight.js FLIGHT_PROFILES.omniman_viltrum carries the same numbers; docs/msv1/omniman/FLIGHT_REFERENCE.md)
//   top speed 1.3 × Dseyl (44, the fastest roster flier) · accel 1.25 × Dseyl (4.4) · coast drag 0.9292 (2.5 × Homelander's
//   coast from the same speed) · ±25° per 10 f steering at top speed · ≈0.6 s to reverse without braking · Guard = brake
export const FASTEST_FLIER = { key: 'dseyl', maxH: 44.0, accel: 4.4 }
export const TOP = +(FASTEST_FLIER.maxH * 1.3).toFixed(2)          // 57.2
export const ACCEL = +(FASTEST_FLIER.accel * 1.25).toFixed(3)      // 5.5
export const FLIGHT = {
  top: TOP, accel: ACCEL, drag: 0.9292,
  turnSlow: 15 * Math.PI / 180, turnFast: 2.5 * Math.PI / 180,     // rad / frame at a standstill → at top speed
  reverseCos: -0.5, reverseDecel: +(TOP / 34).toFixed(4), flipBelow: 1.0,
  brake: 0.836,                                                    // 0.836^9 = 0.20 → 80 % gone within 10 frames of the press (Guard is read one frame after the flight step)
  blockMax: 0.40,                                                  // can't block above 40 % of top speed
  crashAt: 0.70, crashFrames: 28, crashSelf: 25, crashShake: 6,    // wall crash
  boomAt: 0.90, boomRearm: 0.60, boomRaw: 20, boomR: 70, boomKb: 9, // sonic boom push box
  landAt: 0.70, landRaw: 50, landR: 120, landRecovery: 14,         // hard landing shockwave
}
// SPEED IS DAMAGE: every punch / kick / Blitz × (1 + 0.6 × speed fraction) at the moment of impact; knockback the same;
// on block the attacker loses `blockPenalty × fraction` extra frames (more negative at speed)
export const SPEED_DMG = { max: 0.60, blockPenalty: 8 }
export const speedMult = frac => 1 + SPEED_DMG.max * Math.max(0, Math.min(1, frac))

// ── SPECIALS ──
export const BLITZ = { startup: 6, tapDist: 0.50, holdDist: 0.80, raw: 90, w: 64, h: 70, hitstun: 26, blockstun: 16, kbx: 16, kby: -5,
  chip: 0.15, recoveryHit: 16, recoveryWhiff: 24, overshootDrag: 0.86, hitstop: 8 }
export const SKYHOOK = { startup: 7, rise: 16, vy: -15, raw: 80, w: 56, h: 110, boxY: -40, hitstun: 30, carry: 16, launchVy: -17, recovery: 12, chip: 0.15 }
export const METEOR = { startup: 4, angleDown: Math.PI / 2, angle45: Math.PI / 4, raw: 70, r: 130, hitstun: 30, kby: -9, kbx: 7,
  recoveryHit: 14, recoveryWhiff: 30, maxFrames: 40, chip: 0.15 }
export const DIRT = { startup: 6, active: 3, reach: 62, h: 80, dragDist: 0.40, dragSpeed: 26, raw: 110, throwVx: 24, throwVy: -4, hitstun: 40,
  whiff: 22, chip: 0 }
export const UNIMPRESSED = { startup: 2, window: 24, whiff: 16, cooldown: 720, raw: 80, kbx: 15, kby: -4, hitstun: 30, backhand: 14 }
export const DECREE = { frames: 60, gain: 0.25 }
// THINK! — 1 bar. Blitz grab (whiff = overshoot); drag the whole stage at top speed; slam into the far wall. 300 total.
export const THINK = { cost: BAR, startup: 6, rushMax: 0.60, w: 70, h: 80, dragTicks: 4, dragRaw: 20, slamRaw: 220, slamHitstun: 60,
  whiffRecovery: 30, bubble: 'THINK!', bubbleMark: 'Think, Mark! THINK!', markKeys: ['invincible', 'mark_grayson', 'invincible_mark'] }
// ESCAPE VELOCITY — the standard ultimate: Ultimate button, 100 energy, the universal 20 s cooldown. ≈5.5 s cinematic.
export const ESCAPE = { cost: 100, ultCooldown: 1200,
  grab: 15, ascent: 96, orbit: 84, ret: 72, impact: 36, settle: 27,   // 0.25 / 1.6 / 1.4 / 1.2 / 0.6 / 0.45 s
  rush: 57.2, w: 72, h: 110, whiffRecovery: 40,
  ticks: 10, tickRaw: 8, impactRaw: 340, rise: 300,                    // 10 × 8 on the way up, 340 on impact = 420
  line: 'Look what they need to mimic a fraction of our power.', craterLife: 600 }
export const TECHNIQUES = new Set(['kBlitz', 'kSkyHook', 'kMeteor', 'kDirt', 'kUnimp', 'kThink', 'kEscape'])

export const QUOTES = { win: 'What will you have after five hundred years?', think: 'THINK!' }

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 48, rangeY: 40, boxY: 18, knockbackX: 3, knockbackY: -2, damageType: 'blunt', ...extra })
const tech = (startup, recovery, extra = {}) => n(0, startup, 1, recovery, { category: 'special', isSpecial: true, noBody: true, ...extra })

// ── MOVES (startup = frames before the first active frame, 60 sim ticks / s) — docs/msv1/omniman/COMBOS.md ──
export const OMV_MOVES = {
  kJab: n(38, 5, 2, 8, { anim: 'jab', rangeX: 46, hitstun: 15 }),
  kStraight: n(60, 8, 3, 13, { anim: 'straight', rangeX: 60, hitstun: 19, blockstun: 11, knockbackX: 5 }),
  kHay: n(96, 14, 4, 20, { anim: 'haymaker', category: 'heavy', rangeX: 64, rangeY: 50, hitstun: 24, blockstun: 13, knockbackX: 11, knockbackY: -3, wallBounce: true }),
  kLow: n(46, 7, 3, 11, { anim: 'low', hitLevel: 'low', rangeX: 54, rangeY: 30, boxY: 60, hitstun: 17, knockbackX: 3, knockbackY: 0 }),
  kKick: n(70, 9, 3, 15, { anim: 'kick', category: 'heavy', rangeX: 62, rangeY: 44, boxY: 34, hitstun: 21, blockstun: 12, knockbackX: 7 }),
  kAir: n(64, 6, 4, 10, { anim: 'flightPunch', air: true, rangeX: 72, rangeY: 46, boxY: 22, hitstun: 19, knockbackX: 6, knockbackY: -1 }),
  kBack: n(UNIMPRESSED.raw, 4, 3, UNIMPRESSED.backhand, { anim: 'backhand', category: 'heavy', rangeX: 66, hitstun: UNIMPRESSED.hitstun, blockstun: 14, knockbackX: UNIMPRESSED.kbx, knockbackY: UNIMPRESSED.kby, wallBounce: true, counterHit: true }),
  kBlitz: tech(BLITZ.startup, BLITZ.recoveryHit, { anim: 'grabRush', airOk: true }),
  kSkyHook: tech(SKYHOOK.startup, SKYHOOK.recovery, { anim: 'skyHook' }),
  kMeteor: tech(METEOR.startup, METEOR.recoveryHit, { anim: 'meteor', airOk: true, airOnly: true }),
  kDirt: tech(DIRT.startup, DIRT.whiff, { anim: 'grabRush', damageType: 'blunt' }),
  kUnimp: tech(UNIMPRESSED.startup, UNIMPRESSED.whiff, { anim: 'unimpressed', category: 'counter' }),
  kDecree: tech(DECREE.frames, 1, { anim: 'point', category: 'taunt' }),
  kThink: tech(THINK.startup, THINK.whiffRecovery, { anim: 'grabRush', category: 'super', super: true, bars: 1, airOk: true }),
  kEscape: tech(1, ESCAPE.whiffRecovery, { anim: 'grabRush', category: 'ultimate', isUltimate: true, airOk: true }),
}
export const NORMALS = ['kJab', 'kStraight', 'kHay', 'kLow', 'kKick', 'kAir', 'kBack']
export const CHAIN = { kJab: ['kStraight'], kStraight: ['kHay'], kLow: ['kStraight'] }

const even = (frames, from, to) => frames.map((f, i) => [Math.round(from + i * (to - from) / frames.length), f])
export const TIMELINE = {
  kJab: [[0, 0], [4, 1]], kStraight: [[0, 0], [5, 1], [8, 2]], kHay: [[0, 0], [7, 1], [13, 2], [24, 3]],
  kLow: [[0, 0], [6, 1]], kKick: [[0, 0], [5, 1], [9, 2]], kAir: [[0, 0], [5, 1]], kBack: [[0, 0], [4, 1]],
  kBlitz: [[0, 0], [4, 1], [6, 2], [10, 3]], kSkyHook: [[0, 0], [4, 1], [7, 2], [14, 3]], kMeteor: [[0, 0], [3, 1]],
  kDirt: [[0, 0], [4, 1], [6, 2], [10, 3]], kUnimp: [[0, 0], [4, 1], [8, 2], [16, 3]], kDecree: even([0, 1, 2, 3, 4], 0, 40),
  kThink: [[0, 0], [4, 1], [6, 2], [10, 3]], kEscape: [[0, 0], [4, 1], [6, 2], [10, 3]],
}

const A = OMNIMAN_VILTRUM_ANIM
const lock = a => ({ ...a, loop: false, lockLastFrame: true })
const loop = a => ({ ...a, loop: true })
// flight.js poseKey → sprite.js action: flyHover / flyCruise / flyRise / flyDive (his BRAKE: the momentum profile only
// emits 'brake' while Guard is held, never 'dive') / flyTurn / flyDash / takeoff / land
export const OMV_ANIMATION = {
  idle: A.idle, walk: A.walk, walk_back: A.walk, run: loop(A.walk), dash: lock(A.dashShort),
  jump: lock(A.takeoff), doubleJump: lock(A.takeoff), fall: lock(A.hover), land: lock(A.land),
  crouch: lock(A.crouch), guard: lock(A.guard), crouchGuard: lock(A.crouchGuard), hurt: lock(A.hurt), hurt_air: lock(A.hurt),
  knockdown: lock(A.knockdown), getup: lock(A.getup), intro: lock(A.intro), win: lock(A.win), lose: lock(A.lose),
  taunt: lock(A.point), turn: lock(A.turn), ultimate: lock(A.grabRush),
  flyHover: loop(A.hover), flyCruise: loop(A.fly), flyRise: loop(A.takeoff), flyDive: lock(A.brake), flyTurn: lock(A.brake),
  flyDash: loop(A.fly), takeoff: lock(A.takeoff),
  light: A.jab, heavy: A.haymaker, up: A.kick, air: A.flightPunch, down_air: A.flightPunch, grab: A.blitz,
  // extra strips the sim / render pick by name (crash, landings, ultimate beats, Unimpressed tell)
  omvCrash: lock(A.crash), omvLandHard: lock(A.landHard), omvBrake: lock(A.brake), omvAscent: lock(A.ascent), omvOrbit: lock(A.orbitHold),
  omvReturn: lock(A.returnPunch), omvThrow: lock(A.throwSlam), omvMeteorLand: lock(A.meteorLand), omvGlint: lock(A.glint),
  ...Object.fromEntries(Object.entries(OMV_MOVES).map(([k, m]) => [k, { ...lock(A[m.anim]), frameTimeline: TIMELINE[k] }])),
}

export const omniman_viltrum = {
  rosterKey: OMV_KEY, name: 'Omni-Man', displayName: 'Omni-Man', selectTag: 'Viltrumite', universe: 'invincible',
  color: '#d4141c', series: 'Invincible', era: 'Nolan Grayson (sheet: imhomiejaydev)',
  tagline: 'Think.', introTitle: 'OMNI-MAN — VILTRUMITE', archetype: 'Viltrumite / Momentum Brawler', difficulty: 5,
  homeStage: 'Viltrumite Warzone',
  bio: 'Nolan Grayson, Viltrumite, the world\'s strongest hero, until he wasn\'t.',
  primary: 'rushdown', secondary: ['flight'], archetypes: ['melee', 'flight'],
  // flightProfile wires flight.js FLIGHT_PROFILES.omniman_viltrum (Homelander's module). NO canFly → the old simple
  // Omni-Man flight is untouched.
  traits: { hasEnergy: true, energyType: 'viltrumite', energyName: 'Viltrumite Power', mobility: 'very_high', scaling: 'damage', animeMovement: false, flightProfile: OMV_KEY, weight: 'heavy' },
  passive: { name: 'Viltrumite Physiology', effect: 'Speed is damage: every punch, kick and Blitz hits harder the faster he is moving (up to +60 %).' },
  // Health = Homelander's (1050). Weight: heavy (knockback received ×0.85, omvKnockback hook).
  stats: { maxHealth: 1050, maxEnergy: 2 * BAR, attack: 96, defense: 90, speed: 100, maxJumps: 2, jumpPower: 32, dashSpeed: 30, dashDuration: 10, dashCooldownMax: 22, weight: 1.18 },
  hasSprites: true, spriteScale: OMV_SCALE, spriteSheet: A.idle.sheet, portrait: './assets/omniman_viltrum/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: {
    light: OMV_MOVES.kJab, heavy: OMV_MOVES.kHay, crouchLight: OMV_MOVES.kLow, upAttack: OMV_MOVES.kKick,
    airAttack: OMV_MOVES.kAir, downAir: OMV_MOVES.kAir,
    grab: { damage: dmg(40), startup: 5, active: 3, recovery: 14, hitstun: 22, throwForceX: 8, throwForceY: -5, damageType: 'blunt' },
  },
  specials: {
    forward: { name: 'Viltrumite Blitz', cost: 0 }, up: { name: 'Sky Hook', cost: 0 }, down: { name: 'Meteor Drop', cost: 0 },
    back: { name: 'Face in the Dirt', cost: 0 },
  },
  ultimate: { name: 'Escape Velocity', cost: ESCAPE.cost, duration: 5.5, effect: 'Cinematic orbit slam',
    description: 'Ultimate (100): Blitz-grab, fly them to orbit, punch them back down into a crater. 420 total.' },
  transformationOrder: ['base'], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: OMV_ANIMATION,
}
