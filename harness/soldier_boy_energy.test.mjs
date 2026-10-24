/**
 * SOLDIER BOY — PHASE 2 energy economy (Nuclear Charge). Unit-tests the two hooks directly:
 *   - combat.applyScaledDamage: attacker soldier_boy +6 on a landed damaging hit; defender soldier_boy
 *     +4 on one taken; NON-soldier_boy fighters get ZERO meter change (byte-identical damage path).
 *   - abilities.regenEnergy: soldier_boy passive regen = exactly 3/s (0.05/frame → +3.0 over 60 frames).
 * Deterministic, no RNG.
 */
import { applyScaledDamage } from "../combat.js"
import { regenEnergy } from "../abilities.js"

let passed = 0, failed = 0; const fails = []
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }

// ── +6 when Soldier Boy LANDS a damaging hit ──
{
  const atk = { rosterKey: "soldier_boy", energy: 0, maxEnergy: 100 }
  const def = { rosterKey: "homelander", health: 1000, maxHealth: 1000, energy: 0, maxEnergy: 100 }
  applyScaledDamage(def, 50, { attacker: atk, scale: 1 })
  ok(approx(atk.energy, 6), `landed-hit gain: expected +6, got ${atk.energy}`)
  ok(approx(def.energy, 0), `non-SB defender should not gain meter, got ${def.energy}`)
}
// ── +4 when Soldier Boy TAKES a hit ──
{
  const atk = { rosterKey: "homelander", energy: 0, maxEnergy: 100 }
  const def = { rosterKey: "soldier_boy", health: 1000, maxHealth: 1000, energy: 0, maxEnergy: 100 }
  applyScaledDamage(def, 50, { attacker: atk, scale: 1 })
  ok(approx(def.energy, 4), `taken-hit gain: expected +4, got ${def.energy}`)
  ok(approx(atk.energy, 0), `non-SB attacker should not gain meter, got ${atk.energy}`)
}
// ── cap at maxEnergy ──
{
  const atk = { rosterKey: "soldier_boy", energy: 98, maxEnergy: 100 }
  const def = { rosterKey: "homelander", health: 1000, maxHealth: 1000, energy: 0, maxEnergy: 100 }
  applyScaledDamage(def, 50, { attacker: atk, scale: 1 })
  ok(approx(atk.energy, 100), `meter should cap at 100, got ${atk.energy}`)
}
// ── zero damage → no gain ──
{
  const atk = { rosterKey: "soldier_boy", energy: 0, maxEnergy: 100 }
  const def = { rosterKey: "homelander", health: 1000, maxHealth: 1000, energy: 0, maxEnergy: 100 }
  applyScaledDamage(def, 0, { attacker: atk, scale: 1 })
  ok(approx(atk.energy, 0), `no-damage hit should not feed meter, got ${atk.energy}`)
}
// ── NON-soldier_boy pair → byte-identical (zero meter side effects) ──
{
  const atk = { rosterKey: "goku", energy: 0, maxEnergy: 100 }
  const def = { rosterKey: "naruto", health: 1000, maxHealth: 1000, energy: 0, maxEnergy: 100 }
  applyScaledDamage(def, 50, { attacker: atk, scale: 1 })
  ok(approx(atk.energy, 0) && approx(def.energy, 0), `non-SB pair must get no meter (${atk.energy}/${def.energy})`)
}
// ── passive regen = 3/s (0.05/frame) ──
{
  const f = { rosterKey: "soldier_boy", energy: 0, maxEnergy: 100 }
  for (let i = 0; i < 60; i++) regenEnergy(f)
  ok(approx(f.energy, 3.0, 1e-6), `passive regen: expected 3.0 over 60f, got ${f.energy}`)
}

console.log("════════════════════════════════════════════")
console.log(`  SOLDIER BOY ENERGY ECONOMY: ${passed} passed, ${failed} failed`)
console.log("════════════════════════════════════════════")
if (failed) fails.forEach(m => console.log("  ✗ " + m))
process.exit(failed ? 1 : 0)
