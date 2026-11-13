// Green Arrow — PASS3 P4 targeting + orders + counter-summon (node).
import { updateGreenArrowCommandCombat } from "../abilities.js"
import { activeDrones, resetDrones, spawnDrone, updateDrones, pickDroneTarget, cycleDroneOrder, droneOrder, updateDroneCounterSummon } from "../drones.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
function mkF(side, x, team) { return { side, playerNumber: side === "p2" ? 2 : (side === "p3" ? 3 : 1), x, y: 300, w: 60, h: 110, groundY: 410, health: 900, team, eliminated: false, _gaTagged: 0 } }
const ENV = { leftWall: 0, rightWall: 1600, ceilingY: -200 }

console.log("\n── target priority: TAGGED > nearest; never a teammate")
resetDrones()
const o = mkF("p1", 400), near = mkF("p2", 500), far = mkF("p3", 1200)
const d = spawnDrone(o, "kestrel", { frame: 0, target: near, spendTech: () => true })
const env3 = { fighters: [o, near, far], isEnemy: (ow, f) => f && ow && f !== ow && f.side !== ow.side }
pickDroneTarget(d, env3)
ok("no tag → nearest enemy", d.target === near, `got ${d.target?.side}`)
far._gaTagged = 300
for (let i = 0; i < 12; i++) pickDroneTarget(d, env3)   // hysteresis debounce
ok("TAGGED enemy takes priority over nearest", d.target === far)
// teammate never targeted
const ally = mkF("p3", 420, "A"); o.team = "A"
const env4 = { fighters: [o, ally, near], isEnemy: (ow, f) => f && ow && f !== ow && !(ow.team && f.team && ow.team === f.team) }
const d2 = spawnDrone(o, "bulwark", { frame: 0, target: near, spendTech: () => true }); d2.target = null
for (let i = 0; i < 12; i++) pickDroneTarget(d2, env4)
ok("never targets a teammate (same team)", d2.target !== ally && d2.target === near)

console.log("\n── orders cycle focus → guard → sweep")
resetDrones(); const f = mkF("p1", 400)
ok("default order = focus", droneOrder(f) === "focus")
cycleDroneOrder(f); ok("cycle → guard", droneOrder(f) === "guard")
cycleDroneOrder(f); ok("cycle → sweep", droneOrder(f) === "sweep")
cycleDroneOrder(f); ok("wraps → focus", droneOrder(f) === "focus")

console.log("\n── ↓↓+Light cycles the order (input)")
const gf = { rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x: 400, y: 300, w: 60, h: 110, groundY: 410, onGround: true, grounded: true, energy: 100, attacking: false, currentMove: null, attackCooldown: 0, directionHistory: [{ dir: "D", time: performance.now() - 20 }, { dir: "D", time: performance.now() - 8 }] }
const r = updateGreenArrowCommandCombat(gf, { light: true }, { getOpponent: () => null, frame: 0 })
ok("↓↓+Light cycled the order (focus→guard)", r === true && droneOrder(gf) === "guard")

console.log("\n── GUARD order holds a drone near Oliver (no chasing)")
resetDrones(); const ow = mkF("p1", 400), foe = mkF("p2", 1200); ow._gaOrder = "guard"
const kam = spawnDrone(ow, "kestrel", { frame: 0, target: foe, mode: "strike", spendTech: () => true }); kam._ctx = { getOpponent: () => foe }; kam.target = foe
for (let fr = 1; fr <= 40; fr++) updateDrones([ow, foe], fr, { ...ENV })
ok("GUARD: strike drone held near Oliver (didn't dive to the far foe)", Math.abs(kam.x - ow.x) < 400, `dx=${Math.round(kam.x - ow.x)}`)

console.log("\n── counter-summon: Bulwark shoots down a small enemy projectile near Oliver")
resetDrones(); const owner = mkF("p1", 400), enemy = mkF("p2", 900)
const bw = spawnDrone(owner, "bulwark", { frame: 0, target: enemy, spendTech: () => true }); bw.data._csCd = 0
const smallProj = { owner: enemy, x: 450, y: 300, w: 16, name: "kunai", lifetime: 100, isUltimate: false, visualOnly: false }
const beam = { owner: enemy, x: 460, y: 300, w: 120, name: "kamehameha_beam", lifetime: 100, isUltimate: true, visualOnly: false }
const cenv = { isEnemy: (o, x) => x && o && x.side !== o.side, screenW: 1280 }
updateDroneCounterSummon([smallProj, beam], 1, cenv)
ok("small enemy projectile within 25% is shot down", smallProj.lifetime <= 1)
ok("a beam/super is NEVER shot down", beam.lifetime === 100)

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW ORDERS: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
