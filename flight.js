/**
 * FLIGHT.JS — reusable, data-driven flight module.
 *
 * Homelander is the first user; a future Superman reuses it by supplying a different
 * FLIGHT PROFILE (data, not code). Nothing in the *logic* is character-specific — every
 * number lives in FLIGHT_PROFILES. See docs/homelander/FLIGHT_DESIGN.md.
 *
 * SIM vs RENDER (determinism / LAN / replay):
 *   • Everything written onto fighter._flightCtl is SIMULATION state — it lives in the
 *     fighter object (inside GAME_STATE), is synced over LAN, and is replayed.
 *   • Render-only polish (bob, tilt, speed lines, trail, cape wind) is produced by
 *     flightRenderHints() and is NEVER read back by the sim step.
 *   • No Math.random / gameRng anywhere. Any randomness uses hashRandom(seed, frame, idx).
 *
 * The existing Omni-Man / Superman flight (_flightActive, trait canFly) is a SEPARATE,
 * simpler system and is left byte-identical. This module is gated on traits.flightProfile.
 */

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT PROFILES (pure data). A future Superman adds a key here — no logic changes.
// Timers are in FRAMES at 60fps.
// ─────────────────────────────────────────────────────────────────────────────
export const FLIGHT_PROFILES = {
  homelander: {
    // movement
    accel: 0.55,            // px/frame² while a direction is held (no drag while held) → maxH in ~12f
    maxH: 6.5,              // max cruise horizontal speed (px/frame)
    maxV: 5.5,              // max cruise vertical speed
    drag: 0.86,             // per-frame coast multiplier on an axis with NO input (the floaty drift)
    reverseBrake: 0.72,     // extra brake applied when input reverses current velocity → turnaround in ~8f
    overspeedDrag: 0.90,    // ease-down when |v| exceeds max (preserves air-dash momentum carry)
    ceilEaseZone: 48,       // px from the ceiling where upward vy starts easing (no hard stop)
    // air dash
    dashSpeed: 11,          // launch speed of an air dash (> maxH so momentum carries out)
    dashFrames: 14,         // duration an air dash locks velocity
    maxAirDash: 2,          // dashes per flight
    dashCost: 30,           // flight energy spent per air dash
    // energy
    energyMax: 240,         // ~4 s of flight per takeoff
    drainPerFrame: 1,       // flight energy spent per frame airborne
    groundRefillPerFrame: 2,// refills full (~2 s) while grounded
    // takeoff / landing
    liftoff: -4,            // initial upward nudge on takeoff
    takeoffFrames: 6,       // takeoff pose / blast-streak window
    landRecovery: 4,        // soft-landing recovery frames
    landRecoveryAfterAir: 8,// recovery if landing out of an air attack
    groundedLock: 90,       // 1.5 s can't-take-off after a hard hit in flight
    landThreshold: 70,      // "near the floor" distance for hold-down landing
    // animation
    minPoseFrames: 4,       // minimum frames a flight pose holds before switching
    cruiseFastFrac: 0.70,   // |v| fraction of max that counts as "fast cruise" (speed-line threshold)
  },

  // SUPERMAN (future) — NOT wired. Illustrative values for SUPERMAN_NOTES.md; a stronger,
  // longer flyer. Enabling is a one-field change (traits.flightProfile:"superman") once his
  // art + a freeze-breath slot exist. Kept here so the module ships "Superman-ready".
  // superman: { accel: 0.72, maxH: 8.0, maxV: 7.0, drag: 0.88, reverseBrake: 0.70,
  //   overspeedDrag: 0.90, ceilEaseZone: 56, dashSpeed: 13, dashFrames: 14, maxAirDash: 2,
  //   dashCost: 22, energyMax: 420, drainPerFrame: 1, groundRefillPerFrame: 2, liftoff: -5,
  //   takeoffFrames: 6, landRecovery: 4, landRecoveryAfterAir: 8, groundedLock: 90,
  //   landThreshold: 80, minPoseFrames: 4, cruiseFastFrac: 0.68 },
}

export const FLIGHT_PHASE = Object.freeze({
  GROUNDED: "grounded", TAKEOFF: "takeoff", FLYING: "flying", AIRDASH: "airdash", LANDING: "landing",
})

export function getFlightProfile(fighter) {
  const key = fighter && fighter.traits && fighter.traits.flightProfile
  return (key && FLIGHT_PROFILES[key]) || null
}

export function hasFlight(fighter) { return !!getFlightProfile(fighter) }

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic hash RNG — pure integer hash of (seed, frame, playerIndex) → [0,1).
// Replaces Math.random/gameRng for any flight randomness so it is LAN/replay-safe.
// ─────────────────────────────────────────────────────────────────────────────
export function hashRandom(seed, frame, playerIndex) {
  let h = ((seed | 0) ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ ((frame | 0) + 0x85ebca6b), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((playerIndex | 0) + 0x27d4eb2f), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

// ─────────────────────────────────────────────────────────────────────────────
// State lifecycle
// ─────────────────────────────────────────────────────────────────────────────
export function ensureFlightState(fighter) {
  if (!fighter._flightCtl) {
    fighter._flightCtl = {
      phase: FLIGHT_PHASE.GROUNDED,
      energy: getFlightProfile(fighter)?.energyMax ?? 240,
      airDashCount: 0,
      dashTimer: 0,
      dashDir: null,          // {x,y} during a dash (sprite hint)
      takeoffTimer: 0,
      landRecovery: 0,
      groundedLock: 0,
      poseKey: "hoverIdle",
      poseHold: 0,
      facingLatch: 1,
      afterAirAttack: false,  // set by a flight attack so landing uses the longer recovery
    }
  }
  return fighter._flightCtl
}

export function isFlying(fighter) {
  const c = fighter._flightCtl
  return !!(c && (c.phase === FLIGHT_PHASE.TAKEOFF || c.phase === FLIGHT_PHASE.FLYING || c.phase === FLIGHT_PHASE.AIRDASH))
}
export function flightPhase(fighter) { return fighter._flightCtl ? fighter._flightCtl.phase : FLIGHT_PHASE.GROUNDED }

// Full reset (round start / match reset) — nothing leaks across rounds. Only touches real flyers:
// a non-flyer is left with NO _flightCtl at all (so every gated engine branch stays a strict no-op).
export function resetFlight(fighter) {
  if (!fighter) return
  fighter._flightCtl = null
  if (hasFlight(fighter)) ensureFlightState(fighter)
}

// ─────────────────────────────────────────────────────────────────────────────
// Takeoff / landing
// ─────────────────────────────────────────────────────────────────────────────
// Enter flight from the ground OR mid-jump. Returns true if takeoff happened.
export function flightTakeoff(fighter) {
  const p = getFlightProfile(fighter); if (!p) return false
  const c = ensureFlightState(fighter)
  if (isFlying(fighter)) return false
  if (c.groundedLock > 0) return false
  if ((fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0 || fighter.knockdownState) return false
  if (c.energy <= p.drainPerFrame) return false
  c.phase = FLIGHT_PHASE.TAKEOFF
  c.takeoffTimer = p.takeoffFrames
  c.airDashCount = 0
  c.afterAirAttack = false
  fighter.onGround = false; fighter.grounded = false
  fighter.isLaunched = false; fighter.jumpCount = 0
  if ((fighter.vy || 0) >= 0) fighter.vy = p.liftoff
  return true
}

// Takeoff-input toggle (bound to the charge/L2 edge in game.js): on the ground → take off;
// while flying → request a controlled descent-to-land (held Up cancels it in stepFlight).
export function flightToggleInput(fighter) {
  if (!hasFlight(fighter)) return false
  if (isFlying(fighter)) { ensureFlightState(fighter).wantDescend = true; return true }
  return flightTakeoff(fighter)
}

// Begin a soft landing (hold-down, energy-out). recovery picks the air-attack length if flagged.
function beginLanding(fighter, p, c) {
  c.phase = FLIGHT_PHASE.LANDING
  c.landRecovery = c.afterAirAttack ? p.landRecoveryAfterAir : p.landRecovery
  fighter.vx = 0
}

// Knocked out of the sky by a hard hit → drop + grounded lock (can't take off 1.5 s).
export function flightKnockedDown(fighter) {
  const p = getFlightProfile(fighter); if (!p) return
  const c = ensureFlightState(fighter)
  c.phase = FLIGHT_PHASE.GROUNDED
  c.groundedLock = p.groundedLock
  c.dashTimer = 0; c.airDashCount = 0
}

// ─────────────────────────────────────────────────────────────────────────────
// stepFlight — the per-frame velocity + position integrator (owns x AND y while flying).
// Called from physics.moveFighter's gated branch. Pure w.r.t. engine internals.
//   input: { left, right, up, down, dashEdge, holdDown, faceTarget }   (booleans + optional x)
//   env:   { floorY, ceilingY, leftWall, rightWall }
// Returns { landed } (true the frame a landing begins).
// ─────────────────────────────────────────────────────────────────────────────
export function stepFlight(fighter, input, env) {
  const p = getFlightProfile(fighter); if (!p) return { landed: false }
  const c = ensureFlightState(fighter)
  if (!isFlying(fighter)) return { landed: false }

  // takeoff window → flying
  if (c.phase === FLIGHT_PHASE.TAKEOFF) {
    if (c.takeoffTimer > 0) c.takeoffTimer--
    if (c.takeoffTimer <= 0) c.phase = FLIGHT_PHASE.FLYING
  }

  const L = !!input.left, R = !!input.right, U = !!input.up, D = !!input.down
  const hx = (R ? 1 : 0) - (L ? 1 : 0)
  const hy = (D ? 1 : 0) - (U ? 1 : 0)

  // ── AIR DASH ────────────────────────────────────────────────────────────────
  if (input.dashEdge && c.dashTimer <= 0 && c.airDashCount < p.maxAirDash && c.energy >= p.dashCost) {
    let dx = hx, dy = hy
    if (dx === 0 && dy === 0) dx = fighter.facing || 1       // neutral → dash forward
    const norm = (dx && dy) ? Math.SQRT1_2 : 1
    fighter.vx = dx * p.dashSpeed * norm
    fighter.vy = dy * p.dashSpeed * norm
    c.dashDir = { x: dx, y: dy }
    c.dashTimer = p.dashFrames
    c.airDashCount++
    c.energy -= p.dashCost
    c.phase = FLIGHT_PHASE.AIRDASH
  }

  if (c.dashTimer > 0) {
    // velocity is LOCKED to the dash this window; momentum is carried out (not zeroed) at the end
    c.dashTimer--
    if (c.dashTimer <= 0) { c.phase = FLIGHT_PHASE.FLYING; c.dashDir = null }
  } else {
    // ── NORMAL 8-WAY VELOCITY (accel / drag / reverse-brake) ──────────────────
    fighter.vx = axisStep(fighter.vx, hx, p)
    fighter.vy = axisStep(fighter.vy, hy, p)
    // per-axis soft limit (ease down over-speed so dash carry decays, don't snap)
    fighter.vx = softLimit(fighter.vx, p.maxH, p)
    fighter.vy = softLimit(fighter.vy, p.maxV, p)
    // diagonal normalization — clamp the VECTOR to the (maxH,maxV) ellipse
    const e = (fighter.vx / p.maxH) ** 2 + (fighter.vy / p.maxV) ** 2
    if (e > 1) { const s = 1 / Math.sqrt(e); fighter.vx *= s; fighter.vy *= s }
  }

  // ── CEILING EASE (soft approach to the top) ─────────────────────────────────
  if (fighter.vy < 0) {
    const dist = (fighter.y) - env.ceilingY
    if (dist < p.ceilEaseZone) {
      const f = Math.max(0, dist / p.ceilEaseZone)
      fighter.vy *= f                                  // ease in; no hard stop
    }
  }

  // ── FACING ──────────────────────────────────────────────────────────────────
  const speed = Math.hypot(fighter.vx, fighter.vy)
  if (speed < 1.2 && input.faceTarget != null) {
    fighter.facing = (input.faceTarget >= fighter.x + (fighter.w || 0) / 2) ? 1 : -1   // auto-face opponent hovering
  } else if (Math.abs(fighter.vx) > 2.0) {
    fighter.facing = fighter.vx > 0 ? 1 : -1           // face travel direction cruising
  }

  // ── INTEGRATE POSITION + HARD BOUNDS ────────────────────────────────────────
  fighter.x += fighter.vx
  if (fighter.x < env.leftWall) { fighter.x = env.leftWall; if (fighter.vx < 0) fighter.vx = 0 }
  const rw = env.rightWall - (fighter.w || 0)
  if (fighter.x > rw) { fighter.x = rw; if (fighter.vx > 0) fighter.vx = 0 }

  fighter.y += fighter.vy
  if (fighter.y < env.ceilingY) { fighter.y = env.ceilingY; if (fighter.vy < 0) fighter.vy = 0 }
  const feetFloor = env.floorY - (fighter.h || 0)
  let landed = false
  if (fighter.y > feetFloor) {                         // skim the floor; don't sink through
    fighter.y = feetFloor
    if (fighter.vy > 0) fighter.vy = 0
  }
  fighter.onGround = false; fighter.grounded = false; fighter.isLaunched = false

  // ── LAND TRIGGERS: hold-down-near-floor, energy ran out, or a charge-tap descend request ─────
  const nearFloor = (feetFloor - fighter.y) <= p.landThreshold || fighter.y >= feetFloor - 0.5
  if (U && !D) c.wantDescend = false                 // held Up cancels a pending descend request
  if (c.phase !== FLIGHT_PHASE.TAKEOFF) {
    const descend = c.energy <= 0 || c.wantDescend    // out of energy OR charge-tapped to come down
    if ((input.holdDown || (D && !U)) && nearFloor) { beginLanding(fighter, p, c); landed = true }
    else if (descend && nearFloor) { beginLanding(fighter, p, c); landed = true }
    else if (descend && fighter.vy < 2) { fighter.vy = 2 }   // up high → sink until near the floor, then land
  }
  return { landed }
}

function axisStep(v, h, p) {
  if (h === 0) {                                        // no input → floaty drift
    v *= p.drag
    if (Math.abs(v) < 0.08) v = 0
    return v
  }
  if (v * h < 0) v *= p.reverseBrake                    // reversing → quick turnaround brake
  return v + p.accel * h
}

function softLimit(v, max, p) {
  if (v > max) return Math.max(max, v * p.overspeedDrag)   // ease down, keep dash carry
  if (v < -max) return Math.min(-max, v * p.overspeedDrag)
  return v
}

// ─────────────────────────────────────────────────────────────────────────────
// tickFlightDriver — per-frame NON-movement bookkeeping (energy, timers, pose hold).
// Called from combat.updateFighterState BEFORE applyGravity (beside the Omni-Man driver).
//   opts.hardHit : true this frame if a hard/knockdown hit landed in flight
// ─────────────────────────────────────────────────────────────────────────────
export function tickFlightDriver(fighter, opts = {}) {
  const p = getFlightProfile(fighter); if (!p) return
  const c = ensureFlightState(fighter)

  // hard hit in flight → knocked down + grounded lock
  if (isFlying(fighter) && (opts.hardHit || fighter.knockdownState)) { flightKnockedDown(fighter); return }

  if (isFlying(fighter)) {
    c.energy = Math.max(0, c.energy - p.drainPerFrame)
  } else {
    // landing recovery then back to grounded; grounded lock counts down; energy refills on the floor
    if (c.phase === FLIGHT_PHASE.LANDING) {
      if (c.landRecovery > 0) c.landRecovery--
      if (c.landRecovery <= 0) { c.phase = FLIGHT_PHASE.GROUNDED; c.afterAirAttack = false }
    }
    if (c.groundedLock > 0) c.groundedLock--
    if ((fighter.onGround || fighter.grounded) && c.phase === FLIGHT_PHASE.GROUNDED) {
      c.energy = Math.min(p.energyMax, c.energy + p.groundRefillPerFrame)
      c.airDashCount = 0
    }
  }
  selectFlightPose(fighter)
}

// Mark that a flight attack happened this frame → landing uses the longer recovery.
export function flagFlightAirAttack(fighter) { const c = fighter._flightCtl; if (c) c.afterAirAttack = true }

// ─────────────────────────────────────────────────────────────────────────────
// Animation selection — pose from VELOCITY, min-frame hold, attack/hit interrupt.
// Writes _flightCtl.poseKey (SIM state). The sprite resolver maps poseKey → animation.
// ─────────────────────────────────────────────────────────────────────────────
export function selectFlightPose(fighter, opts = {}) {
  const p = getFlightProfile(fighter); if (!p) return null
  const c = ensureFlightState(fighter)
  const want = desiredPose(fighter, c, p)
  const interrupt = !!opts.attack || !!opts.hit
  if (c.poseHold > 0) c.poseHold--
  if (want !== c.poseKey && (interrupt || c.poseHold <= 0)) {
    c.poseKey = want
    c.poseHold = interrupt ? 0 : p.minPoseFrames
  }
  return c.poseKey
}

function desiredPose(fighter, c, p) {
  if (c.phase === FLIGHT_PHASE.TAKEOFF) return "takeoff"
  if (c.phase === FLIGHT_PHASE.LANDING) return "land"
  if (c.phase === FLIGHT_PHASE.AIRDASH) return "capeTwirl"
  const vx = fighter.vx || 0, vy = fighter.vy || 0
  // facing flip → cape-flip turn
  if (c.facingLatch !== fighter.facing) { c.facingLatch = fighter.facing; return "turn" }
  const reversing = (fighter._flightInputX || 0) * vx < 0 && Math.abs(vx) > 1
  if (reversing) return "brake"
  if (vy < -1.4) return "rise"
  if (vy > 1.4) return "dive"
  if (Math.abs(vx) > p.maxH * p.cruiseFastFrac) return "cruiseB"   // fast cruise cycle
  if (Math.abs(vx) > 1.4) return "cruiseA"                          // slow cruise cycle
  return "hoverIdle"
}

// Frame-rate scale for the cruise cycle (faster flight = faster wing/cape cycle).
export function cruiseFrameRate(fighter) {
  const p = getFlightProfile(fighter); if (!p) return 1
  return 1 + Math.min(1.2, Math.abs(fighter.vx || 0) / p.maxH)
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER-ONLY polish — pure function of sim state + frame; NEVER read back by the sim.
// Returns offsets/particles the renderer draws. Deterministic (hashRandom, no Math.random).
// ─────────────────────────────────────────────────────────────────────────────
export function flightRenderHints(fighter, frame, playerIndex) {
  const p = getFlightProfile(fighter)
  const c = fighter._flightCtl
  if (!p || !c || !isFlying(fighter)) return null
  const vx = fighter.vx || 0, vy = fighter.vy || 0
  const speed = Math.hypot(vx, vy)
  const maxSpeed = Math.hypot(p.maxH, p.maxV)
  const fast = speed > maxSpeed * p.cruiseFastFrac
  // hover bob: gentle 2px sine, deterministic phase from frame + player
  const bob = (c.phase === FLIGHT_PHASE.FLYING && speed < 1.2)
    ? Math.sin((frame + playerIndex * 37) * 0.14) * 2 : 0
  // body tilt toward velocity direction, eased, ≤10°
  const tiltTarget = Math.atan2(vy, Math.max(0.001, Math.abs(vx))) * (vx >= 0 ? 1 : -1)
  const tilt = Math.max(-0.1745, Math.min(0.1745, tiltTarget * 0.4))   // ~10° cap, eased
  return {
    bob, tilt,
    speedLines: fast, afterTrail: fast,
    capeWind: Math.min(1, speed / maxSpeed),
    blastStreak: c.phase === FLIGHT_PHASE.TAKEOFF,   // red takeoff streak under feet
    jitterSeed: hashRandom((fighter._matchSeed | 0) || 1, frame, playerIndex),
  }
}
