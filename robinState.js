// Robin (robin) — SIMULATION state. Plain JSON on f._robin (snapshotted for replay / LAN), sim ticks only: no RNG, no
// wall clock. Every export is a no-op for any other rosterKey.
//
// OWNED ENTITIES (each has a stable owner, a serial and a deterministic lifecycle):
//   smoke   ≤ 1 field  { x, y, life, n, stepUsed }          — cover only (no damage / stun / blind / invuln / control loss)
//   plant   ≤ 1 bomb   { x, y, age, life, armed, warn, n }   — Dead Drop; destroyed by an eligible hostile hit / projectile
//   live    thrown / batted bombs = ENGINE projectiles (W.spawn) tagged _rb; gravity + ground / wall / fuse handled here
//   blast   explosion = ENGINE projectile (piercesMulti: one hit per target), live BLAST.active frames, invisible sheet;
//           the complete 11-cell explosion is drawn by robinFx from s.fx
// Bombs never home. Nothing here grants invulnerability, heals or changes stats; a hit on Robin clears his live move.
import { robin as ROBIN_CHAR, ROBIN_MOVES, SMOKE, STEP, BOMB, BLAST, PLANT, REMOTE, ULT, STAFF_KEYS, OUTPLAY_KEYS, COST, dmg } from './robinData.js'

export const isRobin = f => f?.rosterKey === 'robin'
export const rbState = f => f._robin ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, serial: 0, nEnt: 0,
  wasGround: true, floor: null, airBomb: false, airRoof: false, upAge: 0, ownsUp: false,
  smoke: null, plant: null, live: [], outplayUntil: -1, l2: null, prevJc: 0,
  brokeBy: {}, fx: [], ghosts: [],
  stats: { bombs: 0, airBombs: 0, smokes: 0, steps: 0, plants: 0, plantsDestroyed: 0, plantsExpired: 0, detonations: 0, conversions: 0,
    bats: 0, blasts: 0, blastHits: 0, bombHits: 0, express: 0, expressHits: 0, roofs: 0, outplays: 0, rejects: 0, l2Charge: 0,
    ultStarts: 0, ultWhiffs: 0, ultDone: 0, dj: 0 },
  cues: [] }

const E = { startMove: null, comboScale: null }
export function registerRobinEngine(o) { Object.assign(E, o) }
const cue = (f, c) => rbState(f).cues.push(c)
const ultTargets = new WeakMap()
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const tid = t => t?.side || t?.playerNumber || 0
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.rb) ? f.currentAttack : null
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const plantRect = p => ({ x: p.x - PLANT.w / 2, y: p.y - PLANT.h, w: PLANT.w, h: PLANT.h })
const hurtRect = t => ({ x: t.x + 4, y: t.y + 4, w: Math.max(1, (t.w || 48) - 8), h: Math.max(1, (t.h || 94) - 4) })
const fxSheet = (f, name) => f._recolorTag ? `./assets/robin/skins/${f._recolorTag}/fx/${name}_strip.png` : `./assets/robin/fx/${name}_strip.png`
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
function pushFx(s, kind, x, y, dir = 1, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), dir, t: 0, ...(extra || {}) }); if (s.fx.length > 12) s.fx.shift() }
function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }
const floorOf = (f, s) => s.floor ?? (f.groundY ?? ((f.y || 0) + (f.h || 94)))

export function clearRobin(f, W) {
  if (!f) return
  if (cine.active && (cine.caster === f || cine.target === f)) clearRobinUlt()
  if (live(f)) endAttack(f)
  const P = W?.projectiles
  if (P) for (let i = P.length - 1; i >= 0; i--) if (P[i]?.owner === f && P[i]._rb) P.splice(i, 1)
  delete f._robin; delete f._robinRemoteInput; delete f._rbLand
}

// ── Movement lock (game.js updateMovementInput) ──
// Committed moves own the body (a double-tap dash is swallowed, not buffered); the launcher stays free for its jump-cancel.
// SMOKE STEP: a fresh double-tap (`_dashTap`) while Robin stands in HIS live smoke with the field's step unused starts the
// enhanced dash here (consumed atomically); outside smoke the engine's ordinary dash runs untouched.
// Up held WITH Special belongs to Rooftop Route (never a jump); a fresh grounded Up holds the jump 3 f (Up a hair early).
export const UP_GRACE = 3
const upGraceHold = (f, raw) => !!(raw?.up && !f.attacking && grounded(f) && (f._robin?.upAge || 0) < UP_GRACE && !(f.hitstun > 0))
export function inOwnSmoke(f) {
  const z = f?._robin?.smoke; if (!z || z.life <= 0) return false
  const feet = (f.y || 0) + (f.h || 94)
  return Math.abs(ctrX(f) - z.x) <= SMOKE.halfW && feet >= z.y - SMOKE.h && feet <= z.y + SMOKE.stepWindowFeet
}
export function robinLocked(f, raw = null) {
  if (!isRobin(f)) return false
  if (isRobinUltActive()) return true
  const s = rbState(f), a = f.attacking ? f.currentAttack : null
  if (!a && f._dashTap && grounded(f) && !(f.dashCooldown > 0) && !(f.hitstun > 0) && !(f.blockstun > 0) && inOwnSmoke(f) && !s.smoke.stepUsed) {
    const dir = raw ? ((raw.right && !raw.left) ? 1 : (raw.left && !raw.right) ? -1 : (f.facing || 1)) : (f.facing || 1)
    if (startRbMove(f, 'rStep', null)) {
      s.smoke.stepUsed = true; f._dashTap = false
      const m = f.currentAttack.rb; m.dir = dir; m.back = dir !== (f.facing || 1)
      f.dashCooldown = Math.max(f.dashCooldown || 0, f.dashCooldownMax || 26)
      s.stats.steps++; cue(f, 'step')
      return true
    }
  }
  if (a && !(a.launcher && a.hasHit)) { f._dashTap = false; return true }
  if (raw ? (raw.special && raw.up && grounded(f)) : s.ownsUp) return true
  return upGraceHold(f, raw)
}

// L2 / Charge ownership (game.js charge gate): while an ARMED planted bomb exists, or a Remote Override press is still
// held, L2 is Remote Override and must not recharge energy. With no armed device L2 stays the ordinary shared charge.
export function robinOwnsCharge(f) {
  if (!isRobin(f)) return false
  const s = f._robin; if (!s) return false
  return !!(s.plant?.armed || s.l2)
}

// Start one of Robin's moves through combat.startMove (frameExact path) and attach the descriptor `rb`.
// Every legality / resource check happens BEFORE anything is spent.
export function startRbMove(f, key, W, { cancel = false } = {}) {
  if (!isRobin(f)) return false
  const s = rbState(f), md = ROBIN_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  const airOnly = ['air', 'rAirBomb'], either = ['rRoof', 'rHack']
  if (!airOnly.includes(key) && !either.includes(key) && !g) return false
  if (airOnly.includes(key) && g) return false
  if (key === 'rAirBomb' && s.airBomb) { reject(f); return false }
  if (key === 'rRoof' && !g && s.airRoof) { reject(f); return false }
  if (key === 'rPlant' && s.plant) { reject(f); return false }                     // max one planted bomb (refused, nothing spent)
  const cost = md.cost || 0
  if ((f.energy || 0) < cost) { reject(f); return false }
  if (cancel) endAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (cost) f.energy = Math.max(0, (f.energy || 0) - cost)
  f.currentMove = key
  const a = f.currentAttack
  a.rb = { key, dir: f.facing || 1, clean: false, blocked: false, serial: ++s.serial, hits: [], hitN: 0, released: false, landed: false }
  a.hasHit = !!md.noBody || !!md.hits                                             // scheduled moves open their own windows
  f.isBlocking = false; f.isCharging = false
  if (g && !md.air) f.vx = 0
  if (key === 'up' || key === 'rRoof') f.jumpHeld = true
  if (key === 'rAirBomb') { s.airBomb = true; s.stats.airBombs++ }
  if (key === 'rRoof') { if (!g) s.airRoof = true; s.stats.roofs++; cue(f, 'roof') }
  else if (key === 'rExpress') { s.stats.express++; cue(f, 'express') }
  else if (key === 'ultOpen') { s.stats.ultStarts++; cue(f, 'ultStart') }
  else if (key === 'rHack') cue(f, 'hack')
  else if (key === 'rStep') { /* cue set by robinLocked */ }
  else if (md.noBody) cue(f, 'throwWind')
  else cue(f, md.staff ? 'staff' : 'swing')
  return true
}
function reject(f) { const s = rbState(f); s.stats.rejects++; cue(f, 'reject') }

// ── combat.js hooks (robin-gated) ──
export function robinHitbox(f) {
  const a = f.currentAttack, m = a?.rb, md = ROBIN_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 18), w: a.rangeX, h: a.rangeY }
}
export function robinBlock(f, d, a) {
  if (!isRobin(f) || !a?.rb) return
  const md = ROBIN_MOVES[a.rb.key]
  d.blockstun = md.blockstun; a.rb.blocked = true
  if (md.hits) markWindow(a)
}
function markWindow(a) {
  const md = ROBIN_MOVES[a.rb.key], t = elapsed(a)
  const w = md.hits.find(([from, to]) => t >= from && t <= to)
  if (w && !a.rb.hits.includes(w[2])) { a.rb.hits.push(w[2]); a.rb.hitN++ }
  return w
}
export function robinHit(f, d, a, { armored = false } = {}) {
  if (!isRobin(f) || !a?.rb) return
  const md = ROBIN_MOVES[a.rb.key], s = rbState(f)
  if (md.hits) { const w = markWindow(a); if (w && a.rb.key === 'rExpress') s.stats.expressHits++ }
  if (armored) return                                   // armor-absorbed: not clean → no OUTPLAY, no ult confirm
  a.rb.clean = true; f._cmdHitLanded = true
  // SMOKE EXIT → OUTPLAY: a clean normal / staff hit shortly after a valid Smoke Step. Cosmetic cue only.
  if (OUTPLAY_KEYS.includes(a.rb.key) && s.clock <= s.outplayUntil && !d.isBlocking && !a.rb.blocked) {
    s.outplayUntil = -1; s.stats.outplays++; cue(f, 'outplay'); pushFx(s, 'outplay', ctrX(f), f.y - 10)
  }
  if (a.rb.key === 'ultOpen' && d.health > 0 && !a.rb.blocked) { a.rb.ultHit = true; ultTargets.set(f, d) }
}
// Thrown / batted bomb and blast bookkeeping (engine projectile contact). Never changes damage.
export function robinProjectileHit(proj, target, { armored = false } = {}) {
  const k = proj?._rb; if (!k || !isRobin(proj.owner)) return
  const s = rbState(proj.owner)
  const e = s.live.find(q => q.n === k.n); if (e) { e.hit = true; e.x = proj.x; e.y = proj.y }
  if (k.kind === 'blast') s.stats.blastHits++; else s.stats.bombHits++
}

// ── entity helpers ──
function makeSmoke(f, s, x, y, why) {
  const cx = Math.max(SMOKE.halfW / 2, Math.min(x, 1e9))
  s.smoke = { x: Math.round(cx), y: Math.round(y), life: SMOKE.life, n: ++s.nEnt, stepUsed: false, why }   // replaces any previous field (max one)
  s.stats.smokes++; cue(f, 'smoke'); pushFx(s, 'smokePuff', cx, y)
}
function spawnBomb(f, s, W, kind, x, y, vx, vy) {
  const pr = W?.spawn?.(f, 'robin_bomb', { damage: dmg(BOMB.raw), speed: Math.abs(vx) || 1, vx, vy, spawnX: x, spawnY: y,
    w: BOMB.r * 2, h: BOMB.r * 2, radius: BOMB.r, lifetime: 400, hitstun: BOMB.hitstun, knockbackX: BOMB.kbx, knockbackY: BOMB.kby,
    sheet: fxSheet(f, 'bomb'), spriteFrames: 1, spriteW: 16, spriteH: 7, spriteSpeed: 4, spriteScale: 2.2, color: '#5a8cd8', isSpecial: true })
  if (!pr) return null
  pr.damageType = 'explosive'; pr.noTrail = true
  pr._rb = { kind, n: ++s.nEnt, fuse: BOMB.fuse }
  s.live.push({ n: pr._rb.n, kind, x: pr.x, y: pr.y, hit: false, age: 0 })
  return pr
}
// The blast: an invisible engine projectile, one hit per target (piercesMulti), damaging for BLAST.active frames only.
function explode(f, s, W, x, y, raw, why) {
  const r = BLAST.r
  const pr = W?.spawn?.(f, 'robin_blast', { damage: dmg(raw), speed: 1, vx: 0, vy: 0, spawnX: x, spawnY: y - r * 0.8, w: r * 2, h: r * 2, radius: r,
    lifetime: BLAST.active + 1, hitstun: BLAST.hitstun, knockbackX: BLAST.kbx, knockbackY: BLAST.kby, piercesMulti: true,
    sheet: './assets/robin/fx/blank.png', spriteFrames: 1, spriteW: 1, spriteH: 1, isSpecial: true, color: '#ffb030' })
  if (pr) { pr.damageType = 'explosive'; pr.noTrail = true; pr._rb = { kind: 'blast', n: ++s.nEnt }; s.live.push({ n: pr._rb.n, kind: 'blast', x, y, hit: false, age: 0 }) }
  s.stats.blasts++; cue(f, 'blast'); pushFx(s, 'blast', x, y, 1, { why })
}
function plantBomb(f, s, W, dir) {
  const x = Math.max(PLANT.w, Math.min(sw(W) - PLANT.w, ctrX(f) + dir * PLANT.ahead))
  s.plant = { x: Math.round(x), y: Math.round(floorOf(f, s)), age: 0, life: PLANT.life, armed: false, warn: 0, n: ++s.nEnt, dir }
  s.stats.plants++; cue(f, 'plant')
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer) ──
export function tickRobin(f, opp, raw, W) {
  if (!isRobin(f)) { if (f?._robin) clearRobin(f, W); return }
  // Round/match reset: game.js runs the shared revertGoku(_f) on EVERY fighter AFTER clearRobin, stamping speed 84 /
  // dash 16 (the same clobber arlongRoundReset / zoroRoundReset undo). The first tick of a fresh Robin state re-applies
  // his authored Toji-tier speed 98 / dash 22 — only over that exact stamp, so a match modifier (speedUp) is kept.
  if (!f._robin && f.baseSpeed === 84 && f.dashSpeed === 16) { const st = ROBIN_CHAR.stats; f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed }
  const s = rbState(f); s.tick++
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'charge']) {
    const v = !!raw[k]
    if (v && !s.prev[k] && k !== 'up') s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    s.prev[k] = v
  }
  s.ownsUp = !!(raw.special && raw.up)
  s.upAge = raw.up ? (s.upAge || 0) + 1 : 0
  if ((raw.up || raw.jump) && raw.special && grounded(f)) s.upConsumed = true
  if (!raw.up && !raw.jump) s.upConsumed = false
  if (s.upConsumed) f.jumpHeld = true
  else if (!raw.up && !raw.jump && f.jumpHeld && f.hitstop > 0) f.jumpHeld = false
  const g = grounded(f)
  if (g) s.floor = (f.y || 0) + (f.h || 94)
  else if (s.floor == null) s.floor = f.groundY ?? null
  const a = live(f)
  if (g && !s.wasGround) {                                        // genuine landing: airtime allowances reset
    s.airBomb = false; s.airRoof = false
    if (!f.attacking && !(f.hitstun > 0)) f._rbLand = 16
  }
  if (g && !a) { s.airBomb = false; s.airRoof = false }
  // SMOKE VANISH: the shared speed-tier teleport (double-tap toward the foe) is dressed as a smoke-bomb blink — a smoke
  // burst where Robin vanished and where he reappears behind the foe, the Smoke Drop throw pose, and the smoke cue
  // instead of the generic white flash. Presentation only: the engine owns the blink (position, cooldown, lockout).
  if (f.teleportFlash > 0 && s.lastX != null && Math.abs((f.x || 0) - s.lastX) > 40) {
    // the shared speed-tier blink parks him beside the foe on HIS side; Robin's smoke vanish finishes on the FAR side,
    // facing back at them (stage-clamped — against a wall it stays the shared same-side blink)
    if (opp && !opp.isDead) {
      const fromLeft = s.lastX < (opp.x || 0), w = f.w || 48
      const bx = fromLeft ? (opp.x || 0) + (opp.w || 48) + 8 : (opp.x || 0) - w - 8
      if (bx >= 0 && bx <= sw(W) - w) { f.x = bx; f.facing = fromLeft ? -1 : 1 }
    }
    pushFx(s, 'smokePuff', s.lastX + (f.w || 48) / 2, s.lastFeet ?? floorOf(f, s)); pushFx(s, 'smokePuff', ctrX(f), (f.y || 0) + (f.h || 94))
    f.teleportFlash = 0; f._spriteCastMove = 'rSmoke'; f._spriteCastTimer = 14; s.stats.vanishes = (s.stats.vanishes || 0) + 1; cue(f, 'smoke')
  }
  s.lastX = f.x || 0; s.lastFeet = (f.y || 0) + (f.h || 94)
  if (f._rbLand > 0) f._rbLand--
  if (f.hitstun > 0 || f.attacking) f._rbLand = 0
  const jc = f.jumpCount || 0; if (!g && jc >= 2 && s.prevJc < 2) { s.stats.dj++; cue(f, 'doubleJump') } ; s.prevJc = g ? 0 : jc
  s.wasGround = g
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > (s.fx[i].kind === 'blast' ? BLAST.fxFrames : 30)) s.fx.splice(i, 1)
  if (f.health <= 0) { if (s.l2) s.l2 = null; return }
  if (f.hitstop > 0) return
  s.clock++
  // ── interruption: a hit / grab ends the live move (and any pending L2 command) ──
  if (a && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) { endAttack(f); s.l2 = null }
  // ── smoke field ──
  if (s.smoke && --s.smoke.life <= 0) s.smoke = null
  // ── own bombs (engine projectiles): gravity, floor / wall / fuse detonation ──
  const P = W?.projectiles || []
  for (let i = s.live.length - 1; i >= 0; i--) {
    const e = s.live[i], p = P.find(q => q?.owner === f && q._rb?.n === e.n)
    if (!p) {                                                    // removed by the engine: contact (hit / block) or out of bounds
      if (e.kind !== 'blast' && e.hit) { pushFx(s, 'blast', e.x, e.y + BLAST.r * 0.4, 1, { why: 'contact' }); cue(f, 'blast'); s.stats.blasts++ }
      s.live.splice(i, 1); continue
    }
    e.age++; e.x = p.x; e.y = p.y
    if (e.kind === 'blast') { if (e.age >= BLAST.active) p.visualOnly = true; continue }   // damaging window over: presentation only
    p.vy = Math.min(BOMB.vmax, (p.vy || 0) + (BOMB[e.kind === 'lob' ? 'ground' : e.kind]?.g ?? BOMB.g))   // straight throws: g 0
    const floor = floorOf(f, s), atFloor = p.y + BOMB.r >= floor, atWall = p.x <= BOMB.r || p.x >= sw(W) - BOMB.r
    if (atFloor || atWall || e.age >= p._rb.fuse) {
      P.splice(P.indexOf(p), 1); s.live.splice(i, 1)
      explode(f, s, W, Math.max(BOMB.r, Math.min(sw(W) - BOMB.r, p.x)), atFloor ? floor : p.y + BLAST.r * 0.8, BLAST.raw, e.kind)
    }
  }
  // ── planted bomb: arming, lifetime, remote warning, hostile destruction ──
  const z = s.plant
  if (z) {
    z.age++
    if (!z.armed && z.age >= PLANT.arm) { z.armed = true; cue(f, 'armed') }
    if (z.warn > 0 && --z.warn === 0) { s.plant = null; s.stats.detonations++; explode(f, s, W, z.x, z.y, BLAST.remoteRaw, 'remote') }
    else if (--z.life <= 0) { s.plant = null; s.stats.plantsExpired++; pushFx(s, 'fizzle', z.x, z.y); cue(f, 'fizzle') }
  }
  if (s.plant) {
    for (const o of foesOf(f, W, opp)) {                         // one eligible hostile attack instance destroys it (no explosion)
      const box = W?.attackBox?.(o); if (!box) continue
      if (overlap(box, plantRect(s.plant))) { destroyPlant(f, s, 'hostile'); break }
    }
    if (s.plant) for (const q of P) {
      if (!q || q.owner === f || q.visualOnly || (q.owner?.team && f.team && q.owner.team === f.team)) continue
      const r = q.radius || 10
      if (overlap({ x: q.x - r, y: q.y - r, w: r * 2, h: r * 2 }, plantRect(s.plant))) { destroyPlant(f, s, 'projectile'); break }
    }
  }
  // ── the live move ──
  const m = a?.rb
  if (!m || f.hitstun > 0 || f.isGrabbed) { if (!a && s.l2 && !raw.charge) s.l2 = null; return }
  const t = elapsed(a), md = ROBIN_MOVES[m.key]
  if (m.key !== 'rStep') f.facing = m.dir
  const clampX = x => Math.max(0, Math.min(sw(W) - f.w, x))
  const noPass = (x, dir) => {                                   // never through the opponent's body
    for (const o of foesOf(f, W, opp)) {
      const oL = o.x, oR = o.x + o.w
      if (Math.abs((o.y + o.h) - (f.y + f.h)) > (o.h || 94)) continue
      if (dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w)
      if (dir < 0 && f.x >= oR - 1) x = Math.max(x, oR)
    }
    return x
  }
  // explicit multi-hit schedule: the hitbox exists only inside an unused window
  if (md.hits) {
    const w = md.hits.find(([from, to]) => t >= from && t <= to)
    a.hasHit = !w || m.hits.includes(w[2])
    if (w && !a.hasHit) { a.damage = dmg(md.hitRaw[w[2]]); const push = w[2] === 'push'; a.pushX = push ? md.pushKb[0] : md.knockbackX; a.launchY = push ? md.pushKb[1] : md.knockbackY }
  }
  if (md.travel && t >= md.travel[0] && t < md.travel[1] && g) { f.x = noPass(clampX(f.x + m.dir * md.travel[2]), m.dir); f.vx = 0 }
  else if (g && !md.air && m.key !== 'up' && m.key !== 'rRoof' && m.key !== 'rStep') f.vx = 0
  // BOMB BAT: an active staff hitbox meeting Robin's own ARMED planted bomb converts it into ONE travelling bomb
  if (STAFF_KEYS.includes(m.key) && s.plant?.armed && !s.plant.warn && t >= a.activeStart && t <= a.activeEnd) {
    const b0 = robinHitbox(f), box = { ...b0, h: Math.max(b0.h, floorOf(f, s) - b0.y) }   // the swinging staff scoops a floor-level bomb
    if (b0.w > 0 && overlap(box, plantRect(s.plant))) {
      const p0 = s.plant; s.plant = null                          // consumed atomically: no duplicate, no double explosion
      spawnBomb(f, s, W, 'bat', p0.x, p0.y - PLANT.h, m.dir * BOMB.bat.vx, BOMB.bat.vy)
      s.stats.bats++; cue(f, 'bat'); pushFx(s, 'bat', p0.x, p0.y - PLANT.h)
    }
  }
  switch (m.key) {
    case 'rBomb': case 'rAirBomb': if (t === md.releaseAt && !m.released) {
      m.released = true; s.stats.bombs++; cue(f, 'throw')
      const P0 = m.key === 'rBomb' ? BOMB.ground : BOMB.air
      spawnBomb(f, s, W, m.key === 'rBomb' ? 'lob' : 'air', ctrX(f) + m.dir * ((f.w || 48) / 2 + 6), f.y + (f.h || 94) * (m.key === 'rBomb' ? 0.3 : 0.5), m.dir * P0.vx, P0.vy)
    }
      if (m.key === 'rAirBomb') { f.vx = (f.vx || 0) * 0.85; if (g && t > 2) { endAttack(f, 6) } }
      break
    case 'rSmoke': if (t === md.releaseAt && !m.released) { m.released = true; makeSmoke(f, s, ctrX(f) + m.dir * 8, floorOf(f, s), 'drop') } break
    case 'rPlant': if (t === md.releaseAt && !m.released) { m.released = true; plantBomb(f, s, W, m.dir) } break
    case 'rStep': {
      if (t < STEP.frames) {
        const prev = f.x; f.x = noPass(clampX(f.x + m.dir * STEP.speed), m.dir); f.vx = 0
        if (t % 3 === 0) { s.ghosts.push({ x: Math.round(prev), y: Math.round(f.y), t: 0 }); if (s.ghosts.length > STEP.ghosts) s.ghosts.shift() }
      } else f.vx = 0
      if (t === STEP.frames) s.outplayUntil = s.clock + STEP.outplayWindow
      break
    }
    case 'rRoof': {
      const R = md.rise
      if (t === R.at) { f.vy = R.vy; f.vx = m.dir * R.vx; f.onGround = false; f.grounded = false; f.jumpCount = Math.max(f.jumpCount || 0, 1); s.airRoof = true }
      if (t > R.at + 2 && g) { endAttack(f, 8); cue(f, 'land') }
      break
    }
    case 'rHack': tickHack(f, s, a, m, t, raw, W); break
    case 'ultOpen':
      if (m.clean && m.ultHit && !m.ultStarted) { const tg = ultTargets.get(f); ultTargets.delete(f); m.ultStarted = true; if (tg && tg.health > 0) activateRobinUlt(f, tg, W) }
      if (t === a.activeEnd + 1 && !m.clean) { s.stats.ultWhiffs++; cue(f, 'ultMiss') }
      break
    case 'air': if (g && t > 2) endAttack(f, 4); break
  }
  for (let i = s.ghosts.length - 1; i >= 0; i--) if (++s.ghosts[i].t > 14) s.ghosts.splice(i, 1)
}
function destroyPlant(f, s, why) { const z = s.plant; s.plant = null; s.stats.plantsDestroyed++; pushFx(s, 'fizzle', z.x, z.y, 1, { why }); cue(f, 'fizzle') }

// ── REMOTE OVERRIDE: exclusive tap / hold resolution on ONE L2 press ──
//   press (edge, armed bomb) → rHack starts, s.l2 = { phase: 'held', t0 } ; L2 owns the press until it is released.
//   held past REMOTE.hold → CONVERT (bomb → smoke at its spot, no damage) → phase 'done'; the later release does nothing.
//   released before the threshold → DETONATE once (fixed PLANT.warn warning) → phase 'done'.
//   A hit during the command clears the move and the pending command (nothing fires).
export function startRemote(f, W) {
  const s = rbState(f)
  if (!s.plant?.armed || s.plant.warn) return false
  if (!startRbMove(f, 'rHack', W)) return false
  const a = f.currentAttack; a.timer = a.total = 400; a.activeStart = 999; a.activeEnd = 999   // held command pose; ends by policy
  s.l2 = { phase: 'held', t0: s.clock, n: s.plant.n }
  return true
}
function tickHack(f, s, a, m, t, raw, W) {
  const q = s.l2
  if (!q || q.phase === 'done') { if (q && !raw.charge) s.l2 = null; return }
  const finish = rem => { a.timer = Math.min(a.timer, rem) }
  if (!s.plant || s.plant.n !== q.n) { q.phase = 'done'; finish(8); return }   // the device is gone (destroyed / expired)
  if (raw.charge && t >= REMOTE.hold) {
    const z = s.plant; s.plant = null; q.phase = 'done'
    makeSmoke(f, s, z.x, z.y, 'remote'); s.stats.conversions++; cue(f, 'convert'); finish(REMOTE.afterConvert)
    return
  }
  if (!raw.charge) {
    q.phase = 'done'; s.l2 = null
    s.plant.warn = PLANT.warn; cue(f, 'detonateCmd'); finish(Math.max(4, REMOTE.tapTotal - t))
  }
}

// ══ ULTIMATE — CHECKMATE: LIGHTS OUT ═══════════════════════════════════════════════════════════════════════════
// The existing FROZEN-CINEMATIC contract (same as the Rangers / Cyborg / Beast Boy / Raven): activate / isActive /
// update / clear / status. While active, game.js freezes combat, physics and input and calls updateRobinUlt() each
// frame. Robin's pose = a non-hitting currentAttack on the ult strips; damage = scheduled contacts through W.damage with
// the combo scale captured at confirm. No entity is spawned (the bomb / smoke / blast are presentation in s.fx), so
// nothing can multiply the total or outlive the cinematic.
const cine = { active: false, frame: 0, caster: null, target: null, W: null, floorC: 0, floorT: 0, cx0: 0, tx0: 0, dir: 1, done: 0, scale: 1 }
export const isRobinUltActive = () => cine.active
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, rb: null, _ultPose: true }
}
export function activateRobinUlt(f, target, W) {
  if (cine.active || !f || !target) return false
  const s = rbState(f)
  s.l2 = null
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
  cine.done = i + 1; if (f._robin?.ult) f._robin.ult.done = cine.done
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate' })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  cue(f, c.kind === 'blast' ? 'blast' : 'staffHit')
}
export function updateRobinUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, d = cine.dir, s = f?._robin
  if (!f || !t || !s) return clearRobinUlt()
  const k = cine.frame
  for (let i = 0; i < ULT.contacts.length; i++) if (k === ULT.contacts[i].at && cine.done === i) ultHit(i)
  const W = cine.W, clampX = (o, x) => Math.max(0, Math.min(sw(W) - (o.w || 48), x))
  const stand = clampX(f, cine.tx0 - d * ((f.w || 48) + 8))           // the target's near side — never through it
  const feetT = cine.floorT + (t.h || 94)
  if (k === 30) { pushFx(s, 'smokePuff', ctrX(f), cine.floorC + (f.h || 94)); cue(f, 'smoke') }
  if (k === 112) cue(f, 'hack')
  if (k === 120) { pushFx(s, 'ultBomb', cine.tx0 + (t.w || 48) / 2, feetT, d, { life: 30 }); cue(f, 'armed') }
  if (k === 150) { pushFx(s, 'blast', cine.tx0 + (t.w || 48) / 2, feetT, 1, { why: 'ult' }) }
  if (!(t.health > 0) && k < ULT.settle) cine.frame = ULT.settle
  const fr = cine.frame
  let beat = ULT.beats[0]; for (const b of ULT.beats) if (fr >= b.from) beat = b
  pose(f, beat.pose, fr - beat.from)
  f.y = cine.floorC
  if (fr < 30) f.x = clampX(f, cine.cx0)
  else if (fr < 48) { const u = (fr - 30) / 17; f.x = cine.cx0 + (stand - cine.cx0) * u }   // short physical move inside the smoke
  else if (fr < 150) f.x = stand
  else if (fr < 172) { const u = (fr - 150) / 22, back = clampX(f, stand - d * 90); f.x = stand + (back - stand) * u; f.y = cine.floorC - 60 * Math.sin(Math.PI * u) }
  else f.x = clampX(f, stand - d * 90)
  t.x = clampX(t, cine.tx0); t.vx = 0; t.vy = 0; t.isBlocking = false
  t.y = fr >= 96 && fr < 140 ? cine.floorT - 40 * Math.sin(Math.PI * Math.min(1, (fr - 96) / 44)) : cine.floorT
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > (s.fx[i].kind === 'blast' ? BLAST.fxFrames : 30)) s.fx.splice(i, 1)
  if (s.ult) s.ult.frame = fr
  if (++cine.frame >= ULT.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) } }
  if (f) { endAttack(f, 12); f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._robin; if (s) { s.stats.ultDone++; delete s.ult } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
// Every reset path (round reset, rematch, KO teardown, training reset, identity replacement): restore and drop.
export function clearRobinUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { endAttack(f); f.y = cine.floorC; f.vx = 0; f.vy = 0; if (f._robin) { delete f._robin.ult; f._robin.fx = f._robin.fx.filter(x => x.kind !== 'ultBomb') } }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, done: 0 })
}
export const getRobinUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, caster: cine.caster?.side || null })
export function robinUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  return { frame: cine.frame, cutIn: cine.frame < ULT.cutIn ? cine.frame / ULT.cutIn : null, done: cine.done }
}
export const ROBIN_COST = COST
