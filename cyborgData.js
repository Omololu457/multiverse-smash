// Cyborg (Victor Stone, Teen Titans — supplied Game Boy Advance art). DATA ONLY: frame data, Heat / Power constants,
// projectile profiles, the ultimate script and the roster entry. Logic: cyborgState.js (sim), cyborg.js (command layer),
// cyborgFx.js (render-only). Frame-by-frame rationale: docs/cyborg/MOVE_FRAME_MAP.md. Canon reference:
// https://www.dc.com/characters/cyborg (technological weaponry + super-strength). Heat / reload / cancel rules are
// ORIGINAL gameplay adaptations; no hacking, regeneration, flight or Boom Tube.
import { CYBORG_ANIM } from './cyborgSprites.js'

// Authoring lever shared with the recent hand-built fighters (Rangers / Krybot / Luffy): stored = round(raw × 1.7).
// Cyborg is NOT on rosterParity.js's extra ×1.3 list. Every "raw" number below is the brief's raw value.
export const CYBORG_DAMAGE_SCALE = 1.95
export const dmg = raw => Math.round(raw * CYBORG_DAMAGE_SCALE)

// ── HEAT (authoritative sim state, separate from Power). Fixed point: 1 Heat = 100 units (integers only). ──
export const HEAT = {
  Q: 100, max: 10000,                     // 0..100 Heat
  warn: 6000,                             // 60–99 warning band
  passive: 25,                            // 0.25 / eligible neutral tick
  vent: 75,                               // 0.75 / tick while the manual vent is open
  overheatMin: 60, overheatExit: 6000,    // ≥ 60 f AND Heat ≤ 60 before weapons return
  hotImpact: { min: 6000, vent: 2000 },   // Mega Punch clean hit at Heat ≥ 60 → −20 once
  ultFinal: 6000,                         // Heat after the ultimate completes, regardless of prior Heat
}
// Weapon emissions: Power + Heat per ACCEPTED emission (checked again before every later pulse / spawn).
export const WEAPON = {
  shot: { power: 12, heat: 1200 },
  pulse: { power: 5, heat: 1000 },
  missile: { power: 15, heat: 1800 },
  rack: { power: 6, heat: 800 },
  recoil: { power: 18, heat: 1600 },
}
export const VENT = { startup: 8, recovery: 12 }
export const THRUSTER = { cost: 8, vy: -19, vxKeep: 0.6 }            // second jump: bounded impulse, one per airtime
export const RESONANCE = { life: 90, popVy: -9, popVx: 1 }           // mark 90 f; conversion = short pop, near-zero carry
export const WEIGHT = 1.15                                           // received knockback ÷ 1.15 (no engine weight exists)
export const CANNON = { decideAt: 18, firstPulse: 22, spacing: 6, pulses: 4 }
export const RACK = { first: 24, spacing: 8, count: 5 }
export const SLAM = { hang: 8, vy: 13, maxFall: 40 }

// Projectile profiles (engine projectiles via W.spawn: shared block chip / combo scaling / juggle / hitstop / reflect).
// Finite lifetime + range; no homing; one hit then consumed (engine contract).
export const PROJ = {
  shot: { raw: 32, speed: 13, life: 40, w: 30, h: 26, hitstun: 22, kbx: 4, kby: -2, art: 'sonic', y: 0.34 },
  pulse: { raw: 14, speed: 14, life: 34, w: 30, h: 26, hitstun: 15, kbx: 2, kby: -1, art: 'sonic', y: 0.34 },
  missile: { raw: 46, speed: 9, life: 72, w: 26, h: 14, hitstun: 26, kbx: 6, kby: -4, art: 'missile', y: 0.3 },
  rack: { raw: 14, speed: 8, life: 64, w: 24, h: 12, hitstun: 14, kbx: 2, kby: -1, art: 'missile', y: 0.18 },
}
// Missile Rack spread: vy per emission (px / frame), captured with the facing at the emission. Fixed table, no RNG.
export const RACK_VY = [-1.1, -0.45, 0.2, 0.85, 1.5]

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 18, blockstun: 11, rangeX: 56, rangeY: 44, boxY: 16, knockbackX: 3, knockbackY: -2, ...extra })

// ── MOVES ── startup = frames before the first active frame; total = startup + active + recovery.
export const CYBORG_MOVES = {
  // J1 / J2 / J3 — fresh Light retaps after a clean hit, three stages maximum.
  light: n(22, 6, 2, 10, { hitstun: 18, blockstun: 10, rangeX: 54, knockbackX: 2 }),                                 // Servo Jab
  cJ2: n(28, 8, 2, 12, { hitstun: 20, blockstun: 11, rangeX: 70, knockbackX: 3 }),                                   // Piston Straight
  cJ3: n(36, 11, 3, 18, { hitstun: 24, blockstun: 12, rangeX: 64, knockbackX: 7 }),                                  // Shoulder Finish
  heavy: n(66, 16, 3, 24, { category: 'heavy', hitstun: 30, blockstun: 14, rangeX: 84, boxY: 12, knockbackX: 5 }),   // Hydraulic Cross
  cLow: n(28, 9, 2, 16, { hitLevel: 'low', hitstun: 20, blockstun: 12, rangeX: 66, rangeY: 30, boxY: 66 }),          // Low Drive
  up: n(46, 13, 3, 22, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, rangeX: 56, rangeY: 104, boxY: -36, launchVy: -21, selfVy: 0 }),   // Rising Piston
  air: n(36, 9, 3, 16, { hitstun: 26, rangeX: 74, rangeY: 56, boxY: 18, knockbackX: 3, knockbackY: -3 }),           // Aerial Punch
  // Forward+Heavy chain: advancing punch → fresh Heavy piston strike → fresh Heavy knock-away.
  cAdv: n(30, 12, 3, 18, { category: 'heavy', hitstun: 26, blockstun: 12, rangeX: 62, travel: [2, 12, 4] }),
  cPiston: n(34, 12, 3, 20, { category: 'heavy', hitstun: 26, blockstun: 13, rangeX: 80, boxY: 12 }),
  cKnock: n(44, 15, 3, 26, { category: 'heavy', hitstun: 28, blockstun: 14, rangeX: 72, knockbackX: 9, knockbackY: -4 }),
  // SPECIALS (body-less weapon moves: the projectile is the hit; their timeline is driven by cyborgState)
  cSonic: n(0, 12, 1, 20, { category: 'special', isSpecial: true, noBody: true, weapon: true }),                     // Sonic Shot (tap route)
  cCannon: n(0, 22, 19, 16, { category: 'special', isSpecial: true, noBody: true, weapon: true }),                   // held route: 4 pulses @22/28/34/40
  cMissile: n(0, 18, 1, 22, { category: 'special', isSpecial: true, noBody: true, weapon: true, cost: 15 }),         // Straight Missile
  cRack: n(0, 24, 33, 16, { category: 'special', isSpecial: true, noBody: true, weapon: true }),                     // Missile Rack: 5 spawns @24..56
  cMega: n(78, 22, 4, 30, { category: 'special', isSpecial: true, cost: 20, hitstun: 32, blockstun: 16, knockbackX: 5, knockbackY: -7, mega: true, shock: { back: 26, fwd: 112, h: 40 } }),
  cSlamAir: n(0, 1, 1, 999, { category: 'special', isSpecial: true, noBody: true, cost: 20 }),                       // air Down+Special: hang → capped descent (sim-owned)
  cSlamLand: n(64, 1, 4, 26, { category: 'special', isSpecial: true, hitstun: 28, blockstun: 15, knockbackX: 5, knockbackY: -6, mega: true, shock: { back: 26, fwd: 100, h: 40 } }),
  cRecoil: n(28, 10, 3, 24, { category: 'special', isSpecial: true, damageType: 'energy', hitstun: 22, blockstun: 13, rangeX: 70, rangeY: 50, boxY: 14, knockbackX: 10, knockbackY: -2, recoil: { vx: 6, frames: 10 } }),
  cVent: n(0, 999, 1, 12, { category: 'special', noBody: true, vent: true }),
  // ULTIMATE OPENER — visible short sonic contact, raw 30. Clean hit → BOOYAH PROTOCOL; miss / block → 60 f recovery.
  cUltOpen: n(30, 30, 3, 60, { category: 'ultimate', isUltimate: true, cost: 100, damageType: 'energy', hitstun: 40, blockstun: 16, rangeX: 118, rangeY: 50, boxY: 14, knockbackX: 1 }),
}
export const CHAIN = { light: 'cJ2', cJ2: 'cJ3' }
export const SPECIAL_FROM = ['light', 'cJ2', 'cJ3', 'heavy', 'cLow', 'cAdv', 'cPiston', 'cKnock']   // clean contact, recovery only
export const HEAVY_FROM = ['light', 'cJ2', 'cLow']
export const ULT_FROM = ['heavy', 'cJ3', 'cPiston', 'cKnock']

// ── ULTIMATE: BOOYAH PROTOCOL — FULL SYSTEMS IMPACT (frames from confirm; frozen-cinematic contract) ──
//   0–39  supplied cutscene portrait cut-in (bounded 40 f), Cyborg braces in the cannon pose
//  40–69  Sonic Cannon anchor, contact @52 raw 40
//  70–109 authored rack loop: three cinematic missiles, contacts @82/@90/@98 raw 20 each
// 110–149 rocket reboost (supplied thruster frames) → aerial punch, contact @134 raw 40
// 150–209 full Mega Punch, impact @172 raw 110 (cMega's own contact frame 22), knockdown
// Opener 30 + 40 + 60 + 40 + 110 = 280 raw before shared scaling. One resource transaction (100 Power at the opener).
export const ULT = { total: 216, cutIn: 40, settle: 200,
  contacts: [{ at: 52, raw: 40, kind: 'cannon' }, { at: 82, raw: 20, kind: 'missile' }, { at: 90, raw: 20, kind: 'missile' },
    { at: 98, raw: 20, kind: 'missile' }, { at: 134, raw: 40, kind: 'air' }, { at: 172, raw: 110, kind: 'mega' }],
  missiles: [72, 80, 88], missileFlight: 10 }

// Frame timelines (which strip frame shows at which elapsed tick) — see MOVE_FRAME_MAP.md.
const loop = (from, n, step, frames) => Array.from({ length: n }, (_, i) => frames.map((f, j) => [from + i * step + j * Math.floor(step / frames.length), f])).flat()
export const TIMELINE = {
  light: [[0, 0], [5, 1], [9, 2]], cJ2: [[0, 0], [3, 1], [8, 2], [10, 3], [15, 4], [19, 5]],
  cJ3: [[0, 0], [7, 1], [11, 2], [14, 3], [21, 4], [27, 5]],
  heavy: [[0, 0], [3, 1], [7, 2], [11, 3], [16, 4], [19, 5], [27, 6], [33, 7], [39, 8]],
  cLow: [[0, 0], [4, 1], [9, 2]], up: [[0, 0], [13, 1], [18, 2], [28, 3]],
  air: [[0, 0], [3, 1], [9, 2], [11, 3], [14, 4], [19, 5], [24, 6]],
  cAdv: [[0, 0], [5, 1], [12, 2], [15, 3], [24, 4]], cPiston: [[0, 0], [12, 1], [15, 2], [26, 3]],
  cKnock: [[0, 0], [7, 1], [15, 2], [18, 3], [30, 4], [38, 5]],
  cShot: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], [19, 5], [25, 6], [29, 7]],
  cCannon: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], ...loop(22, 3, 6, [4, 5]).map(([t, f]) => [t, f]), [40, 4], [41, 6], [45, 7], [50, 8], [54, 9]],
  cMissile: [[0, 0], [5, 1], [11, 2], [15, 3], [18, 4], [24, 5], [30, 6], [36, 7]],
  cRack: [[0, 0], [5, 1], [10, 2], [15, 3], [20, 4], ...loop(24, 5, 8, [5, 6, 7]), [57, 8], [65, 9]],
  cMega: [[0, 0], [6, 1], [12, 2], [19, 3], [22, 4], [24, 5], [26, 6], [32, 7], [40, 8], [48, 9], [53, 10]],
  cSlamAir: [[0, 0]], cSlamLand: [[0, 0], [2, 1], [4, 2], [6, 3], [12, 4], [18, 5], [24, 6], [28, 7]],
  cRecoil: [[0, 0], [5, 1], [10, 2], [13, 3], [24, 4], [31, 5]], cVent: [[0, 0]],
  cUltOpen: [[0, 0], [8, 1], [16, 2], [24, 3], [30, 4], [36, 5]],
  // ultimate pose strips (driven by the cinematic frame through cyborgState.pose)
  ultOpen: [[0, 0], [8, 1], [16, 2], [24, 3], [30, 4]], ultCannon: loop(0, 6, 6, [0, 1]),
  ultRack: [[0, 0], ...loop(2, 5, 8, [1, 2, 3])], ultBoost: [[0, 0], [5, 1], [10, 2]], ultAir: [[0, 0], [6, 1], [10, 2]],
}
TIMELINE.ultMega = TIMELINE.cMega
// Sonic Shot reuses the cannon strip's frame set; the shot move is keyed cSonic but renders the cShot strip.
const ANIM_ALIAS = { cSonic: 'cShot', cUltOpen: 'ultOpen' }

export const cyborg = {
  rosterKey: 'cyborg', name: 'Cyborg', displayName: 'Cyborg', civilianIdentity: 'Victor Stone', universe: 'dc',
  color: '#3a8fe8', series: 'Teen Titans', era: 'Teen Titans / supplied Game Boy Advance artwork',
  tagline: 'Bring the noise.', archetype: 'Thermal Bruiser / Artillery',
  bio: 'Victor Stone: technological weaponry and super-strength. Every weapon builds Heat; overheating locks his weapons but never his fists, and a Mega Punch landed hot vents the system. Heat, venting, Sonic Resonance and Hot Impact are game adaptations.',
  primary: 'zoner', secondary: ['bruiser'], archetypes: ['zoner', 'bruiser'],
  traits: { hasEnergy: true, energyType: 'tech', energyName: 'Power', mobility: 'normal', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Power', color: '#5ab8ff' },
  stats: { maxHealth: 1240, maxEnergy: 100, attack: 84, defense: 82, speed: 84, jumpPower: 25, maxJumps: 1, weight: WEIGHT,
    dashSpeed: 13, dashDuration: 10, dashCooldownMax: 38 },
  hasSprites: true, spriteScale: 2.0, spriteSheet: CYBORG_ANIM.idle.sheet, portrait: './assets/cyborg/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro', 'idle'],
  basic_attacks: { light: CYBORG_MOVES.light, heavy: CYBORG_MOVES.heavy, crouchLight: CYBORG_MOVES.cLow, upAttack: CYBORG_MOVES.up,
    airAttack: CYBORG_MOVES.air, downAir: CYBORG_MOVES.air,   // air Light with or without Down = the same Air Hammer (cyborg.js); no spike move exists
    grab: { damage: dmg(30), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 9, throwForceY: -4, damageType: 'grab' } },
  specials: { neutral: { name: 'Sonic Shot / Sonic Cannon (hold)', cost: 12 }, forward: { name: 'Straight Missile', cost: 15 },
    up: { name: 'Missile Rack', cost: 30 }, down: { name: 'Mega Punch / air slam', cost: 20 }, back: { name: 'Sonic Recoil', cost: 18 } },
  ultimate: { name: 'BOOYAH PROTOCOL — Full Systems Impact', cost: 100,
    description: '30 f sonic opener (raw 30). Clean hit: cut-in → cannon 40 → three missiles 20 each → reboost aerial punch 40 → full Mega Punch 110 (280 raw before shared scaling). Heat ends at 60. Miss / block: 60 f recovery.' },
  animationData: Object.fromEntries(Object.entries({ ...CYBORG_ANIM, ...Object.fromEntries(Object.entries(ANIM_ALIAS).map(([k, v]) => [k, CYBORG_ANIM[v]])) })
    .map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : (k === 'cSonic' ? { ...a, frameTimeline: TIMELINE.cShot } : a)])),
}
