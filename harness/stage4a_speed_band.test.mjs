// MK-feel Stage 4a — SPEED-TIER BAND. The old ground-speed formula (rawSpeed*0.09 clamped [4,9])
// squeezed the whole 78–98 stat band into ~7.0–8.8 (only ~18% spread), so a "speedster" barely
// out-walked a "heavy". Stage 4a replaces it with a linear map to a real 2× spread: 78→4.5, 98→9.5.
// The clamp is KEPT ([4.5, 9.5]) because it is load-bearing — buff forms SET fighter.speed to
// raw-scale values (Godspeed 120, Gon-adult 40) and rely on the ceiling/floor, and low placeholders
// (Ben10 human 5, Morty 72) would otherwise map below the floor.
//
// This mirrors the physics.js formula EXACTLY (kept in sync by the static-source check in section D).
const speedFor = (raw) => Math.max(4.5, Math.min(9.5, 4.5 + (raw - 78) / 20 * 5))

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps
const section = (t) => console.log(`\n── ${t} ──`)

// ── A. the endpoints + a real 2× spread ──
section("A. band endpoints — 78 → 4.5, 98 → 9.5 (a true 2× spread)")
check("slowest in-band (78) → 4.5", near(speedFor(78), 4.5), `got ${speedFor(78)}`)
check("fastest in-band (98) → 9.5", near(speedFor(98), 9.5), `got ${speedFor(98)}`)
check("spread is ~2× (fast / slow ≈ 2.11)", near(speedFor(98) / speedFor(78), 9.5 / 4.5), `ratio=${(speedFor(98)/speedFor(78)).toFixed(3)}`)
check("this is WIDER than the old ~18% spread", (speedFor(98) / speedFor(78)) > 1.8, `ratio=${(speedFor(98)/speedFor(78)).toFixed(3)} vs old ~1.18`)

// ── B. representative roster tiers land at distinct values ──
section("B. per-tier values (post-Stage-3 stat sheet)")
const tiers = [
  ["Rick (84, buffed off floor in 3d)", 84, 6.0],
  ["Naruto/Sasuke/Pain (90)", 90, 7.5],
  ["Madara/Rengoku (92)", 92, 8.0],
  ["Netero/Ichigo (94)", 94, 8.5],
  ["Zenitsu/Tobirama/Tobi (96)", 96, 9.0],
  ["Minato/Maki (98)", 98, 9.5],
]
for (const [name, raw, expect] of tiers) check(`${name} → ${expect}`, near(speedFor(raw), expect), `got ${speedFor(raw)}`)
// the slowest and fastest REAL fighters are genuinely ~2 apart per tier step
check("adjacent tiers differ by ~0.5/2-speed-pts (readable steps)", near(speedFor(92) - speedFor(90), 0.5), `Δ=${(speedFor(92)-speedFor(90)).toFixed(3)}`)

// ── C. clamp guards — buffs + out-of-band placeholders never break ──
section("C. clamp [4.5, 9.5] guards buffs + out-of-band values")
check("Godspeed (sets speed 120) is CAPPED at 9.5 (not 15)", near(speedFor(120), 9.5), `got ${speedFor(120)}`)
check("Gon-adult (sets speed 40) FLOORS at 4.5 lumber (not −5)", near(speedFor(40), 4.5), `got ${speedFor(40)}`)
check("Ben10 human placeholder (5) floors at 4.5 (not −13.75)", near(speedFor(5), 4.5), `got ${speedFor(5)}`)
check("Morty (72, below the band) floors at 4.5", near(speedFor(72), 4.5), `got ${speedFor(72)}`)
check("Flash (99, above the band) caps at 9.5", near(speedFor(99), 9.5), `got ${speedFor(99)}`)

// ── D. the physics.js source actually uses this exact formula ──
section("D. physics.js is wired to the new formula (no drift)")
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const phys = fs.readFileSync(path.join(ROOT, "physics.js"), "utf8")
check("physics.js uses clamp(4.5 + (rawSpeed - 78) / 20 * 5, 4.5, 9.5)",
  /clamp\(\s*4\.5\s*\+\s*\(rawSpeed\s*-\s*78\)\s*\/\s*20\s*\*\s*5\s*,\s*4\.5\s*,\s*9\.5\s*\)/.test(phys))
check("the OLD rawSpeed*0.09 formula is GONE", !/clamp\(\s*rawSpeed\s*\*\s*0\.09\s*,\s*4\s*,\s*9\s*\)/.test(phys))

console.log(`\nStage 4a (speed band): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
