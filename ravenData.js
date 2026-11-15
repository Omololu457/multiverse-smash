// Raven (Rachel Roth, Teen Titans: supplied Game Boy Advance art). DATA ONLY.
// - Contents: frame data, Energy costs, levitation / pile / orb / shield constants, the ultimate script, the roster entry.
// - Logic lives in ravenState.js (sim) and raven.js (command layer). ravenFx.js is render-only.
// - Frame-by-frame rationale: docs/raven/MOVE_FRAME_MAP.md.
// - Canon reference: https://www.dc.com/characters/raven (mystical control, telekinesis, defensive magic).
// - The brick routing, infusion, shell-contact and levitation-budget rules are ORIGINAL gameplay adaptations.
// - No healing, mind control, opponent-input reading or possession.
import { RAVEN_ANIM } from './ravenSprites.js'

// Authoring lever shared with the recent hand-built fighters (Rangers / Krybot / Luffy / Cyborg): stored = round(raw × 1.7).
// Raven is NOT on rosterParity.js's extra ×1.3 list. Every "raw" number below is the brief's raw value.
export const RAVEN_DAMAGE_SCALE = 1.95
export const dmg = raw => Math.round(raw * RAVEN_DAMAGE_SCALE)

// ── LEVITATION (L2 / Charge TAP toggle; never hold-to-charge) ──
// Vertical motion uses flight.js's exported smoothing primitives (flightAxisStep / flightSoftLimit), as drones.js does.
// Horizontal motion is the shared air steering: exactly the grounded walk speed, never faster.
export const LEV = {
  cost: 10,                 // Energy to enter (checked and spent on acceptance)
  drain: 0.1,               // Energy per frame (6 / second)
  maxFrames: 120,           // maximum continuous duration
  startFrames: 10,          // Beginning to Levitate pose (both authored frames)
  endFrames: 12,            // exit transition (lift reversed → descent pose), then the ordinary fall
  liftVy: -3.0, liftFrames: 10,              // ground entry: a short visible lift (≈ 30 px) during the start pose
  axis: { accel: 0.45, drag: 0.78, reverseBrake: 0.6, overspeedDrag: 0.9 },   // flight.js axis profile (gentle)
  maxVy: 2.6,               // bounded gentle vertical speed (px / frame)
  ceilingAbove: 240,        // feet never rise more than 240 px above the standing floor (no screen escape)
  ceilingY: -300,           // and never above world y -300 (inside the shared -360 ceiling)
}

// ── DARK PULSE (orb projectile) ──
export const ORB = {
  ground: { cost: 10, raw: 32, speed: 9, life: 66, r: 12, hitstun: 22, kbx: 4, kby: -2, y: 0.36 },
  air: { cost: 12, raw: 32, speed: 9, life: 62, r: 12, hitstun: 22, kbx: 4, kby: -2, y: 0.40 },
  ult: { raw: 30, speed: 13, life: 22, r: 14, hitstun: 40, kbx: 1, kby: 0, y: 0.36 },   // ultimate opener (≈ 286 px range)
}

// ── DARK GEOMETRY: brick piles (owned spell objects, serialized sim state) ──
export const PILE = {
  offset: 80,               // pile centres ≈ 80 px in front of and behind Raven's centre
  torso: 0.38,              // pile centre height = body top + 38 % of body height (visible torso height)
  life: 180,                // idle lifetime (frames)
  max: 2,                   // per owner, idle piles + live brick projectiles together
  w: 70, h: 36,             // hostile-hit box (the art is 37×18 px × 2.2 scale)
  margin: 20,               // keep piles this far inside the stage edges
}
export const BRICK = {
  send: { cost: 8, raw: 46, speed: 14, life: 72, r: 20, hitstun: 26, kbx: 7, kby: -3 },          // Telekinetic Send (idle pile)
  conjure: { cost: 18, raw: 46, speed: 14, life: 72, r: 20, hitstun: 26, kbx: 7, kby: -3 },       // Send with no pile (conjured)
  infused: { raw: 56, speed: 15, life: 64, r: 22, hitstun: 30, kbx: 8, kby: -3 },                 // orb + idle pile (replaces both)
  verdict: { raw: 54, r: 22, hitstun: 30, kbx: 2, kby: -6, vy0: 5, g: 0.8, vmax: 16, life: 60 },   // Falling Verdict drop
}
export const VERDICT = { costPile: 15, costConjure: 25, reach: 340, minAhead: 40, rise: 200 }   // column ≤ 220 px ahead; top 200 px above the floor

// ── SOUL SHELL ──
export const SHELL = { cost: 18, startup: 8, active: 30, recovery: 22, cooldown: 180, contacts: 2 }

export const AIR = { pulsePerAirtime: 1, levPerAirtime: 1 }
export const UP_GRACE = 3   // a fresh grounded Up holds the jump 3 f, so Up pressed 1-2 f before Special is Falling Verdict (keyboard W; pad Cross jumps at once)

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 18, blockstun: 11, rangeX: 56, rangeY: 44, boxY: 18, knockbackX: 3, knockbackY: -2, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery.
export const RAVEN_MOVES = {
  // J1 / J2 / J3: fresh Light retaps after a clean hit, three stages maximum.
  light: n(17, 5, 2, 9, { hitstun: 17, blockstun: 10, rangeX: 52, knockbackX: 2 }),                                        // Shadow Jab
  rJ2: n(21, 7, 2, 12, { hitstun: 19, blockstun: 11, rangeX: 66, knockbackX: 3 }),                                          // Palm Extension
  rJ3: n(28, 10, 3, 17, { hitstun: 24, blockstun: 12, rangeX: 70, knockbackX: 7, knockbackY: -3 }),                         // Cloaked Finish
  heavy: n(52, 14, 3, 22, { category: 'heavy', hitstun: 28, blockstun: 14, rangeX: 82, boxY: 14, knockbackX: 5 }),          // Dark Palm
  rLow: n(24, 8, 2, 15, { hitLevel: 'low', hitstun: 20, blockstun: 12, rangeX: 64, rangeY: 30, boxY: 66 }),                 // Low Ground Check
  up: n(40, 12, 3, 21, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 54, rangeY: 104, boxY: -34, launchVy: -20, selfVy: 0 }),   // Rising Palm
  air: n(29, 8, 3, 14, { hitstun: 24, rangeX: 70, rangeY: 54, boxY: 20, knockbackX: 3, knockbackY: -3 }),                  // Aerial Palm
  // Forward+Heavy chain: advancing palm → fresh Heavy dark strike → fresh Heavy knock-away.
  rAdv: n(30, 12, 3, 18, { category: 'heavy', hitstun: 26, blockstun: 12, rangeX: 62, travel: [2, 12, 4] }),
  rDark: n(34, 12, 3, 20, { category: 'heavy', hitstun: 26, blockstun: 13, rangeX: 78, boxY: 14 }),
  rKnock: n(42, 15, 3, 26, { category: 'heavy', hitstun: 28, blockstun: 14, rangeX: 72, knockbackX: 10, knockbackY: -4 }),
  // SPECIALS: body-less spell moves. The orb / pile / brick is the hit; ravenState drives each timeline.
  rPulse: n(0, 12, 1, 22, { category: 'special', isSpecial: true, noBody: true, cost: ORB.ground.cost }),                   // Dark Pulse
  rAirPulse: n(0, 14, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: ORB.air.cost, air: true }),        // air Dark Pulse
  rLift: n(0, 20, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: 18 }),                                 // Lift the Room
  rSend: n(0, 10, 1, 16, { category: 'special', isSpecial: true, noBody: true, cost: BRICK.send.cost }),                    // Telekinetic Send (idle pile)
  rConjure: n(0, 20, 1, 18, { category: 'special', isSpecial: true, noBody: true, cost: BRICK.conjure.cost }),              // Send with no pile
  rVerdict: n(0, 24, 1, 20, { category: 'special', isSpecial: true, noBody: true }),                                        // Falling Verdict (cost by route)
  rShield: n(0, SHELL.startup, SHELL.active, SHELL.recovery, { category: 'special', isSpecial: true, noBody: true, cost: SHELL.cost, shell: true }),   // Soul Shell
  // ULTIMATE OPENER: a visible short Dark Pulse, raw 30. A clean hit starts AZARATH; a miss or block gives 60 f recovery.
  rUltOpen: n(0, 30, 1, 60, { category: 'ultimate', isUltimate: true, noBody: true, cost: 100 }),
}
export const CHAIN = { light: 'rJ2', rJ2: 'rJ3' }
export const SPECIAL_FROM = ['light', 'rJ2', 'rJ3', 'heavy', 'rLow', 'rAdv', 'rDark', 'rKnock']   // clean contact, recovery only
export const HEAVY_FROM = ['light', 'rJ2', 'rLow']
export const ULT_FROM = ['heavy', 'rJ3', 'rDark', 'rKnock']
export const GROUND_ONLY = ['light', 'rJ2', 'rJ3', 'heavy', 'rLow', 'up', 'rAdv', 'rDark', 'rKnock', 'rPulse', 'rLift', 'rSend', 'rConjure', 'rVerdict', 'rShield', 'rUltOpen']

// ── ULTIMATE: AZARATH — THE ROOM OBEYS (frames from the confirm; frozen-cinematic contract) ──
//   0–39   supplied cutscene portrait cut-in (bounded 40 f)
//  40–59   Raven rises: Beginning to Levitate → the Levitating loop (lift 48 px)
//  60–79   two cinematic brick piles rise beside the target (bounded positions)
//  80–91   first pile thrown → contact @92 raw 40
//  96–107  second pile thrown → contact @108 raw 40
// 112–125  Raven descends to the floor (levitation exit pose)
// 126–163  her real shell closes around HER: Putting Up Shield → Shield loop
// 164–181  Shield End reveals her; release pose; final energy release contact @180 raw 160 (Energy Exploding on the target)
// 182–209  settle (explosion and brick debris finish)
// Opener 30 + 40 + 40 + 160 = 270 raw before shared scaling. One resource transaction (100 Energy at the opener).
export const ULT = { total: 210, cutIn: 40, settle: 182, rise: 48,
  contacts: [{ at: 92, raw: 40, kind: 'brick', pile: 0 }, { at: 108, raw: 40, kind: 'brick', pile: 1 }, { at: 180, raw: 160, kind: 'release' }],
  piles: [{ rise: 60, throw: 80, hit: 92 }, { rise: 64, throw: 96, hit: 108 }] }

// Frame timelines (which strip frame shows at which elapsed tick). See MOVE_FRAME_MAP.md.
const spread = (n, len, start = 0) => Array.from({ length: n }, (_, i) => [start + Math.round(i * len / n), i])
// cyc: a looping strip of nFrames cells, `step` frames per cell, from `from` until `until` (exclusive), cell offset `base`
const cyc = (from, until, step, nFrames, base = 0) => Array.from({ length: Math.ceil((until - from) / step) }, (_, i) => [from + i * step, base + i % nFrames])
export const TIMELINE = {
  light: [[0, 0], [2, 1], [5, 2], [8, 3]],                                // pa0 → pa3 (strike pose on the active frame 5)
  rJ2: [[0, 0], [3, 1], [7, 2], [9, 3], [14, 4], [18, 5]],
  rJ3: [[0, 0], [5, 1], [10, 2], [13, 3], [20, 4], [26, 5]],
  heavy: [[0, 0], [3, 1], [7, 2], [11, 3], [14, 4], [17, 5], [24, 6], [30, 7], [35, 8]],
  rLow: [[0, 0], [4, 1], [8, 2], [10, 3], [18, 4]],
  up: [[0, 0], [4, 1], [8, 2], [12, 3], [16, 4], [26, 5]],
  air: [[0, 0], [3, 1], [8, 2], [11, 3], [18, 4]],
  rAdv: [[0, 0], [4, 1], [8, 2], [12, 3], [15, 4], [24, 5]],
  rDark: [[0, 0], [5, 1], [12, 2], [15, 3], [26, 4]],
  rKnock: [[0, 0], [4, 1], [8, 2], [12, 3], [15, 4], [19, 5], [34, 6]],
  rPulse: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], [16, 5], [20, 6], [25, 7], [29, 8], [32, 9]],       // orb leaves on shot4 (frame 12)
  rAirPulse: [[0, 0], [4, 1], [8, 2], [14, 3], [18, 4], [24, 5], [29, 6]],                            // orb leaves on ashot3 (frame 14)
  rLift: spread(17, 39),                                                                               // all 17 frames over 39 f; piles appear on frame 20
  rSend: [[0, 0], [3, 1], [6, 2], [10, 3], [15, 4], [21, 5]],                                         // throw half: release on brick12 (frame 10)
  rConjure: spread(17, 39),
  rVerdict: [[0, 0], [4, 1], [8, 2], [12, 3], [16, 4], [20, 5], [24, 6], [28, 7], [34, 8], [40, 9]],
  // Soul Shell: one 60-frame move. Entry (all 6 Putting Up Shield frames) → loop (all 8 Shield frames, 3 f each)
  // → Shield End (all 3) during the 22-frame recovery. An early end jumps the timer to the recovery start.
  rShield: [...spread(6, SHELL.startup), ...cyc(SHELL.startup, SHELL.startup + SHELL.active, 3, 8, 6),
    [SHELL.startup + SHELL.active, 14], [SHELL.startup + SHELL.active + 7, 15], [SHELL.startup + SHELL.active + 14, 16]],
  rUltOpen: [[0, 0], [5, 1], [10, 2], [15, 3], [24, 4], [30, 5], [42, 6], [56, 7], [70, 8], [82, 9]],
  // ultimate pose strips (driven by the cinematic frame through ravenState.pose)
  ultRise: [[0, 0], [10, 1]], ultHover: cyc(0, 120, 5, 8),
  ultCast: spread(6, 20), ultThrow: spread(6, 14), ultShell: [...spread(6, 12), ...cyc(12, 120, 3, 8, 6)],
  ultRelease: [[0, 0], [6, 1], [12, 2], [18, 3], [22, 4], [28, 5]],
}
TIMELINE.ultOpen = TIMELINE.rPulse
// The shield move renders one combined strip (entry + loop + end); the ultimate opener reuses the pulse strip.
const ANIM_ALIAS = { rUltOpen: 'rPulse' }

export const raven = {
  rosterKey: 'raven', name: 'Raven', displayName: 'Raven', civilianIdentity: 'Rachel Roth', universe: 'dc',
  color: '#6838f0', series: 'Teen Titans', era: 'Teen Titans / supplied Game Boy Advance artwork',
  tagline: 'Everything has its place.', archetype: 'Mobile Spellweaver / Telekinetic Setup',
  bio: 'Rachel Roth: mystical control, telekinesis and defensive magic. She raises piles of the room\'s own bricks, sends them, drops them or infuses them with a Dark Pulse, and closes her soul-self around her as a shell. Brick routing, infusion and the shell\'s contact budget are game adaptations.',
  primary: 'zoner', secondary: ['trickster'], archetypes: ['zoner', 'trickster'],
  traits: { hasEnergy: true, energyType: 'magic', energyName: 'Energy', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Energy', color: '#9a78ff' },
  // speed 94 → 8.5 px / f walk (physics.js: 4.5 + (94 − 78) / 20 × 5): the agile band (S.P.D. Pink / Beast Boy 92 → 8.0,
  // White Ranger 97 → 9.25). maxJumps 2 = the SHARED double jump (physics.js), no Raven-specific jump code or Energy tax.
  stats: { maxHealth: 1080, maxEnergy: 100, attack: 80, defense: 74, speed: 94, jumpPower: 25, maxJumps: 2, weight: 1,
    dashSpeed: 14, dashDuration: 10, dashCooldownMax: 34 },
  hasSprites: true, spriteScale: 2.2, spriteSheet: RAVEN_ANIM.idle.sheet, portrait: './assets/raven/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro', 'idle'],
  basic_attacks: { light: RAVEN_MOVES.light, heavy: RAVEN_MOVES.heavy, crouchLight: RAVEN_MOVES.rLow, upAttack: RAVEN_MOVES.up,
    airAttack: RAVEN_MOVES.air, downAir: RAVEN_MOVES.air,   // air Light / Heavy (with or without Down) = Aerial Palm (raven.js); no spike move exists
    grab: { damage: dmg(28), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 9, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: 'Dark Pulse (air: midair Dark Pulse)', cost: ORB.ground.cost }, forward: { name: 'Telekinetic Send', cost: BRICK.send.cost },
    up: { name: 'Falling Verdict', cost: VERDICT.costPile }, down: { name: 'Lift the Room', cost: 18 }, back: { name: 'Soul Shell', cost: SHELL.cost } },
  ultimate: { name: 'AZARATH — THE ROOM OBEYS', cost: 100,
    description: '30 f Dark Pulse opener (raw 30). Clean hit: cut-in → Raven rises → two brick impacts 40 + 40 → her shell closes and opens → final energy release 160 (270 raw before shared scaling). Miss / block: 60 f recovery.' },
  animationData: Object.fromEntries(Object.entries({ ...RAVEN_ANIM, rShield: RAVEN_ANIM.rShieldAll, ...Object.fromEntries(Object.entries(ANIM_ALIAS).map(([k, v]) => [k, RAVEN_ANIM[v]])) })
    .map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
}
