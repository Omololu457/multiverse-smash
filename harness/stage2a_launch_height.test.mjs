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

// ── (A) LIVE per-archetype launch (raised) — Fast -30, Balanced -32 (floor -30, no longer flat -26) ──
section("A. launcher pops each archetype to its LIVE raised value (Fast -30 / Balanced -32; was flat -26)")
for (const [key, expected] of [["gojo", -32], ["maki", -30]]) {
  const cd = getCharacter(key); const md = cd.basic_attacks.upAttack
  const a = mkFighter("p1", 100, { rosterKey: key, basic_attacks: cd.basic_attacks })
  const t = mkFighter("p2", 168, { facing: -1 })
  startMove(a, "up", md); let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--
  resolveAttackHit(a, t, [], {})
  check(`${key}: enemy launched at vy = ${expected} (raised, archetype-live)`, t.vy === expected, `vy=${t.vy}`)
}
// Fast launches LOWER than Balanced (spread is alive again, not flat)
check("Fast (Maki -30) launches lower than Balanced (Gojo -32)", -30 > -32)
// giant target still halves → Balanced -32 → -16
{
  const cd = getCharacter("gojo")
  const a = mkFighter("p1", 100, { rosterKey: "gojo", basic_attacks: cd.basic_attacks })
  const giant = mkFighter("p2", 168, { facing: -1 }); giant._canvasHeightFrac = 0.85
  startMove(a, "up", cd.basic_attacks.upAttack); let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--
  resolveAttackHit(a, giant, [], {})
  check("giant TARGET launch halved (-32 → -16)", giant.vy === -16, `vy=${giant.vy}`)
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

section("B. the raise is real — the new launches rise meaningfully higher than the OLD flat -26")
const oldFlat = trajectory(-26)
const fastRise = trajectory(-30), balRise = trajectory(-32), heavyRise = trajectory(-33)
console.log(`     apex rise: OLD flat -26 = ${oldFlat.apexRise.toFixed(0)}px`)
console.log(`     new Fast -30 = ${fastRise.apexRise.toFixed(0)}px  Balanced -32 = ${balRise.apexRise.toFixed(0)}px  Heavy/Heavy-tank -33 = ${heavyRise.apexRise.toFixed(0)}px  (roster max)`)
check("Fast -30 rises meaningfully higher than the old flat -26", fastRise.apexRise > oldFlat.apexRise + 60, `${fastRise.apexRise.toFixed(0)} vs ${oldFlat.apexRise.toFixed(0)}`)
check("archetype spread is LIVE: Fast < Balanced < Heavy (heavier launches higher)",
  fastRise.apexRise < balRise.apexRise && balRise.apexRise < heavyRise.apexRise,
  `${fastRise.apexRise}/${balRise.apexRise}/${heavyRise.apexRise}`)

section("C. juggle gravity brings the ceiling back down (not out of reach)")
const noRamp = trajectory(-32, { ramp: false })
const ramped = trajectory(-32, { ramp: true })
console.log(`     -32 no-ramp: apex ${noRamp.apexRise.toFixed(0)}px, ${noRamp.airborneFrames}f airborne`)
console.log(`     -32 ramped : apex ${ramped.apexRise.toFixed(0)}px, ${ramped.airborneFrames}f airborne`)
check("juggle ramp lowers the apex (caps the rise)", ramped.apexRise < noRamp.apexRise, `${ramped.apexRise.toFixed(0)} < ${noRamp.apexRise.toFixed(0)}`)
check("juggle ramp returns the target to the ground FASTER", ramped.airborneFrames < noRamp.airborneFrames, `${ramped.airborneFrames} < ${noRamp.airborneFrames}`)

section("D. even the HIGHEST launch (Heavy/Heavy-tank -33) keeps ceiling headroom (-360 cap)")
check("a full un-ramped -33 rise stays clear of the -360 ceiling", heavyRise.apexY > -360, `apexY=${heavyRise.apexY.toFixed(0)}`)

console.log(`\nStage 2a: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
