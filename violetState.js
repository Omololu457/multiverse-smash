// Violet Parr (violet) — SIMULATION. Plain JSON on f._violet (snapshotted for replay / LAN determinism), sim ticks only:
// no Math.random, no gameRng, no wall clock; any variation comes from vhash(match seed, frame, player index).
// Every export is a strict no-op for any other rosterKey. Render-only presentation (alpha, flashes, shake, particles)
// never lives here — violetFx.js reads this state.
import { violet as V_CHAR, ENERGY, WALK_SPEED_STAT, RUN_SPEED_STAT, vhash } from './violetData.js'

export const isViolet = f => f?.rosterKey === 'violet'
const fresh0 = () => ({ tick: 0, hp: null, run: false, prev: {}, stats: { hitsLanded: 0, hitsTaken: 0, energyFromHits: 0, runs: 0 }, cues: [] })
export const vState = f => f._violet ||= fresh0()
const grounded = f => !!(f.onGround || f.grounded)
const addEnergy = (f, n) => { f.energy = Math.min(f.maxEnergy || ENERGY.max, (f.energy || 0) + n) }
export function cue(f, name, W) {
  const s = vState(f); s.cues.push({ k: name, h: vhash(W?.seed?.() || 1, W?.frame?.() ?? s.tick, f.playerNumber ?? (f.side === 'p2' ? 2 : 1)) })
  if (s.cues.length > 16) s.cues.shift()
}

export function clearViolet(f) {
  if (!f) return
  if (isViolet(f) && f._violet?.run) { f.runWhenAdvancing = false }
  delete f._violet
}

// ══ ENERGY (abilities.regenEnergy hook): Force Field recharges 5 / s (overrides the shared 0.06 / frame). ══
export function violetRegen(f) {
  if (!isViolet(f)) return false
  if (!f.maxEnergy) return true
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
  if (defender?.isBlocking) return
  violetHitLanded(attacker)
}
// weight 0.8: horizontal knockback she takes is divided by her weight (combat.js, beside zoroKnockback).
export function violetKnockback(attacker, defender, atk) {
  if (isViolet(defender) && defender.vx) defender.vx /= (V_CHAR.stats.weight || 1)
}

// ══ PER-SIMULATION-FRAME TICK (1v1 + FFA; before the shared physics / combat) ══════════════════════════════════
export function tickViolet(f, opp, raw, W) {
  if (!isViolet(f)) { if (f?._violet) clearViolet(f); return }
  const s = vState(f); s.tick++
  // +3 Force Field whenever she TAKES a hit (any source: melee, projectile, cinematic; not block chip) — health-delta detection.
  if (s.hp != null && f.health < s.hp && f.health > 0 && !(f.blockstun > 0) && !f.isBlocking) { s.stats.hitsTaken++; s.stats.energyFromHits += ENERGY.onHitTaken; addEnergy(f, ENERGY.onHitTaken) }
  s.hp = f.health
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
