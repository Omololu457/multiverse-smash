// buggyState.js — Buggy the Clown authoritative state (GAME_STATE). Everything lives in `fighter._buggy` as plain
// JSON (numbers / booleans / strings / small arrays — no callbacks, no object refs), so it is in the replay
// checkpoint and reproduced bit-identically. No Math.random / gameRng anywhere in the kit: timings are fixed frame
// counts, positions derive from the fighters' positions, and any variation is hash(match seed, frame, player, slot).
import { BUGGY_MOVES, BUGGY_MASK_ANIM, buggy as BUGGY_CHAR } from './buggyData.js'
export const isBuggy = f => f?.rosterKey === 'buggy'
// Audio cue queue (presentation only — played + cleared by game.js right after tickBuggy; never read by the sim).
export function bcue(f, c) { (f._buggyCues ||= []).push(c) }

// CHOP economy (brief Phase 2). Passive +1.5/s = +1 every 40 sim frames.
export const BUGGY_CHOP = { perKnifeHit: 4, perPartHit: 3, passiveEvery: 40, perNullify: 6 }
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function buggyState(f) {
  if (!isBuggy(f)) return null
  return f._buggy ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (advances EVERY call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Chop
    idle: 0,           // consecutive neutral-idle frames (head look-around after 600)
    prev: {}, edgeAt: {}, edgeClk: {}, used: {},   // raw buttons last tick / press-edge tick / press-edge SIM clock / edge consumed
    dirs: [],          // condensed facing-relative direction history [[numpad, tick], …] (motion inputs)
    lockout: 0,        // Chop lockout after the Super (frames)
    mask: 0,           // detached-part bitmask for the masked body rows (1 head · 2 hand · 4 foot)
    serial: 0,         // projectile serial (render bookkeeping)
  }
}

// Round/match reset (game.js runs this right AFTER the shared revertGoku(_f), which stamps speed 84 / dash 16 on
// EVERY fighter). Re-apply Buggy's own speed 80 / dashSpeed 13. Buggy-gated; no other fighter is touched.
export function buggyRoundReset(f) {
  if (!isBuggy(f)) return
  const st = BUGGY_CHAR.stats
  f.baseSpeed = f.speed = st.speed
  f.dashSpeed = st.dashSpeed
  if (f._buggy) { delete f._buggy }
  f._skinAnim = null
}
export function clearBuggy(f) {
  if (f?._buggy || isBuggy(f)) { delete f._buggy; delete f._buggyCues; if (isBuggy(f)) f._skinAnim = null }
}

export const chopBlocked = f => !!(f?._buggy && f._buggy.lockout > 0)
export function gainChop(f, n) { if (isBuggy(f) && !chopBlocked(f)) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + n) }

const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
// W = world accessors from game.js (projectiles, spawn, applyDamage, stageWidth, …).
export function tickBuggy(f, opp, raw = {}, W = null) {
  if (!isBuggy(f)) { if (f?._buggy) clearBuggy(f); return }
  const s = buggyState(f)
  s.tick++
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock } s.prev[k] = v }
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  if (f.health <= 0) return
  if (f.hitstop > 0) return
  s.clock++
  if (s.lockout > 0) s.lockout--
  applyMask(f, s)
}

// Masked body rows: point the renderer at the row for the current detached-part mask (presentation only).
function applyMask(f, s) {
  const m = s.mask | 0
  const want = m ? BUGGY_MASK_ANIM[m] : null
  if ((f._skinAnim || null) !== want) f._skinAnim = want
}

// Passive Chop regen: +1.5 per second while alive (+1 every 40 frames). Replaces the shared passive regen.
export function buggyRegen(f) {
  if (!isBuggy(f)) return false
  const s = buggyState(f)
  if (f.health > 0 && !(f.hitstop > 0)) {
    if (++s.passive >= BUGGY_CHOP.passiveEvery) { s.passive = 0; gainChop(f, 1) }
  }
  return true
}

// Melee hit bookkeeping (combat.resolveAttackHit, clean connects only): +4 Chop per knife (slash) hit.
export function buggyHit(attacker, defender, atk) {
  if (isBuggy(attacker) && attacker !== defender) {
    const md = BUGGY_MOVES[atk?.name]
    if ((md?.damageType || atk?.damageType) === 'slash') { gainChop(attacker, BUGGY_CHOP.perKnifeHit); bcue(attacker, 'knifeHit') }
  }
}
// Knockback post-process on a connecting melee hit: weight 0.9 → knockback taken ÷ 0.9.
export function buggyKnockback(attacker, defender) {
  if (isBuggy(defender) && defender.vx) defender.vx /= (BUGGY_CHAR.stats.weight || 0.9)
}
