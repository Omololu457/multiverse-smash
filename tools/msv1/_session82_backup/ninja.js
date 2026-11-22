/**
 * ninja.js — MSV1 REUSABLE NINJA FRAMEWORK (profile-driven, extends rangers.js; like flight.js / drones.js / rangers.js).
 *
 * A ninja Ranger = registerNinjaProfile('<rosterKey>', {...data}). The framework owns every shared system; a profile only
 * supplies numbers + which optional modules it uses. See docs/msv1/NINJA_FRAMEWORK.md for every field.
 *
 *   A  NINJA POWER   0..100 resource (start 50, +regen/s when not streaking, +onHit on a landed hit). f._ninja.np
 *   B  NINJA STREAK  the SAME double-tap as S.P.D. Red's blink — read from rangers.js (tickRanger stamps r.pendingAt with
 *                    the identical press-edge detection + 12-tick tapWindow; blinkVeto stops the blink itself). The ninja
 *                    visibly travels (R3 blur), is projectile-intangible on frames 2–6, passes THROUGH the foe, chains 3.
 *                    STREAK STRIKE: an attack pressed during a streak hits on the way through (side-switch).
 *   C  SMOKE VANISH  Charge + Light + Heavy: vanish in own smoke, reappear behind / above (held). Blockstun escape.
 *   D  SHADOW CLONES max 2, the five-step choreography (hand sign → smoke pop → staggered fan-out → per-clone tilt
 *                    (render) → unison strike → smoke exit). Hittable (1 hit pops), 60% damage, never the KO hit.
 *                    clonechoreo.js does not exist in this repo (cloneChoreography.js is the Naruto-universe engine with
 *                    a different contract) → implemented HERE so it can be migrated later.
 *   E  NINJA MIRROR  ↓↓ + Charge: one REAL body + one ILLUSION. Identity lives only here (GAME_STATE); every renderer
 *                    draws both bodies the same way except THE TELL (illusion: no ground shadow + visor glint every 90 f).
 *   F  NINJA BARRIER Forward + Charge: 8-frame parry window, then the dome. kind 'reflect' (Shane) / 'armor' (Dustin).
 *   OPTIONAL (profile-gated): BURROW (underground travel, low-only hurt, erupt), TRAPS (kunai in the floor), REV (run pips),
 *                    FLOAT (hold-jump slow fall, never a climb), STREAK.air (8-way air streaks).
 *
 * SIM vs RENDER: all gameplay state is plain JSON on f._ninja (pushed into the replay / LAN checkpoint by game.js).
 * No Math.random: the one hash is rangers.js rangerHash(seed, frame, player index) with a salted slot. Smoke drift, speed
 * lines, glints, tilts and camera punch are render-only (nsWindFx.js reads f._ninja, never writes it).
 * The framework never imports the engine: game.js hands in W (stageWidth/frame/seed/damage/attackBox/projectiles/spawn).
 */
import { registerRangerProfile, tickRanger, clearRanger, ensureRangerState, rangerHash, RANGER_SCREEN } from './rangers.js'

export const NINJA_PROFILES = {}
const NP_DEFAULTS = { start: 50, max: 100, regen: 6, onHit: 4 }
const STREAK_DEFAULTS = { distPct: 0.40, startup: 2, travel: 8, intangible: [2, 6], cost: 10, chain: 3, thirdCost: 20, recovery: 14,
  cancelFrom: 9, strike: { dmg: 45, damageType: 'blunt', hitstun: 22, blockstun: 12 }, air: null, underground: false }
const VANISH_DEFAULTS = { cost: 30, escapeCost: 40, escapeInvuln: 6, escapeCooldown: 720, pop: 6, gone: 6, fade: 8, cooldown: 30, behind: 70, above: 150, cloud: 30 }
const CLONE_DEFAULTS = { max: 2, dmgPct: 0.6 }
const MIRROR_DEFAULTS = { cost: 50, frames: 480, gapPct: 0.30, swapCost: 10, swapFrames: 6, maxSwaps: 3, glintEvery: 90, mode: 'echo', echoDelay: 8,
  dmgPct: 0.5, meterPct: 0.5, counter: null }
const BARRIER_DEFAULTS = { cost: 25, parry: 8, dome: 30, kind: 'reflect', reflectMul: 1.2, absorb: 2, armorFrames: 60, counter: null }

export function registerNinjaProfile(id, p = {}) {
  const prof = {
    id, color: p.color || '#ffffff', smoke: p.smoke || p.color || '#ffffff', voice: p.voice || 'mid',
    np: { ...NP_DEFAULTS, ...(p.np || {}) },
    streak: { ...STREAK_DEFAULTS, ...(p.streak || {}), strike: { ...STREAK_DEFAULTS.strike, ...(p.streak?.strike || {}) } },
    vanish: { ...VANISH_DEFAULTS, ...(p.vanish || {}) },
    clones: { ...CLONE_DEFAULTS, ...(p.clones || {}) },
    mirror: { ...MIRROR_DEFAULTS, ...(p.mirror || {}) },
    barrier: { ...BARRIER_DEFAULTS, ...(p.barrier || {}) },
    float: p.float || null, burrow: p.burrow || null, traps: p.traps || null, rev: p.rev || null,
  }
  NINJA_PROFILES[id] = prof
  // The rangers.js profile: S.P.D. Red's exact ground run (run 8.4 / walk 5.6 = ×1.5 → 10.5 px/f at speed 88) and the
  // shared double-tap detector (tapWindow 12, the default). blinkVeto (set every tick below) means the double-tap is only
  // STAMPED (r.pending / r.pendingAt), never turned into a blink — the ninja Streak consumes it instead.
  registerRangerProfile(id, { ownTick: true, team: p.team || 'Wind Ninja Academy', badge: { color: prof.color, accent: '#ffffff', emblem: 'wind' },
    morph: { alwaysMorphed: true }, blink: { run: { speed: 8.4, walk: 5.6 }, vertical: !!prof.streak.air, ...(p.blink || {}) }, airMul: p.airMul ?? 1 })
  return prof
}
export const getNinjaProfile = f => NINJA_PROFILES[typeof f === 'string' ? f : f?.rosterKey] || null
export const isNinja = f => !!getNinjaProfile(f)

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────
const ctrX = f => (f.x || 0) + (f.w || 60) / 2
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const hurtOf = f => ({ x: f.x || 0, y: f.y || 0, w: f.w || 60, h: f.h || 100 })
const clampX = (W, x, w) => Math.max(0, Math.min(sw(W) - w, Math.round(x)))
const cue = (s, c) => s.cues.push(c)
const sideIdx = f => (f.side === 'p2' || f.side === 2 || f.playerIndex === 1) ? 1 : 0
export const ninjaHash = (W, f, slot) => rangerHash(((W?.seed?.() | 0) || 1) ^ (slot * 2654435761 >>> 0), W?.frame?.() | 0, sideIdx(f))

// Engine helpers (combat.js) handed in by nsWind.js — avoids a combat.js ↔ ninja.js import cycle.
const E = { startMove: null, comboScale: null, hitstunScale: null, hitstop: null, shake: null }
export function registerNinjaEngine(o) { Object.assign(E, o) }

// ── State (GAME_STATE) ───────────────────────────────────────────────────────────────────────────────────────────
const freshState = p => ({
  tick: 0, clock: 0, prev: {}, edges: {}, used: {}, dirs: [],
  np: p.np.start, npAcc: 0,
  streak: null, chain: 0, chainRec: 0, airStreaks: 0, streakN: 0,
  vanish: null, vanishCd: 0, escapeCd: 0,
  clones: [], cloneN: 0,
  mirror: null, mirrorN: 0, swap: null,
  barrier: null, barrierCd: 0,
  burrow: null, traps: [], trapN: 0, rev: { pips: 0, runT: 0 },
  float: 0, seq: null, counter: null, pound: null, serial: 0, shots: 0,
  stats: { streaks: 0, strikes: 0, vanishes: 0, escapes: 0, clones: 0, clonePops: 0, mirrors: 0, swaps: 0, illusionHits: 0, illusionCounters: 0,
    realHitsInMirror: 0, barriers: 0, reflects: 0, absorbs: 0, burrows: 0, erupts: 0, tremors: 0, traps: 0, trapHits: 0, supers: 0, ults: 0, echoHits: 0 },
  cues: [],
})
export const ninjaState = f => { const p = getNinjaProfile(f); return p ? (f._ninja ||= freshState(p)) : null }
export function clearNinja(f, W) {
  if (!f) return
  const had = !!f._ninja
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._ninja) W.projectiles.splice(i, 1)
  delete f._ninja; delete f._ninjaRemoteInput
  if (had || isNinja(f)) { clearRanger(f); f._rooted = false; f._ninjaHidden = 0 }
}

// ── NINJA POWER ──────────────────────────────────────────────────────────────────────────────────────────────────
export const npOf = f => f?._ninja?.np ?? 0
export function spendNP(f, n) { const s = f._ninja; if (!s || s.np < n) return false; s.np -= n; return true }
export function gainNP(f, n) { const s = f?._ninja, p = getNinjaProfile(f); if (!s || !p) return; s.np = Math.min(p.np.max, s.np + n) }

// ── deterministic sim-tick motion reader (numpad, facing-relative). motionInput.js is wall-clock + Naruto-only, so the
// ninjas read their own per-tick direction history (same frames in replay / LAN / harness). ──
const DIR_WINDOW = 20
function numpad(raw, facing) {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  const h = fwd && !back ? 1 : back && !fwd ? -1 : 0, v = raw.up && !raw.down ? 1 : raw.down && !raw.up ? -1 : 0
  return 5 + h + v * 3
}
// does the direction history end in `seq` (e.g. [2,3,6]) within DIR_WINDOW ticks (a skipped diagonal is tolerated)?
export function motionDone(s, seq, win = DIR_WINDOW) {
  const h = s.dirs.slice(-win); let i = seq.length - 1
  for (let k = h.length - 1; k >= 0 && i >= 0; k--) {
    if (h[k] === seq[i]) i--
    else if (i < seq.length - 1 && (seq[i] === 3 || seq[i] === 1) && h[k] === seq[i - 1]) i -= 2   // 2→6 without the 3
  }
  return i < 0
}

// ── B. NINJA STREAK ──────────────────────────────────────────────────────────────────────────────────────────────
export const isStreaking = f => !!f?._ninja?.streak
export function streakIntangible(f) {
  const st = f?._ninja?.streak, p = getNinjaProfile(f); if (!st || !p) return false
  const t = st.t - p.streak.startup + 1   // 1-based travel frame
  return t >= p.streak.intangible[0] && t <= p.streak.intangible[1]
}
function canStreak(f, s, p, air) {
  if (s.streak || s.vanish || s.seq || s.counter || s.swap) return false
  if (!(f.health > 0) || f.isGrabbed || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || f.knockdownState) return false
  if (f.attacking && !(s.chainRec > 0)) return false
  if (air && (!p.streak.air || s.airStreaks >= (p.streak.air.perAirtime || 2))) return false
  if (s.chain >= p.streak.chain && s.chainRec > 0) return false
  return true
}
export function startStreak(f, dir, vdir, W, opp) {
  const s = ninjaState(f), p = getNinjaProfile(f); if (!s) return false
  const air = !grounded(f) && !s.burrow
  if (!canStreak(f, s, p, air)) return false
  const nth = s.chainRec > 0 ? s.chain + 1 : 1
  const cost = nth >= 3 ? p.streak.thirdCost : p.streak.cost
  if (!spendNP(f, cost)) { cue(s, 'reject'); return false }
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  s.chain = nth; s.chainRec = 0
  const rev = s.rev.pips
  if (rev && p.rev) { s.rev.pips = 0; s.rev.runT = 0 }
  s.streak = { t: 0, dir: dir || f.facing || 1, vdir: vdir | 0, x0: Math.round(f.x), y0: Math.round(f.y), air, under: !!s.burrow, strike: false, struck: false,
    crossed: false, n: ++s.streakN, rev, bent: false, oppSide: opp ? Math.sign(ctrX(opp) - ctrX(f)) : 0 }
  if (air) s.airStreaks++
  if (s.burrow) s.stats.tremors++
  s.stats.streaks++; f.isBlocking = false
  cue(s, s.burrow ? 'tremor' : 'streak')
  return true
}
function stepStreak(f, s, p, opp, raw, W) {
  const st = s.streak, P = p.streak, D = Math.round(RANGER_SCREEN * P.distPct)
  f._rooted = true; f.vx = 0; f.vy = 0
  if (st.t < P.startup) {   // the visible wind-up: an air streak can still be BENT by the held ↑/↓ (8-way)
    if (st.air && P.air?.ways === 8 && !st.bent) {
      const v = raw.up && !raw.down ? -1 : raw.down && !raw.up ? 1 : 0
      if (v && !st.vdir) { st.vdir = v; st.bent = true }
    }
    if (st.air) f.y = st.y0
  } else {
    const u = (st.t - P.startup + 1) / P.travel
    const diag = st.dir && st.vdir ? Math.SQRT1_2 : 1
    const tx = st.x0 + (st.dir || 0) * D * diag * u
    let ty = st.y0 + st.vdir * D * diag * 0.7 * u
    const floor = f._rangerFloorY != null ? f._rangerFloorY - (f.h || 100) : st.y0
    if (ty > floor) ty = floor
    f.x = clampX(W, tx, f.w || 60); f.y = Math.round(st.air ? Math.max(-400, ty) : st.y0)
    if (opp && !st.crossed && st.oppSide && Math.sign(ctrX(opp) - ctrX(f)) === -st.oppSide) st.crossed = true
    // STREAK STRIKE: an attack pressed during the streak hits ONCE on the way through
    if (st.strike && !st.struck && opp && overlap({ x: f.x - 10, y: f.y, w: (f.w || 60) + 20, h: f.h || 100 }, hurtOf(opp))) {
      st.struck = true
      const mul = 1 + (st.rev || 0) * (p.rev?.perPip || 0.1)
      const r = ninjaStrike(f, opp, { dmg: P.strike.dmg * mul, hitstun: P.strike.hitstun, blockstun: P.strike.blockstun, kbx: (st.dir || 1) * 5, kby: -3,
        damageType: P.strike.damageType, move: 'streak_strike' }, W)
      if (r === 'hit') { s.stats.strikes++; cue(s, 'strikeHit') } else if (r) cue(s, 'strikeBlocked')
    }
  }
  if (++st.t >= P.startup + P.travel) {
    s.streak = null; f._rooted = false
    s.chainRec = P.recovery
    if (opp && !st.under) f.facing = ctrX(opp) < ctrX(f) ? -1 : 1
    if (st.air) { f.vx = (st.dir || 0) * 4; f.vy = st.vdir < 0 ? -4 : 2 }
    // RUN: holding the streak direction on landing = S.P.D. Red's ground run (rangers.js rangerWalkMul, 10.5 px/f)
    if (!st.air && !st.under && f._ranger && (st.dir > 0 ? raw.right && !raw.left : raw.left && !raw.right)) { f._ranger.running = st.dir; f._ranger.lastBlinkDir = st.dir }
    cue(s, 'streakEnd')
  }
}

// One scripted strike (streak strike, clone, illusion, counter, sequence): through W.damage (the engine choke-point).
// o: { dmg (raw), hitstun, blockstun, kbx, kby, launch, chip (fraction, default 0.12), noChip, floor (1 = cannot KO), move, meterMul }
export function ninjaStrike(f, t, o, W) {
  if (!t || t === f || !(t.health > 0) || (t.invulnTimer || 0) > 0 || t.isGrabbed) return null
  if (f.team && t.team && f.team === t.team) return null
  if (t.isBlocking && !o.unblockable) {
    t.blockstun = Math.max(t.blockstun || 0, o.blockstun || 12); t.vx = Math.sign(o.kbx || 1) * 2
    if (!o.noChip) W?.damage?.(t, o.dmg * (o.chip ?? 0.12), { source: 'ninja', attacker: f, move: o.move, floor: o.floor ?? 0 })
    f.comboCounter = 0
    return 'blocked'
  }
  const sc = o.unscaled ? 1 : (E.comboScale?.(f) ?? 1)
  W?.damage?.(t, o.dmg * sc, { source: 'ninja', attacker: f, move: o.move, floor: o.floor ?? 0, tier: o.dmg >= 60 ? 'big' : undefined })
  if (!grounded(t)) t.juggleCount = (t.juggleCount || 0) + 1
  t.hitstun = Math.max(t.hitstun || 0, Math.round((o.hitstun || 18) * (o.unscaled ? 1 : (E.hitstunScale?.(f) ?? 1))))
  t.vx = o.kbx || 0; t.vy = o.launch ? o.launch : (o.kby || 0)
  if (o.launch || o.kby < 0) { t.onGround = false; t.grounded = false }
  t.isBlocking = false; t.colorFlash = 6; t.attacking = false; t.currentAttack = null
  E.hitstop?.(null, t, o.hitstop ?? 6)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  gainNP(f, getNinjaProfile(f)?.np.onHit || 0)
  f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + 5 * (o.meterMul ?? 1))
  return 'hit'
}

// ── C. SMOKE VANISH ──────────────────────────────────────────────────────────────────────────────────────────────
export function startVanish(f, opp, raw, W) {
  const s = ninjaState(f), p = getNinjaProfile(f), V = p.vanish
  if (!s || s.vanish || s.seq || s.counter || s.streak || s.burrow || f.isGrabbed || !(f.health > 0) || (f.hitstun || 0) > 0) return false
  const escape = (f.blockstun || 0) > 0
  if (escape ? s.escapeCd > 0 : s.vanishCd > 0) { cue(s, 'reject'); return false }
  if (!spendNP(f, escape ? V.escapeCost : V.cost)) { cue(s, 'reject'); return false }
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  if (escape) { f.blockstun = 0; s.escapeCd = V.escapeCooldown; s.stats.escapes++; f.invulnTimer = Math.max(f.invulnTimer || 0, V.escapeInvuln) }
  else s.vanishCd = V.cooldown
  const above = !!raw.up
  let tx = ctrX(f), ty = f.y
  if (opp) {
    const behind = Math.sign(ctrX(opp) - ctrX(f)) || f.facing || 1
    tx = above ? ctrX(opp) : ctrX(opp) + behind * V.behind
    ty = above ? Math.round((opp.y || 0) - V.above) : Math.round(f.y)
  }
  s.vanish = { t: 0, x0: Math.round(f.x), y0: Math.round(f.y), tx: clampX(W, tx - (f.w || 60) / 2, f.w || 60), ty, escape, above }
  s.stats.vanishes++; f.isBlocking = false
  cue(s, 'smokePop')
  return true
}
function stepVanish(f, s, p, opp) {
  const v = s.vanish, V = p.vanish
  f._rooted = true; f.vx = 0; if (!v.landed) f.vy = 0
  if (v.t >= V.pop && v.t < V.pop + V.gone) {   // gone: invulnerable, invisible
    f.invulnTimer = Math.max(f.invulnTimer || 0, 2); f._ninjaHidden = 2
    if (v.t === V.pop + V.gone - 1) {
      f.x = v.tx; f.y = v.ty
      if (opp) f.facing = ctrX(opp) < ctrX(f) ? -1 : 1
      cue(s, 'smokeOut')
    }
  }
  if (++v.t >= V.pop + V.gone + V.fade) { s.vanish = null; f._rooted = false; if (v.above) { f.onGround = false; f.vy = 2 } }
}

// ── D. SHADOW CLONES (five-step choreography; profile-agnostic) ──────────────────────────────────────────────────
// spec: { steps: [{ at, x, y, dir, pose, strike?: {dmg, hitstun, kbx, kby, launch, box:{dx,dy,w,h}, move} }], life }
// step 1 hand sign + step 2 smoke pop are the owner's (sign: R07 guard pose, then the R23 smoke on the owner);
// step 3 STAGGERED fan-out = each clone's `delay`; step 4 tilt ±6° = render-only (index parity); step 5 unison strike =
// strikes sharing one `at`; smoke exit = R24 on pop / expiry.
export function spawnClone(f, spec, W) {
  const s = ninjaState(f), p = getNinjaProfile(f); if (!s) return null
  if (s.clones.filter(c => !c.gone).length >= p.clones.max) return null
  const c = { id: ++s.cloneN, x: Math.round(spec.x), y: Math.round(spec.y), dir: spec.dir || f.facing || 1, t: 0, delay: spec.delay || 0, life: spec.life || 90,
    pose: spec.pose || 'idle', steps: (spec.steps || []).map(st => ({ ...st, done: false })), tilt: s.cloneN % 2 ? 1 : -1, gone: 0 }
  s.clones.push(c); s.stats.clones++
  cue(s, 'clonePop')
  return c
}
export function popClone(f, c, why = 'popped') {
  const s = f._ninja; if (!s || !c || c.gone) return
  c.gone = 10; c.why = why
  if (why === 'popped') { s.stats.clonePops++; cue(s, 'clonePopHit') } else cue(s, 'cloneOut')
}
const cloneHurt = (f, c) => ({ x: c.x, y: c.y, w: f.w || 60, h: f.h || 100 })
function tickClones(f, s, p, opp, W) {
  for (let i = s.clones.length - 1; i >= 0; i--) {
    const c = s.clones[i]
    if (c.gone) { if (--c.gone <= 0) s.clones.splice(i, 1); continue }
    if (c.delay > 0) { c.delay--; continue }
    c.t++
    // hittable: ONE hit from the foe's live attack box or any foe projectile pops it (the attack is consumed)
    const hb = cloneHurt(f, c)
    if (opp) {
      const ab = W?.attackBox?.(opp)
      if (ab && overlap(ab, hb)) { if (opp.currentAttack) opp.currentAttack.hasHit = true; popClone(f, c); continue }
      if ((W?.projectileRects?.(opp) || []).some(r => overlap(r, hb))) { popClone(f, c); continue }
    }
    for (const st of c.steps) {
      if (st.done || c.t < st.at) continue
      st.done = true
      if (st.x != null) c.x = Math.round(st.x); if (st.y != null) c.y = Math.round(st.y); if (st.dir) c.dir = st.dir; if (st.pose) c.pose = st.pose
      if (st.strike && opp) {
        const b = st.strike.box || { dx: 0, dy: 0, w: 140, h: 120 }
        const box = { x: c.x + (f.w || 60) / 2 + c.dir * b.dx - b.w / 2, y: c.y + b.dy, w: b.w, h: b.h }
        if (st.strike.force || overlap(box, hurtOf(opp))) {
          const r = ninjaStrike(f, opp, { ...st.strike, dmg: st.strike.dmg, floor: 1, move: st.strike.move || 'shadow_clone' }, W)   // a clone never lands the KO
          if (r === 'hit') cue(s, 'cloneHit')
        }
      }
      if (st.exit) popClone(f, c, 'exit')
    }
    if (!c.gone && c.t >= c.life) popClone(f, c, 'exit')
  }
}

// ── E. NINJA MIRROR ──────────────────────────────────────────────────────────────────────────────────────────────
export const inMirror = f => !!f?._ninja?.mirror
export function startMirror(f, opp, W) {
  const s = ninjaState(f), p = getNinjaProfile(f), M = p.mirror
  if (!s || s.mirror || s.seq || s.counter || s.burrow || f.attacking || !grounded(f) || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0) return false
  if (!spendNP(f, M.cost)) { cue(s, 'reject'); return false }
  const gap = Math.round(RANGER_SCREEN * M.gapPct), fw = f.w || 60
  const away = opp ? -(Math.sign(ctrX(opp) - ctrX(f)) || f.facing || 1) : -(f.facing || 1)
  let ix = f.x + away * gap
  if (ix < 0 || ix > sw(W) - fw) ix = f.x - away * gap
  s.mirror = { t: M.frames, x: clampX(W, ix, fw), y: Math.round(f.y), dir: f.facing || 1, swaps: 0, ring: [], act: null, n: ++s.mirrorN,
    pose: M.mode === 'decoy' ? 'guard' : 'idle', poseT: 0, popT: 10, onGround: true }
  s.stats.mirrors++
  cue(s, 'mirrorSplit')
  return true
}
export function endMirror(f, why) {
  const s = f?._ninja; if (!s?.mirror) return
  s.lastMirror = { x: s.mirror.x, y: s.mirror.y, t: 12, why }   // render-only smoke at the illusion's last spot
  s.mirror = null
  cue(s, why === 'real' ? 'illusionPop' : why === 'timeout' ? 'mirrorEnd' : 'illusionPop')
}
export function illusionBody(f) {
  const m = f?._ninja?.mirror; if (!m) return null
  return { x: m.x, y: m.y, w: f.w || 60, h: f.h || 100 }
}
// SWAP: both pop into smoke and trade places (6 frames). Dustin may swap from UNDERGROUND (the burrow moves with him).
export function startSwap(f, W) {
  const s = ninjaState(f), p = getNinjaProfile(f), m = s?.mirror
  if (!m || s.swap || s.seq || s.counter || s.streak || s.vanish || (f.hitstun || 0) > 0 || f.isGrabbed) return false
  if (m.swaps >= p.mirror.maxSwaps) { cue(s, 'reject'); return false }
  if (!spendNP(f, p.mirror.swapCost)) { cue(s, 'reject'); return false }
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  m.swaps++; s.stats.swaps++
  s.swap = { t: 0, fx: Math.round(f.x), fy: Math.round(f.y), ix: m.x, iy: m.y }
  cue(s, 'swap')
  return true
}
function stepSwap(f, s, p, opp) {
  const sw_ = s.swap, m = s.mirror
  f._rooted = true; f.vx = 0
  if (sw_.t === Math.floor(p.mirror.swapFrames / 2) && m) {
    f.x = sw_.ix; f.y = s.burrow ? f.y : sw_.iy; m.x = sw_.fx; m.y = sw_.fy
    if (s.burrow) s.burrow.x = f.x
    if (opp) { f.facing = ctrX(opp) < ctrX(f) ? -1 : 1; m.dir = Math.sign(ctrX(opp) - (m.x + (f.w || 60) / 2)) || m.dir }
    m.ring = []   // the echo restarts from the new spots
  }
  if (sw_.t < p.mirror.swapFrames) f._ninjaHidden = 2
  if (++sw_.t >= p.mirror.swapFrames) { s.swap = null; f._rooted = false }
}
// the illusion's pose record for this tick (a pure function of the real fighter's sim fields) — render reads m.pose/m.poseT
function poseOf(f) {
  const a = f.attacking ? f.currentAttack : null
  if (a) return { pose: f.currentMove || a.name, t: a.total - a.timer }
  if (!grounded(f)) return { pose: (f.vy || 0) < 0 ? 'jump' : 'fall', t: 0 }
  if ((f.hitstun || 0) > 0) return { pose: 'hurt', t: 0 }
  if (f.isBlocking) return { pose: 'guard', t: 0 }
  if (Math.abs(f.vx || 0) > 0.5) return { pose: f._ranger?.running ? 'run' : 'walk', t: 0 }
  return { pose: 'idle', t: 0 }
}
function tickMirror(f, s, p, opp, W) {
  const m = s.mirror, M = p.mirror
  if (m.popT > 0) m.popT--
  m.poseT++
  if (--m.t <= 0) { endMirror(f, 'timeout'); return }
  // ECHO (Shane): the illusion replays the real body's movement + moves ECHO_DELAY frames late, from its own position
  if (M.mode === 'echo') {
    const a = f.attacking ? f.currentAttack : null
    const started = a && a.nj && a.nj.serial !== m.lastSerial ? (m.lastSerial = a.nj.serial, a.nj.key) : null
    m.ring.push({ dx: Math.round((f.x || 0) - (m.px ?? f.x)), dy: Math.round((f.y || 0) - (m.py ?? f.y)), mv: started, ...poseOf(f), dir: f.facing || 1 })
    m.px = Math.round(f.x || 0); m.py = Math.round(f.y || 0)
    if (m.ring.length > M.echoDelay) {
      const r = m.ring.shift()
      const floorY = f._rangerFloorY != null ? f._rangerFloorY - (f.h || 100) : m.y
      m.x = clampX(W, m.x + r.dx, f.w || 60); m.y = Math.min(floorY, m.y + r.dy)
      m.dir = r.dir; if (r.pose !== m.pose) m.poseT = 0; m.pose = r.pose; m.poseT = r.t || m.poseT
      if (r.mv) {
        const md = M.moves?.[r.mv]
        if (md && !md.noBody) m.act = { key: r.mv, t: 0, start: md.startup, active: md.active || 2, rangeX: md.rangeX || 70, rangeY: md.rangeY || 50, boxY: md.boxY ?? 14,
          dmg: md.damage || 30, hitstun: md.hitstun || 18, kbx: md.knockbackX || 3, kby: md.knockbackY || 0, launch: md.launchVy || 0, hit: false }
      }
    }
  } else if (opp) { m.dir = Math.sign(ctrX(opp) - (m.x + (f.w || 60) / 2)) || m.dir; m.pose = 'guard' }   // DECOY (Dustin): still, guarding
  // illusion attack: 50% damage, NO chip, cannot KO, 50% super meter
  const A = m.act
  if (A) {
    A.t++
    if (!A.hit && A.t > A.start && A.t <= A.start + A.active && opp) {
      const box = { x: m.dir === 1 ? m.x + (f.w || 60) : m.x - A.rangeX, y: m.y + A.boxY, w: A.rangeX, h: A.rangeY }
      if (overlap(box, hurtOf(opp))) {
        A.hit = true
        const r = ninjaStrike(f, opp, { dmg: A.dmg * M.dmgPct, hitstun: A.hitstun, kbx: m.dir * A.kbx, kby: A.kby, launch: A.launch, noChip: true, floor: 1, meterMul: M.meterPct, move: 'illusion_' + A.key }, W)
        if (r === 'hit') { s.stats.echoHits++; cue(s, 'echoHit') }
      }
    }
    if (A.t > A.start + A.active + 4) m.act = null
  }
  // THE ILLUSION IS STRUCK → it takes no damage, pops, and COUNTERS (profile-specific). Then the mode ends.
  if (opp && m.popT <= 0) {
    const hb = illusionBody(f)
    const ab = W?.attackBox?.(opp)
    const projs = W?.projectileList?.(opp) || []
    const struckBy = ab && overlap(ab, hb) ? 'melee' : (projs.find(pr => overlap(pr._rect, hb)) ? 'projectile' : null)
    if (struckBy) {
      if (struckBy === 'melee' && opp.currentAttack) opp.currentAttack.hasHit = true
      if (struckBy === 'projectile') { const pr = projs.find(q => overlap(q._rect, hb)); if (pr?.ref && W?.projectiles) { const i = W.projectiles.indexOf(pr.ref); if (i >= 0) W.projectiles.splice(i, 1) } }
      s.stats.illusionHits++
      startCounter(f, s, p, opp, { x: m.x, y: m.y, dir: m.dir }, W)
      endMirror(f, 'struck')
    }
  }
}
function startCounter(f, s, p, opp, at, W) {
  const C = p.mirror.counter; if (!C) return
  s.counter = { t: 0, x: at.x, y: at.y, dir: at.dir, tx: Math.round(ctrX(opp)), ty: Math.round((opp.y || 0) + (opp.h || 100)), hits: 0, kind: C.kind }
  s.stats.illusionCounters++
  cue(s, 'illusionCounter')
}
function stepCounter(f, s, p, opp, W) {
  const k = s.counter, C = p.mirror.counter
  k.t++
  for (const h of C.hits) {
    if (k.t !== h.at || !opp) continue
    const r = ninjaStrike(f, opp, { dmg: h.dmg, hitstun: h.hitstun || 20, kbx: (Math.sign(ctrX(opp) - ctrX(f)) || 1) * (h.kbx || 2), kby: h.kby || 0, launch: h.launch || 0,
      floor: 1, noChip: true, unblockable: !!C.unblockable, move: 'illusion_counter', hitstop: h.hitstop || 5 }, W)
    if (r === 'hit') { k.hits++; if (h.wallBounce) opp._ninjaWallBounce = 20 }
    cue(s, 'counterHit')
  }
  if (k.t >= C.frames) s.counter = null
}

// ── F. NINJA BARRIER ─────────────────────────────────────────────────────────────────────────────────────────────
export function startBarrier(f, W) {
  const s = ninjaState(f), p = getNinjaProfile(f), B = p.barrier
  if (!s || s.barrier || s.seq || s.streak || s.vanish || s.burrow || f.attacking || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || s.barrierCd > 0) return false
  if (!spendNP(f, B.cost)) { cue(s, 'reject'); return false }
  s.barrier = { t: 0, kind: B.kind, absorbed: 0, parried: 0, end: B.kind === 'armor' ? B.armorFrames : B.parry + B.dome, countered: false }
  s.barrierCd = 30; s.stats.barriers++; f.isBlocking = false
  cue(s, 'dome')
  return true
}
const inParry = s => !!s?.barrier && s.barrier.t < (s._parryLen || 8)
function stepBarrier(f, s, p, opp, W) {
  const b = s.barrier, B = p.barrier
  s._parryLen = B.parry
  f._rooted = true; f.vx = 0
  b.t++
  if (b.kind === 'armor' && !b.countered && (b.absorbed >= B.absorb || b.t >= B.armorFrames)) {
    b.countered = true
    const C = B.counter
    if (C && opp && Math.abs(ctrX(opp) - ctrX(f)) <= C.reach && grounded(opp)) {
      ninjaStrike(f, opp, { dmg: C.dmg, hitstun: 26, kbx: (Math.sign(ctrX(opp) - ctrX(f)) || 1) * 8, kby: -6, move: 'rock_hold_shockwave' }, W)
    }
    cue(s, 'shockwave'); s.lastShock = { x: Math.round(ctrX(f)), y: Math.round((f.y || 0) + (f.h || 100)), t: 14, reach: C?.reach || 200 }
    s.barrier = null; f._rooted = false; return
  }
  if (b.t >= b.end) { s.barrier = null; f._rooted = false }
}

// combat.js hitbox hook (ninja-gated): per-move box from the move data; body-less moves have none
export function ninjaHitbox(f) {
  const a = f.currentAttack, m = a?.nj, md = m?.md
  if (!m || !md || md.noBody) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: m.dir === 1 ? f.x + f.w : f.x - a.rangeX, y: f.y + (md.boxY ?? 14), w: a.rangeX, h: a.rangeY }
}

// ── combat.js hooks (all ninja-gated: a strict no-op for every other fighter) ─────────────────────────────────────
// MELEE: should this swing whiff on the ninja? (burrow = only lows / ground-hits; armor absorbs; Wind Ward parries)
export function ninjaMeleeImmune(defender, attacker, atk) {
  const s = defender?._ninja; if (!s || !isNinja(defender)) return false
  if (s.burrow && s.burrow.under) {
    const low = atk?.hitLevel === 'low' || atk?.spike || atk?.groundHit || atk?.nj?.groundHit
    if (!low) return true
  }
  if (s.barrier) {
    const b = s.barrier
    if (b.kind === 'armor') { b.absorbed++; s.stats.absorbs++; cue(s, 'absorb'); attacker.hitstop = Math.max(attacker.hitstop || 0, 6); return true }
    if (inParry(s)) { b.parried++; cue(s, 'parry'); attacker.hitstun = Math.max(attacker.hitstun || 0, 14); attacker.attacking = false; attacker.currentAttack && (attacker.currentAttack.hasHit = true); return true }
  }
  if (s.seq && s.seq.invuln) return true
  return false
}
// PROJECTILES: streak intangibility (frames 2–6), burrow, Skate Slide under, Wind Ward reflect, dome / armor.
export function ninjaProjImmune(defender, proj) {
  const s = defender?._ninja, p = getNinjaProfile(defender); if (!s || !p) return false
  if (proj?.owner === defender) return false
  if (s.streak && streakIntangible(defender)) return true
  if (s.burrow && s.burrow.under && !proj.groundHit) return true
  const a = defender.attacking ? defender.currentAttack : null
  if (a?.nj?.underProj && (a.total - a.timer) >= 2 && (proj.y || 0) < (defender.y || 0) + (defender.h || 100) * 0.55) return true   // Skate Slide
  if (s.barrier) {
    const b = s.barrier
    if (b.kind === 'armor') { b.absorbed++; s.stats.absorbs++; cue(s, 'absorb'); proj.lifetime = 0; proj.dead = true; return true }
    if (inParry(s) && !proj._ninjaReflected) {   // WIND WARD: reflect at 1.2× speed + damage, now owned by the ninja
      const B = p.barrier
      proj._ninjaReflected = true; proj.owner = defender; proj.ownerId = defender.side
      proj.vx = -(proj.vx || 0) * B.reflectMul; if (proj.speed) proj.speed *= B.reflectMul
      proj.damage = Math.round((proj.damage || 20) * B.reflectMul); proj.age = 0
      if (proj.direction != null) proj.direction = -proj.direction
      if (proj.facing != null) proj.facing = -proj.facing
      s.stats.reflects++; cue(s, 'reflect'); b.parried++
      return true
    }
    if (b.kind === 'reflect') { proj.lifetime = 0; proj.dead = true; cue(s, 'domeBlock'); return true }   // the dome itself stops it
  }
  if (s.seq && s.seq.invuln) return true
  return false
}
// clean melee hit landed BY or ON a ninja
export function ninjaOnHit(attacker, defender, atk, { armored = false } = {}) {
  const sa = attacker?._ninja
  if (sa && isNinja(attacker) && atk?.nj && !armored) {
    atk.nj.clean = true; gainNP(attacker, getNinjaProfile(attacker).np.onHit)
    attacker.energy = Math.min(attacker.maxEnergy || 100, (attacker.energy || 0) + 5)
    if (atk.nj.bounce && !grounded(defender)) { defender.vy = -11; defender._ninjaBounce = 1 }
    if (atk.nj.groundBounce) { defender.vy = -12; defender.onGround = false; defender.grounded = false }
    if (atk.nj.trip) { defender.knockdownTimer = Math.max(defender.knockdownTimer || 0, 30) }
  }
  const sd = defender?._ninja
  if (sd && isNinja(defender)) onNinjaHurt(defender, sd)
}
export function ninjaOnBlock(attacker, defender, atk) {
  if (attacker?._ninja && isNinja(attacker) && atk?.nj) { const md = atk.nj.md; if (md?.blockstun) defender.blockstun = md.blockstun }
  const sd = defender?._ninja
  if (sd && isNinja(defender) && sd.rev) { sd.rev.pips = 0; sd.rev.runT = 0 }   // REV lost on block
}
export function ninjaProjectileHit(proj, target) {
  const f = proj?.owner
  if (f?._ninja && isNinja(f) && (proj._ninja || proj._ninjaReflected) && !target.isBlocking) {
    gainNP(f, getNinjaProfile(f).np.onHit); f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + 4)
  }
  if (target?._ninja && isNinja(target) && !target.isBlocking) onNinjaHurt(target, target._ninja)
}
// the REAL body took a hit: illusion pops harmlessly (mode ends), burrow surfaces, REV lost, wind float ends
function onNinjaHurt(f, s) {
  if (s.mirror) { s.stats.realHitsInMirror++; endMirror(f, 'real') }
  if (s.burrow) surface(f, s, 'hit')
  if (s.rev) { s.rev.pips = 0; s.rev.runT = 0 }
  if (s.barrier && s.barrier.kind === 'reflect') s.barrier = null
}

// ── OPTIONAL: BURROW (profile.burrow) ────────────────────────────────────────────────────────────────────────────
export const isBurrowed = f => !!f?._ninja?.burrow?.under
export function startBurrow(f, W) {
  const s = ninjaState(f), p = getNinjaProfile(f), B = p?.burrow
  if (!B || !s || s.burrow || s.seq || s.streak || s.vanish || !grounded(f) || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0) return false
  if (!spendNP(f, B.cost)) { cue(s, 'reject'); return false }
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  s.burrow = { t: 0, dig: B.dig, under: false, life: B.frames, x: Math.round(f.x) }
  s.stats.burrows++
  cue(s, 'burrow')
  return true
}
function surface(f, s, why) {
  const b = s.burrow; if (!b) return
  s.burrow = null; f._rooted = false; f._ninjaHidden = 0
  s.lastRipple = { x: Math.round(ctrX(f)), t: 10 }
  if (why === 'hit') cue(s, 'burrowHit')
}
function stepBurrow(f, s, p, opp, raw, W) {
  const b = s.burrow, B = p.burrow
  f._rooted = true; f.vy = 0
  if (!b.under) {   // R07 crouch dig-in
    f.vx = 0
    if (++b.t >= b.dig) { b.under = true; b.t = 0 }
    return
  }
  f._ninjaHidden = 2
  if (!s.streak && !s.swap) {
    const d = raw.right && !raw.left ? 1 : raw.left && !raw.right ? -1 : 0
    f.x = clampX(W, f.x + d * B.speed, f.w || 60); if (d) f.facing = d
  }
  b.x = Math.round(f.x)
  b.t++
  if (raw.special) b.held = true
  if ((b.held && !raw.special) || b.t >= b.life) {   // release (or timeout) → ERUPT
    surface(f, s, 'erupt')
    s.erupt = { serial: (s.erupt?.serial || 0) + 1 }
    s.stats.erupts++
    cue(s, 'erupt')
    return 'erupt'
  }
  return null
}

// ── OPTIONAL: TRAPS (profile.traps) — kunai stuck in the floor ───────────────────────────────────────────────────
export function plantTrap(f, x, W) {
  const s = ninjaState(f), T = getNinjaProfile(f)?.traps; if (!T || !s) return false
  while (s.traps.length >= T.max) s.traps.shift()
  s.traps.push({ id: ++s.trapN, x: Math.round(Math.max(10, Math.min(sw(W) - 10, x))), arm: T.arm, life: T.frames, fired: 0 })
  s.stats.traps++
  cue(s, 'trapSet')
  return true
}
function tickTraps(f, s, p, opp, W) {
  const T = p.traps
  for (let i = s.traps.length - 1; i >= 0; i--) {
    const tr = s.traps[i]
    if (tr.fired) { if (--tr.fired <= 0) s.traps.splice(i, 1); continue }
    if (tr.arm > 0) { tr.arm--; continue }
    if (--tr.life <= 0) { s.traps.splice(i, 1); continue }
    if (opp && grounded(opp) && Math.abs(ctrX(opp) - tr.x) <= T.radius && opp.health > 0) {
      tr.fired = 16
      const r = ninjaStrike(f, opp, { dmg: T.dmg * (1 + (tr.rev || 0) * 0.1), hitstun: 34, kbx: 0, kby: -7, move: 'earth_kunai_trap', blockstun: 14 }, W)
      if (r === 'hit') { s.stats.trapHits++; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 28) }   // trips
      cue(s, 'trapFire')
    }
  }
}

// ── per-sim-frame tick (1v1 + FFA combat steps, before the command layer). raw = readRawControls(f). ─────────────
// Returns this tick's sim signals for the character layer: { streakWant, erupt }
export function tickNinja(f, opp, raw = {}, W = null) {
  const p = getNinjaProfile(f); if (!p) { if (f?._ninja) clearNinja(f, W); return null }
  const s = ninjaState(f); s.tick++
  // press edges (sim ticks) for the command layer
  const fw = !!(f.facing === -1 ? raw.left : raw.right), bk = !!(f.facing === -1 ? raw.right : raw.left)
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'charge', 'block', 'jump', 'left', 'right', 'down', 'up']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk, charge: !!raw.charge, light: !!raw.light, heavy: !!raw.heavy }
    s.prev[k] = v
  }
  s.dirs.push(numpad(raw, f.facing || 1)); if (s.dirs.length > 30) s.dirs.shift()
  // the SHARED double-tap: rangers.js tickRanger with blinkVeto — S.P.D. Red's exact detector, no blink performed
  ensureRangerState(f).blinkVeto = true
  tickRanger(f, opp, raw, W && { stageWidth: W.stageWidth, frame: W.frame, seed: W.seed, attackBox: W.attackBox, projectiles: W.projectileRects })
  const r = f._ranger
  const want = r && r.pendingAt === r.tick ? r.pending : null
  if (f.health <= 0 || f.isGrabbed) {
    if (s.mirror) endMirror(f, 'real'); if (s.burrow) surface(f, s, 'hit')
    s.streak = null; s.vanish = null; s.swap = null; s.seq = null; s.barrier = null; f._rooted = false
    if (f.health <= 0) return { want: null }
  }
  if (f.hitstop > 0) return { want }
  s.clock++
  // NINJA POWER regen (6/s = 0.1/f, fixed-point tenths so it is exact), not while streaking
  if (!s.streak) { s.npAcc += p.np.regen; while (s.npAcc >= 60) { s.npAcc -= 60; gainNP(f, 1) } }
  if (s.vanishCd > 0) s.vanishCd--; if (s.escapeCd > 0) s.escapeCd--; if (s.barrierCd > 0) s.barrierCd--
  if (s.chainRec > 0 && !s.streak && --s.chainRec <= 0) s.chain = 0
  if (f._ninjaHidden > 0) f._ninjaHidden--
  if (s.lastMirror && --s.lastMirror.t <= 0) s.lastMirror = null
  if (s.lastRipple && --s.lastRipple.t <= 0) s.lastRipple = null
  if (s.lastShock && --s.lastShock.t <= 0) s.lastShock = null
  if (grounded(f) && !s.streak) { s.airStreaks = 0; s.float = 0 }
  // REV (profile.rev): running for revAt frames builds a pip (max 3); spent by the next streak / special
  if (p.rev) {
    const running = grounded(f) && !f.attacking && Math.abs(f.vx || 0) >= 6.5
    if (running) { if (++s.rev.runT >= p.rev.every && s.rev.pips < p.rev.max) { s.rev.pips++; s.rev.runT = 0; cue(s, 'revPip') } }
    else s.rev.runT = 0
  }
  // FLOAT (profile.float): hold Jump while falling → slow fall, budget per airtime. Never a climb (vy is only capped).
  if (p.float && !grounded(f) && raw.jump && (f.vy || 0) > 0 && s.float < p.float.frames && !s.streak && !f.attacking) {
    f.vy = Math.min(f.vy, p.float.fallCap); s.float++; f._ninjaFloat = 2
  } else if (f._ninjaFloat > 0) f._ninjaFloat--
  // systems
  if (s.streak) stepStreak(f, s, p, opp, raw, W)
  if (s.vanish) stepVanish(f, s, p, opp)
  if (s.swap) stepSwap(f, s, p, opp)
  if (s.barrier) stepBarrier(f, s, p, opp, W)
  let erupt = null
  if (s.burrow) erupt = stepBurrow(f, s, p, opp, raw, W)
  if (s.counter) stepCounter(f, s, p, opp, W)
  if (s.mirror) tickMirror(f, s, p, opp, W)
  tickClones(f, s, p, opp, W)
  if (p.traps) tickTraps(f, s, p, opp, W)
  if (opp?._ninjaWallBounce > 0) { opp._ninjaWallBounce--; if ((opp.x <= 2 || opp.x >= sw(W) - (opp.w || 60) - 2) && (opp.vx || 0) !== 0) { opp.vx = -opp.vx * 0.8; opp.vy = -9; opp._ninjaWallBounce = 0 } }
  return { want, erupt }
}

// game.js movement lock: the ninja moves itself during these
export const ninjaLocked = f => isNinja(f) && !!f._ninja && !!(f._ninja.streak || f._ninja.vanish || f._ninja.swap || f._ninja.burrow || f._ninja.seq || f._ninja.barrier)
// render: body opacity multiplier (0 = hidden: burrowed / vanished / mid-swap). Pure read.
export function ninjaBodyAlpha(f) {
  const s = f?._ninja; if (!s || !isNinja(f)) return 1
  if (s.burrow?.under || (f._ninjaHidden || 0) > 0) return 0
  if (s.seq?.hide) return 0
  return 1
}

// ── CPU: CPU opponents never read GAME_STATE identity. When the ninja is in Ninja Mirror the CPU targets the body its
// read of THE TELL picks (shadow / glint), with a difficulty-based chance; otherwise a hash coin-flip. The choice is
// re-rolled per split / swap (mirror serial + swap count), deterministic: hash(seed, frame-of-decision, side, slot).
const TELL_READ = { dummy: 0, easy: 0.2, normal: 0.45, medium: 0.45, adaptive: 0.45, hard: 0.7, impossible: 0.7, expert: 0.7 }
export function ninjaAiPerceivedTarget(controller, ai, opp, W) {
  const m = opp?._ninja?.mirror
  if (!m || !isNinja(opp)) return opp
  const key = m.n * 8 + m.swaps
  const mem = controller.memory || (controller.memory = {})
  if (mem._ninjaKey !== key) {
    mem._ninjaKey = key
    const read = TELL_READ[controller.difficulty] ?? 0.45
    const h1 = rangerHash(((W?.seed?.() | 0) || 1) + key * 7919, key, sideIdx(ai))
    const h2 = rangerHash(((W?.seed?.() | 0) || 1) + key * 104729, key + 1, sideIdx(ai))
    // a successful read of the tell picks the body WITH a ground shadow (that is the real one — the CPU sees exactly
    // what a player sees); a failed read is a hash coin-flip between the two visible bodies
    mem._ninjaPick = h1 < read ? 'shadowed' : (h2 < 0.5 ? 'shadowed' : 'unshadowed')
  }
  if (mem._ninjaPick === 'shadowed') return opp
  const o = Object.create(opp); o.x = m.x; o.y = m.y
  return o
}
