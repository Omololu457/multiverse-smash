// Satoru Gojo — Shinjuku Arc (gojo_shinjuku) — SIMULATION state + combat.js hooks. Plain JSON on f._gs (snapshotted for
// the determinism hash, carried by replay / LAN through the inputs that produce it); sim ticks only: no RNG, no wall
// clock. Every export is a no-op for any other rosterKey. Engine functions arrive through registerGsEngine (set by
// gojoShinjuku.js) so this file imports no engine module (combat.js imports it for the hooks — no cycle).
//
// OWNED ENTITIES (deterministic lifecycle, capped): fields ≤ 3 (Lapse point / Maximum Output orb / Delayed Red),
// purples ≤ 1 (the imaginary mass), fx ≤ 24 (render hints). Nothing here touches the OLD Gojo (`gojo`).
import { GS_KEY, GS_MOVES, CE, CE_UNIT, INFINITY, COST, BARS, BAR, LAPSE, MAXBLUE, BLUESTEP, RED, DELAYED, PURPLE, CHANT,
  CHANT_FIRE, DOMAIN, FBE, RCT, BLACK_FLASH, THROW, RED_RUSH, PERFECT_OUTPUT_REFUND, SCREEN, NORMALS, BURNOUT_LOCKED, MOBILITY, CHARGE, QUOTES, dmg } from './gojoShinjukuData.js'
import { registerLimitlessProfile, ceInit, ceValue, ceHas, ceSpend, ceGain, ceTick, fieldAttract, fieldRepel, fieldErase,
  infinityShell, infinityRepel, isSuperProjectile, boxDist } from './limitless.js'

export const isGs = f => f?.rosterKey === GS_KEY
const PROFILE = registerLimitlessProfile(GS_KEY, { ceUnit: CE_UNIT, ce: CE, infinity: INFINITY })

let _W = null   // the world adapter of the current tick (module scope, never in GAME_STATE)
const E = { startMove: null, comboScale: null, activateDomain: null, activeDomains: null, clearDomains: null, cancelOpen: null }
export function registerGsEngine(o) { Object.assign(E, o) }

export const gsState = f => {
  if (f._gs) return f._gs
  const s = f._gs = { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, dirs: [], serial: 0, nEnt: 0,
    inf: { lv: 0, press: -1, startLv: 0 }, cd: { domain: 0, fbe: 0, rct: 0, tp: 0, blink: 0 }, charging: false, dt: null, blink: null, say: null, said: { intro: false, win: false }, burnout: 0, zone: 0, airSteps: 0, wasGround: true,
    dom: { mine: false, start: -1, oppSeen: {} }, clash: null, fields: [], purples: [], chant: null, bf: null, po: null,
    pins: {}, mahoraga: {}, pull: null, crumple: null, bounce: null, fbeT: 0, rct: null, grab: null, oppDomain: false,
    cpu: null, fx: [], cues: [], hud: { ceShown: 0 }, superWin: {}, eprev: {}, ucprev: {},
    stats: { stopped: 0, stoppedProj: 0, supersHalved: 0, supersWhiffed: 0, supersConnected: 0, crushed: 0, reflected: 0, erased: 0,
      bf: 0, po: 0, pins: 0, fbe: 0, rctHp: 0, brainReset: 0, domains: 0, burnouts: 0, clashes: 0, depleted: 0, chantHits: 0,
      purples: 0, purple200: 0, teleports: 0, blinks: 0, charged: 0, lastPurpleOutput: 0, lastPurpleRaw: 0, techLocked: 0, infOn: 0, forcedOff: {}, mahoragaBypass: 0, mirrorBypass: 0 } }
  ceInit(s, PROFILE)
  return s
}
const cue = (f, c, extra) => { const s = gsState(f); s.cues.push(extra ? { c, ...extra } : c); if (s.cues.length > 32) s.cues.shift() }
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.gs) ? f.currentAttack : null
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
function pushFx(s, kind, x, y, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), t: 0, ...(extra || {}) }); if (s.fx.length > 24) s.fx.shift() }
export function endGsAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }

export function clearGs(f) {
  if (!f) return
  if (live(f)) endGsAttack(f)
  delete f._gs; delete f._gsRemoteInput; delete f._gsHalf
}
// opponent-side marks this module writes on OTHER fighters (CPU knowledge, clash burnout); cleared on reset
export function clearGsMarks(f) { if (!f) return; delete f._gsSawInfinity; delete f._gsTechBurnout; delete f._gsHalf }

// ── public reads (HUD / harness / AI) ──
export const gsCe = f => isGs(f) ? ceValue(gsState(f), PROFILE) : 0
export const gsInfinityLevel = f => (isGs(f) && f._gs) ? f._gs.inf.lv : 0
export const gsInBurnout = f => !!(isGs(f) && f._gs && f._gs.burnout > 0)

// ── INFINITY rules ──
function oppDomainActive(f) { return !!E.activeDomains?.some(d => d && d.owner && d.owner !== f) }
function canInfinity(f, s) {
  if (s.burnout > 0) return 'burnout'
  if (s.ceLock > 0 || s.ce <= 0) return 'depleted'
  if (oppDomainActive(f)) return 'domain'
  if (s.clash) return 'clash'
  return null
}
function setInfinity(f, s, lv, why = null) {
  if (lv === s.inf.lv) return
  if (lv > 0 && s.inf.lv === 0) s.stats.infOn++
  if (lv === 0 && why) s.stats.forcedOff[why] = (s.stats.forcedOff[why] || 0) + 1
  s.inf.lv = lv
}
// a stopped hit's extra CE tax (fraction of the hit's damage at the current level)
function tax(f, s, rawHit) {
  const lv = INFINITY.levels[s.inf.lv]; if (!lv) return
  s.ce = Math.max(0, s.ce - Math.round(rawHit * lv.tax * CE_UNIT))
  s.stats.stopped++
}
// canon bypasses: Mahoraga after 3 wheel turns; Limitless vs Limitless (this Gojo / the old Gojo) for Blue, Red, Purple.
// Blue / Red / Purple of either Gojo (the old Gojo's projectiles "blue" / "red" / "hollowPurple"; this Gojo's technique strikes)
const LIMITLESS_TECH = /^(blue|red|hollowPurple|gs_(blue|red|delayed_red|purple|purple200|gBlueFist|gRedRush))$/
function bypass(defender, s, attacker, techniqueName) {
  if (!attacker) return false
  if (attacker._mahoragaActive && (s.mahoraga[attacker.side] || 0) >= INFINITY.mahoragaTurns) { s.stats.mahoragaBypass++; return true }
  const k = attacker.rosterKey
  if ((k === GS_KEY || k === 'gojo') && techniqueName && LIMITLESS_TECH.test(techniqueName)) { s.stats.mirrorBypass++; return true }
  if (k === 'sukuna_shinjuku' && ((attacker._sksAmp || 0) > 0 || techniqueName === 'sks_world_slash')) { s.stats.sukunaBypass = (s.stats.sukunaBypass || 0) + 1; return true }   // MSV1-SUKUNA: Domain Amplification / World-Cutting Slash (canon)
  return false
}
function wheel(s, attacker) {
  if (attacker?._mahoragaActive) { s.mahoraga[attacker.side] = (s.mahoraga[attacker.side] || 0) + 1; attacker._mahoragaWheel = (attacker._mahoragaWheel || 0) + 30 }
}
const isSuperAttack = a => !!(a && (a.isUltimate || a.super || a.category === 'ultimate'))
// a foe is "in a super" while its attack is an ultimate, the generic ultimate flag is up, or for 5 s after it spent
// ≥ 90 meter in one frame (every super / cinematic in the roster spends at least one bar) — sim state only.
const SUPER_WINDOW = 300
// A cinematic ultimate can freeze the sim (his tick included) on the very frame it is cast and land its hit inside the
// freeze, so the gates also read the cast signals LIVE against the last values his tick recorded: ≥ 90 meter gone, or
// the recast lockout armed (abilities.triggerUltimate).
const castNow = (s, o) => (s.eprev[o.side] != null && s.eprev[o.side] - (o.energy || 0) >= 90) || (s.ucprev[o.side] != null && (o.ultimateCooldown || 0) > s.ucprev[o.side] + 1)
function inSuper(s, o) {
  if (!o) return false
  return isSuperAttack(o.currentAttack) || !!o.isUltimateActive || (s.superWin[o.side] || 0) > s.clock || castNow(s, o)
}
function anyFoeInSuper(s) {
  for (const k in s.superWin) if (s.superWin[k] > s.clock) return true
  for (const o of (_W?.fighters?.() || [])) if (o && o.side in s.eprev && castNow(s, o)) return true
  return false
}

// ── combat.js hooks (defender side) ───────────────────────────────────────────────────────────────────────────────
// MELEE: returns true when the strike must whiff (combat consumes it). Order: Falling Blossom counter → Infinity.
export function gsMeleeGate(defender, attacker) {
  if (!isGs(defender) || !attacker) return false
  const s = gsState(defender), a = attacker.currentAttack
  if (s.blink?.inv) return true                                            // the long blink's travel frames are invulnerable
  if (s.fbeT > 0 && a) { fbeCounter(defender, s, attacker); return true }
  if (s.inf.lv === 0 || !a) return false
  if (bypass(defender, s, attacker, a.gs ? 'gs_' + (a.gs.key || '') : null)) return false
  attacker._gsSawInfinity = s.clock          // the CPU (or anyone) learns only from a stopped attack
  if (inSuper(s, attacker)) {
    const sup = INFINITY.levels[s.inf.lv].supers
    if (sup === 'connect') { s.stats.supersConnected++; return false }
    if (sup === 'half') { defender._gsHalf = 2; s.stats.supersHalved++; return false }
    s.stats.supersWhiffed++; tax(defender, s, (a.damage || 0) * 0.6); cue(defender, 'stop'); return true
  }
  tax(defender, s, (a.damage || 0) * 0.6); wheel(s, attacker); cue(defender, 'stop')
  return true
}
// GRAB (engine throw / any command grab): Infinity cannot be thrown.
export function gsGrabGate(defender, attacker) {
  if (!isGs(defender)) return false
  const s = gsState(defender)
  if (s.blink?.inv) return true
  if (s.inf.lv === 0 || bypass(defender, s, attacker, null)) return false
  if (attacker) attacker._gsSawInfinity = s.clock
  tax(defender, s, 30); cue(defender, 'stop')
  return true
}
// PROJECTILE contact: 'remove' (negated, consumed) | null (normal hit path). L1/L2 supers pass (L2 halved).
export function gsProjectileGate(defender, proj) {
  if (!isGs(defender) || !proj) return null
  const s = gsState(defender)
  if (s.blink?.inv) return null                                            // passes through (combat.js skips him while blink.inv)
  if (s.fbeT > 0) { s.stats.fbe++; cue(defender, 'fbe'); return 'remove' }
  if (s.inf.lv === 0) return null
  if (bypass(defender, s, proj.owner, proj.name)) return null
  if (proj.owner) proj.owner._gsSawInfinity = s.clock
  if (isSuperProjectile(proj) || inSuper(s, proj.owner)) {
    const sup = INFINITY.levels[s.inf.lv].supers
    if (sup === 'connect') { s.stats.supersConnected++; return null }
    if (sup === 'half') { defender._gsHalf = 2; s.stats.supersHalved++; return null }
    s.stats.supersWhiffed++
  }
  tax(defender, s, (proj.damage || 30) * 0.6); s.stats.stoppedProj++; wheel(s, proj.owner)
  return 'remove'
}
// DAMAGE choke-point (combat.applyScaledDamage): anything that reaches him outside the melee / projectile paths
// (cinematic supers, domain ticks, patches, beams, scripted strikes). Returns the raw damage to apply.
export function gsDamageMods(target, raw, opts = {}) {
  if (!isGs(target) || !(raw > 0)) return raw
  const s = gsState(target)
  if (target._gsHalf > 0) { target._gsHalf = 0; return raw * 0.5 }   // an L2-adjudicated super (melee / projectile)
  if (s.inf.lv === 0) return raw
  const src = opts.source || ''
  if (src === 'melee' || src === 'projectile' || src === 'block-chip' || src === 'grab-pull' || src === 'grab-throw') return raw   // already adjudicated upstream
  if (opts.gsOwn) return raw
  const atk = opts.attacker || opts.boostFrom || null
  if (bypass(target, s, atk, opts.move === 'ultimate' ? null : opts.move)) return raw
  const sup = /ultimate|domain/.test(src) || opts.move === 'ultimate' || (atk ? inSuper(s, atk) : anyFoeInSuper(s))
  if (sup) {
    const rule = INFINITY.levels[s.inf.lv].supers
    if (rule === 'connect') { s.stats.supersConnected++; return raw }
    if (rule === 'half') { s.stats.supersHalved++; return raw * 0.5 }
    s.stats.supersWhiffed++
  }
  tax(target, s, raw * 0.6)
  return 0
}
// L2: a connecting super cannot launch or knock him down (called from the tick right after the hit lands)
function noLaunch(f, s) {
  if (s.inf.lv !== 2 || !(f.hitstun > 0)) return
  if ((f.vy || 0) < 0) f.vy = 0
  f.knockdownState = false; f.knockdownTimer = 0; f.launched = false
}

// ── combat.js hooks (attacker side: his normals / Blue Fist / Red Rush are engine melee moves) ──
export function gsHitbox(f) {
  const a = f.currentAttack, m = a?.gs, md = GS_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 18), w: a.rangeX, h: a.rangeY }
}
export function gsBlock(f, d, a) {
  if (!isGs(f) || !a?.gs) return
  const md = GS_MOVES[a.gs.key]
  d.blockstun = md.blockstun; a.gs.contact = true; a.gs.contactTick = gsState(f).tick
}
export function gsHit(f, d, a) {
  if (!isGs(f) || !a?.gs) return
  const s = gsState(f), m = a.gs, md = GS_MOVES[m.key]
  m.contact = true; m.contactTick = s.tick
  if (d.isBlocking) return
  m.clean = true; f._cmdHitLanded = true
  ceGain(s, PROFILE, CE.onHit)
  if (BLACK_FLASH.moves.includes(m.key)) s.bf = { tick: s.tick, key: m.key, side: d.side, raw: md.raw }
  if (m.key === 'gBlueFist') s.pull = { side: d.side, t: 0 }
  if (m.key === 'gRedRush') s.crumple = { side: d.side, t: 0, dir: m.dir }
}

// ── STRIKE: the one hit path for his technique volumes (Blue core, Max Blue grind, Red, Delayed Red, Purple, throw,
//    Falling Blossom). Shared guard rules: facing block → chip + blockstun; invulnerable / banished targets are missed.
function strike(f, t, P, W) {
  if (!t || !(t.health > 0) || (t.invulnTimer || 0) > 0 || t._banished || t._cubeTrapUntouchable) return 'miss'
  const s = gsState(f), dir = P.dir ?? (ctrX(t) >= ctrX(f) ? 1 : -1)
  const facingSrc = (t.facing || 1) === -dir
  if (isGs(t) && t._gs?.fbeT > 0 && !P.noCounter) { fbeCounter(t, t._gs, f); return 'countered' }
  if (t.isBlocking && facingSrc && !P.unblockable) {
    const chip = Math.max(1, Math.round(P.raw * (P.chip ?? 0.12)))
    W.damage(t, dmg(chip), { source: 'gs-chip', attacker: f, move: P.move || 'gs_technique', gsOwn: true })
    t.blockstun = Math.max(t.blockstun || 0, P.blockstun || 14)
    if (P.guardBreak) { t.isBlocking = false; t.blockstun = 0; t.hitstun = Math.max(t.hitstun || 0, 42); t._guardBroken = 42 }
    cue(f, 'blocked'); pushFx(s, 'block', ctrX(t), ctrY(t))
    return 'block'
  }
  const scale = E.comboScale ? E.comboScale(f) : 1
  W.damage(t, dmg(P.raw) * scale, { source: 'gs-technique', attacker: f, move: P.move || 'gs_technique', damageType: 'energy', gsOwn: true })
  t.hitstun = Math.max(t.hitstun || 0, P.hitstun || 16)
  t.isBlocking = false
  if (P.kbx != null) t.vx = dir * P.kbx
  if (P.kby != null && P.kby !== 0) t.vy = P.kby
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 6
  f.energy = Math.min(f.maxEnergy || 300, (f.energy || 0) + Math.round(P.raw * 0.1))
  if (P.hitstop) { f.hitstop = Math.max(f.hitstop || 0, P.hitstop); t.hitstop = Math.max(t.hitstop || 0, P.hitstop) }
  ceGain(s, PROFILE, CE.onHit)
  pushFx(s, P.fx || 'spark', ctrX(t), ctrY(t))
  return 'hit'
}
function fbeCounter(g, s, attacker) {
  s.fbeT = 0; s.stats.fbe++
  if (attacker?.currentAttack) attacker.currentAttack.hasHit = true
  if (attacker && attacker !== g && attacker.health > 0) {
    const W = _W
    if (W) strike(g, attacker, { raw: FBE.raw, hitstun: FBE.hitstun, kbx: FBE.kbx, kby: FBE.kby, unblockable: true, noCounter: true, move: 'gs_fbe', fx: 'fbe' }, W)
  }
  cue(g, 'fbe'); pushFx(s, 'fbe', ctrX(g), ctrY(g))
}

// ── input edges + facing-relative motion buffer (numpad digits; 5 = neutral) ──
const numpad = (raw, facing) => {
  const fw = facing === -1 ? raw.left : raw.right, bk = facing === -1 ? raw.right : raw.left
  const h = fw && !bk ? 1 : bk && !fw ? -1 : 0, v = raw.down && !raw.up ? -1 : raw.up && !raw.down ? 1 : 0
  return 5 + h + v * 3                                                    // 8 = up, 2 = down, 6 = forward, 3 = down-forward
}
function readEdges(f, s, raw) {
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'charge', 'grab', 'left', 'right', 'down']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    if (!v && s.prev[k]) s.edges[k + 'Up'] = { tick: s.tick }
    s.prev[k] = v
  }
  const d = numpad(raw, f.facing || 1)
  if (!s.dirs.length || s.dirs[s.dirs.length - 1].d !== d) { s.dirs.push({ d, t: s.tick }); if (s.dirs.length > 16) s.dirs.shift() }
}
// motion: the digits appear in order within `win` ticks of now, the last one at most `tail` ticks ago (or still held)
function motion(s, seq, win = 20, tail = 8) {
  let i = seq.length - 1
  for (let j = s.dirs.length - 1; j >= 0 && i >= 0; j--) {
    const e = s.dirs[j]
    if (s.tick - e.t > win) break
    if (e.d === seq[i]) { if (i === seq.length - 1) { const next = s.dirs[j + 1]; if (next && s.tick - next.t > tail) return false } i-- }
  }
  return i < 0
}
export const fresh = (s, k, win = 8) => !!(s.edges[k] && s.used[k] !== s.edges[k].tick && s.tick - s.edges[k].tick <= win)
export const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
export const MOTIONS = {
  dqcf: s => motion(s, [2, 3, 6, 2, 3, 6], 40),
  qcf: s => motion(s, [2, 3, 6], 20),
  qcb: s => motion(s, [2, 1, 4], 20),
  downBack: s => motion(s, [2, 4], 16) || motion(s, [1, 4], 16),
  downDown: s => { let n = 0, seen5 = false; for (let j = s.dirs.length - 1; j >= 0; j--) { const e = s.dirs[j]; if (s.tick - e.t > 24) break; if (e.d === 2 || e.d === 1 || e.d === 3) { if (seen5 || n === 0) n++; seen5 = false } else if (e.d === 5) seen5 = true } return n >= 2 },
}

// ── START A MOVE (combat.startMove frameExact path + the `gs` descriptor). Every check happens before anything is spent.
export function startGsMove(f, key, W, o = {}) {
  if (!isGs(f)) return false
  const s = gsState(f), md = GS_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || s.clash) return false
  if (BURNOUT_LOCKED.has(key) && s.burnout > 0 && key !== 'gDomain') { s.stats.techLocked++; cue(f, 'reject'); return false }
  if ((md.blue || md.red || md.purple) && s.ceLock > 0) { s.stats.techLocked++; cue(f, 'reject'); return false }
  if (md.air && g) return false
  if (!md.air && !md.airOk && !g && key !== 'gBlueStep') return false
  if (key === 'gBlueStep' && !g && s.airSteps >= BLUESTEP.airUses) { cue(f, 'reject'); return false }
  if (key === 'gDomain' && (s.cd.domain > 0 || s.burnout > 0 || s.dom.mine)) { cue(f, 'reject'); return false }
  if (key === 'gFBE' && s.cd.fbe > 0) { cue(f, 'reject'); return false }
  if (key === 'gRCT' && s.cd.rct > 0 && !(s.burnout > 0)) { cue(f, 'reject'); return false }
  const cost = md.cost || 0, bars = (md.bars || 0) * BAR
  if (cost && !ceHas(s, PROFILE, cost)) { cue(f, 'reject'); return false }
  if (bars && (f.energy || 0) < bars && !f.infiniteEnergy) { cue(f, 'reject'); return false }
  if (o.cancel) endGsAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) ceSpend(s, PROFILE, cost)
  // bars: Purple pays now; 200 % pays when it fires (a cancelled chant keeps its bars); the domain pays at activation
  if (bars && key === 'gPurple' && !f.infiniteEnergy) f.energy -= bars
  if (o.po && cost) { ceGain(s, PROFILE, cost * PERFECT_OUTPUT_REFUND); s.stats.po++; cue(f, 'glint'); pushFx(s, 'glint', ctrX(f) + (f.facing || 1) * 4, f.y + 10) }
  f.currentMove = key
  const a = f.currentAttack
  a.gs = { key, dir: o.dir ?? (f.facing || 1), serial: ++s.serial, released: false, contact: false, clean: false, vec: o.vec || null, held: 0 }
  a.hasHit = !!md.noBody
  if (md.isUltimate) a.isUltimate = true
  if (md.super) a.super = true
  f.isBlocking = false; f.isCharging = false
  if (g && !md.air && key !== 'gBlueStep') f.vx = 0
  if (key === 'gC') f.jumpHeld = true
  if (key === 'gBlueStep' && !g) s.airSteps++
  if (key === 'gPurple200') { s.chant = { t: 0, judged: [null, null, null], ok: 0 }; s.stats.purple200++ }
  if (key === 'gFBE') s.cd.fbe = FBE.cd
  cue(f, key)
  return true
}

// ── PER-FRAME TICK (1v1 + FFA combat steps, before the command layer) ──
export function tickGs(f, opp, raw, W) {
  if (!isGs(f)) { if (f?._gs) clearGs(f); return }
  const s = gsState(f); _W = W
  s.tick++
  readEdges(f, s, raw || {})
  presentTick(f, s, opp, W)
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 60) s.fx.splice(i, 1)
  if (f.health <= 0) { setInfinity(f, s, 0, 'ko'); s.fields.length = 0; s.chant = null; return }
  const g = grounded(f)
  if (g) s.airSteps = 0
  for (const o of foesOf(f, W, opp)) {                          // super detection (meter spent in one frame)
    const e = o.energy || 0, p = s.eprev[o.side]
    if (p != null && p - e >= 90) s.superWin[o.side] = s.clock + SUPER_WINDOW
    s.eprev[o.side] = e
    const uc = o.ultimateCooldown || 0, up = s.ucprev[o.side]                // abilities.triggerUltimate arms the recast lockout on a cast
    if (up != null && uc > up + 1) s.superWin[o.side] = s.clock + SUPER_WINDOW
    s.ucprev[o.side] = uc
    if (o._gsTechBurnout > 0 && !isGs(o) && (W?.fighters?.() || [f]).find(isGs) === f) o._gsTechBurnout--   // a non-Gojo clash loser's 5 s technique lockout (counted by the first Gojo only)
  }
  // ── domain bookkeeping (mine / theirs / clash) — runs even during hitstop ──
  domainTick(f, s, opp, W)
  if (s.bf && f.health > 0 && !f.hitstun) gsBlackFlash(f, W, opp)          // Black Flash window is judged here (hitstop freezes the command layer)
  if (f.hitstop > 0) return
  s.clock++
  if (s.cd.domain > 0) s.cd.domain--
  if (s.cd.fbe > 0) s.cd.fbe--
  if (s.cd.rct > 0) s.cd.rct--
  if (s.zone > 0) s.zone--
  if (s.fbeT > 0) s.fbeT--
  const wasBurn = s.burnout > 0
  if (s.burnout > 0 && --s.burnout === 0) cue(f, 'burnoutEnd')
  // ── INFINITY input: tap toggles, hold climbs 1 → 2 → 3 (sim-clock frames); never in hitstun / blockstun ──
  chargeMotions(f, s, raw || {}, W)
  infinityInput(f, s, raw || {})
  mobilityTick(f, s, raw || {}, opp, W)
  const why = s.inf.lv > 0 ? canInfinity(f, s) : null
  if (why) { setInfinity(f, s, 0, why); s.inf.press = -1 }
  // ── CE: drains smoothly while Infinity is on, regenerates while it is off and he is not casting ──
  const a = live(f)
  const casting = !!(a && GS_MOVES[a.gs.key]?.cost && !NORMALS.includes(a.gs.key)) || !!s.rct
  const r = ceTick(s, PROFILE, { infinity: s.inf.lv, casting, zone: s.zone > 0, frozen: !!s.clash })
  if (r === 'depleted') { setInfinity(f, s, 0, 'depleted'); s.stats.depleted++; cue(f, 'depleted') }
  if (s.charging && f.isCharging) ceGain(s, PROFILE, CHARGE.ceRate / 60)      // holding P: the charge also refills CE
  // ── Infinity field: Zeno shell on projectiles, the L2/L3 repel ring, command-grab catch, super no-launch (L2) ──
  if (s.inf.lv > 0) {
    const lvP = INFINITY.levels[s.inf.lv]
    const reached = infinityShell(f, lvP, W, { hangFrames: INFINITY.hangFrames, bypass: p => bypass(f, s, p.owner, p.name) || (lvP.supers !== 'stop' && !!p.owner && inSuper(s, p.owner)) })   // a super's own unflagged shots (Arrowstorm waves) are adjudicated as the super
    for (const p of reached) { tax(f, s, (p.damage || 30) * 0.6); s.stats.stoppedProj++; if (p.owner) p.owner._gsSawInfinity = s.clock; wheel(s, p.owner) }
    const pushed = infinityRepel(f, lvP, W, o => o.rosterKey === 'sukuna_shinjuku' && (o._sksAmp || 0) > 0)   // MSV1-SUKUNA: Domain Amplification is not repelled
    for (const o of pushed) if (o.attacking && o.currentAttack) o._gsSawInfinity = s.clock
    if (f.isGrabbed && !s.grabbedBy) { f.isGrabbed = false; f.grabTimer = 0; f.hitstun = 0; tax(f, s, 30); cue(f, 'stop') }   // any command grab: released at once
    noLaunch(f, s)
    pinTick(f, s, opp, W)
  }
  // ── cpu ──
  if (s.cpu && s.clock - s.cpu.seen < 3) { cpuInfinity(f, s, opp, W); cpuTech(f, s, opp, W) }
  // ── interruption: a hit / grab ends his live move (the chant is cancelled; its CE is lost, bars kept) ──
  const domCast = !!(a && a.gs.key === 'gDomain' && (f.domainFrozen || s.oppDomain) && !f.isGrabbed && f.health > 0)   // a domain cast already started survives the other domain's lock (freeze / sure-hit) → it expands into it: clash
  if (a && !domCast && (f.hitstun > 0 || f.isGrabbed)) { if (a.gs.key === 'gPurple200' && s.chant) { cue(f, 'chantBroken'); s.chant = null } ; if (a.gs.key === 'gRCT') finishRct(f, s); endGsAttack(f) }
  // ── opponent-side effects of his normals (Blue Fist pull, Red Rush crumple, Red wall bounce) ──
  followups(f, s, W, opp)
  // ── fields (Lapse point, Maximum Output orb, Delayed Red) + the imaginary mass ──
  fieldsTick(f, s, W, opp, raw || {})
  purpleTick(f, s, W)
  // ── Black Flash window bookkeeping ──
  if (s.bf && s.tick - s.bf.tick > (s.zone > 0 ? BLACK_FLASH.zoneWindow : BLACK_FLASH.window) + 1) s.bf = null
  // ── the live move ──
  const A = live(f)
  if (!A || ((f.hitstun > 0 || f.isGrabbed) && !(domCast && A === a))) { s.hud.wasBurn = wasBurn; return }
  moveTick(f, s, A, W, opp, raw || {})
}

// ↓↓ + Charge = RCT (hold), ↓↙← + Charge = Falling Blossom Emotion: a buffered motion at the press owns the press
function chargeMotions(f, s, raw, W) {
  const e = s.edges.charge
  if (!e || e.tick !== s.tick || s.used.charge === e.tick) return
  if (f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || !grounded(f)) return
  const a = live(f)
  if (a && !NORMALS.includes(a.gs.key)) return
  const k = MOTIONS.qcb(s) ? 'gFBE' : MOTIONS.downDown(s) ? 'gRCT' : null
  if (!k) return
  s.used.charge = e.tick
  startGsMove(f, k, W, { cancel: !!a })
}
function infinityInput(f, s, raw) {
  // P (user request after phase 3): a TAP (released inside tapFrames) steps Infinity off → 1 → 2 → 3 → off; HOLDING past
  // tapFrames is the shared hold-to-charge (gsOwnsCharge lets the engine charge: meter, the "charge" pose) and adds CE.
  // A press that completes ↓↓ / ↓↙← belongs to RCT / Falling Blossom (chargeMotions marks it used first).
  const stunned = f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || f.health <= 0
  const e = s.edges.charge
  if (e && e.tick === s.tick && s.used.charge !== e.tick && !stunned) s.inf.press = s.tick
  if (s.inf.press < 0) { s.charging = false; return }
  if (stunned || s.clash || s.rct) { s.inf.press = -1; s.charging = false; return }
  const held = s.tick - s.inf.press
  if (raw.charge) {
    if (held >= INFINITY.tapFrames && !live(f)) { if (!s.charging) s.stats.charged++; s.charging = true }
    else if (live(f)) s.charging = false
    return
  }
  if (held < INFINITY.tapFrames && !s.charging) {
    const next = s.inf.lv >= 3 ? 0 : s.inf.lv + 1
    if (next === 0 || s.inf.lv > 0 || !canInfinity(f, s)) setInfinity(f, s, next)
  }
  s.inf.press = -1; s.charging = false
}
// ── PRESENTATION: intro line on his first tick of a round (a `vs` line for that opponent), a win line once every
// foe is down. Plain JSON state; the bubble / voice are drawn / played by gojoShinjukuFx.js from s.say and the cues.
function presentTick(f, s, opp, W) {
  if (s.say && --s.say.t <= 0) s.say = null
  const foes = (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f)
  if (!s.said.intro) {
    s.said.intro = true
    const vsKey = foes.map(o => (o.rosterKey || '').toLowerCase()).find(k => QUOTES.vs[k])
    const pick = QUOTES.intro[(foes.length + (f.side === 'p2' ? 1 : 0)) % QUOTES.intro.length]
    s.say = { text: vsKey ? QUOTES.vs[vsKey] : pick, t: 170, kind: 'intro' }
    cue(f, 'introVoice', { vs: vsKey || null })
  }
  if (!s.said.win && f.health > 0 && foes.length && foes.every(o => !(o.health > 0))) {
    s.said.win = true
    s.say = { text: QUOTES.win[s.stats.purples > 0 ? 2 : (s.stats.domains > 0 ? 1 : 0)], t: 200, kind: 'win' }
    cue(f, 'winVoice')
  }
}
// ── MOBILITY: double-tap ←← / →→ on the sim clock (keyboard, pad, replay and LAN feed readRawControls) ──
// toward the foe = the old Gojo's teleport (lands beside them, faces them); away = a long Ranger-style blink.
function mobilityTick(f, s, raw, opp, W) {
  if (s.cd.tp > 0) s.cd.tp--
  if (s.cd.blink > 0) s.cd.blink--
  const b = s.blink
  if (b) {
    b.t++
    const P = MOBILITY.blink
    if (f.hitstun > 0 || f.isGrabbed) { s.blink = null; return }
    if (b.t > P.startup && b.t <= P.startup + P.travel) {
      const k = (b.t - P.startup) / P.travel
      f.x = Math.round(b.x0 + (b.x1 - b.x0) * k); f.vx = 0; f.vy = 0; b.inv = true
      f._spriteCastMove = 'dash'; f._spriteCastTimer = Math.max(f._spriteCastTimer || 0, 4)
      if (b.t % 2 === 0) pushFx(s, 'ghost', f.x, f.y, { dir: b.dir })
    } else b.inv = false
    if (b.t >= P.startup + P.travel + P.recovery) s.blink = null
    return
  }
  const L = !!raw.left, R = !!raw.right, dir = L === R ? 0 : (L ? -1 : 1)
  if (raw.down || raw.up) { s.dt = null; return }                       // ↓↘→ / ↓↘→↓↘→ / Up+→ (Blue Step) are not double-taps
  const edge = dir !== 0 && (dir === -1 ? s.edges.left : s.edges.right)?.tick === s.tick
  if (dir === 0 && s.dt) s.dt.released = true
  if (!edge) return
  if (!(s.dt && s.dt.dir === dir && s.dt.released && s.tick - s.dt.at <= MOBILITY.window)) { s.dt = { dir, at: s.tick, released: false }; return }
  s.dt = null
  const foe = foesOf(f, W, opp).sort((a, c) => Math.abs(ctrX(a) - ctrX(f)) - Math.abs(ctrX(c) - ctrX(f)))[0]
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || s.clash || s.charging || f.isBlocking || raw.block) return
  if (live(f) || (f.attackCooldown || 0) > 0) return
  const toward = foe ? Math.sign(ctrX(foe) - ctrX(f)) === dir : false
  if (toward) {
    if (s.cd.tp > 0) return
    teleportIn(f, s, foe, W)
    return
  }
  if (s.cd.blink > 0) return
  startBlink(f, s, dir, W)
}
// game.js teleportBehindTarget, the old Gojo's blink: beside the foe on the near side, at their height, facing them
function teleportIn(f, s, foe, W) {
  f.x = f.x < foe.x ? foe.x - f.w - MOBILITY.tpGap : foe.x + foe.w + MOBILITY.tpGap
  f.x = Math.max(0, Math.min(sw(W) - f.w, f.x)); f.y = foe.y; f.vx = 0; f.vy = 0
  f.facing = ctrX(foe) >= ctrX(f) ? 1 : -1
  f.teleportFlash = 12; f.attackCooldown = Math.max(f.attackCooldown || 0, MOBILITY.tpLock)
  f._spriteCastMove = 'dash'; f._spriteCastTimer = 14
  s.cd.tp = MOBILITY.tpCooldown; s.stats.teleports++; cue(f, 'teleport')
}
function startBlink(f, s, dir, W) {
  const x1 = Math.max(0, Math.min(sw(W) - f.w, Math.round(f.x + dir * MOBILITY.blink.dist * SCREEN)))
  if (Math.abs(x1 - f.x) < 8) return false
  s.blink = { t: 0, dir, x0: Math.round(f.x), x1, inv: false }
  s.cd.blink = MOBILITY.blink.cooldown; s.stats.blinks++; cue(f, 'blink')
  return true
}
// Infinity + Blue: an opponent pulled by Blue into the boundary is pinned there 0.6 s (once per opponent per 3 s)
function pinTick(f, s, opp, W) {
  for (const o of foesOf(f, W, opp)) {
    const p = s.pins[o.side]
    if (p && p.until > s.clock) { o.hitstun = Math.max(o.hitstun || 0, 2); o.vx = 0; o.x = p.x; if (!grounded(o)) o.vy = 0; continue }
    if (!o._gsBluePulled || o._gsBluePulled < s.clock - 1) continue
    if (p && s.clock - p.at < INFINITY.pinLockout) continue
    const gap = o.x > f.x ? o.x - (f.x + f.w) : f.x - (o.x + o.w)
    if (gap <= INFINITY.levels[s.inf.lv].boundary + 6) { s.pins[o.side] = { at: s.clock, until: s.clock + INFINITY.pinFrames, x: Math.round(o.x) }; s.stats.pins++; cue(f, 'pin') }
  }
}
function followups(f, s, W, opp) {
  const bySide = side => foesOf(f, W, opp).find(o => o.side === side)
  if (s.pull) {                                                            // Blue Fist: pull keeps them close for a follow-up
    const t = bySide(s.pull.side)
    if (!t || ++s.pull.t > 10) s.pull = null
    else { const want = f.facing === 1 ? f.x + f.w + 22 : f.x - 22 - t.w; t.x = Math.round(t.x + (want - t.x) * 0.35); t.vx = 0 }
  }
  if (s.crumple) {                                                         // Red Rush: crumple, then launch
    const t = bySide(s.crumple.side), c = s.crumple
    if (!t) s.crumple = null
    else if (++c.t < RED_RUSH.crumple) { t.vx = 0; t.hitstun = Math.max(t.hitstun || 0, 6) }
    else { t.vy = RED_RUSH.launchVy; t.vx = c.dir * 4; t.hitstun = Math.max(t.hitstun || 0, 30); s.crumple = null; cue(f, 'redBurst'); pushFx(s, 'red', ctrX(t), ctrY(t)) }
  }
  if (s.bounce) {                                                          // Reversal Red: one wall bounce
    const t = bySide(s.bounce.side), b = s.bounce
    if (!t || ++b.t > 50) s.bounce = null
    else if (t.x <= 1 || t.x + t.w >= sw(W) - 1) { t.vx = -(t.vx || 0) * 0.55 || (t.x <= 1 ? 6 : -6); t.vy = -9; t.hitstun = Math.max(t.hitstun || 0, 24); s.bounce = null; cue(f, 'wallBounce'); pushFx(s, 'bounce', ctrX(t), ctrY(t)) }
  }
}

// ── technique entities ──
function addField(s, F) { s.fields.push(F); if (s.fields.length > 3) s.fields.shift() }
function fieldsTick(f, s, W, opp, raw) {
  for (let i = s.fields.length - 1; i >= 0; i--) {
    const F = s.fields[i]; F.t++
    if (F.kind === 'lapse' || F.kind === 'max') {
      if (F.kind === 'max') { const nx = F.x + F.dir * MAXBLUE.drift; F.x = Math.round(Math.max(30, Math.min(sw(W) - 30, nx)) * 10) / 10 }
      const out = fieldAttract(f, { x: F.x, y: F.y, r: F.r, core: F.core, pull: F.pull, pullCore: F.pullCore }, W)
      s.stats.crushed += out.crushed
      for (const o of foesOf(f, W, opp)) {
        const d = Math.hypot(ctrX(o) - F.x, ctrY(o) - F.y)
        if (d <= F.r) { o._gsBluePulled = s.clock; sightReveal(o) }
      }
      for (const o of out.inCore) {
        if (F.kind === 'max') { o.x = Math.round(F.x - o.w / 2); o.vx = 0 }            // dragged along to the wall
        const every = F.kind === 'lapse' ? LAPSE.ticks.includes(F.t) : (F.t % MAXBLUE.every === 0 && F.hits < MAXBLUE.hits)
        if (every) { F.hits = (F.hits || 0) + 1; const r = strike(f, o, { raw: F.kind === 'lapse' ? LAPSE.raw : MAXBLUE.raw, hitstun: F.kind === 'lapse' ? LAPSE.hitstun : MAXBLUE.hitstun, kbx: 0, kby: 0, chip: 0.2, move: 'gs_blue', fx: 'blueHit' }, W); if (r === 'hit') F.landed = true }
      }
      if (F.t >= F.life) s.fields.splice(i, 1)
    } else if (F.kind === 'dred') {
      const release = !raw.special || F.t >= DELAYED.life
      if (F.t > 2 && release) { detonate(f, s, W, F.x, F.y, DELAYED.r, { raw: DELAYED.raw, hitstun: DELAYED.hitstun, kbx: DELAYED.kbx, kby: DELAYED.kby, move: 'gs_delayed_red' }); s.fields.splice(i, 1) }
    }
  }
}
function detonate(f, s, W, x, y, r, P) {
  const out = fieldRepel(f, { x, y, r }, W)
  s.stats.reflected += out.reflected
  for (const o of out.pushed) { const dir = ctrX(o) >= x ? 1 : -1; const res = strike(f, o, { ...P, dir, chip: 0.15, fx: 'red' }, W); if (res === 'hit') s.bounce = { side: o.side, t: 0 } }
  cue(f, 'redBurst'); pushFx(s, 'redBurst', x, y, { r })
}
// SIX EYES — SIGHT: Blue finds hidden / burrowed fighters (a burrowed Dustin is pulled out of the ground)
function sightReveal(o) {
  const n = o._ninja
  if (n?.burrow) { n.burrow = null; o._rooted = false; if (o.currentAttack?.name === 'nsBurrow') { o.attacking = false; o.currentAttack = null; o.currentMove = null } o._gsUnburrowed = (o._gsUnburrowed || 0) + 1 }
  if (o.hidden) o.hidden = false
  if (o._stealth) o._stealth = 0
}
function spawnPurple(f, s, W, P) {
  const d = f.facing || 1
  s.purples = [{ x: Math.round(ctrX(f) + d * 40), y: Math.round(f.y + (f.h || 94) * 0.4), dir: d, r: P.r, raw: P.raw, speed: P.speed, life: P.life, t: 0, hit: {}, out: P.out || 3, big: !!P.big }]
  s.stats.purples++; s.stats.lastPurpleOutput = P.out ? Math.round(P.out * 100 / 3) : 100; s.stats.lastPurpleRaw = P.raw
  cue(f, P.big ? 'purple200Fire' : 'purpleFire')
}
function purpleTick(f, s, W) {
  for (let i = s.purples.length - 1; i >= 0; i--) {
    const m = s.purples[i]; m.t++
    m.x += m.dir * m.speed
    const er = fieldErase(f, { x: m.x, y: m.y, r: m.r }, W)
    s.stats.erased += er.projectiles + er.clones + er.summons + er.drones + er.munitions + er.patches
    let end = m.t >= m.life || m.x < -m.r || m.x > sw(W) + m.r
    for (const o of foesOf(f, W)) {
      if (m.hit[o.side]) continue
      const nx = Math.max(o.x, Math.min(m.x, o.x + o.w)), ny = Math.max(o.y, Math.min(m.y, o.y + o.h))
      if ((m.x - nx) ** 2 + (m.y - ny) ** 2 > m.r * m.r) continue
      m.hit[o.side] = true
      strike(f, o, { raw: m.raw, hitstun: PURPLE.hitstun, kbx: PURPLE.kbx, kby: PURPLE.kby, chip: PURPLE.chip, guardBreak: true, move: m.big ? 'gs_purple200' : 'gs_purple', hitstop: 10, fx: 'purpleHit', noCounter: true }, W)
      pushFx(s, 'dome', ctrX(o), o.y + o.h, { big: m.big })
      end = true
    }
    if (end) { if (!Object.keys(m.hit).length) pushFx(s, 'dome', Math.max(0, Math.min(sw(W), m.x)), m.y + 50, { big: m.big }); s.purples.splice(i, 1) }
  }
}

// ── live move driver ──
function moveTick(f, s, A, W, opp, raw) {
  const m = A.gs, md = GS_MOVES[m.key], t = elapsed(A), g = grounded(f)
  if (m.key !== 'gBlueStep') f.facing = m.dir
  const clampX = x => Math.max(0, Math.min(sw(W) - f.w, x))
  if (md.travel && t >= md.travel[0] && t < md.travel[1] && g) { f.x = clampX(f.x + m.dir * md.travel[2]); f.vx = 0 }
  else if (g && !md.air && !md.launcher && m.key !== 'gBlueStep') f.vx = 0
  const front = () => ctrX(f) + m.dir * (f.w / 2)
  switch (m.key) {
    case 'gAir': if (g && t > 2) endGsAttack(f, 3); break
    case 'gLapse': {
      if (t === LAPSE.release - 1 && raw.special && m.held < LAPSE.holdMax) { m.held++; A.total++; A.timer++ }   // hold = farther point (pose held)
      if (t === LAPSE.release && !m.released) {
        m.released = true
        const frac = LAPSE.near + (LAPSE.far - LAPSE.near) * (m.held / LAPSE.holdMax)
        let x = ctrX(f) + m.dir * frac * SCREEN, y = ctrY(f)
        if (!g) { x = ctrX(f) + m.dir * frac * SCREEN * LAPSE.airAngle; y = ctrY(f) + frac * SCREEN * LAPSE.airAngle * 0.6 }
        const floorY = (f.groundY ?? (f.y + f.h)) - 40
        y = Math.min(y, floorY)
        addField(s, { kind: 'lapse', x: Math.round(Math.max(20, Math.min(sw(W) - 20, x))), y: Math.round(y), r: LAPSE.r, core: LAPSE.core, pull: LAPSE.pull, pullCore: LAPSE.pullCore, t: 0, life: LAPSE.life, hits: 0, n: ++s.nEnt })
        cue(f, 'blueHum')
      }
      if (!g && t > LAPSE.release + 2 && f.vy > 0) { /* air Lapse keeps falling */ }
      break
    }
    case 'gMaxBlue':
      if (t === MAXBLUE.release && !m.released) {
        m.released = true
        addField(s, { kind: 'max', x: Math.round(ctrX(f) + m.dir * 70), y: Math.round(ctrY(f) - 6), dir: m.dir, r: MAXBLUE.r, core: MAXBLUE.core, pull: MAXBLUE.pull, pullCore: MAXBLUE.pullCore, t: 0, life: MAXBLUE.life, hits: 0, n: ++s.nEnt })
        cue(f, 'blueHum')
      }
      break
    case 'gBlueStep': {
      if (t === BLUESTEP.startup && !m.released) {
        m.released = true
        const v = m.vec || { x: m.dir, y: 0 }, dist = BLUESTEP.dist * SCREEN * (v.y && !v.x ? 0.45 : 1)
        const floorTop = (f.groundY ?? (f.y + f.h)) - f.h
        m.from = { x: f.x, y: f.y }
        m.to = { x: clampX(f.x + v.x * dist), y: Math.min(floorTop, f.y + v.y * dist) }
        pushFx(s, 'blueDot', m.to.x + f.w / 2, m.to.y + f.h / 2)
        cue(f, 'blueStep')
      }
      if (m.released && t > BLUESTEP.startup && t <= BLUESTEP.startup + BLUESTEP.travel) {
        const k = (t - BLUESTEP.startup) / BLUESTEP.travel
        f.x = Math.round(m.from.x + (m.to.x - m.from.x) * k); f.y = Math.round(m.from.y + (m.to.y - m.from.y) * k); f.vx = 0; f.vy = 0
        if (t % 2 === 0) pushFx(s, 'ghost', f.x, f.y, { dir: m.dir })
      } else if (m.released) { f.vy = Math.min(f.vy || 0, 0) }
      break
    }
    case 'gRed': {
      if (t === RED.release - 1 && raw.special && !m.planted && s.burnout === 0) {         // held → DELAYED RED (plants instead)
        if (ceHas(s, PROFILE, DELAYED.extra)) {
          ceSpend(s, PROFILE, DELAYED.extra); m.planted = true; m.released = true
          addField(s, { kind: 'dred', x: Math.round(ctrX(f) + m.dir * DELAYED.ahead), y: Math.round(ctrY(f)), t: 0, n: ++s.nEnt })
          cue(f, 'redPlant')
        }
      }
      if (t === RED.release && !m.released) {
        m.released = true
        const x0 = m.dir === 1 ? f.x + f.w : f.x - RED.reach, box = { x: x0, y: f.y + 6, w: RED.reach, h: RED.h }
        const refl = { x: m.dir === 1 ? f.x + f.w : f.x - RED.reflectReach, y: f.y - 30, w: RED.reflectReach, h: f.h + 60 }
        const out = fieldRepel(f, { x: front(), y: ctrY(f), r: 0 }, W, { reflectRect: refl })
        s.stats.reflected += out.reflected
        for (const o of foesOf(f, W, opp)) {
          if (o.x + o.w < box.x || o.x > box.x + box.w || o.y + o.h < box.y || o.y > box.y + box.h) continue
          if (strike(f, o, { raw: RED.raw, hitstun: RED.hitstun, kbx: RED.kbx, kby: RED.kby, dir: m.dir, chip: 0.15, move: 'gs_red', hitstop: 6, fx: 'red' }, W) === 'hit') s.bounce = { side: o.side, t: 0 }
        }
        cue(f, 'redCrack'); pushFx(s, 'redBurst', front() + m.dir * 30, ctrY(f) - 8, { r: 60 })
      }
      // the reflect window stays open a few frames after the burst
      if (m.released && !m.planted && t > RED.release && t <= RED.release + RED.reflectFrames) {
        const refl = { x: m.dir === 1 ? f.x + f.w : f.x - RED.reflectReach, y: f.y - 30, w: RED.reflectReach, h: f.h + 60 }
        s.stats.reflected += fieldRepel(f, { x: front(), y: ctrY(f), r: 0 }, W, { reflectRect: refl }).reflected
      }
      break
    }
    case 'gThrow': {
      if (t === 2 && !m.grabbed) {
        const o = foesOf(f, W, opp).find(o => Math.abs(ctrX(o) - ctrX(f)) <= f.w / 2 + o.w / 2 + THROW.range && Math.abs((o.y + o.h) - (f.y + f.h)) < 30 && grounded(o) && !(o.invulnTimer > 0))
        if (o && !(isGs(o) && o._gs?.inf.lv > 0 && !bypass(o, o._gs, f, null))) {
          m.grabbed = o.side; o.isGrabbed = true; o.grabTimer = THROW.holdAt + 4; o.hitstun = Math.max(o.hitstun || 0, THROW.holdAt + 4); o.vx = 0; o.vy = 0
          if (isGs(o)) o._gs.grabbedBy = f.side
          cue(f, 'grab')
        } else if (o && isGs(o)) { o._gs && tax(o, o._gs, 30); f._gsSawInfinity = o._gs?.clock }
      }
      if (m.grabbed != null) {
        const o = foesOf(f, W, opp).find(q => q.side === m.grabbed)
        if (o && t < THROW.holdAt) { o.x = Math.round(f.facing === 1 ? f.x + f.w - 6 : f.x - o.w + 6); o.vx = 0; o.vy = 0 }
        if (o && t === THROW.holdAt) {
          o.isGrabbed = false; o.grabTimer = 0; if (o._gs) o._gs.grabbedBy = null
          strike(f, o, { raw: THROW.raw, hitstun: 30, kbx: THROW.kbx, kby: THROW.kby, dir: m.dir, unblockable: true, noCounter: true, move: 'gs_throw', hitstop: 6, fx: 'red' }, W)
          cue(f, 'redCrack'); m.grabbed = null
        }
      }
      break
    }
    case 'gPurple':
      if (t === PURPLE.release && !m.released) { m.released = true; spawnPurple(f, s, W, { r: PURPLE.r, raw: PURPLE.raw, speed: PURPLE.speed, life: PURPLE.life }) }
      if (t === 54) cue(f, 'purpleMerge')
      break
    case 'gPurple200': chantTick(f, s, A, m, t, W); break
    case 'gDomain':
      if (t === DOMAIN.activateAt && !m.released) {
        m.released = true
        if ((f.energy || 0) >= BAR || f.infiniteEnergy) {
          if (!f.infiniteEnergy) f.energy -= BAR
          const opDom = E.activeDomains?.find(d => d && d.owner && d.owner !== f)
          E.activateDomain?.(f, { cost: 0, duration: DOMAIN.duration, range: 1e5, domainKey: 'gojo' })
          s.dom.mine = true; s.dom.start = s.clock; s.stats.domains++
          setInfinity(f, s, s.inf.lv)                     // Infinity may stay on inside his own domain
          cue(f, 'domain')
          if (opDom) startClash(f, s, opDom.owner)
        }
      }
      break
    case 'gFBE':
      if (t === FBE.window[0]) { s.fbeT = FBE.window[1] - FBE.window[0] + 1 }
      break
    case 'gRCT': rctTick(f, s, A, raw); break
  }
}

// ── 200 % HOLLOW PURPLE chant: three lines (the sheet's strips), a 10-frame press window each, +⅓ per success ──
export const chantLineAt = t => { const k = t - CHANT.start; if (k < 0) return -1; const i = Math.floor(k / CHANT.line); return i < 3 ? i : 3 }
function chantTick(f, s, A, m, t, W) {
  const c = s.chant; if (!c) return
  c.t = t
  const i = chantLineAt(t)
  if (i === 3 && t === CHANT.start + 3 * CHANT.line) cue(f, 'chantFinal')
  if (i >= 0 && i < 3 && t === CHANT.start + i * CHANT.line) cue(f, 'chantLine', { line: i })
  if (fresh(s, 'special', 0)) {
    use(s, 'special')
    if (i >= 0 && i < 3 && c.judged[i] == null) {
      const k = t - (CHANT.start + i * CHANT.line), ok = k >= CHANT.window[0] && k < CHANT.window[1]
      c.judged[i] = ok; if (ok) { c.ok++; s.stats.chantHits++; cue(f, 'chantHit', { line: i }) } else cue(f, 'chantMiss', { line: i })
    }
  }
  for (let j = 0; j < 3; j++) if (c.judged[j] == null && t > CHANT.start + j * CHANT.line + CHANT.window[1]) c.judged[j] = false
  if (t === CHANT_FIRE && !m.released) {
    m.released = true
    if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - 2 * BAR)
    const out = 3 + c.ok                                          // thirds: 3 = 100 %, 6 = 200 % exactly
    const raw = Math.round(CHANT.baseRaw * out / 3)
    const r = Math.round(CHANT.r100 + (CHANT.r200 - CHANT.r100) * (c.ok / 3))
    spawnPurple(f, s, W, { r, raw, speed: CHANT.speed, life: CHANT.life, out, big: true })
    c.fired = out
  }
}

// ── RCT (hold) + BRAIN RESET (in burnout, 1.5 s held, 40 CE) ──
function rctTick(f, s, A, raw) {
  const r = s.rct ||= { t: 0, hp: 0, brain: 0 }
  if (!raw.charge) { finishRct(f, s); endGsAttack(f, 4); return }
  A.total++; A.timer++                                           // the pose holds while Charge is held
  r.t++
  if (s.burnout > 0) {
    if (++r.brain >= RCT.brainHold && ceHas(s, PROFILE, RCT.brainCost)) { ceSpend(s, PROFILE, RCT.brainCost); s.burnout = 0; s.stats.brainReset++; r.brain = 0; cue(f, 'brainReset'); pushFx(s, 'rct', ctrX(f), f.y + 8, { big: true }) }
  }
  if (r.hp < RCT.maxHp && (f.health || 0) < (f.maxHealth || 1160)) {
    const per = Math.round(RCT.rate * CE_UNIT / 60)                // 0.5 CE / frame
    if (s.ce >= per) { s.ce -= per; const hp = Math.min(RCT.maxHp - r.hp, (RCT.rate / 60) * RCT.hpPerCe, (f.maxHealth || 1160) - f.health); f.health += hp; r.hp += hp; s.stats.rctHp += hp }
  }
  if (r.t % 12 === 0) pushFx(s, 'rct', ctrX(f), f.y + 8)
}
function finishRct(f, s) { if (s.rct && (s.rct.hp > 0 || s.stats.brainReset)) s.cd.rct = RCT.cd; s.rct = null }

// ── DOMAIN: Unlimited Void (the old Gojo's domain, shared), 30 s cooldown after it ENDS, 5 s burnout, clash ──
function domainTick(f, s, opp, W) {
  const doms = E.activeDomains || []
  const mineNow = doms.some(d => d && d.owner === f)
  const theirs = doms.filter(d => d && d.owner && d.owner !== f)
  s.oppDomain = theirs.length > 0
  for (const d of theirs) {
    const side = d.owner.side
    if (d._gsId == null) d._gsId = ++s.serial                       // identity stamp (plain number) on the shared domain object
    if (s.dom.oppSeen[side] === d._gsId) continue
    s.dom.oppSeen[side] = d._gsId
    const recent = s.dom.start >= 0 && s.clock - s.dom.start <= DOMAIN.clashWindow
    if (!s.clash && (s.dom.mine || recent)) startClash(f, s, d.owner)
  }
  if (s.clash) { clashTick(f, s, W); return }
  if (s.dom.mine && !mineNow) {                                   // my domain ended → cooldown + burnout
    s.dom.mine = false
    s.cd.domain = DOMAIN.cooldown
    burnout(f, s)
  }
  if (s.clashWin && !doms.some(d => d && d.owner?.side === s.clashWin.owner)) {   // the clash winner's 1 s window closed
    const o = s.clashWin; s.clashWin = null
    burnout(f, s)
    const other = foesOf(f, W, opp).find(q => q.side === o.opp)
    if (other) { other._gsTechBurnout = DOMAIN.burnout; if (isGs(other)) burnout(other, gsState(other)) }
  }
}
function burnout(f, s) { s.burnout = DOMAIN.burnout; s.stats.burnouts++; setInfinity(f, s, 0, 'burnout'); s.fields = s.fields.filter(F => F.kind !== 'max'); cue(f, 'burnout') }
// The Gojo who detects the clash LEADS it (judges + resolves); a Gojo opponent mirrors it passively (frozen, its
// domain bookkeeping parked) so neither side reads the wiped domains as "my domain ended".
function startClash(f, s, other) {
  if (!other) return
  E.clearDomains?.()
  s.dom.mine = false
  s.clash = { t: 0, opp: other.side, me: 0, them: 0, prevOpp: true, lead: true }
  s.stats.clashes++
  setInfinity(f, s, 0, 'clash')
  cue(f, 'clash')
  if (isGs(other)) { const o = gsState(other); o.dom.mine = false; o.clash = { t: 0, opp: f.side, me: 0, them: 0, prevOpp: true, lead: false }; o.stats.clashes++; setInfinity(other, o, 0, 'clash'); cue(other, 'clash') }
}
function clashTick(f, s, W) {
  const c = s.clash, o = (W.fighters?.() || []).find(q => q && q.side === c.opp)
  c.t++
  for (const q of [f, o]) if (q) { q.hitstun = Math.max(q.hitstun || 0, 3); q.vx = 0; if (q.attacking && q !== f) { q.attacking = false; q.currentAttack = null } }
  if (live(f)) endGsAttack(f)
  if (!c.lead) { if (c.t > DOMAIN.clashFrames + 10) s.clash = null; return }    // the leader resolves (and clears this)
  if (fresh(s, 'special', 0)) { use(s, 'special'); c.me++ }
  const ro = o ? (W.raw?.(o) || {}) : {}
  if (ro.special && !c.prevOpp) c.them++
  c.prevOpp = !!ro.special
  if (c.t < DOMAIN.clashFrames) return
  const myCe = ceValue(s, PROFILE)
  const theirCe = o ? (isGs(o) ? gsCe(o) : 100 * (o.energy || 0) / (o.maxEnergy || 100)) : 0
  const me = c.me + 0.1 * myCe, them = c.them + 0.1 * theirCe
  s.clash = null
  c.result = me > them ? 'win' : me < them ? 'lose' : 'tie'
  s.lastClash = { me: c.me, them: c.them, myScore: Math.round(me * 10) / 10, theirScore: Math.round(them * 10) / 10, result: c.result }
  cue(f, 'clashEnd', { result: c.result })
  const os = o && isGs(o) ? gsState(o) : null
  if (os) { os.clash = null; os.lastClash = { me: c.them, them: c.me, myScore: s.lastClash.theirScore, theirScore: s.lastClash.myScore, result: c.result === 'win' ? 'lose' : c.result === 'lose' ? 'win' : 'tie' }; cue(o, 'clashEnd', { result: os.lastClash.result }); os.cd.domain = DOMAIN.cooldown }
  if (c.result === 'tie' || !o) { burnout(f, s); if (os) burnout(o, os); else if (o) o._gsTechBurnout = DOMAIN.burnout; s.cd.domain = DOMAIN.cooldown; return }
  const winner = c.result === 'win' ? f : o
  E.activateDomain?.(winner, isGs(winner) ? { cost: 0, duration: DOMAIN.clashWin / 60, range: 1e5, domainKey: 'gojo' } : { cost: 0, duration: DOMAIN.clashWin / 60, range: 1e5, ...(winner.rosterKey === 'sukuna_shinjuku' ? { domainKey: 'sukuna' } : {}) })   // MSV1-SUKUNA: his Shrine is the old Sukuna's
  s.clashWin = { owner: winner.side, opp: o.side }
  if (winner === f) s.dom.mine = false
  s.cd.domain = DOMAIN.cooldown
}

// ── CPU Gojo (only when the CPU drives him): toggles Infinity on a coming super (reaction by difficulty), off to cast ──
const REACT = { dummy: Infinity, easy: 30, normal: 16, adaptive: 14, hard: 9, impossible: 5 }
export function markGsCpu(f, difficulty) { if (!isGs(f)) return; const s = gsState(f); s.cpu = { ...(s.cpu || {}), seen: s.clock, diff: difficulty || 'normal', threatAt: s.cpu?.threatAt ?? -1, calm: s.cpu?.calm ?? 0 } }   // keeps the technique rhythm (nextAt / n)
function cpuInfinity(f, s, opp, W) {
  const c = s.cpu
  if (f.hitstun > 0 || f.blockstun > 0) return
  const foe = foesOf(f, W, opp)[0]; if (!foe) return
  const superComing = !!(foe.attacking && isSuperAttack(foe.currentAttack)) || (W.projectileList?.() || []).some(p => p.owner === foe && isSuperProjectile(p))
  const projComing = (W.projectileList?.() || []).some(p => p.owner === foe && boxDist(f, p.x, p.y) < 260)
  if (superComing || projComing) { if (c.threatAt < 0) c.threatAt = s.clock; c.calm = 0 } else { c.threatAt = -1; c.calm++ }
  const react = REACT[c.diff] ?? 16
  if (c.threatAt >= 0 && s.clock - c.threatAt >= react && s.inf.lv === 0 && !canInfinity(f, s) && ceValue(s, PROFILE) > 20) setInfinity(f, s, superComing && ceValue(s, PROFILE) > 40 ? 3 : 1)
  const casting = !!(f.attacking && f.currentAttack?.gs && GS_MOVES[f.currentAttack.gs.key]?.cost)
  if (s.inf.lv > 0 && (c.calm > 50 || ceValue(s, PROFILE) < 18 || casting)) setInfinity(f, s, 0)
}

// CPU techniques (phase 8): a deterministic rhythm (no RNG) gated by difficulty. Far = Lapse pull or teleport in;
// close = Blue Fist / Red; a foe projectile close = long blink away; meter + CE = Unlimited Void; low HP = RCT.
const PACE = { dummy: Infinity, easy: 140, normal: 80, adaptive: 70, hard: 50, impossible: 34 }
function cpuTech(f, s, opp, W) {
  const c = s.cpu, pace = PACE[c.diff] ?? 80
  if (!isFinite(pace) || f.attacking || f.hitstun > 0 || f.blockstun > 0 || s.charging || s.blink || s.clash || !grounded(f)) return
  if (c.nextAt == null) c.nextAt = s.clock + pace
  if (s.clock < c.nextAt) return
  const foe = foesOf(f, W, opp)[0]; if (!foe || !(foe.health > 0) || foe.domainFrozen && !s.dom.mine) return
  const dir = ctrX(foe) >= ctrX(f) ? 1 : -1, dist = Math.abs(ctrX(foe) - ctrX(f)), ce = ceValue(s, PROFILE), roll = (s.clock * 7 + (c.n = (c.n || 0) + 1) * 13) % 10
  const shot = (W.projectileList?.() || []).some(p => p.owner === foe && boxDist(f, p.x, p.y) < 180)
  let key = null
  if (!s.dom.mine && s.cd.domain <= 0 && !(s.burnout > 0) && (f.energy || 0) >= 100 && ce >= 50 && dist < 520) key = 'gDomain'
  else if (shot && s.inf.lv === 0 && !(s.cd.blink > 0)) { startBlink(f, s, -dir, W); key = 'blink' }
  else if (f.health < f.maxHealth * 0.35 && s.cd.rct <= 0 && ce >= 30 && dist > 300) key = 'gRCT'
  else if ((f.energy || 0) >= 100 && ce >= 40 && dist < 420 && roll < 3) key = 'gPurple'
  else if (dist > 320) key = roll < 4 && !(s.cd.tp > 0) ? 'tp' : (ce >= 15 ? 'gLapse' : null)
  else if (dist < 110) key = ce >= 20 && roll < 4 ? 'gRedRush' : (ce >= 15 ? (roll < 7 ? 'gBlueFist' : 'gRed') : null)
  if (key === 'tp') teleportIn(f, s, foe, W)
  else if (key && key !== 'blink') { f.facing = dir; startGsMove(f, key, W, { dir }) }
  c.nextAt = s.clock + pace
}

// ── command-layer helpers used by gojoShinjuku.js ──
export function gsBlackFlash(f, W, opp) {
  const s = gsState(f), b = s.bf
  if (!b) return false
  const win = s.zone > 0 ? BLACK_FLASH.zoneWindow : BLACK_FLASH.window
  const e = s.edges.special
  if (!e || s.used.special === e.tick || e.tick < b.tick || e.tick - b.tick > win) return false
  use(s, 'special')
  const t = foesOf(f, W, opp).find(o => o.side === b.side)
  s.bf = null
  if (!t) return false
  const scale = E.comboScale ? E.comboScale(f) : 1
  W.damage(t, dmg(b.raw * (BLACK_FLASH.mult - 1)) * scale, { source: 'gs-technique', attacker: f, move: 'gs_black_flash', damageType: 'energy', gsOwn: true })
  t.hitstun = Math.max(t.hitstun || 0, 26); t.colorFlash = 10
  f.hitstop = Math.max(f.hitstop || 0, 8); t.hitstop = Math.max(t.hitstop || 0, 8)
  ceGain(s, PROFILE, BLACK_FLASH.ce); s.zone = BLACK_FLASH.zone; s.stats.bf++
  cue(f, 'blackFlash'); pushFx(s, 'blackFlash', ctrX(t), ctrY(t))
  return true
}
// Perfect Output: the earliest cancel tick of the live move (first frame a cancel is legal after contact)
export function gsEarliestCancel(f, s, a, open) {
  if (!a?.gs) return false
  if (open && a.gs.firstOpen == null) a.gs.firstOpen = s.tick
  return open && a.gs.firstOpen != null
}
export function gsStartTechnique(f, key, W, o) { return startGsMove(f, key, W, o) }
export function gsLockedForMovement(f) {
  if (!isGs(f)) return false
  const s = f._gs, a = f.attacking ? f.currentAttack : null
  if (s?.clash || (s?.blink && s.blink.t <= MOBILITY.blink.startup + MOBILITY.blink.travel)) { f._dashTap = false; return true }
  if (a?.gs && !(GS_MOVES[a.gs.key]?.launcher && a.hasHit)) { f._dashTap = false; return true }
  return false
}
// P belongs to Infinity / RCT / Falling Blossom; once a press is HELD past the tap window it is the shared charge
export const gsOwnsCharge = f => isGs(f) && !f._gs?.charging
export { PROFILE as GS_LIMITLESS_PROFILE, ceValue as _ceValue }
