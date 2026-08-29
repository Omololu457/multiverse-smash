// harness/boruto_clone_rasengan.test.mjs — STAGE 4 signature: BORUTO's CLONE-ASSISTED RASENGAN.
//
// Canonically "the clone helps shape the Rasengan": a FORM → RELEASE hit-confirm whose payoff SCALES with the
// clones committed. Fwd+Heavy (>=1 clone) forms a clone-assisted Rasengan thrust that CONSUMES all live clones
// and banks a TIER = min(3, clones); a Heavy re-tap on connect RELEASES a Rasengan projectile sized by tier.
// Distinct from the juggle/teleport/zoning signatures — this is a scaling burst. Drives the real
// updateBorutoCommandCombat + inspects activeProjectiles. Proves:
//   1. GATE: Fwd+Heavy forms the Rasengan only with >=1 clone; 0 clones → inert (normal heavy).
//   2. FORM consumes ALL live clones and banks tier = min(3, count).
//   3. RELEASE (on connect + re-tap) spawns a Rasengan projectile SIZED BY TIER (1<2<3, bigger + stronger).
//   4. FAIL-ON-MISS: a whiffed form (no connect) → no release (clones spent for nothing = the execution risk).
//   5. REGRESSION: his Down+Heavy low sweep and Air-Heavy aerial combo chain still work.
//   6. Determinism.

import { ensureCombatState, getAttackPhase } from "../combat.js";
import { getCharacter } from "../characters.js";
import { physics } from "../physics.js";
import { updateBorutoCommandCombat, activeProjectiles } from "../abilities.js";
import { activeSummons, spawnShadowClone, countShadowClones } from "../summons.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

physics.setGroundY(400);
const ctx = () => ({ getOpponent: () => ({ x: 300, y: 340, w: 60, h: 90, hitstun: 12 }) });
const phase = getAttackPhase;
const FWD_H  = { heavy: true, right: true,  left: false, down: false };
const HEAVY  = { heavy: true, right: false, left: false, down: false };
const DOWN_H = { heavy: true, right: false, left: false, down: true  };
const OPP = { x: 300, y: 340, w: 60, h: 90 };

function mkBoruto(air = false) {
  const c = getCharacter("boruto");
  const f = { rosterKey: "boruto", side: "p1", facing: 1, x: 100, y: 340, w: 60, h: 90,
    onGround: !air, grounded: !air, vx: 0, vy: 0, energy: 200, maxEnergy: 200, attackCooldown: 0, attacking: false,
    currentMove: null, basic_attacks: c?.basic_attacks || {}, controls: {} };
  ensureCombatState(f); f.attacking = false; f.currentMove = null; f.attackCooldown = 0; return f;
}
function reset() { activeSummons.length = 0; activeProjectiles.length = 0; }
function spawnClones(f, n) { for (let i = 0; i < n; i++) { const s = spawnShadowClone(f, OPP); if (s) { s._state = "idle"; s._hidden = false; s.x = 250 + i * 20; s.y = 340; } } }
function retap(f, connected) { if (f.currentAttack) f.currentAttack.timer = 3; f._cmdHitLanded = !!connected; f._cmdPrevHeavy = false; return updateBorutoCommandCombat(f, HEAVY, ctx(), phase); }

// Form with N clones, then (optionally) release; return the release projectile if any.
function formAndRelease(n, connectForm = true) {
  reset();
  const f = mkBoruto();
  spawnClones(f, n);
  const formed = updateBorutoCommandCombat(f, FWD_H, ctx(), phase);
  const formMove = f.currentMove;   // capture BEFORE the release re-tap overwrites currentMove
  const tier = f._cloneRasenTier || 0;
  const clonesAfterForm = countShadowClones(f);
  let released = false, proj = null;
  if (formed && f._rekkaNext === "borutoCloneRasenRelease") {
    released = retap(f, connectForm);
    proj = activeProjectiles.filter(p => p.owner === f)[0] || null;
  }
  return { formed, formMove, tier, clonesAfterForm, released, proj };
}

// ── 1 & 2. Gate + form consumes all clones + banks tier ──
section("Gate + form (consumes all clones, banks tier)");
{
  const zero = formAndRelease(0);
  check("0 clones → Fwd+Heavy does NOT form the Rasengan (inert)", zero.formed === false && zero.tier === 0);

  const two = formAndRelease(2);
  check("2 clones → forms borutoCloneRasenForm", two.formed === true && two.formMove === "borutoCloneRasenForm", `move=${two.formMove}`);
  check("form CONSUMES all live clones (2 → 0)", two.clonesAfterForm === 0, `left=${two.clonesAfterForm}`);
  check("form banks tier = 2", two.tier === 2, `tier=${two.tier}`);
}

// ── 3 & 4. Release scales by tier ──
section("Release — a Rasengan projectile SIZED BY TIER");
{
  const t1 = formAndRelease(1), t2 = formAndRelease(2), t3 = formAndRelease(3);
  check("tier 1 (1 clone) → normal Rasengan (w40, dmg60)",   t1.released && t1.proj?.w === 40 && t1.proj?.damage === 60,  `w=${t1.proj?.w} dmg=${t1.proj?.damage}`);
  check("tier 2 (2 clones) → BIG Rasengan (w60, dmg95)",     t2.released && t2.proj?.w === 60 && t2.proj?.damage === 95,  `w=${t2.proj?.w} dmg=${t2.proj?.damage}`);
  check("tier 3 (3 clones) → GIANT Oodama (w84, dmg140)",    t3.released && t3.proj?.w === 84 && t3.proj?.damage === 140, `w=${t3.proj?.w} dmg=${t3.proj?.damage}`);
  check("bigger tier = bigger sphere AND more damage", t1.proj.w < t2.proj.w && t2.proj.w < t3.proj.w && t1.proj.damage < t2.proj.damage && t2.proj.damage < t3.proj.damage);
  check("Boruto's cap (3) caps the tier — 3 clones is the max", t3.tier === 3);
}

// ── 4b. Fail-on-miss ──
section("Fail-on-miss — a whiffed form releases nothing");
{
  const miss = formAndRelease(3, /*connectForm=*/false);
  check("form connected=false → NO release projectile", miss.released === false && !miss.proj, `released=${miss.released}`);
}

// ── 5. Regression — his other command normals still work ──
section("Regression — Down+Heavy sweep + Air-Heavy aerial combo intact");
{
  reset();
  const g = mkBoruto();
  check("Down+Heavy → borutoLowSweep", updateBorutoCommandCombat(g, DOWN_H, ctx(), phase) === true && g.currentMove === "borutoLowSweep", `move=${g.currentMove}`);

  reset();
  const a = mkBoruto(true);   // airborne
  const opened = updateBorutoCommandCombat(a, HEAVY, ctx(), phase);   // Air-Heavy (no down) → aerial combo opener
  check("Air-Heavy → borutoAirCombo1", opened === true && a.currentMove === "borutoAirCombo1", `move=${a.currentMove}`);
  const cont = retap(a, true);
  check("aerial combo continues to borutoAirCombo2 on connect", cont === true && a.currentMove === "borutoAirCombo2", `move=${a.currentMove}`);
}

// ── 6. Determinism ──
section("Determinism");
{
  const r = () => { const x = formAndRelease(3); return `${x.tier}|${x.proj?.w}|${x.proj?.damage}`; };
  const a = r(), b = r(), c = r();
  check("three tier-3 runs agree", a === b && b === c, a);
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"}  boruto_clone_rasengan: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
