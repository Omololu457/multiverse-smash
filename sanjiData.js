// sanjiData.js — Sanji: frame data + roster entry. Frame data is frame-exact (startup / active / recovery in
// 60fps simulation frames, the `frameExact` path in combat.startMove). Block advantage is set by blockstun:
// adv = blockstun − (active − 1 + recovery) − 2  (hit on the first active frame; the −2 is the engine's measured
// block-hitstop / decrement offset — same formula as Zoro, verified by harness/sanji_moveset.test.mjs).
//
// HANDS RULE (canon, non-negotiable): every striking move is a kick, a knee or a shin. Every move is tagged
// damageType "blunt" (the Diable Jambe BURN tick alone is "energy"; Plate Kick is the one "projectile").
import { SANJI_ANIM, SANJI_DJ_ANIM } from './sanjiSprites.js'

const n = (damage, startup, active, recovery, extra = {}) => ({ damage, startup, active, recovery,
  hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: 0, rangeX: 70, rangeY: 50, frameExact: true, damageType: 'blunt', ...extra })
const adv = (a, active, recovery) => a + (active - 1) + recovery + 2   // blockstun for a target block advantage (measured)

// COURSE targets (Phase 4): the six butcher's cuts, in order. Each main kick normal is bound to one.
export const COURSE = ['COLLIER', 'EPAULE', 'COTELETTE', 'SELLE', 'POITRINE', 'GIGOT']
export const COURSE_MOVES = ['sCollier', 'sEpaule', 'sCotelette', 'sSelle', 'sPoitrine', 'sGigot']

export const SANJI_MOVES = {
  // ── NORMALS (no Heat). `sj` = Sanji's per-move descriptor (read by sanjiState / sanji.js). course = 1..6. ──
  sCollier:   n(45, 6, 3, 9,   { blockstun: adv(+1, 3, 9),  hitstun: 17, rangeX: 76, knockbackX: 2, sj: { course: 1, boxY: 0 } }),     // high kick   +1
  sEpaule:    n(60, 9, 3, 14,  { blockstun: adv(-3, 3, 14), hitstun: 21, rangeX: 80, rangeY: 70, sj: { course: 2, boxY: -10 } }),     // descending  −3
  sCotelette: n(70, 10, 3, 16, { blockstun: adv(-4, 3, 16), hitstun: 23, rangeX: 88, sj: { course: 3, boxY: 18 } }),                   // side kick   −4
  sSelle:     n(65, 9, 3, 14,  { blockstun: adv(-2, 3, 14), hitstun: 22, rangeX: 84, sj: { course: 4, boxY: 26 } }),                   // mid kick    −2
  sPoitrine:  n(80, 12, 4, 20, { blockstun: adv(-5, 4, 20), hitstun: 30, rangeX: 90, rangeY: 64, knockbackX: 2, launcher: true,          // straight kick −5, launches
               launchVy: -9, selfVy: 0, sj: { course: 5, boxY: 8 } }),   // a short pop (~48px): Gigot / a jump-in still reach it
  sGigot:     n(50, 7, 3, 13,  { blockstun: adv(-2, 3, 13), hitstun: 20, rangeX: 86, rangeY: 74, hitLevel: 'low', sj: { course: 6, boxY: 20 } }),   // low kick
  sCrouchKick: n(40, 6, 3, 10, { blockstun: adv(-1, 3, 10), hitstun: 16, rangeX: 80, rangeY: 34, hitLevel: 'low', sj: { boxY: 62 } }),
  up:         n(75, 8, 4, 18,  { blockstun: adv(-7, 4, 18), hitstun: 26, rangeX: 70, rangeY: 150, launcher: true, launchVy: -20, selfVy: 0,   // anti-air knee
               sj: { boxY: -80 } }),
  air:        n(65, 6, 4, 12,  { blockstun: 12, hitstun: 20, rangeX: 78, rangeY: 60, knockbackX: 3, knockbackY: -2 }),   // air kick (jump-in)
  down_air:   n(55, 8, 4, 16,  { blockstun: 12, hitstun: 20, rangeX: 80, rangeY: 120, knockbackY: 8, sj: { boxY: 40, centered: true } }),
  sHandstand: n(70, 10, 6, 18, { blockstun: adv(-6, 6, 18), hitstun: 24, rangeX: 110, rangeY: 40, hitLevel: 'low', knockbackX: 4,     // handstand spin: ends facing the other way
               sj: { kind: 'handstand', boxY: 58, centered: true, slide: [4, 16, 9] } }),   // 108px slide: through a close foe
  sReversal:  n(70, 6, 4, 24,  { blockstun: adv(-12, 4, 24), hitstun: 26, rangeX: 96, rangeY: 90, knockbackX: 7, invuln: 6, sj: { boxY: -20 } }),   // wake-up crescent −12
}

// Source-frame index at exact elapsed sim frames (presentation follows the simulation, never drives it).
export const SANJI_TIMELINES = {
  sCollier: [[0, 0], [6, 1]], sEpaule: [[0, 0], [9, 1]], sCotelette: [[0, 0], [10, 1]], sSelle: [[0, 0], [9, 1]],
  sPoitrine: [[0, 0], [12, 1], [16, 2]], sGigot: [[0, 0], [7, 1]], sCrouchKick: [[0, 0], [6, 1]],
  up: [[0, 0], [8, 1]], air: [[0, 0], [6, 1]], down_air: [[0, 0]], sHandstand: [[0, 0], [10, 1], [16, 2]],
  sReversal: [[0, 0], [6, 1]],
}

const withTimelines = src => Object.fromEntries(Object.entries(src).map(([k, a]) => [k, SANJI_TIMELINES[k] ? { ...a, frameTimeline: SANJI_TIMELINES[k] } : a]))
const ANIM = withTimelines(SANJI_ANIM)
ANIM.transform = ANIM.intro   // fallback intro action
export const SANJI_BASE_ANIM = ANIM

export const sanji = {
  rosterKey: 'sanji', name: 'Sanji', displayName: 'Sanji', hudName: 'Sanji', universe: 'one_piece', color: '#e8c33a',
  difficulty: 4, archetype: 'Rushdown / Chain Specialist',
  tagline: "A cook's hands are for cooking.",
  bio: 'Chef of the Straw Hat Pirates, trained in the Black Leg style under Zeff. He fights only with his legs: his hands belong to the kitchen. Give him enough time to spin and his leg catches fire.',
  portrait: './assets/sanji/portrait.png', hasSprites: true, spriteScale: 2.3 / 1.18,   // same GBA ripper/scale as Luffy / Zoro
  spriteSheet: ANIM.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
  primary: 'melee', secondary: [], archetypes: ['melee'],
  traits: { hasEnergy: true, energyType: 'heat', energyName: 'Heat', mobility: 'very_high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Heat', color: '#4a8cff' },
  // Brief: walk 5.9 · run 8.6 · jumpForce 12.5 · weight 0.85. Engine mapping: walk px/f = 4.5 + (speed−78)/4 →
  // speed 83.6; run = the ground dash = dashSpeed × 0.55 → dashSpeed 15.64; jumpPower = jumpForce × 2.667 (the
  // Zoro/Arlong ratio) → 33; weight 0.85 → knockback taken ÷ 0.85 (sanjiState.sanjiKnockback).
  stats: { maxHealth: 940, maxEnergy: 100, attack: 84, defense: 80, speed: 83.6, jumpPower: 33, maxJumps: 1, weight: 0.85,
    dashSpeed: 15.64, dashDuration: 9, dashCooldownMax: 24 },
  movement: { crouchIdle: true },
  introSequence: ['intro', 'sIntroLight'],
  basic_attacks: { light: SANJI_MOVES.sCollier, heavy: SANJI_MOVES.sCotelette, crouchLight: SANJI_MOVES.sCrouchKick, upAttack: SANJI_MOVES.up,
    airAttack: SANJI_MOVES.air, downAir: SANJI_MOVES.down_air,
    grab: { damage: 30, startup: 7, active: 3, recovery: 20, hitstun: 20, throwForceX: 7, throwForceY: -4 } },
  specials: {},
  ultimate: { name: 'Party Table Kick Course', cost: 100 },
  animationData: ANIM,
}
export { SANJI_DJ_ANIM }
