/**
 * FLIGHT ENGINE-INTEGRATION HARNESS — drives the REAL physics.js (moveFighter + applyGravity)
 * with a synthetic flight-profile fighter, verifying that the engine correctly delegates to
 * flight.js while airborne and hands control back on landing. Complements the standalone
 * flight-path harness (which tests flight.js in isolation).
 *
 * Asserts: (a) takeoff makes him airborne and flight.js owns motion; (b) no per-frame position
 * jump exceeds max speed + dash speed; (c) he stays within the arena bounds; (d) an air dash
 * actually moves faster; (e) holding Down near the floor lands him (engine gravity resumes →
 * onGround true); (f) a NON-flight fighter run through the same loop is completely unaffected.
 */
import { physics } from "../physics.js"
import { FLIGHT_PROFILES, ensureFlightState, flightTakeoff, isFlying, flightPhase } from "../flight.js"

const P = FLIGHT_PROFILES.homelander
const CONTROLS = { left: "a", right: "d", up: "w", down: "s", jump: "w", light: "j", heavy: "k", special: "l", dash: "", charge: "u", block: "i" }

function makeFlyer() {
  return {
    rosterKey: "homelander_test", x: 600, y: 420, w: 50, h: 100, vx: 0, vy: 0, facing: 1,
    onGround: true, grounded: true, groundY: 520, hitstun: 0, blockstun: 0, stun: 0,
    knockdownState: false, traits: { flightProfile: "homelander" }, _flightOpponentX: 1800,
  }
}
const keysFrom = (o) => { const k = {}; for (const name in o) if (o[name]) k[CONTROLS[name]] = true; return k }

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }

// ── drive the real engine ───────────────────────────────────────────────────
const f = makeFlyer(); ensureFlightState(f)
physics.setStageBounds(0, 3200); physics.setGroundY(520)
ok(flightTakeoff(f), "takeoff refused")
const trace = []
function tick(inputObj, dashTap = false) {
  if (dashTap) f._dashTap = true
  physics.moveFighter(f, keysFrom(inputObj), CONTROLS, null)
  physics.applyGravity(f)
  trace.push({ x: +f.x.toFixed(3), y: +f.y.toFixed(3), onGround: f.onGround, phase: flightPhase(f), flying: isFlying(f) })
}

// takeoff settle + climb
for (let i = 0; i < P.takeoffFrames + 2; i++) tick({})
ok(isFlying(f) && !f.onGround, "not airborne after takeoff")
const yBeforeClimb = f.y
for (let i = 0; i < 50; i++) tick({ up: true })
ok(f.y < yBeforeClimb - 40, `did not climb (y ${yBeforeClimb.toFixed(0)} → ${f.y.toFixed(0)})`)
// cruise right then left
for (let i = 0; i < 18; i++) tick({ right: true })
const xAfterRight = f.x; ok(xAfterRight > 600, "did not cruise right")
for (let i = 0; i < 18; i++) tick({ left: true })
ok(f.x < xAfterRight, "did not cruise left")
// AIR DASH (up-right) — one frame with the dash edge, then carry
const xPre = f.x
tick({ right: true, up: true }, true)
const dashDx = Math.abs(f.x - xPre)
ok(dashDx > P.maxH + 0.5, `air dash not faster than cruise (Δx ${dashDx.toFixed(2)} ≤ maxH ${P.maxH})`)
for (let i = 0; i < P.dashFrames + 6; i++) tick({})
// re-climb then descend to land
for (let i = 0; i < 20; i++) tick({ up: true })
let guard = 0
while (isFlying(f) && guard++ < 500) tick({ down: true })
// let landing recovery + gravity settle him onto the floor
for (let i = 0; i < 30; i++) tick({})
ok(f.onGround === true, `did not land (onGround=${f.onGround}, phase=${flightPhase(f)}, y=${f.y.toFixed(0)})`)
ok(Math.abs((f.y + f.h) - 520) < 1.5, `feet not on the floor (feetY=${(f.y + f.h).toFixed(1)})`)

// (b) no teleport, (c) within bounds
const JX = P.maxH + P.dashSpeed, JY = P.maxV + P.dashSpeed
let mdx = 0, mdy = 0
for (let i = 1; i < trace.length; i++) {
  const dx = Math.abs(trace[i].x - trace[i - 1].x), dy = Math.abs(trace[i].y - trace[i - 1].y)
  if (dx > mdx) mdx = dx; if (dy > mdy) mdy = dy
  ok(dx <= JX + 1e-6, `frame ${i} x-jump ${dx.toFixed(2)} > ${JX}`)
  ok(dy <= JY + 1e-6, `frame ${i} y-jump ${dy.toFixed(2)} > ${JY}`)
  ok(trace[i].x >= -0.01 && trace[i].x <= 3200 - f.w + 0.01, `frame ${i} out of x-bounds (${trace[i].x})`)
  ok(trace[i].y >= -360 - 0.01, `frame ${i} above ceiling (${trace[i].y})`)
}

// (f) a NON-flight fighter is untouched by the gated branch: run a plain walker and confirm
// it just walks on the ground under normal gravity (no flight state ever created).
const g = { rosterKey: "plain_test", x: 1000, y: 420, w: 50, h: 100, vx: 0, vy: 0, facing: 1,
  onGround: true, grounded: true, groundY: 520, hitstun: 0, blockstun: 0, stun: 0, traits: {} }
for (let i = 0; i < 20; i++) { physics.moveFighter(g, keysFrom({ right: true }), CONTROLS, null); physics.applyGravity(g) }
ok(g._flightCtl == null, "gated flight branch leaked state onto a non-flyer")
ok(g.onGround === true && Math.abs((g.y + g.h) - 520) < 1.5, "non-flyer did not walk on the ground normally")
ok(g.x > 1000, "non-flyer did not move right")

console.log("════════════════════════════════════════════")
console.log(`  FLIGHT ENGINE-INTEGRATION: ${passed} passed, ${failed} failed`)
console.log(`  frames=${trace.length}  maxΔx=${mdx.toFixed(2)} (cap ${JX})  maxΔy=${mdy.toFixed(2)} (cap ${JY})  dashΔx=${dashDx.toFixed(2)}`)
console.log("════════════════════════════════════════════")
if (failed) { fails.slice(0, 12).forEach(m => console.log("  ✗ " + m)); process.exit(1) }
