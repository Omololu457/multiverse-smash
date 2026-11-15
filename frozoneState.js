// FROZONE (frozone) — SIMULATION state. Plain JSON on f._frozone (snapshotted for replay / LAN), sim ticks only:
// no RNG, no wall clock, no renderer decisions. Every export is a no-op for any other rosterKey.
//
// ICE SYSTEM (docs/frozone/ICE_SYSTEM.md): Chill pips (per opponent side) → Freeze (24 ticks, once per combo) → Shatter
// (Heavy / Icebreaker, fixed +25 raw, once). Freeze ends on expiry, Shatter, ANY other damage, or an escape (hitstun
// cleared by a shared escape rule); every end grants refreeze immunity. The frozen target is held in place with its
// hitstun topped up to the REMAINING shell time — never beyond it, so nobody stays immobilised after the shell is gone.
// BLACK ICE: ≤ 1 patch per owner; consumed ATOMICALLY (s.patch = null at the moment of use) by the first of: an opponent's
// eligible contact (one small hit + one Chill), the owner's skate (SKATE SWITCH: one speed burst), or a crossing Ice
// Lance (FROST LANCE: broader, +15 raw, still one Chill, never recursive). Expiry melts it.
// ICE SKATE: the SHARED dash / air-dash (physics.js) with Frozone's per-frame speed profile set in frozoneLocked (called
// right before physics.moveFighter); brake = opposite direction or Guard. Decorative ribbon only — never collision.
// Hit volumes (Lance, Black Ice) are ENGINE projectiles (W.spawn, tagged _fz) so guard, chip, combo scaling and the shared
// projectile rules apply; each volume connects once. Ultimate damage = W.damage per scheduled contact with the combo scale
// captured at the capture. Nothing grants invulnerability or refunds jumps.
import { FROZONE_MOVES, CHILL, FREEZE, SHATTER, LANCE, BLACK_ICE, SKATE, ULT, dmg } from './frozoneData.js'

export const FROZONE_KEY = 'frozone'
export const isFrozone = f => f?.rosterKey === FROZONE_KEY
export const fzState = f => f._frozone ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0, nEnt: 0,
  floor: null, upAge: 0, riseUsed: false, patch: null, chill: {}, freeze: null, immune: {}, frozeCombo: {}, chilled: [],
  skateK: -1, boost: 0, bright: 0, brakeT: 0, prevAirDash: false, trail: [], fx: [],
  stats: { lance: 0, frost: 0, rush: 0, rise: 0, blackIce: 0, breaker: 0, chill: 0, freezes: 0, shatters: 0, thaw: {}, patchHits: 0,
    skateSwitch: 0, patchMelt: 0, skates: 0, airSkates: 0, brakes: 0, dj: 0, clean: 0, blocked: 0, rejects: 0, spawns: 0,
    ultStarts: 0, ultWhiffs: 0, ultDone: 0, immuneSkips: 0 },
  cues: [] }

const E = { startMove: null, comboScale: null }
const WREF = { W: null }
export function registerFrozoneEngine(o) { Object.assign(E, o) }
const cue = (f, c) => fzState(f).cues.push(c)
const ultTargets = new WeakMap()
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.fz) ? f.currentAttack : null
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
export const sideOf = o => o?.side || o?.playerNumber || 0
const bySide = (W, side) => (W?.fighters?.() || []).find(o => o && sideOf(o) === side) || null
const floorOf = (f, s) => s.floor ?? (f.groundY ?? ((f.y || 0) + (f.h || 94)))
export function pushFx(s, kind, x, y, dir = 1, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), dir, t: 0, ...(extra || {}) }); if (s.fx.length > 16) s.fx.shift() }
function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }
function killProj(f, W, pred = null) {
  const P = W?.projectiles; if (!P) return
  for (let i = P.length - 1; i >= 0; i--) if (P[i]?.owner === f && P[i]._fz && (!pred || pred(P[i]._fz))) P.splice(i, 1)
}

// Every reset path: KO teardown, round reset, rematch, scene exit, identity replacement. Also releases a frozen
// opponent (no shell can outlive its owner's state).
export function clearFrozone(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearFrozoneUlt()
  const s = f._frozone
  if (s?.freeze) { const t = bySide(W || WREF.W, s.freeze.side); if (t && (t.hitstun || 0) > 0 && (t.hitstun || 0) <= FREEZE.dur) t.hitstun = 0 }
  if (live(f)) endAttack(f)
  killProj(f, W || WREF.W)
  delete f._frozone; delete f._frozoneRemoteInput
  if (f._fzHomeX != null) { f.x = f._fzHomeX; delete f._fzHomeX }
}

// ── Movement hook (game.js updateMovementInput, evaluated once per movement frame right BEFORE physics.moveFighter) ──
// Sets the ICE SKATE speed for this frame's shared dash, applies the brake, and locks steering during committed moves.
export function frozoneLocked(f, raw = null) {
  if (!isFrozone(f)) return false
  if (isFrozoneUltActive()) return true
  const s = fzState(f), g = grounded(f), r = raw || {}
  if (g) {
    const starting = !!f._dashTap && !(f.dashTimer > 0) && (f.dashCooldown || 0) <= 0 && !f.attacking && !(f.hitstun > 0) && !(f.blockstun > 0)
    if (starting) { s.skateK = 0; s.stats.skates++; cue(f, 'skate') }
    else if (f.dashTimer > 0 && s.skateK >= 0) s.skateK++
    else s.skateK = -1
    if (s.skateK >= 0) {
      const sp = s.boost > 0 ? SKATE.boostSpeed : SKATE.profile[Math.min(s.skateK, SKATE.profile.length - 1)]
      f.dashSpeed = sp / 0.55
      const d = f.facing || 1, against = d === 1 ? r.left : r.right
      if (f.dashTimer > 0 && s.skateK >= SKATE.brakeFrom && (r.block || against)) {   // BRAKE: stops the skate this frame
        f.dashTimer = 0; f.vx = d * SKATE.brakeVx; s.boost = 0; s.skateK = -1; s.brakeT = 10; s.stats.brakes++
        cue(f, 'brake'); pushFx(s, 'spray', ctrX(f) + d * 20, (f.y || 0) + (f.h || 94), d)
      }
    }
  } else {
    f.dashSpeed = SKATE.air / 0.8   // shared air-dash speed = dashSpeed × 0.8 → one level burst of SKATE.air px / f
    s.skateK = -1
  }
  const a = f.attacking ? f.currentAttack : null
  if (a && a.fz && !FROZONE_MOVES[a.fz.key]?.air && !(a.launcher && a.hasHit)) { f._dashTap = false; return true }
  if (r.special && r.up && g) return true   // Up + R1 = Rising Glacier, never a jump
  return !!(r.up && !f.attacking && g && (s.upAge || 0) < 3 && !(f.hitstun > 0))   // 3-frame Up grace (Up + R1 read on the next tick)
}

function reject(f, why) { const s = fzState(f); s.stats.rejects++; s.lastReject = why || 'reject'; cue(f, 'reject') }

// Start one of Frozone's moves through combat.startMove (frameExact path) and attach the descriptor `fz`.
// Every legality / slot / resource check happens BEFORE anything is spent.
export function startFzMove(f, key, W, { cancel = false } = {}) {
  if (!isFrozone(f)) return false
  const s = fzState(f), md = FROZONE_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  const airOk = ['air', 'fDownAir', 'fLance', 'fRise']
  if (md.air && g) return false
  if (!md.air && !g && !airOk.includes(key)) { reject(f, 'air'); return false }
  if (key === 'fRise' && s.riseUsed) { reject(f, 'rise'); return false }
  if (key === 'fBlackIce' && s.patch) { reject(f, 'patch'); return false }
  const cost = md.cost || 0
  if ((f.energy || 0) < cost) { reject(f, 'energy'); return false }
  if (cancel) endAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  const a = f.currentAttack
  a.fz = { key, dir: f.facing || 1, clean: false, blocked: false, serial: ++s.serial, released: false, travelled: 0, stopped: false }
  a.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; f.dashTimer = 0; s.skateK = -1; s.boost = 0
  if (g && !md.air) f.vx = 0
  if (key === 'fLaunch') f.jumpHeld = true
  if (key === 'fRise') { s.riseUsed = true; s.stats.rise++ }
  if (key === 'fRush') s.stats.rush++
  if (key === 'fBreaker') s.stats.breaker++
  if (key === 'ultOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  else cue(f, md.isSpecial ? 'cast' : 'swing')
  return true
}

// ── combat.js hooks (frozone-gated) ──
export function frozoneHitbox(f) {
  const a = f.currentAttack, m = a?.fz, md = FROZONE_MOVES[m?.key]
  if (!m || !md || md.noBody || !md.box) return { x: 0, y: 0, w: 0, h: 0 }
  const d = m.dir, front = d === 1 ? f.x + f.w : f.x, feet = f.y + f.h
  const [b0, b1, top, h] = md.box
  return { x: d === 1 ? front + b0 : front - b1, y: feet - top, w: b1 - b0, h }
}
export function frozoneBlock(f, d, a) {
  if (!isFrozone(f) || !a?.fz) return
  d.blockstun = FROZONE_MOVES[a.fz.key].blockstun; a.fz.blocked = true; fzState(f).stats.blocked++
}
export function frozoneHit(f, d, a, { armored = false } = {}) {
  if (!isFrozone(f) || !a?.fz) return
  const s = fzState(f), key = a.fz.key, md = FROZONE_MOVES[key]
  if (armored || d.isBlocking) return
  a.fz.clean = true; s.stats.clean++
  if (key === 'ultOpen') { if (s.freeze && s.freeze.side === sideOf(d)) thaw(f, s, 'hit'); if (d.health > 0) { a.fz.ultHit = true; ultTargets.set(f, d) }; return }
  if (s.freeze && s.freeze.side === sideOf(d)) {
    if (md.shatter) shatter(f, s, d)
    else thaw(f, s, 'hit')
  }
  if (md.chill) addChill(f, s, d, a.fz.serial)
  pushFx(s, md.shatter ? 'crack' : 'chip', ctrX(d), ctrY(d) - 10, a.fz.dir)
}
export function frozoneProjectileHit(proj, target, { armored = false } = {}) {
  const k = proj?._fz; if (!k || !isFrozone(proj.owner)) return
  const f = proj.owner, s = fzState(f), blocked = !!target?.isBlocking || armored
  if (blocked) { s.stats.blocked++; pushFx(s, 'chip', proj.x, proj.y, k.dir || 1); return }
  if (k.kind === 'blackIce') s.stats.patchHits++
  if (s.freeze && s.freeze.side === sideOf(target)) thaw(f, s, 'hit')
  addChill(f, s, target, k.serial)
  pushFx(s, k.frost ? 'frostHit' : 'chip', proj.x, proj.y, k.dir || 1)
}

// ── ICE SYSTEM ──
function addChill(f, s, d, serial) {
  const side = sideOf(d)
  if (!side || !(d.health > 0)) return
  if (s.chilled.includes(serial)) return                        // one pip per cast, whatever touched
  s.chilled.push(serial); if (s.chilled.length > 8) s.chilled.shift()
  if ((s.immune[side] || 0) > s.clock || s.freeze) { s.stats.immuneSkips++; return }
  const c = s.chill[side] ||= { n: 0, exp: 0 }
  c.n = Math.min(CHILL.max, c.n + 1); c.exp = s.clock + CHILL.expire; s.stats.chill++
  cue(f, 'chill')
  if (c.n >= CHILL.max) {
    if (s.frozeCombo[side]) { c.n = CHILL.max - 1; return }   // never a second freeze inside one combo
    freeze(f, s, d)
  }
}
function freeze(f, s, d) {
  const side = sideOf(d)
  delete s.chill[side]
  s.freeze = { side, t0: s.clock, until: s.clock + FREEZE.dur, x: Math.round(d.x * 10) / 10, hp: d.health, air: !grounded(d), sync: true }
  s.frozeCombo[side] = true; s.stats.freezes++
  d.hitstun = Math.max(d.hitstun || 0, FREEZE.dur); d.vx = 0; d.vy = Math.max(0, d.vy || 0); d.isBlocking = false
  cue(f, 'freeze'); pushFx(s, 'freezeOn', ctrX(d), ctrY(d), f.facing || 1)
}
function endFreeze(f, s, why) {
  const z = s.freeze; if (!z) return null
  s.freeze = null
  s.immune[z.side] = s.clock + FREEZE.immunity
  s.stats.thaw[why] = (s.stats.thaw[why] || 0) + 1
  return z
}
function thaw(f, s, why) {
  const z = endFreeze(f, s, why); if (!z) return
  const t = bySide(WREF.W, z.side)
  if (t) pushFx(s, 'thaw', ctrX(t), ctrY(t), f.facing || 1)
  cue(f, 'thaw')
}
function shatter(f, s, d) {
  const z = endFreeze(f, s, 'shatter'); if (!z) return
  s.stats.shatters++
  const scale = E.comboScale?.(f) ?? 1
  WREF.W?.damage?.(d, dmg(SHATTER.raw) * scale, { source: 'shatter', attacker: f, move: 'shatter' })
  cue(f, 'shatter'); pushFx(s, 'shatter', ctrX(d), ctrY(d), f.facing || 1)
}
function updateIce(f, s, W, opp) {
  for (const side of Object.keys(s.chill)) if (s.clock >= s.chill[side].exp) delete s.chill[side]
  for (const side of Object.keys(s.immune)) if (s.clock >= s.immune[side]) delete s.immune[side]
  for (const side of Object.keys(s.frozeCombo)) {
    const t = bySide(W, side) || (String(sideOf(opp)) === side ? opp : null)   // object keys are strings: compare as strings
    if (!t || (!(t.hitstun > 0) && !t.knockdownState && !(s.freeze && String(s.freeze.side) === side))) delete s.frozeCombo[side]
  }
  const z = s.freeze; if (!z) return
  const t = bySide(W, z.side) || (sideOf(opp) === z.side ? opp : null)
  if (!t || !(t.health > 0)) { endFreeze(f, s, 'ko'); return }
  if (z.sync) { z.sync = false; z.hp = t.health }                           // the freezing hit's own damage lands after the hook
  if (t.health < z.hp) { thaw(f, s, 'damage'); return }                     // ONE RULE: any other damage thaws
  if (s.clock > z.t0 && !(t.hitstun > 0)) { thaw(f, s, 'escape'); return }   // a shared escape cleared the hitstun
  if (t.isGrabbed) { thaw(f, s, 'grab'); return }
  if (s.clock >= z.until) { thaw(f, s, 'expire'); return }
  const rem = z.until - s.clock
  t.hitstun = Math.max(t.hitstun || 0, rem); t.vx = 0; t.x = z.x; t.isBlocking = false
  if (grounded(t)) t.vy = 0
  z.hp = t.health
}

// ── hit volumes (engine projectiles) ──
function vol(f, s, W, kind, serial, cx, cy, w, h, P) {
  const pr = W?.spawn?.(f, 'frozone_' + kind, { damage: dmg(P.raw), speed: 1, vx: P.vx ?? (P.dir || 1) * 0.01, vy: 0, spawnX: cx, spawnY: cy, w, h,
    radius: P.radius ?? Math.min(w, h) / 2, lifetime: P.life, hitstun: P.hitstun, knockbackX: P.kbx, knockbackY: P.kby, piercesMulti: false,
    sheet: './assets/frozone/fx/blank.png', spriteFrames: 1, spriteW: 1, spriteH: 1, isSpecial: true, color: '#9fe8ff' })
  if (!pr) return null
  pr.noTrail = true; pr.damageType = 'ice'; if (P.low) pr.hitLevel = 'low'
  pr._fz = { kind, serial, n: ++s.nEnt, dir: P.dir || 1, frost: false }
  s.stats.spawns++
  return pr
}
function releaseLance(f, s, W, m) {
  const d = m.dir, front = d === 1 ? f.x + f.w : f.x, feet = f.y + f.h
  const p = vol(f, s, W, 'lance', m.serial, front + d * LANCE.handX, feet - LANCE.handY, LANCE.w, LANCE.h,
    { raw: LANCE.raw, hitstun: LANCE.hitstun, kbx: LANCE.kbx, kby: LANCE.kby, life: LANCE.life, vx: d * LANCE.speed, dir: d, radius: 14 })
  if (p) { s.stats.lance++; cue(f, 'lance') }
}
function releasePatch(f, s, W, m) {
  const d = m.dir, floor = floorOf(f, s), x = Math.max(BLACK_ICE.w / 2 + 8, Math.min(sw(W) - BLACK_ICE.w / 2 - 8, ctrX(f) + d * BLACK_ICE.ahead))
  s.patch = { n: ++s.nEnt, x: Math.round(x), floor: Math.round(floor), w: BLACK_ICE.w, t: 0, dir: d }
  s.stats.blackIce++; cue(f, 'patch'); pushFx(s, 'patchForm', x, floor, d)
}
const overlapPatch = (o, p) => o.x < p.x + p.w / 2 && o.x + o.w > p.x - p.w / 2 && Math.abs((o.y + o.h) - p.floor) < 8
function updatePatch(f, s, W, opp) {
  const p = s.patch; if (!p) return
  p.t++
  // owner SKATE SWITCH (checked first; consumption is atomic → the patch can never be spent twice)
  if (f.dashTimer > 0 && grounded(f) && overlapPatch(f, p)) {
    s.patch = null; s.boost = SKATE.boostFrames; s.bright = 40; f.dashTimer = Math.max(f.dashTimer, SKATE.boostFrames); s.stats.skateSwitch++
    cue(f, 'skateSwitch'); pushFx(s, 'switch', p.x, p.floor, f.facing || 1); return
  }
  // a crossing Ice Lance → FROST LANCE (one conversion, never recursive, no duplicate projectile)
  for (const q of (W?.projectiles || [])) {
    const k = q?.owner === f && q._fz; if (!k || k.kind !== 'lance' || k.frost) continue
    if (q.x >= p.x - p.w / 2 && q.x <= p.x + p.w / 2) {
      s.patch = null; k.frost = true; s.stats.frost++
      q.damage = dmg(LANCE.frost.raw); q.w = q.width = LANCE.frost.w; q.h = q.height = LANCE.frost.h; q.radius = LANCE.frost.h / 2 + 6
      cue(f, 'frost'); pushFx(s, 'switch', p.x, p.floor, k.dir); return
    }
  }
  // an opponent's eligible contact: grounded, standing, not grabbed → ONE small low hit (+ one Chill on a clean hit)
  for (const o of foesOf(f, W, opp)) {
    if (!grounded(o) || o.knockdownState || o.isGrabbed || !overlapPatch(o, p)) continue
    s.patch = null
    vol(f, s, W, 'blackIce', ++s.serial, ctrX(o), o.y + o.h - BLACK_ICE.vh / 2, BLACK_ICE.vw, BLACK_ICE.vh,
      { raw: BLACK_ICE.raw, hitstun: BLACK_ICE.hitstun, kbx: BLACK_ICE.kbx, kby: BLACK_ICE.kby, life: 3, low: true, dir: p.dir, radius: 26 })
    cue(f, 'patchSnap'); pushFx(s, 'patchSnap', ctrX(o), p.floor, p.dir); return
  }
  if (p.t >= BLACK_ICE.life) { s.patch = null; s.stats.patchMelt++; pushFx(s, 'melt', p.x, p.floor, p.dir) }
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickFrozone(f, opp, raw, W) {
  if (!isFrozone(f)) { if (f?._frozone) clearFrozone(f, W); return }
  WREF.W = W
  const s = fzState(f); s.tick++
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'grab']) {
    const v = !!raw[k]
    if (v && !s.prev[k] && k !== 'up') s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    s.prev[k] = v
  }
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if ((raw.up || raw.jump) && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up && !raw.jump) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  else if (!raw.up && !raw.jump && f.jumpHeld && f.hitstop > 0) f.jumpHeld = false   // launcher jump-cancel latch (shared rule, as Syndrome / Megumi)
  const g = grounded(f)
  if (g) s.floor = (f.y || 0) + (f.h || 94)
  else if (s.floor == null) s.floor = f.groundY ?? null
  const jc = f.jumpCount || 0; if (!g && jc >= 2 && (s.prevJc || 0) < 2) { s.stats.dj++; cue(f, 'jump'); pushFx(s, 'puff', ctrX(f), f.y + f.h, f.facing || 1) }
  s.prevJc = g ? 0 : jc
  if (g && !(live(f)?.fz.key === 'fRise')) s.riseUsed = false
  if (f.airDashing && !s.prevAirDash) { s.stats.airSkates++; cue(f, 'skate') }
  s.prevAirDash = !!f.airDashing
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 40) s.fx.splice(i, 1)
  // decorative ice ribbon (render-only data; never a collision volume)
  for (let i = s.trail.length - 1; i >= 0; i--) if (++s.trail[i].t > SKATE.trail * 3) s.trail.splice(i, 1)
  if ((f.dashTimer > 0 && g) || f.airDashing) { s.trail.push({ x: Math.round(ctrX(f)), y: Math.round(f.y + f.h), t: 0, b: s.bright > 0 ? 1 : 0, d: f.facing || 1 }); if (s.trail.length > 30) s.trail.shift() }
  if (s.bright > 0) s.bright--
  if (s.brakeT > 0) s.brakeT--
  if (s.boost > 0 && !(f.dashTimer > 0)) s.boost = 0
  if (f.health <= 0) {                                                   // nothing of his outlives his KO
    if (s.patch || s.freeze) { if (s.freeze) thaw(f, s, 'ownerKo'); s.patch = null }
    killProj(f, W); return
  }
  if (f.hitstop > 0) return
  s.clock++
  if (s.boost > 0) s.boost--
  const a = live(f)
  if (a && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) endAttack(f)   // interruption: an unreleased cast spawns nothing
  updateIce(f, s, W, opp)
  updatePatch(f, s, W, opp)
  const A = live(f), m = A?.fz
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = elapsed(A), md = FROZONE_MOVES[m.key]
  f.facing = m.dir
  if (g && !md.air && !md.travel) f.vx = 0
  if (md.releaseAt != null && t === md.releaseAt && !m.released) { m.released = true; if (m.key === 'fLance') releaseLance(f, s, W, m); else releasePatch(f, s, W, m) }
  if (md.travel && t >= md.travel[0] && t < md.travel[1] && !m.stopped) {   // GLACIER RUSH: physical surf, never through the body
    const clampX = x => Math.max(0, Math.min(sw(W) - f.w, x)), o = opp && opp.health > 0 ? opp : null
    let nx = clampX(f.x + m.dir * md.travel[2])
    if (o) { if (m.dir > 0 && f.x + f.w <= o.x + 1) nx = Math.min(nx, o.x - f.w); if (m.dir < 0 && f.x >= o.x + o.w - 1) nx = Math.max(nx, o.x + o.w) }
    m.travelled += Math.abs(nx - f.x); f.x = nx; f.vx = 0
    if (t % 3 === 0) s.trail.push({ x: Math.round(ctrX(f)), y: Math.round(f.y + f.h), t: 0, b: 0, d: m.dir })
  } else if (md.travel && g) f.vx = 0
  if (m.key === 'fRise' && t === md.liftAt) {
    if (g) f.jumpCount = Math.max(f.jumpCount || 0, 1)   // the rise spends the ground jump — never a refund
    f.vy = md.liftVy; f.onGround = false; f.grounded = false; cue(f, 'rise'); pushFx(s, 'riseBurst', ctrX(f), f.y + f.h, m.dir)
  }
  if (md.air && g && t > 2) { endAttack(f, m.key === 'fDownAir' ? 10 : 4); if (m.key === 'fDownAir') { cue(f, 'land'); pushFx(s, 'landBurst', ctrX(f) + m.dir * 20, f.y + f.h, m.dir) } }
  if (m.key === 'fDownAir' && t >= md.startup && t < md.startup + md.active && !g) f.vy = Math.max(f.vy || 0, 9)   // committed descent while the strike is live
  if (m.key === 'ultOpen') {
    if (m.ultHit && !m.ultStarted && g) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateFrozoneUlt(f, tg, W) }
    if (t === md.startup + md.active + 2 && !m.ultStarted && !m.cued) { m.cued = true; s.stats.ultWhiffs++; cue(f, 'ultMiss') }
  }
}

// ── INTRO: skate in from behind, brake, settle (combat / physics are frozen during INTRO, so x is set directly) ──
export const INTRO = { dist: 260, arrive: 42 }
export function updateFrozoneIntro(f) {
  if (!isFrozone(f) || !f._introPlaying) return
  if (f._fzHomeX == null) f._fzHomeX = f.x
  const k = Math.min(1, (f._introRevealFrame || 0) / INTRO.arrive), e = 1 - (1 - k) * (1 - k)
  f.x = f._fzHomeX - (f.facing || 1) * INTRO.dist * (1 - e)
}
export function finalizeFrozoneIntro(f) { if (isFrozone(f) && f._fzHomeX != null) { f.x = f._fzHomeX; delete f._fzHomeX } }

// ══ ULTIMATE — ABSOLUTE ZERO: CITY ON ICE ═════════════════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (Rangers / Robin / Megumi / Syndrome): game.js freezes combat, physics and input
// while active and calls updateFrozoneUlt() each frame. Frozone's pose = a non-hitting currentAttack; his skate route is
// a deterministic function of the cinematic frame; damage = the scheduled contacts through W.damage. The ramp, shell,
// fragments and ring are presentation (frozoneFx reads the view). Any live freeze / patch / projectile of his is resolved
// at the capture so nothing outside the contract adds damage.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, tx0: 0, cx0: 0, dir: 1, done: 0, scale: 1 }
export const isFrozoneUltActive = () => cine.active
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, fz: null, _ultPose: true }
}
// skate route around the ramp (dir space): θ from π to 4π over frames 60–140 → three crossings of the target
export function ultRoute(fr) {
  const R = ULT.ramp.r
  if (fr < 60) return { dx: -R, lift: 0, face: 1 }
  if (fr < 140) { const th = Math.PI + (fr - 60) / 80 * 3 * Math.PI; return { dx: R * Math.cos(th), lift: Math.round(28 * (1 - Math.cos(2 * (th - Math.PI)))), face: Math.sin(th) <= 0 ? 1 : -1 } }
  if (fr < 170) { const u = (fr - 140) / 30; return { dx: R + 40 * u, lift: 0, face: 1 } }
  return { dx: R + 40, lift: 0, face: -1 }
}
export const ULT_CONTACT_FRAMES = ULT.contacts.map(c => c.at)
export function activateFrozoneUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = fzState(f)
  if (s.freeze) endFreeze(f, s, 'ult')
  killProj(f, W); s.patch = null
  const d = f.facing || 1, R = ULT.ramp.r, tw = target.w || 48
  // the captive stands a fixed distance ahead, clamped so the whole skate route stays inside the stage
  const tc = Math.max(R + 80, Math.min(sw(W) - R - 80, ctrX(f) + d * R))
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: f.y + (f.h || 94) - (target.h || 94),
    tx0: tc - tw / 2, cx0: tc, dir: d, done: 0, scale: E.comboScale?.(f) ?? 1 })
  s.ult = { frame: 0, done: 0 }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  cue(f, 'ultConfirm')
  return true
}
function ultHit(i) {
  const c = ULT.contacts[i], t = cine.target, f = cine.caster
  cine.done = i + 1; if (f._frozone?.ult) f._frozone.ult.done = cine.done
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  cue(f, c.kind === 'shatter' ? 'ultShatter' : 'ultPass')
  const s = f._frozone; if (s) pushFx(s, c.kind === 'shatter' ? 'ultBurst' : 'crack', cine.cx0, cine.floorT + (t.h || 94) / 2, cine.dir)
}
export function updateFrozoneUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, s = f?._frozone
  if (!f || !t || !s) return clearFrozoneUlt()
  const k = cine.frame
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT_CONTACT_FRAMES[i] && cine.done === i) ultHit(i)
  if (!(t.health > 0) && k < ULT.settle && k > ULT_CONTACT_FRAMES[3]) cine.frame = ULT.settle
  const fr = cine.frame
  let beat = ULT.beats[0]; for (const b of ULT.beats) if (fr >= b.from) beat = b
  pose(f, beat.pose, fr - beat.from)
  const r = ultRoute(fr), d = cine.dir, fw = f.w || 48
  f.x = Math.max(0, Math.min(sw(cine.W) - fw, cine.cx0 + d * r.dx - fw / 2)); f.y = cine.floorC - r.lift; f.facing = d * r.face
  t.x = cine.tx0; t.vx = 0; t.vy = 0; t.isBlocking = false; t.y = cine.floorT
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 40) s.fx.splice(i, 1)
  for (let i = s.trail.length - 1; i >= 0; i--) if (++s.trail[i].t > SKATE.trail * 3) s.trail.splice(i, 1)
  if (fr >= 60 && fr < 170) { s.trail.push({ x: Math.round(ctrX(f)), y: Math.round(f.y + f.h), t: 0, b: 1, d: f.facing }); if (s.trail.length > 30) s.trail.shift() }
  if (s.ult) s.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { endAttack(f, 12); f.y = cine.floorC; f.vx = 0; f.vy = 0; f.facing = -cine.dir; const s = f._frozone; if (s) { s.stats.ultDone++; delete s.ult; s.trail.length = 0 } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export function clearFrozoneUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { endAttack(f); f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._frozone) { delete f._frozone.ult; f._frozone.trail.length = 0 } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export const getFrozoneUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
export function frozoneUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  const t = cine.target
  return { frame: cine.frame, cutIn: cine.frame < ULT.cutIn ? cine.frame / ULT.cutIn : null, done: cine.done, dir: cine.dir,
    tx: cine.cx0, feet: cine.floorT + (t?.h || 94), tTop: t ? t.y : 0, tH: t?.h || 94, tW: t?.w || 48 }
}
