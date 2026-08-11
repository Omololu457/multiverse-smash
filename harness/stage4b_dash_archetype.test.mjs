// MK-feel Stage 4b — PER-ARCHETYPE DASH COOLDOWN. The spec's premise ("dash fields defaulted for
// everyone") was WRONG: every char hand-set dashSpeed/dashDuration/dashCooldownMax, but the COOLDOWNS
// were inconsistent with the speed archetype and none hit the spec's targets (e.g. Minato spd 98 dashed
// on cd 40 like a heavy; Naruto/Sasuke spd 90 on cd 45 = Rick/Megumi). Stage 4b re-derives dash FREQUENCY
// from the speed tier: speedster (98) → ~14f, heavy (~78) → ~34f. dashSpeed/dashDuration (distance/burst)
// stay per-char — they were already differentiated.
//
// Mirrors game.js `archetypeDashCooldown` EXACTLY (kept honest by the static-source check, section D).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
import { getCharacter } from "../characters.js"

const dashCd = (speed) => Math.max(14, Math.min(34, Math.round(112 - (speed || 88))))
const speedOf = (k) => getCharacter(k)?.stats?.speed

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

// ── A. the spec anchors ──
section("A. anchors — speedster (98) ~14f, heavy (~78) ~34f")
check("98 → 14 (speedster floor)", dashCd(98) === 14, `got ${dashCd(98)}`)
check("78 → 34 (heavy ceiling)", dashCd(78) === 34, `got ${dashCd(78)}`)
check("frequency spread ~2.4× (heavy cd / speedster cd)", (dashCd(78) / dashCd(98)) > 2.3, `ratio=${(dashCd(78)/dashCd(98)).toFixed(2)}`)
check("clamps below the band (Ben10 placeholder 7 → 34, not 105)", dashCd(7) === 34, `got ${dashCd(7)}`)
check("clamps above the band (Flash 99 → 14, not 13)", dashCd(99) === 14, `got ${dashCd(99)}`)

// ── B. real roster values (drawn live from characters.js) ──
section("B. per-character cooldowns re-derived from speed")
const cases = [
  ["minato", 98, 14], ["maki", 98, 14], ["flash", 99, 14],
  ["shinobu", 97, 15], ["zenitsu", 96, 16], ["naruto", 90, 22], ["sasuke", 90, 22],
  ["madara", 92, 20], ["goku", 88, 24], ["rick", 84, 28], ["megumi", 83, 29], ["morty", 72, 34],
]
for (const [key, expSpd, expCd] of cases) {
  const sp = speedOf(key)
  check(`${key} (spd ${sp}) → cd ${expCd}`, sp === expSpd && dashCd(sp) === expCd, `speed=${sp} cd=${dashCd(sp)}`)
}

// ── C. the inversions are FIXED (fast chars now dash more often than slow ones) ──
section("C. speed→frequency inversions fixed")
check("Minato (98) now dashes FAR more often than Goku (88): 14 < 24 (was 40 ≈ 40)",
  dashCd(speedOf("minato")) < dashCd(speedOf("goku")), `minato=${dashCd(speedOf("minato"))} goku=${dashCd(speedOf("goku"))}`)
check("Naruto (90) now < Rick (84): 22 < 28 (was both ~45)",
  dashCd(speedOf("naruto")) < dashCd(speedOf("rick")), `naruto=${dashCd(speedOf("naruto"))} rick=${dashCd(speedOf("rick"))}`)
check("monotonic: faster speed never yields a LONGER cooldown (full roster)", (() => {
  const ks = ["flash","shinobu","zenitsu","netero","madara","naruto","goku","rick","megumi","morty"]
  const pairs = ks.map(k => [speedOf(k), dashCd(speedOf(k))]).filter(([s]) => s != null)
  for (const [s1, c1] of pairs) for (const [s2, c2] of pairs) if (s1 > s2 && c1 > c2) return false
  return true
})())

// ── D. game.js is wired to this exact formula ──
section("D. game.js wires archetypeDashCooldown at fighter init")
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const g = fs.readFileSync(path.join(ROOT, "game.js"), "utf8")
check("game.js defines archetypeDashCooldown with clamp(round(112 - speed), 14, 34)",
  /function archetypeDashCooldown\(speed\)\s*\{[\s\S]*?Math\.max\(\s*14\s*,\s*Math\.min\(\s*34\s*,\s*Math\.round\(\s*112\s*-\s*\(speed[^)]*\)\s*\)\s*\)\s*\)/.test(g))
check("fighter init sets dashCooldownMax: archetypeDashCooldown(speed)",
  /dashCooldownMax:\s*archetypeDashCooldown\(speed\)/.test(g))
check("the old flat `stats.dashCooldownMax || 30` init is GONE",
  !/dashCooldownMax:\s*stats\.dashCooldownMax\s*\|\|\s*30/.test(g))

console.log(`\nStage 4b (dash archetype): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
