// ninjaStormData.js — NINJA STORM RANGERS (MSv2): ONE fighter, two stances — Red (Shane Clarke, Air) and Yellow
// (Dustin Brooks, Earth). One roster entry, one health bar, one Focus bar; the stance swaps mid-match (the Ben 10
// ↓↓ + button dial, ninjaAcademy.js). Both stances run ONE frame-data table (same chassis, same numbers); the Yellow
// stance's earth names are flavour, its strips are Dustin's sheet, its Mode is Quake instead of Lightning and its
// weight is 0.85 instead of 0.8.
// Frame data is frame-exact (startup / active / recovery in 60 fps sim frames, combat.startMove's `frameExact` path).
// Block advantage via blockstun with the engine's measured offset (same formula as S.P.D. Red / Zoro):
//   adv = blockstun − (active − 1 + recovery) − 2.
import { NS_ANIM_RED, NS_ANIM_YELLOW } from './ninjaStormSprites.js'
import { registerRangerProfile } from './rangers.js'
import { registerAcademyProfile, NINJA_VANISH } from './ninjaAcademy.js'

export const NSR_KEY = 'ninja_storm_rangers'
export const isNinjaStorm = f => f?.rosterKey === NSR_KEY
export const STANCES = ['red', 'yellow']

// ── PROFILES ── NINJA VANISH = S.P.D. Red's Blink object itself (identical numbers by construction).
export const NSR_RANGER = registerRangerProfile(NSR_KEY, { ownTick: true, team: 'Wind Ninja Academy',
  badge: { color: '#d81e1e', accent: '#f0c419', emblem: 'wind' }, morph: { alwaysMorphed: true }, blink: NINJA_VANISH, sprites: { streak: 'fxStreak' } })
export const NSR_ACADEMY = registerAcademyProfile(NSR_KEY, {
  startStance: 'red',
  // ↓↓ + Light → Red (Shane) · ↓↓ + Heavy → Yellow (Dustin)
  dial: { buttons: { light: 'red', heavy: 'yellow' } },
  stances: {
    // LIGHTNING MODE: +15% damage, +1 extra Focus per passive tick, Vanish startup −1 f (min 1)
    red: { label: 'RED · SHANE', element: 'air', tint: '#9fd8ff', mode: { name: 'Lightning Mode', dmgMul: 1.15, extraPassive: 1, vanishStartup: 1 } },
    // QUAKE MODE: −10% damage taken, the heavy kick gets ×1.6 knockback + a knockdown
    yellow: { label: 'YELLOW · DUSTIN', element: 'earth', tint: '#b8ffd8', mode: { name: 'Quake Mode', takenMul: 0.90, heavyKbMul: 1.6, heavyKnockdown: true } },
  },
})
// per-stance stats that differ (everything else is shared): weight → knockback taken ÷ weight
export const STANCE_STATS = { red: { weight: 0.8 }, yellow: { weight: 0.85 } }

const n = (damage, startup, active, recovery, extra = {}) => ({ damage, startup, active, recovery,
  hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: 0, rangeX: 64, rangeY: 50, frameExact: true, damageType: 'blunt', ...extra })
const adv = (a, active, recovery) => a + (active - 1) + recovery + 2
// specials spend `cost` Focus on commit (nsStartMove). `nsr` = the module's own descriptor (kind, box, spawn frames).
const sp = (damage, startup, active, recovery, cost, extra = {}) => n(damage, startup, active, recovery, { category: 'special', isSpecial: true, cost, ...extra })

export const NS_MOVES = {
  // ── NORMALS (brief Phase 3; Yellow = the same table) ──
  light:     n(35, 5, 2, 8,   { blockstun: adv(+1, 2, 8), hitstun: 16, rangeX: 58, knockbackX: 2, nsr: { boxY: 18, h: 30 } }),              // Jab +1
  nStraight: n(55, 8, 2, 12,  { blockstun: adv(-3, 2, 12), hitstun: 22, rangeX: 70, nsr: { boxY: 18, h: 30 } }),                            // Straight −3
  heavy:     n(60, 9, 3, 15,  { blockstun: adv(-3, 3, 15), hitstun: 22, rangeX: 80, nsr: { boxY: 22, h: 40, chainKnockdown: true } }),      // Kick −3 (knockdown as a string ender)
  heavyQuake: n(60, 9, 3, 15, { blockstun: adv(-3, 3, 15), hitstun: 26, rangeX: 84, knockbackX: 3 * 1.6, nsr: { boxY: 18, h: 44, knockdown: true } }),   // Quake Mode heavy (×1.6 kb + knockdown)
  up:        n(75, 9, 4, 18,  { blockstun: adv(-8, 4, 18), hitstun: 26, rangeX: 64, rangeY: 130, launcher: true, launchVy: -20, nsr: { boxY: -46, h: 130 } }),   // Rising kick, anti-air, launches
  nLow:      n(40, 7, 3, 14,  { blockstun: adv(-4, 3, 14), hitstun: 18, rangeX: 86, rangeY: 30, hitLevel: 'low', nsr: { boxY: 64, h: 30 } }),   // Low kick, hits LOW
  air:       n(60, 4, 5, 12,  { blockstun: 12, hitstun: 20, rangeX: 72, rangeY: 80, knockbackY: -2, nsr: { boxY: 8, h: 80 } }),           // Air kick (Light)
  down_air:  n(60, 4, 5, 12,  { blockstun: 12, hitstun: 20, rangeX: 72, rangeY: 96, knockbackY: 4, nsr: { boxY: 30, h: 96 } }),          // Air kick (Heavy: diving)
  // ── SPECIALS ──
  // CRESCENT BLADE / EARTH BLADE ↓↘→+S (12): 3 sword hits × 20 at f8 / f14 / f20, the third knocks down.
  nBlade:    sp(20, 8, 13, 16, 12, { blockstun: 12, hitstun: 22, rangeX: 92, damageType: 'slash', nsr: { kind: 'blade', hits: [8, 14, 20], noEngineBox: true, boxY: 0, h: 80 } }),
  // CRESCENT WAVE / BOULDER WAVE ↓↙←+S (14): the crescent thrown, 45, full screen, ≤ 2 on screen.
  nWave:     sp(45, 12, 1, 16, 14, { damageType: 'slash', nsr: { kind: 'wave', fire: 12, noHit: true } }),
  nWaveAir:  sp(45, 10, 1, 14, 14, { damageType: 'slash', nsr: { kind: 'wave', fire: 10, noHit: true, air: true } }),
  // SHURIKEN / SAND SPIN THROW Special (8): 25, fast, ≤ 3 on screen, ground or air.
  nShuriken: sp(25, 6, 1, 12, 8, { damageType: 'projectile', nsr: { kind: 'shuriken', fire: 6, noHit: true } }),
  nShurikenAir: sp(25, 5, 1, 10, 8, { damageType: 'projectile', nsr: { kind: 'shuriken', fire: 5, noHit: true, air: true } }),
  // HAWK BLASTER / LION HAMMER LOCK-ON ↓+S held 10 f (18 on lock): reticle on the foe at the 10th frame → beam (Red) /
  // ground-slam shockwave (Yellow) at that spot 12 f later, 65. Released early = no lock, no cost (the aim drops).
  nLock:     sp(65, 10, 1, 20, 0, { damageType: 'energy', hitstun: 30, nsr: { kind: 'lock', lockAt: 10, fireAfter: 12, cost: 18, noHit: true } }),
  // SHADOW CLONE ←+S (20, ground or air; ↑+S in the air): plants the doppelganger where he stands.
  nClone:    sp(0, 6, 1, 10, 20, { nsr: { kind: 'clone', noHit: true } }),
  // KAWARIMI Block+S (10, needs a live clone, 90 f cooldown): instant swap, 6 f invulnerable.
  nSwap:     sp(0, 1, 1, 9, 0, { nsr: { kind: 'swap', noHit: true } }),
  // LIGHTNING / QUAKE MODE L+H+S (30, 600 f cooldown): 35 f cloud charge-in (invulnerable 24 f) → 240 f Mode.
  nMode:     sp(0, 34, 1, 0, 0, { invuln: 24, nsr: { kind: 'mode', noHit: true } }),
  // BACKSTEP ←+H: hop back 120 px, 6 f invulnerable, 300 f cooldown (shared by both stances). No hitbox.
  nBackstep: n(0, 1, 1, 18, { nsr: { kind: 'backstep', noHit: true, moveFrom: 1, moveTo: 12 } }),
  // ULTIMATE (100 Focus, all of it) — scripted: rush → giant-fist burst → debris. 260 raw pool (Twin: 2 × 130).
  nUlt:      n(0, 1, 1, 128, { category: 'ultimate', isUltimate: true, cost: 0, invuln: 130, damageType: 'blunt', nsr: { kind: 'ult', noHit: true } }),
}
// presentation aliases (same frame data, a different strip): Mode-flavoured blade, aiming up / in the air
NS_MOVES.nBladeMode = NS_MOVES.nBlade
NS_MOVES.nLockUp = NS_MOVES.nLock
NS_MOVES.nLockAir = NS_MOVES.nLock
export const NS_ULT = { rushTo: 14, reach: 0.45, ticks: [30, 40, 50, 62], split: [0.15, 0.15, 0.25, 0.45], pool: 260, debrisAt: 66, lockout: 180 }
export const NS_LIMITS = { wave: 2, shuriken: 3 }
// Per-stance move names (UI / move list / bubbles). Same slots, same numbers.
export const NS_NAMES = {
  red:    { light: 'Jab', nStraight: 'Straight', heavy: 'Kick', up: 'Rising Kick', nLow: 'Low Kick', air: 'Air Kick', down_air: 'Dive Kick',
            nBlade: 'Crescent Blade', nWave: 'Crescent Wave', nShuriken: 'Shuriken Throw', nLock: 'Hawk Blaster Lock-On', nMode: 'Lightning Mode', nUlt: 'Thunder Fist Finish' },
  yellow: { light: 'Tackle', nStraight: 'Shoulder Check', heavy: 'Stomp Kick', up: 'Rising Slam', nLow: 'Low Sweep', air: 'Air Stomp', down_air: 'Rock Drop',
            nBlade: 'Earth Blade', nWave: 'Boulder Wave', nShuriken: 'Sand Spin Throw', nLock: 'Lion Hammer Lock-On', nMode: 'Quake Mode', nUlt: 'Lion Zord Slam' },
}

// Source-frame index at exact elapsed sim frames (presentation follows the simulation).
export const NS_TIMELINES = {
  light: [[0, 0], [5, 1], [7, 2], [11, 3]],
  nStraight: [[0, 0], [3, 2], [6, 3], [8, 4], [10, 5]],
  heavy: [[0, 0], [4, 1], [9, 2], [12, 3], [18, 4], [23, 5]],
  heavyQuake: [[0, 0], [5, 1], [9, 1], [12, 2], [18, 3], [22, 4], [25, 5]],
  up: [[0, 0], [3, 1], [6, 2], [9, 3], [13, 4], [17, 5], [21, 6], [26, 7]],
  nLow: [[0, 0], [3, 1], [5, 2], [7, 3], [10, 4], [15, 5], [20, 6]],
  air: [[0, 0], [2, 1], [4, 2], [9, 3], [13, 4]],
  down_air: [[0, 0], [2, 1], [4, 2], [9, 3]],
  nBlade: [[0, 0], [4, 1], [8, 2], [11, 3], [14, 4], [16, 5], [17, 6], [18, 7], [19, 8], [20, 9], [27, 10], [32, 11]],
  nBladeMode: [[0, 0], [4, 1], [8, 2], [10, 3], [14, 4], [16, 5], [18, 6], [20, 7], [26, 8], [32, 9]],
  nWave: [[0, 0], [6, 1], [12, 2], [18, 3], [23, 4]],
  nWaveAir: [[0, 0], [5, 1], [10, 2], [15, 3], [20, 4]],
  nShuriken: [[0, 0], [3, 1], [6, 2], [10, 3], [14, 4]],
  nShurikenAir: [[0, 0], [5, 1], [10, 2]],
  nLock: [[0, 0], [10, 1]], nLockUp: [[0, 0], [4, 1], [8, 2], [10, 3]], nLockAir: [[0, 0], [10, 1]],
  nClone: [[0, 0], [2, 1], [4, 2], [6, 3], [10, 4]],
  nSwap: [[0, 0], [1, 2], [3, 3], [5, 4], [7, 5], [9, 6]],
  nMode: [[0, 0], [5, 1], [10, 2], [15, 3], [20, 4], [25, 5], [30, 6]],
  nBackstep: [[0, 0], [4, 1], [8, 2], [12, 3], [16, 4]],
  // rush (R11) → giant-fist burst (R23) → debris (R24): the burst / debris strips are drawn by the Fx layer by time
  nUlt: [[0, 0], [3, 1], [6, 2], [9, 3], [12, 4]],
}
const withTimelines = A => Object.fromEntries(Object.entries(A).map(([k, a]) => [k, NS_TIMELINES[k] ? { ...a, frameTimeline: NS_TIMELINES[k] } : a]))
// the scripted Ultimate's body plays the rush strip first (the Fx layer swaps in the burst / debris strips by time)
const extra = A => ({ ...A, nUlt: { ...A.nRush, frameTimeline: NS_TIMELINES.nUlt } })
export const NS_ANIMS = { red: extra(withTimelines(NS_ANIM_RED)), yellow: extra(withTimelines(NS_ANIM_YELLOW)) }

// Per-stance presentation (applied on every swap; health / Focus / position / Vanish charges never change).
export const STANCE_LOOK = {
  red:    { color: '#d81e1e', hudName: 'NS Rangers · Red', portrait: './assets/ninja_storm/red/portrait.png', hudIcon: './assets/ninja_storm/red/portrait.png' },
  yellow: { color: '#f0c419', hudName: 'NS Rangers · Yellow', portrait: './assets/ninja_storm/yellow/portrait.png', hudIcon: './assets/ninja_storm/yellow/portrait.png' },
}

// Stat line (brief): walk 5.6 / run 8.4 = S.P.D. Red's exact engine numbers (speed 88 → his tuned walk; run = holding
// the direction after a ground Vanish, rangers.js run 8.4), 1 jump (Vanish is the vertical answer), Focus 100. Speed
// never changes with the stance; weight does (0.8 Red / 0.85 Yellow). Health 1200 = S.P.D. Red's (the anchor).
const STATS = { maxHealth: 1200, maxEnergy: 100, attack: 84, defense: 76, speed: 88, jumpPower: 31, maxJumps: 1, weight: STANCE_STATS.red.weight,
  dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 }
const basic = () => ({ light: NS_MOVES.light, heavy: NS_MOVES.heavy, crouchLight: NS_MOVES.nLow, upAttack: NS_MOVES.up,
  airAttack: NS_MOVES.air, downAir: NS_MOVES.down_air,
  grab: { damage: 35, startup: 7, active: 3, recovery: 20, hitstun: 20, throwForceX: 8, throwForceY: -4, damageType: 'grab' } })

// ── THE ROSTER ENTRY (one) ── Naming follows the roster's dual-identity convention (shisui_itachi_kids: `name` is the
// select / HUD label, `title` the subtitle): name = "Ninja Storm Rangers", title / fullName = "Shane Clarke & Dustin Brooks".
export const ninjaStormRangers = {
  rosterKey: NSR_KEY, universe: 'power_rangers', subUniverse: 'Ninja Storm', hasSprites: true,
  spriteScale: 2.75 / 1.18,   // 48 px idle body × 2.75 ≈ 132 px (roster median, same as S.P.D. Red)
  spriteSheet: NS_ANIMS.red.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
  name: 'Ninja Storm Rangers', displayName: 'Ninja Storm Rangers', fullName: 'Shane Clarke & Dustin Brooks', title: 'Shane Clarke & Dustin Brooks',
  hudName: STANCE_LOOK.red.hudName, color: STANCE_LOOK.red.color, accent2: STANCE_LOOK.yellow.color,
  portrait: STANCE_LOOK.red.portrait, hudIcon: STANCE_LOOK.red.hudIcon,
  difficulty: 5, archetype: 'Teleport Rushdown / Mixup Ninja, dual-stance', tagline: 'Ninja Storm, ranger form!',
  bio: 'Shane Clarke and Dustin Brooks, Wind Ninja Academy graduates and the Red and Yellow Wind Rangers of Ninja Storm. ' +
    'Shane is the Air ninja, a skater and the team\'s leader, fighting with twin Ninja Swords, the Hawk Blaster and the Hawk Zord. ' +
    'Dustin is the Earth ninja, a laid-back motocross rider and the team\'s physical powerhouse, with the Lion Hammer and the Lion Zord. ' +
    'Each has his own Lightning upgrade. One fighter, two stances: the fight opens with Shane, and ↓↓ + a button tags in Dustin and back. ' +
    'One health bar, one Focus pool, two ninjas.',
  primary: 'rushdown', secondary: ['zoner'], archetypes: ['rushdown', 'zoner'],
  traits: { hasEnergy: true, energyType: 'focus', energyName: 'Focus', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Focus', color: '#3ee0c8' },
  movement: { crouchIdle: true }, introSequence: ['intro'],
  stats: STATS,
  basic_attacks: basic(), specials: {}, animationData: NS_ANIMS.red,
  ultimate: { name: 'Thunder Fist Finish / Lion Zord Slam', cost: 100 },
  stances: STANCES, isDualStance: true,
}
