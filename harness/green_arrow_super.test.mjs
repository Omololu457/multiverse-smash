// Green Arrow — PASS3 P2 SUPER "Arrowstorm Protocol" rework (node). Runs the full 3-wave state machine
// + munitions + arrow volley against a STATIONARY dummy and asserts the total ≈ 380 and ≤ 420.
import { executeGreenArrowUltimate, applyGreenArrowArrowstorm, updateProjectiles, activeProjectiles } from "../abilities.js"
import { resolveProjectileHitsMulti } from "../combat.js"
import { updateMunitions, tickMunitionChains, updateMunitionShootDown, resetMunitions, activeMunitions } from "../munitions.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const GROUND = 500, WORLDW = 2000
function mkGA() { return { rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x: 400, y: GROUND - 110, w: 60, h: 110, groundY: GROUND, energy: 100, maxEnergy: 100, _matchSeed: 42, comboCounter: 0, comboTimer: 0, attackCooldown: 0, invulnTimer: 0, hitstun: 0, vx: 0 } }
function mkDummy() { return { rosterKey: "goku", side: "p2", playerNumber: 2, facing: -1, x: 1000, y: GROUND - 110, w: 60, h: 110, groundY: GROUND, health: 100000, maxHealth: 100000, defense: 80, hitstun: 0, isBlocking: false, eliminated: false, vx: 0, vy: 0, comboCounter: 0 } }
const CTX = (opp, frame) => ({ getOpponent: () => opp, frame, stageWidth: WORLDW, worldWidth: WORLDW, stageLeft: 0, groundY: GROUND })
const MENV = (figs) => ({ groundY: GROUND, leftWall: 0, rightWall: WORLDW, fighters: figs, isEnemy: (o, f) => f && o && f.side !== o.side, platformTopAt: () => null })

function runSuper() {
  resetMunitions(); activeProjectiles.length = 0
  const f = mkGA(), d = mkDummy()
  f._gaLastSpecialFrame = null
  const cast = executeGreenArrowUltimate(f, CTX(d, 0))
  let frames = 0
  for (let fr = 1; fr <= 600 && f._gaArrowstormActive; fr++) {
    frames = fr
    applyGreenArrowArrowstorm(f, CTX(d, fr))
    updateMunitions(fr, MENV([f, d]))
    updateMunitionShootDown([f, d], activeProjectiles, fr, MENV([f, d]))
    tickMunitionChains(fr, MENV([f, d]))
    updateProjectiles(WORLDW, GROUND + 200)
    try { resolveProjectileHitsMulti(activeProjectiles, [f, d], [], []) } catch (_) {}
    // keep the dummy pinned (stationary) + never let it die
    d.x = 1000; d.y = GROUND - 110; d.hitstun = 0; d.knockdownState = false; d.isLaunched = false; d.vx = 0; d.vy = 0
  }
  return { cast, dmg: 100000 - d.health, frames, f }
}

console.log("\n── Super casts + runs its 3 waves + finale")
const r = runSuper()
ok("Super cast (100 Tech)", r.cast === true)
ok("Super ran to completion (state machine ended)", !r.f._gaArrowstormActive, `frames=${r.frames}`)
ok("Super ends with a 3s Tech lockout + Tech spent", (r.f._gaTechLock || 0) > 0 && r.f.energy === 0)

console.log(`\n── Super total damage vs a STATIONARY dummy = ${Math.round(r.dmg)}`)
ok("total ≈ 380 (between 320 and 420)", r.dmg >= 320 && r.dmg <= 420, `got ${Math.round(r.dmg)}`)
ok("never exceeds 420 (the hard cap)", r.dmg <= 420, `got ${Math.round(r.dmg)}`)

console.log("\n── determinism: two Supers identical")
const a = runSuper(), b = runSuper()
ok("two Supers deal identical damage (deterministic)", Math.round(a.dmg) === Math.round(b.dmg), `${Math.round(a.dmg)} vs ${Math.round(b.dmg)}`)

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW SUPER: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
