// Cyborg (cyborg) — SIMULATION state. Plain JSON on f._cyborg (snapshotted for replay / LAN), Heat in integer fixed
// point (1 Heat = 100 units), sim ticks only: no RNG, no wall clock. Every export is a no-op for any other rosterKey.
// Weapons are ordinary ENGINE projectiles (W.spawn): the shared block chip, combo damage / hitstun scaling, juggle
// counting, hitstop, reflectors and absorbers all apply. A multi-stage weapon (cannon pulses, rack spawns) keeps its
// schedule on the live currentAttack, so ANY interruption (hit, grab, breaker, KO, reset) drops the unspawned stages.
import { CYBORG_MOVES, HEAT, WEAPON, VENT, THRUSTER, RESONANCE, WEIGHT, CANNON, RACK, SLAM, PROJ, RACK_VY, ULT, dmg } from './cyborgData.js'
import { CYBORG_FX } from './cyborgSprites.js'

export const isCyborg = f => f?.rosterKey === 'cyborg'
export const cyborgState = f => f._cyborg ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0, heat: 0, ovh: null,
  djUsed: false, slamUsed: false, wasGround: true, airT: 0, marks: {}, resUsed: false, live: [], fx: [], nProj: 0, upAge: 0,
  stats: { shots: 0, pulses: 0, missiles: 0, rack: 0, fizzles: 0, rejects: 0, overheats: 0, vents: 0, ventCooled: 0, passiveCooled: 0,
    dj: 0, djFail: 0, marks: 0, conversions: 0, markConsumedBlocked: 0, hot: 0, explosions: 0, recoils: 0, slams: 0,
    ultStarts: 0, ultWhiffs: 0, ultDone: 0, weightScaled: 0 }, cues: [] }

// Engine helpers handed in by cyborg.js (avoids a combat.js ↔ cyborgState import cycle).
const E = { startMove: null, comboScale: null }
export function registerCyborgEngine(o) { Object.assign(E, o) }
const cue = (f, c) => cyborgState(f).cues.push(c)
const ultTargets = new WeakMap()   // attacker → fighter hit by its opener (never serialized)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const tid = t => t?.side || t?.playerNumber || 0

// ── HEAT ──
export const heatOf = f => (f?._cyborg?.heat || 0) / HEAT.Q
export const weaponsLocked = f => !!f?._cyborg?.ovh
function canEmit(f, w) {
  const s = cyborgState(f)
  return !s.ovh && (f.energy || 0) >= w.power && s.heat + w.heat <= HEAT.max
}
// Spend one ACCEPTED emission. Exactly 100 → OVERHEAT after this emission resolves (never mid-emission).
function spend(f, w) {
  const s = cyborgState(f)
  f.energy = Math.max(0, (f.energy || 0) - w.power); s.heat += w.heat
  if (s.heat >= HEAT.max) { s.heat = HEAT.max; s.ovh = { t: HEAT.overheatMin }; s.stats.overheats++; cue(f, 'overheat') }
}
function cool(s, q) { const before = s.heat; s.heat = Math.max(0, s.heat - q); return before - s.heat }

export function clearCyborg(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearCyborgUlt()
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._cy) W.projectiles.splice(i, 1)
  delete f._cyborg; delete f._cyborgRemoteInput; delete f._cyLand
}

// Movement lock (game.js updateMovementInput): committed attacks, vent, slam, ultimate; Up held WITH Special belongs to
// Missile Rack (never a jump), and a fresh grounded Up holds the jump UP_GRACE frames (Up pressed 1-2 f before R1).
export const UP_GRACE = 3
const upGraceHold = (f, raw) => !!(raw?.up && !f.attacking && grounded(f) && (f._cyborg?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export const cyborgLocked = (f, raw = null) => isCyborg(f) && ((f.attacking && !f.currentAttack?.launcher) ||
  !!(raw ? raw.special && raw.up && grounded(f) : f._cyborg?.ownsUp) || upGraceHold(f, raw) || isCyborgUltActive())

// Start one of Cyborg's moves through combat.startMove (frameExact path) and attach the per-move descriptor `cy`.
// Air / ground legality and every resource check happen BEFORE anything is spent.
export function startCyMove(f, key, W, { cancel = false, extra = null } = {}) {
  if (!isCyborg(f)) return false
  const s = cyborgState(f), md = CYBORG_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && ((f.disabledSpecials || []).includes('special') || f._gaDisabled > 0)) return false
  const groundOnly = ['cSonic', 'cMissile', 'cRack', 'cMega', 'cRecoil', 'cUltOpen', 'cVent', 'cAdv', 'cLow', 'up', 'light', 'cJ2', 'cJ3', 'heavy', 'cPiston', 'cKnock']
  if (groundOnly.includes(key) && !g) return false
  if ((key === 'air' || key === 'cSlamAir') && g) return false
  if (key === 'cSlamAir' && s.slamUsed) return false
  // weapon activation: the required INITIAL emission must fit (Power, Heat ≤ 100, not overheated)
  const rej = () => { s.stats.rejects++; cue(f, s.ovh ? 'locked' : 'reject'); return false }
  if (key === 'cSonic' && !canEmit(f, WEAPON.pulse)) return rej()                               // cheapest branch (pulse) must fit
  if (key === 'cMissile' && (!canEmit(f, WEAPON.missile) || s.live.some(e => e.kind === 'missile'))) return rej()   // one straight missile per owner
  if (key === 'cRack' && (!canEmit(f, WEAPON.rack) || s.live.some(e => e.kind === 'rack'))) return rej()            // never stack a second rack
  if (key === 'cRecoil' && !canEmit(f, WEAPON.recoil)) return rej()
  const cost = md.cost && !md.weapon ? md.cost : 0                                                 // weapons pay per emission
  if ((f.energy || 0) < cost) return false
  if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  f.currentAttack.cy = { key, dir: f.facing || 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, hold: 1, released: false,
    fired: false, pulses: 0, spawns: 0, cut: false, hot: false, phase: 'start', fromChain: !!extra?.fromChain }
  f.currentAttack.hasHit = !!md.noBody
  if (md.mega) f.currentAttack.launchY = md.knockbackY
  f.isBlocking = false; f.isCharging = false; if (g) f.vx = 0
  if (key === 'up') f.jumpHeld = true
  if (key === 'cRecoil') { spend(f, WEAPON.recoil); s.stats.recoils++ }
  if (key === 'cSlamAir') { s.slamUsed = true; s.stats.slams++; f.vx = 0; f.vy = Math.min(f.vy || 0, 0) }
  if (key === 'cUltOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  if (key === 'cVent') { s.stats.vents++; cue(f, 'ventOpen') }
  else if (!['cSonic', 'cCannon', 'cMissile', 'cRack'].includes(key)) cue(f, md.mega ? 'megaWind' : md.isSpecial ? 'special' : 'swing')
  else cue(f, 'transform')
  return true
}
// re-key the live attack into another move at a given elapsed frame (Sonic Shot → held cannon branch)
function rekey(f, key, elapsed, W) {
  const old = f.currentAttack?.cy
  if (!startCyMove(f, key, W, { cancel: true })) return false
  const a = f.currentAttack; a.timer = a.total - elapsed
  if (old) { a.cy.hold = old.hold; a.cy.released = old.released }
  return true
}

// ── projectile emission (engine projectile + owner tag) ──
function emit(f, kind, W, k = 0) {
  const s = cyborgState(f), P = PROJ[kind], dir = f.facing || 1
  const art = CYBORG_FX[P.art], tag = f._recolorTag
  const sheet = tag ? `./assets/cyborg/skins/${tag}/fx/${P.art}_strip.png` : `./assets/cyborg/fx/${P.art}_strip.png`
  const vy = kind === 'rack' ? RACK_VY[k] : 0
  const pr = W?.spawn?.(f, 'cyborg_' + kind, { damage: dmg(P.raw), speed: P.speed, vx: dir * P.speed, vy,
    spawnX: dir > 0 ? f.x + f.w + 2 : f.x - P.w - 2, spawnY: f.y + (f.h || 94) * P.y, w: P.w, h: P.h, radius: P.w / 2, lifetime: P.life,
    hitstun: P.hitstun, knockbackX: P.kbx, knockbackY: P.kby, sheet, spriteFrames: art.frames, spriteW: art.w, spriteH: art.h,
    spriteSpeed: P.art === 'sonic' ? 3 : 4, spriteScale: 2, color: '#7fd4ff' })
  if (!pr) return null
  pr.damageType = P.art === 'sonic' ? 'energy' : 'explosive'; pr.isSpecial = true; pr.noTrail = true
  pr._cy = { kind, n: ++s.nProj }
  s.live.push({ n: pr._cy.n, kind, x: pr.x, y: pr.y, hit: false })
  return pr
}

// ── combat.js hooks (cyborg-gated) ──
export function cyborgHitbox(f) {
  const a = f.currentAttack, m = a?.cy, md = CYBORG_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  if (md.shock) {   // Mega Punch: ONE bounded grounded shockwave from the fist's floor contact (never hits high airborne foes)
    const cx = ctrX(f), floor = f.y + f.h, x0 = m.dir > 0 ? cx - md.shock.back : cx - md.shock.fwd
    return { x: x0, y: floor - md.shock.h, w: md.shock.back + md.shock.fwd, h: md.shock.h }
  }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 16), w: a.rangeX, h: a.rangeY }
}
export function cyborgBlock(f, d, a) {
  if (!isCyborg(f) || !a?.cy) return
  d.blockstun = CYBORG_MOVES[a.cy.key].blockstun; a.cy.blocked = true
}
export function cyborgHit(f, d, a, { armored = false } = {}) {
  if (!isCyborg(f) || !a?.cy) return
  if (armored) return                   // armor-absorbed: not clean → no Hot Impact, no ultimate confirm
  a.cy.clean = true; f._cmdHitLanded = true
  const s = cyborgState(f), md = CYBORG_MOVES[a.cy.key]
  // HOT IMPACT: Mega Punch (ground or air slam) landing a valid unblocked hit at Heat ≥ 60 vents 20 Heat, once per attack.
  if (md.mega && !a.cy.hot && !a.cy.blocked && s.heat >= HEAT.hotImpact.min) { a.cy.hot = true; cool(s, HEAT.hotImpact.vent); s.stats.hot++; cue(f, 'hotImpact') }
  if (md.mega) { cue(f, 'megaImpact'); pushFx(s, 'shock', ctrX(f) + a.cy.dir * 30, f.y + f.h) }
  if (a.cy.key === 'cUltOpen' && d.health > 0) { a.cy.ultHit = true; ultTargets.set(f, d) }
}
// After the engine writes knockback: WEIGHT 1.15 for Cyborg as the DEFENDER (received velocity ÷ 1.15).
export function cyborgKnockback(att, def) { if (isCyborg(def)) weigh(def) }
function weigh(d) {
  d.vx = (d.vx || 0) / WEIGHT; if ((d.vy || 0) < 0) d.vy = d.vy / WEIGHT
  cyborgState(d).stats.weightScaled++
}
// Every projectile connect (hit or block). Gated twice: Cyborg's own projectiles, and Cyborg as the target (weight).
export function cyborgProjectileHit(proj, t, { armored = false } = {}) {
  if (isCyborg(t) && !t.isBlocking && !armored) weigh(t)
  const f = proj?.owner, k = proj?._cy
  if (!k || !isCyborg(f)) return
  const s = cyborgState(f), e = s.live.find(x => x.n === k.n), blocked = !!t.isBlocking
  if (e) e.hit = true
  const key = tid(t)
  if (k.kind === 'shot' || k.kind === 'pulse') {
    // SONIC RESONANCE: an unblocked sonic contact marks this target (one mark per owner/target; refresh, never stacks).
    if (!blocked && !armored && t.health > 0) { if (!s.marks[key]) s.stats.marks++; s.marks[key] = RESONANCE.life; cue(f, 'mark') }
    cue(f, 'sonicHit')
  } else {
    // missile contact: the explosion is the VISUAL payoff of this single projectile hit (no second damage source)
    pushFx(s, 'ex', proj.x + proj.w / 2, proj.y + proj.h / 2); cue(f, 'boom')
    if (s.marks[key]) {
      delete s.marks[key]                                         // the next missile contact consumes the mark
      if (blocked || armored) s.stats.markConsumedBlocked++
      else if (!s.resUsed && t.health > 0) {
        // CONVERSION: only the knockback profile changes — a short pop with near-zero carry (stays in close range)
        t.vx = (proj.vx > 0 ? 1 : -1) * RESONANCE.popVx; t.vy = RESONANCE.popVy; t.onGround = false; t.grounded = false
        s.resUsed = true; s.stats.conversions++; cue(f, 'resonance')
      }
    }
  }
}
function pushFx(s, kind, x, y) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), t: 0 }); if (s.fx.length > 8) s.fx.shift(); if (kind === 'ex') s.stats.explosions++ }

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickCyborg(f, opp, raw, W) {
  if (!isCyborg(f)) { if (f?._cyborg) clearCyborg(f, W); return }
  const s = cyborgState(f); s.tick++
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if (raw.up && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  f.isCharging = false                         // L2 / Charge is the VENT for Cyborg: it never recharges Power
  const g = grounded(f)
  if (g && !s.wasGround) {                     // genuine landing: thruster + slam allowances reset; landing frames (cosmetic)
    s.djUsed = false; s.slamUsed = false
    if (!f.attacking && !(f.hitstun > 0)) f._cyLand = 27
  }
  s.airT = g ? 0 : s.airT + 1
  if (f._cyLand > 0) f._cyLand--
  if (f.hitstun > 0 || f.attacking) f._cyLand = 0
  if (f.health <= 0) { s.wasGround = g; return }
  // THRUSTER REBOOST: a fresh Jump press while already airborne (not the take-off press), one per airtime, 8 Power.
  const je = s.edges.jump
  if (je && je.tick === s.tick && !g && s.airT >= 2 && !s.wasGround && !s.djUsed && !f.attacking && !(f.hitstun > 0) && !f.isGrabbed && !f.knockdownState && !isCyborgUltActive()) {
    if ((f.energy || 0) >= THRUSTER.cost) {
      f.energy -= THRUSTER.cost; s.djUsed = true; s.stats.dj++
      f.vy = THRUSTER.vy; f.vx = (f.vx || 0) * THRUSTER.vxKeep; f.jumpCount = Math.max(2, f.jumpCount || 0); cue(f, 'thruster')
    } else { s.stats.djFail++; cue(f, 'reject') }   // insufficient Power: the airtime allowance is NOT consumed
  }
  s.wasGround = g
  if (f.hitstop > 0) return
  s.clock++
  // projectile bookkeeping: follow live projectiles; a missile that ends without contact bursts where it ended (visual)
  for (let i = s.live.length - 1; i >= 0; i--) {
    const e = s.live[i], p = (W?.projectiles || []).find(q => q?.owner === f && q._cy?.n === e.n)
    if (p) { e.x = p.x + p.w / 2; e.y = p.y + p.h / 2; continue }
    if (!e.hit && (e.kind === 'missile' || e.kind === 'rack')) pushFx(s, 'ex', e.x, e.y)
    s.live.splice(i, 1)
  }
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 30) s.fx.splice(i, 1)
  for (const k of Object.keys(s.marks)) if (--s.marks[k] <= 0) delete s.marks[k]
  if (!(f.comboCounter > 0)) s.resUsed = false
  // HEAT: passive cooling only in eligible neutral (not attacking / venting / stunned / guarding / grabbed / cinematic)
  const a = f.attacking ? f.currentAttack : null, m = a?.cy
  const neutral = !a && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isGrabbed && !f.knockdownState && !isCyborgUltActive()
  if (neutral) s.stats.passiveCooled += cool(s, HEAT.passive)
  if (s.ovh) { if (s.ovh.t > 0) s.ovh.t--; if (s.ovh.t <= 0 && s.heat <= HEAT.overheatExit) { s.ovh = null; cue(f, 'weaponsOnline') } }
  // MANUAL VENT: grounded neutral HOLD of Charge (L2 / P). Not from an attack, not while guarding / stunned / grabbed.
  if (!a && raw.charge && !raw.block && !raw.left && !raw.right && g && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isBlocking &&
      !f.isGrabbed && !f.knockdownState && !(f.attackCooldown > 0)) { startCyMove(f, 'cVent', W); return }
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = a.total - a.timer, md = CYBORG_MOVES[m.key]
  f.facing = m.dir
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) {
    const want = m.origin + m.dir * md.travel[2] * (t - md.travel[0] + 1)
    let x = Math.max(0, Math.min(sw(W) - f.w, want))
    if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }
    f.x = x; f.vx = 0
  } else if (g && m.key !== 'cRecoil') f.vx = 0
  switch (m.key) {
    case 'cVent': {
      if (m.phase === 'start' && t >= VENT.startup) { m.phase = 'on'; cue(f, 'vent') }
      if (m.phase !== 'rec' && !raw.charge) { m.phase = 'rec'; a.timer = Math.min(a.timer, VENT.recovery); cue(f, 'ventClose') }
      if (m.phase === 'on') { s.stats.ventCooled += cool(s, HEAT.vent); a.timer = Math.max(a.timer, VENT.recovery + 30) }   // open while held
      break
    }
    case 'cSonic': {   // TAP route. The branch is decided by HOLD length: ≥ 18 held frames → cannon, never a shot first.
      if (!raw.special) m.released = true
      if (!m.released && !m.fired) { m.hold++; if (m.hold >= CANNON.decideAt) { rekey(f, 'cCannon', CANNON.decideAt, W); cue(f, 'cannonBranch'); break } }
      if (t >= a.activeStart - 1 && !m.fired && !m.released) { a.timer++; break }   // hold on the last startup frame until release / branch
      if (t >= a.activeStart && !m.fired) {
        m.fired = true
        if (canEmit(f, WEAPON.shot) && emit(f, 'shot', W)) { spend(f, WEAPON.shot); s.stats.shots++; cue(f, 'shot') }
        else { s.stats.fizzles++; cue(f, s.ovh ? 'locked' : 'reject') }
      }
      break
    }
    case 'cCannon': {   // HELD route: four bounded pulses @22/28/34/40; release / shortage / overheat stops future pulses
      if (!raw.special) m.released = true
      const end = CANNON.firstPulse + CANNON.spacing * (CANNON.pulses - 1) + 1
      if (!m.cut && m.released && t < end) { m.cut = true; a.timer = Math.min(a.timer, a.total - end); cue(f, 'retract'); break }
      if (!m.cut && t >= CANNON.firstPulse && (t - CANNON.firstPulse) % CANNON.spacing === 0 && m.pulses < CANNON.pulses) {
        if (canEmit(f, WEAPON.pulse) && emit(f, 'pulse', W)) { spend(f, WEAPON.pulse); m.pulses++; s.stats.pulses++; cue(f, 'pulse') }
        else { m.cut = true; a.timer = Math.min(a.timer, a.total - end); s.stats.fizzles++; cue(f, s.ovh ? 'locked' : 'reject') }
      }
      break
    }
    case 'cMissile': {
      if (t >= a.activeStart && !m.fired) {
        m.fired = true
        if (canEmit(f, WEAPON.missile) && emit(f, 'missile', W)) { spend(f, WEAPON.missile); s.stats.missiles++; cue(f, 'missile') }
        else { s.stats.fizzles++; cue(f, 'reject') }
      }
      break
    }
    case 'cRack': {   // five authored loop launches, one per loop pass; every later spawn is re-checked before spending
      const end = RACK.first + RACK.spacing * (RACK.count - 1) + 1
      if (!m.cut && t >= RACK.first && (t - RACK.first) % RACK.spacing === 0 && m.spawns < RACK.count) {
        if (canEmit(f, WEAPON.rack) && emit(f, 'rack', W, m.spawns)) { spend(f, WEAPON.rack); m.spawns++; s.stats.rack++; cue(f, 'rack') }
        else { m.cut = true; a.timer = Math.min(a.timer, a.total - end); s.stats.fizzles++; cue(f, s.ovh ? 'locked' : 'reject') }
      }
      break
    }
    case 'cRecoil': {   // small bounded owner recoil over 10 f from the active frame (≈ 33 px); ground only
      const r = md.recoil, k = t - a.activeStart
      if (k >= 0 && k < r.frames && g) f.vx = -m.dir * r.vx * (1 - k / r.frames)
      else if (g) f.vx = 0
      if (t === a.activeStart) { pushFx(s, 'sonicBurst', m.dir > 0 ? f.x + f.w + 30 : f.x - 30, f.y + f.h * 0.36); cue(f, 'recoil') }
      break
    }
    case 'cSlamAir': {   // supplied mid-hop fist pose: short hang, then capped descent; the landing plays the impact
      if (t < SLAM.hang) { f.vy = Math.min(f.vy || 0, 1); f.vx = 0 }
      else { f.vy = SLAM.vy; f.vx = 0 }
      if (g && t >= 1) { startCyMove(f, 'cSlamLand', W, { cancel: true }); cue(f, 'megaWind') }
      else if (t >= SLAM.hang + SLAM.maxFall) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 12 }   // cap reached
      break
    }
    case 'cUltOpen': {
      if (t >= a.activeStart && t <= a.activeEnd + 2 && !m.burst) { m.burst = true; pushFx(s, 'sonicBurst', m.dir > 0 ? f.x + f.w + 50 : f.x - 50, f.y + f.h * 0.36) }
      if (m.clean && m.ultHit && !m.ultStarted) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateCyborgUlt(f, tg, W) }
      if (t === a.activeEnd + 1 && !m.clean) { s.stats.ultWhiffs++; cue(f, 'ultMiss') }
      break
    }
  }
}

// ══ ULTIMATE — BOOYAH PROTOCOL: FULL SYSTEMS IMPACT ══════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (same as the Rangers): activate / isActive / update / clear / status. While
// active, game.js freezes combat, physics and input and calls updateCyborgUlt() each frame. Cyborg's pose comes from a
// non-hitting currentAttack on the ult strips; cinematic missiles and the cannon beam are drawn by cyborgFx from
// cyborgUltView() (a pure function of the frame). Contacts go through W.damage with the combo scale captured at confirm.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1 }
export const isCyborgUltActive = () => cine.active
export const cyborgUltScene = () => (cine.active ? cine : null)   // the live scene, read by cyborgUlt.js (cinematic director)
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, cy: null, _ultPose: true }
}
export function activateCyborgUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = cyborgState(f)
  s.marks = {}; s.resUsed = true                 // no ordinary conversion inside / right after the cinematic
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: f.y + (f.h || 94) - (target.h || 94),
    cx0: f.x, tx0: target.x, dir: f.facing || 1, done: 0, scale: E.comboScale?.(f) ?? 1 })
  s.ult = { frame: 0, done: 0 }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  cue(f, 'ultConfirm')
  return true
}
function ultHit(i) {
  const c = ULT.contacts[i], t = cine.target, f = cine.caster
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  cine.done = i + 1; if (f._cyborg?.ult) f._cyborg.ult.done = cine.done
  cue(f, c.kind === 'mega' ? 'megaImpact' : c.kind === 'missile' ? 'boom' : c.kind === 'cannon' ? 'pulse' : 'punch')
}
export function updateCyborgUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, k = cine.frame, d = cine.dir
  if (!f || !t) return clearCyborgUlt()
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  for (const at of ULT.missiles) if (k === at) cue(f, 'rack')
  if (k === 110) cue(f, 'thruster')
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle   // KO: straight to the settle, no further contacts
  const fr = cine.frame, W = cine.W
  const clampX = (o, x) => Math.max(0, Math.min(sw(W) - (o.w || 48), x))
  const stand = clampX(f, cine.tx0 - d * ((f.w || 48) + 6))                      // beside the target, never through it
  if (fr < 70) { pose(f, fr < ULT.cutIn ? 'ultOpen' : 'ultCannon', fr < ULT.cutIn ? Math.min(30, fr) : fr - ULT.cutIn); f.x = clampX(f, cine.cx0); f.y = cine.floorC }
  else if (fr < 110) { pose(f, 'ultRack', fr - 70); f.x = clampX(f, cine.cx0); f.y = cine.floorC }
  else if (fr < 126) { const u = (fr - 110) / 16; pose(f, 'ultBoost', fr - 110); f.x = clampX(f, cine.cx0 + (stand - cine.cx0) * u); f.y = cine.floorC - 70 * u }
  else if (fr < 150) { pose(f, 'ultAir', fr - 126); f.x = stand; f.y = cine.floorC - 70 }
  else { const u = Math.min(1, (fr - 150) / 8); pose(f, 'ultMega', fr - 150); f.x = stand; f.y = cine.floorC - 70 * (1 - u) }
  // the target: held in its hurt pose, lifted by the aerial punch, back on the floor for the Mega Punch
  t.x = clampX(t, cine.tx0); t.vx = 0; t.vy = 0; t.isBlocking = false
  if (fr >= 134 && fr < 150) t.y = cine.floorT - 60 * Math.min(1, (fr - 134) / 8)
  else if (fr >= 150 && fr < 166) t.y = cine.floorT - 60 * (1 - (fr - 150) / 16)
  else t.y = cine.floorT
  if (f._cyborg?.ult) f._cyborg.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 12; f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._cyborg; if (s) { s.stats.ultDone++; delete s.ult; s.heat = HEAT.ultFinal } }   // Heat 60 regardless of prior Heat
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearCyborgUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._cyborg) delete f._cyborg.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export const getCyborgUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
// Render read (pure function of the frame): cannon beam span, cinematic missile positions, cut-in progress.
export function cyborgUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  const fr = cine.frame, d = cine.dir, t = cine.target
  const mx = d > 0 ? f.x + f.w : f.x, my = f.y + (f.h || 94) * 0.34, tx = ctrX(t), ty = t.y + (t.h || 94) * 0.45
  const missiles = ULT.missiles.map(at => { const u = (fr - at) / ULT.missileFlight; return u >= 0 && u < 1 ? { x: mx + (tx - mx) * u, y: my - 30 * Math.sin(Math.PI * u) + (ty - my) * u, dir: d } : null }).filter(Boolean)
  const blasts = ULT.missiles.map(at => fr - at - ULT.missileFlight).filter(k => k >= 0 && k < 22).map(k => ({ x: tx, y: ty, k }))
  return { frame: fr, cutIn: fr < ULT.cutIn ? fr / ULT.cutIn : null, beam: fr >= 44 && fr < 62 ? { x0: mx, x1: tx, y: my, dir: d, k: fr - 44 } : null,
    missiles, blasts, shock: fr >= 172 && fr < 196 ? { x: ctrX(f) + d * 30, y: f.y + f.h, k: fr - 172 } : null }
}
