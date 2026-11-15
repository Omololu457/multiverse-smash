// Violet Parr (violet) — SIMULATION. Plain JSON on f._violet (snapshotted for replay / LAN determinism), sim ticks only:
// no Math.random, no gameRng, no wall clock; any variation comes from vhash(match seed, frame, player index).
// Every export is a strict no-op for any other rosterKey. Render-only presentation (alpha, flashes, shake, particles)
// never lives here — violetFx.js reads this state.
import { violet as V_CHAR, ENERGY, WALK_SPEED_STAT, RUN_SPEED_STAT, VANISH, vhash, MOVES, PUSH, SHIELD, BALL, TRAP, ULT, MOTION, DEFENSE } from './violetData.js'

export const isViolet = f => f?.rosterKey === 'violet'
const fresh0 = () => ({ tick: 0, clock: 0, hp: null, run: false, prev: {}, edges: {}, used: {}, downTaps: [], dir: 5, toks: [], fwdTaps: [],
  inv: null, vanishCd: 0, reappear: 0, ambushArmed: false,
  push: null, trap: null, ult: null, lastHit: null, serial: 0, cd: { shield: 0, phase: 0 }, pshield: 0, instinct: null,
  stats: { hitsLanded: 0, hitsTaken: 0, energyFromHits: 0, runs: 0, vanishes: 0, vanishEnds: {}, ambushHits: 0, rejects: 0,
    moves: {}, pushHits: 0, pushBlocked: 0, shieldBlocks: 0, reflects: 0, ballHits: 0, ballAbsorbs: 0, traps: 0, trapFizzles: 0, ultHits: 0, chains: 0, jumpCancels: 0, phaseSteps: 0, phaseDodges: 0, instincts: 0 }, cues: [] })
export const vState = f => f._violet ||= fresh0()
const grounded = f => !!(f.onGround || f.grounded)
const addEnergy = (f, n) => { f.energy = Math.min(f.maxEnergy || ENERGY.max, (f.energy || 0) + n) }
export function cue(f, name, W) {
  // frame = this fighter's match tick (s.tick, reset every round) — never the global frame counter (menus / load time vary)
  const s = vState(f); s.cues.push({ k: name, h: vhash(W?.seed?.() || 1, s.tick, f.side === 'p2' ? 2 : 1) })
  if (s.cues.length > 16) s.cues.shift()
}

export function clearViolet(f) {
  if (!f) return
  if (isViolet(f)) { f.runWhenAdvancing = false; if (f._violet?.inv) f.damageMultiplier = 1 }
  delete f._violet
}

// ══ VANISH ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// s.inv = { t } while invisible (GAME_STATE: flag, timer, cooldown). The 35 % alpha and the R7 / R11 / R9 / R12 strips are
// render-only (violetView.js). The ambush bonus rides the shared offense scalar (damageMultiplier 1.2) while she is
// invisible, so the hit that ENDS Vanish is the only one that gets it.
export function vanishLegal(f) {
  const s = vState(f)
  return !s.inv && s.vanishCd <= 0 && (f.energy || 0) >= VANISH.cost && f.health > 0
}
export function enterVanish(f, W) {
  const s = vState(f)
  if (!vanishLegal(f)) { s.stats.rejects++; cue(f, 'reject', W); return false }
  f.energy -= VANISH.cost
  s.inv = { t: 0 }; s.reappear = 0; s.ambushArmed = true; s.stats.vanishes++
  f.damageMultiplier = VANISH.ambush
  cue(f, 'vanishIn', W)
  return true
}
export function endVanish(f, why, W) {
  const s = f?._violet; if (!s?.inv) return false
  s.inv = null; s.ambushArmed = false; s.vanishCd = VANISH.cooldown; s.reappear = VANISH.fadeIn
  s.stats.vanishEnds[why] = (s.stats.vanishEnds[why] || 0) + 1
  f.damageMultiplier = 1
  cue(f, 'vanishOut', W)
  return true
}
// Opponent facing (game.js updateFacing): while Violet is invisible the opponent does NOT auto-turn to face her — it keeps
// the facing it had at the end of the previous frame (its own walking still turns it: physics ties facing to walking).
export function violetFacingFix(f, v, prevFacing) {
  if (!f || !isViolet(v) || !v._violet?.inv || prevFacing == null) return
  f.facing = prevFacing
}

// ══ ENERGY (abilities.regenEnergy hook): Force Field recharges 5 / s (overrides the shared 0.06 / frame). ══
export function violetRegen(f) {
  if (!isViolet(f)) return false
  if (!f.maxEnergy || f._violet?.inv) return true   // no regen while invisible (Vanish drains 6 / s instead)
  addEnergy(f, ENERGY.regenPerSec / 60)
  return true
}
// +4 when a hit she lands connects (blocked hits do not count); called from combat.js and from her own strike path.
export function violetHitLanded(f) {
  if (!isViolet(f)) return
  const s = vState(f); s.stats.hitsLanded++; s.stats.energyFromHits += ENERGY.onHitLanded; addEnergy(f, ENERGY.onHitLanded)
}
// combat.js resolveAttackHit (attacker side): clean melee hit → energy.
export function violetHit(attacker, defender, atk, { armored = false } = {}) {
  if (!isViolet(attacker) || !atk) return
  if (attacker._violet?.inv) attacker._violet.inv.contact = 'hit'   // the ambush hit: Vanish ends on the next tick (bonus already applied)
  if (defender?.isBlocking) return
  if (atk.vi && !armored && !atk.vi.blocked) { atk.vi.clean = true; markHit(attacker, defender) }
  violetHitLanded(attacker)
}
// combat.js block branch (attacker side): a blocked strike still ends Vanish (her position is given away).
export function violetBlock(attacker, defender, atk, flawless = false) {
  if (!isViolet(attacker) || !atk) return
  if (attacker._violet?.inv) attacker._violet.inv.contact = 'blocked'
  if (atk.vi) { atk.vi.blocked = true; if (!flawless && MOVES[atk.vi.key]) defender.blockstun = MOVES[atk.vi.key].blockstun }   // authored on-block
}
// weight 0.8: horizontal knockback she takes is divided by her weight (combat.js, beside zoroKnockback).
export function violetKnockback(attacker, defender, atk) {
  if (isViolet(defender) && defender.vx) defender.vx /= (V_CHAR.stats.weight || 1)
}

// ══ INPUT EDGES (read once per sim tick from readRawControls — keyboard, pad, replay and LAN share it) ══
// Directions are FACING-relative and sampled on the press frame. downTaps keeps the last two Down press ticks (↓↓).
function readEdges(f, s, raw) {
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  const up = !!(raw.up || raw.jump), dn = !!raw.down
  const d = dn ? (bk ? 1 : fw ? 3 : 2) : up ? (bk ? 7 : fw ? 9 : 8) : (bk ? 4 : fw ? 6 : 5)
  if (d !== s.dir) { s.dir = d; s.toks.push([d, s.tick]); if (s.toks.length > 14) s.toks.shift() }
  if (fw && !s.prev.fwd) { s.fwdTaps.push(s.tick); if (s.fwdTaps.length > 2) s.fwdTaps.shift() }
  if (bk && !s.prev.back) { (s.backTaps ||= []).push(s.tick); if (s.backTaps.length > 2) s.backTaps.shift() }
  s.prev.fwd = fw; s.prev.back = bk
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'down', 'block', 'grab', 'jump', 'up']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) {
      s.edges[k] = { tick: s.tick, clock: s.clock, down: dn, up, fwd: fw, back: bk }
      if (k === 'special' || k === 'light') s.edges[k].motion = classifyMotion(s)
      if (k === 'down') { s.downTaps.push(s.tick); if (s.downTaps.length > 2) s.downTaps.shift() }
    }
    s.prev[k] = v
  }
}
// MOTION READER (numpad, facing-relative). seq's last step must be the most recent direction (one release to neutral after
// it is fine); earlier steps are found in order going back, diagonals between them allowed, each still held within `win`.
export function motionOk(s, seq, win) {
  const t = s.toks, now = s.tick; let i = t.length - 1
  if (i >= 0 && t[i][0] === 5 && now - t[i][1] <= MOTION.press) i--
  if (i < 0 || t[i][0] !== seq[seq.length - 1]) return false
  let k = seq.length - 2
  for (let j = i - 1; j >= 0 && k >= 0; j--) {
    if (now - t[j + 1][1] > win) break                      // token j ended when j+1 began
    if (t[j][0] === seq[k]) k--
  }
  return k < 0
}
function classifyMotion(s) {
  if (motionOk(s, MOTION.ult, MOTION.ultWindow)) return 'ult'
  if (motionOk(s, MOTION.push, MOTION.window)) return 'push'
  if (motionOk(s, MOTION.trap, MOTION.window)) return 'trap'
  if (motionOk(s, MOTION.shield, MOTION.window)) return 'shield'
  const [a, b] = s.fwdTaps
  if (s.fwdTaps.length === 2 && b - a <= MOTION.ballTap && s.tick - b <= MOTION.press) return 'ball'
  return null
}
// buffer age runs on s.clock, which pauses during her hitstop (a cancel pressed on the hit frame survives the freeze)
export const freshEdge = (s, k, win = 8) => !!s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - (s.edges[k].clock ?? s.edges[k].tick) <= win
export const useEdge = (s, k) => { s.used[k] = s.edges[k].tick }
// ↓↓ + Special: two Down presses within tapWindow, Special pressed within pressWindow of the second one (Down may still be held).
export function doubleDownSpecial(s) {
  const [a, b] = s.downTaps, e = s.edges.special
  return s.downTaps.length === 2 && b - a <= VANISH.tapWindow && !!e && e.tick >= b && e.tick - b <= VANISH.pressWindow
}

// ══ PHASE 4: MOVESET SIM ═════════════════════════════════════════════════════════════════════════════════════════
// Engine functions are injected by violet.js (combat.js imports this module — no import cycle).
const E = { startMove: null, comboScale: null, hitstunScale: null }
export function registerVioletEngine(o) { Object.assign(E, o) }
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const tidOf = o => o?.side ?? o?.playerNumber ?? 0
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
const byTid = (f, W, opp, tid) => foesOf(f, W, opp).find(o => tidOf(o) === tid) || null
const nearestFoe = (f, W, opp) => { let b = null, d = 1e9; for (const o of foesOf(f, W, opp)) { const k = Math.abs(ctrX(o) - ctrX(f)); if (k < d) { d = k; b = o } } return b }
const boxHitsCircle = (o, cx, cy, r) => { const nx = Math.max(o.x, Math.min(cx, o.x + (o.w || 48))), ny = Math.max(o.y, Math.min(cy, o.y + (o.h || 94))); return (nx - cx) ** 2 + (ny - cy) ** 2 <= r * r }
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const elapsed = a => a.total - a.timer
export const vLive = f => (f?.attacking && f.currentAttack?.vi) ? f.currentAttack : null
function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }
function markHit(f, t, kind = 'hit') { const s = vState(f); s.lastHit = { x: Math.round(ctrX(t)), y: Math.round(ctrY(t)), tick: s.tick, kind } }
const hittable = t => t && t.health > 0 && !((t.invulnTimer || 0) > 0) && !t.knockdownState && !t.isGrabbed && !t.domainUntouchable && !t._banished
export function rejectV(f, W) { const s = vState(f); s.stats.rejects++; cue(f, 'reject', W); return false }

// Shared strike for her payloads (push ring, ball, ultimate). Melee normals use the engine path (resolveAttackHit).
// raw × comboScale × offense × 0.60 (W.damage = applyScaledDamage); P.unscaled = flat damage (FULL FORCE).
export function vStrike(f, t, P, W) {
  if (!hittable(t) || (f.team && t.team && f.team === t.team)) return null
  const s = vState(f), dir = P.dir || Math.sign(ctrX(t) - ctrX(f)) || f.facing || 1
  const air = !(t.onGround || t.grounded)
  if (!P.unblockable && (t.isBlocking || (t.blockstun || 0) > 0)) {
    t.blockstun = Math.max(t.blockstun || 0, P.blockstun || 10); t.vx = dir * 3
    W?.damage?.(t, P.raw * 0.12, { source: 'block-chip', attacker: f, move: P.move, floor: 1 })
    if (s.inv) s.inv.contact = 'blocked'
    cue(f, 'blocked', W)
    return 'blocked'
  }
  if (P.unscaled) W?.damage?.(t, P.raw, { scale: 1, source: 'ultimate', attacker: f, move: P.move })
  else {
    const off = Math.max(f.damageMultiplier || 1, f.attackMultiplier || 1) / Math.max(0.5, t.defenseMultiplier || 1)
    W?.damage?.(t, P.raw * off * (E.comboScale?.(f) ?? 1), { source: 'special', attacker: f, move: P.move })
  }
  if (air) t.juggleCount = (t.juggleCount || 0) + 1
  t.hitstun = Math.max(t.hitstun || 0, Math.round((P.hitstun || 16) * (P.unscaled ? 1 : (E.hitstunScale?.(f) ?? 1))))
  if (P.kb) { t.vx = dir * P.kb[0]; t.vy = P.kb[1]; if (P.kb[1] < 0) { t.onGround = false; t.grounded = false } }
  t.isBlocking = false; t.attacking = false; t.currentAttack = null; t.colorFlash = 6; t.hitstop = Math.max(t.hitstop || 0, P.hitstop ?? 4)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  if (s.inv) s.inv.contact = 'hit'
  violetHitLanded(f); markHit(f, t, P.fx || 'hit')
  cue(f, P.cue || 'hit', W)
  return 'hit'
}

// ── move start (command layer → here). Specials are grounded; normals follow the air / ground split. ──
const AIR_ONLY = ['air'], GROUND = ['light', 'heavy', 'vLow', 'up', 'vPush', 'vShield', 'vBall', 'vTrap', 'vUlt', 'vPhase']
export function startVMove(f, key, W, opp, { cancel = false, chain = 0 } = {}) {
  if (!isViolet(f)) return false
  const s = vState(f), md = MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return rejectV(f, W)
  if (AIR_ONLY.includes(key) && g) return false
  if (GROUND.includes(key) && !g) return md.isSpecial ? rejectV(f, W) : false
  if (key === 'vPush' && s.push) return rejectV(f, W)                 // one ring on screen
  if (key === 'vTrap' && s.trap) return rejectV(f, W)                 // one trap at a time
  if (key === 'vShield' && s.cd.shield > 0) return rejectV(f, W)      // 6 s cooldown (nothing spent)
  if (key === 'vPhase' && s.cd.phase > 0) return rejectV(f, W)        // 5 s cooldown
  if ((md.cost || 0) > (f.energy || 0)) return rejectV(f, W)
  if (cancel) endAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (md.cost) f.energy = Math.max(0, (f.energy || 0) - md.cost)
  f.currentMove = key
  const a = f.currentAttack
  a.vi = { key, dir: f.facing || 1, clean: false, blocked: false, chain, hits: 0, last: -99, serial: ++s.serial }
  a.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false
  if (g) f.vx = 0
  if (key === 'vBall' || key === 'vPhase') { f.dashTimer = 0; f.isDashing = false }
  if (key === 'vShield') s.cd.shield = DEFENSE.shieldCooldown
  if (key === 'vPhase') { s.cd.phase = DEFENSE.phaseCooldown; s.stats.phaseSteps++ }
  if (key === 'vTrap') {
    const t = nearestFoe(f, W, opp)
    const x = t ? ctrX(t) : ctrX(f) + (f.facing || 1) * 220, y = t ? ctrY(t) : ctrY(f)
    s.trap = { x: Math.round(x), y: Math.round(y), t: 0, st: 'form', tid: null, hx: 0, hy: 0, hold: 0, hp: 0 }
  }
  s.stats.moves[key] = (s.stats.moves[key] || 0) + 1
  cue(f, md.isSpecial ? key : md.category === 'heavy' ? 'heavySwing' : 'swing', W)
  return true
}

// ── defensive states read by combat.js (violet-gated) ──
export function shieldUp(f) {
  if (isViolet(f) && f._violet?.pshield > 0) return true            // Protective Instinct dome
  const a = isViolet(f) && vLive(f); if (!a || a.vi.key !== 'vShield') return false
  const e = elapsed(a), md = MOVES.vShield
  return e >= md.startup && e < md.startup + md.active
}
export function ballArmored(f) {
  const a = isViolet(f) && vLive(f); if (!a || a.vi.key !== 'vBall') return false
  return elapsed(a) < MOVES.vBall.startup + MOVES.vBall.active
}
// combat.getAttackHitbox hook: body-less moves (specials, Phase Step) have NO strike box — without this the shared
// default (rangeX 0 → 50 px) would give them a box that clashes with incoming strikes.
export const violetNoBox = (f, a) => isViolet(f) && !!a?.vi && !!MOVES[a.vi.key]?.noBody
// Melee absorb (combat.js, beside absorbBatman): the dome stops every non-grab strike while it is up.
export function absorbViolet(f, source, attack) {
  if (!isViolet(f) || !attack) return false
  if (attack.damageType === 'grab' || attack.category === 'grab' || attack.isGrab) return false
  if (!shieldUp(f) && !instinct(f)) return false
  const s = vState(f); s.stats.shieldBlocks++; cue(f, 'shieldBlock')
  if (source) source.vx = (Math.sign(ctrX(source) - ctrX(f)) || 1) * 4
  return true
}
// Projectile hook (combat.js updateProjectiles, beside absorbSpdBlue): 'reflect' (dome: sent back at 1.2× speed, now hers),
// 'absorb' (Force Ball armour: consumed harmlessly) or false.
export function violetProjectile(f, proj) {
  if (!isViolet(f) || !proj || proj.owner === f) return false
  const s = vState(f)
  if (shieldUp(f) || instinct(f)) {
    const k = SHIELD.reflect
    proj.vx = -(proj.vx || 0) * k; if (proj.vy) proj.vy *= k
    if (proj.dir != null) proj.dir = -proj.dir
    if (proj.facing != null) proj.facing = -proj.facing
    proj.owner = f; proj.ownerId = f.side; if ('team' in proj) proj.team = f.team
    proj._violetReflected = (proj._violetReflected || 0) + 1
    proj.x += Math.sign(proj.vx || 1) * 40
    s.stats.reflects++; cue(f, 'reflect')
    return 'reflect'
  }
  if (ballArmored(f)) { s.stats.ballAbsorbs++; cue(f, 'shieldBlock'); return 'absorb' }
  return false
}
// ── PHASE 6: DEFENSE ──
// Protective Instinct: once per round, below 20 % health, the NEXT incoming strike / projectile pops a free 30f dome
// that catches it (returns true = this hit is absorbed). Armed state, use and timer live in f._violet (GAME_STATE).
export function instinct(f) {
  const s = vState(f)
  if (s.instinct === 'used' || f.health <= 0 || f.health >= (f.maxHealth || 900) * DEFENSE.instinctBelow) return false
  s.instinct = 'used'; s.pshield = DEFENSE.instinctFrames; s.stats.instincts++; cue(f, 'instinct')
  return true
}
export function phaseInvuln(f) {
  const a = isViolet(f) && vLive(f); if (!a || a.vi.key !== 'vPhase') return false
  const fr = elapsed(a) + 1                                              // press frame = frame 1
  return fr >= DEFENSE.phaseIframes[0] && fr <= DEFENSE.phaseIframes[1]
}
// 85 % per hit (combat._comboScale hook, the Zoro / Buggy precedent): hit n of a combo deals 0.85^(n−1).
export const violetComboScale = f => Math.pow(0.85, Math.max(0, f.comboCounter || 0))
// Movement lock (game.js updateMovementInput): committed moves own her velocity; a clean Launcher may be jump-cancelled.
export function violetLocked(f, raw = null) {
  if (!isViolet(f)) return false
  const s = vState(f)
  if (s.ult && s.ult.st !== 'done') return !!vLive(f)
  const a = vLive(f); if (!a) return false
  if (a.vi.key === 'up' && a.vi.clean && elapsed(a) > a.activeEnd && raw && (raw.up || raw.jump) && grounded(f)) {
    // follow-up hop that rises WITH the launched foe (a full 29-power jump would overshoot the pop)
    endAttack(f); f.vy = MOVES.up.jcVy; f.onGround = false; f.grounded = false; f.jumpHeld = true; f.jumpCount = Math.max(1, f.jumpCount || 0)
    s.stats.jumpCancels++; cue(f, 'jumpCancel')
    return false
  }
  return true
}

// ── per-tick move driver (called from tickViolet before the shared physics / combat) ──
function tickMove(f, s, W, opp) {
  const a = vLive(f); if (!a) return
  const k = a.vi.key, md = MOVES[k], e = elapsed(a), dir = a.vi.dir
  if (k === 'vPush' && e === md.startup && !s.push) {
    s.push = { x: Math.round(ctrX(f) + dir * 34), y: Math.round(f.y + (f.h || 94) * 0.45), dir, trav: 0, sp: PUSH.speed, refl: 0 }
    cue(f, 'pushFire', W)
  }
  if (k === 'vBall') {
    if (e >= md.startup && e < md.startup + md.active) {
      f.vx = dir * BALL.speed
      const box = { x: f.x - BALL.padX, y: f.y - BALL.padUp, w: (f.w || 48) + BALL.padX * 2, h: (f.h || 94) + BALL.padUp }
      if (a.vi.hits < BALL.hits && e - a.vi.last >= BALL.gap) {
        for (const t of foesOf(f, W, opp)) {
          if (!overlap(box, t)) continue
          const r = vStrike(f, t, { raw: BALL.raw, hitstun: BALL.hitstun, blockstun: BALL.blockstun, dir,
            kb: a.vi.hits === 0 ? BALL.kb1 : BALL.kb2, move: 'vBall', cue: 'ballHit', fx: 'ball' }, W)
          if (r === 'hit') { a.vi.hits++; a.vi.last = e; a.vi.clean = true; s.stats.ballHits++ }
          else if (r === 'blocked') { a.vi.blocked = true; a.vi.hits = BALL.hits; f.vx = -dir * 4; a.timer = Math.min(a.timer, md.recovery) }
          break
        }
      }
    } else if (e === md.startup + md.active) f.vx = 0
  }
  if (k === 'vPhase') {
    if (e < md.startup + md.active) f.vx = -dir * DEFENSE.phaseSpeed; else if (e === md.startup + md.active) f.vx = 0
  }
  if (k === 'vUlt' && e === md.startup && !s.ult) {
    const t = nearestFoe(f, W, opp)
    if (t && hittable(t) && Math.abs(ctrX(t) - ctrX(f)) <= ULT.range) {
      s.ult = { tid: tidOf(t), t: 0, st: 'trap', hx: t.x, hy: t.y, x: Math.round(ctrX(t)), y: Math.round(ctrY(t)), dir }
      vStrike(f, t, { raw: ULT.trap, unscaled: true, unblockable: true, hitstun: 4, move: 'vUlt', cue: 'ultTrap', fx: 'trap', hitstop: 0 }, W)
      s.stats.ultHits++
    } else { a.timer = Math.min(a.timer, md.recovery); cue(f, 'ultWhiff', W) }   // whiff: the 90f lockout still applies
  }
}
const hold = (t, hx, hy) => {
  t.x = hx; t.y = hy; t.vx = 0; t.vy = 0; t.hitstun = Math.max(t.hitstun || 0, 2)
  t.isBlocking = false; t.isDashing = false; t.dashTimer = 0
  if (t.attacking && !t.currentAttack?.isUltimate) { t.attacking = false; t.currentAttack = null; t.currentMove = null }
}
function tickTrap(f, s, W, opp) {
  const T = s.trap; if (!T) return
  T.t++
  if (T.st === 'form') {
    if (T.t < TRAP.delay) return
    const t = foesOf(f, W, opp).find(o => hittable(o) && boxHitsCircle(o, T.x, T.y, TRAP.r))
    if (!t) { T.st = 'fizzle'; T.t = 0; s.stats.trapFizzles++; cue(f, 'trapFizzle', W); return }
    T.st = 'hold'; T.t = 0; T.tid = tidOf(t); T.hx = t.x; T.hy = t.y; T.hp = t.health
    T.x = Math.round(ctrX(t)); T.y = Math.round(ctrY(t))
    s.stats.traps++; cue(f, 'trapCatch', W)
    hold(t, T.hx, T.hy); return
  }
  if (T.st === 'hold') {
    const t = byTid(f, W, opp, T.tid)
    // released when the hold ends, the victim is hit (the combo takes over: hitstun from that hit) or leaves play
    if (!t || T.t >= TRAP.hold || t.health < T.hp || t.isGrabbed) { T.st = 'pop'; T.t = 0; cue(f, 'trapPop', W); return }
    hold(t, T.hx, T.hy); return
  }
  if (T.t >= TRAP.fizzle) s.trap = null                             // 'fizzle' / 'pop' presentation tail, then gone
}
function tickPush(f, s, W, opp) {
  const P = s.push; if (!P) return
  P.x += P.dir * P.sp; P.trav += P.sp
  if (P.trav >= PUSH.range || P.x < -200 || P.x > (W?.stageWidth?.() || 3200) + 200) { s.push = null; return }
  for (const t of foesOf(f, W, opp)) {
    if (!boxHitsCircle(t, P.x, P.y, PUSH.r)) continue
    if (isViolet(t) && shieldUp(t) && P.refl < 3) {                  // mirror match: another Violet's dome sends the ring back
      const ts = vState(t)
      if (!ts.push) { ts.push = { ...P, dir: -P.dir, sp: P.sp * SHIELD.reflect, trav: 0, refl: P.refl + 1 }; ts.stats.reflects++; cue(t, 'reflect', W) }
      s.push = null; return
    }
    if (isViolet(t) && ballArmored(t)) { vState(t).stats.ballAbsorbs++; s.push = null; return }
    const r = vStrike(f, t, { raw: PUSH.raw, hitstun: PUSH.hitstun, blockstun: PUSH.blockstun, dir: P.dir, kb: PUSH.kb, move: 'vPush', cue: 'pushHit', fx: 'push' }, W)
    if (r) { if (r === 'hit') s.stats.pushHits++; else s.stats.pushBlocked++; s.push = null; return }
  }
}
function tickUlt(f, s, W, opp, tookHit) {
  const U = s.ult; if (!U) return
  U.t++
  const t = byTid(f, W, opp, U.tid)
  if (U.st === 'trap' || U.st === 'squeeze') {
    if (!t || tookHit || !vLive(f)) { U.st = 'done'; U.t = 0; return }  // interrupted (FFA third party) / victim gone
    hold(t, U.hx, U.hy)
    if (U.t === ULT.squeezeAt) { U.st = 'squeeze'; vStrike(f, t, { raw: ULT.squeeze, unscaled: true, unblockable: true, hitstun: 4, move: 'vUlt', cue: 'ultSqueeze', fx: 'trap', hitstop: 2 }, W) }
    if (U.t === ULT.blastAt) {
      U.st = 'blast'; U.bt = 0
      vStrike(f, t, { raw: ULT.blast, unscaled: true, unblockable: true, hitstun: 50, dir: U.dir, kb: ULT.launch, move: 'vUlt', cue: 'ultBlast', fx: 'blast', hitstop: 8 }, W)
    }
    return
  }
  if (U.st === 'blast' && U.t >= ULT.blastAt + 40) { U.st = 'done' }
  if (U.st === 'done' && !vLive(f)) s.ult = null
}

// ══ PER-SIMULATION-FRAME TICK (1v1 + FFA; before the shared physics / combat) ══════════════════════════════════
export function tickViolet(f, opp, raw, W) {
  if (!isViolet(f)) { if (f?._violet) clearViolet(f); return }
  const s = vState(f); s.tick++; if (!(f.hitstop > 0)) s.clock++
  readEdges(f, s, raw)
  // +3 Force Field whenever she TAKES a hit (any source: melee, projectile, cinematic; not block chip) — health-delta detection.
  if (s.hp != null && f.health < s.hp && f.health > 0 && !(f.blockstun > 0) && !f.isBlocking) { s.stats.hitsTaken++; s.stats.energyFromHits += ENERGY.onHitTaken; addEnergy(f, ENERGY.onHitTaken) }
  const tookHit = s.hp != null && f.health < s.hp
  s.hp = f.health
  // ── VANISH upkeep ──
  if (s.vanishCd > 0 && !s.inv) s.vanishCd--
  if (s.reappear > 0) s.reappear--
  if (s.inv) {
    s.inv.t++
    f.damageMultiplier = VANISH.ambush
    f.energy = Math.max(0, (f.energy || 0) - VANISH.drainPerSec / 60)
    if (tookHit || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || f.knockdownState) endVanish(f, 'hitTaken', W)
    else if (s.inv.contact) { if (s.inv.contact === 'hit') s.stats.ambushHits++; endVanish(f, s.inv.contact === 'hit' ? 'ambush' : 'blocked', W) }
    else if (s.inv.t >= VANISH.maxFrames) endVanish(f, 'timeout', W)
    else if ((f.energy || 0) <= 0) endVanish(f, 'empty', W)
  }
  // ── PHASE 6: cooldowns, instinct dome, Phase Step i-frames ──
  if (s.cd.shield > 0) s.cd.shield--
  if (s.cd.phase > 0) s.cd.phase--
  if (s.pshield > 0) s.pshield--
  // ── PHASE 4: moves / payloads / trap / ultimate ──
  tickMove(f, s, W, opp); tickPush(f, s, W, opp); tickTrap(f, s, W, opp); tickUlt(f, s, W, opp, tookHit)
  // i-frames: 2 because her own combat update decrements invulnTimer before the foe's strike resolves this frame;
  // cleared on the first frame after the window so frame 13 is hittable again
  if (phaseInvuln(f)) { f.invulnTimer = Math.max(f.invulnTimer || 0, 2); s.phaseInv = true }
  else { if (s.phaseInv && (f.invulnTimer || 0) <= 1) f.invulnTimer = 0; s.phaseInv = false }
  // RUN: a double-tap dash that ends with forward still held keeps going at runSpeed 8.0 until forward is released,
  // she attacks, leaves the ground or is hit. Walking speed is 5.4.
  const fw = !!(f.facing === -1 ? raw.left : raw.right)
  if ((f.dashTimer || 0) > 0 && grounded(f)) s.dashing = true
  else if (s.dashing) { s.dashing = false; if (fw && grounded(f) && !f.attacking) { s.run = true; s.stats.runs++ } }
  if (s.run && (!fw || !grounded(f) || f.attacking || f.hitstun > 0 || f.blockstun > 0 || f.isBlocking)) s.run = false
  const want = s.run ? RUN_SPEED_STAT : WALK_SPEED_STAT
  if (f.baseSpeed !== want || f.speed !== want) { f.baseSpeed = f.speed = want }
  f.runWhenAdvancing = !!s.run
}
