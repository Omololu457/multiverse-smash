/**
 * SOLDIER BOY — PHASE 6 defensive tools. Unit-tests Gold Brace (Block+Heavy, absorb one hit, 6s cd),
 * Back Roll (Block+Light, i-frames + 5s cd), and Second Wind (passive: once/round below 20% HP → 3s of
 * 25% damage reduction + 20 Charge). Absorb + DR are verified through combat.applyScaledDamage. Deterministic.
 */
import { updateSoldierBoyDefense, updateSoldierBoyDefensiveInput } from "../abilities.js"
import { applyScaledDamage } from "../combat.js"

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const approx = (a, b) => Math.abs(a - b) <= 1e-6
const ctx = { seed: 1, frame: 0 }
const mk = (over = {}) => ({ rosterKey: "soldier_boy", side: "p1", energy: 0, maxEnergy: 100, health: 1080, maxHealth: 1080, attacking: false, attackCooldown: 0, facing: 1, invulnTimer: 0, ...over })
const foe = () => ({ rosterKey: "homelander", side: "p2" })

// ── GOLD BRACE: Block+Heavy arms it; the next hit is absorbed (0 dmg); 6s cooldown ──
{
  const f = mk()
  const consumed = updateSoldierBoyDefensiveInput(f, { block: true, heavy: true }, ctx)
  ok(consumed === true, "Block+Heavy arms Gold Brace & consumes heavy")
  ok((f._sbBraceActive || 0) > 0, "brace window active")
  ok(f._sbBraceCd === 360, `6s cooldown set (got ${f._sbBraceCd})`)
  const hp0 = f.health
  const dealt = applyScaledDamage(f, 50, { attacker: foe(), scale: 1 })
  ok(dealt === 0 && f.health === hp0, `brace absorbed the hit (dealt=${dealt})`)
  ok((f._sbBraceActive || 0) === 0, "brace consumed after one hit")
  // next hit lands normally
  const dealt2 = applyScaledDamage(f, 50, { attacker: foe(), scale: 1 })
  ok(dealt2 === 50, `second hit lands (dealt=${dealt2})`)
}
// ── brace denied on cooldown ──
{
  const f = mk({ _sbBraceCd: 120 })
  const consumed = updateSoldierBoyDefensiveInput(f, { block: true, heavy: true }, ctx)
  ok(consumed === false, "Gold Brace denied while on cooldown")
}
// ── BACK ROLL: Block+Light → i-frames + 5s cd ──
{
  const f = mk()
  const consumed = updateSoldierBoyDefensiveInput(f, { block: true, light: true }, ctx)
  ok(consumed === true, "Block+Light triggers Back Roll & consumes light")
  ok((f.invulnTimer || 0) >= 14, `Back Roll grants i-frames (got ${f.invulnTimer})`)
  ok(f._sbRollCd === 300, `5s roll cooldown (got ${f._sbRollCd})`)
}
// ── roll denied on cooldown ──
{
  const f = mk({ _sbRollCd: 120 })
  ok(updateSoldierBoyDefensiveInput(f, { block: true, light: true }, ctx) === false, "Back Roll denied on cooldown")
}
// ── no block held → defensive input is a no-op (normal heavy/light pass through) ──
{
  const f = mk()
  ok(updateSoldierBoyDefensiveInput(f, { heavy: true }, ctx) === false, "no-op without block (heavy passes)")
}
// ── SECOND WIND: once/round below 20% HP → window + 20 Charge; 25% DR while active ──
{
  const f = mk({ health: 200, energy: 0 })   // 200 < 20% of 1080 (216)
  updateSoldierBoyDefense(f)
  ok(f._sbSecondWindUsed === true, "Second Wind triggered below 20% HP")
  ok((f._sbSecondWind || 0) > 0, "Second Wind window active")
  ok(f.energy === 20, `Second Wind grants +20 Charge (got ${f.energy})`)
  const dealt = applyScaledDamage(f, 100, { attacker: foe(), scale: 1 })
  ok(dealt === 75, `25% damage reduction while active (dealt=${dealt})`)
  // once per round
  const e1 = f.energy
  updateSoldierBoyDefense(f)
  ok(f.energy === e1, "Second Wind does not re-trigger same round")
}
// ── Second Wind does NOT trigger above 20% HP ──
{
  const f = mk({ health: 1000 })
  updateSoldierBoyDefense(f)
  ok(!f._sbSecondWindUsed, "Second Wind inert above 20% HP")
}
// ── no-op for non-soldier_boy ──
{
  const f = mk({ rosterKey: "homelander", health: 100 })
  updateSoldierBoyDefense(f)
  ok(!f._sbSecondWindUsed, "defense tick no-op for non-SB")
  ok(updateSoldierBoyDefensiveInput(f, { block: true, heavy: true }, ctx) === false, "defensive input no-op for non-SB")
}

console.log("════════════════════════════════════════════")
console.log(`  SOLDIER BOY DEFENSIVE TOOLS: ${passed} passed, ${failed} failed`)
console.log("════════════════════════════════════════════")
if (failed) fails.forEach(m => console.log("  ✗ " + m))
process.exit(failed ? 1 : 0)
