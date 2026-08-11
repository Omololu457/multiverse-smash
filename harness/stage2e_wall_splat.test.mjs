// MK-feel STAGE 2e CONFIRMATION — WALL SPLAT / corner carry. Drives the REAL resolveAttackHit (combat.js):
//   • a STRONG hit (heavy/special/ultimate) with GENUINELY HEAVY knockback that drives the defender INTO
//     the stage wall → wall-splat: EXTENDED hitstun + a splat window + camera-shake flag + a bounce-off.
//   • the splat fires ONLY on real wall-bound knockback — NOT on: a light poke near the wall, a WEAK heavy
//     near the wall, a vertical launcher near the wall, or a strong hit AWAY from the wall.
import { startMove, resolveAttackHit, getAttackPhase, ensureCombatState } from "../combat.js"
import { physics } from "../physics.js"

const STAGE_W = 3200
physics.setGroundY(400); physics.setStageBounds(0, STAGE_W)

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

function mkAttacker(x, facing) { const f = { side: "p1", rosterKey: "atk", facing, x, y: 300, w: 60, h: 100, vx: 0, vy: 0, onGround: true, grounded: true, health: 1e6, maxHealth: 1e6, energy: 0, maxEnergy: 0 }; ensureCombatState(f); return f }
function mkDefender(x) { const f = { side: "p2", rosterKey: "def", facing: 1, x, y: 300, w: 60, h: 100, vx: 0, vy: 0, onGround: true, grounded: true, health: 1e6, maxHealth: 1e6, energy: 0, maxEnergy: 0 }; ensureCombatState(f); return f }
const MD = (kb, moveKey = "heavy") => ({ damage: 60, startup: 3, active: 4, recovery: 8, hitstun: 18, knockbackX: kb, knockbackY: moveKey === "up" ? -8 : 1, rangeX: 260, rangeY: 220, ...(moveKey === "up" ? { launchVy: -26 } : {}) })
function landHit(a, t, kb, moveKey = "heavy") {
  t.hitstun = 0; t.invulnTimer = 0; t._wallSplat = 0; t.wallBounce = false; t._wallBounceShake = false; t.vx = 0
  a.attacking = false; a.currentAttack = null; a.attackCooldown = 0
  startMove(a, moveKey, MD(kb, moveKey))
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--
  resolveAttackHit(a, t, [], { stageWidth: STAGE_W })
}

// ── A. heavy knockback INTO the right wall → SPLAT ──
section("A. heavy knockback into the wall → wall-splat")
{
  const nearRight = STAGE_W - 60 - 24                 // defender pinned right at the right edge
  const a = mkAttacker(nearRight - 70, 1), t = mkDefender(nearRight)   // attacker faces RIGHT → drives defender into the right wall
  landHit(a, t, 8)                                    // strong knockback (|vx| = 8 > 6)
  check("wall-splat state set (pinned window)", (t._wallSplat || 0) > 0, `wallSplat=${t._wallSplat}`)
  check("EXTENDED hitstun applied (>= 34)", (t.hitstun || 0) >= 34, `hitstun=${t.hitstun}`)
  check("camera-shake flag raised", t._wallBounceShake === true)
  check("wallBounce flag set", t.wallBounce === true)
  check("bounced OFF the wall (vx reversed, away from wall)", t.vx < 0, `vx=${t.vx}`)
}

// ── F. left wall works too ──
section("F. heavy knockback into the LEFT wall → wall-splat")
{
  const nearLeft = 24
  const a = mkAttacker(nearLeft + 70, -1), t = mkDefender(nearLeft)   // attacker faces LEFT → drives defender into the left wall
  landHit(a, t, 8)
  check("wall-splat set at the left wall", (t._wallSplat || 0) > 0 && (t.hitstun || 0) >= 34, `wallSplat=${t._wallSplat} hitstun=${t.hitstun}`)
  check("bounced off left wall (vx reversed, to the right)", t.vx > 0, `vx=${t.vx}`)
}

// ── the NEGATIVE cases — splat must NOT fire ──
section("B. strong hit AWAY from the wall → NO splat")
{
  const a = mkAttacker(1600, 1), t = mkDefender(1670)   // mid-stage
  landHit(a, t, 8)
  check("no wall-splat mid-stage", !(t._wallSplat > 0) && (t.hitstun || 0) < 34, `wallSplat=${t._wallSplat} hitstun=${t.hitstun}`)
}
section("C. LIGHT poke near the wall → NO splat")
{
  const nearRight = STAGE_W - 60 - 24
  const a = mkAttacker(nearRight - 70, 1), t = mkDefender(nearRight)
  landHit(a, t, 3, "light")                             // light category + tiny knockback
  check("light hit near wall does NOT splat", !(t._wallSplat > 0) && (t.hitstun || 0) < 34, `wallSplat=${t._wallSplat} hitstun=${t.hitstun}`)
}
section("D. WEAK heavy near the wall (|vx| below threshold) → NO splat")
{
  const nearRight = STAGE_W - 60 - 24
  const a = mkAttacker(nearRight - 70, 1), t = mkDefender(nearRight)
  landHit(a, t, 4)                                      // heavy category but |vx| = 4 < 6 → not "genuinely heavy"
  check("weak heavy near wall does NOT splat", !(t._wallSplat > 0), `wallSplat=${t._wallSplat}`)
}
section("E. vertical LAUNCHER near the wall → NO splat (its vx is small)")
{
  const nearRight = STAGE_W - 60 - 24
  const a = mkAttacker(nearRight - 70, 1), t = mkDefender(nearRight)
  landHit(a, t, 2, "up")                                // up-attack launcher: pops UP, small vx
  check("launcher near wall does NOT splat (goes up, not into wall)", !(t._wallSplat > 0), `wallSplat=${t._wallSplat}`)
  check("launcher still launched the defender up", (t.vy || 0) < 0, `vy=${t.vy}`)
}

console.log(`\nStage 2e (wall splat): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
