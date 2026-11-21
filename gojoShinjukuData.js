// Satoru Gojo — Shinjuku Arc (gojo_shinjuku) — DATA ONLY: frame data, costs, Limitless profile, chant schedule, the roster
// entry. Logic: limitless.js (shared Limitless module), gojoShinjukuState.js (sim + command layer), gojoShinjukuFx.js
// (render / HUD / sound cues). Art: the FinhJ "Satoru Gojo Shinjuku Arc" sheet (credits ZebrasBlack, R0B4N), sliced by
// tools/gojoshinjuku/slice.py. Docs: docs/msv1/gojo/ (LEDGER, LIMITLESS, COMBOS, BALANCE_NOTES).
// The OLD Gojo (`gojo`) is a different character and is not touched by any of this.
import { GOJO_SHINJUKU_ANIM } from './gojoShinjukuSprites.js'

export const GS_KEY = 'gojo_shinjuku'
// Authoring lever: stored damage = round(raw / 0.6) so the engine's global ×0.6 write scale lands the brief's number
// (measured clean hit ≈ raw, before combo scaling and the defender's defence multiplier).
export const dmg = raw => Math.round(raw / 0.6)
export const GS_SCALE = 2           // integer nearest-neighbour presentation scale (≈64 px sheet body → ≈128 px)
export const SCREEN = 1280          // reference screen width for "% of screen" distances (elements.js SCREEN_REF)
export const BAR = 100              // one super bar = 100 energy (the engine meter); maxEnergy 300 = 3 bars

// ── CURSED ENERGY (fixed point: 1 CE = 600 units, so every per-second rate below is a whole number per frame) ──
export const CE_UNIT = 600
export const CE = { max: 100, start: 60, regen: 6, onHit: 4, depletedLock: 120, zoneRegenMult: 1.5 }
// per-second rates → units per frame (all exact integers)
export const perFrame = perSec => Math.round(perSec * CE_UNIT / 60)

// ── INFINITY (invisible; 3 levels). drain CE/s, stopped-hit tax (fraction of the stopped hit's damage), radii in px
//    measured from his hurtbox edge. L2 adds a repel ring; L3 scales both radii ×1.6 and stops supers. ──
export const INFINITY = {
  tapFrames: 12, level2At: 30, level3At: 60,
  levels: {
    1: { name: 'Infinity', drain: 5, tax: 0.06, boundary: 14, slow: 120, repel: 0, supers: 'connect' },
    2: { name: 'Infinity: Repel', drain: 9, tax: 0.04, boundary: 14, slow: 120, repel: 48, supers: 'half' },
    3: { name: 'Infinity: Absolute', drain: 22, tax: 0.03, boundary: 14 * 1.6, slow: 120 * 1.6, repel: 48 * 1.6, supers: 'stop' },
  },
  pinFrames: 36, pinLockout: 180,   // Infinity + Blue: an opponent pulled into the boundary is pinned 0.6 s, once per 3 s
  hangFrames: 50,                   // a stopped projectile hangs at the boundary this long before it dissipates
  mahoragaTurns: 3,                 // canon bypass: Mahoraga's wheel turns per stopped hit; after 3 it ignores Infinity
}

// ── TECHNIQUE COSTS (CE) / BARS ──
export const COST = { lapse: 15, maxBlue: 35, blueStep: 10, blueFist: 8, red: 15, delayedRed: 18, redRush: 20,
  purple: 40, purple200: 70, fbe: 15, domain: 50 }
export const BARS = { purple: 1, purple200: 2, domain: 1 }
export const PERFECT_OUTPUT_REFUND = 0.30

// ── FIELDS (limitless.js profiles). r = radius px, pull = px/frame at the edge (grows toward the core). ──
export const LAPSE = { release: 12, holdMax: 18, life: 48, near: 0.25, far: 0.60, r: 200, core: 44, pull: 3, pullCore: 9,
  ticks: [12, 24, 36, 48], raw: 12, hitstun: 14, airAngle: 0.7 }
export const MAXBLUE = { release: 18, life: 150, drift: 2.5, r: SCREEN / 2, core: 58, pull: 2.2, pullCore: 7,
  every: 12, hits: 8, raw: 10, hitstun: 16 }
export const BLUESTEP = { startup: 3, travel: 6, dist: 0.45, airUses: 2 }
export const RED = { release: 14, reach: 120, h: 80, raw: 70, hitstun: 26, kbx: 17, kby: -7, reflectReach: 220, reflectFrames: 10, wallBounce: true }
export const DELAYED = { ahead: 130, life: 72, r: 110, raw: 60, hitstun: 24, kbx: 14, kby: -6, extra: 3 }
export const PURPLE = { release: 76, speed: 9, r: 40, life: 170, raw: 300, chip: 0.40, hitstun: 40, kbx: 16, kby: -9, domeFrames: 40 }
// 200 %: three chant lines (the sheet's strips), each with a 10-frame press window; each success adds +⅓ (100 → 200 %).
export const CHANT = { start: 18, line: 60, window: [30, 40], finalFrames: 42, recovery: 40,
  baseRaw: 230, r100: 40, r200: 70, speed: 8, life: 190 }
export const CHANT_FIRE = CHANT.start + 3 * CHANT.line + CHANT.finalFrames                // 240
export const DOMAIN = { activateAt: 24, duration: 15, cooldown: 30 * 60, burnout: 5 * 60, clashWindow: 30, clashFrames: 90, clashWin: 60 }
export const FBE = { cd: 8 * 60, window: [2, 13], raw: 50, hitstun: 22, kbx: 14, kby: -4 }
export const RCT = { cd: 15 * 60, rate: 30, hpPerCe: 1.5, maxHp: 120, brainHold: 90, brainCost: 40 }
export const BLACK_FLASH = { window: 2, zoneWindow: 3, mult: 2.5, ce: 10, zone: 6 * 60, moves: ['gB', 'gC', 'gBlueFist'] }
export const THROW = { range: 26, holdAt: 18, raw: 90, kbx: 10, kby: -15 }
export const RED_RUSH = { travel: [2, 16, 14], crumple: 18, launchVy: -15 }

const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 9, rangeX: 48, rangeY: 40, boxY: 18, knockbackX: 3, knockbackY: -2, damageType: 'blunt', ...extra })
const tech = (startup, recovery, extra = {}) => n(0, startup, 1, recovery, { category: 'special', isSpecial: true, noBody: true, damageType: 'energy', ...extra })

// ── MOVES (startup = frames before the first active frame, 60 sim ticks / s) — docs/msv1/gojo/COMBOS.md ──
export const GS_MOVES = {
  gA1: n(30, 5, 2, 9, { anim: 'a', rangeX: 44 }),
  gA2: n(30, 5, 2, 10, { anim: 'a', rangeX: 52 }),
  gA3: n(45, 6, 3, 14, { anim: 'a', hitstun: 20, blockstun: 11, rangeX: 56, knockbackX: 6 }),
  gB: n(68, 9, 3, 16, { anim: 'b', category: 'heavy', hitstun: 22, blockstun: 12, rangeX: 64, knockbackX: 6 }),
  gC: n(84, 12, 4, 18, { anim: 'c', category: 'launcher', launcher: true, hitstun: 26, blockstun: 12, rangeX: 62, rangeY: 86, boxY: -20, launchVy: -30 }),
  gSweep: n(48, 7, 3, 16, { anim: 'crouch', hitLevel: 'low', hitstun: 20, blockstun: 10, rangeX: 60, rangeY: 24, boxY: 66, knockbackY: -6 }),
  gAir: n(60, 6, 5, 10, { anim: 'jump', air: true, hitLevel: 'overhead', hitstun: 18, rangeX: 50, rangeY: 52, boxY: 30, knockbackX: 3, knockbackY: 4 }),
  gBlueFist: n(136, 9, 3, 18, { anim: 'b', category: 'heavy', isSpecial: true, cost: COST.blueFist, damageType: 'energy', hitstun: 26, blockstun: 13, rangeX: 66, knockbackX: -3, knockbackY: -1, blue: true }),
  gRedRush: n(90, 16, 3, 26, { anim: 'redRushFull', category: 'special', isSpecial: true, cost: COST.redRush, damageType: 'energy', hitstun: 40, blockstun: 14,
    rangeX: 58, rangeY: 50, boxY: 26, knockbackX: 1, knockbackY: 0, travel: RED_RUSH.travel, red: true }),
  gThrow: n(0, 5, 2, 22, { anim: 'throw', category: 'grab', noBody: true, damageType: 'energy' }),
  gLapse: tech(LAPSE.release, 16, { anim: 'lapseBlue', cost: COST.lapse, blue: true, airOk: true }),
  gMaxBlue: tech(MAXBLUE.release, 22, { anim: 'maxBlue', cost: COST.maxBlue, blue: true }),
  gBlueStep: tech(BLUESTEP.startup, BLUESTEP.travel + 8, { anim: 'blueStep', category: 'movement', cost: COST.blueStep, blue: true, airOk: true }),
  gRed: tech(RED.release, 18, { anim: 'red', cost: COST.red, red: true, airOk: true }),
  gPurple: tech(PURPLE.release, 34, { anim: 'purpleFull', cost: COST.purple, bars: BARS.purple, purple: true, super: true }),
  gPurple200: tech(CHANT_FIRE, CHANT.recovery, { anim: 'purple200Full', cost: COST.purple200, bars: BARS.purple200, purple: true, super: true }),
  gDomain: tech(DOMAIN.activateAt, 20, { anim: 'domain', category: 'ultimate', isUltimate: true, cost: COST.domain, bars: BARS.domain }),
  gFBE: tech(FBE.window[0], FBE.window[1] - FBE.window[0] + 10, { anim: 'guard', category: 'defense', cost: COST.fbe, free: true }),
  gRCT: tech(1, 6, { anim: 'win', category: 'defense', free: true }),
}
export const NORMALS = ['gA1', 'gA2', 'gA3', 'gB', 'gC', 'gSweep', 'gAir']
export const TECHNIQUES = ['gLapse', 'gMaxBlue', 'gBlueStep', 'gBlueFist', 'gRed', 'gRedRush', 'gPurple', 'gPurple200']
export const BURNOUT_LOCKED = new Set(['gLapse', 'gMaxBlue', 'gBlueStep', 'gBlueFist', 'gRed', 'gRedRush', 'gPurple', 'gPurple200', 'gDomain'])
export const A_CHAIN = { gA1: 'gA2', gA2: 'gA3' }

// ── frame timelines (elapsed tick → strip frame) ──
const even = (frames, from, to) => frames.map((f, i) => [Math.round(from + i * (to - from) / frames.length), f])
export const TIMELINE = {
  gA1: [[0, 0], [3, 1]], gA2: [[0, 2], [3, 3]], gA3: [[0, 4], [4, 5]],
  gB: [[0, 0], [3, 1], [6, 2], [9, 3], [16, 4]], gBlueFist: [[0, 0], [3, 1], [6, 2], [9, 3], [18, 4]],
  gC: [[0, 0], [4, 1], [12, 2], [16, 3], [26, 4]],
  gSweep: [[0, 2], [6, 3]], gAir: [[0, 2], [5, 3]],
  gRedRush: [[0, 0], [4, 1], [8, 2], [12, 3], [16, 4]],
  gThrow: [[0, 0], [4, 1], [THROW.holdAt, 2]],
  gLapse: [[0, 0], [4, 1], [8, 2], [12, 3]],
  gMaxBlue: [[0, 0], [5, 1], [10, 2], [18, 3], [26, 4]],
  gBlueStep: [[0, 0], [3, 1]],
  gRed: [[0, 0], [3, 1], [6, 2], [10, 3], [14, 4]],
  gPurple: [...even([0, 1, 2], 0, 18), ...even([3, 4, 5, 6, 7, 8], 18, 54), [54, 9], [74, 10], [78, 11], [82, 12], [98, 13]],
  gPurple200: [...even([0, 1, 2], 0, 18), [18, 3], [48, 4], [78, 5], [108, 6], [138, 7], [198, 8], [CHANT_FIRE, 9]],
  gDomain: [[0, 0], [8, 1], [16, 2], [24, 3]],
  gFBE: [[0, 0], [4, 1]], gRCT: [[0, 1]],
}

const A = GOJO_SHINJUKU_ANIM
const lock = a => ({ ...a, loop: false, lockLastFrame: true })
export const GS_ANIMATION = {
  idle: A.idle, walk: A.walk, walk_back: A.walk, run: { ...A.walk, speed: 4 }, dash: lock(A.dash),
  jump: lock(A.jumpRise), doubleJump: lock(A.jumpRise), fall: lock(A.fall), land: lock(A.crouchDown),
  crouch: lock(A.crouchDown), guard: lock(A.guard), hurt: lock(A.hurt), hurt_air: lock(A.hurt),
  knockdown: lock(A.knockdown), getup: lock(A.getup), intro: lock(A.intro), win: lock(A.win), lose: lock(A.lose),
  taunt: lock(A.win), transform: lock(A.ultAction), ultimate: lock(A.ultAction), domain: lock(A.domain),
  light: A.a, heavy: A.b, up: A.c, air: A.jump, down_air: A.jump, grab: A.throw,
  ...Object.fromEntries(Object.entries(GS_MOVES).map(([k, m]) => [k, { ...lock(A[m.anim]), frameTimeline: TIMELINE[k] }])),
}

export const gojo_shinjuku = {
  rosterKey: GS_KEY, name: 'Satoru Gojo', displayName: 'Satoru Gojo', selectTag: 'Shinjuku Arc', universe: 'jujutsu_kaisen',
  color: '#7fd8ff', series: 'Jujutsu Kaisen', era: 'Shinjuku Showdown — FinhJ sheet (credits ZebrasBlack, R0B4N)',
  tagline: 'The Strongest.', introTitle: 'SATORU GOJO — SHINJUKU ARC', archetype: 'Limitless / Zoner-Rushdown', difficulty: 5,
  homeStage: 'Shibuya Incident',
  bio: 'The strongest sorcerer, at the Shinjuku Showdown. Limitless lets him bend space: an invisible Infinity that nothing reaches, Blue that pulls, Red that repels and Hollow Purple that erases. The Six Eyes make all of it efficient; Reverse Cursed Technique repairs his body and brain. Infinity has no visual tell: watch his cursed energy.',
  primary: 'zoner', secondary: ['rushdown'], archetypes: ['zoner', 'rushdown'],
  traits: { hasEnergy: true, energyType: 'cursed_energy', energyName: 'Super', mobility: 'high', scaling: 'control', animeMovement: true },
  energyConfig: { label: 'Super', color: '#c9a7ff', bars: 3 },
  // Health = the old Gojo's 1160. Weight medium (1). maxEnergy 300 = 3 super bars.
  stats: { maxHealth: 1160, maxEnergy: 300, attack: 88, defense: 84, speed: 94, jumpPower: 30, maxJumps: 2, weight: 1,
    dashSpeed: 22, dashDuration: 9, dashCooldownMax: 24 },
  hasSprites: true, spriteScale: GS_SCALE, spriteSheet: A.idle.sheet, portrait: './assets/gojo_shinjuku/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: {
    light: GS_MOVES.gA1, heavy: GS_MOVES.gB, crouchLight: GS_MOVES.gSweep, upAttack: GS_MOVES.gC,
    airAttack: GS_MOVES.gAir, downAir: GS_MOVES.gAir,
    grab: { damage: dmg(90), startup: 5, active: 2, recovery: 22, hitstun: 24, throwForceX: 10, throwForceY: -15, damageType: 'energy' },
  },
  specials: {
    neutral: { name: 'Lapse: Blue', cost: COST.lapse }, forward: { name: 'Reversal: Red', cost: COST.red },
    up: { name: 'Blue Step', cost: COST.blueStep }, down: { name: 'Hollow Technique: Purple', cost: COST.purple },
  },
  ultimate: { name: 'Domain Expansion: Unlimited Void', cost: BAR,
    description: 'U: the old Gojo\'s Unlimited Void (Infinite Void background, the opponent frozen 15 s). Costs 1 bar + 50 CE; 30 s cooldown after it ends; then 5 s technique burnout.' },
  domain: { name: 'Unlimited Void', priority: 3, background: 'void' },
  transformationOrder: ['base'], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: GS_ANIMATION,
}
