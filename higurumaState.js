// Hiromi Higuruma (higuruma) — SIMULATION state. Plain JSON on f._higuruma (snapshotted for replay / LAN), sim ticks
// only: no RNG, no wall clock. Every export is a no-op for any other rosterKey.
//
// CASE FILE   s.caseFile = { close, reach, weight }   one mark per category per case, CLEAN confirmed hit only
// PRECEDENT   s.token ∈ {0,1}                         granted when all three marks are set; collection pauses while held
//             s.pdLock                                 a Precedent cancel happened this combo (released when the foe
//                                                      leaves hitstun / knockdown) — at most one cancel per combo
//             s.pdSerial                               serial of the attack the token cancelled: its surplus contacts
//                                                      never mark the fresh case
// OBJECTION   a.hg.counter phase on the live hObj move; absorbHiguruma (combat.js) converts ONE frontal strike
// No entities: Higuruma spawns no projectiles; the ultimate's shockwave / sword glow / text are presentation in s.fx.
import { higuruma as HG_CHAR, HIGURUMA_MOVES, CASE, OBJECTION, ULT, PRECEDENT_FROM, SCALE, dmg } from './higurumaData.js'

export const isHiguruma = f => f?.rosterKey === 'higuruma'
const fresh0 = () => ({ tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  wasGround: true, airRise: false, prevJc: 0, prevFacing: 0,
  caseFile: { close: false, reach: false, weight: false }, token: 0, pdLock: false, pdSerial: -1,
  match: { close: 0, reach: 0, weight: 0 },          // marks earned this match (CASE REVIEW panel; presentation)
  fx: [],
  stats: { marks: 0, tokens: 0, precedents: 0, pdRefused: 0, objections: 0, counters: 0, objWhiffs: 0, ext: 0, cross: 0, crossHits: 0,
    rises: 0, orders: 0, rejects: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0, dj: 0 },
  cues: [] })
export const hgState = f => f._higuruma ||= fresh0()

const E = { startMove: null, comboScale: null }
export function registerHigurumaEngine(o) { Object.assign(E, o) }
const cue = (f, c) => hgState(f).cues.push(c)
const ultTargets = new WeakMap()
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.hg) ? f.currentAttack : null
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
function pushFx(s, kind, x, y, dir = 1, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), dir, t: 0, ...(extra || {}) }); if (s.fx.length > 10) s.fx.shift() }
function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }

export function clearHiguruma(f) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearHigurumaUlt()
  if (live(f)) endAttack(f)
  delete f._higuruma; delete f._higurumaRemoteInput; delete f._hgPose; delete f._hgPoseT
}

// ── Movement lock (game.js updateMovementInput) ──
// Committed moves own the body (a double-tap dash is swallowed, not buffered) — EXCEPT the one Precedent cancel:
// a fresh double-tap (`_dashTap`, set by the shared double-tap detector, keyboard / pad / replay / LAN alike) during
// the late-recovery window of a CLEAN, CONFIRMED gavel attack while a token is stored ends the attack and leaves
// `_dashTap` set, so the shared physics performs its ORDINARY dash this same frame. The launcher stays free for its
// jump-cancel. Up held with Special belongs to Rising Objection (never a jump).
export function precedentWindow(f) {
  const a = live(f); if (!a) return false
  const m = a.hg, md = HIGURUMA_MOVES[m.key]
  if (!PRECEDENT_FROM.includes(m.key) || !m.clean || m.blocked) return false
  const rec = a.total - a.activeEnd - 1, t = elapsed(a)
  return t > a.activeEnd + Math.ceil(rec * CASE.lateFrac) && t < a.total && md
}
export function higurumaLocked(f, raw = null) {
  if (!isHiguruma(f)) return false
  if (isHigurumaUltActive()) return true
  const s = hgState(f), a = f.attacking ? f.currentAttack : null
  if (a && a.hg && f._dashTap) {
    if (s.token > 0 && !s.pdLock && grounded(f) && !(f.dashCooldown > 0) && precedentWindow(f)) {
      s.token = 0; s.pdLock = true; s.pdSerial = a.hg.serial; s.stats.precedents++
      s.caseFile = { close: false, reach: false, weight: false }                  // the case is closed; a fresh one opens
      pushFx(s, 'precedent', ctrX(f), f.y - 8, f.facing || 1); cue(f, 'precedent')
      endAttack(f, 0)
      return false                                                               // _dashTap intact → the ordinary dash
    }
    if (s.token > 0 && a.hg.clean) s.stats.pdRefused++
  }
  if (a && !(a.launcher && a.hasHit)) { f._dashTap = false; return true }
  if (raw && raw.special && raw.up && grounded(f)) return true
  return false
}

// Start one of Higuruma's moves through combat.startMove (frameExact path) and attach the descriptor `hg`.
// Every legality / resource check happens BEFORE anything is spent.
export function startHgMove(f, key, W, { cancel = false } = {}) {
  if (!isHiguruma(f)) return false
  const s = hgState(f), md = HIGURUMA_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  const airOnly = ['air'], either = ['hRise']
  if (!airOnly.includes(key) && !either.includes(key) && !g) return false
  if (airOnly.includes(key) && g) return false
  if (key === 'hRise' && !g && s.airRise) { reject(f); return false }       // once per airtime
  const cost = md.cost || 0
  if ((f.energy || 0) < cost) { reject(f); return false }
  if (cancel) endAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  const a = f.currentAttack
  a.hg = { key, dir: f.facing || 1, clean: false, blocked: false, serial: ++s.serial, hits: [], counter: md.counter ? 'window' : null }
  a.hasHit = !!md.noBody || !!md.hits
  f.isBlocking = false; f.isCharging = false
  if (g) f.vx = 0
  if (key === 'up' || key === 'hRise') f.jumpHeld = true
  if (key === 'hRise') { if (!g) s.airRise = true; s.stats.rises++; cue(f, 'rise') }
  else if (key === 'hExt') { s.stats.ext++; cue(f, 'extend') }
  else if (key === 'hCross') { s.stats.cross++; cue(f, 'cross') }
  else if (key === 'hOrder') { s.stats.orders++; cue(f, 'giantWind') }
  else if (key === 'hObj') { s.stats.objections++; cue(f, 'objection') }
  else if (key === 'ultOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  else cue(f, md.scale === 'weight' ? 'giantWind' : md.scale === 'reach' ? 'extend' : 'swing')
  return true
}
function reject(f) { const s = hgState(f); s.stats.rejects++; cue(f, 'reject') }

// ── combat.js hooks (higuruma-gated) ──
export function higurumaHitbox(f) {
  const a = f.currentAttack, m = a?.hg, md = HIGURUMA_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  const [x0, x1, top, bot] = md.box, cx = ctrX(f), feet = (f.y || 0) + (f.h || 94)
  const w = (x1 - x0) * SCALE
  return { x: m.dir === 1 ? cx + x0 * SCALE : cx - x1 * SCALE, y: feet + top * SCALE, w, h: (bot - top) * SCALE }
}
export function higurumaBlock(f, d, a) {
  if (!isHiguruma(f) || !a?.hg) return
  const md = HIGURUMA_MOVES[a.hg.key]
  d.blockstun = md.blockstun; a.hg.blocked = true
  if (md.hits) markWindow(a)
}
function markWindow(a) {
  const md = HIGURUMA_MOVES[a.hg.key], t = elapsed(a)
  const w = md.hits.find(([from, to]) => t >= from && t <= to)
  if (w && !a.hg.hits.includes(w[2])) a.hg.hits.push(w[2])
  return w
}
// A clean confirmed hit on an OPPOSING FIGHTER (combat.js resolveAttackHit, after guard / armor resolution).
export function higurumaHit(f, d, a, { armored = false } = {}) {
  if (!isHiguruma(f) || !a?.hg) return
  const md = HIGURUMA_MOVES[a.hg.key], s = hgState(f)
  if (md.hits) { const w = markWindow(a); if (w && a.hg.key === 'hCross') s.stats.crossHits++ }
  if (armored || a.hg.blocked || d?.isBlocking) return            // armor-absorbed / guarded: no evidence, no confirm
  a.hg.clean = true; f._cmdHitLanded = true
  if (md.scale) markCase(f, s, md.scale, a.hg.serial)
  if (a.hg.key === 'ultOpen' && d.health > 0) { a.hg.ultHit = true; ultTargets.set(f, d) }
}
function markCase(f, s, cat, serial) {
  if (s.token > 0 || serial === s.pdSerial || s.caseFile[cat]) return   // held token pauses collection; no surplus refill
  s.caseFile[cat] = true; s.match[cat]++; s.stats.marks++
  pushFx(s, 'mark', ctrX(f), f.y - 20, f.facing || 1, { cat }); cue(f, 'mark')
  if (CASE.categories.every(k => s.caseFile[k])) {
    s.token = Math.min(CASE.maxTokens, s.token + 1); s.stats.tokens++
    pushFx(s, 'token', ctrX(f), f.y - 30); cue(f, 'token')
  }
}
// OBJECTION counter: one frontal, non-grab, non-projectile strike during the window is absorbed and answered with
// ONE supplied gavel strike (hObjHit). Ultimates, cinematics, unblockables, grabs and projectiles bypass it.
export function absorbHiguruma(f, source, attack) {
  if (!isHiguruma(f) || !attack) return false
  const a = live(f); if (!a || a.hg.key !== 'hObj' || a.hg.counter !== 'window') return false
  const t = elapsed(a)
  if (t < OBJECTION.windowFrom || t > OBJECTION.windowTo) return false
  if (attack.isUltimate || attack.isCinematic || attack.cinematic || attack.unblockable || attack.damageType === 'grab' || attack.category === 'grab' || !(attack.damage > 0)) return false
  const dir = a.hg.dir, sx = ctrX(source || {})
  if (!Number.isFinite(sx) || (sx - ctrX(f)) * dir < 0) return false            // from behind: not a frontal strike
  a.hg.counter = 'caught'
  const s = hgState(f); s.stats.counters++
  pushFx(s, 'objection', ctrX(f) + dir * 30, f.y + 20, dir); cue(f, 'counter')
  return true
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickHiguruma(f, opp, raw, W) {
  if (!isHiguruma(f)) { if (f?._higuruma) clearHiguruma(f); return }
  // Round/match reset: the shared revertGoku stamps speed 84 / dash 16 on every fighter after our clear; the first
  // tick of a fresh state re-applies the authored stats over that exact stamp (match modifiers are kept).
  if (!f._higuruma && f.baseSpeed === 84 && f.dashSpeed === 16) { const st = HG_CHAR.stats; f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed }
  const s = hgState(f); s.tick++
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'charge']) {
    const v = !!raw[k]
    if (v && !s.prev[k] && k !== 'up') s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    s.prev[k] = v
  }
  if ((raw.up || raw.jump) && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up && !raw.jump) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  const g = grounded(f), a = live(f)
  if (g && !s.wasGround) {
    s.airRise = false
    if (!f.attacking && !(f.hitstun > 0)) { f._hgPose = 'land'; f._hgPoseT = 9 }
  }
  if (g && !a) s.airRise = false
  // facing transition: the supplied front-facing upright cell for a few frames when he turns while standing / walking
  const fc = f.facing || 1
  if (s.prevFacing && fc !== s.prevFacing && g && !f.attacking && !(f.hitstun > 0) && !f.isBlocking) { f._hgPose = 'turn'; f._hgPoseT = 5 }
  s.prevFacing = fc
  if (f._hgPoseT > 0 && --f._hgPoseT === 0) f._hgPose = null
  if (f.hitstun > 0 || f.attacking || !g) { if (f._hgPose) { f._hgPose = null; f._hgPoseT = 0 } }
  const jc = f.jumpCount || 0; if (!g && jc >= 2 && s.prevJc < 2) { s.stats.dj++; cue(f, 'doubleJump') } ; s.prevJc = g ? 0 : jc
  s.wasGround = g
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 40) s.fx.splice(i, 1)
  // one Precedent per combo: released once every foe is out of hitstun / knockdown
  if (s.pdLock && foesOf(f, W, opp).every(o => !(o.hitstun > 0) && !o.knockdownState)) s.pdLock = false
  if (f.health <= 0) return
  if (f.hitstop > 0) return
  s.clock++
  if (a && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) { endAttack(f); return }   // a hit ends the live move
  const m = a?.hg
  if (!m) return
  const t = elapsed(a), md = HIGURUMA_MOVES[m.key]
  f.facing = m.dir
  const clampX = x => Math.max(0, Math.min(sw(W) - f.w, x))
  const noPass = (x, dir) => {
    for (const o of foesOf(f, W, opp)) {
      if (Math.abs((o.y + o.h) - (f.y + f.h)) > (o.h || 94)) continue
      if (dir > 0 && f.x + f.w <= o.x + 1) x = Math.min(x, o.x - f.w)
      if (dir < 0 && f.x >= o.x + o.w - 1) x = Math.max(x, o.x + o.w)
    }
    return x
  }
  if (md.hits) {
    const w = md.hits.find(([from, to]) => t >= from && t <= to)
    a.hasHit = !w || m.hits.includes(w[2])
    if (w && !a.hasHit) {
      a.damage = dmg(md.hitRaw[w[2]])
      const last = w[2] === md.hits[md.hits.length - 1][2]
      a.pushX = last ? md.finalKb[0] : md.knockbackX; a.launchY = last ? md.finalKb[1] : md.knockbackY
    }
  }
  if (md.travel && t >= md.travel[0] && t < md.travel[1] && g) { f.x = noPass(clampX(f.x + m.dir * md.travel[2]), m.dir); f.vx = 0 }
  else if (g && m.key !== 'up' && m.key !== 'hRise') f.vx = 0
  switch (m.key) {
    case 'hRise': {
      const R = md.rise
      if (t === R.at) { f.vy = R.vy; f.vx = m.dir * R.vx; f.onGround = false; f.grounded = false; f.jumpCount = Math.max(f.jumpCount || 0, 1); s.airRise = true }
      if (t > R.at + 2 && g) { endAttack(f, 8); cue(f, 'land') }
      break
    }
    case 'hOrder': if (t === md.startup) { pushFx(s, 'shock', ctrX(f) + m.dir * 70, (f.y || 0) + (f.h || 94), m.dir); cue(f, 'slam') } break
    case 'heavy': case 'hSweep': if (t === md.startup) cue(f, 'giantHit'); break
    case 'hObj':
      if (m.counter === 'caught') {
        // the answer: ONE supplied gavel strike (fresh move; the counter is spent, nothing loops)
        m.counter = 'done'; endAttack(f)
        if (E.startMove(f, 'hObjHit', HIGURUMA_MOVES.hObjHit)) {
          f.currentMove = 'hObjHit'
          f.currentAttack.hg = { key: 'hObjHit', dir: m.dir, clean: false, blocked: false, serial: ++s.serial, hits: [], counter: null }
        }
      } else if (t === OBJECTION.windowTo + 1) { s.stats.objWhiffs++; cue(f, 'objWhiff') }
      break
    case 'ultOpen':
      if (m.clean && m.ultHit && !m.ultStarted) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateHigurumaUlt(f, tg, W) }
      if (t === a.activeEnd + 1 && !m.clean) { s.stats.ultWhiffs++; cue(f, 'ultMiss') }
      break
    case 'air': if (g && t > 2) endAttack(f, 4); break
  }
}

// ══ ULTIMATE — DOMAIN EXPANSION: DEADLY SENTENCING ═════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (same as Robin / Raven / the Rangers): activate / isActive / update / clear.
// While active game.js freezes combat, physics and input and calls updateHigurumaUlt() each frame. Damage = the two
// scheduled contacts through W.damage with the combo scale captured at confirm. Nothing is spawned; nothing is taken
// from the target (CONFISCATION is a caption), and every field it touches is restored on exit / clear.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1, review: null }
export const isHigurumaUltActive = () => cine.active
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, hg: null, _ultPose: true }
}
export function activateHigurumaUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = hgState(f)
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: target.y,
    cx0: f.x, tx0: target.x, dir: f.facing || 1, done: 0, scale: E.comboScale?.(f) ?? 1,
    review: { close: s.match.close, reach: s.match.reach, weight: s.match.weight } })
  s.ult = { frame: 0, done: 0 }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  cue(f, 'ultConfirm')
  return true
}
function ultHit(i) {
  const c = ULT.contacts[i], t = cine.target, f = cine.caster
  cine.done = i + 1; if (f._higuruma?.ult) f._higuruma.ult.done = cine.done
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  cue(f, c.kind === 'sword' ? 'swordHit' : 'verdict')
}
export function updateHigurumaUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, d = cine.dir, s = f?._higuruma
  if (!f || !t || !s) return clearHigurumaUlt()
  const k = cine.frame
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  if (k === 0) cue(f, 'domain')
  if (k === 100) cue(f, 'confiscate')
  if (k === 130) cue(f, 'giantWind')
  if (k === 170) cue(f, 'sword')
  if (!(t.health > 0) && k < 230 && k > ULT.contacts[ULT.contacts.length - 1].at) cine.frame = 230
  const fr = cine.frame
  let beat = ULT.beats[0]; for (const b of ULT.beats) if (fr >= b.from) beat = b
  pose(f, beat.pose, fr - beat.from)
  const W = cine.W, clampX = (o, x) => Math.max(0, Math.min(sw(W) - (o.w || 48), x))
  const near = clampX(f, cine.tx0 - d * ((f.w || 48) + 10))            // the defendant's near side — never through it
  f.y = cine.floorC
  if (fr < 196) f.x = clampX(f, cine.cx0)
  else if (fr < 208) { const u = (fr - 196) / 12; f.x = cine.cx0 + (near - cine.cx0) * u }   // the sword lunge
  else if (fr < 230) f.x = near
  else { const u = Math.min(1, (fr - 230) / 16), back = clampX(f, near - d * 70); f.x = near + (back - near) * u }
  t.x = clampX(t, cine.tx0); t.y = cine.floorT; t.vx = 0; t.vy = 0; t.isBlocking = false
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 40) s.fx.splice(i, 1)
  if (s.ult) s.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { endAttack(f, 12); f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._higuruma; if (s) { s.stats.ultDone++; delete s.ult } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, review: null })
}
// Every reset path (round reset, rematch, KO teardown, training reset, scene exit, identity replacement).
export function clearHigurumaUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { endAttack(f); f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._higuruma) delete f._higuruma.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, review: null })
}
export const getHigurumaUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
export function higurumaUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  let beat = ULT.beats[0]; for (const b of ULT.beats) if (cine.frame >= b.from) beat = b
  return { frame: cine.frame, beat: beat.text, done: cine.done, review: cine.review, target: cine.target, caster: cine.caster }
}
export const higurumaActiveUltView = () => cine.active ? higurumaUltView(cine.caster) : null
