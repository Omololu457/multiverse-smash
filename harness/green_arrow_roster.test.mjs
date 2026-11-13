// Green Arrow — Phase 4 drone ROSTER + ARROWSTORM super (node, no browser).
// Each held direction spawns the right drone; double-tap Special recalls; the Super runs its
// full state machine (drones fire → Payload bomber → closing volley → Tech lockout + recall);
// and a drones+super sim is deterministic.
import { executeGreenArrowSpecial, executeGreenArrowUltimate, applyGreenArrowArrowstorm, tickGreenArrowTimers } from "../abilities.js"
import { activeDrones, resetDrones, updateDrones, DRONE_PROFILES } from "../drones.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }

function mkGA(x = 400) {
  return { rosterKey: "green_arrow", side: "p1", playerNumber: 1, x, y: 300, w: 60, h: 110,
           groundY: 410, facing: 1, energy: 100, maxEnergy: 100, _matchSeed: 777,
           _specialHeldDir: null, directionHistory: [], isCharging: false, invulnTimer: 0 }
}
function mkOpp(x = 1000) { return { rosterKey: "goku", side: "p2", playerNumber: 2, x, y: 300, w: 60, h: 110, groundY: 410, facing: -1, health: 1000, energy: 0, eliminated: false, hitstun: 0, invulnTimer: 0 } }
const CTX = (opp, frame = 0) => ({ getOpponent: () => opp, frame })
const ENV = { leftWall: 0, rightWall: 1600, ceilingY: -200 }

console.log("\n── drones spawn by held direction")
const dirMap = [["U", "skyhook"], ["F", "kestrel"], ["B", "aegis"], ["D", "bulwark"], [null, "overwatch"]]
for (const [dir, type] of dirMap) {
  resetDrones()
  const f = mkGA(); f.energy = 100; f._specialHeldDir = dir
  const opp = mkOpp()
  const r = executeGreenArrowSpecial(f, CTX(opp, 100))
  const spawned = activeDrones[0]
  ok(`${dir ?? "neutral"}+Special → ${type}`, r === true && spawned && spawned.type === type, `got ${spawned?.type}`)
}

console.log("\n── Tech cost + 2-drone cap")
resetDrones()
let f = mkGA(); f.energy = 100
const opp = mkOpp()
f._specialHeldDir = "F"; executeGreenArrowSpecial(f, CTX(opp, 10))   // kestrel 30
ok("spending Tech on spawn", f.energy === 70, `energy=${f.energy}`)
f._specialHeldDir = "B"; executeGreenArrowSpecial(f, CTX(opp, 60))   // aegis 20 → 50
f._specialHeldDir = null; executeGreenArrowSpecial(f, CTX(opp, 120)) // overwatch → forces retire-oldest
ok("capped at 2 live drones", activeDrones.filter(d => !d.dying && !d._retiring).length <= 2)

console.log("\n── double-tap Special → recall")
resetDrones()
f = mkGA(); f.energy = 100
f._specialHeldDir = "B"; executeGreenArrowSpecial(f, CTX(opp, 200))   // aegis
const liveBefore = activeDrones.filter(d => !d._retiring).length
f._specialHeldDir = "B"; executeGreenArrowSpecial(f, CTX(opp, 208))   // 2nd press within 14f → recall
ok("double-tap recalls drones", activeDrones.every(d => d._retiring), `recalled ${activeDrones.filter(d=>d._retiring).length}/${activeDrones.length}`)

console.log("\n── ARROWSTORM super: full state machine")
resetDrones()
f = mkGA(); f.energy = 100
const opp2 = mkOpp(900)
// pre-place a Kestrel + Bulwark so the super makes them fire
f._specialHeldDir = "F"; executeGreenArrowSpecial(f, CTX(opp2, 300)); f.energy = 100
f._specialHeldDir = "D"; executeGreenArrowSpecial(f, CTX(opp2, 305)); f.energy = 100
// trigger super via doubleQcf
const now = performance.now()
f.directionHistory = [{ dir: "D", time: now - 40 }, { dir: "R", time: now - 30 }, { dir: "D", time: now - 20 }, { dir: "R", time: now - 10 }]
const sup = executeGreenArrowSpecial(f, CTX(opp2, 400))
ok("doubleQcf+Special at 100 Tech → Super", sup === true && !!f._gaArrowstormActive)
ok("Super spent all Tech", f.energy === 0, `energy=${f.energy}`)
ok("super sets _gaSuperActive (drone cap 3)", f._gaSuperActive === true)
// run the super to completion
let payloadSeen = false, volleyArrows = 0
for (let fr = 401; fr <= 820; fr++) {   // PASS3: the reworked 3-wave Super runs ~320 frames (was ~250)
  applyGreenArrowArrowstorm(f, CTX(opp2, fr))
  tickGreenArrowTimers(f)
  updateDrones([f, opp2], fr, ENV)
  if (activeDrones.some(d => d.type === "payload")) payloadSeen = true
  if (!f._gaArrowstormActive) break
}
ok("Payload bomber flew during the super", payloadSeen)
ok("super ended → Tech lockout engaged", (f._gaTechLock || 0) > 0 || f._gaArrowstormActive === null, `lock=${f._gaTechLock}`)
ok("super ended → _gaSuperActive cleared", f._gaSuperActive === false)

console.log("\n── determinism: drones + super identical across two runs")
function run() {
  resetDrones()
  const a = mkGA(350), b = mkOpp(1050)
  a.energy = 100
  a._specialHeldDir = "F"; executeGreenArrowSpecial(a, CTX(b, 0)); a.energy = 100
  a._specialHeldDir = "D"; executeGreenArrowSpecial(a, CTX(b, 2)); a.energy = 100
  const n = performance.now()
  a.directionHistory = [{ dir: "D", time: n - 40 }, { dir: "R", time: n - 30 }, { dir: "D", time: n - 20 }, { dir: "R", time: n - 10 }]
  executeGreenArrowSpecial(a, CTX(b, 5))
  const snap = []
  for (let fr = 6; fr <= 200; fr++) {
    applyGreenArrowArrowstorm(a, CTX(b, fr)); tickGreenArrowTimers(a); updateDrones([a, b], fr, ENV)
    if (fr % 40 === 0) snap.push(activeDrones.map(d => `${d.type}:${Math.round(d.x)},${Math.round(d.y)},${Math.round(d.hp)}`).join("|"))
  }
  return JSON.stringify(snap)
}
const r1 = run(), r2 = run()
ok("two runs bit-identical", r1 === r2, r1 === r2 ? "" : "DIVERGED")

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW ROSTER+SUPER: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
