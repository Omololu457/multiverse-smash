// Starfire (Koriand'r, Teen Titans: supplied Game Boy Advance art). DATA ONLY.
// - Contents: frame data, Energy costs, projectile / levitation / eye-laser / Prism Break constants, the ultimate script,
//   the roster entry.
// - Logic lives in starfireState.js (sim) and starfire.js (command layer). starfireFx.js is render-only.
// - Eye anchors: starfireEyes.js (generated, per action / per frame, strip-cell pixels). See docs/starfire/EYE_ANCHORS.md.
// - Canon reference: https://www.dc.com/characters/starfire (Tamaranean flight, starbolts, eye beams, super-strength).
// - Star Sight twin-beam contract, Orbital Star and Prism Break are ORIGINAL gameplay adaptations.
import { STARFIRE_ANIM } from './starfireSprites.js'

// Authoring lever shared with the recent hand-built fighters (Rangers / Cyborg / Beast Boy / Raven): stored = round(raw × 1.7).
// Starfire is NOT on rosterParity.js's extra ×1.3 list. Every "raw" number below is the brief's raw value.
export const STARFIRE_DAMAGE_SCALE = 1.95
export const dmg = raw => Math.round(raw * STARFIRE_DAMAGE_SCALE)

// ── LEVITATION (L2 / Charge TAP toggle; never hold-to-charge) — same bounded contract as Raven ──
export const LEV = {
  cost: 10, drain: 0.1, maxFrames: 120,          // 10 to enter, 6 / s, at most 2 s
  startFrames: 12, endFrames: 12,                // Preparing to Levitate (4 cells) → Levitating loop; exit = reversed lift → fall
  liftVy: -3.0, liftFrames: 10,
  axis: { accel: 0.45, drag: 0.78, reverseBrake: 0.6, overspeedDrag: 0.9 },
  maxVy: 2.6, ceilingAbove: 240, ceilingY: -300,
}

// ── PROJECTILES (ordinary engine projectiles: shared block / combo scale / juggle / hitstop / reflect rules) ──
export const BOLT = {
  ground: { cost: 10, raw: 30, speed: 10, vy: 0, life: 52, r: 12, hitstun: 22, kbx: 4, kby: -2, y: 0.34 },   // STARBOLT
  air: { cost: 12, raw: 32, speed: 6.5, vy: 7, life: 96, r: 12, hitstun: 24, kbx: 4, kby: -3, y: 0.42 },     // COMET SHOT (down-forward)
  ult: { raw: 30, speed: 12, life: 26, r: 14, hitstun: 40, kbx: 1, kby: 0, y: 0.34 },                          // ultimate opener (≈ 312 px)
  burst: { raw: 60, speed: 14, life: 40, r: 26, hitstun: 34, kbx: 9, kby: -4 },                                 // PRISM BREAK empowered burst
}
// ORBITAL STAR: a slow owned orb (max 1 per owner). It is the only thing Prism Break can consume.
// It floats HIGH (5 % below the body-box top, ≈ 95 px above her feet): still inside a standing foe's hurtbox, and on the
// way from her eyes (≈ 132 px up) down to a foe's torso (≈ 60 px up), so a Star Sight aimed past it crosses it near the
// middle of the gap — Prism Break is a readable setup, not a pixel hunt.
export const ORB = { cost: 16, raw: 26, speed: 2.2, life: 160, r: 16, hitstun: 22, kbx: 3, kby: -3, y: 0.05 }

// ── STAR SIGHT eye laser ──
// - Twin beams from the VALIDATED eye anchors of the frame on screen (starfireEyes.js), mapped to world through the
//   same transform sprite.js uses (scale = spriteScale × GLOBAL_SPRITE_SCALE; feet origin (56, 92); facing −1 mirrors
//   around the body centre). Frames whose eye state is dissolve / hidden / closed / silhouette never emit.
// - BOTH beams form ONE attack contract: one hit (raw 44), shared engine block / hitstun / combo scale.
// - Aim is captured once at elapsed AIM_AT (startup frame 10, the head-turn into the glare pose): the line toward the
//   nearest foe's torso, clamped to ±maxDeg from horizontal in the facing direction. No later tracking.
export const LASER = { cost: 14, raw: 44, aimAt: 10, maxDeg: 18, length: 560, half: 5, hitstun: 24, blockstun: 14, kbx: 5, kby: -2 }
export const GSCALE = 1.18    // sprite.js GLOBAL_SPRITE_SCALE (asserted equal by harness/starfire.test.mjs)
export const CELL = { w: 112, h: 104, ox: 56, oy: 92 }

// ── SOLAR RUSH / SKYBREAK ──
export const RUSH = { cost: 15, speed: 10, from: 4, until: 18 }          // real travel: 10 px / f for 14 f (≤ 140 px, stops at the foe)
export const SKY = { cost: 16, vy: -15, vx: 2 }                           // one contact; once per airtime; never touches the jump counter
export const AIR = { cometPerAirtime: 1, laserPerAirtime: 1, skyPerAirtime: 1, levPerAirtime: 1 }
export const UP_GRACE = 3     // a fresh grounded Up holds the jump 3 f so Up pressed 1-2 f before Special is Skybreak (Raven rule)

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 18, blockstun: 11, rangeX: 56, rangeY: 44, boxY: 18, knockbackX: 3, knockbackY: -2, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery.
export const STARFIRE_MOVES = {
  // J1 / J2 / J3: fresh Light retaps after a clean hit, three stages maximum (Punch 1 / Punch 2 art; no kick exists).
  light: n(16, 5, 2, 9, { hitstun: 17, blockstun: 10, rangeX: 50, knockbackX: 2 }),                                     // Star Jab
  sfJ2: n(20, 7, 2, 12, { hitstun: 19, blockstun: 11, rangeX: 62, knockbackX: 3, travel: [1, 9, 4] }),                   // Advancing Strike
  sfJ3: n(28, 10, 3, 18, { hitstun: 24, blockstun: 12, rangeX: 72, knockbackX: 9, knockbackY: -4 }),                     // Tamaranean Finisher
  heavy: n(50, 13, 3, 22, { category: 'heavy', hitstun: 28, blockstun: 14, rangeX: 80, boxY: 14, knockbackX: 5 }),       // Heavy Starfist
  sfLow: n(22, 7, 2, 14, { hitLevel: 'low', hitstun: 20, blockstun: 12, rangeX: 60, rangeY: 30, boxY: 66 }),             // Low Sweep (landing crouch)
  up: n(38, 12, 3, 20, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 54, rangeY: 104, boxY: -34, launchVy: -20, selfVy: 0 }),   // Rising Glow
  air: n(28, 8, 3, 13, { hitstun: 24, rangeX: 68, rangeY: 54, boxY: 20, knockbackX: 3, knockbackY: -3 }),                // Air Strike
  // SPECIALS
  sfBolt: n(0, 13, 1, 20, { category: 'special', isSpecial: true, noBody: true, cost: BOLT.ground.cost }),               // STARBOLT
  sfComet: n(0, 13, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: BOLT.air.cost, air: true }),       // COMET SHOT
  sfRush: n(46, 12, 6, 20, { category: 'special', isSpecial: true, cost: RUSH.cost, hitstun: 26, blockstun: 14, rangeX: 46, rangeY: 60, boxY: 16, knockbackX: 8, knockbackY: -3 }),   // SOLAR RUSH
  sfSky: n(38, 9, 8, 22, { category: 'special', isSpecial: true, cost: SKY.cost, hitstun: 28, blockstun: 13, rangeX: 46, rangeY: 96, boxY: -30, knockbackX: 2, knockbackY: -9, air: true }),   // SKYBREAK
  sfOrb: n(0, 16, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: ORB.cost }),                         // ORBITAL STAR
  sfLaser: n(LASER.raw, 14, 8, 20, { category: 'special', isSpecial: true, cost: LASER.cost, laser: true, hitstun: LASER.hitstun, blockstun: LASER.blockstun, knockbackX: LASER.kbx, knockbackY: LASER.kby, rangeX: 0, rangeY: 0 }),   // STAR SIGHT
  sfAirLaser: n(LASER.raw, 14, 8, 18, { category: 'special', isSpecial: true, cost: LASER.cost, laser: true, air: true, hitstun: LASER.hitstun, blockstun: LASER.blockstun, knockbackX: LASER.kbx, knockbackY: LASER.kby, rangeX: 0, rangeY: 0 }),
  // ULTIMATE OPENER: a visible short starbolt, raw 30, blockable. A clean hit starts SUPERNOVA; a miss or block gives 60 f recovery.
  sfUltOpen: n(0, 16, 1, 60, { category: 'ultimate', isUltimate: true, noBody: true, cost: 100 }),
}
export const CHAIN = { light: 'sfJ2', sfJ2: 'sfJ3' }
export const SPECIAL_FROM = ['light', 'sfJ2', 'sfJ3', 'heavy', 'sfLow', 'up']   // clean contact, recovery only
export const HEAVY_FROM = ['light', 'sfJ2', 'sfLow']
export const ULT_FROM = ['heavy', 'sfJ3']
export const GROUND_ONLY = ['light', 'sfJ2', 'sfJ3', 'heavy', 'sfLow', 'up', 'sfBolt', 'sfRush', 'sfOrb', 'sfLaser', 'sfUltOpen']

// ── ULTIMATE: SUPERNOVA — EYES OF TAMARAN (frames from the confirm; frozen-cinematic contract) ──
//   0–39   supplied cutscene portrait cut-in (bounded 40 f)
//  40–59   rise: Preparing to Levitate (lift 90 px)
//  60–119  hover: four starbolts (Shooting Ball (Midair) poses), contacts @72 / 84 / 96 / 108, raw 20 each
// 120–171  Shooting Laser: twin eye beams from the VALIDATED anchors of the frame on screen; contacts @140 / 156, raw 30 each
// 172–191  full Energy Exploding on the target: contact @176, raw 100
// 192–223  descent → Landing frames on the floor (legal landing; never inside the target)
// Opener 30 + 4×20 + 2×30 + 100 = 270 raw before shared scaling. One resource transaction (100 Energy at the opener).
export const ULT = { total: 224, cutIn: 40, rise: 90, settle: 192,
  contacts: [{ at: 72, raw: 20, kind: 'bolt' }, { at: 84, raw: 20, kind: 'bolt' }, { at: 96, raw: 20, kind: 'bolt' }, { at: 108, raw: 20, kind: 'bolt' },
    { at: 140, raw: 30, kind: 'laser' }, { at: 156, raw: 30, kind: 'laser' }, { at: 176, raw: 100, kind: 'explode' }],
  bolts: [62, 74, 86, 98], boltFlight: 10, laser: [126, 166] }

// Frame timelines (which strip frame shows at which elapsed tick).
const spread = (n, len, start = 0) => Array.from({ length: n }, (_, i) => [start + Math.round(i * len / n), i])
const cyc = (from, until, step, nFrames, base = 0) => Array.from({ length: Math.ceil((until - from) / step) }, (_, i) => [from + i * step, base + i % nFrames])
export const TIMELINE = {
  light: [[0, 0], [2, 1], [5, 2], [7, 3], [11, 4]],                                     // pa0-4: strike pose on active frame 5
  sfJ2: [[0, 0], [3, 1], [7, 2], [9, 3], [13, 4], [17, 5]],                            // pb0-5: energy fist on 7, ring on 9
  sfJ3: [[0, 0], [4, 1], [7, 2], [10, 3], [14, 4], [19, 5], [25, 6]],                  // pa3-9: ring burst on active frame 10
  heavy: [[0, 0], [2, 1], [4, 2], [6, 3], [9, 4], [11, 5], [13, 6], [16, 7], [22, 8], [30, 9]],
  sfLow: [[0, 0], [3, 1], [7, 2], [12, 3]],
  up: [[0, 0], [5, 1], [12, 2], [17, 3]],
  air: [[0, 0], [4, 1], [8, 2], [13, 3]],
  sfBolt: [[0, 0], [4, 1], [8, 2], [13, 3], [17, 4], [22, 5], [27, 6]],                // ball leaves the hand on shot3 (frame 13)
  sfComet: [[0, 0], [4, 1], [8, 2], [13, 3], [17, 4], [22, 5], [27, 6]],
  sfRush: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], [15, 5], [18, 6], [26, 7]],        // stride → energy fist on the active frame 12
  sfSky: [[0, 0], [2, 1], [4, 2], [6, 3], [9, 4], [13, 5], [20, 6]],                   // launch → arms-up burst
  sfOrb: [[0, 0], [5, 1], [10, 2], [16, 3], [21, 4], [27, 5]],                          // orb released on frame 16
  // STAR SIGHT: laser0-4 head turn, laser5 glare builds @10 (aim captured), laser6 / laser7 fire (identical eye anchors,
  // so the beam origin is constant across the whole active window 14-21), laser8-11 recover.
  sfLaser: [[0, 0], [2, 1], [4, 2], [6, 3], [8, 4], [10, 5], [13, 6], [18, 7], [23, 8], [28, 9], [33, 10], [38, 11]],
  sfAirLaser: cyc(0, 40, 4, 12),
  sfUltOpen: [[0, 0], [5, 1], [10, 2], [16, 3], [24, 4], [36, 5], [56, 6]],
  // ultimate pose strips (driven by the cinematic frame through starfireState.pose)
  ultRise: [[0, 0], [5, 1], [10, 2], [15, 3]], ultHover: cyc(0, 120, 5, 12),
  ultBolt: [[0, 0], [3, 1], [6, 2], [9, 3]],
  ultLaser: [[0, 0], [2, 1], [4, 2], [6, 3], [8, 4], [10, 5], [13, 6], [27, 7], [40, 8], [43, 9], [46, 10], [49, 11]],
  ultLand: [[0, 0], [5, 1], [10, 2], [16, 3], [22, 4]],
}
TIMELINE.ultOpen = TIMELINE.sfUltOpen
const ANIM_ALIAS = { sfUltOpen: 'ultOpen' }

export const starfire = {
  rosterKey: 'starfire', name: 'Starfire', displayName: 'Starfire', civilianIdentity: "Koriand'r", universe: 'dc',
  color: '#ff6a3c', series: 'Teen Titans', era: 'Teen Titans / supplied Game Boy Advance artwork',
  tagline: 'On Tamaran, we fight with joy!', archetype: 'Aerial Blaster / Eye-Beam Zoner',
  bio: "Koriand'r of Tamaran: flight, starbolts, eye beams and great strength. Starbolts and a down-forward Comet Shot zone, Solar Rush and Skybreak punish, a slow Orbital Star sets up, and her twin-eye Star Sight beam can shatter her own orb into a Prism Break burst. Orbital Star and Prism Break are game adaptations.",
  primary: 'zoner', secondary: ['rushdown'], archetypes: ['zoner', 'rushdown'],
  traits: { hasEnergy: true, energyType: 'stellar', energyName: 'Energy', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Energy', color: '#7cff4a' },
  // speed 94 → 8.5 px / f walk (agile band, same as Raven). maxJumps 2 = the SHARED double jump (no third jump).
  stats: { maxHealth: 1100, maxEnergy: 100, attack: 84, defense: 72, speed: 94, jumpPower: 25, maxJumps: 2, weight: 1,
    dashSpeed: 14, dashDuration: 10, dashCooldownMax: 34 },
  hasSprites: true, spriteScale: 2.2, spriteSheet: STARFIRE_ANIM.idle.sheet, portrait: './assets/starfire/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro', 'idle'],
  basic_attacks: { light: STARFIRE_MOVES.light, heavy: STARFIRE_MOVES.heavy, crouchLight: STARFIRE_MOVES.sfLow, upAttack: STARFIRE_MOVES.up,
    airAttack: STARFIRE_MOVES.air, downAir: STARFIRE_MOVES.air,
    grab: { damage: dmg(28), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 9, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: 'Starbolt (air: Comet Shot)', cost: BOLT.ground.cost }, forward: { name: 'Solar Rush', cost: RUSH.cost },
    up: { name: 'Skybreak', cost: SKY.cost }, down: { name: 'Orbital Star', cost: ORB.cost }, back: { name: 'Star Sight (eye laser)', cost: LASER.cost } },
  ultimate: { name: 'SUPERNOVA — EYES OF TAMARAN', cost: 100,
    description: '16 f starbolt opener (raw 30, blockable). Clean hit: portrait cut-in → she rises → four starbolts 4×20 → twin eye beams 2×30 → full explosion 100 → legal landing (270 raw before shared scaling). Miss / block: 60 f recovery.' },
  animationData: Object.fromEntries(Object.entries({ ...STARFIRE_ANIM, ...Object.fromEntries(Object.entries(ANIM_ALIAS).map(([k, v]) => [k, STARFIRE_ANIM[v]])) })
    .map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
}
