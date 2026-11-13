// spdRedData.js — S.P.D. Red Ranger: Ranger profile + frame data + roster entry.
// Frame data is frame-exact (startup / active / recovery in 60fps simulation frames, the `frameExact` path in
// combat.startMove). Block advantage is set by blockstun with the engine's measured offset (same formula as Zoro /
// Buggy / Arlong): adv = blockstun − (active − 1 + recovery) − 2. Every move carries a `damageType` from the roster
// vocabulary in damageTypes.js ("slash" | "blunt" | "projectile" | "energy" | "grab").
import { SPD_RED_ANIM } from './spdRedSprites.js'
import { registerRangerProfile } from './rangers.js'

// ── RANGER PROFILE (rangers.js framework — docs/rangers/RANGER_FRAMEWORK.md) ──
export const SPD_RED_PROFILE = registerRangerProfile('spd_red', {
  ownTick: true,   // spdRedState.tickSpdRed calls tickRanger itself
  team: 'S.P.D. B-Squad',
  badge: { color: '#e0201c', accent: '#36d6e6', emblem: 'gem' },   // S.P.D. red + the WANTED-poster gem cyan
  morph: { alwaysMorphed: true },                                   // the sheet has no unmorphed Jack → born morphed
  // BLINK (brief Phase 5): 22% of the screen, 11 f (3 startup / 5 invulnerable / 3 recovery), 2 charges each refilling
  // over 90 f, crossups + air blinks allowed, no Delta cost. DODGE REWARD: travel overlapping a live foe hitbox /
  // projectile → +5 Delta and the next attack within 20 f does +15% (white flash on the streak). PHASE STEP: a
  // crossup costs no extra charge and leaves the foe facing the wrong way for 8 f.
  blink: { distPct: 0.22, startup: 3, travel: 5, recovery: 3, charges: 2, recharge: 90, crossup: true, air: true, vertical: false,
    faceLockOnCross: 8, dodge: { energy: 5, window: 20, dmgMul: 1.15 }, run: { speed: 8.4, walk: 5.6 } },
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

// Specials / Super spend `cost` Delta on commit (spdRedStartMove). `sr` = his own descriptor read by tickSpdRedMove
// (spdRedState.js) + the spd_red-gated hitbox: kind, spawn frames, travel, beam length, blink-cancel windows.
const sp = (damage, startup, active, recovery, cost, extra = {}) => n(damage, startup, active, recovery, { category: 'special', isSpecial: true, cost, ...extra })
export const SPD_RED_MOVES = {
  // ── NORMALS (all blunt) ──
  light:     n(40, 5, 2, 8,   { blockstun: adv(+1, 2, 8), hitstun: 16, rangeX: 62, knockbackX: 2 }),                    // Jab +1 (R4F1)
  sStraight: n(60, 8, 2, 12,  { blockstun: adv(-3, 2, 12), hitstun: 22, rangeX: 72 }),                                  // Straight −3 (R4F1→F2)
  sKick:     n(65, 9, 3, 15,  { blockstun: adv(-3, 3, 15), hitstun: 22, rangeX: 84 }),                                  // Kick −3 (R8F1→R13F6)
  heavy:     n(85, 12, 3, 20, { blockstun: adv(-5, 3, 20), hitstun: 44, rangeX: 84, launcher: true, launchVy: -16, knockbackX: 2 }),   // launcher: 44 f airborne hitstun → jump + air kick   // Heavy kick −5, launches (R10)
  sLow:      n(45, 7, 3, 14,  { blockstun: adv(-4, 3, 14), hitstun: 18, rangeX: 88, rangeY: 30, hitLevel: 'low', sr: { boxY: 62 } }),     // Low kick (R3→R8F2→R8F3)
  up:        n(80, 9, 4, 18,  { blockstun: adv(-8, 4, 18), hitstun: 24, rangeX: 72, rangeY: 130, launcher: true, launchVy: -22, selfVy: 0, sr: { boxY: -40 } }),   // Rising kick, anti-air (R13F1-3)
  air:       n(65, 4, 5, 12,  { blockstun: 12, hitstun: 20, rangeX: 80, rangeY: 90, knockbackX: 3, knockbackY: -2, sr: { boxY: 4 } }),   // Air kick (R7): fast + body-tall so it meets a launched foe on the way up
  down_air:  n(60, 8, 6, 14,  { blockstun: 12, hitstun: 20, rangeX: 64, rangeY: 120, knockbackY: 8 }),                  // air ↓ flip kick (R7F3)
  // Acrobatic flip (←+Heavy): a back-handspring roll, 112 px back, invulnerable for its first 8 frames. No hitbox.
  sFlip:     n(0, 1, 1, 20,   { invuln: 8, sr: { kind: 'flip', noHit: true, back: 7, moveFrom: 1, moveTo: 16 } }),
  // Wake-up reversal (↓+Heavy, or any attack button on the wake-up frames): 6 invulnerable frames, −12 on block.
  sWake:     n(70, 5, 3, 24,  { blockstun: adv(-12, 3, 24), hitstun: 26, rangeX: 80, knockbackX: 5, invuln: 6, sr: { kind: 'wake' } }),
  // ── SPECIALS ──
  // DELTA BLASTER ↓+Special (10): one R18 bolt, 50, full screen, ground or air; at most 4 of his bolts on screen.
  sBlaster:    sp(50, 10, 1, 14, 10, { damageType: 'projectile', sr: { kind: 'blaster', noHit: true, fire: [10] } }),
  sBlasterAir: sp(50, 8, 1, 12, 10,  { damageType: 'projectile', sr: { kind: 'blaster', noHit: true, fire: [8], air: true } }),
  // RAPID FIRE: keep ↓+Special held through the Blaster's wind-up (+10 → 20 total): 5 tracer bolts × 25 at 10/s,
  // each with a deterministic hash spread (rangerHash(match seed, frame, player index)).
  sRapid:      sp(25, 2, 26, 12, 10, { damageType: 'projectile', sr: { kind: 'rapid', noHit: true, fire: [2, 8, 14, 20, 26] } }),
  // DELTA CHARGE →→+Special (15): R12 handstand dash kick, 95, travels 40% of the screen (512 px), knockdown. On hit
  // or block it can be cancelled into a BLINK (costs a charge).
  sCharge:     sp(95, 8, 16, 18, 15, { blockstun: 18, hitstun: 30, rangeX: 80, knockbackX: 8, sr: { kind: 'charge', travel: 0.40, knockdown: true, blinkCancel: 'contact' } }),
  // PHASE STRIKE ↓↘→+Special (18): he phases THROUGH the foe on frame 3 (always crosses up, reach 45% of the
  // screen) and lands an R11 flying kick from behind, 100. Invulnerable frames 0-9.
  sPhase:      sp(100, 12, 3, 18, 18, { invuln: 10, blockstun: 16, hitstun: 28, rangeX: 84, knockbackX: 6, sr: { kind: 'phase', warpAt: 3, reach: 0.45 } }),
  // SKY UPPERCUT ↑+Special (20): R13 rising split kick, 110, launches; he rises with it and can BLINK out of the
  // airborne recovery.
  sUpper:      sp(110, 6, 6, 22, 20, { blockstun: 14, hitstun: 34, rangeX: 70, rangeY: 140, launcher: true, launchVy: -24, sr: { kind: 'upper', rise: -19, boxY: -30, blinkCancel: 'air' } }),
  // DELTAMAX STRIKE ↓↙←+Special (25): R16 braced → R18 beam, 120 energy, 70% of the screen (896 px), erases enemy
  // projectiles it touches, long 18 f startup (his slowest special; it still links off the Straight's 22 f hitstun).
  sDeltamax:   sp(120, 18, 6, 26, 25, { damageType: 'energy', blockstun: 20, hitstun: 36, knockbackX: 9, sr: { kind: 'beam', beam: 0.70, boxY: 0, boxH: 34, pierce: true } }),
  // SUPER "S.P.D. EMERGENCY: DELTA SQUAD FULL POWER" ↓↘→↓↘→+Special or Ultimate (100 = all Delta): poster flash →
  // 3 blink strikes from three angles (front R11, behind R12, below R13) × 55 → R16 beam 180 (220 after a GUILTY
  // verdict this round) = 345. Then 3 s Delta lockout and both teleport charges refill. Scripted (tickSpdRedMove).
  sSuper:      n(0, 1, 1, 108, { category: 'ultimate', isUltimate: true, cost: 0, invuln: 110, damageType: 'energy', sr: { kind: 'super', noHit: true } }),
  // JUDGMENT — point the morpher (R14F1-F2): time stops 30 f while it scans, then the verdict. Invulnerable, no hitbox.
  sJudge: n(0, 30, 1, 10, { category: 'special', isSpecial: true, invuln: 41, damageType: 'energy', sr: { kind: 'judge', noHit: true } }),
}
export const SPD_SUPER = { strikes: [24, 38, 52], strikeDmg: 55, back: 62, beamAt: 78, beamDmg: 180, beamGuilty: 220, reach: 0.70, flash: 20, lockout: 180 }

// Source-frame index at exact elapsed sim frames (presentation follows the simulation, never drives it).
export const SPD_RED_TIMELINES = {
  sJudge: [[0, 0], [6, 1]],
  sStraight: [[0, 0], [8, 1]], sKick: [[0, 0], [9, 1]], heavy: [[0, 0], [12, 1], [15, 2]], sLow: [[0, 0], [7, 1], [10, 2]],
  up: [[0, 0], [9, 1], [13, 2]], sFlip: [[0, 0], [4, 1], [10, 2], [16, 3]], sWake: [[0, 0], [3, 1], [5, 2]],
  sBlaster: [[0, 0], [5, 1], [10, 2]], sCharge: [[0, 0], [8, 1]], sPhase: [[0, 0], [12, 1]], sUpper: [[0, 0], [6, 1], [16, 2]],
  sDeltamax: [[0, 0], [18, 1], [21, 2]],
  // R9F2 pose → R17 blink → R11F2 front → R17 → R12F1 behind → R17 → R13F2 below → R17 back out → R16F3 brace → R16F1 → R16F2 beam
  sSuper: [[0, 0], [20, 1], [24, 2], [34, 3], [38, 4], [48, 5], [52, 6], [62, 5], [66, 7], [74, 8], [78, 9]],
}
const ANIM = Object.fromEntries(Object.entries(SPD_RED_ANIM).map(([k, a]) => [k, SPD_RED_TIMELINES[k] ? { ...a, frameTimeline: SPD_RED_TIMELINES[k] } : a]))
export const SPD_RED_ANIMS = ANIM
// Presentation swaps (render picks the set; the art is the same ledgered frames): WIN 2 = the R16 braced pose in the
// win slot; IDLE > 10 s = R1 on the glint strip (the blue gem glint itself is drawn by spdRedFx).
export const SPD_RED_WIN2_ANIM = { ...ANIM, win: ANIM.win2 }
export const SPD_RED_GLINT_ANIM = { ...ANIM, idle: ANIM.idleGlint }

export const spdRed = {
  rosterKey: 'spd_red', name: 'SPDRed', displayName: 'S.P.D. Red Ranger', hudName: 'S.P.D. Red', universe: 'power_rangers', color: '#e0201c',
  // METADATA (phase 10). Universe "Power Rangers" = the existing `power_rangers` group (Omega / Samurai / MMPR rangers).
  difficulty: 4, archetype: 'Teleport Rushdown / Judge',
  tagline: 'S.P.D. Emergency!',
  bio: 'Jack Landors, Red Ranger of S.P.D. B-Squad. A former street thief who could walk through walls long before he had a morpher. Now he blinks across a battlefield and passes judgment at the end of it.',
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
