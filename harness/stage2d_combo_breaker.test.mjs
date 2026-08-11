// MK-feel STAGE 2d CONFIRMATION — the universal COMBO BREAKER. Drives the REAL tryComboBreaker (combat.js):
//   • fires only while IN HITSTUN and caught in a combo (attacker comboCounter >= 3)
//   • input = BLOCK + SPECIAL
//   • spends one per-round BREAK STOCK (universal resource — NOT meter), i-frames, BLASTS THE ATTACKER AWAY
//   • CANNOT be spammed below the >= 3 threshold, without a stock, or without both inputs
//   • UNIVERSAL: a meterless character (maxEnergy 0) CAN break — the stock resource has no meter dependency
import { tryComboBreaker, COMBO_BREAKER } from "../combat.js"

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

// defender (in hitstun, full meter) + attacker (mid-combo to the RIGHT of the defender)
function mkDefender(extra = {}) { return { side: "p1", x: 200, y: 300, w: 50, h: 100, vx: 0, vy: 0, hitstun: 20, energy: 200, maxEnergy: 200, comboBreakStocks: 2, isLaunched: true, ...extra } }
function mkAttacker(extra = {}) { return { side: "p2", x: 300, y: 300, w: 50, h: 100, vx: -6, vy: 0, hitstun: 0, comboCounter: 4, comboTimer: 90, attacking: true, currentAttack: { name: "light" }, currentMove: "light", onGround: true, grounded: true, ...extra } }
const IN = { block: true, special: true }

section("A. fires vs a real combo (comboCounter >= 3) with BLOCK + SPECIAL")
{
  const d = mkDefender(), a = mkAttacker()
  const r = tryComboBreaker(d, IN, a)
  check("returns true (broke out)", r === true)
  check("spent one break stock (2 → 1)", d.comboBreakStocks === 1, `stocks=${d.comboBreakStocks}`)
  check("did NOT touch energy (freed for offense)", d.energy === 200, `energy=${d.energy}`)
  check("granted i-frames (>= configured window)", (d.invulnTimer || 0) >= COMBO_BREAKER.iframes, `invuln=${d.invulnTimer}`)
  check("cleared the defender's hitstun (broke out)", (d.hitstun || 0) === 0 && d.isLaunched === false)
  check("ATTACKER knocked AWAY (to the right, since attacker is right of defender)", a.vx > 0 && a.vy < 0, `vx=${a.vx} vy=${a.vy}`)
  check("ATTACKER put in hitstun + swing cancelled", (a.hitstun || 0) >= COMBO_BREAKER.atkHitstun && a.attacking === false && a.currentAttack === null)
  check("ATTACKER's combo ended (comboCounter reset)", (a.comboCounter || 0) === 0)
}

section("B. knockback direction — attacker on the LEFT is blasted LEFT")
{
  const d = mkDefender({ x: 300 }), a = mkAttacker({ x: 200 })   // attacker now LEFT of defender
  tryComboBreaker(d, IN, a)
  check("attacker left of defender → knocked LEFT (vx < 0)", a.vx < 0, `vx=${a.vx}`)
}

section("C. anti-spam — does NOT fire below the comboCounter >= 3 threshold")
{
  for (const cc of [0, 1, 2]) {
    const d = mkDefender(), a = mkAttacker({ comboCounter: cc })
    const r = tryComboBreaker(d, IN, a)
    check(`comboCounter ${cc} (< ${COMBO_BREAKER.threshold}) → no break, no stock spent`, r === false && d.comboBreakStocks === 2 && (d.hitstun || 0) === 20, `r=${r} stocks=${d.comboBreakStocks} hitstun=${d.hitstun}`)
  }
}

section("D. gated — needs BOTH inputs, hitstun, and a STOCK")
{
  { const d = mkDefender(), a = mkAttacker(); check("block only (no special) → no break", tryComboBreaker(d, { block: true, special: false }, a) === false && d.comboBreakStocks === 2) }
  { const d = mkDefender(), a = mkAttacker(); check("special only (no block) → no break", tryComboBreaker(d, { block: false, special: true }, a) === false && d.comboBreakStocks === 2) }
  { const d = mkDefender({ hitstun: 0 }), a = mkAttacker(); check("not in hitstun → no break", tryComboBreaker(d, IN, a) === false) }
  { const d = mkDefender({ comboBreakStocks: 0 }), a = mkAttacker(); check("0 stocks → cannot break", tryComboBreaker(d, IN, a) === false) }
  { const d = mkDefender({ comboBreakStocks: 1 }), a = mkAttacker(); check("1 stock → CAN break (→ 0)", tryComboBreaker(d, IN, a) === true && d.comboBreakStocks === 0) }
}

section("E. UNIVERSAL — a meterless character (maxEnergy 0) CAN break (the fix)")
{
  // Maki / the Demon Slayer roster / Toji have no energy bar. With the stock resource they break like anyone.
  const d = mkDefender({ maxEnergy: 0, energy: 0, comboBreakStocks: 2 }), a = mkAttacker()
  const r = tryComboBreaker(d, IN, a)
  check("meterless char breaks out", r === true, `r=${r}`)
  check("spent a stock, energy untouched (there is none)", d.comboBreakStocks === 1 && d.energy === 0, `stocks=${d.comboBreakStocks} energy=${d.energy}`)
  check("attacker's combo ended", (a.comboCounter || 0) === 0)
}

section("F. two stocks per round → can break TWICE, third is denied")
{
  // Each break clears the defender's hitstun (it's a reversal), so re-apply hitstun before each attempt to
  // simulate being caught in a NEW combo — the stock count is what should run out on the 3rd try.
  const d = mkDefender({ comboBreakStocks: COMBO_BREAKER.stocksPerRound })
  const recombo = () => { d.hitstun = 20; d.isLaunched = true }
  recombo(); const r1 = tryComboBreaker(d, IN, mkAttacker())
  recombo(); const r2 = tryComboBreaker(d, IN, mkAttacker())
  recombo(); const r3 = tryComboBreaker(d, IN, mkAttacker())
  check(`stocksPerRound=${COMBO_BREAKER.stocksPerRound}: break 1 & 2 succeed, 3rd denied (out of stocks)`, r1 === true && r2 === true && r3 === false && d.comboBreakStocks === 0, `r=[${r1},${r2},${r3}] stocks=${d.comboBreakStocks}`)
}

console.log(`\nStage 2d (combo breaker): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
