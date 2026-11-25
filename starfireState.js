// Starfire (starfire): SIMULATION state.
// - All state is plain JSON on f._starfire, snapshotted for replay / LAN. Sim ticks only: no RNG, no wall clock, no
//   canvas reads. Every export is a no-op for any other rosterKey.
// - Starbolt / Comet Shot / Orbital Star / the Prism Break burst / the ultimate opener are ordinary ENGINE projectiles
//   (W.spawn), so the shared block, combo scaling, juggle, hitstop and reflect rules all apply.
// - STAR SIGHT is the move's own attack contract: combat.js asks starfireHitbox() for the move's box on each hit check;
//   during the active window that box sits on the point where the earlier of her two eye beams enters the nearest foe's
//   hurtbox, so the engine resolves ONE hit (block, hitstun, combo scale) for both beams together.
// - Eye beams start at the VALIDATED eye anchors (starfireEyes.js) of the frame sprite.js draws at that moment, mapped
//   to world through the same transform (scale = spriteScale × 1.18, feet origin (56, 92), facing −1 mirrors around the
//   body centre). Frames with no validated eye never emit.
// - Levitation never edits physics.js (Raven's contract): the tick pre-compensates gravity for the NEXT frame, holds the
//   physics jump, suspends the dash, and never writes the shared jump counter.
import { STARFIRE_MOVES, starfire, LEV, BOLT, ORB, LASER, GSCALE, CELL, RUSH, SKY, ULT, UP_GRACE, GROUND_ONLY, TIMELINE, dmg } from './starfireData.js'
import { STARFIRE_FX } from './starfireSprites.js'
import { STARFIRE_EYES } from './starfireEyes.js'
import { flightAxisStep, flightSoftLimit } from './flight.js'

export const GRAVITY = 0.85   // physics.js `gravity` (asserted equal by harness/starfire.test.mjs)
export const isStarfire = f => f?.rosterKey === 'starfire'
export const starfireState = f => f._starfire ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  wasGround: true, airT: 0, cometUsed: false, laserUsed: false, skyUsed: false, levUsed: false, lev: null, levEndT: 0, noDashPrev: null,
  live: [], nProj: 0, fx: [], djT: 0, prevJc: 0, upAge: 0,
  stats: { bolts: 0, comets: 0, orbs: 0, rushes: 0, skies: 0, lasers: 0, airLasers: 0, laserHits: 0, laserBlocked: 0, prisms: 0, rejects: 0,
    lev: 0, levFail: 0, levEnd: {}, levFrames: 0, levDrained: 0, dj: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0, retired: 0 },
  cues: [] }

// Engine helpers handed in by starfire.js (avoids a combat.js ↔ starfireState import cycle).
const E = { startMove: null, comboScale: null, hurtbox: null }
export function registerStarfireEngine(o) { Object.assign(E, o) }
const cue = (f, c) => starfireState(f).cues.push(c)
const ctxOf = new WeakMap()     // fighter → { opp, W } of its latest tick (never serialized; lets combat.js's hitbox read see the same world)
const ultTargets = new WeakMap()   // caster → fighter hit clean by its opener (never serialized; consumed the same frame)
const ctrX = f => (f.x || 0) + (f.w ?? 60) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const standY = f => (f.groundY ?? ((f.y || 0) + (f.h ?? 110))) - (f.h ?? 110)
const floorOf = f => standY(f) + (f.h ?? 110)
const fxSheet = (f, name) => f._recolorTag ? `./assets/starfire/skins/${f._recolorTag}/fx/${name}_strip.png` : `./assets/starfire/fx/${name}_strip.png`
function pushFx(s, kind, x, y, dir = 1, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), dir, t: 0, ...(extra || {}) }); if (s.fx.length > 10) s.fx.shift() }
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))

export function clearStarfire(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearStarfireUlt()
  const s = f._starfire
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._sf) W.projectiles.splice(i, 1)
  if (s?.lev) f.noDash = s.noDashPrev ?? undefined
  if (f.noDash === undefined) delete f.noDash
  delete f._starfire; delete f._starfireRemoteInput; delete f._sfPose; delete f._sfLand
}

// ══ EYE ANCHORS → WORLD ═══════════════════════════════════════════════════════════════════════════════════════
// The frame sprite.js shows for an attack strip: the frameTimeline entry for elapsed = total − timer, clamped.
export function timelineFrame(action, elapsed) {
  const tl = starfire.animationData[action]?.frameTimeline, n = starfire.animationData[action]?.frames || 1
  if (!tl) return 0
  return Math.min(n - 1, tl.reduce((idx, [at, fr]) => elapsed >= at ? fr : idx, 0))
}
// Strip-cell pixel (u, v) → world, exactly as sprite.js places the cell: offsetX = OX·scale − w/2, drawX = x − offsetX;
// facing −1 draws the same rect mirrored in place, so u maps to drawX + (CELL.w − u)·scale.
export function cellToWorld(f, u, v) {
  const sc = (f.spriteScale ?? starfire.spriteScale) * GSCALE, dir = f.facing === -1 ? -1 : 1
  return [ctrX(f) + dir * (u - CELL.ox) * sc, (f.y || 0) + (f.h ?? 110) + (v - CELL.oy) * sc]
}
// Validated eyes of (action, frame) in world space. [] when the frame has no emitting eye.
export function eyeWorld(f, action, frame) {
  const e = STARFIRE_EYES[action]?.[frame]
  if (!e || !e.emit) return []
  return e.eyes.map(k => { const [x, y] = cellToWorld(f, k.origin[0], k.origin[1]); return { side: k.side, x, y } })
}

// ══ STAR SIGHT geometry (pure) ═════════════════════════════════════════════════════════════════════════════════
// Slab test: parameter t ∈ [0, 1] where segment p0→p1 first enters rect r (or null).
function segRect(x0, y0, x1, y1, r) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0
  for (const [d, lo, hi, o] of [[dx, r.x, r.x + r.w, x0], [dy, r.y, r.y + r.h, y0]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return null; continue }
    let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a]
    t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null
  }
  return t0
}
function segCircle(x0, y0, x1, y1, cx, cy, r) {
  const dx = x1 - x0, dy = y1 - y0, fx = x0 - cx, fy = y0 - cy, a = dx * dx + dy * dy
  if (a < 1e-9) return fx * fx + fy * fy <= r * r ? 0 : null
  const b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r, disc = b * b - 4 * a * c
  if (c <= 0) return 0
  if (disc < 0) return null
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  return t >= 0 && t <= 1 ? t : null
}
// Beam geometry of Starfire's live Star Sight at elapsed E (the value combat.js and sprite.js see this frame).
// → null outside the active window / before the aim is captured / after the contract is spent.
export function laserGeom(f, W, el, opp = null) {
  const a = f?.currentAttack, m = a?.sf
  if (!m || !STARFIRE_MOVES[m.key]?.laser || !m.aim || m.prism) return null
  if (el < a.activeStart || el > a.activeEnd) return null
  const frame = timelineFrame(m.key, el), eyes = eyeWorld(f, m.key, frame)
  if (!eyes.length) return { frame, eyes, segs: [], contact: null }
  const [ax, ay] = m.aim, H = LASER.half, xmax = sw(W), floor = floorOf(f)
  const segs = eyes.map(e => {
    // clip the beam to the stage (0 … stage width) and the floor
    let L = LASER.length
    if (ax > 0) L = Math.min(L, (xmax - e.x) / ax); else if (ax < 0) L = Math.min(L, (0 - e.x) / ax)
    if (ay > 0) L = Math.min(L, (floor - e.y) / ay)
    L = Math.max(0, L)
    return { side: e.side, x0: e.x, y0: e.y, x1: e.x + ax * L, y1: e.y + ay * L, len: L }
  })
  let contact = null
  if (!a.hasHit) for (const o of foesOf(f, W, opp)) {
    const r0 = E.hurtbox ? E.hurtbox(o) : { x: o.x, y: o.y, w: o.w ?? 60, h: o.h ?? 110 }
    const r = { x: r0.x - H, y: r0.y - H, w: r0.w + 2 * H, h: r0.h + 2 * H }
    for (const s of segs) {
      const t = segRect(s.x0, s.y0, s.x1, s.y1, r); if (t == null) continue
      const d = t * s.len
      if (!contact || d < contact.d - 1e-9 || (Math.abs(d - contact.d) < 1e-9 && s.side < contact.side)) {
        const px = s.x0 + (s.x1 - s.x0) * t, py = s.y0 + (s.y1 - s.y0) * t
        contact = { d, side: s.side, x: Math.max(r0.x + 2, Math.min(r0.x + r0.w - 2, px)), y: Math.max(r0.y + 2, Math.min(r0.y + r0.h - 2, py)), target: o.side || o.playerNumber || 0 }
      }
    }
  }
  return { frame, eyes, segs, contact }
}
// Live laser geometry with the fighter's latest tick context (render / debug read; pure).
export function starfireLiveLaser(f) {
  const a = f?.currentAttack; if (!a?.sf) return null
  const c = ctxOf.get(f); return laserGeom(f, c?.W || null, a.total - a.timer, c?.opp || null)
}
// Aim captured once at elapsed LASER.aimAt: toward the nearest foe's torso from the eye midpoint, clamped to ±maxDeg.
function captureAim(f, W, opp, m) {
  const dir = m.dir, fr = timelineFrame(m.key, LASER.aimAt), eyes = eyeWorld(f, m.key, fr)
  const ex = eyes.length ? eyes.reduce((s, e) => s + e.x, 0) / eyes.length : ctrX(f) + dir * 20
  const ey = eyes.length ? eyes.reduce((s, e) => s + e.y, 0) / eyes.length : (f.y || 0) + (f.h ?? 110) * 0.2
  let best = null, bd = 1e9
  for (const o of foesOf(f, W, opp)) { const dx = (ctrX(o) - ex) * dir; if (dx <= 0) continue; const d = Math.abs(dx); if (d < bd) { bd = d; best = o } }
  let ang = 0
  if (best) {
    const dx = Math.max(1, (ctrX(best) - ex) * dir), dy = (best.y + (best.h ?? 110) * 0.4) - ey
    const lim = LASER.maxDeg * Math.PI / 180
    ang = Math.max(-lim, Math.min(lim, Math.atan2(dy, dx)))
  }
  // quantised to 1/1024 so replays / LAN peers reproduce the identical line from serialized state
  m.aim = [Math.round(dir * Math.cos(ang) * 1024) / 1024, Math.round(Math.sin(ang) * 1024) / 1024]
  m.aimDeg = Math.round(ang * 180 / Math.PI * 10) / 10
}

// ── Movement lock (game.js updateMovementInput) — Raven's rule set ──
const upGraceHold = (f, raw) => !!(raw?.up && !raw?.jump && !f.attacking && grounded(f) && (f._starfire?.upAge || 0) < UP_GRACE && !(f.hitstun > 0) && !f._starfire?.lev)
const upGraceKbd = (f, raw) => !!(raw?.up && raw?.jump && f.controls && f.controls.up === f.controls.jump && !f.attacking && grounded(f) && (f._starfire?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export const starfireLocked = (f, raw = null) => isStarfire(f) && ((f.attacking && !f.currentAttack?.launcher) ||
  !!(raw ? raw.special && raw.up && grounded(f) : f._starfire?.ownsUp) || upGraceHold(f, raw) || upGraceKbd(f, raw) || isStarfireUltActive())

// Start one of Starfire's moves through combat.startMove (frameExact path) and attach the per-move descriptor `sf`.
// Air / ground legality and every resource check happen BEFORE anything is spent.
export function startSfMove(f, key, W, { cancel = false, extra = null } = {}) {
  if (!isStarfire(f)) return false
  const s = starfireState(f), md = STARFIRE_MOVES[key], g = grounded(f) && !s.lev
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && ((f.disabledSpecials || []).includes('special') || f._gaDisabled > 0)) return false
  if (GROUND_ONLY.includes(key) && !g) return false
  if ((key === 'air' || key === 'sfComet' || key === 'sfAirLaser') && g) return false
  const rej = (why) => { s.stats.rejects++; s.lastReject = why; cue(f, 'reject'); return false }
  const cost = md.cost || 0
  if (key === 'sfComet' && s.cometUsed) return rej('cometUsed')
  if (key === 'sfAirLaser' && s.laserUsed) return rej('airLaserUsed')
  if (key === 'sfSky' && !g && s.skyUsed) return rej('skyUsed')
  if (key === 'sfOrb' && s.live.some(e => e.kind === 'orb')) return rej('orbActive')                        // max 1 Orbital Star per owner
  if ((key === 'sfBolt' || key === 'sfComet') && s.live.some(e => e.kind === 'bolt' || e.kind === 'comet')) return rej('boltActive')   // one ordinary bolt per owner
  if ((f.energy || 0) < cost) return rej('energy')
  if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  f.currentAttack.sf = { key, dir: f.facing === -1 ? -1 : 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, fired: false,
    fromChain: !!extra?.fromChain, aim: null, aimDeg: null, prism: false, contact: null, ground: g }
  f.currentAttack.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; if (g) f.vx = 0
  if (key === 'up') f.jumpHeld = true
  if (key === 'sfComet') s.cometUsed = true
  if (key === 'sfAirLaser') s.laserUsed = true
  if (key === 'sfSky') { if (!g) s.skyUsed = true; s.stats.skies++ }
  if (key === 'sfRush') s.stats.rushes++
  if (key === 'sfLaser' || key === 'sfAirLaser') { s.stats[key === 'sfLaser' ? 'lasers' : 'airLasers']++; cue(f, 'laserCharge') }
  else if (key === 'sfUltOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  else if (key === 'sfRush') cue(f, 'rush')
  else if (key === 'sfSky') cue(f, 'sky')
  else if (md.noBody) cue(f, 'charge')
  else cue(f, md.category === 'heavy' || md.launcher ? 'heavy' : 'swing')
  return true
}

// ── projectile emission (engine projectile + owner tag) ──
function emit(f, kind, W, P, { x, y, vx, vy = 0, art = 'ball', frames = 1, raw, scale = 2.2, extra = null }) {
  const s = starfireState(f)
  const pr = W?.spawn?.(f, 'starfire_' + kind, { damage: dmg(raw), speed: Math.hypot(vx, vy) || 1, vx, vy, spawnX: x, spawnY: y,
    w: P.r * 2, h: P.r * 2, radius: P.r, lifetime: P.life, hitstun: P.hitstun, knockbackX: P.kbx, knockbackY: P.kby,
    sheet: fxSheet(f, art), spriteFrames: frames, spriteW: STARFIRE_FX[art].w, spriteH: STARFIRE_FX[art].h, spriteSpeed: 3, spriteScale: scale,
    color: '#7cff4a', isSpecial: true, isUltimate: kind === 'ult',
    kevinCapture: kind === 'bolt' ? { family:'star', raw:P.raw } : null })
  if (!pr) return null
  pr.damageType = 'energy'; pr.noTrail = true
  pr._sf = { kind, n: ++s.nProj, ...(extra || {}) }
  s.live.push({ n: pr._sf.n, kind, x: pr.x, y: pr.y, px: pr.x, py: pr.y, r: P.r, hit: false })
  return pr
}
function emitBolt(f, which, W) {
  const P = BOLT[which], dir = f.currentAttack?.sf?.dir || f.facing || 1
  const kind = which === 'ground' ? 'bolt' : which === 'air' ? 'comet' : 'ult'
  return emit(f, kind, W, P, { x: ctrX(f) + dir * ((f.w ?? 60) / 2 + P.r + 4), y: f.y + (f.h ?? 110) * P.y, vx: dir * P.speed, vy: P.vy || 0,
    raw: P.raw, extra: which === 'air' ? { floor: floorOf(f) } : null })
}

// ── combat.js hooks (starfire-gated) ──
export function starfireHitbox(f) {
  const a = f.currentAttack, m = a?.sf, md = STARFIRE_MOVES[m?.key]
  const none = { x: 0, y: 0, w: 0, h: 0 }
  if (!m || !md || md.noBody) return none
  if (md.laser) {   // STAR SIGHT: one small box on the earliest beam / hurtbox entry point (both beams = one contract)
    const c = ctxOf.get(f), g = laserGeom(f, c?.W || null, a.total - a.timer, c?.opp || null)
    if (!g?.contact) return none
    return { x: g.contact.x - 4, y: g.contact.y - 4, w: 8, h: 8 }
  }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 18), w: a.rangeX, h: a.rangeY }
}
export function starfireBlock(f, d, a) {
  if (!isStarfire(f) || !a?.sf) return
  d.blockstun = STARFIRE_MOVES[a.sf.key].blockstun; a.sf.blocked = true
  if (STARFIRE_MOVES[a.sf.key].laser) { const s = starfireState(f); s.stats.laserBlocked++; cue(f, 'laserBlock') }
}
export function starfireHit(f, d, a, { armored = false } = {}) {
  if (!isStarfire(f) || !a?.sf) return
  if (STARFIRE_MOVES[a.sf.key].laser) { const s = starfireState(f); s.stats.laserHits++; cue(f, 'laserHit')
    pushFx(s, 'laserHit', (d.x || 0) + (d.w ?? 60) / 2, (d.y || 0) + (d.h ?? 110) * 0.4, a.sf.dir) }
  if (armored) return
  a.sf.clean = true; f._cmdHitLanded = true
}
// Every projectile connect (hit or block) of Starfire's own projectiles: Energy Exploding art + the ultimate confirm.
export function starfireProjectileHit(proj, t, { armored = false } = {}) {
  const f = proj?.owner, k = proj?._sf
  if (!k || !isStarfire(f)) return
  const s = starfireState(f), e = s.live.find(x => x.n === k.n), blocked = !!t?.isBlocking
  if (e) e.hit = true
  pushFx(s, k.kind === 'burst' ? 'bigExplode' : 'explode', proj.x, proj.y); cue(f, k.kind === 'burst' ? 'prismHit' : 'boltHit')
  if (!blocked && !armored) { const a = f.currentAttack; if (a?.sf) a.sf.clean = true; f._cmdHitLanded = true }
  if (k.kind === 'ult' && !blocked && !armored && t.health > 0) { const a = f.currentAttack; if (a?.sf?.key === 'sfUltOpen') { a.sf.ultHit = true; ultTargets.set(f, t) } }
}

// ── LEVITATION (Raven's bounded contract) ──
function tryLev(f) {
  const s = starfireState(f)
  if (s.lev || f.attacking || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || isStarfireUltActive() || f.health <= 0) return false
  if (s.levUsed) { s.stats.levFail++; s.lastReject = 'levUsed'; cue(f, 'reject'); return false }
  if ((f.energy || 0) < LEV.cost) { s.stats.levFail++; s.lastReject = 'energy'; cue(f, 'reject'); return false }
  f.energy -= LEV.cost
  const g = grounded(f)
  s.lev = { t: 0, vy: g ? LEV.liftVy : Math.max(-LEV.maxVy, Math.min(LEV.maxVy, f.vy || 0)), fromGround: g }
  s.levUsed = true; s.levEndT = 0; s.stats.lev++
  s.noDashPrev = f.noDash ?? null
  if (g) { f.onGround = false; f.grounded = false }
  f._sfPose = 'levStart'
  cue(f, 'levStart')
  return true
}
function endLev(f, why) {
  const s = starfireState(f), L = s.lev; if (!L) return
  s.lev = null
  s.stats.levEnd[why] = (s.stats.levEnd[why] || 0) + 1
  if (s.noDashPrev == null) delete f.noDash; else f.noDash = s.noDashPrev
  s.noDashPrev = null
  if (why === 'land' || why === 'interrupt' || why === 'reset') { f._sfPose = null; s.levEndT = 0 }
  else { f.vy = L.vy; s.levEndT = LEV.endFrames; f._sfPose = 'levEnd'; cue(f, 'levEnd') }
}
function levStep(f, raw) {
  const s = starfireState(f), L = s.lev
  L.t++
  if (f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || isStarfireUltActive()) return endLev(f, 'interrupt')
  if (L.t > LEV.maxFrames) return endLev(f, 'timeout')
  if ((f.energy || 0) < LEV.drain) return endLev(f, 'energy')
  f.energy -= LEV.drain; s.stats.levDrained += LEV.drain; s.stats.levFrames++
  const hy = (raw.down ? 1 : 0) - (raw.up || raw.jump ? 1 : 0)
  if (L.fromGround && L.t <= LEV.liftFrames) L.vy = LEV.liftVy
  else if (f.attacking) L.vy *= 0.6
  else L.vy = flightSoftLimit(flightAxisStep(L.vy, hy, LEV.axis), LEV.maxVy, LEV.axis)
  const top = Math.max(LEV.ceilingY, standY(f) - LEV.ceilingAbove)
  if (f.y + L.vy < top) L.vy = top - f.y
  f.vy = L.vy - GRAVITY * (1 + (f.juggleCount || 0) * 0.12)
  f.onGround = false; f.grounded = false
  f.jumpHeld = true
  f.noDash = true
  if (!f.attacking) f._sfPose = L.t <= LEV.startFrames ? 'levStart' : 'lev'
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickStarfire(f, opp, raw, W) {
  if (!isStarfire(f)) { if (f?._starfire) clearStarfire(f, W); return }
  const s = starfireState(f); s.tick++
  ctxOf.set(f, { opp: opp || null, W: W || null })
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'charge']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if (raw.up && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  f.isCharging = false                         // L2 / Charge is the levitation TOGGLE: never hold-to-charge
  const g = grounded(f)
  if (g && !s.wasGround) {                     // genuine landing: airtime allowances reset; landing frames (cosmetic)
    s.cometUsed = false; s.laserUsed = false; s.skyUsed = false; s.levUsed = false
    if (s.lev) endLev(f, 'land')
    if (!f.attacking && !(f.hitstun > 0)) f._sfLand = 15
    s.levEndT = 0; if (f._sfPose === 'levEnd') f._sfPose = null
  }
  s.airT = g ? 0 : s.airT + 1
  if (f._sfLand > 0) f._sfLand--
  if (f.hitstun > 0 || f.attacking) f._sfLand = 0
  const jc = f.jumpCount || 0
  if (!g && jc >= 2 && s.prevJc < 2) { s.djT = 16; s.stats.dj++; cue(f, 'doubleJump') }
  s.prevJc = jc; if (s.djT > 0) s.djT--
  if (f.health <= 0) { if (s.lev) endLev(f, 'interrupt'); s.wasGround = g; f._sfPose = null; return }
  const ce = s.edges.charge
  if (ce && ce.tick === s.tick && !(f.hitstun > 0)) { if (s.lev) endLev(f, 'toggle'); else tryLev(f) }
  s.wasGround = g
  if (s.lev) levStep(f, raw)
  else if (s.levEndT > 0) { s.levEndT--; f._sfPose = s.levEndT > 0 && !g && !f.attacking && !(f.hitstun > 0) ? 'levEnd' : null }
  if (!s.lev && !(s.levEndT > 0)) f._sfPose = (f._sfLand > 0 && g) ? 'land' : null
  if (f.hitstop > 0) return
  s.clock++
  // ── own projectiles: follow, Comet floor stop ──
  const P = W?.projectiles || []
  for (let i = s.live.length - 1; i >= 0; i--) {
    const e = s.live[i], p = P.find(q => q?.owner === f && q._sf?.n === e.n)
    if (!p) { if (!e.hit) pushFx(s, e.kind === 'burst' ? 'bigExplode' : 'fizzle', e.x, e.y); s.live.splice(i, 1); continue }
    e.px = e.x; e.py = e.y; e.x = p.x; e.y = p.y
    if (e.kind === 'comet' && p.y + (p.radius || 12) >= p._sf.floor) {   // no floor penetration: bursts on the floor
      P.splice(P.indexOf(p), 1); pushFx(s, 'explode', p.x, p._sf.floor - 10); cue(f, 'boltHit'); s.stats.cometFloor = (s.stats.cometFloor || 0) + 1; e.hit = true; s.live.splice(i, 1); continue
    }
  }
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 40) s.fx.splice(i, 1)
  // ── the live move ──
  const a = f.attacking ? f.currentAttack : null, m = a?.sf
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = a.total - a.timer, md = STARFIRE_MOVES[m.key]
  f.facing = m.dir
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) travel(f, m, opp, W, md.travel[2])
  else if (m.key === 'sfRush' && t >= RUSH.from && t < RUSH.until && !m.clean && !m.blocked) travel(f, m, opp, W, RUSH.speed)
  else if (g && !md.air && m.key !== 'air' && m.key !== 'sfSky') f.vx = 0
  switch (m.key) {
    case 'sfBolt': case 'sfComet': {
      if (t >= a.activeStart && !m.fired) { m.fired = true; if (emitBolt(f, m.key === 'sfBolt' ? 'ground' : 'air', W)) { s.stats[m.key === 'sfBolt' ? 'bolts' : 'comets']++; cue(f, 'bolt') } }
      if (m.key === 'sfComet' && t < a.activeStart + 4 && !s.lev) f.vy = Math.min(f.vy || 0, 1.5)   // a brief air hang while she throws
      break
    }
    case 'sfOrb': {
      if (t >= a.activeStart && !m.fired) {
        m.fired = true
        const dir = m.dir, P0 = ORB
        if (emit(f, 'orb', W, P0, { x: ctrX(f) + dir * ((f.w ?? 60) / 2 + P0.r + 6), y: f.y + (f.h ?? 110) * P0.y, vx: dir * P0.speed, raw: P0.raw, scale: 3.2 })) { s.stats.orbs++; cue(f, 'orb') }
      }
      break
    }
    case 'sfSky': {
      if (t === a.activeStart - 1) { f.vy = SKY.vy; f.vx = m.dir * SKY.vx; f.onGround = false; f.grounded = false; cue(f, 'skyLaunch') }
      break
    }
    case 'sfLaser': case 'sfAirLaser': {
      if (m.key === 'sfAirLaser' && !s.lev && t < a.activeEnd + 1) { f.vy = -GRAVITY * (1 + (f.juggleCount || 0) * 0.12); f.vx = 0 }   // hold the air line while the eyes fire
      const En = t + 1                                         // the elapsed combat.js / sprite.js see for the rest of this frame
      if (!m.aim && En >= LASER.aimAt) captureAim(f, W, opp, m)
      if (En === a.activeStart) cue(f, 'laserFire')
      // PRISM BREAK: a beam that reaches her OWN Orbital Star before any foe consumes it atomically and replaces the
      // remainder of the laser with ONE empowered burst on the aim line. The burst can never trigger another prism.
      if (!a.hasHit && !m.prism && En >= a.activeStart && En <= a.activeEnd) {
        const gm = laserGeom(f, W, En, opp)
        if (gm?.segs.length) {
          let best = null
          for (const e of s.live) {
            if (e.kind !== 'orb') continue
            for (const sg of gm.segs) {
              const u = segCircle(sg.x0, sg.y0, sg.x1, sg.y1, e.x, e.y, e.r + LASER.half); if (u == null) continue
              const d = u * sg.len
              if (gm.contact && d >= gm.contact.d) continue   // a foe is in front of the orb: the beam stops on the foe
              if (!best || d < best.d || (d === best.d && e.n < best.e.n)) best = { d, e }
            }
          }
          if (best) prism(f, s, m, a, best.e, W)
        }
      }
      break
    }
    case 'sfUltOpen': {
      if (t >= a.activeStart && !m.fired) { m.fired = true; emitBolt(f, 'ult', W); cue(f, 'bolt') }
      if (m.ultHit && !m.ultStarted) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateStarfireUlt(f, tg, W) }
      if (m.fired && !m.ultStarted && !m.whiff && !s.live.some(e => e.kind === 'ult')) { m.whiff = true; s.stats.ultWhiffs++; cue(f, 'ultMiss') }
      break
    }
  }
}
function travel(f, m, opp, W, v) {
  let x = Math.max(0, Math.min(sw(W) - f.w, f.x + m.dir * v))
  if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }
  f.x = x; f.vx = 0
}
function prism(f, s, m, a, e, W) {
  const P = W?.projectiles || [], p = P.find(q => q?.owner === f && q._sf?.n === e.n)
  if (!p) return
  P.splice(P.indexOf(p), 1); s.live.splice(s.live.indexOf(e), 1)          // the orb is consumed
  m.prism = true; a.hasHit = true                                           // the laser contract is spent (no stacked hit)
  const [ax, ay] = m.aim, B = BOLT.burst
  emit(f, 'burst', W, B, { x: e.x, y: e.y, vx: ax * B.speed, vy: ay * B.speed, raw: B.raw, scale: 4.2, extra: { from: e.n } })
  s.stats.prisms++; pushFx(s, 'prism', e.x, e.y, m.dir); cue(f, 'prism')
}

// ══ ULTIMATE: SUPERNOVA — EYES OF TAMARAN ═══════════════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (Raven / Cyborg / Rangers): activate / isActive / update / clear / status.
// While active, game.js freezes combat, physics and input and calls updateStarfireUlt() each frame. Starfire's pose
// is a non-hitting currentAttack on the ult strips. Bolts, beams and the explosion are drawn by starfireFx from
// starfireUltView(), a pure function of the frame. Contacts go through W.damage with the combo scale captured at
// confirm. No HP setter.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1, aim: null }
export const isStarfireUltActive = () => cine.active
export const starfireUltScene = () => (cine.active ? cine : null)   // the live scene, read by starfireUlt.js (cinematic director)
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, sf: null, _ultPose: true }
}
export function activateStarfireUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = starfireState(f)
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) { const p = W.projectiles[i]; if (p?.owner === f && p._sf) { W.projectiles.splice(i, 1); s.stats.retired++ } }
  s.live = []
  if (s.lev) endLev(f, 'reset')
  // legal spacing: never start (or land) overlapping the target
  const gap = ((f.w ?? 60) + (target.w ?? 60)) / 2 + 8, dir = f.facing === -1 ? -1 : 1
  let cx0 = f.x
  if (Math.abs(ctrX(target) - ctrX(f)) < gap) cx0 = ctrX(target) - dir * gap - (f.w ?? 60) / 2
  cx0 = Math.max(0, Math.min(sw(W) - (f.w ?? 60), cx0))
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: target.y, cx0, tx0: target.x,
    dir, done: 0, scale: E.comboScale?.(f) ?? 1, aim: null })
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
  cine.done = i + 1; if (f._starfire?.ult) f._starfire.ult.done = cine.done
  cue(f, c.kind === 'explode' ? 'ultExplode' : c.kind === 'laser' ? 'laserHit' : 'boltHit')
}
const ss = u => u * u * (3 - 2 * u)
export function updateStarfireUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, k = cine.frame
  if (!f || !t) return clearStarfireUlt()
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  for (const b of ULT.bolts) if (k === b) cue(f, 'bolt')
  if (k === ULT.laser[0] + 14) cue(f, 'laserFire')
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle   // KO: straight to the descent, no further contacts
  const fr = cine.frame, W = cine.W, hov = cine.floorC - ULT.rise
  const clampX = (o, x) => Math.max(0, Math.min(sw(W) - (o.w ?? 60), x))
  f.x = clampX(f, cine.cx0); f.facing = cine.dir
  if (fr < 40) { pose(f, 'ultOpen', 56); f.y = cine.floorC }
  else if (fr < 60) { pose(f, 'ultRise', fr - 40); f.y = cine.floorC - ULT.rise * ss((fr - 40) / 20) }
  else if (fr < 120) { const b = ULT.bolts.findIndex(x => fr >= x && fr < x + 12); pose(f, b >= 0 ? 'ultBolt' : 'ultHover', b >= 0 ? fr - ULT.bolts[b] : fr - 60); f.y = hov }
  else if (fr < 172) { pose(f, 'ultLaser', fr - 120); f.y = hov }
  else if (fr < 192) { pose(f, 'ultHover', fr - 172); f.y = hov }
  else if (fr < 208) { pose(f, 'levEnd', fr - 192); f.y = hov + ULT.rise * ss((fr - 192) / 16) }
  else { pose(f, 'ultLand', fr - 208); f.y = cine.floorC }
  if (fr === ULT.laser[0] + 6 && !cine.aim) {   // aim captured once from the validated eye midpoint toward the target torso (±35°)
    const eyes = eyeWorld(f, 'ultLaser', timelineFrame('ultLaser', 14))
    const ex = eyes.length ? eyes.reduce((q, e) => q + e.x, 0) / eyes.length : ctrX(f), ey = eyes.length ? eyes.reduce((q, e) => q + e.y, 0) / eyes.length : f.y + 20
    const dx = Math.max(1, (ctrX(t) - ex) * cine.dir), dy = (t.y + (t.h ?? 110) * 0.45) - ey, lim = 35 * Math.PI / 180
    const ang = Math.max(-lim, Math.min(lim, Math.atan2(dy, dx)))
    cine.aim = [Math.round(cine.dir * Math.cos(ang) * 1024) / 1024, Math.round(Math.sin(ang) * 1024) / 1024]
  }
  t.x = clampX(t, cine.tx0); t.y = cine.floorT; t.vx = 0; t.vy = 0; t.isBlocking = false
  if (f._starfire?.ult) f._starfire.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function restoreCaster(f) {
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = cine.floorC; f.vx = 0; f.vy = 0
  f._sfPose = null; if (f._starfire) { delete f._starfire.ult; f._starfire.levEndT = 0 }
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { restoreCaster(f); f.attackCooldown = 12; if (f._starfire) f._starfire.stats.ultDone++ }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, aim: null })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearStarfireUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) restoreCaster(f)
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, aim: null })
}
export const getStarfireUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null, aim: cine.aim })
// Render read (pure function of the frame + the caster's pose): cut-in, bolts in flight, the twin beams, the explosion.
export function starfireUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  const fr = cine.frame, t = cine.target
  const tx = ctrX(t), ty = t.y + (t.h ?? 110) * 0.45
  const hand = [ctrX(f) + cine.dir * 30, f.y + (f.h ?? 110) * 0.35]
  const bolts = ULT.bolts.map(b => fr - b).filter(k => k >= 0 && k < ULT.boltFlight).map(k => { const u = (k + 1) / ULT.boltFlight; return { x: hand[0] + (tx - hand[0]) * u, y: hand[1] + (ty - hand[1]) * u } })
  let beams = null
  if (fr >= ULT.laser[0] + 14 && fr < ULT.laser[1] && cine.aim) {
    const pf = timelineFrame('ultLaser', fr - ULT.laser[0])
    const eyes = eyeWorld(f, 'ultLaser', pf), [ax, ay] = cine.aim
    const L = Math.max(0, Math.hypot(tx - ctrX(f), ty - f.y) + 10)
    beams = { frame: pf, segs: eyes.map(e => ({ side: e.side, x0: e.x, y0: e.y, x1: e.x + ax * L, y1: e.y + ay * L })) }
  }
  return { frame: fr, cutIn: fr < ULT.cutIn ? fr / ULT.cutIn : null, bolts, beams,
    impacts: ULT.contacts.filter(c => c.kind !== 'explode' && fr >= c.at && fr < c.at + 14).map(c => ({ x: tx, y: ty, k: fr - c.at })),
    explode: fr >= 172 && fr < 200 ? { x: tx, y: ty, k: fr - 172 } : null }
}
export { TIMELINE }
