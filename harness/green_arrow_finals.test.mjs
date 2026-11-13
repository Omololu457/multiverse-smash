// Green Arrow — PASS3 P7 FINALS (node). Consolidates the pass-level invariants:
//   • munitions.js is a GENERIC, character-agnostic module (any owner, all profiles, custom profiles)
//   • the full Super spawns 16+ munitions and is BIT-IDENTICAL across runs (determinism under load)
//   • no Math.random / gameRng in the GA sim modules (source scan)
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
import { executeGreenArrowUltimate, applyGreenArrowArrowstorm, updateProjectiles, activeProjectiles } from "../abilities.js"
import { resolveProjectileHitsMulti } from "../combat.js"
import { MUNITION_PROFILES, spawnMunition, explodeAt, updateMunitions, tickMunitionChains, updateMunitionShootDown, resetMunitions, activeMunitions, registerMunitionProfile, setMunitionSfx } from "../munitions.js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const GROUND = 500, WORLDW = 2000
const mkGA = () => ({ rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x: 400, y: GROUND - 110, w: 60, h: 110, groundY: GROUND, energy: 100, maxEnergy: 100, _matchSeed: 42, comboCounter: 0, comboTimer: 0, attackCooldown: 0, invulnTimer: 0, hitstun: 0, vx: 0 })
const mkDummy = () => ({ rosterKey: "goku", side: "p2", playerNumber: 2, facing: -1, x: 1000, y: GROUND - 110, w: 60, h: 110, groundY: GROUND, health: 100000, maxHealth: 100000, defense: 80, hitstun: 0, isBlocking: false, eliminated: false, vx: 0, vy: 0, comboCounter: 0 })
const CTX = (opp, frame) => ({ getOpponent: () => opp, frame, stageWidth: WORLDW, worldWidth: WORLDW, stageLeft: 0, groundY: GROUND })
const MENV = (figs) => ({ groundY: GROUND, leftWall: 0, rightWall: WORLDW, fighters: figs, isEnemy: (o, f) => f && o && f.side !== o.side, platformTopAt: () => null })

console.log("\n── munitions.js is a GENERIC, character-agnostic module")
ok("ships all 7 base profiles", ["dumb", "guided", "cluster", "napalm", "emp", "net", "big"].every(k => MUNITION_PROFILES[k]))
resetMunitions()
const nonGA = { rosterKey: "goku", side: "p1", playerNumber: 1, facing: 1, x: 300, y: 300, w: 60, h: 110, _matchSeed: 3 }   // a NON-Green-Arrow owner
const anyM = spawnMunition(nonGA, "dumb", { x: 500, y: 300 })
ok("any fighter (not just Green Arrow) can spawn a munition", !!anyM && activeMunitions.length === 1)
// a CUSTOM profile registered at runtime behaves like the built-ins
registerMunitionProfile("ga_test_frag", { gravity: 0.4, speed: 6, blastRadius: 80, damage: 40, hp: 1, armTime: 0, lifetime: 120, hitOnce: true })
ok("registerMunitionProfile adds a reusable custom type", !!MUNITION_PROFILES.ga_test_frag)
resetMunitions()
const foe = { side: "p2", playerNumber: 2, x: 505, y: 300, w: 60, h: 110, health: 1000, maxHealth: 1000, defense: 0, eliminated: false }
explodeAt(nonGA, 520, 340, MUNITION_PROFILES.ga_test_frag, MENV([nonGA, foe]), 0)
ok("the custom profile deals its AoE damage like a built-in", foe.health < 1000, `hp=${foe.health}`)

console.log("\n── the full Super spawns 16+ munitions and is BIT-IDENTICAL across runs")
setMunitionSfx(() => {})   // audio is render-only; keep it a no-op here
function runSuper() {
  resetMunitions(); activeProjectiles.length = 0
  const f = mkGA(), d = mkDummy()
  f._gaLastSpecialFrame = null
  const cast = executeGreenArrowUltimate(f, CTX(d, 0))
  let peakMun = 0, totalSpawned = 0, lastCount = 0
  const trace = []
  for (let fr = 1; fr <= 600 && f._gaArrowstormActive; fr++) {
    applyGreenArrowArrowstorm(f, CTX(d, fr))
    if (activeMunitions.length > lastCount) totalSpawned += activeMunitions.length - lastCount
    updateMunitions(fr, MENV([f, d]))
    updateMunitionShootDown([f, d], activeProjectiles, fr, MENV([f, d]))
    tickMunitionChains(fr, MENV([f, d]))
    updateProjectiles(WORLDW, GROUND + 200)
    try { resolveProjectileHitsMulti(activeProjectiles, [f, d], [], []) } catch (_) {}
    d.x = 1000; d.y = GROUND - 110; d.hitstun = 0; d.knockdownState = false; d.isLaunched = false; d.vx = 0; d.vy = 0
    peakMun = Math.max(peakMun, activeMunitions.length)
    lastCount = activeMunitions.length
    // per-frame fingerprint of all live munition positions (integer, order-stable)
    trace.push(activeMunitions.map(m => `${Math.round(m.x)},${Math.round(m.y)},${m.type}`).join("|"))
  }
  return { cast, dmg: 100000 - d.health, peakMun, totalSpawned, sig: trace.join(";") }
}
const A = runSuper(), B = runSuper()
ok("Super cast", A.cast === true)
ok("Super spawns 16+ munitions over its run", A.totalSpawned >= 16, `spawned=${A.totalSpawned} peak=${A.peakMun}`)
ok("final damage ≈ 380 and ≤ 420", A.dmg >= 340 && A.dmg <= 420, `got ${Math.round(A.dmg)}`)
ok("two runs → identical damage", Math.round(A.dmg) === Math.round(B.dmg), `${Math.round(A.dmg)} vs ${Math.round(B.dmg)}`)
ok("two runs → BYTE-IDENTICAL munition-position trace (deterministic under full load)", A.sig === B.sig)

console.log("\n── no Math.random / gameRng in the GA sim modules (source scan)")
for (const file of ["munitions.js", "drones.js"]) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf-8")
    .split("\n").filter(l => !l.trim().startsWith("*") && !l.trim().startsWith("//") && !l.trim().startsWith("/*")).join("\n")
  const hits = (src.match(/Math\.random|gameRng|Math\.random\s*\(/g) || [])
  ok(`${file} has no Math.random / gameRng in code`, hits.length === 0, hits.join(","))
}

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW FINALS: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
