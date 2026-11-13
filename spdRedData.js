// spdRedData.js — S.P.D. Red Ranger: Ranger profile + frame data + roster entry.
// Frame data is frame-exact (startup / active / recovery in 60fps simulation frames, the `frameExact` path in
// combat.startMove). Block advantage is set by blockstun with the engine's measured offset (same formula as Zoro /
// Buggy / Arlong): adv = blockstun − (active − 1 + recovery) − 2. Every move carries a `damageType` from the roster
// vocabulary in damageTypes.js ("slash" | "blunt" | "projectile" | "energy" | "grab").
import { SPD_RED_ANIM } from './spdRedSprites.js'
import { registerRangerProfile } from './rangers.js'

// ── RANGER PROFILE (rangers.js framework — docs/rangers/RANGER_FRAMEWORK.md) ──
export const SPD_RED_PROFILE = registerRangerProfile('spd_red', {
  team: 'S.P.D. B-Squad',
  badge: { color: '#e0201c', accent: '#36d6e6', emblem: 'gem' },   // S.P.D. red + the WANTED-poster gem cyan
  morph: { alwaysMorphed: true },                                   // the sheet has no unmorphed Jack → born morphed
  blink: { run: { speed: 8.4, walk: 5.6 } },
  // JUDGMENT (brief Phase 4): 1 point per hit, 20 to fill; verdict GUILTY at or below 30% HP; time freezes 30 f;
  // GUILTY = sealed in the gem card 3 s (cannot act, the card absorbs 50%), released at the far side of the screen;
  // INNOCENT = +40 Delta and the meter stays full 5 s for one re-attempt. Once per round. A Ranger foe is always innocent.
  judgment: { meterMax: 20, perHit: 1, rule: { type: 'hpAtOrBelow', pct: 0.30 }, freeze: 30,
    guilty: { seal: 180, absorb: 0.5, release: 'farSide', releaseDist: 0.45 }, innocent: { energy: 40, holdFull: 300 },
    oncePerRound: true, rangerAlwaysInnocent: true },
  sprites: { streak: 'streakD', vanish: 'streakH', emblem: 'gem' },
})

const n = (damage, startup, active, recovery, extra = {}) => ({ damage, startup, active, recovery,
  hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: 0, rangeX: 64, rangeY: 50, frameExact: true, damageType: 'blunt', ...extra })
const adv = (a, active, recovery) => a + (active - 1) + recovery + 2

export const SPD_RED_MOVES = {
  light: n(40, 5, 2, 8,   { blockstun: adv(+1, 2, 8), hitstun: 16, rangeX: 62, knockbackX: 2 }),     // Jab +1
  heavy: n(65, 9, 3, 15,  { blockstun: adv(-3, 3, 15), hitstun: 22, rangeX: 80 }),                   // Kick −3
  sLow:  n(45, 7, 3, 14,  { blockstun: adv(-4, 3, 14), hitstun: 18, rangeX: 88, rangeY: 30, hitLevel: 'low' }),
  up:    n(80, 9, 4, 18,  { blockstun: adv(-8, 4, 18), hitstun: 24, rangeX: 72, rangeY: 130, launcher: true, launchVy: -22, selfVy: 0 }),
  air:   n(65, 6, 5, 10,  { blockstun: 12, hitstun: 20, rangeX: 80, rangeY: 64, knockbackX: 3, knockbackY: -2 }),
  down_air: n(60, 8, 6, 14, { blockstun: 12, hitstun: 20, rangeX: 64, rangeY: 120, knockbackY: 8 }),   // air ↓ flip kick (R7F3)
}

const ANIM = { ...SPD_RED_ANIM }
export const SPD_RED_ANIMS = ANIM

export const spdRed = {
  rosterKey: 'spd_red', name: 'SPDRed', displayName: 'S.P.D. Red Ranger', hudName: 'S.P.D. Red', universe: 'power_rangers', color: '#e0201c',
  portrait: './assets/spd_red/portrait.png', hasSprites: true, spriteScale: 2.4 / 1.18,   // the engine draws ×1.18 → 2.4× = his 55 px idle body ≈ 132 px (roster median; Zoro 56 px @ 2.3×)
  spriteSheet: SPD_RED_ANIM.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
  primary: 'rushdown', secondary: ['zoner'], archetypes: ['rushdown', 'zoner'],
  traits: { hasEnergy: true, energyType: 'delta', energyName: 'Delta', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Delta', color: '#36d6e6' },
  // Brief: health 950 · walkSpeed 5.6 · runSpeed 8.4 · jumpForce 11.5 · weight 0.9. Engine mapping (physics.js):
  //   walk px/f = clamp(4.5 + (speed − 78)/20 × 5, 4.5, 9.5) → speed 82.4 = exactly 5.6 px/f
  //   run = holding the direction after a ground BLINK (rangers.js run: walk × 8.4/5.6 = 8.4 px/f). The engine's
  //     double-tap dash is OFF for Rangers (noDash) — the double-tap is the blink. dashSpeed 15.3 (= 8.4 / 0.55) is
  //     kept for any engine path that still reads it.
  //   jumpPower ≈ jumpForce × 2.667 (Zoro: 10.5 → 28) → 31 · weight 0.9 → knockback taken ÷ 0.9 (spdRedKnockback)
  stats: { maxHealth: 950, maxEnergy: 100, attack: 84, defense: 76, speed: 82.4, jumpPower: 31, maxJumps: 1, weight: 0.9,
    dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  movement: { crouchIdle: true },
  introSequence: ['intro'],
  basic_attacks: { light: SPD_RED_MOVES.light, heavy: SPD_RED_MOVES.heavy, crouchLight: SPD_RED_MOVES.sLow, upAttack: SPD_RED_MOVES.up,
    airAttack: SPD_RED_MOVES.air, downAir: SPD_RED_MOVES.down_air,
    grab: { damage: 35, startup: 7, active: 3, recovery: 20, hitstun: 20, throwForceX: 8, throwForceY: -4, damageType: 'grab' } },
  specials: {},
  ultimate: { name: 'S.P.D. Emergency: Delta Squad Full Power', cost: 100 },
  animationData: ANIM,
}
