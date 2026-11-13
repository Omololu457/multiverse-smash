// Green Arrow — PASS2 P3 Quiver + new arrows (node). Quiver cycle/fire, Net/Flash/Beacon/Grapple
// costs + tags, forceGround (anti-flight), beacon drop, grapple pull, net→Skyhook synergy.
import { updateGreenArrowCommandCombat, tickGreenArrowTimers, greenArrowQuiverSel, greenArrowCycleQuiver, fireGAQuiver, activeProjectiles } from "../abilities.js"
import { forceGround, ensureFlightState, FLIGHT_PROFILES } from "../flight.js"
import { activeDrones, resetDrones, spawnDrone, updateDrones } from "../drones.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const ENV = { leftWall: 0, rightWall: 1600, ceilingY: -200 }
function mkGA(x = 400) { return { rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x, y: 300, w: 60, h: 110, groundY: 410, onGround: true, grounded: true, energy: 100, maxEnergy: 100, _matchSeed: 4, directionHistory: [], attacking: false, currentMove: null, attackCooldown: 0, invulnTimer: 0, vx: 0, vy: 0, _gaQuiver: 0 } }
function mkOpp(x = 1000) { return { rosterKey: "goku", side: "p2", playerNumber: 2, facing: -1, x, y: 300, w: 60, h: 110, groundY: 410, eliminated: false, health: 1000, hitstun: 0 } }
const CTX = (opp) => ({ getOpponent: () => opp, frame: 0 })
function clearP() { activeProjectiles.length = 0 }
const n = () => performance.now()

console.log("\n── quiver cycle + selection")
let f = mkGA()
ok("default quiver = net", greenArrowQuiverSel(f) === "net")
greenArrowCycleQuiver(f); ok("cycle → flash", greenArrowQuiverSel(f) === "flash")
greenArrowCycleQuiver(f); greenArrowCycleQuiver(f); ok("cycle → grapple", greenArrowQuiverSel(f) === "grapple")
greenArrowCycleQuiver(f); ok("wraps → net", greenArrowQuiverSel(f) === "net")

console.log("\n── quiver inputs (↓↓+Up cycle, ↓↙←+Up fire)")
f = mkGA(); f.directionHistory = [{ dir: "D", time: n() - 20 }, { dir: "D", time: n() - 8 }]   // dd
let r = updateGreenArrowCommandCombat(f, { upAttack: true }, CTX(mkOpp()))
ok("↓↓+Up cycles quiver (net→flash)", r === true && greenArrowQuiverSel(f) === "flash")
f = mkGA(); clearP(); f.directionHistory = [{ dir: "D", time: n() - 20 }, { dir: "L", time: n() - 8 }]   // qcb
r = updateGreenArrowCommandCombat(f, { upAttack: true }, CTX(mkOpp()))
ok("↓↙←+Up fires selected (net) → spends 20 + net projectile", r === true && f.energy === 80 && activeProjectiles[0]?._gaArrow === "net", `e=${f.energy} kind=${activeProjectiles[0]?._gaArrow}`)

console.log("\n── each new arrow: cost + tag + cooldown")
for (const [sel, cost, kind, cd] of [["net", 20, "net", "_gaNetCd"], ["flash", 12, "flash", null], ["beacon", 15, "beacon", null], ["grapple", 10, "grapple", "_gaGrappleCd"]]) {
  f = mkGA(); clearP(); f._gaQuiver = ["net", "flash", "beacon", "grapple"].indexOf(sel)
  r = fireGAQuiver(f, CTX(mkOpp()))
  const okc = r === true && f.energy === (100 - cost) && activeProjectiles[0]?._gaArrow === kind && (!cd || (f[cd] || 0) > 0)
  ok(`${sel}: ${cost} Tech + kind ${kind}${cd ? " + cd" : ""}`, okc, `e=${f.energy} kind=${activeProjectiles[0]?._gaArrow}`)
}

console.log("\n── forceGround (Net counters flight)")
const flier = { rosterKey: "homelander", x: 500, y: 100, w: 60, h: 110, groundY: 410, traits: { flightProfile: "homelander" }, vy: -5 }
ensureFlightState(flier); flier._flightCtl.phase = "flying"
const grounded = forceGround(flier, 72)
ok("forceGround grounds a flyer + sets lock", grounded === true && flier._flightCtl.phase === "grounded" && (flier._forceGroundTimer || 0) > 0)
const nonFlier = { rosterKey: "goku", x: 500, y: 300 }
ok("forceGround is a no-op for a non-flyer (no frame-data touch)", forceGround(nonFlier, 72) === false)

console.log("\n── Beacon drops a drone after 20f; Grapple pulls Oliver")
resetDrones(); f = mkGA(400); clearP()
f._gaQuiver = 2; fireGAQuiver(f, CTX(mkOpp()))   // beacon
for (let i = 0; i < 22; i++) tickGreenArrowTimers(f)
ok("Beacon drops a drone at the beacon spot after 20f", activeDrones.length >= 1 && Math.abs(activeDrones[0].x - 650) < 40, `drones=${activeDrones.length} x=${activeDrones[0]?.x}`)
resetDrones(); f = mkGA(400); clearP(); const opp = mkOpp(1000)
f._gaQuiver = 3; fireGAQuiver(f, CTX(opp))        // grapple (anchor ≈ opp.x - 70 = 930)
const x0 = f.x; for (let i = 0; i < 30; i++) tickGreenArrowTimers(f)
ok("Grapple pulls Oliver toward the anchor", f.x > x0 + 100, `x ${x0}→${Math.round(f.x)}`)

console.log("\n── Net → Skyhook synergy (hook from anywhere)")
resetDrones(); f = mkGA(400); const o2 = mkOpp(1100)
const sky = spawnDrone(f, "skyhook", { frame: 0, target: o2, mode: "strike", spendTech: () => true }); sky._ctx = CTX(o2); sky.target = o2
f._gaNetHit = o2
tickGreenArrowTimers(f)
ok("netted foe → Skyhook enters hookEnemy from anywhere", sky.state === "hookEnemy" && o2._gaHooked === true, `state=${sky.state}`)

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW NEW ARROWS: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
