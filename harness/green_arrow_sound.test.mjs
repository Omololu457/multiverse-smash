// Green Arrow — PASS3 P6 bomb SFX wiring + determinism (node). The munitions module is a leaf: it
// emits abstract render-only events through setMunitionSfx; the audio layer maps them to the
// WebAudio synth. Here we capture the events to prove they fire on the right triggers, carry the
// chain depth, and are bit-identical across runs (seed-driven, no Math.random). The synth itself is
// render-only (no AudioContext in node → guarded no-op), so we only assert the method exists + is safe.
import { setMunitionSfx, spawnMunition, explodeAt, updateMunitions, resetMunitions, activeFirePatches } from "../munitions.js"
import { sound } from "../sound.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const mkGA = (x = 400) => ({ rosterKey: "green_arrow", side: "p1", playerNumber: 1, facing: 1, x, y: 300, w: 60, h: 110, _matchSeed: 7 })
const mkFoe = (x = 470, tagged = 0) => ({ side: "p2", playerNumber: 2, x, y: 300, w: 60, h: 110, health: 9e9, maxHealth: 9e9, defense: 0, eliminated: false, _gaTagged: tagged })
const MENV = (figs) => ({ groundY: 410, leftWall: 0, rightWall: 1600, fighters: figs, isEnemy: (o, f) => f && o && f.side !== o.side })

// capture every emitted event
let evts = []
setMunitionSfx((ev, x, y, seed, extra) => evts.push({ ev, x: Math.round(x), y: Math.round(y), seed, depth: (extra && extra.chainDepth) || 0 }))

console.log("\n── events fire on the right triggers")
resetMunitions(); evts = []
const o = mkGA(400)
spawnMunition(o, "dumb", { x: 600, y: 300 })
ok("spawn → whistle event", evts.some(e => e.ev === "spawn"))

resetMunitions(); evts = []
explodeAt(o, 600, 300, { blastRadius: 70, damage: 30 }, MENV([o, mkFoe()]), 0)
ok("explodeAt → boom event", evts.some(e => e.ev === "boom"))
ok("boom carries chain depth 0 at the source", evts.find(e => e.ev === "boom")?.depth === 0)

resetMunitions(); evts = []
explodeAt(o, 600, 300, { blastRadius: 70, damage: 30 }, MENV([o, mkFoe()]), 2)   // a depth-2 chain link
ok("chain boom carries its depth", evts.find(e => e.ev === "boom")?.depth === 2)

resetMunitions(); evts = []
explodeAt(o, 600, 300, { blastRadius: 70, damage: 20, onImpact: "napalm" }, MENV([o, mkFoe()]), 0)
ok("napalm explosion → napalm event + a fire patch", evts.some(e => e.ev === "napalm") && activeFirePatches.length >= 1)

resetMunitions(); evts = []
const tagged = mkFoe(900, 300)
spawnMunition(o, "guided", { x: 450, y: 150, vx: 9, vy: 0 })   // no explicit target
for (let fr = 1; fr <= 20; fr++) updateMunitions(fr, MENV([o, tagged]))
ok("guided bomb locking a tagged foe → reticle beep event", evts.some(e => e.ev === "reticle"))

console.log("\n── deterministic: identical runs emit identical event streams")
function run() {
  resetMunitions(); evts = []
  const g = mkGA(400), f = mkFoe(470, 300)
  spawnMunition(g, "dumb", { x: 600, y: 300 })
  explodeAt(g, 600, 300, { blastRadius: 90, damage: 30 }, MENV([g, f]), 0)
  explodeAt(g, 610, 300, { blastRadius: 90, damage: 30, onImpact: "napalm" }, MENV([g, f]), 1)
  return JSON.stringify(evts)
}
const a = run(), b = run()
ok("two identical runs → byte-identical event stream (seed-driven, no RNG)", a === b, a === b ? "" : "diverged")

console.log("\n── the synth method exists and is node-safe (no AudioContext → guarded no-op)")
ok("sound.playGreenArrow is a function", typeof sound.playGreenArrow === "function")
let threw = false
try { sound.playGreenArrow("ga_boom", 1.03, 42); sound.playGreenArrow("ga_plane", 1, 7); sound.playGreenArrow("ga_whistle", 0.95, 9) } catch (_) { threw = true }
ok("calling the synth in node never throws (guarded)", !threw)

console.log("\n── hook can be cleared (defensive)")
setMunitionSfx(null); resetMunitions(); evts = []
spawnMunition(mkGA(), "dumb", { x: 500, y: 300 })
ok("after setMunitionSfx(null), no events + no throw", evts.length === 0)
// re-arm so nothing leaks to other suites sharing the module (node isolates per-process anyway)
setMunitionSfx(() => {})

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW SOUND: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
