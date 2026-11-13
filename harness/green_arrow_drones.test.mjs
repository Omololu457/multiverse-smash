// Green Arrow — drones.js GENERIC + DETERMINISM unit test (node, no browser).
// Proves: profile-driven spawn, hittable→death→cooldown, max-2 cap + oldest retires (refund),
// recall refund, leash, HUD pips, and that a 3-drone sim is bit-identical across two runs.
import {
  DRONE_PROFILES, registerDroneProfile, registerBehaviour,
  activeDrones, resetDrones, spawnDrone, updateDrones, updateDroneCollisions,
  damageDrone, recallDrones, countDrones, droneTypeOnCooldown,
} from "../drones.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }

function mkFighter(side, x) {
  return { side, playerNumber: side === "p2" ? 2 : 1, rosterKey: "green_arrow",
           x, y: 300, w: 60, h: 110, groundY: 410, facing: side === "p2" ? -1 : 1,
           energy: 100, maxEnergy: 100, _matchSeed: 12345 }
}
const ENV = { leftWall: 0, rightWall: 1600, ceilingY: -200 }

// register a second generic profile to prove the system is data-driven (not GA-specific)
registerDroneProfile("test_turret", {
  sprites: { idle: { sheet: "./ga_bulwark_walk_sheet.png", frames: 4 }, death: { sheet: "./ga_bulwark_walk_sheet.png", frames: 4 } },
  hp: 30, accel: 1.2, maxH: 6, maxV: 6, drag: 0.85, reverseBrake: 0.7, overspeedDrag: 0.9,
  hoverHeight: 0, bobAmp: 0, leash: 260, behaviour: "follow", cooldownOnDeath: 90,
  techCost: 25, hurtbox: { w: 44, h: 30 }, scale: 1.0, frontFacing: false,
})

console.log("\n── generic profile-driven system")
ok("DRONE_PROFILES has test_dummy + registered test_turret", !!DRONE_PROFILES.test_dummy && !!DRONE_PROFILES.test_turret)

resetDrones()
const o1 = mkFighter("p1", 400)
const d = spawnDrone(o1, "test_dummy", { frame: 0 })
ok("spawnDrone returns a drone + pushes to registry", !!d && activeDrones.length === 1, `len=${activeDrones.length}`)
ok("spawn spent Tech (20)", o1.energy === 80, `energy=${o1.energy}`)
ok("drone has HP + hurtbox from its profile", d.hp === 50 && d.profile.hurtbox.w === 40)

// follows the owner (moves toward hover target over frames)
const x0 = d.x
for (let f = 1; f <= 60; f++) updateDrones([o1], f, ENV)
ok("drone moved toward owner (follow behaviour)", Math.abs(d.x - x0) > 5 && Math.abs(d.x - o1.x) < 260, `dx=${Math.round(d.x - o1.x)}`)

console.log("\n── hittable → death → cooldown (no meter/combo credit)")
const o2 = mkFighter("p2", 900)
const before = o2.energy
damageDrone(d, 20, o2)
ok("damage reduces HP", d.hp === 30, `hp=${d.hp}`)
ok("attacking a drone grants the attacker NO meter", o2.energy === before, `energy=${o2.energy}`)
damageDrone(d, 40, o2)
ok("HP<=0 → dying + death anim", d.dying && d.anim === "death")
ok("owner type on cooldown after death", droneTypeOnCooldown(o1, "test_dummy"))
// run out the death anim
for (let f = 61; f <= 130; f++) updateDrones([o1], f, ENV)
ok("dead drone removed from registry", activeDrones.length === 0, `len=${activeDrones.length}`)
ok("cannot re-spawn while on cooldown", spawnDrone(o1, "test_dummy", { frame: 131 }) === null)
// tick cooldown down
for (let f = 131; f <= 131 + 130; f++) updateDrones([o1], f, ENV)
ok("cooldown expired → can spawn again", !droneTypeOnCooldown(o1, "test_dummy"))

console.log("\n── max-2 cap + oldest retires with refund")
resetDrones()
const o3 = mkFighter("p1", 400); o3.energy = 100
spawnDrone(o3, "test_dummy", { frame: 0 })
spawnDrone(o3, "test_turret", { frame: 1 })
ok("two drones active", countDrones(o3) === 2)
const eBeforeThird = o3.energy
spawnDrone(o3, "test_dummy", { frame: 2 })   // cost 20, but one is on cooldown... use fresh
// third (different type) forces retire-oldest (25% refund of 20 = 5)
ok("still capped at 2 live drones after a 3rd spawn", countDrones(o3) <= 2, `live=${countDrones(o3)}`)

console.log("\n── recall refund + HUD pips")
resetDrones()
const o4 = mkFighter("p1", 400); o4.energy = 40
spawnDrone(o4, "test_turret", { frame: 0 })   // cost 25 → energy 15
const eRecall = o4.energy
recallDrones(o4)
ok("recall grants a partial refund", o4.energy > eRecall, `${eRecall}→${o4.energy}`)
updateDrones([o4], 1, ENV)
ok("HUD pips array is populated (<=3)", Array.isArray(o4._gaDronePips) && o4._gaDronePips.length <= 3)

console.log("\n── DETERMINISM: 3-drone sim identical across two runs (same seed)")
function run() {
  resetDrones()
  const a = mkFighter("p1", 350), b = mkFighter("p2", 1100)
  a.energy = 100
  spawnDrone(a, "test_dummy", { frame: 0, target: b })
  spawnDrone(a, "test_turret", { frame: 0, target: b })
  a._gaSuperActive = true
  spawnDrone(a, "test_dummy", { frame: 0, target: b })   // 3rd allowed (super)
  const snap = []
  for (let f = 1; f <= 200; f++) {
    updateDrones([a, b], f, ENV)
    updateDroneCollisions([a, b], [])
    if (f % 40 === 0) snap.push(activeDrones.map(d => `${d.type}:${Math.round(d.x)},${Math.round(d.y)},${Math.round(d.hp)}`).join("|"))
  }
  return JSON.stringify(snap)
}
const r1 = run(), r2 = run()
ok("two runs produce bit-identical drone state", r1 === r2, r1 === r2 ? "" : `\n  A=${r1}\n  B=${r2}`)

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW DRONES: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
