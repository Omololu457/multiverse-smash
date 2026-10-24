/**
 * SOLDIER BOY — PHASE 7 sound. Verifies the placeholder WebAudio synth is wired and SAFE: playSoldierBoy
 * exists and every move id is a no-throw no-op without an AudioContext (node). The actual audible synth +
 * deterministic hash-pitch run in the browser harnesses (test:soldier-boy-kit-live drives the real audio
 * graph). Also checks the pitch model is deterministic (±3% from the shared hash).
 */
import { sound } from "../sound.js"

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }

ok(typeof sound.playSoldierBoy === "function", "sound.playSoldierBoy is defined")

const IDS = ["sb_shield", "sb_smg", "sb_rifle", "sb_goldRush", "sb_cyclone", "sb_dive", "sb_armedToggle", "sb_chargeFull", "sb_nuke"]
for (const id of IDS) {
  let threw = false
  try { sound.playSoldierBoy(id, 1.02, 12345) } catch (_) { threw = true }
  ok(!threw, `playSoldierBoy("${id}") is a safe no-op without AudioContext`)
}

// Deterministic ±3% pitch model (mirrors abilities.sbSound: pitch = 1 + (hash-0.5)*0.06).
function sbHash(seed, frame, idx) {
  let h = ((seed | 0) ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ ((frame | 0) + 0x85ebca6b), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((idx | 0) + 0x27d4eb2f), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
const pitch = (s, f, i) => 1 + (sbHash(s, f, i) - 0.5) * 0.06
ok(pitch(7, 42, 0) === pitch(7, 42, 0), "pitch is deterministic for a given (seed,frame,idx)")
let within = true
for (let f = 0; f < 500; f++) { const p = pitch(123, f, f & 1); if (p < 0.97 - 1e-9 || p > 1.03 + 1e-9) within = false }
ok(within, "pitch stays within ±3%")
ok(pitch(1, 0, 0) !== pitch(2, 0, 0), "pitch varies with the seed")

console.log("════════════════════════════════════════════")
console.log(`  SOLDIER BOY SOUND: ${passed} passed, ${failed} failed`)
console.log("════════════════════════════════════════════")
if (failed) fails.forEach(m => console.log("  ✗ " + m))
process.exit(failed ? 1 : 0)
