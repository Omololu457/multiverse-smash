// Raven (raven): SIMULATION state.
// - All state is plain JSON on f._raven, snapshotted for replay / LAN. Sim ticks only: no RNG, no wall clock.
// - Every export is a no-op for any other rosterKey.
// - Spells are ordinary ENGINE projectiles (W.spawn), so the shared block, combo scaling, juggle, hitstop and reflect
//   rules all apply.
// - Idle brick piles are Raven-owned spell objects. They have no collision body, deal no contact damage and give no
//   rewards. Their position, life and state are serialized here; bobbing and glow are cosmetic (ravenFx).
// - Levitation never edits physics.js. Raven's tick runs after this frame's movement and gravity, so it prepares the
//   NEXT frame:
//   - the vertical velocity is pre-compensated for the shared gravity step;
//   - the physics jump is held (jumpHeld) and the dash is suspended (noDash) while she levitates;
//   - the shared jump counter is never written, so a genuine landing remains the only reset.
import { RAVEN_MOVES, LEV, ORB, PILE, BRICK, VERDICT, SHELL, ULT, UP_GRACE, GROUND_ONLY, dmg } from './ravenData.js'
import { RAVEN_FX } from './ravenSprites.js'
import { flightAxisStep, flightSoftLimit } from './flight.js'

export const GRAVITY = 0.85   // physics.js `gravity` (asserted equal by harness/raven.test.mjs)
export const isRaven = f => f?.rosterKey === 'raven'
export const ravenState = f => f._raven ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  wasGround: true, airT: 0, pulseUsed: false, levUsed: false, lev: null, levEndT: 0, noDashPrev: null,
  piles: [], nextPile: 0, live: [], nProj: 0, verdict: null, shellCd: 0, brokeBy: {}, fx: [], djT: 0, prevJc: 0, upAge: 0,
  stats: { orbs: 0, airOrbs: 0, rejects: 0, lev: 0, levFail: 0, levEnd: {}, levFrames: 0, levDrained: 0, dj: 0,
    lifts: 0, pilesSpawned: 0, pilesBlocked: 0, pilesBroken: 0, pilesExpired: 0, sends: 0, conjures: 0, verdicts: 0, verdictCancel: 0,
    infusions: 0, shells: 0, shellAbsorbed: 0, shellEarly: 0, shellBroken: 0, shellCues: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0, retired: 0 },
  cues: [] }

// Engine helpers handed in by raven.js (avoids a combat.js ↔ ravenState import cycle).
const E = { startMove: null, comboScale: null }
export function registerRavenEngine(o) { Object.assign(E, o) }
const cue = (f, c) => ravenState(f).cues.push(c)
const ultTargets = new WeakMap()   // caster → fighter hit clean by its opener orb (never serialized; consumed the same frame)
const ctrX = f => (f.x || 0) + (f.w || 60) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const tid = t => t?.side || t?.playerNumber || 0
const standY = f => (f.groundY ?? ((f.y || 0) + (f.h || 100))) - (f.h || 100)
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const pileRect = p => ({ x: p.x - PILE.w / 2, y: p.y - PILE.h / 2, w: PILE.w, h: PILE.h })
const hurt = t => ({ x: t.x + 6, y: t.y + 6, w: Math.max(1, (t.w || 60) - 12), h: Math.max(1, (t.h || 100) - 6) })
const fxSheet = (f, name) => f._recolorTag ? `./assets/raven/skins/${f._recolorTag}/fx/${name}_strip.png` : `./assets/raven/fx/${name}_strip.png`
function pushFx(s, kind, x, y, dir = 1, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), dir, t: 0, ...(extra || {}) }); if (s.fx.length > 10) s.fx.shift() }
// Objects counted against the two-object maximum: idle / reserved piles + live brick projectiles (orbs are not bricks).
const ownedBricks = s => s.piles.length + s.live.filter(e => e.kind !== 'pulse' && e.kind !== 'airPulse' && e.kind !== 'ult').length

export function clearRaven(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearRavenUlt()
  const s = f._raven
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._rv) W.projectiles.splice(i, 1)
  if (s?.lev) f.noDash = s.noDashPrev ?? undefined
  if (f.noDash === undefined) delete f.noDash
  delete f._raven; delete f._ravenRemoteInput; delete f._rvPose; delete f._rvLand
}

// ── Movement lock (game.js updateMovementInput) ──
// - Locked during committed attacks and the ultimate. The launcher stays free so its jump-cancel works.
// - Up held WITH Special belongs to Falling Verdict (never a jump).
// - A fresh grounded Up holds the jump UP_GRACE frames, so Up pressed 1-2 f before Special still means Verdict.
const upGraceHold = (f, raw) => !!(raw?.up && !raw?.jump && !f.attacking && grounded(f) && (f._raven?.upAge || 0) < UP_GRACE && !(f.hitstun > 0) && !f._raven?.lev)
const upGraceKbd = (f, raw) => !!(raw?.up && raw?.jump && f.controls && f.controls.up === f.controls.jump && !f.attacking && grounded(f) && (f._raven?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export const ravenLocked = (f, raw = null) => isRaven(f) && ((f.attacking && !f.currentAttack?.launcher) ||
  !!(raw ? raw.special && raw.up && grounded(f) : f._raven?.ownsUp) || upGraceHold(f, raw) || upGraceKbd(f, raw) || isRavenUltActive())

// Start one of Raven's moves through combat.startMove (frameExact path) and attach the per-move descriptor `rv`.
// Air / ground legality and every resource check happen BEFORE anything is spent.
export function startRvMove(f, key, W, { cancel = false, extra = null } = {}) {
  if (!isRaven(f)) return false
  const s = ravenState(f), md = RAVEN_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && ((f.disabledSpecials || []).includes('special') || f._gaDisabled > 0)) return false
  if (GROUND_ONLY.includes(key) && (!g || s.lev)) return false
  if ((key === 'air' || key === 'rAirPulse') && g) return false
  const rej = (why) => { s.stats.rejects++; s.lastReject = why; cue(f, 'reject'); return false }
  let cost = md.cost || 0
  const opt = { ...(extra || {}) }
  if (key === 'rAirPulse' && s.pulseUsed) return rej('airPulseUsed')
  if ((key === 'rPulse' || key === 'rAirPulse') && s.live.some(e => e.kind === 'pulse' || e.kind === 'airPulse')) return rej('orbActive')   // one ordinary orb per owner
  if (key === 'rLift') {
    if (s.piles.length) return rej('pilesExist')                                       // never refresh or stack: reject with feedback
    if (ownedBricks(s) >= PILE.max) return rej('objectCap')
  }
  if (key === 'rSend' && !s.piles.some(p => p.state === 'idle')) return rej('noPile')
  if (key === 'rConjure' && ownedBricks(s) >= PILE.max) return rej('objectCap')
  if (key === 'rVerdict') {
    if (s.verdict || s.live.some(e => e.kind === 'verdict')) return rej('verdictActive')   // one drop per owner
    const idle = s.piles.some(p => p.state === 'idle')
    if (!idle && ownedBricks(s) >= PILE.max) return rej('objectCap')
    cost = idle ? VERDICT.costPile : VERDICT.costConjure; opt.viaPile = idle
  }
  if (key === 'rShield' && s.shellCd > 0) return rej('shellCooldown')
  if ((f.energy || 0) < cost) return rej('energy')
  if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  f.currentAttack.rv = { key, dir: f.facing || 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, fired: false,
    phase: 'start', fromChain: !!opt.fromChain, contacts: 0, ended: false, pileId: null, viaPile: !!opt.viaPile }
  f.currentAttack.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; if (g) f.vx = 0
  if (key === 'up') f.jumpHeld = true
  const m = f.currentAttack.rv
  if (key === 'rAirPulse') s.pulseUsed = true
  if (key === 'rSend') {   // reserve the nearest idle pile now (it can still be broken by a hostile hit before release)
    const cx = ctrX(f), p = s.piles.filter(q => q.state === 'idle').sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx) || a.id - b.id)[0]
    p.state = 'send'; m.pileId = p.id
  }
  if (key === 'rVerdict') {   // capture the target column at acceptance: ≤ 220 px ahead, never behind Raven; no later tracking
    const opp = nearestFoe(f, W), cx = ctrX(f), want = opp ? (ctrX(opp) - cx) * m.dir : VERDICT.reach
    const ahead = Math.max(VERDICT.minAhead, Math.min(VERDICT.reach, want))
    const col = Math.max(PILE.margin + 20, Math.min(sw(W) - PILE.margin - 20, cx + m.dir * ahead))
    const floor = standY(f) + (f.h || 100)
    let pile = null
    if (m.viaPile) { pile = s.piles.filter(q => q.state === 'idle').sort((a, b) => Math.abs(a.x - col) - Math.abs(b.x - col) || a.id - b.id)[0]; pile.state = 'verdict' }
    else { pile = { id: ++s.nextPile, x: cx + m.dir * 30, y: f.y + (f.h || 100) * PILE.torso, life: PILE.life, state: 'verdict', conj: true }; s.piles.push(pile); s.stats.pilesSpawned++ }
    pile.x0 = pile.x; pile.y0 = pile.y
    s.verdict = { col: Math.round(col), top: Math.round(Math.max(LEV.ceilingY, floor - VERDICT.rise)), floor: Math.round(floor), pileId: pile.id, t: 0 }
    s.stats.verdicts++; cue(f, 'verdictWarn')
  }
  if (key === 'rShield') { s.stats.shells++; cue(f, 'shellUp') }
  else if (key === 'rUltOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  else if (key === 'rLift') cue(f, 'liftCast')
  else if (md.noBody) cue(f, 'cast')
  else cue(f, md.category === 'heavy' || md.launcher ? 'palm' : 'swing')
  return true
}
function nearestFoe(f, W) {
  const list = (W?.fighters?.() || []).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
  let best = null, bd = 1e9
  for (const o of list) { const d = Math.abs(ctrX(o) - ctrX(f)); if (d < bd) { bd = d; best = o } }
  return best
}

// ── projectile emission (engine projectile + owner tag) ──
function emit(f, kind, W, P, { x, y, vx, vy = 0, art, frames, raw, extra = null }) {
  const s = ravenState(f)
  const pr = W?.spawn?.(f, 'raven_' + kind, { damage: dmg(raw), speed: Math.abs(vx) || 1, vx, vy, spawnX: x, spawnY: y,
    w: P.r * 2, h: P.r * 2, radius: P.r, lifetime: P.life, hitstun: P.hitstun, knockbackX: P.kbx, knockbackY: P.kby,
    sheet: fxSheet(f, art), spriteFrames: frames, spriteW: RAVEN_FX[art].w, spriteH: RAVEN_FX[art].h, spriteSpeed: 3, spriteScale: 2.2,
    color: '#9a78ff', isSpecial: true, isUltimate: kind === 'ult' })
  if (!pr) return null
  pr.damageType = art === 'orb' ? 'energy' : 'blunt'; pr.noTrail = true
  pr._rv = { kind, n: ++s.nProj, ...(extra || {}) }
  s.live.push({ n: pr._rv.n, kind, x: pr.x, y: pr.y, px: pr.x, py: pr.y, hit: false })
  return pr
}
function emitOrb(f, which, W) {
  const P = ORB[which], dir = f.currentAttack?.rv?.dir || f.facing || 1
  return emit(f, which === 'ground' ? 'pulse' : which === 'air' ? 'airPulse' : 'ult', W, P,
    { x: ctrX(f) + dir * ((f.w || 60) / 2 + P.r + 4), y: f.y + (f.h || 100) * P.y, vx: dir * P.speed, art: 'orb', frames: 3, raw: P.raw })
}
function emitBrick(f, kind, W, x, y, dir, extra = null) {
  const P = BRICK[kind]
  return emit(f, kind, W, P, { x, y, vx: kind === 'verdict' ? 0 : dir * P.speed, vy: kind === 'verdict' ? P.vy0 : 0, art: 'pile', frames: 1, raw: P.raw, extra })
}

// ── Lift the Room: two owned piles, front then back, at legal bounded positions ──
function spawnPiles(f, W, dir) {
  const s = ravenState(f), cx = ctrX(f), cy = f.y + (f.h || 100) * PILE.torso
  const foes = (W?.fighters?.() || []).filter(o => o && o !== f && o.health > 0)
  let room = PILE.max - ownedBricks(s), made = 0
  for (const side of [1, -1]) {
    if (room <= 0) break
    const x = Math.max(PILE.margin + PILE.w / 2, Math.min(sw(W) - PILE.margin - PILE.w / 2, cx + side * dir * PILE.offset))
    const p = { id: s.nextPile + 1, x: Math.round(x), y: Math.round(cy), life: PILE.life, state: 'idle' }
    const r = pileRect(p)
    // never inside an opponent or another pile; a clamped position that collapses onto Raven herself is also refused
    if (foes.some(o => overlap(r, hurt(o))) || s.piles.some(q => overlap(r, pileRect(q))) || Math.abs(p.x - cx) < PILE.w / 2) { s.stats.pilesBlocked++; continue }
    s.nextPile++; s.piles.push(p); room--; made++; s.stats.pilesSpawned++
  }
  if (made) { s.stats.lifts++; cue(f, 'lift') } else cue(f, 'reject')
}
function breakPile(f, s, p, why) {
  const i = s.piles.indexOf(p); if (i < 0) return
  s.piles.splice(i, 1)
  pushFx(s, 'break', p.x, p.y + PILE.h / 2)
  if (why === 'hostile') { s.stats.pilesBroken++; cue(f, 'brickBreak') } else s.stats.pilesExpired++
  if (s.verdict?.pileId === p.id) { s.verdict = null; s.stats.verdictCancel++ }   // a broken rising pile cancels the drop (no refund)
  if (why === 'hostile' && shellActive(f)) { s.stats.shellCues++; pushFx(s, 'shellCue', p.x, p.y); cue(f, 'shellCue') }   // cosmetic cue only
}

// ── Soul Shell ──
function shellActive(f) {
  const a = f?.currentAttack, m = a?.rv
  if (!isRaven(f) || !f.attacking || m?.key !== 'rShield' || m.ended || f.hitstun > 0 || f.isGrabbed) return false
  const t = a.total - a.timer
  return t >= SHELL.startup && t < SHELL.startup + SHELL.active
}
export const ravenShellActive = shellActive
// End the active shell early through the real Shield End sequence (fresh Special retap, or the second contact).
export function ravenShellEnd(f, why = 'retap') {
  const a = f?.currentAttack, m = a?.rv
  if (!m || m.key !== 'rShield' || m.ended) return false
  const t = a.total - a.timer
  if (t < SHELL.startup) return false                   // startup is committed (not cancellable into the end)
  m.ended = true; m.phase = 'end'
  a.timer = Math.min(a.timer, SHELL.recovery)            // elapsed jumps to the Shield End frames
  const s = ravenState(f); s.shellCd = SHELL.cooldown
  if (why === 'retap') s.stats.shellEarly++
  cue(f, why === 'broken' ? 'shellBreak' : 'shellEnd')
  return true
}
// Shared defense contract (same shape as absorbSpdBlue): consume one eligible FRONTAL contact before normal damage
// resolution. Grabs, unblockables, ultimates and cinematic contacts bypass; there is no reflect, heal or refund.
export function absorbRaven(f, source, attack, projectile = false) {
  if (!shellActive(f) || !attack || attack.isUltimate || attack.isCinematic || attack.cinematic || attack.unblockable ||
      attack.damageType === 'grab' || attack.category === 'grab' || !(attack.damage > 0)) return false
  const m = f.currentAttack.rv, s = ravenState(f), dir = m.dir || f.facing || 1   // frontal = the direction she cast it (a mid-shell auto-turn never widens it)
  const sx = projectile ? attack.x : (source?.x || 0) + (source?.w || 0) / 2, fc = ctrX(f)
  if (!Number.isFinite(sx) || (sx - fc) * dir < 0) return false   // from behind: not protected
  m.contacts++; s.stats.shellAbsorbed++
  pushFx(s, 'shellHit', fc + dir * 40, f.y + (f.h || 100) * 0.45, dir)
  cue(f, 'shellHit')
  if (m.contacts >= SHELL.contacts) { s.stats.shellBroken++; ravenShellEnd(f, 'broken') }
  return true
}

// ── combat.js hooks (raven-gated) ──
export function ravenHitbox(f) {
  const a = f.currentAttack, m = a?.rv, md = RAVEN_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 18), w: a.rangeX, h: a.rangeY }
}
export function ravenBlock(f, d, a) {
  if (!isRaven(f) || !a?.rv) return
  d.blockstun = RAVEN_MOVES[a.rv.key].blockstun; a.rv.blocked = true
}
export function ravenHit(f, d, a, { armored = false } = {}) {
  if (!isRaven(f) || !a?.rv || armored) return
  a.rv.clean = true; f._cmdHitLanded = true
}
// Every projectile connect (hit or block) of Raven's own projectiles: impact art + the ultimate confirm.
export function ravenProjectileHit(proj, t, { armored = false } = {}) {
  const f = proj?.owner, k = proj?._rv
  if (!k || !isRaven(f)) return
  const s = ravenState(f), e = s.live.find(x => x.n === k.n), blocked = !!t?.isBlocking
  if (e) e.hit = true
  if (k.kind === 'pulse' || k.kind === 'airPulse' || k.kind === 'ult') { pushFx(s, 'explode', proj.x, proj.y); cue(f, 'orbHit') }
  else { pushFx(s, 'break', proj.x, proj.y + 10); cue(f, 'brickBreak') }
  if (!blocked && !armored) { const a = f.currentAttack; if (a?.rv && a.rv.key !== 'rShield') a.rv.clean = true; f._cmdHitLanded = true }
  if (k.kind === 'ult' && !blocked && !armored && t.health > 0) { const a = f.currentAttack; if (a?.rv?.key === 'rUltOpen') { a.rv.ultHit = true; ultTargets.set(f, t) } }
}

// ── LEVITATION ──
function tryLev(f) {
  const s = ravenState(f)
  if (s.lev || f.attacking || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || isRavenUltActive() || f.health <= 0) return false
  if (s.levUsed) { s.stats.levFail++; cue(f, 'reject'); return false }               // one levitation per airtime (no indefinite stall)
  if ((f.energy || 0) < LEV.cost) { s.stats.levFail++; s.lastReject = 'energy'; cue(f, 'reject'); return false }
  f.energy -= LEV.cost
  const g = grounded(f)
  s.lev = { t: 0, vy: g ? LEV.liftVy : Math.max(-LEV.maxVy, Math.min(LEV.maxVy, f.vy || 0)), fromGround: g, jc: f.jumpCount || 0 }
  s.levUsed = true; s.levEndT = 0; s.stats.lev++
  s.noDashPrev = f.noDash ?? null
  if (g) { f.onGround = false; f.grounded = false }
  f._rvPose = 'levStart'
  cue(f, 'levStart')
  return true
}
function endLev(f, why) {
  const s = ravenState(f), L = s.lev; if (!L) return
  s.lev = null
  s.stats.levEnd[why] = (s.stats.levEnd[why] || 0) + 1
  if (s.noDashPrev == null) delete f.noDash; else f.noDash = s.noDashPrev
  s.noDashPrev = null
  if (why === 'land' || why === 'interrupt' || why === 'reset') { f._rvPose = null; s.levEndT = 0 }
  else { f.vy = L.vy; s.levEndT = LEV.endFrames; f._rvPose = 'levEnd'; cue(f, 'levEnd') }
}
function levStep(f, raw, W) {
  const s = ravenState(f), L = s.lev
  L.t++
  if (f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || isRavenUltActive()) return endLev(f, 'interrupt')
  if (L.t > LEV.maxFrames) return endLev(f, 'timeout')
  if ((f.energy || 0) < LEV.drain) return endLev(f, 'energy')
  f.energy -= LEV.drain; s.stats.levDrained += LEV.drain; s.stats.levFrames++
  const hy = (raw.down ? 1 : 0) - (raw.up || raw.jump ? 1 : 0)
  if (L.fromGround && L.t <= LEV.liftFrames) L.vy = LEV.liftVy
  else if (f.attacking) L.vy *= 0.6                                                    // an air attack holds the hover
  else L.vy = flightSoftLimit(flightAxisStep(L.vy, hy, LEV.axis), LEV.maxVy, LEV.axis)
  const top = Math.max(LEV.ceilingY, standY(f) - LEV.ceilingAbove)
  if (f.y + L.vy < top) L.vy = top - f.y                                            // bounded: never above the levitation ceiling
  // next frame: physics.applyGravity adds gravity (juggle-ramped), then integrates y; pre-compensate so the net is L.vy
  f.vy = L.vy - GRAVITY * (1 + (f.juggleCount || 0) * 0.12)
  f.onGround = false; f.grounded = false
  f.jumpHeld = true            // Up is vertical control: no physics jump while levitating (jump counter untouched)
  f.noDash = true              // no air dash out of the bounded hover
  if (!f.attacking) f._rvPose = L.t <= LEV.startFrames ? 'levStart' : 'lev'
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickRaven(f, opp, raw, W) {
  if (!isRaven(f)) { if (f?._raven) clearRaven(f, W); return }
  const s = ravenState(f); s.tick++
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
  f.isCharging = false                         // L2 / Charge is the levitation TOGGLE for Raven: never hold-to-charge
  const g = grounded(f)
  if (g && !s.wasGround) {                     // genuine landing: airtime allowances reset; landing frames (cosmetic)
    s.pulseUsed = false; s.levUsed = false
    if (s.lev) endLev(f, 'land')
    if (!f.attacking && !(f.hitstun > 0)) f._rvLand = 21
    s.levEndT = 0; if (f._rvPose === 'levEnd') f._rvPose = null
  }
  s.airT = g ? 0 : s.airT + 1
  if (f._rvLand > 0) f._rvLand--
  if (f.hitstun > 0 || f.attacking) f._rvLand = 0
  // shared double jump: render cue only (physics.js owns the jump; nothing here changes jumpCount)
  const jc = f.jumpCount || 0
  if (!g && jc >= 2 && s.prevJc < 2) { s.djT = 16; s.stats.dj++; cue(f, 'doubleJump') }
  s.prevJc = jc; if (s.djT > 0) s.djT--
  if (f.health <= 0) { if (s.lev) endLev(f, 'interrupt'); s.wasGround = g; f._rvPose = null; return }
  const ce = s.edges.charge
  if (ce && ce.tick === s.tick && !(f.hitstun > 0)) { if (s.lev) endLev(f, 'toggle'); else tryLev(f) }
  s.wasGround = g
  if (s.lev) levStep(f, raw, W)
  else if (s.levEndT > 0) { s.levEndT--; f._rvPose = s.levEndT > 0 && !g && !f.attacking && !(f.hitstun > 0) ? 'levEnd' : null }
  if (!s.lev && !(s.levEndT > 0)) f._rvPose = (f._rvLand > 0 && g) ? 'land' : null   // supplied landing frames (sprite.js shows them only when idle)
  if (f.hitstop > 0) return
  s.clock++
  if (s.shellCd > 0 && !(f.currentAttack?.rv?.key === 'rShield' && !f.currentAttack.rv.ended)) s.shellCd--
  for (const k of Object.keys(s.brokeBy)) if (s.tick - s.brokeBy[k].tick > 120) delete s.brokeBy[k]
  // ── own projectiles: follow, Verdict gravity + floor stop, infusion sweep ──
  const P = W?.projectiles || []
  for (let i = s.live.length - 1; i >= 0; i--) {
    const e = s.live[i], p = P.find(q => q?.owner === f && q._rv?.n === e.n)
    if (!p) { if (!e.hit) pushFx(s, e.kind === 'pulse' || e.kind === 'airPulse' || e.kind === 'ult' ? 'fizzle' : 'break', e.x, e.y); s.live.splice(i, 1); continue }
    e.px = e.x; e.py = e.y; e.x = p.x; e.y = p.y
    if (e.kind === 'verdict') {
      const floor = p._rv.floor
      if (p.y + (p.radius || 20) >= floor) { P.splice(P.indexOf(p), 1); pushFx(s, 'break', p.x, floor); cue(f, 'brickBreak'); s.live.splice(i, 1); continue }   // no floor penetration
      p.vy = Math.min(BRICK.verdict.vmax, (p.vy || 0) + BRICK.verdict.g)
    }
    if ((e.kind === 'pulse' || e.kind === 'airPulse') && infuse(f, s, e, p, W, P)) s.live.splice(s.live.indexOf(e), 1)
  }
  // ── piles: hostile hits (one pile per hostile attack instance; projectiles pass through, breaking what they touch) ──
  const foes = (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
  for (const o of foes) {
    const box = W?.attackBox?.(o); if (!box || !s.piles.length) continue
    const a = o.currentAttack, key = `${a?.name}:${s.tick - ((a?.total || 0) - (a?.timer || 0))}`
    if (s.brokeBy[tid(o)]?.key === key) continue
    const p = s.piles.find(q => overlap(box, pileRect(q)))
    if (p) { s.brokeBy[tid(o)] = { key, tick: s.tick }; breakPile(f, s, p, 'hostile') }
  }
  for (const q of P) {
    if (!q || q.owner === f || q.visualOnly || !s.piles.length || (q.owner?.team && f.team && q.owner.team === f.team)) continue
    const r = q.radius || 10, box = { x: q.x - r, y: q.y - r, w: r * 2, h: r * 2 }
    const p = s.piles.find(z => overlap(box, pileRect(z)))
    if (p) breakPile(f, s, p, 'hostile')
  }
  for (let i = s.piles.length - 1; i >= 0; i--) { const p = s.piles[i]; if (p.state === 'idle' && --p.life <= 0) breakPile(f, s, p, 'expire') }
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 34) s.fx.splice(i, 1)
  // ── the live move ──
  const a = f.attacking ? f.currentAttack : null, m = a?.rv
  if (!m || f.hitstun > 0 || f.isGrabbed) {
    if (s.verdict && !(m?.key === 'rVerdict')) dropVerdict(f, s, W, true)   // interrupted before release: the pile simply falls back to idle (no drop, no refund)
    return
  }
  const t = a.total - a.timer, md = RAVEN_MOVES[m.key]
  f.facing = m.dir
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) {
    const want = m.origin + m.dir * md.travel[2] * (t - md.travel[0] + 1)
    let x = Math.max(0, Math.min(sw(W) - f.w, want))
    if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }
    f.x = x; f.vx = 0
  } else if (g && !md.air && m.key !== 'air') f.vx = 0
  switch (m.key) {
    case 'rPulse': case 'rAirPulse': {
      if (t >= a.activeStart && !m.fired) { m.fired = true; if (emitOrb(f, m.key === 'rPulse' ? 'ground' : 'air', W)) { s.stats[m.key === 'rPulse' ? 'orbs' : 'airOrbs']++; cue(f, 'pulse') } }
      break
    }
    case 'rLift': {
      if (t >= a.activeStart && !m.fired) { m.fired = true; spawnPiles(f, W, m.dir) }
      break
    }
    case 'rSend': {
      if (t >= a.activeStart && !m.fired) {
        m.fired = true
        const p = s.piles.find(q => q.id === m.pileId)
        if (!p) { cue(f, 'reject'); break }                      // broken before release: nothing is thrown (no refund)
        s.piles.splice(s.piles.indexOf(p), 1)
        if (emitBrick(f, 'send', W, p.x, p.y, m.dir)) { s.stats.sends++; cue(f, 'send') }
      }
      break
    }
    case 'rConjure': {
      if (t >= a.activeStart && !m.fired) {
        m.fired = true
        if (ownedBricks(s) >= PILE.max) { cue(f, 'reject'); break }
        if (emitBrick(f, 'conjure', W, ctrX(f) + m.dir * ((f.w || 60) / 2 + 26), f.y + (f.h || 100) * PILE.torso, m.dir)) { s.stats.conjures++; cue(f, 'send') }
      }
      break
    }
    case 'rVerdict': {
      const v = s.verdict, p = v && s.piles.find(q => q.id === v.pileId)
      if (!v || !p) break
      v.t = t
      const u = Math.min(1, t / a.activeStart), e = u * u * (3 - 2 * u)   // visible rise to the captured column top
      p.x = Math.round(p.x0 + (v.col - p.x0) * e); p.y = Math.round(p.y0 + (v.top - p.y0) * e)
      if (t >= a.activeStart && !m.fired) { m.fired = true; dropVerdict(f, s, W, false) }
      break
    }
    case 'rShield': {
      if (!m.ended && t >= SHELL.startup + SHELL.active) { m.ended = true; m.phase = 'end'; s.shellCd = SHELL.cooldown; cue(f, 'shellEnd') }
      else if (!m.ended && t >= SHELL.startup) m.phase = 'on'
      break
    }
    case 'rUltOpen': {
      if (t >= a.activeStart && !m.fired) { m.fired = true; emitOrb(f, 'ult', W); cue(f, 'pulse') }
      if (m.ultHit && !m.ultStarted) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateRavenUlt(f, tg, W) }
      if (m.fired && !m.ultStarted && !m.whiff && !s.live.some(e => e.kind === 'ult')) { m.whiff = true; s.stats.ultWhiffs++; cue(f, 'ultMiss') }
      break
    }
  }
}
function dropVerdict(f, s, W, aborted) {
  const v = s.verdict; if (!v) return
  const p = s.piles.find(q => q.id === v.pileId)
  s.verdict = null
  if (!p) return
  if (aborted) {   // interrupted before release: a conjured pile crumbles; an existing pile returns to idle where it is
    if (p.conj) breakPile(f, s, p, 'expire'); else { p.state = 'idle'; p.life = Math.min(p.life, PILE.life) }
    return
  }
  s.piles.splice(s.piles.indexOf(p), 1)
  if (emitBrick(f, 'verdict', W, v.col, v.top, 1, { floor: v.floor })) cue(f, 'verdictDrop')
}
// ── INFUSION: own ordinary orb × own idle pile (swept segment vs the pile box grown by the orb radius) ──
function infuse(f, s, e, p, W, P) {
  if (p._rv.infusedFrom) return false
  const r = p.radius || 12, x0 = e.px, y0 = e.py, dx = e.x - x0, dy = e.y - y0
  let best = null, bt = 2
  for (const q of s.piles) {
    if (q.state !== 'idle') continue
    const b = pileRect(q), L = b.x - r, R = b.x + b.w + r, T = b.y - r, B = b.y + b.h + r
    let t0 = 0, t1 = 1
    for (const [d, lo, hi, o] of [[dx, L, R, x0], [dy, T, B, y0]]) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { t0 = 2; break } continue }
      let a1 = (lo - o) / d, a2 = (hi - o) / d; if (a1 > a2) [a1, a2] = [a2, a1]
      t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); if (t0 > t1) { t0 = 2; break }
    }
    if (t0 <= 1 && (t0 < bt || (t0 === bt && q.id < best.id))) { bt = t0; best = q }
  }
  if (!best) return false
  // atomic: the orb and the pile are both consumed and ONE infused brick replaces them (no stacked hit)
  P.splice(P.indexOf(p), 1)
  s.piles.splice(s.piles.indexOf(best), 1)
  const dir = (p.vx || 0) < 0 ? -1 : 1
  emitBrick(f, 'infused', W, best.x, best.y, dir, { infusedFrom: e.n })
  s.stats.infusions++; pushFx(s, 'infuse', best.x, best.y, dir); cue(f, 'infuse')
  return true
}

// ══ ULTIMATE: AZARATH — THE ROOM OBEYS ══════════════════════════════════════════════════════════════════════
// - Uses the existing FROZEN-CINEMATIC contract (same as Cyborg and the Rangers): activate / isActive / update /
//   clear / status. While active, game.js freezes combat, physics and input and calls updateRavenUlt() each frame.
// - Raven's pose comes from a non-hitting currentAttack on the ult strips.
// - The cinematic piles, impact debris and release explosion are drawn by ravenFx from ravenUltView(), which is a
//   pure function of the frame.
// - Contacts go through W.damage with the combo scale captured at confirm. No HP setter.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1 }
export const isRavenUltActive = () => cine.active
export const ravenUltScene = () => (cine.active ? cine : null)   // the live scene, read by ravenUlt.js (cinematic director)
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, rv: null, _ultPose: true }
}
export function activateRavenUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = ravenState(f)
  // retire incompatible ordinary pending spells safely: own projectiles vanish, idle piles crumble (cosmetic only)
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) { const p = W.projectiles[i]; if (p?.owner === f && p._rv) { W.projectiles.splice(i, 1); s.stats.retired++ } }
  s.live = []
  for (const p of [...s.piles]) { breakPile(f, s, p, 'expire'); s.stats.retired++ }
  s.verdict = null
  if (s.lev) endLev(f, 'reset')
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: target.y, cx0: f.x, tx0: target.x,
    dir: f.facing || 1, done: 0, scale: E.comboScale?.(f) ?? 1 })
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
  cine.done = i + 1; if (f._raven?.ult) f._raven.ult.done = cine.done
  cue(f, c.kind === 'release' ? 'ultRelease' : 'brickBreak')
}
export function updateRavenUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, k = cine.frame
  if (!f || !t) return clearRavenUlt()
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  if (k === 60 || k === 64) cue(f, 'lift')
  if (k === 80 || k === 96) cue(f, 'send')
  if (k === 126) cue(f, 'shellUp')
  if (k === 164) cue(f, 'shellEnd')
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle   // KO: straight to the settle, no further contacts
  const fr = cine.frame, W = cine.W
  const clampX = (o, x) => Math.max(0, Math.min(sw(W) - (o.w || 60), x))
  f.x = clampX(f, cine.cx0)
  if (fr < 40) { pose(f, 'ultOpen', 32); f.y = cine.floorC }
  else if (fr < 60) { const u = (fr - 40) / 20; pose(f, 'ultRise', fr - 40); f.y = cine.floorC - ULT.rise * u * u * (3 - 2 * u) }
  else if (fr < 80) { pose(f, 'ultCast', fr - 60); f.y = cine.floorC - ULT.rise }
  else if (fr < 94) { pose(f, 'ultThrow', fr - 80); f.y = cine.floorC - ULT.rise }
  else if (fr < 96) { pose(f, 'ultHover', fr - 94); f.y = cine.floorC - ULT.rise }
  else if (fr < 110) { pose(f, 'ultThrow', fr - 96); f.y = cine.floorC - ULT.rise }
  else if (fr < 112) { pose(f, 'ultHover', fr - 110); f.y = cine.floorC - ULT.rise }
  else if (fr < 126) { const u = (fr - 112) / 14; pose(f, 'levEnd', fr - 112); f.y = cine.floorC - ULT.rise * (1 - u * u * (3 - 2 * u)) }
  else if (fr < 164) { pose(f, 'ultShell', fr - 126); f.y = cine.floorC }
  else { pose(f, 'ultRelease', fr - 164); f.y = cine.floorC }
  t.x = clampX(t, cine.tx0); t.y = cine.floorT; t.vx = 0; t.vy = 0; t.isBlocking = false
  if (f._raven?.ult) f._raven.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function restoreCaster(f) {
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = cine.floorC; f.vx = 0; f.vy = 0
  f._rvPose = null; if (f._raven) { delete f._raven.ult; f._raven.levEndT = 0 }
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { restoreCaster(f); f.attackCooldown = 12; if (f._raven) f._raven.stats.ultDone++ }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearRavenUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) restoreCaster(f)
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export const getRavenUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
// Render read (pure function of the frame): cut-in progress, cinematic piles, impact debris, release explosion.
export function ravenUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  const fr = cine.frame, d = cine.dir, t = cine.target, W = cine.W
  const tx = ctrX(t), ty = t.y + (t.h || 100) * 0.45, floor = cine.floorT + (t.h || 100)
  const bound = x => Math.max(PILE.margin + PILE.w / 2, Math.min(sw(W) - PILE.margin - PILE.w / 2, x))
  const piles = ULT.piles.map((P, i) => {
    if (fr < P.rise || fr >= P.hit) return null
    const sx = bound(tx + (i ? -d : d) * 90), restY = t.y - 34 - i * 10
    if (fr < P.throw) { const u = Math.min(1, (fr - P.rise) / 16), e = u * u * (3 - 2 * u); return { x: sx, y: floor + (restY - floor) * e, glow: 0 } }
    const u = (fr - P.throw) / (P.hit - P.throw); return { x: sx + (tx - sx) * u, y: restY + (ty - restY) * u, glow: 1 }
  }).filter(Boolean)
  const debris = ULT.piles.map(P => fr - P.hit).filter(k => k >= 0 && k < 24).map(k => ({ x: tx, y: ty + 20, k }))
  return { frame: fr, cutIn: fr < ULT.cutIn ? fr / ULT.cutIn : null, piles, debris,
    release: fr >= 180 && fr < 209 ? { x: tx, y: ty, k: fr - 180 } : null, charge: fr >= 164 && fr < 180 ? (fr - 164) / 16 : null }
}
