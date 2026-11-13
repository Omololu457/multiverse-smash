// Green Arrow — PASS3 P3 drones use the bombs (node). Bulwark Mortar, Kestrel Bombing Run, Skyhook
// Airdrop, Swarm micro-bombs, Carpet Run munitions, fire→napalm / emp→disable, guided→tagged.
import { executeGreenArrowSpecial } from "../abilities.js"
import { activeDrones, resetDrones, updateDrones } from "../drones.js"
import { activeMunitions, activeFirePatches, resetMunitions, spawnMunition, updateMunitions, updateMunitionArrowInteract } from "../munitions.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const ENV = { leftWall: 0, rightWall: 1600, ceilingY: -200 }
const MENV = (figs) => ({ groundY: 410, leftWall: 0, rightWall: 1600, fighters: figs, isEnemy: (o, f) => f && o && f.side !== o.side, platformTopAt: () => null })
function mkGA(x = 400) { return { rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x, y: 300, w: 60, h: 110, groundY: 410, energy: 100, maxEnergy: 100, _matchSeed: 7, _specialHeldDir: null, _gaStrikeMod: false, _gaSuperActive: true, directionHistory: [], isCharging: false } }
function mkOpp(x = 470) { return { rosterKey: "goku", side: "p2", playerNumber: 2, facing: -1, x, y: 300, w: 60, h: 110, groundY: 410, eliminated: false, health: 100000, maxHealth: 100000, defense: 80, hitstun: 0, vx: 0, vy: 0, _gaTagged: 0 } }
const CTX = (opp, frame = 0) => ({ getOpponent: () => opp, frame })
function spawnDroneViaSpecial(f, dir, { strike = false, dblU = false, dblD = false } = {}) {
  f._specialHeldDir = dir; f._gaStrikeMod = strike; f._gaLastSpecialFrame = null; f.energy = 100
  const n = performance.now()
  f.directionHistory = dblU ? [{ dir: "U", time: n - 30 }, { dir: "U", time: n - 10 }] : dblD ? [{ dir: "D", time: n - 30 }, { dir: "D", time: n - 10 }] : (dir ? [{ dir: dir === "F" ? "R" : dir === "B" ? "L" : dir, time: n - 10 }] : [])
  executeGreenArrowSpecial(f, CTX(mkOpp(), 0))
  const d = activeDrones[activeDrones.length - 1]; if (d) { d._ctx = CTX(mkOpp(), 0) }
  return d
}
function runDroneDropsMunition(dir, opts, maxFrames = 200) {
  resetDrones(); resetMunitions()
  const f = mkGA(400), opp = mkOpp(470)
  f._specialHeldDir = dir.dir; f._gaStrikeMod = !!opts.strike; f._gaLastSpecialFrame = null; f.energy = 100
  const n = performance.now()
  f.directionHistory = dir.dblU ? [{ dir: "U", time: n - 30 }, { dir: "U", time: n - 10 }] : dir.dblD ? [{ dir: "D", time: n - 30 }, { dir: "D", time: n - 10 }] : (dir.dir ? [{ dir: dir.dir === "F" ? "R" : dir.dir === "B" ? "L" : dir.dir, time: n - 10 }] : [])
  executeGreenArrowSpecial(f, CTX(opp, 0))
  const d = activeDrones[activeDrones.length - 1]; if (d) { d._ctx = CTX(opp, 0); d.target = opp; d._opp = opp }
  let maxMun = 0
  for (let fr = 1; fr <= maxFrames; fr++) { updateDrones([f, opp], fr, ENV); if (activeMunitions.length > maxMun) maxMun = activeMunitions.length }
  return { maxMun, d }
}

console.log("\n── drones drop munitions")
ok("Bulwark Bodyguard lobs a MORTAR munition", runDroneDropsMunition({ dir: "D" }, {}).maxMun >= 1)
ok("Skyhook Tow AIRDROPS a bomb", runDroneDropsMunition({ dir: "U" }, { strike: true }).maxMun >= 1)
ok("Swarm rammers drop micro-bombs", runDroneDropsMunition({ dir: "D", dblD: true }, { strike: true }).maxMun >= 1)
ok("Payload Carpet Run drops munitions", runDroneDropsMunition({ dir: "U", dblU: true }, {}).maxMun >= 1)

console.log("\n── fire arrow → NAPALM / EMP arrow → disable")
resetMunitions()
let o = mkGA(400), opp = mkOpp(470)
spawnMunition(o, "dumb", { x: 600, y: 300 })
updateMunitionArrowInteract([{ _gaArrow: "fire", owner: o, x: 600, y: 300, w: 20, h: 12 }], MENV([o, opp]))
ok("fire arrow on a bomb → detonates it + leaves a NAPALM patch", activeFirePatches.length >= 1 && activeMunitions.length === 0)
resetMunitions()
spawnMunition(o, "dumb", { x: 600, y: 300 })
updateMunitionArrowInteract([{ _gaArrow: "emp", owner: o, x: 600, y: 300, w: 20, h: 12 }], MENV([o, opp]))
ok("EMP arrow on a bomb → disabled (no explosion)", activeMunitions.length === 0 && activeFirePatches.length === 0)

console.log("\n── OVERWATCH TAG: a guided bomb with no target locks onto the tagged foe")
resetMunitions()
o = mkGA(400); const tagged = mkOpp(900); tagged._gaTagged = 300
const gm = spawnMunition(o, "guided", { x: 450, y: 150, vx: 9, vy: 0 })   // no explicit target
for (let fr = 1; fr <= 20; fr++) updateMunitions(fr, MENV([o, tagged]))
ok("guided bomb acquired the tagged foe as its target", gm.target === tagged)

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW DRONE-BOMBS: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
