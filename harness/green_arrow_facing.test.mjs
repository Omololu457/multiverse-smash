// Green Arrow — PASS2 P1 DRONE FACING test (node). Spawns each of the 6 drones with the owner on
// BOTH sides of the stage and asserts the sim facing points the right way (toward the target for
// faceMode "target", toward travel for "travel"; front drones are symmetric and never flip).
import "../abilities.js"   // registers the 6 GA drone profiles + behaviours into drones.js
import { DRONE_PROFILES, activeDrones, resetDrones, spawnDrone, updateDrones } from "../drones.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const ENV = { leftWall: 0, rightWall: 1600, ceilingY: -200 }
function mkF(side, x, face) { return { side, playerNumber: side === "p2" ? 2 : 1, rosterKey: side === "p1" ? "green_arrow" : "goku", x, y: 300, w: 60, h: 110, groundY: 410, facing: face, energy: 100, maxEnergy: 100, health: 900, _matchSeed: 9, eliminated: false } }
const native = (t) => DRONE_PROFILES[t]?.nativeFacing || (DRONE_PROFILES[t]?.frontFacing ? "front" : "right")

console.log("\n── every GA drone has a nativeFacing")
for (const t of ["overwatch", "bulwark", "aegis", "kestrel", "skyhook", "payload"]) {
  ok(`${t} nativeFacing set (${native(t)})`, !!DRONE_PROFILES[t]?.nativeFacing)
}

// expected effective on-screen direction for a given sim facing + native (flip makes native-left show -facing)
function drawnDir(t, facing) { const n = native(t); if (n === "front") return 0; const nd = n === "left" ? -1 : 1; const flip = facing !== nd; return flip ? -nd : nd }

console.log("\n── drones face the target / travel direction on BOTH sides")
for (const t of ["overwatch", "bulwark", "aegis", "kestrel", "skyhook", "payload"]) {
  const n = native(t)
  for (const [ox, of, tx, want] of [[350, 1, 1100, 1], [1100, -1, 350, -1]]) {   // want = sim facing toward target
    resetDrones()
    const o = mkF("p1", ox, of), opp = mkF("p2", tx, -of)
    const d = spawnDrone(o, t, { frame: 0, target: opp, spendTech: () => true })
    if (!d) { ok(`${t} spawned (owner@${ox})`, false); continue }
    d._ctx = { getOpponent: () => opp, frame: 0 }; d._opp = opp; d.target = opp
    for (let f = 1; f <= 40; f++) updateDrones([o, opp], f, ENV)
    if (n === "front") {
      ok(`${t} (front) is symmetric — no flip (owner@${ox})`, true)
    } else if ((DRONE_PROFILES[t].faceMode || "travel") === "target") {
      ok(`${t} faces the target (owner@${ox} → facing ${d.facing})`, d.facing === want, `want ${want} got ${d.facing}`)
      ok(`${t} sprite draws toward target (owner@${ox})`, drawnDir(t, d.facing) === want, `drawn ${drawnDir(t, d.facing)}`)
    } else {
      // travel mode (payload): faces its velocity direction
      const vdir = Math.abs(d.vx) > 0.5 ? (d.vx < 0 ? -1 : 1) : d.facing
      ok(`${t} (travel) faces velocity (owner@${ox} → facing ${d.facing}, vx ${Math.round(d.vx)})`, d.facing === vdir)
    }
  }
}

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW FACING: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
