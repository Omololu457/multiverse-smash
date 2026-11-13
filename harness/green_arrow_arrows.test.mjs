// Green Arrow — Phase 5 trick-arrow moveset (node). Verifies the motion+attack-button
// interception maps to the right arrows, Tech costs/cooldowns, the capped Tech hit-income,
// and that a bare button falls through to the normal.
import { updateGreenArrowCommandCombat, tickGreenArrowTimers, activeProjectiles } from "../abilities.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }

function mkGA() {
  return { rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x: 400, y: 300, w: 60, h: 110,
           groundY: 410, onGround: true, grounded: true, energy: 100, maxEnergy: 100, _matchSeed: 5,
           attacking: false, currentMove: null, attackCooldown: 0, directionHistory: [], invulnTimer: 0 }
}
const CTX = (opp) => ({ getOpponent: () => opp, frame: 0 })
const OPP = { rosterKey: "goku", side: "p2", x: 1000, y: 300, w: 60, h: 110, groundY: 410, eliminated: false, energy: 100, maxEnergy: 100 }
function qcf(f) { const n = performance.now(); f.directionHistory = [{ dir: "D", time: n - 20 }, { dir: "R", time: n - 8 }] }   // facing 1 → R = forward
function qcb(f) { const n = performance.now(); f.directionHistory = [{ dir: "D", time: n - 20 }, { dir: "L", time: n - 8 }] }
function dd(f) { const n = performance.now(); f.directionHistory = [{ dir: "D", time: n - 20 }, { dir: "D", time: n - 8 }] }
function clearProj() { activeProjectiles.length = 0 }

console.log("\n── motion + attack button → arrows")
// fire arrow: qcf + Heavy
let f = mkGA(); clearProj(); qcf(f)
let r = updateGreenArrowCommandCombat(f, { heavy: true }, CTX(OPP))
ok("qcf+Heavy → fire arrow (consumed, spent 15 Tech, spawned)", r === true && f.energy === 85 && activeProjectiles.length === 1, `e=${f.energy} proj=${activeProjectiles.length}`)
ok("fire arrow carries a burn dot", activeProjectiles[0]?.dot && activeProjectiles[0].dot.dmg === 3)

// ice arrow: qcb + Light
f = mkGA(); clearProj(); qcb(f)
r = updateGreenArrowCommandCombat(f, { light: true }, CTX(OPP))
ok("qcb+Light → ice arrow (spent 20, cooldown set)", r === true && f.energy === 80 && (f._gaIceCd || 0) > 0)
ok("ice arrow tagged _gaArrow=ice (combat.js freezes on hit)", activeProjectiles[0]?._gaArrow === "ice")

// EMP: qcb + Heavy
f = mkGA(); clearProj(); qcb(f)
r = updateGreenArrowCommandCombat(f, { heavy: true }, CTX(OPP))
ok("qcb+Heavy → EMP arrow (spent 20, 10s cd)", r === true && f.energy === 80 && (f._gaEmpCd || 0) > 0 && activeProjectiles[0]?._gaArrow === "emp")

// explosive: dd + Heavy
f = mkGA(); clearProj(); dd(f)
r = updateGreenArrowCommandCombat(f, { heavy: true }, CTX(OPP))
ok("↓↓+Heavy → explosive arrow (spent 25)", r === true && f.energy === 75 && activeProjectiles.length === 1)

// bow slash: →+Heavy (no motion)
f = mkGA(); clearProj(); f.directionHistory = []
r = updateGreenArrowCommandCombat(f, { heavy: true, right: true }, CTX(OPP))
ok("→+Heavy → bow slash (melee, consumed)", r === true && f.attacking === true && activeProjectiles.length === 0)

// DESIGN: bare Light (no motion) now fires a PLAIN ARROW directly (archer basic — L is an arrow, not a melee)
f = mkGA(); clearProj(); f.directionHistory = []
r = updateGreenArrowCommandCombat(f, { light: true }, CTX(OPP))
ok("bare Light (no motion) → fires a plain arrow", r === true && activeProjectiles.length === 1)
// bare Heavy (no motion) → fire arrow (spends 15; falls back to a piercing plain shot when out of Tech)
f = mkGA(); clearProj(); f.directionHistory = []; f.energy = 100
r = updateGreenArrowCommandCombat(f, { heavy: true }, CTX(OPP))
ok("bare Heavy (no motion) → fires a fire arrow (spent 15)", r === true && f.energy === 85 && activeProjectiles.length === 1)

console.log("\n── charged plain shot (qcf+Light hold → release)")
f = mkGA(); clearProj(); qcf(f)
r = updateGreenArrowCommandCombat(f, { light: true }, CTX(OPP))   // edge → start charge
ok("qcf+Light starts a charge (no shot yet)", r === true && f._gaCharging === true && activeProjectiles.length === 0)
for (let i = 0; i < 42; i++) updateGreenArrowCommandCombat(f, { light: true }, CTX(OPP))   // hold 42f
r = updateGreenArrowCommandCombat(f, { light: false }, CTX(OPP))  // release
ok("release after >=40f → piercing charged shot (70, piercing)", activeProjectiles.length === 1 && activeProjectiles[0].damage === 70 && activeProjectiles[0].piercesMulti === true, `dmg=${activeProjectiles[0]?.damage}`)

console.log("\n── Tech hit-income capped at +12/s")
f = mkGA(); f.energy = 0
for (let hit = 0; hit < 5; hit++) { f._gaArrowHit = true; tickGreenArrowTimers(f) }   // 5 arrow hits in one second (+4 each, cap 12)
ok("arrow hit-income capped at +12 within one second", f.energy === 12, `energy=${f.energy}`)
for (let i = 0; i < 60; i++) tickGreenArrowTimers(f)   // next second
f._gaArrowHit = true; tickGreenArrowTimers(f)
ok("budget refreshes next second (+4)", f.energy === 16, `energy=${f.energy}`)
f._gaDroneHit = true; tickGreenArrowTimers(f)
ok("drone hit grants +2", f.energy === 18, `energy=${f.energy}`)

console.log("\n── ice cooldown blocks re-fire")
f = mkGA(); clearProj(); qcb(f)
updateGreenArrowCommandCombat(f, { light: true }, CTX(OPP))   // ice 1
const cd = f._gaIceCd
f._gaPrevLight = false; clearProj(); qcb(f)
r = updateGreenArrowCommandCombat(f, { light: true }, CTX(OPP))   // ice 2 while cd → blocked
ok("ice arrow can't loop (cooldown)", (r === false || activeProjectiles.length === 0) && cd > 0)

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW ARROWS: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
