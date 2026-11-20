// nsCgptData.js — NINJA STORM CGPT (ninja_storm_cgpt): ONE playable Ninja Storm Ranger. The supplied Red and Yellow sheets are
// two selectable BASE APPEARANCES of the same character (skins 'default' = Red, 'yellow' = Yellow) + 20 palette skins
// (nsCgptSkins.js). Appearance never touches gameplay: one move table, one frame-data set, one hurtbox, one profile.
//
// Kit = the strongest of both previous designs in one: fast ninja movement (S.P.D. Red's speed tier, double jump, the
// double-tap Ninja Step with 3 charges), wind (Gale Crescent, Gale Rush), earth (Faultline Strike + fault markers, Earth
// Eruption), sword strings, blaster / kunai, the autonomous shadow clone (Echo / Guard, swap, recall) and the ultimate
// TWIN TEMPEST: FAULTLINE CATACLYSM. Systems: nsCgpt.js. Art: the MSV1 frame map (msv1Sprites.js, one map for both sheets),
// every strip mapped in docs/ns_cgpt/SPRITE_AUDIT.md. Frame data is frameExact (combat.startMove), S.P.D. Red conventions.
import { MSV1_STRIPS, MSV1_CELL } from './msv1Sprites.js'
import { registerNinjaProfile } from './ninja.js'
import { CGPT_EXT, cgptUlt, CGPT_ID } from './nsCgpt.js'

export const CGPT_DIR = tag => `./assets/ninja_storm_cgpt/skins/${tag}`
export const CGPT_DEFAULT_DIR = CGPT_DIR('red')

// ── ANIMS (dir = the appearance's folder; every appearance has the identical strip set) ─────────────────────────────
const A = (dir, strip, speed = 6, extra = {}) => ({ sheet: `${dir}/${strip}.png`, frames: MSV1_STRIPS[strip], width: MSV1_CELL.width, height: MSV1_CELL.height,
  speed, anchorY: 0, originX: MSV1_CELL.originX, originY: MSV1_CELL.originY, loop: false, lockLastFrame: true, ...extra })
function TL(strip, md, impact = 0.4) {   // wind-up frames over the startup, the impact frame on the first active frame, the rest over the recovery
  const n = MSV1_STRIPS[strip]; if (!md || n <= 1) return [[0, 0]]
  const st = md.startup ?? 5, ac = md.active ?? 3, rc = md.recovery ?? 10, k = Math.max(1, Math.min(n - 1, Math.round(n * impact)))
  const out = []
  for (let i = 0; i < k; i++) out.push([Math.floor(st * i / k), i])
  const rest = n - k
  for (let i = 0; i < rest; i++) out.push([st + Math.floor((ac + rc) * i / rest), k + i])
  return out.filter((e, i, arr) => i === 0 || e[0] > arr[i - 1][0])
}
// move key → strip. Together with the states / poses below, EVERY one of the 58 strips is used (docs/ns_cgpt/SPRITE_AUDIT.md).
export const CGPT_MOVE_STRIP = {
  light: 'jab', jab2: 'punchAlt', jab3: 'string', sword1: 'sword', sword2: 'swordMove', sword3: 'galeCrescent2', swordRise: 'swordRise', up: 'risingKick',
  sLow: 'low', swordCrouch: 'swordCrouch', swordLow: 'swordLow', axe: 'axe', slide: 'skid', sWake: 'crouchStrike',
  air: 'swordAir', airKick: 'airAttack', dive: 'diveKick', skyBlade: 'swordAir',
  sGale: 'galeCrescent', sGaleRush: 'tornado', sFault: 'crouchStrike', sErupt: 'swordDome', sBlaster: 'stance', sBlasterAir: 'throwAir', sKunai: 'throw', sKunaiAir: 'throwAir',
  nsStreak: 'streak', nsTremor: 'duck', nsStreakStrike: 'flipKick', nsStreakRec: 'getUp', nsVanish: 'smoke', nsVanishGone: 'seated', nsVanishOut: 'smokeFade',
  nsMirror: 'stance', nsClone: 'guard', nsBarrier: 'dome', nsDome: 'dome', nsBarrierEnd: 'guard', nsBurrow: 'duck', cgSwap: 'smokeFade',
  grab: 'punchAlt', throw: 'uppercut', sSuper: 'sword',
}
export function buildCgptAnims(dir, moves) {
  const out = {
    idle: A(dir, 'idle', 9, { loop: true }), walk: A(dir, 'run', 6, { loop: true }), walk_back: A(dir, 'run', 7, { loop: true }), run: A(dir, 'run', 4, { loop: true }),
    dash: A(dir, 'streak', 3), jump: A(dir, 'jump', 5), fall: A(dir, 'airRecover', 8), crouch: A(dir, 'crouch', 4), guard: A(dir, 'guard', 6, { loop: true }),
    guard_hit: A(dir, 'guard', 6), hurt: A(dir, 'hurt', 4), hurt_heavy: A(dir, 'tumble', 5), hurt_air: A(dir, 'airTumble', 4), knockdown: A(dir, 'knockdown', 5),
    getup: A(dir, 'getUpRoll', 4), taunt: A(dir, 'stance', 7), intro: A(dir, 'runStop', 8), win: A(dir, 'victory', 10), lose: A(dir, 'lying', 8),
    airSpin: A(dir, 'airSpin', 4, { loop: true }), streakTail: A(dir, 'streakTail', 4), runStop: A(dir, 'runStop', 6),
    landRecover: A(dir, 'landRecover', 4), land: A(dir, 'land', 4), dropDive: A(dir, 'dive', 4), superTornado: A(dir, 'tornado', 3, { loop: true }),
    superFinish: A(dir, 'galeCrescent2', 4), superSlam: A(dir, 'land', 4), superDive: A(dir, 'diveKick', 4), duck: A(dir, 'duck', 4), domeFx: A(dir, 'dome', 3),
    smoke: A(dir, 'smoke', 3), smokeFade: A(dir, 'smokeFade', 3), hitSpark: A(dir, 'hitSpark', 4), fxSpark: A(dir, 'fxSpark', 4), fxBurst: A(dir, 'fxBurst', 4),
    beam: A(dir, 'beam', 3, { loop: true }), beamDiag: A(dir, 'beamDiag', 3, { loop: true }), kickHeavy: A(dir, 'kickHeavy', 5), stringEnd: A(dir, 'stringEnd', 4),
  }
  for (const [k, md] of Object.entries(moves)) {
    const strip = CGPT_MOVE_STRIP[k]; if (!strip) continue
    const loop = /^(sGaleRush|nsDome|nsBurrow|nsStreak|nsTremor|nsVanishGone)$/.test(k)
    out[k] = A(dir, strip, loop ? 3 : 5, loop ? { loop: true } : { frameTimeline: TL(strip, md) })
  }
  for (const k of ['nsStreakStrike', 'nsVanishGone', 'nsDome', 'grab', 'throw']) if (!out[k]) {
    const strip = CGPT_MOVE_STRIP[k], loop = /^(nsDome|nsVanishGone)$/.test(k)
    out[k] = A(dir, strip, loop ? 3 : 4, loop ? { loop: true } : {})
  }
  out.dive = out.dive || A(dir, 'diveKick', 4)
  out.stringEnd = A(dir, 'stringEnd', 4)
  return out
}

// ── FRAME DATA (S.P.D. Red's conventions; roster parity ×1.6 applies in play like the MSV1 Rangers) ───────────────────
const n = (damage, startup, active, recovery, extra = {}) => ({ damage, startup, active, recovery,
  hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: 0, rangeX: 64, rangeY: 50, frameExact: true, damageType: 'blunt', nj: { kind: 'normal' }, ...extra })
const sp = (damage, startup, active, recovery, np, extra = {}) => n(damage, startup, active, recovery, { category: 'special', isSpecial: true, np, ...extra })
const fw = (startup, active, recovery, kind, extra = {}) => n(0, startup, active, recovery, { nj: { kind, noHit: true }, ...extra })
const PROJ = (o) => ({ kind: 'proj', noHit: true, proj: { frames: 1, scale: 2.4, ...o } })

export const CGPT_MOVES = {
  // framework poses / states (no hitbox of their own)
  nsStreak: fw(0, 1, 11, 'streak'), nsTremor: fw(0, 1, 11, 'streak'), nsStreakRec: fw(0, 1, 13, 'streakRec'),
  nsVanish: fw(0, 1, 19, 'vanish'), nsVanishOut: fw(0, 1, 7, 'vanishOut'), nsClone: fw(0, 1, 13, 'clone'), cgSwap: fw(0, 1, 13, 'cgSwap'),
  // ── RAPID PUNCHES (Light, Light, Light) → SWORD LAUNCHER (↑+Light / Up-Attack)
  light:      n(36, 5, 2, 8,   { hitstun: 17, rangeX: 60 }),                                                                   // Jab (R4)
  jab2:       n(30, 5, 2, 9,   { hitstun: 18, rangeX: 64 }),                                                                   // Cross punch (R6)
  jab3:       n(0, 4, 12, 12,  { nj: { kind: 'hits', noHit: true, hits: [{ at: 5, dx: -6, w: 76, dmg: 14, hitstun: 22, kb: 1 }, { at: 9, dx: -6, w: 76, dmg: 14, hitstun: 22, kb: 1 }, { at: 13, dx: -6, w: 80, dmg: 18, hitstun: 26, kb: 2 }] } }),   // Storm flurry (R4 string), 3 hits
  swordRise:  n(56, 7, 4, 18,  { damageType: 'slash', hitstun: 26, rangeX: 72, rangeY: 130, launcher: true, launchVy: -18, nj: { kind: 'normal', boxY: -50 } }),   // Rising sword launcher (R16)
  // ── SWORD STRING (Heavy, Heavy, Heavy)
  sword1:     n(50, 8, 3, 15,  { damageType: 'slash', hitstun: 22, rangeX: 90 }),                                             // Ninja Sword slash (R14)
  sword2:     n(46, 8, 3, 15,  { damageType: 'slash', hitstun: 24, rangeX: 96, knockbackX: 4 }),                               // Stepping slash (R15)
  sword3:     n(68, 10, 3, 19, { damageType: 'slash', hitstun: 30, rangeX: 98, knockbackX: 8 }),                               // Crescent finisher (R16 arc)
  // ── command normals
  up:         n(66, 8, 4, 18,  { hitstun: 28, rangeX: 64, rangeY: 130, launcher: true, launchVy: -19, nj: { kind: 'normal', boxY: -40 } }),   // Rising flip kick ↑+Heavy (R6), anti-air
  sLow:       n(42, 7, 3, 14,  { hitstun: 18, rangeX: 86, rangeY: 30, hitLevel: 'low', nj: { kind: 'normal', boxY: 62 } }),                     // Low sweep ↓+Light (R12)
  swordCrouch:n(48, 8, 3, 15,  { damageType: 'slash', hitstun: 20, rangeX: 90, rangeY: 34, hitLevel: 'low', nj: { kind: 'normal', boxY: 58 } }),   // Crouch slash ↓+Heavy (R17)
  swordLow:   n(54, 9, 3, 17,  { damageType: 'slash', hitstun: 22, rangeX: 84, rangeY: 40, hitLevel: 'low', nj: { kind: 'normal', boxY: 52 } }),   // Low swipe ↙+Heavy (R16)
  axe:        n(58, 14, 3, 16, { hitstun: 24, rangeX: 64, hitLevel: 'overhead' }),                                            // Axe kick overhead ←+Heavy (R7)
  slide:      n(50, 6, 14, 14, { hitstun: 22, rangeX: 50, rangeY: 34, hitLevel: 'low', nj: { kind: 'travel', dist: 0.22, frames: 14, boxY: 60, underProjectiles: 20, trail: 'dust' } }),   // Skate slide ↘+Heavy (R11)
  sWake:      n(60, 5, 3, 22,  { hitstun: 24, rangeX: 72, invuln: 6 }),                                                        // Wake-up strike (R5)
  // ── AIR
  airKick:    n(46, 4, 4, 12,  { hitstun: 18, rangeX: 72, rangeY: 80, nj: { kind: 'normal', boxY: 10 } }),                    // Air kick (R10)
  air:        n(58, 5, 4, 12,  { damageType: 'slash', hitstun: 22, rangeX: 82, rangeY: 90, nj: { kind: 'normal', boxY: 4 } }), // Air sword (R18)
  dive:       n(70, 6, 30, 4,  { hitstun: 30, rangeX: 60, rangeY: 80, knockbackY: 10, nj: { kind: 'dive', vx: 9, vy: 15, boxY: 30, landRec: 12 } }),   // Hawk dive ↓+Heavy air (R9), spikes → ground bounce
  // SKY BLADE: Earth Eruption's follow-up (Light / Heavy / Up-Attack on contact): leap into the launched foe, air sword
  skyBlade:   n(0, 3, 14, 12,  { damageType: 'slash', nj: { kind: 'hits', noHit: true, selfVy: -17, riseAt: 2, hits: [{ at: 9, dx: -20, dy: -230, w: 110, h: 170, dmg: 62, type: 'slash', launch: -9, kb: 5, hitstun: 34, cue: 'slashHit' }] } }),
  // ── SPECIALS (Ninja Power)
  // WIND: Gale Crescent →+Heavy — the sword crescent flies 35% of the screen
  sGale:      sp(52, 10, 1, 18, 12, { damageType: 'slash', nj: PROJ({ at: 10, speed: 12, dmg: 52, type: 'slash', sprite: 'proj_crescent', sw: 26, sh: 43, life: 38, w: 30, h: 60, radius: 30, oy: 60, name: 'nsGale', cue: 'gale' }) }),
  // WIND: Gale Rush ↓↘→+Special — the wind dash: drills 38% of the screen (3 × 16), the last hit lifts both → aerial follow-up
  sGaleRush:  sp(0, 7, 15, 16, 18, { damageType: 'energy', nj: { kind: 'travel', noHit: true, dist: 0.38, frames: 15, airAngle: true, selfVy: -10, riseAt: 22, multi: { every: 5, n: 3, dmg: 16, type: 'energy', launch: -13, cue: 'tornadoHit' }, trail: 'wind' } }),
  // EARTH: Faultline Strike ↓↙←+Special — a low ground strike; the impact point cracks into a FAULT MARKER (max 2, 5 s)
  sFault:     sp(52, 10, 3, 18, 12, { hitLevel: 'low', hitstun: 24, rangeX: 96, rangeY: 40, nj: { kind: 'cgFault', boxY: 54, markDx: 90 } }),
  // EARTH: Earth Eruption ↓↓+Special — bursts under the foe (or from a fault marker near them: ×1.25, higher launch)
  sErupt:     sp(0, 16, 3, 22, 20, { nj: { kind: 'cgErupt', noHit: true, dmg: 80, launch: -19 } }),
  // BLASTER: Ninja Blaster neutral Special / ↓↘→+Light — full-screen shot (air: diagonal down); recovery → double-tap Ninja Step
  sBlaster:   sp(44, 12, 1, 18, 12, { damageType: 'projectile', nj: PROJ({ at: 12, speed: 24, dmg: 44, sprite: 'proj_beam', frames: 3, sw: 47, sh: 16, w: 60, h: 20, radius: 22, oy: 62, name: 'nsBeam', cue: 'beam' }) }),
  sBlasterAir:sp(44, 10, 1, 16, 12, { damageType: 'projectile', nj: PROJ({ at: 10, speed: 20, angle: 40, dmg: 44, sprite: 'proj_beamDiag', frames: 3, sw: 64, sh: 47, w: 40, h: 40, radius: 24, oy: 50, name: 'nsBeam', cue: 'beam' }) }),
  // Kunai ↓↙←+Light — 1 straight (ground), a 3-kunai fan (air)
  sKunai:     sp(28, 9, 1, 14, 10, { damageType: 'projectile', nj: PROJ({ at: 9, speed: 18, dmg: 28, sprite: 'proj_spark', sw: 34, sh: 18, w: 34, h: 16, radius: 16, oy: 60, scale: 2, name: 'nsKunai', cue: 'kunai' }) }),
  sKunaiAir:  sp(28, 8, 1, 14, 10, { damageType: 'projectile', nj: PROJ({ at: 8, speed: 17, count: 3, gap: 0, angles: [12, 28, 44], dmg: 28, sprite: 'proj_spark', sw: 34, sh: 18, w: 34, h: 16, radius: 16, oy: 56, scale: 2, name: 'nsKunai', cue: 'kunai' }) }),
  // ULTIMATE (full meter = 2 bars): TWIN TEMPEST — FAULTLINE CATACLYSM (schedule: nsCgpt.js CGPT_ULT, 418)
  sSuper:     n(0, 1, 1, 124, { category: 'ultimate', isUltimate: true, bars: 2, invuln: 126, damageType: 'slash', nj: { kind: 'super', noHit: true } }),
}

// ── COMMANDS (read by ninjaCommand.js) ───────────────────────────────────────────────────────────────────────────────
// d = {fwd, back, up, down} at the button's press edge (facing-relative)
function normal(b, d, ground, ctx) {
  if (!ground) return b === 'heavy' && d.down ? 'dive' : b === 'heavy' ? 'air' : 'airKick'
  if (b === 'upAttack') return 'swordRise'
  if (b === 'light') {
    if (d.down) return 'sLow'
    if (d.up) return 'swordRise'
    if (ctx.from === 'light') return 'jab2'
    if (ctx.from === 'jab2') return 'jab3'
    return 'light'
  }
  if (d.down && d.fwd) return 'slide'
  if (d.down && d.back) return 'swordLow'
  if (d.down) return 'swordCrouch'
  if (d.up) return 'up'
  if (d.back) return 'axe'
  if (d.fwd) return 'sGale'
  if (ctx.from === 'sword1') return 'sword2'
  if (ctx.from === 'sword2') return 'sword3'
  return 'sword1'
}
const GATLING = {
  light: ['jab2', 'sLow', 'sword1', 'swordRise', 'up', 'swordCrouch'], jab2: ['jab3', 'swordRise', 'up', 'sword1'], jab3: ['swordRise', 'up', 'sword1'],
  sword1: ['sword2', 'swordRise', 'up'], sword2: ['sword3', 'swordRise', 'up'], sword3: [],
  sLow: ['sword1', 'swordCrouch', 'swordRise', 'up'], swordCrouch: ['swordRise', 'up'], swordLow: [], axe: [], up: [], swordRise: [], slide: ['swordRise', 'up'],
}
export const CGPT_COMMANDS = {
  normal, gatling: GATLING,
  specials: [
    { motion: '236236', button: 'special', key: 'sSuper', win: 40 },
    { downDown: true, button: 'special', key: 'sErupt', ground: true },
    { motion: '236', button: 'special', key: 'sGaleRush', air: 'sGaleRush' },
    { motion: '214', button: 'special', key: 'sFault', ground: true },
    { motion: '236', button: 'light', key: 'sBlaster', air: 'sBlasterAir' },
    { motion: '214', button: 'light', key: 'sKunai', air: 'sKunaiAir' },
    { button: 'special', key: 'sBlaster', air: 'sBlasterAir' },
  ],
  specialsSet: ['sGale'],
}

// ── PROFILE ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const SPD_RED_BLINK = { tapWindow: 12, run: { speed: 8.4, walk: 5.6 } }   // S.P.D. Red's double-tap window + run (same as MSV1)
export const CGPT_PROFILE = registerNinjaProfile(CGPT_ID, {
  team: 'Wind Ninja Academy', color: '#e0201c', smoke: '#d4141a', blink: SPD_RED_BLINK, weight: 0.92, airMul: 1.0,
  // Ninja Step = the framework streak; NP cost 0 — the 3 Ninja Step CHARGES (nsCgpt.js) are the limit; 1 air step per airtime
  streak: { cost: 0, thirdCost: 0, air: { perAirtime: 1, eightWay: true } },
  mirror: false, barrier: false, clones: false,   // replaced by the one shadow-clone system (nsCgpt.js)
  quotes: { intro: 'Ninja Storm, Ranger Form! Ha!', win: 'Wind and earth — one storm.', vs: { ns_red: { line: 'Two colours, one storm. Try to keep up.' }, ns_yellow: { line: 'Earth AND wind, dude.' }, spd_red: { line: "Space Patrol? Let's see who's faster." } } },
  moves: CGPT_MOVES, commands: CGPT_COMMANDS, supers: { sSuper: cgptUlt },
})
CGPT_PROFILE.ext = CGPT_EXT

// ── ROSTER ENTRY ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SCALE = 2.8 / 1.18   // MSV1's scale: the 47 px idle body ≈ 132 px (S.P.D. Red's on-screen height)
const grab = { damage: 35, startup: 7, active: 3, recovery: 20, hitstun: 20, throwForceX: 8, throwForceY: -4, damageType: 'grab' }
const anims = buildCgptAnims(CGPT_DEFAULT_DIR, CGPT_MOVES)
export const ninja_storm_cgpt = {
  rosterKey: CGPT_ID, universe: 'power_rangers', subUniverse: 'Ninja Storm',
  name: 'Ninja Storm CGPT', displayName: 'Ninja Storm CGPT — Wind Ranger', hudName: 'NS CGPT', subtitle: 'Wind & Earth Ranger', color: '#e0201c',
  difficulty: 5, archetype: 'Storm Ninja / Clone Rushdown', tagline: 'Wind, earth and a shadow that strikes twice.',
  bio: 'One Wind Ninja Academy Ranger who fights with both elements: Gale wind techniques, earth eruptions and fault lines, the Ninja Sword, the Morpher blaster and a shadow clone that echoes or guards. Red and Yellow are two looks of the same Ranger.',
  primary: 'rushdown', secondary: ['setplay', 'aerial'], archetypes: ['rushdown', 'setplay'],
  portrait: './assets/ninja_storm_cgpt/portrait_large.png', hudIcon: './assets/ninja_storm_cgpt/portrait_small.png',
  hasSprites: true, spriteScale: SCALE, spriteSheet: anims.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
  traits: { hasEnergy: true, energyType: 'ninja', energyName: 'Super', mobility: 'high', scaling: 'combo', animeMovement: false },
  movement: { crouchIdle: true }, introSequence: ['intro'],
  stats: { maxHealth: 1240, maxEnergy: 100, attack: 83, defense: 76, speed: 88, jumpPower: 31, maxJumps: 2, weight: 0.92, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  basic_attacks: { light: CGPT_MOVES.light, heavy: CGPT_MOVES.sword1, crouchLight: CGPT_MOVES.sLow, upAttack: CGPT_MOVES.swordRise, airAttack: CGPT_MOVES.air, downAir: CGPT_MOVES.dive, grab },
  specials: {}, animationData: anims,
  ultimate: { name: 'Twin Tempest: Faultline Cataclysm', cost: 100 },
}
CGPT_PROFILE.stats = ninja_storm_cgpt.stats   // ninjaRoundReset restores these (S.P.D. Red's tier)
