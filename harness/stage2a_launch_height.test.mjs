// MK-feel STAGE 2a CONFIRMATION — raised launch height (targetLaunch -17 → -26), relying on Stage 1b's
// juggle gravity to bring the ceiling back down so the higher pop doesn't sail the opponent out of reach.
// Drives the REAL physics/combat code:
//   (A) launcherAttack now pops EVERY launcher to -26 (was the -17 floor / -11..-13 tuned pops); giant halves.
//   (B) a -26 launch rises meaningfully HIGHER than the old -17 (the raise is real).
//   (C) JUGGLE GRAVITY caps it: a -26 launch WITH the per-air-hit juggle ramp reaches a LOWER apex and
//       returns to catchable height FASTER than the same -26 launch with no ramp → not "out of reach".
//   (D) the ramped apex stays within the arena ceiling (never clips the -360 cap).
import { startMove, resolveAttackHit, getAttackPhase, ensureCombatState } from "../combat.js"
import { physics } from "../physics.js"
import { getCharacter } from "../characters.js"

physics.setGroundY(400)
physics.setStageBounds(0, 3200)

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

function mkFighter(side, x, extra = {}) {
  const f = { side, rosterKey: extra.rosterKey || "tester", facing: extra.facing ?? 1,
    x, y: 300, w: 50, h: 100, vx: 0, vy: 0, groundY: 400, onGround: true, grounded: true,
    health: 1e6, maxHealth: 1e6, energy: 100, maxEnergy: 100, maxAirHits: 3, basic_attacks: extra.basic_attacks || {} }
  ensureCombatState(f); return f
}

// ── (A) every launcher pops to -26 now ──
section("A. launcher pops every archetype to -26 (was -11..-13 tuned / -17 floor)")
for (const key of ["gojo", "maki"]) {
  const cd = getCharacter(key); const md = cd.basic_attacks.upAttack
  const a = mkFighter("p1", 100, { rosterKey: key, basic_attacks: cd.basic_attacks })
  const t = mkFighter("p2", 168, { facing: -1 })
  startMove(a, "up", md); let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--
  resolveAttackHit(a, t, [], {})
  check(`${key}: enemy launched at vy = -26 (raised)`, t.vy === -26, `vy=${t.vy}`)
}
// giant target still halves → -13
{
  const cd = getCharacter("gojo")
  const a = mkFighter("p1", 100, { rosterKey: "gojo", basic_attacks: cd.basic_attacks })
  const giant = mkFighter("p2", 168, { facing: -1 }); giant._canvasHeightFrac = 0.85
  startMove(a, "up", cd.basic_attacks.upAttack); let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--
  resolveAttackHit(a, giant, [], {})
  check("giant TARGET launch halved (-26 → -13)", giant.vy === -13, `vy=${giant.vy}`)
}

// ── trajectory sim: drop a launched body, optionally ramping juggleCount as air hits land ──
function trajectory(initialVy, { ramp = false } = {}) {
  const f = mkFighter("p2", 200); f.y = 400 - f.h; f.groundY = 400
  f.onGround = false; f.grounded = false; f.isLaunched = true; f.vy = initialVy; f.juggleCount = 0
  const startY = f.y; let apexY = f.y, frames = 0, minY = f.y
  for (let i = 0; i < 400; i++) {
    if (ramp && i > 0 && i % 8 === 0 && f.juggleCount < 3) f.juggleCount++   // an air hit lands every ~8f → ramp
    physics.applyGravity(f)
    minY = Math.min(minY, f.y); frames++
    if (f.onGround) break
  }
  apexY = minY
  return { apexRise: startY - apexY, airborneFrames: frames, apexY }
}

section("B. the raise is real — -26 rises meaningfully higher than the old -17")
const oldFloor = trajectory(-17), raised = trajectory(-26)
console.log(`     apex rise: old -17 = ${oldFloor.apexRise.toFixed(0)}px   new -26 = ${raised.apexRise.toFixed(0)}px`)
check("-26 launch rises higher than the old -17 floor", raised.apexRise > oldFloor.apexRise + 60, `${raised.apexRise.toFixed(0)} vs ${oldFloor.apexRise.toFixed(0)}`)

section("C. juggle gravity brings the ceiling back down (not out of reach)")
const noRamp = trajectory(-26, { ramp: false })
const ramped = trajectory(-26, { ramp: true })
console.log(`     -26 no-ramp: apex ${noRamp.apexRise.toFixed(0)}px, ${noRamp.airborneFrames}f airborne`)
console.log(`     -26 ramped : apex ${ramped.apexRise.toFixed(0)}px, ${ramped.airborneFrames}f airborne`)
check("juggle ramp lowers the apex (caps the rise)", ramped.apexRise < noRamp.apexRise, `${ramped.apexRise.toFixed(0)} < ${noRamp.apexRise.toFixed(0)}`)
check("juggle ramp returns the target to the ground FASTER", ramped.airborneFrames < noRamp.airborneFrames, `${ramped.airborneFrames} < ${noRamp.airborneFrames}`)

section("D. the raised launch never clips the arena ceiling (-360 cap)")
check("even a full un-ramped -26 rise stays above the -360 ceiling", raised.apexY > -360, `apexY=${raised.apexY.toFixed(0)}`)

console.log(`\nStage 2a: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
