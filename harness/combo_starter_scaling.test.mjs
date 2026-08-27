// harness/combo_starter_scaling.test.mjs — UNIT test for MK1-style STARTER/move-type-weighted combo
// damage scaling (the refinement on top of the existing flat COMBO_DAMAGE_CURVE). Drives the REAL
// combat.js getComboScale / getComboHitstunScale against fighters carrying a `_comboStarterTier`.
// Proves: a launcher/heavy OPENER decays the string's DAMAGE faster; the opener's OWN hit is unpenalized;
// HITSTUN is never starter-scaled (links still connect); light openers are byte-identical to the old flat
// system (no regression — see also test:combo-decay staying 18/0).
import { getComboScale, getComboHitstunScale, COMBO_DAMAGE_CURVE, COMBO_HITSTUN_CURVE, COMBO_STARTER_SCALE } from "../combat.js";

let pass = 0, fail = 0;
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n, e); } };
const section = t => console.log(`\n── ${t} ──`);
const near = (a, b) => Math.abs(a - b) < 1e-9;

// Model a fighter mid-combo: comboCounter is the count BEFORE the incoming hit increments it (matches the
// real read order in resolveAttackHit — damage is scaled off the pre-increment counter).
const F = (comboCounter, starterTier = 0) => ({ comboCounter, _comboStarterTier: starterTier, _counterScaleTier: 0 });

section("A. config");
check("COMBO_STARTER_SCALE: launcher > heavy > default(0)", COMBO_STARTER_SCALE.launcher > COMBO_STARTER_SCALE.heavy && COMBO_STARTER_SCALE.heavy > 0 && COMBO_STARTER_SCALE.default === 0, JSON.stringify(COMBO_STARTER_SCALE));

section("B. light opener (tier 0) == the old flat curve (no regression)");
for (let cc = 0; cc <= 7; cc++) {
  const expected = cc <= 1 ? 1 : COMBO_DAMAGE_CURVE[Math.min(cc - 1, COMBO_DAMAGE_CURVE.length - 1)];
  check(`comboCounter=${cc} → ${expected}`, near(getComboScale(F(cc, 0)), expected), `got ${getComboScale(F(cc, 0))}`);
}

section("C. opener's OWN hit is never penalized (comboCounter 0 → full, any starter tier)");
check("launcher opener hit → scale 1.0", near(getComboScale(F(0, COMBO_STARTER_SCALE.launcher)), 1), `got ${getComboScale(F(0, COMBO_STARTER_SCALE.launcher))}`);
check("heavy opener hit → scale 1.0", near(getComboScale(F(0, COMBO_STARTER_SCALE.heavy)), 1), `got ${getComboScale(F(0, COMBO_STARTER_SCALE.heavy))}`);

section("D. launcher opener (tier 2) decays FOLLOW-UPS harder than light opener");
{
  const curve = COMBO_DAMAGE_CURVE, last = curve[curve.length - 1];
  // follow-up hit N (comboCounter=N>=1): light → curve[N-1] (or 1 for N=1); launcher → curve[N-1+2] floored
  const cases = [[1, 1, curve[Math.min(2, 5)]], [2, curve[1], curve[Math.min(3, 5)]], [3, curve[2], curve[Math.min(4, 5)]]];
  for (const [cc, lightExp, launchExp] of cases) {
    const light = getComboScale(F(cc, 0)), launch = getComboScale(F(cc, COMBO_STARTER_SCALE.launcher));
    check(`comboCounter=${cc}: launcher(${launch.toFixed(2)}) < light(${light.toFixed(2)})`, launch < light, `light=${light} launch=${launch}`);
    check(`comboCounter=${cc}: launcher matches curve shift = ${launchExp.toFixed(2)}`, near(launch, launchExp), `got ${launch}`);
  }
  check("deep launcher combo floors at the curve tail (never rounds toward 0)", near(getComboScale(F(9, COMBO_STARTER_SCALE.launcher)), last), `got ${getComboScale(F(9, COMBO_STARTER_SCALE.launcher))}`);
}

section("E. heavy opener (tier 1) sits BETWEEN light and launcher");
for (const cc of [2, 3, 4]) {
  const light = getComboScale(F(cc, 0)), heavy = getComboScale(F(cc, COMBO_STARTER_SCALE.heavy)), launch = getComboScale(F(cc, COMBO_STARTER_SCALE.launcher));
  check(`comboCounter=${cc}: light ≥ heavy ≥ launcher (${light.toFixed(2)}/${heavy.toFixed(2)}/${launch.toFixed(2)})`, light >= heavy && heavy >= launch && (light > launch), `${light}/${heavy}/${launch}`);
}

section("F. HITSTUN is NEVER starter-scaled (links must still connect)");
for (let cc = 0; cc <= 5; cc++) {
  const base = getComboHitstunScale(F(cc, 0)), launch = getComboHitstunScale(F(cc, COMBO_STARTER_SCALE.launcher));
  check(`comboCounter=${cc}: hitstun scale identical regardless of opener (${base.toFixed(2)})`, near(base, launch), `base=${base} launch=${launch}`);
}

section("G. total-damage effect: a launcher-opened 5-hit string does LESS than a light-opened one");
{
  const raw = 50; // flat per-hit base for the illustration
  const total = tier => [0, 1, 2, 3, 4].reduce((s, cc) => s + raw * getComboScale(F(cc, tier)), 0);
  const lightTotal = total(0), launchTotal = total(COMBO_STARTER_SCALE.launcher);
  console.log(`     light-opened 5-hit total=${lightTotal.toFixed(1)}  launcher-opened=${launchTotal.toFixed(1)}  (Δ ${(lightTotal - launchTotal).toFixed(1)})`);
  check("launcher-opened 5-hit total damage < light-opened", launchTotal < lightTotal, `light=${lightTotal} launch=${launchTotal}`);
}

console.log(`\nCombo Starter Scaling: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
