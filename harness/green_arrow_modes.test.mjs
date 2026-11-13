// Green Arrow — PASS2 P2 drone MODES (node). Protector vs Strike per drone, +5 strike cost,
// Carpet Run (↑↑), Swarm (↓↓), kamikaze-killed-before-impact deals no damage, + determinism.
import { executeGreenArrowSpecial } from "../abilities.js"
import { activeDrones, resetDrones, updateDrones, updateDroneCollisions, damageDrone, DRONE_PROFILES } from "../drones.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const ENV = { leftWall: 0, rightWall: 1600, ceilingY: -200 }
function mkGA(x = 400) { return { rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x, y: 300, w: 60, h: 110, groundY: 410, energy: 100, maxEnergy: 100, _matchSeed: 3, _specialHeldDir: null, _gaStrikeMod: false, directionHistory: [], isCharging: false, invulnTimer: 0, hitstun: 0, blockstun: 0 } }
function mkOpp(x = 460) { return { rosterKey: "goku", side: "p2", playerNumber: 2, facing: -1, x, y: 300, w: 60, h: 110, groundY: 410, eliminated: false, health: 1000, maxHealth: 1000, hitstun: 0, vx: 0, vy: 0, attacking: false, currentAttack: null, isLaunched: false } }
const CTX = (opp, frame = 0) => ({ getOpponent: () => opp, frame })
function spawn(f, dir, { strike = false, dblU = false, dblD = false, frame = 10 } = {}) {
  f._specialHeldDir = dir; f._gaStrikeMod = strike; f._gaLastSpecialFrame = null
  const n = performance.now()
  f.directionHistory = dblU ? [{ dir: "U", time: n - 30 }, { dir: "U", time: n - 10 }]
    : dblD ? [{ dir: "D", time: n - 30 }, { dir: "D", time: n - 10 }] : (dir ? [{ dir: dir === "U" ? "U" : dir === "D" ? "D" : (dir === "F" ? "R" : "L"), time: n - 10 }] : [])
  const r = executeGreenArrowSpecial(f, CTX(mkOpp(), frame))
  return { r, d: activeDrones[activeDrones.length - 1] }
}

console.log("\n── strike cost (+5) + mode set")
let f = mkGA(); resetDrones(); let { d } = spawn(f, "F", { strike: true })   // kestrel strike
ok("kestrel STRIKE costs +5 (35) + mode strike", f.energy === 65 && d.mode === "strike", `e=${f.energy} mode=${d?.mode}`)
f = mkGA(); resetDrones(); ({ d } = spawn(f, "F", { strike: false }))         // kestrel protector
ok("kestrel PROTECTOR base cost (30) + mode protector", f.energy === 70 && d.mode === "protector")

console.log("\n── Carpet Run (↑↑) + Swarm (↓↓)")
f = mkGA(); resetDrones(); ({ d } = spawn(f, "U", { dblU: true }))
ok("↑↑ → Payload Carpet Run (30 Tech, 3 bombs)", d?.type === "payload" && f.energy === 70 && d.maxBombs === 3, `type=${d?.type} e=${f.energy}`)
f = mkGA(); resetDrones(); ({ d } = spawn(f, "D", { dblD: true }))
ok("↓↓ → Swarm (40 Tech)", d?.type === "swarm" && f.energy === 60, `type=${d?.type} e=${f.energy}`)

console.log("\n── STRIKE behaviours land their hit")
function runStrike(dir) {
  resetDrones(); const o = mkGA(400), opp = mkOpp(470)
  o._specialHeldDir = dir; o._gaStrikeMod = true; o._gaLastSpecialFrame = null
  executeGreenArrowSpecial(o, CTX(opp, 0))
  const dr = activeDrones[activeDrones.length - 1]; dr._ctx = CTX(opp, 0); dr.target = opp; dr._opp = opp
  let hit = false
  for (let fr = 1; fr <= 120; fr++) { updateDrones([o, opp], fr, ENV); if (opp.hitstun > 0) hit = true; if (!activeDrones.length) break }
  return { opp, hit, dr }
}
let s = runStrike("F"); ok("Kamikaze (kestrel strike) connects + drone consumed", s.hit && !activeDrones.some(x => x.type === "kestrel" && !x.dying))
s = runStrike("D"); ok("Mine (bulwark strike) detonates on proximity", s.hit)
s = runStrike(null); ok("Stun Drone (overwatch strike) rams + stuns", s.hit)
s = runStrike("B"); ok("Shield Bash (aegis strike) connects", s.hit)

console.log("\n── kamikaze KILLED before impact deals NO damage (plays DEATH only)")
resetDrones()
let o = mkGA(400), opp = mkOpp(900)   // far, so it must travel
o._specialHeldDir = "F"; o._gaStrikeMod = true; o._gaLastSpecialFrame = null
executeGreenArrowSpecial(o, CTX(opp, 0))
let kam = activeDrones[activeDrones.length - 1]; kam._ctx = CTX(opp, 0); kam.target = opp; kam._opp = opp
updateDrones([o, opp], 1, ENV)
damageDrone(kam, 999, opp)            // shot down in flight
const oppHpAfter = opp.hitstun
for (let fr = 2; fr <= 60; fr++) updateDrones([o, opp], fr, ENV)
ok("shot-down kamikaze dealt no hitstun (DEATH only)", opp.hitstun === oppHpAfter && opp.hitstun === 0, `hitstun=${opp.hitstun}`)

console.log("\n── PROTECTOR behaviours")
resetDrones(); o = mkGA(400); opp = mkOpp(470); opp.attacking = true; opp.currentAttack = { damage: 50 }
o._specialHeldDir = "B"; o._gaStrikeMod = false; o._gaLastSpecialFrame = null
executeGreenArrowSpecial(o, CTX(opp, 0)); let aeg = activeDrones[0]; aeg._ctx = CTX(opp, 0); aeg.target = opp
for (let fr = 1; fr <= 30; fr++) updateDrones([o, opp], fr, ENV)
ok("Guardian (aegis protector) intercepts a melee hit (Oliver invuln + drone -40)", (o.invulnTimer || 0) > 0 && aeg.hp <= 110, `invuln=${o.invulnTimer} hp=${aeg.hp}`)

console.log("\n── determinism: modes sim bit-identical")
function run() {
  resetDrones(); const a = mkGA(350), b = mkOpp(900)
  a._specialHeldDir = "F"; a._gaStrikeMod = true; a._gaLastSpecialFrame = null
  executeGreenArrowSpecial(a, CTX(b, 0)); const k = activeDrones[0]; k._ctx = CTX(b, 0); k.target = b
  a.energy = 100; a._specialHeldDir = "D"; a._gaStrikeMod = false; a._gaLastSpecialFrame = null
  executeGreenArrowSpecial(a, CTX(b, 2))
  const snap = []
  for (let fr = 3; fr <= 150; fr++) { updateDrones([a, b], fr, ENV); updateDroneCollisions([a, b], []); if (fr % 30 === 0) snap.push(activeDrones.map(x => `${x.type}:${x.mode}:${Math.round(x.x)},${Math.round(x.hp)}`).join("|")) }
  return JSON.stringify(snap)
}
ok("two runs bit-identical", run() === run())

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW MODES: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
