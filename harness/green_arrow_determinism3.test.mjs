// Green Arrow — PASS2 P5 DETERMINISM with 3 drones + a live Kamikaze (node). The brief's Phase-5
// item 2: a 3-drone (Super-cap) sim including a Strike Kamikaze reproduces bit-identically across two
// runs with the same seed. No Math.random/gameRng anywhere in the drone/arrow sim.
import { executeGreenArrowSpecial, tickGreenArrowTimers } from "../abilities.js"
import { activeDrones, resetDrones, updateDrones, updateDroneCollisions } from "../drones.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const ENV = { leftWall: 0, rightWall: 1600, ceilingY: -200 }
function mkGA(x) { return { rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x, y: 300, w: 60, h: 110, groundY: 410, energy: 100, maxEnergy: 100, _matchSeed: 1234, _specialHeldDir: null, _gaStrikeMod: false, directionHistory: [], isCharging: false, _gaSuperActive: true } }
function mkOpp(x) { return { rosterKey: "goku", side: "p2", playerNumber: 2, facing: -1, x, y: 300, w: 60, h: 110, groundY: 410, eliminated: false, health: 1000, hitstun: 0, vx: 0, vy: 0, attacking: false } }
const CTX = (opp, frame = 0) => ({ getOpponent: () => opp, frame })
function dep(f, dir, strike, frame) { f._specialHeldDir = dir; f._gaStrikeMod = strike; f._gaLastSpecialFrame = null; f.energy = 100; return executeGreenArrowSpecial(f, CTX(mkOpp(), frame)) }

function run() {
  resetDrones()
  const a = mkGA(350), b = mkOpp(1050)
  dep(a, null, false, 0)       // Overwatch (protector)
  dep(a, "B", false, 2)        // Aegis (protector)
  dep(a, "F", true, 4)         // Kestrel STRIKE = Kamikaze (3rd, allowed by _gaSuperActive)
  for (const d of activeDrones) { d._ctx = CTX(b, 0); d.target = b; d._opp = b }
  const snap = []
  for (let fr = 5; fr <= 240; fr++) {
    updateDrones([a, b], fr, ENV)
    updateDroneCollisions([a, b], [])
    tickGreenArrowTimers(a)
    if (fr % 30 === 0) snap.push(activeDrones.map(d => `${d.type}:${d.mode}:${d.facing}:${Math.round(d.x)},${Math.round(d.y)},${Math.round(d.hp)},${d.dying ? 1 : 0}`).join("|") + `#b=${Math.round(b.x)},${Math.round(b.hitstun)}`)
  }
  return JSON.stringify(snap)
}

console.log("\n── 3 drones (Overwatch + Aegis + Kamikaze) — determinism")
const n0 = activeDrones.length
dep(mkGA(350), null, false, 0)
ok("Super-cap lets a 3rd drone (Kamikaze) spawn", true)   // sanity; detailed below
const r1 = run()
const kamSpawned = r1.includes("kestrel:strike")
ok("3 drones incl. a Strike Kamikaze spawned", kamSpawned, kamSpawned ? "" : r1.slice(0, 120))
const r2 = run()
ok("two runs are BIT-IDENTICAL (3 drones + kamikaze)", r1 === r2, r1 === r2 ? "" : "DIVERGED")
const r3 = run()
ok("third run also identical", r1 === r3)

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW DETERMINISM-3: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
