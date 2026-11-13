// zoroData.js — Roronoa Zoro: frame data + roster entry. Frame data is frame-exact (startup / active /
// recovery in 60fps simulation frames, `frameExact` path in combat.startMove). Block advantage is set by
// blockstun: adv = blockstun − (active − 1 + recovery) − 2  (hit on the first active frame, 0 attackCooldown;
// the −2 is the engine's measured block-hitstop / decrement offset — verified by harness/zoro_moveset.test.mjs).
import { ZORO_ANIM } from './zoroSprites.js'

const n = (damage, startup, active, recovery, extra = {}) => ({ damage, startup, active, recovery,
  hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: 0, rangeX: 70, rangeY: 50, frameExact: true, ...extra })
const adv = (a, active, recovery) => a + (active - 1) + recovery + 2   // blockstun for a target block advantage (measured)

// NORMALS (no Spirit). Ranges are px of reach in front of the 48px body box.
export const ZORO_MOVES = {
  light:    n(40, 5, 3, 9,   { blockstun: adv(+1, 3, 9),  hitstun: 17, rangeX: 72, knockbackX: 2 }),                 // Jab        +1
  zSlash:   n(65, 8, 3, 14,  { blockstun: adv(-3, 3, 14), hitstun: 21, rangeX: 84, knockbackX: 3 }),                 // Slash      −3
  heavy:    n(90, 13, 4, 22, { blockstun: adv(-6, 4, 22), hitstun: 30, rangeX: 96, rangeY: 70, knockbackX: 2,        // Heavy      −6, launches
             launcher: true, launchVy: -27, selfVy: 0 }),
  zLow:     n(50, 7, 3, 13,  { blockstun: adv(-2, 3, 13), hitstun: 18, rangeX: 80, rangeY: 30, hitLevel: 'low',      // Low thrust
             zrBox: { boxY: 66 } }),
  up:       n(75, 9, 4, 20,  { blockstun: adv(-8, 4, 20), hitstun: 26, rangeX: 70, rangeY: 150, launcher: true,      // Rising slash (anti-air)
             launchVy: -26, selfVy: 0, zrBox: { boxY: -78 } }),
  air:      n(60, 6, 4, 12,  { blockstun: 12, hitstun: 20, rangeX: 76, rangeY: 60, knockbackX: 3, knockbackY: -2 }),   // Air slash (jump-in)
  down_air: n(55, 8, 4, 16,  { blockstun: 12, hitstun: 20, rangeX: 84, rangeY: 150, knockbackY: 9, zrBox: { boxY: 40, centered: true } }),
  zWake:    n(70, 6, 4, 24,  { blockstun: adv(-12, 4, 24), hitstun: 24, rangeX: 96, knockbackX: 8, invuln: 6 }),     // Wake-up reversal −12

  // SPECIALS (Spirit). `zr` = Zoro's per-move descriptor (read by zoroState.tickZoro / zoro.js);
  // zr.noHit / zr.centered / zr.boxY are mirrored onto currentAttack.lf for the shared hitbox builder.
  zTaka:   n(0, 14, 2, 18,  { cost: 10, category: 'special', isSpecial: true, zr: { kind: 'taka', noHit: true, spawnAt: 13 } }),
  zOni:    n(90, 10, 12, 22, { cost: 12, category: 'special', isSpecial: true, hitstun: 42, knockbackX: 1, rangeX: 104, rangeY: 80,
             blockstun: adv(-14, 12, 22), zr: { kind: 'oni', centered: true, boxY: 10, dash: [8, 22, 15], whiffExtra: 14 } }),
  zTatsu:  n(0, 12, 2, 20,  { cost: 20, category: 'special', isSpecial: true, zr: { kind: 'tatsu', noHit: true, spawnAt: 11 } }),
  zTora:   n(85, 14, 6, 22, { cost: 15, category: 'special', isSpecial: true, hitstun: 30, knockbackX: 6, rangeX: 92, rangeY: 76,
             blockstun: adv(-8, 6, 22), zr: { kind: 'tora', boxY: 40, lunge: [2, 14, 8], crouchBonus: 1.15 } }),
  zShishi: n(0, 4, 30, 40,  { cost: 18, category: 'special', isSpecial: true, zr: { kind: 'shishi', noHit: true, window: [4, 34] } }),
  zShishiStrike: n(110, 2, 6, 20, { category: 'special', isSpecial: true, hitstun: 34, knockbackX: 7, rangeX: 110, rangeY: 90,
             blockstun: adv(-10, 6, 20), zr: { kind: 'shishiStrike', centered: true, boxY: 8, dash: [0, 8, 18], invuln: 10 } }),
  zNap:    n(0, 0, 1, 90,   { zr: { kind: 'nap', noHit: true, regen: 15, every: 6 } }),   // free; +1 Spirit / 6f (15 total), vulnerable
  zSanto:  n(0, 10, 1, 11,  { cost: 15, zr: { kind: 'santo', noHit: true } }),

  // SUPER — ASHURA: ICHIBUGIN / RENGOKU ONIGIRI (100 Spirit). Must connect on the FIRST cut (missAt).
  zAshura: n(70, 14, 56, 24, { cost: 100, category: 'ultimate', isUltimate: true, hitstun: 40, knockbackX: 0, rangeX: 120, rangeY: 110,
             blockstun: 20, zr: { kind: 'ashura', centered: true, boxY: 0, missAt: 20, invuln: 14,
               contacts: [[14, 4, 70], [30, 4, 70], [46, 4, 70], [62, 5, 150]] } }),   // 70+70+70+150 = 360 raw
  zAshuraMiss: n(0, 0, 1, 49, { zr: { kind: 'ashuraMiss', noHit: true } }),
}

// Source-frame index at exact elapsed sim frames (presentation follows the simulation, never drives it).
export const ZORO_TIMELINES = {
  light: [[0, 1], [5, 0], [8, 1]], zSlash: [[0, 0], [8, 1]], heavy: [[0, 0], [13, 1]],
  zLow: [[0, 0], [7, 1]], up: [[0, 0], [9, 1], [13, 2]], air: [[0, 0], [6, 1]], down_air: [[0, 0]],
  zWake: [[0, 0], [6, 1]],
  zSanto: [[0, 0], [10, 1]], zsLight: [[0, 0], [5, 1]], zsHeavy: [[0, 0], [13, 1]],
  zTaka: [[0, 0], [13, 1]], zOni: [[0, 0], [10, 1], [16, 2], [22, 3]], zTatsu: [[0, 0], [8, 1]],
  zTora: [[0, 0], [14, 1]], zShishi: [[0, 0]], zShishiStrike: [[0, 0], [6, 1]], zNap: [[0, 0]],
  zAshura: [[0, 0], [14, 1], [30, 2], [46, 3], [62, 4]], zAshuraMiss: [[0, 0]],
}

const ANIM = Object.fromEntries(Object.entries(ZORO_ANIM).map(([k, a]) => [k, ZORO_TIMELINES[k] ? { ...a, frameTimeline: ZORO_TIMELINES[k] } : a]))
ANIM.transform = ANIM.intro   // the engine plays `transform` during the match intro
// SANTORYU stance set (fighter._skinAnim while the form is active): the mouth-sword frames from R7.
export const ZORO_SANTO_ANIM = { ...ANIM, idle: ANIM.zsIdle,
  light: { ...ANIM.zsLight, frameTimeline: ZORO_TIMELINES.zsLight }, heavy: { ...ANIM.zsHeavy, frameTimeline: ZORO_TIMELINES.zsHeavy } }

export const zoro = {
  rosterKey: 'zoro', name: 'Zoro', displayName: 'Roronoa Zoro', hudName: 'Zoro', universe: 'one_piece', color: '#3fa34d',
  portrait: './assets/zoro/portrait.png', hasSprites: true, spriteScale: 2.3 / 1.18,   // same GBA ripper/scale as Luffy
  spriteSheet: ZORO_ANIM.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
  primary: 'melee', secondary: [], archetypes: ['melee'],
  traits: { hasEnergy: true, energyType: 'spirit', energyName: 'Spirit', mobility: 'low', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Spirit', color: '#3fa34d' },
  // walkSpeed 5.0 → speed 80 (physics: walk = 4.5 + (speed−78)/4). Run = the double-tap dash at the engine's
  // 8 px/f floor (dashSpeed 14×0.55 clamps to 8; 7.6 is below the floor). jumpForce 10.5 → jumpPower 28
  // (roster median 32, Luffy 31: a heavier, lower jump). weight 1.1 → knockback taken ÷1.1 (zoroState).
  stats: { maxHealth: 1000, maxEnergy: 100, attack: 88, defense: 88, speed: 80, jumpPower: 28, maxJumps: 1, weight: 1.1,
    dashSpeed: 14, dashDuration: 9, dashCooldownMax: 30 },
  movement: { crouchIdle: true },
  basic_attacks: { light: ZORO_MOVES.light, heavy: ZORO_MOVES.heavy, crouchLight: ZORO_MOVES.zLow, upAttack: ZORO_MOVES.up,
    airAttack: ZORO_MOVES.air, downAir: ZORO_MOVES.down_air,
    grab: { damage: 30, startup: 7, active: 3, recovery: 20, hitstun: 20, throwForceX: 7, throwForceY: -4 } },
  specials: {},
  ultimate: { name: 'Ashura: Ichibugin / Rengoku Onigiri', cost: 100 },
  animationData: ANIM,
}
