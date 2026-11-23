// dinoData.js — MSV1-DINO: the four Dino Thunder FORMS as ninja.js profiles (the framework the MS_V1 Rangers run on):
//   dt_red    = CONNER McKNIGHT — Red Dino Ranger    (Tyranno Gem: SUPER SPEED; Tyranno Staff)       sheet: falmeatwad
//   dt_blue   = ETHAN JAMES     — Blue Dino Ranger   (Tricera Gem: INVULNERABLE SKIN; Tricera Shield) sheet: YONDY-HOKAGE
//   dt_yellow = KIRA FORD       — Yellow Dino Ranger (Ptera Gem: PTERA SCREAM; Ptera Grips)           sheet: DK-YONDY
//   dt_white  = TRENT FERNANDEZ-MERCER — White Dino / Drago Ranger (Drago Gem: CAMOUFLAGE; Drago Sword) sheets: DK-YONDY + Raikage
// The forms are hidden roster entries; the visible character is dinothunder (dinothunder.js) whose live rosterKey is the
// ACTIVE form. Frame data is frame-exact (combat.startMove frameExact) and every move carries a damageType.
// Strips: tools/dino/pack.py (dinoSprites.js), cells = MSV1_CELL so nsFx / ninja.js draw them unchanged. Sprites face right.
// "Gem energy" IS the ninja.js Ninja Power (0–100, start 50, regen 6/s, +4 per landed hit — the framework defaults).
import { DINO_STRIPS, DINO_CELL } from './dinoSprites.js'
import { registerNinjaProfile } from './ninja.js'
import { nsN as n, nsSp as sp, NS_FRAMEWORK, NS_BLINK } from './nsData.js'

export const DINO_FORMS = ['dt_red', 'dt_blue', 'dt_yellow', 'dt_white']
export const DINO_GEM = { dt_red: '#e0201c', dt_blue: '#1e5bff', dt_yellow: '#f6c600', dt_white: '#e8e8f0' }   // the gem colours (HUD bar, rings, glows)
// ground speed vs S.P.D. Red (walk 7.0 px/f at speed 88; walk = 4.5 + (speed − 78)/20 × 5) — docs/msv1/dino/SPD_RED_REFERENCE.md
export const DINO_SPEED_MUL = { dt_red: 1.10, dt_blue: 0.90, dt_yellow: 1.00, dt_white: 1.05 }
const speedFor = k => Math.round((78 + (7.0 * DINO_SPEED_MUL[k] - 4.5) * 4) * 100) / 100
export const DINO_WEIGHT = { dt_red: 1.0, dt_blue: 1.15, dt_yellow: 0.85, dt_white: 0.95 }   // medium / heavy / light / medium-light

// ── ANIMS ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const A = (key, strip, speed = 6, extra = {}) => ({ sheet: `./assets/${key}/${strip}.png`, frames: DINO_STRIPS[key][strip], width: DINO_CELL.width, height: DINO_CELL.height,
  speed, anchorY: 0, originX: DINO_CELL.originX, originY: DINO_CELL.originY, loop: false, lockLastFrame: true, ...extra })
function TL(key, strip, md, impact = 0.4) {
  const nfr = DINO_STRIPS[key][strip]; if (!md || nfr <= 1) return [[0, 0]]
  const st = md.startup ?? 5, ac = md.active ?? 3, rc = md.recovery ?? 10, k = Math.max(1, Math.min(nfr - 1, Math.round(nfr * impact)))
  const out = []
  for (let i = 0; i < k; i++) out.push([Math.floor(st * i / k), i])
  const rest = nfr - k
  for (let i = 0; i < rest; i++) out.push([st + Math.floor((ac + rc) * i / rest), k + i])
  return out.filter((e, i, arr) => i === 0 || e[0] > arr[i - 1][0])
}
// engine / framework anim keys → the form's strip (missing animations: the form's OWN closest frames — SPRITE_MAP.md)
const STATE = {
  idle: ['idle', 9, true], walk: ['walk', 6, true], walk_back: ['walk', 7, true], run: ['run', 4, true], dash: ['dash', 3], jump: ['jump', 6], fall: ['fall', 8],
  crouch: ['crouch', 4], guard: ['guard', 6, true], guard_hit: ['guard', 6], hurt: ['hurt', 5], hurt_heavy: ['hurt', 6], hurt_air: ['hurtAir', 4], knockdown: ['down', 8],
  getup: ['getup', 6], taunt: ['taunt', 7], intro: ['idle', 9, true], win: ['win', 10], lose: ['lose', 8], airSpin: ['fall', 4, true], streakTail: ['streakTail', 4],
  runStop: ['land', 6], landRecover: ['land', 4], land: ['land', 4], dropDive: ['fall', 4], superTornado: ['dash', 3, true], superFinish: ['win', 6], superSlam: ['land', 4],
  superDive: ['fall', 4], smoke: ['smoke', 4], smokeFade: ['smokeFade', 4],
  nsStreak: ['dash', 3, true], nsTremor: ['dash', 3, true], nsStreakRec: ['land', 4], nsVanish: ['smoke', 3], nsVanishGone: ['idle', 3, true], nsVanishOut: ['land', 4],
  nsMirror: ['taunt', 5], nsClone: ['guard', 5], nsBarrier: ['guard', 5], nsDome: ['guard', 3, true], nsBarrierEnd: ['guard', 4], nsBurrow: ['crouch', 3, true],
  dtSwap: ['smoke', 3], dtOut: ['zord', 4], dtIn: ['land', 4],
}
function buildAnims(key, moves, strips, over) {
  const S = DINO_STRIPS[key], pick = s => S[s] ? s : (s === 'walk' ? 'run' : s === 'zord' ? 'taunt' : s === 'dash' ? 'run' : 'idle')
  const out = {}
  for (const [k, [strip, speed, loop]] of Object.entries(STATE)) out[k] = A(key, pick(over[k] || strip), speed, loop ? { loop: true } : {})
  for (const [k, md] of Object.entries(moves)) {
    if (out[k] && !strips[k]) continue
    const strip = pick(strips[k] || 'idle')
    out[k] = A(key, strip, 5, { frameTimeline: TL(key, strip, md) })
  }
  for (const k of ['nsStreakStrike', 'grab', 'throw']) out[k] = A(key, pick(strips[k] || 'jab'), 4)
  for (const [k, s] of Object.entries(strips)) if (!out[k]) out[k] = A(key, pick(s), 4)   // pose-only keys (setPose)
  return out
}

// ── FRAME DATA (S.P.D. Red's conventions; nsData helpers) ────────────────────────────────────────────────────────
const SUPER = (total, type) => n(0, 1, 1, total, { category: 'ultimate', isUltimate: true, bars: 1, invuln: total + 2, damageType: type, nj: { kind: 'super', noHit: true } })
const fwK = (recovery, kind, extra = {}) => n(0, 0, 1, recovery, { nj: { kind, noHit: true }, ...extra })
const BASE = { ...NS_FRAMEWORK }
// Super lengths (dinoSupers.js owns the scripts; the totals live here so the move table is plain data)
export const DINO_SUPER_TOTAL = { dt_red: 96, dt_blue: 104, dt_yellow: 100, dt_white: 92 }

// RED — CONNER McKNIGHT
const RED_MOVES = {
  ...BASE,
  jab:         n(40, 5, 2, 8,   { hitstun: 16, rangeX: 60 }),                                                                     // PUNCH row
  straight:    n(62, 7, 3, 14,  { hitstun: 22, rangeX: 72, knockbackX: 6 }),                                                    // Straight
  bicycle:     n(66, 5, 4, 12,  { hitstun: 20, rangeX: 80, rangeY: 80, nj: { kind: 'normal', boxY: 10 } }),                     // Bicycle Kick (AIR KICK + streak)
  staffThrust: n(74, 9, 3, 16,  { hitstun: 24, rangeX: 104, knockbackX: 7 }),                                                     // Staff Thrust (A2)
  staffArc:    n(82, 8, 4, 18,  { hitstun: 28, rangeX: 76, rangeY: 140, launcher: true, launchVy: -20, nj: { kind: 'normal', boxY: -50 } }),   // Staff Arc (A3) anti-air launcher
  low:         n(46, 7, 3, 14,  { hitstun: 18, rangeX: 80, rangeY: 32, hitLevel: 'low', nj: { kind: 'normal', boxY: 62 } }),   // crouching sweep (jump-crouch frames + PUNCH)
  // 1. SUPER SPEED ↓↓+Special, 30 gem: 3 s, speed ×1.6, recoveries −25 %, Dino Dash chains up to 3 (dinothunder.js)
  sSpeed:      sp(0, 10, 1, 12, 30, { nj: { kind: 'dtSpeed', noHit: true }, invuln: 10 }),
  // 2. TYRANNO SLAM ↓↘→+Heavy: staff row B overhead into the ground explosion: 88, OTG, ground bounce
  sSlam:       sp(0, 14, 3, 22, 0, { damageType: 'blunt', groundHit: true, nj: { kind: 'hits', noHit: true, hits: [{ at: 14, dx: -10, w: 120, h: 120, dy: -120, dmg: 88, type: 'blunt', otg: true, bounce: true, hitstun: 34, kb: 2, launch: -6, fx: 'dtBoom', fxT: 18, cue: 'eruption' }] } }),
  // 3. PENALTY STRIKE →+Special: a travelling bicycle kick (40 % screen): 70; crosses up during Super Speed
  sPenalty:    sp(0, 8, 12, 14, 0, { damageType: 'blunt', nj: { kind: 'dtPenalty', noHit: true, dist: 0.40, frames: 12, dmg: 70 } }),
  sSuper:      SUPER(DINO_SUPER_TOTAL.dt_red, 'blunt'),                                                                         // RAPTOR RIDER STAMPEDE
}
// BLUE — ETHAN JAMES
const BLUE_MOVES = {
  ...BASE,
  jab:      n(38, 5, 2, 9,   { hitstun: 16, rangeX: 62 }),
  string2:  n(38, 6, 2, 10,  { hitstun: 18, rangeX: 70 }),
  string3:  n(56, 8, 3, 14,  { hitstun: 22, rangeX: 76, knockbackX: 5 }),
  crescent: n(72, 9, 3, 18,  { damageType: 'slash', hitstun: 28, rangeX: 96, knockbackX: 8 }),                                   // crescent finisher
  airPunch: n(60, 5, 4, 12,  { hitstun: 20, rangeX: 74, rangeY: 80, nj: { kind: 'normal', boxY: 10 } }),
  upper:    n(58, 7, 4, 18,  { hitstun: 28, rangeX: 70, rangeY: 130, launcher: true, launchVy: -18, nj: { kind: 'normal', boxY: -40 } }),   // shield uppercut (WEAPON UP)
  low:      n(44, 7, 3, 14,  { hitstun: 18, rangeX: 80, rangeY: 32, hitLevel: 'low', nj: { kind: 'normal', boxY: 62 } }),
  // 1. TRICERA SKIN ↓↓+Special, 30 gem: 2 s, hits cause no hitstun and deal 40 %; throws still work
  sSkin:    sp(0, 8, 1, 12, 30, { nj: { kind: 'dtSkin', noHit: true }, invuln: 8 }),
  // 2. SHIELD RAM →+Heavy (WEAPON UP ATTACK): 80, wall bounce; the shield absorbs one projectile on frames 1–10
  sRam:     sp(0, 8, 6, 16, 0, { damageType: 'blunt', nj: { kind: 'hits', noHit: true, absorb: [1, 10], step: 7, hits: [{ at: 8, dx: -10, w: 96, dmg: 80, type: 'blunt', hitstun: 30, kb: 14, cue: 'impact', wall: true }] } }),
  // 3. SHIELD QUAKE ↓↘→+Heavy (WEAPON DOWN ATTACK burst): 76, OTG
  sQuake:   sp(0, 12, 3, 22, 0, { damageType: 'blunt', groundHit: true, nj: { kind: 'hits', noHit: true, hits: [{ at: 12, dx: -20, w: 150, h: 90, dy: -90, dmg: 76, type: 'blunt', otg: true, hitstun: 30, kb: 4, launch: -8, fx: 'dtBoom', fxT: 18, cue: 'eruption' }] } }),
  sSuper:   SUPER(DINO_SUPER_TOTAL.dt_blue, 'blunt'),                                                                           // TRICERA ZORD RAM
}
// YELLOW — KIRA FORD
const YELLOW_MOVES = {
  ...BASE,
  jab:        n(34, 5, 2, 8,   { hitstun: 15, rangeX: 60 }),
  string2:    n(34, 5, 2, 9,   { hitstun: 17, rangeX: 66 }),
  string3:    n(40, 6, 3, 11,  { hitstun: 20, rangeX: 72 }),
  crescent:   n(58, 8, 3, 15,  { damageType: 'slash', hitstun: 26, rangeX: 92, knockbackX: 7 }),
  airKick:    n(62, 5, 4, 12,  { hitstun: 20, rangeX: 80, rangeY: 80, nj: { kind: 'normal', boxY: 12 } }),
  upCrescent: n(74, 7, 4, 17,  { damageType: 'slash', hitstun: 28, rangeX: 80, rangeY: 140, launcher: true, launchVy: -20, nj: { kind: 'normal', boxY: -50 } }),   // WEAPON UP crescent, anti-air
  low:        n(40, 6, 3, 13,  { hitstun: 18, rangeX: 78, rangeY: 32, hitLevel: 'low', nj: { kind: 'normal', boxY: 62 } }),
  // 1. PTERA SCREAM ↓↘→+Special, 20 gem: a sonic cone (the DINO ZORD rings as sound rings): 50, 30-frame stun, pushback,
  //    DESTROYS non-super projectiles. Air version angled down. 2. ENCORE: a 2nd scream within 3 s of the 1st hitting → 50 f.
  sScream:    sp(0, 12, 14, 18, 20, { damageType: 'energy', nj: { kind: 'dtScream', noHit: true, len: 260, w0: 50, w1: 150, dmg: 50, stun: 30, encore: 50 } }),
  sScreamAir: sp(0, 10, 14, 16, 20, { damageType: 'energy', nj: { kind: 'dtScream', noHit: true, len: 230, w0: 50, w1: 140, dmg: 50, stun: 30, encore: 50, angle: 30 } }),
  // 3. DIVE GRIPS (air) ↓+Special: WEAPON DOWN as a diving dagger strike into its ground burst: 70
  sDive:      sp(70, 6, 30, 4, 0, { damageType: 'slash', hitstun: 30, rangeX: 60, rangeY: 80, knockbackY: 8, nj: { kind: 'dive', vx: 7, vy: 16, boxY: 30, landRec: 14, landPose: 'diveLand' } }),
  sSuper:     SUPER(DINO_SUPER_TOTAL.dt_yellow, 'energy'),                                                                       // PTERA ZORD STRIKE
}
// WHITE / DRAGO — TRENT FERNANDEZ-MERCER
const WHITE_MOVES = {
  ...BASE,
  sw1:       n(40, 5, 2, 8,   { damageType: 'slash', hitstun: 16, rangeX: 72 }),
  sw2:       n(40, 6, 2, 10,  { damageType: 'slash', hitstun: 18, rangeX: 86 }),
  sw3:       n(46, 6, 3, 11,  { damageType: 'slash', hitstun: 20, rangeX: 80 }),
  sw4:       n(66, 8, 3, 16,  { damageType: 'slash', hitstun: 26, rangeX: 110, knockbackX: 8 }),
  kick:      n(58, 7, 3, 15,  { hitstun: 22, rangeX: 80, knockbackX: 6 }),                                                       // Kicks (Drago)
  longSlash: n(78, 10, 3, 18, { damageType: 'slash', hitstun: 28, rangeX: 130, knockbackX: 9 }),                                 // the long-streak slash
  upKick:    n(56, 7, 4, 18,  { hitstun: 28, rangeX: 66, rangeY: 130, launcher: true, launchVy: -19, nj: { kind: 'normal', boxY: -40 } }),
  airSlash:  n(58, 5, 4, 12,  { damageType: 'slash', hitstun: 20, rangeX: 86, rangeY: 90, nj: { kind: 'normal', boxY: 4 } }),
  low:       n(44, 7, 3, 14,  { damageType: 'slash', hitstun: 18, rangeX: 86, rangeY: 32, hitLevel: 'low', nj: { kind: 'normal', boxY: 62 } }),
  // 2. CAMOUFLAGE ↓↓+Special, 30 gem: 2.5 s nearly invisible (shimmer outline + footstep dust); first attack +25 % and ends it
  sCamo:     sp(0, 8, 1, 12, 30, { nj: { kind: 'dtCamo', noHit: true } }),
  sSuper:    SUPER(DINO_SUPER_TOTAL.dt_white, 'slash'),                                                                         // DRAGO SWORD STORM
}

// ── COMMANDS (data the generic ninjaCommand.js layer reads; d = held direction at the press edge, facing-relative) ──
const chain = (ctx, order) => { const i = order.indexOf(ctx.from); return i >= 0 && i < order.length - 1 ? order[i + 1] : order[0] }
const RED_STR = ['jab', 'straight']
const BLUE_STR = ['jab', 'string2', 'string3', 'crescent'], YEL_STR = ['jab', 'string2', 'string3', 'crescent'], WHI_STR = ['sw1', 'sw2', 'sw3', 'sw4']
const COMMANDS = {
  dt_red: {
    normal: (b, d, g, ctx) => {
      if (!g) return 'bicycle'
      if (b === 'upAttack' || (b === 'light' && d.up)) return 'staffArc'
      if (d.down) return 'low'
      if (b === 'light') return chain(ctx, RED_STR)
      return 'staffThrust'
    },
    gatling: { jab: ['straight', 'staffThrust', 'staffArc', 'low'], straight: ['staffThrust', 'staffArc'], low: ['jab', 'staffThrust', 'staffArc'], staffThrust: ['staffArc'], staffArc: [] },
    specials: [{ motion: '236236', button: 'special', key: 'sSuper', win: 40 }, { downDown: true, button: 'special', key: 'sSpeed', ground: true },
      { motion: '236', button: 'heavy', key: 'sSlam', ground: true }, { motion: '6', button: 'special', key: 'sPenalty', air: 'sPenalty', win: 10 }, { button: 'special', key: 'sPenalty', air: 'sPenalty' }],
    specialsSet: [],
  },
  dt_blue: {
    normal: (b, d, g) => !g ? 'airPunch' : (b === 'upAttack' || (b === 'light' && d.up)) ? 'upper' : d.down ? 'low' : b === 'light' ? null : 'crescent',
    gatling: { jab: ['string2', 'crescent', 'upper', 'low'], string2: ['string3', 'crescent', 'upper'], string3: ['crescent', 'upper'], low: ['jab', 'crescent', 'upper'], crescent: [], upper: [] },
    specials: [{ motion: '236236', button: 'special', key: 'sSuper', win: 40 }, { downDown: true, button: 'special', key: 'sSkin', ground: true },
      { motion: '236', button: 'heavy', key: 'sQuake', ground: true }, { motion: '6', button: 'heavy', key: 'sRam', ground: true, win: 10 }, { button: 'special', key: 'sRam', ground: true }],
    specialsSet: [],
  },
  dt_yellow: {
    normal: (b, d, g) => !g ? 'airKick' : (b === 'upAttack' || (b === 'light' && d.up)) ? 'upCrescent' : d.down ? 'low' : b === 'light' ? null : 'crescent',
    gatling: { jab: ['string2', 'crescent', 'upCrescent', 'low'], string2: ['string3', 'crescent', 'upCrescent'], string3: ['crescent', 'upCrescent'], low: ['jab', 'upCrescent'], crescent: [], upCrescent: [] },
    specials: [{ motion: '236236', button: 'special', key: 'sSuper', win: 40 }, { motion: '236', button: 'special', key: 'sScream', air: 'sScreamAir' },
      { motion: '2', button: 'special', key: 'sScream', air: 'sDive', win: 8 }, { button: 'special', key: 'sScream', air: 'sScreamAir' }],
    specialsSet: [],
  },
  dt_white: {
    normal: (b, d, g) => !g ? 'airSlash' : (b === 'upAttack' || (b === 'light' && d.up)) ? 'upKick' : d.down ? 'low' : b === 'light' ? null : d.fwd ? 'longSlash' : 'kick',
    gatling: { sw1: ['sw2', 'kick', 'longSlash', 'upKick', 'low'], sw2: ['sw3', 'kick', 'longSlash', 'upKick'], sw3: ['sw4', 'longSlash', 'upKick'], sw4: [], low: ['sw1', 'kick', 'upKick'], kick: ['longSlash', 'upKick'], longSlash: [], upKick: [] },
    specials: [{ motion: '236236', button: 'special', key: 'sSuper', win: 40 }, { downDown: true, button: 'special', key: 'sCamo', ground: true }],
    specialsSet: [],
  },
}
// a Light press walks the form's string (the engine passes ctx.from = the move being cancelled)
for (const [k, order] of [['dt_blue', BLUE_STR], ['dt_yellow', YEL_STR], ['dt_white', WHI_STR]]) {
  const base = COMMANDS[k].normal
  COMMANDS[k].normal = (b, d, g, ctx) => { const r = base(b, d, g, ctx); return r === null ? chain(ctx, order) : r }
}

// strips per move key (and pose-only keys)
const STRIPS = {
  dt_red: { jab: 'jab', straight: 'straight', bicycle: 'bicycle', staffThrust: 'staffThrust', staffArc: 'staffArc', low: 'crouch', sSpeed: 'speedUp', sSlam: 'slam', sPenalty: 'penalty',
    sSuper: 'speedUp', nsStreakStrike: 'bicycle', grab: 'jab', throw: 'straight', rideIn: 'jump', zord: 'speedUp' },
  dt_blue: { jab: 'jab', string2: 'string2', string3: 'string3', crescent: 'crescent', airPunch: 'airPunch', upper: 'ram', low: 'crouch', sSkin: 'zord', sRam: 'ram', sQuake: 'quake',
    sSuper: 'zord', nsStreakStrike: 'string3', grab: 'jab', throw: 'string3', zord: 'zord' },
  dt_yellow: { jab: 'jab', string2: 'string2', string3: 'string3', crescent: 'crescent', airKick: 'airKick', upCrescent: 'upCrescent', low: 'crouch', sScream: 'zord', sScreamAir: 'zord',
    sDive: 'dive', diveLand: 'dive', sSuper: 'zord', nsStreakStrike: 'airKick', grab: 'jab', throw: 'string3', zord: 'zord' },
  dt_white: { sw1: 'sw1', sw2: 'sw2', sw3: 'sw3', sw4: 'sw4', kick: 'dKick', longSlash: 'longSlash', upKick: 'kick', airSlash: 'sw3', low: 'crouch', sCamo: 'dashPose',
    sSuper: 'crescent', nsStreakStrike: 'dragoCut', grab: 'sw1', throw: 'sw3', zord: 'dashPose', appear: 'appear', dashOne: 'dashOne', walkIn: 'walk' },
}
const OVER = {   // per-form STATE overrides
  dt_red: { dtOut: 'speedUp' }, dt_blue: {}, dt_yellow: {}, dt_white: { dash: 'dash', nsStreak: 'dash', dtOut: 'dashPose', intro: 'appear' },
}
// pose keys the dinothunder.js / dinoSupers.js scripts swap in with setPose
const POSES = { dt_red: { slamBoom: 'slam' }, dt_blue: {}, dt_yellow: {}, dt_white: {} }

// ── PROFILES ─────────────────────────────────────────────────────────────────────────────────────────────────────
const run = k => ({ ...NS_BLINK, run: { speed: 8.4, walk: 5.6 } })   // S.P.D. Red's 12-tick double-tap + run multiplier (walk × 1.5)
const SUPERS = {}   // filled by dinoSupers.js (registerDinoSupers) — kept as a shared object so the profiles see them
export function registerDinoSupers(map) { for (const [k, fn] of Object.entries(map)) { SUPERS[k] = fn; if (DINO_PROFILES[k]) DINO_PROFILES[k].supers.sSuper = fn } }
const QUOTES = (intro, win, vs = {}) => ({ intro, win, vs })
const PROFILE = {
  dt_red: { team: 'Dino Thunder', color: DINO_GEM.dt_red, smoke: '#d4141a', blink: run('dt_red'), weight: DINO_WEIGHT.dt_red, airMul: 1.0,
    // DINO DASH: 45 % screen, projectile-intangible frames 2–5; chains only in Super Speed (dinothunder.js streak gate)
    streak: { distPct: 0.45, intangible: [2, 5], cost: 10, chain: 3, strike: { dmg: 45 } },
    vanish: false, clones: false, mirror: false, barrier: false,
    quotes: QUOTES('Dino Thunder, Power Up! HA!', 'Back of the net!'), moves: RED_MOVES, commands: COMMANDS.dt_red, supers: {} },
  dt_blue: { team: 'Dino Thunder', color: DINO_GEM.dt_blue, smoke: '#1e5bff', blink: run('dt_blue'), weight: DINO_WEIGHT.dt_blue, airMul: 0.95,
    // DINO DASH: 35 % screen, 1-hit armor on frames 1–4 (dinothunder.js evades hook)
    streak: { distPct: 0.35, intangible: [99, 99], cost: 10, chain: 3, strike: { dmg: 48 } },
    vanish: false, clones: false, mirror: false, barrier: false,
    quotes: QUOTES('Dino Thunder, Power Up! HA!', 'Game over. High score.'), moves: BLUE_MOVES, commands: COMMANDS.dt_blue, supers: {} },
  dt_yellow: { team: 'Dino Thunder', color: DINO_GEM.dt_yellow, smoke: '#f6c600', blink: run('dt_yellow'), weight: DINO_WEIGHT.dt_yellow, airMul: 1.10,
    // DINO DASH: works in the air, 2 per airtime. PTERA GLIDE: hold jump, slow fall, 1.2 s per airtime
    streak: { distPct: 0.40, cost: 10, chain: 3, air: { perAirtime: 2, eightWay: true }, strike: { dmg: 42 } }, float: { frames: 72, fall: 1.8 },
    vanish: false, clones: false, mirror: false, barrier: false,
    quotes: QUOTES('Dino Thunder, Power Up! HA!', "That's a wrap."), moves: YELLOW_MOVES, commands: COMMANDS.dt_yellow, supers: {} },
  dt_white: { team: 'Dino Thunder', color: DINO_GEM.dt_white, smoke: '#b8b8c8', blink: run('dt_white'), weight: DINO_WEIGHT.dt_white, airMul: 1.05,
    // AFTERIMAGE DASH: runs THROUGH the foe (cross-up) with many afterimages; attacking during it = DRAGO CUT 50
    streak: { distPct: 0.45, cost: 10, chain: 3, strike: { dmg: 50, damageType: 'slash' } },
    vanish: false, clones: false, barrier: false,
    // DRAGO CLONE ↓↓+Teleport, 50 gem: the evil White Ranger clone 30 % away, ECHOES his attacks 12 f late for 6 s, 50 %,
    // cannot KO; struck → hits back once (50) and shatters. Trent stays where he is (fixedReal); no trading places.
    mirror: { cost: 50, frames: 360, gapPct: 0.30, mode: 'echo', echoDelay: 12, dmgPct: 0.5, meterPct: 0.5, maxSwaps: 0, fixedReal: true, ownDraw: true, counter: { kind: 'tornado', hits: 1, dmg: 50, every: 6, launch: -8 } },
    quotes: QUOTES('White Ranger, Dino Power!', 'The Drago Sword never misses.'), moves: WHITE_MOVES, commands: COMMANDS.dt_white, supers: {} },
}
const STATS = {}
for (const k of DINO_FORMS) STATS[k] = { maxHealth: 1248, maxEnergy: 100, attack: 84, defense: k === 'dt_blue' ? 80 : 76, speed: speedFor(k), jumpPower: 31, maxJumps: k === 'dt_yellow' ? 2 : 1,
  weight: DINO_WEIGHT[k], dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 }
const INFO = {
  dt_red: { name: 'Conner', displayName: 'Conner McKnight — Red Dino Ranger', hudName: 'Red Dino', archetype: 'Speed Rushdown', tagline: 'Tyranno power!',
    bio: 'Conner McKnight, Red Dino Ranger. The Reefside soccer star found the Tyranno Gem and with it super speed; he fights with the Tyranno Staff and a mean bicycle kick.', primary: 'rushdown', secondary: ['aerial'], archetypes: ['rushdown'], ultimate: { name: 'Raptor Rider Stampede', cost: 50 } },
  dt_blue: { name: 'Ethan', displayName: 'Ethan James — Blue Dino Ranger', hudName: 'Blue Dino', archetype: 'Armored Bruiser', tagline: 'Tricera power!',
    bio: 'Ethan James, Blue Dino Ranger. A computer whiz and gamer whose Tricera Gem makes his skin invulnerable; he hits with the Tricera Shield.', primary: 'grappler', secondary: ['rushdown'], archetypes: ['grappler'], ultimate: { name: 'Tricera Zord Ram', cost: 50 } },
  dt_yellow: { name: 'Kira', displayName: 'Kira Ford — Yellow Dino Ranger', hudName: 'Yellow Dino', archetype: 'Aerial Zoner', tagline: 'Ptera power!',
    bio: 'Kira Ford, Yellow Dino Ranger. A singer-songwriter whose Ptera Gem turns her voice into the Ptera Scream; she fights with the Ptera Grips.', primary: 'zoner', secondary: ['aerial'], archetypes: ['zoner', 'aerial'], ultimate: { name: 'Ptera Zord Strike', cost: 50 } },
  dt_white: { name: 'Trent', displayName: 'Trent Fernandez-Mercer — White Dino Ranger', hudName: 'White Dino', archetype: 'Mix-up Swordsman', tagline: 'Drago power!',
    bio: 'Trent Fernandez-Mercer, the White Dino Ranger. An artist once corrupted by the Drago Gem, he can turn invisible, run in a blur of afterimages and summon the evil White Ranger clone.', primary: 'setplay', secondary: ['rushdown'], archetypes: ['setplay', 'rushdown'], ultimate: { name: 'Drago Sword Storm', cost: 50 } },
}

const SCALE = 132 / 54 / 1.18   // the engine draws ×1.18 → the 54 px stand ≈ 132 px (S.P.D. Red's on-screen height)
const grab = { damage: 35, startup: 7, active: 3, recovery: 20, hitstun: 20, throwForceX: 8, throwForceY: -4, damageType: 'grab' }
export const DINO_PROFILES = {}
export const DINO_FORM_CHAR = {}
for (const k of DINO_FORMS) {
  const P = PROFILE[k]
  DINO_PROFILES[k] = registerNinjaProfile(k, P)
  const anims = buildAnims(k, P.moves, { ...STRIPS[k], ...POSES[k] }, OVER[k])
  const mv = P.moves, first = k === 'dt_white' ? mv.sw1 : mv.jab
  DINO_FORM_CHAR[k] = {
    rosterKey: k, hidden: true, universe: 'power_rangers', subUniverse: 'Dino Thunder', color: P.color, difficulty: 5,
    portrait: `./assets/${k}/portrait_large.png`, hudIcon: `./assets/${k}/portrait_small.png`,
    hasSprites: true, spriteScale: SCALE, spriteSheet: anims.idle.sheet, fatalityVictimArt: false, grabCastPose: 'grab',
    traits: { hasEnergy: true, energyType: 'ninja', energyName: 'Super', mobility: 'high', scaling: 'combo', animeMovement: false },
    movement: { crouchIdle: true }, introSequence: ['intro'],
    basic_attacks: { light: first, heavy: k === 'dt_red' ? mv.staffThrust : k === 'dt_white' ? mv.kick : mv.crescent, crouchLight: mv.low,
      upAttack: mv.staffArc || mv.upper || mv.upCrescent || mv.upKick, airAttack: mv.bicycle || mv.airPunch || mv.airKick || mv.airSlash, downAir: mv.bicycle || mv.airPunch || mv.airKick || mv.airSlash, grab },
    specials: {}, animationData: anims, stats: STATS[k], ...INFO[k],
  }
  DINO_PROFILES[k].stats = STATS[k]   // ninjaRoundReset restores these
}
export const { dt_red, dt_blue, dt_yellow, dt_white } = DINO_FORM_CHAR
export { RED_MOVES, BLUE_MOVES, YELLOW_MOVES, WHITE_MOVES, SUPERS as DINO_SUPERS_REG }
