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

// Deterministic hash for every simulation "random" choice and the sound pitch / noise: (match seed, frame, player index).
export function vhash(seed, frame, pid) {
  let h = (Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((frame | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul((pid | 0) + 1, 0x27d4eb2f)) | 0
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16
  return h >>> 0
}

// ── MOVES (Phase 4 authors the full kit; Phase 1 registers the base normals so the fighter is playable) ──
// startup = frames before the first active frame. Damage stored RAW: the shared melee path delivers
// floor(raw × comboScale × 0.60), so raw = the authored on-hit value / 0.60 (Jab 30 → 18).
const n = (raw, startup, active, recovery, extra = {}) => ({ raw, damage: raw, startup, active, recovery, frameExact: true,
  category: 'light', hitstun: 16, blockstun: 10, rangeX: 34, rangeY: 60, knockbackX: 3, knockbackY: -1, ...extra })
export const MOVES = {
  light: n(30, 5, 2, 9, { hitstun: 15, blockstun: 10 }),
  heavy: n(87, 13, 3, 18, { category: 'heavy', hitstun: 24, blockstun: 14, knockbackX: 7, knockbackY: -3, rangeX: 46 }),
  vLow: n(40, 7, 2, 12, { hitLevel: 'low', hitstun: 17, blockstun: 9 }),
  up: n(77, 11, 3, 20, { category: 'launcher', launcher: true, hitstun: 30, blockstun: 13, launchVy: -30, selfVy: 0, knockbackY: -9 }),
  air: n(50, 7, 3, 10, { hitstun: 18, blockstun: 14, knockbackX: 3, knockbackY: -2 }),
}
export const TIMELINE = {
  light: [[0, 0], [3, 1], [7, 2]], heavy: [[0, 0], [5, 1], [10, 2], [13, 3], [20, 4]], vLow: [[0, 0], [7, 1]],
  up: [[0, 0], [11, 1]], air: [[0, 0], [4, 1], [7, 2]],
}

export const violet = {
  rosterKey: 'violet', name: 'Violet Parr', displayName: 'Violet', universe: 'the_incredibles',
  color: '#c81a38', series: 'The Incredibles', era: 'Supplied GBA "The Incredibles" playable-character sheet (Violet), ripped by redblueyellow',
  archetype: 'Zoner / Trickster',
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
