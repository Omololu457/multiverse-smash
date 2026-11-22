// Ryomen Sukuna — Shinjuku Arc (sukuna_shinjuku) — SIMULATION state + combat.js hooks. Plain JSON on f._sks (snapshotted
// for the determinism hash, carried by replay / LAN through the inputs that produce it); sim ticks only: no RNG, no wall
// clock. Every export is a no-op for any other rosterKey. Engine functions arrive through registerSksEngine (set by
// sukunaShinjuku.js) so this file imports no engine module (combat.js imports it for the hooks — no cycle).
//
// OWNED ENTITIES (deterministic lifecycle, capped): cuts ≤ 6 (Dismantle), arrows ≤ 2 (Fuga), fire field ≤ 4 patches
// (elements.js), world ≤ 1 (World-Cutting Slash), fx ≤ 24 (render hints). Nothing here touches the OLD Sukuna (`sukuna`):
// his Malevolent Shrine is opened through activateDomain(..., { domainKey: 'sukuna' }) — the shared domain code path.
import { SKS_KEY, SKS_MOVES, COST, DISMANTLE, CLEAVE, WEB, FUGA, AMP, WORLD, SHRINE, TECHNIQUES, NORMALS, QUOTES, SCREEN, BAR, dmg } from './sukunaShinjukuData.js'
import { createField, addPatch, removePatch, tickField, applyPatchEffects, reactionFor } from './elements.js'
import { isSuperProjectile } from './limitless.js'

export const isSks = f => f?.rosterKey === SKS_KEY
let _W = null
const E = { startMove: null, comboScale: null, activateDomain: null, activeDomains: null }
export function registerSksEngine(o) { Object.assign(E, o) }

export const sksState = f => {
  if (f._sks) return f._sks
  return (f._sks = { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, dirs: [], serial: 0,
    cd: { amp: 0 }, amp: 0, cuts: [], arrows: [], world: null, burns: {}, field: createField(4), floor: null,
    dom: { mine: false }, empUntil: -1, say: null, said: { intro: false, win: false }, sawInf: -1,
    cpu: null, fx: [], cues: [],
    stats: { cuts: 0, cutHits: 0, cutProj: 0, cleaves: 0, cleaveHits: 0, cleaveLast: 0, armorCut: 0, webs: 0, webHits: 0, trapsCleared: 0,
      patchesCleared: 0, fuga: 0, fugaLv: 0, fugaHits: 0, empowered: 0, burnTicks: 0, firePatches: 0, reactions: 0, amps: 0, ampBypass: 0,
      worlds: 0, worldHits: 0, worldCancelled: 0, shrines: 0, stopped: 0, techLocked: 0, fugaCancelled: 0, spent: 0, refunded: 0 } })
}
const cue = (f, c, extra) => { const s = sksState(f); s.cues.push(extra ? { c, ...extra } : c); if (s.cues.length > 32) s.cues.shift() }
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.sks) ? f.currentAttack : null
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
const boxHit = (o, x, y, w, h) => o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y
function pushFx(s, kind, x, y, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), t: 0, ...(extra || {}) }); if (s.fx.length > 24) s.fx.shift() }
export function endSksAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }

export function clearSks(f) {
  if (!f) return
  if (live(f)) endSksAttack(f)
  delete f._sks; delete f._sksRemoteInput; delete f._sksAmp
}
export function clearSksMarks(f) { if (!f) return; delete f._sksBurn }

// ── public reads (HUD / harness / AI / Gojo's canon bypasses) ──
export const sksAmpActive = f => !!(isSks(f) && (f._sksAmp || 0) > 0)
export const sksEmpowered = f => !!(isSks(f) && f._sks && f._sks.empUntil > f._sks.clock)

// ── combat.js hooks (his normals are engine melee moves) ──
export function sksHitbox(f) {
  const a = f.currentAttack, m = a?.sks, md = SKS_MOVES[m?.key]
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 18), w: a.rangeX, h: a.rangeY }
}
export function sksBlock(f, d, a) {
  if (!isSks(f) || !a?.sks) return
  d.blockstun = SKS_MOVES[a.sks.key].blockstun; a.sks.contact = true; a.sks.contactTick = sksState(f).tick
}
export function sksHit(f, d, a) {
  if (!isSks(f) || !a?.sks) return
  const s = sksState(f), m = a.sks
  m.contact = true; m.contactTick = s.tick
  if (d.isBlocking) return
  m.clean = true; f._cmdHitLanded = true
  if (s.amp > 0 && d.rosterKey === 'gojo_shinjuku' && (d._gs?.inf?.lv || 0) > 0) s.stats.ampBypass++
}

// ── STRIKE: the one hit path for his technique volumes (cuts, Cleave, Spiderweb, Fuga, World Slash). Damage leaves
//    through the damage choke-point (applyScaledDamage), so every damage-level defence applies — Satoru Gojo's Infinity
//    included: a strike his Infinity zeroes is "stopped" (no hitstun, no knockback).
function strike(f, t, P, W) {
  if (!t || !(t.health > 0) || t._banished || t._cubeTrapUntouchable) return 'miss'
  if ((t.invulnTimer || 0) > 0) return 'miss'                              // invulnerable frames dodge everything (World Slash too)
  if (t.domainUntouchable && !P.domainOk) return 'miss'                   // the Shrine's sure-hit foe: only the domain cuts (combat.js rule) — Fuga still connects, as the old Sukuna's does
  if (t.knockdownState && !P.otg) return 'miss'
  if (t._gs?.blink?.inv) return 'miss'
  const s = sksState(f), dir = P.dir ?? (ctrX(t) >= ctrX(f) ? 1 : -1)
  const facingSrc = (t.facing || 1) === -dir
  const guards = t.isBlocking && facingSrc && !P.unblockable && (!P.low || !!t._crouching)
  if (guards) {
    W.damage(t, dmg(Math.max(1, Math.round(P.raw * (P.chip ?? 0.12)))), { source: 'sks-chip', attacker: f, move: P.move, damageType: P.type || 'slash' })
    t.blockstun = Math.max(t.blockstun || 0, P.blockstun || 14)
    cue(f, 'blocked'); pushFx(s, 'block', ctrX(t), ctrY(t))
    return 'block'
  }
  const armored = !!(t._bossArmor || (t._castArmor || 0) > 0 || t.currentAttack?.superArmor)
  const hp0 = t.health
  const scale = E.comboScale ? E.comboScale(f) : 1
  W.damage(t, dmg(P.raw) * scale, { source: 'sks-technique', attacker: f, move: P.move, damageType: P.type || 'slash' })
  if (t.rosterKey === 'gojo_shinjuku' && (t._gs?.inf?.lv || 0) > 0 && t.health >= hp0) {   // Infinity: never touched
    s.stats.stopped++; s.sawInf = s.clock; cue(f, 'stopped'); return 'stopped'
  }
  t.hitstun = Math.max(t.hitstun || 0, P.hitstun || 16)
  t.isBlocking = false
  if (P.cut || armored) { if (t.attacking && !t.currentAttack?.isUltimate) { t.attacking = false; t.currentAttack = null; t.currentMove = null } }   // one stroke: armor / super armor don't hold
  if (armored) s.stats.armorCut++
  if (P.kbx != null) t.vx = dir * P.kbx
  if (P.kby != null && P.kby !== 0) { t.vy = P.kby; if (P.kby < 0) { t.onGround = false; t.grounded = false } }
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 6
  f.energy = Math.min(f.maxEnergy || 210, (f.energy || 0) + Math.round(P.raw * 0.08))
  if (P.hitstop) { f.hitstop = Math.max(f.hitstop || 0, P.hitstop); t.hitstop = Math.max(t.hitstop || 0, P.hitstop) }
  pushFx(s, P.fx || 'spark', ctrX(t), ctrY(t), { dir })
  return 'hit'
}

// ── input edges + facing-relative motion buffer (numpad digits; 5 = neutral) — Gojo Shinjuku's reader, copied ──
const numpad = (raw, facing) => {
  const fw = facing === -1 ? raw.left : raw.right, bk = facing === -1 ? raw.right : raw.left
  const h = fw && !bk ? 1 : bk && !fw ? -1 : 0, v = raw.down && !raw.up ? -1 : raw.up && !raw.down ? 1 : 0
  return 5 + h + v * 3
}
function readEdges(f, s, raw) {
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'charge', 'grab', 'left', 'right', 'down']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk }
    if (!v && s.prev[k]) s.edges[k + 'Up'] = { tick: s.tick }
    s.prev[k] = v
  }
  const d = numpad(raw, f.facing || 1)
  if (!s.dirs.length || s.dirs[s.dirs.length - 1].d !== d) { s.dirs.push({ d, t: s.tick }); if (s.dirs.length > 16) s.dirs.shift() }
}
function motion(s, seq, win = 20, tail = 8) {
  let i = seq.length - 1
  for (let j = s.dirs.length - 1; j >= 0 && i >= 0; j--) {
    const e = s.dirs[j]
    if (s.tick - e.t > win) break
    if (e.d === seq[i]) { if (i === seq.length - 1) { const next = s.dirs[j + 1]; if (next && s.tick - next.t > tail) return false } i-- }
  }
  return i < 0
}
export const fresh = (s, k, win = 8) => !!(s.edges[k] && s.used[k] !== s.edges[k].tick && s.tick - s.edges[k].tick <= win)
export const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
export const MOTIONS = {
  downBack: s => motion(s, [2, 4], 16) || motion(s, [1, 4], 16) || motion(s, [2, 1], 16),
  downDown: s => { let n = 0, seen5 = false; for (let j = s.dirs.length - 1; j >= 0; j--) { const e = s.dirs[j]; if (s.tick - e.t > 24) break; if (e.d === 2 || e.d === 1 || e.d === 3) { if (seen5 || n === 0) n++; seen5 = false } else if (e.d === 5) seen5 = true } return n >= 2 },
}

// ── START A MOVE (combat.startMove frameExact path + the `sks` descriptor). Every check happens before anything is spent.
export function startSksMove(f, key, W, o = {}) {
  if (!isSks(f)) return false
  const s = sksState(f), md = SKS_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed) return false
  if ((TECHNIQUES.has(key) || key === 'kShrine') && (f._gsTechBurnout || 0) > 0) { s.stats.techLocked++; cue(f, 'reject'); return false }   // lost a domain clash to Satoru Gojo
  if (TECHNIQUES.has(key) && s.amp > 0) { s.stats.techLocked++; cue(f, 'reject'); return false }         // Domain Amplification trade-off
  if (md.air && g) return false
  if (md.airOnly && g) return false
  if (!md.air && !md.airOk && !g) return false
  if (key === 'kAmp' && (s.amp > 0 || s.cd.amp > 0)) { cue(f, 'reject'); return false }
  if (key === 'kShrine' && ((f.ultimateCooldown || 0) > 0 || (!f.infiniteEnergy && (f.energy || 0) < (f.maxEnergy || 0)))) { cue(f, 'reject'); return false }
  const cost = md.cost || 0, bars = (md.bars || 0) * BAR
  if (!f.infiniteEnergy && (f.energy || 0) < cost + bars) { cue(f, 'reject'); return false }
  if (o.cancel) endSksAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (!f.infiniteEnergy) { f.energy = Math.max(0, (f.energy || 0) - cost - bars); s.stats.spent += cost + bars }
  f.currentMove = key
  const a = f.currentAttack
  a.sks = { key, dir: o.dir ?? (f.facing || 1), serial: ++s.serial, released: false, contact: false, clean: false, lv: o.lv || 0, emp: !!o.emp, fired: [] }
  a.hasHit = !!md.noBody
  if (md.isUltimate) a.isUltimate = true
  if (md.super) a.super = true
  f.isBlocking = false; f.isCharging = false
  if (g && !md.air && !md.travel) f.vx = 0
  if (key === 'kC') f.jumpHeld = true
  if (key === 'kShrine') shrine(f, s)
  if (key === 'kWorld') { s.world = { phase: 'chant', x: null, t: 0, side: null, cutT: -1 }; s.stats.worlds++ }
  if (key === 'kFugaG') s.stats.fuga++
  cue(f, key)
  return true
}

// MALEVOLENT SHRINE — the old Sukuna's executeSukunaUltimate, copied: full meter drained to 0 (spendFullBarForDomain),
// activateDomain(f, { cost: 0, duration: 15, range: 1e5 }) — here with domainKey 'sukuna' so every rosterKey==='sukuna'
// branch of domains.js (shrine background, theme + incantation, sure-hit auto-slashes, untouchable foe) runs unchanged —
// attackCooldown 44, the hand-sign cast pose 40 f, then the universal 20 s ultimate cooldown.
function shrine(f, s) {
  if (!f.infiniteEnergy) f.energy = 0
  E.activateDomain?.(f, { cost: 0, duration: SHRINE.duration, range: SHRINE.range, domainKey: 'sukuna' })
  f.ultimateCooldown = SHRINE.ultCooldown
  f._spriteCastMove = null
  s.dom.mine = true; s.stats.shrines++
}

// ── PER-FRAME TICK (1v1 + FFA combat steps, before the command layer) ──
export function tickSks(f, opp, raw, W) {
  if (!isSks(f)) { if (f?._sks) clearSks(f); return }
  const s = sksState(f); _W = W
  s.tick++
  readEdges(f, s, raw || {})
  presentTick(f, s, opp, W)
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 60) s.fx.splice(i, 1)
  domainTick(f, s)
  if (f.health <= 0) { s.cuts.length = 0; s.arrows.length = 0; s.world = null; s.amp = 0; f._sksAmp = 0; return }
  if (f.hitstop > 0) return
  s.clock++
  if (grounded(f)) s.floor = Math.round(feet(f))
  if (s.amp > 0) { s.amp--; f._sksAmp = s.amp; if (s.amp === 0) { s.cd.amp = AMP.cooldown; cue(f, 'ampEnd') } }
  else { f._sksAmp = 0; if (s.cd.amp > 0) s.cd.amp-- }
  if (s.cpu && s.clock - s.cpu.seen < 3) cpuTech(f, s, opp, W)
  // ── interruption: a hit / grab ends his live move (Fuga's gather is lost; the World Slash chant refunds half) ──
  const a = live(f)
  if (a && (f.hitstun > 0 || f.isGrabbed)) {
    const k = a.sks.key
    if (k === 'kFugaG') { s.stats.fugaCancelled++; cue(f, 'fugaBroken') }
    if (k === 'kWorld' && elapsed(a) < WORLD.signAt) { if (!f.infiniteEnergy) { f.energy = Math.min(f.maxEnergy || 210, (f.energy || 0) + COST.world / 2); s.stats.refunded += COST.world / 2 } s.stats.worldCancelled++; s.world = null; cue(f, 'worldBroken') }
    endSksAttack(f)
  }
  cutsTick(f, s, W)
  arrowsTick(f, s, W)
  burnTick(f, s, W)
  fieldTick(f, s, W)
  worldTick(f, s, W, opp)
  const A = live(f)
  if (!A || f.hitstun > 0 || f.isGrabbed) return
  moveTick(f, s, A, W, opp, raw || {})
}

function domainTick(f, s) {
  const mineNow = !!E.activeDomains?.some(d => d && d.owner === f)
  if (s.dom.mine && !mineNow) { s.empUntil = s.clock + FUGA.empWindow; cue(f, 'shrineEnd') }   // canon: Shrine, then Fuga
  s.dom.mine = mineNow
}

// ── PRESENTATION: intro line on his first tick of a round, a win line once every foe is down (gojo / gojo_shinjuku
// get their own). Plain JSON; the bubble / voice come from sukunaShinjukuFx.js reading s.say and the cues.
function presentTick(f, s, opp, W) {
  if (s.say && --s.say.t <= 0) s.say = null
  const foes = (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f)
  if (!s.said.intro) { s.said.intro = true; s.say = { text: QUOTES.intro, t: 170, kind: 'intro' }; cue(f, 'introVoice') }
  if (!s.said.win && f.health > 0 && foes.length && foes.every(o => !(o.health > 0))) {
    s.said.win = true
    const vsGojo = foes.some(o => QUOTES.gojoKeys.includes((o.rosterKey || '').toLowerCase()))
    s.say = { text: vsGojo ? QUOTES.vsGojo : QUOTES.win, t: 200, kind: 'win' }
    cue(f, 'winVoice')
  }
}

// ── DISMANTLE cuts: thin, fast, travel 65 % of the screen; they CUT (destroy) any non-super projectile they meet ──
function spawnCut(f, s, dir, ang, raw, fan) {
  const sp = DISMANTLE.speed, life = Math.round(DISMANTLE.range * SCREEN / sp)
  s.cuts.push({ x: Math.round(ctrX(f) + dir * 30), y: Math.round(f.y + (f.h || 94) * 0.38), vx: +(dir * sp * Math.cos(ang)).toFixed(3), vy: +(sp * Math.sin(ang)).toFixed(3),
    dir, ang, t: 0, life, raw, fan: !!fan, hit: {} })
  if (s.cuts.length > 6) s.cuts.shift()
  s.stats.cuts++; cue(f, 'cut')
}
function cutsTick(f, s, W) {
  for (let i = s.cuts.length - 1; i >= 0; i--) {
    const c = s.cuts[i]; c.t++
    c.x = +(c.x + c.vx).toFixed(3); c.y = +(c.y + c.vy).toFixed(3)
    const bx = c.x - DISMANTLE.w / 2, by = c.y - DISMANTLE.h / 2
    let gone = c.t >= c.life || c.x < -40 || c.x > sw(W) + 40 || (s.floor != null && c.y > s.floor + 4) || c.y < -400
    const P = W.projectileList?.() || []
    for (let j = P.length - 1; j >= 0; j--) {
      const p = P[j]; if (!p || p.owner === f || isSuperProjectile(p) || p.visualOnly) continue
      const r = p.radius || (p.w || 20) / 2
      if (Math.abs(p.x - c.x) < r + DISMANTLE.w / 2 && Math.abs(p.y - c.y) < r + DISMANTLE.h / 2) { W.removeProjectile?.(p); s.stats.cutProj++; cue(f, 'cutProj'); pushFx(s, 'cutProj', p.x, p.y, { dir: c.dir }) }
    }
    for (const o of foesOf(f, W)) {
      if (gone || c.hit[o.side] || !boxHit(o, bx, by, DISMANTLE.w, DISMANTLE.h)) continue
      c.hit[o.side] = true
      const r = strike(f, o, { raw: c.raw, hitstun: DISMANTLE.hitstun, kbx: DISMANTLE.kbx, kby: DISMANTLE.kby, chip: DISMANTLE.chip, dir: c.dir, move: 'sks_dismantle', type: 'slash', hitstop: 4, fx: 'cutHit' }, W)
      if (r === 'hit') s.stats.cutHits++
      gone = true
    }
    if (gone) s.cuts.splice(i, 1)
  }
}

// ── FUGA arrows: fly, explode on the first foe / the floor / the end of their life; burn + a FIRE patch ──
function spawnArrow(f, s, dir, lv, emp) {
  s.arrows.push({ x: Math.round(ctrX(f) + dir * 36), y: Math.round(f.y + (f.h || 94) * 0.42), dir, lv, emp: !!emp, t: 0 })
  if (s.arrows.length > 2) s.arrows.shift()
  s.stats.fugaLv = lv; if (emp) s.stats.empowered++
  cue(f, emp ? 'fugaEmpFire' : 'fugaFire', { lv })
}
function arrowsTick(f, s, W) {
  for (let i = s.arrows.length - 1; i >= 0; i--) {
    const a = s.arrows[i]; a.t++
    a.x += a.dir * FUGA.speed
    let target = null
    for (const o of foesOf(f, W)) if (boxHit(o, a.x - 10, a.y - 8, 20, 16) && !((o.invulnTimer || 0) > 0)) { target = o; break }
    if (target || a.t >= FUGA.life || a.x < 0 || a.x > sw(W)) { explode(f, s, W, a, target); s.arrows.splice(i, 1) }
  }
}
function explode(f, s, W, a, target) {
  const r = a.emp ? FUGA.rEmp : FUGA.r[a.lv - 1], raw = Math.round(FUGA.raw[a.lv - 1] * (a.emp ? FUGA.empMult : 1))
  const ex = Math.max(0, Math.min(sw(W), a.x)), ey = a.y
  for (const o of foesOf(f, W)) {
    const nx = Math.max(o.x, Math.min(ex, o.x + o.w)), ny = Math.max(o.y, Math.min(ey, o.y + o.h))
    if ((ex - nx) ** 2 + (ey - ny) ** 2 > r * r) continue
    const res = strike(f, o, { raw, hitstun: FUGA.hitstun, kbx: FUGA.kbx, kby: FUGA.kby, chip: FUGA.chip, dir: a.dir, move: a.emp ? 'sks_fuga_empowered' : 'sks_fuga', type: 'energy', hitstop: 10, fx: 'fugaHit', domainOk: true }, W)
    if (res === 'hit') { s.stats.fugaHits++; s.burns[o.side] = { t: FUGA.burn.frames, k: 0 }; o._sksBurn = FUGA.burn.frames }
  }
  pushFx(s, 'fugaBoom', ex, ey, { r, emp: a.emp, lv: a.lv })
  cue(f, a.emp ? 'fugaEmpBoom' : 'fugaBoom')
  const floor = target && grounded(target) ? Math.round(feet(target)) : s.floor
  if (floor != null && floor - ey <= 140) layFire(f, s, W, ex, floor)
}
// burn: Sanji's rule (3 dmg every 20 f for 2 s, refreshes on a new hit, never stacks), "energy" (it is fire)
function burnTick(f, s, W) {
  for (const o of foesOf(f, W)) {
    const b = s.burns[o.side]; if (!b) continue
    if (--b.t <= 0) { delete s.burns[o.side]; o._sksBurn = 0; continue }
    o._sksBurn = b.t
    if (++b.k >= FUGA.burn.every) { b.k = 0; W.damage(o, FUGA.burn.dmg, { attacker: f, damageType: 'energy', source: 'sksBurn', move: 'sks_burn', scale: 1 }); s.stats.burnTicks++ }
  }
}
// FIRE patch through elements.js. A foreign ICE patch it overlaps (Enoch's ice / ice disc) reacts with it: the registered
// fire+ice reaction (thermalBurst: 45 blunt × intensity scale, knockdown, then water + steam) at the overlap.
function layFire(f, s, W, cx, floor) {
  const w = FUGA.patchW, x0 = Math.max(0, Math.round(cx - w / 2)), x1 = Math.min(sw(W), x0 + w)
  for (const { owner, patch } of (W.patches?.() || [])) {
    if (owner === f || patch.type !== 'ice' || Math.abs((patch.floor ?? floor) - floor) > 12) continue
    if (!(x0 < patch.x + patch.width && patch.x < x1)) continue
    const R = reactionFor('fire', 'ice')
    W.removePatch?.(owner, patch)
    const u0 = Math.min(x0, patch.x), u1 = Math.max(x1, patch.x + patch.width), hi = Math.max(1, patch.intensity || 1)
    const raw = R.burst.dmg * (R.burst.scale[hi - 1] ?? 1)
    for (const o of foesOf(f, W)) {
      const c = ctrX(o); if (c < u0 - 24 || c > u1 + 24 || Math.abs(feet(o) - floor) > 60 || (o.invulnTimer || 0) > 0) continue
      W.damage(o, raw, { attacker: f, source: 'thermalBurst', damageType: R.burst.damageType })
      o.vy = -11; o.vx = (c >= (u0 + u1) / 2 ? 1 : -1) * 3; o.onGround = false; o.grounded = false; o.hitstun = Math.max(o.hitstun || 0, 34)
    }
    const ov0 = Math.max(x0, patch.x), ov1 = Math.min(x1, patch.x + patch.width), ow = Math.max(48, ov1 - ov0)
    for (const sp of R.spawn) addPatch(s.field, { type: sp.type, cx: (ov0 + ov1) / 2, width: ow, owner: f.side, floor, frame: s.clock, calm: 20 })
    s.field.events.length = 0
    s.stats.reactions++; cue(f, 'burst'); pushFx(s, 'burst', (u0 + u1) / 2, floor, { w: u1 - u0 })
    return
  }
  addPatch(s.field, { type: 'fire', cx: (x0 + x1) / 2, width: x1 - x0, owner: f.side, floor, frame: s.clock, life: FUGA.patchLife, minX: 0, maxX: sw(W) })
  s.field.events.length = 0
  s.stats.firePatches++
}
function fieldTick(f, s, W) {
  if (!s.field.patches.length) return
  tickField(s.field, s.clock)
  const all = (W.fighters?.() || [f]).filter(Boolean)
  applyPatchEffects(s.field, all, { frame: s.clock, owner: f.side, ownerX: ctrX(f), sideOf: o => o.side, grounded, feet, cx: ctrX, walker: () => false,
    damage: (t, n, o) => W.damage(t, n, { ...o, attacker: f, move: 'sks_fire_patch' }) })
}

// ── WORLD-CUTTING SLASH: chant (3 captions) → hand sign → one screen-height cut where the foe stands ──
function worldTick(f, s, W, opp) {
  const w = s.world; if (!w || w.phase !== 'cut') return
  w.t++
  if (w.t === WORLD.resolve) {
    for (const o of foesOf(f, W, opp)) {
      if (Math.abs(ctrX(o) - w.x) > (o.w || 48) / 2 + 14) continue
      const r = strike(f, o, { raw: WORLD.raw, hitstun: WORLD.hitstun, kbx: WORLD.kbx, kby: WORLD.kby, unblockable: true, otg: true, cut: true, move: 'sks_world_slash', type: 'slash', hitstop: 16, fx: 'worldHit' }, W)
      if (r === 'hit') s.stats.worldHits++
    }
    cue(f, 'worldCut')
  }
  if (w.t > 24) s.world = null
}

// ── live move driver ──
function moveTick(f, s, A, W, opp, raw) {
  const m = A.sks, md = SKS_MOVES[m.key], t = elapsed(A), g = grounded(f)
  f.facing = m.dir
  const clampX = x => Math.max(0, Math.min(sw(W) - f.w, x))
  if (md.travel && t >= md.travel[0] && t < md.travel[1] && g) { f.x = clampX(f.x + m.dir * md.travel[2]); f.vx = 0 }
  else if (g && !md.air && !md.launcher) f.vx = 0
  const front = ctrX(f) + m.dir * (f.w / 2)
  const foes = foesOf(f, W, opp)
  switch (m.key) {
    case 'kAir': if (g && t > 2) endSksAttack(f, 3); break
    case 'kDismantle': case 'kDisUp': case 'kDisAir': {
      if (m.key === 'kDismantle' && t === DISMANTLE.startup - 1 && raw.special && !m.released && (f.infiniteEnergy || (f.energy || 0) >= COST.fan)) {   // HOLD Special → the 3-slash fan
        const dir = m.dir; endSksAttack(f); startSksMove(f, 'kFan', W, { dir }); return
      }
      if (t >= DISMANTLE.startup && !m.released) {
        m.released = true
        spawnCut(f, s, m.dir, m.key === 'kDisUp' ? DISMANTLE.upAngle : m.key === 'kDisAir' ? DISMANTLE.airAngle : 0, DISMANTLE.raw, false)
      }
      if (m.key === 'kDisAir' && g && t > DISMANTLE.startup + 2) endSksAttack(f, 3)
      break
    }
    case 'kFan':
      for (let i = 0; i < 3; i++) if (t >= DISMANTLE.fanAt[i] && !m.fired[i]) { m.fired[i] = true; spawnCut(f, s, m.dir, DISMANTLE.fanAngles[i], DISMANTLE.fanRaw, true) }
      break
    case 'kCleave':
      if (t >= CLEAVE.startup && t < CLEAVE.startup + CLEAVE.active && !m.released) {
        const x = m.dir === 1 ? f.x + f.w : f.x - CLEAVE.reach
        const o = foes.find(o => boxHit(o, x, f.y + 10, CLEAVE.reach, CLEAVE.h))
        if (o) {
          m.released = true; s.stats.cleaves++
          const raw = Math.round(CLEAVE.base + CLEAVE.pctMax * (o.maxHealth || 1000))   // adjusts to the target
          s.stats.cleaveLast = raw
          const r = strike(f, o, { raw, hitstun: CLEAVE.hitstun, kbx: CLEAVE.kbx, kby: CLEAVE.kby, chip: CLEAVE.chip, dir: m.dir, cut: true, move: 'sks_cleave', type: 'slash', hitstop: 8, fx: 'cleaveHit' }, W)
          if (r === 'hit') s.stats.cleaveHits++
          m.contact = r === 'hit' || r === 'block'
        }
      }
      if (t === CLEAVE.startup + CLEAVE.active && !m.released) { m.released = true; s.stats.cleaves++; A.total += CLEAVE.whiff; A.timer += CLEAVE.whiff; cue(f, 'whiff') }   // −10 on whiff
      break
    case 'kWeb':
      if (t === WEB.startup && !m.released) {
        m.released = true; s.stats.webs++
        const x0 = m.dir === 1 ? front + WEB.from : front - WEB.from - WEB.len, x1 = x0 + WEB.len, floor = s.floor ?? feet(f)
        for (const o of foes) {
          if (ctrX(o) < x0 || ctrX(o) > x1 || floor - feet(o) > 40) continue
          if (strike(f, o, { raw: WEB.raw, hitstun: WEB.hitstun, kbx: WEB.kbx, kby: WEB.kby, chip: WEB.chip, dir: m.dir, low: true, otg: true, move: 'sks_spiderweb', type: 'slash', hitstop: 6, fx: 'webHit' }, W) === 'hit') s.stats.webHits++
        }
        clearGround(f, s, W, x0, x1, floor)
        pushFx(s, 'web', (x0 + x1) / 2, floor, { w: WEB.len, dir: m.dir })
        cue(f, 'webCrack')
      }
      break
    case 'kFugaG': {
      if (!raw.special) m.rel = true
      const lv = t >= FUGA.levelAt[2] ? 3 : t >= FUGA.levelAt[1] ? 2 : 1
      if (lv !== m.lv && t >= FUGA.levelAt[0]) { m.lv = lv; cue(f, 'fugaLevel', { lv }) }
      if ((m.rel && t >= FUGA.levelAt[0]) || t >= FUGA.holdMax - 2) {
        const dir = m.dir; endSksAttack(f); startSksMove(f, 'kFugaF', W, { dir, lv: Math.max(1, lv) }); return
      }
      break
    }
    case 'kFugaF': case 'kFugaE':
      if (t >= SKS_MOVES[m.key].startup && !m.released) { m.released = true; spawnArrow(f, s, m.dir, m.key === 'kFugaE' ? 3 : m.lv || 1, m.key === 'kFugaE') }
      break
    case 'kAmp':
      if (t >= 6 && !m.released) { m.released = true; s.amp = AMP.frames; f._sksAmp = s.amp; s.stats.amps++; cue(f, 'amp') }
      break
    case 'kWorld': {
      const w = s.world
      if (!w) break
      for (let i = 0; i < 3; i++) if (t === i * WORLD.line) cue(f, 'chantLine', { line: i })
      if (t === WORLD.signAt) { const o = foes[0]; w.x = o ? Math.round(ctrX(o)) : Math.round(front + m.dir * 200); w.side = o?.side ?? null; cue(f, 'worldSign') }
      if (t >= WORLD.cutAt && w.phase === 'chant') { w.phase = 'cut'; w.t = 0; if (w.x == null) w.x = Math.round(front + m.dir * 200) }
      break
    }
  }
}
// SPIDERWEB clears ground hazards in its span: ninja traps (Dustin's kunai), ground patches (Enoch: ice / fire / water /
// steam and his ICE DISC — removing the disc patch lets enochState recede the platform), Sanji's Concasse burning patch
function clearGround(f, s, W, x0, x1, floor) {
  for (const o of foesOf(f, W, null).concat((W.fighters?.() || []).filter(o => o && o !== f && !(o.health > 0)))) {
    const T = o._ninja?.traps
    if (T?.length) { const keep = T.filter(t => t.x < x0 || t.x > x1); s.stats.trapsCleared += T.length - keep.length; if (keep.length !== T.length) { T.length = 0; T.push(...keep) } }
    const sp = o._sanji?.patch
    if (sp && sp[0] >= x0 - 60 && sp[0] <= x1 + 60) { o._sanji.patch = null; s.stats.patchesCleared++ }
  }
  for (const { owner, patch } of (W.patches?.() || [])) {
    if (owner === f) continue
    if (x0 < patch.x + patch.width && patch.x < x1) { W.removePatch?.(owner, patch); s.stats.patchesCleared++ }
  }
}

// ── CPU (only when the CPU drives him): Dismantle at range, Cleave up close, Spiderweb on traps / patches, Domain
// Amplification only after an Infinity-style defence has stopped one of his hits. Deterministic rhythm (no RNG).
const PACE = { dummy: Infinity, easy: 140, normal: 80, adaptive: 70, hard: 50, impossible: 34 }
export function markSksCpu(f, difficulty) { if (!isSks(f)) return; const s = sksState(f); s.cpu = { ...(s.cpu || {}), seen: s.clock, diff: difficulty || 'normal' } }
function cpuTech(f, s, opp, W) {
  const c = s.cpu, pace = PACE[c.diff] ?? 80
  if (!isFinite(pace) || f.attacking || f.hitstun > 0 || f.blockstun > 0 || !grounded(f)) return
  if (c.nextAt == null) c.nextAt = s.clock + pace
  if (s.clock < c.nextAt) return
  const foe = foesOf(f, W, opp)[0]; if (!foe || foe.domainUntouchable) return
  const dir = ctrX(foe) >= ctrX(f) ? 1 : -1, dist = Math.abs(ctrX(foe) - ctrX(f)), e = f.energy || 0
  const sawInf = (s.sawInf >= 0 && s.clock - s.sawInf < 240) || (f._gsSawInfinity != null && (foe._gs?.clock ?? 0) - f._gsSawInfinity < 240)
  const hazard = foesOf(f, W, opp).some(o => (o._ninja?.traps || []).some(t => Math.abs(t.x - (ctrX(f) + dir * 110)) < 110)) ||
    (W.patches?.() || []).some(({ owner, patch }) => owner !== f && Math.abs(patch.x + patch.width / 2 - (ctrX(f) + dir * 110)) < 130)
  let key = null
  if (!s.dom.mine && !(f.ultimateCooldown > 0) && e >= (f.maxEnergy || 210) && dist < 600) key = 'kShrine'
  else if (s.empUntil > s.clock && e >= COST.fuga) key = 'kFugaE'
  else if (sawInf && foe.rosterKey === 'gojo_shinjuku' && s.amp === 0 && s.cd.amp === 0 && e >= COST.amp) key = 'kAmp'
  else if (s.amp > 0) key = null
  else if (hazard && e >= COST.web) key = 'kWeb'
  else if (dist > 300 && e >= COST.dismantle) key = 'kDismantle'
  else if (dist < 95 && e >= COST.cleave) key = 'kCleave'
  if (key) { f.facing = dir; startSksMove(f, key, W, { dir }) }
  c.nextAt = s.clock + pace
}

export function sksLockedForMovement(f) {
  if (!isSks(f)) return false
  const a = f.attacking ? f.currentAttack : null
  if (a?.sks && !(SKS_MOVES[a.sks.key]?.launcher && a.hasHit)) { f._dashTap = false; return true }
  return false
}
export { NORMALS }
