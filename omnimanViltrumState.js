// Omni-Man — Viltrumite (omniman_viltrum) — SIMULATION state + combat.js hooks. Plain JSON on f._omv (snapshotted for the
// determinism hash, carried by replay / LAN through the inputs that produce it); sim ticks only: no RNG, no wall clock.
// Every export is a no-op for any other rosterKey. Engine functions arrive through registerOmvEngine (set by
// omnimanViltrum.js) so this file imports no engine module except flight.js / gojoShinjukuState.js (pure leaves).
//
// FLIGHT = flight.js FLIGHT_PROFILES.omniman_viltrum (Homelander's module, momentum block). This file adds what the profile
// can't: the sim-clock Charge TAP (takeoff / come down, Dseyl's method), Guard = BRAKE (fighter._flightBrake), no blocking
// above 40 % speed, SPEED IS DAMAGE, WALL CRASH (≥ 70 %), SONIC BOOM (crossing 90 %), HARD LANDING (≥ 70 %).
import { OMV_KEY, OMV_MOVES, FLIGHT, SPEED_DMG, speedMult, BLITZ, SKYHOOK, METEOR, DIRT, UNIMPRESSED, DECREE, THINK, ESCAPE,
  TECHNIQUES, NORMALS, QUOTES, SCREEN, BAR, TOP, dmg } from './omnimanViltrumData.js'
import { flightToggleInput, flightTakeoff, isFlying, ensureFlightState, FLIGHT_PHASE } from './flight.js'
import { gsGrabGate } from './gojoShinjukuState.js'
import { onStartMove, tickMoves, unimpressedCatch } from './omnimanViltrumMoves.js'

export const isOmv = f => f?.rosterKey === OMV_KEY
const E = { startMove: null, comboScale: null, W: null }
export function registerOmvEngine(o) { Object.assign(E, o) }

export const omvState = f => {
  if (f._omv) return f._omv
  return (f._omv = { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, dirs: [], serial: 0,
    fl: { chg: 0, pend: 0, prevCharge: false, toggles: 0 }, pv: { vx: 0, vy: 0, x: 0, y: 0, sp: 0 },
    boomArmed: true, crash: 0, land: 0, cd: { unimp: 0 }, rush: null, hold: null, ev: null, counter: null,
    say: null, said: { intro: false, win: false }, cpu: null, fx: [], cues: [],
    stats: { takeoffs: 0, booms: 0, boomHits: 0, crashes: 0, hardLands: 0, landHits: 0, brakes: 0, topSpeed: 0, hits: 0, lastMult: 1,
      lastFrac: 0, blitz: 0, blitzHits: 0, blitzCrash: 0, skyHooks: 0, skyHookHits: 0, meteors: 0, meteorHits: 0, dirt: 0, dirtHits: 0,
      dirtStopped: 0, unimp: 0, counters: 0, decrees: 0, decreeDone: 0, think: 0, thinkHits: 0, thinkStopped: 0, escape: 0,
      escapeHits: 0, escapeWhiff: 0, escapeStopped: 0, escapeDone: 0, stopped: 0, wallSplats: 0, spent: 0 } })
}
const cue = (f, c, extra) => { const s = omvState(f); s.cues.push(extra ? { c, ...extra } : c); if (s.cues.length > 32) s.cues.shift() }
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const floorOf = (f, W) => (f.groundY != null ? f.groundY : (W?.floorY?.() ?? 0))
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.omv) ? f.currentAttack : null
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
const boxHit = (o, x, y, w, h) => o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y
const r1 = v => Math.round(v * 10) / 10
function pushFx(s, kind, x, y, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), t: 0, ...(extra || {}) }); if (s.fx.length > 24) s.fx.shift() }
export function endOmvAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }

// ── speed ──
export const omvSpeed = f => Math.hypot(f?.vx || 0, f?.vy || 0)
export const omvSpeedFrac = f => Math.min(1, omvSpeed(f) / TOP)
export const omvFlying = f => isOmv(f) && !!f._flightCtl && isFlying(f)

export function clearOmv(f) {
  if (!f) return
  if (live(f)) endOmvAttack(f)
  releaseHeld(f)
  delete f._omv; delete f._omvRemoteInput; delete f._flightBrake
}
export function clearOmvMarks(f) { if (!f) return; delete f._omvWall; if (f._omvHeldBy != null) { f.isGrabbed = false; f.grabTimer = 0; delete f._omvHeldBy } }
function releaseHeld(f) {
  const s = f?._omv; if (!s?.hold) return
  const t = s.hold.ref; if (t && t._omvHeldBy === f.side) { t.isGrabbed = false; t.grabTimer = 0; delete t._omvHeldBy }
  s.hold = null
}

// ── public reads (HUD / harness / AI / game.js gates) ──
export const omvNoBlock = f => omvFlying(f) && omvSpeedFrac(f) > FLIGHT.blockMax          // committed: can't block above 40 %
export const omvOwnsCharge = f => omvFlying(f)                                             // no meter charge in flight (Charge tap = come down)

// ── combat.js hooks (his normals are engine melee moves) ──
export function omvHitbox(f) {
  const a = f.currentAttack, m = a?.omv, md = OMV_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 18), w: a.rangeX, h: a.rangeY }
}
// on block at speed he is more negative: + blockPenalty × speed fraction recovery frames
export function omvBlock(f, d, a) {
  if (!isOmv(f) || !a?.omv) return
  d.blockstun = OMV_MOVES[a.omv.key].blockstun
  const extra = Math.round(SPEED_DMG.blockPenalty * (a.omv.frac || 0))
  if (extra > 0 && !a.omv.penal) { a.omv.penal = extra; a.total += extra; a.timer += extra }
  a.omv.contact = true; a.omv.contactTick = omvState(f).tick
}
export function omvHit(f, d, a) {
  if (!isOmv(f) || !a?.omv) return
  const s = omvState(f), m = a.omv, md = OMV_MOVES[m.key]
  m.contact = true; m.contactTick = s.tick
  if (d.isBlocking) return
  m.clean = true; f._cmdHitLanded = true
  s.stats.hits++; s.stats.lastMult = +(speedMult(m.frac || 0)).toFixed(3); s.stats.lastFrac = +(m.frac || 0).toFixed(3)
  if (md?.wallBounce) markWall(d, m.dir, s)
  pushFx(s, (m.frac || 0) > 0.5 ? 'impactBig' : 'impact', ctrX(d), ctrY(d), { dir: m.dir, frac: m.frac || 0 })
  cue(f, 'hit', { frac: +(m.frac || 0).toFixed(2) })
}
// heavy: knockback he RECEIVES × 0.85 (Viltrumite weight)
export function omvKnockback(attacker, defender) {
  if (!isOmv(defender)) return
  defender.vx = (defender.vx || 0) * 0.85; defender.vy = (defender.vy || 0) * 0.85
}

// WALL BOUNCE (reuses combat.js WALL SPLAT numbers / fields): a foe he sends flying that reaches a stage wall within 30
// frames is pinned (34 hitstun, 24 f splat), bounces off at 0.35 and shakes the camera (game.js consumes _wallBounceShake)
function markWall(t, dir, s) { t._omvWall = { dir, ttl: 30 }; if (s) s.stats.wallMarks = (s.stats.wallMarks || 0) + 1 }
function wallTick(t, W, s) {
  const w = t._omvWall; if (!w) return
  if (--w.ttl <= 0 || !(t.health > 0)) { delete t._omvWall; return }
  const atL = t.x <= 1 && w.dir < 0, atR = t.x >= sw(W) - (t.w || 48) - 1 && w.dir > 0
  // the engine's playfield edge is the CAMERA's (it clamps fighters to the view): moving into it and not moving = a wall
  const blocked = w.px != null && Math.abs(t.x - w.px) < 0.5 && Math.sign(t.vx || 0) === w.dir && Math.abs(t.vx || 0) > 2
  w.px = t.x
  if (!atL && !atR && !blocked) return
  t.wallBounce = true; t._wallSplat = 24; t.hitstun = Math.max(t.hitstun || 0, 34); t._wallBounceShake = true
  t.vx = -(w.dir * Math.max(6, Math.abs(t.vx || 0))) * 0.35
  delete t._omvWall
  if (s) { s.stats.wallSplats++; pushFx(s, 'wallSplat', w.dir < 0 ? t.x : t.x + (t.w || 48), ctrY(t)) }
}

// ── STRIKE: the one hit path for his sim-driven hits (boom, landing, specials, super, ultimate). Damage leaves through
//    the damage choke-point (applyScaledDamage), so every damage-level defence applies — Gojo's Infinity included.
function strike(f, t, P, W) {
  if (!t || !(t.health > 0) || t._banished || t._cubeTrapUntouchable) return 'miss'
  if ((t.invulnTimer || 0) > 0 && !P.cine) return 'miss'
  if (t.domainUntouchable && !P.domainOk) return 'miss'
  if (t.knockdownState && !P.otg) return 'miss'
  if (t._gs?.blink?.inv) return 'miss'
  const s = omvState(f), dir = P.dir ?? (ctrX(t) >= ctrX(f) ? 1 : -1)
  const facingSrc = (t.facing || 1) === -dir
  const guards = t.isBlocking && facingSrc && !P.unblockable && (!P.low || !!t._crouching)
  if (guards) {
    if (P.chip > 0) W.damage(t, dmg(Math.max(1, Math.round(P.raw * P.chip))), { source: 'omv-chip', attacker: f, move: P.move, damageType: P.type || 'blunt' })
    t.blockstun = Math.max(t.blockstun || 0, P.blockstun || 14)
    cue(f, 'blocked'); pushFx(s, 'block', ctrX(t), ctrY(t))
    return 'block'
  }
  const hp0 = t.health
  const scale = P.noScale ? 1 : (E.comboScale ? E.comboScale(f) : 1)
  W.damage(t, dmg(P.raw) * scale, { source: P.source || 'omv-technique', attacker: f, move: P.move, damageType: P.type || 'blunt' })
  if (t.rosterKey === 'gojo_shinjuku' && (t._gs?.inf?.lv || 0) > 0 && t.health >= hp0) {   // Infinity: never touched
    s.stats.stopped++; cue(f, 'stopped'); return 'stopped'
  }
  t.hitstun = Math.max(t.hitstun || 0, P.hitstun || 16)
  t.isBlocking = false
  if (t.attacking && !t.currentAttack?.isUltimate) { t.attacking = false; t.currentAttack = null; t.currentMove = null }
  if (P.kbx != null) t.vx = dir * P.kbx
  if (P.kby != null && P.kby !== 0) { t.vy = P.kby; if (P.kby < 0) { t.onGround = false; t.grounded = false } }
  if (P.wall) markWall(t, dir, s)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 6
  if (!P.noMeter) f.energy = Math.min(f.maxEnergy || 200, (f.energy || 0) + Math.round(P.raw * 0.08))
  if (P.hitstop) { f.hitstop = Math.max(f.hitstop || 0, P.hitstop); t.hitstop = Math.max(t.hitstop || 0, P.hitstop) }
  pushFx(s, P.fx || 'impact', ctrX(t), ctrY(t), { dir })
  return 'hit'
}

// grab gate: Gojo's Infinity (gojo_shinjuku at ANY level, or the old Gojo's Infinity toggle) can't be grabbed → whiff
export function grabStopped(t, f) {
  if (!t) return false
  if (gsGrabGate(t, f)) return true
  return (t.rosterKey || '').toLowerCase() === 'gojo' && !!t.infinityActive
}

// ── input edges + facing-relative motion buffer (numpad digits; 5 = neutral) — Gojo / Sukuna Shinjuku's reader ──
const numpad = (raw, facing) => {
  const fw = facing === -1 ? raw.left : raw.right, bk = facing === -1 ? raw.right : raw.left
  const h = fw && !bk ? 1 : bk && !fw ? -1 : 0, v = raw.down && !raw.up ? -1 : raw.up && !raw.down ? 1 : 0
  return 5 + h + v * 3
}
function readEdges(f, s, raw) {
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'charge', 'grab', 'left', 'right', 'down']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, at: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }   // tick = identity, at = age on the SIM clock (hitstop holds the buffer)
    if (!v && s.prev[k]) s.edges[k + 'Up'] = { tick: s.tick, at: s.clock }
    s.prev[k] = v
  }
  const d = numpad(raw, f.facing || 1)
  if (!s.dirs.length || s.dirs[s.dirs.length - 1].d !== d) { s.dirs.push({ d, t: s.clock }); if (s.dirs.length > 16) s.dirs.shift() }   // motion timing on the sim clock too
}
function motion(s, seq, win = 20, tail = 8) {
  let i = seq.length - 1
  for (let j = s.dirs.length - 1; j >= 0 && i >= 0; j--) {
    const e = s.dirs[j]
    if (s.clock - e.t > win) break
    if (e.d === seq[i]) { if (i === seq.length - 1) { const next = s.dirs[j + 1]; if (next && s.clock - next.t > tail) return false } i-- }
  }
  return i < 0
}
export const fresh = (s, k, win = 8) => !!(s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].at <= win)
export const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
export const MOTIONS = {
  qcf: s => motion(s, [2, 3, 6], 18) || motion(s, [2, 6], 14),                  // ↓↘→
  dp: s => motion(s, [6, 2, 3], 20) || motion(s, [6, 3], 14),                   // →↓↘
  qcb: s => motion(s, [2, 1, 4], 18) || motion(s, [2, 4], 14),                  // ↓↙←
  doubleQcf: s => motion(s, [2, 3, 6, 2, 3, 6], 40),                            // ↓↘→↓↘→
  downDown: s => { let n = 0, seen5 = false; for (let j = s.dirs.length - 1; j >= 0; j--) { const e = s.dirs[j]; if (s.clock - e.t > 24) break; if (e.d === 2 || e.d === 1 || e.d === 3) { if (seen5 || n === 0) n++; seen5 = false } else if (e.d === 5) seen5 = true } return n >= 2 },
}

// ── START A MOVE (combat.startMove frameExact path + the `omv` descriptor). Every check happens before anything is spent.
export function startOmvMove(f, key, W, o = {}) {
  if (!isOmv(f)) return false
  const s = omvState(f), md = OMV_MOVES[key], g = grounded(f), fly = omvFlying(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || s.crash > 0 || s.land > 0) return false
  const air = !g
  if (md.air && !air) return false
  if (md.airOnly && !air) return false
  if (!md.air && !md.airOk && air && !(fly && o.flyOk)) return false
  if (key === 'kUnimp' && s.cd.unimp > 0) { cue(f, 'reject'); return false }
  if (key === 'kEscape' && ((f.ultimateCooldown || 0) > 0)) { cue(f, 'reject'); return false }
  const cost = (md.bars || 0) * BAR + (key === 'kEscape' ? ESCAPE.cost : 0)
  if (!f.infiniteEnergy && (f.energy || 0) < cost) { cue(f, 'reject'); return false }
  if (o.cancel) endOmvAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (!f.infiniteEnergy && cost) { f.energy = Math.max(0, (f.energy || 0) - cost); s.stats.spent += cost }
  f.currentMove = key
  const a = f.currentAttack
  a.omv = { key, dir: o.dir ?? (f.facing || 1), serial: ++s.serial, released: false, contact: false, clean: false, frac: 0, fired: 0, chain: !!o.cancel }
  a.hasHit = !!md.noBody
  if (md.isUltimate) a.isUltimate = true
  if (md.super) a.super = true
  f.isBlocking = false; f.isCharging = false
  if (!fly && g) f.vx = 0                         // grounded moves plant him (walk speed never carries into a move); in flight his momentum carries the punch
  f.dashTimer = 0; f._backDash = false            // a dash from the motion (↓↘→ / ↓↙← can read as a double-tap) never carries into the move
  if (key === 'kEscape') { f.ultimateCooldown = ESCAPE.ultCooldown; s.stats.escape++ }
  onStart(f, s, key, a, W, o)
  cue(f, key)
  return true
}
function onStart(f, s, key, a, W, o) { onStartMove(f, s, key, a, W, o, KIT) }

// ── PER-FRAME TICK (1v1 + FFA combat steps, before the command layer) ──
export function tickOmv(f, opp, raw, W) {
  if (!isOmv(f)) { if (f?._omv) clearOmv(f); return }
  const s = omvState(f)
  E.W = W
  s.tick++
  readEdges(f, s, raw || {})
  presentTick(f, s, opp, W)
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 60) s.fx.splice(i, 1)
  for (const o of (W?.fighters?.() || [])) if (o && o !== f) wallTick(o, W, s)
  if (f.health <= 0) { releaseHeld(f); f._flightBrake = false; return }
  if (f.hitstop > 0) return
  s.clock++
  if (s.cd.unimp > 0) s.cd.unimp--
  chargeTap(f, s, raw || {})
  const fly = omvFlying(f)
  f._flightBrake = !!(fly && raw?.block && !(f.hitstun > 0))
  if (f._flightBrake && !s.prev._brk) { s.stats.brakes++; cue(f, 'brake') }
  s.prev._brk = f._flightBrake
  const sp = omvSpeed(f), frac = Math.min(1, sp / TOP)
  if (sp > s.stats.topSpeed) s.stats.topSpeed = r1(sp)
  if (s.cpu && s.clock - s.cpu.seen < 3) cpuTick(f, s, opp, W, raw || {})
  // interruption: a hit / grab ends his live move and lets go of anything he holds
  const a = live(f)
  if (a && (f.hitstun > 0 || f.isGrabbed)) { endOmvAttack(f); releaseHeld(f); s.rush = null; s.ev = null; s.counter = null }
  if (s.crash > 0) { crashTick(f, s, W); s.pv = { vx: f.vx || 0, vy: f.vy || 0, x: f.x, y: f.y, sp: 0 }; return }
  if (s.land > 0) { if (--s.land === 0) cue(f, 'landDone'); f.vx = 0 }
  if (fly || s.rush) flightEvents(f, s, W, frac)
  speedScaleTick(f, s, frac)
  specialsTick(f, s, W, opp, raw || {})
  s.pv = { vx: f.vx || 0, vy: f.vy || 0, x: f.x, y: f.y, sp: r1(omvSpeed(f)) }
}

// Charge TAP on the sim clock (Dseyl's method: game.js handleChargeRelease skips him) — takeoff / come down, the
// same control every flight-profile flier uses. A hold (> 14 f) is the universal meter charge on the ground instead.
function chargeTap(f, s, raw) {
  const p = s.fl, ch = !!raw.charge
  if (ch && !p.prevCharge) p.chg = 0
  if (ch) p.chg++
  if (!ch && p.prevCharge && p.chg <= 14) p.pend = 1
  if (p.pend > 0 && --p.pend === 0 && !(f.hitstun > 0) && !f.isGrabbed && !live(f) && f.health > 0 && s.crash === 0 && s.land === 0) {
    const was = omvFlying(f)
    if (flightToggleInput(f)) { p.toggles++; if (!was) { s.stats.takeoffs++; cue(f, 'takeoff'); pushFx(s, 'takeoff', ctrX(f), feet(f)) } }
  }
  p.prevCharge = ch
}

// SPEED IS DAMAGE: while a normal is live its damage / knockback follow his speed at this frame (the engine reads the
// numbers on the frame it connects) — +0 % standing, +60 % at top speed
function speedScaleTick(f, s, frac) {
  const a = live(f); if (!a || !NORMALS.includes(a.omv.key)) return
  // a CHAINED Haymaker steps in (4 px / frame through frames 3–11 = 36 px): the chain's knockback never pushes the foe out of it
  if (a.omv.key === 'kHay' && a.omv.chain && grounded(f) && !omvFlying(f)) { const t = elapsed(a); if (t >= 3 && t < 12) f.x += a.omv.dir * 4 }
  const md = OMV_MOVES[a.omv.key], k = speedMult(frac)
  if (a.omv.contact) return                     // frozen at the impact frame
  a.omv.frac = Math.max(a.omv.frac || 0, +frac.toFixed(3))   // the PEAK speed carried into the punch (a body push the frame before contact doesn't rob it)
  a.damage = Math.round(md.damage * k); a.knockbackX = +(md.knockbackX * k).toFixed(2); a.knockbackY = +(md.knockbackY * k).toFixed(2)
  if (omvFlying(f) && grounded(f)) endOmvAttack(f, 3)
  if (md.air && grounded(f) && elapsed(a) > 2 && !omvFlying(f)) endOmvAttack(f, 3)
}

// ── FLIGHT EVENTS: sonic boom (crossing 90 %), wall crash (≥ 70 % into a wall / the camera edge), hard landing (≥ 70 %) ──
function flightEvents(f, s, W, frac) {
  const pv = s.pv, pvSp = Math.hypot(pv.vx, pv.vy)
  // SONIC BOOM — once per acceleration (re-arms below 60 %): R13 white burst + a 20-damage push box
  if (frac >= FLIGHT.boomAt && s.boomArmed) {
    s.boomArmed = false; s.stats.booms++
    pushFx(s, 'boom', ctrX(f), ctrY(f), { dir: Math.sign(f.vx || f.facing || 1) })
    cue(f, 'boom')
    for (const o of foesOf(f, W)) {
      const dx = ctrX(o) - ctrX(f), dy = ctrY(o) - ctrY(f)
      if (dx * dx + dy * dy > FLIGHT.boomR * FLIGHT.boomR) continue
      if (strike(f, o, { raw: FLIGHT.boomRaw, hitstun: 12, kbx: FLIGHT.boomKb, kby: -3, chip: 0, dir: dx >= 0 ? 1 : -1, move: 'omv_sonic_boom', type: 'energy', hitstop: 3, fx: 'boomHit' }, W) === 'hit') s.stats.boomHits++
    }
  }
  if (frac < FLIGHT.boomRearm) s.boomArmed = true
  if (s.rush) return                                  // a rush handles its own wall / landing contact
  // WALL CRASH: last frame he was moving ≥ 70 % with a horizontal component into a wall; this frame a wall (stage or the
  // camera edge) has stopped that component (x barely moved, vx collapsed)
  const movedX = Math.abs(f.x - pv.x)
  if (pvSp >= TOP * FLIGHT.crashAt && Math.abs(pv.vx) > 6 && movedX < Math.abs(pv.vx) * 0.5 && Math.abs(f.vx || 0) < Math.abs(pv.vx) * 0.5) {
    startCrash(f, s, W, Math.sign(pv.vx)); return
  }
  // HARD LANDING: touching the floor with a downward component at ≥ 70 %
  const fl = floorOf(f, W)
  if (omvFlying(f) && pv.vy > 2 && pvSp >= TOP * FLIGHT.landAt && feet(f) >= fl - 1.5) hardLanding(f, s, W, fl)
}
function startCrash(f, s, W, dir) {
  s.crash = FLIGHT.crashFrames; s.stats.crashes++
  const c = ensureFlightState(f); c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false
  f.vx = -dir * 2; f.vy = 0; f._flightBrake = false
  if (live(f)) endOmvAttack(f)
  releaseHeld(f); s.rush = null
  W.damage(f, dmg(FLIGHT.crashSelf), { source: 'omv-crash', attacker: f, move: 'omv_wall_crash', damageType: 'blunt' })
  f._wallBounceShake = true                            // small camera shake (game.js consumes it: camera.shake(8, 6))
  f._spriteCastMove = 'omvCrash'; f._spriteCastTimer = FLIGHT.crashFrames
  pushFx(s, 'crash', dir > 0 ? f.x + f.w : f.x, ctrY(f), { dir })
  cue(f, 'crash')
}
function crashTick(f, s, W) {
  s.crash--
  f._spriteCastMove = 'omvCrash'; f._spriteCastTimer = Math.max(f._spriteCastTimer || 0, 2)
  if (grounded(f)) f.vx = 0
  if (s.crash === 0) cue(f, 'crashDone')
}
function hardLanding(f, s, W, fl) {
  const c = ensureFlightState(f); c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false
  f.y = fl - (f.h || 94); f.vy = 0; f.vx = 0; f.onGround = true; f.grounded = true; f._flightBrake = false
  if (live(f)) endOmvAttack(f)
  s.land = FLIGHT.landRecovery; s.stats.hardLands++
  f._spriteCastMove = 'omvLandHard'; f._spriteCastTimer = FLIGHT.landRecovery
  pushFx(s, 'landBurst', ctrX(f), fl); pushFx(s, 'boom', ctrX(f), fl - 40, { dir: f.facing || 1 })
  cue(f, 'hardLand')
  for (const o of foesOf(f, W)) {
    if (Math.abs(ctrX(o) - ctrX(f)) > FLIGHT.landR || fl - feet(o) > 70) continue
    if (strike(f, o, { raw: FLIGHT.landRaw, hitstun: 22, kbx: 8, kby: -6, chip: 0.1, dir: ctrX(o) >= ctrX(f) ? 1 : -1, move: 'omv_hard_landing', type: 'blunt', otg: true, hitstop: 5, fx: 'landHit' }, W) === 'hit') s.stats.landHits++
  }
}

// Blitz / Sky Hook / Meteor / Face in the Dirt / Unimpressed / Decree / THINK! / Escape Velocity: omnimanViltrumMoves.js
function specialsTick(f, s, W, opp, raw) {
  tickMoves(f, s, W, opp, raw, KIT)
  if (s.crater && ++s.crater.t > ESCAPE.craterLife) s.crater = null   // crater decal age (drawn from it; fades over 10 s)
}
// the kit the moves module strikes / cues / crashes through (no import cycle: it never imports this file)
const KIT = { strike: (...a) => strike(...a), pushFx: (...a) => pushFx(...a), cue: (...a) => cue(...a), foesOf: (...a) => foesOf(...a),
  grabStopped: (...a) => grabStopped(...a), startCrash: (...a) => startCrash(...a) }

// ── UNIMPRESSED defender gates (combat.js melee + projectile paths): inside his counter window the hit is not felt ──
const evLive = f => !!(f._omv?.ev && f._omv.ev.ph !== 'grab' && f._omv.ev.ph !== 'whiff')   // the cinematic (ascent → settle): nobody else touches him
export function omvMeleeGate(defender, attacker) {
  if (!isOmv(defender)) return false
  if (evLive(defender)) return true
  if (!defender._omv?.counter || !E.W) return false
  return unimpressedCatch(defender, defender._omv, attacker, E.W, KIT)
}
export function omvProjectileGate(defender, proj) {
  if (!isOmv(defender)) return null
  if (evLive(defender) && proj?.owner !== defender) return 'remove'
  if (!defender._omv?.counter || !E.W) return null
  if (proj?.owner === defender) return null
  return unimpressedCatch(defender, defender._omv, proj?.owner && proj.owner.health > 0 ? proj.owner : null, E.W, KIT) ? 'remove' : null
}

// ── PRESENTATION: intro (arrival burst on his first tick), win line once every foe is down ──
function presentTick(f, s, opp, W) {
  if (s.say && --s.say.t <= 0) s.say = null
  const foes = (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f)
  if (!s.said.intro) { s.said.intro = true; pushFx(s, 'arrive', ctrX(f), feet(f)); cue(f, 'intro') }
  if (!s.said.win && f.health > 0 && foes.length && foes.every(o => !(o.health > 0))) {
    s.said.win = true; s.say = { text: QUOTES.win, t: 220, kind: 'win' }; cue(f, 'win')
  }
}

// ── CPU (only when the CPU drives him; the stock AI keeps walking / normals through his command layer). Deterministic:
// the "roll" is the sim clock (Gojo / Sukuna Shinjuku's CPU roll), no RNG. The brief's four habits: Blitz with spacing,
// BRAKE before walls, Unimpressed on reads, Escape Velocity only on a clean opening. Plus: flight, Sky Hook as anti-air,
// Meteor from above, Face in the Dirt vs a guard, THINK! on a stunned foe. ──
const PACE = { dummy: Infinity, easy: 48, normal: 26, adaptive: 22, hard: 16, impossible: 11, master: 10 }   // in FREE frames (not attacking / stunned)
const READ = { easy: 2, normal: 4, adaptive: 5, hard: 7, impossible: 9, master: 9 }   // out of 10: how often he reads a close attack
export function markOmvCpu(f, difficulty) { if (!isOmv(f)) return; const s = omvState(f); s.cpu = { ...(s.cpu || {}), seen: s.clock, diff: difficulty || 'normal' } }
const opening = t => (t.hitstun > 0 && !t.isGrabbed) || (t.attacking && t.currentAttack && (t.currentAttack.total - t.currentAttack.timer) > (t.currentAttack.activeStart ?? t.currentAttack.startup ?? 6) + 2 && !t.currentAttack.hasHit)
function cpuTick(f, s, opp, W, raw) {
  const c = s.cpu, pace = PACE[c.diff] ?? 70
  if (!isFinite(pace)) return
  const foe = foesOf(f, W, opp)[0]; if (!foe) return
  const dir = ctrX(foe) >= ctrX(f) ? 1 : -1, dist = Math.abs(ctrX(foe) - ctrX(f)), e = f.energy || 0, fly = omvFlying(f)
  const roll = (s.clock * 7 + (c.n = (c.n || 0) + 1) * 13) % 10
  // BRAKE BEFORE WALLS (every frame while flying fast): the stage edge, or the camera edge (≈ 1 screen from the foe), within
  // ~12 frames of travel → hold the brake instead of crashing
  if (fly) {
    const ahead = ctrX(f) + (f.vx || 0) * 12, far = Math.abs(ahead - ctrX(foe)) > 1150
    const wall = ahead < 40 || ahead > sw(W) - 40 || (far && Math.sign(f.vx || 0) === Math.sign(ctrX(f) - ctrX(foe)))
    const floor = (f.vy || 0) > 6 && feet(f) + (f.vy || 0) * 10 > floorOf(f, W) && omvSpeedFrac(f) > 0.6
    if ((wall || floor) && omvSpeedFrac(f) > 0.45) { f._flightBrake = true; c.brakes = (c.brakes || 0) + 1 }
  }
  if (f.attacking || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || s.crash > 0 || s.land > 0 || s.rush || s.hold || s.ev) return
  const fire = (k, o = {}) => { f.facing = dir; const ok = startOmvMove(f, k, W, { dir, flyOk: fly, ...o }); if (ok) c.used = { ...(c.used || {}), [k]: ((c.used || {})[k] || 0) + 1 }; return ok }
  // UNIMPRESSED ON READS (any frame, not paced): the foe started a move right in front of him
  const fa = foe.attacking && foe.currentAttack ? foe.currentAttack : null
  if (fa && !fa.isUltimate && dist < 150 && !fly && grounded(f) && s.cd.unimp === 0 && (fa.total - fa.timer) <= 3 && roll < (READ[c.diff] ?? 4)) { fire('kUnimp'); return }
  if (c.wait == null) c.wait = pace
  if (--c.wait > 0) return
  c.wait = pace
  const gojoInf = (foe.rosterKey === 'gojo_shinjuku' && (foe._gs?.inf?.lv || 0) > 0) || ((foe.rosterKey || '') === 'gojo' && foe.infinityActive)
  // ESCAPE VELOCITY: only a clean opening (stunned / whiffed, close, not behind Infinity)
  if (!fly && e >= ESCAPE.cost && !(f.ultimateCooldown > 0) && dist < 420 && opening(foe) && !gojoInf && !foe.knockdownState && grounded(foe) && !(foe._flightCtl && isFlying(foe))) { fire('kEscape'); return }
  if (e >= THINK.cost && dist < 600 && foe.hitstun > 0 && !gojoInf && roll < 5) { fire('kThink'); return }
  if (fly) {
    if (!grounded(foe) && dist < 120 && roll < 6) return                        // the stock AI's flight punch handles it
    if (ctrY(foe) - ctrY(f) > 140 && dist < 160) { fire('kMeteor', { diag: dist > 60 }); return }
    if (dist < 220 || roll === 0) { if (flightToggleInput(f)) c.lands = (c.lands || 0) + 1; return }   // come down to fight
    return
  }
  if (!grounded(foe) && dist < 130 && foe.vy < 2) { fire('kSkyHook'); return }  // anti-air
  if (foe.isBlocking && dist < 110 && roll < 6) { fire('kDirt'); return }        // grab beats the guard
  if (dist > 240 && dist < 620 && roll < 6) { fire('kBlitz'); return }           // BLITZ WITH SPACING: inside the tap range
  if ((dist > 620 || (!grounded(foe) && dist > 200) || (dist > 380 && roll === 4)) && roll < 5) { if (flightToggleInput(f)) { s.stats.takeoffs++; cue(f, 'takeoff'); c.flights = (c.flights || 0) + 1 }; return }
  if (dist > 500 && roll === 9 && !fa) { fire('kDecree'); return }               // the arrogance: taunts from far away
}

// movement is his while a rush / hold / crash / hard landing / committed move owns it
export function omvLockedForMovement(f) {
  if (!isOmv(f)) return false
  const s = f._omv, a = f.attacking ? f.currentAttack : null
  const lock = (s && (s.rush || s.hold || s.ev || s.crash > 0 || s.land > 0)) || (a?.omv && OMV_MOVES[a.omv.key]?.noBody) || (a?.omv && !omvFlying(f))   // grounded normals plant him; flying normals keep his momentum (the flight step still runs)
  if (!lock) return false
  f._dashTap = false; f.dashTimer = 0; f._backDash = false   // the engine's dash sets vx inside the physics step even when locked
  return true
}
export { NORMALS, TECHNIQUES }
