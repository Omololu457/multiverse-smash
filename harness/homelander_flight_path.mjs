/**
 * FLIGHT PATH HARNESS — drives flight.js headless (no engine) through a scripted path:
 *   takeoff → 8 directions → 2 air dashes → brake/reverse → land.
 * Asserts: (a) no single-frame position jump exceeds max speed + dash speed (no teleports),
 *          (b) no flight pose held fewer than minPoseFrames (no choppiness), (c) energy is
 *          monotonic within a state, (d) determinism: identical seed → identical trace.
 */
import {
  FLIGHT_PROFILES, FLIGHT_PHASE, ensureFlightState, flightTakeoff, stepFlight,
  tickFlightDriver, isFlying, flightPhase,
} from "../flight.js"

const P = FLIGHT_PROFILES.homelander
const ENV = { floorY: 520, ceilingY: -360, leftWall: 0, rightWall: 3200 }

function makeFighter(seed) {
  return {
    x: 600, y: 420, w: 50, h: 100, vx: 0, vy: 0, facing: 1,
    onGround: true, grounded: true, hitstun: 0, blockstun: 0, knockdownState: false,
    traits: { flightProfile: "homelander" }, _matchSeed: seed, _flightInputX: 0,
  }
}

// One frame: set brake-detection input, move (physics), then book-keep (combat driver).
function frame(f, input) {
  f._flightInputX = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  input.faceTarget = 1800 // a stationary "opponent" to the right, for auto-face while hovering
  const r = stepFlight(f, input, ENV)
  tickFlightDriver(f, {})
  return r
}

const IN = (o = {}) => ({ left: false, right: false, up: false, down: false, dashEdge: false, holdDown: false, ...o })

// Build the scripted input timeline.
function runScript(seed, record) {
  const f = makeFighter(seed); ensureFlightState(f)
  const trace = []
  const push = (tag) => {
    const c = f._flightCtl
    trace.push({ tag, x: +f.x.toFixed(4), y: +f.y.toFixed(4), vx: +f.vx.toFixed(4), vy: +f.vy.toFixed(4),
                 phase: c.phase, pose: c.poseKey, energy: c.energy })
  }
  // TAKEOFF
  flightTakeoff(f)
  for (let i = 0; i < P.takeoffFrames + 2; i++) { frame(f, IN()); push("takeoff") }
  // CLIMB to altitude first (so hold-Down tests don't instantly re-land at the floor)
  const climb = () => { for (let i = 0; i < 50; i++) { frame(f, IN({ up: true })); push("climb") } }
  climb()
  // 8 DIRECTIONS — hold each ~12 frames then neutral-coast ~6 (smaller excursions keep altitude)
  const dirs = [
    ["R", { right: true }], ["L", { left: true }], ["U", { up: true }], ["D", { down: true }],
    ["UR", { up: true, right: true }], ["DR", { down: true, right: true }],
    ["UL", { up: true, left: true }], ["DL", { down: true, left: true }],
  ]
  for (const [tag, d] of dirs) {
    for (let i = 0; i < 12; i++) { frame(f, IN(d)); push("dir:" + tag) }
    for (let i = 0; i < 6; i++) { frame(f, IN()); push("coast") }
  }
  // 2 AIR DASHES (forward-up, then back-down), re-climbing between so neither descends into a land
  frame(f, IN({ right: true, up: true, dashEdge: true })); push("dash1")
  for (let i = 0; i < P.dashFrames + 6; i++) { frame(f, IN()); push("dash1-carry") }
  for (let i = 0; i < 24; i++) { frame(f, IN({ up: true })); push("reclimb") }
  frame(f, IN({ left: true, down: true, dashEdge: true })); push("dash2")
  for (let i = 0; i < P.dashFrames + 6; i++) { frame(f, IN()); push("dash2-carry") }
  // BRAKE / reverse: cruise right hard, then slam left
  for (let i = 0; i < 16; i++) { frame(f, IN({ right: true })); push("cruiseR") }
  for (let i = 0; i < 12; i++) { frame(f, IN({ left: true })); push("reverseL") }
  // LAND: hold down near the floor until landed + recovery completes
  let guard = 0
  while (isFlying(f) && guard++ < 400) { frame(f, IN({ down: true, holdDown: true })); push("descend") }
  for (let i = 0; i < P.landRecovery + 4; i++) { frame(f, IN()); push("recover") }
  if (record) record.push(...trace)
  return trace
}

// ── assertions ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0
const fails = []
const ok = (cond, msg) => { if (cond) passed++; else { failed++; fails.push(msg) } }

const traceA = runScript(12345)
const traceB = runScript(12345)
const traceC = runScript(999)

// (a) no teleport: per-axis frame delta ≤ max + dashSpeed
const JUMP_X = P.maxH + P.dashSpeed, JUMP_Y = P.maxV + P.dashSpeed
let maxdx = 0, maxdy = 0
for (let i = 1; i < traceA.length; i++) {
  const dx = Math.abs(traceA[i].x - traceA[i - 1].x), dy = Math.abs(traceA[i].y - traceA[i - 1].y)
  if (dx > maxdx) maxdx = dx; if (dy > maxdy) maxdy = dy
  ok(dx <= JUMP_X + 1e-6, `frame ${i} x-jump ${dx.toFixed(2)} > ${JUMP_X}`)
  ok(dy <= JUMP_Y + 1e-6, `frame ${i} y-jump ${dy.toFixed(2)} > ${JUMP_Y}`)
}

// (b) no pose held fewer than minPoseFrames (we never inject attacks/hits here)
{
  let run = 1, bad = 0
  for (let i = 1; i < traceA.length; i++) {
    if (traceA[i].pose === traceA[i - 1].pose) { run++; continue }
    // pose just ended at i-1 with length `run`. Takeoff/landing poses are phase-bounded; allow them.
    const ended = traceA[i - 1].pose
    const phaseBounded = (ended === "takeoff" || ended === "land")
    if (!phaseBounded && run < P.minPoseFrames) { bad++; fails.push(`pose "${ended}" held ${run} < ${P.minPoseFrames} at frame ${i}`) }
    run = 1
  }
  ok(bad === 0, `${bad} short pose holds`)
}

// (c) energy monotonic within a state: never rises while airborne, never falls while grounded/landing
for (let i = 1; i < traceA.length; i++) {
  const prev = traceA[i - 1], cur = traceA[i]
  const airborne = (cur.phase === FLIGHT_PHASE.FLYING || cur.phase === FLIGHT_PHASE.TAKEOFF || cur.phase === FLIGHT_PHASE.AIRDASH)
  if (airborne) ok(cur.energy <= prev.energy + 1e-9, `energy rose while airborne at frame ${i}`)
  if (cur.phase === FLIGHT_PHASE.GROUNDED && prev.phase === FLIGHT_PHASE.GROUNDED)
    ok(cur.energy >= prev.energy - 1e-9, `energy fell while grounded at frame ${i}`)
}

// (d) determinism: same seed identical, and he actually landed
ok(JSON.stringify(traceA) === JSON.stringify(traceB), "same seed produced different traces")
ok(traceA.length === traceC.length, "seed changed trace length (should be input-driven, not seeded)")
ok(flightPhase({ _flightCtl: { phase: traceA[traceA.length - 1].phase } }) === FLIGHT_PHASE.GROUNDED, "did not return to grounded")

// sanity: he actually used energy and moved through multiple poses
const poses = new Set(traceA.map(t => t.pose))
ok(poses.size >= 5, `too few distinct poses (${poses.size})`)
ok(traceA.some(t => t.phase === FLIGHT_PHASE.AIRDASH), "no air-dash phase observed")

console.log("════════════════════════════════════════════")
console.log(`  FLIGHT PATH: ${passed} passed, ${failed} failed`)
console.log(`  frames=${traceA.length}  maxΔx=${maxdx.toFixed(2)} (cap ${JUMP_X})  maxΔy=${maxdy.toFixed(2)} (cap ${JUMP_Y})  distinctPoses=${poses.size}`)
console.log("════════════════════════════════════════════")
if (failed) { fails.slice(0, 12).forEach(m => console.log("  ✗ " + m)); process.exit(1) }
