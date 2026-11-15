// Violet Parr (violet) — SIMULATION. Plain JSON on f._violet (snapshotted for replay / LAN determinism), sim ticks only:
// no Math.random, no gameRng, no wall clock; any variation comes from vhash(match seed, frame, player index).
// Every export is a strict no-op for any other rosterKey. Render-only presentation (alpha, flashes, shake, particles)
// never lives here — violetFx.js reads this state.
import { violet as V_CHAR, ENERGY, WALK_SPEED_STAT, RUN_SPEED_STAT, VANISH, vhash } from './violetData.js'

export const isViolet = f => f?.rosterKey === 'violet'
const fresh0 = () => ({ tick: 0, hp: null, run: false, prev: {}, edges: {}, used: {}, downTaps: [],
  inv: null, vanishCd: 0, reappear: 0, ambushArmed: false,
  stats: { hitsLanded: 0, hitsTaken: 0, energyFromHits: 0, runs: 0, vanishes: 0, vanishEnds: {}, ambushHits: 0, rejects: 0 }, cues: [] })
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
  violetHitLanded(attacker)
}
// combat.js block branch (attacker side): a blocked strike still ends Vanish (her position is given away).
export function violetBlock(attacker, defender, atk) {
  if (!isViolet(attacker) || !atk) return
  if (attacker._violet?.inv) attacker._violet.inv.contact = 'blocked'
}
// weight 0.8: horizontal knockback she takes is divided by her weight (combat.js, beside zoroKnockback).
export function violetKnockback(attacker, defender, atk) {
  if (isViolet(defender) && defender.vx) defender.vx /= (V_CHAR.stats.weight || 1)
}

// ══ INPUT EDGES (read once per sim tick from readRawControls — keyboard, pad, replay and LAN share it) ══
// Directions are FACING-relative and sampled on the press frame. downTaps keeps the last two Down press ticks (↓↓).
function readEdges(f, s, raw) {
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'down', 'block', 'grab']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) {
      s.edges[k] = { tick: s.tick, down: !!raw.down, up: !!(raw.up || raw.jump), fwd: fw, back: bk }
      if (k === 'down') { s.downTaps.push(s.tick); if (s.downTaps.length > 2) s.downTaps.shift() }
    }
    s.prev[k] = v
  }
}
export const freshEdge = (s, k, win = 8) => !!s.edges[k] && s.used[k] !== s.edges[k].tick && s.tick - s.edges[k].tick <= win
export const useEdge = (s, k) => { s.used[k] = s.edges[k].tick }
// ↓↓ + Special: two Down presses within tapWindow, Special pressed within pressWindow of the second one (Down may still be held).
export function doubleDownSpecial(s) {
  const [a, b] = s.downTaps, e = s.edges.special
  return s.downTaps.length === 2 && b - a <= VANISH.tapWindow && !!e && e.tick >= b && e.tick - b <= VANISH.pressWindow
}

// ══ PER-SIMULATION-FRAME TICK (1v1 + FFA; before the shared physics / combat) ══════════════════════════════════
export function tickViolet(f, opp, raw, W) {
  if (!isViolet(f)) { if (f?._violet) clearViolet(f); return }
  const s = vState(f); s.tick++
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
