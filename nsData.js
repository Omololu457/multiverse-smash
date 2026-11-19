// nsData.js — MSV1: Power Rangers Ninja Storm — SHANE CLARKE (Red Wind Ranger, AIR, ns_red) and DUSTIN BROOKS (Yellow Wind
// Ranger, EARTH, ns_yellow). Two ninja.js profiles + frame data + roster entries. Built on the S.P.D. Red foundation:
// same speed tier (speed 88 → 7.0 walk, run 8.4/5.6 → 10.5 px/f), same rangers.js double-tap detector (12-tick window).
// Frame data is frame-exact (combat.startMove `frameExact`). Every move carries a damageType from damageTypes.js.
// Art: one shared frame map (docs/msv1/SPRITE_MAP.md), strips packed by tools/msv1/pack_msv1.py. Sprites face right.
import { MSV1_STRIPS, MSV1_CELL } from './msv1Sprites.js'
import { registerNinjaProfile } from './ninja.js'

// ── ANIMS ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const A = (key, strip, speed = 6, extra = {}) => ({ sheet: `./assets/${key}/${strip}.png`, frames: MSV1_STRIPS[strip], width: MSV1_CELL.width, height: MSV1_CELL.height,
  speed, anchorY: 0, originX: MSV1_CELL.originX, originY: MSV1_CELL.originY, loop: false, lockLastFrame: true, ...extra })
// frame timeline: wind-up frames over the startup, the impact frame on the first active frame, the rest over the recovery
function TL(strip, md, impact = 0.4) {
  const n = MSV1_STRIPS[strip]; if (!md || n <= 1) return [[0, 0]]
  const st = md.startup ?? 5, ac = md.active ?? 3, rc = md.recovery ?? 10, k = Math.max(1, Math.min(n - 1, Math.round(n * impact)))
  const out = []
  for (let i = 0; i < k; i++) out.push([Math.floor(st * i / k), i])
  const rest = n - k
  for (let i = 0; i < rest; i++) out.push([st + Math.floor((ac + rc) * i / rest), k + i])
  return out.filter((e, i, arr) => i === 0 || e[0] > arr[i - 1][0])
}
// move key → strip (every one of the 58 strips is drawn somewhere: states, moves, framework poses or FX)
const MOVE_STRIP = {
  light: 'jab', kString1: 'string', kString2: 'stringEnd', kString3: 'kickHeavy', up: 'risingKick', sUpper: 'uppercut', sLow: 'low',
  sword: 'sword', swordMove: 'swordMove', swordRise: 'swordRise', swordCrouch: 'swordCrouch', swordLow: 'swordLow', axe: 'axe', sWake: 'crouchStrike',
  air: 'swordAir', airKick: 'airAttack', dive: 'diveKick', slide: 'skid', sGale: 'galeCrescent', sRock: 'galeCrescent', grab: 'punchAlt', throw: 'punchAlt',
  sTornado: 'tornado', sBeam: 'stance', sBeamAir: 'throwAir', sKunai: 'throw', sKunaiAir: 'throwAir', sTrap: 'throw', sErupt: 'risingKick',
  nsStreak: 'streak', nsTremor: 'duck', nsStreakStrike: 'flipKick', nsStreakRec: 'getUp', nsVanish: 'smoke', nsVanishGone: 'seated', nsVanishOut: 'smokeFade',
  nsMirror: 'stance', nsClone: 'guard', nsBarrier: 'swordDome', nsDome: 'dome', nsBarrierEnd: 'guard', nsBurrow: 'duck',
  landRecover: 'landRecover', land: 'land', dropDive: 'dive', sSuper: 'stance', sUlt: 'stance', superTornado: 'tornado', superFinish: 'galeCrescent2', superSlam: 'land', superDive: 'diveKick',
}
function buildAnims(key, moves) {
  const out = {
    idle: A(key, 'idle', 9, { loop: true }), walk: A(key, 'run', 6, { loop: true }), walk_back: A(key, 'run', 7, { loop: true }), run: A(key, 'run', 4, { loop: true }),
    dash: A(key, 'streak', 3), jump: A(key, 'jump', 5), fall: A(key, 'airRecover', 8), crouch: A(key, 'crouch', 4), guard: A(key, 'guard', 6, { loop: true }),
    guard_hit: A(key, 'guard', 6), hurt: A(key, 'hurt', 4), hurt_heavy: A(key, 'tumble', 5), hurt_air: A(key, 'airTumble', 4), knockdown: A(key, 'knockdown', 5),
    getup: A(key, 'getUpRoll', 4), taunt: A(key, 'stance', 7), intro: A(key, 'runStop', 8), win: A(key, 'victory', 10), lose: A(key, 'lying', 8),
    airSpin: A(key, 'airSpin', 4, { loop: true }), streakTail: A(key, 'streakTail', 4), runStop: A(key, 'runStop', 6),
    landRecover: A(key, 'landRecover', 4), land: A(key, 'land', 4), dropDive: A(key, 'dive', 4), superTornado: A(key, 'tornado', 3, { loop: true }),
    superFinish: A(key, 'galeCrescent2', 4), superSlam: A(key, 'land', 4), superDive: A(key, 'diveKick', 4),
  }
  for (const [k, md] of Object.entries(moves)) {
    const strip = MOVE_STRIP[k]; if (!strip) continue
    const loop = /^(sTornado|nsDome|nsBurrow|nsStreak|nsTremor|nsVanishGone)$/.test(k)
    out[k] = A(key, strip, loop ? 3 : 5, loop ? { loop: true } : { frameTimeline: TL(strip, md) })
  }
  return out
}

// ── FRAME DATA helpers (S.P.D. Red's conventions) ──────────────────────────────────────────────────────────────────
const n = (damage, startup, active, recovery, extra = {}) => ({ damage, startup, active, recovery,
  hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: 0, rangeX: 64, rangeY: 50, frameExact: true, damageType: 'blunt', nj: { kind: 'normal' }, ...extra })
const sp = (damage, startup, active, recovery, np, extra = {}) => n(damage, startup, active, recovery, { category: 'special', isSpecial: true, np, ...extra })
const fw = (startup, active, recovery, kind, extra = {}) => n(0, startup, active, recovery, { nj: { kind, noHit: true }, ...extra })
// framework poses / states (no hitbox of their own; the framework moves the body)
const FRAMEWORK = {
  nsStreak: fw(0, 1, 11, 'streak'), nsTremor: fw(0, 1, 11, 'streak'), nsStreakRec: fw(0, 1, 13, 'streakRec'),
  nsVanish: fw(0, 1, 19, 'vanish'), nsVanishOut: fw(0, 1, 7, 'vanishOut'), nsMirror: fw(0, 1, 11, 'mirror'),
  nsClone: fw(0, 1, 13, 'clone'), nsBarrier: fw(0, 1, 98, 'barrier'), nsBarrierEnd: fw(0, 1, 9, 'barrierEnd'), nsBurrow: fw(0, 1, 98, 'burrow'),
}

// ── SHANE CLARKE — RED WIND RANGER (AIR) ──────────────────────────────────────────────────────────────────────────
const SHANE_MOVES = {
  ...FRAMEWORK,
  light:      n(38, 5, 2, 8,   { hitstun: 16, rangeX: 60 }),                                                   // Jab (R4)
  kString1:   n(30, 6, 2, 10,  { hitstun: 18, rangeX: 66 }),                                                   // Kick string 1 (R4 tail)
  kString2:   n(30, 6, 2, 11,  { hitstun: 20, rangeX: 70 }),                                                   // Kick string 2
  kString3:   n(52, 8, 3, 16,  { hitstun: 30, rangeX: 80, knockbackX: 7 }),                                    // Kick string 3 (R5 heavy kick)
  up:         n(70, 8, 4, 18,  { hitstun: 28, rangeX: 64, rangeY: 130, launcher: true, launchVy: -20, nj: { kind: 'normal', boxY: -40 } }),   // Rising flip kick, anti-air (R6)
  sUpper:     n(62, 7, 4, 18,  { hitstun: 28, rangeX: 58, rangeY: 120, launcher: true, launchVy: -18, nj: { kind: 'normal', boxY: -30 } }),  // Uppercut (upAttack button, R13)
  sLow:       n(44, 7, 3, 14,  { hitstun: 18, rangeX: 86, rangeY: 30, hitLevel: 'low', nj: { kind: 'normal', boxY: 62 } }),                     // Low sweep (R12)
  sword:      n(64, 9, 3, 16,  { damageType: 'slash', hitstun: 24, rangeX: 92 }),                                                               // Sword slash (R14)
  swordMove:  n(60, 8, 3, 16,  { damageType: 'slash', hitstun: 24, rangeX: 96, knockbackX: 6 }),                                                 // Running slash (R15 tail)
  swordRise:  n(56, 7, 4, 18,  { damageType: 'slash', hitstun: 24, rangeX: 70, rangeY: 130, launcher: true, launchVy: -16, nj: { kind: 'normal', boxY: -50 } }),   // Rising slash (R16 tail)
  swordCrouch:n(48, 8, 3, 15,  { damageType: 'slash', hitstun: 20, rangeX: 90, rangeY: 34, hitLevel: 'low', nj: { kind: 'normal', boxY: 58 } }),   // Crouch slash (R17)
  swordLow:   n(54, 9, 3, 17,  { damageType: 'slash', hitstun: 22, rangeX: 84, rangeY: 40, hitLevel: 'low', nj: { kind: 'normal', boxY: 52 } }),   // Low swipe (R16)
  axe:        n(56, 14, 3, 16, { hitstun: 24, rangeX: 64, hitLevel: 'overhead' }),                                                            // Axe kick overhead (R7)
  sWake:      n(60, 5, 3, 22,  { hitstun: 24, rangeX: 72, invuln: 6 }),                                                                        // Wake-up crouch strike (R5)
  air:        n(58, 5, 4, 12,  { damageType: 'slash', hitstun: 20, rangeX: 82, rangeY: 90, nj: { kind: 'normal', boxY: 4 } }),                 // Air sword (R18)
  airKick:    n(46, 4, 4, 12,  { hitstun: 18, rangeX: 72, rangeY: 80, nj: { kind: 'normal', boxY: 10 } }),                                     // Air kick (R10)
  // HAWK DIVE air ↓+Heavy: R9 dive kick 72, spikes → ground bounce
  dive:       n(72, 6, 30, 4,  { hitstun: 30, rangeX: 60, rangeY: 80, knockbackY: 10, nj: { kind: 'dive', vx: 9, vy: 15, boxY: 30, landRec: 12 } }),
  // SKATE SLIDE ↘+Heavy: R11 skid, 50 low, slides under projectiles (skateboarder nod)
  slide:      n(50, 6, 14, 14, { hitstun: 22, rangeX: 50, rangeY: 34, hitLevel: 'low', nj: { kind: 'travel', dist: 0.24, frames: 14, boxY: 60, underProjectiles: 20, trail: 'dust' } }),
  // ── SPECIALS ──
  // 1. AIR NINJA TORNADO ↓↘→+Special: R11 drill, travels 50% screen, 5 × 13 energy; air: on the held angle 0 / ±30°
  sTornado:   sp(0, 8, 30, 16, 20, { damageType: 'energy', nj: { kind: 'travel', noHit: true, dist: 0.50, frames: 30, airAngle: true, multi: { every: 6, n: 5, dmg: 13, type: 'energy', launch: -12, cue: 'tornadoHit' }, trail: 'wind' } }),
  // 2. GALE CRESCENT →+Heavy: the R15 crescent arc detaches as a short wind projectile, 55 slash, 35% screen
  sGale:      sp(55, 10, 1, 18, 12, { damageType: 'slash', nj: { kind: 'proj', noHit: true, proj: { at: 10, speed: 12, dmg: 55, type: 'slash', sprite: 'proj_crescent', sw: 26, sh: 43, life: 38, w: 30, h: 60, radius: 30, oy: 60, scale: 2.4, name: 'nsGale', cue: 'gale' } } }),
  // 3. NINJA BEAM ↓↘→+Light: Wind Morpher beam, 50 projectile, full screen. Air: R21 diagonal beam downward (Laser Blaster)
  sBeam:      sp(50, 12, 1, 16, 15, { damageType: 'projectile', nj: { kind: 'proj', noHit: true, proj: { at: 12, speed: 24, dmg: 50, sprite: 'proj_beam', frames: 3, sw: 47, sh: 16, w: 60, h: 20, radius: 22, oy: 62, name: 'nsBeam', cue: 'beam' } } }),
  sBeamAir:   sp(50, 10, 1, 14, 15, { damageType: 'projectile', nj: { kind: 'proj', noHit: true, proj: { at: 10, speed: 20, angle: 40, dmg: 50, sprite: 'proj_beamDiag', frames: 3, sw: 64, sh: 47, w: 40, h: 40, radius: 24, oy: 50, name: 'nsBeam', cue: 'beam' } } }),
  // 4. KUNAI ↓↙←+Light: R20 throw, 1 straight on the ground, a 3-kunai fan in the air, 30 each
  sKunai:     sp(30, 9, 1, 14, 10, { damageType: 'projectile', nj: { kind: 'proj', noHit: true, proj: { at: 9, speed: 18, dmg: 30, sprite: 'proj_spark', sw: 34, sh: 18, w: 34, h: 16, radius: 16, oy: 60, scale: 2, name: 'nsKunai', cue: 'kunai' } } }),
  sKunaiAir:  sp(30, 8, 1, 14, 10, { damageType: 'projectile', nj: { kind: 'proj', noHit: true, proj: { at: 8, speed: 17, count: 3, gap: 0, angles: [12, 28, 44], dmg: 30, sprite: 'proj_spark', sw: 34, sh: 18, w: 34, h: 16, radius: 16, oy: 56, scale: 2, name: 'nsKunai', cue: 'kunai' } } }),
  // SUPER (1 bar) STORM ASCENSION ↓↘→↓↘→+Special · ULTIMATE (2 bars, Ninja Mirror only) HAWK MIRAGE
  sSuper:     n(0, 1, 1, 92, { category: 'ultimate', isUltimate: true, bars: 1, invuln: 94, damageType: 'energy', nj: { kind: 'super', noHit: true } }),
  sUlt:       n(0, 1, 1, 74, { category: 'ultimate', isUltimate: true, bars: 2, invuln: 76, damageType: 'blunt', nj: { kind: 'super', noHit: true } }),
}
// ── DUSTIN BROOKS — YELLOW WIND RANGER (EARTH) ────────────────────────────────────────────────────────────────────
const DUSTIN_MOVES = {
  ...FRAMEWORK,
  light:      n(42, 5, 2, 9,   { hitstun: 16, rangeX: 60 }),
  kString1:   n(34, 6, 2, 11,  { hitstun: 18, rangeX: 66 }),
  kString2:   n(34, 7, 2, 12,  { hitstun: 20, rangeX: 70 }),
  kString3:   n(58, 9, 3, 17,  { hitstun: 30, rangeX: 80, knockbackX: 8 }),
  up:         n(76, 8, 4, 19,  { hitstun: 28, rangeX: 64, rangeY: 130, launcher: true, launchVy: -19, nj: { kind: 'normal', boxY: -40 } }),
  sUpper:     n(66, 7, 4, 19,  { hitstun: 28, rangeX: 58, rangeY: 120, launcher: true, launchVy: -17, nj: { kind: 'normal', boxY: -30 } }),
  sLow:       n(50, 7, 3, 15,  { hitstun: 18, rangeX: 86, rangeY: 30, hitLevel: 'low', nj: { kind: 'normal', boxY: 62 } }),
  sword:      n(70, 10, 3, 17, { damageType: 'slash', hitstun: 24, rangeX: 92 }),
  swordMove:  n(66, 9, 3, 17,  { damageType: 'slash', hitstun: 24, rangeX: 96, knockbackX: 7 }),
  swordRise:  n(60, 8, 4, 19,  { damageType: 'slash', hitstun: 24, rangeX: 70, rangeY: 130, launcher: true, launchVy: -15, nj: { kind: 'normal', boxY: -50 } }),
  swordCrouch:n(52, 8, 3, 16,  { damageType: 'slash', hitstun: 20, rangeX: 90, rangeY: 34, hitLevel: 'low', nj: { kind: 'normal', boxY: 58 } }),
  swordLow:   n(58, 9, 3, 18,  { damageType: 'slash', hitstun: 22, rangeX: 84, rangeY: 40, hitLevel: 'low', nj: { kind: 'normal', boxY: 52 } }),
  axe:        n(62, 15, 3, 17, { hitstun: 26, rangeX: 64, hitLevel: 'overhead' }),
  sWake:      n(64, 5, 3, 23,  { hitstun: 24, rangeX: 72, invuln: 6 }),
  sRock:      n(72, 12, 3, 20, { damageType: 'slash', hitstun: 28, rangeX: 96, knockbackX: 8 }),                                              // Rock Slash →+Heavy (R15 head)
  air:        n(60, 6, 4, 13,  { damageType: 'slash', hitstun: 20, rangeX: 82, rangeY: 90, nj: { kind: 'normal', boxY: 4 } }),
  airKick:    n(50, 5, 4, 13,  { hitstun: 18, rangeX: 72, rangeY: 80, nj: { kind: 'normal', boxY: 10 } }),
  slide:      n(54, 7, 12, 16, { hitstun: 22, rangeX: 50, rangeY: 34, hitLevel: 'low', nj: { kind: 'travel', dist: 0.20, frames: 12, boxY: 60, trail: 'dust' } }),   // Dirt slide ↘+Heavy (motocross)
  // GROUND POUND air ↓+Heavy: R11 drop → R8 landing-dust ring as a ground SHOCKWAVE 80 blunt, hits OTG
  dive:       n(0, 6, 30, 4,   { groundHit: true, nj: { kind: 'dive', noHit: true, vx: 0, vy: 17, landRec: 16, landPose: 'land', shock: { dmg: 80, radius: 120 } } }),
  // ── SPECIALS ──
  // 1. EARTH BURROW ↓↓+Special (hold Special to stay under; release → ERUPT, R6 rising kick 90 blunt, launches)
  sErupt:     sp(0, 4, 4, 22, 0, { invuln: 6, nj: { kind: 'hits', noHit: true, hits: [{ at: 4, dx: -40, w: 110, h: 150, dy: -150, dmg: 90, launch: -19, kb: 3, hitstun: 36, cue: 'eruption' }], selfVy: -9, riseAt: 4 } }),
  // 3. EARTH KUNAI ↓↙←+Light: thrown INTO the ground → a trap (max 2) that erupts when stepped on, 45 blunt, trips. 6 s.
  sTrap:      sp(0, 9, 1, 15, 15, { nj: { kind: 'trap', noHit: true, dist: 230 } }),
  // 4. NINJA BEAM ↓↘→+Light: same Morpher beam, ground only, 50
  sBeam:      sp(50, 12, 1, 16, 15, { damageType: 'projectile', nj: { kind: 'proj', noHit: true, proj: { at: 12, speed: 24, dmg: 50, sprite: 'proj_beam', frames: 3, sw: 47, sh: 16, w: 60, h: 20, radius: 22, oy: 62, name: 'nsBeam', cue: 'beam' } } }),
  sKunai:     sp(30, 9, 1, 14, 10, { damageType: 'projectile', nj: { kind: 'proj', noHit: true, proj: { at: 9, speed: 18, dmg: 30, sprite: 'proj_spark', sw: 34, sh: 18, w: 34, h: 16, radius: 16, oy: 60, scale: 2, name: 'nsKunai', cue: 'kunai' } } }),
  sSuper:     n(0, 1, 1, 96, { category: 'ultimate', isUltimate: true, bars: 1, invuln: 98, damageType: 'blunt', nj: { kind: 'super', noHit: true } }),
  sUlt:       n(0, 1, 1, 76, { category: 'ultimate', isUltimate: true, bars: 2, invuln: 78, damageType: 'blunt', nj: { kind: 'super', noHit: true } }),
}

// ── COMMANDS (data the generic ninjaCommand.js layer reads) ───────────────────────────────────────────────────────
// d = {fwd, back, up, down} at the button's press edge (facing-relative). Returns a move key or null.
const shaneNormal = (b, d, ground, ctx) => {
  if (!ground) return b === 'heavy' && d.down ? 'dive' : b === 'heavy' ? 'airKick' : 'air'
  if (b === 'upAttack') return 'sUpper'
  if (b === 'light') return d.down ? 'sLow' : d.up ? 'swordRise' : ctx.running ? 'swordMove' : d.fwd ? 'sword' : 'light'
  if (d.down && d.fwd) return 'slide'
  if (d.down && d.back) return 'swordLow'
  if (d.down) return 'swordCrouch'
  if (d.up) return 'up'
  if (d.back) return 'axe'
  if (d.fwd) return ctx.fwdHeavy
  if (ctx.from === 'kString1') return 'kString2'   // Heavy, Heavy, Heavy = the kick string
  if (ctx.from === 'kString2') return 'kString3'
  return 'kString1'
}
const GATLING = { light: ['kString1', 'sLow', 'sword', 'up', 'swordCrouch', 'sUpper'], kString1: ['kString2', 'up', 'sUpper', 'sword'], kString2: ['kString3', 'up', 'sUpper', 'sword'],
  sLow: ['kString1', 'sword', 'up', 'sUpper', 'swordLow'], swordCrouch: ['up', 'sUpper', 'sword'], sword: ['up', 'sUpper'], kString3: [], sUpper: [] }   // ↑+Heavy arrives as Up-Attack on some layouts → both launchers cancel alike
export const SHANE_COMMANDS = {
  normal: (b, d, g, ctx) => shaneNormal(b, d, g, { ...ctx, fwdHeavy: 'sGale' }), gatling: GATLING,
  // motion specials (checked before normals; first match wins). button 'light' motions beat ↓+Light.
  specials: [
    { motion: '236236', button: 'special', key: 'sSuper', win: 40 },
    { motion: '236', button: 'special', key: 'sTornado', air: 'sTornado' },
    { motion: '236', button: 'light', key: 'sBeam', air: 'sBeamAir' },
    { motion: '214', button: 'light', key: 'sKunai', air: 'sKunaiAir' },
    { button: 'special', key: 'sBeam', air: 'sBeamAir' },   // neutral Special = Ninja Beam
  ],
  specialsSet: ['sGale'],   // command normals that are really specials (Ninja Power cost, cancel rules)
}
export const DUSTIN_COMMANDS = {
  normal: (b, d, g, ctx) => shaneNormal(b, d, g, { ...ctx, fwdHeavy: 'sRock' }), gatling: { ...GATLING, light: [...GATLING.light, 'sRock'], kString1: [...GATLING.kString1, 'sRock'], kString2: [...GATLING.kString2, 'sRock'], kString3: [], sRock: [] },   // Rock Slash ends his strings
  specials: [
    { motion: '236236', button: 'special', key: 'sSuper', win: 40 },
    { downDown: true, button: 'special', key: 'nsBurrow', ground: true },
    { motion: '236', button: 'light', key: 'sBeam', ground: true },
    { motion: '214', button: 'light', key: 'sTrap', ground: true },
    { button: 'special', key: 'sBeam', ground: true },
  ],
  specialsSet: [],
}

// ── PROFILES ─────────────────────────────────────────────────────────────────────────────────────────────────────
import { shaneSuper, shaneUlt, dustinSuper, dustinUlt } from './nsSupers.js'
const SPD_RED_BLINK = { tapWindow: 12, run: { speed: 8.4, walk: 5.6 } }   // S.P.D. Red's double-tap window + run (docs/msv1/SPD_RED_REFERENCE.md)
export const SHANE_PROFILE = registerNinjaProfile('ns_red', {
  team: 'Wind Ninja Academy', color: '#e0201c', smoke: '#d4141a', blink: SPD_RED_BLINK, weight: 0.85, airMul: 1.10,
  streak: { air: { perAirtime: 2, eightWay: true } },
  float: { frames: 72, fall: 2.2 },   // WIND FLOAT: hold jump while falling, 1.2 s per airtime, capped fall (never a climb)
  mirror: { mode: 'echo', echoDelay: 8, counter: { kind: 'tornado', hits: 3, dmg: 18, every: 6, launch: -15 } },   // WIND MIRAGE
  barrier: { kind: 'reflect', reflectMul: 1.2 },                                                               // WIND WARD
  quotes: { intro: 'Ninja Storm, Ranger Form! Ha!', win: 'Air ninjas rule.', vs: { ns_yellow: { line: 'Keep up, Dustin.' }, ns_red: { line: 'Only one Air Ninja owns this sky.', reply: 70 }, spd_red: { line: "Space Patrol, huh? Let's see who's faster." } } },
  moves: SHANE_MOVES, commands: SHANE_COMMANDS, supers: { sSuper: shaneSuper, sUlt: shaneUlt },
})
export const DUSTIN_PROFILE = registerNinjaProfile('ns_yellow', {
  team: 'Wind Ninja Academy', color: '#f2c40c', smoke: '#e8b400', blink: SPD_RED_BLINK, weight: 1.0, airMul: 0.90,
  streak: { air: null, underground: true },
  burrow: { cost: 20, frames: 90, sink: 6, speed: 10.5 },                     // EARTH BURROW: up to 1.5 s at run speed
  traps: { max: 2, life: 360, dmg: 45, radius: 26 },                           // EARTH KUNAI traps, 6 s
  rev: { every: 48, max: 3 },                                                  // REV: 0.8 s of running per pip, up to 3
  mirror: { mode: 'decoy', counter: { kind: 'eruption', dmg: 80, wall: true } },   // EARTH DOUBLE
  barrier: { kind: 'armor', absorb: 2, armorFrames: 60, counter: { dmg: 70, radius: 130 } },   // ROCK HOLD
  quotes: { intro: 'Ninja Storm, Ranger Form! Ha!', win: 'Earth power, dude!', vs: { ns_red: { line: 'Dude, I was born ready!', reply: 70 }, ns_yellow: { line: 'Whoa... dude. Nice helmet.', reply: 70 }, spd_red: { line: 'Space cop! Totally rad. Still gonna win though.', reply: 70 } } },
  moves: DUSTIN_MOVES, commands: DUSTIN_COMMANDS, supers: { sSuper: dustinSuper, sUlt: dustinUlt },
})

// ── ROSTER ENTRIES ───────────────────────────────────────────────────────────────────────────────────────────────
const SCALE = 2.8 / 1.18   // the engine draws ×1.18 → 2.8× = the 47 px idle body ≈ 132 px (S.P.D. Red's on-screen height)
const grab = { damage: 35, startup: 7, active: 3, recovery: 20, hitstun: 20, throwForceX: 8, throwForceY: -4, damageType: 'grab' }
function roster(key, o, moves) {
  const anims = buildAnims(key, moves)
  return {
    rosterKey: key, universe: 'power_rangers', subUniverse: 'Ninja Storm', portrait: `./assets/${key}/portrait_large.png`, hudIcon: `./assets/${key}/portrait_small.png`,
    hasSprites: true, spriteScale: SCALE, spriteSheet: anims.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
    traits: { hasEnergy: true, energyType: 'ninja', energyName: 'Super', mobility: 'high', scaling: 'combo', animeMovement: false },
    movement: { crouchIdle: true }, introSequence: ['intro'],
    basic_attacks: { light: moves.light, heavy: moves.kString1, crouchLight: moves.sLow, upAttack: moves.up, airAttack: moves.air, downAir: moves.dive, grab },
    specials: {}, animationData: anims, ...o,
  }
}
export const ns_red = roster('ns_red', {
  name: 'Shane', displayName: 'Shane Clarke — Red Wind Ranger', hudName: 'Red Wind', color: '#e0201c',
  difficulty: 5, archetype: 'Air Ninja / Aerial Rushdown', tagline: 'Faster than the wind.',
  bio: 'Shane Clarke, Red Wind Ranger and leader of the Wind Ninja Academy\'s three. A skateboarder who never wanted to be a ninja, he masters the air: wind techniques, the Ninja Streak, and the Hawk Blaster he would later wield.',
  primary: 'rushdown', secondary: ['aerial'], archetypes: ['rushdown', 'aerial'],
  stats: { maxHealth: 1200, maxEnergy: 100, attack: 82, defense: 74, speed: 88, jumpPower: 31, maxJumps: 3, weight: 0.85, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  ultimate: { name: 'Hawk Mirage', cost: 100 },
}, SHANE_MOVES)
export const ns_yellow = roster('ns_yellow', {
  name: 'Dustin', displayName: 'Dustin Brooks — Yellow Wind Ranger', hudName: 'Yellow Wind', color: '#f2c40c',
  difficulty: 5, archetype: 'Earth Ninja / Trap & Burrow', tagline: 'Rock solid.',
  bio: 'Dustin Brooks, Yellow Wind Ranger of the Wind Ninja Academy\'s Earth students. A motocross rider with a big heart, kind and a little gullible, who fights from the ground up: burrows, tremors and the Lion Hammer\'s earth power.',
  primary: 'setplay', secondary: ['grappler'], archetypes: ['setplay', 'trap'],
  stats: { maxHealth: 1296, maxEnergy: 100, attack: 84, defense: 80, speed: 88, jumpPower: 31, maxJumps: 2, weight: 1.0, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  ultimate: { name: 'Fault Line', cost: 100 },
}, DUSTIN_MOVES)
export const NS_MOVE_STRIP = MOVE_STRIP
SHANE_PROFILE.stats = ns_red.stats; DUSTIN_PROFILE.stats = ns_yellow.stats   // ninjaRoundReset restores these (S.P.D. Red's tier)
