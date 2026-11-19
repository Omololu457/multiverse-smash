// ninjaStormState.js — NINJA STORM RANGERS authoritative state (GAME_STATE). Their own state lives in `fighter._nsr`
// (input edges, scripted-move bookkeeping, render bursts), the shared framework state in `fighter._academy`
// (ninjaAcademy.js: Focus, stance, clone, echoes, Kawarimi, Mode) and `fighter._ranger` (rangers.js: NINJA VANISH).
// All plain JSON, pushed into the replay checkpoint snapshot by game.js. No Math.random / gameRng (nothing here needs
// any). Every export is a no-op for any other rosterKey.
import { NS_MOVES, NS_ULT, NS_ANIMS, STANCE_LOOK, STANCE_STATS, NSR_KEY, isNinjaStorm, ninjaStormRangers } from './ninjaStormData.js'
import { NS_FX } from './ninjaStormSprites.js'
import { tickRanger, clearRanger, getRangerProfile, RANGER_SCREEN } from './rangers.js'
import { tickAcademy, clearAcademy, academyState, getAcademyProfile, gainFocus, castClone, kawarimi, beginMode, modeActive, useBackstep,
  scheduleEcho, twinPlan, modeDamageMul, modeTakenMul, cloneAlive, academyRegen, stanceOf, dialInput, swapStance, stanceRefusal, tickEchoes } from './ninjaAcademy.js'
export { isNinjaStorm }

export function ncue(f, c) { (f._nsrCues ||= []).push(c) }   // audio cue queue (presentation only; played + cleared by game.js)
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']
export const stance = f => stanceOf(f) || 'red'
export const isYellow = f => stance(f) === 'yellow'

export function nsState(f) {
  if (!isNinjaStorm(f)) return null
  return f._nsr ||= { clock: 0, tick: 0, prev: {}, edgeAt: {}, edgeClk: {}, edgeDir: {}, used: {}, dirs: [], fx: [], serial: 0, ult: null, lock: null, want: null, applied: null,
    stats: { blades: 0, waves: 0, shuriken: 0, locks: 0, lockHits: 0, clones: 0, swaps: 0, stanceSwaps: 0, modes: 0, ults: 0, ultHits: 0, twin: 0, backsteps: 0 } }
}
// Presentation + per-stance stats of the active stance onto the live fighter (health / Focus / position never change).
export function applyStance(f, st) {
  const L = STANCE_LOOK[st], A = NS_ANIMS[st]
  f.animationData = A; if (f._skinAnim) f._skinAnim = A
  f.spriteSheet = A.idle.sheet
  f.color = L.color; f.hudName = L.hudName; f.portrait = L.portrait; f.hudIcon = L.hudIcon
  f.weight = STANCE_STATS[st].weight
  if (f.stats) f.stats = { ...f.stats, weight: STANCE_STATS[st].weight }
  if (f._nsr) f._nsr.applied = st
}
export function clearNinjaStorm(f, W) {
  if (!f) return
  const list = W?.projectileList?.() || E.list
  if (list) for (let i = list.length - 1; i >= 0; i--) if (list[i]?.owner === f && list[i]._nsr) list.splice(i, 1)
  const had = !!(f._nsr || f._academy)
  delete f._nsr; delete f._nsrCues; clearAcademy(f)
  if (isNinjaStorm(f) || had) { clearRanger(f); f._rooted = false }
  if (isNinjaStorm(f)) applyStance(f, getAcademyProfile(f).startStance)   // every round opens in RED (Shane)
}

const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}
export function recentMotion(s, win) {
  const from = s.tick - win; let str = ''
  for (let i = 0; i < s.dirs.length; i++) { const [tok, at] = s.dirs[i], next = s.dirs[i + 1]; if (at >= from || !next || next[1] > from) str += tok }
  return str
}
export const ctrX = f => (f.x || 0) + (f.w || 48) / 2
export const ctrY = f => (f.y || 0) + (f.h || 94) * 0.45
const grounded = f => !!(f.onGround || f.grounded)
const overlaps = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
export function burst(s, k, x, y, t = 12) { s.fx.push({ k, x: Math.round(x), y: Math.round(y), t, n: ++s.serial }); if (s.fx.length > 14) s.fx.shift() }
const elapsed = a => a.total - a.timer
const due = (a, key, at) => { const t = elapsed(a); if (t < at || a[key]) return false; a[key] = true; return true }

// Engine helpers handed in by ninjaStorm.js (avoids a combat.js ↔ ninjaStormState import cycle).
const E = { startMove: null, spawn: null, list: null, comboScale: null, hurtbox: null }
export function registerNinjaStormEngine(o) { Object.assign(E, o) }
let _W = null
const rangerWorld = W => W && { stageWidth: W.stageWidth, frame: W.frame, seed: W.seed, attackBox: W.attackBox, projectiles: W.projectileRects || W.projectiles }
const academyWorld = W => ({ stageWidth: W?.stageWidth, frame: W?.frame, seed: W?.seed, damage: W?.damage, hurtbox: f => E.hurtbox?.(f), comboScale: f => nsComboScale(f) })
const stageW = () => _W?.stageWidth?.() || 3200
const clampX = (f, x) => Math.max(0, Math.min(stageW() - (f.w || 48), x))

// ── STANCE SWAP ── the power-commit test (Ben refuses a swap mid power-commit): any special / Ultimate / Mode
// charge-in / Kawarimi / live lock-on aim. A NORMAL may be swapped out of once it has connected or reached recovery
// (the swap cancels it — the stance-swap combo route); during its startup / active frames the swap waits (buffered).
function swapBusy(f, s) {
  const a = f.attacking ? f.currentAttack : null
  if (!a) return false
  const md = NS_MOVES[a.name] || {}
  if (md.isSpecial || md.isUltimate || a.isUltimate) return true
  return false
}
function normalLocked(f) {
  const a = f.attacking ? f.currentAttack : null
  if (!a || !a.nsr) return !!a   // an engine move (grab / throw) holds the swap
  return !(a.hasHit || a._contact) && !(elapsed(a) > (a.activeEnd ?? 0))
}
function doSwap(f, s, to) {
  const from = stance(f)
  if (!swapStance(f, to, swapBusy(f, s))) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  s.lock = null; s.ult = null
  applyStance(f, to)
  s.stats.stanceSwaps++
  burst(s, 'poof', ctrX(f), ctrY(f), 16); burst(s, 'swapRing', ctrX(f), (f.y || 0) + (f.h || 94), 14)
  s.swapFx = { from, to, t: 14 }
  ncue(f, 'stance')
  return true
}
function tickWant(f, s) {
  const w = s.want; if (!w) return
  const why = stanceRefusal(f, w.to, swapBusy(f, s))
  if (why === 'same') { s.want = null; return }
  if (!why && !normalLocked(f)) { s.want = null; doSwap(f, s, w.to); return }
  if (!why || why === 'lockout' || why === 'commit') { if (--w.t <= 0) { s.want = null; academyState(f).stanceRefused = why || 'attacking' } return }
  s.want = null; academyState(f).stanceRefused = why   // hitstun / down: refused outright
}

// ── Per-sim-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat) ──
export function tickNinjaStorm(f, opp, raw = {}, W = null) {
  if (!isNinjaStorm(f)) { if (f?._nsr) clearNinjaStorm(f, W); return }
  const s = nsState(f)
  if (W) _W = W
  if (s.applied !== stance(f)) applyStance(f, stance(f))   // a fresh / restored state: the look follows the stance
  s.tick++
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock; s.edgeDir[k] = tok } s.prev[k] = v }
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  // STANCE DIAL (↓↓ then Light / Heavy) — sim frames, before hitstop (Ben's detector does the same). The picking
  // button's press is CONSUMED (it never also throws a jab / kick).
  const pick = f.health > 0 ? dialInput(f, raw) : null
  if (pick) {
    if (s.edgeAt[pick.button] != null) s.used[pick.button] = s.edgeAt[pick.button]
    if (pick.stance === stance(f)) { academyState(f).stanceRefused = 'same' }   // same stance: nothing (no cost, no lockout)
    else s.want = { to: pick.stance, t: 18 }
  }
  // NINJA VANISH = the rangers.js blink (charges / travel / crossup / face lock / dodge / run)
  const evs = f.health > 0 ? tickRanger(f, opp, raw, rangerWorld(W)) : []
  for (const e of evs) {
    if (e.type === 'blinkStart') ncue(f, 'vanish')
    else if (e.type === 'arrive') ncue(f, 'vanishPop')
    else if (e.type === 'dodge') { gainFocus(f, getAcademyProfile(f).focus.perDodge); ncue(f, 'dodge') }   // DODGE REWARD: +5 Focus (+15% next attack)
  }
  const rr = f._ranger; if (rr && rr.pendingAt === rr.tick) { s.tapId = rr.pendingAt; s.tapClk = s.clock }
  // the clone's ECHO queue: every sim frame, hitstop included (an echo lands exactly 12 f after the hit)
  if (f.health > 0) { for (const e of tickEchoes(f, opp, academyWorld(W))) onAcademyEvent(f, opp, s, e); academyState(f).events = [] }
  if (f.health <= 0 || f.hitstop > 0) return
  s.clock++
  if (s.swapFx && --s.swapFx.t <= 0) s.swapFx = null
  for (let i = s.fx.length - 1; i >= 0; i--) if (--s.fx[i].t <= 0) s.fx.splice(i, 1)
  if (s.want && !f._ranger?.blink) tickWant(f, s)
  // the shared framework: Focus lockout, clone life + ECHO queue, Kawarimi cooldown, Mode timers, stance lockout
  for (const e of tickAcademy(f, opp, academyWorld(W))) onAcademyEvent(f, opp, s, e)
  academyState(f).events = []
  // a Focus projectile connected (engine hitFlag) → +4 Focus (+ the clone echoes the throw)
  if (f._nsrShotHit) { f._nsrShotHit = false; gainFocus(f, getAcademyProfile(f).focus.perHit); const k = f._nsrShotKind; if (k) scheduleEcho(f, { raw: NS_MOVES[k === 'wave' ? 'nWave' : 'nShuriken'].damage, key: k === 'wave' ? 'nWave' : 'nShuriken', proj: k, startup: 6 }); ncue(f, 'impact') }
  if (f._nsrEchoShotHit) { f._nsrEchoShotHit = false; gainFocus(f, getAcademyProfile(f).focus.perHit) }
  const a = f.attacking ? f.currentAttack : null
  if (s.lock && (s.lock.shot ? --s.lock.t <= 0 : a?.nsr?.kind !== 'lock')) s.lock = null   // the shot's FX window / an interrupted aim
  if (a?.nsr) tickMove(f, opp, s, a)
  if (a && !a._nsrBuffChecked) { a._nsrBuffChecked = true; if (f._ranger?.dodgeBuff > 0) { a._dodgeBuff = true; f._ranger.dodgeBuff = 0; ncue(f, 'buff') } }
}
function onAcademyEvent(f, opp, s, e) {
  switch (e.type) {
    case 'clone': burst(s, 'poof', e.x + (f.w || 48) / 2, e.y + (f.h || 94) / 2, 16); ncue(f, 'clone'); break
    case 'clonePop': burst(s, 'poof', e.x + (f.w || 48) / 2, e.y + (f.h || 94) / 2, 12); break
    case 'echoHit': burst(s, 'hit', e.x, e.y); ncue(f, 'echo'); break
    case 'echoBlocked': burst(s, 'block', e.x, e.y); ncue(f, 'blocked'); break
    case 'echoProj': spawnShot(f, e.proj, { echo: true, x: e.x, y: e.y, dir: e.dir, raw: e.raw }); break
    case 'kawarimi': ncue(f, 'swap'); break
    case 'modeOn': ncue(f, isYellow(f) ? 'quakeOn' : 'modeOn'); break
    case 'modeOff': if (e.why !== 'swap') ncue(f, 'modeOff'); break
  }
}

// Start one of their moves through the engine's startMove (frameExact path) + attach the descriptor `nsr`.
export function nsStartMove(f, key) {
  const md = NS_MOVES[key]; if (!md || !E.startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!E.startMove(f, key, md)) return false
  if (md.cost) f.energy = Math.max(0, (f.energy || 0) - md.cost)   // specials spend Focus on commit
  const a = f.currentAttack, g = md.nsr || {}
  f.currentMove = key
  a.nsr = { kind: g.kind || 'normal', ...g, dir: f.facing || 1, stance: stance(f) }
  if (g.noHit || g.noEngineBox) a.hasHit = !!g.noHit
  if (md.invuln) f.invulnTimer = Math.max(f.invulnTimer || 0, md.invuln)
  if (md.isSpecial || md.isUltimate) { f.isBlocking = false; if (grounded(f)) f.vx = 0 }
  return true
}
// Hitbox (combat.js, gated): in front of him, raised / low per move. Body-less / scripted moves → null.
export function nsBox(f, md, g) {
  const fw = f.w || 48, reach = (md.rangeX || 60) * (f._reachMult || 1), h = g.h || md.rangeY || 40
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (g.boxY ?? 20), w: reach, h }
}
export function ninjaStormHitbox(f) {
  const a = f.currentAttack, g = a?.nsr
  if (!g || g.noHit || g.noEngineBox) return null
  return nsBox(f, NS_MOVES[a.name] || a, g)
}

// ── combat.js hooks ──
export function ninjaStormBlock(attacker, defender, atk) {
  if (!isNinjaStorm(attacker)) return
  const md = NS_MOVES[atk?.name]; if (md?.blockstun != null) defender.blockstun = md.blockstun
  gainFocus(attacker, getAcademyProfile(attacker).focus.perBlocked)
}
export function ninjaStormHit(attacker, defender, atk) {
  if (!isNinjaStorm(attacker) || attacker === defender) return
  const s = nsState(attacker), md = NS_MOVES[atk?.name], g = atk?.nsr || {}
  gainFocus(attacker, getAcademyProfile(attacker).focus.perHit)
  attacker.comboTimer = 90   // combo counter resets after 1.5 s without a hit
  burst(s, 'hit', ctrX(defender), ctrY(defender))
  if (md && !atk?.isUltimate) scheduleEcho(attacker, { raw: md.damage, key: atk.name, box: nsBox(attacker, md, g), startup: md.startup, hitstun: md.hitstun, kb: md.knockbackX, type: md.damageType })
  if (g.knockdown || (g.chainKnockdown && (attacker.comboCounter || 0) >= 2)) { defender.knockdownState = true; defender.knockdownTimer = Math.max(defender.knockdownTimer || 0, 44); defender.vy = Math.min(defender.vy || 0, -6) }
  ncue(attacker, md?.damageType === 'slash' ? 'slash' : 'impact')
}
// weight 0.8 (Red) / 0.85 (Yellow) → knockback taken ÷ weight (the stance in force when the hit lands)
export function ninjaStormKnockback(attacker, defender) { if (isNinjaStorm(defender) && defender.vx) defender.vx /= (STANCE_STATS[stance(defender)].weight || 0.8) }
export const nsComboScale = f => Math.pow(0.85, Math.max(0, (f?.comboCounter || 0)))   // 85% per hit
// applyScaledDamage: Mode damage ×, Quake damage-taken ×, post-Vanish-dodge +15%. Raw untouched unless he is involved.
export function ninjaStormDamageMods(target, rawDamage, opts = {}) {
  const a = opts.attacker
  if (a && a !== target && isNinjaStorm(a)) {
    rawDamage = (rawDamage || 0) * modeDamageMul(a)
    if (opts.source !== 'block-chip' && (opts.dodgeBuff || (a.currentAttack?._dodgeBuff && opts.source !== 'ability'))) rawDamage *= (getRangerProfile(a)?.blink.dodge?.dmgMul || 1.15)
  }
  if (isNinjaStorm(target) && a !== target) rawDamage = (rawDamage || 0) * modeTakenMul(target)
  return rawDamage
}
export const ninjaStormRegen = f => isNinjaStorm(f) ? academyRegen(f) : false

// ── Projectiles (Crescent / Boulder Wave, Shuriken / Sand Spin; the clone's echo throws reuse the same spawner at 50%) ──
export const shotCount = (f, kind) => (E.list || []).filter(p => p && p.owner === f && p._nsr === kind && !p._nsrEcho).length
function spawnShot(f, kind, o = {}) {
  if (!E.spawn) return null
  const st = stance(f), fx = NS_FX[st], sc = (ninjaStormRangers.spriteScale || 2) * 1.18
  const spr = kind === 'wave' ? fx.fxCrescent : fx.fxStar
  const md0 = NS_MOVES[kind === 'wave' ? 'nWave' : 'nShuriken']
  const dir = o.dir || f.facing || 1, speed = kind === 'wave' ? 14 : 18
  const bx = o.echo ? o.x : f.x, by = o.echo ? o.y : f.y, fw = f.w || 48
  const md = { damage: o.echo ? o.raw : md0.damage, speed, vx: dir * speed, vy: 0,
    spawnX: dir === 1 ? bx + fw + 6 : bx - 6, spawnY: by + (f.h || 94) * (kind === 'wave' ? 0.42 : 0.36),
    w: kind === 'wave' ? 40 : 24, h: kind === 'wave' ? 70 : 20, radius: kind === 'wave' ? 34 : 18, lifetime: Math.ceil(RANGER_SCREEN / speed) + 6,
    hitstun: kind === 'wave' ? 22 : 14, knockbackX: kind === 'wave' ? 4 : 2, knockbackY: 0, color: st === 'yellow' ? '#f0c419' : '#ff5a4a',
    isSpecial: true, category: 'special', hitFlag: o.echo ? '_nsrEchoShotHit' : '_nsrShotHit',
    sheet: spr.sheet, spriteFrames: spr.frames, spriteW: spr.width, spriteH: spr.height, spriteScale: sc * (kind === 'wave' ? 1 : 0.9) }
  const p = E.spawn(f, kind === 'wave' ? 'nsrWave' : 'nsrShuriken', md)
  if (p) { p._nsr = kind; p._nsrEcho = !!o.echo; p.damageType = kind === 'wave' ? 'slash' : 'projectile'; if (!o.echo) f._nsrShotKind = kind; ncue(f, kind === 'wave' ? (st === 'yellow' ? 'boulder' : 'wave') : 'shuriken') }
  return p
}

// One scripted hit (Blade hits, lock-on shot, Ultimate impacts). Through the damage choke-point. → true | 'blocked' | false
export function nsStrike(f, foe, dmg, o = {}) {
  if (!foe || foe === f || (foe.invulnTimer || 0) > 0 || !(foe.health > 0)) return false
  const s = nsState(f), dir = o.dir || Math.sign(ctrX(foe) - ctrX(f)) || f.facing || 1, type = o.damageType || 'blunt'
  const front = Math.sign((o.fromX ?? ctrX(f)) - ctrX(foe)) === (foe.facing || 1)
  if (foe.isBlocking && !o.locked && front && !o.unblockable) {
    foe.blockstun = Math.max(foe.blockstun || 0, o.blockstun || 14); foe.vx = dir * 3
    _W?.damage?.(foe, dmg * 0.1, { source: 'ability', attacker: f, move: o.move || 'nsr', damageType: type })
    gainFocus(f, getAcademyProfile(f).focus.perBlocked)
    burst(s, 'block', ctrX(foe), ctrY(foe)); ncue(f, 'blocked'); return 'blocked'
  }
  _W?.damage?.(foe, dmg * (o.fixedScale ?? nsComboScale(f)), { source: 'ability', attacker: f, move: o.move || 'nsr', damageType: type })
  foe.hitstun = Math.max(foe.hitstun || 0, o.hitstun || 24)
  foe.vx = dir * (o.kb ?? 2); if (o.launch) foe.vy = o.launch
  if (o.knockdown) { foe.knockdownState = true; foe.knockdownTimer = Math.max(foe.knockdownTimer || 0, 50); foe.vy = Math.min(foe.vy || 0, o.launch || -8) }
  foe.hitFlash = Math.max(foe.hitFlash || 0, 6); foe.isBlocking = false
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  gainFocus(f, getAcademyProfile(f).focus.perHit)
  burst(s, type === 'energy' ? 'zap' : 'hit', ctrX(foe), ctrY(foe)); ncue(f, type === 'energy' ? 'zap' : type === 'slash' ? 'slash' : 'impact')
  return true
}

function tickMove(f, opp, s, a) {
  const g = a.nsr, t = elapsed(a), md = NS_MOVES[a.name] || {}
  switch (g.kind) {
    case 'blade': g.hits.forEach((at, i) => {
      if (!due(a, '_h' + i, at)) return
      const box = nsBox(f, md, g)
      if (!opp || !overlaps(box, E.hurtbox?.(opp) || opp)) return
      if (a._bladeBlocked && i > 0) return
      const r = nsStrike(f, opp, md.damage, { move: a.name, damageType: isYellow(f) ? 'blunt' : 'slash', hitstun: i === 2 ? 30 : 22, kb: i === 2 ? 6 : 1, knockdown: i === 2, launch: i === 2 ? -7 : 0, blockstun: md.blockstun })
      if (r === 'blocked') a._bladeBlocked = true
      if (r === true) { a.hasHit = true; scheduleEcho(f, { raw: md.damage, key: a.name, box, startup: at, hitstun: 22, kb: 1, type: 'slash' }) }
      if (r) a._contact = true
      if (i === 0) s.stats.blades++
    }); break
    case 'wave': if (due(a, '_fired', g.fire)) { spawnShot(f, 'wave'); s.stats.waves++ } if (g.air) f.vy = Math.min(f.vy || 0, 1.5); break
    case 'shuriken': if (due(a, '_fired', g.fire)) { spawnShot(f, 'shuriken'); s.stats.shuriken++ } if (g.air) f.vy = Math.min(f.vy || 0, 1.5); break
    case 'lock': tickLock(f, opp, s, a, t, g); break
    case 'clone': if (due(a, '_cast', md.startup)) { castClone(f); s.stats.clones++ } break
    case 'mode': if (t < md.startup) { f.vx = 0 } break
    case 'backstep': if (t >= g.moveFrom && t <= g.moveTo) { f.x = clampX(f, f.x - g.dir * 10); f.vx = 0 } break
    case 'ult': tickUlt(f, opp, s, a, t); break
  }
}
// LOCK-ON: Special still held on frame 10 → pay 18, reticle on the foe; the shot lands there 12 f later.
function tickLock(f, opp, s, a, t, g) {
  if (!grounded(f)) { f.vy = Math.min(f.vy || 0, 1) }
  if (t === g.lockAt && !a._locked) {
    if (!s.prev.special || !opp || (f.energy || 0) < g.cost || (f._academy?.lockout > 0)) { f.attacking = false; f.currentAttack = null; f.currentMove = null; ncue(f, 'lockDrop'); return }
    a._locked = true; f.energy -= g.cost; s.stats.locks++
    const floor = (opp.onGround || opp.grounded) ? opp.y + (opp.h || 94) : null
    s.lock = { x: Math.round(ctrX(opp)), y: Math.round(ctrY(opp)), floor: floor != null ? Math.round(floor) : Math.round(opp.y + (opp.h || 94)), at: s.clock + g.fireAfter, t: g.fireAfter, res: null, n: ++s.serial, quake: isYellow(f) }
    ncue(f, 'lock')
  }
  const L = s.lock
  if (a._locked && L && !a._shot && s.clock >= L.at) {
    a._shot = true
    const quake = L.quake
    const box = quake ? { x: L.x - 44, y: L.floor - 120, w: 88, h: 120 } : { x: L.x - 36, y: L.y - 46, w: 72, h: 92 }
    const hit = opp && overlaps(box, E.hurtbox?.(opp) || opp)
    L.res = hit ? nsStrike(f, opp, NS_MOVES.nLock.damage, { move: 'nLock', damageType: quake ? 'blunt' : 'energy', hitstun: 30, kb: 4, launch: quake ? -10 : 0, fromX: ctrX(f) }) : false
    if (L.res === true) { s.stats.lockHits++; a.hasHit = true; scheduleEcho(f, { raw: NS_MOVES.nLock.damage, key: 'nLock', box: { x: f.facing === 1 ? f.x + (f.w || 48) : f.x - 60, y: f.y, w: 60, h: f.h || 94 }, startup: 10, hitstun: 30, kb: 4, type: 'energy' }) }
    L.t = 18; L.shot = true; ncue(f, quake ? 'quakeSlam' : 'beam')
  }
}
// ULTIMATE — rush → giant-fist burst (solo, or TWIN TECHNIQUE with a live clone) → debris. State in s.ult. The active
// stance names it (Red: THUNDER FIST FINISH · Yellow: LION ZORD SLAM) and colours it; the structure / total is shared.
function tickUlt(f, opp, s, a, t) {
  const U = NS_ULT, fw = f.w || 48
  if (!s.ult || s.ult.n !== a._n) {
    a._n = a._n || ++s.serial
    s.ult = { n: a._n, res: null, plan: null, scale: nsComboScale(f), t: 0, hits: 0, stance: stance(f) }
    f.energy = 0; academyState(f).lockout = 130 + U.lockout   // all Focus spent; 3 s Focus lockout after it ends
    s.stats.ults++; ncue(f, isYellow(f) ? 'ultY' : 'ult')
  }
  const u = s.ult; u.t = t
  if (t < U.rushTo && opp && !u.res) {   // rush toward the foe (stops in front)
    const per = Math.round(RANGER_SCREEN * U.reach / U.rushTo), dir = Math.sign(ctrX(opp) - ctrX(f)) || f.facing
    f.facing = dir
    const stop = dir === 1 ? opp.x - fw - 6 : opp.x + (opp.w || 48) + 6
    f.x = clampX(f, dir === 1 ? Math.min(stop, f.x + per) : Math.max(stop, f.x - per)); f.vx = 0
  }
  if (due(a, '_connect', U.rushTo)) {
    const near = opp && opp.health > 0 && Math.abs(ctrX(opp) - ctrX(f)) <= fw + (opp.w || 48) / 2 + 30 && (opp.invulnTimer || 0) <= 0
    if (!near) { u.res = 'whiff'; a.timer = Math.min(a.timer, 16) }
    else if (opp.isBlocking && Math.sign(ctrX(f) - ctrX(opp)) === (opp.facing || 1) && !cloneAlive(f)) {
      u.res = 'blocked'; nsStrike(f, opp, U.pool * 0.2, { move: 'nUlt', blockstun: 24 }); a.timer = Math.min(a.timer, 24)
    } else {
      u.res = 'hit'; u.plan = twinPlan(f, opp, U.pool, _W); if (u.plan.twin) s.stats.twin++
      opp.isBlocking = false; ncue(f, u.plan.twin ? 'twin' : 'burst')
    }
  }
  if (u.res === 'hit' && opp) {
    if (t < U.debrisAt) { opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = 0; if (opp.vy < 0) opp.vy *= 0.5 }
    U.ticks.forEach((at, i) => {
      if (!due(a, '_t' + i, at)) return
      const last = i === U.ticks.length - 1
      for (let b = 0; b < u.plan.bodies; b++) {   // b 0 = the ninja (front), b 1 = the clone (behind)
        const r = nsStrike(f, opp, u.plan.each * U.split[i], { fixedScale: u.scale, locked: true, move: 'nUlt', hitstun: last ? 60 : 40, kb: last ? 10 : 0, knockdown: last, launch: last ? -12 : 0 })
        if (r === true) u.hits++
      }
      if (last) s.stats.ultHits++
      ncue(f, last ? 'ultFinal' : 'ultTick')
    })
  }
  if (due(a, '_vanishRefill', 100)) { const r = f._ranger, p = getRangerProfile(f); if (r && p) { r.charges = p.blink.charges; r.refill = [] } }
}
export const nsUltPhase = f => {   // render: which strip the Ultimate body shows (pure read)
  const a = f?.currentAttack, u = f?._nsr?.ult
  if (!a || a.nsr?.kind !== 'ult' || !u || u.res !== 'hit') return null
  return u.t < NS_ULT.rushTo ? null : u.t < NS_ULT.debrisAt ? 'burst' : 'debris'
}
// replay / LAN checkpoint (game.js snapshot): every GAME_STATE slot this fighter owns
export function ninjaStormSnapshot(f) { return isNinjaStorm(f) ? { nsr: f._nsr ? { ...f._nsr, fx: undefined, swapFx: undefined } : null, academy: f._academy || null } : null }
export { useBackstep, kawarimi, beginMode, modeActive, NSR_KEY }
