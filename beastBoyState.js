// Beast Boy (beast_boy) — SIMULATION state. Plain JSON on f._beastBoy (snapshotted for replay / LAN), sim ticks only:
// no RNG, no wall clock. Every export is a no-op for any other rosterKey.
//
// TRANSIENT FORM CONTRACT (one per animal move, data in beastBoyData.js):
//   entry frames (human → morph → animal) · active interval · recovery / return frames · ONE attack instance (the
//   engine's currentAttack, whose hasHit latch allows at most one damage contact) · explicit movement (travel / charge /
//   flight / pounce owned here), explicit hurtbox per form (HURTBOX) and explicit interruption policy:
//   a hit clears the live attack in combat.js, so the queued link, the animal hurtbox (derived from the live attack) and
//   any pending movement all vanish on that same frame; the fighter shows his ordinary humanoid hurt reaction with the
//   engine's real hitstun / knockback / HP. Nothing here grants invulnerability, heals, resets HP or multiplies stats.
import { BEAST_BOY_MOVES, ANIMAL_OF, NEXT_ANIMAL, ANIMAL_DIR, ANIMALS, WILD_CHAIN, INSTINCT, UP_GRACE, TRICERA, BIRD, TIGER_AIR, FEINT,
  HURTBOX, ULT, dmg } from './beastBoyData.js'

export const isBeastBoy = f => f?.rosterKey === 'beast_boy'
export const bbState = f => f._beastBoy ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  wasGround: true, airBird: false, airTiger: false,
  wc: { links: 0, chain: [], open: null, queued: null },          // Wild Chain (per combo)
  inst: { seen: {}, token: false },                               // Instinct (per round)
  upAge: 0, ownsUp: false, fx: [],
  stats: { animalStarts: 0, animalHits: 0, animalBlocked: 0, animalWhiffs: 0, rejects: 0, interrupts: 0, chainOpens: 0, chainQueued: 0,
    chainLinks: 0, chainDropped: 0, instinctEarned: 0, instinctArmed: 0, instinctUsed: 0, feints: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0 },
  cues: [] }

// Engine helpers handed in by beastBoy.js (avoids a combat.js ↔ beastBoyState import cycle).
const E = { startMove: null, comboScale: null }
export function registerBeastBoyEngine(o) { Object.assign(E, o) }
const cue = (f, c) => bbState(f).cues.push(c)
const ultTargets = new WeakMap()   // attacker → fighter hit by its opener (never serialized)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.bb) ? f.currentAttack : null

function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }

export function clearBeastBoy(f) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearBeastBoyUlt()
  if (live(f)) endAttack(f)
  delete f._beastBoy; delete f._beastBoyRemoteInput; delete f._bbLand
}
// Round-scope reset that KEEPS nothing animal-shaped (used by game.js at every lifecycle site via clearBeastBoy).

// ── form query (hurtbox, render, audits) ──
export function formOf(f) {
  const a = live(f); if (!a) return 'human'
  const md = BEAST_BOY_MOVES[a.bb.key]; if (!md?.forms) return 'human'
  const t = elapsed(a); let form = 'human'
  for (const [at, fm] of md.forms) if (t >= at) form = fm
  return form
}

// Movement lock (game.js updateMovementInput). Committed attacks own the body (double-tap dash is swallowed, not
// buffered); Up held WITH Special belongs to Bird Intercept (never a jump), and a fresh grounded Up holds the jump
// UP_GRACE frames. INSTINCT: inside the armed move's last 8 frames (hitbox already over) a fresh Jump press or a
// legal double-tap dash ends the move and returns false, so the ENGINE's ordinary jump / dash runs this same frame.
const upGraceHold = (f, raw) => !!(raw?.up && !f.attacking && grounded(f) && (f._beastBoy?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export function instinctOpen(f) {
  const a = live(f); if (!a?.bb?.instinct) return false
  const t = elapsed(a)
  return t > a.activeEnd && a.timer <= INSTINCT.cancelLast && !(f.hitstun > 0) && !f.isGrabbed && !f.knockdownState
}
export function beastBoyLocked(f, raw = null) {
  if (!isBeastBoy(f)) return false
  if (isBeastBoyUltActive()) return true
  const s = bbState(f), a = f.attacking ? f.currentAttack : null
  if (a?.bb && instinctOpen(f)) {
    const jumpEdge = !!(raw?.jump && !s.prev.jump) || !!(raw?.up && !s.prev.up && !raw?.special)
    const dashOk = !!f._dashTap && grounded(f) && !(f.dashCooldown > 0)
    if (jumpEdge || dashOk) {
      endAttack(f); s.inst.used = (s.inst.used || 0) + 1; s.stats.instinctUsed++; cue(f, jumpEdge ? 'instinctJump' : 'instinctDash')
      return false
    }
  }
  if (a && !(a.launcher && a.hasHit)) { f._dashTap = false; return true }
  if (raw ? (raw.special && raw.up && grounded(f)) : s.ownsUp) return true
  return upGraceHold(f, raw)
}

// Start one of Beast Boy's moves through combat.startMove (frameExact path) and attach the per-move descriptor `bb`.
// Every legality / resource check happens BEFORE anything is spent.
export function startBBMove(f, key, W, { cancel = false, fromChain = false } = {}) {
  if (!isBeastBoy(f)) return false
  const s = bbState(f), md = BEAST_BOY_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  const airOnly = ['air', 'tigerA'], either = ['bird', 'tigerLand']
  if (!airOnly.includes(key) && !either.includes(key) && !g) return false
  if (airOnly.includes(key) && g) return false
  if (key === 'bird' && s.airBird) { s.stats.rejects++; cue(f, 'reject'); return false }        // once per airtime
  if (key === 'tigerA' && s.airTiger) { s.stats.rejects++; cue(f, 'reject'); return false }
  const cost = md.cost || 0
  if ((f.energy || 0) < cost) { s.stats.rejects++; cue(f, 'reject'); return false }
  const carry = cancel ? f.currentAttack?.bb : null
  if (cancel) endAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  const a = f.currentAttack
  a.bb = { key, dir: f.facing || 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, fromChain, instinct: false,
    travelled: 0, stopped: false, landed: false, phase: 'start' }
  a.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; if (g) f.vx = 0
  if (key === 'up') f.jumpHeld = true
  const animal = ANIMAL_OF[key]
  if (animal) {
    s.stats.animalStarts++
    if (key === 'bird') { s.airBird = true; f.jumpHeld = true; f.jumpCount = Math.max(f.jumpCount || 0, f.maxJumps || 1) }
    if (key === 'tigerA') { s.airTiger = true; f.vx = 0 }
    if (s.wc.chain.length === 0 || !fromChain) s.wc.chain = [animal]
    else s.wc.chain.push(animal)
    // INSTINCT is consumed when an ordinary animal move STARTS (hit, whiff or block alike).
    if (s.inst.token) { s.inst.token = false; a.bb.instinct = true; s.stats.instinctArmed++; cue(f, 'instinctArmed') }
    cue(f, 'morph'); cue(f, key === 'tigerA' ? 'tigerWind' : animal + 'Wind')
  } else if (key === 'tigerLand') {
    if (carry) { a.bb.serial = carry.serial; a.bb.clean = carry.clean; a.bb.blocked = carry.blocked; a.bb.dir = carry.dir }   // same attack instance
    if (carry?.instinct) a.bb.instinct = true                        // the air pounce's token carries into its landing
    a.bb.landing = true
  } else if (key === 'feint') { s.stats.feints++; cue(f, 'feint') }
  else if (key === 'ultOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  else cue(f, md.category === 'heavy' ? 'swingHeavy' : 'swing')
  return true
}

// ── combat.js hooks (beast_boy-gated) ──
export function beastBoyHitbox(f) {
  const a = f.currentAttack, m = a?.bb, md = BEAST_BOY_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  if (md.box) {   // deliberate animal geometry from the body front / feet (never the transparent art bounds)
    const [x0, w, top, h] = md.box, front = m.dir > 0 ? f.x + f.w : f.x, feet = f.y + f.h
    return { x: m.dir > 0 ? front + x0 : front - x0 - w, y: feet - top, w, h }
  }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 18), w: a.rangeX, h: a.rangeY }
}
export function beastBoyHurtbox(f) {
  const hb = HURTBOX[formOf(f)]; if (!hb) return null
  const dir = live(f)?.bb?.dir || f.facing || 1, cx = ctrX(f) + dir * hb.dx, feet = f.y + f.h
  return { x: cx - hb.w / 2, y: feet - hb.top, w: hb.w, h: hb.h }
}
export function beastBoyBlock(f, d, a) {
  if (!isBeastBoy(f) || !a?.bb) return
  const md = BEAST_BOY_MOVES[a.bb.key]
  d.blockstun = md.blockstun; a.bb.blocked = true
  if (md.animal) { bbState(f).stats.animalBlocked++; stopOnContact(f, a) }
}
export function beastBoyHit(f, d, a, { armored = false } = {}) {
  if (!isBeastBoy(f) || !a?.bb) return
  const md = BEAST_BOY_MOVES[a.bb.key], s = bbState(f)
  if (md.animal) stopOnContact(f, a)
  if (armored) return                      // armor-absorbed: not clean → no Wild Chain, no Instinct credit, no ult confirm
  a.bb.clean = true; f._cmdHitLanded = true
  if (md.animal && !a.bb.blocked) {
    s.stats.animalHits++
    const animal = md.animal
    cue(f, animal + 'Hit')
    // INSTINCT collection: distinct animals while no token is held
    if (!s.inst.token) {
      s.inst.seen[animal] = 1
      if (Object.keys(s.inst.seen).length >= INSTINCT.distinct) { s.inst.token = true; s.inst.seen = {}; s.stats.instinctEarned++; cue(f, 'instinct') }
    }
    // WILD CHAIN opportunity: ≤ 2 links, no repeated animal within this combo's chain
    const next = NEXT_ANIMAL[animal]
    if (s.wc.links < WILD_CHAIN.maxLinks && !s.wc.chain.includes(next) && d.health > 0) {
      s.wc.open = { from: animal, next, until: s.clock + WILD_CHAIN.window, serial: a.bb.serial }; s.stats.chainOpens++; cue(f, 'chainReady')
    }
  }
  if (a.bb.key === 'ultOpen' && d.health > 0) { a.bb.ultHit = true; ultTargets.set(f, d) }
}
// A contact (hit or block) ends the damaging part of a travelling animal: the charge / pounce stops there.
function stopOnContact(f, a) {
  a.bb.stopped = true
  const md = BEAST_BOY_MOVES[a.bb.key]
  if (md.charge && elapsed(a) <= a.activeEnd) a.timer = a.total - (a.activeEnd + 1)      // skid → reverse morph
  if (md.flight && elapsed(a) <= a.activeEnd) a.timer = a.total - (a.activeEnd + 1)      // forced return
}

// Which animal move a Special direction calls (shared by the command layer and Wild Chain).
export function animalMoveFor(animal, air) {
  if (animal === 'tiger') return air ? 'tigerA' : 'tiger'
  return animal === 'tricera' ? 'tricera' : animal
}
// The Wild Chain execution boundary of the live move: the first humanoid-return cell (morph-back silhouette played).
function boundaryReached(a) {
  const md = BEAST_BOY_MOVES[a.bb.key]
  if (a.bb.key === 'tigerA') return false                          // air pounce: the boundary lives in its landing move
  return md.returnAt != null && elapsed(a) >= md.returnAt
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickBeastBoy(f, opp, raw, W) {
  if (!isBeastBoy(f)) { if (f?._beastBoy) clearBeastBoy(f); return }
  const s = bbState(f); s.tick++
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up']) {
    const v = !!raw[k]
    if (v && !s.prev[k] && k !== 'up') s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if ((raw.up || raw.jump) && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up && !raw.jump) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true                           // Bird / launcher never leak an ordinary jump
  else if (!raw.up && !raw.jump && f.jumpHeld && f.hitstop > 0) f.jumpHeld = false   // physics is frozen in hitstop: release the launcher's jump latch so the first post-hitstop Jump is read
  const g = grounded(f)
  const a = live(f)
  if (g && !s.wasGround) {                                       // genuine landing: airtime allowances reset (not mid-move)
    if (!a || !BEAST_BOY_MOVES[a.bb.key]?.animal) { s.airBird = false; s.airTiger = false }
    if (!f.attacking && !(f.hitstun > 0)) f._bbLand = 22
  }
  if (g && !a) { s.airBird = false; s.airTiger = false }
  if (f._bbLand > 0) f._bbLand--
  if (f.hitstun > 0 || f.attacking) f._bbLand = 0
  s.wasGround = g
  // interruption: no live move → nothing queued / open survives (hit, grab, breaker, KO, reset all land here)
  if (!a || f.hitstun > 0 || f.isGrabbed || f.knockdownState) {
    if (s.wc.queued || s.wc.open) { if (s.wc.queued) s.stats.chainDropped++; s.wc.queued = null; s.wc.open = null }
    if (a && f.hitstun > 0) { s.stats.interrupts++; endAttack(f) }
  }
  // genuine combo end (idle, attacker combo counter dropped) → the chain record resets
  if (!f.attacking && !(f.comboCounter > 0)) { s.wc.links = 0; s.wc.chain = [] }
  if (s.wc.open && s.clock > s.wc.open.until) s.wc.open = null
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 24) s.fx.splice(i, 1)
  if (f.health <= 0 || f.hitstop > 0) return
  s.clock++
  const m = a?.bb
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = elapsed(a), md = BEAST_BOY_MOVES[m.key]
  f.facing = m.dir
  // ── Wild Chain execution at the authored return boundary ──
  if (s.wc.queued && s.wc.queued.serial === m.serial && boundaryReached(a)) {
    const q = s.wc.queued; s.wc.queued = null; s.wc.open = null
    const key = animalMoveFor(q.next, !g)
    if (startBBMove(f, key, W, { cancel: true, fromChain: true })) { s.wc.links++; s.stats.chainLinks++; cue(f, 'chainGo') }
    else { s.stats.chainDropped++; cue(f, 'reject') }
    return
  }
  if (md.animal && t === a.activeEnd + 1 && !m.clean && !m.blocked) { s.stats.animalWhiffs++; cue(f, 'whiff') }
  // ── per-move movement policy ──
  const clampX = x => Math.max(0, Math.min(sw(W) - f.w, x))
  const noPass = x => {   // never through the opponent's body (no automatic behind-opponent travel)
    if (!opp || !(opp.health > 0)) return x
    const oL = opp.x, oR = opp.x + opp.w
    if (m.dir > 0 && f.x + f.w <= oL + 1) return Math.min(x, oL - f.w)
    if (m.dir < 0 && f.x >= oR - 1) return Math.max(x, oR)
    return x
  }
  if (md.travel && t >= md.travel[0] && t < md.travel[1] && !m.stopped) {
    f.x = noPass(clampX(f.x + m.dir * md.travel[2])); f.vx = 0
  } else if (md.charge) {
    if (t >= a.activeStart && t <= a.activeEnd && !m.stopped) {
      const nx = noPass(clampX(f.x + m.dir * TRICERA.speed)), step = Math.abs(nx - f.x)
      f.x = nx; f.vx = 0; m.travelled += step
      if (t === a.activeStart) cue(f, 'hooves')
      if (m.travelled >= TRICERA.maxTravel || step < 0.5 && t > a.activeStart + 1) { m.stopped = true; a.timer = a.total - (a.activeEnd + 1) }   // 180 px or wall / body
    } else if (g) f.vx = 0
  } else if (md.flight) {
    if (t >= a.activeStart && t <= a.activeEnd) {
      const k = t - a.activeStart
      f.vx = m.dir * BIRD.vx; f.vy = BIRD.vy0 + BIRD.ay * k; f.onGround = false; f.grounded = false
      if (k % 8 === 0) cue(f, 'wing')
    } else if (t > a.activeEnd) { f.vx = m.dir * BIRD.retVx }   // return: ordinary gravity, small drift
    else if (g) f.vx = 0
  } else if (m.key === 'tigerA') {
    if (t >= a.activeStart) { f.vx = m.dir * TIGER_AIR.vx; f.vy = Math.max(f.vy || 0, TIGER_AIR.vyMin) }
    else { f.vx = (f.vx || 0) * 0.8; f.vy = Math.min(f.vy || 0, 1) }
    if (g && t >= 1) { if (startBBMove(f, 'tigerLand', W, { cancel: true })) cue(f, 'land'); return }
    if (t >= a.activeStart + TIGER_AIR.fallCap) endAttack(f, 10)
  } else if (md.feint) {
    if (t < FEINT.frames) { f.x = clampX(f.x - m.dir * FEINT.speed); f.vx = 0 }
  } else if (g && m.key !== 'up') f.vx = 0
  if (m.key === 'ultOpen') {
    if (m.clean && m.ultHit && !m.ultStarted) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateBeastBoyUlt(f, tg, W) }
    if (t === a.activeEnd + 1 && !m.clean) { s.stats.ultWhiffs++; cue(f, 'ultMiss') }
  }
}

// Command-layer helper: queue the matching next animal while the window is open (fresh direction+Special only).
export function tryQueueWildChain(f, e) {
  const s = bbState(f), a = live(f), o = s.wc.open
  if (!a || !o || o.serial !== a.bb.serial || s.clock > o.until || s.wc.queued) return false
  const want = ANIMAL_DIR[o.next]
  const dir = e.up ? 'up' : e.fwd ? 'fwd' : e.back ? 'back' : e.down ? 'down' : 'neutral'
  if (dir !== want) return false
  s.wc.queued = { next: o.next, serial: a.bb.serial }; s.stats.chainQueued++; cue(f, 'chainQueued')
  return true
}

// ══ ULTIMATE — ANIMAL INSTINCT: FOUR BEAST FINISH ════════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (same as the Rangers / Cyborg): activate / isActive / update / clear / status.
// While active, game.js freezes combat, physics and input and calls updateBeastBoyUlt() each frame. Gar's pose comes
// from a non-hitting currentAttack on the ult strips (supplied transformation / return frames); each animal contributes
// ONE scheduled contact through W.damage with the combo scale captured at confirm. No controllable phase, no per-form HP.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1 }
export const isBeastBoyUltActive = () => cine.active
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, bb: null, _ultPose: true }
}
export function activateBeastBoyUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = bbState(f)
  s.wc = { links: 0, chain: [], open: null, queued: null }       // ordinary queued morphs never survive into the cinematic
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
  cine.done = i + 1; if (f._beastBoy?.ult) f._beastBoy.ult.done = cine.done
  cue(f, c.kind + 'Hit')
}
const MORPH_CUES = { 30: 'morph', 75: 'morph', 115: 'morph', 165: 'morph', 235: 'morph' }
export function updateBeastBoyUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, d = cine.dir
  if (!f || !t) return clearBeastBoyUlt()
  const k = cine.frame
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  if (MORPH_CUES[k]) cue(f, MORPH_CUES[k])
  if (k === 165) cue(f, 'hooves')
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle   // KO: straight to the settle, no further contacts
  const fr = cine.frame, W = cine.W
  const clampX = (o, x) => Math.max(0, Math.min(sw(W) - (o.w || 48), x))
  const stand = clampX(f, cine.tx0 - d * ((f.w || 48) + 10))                 // beside the target, never through it
  let beat = ULT.beats[0]; for (const b of ULT.beats) if (fr >= b.from) beat = b
  pose(f, beat.pose, fr - beat.from)
  f.y = cine.floorC
  if (fr < 30) f.x = clampX(f, cine.cx0)
  else if (fr < 75) f.x = stand
  else if (fr < 115) { const u = Math.min(1, (fr - 75) / 17); f.x = stand; f.y = cine.floorC - 46 * Math.sin(Math.PI * Math.min(1, (fr - 75) / 34)) * (fr < 109 ? 1 : 0) * u }
  else if (fr < 165) f.x = stand
  else if (fr < 235) { const back = clampX(f, stand - d * 120), u = Math.max(0, Math.min(1, (fr - 170) / 17)); f.x = back + (stand - back) * u }
  else f.x = stand
  // the target: held in its hurt pose; lifted by the bird, knocked down by the triceratops
  t.x = clampX(t, cine.tx0); t.vx = 0; t.vy = 0; t.isBlocking = false
  t.y = fr >= 92 && fr < 112 ? cine.floorT - 30 * Math.sin(Math.PI * (fr - 92) / 20) : cine.floorT
  if (f._beastBoy?.ult) f._beastBoy.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { endAttack(f, 12); f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._beastBoy; if (s) { s.stats.ultDone++; delete s.ult } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearBeastBoyUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { endAttack(f); f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._beastBoy) delete f._beastBoy.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export const getBeastBoyUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
export function beastBoyUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  return { frame: cine.frame, cutIn: cine.frame < ULT.cutIn ? cine.frame / ULT.cutIn : null, done: cine.done }
}
export const ANIMAL_LIST = ANIMALS
