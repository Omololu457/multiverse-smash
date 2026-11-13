// buggyState.js — Buggy the Clown authoritative state (GAME_STATE). Everything lives in `fighter._buggy` as plain
// JSON (numbers / booleans / strings / small arrays — no callbacks, no object refs), so it is in the replay
// checkpoint and reproduced bit-identically. No Math.random / gameRng anywhere in the kit: timings are fixed frame
// counts, positions derive from the fighters' positions, and any variation is hash(match seed, frame, player, slot).
import { BUGGY_MOVES, BUGGY_MASK_ANIM, buggy as BUGGY_CHAR } from './buggyData.js'
import { meleeDamageType, projectileDamageType, sourceDamageType, isHakiImbued } from './damageTypes.js'
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
    nulls: [],         // sim clocks of recent nullified slashes (Chop Stagger: 3 inside 300 frames)
    lastNull: -99,     // clock of the last nullify (multi-hit / damage-over-time dedupe)
    nullFlash: 0,      // frames left on the white-silhouette + split flash (render reads it)
    nullSeq: 0,        // nullify counter (render seed for the split-piece scatter)
    nullTotal: 0,      // nullified slashes this round (stat / tests)
    stagger: 0,        // Chop Stagger reassembly frames left (locked, cannot block, NOT slash-immune)
    maskLock: false,   // tests only: hold `mask` as set
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
  if (s.nullFlash > 0) s.nullFlash--
  if (s.stagger > 0) {   // CHOP STAGGER: reassembling — no attacks, no block (game.js updateMovementInput gate)
    s.stagger--
    f.attackCooldown = Math.max(f.attackCooldown || 0, 2)
    if (s.stagger === 0) bcue(f, 'reassemble')
  }
  applyMask(f, s)
}

// Masked body rows: point the renderer at the row for the current detached-part mask (presentation only).
function applyMask(f, s) {
  if (!s.maskLock) s.mask = (s.stagger > 0 ? 3 : 0) | (s.partMask | 0)   // ≤ 2 parts ever detached → rows 0-6
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

// ── BARA BARA NO MI (brief Phase 3) ────────────────────────────────────────────────────────────────────────────
// A SLASH (damageTypes.js) passes through Buggy's body: ZERO damage, no hitstun / hitstop / knockback, a white
// silhouette + split flash, +6 Chop. NOT immune to blunt / projectile / energy / grab, nor to Haki-imbued attacks.
// CHOP STAGGER: 3 nullified slashes inside 5 s (300 frames) → a 1 s (60 f) forced reassembly (head + hand fly back): he can't attack or
// block, and his body is NOT intangible while the pieces fly back (that is the blade user's punish window).
export const BUGGY_BARA = { staggerHits: 3, staggerWindow: 300, staggerFrames: 60, flash: 24, dedupe: 6 }

function slashImmune(b, attacker) {
  if (!isBuggy(b) || !attacker || attacker === b || !(b.health > 0)) return null
  const s = buggyState(b)
  if (s.stagger > 0) return null   // reassembling → vulnerable
  return s
}
function nullify(b, s, multi) {
  if (multi && s.clock - s.lastNull < BUGGY_BARA.dedupe) return true   // same multi-hit / DoT burst — absorb silently
  s.lastNull = s.clock
  s.nullFlash = BUGGY_BARA.flash; s.nullSeq++; s.nullTotal++
  gainChop(b, BUGGY_CHOP.perNullify)
  bcue(b, 'nullify')
  s.nulls = s.nulls.filter(t => s.clock - t < BUGGY_BARA.staggerWindow)
  s.nulls.push(s.clock)
  if (s.nulls.length >= BUGGY_BARA.staggerHits) {
    s.nulls = []
    s.stagger = BUGGY_BARA.staggerFrames
    b.isBlocking = false; b.blockstun = 0
    bcue(b, 'stagger')
  }
  return true
}
// combat.resolveAttackHit (melee). True → the swing passes through (caller consumes it).
export function buggyNullifyMelee(defender, attacker) {
  const s = slashImmune(defender, attacker); if (!s) return false
  const atk = attacker.currentAttack
  if (meleeDamageType(attacker, atk) !== 'slash' || isHakiImbued(attacker, atk)) return false
  return nullify(defender, s, false)
}
// combat.resolveProjectileHitsMulti. True → the projectile is spent harmlessly (caller removes it).
export function buggyNullifyProjectile(defender, proj) {
  const s = slashImmune(defender, proj?.owner); if (!s) return false
  if (projectileDamageType(proj) !== 'slash' || isHakiImbued(proj.owner, proj)) return false
  return nullify(defender, s, true)
}
// combat.applyScaledDamage (direct damage calls: specials, domains, DoT). Melee + projectile writes are already
// gated above, so their sources are skipped here. True → zero damage.
export function buggyNullifyDamage(target, opts = {}) {
  if (!isBuggy(target) || opts.source === 'projectile' || opts.source === 'block-chip') return false
  const s = slashImmune(target, opts.attacker); if (!s) return false
  if (sourceDamageType(opts) !== 'slash' || isHakiImbued(opts.attacker, opts)) return false
  return nullify(target, s, true)
}
// game.js updateMovementInput: Chop Stagger locks movement + guard.
export const buggyLocked = f => isBuggy(f) && (f._buggy?.stagger || 0) > 0
