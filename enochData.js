// ENOCH (enoch, The Incredibles) — DATA ONLY: frame data, the thermal profile, move budgets and the roster entry.
// A tribute fighter for a friend from church who helped build Multiverse Smash: Frozone's ice, a visor that burns, and
// what happens where the two meet. Logic: enochState.js (sim) · enoch.js (command layer) · enochFx.js (render).
// Art: a region recolour of Frozone's supplied GBA sheet (tools/enoch/build_sprites.py; docs/enoch/EDIT_LEDGER.md).
// Frozone is untouched: nothing here imports or mutates frozone*.js.
import { ENOCH_ANIM } from './enochSprites.js'

// Stored damage = authored raw (roster convention, as Frozone): live loss = floor(stored × combo scale × 0.6 global).
export const dmg = raw => Math.round(raw)
export const ENOCH_SCALE = 2                       // integer nearest-neighbour presentation (Frozone's ×2)

// Move helper. adv = frame advantage on block when the FIRST active frame connects:
//   blockstun = (active − 1) + recovery + adv  → the attacker recovers exactly `adv` frames before / after the defender.
// box = [b0, b1, top, h]: px ahead of the hurtbox FRONT (b0..b1) and above the FEET (top) with height h.
const n = (raw, startup, active, recovery, adv, extra = {}) => ({ raw, damage: dmg(raw), startup, active, recovery, adv, frameExact: true,
  category: 'light', hitstun: 16, blockstun: Math.max(1, (active - 1) + recovery + adv), rangeX: 60, rangeY: 50, knockbackX: 3, knockbackY: -2,
  damageType: 'blunt', ...extra })

// ── NORMALS (no cost, thermal-neutral unless stated). Frames are the brief's; advantage values the brief left open are
// marked (*) and documented in docs/enoch/BALANCE_NOTES.md.
export const ENOCH_MOVES = {
  jab:      n(40, 5, 3, 8, +1, { box: [0, 64, 90, 40], strip: 'atkJab' }),                                        // R7 fr1 · +1 on block
  straight: n(62, 8, 3, 13, -3, { hitstun: 19, knockbackX: 5, box: [0, 84, 92, 42], strip: 'atkStraight' }),     // R7 fr2-3 · −3
  heavy:    n(88, 12, 4, 20, -5, { category: 'heavy', launcher: true, launchVy: -19, hitstun: 30, knockbackX: 4, knockbackY: -14,
              box: [0, 92, 110, 70], thermal: -5, strip: 'atkHeavy' }),                                           // R8 fr1-2 · launches · 5 colder
  low:      n(46, 7, 3, 13, -2, { hitLevel: 'low', hitstun: 18, box: [0, 86, 34, 34], strip: 'atkLow' }),       // R3 crouch · low · (*) −2
  rise:     n(78, 9, 4, 18, -4, { category: 'heavy', antiAir: true, hitstun: 24, knockbackX: 2, knockbackY: -12,
              box: [-20, 70, 170, 120], strip: 'atkRise' }),                                                      // R8 fr3 · anti-air · (*) −4
  air:      n(64, 6, 4, 13, 0, { air: true, hitstun: 20, knockbackX: 4, knockbackY: -3, box: [-10, 72, 96, 96], strip: 'atkAir' }),   // R5 jump frames
}
export const NORMAL_KEYS = Object.keys(ENOCH_MOVES)
export const CHAIN = { jab: 'straight', straight: 'heavy' }          // Jab → Straight → Heavy (clean-hit retaps)
export const HEAVY_FROM = ['jab', 'straight', 'low']

// ── SPECIALS (thermal-gated; `el` = the element the thermal profile checks; `th` = thermal push, ± = colder / hotter;
// `away` = pushed AWAY from 0 (water moves). Damage is the brief's raw value; the own-zone ×1.15 applies on top.)
const sp = (raw, startup, active, recovery, adv, extra = {}) => n(raw, startup, active, recovery, adv, { category: 'special', isSpecial: true, ...extra })
export const ENOCH_SPECIALS = {
  iceBlast:   sp(55, 12, 2, 18, -6, { el: 'ice', th: -12, damageType: 'projectile', noBody: true, releaseAt: 11, strip: 'atkStraight' }),   // ↓↘→+S
  frostFloor: sp(35, 12, 4, 20, -8, { el: 'ice', th: -15, hitLevel: 'low', knockbackY: -3, box: [0, 120, 30, 30], releaseAt: 12, strip: 'atkFloor' }),   // ↓↓+S
  deepFreeze: sp(40, 14, 4, 24, -10, { el: 'ice', th: -22, hitstun: 22, box: [0, 110, 96, 70], freeze: 42, cooldown: 480, strip: 'atkCone' }),      // ↓↙←+S · 0.7 s freeze
  iceDisc:    sp(0, 10, 1, 14, 0, { el: 'ice', th: -18, noBody: true, releaseAt: 9, strip: 'discPlant' }),                                       // ↓+Charge
  heatLens:   sp(58, 10, 2, 14, -6, { el: 'fire', th: 12, damageType: 'energy', noBody: true, releaseAt: 10, strip: 'atkLens' }),              // →→+S / ↓↘→+H
  scorch:     sp(50, 14, 5, 20, -8, { el: 'fire', th: 20, damageType: 'energy', box: [-10, 150, 110, 90], releaseAt: 15, strip: 'atkScorch' }), // ↓↙←+H
  steamBurst: sp(85, 9, 5, 22, -10, { el: 'water', th: 20, away: true, damageType: 'energy', box: [-30, 90, 120, 120], knockbackX: 7, knockbackY: -8, hitstun: 26, strip: 'atkSteam' }),   // ↓↘→+S (water unlocked)
  tideBreak:  sp(0, 16, 1, 22, 0, { el: 'water', th: 25, away: true, noBody: true, releaseAt: 16, cooldown: 360, strip: 'atkTide' }),        // →→+H
  condense:   sp(40, 12, 2, 18, -4, { el: 'water', th: 15, away: true, damageType: 'projectile', noBody: true, releaseAt: 12, strip: 'atkCondense' }),   // ↓↓+H
  slide:      n(55, 6, 10, 14, -6, { hitLevel: 'low', travel: [6, 16, 9], hitstun: 18, knockbackX: 5, box: [0, 70, 30, 30], strip: 'atkSlide' }),   // Down+Heavy / Light in a glide
  wake:       n(70, 6, 4, 22, -12, { category: 'heavy', invuln: 6, hitstun: 22, knockbackX: 6, knockbackY: -6, box: [0, 90, 100, 80], strip: 'atkWake' }),   // attack on wake-up
  super:      sp(0, 10, 2, 30, 0, { noBody: true, isUltimate: true, cost: 100, releaseAt: 10, range: 460, strip: 'atkSuper' }),                // ↓↘→↓↘→+S
}
export const ICE_BLAST = { speed: 11, life: 64, w: 40, h: 22, handX: 30, handY: 62, pool: 3, hitstun: 18, kbx: 4, kby: -2 }   // 11 px/f × 64 f ≈ 55 % of the screen
export const FROST_FLOOR = { ahead: 110 }
export const HEAT_LENS = { len: 1280, holdMax: 72, tickEvery: 6, tickRaw: 7, hotPerSec: 10, angleMax: Math.PI / 6, angleStep: Math.PI / 90, hitstun: 14, holdHitstun: 8, wetMul: 1.25 }
export const SCORCH = { ahead: 120 }
export const CONDENSE = { speed: 4, life: 150, w: 34, h: 34, handY: 70, steamRaw: 70, hailRaw: 60, hailSpeed: 9 }
export const TIDE = { burstRaw: 30 }
export const DISC = { hp: 80, life: 300, w: 110, height: 26, ahead: 40 }
export const GLIDE = { iceMul: 1.8, fireMul: 2.3, run: 8, maxFrames: 240, thermalPerSec: 6, trailW: 64, trailEvery: 3, fireSteer: 0.5, atkBonus: 1.10,
  rampVy: -15, rampVx: 0.8, turnFrames: 8 }
export const GUARD_CANCEL = { thermal: 25, invuln: 8, cooldown: 600 }
export const METER = { onHit: 0.10, onTaken: 0.06 }       // super meter (f.energy) from damage dealt / taken (stored raw)
export const SUPERS = {
  absoluteZero: { name: 'ABSOLUTE ZERO', damageType: 'blunt', total: 150, contacts: [{ at: 30, raw: 55 }, { at: 46, raw: 55 }, { at: 62, raw: 55 }, { at: 78, raw: 55 }, { at: 110, raw: 110 }], freeze: 42 },
  flashPoint:   { name: 'FLASH POINT', damageType: 'energy', total: 170, beamFrom: 20, beamTo: 140, tickEvery: 6, tickRaw: 10, flareAt: 150, flareRaw: 140 },
  thermalShock: { name: 'THERMAL SHOCK', damageType: 'blunt', total: 160, contacts: [{ at: 40, raw: 90 }, { at: 80, raw: 120 }, { at: 125, raw: 180 }], freeze: 30 },
}
export const SUPER_LOCK = 180                              // the thermal meter is locked for 3 s after a super
export const ALL_MOVES = { ...ENOCH_MOVES, ...ENOCH_SPECIALS }

// frame timelines (elapsed tick → strip frame)
export const TIMELINE = {
  jab: [[0, 0]], straight: [[0, 0], [7, 1]], heavy: [[0, 0], [11, 1]], low: [[0, 0], [5, 1], [10, 2]], rise: [[0, 0]], air: [[0, 0], [5, 1]],
  iceBlast: [[0, 0], [10, 1]], frostFloor: [[0, 0], [11, 1]], heatLens: [[0, 0], [9, 1]], condense: [[0, 0], [11, 1]], super: [[0, 0], [9, 1]],
  slide: [[0, 0], [3, 1], [8, 2]],
}

export const enoch = {
  rosterKey: 'enoch', name: 'Enoch', displayName: 'Enoch', universe: 'the_incredibles',
  color: '#ff9a3c', series: 'The Incredibles', era: 'Tribute fighter — region recolour of the supplied GBA Frozone sheet',
  tagline: 'Where ice meets fire.', introTitle: 'ENOCH', archetype: 'Elemental Controller / Trail Glider', difficulty: 5,
  bio: 'One of the people who helped build Multiverse Smash. He took Frozone\'s ice, added a visor that burns, and learned that the real power is what happens where the two meet.',
  contributor: true,
  primary: 'zoner', secondary: ['setplay', 'all-rounder'], archetypes: ['zoner', 'setplay', 'all-rounder'],
  traits: { hasEnergy: true, energyType: 'thermal', energyName: 'Super', mobility: 'high', scaling: 'combo', animeMovement: false },
  energyConfig: { label: 'Super', color: '#ffd27a' },
  // light weight (the brief's designed weakness); speed 92 (< the 98 teleport tier → the double-tap stays a dash)
  stats: { maxHealth: 980, maxEnergy: 100, attack: 84, defense: 62, speed: 92, jumpPower: 24, maxJumps: 2, weight: 0.85,
    dashSpeed: 26, dashDuration: 14, dashCooldownMax: 24 },
  hasSprites: true, spriteScale: ENOCH_SCALE, spriteSheet: ENOCH_ANIM.idle.sheet, portrait: './assets/enoch/portrait.png',
  movement: { crouchIdle: true }, fatalityVictimArt: false,
  introSequencePool: [['intro', 'introSettle']],
  basic_attacks: { light: ENOCH_MOVES.jab, heavy: ENOCH_MOVES.heavy, crouchLight: ENOCH_MOVES.low, upAttack: ENOCH_MOVES.rise,
    airAttack: ENOCH_MOVES.air, downAir: ENOCH_MOVES.air,
    grab: { damage: dmg(45), startup: 8, active: 3, recovery: 26, hitstun: 20, throwForceX: 10, throwForceY: -5, damageType: 'grab' } },
  specials: {},
  ultimate: { name: 'ABSOLUTE ZERO / FLASH POINT', cost: 100, description: 'The super changes with the thermal meter.' },
  animationData: {
    ...ENOCH_ANIM,
    ...Object.fromEntries(Object.entries(ALL_MOVES).map(([k, m]) => [k, { ...ENOCH_ANIM[m.strip], frameTimeline: TIMELINE[k] || [[0, 0]] }])),
  },
}
