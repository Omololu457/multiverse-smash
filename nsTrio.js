// nsTrio.js — NS TRIO: "Ninja Storm Trio" (ns_trio), ONE character with three swappable forms, built the same way as the
// MS_V1 Ranger Version (windrangers, nsDuo.js):
//   ns_blue  = TORI HANSON   — Blue Wind Ranger (water)
//   ns_navy  = BLAKE BRADLEY — Navy Thunder Ranger (thunder)
//   ns_green = CAM WATANABE  — Green Samurai Ranger (samurai)
// The forms are ninja.js profiles (the framework the MS_V1 Rangers run on). The fighter's live rosterKey is the ACTIVE form
// id, so every form-specific path (ninja profile, Ranger profile, sprites, HUD portrait, sounds, quotes) runs as-is.
// SWITCH (owner): P S S J / P S S K = hold CHARGE, ↓ ↓ (Ben's double-tap window), then LIGHT = next form, HEAVY = previous
// (Tori → Blake → Cam → Tori). State on f._duo (in the replay / LAN snapshot via ninjaSnapshot). No Math.random.
import { nsRoster, SHANE_MOVES, DUSTIN_MOVES, SHANE_COMMANDS, DUSTIN_COMMANDS, NS_BLINK } from './nsData.js'
import { shaneSuper, shaneUlt, dustinSuper, dustinUlt } from './nsSupers.js'
import { registerDuo, registerNinjaProfile, getNinjaProfile, nsStartMove, endMove, endMirror, burst, cue, spendNP, nsStrike, fresh, use, ctrX, overlaps,
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
  ben: { dbl: 16, arm: 18, cost: 15, lockout: 30 },
  swapFrames: 14, outEnd: 4, flipAt: 7, inStart: 10, invulnAt: 4, invulnFrames: 6,
  strike: { at: 10, dmg: 30, hitstun: 14, kb: 2, w: 84 },
  tag: { mul: 1.10, frames: 180 },
  cpu: { dwell: 150, near: 170, far: 0.42 },
}

// ── the three form profiles: phase 2 = the MS_V1 copies (Tori + Blake on Shane's kit, Cam on Dustin's) ─────────────────
const QUOTE_VS = { ns_red: { line: 'Shane! Try to keep up.' }, ns_yellow: { line: 'Dustin, dude, focus.' } }
const PROFILE = {
  ns_blue: { team: 'Wind Ninja Academy', color: '#2a78f0', smoke: '#1e64d2', blink: NS_BLINK, weight: 0.85, airMul: 1.10,
    streak: { air: { perAirtime: 2, eightWay: true } }, float: { frames: 72, fall: 2.2 },
    mirror: { mode: 'echo', echoDelay: 8, counter: { kind: 'tornado', hits: 3, dmg: 18, every: 6, launch: -15 } }, barrier: { kind: 'reflect', reflectMul: 1.2 },
    quotes: { intro: 'Ninja Storm, Ranger Form! Ha!', win: 'Water flows. You fall.', vs: QUOTE_VS },
    moves: SHANE_MOVES, commands: SHANE_COMMANDS, supers: { sSuper: shaneSuper, sUlt: shaneUlt } },
  ns_navy: { team: 'Thunder Ninja Academy', color: '#26347a', smoke: '#2a2e6a', blink: NS_BLINK, weight: 0.9, airMul: 1.05,
    streak: { air: { perAirtime: 2, eightWay: true } }, float: { frames: 72, fall: 2.2 },
    mirror: { mode: 'echo', echoDelay: 8, counter: { kind: 'tornado', hits: 3, dmg: 18, every: 6, launch: -15 } }, barrier: { kind: 'reflect', reflectMul: 1.2 },
    quotes: { intro: 'Thunder Storm, Ranger Form! Ha!', win: 'Thunder strikes twice.', vs: QUOTE_VS },
    moves: SHANE_MOVES, commands: SHANE_COMMANDS, supers: { sSuper: shaneSuper, sUlt: shaneUlt } },
  ns_green: { team: 'Wind Ninja Academy', color: '#22a84a', smoke: '#178a3a', blink: NS_BLINK, weight: 1.0, airMul: 0.90,
    streak: { air: null, underground: true }, burrow: { cost: 20, frames: 90, sink: 6, speed: 10.5 }, traps: { max: 2, life: 360, dmg: 45, radius: 26 }, rev: { every: 48, max: 3 },
    mirror: { mode: 'decoy', counter: { kind: 'eruption', dmg: 80, wall: true } }, barrier: { kind: 'armor', absorb: 2, armorFrames: 60, counter: { dmg: 70, radius: 130 } },
    quotes: { intro: 'Samurai Storm, Ranger Form! Ha!', win: 'Discipline wins. Every time.', vs: QUOTE_VS },
    moves: DUSTIN_MOVES, commands: DUSTIN_COMMANDS, supers: { sSuper: dustinSuper, sUlt: dustinUlt } },
}
const STATS = {
  ns_blue:  { maxHealth: 1200, maxEnergy: 100, attack: 82, defense: 74, speed: 88, jumpPower: 31, maxJumps: 3, weight: 0.85, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  ns_navy:  { maxHealth: 1200, maxEnergy: 100, attack: 84, defense: 76, speed: 88, jumpPower: 31, maxJumps: 3, weight: 0.9, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
  ns_green: { maxHealth: 1296, maxEnergy: 100, attack: 84, defense: 80, speed: 88, jumpPower: 31, maxJumps: 2, weight: 1.0, dashSpeed: 15.3, dashDuration: 10, dashCooldownMax: 28 },
}
const INFO = {
  ns_blue: { name: 'Tori', displayName: 'Tori Hanson — Blue Wind Ranger', hudName: 'Blue Wind', archetype: 'Water Ninja / Flow Rushdown', tagline: 'Go with the flow.',
    bio: 'Tori Hanson, Blue Wind Ranger and the Wind Ninja Academy\'s Water student. A surfer who keeps her head when the boys lose theirs, she bends water into waves, walls and the Sonic Fin\'s slicing arcs.',
    primary: 'rushdown', secondary: ['zoner'], archetypes: ['rushdown', 'zoner'], ultimate: { name: 'Hawk Mirage', cost: 100 } },
  ns_navy: { name: 'Blake', displayName: 'Blake Bradley — Navy Thunder Ranger', hudName: 'Navy Thunder', archetype: 'Thunder Ninja / Hit & Run', tagline: 'Strike like lightning.',
    bio: 'Blake Bradley, Navy Thunder Ranger of the Thunder Ninja Academy. Once Lothor\'s pawn alongside his brother Hunter, he turned his speed, the Navy Antler and the Thunder Staff against the space ninja.',
    primary: 'rushdown', secondary: ['aerial'], archetypes: ['rushdown', 'aerial'], ultimate: { name: 'Hawk Mirage', cost: 100 } },
  ns_green: { name: 'Cam', displayName: 'Cam Watanabe — Green Samurai Ranger', hudName: 'Green Samurai', archetype: 'Samurai / Technician', tagline: 'Honour. Discipline. Samurai.',
    bio: 'Cam Watanabe, son of Sensei and the Wind Ninja Academy\'s tech genius. With his mother\'s Samurai Amulet he became the Green Samurai Ranger: Samurai Saber, Super Samurai Mode and a cyber double.',
    primary: 'setplay', secondary: ['grappler'], archetypes: ['setplay', 'trap'], ultimate: { name: 'Fault Line', cost: 100 } },
}
export const TRIO_PROFILES = {}
export const FORM_CHAR = {}
for (const k of TRIO_FORMS) {
  TRIO_PROFILES[k] = registerNinjaProfile(k, PROFILE[k])
  FORM_CHAR[k] = nsRoster(k, { hidden: true, color: PROFILE[k].color, difficulty: 5, stats: STATS[k], ...INFO[k] }, PROFILE[k].moves, k === 'ns_green' ? { dive: 'throwAir' } : undefined)
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
  ultimate: { name: 'Hawk Mirage', cost: 100 },
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
    tag: null, strikes: 0, tagHits: 0, ults: 0, cpu: null, hudLabel: 'P+↓↓+J/K' }
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
  const d = f._duo; if (!d?.tag?.[d.form] || !md?.isSpecial) return
  a.nj.tag = TRIO.tag.mul; delete d.tag[d.form]; if (!Object.keys(d.tag).length) d.tag = null; d.tagHits++
}
function command(f, s, opp, raw) {
  const d = f._duo; if (!d) return false
  if (d.swap) return 'consumed'
  if ((d.armT > 0 || d.want > 0 || d.ate) && fresh(s, 'charge', 30)) use(s, 'charge')   // the held Charge never becomes a Charge move
  if (d.ate || d.want > 0 && (fresh(s, 'light') || fresh(s, 'heavy'))) { use(s, 'light', 'heavy'); return 'consumed' }   // the picking J / K never attacks
  return false
}
const fw = (recovery, kind, extra = {}) => ({ damage: 0, startup: 0, active: 1, recovery, hitstun: 0, blockstun: 0, knockbackX: 0, knockbackY: 0, rangeX: 1, rangeY: 1, frameExact: true, damageType: 'blunt', nj: { kind, noHit: true }, ...extra })
export const TRIO_MOVES = { nsSwap: fw(TRIO.swapFrames - 1, 'duoSwap') }
function alpha(f) {
  const d = f._duo; if (!d?.swap) return null
  const t = d.swap.t; return t >= TRIO.outEnd && t < TRIO.inStart ? 0 : null
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
  if (want !== d.form) { c.btn = next(d.form) === want ? 'light' : 'heavy'; c.seq = CPU_SEQ; c.last = d.t; d.cpuSwaps = (d.cpuSwaps || 0) + 1 }
  return input
}

registerDuoForms(TRIO_ID, FORM_CHAR, form => next(form))   // render helpers: smoke strips, the NEXT Ranger on the HUD / intro
registerDuo({
  id: TRIO_ID, roundReset, ensure, input, tick, command, onStart, alpha,
  moves: TRIO_MOVES, supers: {},
  run: (f, opp, s, a, t) => { if (a.nj.kind === 'duoSwap') runSwap(f, opp, s, a, t) },
  traps: f => (f?._duo ? getNinjaProfile('ns_green')?.traps : null),   // Cam's traps keep ticking after a switch
})
