// arlongData.js — Arlong: frame data + roster entry. Frame data is frame-exact (startup / active / recovery in
// 60fps simulation frames, the `frameExact` path in combat.startMove). Block advantage is set by blockstun with
// the engine's measured offset (same formula as Zoro / Buggy): adv = blockstun − (active − 1 + recovery) − 2.
// Every move carries a `damageType` from the roster vocabulary in damageTypes.js ("slash" | "blunt" |
// "projectile" | "energy" | "grab"). There is no "pierce" in that vocabulary, so the bites are tagged "slash".
import { ARLONG_ANIM } from './arlongSprites.js'

const n = (damage, startup, active, recovery, extra = {}) => ({ damage, startup, active, recovery,
  hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: 0, rangeX: 72, rangeY: 54, frameExact: true, damageType: 'blunt', ...extra })
const adv = (a, active, recovery) => a + (active - 1) + recovery + 2
const K = 0.85   // weaponless Fishman Karate: 15% less damage, 2 frames faster

// NORMALS (no Tide). Ranges are px of reach in front of the body box. `al` = Arlong's per-move descriptor
// (read by arlongState.tickArlong + the combat.js hooks). `blade: true` = needs the Kiribachi in hand; while it is
// thrown / planted the command layer swaps in the `karate` replacement instead (never a dead button).
export const ARLONG_MOVES = {
  light:     n(45, 6, 3, 9,   { blockstun: adv(+1, 3, 9),  hitstun: 17, rangeX: 70, knockbackX: 2 }),                              // Jab              +1
  aStraight: n(70, 9, 3, 15,  { blockstun: adv(-3, 3, 15), hitstun: 22, rangeX: 86 }),                                              // Fishman straight −3
  aSwing:    n(90, 13, 4, 20, { blockstun: adv(-5, 4, 20), hitstun: 26, rangeX: 112, rangeY: 76, damageType: 'slash', blade: true, karate: 'aKSwing' }),   // Kiribachi swing −5
  heavy:     n(110, 16, 5, 26, { blockstun: adv(-8, 5, 26), hitstun: 30, rangeX: 120, rangeY: 96, knockbackX: 2, damageType: 'slash',   // Heavy saw arc −8, launches
               launcher: true, launchVy: -13, selfVy: -16, blade: true, karate: 'aKHeavy' }),
  aLow:      n(55, 8, 3, 15,  { blockstun: adv(-3, 3, 15), hitstun: 19, rangeX: 104, rangeY: 32, hitLevel: 'low', damageType: 'slash', blade: true, karate: 'aKLow', al: { boxY: 64 } }),
  up:        n(80, 10, 4, 20, { blockstun: adv(-8, 4, 20), hitstun: 26, rangeX: 74, rangeY: 150, launcher: true, launchVy: -24, selfVy: 0,   // Rising claw (anti-air)
               al: { boxY: -80 } }),
  air:       n(70, 7, 5, 12,  { blockstun: 12, hitstun: 20, rangeX: 96, rangeY: 70, knockbackX: 3, knockbackY: -2, damageType: 'slash', blade: true, karate: 'aKAir' }),   // Air saw (jump-in)
  down_air:  n(60, 9, 6, 16,  { blockstun: 12, hitstun: 20, rangeX: 70, rangeY: 150, knockbackY: 9, al: { boxY: 40, centered: true } }),   // nose dive
  aLunge:    n(85, 11, 3, 18, { blockstun: adv(-4, 3, 18), hitstun: 24, rangeX: 84, knockbackX: 5, al: { lunge: [2, 12, 7.5] } }),   // Lunge punch (advances)
  aWake:     n(75, 6, 4, 26,  { blockstun: adv(-12, 4, 26), hitstun: 24, rangeX: 104, rangeY: 96, knockbackX: 8, invuln: 6, damageType: 'slash', blade: true, karate: 'aKWake',
               al: { centered: true, boxY: -10 } }),   // Wake-up reversal (overhead raise)
  aBite:     n(100, 10, 3, 20, { blockstun: adv(-6, 3, 20), hitstun: 28, rangeX: 62, knockbackX: 4, damageType: 'slash', al: { tooth: true, bleed: true } }),   // BITE (−1 tooth)
  aHeadbutt: n(40, 10, 3, 20, { blockstun: adv(-6, 3, 20), hitstun: 20, rangeX: 62, knockbackX: 4 }),                              // 0 teeth: weaker headbutt, same frames

  // Weaponless FISHMAN KARATE replacements (blade thrown / planted): blunt, 2f faster, 15% less damage.
  aKSwing:   n(Math.round(90 * K), 11, 4, 18, { blockstun: adv(-5, 4, 18), hitstun: 26, rangeX: 80 }),
  aKHeavy:   n(Math.round(110 * K), 14, 5, 24, { blockstun: adv(-8, 5, 24), hitstun: 30, rangeX: 86, rangeY: 96, knockbackX: 2, launcher: true, launchVy: -13, selfVy: -16 }),
  aKLow:     n(Math.round(55 * K), 6, 3, 15, { blockstun: adv(-3, 3, 15), hitstun: 19, rangeX: 80, rangeY: 32, hitLevel: 'low', al: { boxY: 64 } }),
  aKAir:     n(Math.round(70 * K), 5, 5, 12, { blockstun: 12, hitstun: 20, rangeX: 72, rangeY: 70, knockbackX: 3, knockbackY: -2 }),
  aKWake:    n(Math.round(75 * K), 4, 4, 26, { blockstun: adv(-12, 4, 26), hitstun: 24, rangeX: 82, rangeY: 96, knockbackX: 8, invuln: 6, al: { centered: true, boxY: -10 } }),

  // SPECIALS (Tide). `al.kind` drives arlongState.tickMove. noHit = the body hitbox never hits (the damage comes
  // from the travelling strike / projectile / wave the move launches, resolved in arlongState).
  aTooth:   n(120, 12, 6, 22, { cost: 15, category: 'special', isSpecial: true, blockstun: adv(-8, 6, 22), hitstun: 30, rangeX: 70, knockbackX: 6,
              damageType: 'slash', al: { kind: 'tooth', tooth: true, lunge: [6, 17, 9], zoneOnHit: true } }),
  aDarts:   n(0, 10, 26, 40, { cost: 20, category: 'special', isSpecial: true, damageType: 'blunt', al: { kind: 'darts', noHit: true, travel: [10, 36], dmg: 135 } }),
  aSeiken:  n(0, 18, 3, 26, { cost: 25, category: 'special', isSpecial: true, damageType: 'blunt', al: { kind: 'seiken', noHit: true, spawnAt: 18, dmg: 115, chip: 15 } }),
  aThrow:   n(0, 14, 2, 18, { cost: 18, category: 'special', isSpecial: true, damageType: 'slash', al: { kind: 'throw', noHit: true, spawnAt: 14, dmg: 85 } }),
  aRecall:  n(0, 4, 2, 12, { category: 'special', isSpecial: true, damageType: 'slash', al: { kind: 'recall', noHit: true, spawnAt: 4, dmg: 70 } }),
  aPickup:  n(0, 6, 1, 8, { al: { kind: 'pickup', noHit: true, spawnAt: 6 } }),
  aTidal:   n(80, 14, 5, 24, { cost: 20, category: 'special', isSpecial: true, blockstun: adv(-10, 5, 24), hitstun: 30, rangeX: 118, rangeY: 34, hitLevel: 'low',
              knockbackX: 4, damageType: 'slash', blade: true, al: { kind: 'tidal', boxY: 62, knockdown: true, zoneOnHit: true, zoneOnWhiff: true } }),
  aKTidal:  n(68, 12, 5, 24, { cost: 20, category: 'special', isSpecial: true, blockstun: adv(-10, 5, 24), hitstun: 30, rangeX: 86, rangeY: 34, hitLevel: 'low',
              knockbackX: 4, al: { kind: 'tidal', boxY: 62, knockdown: true, zoneOnHit: true, zoneOnWhiff: true } }),   // weaponless Tidal Sweep: a karate sweep, same wave
  aShot:    n(0, 9, 2, 16, { cost: 12, category: 'special', isSpecial: true, damageType: 'projectile', al: { kind: 'shot', noHit: true, spawnAt: 9, dmg: 50 } }),

  // SUPER — ARLONG PARK (100 Tide). Scripted timeline (arlongState.tickSuper): flood · 4 torpedo strikes (60 blunt)
  // · Kiribachi finisher (120 slash) = 360 raw. Invulnerable throughout; 3 s Tide lockout afterwards.
  aSuper:   n(0, 14, 150, 30, { cost: 100, category: 'ultimate', isUltimate: true, invuln: 194, damageType: 'blunt',
              al: { kind: 'super', noHit: true, flood: 14, strikes: [40, 64, 88, 112], strikeDmg: 60, rise: 136, slamAt: 150, slamDmg: 120 } }),
}

// Source-frame index at exact elapsed sim frames (presentation follows the simulation, never drives it).
export const ARLONG_TIMELINES = {
  light: [[0, 0], [6, 1]], aStraight: [[0, 0], [9, 1]], aSwing: [[0, 0], [8, 1], [13, 2]], heavy: [[0, 0], [12, 1], [18, 2]],
  aLow: [[0, 0], [8, 1]], up: [[0, 0], [10, 1]], air: [[0, 0]], down_air: [[0, 0]], aLunge: [[0, 0], [11, 1]],
  aWake: [[0, 0], [3, 1], [6, 2]], aBite: [[0, 0], [6, 1], [10, 2]], aHeadbutt: [[0, 0], [6, 1], [10, 2]],
  aKSwing: [[0, 0], [11, 1]], aKHeavy: [[0, 0], [14, 1]], aKLow: [[0, 0]], aKAir: [[0, 0]], aKWake: [[0, 0], [4, 1]],
  aTooth: [[0, 0], [8, 1], [12, 2], [16, 3]], aDarts: [[0, 0], [10, 1], [14, 2], [18, 3], [22, 1], [26, 2], [30, 3], [36, 4]],
  aSeiken: [[0, 0], [12, 1], [18, 2], [24, 3]], aThrow: [[0, 0], [5, 1], [10, 2], [14, 3]], aRecall: [[0, 0], [8, 1]],
  aPickup: [[0, 0], [5, 1]], aTidal: [[0, 0], [10, 1], [16, 2]], aKTidal: [[0, 0]], aShot: [[0, 0], [9, 1]],
  aSuper: [[0, 0], [10, 1], [14, 2], [18, 3], [136, 4], [146, 5], [150, 6], [154, 7], [160, 8]],
}

const ANIM = Object.fromEntries(Object.entries(ARLONG_ANIM).map(([k, a]) => [k, ARLONG_TIMELINES[k] ? { ...a, frameTimeline: ARLONG_TIMELINES[k] } : a]))
ANIM.aHeadbutt = ANIM.aBite                       // 0-teeth headbutt: same frames
ANIM.aKTidal = { ...ANIM.aKLow, frameTimeline: [[0, 0]] }
ANIM.transform = ANIM.intro
export const ARLONG_ANIMS = ANIM
// Victory variant 2 (wide stance → blade overhead) / idle flex: the same set with `win` / `idle` pointing elsewhere.
export const ARLONG_WIN2_ANIM = { ...ANIM, win: ANIM.win2 }
export const ARLONG_FLEX_ANIM = { ...ANIM, idle: ANIM.idleFlex }

export const arlong = {
  rosterKey: 'arlong', name: 'Arlong', displayName: 'Arlong', hudName: 'Arlong', universe: 'one_piece', color: '#5b6fb0',
  // METADATA (phase 9). Universe "One Piece" = the existing `one_piece` group, next to Zoro, Luffy and Buggy.
  difficulty: 3, archetype: 'Heavy Bruiser / Zone Control',
  tagline: 'This is the difference in our species.',
  bio: 'Sawshark fishman and captain of the Arlong Pirates. Ten times a human\'s strength on land and more in the sea, he ruled Cocoyasi Village through fear and arithmetic. His teeth grow back. His pride never did.',
  portrait: './assets/arlong/portrait.png', hasSprites: true, spriteScale: 2.3 / 1.18,   // same GBA ripper/scale as Zoro, Luffy & Buggy
  spriteSheet: ARLONG_ANIM.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
  primary: 'bruiser', secondary: ['zoner'], archetypes: ['bruiser', 'zoner'],
  traits: { hasEnergy: true, energyType: 'tide', energyName: 'Tide', mobility: 'low', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Tide', color: '#4f7fd6' },
  // Brief: walkSpeed 4.4 · runSpeed 6.8 · jumpForce 9.5 · weight 1.3. Engine mapping (physics.js):
  //   walk px/f = clamp(4.5 + (speed − 78)/20 × 5, 4.5, 9.5) → the engine FLOOR is 4.5 (speed 78); arlongWalkMul
  //     applies 4.4/4.5 so he walks exactly 4.4 px/f out of water (×1.25 = 5.5 in water)
  //   ground dash = clamp(dashSpeed × 0.55, 8, 16) → the engine floor is 8 px/f (6.8 is below it; dashSpeed 13);
  //     ×1.25 in water (arlongDashMul) = 10 px/f swim-dash
  //   jumpPower ≈ jumpForce × 2.667 (Zoro: 10.5 → 28) → 25 · weight 1.3 → knockback taken ÷ 1.3 (arlongKnockback)
  stats: { maxHealth: 1120, maxEnergy: 100, attack: 82, defense: 84, speed: 78, jumpPower: 25, maxJumps: 1, weight: 1.3,
    dashSpeed: 13, dashDuration: 10, dashCooldownMax: 34 },
  movement: { crouchIdle: true },
  introSequence: ['intro'],
  basic_attacks: { light: ARLONG_MOVES.light, heavy: ARLONG_MOVES.heavy, crouchLight: ARLONG_MOVES.aLow, upAttack: ARLONG_MOVES.up,
    airAttack: ARLONG_MOVES.air, downAir: ARLONG_MOVES.down_air,
    grab: { damage: 35, startup: 8, active: 3, recovery: 22, hitstun: 20, throwForceX: 8, throwForceY: -4, damageType: 'grab' } },
  specials: {},
  ultimate: { name: 'Arlong Park', cost: 100 },
  animationData: ANIM,
}
