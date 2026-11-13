/**
 * rangers.js — REUSABLE POWER RANGERS FRAMEWORK (profile-driven, like flight.js / drones.js).
 *
 * Every Ranger is a DATA PROFILE registered here (RANGER_PROFILES / registerRangerProfile). The framework owns the
 * four systems every Ranger shares; a character module only adds its own moves on top:
 *
 *   1. BLINK TELEPORT — double-tap ←/→ (and ↑/↓ when the profile allows). Charges + recharge, a startup / invulnerable
 *      travel / recovery split, stage-edge clamps, opponent crossup rule, air blink (keeps momentum), optional run
 *      after a ground blink, dodge detection (the invulnerable window overlapping a foe's live hitbox / projectile).
 *   2. MORPH state machine — 'unmorphed' → 'morphing' → 'morphed'. `alwaysMorphed: true` = born morphed, never leaves.
 *   3. JUDGMENT — generic meter + verdict rule (data) + time-freeze + GUILTY containment / INNOCENT refund. A Ranger
 *      without `judgment` in its profile simply has none. A Ranger opponent is always INNOCENT (rangerAlwaysInnocent).
 *   4. TEAM BADGE — colour + emblem per profile, used for HUD tinting and effect recolours.
 *
 * SIM vs RENDER
 *   • ALL gameplay state lives in `fighter._ranger` as plain JSON (numbers / strings / booleans / small arrays) — it is
 *     pushed into the replay checkpoint snapshot by game.js, so it is GAME_STATE and reproduces bit-identically.
 *   • No Math.random / gameRng anywhere. Sim randomness (none is needed by the framework itself) must use
 *     hashRandom(match seed, frame, player index) from flight.js — re-exported here as rangerHash for Ranger kits.
 *   • Double-tap detection runs on SIM ticks (press edges counted per call), never on wall-clock keydown times →
 *     deterministic in replays, LAN and the harness (the engine's own double-tap dash uses wall-clock time, so a
 *     Ranger turns it off with `noDash` and the framework owns the double-tap).
 *   • Streaks, afterimages, sparks, the dissolve: RENDER-ONLY. The renderer reads `fighter._ranger.blink` (phase,
 *     x0/x1, dodge flag) and never writes it. rangerBodyAlpha() is a pure function of that state.
 *
 * WORLD ACCESSORS (W, handed in by game.js every tick — the framework never imports the engine):
 *   W.stageWidth() · W.frame() · W.seed() · W.attackBox(fighter) → rect|null · W.projectiles(owner) → [rect]
 *
 * Adding a Ranger = registerRangerProfile('<rosterKey>', { ...data }) — no logic changes. See
 * docs/rangers/RANGER_FRAMEWORK.md for every field.
 */
import { hashRandom, flightSoftLimit } from './flight.js'

export const rangerHash = hashRandom   // hash(match seed, frame, player index) → [0,1) — the ONLY sim randomness source
// Reference screen for every "% of the screen" figure: a FIXED 1280 px (never the device canvas) → LAN-safe.
export const RANGER_SCREEN = 1280
export const RANGER_SCREEN_H = 720

// ── Defaults every profile inherits (override per Ranger) ───────────────────────────────────────────────────────
export const BLINK_DEFAULTS = Object.freeze({
  distPct: 0.22,        // horizontal travel = 22% of the reference screen (282 px)
  startup: 3,           // visible wind-up frames (he can still be hit)
  travel: 5,            // INVULNERABLE travel frames (he is gone)
  recovery: 3,          // visible landing frames (vulnerable, cannot act)
  charges: 2,           // max charges
  recharge: 90,         // frames to refill ONE spent charge (each spent charge refills on its own timer)
  crossup: false,       // may the blink pass THROUGH the opponent?
  air: true,            // may blink while airborne (costs a charge, keeps momentum)
  vertical: false,      // ↑↑ / ↓↓ blinks
  verticalPct: 0.25,    // vertical travel = 25% of the reference screen HEIGHT (180 px)
  tapWindow: 12,        // ticks between the two taps of a double-tap
  gap: 6,               // px left between him and the foe when the blink stops IN FRONT of them
  faceLockOnCross: 0,   // frames the foe keeps facing the wrong way after a crossup (PHASE STEP)
  run: null,            // { speed (px/f), walk (px/f) } — holding the direction after a ground blink keeps running
  dodge: null,          // { energy, window, dmgMul } — reward when the invulnerable travel overlaps a live foe hitbox
  airMomentumMax: 14,   // |vx| cap on the momentum an air blink carries (flight.js softLimit)
})
export const MORPH_DEFAULTS = Object.freeze({ alwaysMorphed: false, morphFrames: 40 })
export const JUDGMENT_DEFAULTS = Object.freeze({
  meterMax: 20, perHit: 1,
  rule: { type: 'hpAtOrBelow', pct: 0.30 },   // the verdict rule (see VERDICT_RULES)
  freeze: 30,                                  // frames time stops while the morpher scans
  guilty: { seal: 180, absorb: 0.5, release: 'farSide', releaseDist: 0.45 },   // containment card
  innocent: { energy: 40, holdFull: 300 },     // refund + meter stays full for a re-attempt
  oncePerRound: true,
  rangerAlwaysInnocent: true,
})

// ── Registry ────────────────────────────────────────────────────────────────────────────────────────────────────
export const RANGER_PROFILES = {}
export function registerRangerProfile(id, p = {}) {
  RANGER_PROFILES[id] = {
    id,
    team: p.team || 'Power Rangers',
    ownTick: !!p.ownTick,   // true = the Ranger's own <key>State.js tick calls tickRanger (S.P.D. Red); false = profile-only, ticked by the generic hook
    badge: { color: '#ff3b6b', accent: '#ffffff', emblem: null, ...(p.badge || {}) },
    blink: { ...BLINK_DEFAULTS, ...(p.blink || {}) },
    morph: { ...MORPH_DEFAULTS, ...(p.morph || {}) },
    judgment: p.judgment ? { ...JUDGMENT_DEFAULTS, ...p.judgment,
      guilty: { ...JUDGMENT_DEFAULTS.guilty, ...(p.judgment.guilty || {}) },
      innocent: { ...JUDGMENT_DEFAULTS.innocent, ...(p.judgment.innocent || {}) } } : null,
    sprites: { ...(p.sprites || {}) },   // render keys the Ranger's FX layer uses (streak / vanish / emblem …)
  }
  return RANGER_PROFILES[id]
}
export const getRangerProfile = f => RANGER_PROFILES[typeof f === 'string' ? f : f?.rosterKey] || null
export const hasRangerKit = f => !!getRangerProfile(f)

// Is this fighter a Power Ranger? (a registered profile, OR any roster Ranger of the power_rangers universe —
// Omega, the Samurai Rangers, MMPR Red … — so Ranger-vs-Ranger rules work against fighters built before the
// framework existed). Krybots and other non-Ranger power_rangers entries are NOT Rangers.
export function isRanger(f) {
  if (!f) return false
  if (hasRangerKit(f)) return true
  const k = String(f.rosterKey || '').toLowerCase()
  return f.universe === 'power_rangers' && /ranger/.test(k)
}

// ── State (GAME_STATE) ─────────────────────────────────────────────────────────────────────────────────────────
const DIRS = ['left', 'right', 'up', 'down']
export function ensureRangerState(f) {
  const p = getRangerProfile(f); if (!p) return null
  return f._ranger ||= {
    tick: 0,                       // input ticks (every call, even in hitstop) — tap timestamps
    prev: {}, tapAt: {},           // raw direction last tick · tick of the last press edge per direction
    charges: p.blink.charges,      // BLINK charges available
    refill: [],                    // frames left on each spent charge's refill timer (one entry per spent charge)
    blink: null,                   // live blink { t, dir, vdir, phase, x0, y0, x1, y1, air, vx, vy, crossed, dodge, cancel }
    blinks: 0,                     // blinks performed this round (stats / tests)
    lastDodge: 0,                  // blinks count at the last rewarded dodge (one reward per blink)
    dodgeBuff: 0,                  // frames left on the post-dodge damage buff
    running: 0,                    // 1/-1 while running after a ground blink (world direction), 0 otherwise
    faceLock: 0, faceLockDir: 0,   // PHASE STEP: frames the foe stays facing faceLockDir
    morph: p.morph.alwaysMorphed ? 'morphed' : 'unmorphed', morphT: 0,
    judg: p.judgment ? { meter: 0, used: false, phase: null, t: 0, verdict: null, guilty: false, hold: 0, retried: false,
      contain: 0, sealX: 0, sealY: 0, innocentPaid: false, count: 0 } : null,
    events: [],                    // this tick's events for the character module ({type, …}); cleared each tick
  }
}
export function clearRanger(f) { if (f?._ranger) delete f._ranger }
const ev = (r, type, o = {}) => r.events.push({ type, ...o })

const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const grounded = f => !!(f.onGround || f.grounded)
const overlaps = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// ── 1. BLINK TELEPORT ──────────────────────────────────────────────────────────────────────────────────────────
export const blinkTotal = p => p.blink.startup + p.blink.travel + p.blink.recovery
export const isBlinking = f => !!f?._ranger?.blink
export const blinkPhase = f => f?._ranger?.blink?.phase || null
// Free to start a blink right now? (opts.cancel = a move the character module is cancelling out of)
export function canBlink(f, opts = {}) {
  const r = f?._ranger, p = getRangerProfile(f)
  if (!r || !p || r.blink || r.charges <= 0 || r.noBlink) return false
  if (!(f.health > 0) || f.isGrabbed || f.knockdownState) return false
  if ((f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || (f.stun || 0) > 0) return false
  if (f.attacking && !opts.cancel) return false
  if (!grounded(f) && !p.blink.air) return false
  if (r.sealed) return false
  return true
}
// Start a blink in world direction dir (-1/1, 0 = vertical only) / vdir (-1 up, 1 down, 0 none). Spends one charge.
export function startBlink(f, dir, vdir = 0, opts = {}) {
  if (!canBlink(f, opts)) return false
  const r = f._ranger, p = getRangerProfile(f)
  if (opts.cancel && f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  r.charges--; r.refill.push(p.blink.recharge)
  r.blink = { t: 0, dir: dir | 0, vdir: vdir | 0, phase: 'start', x0: Math.round(f.x || 0), y0: Math.round(f.y || 0), x1: null, y1: null,
    air: !grounded(f), vx: f.vx || 0, vy: f.vy || 0, crossed: false, dodge: false, cancel: !!opts.cancel, n: ++r.blinks }
  r.running = 0
  f.isBlocking = false
  ev(r, 'blinkStart', { dir, vdir, air: r.blink.air, cancel: !!opts.cancel })
  return true
}
// Cancel a blink still in its visible wind-up (before the vanish) and give the charge back — used when the double-tap
// was really the first half of a →→ + button command. Returns true if a blink was refunded.
export function refundBlink(f) {
  const r = f?._ranger, b = r?.blink
  if (!b || b.phase !== 'start' || b.x1 != null) return false
  r.blink = null; r.charges++; r.refill.pop(); r.blinks--; f._rooted = false
  ev(r, 'blinkRefund', {}); return true
}
// Destination, resolved on the vanish frame from the fighters' positions at that moment (deterministic).
function resolveDest(f, opp, b, p, W) {
  const sw = W?.stageWidth?.() || 3200, fw = f.w || 48, B = p.blink
  let x1 = b.x0 + b.dir * Math.round(RANGER_SCREEN * B.distPct)
  x1 = Math.max(0, Math.min(sw - fw, x1))
  if (b.dir && opp && opp.health > 0) {
    const ow = opp.w || 48, oL = opp.x || 0, oR = oL + ow
    const startBefore = b.dir > 0 ? b.x0 + fw <= oL + ow / 2 : b.x0 >= oR - ow / 2   // the foe is ahead of him
    const passes = startBefore && (b.dir > 0 ? x1 + fw / 2 > oL + ow / 2 : x1 + fw / 2 < oL + ow / 2)
    const inside = x1 < oR && x1 + fw > oL
    if (passes && B.crossup) {
      // clear the foe's body completely (land just past them); against a wall with no room → stop in front instead
      if (inside) x1 = b.dir > 0 ? oR + B.gap : oL - fw - B.gap
      if (x1 < 0 || x1 > sw - fw) x1 = b.dir > 0 ? oL - fw - B.gap : oR + B.gap
      else b.crossed = true
    } else if ((passes || inside) && startBefore) x1 = b.dir > 0 ? oL - fw - B.gap : oR + B.gap   // stops IN FRONT
    x1 = Math.max(0, Math.min(sw - fw, x1))
  }
  let y1 = b.y0
  if (b.vdir) {
    const floor = (f._rangerFloorY ?? (b.y0 + (f.h || 94))) - (f.h || 94)
    y1 = Math.min(floor, Math.max(-360, b.y0 + b.vdir * Math.round(RANGER_SCREEN_H * B.verticalPct)))
  }
  b.x1 = Math.round(x1); b.y1 = Math.round(y1)
  b.oppFacing = opp?.facing || 1   // PHASE STEP locks the foe to the way it faced BEFORE he passed through it
}
function stepBlink(f, opp, r, p, W) {
  const b = r.blink, B = p.blink, t = b.t
  const tEnd = B.startup + B.travel, total = tEnd + B.recovery
  f._rooted = true; f.dashTimer = 0
  if (t < B.startup) {   // wind-up: planted on the ground, frozen in the air
    b.phase = 'start'; f.vx = 0; if (b.air) { f.vy = 0; f.y = b.y0 }
  } else if (t < tEnd) {   // invulnerable travel
    if (t === B.startup) { resolveDest(f, opp, b, p, W); ev(r, 'vanish', { x0: b.x0, x1: b.x1, crossed: b.crossed }) }
    b.phase = 'travel'
    const u = (t - B.startup + 1) / B.travel
    f.x = Math.round(b.x0 + (b.x1 - b.x0) * u); f.y = Math.round(b.y0 + (b.y1 - b.y0) * u)
    f.vx = 0; f.vy = 0
    f.invulnTimer = Math.max(f.invulnTimer || 0, tEnd - t)
    // DODGE: the invulnerable window overlapped a live enemy hitbox / projectile (where he was OR where he is)
    if (B.dodge && !b.dodge && opp && W) {
      const hb = { x: f.x + 6, y: f.y + 6, w: Math.max(1, (f.w || 48) - 12), h: Math.max(1, (f.h || 94) - 6) }
      const from = { ...hb, x: b.x0 + 6, y: b.y0 + 6 }
      const threats = [W.attackBox?.(opp), ...(W.projectiles?.(opp) || [])].filter(Boolean)
      if (threats.some(z => overlaps(z, hb) || overlaps(z, from))) {
        b.dodge = true; r.lastDodge = b.n; r.dodgeBuff = B.dodge.window || 20
        ev(r, 'dodge', { energy: B.dodge.energy || 0 })
      }
    }
    if (t === tEnd - 1) {
      ev(r, 'arrive', { x: b.x1, crossed: b.crossed, dodge: b.dodge })
      if (b.air) { f.vx = flightSoftLimit(b.vx, B.airMomentumMax, { overspeedDrag: 0 }); f.vy = b.vy }   // keeps momentum
      if (b.crossed && opp && B.faceLockOnCross > 0) { r.faceLock = B.faceLockOnCross - 1; r.faceLockDir = b.oppFacing || opp.facing || 1; opp.facing = r.faceLockDir }   // arrival frame + (N − 1) more = exactly N frames (updateFacing runs before the next tick)   // PHASE STEP
      if (opp) f.facing = ctrX(opp) < ctrX(f) ? -1 : 1
    }
  } else {   // recovery
    b.phase = 'recover'
    if (!b.air) f.vx = 0
  }
  if (++b.t >= total) {
    r.blink = null; f._rooted = false
    ev(r, 'blinkEnd', {})
    return true
  }
  return false
}

// PHASE STEP facing lock (game.js calls this right after its global updateFacing()). The JUDGE's state holds the
// lock; the victim's facing is forced to the pre-crossup direction until it runs out.
export function rangerFacingFix(f, opp) {
  const r = f?._ranger
  if (r && r.faceLock > 0 && opp && opp.health > 0) opp.facing = r.faceLockDir
}

// ── 2. MORPH ───────────────────────────────────────────────────────────────────────────────────────────────────
export function startMorph(f) {
  const r = f?._ranger, p = getRangerProfile(f)
  if (!r || !p || r.morph !== 'unmorphed') return false
  r.morph = 'morphing'; r.morphT = p.morph.morphFrames; ev(r, 'morphStart'); return true
}
export const isMorphed = f => (f?._ranger?.morph || (getRangerProfile(f)?.morph.alwaysMorphed ? 'morphed' : 'unmorphed')) === 'morphed'

// ── 3. JUDGMENT ────────────────────────────────────────────────────────────────────────────────────────────────
// Verdict rules are DATA: { type, … }. Add a rule type here once and any Ranger profile can use it.
export const VERDICT_RULES = {
  hpAtOrBelow: (rule, judge, target) => (target.health || 0) <= (target.maxHealth || 1000) * rule.pct,   // GUILTY at or below pct HP
  comboAtLeast: (rule, judge, target) => (judge.comboCounter || 0) >= rule.hits,
  never: () => false,
}
// Pure: the verdict this judge would hand this target right now. 'guilty' | 'innocent'.
export function judgmentVerdict(judge, target) {
  const p = getRangerProfile(judge), J = p?.judgment
  if (!J || !target) return 'innocent'
  if (J.rangerAlwaysInnocent && isRanger(target)) return 'innocent'   // a fellow Ranger is never guilty
  const fn = VERDICT_RULES[J.rule?.type] || VERDICT_RULES.never
  return fn(J.rule, judge, target) ? 'guilty' : 'innocent'
}
export function judgmentAddHit(f, n) {
  const r = f?._ranger, J = getRangerProfile(f)?.judgment
  if (!r?.judg || !J || r.judg.used || r.judg.phase || r.judg.hold > 0) return
  r.judg.meter = Math.min(J.meterMax, r.judg.meter + (n ?? J.perHit))
}
export function judgmentReady(f) {
  const j = f?._ranger?.judg, J = getRangerProfile(f)?.judgment
  if (!j || !J || j.phase || j.contain > 0) return false
  if (j.hold > 0) return !j.retried            // INNOCENT re-attempt window (one re-attempt)
  return !j.used && j.meter >= J.meterMax
}
// Begin: time freezes (the target is held in hitstop for `freeze` frames) while the morpher scans.
export function judgmentBegin(f, target) {
  if (!judgmentReady(f) || !target) return false
  const j = f._ranger.judg, J = getRangerProfile(f).judgment
  if (j.hold > 0) { j.retried = true; j.hold = 0 }
  j.phase = 'freeze'; j.t = 0; j.verdict = null; j.count++
  target.hitstop = Math.max(target.hitstop || 0, J.freeze)
  target.isBlocking = false
  ev(f._ranger, 'judgmentBegin', {})
  return true
}
function stepJudgment(f, opp, r, p, W) {
  const j = r.judg, J = p.judgment
  if (j.phase === 'freeze') {
    if (++j.t >= J.freeze) {
      j.phase = null
      const v = opp ? judgmentVerdict(f, opp) : 'innocent'
      j.verdict = v
      if (v === 'guilty') {
        j.guilty = true; j.used = true; j.meter = 0
        j.contain = J.guilty.seal; j.sealX = Math.round(opp.x || 0); j.sealY = Math.round(opp.y || 0)
        ev(r, 'guilty', {})
      } else {
        const first = !j.innocentPaid
        j.innocentPaid = true
        if (j.retried) { j.used = true; j.meter = 0; j.hold = 0 }   // the re-attempt was the last try this round
        else { j.hold = J.innocent.holdFull; j.meter = J.meterMax }
        ev(r, 'innocent', { energy: first ? J.innocent.energy : 0 })
      }
    }
  }
  if (j.hold > 0 && --j.hold <= 0) { j.meter = 0; j.used = !!J.oncePerRound }   // the re-attempt window closed
  if (j.contain > 0 && opp) {
    // SEALED in the containment card: cannot act, pinned where it was sealed (hits still land, the card soaks 50%)
    opp.hitstun = Math.max(opp.hitstun || 0, 2); opp.isBlocking = false; opp.attacking = false; opp.currentAttack = null
    opp.vx = 0; opp.vy = 0; opp.x = j.sealX; opp.y = j.sealY; opp.knockdownState = false
    if (--j.contain <= 0) {   // release at the FAR side of the screen from the judge
      const sw = W?.stageWidth?.() || 3200, ow = opp.w || 48
      const away = Math.sign(ctrX(opp) - ctrX(f)) || -(f.facing || 1)
      opp.x = Math.round(Math.max(0, Math.min(sw - ow, ctrX(f) + away * RANGER_SCREEN * J.guilty.releaseDist - ow / 2)))
      opp.hitstun = 0
      ev(r, 'release', { x: opp.x })
    }
  }
}
export const isSealed = (target, judge) => !!judge?._ranger?.judg && judge._ranger.judg.contain > 0
// combat.js damage choke-point hook: a sealed target takes (1 − absorb) of every hit (the card soaks the rest).
export function rangerSealAbsorb(target, judge) {
  if (!isSealed(target, judge)) return 1
  return 1 - (getRangerProfile(judge)?.judgment?.guilty.absorb ?? 0.5)
}

// ── 4. TEAM BADGE ──────────────────────────────────────────────────────────────────────────────────────────────
export const rangerBadge = f => getRangerProfile(f)?.badge || null
// Recolour helper for effects: the team colour at alpha a (render-only).
export function badgeRGBA(f, a = 1, which = 'color') {
  const hex = (rangerBadge(f)?.[which] || '#ffffff').replace('#', '')
  const n = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// ── Per-sim-frame tick ─────────────────────────────────────────────────────────────────────────────────────────
// raw = the fighter's raw controls this frame. Returns this tick's events (also on f._ranger.events).
export function tickRanger(f, opp, raw = {}, W = null) {
  const p = getRangerProfile(f); if (!p) { if (f?._ranger) clearRanger(f); return [] }
  const r = ensureRangerState(f)
  r.events = []
  f.noDash = true                 // the framework owns the double-tap (the engine dash is wall-clock based)
  if (grounded(f)) f._rangerFloorY = (f.y || 0) + (f.h || 94)
  r.tick++
  // DOUBLE-TAP on SIM ticks (press edges). World directions; ↑/↓ only when the profile allows vertical blinks.
  let want = null
  for (const d of DIRS) {
    const v = !!raw[d]
    if (v && !r.prev[d]) {
      // a DIAGONAL press is a motion input (↓↘→, ↓↘→↓↘→ …), never half of a blink double-tap
      const clean = d === 'left' || d === 'right' ? !raw.up && !raw.down : !raw.left && !raw.right
      if (!clean) r.tapAt[d] = null
      else if (r.tapAt[d] != null && r.tick - r.tapAt[d] <= p.blink.tapWindow) { want = d; r.tapAt[d] = null }
      else r.tapAt[d] = r.tick
    }
    r.prev[d] = v
  }
  for (const d of DIRS) if (d !== want && want && r.tapAt[d] != null && r.tick - r.tapAt[d] > p.blink.tapWindow) r.tapAt[d] = null
  // stamp the double-tap BEFORE the hitstop early-out: a tap made in the hit-freeze must still reach the character's
  // blink-cancel / →→+button reader (the blink itself only starts outside hitstop, below)
  if (want) {
    const vertical = want === 'up' || want === 'down'
    if (!vertical || p.blink.vertical) {
      r.pending = { dir: vertical ? 0 : want === 'left' ? -1 : 1, vdir: vertical ? (want === 'up' ? -1 : 1) : 0 }
      r.pendingAt = r.tick   // the double-tap tick, even when no blink could start (mid-move / no charges): the character
                             // module reads it for →→+button commands and blink-cancels (startBlink(f, dir, 0, { cancel: true }))
    } else want = null
  }
  if (f.hitstop > 0) return r.events
  // charge refills (each spent charge on its own timer)
  for (let i = r.refill.length - 1; i >= 0; i--) if (--r.refill[i] <= 0) { r.refill.splice(i, 1); r.charges = Math.min(p.blink.charges, r.charges + 1); ev(r, 'charge', {}) }
  if (r.dodgeBuff > 0) r.dodgeBuff--
  if (r.faceLock > 0) { r.faceLock--; if (opp) opp.facing = r.faceLockDir }
  if (r.morph === 'morphing' && --r.morphT <= 0) { r.morph = 'morphed'; ev(r, 'morphed') }
  r.sealed = !!(opp && opp._ranger?.judg?.contain > 0)
  // a requested blink (the character module may veto with r.noBlink, or turn it into a move with r.blinkVeto)
  if (want && !r.blink && !r.blinkVeto) startBlink(f, r.pending.dir, r.pending.vdir)
  if (r.blink) stepBlink(f, opp, r, p, W)
  else if (f._rooted && r._rootedByMe) f._rooted = false
  r._rootedByMe = !!r.blink
  // RUN after a ground blink: keep holding the blink direction → run until released / any action
  if (p.blink.run && !r.blink) {
    const hold = r.running ? (r.running > 0 ? raw.right && !raw.left : raw.left && !raw.right) : false
    if (r.running && (!hold || f.attacking || !grounded(f) || (f.hitstun || 0) > 0 || raw.down || raw.block)) r.running = 0
    const last = r.events.find(e => e.type === 'blinkEnd')
    if (last && grounded(f) && !f.attacking) {
      const d = r.lastBlinkDir || 0
      if (d && (d > 0 ? raw.right && !raw.left : raw.left && !raw.right)) r.running = d
    }
  }
  if (r.blink) r.lastBlinkDir = r.blink.dir
  if (r.judg) stepJudgment(f, opp, r, p, W)
  return r.events
}
// physics.js walk multiplier: running after a ground blink = run speed / walk speed (1 for everyone else).
export function rangerWalkMul(f, dir = 0) {
  const r = f?._ranger; if (!r || !r.running) return 1
  const run = getRangerProfile(f)?.blink.run
  return run && dir === r.running ? run.speed / run.walk : 1
}
// Render helper: body opacity (0 while travelling = he is gone; fades in/out around it). Pure.
export function rangerBodyAlpha(f) {
  const b = f?._ranger?.blink; if (!b) return 1
  const B = getRangerProfile(f).blink
  if (b.phase === 'travel') return 0
  if (b.phase === 'start') return 1 - 0.55 * ((b.t + 1) / B.startup)       // dissolve out
  return 0.45 + 0.55 * ((b.t - B.startup - B.travel + 1) / B.recovery)      // re-form
}
// HUD helper (pure read).
export function rangerHudState(f) {
  const r = f?._ranger, p = getRangerProfile(f); if (!r || !p) return null
  const refills = [...r.refill].sort((a, b) => a - b)
  return {
    charges: r.charges, max: p.blink.charges,
    pips: Array.from({ length: p.blink.charges }, (_, i) => i < r.charges ? 1 : (i === r.charges && refills.length ? 1 - refills[0] / p.blink.recharge : 0)),
    meter: r.judg?.meter ?? null, meterMax: p.judgment?.meterMax ?? null,
    judgReady: r.judg ? judgmentReady(f) : false, judgHold: r.judg?.hold || 0, verdict: r.judg?.verdict || null,
    contain: r.judg?.contain || 0, morph: r.morph, badge: p.badge, dodgeBuff: r.dodgeBuff,
  }
}
