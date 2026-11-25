// Invincible — Mark Grayson (invincible) — SIMULATION state + combat.js / physics hooks. Plain JSON on f._inv (snapshotted for
// the determinism hash, carried by replay / LAN through the inputs that produce it); sim ticks only: no RNG, no wall clock.
// Every export is a no-op for any other rosterKey. Engine functions arrive through registerInvEngine (set by invincible.js)
// so this file imports no engine module that imports it back (combat.js imports it for the hooks — no cycle).
//
// OWNED STATE: the zip (s.mv), flight tap / boom / no-block, CAN'T STAY DOWN + RESOLVE, the wall-bounce watch on a foe hit
// by the Invincible Punch (s.wall), NO HOLDING BACK (on the live attack), TERMINAL VELOCITY (s.tv), the CPU rhythm, render
// hints (s.fx ≤ 24, s.decal ≤ 2 — never read by the sim, left out of the hash).
import { INV_KEY, INV_MOVES, TECHNIQUES, NORMALS, QUOTES, SCREEN, BAR, FLIGHT, IPUNCH, SKYWARD, ZIP, CRASH, NHB, TV, CSD, WEIGHT,
  SPEED_MUL, FLIGHT_TAP, TOP, speedFrac, speedMult, dmg, invincible } from './invincibleData.js'
const STATS = invincible.stats
import { flightToggleInput, flightTakeoff, isFlying, ensureFlightState, FLIGHT_PHASE } from './flight.js'
import { startInvTvPayoff } from './invincibleUlt.js'   // TERMINAL VELOCITY: the frozen impact cinematic on a direct hit (cineRegistry)

export const isInv = f => f?.rosterKey === INV_KEY
const E = { startMove: null, comboScale: null }
export function registerInvEngine(o) { Object.assign(E, o) }

export const invState = f => {
  if (f._inv) return f._inv
  return (f._inv = { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, dirs: [], serial: 0,
    dt: null, zq: null, mv: null, zip: { air: ZIP.airCharges, ground: ZIP.groundCharges, groundAt: -999, wasGround: true },
    fl: { chg: 0, prevCharge: false, takeoffs: 0, toggles: 0, boomArmed: true, wasFlying: false },
    csd: { used: false, pend: false, phase: null }, resolve: 0, wall: {}, tv: null,
    say: null, said: { intro: false, win: false }, cpu: null, fx: [], decal: [], cues: [],
    stats: { jabs: 0, barrageHits: 0, barrageLaunch: 0, ipunch: 0, ipunchHits: 0, ipunchWhiff: 0, wallBounces: 0, skyward: 0, skywardHits: 0,
      skywardFlight: 0, zips: 0, zipCancels: 0, zipPhased: 0, crash: 0, crashHits: 0, nhb: 0, nhbHits: 0, nhbDmg: 0, tv: 0, tvDirect: 0, tvShock: 0,
      tvWhiff: 0, tvStopped: 0, booms: 0, boomHits: 0, fpunchHits: 0, takeoffPush: 0, csd: 0, resolveHits: 0, stopped: 0, spent: 0, noBlockFrames: 0, guardCpu: 0 } })
}
const cue = (f, c, extra) => { const s = invState(f); s.cues.push(extra ? { c, ...extra } : c); if (s.cues.length > 32) s.cues.shift() }
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.inv) ? f.currentAttack : null
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
const boxHit = (o, x, y, w, h) => o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y
function pushFx(s, kind, x, y, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), t: 0, ...(extra || {}) }); if (s.fx.length > 24) s.fx.shift() }
export function endInvAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }
const vsOmni = (f, W, opp) => foesOf(f, W, opp).concat((W?.fighters?.() || []).filter(o => o && o !== f)).some(o => QUOTES.omniKeys.includes((o.rosterKey || '').toLowerCase()))

export function clearInv(f) {
  if (!f) return
  if (live(f)) endInvAttack(f)
  delete f._inv; delete f._invRemoteInput; delete f._invSpeed; delete f._invNoBlock; delete f._invPhase; delete f._invAlpha; delete f._invResolve
}
export function clearInvMarks(f) { if (!f) return; delete f._invWall }

// ── public reads (HUD / harness / AI) ──
export const invResolve = f => !!(isInv(f) && (f._inv?.resolve || 0) > 0)
export const invFlying = f => isInv(f) && isFlying(f)

// ── combat.js hooks ──
export function invHitbox(f) {
  const a = f.currentAttack, m = a?.inv, md = INV_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 22), w: a.rangeX, h: a.rangeY }
}
export function invBlock(f, d, a) {
  if (!isInv(f) || !a?.inv) return
  d.blockstun = INV_MOVES[a.inv.key].blockstun; a.inv.contact = true; a.inv.contactTick = invState(f).tick
}
export function invHit(f, d, a) {
  if (!isInv(f) || !a?.inv) return
  const s = invState(f), m = a.inv
  m.contact = true; m.contactTick = s.tick
  if (d.isBlocking) return
  m.clean = true; m.victim = d.side; f._cmdHitLanded = true
  if (s.resolve > 0) s.stats.resolveHits++
  if (m.key === 'kFpunch') s.stats.fpunchHits++
  if (m.key === 'kUpper' || m.key === 'kRise') pushFx(s, 'impact', ctrX(d), ctrY(d) - 10, { dir: m.dir, big: m.key === 'kUpper' })
  else pushFx(s, 'spark', ctrX(d), ctrY(d), { dir: m.dir })
}
// knockback hook (after the engine's knockback): Mark as DEFENDER = light weight; Mark's Sweep = a knockdown
export function invKnockback(attacker, defender, atk) {
  if (isInv(defender)) { defender.vx = (defender.vx || 0) * WEIGHT.kbx; if ((defender.vy || 0) < 0) defender.vy *= WEIGHT.kby }
  if (isInv(attacker) && atk?.inv?.key === 'kSweep' && !defender.isBlocking) {
    defender.knockdownState = true; defender.knockdownTimer = Math.max(defender.knockdownTimer || 0, INV_MOVES.kSweep.knockdown)
    defender.vx = (atk.inv.dir || 1) * 3; defender.vy = Math.min(defender.vy || 0, -3)
  }
}
// damage choke-point hooks (combat.applyScaledDamage): RESOLVE makes him take +25 %; CAN'T STAY DOWN floors one lethal hit
export function invDamageMods(target, raw, opts = {}) {
  if (isInv(target) && (target._inv?.resolve || 0) > 0 && raw > 0) return raw * CSD.dmgIn
  return raw
}
export function invKoFloor(target, floor, before, dealt) {
  if (!isInv(target) || !(before > 0) || before - dealt > 0) return floor
  const s = invState(target)
  if (s.csd.used || target._invNoSave) return floor
  s.csd.used = true; s.csd.pend = true; s.stats.csd++
  return Math.max(floor, 1)
}

// ── STRIKE: the one hit path for his scripted volumes (barrage, Invincible Punch, Skyward, Crash Down, booms, NO HOLDING BACK,
//    TERMINAL VELOCITY). Damage leaves through the damage choke-point (W.damage = applyScaledDamage), so every damage-level
//    defence applies — Satoru Gojo's Infinity included: a strike his Infinity zeroes is "stopped" (no hitstun, no knockback).
function strike(f, t, P, W) {
  if (!t || !(t.health > 0) || t._banished || t._cubeTrapUntouchable) return 'miss'
  if ((t.invulnTimer || 0) > 0) return 'miss'
  if (t.domainUntouchable) return 'miss'
  if (t.knockdownState && !P.otg) return 'miss'
  if (t._gs?.blink?.inv) return 'miss'
  // TERMINAL VELOCITY vs Satoru Gojo (Shinjuku): ANY level of Infinity stops it dead — he never touches him (the brief's rule;
  // stricter than Gojo's own L1 "supers connect", because the whole move is one physical body arriving)
  if (P.infinityStops && t.rosterKey === 'gojo_shinjuku' && (t._gs?.inf?.lv || 0) > 0) { const s0 = invState(f); s0.stats.stopped++; cue(f, 'stopped'); pushFx(s0, 'stopped', ctrX(t), ctrY(t), { dir: ctrX(t) >= ctrX(f) ? 1 : -1 }); return 'stopped' }
  const s = invState(f), dir = P.dir ?? (ctrX(t) >= ctrX(f) ? 1 : -1)
  const facingSrc = (t.facing || 1) === -dir
  const guards = t.isBlocking && facingSrc && !P.unblockable && (!P.low || !!t._crouching)
  const mult = (P.mult || 1) * (s.resolve > 0 ? CSD.dmgOut : 1)
  if (guards) {
    W.damage(t, dmg(Math.max(1, Math.round(P.raw * mult * (P.chip ?? 0.12)))), { source: 'inv-chip', attacker: f, move: P.move, damageType: P.type || 'blunt' })
    t.blockstun = Math.max(t.blockstun || 0, P.blockstun || 14)
    if (P.push) t.vx = dir * P.push
    cue(f, 'blocked'); pushFx(s, 'block', ctrX(t), ctrY(t), { dir })
    return 'block'
  }
  const hp0 = t.health
  const scale = E.comboScale && !P.noScale ? E.comboScale(f) : 1
  W.damage(t, dmg(P.raw * mult) * scale, { source: 'inv-strike', attacker: f, move: P.move, damageType: P.type || 'blunt', tier: P.tier })
  if (t.rosterKey === 'gojo_shinjuku' && (t._gs?.inf?.lv || 0) > 0 && t.health >= hp0) {   // Infinity: never touched
    s.stats.stopped++; cue(f, 'stopped'); pushFx(s, 'stopped', ctrX(t), ctrY(t), { dir }); return 'stopped'
  }
  t.hitstun = Math.max(t.hitstun || 0, P.hitstun || 16)
  t.isBlocking = false
  if (t.attacking && !t.currentAttack?.isUltimate && P.interrupt !== false) { t.attacking = false; t.currentAttack = null; t.currentMove = null }
  if (P.kbx != null) t.vx = dir * P.kbx * (isInv(t) ? WEIGHT.kbx : 1)
  if (P.kby != null && P.kby !== 0) { t.vy = P.kby * (isInv(t) && P.kby < 0 ? WEIGHT.kby : 1); if (P.kby < 0) { t.onGround = false; t.grounded = false } }
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 6
  f.energy = Math.min(f.maxEnergy || 2 * BAR, (f.energy || 0) + Math.round(P.raw * 0.08))
  if (P.hitstop) { f.hitstop = Math.max(f.hitstop || 0, P.hitstop); t.hitstop = Math.max(t.hitstop || 0, P.hitstop) }
  pushFx(s, P.fx || 'spark', ctrX(t), ctrY(t), { dir })
  return 'hit'
}

// ── input edges + facing-relative motion buffer (numpad digits; 5 = neutral) — the Shinjuku fighters' reader ──
const numpad = (raw, facing) => {
  const fw = facing === -1 ? raw.left : raw.right, bk = facing === -1 ? raw.right : raw.left
  const h = fw && !bk ? 1 : bk && !fw ? -1 : 0, v = raw.down && !raw.up ? -1 : raw.up && !raw.down ? 1 : 0
  return 5 + h + v * 3
}
function readEdges(f, s, raw) {
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'charge', 'grab', 'left', 'right', 'down']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    if (!v && s.prev[k]) s.edges[k + 'Up'] = { tick: s.tick }
    s.prev[k] = v
  }
  // the buffer is facing-relative: when he turns round (a cross-up Zip, a snap turn) the old directions mean the opposite
  // thing now, so they are dropped (a ← that was "forward" before the Zip must not turn ↓↘→ into →↓↘)
  if (s.face !== (f.facing || 1)) { s.face = f.facing || 1; s.dirs.length = 0 }
  const d = numpad(raw, f.facing || 1)
  if (!s.dirs.length || s.dirs[s.dirs.length - 1].d !== d) { s.dirs.push({ d, t: s.tick }); if (s.dirs.length > 16) s.dirs.shift() }
}
function motion(s, seq, win = 20, tail = 8) {
  let i = seq.length - 1
  for (let j = s.dirs.length - 1; j >= 0 && i >= 0; j--) {
    const e = s.dirs[j]
    if (s.tick - e.t > win) break
    if (e.d === seq[i]) { if (i === seq.length - 1) { const next = s.dirs[j + 1]; if (next && s.tick - next.t > tail) return false } i-- }
  }
  return i < 0
}
// a press's age counts only frames he is NOT frozen in hitstop (a cancel input mashed during the hit freeze stays buffered)
export const fresh = (s, k, win = 8) => !!(s.edges[k] && s.used[k] !== s.edges[k].tick && (s.clock - (s.edges[k].clock ?? s.clock)) <= win && s.tick - s.edges[k].tick <= win + 30)
export const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
export const MOTIONS = {
  qcf: s => motion(s, [2, 3, 6], 18) || motion(s, [2, 6], 14),                 // ↓↘→
  dp: s => motion(s, [6, 2, 3], 18) || motion(s, [6, 3], 12) || motion(s, [6, 2], 12),   // →↓↘
  downDown: s => { let n = 0, seen5 = false; for (let j = s.dirs.length - 1; j >= 0; j--) { const e = s.dirs[j]; if (s.tick - e.t > 24) break; if (e.d === 2 || e.d === 1 || e.d === 3) { if (seen5 || n === 0) n++; seen5 = false } else if (e.d === 5) seen5 = true } return n >= 2 },
}

// ── START A MOVE (combat.startMove frameExact path + the `inv` descriptor). Every check happens before anything is spent.
export function startInvMove(f, key, W, o = {}) {
  if (!isInv(f)) return false
  const s = invState(f), md = INV_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (s.mv) return false
  if (md.air && g) return false
  if (md.airOnly && g) return false
  if (!md.air && !md.airOk && !g && !isFlying(f) && !o.internal) return false
  if (key === 'kTV' && ((f.ultimateCooldown || 0) > 0 || (!f.infiniteEnergy && (f.energy || 0) < TV.cost))) { cue(f, 'reject'); return false }
  const cost = (md.cost || 0) + (md.bars || 0) * BAR + (key === 'kTV' ? TV.cost : 0)
  if (!f.infiniteEnergy && (f.energy || 0) < cost) { cue(f, 'reject'); return false }
  if (o.cancel) endInvAttack(f)
  const fl = isFlying(f), frac = fl ? speedFrac(f) : 0
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (!f.infiniteEnergy && cost) { f.energy = Math.max(0, (f.energy || 0) - cost); s.stats.spent += cost }
  f.currentMove = key
  const a = f.currentAttack
  a.inv = { key, dir: o.dir ?? (f.facing || 1), serial: ++s.serial, released: false, contact: false, clean: false, fly: fl, frac: +frac.toFixed(4), hits: 0, done: false }
  a.hasHit = !!md.noBody
  // RESOLVE (+20 %) and FLIGHT SPEED (+0 % standing … +40 % at top speed) scale the engine damage of a normal at its start
  if (!md.noBody) a.damage = Math.round(a.damage * (fl ? speedMult(frac) : 1) * (s.resolve > 0 ? CSD.dmgOut : 1))
  if (md.isUltimate) a.isUltimate = true
  if (md.super) a.super = true
  f.isBlocking = false; f.isCharging = false
  if (g && !md.air && !fl) f.vx = 0
  if (key === 'kUpper') f.jumpHeld = true
  if (key === 'kTV') { f.ultimateCooldown = TV.ultCooldown; s.tv = { phase: 'takeoff', x: null, y0: Math.round(f.y), t: 0, hit: null }; s.stats.tv++; leaveFlight(f) }
  if (key === 'kIPunch') s.stats.ipunch++
  if (key === 'kSkyward') s.stats.skyward++
  if (key === 'kCrash') { s.stats.crash++; leaveFlight(f) }
  if (key === 'kNHB') s.stats.nhb++
  if (key === 'kJab') s.stats.jabs++
  if (key === 'kFpunch' && fl) fpunchLock(f, a.inv, md, 0, foesOf(f, W, null))
  cue(f, key)
  return true
}
function leaveFlight(f) { const c = f._flightCtl; if (c && isFlying(f)) { c.phase = FLIGHT_PHASE.GROUNDED; c.dashTimer = 0 } }

// ── PER-FRAME TICK (1v1 + FFA combat steps, before the command layer) ──
export function tickInv(f, opp, raw, W) {
  if (!isInv(f)) { if (f?._inv) clearInv(f); return }
  const s = invState(f)
  f._invSpeed = SPEED_MUL * (s.resolve > 0 ? CSD.speed : 1)   // physics.js: walk / run / air / dash
  // his own speed / dash stats (the engine's 84 / 16 roster defaults get stamped back over them in some resets — the
  // Batman / Dseyl / Higuruma re-assert, gated on him)
  if (f.baseSpeed !== STATS.speed) { f.baseSpeed = f.speed = STATS.speed; f.dashSpeed = STATS.dashSpeed; f.dashDuration = STATS.dashDuration }
  s.tick++
  readEdges(f, s, raw || {})
  presentTick(f, s, opp, W)
  doubleTapTick(f, s, raw || {})
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 60) s.fx.splice(i, 1)
  for (let i = s.decal.length - 1; i >= 0; i--) if (++s.decal[i].t > TV.crackLife) s.decal.splice(i, 1)
  if (f.health <= 0) { s.mv = null; s.tv = null; f._invPhase = 0; f._invAlpha = 1; f._invNoBlock = false; return }
  if (f.hitstop > 0) return
  s.clock++
  csdTick(f, s, W, opp)
  f._invSpeed = SPEED_MUL * (s.resolve > 0 ? CSD.speed : 1)
  wallTick(f, s, W)
  flightTick(f, s, raw || {}, W, opp)
  chargeRefill(f, s)
  // interruption: a hit / grab ends his live move (Terminal Velocity and No Holding Back keep him invulnerable)
  const a = live(f)
  if (a && (f.hitstun > 0 || f.isGrabbed)) { if (a.inv.key === 'kTV') { s.tv = null; f._invAlpha = 1 } endInvAttack(f) }
  if (s.cpu && s.clock - s.cpu.seen < 3) cpuTick(f, s, opp, W)
  mobilityTick(f, s, raw || {}, opp, W)
  const A = live(f)
  if (!A || f.hitstun > 0 || f.isGrabbed) { if (!A) f._invAlpha = 1; return }
  moveTick(f, s, A, W, opp, raw || {})
}

// ── PRESENTATION: intro line vs Omni-Man, a win line once every foe is down. Plain JSON; bubbles / voice read s.say + cues ──
function presentTick(f, s, opp, W) {
  if (s.say && --s.say.t <= 0) s.say = null
  const foes = (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f)
  if (!s.said.intro) {
    s.said.intro = true
    if (foes.some(o => QUOTES.omniKeys.includes((o.rosterKey || '').toLowerCase()))) { s.say = { text: QUOTES.introVsOmni, t: 170, kind: 'intro' }; cue(f, 'introVoice') }
    pushFx(s, 'land', ctrX(f), feet(f))   // the intro lands inside the R1 shockwave (the intro strip's first frame)
  }
  if (!s.said.win && f.health > 0 && foes.length && foes.every(o => !(o.health > 0))) {
    s.said.win = true; s.say = { text: QUOTES.win, t: 200, kind: 'win' }; cue(f, 'winVoice')
  }
}

// ── CAN'T STAY DOWN → RESOLVE ──
function csdTick(f, s, W, opp) {
  if (s.resolve > 0) { s.resolve--; f._invResolve = s.resolve; if (s.resolve === 0) cue(f, 'resolveEnd') }
  if (s.csd.pend) {
    s.csd.pend = false; s.csd.phase = 'down'
    if (live(f)) endInvAttack(f)
    s.mv = null; s.tv = null; f._invAlpha = 1; f._invPhase = 0
    leaveFlight(f)
    f.hitstun = 0; f.blockstun = 0; f.vx = 0
    f.knockdownState = true; f.knockdownTimer = CSD.down; f.invulnTimer = Math.max(f.invulnTimer || 0, CSD.invuln)
    const omni = vsOmni(f, W, opp)
    s.say = { text: omni ? QUOTES.notYetVsOmni : QUOTES.notYet, t: 150, kind: 'csd' }
    cue(f, 'csd'); pushFx(s, 'csd', ctrX(f), feet(f))
  }
  if (s.csd.phase === 'down' && !f.knockdownState) {
    s.csd.phase = 'resolve'; s.resolve = CSD.resolve; f._invResolve = s.resolve; cue(f, 'resolve'); pushFx(s, 'resolve', ctrX(f), ctrY(f))
  }
}

// ── INVINCIBLE PUNCH wall bounce: the foe it launched hits a stage wall within 40 f → the engine's WALL_SPLAT fields ──
function wallTick(f, s, W) {
  for (const o of (W?.fighters?.() || [])) {
    const m = o && o !== f ? o._invWall : null
    if (!m) continue
    if (m.kd) {   // Barrage launch: knocked down on landing
      if (--m.kdT <= 0 || !(o.health > 0)) { delete m.kd; delete m.kdT }
      else if ((o.onGround || o.grounded) && !(o.vy < 0) && m.kdT < 88) {
        o.knockdownState = true; o.knockdownTimer = Math.max(o.knockdownTimer || 0, m.kd); o.hitstun = 0; o.vx = 0
        delete m.kd; delete m.kdT; cue(f, 'kdLand')
      }
    }
    if (m.t == null) { if (!m.kd) delete o._invWall; continue }
    if (--m.t <= 0 || !(o.health > 0)) { delete m.t; delete m.dir; if (!m.kd) delete o._invWall; continue }
    // a wall = the stage edge, or the screen edge (the camera clamp stops a knocked-back fighter there just the same):
    // flying at the wall with real knockback speed and not moving any more
    const blocked = !(o.hitstop > 0) && m.px != null && Math.abs(o.x - m.px) < 0.5 && Math.sign(o.vx || 0) === m.dir && Math.abs(o.vx || 0) >= 6
    const atWall = o.x <= 1 || o.x >= sw(W) - (o.w || 60) - 1 || blocked
    m.px = o.x
    if (!atWall) continue
    o.wallBounce = true; o._wallSplat = IPUNCH.wall.frames; o.hitstun = Math.max(o.hitstun || 0, IPUNCH.wall.hitstun)
    o._wallBounceShake = true; o.vx = -m.dir * IPUNCH.kbx * IPUNCH.wall.bounce
    delete m.t; delete m.dir; delete m.px; if (!m.kd) delete o._invWall
    s.stats.wallBounces++; cue(f, 'wallBounce'); pushFx(s, 'impact', o.x <= 1 ? o.x : o.x + o.w, ctrY(o), { dir: -m.dir, big: true })
  }
}

// ── FLIGHT: Charge TAP on the sim clock (Dseyl's reader) · the takeoff shockwave · SONIC BOOM · no block above 60 % ──
function flightTick(f, s, raw, W, opp) {
  const p = s.fl, ch = !!raw.charge
  if (ch && !p.prevCharge) p.chg = 0
  if (ch) p.chg++
  const busy = f.hitstun > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || live(f) || s.mv
  if (!ch && p.prevCharge && p.chg <= FLIGHT_TAP.maxHold && !busy) {
    const wasG = grounded(f) && !isFlying(f)
    if (flightToggleInput(f)) {
      p.toggles++
      if (wasG && isFlying(f)) {   // TAKEOFF from the ground: the R1 shockwave, a 15-damage push on an adjacent foe
        p.takeoffs++; cue(f, 'takeoff'); pushFx(s, 'takeoff', ctrX(f), feet(f))
        for (const o of foesOf(f, W, opp)) {
          const gap = Math.abs(ctrX(o) - ctrX(f)) - ((o.w || 48) + (f.w || 48)) / 2
          if (gap > FLIGHT.takeoffR || Math.abs(feet(o) - feet(f)) > 90) continue
          if (strike(f, o, { raw: FLIGHT.takeoffRaw, hitstun: 14, kbx: FLIGHT.takeoffKb, kby: -3, move: 'inv_takeoff', type: 'impact', fx: 'spark', noScale: true, push: 4 }, W) === 'hit') s.stats.takeoffPush++
        }
      }
    }
  }
  p.prevCharge = ch
  const fl = isFlying(f), frac = fl ? speedFrac(f) : 0
  if (fl && frac >= FLIGHT.boomAt && p.boomArmed) {   // SONIC BOOM — once per acceleration
    p.boomArmed = false; s.stats.booms++; cue(f, 'boom'); pushFx(s, 'boom', ctrX(f), ctrY(f), { dir: (f.vx || 0) >= 0 ? 1 : -1 })
    for (const o of foesOf(f, W, opp)) {
      if (Math.hypot(ctrX(o) - ctrX(f), ctrY(o) - ctrY(f)) > FLIGHT.boomR + (o.w || 48) / 2) continue
      if (strike(f, o, { raw: FLIGHT.boomRaw, hitstun: 16, kbx: FLIGHT.boomKb, kby: -4, move: 'inv_sonic_boom', type: 'impact', fx: 'spark', noScale: true, push: 6 }, W) === 'hit') s.stats.boomHits++
    }
  }
  if (!fl || frac < FLIGHT.boomRearm) p.boomArmed = true
  f._invNoBlock = !!(fl && frac > FLIGHT.blockMax)
  if (f._invNoBlock) { f.isBlocking = false; s.stats.noBlockFrames++ }
  if (fl && !p.wasFlying) s.zip.air = ZIP.airCharges
  p.wasFlying = fl
}

// zip charges: 2 per airtime (refilled on landing), 1 on the ground (refilled on landing or `groundReset` frames after use)
function chargeRefill(f, s) {
  const g = grounded(f) && !isFlying(f), z = s.zip
  if (g && !z.wasGround) { z.air = ZIP.airCharges; z.ground = ZIP.groundCharges }
  if (g && z.ground < ZIP.groundCharges && s.clock - z.groundAt >= ZIP.groundReset) z.ground = ZIP.groundCharges
  z.wasGround = g
}

// ── ZIP: double-tap ← / → on the sim clock (SPD Red's teleport convention); 45 % of the screen in 5 frames; projectile-
//    intangible frames 1-4; passes through the foe (cross-ups). From any normal on HIT it cancels the normal.
export function canZip(f) {
  if (!isInv(f)) return false
  const s = invState(f), g = grounded(f) && !isFlying(f)
  return g ? s.zip.ground > 0 : s.zip.air > 0
}
export function startZip(f, dir, W, o = {}) {
  const s = invState(f), g = grounded(f) && !isFlying(f)
  if (s.mv || !canZip(f)) return false
  const x0 = Math.round(f.x)
  let x1 = Math.max(0, Math.min(sw(W) - f.w, Math.round(f.x + dir * ZIP.dist * SCREEN)))
  // a zip cancelled from a HIT goes through that foe and stops right behind them (the cross-up); a plain zip runs the full 45 %
  const hitFoe = o.cancel && o.foe
  if (hitFoe && Math.sign(ctrX(hitFoe) - ctrX(f)) === dir) {
    const behind = Math.round(dir === 1 ? hitFoe.x + hitFoe.w + ZIP.behind : hitFoe.x - f.w - ZIP.behind)
    if (Math.abs(behind - x0) < Math.abs(x1 - x0)) x1 = Math.max(0, Math.min(sw(W) - f.w, behind))
  }
  if (Math.abs(x1 - x0) < 8) return false
  if (o.cancel && live(f)) { endInvAttack(f); s.stats.zipCancels++ }
  if (g) { s.zip.ground--; s.zip.groundAt = s.clock } else s.zip.air--
  s.mv = { t: 0, dir, x0, x1, y: Math.round(f.y), g, face: 0 }
  s.stats.zips++; cue(f, 'zip'); pushFx(s, 'zipFrom', ctrX(f), feet(f), { dir })
  return true
}
function mobilityTick(f, s, raw, opp, W) {
  const m = s.mv
  if (m) {
    m.t++
    if (f.hitstun > 0 || f.isGrabbed) { s.mv = null; f._invPhase = 0; return }
    f._invPhase = (m.t >= ZIP.intangible[0] && m.t <= ZIP.intangible[1]) ? 1 : 0   // combat.js: projectiles pass through
    if (f._invPhase) s.stats.zipPhased++
    if (m.t <= ZIP.travel) {
      const k = m.t / ZIP.travel
      f.x = Math.round(m.x0 + (m.x1 - m.x0) * k); f.vx = 0; f.dashTimer = 0
      if (!m.g) { f.vy = 0; f.y = m.y }
      f._spriteCastMove = 'zip'; f._spriteCastTimer = Math.max(f._spriteCastTimer || 0, 3)
      if (m.t === ZIP.travel) {
        const foe = foesOf(f, W, opp)[0]
        if (foe) f.facing = ctrX(foe) >= ctrX(f) ? 1 : -1
        pushFx(s, 'zipTo', ctrX(f), feet(f), { dir: m.dir })
      }
    }
    if (m.t >= ZIP.travel + ZIP.recovery) { s.mv = null; f._invPhase = 0 }
    return
  }
  f._invPhase = 0
  const q = s.zq
  if (!q) return
  if (s.clock - (q.clock ?? s.clock) > ZIP.buffer || s.tick - q.at > ZIP.buffer + 30) { s.zq = null; return }   // buffer ages outside hitstop only
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState) return
  const a = live(f)
  if (a) {   // ZIP-CANCEL: any normal, on HIT only
    if (NORMALS.includes(a.inv.key) && a.inv.clean) { s.zq = null; startZip(f, q.dir, W, { cancel: true, foe: a.inv.victim ? (W?.fighters?.() || [opp]).find(o => o && o.side === a.inv.victim) : opp }) }
    return
  }
  if ((f.attackCooldown || 0) > 0) return
  s.zq = null; startZip(f, q.dir, W)
}
// double-tap ← / → on the sim clock — read every tick (through hitstop too), leaves a buffered zip request in s.zq
function doubleTapTick(f, s, raw) {
  const L = !!raw.left, R = !!raw.right, dir = L === R ? 0 : (L ? -1 : 1)
  if (raw.down || raw.up) { s.dt = null; return }
  const edge = dir !== 0 && (dir === -1 ? s.edges.left : s.edges.right)?.tick === s.tick
  if (dir === 0 && s.dt) s.dt.released = true
  if (!edge) return
  if (!(s.dt && s.dt.dir === dir && s.dt.released && s.tick - s.dt.at <= ZIP.window)) { s.dt = { dir, at: s.tick, released: false }; return }
  s.dt = null
  if (raw.block) return
  s.zq = { dir, at: s.tick, clock: s.clock }
}

// FLIGHT PUNCH at speed: he would blow THROUGH the foe (no body collision ≥ 70 %) before the fist comes out. Until the
// punch has connected, a foe ahead in his flight line stops his body just short of them (physics integrates his velocity
// after this tick, so the check uses where he WOULD end up); on contact his momentum carries on through. Runs from the
// frame the punch starts (startInvMove) — at 51 px/f one frame is the whole gap.
function fpunchLock(f, m, md, t, foes) {
  if (!m.contact && t <= md.startup + md.active) {
    for (const o of foes) {
      if (Math.abs(ctrY(o) - ctrY(f)) > (o.h + f.h) / 2) continue
      const near = m.dir === 1 ? o.x - f.w - FLIGHT.punchGap : o.x + o.w + FLIGHT.punchGap
      const next = f.x + (f.vx || 0)
      if (m.dir === 1 ? (ctrX(o) > ctrX(f) - 4 && next > near) : (ctrX(o) < ctrX(f) + 4 && next < near)) {
        if (m.lockVx == null) m.lockVx = f.vx
        f.x = m.dir === 1 ? Math.min(f.x, near) : Math.max(f.x, near); f.vx = 0
      }
    }
  } else if (m.lockVx != null) { f.vx = m.lockVx; m.lockVx = null }
}

// ── live move driver ──
function moveTick(f, s, A, W, opp, raw) {
  const m = A.inv, md = INV_MOVES[m.key], t = elapsed(A), g = grounded(f)
  f.facing = m.dir
  const clampX = x => Math.max(0, Math.min(sw(W) - f.w, x))
  const front = ctrX(f) + m.dir * (f.w / 2)
  const foes = foesOf(f, W, opp)
  const fl = isFlying(f)
  switch (m.key) {
    case 'kFpunch': {
      if (g && !fl && t > 2) { endInvAttack(f, 3); break }
      fpunchLock(f, m, md, t, foes)
      break
    }
    case 'kBarrage': barrageTick(f, s, A, m, t, W, foes, front, raw); break
    case 'kIPunch': {
      if (t < IPUNCH.windup) { f.vx = 0; if (!g) f.vy = 0; break }
      if (!m.hit && t < IPUNCH.windup + IPUNCH.rush) {
        if (m.dy == null) {   // aim: the rush climbs / dives toward the nearest foe in front (a launched foe is caught in the air)
          const tgt = foes.filter(o => Math.sign(ctrX(o) - ctrX(f)) === m.dir).sort((a, b) => Math.abs(ctrX(a) - ctrX(f)) - Math.abs(ctrX(b) - ctrX(f)))[0]
          // reach the foe in n frames (they may be right next to him), aiming where a launched foe WILL be, capped at aimUp total
          const stepX = IPUNCH.dist * SCREEN / IPUNCH.rush
          m.dyN = tgt ? Math.max(1, Math.min(IPUNCH.rush, Math.ceil(Math.max(0, Math.abs(ctrX(tgt) - ctrX(f)) - (f.w + tgt.w) / 2) / stepX) || 1)) : 0
          const want = tgt ? ctrY(tgt) + (tgt.onGround || tgt.grounded ? 0 : (tgt.vy || 0) * m.dyN) - ctrY(f) : 0
          m.dy = tgt ? Math.round(Math.max(-IPUNCH.aimUp, Math.min(fl || !g ? IPUNCH.aimUp : 0, want)) / m.dyN) : 0
        }
        if (m.dyN > 0) m.dyN--; else m.dy = 0
        const step = IPUNCH.dist * SCREEN / IPUNCH.rush, xPrev = f.x
        f.x = clampX(f.x + m.dir * step); f.vx = 0; f.vy = 0
        if (m.dy) { f.y += m.dy; if (m.dy < 0) { f.onGround = false; f.grounded = false } }   // physics clamps a dive at the floor
        pushFx(s, 'trail', ctrX(f), ctrY(f), { dir: m.dir })
        const x0 = Math.min(xPrev, f.x), x1 = Math.max(xPrev, f.x) + f.w
        const o = foes.find(o => boxHit(o, x0, f.y + 10, x1 - x0, IPUNCH.h) && !((o.invulnTimer || 0) > 0) && !o._gs?.blink?.inv)
        if (o) {
          m.hit = true
          f.x = clampX(m.dir === 1 ? o.x - f.w - 4 : o.x + o.w + 4)
          const r = strike(f, o, { raw: IPUNCH.raw, mult: m.fly ? speedMult(m.frac) : 1, hitstun: IPUNCH.hitstun, kbx: IPUNCH.kbx, kby: IPUNCH.kby, chip: IPUNCH.chip,
            blockstun: IPUNCH.blockstun, dir: m.dir, move: 'inv_invincible_punch', type: 'blunt', hitstop: IPUNCH.hitstop, fx: 'burst', tier: 'big', push: 10 }, W)
          if (r === 'hit') { s.stats.ipunchHits++; o._invWall = { ...(o._invWall || {}), t: IPUNCH.wall.watch, dir: m.dir, by: f.side }; cue(f, 'ipunchHit') }
          m.contact = r === 'hit' || r === 'block'; m.clean = r === 'hit'; m.contactTick = s.tick
          const jump = IPUNCH.windup + IPUNCH.rush - 2   // the burst frames play from contact
          if (t < jump) { A.timer = A.total - jump }
        }
        break
      }
      if (!m.hit && t >= IPUNCH.windup + IPUNCH.rush) {   // whiff: overshoot, −16
        s.stats.ipunchWhiff++; cue(f, 'whiff')
        const dir = m.dir; endInvAttack(f); startInvMove(f, 'kIPunchW', W, { dir, internal: true }); return
      }
      break
    }
    case 'kIPunchW': {
      if (t < 10) f.x = clampX(f.x + m.dir * IPUNCH.overshoot * (10 - t) / 55)
      f.vx = 0; if (!g && !fl) f.vy = Math.max(f.vy || 0, 0)
      break
    }
    case 'kSkyward': {
      if (!m.released && t >= SKYWARD.startup && t < SKYWARD.startup + SKYWARD.active) {
        const bx = m.dir === 1 ? f.x + f.w - 10 : f.x - SKYWARD.w + 10
        const o = foes.find(o => boxHit(o, bx, f.y + SKYWARD.boxY, SKYWARD.w, SKYWARD.h))
        if (o) {
          m.released = true
          const r = strike(f, o, { raw: SKYWARD.raw, hitstun: SKYWARD.hitstun, kbx: 2, kby: SKYWARD.launchVy, chip: SKYWARD.chip, dir: m.dir, move: 'inv_skyward', type: 'blunt', hitstop: 6, fx: 'impactBig', tier: 'big' }, W)
          m.contact = r === 'hit' || r === 'block'; m.clean = r === 'hit'
          if (r === 'hit') { s.stats.skywardHits++; m.carry = SKYWARD.carry; m.vic = o.side; f.vy = SKYWARD.riseVy; f.onGround = false; f.grounded = false; cue(f, 'skywardRise') }
        }
      }
      if (m.carry > 0) {
        m.carry--; f.vx = 0
        const v = foes.find(o => o.side === m.vic)   // the uppercut carries BOTH of them up: the foe rides just above his fist
        if (v) { v.x = Math.max(0, Math.min(sw(W) - v.w, Math.round(m.dir === 1 ? f.x + f.w + 2 : f.x - v.w - 2))); v.y = Math.round(f.y - SKYWARD.ride); v.vx = 0; v.vy = f.vy
          v.onGround = false; v.grounded = false; v.hitstun = Math.max(v.hitstun || 0, SKYWARD.hitstun - 10); if (m.carry === 0) v.vy = SKYWARD.popVy }
        pushFx(s, 'vstreak', ctrX(f), feet(f), { dir: m.dir })
        if (m.carry === 0) {   // then he is automatically in flight
          endInvAttack(f)
          const c = ensureFlightState(f); c.groundedLock = 0
          if (flightTakeoff(f)) { f.vy = Math.min(f.vy || 0, -6); s.stats.skywardFlight++; cue(f, 'flyOn') }
          return
        }
      }
      break
    }
    case 'kCrash': {
      if (t < CRASH.startup) { f.vx = 0; f.vy = 0; break }
      f.vy = CRASH.vy; f.vx = m.dir * CRASH.vx
      pushFx(s, 'vstreak', ctrX(f), f.y, { dir: m.dir, down: true })
      // the dive drives an airborne foe it passes through down with him (the landing shockwave then hits them on the floor)
      for (const o of foes) if (!(o.onGround || o.grounded) && !(o.invulnTimer > 0) && boxHit(o, f.x - 20, f.y, f.w + 40, f.h + CRASH.vy)) {
        if (o.isBlocking && (o.facing || 1) === -m.dir) continue
        o.vy = CRASH.vy; o.vx = 0; o.hitstun = Math.max(o.hitstun || 0, CRASH.hitstun); m.spike = o.side
      }
      if (g && t > CRASH.startup) {
        const dir = m.dir; endInvAttack(f); startInvMove(f, 'kCrashLand', W, { dir, internal: true }); return
      }
      if (t >= CRASH.startup + CRASH.maxFrames - 1) endInvAttack(f, 6)
      break
    }
    case 'kCrashLand': {
      if (!m.released) {
        m.released = true; f.vx = 0
        pushFx(s, 'takeoff', ctrX(f), feet(f)); cue(f, 'crashLand')
        for (const o of foes) {
          if (Math.abs(ctrX(o) - ctrX(f)) > CRASH.r + (o.w || 48) / 2 || Math.abs(feet(o) - feet(f)) > 80) continue
          const r = strike(f, o, { raw: CRASH.raw, hitstun: CRASH.hitstun, kbx: CRASH.kbx, kby: CRASH.kby, chip: CRASH.chip, otg: true, low: false, move: 'inv_crash_down', type: 'impact', hitstop: 8, fx: 'impactBig', tier: 'big' }, W)
          if (r === 'hit') { s.stats.crashHits++; m.clean = true }
        }
      }
      f.vx = 0
      break
    }
    case 'kNHB': nhbTick(f, s, A, m, t, W, foes); break
    case 'kTV': tvTick(f, s, A, m, t, W, foes, raw); break
    case 'kTVCrater': f.vx = 0; break
  }
}

// BARRAGE (mash Light): up to 6 × 16, one hit every 4 f while Light keeps coming; the LAST hit launches
function barrageTick(f, s, A, m, t, W, foes, front, raw) {
  const md = INV_MOVES.kBarrage
  if (fresh(s, 'light', 12) && t > 0) { use(s, 'light'); m.press = s.tick }
  if (m.done) { if (t >= m.endAt) endInvAttack(f, 2); return }
  const i = m.hits
  if (t !== md.startup + i * md.every) return
  const last = i === md.hits - 1 || (i >= 1 && s.tick - (m.press ?? -99) > 10)
  const bx = m.dir === 1 ? f.x + f.w - 6 : f.x - md.w + 6
  const o = foes.find(o => boxHit(o, bx, f.y + 14, md.w, md.h))
  m.hits++
  if (!o) { m.done = true; m.endAt = t + 10; return }
  f.x = Math.max(0, Math.min(sw(W) - f.w, f.x + m.dir * 3))   // the flurry walks in with the hits (keeps the foe inside it)
  const r = strike(f, o, { raw: md.raw, hitstun: last ? 34 : 14, kbx: last ? 3 : 0, kby: last ? -14 : 0, chip: 0.15, dir: m.dir, blockstun: 8,
    move: last ? 'inv_barrage_launch' : 'inv_barrage', type: 'blunt', hitstop: last ? 7 : 2, fx: last ? 'impact' : 'spark', interrupt: true, noScale: true }, W)
  if (r === 'hit' && last) o._invWall = { ...(o._invWall || {}), kd: INV_MOVES.kBarrage.landKd, kdT: 90, by: f.side }   // knocked down when they land
  if (r === 'hit') { s.stats.barrageHits++; m.clean = true; m.contact = true; m.contactTick = s.tick; if (last) s.stats.barrageLaunch++; cue(f, last ? 'barrageLast' : 'barrageHit') }
  if (r === 'block') { m.contact = true; m.contactTick = s.tick }
  if (last || r !== 'hit') { m.done = true; m.endAt = t + 10 }
}

// NO HOLDING BACK — the Super: the first strike must connect (blocked = chip, ends; nothing in reach = whiff), then he zips
// around the foe striking from 6 directions (the foe is held in place, he is untouchable), 300 total
function nhbTick(f, s, A, m, t, W, foes) {
  f.invulnTimer = Math.max(f.invulnTimer || 0, 2)
  f.vx = 0; f.vy = 0
  if (t === NHB.startup && !m.released) {
    m.released = true
    const o = foes.filter(o => Math.abs(ctrX(o) - ctrX(f)) <= NHB.reach && Math.sign(ctrX(o) - ctrX(f) || m.dir) === m.dir && Math.abs(ctrY(o) - ctrY(f)) < 220)
      .sort((a, b) => Math.abs(ctrX(a) - ctrX(f)) - Math.abs(ctrX(b) - ctrX(f)))[0]
    if (!o || (o.invulnTimer || 0) > 0) { m.whiff = true; A.timer = NHB.whiffRecovery; cue(f, 'whiff'); return }
    const facingSrc = (o.facing || 1) === -m.dir
    if (o.isBlocking && facingSrc) { strike(f, o, { raw: NHB.raw[0], chip: NHB.chip, dir: m.dir, blockstun: 20, move: 'inv_nhb', push: 8 }, W); m.whiff = true; A.timer = NHB.recovery; return }
    m.lock = { side: o.side, x: Math.round(o.x), y: Math.round(o.y) }; m.k = 0
  }
  if (!m.lock || m.whiff) return
  const o = foes.find(x => x.side === m.lock.side)
  if (!o) { m.lock = null; A.timer = Math.min(A.timer, NHB.recovery); return }
  if (m.k < 6) { o.x = m.lock.x; o.y = m.lock.y; o.vx = 0; o.vy = 0; o.hitstun = Math.max(o.hitstun || 0, NHB.hitstun) }
  const due = NHB.startup + m.k * NHB.every
  if (m.k < 6 && t === due) {
    const [ox, oy] = NHB.offsets[m.k], cx = ctrX(o) + ox * 92, cy = ctrY(o) + oy * 80
    pushFx(s, 'ghost', ctrX(f), feet(f), { dir: m.dir })
    f.x = Math.max(0, Math.min(sw(W) - f.w, Math.round(cx - f.w / 2)))
    f.y = Math.min(m.lock.y + (o.h || 94) - (f.h || 94), Math.round(cy - (f.h || 94) / 2))
    m.dir = ctrX(o) >= ctrX(f) ? 1 : -1; f.facing = m.dir
    const last = m.k === 5
    const hp0 = o.health
    const r = strike(f, o, { raw: NHB.raw[m.k], hitstun: NHB.hitstun + (last ? 20 : 0), kbx: last ? NHB.kbxEnd : 0, kby: last ? NHB.kbyEnd : 0, dir: m.dir, unblockable: true,
      otg: true, move: last ? 'inv_nhb_last' : 'inv_nhb', type: 'blunt', hitstop: last ? 10 : 4, fx: last ? 'burst' : 'ring', noScale: true, tier: 'big' }, W)
    if (r === 'hit') { s.stats.nhbHits++; s.stats.nhbDmg += Math.max(0, hp0 - o.health) }
    cue(f, last ? 'nhbLast' : 'nhbHit')
    m.k++
    if (last) { m.lock = null; A.timer = NHB.recovery; if (!grounded(f)) f.vy = 2 }
  }
}

// TERMINAL VELOCITY — TAKEOFF (0.5 s) → AIM (1 s; ← / → steer the landing marker, visible to both players) → IMPACT
// (direct 380 inside ±10 % of the screen of the marker, grounded or airborne in the column; shockwave 120 inside the 40 %
// band of the stage around it, grounded) → recovery, or the crater (50 f) when nobody was in range.
function tvTick(f, s, A, m, t, W, foes, raw) {
  const tv = s.tv; if (!tv) { endInvAttack(f); return }
  f.invulnTimer = Math.max(f.invulnTimer || 0, 2); f.vx = 0; f.vy = 0
  tv.t = t
  const T1 = TV.takeoff, T2 = TV.takeoff + TV.aim, T3 = T2 + TV.fall
  const floorY = tv.floor ?? (tv.floor = Math.round(feet(f)))
  if (t < T1) {
    if (t === 0) { pushFx(s, 'takeoff', ctrX(f), feet(f)); cue(f, 'tvTakeoff') }
    f.y = Math.round(tv.y0 - Math.min(TV.rise, (t * t) * 1.1)); f.onGround = false; f.grounded = false   // rises out of frame; the camera does not chase him past TV.rise
    pushFx(s, 'vstreak', ctrX(f), feet(f), { dir: m.dir })
    f._invAlpha = t > T1 - 8 ? 0 : 1
    return
  }
  if (t < T2) {
    tv.phase = 'aim'
    if (tv.x == null) { const o = foes[0]; tv.x = Math.round(o ? ctrX(o) : ctrX(f)) ; cue(f, 'tvAim') }
    const L = !!raw.left, R = !!raw.right
    if (L !== R) tv.x = Math.max(40, Math.min(sw(W) - 40, tv.x + (R ? 1 : -1) * TV.steer))
    // he is GONE (alpha 0, invulnerable, phasing): his sim body waits on the floor under the marker so the camera frames the
    // foe and the marker, not an empty sky 1400 px up (render reads _invAlpha; invPhasing = no body push)
    f._invAlpha = 0; f.y = Math.round(floorY - (f.h || 94)); f.x = Math.round(tv.x - f.w / 2)
    f.onGround = false; f.grounded = false
    return
  }
  if (t < T3) {
    tv.phase = 'fall'; f._invAlpha = 0
    f.x = Math.round(tv.x - f.w / 2)
    if (t === T2) cue(f, 'tvFall')
    return
  }
  if (t === T3 && tv.phase !== 'impact') {
    tv.phase = 'impact'; f._invAlpha = 1
    f.x = Math.max(0, Math.min(sw(W) - f.w, Math.round(tv.x - f.w / 2))); f.y = floorY - (f.h || 94); f.onGround = true; f.grounded = true
    let any = false, payoff = null
    for (const o of foes) {
      const dx = Math.abs(ctrX(o) - tv.x)
      if (dx <= TV.direct * SCREEN) {
        const hp0 = o.health
        const r = strike(f, o, { raw: TV.rawDirect, hitstun: TV.hitstunDirect, kbx: 10, kby: -16, dir: ctrX(o) >= tv.x ? 1 : -1, unblockable: false, otg: true, chip: 0.2,
          move: 'inv_terminal_velocity', type: 'impact', infinityStops: true, hitstop: 14, fx: 'burst', noScale: true, tier: 'big', push: 12 }, W)
        if (r === 'stopped') s.stats.tvStopped++
        if (r === 'hit') { s.stats.tvDirect++; if (!payoff) payoff = { o, dmg: hp0 - o.health } }
        tv.hit = tv.hit || r; any = true
      } else if (dx <= TV.shock * sw(W) / 2 && floorY - feet(o) < 60) {
        const r = strike(f, o, { raw: TV.rawShock, hitstun: TV.hitstunShock, kbx: 9, kby: -8, dir: ctrX(o) >= tv.x ? 1 : -1, otg: true, chip: 0.2,
          move: 'inv_terminal_velocity_shock', type: 'impact', infinityStops: true, hitstop: 8, fx: 'impact', noScale: true, push: 10 }, W)
        if (r === 'stopped') s.stats.tvStopped++
        if (r === 'hit') s.stats.tvShock++
        tv.hit = tv.hit || (r === 'hit' ? 'shock' : r); any = true
      }
    }
    pushFx(s, 'tvImpact', tv.x, floorY); s.decal.push({ x: tv.x, y: floorY, t: 0 }); if (s.decal.length > 2) s.decal.shift()
    cue(f, 'tvImpact')
    if (payoff) startInvTvPayoff(f, payoff.o, tv.x, floorY, payoff.dmg)   // a DIRECT hit → the frozen impact cinematic (invincibleUlt.js)
    if (!any) {   // WHIFF: stuck in the crater
      s.stats.tvWhiff++; cue(f, 'tvWhiff')
      const dir = m.dir; s.tv = null; endInvAttack(f); startInvMove(f, 'kTVCrater', W, { dir, internal: true }); return
    }
    return
  }
  if (t > T3) { f._invAlpha = 1; if (A.timer <= 1) s.tv = null }
}

// ── CPU (only when the CPU drives him): rushdown — zips in, zips on hit, Invincible Punch at mid range, No Holding Back up close,
//    Terminal Velocity on a knocked-down foe; below 30 % health he guards far more. Deterministic rhythm (no RNG).
const PACE = { dummy: Infinity, easy: 120, normal: 70, adaptive: 60, hard: 44, impossible: 30, master: 28 }
export function markInvCpu(f, difficulty) { if (!isInv(f)) return; const s = invState(f); s.cpu = { ...(s.cpu || {}), seen: s.clock, diff: difficulty || 'normal' } }
function cpuTick(f, s, opp, W) {
  const c = s.cpu, pace = PACE[c.diff] ?? 70
  if (!isFinite(pace)) return
  const foe = foesOf(f, W, opp)[0]; if (!foe) return
  const dir = ctrX(foe) >= ctrX(f) ? 1 : -1, dist = Math.abs(ctrX(foe) - ctrX(f)), e = f.energy || 0
  // RESPECTS HIS LOW HEALTH: below 30 % he holds guard against an attacking foe nearby (sets the generic guard flag for this frame)
  const low = (f.health || 0) < 0.30 * (f.maxHealth || 748)
  const threat = foe.attacking && dist < 190 && !live(f) && !s.mv
  if (c.guarding && !(low && threat)) { f._forceGuard = false; c.guarding = false }
  if (low && threat && !(f._invNoBlock)) { f._forceGuard = true; c.guarding = true; s.stats.guardCpu++; return }
  const a = live(f)
  // zip on hit: a clean normal → zip through (cross-up) when charges allow
  if (a && NORMALS.includes(a.inv.key) && a.inv.clean && !a.inv.cpuZip && canZip(f) && (s.clock + s.serial) % 3 === 0) {
    a.inv.cpuZip = true; startZip(f, dir, W, { cancel: true, foe }); return
  }
  if (a || f.hitstun > 0 || f.blockstun > 0 || s.mv || f.knockdownState) return
  if (c.nextAt == null) c.nextAt = s.clock + pace
  if (s.clock < c.nextAt) return
  const roll = (s.clock * 7 + (c.n = (c.n || 0) + 1) * 13) % 10
  let key = null
  if (foe.knockdownState && !(f.ultimateCooldown > 0) && e >= TV.cost) key = 'kTV'
  else if (e >= BAR && dist < 240 && roll < 3 && !foe.isBlocking) key = 'kNHB'
  else if (dist > 380 && canZip(f) && roll < 6) { startZip(f, dir, W); c.nextAt = s.clock + pace; return }
  else if (dist > 200 && dist < 760 && roll < 5) key = 'kIPunch'
  else if (!grounded(f) && !isFlying(f) && dist < 180 && roll < 4) key = 'kCrash'
  if (key) { f.facing = dir; startInvMove(f, key, W, { dir }) }
  c.nextAt = s.clock + pace
}

// physics.js body collision: Mark passes THROUGH the foe while zipping, and while flying at ≥ 70 % of top speed (he blows past)
export function invPhasing(a, b) {
  const ph = f => isInv(f) && (!!f._inv?.mv || (isFlying(f) && speedFrac(f) >= FLIGHT.passAt) || (!!f._inv?.tv && f._invAlpha === 0))   // + Terminal Velocity while he is gone
  return ph(a) || ph(b)
}
export function invLockedForMovement(f) {
  if (!isInv(f)) return false
  if (f._inv?.mv) { f._dashTap = false; return true }   // his own zip owns the movement
  const a = f.attacking ? f.currentAttack : null
  if (a?.inv) {
    if (a.inv.key === 'kFpunch' && isFlying(f)) return false   // a flight punch keeps steering (speed = damage)
    if (INV_MOVES[a.inv.key]?.launcher && a.hasHit) return false
    f._dashTap = false; return true
  }
  return false
}
export { NORMALS, TECHNIQUES }
