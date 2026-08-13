// COMEBACK FINISHER (Fatal-Blow-style) — UNIT test (Stage 3: ROSTER-WIDE). Drives the REAL combat.js logic:
//   • damage = ~32% of the USER's OWN max HP, CAPPED (high-HP fighters don't get an outlier flat number)
//   • eligibility = below 30% HP, NOT on the bespoke-comeback exclusion list (toji/maki/gon) — everyone else
//   • the committed strike starts only from an actionable state, on BLOCK + GRAB
import { comebackFinisherDamage, comebackFinisherReady, tryComebackFinisher, COMEBACK_FINISHER, COMEBACK_FINISHER_EXCLUDE } from "../combat.js"

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

section("A. damage = ~32% of the USER's OWN max HP, CAPPED at the top-end band")
{
  const cap = COMEBACK_FINISHER.dmgCap, pct = COMEBACK_FINISHER.dmgPct
  // killua 1030 → 0.32×1030 = 330 (UNDER the cap)
  check(`killua 1030 → ${Math.round(1030 * pct)} (sub-cap, scales with own HP)`, comebackFinisherDamage({ maxHealth: 1030 }) === Math.round(1030 * pct), `got ${comebackFinisherDamage({ maxHealth: 1030 })}`)
  // naruto 1180 → 0.32×1180 = 377.6 → CAPPED to 360
  check(`naruto 1180 → capped to ${cap} (0.32×1180=378 > cap)`, comebackFinisherDamage({ maxHealth: 1180 }) === cap, `got ${comebackFinisherDamage({ maxHealth: 1180 })}`)
  // superman 1450 → 0.32×1450 = 464 → CAPPED to 360 (the outlier the cap exists to neutralize)
  check(`superman 1450 → capped to ${cap} (not 464 — the HP-outlier guard)`, comebackFinisherDamage({ maxHealth: 1450 }) === cap, `got ${comebackFinisherDamage({ maxHealth: 1450 })}`)
  check(`cap ${cap} sits in the existing top-end cinematic-ult band (≈340–380 EFF)`, cap >= 340 && cap <= 380, `cap=${cap}`)
}

section("B. eligibility — below 30% HP, pilot char, not excluded")
{
  const naruto = (hp) => ({ rosterKey: "naruto", health: hp, maxHealth: 1180 })
  check("naruto at 100% HP → NOT ready", comebackFinisherReady(naruto(1180)) === false)
  check("naruto at 31% HP → NOT ready (above the 30% gate)", comebackFinisherReady(naruto(Math.round(1180 * 0.31))) === false)
  check("naruto at 30% HP → READY (at the gate)", comebackFinisherReady(naruto(Math.round(1180 * 0.30))) === true)
  check("naruto at 10% HP → READY", comebackFinisherReady(naruto(118)) === true)
}

section("C. EXCLUSIONS — chars with a bespoke below-threshold comeback keep THEIRS")
{
  for (const key of ["toji", "maki", "gon"]) {
    check(`${key} at 10% HP → NOT ready (excluded, keeps bespoke comeback)`, comebackFinisherReady({ rosterKey: key, health: 100, maxHealth: 1050 }) === false)
    check(`${key} is on the exclusion set`, COMEBACK_FINISHER_EXCLUDE.has(key))
  }
}

section("D. ROSTER-WIDE (Stage 3) — every non-excluded char is eligible below the gate")
{
  // A spread of universes/HP tiers, all NOT on the exclusion list → all READY at 10% HP.
  for (const [key, hp] of [["sasuke", 1180], ["gojo", 1160], ["sukuna", 1240], ["superman", 1450], ["shinobu", 960], ["omniman", 1400], ["nezuko", 1020], ["batman", 1080], ["zaraki", 1240]]) {
    check(`${key} at 10% HP → READY (roster-wide, no pilot gate)`, comebackFinisherReady({ rosterKey: key, health: Math.round(hp * 0.10), maxHealth: hp }) === true)
  }
  // The 3 excluded stay ineligible even at low HP.
  for (const key of ["toji", "maki", "gon"]) check(`${key} still NOT ready (excluded)`, comebackFinisherReady({ rosterKey: key, health: 100, maxHealth: 1100 }) === false)
}

section("E. tryComebackFinisher — gated by input + actionable state")
{
  const mk = () => ({ rosterKey: "naruto", side: "p1", x: 200, y: 300, w: 50, h: 100, facing: 1, health: 118, maxHealth: 1180, hitstun: 0, attacking: false, attackCooldown: 0, invulnTimer: 0 })
  check("no input → no fire", tryComebackFinisher(mk(), { block: false, grab: false }, {}) === false)
  check("block only → no fire", tryComebackFinisher(mk(), { block: true, grab: false }, {}) === false)
  check("grab only → no fire", tryComebackFinisher(mk(), { block: false, grab: true }, {}) === false)
  { const f = mk(); const r = tryComebackFinisher(f, { block: true, grab: true }, { x: 260, y: 300, w: 50, h: 100 }); check("block+grab at low HP → FIRES (committed strike started)", r === true && f.attacking === true, `r=${r} attacking=${f.attacking}`); check("stamps the fixed comeback damage on the attack", f.currentAttack?._comebackFinisher === true && f.currentAttack?.damage === COMEBACK_FINISHER.dmgCap, `dmg=${f.currentAttack?.damage}`); check("grants startup i-frame armour", (f.invulnTimer || 0) >= COMEBACK_FINISHER.iframes, `invuln=${f.invulnTimer}`) }
  { const f = mk(); f.attacking = true; check("already attacking → no fire (committed-state guard)", tryComebackFinisher(f, { block: true, grab: true }, {}) === false) }
  { const f = mk(); f.health = Math.round(1180 * 0.5); check("above 30% HP → no fire even with the input", tryComebackFinisher(f, { block: true, grab: true }, {}) === false) }
}

console.log(`\nComeback Finisher (roster-wide): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
