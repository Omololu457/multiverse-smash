// Batman (batman) — SIMULATION. Plain JSON on f._batman (snapshotted for replay / LAN), sim ticks only: no RNG, no wall
// clock, no Math.sin/cos (fixed SIN64 table). Every export is a no-op for any other rosterKey.
//
// s.ops      live support operations (≤ 2: the current one + one in its EXIT hand-off). Each holds its machines (m) with
//            positions, hp, anim row / frame and the payload schedule cursor. Machines never take player input.
// s.pay      live payloads (bombs, tracer shots, shells, arcing rounds, platform bolts) — committed trajectories, no homing.
// s.bat      the batarang (outbound leg, then the return leg toward Batman), one hit per target per leg.
// s.hook     the Grapnel Breaker hook (out → pull on a clean hit → rope kick) / Up-special line.
// s.smoke    smoke fields (Smoke and Shadow, Cover capsule). A FRESH dash inside one (once per field) is the Shadow Dash.
// s.bracket  the target bracket placed by the acquisition scanner (presentation + bomb-release gate; no damage bonus).
// s.cd       per-operation cooldowns; s.stats counters for harnesses; s.cues one-shot sound / fx cues (render consumes).
import { batman as BM_CHAR, MOVES, FLEET, CAPS, ASSIST, GRAPNEL, BATARANG, SMOKE, ULT, SCALE, sin64, cos64, MAJOR } from './batmanData.js'

export const isBatman = f => f?.rosterKey === 'batman'
const fresh0 = () => ({ tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0, wasGround: true, airRise: false, prevJc: 0,
  l2: null, ops: [], pay: [], bat: null, hook: null, smoke: [], bracket: null, cd: {}, shadow: null, floor: null, seq: 0, fx: [],
  stats: { light: 0, chains: 0, batarangs: 0, batHits: 0, grapnels: 0, grapnelHits: 0, pulls: 0, ropeKicks: 0, rooftops: 0, smokes: 0, shadowDashes: 0,
    counters: 0, counterHits: 0, rejects: 0, orders: {}, opsStarted: 0, opsRejected: 0, assistHits: 0, assistBlocked: 0, assistRaw: 0,
    machinesLost: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0, dj: 0 },
  cues: [] })
export const bmState = f => f._batman ||= fresh0()

const E = { startMove: null, comboScale: null, hitstunScale: null }
export function registerBatmanEngine(o) { Object.assign(E, o) }
const cue = (f, c) => { const s = bmState(f); s.cues.push(c); if (s.cues.length > 24) s.cues.shift() }
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.bm) ? f.currentAttack : null
const tidOf = o => o?.side ?? o?.playerNumber ?? 0
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
const byTid = (f, W, opp, tid) => foesOf(f, W, opp).find(o => tidOf(o) === tid) || null
const nearest = (f, W, opp) => { let b = null, d = 1e9; for (const o of foesOf(f, W, opp)) { const k = Math.abs(ctrX(o) - ctrX(f)); if (k < d) { d = k; b = o } } return b }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const toward = (v, t, sp) => v + clamp(t - v, -sp, sp)
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const hurt = o => ({ x: o.x || 0, y: o.y || 0, w: o.w || 48, h: o.h || 94 })
function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }
function pushFx(s, kind, x, y, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), t: 0, ...(extra || {}) }); if (s.fx.length > 24) s.fx.shift() }

export function clearBatman(f) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearBatmanUlt()
  if (f._batman?.shadow) { f.dashSpeed = f._batman.shadow.sp; f.dashDuration = f._batman.shadow.du }
  if (live(f)) endAttack(f)
  delete f._batman; delete f._batmanRemoteInput; delete f._bmPose; delete f._bmPoseT
}

// L2 CHORD: Charge (L2 / P) is the shared energy charge EXCEPT while it is being used as the support-order modifier:
// for the first CHORD_HOLD frames of a hold (so L2 → R1 never pre-charges) and for the rest of any hold in which R1 was
// pressed. After CHORD_HOLD frames without R1 the hold is the ordinary charge. Read by game.js's shared charge gate.
export const CHORD_HOLD = 10
export function batmanOwnsCharge(f) {
  if (!isBatman(f)) return false
  const q = f._batman?.l2; return !!(q && (q.chord || q.t < CHORD_HOLD))
}
// ══ MOVEMENT LOCK (game.js updateMovementInput) ═════════════════════════════════════════════════════════════════
// Committed moves own the body; a double tap during one is swallowed (not buffered). The launcher stays free for its
// jump-cancel after a hit. SHADOW DASH: a fresh double tap (the shared detector's _dashTap) while grounded, free and
// standing inside one of HIS smoke fields (once per field) raises dashSpeed / dashDuration for that one ordinary dash
// (restored in tickBatman). No invulnerability, no teleport, no jump reset.
export function batmanLocked(f, raw = null) {
  if (!isBatman(f)) return false
  if (cine.active) return true
  const s = bmState(f), a = f.attacking ? f.currentAttack : null
  if (!a && f._dashTap && grounded(f) && !(f.dashCooldown > 0) && !s.shadow) {
    const fld = s.smoke.find(z => !z.used && z.own && Math.abs(ctrX(f) - z.x) <= z.r && z.life > 0)
    if (fld) {
      fld.used = true; s.shadow = { t: 0, sp: f.dashSpeed, du: f.dashDuration }
      f.dashSpeed = SMOKE.dashSpeed; f.dashDuration = SMOKE.dashDuration; s.stats.shadowDashes++
      pushFx(s, 'shadow', ctrX(f), f.y + 40, { dir: f.facing || 1 }); cue(f, 'shadow')
    }
  }
  if (a && !(a.launcher && a.hasHit)) { f._dashTap = false; return true }
  if (raw && raw.special && raw.up && grounded(f)) return true
  // COMMAND STANCE: L2 held on the ground turns Up into an order direction (Skyhook = Up + L2 + R1), never a jump — real
  // players press Up a frame or more before R1, and orders are ground-only.
  if (raw && raw.charge && (raw.up || raw.jump) && grounded(f) && !a) return true
  return false
}

// ══ MOVE START ══════════════════════════════════════════════════════════════════════════════════════════════════
const AIR_ONLY = ['air', 'bAirK', 'bDive'], EITHER = ['bRooftop', 'bBatarang']
export function startBmMove(f, key, W, { cancel = false } = {}) {
  if (!isBatman(f)) return false
  const s = bmState(f), md = MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  if (!AIR_ONLY.includes(key) && !EITHER.includes(key) && !g) return false
  if (AIR_ONLY.includes(key) && g) return false
  if (key === 'bRooftop' && !g && s.airRise) return reject(f)
  if (key === 'bBatarang' && s.bat) return reject(f)
  if (key === 'bGrapnel' && s.hook) return reject(f)
  if (md.op && !opLegal(f, md.op)) { s.stats.opsRejected++; return reject(f) }          // cap / cooldown / energy: nothing spent
  const cost = md.op ? 0 : (md.cost || 0)                                                 // operations pay at their commit frame
  if ((f.energy || 0) < (md.op ? FLEET[md.op].cost : cost)) return reject(f)
  if (cancel) endAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  const a = f.currentAttack
  a.bm = { key, dir: f.facing || 1, clean: false, blocked: false, serial: ++s.serial, counter: md.counter ? 'window' : null, tid: null }
  a.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false
  if (g) f.vx = 0
  if (key === 'up' || key === 'bRooftop') f.jumpHeld = true
  if (key === 'bRooftop') { if (!g) s.airRise = true; s.stats.rooftops++ }
  if (key === 'bCounter') s.stats.counters++
  if (key === 'ultOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  cue(f, md.op ? 'command' : md.isSpecial ? 'gadget' : md.category === 'heavy' ? 'kick' : 'swing')
  return true
}
function reject(f) { const s = bmState(f); s.stats.rejects++; cue(f, 'reject'); return false }
export function opLegal(f, kind) {
  const s = bmState(f), P = FLEET[kind]
  if (!P || cine.active) return false
  if ((s.cd[kind] || 0) > 0) return false
  if (s.ops.some(o => !o.exit)) return false                     // one major operation at a time (exit phase = hand-off)
  if (s.ops.length >= 2) return false
  const machines = s.ops.reduce((n, o) => n + o.m.filter(m => !m.gone).length, 0)
  if (machines >= CAPS.machines) return false
  return (f.energy || 0) >= P.cost
}

// ══ COMBAT HOOKS (combat.js, batman-gated) ══════════════════════════════════════════════════════════════════════
export function batmanHitbox(f) {
  const a = f.currentAttack, m = a?.bm, md = MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  const [x0, x1, top, bot] = md.box, cx = ctrX(f), fy = feet(f)
  const w = (x1 - x0) * SCALE
  return { x: m.dir === 1 ? cx + x0 * SCALE : cx - x1 * SCALE, y: fy + top * SCALE, w, h: (bot - top) * SCALE }
}
export function batmanBlock(f, d, a) {
  if (!isBatman(f) || !a?.bm) return
  d.blockstun = MOVES[a.bm.key].blockstun; a.bm.blocked = true
}
export function batmanHit(f, d, a, { armored = false } = {}) {
  if (!isBatman(f) || !a?.bm) return
  if (armored || a.bm.blocked || d?.isBlocking) return
  a.bm.clean = true; a.bm.tid = tidOf(d); f._cmdHitLanded = true
  if (a.bm.key === 'ultOpen' && d.health > 0) a.bm.ultHit = true
}
// CAPE COUNTER: one frontal, non-grab, non-projectile, non-ultimate strike during frames 3–20 of bCounter is caught.
export function absorbBatman(f, source, attack) {
  if (!isBatman(f) || !attack) return false
  const a = live(f); if (!a || a.bm.key !== 'bCounter' || a.bm.counter !== 'window') return false
  const t = elapsed(a)
  if (t < MOVES.bCounter.startup || t > MOVES.bCounter.startup + MOVES.bCounter.active - 1) return false
  if (attack.isUltimate || attack.isCinematic || attack.cinematic || attack.unblockable || attack.damageType === 'grab' || attack.category === 'grab' || !(attack.damage > 0)) return false
  const dir = a.bm.dir, sx = ctrX(source || {})
  if (!Number.isFinite(sx) || (sx - ctrX(f)) * dir < 0) return false
  a.bm.counter = 'caught'
  const s = bmState(f); s.stats.counterHits++
  pushFx(s, 'counter', ctrX(f) + dir * 24, f.y + 30, { dir }); cue(f, 'counter')
  return true
}

// ══ ASSIST / GADGET STRIKE — the single damage path for everything Batman does not hit with his body ═════════════
// Same choke-point as melee (W.damage = combat.applyScaledDamage, default ×0.60), the owner's CURRENT combo scale and
// offense / the target's defense multiplier; it extends the owner's combo (no per-drone reset). Guard = isBlocking OR
// still in blockstun (this engine drops isBlocking during blockstun) → 12 % special-tier chip + authored blockstun.
// Escape guarantees: no hit on knockdown / invulnerable / grabbed targets; no assist hit on a target already juggled
// ASSIST.maxAirHits times; assist hitstun is scaled by the shared hitstun curve.
export function bmStrike(f, t, P, W, { gadget = false } = {}) {
  if (!t || t === f || !(t.health > 0) || (t.invulnTimer || 0) > 0 || t.knockdownState || t.isGrabbed) return null
  if (f.team && t.team && f.team === t.team) return null
  if (cine.active && cine.target === t && !P.ult) return null
  const air = !(t.onGround || t.grounded)
  if (air && (t.juggleCount || 0) >= ASSIST.maxAirHits && !gadget) return null
  const s = bmState(f), dir = Math.sign(ctrX(t) - (P.x ?? ctrX(f))) || P.dir || f.facing || 1
  const off = Math.max(f.damageMultiplier || 1, f.attackMultiplier || 1) / Math.max(0.5, t.defenseMultiplier || 1)
  const raw = P.raw * off, move = P.move || 'batman_assist'
  if (t.isBlocking || (t.blockstun || 0) > 0) {
    t.blockstun = Math.max(t.blockstun || 0, P.blockstun || 10); t.vx = dir * 2
    W?.damage?.(t, raw * ASSIST.chip, { source: 'assist-chip', attacker: f, move, floor: 1 })
    s.stats.assistBlocked++; cue(f, 'blocked')
    return 'blocked'
  }
  const sc = E.comboScale?.(f) ?? 1
  W?.damage?.(t, raw * sc, { source: gadget ? 'gadget' : 'assist', attacker: f, move, tier: P.raw >= 60 ? 'big' : undefined })
  s.stats.assistHits++; s.stats.assistRaw += P.raw
  if (air) t.juggleCount = (t.juggleCount || 0) + 1
  t.hitstun = Math.max(t.hitstun || 0, Math.round((P.hitstun || 16) * (E.hitstunScale?.(f) ?? 1)))
  t.vx = dir * (P.kb?.[0] ?? 2)
  t.vy = P.kb?.[1] ?? (air ? -3 : 0)
  t.isBlocking = false; t.colorFlash = 6; t.hitstop = Math.max(t.hitstop || 0, ASSIST.hitstop)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  cue(f, P.raw >= 60 ? 'bigHit' : 'hit')
  return 'hit'
}

// ══ PER-SIMULATION-FRAME TICK (1v1 + FFA; before the command layer) ═══════════════════════════════════════════════
export function tickBatman(f, opp, raw, W) {
  if (!isBatman(f)) { if (f?._batman) clearBatman(f); return }
  // round / match reset: the shared revert stamps speed 84 / dash 16 on every fighter after our clear → re-apply ours
  if (f.baseSpeed === 84 && f.dashSpeed === 16 && !f._batman?.shadow) { const st = BM_CHAR.stats; f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed; f.dashDuration = st.dashDuration }
  const s = bmState(f); s.tick++
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'charge', 'grab']) {
    const v = !!raw[k]
    if (v && !s.prev[k] && k !== 'up') s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk, mod: !!raw.charge }
    s.prev[k] = v
  }
  if (raw.charge) { s.l2 = s.l2 || { t: 0, chord: false }; s.l2.t++; if (raw.special) s.l2.chord = true } else s.l2 = null
  if ((raw.up || raw.jump) && (raw.special || raw.charge) && grounded(f)) s.upConsumed = true
  if (!raw.up && !raw.jump) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  const g = grounded(f), a = live(f)
  if (g) s.floor = feet(f)
  if (s.floor == null) s.floor = feet(f)
  if (g && !s.wasGround) { s.airRise = false; if (!f.attacking && !(f.hitstun > 0)) { f._bmPose = 'land'; f._bmPoseT = 8 } }
  if (g && !a) s.airRise = false
  if (f._bmPoseT > 0 && --f._bmPoseT === 0) f._bmPose = null
  if (f.hitstun > 0 || f.attacking || !g) { if (f._bmPose) { f._bmPose = null; f._bmPoseT = 0 } }
  const jc = f.jumpCount || 0; if (!g && jc >= 2 && s.prevJc < 2) { s.stats.dj++; cue(f, 'doubleJump') }; s.prevJc = g ? 0 : jc
  s.wasGround = g
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 48) s.fx.splice(i, 1)
  if (s.shadow && ++s.shadow.t >= SMOKE.dashDuration + 2) { f.dashSpeed = s.shadow.sp; f.dashDuration = s.shadow.du; s.shadow = null }
  for (const k in s.cd) if (s.cd[k] > 0) s.cd[k]--
  for (let i = s.smoke.length - 1; i >= 0; i--) if (--s.smoke[i].life <= 0) s.smoke.splice(i, 1)
  if (s.bracket) s.bracket.age++
  // the world keeps moving while Batman himself is in hitstop / hitstun: gadgets and the fleet are autonomous
  tickBatarang(f, s, W, opp)
  tickHook(f, s, W, opp)
  tickOps(f, s, W, opp)
  tickPayloads(f, s, W, opp)
  if (f.health <= 0 || f.hitstop > 0) return
  s.clock++
  if (a && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) { if (s.hook && s.hook.state !== 'retract') s.hook.state = 'retract'; endAttack(f); return }
  const m = a?.bm
  if (!m) return
  const t = elapsed(a), md = MOVES[m.key]
  f.facing = m.dir
  const clampX = x => clamp(x, 0, sw(W) - (f.w || 48))
  const noPass = (x, dir) => {
    for (const o of foesOf(f, W, opp)) {
      if (Math.abs(feet(o) - feet(f)) > (o.h || 94)) continue
      if (dir > 0 && f.x + f.w <= o.x + 1) x = Math.min(x, o.x - f.w)
      if (dir < 0 && f.x >= o.x + o.w - 1) x = Math.max(x, o.x + o.w)
    }
    return x
  }
  if (md.travel && t >= md.travel[0] && t < md.travel[1] && g) { f.x = noPass(clampX(f.x + m.dir * md.travel[2]), m.dir); f.vx = 0 }
  else if (g && m.key !== 'up' && m.key !== 'bRooftop') f.vx = 0
  if (md.op && t === md.commit) commitOp(f, s, md.op, W, opp)
  switch (m.key) {
    case 'bBatarang':
      if (t === md.startup) spawnBatarang(f, s)
      break
    case 'bGrapnel':
      if (t === md.startup) { s.hook = { x: ctrX(f) + m.dir * 40, y: f.y + 18, dir: m.dir, age: 0, state: 'out', tid: null, pull: 0, serial: m.serial }; s.stats.grapnels++; cue(f, 'grapnel') }
      if (s.hook && s.hook.serial === m.serial && s.hook.state === 'pulled') {          // pull finished → the rope kick
        s.hook.state = 'retract'; endAttack(f)
        if (E.startMove(f, 'bRopeKick', MOVES.bRopeKick)) {
          f.currentMove = 'bRopeKick'; s.stats.ropeKicks++
          f.currentAttack.bm = { key: 'bRopeKick', dir: m.dir, clean: false, blocked: false, serial: ++s.serial, counter: null, tid: s.hook.tid }
          cue(f, 'ropeKick')
        }
      }
      break
    case 'bRooftop': {
      const R = md.rise
      if (t === R.at) { f.vy = R.vy; f.vx = m.dir * R.vx; f.onGround = false; f.grounded = false; f.jumpCount = Math.max(f.jumpCount || 0, 1); s.airRise = true; cue(f, 'zip') }
      if (t > R.at + 2 && g) { endAttack(f, 6); cue(f, 'land') }
      break
    }
    case 'bSmoke':
      if (t === md.startup) { s.smoke.push({ x: Math.round(ctrX(f) + m.dir * 18), y: Math.round(feet(f)), r: SMOKE.radius, life: SMOKE.life, max: SMOKE.life, used: false, own: true, kind: 'pellet' }); if (s.smoke.length > 3) s.smoke.shift(); s.stats.smokes++; cue(f, 'smoke') }
      break
    case 'bCounter':
      if (m.counter === 'caught') {
        m.counter = 'done'; endAttack(f)
        if (E.startMove(f, 'bCounterHit', MOVES.bCounterHit)) {
          f.currentMove = 'bCounterHit'
          f.currentAttack.bm = { key: 'bCounterHit', dir: m.dir, clean: false, blocked: false, serial: ++s.serial, counter: null, tid: null }
        }
      }
      break
    case 'bDive':
      if (t >= md.startup) { f.vx = m.dir * md.dive.vx; f.vy = md.dive.vy }
      else { f.vx *= 0.8; f.vy = Math.min(f.vy || 0, 2) }
      if (g && t > 2) {
        endAttack(f); pushFx(s, 'dust', ctrX(f), feet(f)); cue(f, 'land')
        if (E.startMove(f, 'bDiveLand', MOVES.bDiveLand)) { f.currentMove = 'bDiveLand'; f.currentAttack.bm = { key: 'bDiveLand', dir: m.dir, clean: false, blocked: false, serial: ++s.serial, counter: null, tid: null }; f.currentAttack.hasHit = true }
      }
      break
    case 'air': case 'bAirK': if (g && t > 2) endAttack(f, 4); break
    case 'ultOpen':
      if (t === md.startup) cue(f, 'grapnel')
      if (m.clean && m.ultHit && !m.ultStarted) {
        m.ultStarted = true
        const tg = foesOf(f, W, opp).find(o => tidOf(o) === m.tid)
        if (tg && tg.health > 0) activateBatmanUlt(f, tg, W)
      }
      if (t === a.activeEnd + 1 && !m.clean) { s.stats.ultWhiffs++; cue(f, 'ultMiss') }
      break
  }
}

// ── BATARANG ──
function spawnBatarang(f, s) {
  const d = f.facing || 1
  s.bat = { x: Math.round(ctrX(f) + d * 38), y: Math.round(f.y + 26), dir: d, age: 0, leg: 'out', hitOut: [], hitBack: [] }
  s.stats.batarangs++; cue(f, 'batarang')
}
function tickBatarang(f, s, W, opp) {
  const b = s.bat; if (!b) return
  b.age++
  if (b.leg === 'out') {
    b.x += b.dir * BATARANG.speed
    if (b.age >= BATARANG.outFrames || b.x < 0 || b.x > sw(W)) { b.leg = 'back'; cue(f, 'batarangTurn') }
  } else {
    const tx = ctrX(f), ty = f.y + 30
    b.x = toward(b.x, tx, BATARANG.speed); b.y = toward(b.y, ty, 5)
    if (Math.abs(b.x - tx) <= BATARANG.speed && Math.abs(b.y - ty) <= 12) { s.bat = null; cue(f, 'catch'); return }
  }
  if (b.age > BATARANG.maxLife) { s.bat = null; return }
  const box = { x: b.x - BATARANG.radius, y: b.y - BATARANG.radius, w: BATARANG.radius * 2, h: BATARANG.radius * 2 }
  const ledger = b.leg === 'out' ? b.hitOut : b.hitBack
  for (const o of foesOf(f, W, opp)) {
    const id = tidOf(o); if (ledger.includes(id) || !overlap(box, hurt(o))) continue
    ledger.push(id)
    const r = bmStrike(f, o, { raw: b.leg === 'out' ? BATARANG.outRaw : BATARANG.backRaw, x: b.x, dir: b.leg === 'out' ? b.dir : -b.dir,
      hitstun: BATARANG.hitstun, blockstun: BATARANG.blockstun, kb: [2, -1], move: 'batarang' }, W, { gadget: true })
    if (r === 'hit') s.stats.batHits++
  }
}

// ── GRAPNEL HOOK (Grapnel Breaker) ──
function tickHook(f, s, W, opp) {
  const h = s.hook; if (!h) return
  h.age++
  if (h.state === 'out') {
    h.x += h.dir * GRAPNEL.speed
    const box = { x: h.x - 10, y: h.y - 10, w: 20, h: 20 }
    for (const o of foesOf(f, W, opp)) {
      if (!overlap(box, hurt(o))) continue
      const r = bmStrike(f, o, { raw: GRAPNEL.hookRaw, x: h.x, dir: h.dir, hitstun: 24, blockstun: 12, kb: [0, 0], move: 'grapnel' }, W, { gadget: true })
      if (r === 'hit') { h.state = 'pull'; h.tid = tidOf(o); h.pull = 0; s.stats.grapnelHits++; s.stats.pulls++; cue(f, 'hooked') }
      else { h.state = 'retract'; const a = live(f); if (a && a.bm.key === 'bGrapnel') a.timer += 8 }   // blocked / absorbed: the line drops, longer recovery
      break
    }
    if (h.state === 'out' && (Math.abs(h.x - ctrX(f)) >= GRAPNEL.reach || h.x < 0 || h.x > sw(W))) h.state = 'retract'
  } else if (h.state === 'pull') {
    const o = byTid(f, W, opp, h.tid)
    if (!o || !live(f) || live(f).bm.key !== 'bGrapnel') { h.state = 'retract'; return }
    h.pull++
    const stop = ctrX(f) + h.dir * ((f.w || 48) / 2 + GRAPNEL.stopGap + (o.w || 48) / 2)   // pulled into kick range in front of him
    const left = GRAPNEL.pullFrames - h.pull + 1
    const nx = ctrX(o) + (stop - ctrX(o)) / Math.max(1, left)
    o.x = clamp(nx - (o.w || 48) / 2, 0, sw(W) - (o.w || 48)); o.vx = 0
    o.hitstun = Math.max(o.hitstun || 0, 14)
    h.x = ctrX(o); h.y = o.y + 30
    if (h.pull >= GRAPNEL.pullFrames) h.state = 'pulled'
  } else if (h.state === 'retract') {
    h.x = toward(h.x, ctrX(f), 30); h.y = toward(h.y, f.y + 18, 12)
    if (Math.abs(h.x - ctrX(f)) < 32) s.hook = null
  }
  if (h && h.age > 90) s.hook = null
}

// ══ FLEET OPERATIONS ═════════════════════════════════════════════════════════════════════════════════════════════
const mach = (k, x, y, hp, row, extra = {}) => ({ k, x: Math.round(x), y: Math.round(y), hp, max: hp, row, fr: 0, at: 0, face: 1, depth: 0, dead: 0, gone: false, flash: 0, pcd: 0, mcd: 0, ...extra })
function commitOp(f, s, kind, W, opp) {
  if (!opLegal(f, kind)) { s.stats.opsRejected++; reject(f); return }      // re-checked at the commit frame: nothing spent
  const P = FLEET[kind], t = nearest(f, W, opp)
  f.energy = Math.max(0, (f.energy || 0) - P.cost)
  const d = f.facing || 1, ox = ctrX(f), fl = s.floor ?? feet(f)
  const tx = t ? ctrX(t) : ox + d * 200, top = t ? t.y : fl - 94
  const op = { id: ++s.seq, kind, t: 0, tid: t ? tidOf(t) : null, dir: d, ox: Math.round(ox), floor: Math.round(fl), exit: false, m: [], cur: 0, tx: Math.round(tx), ty: Math.round(top), aux: {} }
  if (kind === 'airspace') {
    op.m.push(mach('scout', ox - d * 220, fl - 330, P.scout.hp, 'scout_walk'))
    P.bombers.forEach((b, i) => op.m.push(mach('bomber', tx + (i ? -1 : 1) * 120, fl - 460, b.hp, 'bomber_drop', { idx: i, arrive: b.arrive, phase: b.phase, cx: Math.round(tx) })))
  } else if (kind === 'interceptor') {
    const side = Math.sign(ox - tx) || -d
    op.aux.side = side
    op.m.push(mach('inter', ox - d * 300, top - 120, P.hp, 'inter_fwd', { face: d }))
    op.m.push(mach('platform', ox - d * 360, top - 160, 50, 'platform_walk', { face: d, wait: true }))
  } else if (kind === 'carrier') {
    op.m.push(mach('carrier', ox + d * 60, fl - 440, P.carrierHp, 'carrier_hover', { face: d }))
  } else if (kind === 'skyhook') {
    op.m.push(mach('heli', ox - d * 320, top - 300, P.hp, 'heli_walk', { face: d }))
  } else if (kind === 'cover') {
    op.m.push(mach('capsule', ox + d * 30, fl, 999, 'capsule', { face: d, invul: true }))
  } else if (kind === 'automaton') {
    op.m.push(mach('auto', ox + d * 20, fl, P.hp, 'auto_a4', { face: d }))
  }
  s.ops.push(op); s.stats.opsStarted++; s.stats.orders[kind] = (s.stats.orders[kind] || 0) + 1
  cue(f, 'op_' + kind)
}
function exitOp(f, s, op) { if (op.exit) return; op.exit = true; op.exitT = op.t }
function endOp(f, s, op) {
  s.ops.splice(s.ops.indexOf(op), 1)
  s.cd[op.kind] = FLEET[op.kind].cooldown
  if (op.kind === 'airspace') s.bracket = null
}
// Opponent strikes / projectiles damage machines (machines never block, never act on input). Melee: an active,
// not-yet-connected enemy attack box overlapping the machine deals 60 % of that attack's stored damage (min 12), then the
// machine ignores melee for 18 frames (one hit per swing). Projectiles: 30 per contact, then 12 frames of projectile
// immunity. Destroyed → its DEATH strip, its remaining payloads are cancelled.
function vulnerable(f, s, W, opp, m, box) {
  if (m.hp <= 0 || m.invul || m.gone) return
  if (m.flash > 0) m.flash--
  if (m.pcd > 0) m.pcd--
  if (m.mcd > 0) m.mcd--
  for (const o of foesOf(f, W, opp)) {
    const ab = m.mcd > 0 ? null : W?.attackBox?.(o)
    if (ab && overlap(ab, box)) { m.mcd = 18; damageMachine(f, s, m, Math.max(12, Math.round((o.currentAttack?.damage || 40) * 0.6))) }
    if (m.hp <= 0) return
    const pr = m.pcd > 0 || typeof W?.projectileRects !== 'function' ? [] : W.projectileRects(o)
    if (pr.some(r => overlap(r, box))) { m.pcd = 12; damageMachine(f, s, m, 30) }
    if (m.hp <= 0) return
  }
}
function damageMachine(f, s, m, n) {
  m.hp -= n; m.flash = 6; cue(f, 'machineHit')
  if (m.hp <= 0) { m.hp = 0; m.dead = 1; s.stats.machinesLost++; pushFx(s, 'wreck', m.x, m.y, { k: m.k }); cue(f, 'machineDown') }
}
// world boxes (centre x / anchor y conventions match batmanFx draw scales — FLEET_SCALE)
export const FLEET_SCALE = { scout: 0.5, bomber: 0.55, inter: 0.75, platform: 0.8, carrier: 1.05, lurker: 2.0, defender: 2.2, heli: 0.85,
  plane: 1.25, hunter: 2.4, wing: 1.8, auto: 1.25, capsule: 0.7, bomb: 0.7, ammo: 1.8, crew: 0.6 }
const MBOX = { scout: [50, 34, -6], bomber: [40, 40, 0], inter: [62, 32, 4], platform: [60, 40, 0], carrier: [160, 110, 0], lurker: [190, 64, -64],
  defender: [110, 76, -76], heli: [70, 90, 10], hunter: [60, 68, -68], wing: [60, 56, -28], auto: [70, 100, -100] }
export function machineBox(m) {
  const b = MBOX[m.k]; if (!b) return null
  return { x: m.x - b[0] / 2, y: m.y + b[2], w: b[0], h: b[1] }
}

function tickOps(f, s, W, opp) {
  for (const op of [...s.ops]) {
    op.t++
    const P = FLEET[op.kind]
    const t = op.tid != null ? byTid(f, W, opp, op.tid) : null
    if (t) { op.tx = Math.round(toward(op.tx, ctrX(t), 7)); op.ty = Math.round(toward(op.ty, t.y, 7)) }
    else if (!op.exit) exitOp(f, s, op)
    if (!op.exit && op.t >= P.exitAt) exitOp(f, s, op)
    OPS[op.kind](f, s, W, opp, op, P, t)
    for (const m of op.m) {
      if (m.gone) continue
      m.at++
      if (m.dead) { if (++m.dead > 40) m.gone = true; continue }
      const box = machineBox(m); if (box) vulnerable(f, s, W, opp, m, box)
    }
    if (op.t >= P.end || op.m.every(m => m.gone)) endOp(f, s, op)
  }
}
const setRow = (m, row) => { if (m.row !== row) { m.row = row; m.at = 0 } }
const alive = m => m && !m.gone && !m.dead
const spawnPay = (s, p) => { if (s.pay.length >= CAPS.payloads) return null; s.pay.push(p); return p }
const mk = (s, kind, x, y, vx, vy, extra) => spawnPay(s, { id: ++s.seq, kind, x: Math.round(x * 4) / 4, y: Math.round(y * 4) / 4, vx, vy, age: 0, hit: [], ...extra })

const OPS = {
  // GOTHAM AIRSPACE — scanner acquires (bracket), two bombardiers orbit the target on staggered ellipses and release
  // ten committed bombs (200 raw total). Releases need an acquisition: the bracket, or self-acquire from frame 130.
  airspace(f, s, W, opp, op, P, t) {
    const [sc, b0, b1] = op.m
    const tx = op.tx, top = op.ty
    if (alive(sc)) {
      const S = P.scout
      if (op.t < S.scanFrom) { sc.x = toward(sc.x, tx, 9); sc.y = toward(sc.y, top - 150, 8); setRow(sc, 'scout_walk') }
      else if (op.t < S.leaveAt) {
        sc.x = toward(sc.x, tx, 4); sc.y = toward(sc.y, top - 150, 4)
        setRow(sc, op.t < S.bracketAt ? 'scout_scan' : 'scout_walkscan')
        if (op.t === S.bracketAt && t) { s.bracket = { tid: op.tid, x: tx, y: top, age: 0, op: op.id }; cue(f, 'bracket') }
      } else { sc.x += op.dir * 6; sc.y -= 6; setRow(sc, 'scout_walk'); if (op.t >= S.gone) sc.gone = true }
    } else if (sc.dead) sc.y += 3
    if (s.bracket && s.bracket.op === op.id) { s.bracket.x = Math.round(toward(s.bracket.x, tx, 6)); s.bracket.y = Math.round(toward(s.bracket.y, top, 6)) }
    const acquired = (s.bracket && s.bracket.op === op.id) || op.t >= 130
    for (const b of [b0, b1]) {
      if (!b || b.gone) continue
      if (b.dead) { b.y += 4; continue }
      if (op.exit) { b.y -= 8; b.x += (b.idx ? -1 : 1) * 4; setRow(b, 'bomber_drop'); if (b.y < op.floor - 700) b.gone = true; continue }
      if (op.t < b.arrive) continue
      const O = P.orbit
      b.cx = Math.round(toward(b.cx, tx, O.track))
      const k = b.phase + Math.floor((op.t - b.arrive) / O.step)
      const gx = b.cx + Math.round(O.rx * cos64(k) / 1024), gy = top - O.alt + Math.round(O.wobble * sin64(k) / 1024)
      if (op.t < b.arrive + 30) { b.x = toward(b.x, gx, 14); b.y = toward(b.y, gy, 14); setRow(b, 'bomber_drop') }
      else { const px = b.x; b.x = gx; b.y = gy; setRow(b, b.x >= px ? 'bomber_walk' : 'bomber_walk2') }
      b.depth = sin64(k)                                            // + = in front of the target (draw order / cosmetic scale)
    }
    while (op.cur < P.bombs.length && P.bombs[op.cur].at <= op.t) {
      const B = P.bombs[op.cur++], bm = op.m[1 + B.by]
      if (!alive(bm) || op.exit || !acquired || op.t < bm.arrive + 30) continue
      const aimX = s.bracket?.op === op.id ? s.bracket.x : tx
      const gy = t && (t.onGround || t.grounded) ? feet(t) : op.floor
      const y0 = bm.y + 16, C = P.bomb
      const T = (-C.vy0 + Math.sqrt(C.vy0 * C.vy0 + 2 * C.g * Math.max(10, gy - y0))) / C.g
      const vx = clamp((aimX - bm.x) / Math.max(8, T), -C.maxVx, C.maxVx)
      mk(s, 'bomb', bm.x, y0, Math.round(vx * 16) / 16, C.vy0, { raw: B.raw, gy, src: op.id, blast: C.blast, r: C.radius, hitstun: C.hitstun, blockstun: C.blockstun, kb: [1, C.knockbackY], move: 'airspace_bomb' })
      cue(f, 'bombDrop')
    }
  },
  // CROSS-FIRE INTERCEPTOR — approaches on Batman's side, acquisition hover, FIRE1 burst, banks over the target to the far
  // side, FIRE2 burst, disengages. The box platform makes a short low support pass with two down-bolts in between.
  interceptor(f, s, W, opp, op, P, t) {
    const [it, pf] = op.m, side = op.aux.side, mid = op.ty + 34
    if (alive(it)) {
      const A = { x: op.tx + side * 170, y: mid - 10 }, B = { x: op.tx - side * 170, y: mid - 10 }
      if (op.exit) { it.x -= it.face * 7; it.y -= 4; setRow(it, 'inter_back'); if (op.t > (op.exitT || 0) + 34) it.gone = true }
      else if (op.t < 40) { it.x = toward(it.x, A.x, 11); it.y = toward(it.y, A.y, 8); it.face = Math.sign(op.tx - it.x) || it.face; setRow(it, 'inter_fwd') }
      else if (op.t < 60) { it.x = toward(it.x, A.x, 6); it.y = toward(it.y, A.y, 4); it.face = -side; setRow(it, 'inter_idle') }
      else if (op.t < 104) { it.x = toward(it.x, A.x, 3); it.y = toward(it.y, A.y, 3); it.face = -side; setRow(it, 'inter_fire1') }
      else if (op.t < 140) { const u = (op.t - 104) / 36; it.x = Math.round(A.x + (B.x - A.x) * u); it.y = Math.round(A.y - 96 * sin64(Math.round(u * 32)) / 1024); it.face = -side; setRow(it, 'inter_fwd') }
      else if (op.t < P.exitAt) { it.x = toward(it.x, B.x, 3); it.y = toward(it.y, B.y, 3); it.face = side; setRow(it, 'inter_fire2') }
    } else if (it.dead) it.y += 5
    while (op.cur < P.shots.length && P.shots[op.cur].at <= op.t) {
      const S = P.shots[op.cur++]
      if (!alive(it) || op.exit) continue
      const C = P.shot, fx = it.face
      mk(s, 'shot', it.x + fx * 30, it.y + 6, fx * C.speed, 0, { raw: S.raw, life: C.life, h: C.h, hitstun: C.hitstun, blockstun: C.blockstun, kb: [2, -1], move: 'interceptor', look: 'tracer' })
      cue(f, 'shot')
    }
    // box platform support pass (t 100–150): low sweep over the target, two down-bolts (15 raw each)
    if (alive(pf)) {
      if (op.t < 96) { pf.x = op.ox - op.dir * 360; pf.y = op.ty - 160; setRow(pf, 'platform_idle') }
      else if (op.t < 152) { const u = (op.t - 96) / 56; pf.x = Math.round(op.tx + side * 220 - side * 440 * u); pf.y = toward(pf.y, op.ty - 70, 6); pf.face = -side; setRow(pf, 'platform_walk')
        if (op.t === 121 || op.t === 127) { mk(s, 'bolt', pf.x, pf.y + 24, 0, 9, { raw: 15, life: 24, w: 14, h: 22, hitstun: 14, blockstun: 9, kb: [0, 2], move: 'platform' }); cue(f, 'bolt') } }
      else { pf.y -= 7; pf.x -= side * 4; setRow(pf, 'platform_idle'); if (pf.y < op.floor - 700) pf.gone = true }
    } else if (pf.dead) pf.y += 4
  },
  // ARSENAL CARRIER → GROUND BARRAGE — the carrier lowers the Lurker (direct-fire cannon), then the Defender (arcing
  // launcher + gun mount). Fixed sequence, distinct units, distinct ground positions. 3 shells + 3 rounds = 180 raw.
  carrier(f, s, W, opp, op, P, t) {
    const c = op.m[0], d = op.dir
    let lu = op.m.find(m => m.k === 'lurker'), de = op.m.find(m => m.k === 'defender')
    if (alive(c)) {
      if (op.t < 50) { c.x = toward(c.x, op.ox + d * 110, 6); c.y = toward(c.y, op.floor - 170, 10); setRow(c, 'carrier_hover') }
      else if (op.t < 84) { c.x = toward(c.x, op.ox + d * 230, 5); c.y = toward(c.y, op.floor - 170, 4); setRow(c, 'carrier_move') }
      else if (op.t < 96) setRow(c, 'carrier_hover')
      else { c.x -= d * 8; c.y -= 7; setRow(c, 'carrier_move'); if (c.y < op.floor - 760) c.gone = true }
      if (op.t === 50 && !lu) { op.m.push(mach('lurker', c.x, c.y + 40, P.lurkerHp, 'lurker', { face: d, fall: 1 })); cue(f, 'deploy') }
      if (op.t === 90 && !de) { op.m.push(mach('defender', c.x, c.y + 40, P.defenderHp, 'defender2', { face: d, fall: 1, fr: 1 })); cue(f, 'deploy') }
    } else if (c.dead) c.y += 5
    lu = op.m.find(m => m.k === 'lurker'); de = op.m.find(m => m.k === 'defender')
    for (const u of [lu, de]) {
      if (!alive(u)) { if (u?.dead) u.y = Math.min(u.y + 2, op.floor); continue }
      if (u.fall) { u.y = Math.min(op.floor, u.y + Math.min(18, 2 + u.at)); if (u.y >= op.floor) { u.fall = 0; cue(f, 'land') } }
      else u.face = Math.sign(op.tx - u.x) || u.face
      if (op.exit) { u.x -= u.face * 3; if (Math.abs(u.x - op.ox) > 900) u.gone = true }
    }
    // Lurker shells — horizontal at low body height (jumpable)
    while (op.cur < P.shells.length && P.shells[op.cur].at <= op.t) {
      const S = P.shells[op.cur++]; if (!alive(lu) || lu.fall || op.exit) continue
      lu.fire = 8; const C = P.shell
      mk(s, 'shell', lu.x + lu.face * 86, op.floor - 34, lu.face * C.speed, 0, { raw: S.raw, life: C.life, h: C.h, hitstun: C.hitstun, blockstun: C.blockstun, kb: [C.knockbackX, -2], move: 'lurker', look: 'shell' })
      cue(f, 'cannon')
    }
    if (lu && lu.fire > 0) lu.fire--
    // Defender: dome scan → rack raised → two arcing rounds → gun mount → one direct gun round
    if (alive(de) && !de.fall && !op.exit) {
      if (op.t < 160) { setRow(de, 'defender2'); de.fr = 1 }
      else if (op.t < 216) { setRow(de, op.t < 190 ? 'defender' : 'defender2'); de.fr = op.t < 190 ? 1 : 0 }
      else { setRow(de, 'defender'); de.fr = op.t >= 232 && op.t < 240 ? 3 : 2 }
    }
    const R = P.rounds
    op.cur2 = op.cur2 || 0
    while (op.cur2 < R.length && R[op.cur2].at <= op.t) {
      const S = R[op.cur2++]; if (!alive(de) || de.fall || op.exit) continue
      const C = P.round
      if (S.kind === 'arc') {
        const x0 = de.x + de.face * 20, y0 = op.floor - 70, aimX = t ? ctrX(t) : op.tx, gy = op.floor, T = C.flight
        const vx = Math.round((aimX - x0) / T * 16) / 16, vy = Math.round(((gy - y0) - 0.5 * C.g * T * T) / T * 16) / 16
        mk(s, 'round', x0, y0, vx, vy, { raw: S.raw, g: C.g, gy, blast: C.blast, r: 10, hitstun: C.hitstun, blockstun: C.blockstun, kb: [2, -4], move: 'defender' })
        cue(f, 'launch')
      } else {
        mk(s, 'shell', de.x + de.face * 60, op.floor - 46, de.face * 14, 0, { raw: S.raw, life: 46, h: 10, hitstun: C.hitstun, blockstun: C.blockstun, kb: [4, -2], move: 'defender_gun', look: 'tracer' })
        cue(f, 'cannon')
      }
    }
  },
  // SKYHOOK — rotorcraft transits, descends with its hook lowered, one blockable hook check; a clean hook lifts the
  // target (50), carries it up, then drops it; the landing slam deals 90. Block / whiff: the sortie pulls away.
  skyhook(f, s, W, opp, op, P, t) {
    const h = op.m[0]
    const hook = () => ({ x: h.x, y: h.y + 104 })
    if (alive(h)) {
      if (op.aux.cap == null) {
        if (op.t < 50) { h.x = toward(h.x, op.tx, 10); h.y = toward(h.y, op.ty - 210, 8); h.face = Math.sign(op.tx - h.x) || h.face; setRow(h, 'heli_walk') }
        else if (op.t <= P.hookAt) { h.x = toward(h.x, op.tx, 6); h.y = toward(h.y, op.ty - 74, 5); setRow(h, 'heli_land') }
        if (op.t === P.hookAt && t && !op.aux.tried) {
          op.aux.tried = true
          const hp = hook(), box = { x: hp.x + P.hookBox[0], y: hp.y + P.hookBox[2], w: P.hookBox[1] - P.hookBox[0], h: P.hookBox[3] - P.hookBox[2] }
          if (overlap(box, hurt(t))) {
            const r = bmStrike(f, t, { raw: P.hookRaw, x: h.x, dir: h.face, hitstun: P.hitstun, blockstun: P.blockstun, kb: [0, 0], move: 'skyhook' }, W)
            if (r === 'hit') { op.aux.cap = op.tid; op.aux.y0 = t.y; cue(f, 'hooked') } else exitOp(f, s, op)
          } else exitOp(f, s, op)
        }
        if (op.exit || op.t > P.hookAt) { h.y -= 6; h.x += h.face * 6; setRow(h, 'heli_walk'); if (h.y < op.floor - 800) h.gone = true }
      } else if (op.t < P.dropAt && t && t.health > 0) {
        h.y = toward(h.y, op.aux.y0 - P.liftTo - 74, 5); setRow(h, 'heli_idle')
        const hp = hook(); t.x = clamp(hp.x - (t.w || 48) / 2, 0, sw(W) - (t.w || 48)); t.y = hp.y - 6; t.vx = 0; t.vy = 0
        t.onGround = false; t.grounded = false; t.hitstun = Math.max(t.hitstun || 0, 10); t.isBlocking = false
      } else {
        if (!op.aux.dropped) { op.aux.dropped = true; if (t) { t.vy = 7; t.hitstun = Math.max(t.hitstun || 0, 48) } op.aux.slamWait = 70; cue(f, 'release') }
        h.y -= 6; h.x += h.face * 7; setRow(h, 'heli_walk'); if (h.y < op.floor - 800) h.gone = true
      }
    } else if (h.dead) { h.y += 3; if (op.aux.cap != null && !op.aux.dropped) { op.aux.dropped = true; op.aux.slamWait = 0 } }
    if (op.aux.slamWait > 0 && t) {
      op.aux.slamWait--
      if (grounded(t) || feet(t) >= op.floor - 1) {
        op.aux.slamWait = 0
        t.hitstun = 0; const was = t.knockdownState; t.knockdownState = false
        bmStrike(f, t, { raw: P.slamRaw, x: ctrX(t), dir: op.dir, hitstun: 30, blockstun: 14, kb: [3, -4], move: 'skyhook_slam', ult: false }, W)
        if (!was) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) }
        pushFx(s, 'slam', ctrX(t), feet(t)); cue(f, 'slam')
      }
    }
  },
  // CAPSULE COVER + ESCORT PASS — capsule vents a cover smoke field at Batman; the Hunter walker steps in, fires two,
  // turns and fires two behind it while withdrawing; the Steel Wing strafes over the target (4 shots). 80 raw.
  cover(f, s, W, opp, op, P, t) {
    const cap = op.m[0]
    if (cap && !cap.gone && cap.at >= 36) { cap.gone = true; s.smoke.push({ x: cap.x, y: op.floor, r: P.smoke.radius, life: P.smoke.life, max: P.smoke.life, used: false, own: true, kind: 'capsule' }); if (s.smoke.length > 3) s.smoke.shift(); cue(f, 'smoke') }
    if (op.t === 10) op.m.push(mach('hunter', op.ox - op.dir * 120, op.floor, P.hunterHp, 'hunter', { face: op.dir }))
    if (op.t === 40) op.m.push(mach('wing', op.ox - op.dir * 220, op.ty - 160, P.wingHp, 'steelwing', { face: op.dir, sx: op.ox - op.dir * 220 }))
    const hu = op.m.find(m => m.k === 'hunter'), wg = op.m.find(m => m.k === 'wing')
    if (alive(hu)) {
      const dx = op.tx - hu.x
      if (op.t < 40) { if (Math.abs(dx) > 200) hu.x += Math.sign(dx) * 4; hu.face = Math.sign(dx) || hu.face; setRow(hu, 'hunter'); hu.fr = Math.floor(hu.at / 5) % 2 }
      else if (op.t < 62) { setRow(hu, 'hunter'); hu.fr = 2 + (Math.floor(hu.at / 5) % 2) }
      else { setRow(hu, 'hunter_turn'); hu.x -= hu.face * 3; hu.fr = op.t < 76 ? Math.floor(hu.at / 5) % 2 : 2 + (Math.floor(hu.at / 5) % 2); if (op.t > 120) hu.gone = true }
    }
    if (alive(wg)) {
      const u = Math.min(1, (op.t - 40) / 70)
      wg.x = Math.round(wg.sx + (op.tx + op.dir * 260 - wg.sx) * u); wg.y = Math.round(op.ty - 160 + 96 * sin64(Math.round(u * 32)) / 1024)
      wg.face = op.dir; setRow(wg, 'steelwing'); wg.fr = op.t >= 70 && op.t < 98 ? 3 : Math.floor(wg.at / 5) % 3
      if (op.t >= 112) wg.gone = true
    }
    op.cur2 = op.cur2 || 0
    while (op.cur < P.hunterShots.length && P.hunterShots[op.cur].at <= op.t) {
      const S = P.hunterShots[op.cur++]; if (!alive(hu) || op.exit) continue
      const dir = Math.sign(op.tx - hu.x) || hu.face, C = P.shot
      mk(s, 'shot', hu.x + dir * 40, op.floor - 46, dir * C.speed, 0, { raw: S.raw, life: C.life, h: C.h, hitstun: C.hitstun, blockstun: C.blockstun, kb: [2, -1], move: 'hunter', look: 'flash' })
      cue(f, 'shot')
    }
    while (op.cur2 < P.wingShots.length && P.wingShots[op.cur2].at <= op.t) {
      const S = P.wingShots[op.cur2++]; if (!alive(wg) || op.exit || !t) continue
      const C = P.shot, dx = ctrX(t) - wg.x, dy = (t.y + 40) - wg.y, L = Math.max(1, Math.abs(dx) + Math.abs(dy))
      mk(s, 'shot', wg.x, wg.y + 10, Math.round(dx / L * C.speed * 16) / 16, Math.round(dy / L * C.speed * 16) / 16, { raw: S.raw, life: C.life, h: C.h, hitstun: C.hitstun, blockstun: C.blockstun, kb: [1, -1], move: 'steel_wing', look: 'flash' })
      cue(f, 'shot')
    }
  },
  // WAYNE AUTOMATON ASSAULT — strides in (ATTACK4 = reposition), ATTACK1 beam, ATTACK2 advancing beam, ATTACK3 heavy
  // cannon, braces (ATTACK4) and shuts down (DEATH = disintegrate exit). 40 + 40 + 70 = 150 raw.
  automaton(f, s, W, opp, op, P, t) {
    const r = op.m[0]
    if (!alive(r)) return
    r.face = Math.sign(op.tx - r.x) || r.face
    const want = op.tx - r.face * 150
    if (op.t < 40) { if (Math.abs(r.x - want) > 4) r.x = toward(r.x, want, 5); setRow(r, 'auto_a4') }
    else if (op.t < 60) setRow(r, 'auto_a1')
    else if (op.t < 90) { setRow(r, 'auto_a2'); if (op.t < 84) r.x = toward(r.x, op.tx - r.face * 120, 2) }
    else if (op.t < 116) setRow(r, 'auto_a3')
    else if (op.t < P.exitAt) setRow(r, 'auto_a4')
    else { setRow(r, 'auto_death'); if (r.at > 30) r.gone = true }
    for (const B of P.beams) {
      if (op.t !== B.at || !t || op.exit) continue
      const y = B.row === 'auto_a3' ? op.floor - 58 : op.floor - 80
      const box = { x: r.face > 0 ? r.x + 18 : r.x - 18 - B.len * FLEET_SCALE.auto, y: y - 10, w: B.len * FLEET_SCALE.auto, h: 22 }
      pushFx(s, 'beam', r.x + r.face * 18, y, { len: Math.round(B.len * FLEET_SCALE.auto), dir: r.face, heavy: B.row === 'auto_a3' })
      if (overlap(box, hurt(t))) bmStrike(f, t, { raw: B.raw, x: r.x, dir: r.face, hitstun: B.hitstun, blockstun: B.blockstun, kb: B.kb, move: 'automaton' }, W)
      cue(f, B.row === 'auto_a3' ? 'cannon' : 'beam')
    }
  },
}

// ── PAYLOADS: committed trajectories, one hit per target (ledger), blast radius on impact ──
function tickPayloads(f, s, W, opp) {
  for (let i = s.pay.length - 1; i >= 0; i--) {
    const p = s.pay[i]; p.age++
    let boom = false
    if (p.kind === 'bomb' || p.kind === 'round') {
      p.vy += p.kind === 'bomb' ? FLEET.airspace.bomb.g : p.g
      p.x += p.vx; p.y += p.vy
      const box = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }
      if (p.y >= p.gy || foesOf(f, W, opp).some(o => overlap(box, hurt(o)))) boom = true
      if (p.age > 120) boom = true
      if (boom) {
        const B = { x: p.x - p.blast, y: p.y - p.blast, w: p.blast * 2, h: p.blast * 2 }
        for (const o of foesOf(f, W, opp)) {
          if (p.hit.includes(tidOf(o)) || !overlap(B, hurt(o))) continue
          p.hit.push(tidOf(o)); bmStrike(f, o, { raw: p.raw, x: p.x, dir: Math.sign(p.vx) || 1, hitstun: p.hitstun, blockstun: p.blockstun, kb: p.kb, move: p.move }, W)
        }
        pushFx(s, 'boom', p.x, Math.min(p.y, p.gy), { big: p.kind === 'round' ? 1 : 0 }); cue(f, 'boom')
        s.pay.splice(i, 1); continue
      }
    } else {
      p.x += p.vx; p.y += p.vy
      const w = p.w || 18, h = p.h || 8
      const box = { x: p.x - w / 2, y: p.y - h / 2, w, h }
      for (const o of foesOf(f, W, opp)) {
        if (p.hit.includes(tidOf(o)) || !overlap(box, hurt(o))) continue
        p.hit.push(tidOf(o))
        bmStrike(f, o, { raw: p.raw, x: p.x, dir: Math.sign(p.vx) || 1, hitstun: p.hitstun, blockstun: p.blockstun, kb: p.kb, move: p.move }, W)
        boom = true
      }
      if (boom && p.kind === 'shell') pushFx(s, 'boom', p.x, p.y, { big: 0 })
      if (boom || p.age > (p.life || 40) || p.x < -40 || p.x > sw(W) + 40) { s.pay.splice(i, 1); continue }
    }
  }
}

// ══ ULTIMATE — KNIGHTFALL: ORBITAL IMPACT ════════════════════════════════════════════════════════════════════════
// The FROZEN-CINEMATIC contract (same as Higuruma / Robin / the Rangers): activate / isActive / update / clear. While
// active game.js freezes combat, physics and input and calls updateBatmanUlt() each frame. The aircraft is a cinematic
// actor; the captive's real coordinates stay inside [floor − ULT.altitude, floor] and the stage width at all times —
// "space" is sold by the screen-space sky / star-field layers (Superman's World of Cardboard backdrop, reused through
// the _supMoonBg / _supMoonScroll fields it already reads). Damage = the four scheduled contacts below through W.damage
// with the combo scale captured at confirm and bypassScale (cinematic-ultimate convention). Fleet operations are
// resolved at confirm (exit, payloads cleared) so nothing else touches the locked captive.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floor: 0, tx0: 0, dir: 1, done: 0, scale: 1, plane: null, cam: null, shake: 0, sky: 0 }
export const isBatmanUltActive = () => cine.active
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, bm: null, _ultPose: true }
}
export function activateBatmanUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = bmState(f)
  for (const op of s.ops) exitOp(f, s, op)                 // resolve the live support operation: machines withdraw
  s.pay = []; s.bat = null; s.hook = null; s.bracket = null
  const fl = s.floor ?? feet(f)
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floor: fl, tx0: target.x, dir: f.facing || 1, done: 0,
    scale: E.comboScale?.(f) ?? 1, shake: 0, sky: 0,
    plane: { x: ctrX(f) - (f.facing || 1) * 700, y: target.y - 70, ang: 0, row: 'plane_drop', fr: 0, trail: 0, tether: 0 },
    cam: { x: (ctrX(f) + ctrX(target)) / 2, y: fl - 120, zoom: 1.0 } })
  s.ult = { frame: 0, done: 0, phase: 'strafe' }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  cue(f, 'ultConfirm')
  return true
}
const phaseAt = k => { let p = ULT.phases[0].id; for (const q of ULT.phases) if (k >= q.from) p = q.id; return p }
function ultHit(i) {
  const c = ULT.contacts[i], t = cine.target, f = cine.caster
  cine.done = i + 1; if (f._batman?.ult) f._batman.ult.done = cine.done
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, c.raw * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate', bypassScale: true, tier: 'big' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 10
  cue(f, 'ult_' + c.kind)
}
export function updateBatmanUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, d = cine.dir, s = f?._batman, W = cine.W
  if (!f || !t || !s) return clearBatmanUlt()
  const k = cine.frame, P = cine.plane, top = cine.floor - ULT.altitude
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  const ph = phaseAt(k)
  const sw0 = sw(W), clampX = (o, x) => clamp(x, 0, sw0 - (o.w || 48))
  const th = t.h || 94, tw = t.w || 48
  // ── the aircraft and its captive ──
  if (ph === 'strafe') {
    const tx = ctrX(t), u = (k + 1) / 34
    P.x = Math.round((ctrX(f) - d * 700) + (tx - (ctrX(f) - d * 700)) * u); P.y = Math.round(t.y - 70 + 10 * (1 - u)); P.ang = 0; P.fr = Math.floor(k / 4) % 6
    if (k === 0) cue(f, 'planeIn')
  } else if (ph === 'ascent') {
    if (k === 34) { P.tether = 1; cue(f, 'capture') }
    const u = (k - 34) / 62, ease = u * u * (3 - 2 * u)
    P.x = Math.round(toward(P.x, clampX(t, P.x + d * 6) + tw / 2, 6)); P.y = Math.round((t.y - 70) * (1 - ease) + (top - 60) * ease); P.ang = -14
    if (k < 40) { P.y = Math.round(cine.tetherY0 ?? P.y) }
  } else if (ph === 'space') {
    const u = (k - 96) / 38                                      // curved turnaround: nose up → over the top → nose down
    P.ang = Math.round(-14 + 104 * u); P.x = Math.round(P.x + d * Math.round(4 * cos64(Math.round(u * 32)) / 1024 * 4) / 4); P.y = Math.round(top - 60 - 40 * sin64(Math.round(u * 32)) / 1024)
  } else if (ph === 'reentry') {
    const u = (k - 134) / 32
    P.ang = 90 - 10 * (1 - u); P.y = Math.round((top - 40) + ((cine.floor - th - 40) - (top - 40)) * u * u); P.trail = 1
    if (k === 150) cine.shake = 6
  } else if (ph === 'impact') {
    if (k === 166) { P.tether = 0; P.trail = 1; cine.shake = 18; cue(f, 'impact'); pushFx(s, 'ultBoom', ctrX(t), cine.floor, {}) }
    P.ang = Math.max(-35, P.ang - 9); P.x += d * 18; P.y -= 16
  } else { P.trail = 0; P.y -= 18; P.x += d * 18 }
  if (ph !== 'strafe' && ph !== 'impact' && ph !== 'recovery' && P.tether) {   // captive hangs under the fuselage on the tether
    t.x = clampX(t, P.x - tw / 2); t.y = Math.max(top, Math.min(cine.floor - th, P.y + 46)); t.vx = 0; t.vy = 0; t.onGround = false; t.grounded = false
  }
  if (k === 34) cine.tetherY0 = P.y
  if (ph === 'impact' || ph === 'recovery') { t.y = cine.floor - th; t.vx = 0; t.vy = 0; t.x = clampX(t, t.x) }
  t.isBlocking = false; t.hitstun = Math.max(t.hitstun || 0, 9999)
  // ── sky / space layers: Superman's WoC backdrop fields on the CASTER (render-only intensity / scroll) ──
  if (ph === 'ascent') { cine.sky = Math.min(1, cine.sky + 0.04); f._supMoonBg = Math.max(0, Math.min(1, (k - 62) / 30)); f._supMoonScroll = (f._supMoonScroll || 0) + 48; f._supMoonScrollSpd = 48 }
  else if (ph === 'space') { cine.sky = 1; f._supMoonBg = 1; f._supMoonScroll = (f._supMoonScroll || 0) + 5; f._supMoonScrollSpd = 5 }
  else if (ph === 'reentry') { f._supMoonBg = Math.max(0, 1 - (k - 146) / 20); f._supMoonScroll = (f._supMoonScroll || 0) - 52; f._supMoonScrollSpd = 52; cine.sky = Math.max(0, 1 - (k - 150) / 16) }
  else { f._supMoonBg = 0; f._supMoonScrollSpd = 0; cine.sky = Math.max(0, cine.sky - 0.1) }
  // ── Batman stays on the ground: opener recovery → watching the sky → a raised fist at the impact ──
  pose(f, k < 24 ? 'ultOpen' : ph === 'impact' || ph === 'recovery' ? 'ultSalute' : 'ultWatch', k < 24 ? k + 16 : k)
  f.y = cine.floor - (f.h || 94); f.vx = 0; f.vy = 0
  // ── camera hint (presentation; game.js copies it into the camera targets) ──
  const C = cine.cam
  if (ph === 'strafe') { C.x = (ctrX(f) + ctrX(t)) / 2; C.y = cine.floor - 140; C.zoom = 1.0 }
  else if (ph === 'recovery') { C.x = (ctrX(f) + ctrX(t)) / 2; C.y = cine.floor - 160; C.zoom = 0.95 }
  else if (ph === 'impact') { C.x = ctrX(t); C.y = cine.floor - 150; C.zoom = 1.0 }
  else { C.x = P.x; C.y = P.y + 30; C.zoom = 1.1 }
  if (cine.shake > 0) cine.shakeNow = cine.shake, cine.shake = 0; else cine.shakeNow = 0
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 48) s.fx.splice(i, 1)
  if (s.ult) { s.ult.frame = k; s.ult.phase = ph }
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target, W = cine.W
  if (t) { t.y = cine.floor - (t.h || 94); t.x = clamp(t.x, 0, sw(W) - (t.w || 48)); t.vx = 0; t.vy = 0; t.hitstun = 0; t.onGround = true; t.grounded = true
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { endAttack(f, 12); f.y = cine.floor - (f.h || 94); f.vx = 0; f.vy = 0; f._supMoonBg = 0; f._supMoonScroll = 0; f._supMoonScrollSpd = 0
    const s = f._batman; if (s) { s.stats.ultDone++; delete s.ult } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, plane: null, cam: null, sky: 0, shake: 0, shakeNow: 0 })
}
// Every reset path (round reset, rematch, KO teardown, training reset, scene exit, identity replacement).
export function clearBatmanUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floor - (t.h || 94); t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { endAttack(f); f.y = cine.floor - (f.h || 94); f.vx = 0; f.vy = 0; f._supMoonBg = 0; f._supMoonScroll = 0; f._supMoonScrollSpd = 0; if (f._batman) delete f._batman.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, plane: null, cam: null, sky: 0, shake: 0, shakeNow: 0 })
}
export const getBatmanUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, phase: cine.active ? phaseAt(cine.frame) : null, caster: cine.caster?.side || null })
export const batmanUltView = () => cine.active ? { frame: cine.frame, phase: phaseAt(Math.max(0, cine.frame - 1)), plane: cine.plane, target: cine.target, caster: cine.caster, sky: cine.sky, floor: cine.floor, dir: cine.dir } : null
export const batmanUltCamera = () => cine.active ? { ...cine.cam, shake: cine.shakeNow || 0 } : null
export const batmanUltLocks = o => cine.active && (cine.caster === o || cine.target === o)
export { MAJOR }
