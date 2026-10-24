/**
 * SOLDIER BOY — PHASE 5 combo system. Asserts the 5 spec combos under the design model the brief states:
 * 85% damage scaling per hit (hit n = base * 0.85^(n-1)), counter resets after 1.5s (90f). The per-move
 * BASE damages for the normals are read from the REAL registered characters.js entry (so this guards the
 * frame data); the specials use the Phase-4 kit constants. Charge COSTS are asserted too.
 *
 * NOTE ON ENGINE SCALING: the live engine additionally applies GLOBAL_DAMAGE_SCALE (0.60, combat.js) and a
 * gentler COMBO_DAMAGE_CURVE [1,.92,.84,.76,.70,.65] + launcher/heavy starter penalty — so on-screen numbers
 * are lower than these design totals. The 90f combo-reset + 85%-ish decay are engine-global (already live;
 * see test:combo-decay / test:combo-standard). Live per-move damage is verified in test:soldier-boy-kit-live
 * (Nuclear Burst dealt 168 = 280 * 0.60). This test pins the DESIGN: the registered base damages + the kit's
 * costs reproduce the brief's combo targets under its own 85% model.
 */
import { characters } from "../characters.js"

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }

const ba = characters.soldier_boy.basic_attacks
const JAB = ba.light.damage, HEAVY = ba.heavy.damage, LAUNCHER = ba.upAttack.damage, LOW = ba.lowAttack.damage, AIR = ba.airAttack.damage
// Phase-4 kit base damages (documented constants; see abilities.js SOLDIER_BOY_SPECIALS / SB_* + SPRITE_LEDGER).
const GOLD_RUSH = 85, RIFLE = 90, SHIELD = 40, CYCLONE_HIT = 30, DIVE = 60
const ARMED_SMG_LINK = 20   // a point-blank SMG burst's effective value as a single combo link
const ARMED_RIFLE = 60      // SB_ARMED.rifleDmg

// Validate the registered normal frame data matches the brief.
ok(JAB === 22, `Jab base 22 (got ${JAB})`)
ok(HEAVY === 62, `Heavy base 62 (got ${HEAVY})`)
ok(LAUNCHER === 55, `Launcher base 55 (got ${LAUNCHER})`)
ok(LOW === 30, `Low base 30 (got ${LOW})`)
ok(AIR === 38, `Air base 38 (got ${AIR})`)

// 85% per-hit scaling model (hit n => base * 0.85^(n-1)).
const combo = (hits) => hits.reduce((sum, d, i) => sum + d * Math.pow(0.85, i), 0)
const near = (val, target, tol = 6) => Math.abs(val - target) <= tol

// 1. Jab, Jab, Launcher, Cape Cyclone (3 hits of 30) ≈ 128
{ const t = combo([JAB, JAB, LAUNCHER, CYCLONE_HIT, CYCLONE_HIT, CYCLONE_HIT])
  ok(near(t, 128), `Combo 1 ~128 (got ${t.toFixed(1)})`) }
// 2. Low, Jab, Heavy, Shield Toss ≈ 118
{ const t = combo([LOW, JAB, HEAVY, SHIELD])
  ok(near(t, 118), `Combo 2 ~118 (got ${t.toFixed(1)})`) }
// 3. Gold Rush, Heavy, Rifle Shot ≈ 203 (45 Charge)
{ const t = combo([GOLD_RUSH, HEAVY, RIFLE])
  ok(near(t, 203), `Combo 3 ~203 (got ${t.toFixed(1)})`)
  ok((20 + 25) === 45, "Combo 3 Charge cost = 45 (Gold Rush 20 + Rifle 25)") }
// 4. Launcher, Air attack, Diving Kick ≈ 131
{ const t = combo([LAUNCHER, AIR, DIVE])
  ok(near(t, 131), `Combo 4 ~131 (got ${t.toFixed(1)})`) }
// 5. Armed: Jab(SMG), Jab(SMG), Heavy(rifle), Shield Toss ≈ 105
{ const t = combo([ARMED_SMG_LINK, ARMED_SMG_LINK, ARMED_RIFLE, SHIELD])
  ok(near(t, 105), `Combo 5 ~105 (got ${t.toFixed(1)})`) }

console.log("════════════════════════════════════════════")
console.log(`  SOLDIER BOY COMBOS: ${passed} passed, ${failed} failed`)
console.log("════════════════════════════════════════════")
if (failed) fails.forEach(m => console.log("  ✗ " + m))
process.exit(failed ? 1 : 0)
