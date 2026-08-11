// MK-feel STAGE 2f CONFIRMATION — COUNTER-HITS. Hitting the opponent during their attack STARTUP is a
// counter-hit; on top of the pre-existing +25% damage + COUNTER_HIT sfx, this stage attaches the missing
// rewards. Drives the REAL combat.js:
//   • +8 hitstun on a counter-hit
//   • the combo it opens SKIPS ONE TIER of combo scaling (damage + hitstun decay one hit slower)
//   • the clashFlash visual fires (reused)
//   • a NON-counter hit gets none of it
import { startMove, resolveAttackHit, getAttackPhase, ensureCombatState, getComboScale, getComboHitstunScale, COMBO_DAMAGE_CURVE } from "../combat.js"
import { physics } from "../physics.js"

physics.setGroundY(400); physics.setStageBounds(0, 3200)

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

function mkAtk() { const f = { side: "p1", rosterKey: "atk", facing: 1, x: 100, y: 300, w: 60, h: 100, vx: 0, vy: 0, onGround: true, grounded: true, health: 1e6, maxHealth: 1e6, energy: 0, maxEnergy: 0, comboCounter: 0 }; ensureCombatState(f); return f }
function mkDef() { const f = { side: "p2", rosterKey: "def", facing: -1, x: 170, y: 300, w: 60, h: 100, vx: 0, vy: 0, onGround: true, grounded: true, health: 1e6, maxHealth: 1e6, energy: 0, maxEnergy: 0 }; ensureCombatState(f); return f }
const HEAVY = { damage: 60, startup: 3, active: 4, recovery: 8, hitstun: 20, knockbackX: 5, knockbackY: 1, rangeX: 240, rangeY: 200 }
// Land the attacker's HEAVY on the defender. If `counter`, the defender is mid-STARTUP of its own move.
function landHit(a, t, { counter }) {
  a.attacking = false; a.currentAttack = null; a.attackCooldown = 0
  t.hitstun = 0; t.invulnTimer = 0; t.clashFlash = 0; a.clashFlash = 0; t.attacking = false; t.currentAttack = null
  if (counter) { startMove(t, "light", { damage: 40, startup: 12, active: 4, recovery: 10, rangeX: 100 }); t.wasInStartup = true }  // defender in STARTUP
  else { t.wasInStartup = false }
  startMove(a, "heavy", HEAVY)
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--
  const inStartup = counter ? getAttackPhase(t) === "startup" : null
  resolveAttackHit(a, t, [], { stageWidth: 3200 })
  return { inStartup }
}

// ── A. the skipped-tier scaling logic (getComboScale reads _counterScaleTier) ──
section("A. counter-hit SKIPS one tier of combo scaling (getComboScale)")
{
  const normal  = getComboScale({ comboCounter: 3 })                        // curve[2]
  const counter = getComboScale({ comboCounter: 3, _counterScaleTier: 1 })  // curve[1] — one tier back
  check("tier-skip uses one-earlier curve entry", counter === COMBO_DAMAGE_CURVE[1] && normal === COMBO_DAMAGE_CURVE[2], `counter=${counter} normal=${normal}`)
  check("counter combo scales HIGHER (less decay) than a normal combo", counter > normal, `${counter} > ${normal}`)
  check("floor at the opener (comboCounter 1) is still 1 (no under-scale)", getComboScale({ comboCounter: 1, _counterScaleTier: 1 }) === 1)
}

// ── B. counter-hit rewards fire (+8 hitstun, clashFlash, tier flag) ──
section("B. counter-hit (defender in startup) attaches the rewards")
{
  const aC = mkAtk(), tC = mkDef(); const rC = landHit(aC, tC, { counter: true })
  const aN = mkAtk(), tN = mkDef(); landHit(aN, tN, { counter: false })
  check("the counter was detected (defender was in startup)", rC.inStartup === true)
  check("+8 hitstun vs the same non-counter hit", (tC.hitstun || 0) - (tN.hitstun || 0) === 8, `counter=${tC.hitstun} normal=${tN.hitstun}`)
  check("clashFlash fired on BOTH fighters", (tC.clashFlash || 0) >= 10 && (aC.clashFlash || 0) >= 10, `def=${tC.clashFlash} atk=${aC.clashFlash}`)
  check("counter set the skip-tier flag on the attacker", aC._counterScaleTier === 1)
  check("counter dealt MORE than the non-counter (existing 1.25x)", (1e6 - tC.health) > (1e6 - tN.health), `counterΔ=${1e6 - tC.health} normalΔ=${1e6 - tN.health}`)
}

// ── C. non-counter gets none of it ──
section("C. a NON-counter hit gets no counter rewards")
{
  const a = mkAtk(), t = mkDef(); landHit(a, t, { counter: false })
  check("no skip-tier flag", (a._counterScaleTier || 0) === 0)
  check("no clashFlash", (t.clashFlash || 0) === 0 && (a.clashFlash || 0) === 0)
}

// ── D. the skip-tier flag clears when the combo ends ──
section("D. skip-tier flag clears when the combo drops")
{
  const a = mkAtk(), t = mkDef()
  landHit(a, t, { counter: true })
  check("flag set during the counter combo", a._counterScaleTier === 1)
  // block ends the combo → clear
  const a2 = mkAtk(); a2._counterScaleTier = 1; a2.comboCounter = 4
  const t2 = mkDef(); t2.isBlocking = true; t2.hitstun = 0
  a2.attacking = false; a2.currentAttack = null
  startMove(a2, "heavy", HEAVY); let g = 0; while (getAttackPhase(a2) !== "active" && g++ < 120) a2.currentAttack.timer--
  resolveAttackHit(a2, t2, [], { stageWidth: 3200 })
  check("a BLOCK clears the skip-tier flag (combo ended)", (a2._counterScaleTier || 0) === 0 && a2.comboCounter === 0)
}

console.log(`\nStage 2f (counter-hits): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
