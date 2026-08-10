// Stage 1 (Damage Pipeline & TIME MODEL) — frame-rate-independence check.
//
// The game runs a FIXED-TIMESTEP 60Hz loop (game.js): the update pass — and thus
// updateTransformations — runs exactly once per logic frame regardless of display refresh
// rate. Stage 1 converted transformation energy-drain and duration from wall-clock
// (kiDrainPerSecond * deltaTime/1000, transformationTimer in ms) to FRAME-based math, so a
// form now lasts the same number of FRAMES on a 60Hz and a 200Hz display.
//
// This is a PURE-LOGIC node check (transformations.js has no imports) — it drives
// updateTransformations directly with different deltaTime values to prove the outcome no
// longer depends on deltaTime. It is intentionally NOT a Playwright suite: every existing
// harness boots a browser, and deltaTime-independence needs no DOM. Run: npm run test:time-model
import { applyTransformation, updateTransformations } from "../transformations.js"

let pass = 0, fail = 0
function ok(cond, msg) { if (cond) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  ❌ FAIL ${msg}`) } }

function makeFighter(form) {
  return {
    rosterKey: "test", energy: 100, maxEnergy: 100, energyType: "ki",
    currentForm: null, baseForm: null,
    transformations: { boost: form }, transformationOrder: ["base", "boost"],
    damageMultiplier: 1, attackMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1
  }
}
// Advance N fixed-timestep frames, passing a per-frame deltaTime (which must NOT affect outcome).
function advance(f, frames, dt) { for (let i = 0; i < frames; i++) updateTransformations(f, dt) }

console.log("── energy drain is frame-count based, not deltaTime based ──")
{
  // energyDrainPerFrame form: 0.5/frame → 60 frames must drain exactly 30, at ANY deltaTime.
  const a = makeFighter({ energyDrainPerFrame: 0.5, isSpecial: true })
  const b = makeFighter({ energyDrainPerFrame: 0.5, isSpecial: true })
  applyTransformation(a, "boost"); applyTransformation(b, "boost")
  advance(a, 60, 1000 / 60)   // 60fps display
  advance(b, 60, 1000 / 200)  // 200fps display (loop still ticks once per frame)
  ok(Math.abs(a.energy - b.energy) < 1e-9, `60fps vs 200fps drain identical  — a=${a.energy.toFixed(3)} b=${b.energy.toFixed(3)}`)
  ok(Math.abs((100 - a.energy) - 30) < 1e-9, `drained exactly 60×0.5 = 30 over 60 frames  — drained=${(100 - a.energy).toFixed(3)}`)
}

console.log("── deprecated kiDrainPerSecond fallback == energyDrainPerFrame (÷60) ──")
{
  const legacy = makeFighter({ kiDrainPerSecond: 30, isSpecial: true })         // → 0.5/frame
  const modern = makeFighter({ energyDrainPerFrame: 0.5, isSpecial: true })
  applyTransformation(legacy, "boost"); applyTransformation(modern, "boost")
  const warns = []; const origWarn = console.warn; console.warn = (m) => warns.push(m)
  advance(legacy, 60, 1000 / 60); advance(modern, 60, 1000 / 60)
  console.warn = origWarn
  ok(Math.abs(legacy.energy - modern.energy) < 1e-9, `kiDrainPerSecond/60 matches energyDrainPerFrame  — legacy=${legacy.energy.toFixed(3)} modern=${modern.energy.toFixed(3)}`)
  ok(warns.length === 1, `deprecated path warns exactly ONCE (not per-frame)  — warns=${warns.length}`)
}

console.log("── form DURATION is frame-count based (reverts on the same frame at any fps) ──")
{
  // duration:2 → transformationTimer = 2*60 = 120 frames.
  const a = makeFighter({ duration: 2, damageMultiplier: 2 })
  const b = makeFighter({ duration: 2, damageMultiplier: 2 })
  applyTransformation(a, "boost"); applyTransformation(b, "boost")
  advance(a, 119, 1000 / 60); advance(b, 119, 1000 / 200)
  ok(a.currentForm === "boost" && b.currentForm === "boost", `still transformed at frame 119  — a=${a.currentForm} b=${b.currentForm}`)
  advance(a, 1, 1000 / 60); advance(b, 1, 1000 / 200)
  ok(a.currentForm === "base" && b.currentForm === "base", `reverted at frame 120 regardless of deltaTime  — a=${a.currentForm} b=${b.currentForm}`)
}

console.log(`\n${pass} PASS / ${fail} FAIL`)
process.exit(fail ? 1 : 0)
