// S.P.D. Yellow (spd_yellow) — SIMULATION state. Plain JSON on f._spdYellow (+ f._falcon via the shared falconzord.js
// scheduler and f._ranger via rangers.js). Sim ticks only, no RNG, no wall clock. Every export is a no-op for any other
// rosterKey. game.js pushes f._spdYellow / f._falcon / f.currentAttack into the replay checkpoint snapshot.
//
// Systems (one owner each, no duplicate resources / parsers):
//   FIREARMS   one Neutral-Special hold -> pistol (tap) or long gun (held past the paid draw threshold); air pistol.
//   DUPLICATE  ONE ordinary clone (f._spdYellow.clone): echo (recorded normal), swap, relay, Partner Break, Cover Me.
//   COINS      three-category cycle -> max 3 Tactical Coins; command stance orders (Cover Me / Crosswire / Breach /
//              Rising Kick / Showcase toggle).
//   ZORD       Ninja Megazord sorties on the shared falconzord.js engine (Intercept / Rising Kick / Sword Finish).
//   ULTIMATE   Duplicate Raid: Ninja Crossbreaker (the established frozen-cinematic contract).
import { SPD_YELLOW_MOVES, SPD_YELLOW_DAMAGE_SCALE, GUN, MUZZLE, CLONE, COINS, STANCE, ORDERS, BREACH, ZORD_RESOURCE, ZORD_KIND, ULT, dmg } from './spdYellowData.js'
import { tickRanger, clearRanger } from './rangers.js'
import { falconState, clearFalcon, retireSortie, falconCanCall, falconPay, falconCancelCall, falconCommit, tickFalcon, FALCON_SORTIES } from './falconzord.js'

export const isSpdYellow = f => f?.rosterKey === 'spd_yellow'
const freshState = () => ({ tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0,
  gun: null, airShotUsed: false, shots: 0, recorded: null,
  clone: null, cloneN: 0, cloneCd: 0, swapCd: 0, echoCd: 0, relay: null, brk: null, relayUsed: false, breakUsed: false,
  coins: 0, cycle: { melee: false, gun: false, clone: false }, cycleReset: 0, panelSel: 0, stance: null,
  breach: null, breachConfirm: null, breachUsed: false, showcase: false, assistLaunchUsed: false, reject: 0, rejectWhy: null,
  stats: { pistol: 0, long: 0, air: 0, longCommit: 0, longFail: 0, gunInterrupted: 0, clones: 0, cloneExpired: 0, clonePopped: 0,
    echoes: 0, echoHits: 0, swaps: 0, relays: 0, breaks: 0, coinsEarned: 0, coinsCapped: 0, coinsSpent: 0, cycleResets: 0,
    award: { melee: 0, gun: 0, clone: 0 }, orders: { cover: 0, crosswire: 0, breach: 0, rising: 0, showcase: 0 }, orderRejects: 0,
    stanceOpens: 0, stanceCancels: 0, breachConfirms: 0, swords: 0, intercepts: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0, showcases: 0, rejects: 0 },
  cues: [] })
export const spdYellowState = f => f._spdYellow ||= freshState()

// Engine helpers handed in by spdYellow.js (avoids a combat.js <-> spdYellowState import cycle).
const E = { startMove: null, comboScale: null, hitstunScale: null, hitstop: null }
export function registerSpdYellowEngine(o) { Object.assign(E, o) }
const cue = (f, c) => spdYellowState(f).cues.push(c)
const ultTargets = new WeakMap()   // caster -> the fighter its opening shot hit (never serialized)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const feetY = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const overlap = (a, b) => a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const hurt = f => ({ x: f.x || 0, y: f.y || 0, w: f.w || 48, h: f.h || 94 })
const scaleOf = f => f.spriteScale || 2.05

const zordWorld = W => ({ stageWidth: W?.stageWidth, fighters: W?.fighters, spawn: W?.spawn, projectiles: W?.projectiles, damage: W?.damage,
  comboScale: f => E.comboScale?.(f) ?? 1, hitstunScale: f => E.hitstunScale?.(f) ?? 1, hitstop: (a, d, n) => E.hitstop?.(a, d, n) })
const rangerWorld = W => W && { stageWidth: W.stageWidth, frame: W.frame, seed: W.seed, attackBox: W.attackBox, projectiles: W.projectileRects }
const zordCb = {
  launchAllowed: f => !spdYellowState(f).assistLaunchUsed,   // one assist / echo launcher per combo (shared juggle rules on top)
  onLaunch: f => { spdYellowState(f).assistLaunchUsed = true },
}
export const yellowShots = (f, W, kinds = null) => (W?.projectiles || []).filter(p => p?.owner === f && p._yellow && (!kinds || kinds.includes(p._yellow.kind)))

export function clearSpdYellow(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearSpdYellowUlt()
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._yellow) W.projectiles.splice(i, 1)
  const had = !!f._spdYellow
  delete f._spdYellow; delete f._spdYellowRemoteInput
  clearFalcon(f, W)
  if (isSpdYellow(f) || had) clearRanger(f)
}

// Movement lock (game.js updateMovementInput). Up held WITH Special belongs to Ninja Intercept (never also a jump); a fresh
// grounded Up holds the jump UP_GRACE frames (same rule as White / Black / MMPR Pink). The command stance owns all input.
export const UP_GRACE = 3
const upGraceHold = (f, raw) => !!(raw?.up && !f.attacking && grounded(f) && (f._spdYellow?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export const spdYellowLocked = (f, raw = null) => isSpdYellow(f) && (!!f._ranger?.blink || (f.attacking && !f.currentAttack?.launcher) ||
  !!f._spdYellow?.stance || !!(raw ? raw.special && raw.up : f._spdYellow?.ownsUp) || upGraceHold(f, raw) || isSpdYellowUltActive())

// Rejected order / shot: feedback only. Nothing is spent, nothing is queued.
export function reject(f, why) {
  const s = spdYellowState(f); s.reject = 24; s.rejectWhy = why; s.stats.rejects++; cue(f, 'reject')
  return false
}

const STRIP = { yGun: 'yPistol', yUltOpen: 'yPistol' }
// Start one of Z's moves through combat.startMove (frameExact path) and attach the per-move descriptor `my`.
export function startYellowMove(f, key, W, { cancel = false, extra = null } = {}) {
  if (!isSpdYellow(f)) return false
  const s = spdYellowState(f), md = SPD_YELLOW_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState || f._ranger?.blink || isSpdYellowUltActive()) return false
  const cost = extra?.free ? 0 : (md.cost || 0)
  if ((f.energy || 0) < cost) return reject(f, 'energy')
  if (md.isSpecial && ((f.disabledSpecials || []).includes('special') || f._gaDisabled > 0)) return false
  const airOnly = key === 'yAirShot' || key === 'yFlip' || key === 'air' || key === 'down_air'
  if (airOnly ? g : (!g && (md.isSpecial || md.isUltimate || ['yLow', 'yAcro', 'ySweep', 'yBreak', 'light', 'yJ2', 'yJ3', 'heavy', 'up'].includes(key)))) return false
  if (key === 'yAirShot' && s.airShotUsed) return reject(f, 'air')
  if ((key === 'yGun' || key === 'yAirShot') && yellowShots(f, W, ['pistol', 'air']).length) return reject(f, 'shot')   // one ordinary pistol shot per owner
  if (key === 'yClone' && (s.clone || s.cloneCd > 0)) return reject(f, s.clone ? 'clone' : 'cooldown')
  if (key === 'ySwap' && !swapLegal(f, s, W)) return reject(f, 'swap')
  if (key === 'yCall' && !falconCanCall(f, extra?.kind, f.energy, ZORD_RESOURCE)) return reject(f, 'zord')
  if (cancel) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!E.startMove || !E.startMove(f, key, md)) return false
  let spend = cost
  if (key === 'yCall') spend = falconPay(f, extra.kind, ZORD_RESOURCE)
  f.energy = Math.max(0, (f.energy || 0) - spend); f.currentMove = STRIP[key] || key
  f.currentAttack.my = { key, dir: f.facing || 1, origin: f.x, clean: false, blocked: false, serial: ++s.serial, coin: false,
    kind: extra?.kind || null, crosswire: !!extra?.crosswire, groundStart: g }
  f.currentAttack.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; if (g) f.vx = 0
  if (key === 'up') f.jumpHeld = true
  if (md.echo) s.recorded = key                                              // the ECHO records Z's last grounded melee normal
  if (key === 'yGun') { s.gun = { serial: s.serial, start: s.clock, held: true, committed: false, failed: false, fired: null, breach: false }; cue(f, 'draw') }
  else if (key === 'yAirShot') { s.airShotUsed = true; s.gun = { serial: s.serial, start: s.clock, held: false, committed: false, failed: false, fired: null, air: true } }
  else if (key === 'yClone') { s.stats.clones++; cue(f, 'split') }
  else if (key === 'ySwap') { s.swapCd = CLONE.swapCooldown; cue(f, 'swapGo') }
  else if (key === 'yCall') { cue(f, 'call'); if (extra.kind === ZORD_KIND.sword) { f.currentAttack.total += 10; f.currentAttack.timer += 10 } }   // Sword Finish: longer visible commitment
  else if (key === 'yUltOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  else if (key === 'yStance') { /* opened by openStance */ }
  else cue(f, md.damageType === 'slash' ? 'blade' : 'swing')
  return true
}

// ── combat.js hooks (spd_yellow-gated) ──
export function spdYellowHitbox(f) {
  const a = f.currentAttack, m = a?.my, md = SPD_YELLOW_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 14), w: a.rangeX, h: a.rangeY }
}
export function spdYellowBlock(f, d, a) {
  if (!isSpdYellow(f) || !a?.my) return
  d.blockstun = SPD_YELLOW_MOVES[a.my.key].blockstun; a.my.blocked = true
}
export function spdYellowHit(f, d, a, { armored = false } = {}) {
  if (!isSpdYellow(f) || !a?.my || armored) return   // armor-absorbed: no clean flag, no coin credit
  a.my.clean = true; f._cmdHitLanded = true
  const md = SPD_YELLOW_MOVES[a.my.key]
  if (md.melee && !a.my.coin && !a.my.blocked) { a.my.coin = true; award(f, 'melee') }   // once per attack INSTANCE
}
// combat.js projectile hook: one of Z's shots connected. Clean = not blocked, not armored, target actually in hitstun.
export function spdYellowProjectileHit(proj, target, { armored = false } = {}) {
  const f = proj?.owner, k = proj?._yellow
  if (!k || !isSpdYellow(f) || !target) return
  const s = spdYellowState(f), clean = !target.isBlocking && !armored && (target.hitstun || 0) > 0
  if (k.kind === 'ult') {
    if (clean && target.health > 0) { ultTargets.set(f, target); s.ultHit = true }
    else cue(f, 'ultMiss')
    return
  }
  if (!clean) { cue(f, 'shotBlocked'); return }
  cue(f, k.kind === 'long' ? 'longHit' : 'shotHit')
  if (!k.coin && (k.kind === 'pistol' || k.kind === 'long' || k.kind === 'air')) award(f, 'gun')
  // BREACH WINDOW: the armed long gun connected cleanly -> 10 f to request the Sword Finish (once per combo)
  if (k.kind === 'long' && k.breach && !s.breachUsed && target.health > 0) { s.breachConfirm = { t: BREACH.confirm }; s.stats.breachConfirms++; cue(f, 'breachOpen') }
}

// ══ TACTICAL COINS ═══════════════════════════════════════════════════════════════════════════════════════════════
export function award(f, cat) {
  const s = spdYellowState(f)
  if (!COINS.cats.includes(cat) || s.cycle[cat] || isSpdYellowUltActive()) return false
  s.cycle[cat] = true; s.stats.award[cat]++
  if (s.coins < COINS.max) { s.coins++; s.stats.coinsEarned++; cue(f, 'coinEarn') } else { s.stats.coinsCapped++; cue(f, 'coinCap') }
  if (COINS.cats.every(c => s.cycle[c])) s.cycleReset = COINS.resetAfter
  return true
}
function spendCoins(f, s, n) { s.coins -= n; s.stats.coinsSpent += n; if (n) cue(f, 'coinSpend') }

// ══ FIREARMS ═════════════════════════════════════════════════════════════════════════════════════════════════════
function muzzlePoint(f, frame) {
  const m = MUZZLE[frame] || MUZZLE.aim1, S = scaleOf(f), d = f.facing || 1
  return { x: ctrX(f) + d * m[0] * S, y: feetY(f) + m[1] * S }
}
function spawnShot(owner, W, P, kind, at, dir, extra = {}) {
  const s = spdYellowState(owner)
  const long = kind === 'long'
  const pr = W?.spawn?.(owner, long ? 'yellow_long' : 'yellow_pistol', { damage: dmg(P.raw), speed: P.speed, vx: dir * P.speed, vy: 0,
    spawnX: at.x, spawnY: at.y, w: P.radius * 2, h: P.radius * 2, radius: P.radius, lifetime: P.lifetime, hitstun: P.hitstun,
    knockbackX: P.knockbackX, knockbackY: P.knockbackY, isSpecial: true, category: kind === 'ult' ? 'ultimate' : 'special',
    sheet: long ? './assets/spd_yellow/fx_beam2.png' : './assets/spd_yellow/fx_beam1.png', spriteFrames: 1,
    spriteW: long ? 66 : 64, spriteH: long ? 3 : 4, spriteScale: long ? 1.8 : 1.3, color: '#fff6a0' })
  if (pr) { pr.damageType = 'energy'; pr.isUltimate = kind === 'ult'; pr._yellow = { kind, n: ++s.shots, coin: !!extra.coin, breach: !!extra.breach, clone: !!extra.clone }; pr._yellowMaxX = sw(W) }
  s.lastMuzzle = { x: Math.round(at.x), y: Math.round(at.y), dir, kind, t: 6 }   // render-only muzzle star (read by Fx)
  return pr
}
// The neutral-Special hold. t = frames since acceptance (this tick).
function tickGun(f, s, a, t, raw, W) {
  const g = s.gun; if (!g || g.fired) return
  if (g.air) {   // air pistol: fires on frame 10, no hold, no hover (gravity untouched)
    if (t >= SPD_YELLOW_MOVES.yAirShot.startup) { g.fired = 'air'; fireNow(f, s, a, W, 'air') }
    return
  }
  if (!raw.special) g.held = false
  const age = s.clock - g.start
  // DRAW THRESHOLD: checked ONCE at 24 held frames. Paid -> the long gun is committed (pose -> yLongHold).
  if (g.held && !g.checked && age >= GUN.drawAt) {
    g.checked = true
    if ((f.energy || 0) >= GUN.longCost) {
      f.energy -= GUN.longCost; g.committed = true; s.stats.longCommit++; f.currentMove = 'yLongHold'; cue(f, 'longDraw')
      if (s.breach) { g.breach = true; s.breach = null; cue(f, 'breachArmed') }   // the Breach buff is consumed as the long gun starts
    } else { g.failed = true; s.stats.longFail++; cue(f, 'longFail') }
  }
  const capped = age >= GUN.cap
  if (t < GUN.release) return                                              // nothing leaves before frame 12
  // HOLD: Special still held (and not capped), or a committed long gun waiting for its 30 f minimum brace. The elapsed
  // time is pinned on frame 12 so the move never ends underneath the hold; `age` (sim clock) keeps counting.
  if ((g.held && !capped) || (g.committed && age < GUN.longMin)) { a.timer = a.total - GUN.release; return }
  const kind = g.committed ? 'long' : 'pistol'
  g.fired = kind
  fireNow(f, s, a, W, kind)
}
function fireNow(f, s, a, W, kind) {
  const P = GUN[kind], d = f.facing || 1
  const at = muzzlePoint(f, kind === 'long' ? 'fire2' : kind === 'air' ? 'airAim0' : 'aim1')
  spawnShot(f, W, P, kind, at, d, { breach: kind === 'long' && s.gun.breach, coin: kind === 'long' && s.gun.breach })
  s.stats[kind]++
  const rec = P.recovery
  a.total = rec + 1; a.timer = rec + 1; a.activeStart = 9999; a.activeEnd = 9999   // elapsed restarts at 0 on the shot strip
  a.my.firedKind = kind
  if (kind !== 'air') f.currentMove = kind === 'long' ? 'yLongShot' : 'yPistolShot'
  cue(f, kind === 'long' ? 'longFire' : 'pistolFire')
}

// ══ DUPLICATE ════════════════════════════════════════════════════════════════════════════════════════════════════
const cloneHurt = (f, c) => ({ x: c.x - (f.w || 48) / 2, y: c.feet - (f.h || 94), w: f.w || 48, h: f.h || 94 })
export const cloneIdle = s => !!(s.clone && !s.clone.act && s.clone.ready)
function swapLegal(f, s, W) {
  const c = s.clone
  return !!(c && c.ready && !c.act && s.swapCd <= 0 && grounded(f) && Math.abs(c.x - ctrX(f)) <= CLONE.swapMax)
}
export const canSwap = f => swapLegal(f, spdYellowState(f), null)
function spawnClone(f, s, W, opp) {
  const d = f.facing || 1, half = (f.w || 48) / 2
  const x = Math.max(half, Math.min(sw(W) - half, ctrX(f) - d * CLONE.offset))
  s.clone = { n: ++s.cloneN, x: Math.round(x), feet: Math.round(feetY(f)), dir: d, life: CLONE.life, ready: true, act: null, age: 0 }
  cue(f, 'cloneIn')
}
export function disperseClone(f, why = 'retire') {
  const s = f?._spdYellow; if (!s?.clone) return false
  s.lastClone = { x: s.clone.x, feet: s.clone.feet, dir: s.clone.dir, why, t: 12 }   // render-only fade (pure read)
  s.clone = null; s.cloneCd = CLONE.cooldown; s.relay = null; s.brk = null
  if (why === 'popped') s.stats.clonePopped++; else if (why === 'expired') s.stats.cloneExpired++
  cue(f, why === 'popped' ? 'clonePop' : 'cloneOut')
  return true
}
// ECHO: the clone repeats the RECORDED normal once (ordinary = Back+Special; Crosswire passes coin:true).
export function orderEcho(f, W, { coin = false, free = false } = {}) {
  const s = spdYellowState(f)
  if (!cloneIdle(s)) return reject(f, 'clone')
  if (!s.recorded) return reject(f, 'record')
  if (!coin && s.echoCd > 0) return reject(f, 'cooldown')
  if (!free && (f.energy || 0) < CLONE.echoCost) return reject(f, 'energy')
  if (!free) f.energy -= CLONE.echoCost
  const md = SPD_YELLOW_MOVES[s.recorded]
  s.clone.act = { kind: 'echo', key: s.recorded, t: 0, start: md.startup + CLONE.echoLead, active: md.active, total: md.startup + CLONE.echoLead + md.active + md.recovery,
    hit: false, coin, dir: s.clone.dir }
  s.echoCd = CLONE.echoCooldown; s.stats.echoes++; cue(f, 'echo')
  return true
}
function cloneStrike(f, t, act, W) {
  if (!t || t === f || !(t.health > 0) || (t.invulnTimer || 0) > 0 || t.knockdownState || t.isGrabbed) return null
  if (f.team && t.team && f.team === t.team) return null
  const md = SPD_YELLOW_MOVES[act.key], raw = Math.round(md.raw * CLONE.echoScale), dir = act.dir
  if (t.isBlocking) {   // ordinary block: 12 % chip (the falconzord.js assist rule), the move's authored blockstun
    t.blockstun = Math.max(t.blockstun || 0, md.blockstun || 12); t.vx = dir * 2
    W?.damage?.(t, dmg(raw) * 0.12, { source: 'assist', attacker: f, move: 'yellow_echo' })
    f.comboCounter = 0
    return 'blocked'
  }
  W?.damage?.(t, dmg(raw) * (E.comboScale?.(f) ?? 1), { source: 'assist', attacker: f, move: 'yellow_echo' })
  if (!t.onGround && !t.grounded) t.juggleCount = (t.juggleCount || 0) + 1
  t.hitstun = Math.max(t.hitstun || 0, Math.round((md.hitstun || 18) * (E.hitstunScale?.(f) ?? 1)))
  t.vx = dir * (md.knockbackX || 0)
  let vy = md.knockbackY || 0
  if (md.launcher && zordCb.launchAllowed(f, t)) { vy = md.launchVy; zordCb.onLaunch(f, t) }   // echo launcher shares the once-per-combo assist launch
  t.vy = vy; t.isBlocking = false; t.colorFlash = 6
  E.hitstop?.(null, t, 6)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  return 'hit'
}
function tickClone(f, s, opp, W) {
  const c = s.clone; if (!c) return
  c.age++
  if (!c.act && opp && opp.health > 0) c.dir = Math.sign(ctrX(opp) - c.x) || c.dir   // idle: faces the foe (no movement, no tracking)
  // ONE hit disperses it: the foe's live attack box or any of the foe's projectiles overlapping its body
  const hb = cloneHurt(f, c)
  if (opp && (overlap(W?.attackBox?.(opp), hb) || (W?.projectileRects?.(opp) || []).some(r => overlap(r, hb)))) { disperseClone(f, 'popped'); return }
  const A = c.act
  if (A) {
    A.t++
    if (A.kind === 'echo') {
      const md = SPD_YELLOW_MOVES[A.key]
      if (!A.hit && A.t > A.start && A.t <= A.start + A.active && opp) {
        const box = { x: A.dir === 1 ? hb.x + hb.w : hb.x - md.rangeX, y: hb.y + (md.boxY ?? 14), w: md.rangeX, h: md.rangeY }
        if (overlap(box, hurt(opp))) {
          const r = cloneStrike(f, opp, A, W)
          if (r) {
            A.hit = r
            if (r === 'hit') {
              s.stats.echoHits++; cue(f, 'echoHit')
              if (!A.coin) award(f, 'clone')
              if (!A.coin) { if (!s.relayUsed) s.relay = { t: CLONE.relayWindow }; if (!s.breakUsed) s.brk = { t: CLONE.breakWindow } }
            } else cue(f, 'echoBlocked')
          }
        }
      }
      if (A.t >= A.total) c.act = null
    } else if (A.kind === 'cover') {
      if (A.t === CLONE.coverAt && opp) {
        const m = MUZZLE.aim1, S = scaleOf(f)
        spawnShot(f, W, GUN.cover, 'cover', { x: c.x + c.dir * m[0] * S, y: c.feet + m[1] * S }, c.dir, { coin: true, clone: true })
        cue(f, 'pistolFire')
      }
      if (A.t >= CLONE.coverAt + CLONE.coverRec) c.act = null
    }
  }
  if (--c.life <= 0 && !c.act) disperseClone(f, 'expired')
}
// SWAP (Z's ySwap move, frame 8): exchange the two positions. Re-validated at the exchange frame; a clone lost during the
// startup means the swap whiffs (no refund). Crosswire then starts the coin-funded echo from the clone's new spot.
function doSwap(f, s, a, opp, W) {
  const c = s.clone
  if (!c || !c.ready || c.act || Math.abs(c.x - ctrX(f)) > CLONE.swapMax || !grounded(f)) { cue(f, 'swapFail'); return false }
  const zx = ctrX(f), half = (f.w || 48) / 2
  f.x = Math.round(Math.max(0, Math.min(sw(W) - (f.w || 48), c.x - half))); f.vx = 0
  c.x = Math.round(Math.max(half, Math.min(sw(W) - half, zx)))
  if (opp) { const d = Math.sign(ctrX(opp) - ctrX(f)) || f.facing; f.facing = d; a.my.dir = d; c.dir = Math.sign(ctrX(opp) - c.x) || c.dir }
  s.stats.swaps++; cue(f, 'swap')
  s.lastSwap = { from: Math.round(zx), to: Math.round(ctrX(f)), clone: c.x, feet: c.feet, t: 10 }   // render-only streak pair
  if (a.my.crosswire) orderEcho(f, W, { coin: true, free: true })
  return true
}

// ══ COMMAND STANCE + ORDERS ══════════════════════════════════════════════════════════════════════════════════════
export function stanceOpenable(f) {
  const a = f.attacking ? f.currentAttack : null
  return isSpdYellow(f) && grounded(f) && !a && !f.isBlocking && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isGrabbed && !f.knockdownState &&
    !f._ranger?.blink && f.health > 0 && !isSpdYellowUltActive() && !f._cinematic
}
export function openStance(f, W) {
  const s = spdYellowState(f)
  if (!stanceOpenable(f)) return false
  if (!startYellowMove(f, 'yStance', W)) return false
  s.stance = { t: STANCE.life, openTick: s.tick, sel: s.panelSel }
  f.isCharging = false; s.stats.stanceOpens++; cue(f, 'stanceOpen')
  return true
}
export function closeStance(f, why = 'cancel') {
  const s = f._spdYellow; if (!s?.stance) return
  s.panelSel = s.stance.sel; s.stance = null
  const a = f.attacking ? f.currentAttack : null
  if (a?.my?.key === 'yStance') {
    if (why === 'order') { f.attacking = false; f.currentAttack = null; f.currentMove = null }
    else { a.timer = Math.min(a.timer, STANCE.exitRecovery) }
  }
  if (why === 'cancel' || why === 'timeout') { s.stats.stanceCancels++; cue(f, 'stanceClose') }
}
export function stanceSelect(f, d) { const s = f._spdYellow; if (!s?.stance) return; s.stance.sel = (s.stance.sel + d + ORDERS.length) % ORDERS.length; cue(f, 'select') }
// Acceptance checks resources/state BEFORE payment. Returns true when accepted. A rejection keeps the stance open.
export function confirmOrder(f, opp, W) {
  const s = spdYellowState(f), o = ORDERS[s.stance?.sel ?? 0]
  if (!s.stance || !o) return false
  const no = why => { s.stats.orderRejects++; return reject(f, why) }
  if ((s.coins || 0) < o.coins) return no('coins')
  if ((f.energy || 0) < o.energy) return no('energy')
  if (o.id === 'cover') {
    if (!cloneIdle(s)) return no('clone')
    spendCoins(f, s, o.coins); f.energy -= o.energy
    s.clone.act = { kind: 'cover', t: 0, dir: s.clone.dir, coin: true }
    closeStance(f, 'order')
  } else if (o.id === 'crosswire') {
    if (!cloneIdle(s)) return no('clone')
    if (!s.recorded) return no('record')
    if (!swapLegal(f, s, W)) return no('swap')
    closeStance(f, 'order')
    if (!startYellowMove(f, 'ySwap', W, { extra: { free: true, crosswire: true } })) return no('swap')
    spendCoins(f, s, o.coins); f.energy -= o.energy
  } else if (o.id === 'breach') {
    if (s.breach) return no('armed')
    spendCoins(f, s, o.coins); f.energy -= o.energy
    s.breach = { t: BREACH.life }
    closeStance(f, 'order')
  } else if (o.id === 'rising') {
    if (!falconCanCall(f, ZORD_KIND.rising, f.energy, ZORD_RESOURCE)) return no('zord')
    closeStance(f, 'order')
    if (!startYellowMove(f, 'yCall', W, { extra: { kind: ZORD_KIND.rising } })) return no('zord')
  } else if (o.id === 'showcase') {
    if (!s.showcase && s.coins < COINS.max) return no('coins')
    s.showcase = !s.showcase
    closeStance(f, 'order')
  }
  s.stats.orders[o.id]++; cue(f, 'order_' + o.id)
  return true
}

// Breach follow-up gate (command layer): the confirm window is open and Z is free or in the AUTHORED late long-gun recovery.
function breachUsable(f) {
  const a = f?.attacking ? f.currentAttack : null
  if (!a) return true
  return a.my?.key === 'yGun' && a.my.firedKind === 'long' && a.timer <= GUN.long.lateCancel
}
export function breachCallOpen(f) {
  const s = f?._spdYellow
  if (!s?.breachConfirm || s.breachUsed) return false
  return breachUsable(f)
}
export function relayOpen(f) { const s = f?._spdYellow; return !!(s?.relay && s.relay.t > 0 && !s.relayUsed) }
export function breakOpen(f) { const s = f?._spdYellow; return !!(s?.brk && s.brk.t > 0 && !s.breakUsed) }
export function spendRelay(f) { const s = f._spdYellow; s.relay = null; s.brk = null; s.relayUsed = true; s.stats.relays++; cue(f, 'relay') }
export function spendBreak(f) { const s = f._spdYellow; s.relay = null; s.brk = null; s.breakUsed = true; s.stats.breaks++; cue(f, 'break') }
export function spendBreach(f) { const s = f._spdYellow; s.breachConfirm = null; s.breachUsed = true; s.stats.swords++ }

function onZordEvent(f, s, e) {
  if (e.type === 'commit') cue(f, 'commit_' + e.kind)
  if (e.type === 'pip') cue(f, 'ready')
  if (e.type === 'hit') cue(f, e.kind === 'ySword' ? 'swordHit' : e.kind === 'yRising' ? 'kickHit' : 'zordPunch')
  if (e.type === 'blocked') cue(f, 'zordBlock')
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickSpdYellow(f, opp, raw, W) {
  if (!isSpdYellow(f)) { if (f?._spdYellow) clearSpdYellow(f, W); return }
  const s = spdYellowState(f); s.tick++
  falconState(f, ZORD_RESOURCE)
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'left', 'right']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk, block: !!raw.block, charge: !!raw.charge }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if (raw.up && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  if (s.stance) f.isCharging = false                                   // the stance owns Charge: no component charging
  // shots never pass the stage walls
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) { const p = W.projectiles[i]
    if (p?.owner === f && p._yellow && (p.x < 0 || p.x > (p._yellowMaxX || sw(W)))) { if (p._yellow.kind === 'ult') cue(f, 'ultMiss'); W.projectiles.splice(i, 1) } }
  if (f.health <= 0 || f.isGrabbed) {   // KO / grabbed: the duplicate disperses, pending orders end, nothing is refunded
    if (f._falcon?.pendingKind) falconCancelCall(f)
    if (s.clone) disperseClone(f, 'retire')
    if (s.stance) closeStance(f, 'cancel')
    s.gun = null; s.relay = null; s.brk = null; s.breachConfirm = null
    if (f.health <= 0) return
  }
  const a0 = f.attacking ? f.currentAttack : null
  if (f._ranger) f._ranger.blinkVeto = !!(a0 || s.stance)                // blink only from neutral (never a free cancel)
  tickRanger(f, opp, raw, rangerWorld(W))
  // BLINK RECOVERY reads as the supplied landing-set pose (acro4) for exactly the framework's recovery frames
  // (presentation field, decremented by game.js like Minato's / Sasuke's teleport poses; never read by the sim).
  const bl = f._ranger?.blink
  if (bl?.phase === 'recover' && !f.attacking) { f._spriteCastMove = 'yBlinkRec'; f._spriteCastTimer = 2 }
  if (f.hitstop > 0) return
  s.clock++
  if (s.reject > 0) s.reject--
  if (s.lastMuzzle && --s.lastMuzzle.t <= 0) s.lastMuzzle = null
  if (s.lastClone && --s.lastClone.t <= 0) s.lastClone = null
  if (s.lastSwap && --s.lastSwap.t <= 0) s.lastSwap = null
  if (s.cloneCd > 0) s.cloneCd--
  if (s.swapCd > 0) s.swapCd--
  if (s.echoCd > 0) s.echoCd--
  if (s.relay && --s.relay.t <= 0) s.relay = null
  if (s.brk && --s.brk.t <= 0) s.brk = null
  if (s.breach && --s.breach.t <= 0) { s.breach = null; cue(f, 'breachExpire') }
  // the 10 f confirm counts only while the call is USABLE (Z free, or in the authored late long-gun recovery): a hit that lands
  // early in the 30 f recovery never expires before the cancel point exists.
  if (s.breachConfirm && breachUsable(f) && --s.breachConfirm.t <= 0) s.breachConfirm = null
  if (s.cycleReset > 0 && --s.cycleReset <= 0) { s.cycle = { melee: false, gun: false, clone: false }; s.stats.cycleResets++; cue(f, 'cycleReset') }
  if (s.stance && --s.stance.t <= 0) closeStance(f, 'timeout')
  if (grounded(f) && !(f.attacking && f.currentAttack?.my?.key === 'yAirShot')) s.airShotUsed = false
  // the shared assist scheduler: pips / lockout tick; a committed Megazord action completes even if Z is hit
  const evs = tickFalcon(f, zordWorld(W), ZORD_RESOURCE, SPD_YELLOW_DAMAGE_SCALE, zordCb)
  for (const e of evs) onZordEvent(f, s, e)
  tickClone(f, s, opp, W)
  if (!(f.comboCounter > 0)) { s.assistLaunchUsed = false; s.relayUsed = false; s.breakUsed = false; s.breachUsed = false }
  const a = f.attacking ? f.currentAttack : null, m = a?.my
  if (f._falcon.pendingKind && !(a && m?.key === 'yCall')) falconCancelCall(f)   // interrupted call: resources stay spent
  // an interrupted hold: committed Energy stays spent, nothing fires, the Breach buff (if consumed) is gone
  if (s.gun && !(a && m && (m.key === 'yGun' || m.key === 'yAirShot') && m.serial === s.gun.serial)) { if (!s.gun.fired) { s.stats.gunInterrupted++; cue(f, 'gunBreak') } s.gun = null }
  if (s.stance && !(a && m?.key === 'yStance')) { s.stance = null }
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = a.total - a.timer, md = SPD_YELLOW_MOVES[m.key]
  f.facing = m.dir
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) {
    const want = m.origin + m.dir * md.travel[2] * (t - md.travel[0] + 1)
    let x = Math.max(0, Math.min(sw(W) - f.w, want))
    if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }
    f.x = x; f.vx = 0
  } else if (grounded(f)) f.vx = 0
  if (m.key === 'yGun' || m.key === 'yAirShot') tickGun(f, s, a, t, raw, W)
  if (m.key === 'yClone' && t === CLONE.appearAt && !s.clone) spawnClone(f, s, W, opp)
  if (m.key === 'ySwap' && t === CLONE.swapAt && !m.swapped) { m.swapped = true; doSwap(f, s, a, opp, W) }
  // CALL COMMIT: the first frame after the 12 f startup. From here the Megazord action is detached.
  if (m.key === 'yCall' && t >= a.activeStart && f._falcon.pendingKind) {
    falconCommit(f, opp, zordWorld(W)); if (m.kind === ZORD_KIND.intercept) s.stats.intercepts++
  }
  // ULTIMATE: the compact-pistol opener leaves on frame 20; a clean hit captures the target -> the frozen raid.
  if (m.key === 'yUltOpen' && t === md.startup && !m.fired) {
    m.fired = true; f.currentMove = 'yPistolShot'
    spawnShot(f, W, GUN.ultOpen, 'ult', muzzlePoint(f, 'aim1'), f.facing || 1)
    cue(f, 'pistolFire')
  }
  if (m.key === 'yUltOpen' && s.ultHit) { s.ultHit = false; const tg = ultTargets.get(f); ultTargets.delete(f); if (tg && tg.health > 0) activateSpdYellowUlt(f, tg, W) }
  if (m.key === 'yUltOpen' && m.fired && t === md.startup + 30 && !cine.active) { s.stats.ultWhiffs++ }
}

// ══ ULTIMATE — DUPLICATE RAID: NINJA CROSSBREAKER ═══════════════════════════════════════════════════════════════
// The established FROZEN-CINEMATIC contract (Black / White / MMPR Pink): activate / isActive / update / clear / status.
// While active, game.js freezes combat, physics and input and calls updateSpdYellowUlt() each frame. Z's pose comes from a
// non-hitting currentAttack this module advances; duplicates, Megazord, beam and coins are drawn by spdYellowFx from
// spdYellowUltScene() (a pure function of the frame). Damage only through W.damage (the engine choke-point) — no HP setter.
// Beats (frames from confirm): 0-23 Z recoils, duplicate A appears BEHIND the target -> cut @24; duplicate B appears in
// front -> cut @40; 50-80 Z's acrobatic leap kick (contact @66); Megazord punch @92 -> kick @112 (the target is lifted);
// 128-160 Z braces the long gun; beam @160; Megazord sword finish @166 (distinct contact); settle 182; end 200.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1, showcase: false }
export const isSpdYellowUltActive = () => cine.active
function pose(f, move, at) {
  const total = 999
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total, timer: total - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, my: null, _ultPose: true }
}
export function activateSpdYellowUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = spdYellowState(f)
  retireSortie(f, zordWorld(W)); if (f._falcon) f._falcon.pendingKind = null   // no duplicate Megazord
  disperseClone(f, 'retire')                                                   // the ordinary clone / echo is retired safely
  if (s.stance) closeStance(f, 'cancel')
  s.relay = null; s.brk = null; s.breachConfirm = null; s.gun = null
  const showcase = !!(s.showcase && s.coins === COINS.max)
  if (showcase) { spendCoins(f, s, COINS.max); s.stats.showcases++ }      // presentation only: same damage / hits / duration
  s.showcase = false
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, floorC: f.y, floorT: f.y + (f.h || 94) - (target.h || 94),
    cx0: f.x, tx0: target.x, dir: f.facing || 1, done: 0, scale: E.comboScale?.(f) ?? 1, showcase })
  s.ult = { frame: 0, done: 0, showcase }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  cue(f, showcase ? 'ultShowcase' : 'ultConfirm')
  return true
}
function ultHit(i) {
  const c = ULT.contacts[i], t = cine.target, f = cine.caster
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  cine.done = i + 1; if (f._spdYellow?.ult) f._spdYellow.ult.done = cine.done
  cue(f, c.who === 'beam' ? 'longHit' : c.who === 'sword' ? 'swordHit' : c.who.startsWith('zord') ? 'zordPunch' : 'echoHit')
}
export function updateSpdYellowUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, k = cine.frame, d = cine.dir
  if (!f || !t) return clearSpdYellowUlt()
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle   // KO: straight to the settle, no further contacts
  const fr = cine.frame
  const clampX = (o, x) => Math.max(0, Math.min(sw(cine.W) - (o.w || 48), x))
  const near = cine.tx0 - d * ((f.w || 48) + 24)                     // Z's kick lands just in front of the target (never through it)
  if (fr < 50) pose(f, 'yPistolShot', Math.min(fr, 8))
  else if (fr < 82) { const u = Math.min(1, (fr - 50) / 16); pose(f, 'yAcro', fr - 50); f.x = clampX(f, cine.cx0 + (near - cine.cx0) * u) }
  else if (fr < 128) { const u = Math.min(1, (fr - 82) / 14); pose(f, 'yCall', 0); f.x = clampX(f, near + (cine.cx0 - near) * u) }
  else if (fr < 160) { pose(f, 'yLongHold', 0); f.x = clampX(f, cine.cx0) }
  else { pose(f, 'yLongShot', fr - 160); f.x = clampX(f, cine.cx0) }
  f.y = cine.floorC
  t.x = clampX(t, cine.tx0); t.vx = 0; t.vy = 0; t.isBlocking = false
  if (fr >= 112 && fr < 166) t.y = cine.floorT - 60 * Math.min(1, (fr - 112) / 10)
  else t.y = cine.floorT
  if (f._spdYellow?.ult) f._spdYellow.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 12; f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._spdYellow; if (s) { s.stats.ultDone++; delete s.ult }
    if (f._falcon) { f._falcon.postUlt = ZORD_RESOURCE.postUltLock; f._falcon.sortie = null } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, showcase: false })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearSpdYellowUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._spdYellow) delete f._spdYellow.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0, showcase: false })
}
export const getSpdYellowUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, showcase: cine.showcase, caster: cine.caster?.side || null })
// Render read (pure function of the frame): duplicates, Megazord pose, beam, Showcase coins.
export function spdYellowUltScene(f) {
  if (!cine.active || cine.caster !== f) return null
  const fr = cine.frame, d = cine.dir, t = cine.target, tx = ctrX(t), feet = cine.floorT + (t.h || 94)
  const dups = []
  if (fr >= 8 && fr < 48) dups.push({ x: tx + d * 70, feet, dir: -d, strip: 'yJ3', at: Math.max(0, fr - 16), alpha: Math.min(1, (fr - 8) / 6) * (fr > 40 ? (48 - fr) / 8 : 1) })
  if (fr >= 26 && fr < 60) dups.push({ x: tx - d * 80, feet, dir: d, strip: 'heavy', at: Math.max(0, fr - 27), alpha: Math.min(1, (fr - 26) / 6) * (fr > 52 ? (60 - fr) / 8 : 1) })
  let zord = null
  if (fr >= 80) {
    // the Megazord strikes from BEHIND the target (facing back toward Z), so the target is sandwiched and Z's beam
    // lane stays clear; kept on stage near a wall (presentation only, never collides)
    const behind = Math.max(150, Math.min(sw(cine.W) - 150, tx + d * 150)), zd = Math.sign(tx - behind) || -d
    let x = behind, p = 'ready'
    if (fr < 88) { x = behind - zd * 170 * (1 - (fr - 80) / 8); p = 'step' }
    else if (fr < 92) p = 'jab'
    else if (fr < 104) p = 'punch2'
    else if (fr < 108) p = 'knee'
    else if (fr < 124) p = 'crane'
    else if (fr < 136) p = 'recover'
    else if (fr < 150) p = 'draw'
    else if (fr < 166) p = 'wind'
    else if (fr < 178) p = 'cut'
    else p = 'finish'
    zord = { x, y: feet, pose: p, dir: zd, age: fr, arc: fr >= 166 && fr < 180 ? (fr - 166) / 14 : null }
  }
  const beam = fr >= 160 && fr < 174 ? { u: (fr - 160) / 14, tx, ty: cine.floorT + (t.h || 94) / 2 } : null
  return { frame: fr, dups, zord, beam, showcase: cine.showcase, tx, feet }
}
