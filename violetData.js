// Violet Parr (violet, The Incredibles — supplied GBA "Playable Characters - Violet" sheet, ripped by redblueyellow).
// DATA ONLY: roster entry, frame data, costs, timelines. Logic: violetState.js (sim), violet.js (command layer),
// violetFx.js (render). Sprite ledger: docs/violet/SPRITE_LEDGER.md (every sheet frame → animation → move).
import { VIOLET_ANIM, VIOLET_PORTRAIT } from './violetSprites.js'

export const SCALE = 2                       // 1x GBA cell → world px (55 px figure → 110 px), integer = crisp pixels

// ── PHASE 2: BASE STATS (brief → engine units; docs/violet/BALANCE_NOTES.md) ──
// walkSpeed 5.4 px/f → stats.speed 81.6 (physics: 4.5 + (speed − 78) / 20 × 5 = 5.4 exactly).
// runSpeed 8.0 px/f → RUN_SPEED_STAT 92 (same formula = 8.0): a double-tap dash with forward still held becomes a run.
// jumpForce 12 → stats.jumpPower 29 (engine jump units; the brief's 12 is the ~×2.4 smaller unit, as for Superman / Green Arrow).
// weight 0.8 → knockback she TAKES is divided by 0.8 (violetKnockback, combat.js hook; the engine has no weight field).
export const WALK_SPEED_STAT = 81.6, RUN_SPEED_STAT = 92
export const ENERGY = { max: 100, regenPerSec: 5, onHitLanded: 4, onHitTaken: 3 }

// ── PHASE 3: VANISH (↓↓ + Special toggles). Frames are sim ticks (60 / s). ──
// enter cost 15, drain 6 / s while invisible (no regen), max 6 s, 8 s cooldown after it ends (any end).
// Her first hit out of Vanish deals +20 % and ends it (R12 reappear); any hit she takes ends it instantly.
export const VANISH = { cost: 15, drainPerSec: 6, maxFrames: 360, cooldown: 480, ambush: 1.2, alpha: 0.35,
  fadeOut: 24, fadeIn: 24, tapWindow: 16, pressWindow: 12 }   // fadeOut / fadeIn = R7 / R12 strips (6 frames × 4)

// Deterministic hash for every simulation "random" choice and the sound pitch / noise: (match seed, frame, player index).
export function vhash(seed, frame, pid) {
  let h = (Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((frame | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul((pid | 0) + 1, 0x27d4eb2f)) | 0
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16
  return h >>> 0
}

// ── PHASE 4: MOVESET. startup = frames before the first active frame (frameExact). Damage stored RAW: the shared
// melee path delivers floor(raw × comboScale × 0.60), so raw = the authored on-hit value / 0.60 (Jab 30 → 18).
// blockstun = active + recovery + designed on-block advantage (measured by harness/violet_moveset.test.mjs).
const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: raw, startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 10, rangeX: 34, rangeY: 60, knockbackX: 3, knockbackY: -1, ...extra })
// Specials: body-less (noBody) engine moves; their hits come from her own payloads (violetState.js vStrike).
const sp = (startup, active, recovery, extra = {}) => ({ damage: 0, startup, active, recovery, frameExact: true, isSpecial: true,
  category: 'special', noBody: true, hitstun: 0, blockstun: 0, rangeX: 0, rangeY: 0, ...extra })
export const MOVES = {
  //                       raw startup active recovery    on-hit dmg / on-block (brief)
  light: n(30, 5, 2, 9, { hitstun: 15, blockstun: 12 }),                                                  // Jab      5f / 18 / 0
  heavy: n(87, 13, 3, 18, { category: 'heavy', hitstun: 24, blockstun: 16, knockbackX: 7, knockbackY: -3, rangeX: 46 }),   // Heavy 13f / 52 / −6
  vLow: n(40, 7, 2, 12, { hitLevel: 'low', hitstun: 18, blockstun: 11 }),                                 // Low      7f / 24 / −4
  up: n(77, 11, 3, 20, { category: 'launcher', launcher: true, hitstun: 34, blockstun: 15, launchVy: -12, selfVy: 0, jcVy: -14, knockbackY: -9 }),  // Launcher 11f / 46 / −9
  air: n(50, 7, 3, 10, { hitstun: 18, blockstun: 16, knockbackX: 3, knockbackY: -2 }),                   // Air      7f / 30 / +2
  vPush: sp(10, 2, 16, { cost: 12 }),                        // FORCE PUSH ↓↘→+P: R14 ring, 520 px, 50, push-back, one on screen
  vShield: sp(4, 40, 10, { cost: 20 }),                      // BUBBLE SHIELD ←↙↓+P: R15 dome 40f, blocks all strikes, reflects ×1.2, 10f recovery
  vBall: sp(8, 20, 14, { cost: 15 }),                        // FORCE BALL →→+P: 320 px rolling lunge, 30 + 30, projectile armour
  vTrap: sp(6, 2, 14, { cost: 22 }),                         // FIELD TRAP ↓↙←+P: bubble at the foe's cast position after 18f, traps 45f, 0 dmg
  vPhase: sp(1, 11, 6, { isSpecial: false, category: 'movement' }),   // PHASE STEP ←←+Light: back-step, i-frames 3–12, no cost
  vUlt: sp(12, 70, 90, { cost: 100, category: 'ultimate', isUltimate: true }),   // FULL FORCE ↓↘→↓↘→+P: 30 + 40 + 150 = 220 unscaled, 90f lockout
}
// ── PHASE 6: DEFENSE ──
// Bubble Shield: 6 s cooldown (from the cast) on top of its 20 cost. Phase Step ←←+Light: R7 strip, back-step with
// i-frames on frames 3–12 (press frame = 1), 5 s cooldown. Protective Instinct: once per round, below 20 % health, the
// next incoming strike / projectile pops a FREE 30f dome (the triggering hit is caught by it; no cost, no cooldown).
export const DEFENSE = { shieldCooldown: 360, phaseCooldown: 300, phaseIframes: [3, 12], phaseSpeed: 7, phaseTap: 14,
  instinctBelow: 0.20, instinctFrames: 30 }
// Payload tuning (sim px / frames). raw = authored on-hit damage / 0.60 (the strike path applies the shared 0.60 scale).
export const PUSH = { speed: 13, range: 520, raw: 84, hitstun: 22, blockstun: 14, kb: [11, -3], r: 30 }
export const SHIELD = { reflect: 1.2, r: 64 }
export const BALL = { speed: 16, raw: 50, gap: 8, hits: 2, hitstun: 18, blockstun: 12, kb1: [15, 0], kb2: [9, -6], padUp: 34, padX: 10 }
export const TRAP = { delay: 18, hold: 45, r: 52, fizzle: 14 }
export const ULT = { range: 760, trap: 30, squeeze: 40, blast: 150, squeezeAt: 30, blastAt: 70, lockout: 90, r: 58, blastR: 150, launch: [12, -15] }
// Motion inputs (numpad, facing-relative; P = Special). Each step is a direction token; the LAST token must be the most
// recent direction (a release to neutral is allowed after it); earlier steps may have diagonals between them.
export const MOTION = { window: 22, ultWindow: 34, press: 10, ballTap: 14,
  push: [2, 6], shield: [4, 2], trap: [2, 4], ult: [2, 6, 2, 6] }
// CANCELS (clean hit only, recovery window): chain table + which moves may cancel into specials / the ultimate.
export const CHAIN = { light: ['light', 'heavy', 'up', 'vLow'], vLow: ['heavy', 'up'], heavy: ['up'], up: [], air: [] }
export const SPECIAL_FROM = ['light', 'heavy', 'vLow', 'up']
export const TIMELINE = {
  light: [[0, 0], [3, 1], [7, 2]], heavy: [[0, 0], [5, 1], [10, 2], [13, 3], [20, 4]], vLow: [[0, 0], [7, 1]],
  up: [[0, 0], [11, 1]], air: [[0, 0], [4, 1], [7, 2]],
  vPush: [[0, 0], [4, 1], [8, 2], [10, 3], [16, 4]], vShield: [[0, 0], [2, 1], [4, 2]], vBall: [[0, 0], [4, 1], [8, 2], [12, 3]],
  vTrap: [[0, 0]], vPhase: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], [15, 5]], vUlt: [[0, 0], [12, 1], [30, 2], [50, 3], [70, 4], [100, 5]],
}

export const violet = {
  rosterKey: 'violet', name: 'Violet Parr', displayName: 'Violet', universe: 'pixar',
  color: '#c81a38', series: 'The Incredibles', era: 'Supplied GBA "The Incredibles" playable-character sheet (Violet), ripped by redblueyellow',
  archetype: 'Zoner / Trickster', difficulty: 3, tagline: 'Now you see me.',
  bio: 'Violet Parr, the shy eldest Parr kid, can turn invisible and project force fields strong enough to stop a car. In a fight she disappears, walls off the screen with force rings and bubbles, and lets her opponents walk into her traps.',
  primary: 'zoner', secondary: ['trickster'], archetypes: ['zoner', 'trickster'],
  traits: { hasEnergy: true, energyType: 'forcefield', energyName: 'Force Field', mobility: 'medium', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Force Field', color: '#b77cff' },
  // HP 900 (low band). speed 81.6 = walk 5.4 px/f. attack / defense are roster metadata (the live damage path does not read them).
  stats: { maxHealth: 900, maxEnergy: ENERGY.max, attack: 80, defense: 70, speed: WALK_SPEED_STAT, jumpPower: 29, maxJumps: 2, weight: 0.8,
    dashSpeed: 18, dashDuration: 10, dashCooldownMax: 24 },
  hasSprites: true, spriteScale: SCALE, spriteSheet: VIOLET_ANIM.idle.sheet, portrait: VIOLET_PORTRAIT,
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro'], introPool: ['intro'],
  basic_attacks: { light: MOVES.light, heavy: MOVES.heavy, crouchLight: MOVES.vLow, upAttack: MOVES.up, airAttack: MOVES.air, downAir: MOVES.air,
    grab: { damage: 40, startup: 7, active: 3, recovery: 24, hitstun: 20, throwForceX: 9, throwForceY: -5, damageType: 'grab' } },
  animationData: Object.fromEntries(Object.entries(VIOLET_ANIM).map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
}
