// Omni-Man — Viltrumite (omniman_viltrum) — SPECIALS / SUPER / ULTIMATE (simulation). Pure sim on f._omv (no RNG, sim ticks
// only); every hit leaves through the shared strike() (→ W.damage, the damage choke-point). Wired by omnimanViltrumState.js
// (onStart / specialsTick / the Unimpressed gates); never imported by the engine directly.
//   Blitz ↓↘→+S · Sky Hook →↓↘+S · Meteor Drop air ↓+S · Face in the Dirt ↓↙←+S · Unimpressed ↓↓+H · Viltrum Decree ↓↓+L
//   THINK! ↓↓+S (1 bar) · ESCAPE VELOCITY (Ultimate button, 100, universal 20 s cooldown)
import { OMV_MOVES, BLITZ, SKYHOOK, METEOR, DIRT, UNIMPRESSED, DECREE, THINK, ESCAPE, SCREEN, TOP, dmg } from './omnimanViltrumData.js'
import { flightTakeoff, ensureFlightState, FLIGHT_PHASE, isFlying } from './flight.js'

const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const floorOf = (f, W) => (f.groundY != null ? f.groundY : (W?.floorY?.() ?? 0))
const elapsed = a => a.total - a.timer
const boxHit = (o, x, y, w, h) => o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y

// keep the engine's move timer open while the sim owns the move; set the real recovery when the sim is done
const holdOpen = a => { if (a) a.timer = Math.max(a.timer, 2) }
const recover = (a, n) => { if (a) { a.timer = Math.max(1, n | 0); a.total = Math.max(a.total, elapsed(a) + a.timer) } }
function land(f, W) { const c = ensureFlightState(f); if (c.phase !== FLIGHT_PHASE.GROUNDED) { c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false } }
const flying = f => !!f._flightCtl && isFlying(f)

// a foe he can lay hands on (grab / drag): alive, not already held, not invulnerable / banished / domain-untouchable
const grabbable = t => t && t.health > 0 && !t.isGrabbed && !((t.invulnTimer || 0) > 0) && !t._banished && !t.domainUntouchable && !t._gs?.blink?.inv
export function hold(f, s, t, gap, kind) {
  // the held foe is kept as a NON-enumerable ref: the sim reads s.hold.ref, but anything that serializes GAME_STATE
  // (replay checkpoints, LAN probes) sees only its side — never the whole fighter with its render fields
  s.hold = { side: t.side, gap, kind, t: 0 }
  Object.defineProperty(s.hold, 'ref', { value: t, enumerable: false, writable: true, configurable: true })
  t.isGrabbed = true; t.grabTimer = 99; t._omvHeldBy = f.side; t.vx = 0; t.vy = 0; t.hitstun = Math.max(t.hitstun || 0, 30)
  if (t.attacking && !t.currentAttack?.isUltimate) { t.attacking = false; t.currentAttack = null; t.currentMove = null }
  t.isBlocking = false
}
function release(s) { const h = s.hold; if (!h) return null; const t = h.ref; if (t && t._omvHeldBy != null) { t.isGrabbed = false; t.grabTimer = 0; delete t._omvHeldBy } s.hold = null; return t }
function pinHeld(f, s, W, dy = 0) {   // the held foe rides in front of him (engine skips a grabbed fighter's physics)
  const h = s.hold, t = h?.ref; if (!t) return
  t.grabTimer = 99; t.vx = 0; t.vy = 0; t.hitstun = Math.max(t.hitstun || 0, 20)
  t.x = Math.max(0, Math.min(sw(W) - t.w, ctrX(f) + (f.facing || 1) * h.gap - t.w / 2)); t.y = f.y + dy
}
// move him directly (rushes): no physics velocity, clamp at the stage walls, report the wall he reached. The engine also
// clamps fighters to the CAMERA's edges after the sim runs, so a rush whose last slide was pulled back (> 3 px short of
// where it put him) has met that edge too — the same wall (s.rx = where the previous slide left him; reset per move)
function slide(f, dx, dy, W) {
  const L = 0, R = sw(W) - f.w
  let wall = 0
  const s = f._omv
  if (s && s.rx != null && Math.abs(f.x - s.rx) > 3) wall = Math.sign(s.rx - f.x) || Math.sign(dx)
  let x = f.x + dx
  if (x <= L) { x = L; wall = -1 } else if (x >= R) { x = R; wall = 1 }
  f.x = x; f.y += dy; f.vx = 0; f.vy = 0; if (s) s.rx = x
  return wall
}
const front = (f, w, h, dy = 0) => ({ x: (f.facing || 1) === 1 ? f.x + f.w : f.x - w, y: f.y + dy, w, h })

// ── START ──
export function onStartMove(f, s, key, a, W, o, K) {
  const m = a.omv
  s.rx = null
  switch (key) {
    case 'kBlitz': s.stats.blitz++; m.y0 = f.y; m.vy = flying(f) ? (o.vy || 0) : 0; break
    case 'kSkyHook': s.stats.skyHooks++; break
    case 'kMeteor': s.stats.meteors++; m.diag = !!o.diag; break
    case 'kDirt': s.stats.dirt++; break
    case 'kUnimp': s.stats.unimp++; s.cd.unimp = UNIMPRESSED.cooldown; s.counter = { until: s.tick + UNIMPRESSED.startup + UNIMPRESSED.window, from: s.tick + UNIMPRESSED.startup, done: false }; break
    case 'kDecree': s.stats.decrees++; break
    case 'kThink': s.stats.think++; m.y0 = f.y; break
    case 'kEscape': m.y0 = f.y; break
  }
}

// ── PER-FRAME (his live technique) ──
export function tickMoves(f, s, W, opp, raw, K) {
  const a = f.attacking && f.currentAttack?.omv ? f.currentAttack : null
  backhandTick(f, s, W, K)
  if (s.counter && s.tick > s.counter.until) s.counter = null
  if (s.ev) { evTick(f, s, W, a, K); return }
  if (!a) { if (s.rush) s.rush = null; if (s.hold) release(s); return }
  const m = a.omv, t = elapsed(a), md = OMV_MOVES[m.key]
  switch (m.key) {
    case 'kBlitz': return blitzTick(f, s, W, a, m, t, raw, K)
    case 'kSkyHook': return hookTick(f, s, W, a, m, t, K)
    case 'kMeteor': return meteorTick(f, s, W, a, m, t, K)
    case 'kDirt': return dirtTick(f, s, W, a, m, t, K)
    case 'kThink': return thinkTick(f, s, W, a, m, t, K)
    case 'kEscape': if (!m.evUsed) { m.evUsed = 1; evStart(f, s, W, a, m, t, K) } return   // once per activation (the move outlives s.ev by its recovery)
    case 'kDecree':
      if (t >= DECREE.frames - 1 && !m.fired) {
        m.fired = 1; s.stats.decreeDone++
        if (!f.infiniteEnergy) f.energy = Math.min(f.maxEnergy || 200, (f.energy || 0) + Math.round((f.maxEnergy || 200) * DECREE.gain))
        K.cue(f, 'decree'); K.pushFx(s, 'decree', ctrX(f), f.y)
      }
      return
    case 'kUnimp':   // the stance holds for the whole 24-frame window (only the eye glint tells); then the whiff recovery
      if (s.counter?.done) return
      if (s.counter && s.tick === s.counter.from) { K.cue(f, 'glint'); s.stats.glints = (s.stats.glints || 0) + 1 }   // the only tell: his eye glint
      if (s.counter) { holdOpen(a); f._spriteCastMove = 'omvGlint'; f._spriteCastTimer = 2 }
      else if (!m.fired) { m.fired = 1; recover(a, UNIMPRESSED.whiff) }
      return
  }
}

// VILTRUMITE BLITZ: wind-up, then a straight rush at top speed — tap 50 % / hold 80 % of the screen; contact = 90;
// whiff = overshoot (skids on 0.86) + long recovery; a wall at speed = his crash
function blitzTick(f, s, W, a, m, t, raw, K) {
  if (t < BLITZ.startup) { holdOpen(a); f.vx = 0; f.vy = 0; if (!flying(f) && !grounded(f)) f.y = m.y0; return }
  if (!s.rush && !m.done) {
    const dist = (raw.special ? BLITZ.holdDist : BLITZ.tapDist) * SCREEN
    const up = raw.up && !raw.down ? -1 : raw.down && !raw.up ? 1 : 0
    s.rush = { kind: 'blitz', left: dist, dir: f.facing || 1, dy: flying(f) ? up : 0, sp: TOP, over: false }; s.stats.lastRushDist = Math.round(dist)
    K.cue(f, 'blitz'); K.pushFx(s, 'boom', ctrX(f), ctrY(f), { dir: f.facing || 1 })
  }
  const r = s.rush
  if (!r) return
  holdOpen(a)
  const k = r.dy ? Math.SQRT1_2 : 1, dx = r.dir * r.sp * k, dy = r.dy * r.sp * k
  const wall = slide(f, dx, dy, W)
  if (!flying(f) && !grounded(f) && !r.dy) f.y = m.y0
  const fl = floorOf(f, W); if (feet(f) > fl) f.y = fl - f.h
  r.left -= r.sp
  if (!r.over) {
    const B = front(f, BLITZ.w, BLITZ.h, 12)
    for (const o of K.foesOf(f, W)) {
      if (!boxHit(o, B.x - (r.dir > 0 ? r.sp : 0), B.y, B.w + r.sp, B.h) || (o.invulnTimer || 0) > 0 || o._banished || o._gs?.blink?.inv) continue   // intangible: he passes through
      const res = K.strike(f, o, { raw: BLITZ.raw, hitstun: BLITZ.hitstun, blockstun: BLITZ.blockstun, kbx: BLITZ.kbx, kby: BLITZ.kby, chip: BLITZ.chip, dir: r.dir, wall: true, move: 'omv_blitz', type: 'blunt', hitstop: BLITZ.hitstop, fx: 'impactBig' }, W)
      if (res === 'hit') s.stats.blitzHits++
      s.rush = null; m.done = true; recover(a, res === 'block' ? BLITZ.recoveryHit + 8 : BLITZ.recoveryHit); return
    }
  }
  if (wall && r.sp >= TOP * 0.7) { s.rush = null; m.done = true; s.stats.blitzCrash++; K.startCrash(f, s, W, wall); return }
  if (wall) { s.rush = null; m.done = true; recover(a, BLITZ.recoveryWhiff); return }
  if (!r.over && r.left <= 0) { r.over = true; K.cue(f, 'overshoot') }
  if (r.over) { r.sp *= BLITZ.overshootDrag; if (r.sp < 2) { s.rush = null; m.done = true; recover(a, BLITZ.recoveryWhiff) } }
}

// SKY HOOK: a rising hook that launches (80) and carries him straight into flight
function hookTick(f, s, W, a, m, t, K) {
  if (t < SKYHOOK.startup) { holdOpen(a); f.vx = 0; return }
  if (!m.rise) { m.rise = 1; s.rush = { kind: 'hook', t: 0 }; K.cue(f, 'skyHook') }
  const r = s.rush; if (!r) return
  holdOpen(a)
  r.t++
  slide(f, (f.facing || 1) * 3, SKYHOOK.vy * (1 - r.t / (SKYHOOK.rise + 4)), W)
  if (!m.hit) {
    const B = front(f, SKYHOOK.w, SKYHOOK.h, SKYHOOK.boxY)
    for (const o of K.foesOf(f, W)) {
      if (!boxHit(o, B.x, B.y, B.w, B.h)) continue
      const res = K.strike(f, o, { raw: SKYHOOK.raw, hitstun: SKYHOOK.hitstun, blockstun: 16, kbx: 3, kby: SKYHOOK.launchVy, chip: SKYHOOK.chip, dir: f.facing || 1, move: 'omv_sky_hook', type: 'blunt', hitstop: 6, fx: 'impactBig' }, W)
      m.hit = res; if (res === 'hit') s.stats.skyHookHits++
      break
    }
  }
  if (r.t >= SKYHOOK.rise) {
    s.rush = null
    if (flightTakeoff(f)) { const c = ensureFlightState(f); c.phase = FLIGHT_PHASE.FLYING; s.stats.takeoffs++; K.cue(f, 'takeoff') }   // auto-flight
    f.vy = -2; recover(a, SKYHOOK.recovery)
  }
}

// METEOR DROP (air): brief hang, then straight down (or 45° forward with → held) at top speed; the floor makes a 70
// OTG shockwave; nothing hit = 30-frame recovery
function meteorTick(f, s, W, a, m, t, K) {
  if (t < METEOR.startup) { holdOpen(a); f.vx = 0; f.vy = 0; return }
  if (!s.rush && !m.done) { s.rush = { kind: 'meteor', t: 0, ang: m.diag ? METEOR.angle45 : METEOR.angleDown }; K.cue(f, 'meteor') }
  const r = s.rush; if (!r) return
  holdOpen(a); r.t++
  const fl = floorOf(f, W)
  slide(f, Math.cos(r.ang) * TOP * (f.facing || 1), Math.sin(r.ang) * TOP, W)
  if (!m.body) for (const o of K.foesOf(f, W)) {
    if (!boxHit(o, f.x - 10, f.y, f.w + 20, f.h + 10)) continue
    m.body = K.strike(f, o, { raw: METEOR.raw * 0.5, hitstun: 18, kbx: 2, kby: 10, chip: METEOR.chip, dir: f.facing || 1, move: 'omv_meteor_body', type: 'blunt', hitstop: 4 }, W)
    break
  }
  if (feet(f) >= fl || r.t >= METEOR.maxFrames) {
    f.y = Math.min(f.y, fl - f.h); f.onGround = true; f.grounded = true; land(f, W)
    s.rush = null; m.done = true
    let any = m.body === 'hit'
    for (const o of K.foesOf(f, W)) {
      if (Math.abs(ctrX(o) - ctrX(f)) > METEOR.r || fl - feet(o) > 90) continue
      if (K.strike(f, o, { raw: METEOR.raw, hitstun: METEOR.hitstun, blockstun: 16, kbx: METEOR.kbx, kby: METEOR.kby, chip: METEOR.chip, dir: ctrX(o) >= ctrX(f) ? 1 : -1, otg: true, low: true, move: 'omv_meteor_drop', type: 'blunt', hitstop: 8, fx: 'landHit' }, W) === 'hit') { any = true; s.stats.meteorHits++ }
    }
    f._spriteCastMove = 'omvMeteorLand'; f._spriteCastTimer = any ? METEOR.recoveryHit : METEOR.recoveryWhiff
    K.pushFx(s, 'landBurst', ctrX(f), fl); K.cue(f, 'hardLand')
    recover(a, any ? METEOR.recoveryHit : METEOR.recoveryWhiff)
  }
}

// FACE IN THE DIRT: grab in front; drag 40 % of the screen along the ground; throw into the wall ahead (110, wall bounce)
function dirtTick(f, s, W, a, m, t, K) {
  if (!s.hold && !m.done) {
    if (t < DIRT.startup) { holdOpen(a); return }
    if (t < DIRT.startup + DIRT.active) {
      holdOpen(a)
      const B = front(f, DIRT.reach, DIRT.h, 10)
      for (const o of K.foesOf(f, W)) {
        if (!boxHit(o, B.x, B.y, B.w, B.h) || !grabbable(o)) continue
        if (K.grabStopped(o, f)) { s.stats.dirtStopped++; s.stats.stopped++; K.cue(f, 'stopped'); m.done = true; recover(a, DIRT.whiff); return }
        hold(f, s, o, f.w / 2 + o.w / 2 + 6, 'dirt'); m.left = DIRT.dragDist * SCREEN; K.cue(f, 'grab'); s.stats.dirtHits++
        f._spriteCastMove = 'omvThrow'; f._spriteCastTimer = 4
        return
      }
      return
    }
    m.done = true; recover(a, DIRT.whiff); return
  }
  if (!s.hold) return
  holdOpen(a)
  const dir = f.facing || 1, step = Math.min(DIRT.dragSpeed, m.left)
  const wall = slide(f, dir * step, 0, W); m.left -= step
  pinHeld(f, s, W, 0)
  const tg = s.hold.ref, atWall = wall || tg.x <= 0 || tg.x >= sw(W) - tg.w || (m.tpx != null && Math.abs(tg.x - m.tpx) < 3)
  m.tpx = tg.x
  K.pushFx(s, 'dust', ctrX(tg), feet(tg))
  f._spriteCastMove = 'omvThrow'; f._spriteCastTimer = 3
  if (m.left <= 0 || atWall) {
    const o = release(s); m.done = true
    K.strike(f, o, { raw: DIRT.raw, hitstun: DIRT.hitstun, kbx: DIRT.throwVx, kby: DIRT.throwVy, unblockable: true, dir, wall: true, move: 'omv_face_in_the_dirt', type: 'blunt', hitstop: 8, fx: 'impactBig' }, W)
    K.cue(f, 'throw'); recover(a, 16)
  }
}

// UNIMPRESSED (defender gates, via omnimanViltrumState): inside the 24-frame window a melee strike or projectile on him is
// simply not felt — he backhands the attacker (80, wall bounce) if they are within reach
export function unimpressedCatch(f, s, attacker, W, K) {
  if (!s.counter || s.counter.done || s.tick < s.counter.from || s.tick > s.counter.until) return false
  s.counter.done = true; s.stats.counters++
  K.cue(f, 'unimpressed'); K.pushFx(s, 'glint', ctrX(f), f.y + 18)
  if (f.attacking && f.currentAttack?.omv) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f._spriteCastMove = 'kBack'; f._spriteCastTimer = UNIMPRESSED.backhand
  // the backhand lands on HIS next sim tick (never inside the engine's hit resolution, which still holds the attacker's move)
  if (attacker && attacker.health > 0) s.backhand = { side: attacker.side, at: s.tick + 1 }
  f.attackCooldown = UNIMPRESSED.backhand
  return true
}
function backhandTick(f, s, W, K) {
  const b = s.backhand; if (!b || s.tick < b.at) return
  s.backhand = null
  const t = (W?.fighters?.() || []).find(o => o && o.side === b.side && o !== f)
  if (!t || !(t.health > 0) || Math.abs(ctrX(t) - ctrX(f)) > 170 || Math.abs(ctrY(t) - ctrY(f)) > 120) return
  f.facing = ctrX(t) >= ctrX(f) ? 1 : -1
  K.strike(f, t, { raw: UNIMPRESSED.raw, hitstun: UNIMPRESSED.hitstun, kbx: UNIMPRESSED.kbx, kby: UNIMPRESSED.kby, unblockable: true, dir: f.facing, wall: true, move: 'omv_unimpressed', type: 'blunt', hitstop: 10, fx: 'impactBig' }, W)
}

// THINK!: blitz-grab (≤ 60 % screen at top speed; whiff = overshoot); drag across the stage at top speed (4 × 20);
// slam into the far wall (220) — 300 total, never combo-scaled; bubble "THINK!" ("Think, Mark! THINK!" vs Invincible)
function thinkTick(f, s, W, a, m, t, K) {
  if (t < THINK.startup && !m.go) { holdOpen(a); f.vx = 0; f.vy = 0; if (!flying(f) && !grounded(f)) f.y = m.y0; return }
  if (!m.go) { m.go = 1; s.rush = { kind: 'think', left: THINK.rushMax * SCREEN, sp: TOP, over: false }; K.cue(f, 'blitz') }
  holdOpen(a)
  const dir = f.facing || 1
  if (s.rush) {
    const r = s.rush, wall = slide(f, dir * r.sp, 0, W); r.left -= r.sp
    if (!flying(f) && !grounded(f)) f.y = m.y0
    if (!r.over) {
      const B = front(f, THINK.w, THINK.h, 10)
      for (const o of K.foesOf(f, W)) {
        if (!boxHit(o, B.x - (dir > 0 ? r.sp : 0), B.y, B.w + r.sp, B.h) || !grabbable(o)) continue
        if (K.grabStopped(o, f)) { s.stats.thinkStopped++; s.stats.stopped++; K.cue(f, 'stopped'); r.over = true; break }
        s.rush = null; hold(f, s, o, f.w / 2 + o.w / 2 + 4, 'think'); m.ticks = 0; m.dt = 0; s.stats.thinkHits++
        const mark = THINK.markKeys.includes((o.rosterKey || '').toLowerCase())
        s.say = { text: mark ? THINK.bubbleMark : THINK.bubble, t: 110, big: true }
        K.cue(f, 'think', { mark }); return
      }
    }
    if (s.rush && (wall || r.left <= 0)) r.over = true
    if (s.rush?.over) { r.sp *= BLITZ.overshootDrag; if (r.sp < 2 || wall) { s.rush = null; m.done = true; recover(a, THINK.whiffRecovery) } }
    return
  }
  if (!s.hold) return
  m.dt++
  const wall = slide(f, dir * TOP, 0, W)
  pinHeld(f, s, W, 0)
  const tg = s.hold.ref
  f._spriteCastMove = 'omvThrow'; f._spriteCastTimer = 3
  const tickRaw = { raw: THINK.dragRaw, hitstun: 30, unblockable: true, noScale: true, noMeter: true, dir, move: 'omv_think_drag', type: 'blunt', hitstop: 0, fx: 'hit', cine: true }
  if (m.ticks < THINK.dragTicks && m.dt % 6 === 0) { m.ticks++; K.strike(f, tg, tickRaw, W); pinHeld(f, s, W, 0) }
  const atWall = wall || tg.x <= 0 || tg.x >= sw(W) - tg.w || (m.tpx != null && Math.abs(tg.x - m.tpx) < 3) || m.dt > 90
  m.tpx = tg.x
  if (atWall) {
    while (m.ticks < THINK.dragTicks) { m.ticks++; K.strike(f, tg, tickRaw, W) }
    const o = release(s); m.done = true
    K.strike(f, o, { raw: THINK.slamRaw, hitstun: THINK.slamHitstun, kbx: -dir * 2, kby: -3, unblockable: true, noScale: true, noMeter: true, dir, cine: true, move: 'omv_think_slam', type: 'blunt', hitstop: 14, fx: 'impactBig' }, W)
    o._wallSplat = 24; o.wallBounce = true; o._wallBounceShake = true
    K.pushFx(s, 'wallSplat', dir > 0 ? sw(W) : 0, ctrY(o)); K.cue(f, 'slam'); s.stats.wallSplats++
    recover(a, 20)
  }
}

// ── ESCAPE VELOCITY — GRAB (0.25 s; whiff = overshoot + 40 f) → ASCENT (1.6 s, 10 × 8) → ORBIT (1.4 s: the hum, the line)
//    → RETURN (1.2 s, re-entry) → IMPACT (0.6 s, 340 → 420 total, crater, hard knockdown). Every phase is sim state
//    (s.ev); the sky / stars / planet / re-entry glow / crater are drawn from it (render-only).
function evStart(f, s, W, a, m, t, K) {
  if (!s.ev) { s.ev = { ph: 'grab', t: 0, y0: f.y, floor: floorOf(f, W), ticks: 0, x0: f.x, dir: f.facing || 1, sp: ESCAPE.rush }; K.cue(f, 'evGrab') }
}
const EV_LEN = { ascent: ESCAPE.ascent, orbit: ESCAPE.orbit, ret: ESCAPE.ret, impact: ESCAPE.impact, settle: ESCAPE.settle }
const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
function evTick(f, s, W, a, K) {
  const ev = s.ev
  // IMPACT / settle run on s.ev alone (landing may let the engine close the move; s.ev still locks him); before the impact
  // a lost move (interrupted) ends the ultimate
  const post = ev.ph === 'impact' || ev.ph === 'settle'
  if (!post && (!a || !a.omv || a.omv.key !== 'kEscape')) { if (s.hold) release(s); s.ev = null; return }
  if (a?.omv?.key === 'kEscape') holdOpen(a); ev.t++
  const next = ph => { ev.ph = ph; ev.t = 0; K.cue(f, 'ev_' + ph) }
  if (ev.ph === 'grab') {
    const wall = slide(f, ev.dir * ev.sp, 0, W)
    if (!flying(f) && !grounded(f)) f.y = ev.y0
    const B = front(f, ESCAPE.w, ESCAPE.h, -8)
    for (const o of K.foesOf(f, W)) {
      if (!boxHit(o, B.x - (ev.dir > 0 ? ev.sp : 0), B.y, B.w + ev.sp, B.h) || !grabbable(o)) continue
      if (K.grabStopped(o, f)) { s.stats.escapeStopped++; s.stats.stopped++; K.cue(f, 'stopped'); ev.ph = 'whiff'; ev.t = 0; s.stats.escapeWhiff++; return }   // Infinity: never touched → the grab whiffs (checked once)
      hold(f, s, o, f.w / 2 + o.w / 2, 'ev'); s.stats.escapeHits++
      ev.floor = floorOf(f, W); ev.y0 = f.y
      land(f, W); next('ascent'); return
    }
    if (ev.t >= ESCAPE.grab || wall) { ev.ph = 'whiff'; ev.t = 0; s.stats.escapeWhiff++; K.cue(f, 'overshoot') }
    return
  }
  if (ev.ph === 'whiff') {
    ev.sp *= BLITZ.overshootDrag
    if (ev.sp > 2) { slide(f, ev.dir * ev.sp, 0, W); if (!flying(f) && !grounded(f)) f.y = ev.y0; return }
    s.ev = null; recover(a, ESCAPE.whiffRecovery); return
  }
  if (post) { if (ev.ph === 'impact') { f._spriteCastMove = 'omvLandHard'; f._spriteCastTimer = 3; if (ev.t >= ESCAPE.impact) next('settle') } else if (ev.t >= ESCAPE.settle) { s.ev = null; if (a?.omv?.key === 'kEscape') recover(a, 1) } return }
  const tg = s.hold?.ref
  if (!tg) { s.ev = null; recover(a, 20); return }
  const top = ev.floor - f.h - ESCAPE.rise   // he is untouchable through the gates (omvMeleeGate / omvProjectileGate / omvDamageGate), not invulnTimer (which flickers him white)
  const hit = (raw, extra = {}) => K.strike(f, tg, { raw, hitstun: 40, unblockable: true, noScale: true, noMeter: true, cine: true, domainOk: true, otg: true, dir: ev.dir, move: 'omv_escape_velocity', type: 'blunt', hitstop: 0, fx: 'hit', ...extra }, W)
  if (ev.ph === 'ascent') {
    // LAUNCH: straight up and off the top of the screen (stage still on) → CLIMB: the sky shot, up into frame from below
    if (ev.t < ESCAPE.launch) { const k = Math.pow(ev.t / ESCAPE.launch, 2); f.y = ev.y0 + (ev.floor - f.h - ESCAPE.offTop - ev.y0) * k }
    else { const k = 1 - Math.pow(1 - Math.min(1, (ev.t - ESCAPE.launch) / (ESCAPE.ascent - ESCAPE.launch)), 2); f.y = ev.floor + ESCAPE.offBottom + (top - ev.floor - ESCAPE.offBottom) * k }
    f.vx = 0; f.vy = 0; f.onGround = false; f.grounded = false
    pinHeld(f, s, W, -20)
    const at = Math.floor(ev.t * ESCAPE.ticks / ESCAPE.ascent)
    while (ev.ticks < Math.min(ESCAPE.ticks, at)) { ev.ticks++; hit(ESCAPE.tickRaw); pinHeld(f, s, W, -20) }
    f._spriteCastMove = 'omvAscent'; f._spriteCastTimer = 3
    if (ev.t >= ESCAPE.ascent) { while (ev.ticks < ESCAPE.ticks) { ev.ticks++; hit(ESCAPE.tickRaw) } next('orbit'); s.say = { text: ESCAPE.line, t: ESCAPE.orbit, big: false } }
    return
  }
  if (ev.ph === 'orbit') {
    f.y = top; f.vx = 0; f.vy = 0; pinHeld(f, s, W, -20)
    f._spriteCastMove = 'omvOrbit'; f._spriteCastTimer = 3
    if (ev.t >= ESCAPE.orbit) next('ret')
    return
  }
  if (ev.ph === 'ret') {
    // FALL: out the bottom of the sky shot → SLAM: the stage is back, he drops in from above the screen into the floor
    if (ev.t < ESCAPE.fall) { const k = Math.pow(ev.t / ESCAPE.fall, 1.8); f.y = top + (ev.floor + ESCAPE.offBottom - top) * k }
    else { const k = Math.pow(Math.min(1, (ev.t - ESCAPE.fall) / (ESCAPE.ret - ESCAPE.fall)), 2.2); f.y = ev.floor - f.h - ESCAPE.offTop + ESCAPE.offTop * k }
    f.vx = 0; f.vy = 0; pinHeld(f, s, W, 20)
    f._spriteCastMove = 'omvReturn'; f._spriteCastTimer = 3
    if (ev.t >= ESCAPE.ret) {
      f.y = ev.floor - f.h; f.onGround = true; f.grounded = true
      const o = release(s)
      o.y = ev.floor - o.h
      hit(ESCAPE.impactRaw, { hitstun: 70, kbx: ev.dir * 2, kby: 0, hitstop: 12, fx: 'impactBig' })
      o.vx = 0; o.vy = 0
      if (o.health > 0) { o.knockdownState = true; o.knockdownTimer = 60; o.invulnTimer = Math.max(o.invulnTimer || 0, 60) }   // hard knockdown (no OTG loop)
      s.crater = { x: Math.round(ctrX(o)), y: Math.round(ev.floor), t: 0 }
      s.stats.escapeDone++; K.cue(f, 'crater'); K.pushFx(s, 'landBurst', ctrX(o), ev.floor); K.pushFx(s, 'boom', ctrX(o), ev.floor - 40)
      next('impact')
    }
    return
  }
  if (ev.ph === 'impact') { f._spriteCastMove = 'omvLandHard'; f._spriteCastTimer = 3; if (ev.t >= ESCAPE.impact) next('settle'); return }
  if (ev.ph === 'settle') { if (ev.t >= ESCAPE.settle) { s.ev = null; if (a?.omv?.key === 'kEscape') recover(a, 1) } }
}
export const EV_PHASES = EV_LEN
