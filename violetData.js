// Violet Parr (violet, The Incredibles — supplied GBA "Playable Characters - Violet" sheet, ripped by redblueyellow).
// DATA ONLY: roster entry, frame data, costs, timelines. Logic: violetState.js (sim), violet.js (command layer),
// violetFx.js (render). Sprite ledger: docs/violet/SPRITE_LEDGER.md (every sheet frame → animation → move).
import { VIOLET_ANIM, VIOLET_PORTRAIT } from './violetSprites.js'

export const SCALE = 2                       // 1x GBA cell → world px (55 px figure → 110 px), integer = crisp pixels

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
  stats: { maxHealth: 900, maxEnergy: 100, attack: 80, defense: 70, speed: 90, jumpPower: 24, maxJumps: 2, weight: 0.8,
    dashSpeed: 18, dashDuration: 10, dashCooldownMax: 24 },
  hasSprites: true, spriteScale: SCALE, spriteSheet: VIOLET_ANIM.idle.sheet, portrait: VIOLET_PORTRAIT,
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequence: ['intro'], introPool: ['intro'],
  basic_attacks: { light: MOVES.light, heavy: MOVES.heavy, crouchLight: MOVES.vLow, upAttack: MOVES.up, airAttack: MOVES.air, downAir: MOVES.air,
    grab: { damage: 40, startup: 7, active: 3, recovery: 24, hitstun: 20, throwForceX: 9, throwForceY: -5, damageType: 'grab' } },
  animationData: Object.fromEntries(Object.entries(VIOLET_ANIM).map(([k, a]) => [k, TIMELINE[k] ? { ...a, frameTimeline: TIMELINE[k] } : a])),
}
