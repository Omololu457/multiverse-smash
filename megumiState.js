// Megumi Fushiguro (megumi_fushiguro) — SIMULATION state. Plain JSON on f._megumi (snapshotted for replay / LAN), sim ticks
// only: no RNG, no wall clock. Every export is a no-op for any other rosterKey.
//
// OWNED ENTITIES (stable owner, serial, deterministic lifecycle):
//   summon  ≤ 1 OFFENSIVE shikigami action { kind dog|toad|nue|airNue|serpent|elephant|kon, x, y, dir, t, … }
//           Its hit volume is an ENGINE projectile (W.spawn, tagged _mg) so guard, blockstun, combo scaling, juggle
//           and projectile rules are the shared ones. Replacement rule: a new summon while one is active is REJECTED
//           before anything is spent — except a Shadow Route transition, which dismisses the old one first.
//   rabbits ≤ 1 Rabbit Escape swarm (6 rabbits, no hitbox), separately capped.
//   route   Shadow Route stocks (0–2) + family progress + the confirm window + the once-per-combo flag.
// Nothing here grants invulnerability, heals or changes stats. A KO, round reset, rematch or scene exit clears all of it.
import { MEGUMI_MOVES, DOG, TOAD, PULL, NUE, AIRNUE, RABBIT, SERPENT, ELEPHANT, STEP, ROUTE, KON, ULT, NORMAL_KEYS, FAMILY, dmg } from './megumiData.js'

export const MEGUMI_KEY = 'megumi_fushiguro'
export const isMegumi = f => f?.rosterKey === MEGUMI_KEY
export const mgState = f => f._megumi ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0, nEnt: 0,
  wasGround: true, floor: null, airEnd: false, airNue: false, upAge: 0, ownsUp: false, ownsL2: false, prevJc: 0,
  summon: null, rabbits: null, pull: null, pulledAt: {}, stepReady: 0, dogs: 0,
  route: { stocks: 0, fam: [], usedCombo: false, confirm: null },
  fx: [], ghosts: [],
  stats: { dog: 0, toad: 0, nue: 0, airNue: 0, rabbit: 0, serpent: 0, elephant: 0, kon: 0, hits: {}, blocked: 0, rejects: 0,
    pulls: 0, routes: 0, stocksEarned: 0, steps: 0, hops: 0, dismissed: 0, airEnds: 0, ultStarts: 0, ultWhiffs: 0, ultDone: 0, dj: 0, spawns: 0 },
  cues: [] }

const E = { startMove: null, comboScale: null }
export function registerMegumiEngine(o) { Object.assign(E, o) }
const cue = (f, c) => mgState(f).cues.push(c)
const ultTargets = new WeakMap()
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.mg) ? f.currentAttack : null
const clampSX = (W, x, m = 8) => Math.max(m, Math.min(sw(W) - m, x))
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
const bySide = (W, side) => (W?.fighters?.() || []).find(o => o && (o.side || o.playerNumber) === side) || null
function pushFx(s, kind, x, y, dir = 1, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), dir, t: 0, ...(extra || {}) }); if (s.fx.length > 12) s.fx.shift() }
function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }
const floorOf = (f, s) => s.floor ?? (f.groundY ?? ((f.y || 0) + (f.h || 94)))

function killProj(f, W, n) {
  const P = W?.projectiles; if (!P) return
  for (let i = P.length - 1; i >= 0; i--) if (P[i]?.owner === f && P[i]._mg && (n == null || P[i]._mg.n === n)) P.splice(i, 1)
}
export function clearMegumi(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearMegumiUlt()
  if (live(f)) endAttack(f)
  killProj(f, W)
  delete f._megumi; delete f._megumiRemoteInput; delete f._mgDark
}

// ── Movement lock (game.js updateMovementInput) ──
// Committed moves own the body (a double-tap dash is swallowed); the launchers stay free for their jump-cancel. Up held
// WITH Special belongs to Nue (never a jump); a fresh grounded Up holds the jump 3 f (same grace as Robin).
export const UP_GRACE = 3
const upGraceHold = (f, raw) => !!(raw?.up && !f.attacking && grounded(f) && (f._megumi?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export function megumiLocked(f, raw = null) {
  if (!isMegumi(f)) return false
  if (isMegumiUltActive()) return true
  const s = mgState(f), a = f.attacking ? f.currentAttack : null
  if (a && !(a.launcher && a.hasHit)) { f._dashTap = false; return true }
  // L2 + horizontal is Shadow Step's input: it never walks or double-tap dashes (even on cooldown).
  if (raw ? (raw.charge && !!raw.left !== !!raw.right) : s.ownsL2) { f._dashTap = false; if (grounded(f)) f.vx = 0; return true }
  if (raw ? (raw.special && raw.up && grounded(f)) : s.ownsUp) return true
  return upGraceHold(f, raw)
}
// L2 / Charge ownership (game.js charge gate): L2 + a horizontal direction is Shadow Step and must not charge energy.
// L2 alone stays the ordinary shared charge.
export function megumiOwnsCharge(f) {
  if (!isMegumi(f)) return false
  const s = f._megumi; return !!(s && (s.ownsL2 || f.currentAttack?.mg?.key === 'mStep'))
}

// Start one of Megumi's moves through combat.startMove (frameExact path) and attach the descriptor `mg`.
// Every legality / ownership / resource check happens BEFORE anything is spent.
export function startMgMove(f, key, W, { cancel = false, route = false, dir = null } = {}) {
  if (!isMegumi(f)) return false
  const s = mgState(f), md = MEGUMI_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  const airOnly = ['air', 'mAirEnd', 'mAirNue']
  if (!airOnly.includes(key) && !g) return false
  if (airOnly.includes(key) && g) return false
  if (key === 'mAirEnd' && s.airEnd) { reject(f); return false }
  if (key === 'mAirNue' && s.airNue) { reject(f); return false }
  if (key === 'mStep' && s.clock < s.stepReady) { reject(f); return false }
  const offensive = md.summon && md.summon !== 'rabbit'
  if (offensive && s.summon && !route) { reject(f); return false }                  // one offensive summon (refused, nothing spent)
  if (md.summon === 'rabbit' && s.rabbits) { reject(f); return false }
  const cost = md.cost || 0
  if ((f.energy || 0) < cost) { reject(f); return false }
  if (cancel) endAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  if (route) {                                                                      // Shadow Route: pay the stock, dismiss the previous summon
    if (s.summon) dismiss(f, s, W, 'route')
    s.route.stocks--; s.route.usedCombo = true; s.route.confirm = null; s.stats.routes++; cue(f, 'route')
  }
  f.currentMove = key
  const a = f.currentAttack
  a.mg = { key, dir: dir ?? (f.facing || 1), clean: false, blocked: false, serial: ++s.serial, hits: [], released: false, route, counted: false }
  a.hasHit = !!md.noBody || !!md.hits
  f.isBlocking = false; f.isCharging = false
  if (g && !md.air) f.vx = 0
  if (key === 'up' || key === 'mLaunch') f.jumpHeld = true
  if (key === 'mAirEnd') { s.airEnd = true; s.stats.airEnds++ }
  if (key === 'mAirNue') s.airNue = true
  if (key === 'mStep') { s.stepReady = s.clock + STEP.cooldown; s.stats.steps++; cue(f, 'step') }
  else if (key === 'mHop') { s.stats.hops++; cue(f, 'hop') }
  else if (key === 'ultOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  else if (md.summon) cue(f, 'sign')
  else cue(f, md.weapon ? 'blade' : 'swing')
  return true
}
function reject(f) { const s = mgState(f); s.stats.rejects++; cue(f, 'reject') }

// ── combat.js hooks (megumi-gated) ──
export function megumiHitbox(f) {
  const a = f.currentAttack, m = a?.mg, md = MEGUMI_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 18), w: a.rangeX, h: a.rangeY }
}
export function megumiBlock(f, d, a) {
  if (!isMegumi(f) || !a?.mg) return
  const md = MEGUMI_MOVES[a.mg.key]
  d.blockstun = md.blockstun; a.mg.blocked = true
  if (md.hits) markWindow(a)
}
function markWindow(a) {
  const md = MEGUMI_MOVES[a.mg.key], t = elapsed(a)
  const w = md.hits.find(([from, to]) => t >= from && t <= to)
  if (w && !a.mg.hits.includes(w[2])) a.mg.hits.push(w[2])
  return w
}
export function megumiHit(f, d, a, { armored = false } = {}) {
  if (!isMegumi(f) || !a?.mg) return
  const md = MEGUMI_MOVES[a.mg.key], s = mgState(f)
  if (md.hits) markWindow(a)
  if (armored || d.isBlocking) return                       // armor-absorbed / guarded: not clean → no route progress
  a.mg.clean = true; f._cmdHitLanded = true
  if (NORMAL_KEYS.includes(a.mg.key) && !a.mg.counted) { a.mg.counted = true; progress(f, s, 'normal') }
}
// Summon hit volumes (engine projectile contact, hit or block). Never changes damage.
export function megumiProjectileHit(proj, target, { armored = false } = {}) {
  const k = proj?._mg; if (!k || !isMegumi(proj.owner)) return
  const f = proj.owner, s = mgState(f), z = s.summon
  const blocked = !!target?.isBlocking || armored
  s.stats.hits[k.kind] = (s.stats.hits[k.kind] || 0) + (blocked ? 0 : 1)
  if (blocked) s.stats.blocked++
  if (z && z.n === k.owner) { z.contact = true; if (blocked) z.blocked = true; else z.hit = true }
  if (blocked) return
  // a summon sent by a Shadow Route never earns route progress (a route cannot refund its own stock)
  if (FAMILY[k.kind] && !k.counted && !(z && z.n === k.owner && z.route)) { k.counted = true; progress(f, s, FAMILY[k.kind]) }
  if (k.kind !== 'kon' && z && z.n === k.owner) s.route.confirm = { until: s.clock + ROUTE.confirm, kind: k.kind, n: z.n }
  if (k.kind === 'toad' && z && z.n === k.owner && !z.pulled && target) {        // Toad pull: once per Toad instance, lockout per target
    const side = target.side || target.playerNumber || 0, last = s.pulledAt[side]
    if (last == null || s.clock - last >= PULL.lockout) { z.pulled = true; s.pulledAt[side] = s.clock; s.pull = { side, t: 0, x0: target.x }; s.stats.pulls++; cue(f, 'pull') }
  }
  if (k.kind === 'kon' && z && z.kind === 'kon' && target && target.health > 0) { z.ultHit = true; ultTargets.set(f, target) }
}
function progress(f, s, fam) {
  const r = s.route
  if (r.stocks >= ROUTE.maxStocks) return
  if (!r.fam.includes(fam)) r.fam.push(fam)
  if (r.fam.length >= ROUTE.perStock) { r.stocks++; r.fam = []; s.stats.stocksEarned++; cue(f, 'stock'); pushFx(s, 'stock', ctrX(f), f.y - 8) }
}

// ── summon helpers ──
function vol(f, s, W, kind, owner, cx, cy, w, h, P) {
  const pr = W?.spawn?.(f, 'megumi_' + kind, { damage: dmg(P.raw), speed: 1, vx: P.vx ?? (P.dir || 1) * 0.01, vy: 0, spawnX: cx, spawnY: cy, w, h,
    radius: Math.min(w, h) / 2, lifetime: P.life, hitstun: P.hitstun, knockbackX: P.kbx, knockbackY: P.kby, piercesMulti: P.pierce !== false,
    sheet: './assets/megumi_fushiguro/fx/blank.png', spriteFrames: 1, spriteW: 1, spriteH: 1, isSpecial: true, color: '#6a7cff' })
  if (!pr) return null
  pr.noTrail = true; pr.damageType = 'shikigami'
  pr._mg = { kind, owner, n: ++s.nEnt, counted: false }
  s.stats.spawns++
  return pr
}
function dismiss(f, s, W, why) {
  const z = s.summon; if (!z) return
  killProj(f, W)
  pushFx(s, 'sink', z.x, z.y, z.dir, { what: z.kind })
  s.summon = null; s.stats.dismissed++
  if (why !== 'route') s.route.confirm = null
}
function release(f, s, W, m, opp) {
  const md = MEGUMI_MOVES[m.key], kind = md.summon, d = m.dir, floor = floorOf(f, s), cx = ctrX(f)
  m.released = true; s.stats[kind] = (s.stats[kind] || 0) + 1; cue(f, 'summon_' + kind)
  if (kind === 'rabbit') { s.rabbits = { x: Math.round(cx), y: Math.round(floor), t: 0, n: ++s.nEnt, hopUsed: false, clock0: s.clock }; return }
  const z = { kind, n: ++s.nEnt, x: Math.round(cx), y: Math.round(floor), dir: d, t: 0, hit: false, blocked: false, contact: false, pulled: false, route: !!m.route }
  if (kind === 'dog') { z.x = Math.round(clampSX(W, cx + d * 30)); z.x0 = z.x; z.col = (s.dogs++ % 2) ? 'black' : 'white' }
  if (kind === 'toad') z.x = Math.round(clampSX(W, cx + d * TOAD.ahead, 24))
  if (kind === 'nue') { z.sx = Math.round(cx - d * 60); z.sy = Math.round(floor - 210); z.px = Math.round(clampSX(W, cx + d * NUE.ax, 40)); z.py = Math.round(floor + NUE.ay); z.x = z.sx; z.y = z.sy }
  if (kind === 'airNue') { z.sx = Math.round(cx); z.sy = Math.round(f.y + (f.h || 94) * 0.3); z.px = Math.round(clampSX(W, cx + d * AIRNUE.ax, 40)); z.py = Math.round(f.y + (f.h || 94) * 0.5 + AIRNUE.ay); z.x = z.sx; z.y = z.sy }
  if (kind === 'serpent') {                                         // emergence point captured ONCE here (capped, stage-clamped)
    const foe = foesOf(f, W, opp).sort((p, q) => Math.abs(ctrX(p) - cx) - Math.abs(ctrX(q) - cx))[0]
    let ahead = foe ? (ctrX(foe) - cx) * d : SERPENT.range
    ahead = Math.max(SERPENT.minAhead, Math.min(SERPENT.range, ahead))
    z.x = Math.round(clampSX(W, cx + d * ahead, SERPENT.w / 2))
  }
  if (kind === 'elephant') z.x = Math.round(clampSX(W, cx - d * ELEPHANT.behind, 60))
  if (kind === 'kon') { z.x = Math.round(clampSX(W, cx + d * 10)); z.x0 = z.x }
  s.summon = z
}
function updateSummon(f, s, W, opp) {
  const z = s.summon; if (!z) return
  z.t++
  const P = W?.projectiles || [], d = z.dir, floor = z.y
  const pr = P.find(q => q?.owner === f && q._mg?.owner === z.n)
  switch (z.kind) {
    case 'dog': {
      if (!z.fading && z.t === 1) vol(f, s, W, 'dog', z.n, z.x + d * 10, floor - DOG.h / 2, DOG.w, DOG.h, { raw: DOG.raw, hitstun: DOG.hitstun, kbx: DOG.kbx, kby: DOG.kby, life: DOG.life, vx: d * DOG.vx, pierce: false })
      if (!z.fading) {
        const p = P.find(q => q?.owner === f && q._mg?.owner === z.n)
        if (p) { z.x = Math.round(p.x - d * 10); if (Math.abs(z.x - z.x0) >= DOG.range || z.x <= 12 || z.x >= sw(W) - 12) { killProj(f, W, p._mg.n); z.fading = 1 } }
        else if (z.t > 1) z.fading = 1                              // contact (hit / block) or lifetime: the dog dissolves
      } else if (++z.fading > DOG.fade) s.summon = null
      break
    }
    case 'toad': {
      if (z.t === TOAD.warn) vol(f, s, W, 'toad', z.n, z.x + d * (TOAD.laneX0 + TOAD.laneX1) / 2, floor - TOAD.laneY - TOAD.laneH / 2, TOAD.laneX1 - TOAD.laneX0, TOAD.laneH,
        { raw: TOAD.raw, hitstun: TOAD.hitstun, kbx: TOAD.kbx, kby: TOAD.kby, life: TOAD.lash, dir: d })
      if (z.t >= TOAD.life) s.summon = null
      break
    }
    case 'nue': {
      if (z.t <= NUE.enter) { const u = z.t / NUE.enter; z.x = Math.round(z.sx + (z.px - z.sx) * u); z.y = Math.round(z.sy + (z.py - z.sy) * u) }
      else if (z.t > NUE.burstAt + NUE.active) { z.y -= 4 }
      if (z.t === NUE.burstAt) { vol(f, s, W, 'nue', z.n, z.px, z.py, NUE.r * 2, NUE.r * 2, { raw: NUE.raw, hitstun: NUE.hitstun, kbx: NUE.kbx, kby: NUE.kby, life: NUE.active, dir: d }); cue(f, 'zap') }
      if (z.t >= NUE.life) s.summon = null
      break
    }
    case 'airNue': {
      if (z.t <= AIRNUE.burstAt) { const u = z.t / AIRNUE.burstAt; z.x = Math.round(z.sx + (z.px - z.sx) * u); z.y = Math.round(z.sy + (z.py - z.sy) * u) }
      else z.x += d * 3
      if (z.t === AIRNUE.burstAt) { vol(f, s, W, 'airNue', z.n, z.px + d * 20, z.py, AIRNUE.r * 2, AIRNUE.r * 2, { raw: AIRNUE.raw, hitstun: AIRNUE.hitstun, kbx: AIRNUE.kbx, kby: AIRNUE.kby, life: AIRNUE.active, dir: d }); cue(f, 'zap') }
      if (z.t >= AIRNUE.life) s.summon = null
      break
    }
    case 'serpent': {
      if (z.t === SERPENT.warn + 2) { vol(f, s, W, 'serpent', z.n, z.x, floor - SERPENT.h / 2, SERPENT.w, SERPENT.h, { raw: SERPENT.raw, hitstun: SERPENT.hitstun, kbx: SERPENT.kbx, kby: SERPENT.kby, life: SERPENT.active, dir: d }); cue(f, 'rise') }
      if (z.t >= SERPENT.life) s.summon = null
      break
    }
    case 'elephant': {
      const i = ELEPHANT.contacts.indexOf(z.t)
      if (i >= 0) {
        const x0 = clampSX(W, z.x + d * ELEPHANT.laneX0, 0), x1 = clampSX(W, z.x + d * (ELEPHANT.laneX0 + ELEPHANT.laneLen), 0)
        const lo = Math.min(x0, x1), hi = Math.max(x0, x1)
        if (hi - lo > 8) vol(f, s, W, 'elephant', z.n, (lo + hi) / 2, floor - ELEPHANT.laneY - ELEPHANT.laneH / 2, hi - lo, ELEPHANT.laneH,
          { raw: ELEPHANT.raw, hitstun: ELEPHANT.hitstun, kbx: ELEPHANT.kbx, kby: ELEPHANT.kby, life: 3, dir: d })
        cue(f, 'water')
      }
      if (z.t >= ELEPHANT.life) s.summon = null
      break
    }
    case 'kon': {
      if (z.t <= KON.run) z.x = Math.round(clampSX(W, z.x + d * KON.vx, 30))
      if (z.t === KON.active[0]) vol(f, s, W, 'kon', z.n, z.x + d * 30, floor - KON.h / 2, KON.w, KON.h, { raw: KON.raw, hitstun: 40, kbx: 1, kby: -2, life: KON.active[1] - KON.active[0], vx: d * KON.vx, pierce: false })
      const p = P.find(q => q?.owner === f && q._mg?.owner === z.n); if (p) p.x = z.x + d * 30
      if (z.t >= KON.life) s.summon = null
      break
    }
  }
  if (s.summon === z) z.pr = !!pr
}
function updatePull(f, s, W) {
  const q = s.pull; if (!q) return
  const t = bySide(W, q.side)
  if (!t || t.health <= 0 || t.isBlocking || !(t.hitstun > 0) || q.t >= PULL.frames) { s.pull = null; return }
  q.t++
  const d = f.facing || 1, stop = d === 1 ? f.x + f.w + PULL.stopGap - 48 : f.x - PULL.stopGap - (t.w || 48) + 48
  const goal = d === 1 ? Math.max(stop, Math.min(q.x0, t.x)) : Math.min(stop, Math.max(q.x0, t.x))
  const nx = q.x0 + (goal - q.x0) * (q.t / PULL.frames)
  // never past Megumi's front, stage-clamped
  t.x = Math.max(0, Math.min(sw(W) - (t.w || 48), d === 1 ? Math.max(nx, f.x + f.w + 4) : Math.min(nx, f.x - (t.w || 48) - 4)))
  t.vx = 0
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickMegumi(f, opp, raw, W) {
  if (!isMegumi(f)) { if (f?._megumi) clearMegumi(f, W); return }
  const s = mgState(f); s.tick++
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  const lr = (raw.right && !raw.left) ? 1 : (raw.left && !raw.right) ? -1 : 0
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'charge', 'left', 'right']) {
    const v = !!raw[k]
    if (v && !s.prev[k] && k !== 'up') s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk, lr }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.ownsL2 = !!(raw.charge && lr !== 0)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if ((raw.up || raw.jump) && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up && !raw.jump) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  else if (!raw.up && !raw.jump && f.jumpHeld && f.hitstop > 0) f.jumpHeld = false
  const g = grounded(f)
  if (g) s.floor = (f.y || 0) + (f.h || 94)
  else if (s.floor == null) s.floor = f.groundY ?? null
  const a = live(f)
  if (g && !s.wasGround) { s.airEnd = false; s.airNue = false }                  // genuine landing: airtime allowances reset
  if (g && !a) { s.airEnd = false; s.airNue = false }
  const jc = f.jumpCount || 0; if (!g && jc >= 2 && s.prevJc < 2) { s.stats.dj++; cue(f, 'doubleJump') }; s.prevJc = g ? 0 : jc
  s.wasGround = g
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 30) s.fx.splice(i, 1)
  for (let i = s.ghosts.length - 1; i >= 0; i--) if (++s.ghosts[i].t > 14) s.ghosts.splice(i, 1)
  if (f.health <= 0) {                                                             // no summon survives its owner's KO
    if (s.summon) dismiss(f, s, W, 'ko'); s.rabbits = null; s.pull = null; s.route.confirm = null; return
  }
  if (f.hitstop > 0) return
  s.clock++
  // ── interruption: a hit / grab ends the live move. Gestures before release summon nothing; Serpent / Elephant are
  //    dismissed if Megumi is hit before their first contact (committed options are interruptible).
  if (a && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) endAttack(f)
  if ((f.hitstun > 0 || f.isGrabbed) && s.summon && (s.summon.kind === 'serpent' || s.summon.kind === 'elephant') && !s.summon.contact) dismiss(f, s, W, 'interrupted')
  // ── combo bookkeeping: the once-per-combo Shadow Route flag clears when no foe is in hitstun / knockdown ──
  if (s.route.usedCombo && !foesOf(f, W, opp).some(o => o.hitstun > 0 || o.knockdownState)) s.route.usedCombo = false
  if (s.route.confirm && s.clock > s.route.confirm.until) s.route.confirm = null
  updateSummon(f, s, W, opp)
  updatePull(f, s, W)
  // ── Rabbit Escape swarm + its one hop opportunity ──
  const rb = s.rabbits
  if (rb) {
    rb.t++
    if (!rb.hopUsed && rb.t <= RABBIT.window && !live(f) && g && !(f.hitstun > 0)) {
      const e = (s.edges.left && s.edges.left.clock > rb.clock0 && s.used.left !== s.edges.left.tick && s.clock - s.edges.left.clock <= 2) ? 'left'
        : (s.edges.right && s.edges.right.clock > rb.clock0 && s.used.right !== s.edges.right.tick && s.clock - s.edges.right.clock <= 2) ? 'right' : null
      if (e) { s.used[e] = s.edges[e].tick; if (startMgMove(f, 'mHop', W, { dir: e === 'right' ? 1 : -1 })) rb.hopUsed = true }
    }
    if (rb.t >= RABBIT.life) s.rabbits = null
  }
  // ── the live move ──
  const A = live(f), m = A?.mg
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = elapsed(A), md = MEGUMI_MOVES[m.key]
  if (m.key !== 'mStep' && m.key !== 'mHop') f.facing = m.dir
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
    A.hasHit = !w || m.hits.includes(w[2])
    if (w && !A.hasHit) { A.damage = dmg(md.hitRaw[w[2]]); A.pushX = md.kb[w[2]][0]; A.launchY = md.kb[w[2]][1] }
  }
  if (md.travel && t >= md.travel[0] && t < md.travel[1] && g) { f.x = noPass(clampX(f.x + m.dir * md.travel[2]), m.dir); f.vx = 0 }
  else if (g && !md.air && !md.launcher && m.key !== 'mStep' && m.key !== 'mHop') f.vx = 0
  if (md.summon && t === md.releaseAt && !m.released) release(f, s, W, m, opp)
  switch (m.key) {
    case 'mStep': {
      if (t >= STEP.startup && t < STEP.startup + STEP.frames) {
        const prev = f.x; f.x = noPass(clampX(f.x + m.dir * STEP.speed), m.dir); f.vx = 0
        if (t % 3 === 0) { s.ghosts.push({ x: Math.round(prev), y: Math.round(f.y), t: 0 }); if (s.ghosts.length > STEP.trail) s.ghosts.shift() }
      } else f.vx = 0
      break
    }
    case 'mHop': if (t < RABBIT.hopFrames) { f.x = noPass(clampX(f.x + m.dir * RABBIT.hop / RABBIT.hopFrames), m.dir) } f.vx = 0; break
    case 'air': if (g && t > 2) endAttack(f, 4); break
    case 'mAirEnd': if (g && t > 2) { endAttack(f, 10); cue(f, 'land') } break
    case 'mAirNue': f.vx = (f.vx || 0) * 0.85; if (g && t > 2) endAttack(f, 6); break
    case 'ultOpen': {
      const z = s.summon
      if (z && z.kind === 'kon' && z.ultHit && !m.ultStarted && g) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateMegumiUlt(f, tg, W) }
      if (t === md.releaseAt + 20 && !m.ultStarted) { s.stats.ultWhiffs++; cue(f, 'ultMiss') }
      break
    }
  }
}

// ══ ULTIMATE — CHIMERA SHADOW GARDEN ═══════════════════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (Rangers / Cyborg / Raven / Robin): activate / isActive / update / clear /
// status. game.js freezes combat, physics and input while active and calls updateMegumiUlt() each frame. Megumi's pose =
// a non-hitting currentAttack on the ult strips; damage = scheduled contacts through W.damage with the combo scale
// captured at confirm. No entity is spawned (every shikigami here is presentation in s.fx), so nothing multiplies the total.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1 }
export const isMegumiUltActive = () => cine.active
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, mg: null, _ultPose: true }
}
export function activateMegumiUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = mgState(f)
  if (s.summon) { killProj(f, W); s.summon = null }
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
  cine.done = i + 1; if (f._megumi?.ult) f._megumi.ult.done = cine.done
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  cue(f, c.kind === 'water' ? 'water' : c.kind === 'nue' ? 'zap' : 'claw')
}
export function updateMegumiUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, d = cine.dir, s = f?._megumi
  if (!f || !t || !s) return clearMegumiUlt()
  const k = cine.frame
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle
  const fr = cine.frame
  let beat = ULT.beats[0]; for (const b of ULT.beats) if (fr >= b.from) beat = b
  pose(f, beat.pose, fr - beat.from)
  f.x = cine.cx0; f.y = cine.floorC
  t.x = cine.tx0; t.vx = 0; t.vy = 0; t.isBlocking = false
  t.y = fr >= 112 && fr < 140 ? cine.floorT - 36 * Math.sin(Math.PI * Math.min(1, (fr - 112) / 28)) : cine.floorT
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 30) s.fx.splice(i, 1)
  if (s.ult) s.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { endAttack(f, 12); f.y = cine.floorC; f.vx = 0; f.vy = 0; const s = f._megumi; if (s) { s.stats.ultDone++; delete s.ult } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearMegumiUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { endAttack(f); f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._megumi) delete f._megumi.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export const getMegumiUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
export function megumiUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  return { frame: cine.frame, cutIn: cine.frame < ULT.cutIn ? cine.frame / ULT.cutIn : null, done: cine.done,
    cx: cine.cx0 + (f.w || 48) / 2, tx: cine.tx0 + (cine.target?.w || 48) / 2, feet: cine.floorC + (f.h || 94), dir: cine.dir }
}
