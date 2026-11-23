// nsTrio.js — NS TRIO: "Ninja Storm Trio" (ns_trio), ONE character with three swappable forms, built the same way as the
// MS_V1 Ranger Version (windrangers, nsDuo.js):
//   ns_blue  = TORI HANSON   — Blue Wind Ranger (water)
//   ns_navy  = BLAKE BRADLEY — Navy Thunder Ranger (thunder)
//   ns_green = CAM WATANABE  — Green Samurai Ranger (samurai)
// The forms are ninja.js profiles (the framework the MS_V1 Rangers run on). The fighter's live rosterKey is the ACTIVE form
// id, so every form-specific path (ninja profile, Ranger profile, sprites, HUD portrait, sounds, quotes) runs as-is.
// SWITCH (owner): P S S J / P S S K = hold CHARGE, ↓ ↓ (Ben's double-tap window), then LIGHT = next form, HEAVY = previous
// (Tori → Blake → Cam → Tori). State on f._duo (in the replay / LAN snapshot via ninjaSnapshot). No Math.random.
import { nsRoster, nsN as n, nsSp as sp, nsNormal, NS_GATLING, SHANE_MOVES, DUSTIN_MOVES, NS_BLINK } from './nsData.js'
import { toriSuper, blakeSuper, camSuper, trioUlt, TORI_SUPER, BLAKE_SUPER, CAM_SUPER, TRIO_ULT } from './nsTrioSupers.js'   // phase 5: their own supers + the trio ultimate
import { registerDuo, registerNinjaProfile, getNinjaProfile, nsStartMove, endMove, endMirror, burst, cue, spendNP, nsStrike, fresh, use, ctrX, overlaps, hasMotion,
  NINJA_API } from './ninja.js'
import { registerDuoForms } from './nsDuo.js'

export const TRIO_ID = 'ns_trio'
export const TRIO_FORMS = ['ns_blue', 'ns_navy', 'ns_green']
const next = form => TRIO_FORMS[(TRIO_FORMS.indexOf(form) + 1) % 3]
const prev = form => TRIO_FORMS[(TRIO_FORMS.indexOf(form) + 2) % 3]
export const trioStartForm = skinId => skinId === 'start_navy' ? 'ns_navy' : skinId === 'start_green' ? 'ns_green' : 'ns_blue'

// ── tuning: the MS_V1 Ranger Version's numbers (nsDuo.js DUO), unchanged ─────────────────────────────────────────────
export const TRIO = {
  health: 1248,
  samurai: { frames: 360, dmg: 1.15, speed: 1.10 },   // SUPER SAMURAI MODE (Cam, ↓↓+Special)
  ben: { dbl: 16, arm: 18, cost: 15, lockout: 30 },
  swapFrames: 14, outEnd: 4, flipAt: 7, inStart: 10, invulnAt: 4, invulnFrames: 6,
  strike: { at: 10, dmg: 30, hitstun: 14, kb: 2, w: 84 },
  tag: { mul: 1.10, frames: 180 },
  cpu: { dwell: 150, near: 170, far: 0.42 },
}

// ── THE THREE KITS (phase 3: each Ranger's own canonical powers on the MS_V1 body / normals) ─────────────────────────
// The normals, framework poses and supers are the MS_V1 set (Tori + Blake from Shane's air-ninja body, Cam from Dustin's
// heavier one); the SPECIALS are their own. Every special is ninja.js data (proj / travel / hits), costs Ninja Power and
// goes through the shared damage choke-point. Strips: their own recoloured MS_V1 strips (STRIPS below).
const SUPER = (total, type, bars) => n(0, 1, 1, total, { category: 'ultimate', isUltimate: true, bars, invuln: total + 2, damageType: type, nj: { kind: 'super', noHit: true } })
const BASE = m => { const o = { ...m }; for (const k of ['sTornado', 'sGale', 'sRock', 'sBeam', 'sBeamAir', 'sKunai', 'sKunaiAir', 'sTrap', 'sErupt']) delete o[k]; return o }
const proj = (o) => ({ frames: 1, sw: 26, sh: 43, w: 30, h: 60, radius: 26, oy: 60, scale: 2.4, ...o })
// TORI — water. SONIC FIN (her Ninja Storm weapon) + water ninja waves.
const TORI_MOVES = {
  ...BASE(SHANE_MOVES),
  // SONIC FIN ↓↘→+Light / neutral Special: two water crescents off the fin, 34 slash each, 45% screen
  sFin:    sp(0, 10, 1, 17, 14, { damageType: 'slash', nj: { kind: 'proj', noHit: true, proj: proj({ at: 10, speed: 14, count: 2, gap: 6, dmg: 34, type: 'slash', sprite: 'proj_crescent', life: 40, name: 'nsFin', cue: 'gale' }) } }),
  sFinAir: sp(0, 9, 1, 15, 14, { damageType: 'slash', nj: { kind: 'proj', noHit: true, proj: proj({ at: 9, speed: 14, count: 2, gap: 0, angles: [10, 30], dmg: 34, type: 'slash', sprite: 'proj_crescent', life: 36, name: 'nsFin', cue: 'gale' }) } }),
  // TIDAL SURF ↓↘→+Special: she rides a wave 45% of the screen, 5 × 14 water hits, the last lifts; carries a locked foe
  sSurf:   sp(0, 9, 26, 18, 20, { damageType: 'energy', nj: { kind: 'travel', noHit: true, dist: 0.45, frames: 26, airAngle: true, multi: { every: 5, n: 5, dmg: 14, type: 'energy', launch: -13, cue: 'tornadoHit', onContact: true }, trail: 'water' } }),
  // WATER GEYSER ↓↙←+Light: a tell bubbles at the foe's spot (≤ 50% screen) on frame 6, the geyser erupts on 22: 82, launches
  sGeyser: sp(0, 22, 4, 20, 18, { damageType: 'energy', nj: { kind: 'hits', noHit: true, hits: [{ at: 6, atFoe: true, reach: 0.5, fxOnly: true, fx: 'bubbles', fxT: 18, w: 90, h: 40, dy: -40 },
            { at: 22, atFoe: true, w: 96, h: 230, dy: -230, dmg: 82, type: 'energy', launch: -20, kb: 1, hitstun: 38, fx: 'geyser', fxT: 26, cue: 'eruption' }] } }),
  // WAVE SLASH →+Heavy: a rolling water crescent, 58 slash, 35% screen
  sSuper: SUPER(TORI_SUPER.total, 'energy', 1), sUlt: SUPER(TORI_SUPER.total, 'energy', 2),   // TSUNAMI (phase 5)
  sWave:   sp(0, 10, 1, 18, 12, { damageType: 'slash', nj: { kind: 'proj', noHit: true, proj: proj({ at: 10, speed: 12, dmg: 58, type: 'slash', sprite: 'proj_crescent', life: 38, name: 'nsWave', cue: 'gale' }) } }),
}
// BLAKE — thunder. NAVY ANTLER (his twin-blade weapon), the THUNDER STAFF and Thunder Ninja speed.
const BLAKE_MOVES = {
  ...BASE(SHANE_MOVES),
  // NAVY ANTLER ↓↘→+Light: both antler blades thrown in a scissor (level + rising), 32 slash each
  sAntler:    sp(0, 9, 1, 16, 14, { damageType: 'slash', nj: { kind: 'proj', noHit: true, proj: proj({ at: 9, speed: 17, count: 2, gap: 0, angles: [0, -14], dmg: 32, type: 'slash', sprite: 'proj_crescent', life: 34, name: 'nsAntler', cue: 'kunai' }) } }),
  sAntlerAir: sp(0, 8, 1, 14, 14, { damageType: 'slash', nj: { kind: 'proj', noHit: true, proj: proj({ at: 8, speed: 17, count: 2, gap: 0, angles: [16, 36], dmg: 32, type: 'slash', sprite: 'proj_crescent', life: 32, name: 'nsAntler', cue: 'kunai' }) } }),
  // THUNDER STRIKE ↓↘→+Special: the staff calls lightning — a crackle marks the foe's spot (≤ 55%) on frame 6, the bolt
  // lands on 20: 90 energy, knockdown. Air OK.
  sThunder:   sp(0, 20, 3, 20, 20, { damageType: 'energy', nj: { kind: 'hits', noHit: true, hits: [{ at: 6, atFoe: true, reach: 0.55, fxOnly: true, fx: 'crackle', fxT: 14, w: 80, h: 30, dy: -30 },
               { at: 20, atFoe: true, w: 80, h: 520, dy: -520, dmg: 90, type: 'energy', launch: -10, kb: 3, hitstun: 40, knockdown: true, fx: 'bolt', fxT: 22, cue: 'beam' }] } }),
  // THUNDER DASH ↓↙←+Light: a lightning rush, 40% of the screen in 9 frames, 3 × 22 energy, the last knocks away
  sDash:      sp(0, 5, 9, 16, 16, { damageType: 'energy', nj: { kind: 'travel', noHit: true, dist: 0.40, frames: 9, airAngle: true, multi: { every: 3, n: 3, dmg: 22, type: 'energy', launch: -8, cue: 'streakHit', onContact: true }, trail: 'spark' } }),
  // THUNDER STAFF neutral Special: a fast thunder bolt shot, 46 energy, full screen
  sStaff:     sp(0, 11, 1, 16, 14, { damageType: 'energy', nj: { kind: 'proj', noHit: true, proj: { at: 11, speed: 30, dmg: 46, type: 'energy', sprite: 'proj_beam', frames: 3, sw: 47, sh: 16, w: 60, h: 20, radius: 22, oy: 62, name: 'nsStaff', cue: 'beam' } } }),
  sStaffAir:  sp(0, 10, 1, 14, 14, { damageType: 'energy', nj: { kind: 'proj', noHit: true, proj: { at: 10, speed: 26, angle: 40, dmg: 46, type: 'energy', sprite: 'proj_beamDiag', frames: 3, sw: 64, sh: 47, w: 40, h: 40, radius: 24, oy: 50, name: 'nsStaff', cue: 'beam' } } }),
  // ANTLER CROSS →+Heavy: both blades, an X-slash, 2 × 36
  sSuper: SUPER(BLAKE_SUPER.total, 'energy', 1), sUlt: SUPER(BLAKE_SUPER.total, 'energy', 2),   // THUNDER STORM (phase 5)
  sCross:     sp(0, 9, 8, 16, 10, { damageType: 'slash', nj: { kind: 'hits', noHit: true, hits: [{ at: 9, dx: -10, w: 96, dmg: 36, type: 'slash', hitstun: 22, kb: 1, cue: 'streakHit' }, { at: 15, dx: -10, w: 104, dmg: 36, type: 'slash', hitstun: 28, kb: 6, cue: 'impact' }] } }),
}
// CAM — samurai. SAMURAI SABER, the SAMURAI STAR spin, SUPER SAMURAI MODE and CYBER CAM (his digital double).
const CAM_MOVES = {
  ...BASE(DUSTIN_MOVES),
  // SAMURAI SABER ↓↘→+Light: an iaido draw-dash, 30% of the screen in 8 frames, cutting 3 × 30 slash as he passes
  sIaido:  sp(0, 8, 8, 20, 16, { damageType: 'slash', nj: { kind: 'travel', noHit: true, dist: 0.30, frames: 8, multi: { every: 2, n: 3, dmg: 30, type: 'slash', launch: -6, cue: 'impact', onContact: true }, carry: false, trail: 'leaf' } }),
  // SAMURAI STAR ↓↘→+Special / neutral Special: the saber spun around him, 4 × 22 slash, the last launches
  sStar:   sp(0, 7, 18, 16, 18, { damageType: 'slash', nj: { kind: 'hits', noHit: true, hits: [7, 12, 17, 22].map((at, i) => ({ at, centered: true, w: 170, h: 120, dy: -120, dmg: 22, type: 'slash', hitstun: 26, kb: i === 3 ? 5 : 0, launch: i === 3 ? -15 : -3, fx: 'star', fxT: 10, cue: 'streakHit' })) } }),
  // CYBER LASERS ↓↙←+Light: Cam's tech — three green laser bolts in a fan, 26 each
  sLaser:  sp(0, 9, 1, 15, 12, { damageType: 'projectile', nj: { kind: 'proj', noHit: true, proj: { at: 9, speed: 20, count: 3, gap: 0, angles: [-10, 0, 10], dmg: 26, sprite: 'proj_spark', sw: 34, sh: 18, w: 34, h: 16, radius: 16, oy: 60, scale: 2, name: 'nsLaser', cue: 'kunai' } } }),
  // SUPER SAMURAI MODE ↓↓+Special (ground, 30 NP): 6 s of +15% special damage and +10% speed; ends on a switch (nsTrio)
  sSamurai: sp(0, 12, 1, 14, 30, { nj: { kind: 'samurai', noHit: true }, invuln: 12 }),
  // SABER CUT →+Heavy: two saber cuts, 34 + 44
  sSuper: SUPER(CAM_SUPER.total, 'slash', 1), sUlt: SUPER(CAM_SUPER.total, 'slash', 2),   // SUPER SAMURAI (phase 5)
  sSaber:  sp(0, 10, 8, 17, 10, { damageType: 'slash', nj: { kind: 'hits', noHit: true, hits: [{ at: 10, dx: -6, w: 100, dmg: 34, type: 'slash', hitstun: 22, kb: 1, cue: 'streakHit' }, { at: 16, dx: -6, w: 110, dmg: 44, type: 'slash', hitstun: 28, kb: 7, cue: 'impact' }] } }),
}
const STRIPS = {
  ns_blue:  { sFin: 'galeCrescent', sFinAir: 'throwAir', sSurf: 'skid', sGeyser: 'stance', sWave: 'galeCrescent2' },
  ns_navy:  { sAntler: 'throw', sAntlerAir: 'throwAir', sThunder: 'swordRise', sDash: 'streak', sStaff: 'stance', sStaffAir: 'throwAir', sCross: 'sword' },
  ns_green: { dive: 'throwAir', sIaido: 'swordMove', sStar: 'swordDome', sLaser: 'throw', sSamurai: 'victory', sSaber: 'sword' },
}
const gat = extra => { const g = {}; for (const [k, v] of Object.entries(NS_GATLING)) g[k] = [...v, ...(v.length ? [extra] : [])]; g[extra] = []; return g }
const COMMANDS = {
  ns_blue: { normal: (b, d, g, ctx) => nsNormal(b, d, g, { ...ctx, fwdHeavy: 'sWave' }), gatling: gat('sWave'),
    specials: [{ motion: '236236', button: 'special', key: 'sSuper', win: 40 }, { motion: '236', button: 'special', key: 'sSurf', air: 'sSurf' },
      { motion: '236', button: 'light', key: 'sFin', air: 'sFinAir' }, { motion: '214', button: 'light', key: 'sGeyser', ground: true }, { button: 'special', key: 'sFin', air: 'sFinAir' }],
    specialsSet: ['sWave'] },
  ns_navy: { normal: (b, d, g, ctx) => nsNormal(b, d, g, { ...ctx, fwdHeavy: 'sCross' }), gatling: gat('sCross'),
    specials: [{ motion: '236236', button: 'special', key: 'sSuper', win: 40 }, { motion: '236', button: 'special', key: 'sThunder', air: 'sThunder' },
      { motion: '236', button: 'light', key: 'sAntler', air: 'sAntlerAir' }, { motion: '214', button: 'light', key: 'sDash', air: 'sDash' }, { button: 'special', key: 'sStaff', air: 'sStaffAir' }],
    specialsSet: ['sCross'] },
  ns_green: { normal: (b, d, g, ctx) => nsNormal(b, d, g, { ...ctx, fwdHeavy: 'sSaber' }), gatling: gat('sSaber'),
    specials: [{ motion: '236236', button: 'special', key: 'sSuper', win: 40 }, { downDown: true, button: 'special', key: 'sSamurai', ground: true },
      { motion: '236', button: 'special', key: 'sStar', ground: true }, { motion: '236', button: 'light', key: 'sIaido', ground: true }, { motion: '214', button: 'light', key: 'sLaser', ground: true },
      { button: 'special', key: 'sStar', ground: true }],
    specialsSet: ['sSaber'] },
}
const QUOTE_VS = { ns_red: { line: 'Shane! Try to keep up.' }, ns_yellow: { line: 'Dustin, dude, focus.' } }
const PROFILE = {
  ns_blue: { team: 'Wind Ninja Academy', color: '#2a78f0', smoke: '#1e64d2', blink: NS_BLINK, weight: 0.85, airMul: 1.10,
    streak: { air: { perAirtime: 2, eightWay: true } }, float: { frames: 90, fall: 1.8 },   // WATER GLIDE: a longer, softer float than Shane's
    mirror: { mode: 'echo', echoDelay: 8, counter: { kind: 'tornado', hits: 3, dmg: 18, every: 6, launch: -15 } }, barrier: { kind: 'reflect', reflectMul: 1.2 },   // WATER WALL (reflect)
    quotes: { intro: 'Ninja Storm, Ranger Form! Ha!', win: 'Water flows. You fall.', vs: QUOTE_VS },
    moves: TORI_MOVES, commands: COMMANDS.ns_blue, supers: { sSuper: toriSuper, sUlt: toriSuper } },
  ns_navy: { team: 'Thunder Ninja Academy', color: '#26347a', smoke: '#2a2e6a', blink: NS_BLINK, weight: 0.9, airMul: 1.05,
    streak: { air: { perAirtime: 2, eightWay: true }, cost: 8 }, float: null,   // THUNDER SPEED: cheaper streaks (8 NP), no float
    mirror: { mode: 'echo', echoDelay: 6, counter: { kind: 'tornado', hits: 3, dmg: 20, every: 5, launch: -15 } }, barrier: { kind: 'reflect', reflectMul: 1.3 },
    quotes: { intro: 'Thunder Storm, Ranger Form! Ha!', win: 'Thunder strikes twice.', vs: QUOTE_VS },
    moves: BLAKE_MOVES, commands: COMMANDS.ns_navy, supers: { sSuper: blakeSuper, sUlt: blakeSuper } },
  ns_green: { team: 'Wind Ninja Academy', color: '#22a84a', smoke: '#178a3a', blink: NS_BLINK, weight: 1.0, airMul: 0.95,
    streak: { air: { perAirtime: 1, eightWay: false } }, clones: { max: 1, cost: 25, strike: 75 },   // CYBER CAM: one digital double (Charge + Back)
    mirror: { mode: 'decoy', counter: { kind: 'eruption', dmg: 80, wall: true } }, barrier: { kind: 'armor', absorb: 2, armorFrames: 60, counter: { dmg: 70, radius: 130 } },   // SAMURAI GUARD
    quotes: { intro: 'Samurai Storm, Ranger Form! Ha!', win: 'Discipline wins. Every time.', vs: QUOTE_VS },
    moves: CAM_MOVES, commands: COMMANDS.ns_green, supers: { sSuper: camSuper, sUlt: camSuper } },
}
const STATS = {
  ns_blue:  { maxHealth: 1200, maxEnergy: 100, attack: 82, defense: 74, speed: 88, jumpPower: 31, maxJumps: 3, weight: 0.85, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  ns_navy:  { maxHealth: 1200, maxEnergy: 100, attack: 84, defense: 76, speed: 88, jumpPower: 31, maxJumps: 3, weight: 0.9, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  ns_green: { maxHealth: 1296, maxEnergy: 100, attack: 84, defense: 80, speed: 88, jumpPower: 31, maxJumps: 2, weight: 1.0, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
}
const INFO = {
  ns_blue: { name: 'Tori', displayName: 'Tori Hanson — Blue Wind Ranger', hudName: 'Blue Wind', archetype: 'Water Ninja / Flow Rushdown', tagline: 'Go with the flow.',
    bio: 'Tori Hanson, Blue Wind Ranger and the Wind Ninja Academy\'s Water student. A surfer who keeps her head when the boys lose theirs, she bends water into waves, walls and the Sonic Fin\'s slicing arcs.',
    primary: 'rushdown', secondary: ['zoner'], archetypes: ['rushdown', 'zoner'], ultimate: { name: 'Tsunami', cost: 100 } },
  ns_navy: { name: 'Blake', displayName: 'Blake Bradley — Navy Thunder Ranger', hudName: 'Navy Thunder', archetype: 'Thunder Ninja / Hit & Run', tagline: 'Strike like lightning.',
    bio: 'Blake Bradley, Navy Thunder Ranger of the Thunder Ninja Academy. Once Lothor\'s pawn alongside his brother Hunter, he turned his speed, the Navy Antler and the Thunder Staff against the space ninja.',
    primary: 'rushdown', secondary: ['aerial'], archetypes: ['rushdown', 'aerial'], ultimate: { name: 'Thunder Storm', cost: 100 } },
  ns_green: { name: 'Cam', displayName: 'Cam Watanabe — Green Samurai Ranger', hudName: 'Green Samurai', archetype: 'Samurai / Technician', tagline: 'Honour. Discipline. Samurai.',
    bio: 'Cam Watanabe, son of Sensei and the Wind Ninja Academy\'s tech genius. With his mother\'s Samurai Amulet he became the Green Samurai Ranger: Samurai Saber, Super Samurai Mode and a cyber double.',
    primary: 'setplay', secondary: ['grappler'], archetypes: ['setplay', 'trap'], ultimate: { name: 'Super Samurai', cost: 100 } },
}
export const TRIO_PROFILES = {}
export const FORM_CHAR = {}
for (const k of TRIO_FORMS) {
  TRIO_PROFILES[k] = registerNinjaProfile(k, PROFILE[k])
  FORM_CHAR[k] = nsRoster(k, { hidden: true, color: PROFILE[k].color, difficulty: 5, stats: STATS[k], ...INFO[k] }, PROFILE[k].moves, STRIPS[k])
  TRIO_PROFILES[k].stats = FORM_CHAR[k].stats   // ninjaRoundReset restores these
}
export const { ns_blue, ns_navy, ns_green } = FORM_CHAR

// ── roster entry ─────────────────────────────────────────────────────────────────────────────────────────────────
export const ns_trio = {
  ...ns_blue,
  rosterKey: TRIO_ID, hidden: false,
  name: 'Ninja Storm Trio', displayName: 'Ninja Storm Trio', subtitle: 'Tori · Blake · Cam', hudName: 'Ninja Storm Trio', color: '#2a78f0', accent2: '#22a84a',
  universe: 'power_rangers', subUniverse: 'Ninja Storm',
  portrait: './assets/ns_trio/portrait_large.png', hudIcon: './assets/ns_trio/portrait_small.png',
  difficulty: 6, archetype: 'Ninja Trio / Form Swapper', tagline: 'Water. Thunder. Samurai.',
  bio: 'Tori Hanson (Blue Wind), Blake Bradley (Navy Thunder) and Cam Watanabe (Green Samurai) fight as one: hold Charge and tap ↓ ↓, then Light for the next Ranger or Heavy for the one before.',
  primary: 'rushdown', secondary: ['setplay', 'zoner'], archetypes: ['rushdown', 'setplay'],
  stats: { ...ns_blue.stats, maxHealth: TRIO.health },
  ultimate: { name: 'Thunderstorm Trinity', cost: 100 },
  isDuo: true, duoForms: TRIO_FORMS,
}

// ── form application (presentation + movement fields of the active form; health / meter / NP / position stay) ──────
const FORM_FIELDS = ['name', 'hudName', 'color', 'portrait', 'hudIcon', 'spriteSheet', 'spriteScale', 'animationData', 'basic_attacks', 'traits', 'grabCastPose', 'primary', 'secondary', 'archetypes', 'movement']
let _skinHook = null
export function registerTrioSkinHook(fn) { _skinHook = fn }   // nsTrioSkins.js (cosmetic only)
function applyForm(f, form) {
  const c = FORM_CHAR[form]
  f.rosterKey = form
  for (const k of FORM_FIELDS) if (c[k] !== undefined) f[k] = c[k]
  _skinHook?.(f, form)
  const st = c.stats
  f.stats = { ...st, maxHealth: f.maxHealth }
  f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed; f.dashDuration = st.dashDuration; f.dashCooldownMax = st.dashCooldownMax
  f.maxJumps = st.maxJumps; f.jumpForce = -(st.jumpPower || 32); f.weight = st.weight
}
function roundReset(f) {
  if (!f || (f.rosterKey !== TRIO_ID && f._duo?.id !== TRIO_ID)) return
  const start = trioStartForm(f.skinId)
  f._duo = { id: TRIO_ID, forms: TRIO_FORMS, form: start, start, cd: 0, swaps: 0, t: 0, prevDown: false, prevLight: false, prevHeavy: false, downAt: null, armT: 0, want: 0, wantDir: 1,
    tag: null, strikes: 0, tagHits: 0, ults: 0, cpu: null, hudLabel: 'P+↓↓+J/K', samurai: 0, samurais: 0 }
  f._duoFromKey = TRIO_ID
  applyForm(f, start)
}
function ensure(f) { if (f && f.rosterKey === TRIO_ID && !f._duo) { roundReset(f); return true } return false }

const W = () => NINJA_API.world()
const ben = () => { const b = W()?.benSwap?.(); return b ? { ...TRIO.ben, ...b } : TRIO.ben }
const grounded = f => !!(f.onGround || f.grounded)
const elapsed = a => a.total - a.timer

// ── INPUT: P S S J / P S S K (sim frames) ─────────────────────────────────────────────────────────────────────────────
function input(f, raw) {
  const d = f._duo; if (!d) return
  const B = ben(); d.t++
  const down = !!raw.down, light = !!raw.light, heavy = !!raw.heavy, charge = !!raw.charge
  if (down && !d.prevDown) {
    if (!charge) d.downAt = null
    else if (d.downAt != null && d.t - d.downAt <= B.dbl) { d.armT = B.arm; d.downAt = null } else d.downAt = d.t
  }
  d.prevDown = down
  const lightEdge = light && !d.prevLight, heavyEdge = heavy && !d.prevHeavy; d.prevLight = light; d.prevHeavy = heavy
  d.ate = false
  if (d.armT > 0) {
    if (!charge) d.armT = 0
    else if (lightEdge || heavyEdge) { d.want = B.arm; d.wantDir = lightEdge ? 1 : -1; d.armT = 0; d.ate = true } else d.armT--
  }
}
function refuse(f, s, d) {
  if (!(f.health > 0)) return 'ko'
  if ((f.hitstun || 0) > 0) return 'hitstun'
  if ((f.blockstun || 0) > 0) return 'blockstun'
  if (f.knockdownState || f.isGrabbed) return 'down'
  if (s.sup) return 'super'
  const a = f.attacking ? f.currentAttack : null
  if (a?.isUltimate) return 'super'
  if (d.swap) return 'swapping'
  if (d.cd > 0) return 'cooldown'
  if (s.vanish || s.streak || s.mirror?.swap || s.cloneJob?.phase === 'strike') return 'busy'
  if (a && a.name !== 'nsStreakRec' && a.name !== 'nsBurrow') {
    const md = getNinjaProfile(f)?.moves[a.name] || {}
    if (md.isSpecial || !(elapsed(a) > (a.activeEnd ?? 0))) return 'attacking'
  }
  if ((s.np || 0) < ben().cost) return 'np'
  return null
}
function tick(f, opp, s) {
  const d = f._duo; if (!d) return
  if (d.cd > 0 && !d.swap) d.cd--
  if (d.tag) { for (const k of Object.keys(d.tag)) if (--d.tag[k] <= 0) delete d.tag[k]; if (!Object.keys(d.tag).length) d.tag = null }
  if (d.samurai > 0) { d.samurai--; f.speed = d.samurai > 0 ? (f.baseSpeed || f.speed) * TRIO.samurai.speed : (f.baseSpeed || f.speed) }   // SUPER SAMURAI MODE
  if (d.want > 0) {
    const why = refuse(f, s, d)
    if (!why) { d.want = 0; startSwap(f, opp, s, d) }
    else if (why === 'busy' && s.streak) { /* buffered */ }
    else { d.want--; d.lastRefuse = why }
  }
}
function startSwap(f, opp, s, d) {
  const from = d.form, to = d.wantDir < 0 ? prev(from) : next(from), vx = f.vx || 0, vy = f.vy || 0
  spendNP(f, ben().cost)
  d.samurai = 0   // Super Samurai Mode ends on a switch
  if (s.mirror) endMirror(f, s, 'swap')
  if (s.clones.length || s.cloneJob) { for (const c of s.clones) if (!c.dead) burst(s, 'smokeFade', c.x, c.feet, 16, { form: from }); s.clones = []; s.cloneJob = null }
  s.rev.pips = 0; s.rev.t = 0
  if (s.burrow) { s.burrow = null; f._rooted = false; burst(s, 'dust', ctrX(f), (f.y || 0) + (f.h || 94), 12) }
  s.float.on = false
  if (s.barrier) s.barrier = null
  if (f.attacking) endMove(f)
  if (!nsStartMove(f, 'nsSwap')) return
  f.vx = vx; f.vy = vy
  f.currentAttack.nj.from = from; f.currentAttack.nj.to = to; f.currentAttack.nj.vx = vx
  d.swap = { t: 0, from, to }
  d.swaps++
  NINJA_API.setPose(f, 'nsVanish')
  burst(s, 'smoke', ctrX(f), (f.y || 0) + (f.h || 94), 16, { big: true, form: from })
  cue(f, 'smokePop')
}
function runSwap(f, opp, s, a, t) {
  const d = f._duo; if (!d?.swap) return
  d.swap.t = t
  if (!grounded(f)) f.vx = a.nj.vx
  if (t < TRIO.outEnd) NINJA_API.setPose(f, 'nsVanish')
  if (t === TRIO.invulnAt) { f.invulnTimer = Math.max(f.invulnTimer || 0, TRIO.invulnFrames); burst(s, 'smokeFade', ctrX(f), (f.y || 0) + (f.h || 94), 22, { form: a.nj.from }) }
  if (t >= TRIO.outEnd && t < TRIO.inStart) NINJA_API.setPose(f, 'nsVanishGone')
  if (t === TRIO.flipAt && d.form !== a.nj.to) {
    applyForm(f, a.nj.to); d.form = a.nj.to
    burst(s, 'smoke', ctrX(f), (f.y || 0) + (f.h || 94), 18, { big: true, form: a.nj.to })
    cue(f, 'smokePop')
  }
  if (t >= TRIO.inStart) NINJA_API.setPose(f, 'nsStreakStrike')
  if (t === TRIO.strike.at && opp && !a._strike) {
    a._strike = true
    const S = TRIO.strike, fw = f.w || 48, dir = f.facing || 1, feet = (f.y || 0) + (f.h || 94)
    const box = { x: dir > 0 ? f.x + fw - 10 : f.x - S.w + 10, y: feet - (f.h || 94), w: S.w, h: f.h || 94 }
    s.lastBox = box
    if (overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
      const r = nsStrike(f, opp, S.dmg, { damageType: 'blunt', move: 'nsSwapIn', hitstun: S.hitstun, kb: S.kb, cue: 'impact' })
      if (r === true) { d.strikes++; d.tag = { ...(d.tag || {}), [a.nj.from]: TRIO.tag.frames } }
      a._contact = !!r
    }
  }
  if (t >= TRIO.swapFrames - 1) { d.swap = null; d.cd = ben().lockout }
}
function onStart(f, a, md) {
  const d = f._duo; if (!d || !md?.isSpecial) return
  if (d.samurai > 0) a.nj.tag = (a.nj.tag || 1) * TRIO.samurai.dmg   // SUPER SAMURAI MODE: specials +15%
  if (!d.tag?.[d.form]) return
  a.nj.tag = (a.nj.tag || 1) * TRIO.tag.mul; delete d.tag[d.form]; if (!Object.keys(d.tag).length) d.tag = null; d.tagHits++
}
// SUPER SAMURAI MODE (kind 'samurai', Cam): powers up on its startup frame
function runSamurai(f, s, a, t) {
  const d = f._duo; if (!d || a._sam || t < (a.nj.at ?? 12)) return
  a._sam = true; d.samurai = TRIO.samurai.frames; d.samurais++
  burst(s, 'aura', ctrX(f), (f.y || 0) + (f.h || 94), 30); cue(f, 'superStart')
}
function command(f, s, opp, raw) {
  const d = f._duo; if (!d) return false
  if (d.swap) return 'consumed'
  if ((d.armT > 0 || d.want > 0 || d.ate) && fresh(s, 'charge', 30)) use(s, 'charge')   // the held Charge never becomes a Charge move
  if (d.ate || d.want > 0 && (fresh(s, 'light') || fresh(s, 'heavy'))) { use(s, 'light', 'heavy'); return 'consumed' }   // the picking J / K never attacks
  // THUNDERSTORM TRINITY: ↓↘→↓↘→ + Special + Heavy on the FULL meter (outside the Mirror) — the Storm and Stone chord
  if (!s.mirror && (f.energy || 0) >= TRIO_ULT.bars * BAR && hasMotion(s, '236236', 44)) {
    const sp = fresh(s, 'special'), hv = fresh(s, 'heavy')
    if (sp && hv && Math.abs(s.edgeAt.special - s.edgeAt.heavy) <= 4) {
      const a = f.attacking ? f.currentAttack : null
      if (!a || !a.isUltimate) {
        use(s, 'special', 'heavy')
        if (nsStartMove(f, 'sTrio')) { f.energy = Math.max(0, (f.energy || 0) - TRIO_ULT.bars * BAR); cue(f, 'ultStart'); d.ults++ }
        return 'consumed'
      }
    }
    if ((sp || hv) && s.tick - Math.max(sp ? s.edgeAt.special : -1e9, hv ? s.edgeAt.heavy : -1e9) < 3) return f.attacking ? 'consumed' : 'grab'   // chord window
  }
  return false
}
const BAR = 50
const fw = (recovery, kind, extra = {}) => ({ damage: 0, startup: 0, active: 1, recovery, hitstun: 0, blockstun: 0, knockbackX: 0, knockbackY: 0, rangeX: 1, rangeY: 1, frameExact: true, damageType: 'blunt', nj: { kind, noHit: true }, ...extra })
export const TRIO_MOVES = { nsSwap: fw(TRIO.swapFrames - 1, 'duoSwap'),
  sTrio: fw(TRIO_ULT.total - 1, 'super', { category: 'ultimate', isUltimate: true, bars: TRIO_ULT.bars, invuln: TRIO_ULT.total + 2 }) }   // THUNDERSTORM TRINITY
function alpha(f) {
  const d = f._duo; if (!d) return null
  if (d.swap) { const t = d.swap.t; return t >= TRIO.outEnd && t < TRIO.inStart ? 0 : null }
  const s = f._ninja; if (s?.sup?.kind === 'sTrio') { const a = f.currentAttack, t = a ? elapsed(a) : 0; return t >= 6 && t < TRIO_ULT.all - 2 ? 0 : null }   // the partners are drawn instead
  return null
}

// ── CPU SWAP (ai.js): presses the real Charge + ↓, -, ↓, J/K. Blake vs an airborne / zoning foe, Cam up close, Tori between.
const CPU_SEQ = 8
export function trioAiInput(controller, f, opp, input) {
  const d = f?._duo; if (!d || d.id !== TRIO_ID || !input || controller?.difficulty === 'dummy') return input
  const c = d.cpu || (d.cpu = { seq: 0, last: -1e9, btn: 'light' })
  if (c.seq > 0) {
    const step = CPU_SEQ - c.seq; c.seq--
    for (const k of Object.keys(input)) input[k] = false
    input.toggle = true   // the AI's Charge key (game.js applyAIInput: toggle → controls.charge)
    if (step < 2 || step === 4 || step === 5) input.down = true
    if (step >= 6) input[c.btn === 'light' ? 'lightAttack' : 'heavyAttack'] = true
    return input
  }
  if (!opp || d.swap || d.cd > 0 || !grounded(f) || f.attacking || (f.hitstun || 0) > 0 || d.t - c.last < TRIO.cpu.dwell) return input
  if ((f._ninja?.np || 0) < ben().cost + 10) return input
  const dist = Math.abs(ctrX(opp) - ctrX(f)), oppAir = !grounded(opp)
  const zoning = dist > 1280 * TRIO.cpu.far || !!(opp.attacking && opp.currentAttack?.isProjectile)
  const want = (oppAir || zoning) ? 'ns_navy' : dist < TRIO.cpu.near ? 'ns_green' : 'ns_blue'
  if (want !== d.form) { c.btn = next(d.form) === want ? 'light' : 'heavy'; c.seq = CPU_SEQ; c.last = d.t; d.cpuSwaps = (d.cpuSwaps || 0) + 1; for (const k of Object.keys(input)) input[k] = false; if (f._ninja) use(f._ninja, 'light', 'heavy', 'special', 'ultimate', 'upAttack') }   // the switch frame starts nothing else, and the buffered presses are spent
  return input
}

registerDuoForms(TRIO_ID, FORM_CHAR, form => next(form))   // render helpers: smoke strips, the NEXT Ranger on the HUD / intro
registerDuo({
  id: TRIO_ID, roundReset, ensure, input, tick, command, onStart, alpha,
  moves: TRIO_MOVES, supers: { sTrio: trioUlt },
  run: (f, opp, s, a, t) => { if (a.nj.kind === 'duoSwap') runSwap(f, opp, s, a, t); else if (a.nj.kind === 'samurai') runSamurai(f, s, a, t) },
})
