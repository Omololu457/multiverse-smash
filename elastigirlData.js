// Elastigirl (Helen Parr, The Incredibles — GBA sheet). DATA ONLY: frame data, hit/hurt geometry, mechanic tuning and
// the roster entry. Simulation: elastigirlState.js · command layer: elastigirl.js · render: elastigirlFx.js.
// Frame → animation → move mapping: docs/elastigirl/SPRITE_LEDGER.md (generated cells: elastigirlSprites.js).
//
// Units: frames at 60 fps; distances in world px. `damage` is the stored per-hit value (the brief's numbers); the
// engine's shared GLOBAL_DAMAGE_SCALE (0.6) and combo curve apply at the damage write, like every other fighter.
import { ELASTIGIRL_ANIM } from './elastigirlSprites.js'
// PHASE 1 snapshot: sprite strips + roster entry on the engine's generic normals; the kit arrives in later phases.

export const EG_KEY = 'elastigirl'

// Phase 1 placeholder stats (the brief's base stats land in Phase 2).
export const EG_STATS = { maxHealth: 1000, maxEnergy: 100, attack: 80, defense: 80, speed: 80, jumpPower: 25, maxJumps: 1, weight: 1, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 36 }
export const ULT_LOCKOUT = 100

// ── PHASE 4: moves ──
// startup = frames before the first active frame; onBlock = attacker frame advantage when guarded (applied by the
// block hook: blockstun = frames the attacker has left + onBlock). box = [x0, x1] forward of the body's front edge,
// [y0, y1] down from the top of the 100-px body box. limb = the extended hurtbox (punishable stretched limb).
const mv = (o) => ({ frameExact: true, damageType: 'blunt', category: 'light', hitstun: 16, knockbackX: 2, knockbackY: 0, rangeX: 1, rangeY: 1, ...o })
export const EG_MOVES = {
  // NORMALS (Jab 6f/20/0 · Heavy 14f/54/−5 · Low 8f/28/−4 · Launcher 12f/48/−9 · Air 7f/30/+2)
  light: mv({ name: 'Stretch Jab', damage: 20, startup: 6, active: 3, recovery: 12, onBlock: 0, hitstun: 17, box: [-10, 120, 24, 50], limb: true, reach: 120 }),
  heavy: mv({ name: 'Elastic Haymaker', damage: 54, startup: 14, active: 4, recovery: 22, onBlock: -5, category: 'heavy', hitstun: 26, knockbackX: 4, box: [-10, 200, 22, 52], limb: true, reach: 200 }),
  eLow: mv({ name: 'Stretch Sweep', damage: 28, startup: 8, active: 3, recovery: 18, onBlock: -4, hitLevel: 'low', hitstun: 20, box: [-10, 210, 74, 100], limb: true, reach: 210 }),
  up: mv({ name: 'Rising Reach', damage: 48, startup: 12, active: 4, recovery: 24, onBlock: -9, category: 'launcher', launcher: true, hitstun: 30, launchVy: -20, selfVy: 0, box: [-10, 140, -150, 40], limb: true, reach: 140 }),
  air: mv({ name: 'Diving Stretch', damage: 30, startup: 7, active: 4, recovery: 14, onBlock: 2, hitstun: 22, knockbackY: -2, box: [-20, 110, -10, 80], air: true }),
  // SPECIALS
  eLongArm: mv({ name: 'Long Arm', damage: 40, startup: 14, active: 6, recovery: 1, cost: 12, isSpecial: true, category: 'special', onBlock: -16, hitstun: 40, knockbackX: 0, box: [-10, 380, 26, 52], limb: true, reach: 380, onHit: 18, pull: 12 }),
  eLongPull: mv({ name: 'Long Arm (pull)', damage: 0, startup: 30, active: 1, recovery: 1, noBody: true, pose: true }),
  eLongWhiff: mv({ name: 'Long Arm (whiff)', damage: 0, startup: 20, active: 1, recovery: 14, noBody: true, pose: true, limbHold: 18 }),
  eWhirl: mv({ name: 'Whirl Kick', damage: 22, startup: 8, active: 14, recovery: 18, cost: 15, isSpecial: true, category: 'special', onBlock: -8, hitstun: 18, knockbackX: 1,
    box: [-50, 100, 8, 98], upperInvuln: [3, 9],
    contacts: [{ from: 8, to: 9, damage: 22, hitstun: 18, knockbackX: 1 }, { from: 13, to: 14, damage: 22, hitstun: 18, knockbackX: 1 }, { from: 19, to: 21, damage: 28, hitstun: 26, knockbackX: 5 }] }),
  eDome: mv({ name: 'Parachute Drop', damage: 70, startup: 24, active: 5, recovery: 18, cost: 18, isSpecial: true, category: 'special', hitLevel: 'overhead', onBlock: -6, hitstun: 30, knockbackX: 3, box: [-70, 80, 0, 100], hop: { at: 4, vy: -9 } }),
  eDomeSlam: mv({ name: 'Parachute Drop (slam)', damage: 70, startup: 2, active: 60, recovery: 1, isSpecial: true, category: 'special', hitLevel: 'overhead', hitstun: 30, knockbackX: 3, knockbackY: 4, box: [-70, 80, 0, 104], slam: true }),
  eDomeLand: mv({ name: 'Parachute Drop (land)', damage: 0, startup: 16, active: 1, recovery: 1, noBody: true, pose: true }),
  eWhip: mv({ name: 'Overhead Whip', damage: 60, startup: 18, active: 4, recovery: 24, cost: 15, isSpecial: true, category: 'special', hitLevel: 'overhead', onBlock: -10, hitstun: 34, knockbackX: 1, box: [150, 300, -120, 100], limb: true, reach: 300, bounce: -12 }),
  // DEFENSE (Phase 6)
  eGuard: mv({ name: 'Stretch Guard', damage: 0, startup: 1, active: 6, recovery: 15, noBody: true, guard: true }),
  eBounce: mv({ name: 'Bounce Back', damage: 0, startup: 1, active: 1, recovery: 20, noBody: true, bounce: true }),
  // ULTIMATE — FAMILY RAFT: R14 windup → the raft surge (4 contacts) → 100 f lockout
  eUlt: mv({ name: 'Family Raft (windup)', damage: 0, startup: 24, active: 1, recovery: 1, cost: 100, isUltimate: true, category: 'ultimate', noBody: true, pose: true }),
  eRaft: mv({ name: 'Family Raft', damage: 40, startup: 6, active: 66, recovery: 1, isUltimate: true, category: 'ultimate', hitstun: 30, knockbackX: 1, box: [-30, 120, 34, 100], travel: 12,
    contacts: [{ from: 6, to: 11, damage: 40, hitstun: 30, knockbackX: 1 }, { from: 22, to: 27, damage: 40, hitstun: 30, knockbackX: 1 }, { from: 38, to: 43, damage: 50, hitstun: 32, knockbackX: 1 }, { from: 60, to: 70, damage: 90, hitstun: 44, knockbackX: 9, knockbackY: -8 }] }),
  eUltRecover: mv({ name: 'Family Raft (lockout)', damage: 0, startup: ULT_LOCKOUT, active: 1, recovery: 1, noBody: true, pose: true }),
  grab: { damage: 30, startup: 8, active: 3, recovery: 24, hitstun: 20, throwForceX: 5, throwForceY: -3, damageType: 'grab' },
}
// SPECIAL INPUTS (facing-relative numpad motion; P = Special). Held-direction fallbacks keep pad / CPU play reachable.
export const EG_INPUTS = {
  ult: { motion: '236236', win: 40, button: 'special', alt: 'ultimate' },
  eWhirl: { motion: '623', win: 18 }, eWhip: { motion: '412', win: 18 }, eLongArm: { motion: '236', win: 16 },
  eDome: { motion: '252', win: 18 }, sling: { air: true, held: 'up' },
  fallback: { fwd: 'eLongArm', back: 'eWhip', down: 'eDome', neutral: 'eWhirl', up: 'sling' },
}

// Frame timelines ([elapsed tick, strip frame]) — which supplied frame shows when (strips in elastigirlSprites.js).
const timeline = {
  light: [[0, 0], [3, 1], [6, 2]], heavy: [[0, 1], [9, 2], [14, 0], [24, 1], [32, 2]],
  eLow: [[0, 0], [5, 1], [8, 2], [17, 1]], up: [[0, 0], [4, 1], [8, 2], [10, 3], [11, 4], [12, 5], [22, 4], [30, 3], [36, 2]],
  air: [[0, 0], [7, 1]], grab: [[0, 0], [8, 1], [14, 2]],
  eLongArm: [[0, 0], [5, 1], [9, 2], [12, 3], [14, 4]], eLongPull: [[0, 0], [5, 1], [10, 2]], eLongWhiff: [[0, 0], [6, 1], [12, 2]],
  eLongRecover: [[0, 0], [5, 1], [10, 2], [14, 3]],
  eWhirl: [[0, 0], [8, 1], [13, 2], [19, 3], [26, 0]],
  eDome: [[0, 0], [3, 1], [7, 2], [11, 3], [15, 4], [19, 5], [24, 4], [29, 6], [38, 7]], eDomeSlam: [[0, 2]], eDomeLand: [[0, 0], [8, 1]],
  eWhip: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4], [15, 5], [17, 6], [18, 7], [19, 8], [20, 9], [21, 10], [26, 11], [34, 12], [40, 13]],
  eGuard: [[0, 0], [2, 1], [7, 2]], eBounce: [[0, 0], [4, 1], [8, 2], [12, 3], [17, 4]],
  eUlt: [[0, 0], [5, 1], [10, 2], [15, 3], [20, 4]],
  eRaft: Array.from({ length: 18 }, (_, i) => [i * 4, i % 17]),
}
// pose moves borrow another strip (no art of their own)
const ANIM_ALIAS = { eDomeLand: 'eDomeSlam', eUltRecover: 'eLongRecover', eUlt: 'eUltWindup' }

const ANIM = Object.fromEntries(Object.entries(ELASTIGIRL_ANIM).map(([k, a]) => { const { cells, ...rest } = a; return [k, rest] }))
for (const [k, src] of Object.entries(ANIM_ALIAS)) ANIM[k] = { ...ANIM[src] }
timeline.eDomeSlam = [[0, 0]]                                   // R5.6 dome shape, held while it falls
timeline.eDomeLand = [[0, 1], [8, 2]]                           // R5.7 → R5.8 recover from the dome
timeline.eUltRecover = [[0, 0], [40, 1], [70, 2], [90, 3]]      // R10.4-7 settle, held through the lockout
const animationData = Object.fromEntries(Object.entries(ANIM).map(([k, a]) => [k, timeline[k] ? { ...a, frameTimeline: timeline[k] } : a]))

const B = EG_MOVES
export const elastigirl = {
  rosterKey: EG_KEY, name: 'Elastigirl', displayName: 'Elastigirl', civilianIdentity: 'Helen Parr', universe: 'pixar',
  series: 'The Incredibles', era: 'The Incredibles (2004) — supplied Game Boy Advance sprite sheet',
  traits: { hasEnergy: true, energyType: 'energy', mobility: 'normal', scaling: 'combo', animeMovement: false },
  stats: EG_STATS,
  hasSprites: true, spriteScale: 1.9, spriteSheet: ELASTIGIRL_ANIM.idle.sheet, portrait: './assets/elastigirl/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  basic_attacks: { light: B.light, heavy: B.heavy, crouchLight: B.eLow, upAttack: B.up, airAttack: B.air, downAir: B.air, grab: B.grab },
  specials: {}, ultimate: { name: 'Family Raft', cost: 100 },
  animationData,
}
