// COMEBACK FINISHER (Fatal-Blow-style) — UNIT test (Stage 3: ROSTER-WIDE). Drives the REAL combat.js logic:
//   • damage = ~32% of the TARGET's max HP, clamped [dmgFloor, dmgCap] (T3b: proportional finisher — was a
//     flat cap that shrank to a weak % against tanky targets; falls back to the user's own HP if no target)
//   • eligibility = below 30% HP, NOT on the bespoke-comeback exclusion list (toji/maki/gon/naruto) — everyone else
//   • the committed strike starts only from an actionable state, on BLOCK + GRAB
import { comebackFinisherDamage, comebackFinisherReady, tryComebackFinisher, COMEBACK_FINISHER, COMEBACK_FINISHER_EXCLUDE } from "../combat.js"

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

section("A. damage = ~32% of the TARGET's max HP, clamped [floor, cap]")
{
  const cap = COMEBACK_FINISHER.dmgCap, floor = COMEBACK_FINISHER.dmgFloor, pct = COMEBACK_FINISHER.dmgPct
  const user = { maxHealth: 1000 }   // user HP no longer scales the damage — the TARGET's does
  // scales with the TARGET's max HP across the real roster range (all land inside [floor, cap], so it's a pure %)
  check(`vs shinobu-tier 960 → ${Math.round(960 * pct)} (32% of TARGET)`, comebackFinisherDamage(user, { maxHealth: 960 }) === Math.round(960 * pct), `got ${comebackFinisherDamage(user, { maxHealth: 960 })}`)
  check(`vs median 1150 → ${Math.round(1150 * pct)}`, comebackFinisherDamage(user, { maxHealth: 1150 }) === Math.round(1150 * pct), `got ${comebackFinisherDamage(user, { maxHealth: 1150 })}`)
  check(`vs superman 1450 → ${Math.round(1450 * pct)} (proportional; the old flat cap gave just 360 here)`, comebackFinisherDamage(user, { maxHealth: 1450 }) === Math.round(1450 * pct), `got ${comebackFinisherDamage(user, { maxHealth: 1450 })}`)
  check("chunks MORE off a tanky target than a frail one (the fix)", comebackFinisherDamage(user, { maxHealth: 1450 }) > comebackFinisherDamage(user, { maxHealth: 960 }), "")
  // floor/cap guardrails only bite vs hypothetical extremes outside the real 950–1450 range
  check(`floor ${floor} vs a very-low-HP target (500)`, comebackFinisherDamage(user, { maxHealth: 500 }) === floor, `got ${comebackFinisherDamage(user, { maxHealth: 500 })}`)
  check(`cap ${cap} vs a very-high-HP target (2000)`, comebackFinisherDamage(user, { maxHealth: 2000 }) === cap, `got ${comebackFinisherDamage(user, { maxHealth: 2000 })}`)
  // fallback: no target supplied → the user's own max HP (the display-probe path)
  check(`no-target fallback uses the user's own max HP (1030 → ${Math.round(1030 * pct)})`, comebackFinisherDamage({ maxHealth: 1030 }) === Math.round(1030 * pct), `got ${comebackFinisherDamage({ maxHealth: 1030 })}`)
}

section("B. eligibility — below 30% HP, pilot char, not excluded")
{
  const sasuke = (hp) => ({ rosterKey: "sasuke", health: hp, maxHealth: 1180 })
  check("sasuke at 100% HP → NOT ready", comebackFinisherReady(sasuke(1180)) === false)
  check("sasuke at 31% HP → NOT ready (above the 30% gate)", comebackFinisherReady(sasuke(Math.round(1180 * 0.31))) === false)
  check("sasuke at 30% HP → READY (at the gate)", comebackFinisherReady(sasuke(Math.round(1180 * 0.30))) === true)
  check("sasuke at 10% HP → READY", comebackFinisherReady(sasuke(118)) === true)
}

section("C. EXCLUSIONS — chars with a bespoke below-threshold comeback keep THEIRS")
{
  // naruto added: Kurama shroud heal-on-hit (≤40% HP) is his low-HP tool → excluded from the Fatal Blow
  // so he doesn't stack both (same reason toji/maki/gon are excluded).
  for (const key of ["toji", "maki", "gon", "naruto"]) {
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
  // The excluded chars stay ineligible even at low HP (they keep their bespoke comeback).
  for (const key of ["toji", "maki", "gon", "naruto"]) check(`${key} still NOT ready (excluded)`, comebackFinisherReady({ rosterKey: key, health: 100, maxHealth: 1100 }) === false)
}

section("E. tryComebackFinisher — gated by input + actionable state")
{
  const mk = () => ({ rosterKey: "sasuke", side: "p1", x: 200, y: 300, w: 50, h: 100, facing: 1, health: 118, maxHealth: 1180, hitstun: 0, attacking: false, attackCooldown: 0, invulnTimer: 0 })
  check("no input → no fire", tryComebackFinisher(mk(), { block: false, grab: false }, {}) === false)
  check("block only → no fire", tryComebackFinisher(mk(), { block: true, grab: false }, {}) === false)
  check("grab only → no fire", tryComebackFinisher(mk(), { block: false, grab: true }, {}) === false)
  { const f = mk(); const tgt = { x: 260, y: 300, w: 50, h: 100, maxHealth: 1250 }; const r = tryComebackFinisher(f, { block: true, grab: true }, tgt); check("block+grab at low HP → FIRES (committed strike started)", r === true && f.attacking === true, `r=${r} attacking=${f.attacking}`); check("stamps the TARGET-scaled comeback damage on the attack", f.currentAttack?._comebackFinisher === true && f.currentAttack?.damage === comebackFinisherDamage(f, tgt), `dmg=${f.currentAttack?.damage} expected=${comebackFinisherDamage(f, tgt)}`); check("grants startup i-frame armour", (f.invulnTimer || 0) >= COMEBACK_FINISHER.iframes, `invuln=${f.invulnTimer}`) }
  { const f = mk(); f.attacking = true; check("already attacking → no fire (committed-state guard)", tryComebackFinisher(f, { block: true, grab: true }, {}) === false) }
  { const f = mk(); f.health = Math.round(1180 * 0.5); check("above 30% HP → no fire even with the input", tryComebackFinisher(f, { block: true, grab: true }, {}) === false) }
}

console.log(`\nComeback Finisher (roster-wide): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
